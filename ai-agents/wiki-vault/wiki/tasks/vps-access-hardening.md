# VPS Access Audit And Host Hardening

**Source**: `ai-agents/tasks/done/0132-vps-access-audit-and-hardening/brief.md`
**Status**: done
**Sprint/Tag**: Security incident

> ⚠️ *2026-10-13 sync — **the key-based target posture was not reached on the game and telemetry boxes.** On 2026-10-12 they still allowed password login, including for root, with no `authorized_keys`, ufw inactive, and fail2ban installed by hand (game). Key login: `0441` → `0445`; passwords off: `0442`; scripted rebuild: `0446`; login alerts: `0443` — [[tasks/deploy-ssh-key-login]], [[tasks/ssh-security-alerts]]. The profile box is key-only (`0221`).*

> 📌 *2026-10-14 sync:* key login is **now in effect** on the game and telemetry boxes — `0445` installed keys for
> root, proved key-only login and deployed all three boxes over the key on 2026-10-13 ([[tasks/ssh-key-login-live]]).
> Password login is **still on**. Turning it off is built (`0442`, [[tasks/ssh-password-login-off]]) and waits on its box steps (`0452`).

> 📌 *2026-10-15 sync:* password login is **off on telemetry and game dev since 2026-10-15** (`0452`: V2–V4 passed on both — key login works, a password-only login gets `Permission denied (publickey)`, effective `sshd -T` shows `passwordauthentication no`). **Game prod still accepts passwords** until its weekend-slot step (`0452`, [[tasks/ssh-password-login-off]]); its fail2ban re-check is `0462`.

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
- [[tasks/deploy-ssh-key-login]] — task `0441` (2026-10-12): key login for game + telemetry deploys
- [[tasks/ssh-security-alerts]] — task `0443` (2026-10-12): login and fail2ban alerts on all boxes; its inventory
- [[tasks/ssh-key-login-live]] — task `0445` (2026-10-13): key login now in effect on game + telemetry
- [[tasks/ssh-password-login-off]] — task `0442`: password login off — built, box steps `0452`
