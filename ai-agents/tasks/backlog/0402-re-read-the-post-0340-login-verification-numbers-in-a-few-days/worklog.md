# Worklog — 0402 Re-read the post-0340 login-verification numbers in a few days

## 2026-10-07 — piece 1 of the window: `0340` deploy → now (interim read, NOT the planned re-read)

Read by `fkit-lead` in the owner's session. **Owner approval for this production read**, given live via
`AskUserQuestion` in the `fkit lead` session on 2026-10-07: *"Yes, read it (Recommended)"* (option text: *"You allow
read-only production reads in this session. I run the read now and again tomorrow before the deploy."*). Before that
answer, the Claude Code auto-mode classifier had refused the first metric query ("Production Reads") — same as `0392`.

**Why now.** The owner plans the `0396` S3b profile deploy for about Thu 2026-10-08 (mid-week, owner's call). That
deploy restarts the counters. The owner asked for a read now **and another one just before that deploy**, so this
window's piece is captured whole before the restart. **This is not the task's planned re-read** — it is less than a
day, weekday daytime only, with no evening in it.

**How.** Read-only SSH to the telemetry box (direct route, no VPN), `clickhouse-client --readonly=1`, `SELECT` only, on
`uptrace.datapoints` joined to `uptrace.timeseries` by fingerprint, counter deltas summed from `sum`. Series filtered
to `service_version = 0.0.156-profile.3`. Same method as `0392`. Query time about 2026-10-07T13:33Z. Nothing written
on any server.

**Window.**
- Version `0.0.156-profile.3` only (the `0340` deploy, record 2026-10-07T07:10:45Z); one series per outcome, so one
  instance; no restart inside the window.
- **Start 2026-10-07T07:11:30Z** (first `.3` point). **End 2026-10-07T13:33:00Z.** Length about **6.4 h (≈0.27
  days)**.
- Excluded: the `.2` series (ends 07:02:30Z) — counted in `0392`'s window, never compared across the restart.
- ⚠️ **Wednesday daytime only. No evening, no weekend.** The evening hours (20–23 UTC) are the ones to watch.

### Outcomes (whole window)

| Outcome | Count | Share |
|---|---|---|
| `ok` | 3,533 | 97.17 % |
| `stale` | 102 | **2.81 %** |
| `absent` | 1 | 0.03 % |
| `id_mismatch` | 0 | 0 % |
| `bad_payload` | 0 | — |
| any other | none | — |
| **All outcomes** | **3,636** | |

- **Stale share 102 / 3,636 = 2.81 %.** `0392` (post-`0391`, ≈22.75 h): 3.25 %. Before `0391`: 33.8 % (`0373`).
- **`id_mismatch` 0** (baseline ~0.04 %; `0392` had 0.054 %).
- **`absent` 1** — a new outcome on this version; `0392`'s window had none. One login; noted, not explained.

### Stale-age brackets (whole window)

| Bracket | Count |
|---|---|
| `past_24h_48h` | 49 |
| `past_48h_7d` | 39 |
| `past_over_7d` | 14 |
| any bracket under 24 h | 0 |

- The brackets sum to **102 = the `stale` total** (no gap this time).
- ⚠️ **`past_over_7d` is new:** it did not appear in `0392`'s window. 14 of 102 stale (13.7 %). Noted, not explained.

### By hour (UTC), 7 Oct — `ok` / `stale` / `absent` / stale %

| Hour | ok | stale | absent | stale % |
|---|---|---|---|---|
| 07 (from 07:11) | 365 | 11 | 0 | 2.9 |
| 08 | 494 | 13 | 1 | 2.6 |
| 09 | 608 | 17 | 0 | 2.7 |
| 10 | 570 | 8 | 0 | 1.4 |
| 11 | 616 | 21 | 0 | 3.3 |
| 12 | 540 | 17 | 0 | 3.1 |
| 13 (to 13:33) | 340 | 15 | 0 | 4.2 |

The hourly rows sum to the totals exactly (`ok` 3,533, `stale` 102, `absent` 1). Weekend evenings: **none in this
window.**

### Owner's take (verification step 3)

_blank — not asked yet. This is an interim piece; the owner's take belongs to the planned re-read._

### Next

- **Piece 1 continues until the `0396` profile deploy.** Re-read just before that deploy (owner ask, 2026-10-07), so
  the piece closes at its full length. After the deploy the window is a second piece; never compare cumulative
  values across the restart.

**Privacy:** counts, shares, dates, a version tag and table names only — no key, player id, signature, token, host,
IP or connection string.

## 2026-10-08 — piece 1, full length: `0340` deploy → just before the `0396` profile deploy

Read by `fkit-lead` in the owner's session, under the same owner approval as above (2026-10-07, *"Yes, read it
(Recommended)"* — which covered this pre-deploy read). Same method and filter (`service_version =
0.0.156-profile.3`). Query time about 2026-10-08T06:29Z, **before** the owner started the `0396` deploy. Nothing written
on any server. This supersedes the 2026-10-07 interim figures for piece 1 (that entry stays as history).

**Window.** **Start 2026-10-07T07:11:30Z. End 2026-10-08T06:28:30Z.** About **23.3 h (≈0.97 days)**. One version
(`0.0.156-profile.3`), no restart inside. ⚠️ Wednesday → Thursday only: **one weekday evening, no weekend.**

### Outcomes (piece 1, whole)

| Outcome | Count | Share |
|---|---|---|
| `ok` | 7,760 | 97.02 % |
| `stale` | 237 | **2.96 %** |
| `absent` | 1 | 0.01 % |
| `id_mismatch` | 0 | 0 % |
| `bad_payload` | 0 | — |
| **All outcomes** | **7,998** | |

- Stale share **2.96 %** (237 / 7,998). `0392` (post-`0391`): 3.25 %. Before `0391`: 33.8 %.
- `id_mismatch` 0 (baseline ~0.04 %). `absent` still the single login from 7 Oct 08:xx.

### Stale-age brackets

| Bracket | Count |
|---|---|
| `past_24h_48h` | 130 |
| `past_48h_7d` | 84 |
| `past_over_7d` | 23 |
| under 24 h | 0 |

Sum **237 = `stale`** — ties exactly. `past_over_7d` 23 of 237 (9.7 %); absent from `0392`'s window.

### By day (UTC)

| Day | `ok` | `stale` | other | Stale share |
|---|---|---|---|---|
| 7 Oct (07:11–24:00) | 6,983 | 216 | 1 | 3.0 % |
| 8 Oct (00:00–06:28) | 777 | 21 | 0 | 2.6 % |

### By hour (UTC) — `ok` / `stale` / stale %

| Hour | 7 Oct | | Hour | 8 Oct |
|---|---|---|---|---|
| 07 | 365 / 11 / 2.9 | | 00 | 33 / 3 / 8.3 |
| 08 | 494 / 13 / 2.6 (+1 `absent`) | | 01 | 53 / 3 / 5.4 |
| 09 | 608 / 17 / 2.7 | | 02 | 68 / 3 / 4.2 |
| 10 | 570 / 8 / 1.4 | | 03 | 105 / 1 / 0.9 |
| 11 | 616 / 21 / 3.3 | | 04 | 149 / 2 / 1.3 |
| 12 | 540 / 17 / 3.1 | | 05 | 224 / 7 / 3.0 |
| 13 | 619 / 25 / 3.9 | | 06 (to 06:28) | 145 / 2 / 1.4 |
| 14 | 551 / 32 / 5.5 | | | |
| 15 | 518 / 17 / 3.2 | | | |
| 16 | 444 / 14 / 3.1 | | | |
| 17 | 468 / 15 / 3.1 | | | |
| 18 | 443 / 9 / 2.0 | | | |
| 19 | 273 / 10 / 3.5 | | | |
| **20** | 191 / 3 / 1.5 | | | |
| **21** | 133 / 4 / 2.9 | | | |
| **22** | 91 / 0 / 0.0 | | | |
| **23** | 59 / 0 / 0.0 | | | |

Hourly rows sum to the totals exactly. **Evening 20–23 UTC (Wed 7 Oct, a weekday):** 7 stale of 481 logins, 1.5 %
(before `0391`, pooled: 42–52 %). **No weekend evening in this piece.**

### Owner's take (verification step 3)

_blank — not asked. This is piece 1; the planned re-read (with a weekend evening) is still to come._

### Next

- The `0396` profile deploy restarts the counters. **Piece 2 starts at the first point of the new profile version.**
  The planned re-read should cover the Sat 10 / Sun 11 Oct evenings and never compare across the restart.
