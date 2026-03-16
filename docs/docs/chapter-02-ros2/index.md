---
sidebar_position: 1
sidebar_label: "Chapter 2 Overview"
title: "Chapter 2: ROS 2 Fundamentals"
description: "Three-week deep dive into ROS 2 middleware: architecture, nodes, topics, services, actions, programming, launch, and parameters."
keywords: [ROS 2, middleware, DDS, nodes, topics, services, actions, rclpy, launch, parameters]
audience_tiers: [beginner, intermediate, advanced]
week: 3
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Chapter 2: ROS 2 Fundamentals

ROS 2 (Robot Operating System 2) is the middleware layer that connects sensors, algorithms, and actuators in modern robot systems. It is not an operating system in the traditional sense — it is a framework of libraries and tools that standardizes how robot software components communicate, are configured, and are launched. Every major humanoid robot platform in production today — from Boston Dynamics' Atlas to Agility Robotics' Digit — uses ROS 2 or a ROS 2–derived architecture as its software backbone.

This chapter covers Weeks 3–5 of the course. By the end, you will be able to build, run, and analyze a complete ROS 2 software system.

---

## Three-Week Reading Schedule

| Week | Topics | Files | Audience Focus |
|------|--------|-------|----------------|
| **Week 3** | Architecture, Nodes, Executors | §1 ROS 2 Architecture, §2 Nodes & Executors | All tiers: foundations |
| **Week 4** | Communication Primitives | §3 Topics, §4 Services, §5 Actions | All tiers: pub/sub + RPC |
| **Week 5** | Engineering the System | §6 rclpy Programming, §7 Launch Files, §8 Parameters, §9 Summary | All tiers: system assembly |

---

## Learning Objectives Matrix

| Objective | Beginner | Intermediate | Advanced |
|-----------|----------|--------------|----------|
| Explain ROS 2's role in a robot stack | Analogy-based understanding | DDS/RMW architecture | RTPS protocol + QoS math |
| Work with nodes | Know what a node is | Write, spin, and lifecycle-manage nodes | Executor scheduling + real-time design |
| Use topics | Publisher/subscriber concept | QoS profiles + Python code | CDR serialization + zero-copy IPC |
| Use services | Request/response concept | `.srv` files + async client | DDS-RPC timing + deadlock avoidance |
| Use actions | Goal/feedback/result concept | Action server/client in rclpy | Preemption semantics + BehaviorTree.CPP |
| Write rclpy code | "Hello Robot" node | Full pub/sub + timers + parameters | Composable nodes + asyncio integration |
| Write launch files | Understand what launch files do | Python launch API | Event handlers + Nav2 decomposition |
| Manage parameters | YAML config concept | `declare_parameter` + callbacks | Parameter events + atomic set |

---

## Prerequisites

| Knowledge Area | Required Level | Where Covered |
|----------------|----------------|---------------|
| Python 3 | Functions, classes, `async`/`await` | External prerequisite |
| Linux CLI | `bash`, file paths, processes | External prerequisite |
| Physical AI foundations | Chapter 1 content | Chapter 1 of this textbook |
| Basic probability | Distributions, Bayes | Chapter 1, §3 (State Estimation) |

---

## What Comes Next

Chapter 3 (State Estimation & Sensor Fusion) builds directly on ROS 2: sensor data arrives over ROS 2 topics, filter nodes subscribe and publish state estimates, and the entire pipeline is assembled with launch files and parameters — exactly the tools covered here. By the time you reach Chapter 3, the ROS 2 layer will be invisible scaffolding, letting you focus on the estimation algorithms themselves.

---

## Chapter Map

```
ROS 2 Architecture (§1)
        │
        ▼
  Nodes & Executors (§2)
        │
   ┌────┼────┐
   ▼    ▼    ▼
Topics  Services  Actions
 (§3)   (§4)      (§5)
   └────┬────┘
        ▼
  rclpy Programming (§6)
        │
        ▼
   Launch Files (§7)
        │
        ▼
   Parameters (§8)
        │
        ▼
 Summary & Exercises (§9)
```
