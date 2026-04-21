# Task — Deployment Credential Model Hardening

## Type
Repo and operations hardening task.

## Purpose

Replace the current password-friendly deployment model with a safer operator contract centered on SSH keys and minimal stored secrets.

## Why This Matters

The current deployment documentation and scripts normalize keeping `VPS_LOGIN` and `VPS_PASSWORD` in `.env.<env>` files. Even after the image leak path is fixed, that model keeps high-value host credentials in places that are easy to mishandle.

## Inputs Required

- Current `deploy.sh`
- Current deployment docs
- Results from `sec03` describing the hardened host access model
- Results from `sec04` confirming the Docker leak path is fixed

## Preconditions

- Key-based SSH access must be available for the target VPS
- The team agrees that password-based deploys are legacy, not the happy path

## Actions

### 1. Redefine the supported deploy contract

The target operator model is:

- deploys use `SSH_KEY`
- host password auth is not required for normal deploys
- docs do not ask operators to keep `VPS_PASSWORD` in `.env.prod`

If password fallback must remain temporarily for emergency use, mark it deprecated and not recommended.

### 2. Update deployment scripts

Refactor `deploy.sh` and related helpers so the preferred and documented path is key-only.

Specific goals:

- remove or de-emphasize password fallback logic
- fail clearly when no approved key-based path exists
- avoid requiring `sshpass` for standard operations

### 3. Update deployment docs

Revise repo docs so they:

- describe key-based SSH as the standard path
- stop describing `.env.prod` as a store for `VPS_PASSWORD`
- reduce exposure of real infra identifiers unless they are operationally necessary

Review `docs/project-status.md` and similar files for real IPs or credentials-adjacent details that should not live in repo history.

### 4. Verify the new operator workflow end to end

Confirm a deploy operator can:

- prepare env files without host passwords
- run the deploy
- reach the target host and complete the update

## Evidence To Collect

- Diff summary for deploy scripts and docs
- Final supported env var list
- Proof of a successful key-only deployment flow

## Done Criteria

- Key-based deploy is the documented and tested happy path
- Password-based deploy is removed or clearly marked unsupported/deprecated
- Repo docs no longer encourage storing host passwords in env files

## If Blocked

- If one environment still lacks key-based access, keep a narrowly scoped temporary fallback and create a follow-up task to remove it
- If IPs must remain in repo docs for operations, keep only what is strictly necessary and remove commentary that increases attack surface

## Outputs For Next Steps

- Final deployment model for `sec06`
- Policy decisions to capture in `sec07`

## Implementation Notes

- `deploy.sh` now treats SSH keys as the standard path and blocks password-only deploys unless `ALLOW_SSH_PASSWORD_FALLBACK=1` is set explicitly
- Environment-specific SSH keys are supported via `SSH_KEY_<ENV>`
- Legacy `VPS_LOGIN` and `VPS_PASSWORD` values still work only as deprecated fallback inputs, with warnings
- Telemetry deploy and tunnel flows now prefer `TELEMETRY_SSH_KEY` / `TELEMETRY_SSH_USER`
- Password-based telemetry access now also requires explicit opt-in via `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1` or `ALLOW_SSH_PASSWORD_FALLBACK=1`
- Repo docs and examples now describe gitignored secret overlays and no longer present host passwords as the normal operator workflow
- `docs/project-status.md` no longer keeps real environment IPs in repo history

## Remaining Validation Gap

- A live key-only deploy was not executed from this workspace, so the operator workflow is verified at script and documentation level but not yet proven against a real VPS in this turn
