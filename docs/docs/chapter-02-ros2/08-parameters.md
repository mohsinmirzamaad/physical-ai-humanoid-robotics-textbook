---
sidebar_position: 9
sidebar_label: "Parameter Management"
title: "Parameter Management"
description: "ROS 2 parameter management: declare_parameter, get_parameter, YAML files, dynamic reconfigure, parameter events, and atomic parameter updates."
keywords: [ROS 2 parameters, declare_parameter, get_parameter, YAML, dynamic reconfigure, parameter events, rcl_interfaces, ros2 param]
audience_tiers: [beginner, intermediate, advanced]
week: 5
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Parameter Management

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain what a parameter is using the settings dial analogy
    - Read and write parameters using the `ros2 param` CLI
    - Understand what a YAML parameter file is for
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Declare, get, and set parameters in a rclpy node
    - Load parameter values from a YAML file at launch
    - Register a parameter change callback to react dynamically
    - Use the `ros2 param` CLI for runtime inspection and modification
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Subscribe to the parameter events topic for system-wide change monitoring
    - Use `SetParametersAtomically` for safe multi-parameter updates
    - Implement parameter validation with descriptors and ranges
    - Migrate ROS 1 dynamic_reconfigure patterns to ROS 2
  </TabItem>
</Tabs>

---

## What Is a Parameter?

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Imagine a robot vacuum cleaner. It has knobs on the back: one for suction strength, one for edge sensitivity, one for the schedule. You can turn these knobs to change how the vacuum behaves without opening it up and rewiring anything.

A **ROS 2 parameter** is a node's settings dial — a named value that controls how a node behaves, which can be changed without restarting or modifying the code.

:::info[Key Term]
**Parameter**: A named, typed configuration value associated with a specific node. Parameters can be read at startup from YAML files and changed at runtime via the `ros2 param` CLI or other nodes.
:::

Examples of parameters in a real robot:
- `max_speed: 1.5` — maximum allowed velocity in m/s
- `camera_topic: /front_camera/image` — which camera topic to subscribe to
- `object_confidence_threshold: 0.85` — minimum confidence to report a detection
- `pid_gain_p: 2.0` — proportional gain for a PID controller

Parameters make nodes **reusable**: the same node binary can control a slow research robot (low `max_speed`) or a fast industrial robot (high `max_speed`) just by changing parameters.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Declaring and using parameters in Python**:

```python
from rclpy.node import Node
from rcl_interfaces.msg import ParameterDescriptor, FloatingPointRange

class PIDController(Node):
    def __init__(self):
        super().__init__('pid_controller')

        # Declare with descriptor for validation
        gain_desc = ParameterDescriptor(
            description='Proportional gain for the PID controller',
            floating_point_range=[FloatingPointRange(
                from_value=0.0, to_value=100.0, step=0.01)]
        )
        self.declare_parameter('kp', 1.0, gain_desc)
        self.declare_parameter('ki', 0.0)
        self.declare_parameter('kd', 0.1)
        self.declare_parameter('setpoint', 0.0)

    def compute_control(self, error, error_integral, error_derivative):
        kp = self.get_parameter('kp').get_parameter_value().double_value
        ki = self.get_parameter('ki').get_parameter_value().double_value
        kd = self.get_parameter('kd').get_parameter_value().double_value
        return kp * error + ki * error_integral + kd * error_derivative
```

**`ros2 param` CLI**:

```bash
ros2 param list /pid_controller          # list all parameters
ros2 param get /pid_controller kp        # read a parameter
ros2 param set /pid_controller kp 2.5    # set a parameter
ros2 param dump /pid_controller          # dump all params as YAML
ros2 param load /pid_controller params.yaml  # load from file
```

**YAML parameter file**:

```yaml
pid_controller:
  ros__parameters:
    kp: 2.0
    ki: 0.05
    kd: 0.2
    setpoint: 90.0
```

**Dynamic parameter callback**:

```python
from rcl_interfaces.msg import SetParametersResult

def __init__(self):
    # ... declare parameters ...
    self.add_on_set_parameters_callback(self.validate_params)

def validate_params(self, params):
    for param in params:
        if param.name == 'kp' and param.value < 0.0:
            return SetParametersResult(
                successful=False, reason='kp must be non-negative')
    # If validation passes, update internal state
    self._update_gains()
    return SetParametersResult(successful=True)
```

**Parameter types**:

| Python type | Parameter type | Example |
|-------------|---------------|---------|
| `bool` | `BOOL` | `use_gpu: true` |
| `int` | `INTEGER` | `queue_size: 10` |
| `float` | `DOUBLE` | `max_speed: 1.5` |
| `str` | `STRING` | `model_path: /models/v8.pt` |
| `bytes` | `BYTE_ARRAY` | Binary config data |
| `list[bool/int/float/str]` | `*_ARRAY` | `joint_limits: [1.5, 1.5, 2.0]` |

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Parameter events topic**: Every parameter change in the ROS 2 system is broadcast on `/parameter_events` as a `rcl_interfaces/ParameterEvent` message. This enables system-wide parameter monitoring:

```python
from rcl_interfaces.msg import ParameterEvent

class ParameterWatcher(Node):
    def __init__(self):
        super().__init__('param_watcher')
        self.sub = self.create_subscription(
            ParameterEvent, '/parameter_events',
            self.on_param_event, 10)

    def on_param_event(self, event: ParameterEvent):
        if event.node == '/pid_controller':
            for p in event.changed_parameters:
                self.get_logger().info(
                    f'{p.name} changed to {p.value}')
```

**Atomic multi-parameter set** via `rcl_interfaces/SetParametersAtomically` service:

```python
from rcl_interfaces.srv import SetParametersAtomically
from rcl_interfaces.msg import Parameter, ParameterValue, ParameterType

class AtomicSetter(Node):
    def __init__(self):
        super().__init__('atomic_setter')
        self.client = self.create_client(
            SetParametersAtomically,
            '/pid_controller/set_parameters_atomically')

    def set_gains_atomically(self, kp, ki, kd):
        req = SetParametersAtomically.Request()
        req.parameters = [
            Parameter(name='kp',
                      value=ParameterValue(type=ParameterType.PARAMETER_DOUBLE,
                                           double_value=kp)),
            Parameter(name='ki',
                      value=ParameterValue(type=ParameterType.PARAMETER_DOUBLE,
                                           double_value=ki)),
            Parameter(name='kd',
                      value=ParameterValue(type=ParameterType.PARAMETER_DOUBLE,
                                           double_value=kd)),
        ]
        future = self.client.call_async(req)
        future.add_done_callback(lambda f:
            self.get_logger().info(f'Atomic set: {f.result().result.successful}'))
```

Atomic sets are critical for coupled parameters: setting `kp` alone briefly leaves `ki` and `kd` at their old values, which can cause transient instability in a running PID controller.

**Parameter validation with descriptors**:

```python
from rcl_interfaces.msg import ParameterDescriptor, IntegerRange

self.declare_parameter('queue_depth', 10,
    ParameterDescriptor(
        description='Subscriber queue depth',
        integer_range=[IntegerRange(from_value=1, to_value=1000, step=1)],
        read_only=True  # cannot be changed after node starts
    )
)
```

`read_only=True` parameters are set at node startup (from launch args or YAML) and cannot be changed at runtime. Use this for structural parameters like topic names and queue depths where a runtime change would require reinitializing subscriptions.

**ROS 1 → ROS 2 migration**: `dynamic_reconfigure` from ROS 1 is replaced by ROS 2's parameter system. Key differences:
- No separate `.cfg` file — parameters are declared in code
- No `dynamic_reconfigure::Server` — use `add_on_set_parameters_callback`
- Parameters are first-class citizens of every node, not a separate plugin
- GUI tool: `rqt_reconfigure` works with ROS 2 parameters natively

> **Reference**: REP-132: ROS 2 Parameter Design. Available in the ROS Enhancement Proposals repository.

  </TabItem>
</Tabs>

---

## Parameter Patterns in Practice

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

The most common workflow with parameters:
1. Write default values in your node with `declare_parameter('name', default_value)`
2. Create a `config/params.yaml` file with your actual deployment values
3. Load the YAML in your launch file with `parameters=[params_yaml_path]`
4. Use `ros2 param set` to tune values at runtime during development

This workflow separates code from configuration — you never need to edit source code to change how the robot behaves in a new environment.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Best practices**:
- Always `declare_parameter` before `get_parameter` — calling `get_parameter` on an undeclared parameter raises `ParameterNotDeclaredException`
- Use `ParameterDescriptor` with ranges for parameters that have physical limits (speeds, gains, timeouts)
- Group related parameters using nested YAML (e.g., `perception.camera.fps`, `perception.camera.resolution`)
- Use `ros2 param dump` to snapshot the current configuration after tuning, then commit the YAML to version control

**Overriding parameters at launch**:

```bash
# Override individual parameters via CLI
ros2 run my_pkg my_node --ros-args -p kp:=3.0 -p kd:=0.05

# Load a YAML file and override one parameter
ros2 run my_pkg my_node --ros-args --params-file config/params.yaml -p kp:=3.0
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Parameter namespacing in multi-robot systems**: In a multi-robot deployment, each robot's nodes run under a namespace (e.g., `/robot_1/`). Parameter files can be structured to avoid conflicts:

```yaml
/robot_1/pid_controller:
  ros__parameters:
    kp: 2.0

/robot_2/pid_controller:
  ros__parameters:
    kp: 1.5  # different tuning for a different robot
```

**Persistent parameters**: ROS 2 has no built-in persistent parameter storage (unlike ROS 1's parameter server which persists until `roscore` exits). For persistent configuration, use `ros2 param dump` to save YAML and reload at startup via launch file. Third-party solutions like `ament_parameter_server` provide database-backed persistence for production deployments.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A robot has a maximum speed parameter `max_speed` with a default of `0.5` m/s. Write the `ros2 param set` command to change it to `1.2` m/s while the robot is running. What would happen if the node does not have a parameter change callback?

2. List three parameters that a camera node might have. For each, describe what type it should be (bool, int, float, string) and give a sensible default value.

### Intermediate

3. Write a complete `rclpy` node called `SafeDriver` that:
   - Declares `max_linear_speed` (float, default 0.5) and `max_angular_speed` (float, default 1.0)
   - Registers a parameter callback that rejects any speed greater than 2.0
   - Publishes a `Twist` using the current parameter values at 10 Hz

4. Create a YAML parameter file for a robot system with two nodes: `planner` (with parameters `planning_frequency: 5.0` and `goal_tolerance: 0.05`) and `controller` (with parameters `control_frequency: 100.0` and `kp: 2.0`, `ki: 0.1`, `kd: 0.5`). Write the `ros2 launch` command to load this file.

### Advanced

5. A PID controller node has three coupled gain parameters `kp`, `ki`, `kd`. Explain why setting them individually (three separate `ros2 param set` calls) is problematic during live operation. Implement the `SetParametersAtomically` client call that sets all three in one atomic transaction.

6. Design a parameter validation scheme for a safety-critical motor controller with the following constraints: `max_torque` ∈ [0, 50] Nm, `max_velocity` ∈ [0, 10] rad/s, and the constraint `max_torque × max_velocity ≤ 200 W` (power limit). Implement the `add_on_set_parameters_callback` that enforces all three constraints atomically, including the cross-parameter power constraint.
