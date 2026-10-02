# Worklog — 0341

**Written 2026-10-01 by a spawned `fkit-producer` (no owner channel, ADR-021/037), from readings the OWNER took and
observed live on 2026-10-01 in the `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer precedent.
**The owner ran every box command and the drill himself, and saw every page and message himself;** two UI actions
were done by `fkit-lead` in the owner's browser at the owner's direction (marked below). **The producer verified
none of it.** Numbers, UTC times of day and yes/no only — no hostname, IP, URL, channel id, chat or topic id,
token or secret (verification step 8).

## Result

**VERIFICATION PASSED — with one owner-chosen deviation (step 3.5).** Check 13 (`alert-channel-state`) was seen to
trip on the real stack, the dead-man's switch paged, and the channel ended the task `delivering` with alerting
confirmed live.

⚠️ **Deviation, chosen live by the owner:** step 3.5 re-enabled the channel with the **reverse SQL update**, **not
in the monitoring UI** as owner ruling Q3 specified. The owner could not find the UI control in time and picked
the SQL fallback offered by `fkit-lead`, which named the cost: **this drill does not prove the UI re-enable path.**
See *What this does NOT prove* below.

## Step 1 — the deploys and the post-deploy checks

- **1.1 / 1.2 (both deploys):** done **2026-09-29**, order telemetry → game → profile; recorded in the brief's
  appended *Step 1 record* (monitoring box probe 18:51:37 UTC ended `channel state: delivering`; `profile-api`
  started 20:04:48 UTC, healthy). Not re-read today.
- **1.3 — hand-run probe on the monitoring box:** log line at **14:23:23** ends `… accepted … channel state:
  delivering` — **YES.** (An earlier hand run at ~14:21 was also confirmed, via the profile box's check below.)
- **1.4 — profile box `checks.sh` at 14:21:24:** `alert-channel-state … OK` (delivering, 0h ago) — **YES**;
  `alert-path-probe … OK` — **YES**; `RESULT: 13 ok, 0 failed`; marker holds a `channel_state` key — **YES.**
- **1.5 — the probe posted nothing to Telegram:** **YES** (owner checked: Telegram empty).
- ℹ️ 1.3–1.5 ran on 2026-10-01, not straight after the 2026-09-29 profile deploy (the brief's appended record
  notes they were not done by hand that night). The readings stand as today's state.

## Step 2 — "no write" on the real stack (before the drill)

| | `n_tup_ins` | `n_tup_upd` | `n_tup_del` |
|---|---|---|---|
| Before | 1 | 0 | 0 |
| *(probe run by hand at 14:23:23)* | | | |
| After (~5 s later) | 1 | 0 | 0 |

- All three unchanged — **YES.**

## Step 3 — the drill

- **Start: 14:25:37.**
- **3.1** — one SQL update of `notif_channels.status` to `disabled`, matched on the probe's own URL read from the
  probe's env file (never printed): `UPDATE 1` — **YES.**
- **3.2** — probe log at **14:25:37** ends `channel state: disabled` — **YES.**
- **3.3** — profile box `checks.sh` at **14:25:57**: `FAIL alert-channel-state … DISABLED`;
  `RESULT: 12 ok, 1 failed`; `ping: /fail delivered` — **YES.**
- **3.4** — dead-man's switch page seen by the owner — **YES.** Email "New incident started", heartbeat
  `profile-daily-checks`, cause "Reported failure", incident started **14:25** (17:25 MSK), carrying the
  `DISABLED` text; in the owner's inbox by **~14:26.**
- **3.5** — re-enabled — **YES at 14:28:36**, `UPDATE 1`. ⚠️ **By the reverse SQL update (`status` back to
  `delivering`), NOT in the monitoring UI** — owner-chosen deviation (see *Result*). Afterwards `fkit-lead`
  confirmed in the monitoring UI (Alerting → Channels) that the channel reads `delivering`; the row actions shown
  there are **Test / Pause / Edit / Delete**.
- **3.6** — probe at **14:28:56** ends `channel state: delivering` — **YES**; profile box `checks.sh` at
  **14:29:13**: `alert-channel-state … OK`, `RESULT: 13 ok, 0 failed`, `ping: success delivered` — **YES.**
- **3.7** — alerting live — **YES.** `fkit-lead` pressed the channel's **Test channel** button in the monitoring
  UI at ~**14:31** (owner-directed); the owner saw `🚨 Geoconflict · profile · Test message`, status firing, since
  14:31, arrive in the Telegram Alerts topic at **14:31.**
- **3.8** — end ≈ **14:31.** **Alerting was down ≈ 3 min** (14:25:37 → 14:28:36).
- **Dead-man's switch incident:** the owner **closed it by hand.** Whether the 14:29:13 success ping would have
  resolved it on its own was **not observed.**

## Verification steps

1. Both deploys recorded with date, time and yes/no; profile went out last in the slot (brief's appended record).
   — **met.**
2. Step 1 readings all yes; nothing posted to Telegram. — **met.**
3. Six counters recorded (1|0|0 before, 1|0|0 after); unchanged. — **met.**
4. `disabled` — yes; `DISABLED` FAIL — yes; page seen, 14:25–14:26 — yes; back to `delivering` / OK — yes;
   Telegram arrival after re-enabling, 14:31 — yes; ≈ 3 min down. — **met, except "re-enabled in the UI":**
   re-enabled by SQL instead (owner-chosen deviation).
5. Channel ends `delivering`; alerting confirmed live (14:31). — **met.**
6. **No overlap with a `0289` quiet window** — `0289` had not started. **The 14:31 Test-channel firing is recorded
   as a candidate `0289` Phase A warm-up — time 14:31 UTC.** ⚠️ Caveat for `0289`: its plan defines the quiet
   window as starting at the **arrival of Phase A's ✅** (recovery message) after a 🚨, and its Phase A says "if
   there is no 🚨 or no ✅, stop". A Test-channel press gives one `firing` message and **no ✅**, and `0289`'s
   step 0 pre-checks were not taken before it. Whether it counts as Phase A is an owner call for `0289`, not
   settled here.
7. No reading came back "no" on a pass/fail line → **no new task filed.** ⚠️ The one exception is the *method* of
   3.5 (SQL, not UI) — the owner chose it live with its cost named; whether that needs a follow-up is raised as an
   open question, not decided here.
8. This worklog holds no hostname, IP, URL, channel id, chat or topic id, token or secret. — **met.**

## What this does NOT prove

- **The UI re-enable path.** The runbook (`alert-delivery-runbook.md` § *When `alert-channel-state` fails*, step 2,
  and § *When `alert-path-probe` fails*, step 4) tells the operator to **re-enable the channel in the monitoring
  UI**. In this drill the owner could not find that control in time, and the row actions seen were Test / Pause /
  Edit / Delete. So the documented recovery step is **unproven**, and may not match the UI as it is.
- Everything the brief's *Notes* already list: check 13 reads the stack's own record, not delivery; not the
  channel's own copy of the secret; not that a monitor is attached; not delivery after idle (`0289`).
- Whether the dead-man's switch incident resolves itself on the next success ping (closed by hand).
- One host, no CI.

📌 **2026-10-01, appended (nothing above edited, ADR-035):** OWNER RULINGS live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` (⛔ not producer precedent). Verification 6's candidate is **declined** — *"No, fresh start (Recommended)"*: the 14:31 UTC Test-channel firing is **not** `0289`'s Phase A; `0289` runs its own on its drill day. Verification 7's open question is **answered** — *"Yes, file it (Recommended)"*: filed as [`0368`](../../done/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md) (document the SQL re-enable) and [`0369`](../../done/0369-find-the-ui-re-enable-for-a-disabled-alert-channel-and-correct-the-runbook/brief.md) (find the UI control), Sprint 7.
