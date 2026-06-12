# Task — Remove Dead `initializeFuseTag` Polling Loop

## Sprint
Sprint backlog — no sprint home yet. Small standalone client bugfix.

## Priority
Low — no player-facing symptom, but a perpetual background timer runs in **every session**. Cheap to remove; clean weekend deploy.

## Experiments
❌ Excluded — dead-code/bugfix, ships to all players.

## Scope
`src/client/` only. No `src/core/` changes.

---

## Context

Discovered during the app-bootstrap investigation (`ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`, §2.6 item 1). **Not** fixed by the bootstrap refactor — it is an independent bug.

`Main.ts:950-970` `initializeFuseTag()` starts a `setInterval` that fires every 100ms and checks for `window.fusetag.pageInit`:

```ts
const interval = setInterval(() => {
  if (tryInitFuseTag()) {
    clearInterval(interval);
  }
}, 100);
```

`tryInitFuseTag()` only returns `true` (and clears the interval) once `window.fusetag` exists. But the Publift/Fuse ad script is **commented out in both HTML templates**:

- `src/client/index.html:96` — `<!-- <script async src="...fuse.js"></script> -->`
- `src/client/yandex-games_iframe.html:160` — same, commented out

So `window.fusetag` is never defined, `tryInitFuseTag()` is always `false`, `clearInterval` is never reached, and the **100ms timer runs forever** in every session. The method is invoked from `Main.ts:545` (`this.initializeFuseTag()`).

---

## What to build

Fuse/Publift ads are currently **intentionally disabled** (script commented out in both templates; `GutterAds` also early-returns in the production iframe path). The correct fix for current intent is to **remove the dead init**, not to make the timer self-terminate.

- Remove the `this.initializeFuseTag()` call at `Main.ts:545`.
- Remove the now-unused `initializeFuseTag()` method (`Main.ts:950-970`). Git history preserves it if ads are restored later.
- Leave the `window.fusetag` type declaration (`Main.ts:96`) — it is also referenced by `GutterAds.ts` (`loadAds`/`destroyAds`), so removing it is out of scope here.

> **Decision flag (confirm before implementing):** this assumes Fuse ads stay disabled. If the intent is actually to **re-enable** Publift ads, that is a different, deliberate task — restore the `fuse.js` `<script>` in **both** templates and keep the init — and should not be done as part of a dead-code cleanup. Default here = remove the dead timer.

---

## Verification

1. App boots normally (`npm run dev`); no functional change.
2. No recurring 100ms `setInterval` tied to fuse-tag remains active (check via DevTools performance/timer panel or a `console.log` audit — confirm the perpetual timer is gone).
3. `GutterAds` behaviour unchanged — ads remain correctly absent in the iframe/production path.
4. `npm test`; `npm run lint`.

---

## Notes

- `src/client/` only — no mandatory `src/core/` unit test, but confirm no regression in the ad/GutterAds path.
- Related: the `GutterAds` `userMeResponse` unsubscribe bug (`fix-gutterads-usermeresponse-unsubscribe.md`) is the sibling §2.6 cleanup — independent fix, can ship together or separately.
- Effort: ~30 minutes plus verification.
