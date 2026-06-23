# Coder handoff — s4-profile-04f (R2: harden the build.sh build→scan→push splice)

> **This is a SPEC, not an applied change.** It came out of the **Round-2** stateful review
> (`ai-agents/reviews/s4-profile-04f.md`). The R1 fixes (C1/A1/A2/Cov1/Cov2) are **already applied and
> verified** — do NOT redo them. This handoff covers only the **two new edges** that R1's C1 fix
> introduced in `build.sh`. Verify each claim against the code before editing (CLAUDE.md Review Notes).

## Context

T4f added a per-layer secret **byte scan** as the blocking gate before `docker push`. R1's C1 fix
(owner option (c)) wired that scan into the **main game-image** path `build.sh` by splitting the old
fused `docker buildx build … --push` into:

```
docker buildx build … -t "$DOCKER_IMAGE" --iidfile "$IIDFILE" --load .   # build LOCALLY
BUILT_IMAGE_ID=$(cat "$IIDFILE")                                          # (build.sh:141)
./scripts/check-docker-secret-boundary.sh --inspect-image "$BUILT_IMAGE_ID"   # scan (build.sh:151)
docker push "$DOCKER_IMAGE"                                               # publish (build.sh:154)
```

This is net-positive (the game image is now scanned at all), and mirrors `build-deploy-profile.sh`.
But the splice has **two new edges** that the profile sibling already closes and `build.sh` does not.
The profile sibling (`build-deploy-profile.sh`) is the reference implementation: it re-binds the tag
to the scanned ID right before push (`:169`) and deploys by an `@sha256` digest resolved from
`BUILT_IMAGE_ID` and validated in the registry (`:185-210`).

**In scope:** the `build.sh` push-path splice (R2-1, R2-2) + an optional defense-in-depth guard in the
shared gate. **Out of scope:** the R1 fixes (done); adding full digest-pinned *deploy* to the game
image (a larger separate item — the game deploy doesn't pin digests today); anything in the Accepted
residuals (below).

## Changes to make

| severity | required? | location | summary |
|----------|-----------|----------|---------|
| medium | **required** | `build.sh:~151-154` | R2-1 — re-bind tag to the scanned ID + assert before `docker push` (close the scan→push TOCTOU). |
| low | **required** | `build.sh:~141`; `build-deploy-profile.sh:~139` | R2-2 — guard empty `BUILT_IMAGE_ID` (fail-closed instead of silently skipping the scan). |
| low | optional | `scripts/check-docker-secret-boundary.sh` (arg parse, `--inspect-image`) | R2-2 belt-and-suspenders — gate fails closed on an empty `--inspect-image` value. |

---

### R2-1 — scan-ID vs push-tag TOCTOU  *(required, medium)*

- **Where:** `build.sh` — the scan is on `$BUILT_IMAGE_ID` (`:151`) but the publish pushes the mutable
  tag `$DOCKER_IMAGE` (`:154`) with nothing in between:

  ```bash
  ./scripts/check-docker-secret-boundary.sh --inspect-image "$BUILT_IMAGE_ID"

  print_header "PUSHING DOCKER IMAGE: ${DOCKER_IMAGE}"
  docker push "$DOCKER_IMAGE"
  ```

- **Problem:** if anything retags `$DOCKER_IMAGE` to a different image between the `--load` and the
  `docker push`, the push publishes **unscanned** bytes — the scan verified image A, the registry gets
  image B.
- **Honest impact:** **Medium, not high.** Realistic exposure on a single-host sequential
  `build-deploy.sh` run is **low** (the script owns the tag; no concurrent retagger; `VERSION_TAG` is
  caller-supplied). Net protection still *increased* vs the old unscanned `--push`. But the profile
  sibling closes this exact window cheaply, and `build.sh` should match it — the asymmetry is the
  defect, not a live leak.
- **Recommended fix** — re-bind the tag to the scanned ID and assert equality immediately before push
  (mirrors `build-deploy-profile.sh:169`, plus the assert the profile path's digest-resolution
  effectively provides):

  ```bash
  ./scripts/check-docker-secret-boundary.sh --inspect-image "$BUILT_IMAGE_ID"

  # Re-bind the tag to the EXACT image we scanned, then verify nothing diverted it, so we
  # publish the scanned bytes and not a concurrently-retagged image (mirrors
  # build-deploy-profile.sh's re-tag-before-push). `docker push` can only target NAME[:TAG],
  # not an image ID, so this re-bind + assert is the closest we get to pushing the ID itself.
  docker tag "$BUILT_IMAGE_ID" "$DOCKER_IMAGE"
  TAG_ID=$(docker inspect --format '{{.Id}}' "$DOCKER_IMAGE")
  if [ "$TAG_ID" != "$BUILT_IMAGE_ID" ]; then
      echo "Error: '$DOCKER_IMAGE' resolves to $TAG_ID, not the scanned $BUILT_IMAGE_ID — refusing to push."
      exit 1
  fi

  print_header "PUSHING DOCKER IMAGE: ${DOCKER_IMAGE}"
  docker push "$DOCKER_IMAGE"
  ```

  (`set -e` is active in `build.sh:7`, so the `docker tag`/`docker inspect` failing also aborts the
  push. Do NOT attempt full `@sha256`-pinned *deploy* of the game image here — that's the larger
  out-of-scope item.)

---

### R2-2 — empty `BUILT_IMAGE_ID` silently skips the scan (fail-OPEN)  *(required, low)*

- **Where:** `build.sh:141` (and the identical pre-existing pattern at `build-deploy-profile.sh:139`):

  ```bash
  BUILT_IMAGE_ID=$(cat "$IIDFILE")
  rm -f "$IIDFILE"
  ```

- **Problem:** if `$IIDFILE` is empty after the build, `cat` returns **rc 0** (it's an empty *existing*
  file, not a failure — verified: `v=$(cat empty); echo $?` → `0`, no `set -e` abort), so
  `BUILT_IMAGE_ID` is `""`. The gate is then called as `--inspect-image ""`, which sets
  `INSPECT_IMAGE=""`; the gate's `if [ -n "$INSPECT_IMAGE" ]` guard (`check-docker-secret-boundary.sh`,
  ~`:255`) is false, so the **byte scan is silently skipped** and the push proceeds **unscanned** —
  a fail-open in a security gate.
- **Honest impact:** **Low.** buildx reliably writes the image ID to `--iidfile` on a successful
  `--load`, so an empty-on-success iidfile is near-impossible; this is defense-in-depth. But the fix is
  one line and the failure mode is "push without scanning," so it's worth closing.
- **Recommended fix** — fail closed on an empty ID right after the `cat`, in **both** scripts:

  ```bash
  BUILT_IMAGE_ID=$(cat "$IIDFILE")
  rm -f "$IIDFILE"
  if [ -z "$BUILT_IMAGE_ID" ]; then
      echo "Error: --iidfile was empty after build — cannot identify the image to scan. Aborting (fail closed)."
      exit 1
  fi
  ```

  Apply the same guard at `build-deploy-profile.sh:139-140` (same pattern, same risk; keeps the two
  push paths consistent).

- **Optional belt-and-suspenders (gate-side, low):** make the shared gate fail closed on an empty
  `--inspect-image` value rather than silently skipping — in the arg parser
  (`scripts/check-docker-secret-boundary.sh`, the `--inspect-image)` case), after
  `INSPECT_IMAGE="$1"`:

  ```bash
  [ -n "$INSPECT_IMAGE" ] || { echo "Error: --inspect-image was given an empty image ID."; exit 1; }
  ```

  This closes the fail-open at the oracle itself (so any caller that passes an empty ID fails closed),
  not just at `build.sh`. (Note: the **no-`--inspect-image`-at-all** static-lint path — `package.json:27`
  — must still skip the byte scan; only an *explicitly-passed but empty* value should error. The parser
  only runs this check when the `--inspect-image` flag was actually seen, so the static path is
  unaffected.)

---

### R2-3 — `--metadata-file` no longer carries the registry digest under `--load`  *(note-only, no change)*

- With `--push`, `--metadata-file` (`build.sh:134`) captured `containerimage.digest`; with `--load` it
  does not (nothing is pushed yet). **Verified benign:** `build-deploy.sh` calls `build.sh` with 2 args,
  so `METADATA_FILE` defaults to a throwaway `/tmp/build-metadata-$RANDOM.json` and `deploy.sh` reads no
  digest/metadata. **No change required.** If a future caller starts extracting `containerimage.digest`
  from this file, it must resolve the digest *post-push* (e.g. `docker inspect --format '{{.RepoDigests}}'`),
  not from the `--load` metadata.

## Do NOT change (accepted residuals — settled across R1/R2; re-introducing churn is wrong)

- **Do NOT revert the option-(c) split** (`build --load --iidfile` → scan → `docker push`). It is the
  approved C1 fix; the byte scan must run on the built bytes before publish.
- **Do NOT extend the `copy_add_advisory` parser** or make the advisory blocking on the byte-scan path
  (RC3 — the byte scan is the oracle; the advisory is a frozen warn-only ~30-line heuristic).
- **Do NOT weaken the gate's fail-closed behavior** (docker-save failure / unreadable non-JSON blob /
  zero layers all exit non-zero) or the JSON-metadata skip.
- **Do NOT remove** the `example`/`sample`/`template` exclusions, the `-size +0c` whiteout handling, or
  the R1 A1/A2 warn-and-continue behavior (those are the verified R1 fixes).
- **Do NOT** try to make this gate catch a secret **hardcoded into a benign-named source file**
  (`src/**/*.ts`, `resources/*.json`) — that is **out of this gate's charter** (a repo/PR
  secret-scanner concern, pre-dates T4f), per the Accepted residuals.
- **Do NOT** add full `@sha256`-pinned *deploy* to the game image in this change — out of scope (R2-1's
  fix is the tag re-bind + assert, not a deploy-pinning overhaul).

## Validation + acceptance criteria

- **Syntax:** `bash -n build.sh`, `bash -n build-deploy-profile.sh`, and
  `bash -n scripts/check-docker-secret-boundary.sh` must stay clean.
- **Test harness:** `bash scripts/test-check-docker-secret-boundary.sh` still **10/10** (the gate-side
  optional guard must not break the existing `--inspect-image <id>` cases; the static-lint path with no
  `--inspect-image` must still pass).
- **R2-1 acceptance:** after the scan, `$DOCKER_IMAGE` is re-bound to `$BUILT_IMAGE_ID` and the assert
  passes on the happy path; if `docker inspect '{{.Id}}'` of the tag ≠ the scanned ID, the script
  **aborts before push**. (No box needed — reason it through / dry-run with a local image.)
- **R2-2 acceptance:** with a forced-empty `IIDFILE` (e.g. `: > "$IIDFILE"` before the `cat` in a
  scratch copy), `build.sh` **exits non-zero before the scan/push**, and the gate-side optional guard
  makes `check-docker-secret-boundary.sh --inspect-image ""` exit non-zero (was: silently "passed").
- **No deploy/box needed** — all validation is local (`bash -n` + the Docker test harness on the dev host).
- **Test-harness caveat:** there is no bash harness for `build.sh`/`build-deploy-profile.sh` themselves
  (accepted residual) — validate those two by `bash -n` + the manual empty-`IIDFILE` reproduction.
