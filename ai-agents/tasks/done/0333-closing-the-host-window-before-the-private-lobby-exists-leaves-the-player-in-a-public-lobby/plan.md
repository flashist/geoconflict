# 0333 — Closing the host window before the private lobby exists leaves the player in a public lobby: plan

**Summary**
- **Bug confirmed by reading the current tree. Not yet reproduced live.** Both routes (close before `createLobby` answers; `createLobby` fails) leave the public-lobby connection open while the card shows "not joined".
- **Fix: leave the public lobby for real at the Create tap**, not on the host window's close/failure path. One leave, one place, and it also covers a third case the brief did not list (a failed create with the window still open, where the public match can still start and pull the player in).
- **Files:** `src/client/Main.ts` (Create handler, ~5 lines), one new small module `src/client/HostLobbyOpen.ts`, one new test file. **`HostLobbyModal.ts` is not touched** → no overlap with `0334`. No `src/core/`, `Transport.ts`, server, text, HTML or analytics change.
- **One side effect needs an owner call (Q1):** a real leave also "returns the player to the start screen", so a waiting restart popup (0303) or a delayed citizenship-card reveal can now fire at the Create tap. The tenure-popup part overlaps `0336`.
- **Main risk:** `Main.ts`'s `Client` cannot be run in jest, so the tests drive an extracted helper + the real `HostLobbyModal`; the Main wiring itself is covered by reading + the live check.

---

## 0. Step-1 confirmation by code (current working tree, 0327/0347/0348/0035 uncommitted)

Find by name; line numbers drift.

1. `Main.ts` Create handler (`hostLobbyButton` click → `privateLobbyAccess.onCreateTap(...)`, ~`:533-539`): `hostModal.open(); this.publicLobby.leaveLobby();`.
2. `PublicLobby.leaveLobby()` (~`:269-272`) only sets `isLobbyHighlighted = false; currLobby = null`. No `leave-lobby` event, no `gameStop`.
3. The public connection is Main's `gameStop` (set in `handleJoinLobby`, ~`:761`). Before 0327 it was stopped only when the private `join-lobby` arrived (`handleJoinLobby` → `if (this.gameStop !== null) this.gameStop()`, ~`:749-752`).
4. `HostLobbyModal.open()` (~`:622-657`): `createLobby(...).then(...)` returns early if `generation !== this.openGeneration` (0327 guard). Every close bumps `openGeneration` via `reset()`. So close-before-create ⇒ no `join-lobby`.
5. `HostLobbyModal.handleModalClose()` (~`:671-685`): `hasJoinedLobby` is false ⇒ no `leave-lobby`.
6. `createLobby` failure: `.then` has no `.catch` ⇒ no join, no leave (and an unhandled rejection, pre-existing, out of scope).
7. Net: `gameStop` stays set, transport stays open, server keeps the client in `activeClients`; if the public lobby starts, `onPrestart` closes the host window and pulls the player into the public match.

Brief's claims all hold on the current tree.

## 1. Where the leave goes — design choice (mine; brief left it open)

**Chosen: at the Create tap, in Main.** When the player taps Create (after the lock and username checks pass) and holds a lobby connection (`gameStop !== null`), call Main's existing `handleLeaveLobby()` — the same leave as clicking the highlighted public card — then open the host window.

Why:
- Screen and connection agree from the tap onward, whatever the host window then does (closes early, create fails, create succeeds).
- Exactly one leave: at the tap `gameStop()` runs once and is nulled; the later private `join-lobby` finds `gameStop === null` and stops nothing.
- No spurious leave: guarded by `gameStop !== null` (and `handleLeaveLobby` guards again).
- 0327 unchanged: the private join/leave logic in `HostLobbyModal` is not edited; close after joining still sends exactly one private `leave-lobby`; the "do not join a lobby nobody is looking at" guard stays.
- Any `gameStop` live at the tap would have been stopped by the private join anyway today — this only moves that stop one create round-trip earlier.

Rejected: leave on the host window's early-close / create-failure path. Keeps the public connection live during the create round-trip and for as long as the window stays open after a failed create (public match can still pull the player in); needs the modal to know about a lobby it does not own; would edit `HostLobbyModal.ts` (0334's file).

`handleLeaveLobby` side effects at the tap, checked:
- `logActiveMatchAbandon()` — no-op in a lobby (`gameHasStarted` false). No analytics change.
- `stopPerformanceMonitor()` — nothing running in a lobby.
- `clearReconnectSession()` — reconnect session is saved only at match start (0347), so nothing lobby-phase to lose; same as today's card-click leave.
- `gutterAds.hide()`, `publicLobby.leaveLobby()`, `setStartScreenControlsHidden(false)` — same as today's card-click leave; controls already visible.
- `reportBackOnStartScreen()` and `citizenshipRestartOffer.onBackOnStartScreen()` — **new timing**: a pending restart popup or a waiting citizenship-card reveal can now fire as the host window opens → **Q1**. `restart()` is already refused once the private join sets `gameStop` (0303 R3 guard).

## 2. Changes

### 2a. New `src/client/HostLobbyOpen.ts` (testability seam; same idiom as `GameRestart.ts`, `StartScreenPresence.ts`)

```ts
// Task 0333: Create is tapped from the start screen. A player still holding a
// lobby connection (a public lobby) leaves it for real here — clearing only the
// card highlight left the connection live whenever the private lobby was never
// joined (window closed before create answered, or create failed).
export interface HostLobbyOpenDependencies {
  /** Main: `gameStop !== null`. */
  isInLobby: () => boolean;
  /** Main.handleLeaveLobby: stops the connection and resets the start screen. */
  leaveLobby: () => void;
  /** PublicLobby.leaveLobby(): the card highlight only. */
  clearPublicLobbyHighlight: () => void;
  openHostModal: () => void;
}

export function openHostLobbyFromStartScreen(deps: HostLobbyOpenDependencies): void {
  if (deps.isInLobby()) {
    deps.leaveLobby();
  }
  // Still cleared when no connection is held yet (a public join still awaiting
  // its setup — 0228's window); idempotent after leaveLobby().
  deps.clearPublicLobbyHighlight();
  deps.openHostModal();
}
```
Leave before open, so no create request is ever sent while the public connection is live.

### 2b. `src/client/Main.ts` — Create handler only

```ts
privateLobbyAccess.onCreateTap(() => {
  if (this.usernameInput?.isValid()) {
    openHostLobbyFromStartScreen({
      isInLobby: () => this.gameStop !== null,
      leaveLobby: () => void this.handleLeaveLobby(),
      clearPublicLobbyHighlight: () => this.publicLobby.leaveLobby(),
      openHostModal: () => hostModal.open(),
    });
  }
});
```
Locked tap or invalid name → unchanged, no leave. Nothing else in Main changes.

(If Q1 = option B, add a quiet variant instead of calling `handleLeaveLobby`: a private `leaveLobbyConnection()` holding the stop/cleanup part, with `handleLeaveLobby` = that + `reportBackOnStartScreen()` + `onBackOnStartScreen()`.)

## 3. Tests — red first, then green

"Today's code" in Main cannot run in jest (`Client` is not exported and imports ~57 modules). So:
1. Write `HostLobbyOpen.ts` first as a **behaviour-preserving extraction** of today's handler (`openHostModal(); clearPublicLobbyHighlight();`, no leave) and wire Main to it.
2. Write the tests; run → routes 1 and 2 **red**, guard tests green. Record.
3. Apply the fix (§2a) → all green. Record.
Worklog states plainly: red run is against the extracted equivalent of today's handler, not Main itself.

New file `tests/client/HostLobbyOpen.test.ts` (jsdom). Reuses `HostLobbyModalLeave.test.ts`'s mocks and the REAL `o-modal` + REAL `HostLobbyModal`. A small harness stands in for Main's lobby state: `gameStop: jest.Mock | null`; `leaveLobby` mirrors `handleLeaveLobby`'s gate (`if null return; gameStop(); gameStop = null`); a `join-lobby` listener sets `gameStop = privateStop`; a `leave-lobby` listener calls `leaveLobby`. (Disclosed as a copy of Main's gate, as 0327's test (h) did.) `createLobby`'s fetch is a deferred promise so the test controls when it answers.

| # | Test | Today (extracted) | After |
|---|---|---|---|
| 1 | In public lobby → tap → ✕ before create answers → create answers | `publicStop` 0 calls → **red** | 1 call, 0 `join-lobby` |
| 2 | In public lobby → tap → create fails (`ok:false`) → ✕ | **red** | `publicStop` 1, 0 joins |
| 3 | In public lobby → tap → create fails, window left open | **red** | `publicStop` 1 (the extra case) |
| 4 | Not in any lobby → tap → ✕ (and → create answers → ✕) | green (guard) | `leaveLobby` dep never called; only 0327's private leave in the second variant |
| 5 | 0327 regression: in public lobby → tap → create answers → join → ✕ | `publicStop` 1 (via join) | `publicStop` exactly 1 total, `privateStop` 1, exactly 1 `leave-lobby` event |
| 6 | Order: leave runs before `openHostModal` (pure deps test) | red | green |

Unhandled rejection from a failed `createLobby` is pre-existing; the test tolerates it (spy `console.error`). If jest fails on it, the worker returns NEEDS-DECISION rather than adding a `.catch` to `HostLobbyModal.ts`.

### Commands
- `npm test -- tests/client/HostLobbyOpen.test.ts` — red run, then green run, both recorded.
- `npm test -- tests/client/HostLobbyModalLeave.test.ts tests/client/JoinPrivateLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts` — 0327's tests stay green.
- `npx tsc --noEmit`, `npm run lint`.
- Full `npm test` (includes shell harnesses). On a `supertest` flake: rule out 0197's SIGSEGV, re-run, say so.

## 4. Live check (brief step 1), before and after

Build worker attempts it with Playwright; owner fallback per Q2.
1. `nvm use && npm run dev`, open `localhost:9000`. Dev: Create is unlocked (`PrivateLobbyAccess.isCreateLocked` → false under `GAME_ENV=dev`). If no public lobby appears, check port 3001 is free (known local trap) — not a code bug.
2. Click the public lobby card (joined, highlighted). Note the lobby's client count from `/api/public_lobbies`.
3. **Route 1:** delay `/api/create_game/` (Playwright `page.route` with an ~8 s delay). Tap Create, close with ✕ before it answers. Record: client count still includes us? WebSocket still open? Wait for the public lobby to start: pulled in (game-starting modal)?
4. **Route 2:** make `/api/create_game/` answer 500. Tap Create, close. Record the same.
5. After the fix: repeat 3–4 → count drops at the tap, socket closes, not pulled in. Also the happy path: Create → lobby created → joined → ✕ → one private leave (0327).
6. If it does not reproduce before the fix, say so plainly and stop (brief).

## 5. Residuals to record (not fixed here)
- **0228's window:** a Create tap while a public join is still in its three setup awaits (`gameStop` still null) clears the highlight but cannot leave; the join then completes with the UI un-highlighted. Sub-second; 0228's seam — not folded in.
- **Orphan private lobby** (created, never joined) — unchanged; 0335 case 3.
- **Unhandled rejection on `createLobby` failure** — pre-existing, untouched.
- **Popups at the tap** — per Q1 ruling; tenure-popup part points to 0336.

## 6. Deploy
Client-only; one normal game-client deploy (weekend slot). Proof is local (tests + live dev check), so no separate verify task needed unless the owner wants a production check.

## 7. Worklog decision log (build worker)
Step-1 code trace (§0), live before/after results per route (or "not run" + why), red and green runs, Q1/Q2 rulings, any NEEDS-DECISION raised.

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text.*

- **Plan:** APPROVED.
- **Q1 (popups at the Create tap):** **A — Normal leave.** Reuse `handleLeaveLobby()` as-is; a rare waiting popup may appear as the host window opens. The tenure-popup case stays `0336`'s to fix. (The §2b "if Q1 = option B" variant is NOT to be built.)
- **Q2 (if the live before/after check can't run for tooling reasons):** **A — Proceed** on the code trace + failing tests, record the live check as **"not run" with the reason**, and the owner runs the short live check before the close. (A live run where the bug genuinely does **not** reproduce is different: per the brief, say so plainly and stop — return `BLOCKED`/`NEEDS-DECISION`.)
