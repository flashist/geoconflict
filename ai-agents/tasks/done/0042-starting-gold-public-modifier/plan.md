# Approved Plan — 0042 Public Modifier: "5M Starting Gold"

> Approved by the owner via AskUserQuestion in the fkit-lead session, 2026-08-14, during a
> `/fkit-sprint-ship-loop` run. Owner rulings at the gate: (1) plan approved; (2) schema field is
> `.default(0)` (old replays keep parsing; stale clients keep working; TS still forces the field
> into every literal); (3) RU badge copy is **"5М золота"** (short form; en "5M Starting Gold" per
> brief).
> Plan body below is the coder plan-worker's returned text, copied verbatim by the driver.

## Plan — Task 0042: "5M Starting Gold" public weird-setting modifier

Planned against the current working tree (0019/0046/0041 changes untouched). Brief: `ai-agents/tasks/done/0042-starting-gold-public-modifier/brief.md`. All brief claims verified against code; line numbers below are actuals from today's tree (some drifted a few lines from the brief).

### Verified ground truth

- `WEIRD_SETTING_OPTIONS` has 4 entries, `MATCH_MODIFIERS` has only `weird_setting` (`src/server/MapPlaylist.ts:30-61`), `MODIFIED_MATCH_RATE = 0.2`.
- `PlayerImpl` hardcodes `this._gold = 0n` in its constructor (`src/core/game/PlayerImpl.ts:119`); the only construction site is `GameImpl.addPlayer` (`src/core/game/GameImpl.ts:449-455`), which already fetches `startManpower(playerInfo)`.
- `infiniteGold`'s player-type predicate (`Human || AiPlayer`) is in `costWrapper` (`src/core/configuration/DefaultConfig.ts:658-663`) — the locked-decision predicate to mirror.
- Zod is **v4**; `GameConfig = z.infer<GameConfigSchema>`.
- `GameConfigSchema` is embedded in `GameStartInfoSchema` (`src/core/Schemas.ts:449`) and therefore in `GameRecordSchema` — **archived replays are re-parsed** against it (`src/server/Archive.ts:25,77`, `src/client/JoinPrivateLobbyModal.ts:263`) and **clients' create-lobby requests are parsed** by `CreateGameInputSchema` (`src/server/Worker.ts:131`). This drives the one design choice below.

### Design choice: `startGold: z.number().int().nonnegative().default(0)` — the brief's "lower-edit alternative", chosen for compatibility, not edit count

The brief leaves required-vs-`.default(0)` as coder's call, leaning "consistent with `infiniteGold` (required)". I recommend **`.default(0)`**, for a reason the brief doesn't list:

- **Strictly-required breaks old data and stale clients.** Pre-change archived game records (replay files) would fail `GameRecordSchema.parse`, and a stale cached client bundle (common in the Yandex iframe) creating a private/single lobby would fail `CreateGameInputSchema.safeParse` on the server until refresh.
- **`.default(0)` loses no strictness where it matters.** In Zod v4, a `.default()` field is still **required in the inferred output type** — so TypeScript still forces `startGold` into every `GameConfig` literal (all the sites in step 4 below get compile-enforced anyway, keeping the "every literal carries the value" desync guarantee). The default only relaxes the *parse* boundary, exactly where old data lives.

If the owner prefers strict consistency with `infiniteGold`, the plan is identical minus `.default(0)` — but then old replays stop parsing; I'd want that accepted explicitly.
**[Owner ruled 2026-08-14: `.default(0)` approved.]**

### Steps

**1. Schema — `src/core/Schemas.ts` (~line 173, next to `infiniteGold`)**
Add `startGold: z.number().int().nonnegative().default(0)`.

**2. Config interface + default impl**
- `src/core/configuration/Config.ts` (~line 108/117): add `startGold(playerInfo: PlayerInfo): number;` next to `startManpower`.
- `src/core/configuration/DefaultConfig.ts`: implement exactly as the brief's locked snippet — return `this._gameConfig.startGold` for `Human`/`AiPlayer`, `0` for `FakeHuman`/`Bot`. Place near `startManpower` (~line 896).

**3. Apply at player creation (core sim — deterministic)**
- `PlayerImpl` constructor: add `startGold: number` param after `startTroops`; `this._gold = toInt(startGold);` (replacing `0n`). Constructor-param approach per the brief's recommendation — atomic init, mirrors `startTroops`; only one construction site exists so the churn is one call.
- `GameImpl.addPlayer` (~line 449): pass `this.config().startGold(playerInfo)`.
- Determinism: server never simulates; all clients get the identical config from the single server-sent `GameStartInfo`, so identical grants everywhere. (One deploy-window caveat — see Risks.)

**4. Every `GameConfig` literal (TypeScript will enforce this list once the schema lands)**
- `src/server/GameManager.ts:60` area → `startGold: 0` (before the `...gameConfig` spread).
- `src/server/MapPlaylist.ts:158` area → `startGold: 0` in the public-config literal.
- `src/client/Main.ts` ~824 and ~896 (tutorial + mission singleplayer configs) → `startGold: 0`.
- `src/client/SinglePlayerModal.ts:566`, `src/client/HostLobbyModal.ts:751` → `startGold: 0` (no new lobby UI — out of scope per brief).
- `src/server/GameServer.ts` `updateGameConfig` (~line 137): add `if (gameConfig.startGold !== undefined) { this.gameConfig.startGold = gameConfig.startGold; }` parallel to the `infiniteGold` clause.
- Compile check will flag any literal site the brief missed; I'll sweep with the build/lint rather than trusting the list.

**5. The modifier — `src/server/MapPlaylist.ts` `WEIRD_SETTING_OPTIONS`**
Append `() => ({ startGold: 5_000_000 })` as the fifth entry. Adds only; touches no existing entry. Rotation math: 20% weird budget now split 5 ways ≈ 4% each.

**6. Lobby badge + localization**
- `src/client/PublicLobby.ts` `getWeirdModifierLabel()` (line 23): add `if (gameConfig.startGold > 0) return translateText("public_lobby.modifier_starting_gold");` (options are mutually exclusive in the rotation; order within the chain is immaterial).
- `resources/lang/en.json` + `resources/lang/ru.json` `public_lobby` section (both, kept in sync per project rule): `modifier_starting_gold` — en `"5M Starting Gold"`, ru **"5М золота"** (owner-ruled 2026-08-14, short form matching existing badge widths).

**7. Tests (mandatory — `src/core/` is touched)**
- `tests/util/Setup.ts:68` area: add `startGold: 0` to the default test config (individual tests override via the existing partial spread).
- **New core test** (e.g. `tests/core/game/StartGold.test.ts`, using the existing `setup(...)` + `playerInfo(name, type)` helpers):
  - config `{ startGold: 5_000_000 }` → newly added `Human` and `AiPlayer` have `gold() === 5_000_000n`; `FakeHuman` and `Bot` have `0n`.
  - default config (`startGold: 0`) → all four types start at `0n` (regression guard).
- `tests/server/MapPlaylist.test.ts`:
  - `testGameConfig()` (line 26): add `startGold: 0`.
  - "weird setting options cover the expected public variants" (line 105): expected array grows to **five**, ending `{ startGold: 5_000_000 }`.
  - New selection test (mirror the line-143 pattern, selector ≈ 0.9 to hit index 4): applying the fifth option yields `startGold === 5_000_000` and leaves `infiniteGold === false`.
  - Existing registry/rate assertions unchanged — they should still pass.

**8. Verification (pre-hand-off)**
- `npm test -- tests/server/MapPlaylist.test.ts` + new core test + full `npm test` (catches any fixture that builds a raw `GameConfig`).
- `npm run lint`; client+server compile via the test/build toolchain to prove every literal site is covered.
- No commit, no task-file move, no wiki write.

### Edge cases / risks

- **Stale-client desync window (deploy-time, inherent):** a cached old bundle in a *modified* public match strips the unknown `startGold` key (Zod default behavior), computes 0 gold while fresh clients compute 5M → hash mismatch → the stale client gets desync-kicked until refresh. Same class of risk as any prior sim-affecting config field; weekend low-traffic deploy (per brief) is the mitigation. Not code-fixable in this task; flagging so it's an accepted residual, not a surprise.
- **Old replays:** handled by `.default(0)` (the strict alternative breaks them — the core of the design choice above).
- **`toInt` on 5,000,000** — well inside safe-integer range; no bigint conversion hazard.
- **Interaction with `infiniteGold`:** rotation never sets both; if a hand-built config ever did, the combination is harmless (5M grant + free builds).
- **Live verification (post-deploy, owner-side per brief):** badge shows, humans/AI-fill start with 5M, nations/bots don't, unmodified matches unaffected, openings feel bounded (else flag the 5M constant for tuning). No new analytics event — the live spot-check is the gate.

Effort ≈ 1 day, matching the brief.
