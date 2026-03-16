---
sidebar_position: 4
sidebar_label: "Topics and Messages"
title: "Topics and Messages"
description: "ROS 2 topics: the pub/sub communication primitive, standard message types, QoS profiles, CDR serialization, zero-copy transport, and latency budgeting."
keywords: [ROS 2 topics, publisher, subscriber, QoS, sensor_msgs, geometry_msgs, CDR, zero-copy, message serialization]
audience_tiers: [beginner, intermediate, advanced]
week: 4
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Topics and Messages

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain the publisher/subscriber pattern using the radio broadcast analogy
    - Identify the correct standard message type for common sensor data
    - Use `ros2 topic echo` and `ros2 topic hz` to inspect a live topic
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Write a Python publisher and subscriber node with appropriate QoS settings
    - Choose between `sensor_msgs`, `geometry_msgs`, and `std_msgs` for a given data type
    - Diagnose a QoS incompatibility using CLI tools
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Describe CDR serialization format and its impact on message size and latency
    - Design a zero-copy shared-memory transport pipeline for high-throughput messages
    - Use the topic introspection API programmatically
    - Construct a latency budget for a sensor-to-actuator pipeline
  </TabItem>
</Tabs>

---

## The Publisher/Subscriber Pattern

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Think of a radio station. The station broadcasts music on a specific frequency — say, 101.5 FM — without knowing how many people are listening. Anyone who tunes their radio to 101.5 FM receives the music. The station does not need to call each listener individually; it just broadcasts and anyone who is interested listens.

ROS 2 topics work the same way:
- A **publisher** is like the radio station: it sends data to a named channel (topic) continuously
- A **subscriber** is like a radio: it tunes into a topic name and receives data whenever something is published
- The **topic name** is like the radio frequency: it is the agreed-upon channel name (e.g., `/camera/image_raw`)

:::info[Key Term]
**Topic**: A named channel in the ROS 2 network. Publishers send messages to a topic; subscribers receive them. Many publishers and many subscribers can share one topic simultaneously.
:::

Common topics you will see on a real robot:
- `/camera/image_raw` — images from a camera
- `/scan` — distance readings from a LiDAR
- `/cmd_vel` — velocity commands to the wheels
- `/joint_states` — current positions of all robot joints

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

Topics are typed: every publisher and subscriber on a topic must agree on the **message type**. The most important standard message packages are:

**`std_msgs`** — primitive wrappers:
- `std_msgs/String`, `std_msgs/Float64`, `std_msgs/Bool`, `std_msgs/Header`

**`sensor_msgs`** — sensor data:
- `sensor_msgs/Image` — camera images (width, height, encoding, data array)
- `sensor_msgs/PointCloud2` — 3D point clouds from LiDAR/depth cameras
- `sensor_msgs/Imu` — accelerometer + gyroscope data with covariance
- `sensor_msgs/JointState` — joint positions, velocities, and efforts
- `sensor_msgs/LaserScan` — 2D LiDAR scan ranges

**`geometry_msgs`** — spatial data:
- `geometry_msgs/Twist` — linear + angular velocity (used for `/cmd_vel`)
- `geometry_msgs/PoseStamped` — position + orientation with timestamp
- `geometry_msgs/TransformStamped` — coordinate frame transform

**Python publisher example**:

```python
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy
from geometry_msgs.msg import Twist

class VelocityPublisher(Node):
    def __init__(self):
        super().__init__('velocity_publisher')
        qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            depth=10
        )
        self.pub = self.create_publisher(Twist, '/cmd_vel', qos)
        self.timer = self.create_timer(0.1, self.publish_velocity)

    def publish_velocity(self):
        msg = Twist()
        msg.linear.x = 0.5   # m/s forward
        msg.angular.z = 0.1  # rad/s turn
        self.pub.publish(msg)
```

**Python subscriber example**:

```python
from sensor_msgs.msg import Imu

class ImuSubscriber(Node):
    def __init__(self):
        super().__init__('imu_subscriber')
        self.sub = self.create_subscription(
            Imu, '/imu/data', self.imu_callback, 10)

    def imu_callback(self, msg: Imu):
        ax = msg.linear_acceleration.x
        self.get_logger().info(f'Accel X: {ax:.3f} m/s²')
```

**Useful CLI commands**:

```bash
ros2 topic list                              # all active topics
ros2 topic info /scan                        # type + publisher/subscriber count
ros2 topic echo /scan --once                 # print one message
ros2 topic hz /camera/image_raw              # measure publish rate
ros2 topic bw /camera/image_raw              # measure bandwidth
ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.5}}" --rate 10
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**CDR serialization**: ROS 2 uses **CDR** (Common Data Representation, OMG standard) for on-the-wire message encoding. CDR is a binary format with alignment padding to machine-word boundaries. A `sensor_msgs/Imu` message (9 doubles + 3 × 9-element covariance matrices) serializes to approximately 296 bytes at 1 kHz → ~296 KB/s, entirely manageable. A `sensor_msgs/PointCloud2` at 128-line LiDAR resolution (~130K points × 12 bytes/point) serializes to ~1.5 MB per frame → 45 MB/s at 30 Hz — well above typical Ethernet saturation points if multiple such topics exist.

**Custom `.msg` IDL pipeline**:

```
my_pkg/msg/Detection.msg
  ─────────────────────
  Header header
  string class_name
  float32 confidence
  geometry_msgs/BoundingBox2D bbox
```

Building the package runs `rosidl_generate_interfaces()` which invokes:
1. `rosidl_adapter` → normalizes `.msg` to `.idl` (OMG IDL format)
2. `rosidl_generator_py` → generates `my_pkg/msg/_detection.py`
3. `rosidl_typesupport_fastrtps_py` → generates CDR serialization code

**Topic introspection API**:

```python
pub_info = node.get_publishers_info_by_topic('/scan')
for info in pub_info:
    print(info.node_name, info.topic_type, info.qos_profile)
```

**Latency budget analysis** — sensor to actuator:

| Stage | Typical latency | Dominated by |
|-------|-----------------|--------------|
| Sensor hardware → DMA buffer | 0.1–2 ms | Hardware |
| Driver node publish | 0.1–0.5 ms | Serialization |
| DDS transport (loopback) | 0.05–0.2 ms | Kernel socket |
| Subscriber callback dispatch | 0.1–1 ms | Executor overhead |
| Processing callback | 1–50 ms | Algorithm complexity |
| Command publish + DDS | 0.1–0.5 ms | Serialization |
| Actuator hardware receive | 0.1–1 ms | Hardware |
| **Total (typical)** | **2–55 ms** | |

For a 100 Hz control loop (10 ms period), every stage must complete within the budget. Enabling intra-process communication eliminates the DDS transport step entirely when publisher and subscriber are in the same process.

**Zero-copy shared memory** (FastDDS + iceoryx): When using the `rmw_iceoryx` RMW layer, large messages are allocated in shared memory. Publishers write directly to a shared pool; subscribers get a pointer — no copy at any point. Throughput scales with message size at near-zero CPU overhead, limited only by memory bandwidth (~50 GB/s on modern hardware).

  </TabItem>
</Tabs>

---

## QoS in Practice

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

**QoS** stands for **Quality of Service** — it is a set of rules that govern how messages are delivered. The most important rule for beginners is **reliability**:

- **RELIABLE**: "Make sure every message gets delivered, even if you have to retry." Use this when missing a message would cause a problem — like a safety command.
- **BEST_EFFORT**: "Send the message and don't worry if it is lost." Use this for sensor data that comes so fast that losing one frame does not matter — like camera images.

Choosing the wrong reliability setting is one of the most common ROS 2 mistakes. If a publisher uses `BEST_EFFORT` and a subscriber demands `RELIABLE`, they will never connect — and no error message will tell you why.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

ROS 2 provides named **QoS profiles** for common sensor patterns:

```python
from rclpy.qos import qos_profile_sensor_data, qos_profile_system_default

# sensor_data: BEST_EFFORT, VOLATILE, depth=5
self.create_subscription(Image, '/camera/image', cb, qos_profile_sensor_data)

# system_default: RELIABLE, VOLATILE, depth=10
self.create_publisher(String, '/status', qos_profile_system_default)
```

**QoS compatibility table** (✓ = connection forms, ✗ = incompatible):

| Publisher | Subscriber | Result |
|-----------|------------|--------|
| RELIABLE | RELIABLE | ✓ |
| RELIABLE | BEST_EFFORT | ✓ |
| BEST_EFFORT | BEST_EFFORT | ✓ |
| BEST_EFFORT | RELIABLE | ✗ — silent failure! |

To debug silent QoS mismatches:

```bash
ros2 topic info /my_topic --verbose   # shows QoS profiles of all endpoints
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**QoS policy interactions**: Durability `TRANSIENT_LOCAL` on the publisher stores the last $N$ messages (where $N$ = history depth) as a "last-will" cache. A late-joining subscriber with `TRANSIENT_LOCAL` receives these cached messages immediately upon connection — critical for topics that publish once at startup (e.g., robot URDF description, static map). However, `TRANSIENT_LOCAL` requires `RELIABLE` and increases publisher memory usage.

**Deadline QoS**: If a publisher declares `deadline=Duration(seconds=0.01)` (100 Hz), the DDS layer will trigger a deadline-missed event if any sample is not sent within 10 ms. The `on_offered_deadline_missed` callback fires on the publisher side; `on_requested_deadline_missed` fires on the subscriber. These can be wired to safety monitors:

```python
from rclpy.event_handler import PublisherEventCallbacks, QoSPublisherEventType

def deadline_missed_cb(event):
    self.get_logger().error('Deadline missed! Total: %d' % event.total_count)

self.pub = self.create_publisher(
    Twist, '/cmd_vel', qos,
    event_callbacks=PublisherEventCallbacks(deadline_missed=deadline_missed_cb)
)
```

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. Match each data stream to the correct ROS 2 message type and topic name convention:
   - Camera image feed → ?
   - Robot wheel velocity command → ?
   - 2D laser scan → ?
   - Robot joint positions → ?

2. You notice that your subscriber is not receiving any messages from a publisher. You check with `ros2 topic list` and both the publisher and subscriber are running, and the topic name matches. What is the most likely cause of this silent failure, and how would you diagnose it?

### Intermediate

3. Write a complete ROS 2 Python node that subscribes to `/joint_states` (`sensor_msgs/JointState`) and logs the position of a joint named `"shoulder_pan"` at 10 Hz using a timer. Use `qos_profile_sensor_data` for the subscription.

4. A LiDAR publishes `sensor_msgs/PointCloud2` at 10 Hz. Each message contains 200,000 points, each point being XYZ float32 (12 bytes) plus intensity float32 (4 bytes). Calculate: (a) size of one message in MB, (b) bandwidth in MB/s, (c) whether `RELIABLE` or `BEST_EFFORT` is more appropriate and why.

### Advanced

5. A safety monitor must receive a heartbeat on `/heartbeat` (`std_msgs/Bool`) at 10 Hz or trigger an emergency stop. Design the complete QoS profile (reliability, durability, deadline, lifespan) for both publisher and subscriber. Justify each choice. What deadline-missed callback would you install?

6. Explain why enabling intra-process communication for a publisher/subscriber pair in the same composable node container reduces end-to-end latency. Under what conditions does it reduce to a single pointer pass? What are the constraints on the message type for this optimization to work?
