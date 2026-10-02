# Prove a Telegram Alert Still Arrives After an Idle Period — `0274` Amendment A1 (task 0289)

**Source**: `ai-agents/tasks/done/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md` (its `worklog.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 27 (append position; merit rank owner-ruled `Low` 2026-09-22; moved Sprint 4 → 5 → 6 → 7) / task `0289`

> ✅ **Closed 2026-10-01 on OBSERVED EVIDENCE — the drill was NOT run.** Owner ruling, live via `AskUserQuestion`:
> **"Yes, close on this (Recommended)"**, then **"It was empty"** (the Alerts topic, 11:12–15:48 MSK). This **replaced**
> the earlier owner rule (plan ruling Q1: a gap of **≥ 8 h, run as a drill**).
>
> 🚨 **The result is bounded to 4 h 36 min. An overnight gap is still UNPROVEN.** Do not round it up.
>
> ⛔ **Two things on `0274` are called "A1".** This is **amendment A1** (delivery after idle). **Alert rule A1**
> (player-creation spike) is a different thing, still deferred, with no task. Nothing here touches alert rule A1.

## Goal

Answer one question: **does a Telegram message still arrive when the system has been quiet for hours?** The suspected
defect (from [[tasks/feedback-telegram-delivery-failure]], `0061`) is a pooled network connection that dies while
unused; the next send fails, and the failure shows as **silence**. Neither near-miss answered it:

- `0274`'s §7.6 alert drill passed, but both bursts were **minutes apart on a warm connection**.
- `0283`'s daily digest arrived across a ~9.5 h gap, but it is a **separate short-lived process** that goes to Telegram
  directly — it never crosses the relay or the `/internal/` allowlist.

## Key Changes

Nothing built. The planned drill (fire → idle → fire, read `sent` vs `sent_after_retry` in the relay log) was
**superseded** by owner ruling and never run. Dated supersession notes were appended to the brief and `plan.md`.

## Outcome

**PASS — on real-world evidence, owner-supplied and confirmed live (Telegram screenshots, times read by `fkit-lead`;
the producer verified none of it):**

- **Primary:** two `[Name change] Pending request` messages from the **long-running profile-api process** arrived in the
  Name Changes topic at **08:12 and 12:48 UTC** on 2026-10-01 — a **4 h 36 min** gap with the Alerts topic empty. Per
  `plan.md`'s code reading (not re-checked by the producer), the alert relay and this notifier are the only two Telegram
  senders in that process and share one proxy agent per proxy URL — so the second message used **the relay's own
  sender, pool and egress proxy**.
- **Quiet conditions:** Alerts topic empty ✅; no other name-change message in between ✅; no profile deploy or restart
  **known** (last deploy 2026-09-29; not checked on the box); channel not disabled — `0341`'s drill ran *after* the
  window ✅.
- **Supporting only:** two player-feedback messages from the **game server** (same shared sending code, other box)
  arrived ≈ 4 h 12 min apart on 2026-09-30. Whether it shares the profile box's egress proxy is unknown.

**What this does NOT prove** (from the worklog):

- ⛔ An **overnight** gap (≥ 8 h).
- ⛔ Whether the second send needed `0277`'s one retry — **not determined** (that notifier is not counted by the relay
  counter).
- ⛔ The **monitoring → relay** hop after quiet (monitor → webhook → allowlist → relay). The hourly `0284` probe keeps it
  warm.
- ⛔ The **Alerts topic route itself** — the evidence went to the Name Changes topic. Alerts-topic delivery was proven
  2026-09-17 on a warm connection.
- ⛔ Quiet at the egress proxy — the game server's sends may have kept it warm.
- ⛔ `0061`'s stale-pooled-connection mechanism. Per `plan.md`'s code reading, undici closes an unused pooled
  connection after at most 10 min, so the second send most likely opened a **fresh** connection. Neither confirms nor
  rules out the mechanism.
- ⛔ A real monitor-fired alert after `0341`'s SQL re-enable (`0368`'s caveat 1) — stays unproven.

**Carried elsewhere:** the runbook update this task owed (*"delivery after an IDLE period is unproven"* → this bounded
result) **rides `0368`** as a dated scope addition, owner-confirmed 2026-10-01 (*"Yes, keep it in 0368
(Recommended)"*). Until `0368` lands, the runbook still says *unproven*.

## Related

- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274`, where amendment A1 came from
- [[systems/alert-delivery]] — the alert path, the relay, and the *what this does not cover* list
- [[tasks/uptrace-channel-state-production-check]] — task `0341`, which this waited on
- [[tasks/uptrace-channel-state-check]] — task `0285`, whose drill (run as `0341`) this waited on
- [[tasks/feedback-telegram-delivery-failure]] — task `0061`, the source of the stale-connection hypothesis
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the relay and the one-retry fix (retry use here: not determined)
- [[tasks/alert-path-liveness-probe]] — task `0284`, whose hourly probe keeps the monitoring → relay hop warm
- [[tasks/name-change-daily-digest]] — task `0283`, the near-miss that does not discharge this
- [[decisions/sprint-7]] — the board (rank 27); closed 2026-10-01
- [[systems/weekend-deploy-window]] — the 2026-09-29 window that deferred this to a quiet day
- [[tasks/game-prod-egress-ip-allowlist]] — task `0295`, whose close named this as an open residual
