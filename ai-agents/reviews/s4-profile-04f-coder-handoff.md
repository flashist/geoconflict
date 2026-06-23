# Coder handoff — s4-profile-04f (image secret-boundary byte-scan gate)

> **This is a SPEC, not an applied change.** It came out of a stateful review
> (`ai-agents/reviews/s4-profile-04f.md`). Every other reviewer finding was verified as an
> intentional design or a non-defect and must NOT be touched (see **Do NOT change**). Verify each
> claim against the code before editing (CLAUDE.md Review Notes) — it has already been verified once,
> but confirm. **All changes in `src/core/` must be tested; these are shell scripts — validate per
> the test harness + `bash -n` (see Validation).**

## Context

This task (T4f) added an **authoritative per-layer byte scan** as the secret-boundary gate for the
**profile** deploy and **demoted** the old Dockerfile COPY/ADD heuristic to a frozen warn-only
advisory (postmortem RC3: teaching the lexer construct N just creates construct N+1; the byte scan
observes the *real bytes* of every layer via `docker save`).

The scanner `scripts/check-docker-secret-boundary.sh` is **shared by two callers**:

1. **`build-deploy-profile.sh:142-148`** — the *profile* path. Invokes the gate with
   `--inspect-image "$BUILT_IMAGE_ID" --dockerfile "$DOCKERFILE"` → the per-layer **byte scan is the
   blocking oracle**, so the COPY/ADD advisory being warn-only there is correct and intended.
2. **`build.sh:110`** — the *main game-image* path. Invokes the gate with `--runtime-image-check`
   **only** (no `--inspect-image`), then `docker buildx … --push` (`build.sh:127`). It **never runs
   the byte scan.**

The regression: on `dev`, the scanner had a **blocking** broad-copy guard that ran on *every*
invocation (`if grep -nE '…(COPY|ADD)… \. \.$' "$DOCKERFILE"; then echo "broad repo copy"; exit 1; fi`).
T4f replaced that with the warn-only advisory for **all** callers — so `build.sh` lost its hard guard
and got no byte-scan replacement.

**In scope:** restore a blocking broad-copy guard for the no-`--inspect-image` (legacy) path (C1),
plus low-severity robustness/coverage polish in the same two files (A1/A2/Cov1/Cov2).
**Out of scope:** everything else in both scripts; the advisory parser must NOT be extended for new
Dockerfile constructs (RC3 rule); wiring the full byte scan into `build.sh` is a larger separate item.

## Changes to make

| severity | required? | location | summary |
|----------|-----------|----------|---------|
| medium | **required** | `scripts/check-docker-secret-boundary.sh:~208` | C1 — restore a BLOCKING broad-copy check when no `--inspect-image` oracle is supplied. |
| medium | **required** | `scripts/test-check-docker-secret-boundary.sh` (new case) | C1 — regression test: broad `COPY . .` blocks on the no-`--inspect-image` path. |
| low | recommended | `scripts/check-docker-secret-boundary.sh:120-126` | A1 — clear, fail-soft error when a local secret file can't be hashed. |
| low | recommended | `scripts/check-docker-secret-boundary.sh:167-174` | A2 — warn (don't silently pass) when the content-scan pipeline errors. |
| low | optional | `scripts/test-check-docker-secret-boundary.sh` (new case) | Cov1 — exercise the content-scan path with a synthesized fixture (no real local secret needed). |
| low | optional | `scripts/test-check-docker-secret-boundary.sh` (new case) | Cov2 — positive name-scan-only test (a file literally named `.env`). |

---

### C1 — broad-copy guard demoted for the legacy (`build.sh`) push path  *(required, medium)*

- **Where:** `scripts/check-docker-secret-boundary.sh`, the static-checks block. Currently
  (`:205-216`):

  ```bash
  echo "Checking Docker secret boundary..."

  # Dockerfile heuristic: WARN-ONLY advisory (never blocks). The byte scan is the oracle.
  copy_add_advisory "$DOCKERFILE"

  # .dockerignore literal assertions remain BLOCKING — the documented 0th layer.
  require_literal_line ".env"
  ...
  ```

- **Problem:** `build.sh:110` calls this script with no `--inspect-image`, so `INSPECT_IMAGE` is
  empty and the byte scan (`inspect_image_bytes`, the only blocking secret oracle) never runs. The
  COPY/ADD check is now warn-only, so a future `COPY . .` regression in the main `Dockerfile` would
  no longer block the pushed game image.
- **Honest impact:** **Medium, not "no-ship"** (Codex rated it high). **No active exposure today** —
  the current `Dockerfile` uses explicit allowlist copies (`COPY src ./src`, etc.), so the old regex
  matches nothing now; this is loss of a *guardrail against a future regression*. `build.sh` still
  has two blocking defenses (`.dockerignore` literal assertions + `--runtime-image-check`), but they
  have gaps: `.dockerignore` excludes only `.env`/`.env.*` (not `*.pem`/`*.key`/`id_rsa`), and the
  runtime-check inspects only the `runtime-source` stage for `.env*`/`*.secret`.
- **Recommended fix** — gate the blocking guard on the *absence* of the byte-scan oracle, reusing
  `dev`'s exact regex for behavior parity (zero new false-positives). Insert immediately **after**
  `copy_add_advisory "$DOCKERFILE"`:

  ```bash
  # When no byte-scan oracle is supplied (legacy callers, e.g. build.sh's
  # --runtime-image-check path), the broad-copy check stays BLOCKING — it is the only
  # structural secret guard on that path. With --inspect-image the per-layer byte scan is
  # the oracle, so the advisory above stays warn-only (RC3: don't grow the lexer as a gate).
  if [ -z "$INSPECT_IMAGE" ]; then
      if grep -nE '^[[:space:]]*(COPY|ADD)([[:space:]]+--from=[^[:space:]]+)?[[:space:]]+(\./?|\.)[[:space:]]+(\./?|\.)[[:space:]]*$' "$DOCKERFILE"; then
          echo "Error: Dockerfile contains a broad repo copy. Use explicit allowlist copies instead."
          exit 1
      fi
  fi
  ```

  - Why this regex (not the broader `copy_add_advisory` patterns): it is `dev`'s **exact** guard, so
    the legacy path's behavior is restored 1:1 with no risk of newly blocking constructs the old
    guard allowed. (Do **not** make `copy_add_advisory` itself blocking — that would both violate the
    RC3 freeze on the byte-scan path and risk new false-positives.)
  - On the profile path (`--inspect-image` set), this block is skipped → advisory warn-only + byte
    scan blocks: **current behavior preserved, no double-gating.**
- **Regression test** (required) — add to `scripts/test-check-docker-secret-boundary.sh`:

  ```bash
  # ── Case 6: legacy path (no --inspect-image) still BLOCKS a broad COPY . . ──────
  cat > "$WORK/Dockerfile.broadcopy" <<'EOF'
  FROM scratch
  COPY . .
  EOF
  assert_exit nonzero "broad COPY . . blocks when no --inspect-image oracle is supplied" -- \
      bash "$GATE" --dockerfile "$WORK/Dockerfile.broadcopy"
  ```

  (No docker needed for this case — the static checks read the real `.dockerignore`, which already
  has the 4 required literal lines.)

---

### A1 — opaque abort / silent hash-drop on an unreadable local secret file  *(recommended, low)*

- **Where:** `scripts/check-docker-secret-boundary.sh:120-126` (the wanted-set hash step):

  ```bash
  printf '%s\n' "$local_secret_files" \
      | while IFS= read -r f; do [ -n "$f" ] && $HASH_CMD "$f"; done \
      | awk '{print $1}' | sort -u > "$INSPECT_HASHES_FILE"
  ```

- **Problem:** under `set -euo pipefail`, if `$HASH_CMD "$f"` fails (e.g. a local secret file
  unreadable by the running user), the operator sees a raw `shasum: …: Permission denied` with **no
  gate context**, and the script either **aborts opaquely** (if it's the last file → pipeline non-zero
  → `set -e`) or **silently drops** that file's hash from the wanted-set (otherwise). Non-deterministic.
- **Honest impact:** **Low.** The profile image builds **locally as the repo owner**, so local secret
  files are normally readable; this is a CI/foreign-user robustness nit. Fail-closed-ish either way
  (name scan still catches by name), but the message is non-actionable.
- **Recommended fix** — keep the hash on stdout (so it flows to `awk`), route a clear warning to
  stderr, and let the `if` consume the failure so the pipe stage doesn't die:

  ```bash
  printf '%s\n' "$local_secret_files" \
      | while IFS= read -r f; do
          [ -n "$f" ] || continue
          if ! $HASH_CMD "$f" 2>/dev/null; then
              echo "Warning: cannot read local secret '$f' to hash it — its bytes won't be" >&2
              echo "         content-matched in the image (the name scan still applies)." >&2
          fi
        done \
      | awk '{print $1}' | sort -u > "$INSPECT_HASHES_FILE"
  ```

  (Graceful degradation is appropriate here because the **name scan is an independent backstop**. If
  the owner prefers strict fail-closed instead, replace the warning body with an
  `echo "Error: … FAILING CLOSED" >&2; exit 1` — but warn-and-continue is the lower-friction choice
  and was the intent recorded in the ledger.)

---

### A2 — content-scan pipeline failure silently treated as "clean"  *(recommended, low)*

- **Where:** `scripts/check-docker-secret-boundary.sh:167-174` (`|| true` at `:171`):

  ```bash
  if [ -n "$INSPECT_HASHES_FILE" ]; then
      ch=$(find "$INSPECT_LAYER_DIR" -type f -size +0c -exec $HASH_CMD {} + 2>/dev/null \
          | awk 'FNR==NR { if ($1 != "") want[$1]=1; next } ($1 in want) { print }' \
              "$INSPECT_HASHES_FILE" - \
          | sed "s|$INSPECT_LAYER_DIR||" || true)
      [ -n "$ch" ] && content_hits="${content_hits}${ch}
  "
  fi
  ```

- **Problem:** the `|| true` swallows *any* failure of the find→awk→sed pipeline, so a content scan
  that errored produces an empty `ch` and the gate can still report "Per-layer byte scan passed".
- **Honest impact:** **Low** (the review *downgraded* this from medium). Failure modes are remote
  (`find` errors are already `2>/dev/null`; `awk`/`sed` don't fail on valid input), and it's
  defense-in-depth (name scan + `.dockerignore` + runtime-check remain). **Note:** the reviewer's
  claim that the *name* scan lacks `|| true` is **wrong** — `:161` has it too; only fix the content
  scan as below (leave the name scan as-is, or apply the same pattern for symmetry).
- **Recommended fix** — capture the status and warn on non-zero (name scan stays active):

  ```bash
  if [ -n "$INSPECT_HASHES_FILE" ]; then
      if ! ch=$(find "$INSPECT_LAYER_DIR" -type f -size +0c -exec $HASH_CMD {} + 2>/dev/null \
          | awk 'FNR==NR { if ($1 != "") want[$1]=1; next } ($1 in want) { print }' \
              "$INSPECT_HASHES_FILE" -); then
          echo "Warning: content scan of layer '$blob' hit errors; name scan still active." >&2
      fi
      ch=$(printf '%s' "$ch" | sed "s|$INSPECT_LAYER_DIR||")
      [ -n "$ch" ] && content_hits="${content_hits}${ch}
  "
  fi
  ```

  (The `sed` is split out so its trivial success doesn't mask a real find/awk failure. `if !` keeps
  `set -e` from aborting on the captured non-zero.)

---

### Cov1 — content-scan path untested on a clean checkout  *(optional, low)*

- **Where:** `scripts/test-check-docker-secret-boundary.sh:69-89` (Case 1). It SKIPs when no real
  local secret file exists, so the novel `awk FNR==NR` content-scan join is never exercised in
  ephemeral CI.
- **Fix approach:** synthesize a deterministic fixture under `ROOT_DIR` (the gate derives `ROOT_DIR`
  from its own `BASH_SOURCE`, so it can't be overridden by env — the fixture must physically live in
  the repo tree and match a secret-name pattern), embed its bytes (renamed, in a subdir) in a
  throwaway image, and assert non-zero. **Critical: register the fixture for cleanup so it never
  leaks into the repo** — extend the harness `cleanup()` trap. Sketch:

  ```bash
  FIXTURE="$ROOT_DIR/.env.__t4f_fixture__.secret"   # matches the .env.* name pattern
  printf 'T4F_FIXTURE_SECRET=%s\n' "deterministic-bytes" > "$FIXTURE"
  # add `rm -f "$FIXTURE"` to cleanup() so it is removed on every exit path
  mkdir -p "$WORK/synth/sub"
  cp "$FIXTURE" "$WORK/synth/sub/renamed_blob"
  cat > "$WORK/synth/Dockerfile" <<'EOF'
  FROM scratch
  COPY sub/renamed_blob /opt/data/blob
  EOF
  SYNTH_ID=$(build_img "$WORK/synth") || { echo "FAIL: could not build synth image"; exit 1; }
  assert_exit nonzero "synthesized fixture bytes (renamed) caught by content scan" -- \
      bash "$GATE" --inspect-image "$SYNTH_ID"
  ```

  Confirm the fixture is `.dockerignore`d for normal builds (it matches `.env.*`) so it can't ride
  into a real image, and that `cleanup()` removes it even when an assertion fails.

### Cov2 — no positive name-scan-only test  *(optional, low)*

- **Fix:** add a case that copies a file literally named `.env` into an image and asserts non-zero
  (name scan alone — Case 1 renames its payload, so this path is otherwise unasserted):

  ```bash
  # ── Case 7: positive name-scan — a file named .env is caught by name alone ──────
  mkdir -p "$WORK/named"
  printf 'KEY=value\n' > "$WORK/named/.env"
  cat > "$WORK/named/Dockerfile" <<'EOF'
  FROM scratch
  COPY .env /app/.env
  EOF
  NAMED_ID=$(build_img "$WORK/named") || { echo "FAIL: could not build named image"; exit 1; }
  assert_exit nonzero "secret-named file (.env) caught by name scan alone" -- \
      bash "$GATE" --inspect-image "$NAMED_ID"
  ```

---

## Do NOT change (accepted residuals — settled in the review; re-introducing churn here is wrong)

- **Do NOT extend the `copy_add_advisory` parser** to catch new Dockerfile constructs (RC3 rule). It
  is a frozen ~30-line warn-only advisory; the byte scan is the oracle on the `--inspect-image` path.
  C1's fix is to *restore the prior narrow blocking regex for the legacy path*, **not** to grow the
  advisory.
- **Do NOT make the advisory blocking on the byte-scan (`--inspect-image`) path.** The byte scan is
  the sole exit-determining oracle there by design.
- **Do NOT weaken the fail-closed behavior** of `inspect_image_bytes` (docker-save failure /
  unreadable non-JSON blob / zero layers all exit non-zero) or the JSON-metadata skip
  (`first_char` is `{`/`[`).
- **Do NOT remove** the `example`/`sample`/`template` exclusions, the `-size +0c` whiteout handling,
  or the `$HASH_CMD` two-word (`shasum -a 256`) word-splitting in `find -exec`.
- **Do NOT "fix"** the `tar -xf … || true` partial-extraction tolerance (`:152`) or the
  `dirname "$0"` call (`build-deploy-profile.sh:148`) — both verified as accepted/non-defects.
- **Do NOT add** `set -e` to the test harness — it intentionally omits it (several cases assert a
  deliberate non-zero exit).

## Validation + acceptance criteria

- **Syntax:** `bash -n scripts/check-docker-secret-boundary.sh` and
  `bash -n scripts/test-check-docker-secret-boundary.sh` must stay clean.
- **Test harness:** `bash scripts/test-check-docker-secret-boundary.sh` — all existing cases plus the
  new Case 6 (and optional Cov1/Cov2) pass. Requires a running Docker daemon (the harness SKIPs
  cleanly without one). After the run, confirm the Cov1 fixture file is gone (`git status` clean).
- **C1 acceptance:**
  - `bash scripts/check-docker-secret-boundary.sh --dockerfile <a Dockerfile with `COPY . .`>` exits
    **non-zero** (legacy path blocks again).
  - `bash scripts/check-docker-secret-boundary.sh --inspect-image <clean image> --dockerfile <same
    broad Dockerfile>` still exits **0** (byte-scan path: advisory warns, never blocks — unchanged).
  - `bash build.sh` on the *current* (allowlist) `Dockerfile` is **unaffected** (the regex matches
    nothing today).
- **A1/A2:** no behavior change on the happy path; only the error/warning text and failure-handling
  improve. Re-run the harness to confirm no regression.
- **No box / no deploy needed** for any of this — all validation is local (`bash -n` + the Docker
  test harness on the dev host).
