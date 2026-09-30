# 0336 — worklog

Build worker, spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30. Approved plan:
`plan.md` in this folder (blob `e8c929ad4fd736a811547cdcc277d40ae374b13d`, re-hashed at start — matched).
Owner rulings carried: scope **1 + 2 + 3**, **Q1 = (a) accept**, **Q2 = A (build §1e + H1–H3)**, and the
deliberate reversal of 0329's pinned gate-reveal assertion. Nothing committed.

> **Status: built.** Every plan step done. No NEEDS-DECISION raised. Full `npm test` **not run here** —
> the driver's separate Verify step owns it.

## Step-1 check (plan §0) — re-confirmed on the current tree

All seven points hold, found by name. One change since the plan was written: 0333/0334/0347/0348/0035 are
now **committed** (HEAD `9cb8ee4`), not uncommitted; the code is the same. 0333's `joined.catch(() => {})`
and 0334's four `attemptStart` checks were left untouched (§1e only extends the `catch` statement).

## Change surface

| File | Change |
|---|---|
| `src/client/StartScreenPresence.ts` | §1a: `beginJoiningLobby()` counter; `whenOnStartScreen()` loops on "away or joining"; test reset zeroes the count; header comment. |
| `src/client/Main.ts` | §1b: `handleJoinLobby` wraps the unchanged body (renamed `joinLobbyFromEvent`) in the marker, `finally` ends it. §1d: the inline pre-start loop replaced by `closePreStartModals()`. |
| `src/client/PreStartModals.ts` (new) | §1d: the tag list + loop, moved verbatim from `onPrestart`, then `"tenure-grant-modal"` appended. |
| `src/client/TenureGrantModal.ts` | §1d: `close()` — drops `onClosed`, hides. |
| `src/client/CitizenshipCard.ts` | §1c: `startTenureClaim` calls new `showTenureThankYouOnStartScreen()` (waits `whenOnStartScreen()`); re-read not held back; the 0329 doc line reworded. |
| `src/client/HostLobbyModal.ts` | §1e: `open()` begins a marker; `joined.catch(() => {}).finally(endJoining)`. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | §4: `CITIZENSHIP_TENURE_GRANT_CLAIMED` row sentence. No event added/renamed. |
| tests | `StartScreenPresence`, `TenureGrantModal`, `CitizenshipCard`, `HostLobbyOpen` (edited); `PreStartModals` (new). |

`CitizenshipRestartOffer.ts` and its tests untouched (D2).

## Tests — red, then green (plan §2 order)

1. Extracted `PreStartModals.ts` with **no** new tag, wired `Main`.
2. Wrote every test. **Red run** (source at HEAD + the extraction):
   `5 suites failed; 21 failed, 136 passed, 157 total`.
3. Applied §1a–§1e. **Green run**: `5 suites passed; 157 passed, 157 total`.

| Test | Red — how it failed | Green |
|---|---|---|
| P1–P6 (presence) | runtime `TypeError: beginJoiningLobby is not a function` (not an assertion) | pass |
| M1 (`close()`) | runtime `TypeError: modal.close is not a function` | pass |
| S1 (tenure popup closed at match start) | **assertion** — still visible | pass |
| S2 (restart popup still closes) | green on both runs (regression pin) | pass |
| C1, C2, C3, C7, C8 | **assertion** — `show` called while away | pass |
| C4, C5 | runtime `TypeError` (`beginJoiningLobby`) | pass |
| C6 (stays on start screen → once) | green on both runs (keep-what-works pin) | pass |
| Reversed 0329 test (gate reveal while away: card reveals, popup waits) | **assertion** — `show` called | pass |
| H1, H2, H3 | **assertion** — waiter resolved at the Create tap | pass |
| existing 0333 tests 4b, 5 | red in the red run only: the extended harness's `onJoin` calls `beginJoiningLobby` → `TypeError` | pass |

**Mutation checks** (to prove each test group hangs on the fix it names, not on a harness TypeError):
- §1e alone reverted (`HostLobbyModal.ts` = HEAD, everything else fixed): **H1–H3 fail on assertions**
  (waiter resolves at the tap); all 9 existing `HostLobbyOpen` tests pass. Restored.
- `"tenure-grant-modal"` alone removed from the list (modal keeps `close()`): **S1 fails**, S2 passes. Restored.

No existing test needed an extra flush (`settle()`'s 4 rounds were enough).

## Regressions, lint, types

- Brief list + plan list — `CitizenshipCard`, `StartScreenPresence`, `TenureGrantModal`, `TenureGrantClaim`,
  `CitizenshipRestartOffer`, `HostLobbyOpen`, `HostLobbyModalLeave`, `HostLobbyModalUrl`,
  `JoinPrivateLobbyModalLeave`, plus `PreStartModals`, `CitizenshipRestartModal`:
  **11 suites passed, 241/241 tests** (run twice: after green, and again after the live check restored files).
- `npx tsc --noEmit -p tsconfig.json`: **exit 0**. `npm run lint`: **exit 0**.
- Prettier: every file I touched is clean (one new test file was reformatted by `prettier --write`).
  `tests/client/DaysPlayedAnalytics.test.ts` and `SessionMatchAnalytics.test.ts` fail `prettier --check` —
  **pre-existing, not touched by me**, left alone.
- **Full `npm test`: not run** — owned by the driver's Verify step (spawn instruction).

## Live check (plan §3)

Setup: `GAME_ENV=dev` server on 3000–3002 + `npx webpack serve --port 9010 --node-env development`
(3000–3002 and 9010 checked free first; port 9000 = another project's dev server, PID 57856 — not touched,
still running at the end). Headless Chromium via the repo's Playwright, `tutorialCompleted` preset. Match
started by calling `single-player-modal`'s `startGame()` from `page.evaluate`. "Before" = the five modified
`src/client` files restored to HEAD (copies of the fixed files kept in my scratchpad, restored after; hashes
re-checked identical). All processes I started were stopped; script left in scratchpad only.

| Check | Result | Evidence |
|---|---|---|
| **L1** — popup forced open (`show({xpAwarded:30,xp:55}, cb)`), then a single-player match starts | **Before: reproduced. After: PASS.** | Before: `Closing modals` + `lobby: game started` logged, game canvas present, popup `isVisible: true`, overlay `display: flex`. After: same start logs + canvas, popup `isVisible: false`, overlay `display: none`, close callback called **0** times (follow-up dropped, D4). 0 page errors both runs. |
| **L2** — real claim path (join during the claim / the join's setup) | **NOT RUN** | The claim path is unreachable in local dev: `maybeClaimTenureGrant` needs `isCitizenshipSurfacesEnabled`, a Yandex-**authorized** player with an id (`resolveSession`), a configured `profileApiUrl`, `grantChecks.tenure === "pending"` from login, and tenure evidence in storage. A stub would mean faking the YaGames SDK's auth plus several routes — not cheap, so not attempted. Covered by C1–C8 and P1–P6 only. **No live claim is claimed.** |
| **L3** — waiting popup during 0333's Create | **NOT RUN** | A forced popup cannot exercise a *waiting* one (as the plan says). Covered by H1–H3 only. |

Side observation: L1's "after" run started a match through the new `handleJoinLobby` wrapper, so the §1b
success path ran live once (join → `gameStop` set → match started, no error). The failure path (a setup
await throwing) was not run live.

## Residuals (plan §5) — recorded, not fixed

- **Q1 = (a):** a thank-you held back, then followed by a match, is never shown. XP is kept.
- **Stale `gameStop` (0228):** a join over an existing game that fails in setup leaves `gameStop` stale, so the
  popup waits until the next leave.
- **0228 overlap:** 0228's fix may add its own "join still setting up" marker; mine lives in
  `StartScreenPresence` and only feeds presence. Whichever lands second reconciles.
- **D2:** the restart popup (not the tenure one) can still appear during a join's setup awaits — pre-existing,
  0303 accepted.
- **Q2 = A:** a hung `createLobby` (no fetch timeout) holds the popup until the browser gives up.
- Not live-checked: L2, L3 (above).

## Decision log

Calls the plan did not spell out:

- **Predicate renamed `isAwayOrJoining`** (the plan's snippet called it `isAway`). The plan's name shadows
  `setStartScreenPresenceSource`'s existing `isAway` parameter in the same file. Name only; behaviour as planned.
- **H1–H3 live in the existing 0333 describe block, and its Main stand-in was extended** (leave now calls
  `reportBackOnStartScreen()`, `onJoin` begins/ends a marker, `beforeEach` registers `gameStop !== null` as
  the presence source and resets presence). Mirrors Main's real wiring; the existing 9 tests stay green.
  Side effect recorded above: 4b/5 went red in the red run (harness `TypeError`), not a behaviour regression.
- **"Before" for the live check = the five modified files restored to HEAD**, not `git stash`, so nothing
  could be lost on a stash pop. Restored by copy; hashes verified.
- **L2 stub not attempted** — judged not cheap (reasons above). The plan allowed either outcome if recorded.
- **Doc row padding** kept to the same line width by trimming trailing spaces (table alignment unchanged).
- **Fixes applied without per-fix approval: none** (this is a Build step; no review findings processed).
- **Obvious-winner calls: none.**

## Process review — round 1 (Process-review worker, `fkit-sprint-ship-loop`, 2026-09-30)

Spawned under the declared-approval marker; plan re-hashed at start — `e8c929ad…` matched. Owner rulings
carried: R1 "Cover it", R2 "Accept, fix the record", R3 in-plan test fix. Ledger: `review.md` § Coder response.

### Change surface

| File | Change |
|---|---|
| `src/client/JoinPrivateLobbyModal.ts` | R1: `joinLobby()` begins a `beginJoiningLobby()` marker before its `try`, ends it in a new `finally`. |
| `src/client/TenureGrantModal.ts` | R2: `close()` doc comment only. |
| `src/client/CitizenshipCard.ts` | R2: `showTenureThankYouOnStartScreen` doc comment only. |
| `src/client/StartScreenPresence.ts` | R2: `whenOnStartScreen` doc comment only; R1: header comment names the join window. |
| `src/client/Main.ts` | R3: comment only, at `handleJoinLobby`'s marker ("Keep it before any await"). |
| `tests/client/JoinPrivateLobbyModalLeave.test.ts` | R1: J1–J5. |
| `tests/client/HostLobbyOpen.test.ts` | R3: `mainSetup` deferred in the Main stand-in; H4. |

`HostLobbyModal.ts` untouched this round. `Matchmaking.ts` untouched (see NEEDS-DECISION below).

### Tests

- **J1–J5 red first**: 5 failed, 9 passed (all 5 on assertions — the waiter settled during the lookup). After
  the fix: 14/14.
- **H4**: green with the fix; **mutation** (stand-in begins its marker only after the setup await) → H4 red,
  H1 still green. Restored from a scratchpad copy.
- 14 suites (StartScreenPresence, CitizenshipCard, TenureGrantModal, PreStartModals, HostLobbyOpen,
  HostLobbyModalLeave, HostLobbyModalUrl, JoinPrivateLobbyModalLeave, TenureGrantClaim, CitizenshipRestartOffer,
  CitizenshipRestartModal, PrivateLobbyAccess, PrivateLobbyLang, JoinLobbyReconnectSession): **308/308 pass**.
- `npm run lint` exit 0; `npx tsc --noEmit -p tsconfig.json` exit 0; prettier clean on every touched file.
- Full `npm test`: not run here (driver's Verify step).

### Decision log — round 1

- **R1 (Join half) — fix applied without per-fix approval.** Answers R1 (`JoinPrivateLobbyModal.joinLobby`
  does server config + `/exists` before `join-lobby`, unmarked). Changed: marker begun before `try`, ended in
  `finally`. Qualified: verified `CORRECT` (reachable via the Join button and `#join=` hash); mechanical/localized
  (one method, same begin/finally idiom as §1b); inside the approved plan by the owner's explicit in-scope
  addition ("Cover it"). Begin placed just before `try` (not the first line) so a throw in the synchronous
  lines above cannot leak a marker.
- **R1 (Matchmaking half) — NOT applied; returned as NEEDS-DECISION.** Verification contradicts a fact the
  ruling rested on: matchmaking is **unreachable** (`enableMatchmaking()` is `false` in `DefaultConfig.ts`,
  no env overrides it; the button renders nothing, the modal is never in the page). And a whole-wait marker
  cannot meet the ruling's "one end on every path, including cancel/close" without a behaviour change: o-modal's
  ✕ never calls `MatchmakingModal.close()` (pre-existing), so the marker would leak until reload.
- **R2 — comment-only, per owner ruling.** Answers R2's corrected premise. Changed: the two named comments.
  **Obvious-winner call:** also corrected `whenOnStartScreen`'s doc, which asserts the same "a match is left by
  loading the page again" premise — comment-only, within the ruling's intent ("so they state the truth").
- **R3 — in-plan test fix.** Answers R3. Changed: opt-in async Main stand-in + H4. Qualified: verified `CORRECT`,
  test-only, the ruling left the shape to me. **Obvious-winner call:** a comment at `Main.handleJoinLobby`'s
  marker, since no jest test can see an edit to `Main.ts` itself (the stand-in is a copy) — comment-only.
- **R1 residual (new, same shape as the owner-accepted §1e one):** the `/exists` and archive fetches have no
  timeout, so a hung lookup holds the popup until the browser gives up; and when a lookup fails, the popup can
  show over the join window's error message (as §1e's failure case). Not recorded in the ledger's *Accepted
  residuals* — flagged to the owner instead.

### Decision log — round 1, owner rulings on the NEEDS-DECISION (2026-09-30, relayed by `fkit-lead`)

- **R1 Matchmaking half — "Record it, build nothing".** No code. Accepted residual written ("Matchmaking wait is
  not marked as joining"; re-raise only if `enableMatchmaking()` returns `true`, then cover it with the ✕ close
  fix). R1's row set to `✅ done`: the ruled outcome is fully applied (Join fixed, Matchmaking recorded).
- **Join-fix leftovers — "Accept both".** Two accepted residuals written: a hung Join lookup holds the popup
  (no fetch timeout); a failed lookup lets the popup open over the Join window's error message.
- Ledger header `Status: closed-out` — R1 ✅ done, R2 won't fix (frontier), R3 ✅ done; nothing blocking.
- Fixes applied without asking in this step: **none** (docs-only). Obvious-winner calls: **none**.
