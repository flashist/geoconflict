#!/bin/bash
# deploy.sh - Deploy application to environment-specific VPS host
# Usage: ./deploy.sh [dev|staging|prod] [version_tag] [--enable_basic_auth]

set -e

ENABLE_BASIC_AUTH=false

print_header() {
    echo "======================================================"
    echo "🚀 $1"
    echo "======================================================"
}

POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --enable_basic_auth)
            ENABLE_BASIC_AUTH=true
            shift
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done
set -- "${POSITIONAL_ARGS[@]}"

if [ $# -ne 2 ]; then
    echo "Error: Please specify environment and version tag"
    echo "Usage: $0 [dev|staging|prod] [version_tag] [--enable_basic_auth]"
    exit 1
fi

ENV="$1"
VERSION_TAG="$2"

if [[ "$ENV" != "dev" && "$ENV" != "staging" && "$ENV" != "prod" ]]; then
    echo "Error: Environment must be one of dev, staging, or prod"
    exit 1
fi

# ── Config parity guard (task 0064; ARMED by task 0298) ─────────────────────────
# Names, by NAME only, any variable this pipeline reads but never forwards. It is
# deliberately placed HERE: after the argument validation above and BEFORE the first
# load_env_file below, so at the moment it runs no secret has been sourced into this
# shell. That is what makes the no-leak property structural rather than a promise.
#
# ENFORCING (task 0298). This STOPS the deploy — before anything is loaded, copied or
# run on the server — on:
#   - a missing checker, or a missing node: the guard could not run (task 0203 R4b; the
#     missing-node case accepted by the owner at 0298's plan approval, 2026-09-28);
#   - a non-zero exit from the checker: a REQUIRED finding in the game or client
#     pipeline, a PARSE-FAILURE / DYNAMIC-READ / SKIP tagged game, client or "global",
#     a usage error (exit 2), an internal crash, or a signal.
# Findings for the PROFILE pipeline are printed but do not block this deploy
# (--block-on=game,client; the R14 ruling). build-deploy.sh runs this same check before
# it bumps and pushes a version; this copy stays because deploy.sh can be run on its own.
# There is deliberately no override (owner ruling 2026-09-28, Q2): fix a wrong block with
# an allowlist entry WITH a reason, or a one-line revert — both visible in git.
PARITY_CHECKER="$(dirname "$0")/scripts/check-config-parity.mjs"
if [ ! -f "$PARITY_CHECKER" ]; then
    echo "❌ Config parity guard not found ($PARITY_CHECKER) — refusing to deploy."
    exit 1
fi
if ! command -v node >/dev/null 2>&1; then
    echo "❌ node not found — the config parity guard cannot run, refusing to deploy."
    exit 1
fi
if ! node "$PARITY_CHECKER" --pipeline=all --enforce --block-on=game,client; then
    echo "❌ Config parity guard failed (findings above) — refusing to deploy."
    echo "   Fix: forward the variable in this script's heredoc (or DefinePlugin for the client),"
    echo "   or add an entry WITH a reason to scripts/config-parity-allowlist.json; for an unmapped"
    echo "   src/ folder, add its one line to DIR_PIPELINE in scripts/check-config-parity.mjs."
    exit 1
fi

# ── Config value guard (task 0064 Phase 2) ────────────────────────────────────
# Judges the VALUES this deploy is about to forward: a required key must not be blank,
# and on prod PUBLIC_PROTOCOL / API_BASE_URL / JWT_ISSUER / PROFILE_API_URL must be https
# with no bare-IP host. It prints key NAMES only, never a value.
#
# Its safety story is DIFFERENT from the parity guard above, on purpose. It must run
# AFTER the env files are loaded and every default is applied (it is called right before
# the ssh below), because judging what is really forwarded is the whole point. So values
# reach it on STDIN as `name NUL value NUL` records written by the printf builtin, not
# through the environment: most heredoc sources are computed here and never exported.
# No value lands in any process's argv; the ssh command below already carries them all.
#
# The source names come from the checker itself (--list-sources). Each is re-validated
# as a plain shell name before the indirect ${!name} read, because an indirect read of
# something like `a[$(cmd)]` would RUN cmd.
#
# ENFORCING (task 0298; owner ruling 2026-09-28, Q1 = "arm both"). The function returns
# non-zero — and the call site below stops the deploy — on a missing checker, a missing
# node, a failed --list-sources, an empty source list, or a non-zero exit from the
# checker's --enforce run. Every one of those is an explicit `return`: this function is
# called from an `||` list, where bash switches `set -e` OFF inside it, so nothing here may
# rely on set -e. Values are judged on prod only, so dev/staging can stop only on a wiring
# fault. A blank value that is blank BY DECISION needs a game `phase: 2` `optional` entry
# (with a reason) in scripts/config-parity-allowlist.json.
run_config_value_guard() {
    local checker sources status
    checker="$(dirname "$0")/scripts/check-config-values.mjs"
    if [ ! -f "$checker" ]; then
        echo "config value guard: checker not found ($checker)"
        return 1
    fi
    if ! command -v node >/dev/null 2>&1; then
        echo "config value guard: node not found — the guard cannot run"
        return 1
    fi
    if ! sources=$(node "$checker" --list-sources); then
        echo "config value guard: could not list the deploy heredoc's value sources"
        return 1
    fi
    if [ -z "$sources" ]; then
        echo "config value guard: the deploy heredoc listed no value sources"
        return 1
    fi
    status=0
    printf '%s\n' "$sources" | while IFS= read -r name; do
        [[ $name =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
        printf '%s\0%s\0' "$name" "${!name-}"
    done | node "$checker" --values-stdin --deploy-env="$ENV" --enforce || status=$?
    return "$status"
}

uppercase_env=$(echo "$ENV" | tr '[:lower:]' '[:upper:]')

lookup_env_value() {
    local key="$1"
    eval "printf '%s' \"\${$key}\""
}

is_truthy() {
    case "$1" in
        1|true|TRUE|yes|YES|on|ON)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "Loading configuration from $file..."
        set -o allexport
        source "$file"
        set +o allexport
    fi
}

load_env_file ".env"
load_env_file ".env.secret"
load_env_file ".env.$ENV"
load_env_file ".env.$ENV.secret"

SERVER_HOST_VAR="SERVER_HOST_${uppercase_env}"
SERVER_HOST=$(lookup_env_value "$SERVER_HOST_VAR")
if [ -z "$SERVER_HOST" ] && [ -n "$VPS_IP" ]; then
    SERVER_HOST="$VPS_IP"
fi
if [ -z "$SERVER_HOST" ]; then
    echo "Error: Define ${SERVER_HOST_VAR} or set VPS_IP in the ${ENV} env file"
    exit 1
fi

PUBLIC_HOST_VAR="PUBLIC_HOST_${uppercase_env}"
if [ -z "$PUBLIC_HOST" ]; then
    PUBLIC_HOST=$(lookup_env_value "$PUBLIC_HOST_VAR")
fi
if [ -z "$PUBLIC_HOST" ]; then
    PUBLIC_HOST="$SERVER_HOST"
fi

PUBLIC_PROTOCOL_VAR="PUBLIC_PROTOCOL_${uppercase_env}"
if [ -z "$PUBLIC_PROTOCOL" ]; then
    PUBLIC_PROTOCOL=$(lookup_env_value "$PUBLIC_PROTOCOL_VAR")
fi
if [ -z "$PUBLIC_PROTOCOL" ]; then
    PUBLIC_PROTOCOL="http"
fi

PUBLIC_PORT_VAR="PUBLIC_PORT_${uppercase_env}"
if [ -z "$PUBLIC_PORT" ]; then
    PUBLIC_PORT=$(lookup_env_value "$PUBLIC_PORT_VAR")
fi
if [ -z "$PUBLIC_PORT" ]; then
    PUBLIC_PORT="80"
fi

DEPLOYMENT_ID_VAR="DEPLOYMENT_ID_${uppercase_env}"
if [ -z "$DEPLOYMENT_ID" ]; then
    DEPLOYMENT_ID=$(lookup_env_value "$DEPLOYMENT_ID_VAR")
fi
if [ -z "$DEPLOYMENT_ID" ]; then
    DEPLOYMENT_ID="$ENV"
fi

API_BASE_URL_VAR="API_BASE_URL_${uppercase_env}"
if [ -z "$API_BASE_URL" ]; then
    API_BASE_URL=$(lookup_env_value "$API_BASE_URL_VAR")
fi

JWT_ISSUER_VAR="JWT_ISSUER_${uppercase_env}"
if [ -z "$JWT_ISSUER" ]; then
    JWT_ISSUER=$(lookup_env_value "$JWT_ISSUER_VAR")
fi

JWT_AUDIENCE_VAR="JWT_AUDIENCE_${uppercase_env}"
if [ -z "$JWT_AUDIENCE" ]; then
    JWT_AUDIENCE=$(lookup_env_value "$JWT_AUDIENCE_VAR")
fi

if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_REPO" ]; then
    echo "Error: DOCKER_USERNAME or DOCKER_REPO not defined in environment"
    exit 1
fi

SSH_USER_VAR="SSH_USER_${uppercase_env}"
REMOTE_USER=$(lookup_env_value "$SSH_USER_VAR")
if [ -z "$REMOTE_USER" ] && [ -n "$SSH_USER" ]; then
    REMOTE_USER="$SSH_USER"
fi

if [ -z "$REMOTE_USER" ]; then
    FALLBACK_USER_VAR="${uppercase_env}_VPS_LOGIN"
    REMOTE_USER=$(lookup_env_value "$FALLBACK_USER_VAR")
    if [ -n "$REMOTE_USER" ]; then
        echo "Warning: ${FALLBACK_USER_VAR} is deprecated. Prefer ${SSH_USER_VAR} or SSH_USER."
    fi
fi

if [ -z "$REMOTE_USER" ] && [ -n "$VPS_LOGIN" ]; then
    REMOTE_USER="$VPS_LOGIN"
    echo "Warning: VPS_LOGIN is deprecated. Prefer ${SSH_USER_VAR} or SSH_USER."
fi

if [ -z "$REMOTE_USER" ]; then
    REMOTE_USER="openfront"
fi

SSH_KEY_VAR="SSH_KEY_${uppercase_env}"
SSH_KEY_PATH=$(lookup_env_value "$SSH_KEY_VAR")
if [ -z "$SSH_KEY_PATH" ] && [ -n "$SSH_KEY" ]; then
    SSH_KEY_PATH="$SSH_KEY"
fi
if [ -n "$SSH_KEY_PATH" ]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: SSH key not found at $SSH_KEY_PATH"
        exit 1
    fi
fi

SSH_PASS_VAR="SSH_PASS_${uppercase_env}"
SSH_PASSWORD=$(lookup_env_value "$SSH_PASS_VAR")
if [ -z "$SSH_PASSWORD" ] && [ -n "$SSH_PASS" ]; then
    SSH_PASSWORD="$SSH_PASS"
fi
if [ -z "$SSH_PASSWORD" ]; then
    FALLBACK_PASS_VAR="${uppercase_env}_VPS_PASSWORD"
    SSH_PASSWORD=$(lookup_env_value "$FALLBACK_PASS_VAR")
    if [ -n "$SSH_PASSWORD" ]; then
        echo "Warning: ${FALLBACK_PASS_VAR} is deprecated. Prefer SSH keys."
    fi
fi

if [ -z "$SSH_PASSWORD" ] && [ -n "$VPS_PASSWORD" ]; then
    SSH_PASSWORD="$VPS_PASSWORD"
    echo "Warning: VPS_PASSWORD is deprecated. Prefer SSH keys."
fi

ALLOW_PASSWORD_FALLBACK_VAR="ALLOW_SSH_PASSWORD_FALLBACK_${uppercase_env}"
ALLOW_PASSWORD_FALLBACK=$(lookup_env_value "$ALLOW_PASSWORD_FALLBACK_VAR")
if [ -z "$ALLOW_PASSWORD_FALLBACK" ]; then
    ALLOW_PASSWORD_FALLBACK="$ALLOW_SSH_PASSWORD_FALLBACK"
fi

if [ -z "$SSH_KEY_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    echo "Error: No SSH authentication configured for $ENV."
    echo "Provide SSH_KEY or ${SSH_KEY_VAR}. Password-based deploys are deprecated."
    echo "Emergency fallback only: set ALLOW_SSH_PASSWORD_FALLBACK=1 and provide SSH_PASS or SSH_PASS_${uppercase_env}."
    exit 1
fi

if [[ "$VERSION_TAG" == sha256:* ]]; then
    DOCKER_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}@${VERSION_TAG}"
else
    DOCKER_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}:${VERSION_TAG}"
fi

print_header "DEPLOYMENT INFORMATION"
echo "Environment: ${ENV}"
echo "Deployment ID: ${DEPLOYMENT_ID}"
echo "Docker Image: ${DOCKER_IMAGE}"
echo "Target VPS: ${SERVER_HOST}"
echo "Public endpoint: ${PUBLIC_PROTOCOL}://${PUBLIC_HOST}:${PUBLIC_PORT}"
echo "SSH user: ${REMOTE_USER}"

if [ "$REMOTE_USER" = "root" ]; then
    REMOTE_UPDATE_PATH="/root"
else
    REMOTE_UPDATE_PATH="/home/${REMOTE_USER}"
fi
REMOTE_UPDATE_SCRIPT="${REMOTE_UPDATE_PATH}/update-openfront.sh"
UPDATE_SCRIPT="./update.sh"

if [ ! -f "$UPDATE_SCRIPT" ]; then
    echo "Error: Update script $UPDATE_SCRIPT not found!"
    exit 1
fi

print_header "COPYING UPDATE SCRIPT TO SERVER"
chmod +x "$UPDATE_SCRIPT"
SCP_CMD=(scp)
SSH_CMD=(ssh)
if [ -n "$SSH_PASSWORD" ] && [ -z "$SSH_KEY_PATH" ]; then
    if ! is_truthy "$ALLOW_PASSWORD_FALLBACK"; then
        echo "Error: Password-based deploy is disabled by default."
        echo "Configure SSH_KEY or ${SSH_KEY_VAR} for the standard path."
        echo "For temporary emergency fallback, set ALLOW_SSH_PASSWORD_FALLBACK=1 and rerun."
        exit 1
    fi
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password-based SSH. Provide an SSH key instead, or install sshpass for emergency fallback."
        exit 1
    fi
    echo "Warning: Using deprecated password-based SSH fallback for ${ENV} deployment."
    SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp)
    SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh)
elif [ -n "$SSH_KEY_PATH" ]; then
    SCP_CMD=(scp -i "$SSH_KEY_PATH")
    SSH_CMD=(ssh -i "$SSH_KEY_PATH")
fi

"${SCP_CMD[@]}" "$UPDATE_SCRIPT" "${REMOTE_USER}@${SERVER_HOST}:${REMOTE_UPDATE_SCRIPT}"
if [ $? -ne 0 ]; then
    echo "❌ Failed to copy update script to server. Stopping deployment."
    exit 1
fi

ENV_FILE="${REMOTE_UPDATE_PATH}/${DEPLOYMENT_ID}-${RANDOM}.env"

if [ "$ENABLE_BASIC_AUTH" = true ]; then
    print_header "BASIC AUTH ENABLED"
    if [ -z "$BASIC_AUTH_USER" ] || [ -z "$BASIC_AUTH_PASS" ]; then
        echo "Error: BASIC_AUTH_USER or BASIC_AUTH_PASS not defined"
        exit 1
    fi
else
    BASIC_AUTH_USER=""
    BASIC_AUTH_PASS=""
    echo "Basic Authentication is disabled"
fi

run_config_value_guard || { echo "❌ Config value guard failed (findings above) — refusing to deploy. Nothing has run on the server."; exit 1; }

print_header "EXECUTING UPDATE SCRIPT ON SERVER"

"${SSH_CMD[@]}" "${REMOTE_USER}@${SERVER_HOST}" "chmod +x ${REMOTE_UPDATE_SCRIPT} && \
cat > ${ENV_FILE} << 'EOL'
GAME_ENV=${ENV}
ENVIRONMENT=${ENV}
DEPLOYMENT_ID=${DEPLOYMENT_ID}
DOCKER_IMAGE=${DOCKER_IMAGE}
DOCKER_TOKEN=${DOCKER_TOKEN}
ADMIN_TOKEN=${ADMIN_TOKEN}
API_KEY=${API_KEY}
PUBLIC_HOST=${PUBLIC_HOST}
PUBLIC_PROTOCOL=${PUBLIC_PROTOCOL}
PUBLIC_PORT=${PUBLIC_PORT}
API_BASE_URL=${API_BASE_URL}
PROFILE_API_URL=${PROFILE_API_URL}
PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}
JWT_ISSUER=${JWT_ISSUER}
JWT_AUDIENCE=${JWT_AUDIENCE}
STORAGE_ENDPOINT=${STORAGE_ENDPOINT}
STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY}
STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY}
STORAGE_BUCKET=${STORAGE_BUCKET}
OTEL_USERNAME=${OTEL_USERNAME}
OTEL_PASSWORD=${OTEL_PASSWORD}
OTEL_ENDPOINT=${OTEL_ENDPOINT}
OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_EXPORTER_OTLP_ENDPOINT}
OTEL_AUTH_HEADER=${OTEL_AUTH_HEADER}
BASIC_AUTH_USER=${BASIC_AUTH_USER}
BASIC_AUTH_PASS=${BASIC_AUTH_PASS}
FEEDBACK_WEBHOOK_URL=${FEEDBACK_WEBHOOK_URL}
FEEDBACK_TELEGRAM_TOKEN=${FEEDBACK_TELEGRAM_TOKEN}
FEEDBACK_TELEGRAM_CHAT_ID=${FEEDBACK_TELEGRAM_CHAT_ID}
TELEGRAM_PROXY_URL=${TELEGRAM_PROXY_URL}
EOL
chmod 600 ${ENV_FILE} && \
${REMOTE_UPDATE_SCRIPT} ${ENV_FILE}"

if [ $? -ne 0 ]; then
    echo "❌ Failed to execute update script on server."
    exit 1
fi

print_header "DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "✅ New version deployed to ${ENV} (${SERVER_HOST})!"
if [ "$ENABLE_BASIC_AUTH" = true ]; then
    echo "🔒 Basic authentication enabled with user: ${BASIC_AUTH_USER}"
fi
echo "🌐 Verify the service at ${PUBLIC_PROTOCOL}://${PUBLIC_HOST}:${PUBLIC_PORT}"
echo "======================================================="
