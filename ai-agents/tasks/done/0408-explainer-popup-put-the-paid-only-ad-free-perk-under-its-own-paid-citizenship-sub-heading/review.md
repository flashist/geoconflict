# Review — 0408

Task: ai-agents/tasks/done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md
File(s) under review: src/client/CitizenshipExplainerModal.ts, resources/lang/en.json, resources/lang/ru.json, tests/client/CitizenshipExplainerLang.test.ts, tests/client/CitizenshipExplainerModal.test.ts (working tree vs HEAD; the tree's `nginx.conf` / shell-harness / sprint-doc changes belong to other tasks and were not reviewed)
Status: closed-out
Coverage: reasoning-only second opinion — Round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a usable 2-finding pass, but executed only source-reading commands (`git diff`, `rg`, `nl`/`sed`), so it measured nothing; the execution evidence is the Claude reviewer's (both scoped suites 112/112 green, eslint exit 0, prettier --check clean).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | tests/client/CitizenshipExplainerLang.test.ts:95 | Optional test hardening, not a behaviour defect. Only RU `paid_only_title` is pinned to an exact string; the owner also fixed EN (`Paid citizenship only:`, plan gate 2026-10-08), but EN is covered only by non-empty / placeholder-parity / RU≠EN checks, so an EN rewording would pass silently. Raised by Codex; verified. |
| R2 | 1     | low  | tests/client/CitizenshipExplainerLang.test.ts:103 | Optional test hardening, not a behaviour defect. The "suffix dropped" test rejects only the old phrasing (`for bought citizenship only` / `только для купленного`); a re-added suffix in new words (e.g. `— только для платного гражданства`) would pass. Pinning both `benefit_no_ads` values to the owner-approved strings would close it. Raised by both (Codex X2; same observation in the Claude pass); verified. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (test gap; severity low: test-only, no player-visible behaviour, the shipped EN string is already right) | Extended the exact-pin test to EN too: `paid_only_title` must be exactly `Paid citizenship only:` (owner answer, 2026-10-08) beside the existing RU pin. Mutation check: EN reworded → test red; restored. Scoped suites 112/112, lint exit 0. Applied under the sprint loop's standing plan approval (in plan §Tests, mechanical, localized). | ✅ done |
| R2 | CORRECT | Defect (test gap; severity low: test-only, both shipped strings already right) | Replaced the "old suffix absent" negative check with exact pins of both `benefit_no_ads` values to the owner-approved text (EN `No full-screen ads before and after matches`, RU `Без полноэкранной рекламы перед матчами и после них`); strictly stronger than the old check. Mutation check: RU suffix re-added in new words (`— только для платного гражданства`, which the old test passed) → test red; restored. Scoped suites 112/112, lint exit 0. Same authority as R1. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
