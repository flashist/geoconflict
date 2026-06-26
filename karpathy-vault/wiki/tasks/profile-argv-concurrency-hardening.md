# Profile Deploy Argv and Concurrency Hardening

**Source**: `ai-agents/tasks/done/s4-profile-04g-argv-concurrency-hardening.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4g

## Goal

Close the remaining profile-deploy hardening gaps after T4e/T4f: no secrets in process argv, fail-closed deploy locking, atomic deploy records, and read-only deploy-target preflight.

## Key Changes

- Replaced password-in-argv paths with safer transport such as `sshpass -f` using a trap-cleaned `0600` file, plus stdin/`PGPASSWORD` handling for credential probes.
- Added local and remote deploy locks so concurrent profile deploys fail closed instead of interleaving box mutations or deploy-record writes.
- Made deploy-record writes atomic by assembling one `0600` temp block and appending the complete validation result under the lock.
- Added a read-only remote identity preflight so a reachable-but-wrong host is rejected before SCP, secret staging, or box mutation.
- Mirrored the deploy-target preflight into the telemetry deploy path for repo-wide parity.

## Outcome

T4g completes the bounded T4 deploy-hardening sequence. Database semantic validation and `/ready` remain T5 responsibilities; broader transport secret cleanup such as sec13 is a later no-sprint hardening item.

## Related

- [[decisions/sprint-4]] — parent sprint and profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded review loop and T4 keeper properties
- [[tasks/profile-deploy-wiring]] — T4e3 transport and secret-staging baseline hardened by this task
- [[tasks/profile-image-secret-scan]] — T4f image layer byte-scan gate
- [[tasks/profile-server-bring-up-runbook]] — live operator deploy path that consumes the hardened scripts
- [[decisions/sprint-backlog]] — sec13 deploy-transport secret hygiene remains a no-sprint follow-up
