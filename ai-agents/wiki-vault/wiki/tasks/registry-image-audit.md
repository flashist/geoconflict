# Registry Image Exposure Audit

**Source**: `ai-agents/tasks/done/sec02-registry-image-exposure-audit.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Determine whether leaked env values could have come from pushed Docker images and classify which historical tags and digests must be treated as unsafe.

## Key Changes

- Defined the image-audit workflow around registry visibility, historical tag inventory, representative image pulls, `docker history`, and filesystem inspection for `.env*` artifacts.
- Introduced the trust categories that later anchored the recovery workflow: trusted, untrusted due to confirmed leakage, and untrusted due to pre-hardening uncertainty.
- Recorded the need for an explicit retirement policy so old tags would not be reused casually after the incident.

## Outcome

The task framed the forensic work but did not complete a definitive historical image audit during the active response. Its practical result was a conservative operating rule: all pre-hardening images are untrusted, and the durable policy work moved into the follow-up registry policy task.

## Related

- [[decisions/vps-credential-leak-response]] — incident context and conservative image-trust stance
- [[decisions/registry-image-policy]] — follow-up policy that codified trusted vs untrusted image handling
