# Plan — 0374: lobby windows end their joining mark when they close

I wrote nothing. This is a plan only.

## What I found (current working tree)
- **Host window** (`src/client/HostLobbyModal.ts`): `open()` (~:669) takes the mark with `const endJoining = beginJoiningLobby()`. The only place it ends is `joined.catch(() => {}).finally(endJoining)` (~:693). Closing calls `reset()` (~:725), which bumps `openGeneration` but leaves the mark alone. This is R1.
- **Join window** (`src/client/JoinPrivateLobbyModal.ts`): `joinLobby()` (~:224) takes the mark and ends it only in `finally` (~:252). Closing calls `reset()`, which bumps `closeGeneration` but leaves the mark alone. This is R2. The Join button stays enabled while a lookup runs, so two lookups can overlap, each holding its own mark (existing test J5). One field per window is therefore not enough; I use a set of marks.
- `reset()` is called only by the two close paths in each window: `close()` and `handleModalClose`. o-modal's `close()` always fires `modal-close`, so a programmatic close runs `reset()` twice. The fix has to be safe to run twice.
- Success path: Main's `handleJoinLobby` (Main.ts:756) calls `beginJoiningLobby()` on its first line, before any await. So Main's mark is taken synchronously inside the `join-lobby` dispatch, before the window's own end runs. I keep that order as it is.
- Two existing tests assert today's buggy behaviour and have to be flipped:
  - **H3** in `tests/client/HostLobbyOpen.test.ts`: "✕ before create answers: the waiter resolves once create settles".
  - **J4** in `tests/client/JoinPrivateLobbyModalLeave.test.ts`: "✕ during the lookup: the waiter resolves once the lookup settles".
- The 0353 and 0380 changes in HostLobbyModal stay as they are: `clients = []` in `open()`, `pollPlayers`, `copyToClipboard`.

## Change (`src/client/` only; `StartScreenPresence.ts` unchanged)
The same small pattern goes in each window.

1. Add a field and two private helpers to each class:
   ```ts
   // Task 0374: joining marks this window still holds, so a close ends them
   // instead of leaving them to a request that may hang.
   private joiningMarkEnds = new Set<() => void>();
   private beginJoiningMark(): () => void {
     const end = beginJoiningLobby();
     const endThisMark = () => {
       this.joiningMarkEnds.delete(endThisMark);
       end(); // already one-shot in StartScreenPresence
     };
     this.joiningMarkEnds.add(endThisMark);
     return endThisMark;
   }
   private endJoiningMarks(): void {
     for (const end of [...this.joiningMarkEnds]) end();
   }
   ```
2. **Host window:**
   - In `open()`, swap `beginJoiningLobby()` for `this.beginJoiningMark()`. The settle chain keeps calling the local end function for its own opening.
   - In `reset()`, call `this.endJoiningMarks()` right after `openGeneration++`.
   - Update the 0336 comment so it says the mark ends on settle or on close.
3. **Join window:**
   - In `joinLobby()`, swap `beginJoiningLobby()` for `this.beginJoiningMark()`.
   - In `reset()`, call `this.endJoiningMarks()` next to `closeGeneration++`.
   - Same comment update.
4. **Why the brief's cases hold:**
   - **Close while the request hangs:** `reset()` ends the mark, and waiters wake.
   - **Late settle after a close:** it calls an end that is already spent, so nothing happens. The generation checks already stop any `join-lobby`.
   - **Host reopen race:** each opening holds its own end function. The first close empties the set. The second opening adds a new mark. A late settle from the first opening only calls the first, already-spent end.
   - **Double `reset()`:** the second call finds an empty set.
   - **Success path:** unchanged. Main's mark is taken before the window's mark ends. If the window closes later, its mark has already ended, so nothing happens.
5. **No timeout bound.** The brief only allows one as an addition, and it carries the risk of the popup opening over a window that is still open. Ending the mark on close fixes both findings without it.

## Tests (jest; reusing the existing Main stand-ins, each request held by a promise the test controls)
**`tests/client/HostLobbyOpen.test.ts`, in the "start-screen waiter during Create (0336)" describe:**
- **H3 flipped.** Close before create answers, and the waiter resolves at the close. Then create answers OK, and there is no `join-lobby`.
- **H5:** close while create hangs, then create fails. The waiter is resolved, there are no joins, and a new `whenOnStartScreen()` resolves straight away (the count did not go negative or stick).
- **H6:** the window stays open while create hangs. The waiter stays pending, including after `jest.advanceTimersByTime` well past any plausible bound.
- **H7 (reopen race):** open, keep the first `answerCreate`, close, open again. The waiter is still pending because of the second opening's mark. Then answer the first create OK: still pending, and no join. Then close: the waiter resolves.
- **H8:** a programmatic `modal.close()` while create hangs resolves the waiter, the same as ✕.
- **H4** still passes and covers the success-path "no gap" case.

**`tests/client/JoinPrivateLobbyModalLeave.test.ts`, in the "start-screen waiter during the lobby lookup (0336)" describe:**
- **J4 flipped.** Close during the lookup, and the waiter resolves at the close. Then `/exists` answers `true`, and there is no join.
- **J6:** close, then the lookup ends with not found, and in a second case with a throw. There are no joins, and a fresh `whenOnStartScreen()` resolves immediately (no double end).
- **J7:** the window stays open while the lookup hangs. The waiter stays pending.
- **J8:** two Join taps, then a close while both are pending. The waiter resolves at the close, so the set ends both marks.
- **J9:** a programmatic `modal.close()` while the lookup hangs resolves the waiter.
- **J1** still passes and covers the success path.

**Match-start case (brief step 6):** the match-start close list goes through the same `close()`, so H8 and J9 cover the window's side. Main's own mark covering the match is 0336's existing behaviour, already tested in `PreStartModals` and `CitizenshipCard`, and I do not change it.

**Run:** the two files on their own, then `npm test` and `npm run lint`. If a supertest-shaped flake shows up, re-run and say that I re-ran.
**Worklog:** says the fix is unit-tested only, with no live check (brief: the owner's live check is optional, not required).

## Risks / notes
- Ending a mark inside `reset()` wakes waiters synchronously. Their re-check runs in a later microtask, after `handleModalClose` has sent any `leave-lobby`. So the waiter sees the final state, and this is no worse than today's leave path.
- The helper is copied into both windows, about 10 lines each. I chose that over adding a new export to `StartScreenPresence.ts`, because the brief prefers that file stays as it is.

---

## Owner rulings at approval (2026-10-05, live via `AskUserQuestion` in the `fkit lead` session, `fkit-sprint-ship-loop`)

- **Plan: APPROVED** — the plan above, as written. The plan had no open questions.
