# Worklog — 0054 Hide Citizenship Card Behind a Client Config Flag (Default OFF)

Coder: fkit-coder (Build worker, spawned by fkit-sprint-ship-loop under the declared-approval marker).
Plan approved by owner 2026-08-21 via AskUserQuestion relay through the lead session, no amendments.
Build executed 2026-08-21, exactly the approved `plan.md` scope. **Not committed** (hard rule).

## Changes

1. `src/client/flashist/FlashistFacade.ts` — new `features` block in `flashistConstants`
   (after `experiments`): `CITIZENSHIP_CARD_ENABLED: false`, commented as the 0017/0018 relaunch
   switch, distinct from the remote `citizenship_ui` experiment, no dev bypass (owner-ruled).
2. `src/client/CitizenshipCard.ts` — synchronous early gate at the top of `connectedCallback`,
   before `flashist_waitGameInitComplete()`: flag off → `classList.add("hidden")` + return. The
   existing init/degraded/experiment chain is byte-unchanged and runs only when the flag is on.
3. `tests/client/CitizenshipCard.test.ts` —
   - module mock's `flashistConstants` gains `features: { CITIZENSHIP_CARD_ENABLED: true }`
     (ON for existing suites), reset to `true` in `beforeEach` (plain field, `clearAllMocks`-proof);
   - new `describe("local CITIZENSHIP_CARD_ENABLED flag (task 0054)")`, 4 tests:
     flag-off baseline (nothing rendered, `hidden` set, no analytics / profile / experiment calls);
     flag-off + degraded-true still hidden (beats the 0049 carve-out);
     flag-off + experiment-true still hidden (experiment never consulted — covers the dev override);
     `jest.requireActual` guard asserting the **real** module's default is `false`
     (an accidental flipped-ON commit fails CI).

No other files touched. No template edits (verified unnecessary — component self-collapses),
no `en.json`/`ru.json` changes, no degraded-mode logic changes.

## Verification

| Step | Command / check | Result |
|---|---|---|
| Targeted tests | `npm test -- tests/client/CitizenshipCard.test.ts` | 20/20 pass (16 existing + 4 new) |
| Full suite | `npm test` | 88 suites / 698 tests, all pass |
| Lint | `npm run lint` | clean |
| Bundle freshness | served `main.js` grepped for the flag | `CITIZENSHIP_CARD_ENABLED: false` present (hot rebuild confirmed before visual checks) |
| Manual, `index.html`, flag OFF | Playwright vs running dev server (port 9000) | card `display:none` (`block hidden` → hidden wins), 0 client rects, empty render, **no layout gap** (screenshot), **no** `Citizenship:Seen` in console |
| Manual, `yandex-games_iframe.html`, flag OFF | same | identical: hidden, no gap, no citizenship analytics — **with the SDK actually failed** (`yandexGamesSDK: undefined`, `Player:YandexUnknown` logged), i.e. the live degraded scenario that used to show the dead-end card |
| Flip-ON smoke | constant → `true`, hot rebuild (new bundle hash), reload | card renders guest state ("Citizenship / Log in to save your progress"), `Citizenship:Seen` fires — today's behavior intact |
| Flip back OFF | constant → `false`; targeted suite re-run | 20/20 pass; `FlashistFacade.ts:160` confirmed `false` |

CSS risk from the plan (Tailwind `hidden` vs static `class="block"`) resolved live: `hidden` wins,
computed `display: none` on both templates.

Notes on the manual check: an `npm run dev` instance was already running (game server PID 16004 on
3001/3002, webpack dev-server PID 16022 on 9000); I reused it and proved bundle freshness by hash +
flag grep before trusting visuals. Verification screenshots/console logs kept out of the repo
(session scratchpad).

## Decision log (unattended-fix audit, ADR-019/ADR-032)

Standing approval scope: the owner-approved plan, relayed by the sprint-ship-loop driver.
- Fixes applied without asking: **none** — no review findings processed in this unit; all edits were
  the approved plan itself.
- Obvious-winner calls: **none.** (Reusing the already-running dev server instead of starting a new
  one, and moving my own verification artifacts to the scratchpad, are execution details inside the
  plan's manual-check step, not scope decisions.)

## Open items

- NEEDS-DECISION: none.
- Producer follow-up (from brief Notes, not this task's code): add the reciprocal flip-ON note to
  the 0017/0018 briefs.
- Not committed; not reviewed yet — next per loop: reviewer pass.
