---
name: stateful-review
description: Run both Claude's code review and Codex's adversarial review on the current diff, dedupe their findings against the task's review ledger (so settled tradeoffs aren't re-litigated), then route only novel findings through process-review and record the outcome. Use for a thorough, loop-resistant review.
user-invocable: true
---

# Stateful Review

A thorough, **ledger-aware** review: run both reviewers, merge + dedupe their findings against the accepted residuals already recorded for this task, then evaluate and record — without re-litigating decisions that were already made. This is the orchestration layer; the per-finding evaluation and the gate-on-approval discipline are reused from `process-review`, not reimplemented.

> **⛔ REVIEW ONLY — this skill never edits source code.** Its entire deliverable is the consolidated **report** (Step 4) plus the **ledger recording** (Step 5 — a docs-only update under `ai-agents/reviews/`). It does **not** patch, fix, or modify any code under review — **not even with your approval**, because applying a fix is **out of scope** for this skill.
>
> - Both reviewers run **review-only** (read-only); the `code-reviewer` agent must be pinned to make no edits.
> - Findings are **inputs to evaluate, not a to-do list to apply.**
> - Applying a fix is a **separate step you initiate afterward** (e.g. via `process-review` or a direct request) — never an automatic or implied consequence of running this skill.
> - When presenting the report, do **not** tee up "apply this fix?" as the next action. The next action is recording the outcome to the ledger; any code change is a new, user-initiated task.

Arguments: `$ARGUMENTS` — optional. May include a task-id, a PR number, and/or scope flags: `--base <ref>`, `--scope <auto|working-tree|branch>`. Default: working-tree / `auto`.

---

## Step 0 — Resolve target + load the ledger

- Determine the **task-id** under review (from `$ARGUMENTS`, the current branch name, or by asking).
- Read `ai-agents/reviews/<task-id>.md` if it exists → load its **Accepted residuals** list (see `ai-agents/reviews/README.md` for the schema). If there's no ledger, this is a fresh review — say so.
- Determine review scope: default working-tree / `auto`; honor `--base` / `--scope` from `$ARGUMENTS`.

---

## Step 1 — Run both reviewers (concurrently; degrade gracefully)

Run both reviewers on the same scope, in parallel where practical (e.g. launch Codex as a background Bash task and the `code-reviewer` agent at the same time, then collect both):

**A) Claude review** — launch the `code-reviewer` agent on the diff/scope and capture its findings. **Instruct it explicitly to run review-only: return findings, make no edits, run no fixes** (the agent has edit tools — pin it to review-only so generation can never quietly change code). Reliably invocable; this is the Claude-side reviewer. `/code-review` may be used instead if the user prefers, but it is not always model-invocable.

**B) Codex adversarial review** — run the plugin companion directly with an explicit mode flag (so it does not prompt). Resolve the plugin root by glob (version-independent):

```bash
COMPANION=$(ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs 2>/dev/null | sort -V | tail -1)
node "$COMPANION" adversarial-review --wait   # add --base <ref> / --scope <...> to match the scope
```

Return is Codex's verbatim findings. Pass `--background` instead of `--wait` for large diffs, then collect with `node "$COMPANION" result <job-id>`.

> Caution: the subcommands have **no `--help`** — any unrecognized argument is treated as review *focus text* and **launches a real, billed Codex run**. Never "probe" `adversarial-review`. Only the top-level `node "$COMPANION" --help` is safe. If a run is started by accident, cancel it with `node "$COMPANION" cancel`.

**Graceful degradation (mandatory):** if the Codex call fails (CLI missing, not authed, error exit), do **not** fail the whole review. Record "Codex reviewer unavailable: `<reason>`" and continue with Claude-only — but flag the partial coverage loudly in the report. Never present a one-reviewer run as a full review.

**Priming (best-effort):** when invoking each reviewer, include the Accepted residuals as context ("these tradeoffs are already settled — don't re-raise unless `<re-raise condition>`"). External reviewers may ignore this; the Step 2 output-side dedup is the actual guarantee.

---

## Step 2 — Merge + dedupe (the reliable filter)

- **Between reviewers:** collapse findings from Claude and Codex that describe the same issue (same file/line/claim). Keep the stronger articulation; mark "raised by both" (higher signal).
- **Against the ledger:** for each finding, check the Accepted residuals. If it matches one whose **"Re-raise only if"** condition is **not** met → move it to a **"Re-litigates settled decisions (suppressed)"** list with a one-line pointer to the ledger entry. Do **not** drop silently — show what was suppressed and why.
- Output: a list of **novel** findings (genuinely new) + the visible suppressed list.

---

## Step 3 — Evaluate the novel findings via process-review

Hand the novel, deduped findings to the `process-review` flow: classify **defect vs frontier-move**, verify each against the actual code, assign verdicts, and flag any regression/oscillation **loudly and up front**. Reuse `process-review`'s **evaluation** logic — do not re-implement it.

**Borrow only the evaluation, not any apply step.** Within this skill the output is verdicts, never edits. `process-review`'s approval gate exists to stop *unapproved* code changes; here the bar is stricter and absolute — **no code is changed at all, regardless of approval.** A confirmed defect becomes a recommendation in the report, not a patch.

---

## Step 4 — Consolidated report

Present, in one place:
- **Reviewers run** — and any that were unavailable/skipped (loudly).
- **Findings table** — `source (Claude / Codex / both) | verdict | defect or frontier-move | one-liner`.
- **Suppressed as settled** — each with its ledger pointer.
- **Convergence call** — are these new defects, or re-litigation of settled tradeoffs? Recommend **act** vs **closeout**, with the reason. Don't wait for the user to spot a loop.

---

## Step 5 — Record to the ledger

**The only write this skill makes is to the ledger — never to source code.** After the user decides **what to record** (which verdicts stand, which novel findings become accepted residuals), update `ai-agents/reviews/<task-id>.md` (Decision-log rows + any newly-accepted residuals with their structural *why* and *re-raise only if*), per `process-review` Step 5 and the reviews README. Create the ledger if it didn't exist. This is a docs-only update; it does not touch the code under review.

---

## Hard rules

- **REVIEW ONLY: this skill never edits source code** — not even with approval. The only file it writes is the ledger (Step 5). Applying a fix is a separate, user-initiated step *after* this skill finishes.
- A reviewer being unavailable MUST be reported loudly; never present a partial review as complete.
- Output-side dedup against the ledger is mandatory even if the reviewers ignored the priming.
- Do not duplicate `process-review`'s evaluation logic — invoke it on the novel findings.
- Both reviewers are **inputs to evaluate, not authorities** — verify every claim against the code (per CLAUDE.md Review Notes).
