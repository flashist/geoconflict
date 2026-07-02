# Task — Degraded-Mode UX: Give Yandex SDK Timeout/Failure Its Own Player-Facing Treatment

## Sprint
Sprint backlog — no sprint home yet. Conceptually follows `s4-citizenship-card-guest-cta-no-sdk.md` (Sprint 4), which is what first exposed the collapsed-states problem this task would resolve properly.

## Priority
Low — likely rare in production (Bootstrap's platform-init deadline is a bounded 5s before falling back to degraded mode, and its degraded-mode philosophy is deliberately permissive: session continues with default flags, fallback name, browser language, no ads, rather than blocking). Pull the actual `Session:PlatformInitTimeout` volume from analytics before scheduling — if negligible, this can stay backlog indefinitely; if it's a meaningful fraction of sessions, prioritize sooner.

## Experiments
❌ Excluded — UX/reliability correctness, ships to all players once implemented.

## Scope
`src/client/flashist/FlashistFacade.ts`, `src/client/CitizenshipCard.ts`, and potentially other components that branch on `isYandexAuthorized()` / render Yandex-login-dependent UI. No `src/core/` changes expected.

---

## Context

Surfaced while fixing `s4-citizenship-card-guest-cta-no-sdk.md`: `FlashistFacade` currently exposes only two effective states to the rest of the client — "authorized" and "not authorized" — collapsing three genuinely different situations:

- **(a)** standalone/no Yandex context at all (handled by the sibling Sprint 4 task via `yaGamesAvailable`)
- **(b)** real Yandex guest, logged out, SDK healthy
- **(c)** Yandex context, but `YaGames.init()` timed out or rejected within Bootstrap's 5s platform-init deadline (degraded mode)

Case (c) is architecturally indistinguishable from (b) anywhere in the client today — `yaGamesAvailable` reflects "is this a Yandex-platform session," which stays `true` even when init failed (per the flashist-init system notes). `isYandexAuthorized()` / `openYandexAuthDialog()` only check the (absent) player/SDK object.

**Player-facing consequence:** a real player whose Yandex SDK degrades sees the exact same "Войти в Яндекс" CTA as a genuinely logged-out guest, and tapping it silently does nothing (`openYandexAuthDialog()` no-ops when `yandexGamesSDK` is unset). There's no retry, no "something went wrong" messaging — nothing distinguishes "you're not logged in" from "we couldn't reach Yandex."

This is deliberately narrower than Bootstrap's general degraded-mode design (which already has a considered fallback story for flags/name/language/ads) — this task is specifically about what the **citizenship card and any other login-gated UI** should show/do when degraded mode, not a genuine logged-out guest, is the reason authorization is unknown.

## What to build (open questions to resolve before implementation)

1. **Detection:** does `FlashistFacade` need a new explicit state (e.g. `sdkStatus: 'unavailable' | 'ready' | 'degraded'`) distinct from `yaGamesAvailable`, populated once the platform-init deadline is known to have been hit (`Session:PlatformInitTimeout`)? Or is "SDK object exists but no authorized player by boot" already a sufficient proxy?
2. **UX treatment:** for degraded sessions, should the card show a different subtitle (e.g. "Не удалось подключиться — попробуйте позже" / "Couldn't connect — try again later"), attempt a bounded retry of `YaGames.init()`, or simply hide the CTA the same way the sibling task does for case (a)? This is a product decision, not just an engineering one.
3. **Recovery:** slow-but-eventually-successful SDK init has a narrow recovery path (a late `YaGames.init()` success can still deliver `LoadingAPI.ready()` and rehydrate the player) — but boot-rendered UI keeps degraded values after late SDK recovery unless it explicitly re-queries the facade. Decide whether the citizenship card (and any other similarly-gated UI) should re-query on late recovery, or whether that's deferred further.
4. **Scope check:** confirm which other components branch on `isYandexAuthorized()` and would benefit from the same treatment — search beyond `CitizenshipCard` before implementing, to avoid redoing this per-component later.

## Out of scope

- Re-litigating Bootstrap's core degraded-mode design (bounded deadline, default flags, browser-language fallback, no-ads) — that's already settled.
- The Sprint 4 sibling fix for case (a) (standalone/no-SDK) — already scoped and shipping independently.

## Verification

1. Pull `Session:PlatformInitTimeout` rate from analytics to size real-world impact before or during scoping.
2. Once implemented: simulate degraded mode (stub/delay `YaGames.init()` past the deadline) and confirm the citizenship card (and any other in-scope surfaces) shows the agreed distinct treatment, not the generic guest CTA.
3. Confirm real logged-out guests (case b) are unaffected.
4. If a retry/recovery path is built, confirm late SDK success correctly re-renders affected UI.

## Notes

- Needs a product decision on the exact UX (see "What to build" above) before an implementation brief can be finalized — flag for a producer/Mark conversation once prioritized.
- Analytics: if a new degraded-specific state is added, consider whether a new event is warranted (e.g. distinguishing "guest CTA shown due to real guest" vs "shown due to degraded mode") — follow existing `analytics-event-reference.md` conventions if so.
