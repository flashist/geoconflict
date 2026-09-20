# Daily Name-Change Digest — the one non-circular proof that Telegram delivery is alive

**Source**: `ai-agents/tasks/done/0283-daily-digest-of-pending-name-change-reviews/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0283`

> ⛔ **No chat ids, topic ids, tokens, hosts, IPs, ports or proxy software names on this page** — the
> brief, the plan, the worklog and the runbook are all written under that rule and the vault honours it.
> Variable names, file paths and the cron expression are fine.
>
> 📌 Operator ground truth: `ai-agents/knowledge-base/name-change-digest-runbook.md` (new with this
> task). Read it before touching the box.

## Goal

**One Telegram message a day into the Name Changes topic, saying how many players are waiting for a name
review — sent even when the answer is zero.**

**Owner ruling, 2026-09-17, verbatim:**

> *"in addition to regular 'change notification' that is done per each change request, we need to do
> something like 1 in 24h notification that is sent into the topic and tells the amount of users that
> wait for their names to be reviewed."*

It is **in addition to** the per-request operator notification `0067` shipped
(`src/profile-server/NameChangeRepository.ts` — the notify call in the name-change request path), not a
replacement.

### 🔑 Why it exists: the daily arrival is a heartbeat, so its ABSENCE is the signal

**Second owner ruling, same day: it sends even at zero count.** That is load-bearing, not an oversight.
A per-request notification that fails silently leaves **no trace at all** — nobody knows a message was
owed. A once-a-day message has an **expected arrival**, so a missing one is observable.

⛔ **Never add a "skip when empty" condition** — not in the cron line, not in the CLI, not behind a flag.
It would remove a liveness check, not a nuisance. **Two tests and one harness assertion exist purely to
turn that change red.** The brief records the trade honestly: a daily message that usually reads `0` is a
genuine cost, and the owner weighed it and chose the heartbeat.

### What it does and does not back up — all four boundaries

| Claim | Verdict |
|---|---|
| Telegram delivery from the admin box is alive, once a day, unconditionally | ✅ **the only non-circular proof of *sustained* delivery this system has** |
| Uptrace **alert** delivery works | 🚨 **NO — and reading it that way is actively dangerous.** See below |
| `0061`'s silent-failure class is covered | ⛔ **Partial only** — it says the path was alive at 04:00 UTC, never that any individual per-request notification arrived. ⛔ **Not an argument that `0061`'s fix is less necessary** |
| `0274` amendment A1 (delivery after an idle period) | ⛔ **Does not discharge it.** A daily cadence is weak evidence toward A1, not the test it asks for |

🚨 **THE DANGEROUS MISREADING, stated at full volume.** The digest is produced on the box that holds the
data and sent straight through the Telegram helper. **It never touches the monitoring stack, never
crosses nginx's `/internal/` allowlist, and never arrives from the monitoring box's egress address.** A
`403` could have **permanently and silently disabled the alert channel** while this digest kept arriving
daily saying *"the bot works"* — **worse than no heartbeat at all.** `0284`'s probe guards that path.
**The two complement each other; neither substitutes for the other.**

## Key Changes

✅ **The open design question was DECIDED in the plan** — the brief deliberately left it unruled
(in-process daily timer vs `profile-checks.sh`, each with a real cost). Neither was chosen:

| Piece | Where |
|---|---|
| Schedule | a **host cron line** written by `setup-profile.sh`, `0 4 * * *` — **04:00 UTC = 07:00 MSK, the owner's chosen hour** |
| Trigger | `docker compose exec -T profile-api npm run digest:name-changes` — a **one-shot Node process in the existing container** |
| Logic | `src/profile-server/NameChangeDigest.ts` |
| Entry point | `src/profile-server/sendNameChangeDigest.ts` |
| Send | the **existing** `src/core/notifications/TelegramNotifier.ts` and the **existing** proxy variable — ⛔ no second Telegram client, no second proxy variable |
| Freshness marker | success-only, read by `profile-checks.sh` **check 12**, `name-change-digest` |

🔑 **No HTTP route was added, and that is deliberate** — a `401`/`403`/`404` from the relay route
**permanently disables the Uptrace notification channel**, so the digest stays off that surface
entirely.

**The count needs no clever query.** Pending requests are `player_name_history` rows with
`moderation_status = 'pending'`, and the partial unique index `player_name_history_one_pending_uq`
allows **at most one pending row per player** ⇒ **the row count *is* the waiting-player count.** No
`DISTINCT`, no grouping.

**Variables — names only; all four already existed in the box's `0600` env file. This task introduced no
new variable**: `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL` (load-bearing,
not polish — Telegram is blocked from Russian IPs and every box here is in Moscow),
`TELEGRAM_TOPIC_NAME_CHANGES`, `DATABASE_URL`. ⚠️ **Clearing the topic variable does not turn the digest
off** — it moves the message to the group's General topic.

📌 **Every deploy sends one extra digest, on purpose.** `setup-profile.sh` runs the digest once right
after writing the cron file. Two reasons: a deploy landing between **04:00 and 08:00 UTC** would
otherwise install check 12 with no marker and no digest slot before that day's checks run, and **the
dead-man's switch would page for a system working perfectly**; and it proves the whole path (image, npm
script, DB, proxy, token, topic, bind mount) at deploy time instead of at 04:00 tomorrow. ⛔ **A synthetic
marker written without sending was REJECTED by the owner** — the marker asserts that a message
*arrived*, so stamping one without sending would make check 12 certify a delivery that never happened.
**A failed deploy-time digest warns; it does not abort the deploy** — it withholds the marker, so check
12 pages within 26 h and **that page is true**.

## Outcome

✅ **Closed 2026-09-18 by a spawned `fkit-producer`.** Gates all green and not degraded: `npm test`
**138 suites / 1870 tests**, zero failures, nothing skipped · `npx tsc --noEmit` · `npm run lint` ·
`check:config-parity` **CLEAN** (no new variable) · hardening harness `ALL PASS` · `tests/profile-checks.sh`
`RESULT: 136 passed, 0 failed` · the real-Postgres integration suite **38/38**, run independently by two
contexts · **Codex second opinion RAN** (`codex exec --sandbox read-only`, exit 0) — **no degradation**,
3 findings, 2 matching the Claude-side reviewer independently. All **nine** review findings verified and
fixed; six new or widened guards were **mutation-probed against a deliberately-broken scratchpad copy**
before being trusted.

### 🎯 OWNER-OBSERVED LIVE DELIVERY — 2026-09-19. The first real messages this feature has ever produced

Until this, **every Telegram send in this task was exercised only through a mocked seam.**
Source: `0283`'s `worklog.md` — search for `OWNER-OBSERVED LIVE DELIVERY` *(verified in the uncommitted
working tree, 2026-09-19)*.

The owner deployed the profile box on the evening of **2026-09-18** and read the topic the next morning.
**Two messages, both rendered correctly:**

| Message | Body timestamp | Delivered (MSK) | What it is |
|---|---|---|---|
| 1 | `2026-09-18 18:33 UTC` | 21:34 | the **deploy-time send** |
| 2 | `2026-09-19 04:00 UTC` | **07:00** | **cron**, `0 4 * * *` UTC |

Both read exactly `[Name change] Daily digest` / `Waiting for review: 0` / `<timestamp> UTC`. The owner
**confirmed the room by `AskUserQuestion`: the Name Changes topic** — not Alerts, not the player-feedback
chat — which proves `TELEGRAM_TOPIC_NAME_CHANGES` routing end to end. The owner's chosen hour landed to
the minute (`04:00 UTC + 3 = 07:00 MSK`; Moscow is UTC+3 year-round).

✅ **The zero-count ruling is now verified in production, not just in a unit test** — both messages read
`Waiting for review: 0`. That is the most load-bearing line here.

📌 **Two messages inside 24 h is EXPECTED** — message 1 is the deploy-time seed, message 2 is cron. **One
extra digest per deploy** is the documented, owner-accepted cost. The harness still asserts exactly
**one** cron line.

⛔ **This does NOT change the close.** The brief and the sprint row keep
`✅ Done (agent-closed — not owner-verified)`; only the owner may upgrade a landed `✅ Done`, and nobody
invoked that. **This is evidence, not a status change.**

### ⛔ What those two messages do NOT prove — so the ✅s cannot be over-read

1. ⛔ **Nothing about Uptrace alert delivery.** A 403 could have permanently disabled the alert channel
   while these two messages arrived perfectly. `0284` guards that; this does not.
2. ⛔ **Nothing about delivery after an idle period** (`0274` **A1**). The gap was ~9.5 h — closer to a
   cold connection than the drill's minutes-apart bursts, but **weak evidence toward A1, not the test A1
   asks for.** ⛔ **Do not record A1 as discharged by this.**
3. ⏳ **The second day's single message is NOT yet discharged.** One scheduled firing is not a schedule.
   The proof is the **2026-09-20** 07:00 MSK message arriving, and arriving **once**.
4. ⏳ **`profile-checks.sh` check 12 had not yet run on the box** at the time of the report (~07:38 UTC;
   the checks cron fires at 08:00 UTC). Its first-ever run should read the marker at ~4 h old and pass.
   **Unobserved.**
5. ⛔ **Nothing about a non-zero count.** Both messages reported `0`. The non-zero path is unit-tested and
   has **never rendered a real pending count**.

### Accepted residuals — recorded, not unfinished work

- **D3** — the marker is written **only on success**; accepted conditional on check 12's `FAIL` text
  naming all three causes, which was fixed.
- **D4** — the atomic marker writer is **duplicated byte-identical** from `AlertRelay.ts` rather than
  shared, and the CLI entry file is executed by no test. Accepted: a broken writer costs a **false page**,
  never a lost message.
- **R7** — the import guard is text matching, not module resolution, so a *transitive* import could evade
  it. Accepted **with corrected stakes: it would not be silent** — it would `EADDRINUSE`, exit non-zero,
  withhold the marker and page within 26 h.
- **R5** — the zero-count syntax guard still misses `!count`, a yoda comparison and an env-gated skip;
  the jest behavioural test is the backstop. Deliberately not chased, per the reviewer.

### 🚩 Check 12 firing does NOT mean Telegram is broken — three faults age that marker

Only the log tells them apart, and **do not start with Telegram**:

1. **Telegram delivery failed** — `result=…` in the log says which way.
2. **The message ARRIVED but the marker write failed.** The run still exits **0** (deliberate — the
   message really did arrive) and logs `could not write the freshness marker`. Suspect the bind mount, its
   permissions, or a full disk. **The page is real but points at the wrong system.**
3. **The DB query threw**, so nothing was sent. **A Postgres fault wearing a Telegram costume** — the one
   that wastes the most time if you assume (1).

🚩 **And check the running image first.** A profile image **rolled back to a build predating `0283`**
leaves the cron line in place, calling an npm script that no longer exists: a daily `Missing script` and
no digest, which **looks exactly like a broken Telegram path**. Same rollback surprise `0284` has.

⚠️ **Turning it off is a four-part change in one commit** — cron line *and* the deploy-time invocation;
`check_name_change_digest` (definition *and* call); the matching hardening-harness assertions; and
`tests/profile-checks.sh`'s check counts plus its `C23` block. Doing only the first part turns `npm test`
red. **Those are the guards working, not broken tests.**

## Related

- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the dependency: topic routing and the connection fix this inherits rather than forks
- [[tasks/alert-path-liveness-probe]] — task `0284`, the **other half**: it proves the alert path is reachable, this proves Telegram delivery is alive. ⚠️ **Neither substitutes for the other**
- [[systems/alert-delivery]] — the alerting path this digest must never be read as covering
- [[decisions/adr-114-admin-server-alert-relay]] — its A3 names citing this digest as alerting evidence as the error the amendment exists to prevent
- [[tasks/citizenship-name-change]] — task `0067`, which shipped the per-request notification this sits beside and owns `player_name_history` / migration 004
- [[systems/player-profile-store]] — the admin box, the table counted, and the daily checks run
- [[tasks/profile-deploy-hardening]] — the harness asserting the cron line, the deploy-time send and the check
- [[tasks/setup-profile-heredoc-root-command-execution]] — task `0282`, the other change to this deploy script closed in the same sprint run
- [[systems/telemetry]] — the monitoring stack this deliberately does **not** touch
- [[decisions/sprint-4]] — the sprint that owns it
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274`, whose owner step 5 proved the **per-request** operator notification. ⛔ **A DIFFERENT mechanism from this digest**, and this digest does not discharge its amendment A1
