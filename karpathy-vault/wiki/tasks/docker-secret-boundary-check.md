# CI Docker Secret Boundary Check

**Source**: `ai-agents/tasks/done/sec08-ci-docker-secret-boundary-check.md`
**Status**: done
**Sprint/Tag**: Security follow-up

## Goal

Prevent future Docker changes from silently reintroducing secret-bearing build contexts or broad repo copies.

## Key Changes

- Added `scripts/check-docker-secret-boundary.sh` to fail on broad `COPY . .` or `ADD . .` patterns and to require critical `.dockerignore` exclusions.
- Added a repeatable runtime-image inspection step that verifies `.env*` and `*.secret` files are absent from the built image.
- Wired the guard into `build.sh` and exposed a standalone `npm run check:docker-secret-boundary` entry point for local and CI usage.

## Outcome

The Docker hardening is no longer just a one-time fix. It now has an automated regression guard that blocks the exact class of mistake that made the incident possible in the first place.

## Related

- [[decisions/vps-credential-leak-response]] — incident that motivated the regression guard
- [[tasks/incident-postmortem-followups]] — closure task that created this follow-up track
