# Analytics: `Session:PlatformDegraded:{Cause}` (task 0328)

**Source**: `ai-agents/tasks/done/0328-analytics-event-session-platform-degraded-by-cause/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 41 / task `0328` (brief B1 of the `0318` report)

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. The local browser check is
> **owner-owed** (ruling *"You run it later"*). Event definitions of record:
> `ai-agents/knowledge-base/analytics-event-reference.md`.

## Goal

Make the degraded-boot rate measurable. Before this, a failed SDK loader download produced only
`Player:YandexUnknown` — identical to a slow-but-healthy `init()` — and nothing marked a boot as following a
match exit ([[tasks/citizenship-card-vanishes-investigation]]).

## Key Changes

- **`Session:PlatformDegraded:{Cause}`** (enum `SESSION_PLATFORM_DEGRADED_FIRST_PART`): at most **once per page
  load**, Yandex template only, measured at the game-init gate after awaiting the same flags load the card
  awaits. **Seven causes, first match wins** (owner ruling, option (a)): `ScriptFailed` · `ScriptTimeout` ·
  `InitFailed` · `InitTimeout` · `NoSdk` · `NoPlayer` · `NoFlags`. **Value** `1` when the load follows a match
  exit, else `0` — so count = degraded loads, sum = degraded loads after a match.
- **After-match marker:** a `sessionStorage` key (`geoconflict.session.afterMatchExit`) written by
  `changeHref(rootPathname)` and consumed on every boot; every access is in try/catch. `reloadApp()` (the `0303`
  restart) is **not** a match exit.
- **`Session:PlatformRecovered`** — kept by owner ruling, tied to **late flags**: fires when the degraded event
  fired with flags missing and the flags then arrive. It sizes what `0329` can rescue.
- The loader tag's `onerror` now only sets `window.flashist_sdkScriptLoadFailed`; the logic lives in TS
  (`src/client/PlatformDegradedAnalytics.ts`, `FlashistFacade`).
- **Doc drift fixed:** `Session:PlatformInitTimeout` fires **once per boot (latched)**, not "once per stage".
- **Review R1 (owner: *"Reword the doc"*):** the event is **not a count of hidden citizenship cards** — the
  card hides only on missing flags, so `NoPlayer` and a flags-present timeout fire with the card shown. R2
  (owner: *"Accept as known"*): an empty or key-less flags object — accepted residual.

## Outcome

- **Evidence:** 65 new tests; full `npm test` 172 suites / 3039 tests, first run. `npm run lint`'s one error is
  the untracked `0325` helper.
- **Owner-owed local check:** `DEPLOY_ENV=dev npm run build-prod` (⚠️ never plain `build-prod` — it defaults to
  sending **real events to live GameAnalytics**), block the SDK loader, expect one
  `Session:PlatformDegraded:ScriptFailed` value `0`, then value `1` after a match exit.
- **Owner, after release (informational):** pull a GameAnalytics baseline (M1–M7 in the brief) and again a week
  later with the new event.

## Related

- [[systems/analytics]] — the event rows and the cause list
- [[systems/flashist-init]] — the deadline, the stages and the late-recovery branch the events read
- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`, the measurement gap this closes
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, which `Session:PlatformRecovered` sizes
- [[tasks/sdk-loader-download-retry]] — task `0330`, which reuses the `onerror` flag and adds `Session:SdkLoaderRetry:*`
- [[tasks/degraded-mode-ux-treatment]] — task `0049`, the original degraded-mode events
- [[decisions/sprint-6]] — the board carrying this task
- [[tasks/match-exit-keeps-query-string]] — task `0331`, whose effect this task's after-match `InitTimeout` share measures
- [[tasks/stale-login-client-diagnostics]] — task `0372`, which reuses `bootFollowsMatchExit` to split signature age by boot kind
