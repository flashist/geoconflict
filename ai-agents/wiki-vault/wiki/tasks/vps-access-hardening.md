# VPS Access Audit And Host Hardening

**Source**: `ai-agents/tasks/done/sec03-vps-access-audit-and-hardening.md`
**Status**: done
**Sprint/Tag**: Security incident

## Goal

Treat the production VPS as potentially accessed, reconstruct the host-access timeline, and harden the machine so it no longer depends on password-based trust assumptions.

## Key Changes

- Defined the host-audit checklist around SSH logs, session history, authorized keys, users, sudo access, cron or systemd persistence, runtime containers, and deploy leftovers.
- Required explicit inspection of current container image digests, env-file references, and any temporary deploy artifacts still present on disk.
- Set the target host posture to key-based SSH, reduced user surface, limited exposed ports, and no silent reliance on password auth.

## Outcome

This task established the trust gate for redeploy: either the host is reviewed and hardened into a known-good state, or it is replaced instead of being cleaned in place. That rule kept the incident response anchored in operational evidence instead of assuming the host was safe because the leak path was probably image-based.

## Related

- [[decisions/vps-credential-leak-response]] — incident response decision that required conservative host handling
