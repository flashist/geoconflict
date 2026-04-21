# VPS Credential Leak Response

**Date**: 2026-04-21
**Status**: accepted

## Context

A Discord report exposed exact `VPS_IP`, `VPS_LOGIN`, and `VPS_PASSWORD` values matching the operator-local production environment files. No tracked production `.env` file was found in git history, but the repo did contain a confirmed vulnerable build path: `build.sh` loaded local env files before Docker builds, the build used the full repo as context, and the pre-fix `Dockerfile` used broad `COPY . .` patterns. Repo docs also normalized storing VPS passwords in env files and using password-based deploys.

During recovery, telemetry redeploy also exposed a second operational issue: the Uptrace retention syntax in `setup-telemetry.sh` had drifted and crashed the Uptrace container, surfacing publicly as an nginx `502`.

## Decision

Treat the incident as a real compromise of infrastructure credentials and respond conservatively:

- rotate all VPS passwords and adjacent env secrets
- move sensitive operator values into gitignored secret overlay files instead of normal env files
- establish an explicit Docker secret boundary with `.dockerignore` plus allowlist copies only
- treat pre-hardening images as untrusted
- change the supported deploy contract to SSH-key-first, keeping password auth only as an explicit temporary emergency fallback
- remove real VPS IPs and password-friendly guidance from repo docs
- update telemetry setup to the current Uptrace retention format (`ch.retention.ttl`) so clean setups remain safe and stable

The final trusted recovery workflow is:

1. build from the hardened repo state
2. deploy with rotated credentials
3. validate runtime health on the target environment
4. redeploy telemetry when its configuration changes
5. keep any unfinished hardening as explicit backlog tasks rather than implicit tribal knowledge

## Consequences

- Docker build refactors now require deliberate allowlist maintenance; missing files can cause build regressions, but secret leakage risk is materially reduced
- password-based deploys remain available only as an emergency bridge and should be removed once all environments are key-based
- historical image trust is now captured in [[decisions/registry-image-policy]], but live registry visibility changes and old-tag cleanup still require operator action outside the repo
- telemetry setup is now safer for clean rebuilds, and the repo documents the retention-config drift that caused the transient `502`

## Related

- [[decisions/registry-image-policy]] — trusted/untrusted image and retention rules introduced as a follow-up policy
- [[systems/telemetry]] — telemetry redeploy and Uptrace retention-config drift were part of the incident closure
- [[systems/game-overview]] — operational context for the live game deployment model
- [[tasks/incident-response-index]] — incident-wide coordination file and final closure state
- [[tasks/immediate-containment]] — secret rotation and unsafe-deploy freeze during the response
- [[tasks/registry-image-audit]] — historical image trust investigation that was resolved conservatively
- [[tasks/vps-access-hardening]] — host-access review and SSH hardening requirements
- [[tasks/repo-build-context-hardening]] — Docker secret-boundary fix in the repo
- [[tasks/deployment-credential-hardening]] — key-first deploy contract and doc cleanup
- [[tasks/clean-redeploy-validation]] — trusted image rebuild and post-deploy validation path
- [[tasks/incident-postmortem-followups]] — postmortem capture and explicit follow-up queue
- [[tasks/docker-secret-boundary-check]] — automated regression guard for the Docker boundary
- [[tasks/registry-image-policy-followup]] — follow-up task that wrote the durable registry policy
