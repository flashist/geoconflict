# AI Players Feature

**Status**: active
**Source files**: `src/server/GameServer.ts`, `src/core/GameRunner.ts`, `src/core/execution/ExecutionManager.ts`, `src/core/configuration/DefaultConfig.ts`

## Summary

AI Players join public lobbies during the preparation countdown to simulate healthy player presence. They appear indistinguishable from real humans in UI and leaderboard (no bot/nation label), participate in the match using AI logic, and yield priority to human players who join. They are a new entity type (`PlayerType.AiPlayer`) distinct from existing `PlayerType.FakeHuman` nations.

Source: `ai-agents/tasks/done/0074-ai-players-standalone/brief.md`

> **Note:** `PlayerType.AiPlayer` is wired across 10+ files. `ExecutionManager.aiPlayerExecutions()` drives AI behaviour — 📌 **by constructing `FakeHumanExecution`, the very same class Nations use** (`src/core/execution/ExecutionManager.ts:154-162` vs `:139-151`), which in turn uses shared `BotBehavior` logic. **There is no `AiPlayerExecution` class**; the `0074` spec proposed one and it was never built. The spec was written as "standalone reset" — the prior iteration was discarded and this is the canonical implementation.
>
> ⚠️ **"Confirmed active in production" is an assertion this page has carried since ingest and that the 2026-09-03 glossary pass did NOT verify** — the code path was re-checked and is fully wired, but no server was contacted. See [[systems/glossary]].

## Scope

**In:** public lobbies only, lobby population display includes AI players, AI participates in match with `BotBehavior` logic, `PlayerType.AiPlayer` appears in "Players only" leaderboard filter, MEDIUM difficulty, deterministic name/ID assignment.

**Out:** explicit AI disclosure in UI, nations renamed/repurposed, persistent AI profiles, new chat behaviors.

## Implementation

### Entity Type

New `PlayerType.AiPlayer = "AIPLAYER"` — must have real synthetic `clientID` values (8-char `[a-zA-Z0-9]`, deterministic from `simpleHash(lobbyId) + joinIndex`). Nations remain `PlayerType.FakeHuman`.

`GameStartInfo` is extended with `aiPlayers?: { clientID: ClientID; username: string }[]`. This list is identical on all clients.

### Name Allocation

- Humans use `Anon1000–Anon9999`
- AI Players use `Anon0000–Anon0999`
- Selection: `PseudoRandom(simpleHash(lobbyId))` shuffle, consumed in join order

### Lobby Algorithm (public lobbies only)

During preparation countdown:
1. Target curve: `targetTotal(t) = floor(min(capacity, targetTotalByTimeout) * clamp01(t_passed / TIMEOUT_SEC))`
2. Human priority: if lobby is full and a human joins, remove the last-joined AI player to make room
3. AI cap: `N_ai <= aiPlayersMax`
4. Inject AI to meet target using jitter delays (deterministic RNG per `lobbyId + joinIndex`)

### In-Match Behavior

AI Players are created in `GameRunner` from `gameStartInfo.aiPlayers`. `ExecutionManager.aiPlayerExecutions()` drives them through `FakeHumanExecution`, which initializes shared `BotBehavior` logic. AI execution randomness is seeded by `gameID + playerID` for determinism.

### Winner Flow

AI Players need a valid `clientID` so `GameImpl.makeWinner()` returns a real winner. Win modal resolves winner via `playerByClientID` normally.

📌 **Ruled 2026-09-03 — ADR-110: an AI player MAY be declared the winner**, as **one policy across FFA and Team mode**. The win-condition predicate stays `clientID() !== null` with **no `PlayerType.AiPlayer` exclusion — do not add one.** Players see an `Anon0xxx` name in the win modal with **no indication it was synthetic**; that is now a deliberate recorded choice, not an accident of the predicate. An AI winner is **credited nothing** — what the award does is **unblock match-end XP crediting for every real player in the match**.

> 🔴 **UPDATED 2026-09-04 — ADR-110 NOW RULES ON A PREDICATE THAT EXISTS IN NO SHIPPED CODE.** `0206` (FFA) was **reverted and never deployed**; `0205` (Team) is **unbuilt**. ⛔ **The decision is UNAFFECTED and is NOT superseded** — it is a live policy awaiting its first implementation. ✅ Its **only in-code trace** is one comment in `WinCheckExecution.ts`, deliberately kept through the revert.
>
> ⏳ **And its T1 argument has a SCHEDULED EXPIRY.** T1 says an AI winner is valuable because it **unblocks crediting for everyone** — true today (`creditMatchXp`'s sole call site is inside `handleWinner`), but [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`) is **designed to remove exactly that**. ⛔ **This does NOT fire the ADR's re-raise trigger** (which reads *winner-**dependent***; `0211` makes it **less** so) — **but weigh T1 as EXPIRING, not settled.**

> 🔴 **ADR-110 CARRIES A KNOWN EXPIRY.** The owner accepted it knowing a durable, player-visible winner record is **planned** ("None today, but planned"), so the counter-argument was **overridden with eyes open, not refuted**. It **must be re-examined before any leaderboard, match history, announcements feed, share card, or other surface naming a winner outside the end-of-match modal ships.** ⛔ Do not treat `accepted` as licence to build such a surface assuming AI winners are fine in it. See [[decisions/adr-110-ai-winner-allowed]].

🚩 **A doc comment nearby gets this backwards** — `WinModal.buildPlayerParticipation` claims AI players are skipped from participation; the skip is on `clientID === null`, which **includes** them. Filed as task `0207`, comment-only: [[tasks/winmodal-participation-comment-correction]].

### Config (`ServerConfig` extension)

```ts
aiPlayersConfig(): AiPlayersConfig
// {
//   enabled, timeoutSec, tickMs, targetTotalByTimeout,
//   aiPlayersMax, humanPriority, minHumanSlots,
//   joinJitterMs, name, difficulty
// }
```

Default config is behind a feature flag in prod.

## UI Rules

AI Players are indistinguishable from humans:
- No "nation" or "bot" label
- Included in "Players only" leaderboard filter
- Affected files: `Leaderboard.ts`, `PlayerPanel.ts`, `PlayerInfoOverlay.ts`

## Determinism / Desync Safety

All AI names, IDs, and execution randomness must be seeded deterministically. Any nondeterministic AI behavior risks desync across clients.

## Implementation Order

1. Add `PlayerType.AiPlayer`
2. Extend `GameStartInfoSchema` with `aiPlayers`
3. Server AI lobby injection → include in `GameStartInfo`
4. Create AI Player entities in `GameRunner`
5. Route AI Players through `ExecutionManager.aiPlayerExecutions()` and shared `FakeHumanExecution` / `BotBehavior` logic
6. Update UI to treat `AiPlayer` as human
7. Verify winner flow

## Intent → Execution Flow

There is no direct player-facing intent for AI creation. The server and shared core synthesize the flow:

1. Public-lobby server logic decides whether to inject AI joiners into `gameStartInfo.aiPlayers`
2. `GameRunner` materializes those entries as `PlayerType.AiPlayer`
3. `ExecutionManager` includes them in automated execution scheduling
4. `BotBehavior`-driven AI actions emit the same normal game `Intent` objects and downstream `GameUpdate`s as any other player

## Related

- [[systems/glossary]] — **the canonical `PlayerType` taxonomy**: an AI player runs the same `FakeHumanExecution` as a Nation and differs only in having a real `clientID`
- [[systems/game-overview]] — overall game architecture (its player-types table was merged into the glossary 2026-09-03)
- [[features/tutorial]] — tutorial also uses bot-filled lobbies for context
- [[tasks/ai-lobby-slot-bug]] — Sprint 4 bug fix documenting human-priority slot preservation
- [[tasks/leaderboard-player-count]] — leaderboard count uses the same human-like treatment for `PlayerType.AiPlayer`
- [[tasks/sprint4b-mini-mode-investigation]] — confirmed AI Players can fill Duos/Trios/Quads public lobbies
- [[tasks/sprint4b-duos-trios-quads]] — re-enabled public Duos/Trios/Quads lobbies using AI-filled participant counts
- [[decisions/sprint-4]] — planning pages now explicitly treat AI Players as already-live context
- [[tasks/win-check-clientless-leader-guard]] — task 0022; the win-condition predicate is `clientID() === null`, so it catches **Nations (`PlayerType.FakeHuman`) as well as bots** — public FFA carries both
- [[decisions/clientless-leader-win-policy]] — what happens when one of these clientless players leads at the win threshold, and why the match's XP is currently lost
- [[decisions/adr-110-ai-winner-allowed]] — the 2026-09-03 ruling that an AI player may be declared winner, **and the expiry that rides with it**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team-mode half of the same predicate
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the participation comment that misdescribes this player type
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the FFA award an AI player would have been eligible for. 🔴 **REVERTED 2026-09-04 — never deployed**
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which **expires ADR-110's T1 argument** by making crediting independent of any winner
