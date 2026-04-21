# Repo Build-Context Hardening

**Source**: `ai-agents/tasks/done/sec04-repo-build-context-hardening.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Eliminate the confirmed repo-side leak path that could package operator-local `.env*` files into Docker images.

## Key Changes

- Added a root `.dockerignore` that excludes `.env*`, secret overlays, repo metadata, docs, and local-only tooling from the Docker build context.
- Refactored `Dockerfile` away from broad `COPY . .` patterns into explicit allowlist copies for build and runtime stages.
- Updated `build.sh`, `deploy.sh`, `build-deploy-telemetry.sh`, and `package.json` to use gitignored secret overlay files such as `.env.secret`, `.env.<env>.secret`, and `.env.telemetry.secret`.
- Validated the secret boundary by building the reduced `runtime-source` target and confirming that no `.env*` or `*.secret` files appeared in the inspected image stage.

## Outcome

The repo now has an explicit Docker secret boundary instead of relying on `.gitignore` alone. The hardening closed the strongest confirmed root cause of the incident, with one non-security validation gap left open: a separate `canvas` or `node-gyp` dependency issue still blocked a full final-image build in that workspace.

## Related

- [[decisions/vps-credential-leak-response]] — decision page that records the Docker build-context leak path and recovery workflow
