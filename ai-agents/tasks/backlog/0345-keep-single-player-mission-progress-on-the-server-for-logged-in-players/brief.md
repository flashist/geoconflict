# Keep single-player mission progress on the server for logged-in players (epic `0304`)

## ID
0345

> ℹ️ **ID allocation, checked 2026-09-29.** Allocated in sequence right after
> [`0344`](../0344-investigate-why-single-player-mission-progress-resets-to-level-1/brief.md) in the same
> filing. No folder, no `## ID` hit, no hit under `ai-agents/` or `.claude/`.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021)**, on an owner request
given live in the `fkit lead` session and relayed by `fkit-lead`. The owner asked for the work to sit on
the Backlog board. ⚠️ **The owner did not rule on design, merge rules or edge cases** — they are the
open questions below.

**The owner's words, verbatim:**
> *"Add a task to the backlog: save player's progress in their profile (currently some people complain
> that they play missions for a long amount of time, and then suddenly, their progress is reset, from 123
> to 1, for example). Ideally, we should save the progress of the player in their profile, to be able to
> secure it. The problem is that we create profiles only for authorized users, which means, that we would
> need to have something like a migration system for players, who log in. The migration system might be
> a tough task to handle, taking into account that there can be many edge-cases (e.g. guest login playing
> and reaching some mission level > then loggining in and continuing playing as a logged in user > then
> refreshes then opens the game on another device (or the same device, but logged out) > then logs in
> again - we need to figure out what takes priority over what, my simplest suggestion is that
> server-profile takes priority over browser-saved data all the time). Add the task into the backlog
> sprint."*

### ⚠️ This is NOT a new, parallel effort — it is a child of epic `0304`

Epic [`0304`](../0304-epic-server-side-player-settings-and-state-for-logged-in-players/brief.md)
(filed 2026-09-26, also owner-requested) already covers moving logged-in players' per-player state from
the device to our server, including the **first-login migration** the owner describes here. Its first
two children already exist and already name mission progress:

- [`0305`](../0305-inventory-and-classify-per-player-state-kept-on-the-device/brief.md) — the inventory;
  `geoconflict.sp.nextMissionLevel` is a row (*"Likely yes — progress lost on a new device"*) and
  *"single-player mission progress"* is in its minimum set of owner rulings.
- [`0306`](../0306-design-server-side-player-state-store-schema-api-migration-and-rollout/brief.md) —
  the design: table + migration `007_…`, API, merge rules, first-login merge, guests, fail-soft, boot
  timing, kill switch.

So this task is the **mission-progress slice** of that epic — the *"per-key cutover"* the epic lists as
its provisional step 4 — and it carries the owner's own requirements and edge cases for this key. It
does **not** get its own table, migration or API: it uses whatever `0306` designs. **Its "how" will be
re-scoped once `0306` is reviewed** — if `0306`'s proposed split replaces this brief, the producer
updates or re-files it then. What this brief pins down is the **outcome** and the **questions**.

**Why mission progress may deserve to go first.** The epic's provisional order puts the tutorial flag
first. Mission progress is the key **players are actively complaining about**, and it is the one where
a loss costs a player hours of play. Whether to reorder is the owner's call (question 4 below).

**The cause of the reset is unknown** — task
[`0344`](../0344-investigate-why-single-player-mission-progress-resets-to-level-1/brief.md) finds it.
If the cause is a bug in our code, a server copy would faithfully store the wrong value too, so that
fix must land regardless of this task.

### What is stored today

One number: `localStorage["geoconflict.sp.nextMissionLevel"]` (`src/client/SinglePlayMissionStorage.ts`),
read for the mission button's label and when a mission starts (`src/client/Main.ts`,
`startSinglePlayMission()`), raised on a mission win (`WinModal.ts`, stores
`max(current, finished level + 1)` — it only ever goes up there). A second key,
`geoconflict.sp.lastCompletedAt`, is written but never read back. No server copy, no Yandex cloud save.

### The owner's starting suggestion — NOT a ruling

> *"server-profile takes priority over browser-saved data all the time"*

Recorded as the owner's starting point. ⚠️ **Producer's flag, for the owner to weigh (question 1):**
taken literally, "server always wins" reproduces the reported bug in the most common migration case — a
guest who reached level 123 on this device logs in for the first time, the server has level 1 (or
nothing), and the server's 1 overwrites the device's 123. It also loses progress whenever a player plays
logged-out and then logs back in. Mission level only ever goes **up** in normal play, which makes
**"the higher level wins"** a simple rule that gives the same answer however often it runs (the
property `0306` item 6 asks for). The trade-off is cheating and account sharing — see the constraints.

### Edge cases the design must answer (the owner's list, plus the producer's)

1. **Guest reaches level N, then logs in for the first time** — server has no mission progress.
2. **Guest reaches N, logs in, server already has M** (from another device). N > M and N < M.
3. **Logged-in player refreshes the page** — the server copy must come back, and the mission button must
   not show the wrong level while the server has not answered yet (boot timing — `0306` item 10).
4. **Same account on another device** — the other device must show the server's level.
5. **Same device, logged out** — does the guest see the last logged-in level, their own older guest
   level, or level 1? (Today the device value simply stays.)
6. **Logs in again after playing logged-out** — the logged-out progress: merged up, or dropped?
7. **Two Yandex accounts on one device** — must account A's progress flow into account B? (`0306` item 7
   already asks this for every key.)
8. **Profile server down or slow** — play continues on the device value, no error, no extra wait; the
   win is not lost and reaches the server later (the profile client has **no durable queue** today, so
   "later" means the next successful sync, not a retry queue).
9. **The server copy is lower than the device copy on a normal launch** (e.g. a write that failed) —
   which one the player plays.

### Constraints

- **Trust.** The mission level is whatever the client says; a player can edit their browser storage.
  Today it is worth nothing else: singleplayer grants no XP, and per `0210`'s ruling singleplayer should
  report nothing to the platform leaderboard (the design confirms both still hold). If it ever becomes
  worth something (a reward, a leaderboard), it cannot be client-reported.
- **Identity is not verified yet.** The profile session is `vfy:false` until
  [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (Sprint 7) enforces verified
  sessions — until then, anyone who asserts a player's id can get a session for it and write that
  player's mission level. Low value, but it is griefing (push someone to level 500, or back to 1 under
  a "server wins" rule). Question 5.
- **Everything epic `0304` lists** — live database with real players since 2026-09-26, forward-only
  migrations by filename (`007_…`), backup/restore coverage of the new table, no extra blocking at boot
  (5 s shared platform deadline), guests keep device storage, 152-ФЗ residency already satisfied, store
  the minimum.

## What to build

Once `0306` is designed and reviewed, and the mission-progress row is ruled in `0305`:

1. For a logged-in player with a profile, the mission level is **kept on the server** and read back on
   any device, following the rule the owner picks (question 1).
2. On each login (each device), the device's level is **merged** into the server copy by that rule.
   Idempotent — running it twice gives the same result. The device value is never deleted or lowered
   before the server has confirmed its copy.
3. Guests: unchanged — device storage only, no profile call.
4. Fail-soft: profile server unreachable, slow, 401 or 429 → the device value is used and kept; nothing
   is shown to the player; the next successful sync catches up.
5. The mission button's label and the level a mission starts at are consistent with the rule — no mission
   starts at a level the rule would have replaced (boot timing per `0306`).
6. Behind the rollout flag / kill switch `0306` defines — off returns every client to device-only
   behaviour without a deploy.
7. Tests for the merge rule covering each edge case above that the rule decides.

## Verification steps

1. **Two devices, one account:** win mission N on device A; on device B (logged in, same account),
   the mission button shows N+1 after the server has answered.
2. **First login with guest progress:** as a guest reach level N; log in with an account whose server
   copy is empty → the server now holds N and the device still shows N (not 1).
3. **Conflict:** server holds M, device holds N ≠ M → the result is exactly what the owner's rule says,
   and the same after a second login.
4. **Refresh:** a logged-in player refreshes; the level is unchanged.
5. **Server down:** block the profile server; a logged-in player's level is the device value, a mission
   win is kept on the device, no error appears, and after the server is back the next login syncs it.
6. **Guest:** no profile call is made; behaviour is identical to today.
7. **Kill switch off:** every client behaves as device-only.
8. Each edge case in the list above has a recorded rule (owner ruling or design decision) and, where the
   rule is testable, a test.

## Notes

- **Depends on:** `0306` (the design — storage, API, merge, boot timing, flag), `0305` (the owner's
  ruling on the mission-progress row and its merge rule), `0340` (verified logins — **added 2026-09-29 on OWNER RULING Q5** *"Wait for 0340"*; see *Owner rulings* below).
- **Blocks:** nothing known.
- **Informed by:** `0344` (the cause of the reset — if it is a code bug, that fix is separate and must
  land regardless).
- Parent epic: `0304`.
- Related: `0340` (verified sessions — see the identity constraint), `0273` (Bearer profile session),
  `0169` (cancelled 2026-06-13 — a guest→login migration for XP; its cancellation report recommends a
  **server source of truth with a thin, best-effort device cache** over a device-authoritative store, and
  records that any migration body is attacker-controlled device data), `0210` (singleplayer reports
  nothing), `0142` (missions are an unbounded generated sequence).
- **Open questions for the owner** (recorded 2026-09-29; none ruled):
  1. **Which copy wins** — "server always wins" (owner's suggestion), "the higher level wins"
     (producer's recommendation), or "server wins unless it has nothing yet".
  2. **Guest progress on a shared device** — carried into whichever account logs in on that device, or
     only into an account whose server copy is empty?
  3. **Logged-out play on a device that was logged in** — show the last logged-in level, or the device's
     own guest level?
  4. **Order within epic `0304`** — make mission progress the first key moved (before tutorial and
     announcements)?
  5. **Ship before verified sessions (`0340`)?** — accept the griefing exposure for a worthless number,
     or wait for `0340`.

## Owner rulings — 2026-09-29

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021).** Given live on
2026-09-29 by the owner in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`.
⛔ Not producer precedent. **Append-only:** everything above is kept as written, including the open-question
list (now answered here) and the owner's starting suggestion (now superseded here).

| # | Question | Owner's answer, verbatim |
|---|---|---|
| Q1 | Which copy wins when device and server disagree | *"The higher level wins (Recommended)"* |
| Q2 | Guest progress on a shared device | *"Into any account (Recommended)"* |
| Q3 | Logged out on a device that was logged in before | *"The device's own level (Recommended)"* |
| Q4 | Mission progress first in epic `0304` | *"Yes, missions first (Recommended)"* |
| Q5 | Ship before verified logins (`0340`)? | *"Wait for 0340"* |

What each ruling means for this task:

- **Q1 — "the higher level wins" SUPERSEDES the owner's starting suggestion *"server-profile takes
  priority over browser-saved data all the time"*.** Why: taken literally, "server always wins" resets a
  guest who reached level 123 on a device and then logs in for the first time — the server has 1 (or
  nothing), and its 1 would overwrite the device's 123, which is the very bug players report. It would
  also drop levels played while logged out. The level only ever goes up in normal play, so "take the
  higher" gives the same answer however often it runs. Accepted trade-off: a player who edits their
  browser storage keeps the edited level (the number grants nothing today).
- **Q2 — guest progress on a device merges into ANY account that logs in on that device**, not only
  into an account with no saved progress.
- **Q3 — logged out, the device shows its own stored level** (today's behaviour); it is not replaced by
  the last logged-in level.
- **Q4 — mission progress is the FIRST key epic `0304` moves**, ahead of the tutorial flag and
  announcements. Recorded on `0304` and `0305` as dated notes.
- **Q5 — this task waits for `0340`** (verified logins, Sprint 7). Added to `## Notes` → *Depends on*
  above, so the board shows it. The griefing exposure is therefore not accepted.

⚠️ **Flagged, not resolved — possible tension with `0306` item 7.** `0306` (producer-written, not an
owner ruling) says a device shared by two Yandex accounts must not leak account A's values into account
B. For mission progress, Q2 + Q3 + Q1 together mean the device keeps **one** level, and it merges up into
whichever account logs in next — so if account A played on the device, A's level can flow into B. Raised
to the lead as NEEDS-DECISION on 2026-09-29; the design (`0306`) must not settle it silently.

## Owner ruling — 2026-09-29 (later): shared device, two accounts — no leak; simple and robust first

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021).** OWNER RULING given
live 2026-09-29 in the `fkit lead` session via `AskUserQuestion` (free-text answer), relayed by
`fkit-lead`. ⛔ Not producer precedent. **Append-only** — nothing above was edited; where this narrows an
earlier line, that line stays as history and this section wins.

The owner, verbatim, answering the shared-device NEEDS-DECISION raised above:
> *"No, it shouldn't reach the level of another account. I think what should be done is that we should
> implement the behaviour as simple as possible, but guaranteeing saving progress to not logged in users.
> Let's focus on the naive simple but robust solution first and then do any additions later."*

**The lead's reading — recorded as `fkit-lead`'s interpretation, NOT owner text.** The owner has been
told this reading and may correct it:

1. **One account's level must NOT flow into another account** (A at 80 must not lift B). This keeps
   `0306` item 7's no-leak rule and **narrows Q2**: only **true guest progress** (played while not logged
   in) carries into the account that logs in; progress earned while logged in as account A does not
   carry into account B.
2. ~~**Saving guest (not-logged-in) progress must be guaranteed and robust.** Guests keep device-only
   progress, so this also raises the weight of `0344` (the reset investigation).~~ ⛔ **SUPERSEDED
   2026-09-29 by the owner's typo correction below** — the guarantee is for **logged-in** players; guests
   losing data in some cases is acceptable.
3. **Scope discipline:** v1 is the naive, simple, robust version. Extras (cross-device niceties,
   edge-case polish, analytics, …) are later additions, not v1. The `0306` design proposes the simplest
   mechanism that satisfies 1 + 2 and lists what it defers.

Q1–Q5 stand as recorded (the higher level wins; missions first; wait for `0340`; …).

**What this changes in this brief (producer's notes, append-only):**

- The ⚠️ *"Flagged, not resolved — possible tension with `0306` item 7"* paragraph above is **answered**:
  no leak between accounts. Its sentence *"the device keeps one level, and it merges up into whichever
  account logs in next"* no longer holds — per the lead's reading, the device's **guest** level and a
  logged-in account's level must be kept apart, so a logged-in player's wins do not raise the level a
  guest (and so another account) inherits. How is `0306`'s to design, simplest mechanism first.
- The *Q2* bullet in *Owner rulings* above now reads, narrowed: a device's **true guest** progress merges
  into any account that logs in on it.
- *What to build* item 3 (*"Guests: unchanged — device storage only"*) is **too weak** against *"guaranteeing
  saving progress to not logged in users"*: guests stay device-only, but their saving must be robust.
  **This task still covers logged-in players only**; the guest guarantee rests on `0344`'s findings and
  whatever fix it proposes — see the gap flagged to the lead on 2026-09-29.
- Edge case 5 (same device, logged out) and edge case 7 (two accounts on one device) are now decided by
  this ruling together with Q3.

## Owner correction — 2026-09-29 (latest): the save guarantee is for LOGGED-IN players

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021).** OWNER CORRECTION
given live 2026-09-29 in the `fkit lead` session, relayed by `fkit-lead`. ⛔ Not producer precedent.
**Append-only** — superseded text above is struck or overridden here, never deleted.

The owner, verbatim:
> *"Regarding this: there was a typo, what I meant to say is that we should guarantee saves to LOGGED IN
> users, and if there are cases when NOT LOGGED IN users can lose their data, it's acceptable"*

- It corrects the phrase *"guaranteeing saving progress to not logged in users"* in the ruling above:
  **the guarantee is for LOGGED-IN players. Guests (not logged in) losing their data in some cases is
  acceptable.**
- The lead's reading **point 2 is SUPERSEDED** (struck above). **Points 1 and 3 stand:** one account's
  level never flows into another account; v1 is the naive, simple, robust version, extras later.
- **Q1–Q5 stand, including Q2** — true guest progress (played while not logged in) still carries into
  the account that logs in. The owner did not withdraw it.
- **Superseding my earlier producer note** in the section above: the bullet saying *What to build* item 3
  (*"Guests: unchanged — device storage only"*) is *"too weak"* and that *"the guest guarantee rests on
  `0344`'s findings … see the gap flagged to the lead"* **no longer applies** — there is no guest
  guarantee and no gap. *What to build* item 3 stands as originally written.
- **What the guarantee means for this task:** for a logged-in player, a mission win must reliably end up
  in the server copy — including when the profile server was briefly unreachable at the time (today's
  profile client has no durable queue, so the next launch/login must still push the device's higher
  level up). Until this task ships (it waits for `0340`), logged-in players' progress is device-only and
  **not** guaranteed.
