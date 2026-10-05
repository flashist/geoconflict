# Verify 0285 in production: deploy it and run its disabled-channel drill

## ID
0341

> ℹ️ **ID allocation, checked 2026-09-29 before filing** (the four checks of
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest ID on all three
> boards (folder names and `## ID` fields agree): `0340`. `0341`: no task folder, no `## ID` hit, no `.claude/`
> hit; the repo-wide search finds only two SVG files (coordinate false positives).

## Sprint
Sprint 7

📌 **Moved from Sprint 6 to Sprint 7 on 2026-09-29** — OWNER RULING **R1** given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: *"Close now, move 3 to Sprint 7"* — *"The producer moves 0339, 0341 and 0289 to Sprint 7 and closes Sprint 6 today. Same work, it just lives in Sprint 7."* [Sprint 6](../../../sprints/done/plan-sprint-6.md) was closed by `/fkit-sprint-done` *(agent-closed — not owner-verified)*; [Sprint 7](../../../sprints/plan-sprint-7.md) was started the same day (R2) and is now the active sprint. `## Status` unchanged; no folder moved; no mover run on this task. *(Earlier value, kept as history — true until 2026-09-29:)* ~~Sprint 6~~

## Priority
**26** — append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), set 2026-09-29 by ruling R1 (see `## Sprint`). ⚠️ A position, **not** a merit rank: writing it higher would renumber Sprint 7's closed `➡️ Moved` rows at ranks 2 and 3, which ADR-035 forbids. **By owner ruling carried from Sprint 6, this task is worked directly after `0339`.** Its order against `0337` and the reconnect run is **not ruled**. *Earlier value, kept below as history — true on Sprint 6 until 2026-09-29:*

~~**46**~~ — append rank on [Sprint 6](../../../sprints/done/plan-sprint-6.md). **By owner ruling (2026-09-29), this task
is worked directly after [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md),
ahead of every other open row except `0339`, whatever this number says.**

- **Why the number does not say that:** the owner ruled *"right below 0339"*. `0339` is itself appended at the
  bottom (rank 45) with an owner-ruled "top priority" note, because every rank above the first open row is a
  closed row, and ADR-035 forbids renumbering closed rows **even under an owner ruling**. The only rank directly
  below `0339` is the next append rank, so this row takes 46 and carries the ruling in words, the same way
  `0339` does.
- **On merit:** directly below `0339`, and above [`0289`](../0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md),
  which waits on this task. *(ADR-035's relative merit statement, because the board rank cannot carry it.)*

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-09-30** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-30, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. **G2** → **"Yes, mark both in progress (Recommended)"** — *"The board then shows the truth: both are underway. Only the status is changed, nothing is closed."* Why: Steps 1.1–1.2 (both deploys) done 2026-09-29; Steps 1.3–1.5, 2 and 3 still pending. Only the status changed; nothing closed. *(Earlier value, kept as history — true until 2026-09-30:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** The deploys, the box commands, the drill and watching the
dead-man's switch page and the Telegram arrival are the owner's. No agent has box access, and no agent may
record a page or an arrival it did not see.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0297`](../../done/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) (owner-confirmed 2026-09-23),
[`0337`](../0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md) and
[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md).)*

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer
precedent. The question: *"File the missing 'verify 0285' task (deploy it + run its drill), so 0289 can move?
Where should it go?"* The answer: **"File it, Sprint 6 (Recommended)"**, option text *"Put it in Sprint 6 right
below 0339. 0289 lives in Sprint 6 and waits on it, and its deploy can ride the same weekend slot."*

**What this verifies.** [`0285`](../../done/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
built **check 13, `alert-channel-state`**: the hourly alert probe on the monitoring box reads the monitoring
stack's **own** record of the notification channel's state (table `notif_channels`, column `status`), sends it
in the same probe message, the relay on the profile box writes it into the same marker, and the daily
`checks.sh` FAILs — paging the external dead-man's switch — on anything but `delivering`. It closes the hole
`0284` left: a channel disabled by yesterday's failure stays disabled while today's probe reads green.

`0285` closed on 2026-09-28 `(agent-closed — not owner-verified)` after build and two review rounds, proven by
tests only. Its worklog § *NOT verified here — owner steps* lists what never happened: the deploy, the real run
on the box (its brief's verification step 2), **the drill** (step 3), and the "no write" check on the real stack
(step 6). No follow-up was filed then; that predates the owner's same-day (2026-09-29) rule that a build task
whose proof needs a deploy gets a separate verify task. **This task is that missing half.** Until it runs, check
13 is a guard nobody has watched trip, and that proves nothing (`0219` precedent).

**Is 0285's change committed, and which deploy carries it?** Checked 2026-09-29 with `git log` / `git show`:

- ✅ **Committed.** All of `0285`'s files landed in commit `68303d5` (2026-09-28, *"Sprint 6: ship 0327, 0322,
  …"*, whose message lists `0285` under *"Also shipped since 390c4b4"*): `setup-telemetry.sh`,
  `src/profile-server/AlertRelay.ts`, `profile-checks.sh`, `tests/profile-server/AlertRoutes.test.ts`,
  `tests/profile-checks.sh`, `tests/scripts/profile-deploy-hardening.test.sh`,
  `ai-agents/knowledge-base/alert-delivery-runbook.md`. The tree at `dev` HEAD holds the new code
  (`read_channel_state()` in the probe heredoc of `setup-telemetry.sh`, `check_alert_channel_state` in
  `profile-checks.sh`). At the check, `git status` showed no uncommitted change to any of those files and `dev`
  level with `origin/dev`.
- ❌ **Not deployed, as far as the records show.** The last deploy window ran **2026-09-26**
  ([weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *THE WINDOW RAN*),
  two days before the commit. No later deploy is recorded. No next window is dated in the runbook yet.
- **It needs TWO deploys, one per box** (`0285` `plan.md` § *Deploy*, runbook § *The channel's own state —
  check 13*):
  1. **Profile box — `npm run deploy:profile` (`./build-deploy-profile.sh`):** the relay change
     (`AlertRelay.ts`, in the image) and check 13 (`profile-checks.sh`, copied to the box by the same script).
  2. **Monitoring (telemetry) box — `npm run deploy:telemetry` (`./build-deploy-telemetry.sh`):** the new probe
     script, written by `setup-telemetry.sh`. No new variables on either box.
- ⚠️ **The profile half is not a standalone deploy.** A profile build from today's tree also carries the other
  pending profile-server changes — `0250` slice S1's server half and `0325` S2 (`0325` `plan.md` amendment § F;
  `0339` *Context*). So it rides **the weekend slot's profile deploy**, in the order that slot sets, and it
  **cannot go out before `0250` S1's client** (that order is `0250`/`0325`'s rule, not this task's to change).
  The telemetry half is safe in either order: an older relay ignores the new field.

The owner deploys in the regular weekend slot unless something is urgent. This task's deploy rides that slot.

## What to build

Nothing is built. An owner-run production check. **Record numbers, times (UTC, time of day only) and yes/no
only** — no hostnames, IPs, URLs, channel ids, chat or topic ids, tokens or secrets.

**Step 1 — the deploy** (`0285` plan § *Deploy*; one window, finished before the next 08:00 UTC daily run).

> 📌 **2026-09-29 — the actual order for the next slot is TELEMETRY FIRST**, then game, then profile — the
> reverse of 1.1 / 1.2 below. OWNER RULINGS 2026-09-29 (live in the `fkit lead` session via `AskUserQuestion`,
> relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ⛔ not producer precedent): **"Game first, record
> it (Recommended)"** set game before profile; telemetry goes first because it is safe in either order (an older
> relay ignores the new field — this brief's *Context*). What changes for this task: after the telemetry deploy,
> the hand-run probe already ends `channel state: delivering`; the profile deploy then comes after the game deploy,
> and 1.3–1.5 run **straight after the profile deploy** (runbook N3.3), then Step 2 (N3.4), then the drill after the
> post-deploy watch (N5). Full step list: [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md)
> § *Next window — plan (written 2026-09-29)*. The order below is kept as history — true as written at filing.

1. Profile box deploy, in the weekend slot's order. Record: date, time, yes/no completed. ⚠️ From this moment
   check 13 FAILs ("no `channel_state`") until the first new probe arrives — so do 3 straight away.
2. Monitoring box deploy. Record: date, time, yes/no completed.
3. On the monitoring box, run `/opt/uptrace/alert-probe.sh` by hand. Record yes/no: its log line ends
   `channel state: delivering`.
4. On the profile box, record yes/no: the probe marker now holds a `channel_state` key; `/opt/profile/checks.sh`
   reports `alert-channel-state … OK`, and `alert-path-probe … OK`.
5. Record yes/no: that probe run posted **nothing** to Telegram (the probe branch must stay silent; `0289`'s
   plan asks for this to be confirmed once after `0285` lands, not assumed).

**Step 2 — "no write" on the real stack** (`0285` brief verification step 6). ⚠️ **Do this BEFORE the drill** —
the drill's own SQL update changes these counters.

1. On the monitoring box, read `n_tup_ins`, `n_tup_upd`, `n_tup_del` from `pg_stat_user_tables` for
   `notif_channels`. Record the three numbers.
2. Run the probe by hand once more.
3. Read the same three counters again. Record the three numbers, and yes/no: all three unchanged.

**Step 3 — the drill** (`0285` brief verification step 3; method = owner ruling Q3, *"One SQL update, re-enable
in UI"*). ⚠️ **This takes live alerting down for its duration. Run it supervised and short.** Record the start
time.

1. Put the channel **the probe sends to** (the one whose URL equals the probe's own) into a genuine `disabled`
   state with one SQL update of its `status` column — exactly what the vendor's own disable writes. Record yes/no
   done. Never paste the channel's id or URL anywhere.
2. Run the probe by hand. Record yes/no: its log line ends `channel state: disabled`.
3. Force `/opt/profile/checks.sh` on the profile box. Record yes/no: it prints `alert-channel-state … DISABLED`
   as a FAIL.
4. Record yes/no, with the time: **the dead-man's switch page arrived** (seen by the owner, not assumed).
5. **Re-enable the channel in the monitoring UI.** Record yes/no done.
6. Run the probe and `checks.sh` again. Record yes/no: `channel state: delivering` and `alert-channel-state … OK`.
7. **Confirm alerting is live:** the §7.6 drill (`0274` plan §7.6, recorded in the alert-delivery runbook), or
   the channel's Test button. Record yes/no, with the
   time: a message arrived in Telegram (seen by the owner).
8. Record the end time and the total minutes alerting was down.

⛔ **If step 3.5 does not bring the state back to `delivering`, stop there, record it, and restore alerting
first** (see the runbook's *When `alert-channel-state` fails*). Do not start `0289`.

### Order constraint with `0289` — read before scheduling either

[`0289`](../0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md) proves an
alert still arrives after an **idle** period. Its quiet window must **NOT overlap** any part of this task:

- this task's profile deploy **restarts the relay** (breaks `0289`'s "no profile-box deploy or restart during
  the window" condition), and
- this task's drill **disables the channel** (breaks its "channel never disabled during the window" condition).

Either one inside `0289`'s window makes `0289`'s result INCONCLUSIVE (`0289` `plan.md`). **Run this task to the
end first.** Optional, to save one firing: this task's final "alerting is live" firing (step 3.7) can serve as
`0289`'s Phase A warm-up (`0289` plan Q3, owner ruling 2026-09-28 *"0289 after 0285 is done"*). If used, record
its time so `0289` can start its quiet window from it.

## Verification steps

1. Both deploys are recorded with date, time and yes/no, and the profile deploy went out in the weekend slot's
   order (not before `0250` S1's client).
2. Step 1: the hand-run probe log ends `channel state: delivering`; the marker holds `channel_state`;
   `alert-channel-state … OK` — all yes. The probe posted nothing to Telegram — yes.
3. Step 2: six counter numbers recorded (three before, three after); all three unchanged — yes.
4. Step 3: `channel state: disabled` — yes; `alert-channel-state … DISABLED` — yes; the dead-man's switch page
   seen by the owner — yes, with time; re-enabled in the UI and back to `delivering` / OK — yes; a Telegram
   arrival seen after re-enabling — yes, with time; total minutes down recorded.
5. The channel ends the task in `delivering`, and alerting is confirmed live. Recorded in the worklog.
6. No part of this task overlapped a `0289` quiet window. If step 3.7 was used as `0289`'s warm-up, its time is
   recorded.
7. **If any answer is "no":** file a **new** task with the readings (a defect or an investigation) — **do not
   reopen `0285` silently** and do not start `0289`. This task still closes, with its result recorded as a
   failed verification, pointing at that task.
8. No hostname, IP, URL, channel id, chat or topic id, token or secret appears anywhere in the worklog. Numbers,
   times and yes/no only.

## Notes

- **Depends on:** [`0285`](../../done/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md) (built; closed 2026-09-28, agent-closed — not owner-verified; committed in `68303d5`) plus its deploy, which is this task's step 1 and rides the weekend slot's profile deploy (not before `0250` S1's client).
- **Blocks:** [`0289`](../0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md)
  (hard — its quiet window may start only after this task's drill has finished and alerting is confirmed live;
  `0289` plan Q3). ⚠️ It does **not** block Sprint 6's deploy — it runs with and after it.
- **Related:** [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  (the probe and the marker path check 13 reuses; its own drill, 2026-09-18, is the model for this one) ·
  [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) (the relay) ·
  [`alert-delivery-runbook.md`](../../../knowledge-base/alert-delivery-runbook.md) § *The channel's own state —
  check 13* and § *When `alert-channel-state` fails* (the procedure for every step above) ·
  [ADR-114](../../../knowledge-base/decisions/adr-114-profile-server-is-the-admin-server-alert-relay-lives-there.md)
  (why the relay lives on the profile box).
- **What a pass still does NOT prove** (from `0285` and the runbook, unchanged): check 13 reads the stack's own
  record, not delivery; it does not check the channel's own copy of the secret, whether a monitor is attached,
  or delivery after idle (that is `0289`). It detects only; nothing re-enables a channel automatically.
- **Effort:** small. Minutes of owner attention inside the weekend slot, plus a supervised drill of minutes.
- 🔒 **Privacy:** numbers, times and yes/no only. Never paste ids, URLs, hosts, IPs, tokens or secrets into any
  artifact. This file is tracked in git.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

## 📌 2026-09-29 — Step 1 record, as far as it goes (appended; nothing above edited, ADR-035)

**Provenance.** Written by a spawned `fkit-producer` (no owner channel, ADR-021) on an OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`: **"Yes, do all three
(Recommended)"** — item 3 (*record tonight's deploy*). ⛔ Not producer precedent. Facts are `fkit-lead`'s own checks
and the owner's live reports; the producer verified none. **`## Status` unchanged; the task is still open.**

- **Step 1.2 (monitoring box deploy):** done **2026-09-29**, first in the slot. Owner-run probe log at
  **18:51:37 UTC** ends `channel state: delivering`. ✅
- **Step 1.1 (profile box deploy):** done **2026-09-29**, last in the slot (after game); `profile-api` started
  **20:04:48 UTC**, healthy. ✅
- **Steps 1.3–1.5 (hand-run probe, marker `channel_state`, `checks.sh` OK lines, nothing posted to Telegram):**
  **NOT done by hand** after the profile deploy. The hourly probe cron covers the probe before the next 08:00 UTC
  `checks.sh` — **unverified**; no reading recorded.
- **Step 2 ("no write"):** not done. **Step 3 (the drill):** not done — the owner deferred it (and `0289`) to a
  quiet day. Step 2 must still run **before** the drill.
- Full record: [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened 2026-09-29*.

## 📌 2026-10-01 — Closed (appended; nothing above edited, ADR-035)

**Closed `✅ Done (agent-closed — not owner-verified)` by a spawned `fkit-producer` via `/fkit-task-done`, with no owner
channel (ADR-021/033 §5), on `fkit-lead`'s relay.** ⚠️ **The owner executed and observed every step himself, live, on
2026-10-01** (Steps 1.3–1.5, 2 and 3; Steps 1.1–1.2 on 2026-09-29) — the marker records only that the *close* was made
by an agent, not that the checks were. Two UI actions (reading the channel's state, pressing Test channel) were done by
`fkit-lead` in the owner's browser at the owner's direction.

- **Result: PASSED, with one owner-chosen deviation.** Step 3.5 re-enabled the channel by the reverse SQL update, **not
  in the monitoring UI** (owner ruling Q3's method) — the owner could not find the UI control in time and chose the SQL
  fallback, its cost named live: **the UI re-enable path is not proven by this drill.**
- Alerting down ≈ 3 min (14:25:37 → 14:28:36 UTC). Telegram Test-channel arrival 14:31 UTC — recorded as a candidate
  `0289` Phase A warm-up; whether it qualifies is an owner call for `0289` (see the worklog, verification 6).
- Verification step 7: no pass/fail reading was "no" → no new task filed.
- All readings: [`worklog.md`](worklog.md).

📌 **2026-10-01, appended (nothing above edited, ADR-035):** the 14:31 UTC candidate `0289` warm-up was **declined** by OWNER RULING (*"No, fresh start (Recommended)"*, live via `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent) — `0289` runs its own Phase A. The UI re-enable gap is filed as [`0368`](../../done/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md) + [`0369`](../../done/0369-find-the-ui-re-enable-for-a-disabled-alert-channel-and-correct-the-runbook/brief.md). See [`worklog.md`](worklog.md).
