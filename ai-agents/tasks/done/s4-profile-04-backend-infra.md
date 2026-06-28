# Task — Player Profile: Backend Infrastructure (T4)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 4 of 8. Implements the **ops half of Part D** and the **Infrastructure Decision**.

## Sprint
Sprint 4

## Priority
High — the dedicated backend box everything server-side depends on. Pure ops; can run in parallel with the client track (T1→T2).

## Depends on
None (needs a provisioned reg.ru VPS + DNS control for `geoconflict.ru`).

## Blocks
T5 (DB + API), T8 (backups).

## Context
Per the Infrastructure Decision, the profile store and backend run on a **dedicated reg.ru VPS, separate from the game servers**, served publicly via `api.geoconflict.ru` (Yandex Games disallows raw-IP calls). Mirror the telemetry box's deployment pattern — do **not** invent a parallel approach, and do **not** co-locate on the game VPS. The prior telemetry OOM was a low-RAM reg.ru box, so bake in swap + Postgres memory caps from the start.

## Scope
1. **Provision the VPS** (reg.ru, Russia). Mirror `setup-telemetry.sh`: Docker, a swapfile, firewall, and nginx with Let's Encrypt TLS for `api.geoconflict.ru`. Point the `api.geoconflict.ru` DNS A-record at the box.
2. **Deploy pipeline:** `setup-profile.sh` (remote provisioning) + `build-deploy-profile.sh` (local build/deploy), mirroring `setup-telemetry.sh` / `build-deploy-telemetry.sh`.
3. **`docker-compose.yml` on the box:**
   - `postgres:16-alpine`, named volume `postgres_data`, bound to `127.0.0.1` only.
   - profile API service (Node) skeleton in `src/profile-server/` with a `/health` endpoint.
   - nginx terminating TLS for `api.geoconflict.ru`, reverse-proxying to the API service.
   - Conservative Postgres memory config (small `shared_buffers`, small `work_mem`, small fixed pool).
4. **Config / secrets** (follow the layered `.env.secret` pattern):
   - `PROFILE_API_URL` (e.g. `https://api.geoconflict.ru`) in the env config, exposed to the client via `/api/env`.
   - `DATABASE_URL` **on the profile box only** (game servers never get DB creds).
   - `PROFILE_INTERNAL_TOKEN` service secret (shared with the game server for T6's internal endpoint).

## Out of scope
- Schema/migration, repository, real endpoints (T5).
- Backups (T8).
- Any game-server code.

## Acceptance / Verification
- `https://api.geoconflict.ru/health` returns 200 over valid TLS.
- Postgres reachable on `127.0.0.1` on the box, not from the public interface.
- `build-deploy-profile.sh` reproducibly deploys; box has swap + Postgres memory caps applied.

## Notes
- Reference: `project_telemetry_deploy.md`, `project_telemetry_oom_root_cause.md`, `project_vps_hosting_region.md`.
- Internal crediting endpoints (added in T5/T6) must later be IP-allowlisted to the game-server VPS; provision firewall hooks accordingly. WireGuard between game↔profile is optional (latency is irrelevant intra-Moscow; this is purely integrity).
