# Re-read the post-0340 login-verification numbers in a few days

## ID
0402

> ℹ️ **ID allocation, checked 2026-10-07 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0401` (folder names and `## ID` fields agree). `0402`: no task folder, no `## ID` hit, no `.claude/`
> hit, no repo-wide hit outside SVG files.

## Sprint
Sprint 7

## Priority
52

> ⚠️ **Priority 52 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit its rank barely matters:** it blocks nothing and is time-gated (read it once a few days of data exist).
> Appended after this board's highest (51, `0400`), never inserted (ADR-035).

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **MAY BE EXECUTED BY THE OWNER, or by an agent session with the owner's approval for read-only
SSH.** The read is read-only (`SELECT` only, `--readonly=1`). Earlier approvals: 2026-10-05 (*"Regarding reading only
ssh to a server: I give you my approve."*) and 2026-10-07 for `0392`. Confirm they still cover this task before running
it. ⚠️ On 2026-10-07 the session permission system refused a production read until the owner allowed it (see
[`0392`'s worklog](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/worklog.md)) — expect the
same.

## Context

**Filed 2026-10-07 by a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.**
Authority: an OWNER RULING given live by the owner in a session on 2026-10-07, relayed to this producer. Verbatim:
*"I made a decision that we no longer wait for those numbers. Monitor them as planned and after a few days we will
check them again to make better decisions but they no longer block us so the point is that we already improved this
tail numbers drastically and we can move forward"*.

**What this is, in plain terms.** Yandex signs the player data each login carries. When that data is old ("stale"),
the profile server cannot verify the player. [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
(live 2026-10-06) accepts data up to 24 h old, which cut the stale share from ≈34% to **3.25%** in
[`0392`](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)'s first read (≈22.75 h, weekday
only). Under [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md)
the owner was to look at these numbers before each deploy that reads `verified`. **The 2026-10-07 ruling removed that
gate:** no deploy waits on the numbers any more. They are still watched, and this task is the owner's planned
re-read *"after a few days"*, to inform later decisions.

**Since `0392`'s read, `0340` (S3a, verified sessions) went live** — profile deploy record 2026-10-07T07:10:45Z. That
deploy restarted the counters, so this read starts from the first point after it.

## What to build

Nothing in source. A read-only read, then the owner's look. **Same method as `0392`** (its brief § *What to build* and
worklog § *2026-10-07 — the read*, which follows `0373`'s Step 1):

1. **Outcome counter** (`geoconflict_profile_login_verification`, label `outcome`), summed over the window: counts and
   shares of every outcome — at least `ok`, `stale`, `id_mismatch`, `bad_payload` (plus `absent` / other `bad_*` if
   present). **Stale share = stale ÷ all outcomes** (same denominator as `0339` / `0373` / `0392`).
2. **Per day and per hour of day (UTC)** stale share, with weekend days marked.
3. **Stale-age brackets** (as reworked by `0391`) over the same window.
4. **`id_mismatch` share** next to the ~0.04% baseline.

### Caveats to watch (from ADR-122 and the earlier reads)
- ⚠️ **Counters restart at every profile deploy.** The window starts at the first point after the **latest** profile
  deploy — 2026-10-07T07:10:45Z (`0340`) as of filing. If another profile deploy lands inside the window (for
  example [`0396`](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)'s
  S3b deploy), say so and treat the window as two pieces. **Never subtract or compare a cumulative value across a
  restart.**
- ⚠️ **Evenings, weekend ones especially, are the window to watch.** In `0373`'s data (which included the Sat 3 and
  Sun 4 Oct evenings) the worst hours were **20–23 UTC, at 42–52% stale before `0391`**
  ([findings](../../../knowledge-base/reports/2026-10-05-0373-stale-login-findings.md)). `0392`'s read was weekday-only
  and contained no weekend evening, so the 3.25% figure has not yet been seen against that window. Producer's suggestion (not an owner ruling): read after at
  least one weekend evening is in the window (Sat 10 / Sun 11 Oct, 20–23 UTC), and call those hours out.

**No pass bar, no threshold.** The owner judges the numbers by eye (ADR-122, unchanged on that point).

## Verification steps

1. `worklog.md` records: the window (UTC start and end, length in days), the source, any profile deploy inside it, and
   every count and share in steps 1–4.
2. The per-day / per-hour table is recorded, weekend evenings (20–23 UTC) called out explicitly, or a line saying none
   fell in the window.
3. **The owner's take in one line, in the owner's words** — what, if anything, the numbers change for later decisions.
   If they look wrong, no fix is chosen here: record them and put the next step to the owner (a new task if needed).
4. **No secrets:** no key, real player id, signature, token, host, IP or connection string in any artifact. Counts,
   shares, dates and times only.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Non-blocking by owner ruling (2026-10-07).** No deploy waits on this task — not `0396`, `0248` / `0398`, `0319`,
  `0332` or `0323`. Each of those briefs carries a dated note saying so.
- **Related:** [`0392`](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (the first
  post-`0391` read, the method), [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (the
  baseline and the weekend-evening hours), [`0393`](../0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md)
  (the paid-citizen slice of the same stale tail — separate task, separate question), ADR-122.
- ⚠️ **ADR-122 is being updated separately** (by `fkit-architect`, 2026-10-07) to record that the look is no longer a
  gate. Until that lands, ADR-122's text still describes the gate; the owner ruling quoted above wins.
- ⚠️ **VPN:** the telemetry box is unreachable while a full-tunnel VPN is on (project memory note).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
