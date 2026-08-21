# Review — 0054-hide-citizenship-card-behind-client-flag

Task: ai-agents/tasks/done/0054-hide-citizenship-card-behind-client-flag/brief.md
File(s) under review: src/client/flashist/FlashistFacade.ts (features block), src/client/CitizenshipCard.ts, tests/client/CitizenshipCard.test.ts (working tree vs 0beb899)
Status: closed-out (Round 1: zero findings from both reviewers — nothing for the coder or owner to dispose)

## Reviewer findings

Round 1 (2026-08-21, fkit-reviewer): **both passes ran to completion — own pass + Codex adversarial
pass (`codex exec --sandbox read-only`, exit 0, full coverage). Zero findings.** No defects, no
frontier-moves to record. One non-recorded nit (not a finding): the third flag-off test's
`isCitizenshipUiEnabled.mockResolvedValue(true)` line duplicates the `beforeEach` default —
harmless, documentational.

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)

- Config-flag mechanism in flashistConstants — What: local compile-time flag `features.CITIZENSHIP_CARD_ENABLED` in `flashistConstants`, not env var / remote flag / template removal · Why (structural): owner-ruled 2026-08-21; relaunch is a one-line flip; rejected alternatives: hard-hide in code, show-only-when-backend-up · Re-raise only if: the flag mechanism itself breaks (e.g. bundling makes the constant unreadable at gate time).
- Default OFF everywhere including dev — What: no `GAME_ENV === "dev"` bypass for this flag; devs on 0017/0018 flip the constant locally · Why (structural): owner-ruled 2026-08-21 · Re-raise only if: owner reopens the dev-experience question.
- Smallest shippable unit — What: no template edits, no en.json/ru.json changes, no degraded-mode (0049) logic changes; 0049 code stays intact behind the gate · Why (structural): owner-ruled 2026-08-21; degraded treatment becomes reachable again at relaunch · Re-raise only if: the untouched code is shown to misbehave once the flag is ON.
