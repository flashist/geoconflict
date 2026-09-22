# Measure the game-prod egress IP and APPEND it to `PROFILE_INTERNAL_ALLOW_IPS` — `0217` Q4

## ID
0295

## Sprint
Sprint 5

## Priority
— *(unranked — the owner ruled the BOARD, not a rank; ⚠️ **unranked ≠ low**)*

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**FILED 2026-09-22** by a spawned `fkit-producer` with **no owner channel of its own** (ADR-021), on an
**OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`** and relayed by `fkit-lead`.
Shown that the weekend deploy slot's very first step depended on an **unanswered** open question —
[`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)'s **Q4**, the current game-prod
egress IP — the owner ruled, verbatim:

> *"Record as a task, add it to the Sprint 5, not the current Sprint 4."*

⛔ **Sprint 5, explicitly. Not Sprint 4, not the Backlog board.** ⚠️ **The owner ruled the action and the
board. They did NOT rule the rank, the owner field, or the method.** ⛔ **Not producer precedent.**

⚠️ **Sprint 5 is NOT the active sprint** — see the banner at the top of
[`plan-sprint-5.md`](../../../sprints/plan-sprint-5.md). Putting this here **schedules** it; it does not
start it.

> ## 🚨 THE SPRINT-5 PLACEMENT DOES **NOT** MEAN "SKIP IT THIS WEEKEND" — READ THIS BEFORE THE WINDOW
>
> 🚨 **THIS BRIEF CITES TWO DIFFERENT RULING SETS. READ THE NAMESPACE, NOT JUST THE LETTER.**
> **`RUNBOOK-E`** below is the **weekend-runbook** set. The bare **`RULING D`/`RULING E`** cited on the
> [Sprint 5 board](../../../sprints/plan-sprint-5.md) are the **sprint-plan** set — ⛔ **a different
> sequence, same letters, same date.** ⚠️ **`RULING E` (sprint set) moved `0030`; it has nothing to do
> with this task.** Full record and cause: the namespacing note at the top of
> [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md).
>
> **RUNBOOK-E** *(renamed 2026-09-22 from a bare `RULING E`; ⛔ label change only — content, authority
> and outcome unchanged)*, **an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
> 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021). ⛔ **Not producer precedent.** Put to them that the **board** (Sprint 5, deferred) and the
> **need** (the weekend window's very first step depends on it) were in tension, the owner chose
> **"You measure it at W0 anyway."**
>
> **THE SPLIT, and it is the whole point of this note:**
>
> | Half | Where it lives | When |
> |---|---|---|
> | **The MEASUREMENT itself** | **W0 prep of the weekend deploy window** | 🚨 **The day before the window — the OWNER runs it.** The window depends on it. |
> | **The TASK** — choosing and **recording the METHOD**, and the allowlist edit it governs | **Sprint 5**, this brief | Later, as scheduled. **This brief then records what they found.** |
>
> ⛔ **DO NOT MOVE THIS TASK OFF SPRINT 5.** The placement is the owner's and is not in question.
>
> 🚨 **AND DO NOT READ THE PLACEMENT AS PERMISSION TO SKIP THE MEASUREMENT.** That misreading is exactly
> what would leave **W3 of the weekend window running on a JUNE-DATED allowlist** — and the cost of a
> wrong entry is **403 on every credit call, indistinguishable from "working"**, with XP **lost, not
> queued**. ⚠️ **Nothing would tell you.**
>
> 📌 **Mirrored at the runbook's W0.1**
> ([`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md)), so the
> split is visible from **both** ends and neither document can be read alone to the wrong conclusion.

### Why this is open at all, stated honestly

`0217` § *What to build* 3 requires the **current** game-prod egress address and says it *"must be
measured, not assumed"*. The value pinned in `example.env.profile:33` is from **June**. The brief itself
calls this *"an open question for the owner (Q4) if it cannot be measured directly."*

- 🚩 **`fkit-lead` could NOT measure it on 2026-09-22: the prod host is not in any readable env file.**
- ⚠️ **Context, and explicitly NOT a verified current fact:** a measurement earlier the same day
  **reportedly matched** the live allowlist. ⛔ **It was NOT re-verified, and it was NEVER written into
  any brief** — which is exactly why this was still an open conflict when the weekend runbook was
  written. ⛔ **Do not treat that report as evidence, and do not close this task by citing it.**

### 🚨 THE TRAP — read this before touching the variable

**`PROFILE_INTERNAL_ALLOW_IPS` is a comma list serving TWO unrelated callers, and it is NOT
persist-or-reuse.** Both halves are repo-verified:

| Caller | Why it is in the list |
|---|---|
| The **game server**, for `/internal/v1/players/resolve` and `/internal/v1/credit` | `0217` § *Barrier 2* |
| The **monitoring box**, for the alert webhook and `0284`'s hourly liveness probe | `alert-delivery-runbook.md:21` — the relay route is mounted under `/internal/` **SOLELY** to inherit this allowlist |

🚨 **REPLACE the value and you drop the monitoring box.** `alert-delivery-runbook.md:39` records that
the nginx allowlist answers **403** on a source-IP miss, and that a `401`/`403`/`404` **permanently
disables the notification channel** — verified from the shipped binary. Every later alert is then
dropped at source, **forever, with no retry, and nothing tells you.** **Fixing the address afterwards
does not undo the disable; the channel must be re-enabled by hand in the monitoring UI.**

⇒ 🚨 **APPEND. NEVER REPLACE.**

🚩 **Second half of the same trap: the variable has NO on-box persistence.** `setup-profile.sh:122`
defaults it to empty, and an empty value renders a bare `deny all` — **403 for everyone**: every credit
call **and** the alert channel. The deploy warns loudly when it is empty
(`setup-profile.sh:1873`), **but the warning is the only guard.** ⇒ **Every profile deploy must carry
the full list**, including any deploy where other variables are deliberately blank.

### What a wrong answer costs

🚨 **403 on every credit call, indistinguishable from "working" at the game server** — *"A 401 and a 403
are indistinguishable from 'working' at the game server, because the client never surfaces either"*
(`0217` § *Barrier 2*). **A dropped credit is LOST, not queued.** Nothing retries it and no player-facing
symptom appears.

## What to build

**Two things, and the second is as load-bearing as the first.**

1. **MEASURE the current game-prod egress IP** — the address the game production box presents when it
   makes an **outbound** call to the profile box. ⛔ **Measured, not assumed, and not inherited from the
   June pin.**
   - 🚨 **BY RUNBOOK-E** *(the runbook set — ⛔ **not** the sprint plans' `RULING E`, which moved `0030`)*
     **, THIS HALF HAPPENS AT THE WEEKEND WINDOW'S W0 — the owner runs it, the day
     before the window, whatever this task's sprint says.** ⇒ **If you are picking this task up
     afterwards, the measurement may ALREADY EXIST** — check the runbook's W0.1 and the owner's W0
     record first, and **record what they found and how** rather than re-measuring blind.
     ⚠️ **If no W0 record exists, the measurement is still owed and is still yours.**
   - ⚠️ **No brief defines the method.** This task owns choosing one and writing it down. The natural
     shapes: read it from the profile box's own nginx/access record for a request the game box
     demonstrably made, or have the game box report what it sees outbound. **Whoever picks this up
     decides; put the choice to the owner if it needs a credential or a console session.**
   - ⚠️ **A DNS record resolving proves nothing about which address the box EGRESSES from** — inbound
     and outbound addresses are not the same question, and NAT can separate them.
2. **RECORD THE METHOD — ⛔ NEVER THE ADDRESS.** `0217` verification step 7 requires the worklog to state
   **how** the current egress IP was established. 🔒 **The address itself goes only into the gitignored
   profile env file and onto the box. It must not appear in this brief, the worklog, any report, any
   knowledge-base page, any wiki page, or any commit.**
3. **APPEND it to `PROFILE_INTERNAL_ALLOW_IPS`** in the gitignored profile env file — **appending to the
   existing list, keeping the monitoring box's entry**, per the trap above. Then the profile box needs a
   deploy for it to take effect (`0217` step 3's *"redeploy the profile box"*).

## Verification steps

1. **The method is written down and is repeatable by someone else** — a named procedure, not *"we
   looked."* `0217` verification step 7.
2. 🔒 **No address anywhere in a tracked artifact.** Grep your own worklog before you finish. ⛔ **This is
   the check most likely to be skipped and it is not optional.**
3. **The resulting list still contains the monitoring box's entry.** ⛔ **Prove it was APPENDED, not
   replaced** — state the entry **count** before and after, never the entries.
4. **After the deploy carrying the new list, re-run `0276`'s probe set** (eleven read-only `curl`
   probes): **403 from a non-allowed host on every one**, and **401 from the allowed game box**.
   🚨 **That 401 is the one that matters** — it proves the request passed the allowlist and reached
   `internalAuth`, so afterwards **a 403 is the allowlist and a 401 is the token.** Without that
   baseline a failure is not diagnosable.
5. **The alert channel still works after the deploy** — ⚠️ **do not assume it.** A 403 would have
   disabled it silently and permanently; confirm delivery rather than confirming the config.

## Notes

- **Effort:** small-to-medium, **dominated by the measurement question, not the edit.** ⛔ Do not quote a
  figure until the method is chosen.
- **Depends on:** nothing in code. ⚠️ **It needs access the agents do not have** — `fkit-lead` could not
  read the prod host from any env file, so this likely needs the owner or a session with box access.
- **Blocks:** [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) step 3's
  *"redeploy the profile box"* cannot honestly be called done while the pinned value is the June one.
  ⚠️ **It does not block crediting from being switched on** — it blocks knowing whether it will work.
- **Answers:** `0217`'s **Q4**, and closes the weekend runbook's **C3** and **G2**.
- **Related:** [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  (the 403-disables-the-channel finding),
  [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md) (the
  probe set reused in verification step 4), [`0294`](../0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)
  (another deferred profile-deploy proof — ⚠️ **if both are run, run them on ONE deploy, not two**).
- 📌 **Sprint placement is the OWNER's, recorded verbatim above.** ⛔ Do not move it to the Backlog board
  or back to Sprint 4 without a new ruling.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets, endpoints, hostnames or IP addresses in any artifact** — variable names and file names
  only.
