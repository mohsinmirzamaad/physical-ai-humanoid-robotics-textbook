---
description: Call /personalize endpoint and display AI-personalized chapter intro for a given user profile
argument-hint: "<chapter-slug> | <software_level> | <hardware>"
---

## User Input

```text
$ARGUMENTS
```

You are fetching a personalized chapter introduction from the Physical AI textbook backend.

### Step 1 — Parse arguments

Split `$ARGUMENTS` on `|` (pipe). Trim whitespace from each part:
- Part 1: **chapter_slug** (e.g. `chapter-01-foundations`)
- Part 2: **software_level** — one of `beginner`, `intermediate`, `advanced`
- Part 3: **hardware** — one of `jetson`, `rtx`, `none`

If any part is missing or invalid, ask the user to re-invoke with the format:
`/project:personalize-chapter <chapter-slug> | <software_level> | <hardware>`

### Step 2 — Get JWT token

Ask the user (using AskUserQuestion):

```
This skill calls the /personalize endpoint which requires a JWT auth token.

Please paste your token from browser localStorage:
  localStorage.getItem('auth_token')

(Open browser DevTools → Console → paste that command → copy the result here)
```

If the user provides an empty string or `null`, output:
```
No token found. Please log in at the textbook site first, then retry.
```
and abort.

### Step 3 — Call the personalize endpoint

Use the WebFetch tool to POST to:
`https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app/personalize`

Request body (JSON):
```json
{
  "chapter_slug": "<chapter_slug>",
  "token": "<token>"
}
```

Headers: `Content-Type: application/json`

### Step 4 — Display result

If the response contains a `personalized` field, display it formatted in the terminal:

```
=== Personalized Intro for <chapter_slug> ===
(Level: <software_level> | Hardware: <hardware>)

<personalized text>
=============================================
```

If the response is an error (non-200 or error field), display the error message and suggest:
- Check that the token is valid and not expired
- Verify the backend is running at Railway
- Ensure the chapter slug matches an ingested chapter

### Step 5 — Offer to save

Ask the user (using AskUserQuestion):
```
Save this personalized intro to docs/docs/<chapter-slug>/personalized-intro.md? (yes/no)
```

If yes, use the Write tool to save the content with this header:
```markdown
<!-- Auto-generated personalized intro. Chapter: <chapter_slug> | Level: <software_level> | Hardware: <hardware> -->

<personalized text>
```
