# Review — 0437

Task: ai-agents/tasks/done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md
File(s) under review: src/client/ExitConfirmModal.ts, src/client/MatchExit.ts, tests/client/ExitConfirm.test.ts, src/client/graphics/layers/GameRightSidebar.ts, src/client/graphics/layers/SettingsModal.ts, src/client/Main.ts, src/client/LangSelector.ts, src/client/index.html, src/client/yandex-games_iframe.html, resources/lang/en.json, resources/lang/ru.json, tests/client/LangSelectorRerender.test.ts (working tree, uncommitted)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex (`codex-cli 0.157.1`, exit 0) ran `tsc --noEmit` and targeted `eslint` (both exit 0; source-shape checks, not behaviour) and its Jest attempt died on sandbox `EPERM` before any test ran; reviewer ran the targeted suites (`npm test -- tests/client/ExitConfirm.test.ts tests/client/LangSelectorRerender.test.ts tests/client/NoNativeTooltips.test.ts` → 3 suites, 32 passed).

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1     | low | src/client/ExitConfirmModal.ts:143, :160; src/client/MatchExit.ts:13 | `hasLeft` is set before `leaveMatch()` awaits `showInterstitial()`, and is never reset. If the Yandex SDK never calls `onClose`/`onError` (promise never settles), both exit buttons become permanent no-ops for the rest of the session: `show()` returns early. Before 0437 a second sidebar tap re-called `showInterstitial()` (a retry path); now there is none, and the Settings exit, which used to navigate with no ad, inherits the same dependency. Probability unmeasured (depends on SDK behaviour); no test covers a never-settling ad. Fix direction (coder's call): bound the wait, or let `show()` re-arm once the ad is known stuck — not "drop the once-only guard". |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT — verified: `onLeaveTap` sets `hasLeft` before calling `onLeave`, `leaveMatch()` awaits `showInterstitial()`, whose promise settles only on the SDK's `onClose`/`onError` (or the no-SDK / paid-citizen early returns); `show()` returns early once `hasLeft` is set, for both buttons. Before 0437 the sidebar had no guard, so a second tap called the ad again. Own severity: low — needs an SDK that never calls back; unmeasured. | Frontier — the once-only guard (no double exit) is bought at the cost of no retry if the ad never returns; owner accepted the risk. | none — no code change (owner ruling 2026-10-11, recorded under Accepted residuals). | won't fix (frontier) |

## Accepted residuals (shared, do-not-re-litigate)
- **Exit stuck if the ad never returns (R1)** — What: after the first Выйти/Leave, the exit popup never reopens; if the Yandex SDK never calls back from the interstitial, both exit buttons do nothing for the rest of the session (before 0437 a second sidebar tap retried the ad). · Why (structural): the once-only guard is what stops a double tap running the exit twice; a timeout or re-arm would add a second path for an SDK failure nobody has seen. Owner ruling, live AskUserQuestion in the fkit lead session, 2026-10-11, verbatim: "Accept the risk" — "Record it as a known limit. We revisit only if a player is seen stuck after pressing Выйти." · Re-raise only if: a player is seen stuck after pressing Выйти (or the SDK is shown to leave `showFullscreenAdv` without calling back).
