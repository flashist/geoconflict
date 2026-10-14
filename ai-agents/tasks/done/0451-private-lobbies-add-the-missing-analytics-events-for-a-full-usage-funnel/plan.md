# Plan — 0451: analytics events for the private-lobby usage funnel

**Planning only.** No files written: no source, no plan.md, no status changes. EnterPlanMode is not available in this spawn, so the planning-only rule was kept by hand.

## Summary
- **13 new event names** under one new category, `PrivateLobby`. All are fixed strings in `flashistConstants.analyticEvents`.
- **No existing event changes meaning.** `Game:Mode:Multiplayer` still fires for private starts; the new private-start event fires right after it. One existing test (`MatchStartAnalytics.test.ts`, the Private case) must change from "2 calls" to "3 calls". Calls 1 and 2 stay exactly as they are.
- **Both "possibly" items are kept.** "Left before start" is 2 names; "private match ended" is 1 name. Reasons are given below.
- **No lobby code, link, game ID, client ID or name goes into any event.** Values are only an HTTP status number (Start failed) or a duration in seconds (match ended).
- **Nothing fires on a timer or per tick.** Each event is one per player action, and some are latched to once per window opening.
- **One full `npm test` at the end**, plus targeted runs while building, plus `npm run lint`.
- **Pre-existing issue found (not fixed here):** during the create request, the host window's copy button copies the code of an earlier opening (`lobbyId` is not cleared in `open()`). The plan only makes sure such a copy is **not** counted.

## Event list (final names, firing moments, reasons)

| # | Enum key | String | Fires exactly when | Does NOT fire |
|---|---|---|---|---|
| 1 | `PRIVATE_LOBBY_CREATED` | `PrivateLobby:Created` | `HostLobbyModal.open()`: the create request answered OK **and** the same window is still open (the existing `generation === openGeneration` branch, right where `hasJoinedLobby = true` and `join-lobby` is sent) | Window closed or reopened before the answer; create failed |
| 2 | `PRIVATE_LOBBY_CREATE_FAILED` | `PrivateLobby:CreateFailed` | The create request rejected (HTTP not OK, network error, or config-read error). Fires from the existing `joined.catch(...)` | On success. (Fires even if the window was already closed, because it measures a server/network failure.) |
| 3–4 | `PRIVATE_LOBBY_INVITE_COPIED_LINK` / `_CODE` | `PrivateLobby:InviteCopied:Link` / `:Code` | `copyToClipboard()`: `copyText` returned true, same opening, lobby exists (`hasJoinedLobby`). **At most once per window opening.** The first successful copy decides the bucket: `Link` if the copied text ≠ the bare code (a Yandex portal link with payload, or a standalone `#join=` link), otherwise `Code` | A copy that failed (0380's copy-failed state); 2nd and later copies in the same opening; a copy made before this opening's lobby exists; a copy that settles after the window closed |
| 5 | `PRIVATE_LOBBY_START_TAPPED` | `PrivateLobby:Start:Tapped` | `startGame()`, right after the existing `isStarting` guard lets the tap through, before the ad | A second tap while a start is in flight (the existing guard returns first); the button is disabled with fewer than 2 players |
| 6 | `PRIVATE_LOBBY_START_FAILED` | `PrivateLobby:Start:Failed` (value = HTTP status; **0** when a request threw) | Every path that today calls `showStartFailed()`: settings save not OK (its status), `start_game` not OK (its status, e.g. 403 `citizens_only` as in 0416), or a throw (0) | When the window closed or reopened during the attempt (those paths `return null` before `showStartFailed`, unchanged) |
| 7–8 | `PRIVATE_LOBBY_MATCH_STARTED_HOST` / `_GUEST` | `PrivateLobby:MatchStarted:Host` / `:Guest` | Inside `logMatchStartAnalytics`, right **after** `Game:Start` and `Game:Mode:Multiplayer`, only when `gameStartInfo.config.gameType === GameType.Private`. `Host` when this client's `clientID` is the one the host window created the lobby with; otherwise `Guest` | Reconnect, replay, a repeat `start` message (existing `shouldLogMatchStartAnalytics` gate); public and solo matches |
| 9 | `PRIVATE_LOBBY_MATCH_ENDED` | `PrivateLobby:MatchEnded` (value = match seconds, the same number `Match:Duration` gets) | Inside `logMatchEndAnalytics`, in the existing branch that fires `Match:Duration`, only when the logged start was private. That branch runs once per match (it clears the active start), so this is once too. Covers a finish (WinModal) and a leave (`Game:Abandon` path) | Public or solo matches; a reconnected or replayed match (no logged start, so no active start); a tab simply closed mid-match (same as `Game:End` today) |
| 10–11 | `PRIVATE_LOBBY_LEFT_HOST` / `_GUEST` | `PrivateLobby:Left:Host` / `:Guest` | The player closes the lobby window themselves (✕, click outside, Escape → `handleModalClose`) **while joined** (`wasJoined`). Host: `HostLobbyModal`; guest: `JoinPrivateLobbyModal` | Programmatic closes: a successful Start, the match-start close (`closePreStartModals` / `joinModal.close()` in onJoin), and the standalone hash reset. Also not before joined, and not on a tab close |
| 12–13 | `PRIVATE_LOBBY_JOINED_LINK` / `_CODE` | `PrivateLobby:Joined:Link` / `:Code` | `JoinPrivateLobbyModal.checkActiveLobby()`: the lobby exists, the window is still open, and this opening has not already joined. Fires as `join-lobby` is sent. `Link` = the window was opened with a code (`open(id)`: Yandex invite payload or standalone `#join=`); `Code` = the player pressed Join after typing or pasting | The host (the host window never goes through this modal); the archived-game/replay branch (`checkArchivedGame`); not found / version mismatch / error; a second overlapping lookup in the same opening (latched on `!this.hasJoined` before it is set); a reconnect or a refresh back into a lobby (that rejoins via the reconnect banner, not this modal); a Yandex invite seen again after a reload (`claimInviteCode` already suppresses it) |

**Funnel note for the doc:** Private tab (`UI:Tap:PrivateTab`) → Create (`PrivateLobby:Created`; attempts = `Created` + `CreateFailed`) → invite copied (`InviteCopied:*`) → friend joined (`Joined:*`) → host Start (`Start:Tapped`, minus `Start:Failed`) → private match started (`MatchStarted:Host` = number of private matches; `:Guest` = number of guest players) → match ended (`MatchEnded`). `Left:*` marks people who gave up in the lobby. Non-citizens drop at `LockedFeature:Tap:PrivateLobby`.

**Kept "possibly" items, with reasons:**
- `Left:{Host|Guest}` — kept. "Created minus started" lumps together start failures, tab closes and active give-ups. `Left` separates "closed the window while waiting" from the rest. Cost: 2 names, at most one per lobby.
- `MatchEnded` — kept. It is the funnel's last step, and today only `Match:WinCondition:*Private*` is private-specific, which not every match reaches. Hooked to the same once-per-match branch as `Match:Duration`, so it matches the population of `MatchStarted` (no reconnects).

**Considered and NOT added (reason):** "Start succeeded", because `MatchStarted:Host` marks it. A "Join window opened" event, because the stated funnel does not need it. Copy-failed and guest join-failed events: not needed for the funnel; offered as an open question below. Splitting `MatchEnded` into Finished/Left: `Game:Abandon` already exists, so the split isn't worth the extra name.

**`Game:Mode:Multiplayer`:** unchanged. No owner question is needed.

## Files and changes

1. **`src/client/flashist/FlashistFacade.ts`** — add the 13 keys to `analyticEvents`, each as a **full string** (no `FIRST_PART` + suffix), so grep and tests see every name. Short comment block in the house style (task 0451; when each fires).
2. **NEW `src/client/PrivateLobbyAnalytics.ts`** — a small module, pure apart from one remembered value (same pattern as `MatchStartAnalytics`):
   - `logPrivateLobbyCreated()`, `logPrivateLobbyCreateFailed()`
   - `logPrivateLobbyInviteCopied(kind: "Link" | "Code")`, `logPrivateLobbyJoined(via: "Link" | "Code")`, `logPrivateLobbyLeft(role: "Host" | "Guest")`
   - `logPrivateLobbyStartTapped()`, `logPrivateLobbyStartFailed(status: number)`
   - `rememberPrivateLobbyHostClientID(clientID)` / `privateLobbyRole(clientID): "Host" | "Guest"` (one last-created id, overwritten on each create; the page reloads after a match). Plus a `reset…ForTests()`.
   - Each typed bucket maps to an enum key through a fixed lookup, never string building, so no id can get into a string. Values are numbers only.
3. **`src/client/HostLobbyModal.ts`**
   - `open()` success branch: `rememberPrivateLobbyHostClientID(this.lobbyCreatorClientID)` + `logPrivateLobbyCreated()`.
   - `joined.catch(() => {})` becomes `.catch(() => logPrivateLobbyCreateFailed())`. The `.finally(endJoining)` stays.
   - New field `inviteCopyLogged = false`, reset in `open()` and `reset()`. In `copyToClipboard()`, keep the copied text in a local variable; after the success branch, if `hasJoinedLobby && !inviteCopyLogged`, log Link or Code and latch. The copy flow itself is unchanged: `copyText` stays the first call with nothing awaited before it (Yandex clipboard rule).
   - `startGame()`: `logPrivateLobbyStartTapped()` after the guard.
   - `showStartFailed()` becomes `showStartFailed(status: number)` and logs. 3 call sites pass `configResponse.status`, `0`, `response.status`.
   - `handleModalClose()`: when `wasJoined`, `logPrivateLobbyLeft("Host")` before the `leave-lobby` dispatch.
4. **`src/client/JoinPrivateLobbyModal.ts`**
   - `joinLobby(via)`: `open(id)` calls `joinLobby("Link")`; the template becomes `@click=${() => this.joinLobby("Code")}`.
   - Pass `via` to `checkActiveLobby(lobbyId, generation, via)`; in the `exists` branch, `const firstJoin = !this.hasJoined;` then the existing `hasJoined = true`, and `if (firstJoin) logPrivateLobbyJoined(via)`.
   - `handleModalClose()`: when `wasJoined`, `logPrivateLobbyLeft("Guest")`.
5. **`src/client/MatchStartAnalytics.ts`**
   - `logMatchStartAnalytics(gameStartInfo, state, clientID: string)` (new required 3rd parameter). After the two existing calls, if the game is Private: log `MatchStarted:` + `privateLobbyRole(clientID)` and set `activeMatchIsPrivate = true`; otherwise false.
   - `logMatchEndAnalytics`: in the duration branch, before `clearActiveMatchStartTime()`, if `activeMatchIsPrivate`, log `PRIVATE_LOBBY_MATCH_ENDED` with `durationSeconds`.
   - `clearActiveMatchStartTime()` also clears the flag.
6. **`src/client/ClientGameRunner.ts`** — pass `this.lobby.clientID` as the 3rd argument at its single call site (~line 822).
7. **`ai-agents/knowledge-base/analytics-event-reference.md`**
   - New `### Private Lobby Events` section: a table with enum key, string, when it fires, when it does not, and value; the funnel note above; gating (the Create/Join buttons live in the private row, shown only when citizenship surfaces AND (tester OR `private_lobbies_all`); Create needs a citizen except on a local dev build; **`Joined:Link` can come from players whose row is hidden**, because an invite always opens the Join window by owner ruling (a); the standalone `#join=` residual below).
   - A one-line pointer in the Game Events table next to `Game:Mode:Multiplayer`: "private starts also fire `PrivateLobby:MatchStarted:*`". That row's meaning is unchanged.
8. **No change** to `Main.ts`, `InvitePayload.ts`, either HTML template, `en.json`/`ru.json` (no visible text), or anything in `src/core/`.

## Tests
- **Update `tests/client/MatchStartAnalytics.test.ts`:** pass a `clientID` in the existing calls. The Private case expects 3 calls: calls 1 and 2 stay `Game:Start` (value = players) and `Game:Mode:Multiplayer` (verification 4), call 3 is `MatchStarted:Guest`. Extend its FlashistFacade mock with the new keys.
- **New cases in that file:** Host vs Guest role (via `rememberPrivateLobbyHostClientID`); public and solo starts fire no private event; reconnect, replay and repeated `start` fire none; `MatchEnded` fires once with the duration for a logged private start, never for public, never without a logged start (reconnect), and a second `logMatchEndAnalytics` call does not fire it again.
- **Mock-only edits** to `tests/client/HostLobbyOpen.test.ts`, `HostLobbyModalLeave.test.ts`, `HostLobbyPoll.test.ts`, `HostLobbyModalUrl.test.ts`: their FlashistFacade mocks lack `flashistConstants` and `flashist_logEventAnalytics`, and the new calls would throw. Add `flashistConstants: { analyticEvents: {} }` and `flashist_logEventAnalytics: jest.fn()`, as `JoinPrivateLobbyModalPaste.test.ts` already has. No assertions change.
- **NEW `tests/client/HostLobbyAnalytics.test.ts`** (real `o-modal` + real `HostLobbyModal`, harness copied from `HostLobbyModalLeave`/`HostLobbyModalUrl`):
  - `Created` fires once on create OK.
  - `CreateFailed` fires on HTTP 500 or throw.
  - No `Created` when closed before the answer.
  - Copy: one `InviteCopied:Code` (bare code) or `:Link` (portal URL known, or standalone) on a double copy; none when `copyText` resolves false; none before the lobby exists; latch resets on reopen.
  - `Start:Tapped` once on a double tap.
  - `Start:Failed` with 403, settings 400, and a throw → 0.
  - No `Failed` when closed during the ad.
  - `Left:Host` on a user close while joined; none on a programmatic close after a successful Start; none before joined.
  - **Privacy:** across all calls, no event string or value contains the lobby code or the creator clientID.
- **NEW `tests/client/JoinPrivateLobbyAnalytics.test.ts`** (real modal, harness from `JoinPrivateLobbyModalLeave`):
  - `Joined:Code` from the button; `Joined:Link` from `open(code)`.
  - Once on two overlapping lookups.
  - None on not-found, version mismatch, error, or the archived/replay branch.
  - None when closed mid-lookup.
  - `Left:Guest` on a user close after joining; none on programmatic `close()`.
  - Privacy check as above.
- **NEW `tests/client/PrivateLobbyAnalyticsNames.test.ts`:** imports the **real** `flashistConstants` (as `FlashistFacade.test.ts` does). Every `PRIVATE_LOBBY_*` value matches `^[A-Z][A-Za-z0-9]*(:[A-Z][A-Za-z0-9]*){1,4}$` (PascalCase, ≤5 parts, no underscores), each part ≤64 characters, the set has exactly 13 unique strings, and none equals an existing event string.

## Sequence
1. Enum keys → 2. `PrivateLobbyAnalytics.ts` → 3. `MatchStartAnalytics` + `ClientGameRunner` + their test → 4. `HostLobbyModal` + mock edits + new host test → 5. `JoinPrivateLobbyModal` + new join test → 6. names test → 7. reference doc → 8. checks.

## Verification
- **Targeted runs while building** (no lock): `npm test -- tests/client/MatchStartAnalytics.test.ts tests/client/HostLobby tests/client/JoinPrivateLobby tests/client/PrivateLobbyAnalyticsNames.test.ts tests/client/ClientGameRunnerTeardown.test.ts tests/client/JoinLobbyReconnectSession.test.ts`.
- **Exactly ONE full `npm test`** at the end, through the npm script (project lock; about 5 minutes at 1 worker), plus `npm run lint`. A lone `Exceeded timeout of 5000 ms` in a supertest suite is judged by the known-flake rule (re-run, and say so).
- **Worklog checks:**
  - (a) The 13 names and their count.
  - (b) Grep proving no inline event literal in `src/` outside `FlashistFacade.ts`: `git diff -- src ':!src/client/flashist/FlashistFacade.ts' | grep -E '^\+.*"PrivateLobby:'` gives an empty result. Tests do contain literal strings in mocks and assertions; I read the brief's verification 2 as covering game code only.
  - (c) The enum keys vs doc rows, diffed.
  - (d) The privacy result.
- **Local walk-through** (`npm run dev`; Create is unlocked on the dev build; first check that nothing is using port 3001): two browser windows. Host: Private tab → Create → copy → guest joins by code, and by a standalone `#join=` link (the Yandex payload link cannot be reached locally) → host Start → match starts → finish or leave. Log each `flashist_logEventAnalytics |` console line in order and confirm no duplicates and no host-as-guest event. I can drive both windows with Playwright myself.

## Edge cases and accepted residuals (go in the doc)
- **Standalone only:** the `#join=` branch in `handleHash` never strips the hash, so refreshing a standalone page still showing `#join=CODE` reopens and rejoins (new clientID), giving a second `Joined:Link`. It is a real rejoin. The Yandex build ignores `#join=`, so production is unaffected. Not fixed here.
- **`Joined:*` = join sent, not confirmed connected.** There is no client-side "lobby joined" confirmation before the match starts.
- **Hash-change leave, kick, and tab close** send no `Left`.
- **`InviteCopied` is "the host copied at least once"**, not the number of copies. If the host copies the code first and the link later, it counts as Code.
- **Host role** comes from a module-level remembered clientID. Join clientIDs are fresh per join, so the comparison is exact. A host reconnect is skipped by the existing reconnect gate.

## Event budget
- **13 new distinct design-event names** against a cardinality of ~103–118 (wiki `systems/analytics`), about +11 %. That cardinality metric is watched and its limit status is unknown; flagged, not resolved.
- **Per user per day:** about ≤6 events per host lobby cycle (Created, Copied, Start:Tapped, maybe Start:Failed, MatchStarted, MatchEnded, or Left) and about ≤3 per guest. Nothing fires on a timer or per tick; `pollPlayers` (1 s) sends no event.

## Already settled, not re-asked
- **`0426` keeps waiting for `0451`** (owner ruling 2026-10-13). The brief's open question on exempting it is closed.
- **The GameAnalytics funnel build and verify step** is a separate follow-up task, filed at close (build/verify split rule).

## Owner decisions (2026-10-13, live `AskUserQuestion`, `fkit-sprint-ship-loop` driver session, relayed by fkit-lead)

These answer the plan's open question and **override any conflicting text above**.

- **Failure events — verbatim selection: "Add both failure events".** Option text: "3 more names (InviteCopyFailed, JoinFailed:NotFound, JoinFailed:Error), so a weak join step can be diagnosed right away." ⇒ The set is **16 new event names, not 13**. Add:
  - `PRIVATE_LOBBY_INVITE_COPY_FAILED` → `PrivateLobby:InviteCopyFailed` — the host's invite copy failed (`copyText` resolved false, 0380's copy-failed state), same opening, lobby exists; same once-per-opening latch idea as `InviteCopied` (the coder decides whether it shares the latch or has its own, and records why).
  - `PRIVATE_LOBBY_JOIN_FAILED_NOT_FOUND` → `PrivateLobby:JoinFailed:NotFound` — `JoinPrivateLobbyModal`'s lookup says the lobby does not exist, window still open.
  - `PRIVATE_LOBBY_JOIN_FAILED_ERROR` → `PrivateLobby:JoinFailed:Error` — the lookup errored (network/HTTP error), window still open. The coder decides and records where "version mismatch" belongs (Error, or not counted).
  - Both join-failure events: no lobby code, id or link in the string or value; not fired on the archived/replay branch; not fired when the window closed mid-lookup.
  - Everything the plan says about "13" (summary, `FlashistFacade.ts` keys, the names test's "exactly 13 unique strings", worklog check (a), the event budget ≈ +11 %) reads as **16** (budget ≈ +14 %). Tests gain cases for the three new events (fires / does not fire / privacy). The reference doc and funnel note include them, and the "Considered and NOT added" line about copy-failed and join-failed no longer applies.
