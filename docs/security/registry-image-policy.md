# Registry Image Policy

## Purpose

Define which container images are trusted for deploys, what registry visibility is acceptable, and how long different classes of tags should be retained.

This policy was introduced after the 2026-04-21 VPS credential leak incident, where pre-hardening Docker images had to be treated as potentially unsafe because the old build path could capture operator-local `.env*` files.

## Visibility Policy

### Preferred

- Repositories used for live deploys should be **private or access-restricted** when the plan and budget allow it.

### Acceptable temporary fallback

Public visibility is acceptable only if all of the following are true:

- the Docker secret-boundary checks are passing
- images are treated as **public artifacts** with no expectation of secrecy
- no operator-local env or secret material can enter the build context
- pre-hardening images are deleted or explicitly classified as untrusted
- production deploys use an explicitly recorded trusted tag or digest

If a repository remains public, do not rely on registry obscurity as a security control.

## Trust Classification

### Untrusted images

Treat an image as untrusted if any of the following is true:

- it was built before the Docker secret-boundary hardening deployed on 2026-04-21
- it was built from a workspace state that predates the `.dockerignore` and allowlist-copy fixes
- it was built before the `check-docker-secret-boundary` guard existed
- its commit, build date, or deploy operator cannot be identified
- it was produced only for local testing and never validated for deploy use

Untrusted images must not be used for production deploys or rollbacks.

### Trusted images

Treat an image as trusted only if all of the following are true:

- it was built after the hardening fixes
- it passed the Docker secret-boundary checks
- it comes from a known repo commit
- its deploy tag and digest were recorded at build/deploy time
- it was validated in the target environment or an equivalent environment

## Deploy Rules

- For `prod`, prefer deploying by **digest** when the digest is available:
  - `./deploy.sh prod sha256:<digest>`
- Tags are useful operator labels, but they are not the trust anchor.
- The trust anchor for a production image is the combination of:
  - repo commit
  - image digest
  - validation result

## Rollback Rules

- Keep the **current production digest** and the **previous known-good production digest** available for rollback.
- Do not roll back to any pre-hardening image, even if the application behavior was previously known-good.
- If a rollback candidate lacks a recorded digest or provenance note, rebuild from a trusted repo state instead.

## Retention Policy

### Keep

- current production digest
- previous known-good production digest
- most recent successful dev validation images that are still operationally useful

### Remove quickly

- temporary incident/test tags
- one-off debugging tags
- superseded validation tags with no rollback value

### Remove or mark explicitly untrusted

- all images built before the 2026-04-21 hardening fix

If deletion is not immediately possible, maintain a clear private list of forbidden tags/digests and never use them in deploy notes, scripts, or rollback instructions.

## Minimum Deploy Record

For every production deploy, record privately:

- environment
- tag
- digest
- repo commit
- deploy timestamp
- operator
- validation result

This record does not need to live in git, but it must exist somewhere durable and private.
