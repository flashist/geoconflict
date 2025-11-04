# VPS Deployment Guide

This project now targets per-environment VPS instances (dev, staging, prod) that are reachable via IP address without Cloudflare tunnels or DNS subdomains. Each server runs the same Docker image and is configured through environment variables that describe the public endpoint and upstream API host.

## 1. Prepare Environment Variables

1. Copy `example.env` to `.env` and fill in global credentials (`SSH_KEY`, `DOCKER_*`, `ADMIN_TOKEN`, `API_KEY`, optional storage/telemetry keys).
2. For each environment (`DEV`, `STAGING`, `PROD`) provide:
   - `SERVER_HOST_<ENV>` – SSH hostname or IP of the VPS.
   - `PUBLIC_HOST_<ENV>` – Public IP/host players will use (defaults to `SERVER_HOST_<ENV>` when omitted).
   - `PUBLIC_PROTOCOL_<ENV>` – `http` or `https` (defaults to `http`).
   - `PUBLIC_PORT_<ENV>` – External port (defaults: `80` for http, `443` for https).
   - `DEPLOYMENT_ID_<ENV>` – Optional identifier used in container naming (defaults to the environment name).
   - `API_BASE_URL_<ENV>` / `JWT_ISSUER_<ENV>` / `JWT_AUDIENCE_<ENV>` – Override when the game server talks to a separate API host or expects a specific JWT audience.
3. Optional: `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` enable HTTP basic auth via `--enable_basic_auth` flag.

Environment overrides can live in `.env`, `.env.<env>`, or both. Values set in `.env.<env>` take precedence when deploying that environment.

## 2. Provision a VPS

Run the setup helper once per server to install Docker, create the `openfront` user, and configure telemetry:

```bash
scp setup.sh root@<server-ip>:/tmp/setup-openfront.sh
ssh root@<server-ip> "chmod +x /tmp/setup-openfront.sh && /tmp/setup-openfront.sh"
```

Ensure the `openfront` user can log in via SSH with the key referenced by `SSH_KEY`.

## 3. Build & Deploy

All build artifacts are published to Docker Hub (or your configured registry). Use the wrapper to build and deploy in a single step:

```bash
./build-deploy.sh dev
./build-deploy.sh staging
./build-deploy.sh prod --enable_basic_auth
```

The script generates a timestamped tag, pushes the image, uploads `update.sh`, and restarts the container on the target VPS. Internally it populates an environment file with:

- `GAME_ENV`, `DEPLOYMENT_ID`, `PUBLIC_HOST`, `PUBLIC_PROTOCOL`, `PUBLIC_PORT`
- API credentials (`API_BASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`)
- Storage & telemetry settings (`STORAGE_*`, `OTEL_*`)

To deploy an existing image without rebuilding, run:

```bash
./deploy.sh staging 20240301-120501
```

The tag accepts either a version string or a `sha256:` digest.

## 4. Runtime Behaviour

- `/api/env` now exposes `gameEnv`, `deploymentId`, `publicHost`, `publicProtocol`, `publicPort`, `apiBaseUrl`, `jwtIssuer`, and `jwtAudience`. The browser client uses these values to resolve the correct API base URL even when the game runs behind a raw IP address.
- Authentication cookies omit the `Domain` attribute when served from an IP, preventing invalid cookie scopes.
- The Docker image no longer bundles `cloudflared`; Nginx proxies requests directly to the workers.

## 5. Verification Checklist

1. `curl http://<public-ip>/api/env` returns the environment metadata above.
2. `curl http://<public-ip>/api/public_lobbies` responds (may be empty but should not error).
3. Visit `http://<public-ip>` in a browser and confirm static assets load.
4. Verify authentication flows:
   - Login
   - Logout (cookie cleared, redirect issued)
   - Discord login redirect (if configured in API)

If browser testing needs to be delegated, share the public IP, protocol, and any basic auth credentials with the testing agent.

## 6. Troubleshooting

- **Wrong API host:** Ensure `API_BASE_URL_<ENV>` or `JWT_ISSUER_<ENV>` points to the correct service. The client falls back to the container’s `PUBLIC_*` values only when runtime overrides are missing.
- **Cookie domain warnings:** Check that `JWT_AUDIENCE_<ENV>` contains a hostname (without protocol). For IP-only deployments it can be the IP or omitted—the client handles IP-based cookies.
- **Container not restarting after reboot:** The deploy script defaults to `--restart=always` for `prod` and `--restart=no` otherwise. Adjust logic in `update.sh` if you prefer different semantics.

Refer back to `docs/vps-migration-plan.md` for the architectural intent behind these changes.
