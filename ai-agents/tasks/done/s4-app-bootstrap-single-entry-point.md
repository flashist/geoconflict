# Task — App Bootstrap: Single Explicit Entry Point

## Sprint
Sprint 4

## Priority
High (foundational infrastructure). De-risks every future external-SDK integration — including the citizenship auth and Yandex payments work this sprint is built around. Not blocking a shipped feature today, but it removes the race-condition class that those integrations would otherwise keep hitting. **Investigation is complete and the design is agreed with Mark — this scopes directly to implementation, no investigation-first pass needed.**

## Experiments
❌ Excluded — infrastructure refactor, ships to all players. No A/B.

## Scope
`src/client/` bootstrap path only. **No `src/core/` (game-logic) changes.**

---

## Authoritative design

The full findings, verified production behaviour, locked decisions, proposed design, and verification plan live in:

> `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md` (2026-06-12)

**Read that document first — it is the spec.** This brief defines the task boundary, the locked decisions, analytics requirements, and acceptance criteria. It does not restate the design; §4 of the findings doc is authoritative for *how*.

---

## Problem (one paragraph)

The client has no single explicit starting point. Component initialization order is *emergent* — a side effect of webpack import order, HTML template contents, and when custom elements upgrade — rather than an explicit sequence. External-SDK init (Yandex SDK, experiment flags, player data, language) races against component creation, held together by scattered per-component gates. `FlashistFacade` (owner of all SDK/analytics/session boot) is a lazy singleton whose construction timing is unpredictable — live prod instrumentation showed it constructed during `email-subscribe-modal` upgrade at t≈305ms, a third answer that disagreed with both static analyses. Every new SDK integration increases race-bug risk from innocent refactors.

**Goal:** one explicit bootstrap sequence that finishes all SDK/flags/user/language work *before* any component code runs, with a bounded wait and a defined failure policy. Ordering becomes **structural, not conventional** — components can't race the init because their code hasn't evaluated yet.

---

## Locked decisions (agreed with Mark 2026-06-12 — do not re-open)

1. **Failure policy = degraded mode.** On SDK init failure/timeout: proceed with default flags, localStorage username, `navigator.language`, no ads (the path standalone `index.html` already exercises), plus a new analytics event so frequency is measurable. No error/retry screen, no infinite blocking.
2. **Blocking set stays as-is:** SDK init → (player data ∥ experiment flags) → language. No reserved slot for future citizenship auth — a correct gate makes adding a blocking step a one-line change later.
3. **FlashistFacade init splits in two:** Part 1 (immediate, synchronous, no waiting) = analytics init, device/platform info, session tracking, `Session:Start`. Part 2 (async, gated, bounded) = Yandex SDK init, user data, experiment flags, language. The gate blocks on Part 2 only. The current constructor already has this seam (`FlashistFacade.ts:308-394` is Part 1; `:305-306` + `:396` kick off Part 2) — mostly a mechanical extraction.
4. **One PR.** Split into two only if it proves too problematic.
5. **`index.html` (standalone) stays viable** for a future Yandex-independent version — it is just the degraded path taken instantly.
6. **No DI/context refactor.** Singleton stays; the bootstrap just makes its construction explicit and ordering guaranteed.

---

## What to build (summary — §4 of findings doc is authoritative)

- **New `bootstrap.ts` webpack entry** (replaces `Main.ts` as the entry at `webpack.config.js:179`), with three phases: Phase 1 synchronous analytics/session block; Phase 2 the bounded async gate (single ~5s named-constant deadline, degraded-mode on expiry/rejection); Phase 3 `await import("./Main")` so all components upgrade with every init guarantee already settled, then direct `Client.initialize()` (no `DOMContentLoaded` listener).
- **FlashistFacade restructure:** cheap constructor; explicit two-part `initialize()` called by bootstrap; lazy `.instance` getter stays for compatibility; `flashist_waitGameInitComplete` becomes an alias for the bootstrap gate promise (no DOM dereference, no `lang-selector` coupling). The `window.flashist_waitGameInitComplete` global is **kept** — the yandex template's inline load handler depends on it.
- **LangSelector simplification:** language *code* is SDK-gated, translations are bundled; Phase 2 resolves the code and `LangSelector` consumes it. Delete the `langReadyPromise` latch machinery. Kills the `translateText` raw-key flash.
- **Templates (both `index.html` and `yandex-games_iframe.html`, kept in sync):** `sdk.js` switches from parse-blocking sync script to `async` + explicit readiness promise (required for degraded mode to be complete). Inline load handler contract unchanged.
- **Gotcha — `yandex-games_iframe-parent.html` must get a `chunks: []` exclusion** in its `HtmlWebpackPlugin` instance. Today it harmlessly receives the full bundle but never constructs the facade (no custom tags). With an *explicit* bootstrap it would **double-fire `Session:Start` and SDK init** — this is a real bug introduced by the refactor if missed.
- **Known fallout to handle in the same PR:** `DOMContentLoaded` listener → direct call; per-component re-gates (`PublicLobby`, `CitizenshipCard`) become awaits on an already-resolved promise; fire-once `userMeResponse` dispatch ordering; `instanceof`/`querySelector` hard-throws in `Client.initialize` that assumed upgrade-before-DOMContentLoaded; existing `flashist-preload` overlay stays up during the gate (no new blank screen).

---

## Analytics (shipping gate)

- **New event — degraded-mode boot.** Add to the `flashistConstants.analyticEvents` enum in `src/client/flashist/FlashistFacade.ts` (never inline the string) **and** to `ai-agents/knowledge-base/analytics-event-reference.md`. Follow the `Category:Action`/`Category:Subcategory:Value` PascalCase convention. Fires when the gate resolves into degraded mode (SDK absent / timeout / rejection) so frequency is measurable in production.
- The existing 1s `YANDEX_SDK_INIT_TIMEOUT_MS` keeps its **analytics-only** role (selecting which login-status event fires) — it is not the gate.
- **Post-release funnel watch (call out in the release):** `Session:Start` timing moves slightly earlier and becomes deterministic; the relationship of `Player:Yandex:*` login-status events to the 1s window may shift. These are expected — verify they shifted as predicted, not silently broke.

---

## Out of scope — separate bugs (do NOT bundle; §2.6 of findings doc)

Discovered during the investigation, **not** fixed by this refactor. Each is its own task:
1. Dead `initializeFuseTag` polling loop (`Main.ts:950-970`) — perpetual 100ms timer; fuse.js is commented out in both templates.
2. `GutterAds.hide()` permanently unsubscribing from `userMeResponse` after first call.
3. (Optional) in-flight dedup for `getServerConfigFromClient` (`src/core/configuration/ConfigLoader.ts:29-33`).
4. (Optional, re-check after this lands) `userMeResponse` replay-for-late-subscribers.

> Producer note: items 1–2 are confirmed standalone bugs. I have **not** created tasks for them yet — see the message that accompanied this brief. Item 3 touches `src/core/` (would require tests per project rule); item 4 may be absorbed by this task — re-evaluate after the bootstrap lands.

---

## Verification (§5 of findings doc)

1. `npm run dev` + Playwright: assert full boot order — Phase 1 analytics → gate → component upgrades → `Client.initialize` → preload removal / `LoadingAPI.ready()`.
2. **Degraded path:** simulate SDK absence (standalone `index.html`) and SDK hang (block `sdk.js`). App must boot within the deadline with fallbacks active and the new degraded-mode analytics event fired.
3. **Yandex iframe path on dev:** normal boot — language from SDK, flags loaded, username from SDK.
4. Confirm `yandex-games_iframe-parent.html` no longer evaluates the app bundle (no double `Session:Start`).
5. Both HTML templates updated in sync; `npm test`; `npm run lint`.
6. **Production analytics verification (shipping gate):** after deploy, confirm the boot-order analytics fire as designed, the degraded-mode event appears at a plausible rate, and the `Session:Start` / `Player:Yandex:*` funnel shifts match the predictions above — not a regression.

---

## Notes

- **Production-risk: this is the critical boot path of the prod Yandex iframe (`geoconflict.ru`).** A boot regression = blank/permanent loading screen for all players. Verify the Yandex iframe path live (Playwright against a dev/staging Yandex context), not just standalone. **Weekend / low-traffic deploy.**
- **Both HTML templates must stay in sync** (`index.html` + `yandex-games_iframe.html`) — the yandex template is the one served in production.
- **Sequencing vs. citizenship UI:** `s4-citizenship-xp-progress-ui.md` (backlog) binds live data into `CitizenshipCard`, which currently re-implements the init gate (`CitizenshipCard.ts:42-71`). This refactor removes that re-gate. **Recommend landing this bootstrap task before — or in close coordination with — the citizenship XP live-data work** to avoid building the XP UI on a gating model that's about to change. Flag for Mark when sequencing the citizenship chain.
- Effort: meaningful — a single-PR refactor of the client boot path with live degraded-mode and Yandex-iframe verification. Not a quick win; scope it with room for careful live testing.
- Related system context: [[systems/flashist-init]], [[systems/localization]], [[systems/analytics]].
