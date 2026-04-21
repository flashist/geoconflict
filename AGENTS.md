# Geoconflict — Agent Instructions

## Knowledge Base & Wiki

A structured wiki lives in `karpathy-vault/` following the Karpathy LLM Wiki pattern. It contains synthesized knowledge about systems, features, decisions, and tasks — things not easily derived from the code alone.

**REQUIRED: Before implementing any task, you MUST first run `/wiki-query` with the task topic. Do not write or edit any code until you have checked the wiki.**

**Four skills are available:**

| Skill | Purpose |
|---|---|
| `/wiki-ingest <path or keyword>` | Ingest source files into the wiki. Keywords: `architecture`, `knowledge-base`, `all tasks` |
| `/wiki-query <question>` | Answer a question using wiki pages + source files |
| `/wiki-lint` | Health-check the wiki: broken links, stale claims, missing back-links |
| `/wiki-sync` | Detect changes in `ai-agents/` since last sync and ingest only the delta |

**Wiki structure:**
```
karpathy-vault/
  schema.md          ← conventions and templates (read this first)
  index.md           ← master catalog of all pages
  log.md             ← append-only activity log
  wiki/
    features/        ← game mechanics and feature pages
    systems/         ← technical system pages
    decisions/       ← architectural and product decisions (ADRs)
    tasks/           ← task summaries from ai-agents/tasks/
  sources/           ← raw source files for ingestion
```

**Source files vs wiki files — critical distinction:**
- **Sources** (what gets ingested): files under `ai-agents/` — sprints, tasks, knowledge-base docs
- **Wiki output** (what gets written): files under `karpathy-vault/wiki/`, `karpathy-vault/index.md`, `karpathy-vault/log.md`
- Never list `karpathy-vault/` files as ingested sources in `log.md`. The log records which `ai-agents/` files were processed, not which wiki files were updated.

**log.md is append-only** — never edit or rewrite existing entries, only append new ones at the bottom.

**Sync watermark** lives at `karpathy-vault/.wiki-watermark` (a single commit SHA). The wiki-sync skill reads and writes this file to track the last sync point. Do not delete or modify it manually.

**When to update the wiki:**
- After completing a task: run `/wiki-ingest ai-agents/tasks/done/<task-file>`
- After an investigation or bug fix: run `/wiki-ingest ai-agents/knowledge-base/<findings-file>`
- When the wiki seems outdated: run `/wiki-lint`
- To sync all recent changes at once: run `/wiki-sync`

## Project Overview

OpenFront is a real-time strategy browser game focused on territorial control and alliance building. Players compete to expand territory, build structures, and form alliances on maps based on real-world geography.

## Review Notes

Review comments are **inputs to evaluate**, not instructions to apply blindly.

- Treat every review note as potentially fallible. Reviewers can miss context, reason from outdated assumptions, or overlook code paths outside the diff.
- Verify the claim against the actual codebase before changing anything. Trace the behavior, check adjacent flows, and prefer evidence over intuition.
- If the review is correct, fix the real problem rather than mechanically following the suggested wording of the comment.
- If the review is only partially correct, address the valid part and explain clearly why the rest does not apply.
- If the review is wrong, say so directly and respectfully, with concrete evidence (`src/...` references, control-flow explanation, test results, or reproduction steps).
- Do not introduce speculative fixes just to satisfy a review comment. Changes should solve confirmed problems, not hypothetical ones that the current code already prevents.
- Treat review discussion as a technical conversation whose goal is correctness, not deference.
