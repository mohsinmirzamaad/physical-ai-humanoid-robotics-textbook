---
sidebar_position: 11
sidebar_label: "Summary & Exercises"
title: "Chapter 1 Summary and Exercises"
description: "Key takeaways from Chapter 1, chapter-wide exercises at all three audience levels, and further reading for Physical AI foundations."
keywords: [summary, exercises, physical AI, sensors, humanoid robotics, review]
audience_tiers: [beginner, intermediate, advanced]
week: 2
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Chapter 1 Summary and Exercises

---

## Key Takeaways

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

Here are the 10 most important ideas from this chapter:

1. **Physical AI = AI with a body.** Unlike software programs, Physical AI systems perceive and act in the real world, where mistakes have physical consequences.

2. **Physics can't be ignored.** Gravity, friction, and contact forces constrain what a robot can do. There is no "undo" button in the physical world.

3. **Your body is part of your intelligence.** The shape and weight of a robot's body determines what it can do — this is why the humanoid form factor enables tasks in human-designed environments.

4. **Humanoid robots exist because human spaces are designed for human bodies.** Doors, stairs, and tools are sized for us — a humanoid robot can use them without redesigning the environment.

5. **Robots can't see as clearly as we think.** Cameras lose depth information in a single image; LiDAR can't see color; IMUs drift. Every sensor has a weakness.

6. **Sensor fusion is the solution.** Combining multiple sensors lets robots compensate for each sensor's weaknesses. No single sensor is enough.

7. **Four sensors you must know:** LiDAR (3D point clouds), cameras (visual images), IMUs (orientation and motion), and force/torque sensors (contact forces).

8. **Speed matters.** A robot controller often runs 400–1000 times per second. AI that takes seconds to respond cannot balance a walking robot.

9. **Current humanoid robots include Atlas, Figure 01, and Unitree H1** — each with different designs and purposes, but all pursuing the goal of useful physical AI.

10. **This is just the beginning.** Every topic in this chapter has an entire research field behind it. You now have enough foundation to go deeper in any direction.



  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

Key technical concepts and their one-line definitions:

1. **Physical AI 5-tuple** $(S, A, O, T, \pi)$: state, action, observation spaces, physics-constrained transition function, and policy.

2. **Perception–action loop**: Sensors → State estimator → Policy → Actuators → Physical world → (repeat at 50–1000 Hz).

3. **Sim-to-real gap**: Policies trained in simulation fail on real hardware due to distribution shift, sensor noise differences, and contact dynamics mismatch.

4. **SE(3) transforms**: Every sensor measurement lives in a frame; transforms compose as $T_{WS} = T_{WB} \cdot T_{BS}$.

5. **LiDAR output**: $(N \times 4)$ float32 array — $[x, y, z, \text{intensity}]$ per point; up to 300,000 points/scan.

6. **Camera intrinsics**: Matrix $K$ with $(f_x, f_y, c_x, c_y)$; stereo depth $Z = fb/d$ with error growing as $Z^2$.

7. **IMU data**: 6-vector at 400–1000 Hz; accelerometer measures specific force $f = a - g$; gyroscope measures angular rate $\omega$.

8. **Quaternion**: $q = [w, x, y, z]$, $|q| = 1$ — the correct way to represent 3D orientation without gimbal lock.

9. **F/T sensor output**: 6-vector $[F_x, F_y, F_z, \tau_x, \tau_y, \tau_z]$; always gravity-compensate before using for contact detection.

10. **Impedance control**: Make the robot behave as $M_d \ddot{e} + D_d \dot{e} + K_d e = F_{ext}$ — a virtual spring-damper in Cartesian space.



  </TabItem>
  <TabItem value="advanced" label="Advanced">

Key equations and results — bookmark these for Chapter 2:

1. **SE(3) transform**: $T = \begin{bmatrix} R & p \\ 0 & 1 \end{bmatrix}$, $T^{-1} = \begin{bmatrix} R^T & -R^T p \\ 0 & 1 \end{bmatrix}$

2. **Kalman gain** (1D): $K = P^- / (P^- + R)$; optimal MSE estimator.

3. **LiDAR range model**: $z = d + \eta$, $\eta \sim \mathcal{N}(0, \sigma_r^2)$, $\sigma_r = c\sigma_t/2$.

4. **ICP objective**: $T^* = \arg\min_{T} \sum_i \|p_i - Tq_i\|^2$; solved by SVD of cross-covariance.

5. **Camera projection**: $\lambda\tilde{x} = K[R|t]\tilde{X}$; stereo depth error $\sigma_Z = Z^2\sigma_d/(fb)$.

6. **IMU kinematics**: $\dot{p}=v$; $\dot{v} = R(f-b_a)+g$; $\dot{q} = \frac{1}{2}q \otimes [0, \omega-b_g]$.

7. **IMU position drift**: $\text{Var}(p(T)) = \sigma_f^2 T^3/3$ — grows as $T^{3/2}$ in standard deviation.

8. **F/T measurement model**: $\mathbf{w}_m = C\mathbf{w} + \mathbf{b} + \mathbf{n}$; calibrated via least squares.

9. **Impedance control**: $\tau = J^T F_{control} + g_{joint}$, where $F_{control}$ includes inertia shaping via $\Lambda$.

10. **Operational space inertia**: $\Lambda = (JM^{-1}J^T)^{-1}$; eigenvalues encode directional inertia of the end-effector.

**→ Chapter 2 preview**: You will implement a full state estimator (EKF fusing IMU + LiDAR), run a humanoid simulation in MuJoCo, and deploy your first locomotion policy.



  </TabItem>
</Tabs>

---

## Concept Map

The following shows how the major topics of Chapter 1 connect:

```
Physical AI
├── Embodied Intelligence
│   ├── Morphological computation → passive dynamics, body design
│   ├── SE(3) coordinate frames → sensor data pipelines
│   └── Proprioception vs. exteroception → sensor taxonomy
├── Digital → Physical AI transition
│   ├── Real-time constraints → control loop frequency
│   ├── Sensor noise → Kalman filter, state estimation
│   └── Sim-to-real gap → domain randomization, VIO
├── Humanoid Robotics Landscape
│   ├── Atlas (hydraulic) → whole-body control research
│   ├── Figure 01 (electric SEA) → manufacturing
│   └── Unitree H1 (QDD) → research / open platform
└── Sensor Systems
    ├── LiDAR → point clouds → ICP → SLAM
    ├── Cameras → pinhole model → stereo → VIO
    ├── IMUs → kinematics → quaternion → preintegration
    └── F/T sensors → wrench → gravity comp. → impedance control
```

---

## Chapter Exercises

### Beginner Exercises

**B1.** A robot vacuum cleaner uses bump sensors (simple contact switches) and wheel encoders (measure how far each wheel has turned) to navigate. A new "intelligent" vacuum also adds a camera.
- (a) Classify each sensor as proprioceptive or exteroceptive.
- (b) Why might the camera-equipped vacuum perform better in an unfamiliar home?
- (c) What is one situation where the camera would not help but a LiDAR would?

**B2.** Match each physical challenge to the sensor best suited to detect it:
- (i) The robot is tilting forward and about to fall
- (ii) There is a glass door 2 meters ahead
- (iii) The robot is gripping a cup too tightly
- (iv) There is a person 5 meters to the left
- Sensors available: IMU, LiDAR, stereo camera, F/T sensor at wrist

**B3.** A self-driving car AI is trained entirely in video-game-style simulation and then deployed on real streets. List four specific ways the real world might differ from the simulation that could cause the system to fail. For each, name one approach engineers might use to reduce the problem.

**B4.** Explain the two-week structure of this chapter to a friend: what did Week 1 cover and what did Week 2 cover? Why does this order make sense?

**B5.** In your own words, describe why humanoid robots are considered harder to build than industrial robot arms, even though factory robot arms can lift hundreds of kilograms. Consider: degrees of freedom, balance, sensor requirements, and task variety.

---

### Intermediate Exercises

**I1.** A wheeled robot knows its wheel odometry (integration of wheel speeds) gives position error of $\sigma_{odom} = 0.5$ m after 30 seconds. A GPS sensor gives position with $\sigma_{GPS} = 0.3$ m. Both measurements are at the same moment.
- (a) Compute the fused position uncertainty $\sigma_{fused}$.
- (b) If the robot also has a LiDAR-based localization system with $\sigma_{lidar} = 0.1$ m, compute the three-sensor fused uncertainty (fuse GPS and LiDAR first, then fuse with odometry).
- (c) Plot (or sketch) how $\sigma_{fused}$ decreases as more sensors are added, and interpret what this suggests about sensor fusion in practice.

**I2.** You have a LiDAR with focal length (angular resolution) of 0.2° and baseline (for depth computation) is not applicable (LiDAR is a range sensor). Instead, the range noise is $\sigma_r = 0.02$ m.
- (a) At range $d = 5$ m, what is the lateral position uncertainty of a point in the point cloud (in meters)?
- (b) If you are using this LiDAR for ICP-based localization, and the ICP converges with mean correspondence distance of 0.05 m, how many corresponding points $N$ are needed to achieve a translation estimate with $\sigma_{estimate} < 0.01$ m? (Use $\sigma_{estimate} \approx \sigma_r / \sqrt{N}$.)
- (c) Extend the `filter_by_range` function from Section 1.6 to also filter points by height (keep only points with $z \in [-0.5, 2.0]$ m from sensor origin) and write the updated Python function.

**I3.** Write a Python function `stereo_pipeline(image_L, image_R, K, baseline)` that:
- Takes two $H \times W$ grayscale images and camera parameters
- Computes a simplified horizontal disparity map (use absolute difference per pixel row as a proxy)
- Converts disparity to depth using $Z = fb/d$
- Returns the depth map and a mask of valid pixels (where disparity > 1 px)
Include type annotations and docstring. You may use NumPy only.

**I4.** A humanoid robot's IMU reports the following 5 readings over 5 ms (at 1000 Hz), all in body frame:
```
t=0ms: accel=[0.1, -0.05, 9.85], gyro=[0.01, -0.02, 0.05]
t=1ms: accel=[0.2, -0.03, 9.78], gyro=[0.01, -0.01, 0.06]
t=2ms: accel=[0.3,  0.00, 9.80], gyro=[0.02,  0.00, 0.06]
t=3ms: accel=[0.2,  0.02, 9.82], gyro=[0.01,  0.01, 0.05]
t=4ms: accel=[0.1,  0.01, 9.81], gyro=[0.00,  0.00, 0.05]
```
Starting from identity orientation $q_0 = [1, 0, 0, 0]$ and zero velocity:
- (a) Integrate the gyroscope readings using the `gyro_integration_step` function from Section 1.8 to estimate the final orientation quaternion.
- (b) Compute the net velocity change using $\Delta v \approx \sum_k R(q_k)(f_k - g) \Delta t$, approximating $g = [0, 0, 9.81]$ m/s² in body frame at each step.
- (c) Comment on whether this robot appears to be accelerating, decelerating, or maintaining constant velocity in the horizontal plane.

**I5.** Design a sensor suite for a humanoid robot that must: (a) navigate a dark warehouse at night, (b) pick up boxes of unknown weight, and (c) avoid collisions with moving forklifts. For each capability, specify which sensors you would choose, where on the robot they would be placed, and at what update rate they must run. Justify each choice in 1–2 sentences.

---

### Advanced Exercises

**A1.** **Factor graph SLAM formulation**: A robot executes a path with 5 keyframes $\{x_0, x_1, x_2, x_3, x_4\}$ (2D poses: $[x, y, \theta]$). The following relative pose measurements are available (with noise $\sigma = 0.05$ m, $\sigma_\theta = 0.02$ rad):
- Odometry: $(x_0 \to x_1)$, $(x_1 \to x_2)$, $(x_2 \to x_3)$, $(x_3 \to x_4)$
- Loop closure: $(x_4 \to x_0)$ detected via LiDAR scan matching

Set up the factor graph. Write the nonlinear least squares objective $F = \sum_{(i,j)} \|h_{ij}(x_i, x_j) - z_{ij}\|^2_{\Omega_{ij}}$ in expanded form. Explain: (a) Why is $x_0$ typically fixed (anchored) in the optimization? (b) How does the loop closure constraint affect the uncertainty of all poses?

**A2.** **Visual-Inertial Odometry (VIO) state design**: You are designing the state vector for a tightly-coupled VIO system (camera + IMU). The state must include robot pose, velocity, IMU biases, and the 3D positions of $N$ observed landmarks.
- (a) Write the full state vector $\mathbf{x}$ and its dimension as a function of $N$.
- (b) Write the IMU factor residual $r_{IMU}$ in terms of preintegrated quantities $\Delta R_{ij}, \Delta v_{ij}, \Delta p_{ij}$ and keyframe states $(R_i, v_i, p_i, b_i)$ and $(R_j, v_j, p_j, b_j)$.
- (c) Write the reprojection factor residual $r_{cam}$ for one landmark observed in keyframe $j$.
- (d) What is the computational complexity of one Gauss-Newton update if you use the Schur complement to marginalize out the $N$ landmark positions? Express in terms of $N$ and the state dimension $d_x$ (pose + velocity + biases).

**A3.** **Impedance stability analysis**: An impedance controller with parameters $(M_d, D_d, K_d)$ interacts with an environment of stiffness $K_{env}$. The closed-loop contact dynamics (1D) are:

$$M_d \ddot{e} + D_d \dot{e} + (K_d + K_{env}) e = 0$$

- (a) Find the characteristic equation and the condition on $D_d$ for critical damping as a function of $M_d$, $K_d$, and $K_{env}$.
- (b) Show that if $K_{env} \to \infty$ (rigid wall), the system becomes unstable unless $D_d \to \infty$. Interpret this physically.
- (c) For $M_d = 2$ kg, $K_d = 200$ N/m, $K_{env} = 5000$ N/m, compute the critically damped $D_d$ and the resulting natural frequency $\omega_n$. Is this a realistic damping value for an electric actuator?

**A4.** **Sensor information geometry**: Three sensors independently estimate a robot's 1D position with Gaussian likelihoods: sensor A ($\mu_A = 2.0$ m, $\sigma_A = 0.1$ m), sensor B ($\mu_B = 1.9$ m, $\sigma_B = 0.2$ m), sensor C ($\mu_C = 2.15$ m, $\sigma_C = 0.05$ m).
- (a) Fuse all three sensors optimally using the information matrix approach.
- (b) Compute the posterior mean and variance.
- (c) One of the sensors might be producing an outlier. Use the Mahalanobis distance from the fused estimate to identify which sensor's reading is most anomalous, and explain how you would handle it in a robust estimator (e.g., RANSAC or M-estimators).

**A5.** **IMU preintegration covariance**: The IMU preintegration covariance grows with the number of IMU samples $K$ between keyframes. Given: accelerometer noise $\sigma_a = 0.02$ m/s²/√Hz at 400 Hz ($\sigma_{a,d} = \sigma_a / \sqrt{\Delta t}$ where $\Delta t = 1/400$), and gyroscope noise $\sigma_g = 0.001$ rad/s/√Hz.
- (a) Compute the discrete accelerometer and gyroscope noise standard deviations $\sigma_{a,d}$ and $\sigma_{g,d}$.
- (b) If the robot moves at 1 m/s for 1 second (400 IMU samples between keyframes), what is the standard deviation of the preintegrated velocity $\Delta v_{ij}$ due to accelerometer white noise alone?
- (c) How does this compare to the sensor spec sheet noise floor? (Hint: $\text{Var}(\Delta v) = K \cdot \sigma_{a,d}^2 \cdot \Delta t^2$.) What is the dominant error source for long time intervals?

---

## Further Reading

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

**Getting started — no prerequisites needed:**

- [MIT OpenCourseWare — Introduction to Robotics (freely available)](https://ocw.mit.edu/) — Search for "6.832 Underactuated Robotics" for video lectures that build on this chapter's concepts
- **Boston Dynamics YouTube channel** — Watch Atlas, Spot, and Stretch performing real tasks; pay attention to how the robots respond to being pushed (balance control) and pick up objects (manipulation with force feedback)
- **"A Brief History of Robots" (IEEE Spectrum)** — A readable survey of how robots evolved from simple industrial arms to today's humanoids; free online at spectrum.ieee.org

<div></div>



  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Building practical skills:**

- **Lynch, K.M. & Park, F.C. "Modern Robotics: Mechanics, Planning, and Control"** — Available free at modernrobotics.org; Chapter 4 covers forward kinematics and the SE(3) material from Section 1.2 in full detail
- **MIT 6.832 Lecture Notes (Russ Tedrake)** — Available at underactuated.mit.edu; the "Simple Models of Walking" chapter gives rigorous foundation for the balance concepts introduced in Section 1.4
- **Unitree H1 SDK documentation** — Unitree Robotics provides open documentation for interfacing with their robots; reading the IMU and joint sensor interfaces connects directly to Sections 1.5–1.8

<div></div>


  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Primary literature:**

- Forster, C. et al. **"On-Manifold Preintegration for Real-Time Visual-Inertial Odometry."** *IEEE Transactions on Robotics*, 33(1), 2017. — The definitive paper on IMU preintegration (Section 1.8 advanced).
- Zhang, J. & Singh, S. **"LOAM: Lidar Odometry and Mapping in Real-time."** *RSS 2014*. — The foundational LiDAR odometry method; understand the feature extraction and factor graph from Section 1.6.
- Hartley, R. & Zisserman, A. **"Multiple View Geometry in Computer Vision."** Cambridge, 2004. Chapters 6–9. — The rigorous treatment of camera geometry from Section 1.7.
- Hogan, N. **"Impedance Control: An Approach to Manipulation."** *ASME JDS&C*, 107(1), 1985. — The original impedance control paper from Section 1.9; still the clearest derivation.
- Kuindersma, S. et al. **"Optimization-based locomotion planning, estimation, and control design for the Atlas humanoid robot."** *Autonomous Robots*, 40(3), 2016. — How all the sensors in this chapter work together on a real humanoid robot.

<div></div>


  </TabItem>
</Tabs>

---

## What's Next: Chapter 2 Preview

Chapter 2, **"State Estimation and Perception Pipelines"**, takes everything in this chapter and connects it to running code. You will:

- Implement an **Extended Kalman Filter (EKF)** that fuses IMU readings with LiDAR odometry to produce a smooth 6-DOF pose estimate at 400 Hz
- Set up a **MuJoCo simulation** of a simplified humanoid model with IMU, stereo camera, and F/T sensors
- Write a **sensor calibration pipeline** that estimates the extrinsic transforms between your sensors automatically from calibration sequences
- Run your first **whole-body controller** that uses all four sensor modalities simultaneously

The gap between Chapter 1 (concepts) and Chapter 2 (implementation) is intentionally large: you now have the vocabulary and the intuition. Chapter 2 will give you the code.
