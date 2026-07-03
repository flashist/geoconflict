# Profile Image Build, Push, and Digest Pinning

**Source**: `ai-agents/tasks/done/s4-profile-04e1-build-push-digest.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4e1

## Goal

Provide the box-independent half of profile deployment: build and push a `linux/amd64` profile image, then resolve the exact built artifact to an immutable registry digest without contacting the profile VPS.

## Key Changes

- Added `build-deploy-profile.sh` with layered `.env`, `.env.secret`, `.env.profile`, and `.env.profile.secret` loading plus local preflight validation.
- Added `npm run deploy:profile`; the script uses `docker buildx build --platform linux/amd64 --load`, records the built image ID through an iidfile, logs in with `--password-stdin`, and pushes the profile tag.
- Resolves `PROFILE_DIGEST` from the built image ID's exact repository digest, validates the canonical `sha256` form, verifies the digest exists in the registry, and fails closed if resolution or verification fails.
- Marks dirty-worktree tags explicitly and cleans up the temporary iidfile on all exits. At initial completion, SSH/SCP plus remote setup remained a T4e3 stub; that wiring is now represented by [[tasks/profile-deploy-wiring]].

## Outcome

T4e1 is complete. The local workflow preserves the architecture and immutability keepers from the deploy-hardening review reset: an Apple-Silicon host publishes an amd64 artifact, registry credentials stay out of process arguments, and downstream work receives a content-addressed digest rather than a mutable tag. Later slices add the pre-push secret-byte scan and remote deploy transport while keeping this local digest source as the upstream artifact identity.

## Related

- [[decisions/sprint-4]] — parent sprint and remaining profile-store infrastructure sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded T4 restart and immutable-digest keeper
- [[tasks/profile-docker-image]] — T4c image definition built by this workflow
- [[tasks/profile-vps-provisioning]] — T4d host intentionally untouched by this local slice
- [[tasks/profile-onbox-stack-gate]] — T4e2 on-box stack that consumes the digest
- [[tasks/profile-deploy-wiring]] — T4e3 transport that passes the digest to the box
- [[tasks/profile-image-secret-scan]] — T4f gate inserted before image push
- [[tasks/profile-server-bring-up-runbook]] — T4i operator path that runs the merged deploy workflow
