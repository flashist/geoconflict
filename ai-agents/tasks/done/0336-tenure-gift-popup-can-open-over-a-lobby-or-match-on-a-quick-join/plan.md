
# 0336 — Tenure gift popup can open over a lobby or match: plan

**Summary**
- **Bug confirmed by reading the current tree** (0333/0334/0347/0348/0035 uncommitted, all included). Every claim in the brief holds; I have not reproduced it live.
- **Fix = all three brief directions, 1 + 2 + 3.** Owner's option text named 1 + 2, but the brief's *What to build* item 1 also demands the join-setup gap be closed, and 1 + 2 alone cannot close it.
  1. The popup waits for the start screen right before it opens. This covers both reveal paths, since both go through `startTenureClaim()`.
  2. Starting a match closes the popup.
  3. A join counts as "away" from its first line, via a small marker in `StartScreenPresence.ts`. The marker reports "back on the start screen" if the join fails, so nothing waits forever.
- **0333's Create-tap case is NOT covered by 1+2+3.** One ~5-line addition in `HostLobbyModal.open()` covers it. It is built only if the owner picks it (**Q2**).
- **Q1 (from the brief)**: a popup held back and then lost to a match. XP is kept, only the thank-you text is lost. Plan builds option (a), accept, unless the owner says otherwise.
- **Change scope:** client only. No `src/core/`, no text, no HTML, no new analytics event. One analytics doc sentence changes.
- **Risk:** `Main.ts`'s `Client` can't run in jest. The Main wiring (2 small edits) is covered by reading and the live check. Everything else is unit-tested red-first.

---

## 0. Step-1 check against the current tree (find by name; line numbers drift)

1. **Gate reveal:** `CitizenshipCard.connectedCallback` → `revealCard()` never asks about presence. `revealCard` → `await updateComplete` → `refreshProfile()` (network) → `startTenureClaim()`.
2. **Late reveal (0329):** `recheckWhenPlatformRecovers` awaits `whenOnStartScreen()` once, then `revealCard()`. So Gap 2 applies.
3. **`startTenureClaim`:** `maybeClaimTenureGrant()` (network). The only guard before `modal.show(` is `isConnected`.
4. **Gap 1:** `Main.handleJoinLobby` awaits `getServerConfigFromClient()`, `fetchCosmetics()` and `getYandexUniqueId()` before `this.gameStop = joinLobby(...)`. The presence source is `() => this.gameStop !== null`, so during those awaits the player reads as "on the start screen".
5. **Pre-start close list** (inside `onPrestart` in `handleJoinLobby`): ends with `"citizenship-restart-modal"`, has no `"tenure-grant-modal"`. `TenureGrantModal` has `show`/`hide` only.
6. **0333 Create tap:** `openHostLobbyFromStartScreen`:
   - calls `handleLeaveLobby()`, which runs `reportBackOnStartScreen()` and wakes any waiter;
   - then opens the host window. `gameStop` stays null until `createLobby` answers and the private `join-lobby` runs.
7. **Only users of the presence module:** `Main.ts` (source + report) and `CitizenshipCard` (late reveal). The 0303 restart offer has its **own** `isAwayFromStartScreen: () => this.gameStop !== null` and does not read `StartScreenPresence`.

## 1. Design (choices I made are marked **D#**)

### 1a. "Joining" marker in `src/client/StartScreenPresence.ts` (direction 3)
```ts
let joinsBeingSetUp = 0;

/**
 * A join has started but Main has not set gameStop yet (task 0336). Counts as
 * away. Call the returned function once the join has set up or given up; if the
 * player is then on the start screen (the join failed), waiters are woken.
 */
export function beginJoiningLobby(): () => void {
  joinsBeingSetUp++;
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    joinsBeingSetUp--;
    if (!isAway()) reportBackOnStartScreen();
  };
}
const isAway = () => joinsBeingSetUp > 0 || isAwayFromStartScreen();
```
- `whenOnStartScreen()` loops on `isAway()`.
- `resetStartScreenPresenceForTests()` zeroes the count.
- Header comment updated.

**D1 — why a counter in this module, not a flag in `Main`:**
- The logic is testable here; `Main`'s `Client` can't run in jest.
- Two overlapping joins (double tap) are handled.
- End is idempotent (safe to call twice).
- A failed join wakes waiters, which is the brief's "must not hang" rule.

### 1b. `src/client/Main.ts` — wrap `handleJoinLobby` (smallest diff)
```ts
private async handleJoinLobby(event: CustomEvent<JoinLobbyEvent>) {
  // Task 0336: away from the first line, not only once gameStop is set.
  const endJoining = beginJoiningLobby();
  try {
    await this.joinLobbyFromEvent(event);
  } finally {
    endJoining();
  }
}
```
- The existing body is renamed to `private async joinLobbyFromEvent(...)`, unchanged. That avoids re-indenting about 100 lines.
- The listener binding is unchanged.
- **Success:** `gameStop` is set before `finally` runs, so the player is still away and there is no wake.
- **Failure** (any await throws before `gameStop` is set, from the start screen): `finally` ends the marker and waiters are woken. The unhandled rejection is pre-existing and not touched.

**D2 — the 0303 restart offer is NOT switched to the new signal.** It keeps its own `gameStop !== null` test. Reasons:
- The brief puts it out of scope.
- `restart()` already refuses inside a lobby (0303 R3).
- Switching it would also need a failed-join `onBackOnStartScreen()` call, or its pending offer would hang.

So `CitizenshipRestartOffer.ts` and its tests are untouched. Residual: the restart popup (not the tenure one) can still appear during a join's setup awaits, as today.

### 1c. `src/client/CitizenshipCard.ts` — `startTenureClaim` (direction 1)
```ts
const result = await maybeClaimTenureGrant();
if (result.status !== "granted" || result.xpAwarded <= 0 || !this.isConnected) return;
// Task 0336: never over a lobby or match — held until the start screen.
const thankYouClosed = this.showTenureThankYouOnStartScreen({ xpAwarded: result.xpAwarded, xp: result.xp });
await this.refreshProfile();            // NOT held: status/XP publish at once
if (wasCitizen || !this.isCitizenNow()) return;
await thankYouClosed;
dispatchCitizenshipGrantedMidSession("tenure");
```
```ts
/**
 * Resolves when the player closes the thank-you, or at once if it cannot be
 * shown (no modal in the page / card gone). Never resolves if a match starts
 * first: the page reloads after a match, so the restart follow-up is moot
 * (0303's own onMatchStarting drops it too).
 */
private async showTenureThankYouOnStartScreen(params: TenureGrantModalParams): Promise<void> {
  await whenOnStartScreen();
  const modal = document.querySelector<TenureGrantModal>("tenure-grant-modal");
  if (modal === null || !this.isConnected) return;
  await new Promise<void>((resolve) => modal.show(params, resolve));
}
```
**D3 — the profile re-read is not held back with the popup.** `publishCitizenshipStatus` (0302's private-lobby lock) and the XP bar update at once, which is today's timing for the re-read. Only the popup waits.

`recheckWhenPlatformRecovers` keeps its own wait (0329 behaviour unchanged). Its comment line "The gate reveal needs no wait" is reworded to point at the new wait in `startTenureClaim`.

**What happens to the follow-up** (brief item 3), `dispatchCitizenshipGrantedMidSession("tenure")`:

| Case | Follow-up |
|---|---|
| Player stays on the start screen | Fires after the thank-you is closed, exactly as today. |
| Popup held back, player returns to the start screen | Popup shows; follow-up fires after it is closed. |
| Popup held back, a match starts (page reloads after) | Never fires. Harmless: the reload reads citizenship fresh. |
| Popup closed by match start (1d) | Never fires. Same reason. |
| No modal in the page, or card gone | Fires at once, as today's `modal === null`. |

### 1d. Close the popup at match start (direction 2)
- **`src/client/TenureGrantModal.ts`** adds
  `/** Main.ts's pre-start close list: hides; the close follow-up is dropped (the page reloads after a match). */ close() { this.onClosed = null; this.hide(); }`
- **D4 — close() does not call `onClosed`.** This mirrors `CitizenshipRestartModal.close()` ("hides without logging a Later").
- **New `src/client/PreStartModals.ts`** exports the tag list plus `closePreStartModals()`. It is the existing loop from `onPrestart`, moved verbatim. `Main` calls it, then `"tenure-grant-modal"` is appended to the list.
- **D5 — why extract:** the brief requires a test for "popup open when a match starts → closed", and the inline loop in `Main` can't be run in jest. This is the same idiom as 0333's `HostLobbyOpen.ts`. The alternative (add the tag inline, rely on reading) is smaller but untested.

### 1e. Only if Q2 = A: `src/client/HostLobbyModal.ts` `open()`
```ts
// Task 0336: creating the private lobby counts as joining one, so a waiting
// tenure popup does not open over this window (0333's Create-tap leave wakes it).
const endJoining = beginJoiningLobby();
...
joined.catch(() => {}).finally(endJoining);   // was: joined.catch(() => {});
```
Why this works:
- 0333's leave at the tap wakes waiters. Their re-check runs as a microtask, after the click handler, by which point `open()` has begun the marker. So they keep waiting.
- **Create answers:** `.then` dispatches `join-lobby`. `handleJoinLobby` begins its own marker synchronously, so the count never drops to 0.
- **Window closed before create answers** (0327 generation guard), **or create fails:** the marker ends and the popup can show on the start screen, or over the failed host window in the failure case.
- **Residual:** `createLobby`'s fetch has no timeout. A hung create holds the popup until the browser gives up.

## 2. Tests — red first, then green

Order:
1. Extract `PreStartModals.ts` behaviour-preserving (no new tag) and wire `Main`.
2. Write every test below and run them. Record the **red** run.
3. Apply 1a–1d (and 1e if Q2 = A). Record the **green** run.

Tests that call not-yet-existing functions go red as runtime `TypeError`s, not assertion failures. The worklog will say which is which.

**`tests/client/StartScreenPresence.test.ts`** (added):
- **P1** waits while a join is being set up, even though the source reads "on the start screen".
- **P2** join ends successfully (source now away): still waiting; a later leave resolves it.
- **P3** join fails (source still on start screen): ending it resolves waiters, so there is no hang.
- **P4** two overlapping joins: ending one still waits; ending both resolves.
- **P5** calling end twice does not under-count.
- **P6** reset clears the count.

**`tests/client/CitizenshipCard.test.ts`**: a new describe "tenure popup never over a lobby or match (task 0336)", using the real `StartScreenPresence` with `setStartScreenPresenceSource(() => away)`.
- **C1** gate reveal, player joins while the claim is pending:
  - claim resolves `granted` → no popup;
  - profile re-read still happens (2 reads);
  - back on the start screen → popup exactly once.
- **C2** gate reveal, join starts during the first `refreshProfile` → same result.
- **C3** late reveal (0329): recovers on the start screen, then away during the claim → no popup; back → once.
- **C4** join in its setup (`beginJoiningLobby()` active, source "on start screen") when the claim resolves:
  - no popup;
  - end with `away = true` → still none;
  - leave → once.
- **C5** join setup fails (end with source on start screen) → popup shows once.
- **C6** player stays on the start screen → popup once; a later `reportBackOnStartScreen()` shows nothing more.
- **C7** gift that made a citizen, popup held back: no restart signal while away; back → popup → close → exactly one `{source:"tenure"}`.
- **C8** card removed while the popup waits → back → no popup.
- **Changed existing test:** 0329's "does not change a card already shown at the gate" (`away = true`) asserted `show` called once. It now asserts the card still reveals **but the popup waits**, which is the behaviour the brief requires. Flagged because it reverses a pinned assertion.
- The existing tenure / 0303 / 0326 tests should stay green. `settle()` already flushes 4×. If one needs an extra flush for the added microtask, that is a test-timing change only, recorded.

**`tests/client/TenureGrantModal.test.ts`**:
- **M1** `close()` hides the overlay and never calls `onClosed`, including after a later CTA tap.

**New `tests/client/PreStartModals.test.ts`** (jsdom, real elements):
- **S1** an open real `tenure-grant-modal` is hidden by `closePreStartModals()`, and its `onClosed` is not called. Red today because the tag is missing.
- **S2** regression: `citizenship-restart-modal` still closes.

**`tests/client/HostLobbyOpen.test.ts`** (only if Q2 = A; reuses its real-`HostLobbyModal` harness plus a waiter on `whenOnStartScreen`):
- **H1** in a public lobby with a waiter: tap Create (leave reports back) → still waiting; create answers → join → still waiting; ✕ → leave → resolves.
- **H2** create fails → resolves (no hang).
- **H3** ✕ before create answers → resolves once create settles.

**Commands:**
- `npm test --` on each file above, red then green.
- The brief's list must stay green: `CitizenshipCard`, `StartScreenPresence`, `TenureGrantModal`, `TenureGrantClaim`, `CitizenshipRestartOffer`. Also `HostLobbyOpen`, `HostLobbyModalLeave`, `HostLobbyModalUrl`, `JoinPrivateLobbyModalLeave`.
- `npx tsc --noEmit`, `npm run lint`.
- Full `npm test`. On a `supertest` flake: rule out 0197's SIGSEGV per CLAUDE.md, re-run, and say so.

## 3. Live check

Setup:
- `GAME_ENV=dev` server on 3000–3002 plus `npx webpack serve --port 9010 --node-env development`. Check all ports are free first.
- **Port 9000 is another project's dev server. Never touch it.**
- Driven with Playwright, as 0333 did. Stop everything started; scripts go in the scratchpad only.

Checks:
- **L1 (direction 2, forceable), before and after:**
  - on the start screen, force the popup open with `document.querySelector("tenure-grant-modal").show({xpAwarded:30,xp:55})`;
  - start a single-player match with DOM `.click()` / `join-lobby`;
  - record whether the popup is still visible after `Closing modals`. Before: visible. After: hidden.
- **L2 (directions 1/3, the real claim path):** needs a Yandex login plus a local profile server with an unclaimed gift. Local dev has no Yandex id, so the claim is skipped.
  - I expect this **cannot be hit locally**. The worklog will say "not run — claim path unreachable in local dev" and rely on tests. No live claim will be claimed.
  - If a cheap stub is possible (an init script faking the id plus `page.route` for login and tenure-grant), attempt it, and record honestly either way.
- **L3 (only if Q2 = A):** the same forced-popup approach cannot exercise a *waiting* popup. Covered by H1–H3; recorded as not live-checked.

## 4. Docs
- `ai-agents/knowledge-base/analytics-event-reference.md`, the `CITIZENSHIP_TENURE_GRANT_CLAIMED` row: "the thank-you modal opens right after" becomes "opens right after, or once the player is back on the start screen — never over a lobby or match; a match start closes it". No event added or renamed.
- Wiki (not mine): after close, `fkit-wiki` should ingest; `wiki/tasks/citizenship-card-late-recovery-recheck.md` mentions the presence module.

## 5. Residuals (recorded, not fixed)
- **Q1 = (a):** a thank-you held back and then followed by a match is never shown. XP is kept.
- **Stale `gameStop` (0228):** a join over an existing game that fails in setup leaves `gameStop` stale, so the popup waits until the next leave. That is 0228's bug, not absorbed.
- **0228 overlap:** 0228's suggested fix also adds a "join still setting up" marker in `Main`. Mine lives in `StartScreenPresence` and only feeds presence. 0228 can reuse it or keep its own cancel flag, and whichever lands second reconciles.
- **D2:** the restart popup can still appear during a join's setup awaits (pre-existing, 0303 accepted).
- **If Q2 = B:** the popup can open as the host window opens after 0333's Create-tap leave. It blocks the host window until tapped, and a match start closes it.
- **If Q2 = A:** a hung `createLobby` holds the popup, since the fetch has no timeout.

## 6. Deploy
Client-only, one normal game-client deploy in a weekend slot. Proof is the tests plus the local check, so no verify task is needed unless the owner wants a production check.

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text.*

- **Scope:** **1 + 2 + 3** — the owner explicitly widened their earlier "1 + 2" choice to include direction 3 (the join-setup "away" marker), after being told 1 + 2 cannot close the join-setup gap the brief requires closed.
- **Q1 (thank-you held back, then lost to a match):** **(a) Accept it.** Nothing stored on the device.
- **Q2 (0333's Create-tap case):** **A — Cover it.** Build §1e (≈5 lines in `HostLobbyModal.open()`) and tests H1–H3; accepted residual: a hung `createLobby` holds the popup until the browser gives up.
- **Plan:** APPROVED, including the deliberate reversal of 0329's pinned "does not change a card already shown at the gate" assertion.
