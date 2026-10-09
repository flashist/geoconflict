# Verify 0332 live — read the two identity counters and confirm no session token reaches the logs

## ID
0405

> ℹ️ **ID allocation, checked 2026-10-07 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0404`. No `0405` hit under `ai-agents/` or `.claude/`. `0405` allocated in this
> run.

## Sprint
Sprint 8

## Priority
15

> ⚠️ **Priority 15 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs in the top group of the [Sprint 8 board](../../../sprints/plan-sprint-8.md)**, with the other
> verify tasks, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the
> next sprint"*. Not placed there: ranks 2–4 and 8–14 on that board are closed rows (`➡️ Moved` / `✅ Done`), and
> moving this row above them would renumber them — ADR-035 forbids that *"not even under an owner ruling"*; a spawned
> producer also never re-ranks. Appended after the board's highest rank (14, `0404`) instead — the reversible branch,
> as with [`0390`](../0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md).

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The two deploys are the owner's (weekend slot). The
counter reads and the log search are read-only and can be run by an agent session with the owner's read-only SSH /
Uptrace approval — **confirm that approval covers this task first** (standing rule: read-only checks are run, not
handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0396`](../../done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md).)*

## Context

**Filed 2026-10-07 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0332`'s close**, on the
owner's standing build/verify-split rule (2026-09-29) and the owner's close ruling of 2026-10-07 (*"Close it
(Recommended)"* — *"A producer closes 0332 and files the 'verify it live' task for after the deploy …"*), relayed by
`fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 7. ⛔ Not producer precedent. The **build** task is closed; this
**verify** task sits on the next sprint and **must not block** Sprint 7's deploy.

**What this verifies.** [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)
(closed 2026-10-07 `(agent-closed — not owner-verified)`; design: ADR-124) makes the client send its login pass
(profile session token) to the game server, and the game server has the profile server vouch for it on the resolve call
it already makes. The funnel now knows whether a player's Yandex id is **verified**. **Players see no change** — every
perk stays open to unverified players (owner rulings Q2–Q5).

It added two counters (owner ruling Q1, 2026-10-07: *"… we can add some metrics to the code and check them after"* —
no measuring-only weekend slot), and a log-leak fix:
- **`geoconflict.profile.resolve.vouch{outcome}`** (profile server) — one count per resolve, outcome one of `verified` /
  `absent` / `invalid` / `expired` / `unverified_session` / `other_player` / `other_platform` / `no_secret`.
  ⚠️ **Per resolve, NOT per player** — one player can be resolved several times a match (join, late token, credit time,
  reconnect).
- **`geoconflict.server.match.identity{state}`** (game server) — one count per player per match, at match start, state
  one of `guest` / `unresolved` / `verified` / `unverified`. **This is the per-player figure.** Late joiners are not
  counted.
- The session token is a 24 h bearer credential with no revocation. It must never be logged, stored or relayed
  (ADR-124; `0332` plan §8.1 log fixes in `Worker.ts` / `GameServer.ts`).

**What was proved before close, and what was not.** Unit tests for every piece; lint and `tsc` clean. ⚠️ The full
`npm test` was **red in 2 of 3 runs** on `supertest` suites the build did not touch, read as the known flake — likely,
not proven, at a rate above `0200`'s ~4–7 %. The integration suite was **not run**. **Not proved: anything on the real
servers.** That is this task.

### Preconditions — this task cannot start until all of these hold
- `0332` is **committed** (the owner commits) and deployed in a weekend slot, **profile server first, then the game
  image** (`0332` plan §6). Record both deploy dates and times.
- Real matches have been played on the new game image — enough for the counters to mean something (the owner judges
  how long; a weekend of normal traffic is a reasonable default).
- Access to the counters and logs (Uptrace on the telemetry box; the profile and game boxes' container logs). ⚠️ The
  telemetry box is unreachable while a full-tunnel VPN is on — see the project memory note on telemetry VPN access.

## What to build

Nothing — this is a check, read-only after the owner's deploys.

1. **Right after the profile-server deploy** (before the game deploy), if convenient: `/health` and `/ready` return 200,
   and `geoconflict.profile.resolve.vouch` appears with `outcome=absent` only (the old game server sends no token).
2. **After the game deploy and some real matches:** read both counters over a stated window.
3. **Search the logs** of both servers for any session token.

## Verification steps

1. **Profile counter is live and sane:** `geoconflict.profile.resolve.vouch` reports counts after the game deploy, and
   `verified` is non-zero. Record the count per outcome for the window. Read it as **per resolve, not per player**.
   `other_platform` should be 0 (it cannot happen today); `no_secret` should be 0 (a non-zero value means the profile
   box has no session secret — a defect).
2. **Game counter is live and sane:** `geoconflict.server.match.identity` reports counts, and `verified` is non-zero.
   Record the count per state for the window, and the **verified share among players with a Yandex id**
   (`verified / (verified + unverified + unresolved)`).
3. **Compare with login, per ADR-124's re-raise trigger 2:** set the step-2 share beside the verified share at login for
   the same window (the login-signature numbers `0391` / `0402` read). **If the match-start share is much lower than
   the login share**, say so and flag ADR-124 trigger 2 to the owner (revisit Decision 4 and the client's timing before
   anything is enforced). Do **not** file a fix task on that alone — it is an owner call.
4. **Expected-not-a-failure notes:** a non-trivial `expired` share is task
   [`0404`](../../done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md)'s case (`0332` review R2,
   accepted residual: a pass older than 24 h is sent at join) — record it; it re-raises R2 only if it is a large share.
   `absent` includes old clients, credit-time resolves and reconnects.
5. **No token in any log:** over the same window, search the game-server logs and the profile-server logs (read-only)
   for the token shape `v1.<base64url>.<base64url>` (a `v1.` prefix followed by two long base64url parts) and for the
   field names `profileSession` and `sessionToken`. **Expect zero hits that carry a token value.** The warn line
   *"client sent too many profile session tokens; ignored"* and the info line *"client profile session received
   post-join"* name only `clientID` — they are expected and are **not** a leak. Any hit carrying a token value is a
   defect against ADR-124: file a fix task, and tell the owner at once (a logged token is a live 24 h credential).
6. **No player-visible change:** no new player complaint or error spike tied to joins in the window (the owner's call
   on what to look at).
7. Record in this task's `worklog.md`: deploy dates, the window, the per-outcome and per-state counts, the two shares,
   the log-search method and its result. **No tokens, player ids, endpoints or credentials** in the record. If a step
   fails, say which and file a fix task; do not reopen `0332`.

## Notes

- **Depends on:** [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)
  committed and deployed (profile server, then game image).
- **Blocks:** nothing. It does **not** block Sprint 7's deploy (owner's build/verify-split rule, 2026-09-29).
- **Related:** ADR-124 (*Re-raise only if* — trigger 2 and the "token appears in a log" defect line) ·
  [`0404`](../../done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md) (the `expired` case) ·
  [`0402`](../../done/0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md) (login-side numbers to
  compare with) · [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (the first planned reader
  of the `verified` bit).
- **Timing:** Uptrace keeps logs about 14 days in practice
  ([`0259`](../../done/0259-investigate-uptrace-retention-not-applied/brief.md)); read well inside that.
- No secrets in this task's record: no connection strings, endpoints, tokens or player ids.
