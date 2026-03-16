---
sidebar_position: 2
sidebar_label: "Gazebo Setup"
title: "Gazebo Setup"
description: "Installing and launching Gazebo Harmonic, navigating the GUI, using gz topic and gz model CLI tools, and understanding the Gazebo plugin system architecture."
keywords: [Gazebo Harmonic, gz sim, gz topic, Gazebo plugins, SystemPlugin, headless rendering, real-time factor, robot simulation setup]
audience_tiers: [beginner, intermediate, advanced]
week: 6
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Gazebo Setup

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain what Gazebo does using the "virtual world" analogy
    - Launch a Gazebo simulation world from the terminal
    - Navigate the Gazebo GUI to inspect a running simulation
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Install Gazebo Harmonic and verify the installation
    - Launch a custom world from a Python ROS 2 launch file
    - Use `gz topic`, `gz model`, and `gz service` CLI tools to inspect a live simulation
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Explain the Gazebo plugin system (SystemPlugin, SensorPlugin, VisualPlugin)
    - Run Gazebo in headless mode for CI and server deployments
    - Monitor and tune the real-time factor for simulation performance
  </TabItem>
</Tabs>

---

## What Is Gazebo?

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Imagine a Hollywood movie studio. Before filming an expensive car crash scene, the studio builds a digital virtual set: the cars exist only as computer models, the physics of the crash are simulated, and the actors practice against green screens. No real car is destroyed. No person is in danger.

Gazebo is the **virtual studio for robots**. Instead of a real factory floor, a real humanoid, or a real Mars landscape, Gazebo creates a simulated world where:
- The robot exists as a 3D model with realistic mass and joints
- Gravity, friction, and collisions behave like the real world
- Sensors like cameras and LiDARs produce realistic (but fake) data
- Your ROS 2 code runs exactly as it will on the real robot

:::info[Key Term]
**Gazebo**: An open-source 3D robot simulator that models rigid body physics, sensors, and environments. The current version is **Gazebo Harmonic** (2023+), which supersedes the older "Gazebo Classic" (now end-of-life).
:::

**Why simulate before deploying?**
- A real robot fall can cost $50,000 in repairs
- Simulation runs 10× faster than real time — hours of robot operation in minutes
- You can test dangerous scenarios (fire, floods, cliff edges) without risk
- Automated CI pipelines can run thousands of test scenarios overnight

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Installing Gazebo Harmonic** on Ubuntu 24.04 (ROS 2 Jazzy):

```bash
# Add Gazebo apt repository
sudo apt-get update
sudo apt-get install curl lsb-release gnupg
sudo curl https://packages.osrfoundation.org/gazebo.gpg \
    --output /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] \
    http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" \
    | sudo tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null

sudo apt-get update
sudo apt-get install gz-harmonic

# Verify installation
gz sim --version
```

**Launch a built-in demo world**:

```bash
# Launch the empty world
gz sim empty.sdf

# Launch with a ground plane and shapes
gz sim shapes.sdf

# Launch without GUI (headless)
gz sim -s empty.sdf
```

**Key CLI tools**:

```bash
gz topic -l                          # list all active Gazebo topics
gz topic -e -t /world/empty/clock    # echo messages on a topic
gz model -m my_robot -p              # print model pose
gz service -l                        # list available services
gz service -s /world/empty/control   # call a service
```

**`gz topic` vs `ros2 topic`**: Gazebo has its own internal topic system (gz-transport) separate from ROS 2 DDS. The `ros_gz_bridge` package (Section 3.5) is what connects the two.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Gazebo Plugin Architecture**: Gazebo's behaviour is entirely driven by plugins — shared libraries loaded at runtime. There are four plugin types:

| Plugin Type | Interface | Purpose |
|-------------|-----------|---------|
| `SystemPlugin` | `gz::sim::System` | Implements world-level logic (physics stepping, ROS 2 bridge) |
| `ModelPlugin` | `gz::sim::System` | Per-model logic (custom actuator dynamics) |
| `SensorPlugin` | `gz::sensors::Sensor` | Sensor data generation (LiDAR, camera, IMU) |
| `VisualPlugin` | `gz::rendering::Visual` | Rendering effects (transparency, trails) |

**Plugin loading in SDF**:

```xml
<world name="my_world">
  <plugin filename="gz-sim-physics-system"
          name="gz::sim::systems::Physics"/>
  <plugin filename="gz-sim-user-commands-system"
          name="gz::sim::systems::UserCommands"/>
  <plugin filename="gz-sim-scene-broadcaster-system"
          name="gz::sim::systems::SceneBroadcaster"/>
</world>
```

**Headless mode** (no rendering, for CI):

```bash
# Server only — no GUI
gz sim -s -r my_world.sdf

# With a fixed step count (deterministic)
gz sim -s -r --iterations 1000 my_world.sdf
```

**Real-time factor (RTF)** measures how fast the simulation runs relative to real time:

$$\text{RTF} = \frac{\Delta t_{\text{sim}}}{\Delta t_{\text{wall}}}$$

An RTF of 1.0 means real-time; RTF > 1.0 means faster than real; RTF < 1.0 means the simulation is falling behind. Monitor RTF with:

```bash
gz topic -e -t /stats
# Look for: real_time_factor field
```

**Tuning for high RTF**: Reduce `max_contacts` in the physics plugin, increase `min_step_size`, and disable unused sensor plugins when not needed for a given test.

  </TabItem>
</Tabs>

---

## Launching Gazebo from ROS 2

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

When you use ROS 2 with Gazebo, you typically start both systems together with a single command — a **launch file** handles starting Gazebo, loading your robot, and starting the bridge to ROS 2 all at once. You will learn to write these in Section 3.5; for now, the key command is:

```bash
ros2 launch ros_gz_sim gz_sim.launch.py gz_args:="empty.sdf"
```

This starts Gazebo with an empty world, ready for your robot to be loaded into it.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Python ROS 2 launch file for Gazebo**:

```python
# my_robot_sim/launch/sim.launch.py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from ros_gz_sim.actions import GzServer

def generate_launch_description():
    world_arg = DeclareLaunchArgument(
        'world', default_value='empty.sdf',
        description='Gazebo world SDF file')

    gz_server = GzServer(
        world_sdf_file=LaunchConfiguration('world'),
        container_name='gz_server_container')

    spawn_robot = Node(
        package='ros_gz_sim',
        executable='create',
        arguments=[
            '-name', 'my_robot',
            '-file', '/path/to/my_robot.urdf',
            '-z', '0.5'],
        output='screen')

    return LaunchDescription([
        world_arg,
        gz_server,
        spawn_robot,
    ])
```

**Useful environment variables**:

```bash
export GZ_SIM_RESOURCE_PATH=/path/to/models   # model search path
export GZ_SIM_SYSTEM_PLUGIN_PATH=/path/to/plugins  # custom plugin path
export RMW_IMPLEMENTATION=rmw_fastrtps_cpp    # ensure DDS consistency
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Writing a custom SystemPlugin** that logs simulation step times:

```cpp
// my_plugin/src/StepLogger.cc
#include <gz/sim/System.hh>
#include <gz/sim/EntityComponentManager.hh>
#include <gz/sim/EventManager.hh>
#include <gz/plugin/Register.hh>
#include <chrono>
#include <iostream>

namespace my_plugin {

class StepLogger :
    public gz::sim::System,
    public gz::sim::ISystemPreUpdate,
    public gz::sim::ISystemPostUpdate
{
  std::chrono::steady_clock::time_point pre_time_;

public:
  void PreUpdate(const gz::sim::UpdateInfo &info,
                 gz::sim::EntityComponentManager &) override {
    pre_time_ = std::chrono::steady_clock::now();
  }

  void PostUpdate(const gz::sim::UpdateInfo &info,
                  const gz::sim::EntityComponentManager &) override {
    auto elapsed = std::chrono::steady_clock::now() - pre_time_;
    auto us = std::chrono::duration_cast<std::chrono::microseconds>(elapsed).count();
    if (us > 5000)  // warn if step takes > 5 ms
      std::cerr << "[StepLogger] Slow step: " << us << " µs\n";
  }
};

}  // namespace my_plugin

GZ_ADD_PLUGIN(my_plugin::StepLogger,
              gz::sim::System,
              gz::sim::ISystemPreUpdate,
              gz::sim::ISystemPostUpdate)
```

This pattern is the basis for all physics overrides, custom actuator models, and the `ros_gz_sim` bridge plugin itself.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. In your own words, explain why a robotics company would prefer to test a new walking algorithm in Gazebo before running it on a physical humanoid robot. Name at least three concrete risks that simulation eliminates.

2. Gazebo Harmonic replaced Gazebo Classic. What is the main reason the Gazebo project created a new version rather than continuing to update the Classic version? (Hint: look up "ignition gazebo rebrand".)

### Intermediate

3. Install Gazebo Harmonic on your system (or use a Docker container with `osrf/ros:jazzy-desktop`). Launch the `shapes.sdf` world and use `gz topic -l` to list all active topics. Identify which topic publishes the simulation clock and write the command to echo it.

4. Write a Python ROS 2 launch file that: (a) launches Gazebo with `empty.sdf`, (b) loads a URDF robot model named `test_robot` at position (0, 0, 0.3), and (c) starts the `ros_gz_bridge`. Use `DeclareLaunchArgument` for the world file path.

### Advanced

5. The real-time factor of your simulation drops to 0.3 when you add 10 robot models, each with 6 joints. Describe three concrete tuning strategies (with specific SDF or launch file parameters) to recover an RTF ≥ 0.9 without removing models.

6. Write a minimal Gazebo `SystemPlugin` in C++ that: (a) subscribes to the `/world/<world_name>/dynamic_pose/info` topic using `gz::transport::Node`, (b) computes the angular velocity magnitude of a specific link, and (c) publishes a warning to `/my_plugin/warnings` if the magnitude exceeds a threshold. Show the CMakeLists.txt entries needed to build and install the plugin.
