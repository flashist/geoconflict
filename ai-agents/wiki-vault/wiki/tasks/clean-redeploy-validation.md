# Clean Rebuild, Redeploy, And Validation

**Source**: `ai-agents/tasks/done/sec06-clean-rebuild-redeploy-and-validation.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Move production onto a trusted post-hardening image built with rotated credentials, validated artifacts, and no reliance on incident-era tags.

## Key Changes

- Defined the trusted-build requirements around new tags, recorded commit and digest provenance, and explicit inspection for `.env*` leakage before rollout.
- Captured the required post-deploy checks for `/api/env`, `/api/public_lobbies`, browser load, login or auth flow, and a gameplay smoke test.
- Turned credential invalidation and image trust into part of the validation checklist rather than treating the redeploy as complete after the container starts.

## Outcome

The recovery notes moved the live path onto a post-fix trusted repo state and made validation part of the incident closure. The associated postmortem records successful hardened dev and prod redeploys plus telemetry recovery, with the running image and old credential invalidation treated as evidence, not assumptions.

## Related

- [[decisions/vps-credential-leak-response]] — incident response and trusted recovery workflow
