# HF-4 — Mobile Control Panel Hit Area Bug

## Priority
Critical mobile bug. Add to Post-Sprint 2 hotfix release alongside HF-1, HF-2, HF-3.

## Context

On mobile, the control panel UI element (`control-panel`) has a hit area significantly wider than its visible content. The panel renders at 320×236px visually, but its container extends to the full screen width — meaning the transparent area to the right of the visible panel intercepts all touch events, blocking player interactions with the map on the right half of the screen.

On desktop this is not an issue because the control panel is 740×236px and intentionally spans full width. On mobile the panel is narrower but the container hit area did not shrink accordingly.

**Impact:** on mobile, approximately half the map is untappable as long as the control panel is visible. This affects attack selection, spawn location choice, building placement — essentially all core gameplay interactions on mobile.

## Root Cause

The `control-panel` container is likely full-width on mobile while its visible content is left-aligned at ~320px. The transparent right portion of the container sits above the map canvas in z-order and captures touch events before they reach the map.

## Fix

**Preferred approach — pointer-events passthrough:**
Add `pointer-events: none` to the `control-panel` container, and `pointer-events: auto` explicitly back onto all interactive child elements (buttons, sliders, text inputs). This lets touches pass through the transparent area to the map while keeping all panel controls fully interactive.

This is the cleanest fix — no layout changes required, minimal risk of visual regressions.

**Alternative — constrain container width on mobile:**
Set the container width to match its content width on mobile (approximately 320px). Simpler in concept but requires verifying the layout doesn't break at edge cases — different screen sizes, landscape orientation, panel expanded/collapsed states.

The developer should choose whichever approach is cleaner given the existing CSS structure. If both approaches are equivalent in effort, prefer the pointer-events approach as it is less likely to introduce layout regressions.

## Verification

1. **Core interaction restored:** on a mobile device or emulator, open a match and confirm taps on the right half of the screen (while the control panel is visible) correctly register on the map — attack selections, spawn location taps, territory interactions
2. **Panel controls still work:** all buttons, sliders, and interactive elements within the control panel remain fully functional — nothing is accidentally blocked by the pointer-events change
3. **Panel expanded and collapsed states:** verify both states — some panels toggle visibility, confirm the fix works in both
4. **Landscape orientation:** verify on landscape mobile layout if applicable
5. **Desktop unaffected:** confirm no change in desktop behavior — the fix should be mobile-specific or at minimum have no visible effect on desktop

## Notes

- Check whether the same issue affects any other UI containers on mobile — the control panel is the most impactful but other full-width containers may have the same problem. Note any others found during investigation but do not fix them in this hotfix unless they are equally critical.
- This bug likely exists regardless of tutorial state — it affects all mobile players in all match types, not just tutorial players.
- Once fixed, mobile tap accuracy data from existing analytics events (`Match:SpawnChosen`, `Match:SpawnAuto`) may show improvement as players who were previously blocked from tapping spawn locations can now interact correctly.
