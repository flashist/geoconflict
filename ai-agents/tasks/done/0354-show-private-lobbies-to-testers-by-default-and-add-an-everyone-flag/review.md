# Review — 0354

Task: ai-agents/tasks/done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md
File(s) under review: src/client/flashist/FlashistFacade.ts, src/client/PrivateLobbyAccess.ts, src/client/Main.ts, src/client/index.html, src/client/yandex-games_iframe.html, tests/client/FlashistFacade.test.ts, tests/client/PrivateLobbyAccess.test.ts, ai-agents/knowledge-base/analytics-event-reference.md, worklog.md (uncommitted working tree on `dev` vs `HEAD`)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned an explicit "no significant issues found"; it tried `npm test` and `npx jest` on the two suites but both died on read-only-sandbox `EPERM` writes before any test ran, so it measured nothing. The reviewer's own leg ran `npx jest tests/client/PrivateLobbyAccess.test.ts tests/client/FlashistFacade.test.ts` → 2 suites, 69/69 passed.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | tests/client/PrivateLobbyAccess.test.ts:169 | Test gap, not a behaviour defect (optional). The only fail-closed test makes the everyone-flag read throw; nothing makes the now-first read, `isCitizenshipSurfacesEnabled()` (`src/client/PrivateLobbyAccess.ts:61`), throw. Behaviour is correct today: the same `catch` in `start()` covers both. Before this change the throw test hit the first operand of the `&&`; now it hits the last. A one-line case would keep "first read throws → hidden" pinned. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT — verified: `start()` reads `isCitizenshipSurfacesEnabled()` first (`src/client/PrivateLobbyAccess.ts:61`), and the only fail-closed test (`tests/client/PrivateLobbyAccess.test.ts:169`, "stays hidden when the everyone-flag read throws") rejects the last read. At `HEAD` the throw test rejected `isPrivateLobbiesEnabled()`, then the first operand — so "first read throws → hidden" was pinned before this change and is not now. Behaviour is correct (one `try/catch` covers both reads). Coder severity: **low** — test-coverage gap, no runtime effect. | Defect (small test-coverage regression introduced by this change; not a frontier-move). Regression check: adds one test, changes no source and no existing test — recreates nothing a prior finding flagged (no prior rows). | Added one test in `tests/client/PrivateLobbyAccess.test.ts`, right after the everyone-flag throw test: `isCitizenshipSurfacesEnabled` rejects, tester marker = true, everyone-flag = true (from `beforeEach`) → row `display: none` and `isVisible()` false. Mutation-checked: swallowing that rejection as `true` in source makes it fail (source restored, hash identical). Targeted 70/70; lint, prettier, `tsc --noEmit` exit 0; full `npm test` 188/188 suites, 3467/3467 on re-run (first run: 1 failure in `tests/profile-server/NameChangeRoutes.test.ts`, a supertest suite; passed alone and on the full re-run — see worklog). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
