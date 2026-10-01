# Telemetry-Server Deploys Carry a Version Name, Like the Game (task 0356)

**Source**: `ai-agents/tasks/done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 29 (append rank; owner-ruled **top** of Sprint 7, worked after `0355`) / task `0356`

> ✅ Done (agent-closed — not owner-verified), 2026-10-01. **Nothing deployed; no real git tag was created.**
> Verify task **`0363`** is Sprint 8 rank 1 ([[decisions/sprint-8]]), owner-run after the weekend telemetry deploy.
> ⚠️ **Until this change is committed, a real telemetry deploy refuses to run** — its own shipped files are dirty
> (owner ruling Q1). *(This page does not record whether it has since been committed.)*

## Goal

The telemetry half of the owner's request to version the profile and telemetry servers *"similarly to the way we
currently tag our game server"* — the profile half is [[tasks/profile-deploy-version-tags]] (`0355`), and the
naming rule is [[decisions/adr-117-server-deploy-version-names]].

**The telemetry box is a different kind of thing:** it runs **only third-party images**, each pinned to a fixed
version in `setup-telemetry.sh` (ClickHouse, Postgres, Redis, Uptrace `2.0.2`, the OTEL collector). What *we* ship
is the **configuration** — `build-deploy-telemetry.sh` uploads `setup-telemetry.sh` and a secrets file and runs it.
So "the telemetry version" can only mean **which commit of our setup is deployed** — and before this task nothing
recorded it: no git read, no deploy record, no marker on the box.

## Key Changes

- **Name: `<base>-telemetry.<N>`** (e.g. `0.0.155-telemetry.1`), via the shared helper
  `scripts/deploy-version-tag.sh` (`deploy_version_next telemetry`) built in `0355`. The base is read from
  `package.json` **at the deployed commit**, never written — an uncommitted `package.json` neither blocks nor renames.
- **Owner rulings at the plan gate (2026-10-01):** **Q1 = refuse** a deploy whose shipped telemetry files
  (`setup-telemetry.sh`, `build-deploy-telemetry.sh`, the helper) are uncommitted; **extras = neither** — no deploy
  lock and no commit-exact upload.
- **`build-deploy-telemetry.sh`** — all naming and refusals run **before** the Docker dry-run and preflight. After
  the preflight, one exit trap (`finalize_telemetry_deploy`) removes the temporary password file and the local
  staged env, and appends a **local deploy record** (timestamp, version, commit, result, tag outcome — no host, no
  secret). Only after the remote run succeeds does it create an annotated git tag on the captured commit and push
  that tag alone — **warn-only**: a tagging fault never fails a successful deploy.
- **`setup-telemetry.sh`** — new `write_deploy_version_marker` writes a `deployed-version` file in the Uptrace
  install directory holding exactly `version=…` / `commit=…` (an invalid value becomes `unknown`, with a warning that
  names the variable, never the value). Written once, after the cron block; a write failure fails the setup (so no
  tag). **No image line changed.**
- **Uptrace is not rebuilt**, so the Uptrace UI does **not** show our version — the marker and the record do.
- **Tests:** `tests/scripts/profile-deploy-hardening.test.sh` grew T40–T54 plus structural checks (615 → 740
  assertions); `tests/scripts/ShellHarnesses.test.ts` unchanged.

## Outcome

- **Evidence:** red first (72 new checks failing, all 615 baseline passing), then harness `ALL PASS` 740 / 0
  (≈ 92–94 s; 150 s wrapper deadline); full `npm test` 186/186 suites, 3327/3327 tests. Two earlier full runs each
  lost one worker to `SIGSEGV` with the `ClearStaleLeftTrimmedPointerVisitor` stack — the known `0197` V8 crash, not
  this change — and were re-run. A five-mutation pass each turned the harness red. `shellcheck` is not installed —
  **not run**.
- **Review:** R1 (low, fixed) — the exit trap deleted whatever file an *inherited* `SSH_PASSWORD_FILE` named, even in
  key-auth mode; fixed by clearing the variable before the auth branch (the profile script's shape), pinned by T54.
  R2 — the dirty check's own code lives in a file it checks — **accepted as a known limit** (owner *"Accept as known
  limit"*): it guards against accidents, not tampering. `0355`'s residuals carry over by reference (one-time
  `git status` gate; unreadable remote tags only warn; numbers need not strictly increase).
- ⚠️ **Not verified:** the real deploy (needs the weekend slot and the owner — `0363`); no dedicated test for the
  `node`-missing refusal or a commit with no `package.json`; `.env.telemetry` knob values are not recorded.
- ⚠️ **The hardening harness now takes ~84–94 s** (was ~69 s), and `ShellHarnesses.test.ts`'s comment still says
  "~16 s" — left alone by plan.

## Related

- [[tasks/profile-deploy-version-tags]] — task `0355`, the profile half and the shared helper this reuses
- [[decisions/adr-117-server-deploy-version-names]] — the naming rule, applied here to the telemetry box
- [[systems/telemetry]] — the box this versions
- [[tasks/profile-deploy-hardening]] — the shell harness this extends
- [[systems/weekend-deploy-window]] — the slot the first tagged telemetry deploy rides
- [[decisions/sprint-7]] — the board; [[decisions/sprint-8]] carries verify task `0363`
