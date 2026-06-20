#!/bin/bash
# build-deploy-profile.sh - Build the player-profile API image, push it to the
# registry, and pin an immutable @sha256 digest. Usage: ./build-deploy-profile.sh
#
# Reads config from .env / .env.secret / .env.profile / .env.profile.secret.
# Builds Dockerfile.profile for linux/amd64, pushes it, and resolves the canonical
# registry digest from the built image ID (fail-closed if none resolves).
#
# This is the LOCAL half of the profile deploy pipeline (T4e1) — it contacts no
# VPS. The transport/deploy half (SSH/SCP upload + remote setup-profile.sh) is
# stubbed below and lands in T4e3.

set -e

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

# ── Load config ───────────────────────────────────────────────────────────────

load_env_file ".env"
load_env_file ".env.secret"

if [ -f .env.profile ]; then
    load_env_file ".env.profile"
else
    echo "Warning: .env.profile not found — using env vars from .env or shell"
fi

load_env_file ".env.profile.secret"

# ── Validate (local preconditions only) ───────────────────────────────────────
# PROFILE_SERVER_HOST and the existence of setup-profile.sh are validated by the
# deploy half in T4e3 — this slice contacts no box, so it must not depend on
# either (setup-profile.sh is T4e2's deliverable and may not exist yet).

if [ -z "${DOCKER_USERNAME:-}" ] || [ -z "${DOCKER_REPO:-}" ]; then
    echo "Error: DOCKER_USERNAME and DOCKER_REPO must be set (registry for the profile image)."
    exit 1
fi

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
PROFILE_IMAGE="${DOCKER_USERNAME}/${DOCKER_REPO}:profile-${VERSION_TAG}"

IIDFILE=$(mktemp)

print_header "BUILDING PROFILE IMAGE (linux/amd64): ${PROFILE_IMAGE}"
docker buildx build --platform linux/amd64 --load \
    -f "$DOCKERFILE" -t "$PROFILE_IMAGE" --iidfile "$IIDFILE" .

BUILT_IMAGE_ID=$(cat "$IIDFILE")
rm -f "$IIDFILE"

# ── Push to the registry ──────────────────────────────────────────────────────
# Token on stdin via --password-stdin — never in argv (ps aux / /proc/<pid>/cmdline).

if [ -n "${DOCKER_TOKEN:-}" ]; then
    echo "Logging in to the container registry as ${DOCKER_USERNAME}..."
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
fi

print_header "PUSHING PROFILE IMAGE"
# `docker push` can only target NAME[:TAG] — it cannot push an image ID or a digest
# — so a tag→push step is unavoidable, and `docker tag` + `docker push` are two
# separate daemon calls. Pushing the deterministic profile-<sha> tag directly would
# let a second run of this script at the same commit (sharing that tag on the local
# daemon) divert this push. So publish the build under a per-run-unique staging ref
# that no concurrent run contends for. This defends accidental concurrency; what
# actually guarantees we never deploy a different artifact than we built is the
# content-addressed digest resolved from BUILT_IMAGE_ID below — not the tag.
STAGING_REF="${DOCKER_USERNAME}/${DOCKER_REPO}:_staging-${VERSION_TAG}-$(openssl rand -hex 6)"
docker tag "$BUILT_IMAGE_ID" "$STAGING_REF"
docker push "$STAGING_REF"

# ── Pin the immutable @sha256 digest (K2) ─────────────────────────────────────
# Resolve from the built image ID, never a tag. RepoDigests is content-addressed:
# each entry repo@sha256:D has D = the manifest digest of BUILT_IMAGE_ID's own bytes
# (only the repo-NAME prefix is mutable, never D), so a non-empty match can only
# identify what we built. A diverted push would record its digest on a different
# image and leave BUILT_IMAGE_ID with no matching entry → we fail closed here rather
# than pin someone else's image. Fail closed if no canonical digest resolves.

PROFILE_DIGEST=$(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$BUILT_IMAGE_ID" \
    | grep -E "^${DOCKER_USERNAME}/${DOCKER_REPO}@sha256:[0-9a-f]{64}$" | head -1 || true)

if [ -z "$PROFILE_DIGEST" ]; then
    echo "Error: could not resolve a canonical registry digest for the built artifact ${BUILT_IMAGE_ID}."
    echo "Refusing to deploy by mutable tag (a digest is required)."
    exit 1
fi

echo "Resolved digest: ${PROFILE_DIGEST}"

# Publish the human-friendly profile-<sha> tag for registry browsing. Cosmetic only
# — the deploy consumes PROFILE_DIGEST (the @sha256), so a race on this tag cannot
# change what gets deployed; a failure here must not sink an already-pinned artifact.
docker tag "$BUILT_IMAGE_ID" "$PROFILE_IMAGE"
docker push "$PROFILE_IMAGE" \
    || echo "Warning: cosmetic ${PROFILE_IMAGE} tag push failed; digest ${PROFILE_DIGEST} is already pinned and published."

# ── Transport/deploy — STUBBED (T4e3) ─────────────────────────────────────────
# The SSH/SCP upload, secret-staging, and remote setup-profile.sh invocation land
# in T4e3, which un-stubs this section. Nothing below contacts a VPS today.

print_header "TRANSPORT/DEPLOY — STUBBED"
echo "Built & pushed: ${PROFILE_IMAGE}"
echo "Digest:         ${PROFILE_DIGEST}"
echo ""
echo "Transport/deploy stage lands in T4e3 (SSH/SCP upload + remote setup-profile.sh)."
echo "No VPS was contacted."
exit 0
