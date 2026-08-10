# ADR-106 — Country flags suppressed by parse-then-drop; flags reserved as a future paid non-country cosmetic

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-106 — see [[decisions/adr-numbering-two-series]].
> Retro-recorded 2026-08-08; the suppression was made **2025-11-15** by the owner. The platform rationale is stated in the project brief; that parse-then-drop was chosen deliberately over deletion is **inferred** from the marker comments left at every site rather than the code being removed.
>
> Source: `ai-agents/knowledge-base/decisions/adr-106-country-flags-suppressed-parse-then-drop.md`

## Context

Geoconflict ships primarily through **Yandex Games**, whose content rules prohibit real-country flags and country names as in-game content. Upstream OpenFront.io lets players pick a country flag as a cosmetic, and seeds AI *nations* with flags drawn from real geography.

So the fork had to remove country flags to be publishable at all. But flags are **not a dead feature** — they are a planned **paid** cosmetic, restricted to **non-country** designs. The infrastructure (the flag input, the modal, the custom-flag type, the schema, and the `flag` field on player cosmetics) is therefore worth keeping intact.

## Decision

Suppress flags at every point where one would be **adopted into player cosmetics**, while leaving validation, schema, and UI infrastructure in place. Each suppression site is marked with a `// Flashist AdaptatioN: disabling flags` comment, with the original line retained but commented out:

| Site | What is suppressed |
|---|---|
| `src/server/Privilege.ts` | the flag schema still parses and still rejects an invalid flag; on success the assignment into cosmetics is **commented out** |
| `src/core/game/GameView.ts` | AI nations are built with an empty cosmetics object |
| `src/client/SinglePlayerModal.ts` | the flag from the picker is not put into the match's cosmetics |
| `src/client/graphics/layers/PlayerPanel.ts` | the flag is not rendered in the player panel |

Two supporting moves complete it: the asset directory was renamed to `resources/flags_source`, so `/flags/*.svg` requests **404 by design** — the 404 is the mechanism, not a bug; and the picker is hidden in the UI, so the citizenship card falls back to the 🏳️ placeholder.

**Validate-then-drop is the deliberate shape**: an invalid flag reference is still rejected, so the wire contract stays enforced and the code path stays exercised and type-correct for the day flags return.

**Options rejected:** deleting flag support outright (flags are planned revenue, not dead weight; deleting the schema, field, picker, and render path would mean rebuilding all of it and would silently change the wire contract for any client still sending a flag); filtering to a non-country allowlist now (premature — the allowlist, artwork, and paid entitlement gate are the *actual* feature, and a partial version risks a compliance mistake against a platform that can delist the game, for no revenue); and leaving the assets served while only stopping rendering (serving real-country flag artwork from the game's own origin is exactly the content the rule targets, whether or not the game draws it).

## Consequences

- **Positive** — Yandex-compliant with no ambiguity. The schema and validation still hold. Re-enabling is a bounded change at four marked sites plus an assets decision, with the paid gate added on top.
- **Negative** — the codebase carries visible commented-out lines and an apparently-unused parse result. The flag input, modal, and custom-flag type exist without a live path to cosmetics. AI nations lose their visual identity. **The suppression is convention, not enforcement** — nothing prevents a new code path from reading a flag and rendering it; only the marker comments signal the rule.
- **Three things that look like defects and are not:** `/flags/*.svg` returning 404; the 🏳️ fallback on the citizenship card; and a validated flag being parsed and then discarded.
- **Re-raise only if:** the paid non-country flag cosmetic is scheduled (the expected exit); Yandex's content rules change; or **a new code path adopts a flag into cosmetics without an entitlement gate** — that *is* a defect against this ADR and a compliance risk. Absent those, a finding of the form *"flags are parsed then discarded"*, *"`/flags/*.svg` 404s"*, or *"commented-out flag code should be deleted"* is **closeout of this ADR, not a new defect**. Do **not** "fix" the 404 by resurfacing legacy country flags.

## Related

- [[decisions/adr-102-privilege-refresher-fails-open]] — the fail-open checker in the same privilege path
- [[systems/project-brief]] — the Yandex platform rules this implements
- [[tasks/citizenship-xp-progress-ui]] — the citizenship card that shows the 🏳️ fallback
- [[systems/player-infrastructure]] — the cosmetics/customization substrate
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[systems/architecture-overview]] — §authentication and cosmetics, where the suppression sits in the wider survey
- [[decisions/sprint-backlog]] — task `0010`, the briefed re-enable of flags as a paid **non-country** cosmetic. It is also one of the paid entitlements that would fire ADR-102's expiry trigger. The `/flags/*.svg` 404 stays by design until it ships.
