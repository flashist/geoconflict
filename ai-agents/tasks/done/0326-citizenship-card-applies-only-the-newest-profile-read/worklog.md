# Worklog — 0326: citizenship card applies only the newest profile read

## 2026-09-28 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan `plan.md` (blob
`b6e3325aabc2f9aaee3b9eac318d43cad36e7c61` — re-hashed this turn with `git hash-object`, matches); owner
approved live via `AskUserQuestion` in the `fkit lead` session, 2026-09-28.

### Owner rulings — verbatim, as relayed by fkit-lead (copied from the end of the approved plan)

- **Q1 (ordering rule):** "Newer already shown (Recommended)" ⇒ **option A**: drop a read only if a newer
  read has already been applied (`profileReadsIssued` + `newestAppliedProfileRead`). Test 4 in scope.
- **Q2 (the "fires exactly once" check):** "One read per refresh (Recommended)" ⇒ prove one server read
  per refresh, never retried, no new reader. No `PlayerProfileView.test.ts` zero-fire test.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.

### Q2 note — `Citizenship:Earned:XP` is dormant

`Citizenship:Earned:XP` fires **zero** times per load today: nothing calls
`reportEarnedCitizenshipTransition` (`src/client/PlayerProfileView.ts`, dormant since task `0250` S1,
ruling D4). The brief's "fires exactly once for one load" cannot be met as written. Per ruling Q2 the
tests prove the part that would matter once S3b re-enables it: exactly one `loadPlayerProfileView` call
per `refreshProfile` call, a dropped read is never retried, and no new reader (grep below).

### What changed

- `src/client/CitizenshipCard.ts`
  - Two plain private fields, `profileReadsIssued` and `newestAppliedProfileRead`, with a comment.
  - `refreshProfile()`: takes a read number before the read; after the read, returns early (applies
    nothing) if `readNumber < newestAppliedProfileRead`; otherwise records it and applies the four writes
    together (`this.profile`, `publishCitizenshipStatus()`, `publishApprovedName()`, `requestUpdate()`).
  - `startTenureClaim` doc block: one note that a superseded re-read leaves the check reading the newest
    applied read. The single-read-path sentence is unchanged.
  - `onBuyCtaTap`'s direct `publishCitizenshipStatus()` (the `paidGrantConfirmed` latch) left unguarded,
    as the plan says.
- `tests/client/CitizenshipCard.test.ts` — new `describe("stale-read guard (task 0326)")`, 5 tests:
  1. first read landing after the reconciliation re-read is dropped (plan test 1);
  2. tenure: a stale re-read is dropped and the restart offer still fires (plan test 2);
  3. name submit: a superseded re-read still clears the in-flight flag, a second submit goes through, no
     `console.warn` (plan test 3);
  4. an older read that lands while a newer one is pending is applied, then the newer one (plan test 4);
  5. tenure: the re-read applies while a newer read is still loading (plan test 4, tenure variant — see
     decision log).
  Every test asserts the exact `loadProfile` count (plan test 5).

Other tasks' uncommitted edits in both files (0303, 0314, 0321) untouched. Prettier run only on the test
file; its one change was inside the new block.

### Red run — unchanged source, new tests only

```
      ✕ the first read landing after the reconciliation re-read is dropped (43 ms)
      ✓ an older read that lands while a newer one is pending is applied, then the newer one (1 ms)
        ✕ tenure: a stale re-read is dropped and the restart offer still fires (4 ms)
        ✕ name submit: a superseded re-read still clears the in-flight flag (4 ms)
        ✓ tenure: the re-read applies while a newer read is still loading (2 ms)
Tests:       3 failed, 98 skipped, 2 passed, 103 total
```

Failures were the intended ones: test 1 — stale non-citizen read won (buy CTA back, no badge); test 2 —
`signals` was `[]` (stale read made `isCitizenNow()` false); test 3 — card showed `Stale`. Tests 4/5 pass
on today's code by design (no guard applies everything in arrival order); they separate A from B, not
from today.

### Green run

`npx jest tests/client/CitizenshipCard.test.ts` — **103 passed, 103 total** (all 5 new tests green).

### Mutation check — option B swapped in, then restored

Changed the check to `readNumber !== this.profileReadsIssued` (the brief's literal rule):

```
      ✓ the first read landing after the reconciliation re-read is dropped (36 ms)
      ✕ an older read that lands while a newer one is pending is applied, then the newer one (1 ms)
        ✓ tenure: a stale re-read is dropped and the restart offer still fires (3 ms)
        ✓ name submit: a superseded re-read still clears the in-flight flag (4 ms)
        ✕ tenure: the re-read applies while a newer read is still loading (3 ms)
Tests:       2 failed, 98 skipped, 3 passed, 103 total
```

Option A restored from a backup copy and confirmed by grep (`readNumber < this.newestAppliedProfileRead`).

### Other verification

- Neighbour suites — `CitizenshipCard`, `CitizenshipStatus`, `CitizenshipPurchase`, `CitizenBadge`,
  `CitizensOnlyModal`, `ApprovedName`, `CitizenshipRestartOffer`, `TenureGrantClaim`: **8 suites, 182
  tests, all pass.**
- Single read path: `grep -rn "loadPlayerProfileView(" src/` — the only call is
  `CitizenshipCard.ts` inside `refreshProfile`; other hits are comments (`Inbox.ts:5`, two in the card).
- `npx eslint` on both edited files: clean. `npx prettier --check` on both: clean.
- `npm run lint` (whole repo): **1 error, not from this task** — a parsing error on the untracked
  `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` ("not found by the project service"). That folder is
  untracked (`??`) and belongs to task 0325; not touched here.
- Full `npm test`: **170 suites, 2974 tests, all pass**, exit 0, first run — no flake seen, no re-run.
  No skipped suites (the Docker-probed harness ran).

### Decision log

**Unattended fixes / obvious-winner calls (ADR-019 audit, ADR-032 A4): none.** This was a Build step; no
review findings were processed.

Build-time choices inside the plan (recorded so a wrong one can be found later):

1. **Added a tenure variant of plan test 4** ("tenure: the re-read applies while a newer read is still
   loading"). Plan test 4 is the generic older-applies case; this variant pins the exact gap ruling Q1
   was chosen to close (under B the tenure check reads the old screen and skips the restart offer). Test
   only, no source effect; the mutation check shows it fails under B.
2. **Plan test 3 uses an idle→idle name-submit** (display names `Stale` / `Fresh`) so the CTA is still
   there for the second submit that proves `isNameRequestInFlight` was cleared.

## 2026-09-28 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan carried verbatim (blob
`b6e3325aabc2f9aaee3b9eac318d43cad36e7c61`); owner approved live via `AskUserQuestion` in the `fkit lead`
session. Owner rulings on this round, verbatim as relayed by fkit-lead (2026-09-28):
- R1: "Accept + pin with a test (Recommended)" — no source change, accepted residual, one pinning test
  (which also closes R2).
- The two residuals the reviewer entered from the plan (late read after disconnect; latch publish
  unguarded): "Yes, keep them (Recommended)" — left as written.

### What changed

- `tests/client/CitizenshipCard.test.ts` — one new test in `describe("stale-read guard (task 0326)")`:
  `pins R1: a newer read failing fast wins over an older good read landing later`. First read (authoritative
  citizen, approved name `Good`) held pending; a reconciliation read resolves at once to the
  non-authoritative zero-state and is applied; the first read then lands and is dropped. Asserts: no citizen
  badge, no buy button (product present), `getCitizenshipStatus()` = `not_citizen`, `getApprovedName()` =
  `{kind:"unknown"}`, exactly 2 reads.
- `review.md` — *Coder response* rows R1, R2; new accepted residual "Fast-failing newer read wins";
  header `Status: closed-out`. *Reviewer findings* and `Coverage:` untouched.
- **No source change.** `src/client/CitizenshipCard.ts` byte-identical after the mutation check below
  (`cmp` against the backup copy).

### Verification

- Pinning test green on the current source.
- Mutation check: guard disabled (`if (false && readNumber < …)`) → the pinning test fails
  (`Expected substring: not "citizenship_card.citizen_badge"`) — so it pins real behaviour. Source restored
  from a backup copy; `cmp` identical.
- Card + neighbour suites (`CitizenshipCard`, `CitizenshipStatus`, `CitizenshipPurchase`, `CitizenBadge`,
  `CitizensOnlyModal`, `ApprovedName`, `CitizenshipRestartOffer`, `TenureGrantClaim`): **8 suites, 183
  tests, all pass** (182 before + 1).
- `npx eslint` and `npx prettier --check` on the test file: clean.
- Full `npm test` **not** re-run this round (test-only change; not requested by the driver).

### Decision log

Unattended fixes / obvious-winner calls (ADR-019 audit, ADR-032 A4): **none**. Nothing was applied on
the standing approval alone — both dispositions below are explicit owner rulings for this round.

1. **R1** (fast-failing newer read beats an older good read) — verified CORRECT, classified frontier.
   Change: none to source; residual "Fast-failing newer read wins" added to `review.md`. Qualified by the
   owner ruling "Accept + pin with a test (Recommended)", not by standing approval.
2. **R2** (test gap) — non-authoritative half CORRECT, closed by the pinning test above; `null`/guest half
   INCORRECT per the reviewer's own verification (a newer guest answer is authoritative about guest-ness).
   Change: one test only. Qualified by the same owner ruling ("also closes R2").

## 2026-09-28 — Close (spawned `fkit-producer`, via `/fkit-task-done`)

Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. No owner channel in this close;
nothing below was verified by a human. Grounds as relayed by `fkit-lead`: plan owner-approved 2026-09-28
(Q1 *"Newer already shown (Recommended)"*, Q2 *"One read per refresh (Recommended)"*; live via
`AskUserQuestion`, relayed); built test-first (race tests red on the old code; option-B mutation check run;
card suite 103 passing); full `npm test` at build 170 suites / 2974 tests passed. Review round 1 *Ready to
merge*, no confirmed defects: R1 owner-ruled *"Accept + pin with a test (Recommended)"* → `won't fix
(frontier)` + accepted residual + pinning test; R2 closed by that test; the two plan residuals kept by owner
ruling *"Yes, keep them (Recommended)"*. Ledger `review.md` reads `Status: closed-out`. Process round was
test-only (8 related suites, 183 passing). **The full `npm test` was NOT re-run after that one added test.**
Nothing committed.

**Owner-run checks still owed:**
- **Live check — NOT RUN:** on a slow or shaky connection, the card must not flip back to the Buy button for
  a citizen after start-up reconciliation.
- **`0329` is now unblocked.** Plan §6 merge note binds it: 0329 reads only through `refreshProfile`.
