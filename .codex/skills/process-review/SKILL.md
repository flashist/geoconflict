---
name: process-review
description: Evaluate and process external PR/code review feedback before making changes. Use when the user provides review comments, reviewer findings, "PR Review:" text, no-ship notes, requested changes, or asks Codex to address external reviewer feedback. Verify each claim against the codebase, identify wrong or incomplete reviewer assumptions, choose the best fix for valid issues, and account for edge cases and regressions before implementation.
---

# Process Review

## Overview

Use this skill to handle external review feedback as technical evidence to evaluate, not instructions to obey blindly. The goal is to decide which review claims are valid, explain wrong or incomplete claims clearly, and implement only changes that solve confirmed problems.

## Workflow

1. **Preserve the review text.** Identify every distinct claim, severity, file/line reference, reproduction path, and suggested fix.
2. **Ground in repo context before editing.** Follow project instructions first, including wiki or task checks when required. Inspect the branch diff, relevant call paths, adjacent code, types/schemas, tests, and docs before deciding.
3. **Verify each claim.** For every review note, decide whether it is:
   - **Correct:** the described bug/risk exists.
   - **Partially correct:** the core concern is real but details or scope are wrong.
   - **Wrong:** the code already prevents it, the reviewer missed context, or the premise does not match current behavior.
   - **Unproven:** plausible but not supported enough to change code without more evidence.
4. **Think beyond the suggestion.** Consider edge cases the reviewer may have missed: alternate entry points, retries/reconnects, stale state, replays/backfills, concurrency/races, old data compatibility, failure paths, and downstream tests/docs.
5. **Choose the fix deliberately.** If the reviewer’s suggested implementation is not the best solution, say so and use the smallest root-cause fix that preserves existing behavior. Do not add speculative changes just to satisfy a comment.
6. **Implement only confirmed changes.** Keep edits scoped to the validated issue. Do not revert unrelated user work or refactor unrelated code.
7. **Validate the corrected behavior.** Add or update focused tests where practical. Run targeted tests/build/static checks that cover the reviewed risk and any new edge cases.
8. **Report the outcome.** Summarize which review claims were accepted, rejected, or adjusted, what changed, and what validation passed.

## Decision Rules

- Do not implement a reviewer suggestion until the claim has been traced through the actual code.
- If a review is wrong, tell the user directly and cite concrete evidence such as file references, control flow, tests, or reproduction results.
- If a review is partially right, fix the real issue and explain which parts of the review did not apply.
- If a valid issue exposes a broader class of bugs, address the class only when it is clearly in scope and can be validated.
- If the safe fix changes product behavior or public contracts, surface that tradeoff before or while implementing, depending on urgency and user instructions.
- Keep analytics, telemetry, migrations, and docs aligned when the reviewed change affects measurement, persistence, or external behavior.

## Suggested Response Shape

When reporting back after processing review feedback, use this structure when useful:

- **Accepted:** valid findings fixed, with short rationale.
- **Adjusted:** valid concern, but implemented differently from the reviewer’s suggestion, with why.
- **Rejected:** incorrect findings, with evidence.
- **Validation:** tests/build/checks run and any remaining risk.
