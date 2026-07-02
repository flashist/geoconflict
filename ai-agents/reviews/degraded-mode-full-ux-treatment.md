# Review ledger — degraded-mode-full-ux-treatment

Task: ai-agents/tasks/backlog/degraded-mode-full-ux-treatment.md
File(s) under review: src/client/CitizenshipCard.ts, src/client/flashist/FlashistFacade.ts, tests/client/CitizenshipCard.test.ts, resources/lang/en.json, resources/lang/ru.json
Status: in-review

## Accepted residuals (do-not-re-litigate)

- (none yet)

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | Codex (C1): citizenship card is hidden entirely in production degraded mode, so the new degraded-subtitle UX is unreachable | CORRECT → severity elevated to high (independently verified: `webpack.config.js:334` sets `GAME_ENV=prod` for real builds; `checkExperimentFlag()`/`loadExperimentFlags()` at `FlashistFacade.ts:787-806,719-731` require `yandexGamesSDK` to fetch flags; in degraded mode `yandexGamesSDK` is unset, so `isCitizenshipUiEnabled()` resolves `false` and `CitizenshipCard.connectedCallback()` (`CitizenshipCard.ts:55-60`) hides the whole card before `renderGuest()` runs) | **Open** — genuine defect, route to fix. Claude's independent pass missed this; Codex caught it. |
| 1 | Claude (Cl1): no direct unit test of `FlashistFacade.isYandexDegraded()`'s formula against real field values — `FlashistFacade.ts` has no dedicated test file, so the method is only exercised via a jest mock in `CitizenshipCard.test.ts` | CORRECT, non-blocking | Accepted as non-blocking suggestion — opportunistic follow-up (e.g. bundle with the C1 fix), not required for this PR to merge |

## Open / actionable

- **C1 — Degraded-mode citizenship card is fully hidden in production, so the new degraded-subtitle UX never renders.** `isCitizenshipUiEnabled()` (`FlashistFacade.ts:829-834`) → `checkExperimentFlag()` (`FlashistFacade.ts:787-806`) → `loadExperimentFlags()` (`FlashistFacade.ts:719-731`) requires `yandexGamesSDK` to call `getFlags()`; in degraded mode `yandexGamesSDK` is unset, so the flag resolves `false` and `CitizenshipCard.connectedCallback()` (`CitizenshipCard.ts:55-60`) adds `.hidden` and returns before `renderGuest()`'s new degraded branch can execute. The new test forces `isCitizenshipUiEnabled` to resolve `true`, so it doesn't catch this. Needs a fix — e.g. check `isYandexDegraded()` independently of/before the experiment-flag gate, so degraded sessions still reach the degraded-state render path. This directly undermines the task's stated priority rationale (must protect real players in the citizenship funnel from a dead-end state).
