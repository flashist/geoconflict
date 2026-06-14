#!/bin/bash
# build-deploy-profile.sh - Build/push the profile API image and (re-)run setup on
# the player-profile VPS. Usage: ./build-deploy-profile.sh
#
# Reads config from .env / .env.secret / .env.profile / .env.profile.secret.
# Builds Dockerfile.profile locally, pushes it to the registry, uploads
# setup-profile.sh, and runs it on the remote server.
# Safe to run multiple times — setup-profile.sh is idempotent.

set -e

SETUP_SCRIPT="./setup-profile.sh"
DOCKERFILE="./Dockerfile.profile"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        set -o allexport
        source "$file"
        set +o allexport
    fi
}

is_truthy() {
    case "$1" in
        1|true|TRUE|yes|YES|on|ON) return 0 ;;
        *) return 1 ;;
    esac
}

# ── Load config ───────────────────────────────────────────────────────────────

load_env_file ".env"
load_env_file ".env.secret"

if [ -f .env.profile ]; then
    load_env_file ".env.profile"
else
    echo "Warning: .env.profile not found — using env vars from .env or shell"
fi

load_env_file ".env.profile.secret"

# ── Validate ──────────────────────────────────────────────────────────────────

if [ -z "${PROFILE_SERVER_HOST:-}" ]; then
    echo "Error: PROFILE_SERVER_HOST is not set."
    echo "Add it to .env.profile or export it before running."
    exit 1
fi

if [ ! -f "$SETUP_SCRIPT" ]; then
    echo "Error: $SETUP_SCRIPT not found"
    exit 1
fi

if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: $DOCKERFILE not found"
    exit 1
fi

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "Error: POSTGRES_PASSWORD is not set."
    echo "Set it in .env.profile.secret before deploying."
    exit 1
fi

if [ -z "${DOCKER_USERNAME:-}" ] || [ -z "${DOCKER_REPO:-}" ]; then
    echo "Error: DOCKER_USERNAME and DOCKER_REPO must be set (registry for the profile image)."
    exit 1
fi

# ── Build + push the profile image ────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
    echo "Error: docker is required to build and push the profile image."
    echo "Start Docker Desktop and retry."
    exit 1
fi

VERSION_TAG=$(git rev-parse --short HEAD 2>/dev/null || node -p "require('./package.json').version")
PROFILE_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}:profile-${VERSION_TAG}"

print_header "BUILDING PROFILE IMAGE: ${PROFILE_IMAGE}"
docker build -f "$DOCKERFILE" -t "$PROFILE_IMAGE" .

if [ -n "${DOCKER_TOKEN:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

print_header "PUSHING PROFILE IMAGE"
docker push "$PROFILE_IMAGE"

# ── Resolve SSH user + auth ───────────────────────────────────────────────────

REMOTE_USER="${PROFILE_SSH_USER:-}"
if [ -z "$REMOTE_USER" ]; then
    REMOTE_USER="root"
fi

SSH_PASSWORD="${PROFILE_SSH_PASSWORD:-}"
SSH_KEY_PATH="${PROFILE_SSH_KEY:-}"
ALLOW_PASSWORD_FALLBACK="${ALLOW_PROFILE_SSH_PASSWORD_FALLBACK:-${ALLOW_SSH_PASSWORD_FALLBACK:-}}"

if [ -n "$SSH_KEY_PATH" ]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: SSH key not found at $SSH_KEY_PATH"
        exit 1
    fi
fi

if [ -z "$SSH_KEY_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    echo "Error: No profile SSH authentication configured."
    echo "Provide PROFILE_SSH_KEY. Password-based deploy is deprecated."
    exit 1
fi

# Build SSH/SCP command prefix.
# StrictHostKeyChecking=no avoids interactive prompts in automated deploys.
# Trade-off: won't detect a changed host key (e.g. after a VPS rebuild).
# If the key changes, run: ssh-keygen -R <host> and verify the new fingerprint.
SCP_CMD=(scp -o StrictHostKeyChecking=no)
SSH_CMD=(ssh -o StrictHostKeyChecking=no)

if [ -n "$SSH_KEY_PATH" ]; then
    SCP_CMD+=(-i "$SSH_KEY_PATH")
    SSH_CMD+=(-i "$SSH_KEY_PATH")
elif [ -n "$SSH_PASSWORD" ]; then
    if ! is_truthy "$ALLOW_PASSWORD_FALLBACK"; then
        echo "Error: Password-based profile deploy is disabled by default."
        echo "Configure PROFILE_SSH_KEY for the standard path."
        echo "For temporary emergency fallback, set ALLOW_PROFILE_SSH_PASSWORD_FALLBACK=1."
        exit 1
    fi
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password auth. Install it or provide PROFILE_SSH_KEY instead."
        exit 1
    fi
    echo "Warning: Using deprecated password-based SSH fallback for profile deploy."
    SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no)
    SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no)
fi

REMOTE_SCRIPT="/root/setup-profile.sh"

print_header "DEPLOYING PROFILE BACKEND TO ${PROFILE_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${PROFILE_SERVER_HOST}"
echo "Image:         ${PROFILE_IMAGE}"
echo ""

# ── Upload setup script ───────────────────────────────────────────────────────

print_header "UPLOADING SETUP SCRIPT"
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Write secrets to a temp file and copy via SCP, rather than inlining them in the
# SSH command, which would expose them in ps aux / /proc/<pid>/cmdline on the box.
LOCAL_TMPENV=$(mktemp)
chmod 600 "$LOCAL_TMPENV"
cat > "$LOCAL_TMPENV" << EOF
export PROFILE_IMAGE='${PROFILE_IMAGE}'
export PROFILE_SERVER_HOST='${PROFILE_SERVER_HOST}'
export PROFILE_DOMAIN='${PROFILE_DOMAIN:-}'
export PROFILE_PORT='${PROFILE_PORT:-8080}'
export PROFILE_SWAP_SIZE_GB='${PROFILE_SWAP_SIZE_GB:-4}'
export POSTGRES_USER='${POSTGRES_USER:-profile}'
export POSTGRES_DB='${POSTGRES_DB:-profile}'
export POSTGRES_PASSWORD='${POSTGRES_PASSWORD}'
export DATABASE_URL='${DATABASE_URL:-}'
export PROFILE_INTERNAL_TOKEN='${PROFILE_INTERNAL_TOKEN:-}'
export PROFILE_INTERNAL_ALLOW_IPS='${PROFILE_INTERNAL_ALLOW_IPS:-}'
export CERTBOT_EMAIL='${CERTBOT_EMAIL:-ruflashist@gmail.com}'
export DOCKER_USERNAME='${DOCKER_USERNAME:-}'
export DOCKER_TOKEN='${DOCKER_TOKEN:-}'
EOF
REMOTE_ENV="/root/.profile-deploy-env-$$"
"${SCP_CMD[@]}" "$LOCAL_TMPENV" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_ENV}"
rm -f "$LOCAL_TMPENV"

"${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" \
    "chmod 600 ${REMOTE_ENV} && \
    chmod +x ${REMOTE_SCRIPT} && \
    . ${REMOTE_ENV} && \
    rm -f ${REMOTE_ENV} && \
    ${REMOTE_SCRIPT}"

print_header "DONE"
echo "Profile backend setup completed on ${PROFILE_SERVER_HOST}."
echo ""
echo "Next steps:"
echo "  1. Verify: curl https://${PROFILE_DOMAIN:-<domain>}/health   # expect {\"status\":\"ok\"}"
echo "  2. Set PROFILE_API_URL=https://${PROFILE_DOMAIN:-<domain>} in .env.<env> for the game server."
echo "  3. (T6) Share PROFILE_INTERNAL_TOKEN with the game server's .env.prod."
echo "======================================================"
