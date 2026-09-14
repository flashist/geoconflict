# Telemetry box: nothing reads the certbot renewal log — add a renewal-failure / expiry-approaching signal (the `0219` gap, on the other box)

## ID
0258

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium.** Not owner-ruled. Medium, not High, only because
[`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md) must land first and
the next real renewal attempt is ~60 days after it does; but this is the **same "outage nobody
noticed" class** [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)
was promoted for on the profile box — and on this box the outage **actually happened**: the cron
failed silently twice a day for ~30 days, then the certificate expired, and it took ten more days
and an unrelated investigation to notice.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on the ship-loop driver's instruction**, as the
natural extension of `0032`'s telemetry-cert finding. **Not an owner ruling.**

`setup-telemetry.sh:930` appends every `certbot renew` run to `/var/log/certbot-renew.log`. **No
consumer exists.** No MTA is installed, so cron's own mail goes nowhere. `0219` records the identical
gap for the profile box (its G3 and "the renewal log is the FIRST unread signal") and is building a
reader there; **the telemetry box has the same unread log and, unlike the profile box, has already
proven the failure mode is real** (`0257`, Context).

**Producer's input — the plan decides:** a log reader catches only what certbot *reports*. The
cheaper and more robust signal is an **expiry-date check from outside the box** — read the live
certificate's `notAfter` and alarm when it is under N days — because it catches every cause
(broken cron, broken timer, DNS moved, box down) with one probe, and it needs no access to the box's
logs. Consider doing that **for both hosts at once** (telemetry and profile) from wherever the probe
runs; if `0219` lands a log reader first, mirror its delivery channel rather than inventing a second
one. Where the alarm is *delivered* is the real open question (there is no alert bot —
`ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md` is the prior art) and it is
the owner's call.

### 🚫 Not in scope
- Fixing the renewal itself — `0257`.
- The profile box's reader — `0219` owns it; this task may **extend** whatever it lands to the
  second host, not redo it.
- Uptime/liveness monitoring of the telemetry stack generally.

## What to build

1. **Decide the signal shape** (log reader vs external expiry probe vs both) and **the delivery
   channel** — put both to the owner in the plan, with the `0219` precedent in view.
2. **Implement it** in the existing provisioning (`setup-telemetry.sh`, or a cron on whichever host
   runs the probe) — no new scripts where an existing one fits (memory: search before creating).
3. **Harness assertion** for whatever lands in `setup-telemetry.sh`, mirroring `0219`'s idiom.

## Verification steps

1. **Negative test**: simulate the `0257` failure (e.g. temporarily point the probe at a host with a
   deliberately short threshold, or inject a failing line into the log) and show the alarm fires.
2. **Positive test**: healthy state produces no alarm.
3. **Delivery**: the alarm reaches a place the owner actually looks; owner confirms receipt once.
4. Harness `ALL PASS`; `npm test` green.
5. 🔒 No hostnames beyond the public CNs, no tokens, in any artifact.

## Notes

- **Depends on:** [`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md)
  — hard: the log/hook shape is decided there, and an alarm on a cron known to be broken is noise.
  `0219` is a **precedent to mirror, not a dependency** — if it has not landed, do not wait for it.
- **Blocks:** nothing.
- **Effort: ~0.5 day.** **Risk: Low.**
- **Source:** `ai-agents/tasks/backlog/0032-investigate-null-id-errors/worklog.md` ("Follow-up brief
  text" item 1) plus the `0219` cross-reference the driver supplied.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`.**
