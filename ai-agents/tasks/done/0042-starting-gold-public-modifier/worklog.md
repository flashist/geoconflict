# Worklog — 0042 "5M Starting Gold" public modifier

**Build session:** 2026-08-14, fkit-coder Build worker spawned by `fkit-sprint-ship-loop`
(owner approved the plan via AskUserQuestion in the lead session, 2026-08-14).
**Plan:** `plan.md` in this folder (blob `da86f1a72d9c4790e6dd16a2d74a18049be759bb`, verified at build start).

## Changes

Implemented exactly the approved plan; no scope added.

### Schema + config (plan steps 1–2)
- `src/core/Schemas.ts` — `GameConfigSchema`: added `startGold: z.number().int().nonnegative().default(0)`
  next to `infiniteGold` (owner-ruled `.default(0)`: old replays keep parsing, stale clients keep
  working; Zod v4 output type still requires the field, so TS enforces every literal).
- `src/core/configuration/Config.ts` — added `startGold(playerInfo: PlayerInfo): number;` next to
  `startManpower`.
- `src/core/configuration/DefaultConfig.ts` — implemented per the brief's locked snippet: returns
  `this._gameConfig.startGold` for `Human`/`AiPlayer`, `0` for `FakeHuman`/`Bot`. Placed after
  `startManpower`.

### Core sim apply (step 3)
- `src/core/game/PlayerImpl.ts` — constructor gains `startGold: number` after `startTroops`;
  `this._gold = toInt(startGold)` (was hardcoded `0n`).
- `src/core/game/GameImpl.ts` — `addPlayer` passes `this.config().startGold(playerInfo)`.

### GameConfig literal sites (step 4)
- `src/server/GameManager.ts` — `startGold: 0` before the `...gameConfig` spread.
- `src/server/MapPlaylist.ts` — `startGold: 0` in the public-config literal.
- `src/client/Main.ts` — `startGold: 0` in both the tutorial and mission singleplayer configs.
- `src/client/SinglePlayerModal.ts`, `src/client/HostLobbyModal.ts` — `startGold: 0` (no lobby UI,
  out of scope per brief).
- `src/server/GameServer.ts` — `updateGameConfig`: `startGold` override clause parallel to
  `infiniteGold`.

### Modifier + badge (steps 5–6)
- `src/server/MapPlaylist.ts` — `WEIRD_SETTING_OPTIONS` fifth entry `() => ({ startGold: 5_000_000 })`
  (adds only; existing four untouched; 20% weird budget now ≈4% each).
- `src/client/PublicLobby.ts` — `getWeirdModifierLabel`: `startGold > 0` →
  `public_lobby.modifier_starting_gold` (placed after the `infiniteGold` case; options mutually
  exclusive in rotation).
- `resources/lang/en.json` — `"modifier_starting_gold": "5M Starting Gold"`.
- `resources/lang/ru.json` — `"modifier_starting_gold": "5М золота"` (owner-ruled short form).

### Tests (step 7)
- `tests/util/Setup.ts` — `startGold: 0` in the default test config.
- `tests/core/game/StartGold.test.ts` — **new**: with `startGold: 5_000_000`, Human/AiPlayer get
  `5_000_000n`, FakeHuman/Bot get `0n`; with `startGold: 0`, all four types get `0n`.
- `tests/server/MapPlaylist.test.ts` — `testGameConfig()` gains `startGold: 0`; expected weird-options
  array grown to five ending `{ startGold: 5_000_000 }`; new selection test (Math.random mocked to
  0.9 → index 4) asserts `startGold === 5_000_000` and `infiniteGold === false`.
- `tests/client/MatchStartAnalytics.test.ts` — `startGold: 0` added to its `GameStartInfo` fixture
  (TypeScript-sweep catch; site not in the plan's explicit list — see decision log).

## Verification (step 8)

All run 2026-08-14 on this working tree:

- `npx tsc --noEmit` — **clean** (proves every `GameConfig` literal site carries `startGold`).
- `npm test -- tests/server/MapPlaylist.test.ts tests/core/game/StartGold.test.ts` — **2 suites,
  14 tests, all pass**.
- `npm test` (full) — **88 suites, 694 tests, all pass**.
- `npm run lint` — **clean**.
- Not verified here (owner-side, post-deploy per brief): live badge display, live 5M grant in a real
  modified public match, opening-pace feel (5M constant flagged for tuning if openings feel unbounded).

No commit, no task-file moves, no wiki writes. Pre-existing working-tree work (0019/0046/0041/0049)
untouched — my diff is exactly the files listed above plus this worklog.

## Decision log

- **TypeScript-sweep addition:** `tests/client/MatchStartAnalytics.test.ts` fixture needed
  `startGold: 0` (a `GameStartInfo`-typed literal the plan's explicit list missed; the plan's step 4
  explicitly delegated to the compile sweep). Mechanical, in-plan, verified by clean `tsc` + green
  suite.
- Otherwise **none** — no unattended fixes, no obvious-winner calls; build followed the approved plan
  as written, including both owner rulings (`.default(0)`, ru "5М золота").
