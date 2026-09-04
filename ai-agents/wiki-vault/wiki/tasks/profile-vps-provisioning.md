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

T4d is complete and unblocks T4e deploy mechanics. ~~The provisioned host establishes~~ 🔴 **CORRECTED 2026-09-04 — THE HOST EXISTS, BUT WHETHER IT IS PROVISIONED IS UNVERIFIED.** ⚠️ **This supersedes an earlier same-day annotation here reading "NO PROVISIONED HOST EXISTS"; that overstated the owner's position and is withdrawn.** Owner rulings, both live in session 2026-09-04 and **both standing**: *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)"*, then *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* 🔴 **Reconciled: the VPS physically EXISTS and is REUSED IN PLACE; whether the stack is provisioned on it, and what runs, is UNKNOWN AND UNVERIFIED. Hardware existence and provisioning state are two different facts, and only the first is known.** **The provisioning SCRIPT is sound and is the asset the rebuild reuses** — `setup-profile.sh` provisions a bare Ubuntu box and deploys the stack, and it is **idempotent and safe to re-run**, which is exactly the shape a wipe-and-rebuild-in-place needs. Read the rest of this paragraph as the network shape the script **establishes when run**, not as a verified description of the box today: only SSH/HTTP/HTTPS are exposed, TLS terminates at nginx, Postgres is not exposed, and the future internal endpoint inherits an IP allowlist when T5 adds the route. ~~The live host still needs the operator bring-up runbook to be executed before T5 can go live.~~ **The existing box must be inspected and re-provisioned first** — tracked as `0215` (P1) under the `0213` epic; the `0216` reachability spike is ✅ **runnable today** because it needed a box to run from and there is one. ⚠️ **The spec floor (2 vCPU / 4 GB / 60 GB NVMe) is now CONDITIONAL — verify the existing box's actual spec and resize only if it is below the floor.** ⚠️ **`PROFILE_INTERNAL_ALLOW_IPS`, declared by this slice, is pinned to a June egress IP; a stale value 403s every credit call silently.** See `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.

🔧 **Gaps this slice did not cover, recorded 2026-09-04 and owned by the rebuild:** no container log rotation on the profile box (`setup-profile.sh` never writes `daemon.json` and the compose file declares no `logging:` block — **the exact class that filled the game prod disk**), no image prune, **no OS baseline hardening** (no `unattended-upgrades`, no `fail2ban`, no sshd hardening, no non-root deploy user; deploy runs as root by default), and a **restart policy that diverges from the game box** — compose uses `restart: on-failure`, which does **not** bring containers back after a bare Docker daemon restart, where the game box uses `--restart=always`. ⚠️ **Nothing provisions the box itself** — no Terraform, no cloud-init; step 1 is a human in the provider console, **and that is by design**.

The RU-residency review finding was rejected as a no-ship blocker. Residency is an operator precondition and tester-side acceptance check: the operator provisions the reg.ru/RU host and verifies its public IP geolocates to Russia. `setup-profile.sh` intentionally does not add a fail-closed third-party geo-IP dependency, which could reject a valid RU hosting address or block provisioning during provider/API failure.

## Related

- [[decisions/sprint-4]] — profile-store roadmap and T4 slice sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded T4 restart and review policy
- [[tasks/player-profile-store-investigation]] — dedicated profile/API VPS architecture
- [[tasks/profile-build-push-digest]] — local T4e1 workflow that deliberately leaves this host untouched
- [[tasks/profile-onbox-stack-gate]] — T4e2 stack lifecycle intended to run on this host
- [[tasks/profile-server-bring-up-runbook]] — T4i operator steps for provisioning DNS, deploying, and verifying the live host
