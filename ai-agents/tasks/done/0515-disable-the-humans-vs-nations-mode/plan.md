# Plan: 0515, disable the "Humans Vs Nations" team mode

Planning only. No source and no files were written (spawned consult, so EnterPlanMode is not available and I followed the written planning-only rule instead). Plan review was off, as the caller said.

## Summary
- **Recommended shape:** turn the mode off everywhere (public rotation, private-lobby host picker, single-player picker), keep the core code, and have the worker refuse new or updated private lobbies that ask for it. Three owner decisions are below (Where, Shape, Old-client behaviour). The plan assumes the recommended options; each option says how the files change.
- **No overlap with 0509.** None of 0509's files (`FeedbackModal.ts`, `Master.ts`, both `FeedbackPlayerReference.ts`, feedback tests) are touched. `Master.ts` builds its public games through `MapPlaylist`, so it needs no edit.
- **Touchpoints:** no HTML change (so neither template is edited), no visible-text change (so `en.json`/`ru.json` stay as they are), no analytics event change. The `NationsTeam` leaf stays, but its doc paragraph in `analytics-event-reference.md` is rewritten. The only `src/core` change, `WorkerSchemas.ts`, gets a new test.
- **Knock-on to flag:** HvN was the only public Team setup with NPCs on, and the only one that always reaches a result (0205 measured Nations winning 4/4). Without it, **every** public Team match is exposed to 0205's "Bot team makes it unwinnable" problem (today 6 of 7 team setups are). Each remaining team count's share of Team lobbies goes from 1/7 to 1/6.

## What I found (evidence)
- **First disable (pre-0106):** HvN was commented out in `Schemas.ts`, `GameImpl.ts`, `DefaultConfig.ts`, `MapPlaylist.ts` and both modals. Commit `7fdd5d22` "humans vs nations reenable" undid all six.
- **Repeating that is not an option now.** `GameConfigSchema` also checks archived game records (`/api/archive_singleplayer_game` uses `PartialGameRecordSchema`), `GameStartInfo` and replays. Taking HvN out of the schema would make old HvN records and replays fail to parse, and would reject old-build single-player archives. That goes against the owner's "collect from all builds" rule.
- **Public rotation:** `src/server/MapPlaylist.ts` `TEAM_COUNTS` = `[2,3,4, HumansVsNations, Duos, Trios, Quads]`. Both `Master.ts:25` and `Worker.ts:43` build their games from `new MapPlaylist(false)`.
- **Private lobbies:** the client creates the lobby with an empty body. The settings then arrive through `PUT /api/game/:id`, which checks the body with `GameInputSchema` (`= GameConfigSchema.partial()`, `src/core/WorkerSchemas.ts`) and then calls `GameServer.updateGameConfig`. `POST /api/create_game/:id` checks `CreateGameInputSchema`. Only `Worker.ts` imports `WorkerSchemas.ts`.
- **Single player:** runs on the client (`LocalServer.ts`). No server request decides its mode, so the picker is the only place to stop it.
- **Saved settings:** none. `teamCount` is a `@state()` defaulting to `2` in both modals (`HostLobbyModal.ts:61`, `SinglePlayerModal.ts:50`). It is never written to localStorage or `UserSettings`. `Main.ts` hard-codes `playerTeams: 2`.
- **Lobbies and games at deploy time:** all lobby and game state lives in the memory of the master/worker processes, which all run in one container. `update.sh` runs `docker stop` + `docker rm` on the running container, and I found no lobby persistence (no redis or anything similar). So no HvN lobby or game survives a game deploy. Master and workers ship in the same image, so the playlist and the schema cannot be out of step.
- **Pickers:** both modals have the same inline array `[2,3,4,5,6,7,Quads,Trios,Duos,HumansVsNations]` (`HostLobbyModal.ts:369-378`, `SinglePlayerModal.ts:201-210`). Each also has HvN-only branches: the label, hiding the "disable NPCs" checkbox, and forcing `disableNPCs:false` in the payload.
- **Tests naming HvN:** `tests/server/MapPlaylist.test.ts:51` asserts the full `TEAM_COUNTS` list. `tests/HumansVsNations.test.ts`, `tests/core/executions/WinCheckExecution.test.ts` (Nations-team leaf) and `tests/client/WinConditionAnalytics.test.ts` cover core code that stays, so they stay unchanged.

## Steps (assuming the recommended options)

1. **`src/server/MapPlaylist.ts`:** remove `HumansVsNations` from `TEAM_COUNTS`. Replace the now-wrong comment `// Flashist Adaptation: keep Humans vs Nations in the public rotation.` with a one-line reason: `// Flashist Adaptation: Humans Vs Nations left out of the public rotation (0515): unbalanced against humans when a match is not full.` Keep the `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations` line and its import unchanged, so turning it back on means editing only the list.
2. **`src/core/WorkerSchemas.ts`:** add a refine, "playerTeams is not `HumansVsNations`" (path `playerTeams`, message `Humans Vs Nations is no longer available`).
   - Applied to the `GameConfigSchema` branch of `CreateGameInputSchema` and to `GameInputSchema`.
   - Not applied to `GameConfigSchema` itself, so records, replays, start info and archives still parse.
   - A PUT without `playerTeams` still passes.
   - One-line comment: why it is refused here and not in `GameConfigSchema`.
   - Effect: the worker answers 400 for a create or update that names HvN. The routes in `Worker.ts` stay unchanged; they already turn a schema failure into a 400.
3. **`src/client/TeamCountOptions.ts` (new):** `export const TEAM_COUNT_OPTIONS: readonly TeamCountConfig[] = [2,3,4,5,6,7,Quads,Trios,Duos];`, using a type-only import of `TeamCountConfig` and a runtime import of `Duos/Trios/Quads` from `core/game/Game`.
   - It is deliberately typed `TeamCountConfig[]` and not `as const`. With `as const`, the modals' remaining `o === HumansVsNations` checks would fail type-checking (TS2367, "no overlap").
   - Two-line comment: HvN is left out on purpose (0515), and turning it back on means re-adding it here, in `MapPlaylist`, and dropping the `WorkerSchemas` refine.
   - Why a new module: both modals currently repeat the same inline array. A shared list removes the copy and is the only practical way to test "not offered" without rendering Lit modals in jsdom.
4. **`src/client/HostLobbyModal.ts` and `src/client/SinglePlayerModal.ts`:** replace the inline arrays with `TEAM_COUNT_OPTIONS`. Nothing else changes. The HvN branches (label, NPC-checkbox hiding, `disableNPCs:false` forcing) can no longer be reached but are kept, which matches the "hide, keep the code" option. `PublicLobby.ts` keeps its HvN label branch unchanged, as a fallback.
5. **Tests:**
   - `tests/server/MapPlaylist.test.ts` (update, not delete): `TEAM_COUNTS` becomes `[2,3,4,Duos,Trios,Quads]` plus `not.toContain(HumansVsNations)`. New test: 300+ generated configs never have `playerTeams === HumansVsNations`, every Team config has `disableNPCs === true`, and 2/3/4/Duos/Trios/Quads all still appear. The rotation test "random team count can select every allowed public team mode" adjusts on its own.
   - **New test file `tests/core/WorkerSchemas.test.ts`** (needed by the `src/core` rule): `GameInputSchema` rejects `{playerTeams: HumansVsNations}` and accepts `{playerTeams: 2}`, `{playerTeams: Duos}` and `{gameMap: …}` without `playerTeams`. `CreateGameInputSchema` rejects a full config with HvN, accepts the same config with `2`, and still maps `{}` to `undefined`. `GameConfigSchema` itself still accepts HvN, which guards replays and archives.
   - **New test file `tests/client/TeamCountOptions.test.ts`:** the list does not contain HvN and equals `[2,3,4,5,6,7,Quads,Trios,Duos]` (same order as today, minus HvN).
6. **`ai-agents/knowledge-base/analytics-event-reference.md`:** rewrite the `NationsTeam` paragraph. It currently says the mode "is live in the public rotation … and host-selectable in private lobbies". It becomes: retired by 0515 from the game deploy that ships it (not in public rotation, not offered in the pickers, refused by the worker for new private lobbies). The leaf is kept because older builds (for example, a single-player tab opened before the deploy) and old records may still report it, and per the collect-all-builds rule nothing is filtered. Wording says "from the deploy that ships 0515", not a date, because committed is not deployed. Then grep that no "live in the public rotation" claim is left.
7. **Worklog:** the build worker records what it did in `ai-agents/tasks/backlog/0515-…/worklog.md`.

**Files touched (recommended options):** M `src/server/MapPlaylist.ts` · M `src/core/WorkerSchemas.ts` · A `src/client/TeamCountOptions.ts` · M `src/client/HostLobbyModal.ts` · M `src/client/SinglePlayerModal.ts` · M `tests/server/MapPlaylist.test.ts` · A `tests/core/WorkerSchemas.test.ts` · A `tests/client/TeamCountOptions.test.ts` · M `ai-agents/knowledge-base/analytics-event-reference.md` · task `worklog.md`.

**Not touched:** `Schemas.ts`, `Game.ts`, `GameImpl.ts`, `DefaultConfig.ts`, `GameUpdates.ts`, `WinCheckExecution.ts`, `ColorAllocator.ts`, `PublicLobby.ts`, `GameServer.ts`, `Worker.ts`, `Master.ts`, `en.json`/`ru.json` (`public_lobby.teams_hvn` stays, still used by the `PublicLobby` label), both HTML templates, `tests/HumansVsNations.test.ts`, and the WinCheck and WinCondition tests.

**If the owner picks "public rotation only":** only steps 1, 5 (the MapPlaylist part) and 6 apply. The doc then says HvN is still offered in private and single player.

## How existing lobbies, saved settings and server game configs are handled
- **Public and private lobbies or games alive at deploy:** none survive. The container is stopped and removed, and all state is in memory. After the deploy, new public lobbies never get HvN (step 1).
- **Saved settings:** none exist. Both pickers start at `2` on every open.
- **Server-side game configs:** public configs come only from `MapPlaylist` (step 1). Private configs arrive by PUT or create and are refused with a 400 when they name HvN (step 2). Stored records and replays that name HvN still parse (the schema is unchanged).
- **An old client (tab opened before the deploy):**
  - Single player: its HvN game still runs locally and its record still archives. That is intended.
  - Private host who picks HvN: the PUT gets a 400. The host sees only a console error. The lobby keeps its last accepted settings, and later setting changes are also refused while HvN stays picked. Starting the lobby uses those last accepted settings. This window closes when the tab reloads, because Yandex serves the new bundle.

## Checks
| Check | Why | Run? |
|---|---|---|
| `npm test` (full, through the npm script, so the project lock applies) | `src/core` + server + client changes; also runs the shell harnesses unconditionally | **Run** |
| `npm run lint` | changed TS | **Run** |
| `npx tsc --noEmit -p tsconfig.json` | the brief asks for a clean type-check; the project has no script for it. It is the only check that catches the TS2367 trap in step 3. Report only new errors against today's baseline, if the baseline is not clean | **Run** |
| `npx prettier --check` on changed files | the pre-commit hook does nothing today (0223) | **Run** |
| `npm run test:integration` | no profile-server or DB path touched | Skip |
| `npm run test:scripts:docker` | no deploy or backup script touched | Skip |
| `npm run check:config-parity` | no env var added | Skip |
| `npm run build-*` | no HTML, webpack or asset change; tsc covers types | Skip |
| `npm run perf` | no sim or hot-path change | Skip |
| Live check of the lobby list and pickers | needs a game deploy (weekend slot) | Skip here; file a separate verify task at close (build-vs-verify rule) |

Notes on running the checks:
- The full `npm test` may wait for the lock while 0509's coder runs its own full test run. That is expected.
- If 0509's in-progress files turn the run red, I report it and do not fix it.
- A single `Exceeded timeout of 5000 ms` is judged by the supertest flake rule: re-run, and say that I re-ran.

## Edge cases and risks
- **TS2367:** an `as const` options list breaks the modals' HvN comparisons. Avoided by the explicit type.
- **A refine on `.partial()`:** a PUT without `playerTeams` must still pass. Tested.
- **The refine must not reach `GameConfigSchema`:** otherwise replays and archives break. Tested.
- **`CreateGameInputSchema` is a union:** when the refine fails, zod's error message will be the union's, which is less clear. It is still a 400 and is only reachable by a crafted request (the real client creates with an empty body).
- **0205:** the owner's 2026-09-03 ruling covers every Team setup "by design, HvN included". This task does not change that brief. Whether HvN stays in 0205's scope is a producer/owner note for 0205 (brief Q6). My view: keep it in scope, because the core code stays and HvN can be turned back on.
- **0476:** hypothesis H4 (Nations win in multiplayer HvN) can no longer happen in public games after the deploy. The producer should note this on 0476.
- **Other docs:** `ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md` (§12, lines 241/411/539) describes HvN as re-enabled. That is the producer's document, so it is a follow-up for them. After close, `fkit-wiki` refreshes `wiki/systems/game-overview.md` and `glossary.md`.
- **Priority 41** on the brief is still flagged "append rank, not merit". That is for the producer, not part of this plan.

## Open questions (owner, at approval)
These are the three NEEDS-DECISION blocks below.
- Brief Q4 is answered by the evidence above.
- Q5: keep `teams_hvn` and the `NationsTeam` leaf, and rewrite the doc paragraph.
- Q6: a note for 0205; no change here.
