# Review ledger — s4-profile-04f

Task: `ai-agents/tasks/done/0181-profile-04f-image-secret-scan/brief.md`
File(s) under review (PR #123, branch `s4-profile-04f-image-secret-scan` vs `dev`):
- `scripts/check-docker-secret-boundary.sh` — extended ~68→244 lines: adds the authoritative
  per-layer byte scan (`inspect_image_bytes`) and demotes the Dockerfile COPY/ADD heuristic to a
  frozen warn-only advisory (`copy_add_advisory`).
- `build-deploy-profile.sh` — inserts the byte-scan gate on `BUILT_IMAGE_ID` before `docker push` (`:142-148`).
- `scripts/test-check-docker-secret-boundary.sh` — new 157-line bash test harness.

Status: **CLOSED-OUT / ready to merge (R3 — stateful-review, two fresh reviewers, 2026-06-23).**
R3 independently re-reviewed the R2 fixes with a fresh `code-reviewer` + Codex (full coverage):
**R2-1/R2-2 verified correct** — R2-1 re-validated **empirically on this host** (Docker 28.5.1 +
containerd snapshotter: a `buildx --load --iidfile` probe gave `--iidfile` ==
`docker inspect '{{.Id}}'`, both `sha256:1c9247…`, so the assert **cannot false-positive**). R3
surfaced **no genuine new defect**: Codex re-litigated the settled C1 (npm static-lint path —
premise disproven, **no** CI/husky/lint-staged consumer) → **suppressed + residual #1 hardened**;
Claude flagged one trivial optional test (the new empty-`--inspect-image` guard) → non-blocking.
**Loop stopped.**

**Prior R2 status (history):** **RESOLVED (R2 — process-review applied + adversarially verified,
2026-06-23).** R1's five findings (C1/A1/A2/Cov1/Cov2) verified fixed. The two new edges the option-(c) splice introduced —
**R2-1** (scan-ID vs push-tag window) and **R2-2** (empty `BUILT_IMAGE_ID` → silent fail-open) —
are **fixed and verified**: R2-2 closed at the gate (`--inspect-image ""` now fails closed) and at
both callers (empty-ID guard); R2-1 closed with a re-tag + `{{.Id}}` assert before push (assert
proven format-sound: `--iidfile` under `--load` == `docker inspect '{{.Id}}'`). A **4-lens
adversarial pass** (`tasks/w533xd8aw.output`) found the fixes **sound — no new edge, no regression**
(3/4 lenses sound; the one "edge" is pre-existing + out-of-scope — see Decision log / Forward notes).
**No active secret exposure at any point.** R2-3 (metadata digest) and the provenance-attestation
loss are note-only. **Prior R1 status (history): RESOLVED** — C1 via the SUPERSET fix; A1/A2/Cov1/Cov2
applied (harness 10/10); byte-scan-over-regex rests on a 15-scenario adversarial investigation.

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
  *absence* of a blocking guard on the **no-`--inspect-image`** path was **C1 — resolved** (option (c):
  the byte scan is wired into `build.sh`'s publish path). The only remaining no-`--inspect-image`
  caller is the **manual `npm run check:docker-secret-boundary` static lint** (`package.json:27`),
  which is **non-publishing and advisory by design** — it builds/pushes nothing, so it needs no
  blocking broad-COPY guard (the byte scan on both push paths is the authoritative gate). **Re-raise
  ONLY IF** the npm script is wired into a CI/pre-merge **gate** — verified **R3** that **no such
  consumer exists** (no `.github/workflows`, husky hook, or lint-staged entry references it); even
  then the fix is to make that gate **build+inspect an image**, *not* to make the lexer blocking
  (RC3). (R3: Codex re-raised this → suppressed, premise disproven.)
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
- **A secret hardcoded into a benign-named source file is OUT OF this gate's charter** — What: a
  credential typed into `src/**/*.ts` or `resources/*.json` (no secret-shaped name, no local
  secret-file twin to hash-match) ships via the existing allowlist copies and is caught by neither
  the name scan nor the content scan (the content scan matches bytes of *local secret-named files*,
  which such a value has no twin of). Why (structural): this gate's charter is "no secret *file*
  rides in via a broad/allowlist COPY"; arbitrary source-content secret detection is an upstream
  repo/PR secret-scanner + code-review concern (gitleaks/trufflehog territory), not a per-layer
  image gate. Confirmed it **pre-dates T4f** (the removed broad-COPY lexer never read file contents
  either), so it is not a T4f regression. Re-raise only if: the project adopts image-side content
  secret-scanning as an explicit goal (then it belongs in a separate scanner, not this advisory).
- **The game deploy ships by mutable tag, not an `@sha256` digest** — What: `build.sh` re-binds +
  asserts the tag against the scanned `BUILT_IMAGE_ID` before push (`:163-168`), but then publishes a
  mutable `repo:VERSION_TAG`, and `deploy.sh`/`update.sh` re-pull that mutable tag remotely
  (`deploy.sh:209`, `update.sh:41`) with no content-addressed backstop — unlike the profile path,
  which resolves + re-verifies an `@sha256` digest from `BUILT_IMAGE_ID` and deploys by digest
  (`build-deploy-profile.sh:190-219`). Why (structural): the game deploy has **always** been
  tag-based (R2-1 did not introduce this — it *added* the pre-push assert, strictly improving things);
  giving the game image a digest-pinned deploy means threading a digest through `deploy.sh`/`update.sh`
  — a separate, larger hardening item, not part of T4f or the splice fix. Reachability is **false** in
  the real single-host-sequential flow (`VERSION_TAG` is per-second-unique, so even the shared-tag
  divert race is far less likely than the profile's shared `profile-<sha>` tag). Re-raise only if:
  digest-pinned game deploy is taken up as its own task, OR the game build/deploy becomes concurrent
  / multi-host (then the divert window becomes reachable).

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
| 1→resolved | **C1** | **superseded by owner option (c)** | Owner chose **(c)** over the narrow-regex fix. `build.sh` now builds with `--load --iidfile`, runs `check-docker-secret-boundary.sh --inspect-image "$BUILT_IMAGE_ID"` (`build.sh:116-151`), then `docker push` — splitting the old fused `build --push`. **Both** push paths (game + profile) now share the blocking byte oracle. The narrow regex was unnecessary: the only no-`--inspect-image` caller is the manual static lint (`package.json:27`), which pushes nothing. **Why the byte scan, not the regex** — a deep 15-scenario adversarial investigation (2026-06-23) found the *most-reachable* leak needs NO Dockerfile regression: a `*.pem`/`*.key`/`id_rsa*`/non-`.env` `*.secret`, or a nested `.env*`, dropped under `src/`/`resources/`/`proprietary/` ships via the EXISTING allowlist copies into the public game image **and** into the public `static/` web root (webpack `CopyPlugin` `dot:true`, `webpack.config.js:347-362`). The narrow regex would miss all of that; the byte scan (name+content, uncapped depth, all layers) catches it. Verified: METADATA_FILE is unused downstream (`build-deploy.sh:66` passes only 2 args), so splitting the push breaks no digest contract. |
| 1→resolved | **A1** | **applied** | `check-docker-secret-boundary.sh:120-131` — an unreadable local secret now warns with gate context to stderr and continues (name scan backstops); no opaque abort / non-deterministic silent drop. Verified live: unreadable file → warning emitted, clean image still exits 0. |
| 1→resolved | **A2** | **applied** | `check-docker-secret-boundary.sh:167-178` — content-scan pipeline status captured; a scan error now WARNS instead of silently passing (`\|\| true` removed, `sed` split out so its success can't mask a find/awk failure). Aligns the content scan with the gate's fail-closed contract. Happy path unchanged (9/9 shim suite + 10/10 harness). |
| 1→resolved | **Cov1** | **applied** | `test-check-docker-secret-boundary.sh` — synthesized known-hash fixture (`.env.__t4f_fixture__.secret` in ROOT_DIR, removed on every exit path + on-disk leak assert) exercises the content-scan join unconditionally, with no dependency on a real local secret. |
| 1→resolved | **Cov2** | **applied** | `test-check-docker-secret-boundary.sh` — positive name-scan-only case (a file literally named `.env`). Harness now 10/10. |
| 2 | (**R1 fixes re-verified**) C1 byte scan wired into `build.sh` (`:123-154`, `--load --iidfile` → scan → push); A1 unreadable-secret warn+continue (hash still emitted to stdout on success); A2 content-scan status captured + warn (`sed` split out, no masked hit); Cov1 synth fixture (removed on every exit + leak assert); Cov2 positive name scan | **CONFIRMED FIXED — no regression** | Re-verified against the fix diff (`e1a0ec9..HEAD`). build.sh has one trap (`:124`, nothing clobbered); `--load` valid for single `linux/amd64`; `METADATA_FILE` has no downstream digest consumer (`build-deploy.sh` passes 2 args → throwaway). No action. |
| 2 | (**Codex**, *high "needs-attention"*) `build.sh` scans `$BUILT_IMAGE_ID` (`:151`) then `docker push "$DOCKER_IMAGE"` (`:154`) with **no re-bind/digest assert between** → a concurrent retag in the scan→push window publishes unscanned bytes. The profile sibling re-tags to `BUILT_IMAGE_ID` right before push (`build-deploy-profile.sh:169`) **and** deploys by an `@sha256` digest resolved from `BUILT_IMAGE_ID` (`:185-210`); `build.sh` does neither. | **CORRECT → defect, severity high→medium** | **Open #R2-1 (fix now).** Genuinely new (a consequence of the option-(c) splice, not a re-litigation). Realistic exposure is **low** on a single-host sequential `build-deploy.sh` run (no concurrent retagger; net protection still *up* vs the old unscanned `--push`), but the asymmetry with the sibling is real and the fix is ~3 lines. **Fix:** `docker tag "$BUILT_IMAGE_ID" "$DOCKER_IMAGE"` + assert `docker inspect --format '{{.Id}}' "$DOCKER_IMAGE"` == `$BUILT_IMAGE_ID` immediately before `docker push`. |
| 2 | (**Claude**, *medium*) Empty `BUILT_IMAGE_ID` → `check-docker-secret-boundary.sh --inspect-image ""` → `INSPECT_IMAGE=""` → byte scan **silently skipped** (`:255` `if [ -n "$INSPECT_IMAGE" ]`) → push proceeds unscanned (fail-**open**). | **PARTIALLY CORRECT (mechanism imprecise) → low (defect)** | **Open #R2-2 (fix now).** Reviewer framed it as "`set -e` doesn't abort a failed `cat` cmd-sub"; the **real** reachability is that `cat` of an empty-but-existing iidfile returns **rc 0** (verified: `v=$(cat empty); echo $?` → 0, no abort), so `set -e` never fires and `BUILT_IMAGE_ID` is empty. Low reachability (buildx reliably writes the ID on a successful `--load`) but a fail-open in a security gate. **Fix:** `[ -z "$BUILT_IMAGE_ID" ] && { echo "Error: empty image ID — cannot scan"; exit 1; }` after the `cat` (same guard belongs in `build-deploy-profile.sh:139`). **Optional belt-and-suspenders:** make the gate itself fail-closed on `--inspect-image ""` rather than silently skip. |
| 2 | (**Claude**, *low*) `--push`→`--load` means `--metadata-file` (`build.sh:134`) no longer carries `containerimage.digest` (only present after a push). | **CORRECT → low (non-defect, benign)** | **Note-only (no action — owner decision).** Verified no downstream consumer: `build-deploy.sh` calls `build.sh "$ENV" "$VERSION_TAG"` (2 args) → `METADATA_FILE` defaults to a throwaway `/tmp/build-metadata-$RANDOM.json`; `deploy.sh` reads no digest/metadata. Recorded for awareness; if a future caller extracts `containerimage.digest` from this file it must resolve the digest post-push instead. |
| 2→resolved | **R2-1** | **applied** | `build.sh:163-168` — after the byte scan, re-bind `docker tag "$BUILT_IMAGE_ID" "$DOCKER_IMAGE"` + assert `docker inspect --format '{{.Id}}' "$DOCKER_IMAGE"` == `$BUILT_IMAGE_ID` before push (mirrors the profile sibling). Verified empirically that `--iidfile` under `--load` equals `{{.Id}}`, so the assert does NOT false-fail a legitimate build. Narrows the scan→tag window to sibling parity; a residual assert→push window remains (the same accepted residual the profile path documents). |
| 2→resolved | **R2-2** | **applied** | Gate-side (structural): `check-docker-secret-boundary.sh:50` now fails closed on an explicitly-empty `--inspect-image` (verified live: old behavior exited 0 without scanning; now exits 1). Caller guards: empty-`BUILT_IMAGE_ID` check in `build.sh:145-148` and `build-deploy-profile.sh:143-146`. Static-lint (no-flag) path unaffected. |
| 2→resolved | **R2-3 + provenance** | **note-only (no action)** | `--metadata-file` digest gone under `--load` (no consumer); `--load`+`docker push` also drops buildx SLSA/provenance attestations (no consumer — deploy is by tag). Recorded for awareness. |
| 2 | (**adversarial verification of the R2 fixes** — 4 lenses, `tasks/w533xd8aw.output`) splice integrity / gate-guard correctness / residual-fail-open / regression | **3/4 SOUND; 1 pre-existing out-of-scope edge** | Lenses A/B/D: **sound — no new edge, no regression** (every new failure mode fails *closed* under `set -e`; A1/A2/exclusions/profile-digest-flow byte-identical; harness 10/10; `bash -n` clean). Lens C "edge-found" = the game deploy ships by **mutable tag, no `@sha256` digest pin** (unlike profile), so a diverted push has no post-push backstop. **NOT acted on:** severity **low**, **reachable=false** (single-host sequential, per-second-unique `VERSION_TAG`), **pre-existing** (R2-1 strictly improves; mutable-tag deploy long predates T4f), **explicitly out of scope** per the R2 handoff. Recorded as a Forward note + accepted residual. |

| 3 | (**stateful-review R3 — two fresh reviewers re-confirm the R2 fixes**) R2-1 re-bind+assert (`build.sh:163-168`) and R2-2 empty-ID guards (`build.sh:145-148`, `build-deploy-profile.sh:143-146`, gate `check-docker-secret-boundary.sh:50`) | **CONFIRMED FIXED — independently re-verified** | Fresh `code-reviewer` + Codex both ran full coverage. R2-1 **empirically re-validated on the dev host** (Docker 28.5.1 + containerd snapshotter): a `buildx --load --iidfile` probe gave `--iidfile` == `docker inspect --format '{{.Id}}'` (both `sha256:1c9247…`) and `docker save <iidfile-id>` OK → the assert cannot false-positive. R2-2 guards correct in all 3 spots; `set -e` aborts a failed `docker tag`/`docker inspect` (fail-closed); no existing harness case breaks. |
| 3 | (**Codex**, *high "needs-attention"*) npm standalone `check:docker-secret-boundary` (no `--inspect-image`) only **warns** on broad `COPY . .`, so a CI/pre-merge workflow relying on it could accept a broad-copy regression | **INCORRECT (premise disproven) → SUPPRESSED (re-litigates C1)** | **Suppressed — settled by C1 (option c) + Forward note #2.** The npm path **pushes nothing**; the byte scan on both publish paths is the authoritative gate. Codex's hook ("a CI/pre-merge workflow relies on it") is **disproven** — grep of `.github/`, `.husky/`, `.gitlab-ci.yml`, `.circleci/`, `package.json` (`test`/`lint-staged`/`prepare`) found **no consumer** (manual lint only). **Residual #1 hardened** with the explicit non-publishing-lint clause + re-raise condition. |
| 3 | (**Claude**, *low*) no harness case for the new gate-side `--inspect-image ""` fail-closed guard (`check-docker-secret-boundary.sh:50`) | **CORRECT → low (coverage gap, optional)** | **Open (optional, non-blocking).** Add `assert_exit nonzero "fail-closed on empty --inspect-image" -- bash "$GATE" --inspect-image ""`. The build.sh/profile empty-ID guards already prevent an empty ID reaching the gate in the normal flow; this just documents the new invariant. |

**R3 — LOOP STOP (closed out):** the R1→R2→R3 fix chain **converged**. R3 (two fresh reviewers) found
**no genuine new defect**: the R2 fixes are verified correct (R2-1 empirically re-validated against
this host's containerd store), Codex's lone finding **re-litigates the settled C1** (premise
disproven → suppressed; residual #1 hardened), and Claude's lone item is a **trivial optional test**.
This is exactly the loop the ledger exists to stop — continuing would only re-surface the settled
npm-lint tradeoff. **Verdict: ready to merge.**

**R2 oscillation check — no loop:** R2-1/R2-2 are **new defects**, not re-litigation — they are edges
the option-(c) C1 fix *introduced* in the new `build.sh` splice, distinct from R1's findings and
from all 4 accepted residuals (neither reviewer re-raised a residual this round → nothing
suppressed). The pattern is "the fix added a new edge," not oscillation around a tradeoff; the cure
(mirror the profile sibling's already-accepted push-path hardening) is convergent, not a reversal.
Stateless severity-inflation again (Codex high→medium; Claude medium→low), collapsed at the verify
gate. Recommend act → then close out.

**No oscillation / no loop:** first review of this slice (fresh ledger). The intended RC3
frontier-move (demote the lexer to warn-only on the byte-scan path) is correct and is recorded as a
residual, **not** flagged as a defect — the defect (C1) is that the demotion happened in a *shared*
script and silently changed an *out-of-scope* path (`build.sh`) that has no byte-scan backstop.
Stateless severity-inflation again (Codex "high/no-ship" → medium; Claude two "medium" → low),
collapsed at the verify gate against the actual code (current `Dockerfile` clean; remaining
defenses enumerated).

## Open / actionable

**No blocking items — R1 and R2 all resolved (2026-06-23).** R1: C1 via option (c); A1/A2/Cov1/Cov2
applied. R2: R2-1 (re-tag+assert) and R2-2 (gate-side + both caller empty-ID guards) applied and
**adversarially verified sound** (4 lenses, no new edge/regression) and **independently re-confirmed
at R3** (two fresh reviewers; R2-1 assert empirically re-validated on this host). Note-only items
(R2-3 metadata digest; provenance-attestation loss) need no action.

**R3 (optional, non-blocking — does NOT gate merge):**
- **#R3-2.** Add a harness case asserting the new gate-side empty-`--inspect-image` guard fails
  closed: `assert_exit nonzero "fail-closed on empty --inspect-image" -- bash "$GATE" --inspect-image ""`.
  Documents the R2-2 gate-side invariant; the caller empty-ID guards already prevent an empty ID
  reaching the gate in the normal flow, so this is coverage-only.

**Out-of-scope / accepted (not open defects):**
- Source-content secrets in benign-named files — out-of-charter (see Accepted residuals).
- The game deploy's **mutable-tag, no-`@sha256`-digest-pin** contract (Lens C) — low, single-host-
  unreachable, pre-existing; a separate digest-pinned-deploy hardening item (see Forward notes), not
  a defect in this slice.

Not committed (owner commits).

## Forward notes (for downstream tasks)

- **DONE (was the "broader" T4g-adjacent item):** `build.sh` (main game image) now gets the full
  per-layer **byte scan** the profile path has — wired as `--inspect-image "$BUILT_IMAGE_ID"` after
  a `--load --iidfile` build, before `docker push` (`build.sh:116-151`), mirroring
  `build-deploy-profile.sh`. The game/profile asymmetry the investigation flagged is closed. Cost:
  the game build now `--load`s locally (extra disk + a load step) instead of streaming via `--push`
  — an intentional tradeoff to scan the exact bytes before publish.
- The same shared scanner is referenced by `package.json:27` (`check:docker-secret-boundary`),
  which runs the **static-only** path (no `--inspect-image`, pushes nothing). The advisory there is
  warn-only by design; that path needs no blocking broad-copy guard because it never publishes.
- **Verification artifact:** the C1 decision rests on a 19-agent adversarial investigation
  (`/private/tmp/.../tasks/wxn9ud631.output`, 15 scenarios) — most scary scenarios were *refuted*
  (neutralized by multi-stage assembly or `.dockerignore`); the survivors all reduce to "a secret
  *file* under `src/`/`resources/`/`proprietary/` or a broad-COPY regression, on a path with no
  byte scan" — exactly what option (c) closes. The R2 fixes were likewise adversarially verified
  (4 lenses, `tasks/w533xd8aw.output`): sound, no new edge/regression.
- **NEXT (separate task, if pursued): digest-pin the game deploy.** Mirror the profile path —
  resolve an `@sha256` digest from `BUILT_IMAGE_ID` in `build.sh` (`docker inspect` RepoDigests) and
  thread it through `deploy.sh`/`update.sh` (which already accept `sha256:*`), so the game deploy is
  content-addressed end-to-end like `build-deploy-profile.sh`. Closes the Lens-C residual; out of
  scope for T4f. Prereq: the larger game-deploy refactor, not a one-file change.
