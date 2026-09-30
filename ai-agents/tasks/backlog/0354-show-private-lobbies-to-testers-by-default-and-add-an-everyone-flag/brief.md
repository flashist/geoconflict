# Show private lobbies to testers by default, and add an "everyone" remote flag that is empty by default

## ID
0354

> ℹ️ **ID allocation, checked 2026-09-30 before filing.** Highest ID on disk across `backlog/`, `done/` and
> `cancelled/` was `0353` (folder names and `## ID` fields agree). `0354`: no task folder; the only textual
> hit under `ai-agents/` is inside a commit hash in `0201`'s worklog (not an ID); zero hits under `.claude/`.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

📌 **Why `fkit-coder` and not `fkit-architect`.** The "who is a tester" question already has a shipped answer
in code — `0302`'s tester marker (see *Context*). Reusing it is a small client change, not a design problem.
The coder may consult `fkit-architect` if the plan proposes a **different** tester mechanism (for example a
server-side list), because that one would touch the server or profile backend.

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given
live in the `fkit lead` session and relayed by `fkit-lead`** (driving `/fkit-sprint-ship-loop`, at the close of
`0335`). ⛔ Not producer precedent. The owner's words, verbatim:

> *"I suggest enabling it for testers only by default, but to add a feature flag that can enable it for
> everyone else. The feature flag will be empty by default (I will only set it in Yandex.Games Console when
> the feature is ready to be shipped to all users)."*

**Placement:** no sprint was named, so this is on the Backlog board.

### How the private-lobby row is shown today (read 2026-09-30, working tree)

- `PrivateLobbyAccess.start()` (`src/client/PrivateLobbyAccess.ts`) shows the row only when **both** the
  Yandex remote flag `private_lobbies` = `enabled` (`FlashistFacade.isPrivateLobbiesEnabled()`) **and** the
  citizenship surfaces are on (`isCitizenshipSurfacesEnabled()` — the local `CITIZENSHIP_CARD_ENABLED` flag
  plus the `citizenship_ui` remote flag). Either off, or a degraded boot with no flags, means hidden.
- **The code has no notion of "tester" in that check.** "Testers only" today exists only in how the owner
  configures `private_lobbies` in the Yandex console.
- **But a tester marker already exists (`0302`).** When the browser's `localStorage` key `geoconflict_tester`
  equals `"1"`, `readTesterClientFeatures()` sends the client feature `tester=1` with `getFlags()`
  (`FlashistFacade.ts`, `flashistConstants.testerMarker`). `0302`'s plan told the owner to set
  `private_lobbies` to default `disabled` with a console condition `tester=1 → enabled`. The marker is set by
  hand in DevTools; it is **not a secret** and carries no id or personal data (`0302` plan).
- `checkExperimentFlag()` returns `true` for every flag in the dev build (`GAME_ENV === "dev"`), so the row
  always shows locally.
- **The switch only hides the row. It secures nothing.** Create is locked in the UI for non-citizens, and the
  **server refuses to start a private match whose creator is not a citizen**, switch on or off (`0302`). That
  guarantee must stay exactly as it is.

### What the owner is asking for, in plain terms

1. **Testers see the row by default** — decided in code, with no console setup needed.
2. **A new remote flag turns it on for everyone.** It is empty (unset) by default. The owner sets it in the
   Yandex Games console only when the feature is ready for all players.
3. Everything else — citizen-only Create, free Join, the server's citizen check — stays as it is.

### ⚠️ Must be done before the everyone-flag is set (not before this task ships)

[`0335`](../../done/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md)'s
[findings](../../../knowledge-base/reports/2026-09-30-0335-lobby-close-leftovers-findings.md) judged its cases
"rare, testers only today". Two of them must be revisited before private lobbies open to everyone:

- **Case 1** — a close within a split second of joining leaves the player joined with the window closed. Now
  part of [`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md) (owner ruling 2026-09-30).
- **Case 3** — a host who closes before the lobby is created leaves an empty private lobby on the server for
  3 hours. Accepted as known, "revisit before private lobbies open to all players" (owner ruling 2026-09-30,
  recorded in `0335`'s brief). No task exists for it yet.

⚠️ **UNCONFIRMED:** those likelihoods assume `private_lobbies` is on for testers only in the console today.
**The owner has not confirmed the current console state.** Check it as part of step 1.

## What to build

1. **Confirm the current console state** of `private_lobbies` (the owner does this — it needs console access)
   and record it in the worklog. It decides what "no change for testers" means on the day this ships.
2. **Plan, and put the open questions below to the owner before building.**
3. **Tester default.** The row's visibility rule becomes: citizenship surfaces on **and** (the player is a
   tester **or** the everyone-flag is on). "Is a tester" reuses `0302`'s marker unless the owner rules
   otherwise (question 1).
4. **The everyone-flag.** A new remote flag constant beside the existing ones in `flashistConstants.experiments`,
   read through `checkExperimentFlag()` like the others. Absent, empty, or any value but the enabled value
   means **not for everyone**. Name and value are the plan's to propose (for example `private_lobbies_all` /
   `enabled`); the owner confirms, because the owner types it into the console.
5. **The old `private_lobbies` flag** — do what question 2 rules. Do not leave two flags that mean overlapping
   things without saying which one wins.
6. **Keep the server's guarantees untouched.** No server change is expected. If the plan finds one is needed,
   stop and say why.
7. **Owner run-sheet in the worklog:** the exact console steps for the day the everyone-flag is set, and the
   kill switch (clear the flag). Include the pre-flip checklist from *Context*.

## Verification steps

1. **Unit tests for the visibility rule** (the `PrivateLobbyAccess` tests, extended), each case asserting shown
   or hidden:
   - tester marker set, everyone-flag unset → **shown**;
   - no marker, everyone-flag unset / empty / some other value → **hidden**;
   - no marker, everyone-flag = enabled value → **shown**;
   - citizenship surfaces off → **hidden** in every combination above;
   - flags unavailable (degraded boot, `getFlags` failed) → hidden for non-testers; the tester result is
     whatever question 3 rules, and a test pins it.
2. **Create stays locked for non-citizens** and Join stays free when the row is shown — existing tests still pass.
3. **The server's citizen-only start check is unchanged** — its existing test still passes; `git diff` shows no
   `src/server/` change (or the plan explained one).
4. **On the dev box or production after deploy (owner):** with the everyone-flag unset, a browser with the
   tester marker sees the row and one without it does not. Per the build-vs-verify rule, if this needs a
   deploy, close the build task and file the live check as its own verify task.
5. `npm test`, `npm run lint`, `npx tsc --noEmit` green.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing (but **setting the everyone-flag** is gated on revisiting `0335` cases 1 and 3 — see *Context*)
- **Related:** `0302` (the row, the citizen lock, the tester marker, the server check), `0335` (the four
  leftovers, report linked above), `0228` (case 1), `0327` (the close routes).
- **Why one brief.** The rule change and the new flag are one visibility rule in one file; neither ships
  usefully alone (the flag without the tester default changes nothing the owner asked for, and vice versa).
- **Open questions for the owner — the coder puts these in the plan; do not decide them:**
  1. **Who counts as a tester?** Recommended: reuse `0302`'s `localStorage` marker (already shipped, no
     server work; not secret — anyone who reads the code can set it, which is acceptable because the server
     still enforces citizenship). Alternative: a list of Yandex player ids checked by the server or profile
     backend — stronger, but new server work and a list to maintain.
  2. **What happens to the old `private_lobbies` flag?** Options: stop reading it (testers no longer need the
     console; it becomes dead config the owner can delete), or keep it as a kill switch that hides the row
     even from testers. Keeping it means the owner's console setting must stay `enabled` for testers.
  3. **Degraded boot (Yandex flags failed to load):** should testers still see the row? The marker is local,
     so they could — today everyone, testers included, sees nothing in that case.
  4. **Flag name and enabled value** for the everyone-flag.
- ⚠️ Line references are the 2026-09-30 working tree; find code by name.
