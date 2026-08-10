# Migrate `PrivilegeRefresher` to fail-closed — gated on the first paid cosmetic

## ID
0008

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

`PrivilegeRefresher` currently **fails open**: until a valid `cosmetics.json` loads, every worker
allows every cosmetic, and a load failure never discards a known-good checker. The behaviour is
inherited from upstream OpenFront.io — nobody on Geoconflict chose it, they inherited it.

The owner ruled on **2026-08-09** (recorded in `adr-102`): **accept fail-open while cosmetics are
free, and pre-commit to migrating to fail-closed at the first paid cosmetic.** This brief is that
pre-committed migration, written now so the decision does not quietly expire unnoticed.

**Why the trigger is the right gate, and why this task must not ship early.** While every cosmetic is
free, fail-open costs nothing — the worst case is that players see cosmetics they would have been
allowed anyway. Flipping to fail-closed *today* would mean a `cosmetics.json` load failure denies all
cosmetics to all players: a visible, self-inflicted degradation guarding against a risk that does not
yet exist. The moment any cosmetic is **purchasable**, the arithmetic inverts — fail-open becomes a
revenue leak that hands paid goods to non-payers, silently, with no alerting.

⚠️ **`adr-102` records a known accepted gap: there is no alerting for "we are currently serving
fail-open."** Nobody would find out from telemetry. That gap is part of why this migration is
pre-committed rather than left to be noticed later.

**🚧 This task is blocked by design.** It must not be picked up until the trigger fires.

**The trigger, precisely** (owner ruling 2026-08-09, second ruling of that day): **any paid
entitlement** — anything a player pays real money for that confers an entitlement, whether or not
the cosmetics checker is what gates it.

Fires on: **paid citizenship** (99₽), **Task 9** (re-enable flags — `adr-106`, planned paid
non-country cosmetic), **Task 9a** (territory patterns). Whichever ships first.

⚠️ **This wording replaced a narrower one earlier the same day, and the reason matters.** The first
attempt defined the trigger around what the cosmetics checker gates — "an IAP for a specific
cosmetic". Tracing the code showed `PrivilegeChecker.isAllowed()` (`src/server/Privilege.ts:16`) and
`CosmeticsSchema` (`src/core/CosmeticSchemas.ts:67`) gate **only patterns, colors, and flag
layers/colors**. Paid citizenship grants ad removal and the full emoji set — **neither goes through
this checker**. So the narrow trigger would not have fired at the launch of the first thing the
project sells, and this pre-commitment would have sat inert. **Do not re-narrow it to "cosmetics"
without re-checking that trace.**

**Roadmap correction:** there is no "Sprint 5 cosmetics store". `plan-index.md` assigns Tasks 9 and
9a to Sprint 4, but **neither appears in the Sprint 4 plan document** — both sit unsprinted on
`sprint-backlog.md`, blocked on payment infrastructure. `plan-sprint-5.md:150` records that Sprint 5's
cosmetics work depends on 9 and 9a shipping first.

## ⚠️ Dependency discovered 2026-08-09 — entitlements come from the upstream API

`Worker.ts:377` reads `flares = result.player.flares`. The entitlement list originates from the
**upstream OpenFront user API** (`ApiSchemas.ts:53`) — **not** from Geoconflict's profile server, and
not from Yandex.

- Selling a cosmetic through Yandex IAP requires the entitlement to originate from **Geoconflict's
  own** infrastructure. Making the checker fail closed while it is fed by a third-party identity
  service is a materially different and larger problem than "invert a boolean".
- `GutterAds.ts:35` already suppresses ads for any player whose flares contain a `pattern:` entry —
  so the project's primary revenue source is **already** gated on upstream-supplied data.
- **Not verified:** whether that upstream call is live in production. Task `0009` determines it.
  Do not assume either way.

**Consequence for this task:** do not start it before `0009`'s findings are in, even if the paid-
entitlement trigger has fired. Building fail-closed on top of an entitlement source that is about to
move would be work done twice.

## What to build

1. **Invert the failure policy** so that an absent or invalid `cosmetics.json` denies a cosmetic
   rather than granting it — for **paid** cosmetics. Free cosmetics should not be collateral damage
   of a load failure; establish whether the data model can distinguish them, and if it cannot, say so
   before building, because that changes the shape of the fix.

2. **Add a startup grace window** — the shape `adr-102` pre-committed to. Workers start before the
   first successful load; denying everything during normal startup would be a self-inflicted outage
   every deploy. Define the window, and define what happens when it expires with no valid load.
   **State both explicitly; do not leave the expiry behaviour implicit.**

3. **Keep the last known-good checker on a refresh failure.** A transient refresh error must not
   discard a checker that was working. The failure being closed applies to *never loaded*, not to
   *loaded once and refresh failed*.

4. **Add the missing alerting.** The state "this worker is serving without a valid cosmetics
   checker" must be visible in telemetry — a metric or log the monitoring lane can alert on. This is
   the gap `adr-102` recorded; closing it here is part of the migration, not optional polish.

5. **Update `adr-102`** to record that its pre-committed trigger fired and the migration shipped —
   route that through `fkit-architect`, do not hand-edit the ADR.

## Verification steps

1. Unit: with no `cosmetics.json` ever loaded and the grace window expired, a **paid** cosmetic is
   **denied**.
2. Unit: within the grace window, behaviour is the documented startup behaviour (state which, and
   test it) — a deploy does not deny cosmetics to live players.
3. Unit: a checker that loaded successfully and then hits a refresh failure **retains** the last
   known-good state — it does not fall back to denying.
4. Unit: free cosmetics behave per the decision in step 1, and there is a test asserting it either
   way so the choice is pinned.
5. Telemetry: a worker running without a valid checker emits the new signal; a worker with a valid
   checker does not. Verified by test, not by inspection.
6. Integration across workers: the policy is consistent on every worker, not just worker 0 — the
   architect's survey notes games are sharded by `simpleHash(gameID) % numWorkers`, so a per-worker
   inconsistency would present as a player-specific bug that is painful to reproduce.
7. Full suite green: `npm test`.
8. `adr-102` updated to reflect the shipped migration.

## Notes

- **Depends on:** 0009 (the entitlement source must be settled first), **and** the first paid
  entitlement going live — paid citizenship, Task 9 (flags), or Task 9a (patterns), whichever ships
  first. **Both conditions, not either.** Not startable before then.
- **Blocks:** nothing

- Authority: owner ruling 2026-08-09, recorded in `adr-102`. This brief exists so the pre-commitment
  is a scheduled task rather than a promise in a document.
- **When pulling this into a sprint, re-read `adr-102` first** — if the monetization shape changed in
  the meantime, the trigger condition may need restating before the work starts.
- Sequence *before* the first paid cosmetic is announced to players, not after. Shipping the leak and
  patching it later means paid goods were already given away.
