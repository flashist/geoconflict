# Coder handoff — `s4-profile-04e1` (build-deploy-profile.sh)

**Source:** stateful review of PR #119 (branch `s4-profile-04e1-build-push-diges` vs `dev`),
two reviewers (Claude `code-reviewer` + Codex adversarial). Findings verified against the
actual code before being written here — treat them as inputs to confirm, not orders.

**File to change:** `build-deploy-profile.sh` (the only file). Do **not** touch the review
tooling, the ledger, or `package.json`.

**What the script is:** the LOCAL build/push/digest half of the profile deploy (task T4e1).
It builds `Dockerfile.profile` for `linux/amd64`, pushes the `profile-<sha>` tag, resolves an
immutable `@sha256` digest from the built image ID (fail-closed), and re-verifies that digest
in the registry. It contacts **no VPS** — the transport/deploy half is stubbed and lands in
T4e3. Keep that boundary intact: do not add SSH/SCP/remote logic.

---

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| C | Low–medium (robustness) | **Yes** | L135–136 | Replace the regex digest match with exact string matching |
| A | Low (defect) | **Yes** | L97–104 | Clean up the `mktemp` temp file via `trap` so it doesn't leak on build failure |
| B | Trivial (clarity) | **Yes** | L55–59 | Add a one-line comment documenting the deliberate secret preflight |
| D | Low (hardening) | Optional | L13 | Optionally add `set -o pipefail` (only if you also audit the `\|\| true` usages) |

---

### C — Exact-match the registry digest instead of interpolating into a regex  *(required)*

**Raised by both reviewers.** Current code (L135–136):

```bash
PROFILE_DIGEST=$(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$BUILT_IMAGE_ID" \
    | grep -E "^${DOCKER_USERNAME}/${DOCKER_REPO}@sha256:[0-9a-f]{64}$" | head -1 || true)
```

**Problem:** `DOCKER_USERNAME` / `DOCKER_REPO` are interpolated **unescaped** into an extended
regex. Docker repository names legally contain `.` (and a registry prefix like `ghcr.io/org`
contains several), and in ERE `.` matches *any* character. If `BUILT_IMAGE_ID` ever carries
more than one `RepoDigests` entry, `head -1` could select a digest line belonging to a
*different* repository whose name happens to match the loosened pattern.

**Honest impact (don't over-state it):** this is **not** a wrong-content risk. The digest `D`
is content-addressed — every `RepoDigests` entry for `BUILT_IMAGE_ID` carries the same `D`
(the manifest digest of the built bytes), so even a wrong *repo prefix* pins identical content,
and a non-match simply falls through to the existing fail-closed `[ -z "$PROFILE_DIGEST" ]`
guard at L138. In the normal flow (build once → push to one repo) there is exactly one
`RepoDigests` entry and no ambiguity at all. So this is a **robustness fix**, not an
emergency — but two independent reviewers flagged the same line, the fix is clean, and it
deletes the entire class of regex-metacharacter fragility.

**Recommended fix** — parse each `RepoDigest`, compare the repo prefix with **exact shell
string equality**, validate the `sha256:` suffix separately:

```bash
# Resolve from the built image ID, never a tag. Match the repo prefix by exact string
# equality (NOT a regex) so a '.' or other metachar in DOCKER_REPO can't loosen the match,
# then validate the digest suffix. Fail closed if no canonical digest resolves.
EXPECTED_REPO="${DOCKER_USERNAME}/${DOCKER_REPO}"
PROFILE_DIGEST=""
while IFS= read -r repo_digest; do
    [ -n "$repo_digest" ] || continue
    repo_name="${repo_digest%@*}"   # everything before the single '@'  → the repo
    digest="${repo_digest#*@}"       # everything after  the single '@'  → sha256:<hex>
    if [ "$repo_name" = "$EXPECTED_REPO" ] \
        && printf '%s' "$digest" | grep -Eq '^sha256:[0-9a-f]{64}$'; then
        PROFILE_DIGEST="$repo_digest"
        break
    fi
done < <(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$BUILT_IMAGE_ID")
```

Notes for the implementer:
- A `RepoDigests` entry has exactly one `@`, so `%@*` / `#*@` split it cleanly (repo names
  contain no `@`; a registry host + optional `:port` stays in the repo half).
- This **preserves the original matching set**: the old regex was anchored `^…@sha256:…$`,
  so it only matched entries with no extra registry-host prefix — exact equality against
  `${DOCKER_USERNAME}/${DOCKER_REPO}` keeps that behavior and still fails closed otherwise.
- The `< <(...)` process substitution requires bash — the script is already `#!/bin/bash`.
- Leave the downstream guards (L138 empty-check, L150 `imagetools inspect` registry-presence
  check) exactly as they are; they remain the fail-closed backstops.

---

### A — Don't leak the `mktemp` IIDFILE on build failure  *(required)*

Current code (L97–104):

```bash
IIDFILE=$(mktemp)

print_header "BUILDING PROFILE IMAGE (linux/amd64): ${PROFILE_IMAGE}"
docker buildx build --platform linux/amd64 --load \
    -f "$DOCKERFILE" -t "$PROFILE_IMAGE" --iidfile "$IIDFILE" .

BUILT_IMAGE_ID=$(cat "$IIDFILE")
rm -f "$IIDFILE"
```

**Problem:** under `set -e` (L13), if `docker buildx build` fails the script exits immediately
and the `rm -f "$IIDFILE"` at L104 never runs — the temp file leaks into `/tmp`. Low impact
(the OS eventually reclaims `/tmp`), but it's a real, standard hygiene bug.

**Recommended fix** — register a `trap` right after `mktemp`, then drop the manual `rm`:

```bash
IIDFILE=$(mktemp)
trap 'rm -f "$IIDFILE"' EXIT
```

…and remove the `rm -f "$IIDFILE"` line at L104. The `EXIT` trap fires on success, on `exit N`,
and on `set -e` abort, so cleanup is covered on every path.

---

### B — Document the build-time secret preflight as deliberate  *(required, comment-only)*

Current code (L55–59):

```bash
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "Error: POSTGRES_PASSWORD is not set."
    echo "Set it in .env.profile.secret before deploying."
    exit 1
fi
```

**Context:** `POSTGRES_PASSWORD` is a **runtime** DB secret — it is *not* a build input
(`Dockerfile.profile` has no `ARG POSTGRES_PASSWORD`; it's injected at container start). Gating
the *build* on it is intentional fail-fast preflight for the whole T4e1+T4e3 pipeline, but
that intent isn't obvious and risks being dropped when T4e3 lands.

**Decision (from the maintainer): keep the gate, add a clarifying comment.** Do **not** remove
or move it. Add one comment line above it, e.g.:

```bash
# Whole-pipeline preflight (intentional): POSTGRES_PASSWORD is a RUNTIME secret, not a build
# input — validated here to fail fast before build/push rather than after, so T4e3's deploy
# can't be blocked late by a missing secret. Keep this when T4e3 un-stubs the transport stage.
```

---

### D — `set -o pipefail`  *(optional hardening — only if done carefully)*

L13 uses `set -e` without `set -o pipefail`. This is **not** a defect today: the only
pipe-in-substitution (the digest resolution) is guarded by `|| true` plus the empty-string
check, so no failure is silently swallowed. Adding `set -o pipefail` is idiomatic belt-and-
suspenders, **but** if you add it you must re-audit every `|| true` / pipeline in the script
(including the rewritten C block and the `echo "$DOCKER_TOKEN" | docker login` pipe) to ensure
nothing newly aborts. If in doubt, **leave it out** — it's optional and low value here.

---

## Do NOT change (settled tradeoffs — re-introducing these is review-loop churn)

These were deliberately decided over prior review rounds; leave them as-is:

1. **Shared durable push tag** (`docker tag BUILT_IMAGE_ID … && docker push` of the durable
   `profile-<sha>` tag). Do **not** add a per-run staging tag — it was tried and removed
   (accumulates remote tags, violates the registry retention policy). The residual tag→push
   race is liveness-only and fails closed at digest resolution + the registry-presence check.
2. **Dirty worktree = warn + record, not fail-closed** (L87–93). Keep the `-dirty` tag suffix
   + warning + recorded SHA. Do **not** make a dirty build abort.
3. **No bash test harness.** No deploy script in this repo has automated tests; do not add a
   test framework for this one.
4. **docker-socket peer not defended.** Out of threat model; the digest + registry-presence
   checks make the worst case a fail-closed build, never a wrong artifact.

---

## Validation (no test harness exists — these are the checks to run)

- `bash -n build-deploy-profile.sh` — syntax check (must pass).
- `shellcheck build-deploy-profile.sh` if available — should be clean for the changed lines
  (the C rewrite in particular removes the dynamic-regex smell).
- Reason through the digest path by hand: a single-entry `RepoDigests` still resolves; a
  no-match still hits the L138 fail-closed branch; the L150 registry-presence check is
  unchanged.
- Do **not** run the script end-to-end as part of this change (it pushes a real image and
  needs registry creds) unless you have a throwaway registry to point it at.

## Acceptance criteria

- [ ] C: digest resolution uses exact repo-prefix string matching + separate `sha256:` suffix
      validation; no shell variable is interpolated into a regex pattern. Fail-closed behavior
      (L138 empty-check, L150 registry-presence check) preserved.
- [ ] A: `IIDFILE` cleaned up via `trap … EXIT`; the manual `rm -f` at L104 removed; no temp
      file leaks on a failed build.
- [ ] B: the `POSTGRES_PASSWORD` gate is unchanged in behavior and now carries the
      preflight-intent comment.
- [ ] D: either omitted, or `pipefail` added *with* the `|| true`/pipeline audit done.
- [ ] None of the four settled tradeoffs above were altered.
- [ ] `bash -n` passes; no new VPS/transport logic added (T4e3 stub boundary intact).
