# Secret Rotation Inventory Template

Copy this file to a private location outside the repo before filling it in.

Do not commit real values, real account identifiers, real image digests, real suspicious IPs, or raw provider screenshots back into git.

## Incident

- Incident owner:
- Start timestamp:
- Current status:
- Private evidence location:

## Secret Inventory

| Secret / key name | Scope / system | Found in | Rotation owner | Rotated at | Old credential disabled? | Verification note | Blockers |
|---|---|---|---|---|---|---|---|
| `VPS_PASSWORD` | prod VPS | `.env.prod` |  |  |  |  |  |
| `SSH_KEY` / deploy key | prod VPS | operator machine |  |  |  |  |  |
| `DOCKER_TOKEN` | registry | `.env` |  |  |  |  |  |
| `ADMIN_TOKEN` | game server | `.env` / remote env file |  |  |  |  |  |
| `API_KEY` | game server | `.env` / remote env file |  |  |  |  |  |
| `STORAGE_ACCESS_KEY` | object storage | `.env` / remote env file |  |  |  |  |  |
| `STORAGE_SECRET_KEY` | object storage | `.env` / remote env file |  |  |  |  |  |
| `OTEL_AUTH_HEADER` | telemetry ingest | `.env` / setup.sh |  |  |  |  |  |
| `OTEL_PASSWORD` | telemetry | `.env` / remote env file |  |  |  |  |  |
| `FEEDBACK_WEBHOOK_URL` | webhook | `.env` / remote env file |  |  |  |  |  |
| `FEEDBACK_TELEGRAM_TOKEN` | Telegram | `.env` / remote env file |  |  |  |  |  |
| `TELEMETRY_VPS_PASSWORD` | telemetry VPS | `.env.telemetry` |  |  |  |  |  |
| `UPTRACE_PROJECT_TOKEN` | Uptrace | `.env.telemetry` |  |  |  |  |  |
| `UPTRACE_SECRET_KEY` | Uptrace | `.env.telemetry` |  |  |  |  |  |
| `UPTRACE_ADMIN_PASSWORD` | Uptrace | `.env.telemetry` |  |  |  |  |  |

Add rows for any other real secrets discovered on the operator machine, in CI, or in provider dashboards.

## Immediate Containment Checklist

- [ ] Deploys frozen until rotation complete
- [ ] Telemetry redeploys frozen until telemetry secrets rotate
- [ ] Old prod VPS password invalidated
- [ ] Password SSH disabled or tracked as blocker
- [ ] Old Docker token invalidated
- [ ] Old runtime app secrets invalidated
- [ ] Old telemetry / Uptrace secrets invalidated
- [ ] Local operator env files replaced with new values

## Validation Notes

- How old credentials were verified as invalid:
- Which systems were tested with new credentials:
- Which credentials are still pending:

## Follow-Up Needed

- Remaining blockers:
- Owner:
- ETA:
