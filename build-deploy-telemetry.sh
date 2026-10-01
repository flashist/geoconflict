#!/bin/bash
# build-deploy-telemetry.sh - Deploy/re-run Uptrace setup on the telemetry VPS
# Usage: ./build-deploy-telemetry.sh
#
# Reads credentials from .env and .env.telemetry.
# Uploads setup-telemetry.sh and runs it on the remote server.
# Safe to run multiple times — setup-telemetry.sh is idempotent.
#
# Version name (task 0356, ADR-117): every deploy is named <base>-telemetry.<N>, e.g.
# 0.0.155-telemetry.1 — base = package.json's X.Y.Z (read at the deployed commit, never
# written) without any -dev.N/-staging.N, N = a counter per base. The box runs only pinned
# third-party images, so the name means "which commit of OUR telemetry setup is live". It goes
# to the box as /opt/uptrace/deployed-version (written by setup-telemetry.sh), to the local
# deploy record (TELEMETRY_DEPLOY_RECORD, default ~/.geoconflict/telemetry-deploy.log — no host,
# no secret), and — only once the remote setup succeeded — becomes an annotated git tag on the
# deployed commit. Git is therefore required. A deploy whose shipped telemetry files have
# uncommitted changes is refused before anything touches the box.

set -e

SETUP_SCRIPT="./setup-telemetry.sh"

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
        1|true|TRUE|yes|YES|on|ON)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# ── Load config ───────────────────────────────────────────────────────────────

load_env_file ".env"
load_env_file ".env.secret"

if [ -f .env.telemetry ]; then
    load_env_file ".env.telemetry"
else
    echo "Warning: .env.telemetry not found — using env vars from .env or shell"
fi

load_env_file ".env.telemetry.secret"

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

for required_var in UPTRACE_PROJECT_TOKEN UPTRACE_SECRET_KEY UPTRACE_ADMIN_PASSWORD; do
    if [ -z "${!required_var}" ]; then
        echo "Error: ${required_var} is not set."
        echo "Set it in .env.telemetry.secret before deploying telemetry."
        exit 1
    fi
done

case "$UPTRACE_PROJECT_TOKEN:$UPTRACE_SECRET_KEY:$UPTRACE_ADMIN_PASSWORD" in
    *dryrun_token*|*dryrun_secret*|*dryrun_password*)
        echo "Error: dry-run placeholder value found in Uptrace deploy secrets."
        echo "Replace placeholder values in .env.telemetry.secret before deploying telemetry."
        exit 1
        ;;
esac

# ── Version-name helper (task 0356) ───────────────────────────────────────────
# Shared with build-deploy-profile.sh (0355). Missing ⇒ stop here: a deploy that cannot name
# itself would leave a box nobody can match to a commit.
DEPLOY_VERSION_HELPER="$(dirname "$0")/scripts/deploy-version-tag.sh"
if [ ! -f "$DEPLOY_VERSION_HELPER" ]; then
    echo "Error: version-name helper not found ($DEPLOY_VERSION_HELPER) — refusing to deploy. Nothing was sent to the box."
    exit 1
fi
# shellcheck source=scripts/deploy-version-tag.sh
source "$DEPLOY_VERSION_HELPER"

# ── Source commit + version name (task 0356) ──────────────────────────────────
# The tag names a commit, but the upload is the LIVE file. So the deploy is REFUSED, before
# the box is touched, when there is no git commit or when a file this deploy ships has
# uncommitted or untracked changes (owner ruling at 0356's plan gate, 2026-10-01 — same as
# 0355). SCOPED to what ships: the uploaded setup script, this script (it builds the staged
# env) and the helper — a doc or a profile-only change never blocks a telemetry deploy.
# What it proves, exactly: at the moment of this check, those three files are committed. An
# edit made after the check but before the upload still ships unseen (0355 residual R3).
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
if [ "$GIT_COMMIT" = "unknown" ]; then
    echo "Error: no git commit (git rev-parse HEAD failed) — refusing to deploy a setup no commit"
    echo "       can name. Nothing was sent to the box. Run this from the repo checkout."
    exit 1
fi

TELEMETRY_SHIPPED_PATHS=(setup-telemetry.sh build-deploy-telemetry.sh scripts/deploy-version-tag.sh)
if DIRTY_SHIPPED=$(deploy_shipped_tree_dirty "${TELEMETRY_SHIPPED_PATHS[@]}"); then
    echo "Error: files this deploy ships have uncommitted changes — refusing to deploy."
    echo "       The box would not match commit ${GIT_COMMIT}. Nothing was sent to the box."
    printf '%s\n' "$DIRTY_SHIPPED" | sed 's/^/         /'
    echo "       Commit, then redeploy."
    exit 1
fi

# The name: <base>-telemetry.<N>. The base is read from package.json AT THE COMMIT being
# deployed (git show), not the working tree: telemetry does not ship package.json, so it is not
# in the shipped paths above, and an unrelated uncommitted package.json edit must neither block
# this deploy nor change its name. READ only — no bump, no write.
if ! command -v node >/dev/null 2>&1; then
    echo "Error: node not found — cannot read package.json's version to name this deploy."
    echo "       Nothing was sent to the box."
    exit 1
fi
PACKAGE_VERSION_RAW=""
if PACKAGE_JSON_AT_COMMIT=$(git show "${GIT_COMMIT}:package.json" 2>/dev/null); then
    PACKAGE_VERSION_RAW=$(printf '%s' "$PACKAGE_JSON_AT_COMMIT" \
        | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version' 2>/dev/null || echo "")
fi
if ! VERSION_BASE=$(deploy_version_base "$PACKAGE_VERSION_RAW"); then
    echo "Error: package.json version '${PACKAGE_VERSION_RAW}' (at commit ${GIT_COMMIT}) is not X.Y.Z or"
    echo "       X.Y.Z-(dev|staging).N — cannot name this deploy. Nothing was sent to the box."
    exit 1
fi
# The deploy record is one of the counter's three sources (a failed attempt that reached the
# box is recorded, so it uses up its number).
DEPLOY_RECORD="${TELEMETRY_DEPLOY_RECORD:-$HOME/.geoconflict/telemetry-deploy.log}"
if ! DEPLOY_VERSION=$(deploy_version_next telemetry "$VERSION_BASE" "$DEPLOY_RECORD"); then
    echo "Error: could not compute this deploy's version name. Nothing was sent to the box."
    exit 1
fi
echo "Deploy version: ${DEPLOY_VERSION} (package.json ${PACKAGE_VERSION_RAW}, commit ${GIT_COMMIT})"

# ── Validate config locally before touching the server ────────────────────────

print_header "VALIDATING CONFIG (local dry-run)"

if command -v docker &> /dev/null; then
    # Write a temp config the same way setup-telemetry.sh would, then ask Uptrace to validate it.
    # Use a dedicated var — NOT the special exported $TMPDIR — so deleting this dir below can't
    # leave a later mktemp (SSH_PASSWORD_FILE / LOCAL_TMPENV) pointed at a removed base dir.
    VALIDATE_TMPDIR=$(mktemp -d)
    DRY_RUN_PROJECT_TOKEN="${UPTRACE_PROJECT_TOKEN:-dryrun_token}"
    DRY_RUN_ADMIN_PASSWORD="${UPTRACE_ADMIN_PASSWORD:-dryrun_password}"
    DRY_RUN_SITE_URL="${TELEMETRY_DOMAIN:+https://${TELEMETRY_DOMAIN}}"
    DRY_RUN_SITE_URL="${DRY_RUN_SITE_URL:-http://localhost:14318}"
    cat > "$VALIDATE_TMPDIR/config.yml" << EOFCFG
service:
  secret: '${UPTRACE_SECRET_KEY:-dryrun_secret}'
site:
  url: '${DRY_RUN_SITE_URL}'
listen:
  http:
    addr: ':80'
  grpc:
    addr: ':4317'
auth: {}
pg:
  addr: postgres:5432
  user: uptrace
  password: uptrace
  database: uptrace
ch_cluster:
  cluster: uptrace1
  replicated: false
  distributed: false
  shards:
    - replicas:
        - addr: clickhouse:9000
          user: uptrace
          password: uptrace
          database: uptrace
          max_execution_time: 15s
redis_cache:
  addrs:
    1: redis:6379
seed_data:
  update: true
  delete: false
  users:
    - key: admin_user
      name: Admin
      email: admin@geoconflict.ru
      password: '${DRY_RUN_ADMIN_PASSWORD}'
      email_confirmed: true
  orgs:
    - key: geoconflict_org
      name: Geoconflict
  org_users:
    - key: geoconflict_org_user
      org_key: geoconflict_org
      user_key: admin_user
      role: owner
  projects:
    - key: geoconflict_project
      name: geoconflict
      org_key: geoconflict_org
  project_tokens:
    - key: geoconflict_token
      project_key: geoconflict_project
      token: '${DRY_RUN_PROJECT_TOKEN}'
  project_users:
    - key: geoconflict_project_user
      project_key: geoconflict_project
      org_user_key: geoconflict_org_user
      perm_level: admin
EOFCFG

    UPTRACE_VERSION=$(grep 'image: uptrace/uptrace:' "$SETUP_SCRIPT" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

    if grep -q '^ch:' "$VALIDATE_TMPDIR/config.yml"; then
        echo "❌ Dry-run config contains unsupported top-level ch: config for Uptrace ${UPTRACE_VERSION}"
        rm -rf "$VALIDATE_TMPDIR"
        exit 1
    fi

    # Run uptrace config validation — loads the config file and exits non-zero if it fails to parse.
    # We use the `help` subcommand because it reads the config but does not attempt DB connections,
    # making it safe to run locally without running services.
    # Exit code is the sole signal — no output grepping.
    if VALIDATE_OUT=$(docker run --rm \
        -v "$VALIDATE_TMPDIR/config.yml:/etc/uptrace/config.yml" \
        "uptrace/uptrace:${UPTRACE_VERSION}" \
        --config=/etc/uptrace/config.yml help 2>&1); then
        echo "✅ Config valid"
    else
        echo "❌ Config validation failed:"
        echo "$VALIDATE_OUT"
        rm -rf "$VALIDATE_TMPDIR"
        exit 1
    fi
    rm -rf "$VALIDATE_TMPDIR"
else
    echo "Docker not available locally — skipping config validation"
fi

REMOTE_USER="${TELEMETRY_SSH_USER:-}"
if [ -z "$REMOTE_USER" ] && [ -n "$TELEMETRY_VPS_LOGIN" ]; then
    REMOTE_USER="$TELEMETRY_VPS_LOGIN"
    echo "Warning: TELEMETRY_VPS_LOGIN is deprecated. Prefer TELEMETRY_SSH_USER."
fi
if [ -z "$REMOTE_USER" ]; then
    REMOTE_USER="root"
fi

SSH_PASSWORD="${TELEMETRY_SSH_PASSWORD:-}"
if [ -z "$SSH_PASSWORD" ] && [ -n "$TELEMETRY_VPS_PASSWORD" ]; then
    SSH_PASSWORD="$TELEMETRY_VPS_PASSWORD"
    echo "Warning: TELEMETRY_VPS_PASSWORD is deprecated. Prefer TELEMETRY_SSH_KEY."
fi
SSH_KEY_PATH="${TELEMETRY_SSH_KEY:-}"
ALLOW_PASSWORD_FALLBACK="${ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK:-${ALLOW_SSH_PASSWORD_FALLBACK:-}}"

if [ -n "$SSH_KEY_PATH" ]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: SSH key not found at $SSH_KEY_PATH"
        exit 1
    fi
fi

if [ -z "$SSH_KEY_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    echo "Error: No telemetry SSH authentication configured."
    echo "Provide TELEMETRY_SSH_KEY. Password-based deploy is deprecated."
    exit 1
fi

# Build SSH/SCP command prefix
# StrictHostKeyChecking=no avoids interactive prompts in automated deploys.
# Trade-off: won't detect a changed host key (e.g. after VPS rebuild).
# If the key changes, run: ssh-keygen -R <host> and verify the new fingerprint manually.
SCP_CMD=(scp -o StrictHostKeyChecking=no)
SSH_CMD=(ssh -o StrictHostKeyChecking=no)
# Owned by this script: set only in the password branch below. Cleared first so a value
# inherited from the shell or a .env* file never reaches finalize_telemetry_deploy's rm -f
# (mirror of build-deploy-profile.sh).
SSH_PASSWORD_FILE=""

if [ -n "$SSH_KEY_PATH" ]; then
    SCP_CMD+=(-i "$SSH_KEY_PATH")
    SSH_CMD+=(-i "$SSH_KEY_PATH")
elif [ -n "$SSH_PASSWORD" ]; then
    if ! is_truthy "$ALLOW_PASSWORD_FALLBACK"; then
        echo "Error: Password-based telemetry deploy is disabled by default."
        echo "Configure TELEMETRY_SSH_KEY for the standard path."
        echo "For temporary emergency fallback, set ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK=1."
        exit 1
    fi
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password auth. Install it or provide TELEMETRY_SSH_KEY instead."
        exit 1
    fi
    echo "Warning: Using deprecated password-based SSH fallback for telemetry deploy."
    # K1: write the password to a 0600 file (created before the secret is written) and
    # pass only its PATH to sshpass via -f — the secret never appears in any argv. This
    # focused EXIT trap removes the password file on any exit up to the preflight; from
    # there on finalize_telemetry_deploy (task 0356) replaces it and removes the file too.
    SSH_PASSWORD_FILE=$(mktemp)
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT
    SCP_CMD=(sshpass -f "$SSH_PASSWORD_FILE" scp -o StrictHostKeyChecking=no)
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh -o StrictHostKeyChecking=no)
fi

REMOTE_SCRIPT="/root/setup-telemetry.sh"

print_header "DEPLOYING UPTRACE TO ${TELEMETRY_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${TELEMETRY_SERVER_HOST}"
echo ""

# ── Deploy-target preflight (X1) ──────────────────────────────────────────────
# Mirror of build-deploy-profile.sh: a read-only identity check BEFORE the first SCP, so a
# mistyped/stale-but-reachable host that accepts the key is never destructively provisioned
# (setup-telemetry.sh runs apt-upgrade/swap/containers before its own DNS check). The role
# marker setup-telemetry.sh writes is authoritative; on an unprovisioned box fall back to
# "TELEMETRY_DOMAIN resolves to this target"; else fail closed unless
# TELEMETRY_DEPLOY_ALLOW_UNVERIFIED is set.
print_header "DEPLOY-TARGET PREFLIGHT"
EXPECTED_ROLE="telemetry"

resolve_ips() {
    local host="$1"
    if command -v getent >/dev/null 2>&1; then
        getent ahosts "$host" 2>/dev/null | awk '{print $1}'
    elif command -v dig >/dev/null 2>&1; then
        dig +short "$host" A 2>/dev/null; dig +short "$host" AAAA 2>/dev/null
    elif command -v host >/dev/null 2>&1; then
        host "$host" 2>/dev/null | awk '/has address|has IPv6/ {print $NF}'
    elif command -v python3 >/dev/null 2>&1; then
        python3 -c "import socket,sys; print('\n'.join(sorted({a[4][0] for a in socket.getaddrinfo(sys.argv[1],None)})))" "$host" 2>/dev/null
    fi
}
DOMAIN_MATCH=0
if [ -n "${TELEMETRY_DOMAIN:-}" ]; then
    resolved_domain_ips=$(resolve_ips "$TELEMETRY_DOMAIN" | sort -u)
    acceptable_ips=$(printf '%s\n%s\n' "$TELEMETRY_SERVER_HOST" "$(resolve_ips "$TELEMETRY_SERVER_HOST")" | sort -u)
    for rip in $resolved_domain_ips; do
        for aip in $acceptable_ips; do
            [ -n "$rip" ] && [ "$rip" = "$aip" ] && DOMAIN_MATCH=1
        done
    done
fi

set +e
DEPLOY_TARGET_ROLE=$("${SSH_CMD[@]}" -o ConnectTimeout=10 "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}" \
    'cat /etc/geoconflict-deploy-role 2>/dev/null || true')
preflight_rc=$?
set -e
if [ "$preflight_rc" -ne 0 ]; then
    echo "Error: preflight SSH to ${TELEMETRY_SERVER_HOST} failed (rc=${preflight_rc}) — host"
    echo "       unreachable or key rejected. Aborting before any secret transfer or mutation."
    exit 1
fi
DEPLOY_TARGET_ROLE=$(printf '%s' "$DEPLOY_TARGET_ROLE" | tr -d '[:space:]')

if [ "$DEPLOY_TARGET_ROLE" = "$EXPECTED_ROLE" ]; then
    echo "Preflight OK: role marker confirms the ${EXPECTED_ROLE} box."
elif [ -n "$DEPLOY_TARGET_ROLE" ]; then
    echo "Error: ${TELEMETRY_SERVER_HOST} is provisioned as role '${DEPLOY_TARGET_ROLE}', not"
    echo "       '${EXPECTED_ROLE}'. Refusing to clobber a different box. Aborting before any"
    echo "       secret transfer or mutation — check TELEMETRY_SERVER_HOST."
    exit 1
elif [ "$DOMAIN_MATCH" = "1" ]; then
    echo "Preflight OK: no role marker yet (first provision); ${TELEMETRY_DOMAIN} resolves to this target."
elif is_truthy "${TELEMETRY_DEPLOY_ALLOW_UNVERIFIED:-}"; then
    echo "Warning: ${TELEMETRY_SERVER_HOST} has no role marker and ${TELEMETRY_DOMAIN:-<no domain>} does"
    echo "         not resolve to it — proceeding because TELEMETRY_DEPLOY_ALLOW_UNVERIFIED is set."
else
    echo "Error: cannot confirm ${TELEMETRY_SERVER_HOST} is the intended ${EXPECTED_ROLE} box"
    echo "       (no role marker, and ${TELEMETRY_DOMAIN:-<no domain>} does not resolve to it)."
    echo "       Aborting before any secret transfer or mutation. If this is a first provision"
    echo "       of a new box, set TELEMETRY_DEPLOY_ALLOW_UNVERIFIED=1 to proceed."
    exit 1
fi

# ── Deploy record + single EXIT trap (task 0356) ──────────────────────────────
# Installed only now, after the preflight passed and before the first upload: a refusal or a
# failed preflight above touched nothing on the box, so it writes no record and uses up no
# number. From here on every exit — success, a failed step under set -e, Ctrl-C — runs
# finalize_telemetry_deploy exactly once. It REPLACES the password-only trap above, so it
# removes the sshpass password file itself, and also the local 0600 staged env file (which a
# failing env-file SCP used to leave behind). Then it appends the whole record block in ONE
# append, its validation_result= line last. No host, no secret, no operator in the record.
# No deploy lock (telemetry never had one): two concurrent deploys could pick the same N — the
# second git tag then fails, warned, never forced.
LOCAL_TMPENV=""
DEPLOY_OUTCOME=""
DEPLOY_FINALIZED=0
# The version-tag outcome. Empty ⇒ the deploy never reached the tag step.
GIT_TAG_RESULT=""
DEPLOY_STARTED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

finalize_telemetry_deploy() {
    [ "$DEPLOY_FINALIZED" = "1" ] && return 0
    DEPLOY_FINALIZED=1
    # Secrets first — the local staged env file and the sshpass 0600 password file.
    [ -n "$LOCAL_TMPENV" ] && rm -f "$LOCAL_TMPENV" || true
    [ -n "${SSH_PASSWORD_FILE:-}" ] && rm -f "$SSH_PASSWORD_FILE" || true
    local block
    block=$(printf '%s\n' "----" \
        "timestamp=${DEPLOY_STARTED_AT}" \
        "env=telemetry" \
        "commit=${GIT_COMMIT}" \
        "version=${DEPLOY_VERSION}" \
        "package_version=${PACKAGE_VERSION_RAW}" \
        "validation_result=${DEPLOY_OUTCOME:-failed} git_tag=${GIT_TAG_RESULT:-skipped:deploy-not-completed}")
    if mkdir -p "$(dirname "$DEPLOY_RECORD")" 2>/dev/null \
        && printf '%s\n' "$block" >> "$DEPLOY_RECORD" 2>/dev/null; then
        :
    else
        echo "Warning: could not write the deploy record to $DEPLOY_RECORD" >&2
    fi
}
trap finalize_telemetry_deploy EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# ── Upload setup script ───────────────────────────────────────────────────────

print_header "UPLOADING SETUP SCRIPT"
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Write secrets to a temp file and copy via SCP.
# This avoids embedding values inline in the SSH command, which would expose
# them in ps aux / /proc/<pid>/cmdline on the remote server for the script duration.
#
# Task 0284 adds two: TELEMETRY_ALERT_PROBE_URL (the full lowercase alert-webhook URL —
# a HOST, so it rides this 0600 channel, never an argv) and PROFILE_ALERT_WEBHOOK_TOKEN
# (the SAME shared secret the profile box holds; the box already carries a copy inside
# the monitoring stack's own channel config, so this adds no new secret). Both are
# optional: blank leaves the probe unconfigured, and setup-telemetry.sh then REUSES
# whatever it already persisted rather than wiping it.
# 🚨 The token is NEVER generated on the telemetry box. A box-minted token fails every
# probe and pages daily — 0182/0195's defect in a new place.
#
# ⚠️ scripts/check-config-parity.mjs covers game/profile/client only, so it does not see
# these two. The hardening harness (tests/scripts/profile-deploy-hardening.test.sh) is
# the only gate that this hop exists — the same residual task 0277 recorded.
#
# Task 0356 adds TELEMETRY_DEPLOY_VERSION + TELEMETRY_DEPLOY_COMMIT — this deploy's name and
# commit, computed above (plain tokens, safe in single quotes). setup-telemetry.sh writes them
# to /opt/uptrace/deployed-version once every step succeeded.
LOCAL_TMPENV=$(mktemp)
chmod 600 "$LOCAL_TMPENV"
cat > "$LOCAL_TMPENV" << EOF
export UPTRACE_PROJECT_TOKEN='${UPTRACE_PROJECT_TOKEN}'
export UPTRACE_SECRET_KEY='${UPTRACE_SECRET_KEY}'
export UPTRACE_ADMIN_PASSWORD='${UPTRACE_ADMIN_PASSWORD}'
export UPTRACE_RETENTION_DAYS='${UPTRACE_RETENTION_DAYS:-7}'
export UPTRACE_METRICS_RETENTION_DAYS='${UPTRACE_METRICS_RETENTION_DAYS:-90}'
export CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS='${CLICKHOUSE_SYSTEM_LOG_RETENTION_DAYS:-1}'
export CLICKHOUSE_QUERY_LOG_RETENTION_DAYS='${CLICKHOUSE_QUERY_LOG_RETENTION_DAYS:-3}'
export CLICKHOUSE_TRUNCATE_SYSTEM_LOGS='${CLICKHOUSE_TRUNCATE_SYSTEM_LOGS:-1}'
export CLICKHOUSE_TRUNCATE_FILE_LOGS='${CLICKHOUSE_TRUNCATE_FILE_LOGS:-1}'
export CLICKHOUSE_FILE_LOG_LEVEL='${CLICKHOUSE_FILE_LOG_LEVEL:-warning}'
export CLICKHOUSE_FILE_LOG_SIZE='${CLICKHOUSE_FILE_LOG_SIZE:-50M}'
export CLICKHOUSE_FILE_LOG_COUNT='${CLICKHOUSE_FILE_LOG_COUNT:-2}'
export CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO='${CLICKHOUSE_MAX_SERVER_MEMORY_USAGE_RATIO:-0.6}'
export CLICKHOUSE_DISABLE_METRIC_LOG='${CLICKHOUSE_DISABLE_METRIC_LOG:-1}'
export TELEMETRY_SWAP_SIZE_GB='${TELEMETRY_SWAP_SIZE_GB:-4}'
export TELEMETRY_SERVER_HOST='${TELEMETRY_SERVER_HOST}'
export TELEMETRY_DOMAIN='${TELEMETRY_DOMAIN}'
export TELEMETRY_ALERT_PROBE_URL='${TELEMETRY_ALERT_PROBE_URL:-}'
export PROFILE_ALERT_WEBHOOK_TOKEN='${PROFILE_ALERT_WEBHOOK_TOKEN:-}'
export TELEMETRY_DEPLOY_VERSION='${DEPLOY_VERSION}'
export TELEMETRY_DEPLOY_COMMIT='${GIT_COMMIT}'
EOF
REMOTE_ENV="/root/.uptrace-deploy-env-$$"
"${SCP_CMD[@]}" "$LOCAL_TMPENV" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}:${REMOTE_ENV}"
rm -f "$LOCAL_TMPENV"

"${SSH_CMD[@]}" "${REMOTE_USER}@${TELEMETRY_SERVER_HOST}" \
    "chmod 600 ${REMOTE_ENV} && \
    chmod +x ${REMOTE_SCRIPT} && \
    . ${REMOTE_ENV} && \
    rm -f ${REMOTE_ENV} && \
    ${REMOTE_SCRIPT}"
# Mark the deploy successful so finalize_telemetry_deploy records validation_result=ok.
DEPLOY_OUTCOME=ok

# ── Version tag (task 0356) ───────────────────────────────────────────────────
# Only now — the remote setup succeeded — does the name become an annotated git tag on the
# captured GIT_COMMIT (not whatever HEAD is by now). All of it is WARN-ONLY: the deploy already
# happened, the exit code stays 0, and any fault is fixed with the printed git command — NEVER
# by redeploying. The outcome lands on the record's validation_result= line.
print_header "TAGGING ${DEPLOY_VERSION}"
GIT_TAG_RESULT="interrupted"
if ! deploy_commit_on_a_remote_branch "$GIT_COMMIT"; then
    echo "Warning: commit ${GIT_COMMIT} is not on any remote branch — pushing the tag uploads"
    echo "         that commit to origin as well. Push its branch when you can."
fi
# No host in the message: commit + "ran OK" is what the tag vouches for.
TAG_MESSAGE=$(printf '%s\n' "Telemetry server deploy ${DEPLOY_VERSION}" "" \
    "version=${DEPLOY_VERSION}" "commit=${GIT_COMMIT}" \
    "package_version=${PACKAGE_VERSION_RAW}" "validation_result=ok")
GIT_TAG_RESULT=$(deploy_tag_and_push "$DEPLOY_VERSION" "$GIT_COMMIT" "$TAG_MESSAGE") || GIT_TAG_RESULT="tag-failed"
case "$GIT_TAG_RESULT" in
    pushed)
        echo "Git tag ${DEPLOY_VERSION} → commit ${GIT_COMMIT}, pushed to origin."
        ;;
    push-failed)
        echo ""
        echo "WARNING: deploy ${DEPLOY_VERSION} is LIVE, but its git tag was NOT pushed (it is kept locally)."
        echo "         Retry — no redeploy needed:"
        echo "           git push origin refs/tags/${DEPLOY_VERSION}"
        echo "         If origin rejects it because the tag already exists there, leave it — never force it."
        ;;
    *)
        GIT_TAG_RESULT="tag-failed"
        echo ""
        echo "WARNING: deploy ${DEPLOY_VERSION} is LIVE, but git tag ${DEPLOY_VERSION} could NOT be created"
        echo "         (it already exists, or git failed — see above). Nothing was overwritten."
        echo "         If the tag already exists, leave it — never force it; this deploy stays untagged"
        echo "         and the deploy record names it. If git itself failed (e.g. no user.name/user.email),"
        echo "         fix that and run — no redeploy needed:"
        echo "           git tag -a ${DEPLOY_VERSION} -m \"Telemetry server deploy ${DEPLOY_VERSION}\" ${GIT_COMMIT} && git push origin refs/tags/${DEPLOY_VERSION}"
        ;;
esac

print_header "DONE"
echo "Uptrace setup completed on ${TELEMETRY_SERVER_HOST}."
echo "Deployed version: ${DEPLOY_VERSION} (git tag: ${GIT_TAG_RESULT})"
echo "On the box: cat /opt/uptrace/deployed-version"
echo ""
echo "Next steps:"
echo "  1. Set OTEL_EXPORTER_OTLP_ENDPOINT in .env.prod (printed above by the remote script)"
echo "  2. Add firewall rules on the Uptrace VPS to restrict ports 4317/4318 to the game server IP"
echo "  3. SSH tunnel to verify the dashboard: ssh -L 14318:localhost:14318 ${REMOTE_USER}@${TELEMETRY_SERVER_HOST}"
echo "  4. Run ./build-deploy.sh prod to redeploy the game server with OTEL enabled"
echo "======================================================"
