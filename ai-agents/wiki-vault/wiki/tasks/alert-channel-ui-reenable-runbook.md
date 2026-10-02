# Runbook: the UI Control That Re-enables a DISABLED Alert Channel (task 0369)

**Source**: `ai-agents/tasks/done/0369-find-the-ui-re-enable-for-a-disabled-alert-channel-and-correct-the-runbook/brief.md` (its `worklog.md` and `review.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 33 (append position; owner ruled *"Leave at the bottom"* — 33 is its real place) / task `0369`

> ✅ **Closed 2026-10-02** `(agent-closed — not owner-verified)` by a spawned `fkit-producer`, on owner ruling *"Close it
> (Recommended)"*. The board row says *"Not committed at close"*; the runbook rewrite is now in git (commit `57f3147`).
> Doc-only — no code, no deploy.
>
> ⚠️ **The live look was the owner's.** Box commands owner-run; UI actions by `fkit-lead` in the owner's browser at the
> owner's instruction; Telegram arrivals seen by the owner. The marker records only that an agent made the **close**.
>
> ⛔ Control names, UTC times and yes/no only — no hostname, IP, URL, channel id, chat or topic id, token or secret.

## Goal

`0341`'s production drill ([[tasks/uptrace-channel-state-production-check]]) told the operator to *"re-enable the
channel in the monitoring UI"*, but the owner could not find that control while the channel was `disabled`, and the
channel was brought back by reverse SQL instead. This task looked at the **live** UI while the channel really was
`disabled`, named the control, and corrected the runbook's three UI re-enable instructions and its `PAUSED` step to
match. The SQL route went into the runbook separately as a fallback ([[tasks/alert-channel-sql-reenable-runbook]],
`0368`; split kept by owner ruling *"Keep two (Recommended)"*).

## Key Changes

**The live look (2026-10-01, 15:32–17:33 UTC; owner ruling Q1 *"Disabled + quick Pause (Recommended)"*).** Step 0
(vendor docs offline) was **skipped by owner ruling** — so nothing here comes from vendor documentation.

- Channel set `disabled` by the same one-row SQL update `0341` used (`UPDATE 1`), then seen in the UI.
- **The control exists:** **Alerting → CHANNELS → the channel's row → `Unpause channel` (▶)**. Offered for **both**
  `disabled` (🔴) and `paused` (⚪); while `delivering` that slot reads **`Pause channel` (⏸)**. Row actions seen while
  `disabled`, from their tooltips: *Test channel · Unpause channel · Edit channel · Delete channel*.
- Re-enabled through that control → `delivering`; probe `delivering` and `checks.sh` `alert-channel-state … OK`
  afterwards. Outage ≈ 53 s, plus a few seconds for the Pause → Unpause check.
- ⚠️ ***Test channel* pressed 3 times (15:34, 15:43, 16:07 UTC) — nothing reached Telegram**, and the relay counter
  `geoconflict_profile_alert_relay` showed no call at those times. An earlier press the same day (`0341`, after the SQL
  re-enable) did arrive. **Cause unknown** — not investigated, by owner ruling Q2 (warning only, no investigation task).
- ✅ Delivery proven instead by the runbook's throwaway-monitor drill: a real alert 🚨 arrived 17:29 and ✅ 17:30 UTC,
  after the UI re-enable. The throwaway monitor was deleted afterwards.

**The runbook rewrite (step 6, 2026-10-02)**, all in `ai-agents/knowledge-base/alert-delivery-runbook.md`:

- Names the control at the trap section, probe-failure step 4, and channel-state steps 2–3. The old `PAUSED` / `DRAFT`
  wording is kept struck; `PAUSED` now uses the same control, and `DRAFT` says plainly that it was never looked at.
- New § *Re-enabling a channel in the monitoring UI* — the runbook's **first choice**; its steps end with the probe,
  `checks.sh`, and the throwaway-monitor drill (not *Test channel*). Bounds stated in the runbook: seen once, on one
  host, on that day's UI version; the `disabled` state was set by SQL, so a **vendor-written** disable was not seen; the
  *Edit channel* page was **not opened** (expected to show the secret); `DRAFT` not looked at.
- New § *The Test channel button is not a liveness signal* — only an arrival means anything; to prove delivery, run the
  throwaway-monitor drill.
- Three links added inside `0368`'s SQL-fallback section (otherwise byte-identical).
- The stale drill-bounds bullet (*"the already-disabled state is still uncovered … a separate follow-up"*) — flagged
  by `0368` — is struck: that state is now caught by check 13 (`0285`), seen to trip once in `0341` (owner ruling Q1).

## Outcome

- Stateful review round 1: ⚠️ changes requested — R1–R4, all low wording findings, all fixed; ledger closed-out, no
  residuals. Second opinion reasoning-only (Codex read-only). No test references the runbook.
- **Still open / unproven:** what an *Edit channel* page shows; the UI for a `DRAFT` channel; a vendor-written
  disable; why *Test channel* went silent; and (unchanged from `0368`) a real alert after an **SQL** re-enable. The
  UI-re-enable-then-real-alert path is the one that **is** now proven, once.

## Related

- [[systems/alert-delivery]] — the alert path and runbook this corrects
- [[tasks/alert-channel-sql-reenable-runbook]] — task `0368`, the SQL fallback it builds on (its sibling)
- [[tasks/uptrace-channel-state-production-check]] — task `0341`, the drill that found the gap
- [[tasks/uptrace-channel-state-check]] — task `0285`, check 13, which reads the channel's state
- [[decisions/sprint-7]] — the board (rank 33); closed 2026-10-02
