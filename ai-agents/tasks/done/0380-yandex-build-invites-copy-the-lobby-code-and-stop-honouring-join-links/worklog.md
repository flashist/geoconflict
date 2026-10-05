# Worklog — 0380

## 2026-10-04 — Build (fkit-coder, Build worker spawned by `fkit-sprint-ship-loop`)

Implemented the approved `plan.md` (blob `78c6745e…`, checked unaltered before starting) with the owner's
answers: **Q1 keep today** (code shown unless the player turned on "Hidden lobby IDs"), **Q2 point to the
eye button** (a hidden code is never revealed automatically). Q3 (friendlier code) not touched — separate task.
Built on top of `0354`'s uncommitted changes; none of them reverted. Nothing committed.

### What changed
- **New `src/client/PrivateLobbyInvite.ts`** — `inviteCopyText()` (Yandex: bare code; standalone: today's
  `${windowOrigin}#join=<id>`, exact) and `lobbyIdFromJoinHash()` (Yandex: always `null`; standalone:
  today's `substring(6)` + `ID.safeParse`).
- **`FlashistFacade.copyText(text): Promise<boolean>`** — SDK `clipboard.writeText` first, called before
  the first `await` and wrapped in `Promise.resolve` (also catches a synchronous throw); falls back to
  `navigator.clipboard.writeText`; `false` if both fail; never throws. Logs which path copied.
- **`HostLobbyModal`** — `copyToClipboard()` calls `copyText(inviteCopyText(...))` as its first action;
  ✓ tick on success; new `copyFailed` state shows a red line under the code box on failure
  (`copy_failed_hidden` when masked, `copy_failed` when visible); `reset()` clears it; `lobbyIdVisible`
  is never touched by copying. Yandex-only hint line (`invite_code_hint`) under the code box.
- **`Main.handleHash()`** — `#join=` branch uses `lobbyIdFromJoinHash(decodedHash,
  FlashistFacade.instance.yaGamesAvailable)`. `strip()`, other branches, `location.search` unchanged.
  Unused `ID` import removed.
- **Localization** — `host_modal.invite_code_hint`, `host_modal.copy_failed`, `host_modal.copy_failed_hidden`
  in both `en.json` and `ru.json`.
- **Tests** — new `tests/client/PrivateLobbyInvite.test.ts`; `copyText` suite in
  `tests/client/FlashistFacade.test.ts`; 0380 suite in `tests/client/HostLobbyModalUrl.test.ts`
  (bare code on Yandex, synchronous call, hidden stays hidden, both failure wordings, failure cleared by
  a later success, hint Yandex-only, standalone link unchanged). The existing 0198 link test is unchanged
  (its facade mock gained a `copyText` that delegates to `navigator.clipboard`). `jose` stubbed in
  `HostLobbyModalUrl`, `HostLobbyModalLeave`, `HostLobbyOpen` tests (see decision log).

### Verification (plan step 8)
- `npm test`: **189/189 suites, 3490/3490 tests passed**, exit 0. First full run had 2 suites fail to load
  (`HostLobbyModalLeave`, `HostLobbyOpen`: `TextEncoder is not defined`) — caused by this change, fixed
  (decision 3), then re-ran in full. No supertest flake seen, no SIGSEGV.
- `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0. Prettier clean on all touched files.
- `git diff -- src/core src/server`: empty. No diff line and no line in the new file mentions
  `location.search`; no `strip()` line changed.

### Not verified
- Whether the SDK clipboard or the native fallback actually copies inside the Yandex iframe, and whether
  the native fallback still works after an awaited SDK rejection — only the live check (`0381`) can tell.
- `Main.handleHash()` itself is not unit-tested (its `Client` class is not exported); the decision logic
  it now delegates to is (`lobbyIdFromJoinHash`), per the plan.

### Decision log (calls made without asking)
1. **Two failure strings, not one** (`copy_failed` + `copy_failed_hidden`). Plan step 6 names one key
   "wording per Q2"; the owner's Q2 answer has two wordings (hidden vs. visible). Obvious winner within
   the ruling's intent; the line re-renders with the eye toggle.
2. **Explicit `this.requestUpdate()`** after setting `copySuccess`/`copyFailed`. Matches the surrounding
   code (`showStartFailed()`, `reset()`, the eye toggle all call it); without it the jest render did not
   update. Mechanical, in-plan.
3. **`jest.mock("jose", …)` in three HostLobbyModal test files.** `HostLobbyModal` now imports
   `PrivateLobbyInvite`, whose `ID` check pulls in `core/Schemas` → `jose`, which needs a `TextEncoder`
   jsdom lacks. Test-environment only (the browser has `TextEncoder`; `Schemas` is already in the client
   bundle). Same stub as `JoinPrivateLobbyModalLeave.test.ts` / `UsernameInput.test.ts`. Mechanical.
4. **Wording:** EN hint "Send this code to a friend — they enter it under “Join Lobby”."; RU hint is the
   plan's draft; "Join Lobby" / «Присоединиться к лобби» match the start-screen button (`main.join_lobby`).
   Failure lines follow the owner's Q2 wording; RU translations are mine.

## 2026-10-04 — Process review, round 1 (fkit-coder, Process-review worker spawned by `fkit-sprint-ship-loop`)

Ran `fkit-process-stateful-review` on `review.md` (R1–R4) under the approved plan (blob `78c6745e…`,
checked unaltered). R3 and R4 dispositions are owner rulings relayed by the driver (2026-10-04). Ledger set
to **Status: closed-out**. Nothing committed; no brief, board, plan or wiki file touched.

### Verification
- `npx jest` on `HostLobbyModalUrl` (R1 cases) and `PrivateLobbyInvite` (R2 guard): pass. Both mutation-
  checked: with the R1 guard removed, both R1 cases fail; with Main's old inline `ID.safeParse` put back,
  2 of the 3 R2 tests fail. Source restored after each check.
- `npm run lint`, `npx tsc --noEmit`, prettier on touched files: all exit 0.
- `npm test`, first full run: **1 failure** — `tests/profile-server/PaymentsRoutes.test.ts` › "payments
  routes carry CORS headers and answer OPTIONS preflight", `socket hang up`. Not touched by this task. No
  `SIGSEGV`; newest `node-*.ips` dated 2026-10-01. Read as the known supertest flake family (CLAUDE.md:
  `socket hang up` seen, never traced — *likely*, not certain). **Re-ran**: 189/189 suites, 3495/3495 tests,
  exit 0.
- `git diff -- src/core src/server`: empty.

### Decision log (calls made without asking)
1. **R1 — `openGeneration` guard in `copyToClipboard()`.** Finding R1 (a copy settling after close/reopen
   puts its ✓ or failure line on the next opening). Changed: snapshot `openGeneration` before the copy,
   return if it changed after the await; the 2 s tick-clear timer checks it too. Tests added in
   `HostLobbyModalUrl.test.ts`. Qualified: verified `CORRECT` (reset()/open() both bump the counter; nothing
   checked it after the await), mechanical/localized (one method, the file's own create/start pattern), in
   plan (step 3: `copyFailed` belongs to the current opening; `reset()` clears it). Copy order unchanged —
   `copyText()` is still the first call, nothing awaited before it.
2. **R2 — source-text guard on `Main.handleHash()`'s `#join=` branch.** Finding R2 (the Yandex gate's
   wiring has no test). Changed: test-only, in `PrivateLobbyInvite.test.ts`; no source change, no `Client`
   export. Qualified: verified `CORRECT`; obvious winner within the plan's intent (plan step 1 tests the
   logic without `Main` because `Client` is not exported; brief verification step 2 asks for the wiring) —
   the only other route, exporting/refactoring `Client`, is out of plan. Precedent: `PrivateLobbyAccess.test.ts`
   and `WinConditionAnalytics.test.ts` read source the same way. Limit, stated in the test: it guards the
   wiring's text, not runtime behaviour.
3. **R4 — RU wording** (owner ruling "Let the coder smooth them"; recorded here because the exact words are
   mine). `invite_code_hint` → «Отправьте этот код другу — пусть он нажмёт «Присоединиться к лобби» и введёт
   его.»; `copy_failed_hidden` → «Не удалось скопировать. Нажмите на значок глаза, чтобы показать код, и
   скопируйте его вручную.»; `copy_failed` unchanged. Meaning of the Q2 ruling kept (point to the eye button;
   never reveal automatically); button name still equals `main.join_lobby`.
- R3: no code change — owner ruling "Accept for now", recorded as an accepted residual in `review.md`.
