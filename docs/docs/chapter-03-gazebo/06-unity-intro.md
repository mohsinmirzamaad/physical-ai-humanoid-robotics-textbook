---
sidebar_position: 7
sidebar_label: "Unity Robotics Intro"
title: "Unity Robotics: Visualization and Simulation"
description: "Introduction to Unity Robotics Hub: URDF Importer, ROS–TCP Connector, custom message generation, and Unity as a photorealistic sim-to-real transfer platform for robot development."
keywords: [Unity Robotics Hub, URDF Importer, ROS-TCP Connector, TCP Endpoint, Unity robot simulation, sim-to-real, photorealistic rendering, custom ROS messages Unity]
audience_tiers: [beginner, intermediate, advanced]
week: 7
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Unity Robotics: Visualization and Simulation

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain what Unity is and why roboticists use it alongside Gazebo
    - Identify the key components of the Unity Robotics Hub
    - Describe one scenario where Unity's rendering quality gives an advantage over Gazebo
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Install the Unity Robotics Hub packages via Unity Package Manager
    - Import a URDF robot model into Unity using the URDF Importer
    - Configure the ROS–TCP Connector and send a `Twist` message from Unity to ROS 2
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Configure the ROS–TCP Endpoint server for bidirectional communication
    - Generate custom ROS 2 message C# bindings from `.msg` files
    - Analyze the latency profile of the Unity→TCP→ROS 2 communication path
    - Design a photorealistic domain randomization pipeline for sim-to-real transfer
  </TabItem>
</Tabs>

---

## Unity as a Robotics Platform

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

You have seen Gazebo — a physics-first simulator where robot behavior is the priority and the graphics are functional but not photorealistic. Now meet **Unity** — originally built for video games, now used extensively in robotics for scenarios where visual realism matters more than physics fidelity.

Think of the difference between a **car crash safety test** and a **driver training simulator**:
- The crash test (Gazebo) needs accurate physics — forces, deformation, collision dynamics
- The driver trainer (Unity) needs a realistic visual environment — the driver must feel like they're really on a highway

Roboticists use Unity when they need:
- **Photorealistic images** for training computer vision models
- **Domain randomization** — randomly changing lighting, textures, and object positions to make AI models more robust
- **Visualization** — presenting a robot's behavior to stakeholders in a compelling 3D environment

:::info[Key Term]
**Unity Robotics Hub**: A collection of open-source Unity packages from Unity Technologies that provide tools for importing URDF robot models, communicating with ROS 2, and building robotics simulations in Unity.
:::

**Gazebo vs Unity — when to use which**:
- **Gazebo**: Physics accuracy, sensor simulation, ROS 2 integration, open-source, no license cost
- **Unity**: Photorealistic rendering, computer vision training data, visual showcases, commercial support

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Installing Unity Robotics Hub** (Unity 2022 LTS):

1. Open Unity Package Manager: `Window → Package Manager`
2. Click `+` → `Add package from git URL`
3. Add these three packages in order:

```
https://github.com/Unity-Technologies/ROS-TCP-Connector.git?path=/com.unity.robotics.ros-tcp-connector
https://github.com/Unity-Technologies/URDF-Importer.git?path=/com.unity.robotics.urdf-importer
https://github.com/Unity-Technologies/Unity-Robotics-Hub.git?path=/com.unity.robotics.visualizations
```

**Importing a URDF robot**:

1. Copy your `my_robot.urdf` and mesh files into `Assets/URDF/my_robot/`
2. Right-click the URDF file in Unity Project window
3. Select `Import Robot from Selected URDF File`
4. Configure: `Axis Type = Y Axis` (Unity uses Y-up vs ROS Z-up)
5. Click `Import URDF`

Unity creates a GameObject hierarchy matching your URDF link/joint tree, with `ArticulationBody` components on each link for physics simulation.

**Setting up ROS–TCP Connector** (Unity side):

```csharp
// In Unity: Edit → Project Settings → ROS Settings
// ROS IP Address: 127.0.0.1 (or your ROS machine IP)
// ROS Port: 10000

// Attach ROSConnection component to any GameObject
// Then publish a Twist message:
using RosMessageTypes.Geometry;
using Unity.Robotics.ROSTCPConnector;

public class RobotController : MonoBehaviour
{
    ROSConnection ros;
    const string topicName = "/cmd_vel";

    void Start()
    {
        ros = ROSConnection.GetOrCreateInstance();
        ros.RegisterPublisher<TwistMsg>(topicName);
    }

    void Update()
    {
        if (Input.GetKey(KeyCode.W))
        {
            TwistMsg msg = new TwistMsg();
            msg.linear.x = 0.5;   // 0.5 m/s forward
            ros.Publish(topicName, msg);
        }
    }
}
```

**Starting the ROS–TCP Endpoint** (ROS 2 side):

```bash
# Install the endpoint
pip install ros-tcp-endpoint

# Or via apt (ROS 2 Jazzy)
sudo apt install ros-jazzy-ros-tcp-endpoint

# Launch the TCP server
ros2 run ros_tcp_endpoint default_server_endpoint --ros-args \
    -p ROS_IP:=127.0.0.1 \
    -p ROS_TCP_PORT:=10000
```

Once running, Unity publishes to `/cmd_vel` appear as standard ROS 2 topic messages.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Generating custom ROS 2 message C# bindings**:

Unity Robotics Hub provides a message generation tool that converts `.msg` files to C# classes:

```bash
# Clone the message generation tool
cd ~/unity_project
python3 -m pip install rospkg catkin-pkg

# Generate C# from a custom .msg file
cd /path/to/unity_project
python3 Assets/RosMessages/generate_messages.py \
    --msg my_pkg/msg/Detection.msg \
    --out Assets/RosMessages/My_pkg/msg/

# This creates: DetectionMsg.cs with proper serialization
```

The generated `DetectionMsg.cs` implements `Unity.Robotics.ROSTCPConnector.MessageTypes.IMessage` and can be used identically to built-in message types.

**Latency profile** — Unity → TCP → ROS 2:

| Segment | Typical Latency | Bottleneck |
|---------|----------------|------------|
| Unity C# Publish() call | 0.05 ms | None |
| TCP socket write | 0.1–0.5 ms | Nagle algorithm (disable with `TCP_NODELAY`) |
| Network transport (loopback) | 0.01–0.1 ms | OS kernel |
| ROS–TCP Endpoint deserialize | 0.5–2 ms | Python overhead |
| ROS 2 DDS publish | 0.1 ms | FastDDS |
| ROS 2 subscriber callback | 0.1–1 ms | Executor |
| **Total** | **0.8–4 ms** | TCP Endpoint Python |

For real-time control from Unity, the Python TCP endpoint becomes a bottleneck above ~200 Hz. The C++ endpoint (`ros_tcp_endpoint_cpp`, experimental) reduces this to under 0.5 ms total.

**Domain randomization pipeline** for sim-to-real transfer:

```csharp
using UnityEngine;
using Unity.Robotics.ROSTCPConnector;

public class DomainRandomizer : MonoBehaviour
{
    [SerializeField] Light mainLight;
    [SerializeField] Material[] floorMaterials;
    [SerializeField] Renderer floorRenderer;

    public void Randomize()
    {
        // Randomize lighting
        mainLight.intensity = Random.Range(0.3f, 2.0f);
        mainLight.color = Color.HSVToRGB(
            Random.Range(0.05f, 0.15f),  // warm to cool
            Random.Range(0.0f, 0.3f),
            1.0f);

        // Randomize floor texture
        floorRenderer.material = floorMaterials[
            Random.Range(0, floorMaterials.Length)];

        // Randomize camera pose (within bounds)
        Camera.main.transform.position += new Vector3(
            Random.Range(-0.05f, 0.05f),
            Random.Range(-0.02f, 0.02f),
            Random.Range(-0.05f, 0.05f));
    }
}
```

This pattern, combined with rendering thousands of images per hour, produces training datasets that generalize to real-world sensor variations — a technique used by OpenAI (Dactyl), NVIDIA (Isaac Gym), and Boston Dynamics for training manipulation policies.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A robotics startup is training a neural network to detect bolts on a factory floor. They want to generate 100,000 labeled images. Would you recommend Gazebo or Unity for generating this training dataset? Justify your answer based on the capabilities of each tool.

2. Unity uses a Y-up coordinate system; ROS 2 uses a Z-up coordinate system. When importing a URDF robot that is designed for ROS 2 into Unity, what visual problem would you expect if the coordinate system mismatch is not handled? How does the URDF Importer handle this?

### Intermediate

3. Write a Unity C# script that subscribes to the `/scan` topic (`LaserScanMsg`) and visualizes the scan points as red spheres in the Unity scene, with each sphere positioned at the correct 2D location relative to the robot's position. Use `ROSConnection.Subscribe<LaserScanMsg>()`.

4. You want to control a Unity robot from a ROS 2 joystick node that publishes `sensor_msgs/Joy`. Describe the full setup: (a) what Unity packages to install, (b) how to generate C# bindings for `JoyMsg`, (c) how to start the TCP endpoint, and (d) the Unity C# subscription code.

### Advanced

5. You are running the ROS–TCP Endpoint Python server and observing 8 ms round-trip latency for `cmd_vel` messages at 50 Hz. Identify three specific causes (with the relevant code location or configuration) and propose fixes to reduce latency below 2 ms.

6. Design a domain randomization experiment for training a bin-picking robot vision model. Specify: (a) which visual parameters to randomize (with ranges derived from real-world measurement uncertainty), (b) how many images per parameter configuration, (c) how to validate that the trained model actually transfers to the real robot, and (d) what Unity Perception package components (Perception Camera, Label Config, Randomizer) you would use to automate the dataset generation pipeline.
