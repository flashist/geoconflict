# Profile identity S5 — Monitoring before go-live: profile-server metrics to Uptrace, email alerts, a creation switch, cleanup runbook

## ID
0274

## Parent / Epic
[`0266-profile-identity-internal-player-id-platform-logins-login-endpoint`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0273`**, the last of the five slices; the S1–S5 run as a whole
belongs directly below `0217`. Appended at the bottom (ADR-035).

## Status
🚧 Blocked — 🎯 **DEPLOYED 2026-09-17 AND OWNER STEP 7.3 PASSES. THE LOUDEST RESIDUAL IS DISCHARGED.** *"`src/profile-server/Server.ts`'s wiring is executed by NO test"* — the residual every review round put at the top of its list — **is discharged**, and by exactly one thing: **9 live metric series arriving in Uptrace from the deployed process**, lead-verified in the Uptrace UI (owner signed in, lead navigated) under instrumentation library `profile-metrics` — `login_requests`, `players_created`, `http_duration` (4 timeseries), `session_rejected`, `login_create_enabled`, `db_pool_waiting`, `process_cpu_usage`, `process_memory_rss`, `process_memory_heap_used`. **This is the first and only evidence the wiring works; no green gate ever was.** Also confirmed: deploy printed `OTLP ingest reachable (HTTP 200)`, boot log reads `login creation ENABLED (PROFILE_LOGIN_CREATE_ENABLED)`, **zero** error-level log lines since boot, no telemetry export warning. ⚠️ **TWO METRICS ABSENT, BOTH EXPECTED — record, do not treat as a fault:** **`tenure_claims`** is defined with **no caller** (`0253` unbuilt), and a counter that never counts creates no series; **`players_total`** is **correctly skipped** by the code — the lead checked on the box and `players` shows `reltuples = -1, analyzed = NEVER`, so the code declines to report garbage; it should appear once the table is analysed. 🚨 **DO NOT ARM ANY ALERT ON `players_total` UNTIL IT HAS BEEN OBSERVED.** 🚧 **Still blocked on two things, and both are real:** (1) **[`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md)** — Uptrace still has **no delivery channel**, so an alert rule reaches nobody and **the alert drill cannot pass**; (2) **owner step 7.7**, the live switch + cleanup drill — **untouched by this deploy**, and the only remaining proof that the creation switch actually **blocks**. Step 7.3 ✅ is not step 7.7. R11 and the `session.rejected` baseline still stand. No code. · earlier: 🚧 Blocked — **code complete, review closed out 2026-09-16; waiting on deploys and on `0277`, not on work.** Built + reviewed (2 rounds + an R14 follow-up; `Status: closed-out`, no confirmed defect open). Gates: `npm test` 134 suites / 1697 tests · `test:integration` 10 / 118 · `tsc` 0 · `lint` 0 · config parity REQUIRED 0 / INFO 0 — **all five independently re-run by the reviewer and matching.** **Blocked on, in order:** `0275` Part B → profile-box deploy 1 (S2 + S3 + `0273`'s legacy-fallback removal) → **[`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md)** (Uptrace has no Telegram delivery channel at all today, so the alert drill cannot pass) → profile-box deploy 2 = this task → owner step 7. 🚨 **Loudest residual: `src/profile-server/Server.ts`'s wiring is executed by NO test.** Every piece of its logic is unit-tested in the module it came from and `tsc` covers the types, but the wiring itself is unproven and **no green gate is evidence that it works** — first proof metrics flow is **owner step 7.3**, first proof the switch is wired is **owner step 7.7**. Also standing: R11 (pool guard checks only `waitingCount` — agreed by reviewer and coder, **not owner-ruled**) · `session.rejected` needs a baseline before `invalid` can carry an alert · the OTLP probe proves the network path, not the pipeline. · earlier: 🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop) · **plan approved by the owner 2026-09-16** ([`plan.md`](plan.md) written, build worker running) — rulings D1–D7 folded into the plan; ⛔ do not re-plan this task · earlier: 🔄 In progress, started 2026-09-15 (plan step) · earlier: 🔲 Backlog
## Owner
fkit-coder

⚠️ Plus **owner steps** (Uptrace UI + a live drill) — the task cannot close on code alone.

## Context

**Filed 2026-09-15 on OWNER RULINGS (`AskUserQuestion`, lead session, relayed by `fkit-lead`):**
monitoring **"Yes, before go-live"**; alerts by **"Email"**; no per-IP rate limit on login (monitoring
replaces it; junk profile rows are the owner-accepted, monitored risk). The architect placed monitoring
as its own 5th slice (delegated).

**Source of truth:** [`2026-09-15-profile-identity-design.md`](../../../knowledge-base/reports/2026-09-15-profile-identity-design.md)
§6 (baseline, junk risk, metric list, alerts A1–A6, switch, cleanup, daily backstop), §9 row **S5**;
[ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md).

**Why before go-live:** a scripted 100 req/s writes ~3–4 GB/day; the box has 48 G free ⇒ ~12–16 days of
runway. Detection must take minutes, not days.

**Today the profile server has no OTEL** (`Logger.ts` note) — only the daily `profile-checks.sh`
dead-man's switch (`0219`).

## What to build

Per design §9 S5:

1. **`src/profile-server/Telemetry.ts`** — OTEL metrics exporter reading `OTEL_*` env directly (its own
   minimal setup — never `src/server/Logger.ts`), with the `geoconflict.profile.*` metrics in §6:
   login requests by outcome, players created by source, HTTP duration, session rejections
   (`reason=expired`, `reason=invalid`), tenure claims, pool waiting, players total (5-min estimate),
   process CPU/memory. ⛔ **Never** a platform user id, player id or token in an attribute or log line.

   > ⛔ **`reason=legacy_fallback_used` is REMOVED from this metric — do not re-add it.** Ruling **D1**
   > on [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)
   > (owner, 2026-09-16) deletes `resolveCaller`'s legacy branch in the **same change set** this metric
   > would have measured it in, so the reason can never be emitted. `expired` and `invalid` stay.
2. **Deploy wiring** — OTLP endpoint + Uptrace DSN as a **secret** in the 0600 env file via
   `setup-profile.sh`; config parity allowlist; shell-harness assertions.
3. **`PROFILE_LOGIN_CREATE_ENABLED`** (default on). Off → existing players log in normally; unknown
   identities get `503 creation_paused`; game-server resolve **still creates**. Flip = env edit +
   container restart.
4. **Cleanup query as a runbook section** under `ai-agents/knowledge-base/` (not scheduled): delete
   junk players per the §6 definition (identity created inside the incident window; no credits,
   grants, intents, messages, name history or display name; not a citizen). Covered by an integration
   test.
5. **`profile-checks.sh` backstop:** fail the ping if disk > 80 % or `players` grew by > 20K in 24 h;
   cases added to `tests/profile-checks.sh`.

### Owner steps
1. **Profile-box deploy** with the new secrets populated (owner runs it).
2. **Uptrace dashboard** for the §6 metrics.
3. **Six email alert rules A1–A6** at the §6 initial thresholds. ⚠️ **A2** (created ÷ logins > 60 %) is
   **armed from day 8 after go-live** — create it now, arm it later (see *Notes*).
4. **Drill:** force one alert and **watch the email arrive** (`0219` precedent). An alert that has
   never been seen to arrive does not count.

   🚨 **THE DRILL AS SPECIFIED IS NOT SUFFICIENT, AND THIS IS THE REQUIREMENT, NOT A FOOTNOTE — added
   2026-09-17.** **A single forced alert would be PASSED by a relay that still carries the
   stale-connection defect**, because the first send on a fresh connection always works. The defect
   only shows itself later, and it shows itself as **silence** — indistinguishable from "nothing was
   wrong". ⇒ **A green single-alert drill proves the happy path and NOTHING about sustained
   delivery.**

   ⛔ **This drill therefore needs STRENGTHENING before it can be recorded as passed.** The minimum
   bar: **a second alert after an idle period**, **or** an explicit **connection-failure test**.
   ⛔ **The SHAPE is deliberately NOT designed here — that is the architect's / coder's call**, and it
   belongs with [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md), which owns the relay.
   **Source:** [`0061`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md), and the
   design-input section at the end of this brief.

5. **Name-change operator notification — verify it ACTUALLY ARRIVES, on this same deploy.**
   📅 **OWNER RULING, 2026-09-17, given live in the lead session and relayed by
   `fkit-sprint-ship-loop` to a spawned `fkit-producer`: fold this into the next profile-box deploy
   drill; file NO separate task.** ~5 minutes of live checking on a deploy that has to happen anyway.

   **What must be proven:** submit a name-change request and **observe the operator notification
   arrive** in the Name Changes topic. ⛔ **Not** that the code path returned `sent` — an *observed
   arrival*. The send is `src/profile-server/NameChangeRepository.ts:542`, which uses the shared
   helper and **discards the result with `void`**, so a failure here leaves **no trace at all**;
   watching the message land is the only evidence available.

   ⚠️ **THIS CLOSES A HANDOFF THAT WAS DROPPED, and it is named so it cannot be dropped a second
   time:** [`0067`](../../done/0067-name-change-citizens-only/brief.md) shipped this notification,
   closed as Done with proxy reachability never exercised, and **routed the verification to `0033`**.
   **`0033`'s brief never picked it up.** For roughly three weeks no task on any board owned it. The
   egress path itself was fixed 2026-09-17 (owner added the profile box's IP to the proxy allow list —
   a zero-code fix, recorded on `0277`), so the check is now genuinely runnable.

   ⛔ **Record the result in `worklog.md`: date, that it arrived, and nothing else** — no topic id, no
   chat id, no token, no host.

   ⚠️ **Scope note, flagged rather than fixed:** this brief's `### Owner steps` is the home the owner's
   ruling named, and this producer's mandate was **briefs and boards only**. The *numbered* drill list
   a runner is most likely to follow is **[`plan.md`](plan.md) §7 (steps 7.1–7.7), which this edit did
   NOT touch** — amending an owner-approved plan is not a producer's act. **Whoever runs the drill must
   read this section, not only `plan.md` §7.**

## Verification steps

1. **Metrics visible in Uptrace from the box** — proves the network path from the profile box to the
   telemetry VPS (design §8 Q5 — not assumed).
2. Switch off → an existing player logs in; an unknown identity gets `503 creation_paused`; a
   game-server resolve still creates (integration tests).
3. The cleanup query deletes **only** rows matching the junk definition (integration test with a mix of
   junk and real-looking rows).
4. `profile-checks.sh` fails the ping on a forced disk breach and a forced growth breach
   (`tests/profile-checks.sh`, part of `npm test`).
5. No ids or tokens in any metric attribute (test over the recorded attributes).
6. **An alert actually arrives** (drill; worklog records date, rule, arrival — no addresses, no chat
   ids). 🚨 **2026-09-17 — THIS STEP AS WRITTEN IS A SINGLE FORCED ALERT, AND A RELAY CARRYING THE
   STALE-CONNECTION DEFECT WOULD PASS IT** (the first send on a fresh connection always works; the
   defect appears later, as silence). ⛔ **The step needs strengthening before it can be recorded as
   met** — minimum a second alert after an idle period, or an explicit connection-failure test; the
   shape is the architect's / coder's, and the requirement is written out at **owner step 4** above.
   🚩 **The drill is also the ONLY thing that would catch a silently dropped alert.**
   Read the design-input note at the end of this brief before running it: one arrival proves the
   happy path, NOT that a stale connection is handled.** 🚨 **THIS STEP CANNOT PASS UNTIL
   [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md) LANDS** — Uptrace on the telemetry box has **no delivery channel configured at all** today, so a
   firing rule reaches nobody. ~~An alert **email**~~ — the owner ruled **Telegram**, not email, on
   2026-09-16; `0277` owns the channel. **Every "email" wording elsewhere in this brief is superseded
   by that ruling** (struck here rather than rewritten everywhere, so the original filing stays
   readable).
7. `npm test` (incl. shell harnesses) green; `npx tsc --noEmit`, `npm run lint`,
   `npm run check:config-parity` clean.

## Notes

- **Depends on:** [`0271`](../../done/0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2 — the metrics hook into login), [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md) (alert delivery — **without it the six rules A1–A6 fire into nothing and verification 6 / the drill cannot pass**)
- **Blocks:** [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live), [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (its **game deploy** — owner ruling D2, 2026-09-16: S5 monitoring live **before** the S4 game deploy)
- **Can run in parallel with** `0272` (S3) and `0273` (S4).
- **Effort (design §9):** 2–2.5 days + owner UI time.
- 🚩 **Two post-go-live steps this slice cannot finish — flagged for the owner, not ruled:** arming A2
  on day 8 after go-live, and re-baselining A1–A6 after 14 days (Uptrace keeps ~14 days, `0263`; design
  §8 Q3 — loads per player). Recommendation: add both as dated items to `0217`'s post-go-live steps
  rather than a new task.
- 🔒 No secrets, DSNs, endpoints, hosts or email addresses in any artifact — variable names only.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

### 🚩 Design input — 2026-09-17: this slice's alert drill can be passed by a relay that still drops alerts

⛔ **Constraint only — no design here, no status change, no new dependency.** The owning task is
[`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md), whose brief carries the full note;
the source is [`0061`](../0061-investigate-prod-telegram-feedback-delivery-failure/brief.md),
**reproduced in production 2026-09-17** (by our own proxy restart — a clean experiment, not an
organic failure).

**The hypothesis — reproduced behaviourally, NOT confirmed in code:** a **module-level `ProxyAgent`**
reused for the process lifetime hands out a **dead pooled socket** after a proxy restart or an idle /
NAT timeout. The send fails at the network layer (`TypeError: fetch failed`), the caller swallows it,
and the *next* send succeeds. `src/core/notifications/TelegramNotifier.ts` — the helper `0277`'s
relay reuses — has that pattern and **no retry**.

**Why it matters to THIS slice specifically:** verification 6 and owner step 7.4 are a **single
forced alert**. A relay carrying this defect **passes that drill**, because the first send after a
fresh connection works. The defect only shows itself later, on the alert that actually matters — and
it shows itself as **silence**, which is indistinguishable from "nothing was wrong".

**Therefore:** do not read a passing drill as proof that alert delivery is reliable. `0277` is
required to handle connection-level failure explicitly — retry, or at minimum detect and report. **If
`0277` ships without that, say so in this task's worklog rather than recording verification 6 as
unqualified.**
