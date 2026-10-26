# Discussion: Clans — What Is Free, What Is Sold, Prices, File / Park / Drop (task 0479)

**Source**: `ai-agents/tasks/done/0479-discussion-clans-what-is-free-what-is-sold-prices-and-outcome/brief.md` (its `worklog.md`, batches 1–2, read as the record of the rulings)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 13 (append rank in the owner-ruled talk order) / task `0479` / owner `fkit-producer`

> ✅ Closed 2026-10-24, outcome **Park** (*"Not now: Park (Recommended)"*). What brings it back: **"Only when I say so"**
> — no condition written down. A talk, not a build: no code.

## Goal

Item H of `0343` ([[tasks/parked-paid-features-discussion]]): decide the clan system's free and paid parts, prices and
outcome. Today's only clan mechanism is the typed `[TAG]` in a name ([[systems/clans]]).

## Key Changes

Owner rulings, 2026-10-24 (relayed by `fkit-lead`; quotes verbatim). The owner's direction for **when clans return** —
his own words are *"probably"* / *"maybe"*, so this is a direction, not a final design:
- **Founding is free for all citizens, paid or earned**; **one clan owner per citizen**; paid extras could be going over
  a small member limit and decorations for clan members. The old 99–149 ₽ founding fee is dropped.
- **Joining:** **"Citizens only"** — founding and joining both need citizenship.
- **Tags:** *"I don't think we will enable tags anytime soon. … when we have clans, we will pland and design and use the
  tags system there. I don't think we will allow users to change the tags (only the owner of a clan will be able to do
  so)"*.
- **Today's `[ABC]` grouping:** the code suggests same-tag players are already put on one team in team matches
  (`getClanTag` in `src/core/Util.ts`, `src/core/game/TeamAssignment.ts`) — **not verified live**; the name filters may
  strip the brackets. Owner: *"Check first, then decide. But if this logic is already there, we might reuse it in the
  future"*.

## Outcome

- **Filed:** `0487` (Backlog board, `fkit-coder`, read-only) — does a `[ABC]` tag really put players on one team in live
  team matches today, and is a player whose clan overflows a team silently dropped? The owner decides after it reports.
  Nothing is switched off or kept by ruling until then.
- The old lobby-health gate (*"only build clans when analytics shows lobbies are consistently filling"*) is replaced by
  the owner's own call.
- Prices left open on purpose (Park); any price stays above 249 Yan ([[decisions/paid-items-purchase-rules]]).

## Related

- [[systems/clans]] — the clan-tag mechanism this talk is about
- [[tasks/investigate-clans-system]] — the earlier clan investigation
- [[tasks/parked-paid-features-discussion]] — task `0343`, the parent agenda
- [[decisions/paid-items-purchase-rules]] — the rules any paid clan extra follows
- [[decisions/sprint-9]] — the board (rank 13)
- [[decisions/sprint-backlog]] — the Backlog board, where check `0487` was filed
