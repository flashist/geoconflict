# Worklog — 0377: end abandoned, unstarted private lobbies after a short idle time

## 2026-10-04 — Build (fkit-coder, Build worker of `fkit-sprint-ship-loop`)

Built against the approved `plan.md` (blob `95f7c1bd892446753fc827f463236ab33dbe8f0a`, 8226 bytes — checked
before building), with the owner's answers: **N = 30 minutes**; **Q2 = A**, the clock runs from when the last
person left (from creation if nobody ever joined). `plan.md` was not edited.

### What changed

`src/server/GameServer.ts` (+27 lines, of which about half are comments):

- `privateLobbyIdleTimeout = 30 * 60 * 1000`, a field next to `maxGameDuration`.
- `lastClientSeenAt: number`, set to `createdAt` in the constructor.
- `lastClientSeenAt = Date.now()` in three places: in `addClient` right after
  `this.activeClients.push(client)` ("Client connection accepted" — after every early return, so a kicked or
  refused client does not count); in the socket `close` handler; and in `phase()` after the stale-ping cleanup
  whenever `activeClients` is not empty.
- In `phase()`, in the private, not-started arm, before `return GamePhase.Lobby`: if no client is connected and
  `now - lastClientSeenAt > privateLobbyIdleTimeout`, log
  `info("private lobby ended, no client connected", { gameID, idleMs, anyClientJoined })` and return `Finished`.
  The 3 h check still runs first; the public branch and the started-private branch are unchanged.

`tests/server/PrivateLobbyIdleEnd.test.ts` (new): the seven tests in the plan — P3b shape (no one ever joined),
connected client keeps it, counted from leave, leave-and-rejoin, public lobby untouched, started game untouched,
ping timeout counts as leaving. Real `GameServer`, mock sockets, `jest.useFakeTimers()` + `setSystemTime`.

No client change, no `src/core/` change. The other uncommitted files in the tree belong to `0354` / `0380` and
were not touched.

### Verification (run 2026-10-04)

| Check | Result |
|---|---|
| `npm test -- tests/server/PrivateLobbyIdleEnd.test.ts` | 7 / 7 passed |
| Same file with the new rule disabled (temporary edit, then restored) | 4 failed (the 4 rule tests), 3 passed (the 3 "unchanged" guards — expected) |
| `npm test` (full, includes shell harnesses) | 190 / 190 suites, 3502 / 3502 tests passed, exit 0. No supertest flake on this run; no re-run needed. |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npx prettier --check` on both files | clean |
| Change surface | `src/server/GameServer.ts` and the new test only |

**Not verified:** live behaviour on the game server. That needs the weekend deploy plus a check (brief step 5);
under the build/verify rule it is a separate verify task, which the driver routes to a producer. Not filed here.

### Decision log

Each in-plan call made without asking, and why it qualified:

1. **`lastClientSeenAt` is set in the constructor, not as a field initializer.** The plan said "a field, starting
   at `createdAt`". A field initializer reading the constructor parameter property `createdAt` depends on
   class-field emit order; setting it in the constructor body is the same behaviour without that risk.
   Mechanical, inside the plan's intent.
2. **The `addClient` update sits right after `this.activeClients.push(client)`** — the exact "connection accepted"
   point. The plan said "after the kicked-client early return"; this point is after that one and also after the
   public-only 3-IP refusal and the persistent-id mismatch return, so no refused client counts. Matches the
   plan's stated reason ("a refused or kicked client does not count"). Obvious winner within intent.
3. **The idle check reuses `phase()`'s existing `noActive` local** (`activeClients.length === 0`, computed a few
   lines above) instead of a new expression. Same condition. Mechanical.

No review findings exist yet, so no review fix was applied.

## 2026-10-04 — Process review, round 1 (fkit-coder, Process-review worker of `fkit-sprint-ship-loop`)

Ledger `review.md`: reviewer verdict "Changes requested", findings R1 and R2 (both low). Plan checked before
starting: blob `95f7c1bd892446753fc827f463236ab33dbe8f0a`, 8226 bytes — unchanged; `plan.md` not edited. No
accepted residuals existed; no ADR in `ai-agents/knowledge-base/decisions/` covers this code. Both findings
verified CORRECT, both defects, no regression of any earlier finding (this is round 1). Ledger set to
`Status: closed-out`.

### What changed

- `src/server/GameServer.ts`, socket `close` handler: `const wasActive = this.activeClients.includes(client);`
  before the existing filter; `lastClientSeenAt = Date.now()` now only `if (wasActive)`.
- `tests/server/PrivateLobbyIdleEnd.test.ts`: 3 new tests (between-ticks leave; between-ticks join then kick;
  late close of a socket already replaced by a reconnect). 7 → 10 tests.

### Verification (run 2026-10-04)

| Check | Result |
|---|---|
| `npm test -- tests/server/PrivateLobbyIdleEnd.test.ts` | 10 / 10 passed |
| Mutants on the real file (restored after, sha checked) | R1 fix reverted → 1 red (stale-close test); close write removed → 1 red (between-ticks leave); `addClient` write removed → 1 red (join then kick) |
| `npm test` (full, includes shell harnesses) | 190 / 190 suites, 3505 / 3505 tests passed, exit 0. No supertest flake; no re-run. |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npx prettier --check` on both files | clean |

### Decision log

Each fix applied without asking, and why it qualified:

1. **R1 (stale socket close re-arms the idle clock) →** the close handler moves the clock only when its client
   was still in `activeClients`. Qualified: verified CORRECT (traced: `addClient` removes the replaced instance
   without closing its socket); mechanical and localized (one guard in one handler); inside the plan — plan
   item 3 puts the write in the close handler "so the clock starts from the moment a player actually left", and
   a replaced socket is not a player leaving. Side effect, accepted as inside the plan's stated 1 s resolution:
   a late close after `kickClient` or after the `phase()` missed-ping drop no longer moves the clock either;
   those leaves count from the last tick that saw the client (≤ 1 s earlier). The existing missed-ping test
   still passes unchanged.
2. **R2 (two clock writes untested) →** three tests added (listed above), each shown red by its own mutant.
   Qualified: verified CORRECT (reviewer's mutant reproduced in effect: every leave/join in the original
   tests coincided with a tick); test-only, in-plan (the plan's test list is the floor, and the reviewer's
   fix lives in an untested write). The `addClient` pin uses `kickClient` because, after the R1 fix, that is
   the only path where a just-joined client leaves without a counted close — a choice of test shape only, no
   behaviour change.

No obvious-winner call outside these two fixes. Nothing left for the owner from this round.
