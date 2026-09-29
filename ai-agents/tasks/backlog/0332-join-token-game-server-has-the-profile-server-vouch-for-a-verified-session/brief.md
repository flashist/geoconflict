# Join token — the game server has the profile server vouch for a player's verified session before trusting their Yandex id

## ID
0332

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest ID on all three boards (folder names and
> `## ID` fields agree): `0331`. **`0332`:** no task folder, no `## ID` hit, no hit under `.claude/`.

## Sprint
Sprint 7

## Priority
7

> 📌 **2026-09-29 — rank 6 → 7.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

⚠️ **Priority 6 is append rank, NOT a merit ranking — flagged for owner confirmation.** The **placement** is
owner-ruled (end of Sprint 7, 2026-09-28 — see *Context*); the number is simply this board's highest (5,
`0323`) plus one. No row was moved or renumbered (ADR-035).
**On merit this belongs directly below `0221`, i.e. directly above `0323`**, because `0323` hard-depends on
this task. The dependency (see *Notes*) carries that order; the rank number does not.

## Status
🔲 Backlog

## Owner
fkit-architect

📌 **Phase 1 (the design) is the architect's.** When the design is settled and the owner has ruled on its
open questions, re-assign this field to `fkit-coder` for phase 2 (the build) — the same hand-over `0250`
made on 2026-09-27. If the design splits the build into several shippable slices, the producer files them as
their own briefs rather than growing this one.

## Context

### Authority — filed on an owner ruling

**Filed 2026-09-28 by a spawned `fkit-producer` holding no owner channel, on an OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** Owner's answer, verbatim: **"File it, end of Sprint 7 (Recommended)"**. Option text, verbatim:
*"Sits right after 0323's dependencies; it can't start before 0325 is done anyway."*

### The problem, in plain terms

The game server decides who a player is from the Yandex id the client **says** is its own, sent in the
WebSocket join. Nothing checks it — that is [ADR-103](../../../knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md),
an accepted risk. Anyone who sends another player's Yandex id is treated as that player at the one place the
game server learns identity (`GameServer.getCreditableYandexId`, ADR-103's single "funnel").

[`0325`](../0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) makes the
**profile server** able to prove who a player is: at login it checks Yandex's signed player data and issues a
**verified** session (`vfy:true`). But the game server never sees that session — so `0325` alone changes
nothing for the game server
([`0250` design report](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md)
§6, the ADR-103 and `0322` rows).

**This task is that missing second step.** After verified login, the client sends its profile session token
in the WebSocket join. The game server asks the profile server to vouch for it, and only then treats the
Yandex id as verified.

### What it closes — every current user of the funnel

The funnel has four users today; each carries an owner-accepted forged-id risk that this step is the named
exit for:

1. **XP crediting** — ADR-103's own scope. Its "re-raise only if" names this step as the expected exit.
2. **The citizen ★ badge** — [`0068`](../../done/0068-citizen-verified-icon/brief.md): a forged id can show
   the ★ (cosmetic, accepted).
3. **The private-lobby gate** — [`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md):
   a forged citizen id can pass the gate (owner-accepted 2026-09-26).
4. **The approved name in matches** —
   [`0322`](../../done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md) /
   [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md)
   **residual 1**: a forged id shows a citizen's approved name. ADR-115 says verification then goes *inside*
   `getCreditableYandexId` and that residual closes with no change to `0322`'s code.

⚠️ **Verifying is not the same as closing.** The game server knowing "this id is verified" closes nothing
until each of the four users decides what it does with an **unverified** player. Those four choices are
owner decisions (phase 1, below).

### Dependencies and conflicts, flagged

- **Hard dependency on `0325`.** There is no verified session to send until `0325`'s slice S3a ships. `0325`
  is itself blocked on an owner-run test (S0) that could, in the worst case, show the approach does not work
  at all — in which case this task is blocked with it.
- **ADR-103 and ADR-115 are locked decisions this task supersedes in part.** That is expected (both name this
  step as their exit), but it needs a new or updated ADR with the owner's sign-off — not a quiet code change.
- **`0267`** (investigate verifying player identity) still lists "the game-server path" as open scope. This
  task is that path; narrowing `0267` is a pending producer/owner step, not part of this task.

## What to build

### Phase 1 — Design (owner: `fkit-architect`)

A short design report in `ai-agents/knowledge-base/reports/` (never the wiki). It must answer, grounded in the
code:

1. **Every place identity enters the game server.** Known today: the join, the late `update_identity`
   message (a Yandex id that arrives after join), and reconnect. Login to the profile server can also finish
   *after* the join — the design says how a token that arrives late is handled.
2. **How the game server asks.** For example: carry the token on the existing join-time resolve call to the
   profile server, versus the game server checking the token itself. Weigh them — including which one keeps
   the session-signing secret on one box only.
3. **What "vouched" means exactly:** the token is valid, not expired, is `vfy:true`, **and** belongs to the
   same player as the Yandex id in the join. Any mismatch ⇒ unverified.
4. **Where the result lives.** The expected answer is *inside* `getCreditableYandexId`, so the funnel stays
   the one place identity is decided (ADR-103, ADR-115).
5. **Per-user policy for an unverified player — options for the OWNER to rule, not for the architect to
   pick:** XP crediting, the ★ badge, the private-lobby gate, the approved name. For each, say what refusing
   would cost an honest player whose verified login failed (for example during a Yandex outage — `0325`
   deliberately falls back to an unverified login, never a refusal).
6. **The token is a credential** (a 24-hour bearer token, no revocation — `0325`'s accepted residual). Show
   that it is never logged, never stored, and never relayed onward — not to other players, not in the public
   game-info route, not in turn broadcasts, not in the match archive.
7. **Compatibility and deploy order:** old clients that send no token, an old profile server that cannot
   vouch, and rollback of either side. Whether a shadow phase (measure first, enforce later, as in `0325`'s
   S2) is worth it.
8. **Whether the build is one shippable unit or several** — so the producer can split phase 2 before it
   starts.
9. **The ADR** that records the decision, and what it changes in ADR-103 and ADR-115 (residual 1) — status
   *proposed — owner sign-off pending* until the owner signs it off.

**Exit:** the report exists, the owner has ruled its open questions, and this brief's `## Owner` is
re-assigned to `fkit-coder` (or the build is split into new briefs).

### Phase 2 — Build (owner: `fkit-coder`, after phase 1)

Built from the design. In outline only — the design decides the shape:
- the client sends its profile session token in the join (and wherever else phase 1 says identity enters);
- the game server has the profile server vouch for it, and the funnel returns the Yandex id together with
  whether it is verified;
- each of the four users applies the policy the owner ruled in phase 1;
- the ADR is written and, where owner-signed, ADR-103 / ADR-115 are updated to point at it.

### Out of scope — named so it is not absorbed

- ⛔ Verified login itself (`vfy:true` sessions) — that is `0325`.
- ⛔ The server-confirmed name mark — that is [`0323`](../0323-mark-a-server-confirmed-approved-name-in-matches/brief.md),
  which waits on this task.
- ⛔ Gating the profile server's own name-change routes — that is
  [`0319`](../0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md).
- ⛔ Other platforms (web, email, Apple) — `0267` item 4.

## Verification steps

**Phase 1:**
1. The design report exists under `ai-agents/knowledge-base/reports/` and answers all nine points above, with
   file references for every claim about current code.
2. The owner's rulings on point 5 (per-user policy) and on any other open question are recorded verbatim,
   with date and channel, in this brief.
3. The ADR exists with status *proposed — owner sign-off pending*, or signed off (date and channel recorded).

**Phase 2** (to be refined by the design; each must be a test, not a claim):
4. A join with a valid `vfy:true` token for the same player ⇒ the funnel reports **verified**.
5. **Forgery:** a valid verified token for player A sent with player B's Yandex id ⇒ **unverified**. A
   tampered, expired or `vfy:false` token, or no token at all ⇒ **unverified**.
6. Each of the four users behaves as the owner ruled for an unverified player — one test per user.
7. The late-identity and reconnect paths reach the same answer as the join.
8. **Compatibility:** an old client (no token) and an old profile server (cannot vouch) both still let the
   player join and play; both deploy orders tested.
9. **No credential leak:** a test or grep proves the token never appears in logs, the public game-info
   response, turn broadcasts or the archive.
10. Tests are mandatory for any `src/core/` contract change (CLAUDE.md). `npm test` green; if a known
    `supertest` flake shows, re-run and say so.
11. No secret, token, real player id, host or IP in any committed artifact; fixtures use synthetic values.

## Notes

- **Depends on:** [`0325`](../0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) (hard — there is no verified session to send until its slice S3a ships)
- **Blocks:** [`0323`](../0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (hard — the mark is only honest once the game server can check who the player is; owner ruling on `0323`, 2026-09-28)
- **Closes (when phase 2 ships and the owner's per-user policy is applied):** ADR-103's forged-id risk for
  XP crediting · the `0068` ★ forged-id case · the `0302` private-lobby-gate forged-id case · ADR-115
  residual 1 (`0322`).
- **Related:** [`0250` design report](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md)
  §6 (where this step was first named) · [ADR-103](../../../knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md) ·
  [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md) ·
  ADR-113 (internal player id; session notes) · [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md)
  (the game-server path is its open scope) · [`0319`](../0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) ·
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md).
- **Effort:** not estimated — phase 1 decides it.
- **Privacy/secrets:** no player ids, names, tokens, hosts or IPs in the report, tests, worklog or brief.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. For a player whose session is **not** verified: should XP still be credited, the ★ still shown, the
   private lobby still open, and the approved name still swapped in? (Asked after phase 1 lays out the cost
   of each.)
