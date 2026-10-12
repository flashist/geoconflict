# Verify 0425 Live — Deploy Tester Roles, Apply "Earned Citizen" to the Tester, and Restore It (task 0430)

**Source**: `ai-agents/tasks/done/0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 32 (ADR-035 append rank; on merit the top group) / task `0430`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-11 on the owner ruling *"Close 0430, file a fix task
> (Recommended)"*. Profile deploy, allowlist, `apply earned-citizen` and the `restore` round trip all **pass**.
> ⚠️ **Step (f), the full backup dry-run, could NOT run** (Docker Hub refused the MinIO image) — carried to `0436`
> ([[tasks/backup-dryrun-minio-image]]), which then ran it green the same day.

## Goal

The first live run of `0425`'s SSH-only tester-role command ([[tasks/tester-roles-command]],
[[systems/profile-tester-roles]]): deploy it to the profile box, put the `earned-citizen` role on the owner's tester
record, check it, and later put the record back exactly as it was. It was needed because since the 2026-10-08 incident
(`0424`) there was no earned-citizen test account, which blocked `0420`'s earned-account items. The deploy ran
**mid-week by owner ruling** (*"Urgent: after review passes"*) — an exception for this deploy only, not a change to the
weekend rule ([[systems/weekend-deploy-window]]). Every production write needed the owner's OK in session; the commands
come from the runbook, not the brief.

## Key Changes

Nothing built. Steps run:

| Step | Result |
|---|---|
| (a) profile deploy, 2026-10-10 ~17:45 UTC (owner ran `npm run deploy:profile`) | **pass** — `/health` and `/ready` 200; both containers healthy; migration `008_tester_role_snapshots.sql` applied; `tester_role_snapshots` exists with 0 rows; `tester-roles/` directory 0700, mounted into the API container; 0 error lines. Rollback target: the previous image `0.0.156-profile.4` |
| Restart window (~40 s) | the game server logged 4 `player resolve failed after retries` (502 while the API restarted) — self-healing by design; none after; match credits 0 errors |
| (b) allowlist | did not exist → created (0600), one id |
| (c) the tester's internal id | found by decoding only the middle part of the session token; login **verified** |
| (d) `show` → `apply earned-citizen` → `show` | before: no role, XP 51, not citizen, not paid. After: earned citizen, XP 100, not paid, earned date set, snapshot held — matches the runbook's role table. Run log: one line per run. Full reload on the device: **pass**, the account shows as earned citizen |
| (e) `restore` (2026-10-11, after `0420`'s earned items passed) | **pass** — the after-`show` is identical to the before-`show`; no snapshot held; no purchase made while the role was on; the allowlist is kept for future tests |
| (f) full backup dry-run | **not run** — `npm run test:scripts:docker` exited 1 about 2 s in: `pull access denied for minio/minio`. Nothing tested; not a pass |

## Outcome

- **The tester-role command works on the real box**, end to end, including migration `008` and the new mount.
- ⚠️ **Not recorded:** the exact new profile version tag (the container showed only the image id). A git tag
  `0.0.161-profile.1` exists, dated 2026-10-10 — that it is this deploy is likely, **not confirmed** by the worklog. It cannot be read on the box: the live container runs by image digest only (per `fkit-lead`, 2026-10-12).
- ⚠️ **A whole session token was pasted in chat by the owner** during step (c) (owner's choice; it is valid for 24 h,
  so it lapsed on 2026-10-12). Recorded in the worklog; no token is in this page.
- Step (f) was carried to `0436` by the close ruling; `0436` ran it green on 2026-10-11 with 11 tables covered.
- Unblocked `0420`'s items 3(a), 8(b) and the earned part of 4 ([[tasks/sprint-7-fixes-live-checklist]]).

## Related

- [[tasks/tester-roles-command]] — task `0425`, the build this checks
- [[systems/profile-tester-roles]] — the runbook, the source of every command
- [[systems/player-profile-store]] — the profile box; migration `008`
- [[tasks/backup-dryrun-minio-image]] — task `0436`, which ran step (f)
- [[tasks/sprint-7-fixes-live-checklist]] — task `0420`, whose earned items this unblocked
- [[systems/weekend-deploy-window]] — the mid-week profile deploy of 2026-10-10
- [[decisions/sprint-8]] — the board (rank 32)
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, whose earned-account check this unblocked
