---
sidebar_position: 2
sidebar_label: "The ROS 2 Architecture"
title: "The ROS 2 Architecture"
description: "DDS transport, RMW abstraction, QoS policies, and the ROS 2 computation graph — from postal analogies to RTPS protocol internals."
keywords: [ROS 2, DDS, RTPS, RMW, QoS, computation graph, pub/sub, middleware]
audience_tiers: [beginner, intermediate, advanced]
week: 3
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# The ROS 2 Architecture

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain in plain language what ROS 2 does for a robot system
    - Describe the publisher/subscriber pattern using a postal analogy
    - Name the three main communication patterns ROS 2 provides
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Describe the DDS transport layer and the RMW abstraction
    - Compare the four key QoS policies (reliability, durability, deadline, lifespan)
    - Draw and interpret a ROS 2 computation graph for a simple robot system
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Explain the RTPS wire protocol and its role in DDS discovery
    - Derive worst-case delivery jitter from QoS deadline and liveliness parameters
    - Describe zero-copy IPC via loaned messages and when to use it
    - Model the ROS 2 graph as a directed hypergraph and state its formal properties
  </TabItem>
</Tabs>

---

## What ROS 2 Is

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Imagine a large hospital. Dozens of specialists work in the same building — a radiologist reads scans, a pharmacist fills prescriptions, a surgeon operates. Each one is an expert in their domain, but they cannot do their jobs alone. They need to pass information to each other: lab results travel from the technician to the doctor, medication orders go from the doctor to the pharmacy, and status updates go from the nurse to the attending physician.

ROS 2 is the messaging system for robots. Instead of doctors and nurses, the "workers" are software programs called **nodes** — one node reads a camera, another detects objects, another plans a path, another moves the motors. ROS 2 gives them a standardized way to pass information to each other, even though they might be written by different teams, in different programming languages, running on different computers.

:::info[Key Term]
**ROS 2** (Robot Operating System 2): A middleware framework that provides standardized communication, tooling, and conventions for building robot software systems. The "2" marks a complete redesign from ROS 1, replacing a centralized master with a distributed DDS network.
:::

ROS 2 provides three ways for nodes to communicate:
- **Topics**: broadcast messages that anyone can listen to (like a radio station)
- **Services**: direct request/response calls (like a phone call)
- **Actions**: long-running tasks with progress updates (like tracking a package delivery)

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

ROS 2 is a middleware framework built on top of **DDS** (Data Distribution Service), an industrial messaging standard originally developed for defense and avionics systems. The key architectural layers are:

```
┌─────────────────────────────────────────┐
│           User Code (rclpy / rclcpp)    │
├─────────────────────────────────────────┤
│         rcl  (ROS Client Library)       │
├─────────────────────────────────────────┤
│  rmw  (ROS Middleware Interface / API)  │
├─────────────────────────────────────────┤
│  rmw_implementation (e.g. rmw_fastrtps) │
├─────────────────────────────────────────┤
│      DDS Implementation (FastDDS,       │
│      CycloneDDS, Connext, etc.)         │
├─────────────────────────────────────────┤
│         Network / Shared Memory         │
└─────────────────────────────────────────┘
```

The **RMW abstraction layer** means you can swap DDS implementations (e.g., from FastDDS to CycloneDDS) without changing application code. This is critical for real-time systems: different DDS implementations have different latency profiles, and some are certified for safety-critical use.

**The ROS 2 computation graph** is the runtime view of a running system: nodes are vertices, topics/services/actions are the edges connecting them. The `rqt_graph` tool visualizes this graph live.

**Key QoS policies** (set per publisher/subscriber pair):

| Policy | Options | Effect |
|--------|---------|--------|
| Reliability | `RELIABLE` / `BEST_EFFORT` | Whether dropped messages trigger retransmission |
| Durability | `VOLATILE` / `TRANSIENT_LOCAL` | Whether late subscribers receive recent messages |
| Deadline | Duration | Maximum acceptable gap between messages |
| Lifespan | Duration | How long a published message stays valid |
| History | `KEEP_LAST(N)` / `KEEP_ALL` | How many messages are buffered |

QoS mismatches (e.g., publisher is `BEST_EFFORT`, subscriber requests `RELIABLE`) silently prevent the connection from forming — a common debugging pitfall.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**DDS and RTPS**: DDS defines the API; **RTPS** (Real-Time Publish-Subscribe Protocol, specified in OMG DDSI-RTPS v2.3) is the wire protocol that implements it. RTPS runs over UDP (unicast and multicast) and uses a **participant discovery** protocol (PDP/EDP) to automatically find and connect publishers and subscribers on the network without a central broker.

**Discovery sequence**:
1. Each participant sends periodic SPDP (Simple Participant Discovery Protocol) announcements via multicast
2. Participants exchange endpoint information via SEDP (Simple Endpoint Discovery Protocol) via unicast
3. Matched endpoints begin data exchange using RTPS DATA submessages

**QoS math — deadline jitter bound**: If a publisher declares deadline $D_p$ and a subscriber requires deadline $D_s$, a connection forms only when $D_p \leq D_s$. The worst-case inter-message gap at the subscriber is bounded by:

$$\Delta t_{max} = D_p + \text{RTT}_{99} + \text{deserialization\_time}$$

where $\text{RTT}_{99}$ is the 99th-percentile round-trip time of the network path.

**Reliability guarantees**: `RELIABLE` QoS uses RTPS's NACK/heartbeat mechanism. If a subscriber detects a sequence gap, it sends a NACK; the publisher retransmits from its history cache. Under `KEEP_LAST(N)`, the cache holds only the last $N$ messages — if the subscriber falls more than $N$ messages behind, data is permanently lost even with `RELIABLE`.

**Zero-copy via loaned messages**: For large messages (e.g., uncompressed point clouds: 12 bytes × 131,072 points = 1.5 MB per frame), serialization + memcpy is prohibitive. The `rclcpp` loan API allows a publisher to "loan" a pre-allocated message from the middleware's shared memory pool:

```cpp
auto loaned_msg = publisher->borrow_loaned_message();
// fill loaned_msg.get() in-place
publisher->publish(std::move(loaned_msg));  // zero-copy to subscribers
```

This requires both publisher and subscriber to use the same DDS implementation and an intra-process or shared-memory transport.

**Formal graph model**: The ROS 2 computation graph $G = (V, H)$ is a directed hypergraph where:
- $V$ = set of nodes (computational vertices)
- $H$ = set of hyperedges, each corresponding to a topic $t$ with publisher set $P_t \subseteq V$ and subscriber set $S_t \subseteq V$

A topic hyperedge is the tuple $(t, P_t, S_t)$ with $|P_t| \geq 1$, $|S_t| \geq 0$. Services and actions are 1-to-1 directed edges. The graph is dynamically typed: edges carry message type information enforced at connection time. Type-incompatible connections are refused at the rcl layer.

> **Reference**: OMG DDS Specification v1.4 (2015); OMG DDSI-RTPS v2.3 (2019). Both available at omg.org.

  </TabItem>
</Tabs>

---

## The Computation Graph in Practice

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

When a real robot runs, many nodes are active at the same time. Here is what a simple mobile robot's computation graph might look like:

```
[camera_node] ──publishes images──► [object_detector_node]
                                           │
                                    publishes detections
                                           │
                                           ▼
[lidar_node] ──publishes scans──►  [navigation_node] ──sends commands──► [motor_driver_node]
```

Each arrow is a **topic** — a named channel of data. Nodes produce data onto topics (publish) and consume data from topics (subscribe). They do not need to know who else is on the network; they just publish to a name and subscribe to a name.

:::tip[Beginner Tip]
Think of topics like radio stations. A weather station broadcasts on 91.5 FM. Anyone with a radio tuned to 91.5 FM receives the weather report. The weather station does not know how many people are listening, and the listeners do not know anything about the station's internal workings.
:::

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

Here is the computation graph for a typical mobile manipulation robot:

```
[camera_node]──/camera/image_raw──►[perception_node]──/detections──►[task_planner]
[lidar_node]──/scan──────────────►[slam_node]────────/map──────────►[nav2_planner]
                                  [slam_node]────────/odom─────────►[nav2_controller]
[imu_node]──/imu/data────────────►[ekf_node]─────────/odometry/filtered──►[nav2_controller]
[nav2_controller]──/cmd_vel──────►[diff_drive_node]
```

Useful CLI commands for inspecting the live graph:

```bash
ros2 node list                        # list all active nodes
ros2 topic list                       # list all active topics
ros2 topic echo /camera/image_raw     # print live messages
ros2 topic hz /scan                   # measure publish rate
ros2 topic bw /camera/image_raw       # measure bandwidth
rqt_graph                             # visualize the graph
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Graph introspection API**: The `rcl_interfaces` package provides a programmatic graph introspection API used by tools like `rqt_graph`:

```python
node.get_node_names()
node.get_topic_names_and_types()
node.get_publishers_info_by_topic('/scan')
node.get_subscriptions_info_by_topic('/scan')
```

Each `TopicEndpointInfo` returned includes the node name, namespace, topic type, endpoint type (publisher/subscriber), QoS profile, and GID (Global Identifier — a 16-byte DDS participant + entity identifier unique across the entire DDS domain).

**DDS domains**: ROS 2 nodes are grouped into DDS **domains** (integer 0–232). Nodes in different domains cannot communicate. Set `ROS_DOMAIN_ID=N` in the environment. This is used in multi-robot scenarios to prevent cross-robot interference: robot A uses `ROS_DOMAIN_ID=0`, robot B uses `ROS_DOMAIN_ID=1`.

**Security (SROS2)**: ROS 2 supports end-to-end DDS Security (OMG DDS-Security v1.1): authentication via X.509 certificates, encryption via AES-128-GCM, and access control via permission XML files. The `sros2` CLI generates the security artifact tree. This is mandatory for ROS 2 deployments in regulated industries (medical devices, autonomous vehicles on public roads).

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A robot has the following components: a camera, an object detector, a grasping arm, and a safety monitor. Draw a simple box-and-arrow diagram showing how these components might communicate using ROS 2 topics. Label each arrow with a plausible topic name.

2. For each of the following scenarios, identify whether topics, services, or actions are the most appropriate ROS 2 communication pattern. Explain your reasoning:
   - Streaming joint angle readings from an encoder at 500 Hz
   - Asking the robot to move its arm to a specific pose and waiting for confirmation
   - Navigating to a goal location that takes 30 seconds, with position updates along the way

### Intermediate

3. A publisher uses `BEST_EFFORT` reliability and a subscriber requests `RELIABLE` reliability on the same topic. What happens to the connection? What if both use `BEST_EFFORT`?

4. You are building a system where a high-resolution camera node publishes 30 fps uncompressed RGB images (1920×1080 = ~6 MB per frame). Your object detector subscribes. Estimate the bandwidth in MB/s. What QoS `History` setting would you choose for the subscriber, and why? What ROS 2 mechanism could eliminate the per-message memory copy?

### Advanced

5. Prove that under `KEEP_LAST(N)` history with `RELIABLE` QoS, a subscriber that falls more than $N$ messages behind will experience permanent data loss despite the reliability guarantee. State the exact condition under which this occurs in terms of publisher send rate $f_p$, subscriber processing rate $f_s$, and $N$.

6. Model the following system as a directed hypergraph $G = (V, H)$: three sensor nodes publish to two fusion nodes, which each publish to a single planner node. Write out $V$, $P_t$, and $S_t$ for each topic hyperedge $t$.
