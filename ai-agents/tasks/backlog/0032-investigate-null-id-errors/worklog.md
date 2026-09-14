# Worklog — 0032 investigate & fix client null-ID errors

Build worker run: 2026-09-14, spawned by `/fkit-sprint-ship-loop` under the declared-approval
marker (plan approved by the owner in the lead session, `plan.md` blob `d4837879…`, 13981 bytes).
Steps 1–4 executed. No deploy, no commit, no wiki write, no task-file move.

## Headline

- **The telemetry box's TLS certificate expired 2026-09-04 06:03:43 UTC** (Let's Encrypt, CN
  `telemetry.geoconflict.ru`). Browsers cannot export to an expired cert, so **client telemetry
  went dark 10 days ago**: 226 error-log groups in the 78 h before expiry vs 19 in the 7 d after;
  the last 24 h hold **2** client error logs. All measurements below are therefore from the last
  window with real data, **2026-09-01 00:00 → 2026-09-04 06:00 UTC (78 h)**, on build
  `service.version = 362a2f9` (= `DEPLOY prod: bump version to 0.0.140`, 2026-08-29, an ancestor of
  HEAD and **after both** 0159 `c2bc236` and 0164 `6d4e574`). Prod today reports `0.0.151`, which has
  **never been observed** in telemetry. Root cause of the non-renewal is visible in the repo:
  `setup-telemetry.sh:930` runs `certbot renew` for a `--standalone` certificate while nginx holds
  port 80 and 301-redirects `/.well-known/acme-challenge/` to https, so the renewal cannot bind :80.
  Retention is also **not** 7 d in practice (09-01..09-04 data still present). Ops finding, out of
  this task's scope — in the follow-up text.
- **Symbolication is absent** in Uptrace for `362a2f9` (raw minified frames; `telemetry_sdk_language`
  is `webjs`, `error_filename` origin is `https://geoconflict.ru`). Not blocking: webpack kept class
  method names (`yl.paintTerritory`, `Ia.isOnSameTeam`, `li.updateLeaderboard`), which pinpoint the
  sites without maps. Whether 0164's upload ran for that build is unknown from here (no sourcemap
  route in the dashboard bundle to check).
- **Two fixes applied, both at the traced origin, both with tests that fail on HEAD and pass now.**
  Worker-origin instrumentation (plan Q3) **not needed**: the only `error.cross_origin_or_worker=true`
  group is `Script error.` (61 spans), zero null-family. 0251 overlap: none introduced.

## Step 1 — access and measurements

Access path used: **not** browser automation. curl `-k` against the Uptrace internal API after
`POST /internal/v1/users/login` with the password piped over stdin from `.env.telemetry.secret`
(never a file, never a tool argument, never echoed; the auto-mode classifier refused an earlier
attempt that wrote the JSON body to a scratch file — correctly). Session cookie kept in a scratch jar,
deleted at the end. Read-only throughout.

Query shapes (Uptrace 2.0.2, project id 1; attribute names are underscored in its UQL):

- `GET /internal/v1/tracing/1/systems?time_gte=…&time_lt=…` — data presence per window.
- `GET /internal/v1/tracing/1/groups?…&system=funcs&query=group by _name, exception_message, service_version | count() | uniq(enduser_id)` — spans (`unhandled_error` / `unhandled_rejection`).
- same with `system=log:error` and `group by _group_id, service_name | count() | uniq(enduser_id)` — the error-log stream (top 10 whole-stream check).
- `…&query=group by _name, error_cross_origin_or_worker, exception_message | count()` — worker split.
- `GET /internal/v1/tracing/1/spans?…&system=funcs&query=where _name = "…" and exception_message = "…"&limit=4` — samples with `exception_stacktrace`, `error_filename`, `service_version`.
- `GET /internal/v1/tracing/1/attributes?…&system=funcs` — attribute inventory.

Windows: 78 h pre-expiry for signatures (`2026-09-01T00:00Z → 09-04T06:00Z`), 24 h pre-expiry for
rate (`09-03T06:00Z → 09-04T06:00Z`), plus 7 d / 24 h post-expiry to prove the collapse.

Data presence (`systems`, error-log group counts): 09-01..09-04 (78 h) **226**; 09-04..09-07 **32**;
09-07..09-14 (7 d) **19**; last 24 h **1** (2 logs, `Bootstrap failed: crypto.randomUUID`).

Version spread in the 78 h window: `362a2f9` (0.0.140) dominant; `bcdf9af` (0.0.139) residual
(≈130 logs). No null-family events on the stale version worth separating.

## Step 2 — clusters (spans, 78 h pre-expiry; rate column = 24 h pre-expiry window)

| # | Cluster (browser wordings merged) | spans / 78 h | distinct `enduser.id` | 24 h count → /min | Site |
|---|---|---|---|---|---|
| A | Lit DOM: `this._$AA.nextSibling is null` 13,257 + `this._$AA.parentNode is null` 890 + `insertBefore of null` 176 | **14,323** | ≤3 (spans carry none; the folded log group shows 3, its rejection twin 1) | 14,323, **all inside 09-03 12:00–18:00 UTC**, 0 in every other 6 h slice | `vendors.<hash>.js` (Lit `ChildPart`), Firefox. **One-client burst — not actionable.** Uptrace's log pattern-grouping folds these into the `can't access property "id", a is null` group (`_group_id 1419598272647751473`), which is why that group reads 14,187. |
| B | `.id` on null: Chrome `Cannot read properties of null (reading 'id')` 1,195 (rej.) + Safari `null is not an object (evaluating 'a.id')` 408 + 5 + Firefox `can't access property "id", a is null` 34 + part of 23 (`unhandled_error`, mixed with G) | **≈1,650** | 108 + 4 + 3 | ≈550 → **0.38/min** | `TerritoryLayer.paintTerritory` ← `redraw` ← `forEachTile` ← `init` ← `GameRenderer.initialize` ← `ClientGameRunner.start` (also via `GameRenderer.redraw`). |
| C | `.data` on null: Chrome 505 + Safari `e.data` 238 | **743** | 2 (+ Safari with no id) | 38 → 0.03/min | `PlayerView.isOnSameTeam` ← `Leaderboard.updateLeaderboard` ← `tick`. |
| D | `.smallID` on null: 129 + 6 + 6 | **141** | 16 | 42 → 0.03/min | `TerritoryLayer.alternateViewColor` ← `paintTerritory` ← `renderTerritory` ← `renderLayer` (tick-time render). |
| E | `.territoryColor` on null: 15 + 4 + 4 | **23** | 3 | — | `TerritoryLayer.paintTerritory` (non-border branch). |
| F | `.split` on null | 10 | 4 | — | untraced (no sample pulled). |
| G | `.id` on null in `Transport.onSendAllianceRequest` | ≤23 (shares the `unhandled_error` group with B) | ≤4 | 9 → 0.006/min | `Transport.ts:479`, untraced further. |

Family total ≈ 16,900 spans / 78 h; **excluding the one-client burst A: ≈2,580**. B+D+E share one
root cause (one fix) = ≈1,810 ≈ 70 % of the non-burst family; adding C = ≈2,550 ≈ **99 %**. Stop rule
(top 2 clusters, max 2 fixes) → **B(+D+E) and C fixed; A reported; F, G to the follow-up.**

For comparison the brief's 2026-05-07 figure was ~1.8/min for the family; the non-burst family now
measures **≈0.45/min** on 0.0.140.

Whole-stream check (top error-log groups, 78 h): the folded null-`id` pattern group 14,187 (×2
twins), `Socket encountered error … Closing socket` 9,347, `.id`-null 1,883/1,882/840, `a.id`
662/661/397, `.split` null 574, `Could not load animated sprite MiniSmoke` 552, `setLeaderboardScore …
Player is not present in leaderboard` 474. Archive-family groups are gone (0159 confirmed live).

## Step 3 — traces

**B / D / E — one root cause: the terrain-map cache handed the same mutable `GameMapImpl` to every
game on a map+size.** `src/core/game/TerrainMapLoader.ts` (fork commit `94a77fc`, "Map preloading on
join multiplayer games") cached the built `TerrainMapData` — including `gameMap`, whose
`state: Uint16Array` holds tile ownership and fallout. `GameView` uses that object as its `_map`. On
any route that starts a **second game on the same map+size without a page reload**, that game
starts with the previous game's ownership still in the tiles while the new
`GameView.smallIDToID` is empty: `hasOwner(tile)` is true, `owner(tile)` → `playerBySmallID` returns
`null`, and `paintTerritory` throws on `owner.id()` during `TerritoryLayer.init → redraw` (B), on
`alternateViewColor(owner).smallID()` when stale neighbours are repainted on the render path (D), and
on `owner.territoryColor()` for stale non-border tiles (E). Ruled out: missing player updates
(`GameImpl.executeNextTick` emits `toUpdate()` for every player every tick) and the worker (fresh
module instance per `new Worker`). The stack's `init`-time position (before any game update) is only
explainable by pre-populated map state.

Which routes (corrected per review R3 — an earlier draft said "the Yandex iframe page is not
reloaded between matches", which is unsupported): the shipped in-game exits are **full navigations**
(`WinModal.ts:346`, `GameRightSidebar.ts:136`, `SettingsModal.ts:160` → `FlashistFacade.changeHref`
→ `window.location.href`, which wipes the module cache). The reachable in-page second-game routes are
the ones 0252 lists: hash change / Back → `onHashUpdate` → `handleLeaveLobby` (`Main.ts:503-512`) then
a rejoin; a `join-lobby` while `gameStop !== null` (`Main.ts:683-687`, incl. `ReconnectModal.ts:178`);
the pre-start `leave-lobby` routes; and the 0231-era orphaned-runner cascade on 0.0.140. Which of them
the 108 users took is not established; the fix is correct for all of them. 0252's brief
(`0252/brief.md:100-104`) reproduced this exact signature on the third same-page game.

**C.** `Leaderboard.updateLeaderboard` computes `player.isOnSameTeam(myPlayer!)` with `myPlayer` from
`GameView.myPlayer()`, which is legitimately `null` for a spectator or a missed spawn (the fork
tracks `MATCH_SPAWN_MISSED_*` for exactly this state). Every 10 ticks while the leaderboard is
visible it dereferenced null inside `PlayerView.isOnSameTeam` (`other.data`). Two users, ~250 events
each — one match each.

**A.** Lit `ChildPart` internals in the vendors bundle; a single 6 h burst from ≤3 Firefox clients,
absent in every other slice. Consistent with a DOM mutation outside Lit's control (extension /
translator) on one machine. Not a code defect we can see; reported, not fixed.

## Step 4 — fixes and tests

1. `src/core/game/TerrainMapLoader.ts` — cache now holds a `TerrainMapSource` (nations + manifest
   metadata + raw terrain bytes) and **every `loadTerrainMap` call builds fresh `GameMapImpl`s**;
   the fetch is still deduplicated and cached (one manifest/bin fetch per map+size, in-flight
   promise shared). `getCachedMap` keeps its name and truthiness contract (its only caller,
   `ClientGameRunner`, truth-tests it for the preload analytics) but returns the cached source — so
   the already-dirty `ClientGameRunner.ts` is **untouched**. Memory: the *cache* is lighter than
   before (bytes instead of state + LUT arrays), but each game now allocates its own `GameMapImpl`s
   — see review R1 (accepted residual) for the per-game cost on the in-page routes. Review R4: the
   bin lengths are checked inside the cached source promise (`assertTerrainBinLength`, shared with
   `genTerrainFromBin`), so a bad asset is never cached and the next call re-fetches.
2. `src/client/graphics/layers/Leaderboard.ts:141` — `isOnSameTeam: player === myPlayer ||
   (myPlayer !== null && player.isOnSameTeam(myPlayer))`.

No guard added in `TerritoryLayer` (brief: no speculative guards; with the origin fixed an owned tile
always has a known owner because tiles and players arrive in the same update).

Tests:
- `tests/core/game/TerrainMapLoader.test.ts` — two cache tests re-specified (loader called once, but
  fresh maps), new `tile state written by one game does not leak into the next load of the same map
  (task 0032)`, new `getCachedMap reports a completed load without building a map`, and (review R4)
  new `error recovery — a short bin rejects, is not cached, and a retry re-fetches`. Against the HEAD
  loader: **3 failed / 8 passed** (the three identity/leak tests fail as intended; the short-bin case
  passes on HEAD too, since HEAD validated inside the promise — it guards the new structure); with
  the fix: 11/11.
- `tests/client/graphics/Leaderboard.test.ts` (new, jsdom) — `tick with no myPlayer does not throw
  and marks nobody as a teammate`, plus a positive control with a `myPlayer` and a different-team
  rival. Per review R2 the mock `isOnSameTeam` mirrors `PlayerView.isOnSameTeam` (reads
  `other.data.team`), so on HEAD the test **fails with `TypeError: Cannot read properties of null
  (reading 'data')`** — re-verified in a scratch HEAD worktree after the change (an earlier draft
  claimed this while the mock never dereferenced its argument; then it failed only on
  `every(!isOnSameTeam)`). 2/2 with the fix.

Gates (build run, 2026-09-14): `npm test` → **122 suites / 1268 tests passed**, 32 s, no
supertest flake this run; `npm run lint` → clean; `npx tsc --noEmit` → clean; prettier → the four
touched files' new hunks clean except the two modified over-long lines in `TerrainMapLoader.ts`
noted by Codex (wrapped in the review round); the three pre-existing files were already
prettier-unclean at HEAD (`TerrainMapLoader.ts`, `Leaderboard.ts`, `TerrainMapLoader.test.ts`) and were
**not** reformatted wholesale to avoid unrelated churn — the remaining complaints are only
pre-existing lines (verified by line range).

Gates re-run after the process-review round (2026-09-14): `npm test` → **122 suites / 1269 tests
passed**, 35.6 s, no supertest flake, no SIGSEGV; `npm run lint` → exit 0; `npx tsc --noEmit` → exit
0; `npx jest tests/core/game/TerrainMapLoader tests/client/graphics/Leaderboard` → 13/13; the same two
test files against a scratch `git worktree` of HEAD `6822210` → 4 failed / 9 passed (three loader
identity/leak tests + the Leaderboard null test, the latter now on `reading 'data'`); prettier on the
touched files → `Leaderboard.test.ts` clean, the other three differ from prettier only on
pre-existing lines (verified by diffing against a formatted copy).

## Decision log (unattended actions under the standing approval)

- **Fix 1 (B/D/E, `TerrainMapLoader`)** — answers clusters B, D, E. Qualifies as in-plan: plan step 4
  "targeted fix at the origin … not blanket guards"; the origin is the shared mutable map, not the
  deref site. Verified CORRECT by the regression test (fails on HEAD, passes now) and the full
  suite. Localized to one core file + its test; no API rename; dirty files untouched. Obvious winner
  over a null guard in `TerritoryLayer`, which would have hidden stale ownership that every other
  `hasOwner` consumer (spawn highlight, attack preview, `getTerritoryAtCell`) would still see.
- **Fix 2 (C, `Leaderboard`)** — answers cluster C. In-plan (traced site, early-return guard at that
  site), verified CORRECT by its test, one-line, localized.
- **Not done, deliberately:** no worker instrumentation (measured zero worker-origin null events);
  no `TerritoryLayer` guard; no whole-file prettier runs; no touch of `ClientGameRunner.ts`.

### Process-review round 1 (2026-09-14, spawned by `/fkit-sprint-ship-loop`, standing approval)

Dispositions relayed by the driver, taking the reviewer's recommendations — **no separate owner
ruling on any of them** (recorded as such in `review.md`). Each fix below was applied without asking;
each is verified `CORRECT`, mechanical/localized, and inside the approved plan's step 4 ("targeted
fix at the origin … with tests").

- **R2 (`Leaderboard.test.ts`)** — mock `isOnSameTeam` now reads `other.data.team` like
  `PlayerView.isOnSameTeam`; added a different-team `rival` to the positive control. Why it
  qualified: the reviewer's HEAD-worktree run showed the test failed on `every(!isOnSameTeam)`, not
  on the null dereference — verified `CORRECT`; test-only; in-plan (the plan requires a test that
  reproduces the null path). Re-verified in a scratch HEAD worktree: now fails with `reading 'data'`.
- **R3 (wording)** — corrected the trigger description here (Step 3, B/D/E) and in the
  `TerrainMapLoader.ts` type comment: in-page rejoin routes, not "iframe page not reloaded".
  Documentation-only; verified `CORRECT` by reading the three exit sites (`changeHref` →
  `window.location.href`) and `Main.ts:503-512,683-687`. Added the 0252-overlap note below.
- **R4 (`TerrainMapLoader.ts`)** — `assertTerrainBinLength` called on both bins inside the cached
  source promise before `loadedMaps.set`; `genTerrainFromBin` uses the same helper (behaviour
  unchanged there). New short-bin test. Why it qualified: verified `CORRECT` from the code (build ran
  after the cache write; HEAD validated inside the promise); one file + its test; in-plan (keeps the
  fix at the origin, restores HEAD's error-recovery contract). Severity assigned low — same as the
  reviewer, not Codex's high: a length mismatch is a deterministic asset error, and the retry is only
  reachable via the R3 in-page routes.
- **Codex prettier note** — wrapped the two *modified* over-long lines in `TerrainMapLoader.ts`
  (`loadingInProgressMapsPromises` declaration, `getCachedMap` signature). Pre-existing drift left
  alone, as instructed. Whitespace-only.
- **R1** — no code, by disposition: accepted residual, LUT-sharing refinement handed to 0252.
- **Obvious-winner calls:** none.

## Residuals

- Client telemetry is dark since 2026-09-04 06:03 UTC (expired cert). Step 5 cannot be run until the
  cert is renewed; 0.0.151 (and this fix once deployed) will be invisible until then.
- Symbolication absent for 0.0.140 — cause unknown (upload not run? `PUBLIC_ORIGIN` mismatch? upload
  rejected?). Function names sufficed here; it will not always be so.
- Clusters A (burst), F (`.split` on null, 10 spans, untraced), G (`Transport.onSendAllianceRequest`
  `.id` on null, ≤23 spans) not fixed.
- Rates are from 0.0.140; 0.0.151's code at the traced sites is unchanged since `362a2f9` (`git diff
  --stat 362a2f9..HEAD` on `TerritoryLayer.ts`, `Leaderboard.ts`, `GameView.ts` is empty), so the
  findings transfer.
- The `as PlayerView` cast in `TerritoryLayer.paintTerritory` remains a latent assumption by design.
- Review R1 (accepted residual, see `review.md`): each game now allocates its own `GameMapImpl`s
  (`state` + `refToX`/`refToY` LUTs, map + minimap) — ≈85–180 MB per build on `Giant_World_Map`,
  ≈50–130 MB on the 4–6 M-tile maps. Identical to today's first-game cost on the shipped
  full-navigation exits; only the in-page routes 0252 documents as leaking the old renderer/`GameView`
  now retain the old copy alongside the new one. The cheaper shape (share the immutable LUTs/terrain,
  allocate only `state` per game) is a `GameMapImpl` constructor change handed to 0252.

## Follow-up brief text (for the producer)

> **Telemetry ingest dark since 2026-09-04 — expired TLS cert; renewal cron cannot work.** The Let's
> Encrypt cert for `telemetry.geoconflict.ru` expired 2026-09-04 06:03 UTC. `setup-telemetry.sh:930`
> runs `certbot renew --quiet --post-hook "systemctl reload nginx"` for a certificate issued with
> `--standalone`, but nginx owns :80 and 301-redirects `/.well-known/acme-challenge/` to https, so
> renewal can never bind the port. Browser OTLP exports fail on the expired cert: client error logs
> went from ~50k/day to 2 in the last 24 h. Fix: renew now (stop nginx or use `--webroot`/`--nginx`)
> and make the cron pre-/post-hook stop/start nginx or switch the authenticator. Also check the game
> box's collector (`setup.sh` otlphttp exporter) and whether `UPTRACE_RETENTION_DAYS` is really
> applied (data older than 7 d was still queryable). Note `tests/scripts/profile-deploy-hardening.test.sh`
> greps `setup-telemetry.sh`, so the edit will exercise that gate.
>
> **0032 remainder.** (1) Lit `_$AA` DOM-corruption burst: 14,323 rejections in one 6 h slice from
> ≤3 Firefox clients (2026-09-03 12–18 UTC) — re-check after telemetry returns; if it recurs across
> users, investigate DOM mutation outside Lit (extensions/translators) rather than app code. (2)
> `Cannot read properties of null (reading 'split')` — 10 spans, 4 users, untraced. (3)
> `Transport.onSendAllianceRequest` `.id` on null — ≤23 spans, ≤4 users; likely a stale player ref in
> the alliance radial flow. (4) Source-map symbolication absent for 0.0.140 in Uptrace — verify the
> 0164 upload actually runs in `build.sh` for prod builds and that maps resolve for a current version.
>
> **0252 overlap (for the producer at 0032's close).** (a) This task's `TerrainMapLoader` fix is the
> actual cause of 0252's "third same-page game fails to start" item (`0252/brief.md:100-104`:
> `Cannot read properties of null (reading 'id')` at `TerritoryLayer.paintTerritory ← init ←
> GameRenderer.initialize`, attributed there to "stale in-page renderer state") — 0252's acceptance
> criterion 4 is likely satisfied by this task; mark it rather than re-investigate. (b) Hand-off from
> review R1: if 0252 chooses to support in-page games, the per-game `GameMapImpl` allocation
> (≈85–180 MB per build on the largest map) can be cut to `state` only (16 MB) by sharing the
> immutable `refToX`/`refToY`/`terrain` across builds — a `GameMapImpl` constructor change, out of
> 0032's scope.

## Step 5 — owner side

Deploy via `build-deploy.sh` **after the telemetry cert is renewed** (otherwise nothing is observable).
Then, ≥24 h later, re-run against the **new** `service.version`:

- Spans: `system=funcs`, `group by _name, exception_message, service_version | count() |
  uniq(enduser_id)`, window last 24 h and last 7 d. Success = zero `reading 'id'` / `a.id` /
  `"id", a is null` from `TerritoryLayer.paintTerritory`, zero `reading 'smallID'` /
  `'territoryColor'`, zero `reading 'data'` / `e.data` from `isOnSameTeam`, **for the new version
  only** — the old version's residue keeps appearing until clients refresh.
- Sanity: `MATCH_PRELOAD_HIT_LOADED` / `HIT_NOT_LOADED` analytics unchanged in proportion (the
  preload contract is intact).
