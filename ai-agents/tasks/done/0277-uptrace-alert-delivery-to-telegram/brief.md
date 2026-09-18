# Uptrace alert delivery to Telegram — today an alert rule on the telemetry box reaches nobody

## ID
0277

> ℹ️ **ID allocation, checked 2026-09-16 before filing.** `0277`: no folder under
> `ai-agents/tasks/{backlog,done,cancelled}/`, no `## ID` hit, no repo-wide hit. Highest existing ID
> was `0276`.

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly above `0274`**, because `0274` cannot finish without it and `0274`
gates the S4 game deploy (ruling D2) and XP go-live (`0217`). Appended at the bottom (ADR-035), not
inserted — closed rows sit below the merit position.

## Status
✅ Done (agent-closed — not owner-verified) — **closed 2026-09-17 by a spawned `fkit-producer` on an OWNER RULING given live in the lead session via `AskUserQuestion` and relayed by `fkit-sprint-ship-loop`.** The owner was offered close-now / hold-for-the-§8-drill / owner-verify-first, was told plainly that two residuals can only be proven by a real alert firing and then clearing, and chose **"close now, agent-closed"** — because the marker states honestly that nothing was verified in production *use*, the close unblocks [`0274`](../../backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) / [`0283`](../../backlog/0283-daily-digest-of-pending-name-change-reviews/brief.md) / [`0284`](../0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md), and the residuals stay visible on those follow-ups. ⛔ **Not producer precedent — one owner ruling on one task.** **Gates, re-run 2026-09-17 by a spawned coder AFTER the review closed out** (required because `disable_web_page_preview` landed post-review): `npm test` **137 suites / 1834 tests, all passed**, 55.4 s, first run, no flake hit and nothing re-run for a failure · `npx tsc --noEmit` exit 0, zero diagnostics (no typecheck script exists) · `npm run lint` exit 0 · `npm run check:config-parity` exit 0 — game REQUIRED 0 / INFO 6 / ALLOWED 4, **profile REQUIRED 0 / INFO 0 / ALLOWED 0**, client REQUIRED 0 / INFO 1 / ALLOWED 15, INERT 6. ⚠️ **Two limits of that parity line, stated not glossed:** the check is **report-only and cannot fail a deploy**, and `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL` sit in the **INERT** list — recorded for phase 2, **not enforced today**. Neither is new; neither certifies deploy-time forwarding. The post-review change is exercised: `disable_web_page_preview: true` (`src/core/notifications/TelegramNotifier.ts:174`) is asserted twice in `tests/core/TelegramNotifier.test.ts`. 🎯 **LIVE PRODUCTION EVIDENCE, 2026-09-17, owner-observed.** Owner deployed the profile box; the lead pressed **Test channel**. Box request log: `16:41 curl/8.7.1 → 403` (the lead's own probe, correctly refused by the allowlist) · `16:56 Uptrace/1.0 → 202` (first test, previous build — delivered with literal `{{ }}` placeholders) · `18:53 Uptrace/1.0 → 202` (after the fix, current build). Owner confirmed by screenshot the message that arrived in the Alerts topic (`🚨 Geoconflict · profile · Test message` / `Status: firing` / `Since: 2026-09-17 18:53 UTC` / `→ open the alert`). **Four checks pass:** status line renders · **no `{{ }}` placeholders** (the defect the first press exposed) · the link is a tappable *open the alert*, not a raw address · **no link-preview card exposing a hostname** — the only way `disable_web_page_preview` could ever be tested. ⚠️ **Scope of that proof, exactly:** it proves the **transport, auth, format and rendering of a synthetic test message**. It does **not** prove a real alert. This closes review residual **1a** (message content unproven); it does **not** touch **1a-ii** or **2**. 🚩 **Residuals that survive this close — full list 1–11 in [`review.md`](review.md), do not re-derive.** Loudest: **1a-ii** — a synthetic test exercises no real `alert.name`, no real `alert.status`, and never produces the resolved/recovery form; **2 (D8)** — `alert.status`'s value vocabulary is **UNVERIFIED**, `AlertRelay.ts:141` matches `closed`/`resolved` and anything else renders as **firing**, so a recovered alert may still show a 🚨 (safe direction — noise, not a missed incident — but unproven); **both close only on `0274`'s §8 drill with a real alert that fires and then clears.** Also live: **3** the `/internal/` allowlist-403 trap (owner ruling B — a source-IP miss permanently and silently disables the channel; the real guard is `0284`) · **5** best-effort un-marking, the **unsafe** direction (a crash between the 202 and a delivery failure loses the alert) · **6** no shutdown drain · **8** **`0061` is fixed in the tree but UNSHIPPED** until `0273`'s game deploy — do not read "0061 is fixed" off this task. ⚠️ **No alert rules exist yet** — the Monitors list holds only default "error: Notify on all errors" entries; `0274`'s A1–A6 are uncreated. This task ships a **proven pipeline with nothing feeding it**; that is `0274`'s work, not a gap here. 🚩 Sustained delivery is still **not** proven by this task — only `0283`'s daily zero-count beat is non-circular. · earlier: 🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop) · **plan approved by the owner 2026-09-17** ([`plan.md`](plan.md) written, 616 lines, build worker running) — ⛔ do not re-plan. **Scope grew by owner ruling ND-2:** this task now also carries the **`0061` connection fix for all three consumers** (alerts, name-change notifications **and** player feedback) — one fix, three consumers — plus Telegram topic routing for the two senders on this box. ⚠️ **Two deploys at different times:** the profile box ships with this task; the `Master.ts` (feedback) half is **written and tested but unshipped** until `0273`'s already-pending game deploy, so feedback keeps dropping messages on a stale socket until then — *fixed in the tree, unshipped*, and must not be recorded as "fixed". 🚩 **Sustained delivery is NOT proven by this task** — an alert about the alert path travels the alert path; the only non-circular proof is [`0283`](../../backlog/0283-daily-digest-of-pending-name-change-reviews/brief.md)'s owner-ruled daily zero-count beat. Also open: ND-1 (Uptrace's exact webhook body — architect consult in flight; the plan states the safe-degrading fallback). · earlier: 🔲 Backlog
## Owner
fkit-coder

⚠️ Plus **owner steps** — the throwaway bot, the ops chat/topic, and the box deploy. This cannot close
on code alone.

## Context

**Filed 2026-09-16 by a spawned `fkit-producer` on OWNER RULINGS given live in the lead session and
relayed by `fkit-sprint-ship-loop`.** The blocker was found while planning `0274` (S5 monitoring).

### The blocker, stated plainly

**Uptrace on the telemetry box cannot deliver any alert notification today.** The Uptrace config that
`setup-telemetry.sh` writes has **no mail section and no Telegram bot token** — no channel of any kind.
So `0274`'s six alert rules A1–A6 would be created, would fire correctly, and would **reach nobody**.
An alert nobody receives is not monitoring.

This also closes an item that has been open for three months:
`ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md:184`, **open question 3** —
*"Need to confirm whether the telemetry VPS can reach Telegram at all"* — unchanged since 2026-06-04.
(The same list's question 4, separate alerts chat vs the feedback chat, is answered by the destination
ruling below.)

### Architect findings carried in — all read-only-verified against the shipped `uptrace/uptrace:2.0.2` image

- Uptrace 2.0.2 ships `telegram`, `webhook`, `slack`, email and other channel types (package
  `alerting`; constructors `NewTelegramNotifier`, `NewWebhookNotifier`). **The capability exists — it is
  simply not configured.**
- The Telegram channel needs a **global** config key — `telegram:` with a `bot_token` value. The
  **webhook** channel needs **no** config change at all: it is created entirely in the Uptrace UI.
- The Uptrace config file supports `${VAR}` interpolation — verified in the 2.0.2 embedded config
  reference.
- 🚨 **UNVERIFIED AND PIVOTAL: whether Uptrace honours `HTTPS_PROXY` for its notifier calls.** There is
  **no proxy config option in 2.0.2.** Telegram's servers are blocked from Russian IPs and **every box
  in this project is reg.ru / Moscow**. If the proxy is not honoured, the direct route cannot work at
  all — hence the local proof below, and the pre-approved fallback.
- The `uptrace` service block in `setup-telemetry.sh` (around lines 507-522) has **no `environment:`
  key**, so adding one is a clean edit rather than a merge into existing values.
- **A proven non-Russian egress already exists in this project** as the `TELEGRAM_PROXY_URL` variable
  (`src/core/notifications/TelegramNotifier.ts`, enforced in `setup-profile.sh` around lines 789-800).
  ⚠️ **It is NOT threaded into the telemetry pipeline** — `setup-telemetry.sh` and
  `build-deploy-telemetry.sh` contain **zero** occurrences of it.
- ⚠️ `setup-telemetry.sh` sets **no file mode** on the Uptrace config file, which **already holds the
  project token and the admin password**. Fix the mode in this same pass.
- ⚠️ `scripts/check-config-parity.mjs` (around line 68) covers `game` / `profile` / `client` only, so
  **telemetry env vars are outside the parity checker's reach** — no automated guard will notice a
  variable the deploy forgets to forward.
- `tests/scripts/profile-deploy-hardening.test.sh` already carries **13 structural assertions over
  `setup-telemetry.sh`**; **none** touch the Uptrace config heredoc, so adding a section breaks nothing,
  and adding assertions for the new section is the `0201` / `0219` precedent.

### Owner rulings — 2026-09-16, recorded so they are not re-litigated

- **Approach: try the direct route first** — Uptrace's own Telegram channel plus `HTTPS_PROXY` on the
  uptrace container (~0.5 d). **Fallback, PRE-APPROVED:** Uptrace **webhook** → an authed route on the
  game server → the existing `sendTelegramMessage` through the existing proxy (~0.5–1 d).
  ⛔ **No second owner round-trip is needed to switch to the fallback** — if the proof below shows the
  proxy is not honoured, take the fallback and say so.
- **A local proof runs FIRST, before any build:** stand the 2.0.2 stack up on the laptop with a
  **logging proxy** and a **throwaway bot token**, fire one monitor, and see whether the proxy is
  honoured. ⛔ **Nothing touches any VPS in this step.** **The owner is creating the throwaway bot.**
- **Destination: a separate ops chat or topic** — **not** the existing player-feedback chat.
- **Bot token: via container env + `${VAR}` interpolation, NOT inline in the Uptrace config file.**
  Fix that file's mode in the same pass.

### 🚩 DESIGN INPUT discovered BEFORE the build — 2026-09-17: the relay must not inherit a fail-silent Telegram send

⛔ **Constraint only. The design is the architect's / coder's — nothing here rules the fix shape.**
⛔ **No status change.**

**Source:** [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md), which was
**reproduced in production on 2026-09-17** (by our own proxy restart — a clean experiment, not an
organic failure). Read that brief's *"REPRODUCED IN PRODUCTION"* section for the full evidence.

**The mechanism, stated as the hypothesis it is — reproduced behaviourally, NOT yet confirmed in
code:** a **module-level `ProxyAgent`** is built once at process start and reused for the life of the
process. undici pools keep-alive connections. When the proxy restarts, or a socket goes stale on an
idle / NAT timeout, the agent hands out a dead socket; the send fails at the **network layer** with
`TypeError: fetch failed` — not a Telegram rejection — and the *next* send succeeds because the dead
socket has been evicted.

**Why this lands on THIS task:** the relay sends Telegram messages **through the same proxy**, and
`src/core/notifications/TelegramNotifier.ts` — the shared helper *"What to build"* step 3 below
explicitly reuses — has **the same module-level-agent pattern** (`:56-67`, keyed by proxy URL) and
**no retry**. It has a 10 s timeout, which the two inline copies in `Master.ts` lack, but a timeout
is not a retry.

🚨 **The consequence, and it is the reason this is flagged loudly and early:**

> **An alert firing after a stale connection would be SILENTLY DROPPED, and nobody would ever learn
> it happened.** `sendTelegramMessage` never throws by contract — every failure resolves to a result
> value — and the profile box's existing caller
> (`src/profile-server/NameChangeRepository.ts:542`) discards it with `void`. **That is precisely the
> failure alerting exists to prevent, and it would be invisible.** An alert relay that can drop
> alerts without saying so is worse than no relay, because it manufactures false confidence.

**What this brief therefore requires of the build — outcome, not design:** the relay must handle
**connection-level failure explicitly** — retry, or at minimum **detect and report** — rather than
inherit the fail-silent behaviour. Both branches are affected, differently:

- **Branch B (webhook relay):** inherits the defect **directly**, since it calls the shared helper.
- **Branch A (Uptrace's own notifier):** ⚠️ **UNVERIFIED** — Uptrace 2.0.2's notifier is its own HTTP
  client, not ours, and **whether it retries a connection-level failure is unknown**. If branch A is
  taken, that is a question to answer, not to assume.

### 🔗 OWNER RULING 2026-09-17 — `0061` IS SCHEDULED, AND THIS TASK IS FIXED TOGETHER WITH IT

⛔ **Authority first:** an **owner ruling**, dated **2026-09-17**, given **live in the lead session**
and relayed by `fkit-sprint-ship-loop` to a spawned `fkit-producer`. ⛔ **Not producer precedent** — a
producer never promotes a task or overturns a ruling on its own.

**What changed:** [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) is no
longer unscheduled. **The owner overturned THEIR OWN 2026-08-23 Backlog ruling** — on the grounds that
its stated reason (*"an investigation with no known fix"*) no longer holds now that the failure is
reproduced and a likely fix shape exists, and that **this task's relay would otherwise inherit the same
defect and the same fix would be designed twice**. `0061` now sits on **Sprint 4**, appended (ADR-035);
its August ruling is kept in full, not deleted.

**⇒ The design-input note below is UPGRADED by that ruling, and this is the operative sentence:**

> **`0061` and `0277` are worked TOGETHER — one fix, three consumers.** The same shared notification
> code (`src/core/notifications/TelegramNotifier.ts`, plus the two inline copies in `Master.ts`)
> underlies **player feedback** (`0061`), the **name-change operator notification**
> (`src/profile-server/NameChangeRepository.ts:542`, from `0067`) **and** this **alert relay**. **One
> fix covers all three.** Doing them separately means designing the same fix twice **and** shipping
> alerting that silently drops messages in the meantime.

⚠️ **What this does NOT change:** `0061` is still an **investigation** whose step 1 (log `err.cause`)
comes first, the mechanism is still a **hypothesis reproduced behaviourally and not confirmed in
code**, and `0061` is **not** a formal `Depends on` for this task — the `Depends on` line in *Notes*
is deliberately unchanged. **Pairing is not blocking.** ⚠️ **This relationship is recorded in BOTH
briefs.** If you change it here, change it there.

### Also recorded — 2026-09-17: the profile box's egress to Telegram is FIXED, and it was a zero-code fix

The owner added **the profile box's egress IP** to the allow list on **the egress proxy host**; the
lead then verified **read-only from that box**:

| Path | Result | Reading |
|---|---|---|
| direct to Telegram | `000` | blocked — **expected**, and the reason a proxy exists at all |
| **through the proxy** | **`302`** | a real answer — the proxy path works |
| the Bot API path | `404` | a real answer, not a network failure |

**Consequence:** the **name-change operator notification's** silent failure is a **zero-code fix** —
exactly as the architect predicted. It is recorded here and on
[`0067`](../0067-name-change-citizens-only/brief.md) (which is Done and whose close-out
flagged proxy reachability as never exercised). ⚠️ **No task on any board owns verifying that
notification end to end** — see *Notes*.

## What to build

1. **Step 0 — the local proof (no VPS, no build).** Run `uptrace/uptrace:2.0.2` locally behind a proxy
   that logs every connection, with the owner's throwaway bot token supplied through container env and
   `${VAR}` interpolation. Create one monitor, force it to fire, and record **whether the notifier call
   went through the proxy**. **Write the answer into `worklog.md` before writing any deploy code** — it
   decides which of the two branches below is built.
2. **Branch A — direct (build only if step 0 proves the proxy is honoured):** add the global
   `telegram:` section with the token read from an env variable to the Uptrace config that
   `setup-telemetry.sh` writes; add an `environment:` key to the `uptrace` service carrying the token
   and the proxy variables; thread the values through `build-deploy-telemetry.sh` the way the existing
   telemetry secrets are threaded.
3. **Branch B — webhook relay (build if step 0 proves it is not):** an **authenticated** alert-webhook
   route on the game server that forwards the alert payload to `sendTelegramMessage` through the
   existing proxy. Reuse `src/core/notifications/TelegramNotifier.ts` and the existing
   `TELEGRAM_PROXY_URL` — ⛔ **do not add a second Telegram client or a second proxy variable.** The
   Uptrace side of branch B is **UI-only** (no config change).
4. **Both branches — file mode.** `setup-telemetry.sh` must set an owner-only (`0600`) mode on the
   Uptrace config file. It already holds the project token and admin password; the bot token makes that
   worse.
5. **Both branches — shell-harness assertions.** Add assertions to
   `tests/scripts/profile-deploy-hardening.test.sh` for whatever this task adds to
   `setup-telemetry.sh` (the new section or the relay's variables, plus the file mode), following the
   13 existing telemetry assertions. ⚠️ The parity checker cannot cover telemetry variables, so the
   harness is the only guard available — see *Notes*.
6. **Runbook line** under `ai-agents/knowledge-base/`: which branch shipped, which variables the deploy
   must carry, and how to rotate the bot token. **Variable names only** — no token, no chat id, no host.

### Owner steps

1. **Create the throwaway bot** for step 0 (owner is doing this) and, separately, the **real** bot for
   the ops destination.
2. **Create the separate ops chat or topic** and add the bot to it.
3. **Deploy the telemetry box** with the new variable(s) populated (owner runs the deploy).
4. **Drill: force one alert and watch the message arrive in the ops chat.** `0219` precedent — an alert
   that has never been seen to arrive does not count.

## Verification steps

1. **Step 0 recorded:** `worklog.md` states, as a yes or no with the proxy log as evidence, whether
   Uptrace 2.0.2 honours `HTTPS_PROXY` for notifier calls — **and which branch was therefore built.**
2. The bot token appears **nowhere** in the Uptrace config file on the box — only as a `${VAR}`
   reference (check the rendered file on the box after deploy).
3. The Uptrace config file on the box is mode `0600`.
4. `tests/scripts/profile-deploy-hardening.test.sh` passes with its new assertions, and `npm test`
   (which gates the harnesses) is green.
5. **A forced alert arrives in the ops chat** — the drill above. Worklog records date and rule; ⛔ no
   chat id, no token, no host.
6. The message lands in the **ops** chat/topic, **not** the player-feedback chat.
7. Branch B only: the webhook route **rejects an unauthenticated request**, and the game server's
   existing feedback delivery still works (regression check).
8. `npx tsc --noEmit` and `npm run lint` exit 0; `npm run check:config-parity` clean (⚠️ it will **not**
   cover the new telemetry variables — see *Notes*).

## Notes

- **Depends on:** nothing (the local proof needs only Docker and the owner's throwaway bot)
- **Blocks:** [`0274`](../../backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) (S5 — its
  *"an alert actually arrives"* verification and its alert drill cannot pass until this lands), and
  therefore transitively [`0273`](../../backlog/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)'s
  **game deploy** (ruling D2) and [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md)
  (XP go-live)
- **Effort:** ~0.5–1 day of build **plus** the local proof (step 0).
- ⚠️ **The build branch is not decided yet, and deliberately so.** Step 0 decides it. Do **not** write
  deploy code before the proof is recorded — the pivotal fact (proxy honoured or not) is unverified.
- ⚠️ **No automated parity guard exists for telemetry variables** (`scripts/check-config-parity.mjs`
  covers `game` / `profile` / `client` only). A variable the deploy forgets to forward will be caught by
  the shell harness or by nothing. This is a known residual, recorded so it is not mistaken for
  coverage.
- **Design input (2026-09-17, NOT a block):**
  [`0061`](../../backlog/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) — the stale-pooled-
  socket hypothesis above. `0061` stays open and unscheduled; this task does **not** wait on it, but
  must not ship a relay that drops alerts silently.
- ✅ **RESOLVED 2026-09-17 by an OWNER RULING — was: "Open, unowned".** ~~🚩 **Open, unowned — flagged
  for the owner, not ruled.** The **name-change operator notification**
  (`src/profile-server/NameChangeRepository.ts:542`, shared helper, profile box) now has a working
  egress path, but **no task on any board owns verifying it end to end**. `0067` is Done and routed
  that verification to `0033`; `0033`'s brief never picked it up. It is a ~5-minute live check, not a
  task's worth of work — the owner may want it folded into a deploy drill rather than filed.~~
  **The owner ruled exactly that, live in the lead session on 2026-09-17: FOLD IT INTO THE NEXT
  PROFILE-BOX DEPLOY DRILL, file NO separate task.** It is ~5 minutes of live checking on a deploy that
  has to happen anyway. **It is recorded on
  [`0274`](../../backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md)'s owner steps**, which
  own that drill. **What must be proven:** an operator notification for a name-change request
  **actually arrives and is observed** — ⛔ not merely that the send returned `sent`. ⚠️ **The dropped
  handoff is named explicitly on `0274` so it cannot be dropped a second time.** Struck text kept, not
  deleted.
- **Feeds:** [`0283`](../../backlog/0283-daily-digest-of-pending-name-change-reviews/brief.md) — a **new
  requirement** ruled by the owner on 2026-09-17: a once-per-24-h digest to the **Name Changes topic**
  saying how many players are waiting for a name review. It **depends on this task's topic-routing
  work**. ⚠️ **Flagged honestly:** this brief as written does not yet describe a topic-targeting slice
  from the profile box — `0283` records the dependency as the lead stated it and says to **confirm it
  against this task before planning**. If topic targeting ends up owned elsewhere, correct `0283`'s
  `Depends on` line rather than working around it.
- 🛡️ **The alert-channel death guard is FILED AS A FOLLOW-UP AND IS EXPLICITLY NOT IN THIS TASK'S
  SCOPE — its absence here is deliberate, not an oversight.** Recorded 2026-09-17 so a reviewer does
  not read it as a gap.
  [`0284`](../0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  owns it, on an **owner ruling (2026-09-17): file it, build it after `0277`.** **What it guards:** the
  architect disassembled `uptrace/uptrace:2.0.2` and found that a **`401`, `403` or `404` from a
  webhook endpoint calls `NotifChannelGateway.Disable`** — so if branch B's relay sits behind the
  profile box's nginx `/internal/` allowlist (which **returns 403 to a non-allowed source address**),
  a changed, mistyped or dropped telemetry-box egress address means **the first alert after that
  disables alerting permanently and silently**. **The owner accepted that knowingly** (ruling B,
  2026-09-17: keep the allowlist, document the IP-change hazard). ⛔ **Do not build the probe or the
  `profile-checks.sh` marker check here** — it needs this task's route to exist first. ⚠️ **Two things
  this task SHOULD still do in passing:** the runbook line in *What to build* step 6 is the natural
  home for the *"if the telemetry box's egress address changes, update `PROFILE_INTERNAL_ALLOW_IPS` in
  the same change or alerting dies silently"* warning (`0284` extends that line rather than writing a
  second one), and if branch **A** ships instead of branch B, **`0284`'s probe target changes and it
  must be re-scoped** — say so in the worklog.
- **Related:** `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md` — this task
  answers its open question 3 (Telegram reachability from the telemetry VPS) and its question 4
  (separate alerts chat). The rest of that document's heartbeat/dead-man's-switch scope is **not** in
  this task.
- 🔒 **No secrets in any artifact** — no bot token, no chat id, no DSN, no host, no IP, in the brief,
  the worklog, the runbook line or a test fixture. Variable names only.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
