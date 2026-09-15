# Remove the tenure XP claim logic ~60 days after release

## ID
0268

> ℹ️ **ID allocation, checked 2026-09-15 before filing** (same run as `0266`). `0268`: no folder, no
> `## ID` hit, no `.claude/` hit, no repo-wide hit (`.svg`/`.json` filtered).

## Sprint
Backlog

## Priority
Unscheduled

**Time-gated, not rank-gated:** it cannot start before ~60 days after the tenure grant reaches players.
Producer's rank when that date arrives: **Medium** — not owner-ruled; it closes a known abuse path
(below).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-15 by a spawned `fkit-producer` on an OWNER RULING given live in a design discussion in
the lead session and relayed by `fkit-lead`.** Owner's reasoning, as relayed: after **~60 days
(30–60)** from the tenure grant's release, nearly all eligible active players will have claimed it;
leftovers are acceptable. Then the claim logic is removed.

**Why it matters beyond cleanup:** while the platform id is trusted (ADR-103), anyone who knows another
player's id could claim that player's grant with made-up evidence (ADR-112 *Consequences*). The owner
dropped the per-IP rate limit on the new login/claim routes in favour of monitoring, reasoning that
**once the claim logic is removed, the fake-id claim attack is impossible.** This task is that removal.

The grant is built in [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md)
(redesigned 2026-09-15: login on every load, then a claim only if the citizenship card is enabled and
the tenure check has not happened; the server decides once and never repeats).

## What to build

1. **Record the release date first.** When `0253` reaches players (XP go-live, `0217`), write the date
   here; the removal date is that + ~60 days (owner: 30–60 acceptable).
2. **Client:** remove the tenure claim request, the one-time popup and its strings (`en.json` **and**
   `ru.json` in the same change), and the tenure analytics events (update
   `analytics-event-reference.md` — mark them retired, do not silently delete history).
3. **Server:** remove the claim route. **Keep the recorded grants** (`player_xp_grants` rows and XP
   already given) — removing the route must not change any player's XP. Whether the "tenure checked"
   field in the login reply stays or goes follows `0266`'s design.
4. **Docs:** amend ADR-112 (architect) to record that the tenure grant is closed; say whether the
   mechanism stays available for future grants.

## Verification steps

1. The release date and the chosen removal date are written in this brief before any code change.
2. After the change, a logged-in load sends no claim request and shows no popup (checked in a local
   build).
3. The claim route returns 404 (or the design's equivalent) — integration test.
4. Players' XP and existing grant rows are unchanged — integration test over a seeded grant.
5. No orphan strings: every removed key is gone from both `en.json` and `ru.json`; `npm test` passes.
6. The analytics reference marks the tenure events retired.

## Notes

- **Depends on:** [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md) — shipped and live to players, plus ~60 days
- **Blocks:** nothing
- **Related:** [`0266`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)
  (login reply shape), [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md), ADR-112.
- ⚠️ **Nothing reminds anyone of the date.** If a reminder is wanted, that is the owner's call (e.g. a
  scheduled check) — not set up by this filing.
