# Investigate: show a citizen's approved name in matches (the `0067`(b) follow-up)

## ID
0317

## Sprint
Sprint 6

## Priority
8

✅ **8 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). Below `0307` and `0308`, directly below `0314`. See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~32~~ (append rank).

~~⚠️ **32 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0308`**, because it puts a player-chosen name in front of every other player, so it should
follow `0307` (security review of name paths) and `0308` (which characters a name may contain) rather than
race them.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-architect

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)**, under the same owner
rulings as `0316` (finding **"In-match name + wording"** → **"Sprint 6, bottom"**, live via
`AskUserQuestion`, relayed by `fkit-lead`). ⛔ Not producer precedent.

**Why this exists.** Owner ruling on `0067`, (b): *the approved display name is shown on the
profile/citizenship card only; start-screen username prefill/lock, lobby player lists and in-match labels
"become a separate follow-up task"*. That task was never filed. Observed live 2026-09-26: after an approve,
the in-match name did not change. Citizens (and paid buyers) now reasonably expect the name they paid a
moderation step for to be the name other players see.

**Why investigation first, not a build brief** (the investigation-first rule — the unknowns are real):
1. **Identity and trust.** In a match the name comes from what the client sends on join. To show an
   *approved* name, something must tie "this connection is player X" to player X's `display_name`. Today's
   seam is `GameServer.getCreditableYandexId()` using a **raw, unsigned** id; signed verification is open
   work (`0267`). If the game server takes a client-claimed id and looks up its name, **anyone could play
   under another citizen's approved name.** A `0068` review note (relayed by the lead, not re-verified here)
   says the game server's citizen flag is already visible without login — the same shape of problem.
2. **Name rules.** Today the in-game name runs through `sanitizeUsername` and the join `UsernameSchema`;
   `display_name` runs through the name-change validator. They differ (`0307`, `0308` document how). Which
   rule wins in a match?
3. **Surfaces.** Start screen prefill/lock, lobby lists, in-match labels (`NameLayer` writes names with
   `innerHTML` — safe only because of `sanitizeUsername`, per `0307`), leaderboard, replays, chat.
4. **Guests and degraded sessions** (no login, no SDK — see `0318`): what name do they get?

## What to build (the investigation)

1. Map where the in-match name comes from, end to end, and every surface that shows it.
2. Lay out 2–3 approaches with trade-offs (use `/fkit-evaluate-approach`), at least:
   (a) server-side lookup of `display_name` from a **verified** identity (blocked on `0267`'s outcome?);
   (b) client-supplied name, allowed to equal the approved name only when the profile server confirms it for
   an authenticated session (for example via the authenticated profile read in `0250`);
   (c) keep the free-typed in-match name but **lock/prefill** the start-screen field to the approved name for
   citizens (cheap, no trust gain — anyone can still type any name).
   For each: impersonation risk, what `0267`/`0250` must land first, surfaces touched, cost.
3. Recommend one; list the implementation briefs it would split into, with dependencies. The producer files
   them after the owner rules.
4. Save findings to `ai-agents/knowledge-base/reports/` (never the wiki). No code.

## Verification steps

1. A findings report exists and answers the four unknowns in Context, each with file references.
2. It states plainly, for the recommended approach, whether one player can appear under another citizen's
   approved name, and under what conditions.
3. It names the prerequisite tasks (`0267`, `0250`, `0307`, `0308` or others) as hard or soft dependencies.
4. The owner has ruled on the approach (recorded verbatim) before any implementation brief is filed.

## Notes

- **Depends on:** nothing
- **Blocks:** the in-match-name implementation briefs this investigation will propose.
- ⚠️ Any implementation it proposes will likely depend on
  [`0307`](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) and
  [`0308`](../../backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md);
  the investigation itself need not wait for them, but must read their current state.
- **Related:** [`0067`](../../done/0067-name-change-citizens-only/brief.md) (ruling (b)) ·
  [`0068`](../../done/0068-citizen-verified-icon/brief.md) (citizen flag in matches — the precedent and the
  review note) · [`0267`](../../backlog/0267-investigate-verifying-platform-player-identity/brief.md) (verified identity)
  · [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) (authenticated profile read) ·
  [`0316`](../0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md) (wording
  updated again if this ships) · [`0311`](../0311-remove-the-game-name-from-player-facing-texts/brief.md).
- **Privacy/secrets:** no player ids, names or tokens in the report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. Is a **cheap, no-trust-gain** step acceptable first — prefill the start-screen name with the approved name
   for citizens (option (c)) — while the real, verified version waits on `0267`/`0250`? *Producer view: only
   if the owner accepts that anyone can still type the same name.*

## Owner rulings (2026-09-27)

**Given live via `AskUserQuestion` in the `fkit lead` session on 2026-09-27, relayed by `fkit-lead` to a spawned
`fkit-producer` holding no owner channel (ADR-021/037).** Recorded verbatim; appended (ADR-035). ⛔ Not producer
precedent. The questions are D1–D6 of the
[findings report](../../../knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md) (§11), plus the
report's rude-name filter point and the placement of the briefs. This satisfies verification step 4 and answers
*Open question 1* above (D1).

| # | Question | Owner's answer (verbatim) | Option text shown (verbatim) |
|---|---|---|---|
| **D1** | Prefill the start-screen name with the approved name first? | **"Yes, prefill first (Recommended)"** | *"Honest citizens play under their approved name right away. Accept that anyone can still type the same name."* |
| **D2** | Which approach? | **"(a) Server swaps it in (Recommended)"** | — |
| **D3** | Trust level until `0267`? | **"Accept, record as ADR (Recommended)"** | *"Ship (a) now; write the accepted risk down as a design decision (an ADR); 0267 closes it later with no rework."* |
| **D4** | Can a citizen play under another name? | **"No, approved name locked (Recommended)"** | *"The name box shows the approved name, locked, with a hint to change it on the citizenship card. One clear rule."* |
| **D5** | A mark showing the real approved name? | The owner's own words: **"Not now, but create a brief for this task and add it to the end of the end of the next sprint."** | — (free text) |
| **D6** | Look-alike names — a re-raise of `0307`'s *"Accept for now"* residual, whose re-raise condition is now met | **"Keep accepting, revisit in 0308 (Recommended)"** | *"You, as moderator, catch look-alikes when approving. Handle it properly with 0308 (which characters a name may contain)."* |
| — | Rude-name filter gap (the match's profanity filter can replace an approved name with a stand-in for other players) | **"Keep filter, warn me first (Recommended)"** | *"The filter stays. When you review a name request, you're told if the filter would hide it, so you can decline it."* |
| — | Placement of B1 and B2 | **"End of Sprint 6 (Recommended)"** | — |

**Effect (filed 2026-09-27 by that producer):**
- **B1** → [`0321`](../0321-prefill-and-lock-the-start-screen-name-to-a-citizens-approved-name/brief.md) — prefill
  and **lock** the start-screen name (D1 + D4). End of Sprint 6.
- **B2** → [`0322`](../0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md) — the game
  server swaps in the approved name (D2), re-checks it against the current name rule, warns the moderator when
  the rude-name filter would hide a requested name, and carries the D3 ADR (written by `fkit-architect`; updates
  ADR-103's scope). End of Sprint 6, after `0321`.
- **B3** → [`0323`](../../backlog/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) — the mark (D5). End of
  [Sprint 7](../../../sprints/plan-sprint-7.md). Depends on `0322`.
- **D6** → recorded as a note in
  [`0308`](../../backlog/0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md)'s
  Notes. `0308`'s status and plan unchanged.
- `## Status` of this brief was **not** changed here; the lead routes the close separately.
