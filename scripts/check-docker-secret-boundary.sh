#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE="$ROOT_DIR/Dockerfile"
DOCKERIGNORE="$ROOT_DIR/.dockerignore"
RUNTIME_IMAGE_CHECK=false
INSPECT_IMAGE=""
TEMP_IMAGE_TAG="geoconflict-secret-boundary-check:$(date +%s)-$$"

# sha256 helper: coreutils on Linux, shasum on macOS (the dev host is darwin).
HASH_CMD="sha256sum"
command -v sha256sum >/dev/null 2>&1 || HASH_CMD="shasum -a 256"

# Temp paths used by the byte scan; tracked at module scope so cleanup() removes them
# on every exit path (incl. the fail-closed exits below).
INSPECT_SAVE_DIR=""
INSPECT_LAYER_DIR=""
INSPECT_HASHES_FILE=""

cleanup() {
    if [ "$RUNTIME_IMAGE_CHECK" = true ] && command -v docker >/dev/null 2>&1; then
        docker image rm -f "$TEMP_IMAGE_TAG" >/dev/null 2>&1 || true
    fi
    [ -n "$INSPECT_LAYER_DIR" ] && rm -rf "$INSPECT_LAYER_DIR" 2>/dev/null || true
    [ -n "$INSPECT_SAVE_DIR" ] && rm -rf "$INSPECT_SAVE_DIR" 2>/dev/null || true
    [ -n "$INSPECT_HASHES_FILE" ] && rm -f "$INSPECT_HASHES_FILE" 2>/dev/null || true
}
trap cleanup EXIT

usage() {
    echo "Usage: $0 [--runtime-image-check] [--inspect-image <IMAGE_ID>] [--dockerfile <path>]"
    exit 1
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --runtime-image-check)
            RUNTIME_IMAGE_CHECK=true
            shift
            ;;
        --inspect-image)
            shift
            [ "$#" -gt 0 ] || { echo "Error: --inspect-image requires an image ID."; exit 1; }
            INSPECT_IMAGE="$1"
            shift
            ;;
        --dockerfile)
            shift
            [ "$#" -gt 0 ] || { echo "Error: --dockerfile requires a path."; exit 1; }
            DOCKERFILE="$1"
            shift
            ;;
        *)
            usage
            ;;
    esac
done

require_literal_line() {
    local expected="$1"
    if ! grep -Fxq "$expected" "$DOCKERIGNORE"; then
        echo "Error: .dockerignore must contain an exact '$expected' entry."
        exit 1
    fi
}

# ── COPY/ADD advisory — FROZEN, WARN-ONLY (T4f) ───────────────────────────────
# Flags only OBVIOUS broad/opaque COPY/ADD sources. It is advisory: it NEVER sets a
# non-zero exit code and NEVER blocks the push, and is NOT extended for new Dockerfile
# constructs (postmortem RC3: teaching the lexer construct N only creates construct
# N+1). The per-layer byte scan (--inspect-image) is the sole blocking oracle, with
# .dockerignore as the 0th layer; both backstop anything this advisory misses.
copy_add_advisory() {
    local dockerfile="$1"
    [ -f "$dockerfile" ] || return 0

    # Shell-form COPY/ADD whose SOURCE is the build root (`.`/`./`) or a variable
    # (`$VAR`/`${VAR}`); optional `--flag=...` options before the source are tolerated.
    local broad_src='^[[:space:]]*(COPY|ADD)([[:space:]]+--[A-Za-z]+=[^[:space:]]+)*[[:space:]]+(\.\/?|\$\{?[A-Za-z_])([[:space:]]|$)'
    # ADD from a URL.
    local add_url='^[[:space:]]*ADD([[:space:]]+--[A-Za-z]+=[^[:space:]]+)*[[:space:]]+https?:\/\/'
    # JSON-array (exec) form of COPY/ADD, including backslash-bearing entries.
    local json_form='^[[:space:]]*(COPY|ADD)([[:space:]]+--[A-Za-z]+=[^[:space:]]+)*[[:space:]]+\['

    local findings
    findings=$(grep -nE "$broad_src|$add_url|$json_form" "$dockerfile" 2>/dev/null || true)
    if [ -n "$findings" ]; then
        echo "Advisory (WARN-ONLY, non-blocking) — broad/opaque COPY/ADD source(s) in $dockerfile:"
        printf '%s\n' "$findings" | sed 's/^/    /'
        echo "  Confirm no local secret can ride along. The per-layer byte scan is the"
        echo "  authoritative gate; this advisory never changes the exit code."
    fi
    return 0
}

# ── Authoritative per-layer byte scan (T4f / postmortem §14 K5) ───────────────
# The SOLE blocking secret oracle. Observes the REAL bytes of every layer via
# `docker save`, so a secret is caught regardless of path/rename/subdirectory or being
# deleted in a later layer. FAILS CLOSED (rather than reporting "passed") if it cannot
# observe a layer: docker save fails, a non-JSON layer blob is unreadable as a tar, or
# zero layers are found.
inspect_image_bytes() {
    local image="$1"

    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: docker is required for --inspect-image."
        exit 1
    fi

    # Wanted-set: sha256 of every local secret/key in the repo tree. Uncapped; prune
    # node_modules/.git; exclude *.example/*.sample/*.template; size>0.
    local local_secret_files
    local_secret_files=$(find "$ROOT_DIR" \
        -type d \( -name node_modules -o -name .git \) -prune -o \
        -type f \( -name ".env" -o -name ".env.*" -o -name "*.secret" -o -name "*.pem" \
            -o -name "id_rsa*" -o -name "id_ed25519*" -o -name "*.key" \) \
        ! -name "*.example" ! -name "*.sample" ! -name "*.template" -size +0c -print 2>/dev/null || true)
    if [ -n "$local_secret_files" ]; then
        INSPECT_HASHES_FILE=$(mktemp)
        printf '%s\n' "$local_secret_files" \
            | while IFS= read -r f; do [ -n "$f" ] && $HASH_CMD "$f"; done \
            | awk '{print $1}' | sort -u > "$INSPECT_HASHES_FILE"
        [ -s "$INSPECT_HASHES_FILE" ] || { rm -f "$INSPECT_HASHES_FILE"; INSPECT_HASHES_FILE=""; }
    fi

    # docker save → per-layer tar. Fail closed if the oracle is unavailable.
    INSPECT_SAVE_DIR=$(mktemp -d)
    if ! docker save "$image" 2>/dev/null | tar -xf - -C "$INSPECT_SAVE_DIR" 2>/dev/null; then
        echo "Error: docker save failed for $image — the image secret oracle is unavailable,"
        echo "       so this gate FAILS CLOSED rather than reporting 'passed'."
        exit 1
    fi

    local name_hits="" content_hits="" layers_scanned=0
    local blob first_char nh ch
    while IFS= read -r blob; do
        [ -f "$blob" ] || continue
        # `tar -tf` is the layer discriminator. A blob we cannot read as a tar but that
        # begins with `{`/`[` is JSON metadata (config/manifest) and is skipped — any
        # OTHER unreadable blob FAILS CLOSED (we must not silently skip a real layer).
        if ! tar -tf "$blob" >/dev/null 2>&1; then
            first_char=$(head -c1 "$blob" 2>/dev/null || true)
            case "$first_char" in "{" | "[") continue ;; esac
            echo "Error: layer blob '$blob' is not readable as a tar and is not JSON metadata."
            echo "       FAILING CLOSED — cannot observe this layer's bytes."
            exit 1
        fi
        layers_scanned=$((layers_scanned + 1))
        INSPECT_LAYER_DIR=$(mktemp -d)
        tar -xf "$blob" -C "$INSPECT_LAYER_DIR" 2>/dev/null || true
        chmod -R u+rwX "$INSPECT_LAYER_DIR" 2>/dev/null || true

        # NAME scan: a secret-named file present in this layer (size>0 ignores 0-byte
        # whiteout markers for files deleted in a later layer). Exclude example/sample/template.
        nh=$(find "$INSPECT_LAYER_DIR" -type f \( -name ".env" -o -name ".env.*" \
                -o -name "*.secret" -o -name "*.pem" -o -name "id_rsa*" \
                -o -name "id_ed25519*" -o -name "*.key" \) \
            ! -name "*.example" ! -name "*.sample" ! -name "*.template" -size +0c -print 2>/dev/null \
            | sed "s|$INSPECT_LAYER_DIR||" || true)
        [ -n "$nh" ] && name_hits="${name_hits}${nh}
"

        # CONTENT scan over ALL files (incl node_modules), uncapped — only if we have
        # local secret hashes to match against.
        if [ -n "$INSPECT_HASHES_FILE" ]; then
            ch=$(find "$INSPECT_LAYER_DIR" -type f -size +0c -exec $HASH_CMD {} + 2>/dev/null \
                | awk 'FNR==NR { if ($1 != "") want[$1]=1; next } ($1 in want) { print }' \
                    "$INSPECT_HASHES_FILE" - \
                | sed "s|$INSPECT_LAYER_DIR||" || true)
            [ -n "$ch" ] && content_hits="${content_hits}${ch}
"
        fi

        rm -rf "$INSPECT_LAYER_DIR"; INSPECT_LAYER_DIR=""
    done < <(find "$INSPECT_SAVE_DIR" -type f \( -name 'layer.tar' -o -path '*/blobs/sha256/*' \))

    rm -rf "$INSPECT_SAVE_DIR"; INSPECT_SAVE_DIR=""
    [ -n "$INSPECT_HASHES_FILE" ] && { rm -f "$INSPECT_HASHES_FILE"; INSPECT_HASHES_FILE=""; }

    if [ "$layers_scanned" -eq 0 ]; then
        echo "Error: found no readable layer blobs in the saved image — FAILING CLOSED"
        echo "       (unexpected docker save format?)."
        exit 1
    fi

    if [ -n "$name_hits" ] || [ -n "$content_hits" ]; then
        echo "Error: secret material is baked into image $image:"
        if [ -n "$name_hits" ]; then
            echo "  Secret-named files in image layers:"
            printf '%s' "$name_hits" | sed '/^$/d; s/^/    /'
        fi
        if [ -n "$content_hits" ]; then
            echo "  Files whose bytes match a local secret:"
            printf '%s' "$content_hits" | sed '/^$/d; s/^/    /'
        fi
        echo "Refusing the secret-boundary gate — push must not proceed."
        exit 1
    fi

    echo "Per-layer byte scan passed: no local secret bytes or secret-named files in any layer."
}

echo "Checking Docker secret boundary..."

# Dockerfile heuristic: WARN-ONLY advisory (never blocks). The byte scan is the oracle.
copy_add_advisory "$DOCKERFILE"

# .dockerignore literal assertions remain BLOCKING — the documented 0th layer.
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

if [ -n "$INSPECT_IMAGE" ]; then
    echo "Inspecting image $INSPECT_IMAGE for baked-in secrets (authoritative byte scan)..."
    inspect_image_bytes "$INSPECT_IMAGE"
fi

echo "Docker secret boundary check passed."
