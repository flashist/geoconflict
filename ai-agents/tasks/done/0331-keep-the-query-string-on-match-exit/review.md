# Review — 0331

Task: ai-agents/tasks/done/0331-keep-the-query-string-on-match-exit/brief.md
File(s) under review: src/client/flashist/FlashistFacade.ts (`changeHref` branch + `reloadApp()` doc comment); tests/client/PlatformDegradedFacade.test.ts (`describe("match exit keeps the query string (task 0331)")`) — working tree, 2026-09-29
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a diff-grounded "no significant issues found"; it measured nothing (its only behavioural attempt, `npx jest … PlatformDegradedFacade.test.ts`, failed before running with sandbox `EPERM` on the jest haste-map). All execution evidence is the Claude reviewer's: targeted suites run (3 suites / 55 tests pass), and the new tests run against HEAD's `FlashistFacade.ts` in an isolated copy (tests 1–2 fail, 3–5 pass; the `console.error` guard shown to detect jsdom's "Not implemented: navigation").

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

_Round 1 (2026-09-29): no findings from either reviewer. Nothing recorded as a row. Verified this round: the query is appended only inside the `value === this.rootPathname` branch (`FlashistFacade.ts:915-922`), so `Cosmetics.ts:74` (Stripe URL) is unaffected; the 0328 marker still compares the raw `value`; every join/login/purchase/refresh signal is hash-only (`Main.ts:645-737`, `jwt.ts:128-145`, `AccountModal.ts:96-105`) and the hash is still dropped, so `#refresh` cannot loop; no code of ours reads `location.search` at boot (only the vendored SDK copy). Informational, not a finding: in a real browser the new target usually equals the current URL, which is a full load with replace-history handling, not jsdom's in-page jump — the tests check the URL string only, as plan §5 states; the production effect is proven only by the owner's post-release P1 repeat (brief verification 4)._

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

_Round 1 (2026-09-29, fkit-coder as Process-review worker under the fkit-sprint-ship-loop standing approval): **none** — the reviewer recorded zero findings, so there is no row to answer. Loop check: nothing to check against (Accepted residuals empty; no ADR in `ai-agents/knowledge-base/decisions/` covers this change). Confirmed the diff under review matches the header's scope (`FlashistFacade.ts` `changeHref` + `reloadApp()` doc comment, `PlatformDegradedFacade.test.ts` new describe block). The reviewer's informational note (jsdom checks the URL string only; the real-browser effect rests on the owner's post-release P1 repeat, brief verification 4) is not a finding and needs no code change — it is already in plan §5/§6. No code changed. Close-out condition met (no open or blocking finding) → header `Status:` set to `closed-out`. `Coverage:` left as the reviewer wrote it._

## Accepted residuals (shared, do-not-re-litigate)
