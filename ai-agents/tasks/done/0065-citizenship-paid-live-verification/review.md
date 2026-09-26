# Review — 0065

Task: ai-agents/tasks/done/0065-citizenship-paid-live-verification/brief.md
File(s) under review: commit 3386b90 vs 68b8434 — src/client/flashist/FlashistFacade.ts, tests/client/CitizenshipCard.test.ts, ai-agents/tasks/backlog/0065-citizenship-paid-live-verification/worklog.md
Status: in-review
Coverage: reasoning-only second opinion — codex-cli 0.152.0, exit 0, usable pass ("no significant issues found"); Codex ran only source-text inspection (rg, nl, git diff/show/status) and ran no tests; the only execution evidence is the Claude reviewer's (8 citizenship client suites, 179/179 tests green on 3386b90)

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

Round 1 (2026-09-26): no findings. Every reader of the local flag was traced and is ANDed with the remote `citizenship_ui` flag, which fails closed on missing, erroring or timed-out `getFlags()`, on no SDK, and on degraded boot. The dev bypass is compile-time and resolves to `"prod"` in every Docker image. The new profile-server calls fire only for players whose remote flag reads `enabled`.

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)
- Real purchases unproven before launch — What: ship the flip before any real purchase is proven · Why (structural): owner ruling 2026-09-26, ship ASAP; the proof moves to 0297, which can only run after the flip · Re-raise only if: 0297 fails, or a real purchase misbehaves in prod.
- Paid state derivable from public profile — What: accepted until 0250 lands · Why (structural): owner-accepted, tracked as 0250, not a launch gate · Re-raise only if: 0250 is dropped or descoped.
- Tenure claim-on-behalf risk — What: accepted server-side risk until 0268 · Why (structural): owner-accepted, tracked as 0268 · Re-raise only if: 0268 is dropped, or abuse is observed.
- Kill switch does not stop server XP crediting — What: the `citizenship_ui` kill switch gates only client surfaces · Why (structural): crediting is server-side and has been live since W14, independent of the client flag · Re-raise only if: crediting is expected to be governed by the kill switch.
- Flag delivery in prod unproven — What: `citizenship_ui` delivery gets checked after deploy · Why (structural): 0238's probe was inconclusive and it can only be proven live · Re-raise only if: the post-deploy check shows the card is not visible.
