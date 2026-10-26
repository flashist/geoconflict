# Review — 0507

Task: ai-agents/tasks/done/0507-one-player-message-popup-at-game-start-contact-links-for-a-targeted-player/brief.md
File(s) under review: src/client/PlayerMessage.ts (new), src/client/PlayerMessageModal.ts (new), src/client/flashist/FlashistFacade.ts, src/client/Main.ts, src/client/PreStartModals.ts, src/client/index.html, src/client/yandex-games_iframe.html, resources/lang/en.json, resources/lang/ru.json, ai-agents/knowledge-base/analytics-event-reference.md, tests/client/PlayerMessage.test.ts (new), tests/client/PlayerMessageModal.test.ts (new), tests/client/FlashistFacade.test.ts (0507 block only) — working tree vs HEAD, 0507 hunks only
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex (codex-cli 0.157.1, exit 0) ran and reasoned over the diff; it executed `tsc --noEmit` (passed — a type check, not a measurement) and its jest run was blocked by the read-only sandbox (EPERM on jest's haste-map cache). The reviewer's own leg measured: targeted jest (PlayerMessage, PlayerMessageModal, FlashistFacade, PreStartModals — 4 suites, 147 tests, green), eslint (clean), prettier --check on the new/changed code and lang files (clean).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | src/client/Main.ts:1276 (`void startPlayerMessage()`), with Main.ts:409 / Main.ts:1017-1025 | On a load where the tutorial auto-launches, the presence source (`gameStop !== null` + `beginJoiningLobby`) still reads "on the start screen" while `dispatchTutorialJoin` awaits `fetchCosmetics()` (only `tutorialStarting` marks that window, and the presence source does not read it). The flag read resolves first (flags already settled at boot), so a targeted player with no tutorial-completed marker gets the popup for a moment, `PlayerMessage:Shown` is logged, then the match start closes it via `closePreStartModals()`. The popup comes back on the next load, so nothing is lost but one over-counted Shown. Inherited from the shared StartScreenPresence seam (0404's popup has the same window). |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)

- R1 tutorial-start popup flash (0507) — What: on a page load where the tutorial starts by itself, the 0507 popup can appear for a moment while the tutorial loads (`dispatchTutorialJoin` waits on `fetchCosmetics()`), log one `PlayerMessage:Shown`, and then be closed by the match start (`closePreStartModals()`). It shows again on the next load. Kept as built. · Why (structural): the popup uses the shared start-screen check (`StartScreenPresence`: `gameStop !== null` plus `beginJoiningLobby`), which does not count Main's `tutorialStarting` window as away. The 0404 refresh popup has the same gap. Fixing it means changing that shared check, which would change what every start-screen popup sees. That is a larger change than this edge case is worth: it needs a targeted player with no tutorial-completed marker, the player loses nothing, and the only cost is one over-counted Shown. Owner ruling 2026-10-26 (AskUserQuestion, fkit-lead session, relayed): "Accept it (Recommended)": "Record as a known small gap; 0507 can close. Knock-on: none (checked)." Rejected: change the shared check in 0507. · Re-raise only if: the shared start-screen check changes; or the popup is used for a message that must not be missed or must be counted exactly; or Shown counts are used for a decision where one extra count matters.

## Owner dispositions (round 1, recorded by the reviewer)
- X1 suggestion (Codex: test that `closePreStartModals()` hides `<player-message-modal>`) — **declined by the owner**, 2026-10-26: "Skip it (Recommended)": "It works today; close 0507 now." Not a finding row. Do not re-raise as a suggestion unless `PRE_START_MODAL_TAGS` or `closePreStartModals()` changes.
- Closed out by the reviewer on the owner's ruling (phase 2, 2026-10-26). R1 has no *Coder response* row; that section is the coder's, and the reviewer left it as it was.
