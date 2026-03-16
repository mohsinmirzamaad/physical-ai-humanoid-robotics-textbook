---
sidebar_position: 7
sidebar_label: "Programming with rclpy"
title: "Programming with rclpy"
description: "Practical rclpy programming: Hello Robot node, publishers, subscribers, timers, parameters, composable nodes, intra-process communication, and asyncio integration."
keywords: [rclpy, Python, ROS 2 programming, composable nodes, intra-process, parameters, timers, lifecycle, asyncio]
audience_tiers: [beginner, intermediate, advanced]
week: 5
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Programming with rclpy

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Write and run a "Hello Robot" node that logs a message and spins
    - Understand the structure of a minimal rclpy node (init, class, main)
    - Run a node with `ros2 run`
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Write a complete publisher node with a timer callback
    - Write a subscriber node with a custom QoS profile
    - Declare and read parameters in a node
    - Invoke a node with `ros2 run` and override parameters from the CLI
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Implement a composable node and load it into a `ComponentManager`
    - Enable intra-process communication for zero-copy message passing
    - Perform lifecycle transitions in code using `lifecycle_msgs`
    - Integrate rclpy with Python's `asyncio` event loop
  </TabItem>
</Tabs>

---

## Hello Robot

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Every programming tutorial starts with "Hello World." In ROS 2, "Hello Robot" means a node that starts up, says something, and keeps running:

```python
import rclpy
from rclpy.node import Node

class HelloRobot(Node):
    def __init__(self):
        # 'hello_robot' is the node's name in the ROS 2 network
        super().__init__('hello_robot')
        self.get_logger().info('Hello, Robot! I am alive.')
        # Fire a timer every 2 seconds
        self.timer = self.create_timer(2.0, self.say_hello)

    def say_hello(self):
        self.get_logger().info('Still running...')

def main():
    rclpy.init()                    # start the rclpy library
    node = HelloRobot()             # create our node
    rclpy.spin(node)                # run until Ctrl+C
    node.destroy_node()             # clean up
    rclpy.shutdown()                # shut down the library

if __name__ == '__main__':
    main()
```

To run this node (assuming it is installed in a package called `my_robot`):

```bash
source /opt/ros/humble/setup.bash
ros2 run my_robot hello_robot
```

You should see:
```
[INFO] [hello_robot]: Hello, Robot! I am alive.
[INFO] [hello_robot]: Still running...
[INFO] [hello_robot]: Still running...
```

:::tip[Beginner Tip]
`rclpy.spin(node)` is like pressing "play" on a music player. It keeps the program running and responding to events (timer ticks, incoming messages) until you press Ctrl+C.
:::

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Full publisher node** — publishes velocity commands at 10 Hz:

```python
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from geometry_msgs.msg import Twist

class VelocityPublisher(Node):
    def __init__(self):
        super().__init__('velocity_publisher')

        # Declare a parameter with a default value
        self.declare_parameter('linear_speed', 0.5)
        self.declare_parameter('angular_speed', 0.0)

        qos = QoSProfile(
            reliability=ReliabilityPolicy.RELIABLE,
            history=HistoryPolicy.KEEP_LAST,
            depth=10
        )
        self.pub = self.create_publisher(Twist, '/cmd_vel', qos)
        self.timer = self.create_timer(0.1, self.publish_cmd)  # 10 Hz
        self.get_logger().info('VelocityPublisher started')

    def publish_cmd(self):
        linear = self.get_parameter('linear_speed').get_parameter_value().double_value
        angular = self.get_parameter('angular_speed').get_parameter_value().double_value
        msg = Twist()
        msg.linear.x = linear
        msg.angular.z = angular
        self.pub.publish(msg)

def main():
    rclpy.init()
    node = VelocityPublisher()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()
```

**Run with parameter override**:

```bash
ros2 run my_pkg velocity_publisher --ros-args -p linear_speed:=0.3 -p angular_speed:=0.1
```

**Full subscriber node** — subscribes to joint states:

```python
from sensor_msgs.msg import JointState
from rclpy.qos import qos_profile_sensor_data

class JointMonitor(Node):
    def __init__(self):
        super().__init__('joint_monitor')
        self.sub = self.create_subscription(
            JointState, '/joint_states',
            self.joint_callback, qos_profile_sensor_data)

    def joint_callback(self, msg: JointState):
        for name, pos in zip(msg.name, msg.position):
            self.get_logger().debug(f'{name}: {pos:.4f} rad')
```

**Parameter callbacks** (react when parameters change at runtime):

```python
from rcl_interfaces.msg import SetParametersResult

class AdaptiveNode(Node):
    def __init__(self):
        super().__init__('adaptive')
        self.declare_parameter('gain', 1.0)
        self.add_on_set_parameters_callback(self.param_callback)

    def param_callback(self, params):
        for p in params:
            if p.name == 'gain' and p.value < 0:
                return SetParametersResult(successful=False,
                                           reason='gain must be non-negative')
        return SetParametersResult(successful=True)
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Composable nodes** allow multiple nodes to share a process and executor, enabling intra-process communication:

```python
# my_pkg/camera_component.py
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image

class CameraComponent(Node):
    def __init__(self, **kwargs):
        super().__init__('camera', **kwargs)
        self.pub = self.create_publisher(
            Image, '/camera/image',
            rclpy.qos.qos_profile_sensor_data,
            use_intra_process_comms=True  # enable zero-copy
        )
```

Register in `setup.py`:

```python
entry_points={
    'ros2component.ComponentManager': [
        'CameraComponent = my_pkg.camera_component:CameraComponent',
    ],
}
```

Load at runtime:

```bash
ros2 component load /ComponentManager my_pkg my_pkg::CameraComponent
```

**Lifecycle transitions in code**:

```python
from lifecycle_msgs.srv import ChangeState
from lifecycle_msgs.msg import Transition

class LifecycleController(Node):
    def __init__(self):
        super().__init__('lifecycle_controller')
        self.client = self.create_client(
            ChangeState, '/camera_driver/change_state')

    def activate_camera(self):
        req = ChangeState.Request()
        req.transition = Transition(id=Transition.TRANSITION_ACTIVATE)
        future = self.client.call_async(req)
        future.add_done_callback(lambda f:
            self.get_logger().info(f'Activate result: {f.result().success}'))
```

**asyncio integration**: rclpy can be run inside an asyncio event loop using `rclpy.executors.SingleThreadedExecutor` combined with `loop.run_in_executor`:

```python
import asyncio
import rclpy
from rclpy.executors import SingleThreadedExecutor

async def main_async():
    rclpy.init()
    node = MyNode()
    executor = SingleThreadedExecutor()
    executor.add_node(node)

    loop = asyncio.get_event_loop()
    # Run the rclpy executor in a thread pool, non-blocking for asyncio
    spin_future = loop.run_in_executor(None, executor.spin)

    # Do other async work here
    await asyncio.sleep(10)
    executor.shutdown()
    await spin_future
    rclpy.shutdown()

asyncio.run(main_async())
```

**Custom QoS profiles for real-time control**:

```python
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy, LivelinessPolicy
from rclpy.duration import Duration

control_qos = QoSProfile(
    reliability=ReliabilityPolicy.BEST_EFFORT,
    durability=DurabilityPolicy.VOLATILE,
    depth=1,  # keep only latest command
    deadline=Duration(nanoseconds=2_000_000),     # 2 ms = 500 Hz
    liveliness=LivelinessPolicy.MANUAL_BY_TOPIC,
    liveliness_lease_duration=Duration(nanoseconds=10_000_000)  # 10 ms
)
```

  </TabItem>
</Tabs>

---

## Package Structure

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

A ROS 2 Python package has this structure:

```
my_robot_pkg/
├── my_robot_pkg/
│   ├── __init__.py
│   └── hello_robot.py
├── resource/
│   └── my_robot_pkg
├── package.xml
└── setup.py
```

The `package.xml` declares the package name and its dependencies. The `setup.py` registers the node entry points so that `ros2 run my_robot_pkg hello_robot` knows which function to call.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

`setup.py` entry points:

```python
from setuptools import setup

setup(
    name='my_robot_pkg',
    packages=['my_robot_pkg'],
    install_requires=['setuptools'],
    entry_points={
        'console_scripts': [
            'hello_robot = my_robot_pkg.hello_robot:main',
            'velocity_publisher = my_robot_pkg.velocity_publisher:main',
            'joint_monitor = my_robot_pkg.joint_monitor:main',
        ],
    },
)
```

Build and install:

```bash
cd ~/ros2_ws
colcon build --packages-select my_robot_pkg
source install/setup.bash
ros2 run my_robot_pkg hello_robot
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

For large packages, prefer ament_cmake with a Python extension using `ament_python_install_package()`, which installs the package into the install space correctly for both development and deployment workflows. Use `colcon build --symlink-install` during development to avoid rebuilding after every Python file edit.

For C++ composable nodes, declare the component using `rclcpp_components_register_node()` in `CMakeLists.txt`:

```cmake
rclcpp_components_register_node(
  camera_component
  PLUGIN "my_pkg::CameraComponent"
  EXECUTABLE camera_component_node
)
```

This generates both a standalone executable and a shared library loadable by `ComponentManager`.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. Write a complete rclpy node called `CounterNode` that increments an integer counter every second and logs the current count. It should start at 0 and count upward indefinitely. Include `main()`.

2. What does `rclpy.spin(node)` do? What would happen if you removed it and just created the node and called `rclpy.shutdown()` immediately?

### Intermediate

3. Extend `VelocityPublisher` to read its `linear_speed` and `angular_speed` parameters reactively using an `add_on_set_parameters_callback`. The callback should reject any speed values greater than 2.0 m/s for safety.

4. Write a node that both publishes and subscribes: it subscribes to `/joint_states`, extracts the position of the first joint, and republishes it on `/first_joint_position` as a `std_msgs/Float64`. Run it and verify with `ros2 topic echo /first_joint_position`.

### Advanced

5. Implement a composable node `ImageResizer` that subscribes to `/camera/image_raw` using intra-process communication, resizes the image (you may stub the actual resizing), and publishes to `/camera/image_resized` using intra-process communication. Explain what conditions must hold for the message to be passed as a pointer without any copies.

6. A control node must maintain strict 1 kHz timing using a rclpy timer. Measure the worst-case timer jitter on your system using a subscriber that timestamps each received message and computes the inter-arrival time variance. Propose a mitigation strategy using `StaticSingleThreadedExecutor` and a PREEMPT-RT kernel.
