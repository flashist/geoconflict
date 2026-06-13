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
- **SECURITY — `yandexPlayerId` is UNTRUSTED (carried over from T3; raised in T3 review 2026-06-13).** The ID plumbed in T3 is a client-asserted string with **no server-side Yandex signature verification** (`ClientJoinMessage.yandexPlayerId` → `Client.yandexPlayerId`, stored as-is after only the play-token check). A modified client or guest can submit an arbitrary non-null ID, so crediting keyed directly off it would let an attacker attribute XP to a chosen profile key — corrupting Yandex-keyed profiles and undermining citizenship entitlement integrity. **Before this slice credits/upserts by `yandex_player_id`, decide and implement one:**
  - (a) **Verify a Yandex *signed* player payload server-side** — client sends `getPlayer({ signed: true })` / `player.signature`; server validates it against Yandex's public key and credits only the verified ID. (This is the verification the T3 task deferred to the Yandex Payments task; T6 is where it first matters.)
  - (b) **Keep crediting keyed to the already-verified `persistentID`** until a verified Yandex claim exists.

  Do **not** credit or grant entitlements off the raw join-field ID. Note the idempotency key `(game_id, yandex_player_id)` (Scope #3) inherits this exposure — a forged ID forges the idempotency key too.
- **CORRECTNESS — do not rely on the one-shot join-time `yandexPlayerId` (raised in T3 review 2026-06-13).** The ID is captured **once** at join via `getYandexUniqueId()`, which awaits a player promise that is **force-resolved at the platform-init deadline** (`FlashistFacade.runPlatformInit` ~L528, and the `.finally` ~L446-451) even if the real `getPlayer()` is still pending. So an **authorized** Yandex user who joins during SDK init degradation / late recovery can present `yandexPlayerId === null` — indistinguishable, at the join boundary, from a genuine guest. If this slice simply skips clients without a `yandexPlayerId`, those users **permanently lose that match's XP** with no retry path. Mitigation belongs here, not at join: **re-resolve / verify identity at match-end** (the server-side Yandex signed-payload verification above already does this) and treat "identity not yet known" distinctly from "genuine guest" — do not silently deny XP to authorized users whose ID was merely unresolved at join time.
