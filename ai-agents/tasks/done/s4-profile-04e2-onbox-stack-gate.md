# Task — Profile Backend Infra: On-box stack + health-gate + digest rollback + lifecycle (T4e2)

## Parent / Epic
`ai-agents/tasks/backlog/0013-player-profile-store-impl/brief.md` (Part D). **Decomposed from `s4-profile-04e-deploy-mechanics.md` (T4e)** — the keystone on-box slice of the three-way T4e split. See postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — the densest on-box review surface; carries keepers K2(box)/K3/K4.

## Depends on
T4c (image to pull), T4d (box provisioned: docker + swap + ufw + nginx/TLS + `/opt/profile`).

## Blocks
T4e3.

## Runs in parallel with
T4e1 — different file (`setup-profile.sh` vs `build-deploy-profile.sh`), zero shared lines. (Merge after T4e1 only because the milestone-driver, T4e3, needs both.)

## Context
The **entire on-box surface** in `setup-profile.sh`'s deploy sections, authored as **ONE cohesive slice** — because the stack *definition* and the lifecycle/gate that *wraps* it are a single contiguous control-flow region (write → capture PREV → recreate → health-wait → rollback). Splitting "write compose" from "gate the start" forces a throwaway straight-line `up -d` that the next slice rewrites; keeping them together avoids that write-then-rewrite. Carries keepers **K2** (box half: decline non-`@sha256`), **K3** (fail-closed rollback), **K4** (mark-before-destructive + never delete the data volume). Standalone-testable on the box by invoking `setup-profile.sh` directly with a hand-supplied `PROFILE_IMAGE` and `PROFILE_DOMAIN` **unset**.

## Scope
- **`profile.env`** (0600, umask 077): `POSTGRES_*`/`DATABASE_URL`/`PROFILE_INTERNAL_TOKEN`/`PROFILE_PORT`; idempotent persisted-token logic (env wins → else reuse `/opt/profile/.internal_token` → else `openssl rand -hex 32` + persist 0600). **FIX vs seed:** `DATABASE_URL` MUST be the `@127.0.0.1:5432` template (the seed's `@postgres:5432` fails the epic acceptance) — assert **template-equality only**, NO libpq/connect validation (that's T5).
- **`docker-compose.yml`** (0600): `postgres:16-alpine` loopback `127.0.0.1:5432`, named volume `postgres_data`, mem caps `shared_buffers=128MB`/`work_mem=4MB`/`max_connections=25`/`maintenance_work_mem=64MB`, `pg_isready` healthcheck; `profile-api` loopback `127.0.0.1:PROFILE_PORT`, `env_file: profile.env`, `depends_on postgres condition: service_healthy`, `curl /health` healthcheck.
- **Validation** — `PROFILE_IMAGE` present **and in `@sha256` digest form** (decline a mutable tag — **K2** box half); `POSTGRES_PASSWORD` present; `PROFILE_PORT` numeric.
- **Start + health-gate + rollback** — capture PREV digest from the running `profile-api` container; `docker compose pull` + `up -d --force-recreate`; set `STACK_RECREATED=1` **BEFORE** the first container-mutating command (**K4**); 120s wait on `all_services_running_healthy`; on unhealthy, dump logs and roll back to the prior `@sha256` digest (rollback waits on the **same** health assertion — a started-but-unhealthy old image is **FAILURE**, not success — **K3**); **never** auto-delete `postgres_data` (`down -v` only ever an echoed hint — **K4**).
- **Profile systemd unit** — `/etc/systemd/system/profile.service` (`Requires=docker.service`, `WorkingDirectory=/opt/profile`, `ExecStart=/usr/bin/docker compose up`, `Restart=always`); `daemon-reload` + `enable`.
- **Backup + maintenance cron** — `/etc/cron.d/profile-backups`: weekly `pg_dump` + 14-day prune + daily disk-usage warn + twice-daily certbot renew **with `--pre-hook "systemctl stop nginx"` + `--post-hook "systemctl start nginx"`** (NOT reload-only — the `--standalone` authenticator binds port 80 that nginx owns; surfaced by the T4d review). Skeleton only; T8 hardens to nightly + S3.

## Out of scope
- Local build/push/digest + `package.json deploy:profile` → **T4e1**.
- SSH/SCP secret-staging + the end-to-end integration milestone → **T4e3**.
- `DATABASE_URL` semantic/connect validation → **T5** (template-equality only here).
- `/ready` endpoint, any DB query at deploy time → **T5**.
- `sshpass` argv hardening, concurrency lock, atomic deploy record → **T4g**.

## Acceptance criteria (defined up front)
- `docker compose config` shows `shared_buffers=128MB`/`work_mem=4MB`/`max_connections=25`/`maintenance_work_mem=64MB`; postgres reachable **only** on `127.0.0.1:5432` (external connect refused), `pg_isready` healthy.
- `profile.env` and `docker-compose.yml` are mode **0600**; the synthesized `DATABASE_URL` **equals** `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}` (string template equality only — NO libpq/semantic/connect validation).
- A non-`@sha256` image is **declined** (K2). An unhealthy stack within 120s **rolls back** to the prior `@sha256`; rollback uses the same `all_services_running_healthy` assertion; the data volume is **never** auto-deleted. A mangled digest-inspect → **HALT** (fail closed).
- `systemctl is-enabled profile` == enabled **AND** `systemctl start profile` actually boots the stack from `/opt/profile/docker-compose.yml`.
- `/etc/cron.d/profile-backups` exists with valid syntax **AND** the `pg_dump` line resolves real `POSTGRES_USER`/`POSTGRES_DB` against the running postgres; `certbot renew --dry-run` succeeds via the pre/post-hook (nginx freed during renewal).
- Ships **strictly more functional** than the T4d 502 baseline (a healthy loopback stack).

## Threat model
Core of the on-box T4 threat model. (1) Never leave the service unrecoverable: recreate + roll back by immutable `@sha256` (K2 box half), fail closed on unhealthy (K3), mark `STACK_RECREATED` before the first destructive command, never auto-delete the data volume (K4). (2) Postgres bound to `127.0.0.1` only and capped so a spike pages to swap rather than wedging the low-RAM box (the OOM lesson). (3) The certbot renewal hook frees port 80 so TLS can't silently expire. **Explicitly out:** `DATABASE_URL` semantics (T5 — template-equality only); `sshpass` argv hardening (T4g).

## Review budget
Max 2 rounds (densest on-box surface; round 2 ends in a flat residual bullet list).

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:setup-profile.sh` — `profile.env` + `docker-compose.yml` write incl pg caps; start + health-gate + inline rollback seed; systemd `profile.service`; `pg_dump`/maintenance cron.
- Postmortem §14 **K2** (decline non-`@sha256`), **K3** (fail-closed rollback, same health assertion), **K4** (mark `STACK_RECREATED` before first destructive command, never auto-delete volume).
- Mirror: `setup-telemetry.sh` systemd `Restart=always`, twice-daily renew.
- **Fixes vs seed (do NOT re-ship the bugs):** `DATABASE_URL` → `@127.0.0.1:5432`; certbot renew → `--pre-hook`/`--post-hook` stop/start nginx (not reload-only).

## Independent test
On the reg.ru box (or local VM) with T4d provisioning present, invoke `setup-profile.sh` directly with a hand-supplied `PROFILE_IMAGE` (an `@sha256` ref) and `PROFILE_DOMAIN` **UNSET** (skip nginx/certbot): assert mem caps via `docker compose config`, loopback-only postgres, 0600 files, `DATABASE_URL` template equality, `systemctl start profile` boots the stack, the `pg_dump` cron line dumps the running postgres. Break the API `/health` → assert 120s timeout + rollback to the prior digest with the volume intact. Feed a non-`@sha256` image → assert fail-closed HALT. With `PROFILE_DOMAIN` set, `certbot renew --dry-run` succeeds via the hook.
