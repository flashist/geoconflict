# Worklog — 0374: lobby windows end their joining mark when they close

## 2026-10-05 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as Build worker)

Built from the approved `plan.md` (blob `35642013b7d570b21ec3c0ba254c8f50c0a21c4e`, verified by
`git hash-object` before starting). Built on top of the uncommitted `0353` / `0380` / `0354` / `0377`
changes in the working tree; none reverted.

### What changed

**`src/client/HostLobbyModal.ts`** (R1)
- New field `joiningMarkEnds: Set<() => void>` and two private helpers, `beginJoiningMark()` and
  `endJoiningMarks()`, as in the plan.
- `open()`: `beginJoiningLobby()` → `this.beginJoiningMark()`. The settle chain
  (`joined.catch(() => {}).finally(endJoining)`) is unchanged; its end is now a no-op after a close.
- `reset()`: calls `this.endJoiningMarks()` right after `openGeneration++`.
- 0336 comments updated: the mark ends on settle **or** on close.

**`src/client/JoinPrivateLobbyModal.ts`** (R2)
- Same field and helpers (a set, because two lookups can overlap — J5/J8).
- `joinLobby()`: `beginJoiningLobby()` → `this.beginJoiningMark()`; the `finally` is unchanged.
- `reset()`: calls `this.endJoiningMarks()` next to `closeGeneration++`.
- Comment updated.

`StartScreenPresence.ts` unchanged. No timeout bound added (plan step 5).

**Tests**
- `tests/client/HostLobbyOpen.test.ts` — **H3 flipped** (waiter resolves at the close; a late OK
  create joins nothing); new **H5** (close, then create fails), **H6** (window open, create hangs,
  10 min of fake time: still waiting), **H7** (reopen race), **H8** (programmatic `modal.close()`).
- `tests/client/JoinPrivateLobbyModalLeave.test.ts` — **J4 flipped**; new **J6a** (close, then not
  found), **J6b** (close, then the lookup throws), **J7** (window open, lookup hangs), **J8** (two
  Join taps, one close ends both marks), **J9** (programmatic close).
- Both files gain a small `expectJoiningCountIsZero()` helper: a fresh waiter resolves at once (count
  not stuck above zero) **and** one more `beginJoiningLobby()` still holds a waiter (count not driven
  below zero by a double end).
- H4 and J1 (success path, no gap) unchanged and still pass.

### Verification
- `npx jest tests/client/HostLobbyOpen.test.ts` — 17/17 pass.
- `npx jest tests/client/JoinPrivateLobbyModalLeave.test.ts` — 19/19 pass.
- **Mutation check:** with both `this.endJoiningMarks();` calls in `reset()` commented out, 9 tests
  fail (H3, H5, H7, H8, J4, J6a, J6b, J8, J9). H6 and J7 pass either way — expected, they guard the
  other direction (no early release while the window is open). Source restored afterwards.
- `npm test` — **192 suites, 3523 tests, all passed**, first run. No supertest flake seen, so no
  re-run.
- `npm run lint` — clean. `npx prettier --check` on the 4 files — clean. `npx tsc --noEmit` — clean.
- **Unit-tested only.** No live check (brief: the owner's live check is optional, not required — the
  hang is hard to produce by hand and the impact is a delay).

### Decision log (fixes / obvious-winner calls made without asking)
1. **H7's waiter (test construction only).** The plan's H7 text says the waiter "is still pending
   because of the second opening's mark" after close → reopen. Taken literally with one waiter, that
   fails: the first close correctly brings the count to zero and wakes the waiter created before it.
   That is exactly what the brief's step 5 requires ("the first mark ends at the first close").
   I split it into two waiters: the first must resolve at the first close; a fresh waiter taken after
   the reopen must stay pending through the first create's late OK answer and resolve at the second
   close. **Why it qualified:** obvious winner within the plan's intent — no source change, and it
   asserts strictly more than the plan's wording (the brief's step-5 first half, plus the plan's
   second half). The behaviour under test is the plan's step 4 "Host reopen race" unchanged.
2. **`expectJoiningCountIsZero()` probe.** The plan says H5/J6 check that "a new
   `whenOnStartScreen()` resolves straight away (the count did not go negative or stick)". A fresh
   waiter alone cannot see a negative count (`joinsBeingSetUp > 0` is false at −1 too), so the helper
   also takes one probe mark and asserts a waiter then stays pending. **Why it qualified:** obvious
   winner within intent — it makes the plan's stated "did not go negative" claim actually tested;
   test-only, no scope change. Also applied to H3, H7, H8, J4, J8, J9.

No review fixes applied (this is the build step; no review has run yet).

## 2026-10-05 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as Process-review worker)

Ran `fkit-process-stateful-review` on `review.md` (task-id `0374`) under the approved plan (blob
`35642013b7d570b21ec3c0ba254c8f50c0a21c4e`, re-verified by `git hash-object`).

- Reviewer verdict: ready to merge, **no findings rows**. No accepted residuals on file; no ADR in
  `knowledge-base/decisions/` covers the joining mark (ADR-119 touches `HostLobbyModal` for invites
  only — out of scope).
- Codex X1 / X2 (`disconnectedCallback`) — already disproven by the reviewer in the ledger.
  Spot-checked the evidence: both elements are static in `index.html` and `yandex-games_iframe.html`;
  the only modal `.remove()` calls in `src/client/` are `ClientGameRunner.ts` (error modal) and
  `UserSettingModal.ts` (a popup) — neither lobby window. Agree; no row needed.
- No *Coder response* rows written (nothing to respond to). Ledger `Status:` set to `closed-out`.
- No code changed; no tests re-run this round (nothing changed since the build's verified run).

### Decision log (fixes / obvious-winner calls made without asking)
none — no fix applied and no obvious-winner call made this round.
