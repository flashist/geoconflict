# Alert-path liveness probe — a webhook `403` permanently and silently disables Uptrace alerting

## ID
0284

> ℹ️ **ID allocation, checked 2026-09-17 before filing.** `0284`: no folder under
> `ai-agents/tasks/{backlog,done,cancelled}/`, no `## ID` hit. Highest existing ID was `0283`.

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md)**,
because it guards the exact relay `0277` builds and cannot start before it. Appended at the bottom
(ADR-035), not inserted — closed rows sit below the merit position.

### ⚠️ The BOARD is the producer's call too, and it is NOT an owner ruling — read this before treating it as one

**What the owner ruled (2026-09-17):** *file it, build it after `0277`.* **That is all.** The owner
ruled the **requirement** and the **ordering**. They did **not** rule which board it sits on.

**Producer's call: Sprint 4, appended.** Reasoning, so the owner can overturn it in one edit:

1. **The exposure window opens inside Sprint 4.** `0277` is in flight on this board right now. The
   moment its relay is mounted behind the `/internal/` allowlist, the silent-permanent-death mode
   described below is live. Filing this on the Backlog board means Sprint 4 would close with `0274`'s
   alert rules nominally shipped and **killable by one address change, with nothing to notice**.
2. **The failure is unbounded, not one missed message.** A single `403` disables the channel for
   **every future alert**, permanently, with no retry and no log anybody reads.
3. **The Backlog board has a demonstrated hold-forever failure mode.**
   [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) sat there from
   2026-08-23 until 2026-09-17 because nothing forced a re-look — the same precedent
   [`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md)'s brief names against itself.
4. **The cost is small enough to fit behind `0277` in the same sprint** — see *Effort*.

**The tradeoff, stated honestly:** this adds a row to a board that already carries 24 open rows, and it
**cannot start until `0277` lands**. If Sprint 4 closes before `0277`'s relay is deployed and observed,
this row carries forward unstarted. **The alternative placement was the Backlog board**, which is where
`0283` went for exactly that reason. Reasons 1–3 above are why this one is ranked differently from
`0283`: `0283` adds a *beat*; this one closes a *hole that eats every alert*.

## Status
✅ Done (agent-closed — not owner-verified)

⚠️ **Closed 2026-09-18 by a spawned `fkit-producer`. The marker is agent-closed because a spawned producer
has no owner channel (ADR-033 §5) — and the record must say plainly what the marker cannot:** the **owner
personally executed every deploy and every drill step**, and **confirmed the page by screenshot**. That is
unusually strong evidence for an agent-closed close. ⛔ **The marker is NOT upgraded** — only an owner-present
producer session may do that — but nothing below was taken on an agent's word.

✅ **THE HARD CLOSE GATE IS DISCHARGED — it was satisfied, not waived.** The owner's ruling of 2026-09-18
(*the drill is a hard gate; this task must not close before it runs*) stands met: a drill ran, owner-executed,
and **it passed**. The reviewer's objection the owner accepted — *"a guard not yet known to guard"* — no longer
holds: the guard has now been watched to fail, page a human, and recover. ⛔ Not precedent — one ruling, one task.

**What was built.** An hourly probe from the telemetry box crosses the same allowlist, location, route and shared
secret a real alert crosses; the relay stamps a marker **on receipt — after the secret check, before any send**;
`profile-checks.sh` reads the marker's age on its existing daily run; stale or missing ⇒ FAIL ⇒ the **external
dead-man's switch**, a path that touches neither Uptrace nor Telegram.

**Review.** Round 1: `fkit-reviewer`'s own pass **plus a Codex adversarial pass — coverage FULL, no degradation.**
Five findings, all verified CORRECT, **all fixed** — two under standing approval (a non-string `probe` value could
drop a real alert; the "secret never on a curl argv" harness guard was line-oriented and a planted leak passed it),
three owner-ruled (enforce the token constraint at deploy time; give the probe a distinguishable reply; fix the
future-date hole in the pre-existing checks too). **Two further checks fixed on a later owner ruling**, after a full
sweep of every age computation in `profile-checks.sh`: six found, five now guarded, one already safe, **no seventh**.

**Gates — LEAD-VERIFIED on an independent run, not taken from the worker:** `tsc` clean · `npm test` **137 suites /
1853 tests, 0 failed** · `tests/profile-checks.sh` **118 passed, 0 failed** · hardening harness **ALL PASS** ·
`check:config-parity` REQUIRED 0 on all three pipelines. No supertest flake, no `SIGSEGV`, nothing re-run.
`plan.md` byte-frozen throughout (`d596cf3d78d9bbb4147d28c5b5df7964702a0b53`, 25396 B).

### Deployed and observed, 2026-09-18 — all owner-executed

**Deploy.** The owner ran `npm run deploy:profile` and `npm run deploy:telemetry`. Lead-verified on the boxes:
both profile containers **healthy**; the alerts bind mount **present** and its directory `drwx------ root root`;
`check_alert_probe` present in the deployed `checks.sh`; `/health` and `/ready` both **200**. On the telemetry
box: the probe's env file **0600**, the probe script **0700**, both values present, and the hourly cron line
installed after the certbot line.

**First probe, owner-run by hand: exit 0.** ⚠️ That exit code is only meaningful **because of review finding
R3** — before that fix the probe returned 0 for any 2xx, including the relay's deliberate accepted-but-dropped
reply.

**Marker written, lead-verified 19 s later** — 94 bytes, `-rw-------`, `schema 1`, a `finished_at` timestamp and
the probe's source key. The marker is stamped **only after the secret check**, so its existence proves the secret
matched.

**The check flipped to OK**, owner-run: `OK alert-path-probe: the monitoring box reached the alert webhook 0h ago
(max 3h) — reachability only, NOT proof that a Telegram message arrived` · `RESULT: 11 ok, 0 failed`.

### 🚩 THE CENTRAL ASSUMPTION IS PROVEN — AND NOT BY THE DRILL

This brief and the reviewer both recorded that *"no code and no test can establish"* whether the probe's egress
address and a real alert's are the same, and assigned the question to the drill. **The nginx access log had
already recorded both sides.** Lead-read on the box, at the webhook route: the host-cron **probe**
(`curl/8.5.0`, 200) and **four real monitoring-stack calls** (`Uptrace/1.0`, 202 — including the fired and
resolved events of the 2026-09-17 alert drill) **all arrive from the same source address.**

⇒ **Host cron and the containerised monitoring stack share one egress.** Recorded as **observed evidence**, and
**how it was found matters as much as what it says: a read-only log query answered what a destructive drill was
scheduled to answer.**

### The drill that ran — REDUCED, owner-ruled, and it PASSED

**OWNER RULING 2026-09-18**, live in the lead session via `AskUserQuestion`: offered full drill / **reduced
drill** / close on the log evidence alone, the owner chose the **reduced drill** — exercise the alarm path, but
**do NOT deliberately disable the notification channel**. ⛔ Not precedent. The lead reduced it further, and said
so: editing the allowlist to prove a `deny all` path **already visible in the logs** would itself risk creating
the silent outage this task exists to prevent.

Owner-executed, in order:

1. Marker moved aside → checks run → **`FAIL alert-path-probe: no alert-path probe marker at all (max 3h)`**,
   `RESULT: 10 ok, 1 failed`, `ping: /fail delivered with 1 reason(s)`.
2. **The external dead-man's switch paged the owner by email** — *"New incident started —
   profile-daily-checks"*, 12:08 MSK (09:08 UTC). **Owner-confirmed by screenshot.**
3. Marker restored → `11 ok, 0 failed` · `ping: success delivered` → **the incident auto-resolved** (second
   mail, owner-confirmed).

⇒ **Every hop of the chain now has evidence:** probe → allowlist → route → secret check → marker → daily check →
dead-man's switch → the owner's inbox.

⚠️ **State exactly what was NOT exercised.** The drill hit the **missing-marker** branch, **not** the
**stale-marker** branch — both end in the same `fail()` and the same ping, so the alarm path is identical, but
only one of the two was run. Also **not** exercised: deliberately removing the address from
`PROFILE_INTERNAL_ALLOW_IPS`, and observing a real alert disable the channel — **that remains
binary-disassembly evidence, not observation.**

### ⚠️ Residuals that SURVIVE this close — all eight

1. **It catches the CAUSE, not the STATE.** An already-disabled channel reads green. **Filed as `0285`.**
2. It does **not** check the secret the monitoring stack's own channel config holds — a separate copy from the
   cron's.
3. It proves **nothing about Telegram delivery**: the marker is written on receipt, **before** any send.
   [`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md) is that half.
4. It does **not** prove any monitor is attached to the channel.
5. **It does not discharge [`0274`](../../backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md)
   amendment A1** (delivery after an idle period) — and ⚠️ an hourly probe may actively **mask** an idle-path
   defect on that hop.
6. Detection latency **~3–27 h, owner-accepted 2026-09-18**.
7. 🔭 **Open and unruled:** `check_cert_expiry` computes no age of its own, so it has no negative-age branch to
   guard — but it is **clock-trusting** in a related way: a box clock running *behind* makes a certificate look
   fresher than it is. Different defect class; surfaced by the coder, **never ruled on**.
8. `npm run check:config-parity` does **not** reach telemetry variables — the hardening harness is the only
   guard there.

· earlier: 🚧 Blocked — code complete and reviewed; waiting on the owner's egress drill, which was ruled a **hard
close gate** (owner, 2026-09-18) and has now been discharged by the reduced drill above · earlier: 🔄 In progress —
driven from the lead session (`/fkit-sprint-ship-loop`), plan approved by the owner 2026-09-18 · earlier: 🔲 Backlog

## Owner
fkit-coder

⚠️ Plus **owner steps** — the cron install and the deploy are the owner's, and the guard must be seen
to actually FAIL once (see *Verification steps* 4). A guard nobody has watched trip proves nothing
(`0219` precedent).

## Context

**Filed 2026-09-17 by a spawned `fkit-producer` on an OWNER RULING given live in the lead session and
relayed by `fkit-sprint-ship-loop`.** The producer had **no owner channel** — the requirement and the
ordering (*"build it after `0277`"*) are the owner's; the board and the rank are the producer's (above).

### The defect — VERIFIED by disassembly, not theorised

The architect disassembled the shipped `uptrace/uptrace:2.0.2` binary (DWARF-assisted, **not** a
strings scan). The finding:

> **A `401`, `403` or `404` reply from a webhook endpoint calls `NotifChannelGateway.Disable`.**
> `notifyChannel` then refuses to send unless the channel state is `"delivering"`.

⇒ **Every subsequent alert is dropped at the source — permanently, silently, with no retry.** Not a
failed delivery: a **disabled channel**. Nothing re-enables it but a human in the Uptrace UI, and
nothing tells that human it happened.

### Why this project is exposed, specifically

`0277`'s relay is mounted behind the profile box's nginx `/internal/` allowlist, and that allowlist
**returns `403` to a source address that is not on it**. So:

> If the telemetry box's egress address ever **changes**, is **mistyped**, or is **dropped from
> `PROFILE_INTERNAL_ALLOW_IPS` at a deploy**, the **very first alert after that moment disables
> alerting forever**, and nothing reports it.

That is three ordinary operational events, each of which has precedent in this project, turning
monitoring off for good.

**The owner accepted this knowingly** — ruling B, 2026-09-17: keep the allowlist, and *"save
information about it somewhere in the docs, that if IPs change we need to take care of it."*
**This task is the mechanical half of that acceptance.** The docs half is *What to build* step 4.

### 🚨 What does NOT cover this — all three, because each one looks like it might

The architect was asked for the cheapest guard and **refused to invent one**. These are its findings,
and they are the valuable part of this brief:

**1. `profile-checks.sh` cannot assert the allowlist — and must not pretend to.**
The only value it could compare the deployed `allow` directives against is the one `setup-profile.sh`
wrote from `PROFILE_INTERNAL_ALLOW_IPS` **in the same deploy** — *a value compared with itself*. It
would report a confident `OK` while the real address had moved.
⛔ **A guard that cannot fail for the reason you built it is worse than none**, because it answers the
question a reader would think to ask. Do not add this check.

**2. `setup-profile.sh` already prints the allowlist at deploy** (since `0276`). Free, correct, keep
it — but it guards **nothing between deploys**, and the address can move without a deploy.

**3. 🚨 [`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md)'s daily digest does NOT
cover this, and is ACTIVELY MISLEADING about it.**
The digest is produced on the box that already holds the data and sent **straight through the Telegram
helper**. It **never touches Uptrace**, **never crosses the `/internal/` allowlist**, and **never
arrives from the telemetry box's egress address**. (Which box runs it is still `0283`'s own open design
question — the point holds either way, because neither candidate is the telemetry box.)
⇒ **The owner would receive a daily message confirming "the bot works" while alerts were dead.** That
is worse than no heartbeat at all. **This is cross-referenced in `0283`'s brief** so nobody later reads
that digest as covering alert delivery.

### Also recorded — the evidence already exists and nothing reads it

**Uptrace persists every notification attempt's response status.** A run of `403`s therefore sits on the
telemetry box, already written down, **unread**. This is the same shape as
[`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md): the signal
exists, nothing looks at it. Whether reading that store is a cheaper guard than the probe below is
**not** settled here — the probe was chosen because it exercises the **whole path**, not just Uptrace's
own opinion of it.

## What to build

⛔ **This design is the architect's recommendation, carried here deliberately. Do not re-design it in
the plan** — refine the mechanics, keep the shape.

1. **A scheduled synthetic probe FROM the telemetry box to the relay route.**
   - It must originate from the **real egress address**, so it traverses **the same allowlist, the same
     nginx location, the same route and the same shared secret** a real alert traverses. ⚠️ **That is
     the entire point, and it is precisely why the self-comparison in *Context* (1) fails and this does
     not.** A probe run from anywhere else is worthless.
   - One cron line on the telemetry box, plus **one non-secret key** so the relay can tell a probe from
     a real alert. ⛔ **No second Telegram client, no second proxy variable, no second secret** — the
     same constraint `0277` carries.
2. **The relay writes a marker on receipt** (~10 lines). Follow the marker shape `profile-checks.sh`
   already reads — a flat JSON file with a `finished_at`-style timestamp, the same form
   `last-backup.json` and `last-smokecheck.json` use, so the existing `json_field` reader works
   unchanged. ⚠️ **The probe must NOT cause a Telegram send** — it proves the path *to* the relay, not a
   message to a human.
3. **A marker-age check in `profile-checks.sh`** (~15 lines) — same shape as the existing daily-backup
   and cert-renewal checks: an env-overridable `MAX_*_AGE_HOURS` default (the existing checks use
   `26`/`13`), `ok`/`fail` through the existing helpers, so a stale marker **FAILs to the external
   dead-man's switch**. ⚠️ **That escalation path depends on neither Uptrace nor Telegram** — which is
   the second reason this design works where the alternatives do not.
4. **The docs half of the owner's acceptance** — one runbook line under `ai-agents/knowledge-base/`:
   *if the telemetry box's egress address changes, `PROFILE_INTERNAL_ALLOW_IPS` must be updated in the
   same change, or alerting dies silently and permanently.* **Variable names only.** ⚠️ If `0277`'s
   runbook line already carries this, **extend it — do not write a second one.**
5. **One case in `tests/profile-checks.sh`** for the new check (fresh marker → OK, stale marker → FAIL,
   missing marker → FAIL). That harness is in `npm test` and is the only gate that script has
   (`0219` precedent).

### Owner steps

1. **Install the cron line on the telemetry box** and deploy the relay change to the profile box.
2. **Watch the guard trip once, deliberately** — see *Verification steps* 4.

## Verification steps

1. **The probe reaches the relay from the real egress address and the marker advances.** Observed on
   the boxes, not asserted in a test. Worklog records the date. ⛔ **No IP, no hostname, no port, no
   token.**
2. **`profile-checks.sh` reports OK with a fresh marker**, in its normal daily run.
3. **A stale marker FAILs** — proved by the new `tests/profile-checks.sh` case (fresh / stale /
   missing), and `npm test` green including the shell harnesses.
4. 🚩 **The guard is seen to FAIL for the real reason, once, on the real boxes.**
   ⚠️ **WHAT ACTUALLY RAN WAS A REDUCED DRILL — owner-ruled 2026-09-18. Read the Status section above before
   reading this step as satisfied as written.** The allowlist was **not** edited and the channel was **not**
   deliberately disabled; the egress question this step existed to answer was settled instead by the nginx access
   log, which had already recorded the probe and four real monitoring-stack calls arriving from the **same**
   source address. The step as originally written stands below, unedited, for the trail.
   Temporarily remove the
   telemetry box's egress address from the allowlist (or point the probe at a route that will `403`),
   confirm the marker stops advancing, and confirm `profile-checks.sh` FAILs and the **dead-man's
   switch pages**. Then restore. ⛔ **This step is the task.** Steps 1–3 prove the plumbing; only this
   proves the guard can fail for the reason it exists.
   ⚠️ **After the deliberate `403`, the Uptrace channel will be DISABLED** — that is the defect, working
   as documented. **Re-enable it in the Uptrace UI and confirm alerting is live again before closing**,
   and record that re-enable step in the runbook line from *What to build* step 4. Anyone running this
   drill without knowing that turns alerting off and walks away.
5. **`npx tsc --noEmit` and `npm run lint` exit 0**; `npm run check:config-parity` clean for any new
   variable it covers. ⚠️ It does **not** reach telemetry variables (`scripts/check-config-parity.mjs`
   covers `game` / `profile` / `client` only) — the shell harness is the only guard there, the same
   residual `0277` records.
6. **The probe does not send a Telegram message**, and the real alert path still does — regression check
   against whatever `0277` shipped.

## Notes

- **Depends on:** [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md) — the relay route must
  exist before anything can probe it. **The owner ruled the ordering explicitly (2026-09-17): build
  this after `0277`.** ✅ **SETTLED 2026-09-17 — `0277` SHIPPED THE WEBHOOK-RELAY BRANCH (branch B),
  so THIS BRIEF'S PROBE TARGET STANDS. Do not re-scope it.** The relay route exists and is deployed on
  the profile box; a live *Test channel* press returned **202** and the message arrived. *(Kept for the
  trail: until that close, `0277`'s branch was still decided by its own step-0 proof, and branch A —
  Uptrace's own notifier, no relay route — would have changed the probe target and forced a re-scope.
  Branch A did not ship.)* ⚠️ Recorded 2026-09-17 by a spawned `fkit-producer` closing `0277`; a
  statement of fact about what shipped, **not** an owner ruling and not a change of this task's scope.
- **Blocks:** nothing.
- **Related:**
  - [`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md) — ⚠️ **complements, it does
    not duplicate.** This task proves the alert path is **reachable**; `0283`'s daily beat proves
    **Telegram delivery** is alive. **Neither covers the other half**, and the marker here is written
    **on receipt, before any send** — so this task says nothing about whether a message reached a human.
    Anyone treating one as covering both has re-opened the hole. *(The reverse direction — that `0283`
    is actively misleading about alert delivery — is recorded in `0283`'s own brief.)*
  - [`0274`](../../backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) — owns alert rules
    A1–A6, which are what dies when the channel is disabled.
  - [`0276`](../0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
    — added the deploy-time allowlist print referenced in *Context* (2).
  - [`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) — the
    "the signal exists and nothing reads it" precedent this repeats, and the source of the
    `profile-checks.sh` + dead-man's-switch shape reused here.
- **Effort:** small — the architect's estimate is ~10 lines in the relay, ~15 in `checks.sh`, one case
  in `tests/profile-checks.sh`, one cron line and one non-secret key on the telemetry box. **The drill
  in *Verification steps* 4 is the part that costs owner time, not the code.**
- 🔭 **Possible upgrade, NOT the primary — recorded so it is not re-litigated:** an **always-firing
  Uptrace monitor** as the liveness source. **Rejected as primary because whether 2.0.2 re-notifies a
  *continuously* firing alert on a schedule is UNVERIFIED** — so it could sit there never firing, which
  is the same silent defect it exists to catch. **Revisit only once that re-notify interval is settled
  by evidence**, and even then as an addition, not a replacement for a probe that crosses the allowlist.
- 🔒 **No secrets in any artifact** — no IP, hostname, port, chat id, topic id, bot token, DSN or ping
  URL, in this brief, the plan, the worklog, a test fixture or the runbook line. **Variable names and
  role names only. This file is tracked in git.**
- **Do not invoke the mover skills** — producer-only since ADR-033. Route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
