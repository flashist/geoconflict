# Task — Registry Visibility And Image Retention Policy

## Type
Operations policy follow-up.

## Purpose

Define what Docker registry visibility is acceptable, which historical tags are trusted, and how old incident-era images should be handled.

## Why This Matters

The incident response treated pre-hardening images as untrusted, but that policy must be made explicit so old tags are not reused casually later.

## Actions

1. Inventory the active Docker repositories and who can access them.
2. Decide whether registry visibility must be private, restricted, or can remain public with compensating controls.
3. Mark all pre-hardening tags as untrusted and remove them if policy permits.
4. Define a retention policy for deployment tags, rollback tags, and ephemeral test tags.
5. Document the trusted image selection rule for future incident response and deploys.

## Done Criteria

- registry visibility/access policy is documented
- pre-hardening tags are either deleted or explicitly marked untrusted
- image retention and rollback rules are written down

## Outputs

- final registry policy and trusted tag rules

## Implementation Notes

- Added the operator-facing policy doc: `docs/security/registry-image-policy.md`
- Documented:
  - preferred private/restricted registry visibility
  - the compensating-controls rule for any public repo
  - trusted vs untrusted image classification
  - production deploy-by-digest guidance
  - rollback and retention rules
- Updated `docs/vps-deployment-guide.md` to recommend digest-based production deploys and point to the policy doc
- Updated `README.md` to stop describing the old password-based env model and to link to the registry policy

## Remaining Validation Gap

- This task documents the policy in-repo, but it does not mutate live Docker Hub visibility settings or delete historical tags; those actions still require registry-admin access outside this workspace
