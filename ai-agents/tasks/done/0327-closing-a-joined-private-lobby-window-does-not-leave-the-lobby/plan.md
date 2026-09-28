# 0327 — Closing a joined private lobby window does not leave the lobby: plan

**Summary**
- **Step 1 confirmed by reading the code. Not yet reproduced live.** None of the join window's close routes sends `leave-lobby`. If the player closed the window and stays idle on the start screen, the host's Start pulls them into the match. Every step of that is traced below; a live two-window run still has to show it.
- **Two more problems the brief did not list:**
  - After joining and then closing the window, the join window stays broken until the page reloads. `hasJoined` is never reset, so the Join button never comes back.
  - After ✕ or a click outside, the 1-second player poll keeps running.
- **Main risk of the fix:** Escape is a window-wide listener that fires even while the window is hidden, including during a match. It must be guarded. Otherwise Escape in a match would send `leave-lobby` and end the match. The plan guards it.
- **Host side has a real gap.** The same fix applies. Whether closing the host window should end the lobby for everyone is a product call (Q1).
- **Client-only.** Two modal files plus new tests. No change to `Main.ts`, the server, `src/core/` or `Transport.ts`. No file overlap with 0322, so it can be built alongside it.

---

## 0. Step-1 confirmation (file:line, current tree)

### How each join-window close route works

| Route | What runs | Sends `leave-lobby`? | Side effects |
|---|---|---|---|
| ✕ | `OModal.close()` only (`src/client/components/baseComponents/Modal.ts:99` → `:77-82`). `JoinPrivateLobbyModal.close()` is **not** called. | No | Poll keeps running (`JoinPrivateLobbyModal.ts:235`, and `:310` still sees the id). Input keeps the id. `hasJoined` stays true. |
| Click outside | `<aside @click=${this.close}>` (`Modal.ts:88`; inner clicks stopped at `:90`) → `OModal.close()` | No | Same as ✕ |
| Escape | Window `keydown` → `JoinPrivateLobbyModal.close()` (`JoinPrivateLobbyModal.ts:29, 37-42`). This fires **whether or not the window is open**, including in a match. | No | Clears input and poll. `hasJoined` stays true. |
| Hash change (`onHashUpdate`) | `joinModal.close()`, then `handleLeaveLobby()` if `gameStop !== null` (`Main.ts:562-572`) | **Leaves**, by a direct call, not the event | Already correct |
| Pre-start close list | `join-private-lobby-modal` and `host-lobby-modal` `.close()` (`Main.ts:786-806`) | Must stay silent | Programmatic close |
| `onJoin` | `this.joinModal.close()` (`Main.ts:832`) | Must stay silent | Programmatic close |

- `closeAndLeave()` (`JoinPrivateLobbyModal.ts:133-144`) has no callers. Only `PublicLobby.ts:346` dispatches `leave-lobby`.
- Its detail is always empty: `close()` clears the input at `:125` before the detail is read at `:139`.
- Nothing reads the detail. `Main.ts:1011` ignores its event argument, and `Main.ts:317` is the only listener.
- The Join button renders only when `!hasJoined` (`:100-106`). `hasJoined` is reset only in the dead `closeAndLeave`.

### Why the closed-window player gets pulled in

1. The connection is never closed. `gameStop` (`ClientGameRunner.ts:272-282` → `Transport.leaveGame`, `Transport.ts:459-477`) never runs.
2. So the server keeps the player in `activeClients`. It removes a player only on socket close (`GameServer.ts:455-466`), and the Transport ping loop keeps the heartbeat alive.
3. The host's Start calls `start()` (`Worker.ts:258-287`), which builds `players` from `activeClients` (`GameServer.ts:524-545`) and sends `start`.
4. The client's `onmessage` (`ClientGameRunner.ts:201-215`) runs `onPrestart`: it closes the start-screen modals, hides the start-screen controls and shows the game-starting modal. `onJoin` then runs the game.
5. This happens only while the player is idle on the start screen. Starting single-player, a public lobby or another join runs `handleJoinLobby` → `gameStop()` (`Main.ts:742-745`), which leaves the old lobby.

### Brief's consequence 2 (0303's restart popup) is confirmed

`isAwayFromStartScreen` is `gameStop !== null` (`Main.ts:171`), so the offer goes pending (`CitizenshipRestartOffer.ts:90-94`). `onBackOnStartScreen` (`Main.ts:1025`) is never reached.

### Host window

| Route | What runs | Result |
|---|---|---|
| ✕ / click outside | `OModal.close()` only | Poll keeps running every second with a `console.log` (`HostLobbyModal.ts:640, 947-961`) |
| Escape | Window listener → `HostLobbyModal.close()` (`:79, 87-92, 643-654`), also unconditional | Poll cleared |
| Successful Start | `this.close()` (`:908`) | Programmatic; must stay silent |
| Pre-start list | `Main.ts:787` | Programmatic; must stay silent |

- No route sends `leave-lobby`. The host stays connected and `gameStop` stays set. That makes the login-restart treat the player as "match active" (`Main.ts:325-331`).
- The host is **not** pulled in: only the host modal has Start, and reopening Create makes a new lobby (the next join stops the old connection).
- In production the lobby is already unstartable once the host modal is closed. After the host leaves, `creatorMayStartPrivateLobby` returns false because the creator is not in `activeClients` (`GameServer.ts:955-962`). Friends wait in a dead lobby either way. Today they also see the host listed.
- Consequence 2 (the restart popup) does not apply to hosts: only citizens can host (0302).

## 1. Join window fix — `src/client/JoinPrivateLobbyModal.ts`

**One funnel for every close the player makes.** ✕, click outside and Escape all end in `o-modal`'s `modal-close` event. The component listens for it and leaves only if it has joined.

- **Render:** `<o-modal … @modal-close=${this.handleModalClose}>`. This is the same idiom as `NewsModal.ts:216`.
- **`handleModalClose`:**
  1. Capture `lobbyId = this.lobbyIdInput?.value ?? ""` and `wasJoined = this.hasJoined` **before** resetting.
  2. Call `reset()`.
  3. If `wasJoined`, dispatch exactly one `leave-lobby` with `{ detail: { lobby: lobbyId }, bubbles: true, composed: true }`. This matches `PublicLobby`'s shape and fixes the empty id.
- **`reset()`** (private): clear the input, clear the poll, and set `hasJoined = false`, `message = ""`, `players = []`. Bump `closeGeneration`. Call `requestUpdate()` explicitly, because decorator updates are unreliable under the test build (`HostLobbyModal.ts:822` comment).
- **`public close()` (programmatic — match start, `onJoin`, hash reset):** `reset()` first, then `this.modalEl?.close()`.
  - The `modal-close` that follows sees `hasJoined === false`, so it never leaves.
  - Callers that need a leave already do it themselves (`onHashUpdate` → `handleLeaveLobby`). So hash change still gives exactly one leave, and match start gives none.
- **Escape:** keep `e.preventDefault()`, but only close when `this.modalEl?.isModalOpen`, via `this.modalEl.close()` so it goes through the same funnel. When the window is hidden (including in a match) Escape does nothing.
  - Extend the `modalEl` query type with `isModalOpen: boolean` (a public `@state` on `OModal`, `Modal.ts:7`).
- **Delete `closeAndLeave()`.** This removes the dead code, and its empty-detail bug with it.
- **Close during "checking…" (step 1c — widens the brief slightly; strike it at approval if unwanted):**
  - Today, closing while `checkActiveLobby` or `checkArchivedGame` is still awaiting a fetch still dispatches `join-lobby` afterwards (`:224-233`, `:295-305`). The player then joins with the window closed, which is this same bug by another route.
  - Fix: capture `closeGeneration` at the start of `joinLobby()`. After each await, if it changed, stop: no dispatch, no `hasJoined`, no interval, no message.
- **Result:**
  - Before joining: 0 leaves (the `hasJoined` guard; this does not rely on `gameStop === null`).
  - After joining: exactly 1 leave per close the player makes.
  - Programmatic close: 0 leaves.
  - Reopening after a close shows the Join button again.

## 2. Host window — only if the owner picks option A in Q1 — `src/client/HostLobbyModal.ts`

The same pattern, adapted:

- `@modal-close` funnel, with `hasJoinedLobby` set when `open()` dispatches `join-lobby` (`:627-637`).
- The player-close funnel resets state (poll, bots timer, `copySuccess`) and bumps `openGeneration`. It then dispatches one `leave-lobby` `{ lobby: this.lobbyId }` if joined.
- Programmatic `close()` (successful Start at `:908`, pre-start list) resets first and stays silent.
- Escape is guarded on `isModalOpen`.
- `open()`'s `createLobby().then` skips the `join-lobby` dispatch if the window was closed since this open. This is the same race as step 1c.
- Bumping `openGeneration` on close also stops a Start whose ad is still showing when the host closes the window. Otherwise it would POST `start_game` for a lobby the host has left. This reuses the existing R7 guard (`:67-70`, `:853-856`). `open()` already resets `isStarting`.

## 3. Files not changed

- `Main.ts`: `handleLeaveLobby` already does everything, and `onHashUpdate` stays at exactly one leave.
- Server files, `src/core/`, `Transport.ts` (0252's).
- `CitizenshipRestartOffer.ts` (0303's logic is untouched).
- `en.json` / `ru.json`: no new text.
- Analytics: no new events.

## 4. Tests — write them first, run them red on today's code, then fix

### New file: `tests/client/JoinPrivateLobbyModalLeave.test.ts` (jsdom)

- **Mocks:** `./Main` (as in `HostLobbyModalUrl.test.ts:13`), `Utils.translateText`, `ConfigLoader` (`workerPath`), `jwt`, `Button`.
- **Real parts:** the real `OModal` and the real `JoinPrivateLobbyModal`.
- **Setup:** `fetch` answers `{ exists: true }`; use jest fake timers for the interval.
- **Counter:** a `leave-lobby` listener on `document`.

| Test | Red today? |
|---|---|
| (a) ✕ after joining → 1 leave, with `detail.lobby` equal to the id | red |
| (b) Click outside (`aside.c-modal`) after joining → 1 leave | red |
| (c) Escape after joining → 1 leave | red |
| (d) ✕ / Escape before joining → 0 leaves | green today (guard test; say so) |
| (e) Programmatic `close()` after joining → 0 leaves, then a later Escape (window hidden) → 0 leaves | green today; guards the in-match Escape risk |
| (f) Close during "checking", then the check resolves → no `join-lobby`, no poll | red; only if step 1c is kept |
| (g) After ✕, reopening shows the Join button and no poll fetches fire | red |
| (h) 0303 chain: real `createCitizenshipRestartOffer`, grant while joined → no prompt, then ✕ → `showPrompt` called once | red |

- **Test (h) harness:** `document` listeners copy `Main.handleLeaveLobby`'s gate and `onBackOnStartScreen` call (`Main.ts:1011-1026`).
  - ⚠️ It does not execute `Main.ts` itself. `Client` is not exported and imports half the app.
  - The Main glue is covered by reading plus the live check below. The worklog must say so.
- **Fallback:** if the real `OModal` will not render in jsdom (no existing test renders it), drive the funnel by calling the `o-modal` element's `close()`. That is exactly what the ✕ and outside-click handlers call (`Modal.ts:88, 99`). Record the fallback as proving the funnel, not the click wiring.

### Host tests (option A only): new file `tests/client/HostLobbyModalLeave.test.ts`

- ✕ / outside / Escape after joining → 1 leave
- Programmatic `close()` → 0 leaves
- Close before `createLobby` resolves → no `join-lobby` and no leave
- Existing `HostLobbyModalUrl.test.ts` must stay green. It stubs `close` and mocks `Modal`.

### Commands

- `npm test -- tests/client/JoinPrivateLobbyModalLeave.test.ts [HostLobbyModalLeave]`: record the red run, then the green run.
- `npx tsc --noEmit`
- `npm run lint`
- Full `npm test`. It includes the shell harnesses. For any supertest flake, follow the CLAUDE.md procedure and say that you re-ran.
- 0322 is editing server and profile files in parallel. Attribute any failure in those suites before calling it ours.

## 5. Live reproduction — before the fix and again after (build worker or owner)

1. `nvm use && npm run dev`, then open `localhost:9000`. In dev, the flags are on (`FlashistFacade.ts:980`) and Create is unlocked (`PrivateLobbyAccess.ts:42`). If the private-lobby row is hidden anyway, record that and stop.
2. **Window A** (normal) and **window B** (a private window, so a separate `persistentID`), each with a different name. A: Create lobby, then copy the lobby id. B: Join private lobby, paste the id, Join. A's list shows B.
3. **B closes with ✕.**
   - Before the fix: A's list still shows B, and B's Network tab shows `/api/game/<id>` every second.
   - A presses Start. Record whether B is pulled in (game-starting modal, then the match).
   - After the fix: B drops off A's list within about 1 s. The Start leaves B on a usable start screen.
4. Repeat step 3 with Escape and with a click outside. Also reopen B's join window after closing: before the fix, the Join button is missing.
5. **Popup:** while B is joined, run this in B's console, then close the window:
   ```js
   window.dispatchEvent(new CustomEvent("geoconflict-citizenship-granted-mid-session",{detail:{source:"purchase"}}))
   ```
   After the fix, the restart popup appears. Before the fix, it does not.
6. **Host:** A closes with ✕ while B is joined. Record whether A stays in B's list and whether A's poll keeps running, before and after the fix.
7. Record every result in the worklog. Where something does not reproduce, say so plainly.

## 6. Risks and residuals to record

- **0228 window.** `hasJoined` is set just before `join-lobby` is dispatched, but `handleJoinLobby` sets `gameStop` only after three awaits (`Main.ts:746-754`). A close in that gap (under about 1 s) sends a leave that `handleLeaveLobby` drops (`gameStop === null`), and the join then completes invisibly. This is 0228's race; do not fold it in. Record it as a residual that points to 0228.
- **0252.** A leave on this route now runs `gameStop`. Transport's leaked bus listeners (0252) become reachable here too. The public-lobby leave route already has the same issue, so this is not new in kind.
- **`handleLeaveLobby` cleanup** (hide gutter ads, clear the reconnect session, public-lobby leave) is the same cleanup the public-lobby leave runs today. Gutter ads never show inside the Yandex iframe (`GutterAds.ts:62-65`).

## 7. Deploy order

- Client-only. One normal game-client deploy.
- No server, profile-server or migration dependency. Old and new clients are both fine against the unchanged server.
- Independent of 0322. It may ship in the same release or in either order.

## 8. Sequencing against 0322

- No file overlap: this task touches `JoinPrivateLobbyModal.ts`, `HostLobbyModal.ts` and two new test files; 0322 touches `GameServer.ts`, `Client.ts`, the profile server and `CreditContract.ts`.
- It can be built in parallel. It only reads server behaviour (`GameServer` socket close and `start()`) and does not depend on 0322's edits.
- If Q1 becomes option B (a server-side lobby cancel), that work touches `GameServer.ts` and `Worker.ts`. It would have to be sequenced after 0322, and it would belong in its own task.

## 9. Worklog decision log (build worker)

Record step 1's findings for both windows, the red and green test runs, the live results before and after the fix, the Q1 ruling, and whether step 1c was kept.

**Owner question put with the plan:** Q1 — what closing the host's lobby window should do (Rec: same fix now, lobby not ended for friends; alt: same fix plus a follow-up task to end the lobby for everyone; alt: leave the host side alone). Step 1c (close during "checking…") stays unless struck at approval.

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (what closing the host's lobby window does):** "Host leaves cleanly (Recommended)" — Same fix now: host leaves, background refresh stops. Friends see the host drop and stay in a lobby that can't start — same as today, just visible. Client-only, small. ⇒ §2 (host window) applies; no follow-up task filed.
- **Plan approval:** "Approve (Recommended)" — Build it, extra fix included. ⇒ step 1c (close during "checking…") is kept.
