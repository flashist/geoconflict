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
# pipefail: surface a failure from any stage of a pipeline, not just the last. Audited
# (T4e1): the only pipelines are `echo $DOCKER_TOKEN | docker login` (already aborts on
# login failure — desired) and `printf | grep -q` inside an if-condition (set -e never
# aborts on a test). No `|| true` remains after the digest-resolve rewrite below.
set -o pipefail

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

# ── Transport/deploy — STUBBED (T4e3) ─────────────────────────────────────────
# The SSH/SCP upload, secret-staging, and remote setup-profile.sh invocation land
# in T4e3, which un-stubs this section. Nothing below contacts a VPS today.

print_header "TRANSPORT/DEPLOY — STUBBED"
echo "Built & pushed: ${PROFILE_IMAGE}"
echo "Source commit:  ${GIT_COMMIT}${WORKTREE_DIRTY:+ (DIRTY — image content differs from this commit)}"
echo "Digest:         ${PROFILE_DIGEST}"
echo ""
echo "Transport/deploy stage lands in T4e3 (SSH/SCP upload + remote setup-profile.sh)."
echo "No VPS was contacted."
exit 0
