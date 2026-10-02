# Make the Profile-Deploy-Hardening Shell Harness Finish Inside Its 150 s Deadline (task 0371)

**Source**: `ai-agents/tasks/done/0371-make-the-profile-deploy-hardening-shell-harness-finish-inside-its-150-s-deadline/brief.md` (its `worklog.md` read as supporting evidence — the brief is pre-build)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 34 (append position; filed on the Backlog board, moved in by owner ruling 2026-10-02) / task `0371`

> ✅ **Closed 2026-10-02; committed in `2247699`.** Test-only — nothing ships in a deploy.
>
> ⚠️ **Accepted residual:** under heavy machine-wide load the harness can **still** be killed at 150 s, and that
> looks exactly like a real slowdown. One of five full runs did this; it was judged environmental — **inferred, not
> proven**.

## Goal

`npm test` runs hand-written shell harnesses through a jest wrapper, `tests/scripts/ShellHarnesses.test.ts`, which
kills any harness that runs past **150 s**. `tests/scripts/profile-deploy-hardening.test.sh` had grown past that, so
**every** full `npm test` was red — first seen at `0367`'s close ([[tasks/public-lobby-one-minute]]). Every check
inside still passed; it was too **slow**, not wrong. While it stayed red, every close carried a "pre-existing red"
caveat and a real new failure could hide behind it.

**Locked rules it had to respect** (owner ruling at task `0201`, recorded in `CLAUDE.md`): **no skip valve** of any
kind; the **180 s** jest timeout and **150 s** deadline are load-bearing and stay; each harness is checked for its own
success marker; and no grep-level assertion over the deploy scripts may be dropped or weakened.

## Key Changes

**Cause (measured):** macOS runs a check on a newly created executable the first time it is run directly — about
**0.16–0.96 s per file** on this host, slower under load; run as `bash file`, or a second time, it costs nothing. The
harness wrote **6 fresh stub executables** (docker, git, sshpass, ssh, scp, getent) on every test setup — and those
setups rose from **19 to 59** in commits `49a419d` / `05c3cfa` (2026-10-01), the deploy-version-tag work of `0355` /
`0356` ([[tasks/profile-deploy-version-tags]], [[tasks/telemetry-deploy-version-tags]]). About 354 first-run checks per
run. ⚠️ **Which macOS component does the check is inferred, not proven** — the cost is measured, the component is not.

**Ruled out:** no `sleep`, retry or real network call in the deploy scripts; nothing that ships in a deploy was involved.

**Fix (test-only):**
- `tests/scripts/profile-deploy-hardening.test.sh` — the six stubs are written **once per run** into `STUB_HOME`; each
  stub reads the current work directory at run time from a pointer file that every test setup refreshes. Test bodies,
  allow-lists and assertions unchanged.
- `tests/scripts/ShellHarnesses.test.ts` — one stale comment updated. The two timeout constants and the `ALL PASS`
  marker are unchanged; no opt-out path added.

## Outcome

- **Harness alone: 255 s → 54 s** under the same load (later runs 47 s, 34 s). The brief's target (< 75 s) met.
- **Coverage: 740 checks before and after, ALL PASS, output byte-identical** apart from timing lines. Every removed line
  was a stub line changed only by the work-directory substitution, checked mechanically.
- **Full `npm test`, 5 runs:** run 1 green; ⚠️ **run 2 — harness killed at 150 s** (an untouched harness ran ~30×
  slower in the same run; machine load ~11.7 — classed environmental, inferred); run 3 — known supertest flake
  (`NameChangeRoutes` `socket hang up`), re-run per the flake rule; **runs 4 and 5 green in a row** (3357/3357).
- Lint and `tsc` clean. Stateful review round 1: ready to merge, 0 defects; one low frontier finding recorded
  `won't fix (frontier)` on owner ruling *"Accept and record (Recommended)"*. Second opinion reasoning-only.
- **Remaining:** the first test's cold start (5–24 s) is still paid once per run. A future test that sets the work
  directory without the normal setup, or writes its own stubs per test, would break or re-slow this — both named in
  the harness comments.

## Related

- [[tasks/public-lobby-one-minute]] — task `0367`, closed over this red; this task was filed at that close
- [[tasks/profile-deploy-version-tags]] — task `0355`, whose new harness checks multiplied the stub writes
- [[tasks/telemetry-deploy-version-tags]] — task `0356`, the same
- [[tasks/supertest-profile-server-flake]] — the supertest flake family seen in run 3
- [[decisions/sprint-7]] — the board (rank 34); closed 2026-10-02
- [[decisions/sprint-backlog]] — where it was first filed, row kept as `➡️ Moved`
