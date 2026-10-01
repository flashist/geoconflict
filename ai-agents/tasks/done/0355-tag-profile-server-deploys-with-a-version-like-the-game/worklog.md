# Worklog — 0355 Tag profile-server deploys with a version

## 2026-09-30 — BUILD (fkit-coder, spawned by `fkit-sprint-ship-loop`)

**Mode:** Build worker under the loop's declared-approval marker. Approved plan =
`plan.md` (blob `6f68b04222e5cadaa4003bd520ad5f7b69b5866d`, re-hashed this session — matches),
**as amended by the owner at approval (2026-09-30):** name `<base>-profile.<N>` (e.g.
`0.0.155-profile.3`), and **refuse to deploy** on uncommitted shipped files (also on no git).
Nothing deployed. No SSH, no real `git tag`/`git push`. Nothing committed.

### What changed

| File | Change |
|---|---|
| `scripts/deploy-version-tag.sh` (new) | Sourced helper, functions only: `deploy_version_base`, `deploy_version_next <server> <base> <record>`, `deploy_shipped_tree_dirty <pathspec…>`, `deploy_commit_on_a_remote_branch`, `deploy_tag_and_push`. Server name is a **suffix** parameter, so `0356` gets `<base>-telemetry.<N>`. |
| `build-deploy-profile.sh` | Sources the helper after the parity guard (missing ⇒ stop). Refuses before the build on: no git commit; dirty shipped files (scoped `PROFILE_SHIPPED_PATHS`, lists the paths, "Commit, then redeploy."); unparseable `package.json` version. Computes `DEPLOY_VERSION`, passes `--build-arg PROFILE_BUILD_VERSION/COMMIT`, records `version=` + `package_version=`, puts `git_tag=<outcome>` ON the `validation_result=` line. After `DEPLOY_OUTCOME=ok`: annotated tag on the captured `GIT_COMMIT`, push `refs/tags/<name>` only, then (only if the git tag was pushed) registry tag `<repo>:<name>` + digest check. All tagging warn-only, exit code unchanged. `-dirty` path removed (see decision log). DONE hint shows the new `/health` body. |
| `Dockerfile.profile` | `ARG`/`ENV PROFILE_BUILD_VERSION/COMMIT` + OCI `version`/`revision` `LABEL`, after the last `COPY`, before `CMD`. |
| `src/profile-server/BuildInfo.ts` (new) | `parseBuildInfo` (trim; `[A-Za-z0-9._+-]{1,80}` else `unknown`), `UNKNOWN_BUILD_INFO`, `buildInfo` from literal `process.env` reads. |
| `src/profile-server/Routes.ts` | `AppOptions.buildInfo?`; `/health` → `{status:"ok", version, commit}`; absent ⇒ `unknown`. Still dependency-free. |
| `src/profile-server/Telemetry.ts` | `ProfileMetricsDeps.serviceVersion?`; exported `profileResourceAttributes(serviceVersion)` replaces the hardcoded `"1.0.0"`. |
| `src/profile-server/Server.ts` | Passes `buildInfo` to `createApp` and `serviceVersion` to telemetry; one boot log line `profile server version <v> (commit <c>)`. |
| `setup-profile.sh` | Echoed hint only (`expect 200 {"status":"ok","version":…,"commit":…}`). |
| `tests/scripts/profile-deploy-hardening.test.sh` | Stubs widened (git answers status-with-pathspec / tag -l / tag -a / ls-remote / push / branch -r --contains, logs argv `%q`, flags unknown calls as `UNSTUBBED`; docker `imagetools inspect` prints `Digest:`; shared `calls.log` for ordering). Fixture gets the helper + a `package.json`. New T20–T32 + a structural 0355 section. |
| `tests/profile-server/BuildInfo.test.ts` (new), `Routes.test.ts`, `Telemetry.test.ts` | Per plan §4.2. |
| `tests/scripts/ConfigParityCallSites.test.ts` | Fixture file list gains `scripts/deploy-version-tag.sh` (see decision log). |

### Red (tests written first, run against the unchanged code)

- Harness `bash tests/scripts/profile-deploy-hardening.test.sh`: **rc=1, 507 ✅ / 54 ❌, `SOME FAILED`.** All 54 failures are in the new T20–T32 and the new structural section; every pre-existing check (T1–T19, all structural) stayed green under the widened stubs.
- Jest `BuildInfo` / `Routes` / `Telemetry`: **rc=1** — `BuildInfo` suite could not find the module; 5 failed (3 `/health`, 2 `profileResourceAttributes`), 62 passed.

### Green

- Harness: **rc=0, 565 ✅ / 0 ❌, `ALL PASS`.** (One intermediate run failed a new lint of mine — `git commit` matched inside an error-message string; tightened the lint to ignore quoted text, re-ran green.)
- Jest `BuildInfo` / `Routes` / `Telemetry`: **3 suites, 76/76 passed.**
- Wider set — `tests/scripts/ConfigParity.test.ts`, `ConfigParityCallSites.test.ts`, `ShellHarnesses.test.ts`, all of `tests/profile-server/`: **33 suites, 1234/1234 passed** (after the call-site fixture fix below; before it, 2 failed in `ConfigParityCallSites.test.ts` — the new helper was missing from its scratch tree). No flake re-runs needed.
- `npx tsc --noEmit -p tsconfig.json`: rc=0. `npm run lint`: rc=0. Prettier check on touched TS: clean. `bash -n` on the three shell files: ok.
- **Not run:** `shellcheck` — not installed on this host. Full `npm test` — left to the loop's Verify step, as instructed.

### §5 checks

1. Harness `ALL PASS` (above).
2. Lint clean (above).
3. `node scripts/check-config-parity.mjs --pipeline=all --enforce --block-on=profile` → rc=0, `enforce (blocking: profile) — no required findings`, no line mentions `PROFILE_BUILD_*`.
4. `node scripts/bump-version.js dev` on a scratch copy → `0.0.155-dev.1`; the real `package.json`/`package-lock.json` untouched (`git diff --quiet`).
5. `grep`: `build-deploy-profile.sh:614` still `printf "export PROFILE_IMAGE=%q\n" "$PROFILE_DIGEST"` (was `:554`; lines moved). T30 asserts it behaviourally too.
6. **Docker was already running** (not started by me). Local build of `Dockerfile.profile` with the build args:
   - native arm64 build **failed in `npm ci`** — `canvas` has no arm64 prebuild and the slim image has no Python for node-gyp. Unrelated to this change; the real deploy builds `linux/amd64`.
   - `--platform linux/amd64` build **succeeded**. `docker inspect`: labels `org.opencontainers.image.version=0.0.155-profile.99`, `…revision=0355localcheck`; ENV carries both. A second build with a different version showed `RUN npm ci` **CACHED** (the late-layer placement works).
   - Ran the image, `curl /health` → `{"status":"ok","version":"0.0.155-profile.99","commit":"0355localcheck"}`; boot log line present. Container and both images removed afterwards. Nothing pushed.

### Decision log (calls the plan did not spell out)

Every item is inside the approved plan's intent; none widens scope. No review fixes applied (this is BUILD, not review).

1. **`-dirty` suffix — REMOVED.** The owner's refuse ruling makes it unreachable (a dirty tree or no-git never reaches the build). Removed `WORKTREE_DIRTY`, the `-dirty` image-tag suffix, `commit=…-dirty` in the record and the DIRTY note in the deploy banner; the build commit arg is plain `GIT_COMMIT`. Also dropped the `VERSION_TAG` fallback to the `package.json` version (git is now required). Why: dead code that reads as a live path would mislead the next reader; the comment above the check records that the suffix existed before 0355.
2. **Registry version tag only after the git tag was pushed.** Plan §3.2 step 7 lists the git tag, then the image tag; it does not say what happens to the image tag when the git tag fails. On `tag-failed` or `push-failed` the registry tag is **not** pushed and the retry command for it is printed. Why: a name git could not claim may already belong to another deploy (T27's case), and pushing the registry tag would overwrite that image's name — the plan's "warned, never overwritten". Asserted in T26/T27.
3. **`GIT_TAG_RESULT=interrupted`** is set as the tag step starts, so a signal between the successful deploy and the tag outcome records `ok … git_tag=interrupted`, not the misleading `skipped:deploy-not-completed`.
4. **`DEPLOY_RECORD` moved up** to the version block — the counter reads it before the build; the lock section keeps a pointer comment.
5. **"Commit on no remote branch" warning** (plan §6 says "the script warns", no mechanism named): `git branch -r --contains <commit>`, empty ⇒ warning, tagging still proceeds. Added **T31** for it.
6. **T32 added** (the version tag resolving to a different digest ⇒ WARNING, rc 0) — the `imagetools inspect` check is plan step 7; T20–T30 did not cover its failure branch.
7. **T30's forbidden-flag check scoped** to `git push` / `git tag` calls. The plan text says "any `git.argv`", but the counter legitimately runs `git ls-remote --tags`; checking every line would make T30 fail on correct code.
8. **Where the refusal sits:** after the existing validation, before the build and the lock — so a refused deploy writes no record block (T24 asserts it) and consumes no number.
9. **`deploy_shipped_tree_dirty` fails closed:** a failing `git status` counts as dirty (it cannot prove the shipped files are committed).
10. **`ConfigParityCallSites.test.ts` fixture list** gains `scripts/deploy-version-tag.sh`. That test copies `build-deploy-profile.sh` into a scratch tree with an explicit file list; without the new required helper the script (correctly) refused. Same shape as the harness fixture change.
11. **`profileResourceAttributes` returns all three resource attributes** (name, version, instance id), so the `MeterProvider` resource is built from it alone.
12. **The helper and the main script both print the git-push retry** on `push-failed` (the plan puts it in the helper; the main block adds the image-tag retry beside it). Slightly repetitive output; kept so each piece stands alone for 0356.
13. **pipefail audit comment** at the top of the script updated to name the three new pipelines and why each is non-fatal.

### Residuals (not fixed — for the reviewer / owner)

- **The counter is computed before the lock** (the lock is taken after the build, as before). Two deploys that both compute N before either records can bake the same name; the second's `git tag -a` then fails (`tag-failed`, warned, no registry overwrite) but its running image still reports the duplicate name. The same holds across machines, since the lock is local. Plan §6 accepts this shape ("a clash then shows up as a failed push"); closing it would mean moving the lock or refusing after the build — a behaviour change outside the plan.
- **An image pushed but never deployed** (digest resolution fails after the push, before the lock/record) carries its baked `.N` under the `profile-<sha>` tag only, and the next deploy reuses `.N`. It never ran and never got the version tag, so it is harmless; noted for completeness.
- **Every profile deploy now needs the tree's shipped files committed.** Until this change is committed, the real `./build-deploy-profile.sh` will refuse (these very files are dirty). That is the owner's ruling working, not a bug — but it matters for the weekend slot.
- **`git ls-remote` runs at deploy time**; with no network it only warns and numbers from local tags + the record.
- Follow-ups unchanged from plan §8: `0356` (telemetry, reuses the helper), the game server's fake `"1.0.0"` (filed separately by the producer), registry retention of version tags, an ADR for the naming convention, a wiki ingest after close.

## 2026-09-30 — PROCESS REVIEW round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop`)

**Mode:** Process-review worker under the loop's declared-approval marker (approved `plan.md` +
owner rulings on R1–R5 and the three known limits, given live 2026-09-30 and relayed by `fkit-lead`).
Nothing deployed; no real git tag / registry tag created or pushed; Docker not started. Nothing committed.

### Decision log — what was applied without per-fix owner approval, and why it qualified

1. **R4 (finding: the `UNSTUBBED git` guard was asserted only in T20, and the stub exited 0).**
   Changed `tests/scripts/profile-deploy-hardening.test.sh`: the git stub's unknown-call branch now
   `exit 97`; `run_deploy` fails on a non-empty `unstubbed.log` after **every** run; a closing tally
   check counts the runs. **Qualified:** verified CORRECT (mutation reproduced the gap: old harness
   `ALL PASS` with `git describe --tags` added to the `push-failed)` branch); mechanical, test-only,
   localized; owner named R4 an in-plan fix. Red-first: same mutation → new harness `SOME FAILED`
   (3 ❌). T20's own `no_unstubbed` check was kept (harmless duplicate, keeps T20 self-contained).
2. **R5 (finding: the fail-closed `git status`-error branch of `deploy_shipped_tree_dirty` was untested).**
   Added stub knob `$WORK/status_fail` and **T33** (refused, says "git status failed", no build, no
   SCP/SSH, no record). **Qualified:** verified CORRECT (mutation `return 0`→`return 1` passed the old
   harness); test-only, localized; owner named R5 in-plan. Red-first: mutation → new harness 4 ❌ (all T33).
   T33 is placed after T32 (next free id).
3. **R3 (finding: the comment over-claims "image content equal to GIT_COMMIT").** Rewrote the comment
   above the dirty check in `build-deploy-profile.sh` to say exactly what is checked and name the three
   gaps (gitignored `src/` files, the `package*.json` glob, the check-then-build window). No gate change.
   **Qualified:** owner ruling "Fix the wording, accept"; comment-only. Accepted residual written.
4. **The three worklog limits** → written as *Accepted residuals* (owner ruling "Accept all three").
   Limits 1 and 2 carry a ⚠️ note: the recommended R2 design changes their wording.
5. **Not applied: R1 and R2** — returned as one NEEDS-DECISION. Why: dropping `profile-<sha>` (owner
   ruling on R2) forces the version tag (or an untagged digest push) to reach the registry *before* the
   deploy — the ruling itself lists both as judgment calls to return. R1's fix lives in the very
   post-deploy registry step that any R2 design replaces, so it is held rather than written twice.
   No obvious-winner call was made.

### Verification (this round)
- Mutation runs in a scratch symlink-mirror of the repo (real files untouched): baseline 565/0 ALL PASS;
  old harness + R4 mutation ALL PASS; old harness + R5 mutation ALL PASS; new harness + R4 mutation 3 ❌;
  new harness + R5 mutation 4 ❌; new harness + real code 570/0 ALL PASS.
- Real repo: `bash tests/scripts/profile-deploy-hardening.test.sh` → rc 0, **570 ✅ / 0 ❌, ALL PASS**.
- Jest `BuildInfo` / `Routes` / `Telemetry` / `ShellHarnesses` / `ConfigParityCallSites`: **5 suites, 96/96**
  (ShellHarnesses ran all harnesses, none skipped). `npx tsc --noEmit -p tsconfig.json` rc 0.
  `npm run lint` rc 0. `node scripts/check-config-parity.mjs --pipeline=all --enforce --block-on=profile`
  rc 0, no `PROFILE_BUILD_*` line. `bash -n` on both edited shell files: ok.
- Not run: full `npm test` (left to the loop's Verify step); `shellcheck` (not installed).

## 2026-09-30 — PROCESS REVIEW round 1, part 2: R2 + R1 built (fkit-coder, spawned by `fkit-sprint-ship-loop`)

**Mode:** same Process-review worker marker. **Owner ruling on the R2 NEEDS-DECISION** (live
`AskUserQuestion` in the `fkit lead` session, 2026-09-30, relayed by `fkit-lead`): **Option 1 — "Upload as
0.0.155-profile.N"**. Nothing deployed; no real tag/image pushed; Docker not started (it was already
running — three **read-only** `docker buildx imagetools inspect` look-ups against public Docker Hub names
measured the real error shapes: missing tag → `ERROR: <ref>: not found`, rc 1; no access →
`pull access denied … insufficient_scope`, rc 1; bad host → `… no such host`, rc 1). Nothing committed.

### Decision log — applied under the ruling (in-plan-as-amended), and why each qualified

1. **R2 — `profile-<commit>` dropped; the version name is the only registry tag, pushed before the deploy.**
   `build-deploy-profile.sh`: `PROFILE_IMAGE=<repo>:<DEPLOY_VERSION>`; `VERSION_TAG` removed (its only
   use). Order now: login → first free name → build → **secret byte scan (unchanged position: after the
   build, before any push)** → re-check → tag + push → digest resolve + re-verify (unchanged) → the name
   must resolve to that digest (warn-only; moved up from the old post-deploy step) → lock/record →
   deploy by `@sha256` (unchanged) → annotated git tag after success (unchanged). **Qualified:** exactly
   the design the owner approved (Option 1).
2. **R1 — never overwrite a registry name.** New helpers in `scripts/deploy-version-tag.sh`:
   `deploy_registry_tag_state` (free/taken/unknown; a bash `case` match, no pipe, bash-3.2-safe; unknown
   echoes the registry's error to stderr) and `deploy_first_free_in_registry` (skips held names, max 20;
   returns 1 on unknown, 2 on 20 held). Pre-build: held → next number, unknown → stop ("Nothing was
   built"). Pre-push: taken or unknown → stop, push nothing. The post-deploy registry step and **all
   printed `docker push` retries were removed** (the image is already in the registry); retry lines are
   git-only. **Qualified:** Option 1 as approved ("taken → next free number; can't tell → stop before
   building; taken meanwhile → stop, push nothing; post-deploy registry step and retry lines go away").
3. **Registry login moved above the build** (it must precede the first registry look-up). Token still on
   stdin via `--password-stdin`. **Qualified:** stated in Option 1; no change to how the token travels.
4. **Obvious-winner calls (within the ruling's intent):**
   - The post-push "version name resolves to this digest" check stays **warn-only** (as it was
     post-deploy): the box deploys the digest, so a label mismatch is not a content fault. Stopping the
     deploy there would be a new behaviour the ruling did not ask for.
   - The skip loop is capped at **20** names, so a broken registry answer cannot loop forever.
   - `push-failed` now also tells the operator: "if origin rejects it because the tag already exists
     there, leave it — never force it".
   - **Test-only addition:** the harness's secret-scan stub now logs to `calls.log`, and T20 asserts
     build < scan < first push. The owner asked that the scan-before-push rule be kept; before this,
     nothing in the harness checked it.
5. **Residuals reworded:** Limit 1 (the registry is now the shared claim point; only a short
   check-then-push window remains) and Limit 2 (a pushed-but-never-deployed name is skipped, never reused).
   Ledger `Status: closed-out`.

### Verification
- **Red first:** the new/changed harness checks against the pre-fix script → `SOME FAILED`, 22 ❌
  (T20 ordering / `profile-` / single push, T26, T27, T28, T34, T35, T36).
- **Green:** `bash tests/scripts/profile-deploy-hardening.test.sh` → rc 0, **595 ✅ / 0 ❌, ALL PASS**
  (44 `run_deploy` runs, none made an unstubbed git call).
- **Mutations** (scratch symlink mirror; real files untouched), each caught:

  | Mutation | Result |
  |---|---|
  | scan moved after the push | 1 ❌ |
  | pre-push re-check removed | 5 ❌ |
  | unknown registry treated as free | 5 ❌ |
  | the R4 `git describe` mutation | 3 ❌ |
  | the R5 fail-open mutation | 4 ❌ |

- **Jest:** `BuildInfo`, `Routes`, `Telemetry`, `ShellHarnesses`, `ConfigParityCallSites`, `ConfigParity`
  → **6 suites, 233/233**, none skipped.
- **Other checks:** `npx tsc --noEmit -p tsconfig.json` rc 0. `npm run lint` rc 0. The parity check
  (`--enforce --block-on=profile`) rc 0, with no `PROFILE_BUILD_*` line. `bash -n` passes on all three
  shell files.
- **Not run:** full `npm test` (left to the loop's Verify step); `shellcheck` (not installed).

## 2026-09-30 — PROCESS REVIEW round 2 (fkit-coder, spawned by `fkit-sprint-ship-loop`)

**Mode:** same Process-review worker marker; the owner asked for this round ("Yes, review round 2") and
ruled on R8 ("Add the test now"), both relayed by `fkit-lead`. Findings R6–R9 are tests or wording only.
The reviewer measured no behaviour fault. Nothing deployed, pushed or committed; Docker not started.
The real files were never mutated: every mutation ran in a scratch symlink mirror.

**Loop / oscillation check:**
- None of R6–R9 re-opens a round-1 fix.
- R9 is about the *wording* of accepted residual Limit 1, not a re-litigation: its re-raise trigger
  already covers the traced case. The tradeoff stays accepted.
- No fix below changes behaviour, so none can regress R1–R5.

### Decision log — applied without per-fix approval, and why each qualified
1. **R6 (the "cannot tell" branch of the push-time re-check was untested).**
   - Change: new fake-registry knob `registry_unknown_on_recheck` + **T37**.
   - Qualified: verified CORRECT at `build-deploy-profile.sh:308-319`; test-only and localized; inside
     the approved Option-1 design.
2. **R7 (the 20-try cap was untested).**
   - Change: knob `registry_all_taken` + **T38** (exactly 20 look-ups, the message, no build, no push).
   - Qualified: verified CORRECT at `scripts/deploy-version-tag.sh:124/:140`; test-only.
3. **R8 (nothing guarded that the registry token stays on stdin).**
   - Change: **T39**, with a synthetic token only.
     - Behavioural: `--password-stdin` on the login line; the token in no argv log; the token received
       intact on the stub's stdin. The docker `login` stub now saves stdin to `$WORK/login.stdin`
       (synthetic value, harness temp dir) instead of discarding it.
     - Structural: every non-comment `docker login` uses `--password-stdin` and never `-p`/`--password`.
   - Qualified: owner ruling "Add the test now"; test-only.
   - Obvious-winner call: the structural lint also covers `setup-profile.sh`'s `docker login`. That is
     the box-side login with the same token, and the ruling asks that the token never go on a command
     line. Test-only, zero behaviour change.
4. **R9 (the Limit 1 wording overstated how a collision surfaces).**
   - Change: rewrote the *Limit 1* residual. The overwrite is silent by default. It now carries the
     traced one-machine order and its result: git tag `.N` = A, registry `:.N` = B's never-deployed
     image, only B's lock error. A WARNING appears only when the overwritten deploy's check runs after
     the other push. Across machines, the second git tag fails.
   - The re-raise trigger now also names "a deploy stopped by the lock after its push".
   - Qualified: the owner and lead asked for accurate wording; the tradeoff stays accepted.
5. Ledger `Status: closed-out`.

### Verification
- **Reviewer's mutations vs the round-1 harness** (gaps reproduced): R6, R7 and R8 each `ALL PASS` 595/0.
- **The same mutations vs the new harness:**

  | Mutation | Result |
  |---|---|
  | R6 | 3 ❌ |
  | R7 | 3 ❌ (21 look-ups, no message, build ran) |
  | R8 | 5 ❌ |
  | R8, applied to `setup-profile.sh` | 2 ❌ |

- **Real code:** `bash tests/scripts/profile-deploy-hardening.test.sh` → rc 0, **615 ✅ / 0 ❌, ALL PASS**.
- **Jest:** 6 suites, **233/233**, none skipped. `tsc` rc 0. Lint rc 0. Parity check (`--enforce
  --block-on=profile`) rc 0, with no `PROFILE_BUILD_*` line. `bash -n` passes on all three shell files.
- **Not run:** full `npm test` (the loop's Verify step); `shellcheck` (not installed).
