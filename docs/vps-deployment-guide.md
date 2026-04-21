# VPS Deployment Guide

This project now targets per-environment VPS instances (dev, staging, prod) that are reachable via IP address without Cloudflare tunnels or DNS subdomains. Each server runs the same Docker image and is configured through environment variables that describe the public endpoint and upstream API host.

## 1. Prepare Environment Variables

1. Copy `example.env` to `.env` and fill in values that are shared across every environment (`SSH_KEY`, `SSH_USER`, `DOCKER_USERNAME`, `DOCKER_TOKEN`, `ADMIN_TOKEN`, `API_KEY`, optional storage/telemetry keys, default `PUBLIC_PROTOCOL` / `PUBLIC_PORT`, etc.).
2. Create one file per environment (`.env.dev`, `.env.staging`, `.env.prod`). Each file should at minimum define:
   - `VPS_IP` or `SERVER_HOST_<ENV>` – SSH hostname or IP of the VPS you are deploying to.
   - `DOCKER_REPO` – image repository/tag suffix for that environment (e.g. `geoconflict-dev`, `geoconflict-prod`).
   - Optional overrides such as `SSH_USER`, `SSH_KEY_<ENV>`, `PUBLIC_HOST`, `PUBLIC_PROTOCOL`, `PUBLIC_PORT`, `DEPLOYMENT_ID`, `API_BASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `BASIC_AUTH_*`.
3. Keep high-value secrets in gitignored overlay files such as `.env.secret`, `.env.prod.secret`, and `.env.telemetry.secret`.
4. Deployment scripts load `.env`, `.env.secret`, `.env.<env>`, and `.env.<env>.secret` in that order, so environment-specific values override shared defaults.

Password-based SSH is no longer the normal deploy path. If you temporarily need it for emergency recovery, keep the password only in a gitignored secret file and opt in explicitly with `ALLOW_SSH_PASSWORD_FALLBACK=1`.

## 2. Provision a VPS

Run the setup helper once per server to install Docker, create the `openfront` user, configure telemetry, provision a swap file, **and** set up a host-level Nginx reverse proxy that forwards `:80` to the container on `127.0.0.1:3000`:

```bash
scp setup.sh root@<server-ip>:/tmp/setup-openfront.sh
ssh root@<server-ip> "chmod +x /tmp/setup-openfront.sh && /tmp/setup-openfront.sh"
```

Ensure the deploy user can log in via SSH with the key referenced by `SSH_KEY` or `SSH_KEY_<ENV>`. After the script finishes, `swapon --show` should list `/swapfile` and `systemctl status nginx` should report a listener on port 80 that proxies to the container.

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

For `prod`, prefer deploying by digest when you have the trusted digest recorded:

```bash
./deploy.sh prod sha256:<trusted-digest>
```

Registry trust and retention rules are documented in [docs/security/registry-image-policy.md](docs/security/registry-image-policy.md).

If `deploy.sh` sees only a password and no SSH key, it now fails by default with an explicit message. That is intentional. The supported happy path is SSH-key-based deploy.

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

- **Wrong API host:** Ensure the per-environment env file sets `API_BASE_URL` / `JWT_ISSUER` (or the legacy `*_ENV` variants) to the correct service. The client falls back to the container’s `PUBLIC_*` values only when runtime overrides are missing.
- **Cookie domain warnings:** Check that `JWT_AUDIENCE_<ENV>` contains a hostname (without protocol). For IP-only deployments it can be the IP or omitted—the client handles IP-based cookies.
- **Container not restarting after reboot:** The deploy script defaults to `--restart=always` for `prod` and `--restart=no` otherwise. Adjust logic in `update.sh` if you prefer different semantics.

Refer back to `docs/vps-migration-plan.md` for the architectural intent behind these changes.
