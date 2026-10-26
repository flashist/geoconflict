# 0507 worklog

## 2026-10-26 — Build (fkit-coder, spawned Build worker)

Spawned by `fkit-lead` (driving `/fkit-sprint-ship-loop`, Sprint 9) under the ADR-055 declared-approval marker:
the approved plan is `plan.md` in this folder (owner approved it 2026-10-26 via AskUserQuestion in the lead session,
together with ND-1 (a) "Accept, build it", ND-2 (a) flags only, ND-3 (a) one fixed message, ND-4 "Yes, both work").
Nothing committed or pushed.

### What was built (per `plan.md`)
- `src/client/flashist/FlashistFacade.ts`: flag name `PLAYER_MESSAGE_TARGETS_FLAG_NAME = "player_message_targets"`;
  `getPlayerMessageTargetsFlagValue()` (raw string or undefined; no dev-mode shortcut); `EXPERIMENT_FLAGS_NOT_LOGGED`
  so `logExperimentEvents()` never sends the names as `Experiment:*`; 4 `PlayerMessage:*` events.
- `src/client/PlayerMessage.ts` (new): `parsePlayerMessageTargets`, `isPlayerMessageTarget` (exact, case-sensitive,
  trimmed), `startPlayerMessage(deps)`.
- `src/client/PlayerMessageModal.ts` (new): `<player-message-modal>`, text + Telegram/VK links (new tab) + Close.
- `src/client/Main.ts`: import + `void startPlayerMessage()` after `client.initialize()`.
- `src/client/PreStartModals.ts`: `player-message-modal` in the close list.
- Both templates: `<player-message-modal>` after `<tenure-grant-modal>`.
- `resources/lang/en.json` / `ru.json`: `player_message.{contact_us_text,telegram_button,vk_button}`;
  `contact_us_text` is the owner-approved draft text, verbatim.
- `ai-agents/knowledge-base/analytics-event-reference.md`: Player Message Events table; excluded-flag note.
- Tests: new `tests/client/PlayerMessage.test.ts`, new `tests/client/PlayerMessageModal.test.ts`, extended
  `tests/client/FlashistFacade.test.ts`. `tests/client/PreStartModals.test.ts` does not pin the tag list, so it is
  unchanged (per plan).

### Decision log (obvious-winner calls inside the plan's intent)
1. **Close button reuses `common.close`.** The plan said "reuse an existing shared close key if one exists under a
   common namespace; otherwise add `player_message.close`". `common.close` exists in both en ("Close") and ru
   ("Закрыть"), so no new key. Qualifies: the plan named this exact branch.
2. **The approved text was located in the lead session's record, not on disk.** `plan.md` says "the ruled en/ru text,
   verbatim" without quoting it; the only draft (one en, one ru variant, no edits) is the earlier planning return in
   the lead session, which the marker says the owner approved ("draft en/ru text approved"). Used verbatim. The key is
   `player_message.contact_us_text` (the current plan's name), not the earlier draft's `player_message.contact_us`.
3. **ru button wording** "Написать нам в Telegram" / "Написать нам в VK" — the ru equivalents the plan left to the
   coder ("with ru equivalents").
4. **A link tap does not close the popup.** The plan only says a tap logs its event; keeping it open lets the player
   use the other link. The `GameStartingModal` links behave the same way.
5. **`close()` (pre-start list) does not log `PlayerMessage:Closed`.** Only the player's own Close tap logs it, so
   the event counts player dismissals. Documented in the analytics reference.
6. **`showPopup` returning false (element missing) logs nothing.** Mirrors `LongSessionRefresh.ts`; no new event.

No review fixes were applied (Build role, no review round yet): **none**.

### Checks
- Targeted (`PlayerMessage`, `PlayerMessageModal`, `FlashistFacade`, `PreStartModals`): 4 suites, 147 tests, green.
- `npm run lint`: clean. `npx tsc --noEmit -p tsconfig.json`: clean (the new src and test files are in its file list).
- Full `npm test` run 1: 239/240 suites, 5200/5201 tests. The one failure was `socket hang up` in
  `tests/profile-server/InternalPathCase.test.ts` (a supertest suite this task does not touch). No `SIGSEGV`, no
  `node-*.ips` report, so this is the known supertest flake (likely, not certain). Re-ran it.
- Full `npm test` run 2: 240/240 suites, 5201/5201 tests, green (103 s).
- Skipped: `test:integration` (no database code); any live check (no SDK locally, so the feature is always off;
  the real proof is the owner's verify task after deploy).

Pre-existing, not touched: `prettier --check` fails on both HTML templates at
`HEAD` already; the one-line additions follow the surrounding indentation.
