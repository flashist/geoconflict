# Verify 0404 Live — Long-Session Refresh Events and the After-Refresh Login Split (task 0406)

**Source**: `ai-agents/tasks/done/0406-verify-0404-live-read-the-long-session-refresh-events-and-the-after-refresh-login-split/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 16 / task `0406`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner ruling **"Close it as is"** — *"Accept
> 'popup fires, no sign of a problem'; record the open question about the 0 presses."* ⚠️ **The main question is NOT
> answered.**

## Goal

The live check for `0404` ([[tasks/long-session-refresh-popup]]): the forced "please refresh" popup after 23 h on the
start screen, whose job is that a player's 24 h login pass does not expire mid-visit (the exit for `0332`'s review
finding R2). Main question: **do refreshed players come back verified?** — answered by the
`Profile:Login:SignatureAge:AfterRefreshPopup:*` split.

## Key Changes

None — read-only. GameAnalytics read by `fkit-lead` through the owner's browser (26 Sep – 10 Oct; the page again showed
"Demo mode" text). The `expired` share was cited from `0405`'s read ([[tasks/join-token-identity-vouch-live]]).

## Outcome

| Event | Count |
|---|---|
| `Session:LongSessionRefresh:Due` | 42 |
| `PreemptedByStaleBuild` | 11 (all on 9 Oct, the day of a game deploy — expected) |
| `Shown` | 3 |
| `Refresh`, `Waited`, `DeferredByDialog` | 0 |

- **The popup fires in production.** No sign of a problem.
- ⚠️ **NOT VERIFIED — the main question:** **no data** — 0 `Refresh` presses, so no `AfterRefreshPopup` login value.
- ⚠️ `expired` share 0 of 14,266 resolves, but **no before/after is possible** (`0332` and `0404` shipped in the same
  image) and two game deploys forced reloads, so few pages reached 24 h. "No sign of R2", not proof `0404` closes it.
- **Open question, recorded, no task (the owner did not ask for one):** 3 `Shown` but 0 `Refresh`, though the popup has
  no close button — tabs closed, or `Refresh` lost before the reload (the same shape as `0418`'s missing
  `Citizenship:Status:Restart`). Also unchecked: 1 `Due` on 8 Oct, before 23 h could have passed.

## Related

- [[tasks/long-session-refresh-popup]] — task `0404`, the build this checks
- [[tasks/join-token-identity-vouch-live]] — task `0405`, the `expired` read cited here
- [[tasks/join-token-identity-vouch]] — task `0332`, whose review finding R2 this popup answers
- [[decisions/adr-121-login-signature-24h-window]] — why a login pass lives 24 h
- [[systems/analytics]] — the `Session:LongSessionRefresh:*` events
- [[decisions/sprint-8]] — the board (rank 16)
