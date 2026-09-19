# Profile identity S5 — Monitoring before go-live: profile-server metrics to Uptrace, email alerts, a creation switch, cleanup runbook

## ID
0274

## Parent / Epic
[`0266-profile-identity-internal-player-id-platform-logins-login-endpoint`](../../backlog/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0273`**, the last of the five slices; the S1–S5 run as a whole
belongs directly below `0217`. Appended at the bottom (ADR-035).

## Status
✅ Done (agent-closed — not owner-verified) — **closed 2026-09-19 by a spawned `fkit-producer` on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` and relayed by `/fkit-sprint-ship-loop`.** The owner was shown that the three remaining owner steps were discharged, was offered *close now (agent-closed)* / *owner-verifies first* / *leave open*, was told in plain words that a spawned producer has no owner channel (ADR-021) and therefore writes the agent-closed marker, and **chose "Close it now"**. ⛔ **The marker stays: no human verified this work, and only the owner may upgrade it** (`fkit-task-done` §5). ⛔ Not producer precedent — one ruling, one task. ✅ **WHAT WAS DISCHARGED 2026-09-19, all owner-executed on the live box or lead-built in the Uptrace UI:** **(1) Owner step 7.7 — creation-switch drill: PASSED** (switch OFF → `503 {"error":"creation_paused"}` with 0 rows; switch ON → `200 "created":true`; drill row removed via the cleanup runbook; box back to baseline). 🚩 **The BODY mattered more than the status code — three conditions return 503 and only `creation_paused` proves the switch was reached.** **(2) Owner step 5 / `plan.md` amendment A3 — the PER-REQUEST name-change operator notification: PASSED**, owner-observed arriving, all four identity checks matched, delivery same-second. ⚠️ **That send discards its own result with `void`** (`src/profile-server/NameChangeRepository.ts`), so **owner observation is the only evidence that can ever exist for it**; `0283`'s daily digest is a different mechanism and is NOT this. Box returned to `0 | 0 | 0 | 0`, `/health` + `/ready` both 200. **(3) Owner step 4 — the Uptrace dashboard: BUILT** — `profile · overview` (dashboard id 9), **nine chart panels**, all saved and re-read after a reload. Full record in [`worklog.md`](worklog.md) §§ *OWNER STEP 7.7*, *OWNER STEP 5 / AMENDMENT A3*, *OWNER STEP 4 / DASHBOARD BUILT*. 🔴 **THIS CLOSE CARRIES NAMED, ACCEPTED GAPS — IT DOES NOT MEAN "MONITORING IS DONE". Read every one:** **(a) ONE of six alert rules exists — A5 alone** (`profile · DB pool saturated`, monitor id 9, active). **A1, A2, A3 and A6 are DELIBERATELY DEFERRED for want of login traffic** (owner ruling 2026-09-17, extended from A1 to the four by `fkit-lead` — recorded as the lead's application, not a separate owner ruling); **they have NO task of their own.** **A4 is ➡️ moved to [`0288`](../../backlog/0288-alert-rule-a4-p95-of-login-latency-over-750ms-for-10-min/brief.md)**; **idle-period delivery (amendment A1) is ➡️ moved to [`0289`](../../backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md)**. ⛔ **`0288` and `0289` are Sprint 4 `🔲 Backlog` and are NOT closed by this.** **(b) ONE PLANNED DASHBOARD PANEL WAS NOT BUILT** — the *created ÷ logins* ratio panel; this Uptrace build's chart editor did not expose a two-metric division the way the single-metric panels were built. Panels 1 and 2 sit adjacent in the same `perMin` unit so the ratio is readable by eye — ⚠️ **that is a workaround, not the panel.** **(c) TWO BOARD OBSERVATIONS ARE UNEXPLAINED AND WERE NOT CHASED** — a 4xx burst around 20:15 MSK (~20/min against a ~0.4/min baseline) and a `5xx` series around 17:40 MSK (~0.13/min, absent from the current 1-hour view). Neither is asserted to be a defect. **(d) `session_rejected`'s presence in the Uptrace metric picker is UNCHECKED, not confirmed-missing** — the lead made a wrong absence claim mid-session about `login_requests` and `players_created`, corrected it in `worklog.md`, and never re-verified this one. **(e) 🚨 THE DASHBOARD, THE MONITORS AND THE NOTIFICATION CHANNELS ARE UI-ONLY STATE. `setup-telemetry.sh` SEEDS NONE OF THEM** — a rebuild of the monitoring box deletes the whole board and every alert rule, and **nothing in the repo recreates them**. The `worklog.md` entry is the only written record of the board's contents: **documentation, not a restore path.** **(f) Standing residuals unchanged by this close:** R11 (the pool guard checks only `waitingCount` — agreed by reviewer and coder, **not owner-ruled**) · `session.rejected` still needs a baseline before `invalid` can carry an alert · 🚨 **do not arm any alert on `players_total` until it has been observed.** · earlier: 🔄 In progress — 🔴 **2026-09-19 — THE OWNER RULED THIS TASK UNBLOCKED ONCE AMENDMENT A1 WAS FILED. A1 IS NOW FILED AS [`0289`](../../backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md), SO THE RULING IS APPLIED AND THE `🚧 Blocked` TOKEN IS RETIRED. ⛔ BUT "UNBLOCKED" IS NOT "DONE", AND THIS TASK IS NOT CLOSED — TWO OWNER STEPS WERE NEVER PERFORMED.** **Authority:** the owner ruled *"unblocked once A1 is filed"* live in the `fkit lead` session, 2026-09-19, relayed by `/fkit-sprint-ship-loop` to a spawned `fkit-producer`. ⛔ **The owner ruled UNBLOCKED. The owner did NOT rule DONE, and no close was performed.** ⛔ Not producer precedent — one ruling, one task. ✅ **ALL THREE NAMED BLOCKERS ARE GONE, each for a different and recorded reason:** **(1) Owner step 7.7 — DISCHARGED 2026-09-19**, owner-executed on the live box, **PASSED BOTH HALVES**: switch **OFF** → `503 {"error":"creation_paused"}` with **0** identity rows and **0** `players` rows; switch **ON** → `200 "created":true` with **1** row; that row deleted via the junk-cleanup runbook's own §4→§7 procedure (dry run `candidates = 1`, `DELETE 1`, repeat `DELETE 0`); box restored to baseline (`players` 0, persist file absent, both containers healthy, `/health` and `/ready` 200). 🚩 **The BODY mattered more than the status code** — three different conditions return `503` on that route and only `creation_paused` proves the switch was reached and refused. Full record: `worklog.md` § *OWNER STEP 7.7 RAN AND PASSED*. **(2) A4 (p95 login latency) — ➡️ MOVED** to its own Backlog task [`0288`](../../backlog/0288-alert-rule-a4-p95-of-login-latency-over-750ms-for-10-min/brief.md) on an **OWNER RULING of 2026-09-19**. **(3) Amendment A1 (delivery after an idle period) — ➡️ MOVED** to its own Sprint 4 task [`0289`](../../backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md) on the **OWNER RULING of 2026-09-19** (*file it as its own task*); ⚠️ **that is amendment A1, a DIFFERENT A1 from alert rule A1 — do not conflate them.** 🚨 **WHY THIS IS `🔄 In progress` AND NOT `✅ Done` — TWO OWNER STEPS HAVE NEVER BEEN PERFORMED, AND NEITHER IS DONE, DEFERRED, NOR MOVED.** Both were checked by grep across `brief.md`, `worklog.md`, `plan.md`, the Sprint 4 board, `alert-delivery-runbook.md`, the A1–A6 design report and `0277`/`0283`/`0284`'s worklogs — **no record of either exists anywhere.** **(i) THE UPTRACE DASHBOARD — `plan.md` §7.4 = this brief's owner step 2 — WAS NEVER BUILT.** Nine live `geoconflict_profile_*` metric series have been arriving since 2026-09-17 (step 7.3 ✅), but **no dashboard was ever created over them**: login rate by outcome · creations by source · created ÷ logins · login p95 · error share · pool waiting · players total · `create_enabled` · CPU/memory. ⚠️ **Not blocked — runnable today**, and the only thing standing between the owner and a human-readable view of those series. **(ii) THE NAME-CHANGE OPERATOR NOTIFICATION WAS NEVER OBSERVED ARRIVING — and this one is itself an OWNER RULING** (2026-09-17: fold it into this task's deploy drill, **file NO separate task**), so it **cannot be quietly dropped.** 🚨 **[`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md)'s DAILY DIGEST IS NOT THIS.** Two digest messages were owner-observed 2026-09-19 — but the digest is a **separate short-lived CLI** (`npm run digest:name-changes` → `src/profile-server/sendNameChangeDigest.ts`), while this step is the **per-request operator notification** at `src/profile-server/NameChangeRepository.ts:542`, which **discards its result with `void`** so a failure leaves **no trace at all**. **Watching the message land is the only evidence that exists.** ⚠️ **It closes a handoff dropped since `0067`** — routed to `0033`, which never picked it up, unowned for ~three weeks. ⚠️ **Not blocked — runnable today**: the profile box's Telegram egress was fixed 2026-09-17 and is proven working. 🔴 **THE NAMED GAP THIS TASK WILL CLOSE WITH, STATED LOUDLY SO NO CLOSE CAN EVER READ AS "MONITORING IS DONE":** **ONE of six alert rules exists — A5 alone** (`profile · DB pool saturated`, monitor id 9, active). **FOUR (A1, A2, A3, A6) are DELIBERATELY DEFERRED for want of login traffic** by the owner ruling of 2026-09-17 — their metrics are absent from the Uptrace picker because a counter that has never been incremented creates no series, and the traffic that would increment them needs a game deploy that is sequenced *after* this task. **They have no task of their own.** **A4 is ➡️ moved to `0288`.** **Idle-period delivery is ➡️ moved to `0289`.** ⛔ **The owner accepted closing with a named gap** (2026-09-17: *"let `0274` close on the rules that CAN be built … it means closing `0274` with a named gap rather than a full set"*) — **that acceptance covers the four deferred RULES. It is not, and must not be read as, an acceptance of the two unperformed owner steps above**, which nobody has ruled on. 🚩 **WHAT THE OWNER NEEDS TO DECIDE:** perform the two remaining owner steps (both are live-box work, neither needs code), **or** rule them deferred/moved — **either answer closes this task immediately.** ⛔ **No close was performed and no mover skill was invoked**; a spawned `fkit-producer` has no owner channel (ADR-033 §5). 📌 **A4's stale wording in the blocker list below is superseded by this entry** — the percentile question was settled 2026-09-17 (`p95($duration)` typed into the live aggregation field rendered real data), so **A4 is expressible; it is simply unbuilt and now lives on `0288`.** · earlier: 🚧 Blocked — 🔴 **2026-09-17 — A CIRCULAR DEPENDENCY WAS FOUND, AND THE OWNER RULED ON IT: FOUR OF THE SIX ALERT RULES (A1, A2, A3, A6) ARE DEFERRED UNTIL REAL LOGIN TRAFFIC EXISTS.** **The loop:** `0274` cannot close without rules A1–A6 → four of those rules need metrics that only real player login traffic can create → that traffic needs the game server deployed → and `plan.md`'s *Deploy order* sequences the game deploy **AFTER** `0274` closes. It was invisible until someone checked whether the metrics actually exist in the Uptrace metric picker. ⛔ **THE DEPLOY ORDER IS NOT THE DEFECT — do not “fix” it.** The owner ruled earlier in this session that the game server deploys later, *“when we're ready to ship citizenship/profile”*, and **that ruling stands**; ⚠️ the lead had repeatedly and wrongly described the game deploy as an *unblocker* for this task and **the owner corrected it**. The real constraint is that four rules watch traffic that does not exist. **Verified in the LIVE Uptrace metric picker, 2026-09-17:** A1 (player-creation spike) needs `players.created` — ❌ **absent** · A2 (created ÷ logins ratio) needs both login counters — ❌ **absent** · A3 (login failures by `outcome`) needs `login.requests` — ❌ **absent** · A6 (login request rate) needs `login.requests` — ❌ **absent** · A4 (p95 login latency) needs `http.duration` — ✅ **present** · A5 (DB pool saturation) needs `db.pool.waiting` — ✅ **present, and A5 is BUILT: monitor id 9, active**. ⚠️ **THIS IS NOT A CONFIGURATION ERROR TO FIX.** A metric appears in Uptrace **only once its counter is first incremented** — **proven tonight**, when the first junk-Bearer request created `session_rejected` out of nothing. Those four counters have never been incremented because no real player has ever logged in. There is nothing to configure; there is only traffic that does not exist. 🔴 **OWNER RULING, given live in the lead session this turn via `AskUserQuestion`.** Three options were put — try a YAML-paste route that might bypass the metric picker / **defer A1 the way A2 already is** / keep `0274` open until go-live. **The owner chose: “Defer A1 like A2 already is.”** The reasoning stated in the option they selected: *the plan already says A2 is “create now, arm later — day 8 after go-live”; treat A1 the same, record it as deliberately deferred until traffic exists, and let `0274` close on the rules that CAN be built. Honest and unblocks the task, but it means closing `0274` with a named gap rather than a full set.* ⛔ **Not producer precedent.** **Scope of the ruling, recorded honestly:** the owner was asked about **A1**; **`fkit-lead` extended it to A1, A2, A3 and A6** — same cause (metric absent for want of traffic), same remedy, and A2 already carried it — and **told the owner so explicitly in the same message, showing the four-rule table, rather than re-asking four times**. ⚠️ **Record that extension as the LEAD'S APPLICATION of the owner's ruling, NOT as a separate owner ruling.** 🚧 **CORRECTED BLOCKER LIST — the token STAYS `🚧 Blocked`, on three live things:** (1) ~~**A4 has not been attempted and is NOT yet known to be buildable** — it is the only other rule whose metric is present, but ⚠️ **A4 needs a percentile query, which the architect recorded as UNVERIFIED against Uptrace 2.0.2**, so it may turn out not to be expressible at all; **that is not yet known**.~~ 📌 **CORRECTED 2026-09-19 — STALE IN TWO WAYS, struck not deleted.** **(a) The percentile IS verified.** On **2026-09-17** `fkit-lead` typed `p95($duration)` into the aggregation field in the **live** Uptrace UI and the chart re-rendered with real p95 data — the field is free text, which is why it works. ⛔ **A4 is expressible; nobody re-investigates that.** **(b) A4 is now its OWN Backlog task, [`0288`](../../backlog/0288-alert-rule-a4-p95-of-login-latency-over-750ms-for-10-min/brief.md)**, on an **OWNER RULING given live in the `fkit lead` session 2026-09-19**: *"I suggest building it later, and to create a task and put it into backlog: the alert looks useful, but not crucial for the citizenship/profile release."* **A4’s real blocker was never the percentile — it is traffic:** at zero logins the p95 **is** one request, so the rule could only cry wolf. ⚠️ **Do not conflate the two reasons the design gave for A4 waiting — one is cleared, one is not.** 🚩 **What this does to THIS task’s blocker list has NOT been decided and is NOT decided here** — the `🚧 Blocked` token and the three-item list below are deliberately left exactly as they were, for the owner to rule. (2) **Owner step 7.7** (the live switch + cleanup drill) — **untouched**. (3) **Amendment A1** (delivery after an *idle* period) is still not satisfied — ⚠️ **that “A1” is a DIFFERENT A1 from alert rule A1; do not conflate them.** ⛔ **Alert rules A1, A2, A3 and A6 are NO LONGER on the blocker list — they are deliberately deferred, not missing by accident.** · earlier: 🚧 Blocked — 🎯 **2026-09-17, ~20:06–20:16 UTC — THE ALERT DRILL RAN AND PASSED, END TO END, ON A REAL ALERT THAT FIRED AND THEN CLEARED BY ITSELF.** Run by `fkit-lead` in the lead session with the owner watching Telegram. ⚠️ **Reference: this is verification step 6 = plan §7 step 6 (`plan.md:201`), written here as §7.6. It has been called "§8" in several places, including `0277`'s review ledger — same step; there is no §8 to hunt for.** **Fixture actually used — NOT the one the plan specifies:** 20 requests to the public read-only `GET /v1/profile` with a deliberately junk Bearer token → 20 × **401**, each incrementing `session_rejected` with reason `invalid` (no writes, no rows, no restart). That call **created the metric `geoconflict_profile_session_rejected` in Uptrace** — it had not existed before, because the counter had never been incremented. Throwaway monitor `DRILL — delete me — rejected sessions (>0 / 1 min)` on that metric, aggregation `perMin(sum($rejected))`, grouping interval **1 minute**, checking the **last 1 point (1 minute)**, max allowed **0**, attached to the `alerts-to-telegram` channel. A second burst of 25 requests (20:11:51–20:12:24 UTC) made it fire; requests stopped and the alert **closed by itself** — a genuine recovery, not a deletion and not a restart. **RESULT — PASS on every check:** Uptrace recorded `alert.status` = **`closed`**, `alert.type` = **`metric`**, value **25**; and **the OWNER CONFIRMED, live in the lead session via `AskUserQuestion`, that BOTH messages arrived in the Telegram Alerts topic — a 🚨 firing, then a ✅ resolved** (offered four outcomes — both / only the firing / two firings with no ✅ / nothing at all — and selected **"Both — a 🚨 then a ✅"**). **Cleanup verified:** throwaway monitor deleted, **9 monitors remain**, the drill rule is gone, **A5 (monitor id 9) intact and active**. 🎯 **TWO RESIDUALS DISCHARGED BY THIS RUN:** `0277` residual **1a-ii** — *"a synthetic test does not exercise a real `alert.name`, a real `alert.status`, or the resolved/recovery form"* — **DISCHARGED**, a real metric alert fired and cleared; and `0277` residual **2** = this task's **D8** — *"`alert.status`'s value vocabulary is UNVERIFIED; a resolved alert may render as still firing"* — **DISCHARGED: the value is `closed`, which `AlertRelay.ts:141` already matched.** ⚠️ **Stated plainly: that was CONFIRMED, not designed** — the relay was written to match `closed`/`resolved` without anyone knowing which Uptrace actually used; it happened to be right. ⛔ **`0277` is a landed `✅ Done (agent-closed — not owner-verified)` and its status is untouched by this** — only the owner may change it; the evidence was appended to its `worklog.md`. 🚨 **A DEFECT IN THE PLAN, FOUND BY RUNNING IT — recorded so nobody repeats it:** plan §7.6 (`plan.md:201`) specifies the drill fixture as *"temporarily add an always-true rule (`process.memory.rss > 1`), wait for the Telegram message, delete the rule."* **That fixture CANNOT PASS this drill.** An always-true rule **never clears**, so it can only ever prove the 🚨 half, and **deleting a monitor is not a recovery event**, so no ✅ is ever produced. Run as written the drill would have gone green while proving nothing about the recovery path — the exact silent-success failure this epic exists to close. **The junk-Bearer fixture above is the correct procedure and supersedes it.** `plan.md` is **byte-frozen and was NOT edited** — the supersession is recorded here and in the brief, the same handling the other superseded plan items on this task got. 🚧 **The token stays `🚧 Blocked` deliberately, on three live things:** (1) 🚨 **Amendment A1 is NOT satisfied by this run** — A1 requires the drill to also establish delivery **after an idle period** (the stale-connection defect), and both bursts here were minutes apart on a **warm** connection; ⛔ **a PASS on §7.6 must not be read as discharging A1.** (2) **Five of the six alert rules still do not exist** — A1, A2, A3, A4, A6; A5 alone. (3) **Owner step 7.7** (live switch + cleanup drill) is still untouched. `0283`'s daily digest remains the only non-circular proof of **sustained** delivery — unchanged. · earlier:🚧 Blocked — 📅 **2026-09-17, LATER THE SAME DAY — OWNER STEP 3 HAS STARTED: THE PROJECT'S FIRST REAL ALERT RULE NOW EXISTS.** `fkit-lead` created it in the monitoring UI on the owner's approval. **A5 — `profile · DB pool saturated (>0 waiting, 5 min)`**, monitor **id 9**, type **metric**, status **active**, attached to the `alerts-to-telegram` webhook channel. Metric `geoconflict_profile_db_pool_waiting`; **aggregation `avg`** — Uptrace's default; ⚠️ **the design asked for `max`**, and the two are equivalent **only** at a `>0` threshold on a non-negative gauge — **NOT equivalent if the threshold is ever moved off 0**, so re-check the aggregation before changing the threshold; grouping interval **1 minute**; checks the **last 5 points (5 min)**; max allowed **0**. 🚨 **THAT IS ONE RULE OF SIX. A1, A2, A3, A4 AND A6 DO NOT EXIST.** 🚨 **A1 CANNOT BE BUILT AT ALL YET, and this is a real obstacle, not an oversight:** its metric `geoconflict_profile_players_created` is **ABSENT FROM THE UPTRACE METRIC PICKER**, together with `login_requests` and `session_rejected`. All three are **counters that have never been incremented — no real player has ever logged in** — so no series exists, and **a rule cannot be written against a name the picker does not offer.** These three become buildable only after real login traffic; ⚠️ the same shape as the standing `players_total` warning above, and it means part of owner step 3 is **not completable before go-live**. 🚧 **Token deliberately UNCHANGED — still `🚧 Blocked`,** on three things: **five of the six alert rules are missing**, the **§8 drill has not run**, and **owner step 7.7 is untouched**. ⚠️ **One line in the text below is now STALE, kept for the record, not deleted:** the *"(1) `0277` — Uptrace still has no delivery channel"* clause — `0277` is **✅ Done** and the `alerts-to-telegram` channel exists and delivered a test message. · earlier: 🎯 **DEPLOYED 2026-09-17 AND OWNER STEP 7.3 PASSES. THE LOUDEST RESIDUAL IS DISCHARGED.** *"`src/profile-server/Server.ts`'s wiring is executed by NO test"* — the residual every review round put at the top of its list — **is discharged**, and by exactly one thing: **9 live metric series arriving in Uptrace from the deployed process**, lead-verified in the Uptrace UI (owner signed in, lead navigated) under instrumentation library `profile-metrics` — `login_requests`, `players_created`, `http_duration` (4 timeseries), `session_rejected`, `login_create_enabled`, `db_pool_waiting`, `process_cpu_usage`, `process_memory_rss`, `process_memory_heap_used`. **This is the first and only evidence the wiring works; no green gate ever was.** Also confirmed: deploy printed `OTLP ingest reachable (HTTP 200)`, boot log reads `login creation ENABLED (PROFILE_LOGIN_CREATE_ENABLED)`, **zero** error-level log lines since boot, no telemetry export warning. ⚠️ **TWO METRICS ABSENT, BOTH EXPECTED — record, do not treat as a fault:** **`tenure_claims`** is defined with **no caller** (`0253` unbuilt), and a counter that never counts creates no series; **`players_total`** is **correctly skipped** by the code — the lead checked on the box and `players` shows `reltuples = -1, analyzed = NEVER`, so the code declines to report garbage; it should appear once the table is analysed. 🚨 **DO NOT ARM ANY ALERT ON `players_total` UNTIL IT HAS BEEN OBSERVED.** 🚧 **Still blocked on two things, and both are real:** (1) **[`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md)** — Uptrace still has **no delivery channel**, so an alert rule reaches nobody and **the alert drill cannot pass**; (2) **owner step 7.7**, the live switch + cleanup drill — **untouched by this deploy**, and the only remaining proof that the creation switch actually **blocks**. Step 7.3 ✅ is not step 7.7. R11 and the `session.rejected` baseline still stand. No code. · earlier: 🚧 Blocked — **code complete, review closed out 2026-09-16; waiting on deploys and on `0277`, not on work.** Built + reviewed (2 rounds + an R14 follow-up; `Status: closed-out`, no confirmed defect open). Gates: `npm test` 134 suites / 1697 tests · `test:integration` 10 / 118 · `tsc` 0 · `lint` 0 · config parity REQUIRED 0 / INFO 0 — **all five independently re-run by the reviewer and matching.** **Blocked on, in order:** `0275` Part B → profile-box deploy 1 (S2 + S3 + `0273`'s legacy-fallback removal) → **[`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md)** (Uptrace has no Telegram delivery channel at all today, so the alert drill cannot pass) → profile-box deploy 2 = this task → owner step 7. 🚨 **Loudest residual: `src/profile-server/Server.ts`'s wiring is executed by NO test.** Every piece of its logic is unit-tested in the module it came from and `tsc` covers the types, but the wiring itself is unproven and **no green gate is evidence that it works** — first proof metrics flow is **owner step 7.3**, first proof the switch is wired is **owner step 7.7**. Also standing: R11 (pool guard checks only `waitingCount` — agreed by reviewer and coder, **not owner-ruled**) · `session.rejected` needs a baseline before `invalid` can carry an alert · the OTLP probe proves the network path, not the pipeline. · earlier: 🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop) · **plan approved by the owner 2026-09-16** ([`plan.md`](plan.md) written, build worker running) — rulings D1–D7 folded into the plan; ⛔ do not re-plan this task · earlier: 🔄 In progress, started 2026-09-15 (plan step) · earlier: 🔲 Backlog
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
   > on [`0273`](../../backlog/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)
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

   🔴 **2026-09-17 — FOUR OF THE SIX RULES ARE DEFERRED, ON AN OWNER RULING. The text above stands
   unchanged; this records what can and cannot be built today.**

   **A CIRCULAR DEPENDENCY — found only because someone checked whether the metrics actually exist in
   the Uptrace metric picker.** In words: **`0274` cannot close until rules A1–A6 exist → four of those
   rules need metrics that only real player login traffic can create → that traffic needs the game
   server deployed → and `plan.md`'s *Deploy order* sequences the game deploy AFTER `0274` closes.** The
   loop closes on itself.

   ⛔ **THE DEPLOY ORDER IS NOT THE DEFECT — do not “fix” it.** The owner ruled earlier in this session
   that the game server deploys later, *“when we're ready to ship citizenship/profile”*, and **that
   ruling stands**. ⚠️ The lead had repeatedly and wrongly described the game deploy as an *unblocker*
   for this task; **the owner corrected it.** The real constraint is simply that four of the rules watch
   traffic that does not exist yet.

   **Verified in the LIVE Uptrace metric picker, 2026-09-17:**

   | Rule | Metric it needs | In the picker? | Disposition |
   |---|---|---|---|
   | **A1** — player-creation spike | `players.created` | ❌ absent | **DEFERRED** until real login traffic exists |
   | **A2** — created ÷ logins ratio | both login counters | ❌ absent | **DEFERRED** — already “create now, arm later” |
   | **A3** — login failures by `outcome` | `login.requests` | ❌ absent | **DEFERRED** until real login traffic exists |
   | **A4** — p95 login latency | `http.duration` | ✅ present | **The only other buildable one — NOT yet attempted** |
   | **A5** — DB pool saturation | `db.pool.waiting` | ✅ present | ✅ **BUILT** — monitor id 9, active |
   | **A6** — login request rate | `login.requests` | ❌ absent | **DEFERRED** until real login traffic exists |

   ⚠️ **WHY the four are absent — THIS IS NOT A CONFIGURATION ERROR TO FIX.** A metric appears in Uptrace
   **only once its counter is first incremented**. That was **proven tonight**: the first junk-Bearer
   request created `session_rejected` out of nothing. These four counters have never been incremented
   because no real player has ever logged in. There is nothing to configure; there is only traffic that
   does not exist.

   🔴 **OWNER RULING, given live in the lead session this turn via `AskUserQuestion`.** Three options were
   put — try a YAML-paste route that might bypass the metric picker / **defer A1 the way A2 already is**
   / keep `0274` open until go-live. **The owner chose: “Defer A1 like A2 already is.”** The reasoning
   stated in the option they selected: *the plan already says A2 is “create now, arm later — day 8 after
   go-live”; treat A1 the same, record it as deliberately deferred until traffic exists, and let `0274`
   close on the rules that CAN be built. Honest and unblocks the task, but it means closing `0274` with a
   named gap rather than a full set.* ⛔ **Not producer precedent.**

   **Scope of the ruling — recorded honestly.** The owner was asked about **A1**. **`fkit-lead` extended
   it to A1, A2, A3 and A6** — same cause (metric absent for want of traffic), same remedy, and A2
   already carried it — and **told the owner so explicitly in the same message rather than re-asking four
   times**; the four-rule table above was shown to the owner in that message. ⚠️ **Record this extension
   as the LEAD'S APPLICATION of the owner's ruling, NOT as a separate owner ruling.**

   ⚠️ **A4 IS NOT YET KNOWN TO BE BUILDABLE EITHER.** It is the only other rule whose metric is present,
   but **A4 needs a percentile query, which the architect recorded as UNVERIFIED against Uptrace 2.0.2**.
   It may turn out not to be expressible in this Uptrace version. **That is not yet known** — it has to
   be attempted before this step can be called finished.
4. **Drill:** force one alert and **watch the email arrive** (`0219` precedent). An alert that has
   never been seen to arrive does not count.

   🎯 **RAN AND PASSED 2026-09-17, ~20:06–20:16 UTC — lead-run, owner watching Telegram.** A real
   metric alert **fired and then cleared by itself**, and the owner confirmed live in the lead session
   (via `AskUserQuestion`, offered four outcomes) that **both** messages arrived in the Telegram Alerts
   topic — a **🚨 firing**, then a **✅ resolved**. Uptrace recorded `alert.status` = **`closed`**,
   `alert.type` = **`metric`**, value **25**. Full record: the *Drill* section of
   [`worklog.md`](worklog.md) and the Sprint 4 board addendum.

   ⚠️ **Naming:** this step is **verification step 6 = plan §7 step 6 (`plan.md:201`)**, written as
   **§7.6**. It has been called **"§8"** in several places, including `0277`'s review ledger and its
   close note. **Same step — there is no §8.**

   🚨 **THE PLAN'S FIXTURE IS DEFECTIVE — SUPERSEDED, DO NOT USE IT.** `plan.md` §7.6 says *"temporarily
   add an always-true rule (`process.memory.rss > 1`), wait for the Telegram message, delete the
   rule."* **That fixture cannot pass this drill.** An always-true rule **never clears**, so it proves
   only the 🚨 half; and **deleting a monitor is not a recovery event**, so no ✅ is ever produced. Run
   as written, the drill goes **green while proving nothing about the recovery path** — the exact
   silent-success failure this slice exists to close.

   ✅ **The working fixture, recorded as the correct procedure:** send junk-Bearer requests to the
   public read-only `GET /v1/profile` (each is a `401` that increments `session_rejected` with reason
   `invalid` — no writes, no rows, no restart); point a throwaway `>0 / 1 min` monitor at
   `geoconflict_profile_session_rejected` on the `alerts-to-telegram` channel; stop the requests and let
   it **self-clear**. ⛔ **`plan.md` is byte-frozen and was NOT edited** — this supersession is recorded
   here, the same handling the other superseded plan items on this task got.

   ⚠️ **THIS PASS DOES NOT SATISFY AMENDMENT A1.** A1 requires the drill to also establish delivery
   **after an idle period** (the stale-connection defect). **Both bursts in this run were minutes apart
   on a warm connection.** ⛔ **A PASS on §7.6 is not a discharge of A1.** `0283`'s daily digest remains
   the only non-circular proof of **sustained** delivery — unchanged.

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
   **Source:** [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md), and the
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
   time:** [`0067`](../0067-name-change-citizens-only/brief.md) shipped this notification,
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
   ids). 🎯 **PASSES — 2026-09-17, ~20:06–20:16 UTC.** A real metric alert fired and then **cleared by
   itself**; the owner confirmed live that **both** the 🚨 firing and the ✅ resolved message arrived.
   `alert.status` = **`closed`**, `alert.type` = **`metric`**, value **25**; drill monitor deleted
   afterwards and cleanup verified (9 monitors remain, A5 intact and active). See owner step 4 above
   for the fixture actually used, and for the **defect in `plan.md` §7.6's fixture**, which cannot
   produce a ✅ at all. ⚠️ **Bounded: this does NOT satisfy amendment A1** (delivery after an *idle*
   period) — both bursts were on a warm connection. · earlier: 🚨 **2026-09-17 — THIS STEP AS WRITTEN IS A SINGLE FORCED ALERT, AND A RELAY CARRYING THE
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

- **Depends on:** [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2 — the metrics hook into login), [`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md) (alert delivery — **without it the six rules A1–A6 fire into nothing and verification 6 / the drill cannot pass**)
- **Blocks:** [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live), [`0273`](../../backlog/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (its **game deploy** — owner ruling D2, 2026-09-16: S5 monitoring live **before** the S4 game deploy)
- **Can run in parallel with** `0272` (S3) and `0273` (S4).
- **Effort (design §9):** 2–2.5 days + owner UI time.
- 🚩 **Two post-go-live steps this slice cannot finish — flagged for the owner, not ruled:** arming A2
  on day 8 after go-live, and re-baselining A1–A6 after 14 days (Uptrace keeps ~14 days, `0263`; design
  §8 Q3 — loads per player). Recommendation: add both as dated items to `0217`'s post-go-live steps
  rather than a new task.
- 🔒 No secrets, DSNs, endpoints, hosts or email addresses in any artifact — variable names only.
- 🔭 **FOLLOW-UP WORTH FILING — NOT FILED HERE, AND NOT FILED BY THIS WORKER (2026-09-17).** The
  Uptrace UI offers **“New monitor from YAML”**, a free-text paste box that **bypasses the metric
  picker**. It was **LOOKED AT BUT NOT TESTED** — testing it is a write, and this worker does not make
  writes to the monitoring UI. Two separate things it *might* solve: **(a)** defining alert rules for
  metrics that **do not exist yet** — which would reopen A1/A2/A3/A6 before traffic exists; and **(b)**
  the standing risk that **monitors and channels are UI-only state** — `setup-telemetry.sh` seeds **no
  monitors and no channels**, so a box rebuild or a lost volume **silently deletes every alert rule**,
  and nothing would tell you. YAML definitions could live in the repo and be re-applied. ⚠️ **NEITHER
  (a) NOR (b) IS VERIFIED.** Both are plausible, both are untested. Recommend the owner file this as its
  own task rather than folding it into `0274`.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

### 🚩 Design input — 2026-09-17: this slice's alert drill can be passed by a relay that still drops alerts

⛔ **Constraint only — no design here, no status change, no new dependency.** The owning task is
[`0277`](../0277-uptrace-alert-delivery-to-telegram/brief.md), whose brief carries the full note;
the source is [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md),
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
