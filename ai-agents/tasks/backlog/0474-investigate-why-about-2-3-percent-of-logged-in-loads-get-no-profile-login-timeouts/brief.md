# Investigation: why about 2–3 % of logged-in page loads get no profile (profile login fails, mostly timeouts)

## ID
0474

> ℹ️ **ID allocation, checked 2026-10-20 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0473`. `0474`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-20**, typed live in a Claude Code session and relayed by it to a spawned
> `fkit-producer` (no owner channel), verbatim: *"Brief a task for investigating it later. Put it to the backglog."* —
> "it" = the share of logged-in page loads whose profile login fails (mostly timeouts), which that session had just
> measured. No sprint named, and the owner said "later" → Backlog board, unscheduled. ⛔ Not producer precedent.

## Priority
Unscheduled

(Backlog board, unranked by design. ⚠️ The board row is an **append** — a new row at the bottom of the Backlog board,
not a merit placement; see `## Notes` for where merit would put it.)

## Status
🔲 Backlog

## Owner
fkit-coder

This is an **investigation, not a fix.** Its output is a findings report and a list of options. **No code change ships
from this task.**

## Context

**In plain terms.** When a logged-in player opens the game, the game makes one login call to our profile server. For
about **2–3 % of logged-in page loads** that call fails, so the player gets **no profile** for that whole page load
(the "couldn't load your profile" line shows instead). Most failures are **timeouts** — the server did not answer
within 5 seconds. The share is steady, not growing. We do not know whether the server is slow, the network is slow,
or the requests never reach the server. This task finds out.

**How the login works today** (see `ai-agents/knowledge-base/analytics-event-reference.md` § *Profile Session
Events*):
- One `POST /v1/login` per logged-in page load, from `src/client/ProfileSession.ts` (task `0273`, ADR-113).
- A **5 s** timeout (`LOGIN_TIMEOUT_MS`) wraps the HTTP request only. The Yandex signed-data "take" before it has its
  own separate backstop and is not inside the 5 s.
- **No retry — owner ruling D3 (2026-09-16).** A failed login is final for that page load; exactly one `Failed:*`
  event fires. So the `Failed:*` count *is* the count of loads that got no profile.
- `Timeout` = aborted at 5 s. `Error` = network failure, any other non-2xx, or a bad 200 body. `Unavailable` = a 503.

**What was measured** — GameAnalytics, read by the relaying session on 2026-10-20 (Explore · Design · Count · by
day, past 7 days = 13–19 Oct 2026, in the owner's Chrome with the owner logged in; a "Demo mode" banner was shown
on the page). No ids or URLs recorded.

| Day (Oct 2026) | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|---|---|---|
| `Profile:Login:Failed` (all) | 199 | 252 | 233 | 568 | 211 | 221 | 191 |
| … of which `Timeout` | 145 | 169 | 131 | 191 | 165 | 157 | 125 |
| … of which `Error` | 54 | 83 | 102 | 377 | 46 | 64 | 66 |
| … of which `Unavailable` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- `Profile:Login:Succeeded` ≈ **7.8K–9.6K/day** (one per logged-in load).
- **16 Oct is the deploy day** — the `Error` spike (377) lines up with deploy restarts. Read it as a separate,
  explained bump, not as part of the steady rate.
- `Citizenship:Status:ReadFailed` (the "couldn't load your profile" line, once per page load) ≈ **160–320/day** on
  8–15 Oct (read in task `0418`'s worklog) — roughly equal to `Login:Failed`, so that line mostly follows a failed
  login.
- ⇒ about **2–3 % of logged-in loads** get no profile; mostly **timeouts**. Steady, not growing.
- **Timeouts by country** (Timeout only, 13–19 Oct): RU 46–111/day (about half), then DE, NL, US, FI, TR, FR, SE,
  BE (21 on 19 Oct), PL… — spread roughly in line with where players are; not one country or route. ⚠️ **Recorded as
  observed, not a conclusion.**

**Not checked yet:**
- Whether the profile server was slow — Uptrace `geoconflict.profile.http.duration` for the login route, and
  `db.pool.waiting`.
- Whether timed-out requests reach the server at all (or get stuck on the network).
- Device / browser / connection split of the timeouts.
- Time-of-day or load pattern.

**Possible causes — hypotheses only, none checked. Confirm or refute each:**
- **H1 — the server is sometimes slow** (login-route work: DB, pool waits, the signature check added by the verified
  login, ADR-116 — deployed 2026-10-07 via `0395`). Test: login-route latency p95/p99 against the 5 s limit.
- **H2 — the request never reaches the server, or the answer never gets back** (network, slow mobile connections,
  the client device busy while the game is loading). Test: compare client timeout counts with server-side login
  request counts for the same window; device/connection split.
- **H3 — shared cause with `0375`** (the game server's first profile `resolve` call times out about every 10
  minutes — server side, also a timeout to the profile server). **Not proven related.**

**Related, not dependencies — link, don't merge:**
- `0375` — game server's first profile `resolve` call times out about every 10 minutes (server → profile server).
  If this investigation finds the cause is on the profile server, check whether it explains `0375` too.
- `0418` — the source of the `Citizenship:Status:ReadFailed` counts above.
- `0471` — late-match lag on weaker devices; slow devices may matter here too.
- `0263` — Uptrace keeps only ~14 days of data. Read Uptrace early, or the window that matches the GameAnalytics
  numbers above is gone.

**Access caveats:**
- The telemetry box (Uptrace) is unreachable while the owner's full-tunnel VPN is on.
- Since 2026-10-13 the permission system has denied agent SSH to the boxes; the owner may need to run read-only
  commands themselves.

## What to build

A **findings report** — no code change.

1. **Server side (Uptrace).** For the login route: latency p50/p95/p99 by day and by hour over the longest window
   Uptrace still holds; how often a login takes ≥ 5 s on the server; `db.pool.waiting` over the same window; server
   errors on the login route. Compare the server's login request count with `Succeeded + Failed` from
   GameAnalytics for the same days — a big gap means timed-out requests never reached the server.
2. **Client side (GameAnalytics).** Split `Profile:Login:Failed:Timeout` by device type, OS, browser, connection
   type (where GameAnalytics has it), and hour of day. Compare each split against the same split of
   `Profile:Login:Succeeded`, so the result is a **rate**, not a raw count that just follows where players are.
3. **Pattern.** Does the timeout rate rise with load (busy hours), after deploys, or with particular devices?
4. **`0375` cross-check.** Does the server-side evidence explain `0375`'s timeouts too? State yes / no / unknown with
   the evidence.
5. **Options with trade-offs**, for example: a longer timeout; one retry; a server-side fix if the server is slow;
   doing nothing if it is the network and the cost of a fix outweighs 2–3 %. ⚠️ **Any retry changes owner ruling D3
   (2026-09-16) — that is the owner's call. Present it as an option with its cost; do not recommend it as settled.**

The coder's plan confirms or adjusts these steps before starting.

## Verification steps

- A report exists at `ai-agents/knowledge-base/reports/YYYY-MM-DD-0474-profile-login-failure-findings.md`.
- It states, with numbers and the window they came from, the login-route latency p95/p99 and how often the server
  itself took ≥ 5 s.
- It states whether timed-out requests reached the server (server request count vs client `Succeeded + Failed`),
  or says plainly that this could not be determined and why.
- It gives the timeout **rate** (not just counts) by device / browser / connection / hour, from GameAnalytics.
- Each of H1–H3 is marked confirmed, refuted, or unknown, with the evidence.
- It lists at least two options with trade-offs, and flags any option that changes D3 as the owner's decision.
- No source code changed (`git diff -- src/` is empty for this task's work).
- No secrets, DSNs, endpoints, ids or URLs in the report.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing (any fix is filed or ruled after the findings are reviewed with the owner)
- **Related (not dependencies):** `0375`, `0418`, `0471`, `0263`.
- ⚠️ **Priority is append rank, NOT a merit ranking — flagged for owner confirmation.** The Backlog board is
  unranked; this row was appended at the bottom. **On merit this belongs directly below `0375`**, because both are
  timeouts to the profile server and one investigation may answer both. The owner said "later", so it stays
  unscheduled.
- **Time-sensitive:** Uptrace keeps ~14 days (`0263`). The GameAnalytics read above covers 13–19 Oct 2026; Uptrace
  data for those days is gone by about early November. A later start can still work — just re-read GameAnalytics for
  a window Uptrace still holds.
- Any eventual fix deploys in a weekend slot unless the owner calls it urgent; a verify task follows a build task at
  the top of the next sprint (owner's standing build/verify-split rule).
