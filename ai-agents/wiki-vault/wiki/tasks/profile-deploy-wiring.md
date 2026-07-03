# Profile Deploy Wiring and Secret Staging

**Source**: `ai-agents/tasks/done/s4-profile-04e3-deploy-wiring-milestone.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4e3

## Goal

Connect the local profile image digest from T4e1 to the on-box stack from T4e2 through SSH/SCP, staged secrets, and remote `setup-profile.sh` invocation.

## Key Changes

- Validated `PROFILE_SERVER_HOST` for the SSH step and kept key-based SSH as the default path.
- Added trap-cleaned `0600` secret staging: local temp env file, SCP to a remote `0600` env file, source-and-remove on the box, then setup execution without box-side secret argv exposure.
- Passed the immutable `PROFILE_DIGEST` and `PROFILE_DOMAIN=api.geoconflict.ru` end to end so the remote box deploys the same digest built locally.
- Defined the integration milestone for a clean `npm run deploy:profile`: healthy services and `https://api.geoconflict.ru/health` returning 200 over valid TLS.

## Outcome

T4e3 completed the transport half of profile deployment. Bad SSH targets fail before box mutation and staged secret files are cleaned up on exit. The remaining live milestone is operator execution of the merged scripts on the real reg.ru host.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded deploy-slice policy and secret-handling keepers
- [[tasks/profile-build-push-digest]] — local digest producer wired into the deploy
- [[tasks/profile-onbox-stack-gate]] — on-box compose, health gate, and rollback target
- [[tasks/profile-server-bring-up-runbook]] — operator runbook for the real TLS 200 milestone
- [[tasks/profile-deploy-hardening]] — later T4g hardening of the deploy transport and records
