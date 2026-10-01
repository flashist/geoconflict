# The Tenure Gift Popup Never Opens Over a Lobby or Match (task 0336)

**Source**: `ai-agents/tasks/done/0336-tenure-gift-popup-can-open-over-a-lobby-or-match-on-a-quick-join/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 13 (append rank) / task `0336`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `26b85c0`; **not in any deploy yet**
> (latest game tag `0.0.155`). ⚠️ **The real claim path was NOT RUN live** — it cannot be reached in local dev;
> covered by unit tests only. The tenure popup itself **is live in production** since `0.0.154`.

## Goal

`0329`'s review finding **R3** (owner: *"Accept + file own bug"*, *"End of Sprint 7"*). The one-time **tenure
gift thank-you popup** (`tenure-grant-modal`) could open **as the player entered a lobby** and then **stay over the
live match until tapped**. The card decided "on the start screen" too early, waited on the network, then showed
the popup without asking again. Both reveal paths were exposed: `0329`'s late reveal (asks once) and the normal
gate reveal from `0253` (asks **not at all**). Two gaps: a join already under way looked like "on the start
screen" (`gameStop` is set only after `handleJoinLobby`'s three awaits), and network round trips inside the reveal.
Nothing closed the popup at match start.

## Key Changes

Owner rulings at the plan: scope **1 + 2 + 3** (all three fix directions); **Q1 = (a) accept** a lost thank-you;
**Q2 = A**; and a deliberate reversal of one `0329` test assertion.

- **`src/client/StartScreenPresence.ts`** — a `beginJoiningLobby()` counter; `whenOnStartScreen()` waits while
  the player is **away or joining**.
- **`src/client/Main.ts`** — `handleJoinLobby` holds a joining marker from its **first line** (before any await)
  and releases it in `finally`; the pre-start close loop moved to `closePreStartModals()`.
- **New `src/client/PreStartModals.ts`** — the pre-start close list, moved verbatim, with `"tenure-grant-modal"`
  appended; **`TenureGrantModal.close()`** added (drops the follow-up callback, hides).
- **`src/client/CitizenshipCard.ts`** — the popup now waits for the start screen right before it opens; the
  re-read is not held back.
- **`src/client/HostLobbyModal.ts`** (`open()`) and, after review R1 (*"Cover it"*),
  **`src/client/JoinPrivateLobbyModal.ts`** (`joinLobby()`) hold a joining marker across their own lookups.
- `CitizenshipRestartOffer.ts` untouched. No event added or renamed.

## Outcome

- **Tests:** red 21 failed / 136 passed, green 157/157; after review, 14 suites 308/308. Mutation checks pin
  each piece.
- **Live (local dev):** **L1 PASS** — popup forced open, then a single-player match starts → the popup is closed
  (before the fix it stayed visible). ⚠️ **L2 NOT RUN** (the real claim path needs an authorized Yandex player,
  a configured profile API and a pending tenure check — not reachable locally). ⚠️ **L3 NOT RUN** (a *waiting*
  popup during Create cannot be forced).
- **Accepted (owner rulings 2026-09-30):**
  - **Q1 (a):** a thank-you held back and then followed by a match is **never shown**; the XP is kept.
  - **Matchmaking wait not marked as joining** — unreachable today (`enableMatchmaking()` is `false`); *"Record
    it, build nothing"*.
  - **A hung Join lookup holds the popup** (no fetch timeout) and **a failed Join lookup lets it open over the
    Join window's error** — *"Accept both"*.
  - **Review R2, *"Accept, fix the record"*:** a popup open at match start loses its restart follow-up on an
    **in-page** Back/hash leave mid-match — the premise "a match always ends with a page reload" was **wrong** and
    the code comments were corrected.
- **Residuals noted, not fixed:** stale `gameStop` (`0228`) can hold the popup until the next leave; the restart
  popup (not this one) can still appear during a join's setup awaits — pre-existing, `0303` accepted.

## Related

- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, whose review R3 this fixes
- [[tasks/tenure-xp-grant]] — task `0253`, the gift and its popup
- [[tasks/citizenship-restart-prompt]] — task `0303`, the "never interrupt a lobby or match" pattern followed here
- [[tasks/host-create-leaves-public-lobby]] — task `0333`, the Create path the host marker covers
- [[systems/analytics]] — the `Citizenship:TenureGrant:Claimed` row
- [[decisions/sprint-7]] — the board
