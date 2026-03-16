---
sidebar_position: 7
sidebar_label: "LiDAR"
title: "LiDAR: Light Detection and Ranging"
description: "LiDAR operating principles, point cloud data format, range measurement noise model, and use in humanoid robot localization and mapping."
keywords: [LiDAR, point cloud, SLAM, ICP, time-of-flight, range sensor]
audience_tiers: [beginner, intermediate, advanced]
week: 2
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# LiDAR: Light Detection and Ranging

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Explain in plain language how LiDAR measures distance using the bat-sonar analogy
    - Describe what a "point cloud" is and sketch what one might look like
    - Name two real-world situations where LiDAR is better than a camera, and two where it is worse
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Distinguish time-of-flight (ToF) and FMCW LiDAR operating principles
    - Describe the $(x, y, z, \text{intensity})$ point cloud format and explain the role of extrinsic calibration
    - Write Python code to load and process a point cloud as a NumPy array
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Derive the LiDAR range measurement noise model from ToF timing jitter
    - State the ICP (Iterative Closest Point) objective and implement the nearest-neighbor matching step
    - Explain how LiDAR odometry fits into a factor graph SLAM formulation
  </TabItem>
</Tabs>

---

## How LiDAR Works

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

You might know that bats navigate in the dark by emitting high-pitched squeaks and listening for the echoes. When the squeak bounces off a wall, the bat hears it a fraction of a second later and instinctively knows: *the wall is close*. When the echo takes longer, the wall is far away.

LiDAR does exactly the same thing — but with laser pulses instead of sound, and at the speed of light instead of the speed of sound.

:::info[Key Term]
**LiDAR** (Light Detection and Ranging): A sensor that fires brief pulses of infrared laser light and measures how long each pulse takes to return after bouncing off a surface. Because light travels at a known speed ($3 \times 10^8$ m/s), the travel time directly gives the distance.
:::

A single laser fires thousands of pulses per second in different directions. Each pulse gives one distance measurement — one dot in space. Together, these dots form a **point cloud**: a 3D picture of everything the laser can "see," rendered as a scatter of points.

:::info[Key Term]
**Point cloud**: A collection of 3D points, each representing a surface that a laser pulse bounced off. A typical automotive LiDAR produces 100,000–1,000,000 points per second.
:::

**Where LiDAR excels**:
- Precise 3D distance measurement regardless of lighting (works in darkness)
- Wide field of view (up to 360° for spinning LiDARs)
- Long range (automotive LiDARs: up to 200m)

**Where LiDAR struggles**:
- Cannot detect color, texture, or text
- Struggles with transparent surfaces (glass, water)
- Degraded in heavy rain, fog, or dust (laser light scatters)
- More expensive than cameras ($200–$75,000 depending on type)

<div></div>

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**Two LiDAR operating principles**:

*Time-of-Flight (ToF)*: The sensor emits a short laser pulse and measures the time $\Delta t$ until the return pulse is detected. Distance:

$$d = \frac{c \cdot \Delta t}{2}$$

where $c = 3 \times 10^8$ m/s and the factor of 2 accounts for the round trip. ToF is simple, robust, and widely used (Velodyne VLP-16, Ouster OS0, Unitree 4D LiDAR L1).

*FMCW (Frequency-Modulated Continuous Wave)*: Instead of a pulsed laser, FMCW emits a continuous wave whose frequency varies linearly with time (a "chirp"). The distance is encoded in the frequency difference between the emitted and received signal. FMCW additionally provides radial velocity (Doppler) without post-processing. Advantages: inherently immune to interference from other LiDARs; provides velocity in one shot.

**Point cloud format**: Each point is typically stored as a 4-tuple:

$$[x, \; y, \; z, \; \text{intensity}]$$

- $(x, y, z)$ in meters, in the LiDAR sensor frame $\mathcal{F}_S$
- $\text{intensity}$: return signal strength (float, 0–1 normalized), correlates with surface reflectivity

Storage: NumPy array of shape $(N, 4)$, float32. For a 32-beam spinning LiDAR at 10 Hz: $N \approx 300,000$ points/scan.

**Key parameters**:

| Parameter | Typical range | Effect |
|-----------|--------------|--------|
| Angular resolution | 0.1°–0.5° | Denser at small angles → finer spatial discrimination |
| Range | 5–200 m | Longer range → detect obstacles earlier |
| Scan rate | 10–20 Hz (spinning), 20–30 Hz (solid-state) | Faster → lower motion distortion |
| Number of beams (spinning) | 16–128 | More beams → denser vertical coverage |

**Extrinsic calibration**: LiDAR returns points in its own sensor frame. To use them for navigation (in world frame), you need $T_{WB}$ (robot pose) and $T_{BS}$ (LiDAR-to-body transform). The LiDAR-to-body transform is measured carefully at installation — even a 1° rotation error causes a 3.5-cm misalignment at 2 m range.

**Use on humanoids**: Unitree H1 uses a solid-state LiDAR (short range, wide field of view) for SLAM (Simultaneous Localization and Mapping) — building a map of the environment while estimating the robot's position within it.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Range measurement noise model**:

The ToF range measurement is:

$$z = d + \eta, \quad \eta \sim \mathcal{N}(0, \sigma_r^2)$$

The noise standard deviation $\sigma_r$ arises from timing jitter in the photodetector:

$$\sigma_r = \frac{c \cdot \sigma_t}{2}$$

where $\sigma_t$ is the timing uncertainty (jitter) of the time-to-digital converter. For a high-end LiDAR: $\sigma_t \approx 100$ ps → $\sigma_r \approx 1.5$ cm. Additional noise sources: ambient light (photon shot noise proportional to $\sqrt{I_{ambient}}$), surface reflectivity ($\sigma_r$ increases for dark or oblique surfaces).

**Iterative Closest Point (ICP)**: Given two point clouds $\mathcal{P} = \{p_i\}$ (target) and $\mathcal{Q} = \{q_i\}$ (source), ICP finds the rigid transform $T^* \in SE(3)$ that aligns $\mathcal{Q}$ to $\mathcal{P}$:

$$T^* = \arg\min_{T \in SE(3)} \sum_{i} \|p_i - T q_i\|^2$$

ICP iterates two steps:
1. **Correspondence**: for each $q_i$, find the nearest neighbor $p_{j(i)}$ in $\mathcal{P}$
2. **Alignment**: solve the closed-form optimal $T$ for the current correspondences (SVD of the cross-covariance matrix)

The closed-form solution for step 2: let $\bar{p}, \bar{q}$ be centroids, $H = \sum_i (q_i - \bar{q})(p_{j(i)} - \bar{p})^T$, then SVD: $H = U \Sigma V^T$, optimal rotation $R^* = V U^T$, translation $t^* = \bar{p} - R^* \bar{q}$.

**SLAM factor graph**: In graph-based SLAM, the robot's trajectory is a sequence of poses $\{x_1, x_2, \ldots, x_T\}$. LiDAR odometry provides relative pose constraints $h(x_t, x_{t+1}) = T_{t \to t+1}$ with covariance $\Omega_{t,t+1}$. Loop closures (when the robot revisits a place) add additional constraints. The graph is solved by minimizing:

$$F = \sum_{(i,j) \in \mathcal{E}} (h_{ij} \ominus T_{ij})^T \Omega_{ij} (h_{ij} \ominus T_{ij})$$

where $\ominus$ denotes pose composition in $SE(3)$, using sparse nonlinear least squares (g2o, GTSAM).

> **Reference**: Zhang, J. & Singh, S. "LOAM: Lidar Odometry and Mapping in Real-time." *RSS 2014*.

  </TabItem>
</Tabs>

---

## Code Examples

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

*No code required at the beginner level for this section.*

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

```python title="Loading and processing a LiDAR point cloud"
import numpy as np

def make_synthetic_point_cloud(n_points: int = 1000, seed: int = 42) -> np.ndarray:
    """
    Create a synthetic point cloud (N, 4): [x, y, z, intensity].
    Simulates a flat floor + a box obstacle at x=2m.
    """
    rng = np.random.default_rng(seed)
    pts = []

    # Floor points: z ~ 0, scattered in x-y
    n_floor = n_points // 2
    xy = rng.uniform(-3.0, 3.0, (n_floor, 2))
    z  = rng.normal(0.0, 0.01, (n_floor, 1))     # floor height noise
    intensity = rng.uniform(0.3, 0.6, (n_floor, 1))  # concrete reflectivity
    pts.append(np.hstack([xy, z, intensity]))

    # Box obstacle at x=2, y in [-0.5, 0.5], z in [0, 0.8]
    n_box = n_points - n_floor
    x = rng.uniform(1.95, 2.05, (n_box, 1))      # box face (2m away)
    y = rng.uniform(-0.5, 0.5, (n_box, 1))
    z = rng.uniform(0.0, 0.8, (n_box, 1))
    intensity = rng.uniform(0.7, 0.9, (n_box, 1))    # bright box surface
    pts.append(np.hstack([x, y, z, intensity]))

    cloud = np.vstack(pts).astype(np.float32)
    return cloud

def filter_by_range(cloud: np.ndarray, min_r: float, max_r: float) -> np.ndarray:
    """Keep only points within [min_r, max_r] meters from the sensor origin."""
    ranges = np.linalg.norm(cloud[:, :3], axis=1)
    mask = (ranges >= min_r) & (ranges <= max_r)
    return cloud[mask]

cloud = make_synthetic_point_cloud(n_points=2000)
print(f"Total points: {len(cloud)}")
print(f"Point cloud shape: {cloud.shape}  (N x [x, y, z, intensity])")
print(f"X range: [{cloud[:, 0].min():.2f}, {cloud[:, 0].max():.2f}] m")
print(f"Z range: [{cloud[:, 2].min():.2f}, {cloud[:, 2].max():.2f}] m")

# Filter to 0.5–5.0 m range
nearby = filter_by_range(cloud, min_r=0.5, max_r=5.0)
print(f"\nAfter range filter [0.5–5.0 m]: {len(nearby)} points remain")
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

```python title="ICP nearest-neighbor matching step"
import numpy as np

def find_nearest_neighbors(source: np.ndarray, target: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    For each point in source (N x 3), find its nearest neighbor in target (M x 3).
    Returns:
      correspondences: (N x 3) matched target points
      distances:       (N,) Euclidean distances to matched points
    Complexity: O(N*M) — adequate for demonstration; use KD-tree for production.
    """
    correspondences = np.zeros_like(source)
    distances = np.zeros(len(source))

    for i, src_pt in enumerate(source):
        diffs = target - src_pt             # (M, 3)
        dists = np.linalg.norm(diffs, axis=1)  # (M,)
        idx = np.argmin(dists)
        correspondences[i] = target[idx]
        distances[i] = dists[idx]

    return correspondences, distances

def icp_step(source: np.ndarray, target: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    One ICP iteration: find correspondences, then compute optimal rigid transform.
    Returns: R (3x3 rotation), t (3-vector translation).
    """
    matched_target, dists = find_nearest_neighbors(source, target)
    mean_dist = np.mean(dists)

    # Compute centroids
    src_bar = source.mean(axis=0)
    tgt_bar = matched_target.mean(axis=0)

    # Cross-covariance matrix H
    A = source - src_bar
    B = matched_target - tgt_bar
    H = A.T @ B                          # (3, 3)

    # SVD and optimal rotation
    U, _, Vt = np.linalg.svd(H)
    R = Vt.T @ U.T

    # Handle reflection case (det(R) should be +1)
    if np.linalg.det(R) < 0:
        Vt[-1, :] *= -1
        R = Vt.T @ U.T

    t = tgt_bar - R @ src_bar
    return R, t, mean_dist

# --- Demo: align a rotated copy of a point cloud ---
rng = np.random.default_rng(0)
target = rng.standard_normal((50, 3)).astype(np.float32)

# Source = target rotated by 15° about z-axis + small translation
theta = np.radians(15)
R_true = np.array([[np.cos(theta), -np.sin(theta), 0],
                   [np.sin(theta),  np.cos(theta), 0],
                   [0, 0, 1]], dtype=np.float32)
t_true = np.array([0.1, 0.05, 0.0], dtype=np.float32)
source = (R_true @ target.T).T + t_true

print("Running ICP (3 iterations):")
src_current = source.copy()
for iteration in range(3):
    R, t, mean_dist = icp_step(src_current, target)
    src_current = (R @ src_current.T).T + t
    print(f"  Iter {iteration+1}: mean correspondence dist = {mean_dist:.6f} m")
```

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. Imagine you are designing a delivery robot that must navigate both a well-lit warehouse interior and an outdoor loading dock at night. Explain in plain language: (a) why you would use LiDAR rather than (or in addition to) cameras for this robot, and (b) one scenario in the loading dock where LiDAR might still struggle, and what you might do to compensate.

### Intermediate

2. A solid-state LiDAR has an angular resolution of 0.2° horizontally and 0.1° vertically, a field of view of 120° × 30°, and runs at 25 Hz. (a) How many beams fire per scan? (b) If the sensor is 1.5 m off the ground and pointing horizontally forward, what is the footprint (in meters) at 10 m range of the smallest object the LiDAR can resolve? (c) Write Python pseudocode (in `text` blocks, not executable Python) that converts a LiDAR scan from sensor frame to a 2D top-down occupancy grid with 0.1 m cell size.

### Advanced

3. **ICP covariance propagation**: After running ICP to estimate a pose transform $T^* = (R^*, t^*)$, you want to know the uncertainty in $T^*$. Starting from the ICP objective $F = \sum_i \|p_i - T q_i\|^2$ and treating the matched pairs as fixed, derive an expression for the covariance of the optimal pose estimate $\text{Cov}(\hat{T})$ in terms of the Jacobian of the residuals with respect to the pose parameters and the measurement noise variance $\sigma_r^2$. (Use the linear approximation: $\text{Cov}(\hat{T}) \approx \sigma_r^2 (J^T J)^{-1}$ and explain what each term represents.)
