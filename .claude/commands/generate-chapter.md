---
description: Generate a complete Docusaurus MDX chapter with audience tabs, code examples, and exercises
argument-hint: "<topic> | <week_number> | <audience_levels>"
---

## User Input

```text
$ARGUMENTS
```

You are generating a new textbook chapter for the Physical AI & Humanoid Robotics textbook (Docusaurus v3 + MDX 3).

### Step 1 — Parse arguments

Split `$ARGUMENTS` on `|` (pipe). Trim whitespace from each part:
- Part 1: **topic** (e.g. `Week 5: Computer Vision for Robotics`)
- Part 2: **week number** (e.g. `5`)
- Part 3: **audience levels** — comma-separated values from `beginner`, `intermediate`, `advanced`

If any part is missing or malformed, ask the user to re-invoke with the format:
`/project:generate-chapter <topic> | <week_number> | <audience_levels>`

### Step 2 — Find next chapter number

Use the Glob tool to list all directories matching `docs/docs/chapter-*` (relative to the project root). Determine the next available two-digit number (e.g. if `chapter-04-*` exists, next is `05`). Zero-pad to 2 digits.

### Step 3 — Read a template chapter

Read `docs/docs/chapter-01-foundations/index.mdx` (or whichever chapter exists) to understand the MDX structure: frontmatter fields, import statements, Tabs usage, math syntax, and exercise format.

### Step 4 — Generate the MDX file

Create a slug from the topic: lowercase, replace spaces/special chars with hyphens (e.g. `week-5-computer-vision-for-robotics`).

Generate `docs/docs/chapter-NN-<slug>/index.mdx` with the following structure:

```mdx
---
id: chapter-NN-<slug>
title: "Week N: <Topic>"
sidebar_position: N
description: "<one-sentence description>"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Week N: <Topic>

<intro paragraph — 3–5 sentences introducing the topic in the context of physical AI and humanoid robotics>

## Core Concepts

<2–3 paragraphs explaining the key ideas, using inline KaTeX math where appropriate, e.g. $E = mc^2$>

<block math example where relevant:>
$$
<equation>
$$

## Hands-On Examples

<Tabs>
  <TabItem value="beginner" label="Beginner" default>

<beginner-level explanation and Python code example>

```python
# <descriptive comment>
<beginner Python code>
```

  </TabItem>
  <TabItem value="intermediate" label="Intermediate">

<intermediate-level explanation and Python code example>

```python
# <descriptive comment>
<intermediate Python code>
```

  </TabItem>
  <TabItem value="advanced" label="Advanced">

<advanced-level explanation and Python code example>

```python
# <descriptive comment>
<advanced Python code>
```

  </TabItem>
</Tabs>

## Exercises

1. <Exercise 1 — conceptual question>
2. <Exercise 2 — coding task>
3. <Exercise 3 — research/design challenge>
```

Only include `<TabItem>` blocks for the audience levels requested by the user. Always include at least the `default` attribute on the first tab item.

Generate realistic, educationally accurate content appropriate for each audience level. Include actual relevant Python libraries (e.g. `numpy`, `opencv-python`, `torch`) and meaningful equations.

### Step 5 — Save the file

Use the Write tool to save the generated content to `docs/docs/chapter-NN-<slug>/index.mdx`.

### Step 6 — Remind user

After saving, output:

```
✓ Chapter saved to docs/docs/chapter-NN-<slug>/index.mdx

Next step: run /project:ingest-rag to index this chapter in Qdrant for RAG search.
```
