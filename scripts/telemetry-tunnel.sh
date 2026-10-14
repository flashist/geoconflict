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
# Owned by this script: set only in the password branch below. Cleared first so a value
# inherited from the shell or a .env* file never reaches the EXIT trap's rm -f.
SSH_PASSWORD_FILE=""

if [ -n "$SSH_KEY_PATH" ]; then
    # IdentitiesOnly (task 0441, mirror of build-deploy-profile.sh 0221): offer ONLY this key.
    # Every other agent key ssh tries first is a failed auth that counts toward MaxAuthTries
    # and the box's fail2ban jail, and can ban the operator.
    SSH_CMD+=(-o IdentitiesOnly=yes -i "$SSH_KEY_PATH")
elif [ -n "$SSH_PASSWORD" ]; then
    # Task 0442: the telemetry box refuses SSH password login, so this branch can only be
    # refused by the box. Kept, like the deploys' — but no longer a way back in.
    echo "Note: the telemetry box refuses SSH password login since task 0442 — a password tunnel is expected to be refused."
    echo "      To get back in without a working key, use the hosting provider's web console (docs/vps-deployment-guide.md §7)."
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
    # Task 0441: the password goes to sshpass as a 0600 FILE (-f), never on the command line
    # (-p), where any local process could read it with `ps`. The tunnel runs until Ctrl-C, so
    # INT/TERM go through `exit` and the EXIT trap removes the file then too.
    SSH_PASSWORD_FILE=$(mktemp)
    trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh -o StrictHostKeyChecking=no -N -L 14318:localhost:14318)
else
    echo "Error: No telemetry SSH authentication configured."
    echo "Provide TELEMETRY_SSH_KEY. Password fallback is deprecated."
    exit 1
fi

"${SSH_CMD[@]}" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}"
