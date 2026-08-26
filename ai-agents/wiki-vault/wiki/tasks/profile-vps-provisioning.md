# Profile Backend VPS Provisioning

**Source**: `ai-agents/tasks/done/0176-profile-04d-vps-provisioning/brief.md`, `ai-agents/knowledge-base/s4-profile-04d-ru-residency-review-finding-2026-06-20.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4d

## Goal

Provision the dedicated reg.ru profile/API VPS so later deploy slices can run the profile service behind `https://api.geoconflict.ru` without mixing deployment mechanics into box bring-up.

## Key Changes

- Added the pure-provisioning half of `setup-profile.sh`: mandatory swap with fallocate-to-`dd` fallback, Docker Engine plus Compose plugin, SSH-first default-deny UFW rules, and protected `/opt/profile` directories.
- Added a fail-closed DNS check before Certbot, valid TLS setup, HTTP-to-HTTPS redirect, localhost proxying to `PROFILE_PORT`, and a dormant `/internal/` nginx allowlist ending in `deny all`.
- Declared `PROFILE_INTERNAL_ALLOW_IPS` in `example.env.profile`; compose, systemd, runtime secrets, container rollout, and backup jobs remain owned by later slices.
- Tightened swap handling after review: a nonzero requested swap size now fails closed if both creation paths fail, and an already-active swapfile still receives one exact `/etc/fstab` entry.

## Outcome

T4d is complete and unblocks T4e deploy mechanics. The provisioned host establishes the downstream network shape: only SSH/HTTP/HTTPS are exposed, TLS terminates at nginx, Postgres is not exposed, and the future internal endpoint inherits an IP allowlist when T5 adds the route. The live host still needs the operator bring-up runbook to be executed before T5 can go live.

The RU-residency review finding was rejected as a no-ship blocker. Residency is an operator precondition and tester-side acceptance check: the operator provisions the reg.ru/RU host and verifies its public IP geolocates to Russia. `setup-profile.sh` intentionally does not add a fail-closed third-party geo-IP dependency, which could reject a valid RU hosting address or block provisioning during provider/API failure.

## Related

- [[decisions/sprint-4]] — profile-store roadmap and T4 slice sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded T4 restart and review policy
- [[tasks/player-profile-store-investigation]] — dedicated profile/API VPS architecture
- [[tasks/profile-build-push-digest]] — local T4e1 workflow that deliberately leaves this host untouched
- [[tasks/profile-onbox-stack-gate]] — T4e2 stack lifecycle intended to run on this host
- [[tasks/profile-server-bring-up-runbook]] — T4i operator steps for provisioning DNS, deploying, and verifying the live host
