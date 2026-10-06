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

## ⚠️ Interim early look — 2026-10-06, NOT the day-4 snapshot or Step 6 result

Run by a spawned `fkit-producer` (no owner channel, ADR-021), on `fkit-lead`'s bounded unit after the owner asked
(2026-10-06): *"Do we have any stats about the amount of players per 1 match? I wonder if our latest change of "wait"
for the public lobby matches from 2m to 1m made any difference to this metric"*. Read-only on every server. No status,
rank or brief text changed; no mover run; nothing committed. **This is not a verdict and not a reading the decision
rule uses** — the day-4 snapshot (Step 4, due 2026-10-08) and the day-7 read (Step 5, 2026-10-11) stand as planned.

**Query run:** 2026-10-06, 13:19:23–13:19:48 UTC. **Windows:** 2026-10-04 00:00 → 2026-10-06 00:00 UTC (2 full days on
the 1-minute window: Sun 10-04, Mon 10-05); deploy day 2026-10-03 for context only (mixed — deploy ~09:32 UTC).
**Query:** Step 1's query text unchanged except the two dates (one run 2026-10-03 → 2026-10-06 grouped by day; one run
2026-10-04 → 2026-10-06 ungrouped for the 2-day totals and median), plus one extra column `sum(humans)` (=
"real-player match entries") and an hour-of-day slice (00:00–09:00 UTC) in a side run. Same definitions as the
baseline. Access as Step 1 (password-file fallback, `clickhouse-client --readonly=1`, container's own credentials,
host redacted). The same side run re-read 2026-09-26 → 10-02: **all seven Before rows reproduce Step 1 exactly.**
Retention: oldest row today 2026-09-22 00:00 UTC. `sending start message` since 2026-10-03: environment `prod` only.

### Per-day table

| day (UTC) | window | public lobbies | public matches with ≥1 real player | exactly 1 real player | **lone share** | avg real players | median |
|---|---|---|---|---|---|---|---|
| 2026-10-03 (Sat) | deploy day, **mixed** — context only | 1 153 | 1 030 | 162 | 15.7 % | 3.87 | 3 |
| 2026-10-04 (Sun) | 1-minute | 1 445 | 1 157 | 293 | **25.3 %** | 3.32 | 3 |
| 2026-10-05 (Mon) | 1-minute | 1 446 | 1 233 | 196 | **15.9 %** | 5.31 | 5 |
| **10-04 + 10-05** | 1-minute | **2 891** | **2 390** | **489** | **20.5 %** (0.2046) | **4.35** | **4** |

Deploy-day split (context only): 00–09 UTC (2-minute) lone 21.6 %, avg 3.70 · 09–10 (mixed) 7.9 %, 5.68 · 10–24 UTC
(1-minute) 14.4 %, 3.82. ⚠️ Not comparable to each other — night hours always run lonelier (see below).

### Against the Before baseline (Step 1)

| | Before, matching day | After | Before, 7-day (Step 1) |
|---|---|---|---|
| Sunday | 09-27: lone **13.4 %**, avg **4.93**, median 5 | 10-04: lone **25.3 %**, avg **3.32**, median 3 | |
| Monday | 09-28: lone **13.6 %**, avg **7.90**, median 7 | 10-05: lone **15.9 %**, avg **5.31**, median 5 | |
| Sun + Mon | lone 13.5 % (174 / 1 285), avg 6.42 | lone **20.5 %** (489 / 2 390), avg **4.35**, median 4 | lone **11.8 %**, avg **7.41**, median **6** |
| public matches with ≥1 real player / day | 640 (Sun), 645 (Mon) | 1 157 (Sun), 1 233 (Mon) | ≈ 662/day |
| **real-player match entries** (`sum(humans)`) | 3 157 (Sun), 5 098 (Mon) = 8 255 | 3 844 (Sun), 6 542 (Mon) = **10 386 (+26 %)** | — |

Same-hours check, lone share in 00:00–09:00 UTC only: Sun 23.7 % → **40.1 %**; Mon 23.8 % → 23.4 %. Avg real
players 00–09 UTC: Sun 3.76 → 2.36; Mon 5.55 → 4.56.

### Reading (plain language — not a verdict)

- **Players per match fell, as expected by construction.** Avg real players per match: 7.41 (Before, 7 days) →
  **4.35** (2 days After); median 6 → 4. Day-matched: Sunday 4.93 → 3.32, Monday 7.90 → 5.31 (about one-third fewer
  real people per match). Lobbies doubled (~722 → ~1 445/day), so the same players are spread over twice as many matches.
- **Lone share is above the owner's 15 % line on this early sample:** 20.5 % over the 2 days vs 11.8 % Before.
  Monday alone (15.9 %) is just over; **Sunday (25.3 %) drives most of it**, and within Sunday the night hours (40 % lone
  00–09 UTC). The 15 % line applies to the **7-day** After share (Step 3); 2 days cannot settle it.
- **Total real-player match entries rose ~26 %** on the matched days (8 255 → 10 386). This is a count of
  player-in-match starts, **not unique players** — it may mean people play more matches (shorter wait), not that more
  people came. GameAnalytics (`Game:Mode:Multiplayer`) was **not read** in this look.
- **Caveats:** 2 days only; one of them a Sunday, the weakest day of the Before week; the Before week's lone share was
  falling day by day (13.6 % → 7.6 %), so week-to-week noise is large; what else shipped in `0.0.156` alongside `0367`
  was not checked here; the deploy-day row is mixed and time-of-day skewed.

### Decision log

none — read-only reading only; no fix, no judgment call on keep/revert (that is the owner's, at Step 6).

## 📌 2026-10-06 — OWNER RULING: wait for the day-4 snapshot, decide keep/revert by the weekend

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021/037), on an **OWNER RULING given live 2026-10-06 via
`AskUserQuestion`** in the `fkit lead` session, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`). ⛔ Not producer
precedent.

**Ruling, verbatim:** *"Wait for day-4, decide by weekend (Recommended)"*.

**Option text, as relayed:** the planned day-4 snapshot on 2026-10-08 adds Tue/Wed. That is still before the weekend
deploy slot, so waiting costs nothing. If the lone share is still over 15 %, the owner decides on reverting to 2 minutes
in time for the 10/11 Oct deploy.

**Context it answers:** the interim early look above (2026-10-06) — lone share **20.5 %** over 10-04/10-05 vs **11.8 %**
Before; avg real players per match **7.41 → 4.35**.

**What this changes, in plain terms:**
- No revert now. The day-4 snapshot (Step 4, due 2026-10-08 00:00 UTC) runs as planned.
- If the day-4 lone share is **still over 15 %**, the **owner** decides keep vs revert-to-2-minutes **before the
  2026-10-10/11 deploy slot** — i.e. the day-4 read, which the brief calls *"mid-test, informational"*, becomes the input
  to that decision if the line is crossed. The day-7 read (Step 5, 2026-10-11) still happens.
- If it is 15 % or under, nothing is decided early; Steps 5–6 stand as written.
- A revert, if ruled, is a **new task** (brief *Notes*: "A revert, if ruled, is a new task").

**Not changed:** status (`🔲 Backlog`), rank, brief steps text, the 15 % line, the windows. No mover run. Nothing
committed.

### Decision log

- Owner ruling recorded (above). No judgment call by the producer.
