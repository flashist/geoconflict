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
🔲 Backlog

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
  [`0307`](../0307-security-review-of-every-player-name-path-injection-and-validation/brief.md) and
  [`0308`](../0308-player-name-loses-its-space-find-where-and-decide-which-characters-a-name-may-contain/brief.md);
  the investigation itself need not wait for them, but must read their current state.
- **Related:** [`0067`](../../done/0067-name-change-citizens-only/brief.md) (ruling (b)) ·
  [`0068`](../../done/0068-citizen-verified-icon/brief.md) (citizen flag in matches — the precedent and the
  review note) · [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md) (verified identity)
  · [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) (authenticated profile read) ·
  [`0316`](../0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md) (wording
  updated again if this ships) · [`0311`](../0311-remove-the-game-name-from-player-facing-texts/brief.md).
- **Privacy/secrets:** no player ids, names or tokens in the report.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. Is a **cheap, no-trust-gain** step acceptable first — prefill the start-screen name with the approved name
   for citizens (option (c)) — while the real, verified version waits on `0267`/`0250`? *Producer view: only
   if the owner accepts that anyone can still type the same name.*
