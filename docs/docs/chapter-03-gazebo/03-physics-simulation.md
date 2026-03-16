---
sidebar_position: 4
sidebar_label: "Physics Simulation"
title: "Physics Simulation"
description: "Rigid body dynamics in Gazebo: ODE, Bullet, and DART physics engines, contact models, friction and restitution, timestep tuning, and numerical integration stability."
keywords: [physics simulation, ODE, Bullet, DART, rigid body dynamics, contact model, friction, restitution, numerical integration, real-time factor, Gazebo physics]
audience_tiers: [beginner, intermediate, advanced]
week: 6
chapter: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Physics Simulation

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain what a physics engine does using everyday analogies
    - Identify the key physical properties that affect how a robot behaves in simulation
    - Describe what happens when physics parameters are set incorrectly
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Configure ODE physics parameters in SDF (timestep, friction, contact)
    - Tune simulation parameters to balance accuracy and real-time performance
    - Diagnose common physics instability symptoms and apply fixes
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Compare ODE, Bullet, and DART solvers on accuracy, speed, and use-case fit
    - Analyze numerical integration stability using energy conservation metrics
    - Design physics configurations for humanoid robots with articulated chains
  </TabItem>
</Tabs>

---

## How Physics Engines Work

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Drop a ball. What happens? It falls due to gravity, bounces off the floor, rolls to a stop because of friction. You know this intuitively because you live in a physical world.

A **physics engine** runs millions of tiny math calculations to replicate exactly this behavior in a computer. At each simulation time step (typically 1 millisecond), it:
1. Applies forces — gravity pulling every object downward
2. Detects collisions — checking if any two objects overlap
3. Resolves contacts — pushing objects apart and applying friction
4. Integrates motion — updating positions and velocities

:::info[Key Term]
**Physics Engine**: A software library that simulates the laws of classical mechanics — Newton's laws, friction, contact, and joint constraints — to make virtual objects behave realistically.
:::

**Why physics parameters matter for robots**:
- If friction is too low, the robot's feet will slide around like it's on ice
- If the timestep is too large, the simulation becomes numerically unstable and objects "explode"
- If joint damping is wrong, robot arms will oscillate uncontrollably
- Getting these parameters right is the difference between a useful simulation and a broken one

<div></div>
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**ODE physics configuration in SDF**:

```xml
<world name="my_world">
  <physics type="ode" name="ode_physics">
    <!-- Simulation timestep: smaller = more accurate, slower -->
    <max_step_size>0.001</max_step_size>         <!-- 1 ms -->
    <real_time_update_rate>1000</real_time_update_rate>  <!-- target 1 kHz -->
    <real_time_factor>1.0</real_time_factor>

    <ode>
      <solver>
        <type>quick</type>       <!-- quick (faster) or world (more accurate) -->
        <iters>50</iters>        <!-- constraint solver iterations -->
        <sor>1.3</sor>           <!-- successive over-relaxation factor -->
      </solver>
      <constraints>
        <cfm>0</cfm>             <!-- constraint force mixing (0 = rigid) -->
        <erp>0.2</erp>           <!-- error reduction parameter (0-1) -->
        <contact_max_correcting_vel>100</contact_max_correcting_vel>
        <contact_surface_layer>0.001</contact_surface_layer>
      </constraints>
    </ode>
  </physics>
</world>
```

**Contact and friction parameters per collision**:

```xml
<gazebo reference="wheel_link">
  <mu>0.8</mu>        <!-- Coulomb friction (static) -->
  <mu2>0.6</mu2>      <!-- friction in perpendicular direction -->
  <kp>1e6</kp>        <!-- contact stiffness (spring constant) -->
  <kd>100</kd>        <!-- contact damping -->
  <minDepth>0.001</minDepth>
  <maxVel>0.1</maxVel>
</gazebo>
```

**Contact model types**:

| Model | Description | Use when |
|-------|-------------|----------|
| Point contact | Single contact point per pair | Simple rigid bodies |
| Patch contact | Multiple contact points | Soft terrain, tires |
| Soft body | Deformable geometry | Grasping deformable objects |

**Common instability symptoms and fixes**:

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Objects "explode" on contact | Timestep too large | Reduce `max_step_size` to 0.0005 |
| Robot sinks into ground | `contact_surface_layer` too thick | Reduce to 0.0001 |
| Joints oscillate indefinitely | Low damping | Increase `<damping>` in joint `<dynamics>` |
| Slow simulation (RTF < 0.5) | Too many solver iterations | Reduce `iters` from 50 to 20 |

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Physics solver comparison**:

| Feature | ODE | Bullet | DART |
|---------|-----|--------|------|
| Algorithm | LCP (Lemke/PGS) | LCP (PGS) | Featherstone recursive NE |
| Articulated bodies | Maximal-coordinate | Maximal-coordinate | Reduced-coordinate |
| Soft-body support | No | Yes | No |
| Typical RTF | 1.0–2.0 | 0.8–1.5 | 0.5–1.2 |
| Accuracy for chains | Medium | Medium | High |
| Best for | General rigid bodies | Soft bodies, games | Humanoids, manipulators |

**DART (Dynamic Animation and Robotics Toolkit)** uses the **Featherstone recursive Newton-Euler** algorithm for articulated bodies. For an $n$-DOF chain, forward dynamics complexity is $O(n)$ vs $O(n^3)$ for maximal-coordinate methods. This matters for 30-DOF humanoids.

**Enable DART in Gazebo** (requires `gz-physics-dartsim-plugin`):

```xml
<plugin filename="gz-sim-physics-system"
        name="gz::sim::systems::Physics">
  <engine>
    <filename>gz-physics-dartsim-plugin</filename>
  </engine>
</plugin>
```

**Numerical integration stability** — Euler method for a mass-spring system:

$$x_{t+1} = x_t + h \cdot v_t, \quad v_{t+1} = v_t - h \cdot \frac{k}{m} x_t$$

The Euler method is stable only when the step size $h$ satisfies:

$$h < \frac{2}{\omega_n}, \quad \text{where } \omega_n = \sqrt{\frac{k}{m}}$$

For a stiff joint spring with $k = 10^6$ N/m and $m = 1$ kg, $\omega_n = 1000$ rad/s, requiring $h < 2$ ms. At $h = 0.001$ s (1 ms), the simulation is marginally stable — the reason Gazebo defaults to 1 ms and many robotics applications use 0.5 ms or lower.

**Energy conservation as a stability metric**: A well-configured physics simulation should conserve total mechanical energy (kinetic + potential) within 0.1% per second for a free-floating rigid body:

$$\epsilon = \frac{|E_{t} - E_0|}{E_0} < 0.001$$

Monitor this by subscribing to `/world/<name>/dynamic_pose/info` and computing kinetic energy from velocities and inertia tensors.

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. A robot is standing on a simulated floor but slowly sinking into it. What physical parameter is most likely misconfigured? What would you change?

2. You set the simulation timestep to 0.1 seconds (100 ms). A ball is dropped from 1 meter. Explain qualitatively why the simulated ball might not behave realistically at this timestep, compared to a 1 ms timestep.

### Intermediate

3. Your differential-drive robot turns correctly in the real world but spins in place in simulation (wheels are slipping). Write the SDF `<gazebo>` block for the wheel links with appropriate `mu`, `mu2`, `kp`, and `kd` values for a rubber wheel on a concrete floor. Justify your values.

4. The simulation real-time factor is 0.4 when running a 6-DOF arm. Without reducing accuracy unacceptably, propose three SDF parameter changes that could improve RTF. For each change, state the accuracy tradeoff.

### Advanced

5. A 7-DOF robotic arm uses ODE physics with the default Lemke solver and `iters=50`. At what number of degrees of freedom does the per-step computation cost of the maximal-coordinate approach become prohibitive (define "prohibitive" as RTF < 0.5 on a modern 4 GHz CPU)? Compare with DART's Featherstone algorithm.

6. The following SDF physics configuration is used for a humanoid robot: `max_step_size=0.005`, `iters=10`, `sor=1.3`. A joint with stiffness $k = 5 \times 10^5$ N/m and link mass $m = 2$ kg is being simulated. (a) Is the integration stable? Show the calculation. (b) If not, what is the maximum stable timestep? (c) What is the expected energy drift per second at the marginal stability boundary?
