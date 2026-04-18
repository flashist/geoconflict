# Task — Tutorial: Lock Build Menu to City During Tooltip 5

## Sprint
Sprint 4

## Priority
Medium — prevents player confusion during the most action-heavy tooltip in the tutorial sequence. If a player accidentally builds the wrong structure, the City-built trigger (tooltip 6) never fires and the tutorial stalls.

## Context

Tooltip 5 instructs the player to open the build menu and select City. Currently, all building icons the player can afford are enabled and clickable — the player could accidentally build a different structure instead of a City. This would not only confuse the player but could break the tooltip sequence entirely, since tooltip 6 only triggers on `GameUpdateType.Unit + UnitType.City`.

The fix: during tooltip 5 only, force all non-City building icons into the same disabled state used when a player cannot afford them. The City icon remains fully enabled. Clicking a disabled icon behaves identically to clicking a building the player has insufficient gold for — same visual feedback, no action.

---

## Implementation

### Part A — Investigation

Before implementing, find in the codebase:

1. **Where is the build menu rendered?** Which component/layer renders the building icons and controls their enabled/disabled state?
2. **How is the disabled state currently applied?** Is it a CSS class, a property on the icon component, or something else? Find the exact mechanism used when a player lacks sufficient gold.
3. **How does `TutorialLayer.ts` currently interact with the build menu?** Does it already inject any state into the build menu, or is this a new interaction?
4. **How is `UnitType.City` identified** in the build menu icons — is there a reliable way to identify which icon corresponds to City?

**Output:** a short note identifying the build menu component, the disabled state mechanism, and how to identify the City icon.

---

### Part B — Fix

During tooltip 5 (and only tooltip 5), apply the disabled state to all building icons except City.

**When to apply:** when tooltip 5 becomes active — i.e. when the player opens the radial menu over their territory and tooltip 5 is shown.

**When to remove:** when tooltip 5 is dismissed (player taps "Got it") OR when the City is successfully built (tooltip 6 triggers) OR when the player skips the tutorial. All three paths must restore normal build menu behaviour.

**How to apply:** use the same disabled state mechanism identified in Part A — the one used when a player has insufficient gold. Do not create a new disabled state or new visual style.

**Scope:** only the build menu icons. Other UI elements (attack buttons, alliance buttons, etc.) are unaffected.

---

## Verification

1. Play through tutorial to tooltip 5. Open build menu. Confirm all non-City icons appear in the disabled state.
2. Click a disabled non-City icon — confirm the same feedback as "insufficient gold" appears. No building is constructed.
3. Click the City icon — confirm it works normally and builds the City.
4. After City is built and tooltip 6 appears — confirm all build menu icons return to their normal enabled/disabled state based on gold.
5. Skip the tutorial during tooltip 5 — confirm build menu returns to normal state after skip.
6. Play a normal (non-tutorial) match — confirm build menu behaviour is completely unchanged.
7. Play through tooltips 1–4 and 6–7 — confirm build menu is not affected during any other tooltip step.

## Notes

- This fix only applies during tooltip 5. No other tooltip step restricts the build menu.
- The City icon must remain fully functional — do not accidentally apply the disabled state to it.
- If the player has already built a City before reaching tooltip 5 (unlikely but possible), the tutorial should handle this gracefully — tooltip 6 should fire on the existing City detection and advance normally. This task does not need to handle that edge case differently.
- Interaction with action-pause task (`s4-tutorial-action-pause.md`): both tasks modify tutorial behaviour at tooltip 5. Implement together or coordinate to avoid conflicts.

## Developer Note

The spec says the restriction should be removed "when tooltip 5 is dismissed". This was not followed in the implementation — intentionally.

During tooltip 5 the game is near-paused and the radial menu is not accessible (the tooltip backdrop covers the screen). So the restriction has no visible effect while the tooltip is active. The moment the player taps "Got it", the backdrop closes and they can open the radial menu — which is exactly when the restriction is needed.

Removing it on dismissal would defeat the purpose entirely: the player could immediately open the build menu and choose any building before the city is built. Instead, the restriction is kept active from the moment tooltip 5 is triggered (`shownTooltips[4] === true`) until the city is actually built (`cityBuilt === true`). This is the behaviour the feature requires.

If the spec is ever revised, keep this constraint in mind: the removal trigger must be city-built (or tutorial skipped), not tooltip dismissal.
