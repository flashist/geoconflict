# Task — Secret Management Beyond Local Env Files

## ID
0016

## Sprint
Sprint backlog — no sprint home yet. Security architecture follow-up (`sec11`).

> ℹ️ **Field added 2026-09-08 (visibility-only), on an owner ruling given live in session and relayed
> through the spawning session.** The brief carried no `## Sprint` field at all since filing. The value
> is **derived, not assigned**: this task has a live row on
> [`sprint-backlog.md`](../../../sprints/sprint-backlog.md) (status `⬜ No sprint`, listed there as
> `sec11`) plus its own prose section, so its board home was never in doubt — only the brief's own field
> was missing. The "architecture" wording is this brief's own `## Type`. **No status, priority or
> dependency was changed.**

## Status
🔲 Backlog

## Owner
fkit-architect

## Type
Security architecture follow-up.

## Purpose

Move operator and runtime secret handling beyond plaintext local env overlays.

## Why This Matters

`.env.secret` and `.env.<env>.secret` are safer than tracked env files, but they are still plaintext operator-managed files and remain easy to mishandle.

## Actions

1. Inventory which secrets are operator-only, build-time, deploy-time, and runtime-only.
2. Choose a target secret-management approach for this repo and team size.
3. Minimize long-lived secrets stored on operator machines.
4. Define bootstrap, rotation, and recovery workflows for the chosen approach.
5. Update deployment documentation to reflect the new model.

## Done Criteria

- a concrete next-step secret-management model is selected
- operator/runtime secret boundaries are documented
- at least one class of secrets is removed from plaintext local env storage

## Outputs

- roadmap for replacing local plaintext secret overlays

## Notes

- **Depends on:** nothing recorded — this brief asserts no gate anywhere in its text, and `0196`
  transcribed rather than re-scoped it. Not an independent verification that none exist.
