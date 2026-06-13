# Task — Player Profile: Match-End XP Crediting (T6)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 6 of 8. Implements the **game-server half of Part E**.

## Sprint
Sprint 4

## Priority
High — delivers server-authoritative earned XP. **This is the production-verification gate: the Citizenship Core UI task must not start until this is verified in production.**

## Depends on
T3 (server-visible `yandexPlayerId`), T5 (the `/internal/v1/credit` endpoint).

## Blocks
Citizenship Core UI task (depends on this being live + verified in prod).

## Context
At match end the game server credits 10 XP to each qualifying authenticated player by calling the profile API. The game server is a turn relay and does not run the simulation, so it needs a compact end-of-match participation summary from the client to determine qualification reliably. Crediting must be **fail-soft**: a profile-server outage must never stall or error a match.

## Scope
1. **Protocol extension (`src/core/Schemas.ts`):** add to `ClientSendWinnerMessage`:
   ```ts
   playerParticipation: z.array(z.object({
     persistentId: z.string(),
     hasSpawned: z.boolean(),
     isAliveAtEnd: z.boolean(),
     killedAt: z.number().optional(),
   })).optional()
   ```
2. **Client:** populate `playerParticipation` before sending the winner message.
3. **`src/server/ProfileApiClient.ts`:** thin HTTP client to `PROFILE_API_URL` calling `POST /internal/v1/credit` with `PROFILE_INTERNAL_TOKEN`. Fire-and-forget with bounded at-least-once retry; idempotency on `(game_id, yandex_player_id)` makes retries safe.
4. **`GameServer.handleWinner()`:** for each client with a `yandexPlayerId`, credit 10 XP only if:
   - `hasSpawned === true`,
   - player did not voluntarily leave,
   - player was not disconnected at end without returning,
   - `isAliveAtEnd === true` OR `killedAt` is set.
   Batch qualifying players into one internal call (or `Promise.all()` the calls). **Never** block or delay match cleanup; a failed credit must not error the match.

## Out of scope
- The profile API / repository (T5).
- Guest path (T2) and login migration (T7).

## Acceptance / Verification
- Epic Verification #4 (end-to-end): triggering match-end crediting twice for the same `game_id` credits once.
- Epic Verification #7: normal match flow works with no DB/credit-related errors in server logs.
- Qualifying players are credited; players who never spawned / left mid-game / were disconnected-at-end are not.
- With the profile server intentionally down, matches still complete and clean up normally (fail-soft proven).

## Notes
- Reuse the qualification predicate definition shared with T2 to prevent client/server drift.
- Crediting is server-authoritative; the client's `playerParticipation` is an input, but the *decision and the write* happen server-side.
