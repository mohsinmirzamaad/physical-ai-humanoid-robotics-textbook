---
sidebar_position: 1
sidebar_label: "Chapter 3: Robot Simulation"
title: "Chapter 3: Robot Simulation with Gazebo"
description: "Robot simulation with Gazebo Harmonic: URDF and SDF robot descriptions, physics engines, sensor simulation, ROS 2 integration via ros_gz_bridge, and Unity robotics visualization."
keywords: [Gazebo, Gazebo Harmonic, URDF, SDF, xacro, physics simulation, sensor simulation, ros_gz_bridge, Unity Robotics Hub, robot simulation]
audience_tiers: [beginner, intermediate, advanced]
week: 6
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Chapter 3: Robot Simulation with Gazebo

Simulation is the cornerstone of modern robotics development. Before deploying code on a $200,000 humanoid robot, you run it thousands of times in a physics simulator — iterating safely, cheaply, and fast. This chapter covers the full simulation stack: robot description formats, physics engines, sensor models, the bridge between Gazebo and ROS 2, and a preview of Unity for photorealistic visualization.

## Two-Week Reading Schedule

| Week | Sections | Theme |
|------|----------|-------|
| **Week 6** | 3.1 Gazebo Setup · 3.2 URDF & SDF · 3.3 Physics Simulation | Building and describing the simulated world |
| **Week 7** | 3.4 Sensor Simulation · 3.5 ROS 2–Gazebo Integration · 3.6 Unity Intro · 3.7 Summary & Exercises | Sensing, bridging, and visualizing |

## Learning Objectives

| Objective | Beginner | Intermediate | Advanced |
|-----------|----------|--------------|----------|
| Explain what a physics simulator does | ✓ | ✓ | ✓ |
| Launch a Gazebo world and inspect topics | ✓ | ✓ | ✓ |
| Write a URDF with joints, inertia, and sensors | — | ✓ | ✓ |
| Configure `ros_gz_bridge` to relay sensor data | — | ✓ | ✓ |
| Compare ODE, Bullet, and DART physics solvers | — | — | ✓ |
| Analyze sensor noise models mathematically | — | — | ✓ |
| Design a sim-to-real transfer pipeline | — | — | ✓ |

## Prerequisites

| Topic | Where to Review |
|-------|----------------|
| ROS 2 nodes, topics, and services | Chapter 2 |
| Python basics | Any Python primer |
| Basic Linux terminal | Chapter 2 §2.1 |
| Linear algebra (for advanced sections) | Any undergrad text |

## Chapter Concept Map

```
                    ┌──────────────────────────────────┐
                    │      Gazebo Harmonic (gz-sim)     │
                    │   World · Models · Plugins · GUI  │
                    └───────────────┬──────────────────┘
                                    │ describes world with
                  ┌─────────────────▼──────────────────┐
                  │        Robot Description            │
                  │   URDF (joints/links/inertia)       │
                  │   SDF  (native Gazebo format)       │
                  │   xacro (macros + includes)         │
                  └──┬──────────────┬──────────────────┘
          ┌──────────▼──┐      ┌────▼──────────────────┐
          │  Physics     │      │   Sensor Plugins       │
          │  ODE/Bullet  │      │  LiDAR · Camera · IMU │
          │  /DART       │      │  Noise models          │
          └──────────────┘      └────┬──────────────────┘
                                     │ bridged by
                    ┌────────────────▼──────────────────┐
                    │        ros_gz_bridge               │
                    │  Gazebo topics ↔ ROS 2 topics     │
                    └───────────────┬───────────────────┘
                                    │
                    ┌───────────────▼───────────────────┐
                    │    ROS 2 Computation Graph         │
                    │  (from Chapter 2)                  │
                    └───────────────────────────────────┘
                                    │ alternative visualization
                    ┌───────────────▼───────────────────┐
                    │       Unity Robotics Hub           │
                    │  URDF Importer · TCP Connector    │
                    └───────────────────────────────────┘
```

## What Comes Next

**Chapter 4** builds on the simulation foundation to cover **State Estimation and Localization**: Kalman filters, EKF/UKF, SLAM, and sensor fusion pipelines — all of which you will test in the Gazebo environments you build here.
