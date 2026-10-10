# SSH-Only Tester Roles — Apply a Fixed Test Role to an Allowlisted Tester, and Restore It (task 0425)

**Source**: `ai-agents/tasks/done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md` (`worklog.md`, `plan.md` and `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 22 (ADR-035 append rank; owner kept it: *"Leave it at 22"*) / task `0425`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-09 on *"Close + file both (Recommended)"* — the owner was
> told the two unproven items below first. Code committed in `bcc9bf0` (2026-10-10). ⚠️ **Nothing has run on the profile
> box**: deploy, migration `008`, the mount, the allowlist and the first `apply` are all verify task **`0430`**
> (owner-run, `🔲 Backlog` on Sprint 8 at 2026-10-10). Deploy timing ruled **"Urgent: after review passes"** — a
> **mid-week profile deploy**, an exception for this deploy only, not a change to [[systems/weekend-deploy-window]].
> How it is operated: [[systems/profile-tester-roles]].

## Goal

Since the 2026-10-08 incident (`0424`, Backlog — the same Yandex account started reaching a different profile record),
there is **no earned-citizen test account**, which blocks `0420`'s earned items. The owner rejected any client-side
"log in as" (anyone can run console code) and asked instead for **server-side, SSH-only, deterministic** roles applied to
a hand-kept list of testers. Owner rulings 2026-10-09: no copy-from-a-real-player mode; five first roles; save and
restore exactly.

## Key Changes

- `migrations/008_tester_role_snapshots.sql` — the snapshot table (one row per tester; `on delete cascade`).
- `src/profile-server/TesterRoles.ts` (frozen role table), `TesterRoleRepository.ts` (`show` / `apply` / `restore`),
  `TesterRoleCommand.ts` (arguments, fail-closed allowlist, run log, output), `testerRole.ts` (one-shot entry);
  `package.json` script `tester-role`. Same shape as `0312`'s operator command
  ([[tasks/name-change-operator-decide-command]]) — no port, no route.
- `setup-profile.sh` — a `tester-roles/` directory (0700) mounted into the container; the script **never creates or
  writes the allowlist** (the hardening harness asserts it). `TESTER_ROLE_OPERATOR` allowlisted in
  `scripts/config-parity-allowlist.json`.
- Snapshot ⇄ player row is copied **inside SQL**, never through JS, so microsecond timestamps restore exactly.
- Tests: two new unit suites (88 tests), `tests/integration/TesterRole.it.test.ts`; `Migration006.it.test.ts` now
  expects `006, 007, 008`. Review R1 (medium): the backup restore drill now covers `tester_role_snapshots`
  (`verify.sql`) — migration `008` had turned the drill's "uncovered tables" check red.
- Runbook: `ai-agents/knowledge-base/profile-tester-roles-runbook.md` → [[systems/profile-tester-roles]].

## Outcome

- §7 "check, not assume" findings: reconciliation can never undo a role-set paid flag (it only ever sets paid true) —
  but a **real purchase while a role is held, then `restore`**, would show a buyer as not paid (runbook rule: no real
  purchase while a role is on); `profile-checks.sh` and alerts read no paid flag; ad-hoc paid counts **would** count a
  `paid-citizen` tester (exclusion recipe in the runbook); a page reload is enough (nothing cached); the game server only
  ever turns citizen status **on** mid-game; `brand-new`'s gift popup depends on the **browser's** local play history.
- Verification: unit suites 88/88; full `npm test` green on re-run after one `supertest` `socket hang up` (known-flake
  rule); integration 176/178 — the 2 failures were pre-existing, filed as `0431`
  ([[tasks/routes-it-test-verified-field]]); lint, `tsc`, config-parity (also `--enforce`) clean.
- ⚠️ **Not proven:** (1) **nothing ran on the box**; (2) the full `tests/profile-backup-dryrun.sh` did not run to the
  end (Docker Hub refused the `minio/minio` image) — only the restore drill's SQL path was proven, on a throwaway Postgres.
- Follow-ups filed at close: `0430` (verify, owner-run) and `0431` (the stale integration test).

## Related

- [[systems/profile-tester-roles]] — the runbook: roles, commands, allowlist, run log, recovery
- [[systems/player-profile-store]] — the profile database and box this writes to
- [[tasks/name-change-operator-decide-command]] — task `0312`, the operator-command precedent
- [[tasks/routes-it-test-verified-field]] — task `0431`, found by this task's integration run
- [[tasks/private-lobby-tester-default]] — task `0354`'s **client-side** tester marker — a different "tester", not read here
- [[decisions/sprint-8]] — the board (rank 22); `0430` at 32
