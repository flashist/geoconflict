# Plan — 0356 Tag telemetry-server deploys with a version, the way the game server is tagged

**Status:** plan only. No source, tests or files written (spawned plan step, prose gate honoured). Waiting for the owner at the plan gate.
**Grounding:** `0355` brief/plan/worklog/review (closed), **ADR-117** (accepted 2026-09-30; its § *How other servers apply this* names this task: decisions 1, 2, 3, 5 apply; 4 (registry) and the `/health`/label parts of 6 do not), the real `build-deploy-telemetry.sh`, `setup-telemetry.sh`, `build-deploy-profile.sh`, `scripts/deploy-version-tag.sh`, `tests/scripts/profile-deploy-hardening.test.sh`, `tests/scripts/ShellHarnesses.test.ts`, `scripts/check-config-parity.mjs`. No architect consult needed (ADR-117 already answers the telemetry shape).

## 0. Summary (plain words)
- Every successful telemetry deploy gets a name like **`0.0.155-telemetry.1`** — the same scheme the owner ruled for the profile server (`<base>-telemetry.<N>`, ADR-117).
- There is **no image of ours** on the telemetry box (only pinned third-party images), so the name means **"which commit of our setup scripts is live"**.
- The name goes to **three places**: an annotated **git tag** (only after the deploy succeeded), a **marker file on the box** (`/opt/uptrace/deployed-version`, two lines: version + commit), and a **local deploy record** on the operator's machine.
- **Reuses** the shared helper `scripts/deploy-version-tag.sh` from `0355` unchanged — no new tagging logic.
- **Unchanged:** `package.json` is never written; no third-party image version moves; no registry; Uptrace itself is not touched.
- **Builds nothing and deploys nothing.** First tagged telemetry deploy = the next weekend slot. A verify task is filed at close (top of Sprint 8).
- **One open question for the owner:** refuse to deploy when a shipped telemetry file has uncommitted changes? (Rec: **yes, refuse** — same as `0355`.)

## 1. Facts this plan rests on (read 2026-10-01)
- `build-deploy-telemetry.sh` (390 lines): `set -e`, no pipefail. Loads `.env*`; validates host/secrets; local Uptrace config dry-run via `docker run` (reads the Uptrace version with `grep 'image: uptrace/uptrace:' "$SETUP_SCRIPT"`); SSH auth (key, or gated password fallback whose `trap 'rm -f "$SSH_PASSWORD_FILE"' EXIT` is its **only** trap); read-only role-marker preflight; SCP of `setup-telemetry.sh`; a 0600 staged env file SCP'd as `/root/.uptrace-deploy-env-<pid>`; one SSH that sources it and runs the script. **It never reads git or `package.json`, writes no record, takes no lock, leaves no version on the box.**
- `setup-telemetry.sh` (1289 lines): `set -e`; config under `UPTRACE_DIR=/opt/uptrace`; role marker `/etc/geoconflict-deploy-role` written before the first mutation; five pinned images (`clickhouse…25.8.15.35`, `postgres:17-alpine`, `redis:7-alpine`, `uptrace/uptrace:2.0.2`, `otel…0.123.0`); container health after `compose up` is **warn-only**; ends with the cron block, then `print_header "SETUP COMPLETE"`.
- The alert-probe comment (`Schema verified against: uptrace/uptrace:2.0.2`) is tied by a harness check to the compose image tag — **not touched**.
- Helper `scripts/deploy-version-tag.sh` (committed): `deploy_version_base`, `deploy_version_next <server> <base> <record>` (local tags + `git ls-remote` + record `version=` lines; anchored per server, so `-profile.N` tags never count for telemetry), `deploy_shipped_tree_dirty <pathspec…>` (fails closed), `deploy_commit_on_a_remote_branch`, `deploy_tag_and_push` (annotated, `refs/tags/<name>` only, never `-f`/`--tags`). Registry functions are not used here.
- `scripts/check-config-parity.mjs` covers game/profile/client only — **new `TELEMETRY_DEPLOY_*` names cannot trip it**; the hardening harness is the only gate over the telemetry hop (as its own comment already says).
- Harness today: **no behavioural runner for the telemetry deploy** — telemetry coverage is structural greps plus extracted-function runs (e.g. `assert_probe_token_json_safe`). Stubs (`git`, `ssh`, `scp`, `sshpass`, `docker`, `getent`) are reusable; the `git` stub fails any unknown call (`exit 97`, R4).
- ⚠️ **Harness wall time measured now: 68 s** (615 ✅, `ALL PASS`) against the wrapper's **150 s** `spawnSync` deadline. The wrapper comment still says "~16 s". Headroom is already shrinking (see §7).

## 2. Scheme (ADR-117 applied; nothing new to rule except Q1)
| Point | This task |
|---|---|
| Name | `<base>-telemetry.<N>`, e.g. `0.0.155-telemetry.1` |
| Base | `package.json` `X.Y.Z`, `-dev.N`/`-staging.N` removed; odd/unreadable → stop before touching the box |
| N | helper's counter: local tags + remote tags + this deploy's own record. A failed attempt that reached the box uses up its number |
| `package.json` | read only, never written, `bump-version.js` never called |
| Git tag | annotated, **after** the remote setup succeeded, on the commit captured at start; push `refs/tags/<name>` only; warn-only (exit code unchanged) |
| Registry | none (no image of ours) |
| Visible where | marker on the box + local record + git tag. Uptrace UI does **not** show it |
| Uncommitted shipped files | **Q1** — Rec: refuse (as `0355`) |

## 3. Changes, file by file

### 3.1 `build-deploy-telemetry.sh`
1. **Source the helper** from `$(dirname "$0")/scripts/deploy-version-tag.sh`, right after the existing validation. Missing → `Error … Nothing was sent to the box`, exit 1.
2. **Commit + scoped dirty check (before the Docker dry-run and preflight):**
   - `GIT_COMMIT=$(git rev-parse HEAD)`; fails → refuse ("no git commit").
   - `TELEMETRY_SHIPPED_PATHS=(setup-telemetry.sh build-deploy-telemetry.sh scripts/deploy-version-tag.sh)` — one single-line array: the uploaded script, the script that builds the staged env, and the helper. A profile-only or `ai-agents/` change never blocks it.
   - Per Q1 (Rec): dirty → refuse, list the dirty paths, "Commit, then redeploy." `git status` failing → refuse (helper fails closed).
3. **Name:**
   - Base read **from the commit being deployed**: `git show "${GIT_COMMIT}:package.json"` parsed by `node` (wrapped in `if`, so `set -e` cannot fire mid-pipe). Deliberate small difference from `0355` (which reads the working tree and lists `package.json` as shipped): telemetry does not ship `package.json`, so this keeps the name tied to the tagged commit **without** letting an unrelated uncommitted `package.json` edit block a telemetry deploy. `node` missing → refuse with a clear message.
   - `DEPLOY_RECORD="${TELEMETRY_DEPLOY_RECORD:-$HOME/.geoconflict/telemetry-deploy.log}"`; `DEPLOY_VERSION=$(deploy_version_next telemetry "$VERSION_BASE" "$DEPLOY_RECORD")`.
   - Print `Deploy version: <name> (package.json <raw>, commit <sha>)`.
4. **One EXIT trap, `finalize_telemetry_deploy`, installed right after the preflight passes and before the first SCP** (mirror of `finalize_deploy`):
   - removes `SSH_PASSWORD_FILE` (folds in today's password-only trap, which the new trap would otherwise silently replace) and `LOCAL_TMPENV` (today a failing env-file SCP under `set -e` leaves that 0600 secrets file in `$TMPDIR` — fixed as a side effect of the single trap; flagged, not hidden);
   - appends the record block in **one** append: `----`, `timestamp=`, `env=telemetry`, `commit=`, `version=`, `package_version=`, then last line `validation_result=<ok|failed> git_tag=<outcome|skipped:deploy-not-completed>`. **No host, no secret, no operator** (brief: "No host, no secret").
   - append failure → warning only.
   - `trap 'exit 130' INT` / `trap 'exit 143' TERM` so a Ctrl-C still records the attempt.
   - Refusals and preflight failures happen **before** the trap → no record, no number used (nothing touched the box).
5. **Staged env:** add `export TELEMETRY_DEPLOY_VERSION='<name>'` and `export TELEMETRY_DEPLOY_COMMIT='<40-hex>'` to the existing 0600 heredoc (plain tokens, safe in single quotes).
6. **After the remote SSH returns 0:** `DEPLOY_OUTCOME=ok`; then a `TAGGING <name>` block copied in shape from `build-deploy-profile.sh`: `GIT_TAG_RESULT=interrupted` → off-remote-branch warning → `deploy_tag_and_push` with message `Telemetry server deploy <name>` / `version=` / `commit=` / `package_version=` / `validation_result=ok` (no host, no digest) → `pushed` / `push-failed` (WARNING + `git push origin refs/tags/<name>`) / `tag-failed` (WARNING, "never force it"). Never changes the exit code; never "fix by redeploying".
7. **DONE text:** `Deployed version: <name> (git tag: <outcome>)` and `On the box: cat /opt/uptrace/deployed-version`. Header comment updated (git now required; names the record file).
8. **Unchanged:** preflight logic and its order before the SCP; config dry-run; SSH/sshpass handling; every existing staged export; no lock added (see §6).

### 3.2 `setup-telemetry.sh`
- New function `write_deploy_version_marker` (defined beside `is_truthy`, so the harness can extract and run it):
  - version must match `^[0-9]+\.[0-9]+\.[0-9]+-telemetry\.[0-9]+$`, commit `^[0-9a-f]{40}$`; otherwise (unset — e.g. a hand run — or junk) that field is `unknown` and one warning names the variable, never echoing the value;
  - writes exactly two lines `version=…` / `commit=…` to a temp file in `$UPTRACE_DIR`, `chmod 644`, `mv` over `$UPTRACE_DIR/deployed-version` (atomic; never half-written).
- **Called once, just before `print_header "SETUP COMPLETE"`** — i.e. after every step succeeded under `set -e`. A setup that dies midway leaves the **previous** marker, which is the truth (the old config is what fully applied). One echo line: `Deployed version: <v> (marker: $UPTRACE_DIR/deployed-version)`.
- Header doc: add the two env vars; "What this script does" gains the marker step.
- **No image line, no other logic changed.**

### 3.3 `scripts/deploy-version-tag.sh`
- Header comment only: it says the telemetry deploy "is meant to reuse it" → now "reuses it". No function change. (It is in both shipped-path lists, so this edit is committed with the task anyway.)

## 4. Tests — written first, seen failing against the current scripts, then made to pass
### 4.1 Harness `tests/scripts/profile-deploy-hardening.test.sh`
**Stub/fixture changes (additive; profile tests keep their behaviour):**
- `scp` stub also captures `*.uptrace-deploy-env-*` to `$WORK/staged.env`.
- `git` stub answers `show <sha>:package.json` from `$WORK/pkg_version`; everything else unchanged (unknown calls still `exit 97`).
- New `run_telemetry_deploy` runner: copies the real `build-deploy-telemetry.sh`, the real `setup-telemetry.sh` (needed only as the uploaded file and for the Uptrace-version grep — it is never executed), the helper; `env -i` allow-list with synthetic Uptrace secrets, a documentation-range fixture address like the profile tests, a fixture SSH key file, `TELEMETRY_DEPLOY_RECORD` into `$WORK`. Same per-run unstubbed-git check and run counter as `run_deploy`.

**New behavioural tests T40–T53:**
- **T40 happy path:** rc 0; staged env has `TELEMETRY_DEPLOY_VERSION='0.0.155-telemetry.1'` + 40-hex commit; `git tag -a 0.0.155-telemetry.1 … <full sha>`; push `refs/tags/0.0.155-telemetry.1`; in `calls.log` the tag comes **after** the remote-run SSH; record block ends `validation_result=ok git_tag=pushed`, has `version=`/`commit=`/`package_version=`; **no host and no fixture secret anywhere in the record**; fixture `package.json` byte-identical.
- **T41 counter:** local `.1 .2`, remote `.9 .10` (+ `^{}` lines), record `.11` → `.12`; `0.0.155-profile.40`, `0.0.154-telemetry.50`, the old `pre-t4-…` tag ignored.
- **T42 dev base:** `0.0.155-dev.2` → `0.0.155-telemetry.1`.
- **T43 bad version** (`1.2`): exit ≠ 0, no SCP, no remote run, no record.
- **T44 uncommitted `setup-telemetry.sh`:** (Q1 = refuse) exit ≠ 0, path listed, "Commit, then redeploy", no SCP/remote run/tag/record. *(If Q1 = warn: rc 0, `version=untagged` in staged env + record, no tag, WARNING.)*
- **T45 uncommitted non-shipped files** (`ai-agents/…` and `src/…`): deploys and tags.
- **T46 remote setup fails** (`fail_deploy`): exit ≠ 0; record `validation_result=failed git_tag=skipped:deploy-not-completed` with `version=…telemetry.1`; no tag; the **next** run is `.2`.
- **T47 tag already exists:** rc 0, WARNING, `git_tag=tag-failed`, no push.
- **T48 push fails:** rc 0, WARNING with the retry line, `git_tag=push-failed`.
- **T49 `ls-remote` fails:** warning, still numbered from local tags + record.
- **T50 no git HEAD / `git status` fails:** both refuse before any SCP, no record.
- **T51 helper missing:** refuses before any SCP.
- **T52 wrong-role preflight:** aborts before SCP and writes **no** record (number not consumed).
- **T53 password fallback path:** deploy ok, password file mode 0600 during use and **gone after** both a success and a `fail_deploy` run (proves the merged trap kept today's cleanup), no password in any argv.
- **Across all telemetry runs:** no `-f`/`--force`/`--tags`/`--follow-tags` on any `git push`/`git tag`; zero unstubbed git calls.

**Marker (behavioural, function extracted and run in a temp dir, like the probe-token guard):**
- valid inputs → file is exactly the two lines, mode 644, nothing else in the dir but the file (temp cleaned);
- unset inputs → `version=unknown` / `commit=unknown` + warning;
- junk inputs (space, slash, a host-like string) → `unknown`, and the junk never appears in output or file.

**Structural:**
- the marker call appears exactly once, after the cron block and before `SETUP COMPLETE`, not inside a heredoc;
- `TELEMETRY_SHIPPED_PATHS` is one single-line array containing `setup-telemetry.sh`, `build-deploy-telemetry.sh`, `scripts/deploy-version-tag.sh`, and the dirty check calls the helper with it; no raw whole-tree `git status` in the telemetry script;
- the existing staged-hop loop (0284) gains `TELEMETRY_DEPLOY_VERSION` and `TELEMETRY_DEPLOY_COMMIT`;
- the existing 0355 lint loop (no `bump-version`, no `package.json` write, no forced/bulk push, no `git tag -f`, no `git commit`) is extended to `build-deploy-telemetry.sh`;
- the trap is installed after `DEPLOY-TARGET PREFLIGHT` and before `UPLOADING SETUP SCRIPT`.

**All existing checks stay green** — notably the preflight-before-SCP order, `sshpass -f`, the role marker, DEBIAN_FRONTEND order, certbot block, alert-probe block, probe-token guard, and the `uptrace/uptrace:2.0.2` ↔ comment coupling.

### 4.2 `tests/scripts/ShellHarnesses.test.ts`
- No change expected: the success marker stays `ALL PASS`. Only touched if §7's timing rule triggers — and then only by asking first.

## 5. Verification (local, this task)
1. **Red first:** new checks against the unchanged scripts → `SOME FAILED`, every failure in the new checks, every pre-existing check still ✅.
2. Harness green: `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`, count reported, wall time reported.
3. **Full `npm test`** (not a subset), as the brief requires; `ShellHarnesses.test.ts` must show the hardening harness passing (none skipped except the Docker-probed one if Docker is down — said explicitly). A supertest flake → check the `0197` signature first, re-run, and say that I re-ran.
4. `git diff setup-telemetry.sh` → no `image:` line changed. `git diff --quiet package.json package-lock.json` → unchanged.
5. `bash -n` on the three shell files. `shellcheck` is not installed on this host → said, not claimed.
6. A **mutation pass** in a scratch symlink mirror (real files untouched), each must turn the harness red: marker call moved before `compose up`; tag before the remote run; dirty check removed; trap installed after the first SCP; password-file removal dropped from the trap.
7. No real `git tag`/`git push`, no SSH, nothing deployed, nothing committed.

## 6. Edge cases and known limits
- **HEAD moves during the deploy** → tag goes on the captured commit.
- **Remote unreachable** → counter from local tags + record (ADR-117 Limit 3); a clash surfaces as a failed tag push, warned, never forced.
- **Commit not on origin** → warning; pushing the tag uploads it.
- **No lock** (telemetry never had one). Two concurrent telemetry deploys from one machine could pick the same N: both run setup on the box, the second git tag fails (`tag-failed`, warned), and the box marker could name either. Adding a `mkdir` lock like the profile's is ~10 lines but is a behaviour change outside the brief — not planned; say if you want it.
- **Check-then-upload window** (same as `0355` residual R3): an edit to `setup-telemetry.sh` after the dirty check but before the SCP ships unseen. Could be closed for telemetry by uploading the committed bytes (`git show <commit>:setup-telemetry.sh`) — not planned; say if you want it.
- **The tag pins our scripts, not the operator's `.env.telemetry` values** (retention days, memory ratio, swap size…). Two deploys of one version can apply different knob values. Recording those non-secret knobs would be a follow-up, not this task.
- **"ok" means the remote script exited 0** — container health inside it is already warn-only; unchanged.
- **Ssh drops after the remote script finished** → box marker says `.N`, record says `failed`. `.N` is still used up (recorded), so it is never reused for another commit.
- **Operational:** until this task's changes are committed, the real telemetry deploy will refuse (its own files are dirty) — same as `0355`. Weekend-slot rule applies.

## 7. Risk: harness time budget
- Today 68 s of the wrapper's 150 s deadline. ~16 new telemetry runs (no image build) are estimated at +10–25 s.
- Rule I will follow: measure before/after. **If the harness exceeds ~110 s wall time, stop and return NEEDS-DECISION** (options: raise the deadline, split the telemetry checks into a new registered harness, or trim) — I will not raise the load-bearing timeouts on my own.

## 8. Out of scope / follow-ups
- Profile server (done in `0355`), game server (`0357`), any third-party image version, Uptrace UI.
- Verify task filed at close by the producer, **top of Sprint 8**: tag on origin at the deployed commit; box marker = record = tag; Uptrace still answers. Weekend slot, owner-run.
- Wiki ingest after close.
- Optional follow-ups noted in §6 (lock, commit-exact upload, recording non-secret knobs).
