#!/bin/bash
# build-deploy-profile.sh - Build the player-profile API image, push it to the
# registry, pin an immutable @sha256 digest, and deploy it to the profile VPS.
# Usage: ./build-deploy-profile.sh
#
# Reads config from .env / .env.secret / .env.profile / .env.profile.secret.
# Builds Dockerfile.profile for linux/amd64, pushes it, and resolves the canonical
# registry digest from the built image ID (fail-closed if none resolves).
#
# It then transports the deploy to the VPS (T4e3): uploads setup-profile.sh, stages
# secrets in a 0600 env_file SCP'd to a 0600 remote file (never on box argv), then
# SSH-sources + rm's it and runs setup-profile.sh — passing the @sha256 DIGEST (not a
# mutable tag) and the domain through. Safe to re-run; setup-profile.sh is idempotent.

set -e
# pipefail: surface a failure from any stage of a pipeline, not just the last. Audited
# (T4e1): the only pipelines are `echo $DOCKER_TOKEN | docker login` (already aborts on
# login failure — desired) and `printf | grep -q` inside an if-condition (set -e never
# aborts on a test). No `|| true` remains after the digest-resolve rewrite below.
set -o pipefail

DOCKERFILE="./Dockerfile.profile"
SETUP_SCRIPT="./setup-profile.sh"
# The standalone daily-backup script (T8). Rides this same deploy path — SCP'd alongside the
# setup script below; setup-profile.sh installs it to /opt/profile/backup.sh. Not a parallel
# pipeline: the existing transport carries it.
BACKUP_SCRIPT="./profile-backup.sh"

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
# Both build (local) and deploy (transport) preconditions are checked up front so a
# missing host/secret/script fails fast — before the expensive build+push — rather
# than after. setup-profile.sh is T4e2's deliverable and now exists, so requiring it
# here is safe (T4e1 deferred these two checks only because it contacted no box).

if [ -z "${PROFILE_SERVER_HOST:-}" ]; then
    echo "Error: PROFILE_SERVER_HOST is not set."
    echo "Add it to .env.profile or export it before running."
    exit 1
fi

if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "Error: $BACKUP_SCRIPT not found"
    exit 1
fi

if [ ! -f "$SETUP_SCRIPT" ]; then
    echo "Error: $SETUP_SCRIPT not found"
    exit 1
fi

if [ -z "${DOCKER_USERNAME:-}" ] || [ -z "${DOCKER_REPO:-}" ]; then
    echo "Error: DOCKER_USERNAME and DOCKER_REPO must be set (registry for the profile image)."
    exit 1
fi

# Whole-pipeline preflight (intentional): POSTGRES_PASSWORD is a RUNTIME secret, not a
# build input (Dockerfile.profile has no ARG for it; it's injected at container start) —
# validated here to fail fast before build/push rather than after, so T4e3's deploy
# can't be blocked late by a missing secret. Keep this when T4e3 un-stubs transport.
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "Error: POSTGRES_PASSWORD is not set."
    echo "Set it in .env.profile.secret before deploying."
    exit 1
fi

if [ ! -f "$DOCKERFILE" ]; then
    echo "Error: $DOCKERFILE not found"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "Error: docker is required to build and push the profile image."
    echo "Start Docker Desktop and retry."
    exit 1
fi

# ── Build the profile image (linux/amd64) ─────────────────────────────────────
# --platform linux/amd64 (K7): the reg.ru profile VPS is amd64, so an Apple-Silicon
# (arm64) dev host must cross-build amd64 or it would push a digest the box cannot
# execute. --iidfile captures the exact built image ID, immune to a concurrent
# retag between build and digest-resolve (K2). See postmortem §14.

VERSION_TAG=$(git rev-parse --short HEAD 2>/dev/null || node -p "require('./package.json').version")
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# Provenance: the build copies the LIVE worktree, but VERSION_TAG names HEAD. If the
# tree is dirty (modified-tracked or untracked files under copied paths like src/),
# the image content does NOT match ${GIT_COMMIT}. Deploy is by @sha256 digest, which
# is always content-accurate, so nothing wrong ever ships — but mark the tag -dirty
# and warn so the human-facing tag/commit association stays honest. Non-fatal by
# design (commit for a reproducible build); the SHA is recorded in the output below.
WORKTREE_DIRTY=""
if [ "$GIT_COMMIT" != "unknown" ] && [ -n "$(git status --porcelain --untracked-files=normal 2>/dev/null)" ]; then
    WORKTREE_DIRTY=1
    VERSION_TAG="${VERSION_TAG}-dirty"
    echo "Warning: building a DIRTY worktree — image content is NOT commit ${GIT_COMMIT}."
    echo "         Tag suffixed -dirty; commit your changes for a reproducible build."
fi

PROFILE_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}:profile-${VERSION_TAG}"

IIDFILE=$(mktemp)
# Clean up the iidfile on every exit path. EXIT fires on success, on `exit N`, and on a
# `set -e` abort (e.g. a failed build), so the temp file never leaks. The explicit rm
# after reading it (below) stays as the immediate success-path cleanup — so a future
# EXIT trap (T4e3's secret cleanup) that overrides this one can't silently re-leak it.
trap 'rm -f "$IIDFILE"' EXIT

print_header "BUILDING PROFILE IMAGE (linux/amd64): ${PROFILE_IMAGE}"
docker buildx build --platform linux/amd64 --load \
    -f "$DOCKERFILE" -t "$PROFILE_IMAGE" --iidfile "$IIDFILE" .

BUILT_IMAGE_ID=$(cat "$IIDFILE")
rm -f "$IIDFILE"   # immediate success-path cleanup; the EXIT trap covers failure paths
# Fail closed if the iidfile was empty: `cat` of an empty file returns 0 (set -e won't
# catch it), and an empty ID makes the byte-scan gate silently skip → unscanned push.
if [ -z "$BUILT_IMAGE_ID" ]; then
    echo "Error: --iidfile was empty after build — cannot identify the image to scan. Aborting (fail closed)."
    exit 1
fi

# ── Secret-boundary gate (T4f) ────────────────────────────────────────────────
# Authoritative per-layer byte scan on the BUILT image ID (not the mutable tag),
# BEFORE any push. It fails closed if it cannot observe the layers. set -e is active,
# so a non-zero exit aborts the run here and nothing is pushed. The Dockerfile COPY/ADD
# advisory is warn-only; only this byte scan determines the exit code.
print_header "SCANNING PROFILE IMAGE FOR BAKED-IN SECRETS"
bash "$(dirname "$0")/scripts/check-docker-secret-boundary.sh" \
    --inspect-image "$BUILT_IMAGE_ID" --dockerfile "$DOCKERFILE"

# ── Push to the registry ──────────────────────────────────────────────────────
# Token on stdin via --password-stdin — never in argv (ps aux / /proc/<pid>/cmdline).

if [ -n "${DOCKER_TOKEN:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

print_header "PUSHING PROFILE IMAGE"
# `docker push` can only target NAME[:TAG] — not an image ID or digest — so a
# tag→push step is unavoidable. Re-bind profile-<sha> to the exact built image right
# before pushing so we publish BUILT_IMAGE_ID. A residual tag→push window remains (a
# concurrent run at the same commit could divert the shared tag), but it is never a
# wrong-content deploy: the deployable digest is resolved from BUILT_IMAGE_ID below
# (content-addressed) and re-verified against the registry, so a diverted push is
# caught and fails closed instead of handing downstream a wrong or absent digest. We
# push the durable profile-<sha> tag directly: no throwaway staging tag is left
# lingering in the registry (registry-image-policy.md §Retention: remove temp tags).
docker tag "$BUILT_IMAGE_ID" "$PROFILE_IMAGE"
docker push "$PROFILE_IMAGE"

# ── Pin the immutable @sha256 digest (K2) ─────────────────────────────────────
# Resolve from the built image ID, never a tag. RepoDigests is content-addressed:
# each entry repo@sha256:D has D = the manifest digest of BUILT_IMAGE_ID's own bytes
# (only the repo-NAME prefix is mutable, never D), so a non-empty match can only
# identify what we built. A diverted push would record its digest on a different
# image and leave BUILT_IMAGE_ID with no matching entry → we fail closed here rather
# than pin someone else's image.
#
# Match the repo prefix by exact string equality (NOT a regex): DOCKER_REPO can legally
# contain '.' (and a registry prefix like ghcr.io/org several), which in a regex matches
# any char and could select a sibling repo's entry. Validate the sha256 suffix
# separately. Fail closed (below) if no canonical digest resolves.
EXPECTED_REPO="${DOCKER_USERNAME}/${DOCKER_REPO}"
PROFILE_DIGEST=""
while IFS= read -r repo_digest; do
    [ -n "$repo_digest" ] || continue
    repo_name="${repo_digest%@*}"   # everything before the single '@' → the repo
    digest="${repo_digest#*@}"      # everything after  the single '@' → sha256:<hex>
    if [ "$repo_name" = "$EXPECTED_REPO" ] \
        && printf '%s' "$digest" | grep -Eq '^sha256:[0-9a-f]{64}$'; then
        PROFILE_DIGEST="$repo_digest"
        break
    fi
done < <(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$BUILT_IMAGE_ID")

if [ -z "$PROFILE_DIGEST" ]; then
    echo "Error: could not resolve a canonical registry digest for the built artifact ${BUILT_IMAGE_ID}."
    echo "Refusing to deploy by mutable tag (a digest is required)."
    exit 1
fi

echo "Resolved digest: ${PROFILE_DIGEST}"

# Re-verify the digest is actually present in the registry. RepoDigests is local
# metadata: if a concurrent retag diverted the push, BUILT_IMAGE_ID could still carry
# a matching digest from an earlier push that the registry has since garbage-collected
# — which would hand T4e3 an unavailable digest while this slice reports success.
if ! docker buildx imagetools inspect "$PROFILE_DIGEST" >/dev/null 2>&1; then
    echo "Error: resolved digest ${PROFILE_DIGEST} is not present in the registry."
    echo "The push may have been diverted or the manifest garbage-collected; refusing to report success."
    exit 1
fi

# ── Concurrency lock + atomic deploy record (K6) ──────────────────────────────
# One fail-closed lock spans the whole deploy BEFORE any secret is staged or the box is
# mutated, and the deploy record is written as a single atomic block under it. On the
# macOS dev host `flock` is unavailable, so use an atomic `mkdir` mutex (mkdir fails if
# the dir already exists — no TOCTOU). The remote half (flock on the box) lives in
# setup-profile.sh. finalize_deploy is the single EXIT writer: it subsumes the old
# cleanup_secrets, appends the result line, then appends the whole block — every step
# `|| true`-guarded so a cleanup failure can never strand the lock.
DEPLOY_LOCK="${PROFILE_DEPLOY_LOCK:-${TMPDIR:-/tmp}/profile-deploy.lock.d}"
DEPLOY_RECORD="${PROFILE_DEPLOY_RECORD:-$HOME/.geoconflict/profile-deploy.log}"

# Assigned later (auth + transport); declare them now so finalize_deploy — installed
# below and able to fire on ANY exit from here on — never references an unset var.
LOCAL_TMPENV=""
REMOTE_ENV=""
REMOTE_ENV_STAGED=0
SSH_PASSWORD_FILE=""
DEPLOY_RECORD_TMP=""
DEPLOY_OUTCOME=""
DEPLOY_FINALIZED=0
DEPLOY_LOCK_HELD=0

finalize_deploy() {
    [ "$DEPLOY_FINALIZED" = "1" ] && return 0
    DEPLOY_FINALIZED=1
    # Secrets first — the local staged env_file and the sshpass 0600 password file.
    [ -n "$LOCAL_TMPENV" ] && rm -f "$LOCAL_TMPENV" || true
    [ -n "$SSH_PASSWORD_FILE" ] && rm -f "$SSH_PASSWORD_FILE" || true
    # Best-effort remote staged-env cleanup (the host may be unreachable on a failure path).
    if [ "$REMOTE_ENV_STAGED" = "1" ] && [ -n "$REMOTE_ENV" ]; then
        "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" "rm -f ${REMOTE_ENV}" >/dev/null 2>&1 || true
    fi
    # Append the result line to the body, then the WHOLE block to the shared record in one
    # operation — under the lock we still hold, so blocks never interleave and a body can
    # never land without its result. A failed append warns-and-continues so the lock
    # release below still runs (never strand the deploy lock).
    if [ -n "$DEPLOY_RECORD_TMP" ] && [ -f "$DEPLOY_RECORD_TMP" ] && [ -n "$DEPLOY_RECORD" ]; then
        if echo "validation_result=${DEPLOY_OUTCOME:-failed} digest=${PROFILE_DIGEST:-unknown}" >> "$DEPLOY_RECORD_TMP" \
            && cat "$DEPLOY_RECORD_TMP" >> "$DEPLOY_RECORD"; then
            :
        else
            echo "Warning: could not write the deploy record to $DEPLOY_RECORD" >&2
        fi
    fi
    [ -n "$DEPLOY_RECORD_TMP" ] && rm -f "$DEPLOY_RECORD_TMP" || true
    [ "$DEPLOY_LOCK_HELD" = "1" ] && rmdir "$DEPLOY_LOCK" 2>/dev/null || true
}

# Acquire the mutex BEFORE the record trap + first write. mkdir is atomic: it fails
# closed if another deploy already holds the lock — that second deploy writes no record
# byte and mutates nothing.
mkdir -p "$(dirname "$DEPLOY_RECORD")" 2>/dev/null || true
if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then
    echo "Error: another profile deploy is already running (lock: $DEPLOY_LOCK)."
    echo "If you are sure none is, remove the stale lock dir and re-run."
    exit 1
fi
DEPLOY_LOCK_HELD=1
# finalize_deploy now owns EXIT, replacing the build-phase iidfile trap ($IIDFILE was
# rm'd right after the build, so nothing leaks). Split INT/TERM so a caught signal exits
# (firing the single EXIT trap) instead of resuming past it.
trap finalize_deploy EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

DEPLOY_RECORD_TMP=$(mktemp)
chmod 600 "$DEPLOY_RECORD_TMP"
{
    echo "----"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "env=profile"
    echo "host=${PROFILE_SERVER_HOST}"
    echo "tag=${PROFILE_IMAGE}"
    echo "digest=${PROFILE_DIGEST}"
    echo "commit=${GIT_COMMIT}${WORKTREE_DIRTY:+-dirty}"
    echo "operator=$(whoami 2>/dev/null || echo unknown)"
} > "$DEPLOY_RECORD_TMP"

# ── Resolve SSH user + auth ───────────────────────────────────────────────────
# Key path is the standard and the default. Password fallback is gated behind
# ALLOW_PROFILE_SSH_PASSWORD_FALLBACK and uses `sshpass -f <0600 file>` (K1): the password
# travels in a 0600 temp file whose PATH (never the secret) is the only thing in argv. The
# file is created 0600 BEFORE the secret is written and removed by finalize_deploy on any
# exit — so it is never world-readable and never leaked on abort.

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
    # K1: write the password to a 0600 file (created before the secret is written) and
    # pass only its PATH to sshpass via -f — the secret never appears in any argv.
    SSH_PASSWORD_FILE=$(mktemp)
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    SCP_CMD=(sshpass -f "$SSH_PASSWORD_FILE" scp -o StrictHostKeyChecking=accept-new)
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh -o StrictHostKeyChecking=accept-new)
fi

REMOTE_SCRIPT="/root/setup-profile.sh"
# setup-profile.sh installs this to /opt/profile/backup.sh (its PROFILE_BACKUP_SRC default).
REMOTE_BACKUP_SCRIPT="/root/profile-backup.sh"

print_header "DEPLOYING PROFILE BACKEND TO ${PROFILE_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${PROFILE_SERVER_HOST}"
echo "Image (tag):   ${PROFILE_IMAGE}"
echo "Image digest:  ${PROFILE_DIGEST}"
echo "Source commit: ${GIT_COMMIT}${WORKTREE_DIRTY:+ (DIRTY — image content differs from this commit)}"
echo ""

# ── Deploy-target preflight (X1) ──────────────────────────────────────────────
# A read-only identity check BEFORE the first SCP / secret-staging, so a mistyped or
# stale-but-reachable host that accepts the key is never destructively provisioned
# (setup-profile.sh runs apt-upgrade/ufw/swap/containers before its own DNS check).
# Identity model: the role marker setup-profile.sh writes is authoritative; on a box not
# yet provisioned (no marker) fall back to "PROFILE_DOMAIN resolves to this target"; if
# neither confirms, fail closed unless PROFILE_DEPLOY_ALLOW_UNVERIFIED is set.
print_header "DEPLOY-TARGET PREFLIGHT"
EXPECTED_ROLE="profile"

# Best-effort local resolution: does PROFILE_DOMAIN resolve to the host we deploy to?
# Mirrors setup-profile.sh's NAT-aware match (the public IP an A-record points at is the
# explicit PROFILE_SERVER_HOST, not a local interface). A missing resolver yields no match
# — the override is the backstop, so this never hard-fails a legitimate deploy.
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
if [ -n "${PROFILE_DOMAIN:-}" ]; then
    resolved_domain_ips=$(resolve_ips "$PROFILE_DOMAIN" | sort -u)
    acceptable_ips=$(printf '%s\n%s\n' "$PROFILE_SERVER_HOST" "$(resolve_ips "$PROFILE_SERVER_HOST")" | sort -u)
    for rip in $resolved_domain_ips; do
        for aip in $acceptable_ips; do
            [ -n "$rip" ] && [ "$rip" = "$aip" ] && DOMAIN_MATCH=1
        done
    done
fi

# Read the role marker over a read-only SSH (no mutation, no secret). The remote command
# always exits 0 (`|| true`) so the ssh exit code reflects ONLY reachability/auth — an
# unreachable or auth-failing host fails closed here, before anything is staged.
set +e
DEPLOY_TARGET_ROLE=$("${SSH_CMD[@]}" -o ConnectTimeout=10 "${REMOTE_USER}@${PROFILE_SERVER_HOST}" \
    'cat /etc/geoconflict-deploy-role 2>/dev/null || true')
preflight_rc=$?
set -e
if [ "$preflight_rc" -ne 0 ]; then
    echo "Error: preflight SSH to ${PROFILE_SERVER_HOST} failed (rc=${preflight_rc}) — host"
    echo "       unreachable or key rejected. Aborting before any secret transfer or mutation."
    exit 1
fi
DEPLOY_TARGET_ROLE=$(printf '%s' "$DEPLOY_TARGET_ROLE" | tr -d '[:space:]')

if [ "$DEPLOY_TARGET_ROLE" = "$EXPECTED_ROLE" ]; then
    echo "Preflight OK: role marker confirms the ${EXPECTED_ROLE} box."
elif [ -n "$DEPLOY_TARGET_ROLE" ]; then
    echo "Error: ${PROFILE_SERVER_HOST} is provisioned as role '${DEPLOY_TARGET_ROLE}', not"
    echo "       '${EXPECTED_ROLE}'. Refusing to clobber a different box. Aborting before any"
    echo "       secret transfer or mutation — check PROFILE_SERVER_HOST."
    exit 1
elif [ "$DOMAIN_MATCH" = "1" ]; then
    echo "Preflight OK: no role marker yet (first provision); ${PROFILE_DOMAIN} resolves to this target."
elif is_truthy "${PROFILE_DEPLOY_ALLOW_UNVERIFIED:-}"; then
    echo "Warning: ${PROFILE_SERVER_HOST} has no role marker and ${PROFILE_DOMAIN:-<no domain>} does"
    echo "         not resolve to it — proceeding because PROFILE_DEPLOY_ALLOW_UNVERIFIED is set."
else
    echo "Error: cannot confirm ${PROFILE_SERVER_HOST} is the intended ${EXPECTED_ROLE} box"
    echo "       (no role marker, and ${PROFILE_DOMAIN:-<no domain>} does not resolve to it)."
    echo "       Aborting before any secret transfer or mutation. If this is a first provision"
    echo "       of a new box, set PROFILE_DEPLOY_ALLOW_UNVERIFIED=1 to proceed."
    exit 1
fi

# ── Upload setup script ───────────────────────────────────────────────────────
# Preflight (above) already made read-only contact; this SCP is the first WRITE. A bad
# SSH target fails the preflight before any secret is staged or the stack is mutated —
# setup-profile.sh runs last.

print_header "UPLOADING SETUP SCRIPT"
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"
# Carry the standalone daily-backup script on the same transport (no parallel pipeline).
chmod +x "$BACKUP_SCRIPT"
"${SCP_CMD[@]}" "$BACKUP_SCRIPT" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_BACKUP_SCRIPT}"
echo "Uploaded to ${REMOTE_BACKUP_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Stage secrets in a local temp file and SCP it, rather than inlining them in the
# SSH command (which would expose them in ps aux / /proc/<pid>/cmdline on the box).
# finalize_deploy (installed with the lock above) removes the local staged env_file, the
# sshpass password file, and the remote staged env on ANY exit — so credentials never
# linger anywhere, and its EXIT trap already replaced the build-phase iidfile trap.
REMOTE_ENV="/root/.profile-deploy-env-$$"
LOCAL_TMPENV=$(mktemp)
chmod 600 "$LOCAL_TMPENV"

# printf %q emits shell-safe, re-sourceable values — robust to passwords/tokens
# containing quotes, spaces, or other special characters.
#
# PROFILE_IMAGE carries the immutable @sha256 DIGEST (not the mutable profile-<sha>
# tag): the box deploys by digest end-to-end, and setup-profile.sh declines anything
# that is not @sha256-pinned. This closes the mutable-tag window.
{
    printf "export PROFILE_IMAGE=%q\n" "$PROFILE_DIGEST"
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
    # Yandex per-game payments HMAC secret (task 0019). Rides the same 0600-staged,
    # source-then-rm channel as the DB password. Empty is a SUPPORTED state: the
    # payments routes fail closed with 503 and the rest of the profile server is
    # unaffected. The key itself is issued by task 0014 (Yandex catalog registration).
    printf "export YANDEX_PAYMENTS_SECRET=%q\n" "${YANDEX_PAYMENTS_SECRET:-}"
    # Operator Telegram notifications for pending name-change requests (task 0067).
    # Same bot/chat/proxy as the game server's feedback sends. The token rides the
    # same 0600-staged, source-then-rm channel as the DB password. All three empty
    # is a supported state: name-change requests still work, unnotified.
    printf "export FEEDBACK_TELEGRAM_TOKEN=%q\n" "${FEEDBACK_TELEGRAM_TOKEN:-}"
    printf "export FEEDBACK_TELEGRAM_CHAT_ID=%q\n" "${FEEDBACK_TELEGRAM_CHAT_ID:-}"
    printf "export TELEGRAM_PROXY_URL=%q\n" "${TELEGRAM_PROXY_URL:-}"
    # Off-box backup config (T8). Endpoint/region/bucket/prefix are public; access+secret keys
    # and the age recipient ride the same 0600-staged, source-then-rm channel as the DB password.
    # setup-profile.sh installs the daily encrypted S3 backup only when these are all present.
    printf "export PROFILE_BACKUP_S3_ENDPOINT=%q\n" "${PROFILE_BACKUP_S3_ENDPOINT:-}"
    printf "export PROFILE_BACKUP_S3_REGION=%q\n" "${PROFILE_BACKUP_S3_REGION:-}"
    printf "export PROFILE_BACKUP_S3_BUCKET=%q\n" "${PROFILE_BACKUP_S3_BUCKET:-}"
    printf "export PROFILE_BACKUP_S3_PREFIX=%q\n" "${PROFILE_BACKUP_S3_PREFIX:-profiles}"
    printf "export PROFILE_BACKUP_S3_ACCESS_KEY=%q\n" "${PROFILE_BACKUP_S3_ACCESS_KEY:-}"
    printf "export PROFILE_BACKUP_S3_SECRET_KEY=%q\n" "${PROFILE_BACKUP_S3_SECRET_KEY:-}"
    printf "export PROFILE_BACKUP_AGE_RECIPIENT=%q\n" "${PROFILE_BACKUP_AGE_RECIPIENT:-}"
    printf "export PROFILE_BACKUP_RETENTION_DAILY_DAYS=%q\n" "${PROFILE_BACKUP_RETENTION_DAILY_DAYS:-14}"
    printf "export PROFILE_BACKUP_RETENTION_WEEKLY_DAYS=%q\n" "${PROFILE_BACKUP_RETENTION_WEEKLY_DAYS:-56}"
} > "$LOCAL_TMPENV"

REMOTE_ENV_STAGED=1
"${SCP_CMD[@]}" "$LOCAL_TMPENV" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_ENV}"

# Source the staged env into the remote shell, rm it BEFORE setup-profile.sh runs
# (so no secret reaches the box's process argv), then run setup-profile.sh — all in a
# single SSH session so the secrets never persist on the box beyond this one command.
"${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" \
    "chmod 600 ${REMOTE_ENV} && \
    chmod +x ${REMOTE_SCRIPT} && \
    . ${REMOTE_ENV} && \
    rm -f ${REMOTE_ENV} && \
    ${REMOTE_SCRIPT}"
# Happy path: the remote file is already gone, so skip the trap's remote cleanup.
REMOTE_ENV_STAGED=0
# Mark the deploy successful so finalize_deploy records validation_result=ok.
DEPLOY_OUTCOME=ok

print_header "DONE"
echo "Profile backend setup completed on ${PROFILE_SERVER_HOST}."
echo ""
echo "Next steps:"
echo "  1. Verify: curl https://${PROFILE_DOMAIN:-<domain>}/health   # expect {\"status\":\"ok\"}"
echo "  2. Set PROFILE_API_URL=https://${PROFILE_DOMAIN:-<domain>} in .env.<env> for the game server."
echo "  3. (T6) Share PROFILE_INTERNAL_TOKEN with the game server's .env.prod."
echo "======================================================"
