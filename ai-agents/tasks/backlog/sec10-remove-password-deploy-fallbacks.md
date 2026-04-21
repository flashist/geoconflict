# Task — Remove Password Deploy Fallbacks

## Type
Security hardening follow-up.

## Purpose

Finish the shift from password-based deploys to SSH-key-only deploys.

## Why This Matters

The repo now treats password auth as deprecated, but fallback code and flags still exist. That leaves a weaker path available during future operational shortcuts.

## Actions

1. Confirm every environment has a working SSH-key deploy path.
2. Remove `sshpass`-based fallback logic from `deploy.sh`, telemetry deploy, and telemetry tunnel tooling.
3. Remove `ALLOW_SSH_PASSWORD_FALLBACK` and related emergency flags.
4. Clean up examples and docs so only the key-based path remains.

## Done Criteria

- all supported deploy flows are SSH-key-only
- password fallback code is removed from scripts
- docs no longer mention password-based deploys as an option

## Outputs

- final hardened deployment model
