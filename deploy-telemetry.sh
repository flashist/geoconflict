#!/bin/bash
# deploy-telemetry.sh - Deploy/re-run Uptrace setup on the telemetry VPS
# Usage: ./deploy-telemetry.sh
#
# Reads credentials from .env and .env.telemetry.
# Uploads setup-telemetry.sh and runs it on the remote server.
# Safe to run multiple times — setup-telemetry.sh is idempotent.

set -e

SETUP_SCRIPT="./setup-telemetry.sh"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

# ── Load config ───────────────────────────────────────────────────────────────

if [ -f .env ]; then
    set -o allexport
    source .env
    set +o allexport
fi

if [ -f .env.telemetry ]; then
    set -o allexport
    source .env.telemetry
    set +o allexport
else
    echo "Warning: .env.telemetry not found — using env vars from .env or shell"
fi

# ── Validate ──────────────────────────────────────────────────────────────────

if [ -z "$TELEMETRY_SERVER_HOST" ]; then
    echo "Error: TELEMETRY_SERVER_HOST is not set."
    echo "Add it to .env.telemetry or export it before running."
    exit 1
fi

if [ ! -f "$SETUP_SCRIPT" ]; then
    echo "Error: $SETUP_SCRIPT not found"
    exit 1
fi

REMOTE_USER="${TELEMETRY_VPS_LOGIN:-root}"
SSH_PASSWORD="${TELEMETRY_VPS_PASSWORD:-}"
SSH_KEY_PATH="${TELEMETRY_SSH_KEY:-}"

if [ -n "$SSH_KEY_PATH" ]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: SSH key not found at $SSH_KEY_PATH"
        exit 1
    fi
fi

if [ -z "$SSH_KEY_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    echo "Error: Provide TELEMETRY_SSH_KEY or TELEMETRY_VPS_PASSWORD in .env.telemetry"
    exit 1
fi

# Build SSH/SCP command prefix
SCP_CMD=(scp -o StrictHostKeyChecking=no)
SSH_CMD=(ssh -o StrictHostKeyChecking=no)

if [ -n "$SSH_KEY_PATH" ]; then
    SCP_CMD+=(-i "$SSH_KEY_PATH")
    SSH_CMD+=(-i "$SSH_KEY_PATH")
elif [ -n "$SSH_PASSWORD" ]; then
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password auth. Install it or provide TELEMETRY_SSH_KEY instead."
        exit 1
    fi
    SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no)
    SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no)
fi

REMOTE_SCRIPT="/root/setup-telemetry.sh"

print_header "DEPLOYING UPTRACE TO ${TELEMETRY_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${TELEMETRY_SERVER_HOST}"
echo ""

# ── Upload setup script ───────────────────────────────────────────────────────

print_header "UPLOADING SETUP SCRIPT"
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Pass tokens as env vars so the same tokens survive re-runs
"${SSH_CMD[@]}" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}" \
    "chmod +x ${REMOTE_SCRIPT} && \
    UPTRACE_PROJECT_TOKEN='${UPTRACE_PROJECT_TOKEN}' \
    UPTRACE_SECRET_KEY='${UPTRACE_SECRET_KEY}' \
    UPTRACE_ADMIN_PASSWORD='${UPTRACE_ADMIN_PASSWORD}' \
    ${REMOTE_SCRIPT}"

print_header "DONE"
echo "Uptrace setup completed on ${TELEMETRY_SERVER_HOST}."
echo ""
echo "Next steps:"
echo "  1. Set OTEL_EXPORTER_OTLP_ENDPOINT in .env.prod (printed above by the remote script)"
echo "  2. Add firewall rules on the Uptrace VPS to restrict ports 4317/4318 to the game server IP"
echo "  3. SSH tunnel to verify the dashboard: ssh -L 14318:localhost:14318 ${REMOTE_USER}@${TELEMETRY_SERVER_HOST}"
echo "  4. Run ./build-deploy.sh prod to redeploy the game server with OTEL enabled"
echo "======================================================"
