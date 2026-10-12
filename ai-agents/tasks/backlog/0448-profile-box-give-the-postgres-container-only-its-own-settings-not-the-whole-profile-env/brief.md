# Profile box: give the Postgres container only its own settings, not the whole `profile.env`

## ID
0448

> ℹ️ **ID allocation, checked 2026-10-12 before filing.** Allocated with `0447` in one run (`0446` was the highest
> existing ID). No reference to `0448` in `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0448*`
> path in any branch's history.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-12, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer
> precedent.** Question: *"The profile box's Postgres container sees app secrets (bot token, internal token) it doesn't
> need. File a task to give it only its own settings?"* Verbatim selection: **"File a task (Recommended)"** — option
> text: *"Backlog task: Postgres gets only its own settings."* ⇒ the **Backlog board**.

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder — ⚠️ the profile deploy that puts it on the box is **run by the owner (human)**, in a weekend deploy slot
unless the owner rules sooner. A read-only check of the containers' environment (**setting names only, never values**)
may be run by an agent session with the owner's OK given in-session.

## Context

**In plain terms.** The profile box runs two containers: the database (Postgres) and the profile app. Both are started
from the same settings file, `profile.env`. So the database container also holds the app's secrets — the Telegram bot
token, the internal token the game server uses, the session secret — which the database never uses. If the database
container were ever broken into, or its settings printed by a tool, those secrets would go with it. This task gives
the database its **own small settings file** with only what it needs.

**Facts on filing:**
- **Seen on the box** (read-only inventory for `0443`, 2026-10-12, recorded in
  [`0443`'s worklog](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/worklog.md)
  § *Step 1*, *Surprises* 2 — names only, not re-checked by the producer): the Postgres container's environment holds
  the whole `profile.env` set.
- **In the code** (`setup-profile.sh`, read 2026-10-12): one 0600 `profile.env` is written with the database settings
  (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) **and** every app setting (`DATABASE_URL`,
  `PROFILE_INTERNAL_TOKEN`, `FEEDBACK_TELEGRAM_TOKEN`, `PROFILE_SESSION_SECRET`, `YANDEX_PAYMENTS_SECRET`,
  `PROFILE_ALERT_WEBHOOK_TOKEN`, …). The compose file gives **both** services `env_file: ./profile.env`. The compose
  comment on the Postgres service already says it only needs the three `POSTGRES_*` values.
- The app does **not** read `POSTGRES_*` itself (no use under `src/profile-server/`; it connects with `DATABASE_URL`).
- **The nightly backup does not use `profile.env`** — `profile-backup.sh` reads `backup.env` and runs `pg_dump` inside
  the Postgres container with the user name from there. The compose healthcheck's user and database names are
  substituted into the compose file at deploy time, not read from the container.

**What this touches that has its own checks — the plan must keep them all working:**
- **The deploy hardening harness** (`tests/scripts/profile-deploy-hardening.test.sh`) checks the compose heredoc in
  detail since task `0282`: quoted `'EOF'` delimiter, no backticks, no `$( )`, every `${NAME}` has an explicit
  substitution line, no unbraced `$NAME`, a `logging:` block per service. It also locates and checks the `profile.env`
  heredoc itself (column-0 `KEY=${KEY:-}` lines, the `persist_or_reuse_secret` calls placed before it). **A new env
  file, or a changed `env_file:` line, needs matching harness checks** — and an anchor that spells one form must not go
  silently vacuous.
- **The config parity guard** (`scripts/check-config-parity.mjs`, run `--enforce` by the deploy) reads the `profile.env`
  heredoc as its profile **hop 2**, and checks every key there is exported by `build-deploy-profile.sh`. Moving the
  `POSTGRES_*` keys to a new file changes what it sees; the plan decides whether the guard learns the new file, and
  `tests/scripts/ConfigParity*.test.ts` stay green either way.
- `docker compose restart` does **not** re-read `env_file` (`setup-profile.sh` header). The change reaches the box only
  through a normal profile deploy (`docker compose up -d`), which will **recreate the Postgres container** — a short
  database restart. The data volume is kept.

## What to build

1. **A separate 0600 env file for Postgres**, written by `setup-profile.sh` the same way as `profile.env` (`umask 077`,
   root-only, rewritten every deploy, never inlined in the compose file), holding **only** what the Postgres image needs
   — the three `POSTGRES_*` values. `PGDATA` stays where it is.
2. **Compose:** the Postgres service uses only that new file; the profile app keeps `profile.env`. The plan decides
   whether `POSTGRES_*` also stay in `profile.env` (the app does not read them; removing them keeps the app's file to
   what it uses) and says which in the worklog.
3. **Keep every guard green:** the `0282` compose-heredoc rules, the `profile.env` heredoc checks, `POSTGRES_PASSWORD`
   still failing closed when unset, the config parity guard, and the logging block on both services.
4. **Runbook / docs:** where `setup-profile.sh`'s header or the deployment docs list the files on the box, add the new
   one and say which container reads which file.

**Out of scope:** changing any secret's value or rotating anything; the backup and checks env files; the game and
telemetry boxes; the app's own settings list.

## Verification steps

1. **Harness:** new structural checks that the Postgres service reads only the new file, the profile app reads
   `profile.env`, the new file is written 0600 under `umask 077`, and it holds exactly the `POSTGRES_*` keys. All
   existing `0282` and `profile.env` checks still pass. A run where the anchor is missing **fails** rather than passing
   vacuously.
2. `npm run check:config-parity` reports no new finding; `tests/scripts/ConfigParity*.test.ts` green.
3. `bash -n setup-profile.sh` clean; `npm test` green (one full run — the project lock applies), harness success marker
   printed.
4. **Live proof — NOT in this task.** By the build/verify split rule (owner ruling 2026-09-29), when this task closes the
   producer files a verify task at the top of the next sprint: after one owner-run profile deploy, (a) the Postgres
   container's environment shows **only** the `POSTGRES_*` names plus the image's own defaults and `PGDATA` — **names
   only, never values**; (b) the profile app's container still has every setting it had; (c) `/ready` answers 200;
   (d) the next nightly backup succeeds (or one run on demand). That verify task must not block the build sprint's
   deploy.
5. Nothing written for this task names a host, address or secret value.

## Notes
- **Depends on:** nothing
- **Blocks:** nothing
- **Coordinate, not a dependency:** [`0443`](../../done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md)
  (Sprint 8, in progress) also edits `setup-profile.sh` (its profile-box alert install) — different section, but if both
  are open at once, land one and rebase the other.
- **Related:** `0282` (the compose-heredoc rules); `0215`/`0221` (the profile box setup this changes); `0195`/the config
  parity class (why the parity guard reads this heredoc).
- ⚠️ **Build/verify split (owner ruling 2026-09-29):** see verification 4.
- **No open questions for the owner at filing.** The one design choice (whether `POSTGRES_*` also leave `profile.env`)
  is technical and left to the plan, which records it.
- Sources: owner ruling 2026-10-12 (relayed); `0443` worklog § *Step 1* (relayed inventory); `setup-profile.sh`
  (`profile.env` heredoc, compose heredoc, header); `profile-backup.sh`; `scripts/check-config-parity.mjs` (profile
  hops); `tests/scripts/profile-deploy-hardening.test.sh` (compose and `profile.env` checks) — all read 2026-10-12.
- **No secrets, hostnames or addresses** in the plan, worklog, harness fixtures or commit messages — fake values only.
