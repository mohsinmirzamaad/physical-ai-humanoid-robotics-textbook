---
sidebar_position: 10
sidebar_label: "Force/Torque Sensors"
title: "Force/Torque Sensors"
description: "Force/torque sensor construction, 6-axis wrench measurement, gravity compensation, calibration, and impedance control for humanoid manipulation and locomotion."
keywords: [force torque sensor, wrench, impedance control, gravity compensation, strain gauge, contact sensing]
audience_tiers: [beginner, intermediate, advanced]
week: 2
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Force/Torque Sensors

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain using the strain-gauge analogy how a force/torque sensor works
    - List three tasks where a humanoid robot needs force/torque sensing
    - Describe where force/torque sensors are placed on a humanoid and why
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Describe the 6-axis wrench output and its units
    - Explain why gravity compensation is necessary before using F/T measurements
    - Write Python code to compute gravity-compensated F/T readings given sensor orientation
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Write the sensor measurement model including calibration matrix and bias
    - Derive the Cartesian impedance control law from a desired mass-spring-damper model
    - Explain admittance vs. impedance control and when each is appropriate
  </TabItem>
</Tabs>

---

## How Force/Torque Sensors Work

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Imagine bending a thin metal ruler. As you push on it, the metal on the inside of the bend compresses and the metal on the outside stretches. If you glue a tiny strip of metal (called a **strain gauge**) to the ruler's surface, that strip stretches or compresses right along with the ruler — and because its electrical resistance changes when it stretches, you can measure exactly how much the ruler bent, which tells you how hard you pushed.

A force/torque sensor works the same way: it has a rigid metal body (usually shaped like a thick disk or cross) with strain gauges bonded to it. When a force or torque is applied, the metal flexes by microscopic amounts, the strain gauges detect it, and electronics convert the resistance changes into force measurements.

:::info[Key Term]
**Force/Torque (F/T) sensor**: A sensor that measures the 3D force and 3D torque (together called a **wrench**) applied at a point. A wrench has six numbers: three force components (push/pull in x, y, z directions) and three torque components (twist around x, y, z axes).
:::

:::info[Key Term]
**Wrench**: A 6-component vector describing both force and torque at a point: $[F_x, F_y, F_z, \tau_x, \tau_y, \tau_z]$. Units: Newtons (N) for force, Newton-meters (N·m) for torque.
:::

**Three tasks that require F/T sensing**:

1. **Shaking hands**: A robot needs to feel how hard a human is gripping and match that force — too weak feels weird, too strong hurts. Without F/T sensing, the robot cannot modulate grip force.

2. **Picking up a fragile object**: A robot picking up an egg must feel the moment it makes contact and stop pushing as soon as it detects a reaction force. Without F/T sensing, it would either crush the egg or fail to grip it reliably.

3. **Walking on uneven ground**: Atlas's ankle F/T sensors measure the ground reaction force — how hard the ground pushes back. If the force shifts unexpectedly (robot stepping on a rock), the balance controller compensates in real time.

**Where F/T sensors are placed on humanoids**:

- **Wrists**: Measure interaction forces during manipulation — picking up, assembling, handing objects
- **Ankles**: Measure ground reaction forces for balance control and terrain adaptation
- **Sometimes waist**: Measure interaction forces between upper and lower body for whole-body compliance

**Limitations**:
- Expensive ($500–$5,000 per sensor)
- Fragile under mechanical overload — one hard impact can destroy the sensor
- Lower bandwidth than IMUs (typically 100–1,000 Hz vs. 400–1,000 Hz for IMUs)

<div></div>

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Sensor construction**: A 6-axis F/T sensor typically uses 6 or more Wheatstone bridge circuits, each measuring strain along a specific direction. The Wheatstone bridge converts the small resistance change of a strain gauge ($\Delta R / R \approx 10^{-4}$) into a measurable voltage. The six bridge outputs are combined by a calibration matrix to yield the 6-component wrench.

**Output format**: The sensor produces a 6-vector at 100–1,000 Hz:

$$\mathbf{w} = [F_x, F_y, F_z, \tau_x, \tau_y, \tau_z]^T$$

- Forces in Newtons (N), torques in Newton-meters (N·m)
- Expressed in the sensor's own frame $\mathcal{F}_S$
- Sign convention: positive $F_z$ = force pushing upward on the sensor's top face

**Gravity compensation**: The most common mistake with F/T sensors is forgetting that everything attached below the sensor contributes to the measured wrench — even when no external forces are applied. A 500 g hand attached below a wrist F/T sensor always contributes $\sim$4.9 N downward force, changing direction as the wrist moves.

Gravity compensation removes this contribution:

$$\mathbf{w}_{net} = \mathbf{w}_{measured} - \mathbf{w}_{gravity}(q)$$

where $\mathbf{w}_{gravity}(q)$ is the wrench due to the attached payload (hand, tool) at the current joint configuration $q$.

Computing $\mathbf{w}_{gravity}$: Let the payload mass be $m$ and its center of mass (in sensor frame) be $r_{com}$. The gravitational force in the world frame is $F_g^w = [0, 0, -mg]$. Transforming to sensor frame:

$$F_g^S = R_{SW}(q) \cdot F_g^w$$

The gravity torque:

$$\tau_g^S = r_{com} \times F_g^S$$

**Use in control — impedance control**: Impedance control makes the robot behave as a virtual mass-spring-damper in Cartesian space. When an external force $F_{ext}$ acts on the end-effector, the end-effector "gives" like a spring:

$$F_{ext} = K_d (x - x_d) + D_d (\dot{x} - \dot{x}_d) + M_d (\ddot{x} - \ddot{x}_d)$$

where $K_d, D_d, M_d$ are desired Cartesian stiffness, damping, and inertia matrices. The F/T sensor measures $F_{ext}$ directly.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Sensor measurement model**:

$$\mathbf{w}_{measured} = C \cdot \mathbf{w}_{true} + \mathbf{b} + \mathbf{n}$$

where:
- $C \in \mathbb{R}^{6\times 6}$ is the calibration matrix (maps bridge voltages to wrench components)
- $\mathbf{b} \in \mathbb{R}^6$ is the bias (zero-load offset, temperature-dependent)
- $\mathbf{n} \sim \mathcal{N}(0, \Sigma)$ is additive Gaussian noise

**Calibration**: Apply a set of $N$ known wrenches $\{\mathbf{w}^{(k)}\}$ and record the bridge outputs $\{V^{(k)}\}$. Solve for $C^{-1}$ via least squares:

$$C^{-1} = \left(\mathbf{W}^T \mathbf{W}\right)^{-1} \mathbf{W}^T \mathbf{V}$$

The **condition number** $\kappa(C)$ measures calibration quality: a poorly conditioned $C$ amplifies noise in directions where few calibration forces were applied. Good calibration designs sample all 6 wrench dimensions evenly.

**Gravity compensation in full generality**: Let $n_{payloads}$ rigid bodies be attached below the sensor. For each body $i$ with mass $m_i$ and CoM position $r_i^S(q)$ in sensor frame:

$$\mathbf{w}_{gravity}(q) = \begin{bmatrix} \sum_i m_i \cdot R_{SW}(q) g^w \\ \sum_i r_i^S(q) \times (m_i R_{SW}(q) g^w) \end{bmatrix}$$

Gravity compensation must be recomputed at every control timestep because $R_{SW}(q)$ changes as the robot moves.

**Cartesian impedance control law derivation**:

Desired closed-loop behavior: the end-effector behaves as a virtual mass-spring-damper:

$$M_d \ddot{e} + D_d \dot{e} + K_d e = F_{ext}$$

where $e = x - x_d$ is the Cartesian error. Using task-space dynamics $\Lambda \ddot{x} + \mu + p = F_{control} + F_{ext}$, the desired control force is:

$$F_{control} = \Lambda M_d^{-1}(F_{ext} - D_d \dot{e} - K_d e) + \mu + p - F_{ext}$$

The corresponding joint torques:

$$\tau = J^T(q) F_{control} + (I - J^T \bar{J}^T)\tau_{null}$$

where $\bar{J} = M^{-1} J^T \Lambda$ is the dynamically consistent Jacobian pseudo-inverse.

**Admittance vs. impedance control**:

| | Impedance | Admittance |
|---|---|---|
| **Primary loop** | Position-controlled | Force-controlled |
| **F/T sensor role** | Measures disturbance force | Commands motion |
| **Best for** | Robots with stiff position controllers | Robots with force/torque controllers |
| **Contact stability** | Good for stiff environments | Good for compliant environments |
| **Example** | Industrial arm with F/T at wrist | Collaborative robot (cobot) |

**Bandwidth analysis**: The mechanical resonance of the sensor body occurs at:

$$f_{res} = \frac{1}{2\pi} \sqrt{\frac{k_{sensor}}{m_{payload}}}$$

where $k_{sensor}$ is the sensor's stiffness (typically 1–10 MN/m) and $m_{payload}$ is the attached mass. For $m_{payload} = 1$ kg and $k_{sensor} = 5$ MN/m: $f_{res} \approx 355$ Hz. To avoid exciting this resonance, the control bandwidth must be limited to $\sim f_{res}/10 \approx 35$ Hz for safe impedance control — well below the sensor's raw data rate.

> **Reference**: Hogan, N. "Impedance Control: An Approach to Manipulation." *ASME Journal of Dynamic Systems, Measurement, and Control*, 107(1), 1985.
>
> **Reference**: Siciliano, B. et al. "Robotics: Modelling, Planning and Control." Springer, 2010. Chapter 9.

  </TabItem>
</Tabs>

---

## Code Examples

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

*No code required at the beginner level for this section.*

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

```python title="Gravity compensation for a wrist F/T sensor"
import numpy as np

def rotation_from_quaternion(q: np.ndarray) -> np.ndarray:
    """Convert unit quaternion [w, x, y, z] to 3x3 rotation matrix."""
    w, x, y, z = q
    return np.array([
        [1-2*(y**2+z**2),  2*(x*y-w*z),    2*(x*z+w*y)],
        [2*(x*y+w*z),   1-2*(x**2+z**2),   2*(y*z-w*x)],
        [2*(x*z-w*y),      2*(y*z+w*x),  1-2*(x**2+y**2)],
    ])

def compute_gravity_wrench(
    q_sensor_world: np.ndarray,  # quaternion: world → sensor rotation [w,x,y,z]
    payload_mass_kg: float,
    payload_com_sensor: np.ndarray,  # payload CoM in sensor frame (meters)
    g: float = 9.81,
) -> np.ndarray:
    """
    Compute the 6-DOF wrench due to payload gravity in the sensor frame.
    q_sensor_world: rotation that transforms world-frame vectors to sensor frame.
    Returns [Fx, Fy, Fz, tx, ty, tz] in N and N·m.
    """
    R_SW = rotation_from_quaternion(q_sensor_world)

    g_world = np.array([0.0, 0.0, -g])          # gravity in world frame
    F_gravity_sensor = R_SW @ (payload_mass_kg * g_world)  # force in sensor frame
    tau_gravity = np.cross(payload_com_sensor, F_gravity_sensor)  # torque = r × F

    return np.concatenate([F_gravity_sensor, tau_gravity])

def compensate_gravity(
    w_measured: np.ndarray,
    q_sensor_world: np.ndarray,
    payload_mass_kg: float,
    payload_com_sensor: np.ndarray,
) -> np.ndarray:
    """Return gravity-compensated wrench."""
    w_gravity = compute_gravity_wrench(q_sensor_world, payload_mass_kg, payload_com_sensor)
    return w_measured - w_gravity

# --- Example: wrist sensor with a 0.3 kg hand attached ---
# Sensor pointing upward (wrist raised, sensor z-axis = world z-axis)
q_upright = np.array([1.0, 0.0, 0.0, 0.0])   # identity: sensor = world

# 0.3 kg hand, CoM 5 cm below sensor (−z direction in sensor frame)
hand_mass = 0.30
hand_com  = np.array([0.0, 0.0, -0.05])

# Simulated reading: only gravity, no external contact
w_measured = compute_gravity_wrench(q_upright, hand_mass, hand_com)
print("Measured wrench (no external force, gravity only):")
print(f"  Force:  {w_measured[:3].round(4)} N")
print(f"  Torque: {w_measured[3:].round(4)} N·m")

w_net = compensate_gravity(w_measured, q_upright, hand_mass, hand_com)
print("After gravity compensation (should be ~zero):")
print(f"  Force:  {w_net[:3].round(6)} N")
print(f"  Torque: {w_net[3:].round(6)} N·m")
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

```python title="Discrete Cartesian impedance controller"
import numpy as np

def impedance_control(
    x: np.ndarray,           # current end-effector position (3,)
    x_d: np.ndarray,         # desired end-effector position (3,)
    x_dot: np.ndarray,       # current end-effector velocity (3,)
    x_dot_d: np.ndarray,     # desired end-effector velocity (3,)
    F_ext: np.ndarray,       # external wrench from F/T sensor, compensated (6,) [F, tau]
    M_d: np.ndarray,         # desired Cartesian inertia (3x3)
    D_d: np.ndarray,         # desired Cartesian damping (3x3)
    K_d: np.ndarray,         # desired Cartesian stiffness (3x3)
    J: np.ndarray,           # Jacobian mapping joint velocities to Cartesian velocity (3xn)
    M_joint: np.ndarray,     # joint-space inertia matrix (nxn)
    g_joint: np.ndarray,     # gravity torques in joint space (n,)
) -> np.ndarray:
    """
    Compute joint torques for Cartesian impedance control.
    Only translational DOFs shown for clarity (extend to 6-DOF for full implementation).
    Returns joint torques tau (n,).
    """
    # Operational space inertia
    M_inv = np.linalg.inv(M_joint)
    Lambda = np.linalg.inv(J @ M_inv @ J.T)      # (3, 3)
    J_bar = M_inv @ J.T @ Lambda                  # dynamically consistent pseudo-inverse

    # Position and velocity errors
    e     = x - x_d
    e_dot = x_dot - x_dot_d

    F_ext_trans = F_ext[:3]   # translational force component

    # Desired task-space force (impedance law)
    F_impedance = -K_d @ e - D_d @ e_dot + F_ext_trans

    # Map to task-space control force (compensating for task-space dynamics)
    F_control = Lambda @ (np.linalg.inv(M_d) @ (F_impedance)
                          + np.linalg.inv(M_d) @ D_d @ e_dot
                          + np.linalg.inv(M_d) @ K_d @ e)

    # Joint torques
    tau = J.T @ F_control + g_joint
    return tau

# --- Illustrative 2-DOF planar example ---
# Robot at equilibrium, small position error
x   = np.array([0.52, 0.30, 0.80])   # current position (m)
x_d = np.array([0.50, 0.30, 0.80])   # desired position
x_dot = np.zeros(3);  x_dot_d = np.zeros(3)

F_ext = np.zeros(6)  # no external contact

# Impedance parameters: stiffness 500 N/m, damping 50 N·s/m, inertia 2 kg
K_d = np.diag([500.0, 500.0, 500.0])
D_d = np.diag([ 50.0,  50.0,  50.0])
M_d = np.diag([  2.0,   2.0,   2.0])

# Robot model (simplified 2-DOF, 3D task space only in xy-plane here)
J       = np.eye(3, 2)                         # simplified Jacobian
M_joint = np.diag([3.0, 2.0])                  # joint inertias
g_joint = np.array([0.0, 2.5])                 # gravity torques

tau = impedance_control(x, x_d, x_dot, x_dot_d, F_ext, M_d, D_d, K_d, J, M_joint, g_joint)
print(f"Position error: {(x-x_d).round(4)} m")
print(f"Impedance joint torques: {tau.round(4)} N·m")
print(f"(Gravity term: {g_joint} N·m included)")
```

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. List three everyday manipulation tasks where a human uses force feedback (their sense of touch) that would be very difficult without it. For each task, explain: (a) what information the touch sense provides, and (b) what would happen if a robot tried to do the task without a force/torque sensor.

### Intermediate

2. A robot wrist F/T sensor is oriented so that its z-axis points forward (horizontal). A 0.4 kg gripper is attached, with its center of mass 8 cm in front of the sensor (along the sensor's z-axis, i.e., $r_{com} = [0, 0, 0.08]$ m in sensor frame).
   - (a) The world gravity vector is $[0, 0, -9.81]$ m/s² (pointing down). The sensor's z-axis is horizontal (pointing forward in world x-direction). Write the rotation matrix $R_{SW}$ that transforms world-frame vectors to sensor frame.
   - (b) Compute the gravity force $F_g^S$ in sensor frame.
   - (c) Compute the gravity torque $\tau_g^S = r_{com} \times F_g^S$.
   - (d) If the F/T sensor reads $\mathbf{w}_{measured} = [0, 0, -3.92, 0, 0.3136, 0]$ (N, N·m), compute $\mathbf{w}_{net}$ after gravity compensation. What physical interpretation does the residual torque $\tau_y$ have?

### Advanced

3. **Impedance parameter selection**: You want to design an impedance controller for a robot polishing a surface. The surface has stiffness $K_{surface} = 10,000$ N/m. The robot's end-effector mass is $m_{ee} = 2$ kg.
   - (a) For stability, the product $K_d / \Lambda_{task} < K_{surface}$ must hold (passivity condition). If $\Lambda_{task} = 1.5$ kg, what is the maximum allowable $K_d$?
   - (b) Choose critical damping: $D_d = 2\sqrt{M_d K_d}$. Compute $D_d$ for your chosen $K_d$ and $M_d = 2$ kg.
   - (c) What is the resulting closed-loop natural frequency $\omega_n = \sqrt{K_d/M_d}$ and damping ratio $\zeta = D_d/(2\sqrt{M_d K_d})$? Interpret $\omega_n$ physically: what does it mean for the robot's response to a sudden contact?
