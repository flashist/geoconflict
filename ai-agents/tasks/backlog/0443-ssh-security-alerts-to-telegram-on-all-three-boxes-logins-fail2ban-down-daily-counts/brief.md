# SSH security alerts to Telegram on all three boxes — every successful login, fail2ban down, daily counts

## ID
0443

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` was
> `0442`. No `tasks/*/0443*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim selection: **"All three
> (Recommended)"** — option text: *"Login alert + fail2ban-down alert + daily counts, on game, profile and telemetry. One
> task in Sprint 8, right after 0441/0442."*
>
> **"One task" is the owner's call** — it overrides the producer's usual split into smallest shippable units. The three
> parts below are steps of one task, not separate briefs.

## Priority
40

⚠️ **Priority 40 is append rank (ADR-035: no insert above closed rows). Its real place is RIGHT AFTER `0441`/`0442`, by
owner ruling 2026-10-12** — third in line on [Sprint 8](../../../sprints/plan-sprint-8.md), directly below `0442`.

## Status
🔲 Backlog

## Owner
fkit-coder — ⚠️ **every change on a live box is EXECUTED OR APPROVED BY THE OWNER (human)**, in the weekend deploy slot
unless the owner rules sooner. Any change to the Telegram proxy's allow list is the owner's. A read-only check over SSH
(step 1) may be run by an agent session with the owner's OK given in-session.

## Context

**In plain terms.** Bots try to guess our server passwords thousands of times a day. `0441`/`0442` stop the guessing
from ever working. This task makes sure **we hear about it** when something important happens: (a) someone actually
logs in, (b) the guard that blocks guessers (fail2ban) stops running, (c) once a day, how many guesses and bans each
box saw. **No message per failed guess** — that would be thousands a day and we would stop reading them.

**Facts on filing** (read-only check by `fkit-lead`, 2026-10-12, relayed; not re-checked by the producer):
- Game prod: 3,151 failed logins in the last 24 h. Telemetry: 2,182 in 24 h; fail2ban 19,069 failed / 3,129 banned in
  total. Profile: key-only already; fail2ban sshd jail installed by `setup-profile.sh` (task `0221`).
- ⚠️ **fail2ban on the game box was installed by hand** — `setup.sh` has no fail2ban section (per `0441`). A rebuilt game
  box would come back with no fail2ban. The fail2ban-down alert below would catch that, but not prevent it.

**Background — past logins reviewed 2026-10-12.** `fkit-lead` reviewed the successful SSH logins on all three boxes
(read-only). Every source matched the owner's home and mobile networks seen on the key-only profile box, except
**7 sources** on hosting/VPN or mobile networks: 6 on the game box (Nov 2025 ×3, Apr 2026 ×2, Jul/Aug 2026 ×1) and 1 on
telemetry (Sep 2026). The Jul/Aug 2026 one was confirmed as the owner's VPN (exact match, tested live).
> 📌 **OWNER RULING, 2026-10-12, `fkit lead` session** (relayed by `fkit-lead`; ⛔ not producer precedent), verbatim:
> *"I think we should ignore the 2025 logins, it could be me but from different countries/VPNs. The one from the
> Apr.2026 also probably me, while travelling or something."*
>
> ⇒ No password rotation and no deeper check. **This task's login alert is how any future unknown login gets caught.**

**What already exists — reuse it, don't build a parallel path** (read 2026-10-12):
- **One Telegram bot, one operator group with Topics** (task `0277`, ADR-114). Topics: Alerts
  (`TELEGRAM_TOPIC_ALERTS`), Name Changes (`TELEGRAM_TOPIC_NAME_CHANGES`); blank means the General topic. **These
  alerts belong in the Alerts topic.**
- **Telegram is blocked from Russian addresses; every box is in Russia.** Sending goes through the owner's HTTP proxy
  (`TELEGRAM_PROXY_URL`), which **lets through only addresses on its allow list** (ADR-114 — a TCP connection
  succeeding proves nothing). Which boxes are on that list today is **not recorded here** — step 1 finds out.
- **ADR-114: the profile box is the admin box, and the alert relay lives there** (`src/profile-server/AlertRelay.ts`,
  mounted under `/internal/`, behind nginx's IP allow list). The telemetry box already posts to it hourly (the `0284`
  liveness probe). The game box already sends Telegram messages itself (player feedback, via the proxy).
- ⚠️ **ADR-114's known defect:** the existing Telegram senders keep one long-lived proxy connection and **never retry** —
  a dead connection loses a message silently. Read ADR-114's defect section before reusing any sender.
- **Daily jobs today:** `profile-checks.sh` (profile box only, daily 08:00 UTC; reports to the Better Stack heartbeat —
  email, and only says *why* on failure; **not Telegram**); the name-change digest (`0283`; Telegram, but the **Name
  Changes** topic). **Neither is a daily Telegram message in the Alerts topic** — see open question 2.

## What to build

1. **Check first, read-only (investigation step).** On each of the three boxes: which Telegram settings exist (names
   only, never values), whether the box can reach Telegram through the proxy today, whether it can reach the profile
   box's `/internal/` routes, how fail2ban runs and what its counters show, and where SSH login records live (journal or
   log file). Record in the worklog — no addresses, hosts or secrets.
2. **Plan (`/fkit-plan-task`), owner approves before any edit.** The plan picks the delivery route for each box: send
   directly through the proxy with the existing bot, or post to the profile box's relay (ADR-114's home for alert
   logic). If the choice is unclear, consult `fkit-architect`. If a route needs the proxy's or nginx's allow list
   changed, that is an owner step — say so in the plan.
3. **(a) Login alert — every SUCCESSFUL SSH login, on all three boxes.** One message: which box, time, user, how they
   logged in (key or password), and where from — **shown as the owner decides (open question 1)**. Hard rules:
   - **It must never block, slow or break a login.** If Telegram or the proxy is down, the login goes through and the
     alert is dropped or queued — never the other way round. A lockout from an alert hook is worse than no alert.
   - Our own deploys log in several times each (copy + commands) — see open question 3.
4. **(b) fail2ban-down alert, on all three boxes.** A message when fail2ban (or its SSH jail) stops running or is
   missing, and a message when it is back. Checked on a timer; not repeated every run while it stays down (the plan sets
   the repeat interval).
5. **(c) Daily counts, per box:** failed SSH logins and fail2ban bans in the last 24 h. Delivered per open question 2.
   Each box's line should also say if its numbers could not be read — a missing box must not look like "0 attacks".
6. **Deploy through each box's existing script** (`setup.sh`/`update.sh` for game, `setup-profile.sh` for profile,
   `setup-telemetry.sh` for telemetry) — no hand-made on-box files. Any secret (bot token, shared token) goes in a 0600
   env file the way those scripts already do it.
7. **Tests.** Any new shell harness is registered in `tests/scripts/ShellHarnesses.test.ts` (CLAUDE.md: an unregistered
   harness is gated by nothing). If the deploy hardening harness greps a touched script, keep it green.
8. **Runbook:** what each message means, what to do when one arrives, how to test it on purpose, how to switch it off
   in an emergency. Names no host, address, token or chat id.

**Out of scope:** an alert per failed guess (explicitly not wanted — noise); key login and password-off (`0441`,
`0442`); changing fail2ban's ban settings; adding fail2ban to `setup.sh` (see Notes); ufw (inactive on game and
telemetry — not raised by the owner, flagged in Notes).

## Verification steps

1. Worklog records step 1 for each box (names, not values).
2. A test SSH login to each box produces one Alerts-topic message within a minute, with the fields chosen in open
   question 1 and the source shown exactly as chosen (screenshot or quote, address masked as chosen).
3. **With Telegram unreachable** (e.g. the proxy setting pointed at nothing, on dev), an SSH login still succeeds with no
   visible delay; record the time it took.
4. Stopping fail2ban on one box (dev or the profile box, owner-run) produces the "down" message; starting it produces
   "back". Done at least once per box type.
5. The daily counts arrive for all three boxes on two consecutive days; a box whose numbers cannot be read says so.
6. Over 24 h, failed guesses produce **no** per-guess messages.
7. `npm test` green; any new harness is registered in `ShellHarnesses.test.ts`.
8. No tracked file (scripts, runbook, worklog) contains an address, host, token or chat id.

## Notes
- **Depends on:** nothing technically — it can be built before `0441`/`0442` land. **Sequenced right after `0441`/`0442`
  by owner ruling 2026-10-12.** If it ships first, every password-based deploy login will show up as a login alert —
  expected, and useful.
- **Blocks:** nothing.
- ⚠️ **Flagged, not filed** (the owner did not raise them; the owner decides whether to file): (1) **`setup.sh` has no
  fail2ban section** — a rebuilt game box comes back unguarded; (2) **ufw is inactive** on the game and telemetry boxes
  (the profile box runs it, `0221`).
- **Open questions for the owner** (recommended default first; plain-language context for whoever relays them):
  1. **What the login message shows** (the owner's call by ruling). *Recommended: box name, time (UTC), user, "key" or
     "password", and the source network shown only as country + provider name, never the full address.* Telegram
     messages are not files in our repo, but they are kept in the group's history; a full address there is more than
     we need to notice a stranger. Alternative: show a partly masked address (first two parts only), which helps tell
     "my home" from "somewhere else" at a glance; or the full address (most useful in an incident, least private).
  2. **Where the daily counts go.** No existing daily message fits: `profile-checks.sh` reports to the Better Stack
     heartbeat (email, and only on failure), and the name-change digest posts to the Name Changes topic.
     *Recommended: one short daily message in the Alerts topic, sent by the same bot through the same route as the
     login alerts, at the time `profile-checks.sh` already runs (08:00 UTC)* — same bot and route, so not a parallel
     system, only a new message. Alternative: add the counts to the name-change digest (one daily message instead of
     two, but security numbers would land in the Name Changes topic).
  3. **Our own deploy logins.** A deploy logs in several times in a row, so one deploy could send several login
     messages. *Recommended: group logins from the same source to the same box within about one minute into one
     message ("3 logins").* Every login still reaches you, just bundled. Alternative: one message per login, exactly as
     ruled (simplest, noisier on deploy days).
- Sources: owner rulings and `fkit-lead` read-only checks, 2026-10-12 (relayed); ADR-114; `AlertRelay.ts` header;
  `profile-checks.sh` header; `setup-profile.sh` fail2ban section; `setup-telemetry.sh` header; `example.env.profile`;
  `deploy.sh` Telegram lines — all read 2026-10-12.
