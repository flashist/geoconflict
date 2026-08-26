# Review ledger — s4-citizenship-card-guest-cta-no-sdk

Task: ai-agents/tasks/done/0190-citizenship-card-guest-cta-no-sdk/brief.md
File(s) under review: src/client/CitizenshipCard.ts, tests/client/CitizenshipCard.test.ts
Status: closed-out

## Accepted residuals (do-not-re-litigate)

- **Degraded-mode CTA left dead (case c)** — What: when the Yandex SDK is present but `YaGames.init()` times out/rejects within Bootstrap's 5s deadline, `yaGamesAvailable` stays `true` (it's set before init settles), so the login CTA keeps rendering and silently no-ops when tapped. Why (structural): explicitly out of scope per this task's spec — the task's "Expected Behaviour" and "Notes" sections state degraded-mode (case c) UX is deliberately deferred to a dedicated follow-up task, since distinguishing (b) real-guest from (c) degraded needs new facade state (`isYandexDegraded()`) that this task didn't scope. Re-raise only if: the follow-up task is abandoned or reverted without another fix landing, or a regression reintroduces the dead-CTA behavior for case (a) standalone/no-SDK (which *is* this task's actual scope).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | Codex (C1): login CTA still shown and silently no-ops in degraded mode (case c) | CORRECT (independently traced via `FlashistFacade.ts:641,882-884`) | Accepted as residual — explicitly out of scope per task spec, tracked by the follow-up task `0049-degraded-mode-full-ux-treatment` (see PR 132 / `ai-agents/reviews/degraded-mode-full-ux-treatment.md`) |
| 1 | Claude: comment split awkwardly between ternary `:` and `nothing` (`CitizenshipCard.ts:187-189`) | CORRECT but trivial | No action — cosmetic, not worth a revision |
| 1 | Claude: unused synchronous-SDK-init fallback path in `yandexSdkInit()` (`FlashistFacade.ts:634-641`) could theoretically leave `yaGamesAvailable` stale under a hypothetical future third HTML template | CORRECT but not applicable | No action — pre-existing, not introduced by this diff, neither shipped template (`index.html`, `yandex-games_iframe.html`) exercises that path |

## Open / actionable

- (none)
