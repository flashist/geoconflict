# Worklog — 0413: join-window paste fix (Part A) + error-window copy button (Part B)

Build step of `fkit-sprint-ship-loop` (Sprint 7), by a spawned `fkit-coder` Build worker, 2026-10-08.
Approved plan: `plan.md` in this folder, blob `5fe65db3152819cbecc832ca449be0e6e5cbebe2`, 16049 bytes — checked
with `git hash-object` / `wc -c` at the start of this build. Not edited.

## Owner answers at the plan gate

Who: the owner. When: 2026-10-08. Channel: live `AskUserQuestion` in the `fkit lead` session, relayed to this
worker in the spawn prompt by `fkit-sprint-ship-loop` (this worker has no owner channel, ADR-021).

| Q | Owner's answer (as relayed) |
|---|---|
| Q1 — option 1 or 2 | **"Option 1 — hide the button + show a hint** when paste is unavailable." |
| Q2 — where the hint goes | **"Small line under the box."** |
| Q3 — hint text | **"Both keys"** — RU `Вставьте ID: Ctrl+V / ⌘V или долгое нажатие` / EN `Paste the ID: Ctrl+V / ⌘V or long-press` |

## What changed

| File | Change |
|---|---|
| `src/client/JoinPrivateLobbyModal.ts` | Module-level session memory `clipboardReadBlocked` + `resetClipboardReadMemoryForTests()`; `clipboardReadAvailable()` (missing `navigator.clipboard`/`readText` → no; `document.permissionsPolicy ?? document.featurePolicy` `.allowsFeature("clipboard-read")` → its answer where the browser has it; a remembered not-allowed failure → no). `@state() pasteUnavailable` worked out in `connectedCallback()` (first render) and in `open()` (with an explicit `requestUpdate()`). When unavailable: no paste button, a `#lobby-id-paste-hint` line under `.lobby-id-box` (Tailwind classes inline, no `styles.css` edit). `pasteFromClipboard()` failure: `console.warn`, `NotAllowedError`/`SecurityError` → remember + hide the button; any failure → show the hint + focus `#lobbyIdInput`; the box is not changed. Success path unchanged (`setLobbyId`). `open(id)` shape unchanged (0382 seam). No "inside Yandex" rule. |
| `src/client/ClientGameRunner.ts` | `FlashistFacade` added to the existing import; the error window's copy button calls `FlashistFacade.instance.copyText(content)` first in the click (nothing awaited before it); text follows the result (`error_modal.copied` / `error_modal.failed_copy`); a defensive `catch` → failed text. `showErrorModal` now `export`ed ("Exported for tests"). |
| `resources/lang/en.json`, `resources/lang/ru.json` | One line each: `private_lobby.paste_hint` with the owner's text. The other uncommitted hunks in these files belong to other tasks and were not touched. |
| `tests/client/JoinPrivateLobbyModalPaste.test.ts` (new) | Plan tests 1–8 (+ a SecurityError case, 4b). |
| `tests/client/ErrorModalCopy.test.ts` (new) | Plan Part B tests 1–5. Mock set copied from `ClientGameRunnerTeardown.test.ts`, plus the `jose` stub other jsdom suites use, plus `FlashistFacade.instance.copyText` in the facade mock. The plan's fallback (a helper) was **not** needed — `ClientGameRunner.ts` loads under jsdom. |
| `screenshots/` (new) | 4 RU screenshots from the local checks below. |

Not touched: `FlashistFacade.ts`, `styles.css`, the HTML templates, `0412`'s files (`StartScreenTabs*`,
`PrivateLobbyAccess.ts`, `main.*` keys, `tests/client/PrivateLobbyLang.test.ts`), `plan.md`, `brief.md`.

## `navigator.clipboard` in `src/client/` after the change (brief §5 / verification step 5)

`grep -rn "navigator.clipboard" src/client/`:

| Hit | Why it stays |
|---|---|
| `JoinPrivateLobbyModal.ts:36` — `typeof navigator.clipboard?.readText` | Part A's capability check; reads nothing. |
| `JoinPrivateLobbyModal.ts:300` — `readText()` | Part A's paste for pages that may read the clipboard (outside Yandex). Only reachable when the button is shown. |
| `FlashistFacade.ts:1990` — `writeText(text)` | `copyText`'s own browser fallback when the Yandex SDK is absent or fails. |
| `FlashistFacade.ts:1991` | A log string, not a call. |

`ClientGameRunner.ts` has **no** direct `navigator.clipboard` call left. No other direct **write** call exists in
`src/client/`, so nothing extra to report to the owner.

## Evidence

### Unit tests (new)
- `tests/client/JoinPrivateLobbyModalPaste.test.ts`: 10/10 pass. `tests/client/ErrorModalCopy.test.ts`: 5/5 pass.
- Neighbours re-run with them: `JoinPrivateLobbyModalLeave.test.ts`, `ClientGameRunnerTeardown.test.ts` — pass.

### Non-vacuity (break → red → restore)
Each source edit below was made on purpose, the suite run, then the file restored from a copy; `cmp` confirmed both
source files byte-identical afterwards (sha1 `468ae63…` / `4e5559f…` before and after).

| Break | Result |
|---|---|
| A. `pasteFromClipboard` catch back to the old silent `console.error` | Paste suite **3 failed** (4, 4b, 5) |
| B. ignore the policy check (`return true`) | Paste suite **1 failed** (3) |
| D. drop the session memory (`clipboardReadBlocked = true` removed) | Paste suite **1 failed** (4 — reopen) |
| C. error window back to `navigator.clipboard.writeText` | Copy suite **4 failed** |
| E. one `await` before `copyText` | Copy suite **1 failed** (1 — synchronous call) |
| F. ignore `copyText`'s result (always "copied") | Copy suite **2 failed** (3, 4) |

### Gates
- `npx tsc --noEmit` → exit 0.
- `npm run lint` → exit 0.
- `npm test` (full, incl. shell harnesses) → **green on the first run, no re-run**: 213 suites / 4285 tests passed,
  255.79 s. No supertest flake, no `SIGSEGV`.

### Local checks (dev server: webpack + game server, `GAME_ENV=dev`, started without `--open`; Playwright Chromium; RU)
1. **Normal page** `localhost:9000/index.html`, clipboard permission granted, clipboard = `K7M4PCRX`:
   `featurePolicy.allowsFeature('clipboard-read')` = `true`; button shown, no hint; press → box reads `K7M4PCRX`, no
   hint. Screenshot `screenshots/1-normal-page-paste-works-ru.png`.
2. **Permission blocked** (CDP `Browser.setPermission` clipboard-read → `denied`; plain `clearPermissions` did **not**
   block in this browser — the read still succeeded, so that attempt was discarded): before the press button shown,
   no hint; after the press → button gone, hint `Вставьте ID: Ctrl+V / ⌘V или долгое нажатие`, focus on
   `lobbyIdInput`, box empty (unchanged); after close + reopen still no button (session memory). Console: exactly one
   `warning: Clipboard read failed, showing the paste hint: NotAllowedError: … Read permission denied.`
   Screenshot `screenshots/2-permission-blocked-after-press-ru.png`.
3. **Cross-origin iframe** (the Yandex condition): a throwaway wrapper page served from `127.0.0.1:8765` (scratch
   folder outside the repo, deleted afterwards) framing `localhost:9000/yandex-games_iframe.html` with no `allow`
   attribute. Inside the frame: `featurePolicy.allowsFeature('clipboard-read')` = **`false`**
   (`permissionsPolicy` not exposed in this Chromium); the join window opened with **no button and the hint**; no
   clipboard console line at all (nothing called `readText`). Screenshot
   `screenshots/3-cross-origin-iframe-policy-blocked-ru.png`.
   ⚠️ Honest note: a control `readText()` evaluated directly in the frame failed with
   `NotAllowedError: … Document is not focused` (a focus failure from scripted evaluation), not a policy message —
   so the control does not by itself prove the policy block; the `allowsFeature` = `false` reading is the evidence.
4. **Error window**: `showErrorModal` reached through webpack's module cache in the dev build
   (`./src/client/ClientGameRunner.ts`), pressed copy → button `Скопировано!`; the clipboard held the window's full
   text; console `FlashistFacade | copyText | copied via navigator.clipboard`. Screenshot
   `screenshots/4-error-window-copied-ru.png`. ⚠️ This exercised the **browser fallback** only — there is no Yandex
   SDK locally, so the SDK copy path is **unverified** until the live check.

Cleanup: Playwright closed; dev server and wrapper server stopped; ports 9000, 3000–3003, 8765 confirmed free; wrapper
folder and backup copies deleted; my Playwright console log removed from the (gitignored) `.playwright-mcp/`.

## Unverified until live (unchanged from the plan)
- That the real Yandex iframe makes `featurePolicy` / `permissionsPolicy` report `clipboard-read` as blocked
  (the local cross-origin frame does). If it does not, the first press fails into the hint and the button hides.
- The SDK copy path in the error window (only the browser fallback ran locally); the Yandex mobile app / webviews.
- These stay for the verify task the plan says is filed at close time (not now).

## Small behaviours worth knowing (inside the plan, no decision taken)
- After a one-off (non-permission) failure the hint stays until the window closes, even if a later press succeeds.
- Safari outside Yandex: dismissing the native "Paste" bubble gives `NotAllowedError` → button hidden for the session
  (plan's edge case, accepted there).

## Decision log (calls made without asking)
1. **`reset()` clears the transient hint (`pasteHintShown = false`).** Answers: the plan says a non-permission failure
   "shows the hint … but keeps the button, because it may be a one-off", and is silent on whether that hint survives
   a close. Changed: one line in `reset()`, beside the existing `this.message = ""`. Why it qualified: obvious winner
   within the plan's intent — a one-off failure should not follow the player into a fresh window, it matches how the
   window already clears its status message on close, and the permission case is unaffected (it is held by the
   session memory, which `open()` re-reads). Pinned by test (5)'s reopen assertions.
2. **`jose` stub added to `ErrorModalCopy.test.ts`.** Answers: the plan said "reuses `ClientGameRunnerTeardown.test.ts`'s
   mock set"; that suite runs under node, and under jsdom the import chain hit `jose`'s missing `TextEncoder`.
   Changed: the same three-line stub `JoinPrivateLobbyModalLeave.test.ts` already uses. Why it qualified: mechanical,
   test-only, inside the plan (it kept the plan's primary route and avoided its fallback).

No review fixes were applied in this step (none exist yet).

### Process review — round 1 (sprint-ship-loop Process-review worker, 2026-10-08)
3. **R1 (test gap: `permissionsPolicy` branch untested) — fix applied without asking.** Answers: review.md R1
   (`setFeaturePolicy` stubs only `featurePolicy`; the `permissionsPolicy ?? featurePolicy` precedence in
   `clipboardReadAvailable()` was never exercised). Changed: `tests/client/JoinPrivateLobbyModalPaste.test.ts`
   only — new cases (3b) permissionsPolicy no / featurePolicy yes → unavailable, and (3c) permissionsPolicy yes /
   featurePolicy no → available; `setPermissionsPolicy` helper, reset in `beforeEach`/`afterEach`. No source change.
   Why it qualified: verified `CORRECT`, mechanical, localized, test-only, inside the approved plan's §Tests (policy
   check coverage). Evidence: suite 12/12 pass; with the `??` operands swapped in source, (3b) and (3c) both fail
   (non-vacuous), source restored byte-exact; `npm run lint` exit 0. No obvious-winner calls this step.

## Verify (independent re-run)
2026-10-08, sprint-ship-loop Verify worker, current working tree (0382 build in progress in parallel). No source touched.

- **0413 suites:** `JoinPrivateLobbyModalPaste`, `ErrorModalCopy`, `JoinPrivateLobbyModalLeave`, `ClientGameRunnerTeardown` → **4/4 suites, 53/53 tests pass.**
- **Other suites that import `JoinPrivateLobbyModal` / `ClientGameRunner`** (grep of `tests/`): `LocalServer`, `client/TransportProfileSession`, `client/HostLobbyOpen`, `server/GameServerParticipation`, `client/HostLobbyModalUrl`, `client/HostLobbyModalLeave`, `client/JoinLobbyReconnectSession` → **7/7 suites, 131/131 tests pass.**
- **`npm run lint`:** exit 0.
- **`npx tsc --noEmit`:** exit 2, **3 errors, all in 0382's in-progress files, none in 0413's**: `src/client/HostLobbyModal.ts` and `tests/client/PrivateLobbyInvite.test.ts` call `inviteCopyText(...)` with 3 args; 0382 has added a 4th parameter (`portalGameUrl`) in `src/client/PrivateLobbyInvite.ts`. Not attributable to 0413.
- **`private_lobby.paste_hint`:** EN `Paste the ID: Ctrl+V / ⌘V or long-press`, RU `Вставьте ID: Ctrl+V / ⌘V или долгое нажатие` — exact match; both JSON files parse; `private_lobby` key sets identical (11/11).
- **`navigator.clipboard` in `src/client`:** none in `ClientGameRunner.ts` (copy now goes through `FlashistFacade.instance.copyText`). Remaining hits: `JoinPrivateLobbyModal.ts` (capability check + gated `readText`, by design per plan) and `FlashistFacade.ts` (the facade's browser fallback).
- Full `npm test` deliberately not re-run (build step ran it; parallel runs inflate the supertest flake).
