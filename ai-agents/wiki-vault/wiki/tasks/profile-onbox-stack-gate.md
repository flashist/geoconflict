# Profile On-Box Stack, Health Gate, and Rollback

**Source**: `ai-agents/tasks/done/0179-profile-04e2-onbox-stack-gate/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4e2

## Goal

Author the on-box profile stack in `setup-profile.sh`: Postgres plus profile API compose files, service lifecycle, a health gate, and digest-pinned rollback without depending on the local build/push transport.

## Key Changes

- Added `profile.env` and `docker-compose.yml` generation with mode `0600`, loopback Postgres and API bindings, Postgres memory caps, generated or persisted internal token handling, and template-equality `DATABASE_URL`.
- Required `PROFILE_IMAGE` to be an immutable `@sha256` reference and declined mutable tags on the box.
- Wrapped pull/recreate in a 120-second health gate that captures the previous digest, marks stack recreation before container mutation, rolls back on unhealthy deploys, and never auto-deletes the `postgres_data` volume.
- Added the `profile.service` systemd unit and weekly local backup/maintenance cron, including certbot renewal hooks that stop/start nginx for the standalone HTTP-01 path.

## Outcome

T4e2 completed the on-box half of profile deployment. 🔴 **2026-09-04: the profile VPS EXISTS and is reused in place, but whether this lifecycle is installed and running on it is UNVERIFIED.** ⚠️ **This supersedes an earlier same-day annotation here reading "there is NO profile VPS"; that overstated the owner's position and is withdrawn.** Owner rulings, both live in session and **both standing**: *"We don't have ANY profile-related VPS yet…"*, then *"the VPS and S3 I created will be reused."* Read this paragraph as the lifecycle the scripts install **when run**, and as **unverified** for the box today. ⛔ **The machinery is sound and is what the wipe-and-rebuild onto the existing box (`0213`–`0222`, Sprint 4) reuses.** ⚠️ **One trap the reframe makes MORE likely, not less:** rotating `POSTGRES_PASSWORD` against a **surviving data volume** breaks auth — the Postgres image applies that variable only at initdb — and rebuilding onto an existing box is precisely where a volume may outlive the password. **Decide explicitly whether the volume goes.** The profile VPS can ~~now~~ run a bounded Postgres/API stack from a digest, recover to the prior digest on failed health, and preserve data volume state. The end-to-end `api.geoconflict.ru` milestone remains owned by the deploy wiring and operator bring-up slices.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded deploy-slice policy and keeper properties
- [[tasks/profile-build-push-digest]] — T4e1 local build and digest source consumed by this stack
- [[tasks/profile-vps-provisioning]] — T4d host and nginx/TLS boundary this stack runs behind
- [[tasks/profile-deploy-wiring]] — T4e3 transport that invokes this on-box setup
- [[tasks/profile-server-bring-up-runbook]] — operator runbook that exercises the merged deploy path
