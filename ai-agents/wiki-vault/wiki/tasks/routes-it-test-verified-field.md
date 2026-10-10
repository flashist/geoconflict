# Update `Routes.it.test.ts` to Expect the `verified` Field on Resolve (task 0431)

**Source**: `ai-agents/tasks/done/0431-update-routes-it-test-to-expect-the-verified-field-on-resolve/brief.md` (`worklog.md`, `plan.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 33 (ADR-035 append rank) / task `0431`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 (owner rulings *"Drive 0431 too (Recommended)"*, plan
> *"Approve plan (Recommended)"*). Test-only; committed in `bcc9bf0`. No deploy, no verify task.

## Goal

Two tests in `tests/integration/Routes.it.test.ts` failed on `dev` because the profile server's resolve route now also
returns `verified`, and the tests compare the body with an exact `toEqual`. **The route is right; the test was stale.**
Found by `0425`'s integration run ([[tasks/tester-roles-command]]), proven pre-existing on a clean worktree.

## Key Changes

- `tests/integration/Routes.it.test.ts` only (+5/−1): `verified: false` added to the two exact resolve bodies, plus one
  comment clause. **Kept `toEqual`** — the tests exist to catch leaked fields, so they were not loosened. No source change.
- ⚠️ **Cause corrected:** the brief guessed task `0340` (`71efd10`). The real source is commit **`077c9e3`**, task
  **`0332`** ([[tasks/join-token-identity-vouch]], ADR-124) — confirmed by `git blame`, `git log -S` and reading the
  `71efd10` diff. The brief and the board row keep the wrong guess struck, with a dated correction.

## Outcome

- `npm run test:integration` against the local test DB: **13/13 suites, 178/178 tests**, 0 failed, 0 skipped — in a
  build run and an independent verify run (178 included `0425`'s then-uncommitted `TesterRole.it.test.ts`). The "before"
  figure (176/178) is from `0425`'s worklog, **not re-measured**. Lint clean.
- Review: stateful, 1 round, no findings.

## Related

- [[tasks/join-token-identity-vouch]] — task `0332`, which added `verified` to the resolve reply
- [[decisions/adr-124-join-token]] — the design behind that field
- [[tasks/tester-roles-command]] — task `0425`, whose integration run found the failure
- [[tasks/test-suite-reliability-investigation]] — how the integration suite is run and judged
- [[decisions/sprint-8]] — the board (rank 33)
