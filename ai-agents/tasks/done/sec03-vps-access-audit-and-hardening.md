# Task — VPS Access Audit And Host Hardening

## Type
Investigation and hardening runbook.

## Purpose

Determine whether the production VPS was accessed using leaked credentials and harden the host so it no longer relies on password-based deployment or stale trust assumptions.

## Why This Matters

Even if the leak came from a Docker image, the attacker had valid VPS credentials. The host must be treated as potentially accessed until logs, users, keys, and processes are reviewed.

## Inputs Required

- SSH access to the production VPS
- Access to the VPS provider console or rescue mode if needed
- The deployment user name and any expected SSH keys
- Approximate incident time window

## Preconditions

- Critical secrets rotated in `sec01`
- Maintain a command log of everything examined and changed
- Prefer read-first investigation before cleanup

## Actions

### 1. Build the host access timeline

Inspect:

- `auth.log`, `secure`, `journalctl -u ssh`, or distro-equivalent SSH logs
- successful and failed login events
- source IPs for suspicious logins
- `last`, `lastb`, and equivalent session history
- any provider control-panel console logins if available

Record the earliest suspicious event and all accounts involved.

### 2. Audit users and keys

Inspect:

- `/root/.ssh/authorized_keys`
- `/home/openfront/.ssh/authorized_keys`
- any other real user home directories
- `/etc/passwd`
- `/etc/sudoers*`
- group memberships for deploy and admin users

Remove unknown keys and unknown users only after evidence is saved.

### 3. Audit persistence and runtime state

Inspect:

- running containers and container restart policies
- systemd services and timers
- cron jobs in user and system crontabs
- recently modified files in `/root`, `/home/openfront`, `/etc`, and app-related directories
- shell history files
- listening ports and unexpected network services

Specifically check whether temporary deploy env files still exist anywhere, including the deploy user home directory.

### 4. Audit current app/container configuration

Inspect:

- current container image digest
- container env and env-file references
- mounted volumes and startup scripts
- Nginx and supervisor config

Confirm whether any leaked or stale env files are still present on disk or inside the running container.

### 5. Harden SSH and host access

Move to the secure target state:

- key-based SSH only
- password auth disabled
- root SSH login disabled unless there is a documented emergency exception
- only intended deploy/admin users remain
- firewall reduced to required ports only

## Evidence To Collect

- Access timeline with suspicious and expected logins
- Authorized key inventory before and after cleanup
- List of unexpected processes, services, or files found
- Proof of final SSH config state
- Current container image digest and runtime summary

## Done Criteria

- The incident owner understands whether the host was likely accessed
- Unknown users, keys, and persistence mechanisms are removed
- Password SSH is disabled or explicitly tracked as a blocker with owner and ETA
- The running host configuration is documented and trusted enough for redeploy

## If Blocked

- If the host cannot be trusted after review, replace it instead of trying to clean it in place
- If logs are incomplete, assume access may have occurred and harden accordingly
- If SSH access breaks during key migration, use provider console access to recover and finish the hardening step

## Outputs For Next Steps

- Trusted host access model for `sec05`
- Host validation notes for `sec06`
