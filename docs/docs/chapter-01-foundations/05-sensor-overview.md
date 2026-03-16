---
sidebar_position: 6
sidebar_label: "Sensor Systems Overview"
title: "Sensor Systems: Introduction"
description: "Overview of robot sensor modalities: proprioceptive vs. exteroceptive, active vs. passive, and the role of sensor fusion in Physical AI."
keywords: [sensors, sensor fusion, proprioceptive, exteroceptive, observation model, Bayes filter]
audience_tiers: [beginner, intermediate, advanced]
week: 2
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Sensor Systems: Introduction

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Match each robot sensor to the human sense it most resembles
    - Explain in plain language why robots need multiple sensors instead of just one
    - Name the four sensor modalities covered in this chapter
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Classify any sensor as proprioceptive or exteroceptive, and active or passive
    - Describe the output data type for each of the four modalities (image, point cloud, pose estimate, wrench)
    - Write a Python class skeleton implementing a typed sensor interface
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Define a sensor as a stochastic mapping $p(z | x)$ and interpret its role in a Bayes filter
    - Explain intrinsic vs. extrinsic calibration and why both are necessary
    - Derive the combined information matrix for two independent Gaussian sensors
  </TabItem>
</Tabs>

---

## The Robot's Senses

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Humans navigate the world using five senses. Robots need senses too — but robot senses are built from physics and electronics, not biology. The good news: you already understand most of them intuitively.

| Human sense | Robot equivalent | What it measures |
|-------------|-----------------|------------------|
| **Vision** | Camera | Light reflected from surfaces (color, texture, shape) |
| **Hearing** | Microphone / sonar | Sound waves (voice commands, echoes for distance) |
| **Balance** | IMU (Inertial Measurement Unit) | Acceleration and rotation — tells the robot "which way is down" |
| **Touch** | Force/Torque sensor | Forces and torques at contact points |
| **Echolocation** (like bats) | LiDAR | Distance to objects by timing laser pulses |

:::info[Key Term]
**LiDAR** (Light Detection and Ranging): A sensor that fires laser pulses and measures how long each pulse takes to bounce back from a surface. The time × speed of light gives the distance. Thousands of pulses per second build a 3D "map" of the environment.
:::

:::info[Key Term]
**IMU** (Inertial Measurement Unit): A sensor that measures how fast the robot is accelerating and rotating. It is essentially the same principle as the balance organ in your inner ear — if you spin around, your inner ear detects the rotation; an IMU does the same, electronically.
:::

**Why multiple sensors?** No single sensor does everything well:

- Cameras are great for recognizing objects but struggle in darkness or fog
- LiDAR gives precise 3D distances but cannot see color or read text
- IMUs respond instantly but drift over time (they accumulate errors)
- Force/torque sensors feel contact precisely but only at the point of attachment

Combining sensors — **sensor fusion** — lets robots compensate for each sensor's weakness with another's strength. Just as you use both your eyes and your ears to locate where a sound came from, a robot uses its camera and LiDAR together to navigate reliably.

:::info[Key Term]
**Sensor fusion**: Combining measurements from multiple sensors to produce a more accurate and complete estimate of the robot's state or environment than any single sensor could provide alone.
:::

**The four modalities we cover in this chapter**:

1. **LiDAR** — 3D point clouds for mapping and obstacle detection
2. **Cameras** — 2D or 3D images for visual perception and manipulation
3. **IMUs** — Orientation and velocity estimation for balance and navigation
4. **Force/Torque sensors** — Contact sensing for safe, dexterous interaction

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Sensor taxonomy**:

The two most important classification axes for robot sensors are:

**Axis 1: Proprioceptive vs. Exteroceptive**

| Type | Measures | Examples |
|------|----------|---------|
| Proprioceptive | The robot's own state | Joint encoders, IMU (at body center), motor current sensors |
| Exteroceptive | The external environment | Camera, LiDAR, microphone, F/T sensor at end-effector |

Note: An IMU attached to the robot's torso is proprioceptive (it measures body motion). An ultrasonic rangefinder looking outward is exteroceptive (it measures the distance to walls).

**Axis 2: Active vs. Passive**

| Type | How it works | Examples |
|------|-------------|---------|
| Active | Emits energy, measures the return | LiDAR (laser), radar (radio waves), ultrasonic (sound) |
| Passive | Measures ambient energy only | Camera (visible light), microphone (sound), thermometer |

Active sensors work in darkness (they create their own illumination) but can interfere with each other if multiple robots are in the same space. Passive sensors are cheap and interference-free but depend on ambient conditions.

**Output data types**:

| Sensor | Native output | Typical format | Typical rate |
|--------|--------------|----------------|-------------|
| Camera (RGB) | 2D pixel array | $(H \times W \times 3)$ uint8 | 30–120 Hz |
| Camera (RGB-D) | 2D pixel + depth | $(H \times W \times 4)$ float32 | 30–90 Hz |
| LiDAR | 3D point cloud | $(N \times 4)$ float32: $[x, y, z, \text{intensity}]$ | 10–20 Hz (spinning), 20–30 Hz (solid-state) |
| IMU | Linear accel + angular rate | $(6,)$ float32: $[a_x, a_y, a_z, \omega_x, \omega_y, \omega_z]$ | 100–1000 Hz |
| F/T sensor | 6-axis wrench | $(6,)$ float32: $[F_x, F_y, F_z, \tau_x, \tau_y, \tau_z]$ | 100–1000 Hz |

**Coordinate frames review**: Every sensor measurement is in the sensor's own frame $\mathcal{F}_S$. To use it, you must transform to the body frame $\mathcal{F}_B$ (via the extrinsic calibration transform $T_{BS}$) and then to the world frame $\mathcal{F}_W$ (via the robot's current pose $T_{WB}$).

**Sensor selection criteria**:

| Criterion | Considerations |
|-----------|---------------|
| Range | How far can the sensor measure reliably? LiDAR: 0.1–100m; IMU: internal only |
| Resolution | How fine is the spatial/angular discrimination? Camera: pixel pitch; LiDAR: angular resolution |
| Update rate | How fast does the sensor produce new data? IMU: 1000 Hz; camera: 30–120 Hz |
| Power consumption | IMU: &lt;1mW; rotating LiDAR: 5–20W; RGB-D camera: 2–5W |
| Cost | IMU: $10–$100; solid-state LiDAR: $200–$1000; mechanical LiDAR: $5000–$75000 |

```python title="Generic sensor interface (Python type skeleton)"
from abc import ABC, abstractmethod
from dataclasses import dataclass
import numpy as np
import time

@dataclass
class SensorReading:
    """Base class for a typed sensor measurement."""
    timestamp: float        # Unix timestamp (seconds)
    frame_id: str           # Which coordinate frame this is in (e.g., "lidar_link")
    data: np.ndarray        # The raw measurement data

class Sensor(ABC):
    """Abstract base class for all robot sensors."""

    def __init__(self, name: str, frame_id: str):
        self.name = name
        self.frame_id = frame_id

    @abstractmethod
    def read(self) -> SensorReading:
        """Return the latest sensor measurement."""
        ...

    @abstractmethod
    def update_rate_hz(self) -> float:
        """Return the sensor's nominal update rate in Hz."""
        ...

class IMUSensor(Sensor):
    """Concrete IMU implementation returning [ax, ay, az, wx, wy, wz]."""

    def update_rate_hz(self) -> float:
        return 400.0  # Hz

    def read(self) -> SensorReading:
        # In a real system, this would read from hardware
        data = np.zeros(6, dtype=np.float32)
        data[2] = -9.81  # gravity on z-axis (sensor at rest)
        return SensorReading(
            timestamp=time.time(),
            frame_id=self.frame_id,
            data=data,
        )
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Probabilistic sensor model**: A sensor is a stochastic channel that maps the true world state $x$ to an observation $z$ according to a likelihood function:

$$p(z | x)$$

This is the **observation model** — the probability of observing $z$ given that the true state is $x$. For a noisy range sensor:

$$p(z | x) = \mathcal{N}(z; h(x), \sigma_r^2)$$

where $h(x)$ is the expected measurement (e.g., the true distance to the nearest obstacle), $\sigma_r^2$ is the measurement noise variance, and $\mathcal{N}$ is the Gaussian density.

**Bayes filter**: The observation model feeds into a recursive state estimator. The Bayes filter maintains a belief distribution $p(x_t | z_{1:t}, u_{1:t})$ updated in two steps:

*Predict* (motion model):
$$\bar{p}(x_t | z_{1:t-1}, u_{1:t}) = \int p(x_t | x_{t-1}, u_t) \, p(x_{t-1} | z_{1:t-1}, u_{1:t-1}) \, dx_{t-1}$$

*Update* (observation model):
$$p(x_t | z_{1:t}, u_{1:t}) = \eta \cdot p(z_t | x_t) \cdot \bar{p}(x_t | z_{1:t-1}, u_{1:t})$$

where $\eta$ is the normalizing constant. The Kalman filter (Section 1.3) is the closed-form solution when both models are linear and Gaussian.

**Calibration**:

- **Intrinsic calibration**: Estimating parameters *internal* to the sensor — e.g., camera focal length $f_x, f_y$, principal point $c_x, c_y$, distortion coefficients $k_1, k_2$. Performed once, factory-side or in the lab, typically by observing a known calibration target.
- **Extrinsic calibration**: Estimating the rigid body transform $T_{BS}$ between the sensor frame and the body frame. Changes whenever a sensor is moved. For a camera + IMU pair, extrinsic calibration requires careful temporal alignment (time offset estimation) as well as spatial alignment.

**Fusing two independent Gaussian sensors**: If sensor 1 gives $z_1 \sim \mathcal{N}(\mu_1, \sigma_1^2)$ and sensor 2 gives $z_2 \sim \mathcal{N}(\mu_2, \sigma_2^2)$, the optimal Gaussian fusion (from Bayes' rule, assuming both observe the same quantity) has:

$$\Sigma_{fused}^{-1} = \Sigma_1^{-1} + \Sigma_2^{-1}$$
$$\mu_{fused} = \Sigma_{fused} \left(\Sigma_1^{-1} \mu_1 + \Sigma_2^{-1} \mu_2\right)$$

In the scalar case:

$$\sigma_{fused}^2 = \frac{\sigma_1^2 \sigma_2^2}{\sigma_1^2 + \sigma_2^2}, \qquad \mu_{fused} = \frac{\sigma_2^2 \mu_1 + \sigma_1^2 \mu_2}{\sigma_1^2 + \sigma_2^2}$$

This shows that fusion *always* reduces uncertainty: $\sigma_{fused}^2 < \min(\sigma_1^2, \sigma_2^2)$.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. For each sensor listed below, classify it as (i) proprioceptive or exteroceptive, and (ii) active or passive:
   - A joint encoder measuring the angle of a robot's knee
   - A microphone listening for voice commands
   - A thermal infrared camera detecting body heat
   - A LiDAR sensor on a self-driving car
   - A motor current sensor monitoring how hard the motor is working

### Advanced

2. **Information matrix fusion**: Sensor A measures a robot's $x$-position with uncertainty $\sigma_A = 0.1$ m. Sensor B measures the same quantity with $\sigma_B = 0.3$ m. The measurements are $z_A = 2.1$ m and $z_B = 1.8$ m.
   - (a) Compute the fused mean $\mu_{fused}$ and fused standard deviation $\sigma_{fused}$.
   - (b) Verify that $\sigma_{fused} < \min(\sigma_A, \sigma_B)$.
   - (c) Now suppose sensor A measures position and sensor B measures velocity (a different quantity). Can you still fuse them using this formula? Explain why or why not, and describe what additional information you would need to perform the fusion.
