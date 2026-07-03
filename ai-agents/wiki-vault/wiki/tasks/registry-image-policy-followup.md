# Registry Image Policy Follow-Up

**Source**: `ai-agents/tasks/done/sec09-registry-visibility-and-image-retention-policy.md`
**Status**: done
**Sprint/Tag**: Security follow-up

## Goal

Write down which Docker registry visibility modes are acceptable, which historical tags are trusted, and how incident-era images should be retained or retired.

## Key Changes

- Added `docs/security/registry-image-policy.md` as the operator-facing policy for private or restricted registries, compensating controls for public repositories, and trusted vs untrusted image classification.
- Updated `docs/vps-deployment-guide.md` and `README.md` to prefer digest-based production deploys and to stop normalizing the old password-based env workflow.
- Formalized rollback and retention guidance so deploy provenance depends on commit, digest, and validation result rather than mutable tag names alone.

## Outcome

The follow-up turned the incident's conservative image-trust rule into durable repo policy. It did not itself change live Docker Hub visibility or delete old tags, so those operator-level actions remain outside the repo and must be performed separately.

## Related

- [[decisions/vps-credential-leak-response]] — incident that created the need for a durable registry policy
- [[decisions/registry-image-policy]] — policy page derived from this follow-up task
- [[tasks/incident-postmortem-followups]] — closure task that spawned this work
