# Worklog — 0367 cut the public lobby wait from 2 minutes to 1 minute

Build worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`, Sprint 7) under the
declared-approval marker. Approved plan: `plan.md` in this folder (blob `ec79417c…`, re-hashed this run —
unchanged). Nothing committed or pushed.

## 2026-10-02 — build

### What changed

| File | Change |
|---|---|
| `src/core/configuration/DefaultConfig.ts` | `gameCreationRate()` `120 * 1000` → `60 * 1000`, with a one-line `// Flashist Adaptation` comment (task 0367, revert = `120 * 1000`). Prod + preprod inherit it; Dev's 5 s override untouched. |
| `tests/server/PublicLobbyWindow.test.ts` (new) | 6 tests — see *Verification*. Reuses the `jose` mock (`ProfileApiUrlConfig.test.ts`) and the GameServer harness (`PrivateLobbyStartGate.test.ts`). No new infrastructure. |
| `ai-agents/knowledge-base/architecture.md` | *Lobby window* line → 60,000 ms in prod/preprod, dev 5,000 ms, dated note "was 120,000 ms", line citation fixed. |
| `ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md` | One dated line under the "is still `120 * 1000`" sentence: true as of ADR-107's date; cut to 60 s by 0367. Sentence itself left as-is. |

Not touched (per plan): `geoconflict-producer-knowledge-base.md` (historical mentions), the wiki
(`systems/architecture-overview.md:55` still says 120,000 ms — `fkit-wiki` updates it after close),
`tests/util/TestServerConfig.ts`, `Master.test.ts`. No announcement text.

### Verification

1. **Targeted test** — `npm test -- tests/server/PublicLobbyWindow.test.ts`: **6/6 pass**.
   - Value pins: `prodConfig` / `preprodConfig` = 60 000, `DevServerConfig` = 5 000; the same three via
     `getServerConfig("prod" | "staging" | "dev")`.
   - Prod-like lobby (brief step 3) — **how it was run:** jest fake timers installed *before* constructing a
     real `GameServer` with the real `prodConfig` (AI on) and a public `GameConfig` (`maxPlayers: 50`),
     clock pinned to T0. Asserted: `gameInfo().msUntilStart === T0 + 60 000` and `startTime()` the same;
     at +30 s `aiPlayersCount > 0` and phase `Lobby`; at +59 999 ms still `Lobby` with AI present; at
     +60 000 ms `Active` (the strict `<` boundary); at +90 000 ms with no humans still `Active`, at
     +90 001 ms `Finished` (window + 30 s cleanup). `afterEach` clears timers + restores real timers.
     No local `GAME_ENV=prod` server was booted (needs prod-only runtime config) — the brief allows this route.
   - **Mutation check:** temporarily set the value back to `120 * 1000` → 5 of 6 tests fail (the 6th only
     asserts prod has AI on); restored to `60 * 1000` and re-confirmed via `git diff`.
2. **`npm run lint`** — exit 0. `npx eslint` on the two changed TS files — clean. `npx prettier --check`:
   test file formatted with `--write` (one line-wrap); `DefaultConfig.ts` clean. `architecture.md` fails
   prettier **at HEAD too** (pre-existing) — not reformatted (unrelated churn).
3. **`npx tsc --noEmit`** — exit 0 (tsconfig includes `tests/**`).
4. **Full `npm test`** — ⚠️ **RED: 1 failed / 3356 passed, 186 of 187 suites passed.** The one failure is
   `tests/scripts/ShellHarnesses.test.ts` › *profile deploy hardening harness*: killed at the wrapper's
   150 000 ms `spawnSync` deadline while in T50 — **every assertion it had printed was ✅**. Not the
   supertest flake (wrapper says so itself), not a SIGSEGV. Diagnosis:
   - Run standalone (`bash tests/scripts/profile-deploy-hardening.test.sh`): **ALL PASS, but 3 min 10 s
     wall clock at 7 % CPU** — i.e. the harness, on its own, now takes longer than the 150 s deadline,
     mostly waiting, not CPU-bound. It was last changed 2026-10-01 (`05c3cfa`, `49a419d`).
   - None of the files it reads or asserts on are touched by 0367 (it covers deploy scripts + `nginx.conf`).
   - **Clean `HEAD` (`40ccb06`, temporary worktree, no 0367 changes), standalone: ALL PASS in 5 min 10 s**
     — also far over the 150 s deadline. So the timeout exists without this change.
   - Wrapper suite alone (`npm test -- tests/scripts/ShellHarnesses.test.ts`, working tree): **4/4 pass**,
     hardening harness 114 s — under the deadline when the machine is quiet.
   - **Re-ran full `npm test` once** (CLAUDE.md flake rule): **RED again — 2 failed / 3355 passed.**
     (a) the same hardening-harness 150 s timeout; (b) `tests/profile-server/AlertRoutes.test.ts` ›
     *DELIVERS an alert with no usable id* — `socket hang up`, a supertest suite. No `SIGSEGV` in the log
     and no new `node-*.ips` crash report today (newest is 2026-10-01) → not `0197`; matches the
     documented supertest family (*socket hang up — seen, never traced*). **Re-ran that suite alone: 94/94
     pass.** 0367 touches nothing in the profile server.
   - **Net:** every suite 0367 could affect is green; full `npm test` is red on a load-dependent harness
     deadline that also misses at clean `HEAD`. Fixing it (speeding the harness or raising the deadline) is
     **outside the approved plan** — not done; surfaced to the driver as a decision.
5. **Docs** — `architecture.md` no longer states 120,000 ms as current.

## Baseline (before numbers) — per owner ruling Q1: read now + re-run on deploy day

⚠️ **Correction to the plan's retention figure.** The plan said Uptrace keeps server logs **7 days**
(`UPTRACE_RETENTION_DAYS=7`). Measured today, `uptrace.logs_index` holds rows from **2026-09-18 00:00 UTC**
onward — **~14 days**, matching task 0259's finding that Uptrace CE ignores the configured 7 and drops
partitions on a fixed ~14-day horizon (`reports/2026-09-14-0259-uptrace-retention-findings.md`; follow-up
`0263` still in backlog). So the "before" number survives roughly twice as long as the plan feared, and the
Q2 ruling (read day 7 + snapshot day 4) is comfortably inside it. **Re-check retention before relying on
it** — if 0263 ever makes the 7-day setting bite, the plan's tighter timing applies again.

### 1. Share of public matches with exactly one real player — READ

**Source:** the game server's own logs in Uptrace (ClickHouse `uptrace.logs_index` on the telemetry box),
read-only. Two lines, joined on game id:
- `creating Public … game with id <id>` (`Worker.ts`, logged at lobby creation) — marks a game **public**,
  so private games are now excluded (an improvement on the plan, which expected them mixed in).
- `sending start message` (`GameServer.ts:570`), one per real player at match start, carries `gameID`.
  AI players are not in `activeClients`, so they log nothing. It is **not** logged on a reconnect
  (that path calls `sendStartGameMsg` directly, `GameServer.ts:480`).
- Only `prod` sends these lines (checked: one environment value present).

**Window read now:** 2026-09-25 00:00 → 2026-10-02 00:00 UTC (7 full days, all on the 2-minute window).

| day (UTC) | public lobbies | public matches with ≥1 real player | exactly 1 real player | **lone share** | avg real players | median |
|---|---|---|---|---|---|---|
| 2026-09-25 | 726 | 665 | 79 | 11.9 % | 8.14 | 8 |
| 2026-09-26 | 721 | 656 | 89 | 13.6 % | 5.41 | 5 |
| 2026-09-27 | 722 | 640 | 86 | 13.4 % | 4.93 | 5 |
| 2026-09-28 | 724 | 645 | 88 | 13.6 % | 7.90 | 7 |
| 2026-09-29 | 724 | 668 | 91 | 13.6 % | 8.20 | 7 |
| 2026-09-30 | 726 | 664 | 69 | 10.4 % | 8.27 | 7 |
| 2026-10-01 | 726 | 692 | 71 | 10.3 % | 8.21 | 7 |
| **7 days** | **5 069** | **4 630** | **573** | **12.4 %** | **7.31** | **6** |

Reading it:
- **Lone share = matches with exactly 1 real player ÷ public matches with at least 1 real player.**
  AI-only lobbies (no human at start) are left out of the denominator — nobody played them. If the owner
  prefers "÷ all public lobbies", it is 573 / 5 069 = 11.3 %.
- `public lobbies` ≈ 720/day is the 2-minute cadence itself (86 400 s ÷ 120 s); slightly above because a
  lobby that fills to `maxPlayers` closes early. At 1 minute this column roughly doubles by construction —
  so it is **not** a "people play more" signal; `public matches with ≥1 real player` is the closer one.
- Weekend dip (09-26/27: avg ~5 real players vs ~8 on weekdays) — noted, not explained here.

### 2. Multiplayer matches per day (owner-ruled main signal) — NOT READ by me

**Why:** the ruled source is GameAnalytics `Game:Mode:Multiplayer`; I have no GameAnalytics access.
**Owner reads:** GameAnalytics → design events → `Game:Mode:Multiplayer`, daily count, the 7 days before
deploy. ⚠️ It fires once **per client per match** (and includes private lobbies), so label it
"multiplayer match **entries** per day", not matches.
**Server-side stand-in already read above:** "public matches with ≥1 real player" (≈ 661/day this week).
It is a different measure — counts matches, not player-entries; public only — and is offered as context,
not as a replacement for the ruled number.

### 3. Context numbers — NOT READ (no GameAnalytics access)
- `UI:ClickMultiplayer` → `Game:Mode:Multiplayer` conversion — GameAnalytics, same filter style.
- `Match:Spawned` (value = seconds from `Game:Start` to confirmed spawn) — GameAnalytics.
- Join-ad count per day — **cannot be separated** even in GameAnalytics: `Ad:Interstitial` carries no
  placement, so join ads and end-of-match ads are one number. Total `Ad:Interstitial`/day is readable;
  the join-only share is not, without new code.

### Re-runnable query (run on deploy day for the exact 7-days-before window)

Read-only. On the telemetry box, in the Uptrace compose directory, feed this to `clickhouse-client` inside
the `clickhouse` service (credentials from that container's own environment — never paste them anywhere).
**Change only the two dates:** `window_end` = deploy day 00:00 UTC, `window_start` = 7 days earlier.
The verify task uses the same query with the 7 days *after* the deploy.

```sql
WITH
  toDateTime64('2026-09-25 00:00:00', 6, 'UTC') AS window_start,
  toDateTime64('2026-10-02 00:00:00', 6, 'UTC') AS window_end,
  public_games AS (
    SELECT DISTINCT extract(display_name, 'game with id ([A-Za-z0-9]+)') AS game_id, toDate(time, 'UTC') AS day
    FROM uptrace.logs_index
    WHERE time >= window_start AND time < window_end
      AND toString(attrs.deployment_environment_name) = 'prod'
      AND display_name LIKE '%creating Public%game with id%'
  ),
  real_players AS (
    SELECT toString(attrs.gameID) AS game_id, count() AS humans
    FROM uptrace.logs_index
    WHERE time >= window_start AND time < window_end + INTERVAL 10 MINUTE
      AND toString(attrs.deployment_environment_name) = 'prod'
      AND display_name = 'sending start message'
    GROUP BY game_id
  )
SELECT
  day,
  count() AS public_lobbies,
  countIf(humans >= 1) AS public_matches_with_a_human,
  countIf(humans = 1) AS lone_human_matches,
  round(countIf(humans = 1) / countIf(humans >= 1), 4) AS lone_share_of_human_matches,
  round(avgIf(humans, humans >= 1), 2) AS avg_humans_per_human_match,
  quantileExactIf(0.5)(humans, humans >= 1) AS median_humans
FROM public_games AS g
LEFT JOIN real_players AS r ON g.game_id = r.game_id
GROUP BY day WITH TOTALS
ORDER BY day
SETTINGS join_use_nulls = 0;
```

Notes: the `+ 10 MINUTE` lets a lobby created just before `window_end` still find its start lines. The
query depends on two log strings — if either `"sending start message"` or the Worker's
`creating Public … game with id` message is reworded, update the query with it.

## Decision log (autonomous calls, with why each qualified)

1. **Added a boundary assertion at +90 000 ms (`Active`) next to the plan's +90 001 ms (`Finished`).**
   Mechanical, localized, inside plan item 2(b)'s intent (pin the cleanup boundary as it already pins the
   60 s one with 59 999 / 60 000). Obvious winner.
2. **Also asserted `startTime()` = T0 + 60 s and added a test that `prodConfig` has AI on.** Same
   consumers the plan lists (`GameServer.ts:493`; AI-on is the premise of 2(b)). In plan, mechanical.
3. **`architecture.md` citation set to `DefaultConfig.ts:247-250`, not the plan's `:247-249`.** The plan's
   own comment line shifts the method by one line; `:247-250` is the accurate range. Mechanical.
4. **Ran `prettier --write` on the new test file only** (one line-wrap). Did **not** reformat
   `architecture.md`, which already fails prettier at HEAD — unrelated churn, against "minimal diffs".
5. **Baseline read via SSH with the project's own password-file fallback** (`.env.telemetry.secret`,
   which enables `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK`; key auth was denied). Password passed only via a
   0600 temp file removed on exit, ClickHouse credentials taken from the container's own env, host name
   redacted from output. Read-only `SELECT`s only. In plan (§3.5: "read-only over SSH … per the
   run-it-don't-hand-it-over rule").
6. **Used the Worker's `creating Public … game with id` line to exclude private games.** Improves on the
   plan's stated caveat ("private games mixed in") without changing what is measured; read-only; obvious
   winner within the plan's intent.
7. **Did not fix the red shell harness.** Outside the approved plan → surfaced, not decided.

No fix from a review was applied (no review has run yet).

## 2026-10-02 — process review, round 1 (`fkit-coder`, `fkit-sprint-ship-loop` Process-review worker)

Ledger: `review.md` in this folder. Plan blob re-hashed this run: `ec79417c…`, unchanged. One finding (R1).

### Decision log (autonomous calls, with why each qualified)

1. **R1 — ADR-107 note now pins the kept citation to commit `40ccb06`.** Finding: the kept sentence's
   `DefaultConfig.ts:247-249` citation now lands on code reading `60 * 1000`. Changed: one clause appended
   to the 0367 dated note in `ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md`
   ("its `DefaultConfig.ts:247-249` citation reads `120 * 1000` at commit `40ccb06`, not in later
   revisions"). Verified first with `git show 40ccb06:src/core/configuration/DefaultConfig.ts` (line 248 =
   `return 120 * 1000;`). Why it qualified: verified `CORRECT`; docs-only, one clause, no code; inside plan
   §2.4 (a dated note under the sentence, sentence untouched — the frontier point the plan chose is not
   moved); obvious winner — the reviewer's own suggested polish, and it follows
   `conventions/durable-citation-anchors.md` (a drifted coordinate is repaired, made re-resolvable).
2. **Recorded the dated-note-vs-rewrite choice as an accepted residual in `review.md`.** The tradeoff was
   already settled by the approved plan §2.4; recording it stops a later round re-raising it. No code.
