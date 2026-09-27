# Plan — 0313: a new request after a decision must reach the operator

**Planning only. No source, no plan.md, no files written.**

## Summary
- **Root cause confirmed in code.** `claimNotifySlot` (`src/profile-server/NameChangeRepository.ts:480-495`) allows 1 Telegram alert per player per 10 min (`OPERATOR_NOTIFY_COOLDOWN_MS`, `:65`). It is keyed on the player only, and nothing ever clears it early. The live case (alert 15:03, approved 15:05, new request 15:06) falls inside that window, so the second alert was dropped silently.
- **Recommended rule: (a).** A committed approve or reject clears that player's slot. Withdrawing does **not** clear it. This is about 5 lines of code, plus comments, tests and one runbook line.
- **Why it does not bring back the flood R1 stopped:** only the operator can decide, through the internal-auth route (`Routes.ts:1327`). A player cannot trigger a decision. So every extra alert this allows costs one operator action. The player-driven loop (request → withdraw → request) never clears the slot.
- **Blocked on Step 0.** The owner must pick the rule before building. See the question at the end.

## Grounding (checked this turn)
- Only one repository instance exists: `Server.ts:164`. I found no cluster/fork in `src/profile-server/`. The 0312 box command posts to the running server's own decide route (`decideNameChange.ts:8`). So a decision and the next request always touch the **same** in-memory map. Clearing it on decide is sound.
- The uncommitted 0307/0312 changes are present in the tree: `NameChangeRepository.ts`, `Routes.ts`, tests, and the untracked `NameChangeDecideCommand.ts` and `decideNameChange.ts`. This plan touches none of 0307/0312's code: not `buildOperatorNotificationText`, `decideCommandLines`, `buildDecideCommandBody` or `describeRequestedNameForModerator`. It builds on the same working tree.
- The existing R1 tests are at `tests/profile-server/NameChangeRepository.test.ts:392-451`. They stay **unchanged**.
- The runbook quotes the cooldown at `ai-agents/knowledge-base/name-change-digest-runbook.md:239`.
- The wiki states the cooldown at `wiki/tasks/citizenship-name-change.md:104,115`. I can't write the wiki, so it is flagged for fkit-wiki after close.

## Step 0 — record the owner's rule
The ruling goes verbatim into the task's `worklog.md` before any code.

## Step 1 — build rule (a) in `NameChangeRepository.ts`
1. Add a private `releaseNotifySlot(playerId)` that runs `this.lastNotifiedAt.delete(playerId)`. It sits next to `claimNotifySlot`.
2. Call it in `decideNameChange` **on the success path only**, immediately **before** `await client.query("COMMIT")` (today about `:354`). It is reached only after approve succeeded (`approveInTransaction` returned null) or after `MARK_REJECTED_SQL`. These outcomes do **not** clear the slot, because they return earlier: `no_pending`, `name_mismatch`, `name_taken` (rolled back, row still pending) and thrown errors.
   - **Why before COMMIT and not after:** a player's new INSERT can only succeed once Postgres has applied the COMMIT. If the clear ran after COMMIT's reply, the player's INSERT reply could in theory be handled first, and that request would still be dropped. Clearing before COMMIT is sent removes that race.
   - **The cost if COMMIT then fails:** the row stays pending, so a new request gets `pending_exists` and nothing is sent. The worst case is withdraw → request producing one extra alert. That is the same "at most one extra message" cost the class comment already accepts for a restart (`:187-192`).
   - `Map.delete` cannot throw. `notifyOperator`'s never-throw discipline (`:503-548`) is untouched.
3. Update the three comments so the rule is stated where it lives:
   - the `OPERATOR_NOTIFY_COOLDOWN_MS` block (`:55-65`)
   - the `claimNotifySlot` JSDoc (`:469-479`)
   - the `lastNotifiedAt` field note (`:187-192`)
   Each says: a committed decision resets the slot; only the operator can cause that; withdraw deliberately does not reset it, so R1's request → withdraw → request loop is still limited to 1 per 10 min.

## Step 2 — tests (`tests/profile-server/NameChangeRepository.test.ts`)
Add a new `describe("a decision clears the slot (task 0313)")` next to the R1 block.
- It needs a combined fake pool: the `okPool` handlers (citizen / name-free / INSERT), plus `decidePool`'s (FOR UPDATE / lock / apply / mark), plus `DELETE FROM player_name_history` for withdraw.
- The builder must check that the `fakePool` substring match is unambiguous (first match wins). I checked the obvious pairs: `lower(display_name)` vs `SELECT display_name FROM players`, and the FOR UPDATE match text includes `\nFOR UPDATE`.
- `Date.now` is frozen with `jest.spyOn`, as in the existing window test at `:418`, so every step happens "inside 10 minutes".

Cases:
1. request → **approve** → request → 2 sends, and the 2nd carries the 2nd name. *Fails on today's code.*
2. request → **reject** → request → 2 sends. *Fails on today's code.*
3. request → **withdraw** → request (inside the window) → 1 send. This proves R1 still holds.
4. A decide that is **not** a decision does not clear the slot. Covers `name_mismatch` (wrong `expectedName`) and `name_taken` (unique-violation on apply): request → failed decide → withdraw → request → 1 send.
5. After a decision the fresh slot still protects: request → approve → request → withdraw → request → 2 sends.

Order: write cases 1–2 first, run them, and confirm they fail on today's code (verification step 2). Then implement.

## Step 3 — docs
- Runbook `:239`: change "(a player is notified at most once per 10 minutes)" to say a player is notified at most once per 10 minutes, **except that once you approve or reject, their next request notifies at once**.
- Add a 2–3 line note near the top of "Deciding a request" (`:177`) with the same rule. It should also say that withdraw → re-request inside 10 minutes is **not** re-sent, so those requests show only in the daily digest's count. This covers the brief's point that the rule "is not visible anywhere an operator would look".
- No secrets, hosts or ids anywhere. Tests use only synthetic ids.

## Verification
1. Owner rule recorded verbatim (Step 0).
2. New cases 1–2 shown red before the change and green after.
3. The R1 block (`:392-451`) is unchanged in the diff and still passes.
4. `npm test -- tests/profile-server/NameChangeRepository.test.ts`, then full `npm test` and `npm run lint`. If the known `supertest` flake appears, re-run and say so.
5. **Not run by me:** `npm run test:integration`. No DB behaviour changes, and it needs the local Postgres container. I'll state that in the hand-off.
6. **Owner-run, live, after a profile-server deploy:** request → approve → new request within 10 min → a 2nd Telegram message arrives. No agent can claim this.

## Edge cases considered
- Restart: the map resets, which is harmless and unchanged.
- Decide on a request whose alert was itself suppressed: clearing is still correct.
- Approve race `name_taken`: the row stays pending and the slot is kept. That is correct, since the operator hasn't finished.
- A griefer parking requests under someone else's id: each extra alert still needs an operator decision.
- A second instance: none exists today (`Server.ts:164`). If one is ever added, the wiki's existing "(c) in-process" caveat already covers it.

## If the owner picks (b) or (c) instead
- **(b)**, i.e. (a) plus a trailing "another request came in" notice when the window ends: adds a per-player `setTimeout` (unref'd, lost on restart), a "was suppressed" flag, a new message text, never-throw handling for the timer's send, and fake-timer tests for "exactly once". That is roughly 3× the code. Task `0315` (the digest lists pending names) already covers much of this need.
- **(c)**, a shorter window: a one-constant change plus a test update. It **narrows the gap but does not close it**. Today's gap was about 3 minutes, and any window longer than the operator's decision time still drops some alerts. Being shorter also weakens R1's flood protection.

## Owner ruling on the Step 0 rule (2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- Question: "How should a new name request after you've decided reach you, while still stopping spam?"
- Answer: **"(a) Decision resets the limit (Recommended)"** — option text: "Once you approve or reject, that player's next request messages you at once. Withdrawing doesn't reset it, so ask/withdraw/ask spam stays at 1 per 10 minutes. Only you can decide, so players can't abuse it. About 5 lines + tests."
