---
description: Translate a chapter MDX file to Urdu via the /translate endpoint and save as a companion file
argument-hint: "<path/to/chapter/index.mdx>"
---

## User Input

```text
$ARGUMENTS
```

You are translating a textbook chapter MDX file to Urdu using the Physical AI textbook backend's `/translate` endpoint.

### Step 1 — Parse arguments

Treat `$ARGUMENTS` (trimmed) as a file path relative to the project root.

Examples:
- `docs/docs/chapter-01-foundations/index.mdx`
- `docs/docs/chapter-03-gazebo-simulation/index.mdx`

If empty, ask the user to re-invoke with:
`/project:translate-urdu <path/to/chapter/index.mdx>`

### Step 2 — Read the file

Use the Read tool to read the file at the given path. If the file does not exist, output an error and abort.

### Step 3 — Extract plain text

From the raw MDX content, strip:
- YAML frontmatter blocks (`---` to `---`)
- Import/export statements (lines starting with `import ` or `export `)
- JSX component opening/closing tags (e.g. `<Tabs>`, `</Tabs>`, `<TabItem ...>`, `</TabItem>`)
- HTML comments (`<!-- ... -->`)

Preserve:
- All heading text (e.g. `## Core Concepts` → keep as `## Core Concepts`)
- Paragraph text
- Code block content (translate comments inside code blocks if they are in English, but do not translate code syntax)
- Math expressions as-is (do not translate KaTeX)
- Exercise text

### Step 4 — Split if large

Count the word count of the extracted plain text. If it exceeds 3000 words, split into chunks of ~2500 words at paragraph boundaries (never mid-sentence).

### Step 5 — Translate each chunk

For each chunk, call `POST https://physical-ai-humanoid-robotics-textbook-production-95f1.up.railway.app/translate` using the WebFetch tool.

Request body (JSON):
```json
{
  "text": "<chunk text>",
  "target_language": "ur"
}
```

Headers: `Content-Type: application/json`

Parse the `translated` field from each response. Join all translated chunks in order.

If any chunk returns an error, display the error and ask the user whether to continue with remaining chunks or abort.

### Step 6 — Save companion file

Determine the output path by replacing `index.mdx` with `index.ur.md` in the same directory.
Example: `docs/docs/chapter-01-foundations/index.ur.md`

Prepend this header to the translated content:
```
<!-- Auto-translated to Urdu via /translate endpoint. Original: index.mdx -->

```

Use the Write tool to save the file.

### Step 7 — Confirm

Output:
```
✓ Urdu translation saved to <output_path>
  Chunks translated: <N>
  Original file: <input_path>
```
