# P4 — Operability on the profile box: log rotation, image prune, an uptime check, and a reader for `last-backup.json`

## ID
0219

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High.** ⚠️ **Technically this is easy work. By CONSEQUENCE it is the "outage nobody noticed for
three weeks" class.** Do not let the low technical difficulty set the rank.

🔴 **PROMOTED 2026-09-10 — POSITION/RANK OWNER-RULED, given live in session and relayed through
the spawning session.** ⚠️ **The owner ruled the RANK, NOT the schedule** — ⛔ **`## Status` below is
UNCHANGED (`🔲 Backlog`), no mover skill was invoked, and this brief stays under
`ai-agents/tasks/backlog/`. SCHEDULED IS NOT STARTED — nobody is building this.**

**The reasoning recorded:** [`0216`](../../done/0216-profile-p1-spike-ru-network-reachability/brief.md)
closed the same day having **PROVEN the box CAN renew its certificate**, so **this task now owns the
ONLY live risk left from that work — nothing reads the renewal log** — and the **same monitoring gap
covers the backup freshness marker** (G3 below). 🚨 **The fuse, as a date not an adjective: the live
certificate's `notAfter` is 2026-11-20, and `setup-profile.sh:983`'s twice-daily `certbot renew`
starts attempting a real HTTP-01 challenge from ~2026-10-21. A break between now and then FAILS
SILENTLY, twice a day, until TLS stops serving on the profile host.**

✅ **The owner was told the tradeoff and ruled anyway: promoting this DISPLACES SOMETHING ELSE IN
SPRINT 4.** ⛔ **What is displaced was NOT itself ruled** and is not recorded as decided here.

🔒 **ADR-035:** this row was already on the Sprint 4 board and was **MOVED UP mid-board** (to directly
beneath the closed `0216`/`0215` pair). **That lift was granted for THAT MOVE ONLY — it is not a
standing licence and not precedent.**

⚠️ **The `High` LABEL itself is still the producer's** — the owner ruled position, not label.

---

🔴 **WORK ORDER OWNER-RULED 2026-09-10, given live in session and relayed through the spawning
session: `0218` (P3) → `0219` (P4) → `0217` (P2).**

🚨 **THIS RUNS P2 *AFTER* P3 AND P4 — the epic's own P-number sequence is DELIBERATELY INVERTED.
⛔ DO NOT "FIX" IT BACK.** The P-numbers record the order the phases were **written** in on
2026-09-04, not the order they are to be **worked** in.

⚠️ **The owner ruled RANK/ORDER, NOT schedule** — ⛔ **`## Status` below is UNCHANGED, no mover skill
was invoked, and this brief stays under `ai-agents/tasks/backlog/`. SCHEDULED IS NOT STARTED.**
⚠️ **The `High` LABEL above is still the producer's** — the owner ruled position, not label.

**The reasoning, recorded because the order is not the obvious one:**

- **`0218` leads** — the restore path is the **only claim in this epic still resting on faith**.
  Backups **encrypt and upload — proven**; that a backup **RESTORES is UNPROVEN**, ~~and the old
  bucket's objects are permanently unreadable for exactly that reason.~~ 🚨 **THAT SUPPORTING EXAMPLE
  IS RETRACTED 2026-09-10 — the old bucket was EMPTY; there were no objects** (owner, verbatim:
  *"I've already deleted the old bucket, it was empty, we never had anything there."*). ⛔ **The
  CONCLUSION IS UNCHANGED AND `0218` STILL LEADS:** restore is still unproven, and losing the
  illustration does not make it proven. ✅ **Cheapest to prove NOW, while every table has ZERO rows.**
- **`0219` second** — it owns the monitoring gap for **both** unread signals on that box: the
  **certificate renewal log** and **`/opt/profile/backups/last-backup.json`**. **Capability is proven
  for both; nobody is watching either.** **Dated fuse: the certificate's `notAfter` is 2026-11-20 and
  `setup-profile.sh:983`'s twice-daily `certbot renew` starts attempting from ~2026-10-21.**
- **`0217` last** — it is the step that **ENDS THE FREE WINDOW**: once the game server is wired and
  **real citizen rows exist**, the restore drill and any Postgres work **stop being free**.
  ⛔ **LAST IS NOT DEPRIORITIZED — deliberate sequencing, rank unchanged.**

⚠️ **The `Depends on` relationships are UNCHANGED.** The ruling set the order these are worked in; it
did **not** create or remove a technical dependency. 🔒 **ADR-035: the repositioning lift was granted
for THESE MOVES ONLY — not a standing licence, not precedent.**

📌 **`0220` (P5), `0221` (P6) and `0222` (Cleanup) were NOT ruled** — they keep their existing
positions and the producer's ranks.

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
- [`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box to configure.
- [`0241`](../0241-profile-verify-first-weekly-backup-copy/brief.md) — gates the **WEEKLY-COPY HALF OF G4 ONLY**, not the whole task. ⚠️ **READ THE NOTE BELOW BEFORE DEFERRING THIS TASK — the board is stricter than the real constraint.**

🔴 **CANONICALISED 2026-09-11 ON AN OWNER RULING, given live in the lead session and relayed through
the spawning session.** The producer had deliberately left `0241`'s gate as prose only, because the
canonical form marks the whole row unpullable and the gate covers only part of one item. **The owner
was shown that reasoning and ruled: formalise it anyway.** ⛔ **The ruling changed the RECORDED FORM of
the dependency and NOTHING ELSE — `## Status`, `## Priority`, `## Sprint` and this brief's folder are
UNCHANGED, and no mover skill was invoked.**

🚨 **THE CONSEQUENCE OF THE CANONICAL FORM, STATED SO NOBODY MISREADS IT: on any dependency-aware view
— the sprint board, `dashboard.sh`'s sentinel, or any reader that resolves `## Depends on` — `0219`
NOW READS AS FULLY BLOCKED. IT IS NOT.** ⛔ **Do not defer this whole task on the strength of that
reading.**

**What `0241` actually gates is ONE half of ONE item:**

| Item | Gated by `0241`? |
|---|---|
| **G1** — container log rotation | **No.** Startable today. |
| **G2** — image prune | **No.** Startable today. |
| **G3** — external uptime check (and the renewal-log reader) | **No.** Startable today. |
| **G4** — backup freshness, **DAILY**-object half | **No.** Startable today. |
| **G4** — backup freshness, **WEEKLY**-copy half | 🚨 **YES. Do not build or ship it until `0241` answers.** |

⚠️ **The practical cost of the gate is SMALL: `0241` becomes actionable on Sunday 2026-09-13 (02:30
UTC is the first-ever weekly-copy attempt), and it is a single observation taking minutes.** 🚨 **The
failure this note exists to prevent is a reader seeing `0219` blocked, not knowing why, and parking
the entire task for no reason.**

🚨 **GATED 2026-09-11 — THE BACKUP-FRESHNESS HALF OF THIS TASK (G4) IS GATED BY
[`0241`](../0241-profile-verify-first-weekly-backup-copy/brief.md).**

🔴 **`profile-backup.sh:171-177`'s WEEKLY copy has NEVER EXECUTED against the current bucket.** It
fires only on a Sunday, and the last Sunday predates the bucket;
[`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) observed
`weekly/` **EMPTY** on 2026-09-11 (its residual 3). The **first-ever attempt is Sunday 2026-09-13,
02:30 UTC**, and `0241` exists to watch it.

⛔ **DO NOT BUILD OR SHIP THIS TASK'S WEEKLY-PATH HANDLING UNTIL `0241` HAS ANSWERED.** If the weekly
path silently fails, this task would build a **freshness monitor for a path that does not work** — and
a monitor built on a broken producer **manufactures confidence**, which is worse than no monitor.

⚠️ **This is a GATE, not a hard block.** G1 (log rotation), G2 (image prune) and G3 (uptime check),
and the **daily**-object half of G4, are unaffected and can proceed.

🔴 **Four things `0218` proved that this task's consumer MUST NOT assume** (from its hand-off):
(a) the `last-backup.json` signal has only ever been observed carrying an **empty-DB** payload;
(b) a nightly **log line is NOT a retrievable object** — four of five went to a bucket that no longer
exists; (c) a **manual** `backup.sh` run **overwrites** that day's scheduled object at the same key,
so freshness-by-object-date can be satisfied by a human rather than by the schedule; (d) the weekly
path has never run against this bucket. **Observed marker shape:**
`{schema, started_at, finished_at, exit_status, object_key, size_bytes, error}`.

## Context

Four gaps, all verified, all on the same box. Each one is individually small; together they are the
difference between a service you operate and a service that fails quietly.

### G1 — 🔴 No container log rotation. This is the class that already took down game prod.

`setup-profile.sh` **never writes `daemon.json`**, and the compose file **declares no `logging:`
block** ⇒ Docker's default **unbounded `json-file`** driver.

`ai-agents/knowledge-base/container-log-retention.md:5-6` says so outright:
> *"The profile and telemetry boxes are not covered here."*

⚠️ **This is the exact mechanism that filled the game production disk** — an unrotated container log
grew until the disk was full and assets began truncating mid-transfer. It is not hypothetical; it has
happened on this project once already, on a different box.

### G2 — No image prune. Storage grows every redeploy.

The previous image is retained for rollback (correctly), but **nothing ever removes older ones**.
`0182/brief.md:361-364` already records this as a known limitation — that bullet opens *"**Docker
images are not auto-pruned**"* and says *"Run `docker image prune -f` periodically"* — and nothing
does. 📌 *Citation corrected 2026-09-10 (post-2026-09-10-sweep numbering; see `0182`'s own citation frame): this read `0182:224-227`, which is the
`npm run deploy:profile` code block.* The script logs a disk warning past 60% to a file, and **nothing pages on it**.

### G3 — 🔴 No monitoring or alerting of ANY kind.

- **No OTEL — by design** (`src/profile-server/Logger.ts:5-8`). That is a deliberate choice, not a
  gap to fix by adding OTEL.
- **No external uptime check.** Container healthchecks and systemd auto-restart exist, but **nothing
  off-box observes liveness.** `0182/brief.md:365-367` already asks for one — that bullet opens *"**No
  external monitoring on this box.**"* and ends *"add one external uptime check on
  `https://api.geoconflict.ru/health`"*. 📌 *Citation corrected 2026-09-10 (post-2026-09-10-sweep numbering; see `0182`'s own citation frame): this read
  `0182:228-230`, which is the "what the deploy does, in order" prose.*
- 🚨 **NOTHING reads `last-backup.json`.** The backup path writes a freshness record and **no
  consumer exists.** Cron mails root **only if an MTA is installed**, and **nothing installs one.**

⚠️ **The compound failure is the point: a backup that stops is INVISIBLE, while the 14-day prune
keeps deleting.** Three weeks later there is no backup and no signal that there ever stopped being
one.

### 📌 What `0216`'s close already established — do NOT re-derive it

🔴 **RENEWAL CAPABILITY IS PROVEN. WHAT IS MISSING IS MONITORING, NOT CAPABILITY.**

Established on the box on 2026-09-10 by [`0216`](../../done/0216-profile-p1-spike-ru-network-reachability/brief.md):

- `certbot renew --dry-run`, run **with the cron's real `--pre-hook "systemctl stop nginx"` /
  `--post-hook "systemctl start nginx"` while nginx was up**, returned
  **`Congratulations, all simulated renewals succeeded`**.
- The dry run performed a **FULL HTTP-01 challenge against Let's Encrypt STAGING** — a real exercise
  of the mechanism, with **zero production rate-limit budget spent**.
- **The pre/post nginx hooks were exercised and work**: nginx stopped, the challenge bound port 80,
  nginx came back `active`, and TLS served `200` afterwards.
- **This is the same mechanism the twice-daily automatic renewal will use** ⇒ the renewal path is
  proven **end to end**, not merely the challenge.

⛔ **Do not re-run or re-scope the capability check. It is done.**

⚠️ **What `0216` did NOT establish, and this task must not assume:** **intermittency was never
measured** for any source (one passing afternoon says nothing about an intermittent network),
**latency was never recorded**, and **no real production renewal has ever been observed** — what
passed was a *staging simulation* of the real path.

🔴 **The renewal log is therefore the FIRST unread signal on this box, and
`/opt/profile/backups/last-backup.json` (G3) is the SECOND. They are the same gap, and this task owns
both.**

### The precedent to mirror, not reinvent

The game box already solves two of these. **Mirror it:**

| Concern | Existing solution on the game box |
|---|---|
| Docker log rotation | `update.sh:91-92` |
| Image prune | `update.sh:37` / `:102` |

**Do not design something new.** Same shape, applied to the profile box's provisioning.

## What to build

1. **Docker log rotation on the profile box.** Mirror `update.sh:91-92` — a `daemon.json` written by
   `setup-profile.sh`, and/or a `logging:` block in the compose file. ⚠️ **Decide and record which
   layer owns it**, so the next person does not add a second, conflicting one.
2. **Image prune on the profile box.** Mirror `update.sh:37` / `:102`. **Keep the current image and
   the rollback image**; prune older ones.
3. 🔴 **A reader for the `certbot renew` output — the residual `0216` handed to this task.** The
   twice-daily renewal (`setup-profile.sh:983`) writes a log **nobody reads**. Something must
   **detect a failed or absent renewal attempt and raise an alert**, on the same footing as the
   backup-freshness consumer in item 4. ⚠️ **`0216` proved the renewal WORKS; it did not make a
   later break visible.** ⛔ **Do not treat "0216 is Done" as covering this.**
4. **One external uptime check on `/health`.** Off-box. ⚠️ **"External" is the requirement** — a
   check that runs on the box it is checking observes nothing when the box is down.
   💡 `/ready` also exists (`src/profile-server/Routes.ts:198-207`) — decide explicitly which endpoint
   the check hits and why.
5. **A consumer for `last-backup.json`.** 🚨 **This is [`0034`](../0034-monitoring-alert-bot-phase2/brief.md) item 5** — check that task before building, so this is one
   implementation rather than two. Something must **read the freshness record and raise an alert when
   it goes stale**. ⚠️ **Do not "solve" this by installing an MTA so cron can mail root** — an email
   nobody reads is the same silence with extra steps.
6. **Update `ai-agents/knowledge-base/container-log-retention.md`** so `:5-6` no longer says the
   profile box is uncovered. ⚠️ A document that disclaims coverage after coverage exists is a
   document that will send someone to add a duplicate.

### 🚫 Not in this phase

- Adding OTEL to the profile server. **Its absence is by design** (`Logger.ts:5-8`) — changing that
  is a separate decision, not an operability fix.
- The restore drill and key custody (P3 / `0218`). This task only needs the cron's **output** to
  monitor; proving the restore works is P3's job.
- The full alert-bot build — coordinate with `0033` / `0034` rather than duplicating them.

## Verification steps

1. **Container logs are bounded** — demonstrated by configuration **and** by an observed rotation or
   an enforced size cap, not by reading the config file alone.
2. **Image prune runs** and leaves current + rollback intact. ⚠️ **Prove the rollback image
   survives** — a prune that breaks rollback is worse than no prune.
3. 🔴 **A failed renewal is VISIBLE.** Deliberately make a renewal attempt fail (or withhold its
   record) and **observe the alert arrive**. ⚠️ **An alert that was never seen firing is not a
   verified alert** — the same standard items 4 and 5 apply, and for the same reason.
4. **The uptime check fires on a real outage.** 🚨 **Stop the service deliberately and observe the
   alert arrive.** ⚠️ **An alert that was never seen firing is not a verified alert** — this is the
   same standard `0201` applies to its gate, and for the same reason.
5. **The backup-freshness consumer alerts on a stale record.** Deliberately age or withhold the
   record and observe the alert. Then restore normal operation and observe it clear.
6. **Alerts reach a human who will actually see them** — the destination is named in the worklog.
   ⚠️ *"It writes to a log file"* does not satisfy this task; that is the state it exists to end.
7. **`container-log-retention.md` reflects reality**, and its `:5-6` disclaimer is corrected.
8. **`0034` item 5 is either implemented here or explicitly cross-referenced** so it is not built
   twice.
9. 🔒 **No values in any alert payload, config, or worklog** — no endpoints, no tokens, no bucket
   names.

## Notes

- **Effort: ~1 day. Technical risk: Low. Consequence of skipping: HIGH.**
- 🚨 **GATE:** [`0241`](../0241-profile-verify-first-weekly-backup-copy/brief.md) must answer before
  this task's **weekly-path** handling is built — see the block under `## Depends on`.
  🔴 **RESOLVED 2026-09-11 BY OWNER RULING: it IS now a canonical `## Depends on` entry.** ⚠️ *The
  earlier text here said the canonical form was deliberately withheld and that making it canonical was
  an owner call. **The owner was asked and ruled: make it canonical.** That question is CLOSED — do not
  re-open it, and do not "restore" the prose-only form.* 🚨 **The reasoning behind the old form was
  correct and is NOT discarded: the canonical bullet makes `0219` read FULLY BLOCKED while only the
  weekly-copy half of G4 actually is. The per-item table under `## Depends on` is the record of what is
  really gated — read it before deferring this task.**
- **Related:** [`0033`](../0033-monitoring-alert-bot-phase1/brief.md) and
  [`0034`](../0034-monitoring-alert-bot-phase2/brief.md) — the alert-bot track. **Item 5 of `0034` is
  the `last-backup.json` consumer.** Read both before starting; the right outcome may be that this
  task contributes to `0034` rather than duplicating it.
- **Related:** `0182/brief.md:361-367` (post-2026-09-10-sweep numbering; see `0182`'s own citation frame) already recorded the prune and uptime-check
  gaps as known limitations — 📌 *corrected 2026-09-10 from `0182:224-230`, which is the deploy-steps
  block.*
  **They were recorded and then not done** — which is itself the argument for doing them now.
- **The prod disk-full incident** is the precedent for G1. The mechanism (unrotated container log →
  full disk → truncated assets) is documented in project memory; do not re-derive it.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
</content>
