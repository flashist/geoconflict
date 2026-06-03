# Task — Mobile Memory and WebGL Rendering Failures

## Sprint
Backlog — no sprint. Deferred out of Sprint 4c on 2026-06-03: high implementation
complexity (profiling + device testing + possible renderer changes) made it out of scope
for the stabilization sprint, whose other error families are resolved. Schedule once
mobile performance/crash data is clearer. Related to the parked Task 5 — Deep Mobile
Rendering Optimization (gated on mobile DAU > 1,500).

## Priority
Low / Future — ~0.4 errors/min visible rate, but likely correlated with mobile abandonment. High implementation complexity.

---

## Context

Low-memory devices and unsupported/unstable graphics contexts are producing uncaught rendering errors in production. The observed rate is low in Uptrace, but these crashes are likely correlated with silent mobile abandonment (users who crash do not generate subsequent events).

Error groups observed in Uptrace (2026-05-07 window):

| Error | Rate |
|---|---|
| `RangeError: Failed to execute 'getImageData': Out of memory at ImageData creation` | ~0.22/min |
| `Uncaught RangeError: Failed to execute 'createImageData': Out of memory` | present below cutoff |
| `This browser does not support WebGL. Try using the canvas renderer` | ~0.2/min combined |
| `bindFramebuffer` and context creation failures | present |

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## What to Build

This is a dedicated mobile stability task, not a quick fix. Do not attempt in the same pass as Sprint 4c's code cleanups — scope it separately when the other errors are resolved and mobile performance data is clearer.

### Scope when ready

1. **WebGL unavailable fallback**: When `WebGL` context creation fails or is unavailable, fall back to canvas renderer gracefully rather than crashing. The "This browser does not support WebGL" message suggests this path exists in Pixi.js but is not currently handled cleanly in `GameRenderer`.

2. **Out-of-memory handling for ImageData**: Guard `getImageData` / `createImageData` calls — catch `RangeError` at the allocation sites in the rendering pipeline and fall back to a degraded mode (reduced resolution, no minimap, simplified effects) rather than throwing.

3. **Device context in error logs**: Where WebGL or canvas errors are caught, include device/browser/OS in the error context sent to Uptrace. This currently lacks the metadata needed to know which devices are affected.

4. **Mobile performance settings**: Review whether existing mobile performance settings (retina off, 30fps cap, reduced particles) are applied early enough to prevent the allocation that causes the crash. See `tasks/mobile-quick-wins` for prior work.

Likely code areas:
- `src/client/graphics/GameRenderer.ts` — WebGL context setup and renderer selection
- `src/client/graphics/layers/**` — ImageData allocation sites in terrain/minimap rendering
- Mobile performance and device detection paths

---

## Verification

1. Devices that do not support WebGL show a fallback canvas renderer or a clear user-facing message, not an uncaught error.
2. Out-of-memory `RangeError` during ImageData creation is caught and falls back gracefully without crashing the match.
3. WebGL/canvas error logs in Uptrace include device, browser, and OS context.
4. The `getImageData`/`bindFramebuffer` Uptrace groups disappear or convert to clean, low-severity warnings.

---

## Notes

- Do not conflate this with the Priority 1–4 quick-fix tasks in Sprint 4c. This task requires profiling, device-specific testing, and potentially rendering architecture changes. It should be scoped and scheduled separately.
- The mobile abandonment signal (users crashing without further events) means the true impact may be significantly higher than the 0.4/min Uptrace rate suggests.
