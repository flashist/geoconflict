# Alert Delivery to Telegram — the relay that made an alert reach a human at all

**Source**: `ai-agents/tasks/done/0277-uptrace-alert-delivery-to-telegram/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0277`

> ⛔ **No hostnames, IPs, chat ids, topic ids or tokens on this page** — the source brief and runbook are
> written under that rule and the vault honours it.

## Goal

**Close a blocker found while planning `0274`: the monitoring stack on the telemetry box could not
deliver any alert notification at all.** The config `setup-telemetry.sh` writes had **no mail section and
no Telegram bot token — no channel of any kind**. So `0274`'s six alert rules would have been created,
would have fired correctly, and would have **reached nobody**. **An alert nobody receives is not
monitoring.**

It also closed an item open for three months: *"need to confirm whether the telemetry VPS can reach
Telegram at all"*, unchanged since 2026-06-04.

## Key Changes

**Branch B shipped — the webhook relay, not Uptrace's own notifier.** The brief pre-approved both
branches and made a **local proof (step 0) decide**, with an explicit owner ruling that **no second
round-trip was needed to switch**.

- `POST /internal/v1/alerts/webhook` on the profile/admin box, behind the existing nginx `/internal/`
  allowlist plus a constant-time secret comparison, with the secret carried **in the JSON body** because
  Uptrace 2.0.2 sends exactly two headers and has no custom-header field.
- Telegram **topic routing** for the two senders on that box (`TELEGRAM_TOPIC_ALERTS`,
  `TELEGRAM_TOPIC_NAME_CHANGES`); blank ⇒ General, the pre-`0277` behaviour.
- **Scope grew by owner ruling (ND-2): this task also carries the `0061` connection fix for all three
  consumers** — alerts, name-change notifications **and** player feedback. **One fix, three consumers**,
  because the same shared helper underlies all three and doing them separately means designing the same
  fix twice while shipping alerting that silently drops messages in the meantime.
- `disable_web_page_preview: true` on the Telegram send — landed **after** the review closed out, which
  is why the gates were re-run.
- The operator runbook `ai-agents/knowledge-base/alert-delivery-runbook.md`, which has since grown into
  the ground truth for this whole area.

🔗 **`0061` was SCHEDULED by this task's ruling.** The owner **overturned their own 2026-08-23 Backlog
ruling** on the grounds that its stated reason (*"an investigation with no known fix"*) no longer held
once the failure was reproduced. ⚠️ **Pairing is not blocking** — `0061` is still an investigation, its
mechanism is still a **hypothesis reproduced behaviourally and not confirmed in code**, and it was
deliberately **not** made a `Depends on`.

**Gates, re-run after the review closed out:** `npm test` **137 suites / 1834 tests, all passed**, 55.4 s,
first run, no flake hit · `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 ·
`npm run check:config-parity` exit 0, **profile REQUIRED 0 / INFO 0 / ALLOWED 0**.
⚠️ **Two limits of that parity line, not glossed:** the check is **report-only and cannot fail a deploy**,
and the three Telegram variables sit in the **INERT** list — recorded for phase 2, **not enforced today**.

## Outcome

🎯 **LIVE PRODUCTION EVIDENCE, 2026-09-17, owner-observed.** The owner deployed the profile box and the
lead pressed *Test channel*. The box's request log recorded a lead probe correctly **403**'d by the
allowlist, then two `202`s from the monitoring stack. The owner confirmed by screenshot the message that
arrived in the Alerts topic. **Four checks pass:** the status line renders · **no `{{ }}` placeholders**
(the defect the first press exposed) · the link is a tappable *open the alert*, not a raw address · **no
link-preview card exposing a hostname** — the only way `disable_web_page_preview` could ever be tested.

⚠️ **Scope of that proof, exactly: it proves the transport, auth, format and rendering of a SYNTHETIC
TEST MESSAGE. It does not prove a real alert.**

✅ **The real alert came the same day**, in the recovery drill — see [[systems/alert-delivery]]. Both
halves arrived: a 🚨 firing message and a ✅ resolved one, owner-watched. That closed the standing
residual that a recovered alert might render as still firing: **`alert.status` = `closed`**, which the
relay already matched — **written to match `closed`/`resolved` without anyone knowing which value 2.0.2
emits, and it happened to be right.**

**Closed 2026-09-17 by a spawned `fkit-producer` on an OWNER RULING.** The owner was offered
close-now / hold-for-the-drill / owner-verify-first, was told plainly that two residuals could only be
proven by a real alert firing and then clearing, and chose **"close now, agent-closed"** — the marker
states honestly that nothing was verified in production *use*, the close unblocks `0274` / `0283` /
`0284`, and the residuals stay visible on those follow-ups. ⛔ **Not producer precedent — one owner ruling
on one task.**

### Residuals that survive this close

The full list is 1–11 in the task's `review.md` — **do not re-derive it**. The loudest:

- **1a-ii** — a synthetic test exercises no real `alert.name` and no real `alert.status`. *(Since
  discharged by the drill.)*
- **3** — 🚨 the `/internal/` allowlist **403 trap**: a source-IP miss **permanently and silently disables
  the channel**. Owner ruling B accepted it knowingly; **the real guard is
  [[tasks/alert-path-liveness-probe]]**.
- **5** — best-effort un-marking, in the **unsafe** direction: a crash between the 202 and a delivery
  failure **loses the alert**.
- **6** — no shutdown drain.
- **8** — ⛔ **`0061` is fixed in the tree but UNSHIPPED** until the game deploy. **Do not read "0061 is
  fixed" off this task.**
- ⚠️ **`npm run check:config-parity` does not reach telemetry variables** — the shell harness is the only
  guard those two deploy variables have.

### Two things this task deliberately did NOT do

- ⚠️ **No alert rules existed when it closed.** The Monitors list held only the default *"Notify on all
  errors"* entries. **This task shipped a proven pipeline with nothing feeding it** — that is `0274`'s
  work, not a gap here.
- 🚩 **Sustained delivery is NOT proven by this task, and cannot be**: an alert about the alert path
  travels the alert path. The only non-circular proof is `0283`'s daily zero-count beat. ✅ **UPDATED
  2026-09-19 — that beat is BUILT, DEPLOYED AND OBSERVED DELIVERING**, two real messages watched by the
  owner, **both reading `Waiting for review: 0`** — so the zero-count ruling is verified in production
  ([[tasks/name-change-daily-digest]]). ~~**unbuilt**~~ 📌 **struck, true when written.** ⛔ **Nothing about
  THIS task's residuals changes**: the digest proves Telegram delivery from the admin box and **nothing
  about the alert channel** — it never travels the allowlist and never leaves from the monitoring box's
  address, so residual **3** stands untouched.

## Related

- [[systems/alert-delivery]] — the system this built, its traps and its operator procedures
- [[decisions/adr-114-admin-server-alert-relay]] — the ADR that placed the relay on the admin box
- [[tasks/alert-path-liveness-probe]] — task `0284`, which guards this task's accepted 403 risk
- [[tasks/name-change-daily-digest]] — task `0283`, which this close unblocked; it inherits this task's topic routing and connection fix rather than forking them
- [[systems/telemetry]] — the monitoring stack the alerts come from
- [[systems/player-profile-store]] — the admin box the relay runs on
- [[tasks/citizenship-name-change]] — task `0067`, whose operator notification shares this topic routing
- [[decisions/sprint-4]] — the sprint that owns it
