# Profile Deploy Hardening Review-Loop Reset

**Date**: 2026-06-19
**Status**: accepted

## Context

The unmerged `task/profile-deploy-hardening` branch tried to harden the profile-backend deployment pipeline before the profile API had a real database consumer. The first roughly 12 hours produced useful deploy, rollback, secret-handling, image-scan, and concurrency properties. The following roughly 57 hours expanded into 19 review-fix commits and a 6,769-line net diff because an adversarial reviewer had no fixed acceptance criteria, the branch was monolithic, hypothetical T5 database concerns were treated as T4 blockers, and heuristic parsers were hardened as if they were authoritative security oracles.

Source: `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`

## Decision

Stop and revert the monolithic T4 attempt. Resume profile infrastructure as independently shippable T4a–T4g slices. T4a through T4d are now complete; the remaining sequence starts with T4e deploy mechanics.

For each remaining deploy slice:

- define its threat model and acceptance criteria before review
- cap review at two rounds; the second round ends with explicit residuals rather than an open-ended third pass
- review one small, mergeable unit at a time so the review surface shrinks
- classify findings by severity, reachability, and residual defenses instead of treating every hypothetical edge as a blocker
- let authoritative checks gate the change and freeze or remove advisory heuristics that create parser arms races
- defer rich `DATABASE_URL` validation and `/ready` behaviour to T5, where a real `pg` consumer exists

The restart should preserve the proven properties from the abandoned branch: secrets stay out of argv; deploy and rollback use immutable digests; unhealthy deploys fail closed and roll back without deleting the data volume; the image boundary is checked against actual layer bytes; deploy records are lock-serialized and atomic; and images target `linux/amd64`.

## Consequences

- The abandoned branch and its large doctrine are historical evidence, not implementation law and not a source to merge wholesale.
- Profile infrastructure progresses through T4a server skeleton, T4b client API URL, T4c Docker image, T4d VPS/DNS, T4e deploy mechanics, T4f image-secret scanning, and T4g argv/concurrency hardening. T4a–T4d are complete.
- T4d established the dedicated reg.ru host, DNS/TLS boundary, SSH-first firewall, swap, Docker, and dormant internal nginx allowlist. RU residency remains an operator precondition plus acceptance verification rather than a fragile script-side geo-IP API gate.
- The exact disposition of the advisory Dockerfile parser and old doctrine remains an owner choice; neither should block the bounded T4 slices.
- Review termination is defined by fixed acceptance criteria, not by a reviewer's silence.

## Related

- [[decisions/sprint-4]] — profile-store track and T4a–T4g sequence
- [[systems/producer-workflow]] — task scoping, acceptance-criteria, and review-boundary guidance
- [[decisions/vps-credential-leak-response]] — security incident that established the underlying Docker secret-boundary requirements
- [[tasks/profile-server-skeleton]] — completed T4a liveness-only server foundation
- [[tasks/profile-api-url-config]] — completed T4b public runtime URL plumbing
- [[tasks/profile-docker-image]] — completed T4c allowlist-copy profile image
- [[tasks/profile-vps-provisioning]] — completed T4d box provisioning and network boundary
- [[tasks/profile-build-push-digest]] — completed T4e1 local build, push, and immutable digest resolution
