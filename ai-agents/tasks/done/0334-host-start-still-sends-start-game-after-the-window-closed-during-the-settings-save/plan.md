# Plan — 0334: Host Start still sends `start_game` after the host window closed during the settings save

**Planning-only run.** No source, tests or files were written. The plan was checked against the **current working tree**, which includes the uncommitted `0333`, `0347`, `0348` and `0035` changes.

## 0. What I checked (brief vs the tree)
- **The brief's claim is confirmed.** In `attemptStart` (`src/client/HostLobbyModal.ts`, about lines 900–960), the generation check runs once, right after `showInterstitial()`. After that there are three awaits with no re-check: `await this.putGameConfig()`, then `await getServerConfigFromClient()`, then the `start_game` POST.
- **How a close works today.** Every close the host makes (✕, a click outside, Escape) goes o-modal `modal-close` → `handleModalClose()` → `reset()`, and `reset()` does `openGeneration++`. A programmatic `close()` also calls `reset()`. So "the window is still the same opening" is exactly `generation === this.openGeneration`, the same check the existing R7/0327 guard uses. No new state is needed.
- **`reset()` does not clear `lobbyId`.** A Start that carries on after a close therefore still POSTs to the old lobby id. That is how the bug reaches the server.
- **Server side** (`src/server/Worker.ts`, `POST /api/start_game/:id`):
  - If the creator's socket is already gone, it answers 403 (`creatorMayStartPrivateLobby` → `creator === undefined`).
  - With `GAME_ENV=dev` the citizen gate is bypassed, so the friends get started without the host.
  - This matches the brief.
- **0333's catch stays.** `open()` keeps its `joined.catch(() => {})` exactly as 0333 left it. This plan does not touch `open()`, `createLobby()`, `pollPlayers()` or `reset()`.
- **No overlap with `0353`.** Nothing touches `pollPlayers()`, and the fix does not make 0353 worse.
- **No overlap with `0335` case 4.** The change does not touch `isStarting`. A Start stopped by a close takes the same path as today's ad-time close: `startGame`'s `finally` skips the reset because the generation changed, and the next `open()` resets it. That is unchanged behaviour, not new.
- **Wiki agrees.** `[[tasks/private-lobby-close-leaves-lobby]]` and `[[tasks/private-lobby-citizen-perk]]` were read, and the wiki watermark is current (0 commits since the last sync).

## 1. The change — one function, `attemptStart`, client only
File: `src/client/HostLobbyModal.ts`. No `src/core/`, server, analytics or localization change.

**Core fix (what the brief asks for)**
- **(A)** Right after `const configResponse = await this.putGameConfig();`, and **before** the `!configResponse.ok` branch, add `if (generation !== this.openGeneration) { return null; }`.
  - This covers a close during the save's inner `getServerConfigFromClient()` and during the PUT itself.
  - Because it sits before the `!ok` branch, a save that fails after the close does not flag the failure line on a closed window.
- **(B)** Right after `const config = await getServerConfigFromClient();` and **before** the `fetch(... start_game ...)`, add the same check with `return null`.
- **Comment:** one short comment tying both checks to `0334` / 0327 review R1, in the style of the existing `// Review R7:` comment.

**After-send guard — my recommendation, put to the owner as Q1**
- **(C)** After the `start_game` POST's `await`, before `!response.ok` / `this.close()`: if the generation is stale, `return response` and neither close the window nor show the failure line.
- **(D)** In the `catch`: if the generation is stale, `return null` and do not call `showStartFailed()`.
- **Why these matter.** Once the POST has gone out it cannot be taken back. But if the host closes and reopens Create while it is in flight (the server can take up to ~5 s on the citizen check), today's code will do one of two things:
  - A late OK runs `this.close()` on the **new** window. `close()` resets `hasJoinedLobby`, so no leave is sent. The host stays joined to the new lobby with the window gone. This was reasoned from the code, not observed.
  - A late 403 or a network error shows "couldn't start" in the new lobby.
- (C) and (D) add 2 checks and 2 tests in the same function.

**Design choices I made (the brief left them open)**
- The checks are written inline, `if (generation !== this.openGeneration) return null;`, matching the existing R7 check. There is no helper and no refactor of the existing check.
- A stopped Start returns `null` quietly: no log line and no failure line, the same as today's ad-time close.
- `putGameConfig()` is **not** given a generation parameter. It has ~20 callers.
  - Leftover (accepted in this plan, stated here): if the close lands during the PUT, or during the save's own config read, the PUT itself may still reach the left lobby.
  - That is harmless: it changes settings on a lobby nobody can start from this client, and the server rejects it once the lobby is gone.
  - Only `start_game` is stopped. That is what the brief asks for.

## 2. Tests — red first
File: `tests/client/HostLobbyModalLeave.test.ts`. This is 0327's file: it uses the real o-modal and a real ✕ click. The new tests go next to the existing `closing while a Start's ad is showing starts nothing` and reuse `openAndJoin()`, `clickClose()`, `flush()`, `calls()` and `fetchMock`.

1. **Close while the settings save (PUT) is pending → no `start_game`.**
   - Setup: `fetchMock` answers `PUT /w1/api/game/HOSTLOBBY` with a held promise, and sets `clients = [{}, {}]`.
   - Steps: `startGame()` → flush → `clickClose()` → assert `leaves.length === 1` → resolve the PUT `{ok:true}` → the Start resolves `null`.
   - Assert: no `start_game` call and no failure line.
2. **Close while `getServerConfigFromClient()` is pending (the read in `attemptStart`, after the save) → no `start_game`.**
   - Setup: hold the PUT, then `(getServerConfigFromClient as jest.Mock).mockReturnValueOnce(heldConfig)`, then release the PUT and flush. That way the held call is the one made after the save.
   - Steps: `clickClose()` → resolve the config → the Start resolves `null`.
   - Assert: no `start_game`.
   - Fake timers are already on, so `pollPlayers` cannot use up that `mockReturnValueOnce`.
3. **Window kept open → exactly one `start_game`.**
   - Assert: `openAndJoin()` → `startGame()` → exactly **1** `start_game` call, exactly **1** PUT after the tap, the window closed, 0 `leave-lobby`.
   - ⚠️ This test **passes on today's code by nature**. It guards the normal path and cannot be red-first. The worklog will say so.
4. **(Only if Q1 = include C/D)** Close during the in-flight `start_game`, reopen, then the old POST answers **OK**.
   - Assert: the new window stays open (`oModal().isModalOpen === true`) and no extra `leave-lobby` is sent.
   - Red today: `this.close()` hides the new window.
5. **(Only if Q1 = include C/D)** Same setup, but the old POST answers **403**.
   - Assert: no `#host-lobby-start-failed` in the new opening.
   - Red today.

**Order of work**
1. Write the tests.
2. Run `npm test -- tests/client/HostLobbyModalLeave.test.ts` on the unchanged code. Record in `worklog.md` that 1, 2 (and 4, 5) fail and 3 passes.
3. Apply the fix.
4. Re-run and record green.

## 3. Regression runs
- `npm test -- tests/client/HostLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts tests/client/HostLobbyOpen.test.ts`. These cover 0327's leave tests, 0302's start-result / R3 / R4 / R7 tests and 0333's open tests.
- Note on one existing test: `a stale Start finishing late does not clear the new opening's in-flight flag` mocks `close`, and today its stale OK calls that mocked `close`. With C in place it will not. The test does not assert on `close`, so it should stay green. If it goes red, I stop and report instead of editing the assertion.
- `npm run lint`.
- Full `npm test`. For a `supertest` flake, follow CLAUDE.md: rule out `0197`'s SIGSEGV, re-run, and say that I re-ran.

## 4. Live check (the brief asks for it)
**Setup**
- Game server with `GAME_ENV=dev` (ports 3000–3002; the citizen gate is bypassed there).
- Client via `webpack serve --port 9010`, or any free port. Check the ports are free first.
- **Port 9000 is another project's dev server. It is never touched or killed.**

**Steps (Playwright, headless Chromium, two browser contexts)**
- The host opens Create, and the friend joins via `#join=<id>`.
- The host holds `PUT /api/game/<id>` with `page.route` for ~5 s. This is more reliable than network throttling.
- The host taps Start, then closes with ✕ during the hold, then the hold is released.

**Record**
- Whether any `start_game` request left the host page (`page.on('request')`).
- The server log: no `starting private lobby with id <id>`.
- The friend is not started: no `start` message and no game canvas.

**Also**
- Repeat once holding the Start's config read, if it can be targeted. If not, say so and rely on test 2.
- Record the before-fix result too, if cheap: run once on the unchanged code.
- If Q1 = include, one run holding `start_game`, then ✕ and reopen, then release. Check the new window stays open.
- Stop every process I started and delete the scripts. Results go to `worklog.md`.
- If a case cannot be made to happen live, say so plainly and rely on the tests.

## 5. Files touched
- `src/client/HostLobbyModal.ts` — `attemptStart` only.
- `tests/client/HostLobbyModalLeave.test.ts` — new tests.
- `ai-agents/tasks/backlog/0334-…/worklog.md` — red/green runs, the live check, and the decision log (including `none` if no unattended fixes).
- Nothing committed.

## 6. Risks and edge cases
- **A second tap after the close:** not possible. The window is closed, and `isStarting` stays true until the next `open()`, which resets it (unchanged).
- **A close during the ad:** already covered by the existing check and test (unchanged).
- **Reopen during the save or config read:** caught by the same checks. The stale Start does nothing to the new lobby, and neither the new lobby id nor the new failure line is touched.
- **Late settings save after the close:** the PUT may still reach the left lobby (§1 leftover, harmless).
- **A POST already sent:** cannot be recalled, so friends may still be started if the close lands after the POST leaves (dev) — a sub-second to ~5 s window. This is out of scope: stopping it needs a server-side cancel, which the brief excludes.

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text.*

- **Plan:** APPROVED.
- **Q1 (after-send guard C/D):** **Include it now** — build (C) and (D) and tests 4 and 5, plus the Q1 live run.
