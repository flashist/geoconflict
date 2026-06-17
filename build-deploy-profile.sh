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
# Fail closed on an empty tag: never build/push an image as `repo:profile-` (a malformed
# ref). git rev-parse short-circuits to the package.json version; if BOTH yield nothing,
# abort early with a clear message instead of a confusing downstream `docker build` error.
if [ -z "$VERSION_TAG" ]; then
    echo "Error: could not determine VERSION_TAG (git rev-parse and node both failed)."
    echo "Ensure git or node is available, or set the image tag manually."
    exit 1
fi
PROFILE_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}:profile-${VERSION_TAG}"

# Enforce the Docker secret-boundary gate BEFORE building — same as the game path
# (build.sh:110). A broad-copy regression in Dockerfile.profile must never package
# local .env*/secret material into the image (the 2026-04-21 leak class).
print_header "CHECKING DOCKER SECRET BOUNDARY"
bash scripts/check-docker-secret-boundary.sh

print_header "BUILDING PROFILE IMAGE: ${PROFILE_IMAGE}"
# Pin the target platform to linux/amd64 — same as the game build path (build.sh:117). The
# dev HOST is often Apple Silicon (arm64); a plain `docker build` there produces an arm64-only
# image, `docker push` records an arm64 digest, and that digest is baked into the box's compose
# below — but the reg.ru VPS is amd64 and cannot exec it (first deploy fails outright; a redeploy
# replaces the live API then health-fails into rollback). `--load` puts the single-platform amd64
# image in the LOCAL store so the inspect → push → digest-resolve flow below works unchanged and
# ships/inspects the exact amd64 artifact (on an arm64 host the inspect emulates amd64 via Docker
# Desktop's qemu — a one-shot scan, acceptable).
docker buildx build --platform linux/amd64 --load -f "$DOCKERFILE" -t "$PROFILE_IMAGE" .

# Capture the IMMUTABLE image ID of the artifact we just built and bind BOTH the secret-boundary
# scan and the deploy digest to it — never the mutable tag `$PROFILE_IMAGE`. The tag is shared on
# the local Docker daemon: a concurrent deploy at the same commit (an operator retry, or a second
# checkout) can repoint `repo:profile-<sha>` between our scan and our push, so a tag-keyed scan
# could certify image A while image B is what gets pushed and deployed by digest — a TOCTOU on the
# very secret boundary this gate exists to enforce (the 2026-04-21 leak class). The image ID is
# content-addressed and cannot be repointed, so scanning it and resolving the digest FROM it makes
# the trust path independent of the tag. Fail closed if the ID is unreadable or not a sha256 (an
# unverifiable artifact must not reach a box that holds profile data + service secrets). Variable-
# held regex for bash-3.2 (the dev host).
BUILT_IMAGE_ID=$(docker inspect --format '{{.Id}}' "$PROFILE_IMAGE" 2>/dev/null || true)
built_image_id_re='^sha256:[0-9a-f]{64}$'
if ! [[ $BUILT_IMAGE_ID =~ $built_image_id_re ]]; then
    echo "Error: could not resolve the built image ID for ${PROFILE_IMAGE} (got: '${BUILT_IMAGE_ID}')."
    echo "Refusing to scan/deploy an unverifiable artifact."
    exit 1
fi
echo "Built image ID: ${BUILT_IMAGE_ID}"

# Runtime inspection of the built image — fail if any .env*/secret file rode along. Scan the
# IMMUTABLE ID (not the tag): this is the exact artifact whose digest we deploy below, so a
# concurrent retag of the tag cannot swap a different image past the scan.
print_header "INSPECTING BUILT IMAGE FOR SECRETS"
bash scripts/check-docker-secret-boundary.sh --inspect-image "$BUILT_IMAGE_ID"

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
#
# Resolve from BUILT_IMAGE_ID, not the tag. A RepoDigest belongs to its OWN image object
# (repo@sha256:<digest of THAT object's manifest>), so resolving from the scanned ID guarantees
# the digest we deploy refers to the EXACT bytes we scanned — a concurrent retag can never make
# us resolve a different (hijacker) image's digest. That holds on BOTH the legacy and the
# containerd image store; only the empty-result mechanism differs: on the legacy store the
# scanned image has no RepoDigest until it is pushed, while on the containerd store a build
# populates one immediately but a concurrent retag of repo:profile-<sha> reassociates the repo
# name away, dropping the scanned image's repo digest. Either way, if there is no CANONICAL
# repo@sha256:<64-hex> digest for OUR repo on the scanned image, we fail closed rather than fall
# back to the mutable tag. The end-anchored 64-hex match (grep -E) is symmetric with the strict
# BUILT_IMAGE_ID guard above — a malformed/short digest can't slip the non-empty check.
PROFILE_DIGEST=$(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$BUILT_IMAGE_ID" \
    | grep -E "^${DOCKER_USERNAME}/${DOCKER_REPO}@sha256:[0-9a-f]{64}$" | head -1 || true)
if [ -z "$PROFILE_DIGEST" ]; then
    echo "Error: could not resolve a canonical registry digest for the built artifact ${BUILT_IMAGE_ID}."
    echo "       (If a concurrent deploy retagged ${PROFILE_IMAGE} around the push, the scanned image"
    echo "        has no digest for this repo — re-run without a concurrent deploy.)"
    echo "Refusing to deploy by mutable tag (registry-image-policy.md requires a digest)."
    exit 1
fi
echo "Resolved digest: ${PROFILE_DIGEST}"

# Deploy by digest, not the tag. The box bakes this ref into compose, so its
# rollback capture (.Config.Image) is a digest too.
PROFILE_DEPLOY_REF="$PROFILE_DIGEST"

# Minimum deploy record (registry-image-policy.md §Minimum Deploy Record): durable +
# private, appended to a gitignored local file (never committed). Only
# validation_result=passed records are rollback-eligible.
#
# The record body is written WITHOUT a validation_result line; a single
# validation_result is appended exactly once by finalize_deploy on exit. The trap is
# installed BEFORE the fallible SSH preflight below (which has several early `exit`s
# and a `set -e` scp), so every exit path — not just the happy one — finalizes the
# record. DEPLOY_OUTCOME defaults to "failed" and flips to "passed" only after the
# remote setup (health + DB-credential gates) returns success, so an aborted/failed
# deploy is never recorded as trusted provenance, and a successful one carries exactly
# one unambiguous result.
DEPLOY_RECORD=".profile-deploy-record"
DEPLOY_OUTCOME="failed"

# Local deploy serializer. build-deploy runs on the developer HOST (often macOS, which has
# NO flock — so the remote box's flock approach is not portable here); use an atomic mkdir
# mutex instead (mkdir either creates the dir or fails, atomically, on every POSIX host).
# Acquired BEFORE the first record write and held across the SSH call so two concurrent
# local deploys can't interleave the record or race the remote. Fail-closed: a held lock
# aborts. Released by finalize_deploy on exit; a crash leaves a stale dir with a clear rmdir
# hint. Gitignored.
DEPLOY_LOCK=".profile-deploy.lock"
DEPLOY_LOCK_HELD=0

# Secret-staging + record-finalization state. Initialized up front so the trap is
# safe to fire during the preflight, before the temp files are created (it guards on
# them) and before SSH_CMD/REMOTE_USER exist (the remote-cleanup branch only runs
# once REMOTE_ENV_STAGED=1, which happens well after those are set).
LOCAL_TMPENV=""
REMOTE_ENV=""
REMOTE_ENV_STAGED=0
DEPLOY_FINALIZED=0
DEPLOY_RECORD_TMP=""
# 0600 file holding the SSH password for `sshpass -f` (emergency fallback only). Initialized
# here so the EXIT trap can clean it even if it fires before the file is created.
SSH_PASSWORD_FILE=""
# Per-deploy remote path for the setup script (allocated host-side with mktemp, like REMOTE_ENV
# — a fixed name lets a concurrent operator clobber it between our upload and execute). The
# remote-cleanup branch only runs once REMOTE_SCRIPT_STAGED=1, which is set after SSH_CMD exists.
REMOTE_SCRIPT=""
REMOTE_SCRIPT_STAGED=0

finalize_deploy() {
    # Idempotent: the guard flag guarantees EXACTLY ONE validation_result line even if
    # this is reachable from more than one path, so deploy provenance is never
    # ambiguous or stuck pending.
    [ "$DEPLOY_FINALIZED" = "1" ] && return 0
    DEPLOY_FINALIZED=1
    # Remove local + remote secret staging files (best-effort). The `|| true` is load-bearing:
    # under `set -e` an unguarded `rm -f` that returns non-zero (read-only fs) would abort this
    # EXIT trap before the lock-release `rmdir` below, leaving a stale lock that blocks every
    # future deploy. Match the guarded DEPLOY_RECORD_TMP cleanup further down.
    [ -n "$LOCAL_TMPENV" ] && rm -f "$LOCAL_TMPENV" || true
    [ -n "$SSH_PASSWORD_FILE" ] && rm -f "$SSH_PASSWORD_FILE" || true
    if [ "$REMOTE_ENV_STAGED" = "1" ]; then
        # Best-effort; ignore errors (the host may be unreachable on a failure path).
        "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" "rm -f ${REMOTE_ENV}" >/dev/null 2>&1 || true
    fi
    if [ "$REMOTE_SCRIPT_STAGED" = "1" ]; then
        # The per-deploy setup script (not a secret, so removed after execution rather than
        # before). Best-effort — host may be unreachable on a failure path.
        "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" "rm -f ${REMOTE_SCRIPT}" >/dev/null 2>&1 || true
    fi
    # Atomic record write. The body lines were accumulated into DEPLOY_RECORD_TMP (never
    # appended to the shared record yet). Append the single self-identifying result line to
    # the SAME temp, then append the COMPLETE block to $DEPLOY_RECORD in ONE operation while
    # the mkdir lock is still held — so a body can never land without its matching result
    # (even on interrupt), and concurrent deploys (blocked by the lock) can't interleave
    # blocks. The digest on the result line keys it to its deploy regardless of file
    # position (registry-image-policy.md, the rollback trust anchor). If the temp was never
    # created (we aborted before the record stage), write nothing.
    if [ -n "$DEPLOY_RECORD_TMP" ] && [ -f "$DEPLOY_RECORD_TMP" ] && [ -n "${DEPLOY_RECORD:-}" ]; then
        # A record-write failure (disk full, perms) must NOT abort this EXIT trap under set -e
        # before the cleanup below — a skipped rmdir would leave a stale lock that blocks every
        # future deploy. Surface the failure, but always fall through to cleanup.
        echo "validation_result=${DEPLOY_OUTCOME:-failed} digest=${PROFILE_DIGEST:-unknown}" >> "$DEPLOY_RECORD_TMP" \
            && cat "$DEPLOY_RECORD_TMP" >> "$DEPLOY_RECORD" \
            || echo "Warning: could not write the deploy record to $DEPLOY_RECORD" >&2
    fi
    [ -n "$DEPLOY_RECORD_TMP" ] && rm -f "$DEPLOY_RECORD_TMP" || true
    # Release the local deploy lock (held for the process lifetime).
    [ "$DEPLOY_LOCK_HELD" = "1" ] && rmdir "$DEPLOY_LOCK" 2>/dev/null || true
}
# finalize_deploy is the SINGLE writer, registered on EXIT only, so it runs exactly
# once per invocation. On Ctrl-C / SIGTERM the handler exits with the conventional
# 128+signal code — which BOTH aborts the deploy (a bare `trap … INT` would have run
# the handler and then RESUMED the deploy) and triggers the one EXIT finalize. The
# guard flag above is belt-and-suspenders against any other double path.

# Acquire the local deploy lock (fail-closed) BEFORE installing the record-writing trap and
# before the first record write, so a second concurrent deploy aborts here and never writes
# a partial record. mkdir is atomic and portable (the host may be macOS, which has no flock).
if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then
    echo "Error: another profile deploy is already running (lock: $DEPLOY_LOCK)."
    echo "       If you are sure none is, remove the stale lock and retry: rmdir $DEPLOY_LOCK"
    exit 1
fi
DEPLOY_LOCK_HELD=1

trap finalize_deploy EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Accumulate the record BODY into a private temp file (NOT appended to the shared record
# yet). finalize_deploy appends the single validation_result line and then writes the whole
# block to $DEPLOY_RECORD in one atomic append under the lock — so the record is never a
# body without its result, even on interrupt. Echoed to stdout here for live visibility.
DEPLOY_RECORD_TMP=$(mktemp)
chmod 600 "$DEPLOY_RECORD_TMP"
{
    echo "----"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "env=profile"
    echo "host=${PROFILE_SERVER_HOST}"
    echo "tag=${PROFILE_IMAGE}"
    echo "digest=${PROFILE_DIGEST}"
    echo "commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "operator=$(whoami 2>/dev/null || echo unknown)"
} | tee "$DEPLOY_RECORD_TMP"
echo "Deploy record staged (gitignored ${DEPLOY_RECORD}; full block + validation_result written atomically at exit)."

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
    # Feed the password to sshpass via a 0600 FILE (the -f form), never the -p form: -p puts
    # the SSH password in this host's process argv (visible to `ps`, /proc/<pid>/cmdline,
    # execve auditing, process collectors), violating the argv-safety invariant
    # (docs/security/profile-deploy-scope.md I-A — the SSH password is named there). With -f
    # only the file PATH is in argv; the secret lives in a root-only temp file that
    # finalize_deploy removes on exit. mktemp creates the file 0600 before any byte is written.
    SSH_PASSWORD_FILE=$(mktemp)
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    SCP_CMD=(sshpass -f "$SSH_PASSWORD_FILE" scp -o StrictHostKeyChecking=accept-new)
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh -o StrictHostKeyChecking=accept-new)
fi

print_header "DEPLOYING PROFILE BACKEND TO ${PROFILE_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${PROFILE_SERVER_HOST}"
echo "Image (tag):   ${PROFILE_IMAGE}"
echo "Deploy ref:    ${PROFILE_DEPLOY_REF}"
echo ""

# ── Upload setup script ───────────────────────────────────────────────────────

print_header "UPLOADING SETUP SCRIPT"
# Allocate a PER-DEPLOY remote path for the setup script with mktemp ON THE BOX — NOT a fixed
# /root/setup-profile.sh. The remote flock lives INSIDE the script, so the upload+execute of the
# script FILE is not serialized; a fixed name lets a concurrent operator (a different workstation
# — the local mkdir lock is per-workstation — possibly on a different commit or with local edits)
# clobber it between our upload and our execute, so we would run THEIR script version with OUR env
# (provenance mismatch, or running a stale/unsafe rollback path against live data). A host-unique
# name per deploy means each deploy uploads and runs exactly its OWN content (invariant I-D:
# uniquely-name shared remote resources). finalize_deploy removes it on exit; it is not a secret,
# so there is no rush to delete it mid-run (which could unlink the script bash is executing).
REMOTE_SCRIPT=$("${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" 'umask 077; mktemp /root/.profile-deploy-setup.XXXXXXXX' 2>/dev/null) || true
# Validate STRICTLY before trusting the path (a MOTD/banner/.bashrc echo could pollute stdout) —
# same fail-closed discipline as REMOTE_ENV below. (Variable-held regex is bash-3.2 safe.)
remote_script_re='^/root/\.profile-deploy-setup\.[A-Za-z0-9]+$'
if [ -z "$REMOTE_SCRIPT" ] || ! [[ $REMOTE_SCRIPT =~ $remote_script_re ]]; then
    echo "Error: remote setup-script path allocation on ${PROFILE_SERVER_HOST} returned an" >&2
    echo "       unexpected value — remote mktemp failed, or its stdout was polluted by a" >&2
    echo "       banner/MOTD/.bashrc. Got: ${REMOTE_SCRIPT}" >&2
    exit 1
fi
REMOTE_SCRIPT_STAGED=1
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Stage secrets in a local temp file and SCP it, rather than inlining them in the
# SSH command (which would expose them in ps aux / /proc/<pid>/cmdline on the box).
# The finalize_deploy trap installed above already cleans up BOTH the local and the
# remote staging file on ANY exit — interrupted scp, a failed source, or Ctrl-C — so
# credentials never linger anywhere. Here we only create the files it guards on.
LOCAL_TMPENV=$(mktemp)
chmod 600 "$LOCAL_TMPENV"

# Allocate the REMOTE staging path with mktemp ON THE BOX — NOT keyed on the local shell
# PID. Two operators on different machines have independent PIDs that can collide, and this
# file is uploaded, sourced, and removed BEFORE setup-profile.sh takes its remote flock — so
# a PID-keyed name (/root/.profile-deploy-env-$$) would let one deploy clobber or rm the
# other's staged secrets (wrong-secrets deploy / aborted source). mktemp is host-unique
# regardless of any local PID; `umask 077` makes it 0600 at creation. Capture the path, THEN
# mark it staged so finalize_deploy cleans it up on any later failure.
REMOTE_ENV=$("${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" 'umask 077; mktemp /root/.profile-deploy-env.XXXXXXXX' 2>/dev/null) || true
# Validate the captured path STRICTLY before trusting it. `ssh host cmd` should emit only the
# command's stdout, but a server MOTD / login banner / a root .bashrc that echoes could prepend
# or append noise; an unvalidated multi-line/garbage value would break the scp destination and
# the cleanup rm (and could leave a stale file on the box). Fail CLOSED on anything that is not
# exactly one well-formed staging path. (Variable-held regex is bash-3.2 safe — the dev host.)
remote_env_re='^/root/\.profile-deploy-env\.[A-Za-z0-9]+$'
if [ -z "$REMOTE_ENV" ] || ! [[ $REMOTE_ENV =~ $remote_env_re ]]; then
    echo "Error: remote staging-path allocation on ${PROFILE_SERVER_HOST} returned an unexpected" >&2
    echo "       value — remote mktemp failed, or its stdout was polluted by a banner/MOTD/.bashrc." >&2
    echo "       Got: ${REMOTE_ENV}" >&2
    exit 1
fi
REMOTE_ENV_STAGED=1

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
    printf "export PROFILE_INTERNAL_ALLOW_PUBLIC=%q\n" "${PROFILE_INTERNAL_ALLOW_PUBLIC:-}"
    printf "export CERTBOT_EMAIL=%q\n" "${CERTBOT_EMAIL:-ruflashist@gmail.com}"
    printf "export DOCKER_USERNAME=%q\n" "${DOCKER_USERNAME:-}"
    printf "export DOCKER_TOKEN=%q\n" "${DOCKER_TOKEN:-}"
} > "$LOCAL_TMPENV"

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
