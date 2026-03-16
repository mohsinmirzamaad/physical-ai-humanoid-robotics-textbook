---
sidebar_position: 8
sidebar_label: "Cameras"
title: "Cameras: Visual Perception"
description: "Camera types for robotics (monocular, stereo, RGB-D), pinhole camera model, stereo depth estimation, and epipolar geometry."
keywords: [camera, stereo vision, RGB-D, pinhole model, epipolar geometry, visual odometry]
audience_tiers: [beginner, intermediate, advanced]
week: 2
chapter: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Cameras: Visual Perception

## Learning Objectives

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">
    By the end of this section, you will be able to:
    - Describe the three main types of robot cameras and what each one provides
    - Explain in one sentence why a single camera cannot directly measure depth
    - Give two examples of tasks a humanoid robot performs using cameras
  </TabItem>
  <TabItem value="intermediate" label="Intermediate">
    By the end of this section, you will be able to:
    - Apply the stereo depth formula $Z = fb/d$ to compute depth from disparity
    - Describe the pinhole camera model and identify its four intrinsic parameters
    - Write Python code to project 3D points to an image plane using the intrinsic matrix $K$
  </TabItem>
  <TabItem value="advanced" label="Advanced">
    By the end of this section, you will be able to:
    - Write the full projective camera model in homogeneous coordinates
    - Derive the stereo depth error $\sigma_Z = Z^2 \sigma_d / (fb)$ and interpret its implications
    - Define the fundamental matrix $F$ and the epipolar constraint $x'^T F x = 0$
  </TabItem>
</Tabs>

---

## How Robot Cameras Work

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

A camera works the same way your eye does: light from the scene enters through a lens and falls on a grid of light-sensitive elements (pixels). Each pixel records how bright and what color the light was at that point. The result is a 2D image — a flat snapshot of the 3D world.

The challenge for robots is that a single 2D image loses depth information. If you look at a photo of a cup on a table, you know intuitively how far the cup is — because you've handled thousands of cups and know their size. A robot doesn't have that intuition, so it needs extra information to recover depth.

**Three types of robot cameras**:

:::info[Key Term]
**Monocular camera**: A single camera producing a standard 2D color image. Fast and cheap, but depth must be inferred indirectly (from motion, known object sizes, or learning).
:::

:::info[Key Term]
**Stereo camera**: Two cameras side by side, like human eyes. By comparing the two slightly different images, the robot can compute depth directly — just as your brain uses the difference between what your left and right eyes see.
:::

:::info[Key Term]
**RGB-D camera**: A camera that captures both color (RGB) and depth (D) simultaneously, usually using an infrared projector. The Microsoft Kinect and Intel RealSense are examples. Popular for indoor manipulation.
:::

**What humanoid robots do with cameras**:
- Recognize and locate objects to pick up (manipulation)
- Navigate corridors, avoid obstacles, find doors
- Read labels, signs, and displays
- Track human gestures and faces for safe collaboration
- Monitor the robot's own hands during dexterous tasks (Figure 01 uses wrist cameras)

**Limitations**:
- Fail in low light (need active illumination)
- Monocular cameras cannot directly measure depth
- High computational cost for real-time image processing
- Rain, dust, and dirty lenses cause failures

<div></div>

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

**The pinhole camera model**: The simplest useful model treats the camera as a tiny pinhole that projects 3D world points onto a 2D image plane. A 3D point $(X, Y, Z)$ in camera coordinates maps to image pixel $(u, v)$ via:

$$u = f_x \frac{X}{Z} + c_x, \qquad v = f_y \frac{Y}{Z} + c_y$$

The **intrinsic matrix** $K$ collects these four parameters:

$$K = \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix}$$

| Parameter | Meaning | Typical value |
|-----------|---------|---------------|
| $f_x$ | Focal length in x (pixels) | 500–1000 px |
| $f_y$ | Focal length in y (pixels) | 500–1000 px |
| $c_x$ | Principal point x (horizontal image center) | $W/2$ px |
| $c_y$ | Principal point y (vertical image center) | $H/2$ px |

**Stereo depth from disparity**: A stereo camera has two cameras separated by a **baseline** $b$ (typically 5–20 cm). For a 3D point, each camera sees it at a slightly different horizontal position. The difference is the **disparity** $d$ (pixels):

$$Z = \frac{f \cdot b}{d}$$

Depth $Z$ is inversely proportional to disparity: large disparity → close object; small disparity → far object.

**Image tensor format**:
- RGB image: $(H, W, 3)$ array, dtype `uint8` (values 0–255) or `float32` (values 0.0–1.0 normalized)
- Depth image: $(H, W)$ array, dtype `float32`, values in meters
- RGB-D: $(H, W, 4)$ — channels are $[R, G, B, D]$

**Use in humanoids**: Figure 01 uses RGB-D cameras in the head and torso for manipulation. The head cameras provide a wide-angle view of the workspace; wrist cameras give close-up views for precise grasping.

  </TabItem>
  <TabItem value="advanced" label="Advanced">

**Full projective camera model**: In homogeneous coordinates, a 3D world point $\tilde{X} = [X, Y, Z, 1]^T$ projects to image point $\tilde{x} = [u, v, 1]^T$ via:

$$\lambda \tilde{x} = K [R \mid t] \tilde{X}$$

where $\lambda = Z$ (the depth), $K$ is the intrinsic matrix, and $[R \mid t]$ is the $3 \times 4$ extrinsic matrix encoding the camera's pose in the world frame.

**Lens distortion**: Real lenses introduce radial and tangential distortion. The distorted coordinates $(x_d, y_d)$ relate to the undistorted normalized coordinates $(x, y) = (X/Z, Y/Z)$ via:

$$x_d = x(1 + k_1 r^2 + k_2 r^4 + k_3 r^6) + 2p_1 xy + p_2(r^2 + 2x^2)$$
$$y_d = y(1 + k_1 r^2 + k_2 r^4 + k_3 r^6) + p_1(r^2 + 2y^2) + 2p_2 xy$$

where $r^2 = x^2 + y^2$, $k_1, k_2, k_3$ are radial distortion coefficients, and $p_1, p_2$ are tangential distortion coefficients. Calibration recovers $(K, k_1, k_2, k_3, p_1, p_2)$ from a set of known calibration targets.

**Stereo depth error analysis**: From $Z = fb/d$:

$$\frac{dZ}{dd} = -\frac{fb}{d^2} = -\frac{Z^2}{fb}$$

If disparity is estimated with standard deviation $\sigma_d$ (typically 0.5–1 pixel):

$$\sigma_Z = \left|\frac{dZ}{dd}\right| \sigma_d = \frac{Z^2}{f b} \sigma_d$$

**Key insight**: depth error grows *quadratically* with distance. At $Z = 1$ m: $\sigma_Z \approx 1$ cm. At $Z = 5$ m: $\sigma_Z \approx 25$ cm. This is why stereo cameras are used for close-range manipulation and RGB-D for room-scale navigation.

**Epipolar geometry**: For a stereo pair with fundamental matrix $F \in \mathbb{R}^{3 \times 3}$, any pair of corresponding points $(x, x')$ in the two images satisfies:

$$x'^T F x = 0$$

The essential matrix $E = [t]_\times R$ relates metric (calibrated) coordinates, while $F = K'^{-T} E K^{-1}$ handles pixel coordinates. Epipolar constraint reduces stereo matching from a 2D search to a 1D search along the epipolar line — essential for real-time stereo.

> **Reference**: Hartley, R. & Zisserman, A. "Multiple View Geometry in Computer Vision," 2nd ed. Cambridge University Press, 2004. Chapters 6–9.

  </TabItem>
</Tabs>

---

## Code Examples

<Tabs groupId="audience-tier" queryString>
  <TabItem value="beginner" label="Beginner">

*No code required at the beginner level for this section.*

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

```python title="Projecting 3D points to image plane using intrinsic matrix K"
import numpy as np

def project_points(
    points_3d: np.ndarray,
    K: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Project 3D points (N x 3) in camera frame to image pixels (N x 2).
    K: 3x3 intrinsic matrix. Returns (pixels, valid_mask).
    Only points with Z > 0 (in front of camera) are valid.
    """
    X, Y, Z = points_3d[:, 0], points_3d[:, 1], points_3d[:, 2]
    valid = Z > 0.0

    u = np.where(valid, K[0, 0] * X / Z + K[0, 2], np.nan)
    v = np.where(valid, K[1, 1] * Y / Z + K[1, 2], np.nan)

    return np.column_stack([u, v]), valid

# --- Camera intrinsics (typical 640x480 RGB camera) ---
K = np.array([[525.0,   0.0, 319.5],
              [  0.0, 525.0, 239.5],
              [  0.0,   0.0,   1.0]])

# 3D points in camera frame: a box at 1.5m distance
points_3d = np.array([
    [ 0.0,  0.0, 1.5],   # center
    [ 0.2,  0.0, 1.5],   # right
    [ 0.0,  0.2, 1.5],   # up
    [-0.2, -0.2, 1.5],   # bottom-left
    [ 0.0,  0.0, -0.5],  # behind camera (invalid)
])

pixels, valid = project_points(points_3d, K)
for i, (pt3, px, v) in enumerate(zip(points_3d, pixels, valid)):
    print(f"3D {pt3} → pixel {px.round(1)} {'✓' if v else '✗ behind camera'}")
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

```python title="Stereo depth estimation with error propagation"
import numpy as np

def stereo_depth(
    disparity_px: float | np.ndarray,
    focal_length_px: float,
    baseline_m: float,
    disparity_std_px: float = 0.5,
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """
    Compute depth Z and its standard deviation sigma_Z from stereo disparity.

    Z = f * b / d
    sigma_Z = Z^2 * sigma_d / (f * b)   [first-order error propagation]

    Args:
        disparity_px: measured disparity in pixels (scalar or array)
        focal_length_px: camera focal length in pixels
        baseline_m: stereo baseline in meters
        disparity_std_px: disparity estimation uncertainty (pixels)
    Returns:
        (Z, sigma_Z) both in meters
    """
    Z = focal_length_px * baseline_m / disparity_px
    sigma_Z = (Z ** 2) * disparity_std_px / (focal_length_px * baseline_m)
    return Z, sigma_Z

# Example: Intel RealSense D435 (approximate specs)
f  = 600.0   # focal length (pixels) for 848x480 mode
b  = 0.050   # 5 cm baseline

print("Stereo depth accuracy vs. distance:")
print(f"{'Distance (m)':>12}  {'Disparity (px)':>14}  {'σ_Z (cm)':>10}")
print("-" * 42)
for Z_true in [0.5, 1.0, 2.0, 3.0, 5.0, 10.0]:
    d_true = f * b / Z_true
    Z_est, sigma_Z = stereo_depth(d_true, f, b, disparity_std_px=0.5)
    print(f"{Z_true:>12.1f}  {d_true:>14.2f}  {sigma_Z*100:>10.2f}")
```

  </TabItem>
</Tabs>

---

## Exercises

### Beginner

1. Match each camera type to the task it is best suited for:
   - **Monocular camera**: (a) Estimating the weight of an object, (b) Detecting that a person is walking nearby (motion detection), (c) Measuring the exact distance to a box 3m away
   - **Stereo camera**: (a) Reading text on a label 20 cm away, (b) Computing depth for a robot arm picking up a block, (c) Detecting color changes over time
   - **RGB-D camera**: (a) Outdoor navigation in direct sunlight, (b) Indoor scene reconstruction for path planning, (c) Detecting a very fast-moving baseball

### Intermediate

2. A stereo camera has focal length $f = 700$ px, baseline $b = 8$ cm, and image width $W = 1280$ px. The minimum measurable disparity (due to matching algorithm limits) is 1 pixel. (a) What is the maximum measurable depth? (b) If the desired depth accuracy at $Z = 2$ m is better than 2 cm, what minimum $\sigma_d$ (in pixels) is required? (c) Use the code above to compute the depth accuracy at 1 m, 2 m, and 5 m for $\sigma_d = 0.5$ px.

### Advanced

3. **Essential matrix derivation**: Two calibrated cameras observe the same scene. Camera 1 has pose $(R_1, t_1)$ in the world frame; camera 2 has pose $(R_2, t_2)$. A 3D point $X$ projects to $x_1$ and $x_2$ in the respective image planes (normalized coordinates after undistortion by $K$). Define the relative rotation $R = R_2 R_1^T$ and relative translation $t = t_2 - R t_1$.
   - (a) Show that $x_2^T [t]_\times R x_1 = 0$, where $[t]_\times$ is the skew-symmetric matrix of $t$. This is the epipolar constraint.
   - (b) Identify the essential matrix $E = [t]_\times R$ and state its rank and the relationship between its two non-zero singular values.
   - (c) Given $E$, describe the algorithm to recover $(R, t)$ up to scale (there are 4 candidate solutions — how do you disambiguate them?).
