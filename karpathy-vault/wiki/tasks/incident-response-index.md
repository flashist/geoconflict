# Security Incident Response Index

**Source**: `ai-agents/tasks/done/sec00-incident-index.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Create one durable coordination page for the VPS credential leak response: shared evidence, task order, status tracking, and the working root-cause hypothesis.

## Key Changes

- Established the incident-wide evidence set around `build.sh`, `Dockerfile`, `deploy.sh`, and repo docs that described `VPS_IP`, `VPS_LOGIN`, and `VPS_PASSWORD` usage.
- Defined the response order as containment first, then registry audit, VPS audit, repo hardening, deploy hardening, clean redeploy, and final postmortem.
- Kept a single task tracker that recorded the evolving state of `sec01` through `sec07`, including the decision to convert the incomplete registry forensic work into a later policy follow-up.

## Outcome

The file served as the control plane for the incident and was later converted from an active dashboard into a closed summary. It preserves the final root-cause conclusion, points to the canonical postmortem, and records that the remaining hardening work was split into explicit follow-up tasks instead of being left as chat-only context.

## Related

- [[decisions/vps-credential-leak-response]] — final incident decision and postmortem
