# Double Page Reload — Findings & Impact

## What is the double-reload bug?

On certain browser refreshes, the game page loads **twice in quick succession** — two full, independent JavaScript contexts with separate module evaluations and separate `DOMContentLoaded` events. Because `localStorage` is shared across same-origin loads, any data written to storage or analytics events fired during initialization happen **twice per user refresh**.

This was discovered while investigating why `tutorialAttemptCount` incremented by +2 instead of +1.

The key diagnostic signal: a module-level random ID (`Date.now() + random`) was different in each of the two `DOMContentLoaded` invocations — proving these were not two calls within the same page context, but two genuinely separate page loads.

---

## The mechanism

### How `#refresh` enters the URL

In `src/client/Main.ts`, inside the `onJoin` callback passed to `joinLobby()` (fires when a game actually starts):

```ts
// src/client/Main.ts ~line 752
if (window.location.hash === "" || window.location.hash === "#") {
  history.pushState(null, "", FlashistFacade.instance.windowOrigin + "#refresh");
}
```

This was designed as part of a browser history management pattern for multiplayer games:
1. Push `#refresh` as a "homepage" history entry
2. Push `#join=gameID` as the game entry
3. When the user presses Back, they land on `#refresh`, which `handleHash()` converts into a clean navigation to the root URL

### Why `#join` is no longer pushed (Flashist Adaptation)

The second `pushState` for `#join=gameID` is **disabled** in this codebase:

```ts
// Flashist Adaptation: disabling the #join URL
// history.pushState(null, "", `#join=${lobby.gameID}`);
```

This was intentionally removed, but `#refresh` was left in. As a result, `#refresh` is pushed into the URL with nothing following it. The URL stays at `...#refresh` for the rest of the session.

### How the double-reload triggers

1. User starts any game → `#refresh` is pushed → URL is now `https://geoconflict.ru/yandex-games_iframe.html#refresh`
2. User presses the browser Refresh button (or closes and reopens the tab)
3. Browser loads the page with `#refresh` still in the URL
4. `DOMContentLoaded` fires → `client.initialize()` is called → `handleHash()` runs:

```ts
// src/client/Main.ts ~line 643
if (decodedHash.startsWith("#refresh")) {
  FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname);
}
```

5. `changeHref` sets `window.location.href = rootPathname`, which **queues** a navigation. JavaScript execution continues on the current page.
6. **Before the navigation fires**, `client.startTutorial()` (or whatever the auto-launch flow is) runs and fires analytics, writes to localStorage, etc.
7. The queued navigation completes → **second, clean page load** → `DOMContentLoaded` fires again → all initialization runs a second time.

Result: two loads, two sets of initialization analytics, two localStorage writes.

---

## What is fixed

### Tutorial: `#refresh` no longer pushed for tutorial games (PR #45)

**File:** `src/client/Main.ts`

The `#refresh` push is now skipped when the game being joined is a tutorial:

```ts
if (
  (window.location.hash === "" || window.location.hash === "#") &&
  !lobby.gameStartInfo?.config?.isTutorial
) {
  history.pushState(null, "", FlashistFacade.instance.windowOrigin + "#refresh");
}
```

**Rationale:** Tutorial games never push `#join=...` either (it was already disabled). There is no "back button" scenario to support for tutorials. So `#refresh` served no purpose and only caused the double-reload.

### Tutorial attempt counter: NaN guard added (PR #45)

**File:** `src/client/TutorialStorage.ts`

```ts
const parsed = parseInt(stored ?? "", 10);
const next = (Number.isNaN(parsed) ? 0 : parsed) + 1;
```

Prevents a corrupted localStorage value from permanently breaking the counter.

---

## What is NOT fixed

### All non-tutorial game types still push `#refresh`

Multiplayer games, single-player missions, and any future game type all go through the same `onJoin` callback and still push `#refresh`. Since `#join=gameID` is disabled for all of them too, the same double-reload will happen whenever a user refreshes after completing or abandoning any game.

**Location:** `src/client/Main.ts`, inside the `onJoin` callback in `handleJoinLobby()`, around the comment "Ensure there's a homepage entry in history before adding the lobby entry."

**Possible fix (not yet applied):** Either remove the `#refresh` push entirely (since `#join` is disabled for all game types, the history pattern it was designed for no longer applies), or extend the `isTutorial` guard to a broader condition that covers all cases where `#join` is not pushed.

---

## Known analytics impact

The following analytics are fired during the initialization sequence that runs **on every `DOMContentLoaded`**. If the double-reload triggers, all of these fire twice in one user session:

| Event | Where fired | Notes |
|---|---|---|
| `Session:Start` | `FlashistFacade` constructor | Fires on module evaluation |
| `Device:[class]` | `FlashistFacade` constructor | e.g. `Device:desktop` |
| `Platform:[os]` | `FlashistFacade` constructor | e.g. `Platform:windows` |
| `Player:New` | `FlashistFacade` constructor | Only on truly first visit — second load finds the key already set so fires `Player:Returning` instead |
| `Player:Returning` | `FlashistFacade` constructor | Fires on the second load even if the user is new (first load set the key) |
| `Experiment:*` | `FlashistFacade.initExperimentFlags()` | Fires once per flag per load |
| `Tutorial:Started` | `Client.startTutorial()` | **Fixed for tutorial games in PR #45** — no longer double-fires after that fix |

### Special case: `Player:New` on first visit

On a user's very first session where the double-reload triggers:
1. First load: `localStorage` has no `firstSeen` key → `Player:New` fires, key is written
2. Second load: key already exists → `Player:Returning` fires

Result: the user is counted as both new AND returning in the same session. This inflates `Player:Returning` for actual new users.

---

## What needs investigation

1. **Actual frequency of the double-reload in production.** The bug only triggers on a browser refresh (or re-open from URL bar) after the user has started at least one game. First-ever page loads are not affected. The share of sessions where this actually fires is unknown.

2. **GameAnalytics deduplication.** It is unknown whether the GameAnalytics SDK deduplicates rapid identical events. If it does, some of the double-fire impact may be absorbed. If not, all session-start events for affected users are double-counted.

3. **`Session:Start` double-counting effect on funnel denominators.** All conversion funnels are anchored on `Session:Start`. If it fires twice per affected session, the denominator of every funnel metric is inflated for that user cohort. The magnitude of this inflation depends on the frequency finding from point 1.

4. **`Player:New` / `Player:Returning` split accuracy.** As described above, new users on their second-ever page load (after starting one game) will fire `Player:Returning` instead of `Player:New`. The size of this distortion in the historical data is unknown.

5. **Whether the same double-reload can occur on first page load (before any game).** Currently, `#refresh` is only pushed after a game starts (`onJoin` callback). So a user who has never started a game is not affected. This should be confirmed as a safe assumption.

6. **Service worker interactions.** If a service worker is ever added to the project, it could interact with the `#refresh` navigation in unexpected ways. This is a future risk, not a current one.
