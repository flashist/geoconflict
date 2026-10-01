
# Plan — 0355 Tag profile-server deploys with a version, the way the game server is tagged

**Status:** plan only. No source, tests or files written. Waiting for the owner at the plan gate.
**Architect consulted** (one-off, read-only, hop 2 of 2). Its advice is folded in below. Where I differ, I say so (§9).

## 0. Summary (plain words)
- **Every successful profile deploy gets a name**, e.g. **`profile-0.0.155.3`**:
  - `0.0.155` = the game's `package.json` number, with any `-dev.N` / `-staging.N` part removed.
  - `.3` = a counter that restarts for each game number.
- **The name goes to four places:**
  - a **git tag**, created only after the deploy succeeds;
  - an **extra image tag** in the registry;
  - **inside the image** (the running server shows it on `/health` and in telemetry);
  - the local **deploy record**.
- **Things that stay exactly as they are:**
  - `package.json` is never written.
  - Digest pinning is not touched: the box still gets `@sha256:…`.
  - No new deploy-time setting, so the config-parity gate stays green.
- **New:** the "uncommitted files" check looks only at files the deploy actually ships. Today any uncommitted `ai-agents/` note marks the build dirty — the tree is like that right now — and that would stop almost every deploy from getting a tag.
- **The logic lives in one small shared helper**, so `0356` (telemetry) reuses it rather than copying it.
- **The build deploys nothing.** The first tagged deploy is the regular weekend profile deploy (§7 covers the `0297`/`0309` ordering).

## 1. Facts this plan rests on (re-verified 2026-09-30)
- **Game tagging.**
  - `build-deploy.sh:69` bumps the version through `scripts/bump-version.js`.
  - `:73-77` commit, then `git tag <v>` (a lightweight tag), then push the branch and the tag — all **before** the build.
  - The image tag is a timestamp (`:66`).
- **`scripts/bump-version.js:23-27`** accepts only `X.Y.Z` or `X.Y.Z-(dev|staging).N` and throws on anything else.
  - `:37-46`: `-dev.N` means "the Nth dev deploy after prod X.Y.Z". Removing the suffix therefore gives "the last game release this tree comes from".
  - `package.json` today is `0.0.155`.
- **Profile deploy — `build-deploy-profile.sh`:**
  - `:163-164`: `VERSION_TAG` = short SHA; `GIT_COMMIT` = full SHA.
  - `:172-177`: the dirty check is **whole-tree** `git status --porcelain --untracked-files=normal`.
  - `:180`: the image is `…:profile-<sha>[-dirty]`.
  - `:229-230`: `docker tag` / `docker push` that tag.
  - `:244-273`: the digest is resolved from the built image ID and re-verified.
  - `:340-351`: the record body. `:312`: the `validation_result=` line, written last by `finalize_deploy`.
  - `:554`: the staged `PROFILE_IMAGE` is the **digest**.
  - `:647`: `DEPLOY_OUTCOME=ok`.
- **Nothing in the repo reads, lists or sorts git tags.**
  - The only tag command anywhere is `build-deploy.sh:75`.
  - There is no CI and no `.github/` folder.
  - One old annotated tag exists (`pre-t4-profile-backend-infra`). No tag starts with `profile-`.
- **Config-parity checker:** for the profile pipeline it counts **`Dockerfile.profile` `ENV NAME=` lines as supplied** (`scripts/check-config-parity.mjs:20`, `:227`). So `ARG`→`ENV` plus a literal `process.env.NAME` read passes the gate. (Compare `Telemetry.ts`, which deliberately avoids `HOSTNAME` for exactly this reason.)
- **Nothing reads the `/health` body.**
  - The compose healthcheck is `curl -fsS` and checks the status code only (`setup-profile.sh:1067`).
  - Only two echoed hints mention the body: `setup-profile.sh:1848` and `build-deploy-profile.sh:653`.
  - One test pins it: `tests/profile-server/Routes.test.ts:77` `toEqual({status:"ok"})`.
- **Telemetry** `ATTR_SERVICE_VERSION: "1.0.0"` is hardcoded (`src/profile-server/Telemetry.ts:480`).
- **Harness** `tests/scripts/profile-deploy-hardening.test.sh`:
  - The `git` stub (`:52-60`) answers only `rev-parse` and the exact `status` command. Anything else silently succeeds with no output.
  - `run_deploy` (`:116-166`) copies only `build-deploy-profile.sh` and empty fixtures. There is **no `package.json`** in the fixture.
  - T4 (`:204-213`) requires each record block to end with a `validation_result=` line.
  - The highest test id is T19.
- **`registry-image-policy.md`:**
  - `:55`: tags are labels, not the trust anchor.
  - `:56-59`: the trust anchor is commit + digest + validation result.
  - `:47`: an image "from a known repo commit" is trusted.

## 2. Recommended scheme (the owner picks at the gate — variants noted)
| Point | Recommended | Variant |
|---|---|---|
| Name | **`profile-<base>.<N>`**, e.g. `profile-0.0.155.3` (architect's choice) | owner's idea + counter: `0.0.155-profile.3` — same code, only the format string changes |
| Base | `package.json` `X.Y.Z` with `-dev.N`/`-staging.N` removed (read only). An unreadable or odd version **stops before the build** | — |
| Number | shared `package.json` number (owner's idea) | own number per server — rejected: a new file plus a commit on every deploy |
| Bump `package.json`? | **never** | — |
| Counter N | 1 + the highest N across local tags, remote tags (`git ls-remote`) **and** the `version=` lines in the local deploy record | — |
| Git tag | **annotated**, created **after** the deploy succeeds, on the captured full `GIT_COMMIT` (not the HEAD of that moment). Pushed as `refs/tags/<name>` only | lightweight (like the game) |
| Uncommitted shipped files | deploy as today, **no git tag**, loud warning, record says untagged; the image reports `version=untagged` | refuse to deploy |
| Image tag | **keep** `profile-<sha>[-dirty]` (the digest lookup depends on it); **add** `profile-<base>.<N>` after success | — |
| Visible where | `/health` → `{"status":"ok","version":…,"commit":…}`; telemetry `service.version`; OCI labels; one boot log line | — |

**Why each choice:**
- **The name.**
  - Our tags form their own group (`git tag -l 'profile-*'`), separate from the game's `0.0.x` tags.
  - The git tag, the image tag and today's image tags all share one family.
  - To version-sorting tools, the suffix form reads as "an early build of 0.0.155".
  - Both forms work today, because nothing reads tags.
- **Why the record counts toward N.** `setup-profile.sh` can fail **after** the new container is already live. In that case an image carrying the name is running, but the deploy counts as failed. If a failed attempt did not use up its number, two different images could carry the same name. Gaps in the tag sequence therefore mean "failed attempt", and the record explains each gap.
- **Why annotated.** The tag message holds the name, the full commit, the raw `package.json` version and the `sha256:` digest (no repo name, no host). That gives git a durable, off-laptop copy of commit + digest + "ran OK", which is the policy's trust anchor. The cost: plain `git describe` would pick it up. It already returns the old annotated tag today, so nothing that works now gets worse.

## 3. Changes, file by file

### 3.1 New `scripts/deploy-version-tag.sh` — a sourced helper, shared with 0356
Functions only; no top-level side effects. Every function is safe under `set -e` (each returns a status; callers wrap it in `if`).
- `deploy_version_base <raw>`
  - Applies `bump-version.js`'s own pattern `^([0-9]+)\.([0-9]+)\.([0-9]+)(-(dev|staging)\.[0-9]+)?$`.
  - Prints `X.Y.Z`, or returns 1.
- `deploy_version_next <server> <base> <record-file>`
  - Collects N values from three sources:
    - `git tag -l "<server>-<base>.*"`;
    - `git ls-remote --tags origin "refs/tags/<server>-<base>.*"`, with `^{}` lines stripped (on failure: a warning, then local tags only);
    - the record file's `^version=<server>-<base>\.[0-9]+$` lines.
  - Filters with an anchored, dot-escaped pattern and takes the **numeric** max (`.10` beats `.9`).
  - Prints `<server>-<base>.<max+1>`.
- `deploy_shipped_tree_dirty <pathspec…>` → `git status --porcelain --untracked-files=normal -- <pathspec…>`. Returns 0 when dirty.
- `deploy_tag_and_push <name> <commit> <message>`
  - `git tag -a <name> -m <message> <commit>`, then `git push origin "refs/tags/<name>"`.
  - Never `-f`, `--force`, `--tags` or `--follow-tags`.
  - Prints one outcome: `pushed`, `push-failed`, or `tag-failed` (the tag already exists, or git error).
  - On `push-failed` it keeps the local tag and prints the exact one-line retry.
- The server name and pathspec are **parameters**. For 0356 the pathspec will be the telemetry scripts, so a profile-only change never marks telemetry dirty, and the reverse.

### 3.2 `build-deploy-profile.sh`
1. **Source the helper** next to the parity guard, from `$(dirname "$0")/scripts/`. If it is missing, stop before anything is built.
2. **Replace the whole-tree dirty check (`:172`) with the scoped one.** The pathspec `PROFILE_SHIPPED_PATHS` =
   - `Dockerfile.profile`'s COPY sources: `package.json package-lock.json tsconfig.json src migrations`;
   - plus `Dockerfile.profile setup-profile.sh profile-backup.sh profile-checks.sh build-deploy-profile.sh scripts/deploy-version-tag.sh`.

   One definition drives both the existing `-dirty` image-tag suffix and the tag/no-tag decision. Update the warning text to match.
3. **Compute the name before the build:**
   - `PACKAGE_VERSION_RAW=$(node -p "require('./package.json').version")` — read-only; node is already required.
   - `base=$(deploy_version_base …)`. If it fails, stop with "nothing was built".
   - Clean tree → `DEPLOY_VERSION=$(deploy_version_next profile "$base" "$DEPLOY_RECORD")`.
   - Dirty tree, or `GIT_COMMIT=unknown` → `DEPLOY_VERSION=untagged`.
   - `BUILD_COMMIT="${GIT_COMMIT}${WORKTREE_DIRTY:+-dirty}"`.
4. **Build (`:185`):** add `--build-arg PROFILE_BUILD_VERSION="$DEPLOY_VERSION" --build-arg PROFILE_BUILD_COMMIT="$BUILD_COMMIT"`.
5. **Record body (`:342-351`):** add `version=${DEPLOY_VERSION}` and `package_version=${PACKAGE_VERSION_RAW}`.
6. **`finalize_deploy` (`:312`):** put the tag outcome **on** the last line — `validation_result=… digest=… git_tag=${GIT_TAG_RESULT:-skipped:deploy-not-completed}`. It must never come after that line; T4 depends on this.
7. **After `DEPLOY_OUTCOME=ok` (`:647`), before `DONE`** — every step warn-only, never changing the exit code:
   - Clean + named → `GIT_TAG_RESULT=$(deploy_tag_and_push …)`, with a message of name / commit / package_version / `sha256:` digest.
   - Then `docker tag "$BUILT_IMAGE_ID" "<repo>:$DEPLOY_VERSION"` + `docker push`.
   - Then `docker buildx imagetools inspect` checks that the new tag resolves to `PROFILE_DIGEST`. If it doesn't, warn. `imagetools create` is not used.
   - Dirty → `GIT_TAG_RESULT=skipped:uncommitted`, plus a loud WARNING block: "live, but NOT tagged — commit and redeploy for a tag".
   - Any failure prints a loud WARNING block with the exact retry command. The deploy itself stays `ok` and the exit code stays 0.
8. **Header comment + `DONE` hint (`:653`):** describe the naming, and show the `/health` answer now includes the version.
9. **Unchanged:**
   - the parity guard;
   - the digest resolution;
   - the staged `PROFILE_IMAGE=$PROFILE_DIGEST`;
   - no call to `bump-version.js`;
   - no write to `package.json`;
   - no `git commit`, and no branch push.

### 3.3 `Dockerfile.profile`
After `COPY migrations` and before `CMD` — so a new version per deploy rebuilds only a few metadata layers, not `npm ci`. (The game's `Dockerfile:21` puts its arg early; do not copy that.)
```
ARG PROFILE_BUILD_VERSION=unknown
ARG PROFILE_BUILD_COMMIT=unknown
ENV PROFILE_BUILD_VERSION="$PROFILE_BUILD_VERSION"
ENV PROFILE_BUILD_COMMIT="$PROFILE_BUILD_COMMIT"
LABEL org.opencontainers.image.version="$PROFILE_BUILD_VERSION" org.opencontainers.image.revision="$PROFILE_BUILD_COMMIT"
```
- These names are not keys in `profile.env`, so a compose `env_file` can't override them. A harness check asserts that stays true.

### 3.4 Profile server
- **New `src/profile-server/BuildInfo.ts`:**
  - Exports a pure `parseBuildInfo(rawVersion, rawCommit)`: trim; allow only `[A-Za-z0-9._+-]`, max 80 characters; anything else → `"unknown"`.
  - Exports `buildInfo`, built from the **literal** reads `process.env.PROFILE_BUILD_VERSION` / `process.env.PROFILE_BUILD_COMMIT` (literal so the parity checker can see them).
- **`Routes.ts`:**
  - New `AppOptions.buildInfo?`. When absent → `{version:"unknown", commit:"unknown"}`, so existing callers and tests keep their behaviour.
  - `/health` → `{status:"ok", version, commit}`. It stays dependency-free and 200 with no database.
- **`Telemetry.ts`:**
  - `ProfileMetricsDeps.serviceVersion?` (default `"unknown"`).
  - A small exported `profileResourceAttributes(serviceVersion)` used by the `MeterProvider`, replacing `"1.0.0"`.
- **`Server.ts`:**
  - Import `buildInfo`; pass it to `createApp` options and `startProfileTelemetry` deps.
  - One `log.info("profile server version <v> (commit <c>)")` line at boot — no host, no secret.

### 3.5 `setup-profile.sh`
- Only the echoed hint at `:1848`: `expect 200 {"status":"ok","version":…}`.
- No logic change. (This file ships with every deploy anyway.)

## 4. Tests — written first, seen failing against the current code, then made to pass

### 4.1 Harness `tests/scripts/profile-deploy-hardening.test.sh`
**Stub + fixture changes:**
- The `git` stub:
  - logs every argv to `$WORK/git.argv` and to a shared `$WORK/calls.log`;
  - answers `status --porcelain …` (prefix match, so the pathspec form works; `$WORK/dirty` present → prints a modified `src/` line);
  - answers `tag -l` from `$WORK/local_tags`;
  - answers `ls-remote` from `$WORK/remote_tags`, including a `^{}` line (`$WORK/ls_remote_fail` → exit 128);
  - answers `tag -a` (fails if the name is already in `local_tags`, or if `$WORK/tag_fail` is present);
  - answers `push` (`$WORK/push_fail` → exit 1);
  - prints `UNSTUBBED git …` for anything else, which a check fails on.
- `ssh` and `docker` also log to `calls.log`, so ordering can be checked.
- The `docker` stub's `imagetools inspect` prints a `Digest:` line.
- `run_deploy` copies `scripts/deploy-version-tag.sh` and writes a fixture `package.json` (`$WORK/pkg_version`, default `0.0.155`).

**New behavioural tests T20–T30:**
- **T20 happy path:**
  - the build argument is `PROFILE_BUILD_VERSION=profile-0.0.155.1`;
  - `git tag -a profile-0.0.155.1 … <full 40-char SHA>`;
  - the push is `refs/tags/profile-0.0.155.1`;
  - in `calls.log`, the tag comes **after** the deploy `ssh`;
  - an image `docker tag`/`push` of `:profile-0.0.155.1`;
  - the record has `version=`, `package_version=` and `git_tag=pushed` on the `validation_result=ok` line;
  - no `UNSTUBBED` line.
- **T21 counter:**
  - local `.1 .2`, remote `.9 .10` + `^{}` lines, record `.11` → `profile-0.0.155.12`;
  - `profile-0.0.154.40`, `profile-0.0.155.x` and `pre-t4-profile-backend-infra` are ignored.
- **T22 dev base:** `0.0.155-dev.2` → `profile-0.0.155.1`, and `package.json` is byte-identical afterwards.
- **T23 bad version:** `1.2` → exit ≠ 0, **no** `docker buildx` call, no `scp`.
- **T24 uncommitted shipped files:**
  - rc 0, `PROFILE_BUILD_VERSION=untagged`, commit `…-dirty`;
  - no `git tag` / `git push`;
  - record `git_tag=skipped:uncommitted`;
  - a WARNING line.
- **T25 uncommitted doc only:** `$WORK/dirty` set to an `ai-agents/` path. The stub honours the pathspec, so the build counts as clean → tagged.
- **T26 failed deploy (`fail_deploy`):**
  - no `git tag`;
  - record `validation_result=failed … git_tag=skipped:deploy-not-completed` plus `version=profile-0.0.155.1`;
  - the **next** run gets `.2`.
- **T27 tag already exists at write time:** rc 0, WARNING, no push, record `git_tag=tag-failed`, never `-f`.
- **T28 push fails:** rc 0, WARNING carrying the retry command, record `git_tag=push-failed`.
- **T29 `ls-remote` fails:** a warning, then the counter from local tags and the record.
- **T30 across all runs:**
  - no `-f` / `--force` / `--tags` / `--follow-tags` in any `git.argv`;
  - the staged env still has `export PROFILE_IMAGE=…@sha256:<64hex>`.

**Existing T1–T19:** must stay green. T4's layout check keeps holding, because the tag outcome sits on the `validation_result=` line.

**Structural additions:**
- every `COPY` source in `Dockerfile.profile` is in `PROFILE_SHIPPED_PATHS`, so the two lists can't drift;
- the `ARG`/`ENV`/`LABEL` lines exist and sit after the last `RUN`;
- `PROFILE_BUILD_*` are not keys in `setup-profile.sh`'s profile.env;
- `build-deploy-profile.sh` never calls `bump-version.js`, never writes `package.json`, and never has `git push --tags`/`-f` or `git tag -f`.

### 4.2 Jest
- **New `tests/profile-server/BuildInfo.test.ts`:** defaults, trimming, junk → `unknown`.
- **`Routes.test.ts`:**
  - `/health` returns the given version and commit;
  - absent → `unknown`;
  - still 200 with a repo whose `ping` throws.
  - The existing `toEqual({status:"ok"})` is updated.
- **`Telemetry.test.ts`:** `profileResourceAttributes("profile-0.0.155.3")` carries that version, not `"1.0.0"`.

## 5. Verification (local, in this task)
1. `npm test` is green, including `ShellHarnesses.test.ts`. The harness prints `ALL PASS` with the new checks counted. (For a supertest flake, see CLAUDE.md: re-run, and say that I re-ran.)
2. `npm run lint`.
3. `node scripts/check-config-parity.mjs --pipeline=all --enforce --block-on=profile` → no finding for `PROFILE_BUILD_*`.
4. On a scratch copy, `node scripts/bump-version.js dev` still works.
5. `grep` confirms `:554` still stages `$PROFILE_DIGEST`.
6. **If Docker Desktop is running:** a local `docker buildx build` of `Dockerfile.profile` with the build arguments, then `docker inspect` shows the labels and ENV. If it isn't running, I say so and don't claim it (Docker can't be started headlessly here).

## 6. Edge cases covered
- HEAD moving during the build → the tag goes on the captured `GIT_COMMIT`.
- Remote unreachable → the counter uses local tags + record; a clash then shows up as a failed push (warned, never overwritten).
- A commit not yet on the remote → pushing the tag uploads that commit; the script warns (it doesn't block).
- No git at all → `untagged`, with no tag attempted.
- An unwritable record (T5) → the counter just loses that source; the lock is still released.
- A concurrent second deploy → still blocked by the existing lock.
- `git` needs `user.name`/`user.email` for an annotated tag → if missing, the outcome is `tag-failed` (warned). The operator already has them, because game deploys commit.

## 7. Ordering against `0297` / `0309` — how the plan protects it
- **This task deploys nothing.** The build ends with local tests only.
- `0309`'s log line is committed but **not yet deployed**. The next profile deploy is the first to carry it, so riding that **same** weekend deploy (2026-10-03/04) loses nothing: the running container doesn't have the line yet.
- **The danger is only a second profile deploy before `0297` §1's read-back.** The verify task, filed at close at the top of Sprint 8, will say:
  - ride the slot deploy that first ships `0309` (or a later one, after the read-back);
  - **never redeploy just to fix a tagging problem before the read-back** — tagging faults are cosmetic, and a failed tag or image-tag push is retried with a git or docker command, with no redeploy.

## 8. Out of scope / follow-ups (not built here)
- The telemetry server → `0356`, reusing the helper.
- The game server's own fake `"1.0.0"` (brief Q7) → recommended as a separate small task.
- Registry retention of the new version tags. The policy says to keep current + previous; flagged, not solved.
- An **ADR** for the naming convention. The architect recommends one, because it spans two tasks now and every future server. Suggested: record it after this gate rules, in an owner session (`/fkit-record-decision`).
- A wiki ingest after close.

## 9. Architect's advice vs this plan
- **Adopted in full:**
  - the prefix name;
  - base = strip the dev/staging suffix;
  - no bump;
  - tag after success;
  - the record counts toward N;
  - the scoped uncommitted-files check, plus the drift check between the two lists;
  - bake the version into the image as late layers with new names;
  - add the image tag rather than replace it;
  - a shared parameterized helper;
  - annotated tags carrying the digest;
  - a push failure only warns.
- **Where I differ, slightly:**
  - The architect lists "refuse to deploy with uncommitted shipped files" as policy-leaning. I recommend keeping today's deliberate warn-and-deploy (it's the cheapest to reverse, and `/health` still says `untagged` honestly), and I put the choice to the owner.
  - I also cap and clean the version and commit strings before `/health` echoes them. That is a small defensive addition the architect didn't mention.
- **Brief vs architect:** the brief recommended the owner's suffix form (B). The architect recommends the prefix (C). I side with the architect; the owner decides.

## 10. Defaults applied unless the owner says otherwise
- Shared number (brief Q2).
- No bump (Q3).
- Visible in `/health` + telemetry + labels (Q5). The version and commit become public on `/health`, the same as the game's `/api/version` and `commit.txt`.
- Tag after success (Q6).
- Annotated tags.
- Failed attempts use up their number.
- Game `"1.0.0"` → separate task (Q7).
- Order vs the other top rows (Q8) is the lead's call.

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text. **The owner chose the non-recommended variant on BOTH open questions — these rulings OVERRIDE the "Recommended" column and every example in the plan text above wherever they conflict.***

- **Plan:** APPROVED, with the rulings below and the §10 defaults (shared number, no bump, tag only after success, annotated tags, visible on `/health` + telemetry + labels, failed attempts use up their number).
- **Q1 — name format:** **`0.0.155-profile.3`** — i.e. `<base>-profile.<N>` (the owner's original suffix idea + a counter), **not** `profile-<base>.<N>`. Everywhere the plan text says `profile-0.0.155.N` / `profile-<base>.<N>` (the helper's tag/ls-remote/record patterns, the image version tag, the build arg, the tests T20–T30, examples), use `<base>-profile.<N>` instead. The helper's server-name parameter becomes a **suffix**, so `0356` gets `<base>-telemetry.<N>`. Unchanged: the existing image tag `profile-<sha>[-dirty]` stays as-is (the digest lookup depends on it). Note: `package.json` is still never written with a suffix (`bump-version.js` would throw on it).
- **Q2 — uncommitted shipped files:** **"Refuse to deploy"** — if any file in `PROFILE_SHIPPED_PATHS` has uncommitted changes, the deploy **stops before anything is built**, exit ≠ 0, with a clear message listing the dirty paths and "commit, then redeploy". This replaces §3.2 step 3's `untagged` path, step 7's "Dirty → skipped:uncommitted" branch and T24's expectation (T24 becomes: exit ≠ 0, no `docker buildx`, no `scp`/`ssh`, no tag, clear message). The scoped pathspec (T25: an `ai-agents/`-only change still deploys and is tagged) **stays**. `GIT_COMMIT=unknown` (no git) also refuses. Whether the `-dirty` image-tag suffix code path is kept or removed is the builder's call (it becomes unreachable) — record the choice.
- **Brief Q7 (the game server's own fake `"1.0.0"` telemetry version):** **"Yes, file it"** as a separate small task — filed by a producer, **not** part of this build.
