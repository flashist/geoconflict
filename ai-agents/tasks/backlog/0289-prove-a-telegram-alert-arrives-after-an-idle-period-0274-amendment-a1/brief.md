# Prove a Telegram alert still arrives after an IDLE period — `0274` **amendment A1** (⛔ NOT alert rule A1)

## ID
0289

> ℹ️ **ID allocation, checked 2026-09-19 before filing.** No `0289` folder under
> `ai-agents/tasks/{backlog,done,cancelled}/` and no `## ID` hit. Highest existing ID was `0288`.

## Sprint
Sprint 5

### ➡️ MOVED FROM SPRINT 4 TO SPRINT 5 ON 2026-09-22 — OWNER RULING

**AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-22**, relayed by
`fkit-lead` to a spawned `fkit-producer` with **no owner channel of its own** (ADR-021). ⛔ **Not
producer precedent.** The owner, verbatim:

> *"Let's skip this type of chekups, I will take care of them after deploy. The only thing we should
> care about is to make sure the feature is switcheable (e.g. if the flag is not enabled or doesn't
> exist, the feature is not enabled), and that's it. You can move the tasks connected to checkings to
> the next sprint, so we do final checkups and figure out what's wrong with them after deploy."*

The owner was then shown a proposed list of four checkup tasks and chose **"Move all four"**:
[`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md),
[`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md),
`0289` and [`0061`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md).

**THE REASON, PLAINLY:** the final checkups happen **after the deploy**, when production can actually
be observed. ✅ **Consistent with, and not a re-decision of, the 2026-09-19 ruling** that already
deferred this task together with `0285` and `0219` G3/G4 as one monitoring bucket, and with the
2026-09-22 ruling that ratified its rank as `Low`.

⛔ **This ruling is a THIRD, SEPARATE thing from the two 2026-09-22 rulings already recorded in this
file — do not merge them.** Those settled **rank** (`Low`, ratified). This settles **board**. Neither
decided the other's question.

⛔ **The task FOLDER did not move** — it stays under `ai-agents/tasks/backlog/`. ⛔ **No mover skill was
invoked** — this is neither a close nor a cancellation. ⛔ **The `## Status` token is UNCHANGED
(`🔲 Backlog`)**, and so is `## Priority`: a change of board is not a change of state or of rank.

## Priority
🔴 **Low — OWNER-RULED 2026-09-22** *(ratified; was `High`, the producer's unratified append rank)*

⚠️ **AUTHORITY BEFORE FACTS.** **OWNER RULING given live in the `fkit lead` session on 2026-09-22**,
relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**: **"Rank them Low,
ratified."** Owner's stated reason: **it matches the priority they already set — the
monitoring/messaging track is deprioritized — and it clears the unratified flag so it stops appearing
as noise on every status read.** ⛔ **Not producer precedent — one ruling, three rows (`0285`, `0286`,
`0289`).**

⚠️ **RANK ONLY.** ⛔ **No `## Status` token was touched, no task file was moved between `backlog/`,
`done/` and `cancelled/`, and no mover skill was invoked.** A ratified rank is not a started task.

⚠️ The ruling is **consistent with the owner's 2026-09-19 ruling recorded below**, which deferred this
task together with [`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
and `0219` G3/G4 as one monitoring bucket.

~~⚠️ **Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.**~~
✅ **Flag cleared 2026-09-22 by the ruling above.** Kept struck, not deleted — it is the true record of
how this row was ranked until today. **The merit note still stands:**
**on merit this belongs directly below [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)**,
because it verifies the last unproven hop of the same alert path `0284` guards and `0277` built, and it
cannot run before both of those have landed — which they have. Appended at the bottom (ADR-035), not
inserted.

### ⚠️ The BOARD is the producer's call — ~~and so is the RANK~~ 🔴 **the RANK is OWNER-RULED as of 2026-09-22 (above)**. Read this before treating the board placement as an owner ruling

**What the owner ruled (2026-09-19, live in the `fkit lead` session via `AskUserQuestion`, relayed to a
spawned `fkit-producer`):** *file it as its own task.* **That is all.** The owner ruled that amendment A1
gets **its own task**. They ruled **nothing** about which board it sits on ~~or how it is ranked~~.
📌 **Amended 2026-09-22: the RANK is now owner-ruled (`Low`, above); the BOARD placement is still the
producer's.**
⛔ Not producer precedent — one ruling, one task.

**Producer's call: Sprint 4, appended, ~~High~~.** 🔴 **The rank is now `Low` by owner ruling
(2026-09-22, above) — the owner did overturn it; only the BOARD placement below is still the producer's.**
The reasoning is kept as the record of how it was ranked at filing time:

1. **Once `0274` closes, nothing else on any board owns this.** Amendment A1 exists today only as prose
   inside `0274`'s brief and `0284`'s (already closed). That is the exact hold-forever shape
   [`0061`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) demonstrated — it sat
   on the Backlog board from 2026-08-23 to 2026-09-17 because nothing forced a re-look. **Filing it is
   the owner's ruling; keeping it visible is why this row is on the sprint board.**
2. **It is the release's own premise.** `0274` exists on the ruling *monitoring before go-live*. An alert
   that is never shown to arrive after hours of quiet is the realistic shape of every real alert — it
   fires at 3am after nothing has happened all night. A monitoring stack that only works warm is not
   monitoring.
3. **It is cheap and it is runnable today.** No code. One throwaway monitor, one burst, a wait, a second
   burst — on a box that is already deployed with a live channel and a live rule.

**The tradeoff, stated honestly:** this adds a row to a board that is already long, and the honest
alternative placement was the **Backlog board**, where the adjacent
[`0288`](../0288-alert-rule-a4-p95-of-login-latency-over-750ms-for-10-min/brief.md) went **by owner
ruling**. The reason this one is ranked differently: `0288` is a **new alert rule that cannot be built
without traffic that does not exist**; this is a **verification of alerting that already exists and
already runs in production**. Different blockers, different urgency.

## Status
🔲 Backlog

## Owner
fkit-coder

⚠️ Plus an **owner step** — the idle wait and the observation of arrival are the owner's, watching
Telegram. No agent may record an arrival it did not see (`0219` precedent).

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
task and [`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)**,
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

⚠️ **Nothing about the amendment-A1 question changed.** Deferring *when* the drill is run does not
weaken *why* it is needed: a real alert firing after an idle period is still unproven, and the defect
still presents as silence.

---

## 🚨 READ FIRST — there are TWO different things called "A1" on `0274`, and they must never be conflated

| The name | What it is | Where it lives now |
|---|---|---|
| **Alert rule A1** | *Player-creation spike* — creations (both sources) > 300 per 10 min, held 20 min. **Deliberately DEFERRED** by an owner ruling of 2026-09-17, for want of login traffic; its metric is absent from the Uptrace picker because the counter has never been incremented. | `0274` owner step 3 / `plan.md` §7.5. **No task of its own.** |
| **Amendment A1** | *Does alert delivery still work after an IDLE period?* — the stale-connection question the §7.6 drill did not answer. | 📌 **THIS TASK.** |

`0274`'s brief warns about exactly this confusion. **This brief's title names the distinction so the two
can never be mixed up**, and every reference below says "amendment A1" in full. ⛔ **Nothing in this task
builds, arms, defers or touches alert rule A1.**

---

## Context

### The question, in plain terms

**Does a Telegram alert still arrive when the system has been quiet for hours?**

The suspected defect (`0061`) is a pooled network connection that dies while nothing is using it — a
proxy restart, or an idle / NAT timeout. The first send after that reaches a dead socket and fails at the
network layer. **The failure shows itself as silence**, which is indistinguishable from *nothing was
wrong*. ⇒ **A green single-alert drill proves the happy path and nothing about sustained delivery.**

**That is the realistic shape of a real alert:** it fires at 3am after nothing has happened all night.

### 🚨 Two near-misses that look like evidence and are NOT — neither discharges this task

**1. The `0274` §7.6 alert drill (2026-09-17) does NOT discharge amendment A1.**
It ran, and it **passed** end to end on a real metric alert that fired and then cleared by itself — the
owner confirmed both the 🚨 firing and the ✅ resolved arrived in the Telegram Alerts topic. ⛔ **But both
bursts were minutes apart on a WARM connection**, so the stale-connection case was never exercised. That
task's own worklog, its brief and
[`alert-delivery-runbook.md`](../../../knowledge-base/alert-delivery-runbook.md) all say so explicitly.
**A PASS on §7.6 is not a discharge of amendment A1.**

**2. 🚨 [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md)'s daily digest does
NOT discharge it either — and it is the closest thing, which is what makes it dangerous.**
It was **observed delivering on 2026-09-19 across a ~9.5 h gap** (deploy-time send 2026-09-18 21:34 MSK →
cron send 2026-09-19 07:00 MSK, both owner-read, both rendered correctly). That gap is far closer to a
cold connection than the drill's minutes-apart bursts. **But:**

> 🚨 **The digest goes to Telegram DIRECTLY. It never crosses the Uptrace relay and never crosses nginx's
> `/internal/` allowlist.** So it proves **Telegram is alive** — it does **not** prove that an **alert**
> would arrive. **That distinction is the whole point of amendment A1.**

⛔ **Do not record amendment A1 as discharged by the digest.** `0283`'s own worklog and
`alert-delivery-runbook.md` both carry this warning; **keep any wording added by this task consistent
with them.**

### 🚩 Which connection is actually idle — producer's reading of the code, NOT a verified claim and NOT an owner ruling

This is offered as a starting point for the plan, not as a finding. **Verify it before relying on it.**

- **`src/core/notifications/TelegramNotifier.ts:139`** holds a **module-level map of `ProxyAgent`s,
  reused for the life of the process**, with a comment saying exactly that. The **alert relay runs inside
  the long-lived profile server process**, so that pooled keep-alive socket persists for days. ⇒ **That
  is the socket that can go stale.**
- **`0283`'s digest is a separate short-lived CLI** — `npm run digest:name-changes` →
  `src/profile-server/sendNameChangeDigest.ts`, a fresh process per cron run. **A fresh process builds a
  fresh agent**, so the digest can never exercise a stale pooled socket, however long the gap between
  runs. ⇒ **This is the mechanical reason its ~9.5 h gap is weak evidence, and it is worth confirming.**
- **[`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)'s
  hourly probe may actively MASK an idle-path defect** on the monitoring→profile hop, because it keeps
  that hop's NAT/conntrack state warm every hour. **That is `0284`'s own residual 5, recorded by its
  author** — not a criticism invented here. The hop this task cares about is the one **beyond** the
  relay: relay → egress proxy → Telegram.

### ✅ What `0277` already shipped, and why this test is still needed

`0277` shipped the `0061` mitigation for all three consumers: **one retry** on a transport-level throw,
reporting `sent_after_retry` as a success distinct from `sent`
(`src/core/notifications/TelegramNotifier.ts`, around the retry block). **It has never been exercised in
production against a real stale socket.**

⇒ **This task is also the first production exercise of that retry.** Two outcomes are both informative:

- the alert arrives and the relay log shows **`sent`** ⇒ the socket was still good; the idle window was
  not long enough to prove anything, **say so rather than recording a pass**;
- the alert arrives and the log shows **`sent_after_retry`** ⇒ **the defect was real and the retry caught
  it** — the strongest possible result.

⚠️ **The retry is a mitigation, not a guarantee** — the code's own comment says so: if the egress proxy is
*down* rather than *stale*, both attempts fail.

### 🚨 Two standing constraints anything near this path must respect

1. 🚨 **The relay must NEVER answer `401`, `403` or `404`.** All three call Uptrace's
   `NotifChannelGateway.Disable` and **permanently and silently disable the notification channel** —
   every subsequent alert is dropped at the source, with no retry and nothing that reports it. Verified
   by disassembly of the shipped `uptrace/uptrace:2.0.2` binary (`0284`). **The relay answers `2xx` even
   to a wrong or missing secret, deliberately. Do not "fix" that into a 401.** The nginx `/internal/`
   allowlist answers `403` on a source-address miss — which is the live trap.
2. 🚨 **Uptrace monitors and channels are UI-only state.** `setup-telemetry.sh` seeds **no monitors and
   no channels**, so a box rebuild or a lost volume **silently deletes every alert rule** and nothing
   would tell you. Relevant here because **this test needs a live rule and a live channel to exist at the
   moment it runs** — confirm both before starting, and confirm **A5 (monitor id 9) is still active**
   after any throwaway monitor is removed.

### What the neighbouring tasks cover — and what they do not

| Task | What it watches | ⛔ What it does NOT cover |
|---|---|---|
| [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md) — hourly alert-path liveness probe | The path **to** the relay is reachable and the shared secret matches — probe → allowlist → route → secret check → marker → daily check → dead-man's switch. | **Nothing about Telegram delivery** (the marker is stamped on receipt, **before** any send) · nothing about whether a monitor is attached to the channel · **cannot see an already-disabled channel** (that is `0285`) · **⛔ does not discharge amendment A1**, and may mask it on its own hop. |
| [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) — daily digest at 04:00 UTC | **Telegram delivery is alive**, observed daily, including on a zero-count day (the absence of the message is the signal). | **Never touches Uptrace, the relay, or the `/internal/` allowlist** · **⛔ does not discharge amendment A1** — and a 403 could permanently disable the alert channel while the digest keeps arriving perfectly. |
| **This task** | **An alert, from the real alert path, after a real idle period, observed arriving.** | Everything else. It is one question. |

**Neither of the two covers the idle-alert case. A later reader must not think it is already solved.**

---

## What to build

⛔ **No source code is expected.** This is a live drill on already-deployed infrastructure. If the drill
fails, the fix is a separate matter and a separate decision — **do not fold a fix into this task without
an owner ruling.**

1. **A drill procedure, written down before it is run**, following the fixture the §7.6 drill proved
   works and the one `plan.md` §7.6 got **wrong**:
   - ✅ **Use the working fixture.** Junk-Bearer requests against the public read-only profile read —
     each is a `401` that increments `session_rejected` with reason `invalid`; **no writes, no rows, no
     restart** — with a throwaway `>0 / 1 min` monitor on that metric, attached to the live alerts
     channel. Stop the requests and let it **self-clear**.
   - ⛔ **Do NOT use `plan.md` §7.6's specified fixture** (*an always-true rule on
     `process.memory.rss > 1`, then delete it*). **It cannot pass**: an always-true rule never clears, so
     it proves only the 🚨 half, and **deleting a monitor is not a recovery event**, so no ✅ is ever
     produced. It was superseded on `0274` and is recorded there; `plan.md` is byte-frozen and was not
     edited.
2. **The idle window, and an honest statement of what it can and cannot establish.** See *How long is
   "idle enough"* below — **the sources do not support a measured threshold, and one must not be
   invented.**
3. **Fire → idle → fire again.** The **second** firing after the idle window **is the test**. The first
   firing exists only to put the relay's connection into the warm state the idle window then ages.
4. **Read the relay's own log for that second send** — `sent` vs `sent_after_retry` (see above). This is
   the difference between *the socket happened to survive* and *the defect was real and the retry caught
   it*, and the worklog must say which happened.
5. **Cleanup, verified.** Delete the throwaway monitor, then **confirm the monitor count is back to its
   pre-drill value and A5 (monitor id 9) is still active** — the §7.6 precedent.
6. **Record the outcome in the alert-delivery runbook.** That document's *What is still unproven* section
   currently carries the line that idle-period delivery is unproven; **update it to say what was actually
   observed — and, if the window was short, say that too.** ⛔ **Do not delete `alert-delivery-runbook.md`
   lines 56–59** (the warning that `0283`'s digest cannot catch an alert-path failure): observed delivery
   makes that warning **more** important, not less.

### How long is "idle enough" — and what the sources actually support

🚩 **Stated plainly rather than invented: no source in this project establishes a measured idle timeout
for this path.** `0061`'s reproduction was by **restarting the egress proxy**, not by measuring how long
an unused socket survives. So there is no evidence-backed threshold to cite.

**What the sources do give:**

- [`alert-delivery-runbook.md`](../../../knowledge-base/alert-delivery-runbook.md), *What is still
  unproven*: **"Fire once, wait 30–60 min, fire again — that second firing is the test."** That is the
  project's existing **working figure**, and it is the recommended starting point. ⚠️ **It is a working
  figure, not a measured threshold.**
- The longest real gap ever observed on any Telegram path here is **`0283`'s ~9.5 h** — but from a
  **different, short-lived process**, so it constrains nothing about the relay's pooled socket.

**Recommendation (producer's, not owner-ruled): a longer wait is strictly better evidence and costs only
elapsed time, not attention.** An overnight gap — fire in the evening, fire again in the morning — would
be the strongest result available and requires no extra work, just patience. ⚠️ **And the honest converse:
if the second alert arrives after a 30-minute wait, that bounds the claim to 30 minutes.** A pass at 30
minutes is a real pass and worth recording — **it is simply not a claim about overnight delivery, and the
worklog must not round it up into one.**

---

## Verification steps

1. **Pre-flight, recorded:** the alerts channel exists and is **not disabled**; **A5 (monitor id 9) is
   active**; the monitor count before the drill is written down. (Both are UI-only state — see the
   standing constraints above.)
2. **First alert fires and is observed arriving** in the Telegram Alerts topic — 🚨 firing, then ✅
   resolved on self-clear. ⛔ **Observed, not "the code returned sent".**
3. **The idle window elapses with no traffic on the alert path.** Worklog records the **actual wall-clock
   gap** — not the intended one.
4. 🚩 **The SECOND alert fires after that gap and is observed arriving.** ⛔ **This step is the task.**
   Steps 1–3 only set it up.
5. **The relay's log line for that second send is read and recorded** — `sent` or `sent_after_retry`, and
   which one it was.
6. **Cleanup verified:** throwaway monitor deleted, monitor count back to its pre-drill value, **A5 still
   active**, the alerts channel still **enabled** (⚠️ confirm this explicitly — a channel-disable is
   silent).
7. **The runbook is updated** to state what was observed, with the idle window's real duration and an
   explicit bound on what it proves. Lines 56–59 unchanged.
8. **⛔ If the second alert does NOT arrive: that is a finding, not a failed task.** Record it loudly,
   stop, and route the fix decision to the owner. Do not improvise a fix inside this drill.

---

## Notes

- **Depends on:** [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) (the relay and the
  channel — both landed, and it carries the `0061` retry this drill first exercises in production),
  [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  (the probe whose hourly warmth is a variable to account for — landed)
- **Blocks:** nothing.
- **Related:**
  - [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) — **where amendment A1
    came from.** It is `0274`'s §7.6 drill that this task strengthens. ⚠️ **`0274` also owns alert rule
    A1, which is a different thing — see the table at the top.**
  - [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) — the closest
    near-miss; **complements, does not cover.**
  - [`0061`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) — the source of the
    stale-connection hypothesis, **reproduced behaviourally in production 2026-09-17, NOT confirmed in
    code.**
  - [`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
    — the separate hole: a channel that is **already** disabled reads green everywhere.
  - [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) — the
    precedent this brief leans on twice: *a guard nobody has watched trip proves nothing*, and *an
    asserted arrival does not count*.
- **Effort:** small. **No code.** Owner elapsed time is dominated by the wait, not by attention — minutes
  of actual work at each end of the idle window.
- 🔒 **No secrets in any artifact** — no IP, hostname, port, chat id, topic id, bot token, DSN or ping
  URL, in this brief, the plan, the worklog or the runbook line. **Variable names and role names only.
  This file is tracked in git.**
- **Do not invoke the mover skills** — producer-only since ADR-033. Route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
