# Task — Bots/Nations: Saturate SAM Defenses with Multi-Nuke Salvos (Investigation + Implementation)

## Sprint
Sprint backlog — no sprint home yet. Bot-behaviour quality improvement.

## Type
**Investigation-first, then implementation** (one task, two phases). The saturation-specific timing/capacity questions are resolved in Phase 1; Phase 2 implements off those findings.

## Priority
Medium — gameplay-quality improvement for nations and AI Players. No dependency on the citizenship/payments track.

## Experiments
❌ Excluded — bot-behaviour quality change, ships to all players. No A/B.

## Depends on
**`bots-hydrogen-bomb-sam-penetration-investigation.md` (the offset-H-bomb anti-SAM task).** Locked with Mark 2026-06-13: these two anti-SAM tactics are kept **separate**, and this one **builds on** the offset task. Reuse — do not re-derive — its shared outputs:
1. The **SAM-mechanics findings** (interception condition, cooldown, level→capacity).
2. The **`FakeHumanExecution` nuke-targeting refactor**: radius-aware scoring and removal of the blanket SAM-avoidance penalty. This saturation logic plugs into that refactored decision point instead of fighting the old "avoid every SAM" behaviour.

Sequence this **after** the offset task's investigation + `FakeHumanExecution` refactor have landed.

---

## Goal

Make nations and AI Players use the **saturation** tactic that human players rely on: send **multiple nukes one-by-one at a single SAM-defended target** to overwhelm the launcher's interception capacity, so a nuke gets through and destroys the defensive building. This is distinct from the offset tactic (which exploits blast-vs-range geometry); saturation exploits **interception capacity + reload time**, and is often **cheaper** (a salvo of atom bombs vs. one hydrogen bomb).

## The mechanic — confirmed (starting point; Phase 1 verifies the timing)

A SAM launcher's interception capacity equals its **level**:

| Fact | Detail | Source |
|---|---|---|
| Missile-queue capacity = level | `isInCooldown()` is true when `missileTimerQueue.length === level` — a level-N SAM can fire **N** interceptors before it's fully on cooldown | `UnitImpl.ts:337` |
| Reload per missile | after `SAMCooldown()` ticks a missile reloads (`reloadMissile()` shifts the queue) | `UnitImpl.ts:345`, `SAMLauncherExecution.ts:219`, `DefaultConfig.SAMCooldown()` |
| Level can grow | SAMs are upgradeable (`increaseLevel()`), raising capacity | `UnitImpl.ts:419` |
| **Atom bombs always intercepted** | `isHit` returns `true` for AtomBomb (deterministic); HydrogenBomb is probabilistic (`samHittingChance`) | `SAMLauncherExecution.ts:189` |

**So:** a level-N SAM intercepts N nukes; the **(N+1)th** that arrives while all N missiles are still reloading **penetrates**. Level 1 → 2 nukes, level 2 → 3 nukes — exactly as observed. With **atom bombs** the math is deterministic (each ready missile WILL intercept one), so a clean salvo is **(level + 1) atom bombs** (750k each → e.g. 1.5M for a level-1 SAM, vs 5M for one H-bomb). **Timing matters:** the salvo must arrive within the cooldown window, or the SAM reloads and picks them off one at a time.

## Why bots don't do this today

In `FakeHumanExecution.maybeSendNuke()` (`src/core/execution/FakeHumanExecution.ts:285`) the bot fires **at most one nuke per decision** and `nukeTileScore` **avoids** SAM-defended areas (−50k within 50 tiles). So bots never (a) keep targeting a defended objective, nor (b) fire the *coordinated multi-nuke sequence* saturation requires. The offset task removes the blanket avoidance and makes scoring radius-aware; this task adds the **salvo** behaviour on top.

---

## Phase 1 — Investigation (saturation-specific)

Building on the offset task's SAM-mechanics findings, determine:

1. **Salvo timing.** Given `SAMCooldown()`, nuke travel time (`defaultNukeSpeed`, trajectory), and silo launch cadence, how must the (level+1) nukes be **spaced** so the SAM cannot reload between intercepts? Produce a concrete inter-nuke spacing / launch schedule.
2. **Launch capacity.** How many nukes can a bot fire inside that window with K silos (silo build/launch cooldown)? → minimum silos/gold to saturate a level-N SAM. (This is the basis for the optional "build silos to enable a salvo" behaviour — see Open decisions.)
3. **Overlapping SAMs.** Compute the total interception capacity covering a target (sum of covering SAM levels, accounting for timing) → the required salvo size when more than one SAM defends it.
4. **Penetrator targeting.** The exhaust shots only need to be *intercepted* (aim so each SAM commits a missile); the final penetrator must be aimed to actually **destroy** the SAM/defensive building (within its blast radius). Define both.
5. **Tactic selection (coordinates with the offset task).** When is saturation (level+1 atom bombs) cheaper/more reliable than the offset H-bomb? The unified bot decision should pick the cheaper viable tactic per situation — specify the selection rule so the two implementations compose rather than conflict.

## Phase 2 — Implementation (scope from Phase 1, after Mark's review)

In `FakeHumanExecution`, when a high-value target is SAM-defended and the bot has the gold + launch capacity, fire a **coordinated salvo** — (covering-capacity + 1) nukes spaced within the cooldown window — instead of avoiding or single-shooting. Use **atom bombs** for the deterministic exhaust shots; the penetrator can be atom or H-bomb. Track the in-flight salvo (extend the existing `lastNukeSent` bookkeeping) so the bot commits to finishing a started salvo rather than re-deciding each tick.

---

## Open decisions for Mark

- **Proactive silo build/level-up (Mark called this out explicitly).** Players sometimes *build extra silos or level up* specifically to enable a salvo. *Recommendation:* **defer** that proactive economy/build-order behaviour to a follow-up; v1 saturates only when the bot **already** has enough silos + gold. Confirm.
- **Difficulty gating.** *Recommendation:* keep consistent with the offset task — **AI Players + Hard/Impossible nations only**; Easy/Medium bots stay simple. Confirm.

---

## Verification

1. **`src/core/` unit tests (mandatory):** a SAM-defended target with a **level-N** SAM → the bot fires **N+1** nukes within the cooldown window; the SAM intercepts N (atom bombs deterministically) and the (N+1)th destroys the SAM. Cover the overlapping-SAM case and the level-up case (level-2 needs 3). Regression: undefended targets and single-nuke behaviour unchanged.
2. **Live real-map validation (required — synthetic-map tests can pass while spatial/timing targeting is wrong on real maps):** in a real match, build (and level up) a SAM, then observe a nation/AI-player overwhelm it with a one-by-one salvo. Validate at the chosen difficulties.
3. No new analytics event — bot-internal behaviour.

---

## Notes
- One change covers nations + AI Players (both run `FakeHumanExecution`).
- **Composition with the offset task is the main design risk:** both edit the same nuke-decision path. Phase 1 item 5 (tactic selection) must define how "offset" vs "saturate" vs "avoid" are chosen, so the two land as one coherent decision tree rather than competing branches.
- Adjacent: `bots-skip-sam-when-nukes-disabled.md` (also `FakeHumanExecution` SAM behaviour).
- Rough effort (pending Phase 1): ~1 day investigation, ~2–4 days implementation incl. core tests + live validation (salvo timing is fiddlier than single-shot).
