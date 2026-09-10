# Close the three test-quality residuals routed out of 0236 — the citizenship kill switch's own tests

## ID
0237

## Sprint
Backlog

*Unscheduled.* ⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift
rule compares it against the board's identity, and a decorated value (`Backlog — unscheduled`) is
reported as drift. **Do not decorate it.**

⚠️ **This is an APPEND POSITION, NOT A MERIT RANKING.** The owner has **not** ruled a rank for this
task. fkit's **ADR-035** bars a producer from inserting a new row above a board's existing/closed
rows, so the row was **appended at the bottom** of [`backlog.md`](../../../sprints/backlog.md).
Bottom-of-board here means *"filed last"*, and nothing more.

**Why the Backlog board and not Sprint 4:** every Sprint 4 row carries a rank in its Priority column
(`High *(producer's rank)*` and similar); the Backlog board is unranked by design — *"The **Priority**
column reads `—` for every row: this board is unranked by design. Needing a rank is the signal to pull
the task into a sprint"* ([`backlog.md`](../../../sprints/backlog.md)). This work was **deliberately
routed out of an active task by the owner's own stopping rule**, which is the definition of *not
scheduled*. Filing it on Sprint 4 would re-import work the owner just decided not to do now.
**Promoting it is an owner call, not a producer one.**

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
decisions, not a file in this repository's `ai-agents/knowledge-base/decisions/` (which numbers from
`adr-101`). There is nothing here to link to.*

## Priority
Unscheduled — **not ruled by the owner, and deliberately not ranked by the producer either.**

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
✅ **NOTHING.** Test-only, client-only. Does not wait on the profile box, `0217`, or any deploy.

---

## Context

### Where these came from — routed out, not dropped

[`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) (the client-side kill
switch for citizenship surfaces) went through **two review rounds**, each with a Claude pass and a
Codex adversarial second opinion. Round 2 produced four findings, **all low**. The **owner's stopping
rule for round 2 routed anything below `high` out of `0236`** rather than growing the task.

- **One of the four — R6, a self-contradictory doc comment — was fixed inside `0236` anyway**, on the
  **lead's** call about cost asymmetry (tracking a one-line comment fix costs more than making it).
  ⚠️ **That was explicitly NOT an owner ruling**, and it is recorded as a visible exception, not as
  precedent.
- **The other three — R7, R8 and R9 — were left strictly untouched** and route here.

🔴 **These were never "dropped" and this brief must not be read as cleanup after a miss.** Each was
recorded in `0236`'s review ledger with a written **re-raise condition**, and each of those conditions
is carried forward below verbatim in substance. The full record lives in
[`0236`'s `review.md`](../../done/0236-client-kill-switch-for-citizenship-surfaces/review.md), under
*"Routed out of 0236 by the owner's round-2 stopping rule"* (residuals **R-B**, **R-C**, **R-D**,
which are R7, R8 and R9 respectively).

⚠️ **One stale line in that ledger, flagged so a future reader is not confused:** the routed-out list
still carries **R-A (R6)** as routed, while the coder's amendment at the top of the same file and the
round-2 disposition table both record R6 as **fixed inside `0236`**. **The disposition table is
correct; R6 is done and is NOT part of this task.**

### Severity, stated plainly

**All three are LOW. None is a live defect. Nothing in production behaves differently because they are
open.** Production ordering and production behaviour were reviewer-verified as **correct today**. This
is test-quality work: what the tests *claim* to cover versus what they *do* cover, and how well they
would survive a future edit.

### Why the set is one task and not three

All three live in **one file** — `tests/client/FlashistFacade.test.ts` — against **one change set**
(the citizenship-switch helper and its snapshot). None is independently valuable shipped alone: a
coder opening that file for any one of them is already holding the other two. Splitting them would
produce three briefs, three board rows and three closes for what is a single sitting of work.
**Decomposition is about independent shippability, not count.**

### 🚨 The one that matters — R8 is a tripwire on a known regression, not generic test debt

**Read this before ranking the three by size.** R8 is not "a test could be a bit stricter".

`0236`'s round 1 found **R1 — a real defect in the coder's own first cut**: the synchronous snapshot
that the ★ badge renderer reads was **never re-primed on late-SDK recovery**. After a degraded boot
that later recovered, the async helper reported *enabled* while the badge's sync snapshot stayed
`false` **for the entire session** — the inbox and payments would come back, the badges never would.
It was fixed at the recovery site, which already re-primes four sibling capabilities; the new one is
the fifth.

The test written to lock that fix asserts **that the prime was called** — **not that it was called
*after* the SDK is assigned**. So:

> 🔴 **A future reorder of the recovery block would leave the test GREEN while silently reintroducing
> R1.** The prime would take the no-SDK early return and write `false` again.

The residual's own re-raise condition names the trigger precisely: **"the recovery block at
`FlashistFacade.ts:704-725` is reordered or refactored — that edit is exactly what this residual is
watching for."** That is the same edit that reintroduces the defect. ⇒ **Treat R8 as a guard on a
known, already-once-real regression.** If only one of the three is ever done, do this one.

---

## What to build

⚠️ **Line numbers below are anchors recorded on 2026-09-10, not addresses.** `0236` closed the same
day and these files are edited by other work. **Re-derive every site by content, not by line number**
— see
[`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

### 1. 🚨 R8 — pin the recovery ORDERING, not just the call (the important one)

**Where:** `tests/client/FlashistFacade.test.ts`, the R1 wiring test (was `:417-443`).

**What is wrong:** the test spies `primeCitizenshipSurfacesSnapshot` and asserts it **was called**. It
does exercise the real `yandexSdkInit()`, and it **would** go red if the prime call were deleted —
that much was reviewer-corroborated. What it does not assert is **order**: that the prime runs after
`this.yandexGamesSDK = sdk` (was `FlashistFacade.ts:707`) and after `initExperimentFlags()` (was
`:720`).

**What to build:** an assertion that fails on a **reorder**, not only on a deletion. Any mechanism
that genuinely pins the ordering is acceptable — e.g. recording call order across the SDK assignment
and the prime, or asserting the SDK is observable at prime time. **The acceptance test for this item
is the mutation in the verification steps below, not the shape of the assertion.**

⛔ **Do not "fix" production ordering.** It is correct today and reviewer-verified. This item adds a
guard; it changes no behaviour.

### 2. R7 — the "real field default" test does not cover the initializer

**Where:** `tests/client/FlashistFacade.test.ts` (was `:356-363`).

**What is wrong:** the test's comment says it covers *"the real field default"*. It does not. The suite
builds facades with `Object.create(FlashistFacade.prototype)`, which **skips class-field
initializers** — so the test observes `undefined === true`, not `citizenshipSurfacesSnapshot = false`.
It genuinely does cover the `=== true` guard's fail-closed normalization (valuable — it would go red
if that guard were removed), but flipping the initializer to `true` would **not** be caught here.
**The comment claims coverage the test does not have.**

**What to build — the honest fork, and it is a real choice:**

- **Either** close the gap with a constructor-level harness that exercises a real
  `new FlashistFacade()` — ⚠️ **whose constructor does platform detection and analytics wiring that
  this suite deliberately avoids**, which is exactly why the gap exists;
- **or** accept the gap and **correct the comment** so it states what is actually covered (the guard,
  not the initializer).

**Both are acceptable outcomes. Picking the cheap one is not a failure** — but a run that leaves the
**misleading comment** in place has not done this item. Behaviour is fail-closed either way.

### 3. R9 — the snapshot tests sit exactly on the two-microtask boundary

**Where:** `tests/client/FlashistFacade.test.ts` (was `:369-372`, `:383-386`, `:404-407`).

**What is wrong:** three tests drain the prime with exactly `await Promise.resolve(); await
Promise.resolve();` — and the chain needs **exactly two** microtask turns. They sit precisely on the
boundary. **This is fragile, not flaky:** V8's microtask order is deterministic, so they pass reliably
today. But **any added `await` anywhere in the helper chain breaks all three at once**, and the
failure presents as a confusing *"snapshot is false"* rather than *"not enough ticks"*.

**What to build:** drain the prime unconditionally instead of counting turns — e.g.
`await new Promise((r) => setTimeout(r, 0))`. ⚠️ **Keep the tests deterministic**; do not introduce a
real wait or a polling loop.

---

## Verification steps

1. **R8 is proven by MUTATION, not by reading.** Temporarily move the prime call **above** the SDK
   assignment in the recovery block, run the suite, and **confirm the wiring test goes RED**. Restore
   the code. ⚠️ **Record the observed before/after in `worklog.md`.** A run that asserts "the test now
   pins ordering" without having watched it fail has not verified this item — that is the exact
   weakness R8 exists to close.
2. **R8, second half:** with the code restored, the deletion case must still go red (delete the prime
   call, watch it fail, restore). The new assertion must not have *replaced* the old coverage.
3. **R7:** either a real `new FlashistFacade()` test exercises the `= false` initializer, **or** the
   test's comment is corrected. State in `worklog.md` **which fork was taken and why**. If the harness
   fork was taken, flipping the initializer to `true` must make it go red — demonstrate it.
4. **R9:** add an `await` somewhere in the `isCitizenshipSurfacesEnabled()` /
   `isCitizenshipUiEnabled()` chain, confirm the three snapshot tests **still pass**, then remove it.
   That is the whole point of the item.
5. `npm test` green — expect **113 suites** and a test count at or above `0236`'s closing **1197**
   (this task only adds or rewrites tests). ⚠️ **Read the known-flake and `0197` SIGSEGV rules in
   `CLAUDE.md` before calling a red run a regression.**
6. `npm run lint`, `npx prettier --check` on touched files, and `npx tsc --noEmit` all clean.
7. **No source file changes.** `git status` shows edits under `tests/` only. ⛔ **If this task starts
   editing `src/client/flashist/FlashistFacade.ts`, stop — that is out of scope.** (The one sanctioned
   exception is R7's *comment* fork, which lives in the test file, not the source.)

---

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Follows from:** [`0236`](../../done/0236-client-kill-switch-for-citizenship-surfaces/brief.md) —
  residuals **R7 / R8 / R9**, routed out by the owner's round-2 stopping rule, with their re-raise
  conditions recorded in
  [`0236/review.md`](../../done/0236-client-kill-switch-for-citizenship-surfaces/review.md).
- 🚨 **THE LAUNCH GATE NOW HAS ITS OWN TASK — [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md).**
  Filed 2026-09-10 on an **owner ruling**: the precondition needed an owner, not a note in three
  places. Before anyone flips `CITIZENSHIP_CARD_ENABLED` to `true`, **layer 2 (the `citizenship_ui`
  Yandex experiment flag) must be validated in a staging or prod build** — flag ON, flag OFF, and the
  **propagation delay observed and written down**. `checkExperimentFlag()` returns `true`
  unconditionally when the client bundle's `GAME_ENV` is `dev`, and that value comes from the
  **webpack mode**, not the `cross-env GAME_ENV=dev` in the npm scripts ⇒ **the remote half cannot be
  exercised in `npm run dev` at all.** ⛔ **Closing `0237` does not discharge `0238`. Neither does
  `0217`, and no unit test can stand in for a real console flip.**
- **The `0236` residuals that are NOT in scope here**, recorded so nobody re-imports them: the
  `CitizenshipCard.ts` fail-open carve-out (**owner-ruled 2026-09-10, KEEP AS-IS** — the badge fails
  closed, the card fails open, and the owner was shown that inconsistency and kept it), the ungated
  server-side crediting path (**deliberate — `0236` is a UI kill switch only**), and the dead
  `citizenship-login-requested` event (**unrelated cleanup**).
- **No wiki page exists for `0236` yet.** The vault has [[tasks/hide-citizenship-card-flag]] (task
  `0054`, the layer-1 flag) but nothing for the `0236` switch. Ingest is **`fkit-wiki`'s**, not this
  task's.
