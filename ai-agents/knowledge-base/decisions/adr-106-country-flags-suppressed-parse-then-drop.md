# ADR-106: Real-country flags are suppressed by parse-then-drop; flags are reserved as a future paid non-country cosmetic

- **Status:** accepted
- **Date:** 2026-08-08 (retro-recorded; suppression made **2025-11-15**, commit `895368d` "YaGames
  (a weird commit with renaming of countries and removing flags…)")
- **Deciders:** Owner (Mark Dolbyrev) — the commit message notes the flag work specifically was done
  by the owner. *The platform rationale is stated in `../PROJECT.md`; that the parse-then-drop shape
  was chosen deliberately over deletion is **inferred** from the `// Flashist AdaptatioN: disabling
  flags` markers left at every site rather than the code being removed.*

## Context

Geoconflict ships primarily through **Yandex Games**, whose content rules prohibit real-country flags
and country names as in-game content (`../PROJECT.md`, "Platform — Yandex Games"). Upstream
OpenFront.io lets players pick a country flag as a cosmetic, and seeds AI *nations* with flags drawn
from real geography.

So the fork had to remove country flags to be publishable at all. But flags are **not a dead
feature** — they are a planned **paid** cosmetic, restricted to **non-country** designs. The
infrastructure (`FlagInput`, `FlagInputModal`, `CustomFlag`, `FlagSchema`, the `flag` field on
`PlayerCosmetics`) is therefore worth keeping intact.

## Decision

Suppress flags at every point where one would be **adopted into player cosmetics**, while leaving
validation, schema, and UI infrastructure in place. Each suppression site is marked
`// Flashist AdaptatioN: disabling flags` with the original line retained, commented out:

| Site | What is suppressed |
|---|---|
| `src/server/Privilege.ts:45-55` | `FlagSchema.safeParse(refs.flag)` still runs and still rejects an invalid flag; on success `cosmetics.flag = result.data` is **commented out** |
| `src/core/game/GameView.ts:481-485` | AI nations are built with an empty cosmetics object — `flag: nation.flag` commented out |
| `src/client/SinglePlayerModal.ts:544-550` | the flag from the picker is not put into the match's cosmetics |
| `src/client/graphics/layers/PlayerPanel.ts:422` | flag not rendered in the player panel |

Two supporting moves complete the suppression:

- The asset directory was renamed to `resources/flags_source`, so `/flags/*.svg` requests **404 by
  design**. The 404 is the mechanism, not a bug.
- The flag picker is hidden in the UI, so `CitizenshipCard` falls back to the 🏳️ placeholder.

**Validate-then-drop is the deliberate shape**: an invalid flag reference is still rejected with a
`forbidden` result, so the wire contract stays enforced and the code path stays exercised and
type-correct for the day flags return.

## Options considered

- **Parse-then-drop, keep the infrastructure, rename the assets (chosen)** — satisfies the platform
  rule immediately and completely, keeps the schema and validation honest, and leaves the paid
  non-country cosmetic a small change away rather than a rebuild. Every suppression point is
  discoverable by grepping one marker string.
- **Delete flag support outright** — rejected. Flags are planned revenue, not dead weight. Deleting
  `FlagSchema`, the `flag` cosmetic field, the picker, and the render path would mean rebuilding all
  of it, and would silently change the wire contract for any client still sending a `flag`.
- **Keep flags and filter to a non-country allowlist now** — rejected as premature. The allowlist,
  the non-country artwork, and the paid entitlement gate are the *actual* feature; shipping a partial
  version risks a compliance mistake against a platform that can delist the game, for no revenue.
- **Leave the assets served under `/flags/` and only stop rendering** — rejected. Serving real-country
  flag artwork from the game's own origin is exactly the content the rule targets, whether or not the
  game draws it. The rename makes the suppression true at the asset layer too.

## Consequences

- **Positive:** Yandex-compliant with no ambiguity. The schema and validation still hold. Re-enabling
  is a bounded change at four marked sites plus an assets decision, with the paid gate added on top.
- **Negative / costs:** the codebase carries visible commented-out lines and an apparently-unused
  `result.data` at `Privilege.ts:52`. `FlagInput` / `FlagInputModal` / `CustomFlag` exist without a
  live path to cosmetics. AI nations lose their visual identity. The suppression is **convention,
  not enforcement** — nothing prevents a new code path from reading a flag and rendering it; only
  the marker comments signal the rule.
- **Three things that look like defects and are not:** `/flags/*.svg` returning 404; the 🏳️ fallback
  in `CitizenshipCard`; and a validated flag being parsed and then discarded.
- **Residual risks / "re-raise only if":**
  - **The paid non-country flag cosmetic is scheduled** — then design the allowlist, the artwork
    source, and the entitlement gate, and supersede this ADR. This is the expected exit.
  - **Yandex's content rules change** such that country flags become permissible.
  - **A new code path adopts a flag into cosmetics without an entitlement gate** — that *is* a defect
    against this ADR and a compliance risk; report it as one.

  Absent those, a review finding of the form "flags are parsed then discarded", "`/flags/*.svg` 404s",
  "`FlagInput` is unused", or "commented-out flag code should be deleted" is **closeout of this ADR,
  not a new defect.** Do **not** "fix" the 404 by resurfacing legacy country flags.

## Related

- `src/server/Privilege.ts:45-55` — validate-then-drop, the load-bearing site
- `src/core/game/GameView.ts:481-485`, `src/client/SinglePlayerModal.ts:544-550`,
  `src/client/graphics/layers/PlayerPanel.ts:422` — the other three marked sites
- `resources/flags_source/` — the renamed asset directory
- `../PROJECT.md`, "Platform — Yandex Games" and "Conventions & constraints"
- `../architecture.md` §9 (authentication and cosmetics)
- ADR-102 — the fail-open privilege checker in the same `PrivilegeChecker` path
