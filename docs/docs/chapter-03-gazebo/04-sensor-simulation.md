---
sidebar_position: 5
sidebar_label: "Sensor Simulation"
title: "Sensor Simulation"
description: "Simulating LiDAR, cameras, and IMUs in Gazebo Harmonic: sensor plugin XML configuration, Gaussian noise models, ros_gz_bridge topic mapping, and latency budget analysis."
keywords: [Gazebo sensor simulation, gpu_lidar, camera sensor, IMU sensor, Gaussian noise, ros_gz_bridge, depth camera, sensor plugin, PointCloud2]
audience_tiers: [beginner, intermediate, advanced]
week: 7
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Sensor Simulation

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain why sensor simulation is important for robot development
    - Identify the three main sensor types covered: LiDAR, camera, and IMU
    - Describe what "sensor noise" means and why it must be simulated
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Add LiDAR, camera, and IMU sensor plugins to a URDF/SDF file
    - Configure noise models for each sensor type
    - Verify sensor data with `gz topic -e` and `ros2 topic echo`
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Derive the Gaussian noise model from physical sensor specifications
    - Construct a sensor-to-actuator latency budget for a simulated pipeline
    - Configure HDR camera and depth camera for sim-to-real transfer research
  </TabItem>
</Tabs>

---

## Giving the Robot Senses

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Humans navigate the world using our senses: eyes, ears, touch, balance. A robot needs equivalent sensors — cameras to see, LiDARs to measure distances, and IMUs to feel acceleration and rotation.

In Gazebo, we can attach **simulated sensors** to any link of the robot. These sensors:
- Generate realistic-looking data (images, point clouds, acceleration readings)
- Include **noise** — small random errors that mimic the imperfections of real sensors
- Publish data to Gazebo topics, which can then be bridged to ROS 2

:::info[Key Term]
**Sensor Plugin**: A Gazebo module that attaches to a robot link and generates simulated sensor data at a specified rate. The data can include realistic noise, occlusion, and field-of-view limitations.
:::

**The three sensors covered in this section**:
- **LiDAR** (Light Detection and Ranging): fires laser beams in all directions and measures distance by timing the return — like echolocation with light
- **Camera**: captures a 2D image of the scene, with configurable resolution, field of view, and noise
- **IMU** (Inertial Measurement Unit): measures the robot's linear acceleration and angular velocity — like the motion sensor in your smartphone

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**LiDAR sensor plugin** (URDF `<gazebo>` extension):

```xml
<gazebo reference="lidar_link">
  <sensor name="gpu_lidar" type="gpu_lidar">
    <update_rate>10</update_rate>
    <topic>/lidar</topic>
    <gz_frame_id>lidar_link</gz_frame_id>
    <lidar>
      <scan>
        <horizontal>
          <samples>720</samples>
          <resolution>1</resolution>
          <min_angle>-3.14159</min_angle>
          <max_angle>3.14159</max_angle>
        </horizontal>
        <vertical>
          <samples>16</samples>
          <min_angle>-0.261799</min_angle>   <!-- -15 deg -->
          <max_angle>0.261799</max_angle>    <!-- +15 deg -->
        </vertical>
      </scan>
      <range>
        <min>0.08</min>
        <max>100.0</max>
        <resolution>0.01</resolution>
      </range>
      <noise>
        <type>gaussian</type>
        <mean>0.0</mean>
        <stddev>0.01</stddev>   <!-- 1 cm range noise -->
      </noise>
    </lidar>
    <visualize>false</visualize>
  </sensor>
</gazebo>
```

**Camera sensor plugin**:

```xml
<gazebo reference="camera_link">
  <sensor name="camera" type="camera">
    <update_rate>30</update_rate>
    <topic>/camera/image_raw</topic>
    <gz_frame_id>camera_link</gz_frame_id>
    <camera>
      <horizontal_fov>1.2566</horizontal_fov>  <!-- 72 degrees -->
      <image>
        <width>640</width>
        <height>480</height>
        <format>R8G8B8</format>
      </image>
      <clip>
        <near>0.01</near>
        <far>100</far>
      </clip>
      <noise>
        <type>gaussian</type>
        <mean>0.0</mean>
        <stddev>0.007</stddev>   <!-- pixel noise (normalized 0-1) -->
      </noise>
    </camera>
    <visualize>false</visualize>
  </sensor>
</gazebo>
```

**IMU sensor plugin**:

```xml
<gazebo reference="imu_link">
  <sensor name="imu" type="imu">
    <update_rate>200</update_rate>
    <topic>/imu/data</topic>
    <gz_frame_id>imu_link</gz_frame_id>
    <imu>
      <angular_velocity>
        <x><noise type="gaussian"><mean>0</mean><stddev>0.009</stddev></noise></x>
        <y><noise type="gaussian"><mean>0</mean><stddev>0.009</stddev></noise></y>
        <z><noise type="gaussian"><mean>0</mean><stddev>0.009</stddev></noise></z>
      </angular_velocity>
      <linear_acceleration>
        <x><noise type="gaussian"><mean>0</mean><stddev>0.021</stddev></noise></x>
        <y><noise type="gaussian"><mean>0</mean><stddev>0.021</stddev></noise></y>
        <z><noise type="gaussian"><mean>0</mean><stddev>0.021</stddev></noise></z>
      </linear_acceleration>
    </imu>
    <visualize>false</visualize>
  </sensor>
</gazebo>
```

**ROS 2 topic mapping** (via `ros_gz_bridge` — covered in Section 3.5):

| Gazebo Topic | ROS 2 Topic | ROS 2 Message Type |
|-------------|------------|-------------------|
| `/lidar` | `/scan` | `sensor_msgs/LaserScan` |
| `/lidar` | `/points` | `sensor_msgs/PointCloud2` |
| `/camera/image_raw` | `/camera/image_raw` | `sensor_msgs/Image` |
| `/camera/camera_info` | `/camera/camera_info` | `sensor_msgs/CameraInfo` |
| `/imu/data` | `/imu/data` | `sensor_msgs/Imu` |

**Verify sensor data**:

```bash
# Check Gazebo topics (gz-transport side)
gz topic -l | grep -E "lidar|camera|imu"
gz topic -e -t /lidar --count 1

# After bridging, check ROS 2 side
ros2 topic echo /scan --once
ros2 topic hz /camera/image_raw
ros2 topic bw /points
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Gaussian noise model derivation**: Real sensor datasheets specify noise as a **noise spectral density** (NSD). For an IMU gyroscope with NSD $N_g$ (rad/s/√Hz) sampled at rate $f_s$ Hz:

$$\sigma_{\text{discrete}} = N_g \cdot \sqrt{f_s}$$

For the Bosch BMI088 IMU: $N_g = 0.00015$ rad/s/√Hz at $f_s = 200$ Hz:

$$\sigma = 0.00015 \times \sqrt{200} \approx 0.0021 \text{ rad/s}$$

This is the `<stddev>` value to use in the IMU plugin's angular velocity noise block. Always match simulation noise to datasheet values for valid sim-to-real transfer.

**Sensor latency budget** (Gazebo → ROS 2 subscriber):

| Stage | Typical Latency | Notes |
|-------|----------------|-------|
| Physics step (1 ms) | 1 ms | Sensor data generated at step completion |
| Gazebo sensor plugin render | 2–5 ms | GPU LiDAR ray cast or camera render |
| gz-transport publish | 0.1–0.5 ms | Shared memory within same process |
| `ros_gz_bridge` conversion | 0.5–2 ms | Message type conversion + DDS publish |
| ROS 2 DDS transport | 0.05–0.2 ms | Same-machine loopback |
| ROS 2 subscriber callback | 0.1–1 ms | Executor dispatch |
| **Total** | **3–10 ms** | Typical for GPU LiDAR at 10 Hz |

**Depth camera and PointCloud2**: For sim-to-real transfer in manipulation, use depth cameras:

```xml
<sensor name="depth_camera" type="depth_camera">
  <update_rate>30</update_rate>
  <topic>/depth_camera</topic>
  <camera>
    <horizontal_fov>1.047</horizontal_fov>
    <image>
      <width>848</width><height>480</height>
      <format>R_FLOAT32</format>   <!-- depth in meters -->
    </image>
    <clip><near>0.1</near><far>10.0</far></clip>
    <noise><type>gaussian</type><mean>0.0</mean><stddev>0.003</stddev></noise>
  </camera>
</sensor>
```

The bridge converts this to `sensor_msgs/PointCloud2` with fields `x, y, z, rgb` — matching the output of real Intel RealSense D435i cameras.

**HDR (High Dynamic Range) camera** for realistic lighting variation:

```xml
<camera>
  <!-- ... resolution, FOV, clip ... -->
  <lens>
    <type>stereographic</type>
    <scale_to_hfov>true</scale_to_hfov>
  </lens>
  <image><format>R32G32B32_FLOAT</format></image>  <!-- HDR format -->
</camera>
```

HDR simulation is critical for evaluating vision algorithms that must handle bright sunlight and dark shadows simultaneously — a common failure mode in outdoor robotics.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A real LiDAR measures distances with a typical error of ±2 cm. If you set the Gazebo LiDAR noise `<stddev>` to 0.0, what problem might you encounter when testing your perception algorithm in simulation vs the real robot?

2. Why is sensor noise added to a simulation if the goal is to test robot software? List two specific failure modes that would only appear if noise is included.

### Intermediate

3. Write the complete `<gazebo>` sensor block for a 64-beam rotating LiDAR (like a Velodyne HDL-64E) with: 10 Hz update rate, 360° horizontal scan (2048 samples), vertical range −24.8° to +2°, max range 120 m, and range noise stddev 0.02 m. What ROS 2 message type will this data bridge to?

4. After adding a camera sensor to your robot, `ros2 topic hz /camera/image_raw` shows 0 Hz even though the Gazebo topic `/camera/image_raw` is publishing at 30 Hz. List three possible causes and how you would diagnose each.

### Advanced

5. A VectorNav VN-100 IMU datasheet specifies gyroscope noise density $N_g = 0.0035°/\text{s}/\sqrt{\text{Hz}}$ and accelerometer noise density $N_a = 0.14 \, \text{mg}/\sqrt{\text{Hz}}$. The IMU is sampled at 400 Hz. Compute the `<stddev>` values for both the angular velocity and linear acceleration noise blocks in the Gazebo IMU plugin. Show all unit conversions.

6. You are evaluating a visual odometry algorithm in Gazebo before deploying on a real robot. The algorithm fails in the real world but works in simulation. Propose a systematic approach to identify which sensor imperfections (noise model, lens distortion, motion blur, exposure time) are causing the sim-to-real gap, and describe how you would add each to the Gazebo camera plugin.
