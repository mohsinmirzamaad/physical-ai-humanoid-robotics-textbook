---
sidebar_position: 8
sidebar_label: "Launch Files"
title: "Launch Files"
description: "ROS 2 launch files: Python launch API, LaunchDescription, Node, substitutions, event handlers, composable containers, and large-system decomposition patterns."
keywords: [ROS 2 launch, LaunchDescription, launch file, substitution, LaunchConfiguration, event handler, Nav2, composable container]
audience_tiers: [beginner, intermediate, advanced]
week: 5
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Launch Files

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain the orchestra conductor analogy for launch files
    - Describe what a launch file does for a multi-node robot system
    - Run a launch file with `ros2 launch`
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Write a Python launch file using `LaunchDescription` and `Node`
    - Use `LaunchConfiguration` and `DeclareLaunchArgument` for configurable launches
    - Include other launch files with `IncludeLaunchDescription`
    - Use `FindPackageShare` to locate package resources
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Use `RegisterEventHandler` for event-driven launch behavior
    - Launch composable node containers with pre-loaded components
    - Apply Nav2-style large-system decomposition using launch includes
    - Implement dynamic reconfiguration at launch time using conditions
  </TabItem>
</Tabs>

---

## The Conductor Analogy

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

An orchestra has 80 musicians, each an expert at their instrument. They all need to start at the same moment, play at the right speed, and follow the same score. The **conductor** coordinates everything: they give the downbeat to start, set the tempo, and cue each section when it is their turn.

A **ROS 2 launch file** is the conductor for your robot's software. A real robot might need 15 or 20 nodes running simultaneously — a camera driver, a LiDAR driver, an object detector, a state estimator, a planner, a controller, a safety monitor. Starting each one manually in a separate terminal would take minutes and be error-prone. The launch file starts them all at once, with the right arguments, in the right order.

:::info[Key Term]
**Launch file**: A Python script (or XML file) that describes which ROS 2 nodes to start, with what arguments, in what configuration. Run with `ros2 launch <package> <launch_file>`.
:::

```bash
# Start the entire robot system with one command:
ros2 launch my_robot_pkg robot.launch.py
```

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

A ROS 2 launch file is a Python module that returns a `LaunchDescription`:

```python
# my_robot_pkg/launch/robot.launch.py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration, FindExecutable
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
import os

def generate_launch_description():
    # Declare configurable arguments
    use_sim = DeclareLaunchArgument(
        'use_sim', default_value='false',
        description='Use simulation time')

    params_file = DeclareLaunchArgument(
        'params_file',
        default_value=os.path.join(
            FindPackageShare('my_robot_pkg').find('my_robot_pkg'),
            'config', 'robot_params.yaml'),
        description='Full path to parameter YAML file')

    # Define nodes
    camera_node = Node(
        package='my_robot_pkg',
        executable='camera_node',
        name='camera',
        namespace='robot',
        output='screen',
        parameters=[LaunchConfiguration('params_file')],
        remappings=[('/robot/image_raw', '/camera/image_raw')]
    )

    detector_node = Node(
        package='my_robot_pkg',
        executable='detector_node',
        name='object_detector',
        output='screen',
        parameters=[{'confidence_threshold': 0.7}]
    )

    return LaunchDescription([
        use_sim,
        params_file,
        camera_node,
        detector_node,
    ])
```

**Including another launch file**:

```python
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource

nav2_launch = IncludeLaunchDescription(
    PythonLaunchDescriptionSource([
        FindPackageShare('nav2_bringup'), '/launch/navigation_launch.py'
    ]),
    launch_arguments={
        'use_sim_time': LaunchConfiguration('use_sim'),
        'params_file': LaunchConfiguration('params_file'),
    }.items()
)
```

**Running with argument overrides**:

```bash
ros2 launch my_robot_pkg robot.launch.py use_sim:=true params_file:=/path/to/custom.yaml
```

**Key substitution types**:

| Substitution | Purpose |
|-------------|---------|
| `LaunchConfiguration('name')` | Read a declared launch argument |
| `FindPackageShare('pkg')` | Find a package's share directory |
| `PathJoinSubstitution([...])` | Join path components |
| `EnvironmentVariable('VAR')` | Read an env variable |
| `PythonExpression(['...'])` | Evaluate a Python expression |

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Event handlers** enable dynamic launch behavior based on process events:

```python
from launch.actions import RegisterEventHandler, EmitEvent
from launch.event_handlers import OnProcessExit, OnProcessStart
from launch.events import Shutdown

camera_node = Node(package='my_pkg', executable='camera_node')

# If camera_node exits unexpectedly, shut down everything
safety_handler = RegisterEventHandler(
    OnProcessExit(
        target_action=camera_node,
        on_exit=[EmitEvent(event=Shutdown(reason='Camera node died'))]
    )
)

# When camera starts, log a message and start the detector
startup_handler = RegisterEventHandler(
    OnProcessStart(
        target_action=camera_node,
        on_start=[
            LogInfo(msg='Camera started, launching detector...'),
            detector_node  # start this node after camera is up
        ]
    )
)
```

**Composable node container launch**:

```python
from launch_ros.actions import ComposableNodeContainer
from launch_ros.descriptions import ComposableNode

container = ComposableNodeContainer(
    name='perception_container',
    namespace='',
    package='rclcpp_components',
    executable='component_container',
    composable_node_descriptions=[
        ComposableNode(
            package='my_pkg',
            plugin='my_pkg::CameraComponent',
            name='camera',
            extra_arguments=[{'use_intra_process_comms': True}]
        ),
        ComposableNode(
            package='my_pkg',
            plugin='my_pkg::DetectorComponent',
            name='detector',
            extra_arguments=[{'use_intra_process_comms': True}]
        ),
    ],
    output='screen',
)
```

Both nodes share one process and one executor. With `use_intra_process_comms=True`, messages between them are passed as shared pointers — zero serialization, zero copies.

**Launch conditions** for conditional node startup:

```python
from launch.conditions import IfCondition, UnlessCondition

sim_node = Node(
    package='my_pkg', executable='sim_driver',
    condition=IfCondition(LaunchConfiguration('use_sim'))
)
real_node = Node(
    package='my_pkg', executable='real_driver',
    condition=UnlessCondition(LaunchConfiguration('use_sim'))
)
```

**Nav2-style decomposition**: Nav2 decomposes its 15+ nodes into a hierarchy of launch files:

```
navigation_launch.py
  └─ includes: nav2_bringup/bringup_launch.py
       ├─ includes: nav2_common/lifecycle_launch.py
       ├─ Node: controller_server
       ├─ Node: planner_server
       ├─ Node: behavior_server
       ├─ Node: bt_navigator
       ├─ Node: lifecycle_manager (manages above nodes)
       └─ includes: slam_toolbox/online_async_launch.py
```

Each include passes `use_sim_time` and `params_file` through via `launch_arguments`. The `LifecycleManager` node is special: it calls lifecycle transitions on all managed nodes in order at startup and in reverse at shutdown.

  </TabItem>
</Tabs>

---

## Parameter YAML Files

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Instead of typing all parameters on the command line, you can put them in a YAML file:

```yaml
# config/robot_params.yaml
camera_node:
  ros__parameters:
    width: 1280
    height: 720
    fps: 30

detector_node:
  ros__parameters:
    confidence_threshold: 0.75
    model_path: /models/yolov8.pt
```

Then tell the launch file to use this file, and all parameters are loaded automatically. This makes it easy to have different parameter files for different robots or different environments (lab vs. field).

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

Load a YAML parameter file in a launch `Node`:

```python
Node(
    package='my_pkg',
    executable='my_node',
    parameters=['/path/to/params.yaml',  # from file
                {'extra_param': 42}]     # plus inline overrides
)
```

The `parameters` list is merged: later entries override earlier ones. This pattern allows a base YAML file with defaults and inline overrides for deployment-specific values.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Global parameter files**: A YAML file with `/**` as the node name applies to all nodes:

```yaml
/**:
  ros__parameters:
    use_sim_time: false
```

**Wildcard namespace matching**: `/**/my_node` matches any node named `my_node` in any namespace. This is useful for multi-robot deployments where all robot instances share the same base parameters but differ in robot-specific overrides.

**Substitution in parameter values** is not supported directly in YAML — parameter values are always literals. For dynamic paths, use `PythonExpression` substitutions in the launch file or environment variable expansion in the YAML loader (available in some ROS 2 distros via `$(env VAR)` syntax in YAML).

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. You have three nodes: `sensor_node`, `processor_node`, and `actuator_node`. Write a minimal launch file (you do not need real package names) that starts all three. They should all print their output to the screen.

2. What is the advantage of a launch file over starting each node in a separate terminal manually? Name at least three concrete benefits.

### Intermediate

3. Write a launch file for a mobile robot that:
   - Declares two launch arguments: `robot_name` (default: `"my_robot"`) and `use_sim` (default: `"false"`)
   - Starts `lidar_node` in the `/<robot_name>` namespace
   - Starts `navigation_node` only if `use_sim` is `"false"`
   - Loads parameters from `config/robot_params.yaml`

4. Explain what `FindPackageShare('my_pkg')` does and why it is preferred over hardcoded paths like `/home/user/ros2_ws/src/my_pkg/`.

### Advanced

5. Design an event-driven launch file for a safety-critical robot that:
   - Starts a `safety_monitor_node`
   - Only starts `motion_controller_node` after `safety_monitor_node` has started (use `OnProcessStart`)
   - If `safety_monitor_node` exits for any reason, immediately shuts down `motion_controller_node` and emits a `Shutdown` event

6. Compare the startup latency of launching 10 nodes as separate processes versus as composable nodes in one container. What are the memory and IPC latency tradeoffs? Under what workload profile would composable nodes be strictly superior?
