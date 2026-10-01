# Review — 0366

Task: ai-agents/tasks/done/0366-measure-how-old-stale-login-signatures-are/brief.md
File(s) under review: src/profile-server/{Telemetry,PlayerSignature,LoginVerification,Routes}.ts · tests/profile-server/{PlayerSignature,LoginVerification,LoginVerificationRoutes,Telemetry,RouteMetrics,InternalPathCase,AlertRoutes}.test.ts (uncommitted working tree on `dev` vs `HEAD`)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned "no significant issues found"; it type-checked (`npx tsc --noEmit` → pass) but its jest run was blocked by the read-only sandbox (EPERM writing the jest haste-map), so it measured no behaviour. Execution evidence is the reviewer's: the 7 scoped suites ran 255/255 green and `npx tsc --noEmit -p tsconfig.json` exited 0.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

_Round 1 (2026-10-01): no findings. Both passes found no defect in scope. Checked and cleared: bracket edges (open below, closed above; exactly 900 s old / 300 s ahead stay `ok` with no `ageBracket` key — `src/profile-server/PlayerSignature.ts:134-139` condition unchanged); every bracket edge tested at the edge and +1 ms; the only extra `ProfileMetrics` implementers in `src/` use `noopProfileMetrics` (`src/profile-server/Server.ts:70`), so no type break at ts-node startup; the recording sits in its own try/catch after the unchanged `outcome` counter call (`src/profile-server/Routes.ts:737-744`), and a throwing recorder is tested to leave status, body shape, `vfy:false` token and the outcome count unchanged; the label value comes only from fixed comparisons on a number, never from player data; nothing new is logged; route tests use ages away from edges, so no clock-race flake._

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

_Round 1 (2026-10-01, fkit-coder as `fkit-sprint-ship-loop` Process-review worker): no reviewer rows, so no novel findings and nothing to disposition. Loop check: no Accepted residuals exist; ADRs in scope (ADR-116, ADR-103) checked — nothing to close out against. No code changed in this step. Nothing blocking remains → header Status set to `closed-out`._

## Accepted residuals (shared, do-not-re-litigate)
