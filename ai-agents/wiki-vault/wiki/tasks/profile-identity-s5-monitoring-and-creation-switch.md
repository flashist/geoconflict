# Profile Identity S5 — Monitoring, Alerting and the Creation Switch

**Source**: `ai-agents/tasks/done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0274` / profile-identity epic `0266`, slice **S5** (last of S1–S5)

> 🆕 **Page added 2026-09-19 by the wiki, closing a gap: `0274` was closed and had NO vault page** while
> its siblings S1 ([[tasks/profile-identity-s1-database-rekeying]]) and S2
> ([[tasks/profile-identity-s2-login-and-session-token]]) both had one.
>
> ✅ **CLOSED 2026-09-19** as `✅ Done (agent-closed — not owner-verified)`, by a spawned `fkit-producer`
> **on an owner ruling given live in the `fkit lead` session via `AskUserQuestion`** and relayed by
> `/fkit-sprint-ship-loop`. The owner was shown that the three remaining owner steps were discharged, was
> offered *close now (agent-closed)* / *owner-verifies first* / *leave open*, was told plainly that a
> spawned producer has no owner channel (**ADR-021**) and therefore writes the agent-closed marker, and
> **chose "Close it now"**. ⛔ **The marker stays: no human verified this work, and only the owner may
> upgrade it.** ⛔ **Not producer precedent — one ruling, one task.**
>
> 🔴 **THIS CLOSE DOES NOT MEAN "MONITORING IS DONE". It carries named, accepted gaps** — see
> *Outcome → The accepted gaps* below, and read all six.

## Goal

Stand up monitoring for the profile server **before** citizenship/XP go-live, so that an abuse or
runaway-growth incident is detected in **minutes, not days**, plus a switch to stop new player creation
and a runbook to clean up junk rows.

Filed 2026-09-15 on **owner rulings** (`AskUserQuestion`, lead session, relayed by `fkit-lead`):
monitoring **"Yes, before go-live"**; alerts by **"Email"**; **no per-IP rate limit on login** —
monitoring replaces it, and junk profile rows are the owner-accepted, monitored risk. The architect
placed monitoring as its own fifth slice.

**Why before go-live, in the brief's own numbers:** a scripted 100 req/s writes ~3–4 GB/day against
~48 G free on the box ⇒ roughly **12–16 days of runway**. Before this task the profile server had **no
OTEL at all** — only the daily `profile-checks.sh` dead-man's switch from `0219`.

**Source of truth:** `ai-agents/knowledge-base/reports/2026-09-15-profile-identity-design.md` §6 and §9
row **S5**, and [[decisions/adr-113-internal-player-id]].

## Key Changes

- **`src/profile-server/Telemetry.ts`** — an OTEL metrics exporter reading `OTEL_*` env directly, with
  **its own minimal setup** — ⛔ **never `src/server/Logger.ts`**, matching the profile server's standing
  rule. Emits the `geoconflict.profile.*` metrics: login requests by outcome, players created by source,
  HTTP duration, session rejections, tenure claims, DB pool waiting, players total (a 5-minute estimate),
  process CPU and memory. ⛔ **Never a platform user id, player id or token in an attribute or a log
  line.**
- ⛔ **`reason=legacy_fallback_used` is deliberately ABSENT from the session-rejection metric — do not
  re-add it.** Ruling **D1** on `0273` (owner, 2026-09-16) deletes `resolveCaller`'s legacy branch in the
  *same change set* this reason would have measured, so it can never be emitted. `expired` and `invalid`
  stay.
- **Deploy wiring** — the OTLP endpoint plus the Uptrace DSN as a **secret** in the 0600 env file via
  `setup-profile.sh`, on the config-parity allowlist, with shell-harness assertions.
- **`PROFILE_LOGIN_CREATE_ENABLED`** (default on). Off ⇒ existing players log in normally, unknown
  identities get `503 creation_paused`, and the **game-server resolve path still creates**. Flipping it is
  an env edit plus a container restart.
- **A junk-cleanup runbook section** under `ai-agents/knowledge-base/` — not scheduled, run by hand:
  delete players created inside an incident window with no credits, grants, intents, messages, name
  history or display name, and not citizens. Covered by an integration test.
- **`profile-checks.sh` backstop** — fail the daily ping if disk > 80 % or `players` grew by > 20 K in
  24 h; cases added to `tests/profile-checks.sh`.

**Gates at review close-out (2026-09-16), all five independently re-run by the reviewer and matching:**
`npm test` 134 suites / 1697 tests · `npm run test:integration` 10 suites / 118 tests · `tsc` 0 ·
`lint` 0 · config parity REQUIRED 0 / INFO 0.

🚨 **The loudest residual through every review round: `src/profile-server/Server.ts`'s wiring is executed
by NO test.** Every piece of its logic is unit-tested in the module it came from and `tsc` covers the
types, but the wiring itself had **no green gate as evidence**. Its only proof is the live metric series
below.

## Outcome

### What is proven live

- 🎯 **Deployed 2026-09-17 — nine live `geoconflict_profile_*` metric series arriving in Uptrace** from
  the deployed process, lead-verified in the UI under instrumentation library `profile-metrics`. **This is
  the first and only evidence the `Server.ts` wiring works**, and it discharges the loudest residual
  above. The deploy also printed `OTLP ingest reachable (HTTP 200)`, the boot log read
  `login creation ENABLED (PROFILE_LOGIN_CREATE_ENABLED)`, and there were **zero** error-level log lines
  since boot.
- ⚠️ **One profile deploy on 2026-09-17 carried FIVE tasks at once** — `0271`, `0272`'s server side,
  `0273`'s legacy-fallback removal, this task's monitoring, and `0276`. The owner collapsed two planned
  deploys into one. ⛔ **Do not read any of the five as independently deployed.**
- ⚠️ **Two metrics are absent and both are EXPECTED — record, do not treat as a fault:**
  `tenure_claims` is defined with **no caller** (`0253` unbuilt), and a counter that never counts creates
  no series; `players_total` is **correctly skipped by the code**, because on the box `players` shows
  `reltuples = -1, analyzed = NEVER` and the code declines to report garbage. It should appear once the
  table is analysed. 🚨 **DO NOT ARM ANY ALERT ON `players_total` UNTIL IT HAS BEEN OBSERVED.**
- ✅ **A5 is built and active** — `profile · DB pool saturated (>0 waiting, 5 min)`, monitor **id 9**,
  metric `geoconflict_profile_db_pool_waiting`, grouping interval 1 minute, checking the last 5 points,
  max allowed 0, attached to the alert channel. ⚠️ **Its aggregation is `avg` — Uptrace's default — while
  the design asked for `max`.** The two are equivalent **only** at a `>0` threshold on a non-negative
  gauge, and **NOT equivalent if the threshold is ever moved off 0**; re-check the aggregation before
  changing the threshold.
- 🎯 **The alert drill ran and PASSED end to end, 2026-09-17 ~20:06–20:16 UTC** — lead-run with the owner
  watching. A **real metric alert fired and then cleared by itself**: `alert.status` = **`closed`**,
  `alert.type` = **`metric`**, value **25**, and the owner confirmed live that **both** messages arrived —
  a 🚨 firing, then a ✅ resolved. Details and the correct fixture are on [[systems/alert-delivery]].
  🚨 **A DEFECT FOUND BY RUNNING THE PLAN: the fixture `plan.md` specifies — an always-true rule — CANNOT
  PASS.** An always-true rule never clears, and deleting a monitor is not a recovery event, so it proves
  only the 🚨 half while going green. The junk-Bearer fixture supersedes it; ⛔ **`plan.md` is byte-frozen
  and was NOT edited** — the supersession is recorded in the brief.
  ⛔ **The pass does NOT satisfy amendment A1** (delivery after an *idle* period): both bursts were
  minutes apart on a **warm** connection. That work moved to `0289`.
- ✅ **Owner step 7.7 — the creation-switch drill PASSED 2026-09-19**, owner-executed on the live box.
  Switch **OFF** ⇒ `503 {"error":"creation_paused"}` with **0** identity rows and **0** `players` rows;
  switch **ON** ⇒ `200 "created":true` with 1 row; that row removed through the junk-cleanup runbook's own
  §4→§7 procedure (dry run `candidates = 1`, `DELETE 1`, repeat `DELETE 0`); box restored to baseline with
  `/health` and `/ready` both 200. 🚩 **The BODY mattered more than the status code — three different
  conditions return `503` on that route, and only `creation_paused` proves the switch was reached and
  refused.**
- ✅ **Owner step 5 (plan amendment A3) — the PER-REQUEST name-change operator notification PASSED**,
  owner-observed arriving, all four identity checks matched, delivery same-second. ⚠️ **That send discards
  its own result with `void`** in `src/profile-server/NameChangeRepository.ts`, so **owner observation is
  the only evidence that can ever exist for it**. 🚨 **`0283`'s daily digest is a DIFFERENT mechanism and
  is NOT this** — see [[tasks/name-change-daily-digest]]. ⚠️ It closes a handoff **dropped since `0067`**:
  routed to `0033`, which never picked it up, unowned for roughly three weeks.
- ✅ **Owner step 4 — the Uptrace dashboard was BUILT**: `profile · overview`, dashboard **id 9**, **nine
  chart panels**, all saved and re-read after a reload.

### The accepted gaps — all six, because the close does not clear them

1. 🚨 **ONE of six alert rules exists — A5 alone.** **A1, A2, A3 and A6 are DELIBERATELY DEFERRED for
   want of login traffic**, and **they have no task of their own**. **A4 is ➡️ moved to `0288`**;
   **idle-period delivery (amendment A1) is ➡️ moved to `0289`** — ⚠️ **that amendment A1 is a DIFFERENT
   A1 from alert rule A1; do not conflate them.** ~~⛔ **`0288` and `0289` are Sprint 4 `🔲 Backlog` and are
   NOT closed by this.**~~
   🔧 **BOARD CORRECTED 2026-09-21 — the two are NOT on the same board, and this page had them both on
   Sprint 4.** Verified against the board files at `7eebaf3`: **`0288` is on the BACKLOG board**
   (`backlog.md`, `🔲 Backlog`, rank `—`), while **`0289` is on the SPRINT 4 board** (`plan-sprint-4.md`,
   `🔲 Backlog`, rank **`High` — the PRODUCER'S rank, not owner-ruled**). ⛔ **Both are still open and
   NEITHER is closed by this task.** ⚠️ **Why the distinction is worth the correction: they are reached by
   different status commands, and `0288` sitting on the older board is exactly how an item goes unnoticed.**
   🔴 **And the sharper gap is unchanged by any of it — A1, A2, A3 and A6 have NO TASK ON EITHER BOARD, so
   nothing tracks them at all.**
2. **One planned dashboard panel was NOT built** — the *created ÷ logins* ratio. This Uptrace build's
   chart editor did not expose a two-metric division the way the single-metric panels were built. Panels 1
   and 2 sit adjacent in the same `perMin` unit so the ratio is readable by eye — ⚠️ **that is a
   workaround, not the panel.**
3. **Two board observations are UNEXPLAINED and were not chased** — a 4xx burst around 20:15 MSK
   (~20/min against a ~0.4/min baseline) and a `5xx` series around 17:40 MSK (~0.13/min, absent from the
   then-current 1-hour view). ⚠️ **Neither is asserted to be a defect.**
4. **`session_rejected`'s presence in the Uptrace metric picker is UNCHECKED, not confirmed-missing.**
   The lead made a wrong absence claim mid-session about `login_requests` and `players_created`, corrected
   it in `worklog.md`, and never re-verified this one.
5. 🚨 **THE DASHBOARD, THE MONITORS AND THE NOTIFICATION CHANNELS ARE UI-ONLY STATE.
   `setup-telemetry.sh` SEEDS NONE OF THEM.** A rebuild of the monitoring box deletes the whole board and
   every alert rule, and **nothing in the repo recreates them.** The `worklog.md` entry is the only written
   record of the board's contents: **documentation, not a restore path.**
6. **Standing residuals unchanged by this close:** **R11** — the pool guard checks only `waitingCount`
   (agreed by reviewer and coder, ⚠️ **not owner-ruled**) · `session.rejected` still needs a baseline
   before `invalid` can carry an alert · 🚨 **do not arm any alert on `players_total` until it has been
   observed.**

### The circular dependency, and the ruling on it

🔴 **Found 2026-09-17, only because someone checked whether the metrics actually existed in the Uptrace
metric picker.** The loop: `0274` could not close without rules A1–A6 → four of those rules need metrics
that only real player login traffic creates → that traffic needs the game server deployed → and the plan's
deploy order sequences the game deploy **after** `0274` closes.

⛔ **THE DEPLOY ORDER IS NOT THE DEFECT — do not "fix" it.** The owner had ruled that the game server
deploys later, *"when we're ready to ship citizenship/profile"*, and **that ruling stands**; ⚠️ the lead
had repeatedly and wrongly described the game deploy as an *unblocker* for this task, **and the owner
corrected it.** The real constraint is that four rules watch traffic that does not exist.

⚠️ **This is NOT a configuration error to fix.** A metric appears in Uptrace **only once its counter is
first incremented** — proven the same night, when the first junk-Bearer request created
`session_rejected` out of nothing.

🔴 **OWNER RULING, given live via `AskUserQuestion`, 2026-09-17:** three options were put — a YAML-paste
route that might bypass the picker / **defer A1 the way A2 already is** / keep `0274` open until go-live.
**The owner chose "Defer A1 like A2 already is"**, on the stated reasoning that it is honest and unblocks
the task, *"but it means closing `0274` with a named gap rather than a full set."* ⛔ **Not producer
precedent.** ⚠️ **Scope, recorded honestly: the owner was asked about A1; `fkit-lead` extended it to A1,
A2, A3 and A6** — same cause, same remedy, A2 already carried it — and told the owner so explicitly in the
same message, showing the four-rule table. **Record that extension as the LEAD'S APPLICATION of the
owner's ruling, NOT as a separate owner ruling.**

📌 **A4's percentile question is SETTLED and nobody re-investigates it:** on 2026-09-17 `fkit-lead` typed
`p95($duration)` into the aggregation field in the live Uptrace UI and the chart re-rendered with real p95
data — the field is free text. ⛔ **A4 is expressible.** Its real blocker was never the percentile but
**traffic**: at zero logins the p95 *is* one request, so the rule could only cry wolf. ⚠️ **Do not
conflate the two reasons A4 waited — one is cleared, one is not.**

## Related

- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271` (S2), the login endpoint and Bearer token this slice instruments; shipped in the same single deploy
- [[tasks/profile-identity-s1-database-rekeying]] — task `0270` (S1), the first slice of the same epic
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the blocker found while planning this one: the monitoring stack had **no delivery channel at all**, so these rules would have fired and reached nobody
- [[tasks/alert-path-liveness-probe]] — task `0284`, the guard on the 403 channel-disable trap that can silently kill every rule built here
- [[tasks/name-change-daily-digest]] — task `0283`; ⛔ **its digest is NOT the per-request operator notification this task's owner step 5 proved**, and reading it as alerting evidence is the error ADR-114's A3 exists to prevent
- [[systems/alert-delivery]] — how an alert built here actually reaches a human, its traps, and the drill record
- [[systems/telemetry]] — the monitoring stack these metrics are exported to
- [[systems/player-profile-store]] — the service instrumented, the switch, and the box the checks run on
- [[decisions/adr-113-internal-player-id]] — the decision this slice implements
- [[decisions/adr-114-admin-server-alert-relay]] — the relay the alert channel depends on
- [[decisions/sprint-4]] — the sprint that owns it
