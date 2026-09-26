# Detect an **already-disabled** Uptrace notification channel — read the monitoring stack's own channel state

## ID
0285

> ℹ️ **ID allocation, checked 2026-09-18 before filing.** `0285`: no folder under
> `ai-agents/tasks/{backlog,done,cancelled}/`, no `## ID` hit in any `brief.md`, no repo-wide hit
> outside `ai-agents/wiki-vault/log.md` line numbers (which are not IDs). Highest existing ID was
> `0284`. `0286` was checked at the same time and is also free — **not** allocated here; see *Notes*.

## Sprint
Sprint 6

📌 **Moved from Sprint 5 to Sprint 6 on 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` (*"Append to Sprint 6 (Recommended)"*), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. [Sprint 5](../../../sprints/plan-sprint-5.md) now carries only the profile/citizenship launch, and this task is not needed for it. Now rank 10 on [Sprint 6](../../../sprints/plan-sprint-6.md). `## Status` unchanged. *(Earlier value of this field: `Sprint 5`.)*

### ➡️ MOVED FROM SPRINT 4 TO SPRINT 5 ON 2026-09-22 — OWNER RULING

**AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-22**, relayed by
`fkit-lead` to a spawned `fkit-producer` with **no owner channel of its own** (ADR-021). ⛔ **Not
producer precedent.** The owner, verbatim:

> *"Let's skip this type of chekups, I will take care of them after deploy. The only thing we should
> care about is to make sure the feature is switcheable (e.g. if the flag is not enabled or doesn't
> exist, the feature is not enabled), and that's it. You can move the tasks connected to checkings to
> the next sprint, so we do final checkups and figure out what's wrong with them after deploy."*

The owner was then shown a proposed list of four checkup tasks and chose **"Move all four"**:
[`0238`](../../done/0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md), `0285`,
[`0289`](../0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md) and
[`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md).

**THE REASON, PLAINLY:** the final checkups happen **after the deploy**, when production can actually
be observed. ✅ **Consistent with, and not a re-decision of, the 2026-09-19 ruling** that already
deferred this task together with `0289` and `0219` G3/G4 as one monitoring bucket, and with the
2026-09-22 ruling that ratified its rank as `Low`.

⛔ **The task FOLDER did not move** — it stays under `ai-agents/tasks/backlog/`. ⛔ **No mover skill was
invoked** — this is neither a close nor a cancellation. ⛔ **The `## Status` token is UNCHANGED
(`🔲 Backlog`)**, and so is `## Priority`: a change of board is not a change of state or of rank.

## Priority
**25** — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down two more later on 2026-09-26 by a fourth OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner moved `0311` + `0316` up to 14–15 — see the *RE-RANK 2026-09-26, FOURTH* addendum on that board. ⛔ Not a merit re-rank of this task. *Earlier values, kept below:*

~~**23**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down six more later on 2026-09-26 by a third OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner moved six appended name-change / purchase-state rows (`0312`–`0315`, `0317`, `0318`) up the board — see the *RE-RANK 2026-09-26, THIRD* addendum on that board. ⛔ Not a merit re-rank of this task. *Earlier values, kept below:*

~~**17**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down one more later on 2026-09-26 by a second OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021): the owner moved `0250` into Sprint 6 at rank 4 — see the second *RE-RANK 2026-09-26* addendum on that board. ⛔ Not a merit re-rank of this task. *Earlier values, kept below:*

~~**16**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down six on 2026-09-26 because an OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021) put six rows above it — see the *RE-RANK 2026-09-26* addendum on that board. Order among the other rows unchanged; ⛔ not a merit re-rank of this task. *Earlier value, kept below:*

~~**10**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), set 2026-09-26 by the same owner ruling (append in Sprint 5's order, ranks continuing after Sprint 6's highest). ⚠️ An append position, **not** a merit re-rank. *Earlier value, kept below as history — it was true on the Sprint 5 / Sprint 4 boards, and any owner-ruled label in it still stands as a merit label:*

🔴 **Low — OWNER-RULED 2026-09-22** *(ratified; was `Medium`, the producer's unratified append rank)*

⚠️ **AUTHORITY BEFORE FACTS.** **OWNER RULING given live in the `fkit lead` session on 2026-09-22**,
relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**: **"Rank them Low,
ratified."** Owner's stated reason: **it matches the priority they already set — the
monitoring/messaging track is deprioritized — and it clears the unratified flag so it stops appearing
as noise on every status read.** ⛔ **Not producer precedent — one ruling, three rows (`0285`, `0286`,
`0289`).**

⚠️ **RANK ONLY.** ⛔ **No `## Status` token was touched, no task file was moved between `backlog/`,
`done/` and `cancelled/`, and no mover skill was invoked.** A ratified rank is not a started task.

~~⚠️ **Append rank, NOT a merit ranking** — flagged for owner confirmation.~~ ✅ **Flag cleared
2026-09-22 by the ruling above.** Kept struck, not deleted — it is the true record of how this row was
ranked until today. **The merit note still stands:** appended at the bottom of the Sprint 4 table,
nothing inserted and nothing renumbered (ADR-035), and **on merit this belongs directly below**
[`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md),
whose hole it closes and whose marker path it reuses.

### ⚠️ The BOARD is the PRODUCER'S CALL — ~~and so is the rank~~ 🔴 **the RANK is OWNER-RULED as of 2026-09-22 (above)**. Read this before treating the board placement as an owner ruling.

**What the owner ruled (2026-09-18, live in the lead session via `AskUserQuestion`, relayed to a
spawned `fkit-producer` with no owner channel):** this loose end should **be filed as a task** rather
than left floating in a worklog. It was a multi-select and the owner selected it. ⛔ **That is the
whole ruling.** The owner did **not** rule the board, the rank, the owner-of-record, or the shape.
⛔ **Not producer precedent — one ruling, one task.**

**There is a second, older owner ruling that this brief exists to discharge**, and it is narrower than
it looks: at [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)'s
plan approval on **2026-09-18**, the owner was offered *fold-it-into-`0284`* / *separate follow-up* /
*do-not-file-at-all*, and chose **separate follow-up**. That is recorded as **D4** in that plan
(`plan.md:384-388`). So the owner ruled **that this is separate work**, and, today, **that it be
filed**. ~~Board and rank remain unruled.~~ 📌 **Amended 2026-09-22 — the RANK is now owner-ruled (`Low`, above); the BOARD placement is still the producer's.**

**Producer's call: Sprint 4, appended, ~~rank Medium~~.** 🔴 **The rank is now `Low` by owner ruling
(2026-09-22, above); only the BOARD placement below is still the producer's.** The reasoning is kept as
the record of how it was ranked at filing time:

1. **It belongs beside the thing it completes.** `0284` is on this board and ✅ **closed 2026-09-18**
   (· earlier, when this was written: *in flight on this board right now*), and is
   explicitly documented as catching *the cause, not the state*. Filing the state half on the Backlog
   board would let Sprint 4 close with the alerting path nominally guarded and a named,
   already-written-down hole left open with nothing forcing a re-look.
2. **The Backlog board has a demonstrated hold-forever failure mode.**
   [`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) sat there from
   2026-08-23 to 2026-09-17 because nothing forced a re-look — the same precedent `0283`'s and
   `0284`'s briefs both cite against themselves.
3. **Why Medium and not High, stated honestly** *(superseded 2026-09-22 — the owner ruled `Low`; kept
   as the record of the producer's reasoning at filing time)* — three reasons, and each one is a real argument for
   ranking it *below* `0284`:
   - **`0284` narrows this hole, it does not leave it untouched.** Once `0284` is live, a *persistent*
     bad address is caught within ~24 h. What survives is the narrower case: a **transient** failure
     that disabled the channel and then healed, leaving the probe green and alerting dead. Real, but
     rarer than the case `0284` covers.
   - **The first deliverable is an investigation with genuinely unknown cost.** The 2.0.2 table and
     column names are **unverified** (see *What to build*, step 1). Ranking this High would promise a
     delivery date the schema might not permit.
   - ~~**It cannot start until `0284` lands** — it reuses that task's marker path.~~
     ✅ **Superseded 2026-09-18 — `0284` landed.** Kept because it was one of the three reasons for
     the Medium rank at filing time; it is **no longer a reason**, and the rank has **not** been
     re-ranked on the strength of that (ADR-035 — a rank change is the owner's or a deliberate
     producer act, not a side effect of a correction).

**The tradeoff, stated plainly:** this adds a row to a board that already carries a large number of
open rows.

✅ **DEPENDENCY MET — `0284` CLOSED 2026-09-18**, marker `✅ Done (agent-closed — not owner-verified)`,
now at
[`../../done/0284-…`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md).
The drill did run: owner-executed, and the whole chain was watched end to end — probe → allowlist →
route → secret check → marker → daily check → external dead-man's switch → the owner's inbox. **This
task is therefore STARTABLE.** ⚠️ **Startable is not started** — its `## Status` below stays
`🔲 Backlog` until someone deliberately starts it.

> · **earlier** (true when filed, false since 2026-09-18 — kept so the record shows a claim that was
> true, became false, and was corrected): *"…and it is **blocked until `0284` closes** — which is
> itself gated on a drill that has not run. **If Sprint 4 closes first, this row carries forward
> unstarted.**"*

The alternative placement was
the Backlog board, which is where the cheaper `0283` originally went. Reasons 1–2 are why this one is
ranked onto the sprint instead.

## Status
🔲 Backlog

## Owner
fkit-coder

⚠️ Plus **owner steps** — reading the monitoring stack's internal state happens on the telemetry box,
and the guard must be **seen to actually trip once** before anyone trusts it. A guard nobody has
watched fire proves nothing ([`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)
precedent, cited the same way in `0284`).

### ⛔ DEFERRED past the weekend deploy slot — OWNER RULING 2026-09-19

⛔ **Authority first.** Given **live in the `fkit lead` session via `AskUserQuestion` on 2026-09-19**
and relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**.
⛔ **NOT producer precedent — one owner ruling, one task.**

Shown a conflict between their own two instructions of that day — *"prepare all the related things to
citizenship and profile"* versus *"focus on the tasks that related to the core functionality of the
features (not monitoring/messaging)"* — the owner **split
[`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)**: its G1
(container log rotation) and G2 (image prune) are prepared before the weekend deploy slot, and its
G3/G4 (external uptime check, `last-backup.json` freshness reader) are **deferred — together with THIS
task and [`0289`](../0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md)**,
as one monitoring bucket.

⛔ **WHAT THIS RULING DID NOT DO — do not widen it.** It did **not** close this task, **not** cancel it,
and **not** re-rank it. **`## Status` above is UNCHANGED (`🔲 Backlog`)**, `## Priority` is unchanged,
this brief stays on the Sprint 4 board where it is, and **no mover skill was invoked.** The ruling
scopes **prep work before one deploy slot** — it says nothing about this task's merit or existence.

🚨 **The cost the owner was told and accepted:** the TLS-certificate fuse that `0219`'s G3/G4 would have
been the only thing watching **stays unwatched** — the live certificate's `notAfter` reported as
**2026-11-20**, twice-daily renewal attempts beginning around **2026-10-21**, failing silently until
TLS stops serving. ⚠️ **Those two dates are AS REPORTED by an earlier producer, not verified** — no
source in this repository can see the live certificate.

## Context

### What already exists, and why it is not enough

[`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) (closed) shipped a webhook relay
that carries monitoring alerts to Telegram. **A `401`, `403` or `404` reply permanently and silently
disables the notification channel** — this was established not by inference but by **disassembly of
the shipped `uptrace/uptrace:2.0.2` binary**. There is no retry, and no log that anyone reads.

[`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
(✅ **closed 2026-09-18** · earlier: *in flight*) guards the **cause**: an hourly probe traverses the same allowlist and the same route a
real alert would, the relay stamps a marker on receipt, and a daily check in `profile-checks.sh` pages
the **external dead-man's switch** when that marker goes stale. That escalation path deliberately
depends on neither Uptrace nor Telegram, so it cannot be killed by the failure it is watching for.

### 🚨 The hole this task closes, stated exactly

**`0284`'s probe catches the CAUSE, not the STATE.**

> If a transient failure disabled the channel **yesterday**, and the address is fine **today**, the
> probe reads **green** and alerting is **still dead**. Nothing detects that.

This is not a discovered defect — it is a **known, written-down residual**. `0284`'s own brief lists
it first under *What this does NOT cover* (`brief.md:299-301`), and its plan's D4 records the owner's
decision to hand it to a follow-up. This brief is that follow-up.

**Why the hole is worth closing at all, given `0284` exists:** the two failure modes are not the same
event. `0284` answers *"can an alert get out right now?"* by exercising the path. This task answers
*"does the monitoring stack still believe the channel is enabled?"* by reading the stack's own record.
A channel can be disabled by an event that has since passed, and no amount of probing the healthy
path today will reveal it.

### Why it is a separate task and not part of `0284`

**This is an owner ruling (D4, 2026-09-18) — it is not a producer's preference.** The reasoning
recorded with that ruling:

- closing this hole means reading the monitoring stack's **own internal channel-state storage**, which
  is a different mechanism from everything `0284` touches; and
- the **2.0.2 table and column names are UNVERIFIED** — nobody has looked; so
- folding it in unasked would have **substituted a new design for the architect's** mid-task.

⛔ **Do not re-litigate this and fold it back into `0284`.** The separation is the owner's call.

## What to build

**Shape carried from `0284`'s planner — NOT re-designed here.** The producer is not making a technical
design call; this records the shape the planner already proposed and the owner already agreed to as a
follow-up. The **plan** for this task decides the details.

The intended shape is: **a read-only query against the monitoring stack's own channel-state table on
the telemetry box**, whose result is reported through **the same marker / dead-man's-switch path
`0284` establishes** — so that the signal does **not** travel the alert path it is checking.

1. 🚩 **FIRST JOB, AND IT GATES EVERYTHING ELSE: verify the `uptrace/uptrace:2.0.2` schema.** The table
   and column names are **not known**. Establish, against the actually-running version on the
   telemetry box:
   - where the notification-channel state lives (which store, which table);
   - which column expresses *enabled / disabled*, and what its values are;
   - whether a disable is recorded as a state change, an error field, a timestamp, or something else
     entirely.

   ⚠️ **Write down what you find, including "this is not stored where we assumed".** If the schema
   turns out not to expose the state at all, **that is a legitimate outcome of this task** — report it
   and stop; do not invent a substitute mechanism to have something to ship. Escalate to the owner
   instead.

2. **A read-only check.** No writes to the monitoring stack's storage, ever. It reads state; it does
   not repair it.

3. **Report through `0284`'s established path.** Reuse the marker / `profile-checks.sh` /
   external-dead-man's-switch shape `0284` builds — do not invent a second reporting channel, and do
   **not** report a dead alert channel *through the alert channel*. That circularity is the whole
   point.

4. **A test case in `tests/profile-checks.sh`** for the new check, matching the shape `0284` adds
   (healthy state → OK, disabled state → FAIL, unreadable/absent state → FAIL, and say which). That
   harness is in `npm test` and is the only gate that script has.

   ⚠️ **Decide deliberately what an UNREADABLE state means, and write the decision down.** A check
   that cannot read the schema must not silently pass — but it also must not page the owner nightly
   because of an unrelated version bump. This is a real design question for the plan, not an
   afterthought.

5. ⛔ **Out of scope — do not expand into these:**
   - **Re-enabling a disabled channel automatically.** Detection only. Automatic repair of an alerting
     path is a separate decision the owner has not been asked.
   - **Anything in `0284`'s scope.** Do not modify its probe or re-scope its target.
   - **The other residuals `0284` names** — the channel's own copy of the secret, delivery to a human,
     whether any monitor is attached to the channel. Each is separately uncovered and separately
     unfiled. Flag them; do not absorb them.

## Verification steps

1. The schema findings from step 1 are recorded in the worklog **with the evidence they came from**
   (the query run, the output shape) — not asserted from memory or from this brief.
2. The check reports **OK** against the channel in its normal, enabled state, in a real run on the box.
3. 🚩 **The check is seen to FAIL against a genuinely disabled channel** — not only against a test
   fixture. Deliberately disable the channel (or reproduce a disable), observe the check turn FAIL,
   observe the **dead-man's switch** page, then restore. ⚠️ **This is an owner-executed step and it
   takes live alerting down for the duration** — it must be supervised and short, exactly as `0284`'s
   owner steps are. A guard nobody has watched trip proves nothing.
4. The new `tests/profile-checks.sh` case covers healthy / disabled / unreadable, and each case is seen
   to **fail before the fix exists**, so the test is known to be able to fail.
5. `npm test` is green, and `tests/profile-checks.sh` prints its success marker.
6. The check performs **no write** against the monitoring stack's storage — demonstrated, not asserted.
7. No secrets, hostnames, IP addresses, chat ids or topic ids appear in the brief, the plan, the
   worklog, the script, the test, or any output either prints.

## Notes

- **Depends on:** [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  — ✅ **MET, 2026-09-18.** `0284` closed that day (`✅ Done (agent-closed — not owner-verified)`);
  the owner-executed drill ran and the marker / dead-man's-switch path this task reuses is **live and
  proven end to end**. ⇒ **This task is startable.** ⚠️ Startable ≠ started — `## Status` stays
  `🔲 Backlog`.
  ⛔ **Still do not touch `0284`'s status from here** — a *landed* `✅ Done` is the owner's alone to
  change, which is a stricter rule than the in-flight one it replaces, not a looser one.
  > · **earlier** (true when filed, false since 2026-09-18): *"— **NOT met.** It reuses that task's
  > marker / dead-man's-switch path, so it cannot start until `0284` lands. ⛔ **Do not touch `0284`'s
  > status from here** — it is in flight, driven from the lead session, and its close is owner-gated
  > on a drill that has not run."*
  🚨 **This task's reason for existing is UNCHANGED, and `0284` closing does not soften it.** `0284`
  catches the **cause**, not the **state**: an already-disabled channel still reads green and nothing
  detects it. If anything it matters **more** now that the rest of the path is live.
- **Blocks:** nothing.
- **Related:** [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) (built the relay;
  closed — its `✅ Done` is the owner's and is not this task's to revisit) ·
  [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) (the daily digest — the
  *other* half of "is the path alive", and **neither covers the other**).
- **Effort: UNKNOWN, and deliberately not estimated.** Step 1 is an investigation against an unverified
  schema. 🚩 **Investigation-first:** if step 1's findings materially change the shape, come back to the
  producer and re-scope rather than building against a guess. A small-looking check can become a
  different task once the schema is known.
- **Why this is one brief and not two** (a schema investigation + an implementation): the investigation
  is a few queries against a running box, not a body of work worth its own brief, plan and review — and
  splitting would put a hand-off between two steps that the same person will do in the same sitting.
  ⚠️ **The escape hatch is named in step 1:** if the schema turns out not to expose the state, this
  brief ends there and the implementation half never gets written.
- 🔒 No secrets, hosts, IPs, chat ids or topic ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
