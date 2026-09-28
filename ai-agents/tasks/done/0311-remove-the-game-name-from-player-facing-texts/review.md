# Review — 0311

Task: ai-agents/tasks/done/0311-remove-the-game-name-from-player-facing-texts/brief.md
File(s) under review: tests/client/NoGameNameInPlayerText.test.ts (new) · resources/lang/en.json, ru.json (3 keys each only) · 29 resources/lang/*.json (`main.title` deleted) · src/client/index.html, src/client/yandex-games_iframe.html (`<title>` only) · resources/manifest.json · tests/client/TenureGrantLang.test.ts
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (codex-cli 0.157.1, exit 0) and gave a usable findings list, but measured nothing about behaviour: it read files and parsed the JSON values; its Jest attempt failed on a read-only-sandbox temp-file EPERM before any test ran. Execution evidence is the Claude reviewer's: the targeted suites run green, plus 12 mutation runs of the guard over a scratch copy of the files.

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1     | low | tests/client/NoGameNameInPlayerText.test.ts:115, :126 | The upstream-name matcher `UPSTREAM_NAME` is applied only to `main.title`. The HTML `<title>` check (:115) and the manifest `name`/`short_name` check (:126) test `GAME_NAME` only. Measured on a scratch copy: `<title>OpenFront</title>` in index.html and `short_name: "OpenFront"` both leave the guard green (9/9). An upstream merge of `index.html` is the realistic way back in, and it is how `ar`/`ko`/`tp` got the upstream name in the first place. The test's own comment says "The page title must carry neither". Raised by both reviewers. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (low — test gap only; today's `<title>` and manifest values carry neither name, so no player-visible defect ships) | Added `expect(…).not.toMatch(UPSTREAM_NAME)` to the `<title>` check (`tests/client/NoGameNameInPlayerText.test.ts:118`) and the manifest `name`/`short_name` check (`:130`); widened the `UPSTREAM_NAME` comment to say where it applies and why not the en/ru walk or news feed (kept upstream credit). En/ru walk and news feed left as they are. Scratch mirror: 4 mutations (`<title>OpenFront</title>` in index.html, `<title>OpenFront (ALPHA)</title>` in the iframe, manifest `short_name` "OpenFront", `name` "OpenFront.io") each fail exactly their one test (1 failed / 8 passed); the pre-fix assertions on the same mutations pass 9/9 (reproduces R1); restored mirror 9/9. Real repo: suite 9/9, eslint + prettier clean, `npm test` 163/163 suites, 2757/2757 tests, first run. Applied under the sprint-ship-loop standing approval (test-only, in-plan guard, obvious winner). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
