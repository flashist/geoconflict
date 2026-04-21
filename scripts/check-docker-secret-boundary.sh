#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE="$ROOT_DIR/Dockerfile"
DOCKERIGNORE="$ROOT_DIR/.dockerignore"
RUNTIME_IMAGE_CHECK=false
TEMP_IMAGE_TAG="geoconflict-secret-boundary-check:$(date +%s)-$$"

cleanup() {
    if [ "$RUNTIME_IMAGE_CHECK" = true ] && command -v docker >/dev/null 2>&1; then
        docker image rm -f "$TEMP_IMAGE_TAG" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

if [ "${1:-}" = "--runtime-image-check" ]; then
    RUNTIME_IMAGE_CHECK=true
elif [ "${1:-}" != "" ]; then
    echo "Usage: $0 [--runtime-image-check]"
    exit 1
fi

require_literal_line() {
    local expected="$1"
    if ! grep -Fxq "$expected" "$DOCKERIGNORE"; then
        echo "Error: .dockerignore must contain an exact '$expected' entry."
        exit 1
    fi
}

echo "Checking Docker secret boundary..."

if grep -nE '^[[:space:]]*(COPY|ADD)([[:space:]]+--from=[^[:space:]]+)?[[:space:]]+(\./?|\.)[[:space:]]+(\./?|\.)[[:space:]]*$' "$DOCKERFILE"; then
    echo "Error: Dockerfile contains a broad repo copy. Use explicit allowlist copies instead."
    exit 1
fi

require_literal_line ".env"
require_literal_line ".env.*"
require_literal_line ".git"
require_literal_line ".gitignore"

echo "Static Docker boundary checks passed."

if [ "$RUNTIME_IMAGE_CHECK" = true ]; then
    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: docker is required for --runtime-image-check."
        exit 1
    fi

    echo "Building runtime-source stage for secret inspection..."
    docker build \
        --target runtime-source \
        -t "$TEMP_IMAGE_TAG" \
        "$ROOT_DIR" >/dev/null

    echo "Inspecting runtime-source image for env and secret files..."
    if docker run --rm "$TEMP_IMAGE_TAG" /bin/sh -lc 'find /usr/src/app -maxdepth 3 \( -name ".env*" -o -name "*.secret" \) -print | sort' | grep -q .; then
        echo "Error: runtime-source image contains env or secret files."
        exit 1
    fi

    echo "Runtime image secret inspection passed."
fi

echo "Docker secret boundary check passed."
