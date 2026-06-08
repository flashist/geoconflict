# Task — PostgreSQL Backup Routine (Player Profile Store)

## Sprint
Sprint 4 — data-protection prerequisite for monetization.

## Priority
**High.** This is a hard gate on **Paid Citizenship**: the moment players pay real money, an
entitlement record exists only in our Postgres profile store, and losing it is the worst
failure mode the game can have at launch. The profile-store impl (`s4-player-profile-store-impl.md`,
Part D) stands up `postgres:16-alpine` on a Docker named volume and **nothing backs it up
today**. This task closes that gap before money is on the line.

There is also a dangling dependency already in our own docs: the Monitoring & Alert Bot
**Phase 2** brief (`monitoring-alert-bot-phase2.md`, item 5) plans to *alert on* a
"weekly PostgreSQL backup cron" — but no task ever **creates** that backup. This task is the
creation half (and corrects the cadence from weekly to daily — see below).

---

## Context

The player profile store is the first persistent per-player database in the codebase. It
holds the only irreplaceable user data we have:

- **Earned XP** (the ~100-match grind toward citizenship) — exists **only** in our DB (and
  guest XP only in browser localStorage). Not reconstructable from anywhere if lost.
- **Display names + name-change history** — only in our DB.
- **Paid citizenship entitlements** + stored Yandex purchase receipts (`is_paid_citizen`,
  purchase token, raw signed payload, timestamps).

**Partial mitigation that does NOT remove the need for backups:** paid citizenship is a
durable Yandex entitlement, and the payments design includes a startup `getPurchases()`
reconciliation (`sprint4-yandex-payments-findings.md`). *If* purchases are kept
non-consumed, paid entitlements are reconstructable from Yandex even after total DB loss.
But (a) the payments findings lean toward *consuming* durable purchases after grant, which
discards that safety net, and (b) it never protects earned XP or display names. So a real
off-box backup is required regardless. See **Cross-task flag** below.

---

## Locked Decisions (with Mark, 2026-06-08)

| Decision | Choice |
|---|---|
| **Scope** | Profile store only — the Postgres player-profile DB. Match archive (deferred S3 task) and ClickHouse telemetry are out of scope. |
| **Recovery point (RPO)** | Up to ~24h. **Daily** automated `pg_dump` + off-box copy. |
| **Off-box destination** | **Reg.ru S3-compatible Object Storage** (tentative — confirm in Part A; the upload path is endpoint-agnostic S3, so any S3 provider is a drop-in fallback if Reg.ru does not work out). |
| **Off-box requirement** | Non-negotiable. The game VPS is a single 50 GB box; a backup stored on it dies with it. Backups must leave the box. |

---

## Part A — Confirm Reg.ru S3 target (do this first)

Reg.ru S3 is tentative ("probably"), so verify before building the pipeline around it:

1. Confirm Reg.ru Object Storage is S3-compatible and capture its **endpoint URL**, **region**,
   and create a dedicated **bucket** for profile backups.
2. Create access credentials (access key + secret) scoped to that bucket only.
3. From the game VPS, verify a standard S3 client (`aws-cli` with `--endpoint-url`, or
   `rclone`/`s3cmd`) can upload, list, and download against the bucket.
4. Confirm the bucket is **private** (no public read) and supports object lifecycle rules
   (for retention in Part D). If it does not, retention is handled by the prune step instead.

If any of the above fails, fall back to another S3 provider (e.g. Yandex Object Storage) —
the rest of this brief is unchanged because everything below targets a generic S3 endpoint.

---

## Part B — Backup script (runs on the game VPS)

A small bash script, deployed and scheduled via the existing `deploy.sh` path (no parallel
deploy tooling — same convention as the monitoring task):

1. `pg_dump` the profile database from the local Postgres container (custom/compressed format,
   e.g. `pg_dump -Fc`). Connect over localhost only — the DB is not publicly exposed.
2. Write the dump to a temp path on the box, named with an ISO date stamp and the DB name.
3. **Encrypt before upload.** The dump contains Yandex player IDs, display names, and payment
   state — treat it as sensitive. Use server-side encryption on the bucket *and/or* encrypt
   the file locally (e.g. `gpg`/`age`) before upload. Do not upload plaintext user data.
4. Upload to the Reg.ru S3 bucket under a dated key (e.g. `profiles/YYYY/MM/profiles-YYYY-MM-DD.dump.enc`).
5. Verify the upload (object exists + non-zero size) **before** deleting the local temp file.
6. Emit a clear success/failure signal that the monitoring path can read (Part F) and a
   log line. On failure, exit non-zero so cron/monitoring notices.
7. Schedule **daily** via cron, in a low-traffic window (overnight).

---

## Part C — Credentials & config

- S3 endpoint, region, bucket, access key, secret key, and any encryption key live in
  `.env*.secret`, threaded through `deploy.sh` — **never in git, never in the Docker image,
  never in alert/log text** (see [[decisions/vps-credential-leak-response]]).
- Follow the existing `GAME_ENV` / `example.env` config conventions.

---

## Part D — Retention & lifecycle

- Keep a rolling window that balances recovery depth against storage cost. Default proposal:
  **14 daily** backups + **8 weekly** backups (~2 months of coverage). Adjustable.
- Prefer S3 bucket **lifecycle rules** to expire old objects automatically; if Reg.ru does
  not support lifecycle rules, the backup script prunes old objects after a successful upload.

---

## Part E — Restore procedure + restore TEST (the real gate)

A backup that has never been restored is not a backup. This part is mandatory.

1. Write a short, documented **restore runbook**: pull the latest (or a chosen dated) object
   from S3, decrypt, and `pg_restore` into a target Postgres.
2. **Perform an actual test restore** into a throwaway/staging Postgres instance and verify
   integrity: row counts on `player_profiles` and `player_match_xp_credits` match the source,
   and a known profile (XP, `is_citizen`, `is_paid_citizen`, `display_name`) round-trips
   correctly.
3. Record the verified restore time in the runbook so we know our rough RTO.

---

## Part F — Monitoring tie-in

- This task produces the backup; the Phase 2 monitoring task (`monitoring-alert-bot-phase2.md`,
  item 5) consumes its health signal. **Update that brief's wording from "weekly" to "daily"**
  and set the freshness threshold accordingly (e.g. alert if the newest backup object is
  older than ~26–30h, or if the last run exited non-zero).
- The backup script should leave a machine-readable success marker (timestamp + exit status)
  the on-box agent can check. Backup monitoring itself ships with Phase 2, not here — but the
  signal this task emits must be designed for it.

---

## Implementation constraints & conventions
- **No parallel scripts.** Backup script + cron are added *through* `deploy.sh` (game-server
  deploy path), same convention as the monitoring task.
- **Secrets** in `.env*.secret`, threaded via deploy. Nothing secret in git, the image, or logs.
- **Localhost-only DB access** for the dump — do not expose the Postgres port.
- **Off-box is the point** — the upload to S3 is the part that actually protects us; a local
  dump alone does not satisfy this task.

---

## Verification (shipping gate — infra equivalent of "analytics confirm in prod")
Not "done" because it deployed — done when a **controlled test** proves recoverability:

1. **Backup lands off-box:** the daily run produces an encrypted object in the Reg.ru S3
   bucket with a correct dated key and non-zero size; the local temp file is cleaned up.
2. **Restore works end-to-end:** pull → decrypt → `pg_restore` into a throwaway Postgres;
   row counts and a known profile round-trip correctly (Part E).
3. **Failure is visible:** force a failure (bad credentials / unreachable bucket) → the run
   exits non-zero and leaves a failure marker the monitor can detect (no silent failure).
4. **Retention holds:** objects beyond the retention window are expired (lifecycle rule or
   prune step), and recent ones are kept.
5. **No secrets leaked:** confirm no credentials/keys in git, the image, logs, or any marker
   file; the dump is encrypted (not plaintext user data) at rest.
6. **Sequenced correctly:** verified live **before** Paid Citizenship ships.

---

## Sequencing & dependencies
- **Depends on:** the Player Profile Store schema existing (`s4-player-profile-store-impl.md`,
  Parts B/D) — there is nothing to dump until the DB exists.
- **Must be live before:** Paid Citizenship (`s4-citizenship-paid.md`) — the first task that
  writes real-money entitlement records. Earned Citizenship can ship in parallel; backups
  should be live by then too since earned XP is also irreplaceable.
- **Feeds:** Monitoring & Alert Bot Phase 2 (backup-job health check).
- **Deploy timing:** weekend / low-traffic window per release policy.

---

## Cross-task flag — Yandex consume decision (payments task)
The payments findings recommend consuming durable purchases after grant. Doing so removes the
Yandex-side ability to reconstruct paid entitlements via `getPurchases()` after a DB loss. Two
ways to keep a recovery path; decide in the Yandex Payments brief, not here:
- Register citizenship as a **permanent (non-consumed)** product so `getPurchases()` always
  returns it, **or**
- Ensure the server **persists the raw signed purchase payload + token** (the payments design
  already calls for this) so the receipt is captured in *this* DB backup even if consumed.

Either way, this backup task remains required for XP and display-name data.

---

## References
- Profile store impl (creates the DB): `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`
- Profile store findings: `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`
- Yandex payments findings (entitlement/consume nuance): `ai-agents/knowledge-base/sprint4-yandex-payments-findings.md`
- Backup-health monitoring (consumer): `ai-agents/tasks/backlog/monitoring-alert-bot-phase2.md` (item 5)
- Deploy path + secret handling: `deploy.sh`, `example.env`
- Secret-leak guardrails: [[decisions/vps-credential-leak-response]]
