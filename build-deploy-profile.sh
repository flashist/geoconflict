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

# Enforce the Docker secret-boundary gate BEFORE building — same as the game path
# (build.sh:110). A broad-copy regression in Dockerfile.profile must never package
# local .env*/secret material into the image (the 2026-04-21 leak class).
print_header "CHECKING DOCKER SECRET BOUNDARY"
bash scripts/check-docker-secret-boundary.sh

print_header "BUILDING PROFILE IMAGE: ${PROFILE_IMAGE}"
docker build -f "$DOCKERFILE" -t "$PROFILE_IMAGE" .

# Runtime inspection of the built image — fail if any .env*/secret file rode along.
print_header "INSPECTING BUILT IMAGE FOR SECRETS"
bash scripts/check-docker-secret-boundary.sh --inspect-image "$PROFILE_IMAGE"

if [ -n "${DOCKER_TOKEN:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

print_header "PUSHING PROFILE IMAGE"
docker push "$PROFILE_IMAGE"

# Resolve the immutable digest pushed to the registry. Per
# docs/security/registry-image-policy.md the digest — not the mutable tag — is the
# production trust anchor; the box deploys AND rolls back by digest. Fail closed if
# we cannot resolve it: an unverifiable image must not reach a box that holds
# profile data + service secrets.
PROFILE_DIGEST=$(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$PROFILE_IMAGE" \
    | grep "^${DOCKER_USERNAME}/${DOCKER_REPO}@sha256:" | head -1 || true)
if [ -z "$PROFILE_DIGEST" ]; then
    echo "Error: could not resolve the pushed image digest for ${PROFILE_IMAGE}."
    echo "Refusing to deploy by mutable tag (registry-image-policy.md requires a digest)."
    exit 1
fi
echo "Resolved digest: ${PROFILE_DIGEST}"

# Deploy by digest, not the tag. The box bakes this ref into compose, so its
# rollback capture (.Config.Image) is a digest too.
PROFILE_DEPLOY_REF="$PROFILE_DIGEST"

# Minimum deploy record (registry-image-policy.md §Minimum Deploy Record): durable +
# private, appended to a gitignored local file (never committed). Written now as
# validation_result=pending; the cleanup trap finalizes it to passed/failed based on
# the remote setup result (which runs the health + DB-credential gates), so a failed
# deploy never leaves clean-looking provenance. Only validation_result=passed records
# are rollback-eligible.
DEPLOY_RECORD=".profile-deploy-record"
DEPLOY_OUTCOME="failed"
{
    echo "----"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "env=profile"
    echo "host=${PROFILE_SERVER_HOST}"
    echo "tag=${PROFILE_IMAGE}"
    echo "digest=${PROFILE_DIGEST}"
    echo "commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "operator=$(whoami 2>/dev/null || echo unknown)"
    echo "validation_result=pending"
} | tee -a "$DEPLOY_RECORD"
echo "Deploy record appended to ${DEPLOY_RECORD} (gitignored, finalized at exit)."

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
# StrictHostKeyChecking=accept-new: trust the host key on first connect (TOFU) but
# REJECT a changed key — DNS/route interception or a rebuilt/stale VPS address — so
# the profile box's prod DB password + service/registry tokens are never sent to an
# impostor. (This box carries more sensitive secrets than the telemetry box.)
# If the key legitimately changes, run: ssh-keygen -R <host>, re-verify, then redeploy.
SCP_CMD=(scp -o StrictHostKeyChecking=accept-new)
SSH_CMD=(ssh -o StrictHostKeyChecking=accept-new)

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
    SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=accept-new)
    SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=accept-new)
fi

REMOTE_SCRIPT="/root/setup-profile.sh"

print_header "DEPLOYING PROFILE BACKEND TO ${PROFILE_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${PROFILE_SERVER_HOST}"
echo "Image (tag):   ${PROFILE_IMAGE}"
echo "Deploy ref:    ${PROFILE_DEPLOY_REF}"
echo ""

# ── Upload setup script ───────────────────────────────────────────────────────

print_header "UPLOADING SETUP SCRIPT"
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Stage secrets in a local temp file and SCP it, rather than inlining them in the
# SSH command (which would expose them in ps aux / /proc/<pid>/cmdline on the box).
# Clean up BOTH the local and the remote staging file on ANY exit — interrupted
# scp, a failed source, or Ctrl-C — so credentials never linger anywhere.
REMOTE_ENV="/root/.profile-deploy-env-$$"
LOCAL_TMPENV=$(mktemp)
REMOTE_ENV_STAGED=0
cleanup_secrets() {
    rm -f "$LOCAL_TMPENV"
    if [ "$REMOTE_ENV_STAGED" = "1" ]; then
        # Best-effort; ignore errors (the host may be unreachable on a failure path).
        "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" "rm -f ${REMOTE_ENV}" >/dev/null 2>&1 || true
    fi
    # Finalize the deploy record with the validation outcome. DEPLOY_OUTCOME defaults to
    # "failed" and is flipped to "passed" only after the remote setup returns success, so
    # an aborted/failed deploy is recorded as failed, never as trusted provenance.
    if [ -n "${DEPLOY_RECORD:-}" ]; then
        echo "validation_result=${DEPLOY_OUTCOME:-failed}" >> "$DEPLOY_RECORD"
    fi
}
trap cleanup_secrets EXIT INT TERM
chmod 600 "$LOCAL_TMPENV"

# printf %q emits shell-safe, re-sourceable values — robust to passwords/tokens
# containing quotes, spaces, or other special characters.
{
    printf "export PROFILE_IMAGE=%q\n" "$PROFILE_DEPLOY_REF"
    printf "export PROFILE_SERVER_HOST=%q\n" "$PROFILE_SERVER_HOST"
    printf "export PROFILE_DOMAIN=%q\n" "${PROFILE_DOMAIN:-}"
    printf "export PROFILE_PORT=%q\n" "${PROFILE_PORT:-8080}"
    printf "export PROFILE_SWAP_SIZE_GB=%q\n" "${PROFILE_SWAP_SIZE_GB:-4}"
    printf "export POSTGRES_USER=%q\n" "${POSTGRES_USER:-profile}"
    printf "export POSTGRES_DB=%q\n" "${POSTGRES_DB:-profile}"
    printf "export POSTGRES_PASSWORD=%q\n" "$POSTGRES_PASSWORD"
    printf "export DATABASE_URL=%q\n" "${DATABASE_URL:-}"
    printf "export PROFILE_INTERNAL_TOKEN=%q\n" "${PROFILE_INTERNAL_TOKEN:-}"
    printf "export PROFILE_INTERNAL_ALLOW_IPS=%q\n" "${PROFILE_INTERNAL_ALLOW_IPS:-}"
    printf "export CERTBOT_EMAIL=%q\n" "${CERTBOT_EMAIL:-ruflashist@gmail.com}"
    printf "export DOCKER_USERNAME=%q\n" "${DOCKER_USERNAME:-}"
    printf "export DOCKER_TOKEN=%q\n" "${DOCKER_TOKEN:-}"
} > "$LOCAL_TMPENV"

REMOTE_ENV_STAGED=1
"${SCP_CMD[@]}" "$LOCAL_TMPENV" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_ENV}"

"${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" \
    "chmod 600 ${REMOTE_ENV} && \
    chmod +x ${REMOTE_SCRIPT} && \
    . ${REMOTE_ENV} && \
    rm -f ${REMOTE_ENV} && \
    ${REMOTE_SCRIPT}"
# Happy path: the remote file is already gone, so skip the trap's remote cleanup.
REMOTE_ENV_STAGED=0
# Remote setup (health + DB-credential gates) returned success — mark the deploy
# record validated so this digest is rollback-eligible.
DEPLOY_OUTCOME="passed"

print_header "DONE"
echo "Profile backend setup completed on ${PROFILE_SERVER_HOST}."
echo ""
echo "Next steps:"
echo "  1. Verify: curl https://${PROFILE_DOMAIN:-<domain>}/health   # expect {\"status\":\"ok\"}"
echo "  2. Set PROFILE_API_URL=https://${PROFILE_DOMAIN:-<domain>} in .env.<env> for the game server."
echo "  3. (T6) Share PROFILE_INTERNAL_TOKEN with the game server's .env.prod."
echo "======================================================"
