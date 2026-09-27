# Worklog — 0302 private lobbies as a locked citizen perk

**Build:** 2026-09-27, spawned `fkit-coder` Build worker under `/fkit-sprint-ship-loop` (fkit-lead), on the
owner-approved `plan.md` (approved live via `AskUserQuestion` in the `fkit lead` session, 2026-09-27,
"Approve (Recommended)"). Nothing committed.

⚠️ **The working tree also holds task `0307`'s finished, uncommitted changes** (username rules,
`CitizenshipCard.ts`, `UsernameInput.ts`, `NameLayer.ts`, `en.json`/`ru.json`, `Schemas.ts`, profile-server
name-change files, their tests). 0302 was built **on top of them** and reverts none of them. The files both
tasks touch are `CitizenshipCard.ts`, `tests/client/CitizenshipCard.test.ts`, `resources/lang/en.json` and
`resources/lang/ru.json`; the 0302 hunks there are listed under *Change surface* below.

## Step 0 — records

### Owner rulings this build follows
- **2026-09-26:**
  - Perk approved: **creating** a private lobby is the perk; **joining** stays free.
  - Rank 2 on Sprint 6.
  - Earned **or** paid citizens count (`is_citizen`), so no dependency on `0250`.
  - Forged-id risk **accepted for now** (covers `0068` R3 on this path). Real fix: `0267`.
  - Temporary "citizens only" popup, **no buy button**, removed by `0301`.
  - Ships in the **same deploy** as `0301` (which waits on `0248` → `0250`). Do not release alone.
- **2026-09-27:**
  - Q1: page lock **plus** a server start gate; a refused start shows a **generic** error.
  - Q2: profile unreadable or still loading → shown **locked**.
  - Q4: only Create is locked.
  - Q3 (why hidden in 2025): player numbers were low (no longer a problem), and the owner was unsure the
    copy-a-URL invite works inside the Yandex iframe. Drafts cannot test it (the game is iframe-embedded),
    so: a remote feature switch the owner can turn on for themselves.
  - "Only for me" mechanism: **tester marker** (`localStorage` `geoconflict_tester=1` → `getFlags`
    `clientFeatures: tester=1`; a console condition enables `private_lobbies` only for it). The owner
    still has to confirm the console accepts a client-feature condition.

### 2025 history
- The row was hidden in `src/client/yandex-games_iframe.html` by commit `18bb3e3` (2025-11-07, "Porting
  (preparing for Yandex Games)"). The commit message records no reason. The reasons are the owner's own
  (Q3 above).

### Gate decision
- **Page:** Create is locked for anything but a confirmed citizen; a locked tap opens the interim popup.
- **Server:** `POST /api/start_game/:id` refuses (`403 { error: "citizens_only" }`) unless the lobby's
  **creator** is connected and a citizen. Waits up to 5 s for an in-flight profile resolve. Fails closed.
  Identity only through `getCreditableYandexId` (ADR-103's single funnel).
- **`create_game` is not gated** (it carries no identity); the start is the only way a private game
  begins, so gating the start is sufficient.

### Switch design
- Yandex remote flag `private_lobbies`, value `enabled`. Separate from `citizenship_ui`.
- Row visible only when `isPrivateLobbiesEnabled() && isCitizenshipSurfacesEnabled()`. Either off → hidden
  exactly as today, whatever the citizenship.
- Read once per page load (existing `getFlags` memo); a console change takes effect on the next reload.
  Missing flags (degraded boot, standalone page) read as off. On in dev (`GAME_ENV=dev`).
- **The server cannot see Yandex flags.** The switch only hides the row; the server's citizen check runs
  whether it is on or off.

## Change surface (0302 only)

New:
- `src/client/CitizenshipStatus.ts` — `deriveCitizenshipStatus` + publish / get / subscribe store.
- `src/client/LockedFeature.ts` — `onLockedFeatureTap(featureId)`: analytics + opens the popup. 0301
  re-points this one function.
- `src/client/CitizensOnlyModal.ts` — `<citizens-only-modal>`, interim, no buy button, silent while the
  citizenship surfaces are off.
- `src/client/PrivateLobbyAccess.ts` — row visibility + live Create lock + locked-tap routing.
- Tests: `tests/client/CitizenshipStatus.test.ts`, `tests/client/PrivateLobbyAccess.test.ts`,
  `tests/client/CitizensOnlyModal.test.ts`, `tests/client/PrivateLobbyLang.test.ts`,
  `tests/server/PrivateLobbyStartGate.test.ts`.

Edited:
- `src/client/flashist/FlashistFacade.ts` — `PRIVATE_LOBBIES_*` flag constants, `testerMarker`,
  `lockedFeatureIds`, `LOCKED_FEATURE_TAP_FIRST_PART`, `isPrivateLobbiesEnabled()`,
  `logLockedFeatureTapEvent()`, `readTesterClientFeatures()`; `fetchExperimentFlags` passes
  `{ clientFeatures }` only when the marker is set, otherwise calls `getFlags()` exactly as before.
- `src/client/CitizenshipCard.ts` — **0302 hunks only:** import of `CitizenshipStatus`; `refreshProfile()`
  publishes; new private `publishCitizenshipStatus()`; publish right after `paidGrantConfirmed = true`.
- `src/client/Main.ts` — imports `CitizensOnlyModal` and `PrivateLobbyAccess`; Create click routed through
  `privateLobbyAccess.onCreateTap(...)`. Join click and `handleHash` untouched.
- `src/client/HostLobbyModal.ts` — `startGame()` closes only after an OK start; non-OK or a network error
  keeps the modal open with `host_modal.start_failed`.
- `src/client/LangSelector.ts` — `citizens-only-modal` on the re-render list.
- `src/client/components/baseComponents/Button.ts` + `src/client/styles/components/button.css` — `locked`.
- `src/client/index.html`, `src/client/yandex-games_iframe.html` — row gets `id="private-lobby-row"`, hidden
  by default in **both**; `<citizens-only-modal>` added to **both**.
- `resources/lang/en.json`, `ru.json` — **0302 keys only:** `locked_feature.citizens_only`,
  `citizens_only_modal.{title,body,close}`, `host_modal.start_failed`.
- `src/server/GameServer.ts` — `creatorMayStartPrivateLobby(timeoutMs)`.
- `src/server/Worker.ts` — `PRIVATE_LOBBY_START_CITIZEN_WAIT_MS = 5000`; `start_game` 403 gate.
- `src/server/Client.ts` — `isCitizen` comment now names this one owner-accepted permission.
- `ai-agents/knowledge-base/analytics-event-reference.md` — *Locked Feature Events* section; the
  `private_lobbies` flag under *Experiment Events*.
- Tests extended: `tests/client/FlashistFacade.test.ts`, `tests/client/CitizenshipCard.test.ts`,
  `tests/client/components/Button.test.ts`, `tests/client/LangSelectorRerender.test.ts`,
  `tests/client/HostLobbyModalUrl.test.ts`.

## Decision log (calls made without asking)

1. **Network error on Start also shows the generic line.** The plan says "on any non-OK response". A
   `fetch` that throws is not a response, but after moving `close()` behind success it would otherwise
   leave the modal open with **no** message — worse than before. Obvious winner within the plan's intent
   (Q1: refused start → generic error, host stays in the lobby). `startGame()` now returns
   `Response | null`.
2. **`CitizensOnlyModal.show()` awaits `isCitizenshipSurfacesEnabled()`** rather than reading the sync
   snapshot. Plan: "does nothing while citizenship surfaces are off". The sync snapshot can still be
   `false` early on a deadline/degraded boot (FlashistFacade comment), which would wrongly suppress the
   popup for a player whose row is visible. The async read is the same one the row itself uses, so row and
   popup always agree. Mechanical, in-plan.
3. **A locked button keeps its lock and the "citizens only" subtitle instead of any other subtitle.**
   `OButton` had an optional subtitle; when `locked` it shows `locked_feature.citizens_only` in its place.
   The Create button has no subtitle today, so nothing visible is lost.
4. **Create stays locked by the click router even when the row was never shown** (status not `citizen`).
   Fail closed; unreachable in normal use because the row is hidden.
5. **Popup copy** (not worded in the plan): en *"Citizens only"* / *"This feature is available only to
   citizens of Geoconflict."* / *"Close"*; ru *"Только для граждан"* / *"Эта возможность доступна только
   гражданам Geoconflict."* / *"Закрыть"*. Generic on purpose: `onLockedFeatureTap` is shared by later
   perks, and 0301 replaces the popup. Owner may reword.
6. **`startGame()` calls `requestUpdate()` after clearing the error line**, the codebase convention (the
   decorator transform does not reliably schedule updates under the test build).
7. **Prettier** was run only on files that were Prettier-clean at `HEAD` plus the new files.
   `LangSelector.ts` and `tests/client/components/Button.test.ts` were already unformatted at `HEAD`; they
   were not reformatted (would be unrelated churn). The 0302 additions in them match Prettier.

No review fixes applied (build step only; no review has run yet).

### Review round 1 — fixes applied without per-fix owner approval (Process-review worker, 2026-09-27)
Spawned `fkit-coder` Process-review worker under `/fkit-sprint-ship-loop`, on the approved plan plus the
owner's live rulings on this round (2026-09-27, relayed by fkit-lead): R1 "Drop the name", R2 "Dev-only
bypass", R4 "Fix in 0302". R3 and R5 handled under the method. Ledger: `review.md` § *Coder response*.

8. **R1 — popup copy no longer names the game.** Changed `citizens_only_modal.body` in `en.json` and
   `ru.json` to the owner's exact wording ("This feature is available only to citizens." / "Эта
   возможность доступна только гражданам."); this supersedes the body text in item 5. Test added in
   `PrivateLobbyLang.test.ts`. **Qualified:** owner ruling on this exact point; verified `CORRECT`;
   two-string, localized change.
9. **R2 — dev-only bypass.** Client: `PrivateLobbyAccess.isCreateLocked()` returns false when the
   build-time `process.env.GAME_ENV === "dev"` (the value `checkExperimentFlag` already uses; webpack sets
   it to "prod" in production mode). Server: `creatorMayStartPrivateLobby` returns true when the new
   exported `isPrivateLobbyCitizenGateBypassed(this.config.env())` is true, which is only for
   `GameEnv.Dev`. No new env var. Tests: every gate case now runs under both the prod and the preprod
   config; a dev-bypass case; the real `getServerConfig("prod"/"staging"/"dev")`; the client dev/prod/
   staging/unset cases; the Dockerfile → `build-prod` → `--mode production` → "prod" chain. **Qualified:**
   owner ruling on this exact point, including the mechanism ("use the existing `GAME_ENV`/config
   mechanism"); verified `CORRECT`. ⚠️ Known property of that existing mechanism, not changed here: a
   server started with `GAME_ENV` **unset** falls back to the dev config (`getServerConfigFromServer`,
   `?? "dev"`) and so would skip the gate. `deploy.sh` always writes `GAME_ENV=${ENV}`, and a server on the
   dev config would be wrong in many other ways too.
10. **R3 — double-tap guard + a missing-game answer.** `HostLobbyModal`: new `isStarting` state;
    `startGame()` ignores a tap while a start is in flight and resets in `finally`; Start is disabled
    meanwhile. `Worker.ts` `start_game`: a missing game now answers `404 { error: "Game not found" }`
    (it sent nothing before), matching the sibling routes, so the modal shows its generic line. Test: a
    double tap sends one start and one interstitial. **Qualified:** verified `CORRECT`;
    mechanical/localized; inside the plan's Step 7 intent (a failed start is visible, the host stays in
    the lobby). The 404 is the obvious winner within that intent: the only caller is the host modal,
    which reads only `response.ok`.
11. **R4 — a failed or throwing settings save no longer starts.** `startGame()`'s body moved to
    `attemptStart()`; `putGameConfig()` and `getServerConfigFromClient()` now sit in the same try as the
    start fetch. A non-OK save or any throw shows `host_modal.start_failed` and returns without calling
    `start_game`. `showInterstitial()` stays outside the try (an ad failure is not a settings failure;
    blocking on it would be new behaviour nobody ruled on). Tests: non-OK PUT, throwing PUT, throwing
    server-config read. **Qualified:** owner ruling on this exact point ("Fix in 0302"); verified
    `CORRECT`; localized to `startGame()`.
12. **R5 — test against the real templates.** `PrivateLobbyAccess.test.ts` now parses `index.html` and
    `yandex-games_iframe.html`: the row exists, is hidden, holds Create and Join; one Create button,
    inside the row; one `<citizens-only-modal>`. **Qualified:** verified `CORRECT`; test-only; in-plan
    (the plan's template edits).

13. **R2 hardened — the server bypass needs `GAME_ENV` explicitly `"dev"`.** Owner ruling 2026-09-27
    "Harden it (Recommended)", on the residual flagged in item 9. `isPrivateLobbyCitizenGateBypassed` now
    takes `(env, gameEnvSetting)` and is true only for the dev config **and** `gameEnvSetting === "dev"`;
    `creatorMayStartPrivateLobby` passes `process.env.GAME_ENV`. An unset `GAME_ENV` still selects the dev
    config (unchanged fallback), but the citizen check now stays ON. Client checked: already strict
    (`process.env.GAME_ENV === "dev"`; the webpack define always sets "dev" or "prod"), no change; its
    unset case was already tested. Tests: the unset-`GAME_ENV` fallback dev config refuses a non-citizen
    and still admits a citizen; the helper's truth table; the real `getServerConfigFromServer()` chain
    for dev / unset / prod / staging. **Qualified:** owner ruling on this exact point; verified; one
    function and its one call site. This resolves item 9's ⚠️ caveat.

No other obvious-winner call was made this round.

### Review round 2 — fixes applied without per-fix owner approval (Process-review worker, 2026-09-27)
Same spawn marker and approved plan. Owner rulings on this round (2026-09-27, relayed by fkit-lead):
R6 + R7 "Fix both in 0302 (Recommended)"; the reviewer's owner question on the dev server → "Accept: dev
server is internal (Recommended)", recorded in `review.md` § *Accepted residuals* ("Dev-deployed server
skips the private-lobby citizen check").

14. **R6 — the max-timer field matches the schema.** `HostLobbyModal`: the `#end-timer-value` input's
    `min` changed from 0 to 1. `handleMaxTimerValueChanges` rejects `value < 1` (was `< 0`), matching
    `maxTimerValue: z.number().int().min(1).max(120)` in `Schemas.ts`. A typed 0 keeps the last valid
    value and sends no save, so the R4 path can no longer stop Start on a 400. **Qualified:** owner
    ruling on this exact point; verified `CORRECT`; two-line, localized.
15. **R7 — `open()` resets a hanging Start.** `open()` sets `isStarting = false` (+ `requestUpdate()`, the
    codebase convention; see item 6), per the ruling. **Obvious-winner addition within the ruling's
    intent:** a private `openGeneration` counter, bumped in `open()`. Without it, the reset alone lets a
    stale Start whose ad answers late read the NEW `lobbyId`, save settings for it and start the new
    lobby with no tap — worse than R7. The stale attempt now stops right after the ad if the
    generation changed, and its `finally` clears `isStarting` only for its own generation (else it
    would reopen the double-tap hole in the new opening). The awaits after the ad are bounded network
    calls and are not re-checked. **Qualified:** the ruled fix is verified `CORRECT`; the guard is the
    only way to make that fix safe, has no competing option, stays in the one file the ruling named,
    and changes nothing when the modal is not reopened mid-start.

### Review round 3 (Process-review worker, 2026-09-27)
16. **R8 — accepted as a known gap, no code change.** The reviewer found the `openGeneration` guard
    checks only after the ad: a close + reopen during the old Start's network phase lets it close the new
    modal, show the error line on it, or start the new lobby with no tap. Verified `CORRECT` (one check,
    in `attemptStart()` right after the ad). Owner ruling 2026-09-27 "Accept as known (Recommended)",
    relayed by fkit-lead. Recorded in `review.md` § *Accepted residuals* ("Stale Start can act on a
    reopened host modal"); R8's *Coder response* Status is `won't fix (frontier)`, the skill's slot for an
    owner-accepted residual. No fix applied, no obvious-winner call. No source or test change, so no test
    run this round.

## Evidence
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- `npm test` — **156 suites, 2373 tests, all passed**, first run (no flake, no re-run). Shell harnesses
  ran as part of it; none reported skipped.

### Review round 1 evidence (2026-09-27)
- Related suites (11: HostLobbyModalUrl, PrivateLobbyAccess, PrivateLobbyLang, PrivateLobbyStartGate,
  CitizensOnlyModal, CitizenshipStatus, FlashistFacade, CitizenshipCard, CitizenFlag, Button,
  LangSelectorRerender) — 221 tests, all passed.
- `npx tsc --noEmit` — exit 0. `npm run lint` (`eslint`) — exit 0. Prettier check on the touched files — clean.
- `npm test` — **156 suites, 2409 tests, all passed**, first run (no flake, no re-run); no harness
  reported skipped.

- After item 13 (R2 hardening): related suites (PrivateLobbyStartGate, CitizenFlag, PrivateLobbyAccess,
  HostLobbyModalUrl, PrivateLobbyLang) — 89 tests passed; `npx tsc --noEmit` exit 0; `eslint` exit 0;
  `npm test` — **156 suites, 2412 tests, all passed**, first run (no flake, no re-run), no harness skipped.

- Round 2 (R6, R7): 6 related suites (HostLobbyModalUrl, PrivateLobbyAccess, PrivateLobbyStartGate,
  PrivateLobbyLang, CitizensOnlyModal, Button) — 101 tests passed; `npx tsc --noEmit` exit 0; `eslint`
  exit 0. `npm test` first run: **1 failure** — `tests/profile-server/SessionRoutes.test.ts`
  "an unknown legacy id → the same 401…", `Exceeded timeout of 5000 ms`: the known supertest flake
  (timeout shape; a suite 0302 does not touch; no `SIGSEGV` in the log, no `node-*.ips` crash report).
  **Re-ran:** that suite alone passed (102 tests), and a second full `npm test` passed — **156 suites,
  2419 tests**, no harness skipped.

## Not verified
- **Local citizen path (a real citizen creating and starting a private match) was NOT run.** It needs a
  local profile server with a citizen row **and** a Yandex identity; the standalone dev page has no Yandex
  SDK, so the creator is always a guest there and the server refuses the start. Faking an identity to
  make it pass would prove nothing. Covered by unit tests only (`PrivateLobbyStartGate.test.ts`,
  `PrivateLobbyAccess.test.ts`).
- No browser check of the row, the lock look or the popup.
- Every live Yandex item in the plan: the console client-feature condition, the tester marker inside the
  Yandex iframe, clipboard "copy link" inside the iframe, the in-portal join, a real purchase unlocking the
  button live.
- ~~⚠️ **Local dev consequence (expected by the plan):** in dev all flags are on, so the row shows, but
  Create is locked (no citizen) and the server refuses every private start without a citizen creator.~~
  **Resolved by review R2** (dev-only bypass, owner ruling 2026-09-27): in a dev build Create is not
  locked and the dev server config skips the citizen check. The host-modal flow in a real browser is
  still **not run** after this change — unit tests only.
