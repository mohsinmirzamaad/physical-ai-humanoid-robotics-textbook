---
sidebar_position: 9
sidebar_label: "IMUs"
title: "IMUs: Inertial Measurement Units"
description: "IMU sensor physics, kinematic equations for state propagation, quaternion orientation representation, and IMU preintegration for visual-inertial odometry."
keywords: [IMU, accelerometer, gyroscope, quaternion, inertial navigation, IMU preintegration]
audience_tiers: [beginner, intermediate, advanced]
week: 2
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# IMUs: Inertial Measurement Units

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain how an IMU works using the inner-ear analogy
    - State what an IMU measures and why it is essential for humanoid balance
    - Describe in plain language why an IMU drifts over time and what "fusion" solves
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Distinguish accelerometer and gyroscope measurements and their units
    - Explain quaternion orientation representation and why it avoids gimbal lock
    - Implement a quaternion-based complementary filter for orientation estimation
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Write the four continuous-time IMU kinematic equations
    - Model IMU noise using Allan variance analysis outputs (ARW, VRW, bias instability)
    - Explain the IMU preintegration theory and when it is necessary
  </TabItem>
</Tabs>

---

## How an IMU Works

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Close your eyes and tilt your head to the side. Even without seeing anything, you know your head has moved — your inner ear tells you. The inner ear contains tiny fluid-filled tubes (the semicircular canals) that detect rotation, and small calcium carbite crystals (the otoliths) that detect linear acceleration and gravity. Together, they give your brain a continuous stream of information about how your head is moving.

An **IMU** is the robot equivalent of your inner ear.

:::info[Key Term]
**IMU** (Inertial Measurement Unit): A sensor package containing an accelerometer (which measures linear acceleration and gravity) and a gyroscope (which measures rotation rate). Together, they tell a robot how fast it is accelerating and turning.
:::

An IMU produces **6 numbers** at very high speed — typically 100 to 1000 times per second:

- 3 numbers for linear acceleration: how fast the sensor is speeding up or slowing down in each direction (forward/backward, left/right, up/down)
- 3 numbers for angular rate: how fast the sensor is rotating around each axis (roll, pitch, yaw)

**Why humanoids need IMUs**: Every humanoid robot carries at least one IMU, usually mounted near the center of mass (hip or chest). Without it, the robot has no fast way to know its orientation — whether it is vertical, tilting forward, or about to fall. The IMU updates 400–1000 times per second, giving the balance controller the fast feedback it needs to react before the robot tips over.

**The drift problem**: If you integrate the gyroscope signal over time to estimate how much the robot has rotated, small measurement errors add up. After a few seconds, the orientation estimate has "drifted" from reality. This is why IMUs must be combined with other sensors (cameras, LiDAR, or GPS) that provide absolute reference.

:::tip[Beginner Tip]
Think of the gyroscope as a very fast but gradually forgetful compass: excellent at tracking fast movements, but tends to lose track of "north" over time. The camera or LiDAR acts as the "memory," periodically correcting the drift.
:::

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Accelerometer — what it actually measures**:

An accelerometer does not measure acceleration directly. It measures **specific force** — the non-gravitational force per unit mass:

$$\tilde{f} = a - g$$

where $a$ is the true kinematic acceleration and $g$ is the gravitational vector (pointing downward, $\approx 9.81$ m/s² on Earth). At rest on a flat surface, $a = 0$ (no motion), so $\tilde{f} = -g$ — the accelerometer reads a 9.81 m/s² "upward" force (gravity pushing the sensor upward via the floor). This is counterintuitive but critical: the accelerometer at rest reads gravity, not zero.

**Gyroscope — angular rate**:

The gyroscope measures angular velocity $\omega = [\omega_x, \omega_y, \omega_z]$ in rad/s. Integrating gives orientation change: $\Delta\theta = \omega \cdot \Delta t$. At 400 Hz ($\Delta t = 2.5$ ms), even a 0.01 rad/s gyro bias causes $0.01 \times 3600 \approx 36$ rad/hour of accumulated error — explaining why uncorrected gyros drift badly.

**Data format**: A 6-vector at each timestep:

$$\text{IMU}(t) = [a_x, a_y, a_z, \omega_x, \omega_y, \omega_z]^T \in \mathbb{R}^6$$

Units: $(a_x, a_y, a_z)$ in m/s²; $(\omega_x, \omega_y, \omega_z)$ in rad/s.

**Quaternion orientation**: Representing 3D orientation as Euler angles (roll, pitch, yaw) has a fundamental flaw: **gimbal lock** — when two axes align, a degree of freedom is lost and the representation becomes singular. The quaternion representation avoids this:

$$q = [w, x, y, z]^T, \quad |q| = 1$$

A quaternion $q$ encodes rotation by angle $\theta$ about unit axis $\hat{n}$:

$$q = \begin{bmatrix} \cos(\theta/2) \\ \hat{n} \sin(\theta/2) \end{bmatrix}$$

Quaternion multiplication (composition of rotations) has no singularities. Its only cost is the unit-norm constraint, which must be maintained numerically by periodic renormalization.

**Complementary filter**: A simple and effective way to fuse accelerometer and gyroscope:

- Gyroscope provides fast, low-noise orientation updates but drifts over long times (high-pass behavior)
- Accelerometer provides slow gravity reference but is noisy during motion (low-pass behavior)
- The filter blends them: $q \leftarrow \alpha \cdot q_{gyro} + (1-\alpha) \cdot q_{accel}$, where $\alpha \approx 0.98$ (mostly gyro, a little accelerometer correction)

<div></div>

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Continuous-time IMU kinematic equations**:

$$\dot{p} = v$$
$$\dot{v} = R(q)(f - b_a) + g^w$$
$$\dot{q} = \frac{1}{2} q \otimes \begin{bmatrix} 0 \\ \omega - b_g \end{bmatrix}$$
$$\dot{b}_a = n_{b_a}, \quad \dot{b}_g = n_{b_g}$$

where $p \in \mathbb{R}^3$ is position, $v \in \mathbb{R}^3$ is velocity, $q \in \mathbb{H}$ is the unit quaternion attitude, $R(q)$ is the corresponding rotation matrix, $f$ and $\omega$ are the raw accelerometer and gyroscope readings, $b_a$ and $b_g$ are the accelerometer and gyroscope biases, $g^w = [0, 0, -9.81]^T$ is the gravity vector in world frame, and $\otimes$ denotes quaternion multiplication.

The bias processes $n_{b_a}, n_{b_g}$ are zero-mean Gaussian white noise processes — making the biases random-walk (Wiener) processes.

**IMU noise model — Allan variance analysis**:

Allan variance characterizes IMU noise from a long static recording. It decomposes noise into:

| Noise type | Symbol | Units | Physical source |
|-----------|--------|-------|----------------|
| Velocity Random Walk (VRW) | $N$ | m/s/√hr | White noise on accelerometer |
| Angular Random Walk (ARW) | $N_g$ | °/√hr | White noise on gyroscope |
| Bias Instability (BI) | $B$ | m/s²/hr (accel), °/hr (gyro) | 1/f noise in electronics |

The noise parameters enter the EKF process noise covariance $Q$ as:
$$Q = \text{diag}(N^2 \Delta t, \; N^2 \Delta t, \; N^2 \Delta t, \; N_g^2 \Delta t, \; \ldots)$$

**IMU preintegration (Forster et al., 2017)**: In visual-inertial odometry (VIO), camera keyframes are extracted at low frequency (e.g., 10 Hz) while IMU runs at 400 Hz. Between two keyframes $i$ and $j$, the IMU provides $\sim$40 measurements. Naïvely, including these as factors in the SLAM graph would require re-linearization every time the keyframe poses are updated (because IMU integration depends on the initial pose).

Preintegration avoids this by integrating IMU measurements in a relative frame, producing pose-independent quantities:

$$\Delta R_{ij} = \prod_{k=i}^{j-1} \exp((\tilde{\omega}_k - b_g^i)\Delta t)$$
$$\Delta v_{ij} = \sum_{k=i}^{j-1} \Delta R_{ik} (\tilde{f}_k - b_a^i) \Delta t$$
$$\Delta p_{ij} = \sum_{k=i}^{j-1} \left[\Delta v_{ik}\Delta t + \frac{1}{2}\Delta R_{ik}(\tilde{f}_k - b_a^i)\Delta t^2\right]$$

These preintegrated measurements are fixed once computed and enter the factor graph as a single IMU factor between keyframes $i$ and $j$, with a $9 \times 9$ covariance derived analytically.

> **Reference**: Forster, C. et al. "On-Manifold Preintegration for Real-Time Visual-Inertial Odometry." *IEEE Transactions on Robotics*, 33(1), 2017.

  </TabItem>
</Tabs>

---

## Code Examples

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

*No code required at the beginner level for this section.*

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

```python title="Quaternion-based complementary filter for orientation"
import numpy as np

def quat_multiply(q1: np.ndarray, q2: np.ndarray) -> np.ndarray:
    """Quaternion product: q1 ⊗ q2. Format: [w, x, y, z]."""
    w1, x1, y1, z1 = q1
    w2, x2, y2, z2 = q2
    return np.array([
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        w1*x2 + x1*w2 + y1*z2 - z1*y2,
        w1*y2 - x1*z2 + y1*w2 + z1*x2,
        w1*z2 + x1*y2 - y1*x2 + z1*w2,
    ])

def gyro_integration_step(q: np.ndarray, omega: np.ndarray, dt: float) -> np.ndarray:
    """
    Integrate angular rate omega (rad/s) over dt seconds using quaternion kinematics.
    Returns updated unit quaternion.
    """
    angle = np.linalg.norm(omega) * dt
    if angle < 1e-10:
        return q
    axis = omega / np.linalg.norm(omega)
    dq = np.array([np.cos(angle/2), *(axis * np.sin(angle/2))])
    q_new = quat_multiply(q, dq)
    return q_new / np.linalg.norm(q_new)  # renormalize

def accel_to_quaternion(accel: np.ndarray) -> np.ndarray:
    """
    Estimate orientation from accelerometer (gravity reference only).
    Returns a quaternion aligning z-axis with the measured gravity direction.
    """
    g_hat = -accel / np.linalg.norm(accel)  # estimated gravity direction (points down)
    z_world = np.array([0.0, 0.0, 1.0])     # world up-axis

    axis = np.cross(z_world, g_hat)
    sin_angle = np.linalg.norm(axis)
    if sin_angle < 1e-8:
        return np.array([1.0, 0.0, 0.0, 0.0])  # already aligned
    axis /= sin_angle
    angle = np.arcsin(np.clip(sin_angle, -1, 1))
    return np.array([np.cos(angle/2), *(axis * np.sin(angle/2))])

def complementary_filter_step(
    q: np.ndarray,
    gyro: np.ndarray,
    accel: np.ndarray,
    dt: float,
    alpha: float = 0.98,
) -> np.ndarray:
    """
    One step of quaternion complementary filter.
    alpha: trust in gyroscope (0.98 = 98% gyro, 2% accelerometer correction)
    """
    q_gyro = gyro_integration_step(q, gyro, dt)
    q_accel = accel_to_quaternion(accel)

    # Spherical linear interpolation (simplified: linear + renormalize)
    q_fused = alpha * q_gyro + (1 - alpha) * q_accel
    return q_fused / np.linalg.norm(q_fused)

# --- Simulate 1 second of IMU data at 400 Hz ---
dt = 1.0 / 400.0
q = np.array([1.0, 0.0, 0.0, 0.0])  # start upright

rng = np.random.default_rng(0)
print("Simulating 400 steps (1 second) of complementary filter:")
for step in range(400):
    gyro  = rng.normal([0.0, 0.0, 0.05], 0.01)   # 0.05 rad/s yaw rate + noise
    accel = rng.normal([0.0, 0.0, -9.81], 0.05)   # gravity + noise
    q = complementary_filter_step(q, gyro, accel, dt)

print(f"Final orientation quaternion: [{q[0]:.4f}, {q[1]:.4f}, {q[2]:.4f}, {q[3]:.4f}]")
print(f"Norm (should be 1.0): {np.linalg.norm(q):.8f}")
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

```python title="Discrete IMU kinematic integration with bias correction"
import numpy as np
from dataclasses import dataclass, field

@dataclass
class IMUState:
    """Full IMU-integrated state: position, velocity, orientation, biases."""
    position:     np.ndarray = field(default_factory=lambda: np.zeros(3))
    velocity:     np.ndarray = field(default_factory=lambda: np.zeros(3))
    quaternion:   np.ndarray = field(default_factory=lambda: np.array([1.,0.,0.,0.]))
    bias_accel:   np.ndarray = field(default_factory=lambda: np.zeros(3))
    bias_gyro:    np.ndarray = field(default_factory=lambda: np.zeros(3))

def quat_to_rotation_matrix(q: np.ndarray) -> np.ndarray:
    """Convert unit quaternion [w, x, y, z] to 3x3 rotation matrix."""
    w, x, y, z = q
    return np.array([
        [1-2*(y**2+z**2),   2*(x*y - w*z),   2*(x*z + w*y)],
        [  2*(x*y + w*z), 1-2*(x**2+z**2),   2*(y*z - w*x)],
        [  2*(x*z - w*y),   2*(y*z + w*x), 1-2*(x**2+y**2)],
    ])

GRAVITY_WORLD = np.array([0.0, 0.0, -9.81])

def integrate_imu(
    state: IMUState,
    accel_raw: np.ndarray,  # accelerometer reading (m/s^2) in body frame
    gyro_raw:  np.ndarray,  # gyroscope reading (rad/s) in body frame
    dt: float,
) -> IMUState:
    """
    Discrete-time IMU kinematic integration with bias correction.
    Implements the flat-Earth, constant-gravity model.
    """
    # Bias-corrected measurements
    f_corrected = accel_raw - state.bias_accel   # specific force
    w_corrected = gyro_raw  - state.bias_gyro    # angular rate

    R = quat_to_rotation_matrix(state.quaternion)

    # --- Position and velocity integration (midpoint rule) ---
    accel_world = R @ f_corrected + GRAVITY_WORLD
    new_position = state.position + state.velocity * dt + 0.5 * accel_world * dt**2
    new_velocity = state.velocity + accel_world * dt

    # --- Quaternion integration (first-order exponential map) ---
    angle = np.linalg.norm(w_corrected) * dt
    if angle > 1e-10:
        axis = w_corrected / np.linalg.norm(w_corrected)
        dq = np.array([np.cos(angle/2), *(axis * np.sin(angle/2))])
    else:
        dq = np.array([1.0, *0.5 * w_corrected * dt])  # small-angle approx

    # Quaternion multiply and renormalize
    w1, x1, y1, z1 = state.quaternion
    w2, x2, y2, z2 = dq
    new_q = np.array([w1*w2 - x1*x2 - y1*y2 - z1*z2,
                      w1*x2 + x1*w2 + y1*z2 - z1*y2,
                      w1*y2 - x1*z2 + y1*w2 + z1*x2,
                      w1*z2 + x1*y2 - y1*x2 + z1*w2])
    new_q /= np.linalg.norm(new_q)

    return IMUState(new_position, new_velocity, new_q,
                    state.bias_accel.copy(), state.bias_gyro.copy())

# --- Simulate free fall for 0.5 seconds at 400 Hz ---
state = IMUState()
state.bias_accel = np.array([0.01, -0.005, 0.02])  # small known biases
dt = 1.0 / 400.0
rng = np.random.default_rng(42)

for step in range(200):  # 0.5 s
    # Sensor at rest (only gravity): specific force = -R^T * g
    f_true = np.array([0.0, 0.0, 9.81])   # resting specific force (pointing up)
    w_true = np.zeros(3)
    accel_raw = f_true + state.bias_accel + rng.normal(0, 0.02, 3)
    gyro_raw  = w_true + state.bias_gyro  + rng.normal(0, 0.001, 3)
    state = integrate_imu(state, accel_raw, gyro_raw, dt)

print(f"Position after 0.5s at rest: {state.position.round(4)} m (should be ~0)")
print(f"Velocity after 0.5s at rest: {state.velocity.round(4)} m/s (should be ~0)")
print(f"Orientation norm: {np.linalg.norm(state.quaternion):.8f}")
```

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A humanoid robot is standing still on flat ground. Its IMU accelerometer reads $[0.0, 0.0, +9.81]$ m/s² (z pointing up). Then the robot starts falling forward. Describe qualitatively how the three accelerometer readings and three gyroscope readings would change during the fall. Which sensor would react first? Which would indicate the robot has hit the ground?

### Intermediate

2. A gyroscope has a bias of $b_g = 0.02$ rad/s about the yaw axis. The robot stands still for 10 minutes. (a) How much yaw angle error accumulates in that time (in degrees)? (b) If a camera-based heading correction is available every 30 seconds with accuracy $\sigma_\psi = 0.5°$, design a simple complementary filter blending parameter $\alpha$ (per the formula in the intermediate section) that keeps the yaw error below $2°$ at all times. Show your calculation.

### Advanced

3. **IMU uncertainty propagation**: Starting from the continuous-time kinematic model $\dot{v} = R(f - b_a) + g$, assume $b_a$ is known exactly and $f$ has additive white noise $n_f \sim \mathcal{N}(0, \sigma_f^2 I_3)$.

   (a) Show that the velocity uncertainty after integrating over time interval $[0, T]$ grows as:
   $$\text{Var}(v(T) - v(0)) = \sigma_f^2 T \cdot I_3$$

   (b) Propagate this further to show that position uncertainty grows as $\text{Var}(p(T)) \propto \sigma_f^2 T^3 / 3$.

   (c) Interpret this result: if you double the integration time $T$, by how much does the position uncertainty standard deviation increase?
