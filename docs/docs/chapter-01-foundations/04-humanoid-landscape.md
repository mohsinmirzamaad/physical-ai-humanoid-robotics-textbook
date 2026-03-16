---
sidebar_position: 5
sidebar_label: "Humanoid Landscape"
title: "The Humanoid Robotics Landscape"
description: "Survey of current humanoid robot platforms including Atlas, Figure 01, and Unitree H1, compared across sensor suite, actuation, and application domain."
keywords: [humanoid robots, Atlas, Figure 01, Unitree H1, whole-body control, actuation]
audience_tiers: [beginner, intermediate, advanced]
week: 1
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# The Humanoid Robotics Landscape

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain in plain language why engineers chose the humanoid form factor
    - Name four current humanoid robot platforms and their primary purposes
    - Define degrees of freedom, bipedal locomotion, and whole-body control
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Compare Atlas, Figure 01, and Unitree H1 across DOF, sensor suite, actuation, and application
    - Explain the trade-offs between hydraulic, electric SEA, and electric QDD actuation
    - Articulate why open-source platforms matter for research
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Analyze actuator fidelity metrics: backdrivability, torque density, and impedance bandwidth
    - Write the operational space control (OSC) equation and identify the operational space inertia matrix
    - Explain the morphological design trade-offs that affect balance and manipulation
  </TabItem>
</Tabs>

---

## Why Humanoid?

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Most of human civilization is built for human bodies. Doors have handles at human hand height. Stairs have risers sized for human legs. Tools — hammers, screwdrivers, keyboards — are designed for human hands. Even the layout of a factory floor assumes workers who stand upright, reach forward, and can climb ladders.

This is why engineers are building **humanoid robots** — robots that look and move like humans. Not because humanoid is the most efficient possible form (a wheeled robot is faster on flat ground; a six-legged robot is more stable on rough terrain), but because humanoid robots can work in spaces and use tools designed for humans, without redesigning everything around them.

:::info[Key Term]
**Humanoid robot**: A robot whose body structure approximates the human form — typically with a head, torso, two arms, and two legs. Humanoid robots can navigate stairs, use hand tools, and fit through standard doorways.
:::

:::info[Key Term]
**Bipedal locomotion**: Walking on two legs. This is mechanically challenging because a bipedal robot is always on the verge of falling — unlike a four-legged robot, which can always have three feet on the ground for stability.
:::

:::info[Key Term]
**Whole-body control**: Coordinating all of a robot's joints simultaneously to achieve a task — for example, walking while reaching forward to pick something up, where the arms, legs, and torso must all cooperate.
:::

**A brief timeline of humanoid milestones**:

- **2000**: Honda ASIMO — first humanoid robot to walk reliably on flat surfaces
- **2013**: Boston Dynamics Atlas — first humanoid designed for rough terrain and dynamic movement
- **2016**: Boston Dynamics Atlas performs backflips (demonstration)
- **2022–2023**: Figure AI, 1X Technologies, Agility Robotics, Unitree — commercial humanoids enter the workplace
- **2024–present**: Tesla Optimus, Figure 01, Unitree G1 — humanoids performing actual factory work tasks

**Four platforms you should know**:

| Platform | Who made it | What it's for |
|----------|-------------|---------------|
| **Atlas** | Boston Dynamics | Research — testing the limits of agility and whole-body control |
| **Figure 01** | Figure AI | Manufacturing — working alongside humans on assembly lines |
| **Unitree H1** | Unitree Robotics | Research and outdoor tasks — affordable, open platform |
| **Tesla Optimus** | Tesla | General-purpose factory work — high-volume production focus |

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Criteria-based platform comparison**:

| Platform | DOF | Sensor Suite | Actuation Type | Target Application | Developer |
|----------|-----|--------------|---------------|-------------------|-----------|
| **Atlas** (Gen 3) | 28 | Stereo cameras, IMU, F/T at wrists/ankles | Hydraulic | Dynamic locomotion research | Boston Dynamics |
| **Figure 01** | 43 | RGB-D cameras (head + torso), IMU, F/T at wrists | Electric — Series Elastic | Manufacturing assembly | Figure AI |
| **Unitree H1** | 19 | Solid-state LiDAR, stereo camera, IMU | Electric — Quasi-Direct Drive | Research, outdoor locomotion | Unitree Robotics |

:::note[Intermediate Note]
This table uses **criteria-based comparison**, not an exhaustive product list. New platforms launch frequently; the criteria (DOF, sensor suite, actuation, application) remain the right axes for comparison regardless of which platforms exist when you read this.
:::

**Actuation type trade-offs**:

*Hydraulic* (Atlas): High force density — Atlas can deliver peak torques far exceeding what electric motors of the same mass can produce. Excellent for explosive, dynamic movements (backflips, jumps). Downside: hydraulic fluid, pumps, and hoses add complexity and weight; energy efficiency is low; field maintenance is difficult.

*Series Elastic Actuator — SEA* (Figure 01): An elastic element (spring) is placed in series between the motor gearbox and the joint output. The spring compliance:
- Allows accurate force measurement (by measuring spring deflection)
- Absorbs impact energy (reduces shock damage to gearboxes)
- Improves force control fidelity
Downside: spring introduces flexibility that limits bandwidth; the spring must be pre-compressed for stiff position control.

*Quasi-Direct Drive — QDD* (Unitree H1): Low gear ratio (~6:1), no worm gear, resulting in high backdrivability (the output can push back on the motor without binding). This gives natural compliance during contact. Downside: lower torque density than high-ratio geared motors; motor must be sized larger for the same task torque.

**Why open platforms matter for research**: Unitree H1 publishes its SDK, mechanical drawings, and control interfaces. This means researchers at universities can deploy, modify, and publish results on real hardware without proprietary licenses — accelerating the whole field.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Actuator fidelity metrics**:

- **Torque density** (N·m/kg): Peak joint torque divided by actuator mass. Hydraulic actuators lead ($\sim$100–200 N·m/kg at the output), followed by high-reduction electric ($\sim$50–100 N·m/kg), then QDD ($\sim$20–40 N·m/kg).
- **Backdrivability**: Ease with which external forces move the joint. Measured by reflected inertia: $J_{ref} = n^2 J_{motor}$ where $n$ is the gear ratio. High $n$ → low backdrivability → poor contact compliance. QDD: $n \approx 6$, $J_{ref}$ small. High-reduction: $n \approx 100$, $J_{ref}$ large.
- **Impedance bandwidth**: Frequency up to which the joint can track a desired impedance (stiffness + damping). SEA bandwidth limited by spring resonance $\omega_n = \sqrt{K_s / J_{load}}$. QDD bandwidth limited by current loop bandwidth ($\sim$1–5 kHz achievable with field-oriented control).

**Whole-body control — Operational Space Control (Khatib, 1987)**:

The goal of OSC is to control the robot in task space (end-effector Cartesian coordinates) while respecting dynamics and constraints. The task-space dynamics are:

$$\Lambda(q)\ddot{x} + \mu(q, \dot{q}) + p(q) = F$$

where:
- $\Lambda(q) = (J(q) M^{-1}(q) J^T(q))^{-1}$ is the **operational space inertia matrix**
- $\mu = \bar{J}^T C \dot{q} - \Lambda \dot{J} \dot{q}$ are Coriolis/centrifugal terms in task space
- $p = \bar{J}^T g$ are gravitational terms in task space
- $\bar{J} = M^{-1} J^T \Lambda$ is the dynamically consistent pseudo-inverse of $J$

The joint torques that produce a desired task-space force $F^*$ are:

$$\tau = J^T(q) F^* + (I - J^T \bar{J}^T) \tau_{null}$$

The second term projects any desired null-space torques $\tau_{null}$ (e.g., for posture control) into the null space of $J^T$, ensuring they do not affect the primary task.

**Morphological design trade-offs**:

- **Center of mass height**: Higher CoM → larger moment arm for gravity → more torque required to maintain balance → higher energy consumption. Humanoids compromise by keeping the CoM near hip height.
- **Foot contact geometry**: Larger foot → larger support polygon → more stable → but heavier ankle and larger swing inertia. Current designs (Figure 01 foot: ~250mm × 80mm) balance stability and swing efficiency.
- **Mass distribution**: Placing heavy actuators proximally (near the hip/shoulder) reduces swing inertia, enabling faster limb motion.

```python title="Operational space inertia matrix (pseudocode)"
import numpy as np

def operational_space_inertia(M: np.ndarray, J: np.ndarray) -> np.ndarray:
    """
    Compute the operational space inertia matrix Lambda.
    M: joint-space inertia matrix (n x n)
    J: Jacobian (m x n), m = task-space DOF, n = joint-space DOF
    Returns Lambda (m x m).
    """
    M_inv = np.linalg.inv(M)
    # Lambda = (J M^{-1} J^T)^{-1}
    return np.linalg.inv(J @ M_inv @ J.T)

# --- Illustrative example: 2-DOF planar arm, 1 task DOF (x-position) ---
l1, l2 = 0.4, 0.3          # link lengths (m)
m1, m2 = 3.0, 2.0          # link masses (kg)
q1, q2 = np.radians(30), np.radians(45)  # joint angles

# Simplified diagonal inertia matrix (ignoring off-diagonal terms for illustration)
M = np.diag([m1 * l1**2 + m2 * (l1**2 + l2**2), m2 * l2**2])

# Jacobian for x-position of end-effector
J = np.array([[-(l1*np.sin(q1) + l2*np.sin(q1+q2)),  -l2*np.sin(q1+q2)]])

Lambda = operational_space_inertia(M, J)
print(f"Operational space inertia: {Lambda[0,0]:.4f} kg")
```

> **Reference**: Khatib, O. "A unified approach for motion and force control of robot manipulators: The operational space formulation." *IEEE Journal on Robotics and Automation*, 3(1), 1987.
>
> **Reference**: Kuindersma, S. et al. "Optimization-based locomotion planning, estimation, and control design for the Atlas humanoid robot." *Autonomous Robots*, 40(3), 2016.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. Match each humanoid robot to its most appropriate use case, and write one sentence explaining your reasoning for each match:
   - **Atlas** — (a) delivering packages in apartment buildings, (b) research into new locomotion algorithms, (c) assembling electronics in a factory
   - **Figure 01** — (a) hiking on mountain trails, (b) automotive manufacturing, (c) competitive dancing
   - **Unitree H1** — (a) university research into legged locomotion, (b) office reception, (c) deep-sea exploration

### Intermediate

2. A new humanoid robot is announced with: 32 DOF, RGB-D cameras + LiDAR sensor suite, quasi-direct drive electric actuation, and a target application of elderly care in home environments. Add this platform as a fourth row to the comparison table in this section. Then: (a) predict its main advantage over Figure 01 for the home care application, and (b) predict one limitation compared to Atlas for outdoor rough-terrain navigation.

### Advanced

3. **Operational space inertia matrix**: For a 2-DOF planar robot arm with link lengths $l_1 = 0.5$ m, $l_2 = 0.3$ m, and link masses $m_1 = 4$ kg, $m_2 = 2$ kg, and joint angles $q_1 = 45°$, $q_2 = -30°$:
   - (a) Write the full (non-diagonal) joint-space inertia matrix $M(q)$ including the inertia of distal links about proximal joints.
   - (b) Write the Jacobian $J(q)$ mapping joint velocities to end-effector $(x, y)$ velocities.
   - (c) Compute $\Lambda(q) = (J M^{-1} J^T)^{-1}$ and interpret its eigenvalues physically: what do they tell you about the effective inertia in different directions of end-effector motion?
