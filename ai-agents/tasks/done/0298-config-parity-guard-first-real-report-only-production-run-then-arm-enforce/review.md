# Review — 0298

Task: ai-agents/tasks/done/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md
File(s) under review: scripts/check-config-parity.mjs, scripts/check-config-values.mjs (header), scripts/config-parity-allowlist.json, deploy.sh, build-deploy.sh, build-deploy-profile.sh, tests/scripts/ConfigParity.test.ts, tests/scripts/ConfigParityCallSites.test.ts (new), tests/scripts/ConfigValues.test.ts, tests/scripts/profile-deploy-hardening.test.sh (run_deploy stub + T19 only), CLAUDE.md (one line), ai-agents/knowledge-base/weekend-deploy-slot-runbook.md (W12 note), task worklog.md
Status: closed-out
Coverage: both reviewers measured — round 1: Codex (codex-cli 0.157.1, exit 0) ran the armed checker on the real tree (`--enforce --block-on=game,client` exit 0, `--block-on=profile` exit 0) and `bash -n` on the three deploy scripts; the reviewer ran the three scoped jest suites (210/210 pass), the hardening harness (ALL PASS, T19 green) and a mutation probe of the T19 grep.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | tests/scripts/profile-deploy-hardening.test.sh:296 | The T19 "no `\|\| true` / no `--report-only`" grep cannot fire: its pattern needs `check-config-parity.mjs` on the same line as the flag, but the call site now spells the checker `"$PARITY_CHECKER"` (build-deploy-profile.sh:84); the filename only appears on the assignment line (:75) and in comments. Mutation probe: rewriting :84 to `--report-only \|\| true` is NOT matched. Mitigated — the exact-line check just above it, T19's exit-1-stub behaviour test and ConfigParityCallSites.test.ts all catch that regression — so this is a dead assertion, not a hole. |
| R2 | 1     | low  | worklog.md § Part A — A1 Sources | "The reproduction is exact because the name guard reads git-tracked files only" is wrong: the checker walks the filesystem (`walkTypeScript`, scripts/check-config-parity.mjs:262-275), so untracked or uncommitted `src/` files on the deploying machine are scanned. The `git archive` reproduction of 0.0.153 / 0.0.154 (never relayed) therefore carries the same "if the tree was clean then" caveat the worklog already applies to W3/W7; W12 alone is corroborated by the relay. Same loose wording in the checker header (scripts/check-config-parity.mjs:6-7, "static analysis over git-tracked files"). Doc accuracy only; the armed behaviour (scan what is actually built) is the fail-closed direction. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (test only; low — the exact-line check, T19's exit-1-stub test and ConfigParityCallSites.test.ts already caught the regression, so a dead assertion, not a hole) | T19 grep now matches any non-comment line naming the checker by variable or filename (`^[^#]*(PARITY_CHECKER\|check-config-parity\.mjs)[^#]*(\|\| *true\|--report-only)`). Mutation-proved in a mirrored harness run: `if ! { node … \|\| true; }; then` and `--report-only` in place of `--enforce --block-on=profile` each turn this check red (old pattern missed both); unmutated harness ALL PASS; success marker unchanged. | ✅ done |
| R2 | CORRECT | Defect (doc only; low — no behaviour change, and scanning the on-disk tree is the fail-closed direction) | worklog.md § Part A Sources: false sentence struck (kept), dated correction added — only `0.0.152` confirmed; `0.0.153`/`0.0.154` are tag-reproduced and carry the "if the tree was clean then" caveat; notes added under the A1 table and the A5 step-1 verdict. Checker header *WHAT IT DOES* and the *Inputs* comment reworded to "files on disk; the src/ walk also scans untracked files". Comment-only. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
