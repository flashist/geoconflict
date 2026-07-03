# Profile Image Secret Byte Scan

**Source**: `ai-agents/tasks/done/s4-profile-04f-image-secret-scan.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4f

## Goal

Add the authoritative profile-image secret boundary: scan actual built image layer bytes before push and fail closed if local secret material appears in any layer.

## Key Changes

- Extended the existing `scripts/check-docker-secret-boundary.sh` rather than adding a parallel scanner, reusing the repo secret-key listing flow.
- Built an uncapped wanted set from local secret/key files while excluding examples, samples, and templates.
- Scans `docker save` output layer by layer, including name and content hashes, so a secret is caught even if renamed, nested, or deleted in a later layer.
- Fails closed when the image cannot be observed safely, such as `docker save` failure, unreadable non-metadata layer blobs, or zero layers.
- Demoted Dockerfile COPY/ADD heuristics to warn-only advisory output; the byte scan is the sole blocking oracle.
- Inserted the scan against the built image ID before `docker push` in the profile deploy flow.

## Outcome

T4f closes the image-secret risk for the profile deploy path. Clean images can still push even with advisory warnings, but any observed layer-byte match against local secret material blocks the push.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — postmortem keeper that made byte scanning the blocking oracle
- [[decisions/vps-credential-leak-response]] — incident context behind Docker secret-boundary hardening
- [[tasks/profile-docker-image]] — profile image whose layers are scanned
- [[tasks/profile-build-push-digest]] — deploy workflow where the scan runs before push
- [[tasks/profile-server-bring-up-runbook]] — operator path that relies on the scanned deploy workflow
- [[tasks/docker-secret-boundary-check]] — earlier Docker secret-boundary guardrail
- [[tasks/profile-deploy-hardening]] — later T4g deploy hardening slice
