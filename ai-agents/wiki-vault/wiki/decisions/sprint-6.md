# Sprint 6 — Full F2P Loop & Social Features *(renamed 2026-09-26; was ~~More Content~~)*

**Date**: 2026-04-17
**Status**: proposed

> # 🆕 2026-09-26 — 36 ROWS: SPRINT 5'S NON-LAUNCH WORK MOVED IN, 17 NEW BRIEFS FILED, FOUR RE-RANKS
>
> **Re-counted at `HEAD` = `2177ea6`, by each row's leading status glyph: 36 rows — 32 `🔲 Backlog` · 4
> `🚧 Blocked` (`0032`, `0219`, `0221`, `0286`); all 36 OPEN** (was 5 rows). ⚠️ Counted by me this run.
> **Line-3 banner still `🔲 Backlog — 2026-09-23`** — ⛔ **not started.** The active sprint is
> [[decisions/sprint-5]] (the citizenship launch).
>
> **AUTHORITY for everything below:** owner rulings and requests given live in the `fkit lead` session on
> 2026-09-26, relayed by `fkit-lead` to spawned `fkit-producer`s with no owner channel (ADR-021). ⛔ Not
> producer precedent for re-ranking.
>
> - **Renamed** — the owner: *"Rename it, but use the current name for the Sprint 6"* ⇒ this board takes
>   Sprint 5's former title. ⚠️ **The producer read it as REPLACE** (*More Content* dropped), not COMBINE —
>   open to owner correction. **The map goal is unchanged and still here** (Tasks 1, 2, `0027`); a title
>   change is not a scope change.
> - **16 rows moved in from Sprint 5**, appended (ADR-035), status cells copied verbatim: the seven
>   brief-less F2P / social items (Leaderboard Rewards, Nickname Styling, Coin Economy, Clans, Map Voting,
>   Replay Access, Custom Uploaded Flags & Patterns) and `0285`, `0289`, `0030`, `0032`, `0213`, `0219`,
>   `0221`, `0286`, `0298`.
> - **Deploy-coupled steps WAIT for Sprint 6** (*"All wait for Sprint 6 (Recommended)"*): the launch release
>   carried none of `0219`, `0221`, `0286` step 8 or `0298` Part A. ⚠️ Flagged, not settled: `0286`'s step 8
>   and `0298`'s first report-only run **already ran** at the 2026-09-26 window — the ruling governs what is
>   still left in them.
> - **Map briefs are written AFTER the launch** (*"After the launch (Recommended)"*) — not merely once
>   Sprint 5 has started. Recorded in `0027` too.
> - **New briefs filed onto this board** (owner requests and rulings): `0301` citizenship explainer popup ·
>   `0302` private lobbies as a citizen perk · `0303` the whole game reflects a purchase without a reload ·
>   `0307` security review of every player-name path · `0308` a player name loses its space · `0311`
>   remove the game name from player-facing texts · `0312`–`0318` from the owner's live name-change test on
>   `0.0.154` (three findings became seven briefs — the producer's split, kept by owner ruling *"Keep 7"*).
>   `0248` (ad-free for paid citizens) and `0250` (authenticated profile read) were **pulled in from the
>   Backlog board** by ruling.
>
> **The top of the board after four re-rank rulings the same day** (ranks 1–15; every other ranked row kept
> its relative order):
>
> | Rank | Task | Note |
> |---|---|---|
> | 1 | `0307` name-path security review | *"Top of Sprint 6"* |
> | 2 | `0302` private lobby as a citizen perk | owner: *"it should be the 2nd priority … because the funnel/explanation of the perks would depend on it"* |
> | 3–5 | `0312` operator approve/reject command · `0313` a new request after a decision must reach the operator · `0315` digest lists pending names | next to `0307` — same operator command; `0315` kept (*"Keep it"*) |
> | 6–8 | `0308` name loses its space · `0314` sticky rejected state · `0317` investigate the approved name in matches | name-rule neighbours |
> | 9–10 | `0250` authenticated profile read · `0248` ad-free for paid citizens | `0248` placed *"BEFORE the citizenship popup"*; `0250` pulled in above it |
> | 11–13 | `0301` explainer popup · `0303` purchase reflected without a reload · `0318` investigate the card vanishing after a match | the purchase-funnel group |
> | 14–15 | `0311` remove the game name · `0316` honest approve-message wording | copy-only, can ride the popup release |
> | 16–33 | maps, the seven F2P items, then `0285` … `0298` | append order |
>
> **Dependencies set by the same rulings:** `0301` now **depends on `0302` and `0248`**; `0248` is
> hard-blocked on `0250`. **`0302` and `0301` ship TOGETHER in one deploy**; until `0301` exists, `0302`'s
> locked button opens a simple *"citizens only"* popup with **no** buy button. *"Citizens"* means **earned
> or paid**. The forged-id risk on private lobbies is **accepted for now** (real fix: `0267`, Backlog board).
> ⇒ Private lobbies cannot go out before the popup, which waits on `0250` → `0248` → `0301`.
>
> 🚩 **Owner premise corrected in `0311`:** already-sent citizenship inbox messages are a **template** read
> from the lang file, so they **will** show new wording — put back to the owner as an open question.
> `0312` changes the same operator command `0307` reviews — land together or in sequence. `0318` option (i)
> would reverse `0049`'s *"no active SDK retry"* — owner's call.
>
> ---
>
## Context

Goal: expand the game with historical and thematic map content. The commercial thesis is content-led conversion: use free historical multiplayer maps to validate demand, then sell paid campaign map packs once the Sprint 4 payment infrastructure is in place.

> ⚠️ **Corrected 2026-08-09 — there is no "Sprint 5 cosmetics store".** The plan and this page both previously named one as a Sprint 6 dependency. It does not exist. The purchasable-cosmetics foundation is **Task 9 / `0010` (re-enable flags)** and **Task 9a / `0011` (territory patterns)**, which `plan-index.md:87-88` assigns to Sprint 4 but which appear in **no** sprint plan document — both sit unsprinted and blocked. Sprint 5's own cosmetics item (Task 15, custom uploaded flags/patterns) *also* depends on 9 and 9a. So the real prerequisite for paid map packs is **Tasks 9/9a, which are not scheduled anywhere.** See [[decisions/sprint-backlog]].
>
> ⚠️ **A further prerequisite surfaced 2026-08-09:** cosmetic entitlements (`flares`) currently come from the **upstream OpenFront API**, not Geoconflict's own infrastructure. Selling anything gated by the privilege checker likely requires that to move first — task `0009`. See [[decisions/adr-102-privilege-refresher-fails-open]].

> 📌 **2026-09-23 — this board now carries a line-3 status banner, `🔲 Backlog — 2026-09-23`.** Its old
> warning (*"`select-active` picks the highest open sprint identity, and this is it"*) is **struck, not
> deleted, by owner ruling** — superseded by the banners, which the selector reads. Verified this sync:
> the selector now returns Sprint 4, not this board. Board unchanged otherwise: **5 rows, all
> `🔲 Backlog`** (counted at `6eeceeb`). See [[decisions/adr-108-active-sprint-pointer]].

Source: `ai-agents/sprints/plan-sprint-6.md`

## Decision

| Task | Status | Description |
|---|---|---|
| 5b — Server restart UX | Backlog | Moved from Sprint 3; pre-restart warning plus blocking auto-refresh when the server returns |
| 5c — Mobile warning screen | Backlog | Moved from Sprint 3; one-time mobile warning with a "Continue anyway" path |
| Historical multiplayer maps | Backlog | Add 1–2 free historical maps to the normal multiplayer rotation |
| Paid campaign map packs | Backlog | Sell themed map bundles, starting with WW2, after payments infrastructure is live |

## Key Decisions

**Dependencies are explicit:** Sprint 4 (payment infrastructure, citizenship) must ship first. Paid map packs depend on the Yandex catalog and purchase flow being in place — **not** on a Sprint 5 cosmetics store, which does not exist (see the correction above). Whatever purchase UI ships with Tasks 9/9a is the reusable surface.

**Server restart UX is now part of Sprint 6:** the task moved from Sprint 3 because the product is functional without it, releases now happen less aggressively, and deployment risk outweighed the current player benefit.

**Free maps ship before paid packs:** historical multiplayer maps are the demand-validation step. They test whether players actually engage with themed content before the project invests in paid campaign production.

**Campaign maps and multiplayer maps are separate products:** multiplayer maps must stay fair under standard rules and support the lobby's player-count range. Campaign maps can be asymmetric, scripted, and historically constrained because they are sold as singleplayer or co-op content.

**Citizenship can absorb map-pack value:** one open product decision is whether paid citizens receive one free map pack, turning citizenship into a stronger content perk rather than a purely cosmetic/status tier.

**Mobile warning moved here intentionally:** it is no longer a Sprint 3 retention task. In Sprint 6 it becomes expectation-setting for mobile users arriving because of new content marketing.

## Consequences

- Sprint 6 is gated by monetization infrastructure, not just map-design capacity
- Content production becomes a first-class delivery constraint alongside engineering work
- The "1–2 free maps per pack" split needs to be locked before any paid map pack launches
- ~~A store/UI reuse path from Sprint 5 should be considered when Sprint 6 implementation briefs are written~~ — **corrected 2026-08-09: there is no cosmetics store.** Whatever purchase UI ships with Tasks 9/9a (`0010` flags, `0011` territory patterns) is the reusable surface; flag it to the coder when Sprint 6 briefs are written

## Related

- [[decisions/product-strategy]] — overall sequencing rationale
- [[decisions/sprint-3]] — original home of the mobile warning task before it was moved
- [[decisions/sprint-4]] — payments and citizenship infrastructure Sprint 6 depends on
- [[decisions/sprint-5]] — Task 15 (custom uploaded flags/patterns), itself dependent on Tasks 9/9a; **not** a source of store UI. Since 2026-09-26 its 16 non-launch rows (Task 15 among them) sit on this board
- [[decisions/sprint-backlog]] — tasks `0009`, `0010`, `0011`: the real, unscheduled prerequisites for the paid map-pack purchase surface
- [[decisions/adr-102-privilege-refresher-fails-open]] — the upstream entitlement-origin dependency behind any purchasable cosmetic
- [[decisions/adr-108-active-sprint-pointer]] — this pre-scoped plan is the one `select-active` wrongly returned while all work was on Sprint 4
- [[tasks/citizenship-go-live]] — the 2026-09-26 launch whose follow-ups (`0301`, `0302`, `0303`, `0307`, `0312`–`0318`) fill the top of this board
- [[tasks/citizenship-paid]] — the buy flow; `0250`, `0303` and `0318` act on its surfaces
- [[tasks/citizenship-name-change]] — task `0067`, whose live moderation loop `0307` and `0312`–`0317` address
- [[systems/weekend-deploy-window]] — where `0286` step 8 and `0298`'s first report-only run already ran
