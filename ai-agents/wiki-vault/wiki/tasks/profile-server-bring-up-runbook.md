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

T4i is an operations artifact, not a code change. ~~The operator bring-up has been completed: the real reg.ru host is provisioned, DNS points at `api.geoconflict.ru`, and HTTPS `/health` returns 200 over valid TLS.~~ 🔴 **CORRECTED 2026-09-04 — WHETHER THE HOST THIS RUNBOOK BROUGHT UP IS STILL SERVING IS UNVERIFIED.** ⚠️ **This supersedes an earlier same-day annotation here reading "NO LONGER STANDS"; that overstated the owner's position and is withdrawn.** Owner rulings, both live in session 2026-09-04 and **both standing**: *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)"*, then, on a direct follow-up, *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* 🔴 **Reconciled: the box physically EXISTS and is REUSED IN PLACE; its provisioning state — what runs on it, what schema version the DB is at — is UNKNOWN AND UNVERIFIED.** The bring-up genuinely ran once. ⛔ **The RUNBOOK ITSELF is not invalidated — it is the asset the rebuild reuses**, and this page is the vault's record of it. T4g deploy hardening, T5 real profile endpoints, T6 match-end crediting, and T8 off-box backups all landed **in the repository**; whether any of them is running today is one of the UNKNOWN fields `0215` must read.

> 🚨 **TRAP — do not follow this runbook's `PROFILE_INTERNAL_TOKEN` step as written.** The source brief
> (`0182/brief.md:136-137`) calls the token *"optional — leave blank; the box auto-generates and
> persists it."* **That was true at T4i and is FALSE now:** `internalAuth` is a `timingSafeEqual` over a
> **shared** secret, so a token the box generates for itself — which the game server does not hold —
> means a **401 on every credit call**. The profile client is fail-soft with **no durable queue**
> (ADR-101), so the XP is **lost, not queued**, and nothing logs above `debug`. A **second, independent**
> silent barrier sits on the same path: `PROFILE_INTERNAL_ALLOW_IPS` is pinned to a **June egress IP**,
> and nginx enforces `allow …; deny all;` on `/internal/` — a stale value is a **403 on every credit
> call**, swallowed just as quietly. The brief has been annotated in place (2026-09-04,
> strike-not-delete) by the producer. **`0062`'s D3 — one authenticated call working end to end — is the
> only check that catches either.**

🔧 **Rebuild context (2026-09-04, re-corrected the same day):** the owner ruled a **wipe and rebuild ONTO THE EXISTING RESOURCES — not a procurement of new ones** — tracked as **`0213` (epic) through `0222`, plus `0201`**, all on Sprint 4. ⚠️ *An earlier same-day annotation here described this as a clean-slate rebuild with a new VPS, a new S3 bucket and a new `age` keypair; the VPS and bucket are reused, and that wording is withdrawn.* Decisions now settled: 🔴 **reuse the existing hostname** — the `api.` subdomain is **architecturally required, not incidental**, because Yandex Games permits only ONE main domain for an iframe game, so everything routes through subdomains of it; and the spec floor applies **only if the existing box measures below it** (`0214`). ⚠️ **A DNS record resolving proves nothing about a server running.** Still open: **whether the container registry, `get.docker.com`, the apt mirrors and Let's Encrypt are reachable from reg.ru Moscow** — a spike (`0216`) which is ✅ **runnable today**, since it needed a box to run from and there is one; a "no" changes the rebuild's shape rather than its duration. 📌 A **new** `age` keypair is still needed (`0218`), and the **old** encrypted objects still sitting in the reused bucket are a live owner decision on `0222` — see [[tasks/postgres-backup-routine]]. Full survey: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.

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
