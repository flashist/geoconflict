# Join token — the game server has the profile server vouch for a player's verified session before trusting their Yandex id

## ID
0332

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest ID on all three boards (folder names and
> `## ID` fields agree): `0331`. **`0332`:** no task folder, no `## ID` hit, no hit under `.claude/`.

## Sprint
Sprint 7

## Priority
9

> 📌 **2026-09-29 — rank 7 → 9.** Shifted down two by an OWNER-RULED placement that put `0339` + `0340` directly below `0337` on the [Sprint 7 board](../../../sprints/done/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 `0339`/`0340` addendum). Not a merit change for this task.

> 📌 **2026-09-29 — rank 6 → 7.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/done/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

⚠️ **Priority 6 is append rank, NOT a merit ranking — flagged for owner confirmation.** The **placement** is
owner-ruled (end of Sprint 7, 2026-09-28 — see *Context*); the number is simply this board's highest (5,
`0323`) plus one. No row was moved or renumbered (ADR-035).
**On merit this belongs directly below `0221`, i.e. directly above `0323`**, because `0323` hard-depends on
this task. The dependency (see *Notes*) carries that order; the rank number does not.

## Status
✅ Done (agent-closed — not owner-verified)

> 📌 **2026-10-07 — reset `🔄 In progress` → `🔲 Backlog`.** Phase 1 (design) is finished and its exit is met (see the
> 2026-10-07 rulings note at the end). The build (phase 2) has **not** started: by the owner's ruling relayed by
> `fkit-lead` (*"Run 0332 design (Recommended)"*), the sprint loop stops after the design rulings. The task is parked
> for `fkit-coder`. Set by a spawned `fkit-producer` (no owner channel, ADR-021/037). Earlier values, kept as history:
> ~~🔄 In progress~~ (2026-10-07, phase 1 start) ← ~~🔲 Backlog~~.

## Owner
fkit-coder

> 📌 **2026-10-07 — re-assigned `fkit-architect` → `fkit-coder`** for phase 2 (the build), per this brief's own phase-1
> exit. The design keeps the build as **one slice** (all four perks stay open to unverified players, so the design's
> enforcement slice B is not needed — report §10); no new briefs were filed. Earlier value, kept as history:
> ~~fkit-architect~~.

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
2. **The citizen ★ badge** — [`0068`](../0068-citizen-verified-icon/brief.md): a forged id can show
   the ★ (cosmetic, accepted).
3. **The private-lobby gate** — [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md):
   a forged citizen id can pass the gate (owner-accepted 2026-09-26).
4. **The approved name in matches** —
   [`0322`](../0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md) /
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

> ✅ **2026-10-07 — Phase 1 exit MET.** Report:
> [`2026-10-07-0332-join-token-design.md`](../../../knowledge-base/reports/2026-10-07-0332-join-token-design.md).
> ADR: [ADR-124](../../../knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md)
> — signed off by the owner 2026-10-07 (Q8 *"Accept with answers (Recommended)"*); the ADR file itself and the dated
> notes on older ADRs are being updated by `fkit-architect` in a separate spawn, not here. Owner rulings Q1–Q8: recorded
> verbatim in the 2026-10-07 note at the end of this brief. `## Owner` re-assigned to `fkit-coder`; the build stays one
> slice (no split). Note: the phase-1 premise *"`0325` is blocked on an owner-run test"* is stale — verified sessions
> have been live since 2026-10-07 (`0395`; report §0 point 1).

### Phase 2 — Build (owner: `fkit-coder`, after phase 1)

Built from the design. In outline only — the design decides the shape:
- the client sends its profile session token in the join (and wherever else phase 1 says identity enters);
- the game server has the profile server vouch for it, and the funnel returns the Yandex id together with
  whether it is verified;
- ~~each of the four users applies the policy the owner ruled in phase 1;~~ *(2026-10-07: the owner kept all four
  perks open to unverified players — nothing to apply; see the scope below)*
- the ADR is written and, where owner-signed, ADR-103 / ADR-115 are updated to point at it. *(2026-10-07: ADR-124 is
  written and signed off; the ADR-103/113/115/116 notes are `fkit-architect`'s, in progress separately — not a coder
  step.)*

#### 📌 2026-10-07 — the build scope, fixed by the design and the owner's rulings (supersedes the outline above)

**Source of truth:** the design report
([`2026-10-07-0332-join-token-design.md`](../../../knowledge-base/reports/2026-10-07-0332-join-token-design.md)) —
its **slice A** (§10), with §3 (entry points, late token, reconnect carry), §4 option A (the token rides the existing
resolve call), §5 (what "vouched" means — all five conditions), §6 (the funnel), §8 (credential handling), §9
(compatibility, deploy order) and §14 (testing strategy) — and
[ADR-124](../../../knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md).
Read both before planning. Where the report recommends something the owner ruled otherwise (Q1, Q5), **the ruling
wins** — see the rulings note at the end.

**One slice. No player-visible change.** In plain terms:

1. **Client** sends its profile session token in the WebSocket join when it already has it, or in the existing
   `update_identity` message once a slow login finishes — **no new message type** (report §3.3). Sent only over an open
   socket, never buffered ahead of a join, none for local games.
2. **Game server** adds the token to the resolve call it already makes to the profile server (Q6, option A). It holds
   the token in memory only until the first vouch. Reconnect carries the result (§3.4).
3. **Profile server** checks the token on that resolve call and replies `verified: true|false` (report §5: signature,
   not expired, `vfy:true`, platform `yandex_games`, same player as the joined Yandex id). The session secret stays on
   the profile box only.
4. **The funnel** (`GameServer.getCreditableYandexId`) returns the Yandex id **together with** whether it is verified.
   A missing `verified` (old profile server, or a profile server that cannot answer) ⇒ **unverified** (Q7).
5. **Every perk stays open to unverified players** (Q2–Q5): XP, the ★ badge, the private lobby, the approved name. If
   the build adds the report's policy table, all four uses are set to *allow*. The design's enforcement slice B is
   **not** filed.
6. **Counters** (Q1 — *"add some metrics to the code and check them after"*): the profile-side vouch-outcome counter
   and the game-side count of match players by identity state at match start (report §9.4), so the verified share
   among real match players can be read after deploy. They are read **after** deploy by the verify task filed at this
   build's close — **no** separate measuring-only weekend slot (Q1).
7. **Log-leak fix and hardening, in the same build** (report §8.1): `src/server/Worker.ts:457-460` must log only the
   message type for a pre-join message, never the whole message (today it can write a token — and already writes a
   Yandex id — into the logs); stop echoing the raw message on a parse failure (`GameServer.ts:350-360`); the two
   catch-alls (`GameServer.ts:461-467`, `Worker.ts:556-563`) log the error name only. Line numbers are from the report's
   citation frame (`dev` at `5a70b6f`) — re-check them.
8. **Deploy order:** profile server first, then the game image (report §9.2). Weekend slot; commit only on the
   owner's ask.

**Not in this build:** enforcement (slice B); `0397`'s text change (no perk is lost, so the 2026-10-06 `0397` pointer
below is **not** triggered); the server-confirmed name mark (`0323`, which needs this build's `verified` bit); the
verify-live task (filed at this build's close, per the owner's build/verify-split rule).

### Out of scope — named so it is not absorbed

- ⛔ Verified login itself (`vfy:true` sessions) — that is `0325`.
- ⛔ The server-confirmed name mark — that is [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md),
  which waits on this task.
- ⛔ Gating the profile server's own name-change routes — that is
  [`0319`](../../backlog/0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md).
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

- **Depends on:** [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — there is no verified session to send until it ships; it is `0325`'s slice S3a, split into its own task 2026-09-29). *Repointed 2026-09-29, kept as written:* ~~[`0325`](../0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) (hard — there is no verified session to send until its slice S3a ships)~~
- 📌 **2026-09-29 — dependency repointed from `0325` to `0340` (append-only).** Added by a spawned `fkit-producer` at `fkit-lead`'s request, on an OWNER RULING given 2026-09-29 live via `AskUserQuestion` in the `fkit lead` session (ADR-021/037): **"Split it (Recommended)"** — *"Close 0325 as the S2 build (agent-closed). File a 'verify S2 live' task … at the top of Sprint 7, and a separate 'S3a enforce' build task after it."* `0325` closed as the S2 build (it checks the signature but still mints only `vfy:false`). The verified session this task sends in the join now comes from [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md), ~~which waits on [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (verify S2 live) and an explicit owner approval~~ *(stale — struck 2026-10-05: `0340` no longer waits on any task; it may start now and only its deploy is gated, ADR-122 — see the 2026-10-05 note at the end)*. Where this brief says *"`0325`"* or *"its slice S3a"* for the verified session, read `0340`.
- **Blocks:** [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (hard — the mark is only honest once the game server can check who the player is; owner ruling on `0323`, 2026-09-28)
- **Closes (when phase 2 ships and the owner's per-user policy is applied):** ADR-103's forged-id risk for
  XP crediting · the `0068` ★ forged-id case · the `0302` private-lobby-gate forged-id case · ADR-115
  residual 1 (`0322`). ⚠️ *(2026-10-07: by the owner's rulings Q2–Q5 every perk stays open to unverified players, so
  this build closes **none** of these four — each stays an owner-accepted risk, now measurable. The build supplies
  the `verified` bit a later ruling, or `0323`, can use. ADR-115 residual 1 stays open by owner ruling Q5.)*
- **Related:** [`0250` design report](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md)
  §6 (where this step was first named) · [ADR-103](../../../knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md) ·
  [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md) ·
  ADR-113 (internal player id; session notes) · [`0267`](../../backlog/0267-investigate-verifying-platform-player-identity/brief.md)
  (the game-server path is its open scope) · [`0319`](../../backlog/0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) ·
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md).
- **Effort:** not estimated — phase 1 decides it.
- **Privacy/secrets:** no player ids, names, tokens, hosts or IPs in the report, tests, worklog or brief.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. ~~For a player whose session is **not** verified: should XP still be credited, the ★ still shown, the
   private lobby still open, and the approved name still swapped in? (Asked after phase 1 lays out the cost
   of each.)~~ *(answered 2026-10-07 — yes to all four, Q2–Q5; see the rulings note at the end)*

## 📌 2026-10-05 — deploy step: the owner looks at the post-`0391` login numbers first (appended; the stale *"`0340` waits on `0339`"* wording above is struck, not deleted, ADR-035)

**Provenance.** OWNER RULING given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Yes, add the note (Recommended)"*. Design record: [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md) (accepted 2026-10-05; supersedes ADR-121 Decision 4).

- **Before this task's deploy:** the owner looks at the post-`0391` login-signature numbers that exist at the time (stale share,
  `ok`, `id_mismatch`, `bad_payload`, read from the first post-`0391`-deploy point) and decides whether to deploy or
  wait longer. No fixed window, no fixed bar. Record the window, the numbers and the owner's call in this task's
  worklog. The read is read-only, done the same way as [`0392`](../0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (which covers only `0340`'s deploy and closes after it).
- **Unchanged:** this task still depends on [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (verified
  sessions). `0340` itself no longer waits on any task — it may start now (`🔄 In progress` 2026-10-05); its own deploy
  needs the owner's look plus a separate, explicit owner approval to enforce. The owner's look here is **not** an
  approval of anything beyond this task's deploy.
- No status, sprint or rank changed by this note. No mover run.

## 📌 2026-10-05 — deploy only after `0395` confirms `vfy: true` live (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Note only (Recommended)"*.

- **Deploy this task only after [`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) confirms `vfy: true` live** in production. `0340` now closes once built
  and reviewed (owner ruling, 2026-10-05); verified sessions are live only after `0395`'s deploy and the owner's
  DevTools check. Until then no player is verified, so a route that reads `verified` would see none.
- **This is a note, not a dependency.** The `Depends on` line is unchanged (it names `0340`, which covers the
  **build**); no link to `0395` was added, by the owner's ruling. When `0340` closes, the board will stop showing this
  task as waiting — that is about building, not deploying.
- No status, sprint or rank changed by this note. No mover run.

> 📌 **2026-10-06 — pointer: the player-facing "not confirmed" message lives in
> [`0397`](../0397-show-players-whether-their-session-is-verified/brief.md).** Added by a spawned `fkit-producer` at
> `fkit-lead`'s request, after the owner's `0397` Step 1 rulings (2026-10-06). `0397` shows unverified **citizens** a
> neutral message that today names only one cost: **ads**. **When the owner rules here what an unverified player loses**
> (XP crediting, the ★ badge, the private-lobby gate, the approved name), the task that implements that ruling must:
> (1) rewrite `0397`'s *not confirmed* text (EN + RU, owner-approved) to name the new loss, and (2) if the loss also hits
> **non-citizens** (XP crediting would), switch on a message for unverified non-citizens — `0397` deliberately shows
> them nothing today. The producer adds that line to the ruling's brief. ⛔ `0397` promises no perk survives an
> unverified session. Nothing above this note was edited (ADR-035); no status, rank or sprint changed.

## 📌 2026-10-07 — OWNER RULING: the post-`0391` login numbers are no longer a gate for this deploy (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given live by the owner in a session on 2026-10-07, relayed to a spawned `fkit-producer`
with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"I made a decision that we no longer
wait for those numbers. Monitor them as planned and after a few days we will check them again to make better decisions
but they no longer block us so the point is that we already improved this tail numbers drastically and we can move
forward"*. Plain reading: `0391` already cut the stale-login tail a lot, so no deploy that reads `verified` waits on
the numbers any more.

- **Removed:** the *"Before this task's deploy: the owner looks at the post-`0391` login-signature numbers …"* step in
  the 2026-10-05 note above (ADR-122's owner-judgment look). This deploy no longer waits on it, and the worklog no
  longer needs to record a window, numbers and an owner's call on them.
- **Still happens, non-blocking:** the numbers are monitored, and the owner re-reads them in a few days to inform later
  decisions — task [`0402`](../../done/0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md). Nothing here
  waits on it.
- **Unchanged:** the `Depends on` line; the 2026-10-05 *"deploy only after `0395` confirms `vfy: true` live"* note
  (`0395` confirmed `vfy: true` live 2026-10-07); the weekend-slot and commit-on-ask rules. This ruling removes only the
  numbers look — it is not, by itself, an approval to deploy.
- ADR-122 is being updated separately (by `fkit-architect`); this note does not edit it. No status, sprint or rank
  changed. No mover run.

## 📌 2026-10-07 — OWNER RULINGS on the phase-1 design (Q1–Q8); phase 1 exit met; parked for `fkit-coder` (appended; nothing above deleted, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-07 live via `AskUserQuestion` in the `fkit lead` session, relayed
verbatim by `fkit-lead` (driving `/fkit-sprint-ship-loop`, Sprint 7) to a spawned `fkit-producer` with no owner
channel (ADR-021/037); ⛔ not producer precedent. Questions as put: design report
[§15](../../../knowledge-base/reports/2026-10-07-0332-join-token-design.md). Answers, verbatim:

| # | Question (short) | Owner's answer, verbatim | Recommended? |
|---|---|---|---|
| Q1 | Measure first, or switch on at once? | FREE TEXT: *"No, we're not spending another weekend slot for counting only, but we can add some metrics to the code and check them after."* | — (free text) |
| Q2 | XP for unverified players | *"Keep XP (Recommended)"* | yes |
| Q3 | ★ badge for unverified citizens | *"Keep the ★ (Recommended)"* | yes |
| Q4 | Private lobby for unverified citizens | *"Keep it open (Recommended)"* | yes |
| Q5 | Approved name in matches for unverified citizens | *"Keep for unconfirmed"* | **no** — the design recommended *verified only* |
| Q6 | How the game server asks | *"Reuse login pass (Recommended)"* | yes |
| Q7 | Profile server cannot answer | *"Treat as unconfirmed (Recommended)"* | yes |
| Q8 | Sign off ADR-124 | *"Accept with answers (Recommended)"* | yes |

**Also relayed, earlier the same session** (option *"Run 0332 design (Recommended)"*): the loop stops after the design
rulings — **the build is not started.**

**What follows, in plain terms:**
- **Every perk stays open to unverified players** (Q2–Q5). So the design's enforcement slice B is not needed, and the
  build is **one slice**: vouch + counters + the log-leak fix and hardening, with **no player-visible change** — scoped
  in *Phase 2 — Build* above.
- **Q1:** no measuring-only weekend slot. The counters ship inside the build, and the owner reads them after deploy —
  through the verify task filed at this build's close (owner's build/verify-split rule, 2026-09-29). **No verify task is
  filed now.**
- **Q5 went against the recommendation:** approved names are **not** limited to verified players. ADR-115 residual 1
  (a forged id shows a citizen's approved name) **stays open by owner ruling**. Consequence for
  [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md): its "server-confirmed name" mark cannot
  rely on the name swap alone and needs its own verified check, using the `verified` bit this build provides — a dated
  note was added there. `0323` still depends on this task.
- **Q6:** the token rides the existing resolve call (ADR-124 option A); the game box briefly holds bearer tokens in
  memory (accepted, report §4.2; upgrade path = the short-lived match ticket, option C).
- **Q7:** a missing `verified` reads as unverified. With every perk open this changes nothing a player sees today; it
  matters only if a later ruling denies a perk.
- **Q8:** ADR-124 is accepted with these answers. Its file and the dated notes on ADR-103 / ADR-113 / ADR-115 / ADR-116
  are `fkit-architect`'s, in progress in a separate spawn — **not edited here.**
- [`0267`](../../backlog/0267-investigate-verifying-platform-player-identity/brief.md): narrowed by a dated note — its "game-server
  path" scope is now this task / ADR-124.

**Changed here:** `## Status` → `🔲 Backlog` (was `🔄 In progress`); `## Owner` → `fkit-coder`; phase-1 exit marked met;
*Phase 2 — Build* scoped; the open question struck as answered; the *Closes* note annotated (this build closes none of
the four forged-id risks). Sprint 7 board row updated to match. **Unchanged:** sprint, rank, `Depends on` / `Blocks`
lines, the deploy notes above. No mover run, nothing committed, no wiki write.

## 📌 2026-10-07 — CLOSED `✅ Done (agent-closed — not owner-verified)`, on an owner ruling, despite a not-clean verify (appended; nothing above edited, ADR-035)

**Provenance.** Closed by a spawned `fkit-producer` with no owner channel (ADR-021/037), routed by `fkit-lead` driving
`/fkit-sprint-ship-loop` on Sprint 7. ⛔ Not producer precedent. **OWNER RULING given live 2026-10-07 via
`AskUserQuestion` in the `fkit lead` session**, relayed verbatim. Question: *"Close 0332? The new code passed every
test, every time (10 out of 10). But the full test suite failed 2 of 3 times on unrelated profile-server tests, and
those failures have a known flaky pattern. The rate was higher than usual today, and the old code showed about the same
rate in an earlier side-by-side check. The close would be marked 'closed by an agent, not checked by you'. You deploy it
in the weekend slot."* Answer: **"Close it (Recommended)"** — *"A producer closes 0332 and files the 'verify it live'
task for after the deploy. The high flaky-test rate gets noted in the close."*

**What was built.** The owner-approved [`plan.md`](plan.md) (blob `68ec270553e110c9d5c531bdcc7bbb33393969c1`), one
slice, **no player-visible change**: the token rides the existing resolve call, the profile server vouches, the funnel
returns `{ yandexId, verified }`, both counters, and the log-leak fix and hardening. Details: [`worklog.md`](worklog.md).

**Verification — NOT clean; recorded plainly.**
- Post-fix independent verify: full `npm test` **red in 2 of 3 runs**, a different `supertest` suite each time —
  `AlertRoutes` (unexpected 404), `LoginRoutes` (5000 ms timeout), `TenureGrantRoutes` (socket hang up). Run 3 green,
  4108 / 4108.
- Each failing suite: 10 / 10 green alone. The new queue-logic suites: 10 / 10 green. `0197` (the `SIGSEGV`) ruled out.
  Lint and `tsc` clean.
- Read as the known `supertest` flake family — **likely, not proven.** ⚠️ **The rate was above the ~4–7 % measured in
  `0200`.** An earlier side-by-side check (before the review fixes) showed the old code failing at a similar rate.
- The build's own runs are in the worklog (round 1: one red run, then green; review round 1: 4108 / 4108 in one run).
- **Integration suite (`gc-0012-it-pg`) NOT run** — the container was down.

**Review.** 2 rounds, `/fkit-stateful-review`; coverage **reasoning-only second opinion** in both rounds (Codex ran and
found nothing; it ran no tests). R1 ✅ fixed (owner ruling) · R2 accepted residual → task
[`0404`](../0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md) (owner ruling) ·
R3 ✅ fixed · R4 ✅ ADR-124 note (owner ruling). Ledger [`review.md`](review.md) `Status: closed-out`.

**Not done.** Not committed (the owner commits). Not deployed — owner-run, weekend slot: **profile server first, then
the game image** (plan §6). Not proved live.

**Verify task filed** (owner's build/verify-split rule, 2026-09-29):
[`0405`](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md),
on [Sprint 8](../../../sprints/plan-sprint-8.md). It does not block Sprint 7's deploy.

**Unchanged by this close:** the four forged-id risks stay owner-accepted (Q2–Q5); ADR-115 residual 1 stays open;
`0323`'s dependency on this task is now met as a **build** (not deployed); its other dependencies were not re-checked here.
