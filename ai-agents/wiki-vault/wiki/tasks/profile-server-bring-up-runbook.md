# Profile Server Bring-Up Runbook

**Source**: `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4i

## Goal

Provide the operator runbook for turning the merged profile deploy machinery into a live `https://api.geoconflict.ru/health` service on the real reg.ru VPS.

## Key Changes

- Specifies the production VPS shape: reg.ru Moscow/RU, Ubuntu 22.04, 2 vCPU, 4 GB RAM, 60 GB disk, script-managed 4 GB swap, and SSH key access.
- Requires the `api.geoconflict.ru` A record to point at the VPS before deploy so DNS and Let's Encrypt validation pass.
- Documents `.env.profile` and `.env.profile.secret` inputs, including registry credentials, `PROFILE_INTERNAL_ALLOW_IPS`, SSH key path, and recording `POSTGRES_PASSWORD` in a team password manager.
- Defines the operator deploy command, `npm run deploy:profile`, and explains the local build/push, remote setup, secret staging, health gate, and rollback flow it triggers.
- Captures acceptance checks: HTTPS `/health` returns 200 with a valid cert, compose services are healthy, UFW exposes only SSH/HTTP/HTTPS, the deployed image is digest-referenced, no secrets appear in box argv, and the box geolocates to RU.
- Records the original known non-blockers: local weekly backups only, no off-box monitoring yet, no image auto-prune, and no container cgroup memory cap. The backup follow-up has since shipped as [[tasks/postgres-backup-routine]].

## Outcome

T4i is an operations artifact, not a code change. The operator bring-up has been completed: the real reg.ru host is provisioned, DNS points at `api.geoconflict.ru`, and HTTPS `/health` returns 200 over valid TLS. T4g deploy hardening, T5 real profile endpoints, T6 match-end crediting, and T8 off-box backups have since landed.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — T4 slice discipline and residuals
- [[tasks/profile-vps-provisioning]] — T4d provisioning code and host boundary
- [[tasks/profile-build-push-digest]] — T4e1 local build/push/digest workflow
- [[tasks/profile-onbox-stack-gate]] — T4e2 on-box stack lifecycle
- [[tasks/profile-deploy-wiring]] — T4e3 transport and secret staging
- [[tasks/profile-image-secret-scan]] — T4f pre-push image scan
- [[tasks/profile-deploy-hardening]] — T4g deploy argv/concurrency and wrong-host hardening
- [[tasks/profile-backend-db-api]] — T5 DB/API slice that follows the live host milestone
- [[tasks/postgres-backup-routine]] — T8 encrypted off-box profile DB backup and restore path
