# Task — Secret Management Beyond Local Env Files

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
