# Geoconflict — VPS Credential Leak Incident Postmortem

**Last updated:** 2026-04-21
**Status:** Closed

## Incident Summary

On 2026-04-21, a Discord message reported leaked production VPS credentials and showed exact `VPS_IP`, `VPS_LOGIN`, and `VPS_PASSWORD` values matching the operator-local production environment file.

The incident was treated as a real compromise of infrastructure access credentials and adjacent env secrets until rotation and rebuild work proved otherwise.

## Impact And Likely Blast Radius

Treat as exposed during the incident:

- prod VPS password
- dev VPS password
- telemetry VPS password
- shared deploy-adjacent env secrets stored near those credentials
- Uptrace admin and ingest secrets

No evidence was found that a real production `.env` file had been committed to git history. The blast radius therefore centered on operator-local files, built images, and operational handling rather than tracked repo history.

## Detection

- A Discord report included exact VPS access values
- The reported values matched the structure and content of the local operator env files closely enough to treat the report as credible immediately

## Confirmed Findings

### Confirmed safe findings

- No tracked real `.env.prod` or equivalent secret file was found in git history
- `.gitignore` already ignored `.env*`

### Confirmed vulnerable findings

- `build.sh` loaded `.env` and `.env.$DEPLOY_ENV` before the Docker build
- the Docker build used the repo root as build context
- the pre-fix `Dockerfile` used broad `COPY . .` patterns in build/runtime stages
- repo docs normalized storing VPS passwords in env files and described password-based deploys as normal

This created a confirmed vulnerable path where gitignored local `.env*` files could be captured into image layers and pushed.

## Root Cause Conclusion

The strongest confirmed technical root cause was the combination of:

1. operator-local secrets kept in `.env` and `.env.<env>`
2. Docker builds using the full repo as context
3. broad `COPY . .` instructions in the `Dockerfile`

That path is the most plausible explanation for the exact leaked `VPS_*` values and was severe enough to drive remediation even without a perfect historical layer-by-layer forensic proof of the specific leaked image.

## Containment Actions Completed

- rotated prod, dev, and telemetry VPS passwords
- rotated shared deploy/runtime secrets including Docker/admin/API values
- rotated Uptrace secrets
- moved sensitive values into gitignored secret overlays:
  - `.env.secret`
  - `.env.<env>.secret`
  - `.env.telemetry.secret`
- confirmed `fail2ban` was already active on the production host

## Permanent Fixes Implemented

### Docker / build path

- added a root `.dockerignore` that excludes `.env*`, secret overlays, docs, agent folders, and other local-only content
- removed broad `COPY . .` usage from the `Dockerfile`
- replaced it with explicit allowlist copies
- fixed one regression introduced by the allowlist migration by restoring `tailwind.config.js` to the build stage

### Deploy / credential model

- updated `build.sh`, `deploy.sh`, and telemetry scripts to load secret overlay files
- changed the deploy contract to prefer SSH keys
- kept password-based deploys only as an explicit emergency fallback
- removed real VPS IPs and password-friendly guidance from repo docs

### Telemetry recovery

- telemetry was redeployed after the main incident response
- the redeploy exposed an outdated Uptrace retention config format that crashed the Uptrace container and surfaced publicly as `502 Bad Gateway`
- the live server was repaired
- the repo telemetry scripts were updated to use the current `ch.retention.ttl` format so future clean setups do not repeat the outage

## Recovery Validation

- fresh hardened dev build/deploy completed successfully
- prod was redeployed from a post-fix trusted repo state and verified working
- telemetry was redeployed and the dashboard was verified working again
- container inspection on the hardened Docker path showed no `.env*` or `*.secret` files in the inspected image stage

## Final Policy Decisions

- Real VPS IPs should not remain in repo documentation unless operationally unavoidable
- Password-based deploys are not the happy path; they remain a temporary emergency fallback only
- Images built before the Docker secret-boundary hardening should be treated as untrusted
- Gitignored secret overlay files are the current short-term operator workflow, but they are not the long-term endpoint for secret management

## Remaining Risks

- password-based deploy fallback still exists and should be removed once all environments are key-based
- registry policy and historical tag hygiene still need explicit follow-up
- local secret overlays reduce accidental git exposure but are still operator-managed plaintext files

## Follow-Up Tasks

- `ai-agents/tasks/backlog/sec08-ci-docker-secret-boundary-check.md`
- `ai-agents/tasks/backlog/sec09-registry-visibility-and-image-retention-policy.md`
- `ai-agents/tasks/backlog/sec10-remove-password-deploy-fallbacks.md`
- `ai-agents/tasks/backlog/sec11-secret-management-beyond-env-files.md`
