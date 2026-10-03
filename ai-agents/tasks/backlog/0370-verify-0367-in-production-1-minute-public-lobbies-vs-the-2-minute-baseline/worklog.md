# Worklog — 0370 verify 0367 in production (1-minute public lobbies vs the 2-minute baseline)

Append-only. Never rewrite earlier entries.

## 2026-10-03 — Step 1: deploy-day "before" re-run

Run by: `fkit-coder`, spawned by `fkit-lead` on the OWNER's live instruction in the `fkit lead` session today
(*"Yes, go ahead now"*). Read-only on every server. No source code written, nothing committed, no file moved,
`## Status` untouched.

**Query run:** 2026-10-03, 10:09:50–10:09:58 UTC.

### Deploy moment (verification step 1)

- **D = 2026-10-03.** Game prod `0.0.156` (image tag `20261003-123251`) went live 2026-10-03 **~09:32 UTC**
  (deploy facts as given by `fkit-lead`; commit `f712263` "DEPLOY prod: bump version to 0.0.156").
- **0367 is in what was deployed:** at `f712263` (= HEAD when this ran), `src/core/configuration/DefaultConfig.ts:247-250`
  `gameCreationRate()` returns `60 * 1000` with the 0367 `// Flashist Adaptation` comment.
- **Production confirms the cadence change** (same log source, prod, public lobbies created per UTC hour on 2026-10-03):
  06:00 → 30 · 07:00 → 30 · 08:00 → 30 · **09:00 → 40** · 10:00 (first ~10 min) → 9.
  30/hour = one lobby every 2 minutes; the 09:00 hour sits between 30 and 60, consistent with the switch at ~09:32;
  ~1/minute after. This is a consistency check, not a precise deploy timestamp.

### Window

**Before = 2026-09-26 00:00 → 2026-10-03 00:00 UTC** (7 full days; deploy day excluded per the owner ruling of
2026-10-02). All seven days on the 2-minute window. Weekday mix: one Saturday (09-26) and one Sunday (09-27) — the
After window (2026-10-04 Sun → 2026-10-10 Sat) has the same mix.

### Per-day table and 7-day totals

| day (UTC) | public lobbies | public matches with ≥1 real player | exactly 1 real player | **lone share** | avg real players | median |
|---|---|---|---|---|---|---|
| 2026-09-26 | 721 | 656 | 89 | 13.6 % | 5.41 | 5 |
| 2026-09-27 | 722 | 640 | 86 | 13.4 % | 4.93 | 5 |
| 2026-09-28 | 724 | 645 | 88 | 13.6 % | 7.90 | 7 |
| 2026-09-29 | 724 | 668 | 91 | 13.6 % | 8.20 | 7 |
| 2026-09-30 | 726 | 664 | 69 | 10.4 % | 8.27 | 7 |
| 2026-10-01 | 726 | 692 | 71 | 10.3 % | 8.21 | 7 |
| 2026-10-02 | 726 | 671 | 51 | 7.6 % | 8.80 | 8 |
| **7 days** | **5 069** | **4 636** | **545** | **11.8 %** (0.1176) | **7.41** | **6** |

- Lone share = exactly-1-real-player matches ÷ public matches with ≥ 1 real player (AI-only lobbies left out).
  If "÷ all public lobbies" is used instead: 545 / 5 069 = **10.8 %** — use the same form for both windows.
- Public matches with ≥ 1 real player: 4 636 / 7 ≈ **662/day**.

### Against 0367's 2026-10-02 reference (2026-09-25 → 2026-10-01)

| | 0367 reference | **this run (comparison baseline)** |
|---|---|---|
| lone share | 12.4 % (573 / 4 630) | **11.8 %** (545 / 4 636) |
| lone share ÷ all lobbies | 11.3 % | 10.8 % |
| public matches with ≥1 real player | ≈ 661/day | ≈ 662/day |
| avg / median real players | 7.31 / 6 | 7.41 / 6 |

- The six shared days (09-26 → 10-01) reproduce the reference **exactly**, row for row — the data has not moved or
  aged since 2026-10-02.
- The whole difference is the window shift: 09-25 (lone 11.9 %) dropped, 10-02 (lone **7.6 %**, the lowest day in
  either window) added.
- ⚠️ **Caveat for Step 3 ("noticeably"):** the lone share swings a lot day to day *on the same 2-minute window* —
  7.6 % to 13.6 % this week — and fell through the week (≈ 13.6 % Mon–Tue, ≈ 10.3 % Wed–Thu, 7.6 % Fri). So a
  7-day After share a point or two off 11.8 % is within normal week-to-week noise. Noted for the owner; not a ruling.

### Caveats

- **Retention:** oldest row in `uptrace.logs_index` today = 2026-09-19 00:00 UTC (~14 days, as in 0367/0259). By the
  day-7 read (2026-10-11) the start of this Before window would be ~15 days old and likely gone — which is why this
  run was needed today. The numbers above are now recorded and do not depend on retention.
- **The telemetry stack was restarted ~1 hour before this run** (all Uptrace compose services "Up About an hour" at
  query time). Not mid-query. A restart does not delete stored data; the hourly lobby counts above show no gap.
  It falls on deploy day, which both windows exclude.
- Only `prod` sends `sending start message` in the window (checked: one environment value, `prod`).
- **Log strings unchanged at HEAD (`f712263`)** — `"sending start message"` at `src/server/GameServer.ts:570`; the
  Worker's `creating ${Public|Private}… game with id ${id}` at `src/server/Worker.ts:252`. Query **not** modified
  beyond the two dates.
- Not done here (owner steps): Step 2 GameAnalytics "before" numbers — **not read** (no agent has GameAnalytics
  access); Step 3 "noticeably" number — not set.

### Query text (no credentials)

Same as 0367's § *Re-runnable query*, only the two dates changed, plus an output `FORMAT` clause. Fed to
`clickhouse-client --readonly=1` inside the telemetry box's `clickhouse` compose service, credentials from that
container's own environment.

```sql
WITH
  toDateTime64('2026-09-26 00:00:00', 6, 'UTC') AS window_start,
  toDateTime64('2026-10-03 00:00:00', 6, 'UTC') AS window_end,
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
SETTINGS join_use_nulls = 0
FORMAT PrettyCompactMonoBlock;
```

Side checks run in the same session (read-only): `min(time)` over `uptrace.logs_index` (retention); distinct
`deployment_environment_name` on `sending start message` since 2026-09-26; distinct public game ids per UTC hour on
2026-10-03 from 06:00 (deploy cadence).

### Access (as 0367 decision 5)

SSH to the telemetry box with the project's password-file fallback (`.env.telemetry.secret`, which enables
`ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK`); password passed to `sshpass -f` via a 0600 temp file removed on exit;
host name and domain redacted from all output; ClickHouse credentials from the container's own environment;
client run with `--readonly=1`; `SELECT`s only.

### Decision log

none — no fix applied and no judgment call made; a read-only reading only.

## 📌 2026-10-03 — Step 2: GameAnalytics "before" numbers

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021) under the OWNER RULING given live in the `fkit lead`
session on 2026-10-03, relayed by `fkit-lead`: **"Yes, record it (Recommended)"**. ⛔ Not producer precedent.
`## Status` untouched; nothing committed.

**Who read it, and how.** The owner asked the lead *"can you check GameAnalytics numbers yourself?"*; the **owner
logged in themselves**; `fkit-lead` read GameAnalytics **read-only through the owner's Chrome** (Explore; nothing
saved). ⚠️ The brief says Step 2 is **owner-read**; here the **lead** read it at the owner's request and with the
owner's login — recorded, not hidden.

**Query.** Event category **Design** · Aggregation **Count** · Event filter: event id 01 = `Game`, 02 = `Mode`, 03 =
`Multiplayer` (i.e. `Game:Mode:Multiplayer`) · Date range **"Past 7 days" = 26 Sep – 2 Oct 2026**, daily. Same
calendar days as Step 1's Before window; GameAnalytics' own day boundary / time zone was **not checked**.

**Label (per the brief): "multiplayer match entries per day"** — one per client per match, private lobbies included.
**NOT matches.**

| Day | Entries |
|---|---|
| Sat 26 Sep | 3.39K |
| Sun 27 Sep | 2.98K |
| Mon 28 Sep | 4.72K |
| Tue 29 Sep | 4.87K |
| Wed 30 Sep | 5.11K |
| Thu 1 Oct | 5.30K |
| Fri 2 Oct | 5.62K |
| **Total** | **31.98K** |
| **Mean** | **4.57K / day** |

GameAnalytics shows values rounded to 3 significant figures.

**Caveats.**
1. **Demo-mode element — judged real data, not proven.** The page's DOM contained a *"You're viewing data in Demo
   mode / Exit Demo"* element that was **NOT visible on screen**. The game named was *"Geoconfclict Yandex Games"*
   (sic) under org Flashist, and the scale fits the server baseline (~662 public matches/day × ~7.4 real players), so
   the lead judged it real data. **Not proven.**
2. **Context signals NOT read:** `UI:ClickMultiplayer` → `Game:Mode:Multiplayer` conversion, `Match:Spawned`,
   `Ad:Interstitial` per day. Stated as not read; nothing estimated.

**Still open:** Step 3 — the owner sets the number for "noticeably", before the day-4 snapshot.

## 📌 2026-10-03 — Step 3: "noticeably" set by OWNER RULING

**OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-10-03**, relayed by `fkit-lead` to a
spawned `fkit-producer` (no owner channel, ADR-021). ⛔ Not producer precedent. Recorded by the producer; `## Status`
untouched; nothing committed.

- **Question (verbatim):** *"Before: 11.8 % of matches had only 1 real player (single days ranged 7.6–13.6 %). After 7
  days of 1-minute lobbies, above what 7-day lone share do we say it got 'noticeably worse' and consider going back to
  2 minutes?"*
- **Answer (verbatim):** **"Above 15 % (Recommended)"** — option text: *"About 3 points over the 11.8 % baseline, and
  higher than the worst single day we saw (13.6 %). Normal ups and downs won't set it off, but a real jump will."*

**The threshold, as it will be applied.** The 7-day **"after"** lone share — the same query as Step 1, **After window
2026-10-04 → 2026-10-10** — **> 15 %** ⇒ **"noticeably worse"**. Baseline: **11.8 %** (Step 1, above).

**Set BEFORE any "after" data** — the day-4 snapshot is due **2026-10-08 00:00 UTC** (D + 5, D = 2026-10-03).

⚠️ **Not an automatic revert.** The ruling says *"consider going back"*: crossing 15 % puts reverting to the 2-minute
window on the table, and the owner still rules keep or revert (brief, Step 6). Note on form: the brief's Step 6 words
the rule as a **rise** ("did not rise by more than the Step 3 number"); the owner set an **absolute level** (15 %),
i.e. a rise of more than 3.2 points over 11.8 %. Step 6 applies the owner's 15 %.
