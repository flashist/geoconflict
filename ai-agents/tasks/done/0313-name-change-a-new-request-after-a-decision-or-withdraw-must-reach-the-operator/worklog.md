# Worklog — 0313: a new request after a decision must reach the operator

## 2026-09-27 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Build worker)

Building the approved `plan.md` (blob `728a06ebb99eed2193afe63a530f615304ac56c9`), Steps 0–3 plus its
verification. Nothing committed. Task status and `plan.md` untouched.

### Step 0 — owner ruling on the rule, recorded verbatim (brief verification 1)

Given 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:

- Question: "How should a new name request after you've decided reach you, while still stopping spam?"
- Answer: **"(a) Decision resets the limit (Recommended)"** — option text: "Once you approve or reject, that player's next request messages you at once. Withdrawing doesn't reset it, so ask/withdraw/ask spam stays at 1 per 10 minutes. Only you can decide, so players can't abuse it. About 5 lines + tests."

Plan approval (the Build worker's standing approval): the owner answered **"Approve (Recommended)"** to
"Approve the 0313 plan (a decision resets the per-player alert limit; withdrawing doesn't; tests + runbook note) so a coder can start building?" — same session, same day, relayed.

### What 0313 changed (on top of 0307/0302/0312's uncommitted work in the same tree — none of theirs touched)

| File | 0313 change |
|---|---|
| `src/profile-server/NameChangeRepository.ts` | new private `releaseNotifySlot(playerId)` (one `Map.delete`, next to `claimNotifySlot`); one call in `decideNameChange` on the success path, immediately **before** `COMMIT`; comments on `OPERATOR_NOTIFY_COOLDOWN_MS`, the `lastNotifiedAt` field and `claimNotifySlot` now state the rule. Nothing else in the file changed; 0307/0312's functions are untouched. |
| `tests/profile-server/NameChangeRepository.test.ts` | new `describe("a decision clears the slot (task 0313)")` directly after the R1 block, with a stateful `lifecyclePool` fake and `Date.now` frozen. R1 block not edited. |
| `ai-agents/knowledge-base/name-change-digest-runbook.md` | the `name_mismatch` row's "(a player is notified at most once per 10 minutes)" now adds the decision exception; a short **When a new request messages you (task `0313`)** note near the top of *Deciding a request*. |

Not changed: `plan.md`, the brief, task status, the wiki (the cooldown claim at `wiki/tasks/citizenship-name-change.md:104,115` is for fkit-wiki after close).

### Verification

1. **Owner rule recorded verbatim** — above, before any code.
2. **Red before, green after.** New tests run against today's code (before the source edit):
   ```
   ✕ request → APPROVE → request notifies twice, the 2nd with the new name   (Expected 2 calls, Received 1)
   ✕ request → REJECT → request notifies twice                                (Expected 2 calls, Received 1)
   ✓ request → WITHDRAW → request inside the window still notifies ONCE (R1 holds)
   ✕ after a decision the fresh slot still limits the withdraw loop           (Expected 2, Received 1)
   ✓ a decision for one player does not reset another player's slot
   ✓ name_mismatch / ✓ name_taken / ✓ a decide that throws / ✓ no_pending
   ```
   After the change: all 9 pass. (The ✓ ones before the change are guards against over-clearing; they are meant to pass on both.)
3. **R1 block unchanged** — extracted `describe("per-player cooldown (review R1)" … )` from `HEAD` and from the working tree: byte-identical (59 lines). All 5 R1 tests pass.
4. `npm test -- tests/profile-server/NameChangeRepository.test.ts`: **138 passed**.
   Full `npm test`, run 1: **1 failed** — `tests/profile-server/TenureGrantRoutes.test.ts` › "has no rate limiter…", `Exceeded timeout of 5000 ms`. That suite uses supertest and does not touch name changes; no `SIGSEGV` in the output and no `node-*.ips` crash report, so it matches the known supertest flake (CLAUDE.md). **Re-ran** — run 2: **157/157 suites, 2495/2495 tests passed, exit 0**, no skipped suites.
   `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0. Prettier: both changed code files clean (the runbook was already not Prettier-formatted before this task; left alone).
5. **Not run:** `npm run test:integration` — no DB behaviour changed, and it needs the local Postgres container.
6. **Owner-run, live, not claimable by an agent:** after a profile-server deploy, request → approve → new request within 10 minutes → a second Telegram message arrives.

### Decision log (calls made without asking, Build worker under the approved plan)

1. **Case 4 widened from 2 to 4 non-decision outcomes** (`name_mismatch`, `name_taken` as planned, plus `no_pending` and a thrown decide). Why it qualified: obvious winner within the plan's intent — plan Step 1 itself lists all four as outcomes that must NOT clear the slot; the tests only pin that. No source effect.
2. **Added a cross-player test** ("a decision for one player does not reset another player's slot"). Why: obvious winner within intent — a `lastNotifiedAt.clear()` implementation would pass every planned case yet hand every other player's flood back; this pins the per-player key. No source effect.
3. **Made the test fake stateful** (tracks one pending row; decide/withdraw clear it; a second INSERT while pending throws the one-pending violation) instead of a static combined pool. Why: mechanical, in-plan (plan asks for a combined fake); stateful means a mis-sequenced test fails loudly instead of passing against impossible DB state. Every step also asserts its outcome (`ok`, `name_mismatch`, …) so the fake cannot drift silently.
4. **Ran `prettier --write` on the test file only.** It reformatted only 3 lines inside the new 0313 block (checked by diff before writing). The runbook was not reformatted — its existing Prettier drift predates this task and is not 0313's to touch.

No review-fix applied (this is the Build step; no review yet).

## 2026-09-27 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Standing approval: the approved `plan.md` (blob `728a06ebb99eed2193afe63a530f615304ac56c9`). Nothing committed. `plan.md`, the brief and task status untouched; the reviewer's *Reviewer findings* not edited.

### Owner ruling on R1, recorded verbatim

Given 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:
- Answer: **"Fix it (Recommended)"** — option text: "The coder lowercases the id in one place before resetting, plus a test. A few lines; the gap is fully closed."
- Relayed instructions: normalise in exactly one place; the chosen place must also keep `claimNotifySlot` consistent if it could ever receive a non-lowercase id; test: approve with the uppercase UUID → the next request sends a 2nd alert.

### Verification

- New R1 tests red on the pre-fix code (`Expected 2 / Received 1`; `Expected 1 / Received 2`), green after.
- New R2 tests green on today's code; **mutation check** — `releaseNotifySlot` moved after `COMMIT` turns both R2 tests red; file restored byte-identical (`cmp`). Run twice (before and after a test refactor).
- `npm test -- tests/profile-server/NameChangeRepository.test.ts`: 142/142.
- Full `npm test`: **157/157 suites, 2499/2499 tests, exit 0** — first run, no flake, no skipped suite.
- `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · Prettier clean on both code files.
- Not run: `npm run test:integration` (no DB behaviour changed; needs the local Postgres container).

### Decision log (applied without per-fix owner approval, under the standing approval)

1. **R1 — `src/profile-server/NameChangeRepository.ts`.** Finding: an uppercase-UUID decide committed but freed no slot, because the Map was keyed on the raw string while both the decide schema and the session token accept any-case UUIDs. Change: one module function `notifySlotKey(playerId)` (`toLowerCase()`); `claimNotifySlot`'s get/set and `releaseNotifySlot`'s delete now key through it. Why it qualified: verified `CORRECT`, mechanical/localized (3 call sites + 1 function), inside the approved plan's intent (a committed decision resets that player's slot) and explicitly owner-ruled "Fix it". Placement choice (key function rather than lowercasing in the decide schema/route): obvious winner within the ruling — it is the only single place that covers BOTH claim and release, as the ruling asked, and it changes nothing about the id passed to SQL, the inbox or the Telegram text.
2. **R1 — tests.** Two tests: the ruling's uppercase-approve case, plus "same player in two cases shares one slot" (the claim-side consistency the ruling asked for). Why: in-plan, pins the ruling.
3. **R2 — `tests/profile-server/NameChangeRepository.test.ts` only.** Finding: no test pinned clear-before-COMMIT or COMMIT failure. Change: `lifecyclePool` options `commitError` / `onCommitApplied` (wrapping the fake's query; the shared `fakePool` is untouched) and two tests. Why it qualified: verified `CORRECT`, test-only, in-plan (plan Step 1 states both the ordering and the COMMIT-failure cost).
4. **`prettier --write` on the test file.** Previewed first: it re-wrapped only one line of the new R2 test.
