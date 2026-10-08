# Review — 0417

Task: ai-agents/tasks/done/0417-citizenship-explainer-popup-use-more-width-on-larger-screens/brief.md
File(s) under review: src/client/CitizenshipExplainerModal.ts (`static styles` only — the `.modal-box` width rule and the four `.modal-box::-webkit-scrollbar*` rules; the 0408/0409 hunks in the same file are baseline, already reviewed and closed)
Status: closed-out
Coverage: reasoning-only second opinion — Codex ran (`codex-cli 0.157.1`, exit 0) and returned a usable "no significant issues found", but executed only source-text inspection (`nl -ba`, `git diff`); the execution evidence is the reviewer's own (the two explainer jest suites 127/127 pass, prettier and eslint clean on the file).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

Round 1 (2026-10-08): **no novel findings.** Both passes (reviewer + Codex) found the change sound. Checked and cleared, not recorded as rows: phone width unchanged (360px screen → `90vw` = 324px still wins over `width: 600px`); the four scrollbar rules match `src/client/styles.css:22-38` value for value; nothing in `src/` sets `scrollbar-color` (an inherited property that would cross into the shadow DOM and switch the `::-webkit-scrollbar` rules off in Chromium), so the comment's warning holds and the rules take effect; stacking order (`z-index: 10000`) untouched.

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

Round 1 (2026-10-08, fkit-coder as `fkit-sprint-ship-loop` Process-review worker): **no rows — no findings to answer**, so nothing is `pending approval` and no code changed.
- Step 0: the four *Accepted residuals* each trace to an owner answer or the approved plan (`plan.md` blob `b40003529d30e9442939d0c618001abd66ba8d70`, re-hashed unchanged): 600 px cap → owner Q1 (worklog § Plan-gate record, "600 px"); full-width buttons → plan § Edge cases "Capping button width is a separate design call, not taken here" and § Out of scope "button widths"; no Firefox scrollbar styling → plan § Change item 2 "Deliberately **no** `scrollbar-color`/`scrollbar-width`" (owner Q3 "Yes, fix it here" chose the scoped-rule fix) and § Out of scope "Firefox's scrollbar look"; no automated width test → plan § Tests and checks item 1. No ADR in `ai-agents/knowledge-base/decisions/` covers this popup's layout or scrollbar.
- Spot-checked the reviewer's clearances against the code: the four `.modal-box::-webkit-scrollbar*` rules equal `src/client/styles.css:22-38` value for value; the only `scrollbar-*` property in `src/` is `scrollbar-width: none` on the opt-in `.hide-scrollbar` class (`styles.css:41`, not inherited), so nothing switches the copied rules off; `max-width: 90vw` still bounds the box at phone widths.
- Convergence: no new defects, no re-litigation → closeout. Header `Status:` set to `closed-out`.

## Accepted residuals (shared, do-not-re-litigate)
- 600 px cap — What: `.modal-box` `width: 600px`, `max-width: 90vw` · Why (structural): owner answer Q1 at the plan gate (worklog § Plan-gate record), roughly 70–75 characters a line at 14 px; wider hurts reading, narrower keeps the phone-box look · Re-raise only if: the owner asks for a different width, or the live Yandex iframe check shows the box clipped or overflowing.
- Full-width buttons — What: buttons stay `width: 100%` (~552 px at the cap) · Why (structural): owner-settled out of scope for this task; capping button width is a separate design call · Re-raise only if: the owner asks for it.
- No Firefox scrollbar styling — What: no `scrollbar-color` / `scrollbar-width`; Firefox keeps its default scrollbar, same as the rest of the app · Why (structural): in current Chromium those properties turn the `::-webkit-scrollbar` rules off · Re-raise only if: the app-wide scrollbar approach changes, or Chromium changes that behaviour.
- No automated width test — What: no jest test for the width · Why (structural): jsdom does no layout, so a test could only check CSS text; the width is proven by the worklog's Playwright measurements · Re-raise only if: a layout-capable test runner is added to the project.
