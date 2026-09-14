# Review — 0032

Task: ai-agents/tasks/backlog/0032-investigate-null-id-errors/brief.md
File(s) under review: src/core/game/TerrainMapLoader.ts (working tree vs HEAD `6822210`, +61/−18) · src/client/graphics/layers/Leaderboard.ts (+5/−1) · tests/core/game/TerrainMapLoader.test.ts (+37/−4) · tests/client/graphics/Leaderboard.test.ts (new, untracked, 78 lines)
Status: closed-out

> Round 1, 2026-09-14. Reviewer: `fkit-reviewer` (spawned by the `/fkit-sprint-ship-loop` driver; no
> owner channel). Reviewers run: own pass + Codex adversarial pass (`codex exec --sandbox read-only`,
> prompt `.fkit/tmp/adversarial-prompt.md`, output `.fkit/tmp/adversarial-output.md`) —
> **coverage: full (exit 0, one attempt, no retry needed; 3 Codex findings, 2 of them also found by the own pass)**. Scope excludes the unrelated uncommitted 0220/0221/0233
> files (`src/client/ClientGameRunner.ts`, `tests/client/ClientGameRunnerTeardown.test.ts`, profile
> server / deploy / harness files) and the new Backlog briefs. `plan.md` / `worklog.md` read as context.
>
> **Verdict: ⚠️ Changes requested — 2 low defects (none blocking): R4 (bad-build source cached; raised by both, Codex rated it high, reviewer low — see row) and R2 (test does not prove the crash; raised by both). R1 is a frontier-move needing an owner disposition (residual vs. refine under 0252); R3 is documentation + a 0252 overlap flag. Fix stands on the trace: the mechanism is verified in code and corroborated by 0252's own reproduction.**
>
> Verified by the reviewer this round (not taken from the worklog):
> `npx jest tests/core/game/TerrainMapLoader tests/client/graphics/Leaderboard` → **2 suites / 12 tests
> pass** on the working tree. The same two test files copied into a scratch `git worktree` of **HEAD**
> → **4 failed / 8 passed**: the three re-specified/new loader tests fail (`toBe`/`not.toBe` identity,
> `hasOwner` true after reload), and the Leaderboard null-`myPlayer` test fails — **but on
> `every(!isOnSameTeam)` ("Expected: true, Received: false"), not on a null dereference** (see R2).
> `npx tsc --noEmit` exit 0; `npx eslint` on the four files → 0 problems; prettier: the new test file
> is clean, `Leaderboard.ts` warnings are at lines 6-10 / 214-215 / 226 / 235 (pre-existing, HEAD is
> equally un-clean), none inside the hunk. `git diff --stat 362a2f9..HEAD` on `TerritoryLayer.ts`,
> `Leaderboard.ts`, `GameView.ts`, `TerrainMapLoader.ts` → empty (the 0.0.140 findings transfer to
> HEAD, as the worklog says). Full `npm test` not re-run by the reviewer (worklog: 122 suites / 1268).
>
> **Mechanism verified in code (B/D/E):** `GameMapImpl.state` is the mutable per-game
> ownership/fallout array (`src/core/game/GameMap.ts:57,92,172-188`); the HEAD loader cached the
> built `TerrainMapData` and returned the same instance (`git show HEAD:src/core/game/TerrainMapLoader.ts`);
> `GameView` takes it as `_map` (`src/core/game/GameView.ts:497`) with `smallIDToID` empty at
> construction (`:472`) and filled only by player updates (`:536`); `owner(tile)` →
> `playerBySmallID` → `null` for an unknown small id (`:636-642,662`);
> `TerritoryLayer.init → redraw → forEachTile → paintTerritory` runs at `GameRenderer.initialize`
> (`ClientGameRunner.ts:564`) **before** `worker.start` delivers the first update (`:566`), and
> `paintTerritory` dereferences `owner.id()` / `owner.territoryColor()` / `alternateViewColor(owner).smallID()`
> (`TerritoryLayer.ts:509-540,544-548`) whenever `hasOwner(tile)` is true. A fresh page's map has
> `state` all-zero, so ownership at init can only come from a reused map. **Independently corroborated
> in-repo:** 0252's brief (`ai-agents/tasks/backlog/0252-…/brief.md:100-104`) reproduced the exact
> signature on the *third same-page game* (`Cannot read properties of null (reading 'id')` at
> `TerritoryLayer.paintTerritory ← init ← GameRenderer.initialize`) and attributed it to "stale in-page
> renderer state" — this task's fix is the actual cause (see R3 for the overlap).
>
> **Checked and clean (no row):** the worker side is unchanged in behaviour — `Worker.worker.ts`
> gets a fresh module instance per `new Worker`, so its loader cache was always empty; `GameRunner.ts:42`
> now builds fresh maps too, no hash/desync effect. Nothing compares maps or `TerrainMapData` by
> identity (`grep` for `gameMap ===`, `_map ===`, `map() ===` → none). `terrain` bytes are shared by
> reference into every built map (`GameMap.ts:91`) and never written (no `this.terrain[...] =` in
> `GameMap.ts`). `nations` shared by reference is fine: `GameRunner.ts:74` maps to new objects,
> `GameView.ts:503` only reads `nation.name`; the Compact coordinate-halving still runs once per source
> load (`TerrainMapLoader.ts:130-137`). Concurrency: in-flight dedupe unchanged (one source promise,
> each caller builds its own maps); the `.catch` path clears the in-flight entry and `loadedMaps` is
> set only on success. Preload contract intact: `getCachedMap` is only truth-tested
> (`ClientGameRunner.ts:310-317`); `terrainLoad` is the preload's built map and is what the game uses
> (`:337`), so `MATCH_PRELOAD_HIT_LOADED` semantics are unchanged; the preload builds once per
> `joinLobby` unless prestart/start name a *different* map (`:147-156`, pre-existing). The `myPlayer`
> null in `Leaderboard` is legitimate: `_myPlayer ??= playerByClientID(...)` (`GameView.ts:559`) stays
> `null` for a spectator / missed spawn, and `ClientGameRunner.ts:587-590` explicitly tracks that
> state (`_spawnMissedReported`). Secret hygiene in `worklog.md`: no password, cookie, token or
> `enduser.id` values; the internal-API query shapes and a group id only.

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1 | low | src/core/game/TerrainMapLoader.ts:81-91 · src/core/game/GameMap.ts:92-108 | **Frontier-move, not a defect — record as residual or refine.** A fresh `GameMapImpl` per `loadTerrainMap` re-allocates `state` (2 B/tile) **plus** the `refToX`/`refToY` `number[]` LUTs (4 B/tile in V8 with pointer compression, 8 B/tile in SpiderMonkey/JSC) for map *and* minimap: ≈85–180 MB per build on `Giant_World_Map` (8.0 M + 2.0 M tiles), ≈50–130 MB on the 4–6 M-tile maps. On the shipped exit routes (full navigation, `FlashistFacade.ts:679-682`) this is identical to today's first-game cost — no change. On the **in-page** second-game routes 0252 documents as leaking the renderer/layers (and therefore the old `GameView` → old `_map`), the old copy is now retained alongside the new one, where before the fix it was shared: +50–180 MB per in-page game on those already-unsupported routes. A cheaper shape exists if 0252 chooses to support in-page games — share the immutable LUTs/terrain across builds and allocate only `state` per game (16 MB on the largest map) — but that is a `GameMapImpl` constructor change, out of this task's scope. |
| R2 | 1 | low (raised by both) | tests/client/graphics/Leaderboard.test.ts:24,49-56 | **Test fidelity — the `not.toThrow()` assertion is not load-bearing.** `makePlayer().isOnSameTeam` is `jest.fn(() => true)`, which never dereferences its argument, so on HEAD `player.isOnSameTeam(null)` returns `true` without throwing; the test fails on HEAD only via `every(!isOnSameTeam)` / `not.toHaveBeenCalled()` (verified in a HEAD worktree: "Expected: true, Received: false"). The test is non-tautological (it does fail on HEAD, for the guard's absence) but the worklog's "fails on HEAD: `Cannot read properties of null (reading 'data')` path" is inaccurate. Recommended: have the mock mirror `PlayerView.isOnSameTeam` (`GameView.ts:391-393`, read `other.data.team`) so the crash itself is what the test proves. |
| R3 | 1 | low | ai-agents/tasks/backlog/0032-investigate-null-id-errors/worklog.md:93-96 · src/core/game/TerrainMapLoader.ts:14-15 | **Route wording unsupported; 0252 overlap unflagged.** The worklog and the loader comment state the trigger as "in the Yandex iframe the page is not reloaded between matches". The shipped in-game exits are full navigations (`WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160` → `changeHref` → `window.location.href`), which wipe the module cache — 0252's brief records `performance.timeOrigin` changing on every exit. The reachable in-page second-game routes are the ones 0252 lists: hash change / Back → `onHashUpdate` → `handleLeaveLobby` (`Main.ts:503-512`) then a rejoin, a `join-lobby` while `gameStop !== null` (`Main.ts:683-687`, incl. `ReconnectModal.ts:178`), the pre-start `leave-lobby` routes, and the 0231-era orphaned-runner cascade on 0.0.140 (0231 shipped after that build). Which route the 108 users took is not established; the fix is correct for all of them. Also: this fix resolves 0252's "third same-page game fails to start" item (`0252/brief.md:100-104`) — flag the overlap to the producer at close so 0252's acceptance criterion 4 is not re-investigated. Documentation-only. |
| R4 | 1 | low (raised by both; Codex: high) | src/core/game/TerrainMapLoader.ts:81-91,143 | **Small behaviour change on a bad asset.** `buildTerrainMapData` runs outside the cached promise: if `genTerrainFromBin` throws (bin length ≠ metadata width×height), the source is already in `loadedMaps`, so every later call re-throws without re-fetching; on HEAD the same failure rejected inside the promise, was cleared, and the next call re-fetched. A length mismatch is a deterministic server-asset error that a re-fetch of the same cache-busted URL would not fix, so the practical impact is nil — but the existing "error recovery" test only covers loader rejection, not build failure. Reviewer severity low, not high: the only way to reach the retry in-page is one of the R3 routes, and a resolved-but-short fetch is rare (a truncated body normally rejects at the network layer). Cheap fix if taken: check `bin.length === metadata.width * metadata.height` for both bins inside the source promise, before `loadedMaps.set`, so a bad source is never cached and the existing `.catch` path re-fetches on retry; extend the error-recovery test with a short-bin case. |

Codex finding not carried as a row — **prettier on the touched files (Codex #3, low): partially correct, mostly pre-existing.** All three pre-existing files are prettier-unclean at HEAD too (verified via `git show HEAD:… | prettier --check`). The complaints in `Leaderboard.ts` (lines 6-10, 214-215, 226, 235) and `TerrainMapLoader.test.ts` (29, 140, 154, 160) are all outside the diff hunks. In `TerrainMapLoader.ts` two **modified** lines keep their pre-existing over-length shape — line 29 (`loadingInProgressMapsPromises` declaration, type widened) and line 39 (`getCachedMap` signature) — so the worklog's "new hunks are clean" is slightly overstated. Nit; nothing enforces it (the husky hook is inert, `0223`). Coder's call whether to wrap those two lines.

**Suppressed as re-litigating settled decisions:** none — the ledger is fresh and no ADR in `ai-agents/knowledge-base/decisions/` touches map caching or the leaderboard.

**Convergence:** round 1, all findings new; nothing re-litigates. Recommend **act** on R4 (cheap, in-file) and R2 (mock fidelity), record R1 as an accepted residual or hand the LUT-sharing refinement to 0252, and correct R3's wording + flag the overlap at close. None of it blocks shipping the two fixes.

## Coder response

> Round 1, 2026-09-14. Coder: `fkit-coder` (spawned by the `/fkit-sprint-ship-loop` driver as its
> Process-review worker under the declared-approval marker; no owner channel). **Dispositions came
> from the driver taking the reviewer's recommendations — there was no separate owner ruling on any
> row below.** Fixes applied under the standing approval (ADR-019 discipline); each is recorded in
> `worklog.md`'s decision log with why it qualified. Loop check: no accepted residual existed and no
> ADR in `ai-agents/knowledge-base/decisions/` covers map caching or the leaderboard (ADR-105 is
> compact-map rotation only) — all four findings are novel; nothing suppressed as re-litigation.
> Severity is the coder's: all four low (R4 low, not Codex's high — deterministic asset error, retry
> only reachable via the R3 in-page routes).

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Frontier | none in code. Recorded below as an accepted residual with the reviewer's numbers; the LUT-sharing refinement (`GameMapImpl` sharing `refToX`/`refToY`/`terrain`, allocating only `state` per game) is handed to **0252** via the worklog's follow-up section. Worklog's "strictly lighter than before" claim corrected to "cache lighter; per-game allocation added". | won't fix (frontier) |
| R2 | CORRECT | Defect (test fidelity) | `tests/client/graphics/Leaderboard.test.ts`: mock `isOnSameTeam` now mirrors `PlayerView.isOnSameTeam` (reads `other.data.team`); positive control gained a different-team `rival`. Re-verified in a scratch HEAD worktree: the null-`myPlayer` test now fails on HEAD with `TypeError: Cannot read properties of null (reading 'data')`; 13/13 pass on the working tree. Worklog's inaccurate "fails on HEAD via `.data`" claim corrected. | ✅ done |
| R3 | CORRECT | Defect (documentation) | Verified: `WinModal.ts:346` / `GameRightSidebar.ts:136` / `SettingsModal.ts:160` → `changeHref` → `window.location.href` (`FlashistFacade.ts:681`); in-page routes `Main.ts:503-512` and `:683-687`. Reworded `TerrainMapLoader.ts` type comment (in-page rejoin routes, normal exits are full navigations) and the worklog's Step 3 B/D/E paragraph (+ a route paragraph). Added the 0252 overlap (acceptance criterion 4 likely satisfied by 0032) to the worklog's follow-up section for the producer. | ✅ done |
| R4 | CORRECT | Defect (low) | `TerrainMapLoader.ts`: new `assertTerrainBinLength` helper called on both bins inside the cached source promise before `loadedMaps.set`; `genTerrainFromBin` uses the same helper (unchanged behaviour). New test `error recovery — a short bin rejects, is not cached, and a retry re-fetches` (asserts the rejection, `getCachedMap` undefined, and one re-fetch on retry). | ✅ done |
| Codex prettier (no row id) | PARTIALLY CORRECT (as the reviewer rated it) | Defect (style) | Wrapped only the two modified over-long lines in `TerrainMapLoader.ts` (`loadingInProgressMapsPromises` declaration, `getCachedMap` signature) to prettier's shape; pre-existing drift in all three files left untouched. Verified by diffing against a prettier-formatted copy: the remaining complaints are pre-existing lines only. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)

- **Per-game `GameMapImpl` allocation (R1)** — What: every `loadTerrainMap` builds fresh `GameMapImpl`s
  (map + minimap) from the cached bytes; nothing built is cached. Cost per build: `state` (2 B/tile) +
  `refToX`/`refToY` LUTs (4 B/tile V8, 8 B/tile SpiderMonkey/JSC) ≈ 85–180 MB on `Giant_World_Map`
  (8.0 M + 2.0 M tiles), ≈ 50–130 MB on the 4–6 M-tile maps. · Why (structural): a built map carries
  mutable per-game state; sharing it across games is the 0032 root cause. On the shipped exits (full
  navigation) the cost equals today's first-game cost; only the in-page routes 0252 documents as
  leaking the old renderer/`GameView` retain an old copy alongside the new one, and those routes are
  already unsupported. Rejected alternatives: caching the built map with a reset (re-introduces
  shared-instance coupling, and `GameView`/layers of a leaked old game would see the reset); sharing
  the immutable LUTs/terrain and allocating only `state` per game (correct, but a `GameMapImpl`
  constructor change out of 0032's scope — **handed to 0252**). Disposition: relayed by the
  `/fkit-sprint-ship-loop` driver taking the reviewer's recommendation, no separate owner ruling. ·
  Re-raise only if: 0252 makes in-page second games a supported route (then take the LUT-sharing
  refinement), or a measured OOM/memory regression on the full-navigation path is attributed to map
  allocation.
