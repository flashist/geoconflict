# Review — 0447

Task: ai-agents/tasks/done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md
File(s) under review: update.sh, tests/scripts/profile-deploy-hardening.test.sh, docs/vps-deployment-guide.md, CLAUDE.md (one clause) — working tree vs HEAD (uncommitted)
Status: closed-out
Coverage: both reviewers measured — round 1: Codex (`codex-cli 0.157.1`, exit 0) ran bash trap probes (`trap "exit 130" INT` + `kill -INT $$` → rc=130; EXIT trap keeps the exit status → rc=7); the Claude reviewer re-ran the harness (`ALL PASS`, exit 0, 0 failures) and ran the real `update.sh` under bash 5.2.15 (Debian container) for every signal case and a closed-stdout case.

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | low  | update.sh:56 (`docker image prune -a -f`) with update.sh:63-64 (`if ! docker pull` / `docker image inspect`) | [codex, partially correct] The prune runs before the guarded pull, so Part C's "image already on this box" fallback only finds images that a container still uses; any other local copy is deleted first. Not a regression: in that case the new code exits 1 and leaves the running game alone, where the old code stopped the game and then failed `docker run`. Pre-existing ordering, already noted in the worklog (§ *Seen, not in scope*: "relies on the image surviving the `docker image prune -a -f`"). The T74 stub does not model the prune. Frontier / pre-existing, not a defect. Optional at most: make the update.sh:60-62 comment say "still used by a container on this box". |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Frontier (pre-existing ordering, not a regression) | No behaviour change. Verified: `docker image prune -a -f` (update.sh, the prune before the pull) removes every image no container uses, so the guarded pull's fallback only finds an image a container still references; the failure case now exits 1 and leaves the running game alone, where the old script stopped it. Comment-only tweak applied to the guarded-pull comment: "unless the image is still on this box — after the prune above, only if a container still uses it". `bash -n update.sh` clean; harness `ALL PASS`, exit 0, 0 ❌. Recorded as Accepted residual *pull-fallback-after-prune* (owner ruling 2026-10-12, "Record as settled"). | won't fix (frontier) |

## Accepted residuals (shared, do-not-re-litigate)
- pull-fallback-after-prune — What: `update.sh` keeps `docker image prune -a -f` **before** the guarded `docker pull`, so the "pull failed but image is on this box" fallback (task 0447 Part C) works only for an image some container still uses (in practice: re-deploying the running tag while the registry is unreachable); any other local copy is pruned first and the deploy exits 1, leaving the running container untouched. · Why (structural): pre-existing ordering, not introduced by 0447; the failure mode is safe (stop before touching the running game — strictly better than the old stop-then-fail). Rejected: moving the prune after the pull (changes disk-pressure behaviour on a low-disk box for a rare case, out of 0447's scope); dropping the prune (disk-full history). Owner ruled "Record as settled" 2026-10-12. · Re-raise only if: the image prune is moved after the pull, or someone needs to deploy a local image that no container uses.
