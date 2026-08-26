# Task — Profile Backend Infra: VPS provisioning bring-up (T4d)

## ID
0176

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D, step 1). Sub-task of `0172-profile-04-backend-infra` — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — stands up the box; runs in parallel with T4c; ordered before the deploy core (T4e).

## Status
✅ Done

## Owner
fkit-coder

## Depends on
None (needs a provisioned reg.ru VPS + the operator having pointed the DNS A-record — see below).

## Blocks
T4e.

## Context
The **pure-provisioning half** of `setup-profile.sh`: swap, Docker, ufw default-deny, `/opt/profile` dirs, and nginx+certbot TLS for `api.geoconflict.ru` with a **dormant `/internal/` allowlist**. Every artifact this slice ships works the moment it lands — **no compose, no systemd, no cron** (those reference the compose file + `POSTGRES_*` vars that T4e owns, so they live in T4e). Mirror `setup-telemetry.sh`; do **not** copy ClickHouse/Uptrace pieces. Box must geolocate to **RU** (152-FZ). The prior telemetry OOM was a low-RAM box → swap is mandatory.

## Scope
- **Operator precondition (human-only):** the `api.geoconflict.ru` A-record is pointed at the box **before** setup runs. Setup does **not** mutate DNS; it verifies via a fail-closed DNS pre-check and aborts otherwise.
- Defaults + input validation (provisioning-only invocation must not require deploy-only vars like `PROFILE_IMAGE`/`POSTGRES_PASSWORD`; `PROFILE_PORT`/`PROFILE_SWAP_SIZE_GB` numeric checks).
- **Swap** (`try_enable_swapfile`): `/swapfile` fallocate→dd fallback, `mkswap`/`swapon`, `/etc/fstab` persist, `vm.swappiness=10`; presence-only idempotent (does NOT resize — carry the documented caveat).
- **Docker**: `get.docker.com` + `docker-compose-plugin`; `systemctl enable --now docker`.
- **Firewall (ufw)**: SSH allowed **FIRST** (22), then 80/443, default-deny incoming / allow outgoing, `--force enable`. This is the firewall-hook surface for the later IP-allowlist.
- **Directories**: `/opt/profile` 0700, `backups/` — created now so T4e can write compose + `profile.env` into them.
- **Declare/document `PROFILE_INTERNAL_ALLOW_IPS`** in `example.env.profile` (this slice consumes it via the nginx template, so it owns the declaration site — mirroring how `PROFILE_API_URL`/`DATABASE_URL`/`PROFILE_INTERNAL_TOKEN` each have one).
- **HTTPS (only if `PROFILE_DOMAIN` set)**: DNS-points-at-this-host pre-check → stop nginx → `certbot certonly --standalone --keep-until-expiring` → write nginx site (80→443 redirect + TLS + `/` proxy to `127.0.0.1:PROFILE_PORT`) → a **dormant `location /internal/`** block whose `allow` directives are **present** (built from `PROFILE_INTERNAL_ALLOW_IPS`) followed by `deny all` — it 404s/502s until T5 wires the endpoint; only the network-shape (IP allow-list + deny) is laid down, no token/rate runtime enforcement. `nginx -t`, ERR-trap `restore_nginx_on_failure`.
- Connection-info banner.

## Out of scope
- The **profile systemd unit** (`ExecStart=docker compose up`) → **T4e** (it boots the compose file T4e authors; standing it up here crash-loops on a box with no compose file).
- The **pg_dump weekly cron** + certbot-renew/disk-warn maintenance crons → **T4e** (the backup job references `docker compose exec postgres` + `POSTGRES_USER`/`POSTGRES_DB` that only exist in T4e's `profile.env`/compose).
- Writing `profile.env`, `docker-compose.yml`, pulling/recreating containers, health-gate, rollback (T4e).
- Postgres memory caps content (lives in the compose file, T4e).
- Nightly `pg_dump` to reg.ru S3 + restore drill (T8).
- The `/internal/` endpoint behavior and token/allowlist **runtime** enforcement (T5/T6).
- ClickHouse/Uptrace telemetry pieces (do not copy).

## Acceptance criteria (defined up front)
- The `api.geoconflict.ru` A-record resolves to an IP on this box (DNS pre-check passes); a deliberately wrong/unpointed record makes setup **fail closed BEFORE certbot** (no cert burned against a mispointed record).
- After running with `PROFILE_DOMAIN` set: `swapon --show` lists `/swapfile`; `sysctl vm.swappiness` == 10; re-running does not resize or duplicate fstab entries.
- `docker compose version` works (engine + plugin). **No profile systemd unit is created here** (it would crash-loop with no compose file — that's T4e).
- `ufw status` shows 22/80/443 allowed + default-deny incoming; the SSH session is not lost (SSH-first ordering).
- **Config-shape only (inspection):** `nginx -t` passes; the site contains `proxy_pass http://127.0.0.1:PROFILE_PORT` and the 80→443 redirect; a live `curl https://api.geoconflict.ru/` terminates **valid Let's Encrypt TLS** and returns nginx's own **502** (no upstream yet) — explicitly **NOT a 200**. The `/health`-200-over-TLS round-trip is owned by T4e.
- The nginx config contains a `location /internal/` block with `allow` directives matching the declared `PROFILE_INTERNAL_ALLOW_IPS` and a closing `deny all`, present but dormant (404s/502s) — verified by config inspection. `PROFILE_INTERNAL_ALLOW_IPS` is documented in `example.env.profile`.
- Box geolocates to **RU** (IP check).
- An nginx write failure triggers `restore_nginx_on_failure` and leaves the prior site intact (inject a bad template, assert restore).

## Threat model
Provisioning establishes the network shape that protects everything downstream: ufw default-deny means only 22/80/443 are reachable; nginx terminates TLS so the API is never plaintext; the `/internal/` allowlist is laid down now (dormant: allow-list + `deny all`) so T5's endpoint inherits IP-restriction the moment it exists. SSH-first ufw ordering prevents a self-inflicted lockout. DNS pre-check before certbot avoids burning rate-limited certs against a mispointed record. The `/internal/` block is intentionally **not** enforcement-hardened (no token, no rate-limit) — adding runtime enforcement for the absent endpoint would be hardening for an absent consumer; only the network-shape is laid down. Residency (152-FZ) satisfied by the box being reg.ru/RU.

## Review budget
Max 2 rounds; round 2 ends in a flat residual bullet list (not a register).

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:setup-profile.sh` — sections: swap `try_enable_swapfile`; ufw; HTTPS/certbot/nginx + dormant `/internal/` allowlist + `restore_nginx_on_failure`; DNS pre-check.
- Mirror: `setup-telemetry.sh` swap (fallocate→dd, `swappiness=10`), Docker install, certbot `--keep-until-expiring`.
- **Deliberately NOT salvaged into T4d:** the systemd `profile.service` and the `pg_dump`/maintenance cron — both reference `/opt/profile/docker-compose.yml` + `POSTGRES_*` that T4e owns; they move to T4e.

## Independent test
Run setup against a throwaway reg.ru box (or local Ubuntu VM) with `PROFILE_DOMAIN` unset to skip TLS, then re-run to prove idempotence: assert swapon/swappiness, docker engine+plugin, ufw rules, `/opt/profile` dirs. With `PROFILE_DOMAIN` set against a real (operator-pointed) A-record, assert the DNS pre-check passes, `nginx -t`, certbot cert present, and `curl https://api.geoconflict.ru/` terminates valid TLS and returns nginx's **502** (no upstream) — not a 200. Every artifact ships functional the instant it lands; shares only the `/opt/profile` path with T4e.
