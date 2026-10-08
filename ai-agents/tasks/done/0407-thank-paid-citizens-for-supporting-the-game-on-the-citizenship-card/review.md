# Review — 0407

Task: ai-agents/tasks/done/0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md
File(s) under review: resources/lang/en.json (`citizenship_status.verified_paid` only), resources/lang/ru.json (`citizenship_status.verified_paid` only), tests/client/CitizenshipStatusLang.test.ts, tests/client/CitizenshipCard.test.ts (`describe("paid thank-you (task 0407)")` only), src/client/CitizenshipCard.ts (0407 comment hunks only), src/client/CitizenshipNotice.ts (comment only). Working tree vs HEAD. Out of scope: 0408/0409/0412/0416/0417 hunks in the same files.
Status: closed-out
Coverage: reasoning-only second opinion — Round 1: Codex ran (codex-cli 0.157.1, exit 0) and returned "no significant issues found in task 0407 scope", but executed only source-text inspection (rg, sed, nl, git diff), no tests. Execution evidence is the reviewer's: the four named suites run, 4/4 suites, 276/276 tests passed; both lang strings byte-compared equal to the brief's approved wording.

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low (nit, test strength — optional) | tests/client/CitizenshipCard.test.ts:2594 (`"%s: not shown"`, also :2601 guest, :2608 still checking) | The "not shown" cases assert only absence of the key, with no positive witness that the read landed and the expected state rendered (e.g. the `unverified` / `read_failed` line, or `getProfileVerificationStatus()`). Absence also passes if the card has not settled. Today they are not vacuous — the positive tests at :2573/:2581 use the same `appendCard` timing and pass, the coder's mutation 2 turned the earned-only case red, and the 0397 tests above already pin each of these states' own lines — so this is test hardening only, not a defect. No action required. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | PARTIALLY CORRECT | Defect (test strength only; severity low — no product behaviour affected, the suite already went red on mutation 2 in Build) | Correct for the `it.each` at tests/client/CitizenshipCard.test.ts:2594: only absence was asserted. Wrong for :2601 guest and :2608 still checking: those already carry a positive witness (`getProfileVerificationStatus()` is `"guest"`, and the default is `"unknown"` per src/client/CitizenshipStatus.ts:137; `checkingLine(card)` not null). Fix (test-only): verified earned-only split into its own test asserting status `"verified"` + no notice; the other three rows now carry the expected status and line (`unverified` → `citizenship_status.unverified` ×2, `read_failed` → `citizenship_status.read_failed`). Non-vacuous: `renderStatusNotice()` → `return nothing` turns the three line rows red (old asserts stayed green); an unresolved read (`pendingRead()`) turns all four not-shown rows red. 3 suites 270/270, lint exit 0. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
