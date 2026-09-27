# Name-change digest — runbook (task `0283`)

> 📌 **Approving or rejecting a request** (the Approve/Reject lines in each per-request Telegram
> message) is covered at the end: [Deciding a request: approve or reject (task `0312`)](#deciding-a-request-approve-or-reject-task-0312).
> A request you only see in the digest's **list** message (task `0315`) is covered there too:
> [Acting on a request you only see in the list](#acting-on-a-request-you-only-see-in-the-list-task-0315).

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

### The second message: the list (task `0315`)

On days with **at least one request waiting**, a **second** message follows the heartbeat, in the
same topic (owner ruling 2026-09-27: *"Always send the short message as it works today. And the next
message with more text"*; list only, up to 20). Placeholders shown here:

```
[Name change] Waiting for review — list
1. <player uuid> · <name> · waiting 2 d 5 h
2. <player uuid> · Bad⟨U+00A0⟩Name · waiting 10 min ⚠️ hidden characters
…and 5 more waiting (oldest shown first)
2026-09-19 04:00 UTC
```

- **Up to 20 requests, oldest first.** The rest are counted in the `…and M more` line (which only
  appears when something was left out). A very long list of names full of hidden characters is cut
  earlier to stay under Telegram's length limit — the cut ones are counted in `M` too. The list
  counts its own total when it is read, seconds after the heartbeat's count, so the two numbers can
  differ by a request submitted or decided in between; the list's is the newer one.
- **The id is the internal player id** — the one the decide command's `playerId` takes. Never a
  Yandex id.
- **The name is shown like the per-request message's `Requested:` line**: any character that is not
  a letter, digit, `_`, `[`, `]` or plain space is shown as a `⟨U+XXXX⟩` code, and the line gets
  `⚠️ hidden characters`. A newline in a name shows as `⟨U+000A⟩`, so a name cannot fake a line.
- **Waiting time** is counted from the request to the digest run: `N min`, `N h M min`, `N d M h`.
- **No Approve/Reject lines** (owner ruling). To act on a listed request, see
  [Acting on a request you only see in the list](#acting-on-a-request-you-only-see-in-the-list-task-0315).
- **No list on a zero day** — the heartbeat's `0` already says it. (This is about the **list**
  only; the heartbeat itself still sends every day, including at `0`.)

⛔ **The heartbeat, not the list, is the liveness proof.** The heartbeat is byte-for-byte what it was
before `0315`, is sent first, and alone decides the freshness marker, check 12 and the exit code. The
list is sent **only after** the heartbeat arrived; a failed list changes **none** of those three.
That also means **nothing pages when only the list fails** — it shows only in the digest log (see
*When it stops arriving*).

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

Exit **0** means Telegram accepted the **heartbeat** message (`sent` or `sent_after_retry` — a
rescued retry is a success, task `0277`). Exit **1** means anything else, including the bot not being
configured at all. A hand run stamps the freshness marker exactly like the cron run does.

The list message (task `0315`) **does not change the exit code**: exit 0 with a failed list is
possible and expected — look for `name-change digest list NOT sent` in the output.

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
   ⚠️ Only a pool error **without** `list NOT sent` in front of it counts here. A
   `name-change digest list NOT sent: <error>` line is the **list** query failing *after* a
   heartbeat that arrived — that is item 8, and it does not age the marker, so it cannot be why
   check 12 fired.
6. **`could not write the freshness marker`** ⇒ cause (2) above. The digest itself is healthy.
7. **Check 12 already told you.** A stale or missing marker (> 26 h) fails the daily checks run and
   pages through the external dead-man's switch. A **future-dated** marker also fails, on purpose: a
   negative age would otherwise read as "fresh" for the whole duration of a clock skew.
8. **The heartbeat arrived but the list did not** (on a day with requests waiting) ⇒ grep the log
   for `list NOT sent`. It is followed by either `result=…` (bounded fields, as above — a Telegram
   send that failed) or an error from the list query. ⚠️ **Nothing pages for this** — check 12
   watches the heartbeat only, by design. The heartbeat's count still tells you how many are waiting.

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
4. The **second day's messages** — **exactly one heartbeat per day**, plus **one list message on days
   with pending requests**. Never two heartbeats. That proves the schedule.
5. **A zero-count day sends** — the heartbeat only, no list. Observed on a day with nothing pending.
6. **A day with pending requests shows both, the heartbeat first** (task `0315`): make one pending
   test request, then run the digest by hand (or wait for 04:00 UTC) — the heartbeat, then a list
   naming it.
7. Record the dates in the task worklog. ⛔ No topic id, chat id, token, host, player id or name.

---

## Deciding a request: approve or reject (task `0312`)

Every per-request Telegram message ("[Name change] Pending request") ends with **two ready-to-paste
lines**: **Approve** and **Reject**. Each runs a small command shipped inside the profile-server
image, `npm run -s name-change:decide` (`src/profile-server/decideNameChange.ts`), in the running
`profile-api` container. That command reads the internal token **from the container's own
environment** and posts the decision to the server's decide route on `127.0.0.1`.

- The token is **never typed, printed, or put in Telegram**. Nothing you paste holds a secret.
- Each line **binds the decision to the exact name the message showed** (`expectedName`, owner
  ruling `0067` option A). The command refuses to run without it.
- The name is written in the line as pure ASCII (`\u00a0`-style codes for anything unusual), so no
  name can break the quoting (task `0307`). The **Requested:** line above it is where you read the
  name — with any hidden character shown as a `⟨U+…⟩` code.

**When a new request messages you (task `0313`).** A player's requests send at most **one** message per
10 minutes. **Once you approve or reject, that player's next request messages you at once.** A
withdraw does **not** reset it: withdraw → re-request inside 10 minutes sends **no** new message, so
that request shows only in the daily digest's list (task `0315`).

### Where to run it

1. SSH to the **profile box**, as the user you run the other profile-directory commands as (the
   profile directory is root-only).
2. **Then** paste the line into that shell.

⚠️ **Do not wrap it as `ssh <box> '<line>'`.** That adds a second shell that re-reads the quotes and
breaks them. SSH in first, then paste.

⛔ **Not from your laptop.** Nginx allows `/internal/` only from the game and monitoring boxes (task
`0276`) — correct, keep it. The old laptop `curl` line got `403` for exactly that reason.

### Approve

Paste the **Approve** line as it is. Shape (placeholders shown here; the message has the real line):

```bash
docker compose -f <profile dir>/docker-compose.yml exec -T \
  -e NAME_CHANGE_DECISION='{"playerId":"<player uuid>","decision":"approve","expectedName":"<name>"}' \
  profile-api npm run -s name-change:decide
```

### Reject

Paste the **Reject** line, but first **replace `REPLACE-WITH-REASON`** with the text the player will
read (at most 500 characters). The command refuses the unedited placeholder, so it can never reach
a player's inbox.

```bash
docker compose -f <profile dir>/docker-compose.yml exec -T \
  -e NAME_CHANGE_DECISION='{"playerId":"<player uuid>","decision":"reject","expectedName":"<name>"}' \
  -e NAME_CHANGE_REASON='<reason the player will read>' \
  profile-api npm run -s name-change:decide
```

- **An apostrophe in the reason:** type it as `'\''` — for example `'Don'\''t use real names'`.
- **The shell shows `>` and waits:** a quote was left open. Press **Ctrl-C** and paste again.
  Nothing was sent.

### What the answer means

| Output | Exit | Meaning | What to do |
|---|---|---|---|
| `HTTP 200: approved` | 0 | The name is applied; the player gets an inbox message. | Nothing. |
| `HTTP 200: rejected` | 0 | Rejected with your reason; the player keeps their name and gets an inbox message. | Nothing. |
| `HTTP 404 no_pending` | 1 | Nothing pending for this player — already decided, or the player cancelled. Nothing changed. | Nothing, or check with the read-only query below. |
| `HTTP 409 name_taken` | 1 | Another player got this name first. Nothing changed; the request is **still pending**. | Reject it with a reason, or retry later. |
| `HTTP 409 name_mismatch` | 1 | The name pending now is not the one in your line — the player cancelled and asked for a different name. Nothing changed. The pending name is printed as an escaped string. | Decide on the new name — its own Telegram message, if one came (a player is notified at most once per 10 minutes, except that once you approve or reject, their next request notifies at once), or the daily digest's list. Never re-use the old line. |
| `HTTP 400 bad_request` | 1 | The server refused the request's shape. Nothing changed. | Copy the line again from Telegram. |
| `HTTP 401 unauthorized` | 1 | The container's token was not accepted. Nothing changed. | Make sure you ran it on the profile box, in `profile-api`, exactly as pasted. |
| `HTTP 503 name_change_unavailable` | 1 | Name changes are switched off on this server. Nothing changed. | Check the server's startup log. |
| `HTTP 500 internal_error` | 1 | The server failed while deciding. | Check the `profile-api` logs; run the read-only query **before** retrying. |
| `No answer from the profile API …` | 1 | No answer (timeout or connection refused). **The decision may or may not have been applied.** | Run the read-only query **before** retrying. |
| `Refused: … Nothing was sent.` | 2 | Bad input caught locally (placeholder reason, blank reason, reason on an approve, broken or edited line, missing `expectedName`, reason over 500 characters, no token in the container). | Fix what it says and paste again. |

The name printed on a `409 name_mismatch` is escaped on purpose: a name holding hidden characters
or terminal control codes cannot change what your root terminal shows.

### Confirming the outcome (read-only)

```bash
docker compose -f <profile dir>/docker-compose.yml exec -T postgres \
  psql -X -U <postgres user> -d <database> -tA \
  -c "select moderation_status, decided_at, rejection_reason is not null from player_name_history where player_id = '<player uuid>' order by id desc limit 1"
```

It prints the latest request's status (`approved` / `rejected` / `pending`), when it was decided,
and whether a reason is stored — not the reason itself. Then check the player's card in the game.

### Acting on a request you only see in the list (task `0315`)

A request that never got its own message (see the `0313` note above) still shows in the daily
digest's **list**, which has **no** Approve/Reject lines (owner ruling). Build the line yourself from
the Approve or Reject shape above:

1. **`playerId`** — the id shown in the list line (the monospace uuid).
2. **`expectedName`** — the name exactly as shown, with **every `⟨U+XXXX⟩` replaced by `\uXXXX`**
   (for example `Bad⟨U+00A0⟩Name` → `Bad\u00a0Name`). Everything else is typed as shown. This gives
   the exact stored name: the display turns each hidden character into exactly one code, and `"`,
   `\`, `'` and control characters are always shown as codes, never raw — so nothing you type can
   break the quoting. Under today's name rule every code has exactly four hex digits.
3. **SSH in first**, then paste — exactly as in *Where to run it* above.

**A mistake is safe.** A wrong name gets `HTTP 409 name_mismatch` and **nothing changes**; that answer
prints the pending name as an escaped string you can paste straight into `expectedName`. A mistyped
id is either refused before anything is sent (`Refused: …`, not a valid id) or gets
`HTTP 404 no_pending` (no pending request under that id) — nothing changes either way. (The one way
a wrong id could decide something is if it were another waiting player's id **and** your
`expectedName` matched that player's pending name — so copy the id from the same line as the name.)

### Messages sent before this deploy

A Telegram message sent **before** the image carrying task `0312` was deployed still shows the old
single **Approve** line (a laptop `curl`), which gets `403`. Do not use it. Build the new line by
hand instead: take the JSON between the old line's `-d '` and the closing `'`, and use it as
`NAME_CHANGE_DECISION` in the Approve shape above. To reject, change `"decision":"approve"` to
`"decision":"reject"` inside it and add `NAME_CHANGE_REASON`. Keep `expectedName` exactly as it was.

### Rollback

The message and the command ship in **the same image**, so a rollback moves them together: an image
from before `0312` emits the old line and has no `name-change:decide` script (`Missing script`).
After a rollback, decide with the shape the message of that image shows.

### What it needs

Variable names only — never paste a value anywhere tracked. **No new deploy variable.**

- `PROFILE_INTERNAL_TOKEN`, `PROFILE_PORT` — the container's own, from `profile.env`.
- `NAME_CHANGE_DECISION`, `NAME_CHANGE_REASON` — set per run by the pasted line's `-e`, never by a
  deploy (allowlisted as runtime-supplied in `scripts/config-parity-allowlist.json`).

### Verification the owner must do on the real box — never claimed by an agent

1. Deploy with `./build-deploy-profile.sh`.
2. Make a name request on a test account. The Telegram message shows **both** lines.
3. Paste **Approve** on the box → `HTTP 200: approved`; the card shows the name.
4. Make a second request; paste **Reject** with a real reason → `HTTP 200: rejected`; the card shows
   the rejected state.
5. Neither run prints the token.
6. Record the date in the task worklog. ⛔ No host, IP, token, player id or name.
