# Re-enable territory patterns as a paid cosmetic (Task 9a)

## ID
0011

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

The sibling of `0010`, and the second root of the cosmetics monetization chain. `plan-index.md:88`
assigns Task 9a to Sprint 4 and describes it as a *"high-visibility cosmetic; upsell surface"*, but
like flags it appears in **no** sprint plan document and had **no brief** — it sat on
`sprint-backlog.md` as unsprinted work. **Sprint 5 Task 15** (custom uploaded patterns) depends on it
(`sprint-backlog.md:91`).

**Patterns are the highest-visibility cosmetic in the game.** A flag is a small badge; a territory
pattern colours the player's entire claimed area, so every opponent sees it for the whole match.
That makes it the strongest upsell surface — and also the one where a rendering regression is most
visible.

**The plumbing already exists.** `CosmeticsSchema` (`src/core/CosmeticSchemas.ts:67`) models
`patterns` and `colorPalettes`; `PrivilegeChecker.isPatternAllowed()` (`src/server/Privilege.ts:60`)
and `isColorAllowed()` (`:101`) already gate them; `PatternDecoder` handles rendering. This is a
re-enable and a content decision, not a build from scratch.

⚠️ **Patterns already control ad revenue.** `src/client/GutterAds.ts:35` suppresses ads for any
player whose flares include a `pattern:` entry. So **granting a pattern removes that player's gutter
ads today** — before any deliberate decision was made linking the two. Whoever scopes this must
decide whether that coupling is intended. Ad suppression is currently the project's primary revenue
source, so accidentally handing it out with a cosmetic is a real revenue question, not a detail.
**Raise it with the owner; do not resolve it in code.**

## ⚠️ Same two blockers as `0010`

1. **Entitlements come from the upstream OpenFront API**, not Geoconflict — `Worker.ts:377`,
   `ApiSchemas.ts:53`. Task **`0009`** determines what moving that costs. Selling a pattern via
   Yandex IAP requires the entitlement to originate here.
2. **Payment infrastructure must be live** (Sprint 4 Yandex payments + catalog approval, externally
   blocked).

## What to build

1. **Decide the initial pattern set** — how many, which designs, free vs paid split. **Owner's call**;
   surface it, do not invent it.
2. **Re-enable the pattern selection path** through the existing `PatternDecoder` pipeline and the
   `PlayerPattern` model. `DefaultPattern` (`CosmeticSchemas.ts:92`) is the existing no-pattern
   fallback — preserve it for players with no entitlement.
3. **Resolve the ad-suppression coupling** per the owner's answer above, before shipping. If the
   coupling is unintended, changing it is in scope here; if intended, record it as an ADR so nobody
   later "fixes" it.
4. **Wire the picker UI into both HTML templates** — `src/client/index.html` **and**
   `src/client/yandex-games_iframe.html`. The Yandex one is what production serves.
5. **All user-visible strings via `translateText()`**, keys in **both** `en.json` and `ru.json`.
6. **Do not build the purchase flow here** — ship behind whatever entitlement mechanism `0009`
   establishes.

## Verification steps

1. An entitled player can select a pattern; it renders across their **whole territory** and is
   visible to other players in the same match.
2. An unentitled player cannot select a gated pattern — enforced server-side via
   `PrivilegeChecker.isPatternAllowed()`, not merely hidden in the UI.
3. A player with no pattern renders `DefaultPattern` correctly — no visual regression for the
   majority of players who own nothing.
4. **Ad-suppression behaviour matches the owner's decision**, asserted by a test either way: granting
   a pattern either does or does not suppress gutter ads, and the test pins which.
5. Pattern rendering is correct at territory edges and after territory changes hands mid-match —
   the visually risky cases.
6. Picker present in **both** rendered templates (grep `static/`, not just the source).
7. Every new string resolves in `en` and `ru`; no hardcoded literals in the diff.
8. Renders correctly at the **360×430** minimum Yandex viewport.
9. Performance: no measurable frame-rate regression on a low-end device with many patterned
   territories on screen. ⚠️ Patterns are full-territory fills, so this is the one cosmetic with a
   plausible rendering-cost impact — and mobile WebGL/memory failures are already a known live issue.
10. `npm test` green; `npm run lint` clean.

## Notes

- **Depends on:** 0009 (entitlement origin), Sprint 4 payment infrastructure, an owner decision on
  the pattern set, and an owner ruling on the ad-suppression coupling
- **Blocks:** Sprint 5 Task 15 (custom uploaded patterns)

- Sibling of `0010` (flags). They share the entitlement plumbing and the purchase surface — **scope
  them together even if they ship separately**, or the second one will re-solve the first one's
  problems.
- **Consider a free-first split**, as with `0010`: shipping a free pattern set validates rendering and
  the picker before money is involved. Recommend it to the owner rather than assuming it.
- Effort from `plan-index`: ~1 week. Predates the `0009` and ad-coupling discoveries; treat as a floor.
- Related: `adr-102` (the entitlement checker and its fail-open behaviour), `0009`, `0010`.
