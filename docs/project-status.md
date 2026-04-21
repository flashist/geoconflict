# GeoConflict Project Status

_Last updated: 2025-11-03_

## Project Overview
- **Game**: GeoConflict – fork of OpenFront (real-time strategy web game).
- **Tech stack**: Node.js, TypeScript, Webpack, React client, Express/WS server, Nginx reverse proxy, Docker.
- **Licensing**:
  - Source code: GNU AGPL v3 with additional attribution clause (display “Based on OpenFront”, etc. on the main/title screen).
  - Assets: Creative Commons BY-SA 4.0 (credit original authors, share derivatives under same license).
  - Ensure build artifacts reference the commit (container writes `static/commit.txt`).

## Deployment Strategy
- Each environment (dev / staging / prod) runs on its own VPS and is accessed via IP.
- Docker image: `flashist/geoconflict-dev` (container name `geoconflict-<env>`).
- Build scripts (`build.sh`) push multi-arch images to Docker Hub.
- Deploy scripts (`deploy.sh`, `update.sh`) upload env files to the VPS and restart containers.
- Environment configuration stored in local gitignored env files. Sensitive overlays now live in `.env.secret` / `.env.<env>.secret`.
- `setup.sh` installs Docker, telemetry sidecars, provisions a swap file, and configures host-level Nginx to proxy `:80` to the container on `127.0.0.1:3000`.
- HTTP served directly from the container (port 80). HTTPS/TLS pending.

## Environments
| Environment | VPS Host/IP      | Public Endpoint            | Notes |
|-------------|------------------|----------------------------|-------|
| dev         | private          | private                    | Active. Access details are intentionally kept out of repo docs. |
| staging     | private / TBD    | private / TBD              | Needs VPS allocation. |
| prod        | private          | private                    | Access details are intentionally kept out of repo docs. |

### Environment Credentials
- `.env` – shared tokens (`DOCKER_USERNAME`, `DOCKER_TOKEN`, `ADMIN_TOKEN`, `API_KEY`, optional storage/telemetry defaults).
- `.env.<env>` – non-secret environment settings such as `VPS_IP`, `DOCKER_REPO`, `PUBLIC_HOST`, `API_BASE_URL`.
- `.env.secret` / `.env.<env>.secret` – gitignored secrets such as tokens and SSH key paths. Host passwords are deprecated and should not be part of the standard deploy path.

## Worklog & Status

### Completed ✅
- Removed Cloudflare dependency (deleted tunnel management code, updated Dockerfile/startup scripts).
- Refactored config system to support per-environment public host/IP metadata (`RuntimeConfig`, `/api/env` updates).
- Adjusted client (`src/client/jwt.ts`) for IP-based deployments, safe cookies, and runtime API resolution.
- Updated deployment tooling:
  - `deploy.sh` now treats SSH keys as the supported deploy path and only allows password fallback with explicit opt-in.
  - `update.sh` ensures containers publish port 80 and names them `geoconflict-<env>`.
- Added operational docs: `docs/vps-migration-plan.md`, `docs/vps-deployment-guide.md`.
- Validated lint/tests (`npm run lint`, `npm test -- --runInBand`).
- Live dev environment redeployed and serving `/api/env`.
- Implemented single-play missions with deterministic map selection and nation difficulty ramp.
- Added max troops display to Player Info Overlay.
- Appended difficulty markers to nation names (E/M/H/I).
- Added bomb planning trajectory preview matching the in-flight nuke path.

### In Progress 🟡
- Manual verification of gameplay flows on dev VPS (browser smoke test via Atlas or human).
- Documenting operational runbooks for staging/prod (pending VPS info).
- Tracking license compliance checklist in UI (attribution still needs to be confirmed in-game).

### Backlog / Open Tasks 📝
1. Provision staging & production VPSes, populate `.env`, and run initial deploys.
2. Add HTTPS termination strategy (e.g., Caddy or Nginx + Certbot); update scripts accordingly.
3. Automate smoke tests (Atlas script or Playwright) post-deploy.
4. Confirm/implement in-game attribution text per license.
5. Monitor/logging enhancements (promtail/otel traces) once staging/prod up.

## Version Notes
- **0.0.10 (unreleased)**
  - Public lobbies now inject AI players during the countdown; AI players are indistinguishable in UI and appear in leaderboards.
  - Anonymous name ranges: humans use `Anon1000–Anon9999`; AI players use `Anon0000–Anon0999`.
- **0.0.9**
  - Client now reads the platform-provided player name (e.g., Yandex Games) before falling back to local storage or generated names.
  - Leaderboard plumbing added: participation (+1) and placement (+10/+5/+2 for 1st/2nd/3rd) hooks call the platform leaderboard API via `FlashistFacade` (Yandex SDK). Bots are ignored; only the local player is scored.
  - Usernames now accept full Unicode letters/numbers (Cyrillic included) while keeping profanity/length checks.
  - Jest: flag SVG check can be skipped with `SKIP_FLAG_TESTS=1 npm test -- --runInBand` (assets still missing).

## How to Work With This Repo
### Local Setup
```bash
npm install
npm run dev          # runs combined client/server (dev mode)
npm run lint
npm test -- --runInBand
```

### Build & Deploy
```bash
# Build + deploy dev with timestamp tag
./build-deploy.sh dev

# Deploy existing tag (no rebuild)
./deploy.sh dev <tag>
```
- Requires Docker daemon and Docker Hub credentials (`DOCKER_TOKEN` or prior `docker login`).
- Standard deploys use SSH keys. Password-based SSH is deprecated emergency fallback only.

### Remote Validation Checklist
1. `ssh <user>@<ip>` → `docker ps` (`geoconflict-<env>` should show `0.0.0.0:80->80/tcp`).
2. `curl http://<ip>/api/env` (verify metadata).
3. Browser visit `http://<ip>` → confirm assets/auth.

## Reference Docs
- `docs/vps-migration-plan.md` – design/implementation notes for Cloudflare removal.
- `docs/vps-deployment-guide.md` – detailed operator workflow.
- `LICENSE`, `LICENSE-ASSETS` – licensing terms.

Keep this file updated as environments evolve or new tasks are added. Feel free to append “Decision Log” entries for significant changes.
