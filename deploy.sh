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

# ── Game host setup: the every-deploy ROOT step (task 0443, owner ruling "Way A") ────
# Ships setup-game-host.sh + ssh-alerts.sh + a 0600 host.env to the box in ONE root login and
# runs setup-game-host.sh there. It is called only AFTER the update block below succeeded —
# the new game is already live, so a broken root step can never block a release.
#
# Owner ruling Q-A1 (2026-10-12): ANY result but OK — FAILED, or SKIPPED for any reason
# (password path, blank token or URL) — fails the deploy, after a loud "game IS deployed, host
# setup NOT done" banner. So this returns non-zero for every skip as well, and sets
# HOST_SETUP_RESULT / HOST_SETUP_REASON for that banner. There is deliberately no switch to
# skip it (owner ruling Q-A2).
#
# 🚨 NEVER a root login by password. Without an SSH key the step is skipped, not attempted:
# BatchMode=yes allows no prompt of any kind, so a rejected key fails at once instead of
# falling back to a typed password, and IdentitiesOnly keeps it to ONE failed auth — far below
# MaxAuthTries and the box's fail2ban threshold. ROOT_SSH_CMD is defined HERE, outside the
# auth branch below, and never touches SSH_CMD / SCP_CMD (the 0441 harness counts that branch).
#
# The token is never in any argv: host.env is written by the printf BUILTIN and travels inside a
# ustar stream on ssh's stdin. On the box it lands 0600 in a fresh 0700 directory that a trap
# removes on every exit; --no-same-owner keeps it root's, whoever packed it.
#
# Like run_config_value_guard above, this is called from an `||` list, where set -e is OFF —
# so every exit path is an explicit `return`.
run_game_host_setup() {
    local setup_script alerts_script remote_cmd rc
    HOST_SETUP_RESULT="FAILED"
    HOST_SETUP_REASON=""
    if [ -z "$SSH_KEY_PATH" ]; then
        HOST_SETUP_RESULT="SKIPPED"
        HOST_SETUP_REASON="no SSH key for ${ENV} — the root step never logs in by password (set ${SSH_KEY_VAR} or SSH_KEY)"
        return 1
    fi
    if [ -z "${PROFILE_SSH_ALERT_TOKEN:-}" ]; then
        HOST_SETUP_RESULT="SKIPPED"
        HOST_SETUP_REASON="PROFILE_SSH_ALERT_TOKEN is empty — set it in .env.secret (the same value as on the profile box)"
        return 1
    fi
    if [ -z "${PROFILE_API_URL:-}" ]; then
        HOST_SETUP_RESULT="SKIPPED"
        HOST_SETUP_REASON="PROFILE_API_URL is empty — the SSH alert agent would have nowhere to send"
        return 1
    fi
    setup_script="$(dirname "$0")/setup-game-host.sh"
    alerts_script="$(dirname "$0")/ssh-alerts.sh"
    if [ ! -f "$setup_script" ] || [ ! -f "$alerts_script" ]; then
        HOST_SETUP_REASON="setup-game-host.sh or ssh-alerts.sh is missing next to deploy.sh"
        return 1
    fi
    HOST_SETUP_STAGE_DIR=$(mktemp -d) || {
        HOST_SETUP_STAGE_DIR=""
        HOST_SETUP_REASON="could not create a local staging directory"
        return 1
    }
    chmod 700 "$HOST_SETUP_STAGE_DIR"
    if ! ( umask 077
           printf '%s=%q\n' \
               PROFILE_SSH_ALERT_TOKEN "$PROFILE_SSH_ALERT_TOKEN" \
               PROFILE_API_URL "$PROFILE_API_URL" \
               GAME_ENV "$ENV" > "$HOST_SETUP_STAGE_DIR/host.env" ) \
        || ! cp "$setup_script" "$alerts_script" "$HOST_SETUP_STAGE_DIR/"; then
        HOST_SETUP_REASON="could not stage the host setup files locally"
        return 1
    fi
    ROOT_SSH_CMD=(ssh -o BatchMode=yes -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")
    # shellcheck disable=SC2016 — expanded on the BOX, not here
    remote_cmd='umask 077; d=$(mktemp -d /root/.gc-host-setup.XXXXXX) || exit 1; trap "rm -rf \"$d\"" EXIT; tar --no-same-owner -xf - -C "$d" && bash "$d/setup-game-host.sh" "$d/host.env" </dev/null'
    # ONE login, not scp + ssh: half the failed attempts when the root key is missing, and one
    # login alert per deploy instead of two. ustar avoids macOS's extended headers; only ssh's
    # status is judged — tar can take a harmless SIGPIPE once the box has read the archive.
    COPYFILE_DISABLE=1 tar --format=ustar -C "$HOST_SETUP_STAGE_DIR" -cf - host.env setup-game-host.sh ssh-alerts.sh \
        | "${ROOT_SSH_CMD[@]}" "root@${SERVER_HOST}" "$remote_cmd"
    rc=${PIPESTATUS[1]}
    rm -rf "$HOST_SETUP_STAGE_DIR"
    HOST_SETUP_STAGE_DIR=""
    if [ "$rc" -eq 0 ]; then
        HOST_SETUP_RESULT="OK"
        HOST_SETUP_REASON=""
        return 0
    fi
    if [ "$rc" -eq 255 ]; then
        HOST_SETUP_REASON="the root login was refused or the box was unreachable (ssh exit 255) — is the game key installed for root (task 0445) and loaded in your ssh agent (ssh-add)?"
    elif [ "$rc" -eq 3 ]; then
        HOST_SETUP_RESULT="SKIPPED"
        HOST_SETUP_REASON="setup-game-host.sh skipped a section (its output is above)"
    else
        HOST_SETUP_REASON="setup-game-host.sh reported a FAILED section (exit $rc — its output is above)"
    fi
    return 1
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
# Owned by this script: set only in the password branch below. Cleared first so a value
# inherited from the shell or a .env* file never reaches the EXIT trap's rm -f
# (mirror of build-deploy-profile.sh and build-deploy-telemetry.sh).
SSH_PASSWORD_FILE=""
# Owned by this script too: set only inside run_game_host_setup (task 0443). Cleared for the
# same reason.
HOST_SETUP_STAGE_DIR=""
HOST_SETUP_RESULT=""
HOST_SETUP_REASON=""
# ONE cleanup for every local temp file this script makes (task 0443) — the sshpass password
# file and the host-setup staging directory. Installed once, before either can exist, so it
# runs on every exit. ⚠️ Task 0444 adds its staged file HERE rather than a second EXIT trap: a
# second `trap … EXIT` would silently replace this one. INT/TERM go through `exit`, so a
# Ctrl-C runs it too.
deploy_cleanup() {
    [ -n "$SSH_PASSWORD_FILE" ] && rm -f "$SSH_PASSWORD_FILE"
    [ -n "$HOST_SETUP_STAGE_DIR" ] && rm -rf "$HOST_SETUP_STAGE_DIR"
    return 0
}
trap deploy_cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
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
    # Task 0441 (mirror of build-deploy-profile.sh K1): write the password to a 0600 file and
    # pass only its PATH to sshpass via -f — the secret never appears in any argv, where any
    # local process (`ps`) could read it. deploy_cleanup (its EXIT trap is installed above,
    # before the secret is written) removes the file on every exit, Ctrl-C included.
    SSH_PASSWORD_FILE=$(mktemp)
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    SCP_CMD=(sshpass -f "$SSH_PASSWORD_FILE" scp)
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh)
elif [ -n "$SSH_KEY_PATH" ]; then
    # IdentitiesOnly (task 0441, mirror of build-deploy-profile.sh 0221): offer ONLY this key.
    # With several keys in the agent ssh tries each in turn, and every rejected key is a failed
    # auth to sshd — enough of them hits MaxAuthTries (6 on game prod) and the box's fail2ban
    # jail, and bans the operator.
    SCP_CMD=(scp -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")
    SSH_CMD=(ssh -o IdentitiesOnly=yes -i "$SSH_KEY_PATH")
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

print_header "GAME HOST SETUP (root step — task 0443)"
run_game_host_setup || HOST_SETUP_RESULT="${HOST_SETUP_RESULT:-FAILED}"

if [ "$HOST_SETUP_RESULT" != "OK" ]; then
    # Owner ruling Q-A1 (2026-10-12): the game update above already went out, so this must
    # never read like a deploy that did not happen — and it must not read like a success
    # either. Exit 3, distinct from the 1 of a deploy that stopped before the game went live.
    print_header "⚠️  GAME IS DEPLOYED — HOST SETUP NOT DONE"
    echo "✅ The new game version IS live on ${ENV} (${SERVER_HOST}). Do not roll back for this."
    echo "❌ GAME HOST SETUP ${HOST_SETUP_RESULT}: ${HOST_SETUP_REASON}"
    echo "   SSH security alerts on this box may be missing or out of date until a deploy"
    echo "   completes this step. Fix the cause above; the next deploy runs it again."
    echo "   (docs/vps-deployment-guide.md §8 explains each cause.)"
    echo "======================================================="
    exit 3
fi

print_header "DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "✅ New version deployed to ${ENV} (${SERVER_HOST})!"
echo "✅ GAME HOST SETUP OK (root step: SSH security alerts installed/up to date)"
if [ "$ENABLE_BASIC_AUTH" = true ]; then
    echo "🔒 Basic authentication enabled with user: ${BASIC_AUTH_USER}"
fi
echo "🌐 Verify the service at ${PUBLIC_PROTOCOL}://${PUBLIC_HOST}:${PUBLIC_PORT}"
echo "======================================================="
