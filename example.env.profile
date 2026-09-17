# .env.profile — config for the dedicated player-profile backend VPS (api.geoconflict.ru)
#
# Copy the public values here to .env.profile and the secrets to .env.profile.secret.
# Both are gitignored. build-deploy-profile.sh loads, in order:
#   .env -> .env.secret -> .env.profile -> .env.profile.secret

# Required: IP or hostname of the profile VPS (reg.ru, Russia).
PROFILE_SERVER_HOST=

# Public domain for HTTPS. When set, host nginx + Let's Encrypt are configured.
# Prerequisite: the DNS A record for this domain MUST point to PROFILE_SERVER_HOST
# BEFORE running setup (certbot HTTP-01 challenge needs it; setup-profile.sh
# fail-closes its DNS pre-check otherwise).
PROFILE_DOMAIN=api.geoconflict.ru

# Let's Encrypt registration email (default: ruflashist@gmail.com).
# CERTBOT_EMAIL=ruflashist@gmail.com

# Profile API container port. Host nginx proxies 443 -> 127.0.0.1:PROFILE_PORT.
PROFILE_PORT=8080

# Swapfile size in GB for the low-RAM box (0 disables management). OOM cushion.
PROFILE_SWAP_SIZE_GB=4

# Postgres user / database name (defaults: profile). Password is a secret (below).
POSTGRES_USER=profile
POSTGRES_DB=profile

# Source IPs allowed to reach internal endpoints (POST /internal/...), comma- or
# space-separated. Wired into the nginx /internal/ allowlist (allow-list + deny all).
#
# ⚠️ NOT game servers only, since task 0277: the MONITORING box must be in this list
# too, because the alert webhook route lives under /internal/. The full set is the game
# servers plus the monitoring box.
#
# 🚨 GET THIS WRONG AND ALERTING DIES SILENTLY. An address that is missing, changed, or
# rebuilt makes nginx answer 403 to the alert webhook — and a 403 makes the sender mark
# its notification channel permanently disabled, after which every later alert is
# dropped at source with no retry and no error anywhere. A whitespace-only or
# comma-only value is just as bad: it renders a bare `deny all`. After changing any of
# these addresses you must ALSO re-enable the webhook channel in the monitoring UI —
# fixing the address alone does not undo the disable. See
# ai-agents/knowledge-base/alert-delivery-runbook.md.
PROFILE_INTERNAL_ALLOW_IPS=91.197.98.116

# Container registry the profile image is pushed to / pulled from
# (reuses the existing game registry credentials).
DOCKER_USERNAME=
DOCKER_REPO=

# SSH auth — standard path:
#   PROFILE_SSH_KEY    path to private key (recommended)
PROFILE_SSH_KEY=~/.ssh/id_rsa
# Optional: SSH login user (default: root)
# PROFILE_SSH_USER=root

# Deprecated emergency fallback only — and DEAD since task 0221: setup-profile.sh turns password
# authentication off on the box (root is key-only), AND refuses to do that on a deploy that came
# in over this fallback (the operator may not hold the key), so a password-mode deploy aborts at
# the sshd section and cannot complete a first provision either. To bootstrap a fresh
# password-only box: ssh-copy-id the deploy key first, then deploy over PROFILE_SSH_KEY.
# ALLOW_PROFILE_SSH_PASSWORD_FALLBACK=1
# PROFILE_SSH_PASSWORD=

# -----------------------------------------------------------
# Operator Telegram notifications (task 0067 — citizen name changes).
# The profile server pings the operator when a citizen submits a name-change
# request awaiting moderation. This reuses the EXISTING feedback bot: same bot,
# same chat, same proxy, same variable names as the game server's .env — copy the
# values from there. Leave blank to disable notifications (requests still work).
#
# api.telegram.org is BLOCKED from Russian IPs and this VPS is reg.ru/Moscow, so
# TELEGRAM_PROXY_URL is required in practice, not optional.
# The bot TOKEN is a secret — put it in .env.profile.secret, not here.
#
# PERSISTED ON THE BOX (task 0220): all three are kept in /opt/profile/.feedback_telegram_token,
# .feedback_telegram_chat_id and .telegram_proxy_url. Blank on a redeploy REUSES the value
# already on the box (the deploy output says so, by name); a new value overwrites it. To
# CLEAR one, blanking is not enough — `rm /opt/profile/.<name>` on the box, then redeploy.
# -----------------------------------------------------------
FEEDBACK_TELEGRAM_CHAT_ID=
TELEGRAM_PROXY_URL=

# -----------------------------------------------------------
# Forum topic routing (task 0277). The operator chat is a FORUM group, so each kind
# of message can land in its own topic. Paste the numeric topic id of each one.
#
# BLANK IS FULLY SUPPORTED and is exactly today's behaviour: the message goes to
# General. An unset topic degrades to "works, in the wrong room" — never to "fails".
# ⚠️ Do NOT set a topic id to an empty-looking placeholder like "0" or " ": a blank
# value omits the field, while a WRONG value makes Telegram reject the message and
# the notification is LOST, not merely mis-filed.
#
# ⛔ There is deliberately no TELEGRAM_TOPIC_FEEDBACK here. Player feedback is sent by
# the GAME server, not this box, so a feedback topic on this pipeline would be config
# nothing reads. It belongs to the game pipeline's own task.
#
# PERSISTED ON THE BOX (0220 pattern): /opt/profile/.telegram_topic_alerts and
# .telegram_topic_name_changes. Blank on a redeploy REUSES the value already there; to
# CLEAR one, `rm /opt/profile/.<name>` on the box, then redeploy.
# -----------------------------------------------------------
TELEGRAM_TOPIC_ALERTS=
TELEGRAM_TOPIC_NAME_CHANGES=

# -----------------------------------------------------------
# Off-box backup (T8) — encrypted DAILY pg_dump uploaded to RU-resident S3.
# The daily backup is installed ONLY when endpoint+bucket+access+secret+age-recipient are all
# set; otherwise setup-profile.sh keeps the interim weekly LOCAL pg_dump. Backups contain PII
# (Yandex IDs, display names, payment state) so the destination MUST be RU-resident (152-FZ).
# -----------------------------------------------------------
# S3 endpoint URL for the backup bucket (Reg.ru Object Storage, or any RU-resident S3).
PROFILE_BACKUP_S3_ENDPOINT=
# S3 region for the bucket (leave blank if the provider does not require one).
PROFILE_BACKUP_S3_REGION=
# Private bucket dedicated to profile backups.
PROFILE_BACKUP_S3_BUCKET=
# Key prefix within the bucket (default: profiles → profiles/daily/... + profiles/weekly/...).
PROFILE_BACKUP_S3_PREFIX=profiles
# age RECIPIENT (public key, "age1...") the dump is encrypted to before upload. Generate ONCE
# with `age-keygen -o profile-backup-identity.txt`: paste the "Public key:" value here; keep
# the private identity OFF the box (e.g. a password manager) — it is needed only to restore.
PROFILE_BACKUP_AGE_RECIPIENT=
# Retention (days). Default: 14 daily + 56 (≈8 weekly) ≈ two months of coverage.
PROFILE_BACKUP_RETENTION_DAILY_DAYS=14
PROFILE_BACKUP_RETENTION_WEEKLY_DAYS=56

# -----------------------------------------------------------
# Monitoring + the login-creation switch (task 0274).
#
# ⚠️ BOTH LINES BELOW ARE DELIBERATELY COMMENTED OUT, and that matters: this file is
# sourced BEFORE .env.profile.secret and after .env/.env.secret, so a BLANK assignment
# here would override a value set earlier. A commented line sets nothing; a blank line
# clears something.
# -----------------------------------------------------------
# OTLP ingest endpoint of the telemetry box. The profile API exports metrics to
# <endpoint>/v1/metrics every 15 s. Copy the SAME value the game server's prod env uses
# — the ingest path is anonymous, so there is NO DSN, project token or auth header to
# set here and none should ever be added. Empty means the box exports nothing, which
# means NO alert can ever fire; setup-profile.sh reports that explicitly and also
# probes the endpoint on every deploy. Persisted on the box
# (/opt/profile/.otel_endpoint): blank on a redeploy REUSES it; to clear it, `rm` that
# file on the box and redeploy.
# OTEL_EXPORTER_OTLP_ENDPOINT=
#
# The incident lever. 'false' pauses CREATING players at POST /v1/login: an existing
# player still logs in normally, a new platform id gets 503 creation_paused and no row
# is written. Anything else — including a typo — leaves creation ENABLED (fail open, so
# a mistyped value can never be a silent outage); setup-profile.sh reports an
# unrecognised value as a FINDING. The game server's own resolve is NEVER gated by
# this: a real match stays creditable.
#   To flip it on the box: edit /opt/profile/profile.env AND
#   /opt/profile/.login_create_enabled, then
#     docker compose -f /opt/profile/docker-compose.yml up -d --force-recreate --no-deps profile-api
#   NOT `restart` — restart does not re-read env_file.
# Persisted on the box, so a redeploy mid-incident cannot quietly resume creation.
# PROFILE_LOGIN_CREATE_ENABLED=

# -----------------------------------------------------------
# Secrets — put these in .env.profile.secret (gitignored), NOT here:
# -----------------------------------------------------------
# POSTGRES_PASSWORD=      # REQUIRED — Postgres password for the profile DB
# DATABASE_URL=           # optional — defaults to
#                         #   postgresql://<user>:<password>@postgres:5432/<db>
# PROFILE_INTERNAL_TOKEN= # REQUIRED — SHARED secret with the game server (T6). Generate
#                         #   it ONCE (`openssl rand -hex 32`) and set the SAME value here
#                         #   AND in the game server's env. Blank does NOT work: the box
#                         #   mints its own (or re-adopts an old persisted one), the game
#                         #   server 401s on every credit call, and the XP is DROPPED.
#                         #   A value set here is written through to /opt/profile/.internal_token
#                         #   (0220), so the persisted copy never goes stale.
# DOCKER_TOKEN=           # registry token for `docker login` (if the repo is private)
# PROFILE_BACKUP_S3_ACCESS_KEY=  # S3 access key, scoped to the backup bucket only (T8)
# PROFILE_BACKUP_S3_SECRET_KEY=  # S3 secret key for the above (T8)
# FEEDBACK_TELEGRAM_TOKEN=       # operator bot token (task 0067) — same bot as the game
#                                #   server's feedback sends; copy from the game .env.secret.
#                                #   Persisted on the box (0220): blank = reuse; to clear,
#                                #   rm /opt/profile/.feedback_telegram_token there.
# YANDEX_PAYMENTS_SECRET=        # Yandex per-game payments secret key (HMAC), from the
#                                #   Yandex Games dashboard once task 0014 registers the
#                                #   catalog. BLANK IS SUPPORTED: /v1/payments/* fails
#                                #   closed with 503; everything else keeps working.
#                                #   Persisted on the box (0220): blank on a redeploy REUSES
#                                #   the value already there (never a silent overwrite); to
#                                #   clear it, rm /opt/profile/.yandex_payments_secret there.
# PROFILE_SESSION_SECRET=        # OPTIONAL — login session HMAC key (task 0271). Leave BLANK:
#                                #   the box generates it once and persists it in
#                                #   /opt/profile/.session_secret, and every later deploy reuses
#                                #   it. Setting a value here ROTATES the key: every player's
#                                #   session is invalidated and the client silently logs in again
#                                #   (nothing is lost). Minimum 32 characters. NOT shared with
#                                #   the game server.
# PROFILE_ALERT_WEBHOOK_TOKEN=   # shared secret for the alert webhook route (task 0277).
#                                #   The monitoring side carries it IN THE REQUEST BODY (it
#                                #   cannot send a custom header), so this exact value must be
#                                #   pasted into its webhook channel's payload template too.
#                                #   🚨 NEVER let the box mint this. It is NOT generated: a
#                                #   value only the box knows is a value the sender does not,
#                                #   so every alert would be dropped — silently, forever. This
#                                #   is the PROFILE_INTERNAL_TOKEN trap (0182) again.
#                                #   BLANK IS SUPPORTED but relays NOTHING (and warns at boot).
#                                #   ⚠️ It is recoverable from the monitoring side's own stored
#                                #   notification history, not just its config screen — so
#                                #   rotating it here is not erasure of the old value.
#                                #   Persisted on the box: blank = reuse; to clear it,
#                                #   rm /opt/profile/.alert_webhook_token there.
# PROFILE_CHECKS_PING_URL=       # dead-man's-switch ping URL for the daily on-box checks
#                                #   (task 0219: backup freshness + certbot renewal). Create a
#                                #   check on a healthchecks.io-style service (period 1 day,
#                                #   grace 3 h, Telegram + email attached) and paste its ping
#                                #   URL. It is a capability (anyone holding it can silence the
#                                #   alert) — keep it here, not in .env.profile. BLANK IS
#                                #   SUPPORTED but WARNS: the checks run and log, nobody is paged.
