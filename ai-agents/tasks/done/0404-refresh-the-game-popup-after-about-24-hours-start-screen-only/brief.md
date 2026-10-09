# "Please refresh the game" popup after about 24 hours — on the start screen only, never in a match

## ID
0404

## Sprint
Sprint 7

*(Earlier value, kept as history — true on 2026-10-07 until the move:)* ~~Sprint 8~~ — moved by OWNER RULING, 2026-10-07,
typed directly by the owner in the `fkit lead` session (the owner's own message, not an `AskUserQuestion` answer), relayed
verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
Verbatim: *"Move the refresh popup task to the Sprint 7"*. It supersedes the placement in the owner's earlier answer
(*"brief it to the next sprint"*, quoted under *Context*).

## Priority
53

> 📌 **2026-10-07 — 53 is ADR-035 append rank on [Sprint 7](../../../sprints/done/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (52, `0402`); the owner named no placement. ⚠️ Flagged for owner confirmation: on
> merit its rank barely matters — it blocks nothing and depends on nothing; it is the exit for `0332` (Sprint 7 rank 9)
> review finding R2. The notes about rank 14 below (under *Owner rulings* and *Notes*) describe the Sprint 8 board and are
> history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~14~~

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-10-07 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live via `AskUserQuestion` in the `fkit lead` session on 2026-10-07 and relayed verbatim by `fkit-lead`.** ⛔ Not
producer precedent.

The question put to the owner (task `0332` review finding R2): *"If a game tab stays open more than 24 hours after
login, the login pass has expired, so that player counts as 'unconfirmed' until they reopen the game. Today nobody
loses anything from that, because every perk stays open. Only the counters would show it. Fix it, or accept it as a
known risk?"* The owner's free-text answer, verbatim:

> "I think this task is related to my idea, that we need to show a popup that forces player to restart the
> game/refresh the page after certain time of playing (right now it's about 24h). I think we need this task, brief it
> to the next sprint. The popup shouldn't break active matches, probably should be shown only on the main screen."

**The owner's words above govern this brief.** Where the brief adds detail below, it is the producer's reading and
is listed under *Open questions* when it is really the owner's call.

### Owner rulings — 2026-10-07 (three of the four open questions answered)

**AUTHORITY.** **OWNER RULINGS given live 2026-10-07 via `AskUserQuestion`** in the `fkit lead` session, relayed
verbatim (chosen label + option text) by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
(ADR-021/037). ⛔ **Not producer precedent.** Recorded verbatim:

1. **Time limit** — chosen: **"23 hours (Recommended)"** — *"An hour before the pass expires, so a player who
   refreshes never joins a match with a dead pass."*
2. **Force or ask** — chosen: **"Force refresh (Recommended)"** — *"No close button. It matches your word 'forces',
   and it fully fixes the expired-pass problem. It only ever shows on the main screen, never during a match."*
3. **Who sees it** — chosen: **"Everyone (Recommended)"** — *"Simpler. Everyone gets fresh game code after about a
   day."*

**Still open:** the popup wording (RU/EN) — the coder drafts it at plan time, the owner approves it. **This does not
block starting the plan.** Not ruled: the priority-14 append-rank flag (see *Notes*) — unchanged.

### Why — two benefits, one of them only partly proven

1. **A fresh login pass (the R2 fix).** The profile server's login pass (session token) lives 24 hours —
   `SESSION_TTL_SECONDS = 86_400` (`src/profile-server/SessionToken.ts:36`). The client never expires it itself; it
   relies on the server's 401 (`src/client/ProfileSession.ts:24-26`). But the join path (`0332`) sends whatever token
   it holds (`src/client/Transport.ts:406-408`, via `heldSessionTokenFor`, `src/client/ProfileSession.ts:398`), so a
   token past 24 h makes the game server read the player as unverified for the whole match. That is R2 in
   [`0332`'s review ledger](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/review.md)
   (row R2). The client logs in once per page load (`src/client/ProfileSession.ts:2`), so a page refresh = a new token.
2. **Fresh game code.** A refreshed page runs the current build.

⚠️ **Benefit 1 is only partly proven — read before promising it.** A refresh gives a *non-expired* token. Whether
that token is *verified* (`vfy:true`) depends on the age of Yandex's signed player data, which has its own 24-hour
window ([ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)).
ADR-121 records that Yandex returns **the same signed data for the whole visit** (`:34-36`), and that asking again
returns the same data ~99% of the time. Whether a page refresh inside the same Yandex tab starts a new "visit" is
**not known** — `0373`'s data showed after-match reloads are the main source of *stale* signatures, which suggests it
often does **not**. So after a refresh at ~24 h the player may get a fresh but **unverified** token. The popup still
removes the `expired` reading; it may or may not remove the `unverified` one. Verification step 7 measures this. It
does not block the build — the code-freshness benefit stands on its own, and the owner asked for the popup.

### Who actually hits this — narrower than "anyone who plays 24 h"

Every match exit already **reloads the page**: `WinModal`, `GameRightSidebar`, `SettingsModal` and `TutorialLayer`
all call `FlashistFacade.changeHref(rootPathname)` (`src/client/graphics/layers/WinModal.ts:346`,
`GameRightSidebar.ts:136`, `SettingsModal.ts:160`, `TutorialLayer.ts:318`), which is a full page load
(`src/client/flashist/FlashistFacade.ts:1137-1153`). So the page-age clock restarts after nearly every match. The
popup's real audience is a tab **left open on the start screen** (overnight, a background tab), or a player who left
a lobby by an in-page Back, which does not reload (`src/client/StartScreenPresence.ts:64-68`).

⚠️ **Out of scope, stated so nobody assumes it is covered:** a player who plays match after match for 24 hours never
reaches the threshold (each match exit resets the clock), but their *Yandex signed data* can still pass ADR-121's
24-hour window. That is ADR-121's territory, not this task's.

### What already exists — reuse it

- **`StaleBuildModal`** (`src/client/StaleBuildModal.ts`) — a blocking "your game is outdated, please refresh" popup.
  No close button; one REFRESH button (`window.location.reload()`, `:85-92`) and a "Contact support" link
  (`:94-100`). Registered in **both** HTML templates (`src/client/index.html:313`,
  `src/client/yandex-games_iframe.html:443`), imported in `src/client/Main.ts:34`. Texts under `stale_build_modal`
  in `resources/lang/en.json:446` and `ru.json:450`.
  - Shown by `BuildVersionChecker.ts` (`:27-44`): polls `/api/version` every 5 min and on tab-visible, and shows
    the popup **at once, even mid-match** — a deliberate, locked choice from task `0113` (wiki
    `tasks/stale-build-detection.md`: *"mid-match players on stale builds are already on a broken build"*). **This
    task must not change that.** The new popup differs on exactly this point: start screen only.
  - `BuildVersionChecker.ts:8` already records `PAGE_LOAD_TIMESTAMP` — a ready page-age clock.
- **Start-screen detection** — `src/client/StartScreenPresence.ts`: `isOnStartScreen()` (`:31-33`, false in a lobby,
  a match, or while a join is being set up — task `0336`) and `whenOnStartScreen()` (`:70-76`, waits for the next
  return). Main.ts wires it at `src/client/Main.ts:330` and reports returns at `:1026`. `CitizenshipCard` and
  `ProfileReadRestart.ts` already use it to never interrupt a lobby or match — follow that precedent.
- **Reload primitive** — `FlashistFacade.reloadApp()` (`src/client/flashist/FlashistFacade.ts:1161-1163`), the same
  `window.location.reload()` that StaleBuildModal, Bootstrap's recovery reload (`src/client/Bootstrap.ts:83-86`) and
  the login restart (`src/client/GameRestart.ts`) use. A reload inside the Yandex Games iframe is therefore already
  done in production (StaleBuildModal since Sprint 3). ⚠️ It keeps the **hash** too; `changeHref(rootPathname)`
  drops the hash but keeps the query string Yandex needs (`:1140-1150`, task `0331`). The plan must pick one and make
  sure a leftover `#join=` / `#token-login` cannot be replayed (Main.ts strips handled hashes at `:665`, `:698`,
  `:722` — confirm the hash is empty by the time this popup can appear).

## What to build

One popup, shown once the page has been open for the threshold time (**23 hours — owner ruling 1, 2026-10-07**;
~~≈24 h — exact figure is an open owner question; producer recommends 23 h~~), **only while the player is on the
start screen**.

1. **Clock.** Measure time since this page load (wall clock, so time asleep counts — the token's 24 h is wall-clock
   on the server). Check on a timer **and** when the tab becomes visible again, like `BuildVersionChecker.ts:46-56`
   does — timers do not fire while a laptop sleeps.
2. **Gate.** When the threshold has passed: if `isOnStartScreen()` is true, show the popup; otherwise wait with
   `whenOnStartScreen()` and show it on return. **Never during a lobby, a join being set up, or a match.**
   Also defer it while a purchase / Yandex payment dialog or the Yandex login dialog is in progress on the start
   screen — interrupting a payment is worse than a late popup. (List the in-flight dialogs the plan finds.)
3. **The popup.** Reuse or extend `StaleBuildModal` rather than building a parallel one — same look, same refresh
   button, a different message. Whether that is a second message variant of the same element or a sibling element
   sharing its styles is the coder's call in the plan. If it becomes a new element, it follows the modal pattern
   (`GameStartingModal.ts`) and is added to **both** `src/client/index.html` and `src/client/yandex-games_iframe.html`.
4. **Never two refresh popups at once.** If the stale-build popup is already showing, do not show this one; if the
   stale-build popup appears while this one is up, one popup must remain, not two stacked. (The stale-build reason
   wins — it is the stronger one and is allowed mid-match.)
5. **Forced — no close button** (**owner ruling 2, 2026-10-07: "Force refresh"**). Non-dismissable, like
   `StaleBuildModal`: the only way on is the refresh button. No dismiss path, no "remind me later", no reappear
   logic. ~~Dismissable or not — open owner question; until answered build non-dismissable and keep the dismiss path
   a one-line change.~~ (The "support" link `StaleBuildModal` carries may stay if the popup reuses it — the coder's
   call; it must not close the popup.)
6. **Text.** All player text via `translateText`, keys added to **both** `resources/lang/en.json` and `ru.json`.
   Wording is **still an open owner question** — the coder drafts RU + EN in the plan, the owner approves it before
   the build ships. **It does not block starting the plan.** Should say why (the game has been open a long time;
   refreshing keeps progress/login working) and must not alarm.
7. **Who sees it — everyone** (**owner ruling 3, 2026-10-07: "Everyone"**): every player, guest or logged in. No
   login-state check in the gate. ~~Producer's reading — flag in the plan if the owner wants logged-in only.~~
8. **Analytics.** At least: popup shown (value = minutes since page load, like `Build:StaleDetected`), refresh
   pressed. Add to `flashistConstants.analyticEvents` (`src/client/flashist/FlashistFacade.ts`), `Category:Action`
   PascalCase naming, and document every event in `ai-agents/knowledge-base/analytics-event-reference.md`. Never
   inline strings.
9. **Tests.** Unit-test the decision (threshold reached? on start screen? stale popup already up? payment in
   flight?) outside the component, like `GameRestart.ts` / `ProfileReadRestart.ts` do — with a fake clock, no
   24-hour waits.

### Threshold — 23 hours (owner ruling 1, 2026-10-07)

**23 hours** — ~~the producer's recommendation (owner to confirm)~~ ruled by the owner on 2026-10-07 (*"23 hours
(Recommended)"*). The reasoning it was put to the owner with: the token dies at 24 h. Showing the popup a little before that means a player who obeys it never
joins a match with a dead token — the join happens from the start screen, which is where the popup sits. The page
loads before the login, so page age ≥ token age: measuring from page load is on the safe side. One hour of margin
covers a lobby wait (a public lobby waits a minute or two — `0367` shortened it) and clock drift. Put the threshold in one named
constant, near or tied to `SESSION_TTL_SECONDS`'s meaning (the client cannot import profile-server code — a
comment linking the two is fine).

## Verification steps

1. **Unit tests** pass for the decision logic: below threshold → no popup; at/after threshold on the start screen →
   popup; at/after threshold in a lobby, during a join, or in a match → no popup until `whenOnStartScreen()` fires,
   then popup; stale-build popup showing → no second popup; payment/login dialog in flight → deferred.
2. **`npm test`** green (judge a lone `Exceeded timeout of 5000 ms` by the CLAUDE.md supertest-flake rule and say so
   if you re-ran); `npm run lint` clean.
3. **Local, with the threshold temporarily set to ~1 minute** (a dev-only override, not shipped): wait on the start
   screen → popup appears; press refresh → page reloads, the game boots normally inside
   `yandex-games_iframe.html`, the URL query string is intact, no `#join=` or other hash is replayed.
4. **Local, mid-match:** start a match before the short threshold passes, let it pass during the match → **no popup
   during the match**; exit the match → (page reloads on match exit, so the clock restarts — confirm no popup, which
   is correct). Then repeat via a lobby left with in-page Back → popup appears on return to the start screen.
5. **Local, both popups:** force the stale-build popup (point `/api/version` at a different build) while the short
   threshold has passed → exactly one popup on screen.
6. **Texts:** both `en.json` and `ru.json` carry the new keys; the popup reads correctly in RU and EN.
7. **Production, after deploy (a separate verify task, per the owner's build/verify-split rule — filed at this
   task's close, not now):** the "shown" and "refresh pressed" events arrive; and, once `0332` is live, the
   `expired` join-vouch counter drops. ⚠️ Also read whether players who refreshed from this popup come back
   `vfy:true` or `vfy:false` — that answers the open "same Yandex visit" question in *Context*. Do not claim R2 is
   fixed for *verification* until that number is read.

## Notes

- **Depends on:** nothing.
- Shipping does not need `0332`'s code; only *measuring* benefit 1 needs `0332` live.
- **Blocks:** nothing.
- **Related:** [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)
  — review finding R2 (an expired token at join reads as unverified) is being dispositioned as an accepted residual
  whose exit is this task. Not edited here.
- **Related:** `0113` / `0112` (stale-build popup and checker, done) ·
  [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
  (Yandex signed-data 24 h window) · `0373` (stale-login data — after-match reloads are the main stale source) ·
  `0336` / `0397` (start-screen-only precedents).
- **Locked decision not to disturb:** the stale-build popup still shows mid-match (task `0113`).
- One brief, not split: the timer, the gate, the popup, its texts and its events only make sense together and are
  verified together; a reused-modal refactor alone ships nothing a player sees. The production check is split off
  at close per the owner's standing build/verify rule (2026-09-29).
- ⚠️ Priority 14 is append rank, NOT a merit ranking — flagged for owner confirmation.
  **On merit this belongs directly below `0390`**, because the open rows above it are verify tasks and a discussion
  (the owner's standing rule puts verify tasks on top of a sprint), and this is a small build task whose main payoff
  is measurement-gated. Rows 8–13 between them are all `➡️ Moved`, so append and merit land in the same place.

## Open questions for the owner (1, 2 and 4 answered 2026-10-07 — see *Owner rulings*; 3 still open)

1. ~~**Exact threshold.** Producer recommends **23 hours** — an hour under the login pass's 24 h, so a player who
   obeys the popup never joins with an expired pass. Alternatives: exactly 24 h (simpler to explain, but the pass may
   already be dead when the popup appears), or longer (fewer popups, R2 stays open longer).~~
   ✅ **Answered 2026-10-07 (owner ruling 1): "23 hours (Recommended)".**
2. ~~**Force or ask?** *Force* = no close button; the player must refresh to keep playing (like today's outdated-build
   popup). *Ask* = a close button; the player can carry on, and may then join with an expired pass, so R2 is only
   reduced. Producer recommends **force** — it matches the owner's word *"forces"* and actually closes R2. If "ask",
   should it reappear (e.g. next return to the start screen)?~~
   ✅ **Answered 2026-10-07 (owner ruling 2): "Force refresh (Recommended)".** The reappear sub-question is moot.
3. **Wording (RU/EN).** — **STILL OPEN.** The coder drafts one in the plan; the owner approves it. Should it mention
   the reason ("the game has been open a long time") and that nothing is lost? **Does not block starting the plan.**
4. ~~**Everyone, or logged-in players only?** Brief assumes everyone (fresh code helps guests too).~~
   ✅ **Answered 2026-10-07 (owner ruling 3): "Everyone (Recommended)".**
