---
sidebar_position: 3
sidebar_label: "URDF & SDF"
title: "URDF and SDF: Robot Description Formats"
description: "URDF and SDF robot description formats: link and joint definitions, inertia tensors, visual and collision geometry, xacro macros, and SDF vs URDF tradeoffs for Gazebo Harmonic."
keywords: [URDF, SDF, xacro, robot description, link, joint, inertia tensor, collision geometry, gz sdf, Gazebo model]
audience_tiers: [beginner, intermediate, advanced]
week: 6
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# URDF and SDF: Robot Description Formats

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain what a robot description file is using the "blueprint" analogy
    - Identify the purpose of links and joints in a robot model
    - Recognize a URDF file and describe its three main sections
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Write a complete URDF file with links, joints, inertia, visual, and collision elements
    - Use xacro macros to reduce duplication in robot descriptions
    - Load and visualize a URDF in Gazebo and RViz
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Explain the structural differences between URDF and SDF
    - Validate and convert between formats using `gz sdf -p`
    - Apply merge-link optimization for articulated chain performance
    - Compute inertia tensors analytically for common geometric primitives
  </TabItem>
</Tabs>

---

## The Robot Blueprint

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

An architect draws a blueprint before constructing a building. The blueprint shows every room, wall, door, and dimension — everything the builder needs to know. Without a blueprint, the builder has no idea what to construct.

A **robot description file** is the blueprint for a robot. It tells the simulator:
- What parts (links) the robot has — a base, an arm, a hand
- How those parts are connected (joints) — a revolute joint allows rotation; a prismatic joint allows sliding
- How heavy each part is (inertia) — important for realistic physics
- What the parts look like (visual geometry) — for 3D rendering
- What shape to use for collision detection (collision geometry) — often simpler than the visual shape

:::info[Key Term]
**URDF** (Unified Robot Description Format): An XML file format that describes a robot's physical structure, including links, joints, inertia, and visual/collision geometry. Used by ROS 2, Gazebo, and RViz.
:::

Think of a humanoid robot arm:
- **Links**: shoulder, upper_arm, forearm, wrist, hand
- **Joints**: shoulder_joint (3 DOF), elbow_joint (1 DOF), wrist_joint (2 DOF)
- The joints define how each link is connected to the next and what motion is allowed

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**A complete minimal URDF** for a one-joint arm:

```xml
<?xml version="1.0"?>
<robot name="simple_arm">

  <!-- BASE LINK (fixed to world) -->
  <link name="base_link">
    <inertial>
      <mass value="1.0"/>
      <origin xyz="0 0 0.05" rpy="0 0 0"/>
      <inertia ixx="0.0017" ixy="0" ixz="0"
               iyy="0.0017" iyz="0" izz="0.0008"/>
    </inertial>
    <visual>
      <origin xyz="0 0 0.05" rpy="0 0 0"/>
      <geometry><box size="0.1 0.1 0.1"/></geometry>
      <material name="grey"><color rgba="0.5 0.5 0.5 1"/></material>
    </visual>
    <collision>
      <origin xyz="0 0 0.05" rpy="0 0 0"/>
      <geometry><box size="0.1 0.1 0.1"/></geometry>
    </collision>
  </link>

  <!-- ARM LINK -->
  <link name="arm_link">
    <inertial>
      <mass value="0.5"/>
      <origin xyz="0 0 0.15" rpy="0 0 0"/>
      <inertia ixx="0.0040" ixy="0" ixz="0"
               iyy="0.0040" iyz="0" izz="0.0002"/>
    </inertial>
    <visual>
      <origin xyz="0 0 0.15" rpy="0 0 0"/>
      <geometry><cylinder radius="0.02" length="0.3"/></geometry>
      <material name="blue"><color rgba="0.2 0.2 0.8 1"/></material>
    </visual>
    <collision>
      <origin xyz="0 0 0.15" rpy="0 0 0"/>
      <geometry><cylinder radius="0.02" length="0.3"/></geometry>
    </collision>
  </link>

  <!-- JOINT connecting base to arm -->
  <joint name="shoulder_joint" type="revolute">
    <parent link="base_link"/>
    <child link="arm_link"/>
    <origin xyz="0 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>   <!-- rotates around Y axis -->
    <limit lower="-1.57" upper="1.57" effort="10.0" velocity="1.0"/>
    <dynamics damping="0.1" friction="0.01"/>
  </joint>

</robot>
```

**Joint types**:

| Type | Motion | Example |
|------|--------|---------|
| `revolute` | Rotation with limits | Elbow, knee |
| `continuous` | Unlimited rotation | Wheel |
| `prismatic` | Linear motion with limits | Linear actuator |
| `fixed` | No motion | Camera mount |
| `floating` | 6 DOF | Free-floating base |
| `planar` | 2D plane motion | Holonomic base |

**xacro macros** to reduce duplication:

```xml
<?xml version="1.0"?>
<robot name="modular_arm" xmlns:xacro="http://www.ros.org/wiki/xacro">

  <!-- Macro for a simple cylindrical link -->
  <xacro:macro name="arm_segment" params="name length radius mass parent xyz">
    <link name="${name}">
      <inertial>
        <mass value="${mass}"/>
        <origin xyz="0 0 ${length/2}"/>
        <inertia ixx="${mass*(3*radius**2 + length**2)/12}"
                 iyy="${mass*(3*radius**2 + length**2)/12}"
                 izz="${mass*radius**2/2}"
                 ixy="0" ixz="0" iyz="0"/>
      </inertial>
      <visual>
        <origin xyz="0 0 ${length/2}"/>
        <geometry><cylinder radius="${radius}" length="${length}"/></geometry>
      </visual>
      <collision>
        <origin xyz="0 0 ${length/2}"/>
        <geometry><cylinder radius="${radius}" length="${length}"/></geometry>
      </collision>
    </link>
    <joint name="${name}_joint" type="revolute">
      <parent link="${parent}"/>
      <child link="${name}"/>
      <origin xyz="${xyz}"/>
      <axis xyz="0 1 0"/>
      <limit lower="-1.57" upper="1.57" effort="10" velocity="1.0"/>
    </joint>
  </xacro:macro>

  <!-- Use the macro three times -->
  <link name="base_link"/>
  <xacro:arm_segment name="link1" length="0.3" radius="0.02" mass="0.5"
                     parent="base_link" xyz="0 0 0"/>
  <xacro:arm_segment name="link2" length="0.25" radius="0.018" mass="0.4"
                     parent="link1" xyz="0 0 0.3"/>
  <xacro:arm_segment name="link3" length="0.2" radius="0.015" mass="0.3"
                     parent="link2" xyz="0 0 0.25"/>
</robot>
```

**Load URDF in Gazebo**:

```bash
# Convert xacro → URDF → spawn in Gazebo
xacro my_robot.urdf.xacro > /tmp/my_robot.urdf
ros2 run ros_gz_sim create -name my_robot -file /tmp/my_robot.urdf
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**URDF vs SDF — structural differences**:

| Feature | URDF | SDF |
|---------|------|-----|
| Native to | ROS | Gazebo |
| Includes | No (flat file) | Yes (`<include>`) |
| Multiple models | No | Yes |
| World definition | No | Yes |
| Sensor definitions | Via Gazebo extensions | Native |
| Gazebo plugins | Via `<gazebo>` tag | Native `<plugin>` |
| Nested models | No | Yes |
| Light sources | No | Yes |

**SDF world with embedded robot model**:

```xml
<?xml version="1.0"?>
<sdf version="1.9">
  <world name="test_world">
    <physics type="ode">
      <max_step_size>0.001</max_step_size>
      <real_time_update_rate>1000</real_time_update_rate>
    </physics>

    <include>
      <uri>model://ground_plane</uri>
    </include>

    <model name="simple_arm">
      <pose>0 0 0 0 0 0</pose>
      <link name="base_link">
        <inertial><mass>1.0</mass></inertial>
        <visual name="vis">
          <geometry><box><size>0.1 0.1 0.1</size></box></geometry>
        </visual>
        <collision name="col">
          <geometry><box><size>0.1 0.1 0.1</size></box></geometry>
        </collision>
      </link>
      <joint name="shoulder" type="revolute">
        <parent>world</parent>
        <child>base_link</child>
        <axis><xyz>0 1 0</xyz><limit><lower>-1.57</lower><upper>1.57</upper></limit></axis>
      </joint>
    </model>
  </world>
</sdf>
```

**Inertia tensor for common primitives**:

For a solid cylinder of mass $m$, radius $r$, height $h$:

$$I_{xx} = I_{yy} = \frac{m(3r^2 + h^2)}{12}, \quad I_{zz} = \frac{mr^2}{2}$$

For a solid box of mass $m$, dimensions $l \times w \times h$:

$$I_{xx} = \frac{m(w^2+h^2)}{12}, \quad I_{yy} = \frac{m(l^2+h^2)}{12}, \quad I_{zz} = \frac{m(l^2+w^2)}{12}$$

Incorrect inertia values cause Gazebo instability. Always compute from the actual geometry.

**Validate and convert URDF → SDF**:

```bash
# Check URDF validity
check_urdf my_robot.urdf

# Convert URDF to SDF (Gazebo-native format)
gz sdf -p my_robot.urdf

# Validate an SDF file
gz sdf -k my_world.sdf
```

**Merge-link optimization**: For articulated chains with many fixed joints (e.g., a wrist assembly with 5 rigidly-connected links), Gazebo must simulate each link separately — increasing physics computation. The `merge_fixed_links` plugin collapses fixed-joint subtrees into single collision bodies:

```xml
<plugin filename="gz-sim-merge-links-system"
        name="gz::sim::systems::MergeLinks"/>
```

This can reduce physics simulation time by 30–60% for complex fixed-joint assemblies like finger bones in a robotic hand.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A six-joint robotic arm has joints named: `shoulder_pan`, `shoulder_lift`, `elbow`, `wrist_1`, `wrist_2`, `wrist_3`. Draw the kinematic tree (parent–child link relationships). Which joint type (revolute, prismatic, fixed, continuous) would you use for each?

2. Why does a URDF need both a `<visual>` and a `<collision>` geometry for each link? Why might these two shapes be different for the same physical part?

### Intermediate

3. Write a xacro file for a differential-drive mobile robot with: a `base_link` (box, 0.4×0.3×0.1 m, 5 kg), two `wheel_link`s (cylinder, r=0.1 m, h=0.05 m, 0.5 kg each) connected by `continuous` joints, and a `caster_link` (sphere, r=0.03 m, 0.1 kg) connected by a `fixed` joint. Compute all inertia tensors.

4. You load your URDF into Gazebo and the robot immediately explodes (links fly apart). List the three most common causes of this behavior and how you would diagnose each using `gz topic -e` commands.

### Advanced

5. Compute the full 3×3 inertia tensor (including off-diagonal terms) for a thin uniform rod of mass $m$ and length $L$ rotated 45° from the z-axis in the xz-plane, about the rod's center of mass. Show the parallel-axis theorem step if computing about the link origin.

6. Design an SDF file for a two-fingered gripper where each finger has 3 phalanx links connected by `revolute` joints. Use the merge-link plugin to collapse the distal and middle phalanges into single rigid bodies. Quantify (with a calculation) the reduction in simulated bodies and expected physics speedup.
