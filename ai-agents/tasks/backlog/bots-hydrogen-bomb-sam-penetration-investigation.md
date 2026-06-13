# Task — Bots/Nations: Effective Hydrogen-Bomb Use Against SAM Defenses (Investigation)

## Sprint
Sprint backlog — no sprint home yet. Bot-behaviour quality improvement; needs a sprint home before implementation.

## Type
**Investigation-first.** The targeting change is spatial AI with real unknowns (exact interception condition, the offset algorithm, difficulty/economy implications). Produce findings + a recommended implementation approach, review with Mark, then scope the implementation brief. Do **not** implement off this document.

## Priority
Medium — gameplay-quality improvement for nations and AI Players. No dependency on the citizenship/payments track; pick up alongside any deploy.

## Experiments
❌ Excluded — bot-behaviour quality change, ships to all players. No A/B.

---

## Goal

Make nations and AI Players use **hydrogen bombs** effectively — specifically, to **penetrate SAM-defended targets** that simple atom bombs cannot reach. Today bots barely exploit the H-bomb's large blast, and when a target is ringed with SAM launchers they **avoid it entirely** instead of using the offset tactic Mark described:

> A SAM launcher intercepts incoming nukes within its range. An atom bomb's blast is small, so a SAM cluster shields its buildings from atom bombs. A hydrogen bomb's destruction radius is **larger than the SAM's interception range**, so you can detonate it **far enough from the SAM that it isn't intercepted, but close enough that the blast still destroys the defensive buildings.**

## The mechanic — confirmed numbers (starting point, verify in the investigation)

| Quantity | Value | Source |
|---|---|---|
| SAM interception range | **70** | `DefaultConfig.defaultSamRange()` |
| SAM detection range (pre-shoot) | 140 (= 70×2) | `SAMLauncherExecution.ts:85` |
| Atom Bomb blast | inner **12** / outer **30** | `DefaultConfig.nukeMagnitudes()` |
| **Hydrogen Bomb blast** | inner **80** / outer **100** | `DefaultConfig.nukeMagnitudes()` |
| Hydrogen Bomb cost | 5,000,000 | `DefaultConfig` unit cost |

**The "sweet spot":** detonating an H-bomb at distance **~71–80** from a SAM is **outside** interception range (>70) but **inside** the H-bomb's total-destruction radius (≤80). That annulus is where the offset tactic lives. Atom bombs (inner 12) can never reach a SAM-shielded building, which is exactly the player-felt problem.

## Current behaviour — two concrete defects (in `FakeHumanExecution`)

Both nations (`FakeHuman`) and AI Players (`AiPlayer`) run `FakeHumanExecution`, so one fix covers both.

`maybeSendNuke()` (`src/core/execution/FakeHumanExecution.ts:285`) already picks `HydrogenBomb` when gold > 5M, gathers enemy structures (incl. `SAMLauncher`), and scores candidate tiles via `nukeTileScore()` (line 361). The defects are in the scoring and the search:

1. **Radius-blind scoring.** `nukeTileScore` sums target value only within a **hardcoded 25-tile radius** (`euclDistFN(tile, 25)`), regardless of nuke type. An H-bomb destroys out to **80**, so the score massively under-credits H-bomb damage and never selects tiles that exploit the large radius.
2. **Blanket SAM avoidance.** `nukeTileScore` **subtracts 50,000** for each SAM within **50 tiles** of the candidate tile (`dist50`). So bots actively **steer away** from SAM-defended areas rather than attempting the offset — the direct cause of "can't penetrate."
3. **Search/ownership constraints to reconcile.** `maybeSendNuke` uses `range = 60` for H-bombs as both the candidate-search radius and a "nuke away from the border" bounding-box check that requires the **entire** box to be owned by the target (lines 317–327). Both the 60 search range and the all-owned check conflict with the real 80–100 blast and with offset tiles near a defended border. The investigation must reconcile `range` (60), scoring radius (25), and actual blast (80/100).

## What the investigation must produce

1. **Confirm the interception condition.** Verify from `SAMLauncherExecution.ts` (`isReachable`, `updateUnreachableNukes`, `detectionRange`) whether interception keys off the nuke's **detonation/target tile** being within range 70 (which makes offset targeting work as theorized) or off trajectory/proximity. If trajectory matters, redesign accordingly.
2. **Confirm the destruction model.** Verify that structures within the H-bomb **inner** radius (80) are reliably destroyed (inner = full destruction, outer = falloff?) so the 71–80 annulus genuinely kills SAMs/defensive buildings. Confirm SAMs do not intercept other SAMs' coverage in a way that changes the math.
3. **Design radius-aware scoring.** Replace the hardcoded 25-tile damage radius with the nuke's actual `nukeMagnitudes(nukeType).inner` (and consider outer falloff). This alone makes H-bomb tile selection meaningful.
4. **Design the offset-targeting algorithm.** When a high-value target (enemy silo/city cluster) is SAM-defended, instead of avoiding it, search for a detonation tile in the set `{ dist > samRange from every covering SAM } ∩ { dist ≤ hbombInner from the target building(s) }`. Handle multiple overlapping SAMs and the "away from border" ownership constraint. Output a concrete algorithm + complexity (this runs every bot tick, on real maps).
5. **Economy (scope question).** Bots only fire H-bombs when gold > 5M. Should a bot facing SAM defenses **prioritize saving** for an H-bomb? Recommend in-scope vs. defer.

## Open decisions for Mark (resolve on findings review)

- **Difficulty gating.** *Recommendation:* apply smarter H-bomb/offset targeting to **AI Players + nations on Hard/Impossible**, leaving Easy/Medium bots simple so new players aren't overwhelmed by SAM-cracking AI. Confirm.
- **Scope breadth.** *Recommendation:* v1 = **offset SAM-penetration targeting + radius-aware scoring** (the minimum to make H-bombs effective vs SAM defenses); **defer** the economic "save up for an H-bomb" behaviour to a follow-up. Confirm.

## Deferred — implementation (scope from findings, after Mark's review)
- The scoring + offset-targeting changes in `FakeHumanExecution`.
- Reconciling `range` / scoring radius / blast radius.
- Difficulty gating per the decision above.

## Verification (for the eventual implementation)

1. **`src/core/` unit tests (mandatory — core change):** given a SAM-defended structure cluster, the bot selects an offset detonation tile **outside every covering SAM's range** but **within the H-bomb inner radius** of the target buildings; simulate and confirm the H-bomb is **not intercepted** and the SAM/defensive buildings are destroyed. Regression: targeting on undefended targets is unchanged; atom-bomb behaviour unchanged.
2. **Live real-map validation (required — per the project rule that synthetic-map tests can pass while a spatial-targeting change is wrong on real maps):** in a real match, build a SAM-ringed base and observe a nation/AI-player land an H-bomb that destroys the SAMs without interception. Validate at the difficulties chosen above.
3. No new analytics event — bot-internal behaviour with no player-facing funnel.

## Notes
- One change covers nations and AI Players (both run `FakeHumanExecution`).
- Adjacent backlog task: `bots-skip-sam-when-nukes-disabled.md` (also `FakeHumanExecution` bot SAM behaviour) — consider sequencing/implementing in the same pass.
- Spatial AI runs every bot tick on real maps; weigh algorithm cost in the design.
- Effort (rough, pending findings): investigation ~1 day; implementation ~2–3 days incl. core tests and live validation.
