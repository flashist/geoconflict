# Consider Telegram (or another faster channel) for the profile box's Better Stack alerts

## ID
0466

> ℹ️ **ID allocation, checked 2026-10-15 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0465`. `0466`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on the OWNER RULING of 2026-10-15**, given as free text in chat in the `fkit lead` session and relayed by
> `fkit-lead` to a spawned `fkit-producer` (no owner channel, ADR-021/037); ⛔ **not producer precedent.** Owner's
> words, verbatim: *"we're ok abou the current email-only alerts. We can brief a task to the backlog to think about
> upgrading it in the future, but now."* **Read as "but not now"** — the sentence only makes sense that way (accept
> email today, think about an upgrade later); this reading is the relaying agents', not the owner's own words. No
> sprint was named, so it is filed on the Backlog board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design.)

## Status
🔲 Backlog

## Owner
fkit-producer

This is a **decision task, not a build.** The producer scopes it first and takes the options to the owner; any build
that follows gets its own brief (owner `fkit-coder` most likely) once the owner has chosen.

## Context

**In plain terms.** The profile box has three outside alarms in Better Stack: the daily heartbeat
`profile-daily-checks` (fed by `profile-checks.sh`) and two uptime monitors, "Profile API health" (`/health`) and
"Profile API ready" (`/ready`). Today **every one of them reaches the owner by email only** — no Telegram, no phone
push, no call or SMS. The owner has said that is fine for now. This task is to think about a faster channel **later**.

**What is known (from `0219`'s worklog, 2026-10-15 evening section — read-only check of Better Stack by `fkit-lead`,
relayed; not re-checked by the producer):**
- Monitors: notifications E-mail only (no call/SMS/push); on no-acknowledge: "Do nothing".
- Heartbeat: notifications E-mail only; on no-acknowledge: "within 3 minutes alert all other team members".
- **No Telegram is connected anywhere in Better Stack.**
- The account is on the **free plan**; the **SSL-expiration check is not available** on it (every option reads
  "upgrade to use").
- Email delivery **is proven**: the owner confirmed the two B7 drill alerts (2026-10-15) arrived in their inbox.
- ⚠️ **A trap seen on 2026-10-07 → 10-15:** an incident that is never acknowledged stays open, and later failures are
  appended to it **with no new alert** — so a new, different failure was effectively muted for 8 days. A faster channel
  does not fix that by itself; any option chosen here should say how it behaves while an incident is already open.
  (The cause of that long incident is handled elsewhere: `0465`, and the reboot of 2026-10-15.)

**What already exists that bears on this:**
- **The compensating control for SSL expiry:** `profile-checks.sh`'s `cert-days-remaining` check fails when the
  certificate has under 20 days left (default `PROFILE_CHECKS_CERT_MIN_DAYS=20`), and that failure goes out through the
  heartbeat. Proven firing by `0219`'s B7(c) drill on 2026-10-15. So SSL expiry is covered today, by email.
- **The operator Telegram group and its Alerts topic, with a relay on the profile box** (task `0277`, ADR-114
  `adr-114-profile-server-is-the-admin-server-alert-relay-lives-there.md`; `src/profile-server/AlertRelay.ts`, under
  `/internal/` behind nginx's IP allow list). The SSH security alerts (`0443`, verified by `0449`) already deliver to
  that Alerts topic through it. Telegram is blocked from Russian addresses, so sending goes through the owner's HTTP
  proxy and its allow list. ⚠️ **ADR-114 records a known defect:** the existing Telegram senders keep one long-lived
  proxy connection and **never retry** — read it before relying on this path for alarms.
- **Overlap with the alert-bot track — checked:**
  - [`0033`](../0033-monitoring-alert-bot-phase1/brief.md) (phase 1) plans an outside dead-man's-switch for the game
    and telemetry boxes, a shared Telegram send helper, and **a separate ops Telegram chat/topic**. It also locks one
    rule that matters here: **the outside dead-man's-switch must NOT depend on our own Telegram-via-proxy path**, so a
    proxy or Telegram outage cannot blind us. A Better Stack → our relay → Telegram route would add exactly that
    dependency for the *Telegram copy* — acceptable only if email (or another independent channel) stays on as well.
  - [`0034`](../0034-monitoring-alert-bot-phase2/brief.md) (phase 2) item 3 is TLS-expiry + renewal checking for the
    **telemetry** box; item 5 is the backup-freshness consumer, whose profile half `0219` built. Neither covers *how
    the profile box's Better Stack alerts are delivered*. **No duplicate found** — but whatever channel is chosen here
    should be the one `0033`/`0034` use too, so the operator ends up with one alert place, not two.
- **Parent:** [`0219`](../../done/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) — its B2/B3
  "Telegram + email" requirement is waived for `0219` by the same 2026-10-15 ruling (email-only accepted); this task
  carries the Telegram upgrade.

## What to build

A **recommendation for the owner**, not code. Weigh these options — **none is decided**:

1. **Better Stack's own Telegram or webhook integration.** ⚠️ **Verify, don't assume:** whether the free plan offers
   a Telegram integration and/or outgoing webhooks at all, and for which alarm kinds (heartbeat vs uptime monitor).
   Check Better Stack's current documentation and the account's integrations page (read-only).
2. **A Better Stack webhook into our existing alert relay** (ADR-114) → the operator group's Alerts topic, the same
   place the SSH alerts land. Needs: whether Better Stack can reach the relay at all (the relay sits behind an IP allow
   list), how it would authenticate, and ADR-114's no-retry defect. Ask `fkit-architect` for feasibility and rough cost
   if this option is on the shortlist.
3. **The Better Stack phone app (push notifications).** Possibly free and no build at all — verify plan limits.
4. **A paid Better Stack plan.** Would also unlock the built-in SSL-expiration check (today covered only by
   `cert-days-remaining`). Needs the price, stated in plain terms, for the owner.
5. **Keep email only** — the current, accepted state — as the explicit baseline to compare against.

For each option, state plainly: cost (money and effort), what it adds over email, whether it keeps an alarm path that
does not depend on our own proxy/Telegram (the `0033` independence rule), and how it behaves while an incident is
already open (the 2026-10-07 muting trap).

## Verification steps

1. The worklog in this task folder holds a short comparison of the five options above, with each Better Stack
   capability claim marked **verified (source named)** or **unverified**.
2. One recommendation with its main trade-off is put to the owner, and the owner's choice is recorded here as a dated
   ruling (or "keep email only" is recorded as the decision).
3. If the owner chooses a change: a follow-up build brief is filed (with its own verify step), linked from here; if not,
   this task is closed with the reason.
4. 🔒 No URLs, hosts, ping addresses, emails, chat ids or tokens in any file of this task.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** [`0219`](../../done/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) (parent;
  B2/B3 Telegram part waived there by the 2026-10-15 ruling), [`0033`](../0033-monitoring-alert-bot-phase1/brief.md),
  [`0034`](../0034-monitoring-alert-bot-phase2/brief.md), [`0443`](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md)
  / [`0449`](../0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md)
  (the relay path to the Alerts topic), [`0465`](../0465-stop-the-profile-deploy-smoke-backup-breaking-the-daily-backup-object-check/brief.md)
  (the false failure that kept an incident open).
- **Wiki gap:** the wiki has no page on how alerts reach the operator (Better Stack, email, the Alerts topic). Worth a
  `fkit-wiki` ingest once this decision is made.
- **Do not invoke the mover skills** except as the producer. Never touch `ai-agents/wiki-vault/`.
- 🔒 **No secrets in any artifact.**
