# Review — 0374

Task: ai-agents/tasks/done/0374-lobby-windows-end-their-joining-mark-on-close-not-only-when-the-request-settles/brief.md
File(s) under review: src/client/HostLobbyModal.ts (0374 hunks only: `joiningMarkEnds`, `beginJoiningMark` / `endJoiningMarks`, the `open()` swap, the `reset()` call, comments) · src/client/JoinPrivateLobbyModal.ts (same pattern, `joinLobby()` swap) · tests/client/HostLobbyOpen.test.ts (H3 flipped, H5–H8, `expectJoiningCountIsZero`) · tests/client/JoinPrivateLobbyModalLeave.test.ts (J4 flipped, J6a, J6b, J7–J9, same helper) · worklog.md. Out of scope: the 0353 / 0354 / 0377 / 0380 hunks in the same files (`copyToClipboard`, `copyFailed`, invite hint, `pollPlayers`, `this.clients = []`, the `jose` mock).
Status: closed-out
Coverage: reasoning-only second opinion — Codex ran (`codex-cli 0.157.1`, exit 0, `model_reasoning_effort=medium`, first capped attempt, no stall) and gave a usable findings list, but executed only source reads (`rg`, `git diff`, `nl`) and ran no tests; the execution evidence is the reviewer's own (both test files 36/36, eslint clean, 3 mutation runs in a scratch copy).

## Reviewer findings

Round 1 — **no confirmed findings.** Nothing to record as a row.

Disproven this round (listed so they are not re-raised; the coder need not chase them):
- **Codex X1 / X2 (medium, "edge")** — "`disconnectedCallback()` does not end the marks, so a removed modal with a hanging request keeps the count above zero forever." **INCORRECT (disproven).** Both elements are static in both HTML templates (`src/client/index.html:317-318`, `src/client/yandex-games_iframe.html:447-448`) and nothing in `src/client/` removes them (the only `.remove()` on a modal is the error modal in `ClientGameRunner.ts:1382`). The brief's list of closes is ✕ / click-outside / Escape / programmatic — element removal is not one. Even if removal happened, the settle path still ends the mark, exactly as before 0374 — so not "forever" and not a regression.

Builder's decision-log calls (worklog.md § "Decision log"), judged:
- **H7 split into two waiters — endorsed.** The plan's single-waiter wording ("still pending because of the second opening's mark") conflicts with brief step 5 ("the first mark ends at the first close"); the split asserts both halves. Mutation-checked: making the late settle end *all* marks (`.finally(() => this.endJoiningMarks())`) fails H7 only.
- **`expectJoiningCountIsZero` probe — endorsed.** A fresh waiter cannot see a count of −1 (`joinsBeingSetUp > 0` is false there too); taking one probe mark and expecting the waiter to stay pending does detect it. Tests reset presence state in `beforeEach`/`afterEach`, so a failed probe cannot leak into other tests.

| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)
