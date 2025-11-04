# VPS Deployment & Cloudflare Removal Plan

## Goals
- Serve each environment (`dev`, `staging`, `prod`) from its own VPS reachable via IP address only.
- Eliminate every runtime build and deployment dependency on Cloudflare services (tunnels, DNS automation, R2-specific assumptions).
- Preserve existing build, release, and gameplay functionality across client and server components.

## Current State Snapshot
- Docker image bundles `cloudflared` and expects Cloudflare tunnel credentials at runtime (`Dockerfile`, `update.sh`, `Cloudflare.ts`).
- Deployment scripts (`build.sh`, `deploy.sh`, `update.sh`) pass Cloudflare-specific environment variables and require a `SUBDOMAIN`.
- Server boot sequence (`Server.ts`) provisions tunnels on non-dev environments; `Cloudflare.ts` manages tunnel lifecycle and DNS.
- Client authentication helpers (`src/client/jwt.ts`) assume domain-based routing (`api.<domain>`), which breaks when served via bare IPs.
- Configuration layer exposes Cloudflare-centric getters (`cloudflareAccountId`, `cloudflareConfigPath`, `r2Endpoint`, etc.) and ties the CDN domain into cookie handling.

## Target Architecture
- Each VPS runs a single container exposing HTTP(S) on port 80/443 through Nginx; no Cloudflare sidecars or DNS automation.
- Environment metadata (IPs, ports, JWT audience, API origin) provided through explicit configuration files or env vars rather than derived subdomains.
- Client runtime derives API endpoints from configuration that supports domains _and_ raw IP addresses.
- Build pipeline continues to publish Docker images; deployment scripts copy an env bundle tailored per VPS/IP and restart the container without tunnel volumes.
- Optional object storage integrations are abstracted (Cloudflare R2 replaced by generic S3-compatible configuration with sensible defaults).

## Implementation Steps
1. **Configuration Refactor**
   - Replace Cloudflare-specific getters with provider-agnostic settings (API base URL, public host/IP, S3-compatible storage config).
   - Update `.env` templates and config loaders to support per-environment IP metadata and revised JWT audience handling.
2. **Runtime Cleanup**
   - Remove `Cloudflare.ts` usage and tunnel bootstrapping from `Server.ts`.
   - Adjust OTEL and archive metadata to rely on new host/IP fields rather than subdomains.
3. **Docker Image Simplification**
   - Delete `cloudflared` installation and volume setup from the Dockerfile.
   - Ensure startup scripts and supervisor config still run Node + Nginx without tunnel prerequisites.
4. **Deployment Script Updates**
   - Simplify `build.sh`, `deploy.sh`, `update.sh` to drop tunnel credentials and subdomain requirement.
   - Introduce per-environment IP awareness (e.g., `SERVER_HOST_PROD_IP`) and container naming tied to environment.
   - Validate `setup.sh` no longer tunes kernel parameters solely for Cloudflare.
5. **Client & Server URL Handling**
   - Update client helpers (`jwt.ts`) to correctly detect IP-based hosts and respect configurable API origins.
   - Revisit cookie domain handling to accommodate IP-based deployments.
6. **Documentation & Tooling**
   - Refresh `README.md` / deployment docs with new workflow (per-VPS IP deployment) and configuration instructions.
   - Provide migration notes outlining required VPS setup and env var changes.
7. **Validation**
   - Run unit tests (`npm test`) and lint/format checks.
   - Perform container build locally, then run smoke test (curl health endpoints) to ensure server boots without Cloudflare.
   - Prepare browser testing instructions for Atlas (connecting via IP, verifying auth, gameplay basics).

## Open Questions / Assumptions
- HTTPS termination strategy per VPS (self-signed vs. managed certs) still to be defined; plan assumes HTTP or pre-provisioned TLS.
- Replacement for Cloudflare R2 depends on available infrastructure; defaulting to optional S3-compatible configuration unless otherwise specified.
- OTP/telemetry endpoints remain unchanged; revisit if they used Cloudflare-specific networking.

