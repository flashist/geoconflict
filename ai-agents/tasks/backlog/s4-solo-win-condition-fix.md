# Task — Solo Mode: Opponent Win Condition Not Triggering Loss

## Sprint
Sprint 4

## Priority
High — active user complaints; players cannot complete missions. Reproduced by Mark.

---

## Context

In missions mode (and likely in other solo modes), when an opponent nation reaches the win threshold (80% of territory), the game does not end and no loss screen appears. The game runs indefinitely. Furthermore, if the player subsequently captures 80% themselves, they cannot win either — the game is permanently stuck.

**Product decision (locked):**
- If any opponent meets the win condition, the player has lost. A loss screen must appear immediately.
- The loss screen is **not** the "you died / you were eliminated" screen — the player's territory still exists. It is a distinct "you lost because an opponent won" state.
- Once an opponent wins, the player can no longer win the match regardless of subsequent territory capture.

Confirmed reproduction: missions mode. Suspected to also affect single-player / custom game (solo human vs bots/nations). Scope of affected modes is part of the investigation.

---

## Investigation (do this before implementing)

### 1. Find the win condition check
Locate where the game evaluates whether a player or nation has reached the win threshold. Key entry points to look at:
- `src/core/GameRunner.ts` — tick execution
- `src/core/game/GameImpl.ts` — game state
- `src/core/execution/` — any execution classes related to win/loss evaluation
- Any game-mode configuration files that define win conditions for missions vs. multiplayer vs. custom game

### 2. Determine scope of affected modes
Identify which game modes run the same win condition evaluation path. Modes to check:
- Missions mode
- Single-player / Custom Game (solo human vs AI)
- Tutorial (probably excluded — confirm)
- Multiplayer (confirm unaffected, i.e. the bug is specific to solo contexts or that opponent-wins-means-player-loses only applies in solo modes)

### 3. Find the existing loss/game-end screen
Determine what screens exist for match termination:
- Is there a "you were eliminated" screen (player's territory captured)?
- Is there a generic "game over" or "match ended" screen that can be reused for "opponent won"?
- Does a new screen state need to be created, or does an existing screen accept a different message/state parameter?

Document your findings in the PR description before implementing.

---

## What to Build

### 1. Fix the win condition evaluation

When any opponent (nation or AI bot) reaches the win threshold in a solo mode:
- Immediately end the match for the player
- Transition to the loss state (see screen below)
- Prevent any further win evaluation — the match is over, the player cannot subsequently win by capturing territory

The fix should not affect multiplayer mode behaviour. In multiplayer, an opponent reaching the threshold ends the game for all players via the existing server-authoritative flow; only the solo-mode path needs this fix.

### 2. Show the correct loss screen

Show a loss screen that is **distinct from the elimination ("you died") screen**. The player is still alive — they lost because an opponent won.

If an existing match-end screen supports a "loss" state, use it with appropriate text. If a new state is needed, keep it minimal: reuse the existing modal pattern (follow `GameStartingModal.ts` as the LitElement pattern reference) and add a new display state rather than a new component.

Localization: all user-visible strings must use `translateText()`. Add keys to both `resources/lang/en.json` and `resources/lang/ru.json`. Suggested strings:

| Key | English | Russian |
|---|---|---|
| `loss_screen.opponent_won_title` | `You lost` | `Вы проиграли` |
| `loss_screen.opponent_won_body` | `An opponent captured enough territory to win.` | `Противник захватил достаточно территории для победы.` |

Adjust keys and text to match whatever existing screen/component structure the investigation reveals.

---

## Analytics

Fire one event when the player reaches the loss-by-opponent-win state:

| Event | Trigger |
|---|---|
| `Match:Loss:OpponentWon` | Loss screen shown because an opponent met the win condition |

Add to `ai-agents/knowledge-base/analytics-event-reference.md`. Route through the existing analytics enum — do not write the event string inline.

---

## Verification

1. **Missions mode — opponent wins:** start a mission. Allow an opponent to reach 80% territory. Confirm the loss screen appears promptly and is not the "you died / eliminated" screen.
2. **Solo / custom game — opponent wins:** same test in single-player / custom game mode. Confirm loss screen appears.
3. **No subsequent win:** after an opponent reaches 80%, attempt to capture 80% yourself. Confirm no win state is triggered — the match is already over.
4. **Normal elimination unchanged:** confirm the existing "you died" screen still appears correctly when the player's own territory is eliminated.
5. **Multiplayer unaffected:** confirm multiplayer match-end behaviour is unchanged.
6. **Localization:** confirm loss screen text appears in both Russian and English based on the active language.
7. **Analytics:** confirm `Match:Loss:OpponentWon` fires exactly once when the loss screen is shown.

---

## Notes

- Tutorial mode: confirm during investigation whether it uses the same win condition path. If so, explicitly exclude it from this fix (tutorial has its own scripted flow).
- The investigation findings — specifically which modes are affected and what screen infrastructure exists — should be documented in the PR description before implementation begins. If findings reveal the scope is significantly larger than expected, flag for re-scoping before proceeding.
- The win threshold (80%) is assumed to be the existing game constant. Do not change the threshold value in this task.
