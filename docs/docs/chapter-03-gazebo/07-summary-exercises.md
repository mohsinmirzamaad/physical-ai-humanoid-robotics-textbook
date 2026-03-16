---
sidebar_position: 8
sidebar_label: "Summary & Exercises"
title: "Summary & Exercises"
description: "Chapter 3 concept map, key concepts summary, scenario-identification exercises, complete Gazebo+ROS 2 pipeline project, physics solver design, and sensor noise analysis."
keywords: [Gazebo summary, robot simulation exercises, URDF SDF exercises, ros_gz_bridge, physics solver, sensor noise, sim-to-real, Unity robotics exercises]
audience_tiers: [beginner, intermediate, advanced]
week: 7
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Summary & Exercises

## Chapter Concept Map

```
                    ┌──────────────────────────────────────┐
                    │      Gazebo Harmonic (gz-sim)         │
                    │  gz sim · gz topic · gz service       │
                    │  SystemPlugin · headless mode · RTF   │
                    └───────────────┬──────────────────────┘
                                    │ loads and simulates
                  ┌─────────────────▼──────────────────────┐
                  │        Robot Description                │
                  │   URDF: links · joints · inertia        │
                  │   SDF:  native world · includes         │
                  │   xacro: macros · parameters            │
                  └──┬───────────────────────┬─────────────┘
          ┌──────────▼────────┐    ┌─────────▼──────────────┐
          │  Physics Engine   │    │    Sensor Plugins        │
          │  ODE: default     │    │  gpu_lidar · camera      │
          │  Bullet: soft     │    │  imu · depth_camera      │
          │  DART: humanoids  │    │  Gaussian noise model    │
          │  timestep · RTF   │    │  Latency budget          │
          └───────────────────┘    └─────────┬──────────────┘
                                             │ translated by
                    ┌────────────────────────▼──────────────┐
                    │          ros_gz_bridge                 │
                    │  YAML config · launch file             │
                    │  GZ_TO_ROS · ROS_TO_GZ                │
                    │  spawn_entity · multi-robot NS         │
                    └────────────────┬──────────────────────┘
                                     │ connects to
                    ┌────────────────▼──────────────────────┐
                    │        ROS 2 Computation Graph         │
                    │  Navigation · Perception · Control     │
                    └────────────────┬──────────────────────┘
                                     │ alternative vis
                    ┌────────────────▼──────────────────────┐
                    │        Unity Robotics Hub              │
                    │  URDF Importer · TCP Connector         │
                    │  Domain Randomization · HDR rendering  │
                    └───────────────────────────────────────┘
```

---

## Key Concepts Summary

| Concept | One-Line Summary |
|---------|-----------------|
| **Gazebo Harmonic** | Open-source physics simulator; gz-sim 8.x; successor to Gazebo Classic |
| **URDF** | ROS robot blueprint: links, joints, inertia, visual, collision in XML |
| **SDF** | Gazebo-native format: supports worlds, includes, lights, nested models |
| **xacro** | XML macro preprocessor: reduces URDF duplication via parameterized macros |
| **ODE** | Default Gazebo physics solver; LCP-based; good for general rigid bodies |
| **DART** | Featherstone-based solver; $O(n)$ for articulated chains; best for humanoids |
| **Sensor Plugins** | URDF/SDF extensions generating LiDAR/camera/IMU data with noise models |
| **ros_gz_bridge** | Bidirectional translator between gz-transport and ROS 2 DDS |
| **Unity Robotics Hub** | Unity packages for URDF import, ROS 2 bridge, and photorealistic simulation |
| **sim-to-real gap** | Difference between simulation and real-world behavior; addressed by noise + domain randomization |

---

## Beginner Exercises

### Exercise B1: Simulation vs Real

For each scenario, decide whether simulation (Gazebo) or real hardware is more appropriate, and explain your reasoning in one sentence:

1. Testing a new walking gait on a $300,000 humanoid robot
2. Demonstrating your robot's completed navigation to a potential investor
3. Evaluating 50 different PID controller configurations for a joint
4. Certifying that a robot arm meets ISO 10218 safety requirements
5. Generating 10,000 labeled images of objects for a training dataset

### Exercise B2: Sensor Identification

For each task, identify which sensor (LiDAR, camera, IMU, or depth camera) is most appropriate and explain why:

1. Detecting whether the robot has fallen over
2. Recognizing the color and shape of an object to pick up
3. Mapping a 3D room for navigation
4. Estimating how far away a wall is in a corridor
5. Capturing photorealistic images for a sim-to-real training dataset

### Exercise B3: Robot Description Decisions

Answer each question in 1–2 sentences:

1. When should you use SDF instead of URDF for defining your robot?
2. What happens in Gazebo if you forget to specify the `<inertial>` block for a link?
3. What is xacro, and what problem does it solve compared to plain URDF?

---

## Intermediate Exercises

### Exercise I1: Complete Gazebo + ROS 2 Pipeline

Build a complete simulated mobile robot system:

**Step 1 — Robot Description**: Write a xacro URDF for a differential-drive robot with:
- `base_link`: box 0.4×0.3×0.15 m, 5 kg
- Two `wheel_link`s: cylinder r=0.1 m, h=0.05 m, 0.5 kg each; `continuous` joints
- A `lidar_link`: small box 0.05×0.05×0.05 m, 0.1 kg; `fixed` joint on top of base
- A `camera_link`: tiny box, 0.01 kg; `fixed` joint on front of base
- A 2D LiDAR sensor plugin (360°, 10 Hz, 720 samples, ±2 cm noise)
- A camera sensor plugin (640×480, 30 Hz, RGB)

**Step 2 — Bridge Config**: Write the `ros_gz_bridge` YAML file mapping:
- LiDAR → `/scan` (`LaserScan`)
- Camera image → `/camera/image_raw` (`Image`)
- Camera info → `/camera/camera_info` (`CameraInfo`)
- `/cmd_vel` ← ROS 2 (`Twist`)

**Step 3 — Launch File**: Write a launch file that starts Gazebo, spawns the robot, and starts the bridge.

**Step 4 — Verification**: List the `ros2 topic` commands you would run to verify all five topics are active and publishing at the correct rates.

### Exercise I2: QoS Analysis for Simulated Sensors

Your Gazebo LiDAR sensor publishes at 10 Hz, and your SLAM algorithm subscribes to `/scan`. Answer:

1. Should `/scan` use `RELIABLE` or `BEST_EFFORT` QoS? What are the tradeoffs in a simulation context vs real hardware?
2. What `history` depth is appropriate for `/scan` given that your SLAM algorithm processes each scan in 5 ms?
3. The bridge node crashes and restarts. With `VOLATILE` durability, does the SLAM node receive any cached scans? What would you need to change for it to receive the last scan immediately upon reconnection?

---

## Advanced Exercises

### Exercise A1: Physics Solver Selection for a Humanoid

You are simulating a 35-DOF humanoid robot with bipedal walking.

1. **Solver selection**: Compare ODE and DART for this use case on: (a) per-step computation complexity as a function of DOF $n$, (b) numerical stability at 1 ms timestep with stiff joint springs ($k = 5 \times 10^5$ N/m), and (c) accuracy of contact dynamics during foot strike.

2. **Timestep analysis**: The robot's fastest joint has natural frequency $\omega_n = 800$ rad/s. What is the maximum stable Euler integration timestep? What timestep would you actually use (with a 3× safety margin)?

3. **Performance budget**: You need RTF ≥ 0.8 on a 12-core 4 GHz server. Estimate the maximum allowable per-step computation time in milliseconds. If DART requires 2.5 ms/step for this robot, can you meet the budget?

### Exercise A2: Sensor Noise Characterization

You are comparing your Gazebo simulation sensor data to real sensor data from a deployed robot.

1. **IMU noise**: Your real MPU-6050 IMU datasheet gives gyroscope noise density $N_g = 0.005°/\text{s}/\sqrt{\text{Hz}}$ sampled at 1 kHz. What `<stddev>` should you use in the Gazebo IMU plugin? Show the calculation.

2. **LiDAR noise**: Your real Velodyne VLP-16 has ±3 cm accuracy (1σ). What Gazebo `<stddev>` value does this correspond to?

3. **Validation method**: Describe a quantitative method to verify that your simulated sensor noise distribution matches the real sensor. What statistical test would you use? What sample size is needed for 95% confidence?

4. **Sim-to-real gap**: After matching noise parameters, your object detection algorithm still performs 15% worse on the real robot than in simulation. List three sensor imperfections beyond Gaussian noise that you should add to the Gazebo camera model.

---

## Chapter Review: Quick-Check Questions

1. What is the difference between Gazebo Harmonic and Gazebo Classic? Why was the transition made?
2. What are the five elements every URDF link should have? What happens if you omit the `<inertial>` block?
3. Name two scenarios where SDF is preferable to URDF as the robot description format.
4. What does the `<sor>` parameter in the ODE physics block control, and what are the tradeoffs of setting it too high?
5. Why does DART use the Featherstone algorithm, and for which robot morphologies does it provide the biggest advantage?
6. A LiDAR plugin's `<stddev>` is set to 0.0. Why might this cause your real-robot deployment to fail even if simulation tests pass perfectly?
7. What are the two transport systems that `ros_gz_bridge` connects, and why are they not directly compatible?
8. What is the purpose of the `<direction>` field in the `ros_gz_bridge` YAML config? What happens if you set it incorrectly for a velocity command topic?
9. What Unity package do you use to import a URDF robot, and what coordinate system conversion does it perform automatically?
10. Explain "domain randomization." Why does it improve sim-to-real transfer for neural network policies?
