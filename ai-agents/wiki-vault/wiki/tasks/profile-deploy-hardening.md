# Profile Deploy Argv And Concurrency Hardening

**Source**: `ai-agents/tasks/done/0183-profile-04g-argv-concurrency-hardening/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4g

## Goal

Close the remaining profile-deploy threat-model items after T4e/T4f: no secrets in argv, fail-closed deploy locking, atomic deploy records, and a read-only wrong-host preflight before any secret transfer or box mutation.

## Key Changes

- Replaced vulnerable password-in-argv paths with file/stdin-based credential handling, including `sshpass -f` with a 0600 file created before the secret is written and removed by traps.
- Added local and remote concurrency controls so overlapping deploys fail closed instead of interleaving mutations or corrupting deploy records.
- Made deploy record writes atomic as a single contiguous block with the validation result included.
- Added a read-only deploy-target preflight so a reachable but unintended host is rejected before SCP, secret staging, or `setup-profile.sh` execution.
- Mirrored the wrong-host preflight pattern for the telemetry deploy path where applicable.

## Outcome

T4g completed the final profile-deploy hardening slice before the profile box moved into DB/API work. Remaining ultra-low-reachability races are residuals, not blockers; database URL semantics stayed with T5's real Postgres consumer.

## Related

- [[systems/player-profile-store]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[decisions/sprint-4]]
- [[tasks/profile-deploy-wiring]]
- [[tasks/profile-image-secret-scan]]
- [[tasks/profile-game-server-deploy-env]]
- [[tasks/profile-server-bring-up-runbook]]
- [[tasks/profile-backend-db-api]]
