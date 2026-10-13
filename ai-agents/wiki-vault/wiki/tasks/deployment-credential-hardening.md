# Deployment Credential Model Hardening

**Source**: `ai-agents/tasks/done/0134-deployment-credential-model-hardening/brief.md`
**Status**: done
**Sprint/Tag**: Security incident

> ⚠️ *2026-10-13 sync — **in practice the game and telemetry deploys still ran on passwords**. Read-only checks on 2026-10-12 found the game prod and telemetry boxes accepting password logins (root included) with **0 `authorized_keys`**, and all 65 accepted telemetry logins in 7 days were "password for root". The key-first contract existed in the scripts; no key was set up on those boxes. `0441` closed two script gaps (`IdentitiesOnly=yes`; password via a 0600 file, not `sshpass -p`) and the box steps are `0445` — [[tasks/deploy-ssh-key-login]]. The "live key-only deploy was not executed" gap below is still open.*

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
- [[tasks/deploy-ssh-key-login]] — task `0441` (2026-10-12): the follow-through on this contract for game and telemetry deploys
