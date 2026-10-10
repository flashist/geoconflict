# Review — 0431

Task: ai-agents/tasks/done/0431-update-routes-it-test-to-expect-the-verified-field-on-resolve/brief.md
File(s) under review: tests/integration/Routes.it.test.ts (working tree; other uncommitted files belong to closed tasks 0425 / 0228 — out of scope)
Status: closed-out
Coverage: reasoning-only second opinion — Round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned "no significant issues found", having run only `git diff` / `nl -ba` / `rg` (source-text reads, not measurement); the measurement is the reviewer's own (targeted `npm test -- tests/profile-server/Routes.test.ts -t "verified"`: 18 passed, incl. "no token answers verified:false and counts absent"; eslint + prettier clean on the edited file).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

Round 1: no findings. Both passes clean. Verified: `verified: false` is the correct literal — `resolveOverHttp` (tests/integration/Routes.it.test.ts:126-131) sends no `sessionToken`, so `vouchForSession` returns `"absent"` before any secret check (src/profile-server/SessionVouch.ts:58-60) and the route answers `verified: vouch === "verified"` → false (src/profile-server/Routes.ts:888). Exact `toEqual` kept, so a leaked or extra field still fails. No other exact resolve-body assertion exists in `tests/integration/**`. Cause attribution (`077c9e3`, task 0332) confirmed via `git log -S`.

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)
