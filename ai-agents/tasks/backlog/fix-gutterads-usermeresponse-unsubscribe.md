# Task — Fix GutterAds Permanently Unsubscribing from `userMeResponse` After First `hide()`

## Sprint
Sprint backlog — no sprint home yet. Small standalone client bugfix.

## Priority
Low–Medium — a real listener-lifecycle bug. After the first `hide()`, `GutterAds` stops reacting to login-state changes for the rest of the session. Player-visible impact is currently small (ads are disabled in the production iframe path), but the bug becomes meaningful the moment gutter ads are enabled on a non-iframe surface. Cheap, safe fix.

## Experiments
❌ Excluded — bugfix, ships to all players.

## Scope
`src/client/GutterAds.ts` only. No `src/core/` changes.

---

## Context

Discovered during the app-bootstrap investigation (`ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`, §2.6 item 2). **Not** fixed by the bootstrap refactor — independent bug.

`GutterAds` subscribes to the `userMeResponse` event in `connectedCallback` (`GutterAds.ts:24-30`) to react to login state (it hides ads for players who own patterns). The problem is in `hide()` (`GutterAds.ts:77-86`):

```ts
public hide(): void {
  this.isVisible = false;
  this.destroyAds();
  document.removeEventListener(
    "userMeResponse",
    this.boundUserMeHandler as EventListener,
  );           // <-- removes the subscription
  this.requestUpdate();
}
```

`hide()` is called both from `disconnectedCallback` (`:128`) **and** externally on every game start / lobby leave — while the element stays connected. Because `removeEventListener` lives in `hide()`, the first non-disconnect `hide()` tears down the `userMeResponse` subscription, and `connectedCallback` (the only place it re-subscribes) does **not** run again for a still-connected element. Result: **after the first `hide()`, `GutterAds` never reacts to login-state changes again** for the rest of the session.

The subscription lifecycle is incorrectly tied to **show/hide** instead of **connect/disconnect**.

---

## What to build

Tie the `userMeResponse` listener strictly to the element's connect/disconnect lifecycle:

- **Remove** the `document.removeEventListener("userMeResponse", ...)` call from `hide()`. `hide()` should only hide and destroy ads — it must not touch the subscription.
- **Add** the `removeEventListener` to `disconnectedCallback` (`:126-129`), as the symmetric counterpart to `connectedCallback`'s `addEventListener`. Note `disconnectedCallback` currently calls `this.hide()` — keep the ad teardown, but move the *listener* removal out of `hide()` and into `disconnectedCallback` directly so connect/disconnect are symmetric.

After this, the subscription is added exactly once per connection and removed exactly once on disconnect; repeated `hide()`/`show()` cycles no longer break login-state reactivity.

---

## Out of scope

- The broader `userMeResponse` **fire-once / no-replay** concern (findings doc §2.6 item 4): a late subscriber that registers after the event has already dispatched permanently misses login state. That is a separate, optional item to re-evaluate **after** the app-bootstrap refactor lands — do not address it here. This task only fixes the erroneous unsubscribe-on-hide.

---

## Verification

1. `npm run dev`: with gutter ads on a qualifying (non-iframe, ≥1400px) surface, trigger a `hide()` (start a game / leave a lobby), then dispatch a `userMeResponse` change — confirm `GutterAds` still reacts (e.g. `onUserMe` runs, ad visibility updates per flare/pattern state).
2. Connect/disconnect symmetry: the `userMeResponse` listener is added on connect and removed on disconnect; no leaked listener after the element is removed.
3. Repeated `show()`/`hide()` cycles do not accumulate or drop listeners.
4. `npm test`; `npm run lint`.

---

## Notes

- `src/client/` only — no mandatory `src/core/` unit test; verify behaviourally per above.
- Related: dead `initializeFuseTag` timer (`fix-fusetag-dead-polling-loop.md`) is the sibling §2.6 cleanup — independent, can ship together or separately.
- Effort: ~1 hour plus verification.
