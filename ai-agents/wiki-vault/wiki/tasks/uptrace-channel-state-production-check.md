# Verify `0285` in Production — Deploy It and Run Its Disabled-Channel Drill (task 0341)

**Source**: `ai-agents/tasks/done/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 26 (append position; owner-ruled to be worked directly after `0339`; moved from Sprint 6) / task `0341`

> ✅ **Closed 2026-10-01** `(agent-closed — not owner-verified)` by a spawned `fkit-producer` via `/fkit-task-done`.
> ⚠️ **The owner executed and observed every step himself, live** (deploys 2026-09-29; the rest 2026-10-01). The
> marker records only that an agent made the **close**. Two UI actions (reading the channel's state, pressing *Test
> channel*) were done by `fkit-lead` in the owner's browser at the owner's direction.
>
> **Result: VERIFICATION PASSED, with one owner-chosen deviation** — the channel was re-enabled by the **reverse SQL
> update, not in the monitoring UI**. 🚨 **So the runbook's UI re-enable step is NOT proven by this drill** — filed as
> `0368` (document the SQL fallback) and `0369` (find the UI control).
>
> ⛔ Numbers, UTC times and yes/no only — no hostname, IP, URL, channel id, chat or topic id, token or secret.

## Goal

The missing verify half of [[tasks/uptrace-channel-state-check]] (`0285`, check 13 `alert-channel-state`), which
closed 2026-09-28 proven by tests only. Filed 2026-09-29 by owner ruling (*"File it, Sprint 6 (Recommended)"*) under
the same day's build/verify-split rule. Until it ran, check 13 was a guard nobody had watched trip.

## Key Changes

Nothing built — an owner-run production check in three steps:

1. **Deploy** both halves (profile box: relay + check 13; monitoring box: the probe) and check the probe reports
   `delivering`, the marker holds `channel_state`, check 13 is OK, and the probe posts nothing to Telegram.
2. **"No write"** — the probe must not write to the monitoring stack's `notif_channels` table (row counters before and
   after one probe run). Run **before** the drill, whose own SQL update moves those counters.
3. **The drill** — disable the probe's channel with one SQL update, see check 13 FAIL and the dead-man's switch page,
   re-enable, see OK, confirm alerting is live.

Deploy order followed the window's owner-ruled order, **telemetry → game → profile** (2026-09-29), not the brief's
original profile-first order. See [[systems/weekend-deploy-window]].

## Outcome

- **Step 1:** both deploys done 2026-09-29. Hand-run checks 2026-10-01: probe log ends `channel state: delivering` ✅;
  marker holds `channel_state` ✅; `checks.sh` `alert-channel-state … OK` and `alert-path-probe … OK`, 13 ok / 0 failed
  ✅; nothing posted to Telegram ✅. (Run two days after the profile deploy, not straight after it.)
- **Step 2 — no write:** counters **1 | 0 | 0** before and after a probe run — unchanged ✅.
- **Step 3 — the drill** (start 14:25:37 UTC): SQL disable `UPDATE 1` ✅ → probe `channel state: disabled` ✅ →
  `checks.sh` `FAIL alert-channel-state … DISABLED`, 12 ok / 1 failed, `/fail` ping delivered ✅ → **dead-man's switch
  page seen by the owner by ~14:26** ✅ → re-enabled **14:28:36 by reverse SQL** (⚠️ not UI) → probe `delivering` and
  check 13 OK ✅ → **Test channel** pressed ~14:31, the owner saw the test message arrive in the Alerts topic ✅.
  **Alerting down ≈ 3 min.**
- **Verification step 7:** no pass/fail reading was "no", so no defect task was filed.

**What this does NOT prove:**

- 🚨 **The UI re-enable path.** The runbook tells the operator to re-enable in the monitoring UI; the owner could not
  find the control in time, and the row actions seen were *Test / Pause / Edit / Delete*. 📌 *2026-10-01, later
  (from the Sprint 7 board's `0369` row):* `0369`'s live look found a `disabled` channel is re-enabled in the UI by
  **`Unpause channel` (▶)**, and ⚠️ its *Test channel* button failed silently three times there. `0369`'s runbook
  rewrite is still pending.
- Whether the dead-man's switch incident resolves itself on the next success ping — the owner closed it by hand.
- Everything check 13 never claimed: delivery, the channel's own copy of the secret, an attached monitor, delivery after
  idle (`0289`).
- One host, no CI.

**Owner rulings at close (2026-10-01):** the 14:31 Test-channel firing is **not** `0289`'s warm-up (*"No, fresh start
(Recommended)"*); the UI gap is filed (*"Yes, file it (Recommended)"*) as two tasks, split confirmed (*"Keep two
(Recommended)"*).

## Related

- [[tasks/uptrace-channel-state-check]] — task `0285`, the check this verified
- [[systems/alert-delivery]] — the relay, the marker, check 13 and the runbook procedure
- [[tasks/alert-path-liveness-probe]] — task `0284`, the probe and marker check 13 reuses; its own drill is the model for this one
- [[tasks/alert-delivery-after-idle]] — task `0289`, which waited on this task
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy that carried `0285`
- [[decisions/sprint-7]] — the board (rank 26); closed 2026-10-01
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the relay whose channel this drill disabled and re-enabled
