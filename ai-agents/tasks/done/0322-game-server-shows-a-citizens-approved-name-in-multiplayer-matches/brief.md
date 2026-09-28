# Game server shows a citizen's approved name in multiplayer matches

## ID
0322

## Sprint
Sprint 6

## Priority
37

✅ **37 — placement OWNER-RULED 2026-09-27** (*"End of Sprint 6 (Recommended)"*, live via `AskUserQuestion`
in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037). Append rank,
directly after `0321` (36). No row was renumbered (ADR-035). **On merit it sits directly below `0321`**,
because `0321` makes this task's failure case (a slow lookup) nearly invisible.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-27 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on owner rulings on
`0317` given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead`.** ⛔ Not
producer precedent. This is brief **B2** of the `0317` findings report (approach (a)).

**Owner rulings this brief carries out (verbatim):**
- **D2** (approach): **"(a) Server swaps it in (Recommended)"**.
- **D3** (trust level until `0267`): **"Accept, record as ADR (Recommended)"** — *"Ship (a) now; write the
  accepted risk down as a design decision (an ADR); 0267 closes it later with no rework."*
- **Rude-name filter gap:** **"Keep filter, warn me first (Recommended)"** — *"The filter stays. When you
  review a name request, you're told if the filter would hide it, so you can decline it."*
- **D6** (look-alike names): **"Keep accepting, revisit in 0308 (Recommended)"** — *"You, as moderator,
  catch look-alikes when approving. Handle it properly with 0308 (which characters a name may contain)."*

**The problem.** In a match the name is whatever the client typed. The server checks its shape and relays
it. Nothing links it to the profile, so an approved name never reaches other players.

**The design** ([`0317` report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md)
§5(a), §8 B2). At join the game server already asks the profile server who this player is (the resolve call
behind the `0068` citizen icon, through the one identity funnel of ADR-103). This task adds **one optional
field** — the approved name — to that same response, and the server shows it instead of the typed name.
Every multiplayer surface (map labels, leaderboard, player panel, chat, events, win screen, private-lobby
lists) reads from two server points, so **no client change is needed** (report §3).

**🚨 Accepted risk — owner-ruled (D3), recorded, not solved.** The only identity the game server has is the
Yandex id the client *claims* (ADR-103). Until `0267` ships verified identity, **someone who sends another
citizen's Yandex id gets that citizen's approved name.** And anyone can still **type** the same string, or a
look-alike, as today (D1, D6). `0267` closes the first case later with no change to this task's code.

## What to build

1. **Contract.** An optional `displayName` (string or null) on the resolve response, parsed so both deploy
   orders work (old profile server + new game server, and the reverse).
2. **Profile server.** The internal resolve route returns the player's approved name.
3. **Game server.** Store it on the client's connection; carry it across a reconnect the same way the citizen
   flag is carried. A resolve that finishes **after the match starts is ignored** (the roster is frozen at
   start, as for the citizen flag).
4. **Swap, with a re-check.** Where the lobby list and the match-start roster are built, show the approved
   name instead of the typed one — **only after re-checking it against the current join-name rule at the
   moment of the swap.** If it fails (for example because `0308` changed the rule after approval), fall back
   to the typed name. Never trust the stored string blindly (report §2 point 1).
5. **Fail-soft.** A missing, failed or slow lookup never blocks or delays a join (the `0068` rule). The
   player then plays under the typed name.
6. **Moderator warning for the rude-name filter** (owner ruling above). The match's profanity filter stays on
   approved names. When a name request reaches the moderator, the notification says whether that filter
   would hide the name from other players, so the moderator can decline it. Where the digest lists pending
   names (`0315`), the plan decides whether to show it there too.
7. **ADR (D3) — written by `fkit-architect` as part of this task**, with `/fkit-record-decision`, before the
   task closes: approved names in matches run at ADR-103 trust level until `0267`; the forged-id case and the
   typed-copy case are accepted risks; `0267` closes the first with no rework here. It **updates ADR-103's
   scope** (a third consumer of the funnel; showing a player-chosen identity to others is new). It also
   records that the lobby poll (`GET /api/game/:id`, unauthenticated) now carries a stable name, widening
   `0068`'s accepted residual R3 (report §5(a) risk 3). **The ADR records rulings already given; it does not
   make new ones** — any new decision goes back to the owner.
8. **Tests:** contract skew in both directions, the swap, the re-check fallback, reconnect carry, resolve
   after start ignored, the moderator warning, fail-soft.

## Verification steps

1. Tests pass for every item in step 8. `npm test` green (re-run and say so if the known `supertest` flake
   appears).
2. Contract skew: an old response without `displayName` parses; a new response is accepted by the old
   parser.
3. Integration (`npm run test:integration`): the resolve route returns the approved name for a player who
   has one, and null for one who does not.
4. Local run, two browsers: a citizen with an approved name joins a private lobby; the other player sees the
   approved name in the lobby list, on the map label, leaderboard and player panel.
5. Local run: an approved name that the join rule would now refuse → the typed name is shown, with a log
   line (no player name in the log).
6. A name request that the profanity filter matches → the moderator's notification carries the warning.
7. The ADR exists under `ai-agents/knowledge-base/decisions/`, names D3 verbatim, and ADR-103 links to it.
8. `0316`'s wording is updated (see Notes) — or the owner has ruled it waits. *(2026-09-28: now optional — see the owner ruling in Notes.)* *(2026-09-28, later: settled — no reword, by OWNER RULING "Keep the short text"; see Notes.)*

## Notes

- **Depends on:** `0307` (done)
- **Soft dependencies (not blocking):** `0321` (recommended first — graceful fallback), `0267` (verified
  identity; closes the forged-id case with no change here), `0308` (name rule; the swap re-checks, so either
  rule works).
- **Blocks:** [`0323`](../../backlog/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (the mark).
- ⚠️ **When this ships, `0316`'s wording ~~must~~ be updated.** The approve message would then truthfully say the
  name shows in matches from the next game. [`0316`](../0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md)
  is still open; if it ships first, its text changes again here; if this ships first, fold the new wording
  into `0316`. Owner approves any wording.
  - 📌 **2026-09-28 — OWNER RULING on `0316` Q2 (append-only; added by a spawned `fkit-producer` at
    `fkit-lead`'s request, ruling given live via `AskUserQuestion` in the `fkit lead` session, ADR-021/037).**
    Answer, verbatim: **"Once, when 0322 ships (Recommended)"** — *"0322's note becomes 'may reword, owner
    approves the text'; 0321 gets 'doesn't touch this message'. One rewording, when the name fully shows in
    matches."* So the update is now ~~**optional: this task may reword `0316`'s approve message; the owner
    approves the text.**~~ Reason: `0316` ships the short wording (owner ruling Q1 "C: short") — en *"Your new
    display name '{name}' has been approved."* / ru *«Ваше новое имя «{name}» одобрено.»* — which stays true
    after this task ships. Adding where the name shows (e.g. "in matches from your next game") would be an
    improvement, not a fix for a false statement. Source: `0316`'s `plan.md`.
  - 📌 **2026-09-28 (later) — SETTLED by OWNER RULING "Keep the short text": no reword** (append-only; added by
    a spawned `fkit-producer` at `fkit-lead`'s request, ruling given live via `AskUserQuestion` in the `fkit lead`
    session, ADR-021/037). Option text: *"No reword. The current text is true and never goes stale."* This
    supersedes the Q2 ruling above ("Once, when 0322 ships"). `0316`'s approve message stays as shipped; no
    reword task is filed.
- **Carries over from `0068`:** "freshness bounded by last join" and "a slow lookup freezes the match as
  typed name" are unchanged.
- **Related:** [`0317`](../0317-investigate-show-a-citizens-approved-name-in-matches/brief.md) (source) ·
  [`0068`](../0068-citizen-verified-icon/brief.md) (same seam) ·
  [`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md) (private-lobby gate, unaffected) ·
  [`0315`](../0315-name-change-daily-digest-lists-the-pending-requests-not-just-the-count/brief.md)
  (digest) · [`0267`](../../backlog/0267-investigate-verifying-platform-player-identity/brief.md) (verified identity) ·
  ADR-103, ADR-113.
- **Privacy/secrets:** no player ids, names, tokens, hosts or IPs in code comments, logs, tests, worklog,
  report or the ADR.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- 📌 **2026-09-27 — where the forged-id case actually closes (append-only; pointer, not a dependency).** Added
  by a spawned `fkit-producer` after OWNER RULING D3 on `0250` (relayed by `fkit-lead`; ADR-021/037). Verified
  login is filed as
  [`0325`](../../backlog/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md), but
  **`0325` alone does not close this task's forged-id case**: the game server learns the id from the WebSocket
  join and never sees the profile session. It needs a **second step on top of `0325`** — the client sends its
  session token in the join, and the game server asks the profile server to vouch for it (design report
  [`2026-09-27-0250-…`](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md)
  §6). **That step is not filed yet** and is not part of `0325`. The *soft dependency on `0267`* above should
  be read as *`0325` plus that second step*.
- 📌 **Routing note from [`0303`](../0303-the-whole-game-reflects-a-purchase-without-a-reload/brief.md) (2026-09-28, `0303` plan step 11; added by a spawned `fkit-producer` at `fkit-lead`'s request):**
  *"after a purchase the popup offers a restart and a match end reloads anyway, so a perk may read status at load time. A grant made by session-start reconciliation applies from the next load unless the perk listens to `PURCHASES_RECONCILED_EVENT`."*
- 📌 **2026-09-28 — OWNER RULING on `0068` R3 (append-only; added by a spawned `fkit-producer` at
  `fkit-lead`'s request, ruling given live via `AskUserQuestion` in the `fkit lead` session, ADR-021/037).**
  The question: the unauthenticated public lobby poll already carries the citizen flag (`0068`'s accepted
  residual R3), and after this task it also carries the approved name — does that need a new decision?
  Answer, verbatim: **"0302 acceptance is enough (Recommended)"** — *"Already covered by your 0302 ruling and
  the new design note (ADR-115); no new decision."*
  So the R3 widening is accepted as recorded in
  [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md)
  (consequence 4) and in `0302`'s ruling. **Do not re-raise R3 for this task** — at the plan gate, in review,
  or at close.
