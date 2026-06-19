#!/bin/bash
# Print env-style key names from one or more files without printing values.

set -euo pipefail

if [ "$#" -eq 0 ]; then
    for candidate in .env .env.dev .env.prod .env.staging .env.telemetry example.env example.env.telemetry; do
        if [ -f "$candidate" ]; then
            set -- "$@" "$candidate"
        fi
    done
fi

if [ "$#" -eq 0 ]; then
    echo "No env files found. Pass file paths explicitly." >&2
    exit 1
fi

for file in "$@"; do
    if [ ! -f "$file" ]; then
        echo "== $file (missing) =="
        echo
        continue
    fi

    echo "== $file =="
    awk -F= '
        /^[[:space:]]*#/ { next }
        /^[[:space:]]*$/ { next }
        /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=/ {
            key = $1
            sub(/^[[:space:]]+/, "", key)
            sub(/[[:space:]]+$/, "", key)
            print key
        }
    ' "$file" | sort -u
    echo
done
