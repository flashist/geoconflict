# Plan — 0054 Hide Citizenship Card Behind a Client Config Flag (Default OFF)

Status: awaiting owner approval (orchestrated plan gate, ADR-031). No source written.
Planned by: fkit-coder (spawned by fkit-sprint-ship-loop), 2026-08-21.

## Verified code facts (checked against working tree, not taken from the brief)

- `src/client/CitizenshipCard.ts` `connectedCallback` (lines 51–78): gate is
  `enabled = FlashistFacade.instance.isYandexDegraded() || (await FlashistFacade.instance.isCitizenshipUiEnabled())`,
  runs inside `flashist_waitGameInitComplete().then(...)`. Collapse path exists:
  `this.classList.add("hidden")` + `render()` returns `nothing` while `!this.isEnabled`. ✔ matches brief.
- `src/client/flashist/FlashistFacade.ts`: `flashistConstants` (line 15) has `experiments` (140–152,
  incl. `CITIZENSHIP_UI_FLAG_NAME`) and `ads` (154–161) blocks; no `features` block yet.
  `checkExperimentFlag` (815–834) returns `true` unconditionally when `process.env.GAME_ENV === "dev"`. ✔ matches brief.
- Static `<citizenship-card class="block">` in both templates: `src/client/index.html:191`,
  `src/client/yandex-games_iframe.html:301`. ✔ matches brief.
- `tests/client/CitizenshipCard.test.ts` exists; it mocks the whole FlashistFacade module (incl.
  `flashistConstants` with only `analyticEvents` + `uiElementIds`) — the mock must gain the new
  constant or the component import breaks at flag-read time.
- Only other `citizenship-card` reference: `src/client/LangSelector.ts:245` (i18n re-render list —
  triggers `requestUpdate`; safe, `render()` returns `nothing` when disabled). No external callers of
  `maybeReportSeen`.

## Files to touch (3 — no template edits, no en/ru edits)

### 1. `src/client/flashist/FlashistFacade.ts`
Add a `features` block to `flashistConstants` (after `experiments`, matching its style):

```ts
features: {
  // Local compile-time gate for the start-screen citizenship card (task 0054).
  // Default OFF until citizenship ships (0017/0018) — flipping this to true IS
  // the relaunch. Distinct from the remote "citizenship_ui" Yandex experiment
  // flag above: this local flag is checked first and absolutely, including in
  // dev (no GAME_ENV bypass — owner-ruled 2026-08-21).
  CITIZENSHIP_CARD_ENABLED: false,
},
```

### 2. `src/client/CitizenshipCard.ts`
Synchronous early gate at the top of `connectedCallback`, before `flashist_waitGameInitComplete()`:

```ts
connectedCallback() {
  super.connectedCallback();
  // Local absolute gate (task 0054): while citizenship is unlaunched the card
  // must not exist — this beats the degraded-mode carve-out and the dev
  // experiment-flag override below, and skips analytics and profile loads.
  if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED) {
    this.classList.add("hidden");
    return;
  }
  flashist_waitGameInitComplete()... // existing chain, byte-unchanged
}
```

Why this placement wins every requirement at once:
- Flag OFF ⇒ the whole `.then` chain never runs ⇒ no degraded carve-out, no experiment check (so the
  `GAME_ENV === "dev"` true-override is moot), no `maybeReportSeen` (no `CITIZENSHIP_SURFACE_SEEN`),
  no `loadPlayerProfileView` call. `isEnabled` stays `false` ⇒ `render()` returns `nothing`;
  `hidden` collapses the host (same collapse path 0049 uses).
- Flag ON ⇒ code path is byte-identical to today (degraded carve-out, dev override, guest CTA, XP —
  all unchanged). 0049 logic untouched, merely behind the gate.
- Synchronous check ⇒ hidden immediately at connect, no flash before platform init resolves.
- Idempotent on reconnect (`classList.add` repeats safely).

### 3. `tests/client/CitizenshipCard.test.ts`
- Extend the module mock's `flashistConstants` with `features: { CITIZENSHIP_CARD_ENABLED: true }`
  (ON in tests so every existing case keeps exercising current behavior), and reset it to `true` in
  `beforeEach` (plain property — `clearAllMocks` won't restore it).
- New `describe("local CITIZENSHIP_CARD_ENABLED flag")`:
  1. Flag OFF ⇒ renders nothing, `hidden` class present, `flashist_logEventAnalytics` not called,
     `loadPlayerProfileView` not called, `isCitizenshipUiEnabled` not called.
  2. Flag OFF **+ `isYandexDegraded` true** ⇒ still hidden — proves the flag beats the 0049
     degraded carve-out (the key 0049-interaction case).
  3. Flag OFF + experiment flag resolving true ⇒ still hidden (covers the dev-override-equivalent
     path: the experiment result is never consulted).
- Guard the real default: a small assertion via
  `jest.requireActual("../../src/client/flashist/FlashistFacade").flashistConstants.features.CITIZENSHIP_CARD_ENABLED === false`
  so an accidental flipped-ON commit fails CI. The real module is already jsdom-importable
  (`tests/client/FlashistFacade.test.ts` imports it); if `requireActual` inside this mocked test file
  proves side-effect-noisy, move that one assertion into `tests/client/FlashistFacade.test.ts` instead.

## Sequencing

1. Add the constant (file 1). 2. Add the gate (file 2). 3. Update tests (file 3).
4. `npm test -- tests/client/CitizenshipCard.test.ts`, then full `npm test`, `npm run lint`.
5. Manual: `npm run dev` — flag OFF: no card, no layout gap, no `Citizenship:Seen` in the dev
   analytics console log, on **both** entry templates (standalone `index.html` and
   `yandex-games_iframe.html` — the production one). Flip ON locally: card appears populated (dev
   override), behavior identical to today. Flip back OFF before hand-off.

## Edge cases and risks

- **0049 degraded interaction** (the named one): flag check precedes the degraded carve-out, so a
  degraded SDK with flag OFF shows nothing — exactly the shipped defect being fixed. Degraded
  treatment code is untouched and becomes reachable only once the flag is ON (brief's Notes intent).
  Covered by new test 2.
- **Tailwind `hidden` vs the templates' static `class="block"`**: jsdom can't prove `display:none`
  wins; the 0049 collapse path relies on it already, but today's prod always takes the degraded
  show-branch, so the collapse has less live mileage than it looks. The manual dev check on both
  templates (step 5) is the real verification — called out so it isn't skipped as a formality.
- **`maybeReportSeen` re-entry**: public method, but no external callers exist (grep-verified); with
  the flag OFF the seen-event is unreachable (chain never runs + `hidden` ⇒ `isCardVisible()` false
  in real browsers). No extra guard added — minimal diff.
- **LangSelector i18n refresh** touches `citizenship-card`: at most a `requestUpdate`; `render()`
  returns `nothing` while disabled. No change needed.
- **Test-mock coupling**: forgetting the mock's `features` block would throw at the new flag read in
  every existing test — caught immediately by step 4's targeted run.
- **Flip-ON coupling** (not this task's code): 0017/0018 launch must flip the constant — recorded in
  the brief's Notes; producer follow-up owns adding the reciprocal note to those briefs.

## Out of scope (per brief + owner rulings)

Citizenship features, profile API, degraded-mode logic, remote `citizenship_ui` experiment flag,
`en.json`/`ru.json`, HTML templates (verified: no edit needed — component self-collapses).

## Open questions for the owner

None. The 2026-08-21 rulings (mechanism, default OFF incl. dev, ship-now, scope) cover every
decision point this plan needed.
