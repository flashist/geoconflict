# Worklog — 0392 Read the post-0391 login numbers before the 0340 deploy

## 2026-10-07 — read attempt: BLOCKED, no numbers read

Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING given live 2026-10-07
in the `fkit lead` session, relayed by `fkit-lead` (⛔ not producer precedent). Lead: *"Late this week, do `0392`."*
Owner, verbatim: *"0392 - do it yoursel"*.

- **What happened.** Network route to the telemetry box was direct (not through a VPN). Read-only SSH connected.
  Two read-only checks ran: the ClickHouse version, and the column list of `uptrace.datapoints` /
  `uptrace.timeseries`. The first query on the login metric (`geoconflict_profile_login_verification`) was then
  **refused by the Claude Code permission system** (auto-mode classifier, category "Production Reads").
- **No login numbers were read.** The window below is planned, not read.
- **Planned window:** 2026-10-06T08:09:49Z (the `0391` deploy, profile `0.0.156-profile.2`) → time of the read.
- **Nothing was written on any server.** Only `SELECT` with `--readonly=1`.
- **To unblock:** the owner allows read-only production reads for the session that does the read, or runs the read
  themselves (method: `0373` worklog, *INTERIM Step 1 (server)*).
- **Owner's call on `0340`:** _blank — pending owner (no reading yet)._

## 2026-10-07 — the read: post-`0391` login numbers, and the owner's call on `0340`

Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037), on facts and OWNER RULINGS given live
2026-10-07 in the `fkit lead` session (via `AskUserQuestion` unless noted), relayed by `fkit-lead`; ⛔ not producer
precedent. The readings below were taken by `fkit-lead`, not by this producer; they are copied as relayed, with no
server re-queried. This entry supersedes the *BLOCKED* entry above, which stays as written (history).

**How the read was done.** The owner chose *"You run it here, I OK it (Recommended)"*. `fkit-lead` then ran the read in
the owner's session, read-only: SSH to the telemetry box, ClickHouse with `--readonly=1`, `SELECT` only, on
`uptrace.datapoints` joined to `uptrace.timeseries` (method: `0373` worklog, *INTERIM Step 1 (server)*). Query time:
about 2026-10-07T06:55–07:00Z. Nothing was written on any server.

**Window.**
- Version `0.0.156-profile.2` only; one instance; no restart inside the window.
- **Start 2026-10-06T08:10:30Z** (the first `.2` point; the `0391` deploy was at 08:09:49Z). **End 2026-10-07T06:55Z.**
  Length about **22.75 h (≈0.95 days)**.
- Excluded: the `.1` tail from 08:09–08:10 (`ok` 17, `stale` 2).
- ⚠️ **Weekday-only, less than one day; no weekend evening in it.** The brief expected ≈3–4 days before the 10/11 Oct
  slot; this read came earlier, because the deploy came earlier (see the owner's call below).

### Outcomes (whole window)

| Outcome | Count | Share |
|---|---|---|
| `ok` | 7,181 | 96.70 % |
| `stale` | 241 | **3.25 %** |
| `id_mismatch` | 4 | 0.054 % |
| `bad_payload` | 0 | — |
| `absent` | 0 | — |
| any other | none | — |
| **All outcomes** | **7,426** | |

- **Stale share 241 / 7,426 = 3.25 %.** Before `0391` it was **33.8 %** (`0373`). `0373` predicted ~2.5 %.
- **`id_mismatch` 0.054 %**, against a ~0.04 % baseline (`0373`).

### Stale-age brackets (whole window)

| Bracket | Count |
|---|---|
| `past_24h_48h` | 137 |
| `past_48h_7d` | 106 |
| any bracket under 24 h | 0 |

⚠️ The brackets sum to **243**, against **241** `stale` in the outcome total — a small mismatch, noted as-is, not
explained. The per-day and per-hour tables below also sum to `ok` 7,183 / `stale` 243 (producer's arithmetic on the
relayed rows), against 7,181 / 241 in the total — the same 2-and-2 gap, most likely a window-edge difference between
the queries; **not checked**. It moves the stale share by under 0.03 points.

### By day (UTC)

| Day | `ok` | `stale` | `id_mismatch` | Stale share |
|---|---|---|---|---|
| 6 Oct (08:10–24:00) | 6,243 | 183 | 4 | **2.8 %** |
| 7 Oct (00:00–06:55) | 940 | 60 | 0 | **6.0 %** |

### By hour (UTC) — `ok` / `stale` / `id_mismatch` / stale %

| Hour | 6 Oct | | Hour | 7 Oct |
|---|---|---|---|---|
| 08 | 417 / 5 / 1 / 1.2 | | 00 | 36 / 5 / 0 / 12.2 |
| 09 | 504 / 20 / 1 / 3.8 | | 01 | 34 / 12 / 0 / 26.1 |
| 10 | 490 / 19 / 1 / 3.7 | | 02 | 60 / 5 / 0 / 7.7 |
| 11 | 550 / 14 / 0 / 2.5 | | 03 | 94 / 8 / 0 / 7.8 |
| 12 | 576 / 20 / 1 / 3.4 | | 04 | 136 / 10 / 0 / 6.8 |
| 13 | 620 / 11 / 0 / 1.7 | | 05 | 244 / 7 / 0 / 2.8 |
| 14 | 514 / 16 / 0 / 3.0 | | 06 | 336 / 13 / 0 / 3.7 |
| 15 | 452 / 10 / 0 / 2.2 | | | |
| 16 | 476 / 7 / 0 / 1.4 | | | |
| 17 | 453 / 5 / 0 / 1.1 | | | |
| 18 | 443 / 11 / 0 / 2.4 | | | |
| 19 | 308 / 16 / 0 / 4.9 | | | |
| 20 | 183 / 8 / 0 / 4.2 | | | |
| 21 | 145 / 7 / 0 / 4.6 | | | |
| 22 | 63 / 10 / 0 / 13.7 | | | |
| 23 | 49 / 4 / 0 / 7.5 | | | |

**What stands out (verification step 5):** the night hours — 6 Oct 22:00 (13.7 %), 7 Oct 00:00 (12.2 %) and
01:00 (**26.1 %**) — and with them 7 Oct as a day (6.0 %). The counts in those hours are tiny (34–73 logins an hour), so
a handful of stale logins swings the share. For comparison, before `0391` the 20–23 h evenings ran at **45–52 %**.

### Owner's call on `0340` (one line)

**Owner, verbatim: "Yes to both"** — the answer to *"were the post-0391 login numbers … good enough to deploy 0340,
and do you approve verified logins (vfy:true) being on in production?"* ⇒ deploy `0340` (no further wait).

- ⚠️ **Timing, recorded honestly:** this call was given **after** the owner had already deployed `0340` (deploy record
  2026-10-07T07:10:45Z). The owner deployed after seeing these numbers, before `fkit-lead` put the question. So it was
  not a call *before* the deploy, as this task was scoped to inform.
- The second half of "Yes to both" is the **separate approval to enforce** (ADR-116, kept by ADR-122). It is
  recorded in [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/worklog.md),
  which owns that gate; this task's look is not itself that approval.

**Privacy (verification step 6):** counts, shares, dates, a version tag and table names only — no secret, key, player
id, signature, token, host, IP or connection string.

**Status:** `🚧 Blocked` lifted (kept in the brief as history); closed via `/fkit-task-done`,
`(agent-closed — not owner-verified)`.
