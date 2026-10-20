# Plan — 0219 P4 operability on the profile box

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **Q1 — checker alert transport:** **(A) external dead-man's-switch ping service** (healthchecks.io-style;
>   period 1 day, grace 3 h; its Telegram+email integration delivers from outside RU; the box holds only a
>   ping URL). B0 decides reachability first; if the ping host is unreachable from the box, fall back to
>   option B — but **return `NEEDS-DECISION` before switching**, since the owner ruled A.
> - **Q2 — uptime monitors:** **two** — `/health` AND `/ready`.
> - **Q3 — log retention values:** **100m × 10 per container, mirroring `update.sh`** exactly.
> - **Q4 — prune scope:** **keep-list** = images of ALL containers (`docker ps -a`) ∪ `PREV_PROFILE_IMAGE` ∪
>   `PROFILE_IMAGE`; remove everything else. The brief's literal `docker image prune -a -f` is NOT followed.
> - **Q5 — cadence/thresholds:** **confirmed as proposed** (daily 08:00 UTC; daily marker ≤ 26 h; daily
>   object must exist remotely; weekly newest ≤ 8 days; renewal attempt ≤ 13 h; cert ≥ 20 days; renew-log
>   growth = alert). All env-overridable.
> - **Q6 — local backup mode (no `backup.env`):** **FAIL loud daily** ("off-box backups not configured").
> - **Q7 — other tasks' briefs:** **producer at close** edits `0034` item 5 / `0182` bullets; the coder edits
>   knowledge-base docs only.
>
> **Build scope for the Build spawn:** Part A in full (A1–A7) plus the **read-only** B0/B1 SSH checks.
> Part B2–B10 need the owner's accounts and a deploy window — the Build worker does **not** deploy; it
> returns `NEEDS-DECISION`/`DONE` with Part A built and B0/B1 evidence recorded.

# 0219 — P4 operability on the profile box: implementation plan

Planning-only (spawned consult; prose contract honored — nothing written). Today 2026-09-13.
Certificate fuse: notAfter 2026-11-20; real renewal attempts start ~2026-10-21.

## 0. Shape of the change (what runs where)

Everything ships through the EXISTING path — `npm run deploy:profile` (= `build-deploy-profile.sh`),
which SCPs `setup-profile.sh` (+ on-box scripts) and re-runs it idempotently. No parallel scripts,
no new pipeline, no OTEL (by design, `src/profile-server/Logger.ts:5-8`).

| Gap | Mechanism | Layer that owns it | Ships via |
|---|---|---|---|
| G1 log rotation | `logging:` block on BOTH compose services (json-file, max-size/max-file) | the compose file `setup-profile.sh:401-447` writes — version-controlled, per-container, overrides any host `daemon.json` (same reasoning as `update.sh`'s `docker run` flags, `container-log-retention.md`) | redeploy (containers are recreated by `compose up` when config changes — health-gated) |
| G2 image prune | keep-list prune at deploy time, after the health gate + rollback branch resolve | `setup-profile.sh`, new section between the stack section (ends ~`:570`) and "CONFIGURING SYSTEMD" (`:757`) | redeploy |
| G3 uptime | external pull monitor(s) on `https://<PROFILE_DOMAIN>/health` and `/ready` | an external free service (owner account) | owner action, no code |
| G3 renewal reader + G4 backup freshness (daily + weekly) | ONE new on-box script `profile-checks.sh`, daily cron, reports to an external dead-man's-switch ping (which forwards to Telegram/email) | repo root next to `profile-backup.sh`; SCP'd by `build-deploy-profile.sh`; installed + scheduled by `setup-profile.sh` | redeploy + owner creates the check |
| Doc | `container-log-retention.md` scope fix + profile section | knowledge-base | local |

Why an external ping service for the on-box checks, not Telegram-from-the-box: the checker's own
death (cron gone, script broken, box frozen) must ALSO alert — a script that posts "all bad" can't
report its own absence. A dead-man's switch (period 1 day + grace) turns silence into an alert,
needs no Telegram token or proxy on the box, and its integration to Telegram runs from the
service's servers, not from a Russian IP. This is exactly 0033's locked decision ("free external
dead-man's-switch service … lightweight bash + cron + Telegram"), applied to this box first.
Option B (Telegram via the existing `TELEGRAM_PROXY_URL` from bash `curl -x`) is kept as the
fallback if the ping host is unreachable from the box — see open question Q1.

## Part A — buildable and testable locally (no box needed)

### A1. `setup-profile.sh` — compose `logging:` block (G1)
- In the `docker-compose.yml` heredoc (`:401-447`), add to BOTH `postgres` and `profile-api`:
  ```
      logging:
        driver: json-file
        options:
          max-size: "100m"
          max-file: "10"
  ```
  Values mirror `update.sh:91-92` exactly (Q3 lets the owner shrink them). One comment line
  recording the ownership decision: "compose owns retention on this box; do NOT also write
  /etc/docker/daemon.json — a second layer conflicts and the compose value wins anyway."
- No `daemon.json` is written. (Currently none exists: `:285-306` installs Docker and never
  touches it.)
- Note for the doc (A6): the systemd unit runs `docker compose up` in the foreground with
  `StandardOutput=journal` (`:759-775`), so container output is ALSO streamed into journald — a
  second sink, bounded by journald's defaults (SystemMaxUse ≈ 10 % of the fs, capped at 4 GB).
  Not changed here; recorded so nobody "discovers" it as an unbounded log later.

### A2. `setup-profile.sh` — keep-list image prune (G2)
- New section `# ── Image prune (0219) ──` placed AFTER the stack section's rollback branch has
  resolved (after the migrations/health confirmation, before `print_header "CONFIGURING SYSTEMD
  AUTO-START"` at `:757`), so a prune can never run before a rollback might need the old image.
- Logic (all `|| true` on removal; never fails the deploy):
  1. keep = image IDs of every container in `docker ps -a` (running AND stopped) ∪ ID of
     `$PREV_PROFILE_IMAGE` (captured at `:488-492`, may be empty on a fresh box) ∪ ID of
     `$PROFILE_IMAGE`.
  2. remove every other image ID (`docker image rm`), then `docker image prune -f` (dangling
     layers).
  3. print what was kept and what was removed (digests only — no registry creds).
- Why not a literal mirror of `update.sh:37`/`:102`: that is `docker image prune -a -f`, which
  removes ALL images not used by a container — on this box that is precisely the rollback image
  the brief says to keep. Same PLACEMENT (deploy time — images accumulate one per deploy, so a
  cron is unnecessary), different selection. Q4 covers scope (all non-kept images incl. an old
  `postgres:16-alpine`, vs profile-repo only).

### A3. New `profile-checks.sh` (repo root) — the G3 renewal reader + G4 freshness consumer
Bash, `set -euo pipefail`, jq-free (grep/sed like `profile-backup.sh`), no `set -x` ever. All
inputs injectable via env so it is unit-testable off-box:
`PROFILE_DIR`, `BACKUP_DIR`, `PROFILE_BACKUP_ENV_FILE`, `PROFILE_CHECKS_ENV_FILE`
(`/opt/profile/checks.env`), `PROFILE_CHECKS_LE_LOG` (`/var/log/letsencrypt/letsencrypt.log`),
`PROFILE_CHECKS_RENEW_LOG` (`/var/log/certbot-renew.log`), `PROFILE_CHECKS_CERT_FILE`
(`/etc/letsencrypt/live/$PROFILE_DOMAIN/cert.pem`), `PROFILE_CHECKS_STATE_DIR`
(`/opt/profile/checks-state`, 0700), thresholds below, and `PROFILE_CHECKS_PING_URL`.

Checks (each yields OK or a one-line reason; reasons are collected):
1. **Daily backup marker** `last-backup.json`: exists; `exit_status == 0`; `finished_at` age ≤
   `PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS` (default 26; cron is 02:30, checker 08:00). Missing
   marker → FAIL unless `last-smokecheck.json` is younger than the same threshold (0034's
   fresh-box rule: first nightly not yet fired).
2. **Daily object really exists** — `rclone lsjson` (or `size --json`, same helper shape as
   `profile-backup.sh:103`) of the marker's `object_key`; missing → FAIL. Encodes 0218 fact (b):
   a log line / marker is not an object.
3. **Weekly presence** — list the `weekly/` prefix (`rclone lsjson "$REMOTE_BASE/weekly/"`);
   newest object's date (from its name `profile-YYYY-MM-DD.dump.age`, fallback ModTime) must be
   ≤ `PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS` (default 8 = 7 + slack); empty listing → FAIL.
   Encodes 0241 facts (i) marker has no weekly signal, (ii) weekly failure is exit 0 — so this
   check is INDEPENDENT of check 1's result. Small/old-but-≤8d weekly objects are OK (empty-DB
   dumps expected until 0217).
4. **Renewal attempt happened** — mtime of `letsencrypt.log` ≤ `PROFILE_CHECKS_MAX_RENEW_ATTEMPT_AGE_HOURS`
   (default 13; cron is 00:00/12:00). Certbot rewrites that log on every invocation, including
   "not yet due" runs, whereas `--quiet` prints NOTHING to `/var/log/certbot-renew.log` on a
   no-op success — so the cron's own log cannot prove an attempt. (Per-run rewrite behaviour to be
   confirmed on the box in B-step 1; if it does not hold, fall back to `certbot certificates`
   parsing.)
5. **Renewal attempt did not error** — `/var/log/certbot-renew.log` grew since the last checker
   run (byte offset persisted in the state dir) → FAIL, reason includes the last ≤3 new lines
   (bounded; certbot error text carries no secrets). This is what makes a FAILED attempt visible.
6. **Certificate not sliding toward expiry** — `openssl x509 -enddate -noout` on the cert file;
   days remaining ≥ `PROFILE_CHECKS_CERT_MIN_DAYS` (default 20: renewal is due at 30 days out, so
   <20 means ~10 days / ~20 attempts of silent failure). Also catches the fuse end-to-end.
7. **Mode sanity** — no `backup.env` (local skeleton mode) → FAIL "off-box backups not configured"
   (fail-loud; Q6).

Reporting:
- Always appends a one-line summary per check to `/var/log/profile-checks.log` (stdout via cron).
- If `PROFILE_CHECKS_PING_URL` is set: all OK → `curl -fsS -m 10 --retry 3 "$URL"`; any FAIL →
  `curl ... --data-raw "<reasons>" "$URL/fail"`. Body = reasons + ages/counts only — never keys,
  endpoints, bucket names, tokens (brief V9). Ping failure itself is logged and the script exits
  non-zero (the service's missing-ping alert then covers it — the dead-man property).
- If the URL is unset: exit non-zero and log "ALERTING NOT CONFIGURED" — and `setup-profile.sh`
  prints a loud warning at deploy time (this is the "log nobody reads" state and must not look
  configured).
- Exit 0 iff every check OK. Sources `backup.env` under `set -a` for rclone creds, exactly as
  `profile-backup.sh:87-98` (root-only 0600; the script runs as root from `/etc/cron.d`).

### A4. `setup-profile.sh` — install + schedule the checker; thread one new variable
- Input: `PROFILE_CHECKS_PING_URL` (secret-class — a ping URL is a capability), optional.
  Default empty → warn loudly, still install the cron (so the log exists and the state is visible).
- Install: `install -m 700 /root/profile-checks.sh /opt/profile/checks.sh` (source path
  `PROFILE_CHECKS_SRC`, mirroring `PROFILE_BACKUP_SRC` at `:92`); write `/opt/profile/checks.env`
  (0600, `printf %q`, `umask 077`) holding `PROFILE_CHECKS_PING_URL` and `PROFILE_DOMAIN`. No
  candidate/promote dance needed (no creds that can break the nightly backup).
- Cron: one line appended to the ALWAYS-present header block of `/etc/cron.d/profile-backups`
  (`:938-948`), after the disk-warning line — `0 8 * * * root /opt/profile/checks.sh >>
  /var/log/profile-checks.log 2>&1`. Logic stays in the script so no `%` escaping is needed
  (same rule the backup line follows, `:950-956`). Runs in both backup modes.
- Deploy summary (`:988-1024`): add a "Checks:" line naming the cron, the log, and whether
  alerting is configured (yes/NO — never the URL).

### A5. `build-deploy-profile.sh` — carry the script and the variable
- `CHECKS_SCRIPT="./profile-checks.sh"` next to `BACKUP_SCRIPT` (`:27`); require it like the
  backup script; `REMOTE_CHECKS_SCRIPT="/root/profile-checks.sh"` (`:395`); third SCP in
  "UPLOADING SETUP SCRIPT" (`:482-490`).
- Staged env block (`:512-549`): `printf "export PROFILE_CHECKS_PING_URL=%q\n"` — rides the same
  0600 source-then-rm channel; empty is a supported state.
- `example.env.profile`: document `PROFILE_CHECKS_PING_URL` in the secrets comment block (belongs in
  `.env.profile.secret`).
- ⚠️ The hardening harness's `run_deploy` creates empty fixtures for every required on-box file
  (`:118-121`); a new required `./profile-checks.sh` MUST get `: > "$RUN/profile-checks.sh"; chmod +x`
  there too, or every deploy test (T1–T10) aborts at the precondition. The harness's `env -i`
  allow-list must also admit `PROFILE_CHECKS_PING_URL` if T10 is to assert it round-trips.

### A6. Docs
- `ai-agents/knowledge-base/container-log-retention.md`: fix `:5-6` (profile box now covered;
  telemetry box still not); add "Profile box (task 0219)" section: compose `logging:` owns it,
  values, why no `daemon.json`, the journald second sink + its default cap, the deploy-time
  keep-list prune, and that the harness lints it.
- `ai-agents/knowledge-base/profile-backup-restore-runbook.md:23` "read by monitoring Phase 2" →
  name `/opt/profile/checks.sh` and the daily/weekly semantics.
- `CLAUDE.md` shell-harness table: add the new harness row (A7).
- Cross-references to OTHER tasks' briefs (`0034` item 5 → "profile half implemented by 0219 in
  `profile-checks.sh`; telemetry half remains", `0182` limitation bullets `:385-391`) — proposed as
  producer-side notes at close, not coder edits (Q7).

### A7. Tests (all in `npm test`; the harness list is hardcoded — must register)
1. `tests/scripts/profile-deploy-hardening.test.sh` — new structural sections, same awk-scoped,
   value-asserting style as the 0060 block (`:266-341`):
   - extract the compose heredoc (`cat > "$PROFILE_DIR/docker-compose.yml" << EOF` … `^EOF`);
     assert `logging:` count == service count (2), `driver: json-file` ×2, `max-size`/`max-file`
     shape checks + EXPECTED constants (100m / 10, or the Q3 values); assert `daemon.json` appears
     nowhere in `setup-profile.sh` (ownership decision enforced).
   - prune section: exists, references `PREV_PROFILE_IMAGE` (keep-list), and is ordered AFTER the
     rollback branch and BEFORE `CONFIGURING SYSTEMD` (awk line-order check like the flock one at
     `:257`); assert the literal `docker image prune -a` does NOT appear in `setup-profile.sh`.
   - checker wiring: cron heredoc contains the `checks.sh` line; `build-deploy-profile.sh` SCPs
     `profile-checks.sh` (grep) AND — behavioural via the existing scp stub — `profile-checks.sh`
     appears in `$WORK/scp.argv` after a `run_deploy`; T10-style: `PROFILE_CHECKS_PING_URL`
     round-trips into `staged.env` and never appears in any argv.
   - Accepted residual, same as 0060's: heredoc extraction is coupled to formatting → false RED,
     never false green.
2. New `tests/profile-checks.sh` (bash + coreutils only, like `tests/profile-backup-redeploy.sh`):
   drives the REAL `profile-checks.sh` with fixture dirs + a stub PATH (`rclone`, `curl`,
   `openssl` stubs that record argv and return canned lsjson/enddate). Cases: all-OK → success
   ping, exit 0; stale `finished_at` → fail body names it; `exit_status != 0`; marker missing
   with fresh smokecheck → OK; marker missing without → FAIL; daily object absent remotely → FAIL;
   `weekly/` empty → FAIL; newest weekly 9 days → FAIL, 6 days → OK; weekly FAIL while daily OK
   (the "backup OK ≠ weekly present" case, explicitly); LE log mtime 2 days → FAIL; renew log grew
   with an error line → FAIL and the body carries the line; cert 15 days → FAIL, 68 → OK; no ping
   URL → exit non-zero + "ALERTING NOT CONFIGURED"; secret-leak guard: the fake access key /
   bucket / ping URL never appear in the log or the curl body (grep the stub's captured argv).
   Prints `RESULT: N passed, 0 failed`.
3. `tests/scripts/ShellHarnesses.test.ts`: register `tests/profile-checks.sh` with its marker
   (the CLAUDE.md-recorded residual: an unregistered harness is gated by nothing).
4. Run: `npm test -- tests/scripts/ShellHarnesses.test.ts`, then full `npm test`, `npm run lint`.
   `bash -n` + `shellcheck` (if present) on both shell scripts.

## Part B — needs the live box or the owner (deploy / accounts / observed alerts)

Ordering matters: B1 before building the certbot check's final form; B2–B3 before the deploy so
the URL ships with it; B4 is the deploy; B5–B9 are the observed-alert verifications.

- **B0 (read-only, I can run it over SSH):** from the box, `curl -sS -m 10 -o /dev/null -w '%{http_code}'`
  against the chosen ping host (e.g. `hc-ping.com`) — proves Russia routing BEFORE the design is
  committed. Unreachable → switch the checker's transport to Q1 option B.
- **B1 (read-only):** `ls -l --time-style=full-iso /var/log/letsencrypt/letsencrypt.log*` and
  `tail -3 /var/log/certbot-renew.log`, `openssl x509 -enddate -noout -in
  /etc/letsencrypt/live/<domain>/cert.pem` (expect 2026-11-20), `df -h /`, `journalctl --disk-usage`,
  `docker images --digests`, `docker inspect --format '{{json .HostConfig.LogConfig}}'` on both
  containers (expect empty opts today — the "before" evidence for V1). Confirms check 4's premise
  and gives the disk size Q3 needs.
- **B2 (owner):** create the dead-man's-switch check (period 1 day, grace 3 h), attach Telegram
  (a separate ops chat/topic per 0033, NOT the user-feedback chat) + email; put the ping URL in
  `.env.profile.secret` as `PROFILE_CHECKS_PING_URL`.
- **B3 (owner):** create the external uptime monitors — HTTPS `/health` and `/ready`, 5-min
  interval, ≥2 consecutive failures before alerting (lossy RU path, 0033), alert contacts Telegram
  + email; enable the service's TLS-expiry reminder if offered (independent second reader of the
  certificate fuse). Rationale for `/ready` in addition to `/health`: `/health` is dependency-free
  (`Routes.ts:192-194`) and stays 200 while Postgres is down; every real route needs the DB, so a
  `/health`-only monitor is green during a player-visible outage. `/ready` is not rate-limited
  (the limiter is scoped to profile reads, `:211+`) and one DB ping per 5 min is nothing.
- **B4 (owner runs; I observe):** `npm run deploy:profile`. Zero player impact: DB has 0 rows and
  the game server is not wired (0217). Expect: containers recreated (compose config changed),
  health gate passes, deploy-time smoke backup runs (⚠️ it OVERWRITES today's daily object at the
  same key — 0218 fact (c); acceptable, record it), prune output lists kept/removed, checker
  installed, cron rewritten, summary shows "alerting: yes".
- **B5 — V1 log rotation (read-only after deploy):** `docker inspect` on both containers shows
  `json-file` + `max-size`/`max-file` (the enforced cap). Observed rotation, cheaply: a throwaway
  container with `--log-opt max-size=1m --log-opt max-file=2` writing ~3 MB, then confirm
  `*-json.log.1` exists under `/var/lib/docker/containers/<id>/`, then `docker rm` it. (I can run
  this if the owner okays the one throwaway container.)
- **B6 — V2 prune:** `docker images --digests` after deploy = current + previous profile digests +
  postgres only; `docker image inspect "$PREV"` succeeds → rollback image survived.
- **B7 — V3 failed renewal VISIBLE (owner-approved writes, ~5 min, zero rate-limit spend, live
  cert untouched):** (a) append a genuine failed attempt: run the cron's command as `certbot renew
  --dry-run --server https://127.0.0.1:1/directory >> /var/log/certbot-renew.log 2>&1` (NO
  pre/post hooks — nginx stays up); run `/opt/profile/checks.sh` → `/fail` ping → alert arrives
  carrying the certbot error line. (b) absent attempt: `touch -d '2 days ago'` on
  `letsencrypt.log` → run checker → alert; then run the real `certbot renew --dry-run` (staging,
  hooks included, what 0216 proved) or wait for the 12:00 cron → next checker run → success ping
  → check clears. (c) expiry slope: one run with `PROFILE_CHECKS_CERT_MIN_DAYS=90` → FAIL (68 days
  remain) → alert; default run → clear.
- **B8 — V4 uptime fires on a real outage (owner-approved write):** `systemctl stop profile` on
  the box (nginx keeps serving, upstream is gone → 502 on `/health`, 503/502 on `/ready`) → both
  monitors alert within ~10 min → `systemctl start profile` → "up" notices arrive. Record
  timestamps (down, alert, up, clear) in the worklog. `restart: on-failure` / systemd
  `Restart=always` do not fight a manual stop.
- **B9 — V5 backup freshness alerts and clears:** run once with
  `PROFILE_CHECKS_MAX_BACKUP_AGE_HOURS=1` → alert names "daily marker age"; once with
  `PROFILE_CHECKS_MAX_WEEKLY_AGE_DAYS=0` → alert names "weekly"; default run → success ping → the
  check shows up/cleared. Plus the dead-man property: temporarily set the check's period to 10 min,
  do NOT run the checker → "missing ping" alert arrives → set the period back to 1 day.
- **B10 — V6 destination named:** worklog names the Telegram ops chat + email as destinations (no
  URLs/tokens). V7 doc, V8 cross-ref (Q7), V9 grep the diff, cron file, logs and ping bodies for
  endpoints/bucket/tokens.

## Sequencing
A1 → A2 → A3 → A4 → A5 → A7 (tests green locally) → A6 docs → B0/B1 (read-only, can run any time,
ideally before A3 is finalised) → B2/B3 (owner accounts) → B4 deploy → B5–B10.

## Edge cases and failure modes accounted for
- Ping host unreachable from the RU box → design fallback (Q1-B); a later network break turns
  into a missing-ping alert (loud, correct direction), never silence.
- Checker crashes / cron removed → no ping → dead-man alert. Verified in B9.
- Manual `backup.sh` run overwrites the marker AND today's object (0218 fact (c)) — freshness by
  marker can be satisfied by a human; accepted and recorded, not solved here.
- Deploy aborts before the prune section (health-gate exit 1) → no prune → fail-safe.
- Prune vs rollback: keep-list includes stopped containers' images and `PREV_PROFILE_IMAGE`; on a
  rolled-back deploy the failed new image is also kept (in-use by nothing but named by
  `PROFILE_IMAGE`) and cleaned on the next deploy.
- Vixie `%` footgun: the cron line only invokes the script.
- `set -euo pipefail` + a missing `rclone`/`openssl`: each check guards `command -v` and reports
  FAIL rather than aborting the run before the ping.
- Sunday timing: weekly copy 02:30, checker 08:00 → the newest weekly is ≤ 1 day old on Sundays,
  ≤ 7 days by Saturday; threshold 8.
- Harness fragility: heredoc/awk extraction → false red on a reformat (accepted, same as 0060).
- `npm test` cost: +1 harness, bash-only, ~1 s.
- Not verified from here (all confirmed in B0/B1, none blocks Part A): certbot's per-run rewrite of
  `letsencrypt.log`; the exact free-tier features of the external services (HTTPS monitor with a
  Telegram/email contact is the only hard requirement); the profile disk size.

## Out of scope (explicit)
OTEL on this box; the restore drill (0218, done); the full 0033/0034 agent (this task delivers
the profile-box slice and cross-references item 5); the telemetry box's coverage; wiki writes
(fkit-wiki at close); moving/closing task files (producer, ADR-033).

## Effort
Part A ~½ day incl. tests. Part B ~2 h of wall time, mostly waiting for alerts to arrive.

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

- Q1 — On-box checker alert transport. (A, Rec) external dead-man's-switch ping service (healthchecks.io-style: period 1 day, grace 3 h; its Telegram+email integration does the delivery from outside Russia; box holds only a ping URL): also catches the checker's own death. (B) Telegram straight from bash via the existing TELEGRAM_PROXY_URL + a new ops chat id: no new account, but silent when the checker/proxy dies and puts a bot token in a root-readable env on the box. (C) both. B0 (curl from the box to the ping host) decides A's feasibility — if unreachable, B. → **Owner ruled (A).**
- Q2 — External uptime service and endpoints. (Rec) UptimeRobot-class free HTTPS monitor, TWO monitors: /health (liveness) AND /ready (DB-backed) — /health alone stays green while Postgres is down; both are unlimited and un-rate-limited. Alternative: /health only, as 0182:389-391 literally asks. → **Owner ruled both.**
- Q3 — Log retention values. (Rec) mirror update.sh exactly, 100m × 10 per container (2 GB ceiling for two containers), so there is one number project-wide and the harness constant is shared. Alternative: 50m × 5 for the low-RAM/low-disk box (disk size not recorded anywhere — B1 reads df -h before this is decided). → **Owner ruled 100m × 10.**
- Q4 — Prune scope. (Rec) keep-list = images of ALL containers (docker ps -a) + PREV_PROFILE_IMAGE + PROFILE_IMAGE; remove everything else (covers a superseded postgres:16-alpine too). Alternative: profile-repo images only, leave other repos untouched. Either way the brief's literal 'mirror docker image prune -a -f' is NOT followed — it would delete the rollback image; confirm that reading. → **Owner ruled keep-list, remove all others; confirmed the reading.**
- Q5 — Checker cadence and thresholds. (Rec) daily 08:00 UTC; daily marker ≤ 26 h; daily object must exist remotely; weekly newest ≤ 8 days; renewal attempt ≤ 13 h; cert ≥ 20 days remaining; renew-log growth = alert. Confirm or re-tune. → **Owner confirmed as proposed.**
- Q6 — Behaviour when the box is in LOCAL backup mode (no backup.env). (Rec) FAIL loud ('off-box backups not configured') — a box without off-box backups should page daily. Alternative: skip the S3 checks silently on a never-configured box (0034's fresh-box courtesy). → **Owner ruled FAIL loud.**
- Q7 — Edits to other tasks' briefs. (Rec) coder edits only knowledge-base docs (container-log-retention.md, backup runbook :23, CLAUDE.md harness table); the cross-reference in 0034 item 5 ('profile half implemented by 0219') and 0182's :385-391 limitation bullets are producer-side notes at close. Alternative: coder adds the 0034 note in the build step. → **Owner ruled producer at close.**
