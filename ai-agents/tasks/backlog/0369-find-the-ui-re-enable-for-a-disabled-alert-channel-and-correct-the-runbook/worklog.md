# Worklog — 0369

**Written 2026-10-01 by a spawned `fkit-producer` (no owner channel, ADR-021/037), from readings relayed by
`fkit-lead` from the live `fkit lead` session on 2026-10-01.** ⛔ Not producer precedent.
**The owner ran every box command himself** (output pasted to the lead) **and saw every Telegram arrival himself.**
**The monitoring-UI actions were done by `fkit-lead` in the owner's Chrome, at the owner's explicit instruction**
(*"Do all you need in Uptrace yourself"*), and are marked below. **The producer verified none of it.**
All times are **UTC, 2026-10-01**. UI labels, times and yes/no only — no hostname, IP, URL, channel id, chat or
topic id, token or secret (verification step 8). **No screenshot was taken into, or committed to, git.**

## Result

**Live part (steps 1–5) DONE. Step 6 (the runbook rewrite, `fkit-coder`) is still to do — the task is NOT
closed.**

- **The UI control exists.** For a `disabled` channel, Alerting → **CHANNELS** → the channel's row offers
  **`Unpause channel` (▶)**. It re-enabled the channel to `delivering`.
- **The same control serves `paused`.** Pause → `paused` → the row offers the same **`Unpause channel` (▶)**.
- ⚠️ **New finding: the *Test channel* button is not a reliable liveness signal.** Pressed 3 times after the
  re-enable; **none** arrived in Telegram and **none** reached the relay. Cause **unknown**. Delivery was instead
  proven by a **real alert** (throwaway-monitor drill) — see step 4.

## Step 0 — offline docs look-up

**Skipped — OWNER RULING** (live `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not
producer precedent). Choice, verbatim: **"Yes, now (Recommended)"** to *"Do 0369's live check now? … Skip the
optional docs look-up — the real screen is the answer anyway."* No vendor documentation or UI source was read.

## Step 1 — pre-flight

- Probe log at **15:32:36** ends `channel state: delivering` — **YES.**
- `0289` quiet-window rule — **moot**: `0289` closed 2026-10-01 without a drill.

## Step 2 — disable

- One SQL update of the channel's `status` to `disabled`, matched on the probe's own URL read from its env file
  (never printed), at **15:32:36** → `UPDATE 1` — **YES.**

## Step 3 — the look (UI by `fkit-lead`, owner-directed)

- Page: **Alerting → CHANNELS**, row `alerts-to-telegram`, type **webhook**.
- Status label: 🔴 **`disabled`** — **YES**, the channel was seen in the `disabled` state.
- Row actions (read from their tooltips), in order: **Test channel · Unpause channel (▶) · Edit channel · Delete
  channel**.
- For comparison, when the row is `delivering` the second action reads **Pause channel (⏸)** instead.
- **Edit not inspected, on purpose** — the Edit page displays the channel's secret. Whether Edit holds an
  enable/status control is therefore **not known**; it was not needed.

## Step 4 — re-enable through the UI

- **`Unpause channel` (▶)** pressed by `fkit-lead` at **~15:33:29** → row reads `delivering` — **YES**
  (confirmed after a page reload).
- **Outage: ≈ 53 s** (15:32:36 → ~15:33:29).
- Probe at **15:38:51** ends `channel state: delivering` — **YES.**
- Profile box `checks.sh` at **15:39:10**: `alert-channel-state … OK`, `RESULT: 13 ok, 0 failed`,
  `ping: success delivered` — **YES.**

### Telegram arrival — the *Test channel* button failed; a real alert was used instead

- ⚠️ **Test channel** pressed by `fkit-lead` at **15:34:37, 15:43:04 and 16:07:38** — **NO** arrival in Telegram
  for any of the three.
- The relay counter `geoconflict_profile_alert_relay`, grouped by `result` (read in the monitoring UI), shows
  **no** call at those times — only `probe` ticks. So the presses never reached the relay.
- Contrast: earlier the same day, the **14:31** Test-channel press (during `0341`, after an SQL re-enable)
  **did** arrive and **was** counted as `sent`.
- The monitoring stack's container log (owner-run, source-map noise filtered) shows **nothing** for any test
  press — working or not — so it cannot explain the difference.
- A background `error-monitor` job logs `transaction conflict … will retry` every few seconds all day, including
  around the working 14:31 press — **not shown to be the cause.**
- `fkit-lead`'s dedupe hypothesis was **disproved** (no `deduped` count).
- **Cause: unknown.** Not investigated further in this task.

**Delivery proven by a real alert instead (stronger than a test message)** — the runbook's own proven drill:

- Throwaway metric monitor **`DRILL — delete me — rejected sessions (>0 / 1 min)`**, created by `fkit-lead` in the
  UI: metric `geoconflict_profile_session_rejected`, filter `reason = "invalid"`, `perMin(sum)`, 1-minute grouping,
  check the last 1 point, max allowed 0, channel `alerts-to-telegram`.
- Pre-flight: no rejected logins in the prior hour except one probe request at 17:18.
- **17:28:38–17:28:44** — `fkit-lead` sent a burst of 20 junk-token requests to the profile API's public
  `GET /v1/profile`; all returned `401`.
- Owner saw in Telegram:
  - 🚨 `… DRILL — delete me — rejected sessions (>0 / 1 min): rej`, `Status: firing` (heading text as relayed — likely cut short by the screenshot or message), since 17:28 — arrived
    **17:29** — **YES.**
  - ✅ `… — resolved`, `Status: resolved` — arrived **17:30** — **YES.**
- The monitoring UI showed the alert closed — **YES.**
- Cleanup: the throwaway monitor deleted (in-page confirm) **~17:33** — **YES**; monitor list back to **10** —
  **YES**; `profile · DB pool saturated` still active — **YES**; channel `delivering` — **YES.**

## Step 5 — Pause check (in scope by OWNER RULING Q1, "Disabled + quick Pause (Recommended)")

- **Pause channel (⏸)** pressed by `fkit-lead` → row reads ⚪ **`paused`** — **YES.**
- The paused row offers the **same `Unpause channel` (▶)** action — **YES.**
- **Unpause channel** → `delivering` (after reload) at **~15:34:01** — **YES.** A few seconds of outage.
- Probe back to `delivering` — confirmed by the 15:38:51 probe run above (one run after both steps 4 and 5).

## Total alert downtime in this task

**≈ 53 s + a few seconds** (the disable, then the Pause).

## Verification steps (as of this worklog — step 6 not yet done)

1. Step 0 recorded — **skipped by owner ruling** (above); no source read, so nothing found and nothing claimed.
2. Channel seen `disabled` in the UI — **yes, 15:32–15:33**; label and every row action written down; Edit not
   opened, on purpose.
3. UI control re-enabled it — **yes: `Unpause channel` (▶)**, Alerting → CHANNELS.
4. Probe `delivering` — **yes (15:38:51)**; `checks.sh` `alert-channel-state … OK` — **yes (15:39:10)**;
   Test-channel message in Telegram — **NO (3 presses, none arrived)** ⚠️, **met instead by a real alert**:
   firing **17:29**, resolved **17:30**. Down ≈ 53 s + seconds.
5. Paused row's actions and the resume path recorded; channel back to `delivering` — **yes.**
6. Runbook matches what was seen — **NOT YET** — step 6 is `fkit-coder`'s, pending.
7. Channel ends `delivering`, alerting confirmed live — **yes** (real alert 17:29/17:30; channel `delivering`
   after cleanup).
8. No hostname, IP, URL, channel id, chat or topic id, token or secret in this worklog; no screenshot committed —
   **yes** for this worklog. The runbook part is checked when step 6 is done.
9. One reading came back "no" — the **Test channel** arrival. Recorded loudly above. The channel itself did return
   to `delivering` and a real alert arrived, so no SQL rescue was needed. Whether the unreliable Test button
   needs its own task is an **open question for the owner**, not decided here.

## What this does NOT prove

- **Why the Test channel button fails silently.** Cause unknown; the container log shows nothing.
- What the **Edit** page offers — not opened, on purpose.
- That a real alert arrives after a *real* vendor-written `disabled` (the disable here was the SQL update, as
  `0341` used) — the UI control seen should be the same, but the trigger was not a real failed delivery.
- One host, no CI; one version of the monitoring UI (the deployed one).
