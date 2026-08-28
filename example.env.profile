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

# Game-server IPs allowed to reach internal endpoints (POST /internal/...),
# comma- or space-separated. Wired into the nginx /internal/ allowlist now as a
# firewall hook (dormant: allow-list + deny all); T5 adds the actual route. Game
# prod = 91.197.98.116, game dev = 79.174.91.179.
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

# Deprecated emergency fallback only:
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
# -----------------------------------------------------------
FEEDBACK_TELEGRAM_CHAT_ID=
TELEGRAM_PROXY_URL=

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
# Secrets — put these in .env.profile.secret (gitignored), NOT here:
# -----------------------------------------------------------
# POSTGRES_PASSWORD=      # REQUIRED — Postgres password for the profile DB
# DATABASE_URL=           # optional — defaults to
#                         #   postgresql://<user>:<password>@postgres:5432/<db>
# PROFILE_INTERNAL_TOKEN= # service token shared with the game server (T6);
#                         #   auto-generated on the box if left blank
# DOCKER_TOKEN=           # registry token for `docker login` (if the repo is private)
# PROFILE_BACKUP_S3_ACCESS_KEY=  # S3 access key, scoped to the backup bucket only (T8)
# PROFILE_BACKUP_S3_SECRET_KEY=  # S3 secret key for the above (T8)
# FEEDBACK_TELEGRAM_TOKEN=       # operator bot token (task 0067) — same bot as the game
#                                #   server's feedback sends; copy from the game .env.secret
