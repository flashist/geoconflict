---
name: process-review
description: Critically evaluate external reviewer feedback before acting — verifies every claim against the codebase, classifies findings, and gates any code changes on explicit user approval. Use when processing Codex reviews, GitHub review comments, or any external feedback before deciding what to act on.
---

Review text to evaluate:

> $ARGUMENTS

## Your job

You are a critical filter between an external reviewer and the codebase. Reviewers can be wrong. They may lack project context, misread the diff, reason from outdated assumptions, or propose a fix that addresses symptoms rather than the root cause. Your job is to evaluate each finding independently and present a verdict backed by evidence — not by deference.

**Never apply a fix just because a reviewer suggested it. Verify first, then ask.**

---

## Step 1 — Parse the review

Break `$ARGUMENTS` into individual findings. Number them. For each, note:
- What the reviewer claims is wrong or missing
- What change they are recommending (explicitly or implicitly)

If the review is a single block of prose with no clear numbered items, infer the logical findings yourself.

---

## Step 2 — Verify each finding against the codebase

For each finding, **read the actual code** at the referenced location. Read enough surrounding context to understand the full flow — not just the line the reviewer cited.

Before forming a verdict, ask:
- Is the claim factually accurate given the current code?
- Does the reviewer understand how this code path is actually reached?
- Are they missing project-specific context (architecture, deployment model, config, test coverage)?
- Are they reasoning from an incorrect assumption about control flow, data shape, or ownership?
- Is their recommended fix solving the right problem, or just masking a symptom?

Do not rely on the reviewer's description of what the code does. Read it yourself.

---

## Step 3 — Classify each finding and respond

Assign one of four verdicts:

**CORRECT** — The claim is accurate and the fix addresses a real problem.
→ Describe precisely what needs to change and why, citing `src/...` locations.
→ Do not touch any code yet. Present the proposed change and ask the user for explicit approval.

**PARTIALLY CORRECT** — The finding identifies a real issue, but the diagnosis or fix is wrong, too narrow, or creates a new problem.
→ Explain which part holds up and which part does not, with evidence from the code.
→ Propose what the correct fix looks like.
→ Ask the user for explicit approval before touching any code.

**INCORRECT** — The claim does not hold up.
→ Explain why, citing the specific file paths, line numbers, control flow, or config facts that disprove it.
→ Do not implement anything. Do not offer a "just in case" change.
→ If the reviewer's concern reveals a gap in their understanding worth noting, say so briefly.

**INCOMPLETE** — The finding is correct but misses something important: a related bug, an uncovered edge, a missing test, a broader pattern.
→ Confirm what the reviewer got right.
→ Describe what they missed and why it matters.
→ Propose a full fix covering both the reviewer's finding and the gap.
→ Ask the user for explicit approval before touching any code.

---

## Step 4 — Summary table

After all findings, output:

| # | Verdict | One-line description |
|---|---------|----------------------|
| 1 | CORRECT / PARTIALLY CORRECT / INCORRECT / INCOMPLETE | ... |

Then state clearly: **what, if anything, requires a code change** and wait for explicit user approval before proceeding.

If the user approves, implement only what was approved — no scope creep, no bonus cleanup.

---

## Hard rules

- Read the code. Do not speculate about what it probably does.
- Cite `src/...` with line numbers when making claims about behavior.
- Never change code without explicit approval in this conversation turn.
- All four verdict outcomes are equally valid. Do not bias toward confirming the reviewer.
- A review being from an automated tool (Codex, CI, linter) does not make it more authoritative — evaluate it the same way.
