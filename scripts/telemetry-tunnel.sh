#!/bin/bash

set -e

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
        1|true|TRUE|yes|YES|on|ON)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

load_env_file ".env"
load_env_file ".env.secret"
load_env_file ".env.telemetry"
load_env_file ".env.telemetry.secret"

if [ -z "$TELEMETRY_SERVER_HOST" ]; then
    echo "Error: TELEMETRY_SERVER_HOST is not set."
    exit 1
fi

REMOTE_USER="${TELEMETRY_SSH_USER:-}"
if [ -z "$REMOTE_USER" ] && [ -n "$TELEMETRY_VPS_LOGIN" ]; then
    REMOTE_USER="$TELEMETRY_VPS_LOGIN"
    echo "Warning: TELEMETRY_VPS_LOGIN is deprecated. Prefer TELEMETRY_SSH_USER."
fi
if [ -z "$REMOTE_USER" ]; then
    REMOTE_USER="root"
fi

SSH_KEY_PATH="${TELEMETRY_SSH_KEY:-}"
if [ -n "$SSH_KEY_PATH" ]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: TELEMETRY_SSH_KEY not found at $SSH_KEY_PATH"
        exit 1
    fi
fi

SSH_PASSWORD="${TELEMETRY_SSH_PASSWORD:-}"
if [ -z "$SSH_PASSWORD" ] && [ -n "$TELEMETRY_VPS_PASSWORD" ]; then
    SSH_PASSWORD="$TELEMETRY_VPS_PASSWORD"
    echo "Warning: TELEMETRY_VPS_PASSWORD is deprecated. Prefer TELEMETRY_SSH_KEY."
fi

ALLOW_PASSWORD_FALLBACK="${ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK:-${ALLOW_SSH_PASSWORD_FALLBACK:-}}"

SSH_CMD=(ssh -o StrictHostKeyChecking=no -N -L 14318:localhost:14318)

if [ -n "$SSH_KEY_PATH" ]; then
    SSH_CMD+=(-i "$SSH_KEY_PATH")
elif [ -n "$SSH_PASSWORD" ]; then
    if ! is_truthy "$ALLOW_PASSWORD_FALLBACK"; then
        echo "Error: Password-based telemetry tunnel is disabled by default."
        echo "Configure TELEMETRY_SSH_KEY for the standard path."
        echo "For temporary emergency fallback, set ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1."
        exit 1
    fi
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password-based SSH fallback."
        exit 1
    fi
    echo "Warning: Using deprecated password-based SSH fallback for telemetry tunnel."
    SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no -N -L 14318:localhost:14318)
else
    echo "Error: No telemetry SSH authentication configured."
    echo "Provide TELEMETRY_SSH_KEY. Password fallback is deprecated."
    exit 1
fi

"${SSH_CMD[@]}" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}"
