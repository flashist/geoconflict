# Incident Postmortem And Follow-Up Hardening

**Source**: `ai-agents/tasks/done/sec07-postmortem-wiki-and-follow-ups.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Close the leak response with a durable postmortem, update the project knowledge base, and convert unfinished hardening into explicit backlog tasks.

## Key Changes

- Authored `ai-agents/knowledge-base/security-vps-credential-leak-postmortem.md` as the canonical summary of the incident, blast radius, fixes, and remaining risks.
- Captured the final policy positions that came out of the response: no real VPS IPs in repo docs, password deploys only as a temporary emergency fallback, and pre-hardening images treated as untrusted.
- Created explicit follow-up backlog items for CI Docker secret-boundary checks, registry image policy, password-fallback removal, and longer-term secret-management improvements.

## Outcome

This task converted the incident from chat-driven response work into durable project memory. It also split the remaining hardening into concrete follow-up tracks instead of leaving "do later" guidance embedded in the postmortem.

## Related

- [[decisions/vps-credential-leak-response]] — canonical incident decision and postmortem page
- [[decisions/registry-image-policy]] — follow-up policy created after the incident
- [[tasks/docker-secret-boundary-check]] — CI/preflight guard created from the follow-up list
- [[tasks/registry-image-policy-followup]] — registry trust and retention policy follow-up from the incident closure task
