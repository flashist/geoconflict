# Investigate why the game server's first profile `resolve` call times out about every 10 minutes

## ID
0375

> ℹ️ **ID allocation, checked 2026-10-03 before filing.** Highest ID on all three boards (folder names and `## ID`
> fields agree): `0374`. `0375`: no task folder, no `## ID` hit, no hit under `ai-agents/tasks`, `ai-agents/sprints`
> or `.claude/`.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-10-03 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-10-03, relayed by `fkit-lead`.** ⛔ Not producer precedent.
Owner's answer, verbatim: **"Yes, file a backlog task (Recommended)"** — option text: *"The producer files a small
task: find out why the first try times out every 10 minutes. It goes to the Backlog, not this sprint. Each timeout
makes a player wait 10 extra seconds for their profile to load."* The owner placed it on the **Backlog board**, not
a sprint.

**What was seen (2026-10-03 weekend window; owner-run greps on the prod game log, 60 min).** Three lines
`profile /internal/v1/players/resolve request failed (attempt 1/3): TimeoutError` at **09:40:04, 09:50:35 and
10:00:53 UTC**. Each recovered on a later attempt — no *"failed after retries"* for any of them. All three came
**before** that day's profile deploy (10:02) and after the game deploy (~09:32). Record: runbook
[`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened
2026-10-03 — weekend window ran* → *Watch findings*.

**It has been seen before — evidence it is older than 0.0.155/0.0.156, not proof.** The 2026-09-26 window logged the
same line twice, at **09:06:32 and 09:16:34 UTC** — also about 10 minutes apart — as watch item **F-B** ("no cause
known — none asserted"). The owner's one resource snapshot on the profile box then showed no starvation. See
[`0217`](../../done/0217-profile-p2-wire-game-server-to-profile-box/brief.md) and
[`0272`](../../done/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md) (both closed with
F-B as a residual) and runbook § *2026-09-26 — THE WINDOW RAN* (F-B, W15). Separately, `src/server/` has had no code
change since the 0.0.155 build that the lead could see (one later commit touched only
`src/core/configuration/DefaultConfig.ts`). Together these point to a **pre-existing** behaviour — but nobody has
shown it.

**The code, as it stands (read it yourself before relying on this).** `src/server/ProfileApiClient.ts`: each attempt
is a `fetch` with `AbortSignal.timeout(DEFAULT_TIMEOUT_MS)`, `DEFAULT_TIMEOUT_MS = 10_000`; up to **3 attempts** with
a growing backoff between them; `resolvePlayer` is called from `GameServer.ts` (around line 1398). `credit` goes
through the same retry helper.

**Hypothesis — NOT a finding.** The regular ~10-minute spacing suggests something periodic. One unverified guess from
the lead: a pooled keep-alive connection that goes stale while idle and is reused for the next request, which then
hangs until the 10 s timeout. Other periodic causes are just as possible (anything on the path between the game server
and the profile API that drops idle connections, a scheduled job on either box, or plain traffic gaps). **Do not fix
on the guess.**

**What it costs.** The owner's framing: each timeout makes a player wait **~10 extra seconds** before their profile
resolves. Nothing is lost — the retry succeeds. ⚠️ Whether the same stall can hit a `credit` call's first attempt (and
so, combined with an outage, add risk to the **lost-not-queued** XP path) is a question for this task, not a known
fact.

**Not in scope.** The `502`s during a profile container recreate (one XP award lost on 2026-10-03 at 10:03:11) are the
**standing cost** recorded in the runbook (N3: *lost, not queued*) — a different cause. Not this task.

**Investigation first (the owner's rule and the producer's rule).** The root cause is unknown, so this brief scopes a
**read-only investigation** only. A fix gets its own brief after the findings are reviewed with the owner.

## What to build

A findings report — **no code change, no deploy, no restart of any box.**

1. **Map the path.** Every hop a `resolve` request takes from the game server to the profile API, and each hop's
   idle / keep-alive behaviour (client-side connection pool defaults at the Node version in use, any proxy in
   between, the profile server's own keep-alive and request timeouts). Read from code and config; do not assume.
2. **Test the timing.** Do the timeouts follow **idle gaps** (no profile call for N minutes before), or wall-clock
   intervals regardless of traffic? Use whatever read-only logs exist (game-server warn lines; profile-server access /
   request logs; Uptrace if it holds them). The owner runs anything that needs their access; read-only checks an
   agent can run, it runs (standing rule).
3. **Reproduce locally if it is cheap** — e.g. a local game server + profile server with an idle gap longer than the
   suspected window — to confirm or kill the leading hypothesis. Optional; say if skipped and why.
4. **Answer the side question:** can the same first-attempt stall happen on `credit`? Is there any record of it?
5. **Recommend** one fix direction (or "leave it", with the cost stated), with its main trade-off — for the owner to
   decide. If the fix is not clear, say what further evidence would settle it.

Save the report under `ai-agents/knowledge-base/reports/` (dated, task ID in the name). Never the wiki.

## Verification steps

1. The report names **the cause, with evidence**, or says plainly **"not found"** and lists every hypothesis tested
   and what ruled each in or out. A guess presented as a cause = fail.
2. The report states the timing analysis result: idle-gap-linked yes / no / unknown, with the log lines or counts
   behind it.
3. The `credit` side question is answered (yes / no / unknown, with reason).
4. One recommendation with its trade-off, or "leave it" with the cost.
5. **No code, config or box change was made**; no deploy, no restart. ⛔ In particular **no profile box restart** —
   the runbook's standing rule after 2026-10-03 forbids it until `0297` §1 has read `0309`'s log line.
6. No host, IP, URL, token or credential appears in the report or the worklog.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing. A fix task, if any, is filed after the findings are reviewed with the owner.
- **Related:** [`0217`](../../done/0217-profile-p2-wire-game-server-to-profile-box/brief.md) /
  [`0272`](../../done/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md) (F-B, the first
  sighting) · [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 (the standing no-restart
  rule) · [`0346`](../0346-profile-deploy-applies-migrations-before-new-code-serves-requests/brief.md) (a different
  profile-deploy gap; not the same cause).
- **Effort:** small — a read of the client, the profile server's HTTP settings and the logs; more only if a local
  reproduction is needed.
- **Producer's rank if pulled in:** Low–medium — not owner-ruled. Nothing is lost today; the cost is a ~10 s delay
  for a few players per hour.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
