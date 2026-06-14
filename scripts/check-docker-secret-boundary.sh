#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE="$ROOT_DIR/Dockerfile"
DOCKERFILE_PROFILE="$ROOT_DIR/Dockerfile.profile"
DOCKERIGNORE="$ROOT_DIR/.dockerignore"
RUNTIME_IMAGE_CHECK=false
TEMP_IMAGE_TAG="geoconflict-secret-boundary-check:$(date +%s)-$$"

cleanup() {
    if [ "$RUNTIME_IMAGE_CHECK" = true ] && command -v docker >/dev/null 2>&1; then
        docker image rm -f "$TEMP_IMAGE_TAG" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

INSPECT_IMAGE=""
if [ "${1:-}" = "--runtime-image-check" ]; then
    RUNTIME_IMAGE_CHECK=true
elif [ "${1:-}" = "--inspect-image" ]; then
    # Inspect an already-built image (e.g. the profile image) for env/secret files,
    # without building anything here. Static checks below still run first.
    INSPECT_IMAGE="${2:-}"
    if [ -z "$INSPECT_IMAGE" ]; then
        echo "Usage: $0 --inspect-image <image-tag>"
        exit 1
    fi
elif [ "${1:-}" != "" ]; then
    echo "Usage: $0 [--runtime-image-check | --inspect-image <image-tag>]"
    exit 1
fi

require_literal_line() {
    local expected="$1"
    if ! grep -Fxq "$expected" "$DOCKERIGNORE"; then
        echo "Error: .dockerignore must contain an exact '$expected' entry."
        exit 1
    fi
}

# Reject any COPY/ADD that copies the whole build context (a `.` or `./` SOURCE
# operand) — the broad-copy class behind the 2026-04-21 credential leak. This must
# catch EVERY form Docker accepts, not just the simple `COPY . /app`:
#   - shell form, source first:      COPY . /app             ADD ./ /app
#   - shell form, source NOT first:  COPY package.json . /app/
#   - shell form with flags:         COPY --chown=x . /app
#   - JSON/exec form (any position): COPY [".", "/app"]      COPY ["pkg", ".", "/app"]
#   - lowercase / mixed case:        copy . /app             Copy . /app   (Docker is
#                                    case-INSENSITIVE for instructions)
#   - backslash line-continuation:   COPY \ <newline> . /app
# A `.`/`./` in the LAST (destination) position is legitimate (copy specific sources
# into WORKDIR) and must NOT be flagged: `COPY package*.json ./`, `COPY a b .`,
# `COPY --from=stage /x .`. So we parse the operands and flag `.`/`./` anywhere
# EXCEPT the final destination. A regex only ever sees the first operand, which is
# why the original grep missed multi-source broad copies.
scan_broad_copies() {
    awk '
    {
        start = FNR
        cur = $0
        # Join Dockerfile backslash line-continuations into one logical instruction so
        # `COPY \` <newline> `. /app` is analyzed as the broad copy `COPY . /app`.
        while (cur ~ /\\[[:space:]]*$/) {
            sub(/\\[[:space:]]*$/, " ", cur)
            if ((getline nextline) > 0) {
                cur = cur nextline
            } else {
                break
            }
        }
        # Dockerfile instructions are case-INSENSITIVE (copy/Copy/COPY are equivalent),
        # so parse an UPPERCASED working copy. Operands are only ever compared to "."
        # and "./", which are case-invariant, so this is safe; the original (joined)
        # line is printed in the error.
        work = toupper(cur)
        sub(/^[[:space:]]+/, "", work)
        if (work !~ /^(COPY|ADD)[[:space:]]/) next
        sub(/^(COPY|ADD)[[:space:]]+/, "", work)
        # Strip any leading --flags (--chown=, --from=, --chmod=, --link, ...).
        while (work ~ /^--[^[:space:]]+([[:space:]]+|$)/) {
            sub(/^--[^[:space:]]+[[:space:]]*/, "", work)
        }
        bad = 0
        if (work ~ /^\[/) {
            # JSON/exec form: pull quoted elements in order; the last is the destination.
            n = 0
            rest = work
            while (match(rest, /"[^"]*"/)) {
                n++
                elems[n] = substr(rest, RSTART + 1, RLENGTH - 2)
                rest = substr(rest, RSTART + RLENGTH)
            }
            for (i = 1; i < n; i++) {
                if (elems[i] == "." || elems[i] == "./") bad = 1
            }
        } else {
            # Shell form: whitespace-separated operands; the last is the destination.
            m = split(work, ops, /[[:space:]]+/)
            for (i = 1; i < m; i++) {
                if (ops[i] == "." || ops[i] == "./") bad = 1
            }
        }
        if (bad) {
            printf "%s:%d: %s\n", FILENAME, start, cur
            found = 1
        }
    }
    END { exit (found ? 1 : 0) }
    ' "$1"
}

echo "Checking Docker secret boundary..."

for df in "$DOCKERFILE" "$DOCKERFILE_PROFILE"; do
    [ -f "$df" ] || continue
    if ! broad_matches=$(scan_broad_copies "$df"); then
        echo "Error: $df contains a broad repo copy (a '.'/'./' source that copies the whole build context):"
        echo "$broad_matches"
        echo "Use explicit allowlist copies instead (e.g. COPY package*.json ./)."
        exit 1
    fi
done

require_literal_line ".env"
require_literal_line ".env.*"
require_literal_line "*.secret"
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

if [ -n "$INSPECT_IMAGE" ]; then
    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: docker is required for --inspect-image."
        exit 1
    fi

    echo "Inspecting image $INSPECT_IMAGE for env and secret files..."
    if docker run --rm "$INSPECT_IMAGE" /bin/sh -lc 'find /usr/src/app -maxdepth 4 \( -name ".env*" -o -name "*.secret" \) -print | sort' | grep -q .; then
        echo "Error: image $INSPECT_IMAGE contains env or secret files."
        exit 1
    fi

    echo "Image secret inspection passed."
fi

echo "Docker secret boundary check passed."
