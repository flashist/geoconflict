# Find how to re-enable a DISABLED alert channel in the monitoring UI, and correct the runbook to match

## ID
0369

> ℹ️ **ID allocation, checked 2026-10-01 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Allocated in the same run
> as [`0368`](../../done/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md), directly
> after it; highest before the run was `0367`. `0369`: no task folder, no `## ID` hit, no hit under
> `ai-agents/sprints/` or `.claude/`.

## Sprint
Sprint 7

## Priority
33

> ⚠️ **Priority 33 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner named the
> sprint but no rank; the board's highest was 32 (`0368`, same run), and writing it higher would renumber closed
> rows (ADR-035). **On merit this belongs directly below `0368`**, because it builds on `0368`'s SQL fallback and
> needs a supervised outage on an owner-chosen day, while `0368` needs neither.
>
> ✅ **ANSWERED 2026-10-01 — OWNER RULING** (live `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`
> to a spawned `fkit-producer` with no owner channel, ADR-021/037; ⛔ not producer precedent): **"Leave at the
> bottom"**. Rank **33 is this task's real place** — not the top group. Appended; nothing above edited (ADR-035).

## Status
🔄 In progress

📌 **Set 2026-10-01** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on facts relayed by
`fkit-lead` from the live `fkit lead` session; ⛔ not producer precedent. Why: the **live look (steps 1–5) was done
2026-10-01** — owner-run box commands, UI actions by `fkit-lead` in the owner's browser at the owner's explicit
instruction, Telegram arrivals seen by the owner. Readings: [`worklog.md`](worklog.md). **Step 6 (runbook rewrite,
`fkit-coder`) is still pending — nothing closed.** Step 0 skipped by owner ruling. *(Earlier value, kept as
history — true until 2026-10-01:)* ~~🔲 Backlog~~

## Owner
fkit-coder

⚠️ Plus an **owner step** — disabling the live channel, looking at the monitoring UI, using its control, and
watching the Telegram arrival are the owner's (same form as `0289`). No agent has box access, and no agent may
record a page, a UI state or an arrival it did not see.

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
2026-10-01 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`.** ⛔ Not producer precedent.
Choice, verbatim: **"Yes, file it (Recommended)"**. Split from one requested task into two — see
[`0368`](../../done/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md) § *Context* for
the reason; flagged for owner confirmation there.

✅ **ANSWERED 2026-10-01 — OWNER RULING** (relayed by `fkit-lead`; ⛔ not producer precedent): **"Keep two
(Recommended)"** — the split stands. Appended (ADR-035).

### The question, in plain terms

The runbook says *"re-enable the channel in the monitoring UI"* in three places. In
[`0341`](../../done/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md)'s drill
(2026-10-01) the owner could not find that control while the channel was `disabled`. Afterwards — with the channel
already back to `delivering` — `fkit-lead` saw the row actions **Test / Pause / Edit / Delete**. **What the row
shows while the channel is DISABLED has never been seen.** It may offer a resume/enable action in the Pause slot,
or none at all — 🚩 that is a guess, not a finding.

### Why it costs a short outage

The UI can only be checked while the channel is actually in the state we care about. Putting it there means
**alerting is down for those minutes** — `0341`'s drill took ≈ 3 min. That is the cost; it is small but real, so it
runs supervised on an owner-chosen day.

### 🔴 Which state to use — producer's recommendation, flagged for owner confirmation

**Use `disabled`, set by the same one-row SQL update `0341` step 3.1 used** — not Pause.

- `disabled` is the state the vendor itself writes after a failed delivery (runbook § *The channel's own state —
  check 13*), so it is the state an operator meets in a real incident. That is the screen the runbook must describe.
- **Pause is a different state (`paused`).** Pressing Pause and seeing a resume button proves the *paused* path
  (runbook § *When `alert-channel-state` fails* step 3), **not** the disabled one. It would be cheaper — no SQL, a
  UI button — but it answers a different question. Worth doing **as well**, in the same session, because it checks
  step 3's wording for almost no extra cost.

Open owner question **Q1** below asks the owner to confirm this.

✅ **ANSWERED 2026-10-01 — OWNER RULING Q1** (live `fkit lead` session via `AskUserQuestion`, relayed by
`fkit-lead`; ⛔ not producer precedent): **"Disabled + quick Pause (Recommended)"**. The look uses the channel in a
real `disabled` state, set by the one-row SQL update as in `0341` step 3.1, **plus** the quick Pause/Resume check
(step 5) in the same session. Step 5 is therefore **in scope**, not optional. Appended; nothing above edited
(ADR-035).

## What to build

**Step 0 — no outage, agent work (fkit-coder).** Before touching the box, look for the answer offline: the
vendor's documentation and, if available, its UI source for the **pinned** image version (the version named in
`setup-telemetry.sh`'s `Schema verified against:` line). What actions does a channel row offer when `status` is
`disabled`? When `paused`? Record what was found and where, or that nothing was found. ⚠️ This narrows what the
owner looks for; **it does not replace the live look** — documentation for one version is not the deployed UI.

**Step 1 — pre-flight (owner).** Not inside a `0289` quiet window (see *Order*). Channel reads `delivering`
(probe log or the UI). Note the time.

**Step 2 — disable (owner).** The same SQL update as `0341` step 3.1 (`status` to `disabled`, matched on the
probe's URL from its env file, never printed). Expect `UPDATE 1`.

**Step 3 — look (owner, the point of the task).** Open Alerting → Channels. Record, in words: the row's status
label, every action offered, and anything inside *Edit* that looks like an enable/status control. ⚠️ If you take a
screenshot, keep it out of git — the page shows the channel's URL.

**Step 4 — re-enable through the UI (owner).** Use the control found in step 3. Confirm: hand-run the probe (log
ends `channel state: delivering`), then `checks.sh` (`alert-channel-state … OK`), then *Test channel* and see it
arrive in Telegram. **If the UI offers no control:** re-enable with `0368`'s SQL fallback, record "no UI control
for a disabled channel in this version", and go on.

**Step 5 — Pause check (owner, if Q1 says so).** Press *Pause*, record what the row then offers, resume through the
UI, then hand-run the probe and confirm `delivering`. Seconds of outage.

**Step 6 — correct the runbook (fkit-coder).** In
[`alert-delivery-runbook.md`](../../../knowledge-base/alert-delivery-runbook.md): replace the three UI re-enable
instructions (as left by `0368`) with what step 3/4 found — the exact control names — or, if there is none, make
the SQL route the **official** method and drop the UI wording. Update step 3 (`PAUSED` / `DRAFT`) from step 5's
finding. Keep old text struck.

📌 **2026-10-01, appended (nothing above edited, ADR-035) — step 6's input, from the live look.** Recorded by a
spawned `fkit-producer` on facts relayed by `fkit-lead`; ⛔ not producer precedent. Full readings:
[`worklog.md`](worklog.md).
- **The control exists.** Rewrite the runbook's three *"re-enable in the UI"* instructions to name **Alerting →
  CHANNELS → the channel's row → `Unpause channel` (▶)**. It is offered for **both** `disabled` (🔴) and `paused`
  (⚪); when the row is `delivering` that slot reads `Pause channel` (⏸). Row actions seen while `disabled`, from
  their tooltips: **Test channel · Unpause channel · Edit channel · Delete channel**. Update step 3 (`PAUSED`)
  the same way. ⚠️ The **Edit** page was **not** opened (it shows the channel secret) — do not describe it.
- **Add a warning: the *Test channel* button is NOT a reliable liveness signal.** Silent non-delivery observed 3×
  on 2026-10-01 (none reached the relay); cause unknown. To prove delivery, point to the runbook's existing
  **throwaway-monitor drill** (the rejected-sessions monitor), which delivered 🚨 and ✅ the same day.
- **`0368`'s SQL re-enable stays valid as the fallback** — keep it, as the fallback, not the official route.
- ⚠️ **Dependency:** step 6 edits the wording *"as left by `0368`"*; `0368` is still `🔲 Backlog` as of this note.
  Land `0368` first, or do both edits in one pass so neither overwrites the other.

## Verification steps

1. Step 0's finding is recorded in this task's `worklog.md` with its source, or "nothing found" — yes.
2. The owner saw the channel in `disabled` state in the UI — yes, with time; the row's label and every action
   offered are written down in words.
3. Either a UI control re-enabled it (named exactly) **or** none existed and SQL was used — one of the two, stated.
4. After re-enabling: probe `delivering` — yes; `checks.sh` `alert-channel-state … OK` — yes; Test-channel message
   seen in Telegram — yes, with time. Total minutes down recorded.
5. If Q1 included it: the paused row's actions and the resume path recorded; probe back to `delivering`.
6. The runbook's three re-enable instructions and step 3 match what was seen; nothing in them is a guess.
7. The channel ends the task `delivering`, and alerting is confirmed live.
8. No hostname, IP, URL, channel id, chat or topic id, token or secret in the worklog or the runbook; no screenshot
   committed.
9. ⛔ **If anything comes back "no"** (the channel will not return to `delivering`, no Telegram arrival): that is a
   finding, not a failed task — re-enable by SQL at once, record it loudly, and route the fix to the owner.

## Notes

- **Depends on:** [`0368`](../../done/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md) (the SQL fallback step 4 uses, and the runbook wording step 6 replaces), [`0341`](../../done/0341-verify-0285-in-production-deploy-it-and-run-its-disabled-channel-drill/brief.md) (done 2026-10-01 — the drill that found the gap)
- **Blocks:** nothing.
- 🚨 **Order with [`0289`](../../done/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md):**
  this task **disables the channel**, which makes `0289`'s result INCONCLUSIVE if it falls inside `0289`'s quiet
  window (`0289` `plan.md`). Run it **before `0289`'s drill day or after `0289` finishes** — never between `0289`'s
  Phase A and Phase C. ⛔ Its final Test-channel firing is **not** a `0289` warm-up: the owner ruled on 2026-10-01
  that `0289` runs its own Phase A on its drill day.
- **Related:** [`0285`](../../done/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
  (check 13 — its page fires only on the daily 08:00 UTC run, so a supervised window that ends with a hand-run probe
  showing `delivering` should not page; ⚠️ still avoid straddling 08:00 UTC) ·
  [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  (the probe).
- **Build/verify:** the live look is the verification itself and the runbook edit has no deploy, so no separate
  verify task follows.
- **Effort:** small. Step 0 under an hour; the owner session ≈ 10 minutes, of which a few minutes of alerting are
  down.
- **Open owner questions:**
  - **Q1 — which state for the look?** Recommended: **disabled via SQL, plus a quick Pause check in the same
    session.** Plain context: the screen we need is the one an operator sees after a real failure, and that is
    `disabled`; Pause shows a different screen, useful only for the separate "paused" runbook step.
  - **Q2 — when?** Any quiet day before `0289`'s drill day, or after `0289` finishes. Owner's pick.
  - 📌 *2026-10-01, appended (nothing above edited, ADR-035):*
    - **Q1 ✅ ANSWERED** — OWNER RULING (live `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`;
      ⛔ not producer precedent): **"Disabled + quick Pause (Recommended)"**. See the note under *Which state to use*.
    - **Q2 still OPEN** — which day. ⚠️ Its *"before `0289`'s drill day, or after `0289` finishes"* condition, and
      the 🚨 *Order with `0289`* note above (and Step 1's *"Not inside a `0289` quiet window"*), **no longer
      apply**: `0289` closed 2026-10-01 on observed evidence **without a drill**, so there is no quiet window to
      avoid. The remaining timing constraint is the `0285` one under *Related* — avoid straddling 08:00 UTC.
  - 📌 *2026-10-01, appended (nothing above edited, ADR-035):* **Q2 ✅ ANSWERED by the owner's choice** — the
    live look ran **2026-10-01, 15:32–17:33 UTC** (OWNER RULING *"Yes, now (Recommended)"*, live `fkit lead`
    session, relayed by `fkit-lead`; ⛔ not producer precedent). Clear of 08:00 UTC.
- 🔒 **Privacy:** numbers, times, control names and yes/no only. Never paste ids, URLs, hosts, IPs, tokens or
  secrets into any artifact; this file is tracked in git.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask. No wiki writes. Do not invoke
  the mover skills (producer-only, ADR-033).
