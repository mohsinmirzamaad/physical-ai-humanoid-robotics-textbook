---
sidebar_position: 10
sidebar_label: "Summary & Exercises"
title: "Summary & Exercises"
description: "Chapter 2 concept map, primitive selection exercises, sensor pipeline project, and advanced QoS/executor design challenges."
keywords: [ROS 2 summary, exercises, concept map, sensor pipeline, QoS, executor latency, lifecycle node]
audience_tiers: [beginner, intermediate, advanced]
week: 5
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Summary & Exercises

## Chapter Concept Map

The following diagram shows how all the concepts in Chapter 2 relate to each other:

```
                        ┌─────────────────────────────────┐
                        │         ROS 2 Architecture       │
                        │   DDS · RMW · RTPS · QoS         │
                        └────────────────┬────────────────┘
                                         │ provides transport for
                              ┌──────────▼──────────┐
                              │       Nodes          │
                              │  SingleThread /      │
                              │  MultiThread /       │
                              │  Lifecycle           │
                              └──┬───────┬───────┬──┘
                       ┌─────────▼──┐ ┌──▼──┐ ┌──▼────────┐
                       │   Topics   │ │Srvcs│ │  Actions   │
                       │ pub / sub  │ │req/ │ │goal/feedbk/│
                       │ QoS / CDR  │ │resp │ │result/cxl  │
                       └─────────┬──┘ └──┬──┘ └──┬─────────┘
                                 │       │       │
                        ┌────────▼───────▼───────▼────────┐
                        │        rclpy Programming         │
                        │  Node · Timer · Pub · Sub ·      │
                        │  Service · Action · Parameters   │
                        └────────────────┬────────────────┘
                                         │ configured by
                        ┌────────────────▼────────────────┐
                        │      Launch Files + Parameters   │
                        │  LaunchDescription · YAML ·      │
                        │  Substitutions · EventHandlers   │
                        └─────────────────────────────────┘
```

---

## Key Concepts Summary

| Concept | One-Line Summary |
|---------|-----------------|
| **DDS / RMW** | Transport layer; swappable implementations; QoS-governed delivery |
| **Node** | Computational unit; one job; communicates via the graph |
| **Executor** | Dispatches callbacks; single- or multi-threaded; controls timing |
| **Lifecycle node** | Explicit Unconfigured→Inactive→Active→Finalized state machine |
| **Topic** | Typed, named broadcast channel; many-to-many pub/sub |
| **Service** | One-to-one request/response; use `call_async` to avoid deadlock |
| **Action** | Long-running goal with feedback stream and cancellation support |
| **Parameters** | Node configuration; YAML files; dynamic callbacks; atomic updates |
| **Launch files** | Orchestrate multi-node systems; substitutions; event handlers |

---

## Beginner Exercises

### Exercise B1: Primitive Selection

For each scenario below, choose the correct ROS 2 communication primitive (topic / service / action) and explain your choice in one sentence:

1. A temperature sensor publishes readings 20 times per second.
2. An operator asks the robot "Are you ready to move?" and the robot answers "Yes" or "No."
3. A robot arm moves to a goal joint configuration over 5 seconds, reporting progress every 100 ms.
4. A safety monitor broadcasts a Boolean `e_stop: true` signal when an obstacle is detected.
5. An operator requests the robot to save the current map image to disk.
6. A robot navigates a 200-meter course, providing estimated time to completion every 10 seconds.
7. A camera driver streams 30 fps video.
8. An operator enables or disables the LED lights on the robot.

### Exercise B2: Node Sketch

Draw a node diagram for a robot that:
- Reads images from a forward-facing camera
- Detects pedestrians using a neural network
- Stops the robot if a pedestrian is within 2 meters
- Keeps a log of all detected pedestrians

Label each node, each topic (with message type), and any services or actions. Identify which QoS reliability profile (RELIABLE or BEST_EFFORT) you would use for each topic.

### Exercise B3: Parameter Configuration

A mobile robot's navigation node has these tunable parameters: `max_speed`, `goal_tolerance`, `obstacle_clearance`, and `recovery_behavior_enabled`. Write a complete YAML parameter file with reasonable values for an indoor hospital robot (slow, precise, cautious). Then write the values you would use for an outdoor warehouse robot (faster, less precise, more aggressive).

---

## Intermediate Exercises

### Exercise I1: Minimal Sensor Pipeline

Build a three-node system:

**Node 1 — FakeLidar**: Publishes a `sensor_msgs/LaserScan` with 360 ranges (all set to 3.0 meters) to `/scan` at 10 Hz using `BEST_EFFORT` QoS.

**Node 2 — ObstacleDetector**: Subscribes to `/scan`, finds the minimum range, and if it is less than 1.0 m, calls the `/stop_robot` service.

**Node 3 — SafetyController**: Offers the `/stop_robot` service (`std_srvs/Trigger`) and publishes `Twist(linear.x=0, angular.z=0)` to `/cmd_vel` when called.

Requirements:
- Write all three nodes as rclpy classes
- Write a launch file that starts all three
- Write a YAML parameter file with `min_safe_distance: 1.0` loaded by ObstacleDetector
- Verify with `ros2 topic echo /cmd_vel` and `ros2 service call /stop_robot`

### Exercise I2: QoS Debugging

Given the following scenario: a publisher uses `BEST_EFFORT` reliability and `VOLATILE` durability. Two subscribers exist: Subscriber A uses `RELIABLE` reliability; Subscriber B uses `BEST_EFFORT` reliability. Answer:

1. Which subscriber(s) will successfully receive messages?
2. If the publisher is changed to `RELIABLE`, which subscriber(s) will receive messages?
3. If a third subscriber joins after the publisher has already sent 50 messages, with `TRANSIENT_LOCAL` durability and depth 10, how many messages will it receive immediately upon connection? What must the publisher's durability be set to for this to work?

### Exercise I3: Lifecycle Pipeline

Write a lifecycle-aware camera driver node that:
- In `on_configure`: opens the camera device (simulated with `self.get_logger().info('Camera opened')`)
- In `on_activate`: starts a 30 Hz timer that publishes fake `Image` messages
- In `on_deactivate`: cancels the timer
- In `on_cleanup`: closes the camera device
- In `on_shutdown`: logs a final status message

Write the companion launch file that uses a `LifecycleManager` to bring the node from `Unconfigured` to `Active` at startup.

---

## Advanced Exercises

### Exercise A1: QoS Policy Design for Safety-Critical Topics

You are designing the QoS policy for a `/emergency_stop` topic on an autonomous mobile robot in a hospital. The topic carries a `std_msgs/Bool` message; when `True`, all motion must cease within 100 ms.

Design the complete QoS profile answering these questions:

1. **Reliability**: `RELIABLE` or `BEST_EFFORT`? What does the choice imply about delivery latency vs. delivery guarantee?

2. **Durability**: `VOLATILE` or `TRANSIENT_LOCAL`? A new node subscribes 500 ms after the emergency stop was published. Should it receive the stop command?

3. **Deadline**: What deadline should the publisher declare? What should the subscriber request? Write the `QoSProfile` Python code.

4. **Liveliness**: The emergency stop publisher crashes. How can the subscriber detect this? Set `liveliness=MANUAL_BY_TOPIC` and `liveliness_lease_duration` to an appropriate value. What must the publisher call to maintain liveliness?

5. **History**: `KEEP_LAST(1)` or `KEEP_ALL`? Why does the answer matter for an emergency stop?

### Exercise A2: Worst-Case Executor Latency Analysis

A robot controller node uses a `SingleThreadedExecutor` and has the following callbacks:

| Callback | Period / Trigger | Worst-case execution time |
|----------|-----------------|--------------------------|
| `control_timer` | 2 ms (500 Hz) | 0.5 ms |
| `image_subscriber` | Triggered at 30 Hz | 15 ms |
| `lidar_subscriber` | Triggered at 10 Hz | 8 ms |
| `param_service` | On demand | 2 ms |

1. Compute the worst-case latency for `control_timer` under this configuration.
2. What percentage of 500 Hz deadlines will be missed in the worst case?
3. Redesign the system using callback groups and a `MultiThreadedExecutor(num_threads=3)` to ensure `control_timer` misses fewer than 1% of deadlines. Justify your callback group assignments.
4. If the system is running on a PREEMPT-RT kernel with `control_timer`'s thread pinned to an isolated CPU core at `SCHED_FIFO` priority 90, what additional latency budget can you reclaim?

### Exercise A3: Lifecycle-Managed Hardware Abstraction

Design a hardware abstraction layer (HAL) for a robot arm with six joints, using lifecycle nodes. Your design must include:

1. One `JointDriverNode` (lifecycle) per joint, responsible for reading encoder position and sending torque commands to the motor amplifier via CAN bus.

2. A `HalManager` node that orchestrates lifecycle transitions for all six `JointDriverNode`s in sequence (configure joint 1 → configure joint 2 → ... → configure joint 6 → activate all).

3. An emergency stop mechanism: if any `JointDriverNode` transitions to `Inactive` unexpectedly (e.g., due to hardware fault), the `HalManager` must deactivate all other joints within 10 ms.

Write the state machine for `JointDriverNode` (including what happens in each transition callback), the `HalManager` orchestration code, and the launch file that sets up the complete system.

---

## Chapter Review: Quick-Check Questions

1. What is the difference between `RELIABLE` and `BEST_EFFORT` QoS? Give one use case for each.
2. Why should you never call `service.call()` (blocking) inside a callback on a `SingleThreadedExecutor`?
3. What are the three underlying DDS primitives that implement a ROS 2 action?
4. What does `rclpy.spin(node)` actually do internally?
5. When is a `TRANSIENT_LOCAL` publisher useful? What constraint does it impose on durability compatibility?
6. What is the purpose of callback groups? Name both types and their concurrency semantics.
7. A lifecycle node is in the `Active` state. List all valid transitions it can take and the resulting state for each.
8. What is the role of the RMW layer? Name two concrete DDS implementations supported by ROS 2.
9. What does `colcon build --symlink-install` do and why is it useful during Python node development?
10. Describe the RTPS participant discovery sequence from first boot to data exchange between two ROS 2 nodes.
