# Task 4 — Tutorial: Guided First Bot Match

## Context

There is currently no tutorial. A first-time player opening Geoconflict is dropped into a full multiplayer match with no context — territory expansion mechanics, economy, alliances, nukes — and will close the tab within 90 seconds without any guidance on what to do.

This is the single largest cause of new player drop-off. A player who completes one full match and wins is highly likely to return. A player who sits confused for 90 seconds and loses without understanding why almost never returns.

The singleplayer mission infrastructure is already built. A tutorial is Mission Level 0 with a tooltip overlay system added on top — not a separate game mode.

## Experiment Setup

✅ **Test via Yandex experiments API.**

The tutorial is purely additive and only triggers for first-time players. Players not in the experiment group simply don't see it — they experience the current unguided flow. This makes it safe to A/B test without any risk to existing players.

**Success metrics:**
- **Second-session rate:** do players who completed the tutorial return for a second match? This is the primary metric — a player who comes back has been converted.
- **Match completion rate for new players:** do tutorial group players finish their first public match at a higher rate than control group players?
- **`Session:FirstAction` rate (Task 2d):** the proportion of new players who take any meaningful in-match action at all. The tutorial should meaningfully increase this rate for the experiment group.

**Minimum experiment duration:** run for at least 2 weeks before evaluating, to collect enough new player sessions for statistical significance.

## Goal

Give every new player a guided first match they can win in 3–4 minutes, using the existing singleplayer infrastructure, with tooltip overlays at key decision points. The match must end in a player victory — this is a critical design requirement.

## What "Done" Looks Like

### Trigger

- Detects first-time players via a `tutorialCompleted` flag in localStorage
- Flag is absent on first game open → tutorial launches automatically before the player enters the lobby
- Flag is set when the tutorial match ends (win or skip) → tutorial never triggers again
- Players in the control group (Yandex experiment) skip this check entirely and go directly to the normal flow

### Match Setup

- Runs as a singleplayer bot match on a **small map** — the smallest available map size, or a dedicated tutorial map if one can be authored quickly
- Player starts with a position already chosen (auto-spawn from Task 4a applies here — the tutorial should use the same mechanic)
- **Bot difficulty must be set low enough that the player wins within 3–4 minutes.** This is non-negotiable. The player must finish with a victory. A tutorial that ends in defeat is worse than no tutorial — it teaches the player that they are bad at the game. Tune bot aggression, bot starting position, and map size accordingly. The developer should playtest this specifically.
- No alliance requests in the tutorial match — alliances involve another player accepting, which cannot happen in a bot match. Remove or disable alliance mechanics for the tutorial map. The tooltip for alliances (see below) can be omitted from V1 if this is complex.

### Tooltip Overlay System

Tooltips appear as overlaid UI elements pointing at the relevant part of the screen. They should:
- Block the relevant UI element or map area with a semi-transparent backdrop until dismissed
- Have a single "Got it" or "OK" dismiss button — no next/back navigation
- Be concise — one sentence maximum per tooltip
- Not appear all at once — each tooltip triggers at a specific in-game condition (see below)
- Be skippable: a "Skip tutorial" button should be visible at all times in the corner

**Tooltip moments and trigger conditions:**

| # | Trigger condition | Tooltip text (Russian + English) |
|---|---|---|
| 1 | Match starts, player has been auto-spawned | "Вы здесь. Нажмите на соседнюю клетку суши, чтобы начать захват территории." / "You are here. Tap a neighboring land tile to start capturing territory." |
| 2 | Player's troop count first exceeds the attack threshold (troops available to send) | "Нажмите на соседнюю территорию, чтобы атаковать." / "Tap a neighboring territory to attack." |
| 3 | Player's gold first reaches the cost of a City | "У вас достаточно золота для постройки города. Нажмите на свою территорию, чтобы строить." / "You have enough gold to build a City. Tap your territory to build." |
| 4 | Player eliminates their first bot | "Отлично! Продолжайте захватывать территории, чтобы победить." / "Great job! Keep capturing territory to win." |

**Tooltip 1 note:** this replaces the standard spawn message for tutorial players. It should reference the auto-spawn mechanic from Task 4a — the player has already been placed, so the tooltip confirms their location and tells them what to do next.

**Nuke tooltip:** omit from V1. Nukes require enough gold and territory that a 3–4 minute tutorial match may not reach the point where the player can afford one. If the match ends before nukes become relevant, the tooltip would never trigger anyway. Add in V2 if the tutorial is extended.

**Alliance tooltip:** omit from V1 if disabling alliance mechanics in the tutorial map is complex. Alliances can be introduced in the second or third real match when the player is more oriented.

### Win Condition and Ending

- When the player wins (all bots eliminated), show a brief victory screen consistent with the existing singleplayer victory UI
- After the victory screen is dismissed, transition directly to the main lobby — not back into another tutorial match
- Set `tutorialCompleted = true` in localStorage at this point
- **Do not show interstitial ads at the end of the tutorial match.** The tutorial ending is a high-value moment — the player has just won their first match and is most likely to return. An ad immediately after this moment is a jarring interruption. The tutorial match should be ad-free.

### Skip Behavior

- "Skip tutorial" button visible at all times in the corner during the tutorial match
- Skipping sets `tutorialCompleted = true` immediately — the tutorial does not re-trigger
- Skipping drops the player into the normal lobby flow, not into a match
- No confirmation dialog on skip — one tap is enough

### Analytics Events

Fire the following events to measure tutorial performance alongside the Yandex experiment data:

| Event | When |
|---|---|
| `Tutorial:Started` | Tutorial match begins |
| `Tutorial:TooltipShown:{N}` | Each tooltip appears (N = 1, 2, 3, 4) |
| `Tutorial:Skipped` | Player taps skip at any point |
| `Tutorial:Completed` | Player wins the tutorial match |
| `Tutorial:Duration` | Time in seconds from `Tutorial:Started` to `Tutorial:Completed` or `Tutorial:Skipped` — log as a design event with value |

These events feed directly into the experiment success metrics and allow comparison between tutorial completers, skippers, and the control group.

## Implementation Notes

**Mission infrastructure reuse:** the existing singleplayer mission system handles bot match setup, win condition detection, and the victory screen. The tutorial is a mission configuration plus a tooltip layer — not a new game mode. The developer should start by reviewing how existing missions are structured in the codebase and model the tutorial as Mission Level 0.

**Tooltip implementation:** the tooltip overlay does not need to be a complex system. For V1, a simple approach is acceptable: a fixed set of conditions checked each tick (or on relevant game events), a flag per tooltip tracking whether it has been shown, and a UI overlay component that renders the active tooltip and blocks interaction until dismissed. The conditions are straightforward to check from the game state.

**Bot tuning:** the developer must playtest the tutorial match specifically for the win-within-3-4-minutes requirement. Relevant levers: map size, number of bots, bot starting positions relative to the player, bot aggression multiplier if one exists. Document the final tuning values as named constants so they can be adjusted without a code search.

**Localization:** all tooltip text must be provided in both Russian and English from day one. Russian is the primary audience on Yandex Games. Use the existing i18n system if one exists in the codebase; if not, a simple key→string map per language is sufficient for the 4 tooltips in V1.

**Task 4a dependency:** the tutorial relies on auto-spawn (Task 4a) for Tooltip 1. If Task 4a has not shipped when the tutorial is being implemented, the developer should implement the auto-spawn behavior within the tutorial match first, then ensure Task 4a's global implementation is consistent with it.

**Task 4b dependency:** the tutorial benefits from auto-zoom on spawn (Task 4b) — Tooltip 1 points the player to their location, and the auto-zoom ensures they are already looking at it. If Task 4b has not shipped, the tutorial should implement a one-time zoom-to-spawn specifically for the tutorial match as a fallback.

## Verification

1. **First-time trigger:** clear localStorage, open the game — tutorial launches automatically before the lobby
2. **No re-trigger:** complete or skip the tutorial, reload the game — tutorial does not appear again
3. **Win within 3–4 minutes:** a new player with no prior knowledge should be able to win the tutorial match without getting stuck. Playtest with someone unfamiliar with the game if possible.
4. **All tooltips fire:** play through the tutorial without skipping — all 4 tooltips appear at the correct moments, in order, and only once each
5. **Skip behavior:** tap skip at various points — `tutorialCompleted` is set, player lands in the lobby, tutorial does not re-trigger
6. **No interstitial ad on tutorial win:** confirm the ad does not fire at the tutorial match end
7. **Analytics:** verify all `Tutorial:*` events appear in GameAnalytics with correct values
8. **Experiment group:** verify that players assigned to the control group via Yandex experiments never see the tutorial and are not affected by the `tutorialCompleted` flag logic

## Notes

- The 3–4 minute win requirement is the most important design constraint in this task. Do not ship a tutorial where a new player can lose or get stuck — that outcome is worse than no tutorial.
- V1 intentionally omits nukes and alliances. These can be added to a V2 tutorial once the base tutorial has shipped and experiment data confirms it is working.
- The tutorial match being ad-free is a product decision, not a technical constraint. Make sure the ad suppression logic specifically checks for the tutorial match context and does not accidentally suppress ads in other singleplayer matches.
