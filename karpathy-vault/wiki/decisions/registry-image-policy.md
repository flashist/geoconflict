# Registry Image Policy

**Date**: 2026-04-21
**Status**: accepted

## Context

The VPS credential leak response established that pre-hardening images had to be treated as potentially unsafe because the old Docker build path could capture operator-local `.env*` files. However, that incident response did not complete a full historical registry forensic audit or change registry settings directly. A durable in-repo policy was needed so old tags are not casually reused later and future deploys have a clear trust model.

## Decision

Adopt an explicit image-trust and retention policy:

- repositories used for live deploys should be private or access-restricted when practical
- if a repository remains public, images must be treated as public artifacts and compensated by:
  - hardened Docker secret-boundary checks
  - no operator-local secrets in build context
  - pre-hardening images deleted or explicitly marked untrusted
  - production deploys using an explicitly recorded trusted tag or digest
- all images built before the 2026-04-21 hardening fix are untrusted for deploy and rollback
- production should prefer deploy-by-digest when the trusted digest is available
- rollback is allowed only to a known-good post-hardening digest with recorded provenance

The trust anchor for a production image is the combination of repo commit, image digest, and validation result, not a mutable tag name alone.

## Consequences

- deploy operations now have a clear distinction between trusted and untrusted historical images
- public registry visibility is no longer silently assumed to be safe; it requires explicit compensating controls
- registry cleanup and access-setting changes still require operator action outside the repo
- docs now recommend digest-based production deploys and define a minimum private deploy record

## Related

- [[decisions/vps-credential-leak-response]] — incident that prompted the policy
- [[systems/game-overview]] — deploy and runtime context
- [[tasks/registry-image-audit]] — source investigation that established the need for explicit image classification
- [[tasks/incident-postmortem-followups]] — closure task that turned the incident rule into a follow-up policy item
- [[tasks/registry-image-policy-followup]] — task that authored the in-repo policy and deployment-doc updates
