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
