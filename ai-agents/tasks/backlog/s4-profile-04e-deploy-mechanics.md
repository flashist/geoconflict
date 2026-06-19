# Task — Profile Backend Infra: Deploy mechanics + compose + integration milestone (T4e)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` (Part D, steps 2–4). Sub-task of `s4-profile-04-backend-infra.md` — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — the deploy core and the **integration milestone** (`https://api.geoconflict.ru/health` 200 over TLS). This is the broadest chunk; kept whole because you cannot health-gate or auto-start an unauthored stack. Hard-capped review.

## Depends on
T4c (image), T4d (box + nginx/TLS).

## Blocks
T4f, T4g.

## Context
`build-deploy-profile.sh` (local orchestrator) + the **deploy half** of `setup-profile.sh` (write `profile.env` + `docker-compose.yml` with pg memory caps, the systemd unit and `pg_dump`/maintenance cron that consume that compose file, pull, mark-before-recreate, 120s health-gate, digest-pinned rollback). Secrets staged via a 0600 temp env_file, **never argv**. This is the densest concentration of the T4 threat model — keepers **K2/K3/K4/K7**.

## Scope
- **`build-deploy-profile.sh`** — layered env load (`.env` → `.env.secret` → `.env.profile` → `.env.profile.secret`, allexport); validate `PROFILE_SERVER_HOST`, script/Dockerfile exist, `POSTGRES_PASSWORD`, `DOCKER_USERNAME`/`DOCKER_REPO`.
- **Build + push** — `VERSION_TAG=git rev-parse --short HEAD`; `PROFILE_IMAGE=user/repo:profile-<tag>`; build with `docker buildx build --platform linux/amd64 --load` (**K7**, not plain `docker build`); registry login via `DOCKER_TOKEN` on stdin `--password-stdin`; `docker push`.
- **Deploy & rollback by immutable `@sha256` digest** — resolve `PROFILE_DIGEST` from the built image **ID** (not the tag), fail closed if no canonical digest (**K2**). Setup recreates/rolls back by digest, declining any non-`@sha256` image (**K2/K3**).
- **SSH auth** — key path preferred and **default**; password fallback gated behind `ALLOW_PROFILE_SSH_PASSWORD_FALLBACK`, `StrictHostKeyChecking=accept-new`. NOTE: the `4e56fbf` seed ships the **vulnerable** `sshpass -p "$SSH_PASSWORD"` form (password in argv). This slice keeps the key path as default and does **NOT** harden the password path — the `-p`→`-f` 0600-file replacement is **T4g's net-new** (do not re-derive the seed's `-p` form as "done").
- **Secret-staging over SCP with cleanup trap** — stage secrets in `LOCAL_TMPENV` (mktemp 0600) via `printf %q`, SCP to a 0600 `REMOTE_ENV`, EXIT/INT/TERM trap removing both staging files; SSH sources env, `rm`s it, runs setup (no secrets on box argv).
- **`setup-profile.sh` deploy sections** — write `profile.env` (0600, umask 077) with `POSTGRES_*`/`DATABASE_URL`/`PROFILE_INTERNAL_TOKEN`/`PROFILE_PORT`, and `docker-compose.yml` (0600): `postgres:16-alpine` (loopback `127.0.0.1:5432`, named volume `postgres_data`, **mem caps** `shared_buffers=128MB` `work_mem=4MB` `max_connections=25` `maintenance_work_mem=64MB`, healthcheck `pg_isready`) + `profile-api` (loopback `127.0.0.1:PROFILE_PORT`, `env_file: profile.env`, `depends_on postgres healthy`, healthcheck `curl /health`).
- **Profile systemd unit** (MOVED here from T4d — consumes the compose file this slice authors): `/etc/systemd/system/profile.service` (`Requires=docker.service`, `WorkingDirectory=/opt/profile`, `ExecStart=/usr/bin/docker compose up`, `Restart=always`); `daemon-reload` + `enable`.
- **Backup + maintenance cron** (MOVED here from T4d — references `docker compose exec postgres` + `POSTGRES_USER`/`POSTGRES_DB`): `/etc/cron.d/profile-backups` weekly `pg_dump` + 14-day prune + daily disk-usage warn + twice-daily certbot renew with nginx reload post-hook (**skeleton only**; T8 hardens to nightly+S3).
- **Start + health-gate + rollback** — capture PREV digest, pull + `up -d --force-recreate`, set `STACK_RECREATED=1` **before** the first container-mutating command (**K4**), 120s health wait, on unhealthy dump logs and roll back to the prior digest; **never auto-delete the data volume**.
- `package.json`: add `deploy:profile` script.

## Out of scope
- `DATABASE_URL` libpq/semantic validation richness and `probe_database_url` → **T5** (absent consumer; here assert template-**equality** only, not connectability).
- The `/ready` endpoint and any DB query at deploy time → T5.
- The secret byte-scan gate invocation between build and push → **T4f**.
- Argv-hardening of the SSH password fallback (`sshpass -p` → `-f` 0600 file) → **T4g** (the seed's `-p` form must NOT be treated as already-hardened).
- Concurrency lock + atomic deploy record → T4g.
- awk Dockerfile lexer (frozen; T4f).
- Nightly backups to S3 (T8).

## Acceptance criteria (defined up front)
- **INTEGRATION MILESTONE (single-owned):** a clean run ends with all services healthy and `https://api.geoconflict.ru/health` returns **200 over valid TLS** (requires T4a's route + T4c's image + T4d's nginx/TLS, all merged first via the dependency chain). The one end-to-end criterion no earlier chunk can assert.
- The deployed image is referenced by `@sha256` digest resolved from the built image ID; if no canonical digest resolves, the deploy **FAILS CLOSED** (assert by mangling the inspect output).
- An unhealthy stack within 120s triggers rollback to the prior `@sha256` digest; rollback waits on the same `all_services_running_healthy` assertion (a started-but-unhealthy old image is reported **FAILURE**, not success). The postgres data volume is never auto-deleted (`down -v` only ever an echoed hint).
- Postgres reachable only on `127.0.0.1:5432` (external connect refused); `docker compose config` shows `shared_buffers=128MB`/`work_mem=4MB`/`max_connections=25`/`maintenance_work_mem=64MB`.
- `systemctl is-enabled profile` == enabled **AND** `systemctl start profile` actually boots the stack from `/opt/profile/docker-compose.yml` (functional, because this slice authored the compose file — not merely "enabled").
- `/etc/cron.d/profile-backups` exists with valid syntax **AND** the `pg_dump` line resolves real `POSTGRES_USER`/`POSTGRES_DB` + a running postgres service (executable, not an inert stub).
- `profile.env` and `docker-compose.yml` on the box are mode 0600; the box synthesized `DATABASE_URL` by template — assert it **equals** `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}` (string template **equality** only — **NO** libpq/semantic/connect validation).
- No secret appears in any process argv on the box during deploy (staged env_file sourced+`rm`'d) — verified by the staging trap + a `ps`-during-deploy spot check. (SSH password-path argv hardening is T4g; key path is default here.)
- The image built is `linux/amd64` (so the reg.ru box can execute it) — assert via `docker inspect` on the pushed digest.

## Threat model
Core of the T4 threat model. (1) Never leave the service unrecoverable: deploy + roll back by immutable `@sha256` digest (a concurrent retag can't swap an image past the gate), fail closed on unhealthy, mark `STACK_RECREATED` before the first destructive command, never auto-delete the data volume. (2) Postgres bound to `127.0.0.1` only and capped so a spike pages to swap rather than wedging the low-RAM box (the OOM lesson). (3) Secrets staged in a 0600 temp env_file, SCP'd 0600, sourced and immediately `rm`'d — never on box argv. (4) amd64 build target so an arm64 host can't push an unrunnable image. The systemd unit + backup cron live here (not T4d) so they're authored alongside the compose + `POSTGRES_*` they consume — functional the moment they land. **Explicitly out:** the validity/semantics of the operator-supplied `DATABASE_URL` (T5's `pg` consumer owns that — T4 asserts template-equality only); `/internal/` enforcement (T5/T6); SSH-password-path argv hardening (T4g); the byte-scan gate (T4f).

## Review budget
Max 2 rounds; round 2 ends in a flat residual bullet list. `DATABASE_URL`/awk findings may **not** reopen this chunk (out of scope by rule).

## Salvage (reuse — do not re-derive)
- Postmortem §14 **K2** (digest resolve from `BUILT_IMAGE_ID`, fail-closed), **K3** (fail-closed rollback that reads no record, same health assertion), **K4** (mark `STACK_RECREATED` before first destructive command, never auto-delete volume), **K7** (`buildx --platform linux/amd64`).
- `git show 4e56fbf:build-deploy-profile.sh` (layered env load; build/push; `--password-stdin` login; SSH key path; the **vulnerable** `sshpass -p` path — keep key-path default, leave `-p`→`-f` to T4g; secret-staging trap).
- `git show 4e56fbf:setup-profile.sh` (`profile.env` + `docker-compose.yml` write incl pg caps; start + health-gate + inline rollback seed; systemd `profile.service` — **MOVED here**; `pg_dump`/maintenance cron — **MOVED here**).
- Mirror: `setup-telemetry.sh` health gate, systemd `Restart=always`, twice-daily renew + reload post-hook; `build-deploy-telemetry.sh` layered load, 0600 env_file secret staging.

## Independent test
Deploy end-to-end against a reg.ru box (or local VM playing the box): assert `https://api.geoconflict.ru/health` 200 over valid TLS (the milestone), postgres external connect refused but internal `pg_isready` healthy, `docker compose config` shows the caps, `profile.env`/compose are 0600, `DATABASE_URL` equals the expected template, `systemctl start profile` boots the stack, the `pg_dump` cron line executes against the running postgres. Force-fail the health-gate (break the API CMD) → assert rollback to the prior digest with the volume intact. Mangle the digest-inspect → assert fail-closed. Build on arm64 → assert pushed image is amd64. T4f/T4g layer on top without altering this slice's behavioral acceptance.
