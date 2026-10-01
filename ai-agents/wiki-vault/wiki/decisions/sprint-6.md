# Sprint 6 — Full F2P Loop & Social Features *(renamed 2026-09-26; was ~~More Content~~)*

**Date**: 2026-04-17
**Status**: accepted *(✅ **closed 2026-09-29** by `/fkit-sprint-done`, agent-closed — not owner-verified; ~~🔄 in progress since 2026-09-26~~; was `proposed` while pre-scoped)*

> # 🆕 2026-09-30 (latest, `b434732`) — ✅ SPRINT 6 CLOSED 2026-09-29: 49 ROWS, 23 DONE, 26 MOVED, 0 OPEN
>
> **Re-counted at `HEAD` = `b434732`, by each row's leading status glyph: 49 rows — 23 `✅ Done` · 26
> `➡️ Moved` (15 → [[decisions/sprint-7]], 8 → [[decisions/sprint-8]], 3 → the Backlog board); 0 OPEN**
> (was 46 / 21 open). ⚠️ Counted by me this run. **Every close is `(agent-closed — not owner-verified)`.**
> Board now at `ai-agents/sprints/done/plan-sprint-6.md`.
>
> - **Closed by `/fkit-sprint-done` on 2026-09-29**, line-3 banner `✅ Done — 2026-09-29`. Owner rulings, live
>   via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037; ⛔ not producer
>   precedent): **R1** *"Close now, move 3 to Sprint 7"* — the three open rows `0339`, `0341`, `0289` moved to
>   Sprint 7 at 25–27 in that owner-ruled order; **R2** *"Yes, start Sprint 7 now (Recommended)"*. ⚠️ The owner
>   ruled the close but did not check the board.
> - **Three more closed in this window (23 total):** [[tasks/deploy-apt-noninteractive]] (`0286`, step 8
>   owner-run 2026-09-26), [[tasks/verified-login-shadow-mode]] (`0325`, closed as the **S2 build** only — S3a
>   moved to `0340`, the live check to `0339`; see [[decisions/adr-116-verified-login]]),
>   [[tasks/match-exit-keeps-query-string]] (`0331`, probe P1 confirmed trigger B; its live check split into
>   `0337`).
> - **Build-and-verify split (owner ruling 2026-09-29):** a task whose proof needs a deploy closes as the build;
>   a verify task goes to the top of the next sprint and must not block this sprint's deploy. Hence `0337`
>   (verify `0331`), `0339` (verify `0325` S2), `0341` (verify `0285`, deploy + disabled-channel drill).
> - **Moved to Sprint 7 on 2026-09-29:** `0339`, `0341`, `0289` (R1); `0340` and the tasks that depend on it —
>   `0250`, `0248`, `0301` (owner, *"Move 0340 and any tasks from the Sprint 6 that depends on it to the Sprint
>   7."*); `0297` with `0309`, the task it waits on (from the Backlog board); `0308` (its plan was approved and
>   moved at the plan gate); `0213`. Earlier (2026-09-27): `0027`, `0030`, `0032`, `0219`, `0221`.
> - **The 11 brief-less rows became two discussion briefs** (owner ruling): paid-citizenship items → `0343` on
>   [[decisions/sprint-8]]; the rest → `0342` on the Backlog board ([[decisions/sprint-backlog]]); ruling C then
>   moved leaderboard rewards, coin economy and clans from `0342` to `0343`.
> - **Deploy:** the combined telemetry → game → profile deploy ran **2026-09-29** and shipped most of this
>   board's code — see [[systems/weekend-deploy-window]]. Several of its checks are still owed there.
>
> ---
>
> # 🆕 2026-09-28 (`68303d5`) — SPRINT 6 IS IN PROGRESS: 46 ROWS, 20 CLOSED, 5 MOVED TO SPRINT 7
>
> **Re-counted at `HEAD` = `68303d5`, by each row's leading status glyph: 46 rows — 20 `✅ Done` · 16
> `🔲 Backlog` · 5 `🚧 Blocked` · 5 `➡️ Moved`; 21 OPEN** (was 37, all open). ⚠️ Counted by me this run.
> **Every close is `(agent-closed — not owner-verified)`** — no human checked any of the 20.
>
> - **Started 2026-09-26.** Line-3 banner now `🔄 In progress — 2026-09-26` (was `🔲 Backlog — 2026-09-23`).
>   Owner, via `AskUserQuestion`: **"Start Sprint 6, then drive (Recommended)"** — driven by
>   `/fkit-sprint-ship-loop` from `0307`, the owner approving each task's plan before any code. **This is the
>   active sprint.**
> - **Closed (20), code in `390c4b4` and `68303d5`:**
>   - name-change moderation and name safety — [[tasks/player-name-path-security-review]] (`0307`),
>     [[tasks/name-change-operator-decide-command]] (`0312`), [[tasks/name-change-decision-resets-notify-limit]]
>     (`0313`), [[tasks/name-change-dismiss-and-clear]] (`0314`), [[tasks/name-change-digest-pending-list]]
>     (`0315`), [[tasks/name-change-approved-message-wording]] (`0316`);
>   - approved name in matches — [[tasks/approved-name-in-matches-investigation]] (`0317`),
>     [[tasks/start-screen-approved-name-lock]] (`0321`), [[tasks/approved-name-in-multiplayer-matches]]
>     (`0322`) and [[decisions/adr-115-approved-name-in-matches]];
>   - perks and purchase — [[tasks/private-lobby-citizen-perk]] (`0302`), [[tasks/citizenship-restart-prompt]]
>     (`0303`), [[tasks/private-lobby-close-leaves-lobby]] (`0327`), [[tasks/remove-game-name-from-player-texts]]
>     (`0311`);
>   - the vanishing card — [[tasks/citizenship-card-vanishes-investigation]] (`0318`),
>     [[tasks/citizenship-card-newest-profile-read]] (`0326`), [[tasks/platform-degraded-analytics-event]]
>     (`0328`), [[tasks/citizenship-card-late-recovery-recheck]] (`0329`), [[tasks/sdk-loader-download-retry]]
>     (`0330`);
>   - monitoring and deploy — [[tasks/uptrace-channel-state-check]] (`0285`),
>     [[tasks/config-parity-guard-arm-enforce]] (`0298`).
> - **Added out of band (owner rulings):** `0321`/`0322` from `0317`; **`0325`** verified login (Yandex signed
>   player data → verified sessions) from `0250`'s design — ruled *"directly above 0250"* but appended;
>   `0326`/`0327` moved in from the Backlog board; `0328`–`0331` filed from `0318`.
> - **Moved to [[decisions/sprint-7]] 2026-09-27** (owner, verbatim: *"Move the tasks 0027, 0030, 0032, 0219,
>   0221 to the Sprint 7"*): `0027`, `0030`, `0032`, `0219`, `0221`.
> - **`0308` parked 2026-09-27** — reset `🔄 In progress` → `🔲 Backlog`, rank 6 → 35 (owner's own words:
>   *"Let's come back to this task later, decrease the priority and put it to the end of the current
>   sprint"*). Its build had not started. ⚠️ `0307`'s and ADR-115's "revisit in `0308`" items wait with it.
> - **Open and blocked (5):** `0250` (slice S1, the paid-state leak fix, built and reviewed *Ready to merge*;
>   S3b waits on `0325`); `0325` (waits on the owner-run S0 test); `0289` (waits on `0285`'s owner drill);
>   `0331` keep the query on match exit (waits on the owner's probe P1 — *"Park it: mark 0331 Blocked"*);
>   `0286` (unchanged, owner-executed step 8).
> - **Still `🔲 Backlog` here:** `0248` ad-free for paid citizens, `0301` citizenship explainer popup (which
>   `0302` must ship with), `0297`, `0308`, `0213`, the map tasks and the seven F2P / social items.
>
> ---
>
> # 🆕 2026-09-26 (`899df29`) — 37 ROWS: `0297` APPENDED LAST; SPRINT 5 CLOSED; NO SPRINT IS ACTIVE *(later the same day Sprint 6 was started — see above)*
>
> **Re-counted at `HEAD` = `899df29`, by each row's leading status glyph: 37 rows — 33 `🔲 Backlog` · 4
> `🚧 Blocked`; all 37 OPEN** (was 36). ⚠️ Counted by me this run. **Line-3 banner still
> `🔲 Backlog — 2026-09-23` — ⛔ not started** (owner ruling). [[decisions/sprint-5]] was closed the same day
> by `/fkit-sprint-done` *(agent-closed — not owner-verified)*, so **no sprint is active**; the source records
> `dashboard.sh select-active` reporting `active none` on 2026-09-26.
>
> - **`0297` (paid citizenship — owner-run test-buy sequence) appended as the LAST row, rank 34** (this
>   board's highest rank was 33). Owner, verbatim (typed in the `fkit lead` session, relayed by `fkit-lead`
>   to a spawned `fkit-producer`, ADR-021/037; ⛔ not producer precedent): *"Move it to the bottom of
>   Sprint 6"*. Status `🔲 Backlog` and Task cell copied verbatim. ⛔ Supersedes the 2026-09-23 ruling that
>   pinned `0297` to the top of Sprint 5. It sits here as a **watch item** — §4 (a real player's successful
>   `/reconcile`) is still open. Appended, never inserted (ADR-035); no other row moved or re-ranked.
> - The *"The active sprint is Sprint 5"* sentence in the block below was true until Sprint 5 closed —
>   struck at source, kept here as history.
>
> ---
>
> # 🆕 2026-09-26 — 36 ROWS: SPRINT 5'S NON-LAUNCH WORK MOVED IN, 17 NEW BRIEFS FILED, FOUR RE-RANKS
>
> **Re-counted at `HEAD` = `2177ea6`, by each row's leading status glyph: 36 rows — 32 `🔲 Backlog` · 4
> `🚧 Blocked` (`0032`, `0219`, `0221`, `0286`); all 36 OPEN** (was 5 rows). ⚠️ Counted by me this run.
> **Line-3 banner still `🔲 Backlog — 2026-09-23`** — ⛔ **not started.** ~~The active sprint is
> [[decisions/sprint-5]] (the citizenship launch).~~ *(true until Sprint 5 closed later that day — no sprint is
> active since)*
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

Source: `ai-agents/sprints/done/plan-sprint-6.md` *(moved from ~~`ai-agents/sprints/plan-sprint-6.md`~~ when the sprint closed, 2026-09-29; older notes on this page cite the old path)*

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
- [[decisions/sprint-7]] — created 2026-09-27 to receive five rows moved out of this board; also holds this board's follow-ups `0323`, `0332`–`0336`
- [[decisions/adr-115-approved-name-in-matches]] — the ADR carried by this board's `0322`
- [[decisions/sprint-backlog]] — `0326` and `0327` were moved in from the Backlog board
- [[systems/alert-delivery]] — how a monitoring alert reaches a human; `0285` and `0289`, its remaining checks, sit on this board
- [[tasks/config-parity-guard-pre-arming-gate]] — task `0203`, the pre-arming items for the config guard
- [[decisions/sprint-8]] — created 2026-09-29 to receive `0343`, the paid-citizenship discussion brief made from this board's brief-less rows
- [[tasks/deploy-apt-noninteractive]] — task `0286`, closed on this board 2026-09-29
- [[tasks/verified-login-shadow-mode]] — task `0325`, closed on this board as the S2 build 2026-09-29
- [[tasks/match-exit-keeps-query-string]] — task `0331`, closed on this board 2026-09-29
- [[decisions/adr-116-verified-login]] — the ADR carried by this board's `0325`
- [[tasks/player-name-lost-space]] — task `0308`, filed, ranked and parked here; cancelled on Sprint 7 2026-10-01
