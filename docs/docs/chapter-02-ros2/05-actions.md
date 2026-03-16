---
sidebar_position: 6
sidebar_label: "Actions"
title: "Actions"
description: "ROS 2 actions: long-running goal/feedback/result tasks, action server and client in rclpy, cancellation, GoalStatus states, and composing actions in behavior trees."
keywords: [ROS 2 actions, action server, action client, feedback, GoalStatus, cancellation, BehaviorTree.CPP, preemption]
audience_tiers: [beginner, intermediate, advanced]
week: 4
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Actions

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain the action pattern using the pizza delivery tracker analogy
    - Identify when to use an action versus a service or topic
    - Describe the three parts of an action: goal, feedback, and result
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Implement an action server and client in rclpy
    - Handle feedback, cancellation, and goal status transitions
    - Define a custom `.action` IDL file
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Explain how actions are implemented as three underlying DDS primitives
    - Analyze preemption semantics and their implications for safety
    - Design action compositions using BehaviorTree.CPP
    - Prove progress guarantees under interruption for a simple action system
  </TabItem>
</Tabs>

---

## The Goal/Feedback/Result Pattern

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Imagine ordering a pizza online. You submit your order (the **goal**). While the pizza is being made and delivered, the app shows you updates: "Order received", "Pizza in oven", "Out for delivery", "Driver 2 minutes away" (this is the **feedback**). When the pizza arrives, you get a final confirmation: "Delivered!" (this is the **result**).

A **ROS 2 action** is exactly this pattern for robots:
- You send a **goal** to the action server: "Navigate to position (3.0, 4.0)"
- While the robot is moving, the server sends **feedback**: "Current position: (1.5, 2.0), 65% complete"
- When the robot arrives (or fails), you receive a **result**: "Goal reached!" or "Goal failed: obstacle in path"

:::info[Key Term]
**Action**: A ROS 2 communication pattern for long-running tasks. Unlike services (which block briefly), actions support continuous feedback during execution, and the client can cancel the goal at any time.
:::

**When to use an action**:
- Navigation (takes many seconds, need position updates)
- Robotic arm motion to a target pose (takes 1–10 seconds, need progress)
- Picking an object (multi-second task with state updates)
- Any task where you need to cancel partway through

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

A custom action is defined in a `.action` file with three sections separated by `---`:

```
# my_pkg/action/NavigateTo.action
# Goal
geometry_msgs/Point target
float32 speed
---
# Result
bool success
float32 final_distance
---
# Feedback
geometry_msgs/Point current_position
float32 distance_remaining
float32 percent_complete
```

**Action server in Python**:

```python
import rclpy
from rclpy.action import ActionServer
from rclpy.node import Node
from my_pkg.action import NavigateTo

class NavServer(Node):
    def __init__(self):
        super().__init__('nav_server')
        self._action_server = ActionServer(
            self, NavigateTo, 'navigate_to', self.execute_callback)

    def execute_callback(self, goal_handle):
        self.get_logger().info('Executing goal...')
        feedback_msg = NavigateTo.Feedback()

        for step in range(10):
            if goal_handle.is_cancel_requested:
                goal_handle.canceled()
                return NavigateTo.Result(success=False, final_distance=0.5)

            # Simulate movement
            feedback_msg.percent_complete = float(step * 10)
            goal_handle.publish_feedback(feedback_msg)
            import time; time.sleep(0.5)

        goal_handle.succeed()
        result = NavigateTo.Result()
        result.success = True
        result.final_distance = 0.01
        return result
```

**Action client in Python**:

```python
from rclpy.action import ActionClient

class NavClient(Node):
    def __init__(self):
        super().__init__('nav_client')
        self._client = ActionClient(self, NavigateTo, 'navigate_to')

    def send_goal(self, x, y):
        goal = NavigateTo.Goal()
        goal.target.x = x
        goal.target.y = y
        goal.speed = 0.5
        self._client.wait_for_server()
        future = self._client.send_goal_async(
            goal, feedback_callback=self.feedback_cb)
        future.add_done_callback(self.goal_response_cb)

    def feedback_cb(self, feedback_msg):
        fb = feedback_msg.feedback
        self.get_logger().info(f'{fb.percent_complete:.1f}% complete')

    def goal_response_cb(self, future):
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().error('Goal rejected!')
            return
        result_future = goal_handle.get_result_async()
        result_future.add_done_callback(self.result_cb)

    def result_cb(self, future):
        result = future.result().result
        self.get_logger().info(f'Result: success={result.success}')
```

**`GoalStatus` state machine**:

| Status | Meaning |
|--------|---------|
| `UNKNOWN` | Initial state before server responds |
| `ACCEPTED` | Server accepted the goal, not yet executing |
| `EXECUTING` | Server is actively working on the goal |
| `CANCELING` | Client requested cancel, server acknowledging |
| `SUCCEEDED` | Goal completed successfully |
| `CANCELED` | Goal was canceled |
| `ABORTED` | Server aborted the goal (internal error) |

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Actions as three DDS primitives**: A ROS 2 action is syntactic sugar over three underlying communication primitives:

```
GoalService:     /<action_name>/_action/send_goal    (service: GoalRequest → GoalResponse)
ResultService:   /<action_name>/_action/get_result   (service: ResultRequest → ResultResponse)
FeedbackTopic:   /<action_name>/_action/feedback     (topic: FeedbackMessage)
StatusTopic:     /<action_name>/_action/status       (topic: GoalStatusArray)
CancelService:   /<action_name>/_action/cancel_goal  (service: CancelGoalRequest → CancelGoalResponse)
```

The action client sequence is:
1. Call `send_goal` service → server returns `accepted: bool`
2. If accepted, subscribe to `feedback` topic filtered by `goal_id`
3. When done, call `get_result` service with `goal_id` → server returns result
4. Optionally call `cancel_goal` service at any point

**Preemption semantics**: When a new goal arrives while the server is executing a previous goal, the action server can:
1. **Reject the new goal** (simplest)
2. **Preempt the old goal**: call `goal_handle.abort()` on the old handle, then accept the new one
3. **Queue goals** (requires custom implementation)

Preemption without proper cleanup creates safety hazards. If the robot is mid-motion when a goal is aborted, the actuators may be in an undefined state. Best practice: in the `execute_callback`, check `is_cancel_requested` at every safe interrupt point and restore the robot to a known safe configuration before returning.

**Composing actions in BehaviorTree.CPP**: Nav2 uses BehaviorTree.CPP v4 for task composition:

```xml
<BehaviorTree ID="NavigateWithRetry">
  <RetryUntilSuccessful num_attempts="3">
    <Sequence>
      <RosAction action_name="navigate_to" goal="{nav_goal}"/>
      <RosAction action_name="check_arrival" goal="{check_goal}"/>
    </Sequence>
  </RetryUntilSuccessful>
</BehaviorTree>
```

Each `RosAction` node wraps a ROS 2 action client. The BT framework handles the action lifecycle, feedback monitoring, and cancellation propagation through the tree.

**Formal progress guarantee**: Define an action system as making progress if it moves strictly closer to the goal state at each feedback interval. For a navigation action with Euclidean distance metric $d$:

$$\text{progress}(t) \iff d(p_t, g) < d(p_{t-1}, g)$$

Under interruption (cancellation at time $t^*$), a progress guarantee requires the server to complete a safe stopping maneuver within $\delta$ time such that:

$$\forall t' \in [t^*, t^* + \delta]: \text{safe\_state}(q_{t'}) = \text{true}$$

where $\text{safe\_state}$ is a system-specific predicate. Proving this for a real robot requires bounded deceleration guarantees from the lower-level controller.

  </TabItem>
</Tabs>

---

## Cancellation

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

One of the most important features of actions (compared to services) is **cancellation**. If a robot is navigating to a goal and something changes — a person walks in the way, the goal is no longer needed — the client can cancel the action in progress.

Think of it like canceling a pizza order before the driver leaves: you call the restaurant, they acknowledge the cancel, and the driver does not come. The key word is "acknowledge" — you request a cancel, but the server decides when it is safe to stop.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Canceling an active goal** from the client:

```python
# After sending goal and receiving goal_handle:
cancel_future = goal_handle.cancel_goal_async()
cancel_future.add_done_callback(self.cancel_response_cb)

def cancel_response_cb(self, future):
    response = future.result()
    if response.return_code == CancelResponse.ACCEPT:
        self.get_logger().info('Cancel accepted')
    else:
        self.get_logger().warn('Cancel rejected')
```

**On the server side**, check for cancellation in the execute loop:

```python
while not done:
    if goal_handle.is_cancel_requested:
        # Do cleanup (stop motors, release locks)
        goal_handle.canceled()
        result = MyAction.Result()
        return result
    # ... do work, publish feedback
```

The server can reject a cancel request by not calling `goal_handle.canceled()`. This is appropriate when the action is at a point where stopping is more dangerous than completing (e.g., mid-weld on a robotic welding arm).

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Cancel coordination with multiple goals**: When a `MultiGoalActionServer` is running multiple concurrent goals, cancel semantics become complex. The `cancel_goal` service accepts a `goal_info` field — an empty goal ID cancels all goals. The server must:
1. Mark each matching goal as canceling (`GoalStatus.CANCELING`)
2. Signal the executing coroutine/thread via a condition variable
3. Wait for the coroutine to clean up and call `goal_handle.canceled()`
4. Return `CancelGoalResponse.ACCEPT` only if at least one goal was canceled

Race condition: if the goal completes (transitions to `SUCCEEDED`) between the client sending cancel and the server receiving it, the cancel response returns `REJECT`. Clients must handle this case gracefully by checking the final status.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A robot barista is making a cup of coffee. Identify the **goal**, **feedback messages** (at least three), and **result** for this action. Also identify one scenario where the client might want to **cancel** the action.

2. Why can a service not easily replace an action for a navigation task? List at least two concrete limitations.

### Intermediate

3. Implement a complete `.action` file and action server for a `CountDown` action that counts from a given start number to zero, publishing each number as feedback, and returns `True` as the result when done. Support cancellation.

4. Draw the complete `GoalStatus` state machine with all transitions. For each transition, indicate who triggers it (client or server) and under what condition.

### Advanced

5. The `navigate_to` action server receives a new goal while already executing one. Design the preemption policy for a differential-drive robot that: (a) is safe (robot comes to a complete stop before accepting the new goal), (b) has bounded preemption latency ($\leq$ 200 ms), and (c) correctly reports `CANCELED` for the old goal and `ACCEPTED` for the new one.

6. Prove or disprove: An action system that guarantees progress at each feedback interval and has a finite maximum step size $\Delta d_{max}$ will always reach the goal within finite time, even if the server can be preempted arbitrarily often, provided the number of preemptions is finite.
