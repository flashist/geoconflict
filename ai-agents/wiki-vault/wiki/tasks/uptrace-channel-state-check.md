# Detect an Already-Disabled Uptrace Notification Channel — Check 13 (task 0285)

**Source**: `ai-agents/tasks/done/0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 25 (owner-ruled `Low`, moved Sprint 4 → 5 → 6) / task `0285`

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. 🚨 **Not yet seen to trip on the real
> box** — the owner's drill has not run. A guard nobody has watched fire proves nothing. Runbook:
> `ai-agents/knowledge-base/alert-delivery-runbook.md` § *The channel's own state — check 13*.
>
> 📌 **2026-09-29 — its production check is tracked by `0341`** (*Verify 0285 in production: deploy it and run its
> disabled-channel drill*), filed on Sprint 6 by owner ruling and moved to [[decisions/sprint-7]] (🔄 In progress
> since 2026-09-30). **Deployed 2026-09-29** ([[systems/weekend-deploy-window]]): the telemetry probe log reads
> `channel state: delivering`. ⚠️ **Still not done:** the hand-run probe after the profile deploy, the "no write"
> check, and **the drill** (the owner deferred it to a quiet day) — so check 13 has **still never been seen to trip**.
>
> ⛔ No hosts, IPs, URLs, chat or topic ids, or secrets on this page.

## Goal

Close the residual `0284` named first: its hourly probe catches the **cause** (the monitoring box cannot
reach the webhook), not the **state**. Uptrace 2.0.2 permanently and silently disables a channel on a
`401`/`403`/`404` reply — so a channel disabled by yesterday's transient failure leaves today's probe **green
while alerting is dead**. Read the monitoring stack's **own** channel record instead, and report it through
`0284`'s marker and dead-man's-switch path — never through the alert path it checks. Detection only; no
automatic re-enable. Kept separate from `0284` by owner ruling D4 — do not fold it back.

## Key Changes

- **Owner rulings (verbatim, 2026-09-28):** Q1 **"Add a line to hourly hello (Recommended)"** — one extra field
  in the existing probe message; Q2 **"Alert every run; catch upgrades in tests (Recommended)"**; Q3 **"One SQL
  update, re-enable in UI (Recommended)"** (the drill); Q4 **"I run them (Recommended)"** (the owner runs the
  box queries); Q5 **"The one the probe sends to (Recommended)"** — the channel whose address equals the
  probe's.
- **Schema, confirmed read-only on the box by the owner (names and counts only):** table `notif_channels`,
  column `status`, enum `draft` / `delivering` / `paused` / `disabled` (default `delivering`); the vendor's own
  disable writes `status = 'disabled'`. A webhook channel's `params` has `url` and `payload`; the probe selects
  only `url`, **never** `payload` (where the shared secret lives). Matched the binary evidence — the build went
  ahead.
- **Built:** the probe (in `setup-telemetry.sh`) runs one fixed read-only `SELECT` under a read-only
  transaction with bounded timeouts, keeps the channel(s) whose URL equals the probe's own, worst state wins,
  and adds `channel_state` to the same POST; the relay copies a sanitised value into the same marker;
  `profile-checks.sh` **check 13, `alert-channel-state`**, FAILs on anything but `delivering`. An image upgrade
  cannot cause surprise nightly pages: the hardening harness fails `npm test` if the compose tag stops matching
  the probe's `Schema verified against: uptrace/uptrace:2.0.2` line.
- **Reviews:** `timeout -k 5 20`; the unreadable-state log now names the real cause per exit code (`rc=1` =
  query failed — schema change or `statement_timeout`; `rc=2` = cannot connect; `timed out`/`killed` = the docker
  client hung).

## Outcome

- **Deploy order:** profile box first, then the monitoring box, in one window before 08:00 UTC, then run the
  probe by hand — check 13 FAILs ("no `channel_state`") until the first probe carrying a state arrives.
- **What a green check 13 does NOT prove:** that the vendor always updates `status`; the channel's own copy of
  the secret; that a monitor is attached; Telegram delivery or a human seeing it (`0274` A1).
- **Not verified — owner steps:** the real run on the box; **the drill** (disable the channel with one SQL
  update, run the probe, force the checks, see the dead-man's switch page with `alert-channel-state … DISABLED`,
  re-enable in the UI, see OK); "no write" shown on the real stack. The exit-code mapping was measured on psql
  16 locally, not on the box's Postgres 17.
- `0289` (prove a Telegram alert arrives after idle) is **blocked on this drill** (Sprint 6 board).

## Related

- [[tasks/alert-path-liveness-probe]] — task `0284`, the probe and marker this extends
- [[systems/alert-delivery]] — the relay, the marker and the checks
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the relay and the silent-disable finding
- [[decisions/adr-114-admin-server-alert-relay]] — why the relay lives on the profile/admin box
- [[systems/telemetry]] — the monitoring box and its Postgres
- [[decisions/sprint-6]] — the board carrying this task
