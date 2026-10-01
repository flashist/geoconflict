# Worklog — 0289

**Written 2026-10-01 by a spawned `fkit-producer` (no owner channel, ADR-021/037), from evidence the OWNER supplied
and confirmed live on 2026-10-01 in the `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer precedent.
**The owner saw every message below himself** (Telegram screenshots); `fkit-lead` read the times off those
screenshots. **The producer verified none of it.** Times, gaps and yes/no only — no player id, name, chat or topic
id, host, URL, token or secret (brief § Notes, privacy rule).

## Result

**PASS — on observed real-world evidence, NOT on the drill.** The drill in [`plan.md`](./plan.md) was **not run**.
A Telegram send from the profile box's long-running process was **seen arriving after 4 h 36 min of silence** from
that process, with the Alerts topic empty for the whole gap.

⚠️ **Shorter than the earlier owner rule.** The 2026-09-28 ruling Q1 asked for a quiet gap of **≥ 8 h**, run as a
drill. The owner replaced it today with this 4 h 36 min observed gap (ruling below). **This result is bounded to
4 h 36 min. Do not round it up into an overnight claim.**

## The owner ruling that replaced the drill (2026-10-01)

OWNER RULING given live 2026-10-01 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a
spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.

- Question, verbatim: *"If the Alerts topic was empty between 11:12 and 15:48 MSK today, should we close 0289 using
  this as the proof (no test)? This replaces your earlier rule of '8+ hours, run as a drill' with '4 h 36 min of
  real silence, seen in the wild'."*
- Choice, verbatim: **"Yes, close on this (Recommended)"**.
- The owner then confirmed the condition, verbatim: **"It was empty"** — no message in the Alerts topic in that
  window.

This **supersedes** plan ruling Q1 (≥ 8 h) and the drill method (Phases A–C, step 0 pre-checks, throwaway monitor).
Recorded append-only in `plan.md` and the brief; nothing earlier was edited (ADR-035).

## Evidence 1 (primary) — the profile box's own Telegram route

Source: the Telegram **Name Changes** topic, two `[Name change] Pending request` messages sent by the long-running
profile-api process (the `NameChangeRepository` notifier). Owner-observed; times read by `fkit-lead`.

| | Delivered (MSK) | UTC | Arrived? |
|---|---|---|---|
| Message 1 | 11:12, 2026-10-01 | 08:12 | yes |
| Message 2 | **15:48**, 2026-10-01 | 12:48 (request time in the message: 12:48:06 UTC) | **yes** |

- **Gap: 4 h 36 min** (08:12 → 12:48 UTC). No message between the two was reported.
- **Why this is the relay's route:** per [`plan.md`](./plan.md) § *Summary*, the alert relay and the name-change
  notifier are the **only two** Telegram senders in that process, and both go through one `ProxyAgent` per proxy URL.
  So message 2 used the relay's own sender, connection pool and egress proxy after 4 h 36 min. ⚠️ That "only two
  senders" fact is the plan author's code reading (2026-09-28); the producer did not re-check it.
- **Quiet conditions (plan § *How "quiet" is produced and measured*):**

| Condition | Held? | Source |
|---|---|---|
| 1. Alerts topic: no message in the window | **yes** | owner, verbatim *"It was empty"* |
| 2. Name Changes topic: no name-change notification in the window | **yes** (none reported between the two) | owner screenshot, read by `fkit-lead` |
| — The 07:00 MSK (04:00 UTC) daily digest | outside the window (before it) | timing |
| 3. No profile-box deploy or restart in the window | **none known** — last profile deploy 2026-09-29 | relayed by `fkit-lead`; not checked on the box |
| 4. Channel never disabled in the window | **yes** — `0341`'s drill ran 14:25–14:31 UTC, after the window ended at 12:48 UTC | `0341` worklog |

## Evidence 2 (supporting) — the shared sending code, on another box

Source: player feedback messages from the **game server** (`src/server/Master.ts` → shared
`src/core/notifications/TelegramNotifier.ts`, same library and `0277` retry). Owner-observed; times read by
`fkit-lead`.

| | Delivered (MSK) | UTC | Arrived? |
|---|---|---|---|
| Message 1 | 17:46, 2026-09-30 | 14:46:54 | yes |
| Message 2 | 21:58, 2026-09-30 | 18:57:56 | **yes** |

- **Gap ≈ 4 h 12 min** (by the UTC times; the MSK times give 4 h 12 min too).
- Different box and different process. **Whether it uses the same egress proxy is unknown.** Supporting only —
  it shows the shared code delivers after hours of quiet; it says nothing about the profile box.

## What this does NOT prove

- ⛔ **An overnight gap (≥ 8 h).** Still unproven. The strongest gap here is 4 h 36 min.
- ⛔ **Whether message 2 needed `0277`'s one retry.** Not checked. The name-change notifier is not counted by
  `geoconflict_profile_alert_relay`, so the counter cannot tell. Under ruling Q2 (2026-09-28) either outcome is a
  pass. **Retry use: not determined.**
- ⛔ **The monitoring → relay hop after quiet** (monitor fires → webhook → nginx `/internal/` allowlist → relay).
  This evidence never crossed that hop. In production the hourly `0284` probe keeps it warm; the plan never claimed
  to test it quiet either.
- ⛔ **The Alerts topic route itself.** Message 2 went to the Name Changes topic. Alert delivery to the Alerts
  topic was proven on 2026-09-17, on a warm connection.
- ⛔ **Quiet at the egress proxy.** If the game server shares the profile box's proxy, its sends could have kept
  the proxy warm during the window. Unknown.
- ⛔ **`0061`'s stale-pooled-connection mechanism.** Per [`plan.md`](./plan.md) § *Summary*, undici closes an
  unused pooled connection after at most 10 min, so after 4 h 36 min message 2 most likely opened a **fresh**
  connection. That is code reading only, not observed. This evidence neither confirms nor rules out the mechanism.
- ⛔ **A real monitor-fired alert after `0341`'s SQL re-enable.** `0368`'s caveat 1 expected this task's Phase A
  to give incidental evidence for that. Phase A was never run, so that caveat stays unproven.

## Follow-up carried elsewhere

- **The runbook update** (plan § *What changes in the repo*: `alert-delivery-runbook.md`'s "delivery after an IDLE
  period is unproven" lines → this observed result, with the bounds above) is **not done here**. It rides
  [`0368`](../../backlog/0368-runbook-document-the-proven-sql-re-enable-for-a-disabled-alert-channel/brief.md) as a dated scope
  addition (2026-10-01) — `fkit-lead`'s choice, to avoid a separate doc-only spawn; the owner may object.

## Decision log

none — no unattended fixes; nothing was built, and no code or runbook was changed by this task.
