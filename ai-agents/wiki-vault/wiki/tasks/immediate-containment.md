# Immediate Containment And Secret Rotation

**Source**: `ai-agents/tasks/done/sec01-immediate-containment.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Contain the leak before deeper investigation by rotating every secret that could have been exposed through local env files, Docker images, or direct VPS access.

## Key Changes

- Enumerated the repo-specific secret surface across `.env`, `.env.<env>`, `.env.telemetry`, `deploy.sh`, and telemetry scripts.
- Prioritized rotation order around VPS access, Docker registry credentials, runtime secrets copied by `deploy.sh`, telemetry credentials, and feedback or messaging integrations.
- Locked down the temporary operator workflow so old workstations, stale images, and password-based fallbacks were not reused during the active response.

## Outcome

Containment established the security baseline for the rest of the incident: treat every deploy-adjacent secret as compromised until rotated, replace local operator env files only after provider-side rotation, and freeze unsafe deploy paths until the Docker and deploy hardening tasks were complete.

## Related

- [[decisions/vps-credential-leak-response]] — incident decision that formalized the conservative rotation and recovery posture
