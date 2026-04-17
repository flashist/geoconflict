# Geoconflict — Sprint 6 — More Content

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 6 Goal

Expand game content with historical and thematic maps. Convert engaged free-tier players into paid users through map packs. Build on the payment infrastructure established in Sprint 4.

**Dependencies:** Sprint 4 (payment infrastructure, citizenship) and Sprint 5 (cosmetics store) must ship first. Paid map packs require the Yandex catalog and purchase flow to be in place.

---

## Sprint 6 Status

| Status | Task | Brief |
|---|---|---|
| ⬜ Backlog | 5b. Server Restart UX | `s3-5b-task-server-restart-ux.md` |
| ⬜ Backlog | 5c. Mobile Warning Screen | `s3-5c-task-mobile-warning.md` |
| ⬜ Backlog | Historical Multiplayer Maps (free, 1–2 maps) | TBD |
| ⬜ Backlog | Paid Campaign Map Packs | TBD |

---

## Player Demand Signal

Multiple unprompted feedback messages requesting specific maps (Russia, WW2). High-intent signal — players are asking for content they would actively seek out, not casually suggesting improvements.

---

## Task 0b — Server Restart UX

Moved from Sprint 3. Blocking modal with auto-reload when server recovers (Part B) and pre-restart broadcast notification (Part A). Deferred because the game functions correctly without it, deployment risk is non-trivial, and the weekly release cadence (deployed during low-traffic weekend hours) already minimises player impact.

See full brief: `s3-5b-task-server-restart-ux.md`

---

## Task 0c — Mobile Warning Screen

Moved from Sprint 3. A simple non-blocking screen shown to mobile players on game load informing them that Geoconflict is optimised for desktop. Includes a "Continue anyway" button. Shown once per player (localStorage flag). Not a priority at current DAU levels but worth shipping when content work begins to set honest expectations for mobile players discovering the game through new map content.

See full brief: `s3-5c-task-mobile-warning.md`

---

## Task 1 — Historical Multiplayer Maps (Free)

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

---

## Task 2 — Paid Campaign Map Packs

**Ships after Task 1 and after Sprint 4/5 payment infrastructure is live.**

Thematic map packs available for purchase. Initial pack: WW2 (most requested). Each pack includes multiple maps with historical context.

**Pricing model:**
- 1–2 maps from each pack available free (same model as citizenship earned path — give players a taste)
- Full pack purchase unlocks remaining maps
- Price TBD — likely 149–199 rubles per pack (consistent with cosmetics pricing from Sprint 4)
- Purchasing any map pack automatically grants citizenship (consistent with "any purchase = citizenship" rule)

**Citizenship integration:** paid citizens could receive one free map pack as a perk — adds tangible content value to citizenship beyond cosmetics. Worth deciding in Sprint 4 whether to promise this before Sprint 6 ships.

**Campaign vs multiplayer distinction:** campaign maps in paid packs can have asymmetric starts, scripted elements, and historical accuracy that would break multiplayer balance. These are singleplayer/co-op experiences, not additions to the multiplayer rotation. Task 1 (multiplayer maps) and Task 2 (campaign packs) are separate products.

---

## Notes

- Brief writing deferred until Sprint 5 is underway — too early to scope in detail now
- Map creation is a content production task, not just engineering — timeline will depend on map design effort, not just code
- The "1–2 free maps per pack" split should be decided before any paid pack ships — sets player expectations early
- Sprint 5 cosmetics store UI may be reusable for the map pack store — worth flagging to the technical specialist when Sprint 6 briefs are written
