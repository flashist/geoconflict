# Task — Postmortem, Wiki Update, And Follow-Up Hardening

## Type
Documentation and closure runbook.

## Purpose

Close the incident with a concise postmortem, update the project knowledge base, and create follow-up tasks for anything not completed during the active response.

## Why This Matters

This incident exposed a repo and operational weakness that is easy to reintroduce later. The root cause, impact, and prevention steps need to be captured in project memory, not left in chat history.

## Inputs Required

- Evidence and outputs from `sec01` through `sec06`
- Final technical root-cause conclusion
- Final decision on password deploys and registry policy

## Preconditions

- The active incident is contained
- Production is running on a trusted post-fix image or there is an explicit documented blocker

## Actions

### 1. Write the short postmortem

Capture:

- incident summary
- impact and likely blast radius
- how the leak was detected
- confirmed and suspected leak paths
- immediate containment actions
- permanent fixes
- remaining risks

Keep it factual and short. Avoid speculative detail that was never verified.

### 2. Update the wiki through the existing workflow

Produce a knowledge-base or task-summary source file and ingest it into `karpathy-vault/` using the repo’s wiki process.

The wiki entry should preserve:

- the Docker build-context root cause
- the deploy-model hardening decision
- the final trusted deployment workflow

### 3. Create explicit follow-up backlog tasks

If any of these remain unfinished, create follow-ups:

- CI or preflight checks preventing `.env*` from entering Docker images
- registry scanning or policy checks
- removal of temporary deploy fallbacks
- documentation cleanup for public infra details
- secret-management improvements beyond `.env` files

### 4. Record final policy decisions

At minimum, record:

- whether password-based deploys are permanently banned
- whether real VPS IPs remain in repo docs
- whether registry visibility or access policy changed

## Evidence To Collect

- Final postmortem document
- Wiki ingest record
- Follow-up backlog item list
- Final policy decisions

## Done Criteria

- The incident has a durable written summary
- The wiki reflects the key findings and prevention decisions
- Any remaining hardening work is captured as concrete backlog items

## If Blocked

- If wiki ingest cannot happen immediately, still write the source document and record the exact pending ingest action
- If the root cause remains partially uncertain, separate confirmed facts from conservative assumptions clearly

## Outputs For Next Steps

- Durable project memory of the incident
- Clear follow-up queue for future hardening

## Implementation Notes

- Wrote the postmortem source document: `ai-agents/knowledge-base/security-vps-credential-leak-postmortem.md`
- Recorded the final root-cause conclusion as: unsafe Docker build context plus broad `COPY . .` around operator-local env files
- Captured final policy decisions:
  - real VPS IPs should not remain in repo docs
  - password deploys remain temporary emergency fallback only
  - pre-hardening images are untrusted
- Created explicit follow-up backlog tasks:
  - `sec08-ci-docker-secret-boundary-check.md`
  - `sec09-registry-visibility-and-image-retention-policy.md`
  - `sec10-remove-password-deploy-fallbacks.md`
  - `sec11-secret-management-beyond-env-files.md`
- Updated the wiki with a dedicated decision page and telemetry cross-reference

## Remaining Validation Gap

- `sec02` registry/image exposure work was not completed as a full historical forensic audit during the active incident; it has been converted into the follow-up policy task `sec09`
