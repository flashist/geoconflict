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

uppercase_env=$(echo "$ENV" | tr '[:lower:]' '[:upper:]')

lookup_env_value() {
    local key="$1"
    eval "printf '%s' \"\${$key}\""
}

if [ -f .env ]; then
    echo "Loading common configuration from .env file..."
    set -o allexport
    source .env
    set +o allexport
fi

if [ -f ".env.$ENV" ]; then
    echo "Loading $ENV-specific configuration from .env.$ENV file..."
    set -o allexport
    source ".env.$ENV"
    set +o allexport
fi

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

if [ -z "$REMOTE_USER" ]; then
    FALLBACK_USER_VAR="${uppercase_env}_VPS_LOGIN"
    REMOTE_USER=$(lookup_env_value "$FALLBACK_USER_VAR")
fi

if [ -z "$REMOTE_USER" ] && [ -n "$VPS_LOGIN" ]; then
    REMOTE_USER="$VPS_LOGIN"
fi

if [ -z "$REMOTE_USER" ]; then
    REMOTE_USER="openfront"
fi

SSH_KEY_PATH=""
if [ -n "$SSH_KEY" ]; then
    SSH_KEY_PATH="${SSH_KEY/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: SSH key not found at $SSH_KEY_PATH"
        exit 1
    fi
fi

SSH_PASS_VAR="SSH_PASS_${uppercase_env}"
SSH_PASSWORD=$(lookup_env_value "$SSH_PASS_VAR")
if [ -z "$SSH_PASSWORD" ]; then
    FALLBACK_PASS_VAR="${uppercase_env}_VPS_PASSWORD"
    SSH_PASSWORD=$(lookup_env_value "$FALLBACK_PASS_VAR")
fi

if [ -z "$SSH_PASSWORD" ] && [ -n "$VPS_PASSWORD" ]; then
    SSH_PASSWORD="$VPS_PASSWORD"
fi

if [ -z "$SSH_KEY_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    echo "Error: Provide either SSH_KEY or password for $ENV deployment"
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
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password-based SSH. Please install it or provide an SSH key via SSH_KEY."
        exit 1
    fi
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
FEEDBACK_TELEGRAM_TOKEN=${FEEDBACK_TELEGRAM_TOKEN}
FEEDBACK_TELEGRAM_CHAT_ID=${FEEDBACK_TELEGRAM_CHAT_ID}
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
