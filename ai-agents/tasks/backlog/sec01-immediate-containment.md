# Task — Immediate Containment And Secret Rotation

## Type
Urgent incident-response runbook.

## Purpose

Contain the incident before deeper investigation by rotating or invalidating every secret that could have been exposed through `.env`, `.env.prod`, the VPS, or a pushed Docker image.

## Why This Matters

If the attacker copied `VPS_*` from a leaked env file, they may also have seen every other secret stored alongside it. Containment must happen before root-cause analysis or repo cleanup.

## Inputs Required

- Current contents of `.env`
- Current contents of `.env.prod`
- Access to the VPS provider, registry, telemetry, storage, Telegram/webhook providers, and any admin backends
- Access to the deploy operator machine that normally runs `build.sh` / `deploy.sh`

## Preconditions

- Stop normal deployments until containment completes
- Assume all secrets in the current env files are compromised
- Create a temporary secure note or spreadsheet to track rotations, owners, and timestamps

## Actions

### 1. Inventory everything that must be rotated

From `.env`, `.env.prod`, and any adjacent operator-only files, build the master list:

- `VPS_PASSWORD`
- any SSH private keys used for deploys or copied to the host
- `DOCKER_TOKEN`
- `ADMIN_TOKEN`
- `API_KEY`
- `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`
- `OTEL_USERNAME`, `OTEL_PASSWORD`, `OTEL_ENDPOINT`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_AUTH_HEADER`
- `FEEDBACK_WEBHOOK_URL`
- `FEEDBACK_TELEGRAM_TOKEN`
- `FEEDBACK_TELEGRAM_CHAT_ID`
- `TELEGRAM_PROXY_URL`
- any secrets found in `.env.telemetry` or provider dashboards

Do not skip items just because they look low risk.

### 2. Rotate the SSH and VPS access layer first

- Change the VPS password immediately
- If password auth is currently enabled, disable it after a key-based path is confirmed
- Review all authorized SSH keys and remove unknown ones
- If trust in current keys is low, replace them as well

### 3. Rotate external service tokens

Rotate all provider-side credentials that appear in env files:

- Docker registry token
- storage credentials
- OTEL or Uptrace auth
- webhook and Telegram credentials
- app admin tokens and API keys

Where rotation is impossible, invalidate the old credential and create a replacement.

### 4. Replace local operator env files

- Generate clean replacement values
- Update local operator env files only after provider-side rotation is complete
- Mark old env files as obsolete and archive them securely if needed for forensic reference

### 5. Freeze unsafe deploy paths

Until `sec04` and `sec05` are complete:

- do not run `build.sh` from a workstation that still has old secrets
- do not deploy from old images or old tags
- do not use password-based SSH if a key-based path exists

## Evidence To Collect

- Rotation sheet with secret name, owner, rotation timestamp, and status
- Confirmation that old credentials fail
- Screenshot or command output proving password SSH is disabled, if completed here
- Notes on any credentials that could not yet be rotated and why

## Done Criteria

- Every secret in `.env` and `.env.prod` is either rotated or explicitly listed as blocked with owner and ETA
- The old VPS password no longer works
- Deploy operators are using only new secret values
- Unsafe deploy activity is paused until the clean rebuild path is ready

## If Blocked

- If a provider credential cannot be rotated immediately, disable or restrict the integration if possible
- If SSH key-only access cannot be enabled immediately, reduce access by IP or firewall rules while the VPS audit proceeds
- If the host trust level is too low, treat replacement of the VPS as a valid containment path

## Outputs For Next Steps

- Clean secret inventory for `sec06`
- Confirmed list of deprecated credentials to verify as invalid during validation
