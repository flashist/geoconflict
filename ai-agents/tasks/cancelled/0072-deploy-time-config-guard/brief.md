# Deploy-Time Config Guard — Required Env Vars Forwarded and Well-Formed

## ID
0072

## Sprint
Backlog

## Priority
Unscheduled

## Status
⛔ Cancelled (agent-closed — not owner-verified) (2026-08-24) — duplicate of 0064 (pre-existing, owner-ruled 2026-08-23, better-scoped); useful specifics merged into 0064 — owner-ruled 2026-08-24

## Owner
fkit-coder

## Context

Owner-approved from the open-questions interview (2026-08-24) — the guard question `0062` step 4 raised and the Sprint 4 plan carried as an open pattern note ("three of these four are the same defect class"). The failure class, twice realized in production:

- `0062-forward-profile-internal-token-in-deploy`: `PROFILE_INTERNAL_TOKEN` was never forwarded — the profile client silently no-oped; no profile row was ever created, no XP credited, and nothing said so.
- `0063-prod-api-env-advertises-http-and-raw-ip`: six public `/api/env` values carried `http` on a raw IP — login and profile fetch broke for users, silently (see `0063`'s brief and worklog for the full trace).

Common shape: *production configuration does not match what the application reads, and nothing tells anyone* — fail-soft no-ops, debug-level logs, commented-out errors. Nothing at deploy time checks that a variable the application reads is actually forwarded, or that its value is well-formed.

## What to build

A deploy-time validation step in the existing deploy pipeline (`deploy.sh` and siblings — extend the existing scripts, never a parallel solution) that fails the deploy loudly when:

1. **A required env var is missing/empty** in what the container will actually receive — the check must read the same mechanism the container env comes from (the heredoc/env_file the deploy writes), not the operator's shell.
2. **A value is malformed** for a small set of typed checks: URLs must be `https` and hostname-based (no raw IPs) for public-facing values; tokens non-empty.
3. The required-var list lives in one declared place per service (game server, profile server), so adding a var to the app without adding it to the manifest is caught in review, not in prod.

Scope both deploy pipelines that have already bitten (game-server `deploy.sh`, profile deploy). Keep it a shell-level gate — no new tooling stack. Never print secret values in the failure output — name the variable, not its content.

## Verification steps

1. Remove/blank a required var in a dry-run deploy → the deploy aborts before anything ships, naming the variable (not its value).
2. Set a public URL value to `http://<raw-ip>` → deploy aborts with the malformed-value reason.
3. A correct config passes with no behavior change to the deployed result.
4. Secrets never appear in guard output (inspect the failure logs).
5. The `0062` and `0063` failure cases, replayed against the guard, are both caught.

## Notes

- **Depends on:** nothing hard. Informed by `0062` and `0063` — build after their fixes land so the guard encodes the corrected expectations, but nothing structurally blocks it.
- **Blocks:** nothing.
- No secrets in any artifact — the manifest lists variable *names* only.
- The 2026-08-22 outage pattern (silent fail-soft) is the same disease elsewhere in runtime code; runtime fail-loudness is **not** this task's scope — deploy-time only.
