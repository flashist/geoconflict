# Review — 0340

Task: ai-agents/tasks/done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md
File(s) under review: src/profile-server/Routes.ts (behaviour); comments only in src/profile-server/{SessionToken,LoginVerification,PublicProjection,Telemetry}.ts, src/core/profile/{LoginContract,PlayerProfile,InboxContract,NameChangeContract,PaymentsContract}.ts, src/client/ProfileSession.ts; tests tests/profile-server/{LoginVerificationRoutes,CallerFromSession,SessionRoutes,TenureGrantRoutes}.test.ts, tests/profile-server/support/sessionToken.ts, tests/integration/Login.it.test.ts — uncommitted working tree vs HEAD (`dev`, 6eef01f)
Status: closed-out
Coverage: reasoning-only second opinion — Round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a diff-grounded "no significant issues found"; its one test run (`npx jest … --no-cache`) died before any test ran with `EPERM` on the jest haste-map temp file under `--sandbox read-only`, so it measured nothing. Execution evidence is the Claude reviewer's: the 6 touched/adjacent profile-server suites ran green (262 tests), `npx tsc --noEmit` exit 0, eslint on the changed files exit 0.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low (nit, not a defect) | src/core/profile/PaymentsContract.ts:11, src/core/profile/InboxContract.ts:18, src/core/profile/PlayerProfile.ts:57, src/profile-server/Routes.ts:951 | New comments say the route does not read `verified` yet "(0250 S3b / 0319)"; 0319 is the name-change gate only (its brief title: "Close the forged-login name-change hole"), so citing it on the payments intent, inbox and profile read points future readers at a task that will never touch those routes. Comment-only; no behaviour effect. Optional: drop `/ 0319` at these four sites (NameChangeContract.ts:15 cites 0319 correctly). |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | PARTIALLY CORRECT | Defect (comment accuracy only; severity: trivial — no behaviour, no test, no deploy effect) | Verified each site against the 0250 and 0319 briefs. **Inbox** (`InboxContract.ts:18`): correct — 0319 never names the inbox routes; 0250 S3b does (verified inbox keys). Dropped `/ 0319`. **Profile read** (`PlayerProfile.ts:57`): **disproven at this site** — 0319 brief § *What to build* item 1 gates "`GET /v1/profile` returns the caller's pending `display_name` / name-change state **only** to a verified token"; citation kept. **Payments intent** (`PaymentsContract.ts:11`, `Routes.ts:951`): correct that 0319 is wrong there, but the suggested fix is incomplete — 0250 S3b does not gate `/v1/payments/yandex/intent` either (no backlog brief names that route), so dropping only `/ 0319` would leave a second wrong pointer. Reworded both to "does not read `verified` (neither 0250 S3b nor 0319 gates it)". **Same check, mirror case, not in R1:** `NameChangeContract.ts:146` (the pending name on the `GET /v1/profile` projection) cited only `0250 S3b`; 0319 item 1 gates exactly that field, so it now reads `(0250 S3b / 0319)`. Comment-only; re-verified with targeted jest, `tsc`, lint and full `npm test` (see worklog). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
- (none recorded in this ledger yet — the settled tradeoffs for this task live in ADR-116, ADR-121 R1, ADR-122 and the plan's owner rulings; see the Round 1 report's suppressed list)
