# Profile Deploy Hardening Review-Loop Reset

**Date**: 2026-06-19
**Status**: accepted

## Context

The unmerged `task/profile-deploy-hardening` branch tried to harden the profile-backend deployment pipeline before the profile API had a real database consumer. The first roughly 12 hours produced useful deploy, rollback, secret-handling, image-scan, and concurrency properties. The following roughly 57 hours expanded into 19 review-fix commits and a 6,769-line net diff because an adversarial reviewer had no fixed acceptance criteria, the branch was monolithic, hypothetical T5 database concerns were treated as T4 blockers, and heuristic parsers were hardened as if they were authoritative security oracles.

Source: `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`

## Decision

Stop and revert the monolithic T4 attempt. Resume profile infrastructure as independently shippable T4a–T4i slices. T4a through T4i are now complete, including argv/concurrency hardening, game-server deploy environment propagation, and operator bring-up ~~of the live host~~ 🔴 **CORRECTED 2026-09-04: whether the host that bring-up produced is still serving the stack is UNVERIFIED.** ⚠️ *(This supersedes an earlier same-day annotation here reading "NO LONGER STANDS"; that overstated the owner's position and is withdrawn.)* Owner rulings, both live in session 2026-09-04 and both standing: *"We don't have ANY profile-related VPS yet…"*, then *"the VPS and S3 I created will be reused."* **Reconciled: the box physically exists and is reused in place; its provisioning state is unknown and unverified.** ⛔ **The slices really shipped and the machinery is sound.** Wipe-and-rebuild **onto that existing box** tracked as `0213`–`0222` plus `0201`, Sprint 4.

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
- Profile infrastructure progressed through T4a server skeleton, T4b client API URL, T4c Docker image, T4d VPS/DNS, T4e deploy mechanics, T4f image-secret scanning, T4g argv/concurrency hardening, T4h game-server deploy environment propagation, and T4i operator bring-up. T4a–T4i are complete.
- T4d established the dedicated reg.ru host, DNS/TLS boundary, SSH-first firewall, swap, Docker, and dormant internal nginx allowlist. RU residency remains an operator precondition plus acceptance verification rather than a fragile script-side geo-IP API gate.
- T4e was split into T4e1 local build/push/digest, T4e2 on-box compose plus rollback lifecycle, and T4e3 SSH/SCP deploy wiring. Together they preserve digest pinning, fail-closed rollback, secret staging, and the TLS health milestone without reintroducing a monolithic review surface.
- T4f made the image layer byte scan the blocking oracle and left Dockerfile parsing as advisory-only, matching the postmortem decision to avoid an endless parser hardening loop.
- T4g completed the remaining argv-safety, deploy-locking, atomic-record, and wrong-host preflight requirements. T4h completed the game-server `PROFILE_API_URL` deploy gap. T4i completed the live-host health milestone.
- The exact disposition of the advisory Dockerfile parser and old doctrine remains an owner choice; neither should block the bounded T4 slices.
- Review termination is defined by fixed acceptance criteria, not by a reviewer's silence.

## Related

- [[decisions/sprint-4]] — profile-store track and T4a–T4i sequence
- [[systems/producer-workflow]] — task scoping, acceptance-criteria, and review-boundary guidance
- [[decisions/vps-credential-leak-response]] — security incident that established the underlying Docker secret-boundary requirements
- [[tasks/profile-server-skeleton]] — completed T4a liveness-only server foundation
- [[tasks/profile-api-url-config]] — completed T4b public runtime URL plumbing
- [[tasks/profile-docker-image]] — completed T4c allowlist-copy profile image
- [[tasks/profile-vps-provisioning]] — completed T4d box provisioning and network boundary
- [[tasks/profile-build-push-digest]] — completed T4e1 local build, push, and immutable digest resolution
- [[tasks/profile-onbox-stack-gate]] — completed T4e2 on-box stack, lifecycle, health gate, and rollback
- [[tasks/profile-deploy-wiring]] — completed T4e3 deploy transport and secret staging
- [[tasks/profile-image-secret-scan]] — completed T4f image byte-scan gate
- [[tasks/profile-deploy-hardening]] — completed T4g argv/concurrency and wrong-host hardening
- [[tasks/profile-game-server-deploy-env]] — completed T4h game-server deploy-env propagation
- [[tasks/profile-server-bring-up-runbook]] — completed T4i operator runbook and live host bring-up
- [[systems/player-profile-store]] — current profile API/Postgres architecture after T4/T5
