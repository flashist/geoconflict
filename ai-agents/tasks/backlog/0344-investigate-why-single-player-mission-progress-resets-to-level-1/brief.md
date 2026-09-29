# Investigate: why does single-player mission progress reset (e.g. from level 123 back to 1)?

## ID
0344

> ℹ️ **ID allocation, checked 2026-09-29.** Highest existing ID across `backlog/`, `done/`, `cancelled/`
> was `0343` (folder names and `## ID` fields agree). `0344` and `0345` allocated in sequence in one
> filing; no folder, no `## ID` hit, no hit under `ai-agents/` or `.claude/`.

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
the Backlog board. The owner did **not** rule on scope, design or merge rules — those are open.

**The owner's words, verbatim** (the full request — the feature half is task
[`0345`](../0345-keep-single-player-mission-progress-on-the-server-for-logged-in-players/brief.md)):
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

### Why this is its own task

Saving progress on the server (`0345`) protects **logged-in** players only, and it is gated on a
design (`0306`) that does not exist yet. The **cause** of the reset players report is not known. It
may be ordinary loss of browser storage — which the server copy would fix for logged-in players — or it
may be a bug in our code, which the server copy would **not** fix (a bug that writes `1` would write `1`
to the server too). Guests would keep losing progress either way. So the cause is found first, on its
own, and it may point to a cheap fix that helps **every** player long before `0345` ships.

### What is known today (producer read, 2026-09-29 — a lead, not a finding)

- The progress is **one number in the browser**: `localStorage["geoconflict.sp.nextMissionLevel"]`
  (plus `geoconflict.sp.lastCompletedAt`, a timestamp nothing reads back), in
  `src/client/SinglePlayMissionStorage.ts`. There is **no server copy and no Yandex cloud save**
  (ADR-112; epic `0304`'s check). Missions are an unbounded generated sequence, not a fixed list (wiki:
  *Missions Difficulty Investigation*, task `0142`).
- `getNextMissionLevel()` returns **`1`** whenever the stored value is missing, unreadable, not a
  number, below 1, **or when reading storage throws**.
- **One code path writes back what it just read.** `startSinglePlayMission()` in `src/client/Main.ts`
  calls `getNextMissionLevel()` and then immediately `setNextMissionLevel(level)`. If the read came back
  `1` for any of the reasons above while the write succeeds, the `1` is **persisted** over whatever was
  there. Whether this can actually happen (a read that fails while the following write succeeds) is for
  this task to establish — it is a lead, not a diagnosis.
- On a mission win, `WinModal.ts` stores `max(current next level, finished level + 1)` — it never
  lowers the value on its own. But if `current` read as `1`, the stored value becomes
  `finished level + 1`, which is still correct for that one mission.
- **The game runs in a cross-site iframe on Yandex Games** (`geoconflict.ru/yandex-games_iframe.html`),
  so its storage is **third-party, partitioned** storage keyed by the Yandex top-level site
  (`0253`'s findings, § 1.2). How long that storage survives across days, per platform, **has never been
  measured** (`0253` unknown 2).
- **There is no analytics signal for the mission level.** `UI:ClickMission` carries no level, and
  singleplayer/missions emit no match events (analytics reference). So today we cannot see a reset
  happen, or count how often it does.
- Related: `0269` — startup can crash when browser storage is blocked. Same family (storage that
  throws), different symptom.

## What to build

A findings report — **no fix in this task** unless the owner rules one in after reading it.

1. **Code audit.** Every read and write of the two mission keys, and every path that can make the
   stored value go **down**. Settle the `startSinglePlayMission()` read-then-write-back lead: can the
   read return `1` while the write succeeds (for example: a value that is present but not parseable, a
   read that throws for a transient reason, a storage-quota condition)? Check also anything that clears
   storage wholesale (a `localStorage.clear()`, a key-prefix sweep, a reset-progress button, a
   debug/dev path, the tutorial flow), and whether any build ever used a **different key name** or a
   different origin/iframe URL for the same data.
2. **Storage-loss scenarios.** For each, say whether it would produce the reported symptom and on which
   platforms: partitioned third-party storage inside the Yandex iframe; Safari / iOS tracking-prevention
   limits on script-written storage; private/incognito windows; the player or the browser clearing site
   data; a different device or browser; the Yandex app vs the Yandex website on the same phone; a change
   of the iframe origin/URL. Cite a public source for each browser rule you rely on.
3. **Reproduce what can be reproduced** locally (e.g. a corrupted value, a throwing read), and state
   plainly what cannot be reproduced from here.
4. **Recommend**:
   - the most likely cause(s), each marked confirmed / likely / ruled out / unknown, with evidence;
   - whether a **cheap interim fix** exists that helps every player (logged in or not) before `0345` —
     for example never writing back a value that was not read successfully — with its own small brief
     proposed for the producer to file;
   - whether to add a **measurement** (for example the mission level on mission start, or a
     "stored level went down" signal where one is detectable) so the size of the problem becomes
     visible — proposed, not built;
   - anything that changes `0345`'s scope (for example: if the cause is a code bug, `0345` alone would
     not fix it).
5. **Write the findings** to `ai-agents/knowledge-base/reports/` (dated) and link them from this brief and
   from `0345`. No player ids, no secrets.

## Verification steps

1. The report lists every read and write of `geoconflict.sp.nextMissionLevel` found by a fresh search of
   `src/` (outside tests), each with file + function.
2. The `startSinglePlayMission()` read-then-write-back lead has an explicit verdict with evidence
   (a reproduction, or the reason it cannot happen).
3. Every storage-loss scenario in step 2 has a verdict (causes the symptom / does not / unknown) and a
   cited source for each browser rule.
4. The report ends with the recommendation block from step 4, and any owner-only information it needed
   but did not have is listed as an open question — not guessed.

## Notes

- **Depends on:** nothing. Can start now.
- **Blocks:** nothing hard. It **informs** `0345` (and the design task `0306`): if the cause is a code
  bug, that fix must land regardless of the server copy.
- **Owner input that would help** (asked via the lead; not a blocker): what the complaints actually say —
  platform (phone / desktop, Yandex app / browser), whether those players were logged in, whether the
  reset happened after a long break, a browser update, or on a new device, and roughly how many reports.
- Related: epic `0304` (server-side player state) and its children `0305` (inventory — mission progress
  is already a row there) and `0306` (design); `0269` (storage blocked at startup); `0253` findings
  § 1.2 (storage survival in the Yandex iframe never measured); `0142` (missions are an unbounded
  generated sequence).

## Owner ruling — 2026-09-29

**Recorded 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021).** Given live on
2026-09-29 by the owner in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`.
⛔ Not producer precedent. Append-only — the *"Owner input that would help"* note above is kept and is
answered here.

- **Q6 — complaint details** (platform, logged-in or not, when it happened, how many): owner, verbatim:
  *"No details available"*. **So this investigation starts from the code and from how browsers and
  Yandex Games keep storage — there is no sample of player reports to work from.** The report must not
  claim a cause is "what players hit"; it can only say what is possible and how likely.

- **2026-09-29 (later) — pointer:** an OWNER RULING relayed by `fkit-lead` (⛔ not producer precedent) asks
  that saving progress for **not-logged-in** players be *"guaranteed"* (verbatim text in
  [`0345`](../0345-keep-single-player-mission-progress-on-the-server-for-logged-in-players/brief.md)).
  Guests stay device-only, so this investigation's cause-and-fix recommendation is what that guarantee
  rests on. Status and priority unchanged.

- **2026-09-29 (latest) — superseding the pointer above.** OWNER CORRECTION relayed by `fkit-lead`
  (⛔ not producer precedent), verbatim:
  > *"Regarding this: there was a typo, what I meant to say is that we should guarantee saves to LOGGED IN
  > users, and if there are cases when NOT LOGGED IN users can lose their data, it's acceptable"*
  So the guarantee is for **logged-in** players, and this task is **no longer what a guest guarantee
  rests on** — the pointer above is superseded. It is still worth doing: today logged-in players'
  progress is **also** device-only, so a reset hits them too until `0345` ships, and the cause may be a
  code bug `0345` would not fix. Status and priority unchanged.
