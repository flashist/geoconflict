# Approved plan — 0369, step 6 (runbook rewrite)

> **Provenance (written by `fkit-lead`, `fkit-sprint-ship-loop` shape, 2026-10-02).** Approved by the owner via
> `AskUserQuestion` in the live `fkit lead` session on 2026-10-02 (answer: *"Approve (Recommended)"*). Scope:
> **step 6 only** — steps 1–5 (live look) were done 2026-10-01 and recorded in `worklog.md`; step 0 was skipped by
> owner ruling.
> ⚠️ **Honest note:** the owner was shown a plain-language rendering of this plan in the session, not these exact
> bytes. The text below the line is the plan the spawned `fkit-coder` returned, **transcribed by `fkit-lead` from
> that worker's message — not a byte copy** (every file:line, change, source, check, risk and scope item kept).
> This is the `carried-not-approved` residual the skill names — approval leaves no artifact (ADR-021).
>
> **Owner rulings on the plan's open questions (same `AskUserQuestion`, 2026-10-02):**
> - **Q1 (stale drill-bounds bullet `:599-601`):** *"Yes, fix it now (Recommended)"* — item 10 is IN scope.
> - **Q2 (Test-channel investigation):** *"Warning only, no task (Recommended)"* — no investigation task; the
>   runbook warning (item 6) plus the drill covers it.

---

# Plan: 0369 step 6, rewrite the runbook from the live look

**Summary**
- Docs only. The only files that change are `ai-agents/knowledge-base/alert-delivery-runbook.md` and the task's own `worklog.md` (the step-6 record, written during the build). No code, no deploy, no live run — the live look is done.
- Line numbers are from the runbook as committed in `2247699`; the build re-reads the file first.
- Name the control everywhere the runbook says "re-enable in the UI": **Alerting → CHANNELS → the channel's row → `Unpause channel` (▶)**. Add one short subsection for the UI route and one general warning that *Test channel* is not a liveness signal. The SQL fallback stays, still labelled the fallback.
- Every new sentence traces to a line in 0369's `worklog.md`. Four things the look did not see stay marked as not seen: the Edit page, `DRAFT`, a vendor-written disable, and why Test channel fails.
- The stale bullet `:599-601` ("already-disabled state … still uncovered") is fixed (owner ruling Q1).

## How the runbook is split with 0368 (0368's table kept)
0368 owns the SQL fallback section, the check-13 and probe "seen to trip" lines, and the IDLE/A1 text — **none change**, except three small link additions inside the SQL section (items 7–9). 0369 owns: naming the control, channel-state step 3, and the general Test-channel warning. Edit the sentences as 0368 left them.

## Changes

**1. Trap, `:43-47`.** Keep the existing sentence and the SQL-fallback pointer. Append: *"In the UI: **Alerting → CHANNELS → the channel's row → `Unpause channel` (▶)** — see [Re-enabling a channel in the monitoring UI](#re-enabling-a-channel-in-the-monitoring-ui)."* Source: worklog steps 3 and 4.

**2. Probe-failure step 4, `:216-219`.** Keep text and fallback pointer. Append the same control path with a details link, plus: *"To confirm alerting is live, use a real alert — the *Test channel* button is [not a liveness signal](#the-test-channel-button-is-not-a-liveness-signal)."* Source: worklog step 4, Telegram part.

**3. Channel-state step 2 (`DISABLED`), `:224-228`.** After "**re-enable the channel in the monitoring UI**", add *"(**Alerting → CHANNELS → row → `Unpause channel` (▶)**, [details](#re-enabling-a-channel-in-the-monitoring-ui))"*. Everything else stays.

**4. Channel-state step 3 (`PAUSED` / `DRAFT`), `:229`.** Rewritten: old line kept struck, followed by *(Wording until 2026-10-02; replaced by `0369`, which named the control.)* New text: *"`PAUSED`: the same control — **Alerting → CHANNELS → row → `Unpause channel` (▶)** (seen 2026-10-01, `0369`). `DRAFT`: finish saving it in the monitoring UI — ⚠️ a draft channel has never been looked at; what the UI offers for it is not known."* Source: worklog step 5 (the paused row offered the same control and it returned the channel to `delivering`; nobody looked at `DRAFT`).

**5. New subsection `#### Re-enabling a channel in the monitoring UI`** — after channel-state step 6 (`:251`), before the SQL fallback heading (`:253`). Content:
- **The official route** (`0369`); works for both `disabled` and `paused`.
- Steps:
  1. Open **Alerting → CHANNELS**, find the channel's row (`alerts-to-telegram`, webhook); status shows 🔴 `disabled` or ⚪ `paused`.
  2. Press **`Unpause channel` (▶)**. Hover the icons to read their names. Seen while `disabled`, in order: *Test channel · Unpause channel · Edit channel · Delete channel*. While `delivering`, the second action reads **`Pause channel` (⏸)** instead.
  3. Reload the page; check the row reads `delivering`.
  4. Do channel-state step 6: hand-run the probe (`channel state: delivering`), then `checks.sh` (`alert-channel-state … OK`).
  5. Prove a message arrives with the throwaway-monitor drill, not *Test channel* (next subsection).
- ⚠️ Bounds:
  - Seen once, 2026-10-01, one host, the monitoring UI version deployed that day.
  - The `disabled` state was set by SQL (as in `0341`), not by a real failed delivery; a vendor-written disable was not seen.
  - The *Edit channel* page was **not opened**, on purpose (it shows the channel's secret). Whether it has a status control is unknown, and not needed.
  - `DRAFT` was not looked at.
  - ✅ A real alert **did** arrive after this UI re-enable: 🚨 17:29 and ✅ 17:30 UTC, 2026-10-01. Compare SQL caveat 2: after an SQL re-enable this is still unproven.

Sources: worklog steps 3, 4, 5 and *What this does NOT prove*. Not included (would be a guess): anything about the Edit page's contents or other versions.

**6. New subsection `#### The Test channel button is not a liveness signal`** — right after item 5. Content:
- ⚠️ **Only an arrival means something. No arrival from *Test channel* does not mean the channel is dead.**
- 2026-10-01, after the UI re-enable, the button was pressed 3 times (15:34, 15:43, 16:07 UTC); nothing reached Telegram.
- The relay counter `geoconflict_profile_alert_relay` showed no call at those times — the presses never reached the relay.
- An earlier press the same day (14:31, `0341`, after the SQL re-enable) did arrive and was counted `sent`.
- **Cause unknown.** The monitoring stack's container log shows nothing for any press, working or not. Not investigated further (owner ruling Q2: warning only); not known whether the re-enable route matters.
- ⇒ **To prove delivery, run [the throwaway-monitor drill](#the-working-drill-procedure--reusable-run-it-again-whenever-you-need-to)** — it delivered 🚨 and ✅ the same afternoon.

Source: worklog step 4, Telegram part. The drill heading's anchor is checked by the anchor script (verification 4).

**7. SQL fallback intro, `:255`.** After "Re-enable in the monitoring UI first", add *"([how](#re-enabling-a-channel-in-the-monitoring-ui))"*. "A fallback, not the first choice" stays.

**8. SQL `UPDATE 0` third cause, `:301`.** After "Re-enable in the UI instead", add a link to the UI subsection. Nothing else changes.

**9. SQL "Then:" bullet, `:305-310`.** Keep 0368's sentences (still true). Append a link to the warning subsection. Nothing struck.

**10. Drill-bounds bullet, `:599-601` (owner ruling Q1: in scope).** Strike "the **already-disabled state** is still uncovered and is a separate follow-up", add *(True until `0285` shipped check 13.)*, then: *"It is now caught by check 13 (`0285`), seen to trip once on the real box (`0341`, 2026-10-01) — see *The channel's own state*."* The `0284` half of the bullet stays.

**Rule for striking.** Where a sentence is only added to and nothing in it became false (items 1–3, 7–9), nothing is struck (0368's approach, owner-approved). Where a line is rewritten (items 4, 10), the old text stays struck. Item 4's old text was vague rather than false, so its note reads "wording until", not "true until".

**Not touched:** the SQL code block `:264-280` and caveats `:312-324` (caveat 2 already says 0369's real alert came after a UI re-enable); check-13 bounds `:177-187` ("re-enabled by SQL, not in the UI" is a true record of `0341`); the IDLE/A1 text, the `0283`/`0284` bullets, the drill procedure, and the existing anchor `#re-enabling-a-disabled-channel--sql-fallback`. No other file links into the runbook by anchor (checked).

## Verification
1. **Diff scope.** `git status` before/after: only the runbook and the 0369 `worklog.md` change. Runbook hunks only at items 1–10.
2. **Untouched passages byte-identical** — SQL code block, caveats 1–3, check-13 bounds, IDLE section, `0283`/`0284` bullets — matched line by line against HEAD (`grep -qxF`).
3. **Claim trace.** The worklog gets a table mapping each new sentence to the worklog step that supports it; any sentence without support is cut (brief verification 6: nothing in the runbook is a guess).
4. **Anchors.** A scratchpad script (not in the repo) computes GitHub-style slugs for every heading and checks every `](#…)` resolves — the two new anchors, the drill anchor, the existing SQL one.
5. **Secret grep over added lines** — URLs, IPv4, chat/topic ids, token shapes, long hex/base64, hostnames: zero hits. `alerts-to-telegram` and the metric name already appear in the runbook and are not secrets (brief verification 8; no screenshot involved).
6. **`npm test` unaffected.** `grep -rln alert-delivery-runbook tests scripts` → 0 files (checked), so not run.

## Risks
- **The control name may change with a monitoring image upgrade.** One version seen — stated as a bound. The path is repeated in 4 places on purpose (an operator mid-incident has the click path right there); a rename must update all 4 plus the subsection together.
- **Test-channel cause unknown.** The warning says so and claims no cause; it points to the drill, which proved delivery the same day.
- **More runbook text may tempt skipping the drill.** The UI subsection's step 5 makes the drill part of the route.
- **Effort:** under an hour. Next: review (stateful, task `0369`), producer close with the agent-closed marker, wiki ingest by `fkit-wiki`.

No commit, no wiki write, no task move.
