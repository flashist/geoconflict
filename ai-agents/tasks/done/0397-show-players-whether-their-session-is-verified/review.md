# Review — 0397

Task: ai-agents/tasks/done/0397-show-players-whether-their-session-is-verified/brief.md
File(s) under review: src/client/PlayerProfileView.ts, src/client/CitizenshipStatus.ts, src/client/CitizenshipNotice.ts (new), src/client/ProfileReadRestart.ts (new), src/client/StartScreenPresence.ts, src/client/flashist/FlashistFacade.ts, src/client/CitizenshipCard.ts, src/client/ProfileSession.ts (comment), src/client/GameRestart.ts (comment), resources/lang/en.json, resources/lang/ru.json, ai-agents/knowledge-base/analytics-event-reference.md, tests/client/{CitizenshipCard,CitizenshipStatus,PlayerProfileView,FlashistFacade,StartScreenPresence,CitizenshipNotice,ProfileReadRestart,CitizenshipStatusLang}.test.ts — uncommitted working tree vs HEAD (`91eb99a`)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a usable findings list, but measured nothing (its `npx jest` attempt was blocked by the read-only sandbox, `EPERM` on the haste-map temp write); the execution evidence is the reviewer's own (8 targeted client suites 397/397; `InboxRoutes` + `TenureGrantRoutes` re-run 3× at 82/82).

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low | src/client/ProfileReadRestart.ts:71 (with src/client/CitizenshipCard.ts:135, :144, :327) | The "Restart game" marker is removed only when `wasRestartedAfterProfileReadFailure()` runs, and that runs only from `currentNotice()` on an enabled card. If the load after a restart has the card killed or hidden by flags (and never revealed), the marker stays in sessionStorage. It then survives every later same-tab reload (every match exit reloads), so an unrelated failed read much later shows "Still not working…" with no recent restart. This breaks the plan's stated property: "removes it at once, so it can never carry past the next load". The worklog's *Decision log* item 5 notes this ("noted, not tested") but does not resolve it. Impact is wording only: both variants carry the same button, and nothing is granted or lost. Raised by both reviewers. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT (severity agreed: low — wording only, same button either way) | Defect | Consume the marker in `CitizenshipCard.connectedCallback()` as its first act, before the kill-switch return and the flag check, so every load reads and removes it whatever the card's state (memoized per page, so a late `0329` reveal on the same load still sees it). Realistic path is the flag-hidden card (degraded boot after the press); the kill-switch path needs a build flip between loads. Tests: `tests/client/CitizenshipCard.test.ts` — killed / flag-hidden next load consumes the marker and a later failed read says `read_failed` not `still_failing`; hidden-then-late-revealed on the same load still says `still_failing`. Mutation (fix removed) → 3 red. | ✅ done |

### Coder round-1 summary
- Suppressed-as-settled (reviewer's call, not re-opened): **X1** — settled by plan § *Edge cases and risks*; its "restart UI" half disproven by the reviewer.
- Reviewer observation (no row) — `Citizenship:Status:Unverified` / `ReadFailed` fire from `refreshProfile()` whether or not the card is on screen (unlike `Citizenship:Seen`). **Not acted on:** it is exactly plan step 7 (`reportCitizenshipNoticeShown` in `refreshProfile()`); gating it on visibility is a behaviour change outside the plan. Candidate follow-up if the counts must mean "seen".
- Convergence: one genuine low defect, fixed in-plan; nothing re-litigated; **closed-out**.

## Accepted residuals (shared, do-not-re-litigate)
