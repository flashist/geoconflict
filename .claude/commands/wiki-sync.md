Sync the geoconflict wiki at `karpathy-vault/` by detecting what changed in `ai-agents/` since the last ingest and ingesting only the delta.

Arguments: $ARGUMENTS
(Optional: pass a specific date like "2026-04-15" to override the auto-detected since-date, or "force" to re-ingest all ai-agents files)

## Instructions

### Step 1 — Determine the sync window

If `$ARGUMENTS` contains a date (YYYY-MM-DD format), use that as the since-date.

Otherwise, read `karpathy-vault/log.md` and find the most recent `## YYYY-MM-DD — ingest` entry. Extract the date. That is the since-date.

If no ingest entry exists in log.md, set since-date to 7 days ago (fallback for first run).

### Step 2 — Find changed files

Run:
```
git log --since="<since-date>" --diff-filter=AMR --name-only --format="" -- ai-agents/
```

Deduplicate the results (a file may appear in multiple commits). This is the candidate list.

If `$ARGUMENTS` is "force", skip git and instead list all files under `ai-agents/`.

### Step 3 — Filter to ingest-worthy files

From the candidate list, keep only:
- `ai-agents/sprints/*.md` — sprint plan files (new sprints or updated sprint status)
- `ai-agents/sprints/done/*.md` — completed sprint files
- `ai-agents/tasks/done/*.md` — completed task briefs
- `ai-agents/tasks/cancelled/*.md` — cancelled tasks (check if already covered in `wiki/decisions/cancelled-tasks.md` before creating a new page)
- `ai-agents/knowledge-base/*.md` — investigation findings and reference documents

Skip:
- `ai-agents/tasks/backlog/*.md` — not yet done, wiki page premature
- Any file that is identical in content to what was already ingested (use git log to check if the file was only renamed, not modified)

If the filtered list is empty: report "Wiki is up to date — no ingest-worthy changes since <since-date>." and stop.

### Step 4 — Read the wiki schema and index

Read `karpathy-vault/schema.md` for page templates and conventions.
Read `karpathy-vault/index.md` to know what pages already exist.

### Step 5 — Ingest each changed file

For each file in the filtered list:

a. Read the source file fully.
b. Determine which wiki page type it maps to (feature / system / decision / task).
c. Check if a wiki page already exists for this topic.
   - **If yes:** update it — incorporate any new status, decisions, or findings. Do not remove content that is still accurate; add or correct only what changed.
   - **If no:** create it following the template in schema.md.
d. Update the one-line entry in `karpathy-vault/index.md` (add if new, update description if changed).
e. Add or update cross-links in related pages (bidirectional).

### Step 6 — Targeted lint on changed pages only

For each page created or updated in Step 5:
- Check that all wiki-links in the page resolve to existing index entries
- Check that linked pages have a back-link to this page
- Fix any one-way links found

### Step 7 — Update log.md

Append a single entry to `karpathy-vault/log.md`:

```
## YYYY-MM-DD — ingest
- Sync window: <since-date> → today
- Changed source files detected: N
- Ingested: `<path>` → created/updated [[wiki/<path>]]
  (one line per file processed)
- Skipped (already covered): list any files skipped with reason
```

Use today's date.

### Step 8 — Report

Output a concise summary:
- Sync window (date range checked)
- N source files changed, M pages created, K pages updated
- List the pages touched
- Any issues that require human review (flag with ⚠️)
