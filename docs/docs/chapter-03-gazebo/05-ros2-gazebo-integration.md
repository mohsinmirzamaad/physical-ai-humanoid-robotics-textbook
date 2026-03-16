---
sidebar_position: 6
sidebar_label: "ROS 2–Gazebo Integration"
title: "ROS 2–Gazebo Integration"
description: "Bridging Gazebo Harmonic and ROS 2 with ros_gz_bridge: YAML bridge configuration, Python launch files, spawn_entity, topic remapping, multi-robot namespaces, and ros_gz_sim system plugins."
keywords: [ros_gz_bridge, ros_gz_sim, Gazebo ROS 2 integration, bridge configuration, spawn entity, topic remapping, ros2_control, Gazebo Harmonic ROS 2]
audience_tiers: [beginner, intermediate, advanced]
week: 7
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ROS 2–Gazebo Integration

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain why a bridge is needed between Gazebo and ROS 2
    - Identify what `ros_gz_bridge` does in plain language
    - Verify that sensor data is flowing from Gazebo to ROS 2 using CLI tools
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Write a `ros_gz_bridge` YAML configuration file for multiple topics
    - Integrate the bridge into a Python ROS 2 launch file
    - Spawn a robot URDF into a running Gazebo world
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Analyze the end-to-end latency introduced by the bridge
    - Use `ros_gz_sim` SystemPlugin for `ros2_control` integration
    - Design a multi-robot namespace strategy for fleet simulation
  </TabItem>
</Tabs>

---

## The Bridge Between Two Worlds

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Gazebo speaks one language (gz-transport, a pub/sub system built for simulation), and ROS 2 speaks another (DDS, the industry-standard distributed messaging protocol). These two systems cannot talk directly — they need a **translator**.

Think of it like a diplomatic interpreter at the United Nations. The French delegate speaks French, the Japanese delegate speaks Japanese. The interpreter in the middle listens to one side and re-speaks the message in the other language in real time.

`ros_gz_bridge` is the interpreter between Gazebo and ROS 2. It:
- Subscribes to a Gazebo topic (e.g., `/lidar` carrying Gazebo-format laser data)
- Converts the message to the equivalent ROS 2 type (`sensor_msgs/LaserScan`)
- Publishes it on a ROS 2 topic (e.g., `/scan`)

This happens in both directions — so your ROS 2 code can also send commands back into Gazebo (e.g., velocity commands to simulated wheels).

:::info[Key Term]
**ros_gz_bridge**: A ROS 2 node that bidirectionally converts messages between Gazebo's gz-transport system and ROS 2 DDS. Required to connect any Gazebo sensor or actuator to ROS 2 code.
:::

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**ros_gz_bridge YAML configuration file**:

```yaml
# config/bridge.yaml
---
- ros_topic_name: /scan
  gz_topic_name: /lidar
  ros_type_name: sensor_msgs/msg/LaserScan
  gz_type_name: gz.msgs.LaserScan
  direction: GZ_TO_ROS

- ros_topic_name: /camera/image_raw
  gz_topic_name: /camera/image_raw
  ros_type_name: sensor_msgs/msg/Image
  gz_type_name: gz.msgs.Image
  direction: GZ_TO_ROS

- ros_topic_name: /camera/camera_info
  gz_topic_name: /camera/camera_info
  ros_type_name: sensor_msgs/msg/CameraInfo
  gz_type_name: gz.msgs.CameraInfo
  direction: GZ_TO_ROS

- ros_topic_name: /imu/data
  gz_topic_name: /imu/data
  ros_type_name: sensor_msgs/msg/Imu
  gz_type_name: gz.msgs.IMU
  direction: GZ_TO_ROS

- ros_topic_name: /cmd_vel
  gz_topic_name: /cmd_vel
  ros_type_name: geometry_msgs/msg/Twist
  gz_type_name: gz.msgs.Twist
  direction: ROS_TO_GZ
```

**Complete launch file** for Gazebo + robot + bridge:

```python
# launch/sim.launch.py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
import os

def generate_launch_description():
    pkg_share = FindPackageShare('my_robot_sim')

    # Launch Gazebo with our world
    gz_launch = IncludeLaunchDescription(
        PathJoinSubstitution([
            FindPackageShare('ros_gz_sim'), 'launch', 'gz_sim.launch.py']),
        launch_arguments={'gz_args': 'empty.sdf -r'}.items())

    # Spawn robot URDF into Gazebo
    spawn_robot = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-name', 'my_robot',
            '-file', PathJoinSubstitution([pkg_share, 'urdf', 'my_robot.urdf']),
            '-z', '0.1'],
        output='screen')

    # Start the bridge
    bridge = Node(
        package='ros_gz_bridge',
        executable='parameter_bridge',
        arguments=['--ros-args',
                   '--params-file',
                   PathJoinSubstitution([pkg_share, 'config', 'bridge.yaml'])],
        output='screen')

    # Publish robot state (joint states → TF)
    robot_state_pub = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        parameters=[{'robot_description': open(
            os.path.join(pkg_share.perform(None), 'urdf', 'my_robot.urdf')).read()}])

    return LaunchDescription([
        gz_launch, spawn_robot, bridge, robot_state_pub])
```

**Verify data flow**:

```bash
# Check Gazebo side
gz topic -l | grep lidar
gz topic -e -t /lidar --count 1

# Check ROS 2 side (after bridge starts)
ros2 topic list | grep scan
ros2 topic echo /scan --once
ros2 topic hz /scan        # should match sensor update_rate
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Bridge latency analysis**:

The `ros_gz_bridge` introduces measurable latency between Gazebo sensor generation and ROS 2 subscriber callback:

```
Gazebo physics step (t=0)
  └─ Sensor plugin generates data (gz-transport publish)     +1-5 ms
       └─ ros_gz_bridge subscriber receives gz msg           +0.1 ms
            └─ Message type conversion (Protobuf → ROS msg)  +0.5-2 ms
                 └─ DDS publish on ROS 2 topic               +0.1 ms
                      └─ ROS 2 subscriber callback           +0.1-1 ms
Total end-to-end:                                            2-9 ms
```

For a 1 kHz control loop, this bridge latency is unacceptable. Solution: use `ros_gz_sim` system plugins that run **inside** the Gazebo process, eliminating inter-process communication:

```xml
<!-- In world SDF: use gz-sim-ros2-control-system instead of bridge -->
<plugin filename="gz_ros2_control-system"
        name="gz_ros2_control::GazeboSimROS2ControlPlugin">
  <parameters>$(find my_robot_sim)/config/ros2_control.yaml</parameters>
</plugin>
```

This plugin implements `hardware_interface::SystemInterface` inside Gazebo, giving `ros2_control` direct access to joint state/command at simulation timestep frequency with zero bridge overhead.

**Multi-robot namespace strategy**:

```yaml
# bridge.yaml for robot_1
- ros_topic_name: /robot_1/scan
  gz_topic_name: /robot_1/lidar
  ros_type_name: sensor_msgs/msg/LaserScan
  gz_type_name: gz.msgs.LaserScan
  direction: GZ_TO_ROS

- ros_topic_name: /robot_1/cmd_vel
  gz_topic_name: /robot_1/cmd_vel
  ros_type_name: geometry_msgs/msg/Twist
  gz_type_name: gz.msgs.Twist
  direction: ROS_TO_GZ
```

In Gazebo SDF, each robot model is given a unique namespace:

```xml
<model name="robot_1">
  <plugin filename="gz-sim-diff-drive-system" ...>
    <topic>/robot_1/cmd_vel</topic>
  </plugin>
</model>
```

This pattern scales to fleet simulation: 10 robots → 10 bridge configs + 10 model namespaces, all running in a single Gazebo process. The bridge node can be parameterized with `robot_id` via `LaunchConfiguration` substitutions.

**Spawning robots programmatically** (for randomized testing):

```python
import rclpy
from ros_gz_interfaces.srv import SpawnEntity

node = rclpy.create_node('spawner')
client = node.create_client(SpawnEntity, '/world/my_world/create')
client.wait_for_service()

req = SpawnEntity.Request()
req.xml = open('my_robot.sdf').read()
req.name = 'robot_1'
req.initial_pose.position.x = 1.0
future = client.call_async(req)
rclpy.spin_until_future_complete(node, future)
```

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. Without `ros_gz_bridge`, can your ROS 2 navigation algorithm receive LiDAR data from Gazebo? Explain why or why not.

2. You run your simulation launch file and `ros2 topic list` shows no `/scan` topic, even though Gazebo is running. What are the two most likely causes?

### Intermediate

3. Write a complete `ros_gz_bridge` YAML config for a robot with: a 2D LiDAR (`/scan`), an RGB camera (`/camera/image_raw`, `/camera/camera_info`), an IMU (`/imu/data`), velocity commands in (`/cmd_vel`), and odometry out (`/odom`). For each entry, specify `direction` (GZ_TO_ROS or ROS_TO_GZ).

4. You want to spawn 5 identical robots in Gazebo at different starting positions for a formation control test. Write a Python launch file that uses a Python loop to generate 5 `Node` spawn actions, each with a unique namespace (`robot_0` through `robot_4`) and offset starting positions `(i*2.0, 0, 0)`.

### Advanced

5. The `ros_gz_bridge` introduces 3 ms of latency for LiDAR data. Your visual-inertial odometry algorithm requires synchronized LiDAR and IMU data with timestamps within 0.5 ms of each other. The IMU runs at 200 Hz (5 ms period) and the LiDAR at 10 Hz (100 ms period). Design a synchronization strategy that: (a) accounts for the bridge latency, (b) uses ROS 2 message_filters `ApproximateTimeSynchronizer`, and (c) specifies the maximum timestamp tolerance parameter.

6. Design a multi-robot simulation for a search-and-rescue scenario: 3 robots, each with LiDAR, camera, and IMU. (a) Design the Gazebo SDF model structure with proper namespacing. (b) Write the bridge configuration YAML. (c) Analyze the total DDS traffic in MB/s assuming 10 Hz LiDAR (PointCloud2: 200K points × 16 bytes), 30 Hz camera (640×480 RGB), and 200 Hz IMU.
