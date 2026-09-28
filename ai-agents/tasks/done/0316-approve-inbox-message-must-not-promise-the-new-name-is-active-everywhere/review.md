# Review — 0316

Task: ai-agents/tasks/done/0316-approve-inbox-message-must-not-promise-the-new-name-is-active-everywhere/brief.md
File(s) under review: resources/lang/en.json (only `inbox.templates.name_change_approved.body`), resources/lang/ru.json (same key only), tests/client/NameChangeLang.test.ts (the `intl-messageformat` import and the describe block "the name_change_approved note (task 0316)") — working tree vs HEAD. Other uncommitted hunks in these files belong to 0311/0314/0250/0303 and are out of scope.
Status: closed-out — round 1 found nothing, so the coder has nothing to answer. The by-eye check (brief verification 4) was NOT done: it is owed by the owner after the next client deploy. The reviewer's question about it was not put to the owner; the lead routed the close as agent-closed, per the 0311/0303 practice.
Coverage: both reviewers measured — Codex (`codex-cli 0.157.1`, exit 0) ran a `node` script that parsed both lang files and rendered the en and ru bodies through `IntlMessageFormat` (`Your new display name 'Test' has been approved.` / `Ваше новое имя «Test» одобрено.`); the Claude reviewer ran the two lang jest suites (2 suites, 63 tests pass) and rendered the single-apostrophe mutant (it shows the raw `{name}`, which the new pin and render tests reject).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| —  | 1     | —    | —        | Round 1: no findings. Text is exact to owner ruling Q1 (option C, title unchanged); en ICU `''{name}''` renders `'Name'`; ru `«{name}»` renders; only en/ru define the key; old text appears nowhere except the new negative assertions; test block pins exact copy, rejects the old wording, and renders both locales. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)
- Wording of the approved note — What: option C, en `Your new display name ''{name}'' has been approved.` / ru `Ваше новое имя «{name}» одобрено.`, title unchanged · Why (structural): owner ruling Q1 2026-09-28 (plan.md § Owner rulings); never goes stale across 0321/0322; options A/B and "for now only on your card" rejected there · Re-raise only if: 0322 ships (owner ruling Q2: one rewording then, owner approves the text).
