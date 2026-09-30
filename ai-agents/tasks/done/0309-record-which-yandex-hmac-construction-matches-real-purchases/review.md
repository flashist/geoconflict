# Review — 0309

Task: ai-agents/tasks/done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md
File(s) under review: src/profile-server/YandexSignature.ts, src/profile-server/Routes.ts, tests/profile-server/YandexSignature.test.ts, tests/profile-server/PaymentsRoutes.test.ts
Status: closed-out
Coverage: reasoning-only second opinion — Codex (`codex-cli 0.157.1`, exit 0) returned a usable "no significant issues found" pass but measured nothing: its one `npx jest` attempt failed with `EPERM` on the jest cache before any test ran. Execution evidence is the Claude reviewer's: the four profile-server payment/login suites ran green (122/122), and an old-vs-new differential run of both verifier functions over 6147 inputs (16 accepted) showed 0 accept/reject or output differences.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | tests/profile-server/PaymentsRoutes.test.ts:10 (used by the leak guard at :531) | The logger mock turns every argument into `String(arg)`, so a secret passed as a winston meta object (`log.info("…", { signature })`) is recorded as `[object Object]` and the leak guard still passes — yet the real profile logger (`winston.format.json()`) would print that field. No such call exists today (the new lines interpolate only the fixed label), so nothing leaks now; the gap is that the guard, meant to protect later edits (0310 is next in this code), cannot see this leak shape. Measured: a mock-equivalent recorder given `{ signature: "<synthetic>" }` produced a line without the value. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (test gap; severity low — test-only blind spot, nothing logs a meta object today, no production effect) | Verified: mock records `String(arg)` (`tests/profile-server/PaymentsRoutes.test.ts:15-16`, old `:10`); real `src/profile-server/Logger.ts` uses `winston.format.json()`, which prints meta fields. Took the reviewer's second option: the mock now also keeps each call's raw arguments (`logCalls`, `:10`, `:15`, reset `:459`), and the leak guard asserts every call is exactly one string (`:568`). Chosen over `JSON.stringify` because JSON escaping would still hide the decoded-JSON forbidden value (its quotes become `\"`). Mutation proof: a throwaway `{ signature: parsed.data.signature }` meta arg on the `/complete` log line PASSED the old guard and FAILED the new one; `Routes.ts` restored from a backup, sha1 identical to before. Re-run: 3 §5 suites 92/92, lint exit 0, `tsc --noEmit` exit 0 / 0 lines, prettier clean. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
