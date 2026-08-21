# Worklog — 0049 Degraded-Mode UX

## 2026-08-14 — Live degraded-mode simulation (brief Verification #2)

Run by the sprint-ship-loop VERIFY worker (fkit-coder spawn) under the owner-approved plan
(`plan.md`, §Remaining work item 2; owner ruling 2026-08-14: attempt live sim, carry a
not-live-verified caveat if it can't complete). No source code was changed.

### Procedure

1. Verified ports 3001/9000 free (`lsof`), then `npm run dev` (webpack dev client on :9000,
   game server workers on :3001/:3002). Multiplayer lobby confirmed live during the run
   (public lobby visible in screenshot), so worker 0 was healthy.
2. Drove Chromium via the playwright MCP server against
   `http://localhost:9000/yandex-games_iframe.html` (the template that sets
   `window.flashist_isYandexPlatform = true` inline before the async sdk.js tag — so
   `yaGamesAvailable` is `true` at facade construction regardless of SDK fate).
3. **Degraded run (case c):** `page.route('**://sdk.games.s3.yandex.net/**', abort)` before
   navigation — the sdk.js script tag fires `onerror`, resolving
   `flashist_sdkScriptReadyPromise`; `yandexSdkInit()` finds `YaGames` undefined and returns;
   no SDK, no player object. Waited 9s (past the 5s platform-init deadline), then read facade +
   DOM state in-page.
4. **Normal run (no blocking), same entry**, waited 9s, same state read.
5. **Standalone run (case a):** `http://localhost:9000/index.html` (no
   `flashist_isYandexPlatform`), waited 9s, same state read.

### Results

| Run | yaGamesAvailable | YaGames global | isYandexDegraded() | Card | Subtitle | Login CTA |
|---|---|---|---|---|---|---|
| (c) sdk.js aborted | true | undefined | **true** | visible (not `.hidden`) | **"Couldn't connect — try again later"** (`guest_subtitle_degraded`) | **absent** |
| normal iframe (localhost) | true | undefined | true | visible | "Couldn't connect — try again later" | absent |
| (a) standalone index.html | false | undefined | false | visible | "Log in to save your progress" (plain guest) | absent (per `yaGamesAvailable && !isDegraded` guard) |

Screenshot of the (c) run: `evidence/degraded-mode-case-c.png` — lock icon + degraded subtitle,
no login button, card rendered on the start screen above the Multiplayer/Singleplayer tabs.

### What was and was not demonstrated — honest scope

- **Demonstrated live — case (c), two flavors:** (1) sdk.js request blocked (script-load
  failure), and (2) sdk.js loads with HTTP 200 but the Yandex script itself refuses to
  initialize outside a real Yandex Games frame (console: `SDK initialization outside of
  frame`) so `YaGames` never appears. Both end in `yaGamesAvailable=true` + no player object →
  degraded copy, no CTA. The blocked run is the faithful induced simulation the brief asked
  for; the unblocked localhost run turns out to be a natural second instance of the same
  degraded state.
- **Demonstrated live — case (a):** standalone entry shows the plain guest subtitle, not the
  degraded copy, no CTA. Unaffected, as required by brief Verification #4.
- **NOT demonstrated live — case (b)** (healthy SDK, real logged-out guest, brief
  Verification #3): unreachable from localhost — the Yandex SDK only initializes inside a
  genuine Yandex Games embed. Covered by unit tests only
  (`tests/client/CitizenshipCard.test.ts`, `tests/client/FlashistFacade.test.ts`; 28/28 passed
  at plan time on this working tree). Live confirmation would need a run in the Yandex Games
  draft/dev embed.
- **NOT distinguishable live — the flag-gate bypass** (`isYandexDegraded() ||
  isCitizenshipUiEnabled()`): `checkExperimentFlag` returns `true` unconditionally when
  `GAME_ENV === "dev"` (FlashistFacade.ts:819), so in local dev the card is flag-enabled
  either way. The bypass branch is covered by unit tests only.
- Incidental console 404s on `/flags/*.svg` are the known intentional flags suppression,
  unrelated to this task.

Dev server and browser page were shut down after the run.

### Decision log

- none (no fixes applied, no obvious-winner calls; this session wrote no source code).
