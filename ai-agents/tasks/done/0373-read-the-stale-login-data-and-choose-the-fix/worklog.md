# Worklog — 0373 Read the stale-login data and choose the fix

## 2026-10-05 — Step 0: prediction table frozen (before the interim read)

**Frozen at (UTC, from `date -u` this turn): `2026-10-05T13:27:36Z`**

Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER INSTRUCTION given 2026-10-05
in the `fkit lead` session, relayed by `fkit-lead`. No data was read by the recording producer before or while
writing this section.

Copied exactly from the brief's *Step 0* table. Additions are allowed before Step 1; nothing is edited after it.

| If the readings show… | It supports… | Fix direction |
|---|---|---|
| stale mostly on `AfterMatch` boots **and** A2 mostly `Same` | Yandex returns the same signed data for the whole visit | owner chooses among (a)/(b)/(c) below |
| A2 mostly `Newer` | a second Yandex call gives fresh data | a small client refetch task |
| stale mostly `past_15m_20m`, mostly on `FirstBoot` | the 900 s window is simply too tight | a simple window retune |
| stale mostly `future_*` | a clock problem somewhere | look at clocks |
| none of these clearly | — | record *"not determined"*; the owner decides whether to measure more (e.g. the skipped A4 server label) or choose anyway |

⚠️ An **interim** read follows on 2026-10-05 at the owner's request, with about 2 days of data since the 2026-10-03
deploys (game ~09:32 UTC, profile ~10:02 UTC). It does **not** satisfy precondition 3 (fewer than the required 5–7
days) and is **not** the decision read; Steps 3–4 still wait for the full window (earliest after the evening of
Saturday 2026-10-10 UTC).

> ⚠️ **Correction to the relayed wording, made by the recording producer.** The spawn instruction said this read
> has *"no weekend evening yet"*. By the brief's own dates that is not right: 2026-10-03 was a **Saturday** and
> 2026-10-04 a **Sunday** (checked with `date` this turn), and both deploys landed before 20:00 UTC on the Saturday,
> so the evenings of Sat 2026-10-03 and Sun 2026-10-04 (UTC 20–23) **fall inside** the post-deploy window. What
> precondition 3 lacks is the **5–7 day length**, not a weekend evening. Whether the readings actually *contain*
> those evening hours is for the interim read to confirm, not assumed here.

## 2026-10-05 — INTERIM Step 2 (GameAnalytics), 3–4 Oct only — NOT the decision read

Recorded by a spawned `fkit-producer` with no owner channel, on the readings `fkit-lead` took at the owner's request
(*"go, try GameAnalytics through Chrome"*), given in the `fkit lead` session on 2026-10-05. The recording producer did
not read GameAnalytics itself; the figures below are copied exactly as the lead relayed them.

**How and when they were read**
- Where: the owner's GameAnalytics account, through Chrome, **read-only**. Explore → Design events, aggregation
  "Count" (event count), range "Past 7 days".
- When: reads started about **13:35Z** on 2026-10-05 — **after** the Step 0 freeze at `2026-10-05T13:27:36Z`. They
  finished **before `2026-10-05T13:38:11Z`** (`date -u` taken by the recording producer this turn).
- GA showed a **"Demo mode" banner on every page**, as it did on 2026-09-29.
- Days covered: **3 Oct and 4 Oct 2026 only.** 5 Oct is not in "Past 7 days". **3 Oct is partial** — the game
  release went out at about 09:32 UTC that day.
- ⚠️ Interim only: about 1.6 days of data, short of precondition 3's 5–7 days. **Not the decision read.**

### A1 — `Profile:Login:SignatureAge:*`, event count, all boot kinds, by label

| Day | Fresh | Past1h6h | Past30m1h | Past20m30m | Past15m20m | Past6h24h | PastOver24h | FutureOver15m | Future5m15m |
|---|---|---|---|---|---|---|---|---|---|
| 3 Oct | 3.30K | 602 | 423 | 298 | 206 | 145 | 111 | 14 | 9 |
| 4 Oct | 4.30K | 775 | 594 | 376 | 265 | 166 | 115 | 34 | 22 |

No `Unreadable` label appeared.

**By boot kind (all labels), event count:**
- 3 Oct: AfterMatch 2.76K, FirstBoot 2.35K.
- 4 Oct: AfterMatch 3.63K, FirstBoot 3.02K.

**AfterMatch only, by label, event count:**

| Day | Fresh | Past1h6h | Past30m1h | Past20m30m | Past15m20m | Past6h24h | PastOver24h | Future5m15m | FutureOver15m |
|---|---|---|---|---|---|---|---|---|---|
| 3 Oct | 1.19K | 530 | 400 | 282 | 195 | 84 | 70 | 4 | 2 |
| 4 Oct | 1.57K | 714 | 555 | 365 | 251 | 95 | 69 | 6 | 6 |

(Note the last two columns are in a different order from the first table, as relayed.)

**A1 unique users per label, all boot kinds** (also seen by the lead):

| Day | Fresh | Past30m1h | Past20m30m | Past1h6h | Past15m20m | Past6h24h | PastOver24h | FutureOver15m | Future5m15m |
|---|---|---|---|---|---|---|---|---|---|
| 3 Oct | 1.15K | 205 | 203 | 178 | 161 | 68 | 43 | 6 | 1 |
| 4 Oct | 1.46K | 281 | 245 | 217 | 193 | 77 | 52 | 8 | 5 |

⚠️ The 4 Oct unique-user figures were relayed as a bare list (*"Fresh 1.46K, 281, 245, 217, 193, 77, 52, 8, 5"*);
they are placed here in the same label order as the 3 Oct list. That mapping is the recording producer's reading of
the relay, not a separate check.

### Derived by the lead — arithmetic only, approximate

GA rounds the "K" values, so every figure below is approximate. The recording producer re-did each sum from the
tables above and got the same results.

- **Non-Fresh share, all logins:** 3 Oct ≈ 35.4% (1,808 / ~5,108); 4 Oct ≈ 35.3% (2,347 / ~6,647). This is near the
  server's earlier ~32%, so the device-clock check passes approximately. `Future*` is under 1%.
- **AfterMatch non-Fresh share:** ≈ 56.8% on both days. **FirstBoot non-Fresh share:** ≈ 10.3% (3 Oct) and
  ≈ 9.5% (4 Oct).
- **Share of all non-Fresh that is AfterMatch:** ≈ 87% (3 Oct) and ≈ 88% (4 Oct).
- **Non-Fresh by age:** `Past15m20m` (the ambiguous bracket) is only about 11% of non-Fresh. Most non-Fresh is
  30 min or older: `Past30m1h` + `Past1h6h` ≈ 57% (3 Oct).
- **FirstBoot non-Fresh** leans to very old ages: `Past6h24h` + `PastOver24h` ≈ 42% of FirstBoot non-Fresh on 3 Oct.

### NOT read

- **A2 — NOT read. Still needed.** The `Profile:Login:Signature:Refetch:*` Newer / Same / Failed split. GA's filter
  UI would not let the lead switch the filter cleanly.
- **A3 — NOT read.** The mean held ms on `Signature:Ready`.
- **Per-device split — NOT read.**
- **Unique users vs events — NOT read beyond A1** (the A1 unique-user table above is all there is).
- **Step 1 (server reading) — NOT done.** This session's permission check blocked the read-only production query.
  No server figures exist for this interim read.

**Steps 3–4 were not done.** These readings have not been matched to the frozen Step 0 table, and no fix direction
is proposed. Both wait for the full window and the decision read.

## 2026-10-05 — INTERIM Step 1 (server), 3 Oct 10:04Z → 5 Oct ~13:58Z — NOT the decision read

Recorded by a spawned `fkit-producer` with no owner channel, on readings `fkit-lead` took in the owner's session under
the OWNER APPROVAL given 2026-10-05 in the `fkit lead` session, verbatim: *"Regarding GameAnalytics - you can do it
yourself via Chrome. Regarding reading only ssh to a server: I give you my approve."* The recording producer did not
query the server itself; the figures below are copied exactly as the lead relayed them. This supersedes the
*"Step 1 (server reading) — NOT done"* line in the section above — that was true when written.

**How and when they were read**
- Read-only SSH to the telemetry box (password-file fallback, as in `0367`/`0370`), `clickhouse-client --readonly=1`,
  `SELECT` only. Host redacted.
- Table `uptrace.datapoints` joined to `uptrace.timeseries` by fingerprint. Counter deltas summed from `sum`.
- Metrics `geoconflict_profile_login_verification` (label `outcome::str`) and
  `geoconflict_profile_login_verification_stale_age` (label `bracket::str`).
- Both metrics come from `service_version=0.0.156-profile.1`, a single instance.
- Window starts **2026-10-03 10:04 UTC**, the first post-deploy point. Nothing was compared across the restart.
- Queries ran between **2026-10-05T13:58:28Z and ~14:01Z**, all **after** the Step 0 freeze at `13:27:36Z`.
- ⚠️ Interim only: about 2.2 days, short of precondition 3's 5–7 days. **Not the decision read.**

**Outcome totals:** ok **11,019** · stale **5,618** · id_mismatch **6** → stale ≈ **33.8%**. No `absent` outcome
appeared.

**Stale age brackets** (they sum to 5,618):

| past_1h_6h | past_30m_1h | past_20m_30m | past_15m_20m | past_over_24h | past_6h_24h |
|---|---|---|---|---|---|
| 1,921 | 1,362 | 882 | 620 | 417 | 416 |

- **No `future_*` bracket at all** on the server.
- past_15m_20m ≈ 11% of stale; past_30m_1h + past_1h_6h ≈ 59% (as relayed).

**Stale share by day:**

| Day (UTC) | stale / total | stale share |
|---|---|---|
| 3 Oct (from 10:04) | 1,714 / 4,947 | **34.6%** |
| 4 Oct | 2,262 / 6,726 | **33.6%** |
| 5 Oct (to ~14:00) | 1,644 / 4,978 | **33.0%** |

**Stale share by hour of day (UTC), all days pooled:**

| Hour | ok | stale | % stale | | Hour | ok | stale | % stale |
|---|---|---|---|---|---|---|---|---|
| 00 | 60 | 37 | 38.1 | | 12 | 954 | 503 | 34.5 |
| 01 | 43 | 25 | 36.8 | | 13 | 1009 | 475 | 32.0 |
| 02 | 50 | 30 | 37.0 | | 14 | 590 | 276 | 31.9 |
| 03 | 112 | 44 | 28.2 | | 15 | 610 | 350 | 36.5 |
| 04 | 150 | 66 | 30.6 | | 16 | 610 | 344 | 36.1 |
| 05 | 297 | 117 | 28.3 | | 17 | 605 | 325 | 34.9 |
| 06 | 447 | 153 | 25.5 | | 18 | 504 | 297 | 37.0 |
| 07 | 542 | 179 | 24.8 | | 19 | 451 | 223 | 33.1 |
| 08 | 582 | 257 | 30.6 | | 20 | 279 | 230 | **45.2** |
| 09 | 667 | 329 | 33.0 | | 21 | 203 | 145 | **41.7** |
| 10 | 1076 | 478 | 30.8 | | 22 | 109 | 118 | **52.0** |
| 11 | 1005 | 551 | 35.4 | | 23 | 70 | 68 | **49.3** |

**Weekend evenings are present** — this confirms what the Step 0 correction note left open:
- 3 Oct (Sat) 20–23 UTC: 307, 187, 128 and 68 logins per hour.
- 4 Oct (Sun) 20–23 UTC: 202, 161, 99 and 70 logins per hour.

**Arithmetic re-checked by the recording producer** (relayed figures above are left as relayed):
- Outcome share, bracket sum, past_15m_20m share and the three day shares all re-compute as relayed.
- past_30m_1h + past_1h_6h = 3,283 / 5,618 = **58.4%**, not 59%.
- Hour 02 re-computes to **37.5%** (relayed 37.0); hour 18 to **37.1%** (relayed 37.0). All other hours match.
- The figures do not tie exactly across queries: hourly columns sum to ok 11,025 / stale 5,620, and day stales sum to
  5,620, against the totals' 11,019 / 5,618. The day totals sum to 16,651 = 11,025 + 5,620 + 6, so they appear to
  include `id_mismatch`. The small gap (+6 ok, +2 stale) fits the queries running a few minutes apart on a live
  table, but **that is the recording producer's reading, not a checked fact**. No conclusion depends on it.

## 2026-10-05 — INTERIM Step 2 addendum: A2 Refetch (GameAnalytics), 3–4 Oct — NOT the decision read

Recorded by a spawned `fkit-producer` with no owner channel, on readings `fkit-lead` took under the same owner approval
quoted above. The recording producer did not read GameAnalytics itself; the figures are copied exactly as relayed.

**How and when they were read**
- GameAnalytics Explore through the owner's Chrome, **read-only, nothing saved**. Design events, Count, Past 7 days.
- Filter `Profile` → `Login` → `Signature` → `Refetch`, split by event id 05.
- "Demo mode" banner shown.
- Read at about **14:00–14:02Z** on 2026-10-05, after the Step 0 freeze.
- ⚠️ Interim only, 3–4 Oct (3 Oct partial). **Not the decision read.**

**A2 — `Profile:Login:Signature:Refetch:*`, event count**

| Day | Same | Newer |
|---|---|---|
| 3 Oct | **1.77K** | **13** |
| 4 Oct | **2.27K** | **18** |

- **No `Failed` value appeared**, and no `Older`.

**Derived by the lead — approximate** (GA rounds the "K" values):
- `Newer` ≈ 0.7–0.8% of Refetch outcomes; `Same` ≈ 99%. (Recording producer re-check: 13 / ~1,783 ≈ 0.73%;
  18 / ~2,288 ≈ 0.79%.)
- The Refetch count is close to the day's non-Fresh A1 count (≈1,783 vs 1,808 on 3 Oct; ≈2,288 vs 2,347 on 4 Oct).
  ⚠️ **This closeness is an observation only, not a checked definition** — nobody has confirmed from the code that a
  Refetch fires exactly once per non-Fresh login.

**Correction to the earlier "INTERIM Step 2" section:** its line *"A2 — NOT read. Still needed."* no longer holds —
**A2 is now read** (this section). A3, the per-device split, and unique users beyond A1 remain **not read**.

**Steps 3–4 were not done.** Neither the server readings nor A2 have been matched to the frozen Step 0 table, and no fix
direction is proposed. Both wait for the full window and the decision read (earliest after the evening of Saturday
2026-10-10 UTC). The owner has not been asked.

## 2026-10-05 — Owner ruling: the data is conclusive; no further waiting

Recorded at about **14:24Z** (`date -u` taken by the recording producer this turn) by a spawned `fkit-producer` with no
owner channel (ADR-021/037), on an OWNER RULING given 2026-10-05 in the `fkit lead` session (the owner's own typed
message), relayed by `fkit-lead`. ⛔ Not producer precedent.

**The owner's words, verbatim:**
> "I agree with your plan, also, make a note somewhere about what we found and that we don't need to wait longer,
> because the data we have is very straightforward and convincing."

"Your plan" was the lead's proposal: (1) get a short `fkit-architect` opinion on fix (a) vs fix (b); (2) the owner
then **decides now**, instead of waiting for the full 5–7-day window; (3) the fix is built alongside the blocked
tasks, and the numbers keep being watched.

**Precondition 3 is waived by the owner.** The owner judged the interim data — about 2.5 days since the 2026-10-03
deploys, with both weekend evenings (Sat 3 Oct and Sun 4 Oct, UTC 20–23) included — conclusive. The decision read
happens now. The three sections above call their readings *"INTERIM — NOT the decision read"*; **from this ruling on,
those readings ARE the decision readings.** The sections above are left unedited as history; this section is what
changes their standing.

### Step 3 — readings matched to the frozen Step 0 table

Done now, because the owner lifted the wait. The table was frozen at `2026-10-05T13:27:36Z`, before any reading; it
is not edited here.

**Verdict: the readings fit row 1, strongly** — *"stale mostly on `AfterMatch` boots and A2 mostly `Same` → Yandex
returns the same signed data for the whole visit → owner chooses among (a)/(b)/(c)"*.

| Reading | Value | Source | What it says |
|---|---|---|---|
| Server stale share | ≈ **34%** (5,618 of ~16.6K, from 3 Oct 10:04Z) | server (`0366`) | the problem is real and steady, ~33–35% every day |
| Share of non-Fresh that is `AfterMatch` | ≈ **87–88%** (3 and 4 Oct) | client A1 (`0372`) | stale is mostly reloads after a match |
| Non-Fresh rate by boot kind | `AfterMatch` ≈ **57%** vs `FirstBoot` ≈ **10%** | client A1 | a reload after a match is ~5–6× likelier to be stale |
| A2 Refetch | `Same` ≈ **99%**; `Newer` only **13** and **18** per day | client A2 | asking Yandex again returns the same old data |
| `past_15m_20m` share of stale | ≈ **11%** | server | most stale is far past 15 min, not just over the line |
| `future_*` brackets | **none** on the server (client `Future*` under 1%) | server, client A1 | no sign of a clock problem |

**Rows not supported:**
- Row 2 (`Newer` → client refetch): **not supported.** `Newer` is under 1% of Refetch outcomes, so a client refetch
  fix would not work.
- Row 3 (window too tight): **not supported.** Only ~11% of stale sits in `past_15m_20m`; ~58% is 30 min to 6 h old.
  A small window change would recover little.
- Row 4 (clock): **not supported.** No `future_*` brackets on the server.

**Caveats carried, not resolved by this ruling:**
- A3 (held ms), the per-device split, and unique users beyond A1 were **not read**.
- That one Refetch fires per non-Fresh login is an **observation** (the counts are close), not checked from code.
- `FirstBoot` stale (~10% of first boots) leans very old (6 h and older ≈ 42% of it on 3 Oct). Neither (a) nor (b)
  is obviously aimed at it; the expected post-fix share should account for it.
- The `stale`-before-id-check gap stands (`src/profile-server/LoginVerification.ts:34` runs before `:45`): any fix that
  accepts more stale logins must say how it proves the right player.
- Option (c) (stale as a lower trust level) is still in the frozen table's row 1; the lead's plan narrows the consult
  to (a) vs (b). The owner may still pick (c) at Step 4.

### Next
1. **`fkit-architect` consult on (a) vs (b)** — (a) a wider freshness window plus closing the gap that a stale login's
   id is never checked; (b) keep the verified session across the match-exit reload, which needs an ADR (it contradicts
   the "never store the token" rule in `src/client/ProfileSession.ts:16-21`).
2. **Step 4 — the owner's choice**, via `AskUserQuestion` in the lead's session.

### Still owed by this task's Output
- the chosen fix, with the owner's words verbatim;
- the stale share expected after it, with the reasoning;
- the owner's "good enough" threshold for the S2 exit (a number);
- an ADR, if the fix changes a security rule ((a) changes ADR-116's window; (b) changes the token-storage rule);
- the fix task briefed, and `0340`'s `Depends on` repointed to it.

Summary for future readers: [`2026-10-05-0373-stale-login-findings.md`](../../../knowledge-base/reports/2026-10-05-0373-stale-login-findings.md).

## 2026-10-05 — Step 4: owner's choice

Recorded at about **14:54Z** (`date -u` taken by the recording producer this turn) by a spawned `fkit-producer` with no
owner channel (ADR-021/037), on OWNER RULINGS given 2026-10-05 **live via `AskUserQuestion` in the `fkit lead`
session**, relayed by `fkit-lead`. ⛔ Not producer precedent. The recording producer did not hear the rulings directly;
the words below are copied exactly as relayed.

**The owner's rulings, verbatim:**
1. **Fix: "24 hours (Recommended)".** The option text:
   - leaves ~2.5% of logins (~50 players/day) stale;
   - server-only, ~1 day, can ship 10/11 Oct;
   - a stolen note works up to ~48h instead of ~24h;
   - in every option the server first checks the note belongs to the right player, and the game logs in again if the
     player switches Yandex accounts.
2. **Good-enough threshold: "At most 5% (Recommended)".** This is stale share on the server, over 7 days after the fix
   ships. It gates starting `0340`.
3. **Watch task: "File it (Recommended)".** A small "watch and decide later" task, on the Backlog board: after the fix
   ships, count how many paid citizens hit the >24h case; the owner asks Yandex support whether re-opening the game
   gives a fresh signed note; only then decide on a gentle, paid-citizen-only "reopen the game to restore perks"
   message. **No forced popup.**
4. **Placement: "Fix: Sprint 7, check: Sprint 8 (Recommended)".** The check is the 7-day S2-exit re-check after deploy,
   at the top of Sprint 8 per the 2026-09-29 build/verify rule.
5. *(Earlier the same day, already recorded above:)* precondition 3 waived — *"the data is conclusive; no further
   waiting"*.

Option (b) (keep the verified session across reloads) and option (c) (stale as a lower trust level) were **not**
chosen; ADR-121 records why.

### Output — the five items this task owes

| # | Output item | Result |
|---|---|---|
| 1 | **One chosen fix**, owner's words verbatim | **"24 hours (Recommended)"** — freshness window 900 s → 86,400 s (future limit stays 300 s), the player id checked **before** the age, and a game re-login when the player switches Yandex accounts. |
| 2 | **Expected stale share after the fix**, with reasoning | **~2.5%.** Only notes over 24 h old stay stale: `past_over_24h` was 417 of ~16.6K server logins (3 Oct 10:04Z → 5 Oct ~14:00Z, Step 1 above). After the id-first change, `stale` means "right player, too old"; `id_mismatch` was 6 of ~16.6K (~0.04%), so the share stays comparable with `0339` and this task's readings. |
| 3 | **The owner's "good enough" threshold** (a number) | **≤5%** server stale share over 7 days after the fix ships — *"At most 5% (Recommended)"*. |
| 4 | **ADR**, if the fix changes a security rule | [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) — *Login signature freshness window — 24 h, with the id checked before the age*; **accepted** 2026-10-05; supersedes ADR-116 in part (Decision 3's window, residual 8). Written by `fkit-architect`. It keeps ADR-116's separate owner approval to enforce `0340`. |
| 5 | **Tasks filed**, and `0340` repointed | **`0391`** fix — [Sprint 7](../../../sprints/plan-sprint-7.md), append rank 43, owner `fkit-coder`: [`0391`](../0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md). **`0392`** S2-exit re-check — [Sprint 8](../../../sprints/plan-sprint-8.md), append rank 8: [`0392`](../../backlog/0392-verify-0391-live-stale-login-share-at-most-5-percent-over-7-days/brief.md). **`0393`** watch task — [Backlog board](../../../sprints/backlog.md): [`0393`](../../backlog/0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md). **`0340`**'s `Depends on` repointed from `0373` to `0392` (dated note in its brief). |

**Flags carried into the briefs, not resolved here:**
- ⚠️ **The fix is not purely server-only.** The owner's option text said *"server-only"*; ADR-121 Decision 3 adds a
  game-side re-login on account switch (`src/client` has no `ACCOUNT_SELECTION_DIALOG_CLOSED` handler today), which
  would mean a game deploy too. `0391`'s plan decides whether that part ships now or splits — put to the owner at its
  plan gate.
- ⚠️ **"Top of Sprint 8" conflicts with ADR-035.** `0392` was appended at rank 8, not inserted, because ranks 2–4 on
  that board are closed rows. Merit position: directly below `0370`. Flagged for owner confirmation.
- Caveats from Step 3 still stand: A3, the per-device split and unique users beyond A1 were not read.

**This task is NOT closed.** Status stays `🔄 In progress`; `fkit-lead` routes the close.
