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

## 2026-10-10 — Step 4: day-4 snapshot (late), plus a 6-day interim read (NOT Step 5)

Run by: `fkit-coder`, spawned by `fkit-lead` on the OWNER's live instruction in the `fkit lead` session today
(*"it looks like you can do all the checks yourself, can't you? Just make the checks, tell me the numbers and ask the
question"*). Read-only on every server. No source code written, nothing committed, no file moved, `## Status`
untouched.

**Query run:** 2026-10-10, 08:24:11–08:24:13 UTC (one session, all three windows), plus a side run minutes later.

⚠️ **Timing.** Step 4 was due 2026-10-08 00:00 UTC; it is read here on 2026-10-10. The 4-day numbers do not depend on
when they are read (rows unchanged — see the Before re-check). The **6-day** table is an **interim**, **NOT the day-7
Step 5 read** — that needs 2026-10-04 → 2026-10-11 00:00 UTC and is only possible after 2026-10-11 00:00 UTC.
2026-10-10 (incomplete) is excluded. GameAnalytics was **not read** in this run (Step 4's owner-read half is open).

### Query

Step 1's query text, only the two dates changed, plus one extra output column `sum(humans) AS
real_player_match_entries` (as the 2026-10-06 interim did). Windows: **day-4** 2026-10-04 → 2026-10-08;
**6-day** 2026-10-04 → 2026-10-10; **Before** 2026-09-26 → 2026-10-03. Access as Step 1 (password-file fallback,
`clickhouse-client --readonly=1` in the `clickhouse` compose service, credentials from the container's own
environment, host redacted). `SELECT`s only.

### Per-day (After, 1-minute window)

| day (UTC) | public lobbies | public matches with ≥1 real player | exactly 1 real player | **lone share** | avg real players | median | real-player match entries |
|---|---|---|---|---|---|---|---|
| 2026-10-04 Sun | 1 445 | 1 157 | 293 | **25.3 %** | 3.32 | 3 | 3 844 |
| 2026-10-05 Mon | 1 446 | 1 233 | 196 | **15.9 %** | 5.31 | 5 | 6 542 |
| 2026-10-06 Tue | 1 445 | 1 253 | 198 | **15.8 %** | 5.22 | 5 | 6 546 |
| 2026-10-07 Wed | 1 447 | 1 217 | 214 | **17.6 %** | 5.00 | 4 | 6 080 |
| 2026-10-08 Thu | 1 446 | 1 242 | 194 | **15.6 %** | 5.75 | 5 | 7 147 |
| 2026-10-09 Fri | 1 446 | 1 268 | 208 | **16.4 %** | 5.57 | 5 | 7 060 |

### Totals

| window | public lobbies | public matches with ≥1 real player | exactly 1 | **lone share** | lone ÷ all lobbies | avg | median | real-player match entries |
|---|---|---|---|---|---|---|---|---|
| **Before** 09-26 → 10-03 (7 d, 2-min) | 5 069 | 4 636 (662/day) | 545 | **11.8 %** (0.1176) | 10.8 % | 7.41 | 6 | 34 354 (4 908/day) |
| **Day-4** 10-04 → 10-08 (4 d, 1-min) — Step 4 | 5 783 | 4 860 (1 215/day) | 901 | **18.5 %** (0.1854) | 15.6 % | 4.73 | 4 | 23 012 (5 753/day) |
| **6-day interim** 10-04 → 10-10 (6 d, 1-min) — NOT Step 5 | 8 675 | 7 370 (1 228/day) | 1 303 | **17.7 %** (0.1768) | 15.0 % | 5.05 | 4 | 37 219 (6 203/day) |

Same-weekday comparison (each After day against the Before day with the same weekday; derived from the per-day rows
above and Step 1's table):

| | Before | After | change |
|---|---|---|---|
| Sun–Wed (day-4 days) lone share | 334 / 2 617 = 12.8 % | 901 / 4 860 = **18.5 %** | +5.8 pts |
| Sun–Wed real-player match entries | 19 225 | 23 012 | **+19.7 %** |
| Sun–Fri (6-day days) lone share | 456 / 3 980 = 11.5 % | 1 303 / 7 370 = **17.7 %** | +6.2 pts |
| Sun–Fri real-player match entries | 30 808 | 37 219 | **+20.8 %** |

### Reading (plain language — not a verdict; the owner rules keep/revert)

- **Lone share is over the owner's 15 % line on both reads:** day-4 **18.5 %**, 6-day **17.7 %**, vs **11.8 %** Before.
  **Every** After day is over 15 % (lowest 15.6 %, Thu); the **worst Before day was 13.6 %**. Sunday 10-04 (25.3 %) is
  the high point, but weekdays alone still run 15.6–17.6 %.
- ⚠️ **Arithmetic, not a read:** 1 303 lone matches are already in. For the 7-day share to come in at 15 % or under,
  Saturday 10-10 would need at least ~1 317 real-player matches with **zero** lone ones (1 303 ÷ 0.15 = 8 687 total);
  with zero lone and Saturday's likely ~1 200 matches it would still be 15.2 %. So the Step 5 number will almost
  certainly also be over 15 %; Step 5 still has to be run.
- **Players per match fell:** avg 7.41 → 4.73 (day-4) / 5.05 (6-day); median 6 → 4. Lobbies doubled by construction
  (~724 → ~1 446/day).
- **More playing happened:** real-player match entries **+20.8 %** on matched weekdays (Sun–Fri). This counts
  player-in-match starts, **not unique players** — it may be people playing more matches, not more people. The ruled
  "holds steady or rises" signal is GameAnalytics `Game:Mode:Multiplayer`, **not read here**.
- So on these numbers the two halves of the rule point opposite ways: activity up, lone share over the line.

### Checks

- **Before reproduces exactly:** all seven rows (09-26 → 10-02) match Step 1 row for row; totals 5 069 / 4 636 / 545 /
  0.1176 / 7.41 / 6.
- ⚠️ **Retention:** oldest row in `uptrace.logs_index` today = **2026-09-26 00:00:00 UTC** — exactly the Before window's
  first day. It will very likely be gone tomorrow; Step 1's recorded numbers stand regardless. (`max(time)` reads
  2026-10-10 16:32 UTC, ahead of the clock — some log rows carry future timestamps; it does not affect these windows,
  all of which end in the past.)
- **No telemetry restart in the After window:** all Uptrace compose containers started 2026-10-03 ~09:05 UTC (deploy day,
  excluded). **No gap:** every one of the 144 hours 10-04 → 10-10 has 59–61 public lobbies.
- Only `prod` sends `sending start message` since 2026-10-03.
- **Log strings unchanged at HEAD (`bcc9bf0`):** `"sending start message"` — now `src/server/GameServer.ts:688`, still
  logged once per active client inside `start()`; the Worker's `creating ${Public|Private}… game with id ${id}` — now
  `src/server/Worker.ts:321`, text identical to `f712263`. Only the line numbers moved. `gameCreationRate()` still
  `60 * 1000` at HEAD.

### ⚠️ Game deploys inside the After window — possible confounders

Version-bump commit times (UTC; commit time, **not a verified go-live time**):

| version | commit | time (UTC) |
|---|---|---|
| 0.0.157 | `c12cd8e` | 2026-10-08 06:51 |
| 0.0.158 | `fc4fdcd` | 2026-10-08 19:49 |
| 0.0.159 | `3ec3017` | 2026-10-08 19:53 |
| 0.0.160 | `67889bf` | 2026-10-08 19:55 |
| 0.0.161 | `d694bba` | 2026-10-09 07:31 |

`f712263..d694bba` touches 59 files under `src/` (tasks incl. private-lobby work `0353 0354 0374 0377 0380 0389`, and
`0332` identity counting in `GameServer.ts`). Not checked whether any of it changes who joins public lobbies. Thu/Fri
(10-08/09) — the days these deploys land on — read 15.6 % / 16.4 %, in line with Mon–Wed, so no visible step; the
day-4 window (10-04 → 10-07) has **no** game deploy in it. Lobby creation shows no gap around them.

### Not done

- GameAnalytics day-4 / 6-day numbers — **not read** (owner-read half of Step 4).
- Step 5 (day-7) and Step 6 (ruling) — not yet possible / owner's.

### Decision log

none — read-only reading only; no fix, no judgment call on keep/revert (that is the owner's).

## 📌 2026-10-10 — Step 4 GameAnalytics half, and Step 6: OWNER RULING "Keep 1 minute"

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021/037), on facts and an **OWNER RULING relayed by
`fkit-lead`** from the `fkit lead` session. ⛔ Not producer precedent. `## Status` untouched (`🔲 Backlog`); no mover
run; nothing committed; no wiki write.

### Step 4 — GameAnalytics half (the part the entry above lists as "not read")

**Who read it, and how.** `fkit-lead`, 2026-10-10, **read-only through the owner's Chrome** with the owner already
logged in; nothing saved. ⚠️ As in Step 2, the brief says this half is **owner-read**; the **lead** read it — recorded,
not hidden.

**Query — same as Step 2.** Explore · Event category **Design** · Aggregation **Count** · Event filter 01 = `Game`,
02 = `Mode`, 03 = `Multiplayer` · Date range **"Past 14 days" = 26 Sep – 9 Oct 2026**, daily, current day excluded.
GameAnalytics' own day boundary / time zone still **not checked**.

**Label: "multiplayer match entries per day"** — one per client per match, private lobbies included. **NOT matches.**

⚠️ **Demo-mode caveat again.** The page DOM again contained the *"You're viewing data in Demo mode / Exit Demo"* text —
same as Step 2 caveat 1. Judged real data on the same grounds; **not proven.** Supporting check: the 7 Before days
**reproduce Step 2 exactly**, day by day.

| Day | Entries | window |
|---|---|---|
| Sat 26 Sep | 3.39K | Before |
| Sun 27 Sep | 2.98K | Before |
| Mon 28 Sep | 4.72K | Before |
| Tue 29 Sep | 4.87K | Before |
| Wed 30 Sep | 5.11K | Before |
| Thu 1 Oct | 5.30K | Before |
| Fri 2 Oct | 5.62K | Before |
| Sat 3 Oct | 3.91K | deploy day — **excluded** |
| Sun 4 Oct | 3.68K | After (day-4) |
| Mon 5 Oct | 6.22K | After (day-4) |
| Tue 6 Oct | 6.37K | After (day-4) |
| Wed 7 Oct | 5.92K | After (day-4) |
| Thu 8 Oct | 6.75K | After (6-day only) |
| Fri 9 Oct | 6.80K | After (6-day only) |

GameAnalytics' own 14-day total: **71.62K** (the rounded daily values sum to 71.64K — 3-significant-figure rounding).

| window | total | per day | vs Before |
|---|---|---|---|
| **Before** 26 Sep – 2 Oct (7 d) | 31.99K *(sum of the rounded values; Step 2 recorded 31.98K)* | **4.57K** | — |
| **Day-4** 4 – 7 Oct (4 d) | 22.19K | **5.55K** | +21 % |
| **6-day** 4 – 9 Oct (6 d) — interim, NOT Step 5 | 35.74K | **5.96K** | **+30 %** |

**Same weekday, week on week:** every After day is above the same weekday the week before — Sun +23 %, Mon +32 %,
Tue +31 %, Wed +16 %, Thu +27 %, Fri +21 % (range **+16 % to +32 %**). Note the day-4 window is Sun–Wed while Before
is a full week, so the same-weekday figures are the fairer read.

**Reading against the rule:** entries per day **rose** — the first half of the Step 6 rule (*"hold steady or rise"*)
**passes**.

### Step 6 — OWNER RULING 2026-10-10: keep 1-minute lobbies

**OWNER RULING given live 2026-10-10 via `AskUserQuestion`** in the `fkit lead` session, relayed by `fkit-lead`.

- **Answer (verbatim):** **"Keep 1 minute"**
- **Option text (verbatim):** *"Accept the higher one-player share in exchange for more matches; record that you
  overrode the 15% line."*

**What was put to the owner:**
- (a) Multiplayer match entries per day **+30 %** (6-day) — **passes**.
- (b) Lone-player share **11.8 % → 17.7 %** (6-day; day-4 **18.5 %**), **over 15 % on every day** since the change —
  **fails** the Step 3 line. Average real players per match **~7.4 → ~5**.
- By the Step 3 rule this read as **revert**. The day-7 number cannot realistically fall below 15 %.
- Caveat: game deploys **0.0.157 – 0.0.161** on 8–9 Oct fall inside the 6-day After window (the day-4 window has none) —
  see the confounder table in the entry above.
- **Lead's recommendation was revert. The owner chose keep.**

⚠️ **The owner OVERRODE the 15 % line set in Step 3.** Recorded plainly: the lone-player criterion failed and the
owner kept the change anyway, trading a higher share of one-real-player matches for more match entries. This is the
owner's call under Step 6 (*"The owner rules keep or revert"*), not a re-reading of the threshold — the 15 % line
itself is unchanged and was not met.

**Outcome:**
- **1-minute public lobbies stay** (`0367` stands as shipped).
- **No revert task filed** — verification step 8 (*"If revert: a new task …"*) does not apply.
- Verification step 7 (*"Step 6 recorded: the owner's keep/revert ruling, verbatim, with the date"*) — **met by this
  entry.**

### What remains

- **Step 5 — the day-7 read is NOT yet run.** After window **2026-10-04 → 2026-10-11 00:00 UTC** (i.e. through
  10-10 inclusive), both sources. It is now **informational only** — the decision is already made and Step 5 cannot
  change it. Verification step 6 (*"Step 5 recorded"*) stays open until then.
- **Task stays open** (`🔲 Backlog`) for Step 5. Either the driver runs it after 2026-10-11 00:00 UTC, or the owner
  is asked whether to close without it (dropping an informational read is the owner's call, not the producer's).
- Close only via `/fkit-task-done` (producer-only), carrying `(agent-closed — not owner-verified)` if no owner is
  present.

### Decision log

- Owner ruling recorded (above). No judgment call by the producer. Arithmetic (window sums, per-day means, % changes,
  same-weekday deltas) re-checked by the producer from the per-day values; agrees with the lead's figures.

## 📌 2026-10-10 — CLOSED `✅ Done (agent-closed — not owner-verified)`; Step 5 NOT run; recheck filed as `0435`

Recorded by a spawned `fkit-producer` (no owner channel, ADR-021/037), which ran `/fkit-task-done`. ⛔ Not producer
precedent. Nothing committed; no wiki write.

**Authority — OWNER RULING 2026-10-10, typed by the owner in the `fkit lead` session** (the owner's own message, not an
`AskUserQuestion` answer), relayed verbatim by `fkit-lead`: *"Regarding 0370 - you can close the task, but add one task
to Backlog, to recheck the numbers after a while (no specific date, whenever we got back to the task)"*.

**Result of the test.**
- **Step 6 — OWNER RULING "Keep 1 minute"** (2026-10-10, entry above): 1-minute public lobbies stay. The owner
  **overrode the Step 3 line of 15 %**: lone-player share **17.7 %** over the 6-day After interim (day-4 **18.5 %**) vs
  **11.8 %** Before; multiplayer match entries per day **+30 %** (6-day, GameAnalytics `Game:Mode:Multiplayer`, 5.96K vs
  4.57K/day). No revert task (verification step 8 does not apply).

**What was NOT done — stated plainly.**
- ⚠️ **Step 5, the day-7 read (After window 2026-10-04 → 2026-10-11 00:00 UTC), was NOT run** — neither the server query
  nor GameAnalytics. The owner closed the task first. The scheduled night read was **cancelled by `fkit-lead`**.
- ⇒ **Verification step 6 ("Step 5 recorded") is NOT met.** It is carried, in a looser form (a recent 7-day window, not
  this exact one), by the new recheck task
  [`0435`](../../backlog/0435-recheck-the-1-minute-public-lobby-numbers-some-time-later/brief.md) on the Backlog board.
- Verification steps 1–5 and 7 are met by the entries above (Step 4's GameAnalytics half was read by `fkit-lead`, not the
  owner — recorded there). Step 8 n/a. Step 9: nothing failed to read. Step 10: no host, IP, URL or credential here.

**Retention — why the Before numbers are safe.** Uptrace keeps about 14 days of rows. On 2026-10-10 the oldest row was
2026-09-26 00:00 UTC — the first day of the Before window — so the Before window's **raw rows age out about now**. That
does not matter for a later recheck: Step 1's Before numbers (per-day table and 7-day totals: lone share **11.8 %**,
avg **7.41** real players, **~662** matches/day with a real player) and Step 2's GameAnalytics Before numbers
(**4.57K** entries/day) are **recorded in this worklog**, and `0435` compares against these recorded figures, not
against a fresh query of the old window.

### Decision log

- Close performed on the owner's typed ruling (above); marker `(agent-closed — not owner-verified)` because the closing
  producer was spawned with no owner present. No judgment call by the producer on keep/revert.
