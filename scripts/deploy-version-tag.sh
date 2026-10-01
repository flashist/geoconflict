#!/bin/bash
# deploy-version-tag.sh — version names for server deploys (task 0355; reused by 0356).
#
# SOURCED, never run: functions only, no top-level side effects. build-deploy-profile.sh
# sources it; build-deploy-telemetry.sh (0356) reuses it with its own server name + pathspec.
#
# The name (owner ruling at 0355's plan gate, 2026-09-30):  <base>-<server>.<N>
#   base   = package.json's X.Y.Z with any -dev.N / -staging.N removed — the last game
#            release this tree comes from. package.json is READ, never written.
#   server = a lower-case word, e.g. "profile" → 0.0.155-profile.3
#   N      = 1 + the highest N already used for that base, across local tags, the remote's
#            tags and the deploy record's version= lines. A failed attempt is recorded, so
#            it uses up its number too: two different images can never carry one name.
#            The caller then moves N past any name the registry already holds
#            (deploy_first_free_in_registry) — a name is never overwritten there either.
#
# Every function is safe under `set -e`: each returns a status the caller tests in an
# `if`, and prints its answer on stdout. Warnings go to stderr, so a `$(…)` capture holds
# the answer only.

# The version shapes scripts/bump-version.js accepts — its own pattern, kept identical.
DEPLOY_VERSION_PATTERN='^([0-9]+)\.([0-9]+)\.([0-9]+)(-(dev|staging)\.[0-9]+)?$'

# deploy_version_base <raw package.json version> → prints X.Y.Z, or returns 1.
deploy_version_base() {
    local raw="$1"
    if [[ "$raw" =~ $DEPLOY_VERSION_PATTERN ]]; then
        printf '%s.%s.%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}"
        return 0
    fi
    return 1
}

# deploy_version_next <server> <base> <record-file> → prints <base>-<server>.<max+1>.
# An unreadable remote only warns (the local tags and the record still count); a clash
# that slips through then shows up as a failed tag push, which is warned and never forced.
deploy_version_next() {
    local server="$1" base="$2" record="$3"
    if ! [[ "$server" =~ ^[a-z]+$ ]] || ! [[ "$base" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        return 1
    fi
    local prefix="${base}-${server}."
    # Anchored, dots escaped: 0.0.1550-… and x0.0.155-… must not count for 0.0.155.
    local anchored="^${prefix//./\\.}([0-9]+)$"
    local candidates="" remote="" remote_names="" max=0 name n

    candidates=$(git tag -l "${prefix}*" 2>/dev/null) || candidates=""
    if remote=$(git ls-remote --tags origin "refs/tags/${prefix}*" 2>/dev/null); then
        # "<sha>\trefs/tags/<name>" — and "<name>^{}" peel lines for annotated tags, dropped.
        remote_names=$(printf '%s\n' "$remote" | awk '{ sub(/^refs\/tags\//, "", $2); print $2 }' | grep -v '\^{}$' || true)
        candidates="${candidates}"$'\n'"${remote_names}"
    else
        echo "Warning: could not read the remote tags (git ls-remote origin failed) —" >&2
        echo "         numbering from local tags and the deploy record only." >&2
    fi
    if [ -n "$record" ] && [ -r "$record" ]; then
        candidates="${candidates}"$'\n'"$(sed -n 's/^version=//p' "$record" 2>/dev/null || true)"
    fi

    while IFS= read -r name; do
        if [[ "$name" =~ $anchored ]]; then
            n=$((10#${BASH_REMATCH[1]}))
            [ "$n" -gt "$max" ] && max=$n
        fi
    done <<< "$candidates"
    printf '%s%s\n' "$prefix" "$((max + 1))"
}

# deploy_shipped_tree_dirty <pathspec…> → returns 0 (and prints the porcelain lines) when
# any shipped path has uncommitted or untracked changes; 1 when all are clean. Scoped on
# purpose: a note under ai-agents/ does not ship, so it must not block a deploy. A failing
# `git status` counts as DIRTY — it cannot prove the shipped files are committed.
deploy_shipped_tree_dirty() {
    local out
    if ! out=$(git status --porcelain --untracked-files=normal -- "$@" 2>/dev/null); then
        echo "(git status failed — cannot prove the shipped files are committed)"
        return 0
    fi
    if [ -n "$out" ]; then
        printf '%s\n' "$out"
        return 0
    fi
    return 1
}

# deploy_commit_on_a_remote_branch <commit> → 0 when some remote-tracking branch contains
# it. Pushing a tag on a commit the remote lacks uploads that commit too — worth a warning.
deploy_commit_on_a_remote_branch() {
    local branches
    branches=$(git branch -r --contains "$1" 2>/dev/null) || return 1
    [ -n "$branches" ]
}

# deploy_registry_tag_state <repo:tag> → prints ONE state (and always returns 0):
#   free     the registry answered "not found" for that tag — nobody holds the name
#   taken    the tag resolves to an image — it belongs to someone (never overwrite it)
#   unknown  any other answer (auth, network, …) — the caller must NOT guess; the error is
#            echoed on stderr
# Output shapes measured 2026-09-30 against Docker Hub (read-only): a missing tag prints
# "ERROR: <ref>: not found" and exits 1; no access prints "pull access denied … insufficient_scope",
# an unknown host "… no such host" — both unknown, never free. A `case` match, not a pipe: no
# pipefail/SIGPIPE surprise, and it works on macOS's bash 3.2.
deploy_registry_tag_state() {
    local out
    if out=$(docker buildx imagetools inspect "$1" 2>&1); then
        echo "taken"
        return 0
    fi
    case "$out" in
        *": not found"*|*"manifest unknown"*|*"MANIFEST_UNKNOWN"*) echo "free" ;;
        *)
            printf '%s\n' "$out" | sed 's/^/         registry: /' >&2
            echo "unknown" ;;
    esac
    return 0
}

# deploy_first_free_in_registry <repo> <name> → prints the first of <name>, <name>+1, … that the
# registry does NOT hold (at most 20 tries). A held name is skipped, never reused: it can only be
# an attempt that was pushed but never recorded (or another machine's deploy). Returns 1 when the
# registry cannot be read (never guess a name is free), 2 when 20 names in a row are held.
deploy_first_free_in_registry() {
    local repo="$1" name="$2" tries=0 state n
    while [ "$tries" -lt 20 ]; do
        state=$(deploy_registry_tag_state "${repo}:${name}")
        case "$state" in
            free)
                printf '%s\n' "$name"
                return 0 ;;
            taken)
                echo "Note: ${name} is already in the registry (an attempt that was pushed but never" >&2
                echo "      recorded, or another machine's deploy) — skipping to the next number." >&2
                n=${name##*.}
                name="${name%.*}.$((10#$n + 1))" ;;
            *)
                return 1 ;;
        esac
        tries=$((tries + 1))
    done
    return 2
}

# deploy_tag_and_push <name> <commit> <message> → prints ONE outcome:
#   pushed       annotated tag created on <commit> and pushed as refs/tags/<name>
#   push-failed  tag created locally, push failed — kept; the retry is printed (stderr)
#   tag-failed   tag not created (it already exists, or a git error) — nothing pushed
# Never -f/--force, never --tags/--follow-tags: a clash is reported, never overwritten.
deploy_tag_and_push() {
    local name="$1" commit="$2" message="$3"
    if ! git tag -a "$name" -m "$message" "$commit" >&2; then
        echo "tag-failed"
        return 0
    fi
    if ! git push origin "refs/tags/${name}" >&2; then
        echo "  The tag exists locally. Retry the push with:" >&2
        echo "    git push origin refs/tags/${name}" >&2
        echo "push-failed"
        return 0
    fi
    echo "pushed"
}
