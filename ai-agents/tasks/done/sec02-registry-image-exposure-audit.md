# Task — Docker Registry And Image Exposure Audit

## Type
Investigation runbook.

## Purpose

Determine whether the leaked env values came from a pushed Docker image and identify the complete set of image tags and digests that must be treated as compromised.

## Why This Matters

The current build path is compatible with accidental image-layer leakage of local `.env*` files. If the registry was public or broadly accessible, attackers may have obtained the secrets without touching the VPS at all.

## Inputs Required

- Access to the Docker registry account and repository settings
- List of pushed image tags and digests used for `dev`, `staging`, and `prod`
- Approximate incident time window
- A safe local environment to inspect historical images

## Preconditions

- `sec01` completed or at least critical secrets rotated
- Do not trust any image built before the Docker hardening fix lands

## Actions

### 1. Inventory historical images

Build a table with:

- repository name
- tag
- digest
- push timestamp
- target environment
- whether it was ever deployed

Prioritize tags pushed after the move to per-environment `.env.<env>` deploys.

### 2. Check registry exposure level

For each affected repository, record:

- public vs private visibility
- collaborators or CI/service accounts with pull access
- recent access history if the registry exposes it

If visibility changed over time, record the dates.

### 3. Inspect suspect images in a safe environment

For representative suspect tags:

- pull the image locally
- create a disposable container
- inspect common leak paths:
  - `/usr/src/app/.env`
  - `/usr/src/app/.env.prod`
  - `/usr/src/app/.env.dev`
  - `/usr/src/app/.env.telemetry`
  - any copied home-directory or repo-private files
- inspect `docker history` and filesystem contents, not just final runtime env vars

The goal is not only to inspect one tag, but to establish which tag range is affected by the bad build pattern.

### 4. Classify trust boundaries

Place each tag or digest into one of:

- trusted
- untrusted due to confirmed env leakage
- untrusted due to missing evidence but built before the hardening fix

### 5. Decide retirement policy

Define which tags must never be reused and whether the affected repository needs cleanup, visibility changes, or credential changes.

## Evidence To Collect

- Image inventory table
- Registry visibility and access summary
- Container inspection output showing presence or absence of `.env*`
- Final trusted vs untrusted image list

## Done Criteria

- There is a definitive or conservative classification for every image that could have been deployed
- The team knows whether the likely leak path was registry/image-based
- Old untrusted tags are documented as forbidden for future deploys

## If Blocked

- If the registry has no useful access logs, proceed with conservative classification
- If a historical image cannot be pulled, treat it as untrusted if it predates the hardening fix
- If multiple repositories were used, audit all of them before clearing prod

## Outputs For Next Steps

- Trusted image baseline for `sec06`
- Registry hardening recommendations for `sec07`
