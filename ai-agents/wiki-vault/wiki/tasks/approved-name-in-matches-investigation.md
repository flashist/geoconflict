# Investigate: Show a Citizen's Approved Name in Matches (task 0317)

**Source**: `ai-agents/tasks/done/0317-investigate-show-a-citizens-approved-name-in-matches/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 8 / task `0317` (investigation — no code)

> 📌 **2026-10-07 sync — two of this investigation's follow-ups resolved.** Brief B3 (`0323`, the server-confirmed
> mark) was **cancelled** — owner: players don't care; admins' need met by `0332`'s counter
> ([[decisions/cancelled-tasks]]). The join token `0332` was built (not deployed), but on Q5 the owner kept the approved
> name for unverified players, so the forged-id case (R1 / ADR-115 residual 1) stays open by owner ruling ([[tasks/join-token-identity-vouch]], [[decisions/adr-124-join-token]]).
>
> ✅ Done (agent-closed — not owner-verified). Findings report:
> `ai-agents/knowledge-base/reports/2026-09-27-0317-approved-name-in-matches.md` (written by
> `fkit-architect`, no owner channel; its approach weighting was *assumed*, open to owner correction).

## Goal

`0067`'s ruling (b) kept the approved name on the citizenship card only and promised an in-match follow-up
that was never filed. Observed live 2026-09-26: after an approve, the in-match name did not change. Find out
how an approved name could reach other players, and at what trust level.

## Key Changes (the findings)

1. **Today the in-match name is whatever the client types.** The server checks its shape (`0307`) and relays
   it; nothing links it to the profile.
2. **The only identity the game server has is the client-asserted Yandex id** (ADR-103). The profile session
   is no stronger — it is minted from the same asserted id (`vfy:false`). So **no approach can stop a
   determined forger** until verified identity lands.
3. **Showing the name and stopping others from using it are separate steps.** Every approach except (b)
   leaves anyone free to type the same string.
4. **Approaches:** **(a)** the server swaps the approved name in from the existing resolve reply, through the
   ADR-103 funnel — **recommended**; **(b)** a client-supplied name reserved for its proven owner — costs most
   and adds no trust until verified identity; **(c)** prefill / lock the start-screen box — cheap, no trust gain.
5. **Two existing rulings were triggered:** `0307`'s look-alike residual (its re-raise condition —
   *"approved names start being shown to other players — in game"* — is literally met) and ADR-103's scope.

## Outcome

**Owner rulings, 2026-09-27 (verbatim):**

| # | Question | Answer |
|---|---|---|
| D1 | Prefill the start-screen name first? | **"Yes, prefill first (Recommended)"** — *"Accept that anyone can still type the same name."* |
| D2 | Which approach? | **"(a) Server swaps it in (Recommended)"** |
| D3 | Trust level until verified identity? | **"Accept, record as ADR (Recommended)"** |
| D4 | Can a citizen play under another name? | **"No, approved name locked (Recommended)"** |
| D5 | A mark showing the name is server-confirmed? | *"Not now, but create a brief for this task and add it to the end of the end of the next sprint."* |
| D6 | Look-alike names | **"Keep accepting, revisit in 0308 (Recommended)"** |
| — | Rude-name filter gap | **"Keep filter, warn me first (Recommended)"** |

**Filed as a result:** `0321` (B1, prefill + lock — [[tasks/start-screen-approved-name-lock]]) and `0322`
(B2, server swap + ADR — [[tasks/approved-name-in-multiplayer-matches]]) at the end of Sprint 6; `0323`
(B3, the mark) at the end of [[decisions/sprint-7]], depending on `0322`. D6 recorded in `0308`'s notes.

📌 **2026-09-29 (pointer appended to the brief, ADR-035):** **D6 was answered in `0308` as option A, *"Warn the
moderator (Recommended)"*, by owner ruling R2 on 2026-09-29** — see `0308`'s *plan APPROVED, moved to Sprint 7*
addendum. `0308` now sits on [[decisions/sprint-7]]; ADR-115's look-alike item waits with it.

📌 **2026-10-01:** `0308` was **cancelled** (not reproduced — [[tasks/player-name-lost-space]]). R2's look-alike
warning carries over to **`0365`** (Backlog), and ADR-115's residual 2 was amended to point there; the residual itself
is unchanged.

## Related

- [[decisions/adr-115-approved-name-in-matches]] — the ADR D3 asked for
- [[decisions/adr-103-identity-trust-seam]] — the funnel approach (a) rides
- [[tasks/citizenship-name-change]] — task `0067`, ruling (b)
- [[tasks/citizen-verified-icon]] — task `0068`, the same seam (and its R3 lobby-poll residual)
- [[tasks/player-name-path-security-review]] — task `0307`, the name rules and the look-alike residual
- [[tasks/name-change-approved-message-wording]] — task `0316`, the wording this would have changed
- [[decisions/sprint-6]] — the board carrying this task
- [[tasks/player-name-lost-space]] — task `0308`, where D6 was answered (R2); cancelled 2026-10-01, R2 carried to `0365`
- [[tasks/join-token-identity-vouch]] — task `0332` (2026-10-07): the join token, built; approved names stay open to unverified players (Q5)
- [[decisions/adr-124-join-token]] — ADR-124 (2026-10-07)
- [[decisions/cancelled-tasks]] — `0323` (brief B3, the mark), cancelled 2026-10-07
