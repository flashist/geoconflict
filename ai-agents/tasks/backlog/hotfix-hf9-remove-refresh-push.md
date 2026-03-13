# HF-9 — Remove `#refresh` History Push for All Non-Tutorial Game Types

## Priority
Post-Sprint 2 hotfix — urgent. The double-reload bug is currently active for all non-tutorial game types in production. Every user who refreshes after completing or abandoning a multiplayer or single-player game triggers a second full page load, doubling all session-start analytics events for that session.

## Background

PR #45 fixed the double-reload for tutorial games by skipping the `#refresh` history push when `lobby.gameStartInfo?.config?.isTutorial` is true. The root cause — the `#refresh` push itself — was not removed for other game types.

The `#refresh` push was originally part of a two-step history pattern:
1. Push `#refresh` as a "homepage" history entry
2. Push `#join=gameID` as the game entry
3. On Back, land on `#refresh` → `handleHash()` navigates to root URL

Step 2 (`#join=gameID`) is **disabled for all game types** in this codebase (Flashist Adaptation). With step 2 absent, `#refresh` serves no navigational purpose and only causes the double-reload on the next browser refresh.

**The fix is to remove the `#refresh` push entirely.**

---

## Location

`src/client/Main.ts`, inside the `onJoin` callback in `handleJoinLobby()`, around the comment:
> "Ensure there's a homepage entry in history before adding the lobby entry."

Current code after PR #45:

```ts
if (
  (window.location.hash === "" || window.location.hash === "#") &&
  !lobby.gameStartInfo?.config?.isTutorial
) {
  history.pushState(null, "", FlashistFacade.instance.windowOrigin + "#refresh");
}
```

## The Fix

Remove the block entirely:

```ts
// Removed: #refresh history push.
// Originally part of a two-step history pattern (#refresh → #join=gameID).
// #join=gameID is disabled for all game types (Flashist Adaptation),
// making #refresh a no-op that caused double page reloads on browser refresh.
```

Leave the comment so the intent is clear to future developers.

---

## Analytics Impact After Fix

The following events will stop double-firing for users who refresh after any game:

| Event | Current state | After fix |
|---|---|---|
| `Session:Start` | Fires twice per refresh | Fires once |
| `Device:[class]` | Fires twice per refresh | Fires once |
| `Platform:[os]` | Fires twice per refresh | Fires once |
| `Player:New` / `Player:Returning` | New users counted as both on second session | Correct |
| `Experiment:*` | Fires twice per refresh | Fires once |

---

## Historical Data Caveat

All session-level analytics collected **before PR #45 merged** are affected by the double-reload to an unknown degree. The magnitude depends on how frequently users refreshed after starting a game — currently unknown (see open investigation point in `double-reload-findings.md`).

Specifically:
- `Session:Start` counts are inflated for affected sessions → funnel denominators are overstated
- `Player:New` vs `Player:Returning` split is distorted for users whose second-ever page load triggered the bug
- `Tutorial:Started` counts are inflated → the 2.9K vs 731 completions+skips gap is likely dominated by this bug, not by player abandonment

Data collected after this fix ships should be treated as the reliable baseline. When analysing any metric trends, use the deploy date of HF-9 as the "clean data starts here" marker — this is why HF-7 (build number tracking) is important to have in place before reading post-fix data.

---

## Verification

1. Start any non-tutorial game, let it run briefly, then press browser Refresh
2. Confirm only **one** `Session:Start` event appears in GameAnalytics for that session
3. Confirm `window.location.hash` is empty (not `#refresh`) after starting a game
4. Confirm the Back button still works as expected — navigating back should return to the root URL or Yandex Games context without errors
5. No Sentry errors related to hash handling or navigation

## Notes

- **Back button regression risk is low.** The Back button scenario that `#refresh` was designed for required `#join=gameID` to be present — without it, pressing Back from a game already landed on `#refresh` and immediately redirected anyway. Removing `#refresh` means Back will navigate to whatever was in history before the game page, which is the correct behaviour for the Yandex Games iframe context.
- **Tutorial game types:** already fixed in PR #45. This task only touches the remaining non-tutorial branch.
- **If `#join=gameID` is ever re-enabled** in the future, the full two-step history pattern should be restored together — `#refresh` + `#join` as a pair, not `#refresh` alone.
