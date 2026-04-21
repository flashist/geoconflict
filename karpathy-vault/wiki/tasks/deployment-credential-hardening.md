# Deployment Credential Model Hardening

**Source**: `ai-agents/tasks/done/sec05-deployment-credential-model-hardening.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Replace the repo's password-friendly deployment model with a key-first operator contract and reduce how often host credentials appear in env files and docs.

## Key Changes

- Updated `deploy.sh` so SSH keys are the documented and enforced happy path, with password-only deploys available only behind explicit fallback flags.
- Added environment-specific key support and equivalent key-first behavior for telemetry deploy and tunnel flows.
- Revised deployment documentation and examples so repo history no longer normalizes storing `VPS_PASSWORD` in env files or publishing real environment IPs.

## Outcome

The deployment workflow now treats password auth as an emergency bridge, not normal practice. That materially narrows the operator secret surface even after the Docker leak path is fixed, although the task notes still call out one operational gap: a live key-only deploy was not executed from the source workspace during the task itself.

## Related

- [[decisions/vps-credential-leak-response]] — incident decision that recorded the SSH-key-first recovery direction
