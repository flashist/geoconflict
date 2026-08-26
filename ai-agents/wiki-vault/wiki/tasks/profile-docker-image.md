# Profile Server Docker Image

**Source**: `ai-agents/tasks/done/0175-profile-04c-dockerfile/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4c

## Goal

Package the profile server as a `linux/amd64` Docker image whose build context is constrained by explicit allowlist copies, preventing local secret files from entering image layers through a broad `COPY`.

## Key Changes

- Added `Dockerfile.profile` on `node:24-slim`, with `curl`, the full dependencies required by runtime TypeScript execution, port 8080, and the profile-server start command.
- Restricted the Dockerfile to explicit copies of package manifests, `tsconfig.json`, and `src`; it contains no `COPY . .` path.
- Added `example.env.profile` to `.dockerignore`, supplementing the existing `.env.*` exclusions.
- Established `linux/amd64` as the image target so Apple-Silicon development hosts cannot publish an image incompatible with the reg.ru production host.

## Outcome

The standalone profile server has a buildable, runnable image with a structural secret boundary and an explicit architecture contract. Build/push orchestration is covered by T4e1, and the authoritative layer-byte secret scan is now covered by T4f.

## Related

- [[decisions/sprint-4]] — parent sprint and remaining profile-store infrastructure sequence
- [[decisions/profile-deploy-hardening-review-loop]] — keeper properties and bounded T4 slice plan
- [[tasks/profile-server-skeleton]] — T4a service executed by this image
- [[tasks/repo-build-context-hardening]] — earlier game-image allowlist-copy hardening
- [[tasks/profile-build-push-digest]] — T4e1 workflow that builds and pushes this image for amd64
- [[tasks/profile-image-secret-scan]] — T4f byte-scan gate for the built image layers
