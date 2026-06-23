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

# ── Resolve SSH user + auth ───────────────────────────────────────────────────
# Key path is the standard and the default. Password fallback is gated behind
# ALLOW_PROFILE_SSH_PASSWORD_FALLBACK and uses sshpass; its argv-exposing `-p` form
# is DELIBERATELY retained here — replacing it with `sshpass -f <0600 file>` is T4g's
# net-new hardening, not this slice's.

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
    SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=accept-new)
    SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=accept-new)
fi

REMOTE_SCRIPT="/root/setup-profile.sh"

print_header "DEPLOYING PROFILE BACKEND TO ${PROFILE_SERVER_HOST}"
echo "Remote user:   ${REMOTE_USER}"
echo "Remote host:   ${PROFILE_SERVER_HOST}"
echo "Image (tag):   ${PROFILE_IMAGE}"
echo "Image digest:  ${PROFILE_DIGEST}"
echo "Source commit: ${GIT_COMMIT}${WORKTREE_DIRTY:+ (DIRTY — image content differs from this commit)}"
echo ""

# ── Upload setup script ───────────────────────────────────────────────────────
# First contact with the box. A bad SSH target fails HERE (set -e aborts) before any
# secret is staged and before the remote stack is mutated — setup-profile.sh runs last.

print_header "UPLOADING SETUP SCRIPT"
chmod +x "$SETUP_SCRIPT"
"${SCP_CMD[@]}" "$SETUP_SCRIPT" "${REMOTE_USER}@${PROFILE_SERVER_HOST}:${REMOTE_SCRIPT}"
echo "Uploaded to ${REMOTE_SCRIPT}"

# ── Run setup remotely ────────────────────────────────────────────────────────

print_header "RUNNING SETUP ON REMOTE SERVER"

# Stage secrets in a local temp file and SCP it, rather than inlining them in the
# SSH command (which would expose them in ps aux / /proc/<pid>/cmdline on the box).
# Clean up BOTH the local and the remote staging file on ANY exit — interrupted
# scp, a failed source, or Ctrl-C — so credentials never linger anywhere. This EXIT
# trap intentionally replaces the build-phase iidfile trap, which has already done
# its job ($IIDFILE was rm'd right after the build — see the note where it is set).
REMOTE_ENV="/root/.profile-deploy-env-$$"
LOCAL_TMPENV=$(mktemp)
REMOTE_ENV_STAGED=0
cleanup_secrets() {
    rm -f "$LOCAL_TMPENV"
    if [ "$REMOTE_ENV_STAGED" = "1" ]; then
        # Best-effort; ignore errors (the host may be unreachable on a failure path).
        "${SSH_CMD[@]}" "${REMOTE_USER}@${PROFILE_SERVER_HOST}" "rm -f ${REMOTE_ENV}" >/dev/null 2>&1 || true
    fi
}
# Split traps (not `EXIT INT TERM` on one line): a non-exiting INT/TERM handler makes
# bash RESUME after the interrupted command, so a Ctrl-C during the SSH phase could fall
# through to the "DONE" banner below. set -e already aborts on the signal-killed ssh
# (verified: the false "DONE" does NOT reproduce with set -e on), so this is explicit
# hardening, not a live bugfix — INT/TERM exit with the conventional 128+signal status,
# which fires the single EXIT trap so cleanup_secrets runs exactly once on any path.
trap cleanup_secrets EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
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

print_header "DONE"
echo "Profile backend setup completed on ${PROFILE_SERVER_HOST}."
echo ""
echo "Next steps:"
echo "  1. Verify: curl https://${PROFILE_DOMAIN:-<domain>}/health   # expect {\"status\":\"ok\"}"
echo "  2. Set PROFILE_API_URL=https://${PROFILE_DOMAIN:-<domain>} in .env.<env> for the game server."
echo "  3. (T6) Share PROFILE_INTERNAL_TOKEN with the game server's .env.prod."
echo "======================================================"
