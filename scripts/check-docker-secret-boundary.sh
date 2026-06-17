#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKERFILE="$ROOT_DIR/Dockerfile"
DOCKERFILE_PROFILE="$ROOT_DIR/Dockerfile.profile"
DOCKERIGNORE="$ROOT_DIR/.dockerignore"
RUNTIME_IMAGE_CHECK=false
TEMP_IMAGE_TAG="geoconflict-secret-boundary-check:$(date +%s)-$$"
# Temp dirs used by the --inspect-image layer scan. Initialized empty up front so the EXIT
# trap can reference them under `set -u` even if it fires before they are created, and so any
# fail-closed `exit` mid-scan still removes the extracted image bytes.
INSPECT_SAVE_DIR=""
INSPECT_LAYER_DIR=""

cleanup() {
    if [ "$RUNTIME_IMAGE_CHECK" = true ] && command -v docker >/dev/null 2>&1; then
        docker image rm -f "$TEMP_IMAGE_TAG" >/dev/null 2>&1 || true
    fi
    [ -n "$INSPECT_SAVE_DIR" ] && rm -rf "$INSPECT_SAVE_DIR" 2>/dev/null || true
    [ -n "$INSPECT_LAYER_DIR" ] && rm -rf "$INSPECT_LAYER_DIR" 2>/dev/null || true
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

# Fail closed on a non-default Dockerfile `escape` parser directive. Docker's
# `# escape=` directive changes the line-continuation character; the broad-copy scanner
# below joins ONLY backslash continuations, so under `# escape=\`` (backtick) a
# backtick-continued `COPY \`<newline>`. /app` would be joined by Docker into a broad
# `COPY . /app` yet slip past this parser. Linux images never need a non-default escape,
# so reject it outright rather than model an alternate continuation char.
#
# `escape` is honored ONLY inside the leading PARSER-DIRECTIVE BLOCK: the contiguous run
# of `# name=value`-shaped lines at the very top of the file. We model that STRUCTURE
# instead of enumerating directive names — BuildKit (parser/directives.go) keeps scanning
# the block past EVERY line matching `^#\s*[A-Za-z][A-Za-z0-9]*\s*=\s*.+` (syntax, check,
# escape, future, and even unknown names — those just warn), and ends the block only at
# the first line that is NOT directive-shaped. Enumerating names is what let `# check=`
# (and any unknown `# foo=bar`) before `# escape=\`` bypass an earlier version of this
# guard. So: stay in the block for any directive-shaped line, reject the moment we see a
# non-default `escape`. Prints the offending value and exits 2 on rejection.
assert_default_escape() {
    awk '
    /^[ \t]*#[ \t]*[A-Za-z][A-Za-z0-9]*[ \t]*=/ {
        name = $0; sub(/^[ \t]*#[ \t]*/, "", name); sub(/[ \t]*=.*/, "", name)
        if (tolower(name) == "escape") {
            val = $0
            sub(/^[ \t]*#[ \t]*[A-Za-z][A-Za-z0-9]*[ \t]*=[ \t]*/, "", val)
            sub(/[ \t]*$/, "", val)
            if (val != "\\") { print val; exit 2 }   # non-default escape -> reject
        }
        next   # any directive-shaped line stays in the leading block; do not enumerate names
    }
    { exit 0 }   # first non-directive-shaped line ends the parser-directive block
    ' "$1"
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
#   - ARG/ENV-expanded source:       ARG SRC=. ; COPY $SRC /app   (rejected fail-closed:
#                                    a $variable source can expand to the whole context)
# A `.`/`./` in the LAST (destination) position is legitimate (copy specific sources
# into WORKDIR) and must NOT be flagged: `COPY package*.json ./`, `COPY a b .`,
# `COPY --from=stage /x .`. So we parse the operands and flag `.`/`./` anywhere
# EXCEPT the final destination. A regex only ever sees the first operand, which is
# why the original grep missed multi-source broad copies.
scan_broad_copies() {
    awk '
    # Normalize a COPY/ADD path the way Docker (filepath.Clean) does — enough to tell
    # whether it resolves to the build-context root. Returns "." for context-root
    # sources however they are spelled: ".", "./", "./.", "././", ".//.", "foo/..".
    # A literal "== . || == ./" check (the previous form) missed every normalized
    # variant, all of which still copy the whole context.
    function clean_path(p,   n, parts, i, c, k, out, res) {
        n = split(p, parts, "/"); k = 0
        for (i = 1; i <= n; i++) {
            c = parts[i]
            if (c == "" || c == ".") continue
            if (c == "..") { if (k > 0 && out[k] != "..") k--; else out[++k] = ".." }
            else out[++k] = c
        }
        if (k == 0) return "."
        res = out[1]
        for (i = 2; i <= k; i++) res = res "/" out[i]
        return res
    }
    # Skip the BODY of a RUN-style heredoc: its lines are shell data, not Dockerfile
    # instructions, so a body line like `COPY . /app` must never be parsed or flagged. State
    # is set when a previous line opened a heredoc and cleared at its terminator (`<<-` allows
    # a tab-indented terminator). Runs FIRST so body lines never reach the parser below.
    heredoc_term != "" {
        hline = $0
        if (heredoc_dash) sub(/^[ \t]+/, "", hline)
        if (hline == heredoc_term) { heredoc_term = ""; heredoc_dash = 0 }
        next
    }
    # A comment is never an instruction and is NEVER continued by Docker (line-continuation
    # is not honored inside comments). Skip it BEFORE the continuation-join below so a
    # `# foo \` line cannot swallow the next real instruction — the reported bypass
    # (`# foo \` <newline> `COPY . /app`, which Docker still builds as a broad copy).
    /^[ \t]*#/ { next }
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
        # so parse an UPPERCASED working copy. Source operands are only ever normalized
        # by clean_path and compared to the context root; ".", "..", "/" are all
        # case-invariant, so uppercasing is safe; the original (joined) line is printed.
        work = toupper(cur)
        sub(/^[[:space:]]+/, "", work)
        if (work !~ /^(COPY|ADD)[[:space:]]/) {
            # Not a COPY/ADD. If this line OPENS a heredoc (e.g. `RUN <<EOF`), begin skipping
            # its body so the contents are never mis-parsed as instructions. Capture the
            # terminator word (forms: <<WORD, <<-WORD, <<"WORD", <<'"'"'WORD'"'"').
            if (match(cur, /<<-?[ \t]*["'"'"']?[A-Za-z_][A-Za-z0-9_]*/)) {
                term = substr(cur, RSTART, RLENGTH)
                heredoc_dash = (substr(term, 1, 3) == "<<-") ? 1 : 0
                sub(/^<<-?[ \t]*["'"'"']?/, "", term)
                heredoc_term = term
            }
            next
        }
        # A heredoc-form COPY/ADD (`COPY <<FILE … `) is a construct we do NOT model — reject
        # it fail-closed rather than risk parsing its operands wrong.
        if (cur ~ /<</) {
            printf "%s:%d: %s\n", FILENAME, start, cur
            found = 1
            next
        }
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
            # Flag any SOURCE (all but the last) that normalizes to the context root,
            # OR contains an unresolved $variable (fail closed): Docker expands ARG/ENV
            # in COPY/ADD, so e.g. `ARG SRC=.` + `COPY $SRC /app` copies the whole
            # context; we cannot statically prove a $-source is safe, so reject it.
            for (i = 1; i < n; i++) {
                if (clean_path(elems[i]) == "." || elems[i] ~ /\$/) bad = 1
            }
        } else {
            # Shell form: whitespace-separated operands; the last is the destination.
            # Same rule: flag a context-root source or any $variable source (fail closed).
            m = split(work, ops, /[[:space:]]+/)
            for (i = 1; i < m; i++) {
                if (clean_path(ops[i]) == "." || ops[i] ~ /\$/) bad = 1
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
    if ! bad_escape=$(assert_default_escape "$df"); then
        echo "Error: $df sets a non-default Dockerfile escape directive (# escape=$bad_escape)."
        echo "A non-backslash escape changes line-continuation, which the broad-COPY scanner"
        echo "does not model — a continuation-hidden 'COPY . /app' could package .env/secret"
        echo "files. Remove the '# escape=' directive (Linux images use the default backslash)."
        exit 1
    fi
    if ! broad_matches=$(scan_broad_copies "$df"); then
        echo "Error: $df contains a broad or unverifiable COPY/ADD source — a '.'/'./' path"
        echo "that resolves to the build-context root, or a \$variable source (ARG/ENV can"
        echo "expand to the whole context):"
        echo "$broad_matches"
        echo "Use explicit literal allowlist copies instead (e.g. COPY package*.json ./)."
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

    # AUTHORITATIVE secret-boundary gate (doctrine Class B): observe the image BYTES, not the
    # Dockerfile, and observe them PER LAYER. A secret COPY'd in one layer and `rm`'d in a later
    # one is whiteout'd from the runtime filesystem (a `docker run`/flattened-rootfs view) yet
    # still rides in the earlier layer's bytes and is fully recoverable from the pushed image. So
    # we `docker save` the image and scan EVERY layer tar's contents, not the final filesystem.
    # This also needs no `docker run`, so it never depends on the image being executable on the
    # host (e.g. an amd64 image inspected on an arm64 dev box). Two detectors, applied per layer:
    #   (1) by CONTENT (authoritative, false-positive-free): the EXACT bytes of the repo's real
    #       local secret/key files (.env*, *.secret, *.pem, id_rsa*, id_ed25519*, *.key) matched
    #       by sha256 in ANY layer — so a real secret that rode in under a renamed/innocuous path,
    #       OR was deleted in a later layer, is still caught;
    #   (2) by NAME (supplementary): a file that LOOKS like our secret by name (.env/.env.*/
    #       *.secret) or a committed .git dir — in any layer, EXCEPT third-party node_modules. We
    #       exclude node_modules and do NOT name-match *.pem/id_rsa* here on purpose: base images
    #       and dependencies legitimately ship CA bundles, test certs and example env files, so
    #       name-matching those would FAIL every deploy (a false positive). Novel/renamed key
    #       material is still caught by content above.
    echo "Inspecting image $INSPECT_IMAGE for env/secret material (all layers via docker save)..."

    # Content-detector input: hash the repo's REAL local secret/key files (size-capped, portable
    # host hasher for Linux CI / macOS dev). The hashes are passed to awk via a FILE (two-input
    # form), NEVER `-v`: a `-v` value with embedded newlines (multiple local secret files — the
    # normal case) is rejected by awk.
    HASH_CMD="sha256sum"
    command -v sha256sum >/dev/null 2>&1 || HASH_CMD="shasum -a 256"
    local_secret_files=$(find "$ROOT_DIR" -maxdepth 1 -type f \
        \( -name ".env" -o -name ".env.*" -o -name "*.secret" -o -name "*.pem" \
        -o -name "id_rsa*" -o -name "id_ed25519*" -o -name "*.key" \) \
        ! -name "*.example" ! -name "*.sample" ! -name "*.template" -size +0c 2>/dev/null)
    local_hashes_file=""
    if [ -n "$local_secret_files" ]; then
        local_hashes_file=$(mktemp)
        printf '%s\n' "$local_secret_files" \
            | while IFS= read -r f; do [ -n "$f" ] && $HASH_CMD "$f"; done \
            | awk '{print $1}' | sort -u > "$local_hashes_file"
        [ -s "$local_hashes_file" ] || { rm -f "$local_hashes_file"; local_hashes_file=""; }
    fi

    # Export the image archive (manifest + per-layer tars) and extract it. FAIL CLOSED if docker
    # ITSELF fails (daemon down, image missing, OOM): an unavailable oracle must abort the deploy,
    # never read as "no secrets found". `pipefail` (set at the top) makes this pipeline fail if
    # `docker save` fails even though `tar` succeeds.
    INSPECT_SAVE_DIR=$(mktemp -d)
    if ! docker save "$INSPECT_IMAGE" | tar -xf - -C "$INSPECT_SAVE_DIR" 2>/dev/null; then
        echo "Error: docker save failed for $INSPECT_IMAGE — the image secret oracle is"
        echo "       unavailable, so this gate FAILS CLOSED rather than reporting 'passed'."
        [ -n "$local_hashes_file" ] && rm -f "$local_hashes_file"
        exit 1
    fi

    name_hits=""
    git_hits=""
    content_hits=""
    layers_scanned=0
    # Enumerate layer PAYLOAD blobs across both archive formats: legacy `<id>/layer.tar` and OCI
    # `blobs/sha256/<hash>`. The OCI blobs dir also holds config/manifest/index JSON; those start
    # with '{' or '[' and are skipped. Anything else is a layer payload that tar MUST be able to
    # read (it auto-detects gzip/zstd on GNU and BSD tar); if it cannot, we FAIL CLOSED rather
    # than silently skip a layer — a skipped layer is a fail-OPEN hole.
    while IFS= read -r blob; do
        [ -f "$blob" ] || continue
        # `tar -tf` is the PRIMARY discriminator: a layer is anything tar can read (it
        # auto-detects gzip/zstd on GNU and BSD tar). Only a blob tar CANNOT read may be a JSON
        # metadata blob (config/manifest/index) — those start with '{' or '[' and are skipped.
        # Checking the first char BEFORE tar would fail-OPEN on a real layer whose first entry
        # filename happens to start with '{'/'[' (e.g. a `COPY '[x].key' /` regression). Any
        # other unreadable blob FAILS CLOSED rather than silently skip a layer.
        if ! tar -tf "$blob" >/dev/null 2>&1; then
            first_char=$(head -c1 "$blob" 2>/dev/null || true)
            case "$first_char" in
                "{" | "[") continue ;;   # JSON metadata blob (config/manifest/index), not a layer
            esac
            echo "Error: a layer blob in $INSPECT_IMAGE is not readable as a tar"
            echo "       ($blob — unsupported compression?). FAILING CLOSED rather than skip a layer."
            rm -rf "$INSPECT_SAVE_DIR"; INSPECT_SAVE_DIR=""
            [ -n "$local_hashes_file" ] && rm -f "$local_hashes_file"
            exit 1
        fi
        layers_scanned=$((layers_scanned + 1))
        INSPECT_LAYER_DIR=$(mktemp -d)
        # Extract the layer. Device/special entries may warn under a non-root user — regular
        # files still extract and the scans below only read those, so ignore tar's exit. Then
        # force readability on everything we extracted, so a hostile dir mode (e.g. 000) inside
        # the layer can't make `find` skip its contents (a fail-OPEN hole).
        tar -xf "$blob" -C "$INSPECT_LAYER_DIR" 2>/dev/null || true
        chmod -R u+rwX "$INSPECT_LAYER_DIR" 2>/dev/null || true
        # NAME scan (prune node_modules; whiteout markers `.wh.*` never match these patterns).
        nh=$(find "$INSPECT_LAYER_DIR" \( -path '*/node_modules/*' \) -prune -o -type f \
            \( -name '.env' -o -name '.env.*' -o -name '*.secret' \) \
            ! -name '*.example' ! -name '*.sample' ! -name '*.template' -print 2>/dev/null \
            | sed "s|^$INSPECT_LAYER_DIR||" || true)
        [ -n "$nh" ] && name_hits="${name_hits}${nh}
"
        gh=$(find "$INSPECT_LAYER_DIR" \( -path '*/node_modules/*' \) -prune -o \
            -type d -name '.git' -print 2>/dev/null \
            | sed "s|^$INSPECT_LAYER_DIR||" || true)
        [ -n "$gh" ] && git_hits="${git_hits}${gh}
"
        # CONTENT scan over ALL files (incl node_modules), size-capped, only if we have hashes.
        # `find -exec … +` (not `xargs`) so a layer with no matching files runs nothing — portably
        # avoiding GNU xargs' "run once on empty input" (which would hang $HASH_CMD on stdin).
        if [ -n "$local_hashes_file" ]; then
            ch=$(find "$INSPECT_LAYER_DIR" -type f -size +0c -size -1048576c \
                -exec $HASH_CMD {} + 2>/dev/null \
                | awk 'FNR==NR { if ($1 != "") want[$1] = 1; next } ($1 in want) { print }' \
                    "$local_hashes_file" - \
                | sed "s|$INSPECT_LAYER_DIR||" || true)
            [ -n "$ch" ] && content_hits="${content_hits}${ch}
"
        fi
        rm -rf "$INSPECT_LAYER_DIR"; INSPECT_LAYER_DIR=""
    done < <(find "$INSPECT_SAVE_DIR" -type f \( -name 'layer.tar' -o -path '*/blobs/sha256/*' \))

    rm -rf "$INSPECT_SAVE_DIR"; INSPECT_SAVE_DIR=""
    [ -n "$local_hashes_file" ] && rm -f "$local_hashes_file"

    # Defensive: if the archive format changed so that we matched ZERO layer blobs, do NOT report
    # "clean" — that would be a silent fail-open. Abort.
    if [ "$layers_scanned" -eq 0 ]; then
        echo "Error: found no layer blobs in the $INSPECT_IMAGE archive, so the image cannot be"
        echo "       certified secret-free — FAILING CLOSED (unexpected docker save format?)."
        exit 1
    fi

    if [ -n "$name_hits" ] || [ -n "$git_hits" ] || [ -n "$content_hits" ]; then
        echo "Error: image $INSPECT_IMAGE contains env/secret material (in one or more layers):"
        [ -n "$name_hits" ] && { echo "  by filename:"; printf '%s' "$name_hits" | grep -v '^$' | sort -u; }
        [ -n "$git_hits" ] && { echo "  .git directory:"; printf '%s' "$git_hits" | grep -v '^$' | sort -u; }
        [ -n "$content_hits" ] && { echo "  by content (matches a local secret/key):"; printf '%s' "$content_hits" | grep -v '^$' | sort -u; }
        exit 1
    fi

    echo "Image secret inspection passed (all-layer name + content scan via docker save)."
fi

echo "Docker secret boundary check passed."
