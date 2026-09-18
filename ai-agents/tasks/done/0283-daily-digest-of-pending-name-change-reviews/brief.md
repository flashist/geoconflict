# Daily digest to the Name Changes topic — how many players are waiting for a name review

## ID
0283

> ℹ️ **ID allocation, checked 2026-09-17 before filing.** `0283`: no folder under
> `ai-agents/tasks/{backlog,done,cancelled}/`, no `## ID` hit, no repo-wide hit. Highest existing ID
> was `0282`.

## Sprint
Sprint 4

*(was `Backlog` until 2026-09-17. ⛔ **The promotion is the PRODUCER'S CALL, not an owner ruling** —
the owner ruled the requirement and the zero-count behaviour, never the board. It discharges the
standing recommendation recorded on the Backlog row, *"promote to Sprint 4 the moment `0277` ships"*:
[`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) closed 2026-09-17 with its
Telegram topic routing deployed, so the dependency is met. Row **appended** at the bottom of Sprint 4,
nothing renumbered (ADR-035). ⚠️ Promotion is not a queue position — whether the running ship loop
picks this up is the lead's and the owner's call.)*

## Priority
Unscheduled

⚠️ **Board placement and rank are the PRODUCER'S CALL, not an owner ruling.** The owner ruled the
*requirement*; they did not rule where it sits. Filed on the Backlog board because it **cannot be
built until [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md)'s topic-routing work lands**,
and because it is not a go-live gate for anything in Sprint 4. **Recommendation to the owner: promote
it to Sprint 4 the moment `0277` ships**, rather than leaving it here — `0061` is the cautionary
precedent, a genuinely valuable item that sat unscheduled on this board for weeks because nothing
forced a re-look.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

⚠️ Plus an **owner step** — the digest has to be seen arriving in the Name Changes topic at least
once, on the real box. A digest nobody has watched arrive proves nothing (`0219` precedent).

## Context

### 🆕 NEW REQUIREMENT — OWNER RULING, 2026-09-17, given live in the lead session and relayed by `fkit-sprint-ship-loop` to a spawned `fkit-producer`

**Owner, verbatim:**

> *"in addition to regular 'change notification' that is done per each change request, we need to do
> something like 1 in 24h notification that is sent into the topic and tells the amount of users that
> wait for their names to be reviewed."*

**This is new scope. It existed in no brief before this one.** It is **in addition to** the existing
per-request operator notification (`src/profile-server/NameChangeRepository.ts:542`, which fires once
per name-change request) — it does **not** replace it.

**What is being asked for, restated plainly:** once every 24 hours, one message into the **Name
Changes topic** stating **how many players are currently waiting for a name review**.

### What the schema already gives us — verified read-only 2026-09-17

- Pending requests are rows in **`player_name_history`** with **`moderation_status = 'pending'`**
  (`migrations/004_name_change.sql`).
- A **partial unique index** — `player_name_history_one_pending_uq`, `where moderation_status =
  'pending'` — allows **at most one pending row per player**. ⇒ **the count of pending rows IS the
  count of waiting players.** No `DISTINCT`, no grouping, no ambiguity. Say so in the plan so nobody
  invents a more complicated query.

### 🧭 Producer analysis — NOT owner rulings. Weigh these, do not treat them as decided.

**1. Its real value is that a digest which STOPS arriving is itself a signal.**
A per-request notification that fails silently leaves **no trace at all** — nobody knows a message was
owed. A once-a-day message has an expected arrival, so its **absence is observable**. That makes it a
**partial backstop** for the silent-failure class recorded in
[`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md).
⚠️ **Partial, and the word is load-bearing.** It tells you the path was alive **once in the last 24
hours**; it does **not** tell you that any individual per-request notification arrived. Do not let this
task be used as an argument that `0061`'s fix is less necessary — `0061` fixes the send, this only
notices that sending stopped.

🚨 **AND IT DOES NOT COVER UPTRACE ALERT DELIVERY AT ALL — reading it that way is actively dangerous.**
This digest is produced on the box that holds the data and sent **straight through the Telegram
helper**: it never touches Uptrace, never crosses the profile box's nginx `/internal/` allowlist, and
never arrives from the telemetry box's egress address. A `401`/`403`/`404` on Uptrace's webhook channel
**permanently and silently disables alerting** (verified by disassembly — see
[`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)),
and **this digest would keep arriving daily, confirming "the bot works", while every alert was dead.**
`0284` is the guard for that path. **The two complement each other and neither is redundant:** `0284`
proves the alert path is **reachable** (its marker is written on receipt, before any send); this task
proves **Telegram delivery** is alive.

**2. There is a strong precedent to REUSE rather than reinvent, and it is worth looking at first.**
`profile-checks.sh` already runs **daily at 08:00 UTC on the profile box**, installed to
`/opt/profile/checks.sh` (0700) by `setup-profile.sh` and scheduled via `/etc/cron.d/profile-backups`.
It already **counts things** (disk usage, player-row growth) and **reports**. ⚠️ **But note the gap
honestly: it reports to stdout/a log and an external dead-man's-switch ping — it does NOT send
Telegram today.** So "reuse `profile-checks.sh`" is not free; it means adding a Telegram send to a
script that has none.

🚩 **DESIGN QUESTION — FLAGGED, DELIBERATELY NOT RULED: does the digest belong in `profile-checks.sh`
(cron on the box) or inside the profile-server process (an in-process daily timer)?** Each has a real
cost — the cron path needs a DB credential and a Telegram send added to a shell script; the in-process
path survives no restart schedule of its own and doubles a message if two instances ever run. **The
architect or the coder's plan decides this. This brief does not.**

### ✅ ZERO-COUNT QUESTION — DECIDED BY THE OWNER, 2026-09-17

> **Ruling: send the digest even when the count is zero.**

**This is an owner ruling given live in the lead session — not producer analysis and not architect
analysis.** It is settled; the plan does not get to re-open it.

**The ruling's rationale, and it is the load-bearing part:** **a message every day doubles as a
heartbeat.** If the digest stops arriving, that silence is itself the signal. A digest that only sends
when there is something to report is indistinguishable from a digest whose delivery has broken — which
is exactly the silent-failure class [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md)
documents, and which this project has now been bitten by **twice**: the feedback channel since August,
and the name-change notification that could not leave the box at all until today.

🔁 **Consequence for how this task is built and tested: "the digest arrives daily" is now a requirement
in its own right, independent of whether any name change is pending.** The zero case is not an edge
case to tolerate — it is the monitor. Anyone later tempted to "optimise away" the daily "0" message
would be **removing a liveness check, not removing a nuisance**. Do not do it, and do not let a test
treat a zero-count day as a no-send day.

<details>
<summary>The question as it was originally filed, kept so the trade is visible (superseded by the ruling above)</summary>

> ~~🚩 **OPEN QUESTION FOR THE OWNER — DELIBERATELY NOT DECIDED HERE: should the digest send when the
> count is ZERO?**~~
> - ~~**Send anyway:** a message every single day proves the delivery path is alive. The cost is a daily
>   message that usually says "0".~~
> - ~~**Stay silent at zero:** quieter, but **silence when there is nothing to report is indistinguishable
>   from a broken channel** — which throws away the entire backstop value described in point 1 above.~~
> - ~~**Producer's lean, not a decision:** send anyway, because point 1 *is* the reason this task exists.~~
> ~~**Put this to the owner (or the architect) before building. Do not pick one in the plan.**~~

**It was a real choice with a real trade — a daily message that usually reads "0" is a genuine cost.**
The owner weighed it and chose the heartbeat. Recorded so a later reader does not mistake the ruling
for an assumption nobody examined.
</details>

## What to build

1. **Count the waiting players** — `player_name_history` rows with `moderation_status = 'pending'`.
   One number. The one-pending-per-player index means the row count is the player count.
2. **Send it once per 24 hours into the Name Changes topic**, through the existing Telegram helper and
   the existing proxy. ⛔ **Do not add a second Telegram client and do not add a second proxy
   variable** — reuse `src/core/notifications/TelegramNotifier.ts` and the existing proxy variable, the
   same constraint `0277` carries.
3. **Route it to the Name Changes topic specifically** — this depends on `0277`'s topic-targeting work
   (see *Notes*). ⛔ **No topic id, chat id or token in this brief, in the code, in a test fixture, in a
   worklog or in a runbook line. Variable names only** — the values live in gitignored config.
4. **Handle a send failure loudly enough to be noticed**, in whatever shape the `0277` fix establishes.
   ⚠️ **Do not re-solve this here and do not invent a second answer:** `0277` + `0061` own the
   connection-level-failure fix, and this task must **inherit** it, not fork it. If `0277` has not
   landed that fix when this is built, say so in the worklog rather than shipping a digest that can
   itself vanish silently.
5. **Send on zero too — the owner ruled it (2026-09-17), it is not a choice left in the plan.** A day
   with no pending requests still produces a message. Treat the daily arrival as a **liveness check**,
   not as reporting: the point is that its absence is noticeable. Record the ruling in `worklog.md`.
   ⛔ Do not add a "suppress when empty" option, flag or config variable — that would re-open a
   settled ruling and re-introduce the silent-failure hole it was made to close.
6. **Tests** at the level the chosen design allows: the count query against the real schema
   (integration test, mixed pending/approved/rejected rows, and rows for players who already have a
   decided request), and the once-per-24-h scheduling decision unit-tested so a restart loop cannot
   produce a message per restart.
7. **One runbook line** under `ai-agents/knowledge-base/` — where the digest runs, which variables it
   needs, and how to turn it off. **Variable names only.**

## Verification steps

1. **The count is right against a seeded database.** Seed a mix of `pending`, `approved` and
   `rejected` rows across several players and assert the reported number equals the number of players
   with a pending request — not the number of history rows, not the number of players.
2. **A digest actually arrives in the Name Changes topic, observed by the owner on the real box.**
   ⛔ An arrival that has only been asserted does not count (`0219` precedent). The worklog records the
   **date and that it arrived** — ⛔ **no topic id, no chat id, no token, no host.**
3. **It lands in the Name Changes topic, not the Alerts topic and not the player-feedback chat.**
4. **It does not fire more than once in 24 hours**, including across a container restart — proved by
   test, and by the second day's single message on the box.
5. **The zero case sends — owner ruling, 2026-09-17.** Two separate checks, both required:
   - **Test:** with **zero** pending rows in the database, the digest still produces and sends a
     message (reporting 0). A test that asserts "no send when empty" is asserting the **opposite** of
     the ruling and is wrong.
   - **On the box:** a message is observed arriving on a day when nothing is pending. The worklog
     records the date and that it arrived — ⛔ **no topic id, no chat id, no token, no host.**
   The worklog names the ruling and its heartbeat rationale, so the daily "0" is never mistaken for
   noise and removed.
6. **The per-request notification still works and was not disturbed** — regression check against
   `NameChangeRepository.ts:542`'s existing path.
7. `npm test` green (including the shell harnesses), `npx tsc --noEmit` and `npm run lint` exit 0,
   `npm run check:config-parity` clean for any new variable it covers. ⚠️ If the digest lands in
   `profile-checks.sh`, add cases to `tests/profile-checks.sh` — it is in `npm test` and is the only
   gate that script has.

## Notes

- **Depends on:** [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) — the Telegram
  topic-routing work, which is what lets a message be addressed to a specific topic from the profile
  box. ⚠️ **Flagged honestly:** as `0277`'s brief reads today it is scoped around *Uptrace alert
  delivery*, and the topic-targeting slice was described to this producer by the lead rather than read
  off that brief. **Confirm the dependency against `0277` before planning this task** — if topic
  targeting ends up owned somewhere else, correct this line rather than working around it.
  - 🔄 **Update 2026-09-17: the dependency stands and is live.** `0277` is now being planned, and its
    planner has been told to state what `0277` must expose for `0283` **without building it**. So this
    dependency is being honoured in `0277`'s plan, not merely asserted here.
- **Related:** [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) — the
  silent-failure class this digest partially backstops, and the task that owns the actual fix;
  [`0067`](../../done/0067-name-change-citizens-only/brief.md) — shipped the per-request notification
  this one sits beside; [`0274`](../../backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) —
  its deploy drill now owns proving the per-request notification arrives at all.
- **Complements (NOT redundant with):**
  [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  — the alert-path liveness probe. ⚠️ **This digest does NOT cover Uptrace alert delivery** and would
  keep arriving while alerts were permanently dead — see the loud note in *Context*, point 1. `0284`
  covers reachability of the alert path; this task covers Telegram delivery. Neither substitutes for
  the other.
- **Blocks:** nothing.
- **Effort:** small — roughly half a day of build once `0277` has landed, plus the owner's observation
  of one real arrival. The design question in *Context* is the part that costs time, not the code.
- 🔒 **No secrets in any artifact** — no chat ids, no topic ids, no bot token, no host, no IP, no port,
  no proxy software name, in the brief, the plan, the worklog, a test fixture or the runbook line.
  **This file is tracked in git.**
- **Do not invoke the mover skills** — producer-only since ADR-033. Route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
