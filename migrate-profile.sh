#!/bin/bash
# migrate-profile.sh — apply (or inspect) the player-profile DB migrations on the
# profile VPS, WITHOUT a full image rebuild/redeploy.
#
# Usage:
#   ./migrate-profile.sh                 # show status, confirm, then apply pending
#   ./migrate-profile.sh status          # read-only: show applied / pending, apply nothing
#   ./migrate-profile.sh apply -y        # apply without the confirmation prompt
#   npm run migrate:profile              # same as ./migrate-profile.sh
#   npm run migrate:profile:status       # same as ./migrate-profile.sh status
#
# How it works (no new migration engine — it reuses what already exists):
#   - Migrations live in migrations/*.sql and are baked into the profile image
#     (Dockerfile.profile `COPY migrations`).
#   - src/profile-server/migrate.ts is the runner: it applies each *.sql ONCE, in
#     lexical order, in a transaction, and records the filename in a
#     `schema_migrations` table — so re-runs skip already-applied files. THAT is the
#     versioning: "already migrated" files are never re-applied.
#   - This script just SSHes to the box and runs that runner inside the profile-api
#     container (the same command setup-profile.sh runs on every deploy). It is the
#     standalone trigger for when you want to migrate without redeploying.
#
# IMPORTANT — the runner reads the migrations baked into the DEPLOYED image, not your
# local repo. A migration that exists locally but is NOT in the running image will NOT
# be applied by this tool — you must deploy that image first (`npm run deploy:profile`,
# which rebuilds with the new .sql AND auto-runs the migrations). This script detects
# that situation and warns loudly rather than silently doing nothing.
#
# Config: reads .env / .env.secret / .env.profile / .env.profile.secret — the SAME
# files and SSH variables as build-deploy-profile.sh (PROFILE_SERVER_HOST,
# PROFILE_SSH_USER, PROFILE_SSH_KEY, ALLOW_PROFILE_SSH_PASSWORD_FALLBACK / PROFILE_SSH_PASSWORD).

set -e
set -o pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Where the docker-compose project lives on the box (setup-profile.sh: PROFILE_DIR).
PROFILE_REMOTE_DIR="${PROFILE_REMOTE_DIR:-/opt/profile}"
EXPECTED_ROLE="profile"

print_header() {
    echo "======================================================"
    echo "  $1"
    echo "======================================================"
}

load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        set -o allexport
        # shellcheck disable=SC1090
        source "$file"
        set +o allexport
    fi
}

is_truthy() {
    case "$1" in
        1 | true | TRUE | yes | YES | on | ON) return 0 ;;
        *) return 1 ;;
    esac
}

# ── Parse arguments ─────────────────────────────────────────────────────────────
ACTION="apply"
ASSUME_YES=0
for arg in "$@"; do
    case "$arg" in
        apply) ACTION="apply" ;;
        status) ACTION="status" ;;
        -y | --yes) ASSUME_YES=1 ;;
        -h | --help)
            # Print the leading comment block (from line 2 to the first non-# line).
            awk 'NR>=2 && /^#/ {sub(/^# ?/, ""); print; next} NR>=2 {exit}' "${BASH_SOURCE[0]}"
            exit 0
            ;;
        *)
            echo "Error: unknown argument '$arg'. Use: apply | status | -y | --help" >&2
            exit 2
            ;;
    esac
done

# ── Load config ─────────────────────────────────────────────────────────────────
load_env_file "$REPO_DIR/.env"
load_env_file "$REPO_DIR/.env.secret"
load_env_file "$REPO_DIR/.env.profile"
load_env_file "$REPO_DIR/.env.profile.secret"

if [ -z "${PROFILE_SERVER_HOST:-}" ]; then
    echo "Error: PROFILE_SERVER_HOST is not set." >&2
    echo "Add it to .env.profile or export it before running." >&2
    exit 1
fi

# ── SSH auth (mirrors build-deploy-profile.sh) ──────────────────────────────────
REMOTE_USER="${PROFILE_SSH_USER:-root}"
SSH_PASSWORD="${PROFILE_SSH_PASSWORD:-}"
SSH_KEY_PATH="${PROFILE_SSH_KEY:-}"
ALLOW_PASSWORD_FALLBACK="${ALLOW_PROFILE_SSH_PASSWORD_FALLBACK:-${ALLOW_SSH_PASSWORD_FALLBACK:-}}"

if [ -n "$SSH_KEY_PATH" ]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "Error: SSH key not found at $SSH_KEY_PATH" >&2
        exit 1
    fi
fi

if [ -z "$SSH_KEY_PATH" ] && [ -z "$SSH_PASSWORD" ]; then
    echo "Error: No profile SSH authentication configured." >&2
    echo "Provide PROFILE_SSH_KEY. Password-based access is deprecated." >&2
    exit 1
fi

# StrictHostKeyChecking=accept-new: trust on first use, REJECT a changed key — so the
# profile box's prod DB password is never sent to an impostor (same posture as deploy).
SSH_CMD=(ssh -o StrictHostKeyChecking=accept-new)
SSH_PASSWORD_FILE=""

cleanup() {
    [ -n "$SSH_PASSWORD_FILE" ] && rm -f "$SSH_PASSWORD_FILE"
}
trap cleanup EXIT INT TERM

if [ -n "$SSH_KEY_PATH" ]; then
    SSH_CMD+=(-i "$SSH_KEY_PATH")
elif [ -n "$SSH_PASSWORD" ]; then
    if ! is_truthy "$ALLOW_PASSWORD_FALLBACK"; then
        echo "Error: Password-based access is disabled by default." >&2
        echo "Configure PROFILE_SSH_KEY, or set ALLOW_PROFILE_SSH_PASSWORD_FALLBACK=1 for an emergency fallback." >&2
        exit 1
    fi
    if ! command -v sshpass >/dev/null 2>&1; then
        echo "Error: sshpass is required for password auth. Install it or provide PROFILE_SSH_KEY." >&2
        exit 1
    fi
    echo "Warning: using deprecated password-based SSH fallback."
    # Password in a 0600 file (created before the secret is written); only its PATH is
    # ever in argv (never the secret itself).
    SSH_PASSWORD_FILE=$(mktemp)
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh -o StrictHostKeyChecking=accept-new)
fi

# ── Preflight: confirm this really is the profile box (fail closed) ─────────────
# Read-only SSH; the remote `|| true` makes the ssh exit code reflect ONLY
# reachability/auth, so an unreachable or auth-failing host fails here, before any DB
# mutation. Mirrors build-deploy-profile.sh's role-marker gate.
print_header "PREFLIGHT — ${PROFILE_SERVER_HOST}"
set +e
TARGET_ROLE=$("${SSH_CMD[@]}" -o ConnectTimeout=10 "${REMOTE_USER}@${PROFILE_SERVER_HOST}" \
    'cat /etc/geoconflict-deploy-role 2>/dev/null || true' </dev/null)
preflight_rc=$?
set -e
if [ "$preflight_rc" -ne 0 ]; then
    echo "Error: preflight SSH to ${PROFILE_SERVER_HOST} failed (rc=${preflight_rc}) —" >&2
    echo "       host unreachable or key rejected. Aborting before any DB mutation." >&2
    exit 1
fi
TARGET_ROLE=$(printf '%s' "$TARGET_ROLE" | tr -d '[:space:]')

if [ "$TARGET_ROLE" = "$EXPECTED_ROLE" ]; then
    echo "OK: role marker confirms the ${EXPECTED_ROLE} box."
elif [ -n "$TARGET_ROLE" ]; then
    echo "Error: ${PROFILE_SERVER_HOST} is provisioned as role '${TARGET_ROLE}', not" >&2
    echo "       '${EXPECTED_ROLE}'. Refusing to migrate a different box — check PROFILE_SERVER_HOST." >&2
    exit 1
elif is_truthy "${PROFILE_MIGRATE_ALLOW_UNVERIFIED:-}"; then
    echo "Warning: no role marker on ${PROFILE_SERVER_HOST} — proceeding because PROFILE_MIGRATE_ALLOW_UNVERIFIED is set."
else
    echo "Error: cannot confirm ${PROFILE_SERVER_HOST} is the ${EXPECTED_ROLE} box (no role marker)." >&2
    echo "       Aborting before any DB mutation. If this box predates the role marker," >&2
    echo "       set PROFILE_MIGRATE_ALLOW_UNVERIFIED=1 to proceed." >&2
    exit 1
fi

# ── Inspect: applied (schema_migrations) + baked into the deployed image ─────────
# One SSH round-trip. FAIL CLOSED: prove the containers are up and the DB answers
# BEFORE trusting any empty result, then emit `PROBE_OK` followed by `APPLIED:<file>` /
# `IMAGE:<file>` lines. This stops an UNOBSERVABLE box (containers/daemon down, DB
# unreachable) from being misread as a clean, fully-migrated DB. The remote psql reads
# creds from the postgres container's own env (env_file: profile.env).
remote_inspect() {
    "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" bash -s -- "$PROFILE_REMOTE_DIR" <<'REMOTE'
set -euo pipefail
dir="$1"
cd "$dir" 2>/dev/null || { echo "FATAL: $dir not found on box"; exit 3; }

# Liveness + connectivity probes. Each fails the whole inspect non-zero, so the caller
# aborts rather than treating an unobservable box as "nothing applied".
api_id=$(docker compose ps -q profile-api 2>/dev/null || true)
[ -n "$api_id" ] || { echo "FATAL: profile-api container is not running (or docker is down)"; exit 4; }
pg_id=$(docker compose ps -q postgres 2>/dev/null || true)
[ -n "$pg_id" ] || { echo "FATAL: postgres container is not running (or docker is down)"; exit 4; }
docker compose exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select 1"' \
  >/dev/null 2>&1 || { echo "FATAL: cannot reach the profile database (postgres unreachable or auth failed)"; exit 5; }

# Past the probes the stack is observable — mark it so the caller can require it.
echo "PROBE_OK"

# Applied migrations. Connectivity is proven above, so the ONLY remaining cause of a
# query error is a never-created schema_migrations table (fresh DB) — tolerate THAT
# (empty = nothing applied) via the inner 2>/dev/null + trailing || true, without
# masking a real outage (already caught by the probes).
docker compose exec -T postgres sh -c '
  PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT filename FROM schema_migrations ORDER BY filename" 2>/dev/null
' | sed -e "s/[[:space:]]//g" -e "/^$/d" -e "s/^/APPLIED:/" || true

# Migration files baked into the running profile-api image (proven up above). An empty
# result here is anomalous and the caller treats it as an error.
docker compose exec -T profile-api sh -c \
  'ls -1 /usr/src/app/migrations/*.sql 2>/dev/null' \
  | xargs -r -n1 basename 2>/dev/null | sed -e "/^$/d" -e "s/^/IMAGE:/" || true
REMOTE
}

print_header "INSPECTING MIGRATION STATE"
set +e
INSPECT_OUT="$(remote_inspect)"
inspect_rc=$?
set -e
if [ "$inspect_rc" -ne 0 ]; then
    printf '%s\n' "$INSPECT_OUT" >&2
    echo "Error: could not inspect the box (rc=${inspect_rc}). Aborting before any change." >&2
    exit 1
fi
# Require the fail-closed probe marker: its absence means the stack was not observable
# (and a 0 exit slipped through), so never trust an "empty" reading.
if ! printf '%s\n' "$INSPECT_OUT" | grep -qx "PROBE_OK"; then
    printf '%s\n' "$INSPECT_OUT" >&2
    echo "Error: could not confirm the profile stack is observable on the box (no PROBE_OK)." >&2
    echo "       Containers may be down/restarting — check the box before migrating." >&2
    exit 1
fi

APPLIED=$(printf '%s\n' "$INSPECT_OUT" | sed -n 's/^APPLIED://p' | sort -u)
IMAGE=$(printf '%s\n' "$INSPECT_OUT" | sed -n 's/^IMAGE://p' | sort -u)
REPO=$(cd "$REPO_DIR" && ls -1 migrations/*.sql 2>/dev/null | xargs -n1 basename | sort -u || true)

# profile-api always ships baked-in migrations; an empty IMAGE after PROBE_OK means
# something is wrong — refuse to guess the migration state.
if [ -z "$IMAGE" ]; then
    echo "Error: the profile-api image reports no baked-in migrations — unexpected. Aborting." >&2
    exit 1
fi

# image files not yet applied = what `apply` will actually run.
PENDING=$(comm -23 <(printf '%s\n' "$IMAGE") <(printf '%s\n' "$APPLIED"))
# repo files missing from the deployed image = need a redeploy before they can apply.
NOT_IN_IMAGE=$(comm -23 <(printf '%s\n' "$REPO") <(printf '%s\n' "$IMAGE"))

print_list() { if [ -n "$1" ]; then printf '%s\n' "$1" | sed 's/^/    - /'; else echo "    (none)"; fi; }

# End LOUD when repo migrations are missing from the deployed image, with a distinct
# non-zero code, so `migrate:profile` never *looks* like a clean success while
# undeployed migrations remain (an operator may read only the final line).
finish() {
    local code="${1:-0}"
    if [ -n "$NOT_IN_IMAGE" ]; then
        local n
        n=$(printf '%s\n' "$NOT_IN_IMAGE" | grep -c .)
        echo
        echo "NOTE: ${n} repo migration(s) are NOT in the deployed image — run 'npm run deploy:profile'"
        echo "      to bake + apply them. This tool did not apply them."
        if [ "$code" -lt 2 ]; then code=2; fi
    fi
    exit "$code"
}

echo "Applied on ${PROFILE_SERVER_HOST}:"
print_list "$APPLIED"
echo "In the deployed image:"
print_list "$IMAGE"
echo "Pending (in image, not yet applied):"
print_list "$PENDING"

if [ -n "$NOT_IN_IMAGE" ]; then
    echo
    echo "⚠️  These migrations exist in your local repo but are NOT in the deployed image:"
    print_list "$NOT_IN_IMAGE"
    echo "   This tool runs the runner INSIDE the deployed image, so it will NOT apply them."
    echo "   Deploy the new image first:  npm run deploy:profile"
    echo "   (that rebuilds with the new .sql and auto-runs the migrations on the box)."
fi

if [ "$ACTION" = "status" ]; then
    finish 0
fi

# ── Apply ───────────────────────────────────────────────────────────────────────
if [ -z "$PENDING" ]; then
    echo
    echo "Nothing to apply — the deployed image's migrations are all recorded as applied."
    finish 0
fi

if ! is_truthy "$ASSUME_YES"; then
    echo
    printf 'Apply the above pending migrations to %s? [y/N] ' "$PROFILE_SERVER_HOST"
    # `|| reply=""` so an EOF/non-tty stdin takes the safe default (abort), not a
    # set -e crash.
    read -r reply || reply=""
    case "$reply" in
        y | Y | yes | YES) ;;
        *)
            echo "Aborted — nothing applied."
            exit 0
            ;;
    esac
fi

print_header "APPLYING DB MIGRATIONS"
# The runner is idempotent (schema_migrations); it prints skip/applied per file and
# exits non-zero on a real failure (which fails this script too, by `set -e`).
"${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" bash -s -- "$PROFILE_REMOTE_DIR" <<'REMOTE'
set -euo pipefail
dir="$1"
cd "$dir" 2>/dev/null || { echo "FATAL: $dir not found on box"; exit 3; }
docker compose exec -T profile-api npm run migrate
REMOTE

echo
echo "✅ Migrations applied. Re-run './migrate-profile.sh status' to confirm."
finish 0
