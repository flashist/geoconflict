# Discussion: three parked features NOT tied to paid citizenship — server restart UX, mobile warning, free historical maps

## ID
0342

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's
words, as relayed: the 11 [Sprint 6](../../../sprints/done/plan-sprint-6.md) rows that have no brief are to be split
into separate briefs, and *"each brief should have a list of the things that should be discussed (not
implemented, but discussed)"*. The split test, delegated to the producer by the owner: *"is the task related to
the paid citizenship? If yes, put this brief into Sprint 8. If no — put it into Backlog."* End state: exactly
two briefs. **This is the "no" brief.** The "yes" brief is
[`0343`](../0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) on
[Sprint 8](../../../sprints/plan-sprint-8.md).

📌 **2026-09-29, later — three items moved OUT of this brief to `0343`.** **OWNER RULING given live in the `fkit lead` session on 2026-09-29 (ruling C)**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."* Leaderboard — Rewards Layer, Coin Economy + Rewarded Ads, and Clans — with their agenda entries, dependencies, questions and verbatim prose — now live in [`0343`](../0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) (items F, G, H). This brief keeps 5b, 5c and the free historical maps. Nothing was duplicated: each item lives in exactly one brief.

**What this brief is.** A **discussion agenda**, not an implementation plan. Nothing here is to be built from
this brief. Its job is to get an owner decision on each item — *file real briefs for it*, *keep it parked
(and say what would bring it back)*, or *drop it* — and to keep every word of the original prose in one place so
nothing is lost. The three items were plan-level ideas that never had a brief (5b and 5c *had* brief files, but
those files were lost in the FKIT migration).

**Where the rows came from.** On Sprint 6 they were: 5b and 5c (unranked, moved in from Sprint 3) and rank 16
(Historical Multiplayer Maps). *(Ranks 18, 20 and 21 were first filed here too, then moved to `0343` the same day by owner ruling C.)* Those rows now
read `➡️ Moved to [Backlog](../../../sprints/backlog.md)` and point here. See the 2026-09-29 addendum under
Sprint 6's status table.

**Earlier ruling this satisfies, not overrides.** On 2026-09-26 the owner ruled the map briefs are written
**"After the launch"**. The profile/citizenship launch sprint ([Sprint 5](../../../sprints/done/plan-sprint-5.md))
closed 2026-09-26. This brief is a *discussion* of the free-maps item, not an implementation brief, so it fits
that ruling either way.

### How the split was decided (producer's call — owner may overrule)

| Item | Tied to paid citizenship? | Why |
|---|---|---|
| 5b Server Restart UX | No | Infrastructure / UX for every player. |
| 5c Mobile Warning Screen | No | Shown to every mobile player. |
| Historical Multiplayer Maps (free) | No | Free content for everyone. ⚠️ It is the "try it first" step before paid map packs, which went to `0343`. |
| ~~Leaderboard — Rewards Layer~~ | ~~No — borderline~~ | ~~Badges are earned by rank and must never be sold.~~ ➡️ **Moved to `0343` by owner ruling C (2026-09-29).** |
| ~~Coin Economy + Rewarded Ads~~ | ~~No — borderline~~ | ~~Coins are earned by playing / watching ads; paid-adjacent, but its own economy.~~ ➡️ **Moved to `0343` by owner ruling C (2026-09-29).** |
| ~~Clans~~ | ~~No — borderline~~ | ~~Has its own paid parts (founding fee, clan banner), not citizenship.~~ ➡️ **Moved to `0343` by owner ruling C (2026-09-29).** |

## What to build

**Nothing is built from this brief.** "What to build" here is **one discussion with the owner**, item by item,
using the agenda below. For each item, record one outcome in `worklog.md` in this folder:

- **File** — write real brief(s) with `/fkit-task-brief` (decomposed, with `**Depends on:**` lines), and list
  their IDs here;
- **Park** — keep it here, and write down what would bring it back (a metric, a date, another task shipping);
- **Drop** — record the reason. (Items have no task folder of their own, so dropping one is a note here; if
  *every* item is dropped, close this brief with `/fkit-task-cancelled`.)

Items are listed in no particular order — the Backlog board is unranked.

---

### Item A — 5b. Server Restart UX (notification + auto-reload)

**In plain words.** When we deploy, the server restarts and players mid-match see a frozen screen with no
message. This would (Part B, first) show *"Server update in progress, you'll be back shortly"*, quietly poll
until the server is back, then reload the page; and (Part A, later) warn everyone ~2 minutes before a restart.

**Full prose:** [Appendix A](#appendix-a--5b-server-restart-ux-verbatim) below (copied verbatim — the brief file
`s3-5b-task-server-restart-ux.md` is **lost**, so this and the two sources are the only copies). Sources:
[`done/plan-sprint-3.md`](../../../sprints/done/plan-sprint-3.md) § *5b. Server Restart UX*, and
[`plan-sprint-6.md`](../../../sprints/done/plan-sprint-6.md) § *Task 0b — Server Restart UX*.

**Known dependencies / related work.** `/api/version` (`0111`) and the stale-build blocking modal (`0113`) already
exist and already force a reload when the build changes. The tab-crash reconnection flow (`0076`) must stay
separate (the prose says so). Deploys now happen in weekend slots (owner ruling 2026-09-29).

**To discuss:**
1. Is it still worth doing? Deploys are weekly, in low-traffic weekend slots. How many players are actually
   mid-match during a deploy? (Can be measured before deciding.)
2. After a restart today, does the existing stale-build modal (`0113`) already cover part of Part B once the
   server is back? What exactly does a player see today, step by step?
3. Part B only, or A + B? The prose says B alone fixes the freeze and needs no deploy-process change.
4. How does the client tell "the whole server is down" (this flow) from "I lost my own connection" (the
   reconnection flow, `0076`)? The prose gives a heuristic — is it good enough?
5. Deployment risk was the reason it was deferred in Sprint 3. Is that still true?
6. Private lobbies and matches in progress are lost on a restart either way — is a message enough, or does the
   owner want anything more?

---

### Item B — 5c. Mobile Warning Screen

**In plain words.** A one-time screen for phone players on load: *"best on desktop, mobile is limited"*, with a
"Continue anyway" button. Shown once (saved in the browser). Aim: honest expectations, and better ranking signals
on Yandex if players who would bounce anyway leave before a match.

**Full prose:** [Appendix B](#appendix-b--5c-mobile-warning-screen-verbatim) below (verbatim — the brief file
`s3-5c-task-mobile-warning.md` is **lost**). Sources:
[`done/plan-sprint-3.md`](../../../sprints/done/plan-sprint-3.md) § *5c. Mobile Warning Screen*, and
[`plan-sprint-6.md`](../../../sprints/done/plan-sprint-6.md) § *Task 0c — Mobile Warning Screen*.

**Known dependencies / related work.** Uses the existing `Device:mobile` detection (Task 2f). Mobile quick wins
(`0085`) shipped; deep mobile rendering (`0031`) is parked.

**To discuss:**
1. ⚠️ **Conflict to settle first:** the proposed text says *"Geoconflict is best on desktop"*. `0311`
   (done, Sprint 6) removed the game name from player-facing texts. The wording must change — owner approves the
   ru/en text.
2. Is it still wanted? What is the mobile share of players today (the `Device:*` analytics can answer)?
3. Would it be simpler to change the platform settings in the Yandex console instead of showing a screen? What do
   Yandex rules say about a screen like this?
4. The prose names three analytics events (`Mobile:WarningShown`, `Mobile:WarningContinued`,
   `Mobile:WarningSuppressed`). What does "suppressed" mean exactly? Keep all three?
5. Keep the optional "Open on desktop" prompt, or drop it?
6. Experiments: the Sprint 3 header says "Excluded", the plan-index row says "All users" — confirm no A/B test.

---

### Item C — Historical Multiplayer Maps (free, 1–2 maps)

**In plain words.** Add 1–2 history-themed maps (WW2 Europe, Eastern Front, Russia are the most requested) to
the normal free multiplayer rotation. It tests whether players want historical content before anyone builds paid
map packs.

**Full prose:** [Appendix C](#appendix-c--historical-multiplayer-maps-verbatim) below (verbatim). Source:
[`plan-sprint-6.md`](../../../sprints/done/plan-sprint-6.md) § *Task 1 — Historical Multiplayer Maps (Free)*, plus
§ *Player Demand Signal* and § *Notes*.

**Known dependencies / related work.** The demand tracker
[`0027`](../0027-new-maps-community-demand/brief.md) (on Sprint 7). The compact-map shore defect
[`0026`](../0026-fix-compact-map-shore-generation/brief.md) (Backlog; the map generator). Maps are made with the
Go tool in `map-generator/` (`npm run gen-maps`). **Paid map packs (`0343`, item A) are meant to ship after this
one** — a cross-board ordering.

**To discuss:**
1. Which 1–2 maps? Who makes them — this is content work (map design), not just code; what is the time cost?
2. ⚠️ Yandex content rules: Yandex bans real-country flags/names (why flags are non-country only). Does a
   "WW2" or "Russia" map theme, or its map name, run into the same rules? Check before any map work.
3. Balance: how will "fair for any player count" be tested before shipping?
4. What counts as success (the "validates interest" goal)? Which numbers, over what window, decide whether paid
   packs go ahead?
5. Should `0027` (the demand tracker) sit on the same board as this item?

## Verification steps

1. Every item A–C has **one recorded outcome** (File / Park / Drop) in this folder's `worklog.md`, dated, with the
   owner's words where the owner ruled.
2. Every "To discuss" question is either **answered** (owner, dated) or **explicitly carried** into a follow-up
   brief — none silently dropped.
3. Every "File" outcome has its follow-up brief(s) filed with `/fkit-task-brief`, each with canonical
   `**Depends on:**` / `**Blocks:**` lines, and their IDs listed in the worklog.
4. Every "Park" outcome states what would bring it back.
5. The appendices are still present and every source link resolves (nothing lost).
6. Closed only with `/fkit-task-done` by the producer after 1–5.

## Notes

- **Depends on:** nothing (it is a discussion). Individual items have their own prerequisites — see each item.
- **Blocks:** nothing directly. ⚠️ Cross-board ordering: `0343` item A (paid map packs) is meant to ship **after**
  item C here (free historical maps).
- **Related:** [`0343`](../0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) (the Sprint 8 twin —
  and, since owner ruling C, home of leaderboard rewards, coin economy and clans),
  [`0027`](../0027-new-maps-community-demand/brief.md), [`0026`](../0026-fix-compact-map-shore-generation/brief.md).
- **Why one brief and not three:** by owner ruling (exactly two briefs). Each item is expected to split into its own
  briefs if and when it is filed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendices — the source prose, copied verbatim 2026-09-29

> Copied so nothing is lost. **Text is verbatim; only heading levels were changed** (to `####`) so they do not
> collide with this brief's own sections. Relative links inside the copies were written for their original files
> and may not resolve from here — use the source links above. The sources themselves were not changed, except
> for dated pointer notes.

### Appendix A — 5b. Server Restart UX (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-3.md` § 5b, then `ai-agents/sprints/plan-sprint-6.md` § Task 0b*

#### 5b. Server Restart UX — Notification & Auto-Refresh
**Effort:** 2–3 days
**Experiments:** ❌ Excluded — infrastructure and UX fix, applies to all players.
**Status:** ➡️ Moved to Sprint 6 — game fully functional without it; deployment risk outweighs current benefit given reduced release cadence strategy

Currently when the production server is restarted for updates, connected clients drop silently. The game freezes with no message and no recovery path. Players see a frozen screen until they manually refresh — if they realize they need to at all. This happens on every deployment.

**Part A — Pre-restart notification:** before deploying, an admin endpoint triggers a server broadcast warning all connected clients: "Server update in approximately 2 minutes — the game will reload automatically when ready." Clients display this as a non-dismissible banner. After the warning period, the server shuts down. V1 can be triggered manually as part of the deployment process; automation into the pipeline is a nice-to-have.

**Part B — Auto-refresh on recovery (higher priority):** when the client detects a lost connection, it enters a silent polling loop — checking a lightweight server health endpoint every 5–10 seconds — and displays "Server update in progress, you'll be back shortly." When the server responds, the client reloads automatically. No time limit on polling.

**Important:** this polling flow is separate from the Task 2 reconnection flow. Task 2 handles individual player disconnects with a 1-minute match-rejoin window. This flow handles server-wide restarts with no time limit and no match state restoration — just wait and reload. The heuristic for distinguishing them: if the server is unreachable entirely, use the restart polling flow.

Part B can ship independently of Part A and should be prioritized first — it resolves the silent freeze with no deployment process changes required.


#### Task 0b — Server Restart UX

Moved from Sprint 3. Blocking modal with auto-reload when server recovers (Part B) and pre-restart broadcast notification (Part A). Deferred because the game functions correctly without it, deployment risk is non-trivial, and the weekly release cadence (deployed during low-traffic weekend hours) already minimises player impact.

See: task section 5b in [`done/plan-sprint-3.md`](done/plan-sprint-3.md) — the standalone brief file `s3-5b-task-server-restart-ux.md` is lost (dangling since the FKIT migration)


### Appendix B — 5c. Mobile Warning Screen (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-3.md` § 5c, then `ai-agents/sprints/plan-sprint-6.md` § Task 0c*

#### 5c. Mobile Warning Screen
**Effort:** half a day
**Experiments:** ❌ Excluded — applies to all mobile players.
**Status:** ➡️ Moved to Sprint 6 — not a priority at current stage

A simple, honest screen shown to mobile players before they enter the game. The game was designed for desktop and the current mobile experience is limited — players discovering this mid-match is worse than being told upfront.

**What it does:**
- Detected via the existing `Device:mobile` detection logic from Task 2f — no new detection needed
- Shows a non-blocking informational screen on game load for mobile players: "Geoconflict is best on desktop. Mobile support is limited — some UI elements may be hard to use on small screens."
- Include a "Continue anyway" button that dismisses the screen and proceeds normally
- Optionally include a "Open on desktop" prompt pointing players toward desktop
- The screen should not show again for returning mobile players who have already seen it (store a flag in localStorage)

**Why this matters:** if mobile players who would have had a bad experience self-select out after seeing the warning, apparent mobile retention improves — Yandex's algorithm sees fewer single-session mobile users, which improves the game's ranking signals. It also sets honest expectations for players who do continue.

**Analytics:** fire a new event `Mobile:WarningShown` when the screen appears, and `Mobile:WarningSuppressed` vs `Mobile:WarningContinued` based on what the player does. This tells you how many mobile players are choosing to continue despite the warning — useful for deciding if and when to invest in mobile properly.


#### Task 0c — Mobile Warning Screen

Moved from Sprint 3. A simple non-blocking screen shown to mobile players on game load informing them that Geoconflict is optimised for desktop. Includes a "Continue anyway" button. Shown once per player (localStorage flag). Not a priority at current DAU levels but worth shipping when content work begins to set honest expectations for mobile players discovering the game through new map content.

See: task section 5c in [`done/plan-sprint-3.md`](done/plan-sprint-3.md) — the standalone brief file `s3-5c-task-mobile-warning.md` is lost (dangling since the FKIT migration)


### Appendix C — Historical Multiplayer Maps (verbatim)

*Source: `ai-agents/sprints/plan-sprint-6.md` § Player Demand Signal, § Task 1, § Notes*

#### Player Demand Signal

Multiple unprompted feedback messages requesting specific maps (Russia, WW2). High-intent signal — players are asking for content they would actively seek out, not casually suggesting improvements.


#### Task 1 — Historical Multiplayer Maps (Free)

**Ships before paid campaign packs.**

Add 1–2 historically themed maps to the existing multiplayer rotation. These are free for all players.

**Purpose:**
- Validates player interest in historical content before investing in paid packs
- Generates word-of-mouth from players who requested these maps
- No monetization risk — pure content addition

**Balance constraint:** campaign maps are often designed with asymmetric starting positions, fixed faction sizes, or scripted timing assumptions that do not translate to free multiplayer. Map selection must be deliberate — only maps that work with standard multiplayer rules (equal starting conditions, any player count) qualify. Do not automatically port campaign maps to multiplayer.

**Selection criteria for a map to qualify as a multiplayer map:**
- Symmetric or fair starting positions for all players
- No scripted events or fixed faction requirements
- Works correctly across the full range of player counts the lobby supports
- Balance tested in multiplayer before shipping

**Likely candidates:** WW2 Europe theatre, Eastern Front — broad geographic maps where territory capture mechanics feel natural. Russia map also frequently requested.


#### Notes

- Brief writing deferred until Sprint 5 is underway — too early to scope in detail now
  - 📌 **2026-09-26 — owner ruling: write them AFTER THE LAUNCH** (*"After the launch (Recommended)"*), not
    merely once Sprint 5 has started. See the 2026-09-26 follow-up addendum under the status table.
- Map creation is a content production task, not just engineering — timeline will depend on map design effort, not just code
- The "1–2 free maps per pack" split should be decided before any paid pack ships — sets player expectations early
- ~~Sprint 5 cosmetics store UI may be reusable for the map pack store~~ — **corrected 2026-08-09: there is no cosmetics store.** Whatever purchase UI ships with Tasks 9/9a (flags, territory patterns) is the reusable surface; flag it to the coder when Sprint 6 briefs are written
