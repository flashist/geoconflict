# Review — 0454

Task: ai-agents/tasks/done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md
File(s) under review: src/client/JoinPrivateLobbyModal.ts, tests/client/JoinPrivateLobbyAnalytics.test.ts, tests/client/JoinPrivateLobbyModalLeave.test.ts, tests/client/JoinPrivateLobbyModalPaste.test.ts, ai-agents/knowledge-base/analytics-event-reference.md (edited sentences only) — working tree vs HEAD
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (codex-cli 0.157.1, exit 0) and returned a diff-grounded "no significant issues found", but executed only source-text inspection (git diff, git diff --check, nl/rg), no tests; the reviewer's own leg measured (targeted run of the three Join suites, 64/64 passed; eslint clean on the four files).

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low | ai-agents/knowledge-base/analytics-event-reference.md:493 (`PRIVATE_LOBBY_JOIN_FAILED_NOT_FOUND` row) | The row this task edited still says "the archive step after it did not open a replay (whether the archive then answered 404, an HTTP error, or the site's HTML page — the last is what production answers today, archiving being off, ADR-104)". After 0454 production makes no archive request at all (src/client/JoinPrivateLobbyModal.ts:368), and the funnel note below now says "While archiving is off (ADR-104) there is no archive step at all" — the doc contradicts itself. Fix only the factual "what production answers today" clause; the trigger definition (worker `exists:false` decides NotFound) does not move. |
| R2 | 1 | low | tests/client/JoinPrivateLobbyModalLeave.test.ts:235 (f2) and :269 (f3) | (f2) can now pass for the wrong reason: it never asserts the archive request was made. If the one-shot `archiveEnabled: () => true` mock were not consumed, the gate would show the error line before the close, and `close()` clears `this.message` (src/client/JoinPrivateLobbyModal.ts:247), so "no late message" still holds. Before 0454 the archive was always reached, so this hole is new. (f3) closes while `/exists` is pending, so it returns at `isClosedSince` before the gate; its "asks no archive" check would also pass on HEAD, so it guards the close, not the gate. Gate coverage itself is real elsewhere (Analytics "a wrong code with archiving off … asks no archive"); this is test strength only. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT (sev: low — doc only; no code, no count moves) | Defect (stale fact) | `analytics-event-reference.md`, `PRIVATE_LOBBY_JOIN_FAILED_NOT_FOUND` row: dropped "the site's HTML page — the last is what production answers today, archiving being off"; the archive-answer list now reads "404, an HTTP error, or a page that is not JSON", followed by "While archiving is off (ADR-104) there is no archive step, so production decides on the worker's answer alone (task 0454; before it, the archive was asked and answered the site's HTML page)." Trigger (worker `exists:false`, or archive 404) unchanged. Verified against `src/client/JoinPrivateLobbyModal.ts:368` (gate returns before `checkArchivedGame`). | ✅ done |
| R2 | CORRECT (sev: low — test strength; the gate is covered in the Analytics suite) | Defect (test can pass for the wrong reason) | (f2): added an assertion right after the close that exactly one `/api/game/<code>` request was made, so the test proves it ran the archive path. Negative check: with the gate forced on in the source (`true \|\| !config.archiveEnabled()`), the old (f2) **passed** and the new (f2) **fails**; source restored, `cmp`-identical. (f3): no assertion change; renamed and commented to say it guards the close (returns at `isClosedSince` before the gate) and that the gate is tested in `JoinPrivateLobbyAnalytics.test.ts`. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
