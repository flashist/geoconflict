# P1 — Inspect the EXISTING profile box, then wipe and re-provision it in place

## ID
0215

> 📌 **The folder name says "stand up the box" and is kept unchanged on purpose** — the folder is the
> task's identity and several files link to it. **The scope is no longer "order a box".** See the
> reframe below.

> 🚨 **PREMISE CORRECTED 2026-09-08 — THE BUCKET IS NOT REUSED.**
>
> **Owner ruling 2026-09-08, given live in session and relayed through the spawning session:**
> **a BRAND-NEW, CLEAN S3 bucket. NOT the existing one.**
>
> This **supersedes the 2026-09-04 reuse ruling AS TO THE BUCKET ONLY.**
> ✅ **The VPS half of that ruling is UNCHANGED — the box is still reused in place.**
>
> ⚠️ Prior text below is **struck, not deleted** — the same supersede-do-not-delete discipline used
> all week. Where a struck line and a correction disagree, **the correction wins.**

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High** — this is the phase that turns the whole downstream chain from blocked into workable. P2,
P3, P4, P5 and P6 all hang off it.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder / operator

## Depends on
- [`0214`](../../backlog/0214-profile-p0-infrastructure-decisions/brief.md) (P0) — the spec and hostname
  decisions, both now **settled** and both now **conditional on inspection**.
- [`0216`](../0216-profile-p1-spike-ru-network-reachability/brief.md) (P1-spike) — ✅ **runnable
  today**; **its result can change this task's scope, not just its schedule.**

## Context

> 📌 **Citation frame.** Every `file:line` here was re-derived by opening the file, against commit `589249c` **plus the 2026-09-10 citation sweep**. ⚠️ That sweep ADDED lines to `0182`'s brief, so `0182` numbers here are POST-sweep — they will not match a bare `589249c` checkout. Re-derive by matching the described content, never by shifting the number. See [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

### 🔴 THE REFRAME — this task is NOT a procurement

**Owner ruling 2026-09-04, superseding an earlier statement the same day:**

> *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* — confirmed on
> follow-up: *"Both exist — reuse them in place."*

⛔ **Do NOT read the earlier "we don't have ANY profile-related VPS yet" as a lie or an error.** Both
statements are recorded and dated. The reconciliation that stands:

> 🔴 ~~**A profile VPS and an S3 bucket PHYSICALLY EXIST and are REUSED IN PLACE. What is on them is
> UNKNOWN AND UNVERIFIED.**~~
>
> 🚨 **CORRECTED — owner ruling 2026-09-08, superseding the above AS TO THE BUCKET ONLY:**
>
> 🔴 **The profile VPS PHYSICALLY EXISTS and IS REUSED IN PLACE — unchanged. The S3 bucket is NOT
> reused: a BRAND-NEW, CLEAN bucket is created.** What is on the **box** is still UNKNOWN AND
> UNVERIFIED. The **old** bucket is now fully separable from the new backup path.

**This task is therefore: verify what is there → wipe / re-provision in place → repoint as needed.**
✅ **`setup-profile.sh` is idempotent and safe to re-run, which is exactly the shape this needs.**

⚠️ **Hardware existence and provisioning state are two different facts, and only the first is
known.** The owner's standing complaint — *"I am completely lost about what was done and what
wasn't"* — is answered by **filling in the table below**, not by building anything.

### ⚠️ Most of this is ALREADY BUILT — do not re-derive it

| Asset | What it is |
|---|---|
| `setup-profile.sh` (1,025 lines) | Provisions **and** deploys — swap, Docker, ufw, nginx, TLS, compose, a 120-second health gate with auto-rollback. ✅ **Idempotent** |
| `build-deploy-profile.sh` (575 lines) | Hardened two-hop deploy driver |
| `migrations/001`–`004` + `migrate.ts` | ✅ **Idempotent** — `schema_migrations`-tracked; **re-runs are no-ops** |
| [`0182`](../0182-profile-04i-server-bring-up-runbook/brief.md) | **A complete operator runbook.** ⚠️ **Read its 2026-09-04 annotations — two of its lines are WRONG** |

**Effort 0.5–1 day if nothing surprises, 2–3 days if it does. Risk Medium-High.**

---

## 🔴 CURRENT BOX STATE — UNKNOWN PENDING INSPECTION

**The owner can inspect the box directly and has a read-only command set. Fill this table in FIRST.
Until then every field is UNKNOWN, and no step below may assume a value for one.**

| # | Field | How it is read | Current value |
|---|---|---|---|
| B1 | Deploy role marker — **is this even the profile box?** | `/etc/geoconflict-deploy-role` | ❓ **UNKNOWN** |
| B2 | Is the stack directory there | `ls /opt/profile/` | ❓ **UNKNOWN** |
| B3 | Are containers running / healthy | `docker compose ps` | ❓ **UNKNOWN** |
| B4 | Has a backup ever completed, and when | `last-backup.json` | ❓ **UNKNOWN** |
| B5 | Swap configured | `swapon` | ❓ **UNKNOWN** |
| B6 | Firewall posture | `ufw status` | ❓ **UNKNOWN** |
| B7 | **Actual spec vs the 2 vCPU / 4 GB / 60 GB floor** | `nproc` / `free` / `df` | ❓ **UNKNOWN** |
| B8 | 🆕 **DB schema version — is migration `004_name_change.sql` applied?** | `schema_migrations` table | ❓ **UNKNOWN** — see `0067` note below |
| B9 | 🆕 ~~**What objects the reused S3 bucket holds**~~ 🚨 **CORRECTED 2026-09-08: the bucket is NOT reused. This probe now concerns the OLD bucket only, which is off the new path** | old-bucket listing | ❓ **UNKNOWN** — 🔴 see `0222`. ⚠️ **No longer gates the new backup path** |

🚨 **This table is the deliverable that answers the owner's actual question.** Record each result in
the worklog **as a value, dated** — do not summarise it as "looks fine". 🔒 **Values that are secrets
or identifiers stay out**: record *"role marker present and correct"*, never its contents.

⚠️ **B1 is a safety check, not a formality.** Wiping the wrong box is unrecoverable. **Confirm the
role marker before any destructive step.**

---

### 🔴 TRAP — `0182`'s runbook will break `0062` if followed as written

`0182`'s runbook said of `PROFILE_INTERNAL_TOKEN`: *"Optional — leave blank; the box
auto-generates and persists it."*

📌 **Citation corrected 2026-09-10 — this brief previously cited `0182/brief.md:136-137`, which is
WRONG:** at `589249c` those two lines are the section header `## 3. Confirm SSH access to the box` and
a blank line. **Read against `589249c` + the 2026-09-10 citation sweep (that sweep moved `0182`'s lines down):** the struck original sentence is at
[`0182/brief.md:185`](../0182-profile-04i-server-bring-up-runbook/brief.md) — that line holds
`~~*"Optional — leave blank; the box auto-generates and persists it."*~~` — and the same sentence is
quoted inside the `.env.profile.secret` code block at `0182/brief.md:241`. The correction banner runs
`0182/brief.md:182-231`; the corrected value line is `0182/brief.md:248`
(`PROFILE_INTERNAL_TOKEN=<generate-once-set-identically-on-both-sides>`).
⚠️ **Re-derive by content, never by shifting the number** —
[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

🚨 **True at T4i. FALSE now, and following it silently destroys XP.** `internalAuth` is a
`timingSafeEqual` over a **shared** secret (`src/profile-server/InternalAuth.ts:14-19`, `:26`) ⇒ a
token the **box** mints, which the **game server** does not hold, is a **401 on every credit call**.
The client is fail-soft with **no durable queue** (ADR-101) ⇒ **the XP is LOST, not queued**, and
nothing logs above `debug`.
🚨 **CORRECTED 2026-09-10 — the *"nothing logs above `debug`" / "silently swallowed"* half is REFUTED against the source.** A 401 (and a 403) is a non-5xx, non-429 4xx, so `postWithRetry` stops immediately and logs at **WARN — twice per failed batch**: `src/server/ProfileApiClient.ts:265-267` (`` `profile ${path} returned ${response.status}; not retrying` ``, inside the `status < 500 && status !== 429` guard at `src/server/ProfileApiClient.ts:264`) and `src/server/ProfileApiClient.ts:146-149` (`` `credit batch failed after retries; N award(s) dropped …` ``). **Frame `589249c` — `ProfileApiClient.ts` is clean at that commit, so these two numbers are stable.** ⛔ **THE XP-LOSS HALF IS UNTOUCHED AND STANDS IN FULL — the awards are DROPPED, never queued.** 🔴 It still goes unnoticed, because **nothing on that box reads the logs** (`0219`, **OPEN**) — **a warning nobody reads fails as quietly as no warning at all.**

➡️ **Generate it ONCE and set the SAME value on both sides** — the game
side is [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) (P2).

⚠️ **Owner ruling 2026-09-04: `PROFILE_INTERNAL_TOKEN` stays deliberately BLANK for the upcoming GAME
deploy** — citizenship is not ready. That governs the **game** side and does **not** license letting
the box auto-generate one.

### 🔴 TRAP — `POSTGRES_PASSWORD` cannot be rotated against a surviving data volume

The Postgres image applies it **only at initdb**. 🚨 **Under the reframe this trap is MORE likely,
not less** — wiping and rebuilding onto an **existing** box is exactly the case where a data volume
survives while the password is regenerated. **Decide explicitly whether the volume goes, and record
the decision.**

### 🔴 Backup credentials — RE-ISSUE, do not reuse the stale local values

`PROFILE_BACKUP_S3_ENDPOINT`, `_BUCKET`, `_PREFIX`, `_ACCESS_KEY`, `_SECRET_KEY` and
`PROFILE_BACKUP_AGE_RECIPIENT` are all **currently non-empty in the local env files and point at the
old setup.**

⚠️ ~~**The BUCKET is reused; the CREDENTIALS and the `age` KEYPAIR are re-issued.** Those are
different decisions and conflating them is how a half-migrated setup happens.~~

🚨 **CORRECTED 2026-09-08 — owner ruling, live in session, superseding the 2026-09-04 reuse ruling as
to the bucket only. THE SPLIT IS NOW SIMPLER, NOT SUBTLER:**

| | 2026-09-04 (superseded) | 🔴 **NOW — 2026-09-08** |
|---|---|---|
| **VPS / box** | Reused in place | ✅ **Reused in place — UNCHANGED** |
| **S3 bucket** | ~~Reused~~ | 🚨 **BRAND-NEW, CLEAN bucket. NOT the existing one.** |
| **S3 credentials** | Re-issued | ✅ **Re-issued — unchanged** |
| **`age` keypair** | Re-generated | ✅ **Re-generated — unchanged** |

⇒ **All SIX backup values are new**, the bucket included. There is no longer a half-migrated shape to
avoid on the storage side: **the new backup path shares nothing with the old bucket.**
⚠️ `setup-profile.sh:889-908` **fails the deploy CLOSED** on incomplete backup config — **that is the
guard working**, not a bug.

🔴 **The old encrypted objects sit in the OLD bucket, which is no longer on this path** — they remain
unreadable without an `age` private identity nobody can name. Disposition is
[`0222`](../../done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md), **whose question
changed shape on 2026-09-08** (a separable old bucket admits abandoning the whole bucket, not just
its objects) and is **UNANSWERED and the owner's**. **This task deletes nothing and decides nothing
about the old bucket.**

## What to build

1. **INSPECT FIRST — fill in B1–B9 above.** ⛔ **No destructive step before B1 confirms this is the
   profile box.**
2. **Run [`0216`](../0216-profile-p1-spike-ru-network-reachability/brief.md) (P1-spike)** from the box
   — ✅ it can run today. **Stop and report if it fails**; do not improvise a workaround.
3. **Decide, from what B1–B9 show, what "wipe" actually means here** — containers only, containers +
   volumes, or a full OS re-image. **Record the decision and its reason.** ⚠️ This is a judgement the
   inspection results should drive, not a choice made in advance.
4. **Confirm the hostname's A record still resolves and points where expected.** ⚠️ **A record
   resolving proves NOTHING about a server running** — treat it as one fact, not a health check.
5. **Fill `.env.profile` and `.env.profile.secret`** per `0182` §4, **with the trap corrections
   above**: generate `PROFILE_INTERNAL_TOKEN` explicitly and record it for P2; re-issue all six
   backup values; set `PROFILE_INTERNAL_ALLOW_IPS` per P2. 🔒 These files are gitignored and stay
   that way — **never paste a value anywhere.**
6. **Re-run the deploy in place:** `npm run deploy:profile`. ✅ Idempotent by design.
7. **Run the migrations** — ✅ **safe whether or not `004` is already applied** (`migrate.ts` records
   applied filenames in `schema_migrations` and skips them). **Run it rather than investigating
   first.**
8. **Verify per `0182` §6** — see Verification.
9. **Record what actually happened**, including anything the runbook got wrong. ⚠️ The runbook is
   2026-06 vintage; **assume at least one more line has drifted** and write down which.

### 🆕 `0067` note — this task may be carrying a migration nobody applied

`0067` (Name Change) shipped a client half **and** a profile-server half. **The client half is in the
live game release `362a2f9`; the server half ships in a SEPARATE image to this box.**

⛔ **Whether it was ever deployed is NOT determinable from this repository** — a profile deploy leaves
no artifact in git. **B8 settles it.** If `004` is unapplied, the name-change routes fail against a
schema lacking their tables, and `0067` is already closed, so nothing else is watching for it.
✅ **Step 7 fixes it either way.**

### 🚫 Not in this phase

- Wiring the game server (P2 / `0217`).
- The restore drill and `age`-key custody (P3 / `0218`).
- Log rotation, prune, uptime check, backup-freshness consumer (P4 / `0219`).
- Secret persistence on the box (P5 / `0220`).
- OS hardening, non-root deploy user, restart policy (P6 / `0221`).
- **Deleting or abandoning anything in the ~~reused~~ OLD bucket** (🚨 **2026-09-08: it is no longer
  reused — a new bucket is created, so the old one is fully separable**) — that is `0222` and it is
  an **UNANSWERED owner decision**.

## Verification steps

1. 🔴 **B1–B9 ARE ALL FILLED IN**, dated, in the worklog. ⚠️ **This is the acceptance criterion that
   answers the owner's actual complaint** — a green `/health` with an unfilled table does not close
   this task.
2. **B1 was confirmed BEFORE any destructive step.**
3. **`/health` returns `200` over a VALID Let's Encrypt cert** — no `-k`.
4. **`/health` returns the expected ok body**, not merely a 200 status.
5. On the box: swap active, `vm.swappiness=10`, `ufw` allows only 22/80/443 default-deny, **both**
   compose services **healthy**, image pinned by **`@sha256` digest**.
6. **Secret-hygiene spot check:** no DB password and no staging-env path in **any** process argv.
7. **The box geolocates to RU** — by IP geolocation, **not** by a script comment (the `Hetzner`
   comments in `setup.sh`/`update.sh` are stale and wrong).
8. **B7 was compared against the 2 vCPU / 4 GB / 60 GB floor**, and either meets it or a resize was
   done / raised. ⚠️ **Verify, then resize only if below the floor** — do not resize by default.
9. **`schema_migrations` contains `004_name_change.sql`** after step 7.
10. **`PROFILE_INTERNAL_TOKEN` was generated explicitly and recorded for P2** — 🚨 **not
    auto-generated by the box.** State plainly that `0182`'s *"leave blank; the box auto-generates"*
    guidance was **not** followed, and why. *(Citation corrected 2026-09-10: this read `0182:136-137`,
    which is wrong — that sentence is at `0182/brief.md:185` and `0182/brief.md:241` at `589249c`.)*
11. **All six backup values were newly issued**; state that none was carried over.
    🚨 **CORRECTED 2026-09-08 — DO NOT STATE THE STRUCK CLAIM BELOW. IT IS NOW FALSE, and stating it
    would record a falsehood as verified fact:**
    ~~"...and that the **bucket** was reused deliberately while the **credentials** were not."~~
    **State instead:** a **brand-new, clean S3 bucket** was created (owner ruling 2026-09-08),
    alongside newly-issued credentials and a newly-generated `age` keypair — while **the VPS was
    reused in place.** 🔒 **Name no bucket.**
12. **`/ready` responds** (`src/profile-server/Routes.ts:198-206` — the `app.get("/ready", …)` handler,
    `repo.ping()` → 200 / 503. *Corrected 2026-09-10 from `:198-207`; `:207` is a blank line.*)
13. 🔒 **No value appears anywhere** — worklog, report, commit message or log line.

## Notes

- **Primary reference:** [`0182`](../0182-profile-04i-server-bring-up-runbook/brief.md).
  ⚠️ **Read its annotations** — the **token trap** and the **backup limitation** were both corrected
  2026-09-04, plus a top banner. **Read against `589249c` + the 2026-09-10 citation sweep (that sweep moved `0182`'s lines down):** the token-trap correction banner is
  `0182/brief.md:182-231` (the struck original sentence at `0182/brief.md:185`, quoted again at
  `0182/brief.md:241`); the backup-limitation correction is `0182/brief.md:335-339` — `0182/brief.md:336` holds
  *"The cited line `setup-profile.sh:688` has **MOVED**"* and `0182/brief.md:337-339` the since-shipped off-box
  path. *(Citations corrected 2026-09-10: this note previously read `:136-137` and `:219`, both of
  which are wrong at `589249c` — `:136` is `## 3. Confirm SSH access to the box` and `:219` is
  `## 5. Run the deploy`.)*
- **Blocks:** P2, P3, P4, P5, P6 — and transitively `0062`'s live verification, `0017`'s and
  `0012`'s Deferred Live Tails, and one of `0065`'s three conditions.
- ⚠️ **This does NOT unblock `0065`.** That has **three** conditions and this addresses at most the
  `0062` one; `0014` and the payments-key issuance are untouched.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — no values, no lengths, no IPs, no hostnames, no bucket names.
</content>
