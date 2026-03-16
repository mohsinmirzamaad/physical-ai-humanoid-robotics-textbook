---
sidebar_position: 5
sidebar_label: "Services"
title: "Services"
description: "ROS 2 services: the request/response communication pattern, .srv IDL files, synchronous and asynchronous service clients, and DDS-RPC internals."
keywords: [ROS 2 services, service server, service client, srv file, DDS-RPC, synchronous, asynchronous, rclpy]
audience_tiers: [beginner, intermediate, advanced]
week: 4
chapter: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Services

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain the service pattern using the phone call analogy
    - Identify when to use a service versus a topic
    - Use `ros2 service call` from the command line
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Implement a service server and client in Python using rclpy
    - Define a custom `.srv` interface file
    - Choose between synchronous and asynchronous service calls and explain the tradeoffs
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Describe how DDS-RPC maps services onto RTPS topics
    - Analyze deadlock conditions in single-threaded executors with blocking service calls
    - Formally specify a service SLA using availability, latency, and consistency properties
  </TabItem>
</Tabs>

---

## The Request/Response Pattern

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Topics are like radio broadcasts: the publisher sends data without waiting for a response. But sometimes you need a two-way conversation.

Think of a **phone call**. You dial a number, someone answers, you ask a question, they reply, and the call ends. You wait for their answer before doing anything else.

A **ROS 2 service** works the same way:
- A **service server** waits for calls (like someone with a phone waiting for it to ring)
- A **service client** makes a request and waits for a response (like you dialing and waiting)
- Each call has a **request** (what you asked) and a **response** (the answer you received)

:::info[Key Term]
**Service**: A ROS 2 communication pattern for one-to-one, request/response interactions. Unlike topics, services are synchronous: the caller waits for the response before continuing.
:::

**When to use a service instead of a topic**:
- You need a specific answer to a specific question: "What is the robot's battery level?"
- You want to trigger a one-time action and confirm it succeeded: "Save the current map."
- You need to configure a component: "Set the camera exposure to 10 ms."

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

A service is defined by a `.srv` file with request and response fields separated by `---`:

```
# my_pkg/srv/SetExposure.srv
float32 exposure_ms     # request field
---
bool success            # response fields
string message
```

**Service server in Python**:

```python
from rclpy.node import Node
from my_pkg.srv import SetExposure

class CameraServer(Node):
    def __init__(self):
        super().__init__('camera_server')
        self.srv = self.create_service(
            SetExposure, 'set_exposure', self.handle_set_exposure)

    def handle_set_exposure(self, request, response):
        if 0.1 <= request.exposure_ms <= 100.0:
            # apply setting to hardware
            response.success = True
            response.message = f'Exposure set to {request.exposure_ms} ms'
        else:
            response.success = False
            response.message = 'Exposure out of range [0.1, 100.0] ms'
        return response
```

**Asynchronous service client** (preferred in rclpy — avoids blocking the executor):

```python
class CameraClient(Node):
    def __init__(self):
        super().__init__('camera_client')
        self.client = self.create_client(SetExposure, 'set_exposure')
        while not self.client.wait_for_service(timeout_sec=1.0):
            self.get_logger().warn('Waiting for set_exposure service...')

    def call_async(self, exposure_ms: float):
        req = SetExposure.Request()
        req.exposure_ms = exposure_ms
        future = self.client.call_async(req)
        future.add_done_callback(self.response_callback)

    def response_callback(self, future):
        result = future.result()
        self.get_logger().info(f'Response: {result.success} — {result.message}')
```

**CLI commands**:

```bash
ros2 service list                                   # list all active services
ros2 service type /set_exposure                     # show service type
ros2 service call /set_exposure my_pkg/srv/SetExposure "{exposure_ms: 15.0}"
```

**Standard service types**:

| Type | Purpose |
|------|---------|
| `std_srvs/SetBool` | Enable/disable a component |
| `std_srvs/Trigger` | Trigger an action (no arguments) |
| `std_srvs/Empty` | No request, no response (fire-and-forget with confirmation) |

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**DDS-RPC over RTPS**: ROS 2 services are implemented as two paired DDS topics:
- Request topic: `/<service_name>Request` — published by the client, subscribed by the server
- Reply topic: `/<service_name>Reply` — published by the server, subscribed by the client

Each request message includes a `SampleIdentity` (GUID + sequence number) used by the server to route replies back to the correct client instance. This is OMG DDS-RPC v1.0 over RTPS, without a dedicated RPC protocol — purely built on top of pub/sub.

**Discovery timing**: When a client node starts, it must wait for the service server to be discovered via SEDP before calling. The worst-case wait time is bounded by the SPDP announcement period (default 100 ms in FastDDS) + one round trip. `wait_for_service()` polls this condition.

**Deadlock in single-threaded executors**: The `call()` method (synchronous, blocking) in `rclpy` should never be called from within a callback running on a `SingleThreadedExecutor`:

```
callback A starts → calls service.call() (blocks waiting for reply)
    → reply arrives, but executor cannot dispatch it (it's stuck in callback A)
    → deadlock
```

**Safe patterns**:
1. Use `call_async()` + `add_done_callback()` always in rclpy
2. Use a dedicated `MultiThreadedExecutor` with separate callback groups for the service client
3. Use `rclpy.spin_until_future_complete()` in a separate thread

**Formal service SLA**: A service $\mathcal{S}$ can be formally specified as:

$$\text{SLA}(\mathcal{S}) = (\alpha, L_{99}, C)$$

where:
- $\alpha$ = availability (fraction of time the service is up and responding)
- $L_{99}$ = 99th-percentile response latency
- $C$ = consistency guarantee (idempotent? at-most-once? at-least-once?)

ROS 2 services provide at-most-once delivery by default (no retry on timeout). For critical robot operations (e.g., "trigger emergency stop"), callers must implement their own retry + timeout logic with idempotency guarantees on the server.

  </TabItem>
</Tabs>

---

## Synchronous vs. Asynchronous Calls

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

When you use a phone, you can either:
1. **Wait on the line** until the other person answers (synchronous — you do nothing else)
2. **Leave a voicemail** and continue your day; they call back when ready (asynchronous)

Asynchronous calls are usually better for robots because the robot does not freeze while waiting for an answer. It can keep doing other things — reading sensors, moving joints — while waiting for the service response.

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

In rclpy, `call_async()` returns a `Future` object immediately. The executor continues spinning (processing other callbacks) until the future completes:

```python
# Pattern 1: callback-based (recommended)
future = self.client.call_async(request)
future.add_done_callback(lambda f: self.handle_result(f.result()))

# Pattern 2: spin until complete (useful in scripts, not in nodes)
future = self.client.call_async(request)
rclpy.spin_until_future_complete(node, future)
result = future.result()
```

Never use `call()` (the blocking synchronous version) inside a node callback — it will deadlock on a `SingleThreadedExecutor`.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**asyncio integration**: rclpy 0.19+ supports `await`-ing futures directly when running inside an asyncio event loop:

```python
import asyncio
from rclpy.executors import SingleThreadedExecutor

async def do_service_call(client, request):
    future = client.call_async(request)
    result = await asyncio.wrap_future(future)
    return result
```

This requires running the rclpy executor in a thread and bridging its `Future` objects to asyncio futures via `asyncio.wrap_future()` — they are not directly compatible since rclpy uses `concurrent.futures.Future` internally. The `rclpy.task.Future` class has been refactored in recent releases to be more compatible with asyncio patterns, but full native `async/await` support for service calls remains a work-in-progress in the rclpy API.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. For each scenario, decide whether a **topic** or a **service** is more appropriate. Explain your reasoning in one sentence each:
   - Streaming 200 Hz joint angle measurements from an encoder
   - Asking the robot "What is your current battery percentage?"
   - Sending a velocity command to the wheels 100 times per second
   - Requesting that the robot take a photo and save it to disk

2. Use `ros2 service call` syntax to write the command that would call a `/trigger_photo` service of type `std_srvs/srv/Trigger`.

### Intermediate

3. Implement a complete ROS 2 Python service server for a `GetBatteryLevel` service (define the `.srv` file yourself with a float response for voltage and an int response for percentage). The server should return a fixed voltage of `24.3` and percentage of `87`.

4. Your service client calls `call()` (blocking) from inside a timer callback. The executor is `SingleThreadedExecutor`. Explain step by step why this causes a deadlock. Show the corrected code using `call_async()` and a done callback.

### Advanced

5. Suppose a service server processes one request at a time (serialized). Requests arrive at rate $\lambda$ (requests/s) and each takes $\mu^{-1}$ seconds to process. Using M/D/1 queuing theory, derive the mean response latency as a function of server utilization $\rho = \lambda / \mu$. At what utilization does $L_{99}$ exceed 100 ms?

6. Design the `.srv` file and Python server implementation for an atomic "move joint to position" service that is idempotent (calling it twice with the same arguments has the same effect as calling it once). What state must the server maintain to guarantee idempotency?
