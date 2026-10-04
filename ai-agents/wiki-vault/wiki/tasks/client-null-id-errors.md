# Client Null-ID Errors — the Shared Map Cache and the Leaderboard (task 0032)

**Source**: `ai-agents/tasks/done/0032-investigate-null-id-errors/brief.md` (its `worklog.md` and `review.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 5 (moved Sprint 4 → 5 → 6 → 7 by owner rulings; rank is a carried position, not a merit re-rank) / task `0032`

> ✅ **Closed 2026-10-04** `(agent-closed — not owner-verified)` by a spawned `fkit-producer` (no owner channel), on
> results relayed by `fkit-lead`. **The production re-check (Step 5) PASSED** — zero spans for the fixed clusters on
> every fixed version over ~7 days of live traffic.
>
> ⚠️ **Who measured what:** the re-check was run by **`fkit-lead` itself**, read-only, in the owner's logged-in browser,
> at the owner's request (*"Can you do it yourself via Chrome?"*). It is a **relayed agent measurement, not
> owner-verified**. The marker records only that an agent made the close.
>
> ⚠️ **Board text vs repo:** the Sprint 7 row ends *"Not committed"*; the close **is** in commit `72a223d` (checked).

## Goal

Find and fix the source of a cluster of client `null`-access errors seen in Uptrace across Chrome, Safari and
Firefox (~1.8/min on 2026-05-07: `e is null`, `a.id`, `reading 'id'`, `null has no properties`). The brief demanded
**investigation first — no speculative null guards**. It was the triage-and-fix half of a 2026-06-03 split; its two
prerequisites were client source maps ([[tasks/s4c-enable-client-source-maps]], `0164`) and the archive-noise fix
(`0159`) being **live in production** — both owner-attested deployed on 2026-09-12 (not repo-verifiable).

## Key Changes

**Measured (2026-09-14, last window with real data — 78 h before the telemetry cert expired, build `0.0.140`).**
Source maps did **not** resolve (see [[tasks/client-source-map-upload-verification]]), but webpack kept class
method names, which was enough to place each site. Seven clusters:

| # | Cluster | Spans / 78 h | Site | Outcome |
|---|---|---|---|---|
| A | Lit DOM internals (`_$AA … is null`) | 14,323 — all in one 6 h slice, ≤ 3 Firefox clients | Lit `ChildPart` in the vendor bundle | not a code defect we can see; reported, not fixed |
| B | `.id` on null | ≈ 1,650 (108 + 4 + 3 distinct users across browsers) | `TerritoryLayer.paintTerritory` during `GameRenderer.initialize` | **fixed** (fix 1) |
| C | `.data` on null | 743 | `PlayerView.isOnSameTeam` ← `Leaderboard.updateLeaderboard` | **fixed** (fix 2) |
| D | `.smallID` on null | 141 | `TerritoryLayer.alternateViewColor` | **fixed** (fix 1) |
| E | `.territoryColor` on null | 23 | `TerritoryLayer.paintTerritory` | **fixed** (fix 1) |
| F | `.split` on null | 10 | untraced | not fixed |
| G | `.id` on null in `Transport.onSendAllianceRequest` | ≤ 23 | alliance-request path | not fixed → backlog `0261` |

Excluding the one-client burst A, B + C + D + E were ≈ **99 %** of the family. The non-burst family measured
≈ 0.45/min on `0.0.140`, down from the brief's 1.8/min.

**Fix 1 — B / D / E share one root cause: the terrain-map cache handed the same mutable map to every game.**
`src/core/game/TerrainMapLoader.ts` cached the *built* map, whose tile array holds ownership. A second game on the
same map + size **without a page reload** started with the previous game's owners still in the tiles while the new
game's player table was empty, so `owner(tile)` returned `null` and the territory layer threw. Now the cache holds
only the immutable inputs (`TerrainMapSource` — metadata, nations, raw bytes) and **every load builds fresh maps**;
the fetch is still de-duplicated. Review R4 added `assertTerrainBinLength` inside the cached promise so a bad asset is
never cached. ⛔ **No guard was added in `TerritoryLayer`** — it would have hidden stale ownership from every other
`hasOwner` caller.

- **Which routes reach it** (review R3 corrected an earlier claim that the Yandex page is "not reloaded between
  matches"): the shipped in-game exits are **full navigations**, which wipe the cache. The reachable in-page routes
  are the ones backlog task `0252` lists (hash change / Back then a rejoin, a join while a game is still held, the
  pre-start leave routes). Which route the 108 users took is **not established**; the fix covers all of them. See
  [[systems/client-game-teardown]].

**Fix 2 — C:** `src/client/graphics/layers/Leaderboard.ts` — `isOnSameTeam` is no longer called with a `null`
`myPlayer` (legitimately null for a spectator or a missed spawn).

**Tests:** `tests/core/game/TerrainMapLoader.test.ts` (fresh maps, no state leak, short-bin rejection not cached) and
a new `tests/client/graphics/Leaderboard.test.ts` (fails on the old code with `reading 'data'`, after review R2 fixed
its mock). Review: one round, full Codex coverage, R2 / R3 / R4 fixed, R1 accepted as a residual.

**Commit and deploy (checked by me in git):** the four code / test files changed in `a953271` (2026-09-14). That
commit is an ancestor of the tags `0.0.152`, `0.0.154`, `0.0.155` and `0.0.156`, and **not** of `0.0.151`. Per the
brief, game `0.0.152` went live 2026-09-26 (W12), then `0.0.154` the same day — see [[systems/weekend-deploy-window]].

## Outcome

**Step 5 re-check, 2026-10-04** — window 2026-09-27 09:00Z → 2026-10-04 12:00Z (~7 days, starting ≥ 24 h after W12):

- ✅ **Ingest is live.** Fixed versions carry ≈ 38.5 k spans (`0.0.155` 34,391 · `0.0.154` 3,639 · `0.0.156` 539;
  `0.0.155` alone 90 distinct users). This discharges the *"a valid certificate is not proof that data arrives"*
  boundary left open by [[tasks/telemetry-cert-expired-renewal-cron]].
- ✅ **Success criterion MET:** **zero spans** for B, C, D and E on `0.0.154` / `0.0.155` / `0.0.156`. Baseline: B
  alone ran ≈ 550 spans / 24 h on `0.0.140`.
- The only `reading 'id'` spans left on fixed versions (48) are **all cluster G** (`onSendAllianceRequest`) — not
  fixed here, owned by `0261`. **Not a regression.**
- ⚠️ **In Uptrace, `service_version` is the short commit SHA, not the release number** — this corrects the brief's
  *"filter to `0.0.152`"* wording. (Matches [[systems/telemetry]], which already said `service_version` is
  `GIT_COMMIT`.) `0.0.152` itself had no spans in the window.
- ⚠️ **Not taken:** the optional sanity check that the map-preload analytics split (`MATCH_PRELOAD_HIT_LOADED` /
  `HIT_NOT_LOADED`) is unchanged. **The preload contract is unmeasured in production.**
- ⚠️ **Seen, out of scope, nothing filed:** a large `reading 'M_ID'` rejection group (≈ 8.7 k spans on `0.0.155`,
  ≈ 2.6 k on `0.0.154`, no user id on the spans), `reading 'addChild'` (≈ 1.6 k spans, 1 user), `reading
  'bindFramebuffer'` (≈ 235 spans). **No task owns any of them.**

**Residuals (as recorded):**
- **R1, accepted:** each game now allocates its own map objects — ≈ 85–180 MB per build on `Giant_World_Map`. Same as
  the first-game cost on normal (full-navigation) exits; only the in-page routes `0252` documents as leaking would
  keep an old copy alongside. The cheaper shape (share the immutable parts, allocate only the tile state) is handed
  to `0252`.
- Clusters A, F and G not fixed (G → `0261`). The `0252` overlap: this fix is likely the real cause of `0252`'s
  *"third same-page game fails to start"* item — flagged for the producer, not re-investigated here.
- 📝 **Source-text note:** the brief's `## Status` reads `✅ Done`, but the dated *CORRECTION 2* block under it still
  says *"this task stays `🚧 Blocked`"* — history written 2026-09-22, not current state.

## Related

- [[decisions/sprint-7]] — the board (rank 5); the close is in its 2026-10-04 `72a223d` banner
- [[systems/weekend-deploy-window]] — W12 shipped the fix; W15 was this re-check
- [[tasks/telemetry-cert-expired-renewal-cron]] — task `0257`, the expired certificate that first blocked Step 5
- [[tasks/client-source-map-upload-verification]] — task `0260`, filed from this task's "no symbolication" residual
- [[tasks/s4c-enable-client-source-maps]] — task `0164`, prerequisite 1
- [[tasks/worker-reuses-page-map]] — task `0035`, which later gave the worker the page's cached map source
- [[systems/client-game-teardown]] — the in-page second-game routes that reach the stale-map bug
- [[systems/telemetry]] — Uptrace, the `service_version` key, and the 2026-05-07 error-priority table this closes item 5 of
