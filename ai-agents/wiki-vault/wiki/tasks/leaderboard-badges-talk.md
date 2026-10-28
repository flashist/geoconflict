# Discussion: Leaderboard Rewards (Badges) — Earned Only or Sold, File / Park / Drop (task 0482)

**Source**: `ai-agents/tasks/done/0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/brief.md` (its `worklog.md`, batches 1–3, read as the record of the rulings)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 16 (append rank in the owner-ruled talk order — last talk) / task `0482` / owner `fkit-producer`

> ✅ Closed 2026-10-24, outcome **Park** (*"Park (Recommended)"*). What brings it back: **"Leaderboard is live
> (Recommended)"** — `0234` defined, the core leaderboard built and shipped, and players using it. A talk, not a build.

## Goal

Item F of `0343` ([[tasks/parked-paid-features-discussion]]): badges shown by top players' names. Decide earned or
sold, the reward levels, the art and the outcome.

## Key Changes

Owner rulings, 2026-10-24 (relayed by `fkit-lead`; quotes verbatim):
- **Talk now:** *"#3, also bring the leaderboard-related task to the current sprint."* ⇒ `0234` (Leaderboard Core
  System investigation, owner `fkit-producer`) moved from the Sprint Backlog board to **Sprint 9, rank 19**.
- **Earned or sold:** **"Earned only (Recommended)"** — *"Badges come only from real results; never sold. Keeps the
  leaderboard trusted."* A per-item exception to the default "paid option for everybody"; no price, no paid-citizenship
  grant, no grant code ([[decisions/paid-items-purchase-rules]]).
- **Art:** placeholders now, real art later — *"brief a task for the art too"* ⇒ `0489` (Backlog board).
- **Test or ship:** **"Ship to all + off switch (Recommended)"** — the switch hides only what players see; earned badges
  stay stored. Same shape as nickname styles, ruled here in its own right.
- **Reward levels:** **not answered.** Asked twice; the second answer was *"It depends on an answers from the
  producer."* — recorded as "decide after `0234`'s findings", ⚠️ **`fkit-lead`'s reading, not the owner's words** (the
  other reading, "the producer decides", would pick candidate 1). Two candidates are carried to the future build brief:
  (1) the producer's proposal — **"Top 10 now"** (comes and goes with rank) plus a dated **"Month Top 3"** trophy kept
  forever, one badge per name in a match, one main board only, **needs a monthly reset from `0234`**; (2) the original
  three tiers (all-time top 3, monthly top 3, top 4–10), which need both an all-time and a monthly board.
- **The citizen ★ art:** *"I kind of like it"* — a brainstorm brief, a few options with keeping today's ★ as one; the
  final call is the owner's ⇒ `0490` (Backlog board).

## Outcome

Park. No badge build brief yet; it is written when the leaderboard is live. Carriers of the open tier question today:
`0234` (needs to know: monthly reset? one board or both?) and `0489`. One shared name-drawing path is a technical
question carried to the build and to `0485`.

## Related

- [[tasks/parked-paid-features-discussion]] — task `0343`, the parent agenda
- [[decisions/paid-items-purchase-rules]] — the default this item overrides (never sold)
- [[tasks/nickname-styling-talk]] — task `0477`, the same off-switch shape
- [[tasks/leaderboard-player-count]] — task `0161`, a different, done leaderboard task (not `0234`)
- [[decisions/sprint-9]] — the board (rank 16); `0234` at 19
- [[decisions/product-strategy]] — `plan-index.md`'s Leaderboard row, now pointing to Sprint 9
- [[decisions/sprint-backlog]] — where `0489` and `0490` were filed and from where `0234` moved
- [[tasks/leaderboard-core-system-definition]] — task `0234`, closed 2026-10-28: **monthly reset — yes; boards — both monthly and all-time** ⇒ both badge candidates possible; the badge build waits on S5 live and used, and S6
