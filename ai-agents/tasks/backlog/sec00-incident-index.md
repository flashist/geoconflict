# Task — Security Incident Response Index (VPS Credential Leak)

## Type
Security incident coordination runbook.

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

## Evidence To Collect

- A timestamped secret-rotation inventory
- A list of all suspect Docker image tags and digests
- Proof of whether `.env*` files existed in any historical image
- VPS login and access timeline
- SSH hardening state before and after cleanup
- Repo diff summary for Docker/build/deploy hardening
- Clean rebuild and redeploy validation notes
- Final incident summary and follow-up list

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
