# 5M Starting Gold Public Modifier

**Source**: `ai-agents/tasks/done/0042-starting-gold-public-modifier/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0042 / public weird-setting rotation

## Goal

Add a bounded economic-boost variety modifier to the public weird-setting rotation: a one-time **5,000,000 starting gold** grant for real players (humans and human-like AI-fill), giving an opening salvo (a silo + ~5 atom bombs) after which normal economy resumes. Locked decisions (Mark, 2026-06-13): recipients are `PlayerType.Human` and `PlayerType.AiPlayer` only — nations (`FakeHuman`) and filler bots (`Bot`) start at 0; amount 5M (single tunable constant); public rotation only, no custom-lobby UI.

## Key Changes

Unlike the earlier weird modifiers, this one required a **new `GameConfig` field**, touching schema plus every config literal (desync-sensitive — the sim runs on both client and server, so every literal must agree):

- `src/core/Schemas.ts` — `startGold: z.number().int().nonnegative().default(0)` (owner-ruled `.default(0)`: old replays keep parsing and stale clients keep working; Zod v4's output type still requires the field, so TypeScript enforces every literal).
- `src/core/configuration/Config.ts` + `DefaultConfig.ts` — `startGold(playerInfo)` gated on player type (Human/AiPlayer get the config value, FakeHuman/Bot get 0), mirroring `startManpower`.
- `src/core/game/PlayerImpl.ts` + `GameImpl.ts` — constructor takes `startGold`; `_gold` no longer hardcoded `0n`.
- Every `GameConfig` literal site (`GameManager`, `MapPlaylist`, `Main.ts` ×2, `SinglePlayerModal`, `HostLobbyModal`, test fixtures) carries `startGold: 0`; `GameServer.updateGameConfig` gains the override clause.
- `src/server/MapPlaylist.ts` — `WEIRD_SETTING_OPTIONS` fifth entry `() => ({ startGold: 5_000_000 })`. The 20% weird-match budget is now split five ways (~4% each).
- `src/client/PublicLobby.ts` + localization — `startGold > 0` derives the lobby badge `modifier_starting_gold` ("5M Starting Gold" / "5М золота", both files in sync).
- Tests: new `tests/core/game/StartGold.test.ts` (all four player types × modifier on/off); `MapPlaylist.test.ts` grown to five options with a selection test. Full suite 88 suites / 694 tests green; clean `tsc` proves literal coverage.

## Outcome

Public matchmaking can now roll a bounded starting-gold match. No commit at close; deploy is owner-side, targeted at a weekend low-traffic window.

**Carried caveats (agent-closed, not owner-verified):**

- **Post-deploy live check still owner-side:** badge shows on modified lobbies; 5M lands for humans + AI-fill only; unmodified matches unaffected; opening pace bounded — the 5M constant is flagged for tuning if openings feel nuke-heavy. No per-modifier analytics dimension exists, so the live spot-check is the gate.
- **Deploy-window desync-kick accepted risk:** stale clients mid-deploy lack the `startGold` field and can be desync-kicked from *modified* matches until refresh (inherent to any sim-affecting config field; weekend deploy is the mitigation).
- **R1 accepted residual:** Zod v4 `.partial()` still materializes the `.default(0)`, so every PUT `/api/game/:id` carries `startGold: 0` and the update guard is always-true for this field — a dead guard today (no legitimate nonzero private-lobby path exists), but whatever task opens private-lobby starting-gold UI must make the field truly optional or rework the guard.
- **R2 informational:** weird-option selection uses global `Math.random()`, not the injected RNG — pre-existing seam, predates this task.

## Related

- [[tasks/sprint4b-weird-setting-modifier]] — the weird-setting system this adds the fifth sub-option to
- [[decisions/sprint-4]] — carried as an independent Sprint 4 match-quality task
