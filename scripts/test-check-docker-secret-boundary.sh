#!/bin/bash
# Test harness for scripts/check-docker-secret-boundary.sh (T4f image secret gate).
#
# Builds tiny throwaway `FROM scratch` images (no network/base pull) and asserts the
# gate's exit code across the acceptance scenarios. Fail-closed cases that need a
# broken `docker save` use a PATH shim so the real daemon is never disturbed.
#
# Requires Docker. Run:  bash scripts/test-check-docker-secret-boundary.sh
# NOTE: NOT `set -e` — several cases assert a deliberate non-zero exit.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE="$ROOT_DIR/scripts/check-docker-secret-boundary.sh"

pass=0
fail=0
ok()  { echo "PASS: $1"; pass=$((pass + 1)); }
bad() { echo "FAIL: $1"; fail=$((fail + 1)); }

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "SKIP: Docker is not available — this test requires a running daemon."
    exit 0
fi

WORK=$(mktemp -d)
IMAGES=()
FIXTURE=""   # Cov1: a synthesized secret placed in ROOT_DIR; removed by cleanup() on any exit.
cleanup() {
    for img in "${IMAGES[@]:-}"; do
        [ -n "$img" ] && docker image rm -f "$img" >/dev/null 2>&1 || true
    done
    [ -n "$FIXTURE" ] && rm -f "$FIXTURE"
    rm -rf "$WORK"
}
trap cleanup EXIT

# build_img <context_dir> → echoes the built image ID (and tracks it for cleanup).
build_img() {
    local iid
    iid=$(docker build -q "$1") || return 1
    IMAGES+=("$iid")
    printf '%s' "$iid"
}

# assert_exit <zero|nonzero> <desc> -- <cmd...>
assert_exit() {
    local expect="$1" desc="$2"
    shift 2
    [ "${1:-}" = "--" ] && shift
    local out rc
    out=$("$@" 2>&1)
    rc=$?
    if { [ "$expect" = zero ] && [ "$rc" -eq 0 ]; } || { [ "$expect" = nonzero ] && [ "$rc" -ne 0 ]; }; then
        ok "$desc (exit $rc)"
    else
        bad "$desc (expected $expect, got exit $rc)"
        printf '%s\n' "$out" | sed 's/^/      /'
    fi
}

# ── Case 2 setup: a clean image ───────────────────────────────────────────────
mkdir -p "$WORK/clean"
printf 'this file holds no secrets\n' > "$WORK/clean/safe.txt"
cat > "$WORK/clean/Dockerfile" <<'EOF'
FROM scratch
COPY safe.txt /app/safe.txt
EOF
CLEAN_ID=$(build_img "$WORK/clean") || { echo "FAIL: could not build clean image"; exit 1; }
assert_exit zero "clean image passes" -- bash "$GATE" --inspect-image "$CLEAN_ID"

# ── Case 1: a file whose bytes equal a REAL local secret, renamed + in a subdir ─
SECRET_SRC=$(find "$ROOT_DIR" \
    -type d \( -name node_modules -o -name .git \) -prune -o \
    -type f \( -name ".env" -o -name ".env.*" -o -name "*.secret" -o -name "*.pem" \
        -o -name "id_rsa*" -o -name "id_ed25519*" -o -name "*.key" \) \
    ! -name "*.example" ! -name "*.sample" ! -name "*.template" -size +0c -print 2>/dev/null | head -n1)
if [ -n "$SECRET_SRC" ]; then
    mkdir -p "$WORK/planted/sub"
    cp "$SECRET_SRC" "$WORK/planted/sub/renamed_payload"   # bytes copied, never printed
    printf 'unrelated\n' > "$WORK/planted/keep.txt"
    cat > "$WORK/planted/Dockerfile" <<'EOF'
FROM scratch
COPY keep.txt /app/keep.txt
COPY sub/renamed_payload /opt/data/blob
EOF
    PLANTED_ID=$(build_img "$WORK/planted") || { echo "FAIL: could not build planted image"; exit 1; }
    assert_exit nonzero "planted real-secret bytes (renamed, subdir) is caught" -- \
        bash "$GATE" --inspect-image "$PLANTED_ID"
else
    echo "SKIP: no local secret file found to plant (case 1)"
fi

# ── Case 3: an example/sample/template file must NOT trip the gate ─────────────
mkdir -p "$WORK/example"
printf 'EXAMPLE_KEY=changeme\n' > "$WORK/example/.env.example"
cat > "$WORK/example/Dockerfile" <<'EOF'
FROM scratch
COPY .env.example /app/.env.example
EOF
EXAMPLE_ID=$(build_img "$WORK/example") || { echo "FAIL: could not build example image"; exit 1; }
assert_exit zero "example file does not trip the gate" -- bash "$GATE" --inspect-image "$EXAMPLE_ID"

# ── Case 4a: bogus image ID → docker save fails → fail closed ──────────────────
assert_exit nonzero "fail-closed on docker save failure (bogus image)" -- \
    bash "$GATE" --inspect-image "sha256:0000000000000000000000000000000000000000000000000000000000000000"

# ── Case 4b: unreadable non-JSON layer blob → fail closed (docker PATH shim) ───
make_shim() {  # make_shim <save_tar_path> → echoes a dir to prepend to PATH
    local save_tar="$1" shimdir
    shimdir=$(mktemp -d)
    cat > "$shimdir/docker" <<EOF
#!/bin/bash
case "\$1" in
    save) cat "$save_tar" ;;
    info) exit 0 ;;
    *)    exit 0 ;;
esac
EOF
    chmod +x "$shimdir/docker"
    printf '%s' "$shimdir"
}

mkdir -p "$WORK/badblob/blobs/sha256"
printf '\x00\x01\x02 not a tar and not json' > "$WORK/badblob/blobs/sha256/deadbeef"
tar -cf "$WORK/badblob.tar" -C "$WORK/badblob" .
SHIM_BAD=$(make_shim "$WORK/badblob.tar")
assert_exit nonzero "fail-closed on unreadable non-JSON layer blob" -- \
    env PATH="$SHIM_BAD:$PATH" bash "$GATE" --inspect-image "fake:img"

# ── Case 4c: zero layers (only JSON metadata blobs) → fail closed ──────────────
mkdir -p "$WORK/zerolayers/blobs/sha256"
printf '{"schemaVersion":2,"layers":[]}' > "$WORK/zerolayers/blobs/sha256/configjson"
tar -cf "$WORK/zerolayers.tar" -C "$WORK/zerolayers" .
SHIM_ZERO=$(make_shim "$WORK/zerolayers.tar")
assert_exit nonzero "fail-closed on zero scannable layers" -- \
    env PATH="$SHIM_ZERO:$PATH" bash "$GATE" --inspect-image "fake:img"

# ── Case 5: advisory is exit-neutral — broad COPY warns but never blocks ───────
cat > "$WORK/Dockerfile.broad" <<'EOF'
FROM scratch
COPY . .
EOF
ADVISORY_OUT=$(bash "$GATE" --inspect-image "$CLEAN_ID" --dockerfile "$WORK/Dockerfile.broad" 2>&1)
ADVISORY_RC=$?
if [ "$ADVISORY_RC" -eq 0 ]; then
    ok "advisory + clean byte scan exits 0 (advisory never blocks)"
else
    bad "advisory + clean byte scan should exit 0 (got $ADVISORY_RC)"
    printf '%s\n' "$ADVISORY_OUT" | sed 's/^/      /'
fi
if printf '%s' "$ADVISORY_OUT" | grep -q "Advisory (WARN-ONLY"; then
    ok "advisory warning is actually emitted for a broad COPY"
else
    bad "advisory warning was not emitted for a broad COPY"
fi

# ── Cov2: positive name-scan — a file literally named .env is caught by name alone ──
mkdir -p "$WORK/named"
printf 'KEY=value\n' > "$WORK/named/.env"
cat > "$WORK/named/Dockerfile" <<'EOF'
FROM scratch
COPY .env /app/.env
EOF
NAMED_ID=$(build_img "$WORK/named") || { echo "FAIL: could not build named image"; exit 1; }
assert_exit nonzero "secret-named file (.env) caught by name scan alone" -- \
    bash "$GATE" --inspect-image "$NAMED_ID"

# ── Cov1: content scan exercised UNCONDITIONALLY via a synthesized known-secret ─────
# Place a fixture in ROOT_DIR so the gate's wanted-set (which scans ROOT_DIR, derived from
# the gate's own BASH_SOURCE and not overridable by env) hashes it; then bake its bytes
# into an image under a different name + subdir, so the content-scan join must catch it
# even on a clean CI checkout with no real local secret. The fixture name matches `.env.*`,
# so .dockerignore keeps it out of any REAL build; cleanup() removes it on every exit path.
FIXTURE="$ROOT_DIR/.env.__t4f_fixture__.secret"
printf 'T4F_FIXTURE_SECRET=deterministic-bytes-do-not-use\n' > "$FIXTURE"
mkdir -p "$WORK/synth/sub"
cp "$FIXTURE" "$WORK/synth/sub/renamed_blob"
cat > "$WORK/synth/Dockerfile" <<'EOF'
FROM scratch
COPY sub/renamed_blob /opt/data/blob
EOF
SYNTH_ID=$(build_img "$WORK/synth") || { echo "FAIL: could not build synth image"; exit 1; }
assert_exit nonzero "synthesized fixture bytes (renamed) caught by content scan" -- \
    bash "$GATE" --inspect-image "$SYNTH_ID"
rm -f "$FIXTURE"; FIXTURE=""
# Safety: the fixture must not linger in the repo working tree.
if [ -f "$ROOT_DIR/.env.__t4f_fixture__.secret" ]; then
    bad "Cov1 fixture leaked (still present on disk)"
fi

echo "----------------------------------------"
echo "Passed: $pass   Failed: $fail"
[ "$fail" -eq 0 ]
