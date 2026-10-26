# Discussion: Nickname Styling — Who May Buy, Price, File / Park / Drop (task 0477)

**Source**: `ai-agents/tasks/done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md` (its `worklog.md`, batches 1–3, read as the record of the rulings)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 11 (append rank in the owner-ruled talk order — first talk) / task `0477` / owner `fkit-producer`

> ✅ Closed 2026-10-24, outcome **File** (*"File (Recommended)"* — *"Investigation + build tasks on the Backlog board; the
> build waits on them and on 0484 (Sprint 9). 0477 closes."*). A talk, not a build: no code.

## Goal

Item B of `0343` ([[tasks/parked-paid-features-discussion]]): paid looks for a player's name — background colour,
border, text colour. Decide who may buy, the price, and the outcome. The old prose made styles an upsell only for
players who already had the citizen name, at 49–99 ₽ each — both now overruled.

## Key Changes

Owner rulings, 2026-10-24 (live `AskUserQuestion`, relayed by `fkit-lead`; quotes verbatim):
- **Who may buy:** **"Everybody (Recommended)"** — any logged-in player; buying makes them a full paid citizen.
- **A guest:** asked to log in first — and the **rule for ALL purchases** (*"allowed to all, gives paid citizenship, if
  it's a guest - we're asking to log in (ideally, after login we should make a seamless transition to the purchase flow
  …)"*) → [[decisions/paid-items-purchase-rules]]; the flow became task `0484` ([[tasks/shared-purchase-flow-design]]).
- **Price, one style:** *"something like almost 2x of that price, something like 499 Yan"* — a **working figure, not
  final**; the final price is confirmed before a build ships.
- **Pack:** carried to `0483` (Backlog board).
- **Readability:** conditional — *"If there is already an implemented solution for that in the game (as for the
  patterns/flags), then I would like to reuse it. If not, hen option 1"* (a small fixed set the owner approves once on
  real maps; no free picker, no moderation). ⚠️ Whether such a solution exists is **unchecked** → `0485`.
- **Shown to others:** **"Yes, shows to all (Recommended)"**, no extra identity check.
- **Test or ship:** *"Ship to all, but with a feature flag that allows it to be switched off quickly … the backend
  implementations should not be affected by it"*; and flag off **hides the buy button too** (**"Yes, hide it too"**).
  Ruled for styles only, not generalised.

## Outcome

- Filed on the Backlog board: **`0485`** (investigation — one shared name-drawing path? a reusable readability/approval
  solution from flags/patterns? owner `fkit-architect`) and **`0486`** (build: nickname styles behind a feature flag;
  owner `fkit-coder`). `0486` depends on `0485` and — after owner ruling OD-3 — on `0495` + `0496` (B3 + B4 of the
  shared purchase flow) instead of `0484`.
- `0010` (flags) and `0011` (patterns) also wait on the shared purchase flow.

## Related

- [[tasks/parked-paid-features-discussion]] — task `0343`, the parent agenda
- [[decisions/paid-items-purchase-rules]] — the all-purchases rule given here
- [[tasks/shared-purchase-flow-design]] — task `0484`, asked for here
- [[systems/shared-purchase-flow]] — what `0486` will plug into
- [[tasks/leaderboard-badges-talk]] — task `0482`, which ruled the same flag shape for badges
- [[decisions/sprint-9]] — the board (rank 11)
- [[decisions/sprint-backlog]] — the Backlog board, where `0483`, `0485` and `0486` were filed
