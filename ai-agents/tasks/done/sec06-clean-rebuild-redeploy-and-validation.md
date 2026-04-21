# Task — Clean Rebuild, Redeploy, And Validation

## Type
Execution and validation runbook.

## Purpose

Rebuild and redeploy production from a trusted repo state, trusted credentials, and trusted image tags only.

## Why This Matters

Containment and hardening do not complete the incident on their own. Production must be moved onto a clean image built after the Docker and deploy fixes, using only rotated credentials.

## Inputs Required

- Completion evidence from `sec01`
- Trusted image policy from `sec02`
- Trusted host state from `sec03`
- Hardened repo changes from `sec04`
- Hardened deploy model from `sec05`

## Preconditions

- No old tags or digests may be reused
- All required secrets must already be rotated
- The current operator machine must hold only the new trusted env values

## Actions

### 1. Build from the hardened repo state

Create a fresh image after the Docker hardening change is merged.

Requirements:

- use a new tag namespace or clearly new tags
- do not rebuild from an old workspace snapshot
- record the exact git commit and digest

### 2. Validate the new image before prod rollout

In a safe environment:

- inspect the image filesystem for `.env*`
- verify runtime boot
- verify the expected static and server assets exist

### 3. Redeploy production

Deploy only the newly trusted image to prod using the hardened deploy path.

Record:

- tag
- digest
- deploy timestamp
- operator

### 4. Verify runtime correctness

Run the post-deploy checks:

- `curl /api/env`
- `curl /api/public_lobbies`
- basic browser load
- auth/login flow if configured
- one gameplay smoke test

### 5. Verify the incident-specific security outcomes

Confirm:

- old rotated credentials no longer work
- the running container does not contain `.env*`
- old untrusted tags are not referenced by scripts or deploy notes

## Evidence To Collect

- New trusted image tag and digest
- Post-deploy validation notes
- Proof of `.env*` absence from the deployed image/container
- Proof that old credentials fail

## Done Criteria

- Prod runs on a new trusted image built after hardening
- Validation checks pass
- The deployment uses only new credentials and approved access methods
- No old untrusted image is part of the live path

## If Blocked

- If prod cannot be trusted in place, deploy onto a fresh VPS instead of reusing the current one
- If browser validation is blocked, still complete server-side checks and create a short follow-up validation task

## Outputs For Next Steps

- Final technical resolution summary for `sec07`
