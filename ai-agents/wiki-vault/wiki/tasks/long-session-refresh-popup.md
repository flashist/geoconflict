# "Please Refresh the Game" Popup After 23 Hours — Start Screen Only (task 0404)

**Source**: `ai-agents/tasks/done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md` (supporting: the same folder's `worklog.md` and `review.md`; the Sprint 7 board row for the close record)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 53 (append rank, not a merit rank — flagged; moved in from Sprint 8 rank 14 on 2026-10-07) / task `0404`

> 🆕 **2026-10-08 sync — DEPLOYED, NOT YET VERIFIED.** The code (`077c9e3`) is in game **`0.0.157`**, deployed
> 2026-10-08 (container started 06:56:17Z) — checked: `git tag --contains 077c9e3` lists `0.0.157`; `0396`'s worklog names
> `0404` in the image ([[tasks/authenticated-profile-read-live]]). Its verify-live task `0406` is still open. The
> *"NOT DEPLOYED"* note below was true when written.
>
> ✅ Done (agent-closed — not owner-verified), closed **2026-10-07** by a spawned `fkit-producer`, routed by
> `fkit-lead` driving `/fkit-sprint-ship-loop`. ⚠️ **The brief carries no close note** — the close record (verify
> results, browser check, review) is on the Sprint 7 board row and in the worklog; parts of it are marked there as
> *"relayed by `fkit-lead`; not in the worklog"*.
>
> 🚨 **NOT DEPLOYED.** Client-only; ships in the game image in a weekend slot, in any order relative to `0332`.
> Verify-live task: `0406` ([[decisions/sprint-8]], rank 16).
>
> 🔧 **"Not committed" on the board is stale against the repo:** the code is in commit `077c9e3` ("Sprint push",
> 2026-10-07), in **no release tag** — committed, not deployed. Sources not changed.

## Goal

Filed from `0332`'s review finding R2 ([[tasks/join-token-identity-vouch]]): a game tab left open more than 24 h
still sends its expired login pass at join, so that player reads as unverified for the whole match. The owner tied it to
an idea of his own, verbatim: *"we need to show a popup that forces player to restart the game/refresh the page after
certain time of playing (right now it's about 24h) … The popup shouldn't break active matches, probably should be shown
only on the main screen."* Two benefits: a fresh login pass, and fresh game code.

**Owner rulings (2026-10-07, live `AskUserQuestion`, verbatim):**
1. Time limit — *"23 hours (Recommended)"* (an hour before the pass expires).
2. Force or ask — *"Force refresh (Recommended)"* — no close button.
3. Who sees it — *"Everyone (Recommended)"* — guests too.
4. Wording (plan gate) — *"Use as drafted (Recommended)"*. EN: *"Time to refresh"* / *"The game has been open for a
   long time. Please refresh the page so everything keeps working properly. Your progress is saved."* (keys
   `long_session_refresh_modal.*`, EN + RU).
5. Plan-gate Q2, free text — *"#1, and also add any other analytic metrics that can be useful here."* → the
   after-refresh boot marker plus four extra events.
6. Placement — typed by the owner: *"Move the refresh popup task to the Sprint 7"* (it was first filed on Sprint 8).

## Key Changes

- **Clock + decision**: new `src/client/LongSessionRefresh.ts` — `LONG_SESSION_REFRESH_AFTER_MS` = 23 h (wall clock
  since page load, reusing `PAGE_LOAD_TIMESTAMP` from `BuildVersionChecker.ts`), a pure `decideLongSessionRefresh`, and
  `startLongSessionRefreshChecker` (60 s timer + every return to a visible tab), started from `Main.ts`.
- **Gate**: only while `isOnStartScreen()`; otherwise waits for `whenOnStartScreen()`. Never in a lobby, a join being
  set up, or a match. Also deferred while a Yandex payment flow or the Yandex login dialog is open — new
  `src/client/PlatformDialogPresence.ts`, wrapped around `runCitizenshipPurchase` and the auth dialog.
- **The popup reuses `StaleBuildModal`** (`src/client/StaleBuildModal.ts`) with a second `reason` (`longSession`) — no
  close control, one REFRESH button. **One popup at a time:** if the stale-build popup is up, this one is not shown;
  if the stale popup appears while this one is up, the message switches to stale. The stale-build popup's mid-match
  behaviour (task `0113`, [[tasks/stale-build-detection]]) is **untouched**.
- **Reload drops the URL hash, keeps the query string** (`reloadWithoutHash`), so a leftover `#join=` cannot replay.
- **Review R1 fix**: the popup could open under a start-screen window and surface over a match → long-session-only
  z-index 10002 plus a join guard in `handleJoinLobby` while the forced popup is up.
- **Analytics** (all in [[systems/analytics]]): `Session:LongSessionRefresh:{Due, Shown, Refresh, Waited,
  DeferredByDialog, PreemptedByStaleBuild}`, and a new `AfterRefreshPopup` boot kind for the ten
  `Profile:Login:SignatureAge:*` buckets — it answers whether a refresh inside the same Yandex tab gets **new** signed
  data (verified) or the same old data (unverified).

## Outcome

- **Verify (per the board):** full `npm test` 4191 / 4191, first run after the last change (worklog); independent
  verify 4183 / 4183 + the new client suites 10 / 10 repeat runs (relayed, not in the worklog); lint and `tsc` clean.
- **Browser check** (owner ruling *"Agent checks now in Chrome (Recommended)"*): **all 7 checks PASS** in the owner's
  Chrome on `yandex-games_iframe.html`, local dev server, clock shifted in-page (relayed by `fkit-lead`; not in the
  worklog). ⚠️ The worklog's own build entry still says these checks were *"NOT RUN"* — they ran after it.
- ⚠️ **Not tested:** the Yandex payment / login deferral (real SDK only — unit tests only); a real tab-visibility
  change; the after-refresh marker on the next boot.
- **Review:** 2 rounds, reasoning-only second opinion both (normal, ADR-042); R1 (medium) and R2 (low — z-index scan
  test gap) ✅ fixed; ledger `closed-out`.
- 🚨 **Closes `0332`'s R2 at the build level only.** A refresh gives a non-expired token, but whether it is
  **verified** depends on Yandex's signed data, which keeps the same 24 h window for the whole visit
  ([[decisions/adr-121-login-signature-24h-window]]). Whether a refresh inside the same tab starts a new visit is
  **not known**. Do not claim R2 fixed for *verification* until `0406` reads the `AfterRefreshPopup` split.
- **Who actually hits it is narrow:** every match exit already reloads the page, so the clock restarts after nearly
  every match. The real audience is a tab left on the start screen (overnight, background) or a player who left a
  lobby by in-page Back. A player who plays match after match for 24 h never reaches it — that is ADR-121's ground.
- **Follow-up:** `0406` (verify live — read the long-session events and the after-refresh login split;
  [[decisions/sprint-8]] rank 16, append rank flagged).

## Related

- [[tasks/join-token-identity-vouch]] — task `0332`, whose review finding R2 this is the exit for
- [[decisions/adr-124-join-token]] — the join token whose `expired` reading this popup should reduce
- [[decisions/adr-121-login-signature-24h-window]] — the Yandex signed-data window that may still leave a refreshed player unverified
- [[tasks/stale-build-detection]] — tasks `0112`/`0113`: the stale-build popup this reuses; its mid-match rule unchanged
- [[tasks/stale-login-fix-decision]] — task `0373`: after-match reloads are the main source of stale signatures
- [[tasks/session-verified-status-line]] — task `0397`, a start-screen-only precedent
- [[systems/analytics]] — the six `Session:LongSessionRefresh:*` events and the `AfterRefreshPopup` boot kind
- [[decisions/sprint-7]] — the board row (rank 53)
- [[decisions/sprint-8]] — the original filing (rank 14, now `➡️ Moved`) and verify task `0406`
- [[tasks/authenticated-profile-read-live]] — task `0396` (closed 2026-10-08): its worklog records the game deploy that shipped this task
