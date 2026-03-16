---
sidebar_position: 3
sidebar_label: "Nodes, Executors & Lifecycles"
title: "Nodes, Executors & Lifecycles"
description: "ROS 2 nodes as computational units, spin models, lifecycle state machines, callback group isolation, and real-time executor design."
keywords: [ROS 2 nodes, executor, lifecycle node, SingleThreadedExecutor, MultiThreadedExecutor, callback group, real-time]
audience_tiers: [beginner, intermediate, advanced]
week: 3
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Nodes, Executors & Lifecycles

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain what a ROS 2 node is using the kitchen brigade analogy
    - Describe the difference between a node that "sleeps" and one that "spins"
    - Identify when you would want multiple nodes versus one large program
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Create a minimal `rclpy.node.Node` subclass and spin it
    - Compare `SingleThreadedExecutor` and `MultiThreadedExecutor`
    - Draw and explain the lifecycle node state machine (Unconfigured → Inactive → Active → Finalized)
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Analyze callback scheduling under FIFO and round-robin executor policies
    - Design a system using MutuallyExclusive and Reentrant callback groups for thread safety
    - Describe the real-time executor design and its worst-case latency guarantees
    - Explain how lifecycle nodes are used in hardware abstraction layers
  </TabItem>
</Tabs>

---

## What Is a Node?

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

A professional kitchen runs on specialization. The **sous chef** manages the team. The **saucier** makes all the sauces. The **garde manger** handles cold dishes. The **pâtissier** makes desserts. Each person is an expert in one domain and communicates with others through the kitchen's well-defined workflow — orders come in on tickets, dishes go out on plates, and each station knows exactly what it is responsible for.

A **ROS 2 node** is one specialist worker in your robot's software kitchen. It has one job:

- A camera node reads image data from the hardware and publishes it
- A detection node subscribes to images and publishes detected objects
- A navigation node subscribes to detected objects and map data, and commands the motors
- A motor node receives commands and sends them to the hardware

Each node runs as an independent process (or thread). If the detection node crashes, the camera node keeps running. If you want to upgrade the detection algorithm, you swap out just that node — the rest of the system is unaffected.

:::info[Key Term]
**Node**: The fundamental computational unit in ROS 2. A node is a process (or component in a process) that has a name, participates in the ROS 2 graph, and can publish/subscribe to topics, offer/call services, and offer/use actions.
:::

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

A ROS 2 node in Python inherits from `rclpy.node.Node`:

```python
import rclpy
from rclpy.node import Node

class MinimalNode(Node):
    def __init__(self):
        super().__init__('minimal_node')
        self.get_logger().info('Node started!')
        timer_period = 1.0  # seconds
        self.timer = self.create_timer(timer_period, self.timer_callback)

    def timer_callback(self):
        self.get_logger().info('Timer fired!')

def main():
    rclpy.init()
    node = MinimalNode()
    rclpy.spin(node)        # blocks: processes callbacks until Ctrl+C
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

`rclpy.spin(node)` runs the **executor** — the mechanism that waits for callbacks (timers, topic messages, service requests) and dispatches them one at a time. The default executor is `SingleThreadedExecutor`.

**Executor types**:

| Executor | Behavior | Use case |
|----------|----------|----------|
| `SingleThreadedExecutor` | One callback at a time, in the calling thread | Simple nodes, most common |
| `MultiThreadedExecutor` | Multiple callbacks concurrently across a thread pool | Nodes with blocking callbacks |
| `StaticSingleThreadedExecutor` | Pre-compiled callback set, lower overhead | High-frequency control nodes |

**Lifecycle nodes** (`rclpy.lifecycle.LifecycleNode`) add explicit state management:

```
Unconfigured ──configure()──► Inactive ──activate()──► Active
                                  ▲                        │
                             deactivate()            deactivate()
                                  │                        ▼
                             Inactive ◄─────────────── Active
Inactive ──cleanup()──► Unconfigured
Active/Inactive ──shutdown()──► Finalized
```

This matters for hardware nodes: the driver can allocate resources in `configure()`, open hardware connections in `activate()`, and cleanly release everything in `deactivate()` — all without restarting the process.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Executor scheduling in depth**: The `SingleThreadedExecutor` maintains a set of "ready" entities (timers, subscriptions, services, clients, waitables). On each `spin_once()` call, it calls `rcl_wait()` with a timeout, which uses `select()` or `epoll()` on the underlying DDS condition variables. Ready entities are dispatched in FIFO order within each entity class (timers before subscriptions by default in rclpy).

**Worst-case callback latency**: For a timer firing at period $T$ in a `SingleThreadedExecutor` with $n$ other callbacks each taking up to $C_{max}$ time:

$$L_{max} = n \cdot C_{max} + T_{scheduler\_jitter}$$

This means a 1 kHz control timer ($T = 1$ ms) sharing an executor with a single image processing callback ($C_{max} = 50$ ms) will miss its deadline by 49 ms. **Solution**: separate nodes + executors, or use a `MultiThreadedExecutor` with callback group isolation.

**Callback groups**:
- `MutuallyExclusiveCallbackGroup`: callbacks in this group never execute concurrently — mutual exclusion
- `ReentrantCallbackGroup`: callbacks in this group may execute concurrently — requires the callback to be thread-safe

```python
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup, ReentrantCallbackGroup

class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')
        fast_group = MutuallyExclusiveCallbackGroup()
        slow_group = MutuallyExclusiveCallbackGroup()
        self.create_timer(0.001, self.fast_cb, callback_group=fast_group)
        self.create_subscription(Image, '/camera', self.slow_cb, 10,
                                 callback_group=slow_group)
```

With a `MultiThreadedExecutor(num_threads=2)`, `fast_cb` and `slow_cb` can run concurrently since they are in separate `MutuallyExclusive` groups.

**Real-time executor**: The `rclcpp` Executor design doc (REP-2015) describes a real-time executor based on a static dispatch table computed at startup. Key properties:
- No dynamic memory allocation during spin
- Bounded worst-case latency (with appropriate thread priority and CPU isolation)
- Compatible with PREEMPT_RT kernel patches

**Lifecycle nodes in HAL**: In Nav2 and manipulation stacks, hardware drivers are implemented as `LifecycleNode`s. The `lifecycle_manager` node orchestrates transitions:

```
lifecycle_manager ──configure_srv──► [camera_driver, lidar_driver, joint_driver]
                  ──activate_srv───► [camera_driver, lidar_driver, joint_driver]
```

If any driver fails `configure()`, the manager can cleanly abort before any hardware is powered up — preventing unsafe partial initialization states.

> **Reference**: Böse, T. et al. "Towards a Real-Time ROS 2 Executor." IROS Workshop on Real-Time Robotics, 2019. — Foundational paper on the real-time executor design.

  </TabItem>
</Tabs>

---

## Node Naming and Namespaces

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Every node has a unique name in the ROS 2 network. Think of it like a mailing address: `/camera_node` is different from `/robot_arm/camera_node`. The `/robot_arm/` part is called a **namespace** — it groups related nodes together, the same way a street address includes both a house number and a street name.

When you have two robots, you can use namespaces to keep them separate: `/robot_1/camera_node` and `/robot_2/camera_node` are different nodes that can coexist on the same network.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

Node names follow the pattern `/<namespace>/<node_name>`. Namespaces can be nested: `/my_robot/arm/controller`. Topics, services, and actions inherit the node's namespace by default but can be remapped.

**Remapping** at launch time allows reuse of generic node implementations:

```bash
ros2 run my_package my_node --ros-args \
    --remap __node:=specific_camera \
    --remap __ns:=/robot_1 \
    --remap /image_raw:=/robot_1/camera/image_raw
```

This lets you run the same `camera_node` binary twice for two cameras, with distinct topic names, without modifying the source code.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Node uniqueness enforcement**: ROS 2 (unlike ROS 1) does not enforce globally unique node names at the DDS level. Two nodes with the same fully-qualified name can coexist, but tools like `ros2 node info` will only show one. The `--ros-args --remap __node:=unique_name` pattern must be applied by the operator. This is a known design gap being addressed in lifecycle and component container workflows.

**Component nodes**: Nodes can be compiled as shared libraries and loaded into a `ComponentManager` process at runtime, sharing an executor and reducing inter-node IPC overhead to intra-process function calls. This is the preferred pattern for latency-sensitive pipelines:

```bash
ros2 component load /ComponentManager my_package my_package::CameraNode
ros2 component load /ComponentManager my_package my_package::DetectorNode
```

When both components use intra-process communication and the publisher uses `create_publisher` with `use_intra_process_comms=True`, the message pointer is passed directly without serialization.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. You are building a robot that must: read from a LiDAR sensor, detect obstacles, plan a safe path, and drive its wheels. Sketch a node diagram with one node per responsibility. Draw arrows for the topics connecting them and label each topic with a descriptive name.

2. What would happen to the other nodes if the path-planning node crashes? How does ROS 2's node architecture help here compared to a single monolithic program?

### Intermediate

3. Write a complete `rclpy` node that publishes the string `"heartbeat"` to the topic `/status` every 0.5 seconds using a timer callback. Include `main()`, initialization, spin, and cleanup.

4. You have a node with two callbacks: a 100 Hz control timer (takes 2 ms each) and a camera subscription callback (takes 40 ms each). If both share a `SingleThreadedExecutor`, what is the worst-case latency for the control timer? Propose a fix using callback groups and a `MultiThreadedExecutor`.

### Advanced

5. A lifecycle node implements a servo driver. Write out the sequence of lifecycle transitions (with the correct transition names) that should occur during: (a) system startup, (b) emergency stop, (c) planned maintenance shutdown. Justify each transition choice.

6. Derive the maximum number of missed control deadlines per second for a 500 Hz control callback sharing a `SingleThreadedExecutor` with one image processing callback that takes $C$ ms. At what value of $C$ does the system become unusable (more than 10% deadline misses)?
