# Review ledger — s4-profile-04f

Task: `ai-agents/tasks/backlog/s4-profile-04f-image-secret-scan.md`
File(s) under review (PR #123, branch `s4-profile-04f-image-secret-scan` vs `dev`):
- `scripts/check-docker-secret-boundary.sh` — extended ~68→244 lines: adds the authoritative
  per-layer byte scan (`inspect_image_bytes`) and demotes the Dockerfile COPY/ADD heuristic to a
  frozen warn-only advisory (`copy_add_advisory`).
- `build-deploy-profile.sh` — inserts the byte-scan gate on `BUILT_IMAGE_ID` before `docker push` (`:142-148`).
- `scripts/test-check-docker-secret-boundary.sh` — new 157-line bash test harness.

Status: **in-review (R1 — stateful-review).** The T4f profile-path design is **correct**: the
per-layer byte scan is wired as the sole blocking oracle before push, fails closed on all three
unobservable cases, and the advisory is genuinely exit-neutral (the intended RC3 frontier-move —
recorded as an accepted residual below). **One confirmed cross-path regression (C1, medium)** and
**two low robustness nits (A1, A2)** + **two test-coverage gaps (Cov1, Cov2)** are routed to fix
in this PR (per owner decision 2026-06-23). **No active secret exposure today** — the main
`Dockerfile` uses explicit allowlist copies; C1 is loss of a *guardrail against a future*
broad-copy regression, not a live leak.

Reviewers (R1, stateful-review): **Claude `code-reviewer`** (review-only) + **Codex adversarial**
(`--base dev --scope branch`) — **both ran, full coverage.** Findings were **complementary, not
overlapping**: Codex found the cross-path regression (C1) by auditing *other* callers of the shared
script; Claude found the in-file robustness/coverage items (A1/A2/Cov1/Cov2). No dedupe collisions.

## Accepted residuals (do-not-re-litigate)

- **Byte scan is the SOLE blocking oracle; the COPY/ADD advisory is warn-only on the byte-scan
  path** — What: on the profile path (invoked with `--inspect-image`), `copy_add_advisory`
  (`:75-96`) only prints a warning and **never** changes the exit code (`return 0` at `:95`); the
  per-layer byte scan (`inspect_image_bytes`, `:104-203`) is the only exit-determining secret
  oracle. Why (structural): postmortem **RC3** — teaching the Dockerfile lexer construct N only
  creates construct N+1, so the lexer is unwinnable as a gate; the byte scan observes the *real
  bytes* of every layer via `docker save` (catching a secret regardless of path/rename/subdir/
  later-deletion), with `.dockerignore` as the documented 0th layer. The advisory is **frozen at
  ~30 lines and must NOT be extended** for any new Dockerfile construct (round-N+1 parser fixes are
  out of scope by rule). Re-raise only if: the advisory is proposed to *block* on the byte-scan
  path, or a reviewer asks to extend the advisory parser to a new construct (both are closeout, not
  defects). **NOTE:** this residual is scoped to the `--inspect-image` (byte-scan) path. The
  *absence* of a blocking guard on the **no-`--inspect-image`** path (`build.sh`) is a separate,
  unintended regression — see **C1** (open, to fix), not covered by this residual.
- **Fail-closed on unobservable layers** — What: `inspect_image_bytes` exits non-zero (refusing the
  push) if `docker save` fails (`:130-134`), a non-JSON layer blob is unreadable as a tar
  (`:143-149`), or zero layers are found (`:182-186`), rather than reporting "passed". Why
  (structural): an oracle that cannot observe the bytes must not emit a false negative; fail-closed
  is the only safe default for a secret gate. The JSON-metadata skip (`first_char` is `{`/`[`,
  `:144-145`) correctly distinguishes config/manifest blobs from layer tars; any *other* unreadable
  blob fails closed. Re-raise only if: a real layer blob is shown to be silently skipped (would be a
  defect), or a legitimate metadata blob is shown to wrongly fail closed.
- **example/sample/template excluded; content scan needs local secrets to match** — What: the
  wanted-set and name scan exclude `*.example`/`*.sample`/`*.template` (`:119`,`:160`); the
  content scan runs only when local secret hashes exist (`:167`). Why (structural): example files
  are *meant* to ship; the threat is a *real local* secret baked in, so with no local secrets there
  is nothing to content-match (the name scan still runs). Re-raise only if: an example-named file is
  shown to carry real secret bytes that should be caught (would argue for content-scanning examples
  too).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | (**Codex**, *high "no-ship"*) Demoting the broad-COPY guard to warn-only in the **shared** scanner also disarms it for `build.sh` — the main game-image path calls `check-docker-secret-boundary.sh --runtime-image-check` (no `--inspect-image`, `build.sh:110`) then `buildx … --push` (`build.sh:127`), and never runs the new byte scan. A future `COPY . .` regression in the main `Dockerfile` would no longer block the pushed game image. (`scripts/check-docker-secret-boundary.sh:207-208`) | **CORRECT → defect, severity high→medium** | **Open #C1 (fix in this PR).** Verified: `dev` had a *blocking* `grep -nE '…(COPY\|ADD)… \. \.$' \|\| exit 1` guard that ran on every invocation; T4f replaced it with the warn-only advisory for *all* callers. Downgraded from "no-ship": **no active exposure** (current `Dockerfile` uses allowlist copies — old regex matches nothing today), and `build.sh` retains two blocking defenses (`.dockerignore` literal assertions + `--runtime-image-check`). But the gap is real: `.dockerignore` excludes only `.env`/`.env.*` (not `*.pem`/`*.key`/`id_rsa`), and the runtime-check is stage-limited (runtime-source only) + name-limited. **Fix:** restore a blocking broad-copy check for callers *without* `--inspect-image`; keep advisory-only where the byte scan is the oracle. |
| 1 | (**Claude**, *medium*) Wanted-set hash pipeline (`:122-124`) under `set -euo pipefail`: an unreadable local secret file makes `$HASH_CMD` fail → either an opaque abort (raw `shasum: … Permission denied`, no gate context) if it's the last file, or a silent drop of that hash from `want[]` otherwise. | **PARTIALLY CORRECT → low (defect, minor)** | **Open #A1 (polish).** Direction is fail-closed-ish (abort) or graceful-degrade (name scan still catches by name), but the error is non-actionable and the abort/drop is non-deterministic. Low impact: the profile image builds **locally as the repo owner** (memory `project_profile_deploy`), so local secret files are normally readable. **Fix:** emit a clear gate-context message (and either `2>/dev/null`-skip with a warning, or explicitly fail closed with context). |
| 1 | (**Claude**, *medium*) Content-scan `\| sed … \|\| true` (`:167-174`, `\|\| true` at `:171`) silently treats *any* pipeline failure as "no hit" → the gate can report "Per-layer byte scan passed" even if the content scan errored on every layer. | **PARTIALLY CORRECT → low (frontier-ish)** | **Open #A2 (polish).** Substance is true but over-rated: failure modes are remote (find errors already `2>/dev/null`; awk/sed don't fail on valid input), and it's defense-in-depth (name scan + `.dockerignore` + runtime-check remain). **Claude's justification has a factual error** — it claims the name scan lacks `\|\| true`, but `:161` has it too. **Fix:** capture the pipeline status and `echo` a warning on non-zero (name scan stays active). |
| 1 | (**Claude**, *low*) Case 1 (`test-…:69-89`) SKIPs when the repo has no local secret file, so the novel `awk FNR==NR` content-scan join is **untested on a clean CI checkout**. | **CORRECT → low (coverage gap)** | **Open #Cov1 (test polish).** Real gap: the content scan vacuously passes (SKIP) exactly where it'd matter (ephemeral CI). **Fix:** synthesize a known-hash fixture and register it as a local secret (e.g. temporary `ROOT_DIR` override) so the content-scan path runs unconditionally. |
| 1 | (**Claude**, *low*) No *positive* name-scan test — Case 1 renames the payload to `renamed_payload` (exercises content scan); Case 3 is the *negative* name test (`.env.example` passes). Name-scan detection alone is never asserted. | **CORRECT → low (coverage gap)** | **Open #Cov2 (test polish).** **Fix:** add a 3-line case — build an image that copies a file literally named `.env`, assert non-zero exit (name scan alone). |
| 1 | (**Claude**, *low*) `tar -xf "$blob" … \|\| true` (`:152`) silently tolerates partial extraction (scan runs on whatever extracted). | **CORRECT → low (frontier-move)** | **Accepted (no action).** Requires a transient I/O failure *after* a successful `tar -tf` listing (`:143`) — acceptably unlikely; the `\|\| true` intentionally avoids aborting on benign extraction noise. |
| 1 | (**Claude**, *low/info*) `dirname "$0"` (`build-deploy-profile.sh:148`) is relative-path-fragile. | **CORRECT → non-defect** | **No action.** Safe — the script never `cd`s before the call; `${BASH_SOURCE[0]}` would be marginally more robust but is not required. |
| 1 | (**both, verified non-findings**) fail-closed actually triggers on `docker save` failure under `pipefail` (`:130`); `exit 1` inside `while … done < <(find …)` truly aborts (process-substitution, not a pipe-subshell); all temp dirs/files cleaned by the EXIT trap on every path; `$HASH_CMD` word-splitting in `find -exec $HASH_CMD {} +` works for two-word `shasum -a 256`; the `set -e` gate hook in `build-deploy-profile.sh` blocks the push on non-zero. | **CONFIRMED — no defect** | Independently re-verified during this review. No action. |

**No oscillation / no loop:** first review of this slice (fresh ledger). The intended RC3
frontier-move (demote the lexer to warn-only on the byte-scan path) is correct and is recorded as a
residual, **not** flagged as a defect — the defect (C1) is that the demotion happened in a *shared*
script and silently changed an *out-of-scope* path (`build.sh`) that has no byte-scan backstop.
Stateless severity-inflation again (Codex "high/no-ship" → medium; Claude two "medium" → low),
collapsed at the verify gate against the actual code (current `Dockerfile` clean; remaining
defenses enumerated).

## Open / actionable

- **#C1 (medium — fix in this PR).** Restore a blocking broad-copy guard for callers **without**
  `--inspect-image` (i.e. `build.sh`'s `--runtime-image-check` path), so the main game-image push
  keeps the hard guard `dev` had; keep `copy_add_advisory` warn-only where the byte scan is the
  oracle (`--inspect-image`). Add a regression test for the no-`--inspect-image` + broad-`COPY`
  path. **See `ai-agents/reviews/s4-profile-04f-coder-handoff.md`.**
- **#A1 (low — polish).** Give the wanted-set hash step (`:120-126`) a clear gate-context error;
  skip-with-warning or fail-closed-with-context on an unreadable local secret file.
- **#A2 (low — polish).** Warn (don't silently pass) when the content-scan pipeline (`:167-174`)
  exits non-zero; name scan stays active.
- **#Cov1 (low — test).** Exercise the content-scan path unconditionally via a synthesized
  known-hash fixture (don't depend on a real local secret existing).
- **#Cov2 (low — test).** Add a positive name-scan-only case (a file literally named `.env`).

## Forward notes (for downstream tasks)

- C1 is the *narrow* fix (restore the prior guard for the legacy path). The *broader* question —
  whether `build.sh` (main game image) should get the full per-layer **byte scan** that the profile
  path now has — is a larger, separate hardening item (T4g-adjacent), not required for T4f. If
  pursued, wire `check-docker-secret-boundary.sh --inspect-image "$BUILT_ID"` into `build.sh` after
  the buildx build, mirroring `build-deploy-profile.sh:142-148`.
- The same shared scanner is referenced by `package.json:27` (`check:docker-secret-boundary`); any
  signature change to legacy-mode blocking must stay compatible with that npm entry.
