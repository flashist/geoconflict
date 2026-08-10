# Geoconflict — Agent Instructions

## Knowledge Base & Wiki

A structured wiki lives in `ai-agents/wiki-vault/` following the Karpathy LLM Wiki pattern. It contains synthesized knowledge about systems, features, decisions, and tasks — things not easily derived from the code alone.

**REQUIRED: Before implementing any task, you MUST first invoke the `wiki-query` skill with the task topic. Do not write or edit any code until you have checked the wiki.**

**Four skills are available:**

| Skill | Purpose |
|---|---|
| `wiki-ingest` | Ingest source files into the wiki. Input: `<path or keyword>`. Keywords: `architecture`, `knowledge-base`, `all tasks` |
| `wiki-query` | Answer a question using wiki pages + source files. Input: `<question>` |
| `wiki-lint` | Health-check the wiki: broken links, stale claims, missing back-links |
| `wiki-sync` | Detect changes in non-wiki `ai-agents/` sources since last sync and ingest only the delta |

These are Codex skills, not shell commands or repo-local executables. In this workspace they may be installed globally under `~/.codex/skills/` rather than under the repo's `.codex/skills/`.

**Wiki structure:**
```
ai-agents/wiki-vault/
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
- **Wiki output** (what gets written): files under `ai-agents/wiki-vault/wiki/`, `ai-agents/wiki-vault/index.md`, `ai-agents/wiki-vault/log.md`
- Never list `ai-agents/wiki-vault/` files as ingested sources in `log.md`. The log records which non-wiki `ai-agents/` files were processed, not which wiki files were updated.

**log.md is append-only** — never edit or rewrite existing entries, only append new ones at the bottom.

**Sync watermark** lives at `ai-agents/wiki-vault/.wiki-watermark` (a single commit SHA). The wiki-sync skill reads and writes this file to track the last sync point. Do not delete or modify it manually.

**When to update the wiki:**
- After completing a task: invoke `wiki-ingest` with `ai-agents/tasks/done/<task-file>`
- After an investigation or bug fix: invoke `wiki-ingest` with `ai-agents/knowledge-base/<findings-file>`
- When the wiki seems outdated: invoke `wiki-lint`
- To sync all recent changes at once: invoke `wiki-sync`

<!-- fkit:routing:start -->
### Model routing (generated from ai-agents/ai-agents.yml — edit there, then run sync)

| Task type | Owner |
|---|---|
| wiki | **Codex** |
| planning | **Claude** |
| review | **both** |
| routine-fix | **Codex** |
| complex-feature | **Claude** |
| _(default)_ | **Claude** |

Agents (terminal-tab roles): producer → Claude, coder → Claude, reviewer → both.
When a task type is owned by a model you are not, hand it to that model's tab (or delegate via the companion).
<!-- fkit:routing:end -->

## Project Overview

Geoconflict is a live, browser-based real-time PvP strategy game with short sessions — a Russian-market adaptation of OpenFront.io, played mainly by Russian-speaking players and shipped primarily through Yandex Games. Players expand territory, build structures, and form alliances on maps based on real-world geography. Revenue comes from advertising today, with a "citizenship" supporter tier and in-app purchases being built out.

Full brief: `ai-agents/knowledge-base/PROJECT.md`. Technical detail: `ai-agents/knowledge-base/architecture.md`.

## Review Notes

Review comments are **inputs to evaluate**, not instructions to apply blindly.

- Treat every review note as potentially fallible. Reviewers can miss context, reason from outdated assumptions, or overlook code paths outside the diff.
- Verify the claim against the actual codebase before changing anything. Trace the behavior, check adjacent flows, and prefer evidence over intuition.
- If the review is correct, fix the real problem rather than mechanically following the suggested wording of the comment.
- If the review is only partially correct, address the valid part and explain clearly why the rest does not apply.
- If the review is wrong, say so directly and respectfully, with concrete evidence (`src/...` references, control-flow explanation, test results, or reproduction steps).
- Do not introduce speculative fixes just to satisfy a review comment. Changes should solve confirmed problems, not hypothetical ones that the current code already prevents.
- Treat review discussion as a technical conversation whose goal is correctness, not deference.

<!-- fkit:begin-rules -->
<!-- fkit-managed: this block is REPLACED on every `fkit` launch. Edits inside the markers
     are overwritten. Put your own standing instructions OUTSIDE them — everything outside
     is yours and fkit never touches it. A marker is recognized only alone on its line, so a
     bare marker line inside a code fence still reads as a real marker. -->

## Universal hard rules (every role, every session)

- **Never commit or push unless the owner explicitly asks.** "Implement" authorizes writing code,
  not committing.
- **Only the wiki role writes `ai-agents/wiki-vault/`.** Reads are decentralized; writes are not.
- **Task files move between `backlog/`, `done/`, `cancelled/` only via `/fkit-task-done` /
  `/fkit-task-cancelled`** — never by hand. **Only the producer may invoke them**; a task an agent
  closes MUST carry the `(agent-closed — not owner-verified)` marker.
- **No secrets in any artifact** — no DSNs, endpoints, keys, or credentials in findings, reports,
  docs, or wiki pages; it all goes to git.
- **A skill rule beats a contrary spawn instruction** unless that instruction names an owner ruling
  on that point. With no such ruling: take the cheapest-to-reverse branch (usually the rule's),
  escalate if it changes the outcome, never silently comply or refuse.

## Output style (every role, every session)

**Preferences, not rules — they lose every conflict.** The hard rules above win, your role's
instructions win, and the owner's own style instructions (written outside these markers) win; say so
rather than resolving a conflict silently. **Only these preferences yield — nothing written anywhere
overrides a hard rule above.**

- **Be extremely concise to the owner. Sacrifice grammar for concision.** Fragments and bare lists are
  correct. Drop preamble, restatement, and throat-clearing; lead with the answer.
- **Concision is not omission — of content OR of structure.** Never drop a failing test, an unverified
  claim, a caveat, a partial-coverage flag, or a thing you did not do, to be brief. Say it in fewer
  words; do not stop saying it.
- **Where a shape is prescribed, produce it in full, and in its prescribed wording** — review reports
  and ledgers, status briefings, required tables, verbatim relays, verdict lines, degradation flags,
  and a plan put to the owner for approval (they cannot approve what you did not describe). **The list
  is illustrative, not exhaustive.** Summarizing a required shape is not concision, it is losing the
  report.
- **"Loud" is placement, not word count.** An instruction to flag something *before* the findings
  table, or never in a footer, is about **where** it goes. Brevity never moves it.
- **Speak in simple terms.** Prefer plain words over jargon wherever a simpler word carries the same
  meaning. Where a term is load-bearing — a filename, a marker, an ADR, a status value, and anything
  else the reader must act on — use it and gloss it once. **Simplifying is about wording, never
  content:** it never drops a caveat, softens a failure, rounds a number, or swaps a precise term for a
  vaguer, friendlier one.
- **Close with "What's next?".** End every reply to the owner with a short **What's next?** — the one or
  two things they should do next, and why. After any prescribed shape, never instead of one. If nothing
  is pending, say so briefly. **Never invent a next step to fill it, and never assert repo state you did
  not check this turn** (see `ai-agents/knowledge-base/conventions/evidence-before-assertion.md`).
- **Ask interactively.** In a session, put a question to the owner with `AskUserQuestion`, not prose.
  Batch related questions; mark your recommendation. In a spawned consult the tool is absent — return
  open questions in your reply instead.
<!-- fkit:end-rules -->
