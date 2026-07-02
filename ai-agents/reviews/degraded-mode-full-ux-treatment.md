# Review ledger — degraded-mode-full-ux-treatment

Task: ai-agents/tasks/backlog/degraded-mode-full-ux-treatment.md
File(s) under review: src/client/CitizenshipCard.ts, src/client/flashist/FlashistFacade.ts, tests/client/CitizenshipCard.test.ts, tests/client/FlashistFacade.test.ts, resources/lang/en.json, resources/lang/ru.json
Status: in-review (round 1 findings resolved; awaiting re-review or closeout)

## Accepted residuals (do-not-re-litigate)

- **Degraded sessions bypass the `citizenship_ui` experiment gate.** `CitizenshipCard.connectedCallback()` treats `isYandexDegraded()` as enabled without consulting the flag, because in degraded mode `getFlags()` cannot run (needs the SDK) and the flag is unknowable — the alternative was a silently missing surface in production degraded mode (finding C1). *Cost accepted:* users outside the experiment rollout can see the degraded card during (rare) degraded sessions, and `Citizenship:Seen` can fire for them. *Re-raise only if:* `citizenship_ui` becomes a measured A/B where degraded-session exposure contaminates results, or `Session:PlatformInitTimeout` volume turns out non-trivial (which would also justify the cached-flag variant considered and rejected as over-engineering on 2026-07-02).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | Codex (C1): citizenship card is hidden entirely in production degraded mode, so the new degraded-subtitle UX is unreachable | CORRECT → severity elevated to high (independently verified: `webpack.config.js:334` sets `GAME_ENV=prod` for real builds; `checkExperimentFlag()`/`loadExperimentFlags()` at `FlashistFacade.ts:787-806,719-731` require `yandexGamesSDK` to fetch flags; in degraded mode `yandexGamesSDK` is unset, so `isCitizenshipUiEnabled()` resolves `false` and `CitizenshipCard.connectedCallback()` (`CitizenshipCard.ts:55-60`) hides the whole card before `renderGuest()` runs) | **Open** — genuine defect, route to fix. Claude's independent pass missed this; Codex caught it. |
| 1 | Claude (Cl1): no direct unit test of `FlashistFacade.isYandexDegraded()`'s formula against real field values — `FlashistFacade.ts` has no dedicated test file, so the method is only exercised via a jest mock in `CitizenshipCard.test.ts` | CORRECT, non-blocking | Accepted as non-blocking suggestion — opportunistic follow-up (e.g. bundle with the C1 fix), not required for this PR to merge |
| 1 | C1 resolution (process-review pass, 2026-07-02) | CORRECT re-confirmed by second independent trace; **severity record corrected**: the same flag gate also means the pre-existing dead CTA never rendered in production degraded mode (card was fully hidden), so C1 is "shipped feature is a prod no-op", not a player-facing regression. Fixing it is what gives this task any production effect. | **Fixed** (user-approved option: bypass flag when degraded). `CitizenshipCard.connectedCallback()` now computes `enabled = isYandexDegraded() || await isCitizenshipUiEnabled()`. Regression test added: `CitizenshipCard.test.ts` "shows the degraded card even when the flag cannot be read (degraded mode)" (flag mocked false + degraded true → card renders degraded state). Tradeoff recorded under Accepted residuals. |
| 1 | Cl1 resolution (process-review pass, 2026-07-02) | — | **Closed** (user opted to bundle). Added `tests/client/FlashistFacade.test.ts`: direct truth-table test of `isYandexDegraded()` on a bare `Object.create(FlashistFacade.prototype)` instance (constructor side effects avoided). |

## Open / actionable

- (none)
