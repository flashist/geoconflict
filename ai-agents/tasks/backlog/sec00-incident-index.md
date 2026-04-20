# Task — Security Incident Response Index (VPS Credential Leak)

## Type
Security incident coordination runbook.

## Current Status

- Incident state: active
- Severity: high
- Blocking risk: production access credentials and adjacent env secrets may be compromised
- Selected working theory: a Docker image built from a local workspace likely exposed `.env*` contents
- Coordination file owner: assign one human owner before continuing

## Purpose

Create a single source of truth for the leak response, the task dependency graph, the evidence that must be collected, and the current working theory about the leak source.

## Why This Matters

The reported leak contains exact `VPS_IP`, `VPS_LOGIN`, and `VPS_PASSWORD` values. The repo does not show a tracked real `.env.prod`, so the incident needs a conservative but evidence-driven response across the VPS, Docker registry, deployment pipeline, and repo.

The currently confirmed repo-level finding is:

- `build.sh` loads `.env` and `.env.$DEPLOY_ENV`
- the Docker build used the full repo as build context
- the `Dockerfile` copies the full repo into build and runtime stages
- without strict Docker context filtering, local `.env*` files can be baked into pushed images

That is the primary working hypothesis until disproven.

## Current Repo Evidence

The following repo facts are already confirmed and should be treated as the starting evidence set:

- `build.sh` loads `.env` and `.env.$DEPLOY_ENV` before Docker build
- `Dockerfile` uses broad repo copies into build/runtime stages
- `docs/vps-deployment-guide.md` documents `.env.<env>` files containing `VPS_IP`, `VPS_LOGIN`, and `VPS_PASSWORD`
- `docs/project-status.md` publishes real environment IPs and describes password-based SSH deploys
- the wiki confirms OTEL and Uptrace are production-only and therefore potentially sensitive if env values leaked

### Relevant Repo Paths

- `build.sh`
- `Dockerfile`
- `deploy.sh`
- `docs/vps-deployment-guide.md`
- `docs/project-status.md`
- `karpathy-vault/wiki/systems/telemetry.md`

## Inputs Required

- The Discord message or screenshots showing the leaked values
- Current prod `.env` / `.env.prod` inventory
- Access to the production VPS
- Access to the Docker registry used for deploys
- Access to the repo and recent deploy history

## Preconditions

- Treat all secrets in `.env` and `.env.prod` as potentially compromised
- Do not assume the VPS is trustworthy until `sec03` is complete
- Do not reuse old Docker tags until `sec02` and `sec06` are complete

## Incident Handling Rules

- Do not paste real credentials, real image digests, real suspicious source IPs, or raw forensic logs into this file
- Keep private evidence outside repo history; link to it abstractly from this file if needed
- If any proof needs to be preserved in-repo later, sanitize it first
- Treat any secret present in `.env`, `.env.prod`, or operator-only env files as compromised until rotated

## Execution Order

### Blocking first step

1. `sec01-immediate-containment.md`

### Parallel after containment

1. `sec02-registry-image-exposure-audit.md`
2. `sec03-vps-access-audit-and-hardening.md`
3. `sec04-repo-build-context-hardening.md`

### After the parallel work

1. `sec05-deployment-credential-model-hardening.md`
2. `sec06-clean-rebuild-redeploy-and-validation.md`
3. `sec07-postmortem-wiki-and-follow-ups.md`

## Task Tracker

| Task | Purpose | Owner | Status | Evidence Collected | Blockers |
|---|---|---|---|---|---|
| `sec01` | Immediate containment and secret rotation | _unassigned_ | pending | no | none recorded |
| `sec02` | Registry and image exposure audit | _unassigned_ | pending | no | none recorded |
| `sec03` | VPS access audit and host hardening | _unassigned_ | pending | no | none recorded |
| `sec04` | Repo build-context hardening | _unassigned_ | pending | no | none recorded |
| `sec05` | Deployment credential model hardening | _unassigned_ | pending | no | depends on `sec03`, `sec04` |
| `sec06` | Clean rebuild, redeploy, and validation | _unassigned_ | pending | no | depends on `sec01`, `sec02`, `sec03`, `sec04`, `sec05` |
| `sec07` | Postmortem, wiki, and follow-ups | _unassigned_ | pending | no | depends on `sec01`-`sec06` |

Update this table as the incident progresses. Do not let status drift into chat-only knowledge.

## Evidence To Collect

- A timestamped secret-rotation inventory
- A list of all suspect Docker image tags and digests
- Proof of whether `.env*` files existed in any historical image
- VPS login and access timeline
- SSH hardening state before and after cleanup
- Repo diff summary for Docker/build/deploy hardening
- Clean rebuild and redeploy validation notes
- Final incident summary and follow-up list

## Private Evidence Storage Guidance

Use a private location outside the repo for raw evidence. Minimum structure:

- `incident-summary.md`
- `rotation-inventory.md`
- `registry-audit.md`
- `vps-audit.md`
- `redeploy-validation.md`
- `screenshots/`
- `logs/`

Only reference those artifacts here by sanitized path or identifier. Do not copy raw contents into git-tracked files.

## Hypotheses To Confirm Or Eliminate

| Hypothesis | Current Confidence | How To Validate | Owning Task |
|---|---|---|---|
| Docker image contained `.env.prod` or similar | high | inspect historical images and layers | `sec02`, `sec04` |
| VPS was accessed with leaked credentials | medium | inspect auth logs, users, keys, runtime state | `sec03` |
| Leak came from a committed real env file | low | confirm git history contains only example env files | already checked; record if contradicted |
| Leak included more than `VPS_*` values | high | compare `.env` inventory against rotated secrets | `sec01` |

## Immediate Next Actions

1. Assign a human incident owner and fill the task tracker owner column.
2. Execute `sec01` before any new deployment or registry reuse.
3. Start `sec02`, `sec03`, and `sec04` in parallel immediately after containment begins.
4. Keep this file updated after each completed action, not at the very end.

## Done Criteria

- Every downstream runbook has either completed evidence attached or a documented blocker
- One person owns the incident state and keeps this index updated while the incident is open
- The team can answer:
  - what likely leaked
  - where it likely leaked from
  - whether the host was accessed
  - which credentials were rotated
  - which images are trusted
  - what changes prevent recurrence

## If Blocked

- If prod access is unavailable, prioritize `sec04` and `sec05` so the repo path is fixed immediately
- If registry access is unavailable, treat all pushed tags built before the hardening fix as compromised
- If SSH access is unavailable, treat the VPS as untrusted and plan a rebuild from scratch

## Outputs For Next Steps

- Incident owner
- Link or path to all collected evidence
- Status of each runbook: pending, in progress, blocked, done

## Completion Notes

When `sec07` is complete, convert this file from an active dashboard into a closed incident summary by:

- setting incident state to closed
- linking the final postmortem
- noting the trusted deployment model and image policy
- linking the wiki ingest result
