# Review — 0496

Task: ai-agents/tasks/done/0496-durable-items-base-entitlements-migration-item-grant-branch-private-ownership-and-already-owned-refusal-b4/brief.md
File(s) under review: B4's hunks only (working tree, uncommitted; the same files also hold 0488/0491/0492/0494 hunks, not reviewed) — migrations/010_player_entitlements.sql; src/profile-server/{PaymentsRepository,PublicProjection,Routes}.ts; src/core/profile/{PaymentsContract,PlayerProfile}.ts; src/client/{PlayerProfileView,CitizenshipCard,CitizenshipOffer}.ts; tests/testdata/profile-restore-drill/verify.sql; tests/profile-backup-dryrun.sh; tests/integration/support/db.ts; ai-agents/knowledge-base/profile-backup-restore-runbook.md; and the B4 tests named in worklog.md
Status: closed-out
Coverage: reasoning-only second opinion — Codex ran (codex-cli 0.157.1, exit 0) and returned a usable findings list; it tried `npx jest --runInBand <4 B4 suites>`, which failed before running any test (EPERM writing jest's haste-map cache under the read-only sandbox), so it measured nothing. The reviewer's own leg measured: `npm test -- <10 B4 unit/client/core suites>` → 10 suites, 705 tests, green (round 1, 2026-10-26).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | profile-backup-restore-runbook.md § "Pass criteria (`006` schema)" | Pass criteria still say "no differences across all **12** tables", while B4 moved every other count to 13 (`verify.sql` "(13 tables)", the inventory "13 base tables", step 5's "all 13 tables", the dry-run's "13 tables"). The operator's acceptance line is now internally inconsistent; it should read 13. Raised by both reviewers. Defect (docs). |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (docs, low) | Runbook § "Pass criteria (`006` schema)": "across all **12** tables" → "across all **13** tables"; verified it was the only remaining 12-table count (inventory, step 5, `verify.sql`, dry-run all say 13). Re-checked with `bash tests/scripts/profile-deploy-hardening.test.sh`. Applied under the standing approval (plan step 9). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
- OD-2 private ownership — What: `entitlements` only on the verified owner view; `/intent` 409 `already_owned` only when `caller.verified`; item-purchase inbox messages dropped from the unverified inbox · Why (structural): ownership is paid state; an unverified "owned"/409 would be a paid-state oracle (owner ruling 2026-10-24) · Re-raise only if: a path shows entitlements, an item message, or a 409 to a `vfy:false` caller.
- Old `player_cosmetic_ownership` table left alone — What: B4 builds `player_entitlements` and does not touch migration 006's unused table · Why (structural): owner ruling 2026-10-24 (OP-2); dropping it is a separate cleanup with restore-drill edits · Re-raise only if: code starts reading or writing it.
- Duplicate item welcome on a double charge — What: a second token for an owned item grants `granted, becamePaidCitizen:false`, adds no row, and sends the item's welcome message again · Why (structural): owner ruling 2026-10-24 (OP-3); the alternative changes B1's grant interface · Re-raise only if: the duplicate is something other than one extra inbox message (e.g. a second ownership row or a second flag write).
- `/intent` 409 first exercised end to end by the first item build — What: no sellable durable item exists, so wire validation refuses every non-citizenship id; the rule is pinned as pure `intentRefusal()` (8 cases) · Why (structural): spec §10 · Re-raise only if: the first item build ships without an end-to-end 409 test.
- Entitlements read for every caller on `GET /v1/profile` and existing-player login — What: query runs regardless of `verified`; result used only for the owner view · Why (structural): keeps the 0250 S3b same-DB-calls guard (SessionRoutes.test.ts) · Re-raise only if: the guard is weakened or removed.
- Tester reset to non-citizen while owning an item, on an unverified login — What: offered buy, no 409 · Why (structural): spec §7 accepted residual · Re-raise only if: a real (non-tester) player can reach that state.
