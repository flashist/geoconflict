# Detect an **already-disabled** Uptrace notification channel — read the monitoring stack's own channel state

## ID
0285

> ℹ️ **ID allocation, checked 2026-09-18 before filing.** `0285`: no folder under
> `ai-agents/tasks/{backlog,done,cancelled}/`, no `## ID` hit in any `brief.md`, no repo-wide hit
> outside `ai-agents/wiki-vault/log.md` line numbers (which are not IDs). Highest existing ID was
> `0284`. `0286` was checked at the same time and is also free — **not** allocated here; see *Notes*.

## Sprint
Sprint 4

## Priority
Medium *(producer's rank — NOT owner-ruled)*

⚠️ **Append rank, NOT a merit ranking.** Appended at the bottom of the Sprint 4 table, nothing
inserted and nothing renumbered (ADR-035). **On merit this belongs directly below**
[`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md),
whose hole it closes and whose marker path it reuses.

### ⚠️ Board AND rank are the PRODUCER'S CALL — they are NOT owner rulings. Read this before treating either as one.

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
filed**. Board and rank remain unruled.

**Producer's call: Sprint 4, appended, rank Medium.** Reasoning, so the owner can overturn it in one
edit:

1. **It belongs beside the thing it completes.** `0284` is on this board and ✅ **closed 2026-09-18**
   (· earlier, when this was written: *in flight on this board right now*), and is
   explicitly documented as catching *the cause, not the state*. Filing the state half on the Backlog
   board would let Sprint 4 close with the alerting path nominally guarded and a named,
   already-written-down hole left open with nothing forcing a re-look.
2. **The Backlog board has a demonstrated hold-forever failure mode.**
   [`0061`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) sat there from
   2026-08-23 to 2026-09-17 because nothing forced a re-look — the same precedent `0283`'s and
   `0284`'s briefs both cite against themselves.
3. **Why Medium and not High, stated honestly** — three reasons, and each one is a real argument for
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
  [`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md) (the daily digest — the
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
