# Name-change digest — runbook (task `0283`)

> ⛔ **READ THIS FIRST. What its daily arrival proves, and what it absolutely does not.**
>
> ✅ It proves **Telegram delivery from the profile box is alive**, once a day, unconditionally.
> That is the only non-circular proof of *sustained* delivery this system has.
>
> ⛔ It proves **nothing about Uptrace alert delivery**, and reading it that way is dangerous. The
> digest never touches the monitoring stack, never crosses nginx's `/internal/` allowlist, and never
> arrives from the monitoring box's egress address. **A 403 could have permanently disabled the alert
> channel and this digest would keep arriving daily saying "the bot works", while every alert was
> dead.** Task `0284`'s probe guards that path. The two complement each other; neither substitutes
> for the other. See `alert-delivery-runbook.md`.
>
> ⛔ It is only a **partial** backstop for `0061`: it says the path was alive at 04:00 UTC, never that
> any individual per-request notification arrived.
>
> ⛔ It does **not** discharge `0274` amendment A1 (delivery after an idle period). A daily cadence is
> weak evidence toward it, not the test it asks for.

---

## What it is

One Telegram message a day into the **Name Changes** topic, carrying the number of players waiting
for a name review:

```
[Name change] Daily digest
Waiting for review: 3
2026-09-19 04:00 UTC
```

**It sends even when the count is zero.** That is an **owner ruling (2026-09-17)** and it is
load-bearing, not an oversight: the daily arrival is the heartbeat, so the message's **absence** is
the signal. A digest that spoke only when there was something to report would be indistinguishable
from a digest whose delivery had broken.

⛔ **Never add a "skip when empty" condition** — in the cron line, in the CLI, or behind a flag. It
would remove a liveness check, not a nuisance. Two tests and one harness assertion exist purely to
turn that change red.

## Where it runs

| Piece | Location |
|---|---|
| Schedule | `/etc/cron.d/profile-backups` on the **profile box**, `0 4 * * *` — **04:00 UTC (07:00 MSK)** |
| Trigger | `docker compose exec -T profile-api npm run digest:name-changes` |
| Logic | `src/profile-server/NameChangeDigest.ts` |
| Entry point | `src/profile-server/sendNameChangeDigest.ts` |
| Log | `/var/log/profile-name-change-digest.log` |
| Freshness marker | `/var/lib/profile/digest/last-name-change-digest.json` in the container; `<profile dir>/digest/` on the host |
| Dead-man's-switch check | `profile-checks.sh` check 12, `name-change-digest`, in the daily 08:00 UTC run |

Moscow is UTC+3 year-round (Russia abolished seasonal clock changes in 2014), so there is no
summer/winter variant of that hour.

The **monitoring box is not involved at all** and needs no deploy.

## What it needs

**Variable names only — never paste a value anywhere tracked.** All four already exist in the box's
0600 `profile.env` and are already exported by the deploy script. **This task introduced no new
variable.**

- `FEEDBACK_TELEGRAM_TOKEN`
- `FEEDBACK_TELEGRAM_CHAT_ID`
- `TELEGRAM_PROXY_URL` — load-bearing, not polish: `api.telegram.org` is blocked from Russian IPs and
  every box in this project is in Moscow.
- `TELEGRAM_TOPIC_NAME_CHANGES` — the forum topic. **Blank does not disable the digest**; it moves it
  to the group's General topic.
- `DATABASE_URL` — read by the shared pool helper.

## Running it by hand

On the box:

```bash
docker compose -f <profile dir>/docker-compose.yml exec -T profile-api npm run digest:name-changes
```

Exit **0** means Telegram accepted the message (`sent` or `sent_after_retry` — a rescued retry is a
success, task `0277`). Exit **1** means anything else, including the bot not being configured at all.
A hand run stamps the freshness marker exactly like the cron run does.

## Turning it off

⚠️ **This is a four-part change, and doing only the first part turns `npm test` red.** All four
belong in one commit:

1. Comment out (or delete) the cron line in `setup-profile.sh`, **and** the deploy-time
   `npm run digest:name-changes` invocation just below the cron block.
2. Remove `check_name_change_digest` from `profile-checks.sh` — its definition *and* its call.
   Otherwise it pages daily through the external dead-man's switch once the marker goes stale.
3. **Remove the matching assertions in `tests/scripts/profile-deploy-hardening.test.sh`.** Without
   this, `npm test` fails on `found 0 digest cron line(s), expected exactly 1` (the cron line),
   `no deploy-time 'npm run digest:name-changes'` (the seeding run), and
   `check_name_change_digest is not both defined and called` (the check). These are the guards
   doing their job, not broken tests.
4. Fix the check counts in `tests/profile-checks.sh` — its `RESULT: N ok` assertions expect 12
   checks — and delete the `C23` block.

⚠️ **Clearing `TELEGRAM_TOPIC_NAME_CHANGES` does not turn it off** — it moves the message to
General.

## When it stops arriving

> ⚠️ **Check 12 firing does NOT mean Telegram is broken.** Three different faults age that marker,
> and only the log tells them apart. Do not start with Telegram:
>
> 1. **Telegram delivery failed** — nothing arrived. `result=…` in the log says which way.
> 2. **The message ARRIVED, but the marker write failed.** The run still exits **0** — that is
>    deliberate, because the message really did arrive — and the log carries
>    `could not write the freshness marker`. Telegram is fine; suspect the `digest/` bind mount,
>    its permissions, or a full disk. The page is real but it is pointing at the wrong system.
> 3. **The DB query threw**, so nothing was sent at all. This is a **Postgres** fault wearing a
>    Telegram costume, and it is the one that wastes the most time if you assume (1).

1. **Check the running image first.** 🚩 A profile image rolled back to a build predating `0283`
   **leaves the cron line in place**, calling an npm script that no longer exists. You get a daily
   `Missing script` in `/var/log/profile-name-change-digest.log` and no digest — which looks exactly
   like a broken Telegram path. This is the same rollback surprise `0284` has.
2. **Read `/var/log/profile-name-change-digest.log`.** The failure is logged with bounded fields only
   (`result`, `status`, `code`) — deliberately no token, URL, chat id or topic id.
3. **`result=not_configured`** ⇒ the token or chat id is blank in `profile.env`.
4. **`result=network_error`** ⇒ suspect `TELEGRAM_PROXY_URL` first; direct egress to Telegram from a
   Russian IP does not work.
5. **No `result=` line at all, but an error from the pool** ⇒ cause (3) above: the count query never
   returned, so there was nothing to send. Check `DATABASE_URL` and the postgres container.
6. **`could not write the freshness marker`** ⇒ cause (2) above. The digest itself is healthy.
7. **Check 12 already told you.** A stale or missing marker (> 26 h) fails the daily checks run and
   pages through the external dead-man's switch. A **future-dated** marker also fails, on purpose: a
   negative age would otherwise read as "fresh" for the whole duration of a clock skew.

## Deploy

One run of `./build-deploy-profile.sh` covers both halves — the image carrying the CLI, and
`setup-profile.sh` rewriting the cron file. The image is current before the cron line is written.

📌 **Every deploy sends one extra digest, on purpose.** Right after writing the cron file,
`setup-profile.sh` runs `npm run digest:name-changes` once. Two reasons:

- **It stops a false page.** A deploy landing between **04:00 and 08:00 UTC** (07:00–11:00 MSK, an
  ordinary working morning) would otherwise install check 12 with no marker and no digest slot
  before that day's 08:00 checks run — and the dead-man's switch would page for a system that is
  working perfectly.
- **It proves the whole path at deploy time** — image, npm script, DB, proxy, token, topic, bind
  mount — instead of at 04:00 tomorrow.

⛔ A synthetic marker written without sending was **rejected by the owner**: the marker asserts that
a message *arrived*, so stamping one without sending would make check 12 certify a delivery that
never happened.

**A failed deploy-time digest warns; it does not abort the deploy.** That follows this script's own
convention — it fails closed only for faults nothing else would notice (a bad migration, an
unproven backup pipeline) and warns where something already watches, exactly as the `checks.sh`
install does. A failed digest withholds the marker, so check 12 pages within 26 h and **that page
is true**. Blocking a deploy on a third-party Telegram outage would be strictly stricter behaviour
than anything else here.

## Verification the owner must do on the real box — never claimed by an agent

1. Deploy. **The deploy itself sends one digest** (see *Deploy* above) — watch the deploy output for
   `✅ Deploy-time name-change digest sent`, or the `⚠️ WARNING` that replaces it.
2. Watch that message arrive in Telegram. (Running it by hand, as above, does the same thing and is
   still the way to re-check later.)
3. Confirm the room: the **Name Changes** topic — not Alerts, not the player-feedback chat.
4. The **second day's single message** — one, not two. That proves the schedule.
5. **A zero-count day sends.** Observed on a day with nothing pending.
6. Record the dates in the task worklog. ⛔ No topic id, chat id, token or host.
