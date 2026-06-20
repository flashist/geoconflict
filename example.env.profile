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
# Secrets — put these in .env.profile.secret (gitignored), NOT here:
# -----------------------------------------------------------
# POSTGRES_PASSWORD=      # REQUIRED — Postgres password for the profile DB
# DATABASE_URL=           # optional — defaults to
#                         #   postgresql://<user>:<password>@postgres:5432/<db>
# PROFILE_INTERNAL_TOKEN= # service token shared with the game server (T6);
#                         #   auto-generated on the box if left blank
# DOCKER_TOKEN=           # registry token for `docker login` (if the repo is private)
