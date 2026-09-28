# 0298 — Config-parity guard: first real report-only production run, then arm `--enforce` (plan)

**Summary**
- **Part A is almost closed, checked by the planner.** The name guard's output is fixed by the committed code, so it was re-run on the code behind the three prod deploys of 2026-09-26 (`0.0.152`, `0.0.153`, `0.0.154`). All three match what was relayed from W12: REQUIRED 0 on game, profile and client; game INFO 6, client INFO 1; zero SKIP, PARSE-FAILURE or DYNAMIC-READ lines.
- **One gap remains in Part A:** the value guard's output for `0.0.153` and `0.0.154` was never relayed, and it cannot be reproduced without the prod settings file. W12's run is the one the brief requires, so this does not block anything.
- **A real gap in the checker:** per-deploy blocking cannot be done from the call sites as the brief assumes. `failsClosed` (`scripts/check-config-parity.mjs:1344-1351`) fails on any tagged finding, and `requiredTotal` counts every pipeline. So a small checker change is needed: a new `--block-on=` flag.
- **Existing tests will go red on purpose** once the wiring changes. They pin the current report-only behaviour: `ConfigValues.test.ts:868` and `:910-922`. The profile hardening harness copies the deploy script without the checker (`profile-deploy-hardening.test.sh:115-155`); under the "missing guard script stops the deploy" ruling (R4b), every run there would fail. The plan covers all of these.
- **The hardening harness already has 117 lines of uncommitted changes from another task.** The build must edit on top of them and not overwrite them.

**Local run: `npm run check:config-parity` on the current tree (names only)**

```
pipeline: game    REQUIRED 0 · INFO 6 (DOCKER_TOKEN, OTEL_USERNAME, OTEL_PASSWORD, OTEL_ENDPOINT, BASIC_AUTH_USER, BASIC_AUTH_PASS) · ALLOWED 4
pipeline: profile REQUIRED 0 · INFO 0 · ALLOWED 2   (was 0 at 0.0.152; +NAME_CHANGE_DECISION/REASON from 0312)
pipeline: client  REQUIRED 0 · INFO 1 (WEBSOCKET_URL) · ALLOWED 15
INERT 11 · no SKIP / PARSE-FAILURE / DYNAMIC-READ · report-only — exit 0
```

With `--enforce`, the current tree exits 0 for `--pipeline=all`, for `--pipeline=game,client` and for `--pipeline=profile`. `0325` reuses `YANDEX_PAYMENTS_SECRET`, which is read only by the profile server and already passed through both profile steps. It adds no new setting name, so arming does not change because of it.

---

### Evidence

| What | Where |
|---|---|
| Game name-guard call site, report-only; missing script or missing node skipped silently | `deploy.sh:44-62` (call `:60-61`) |
| Value-guard function; a missing checker returns 0 | `deploy.sh:82-98` |
| Value-guard call, after the `update.sh` copy | `deploy.sh:332`; copy at `:289-312` |
| `build-deploy.sh` commits, tags and pushes a version bump, then builds and pushes the image, **before** `deploy.sh` runs | `build-deploy.sh` STEP 0 / 0.5 / 1 / 2 |
| Profile call site: before env loading, before the image build (`:173`) and before the lock (`:311`) | `build-deploy-profile.sh:54-74` |
| Only the unconditional footer uses the finding tags; nothing reads them to decide the exit | `check-config-parity.mjs:167-170`, `:1344-1351`, `:1430-1436` |
| Argument parsing | `:1441-1474` |
| `main` exit | `:1476-1506` (an error in `analyse` under `--enforce` exits 1) |
| `analyse` works only on the selected pipelines, but `src/` scan findings cover all of them | `:1043-1122` |
| Value guard's fail rule (REQUIRED, VALUE-UNKNOWN, PARSE-FAILURE, SKIP) | `check-config-values.mjs:393-400` |
| `OTEL_AUTH_HEADER` is optional by design: the header is added only when the value is set | `src/server/Logger.ts:23`, `OtelTracing.ts:14`, `WorkerMetrics.ts:33` (the exporter is still created without it) |
| The only `OTEL_AUTH_HEADER` allowlist entry today is a client `server-only` phase-1 entry | `config-parity-allowlist.json:172` |

### Part A: first real report-only run (mostly evidence already in hand)

Writes go to the task folder's new `worklog.md`, names and verdicts only.

1. **Name guard: reproduced.** The checker was run from `git archive` of tags `0.0.152`, `0.0.153` and `0.0.154` into a scratch folder (read-only for the repo).
   - Output is identical to the W12 relay.
   - Zero PARSE-FAILURE, DYNAMIC-READ or SKIP.
   - ⇒ **`0064`'s prediction of zero required gaps HELD, measured on three real deploys.**
2. **W3/W7 (profile deploys): inferred, not captured.** The code at `f67c2dd` differs from `0.0.152` only in the version bump, and `f67c2dd` was committed before W3. So W3/W7 ran the same checker over the same tracked files, **if the tree was clean then**. That was not recorded. ⚠️ Flag this as inferred, not captured.
3. **INFO lines, all understood.** INFO can never block (`failsClosed` leaves it out).
   - `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`, `OTEL_USERNAME`, `OTEL_PASSWORD`, `OTEL_ENDPOINT`, `DOCKER_TOKEN`: each appears only in `deploy.sh` and nothing on the box reads it. Explained in `0064/plan.md:142`; `DOCKER_TOKEN` hygiene is already `0045`/`0047`.
   - `WEBSOCKET_URL`: webpack substitutes it and nothing reads it (`0064` review R2).
   - ⚠️ Side note, **not** fixed here: the `BASIC_AUTH_*` values sent by `--enable_basic_auth` reach nothing. That flag gives no protection on the game box. A producer brief is suggested for it; not filed by the planner.
4. **Value guard (W12):** one REQUIRED line, `OTEL_AUTH_HEADER — forwarded but EMPTY`. Explained by the repo evidence above. It is resolved by owner question Q1, not by a quiet allowlist entry.
   - `PROFILE_INTERNAL_TOKEN` did **not** appear as REQUIRED at W12, and W13 found it non-empty in the container, so it is present.
   - `0.0.153`/`0.0.154` value-guard output: not relayed (see summary).
5. **No values leaked.** The relayed W12 lines carry names only, and the relay found no `PROFILE_INTERNAL_TOKEN=` string. The worklog records this with the stated source ("as relayed").

### Part B: arm `--enforce` (coder)

**B1. Checker: per-deploy blocking** (`scripts/check-config-parity.mjs`)
- Add `--block-on=<pipelines>`. It needs `--enforce`; given with `--report-only` it is a usage error (exit 2, loud).
- `failsClosed(result, blockOn)` fails when:
  - any `required` exists in a pipeline in `blockOn`; or
  - any parse failure, dynamic read or skip has tag `"global"`, or a tag that overlaps `blockOn`.
- Without `--block-on`, behaviour is unchanged: fail on everything. So every existing test keeps its meaning.
- The call sites keep `--pipeline=all`, so other pipelines' findings are **still analysed and printed** (R14: "print loudly, don't block").
- The footer uses the same one function (R16):
  - `enforce (blocking: game, client) — failing on the findings above`, or
  - `enforce (blocking: …) — no blocking findings; N finding(s) for other deploys printed above, not blocking`.
- Update the header EXIT CONTRACT (`:28-55`): wired at both call sites, with per-deploy blocking.
- A `core/configuration` finding carries `game, client`, so it blocks the game deploy and not the profile deploy, as ruled.

**B2. `deploy.sh`: name guard** (`:44-62`)
- A missing script → `exit 1` with a clear message (R4b).
- A missing `node` → `exit 1` too. ⚠️ **Planner's assumption**: "the guard could not run" is treated like "the guard is missing". Owner may object at plan approval.
- Run `node … --pipeline=all --enforce --block-on=game,client`. A non-zero exit → `exit 1`, with a message naming the fix path (allowlist entry with a reason, or the `DIR_PIPELINE` line).
- Placement unchanged: before the first env load, so no secret is in the shell.
- Rewrite the "cannot fail a deploy" comment.

**B3. `deploy.sh`: value guard** (only if Q1 = arm both)
- Inside `run_config_value_guard`, each of these now returns non-zero with a message: a missing checker, a missing node, `--list-sources` failing, or an empty source list.
- Run the checker with `--enforce` and `return` its exit status explicitly.
  - ⚠️ bash detail: `set -e` is **switched off** inside a function called from an `||` context, so nothing may rely on it here.
- Call site: `run_config_value_guard || { echo "…refusing to deploy"; exit 1; }`.
- Placement stays after the `update.sh` copy (`:312`). The copy is a harmless remote write that `0064` flagged for this task to judge; judged acceptable. Prod is untouched until the ssh at `:334`.

**B4. `build-deploy-profile.sh`** (`:54-74`)
- Same shape as B2, with `--block-on=profile`.
- Remove the comment at `:69-71` ("the -f guard also keeps this silent inside the harness") and put the harness fixture in its place (B6).
- The profile on-box value report (`setup-profile.sh:820-974`, task `0220`) **stays report-only**. It is outside the brief's two call sites. Arming it would need its own task.

**B5. Early check in `build-deploy.sh`** (only if Q3 = yes)
- Before STEP 0, run the name guard with the same flags as B2, and add the same missing-script and missing-node stop.
- `deploy.sh` keeps its own check, because it can be run on its own.

**B6. Allowlist** (only if Q1 = A)
- Add a `game` / `optional` / `phase: 2` entry for `OTEL_AUTH_HEADER`, with a reason that cites the three file:line references and the collector-side evidence already recorded in the brief (`setup-telemetry.sh:452-477`, `:886-887`).
- This makes the value guard's OPTIONAL count 6 and INERT 12.

### Tests (`src/core` is untouched; shell harness rules apply)

**`tests/scripts/ConfigParity.test.ts`: new describe "0298 — per-deploy blocking", one test per ruled rule, each run under `--block-on=game,client` and `--block-on=profile`:**

| Case | Game deploy | Profile deploy |
|---|---|---|
| R4a: unmapped `src/newdir` (global) | blocks | blocks |
| Broken allowlist JSON (global) | blocks | blocks |
| Missing allowlist, `src/` missing | blocks | blocks |
| R14: profile-tagged scan PARSE-FAILURE | passes, and prints it | blocks |
| R14: game-tagged scan PARSE-FAILURE | blocks | passes |
| `core/configuration` DYNAMIC-READ | blocks | passes |
| R13: game heredoc PARSE-FAILURE | blocks | passes |
| R19: tagged DYNAMIC-READ | blocks its own deploy only | blocks its own deploy only |
| REQUIRED in profile | not blocked, printed | blocks |
| Computed or spread DefinePlugin key | blocks (client) | passes |
| Missing `setup-profile.sh` (profile SKIP) | passes | blocks |

Also:
- `--block-on` together with `--report-only` → exit 2.
- An unknown pipeline name in `--block-on` → exit 2.
- The footer matches the exit code in every case (R16 pattern).
- Real tree: `--enforce --block-on=game,client` and `--block-on=profile` both exit 0.
- Mutation check: turn off the tag filter → the R14 cases go red.

**Call-site end-to-end tests (jest, new; bash on a scratch copy, stub `ssh`/`scp`/`docker` that log if called):**
- `deploy.sh` copied into a fixture tree with **the real checker** and a seeded game gap → non-zero exit, and ssh/scp/docker are **never** called (verification step 3, first half).
- Missing checker → stops. `node` not on PATH → stops.
- A profile-only finding → the game guard passes.
- Clean real tree → exits 0 (step 3, second half).
- The same failing cases for `build-deploy-profile.sh`, which exits before any build.

**`tests/scripts/ConfigValues.test.ts`: updated deliberately (these tests exist to pin report-only):**
- `:868` "absent → skips silently, returns 0" becomes "absent → stops, non-zero, message".
- `:910-922` becomes the new `|| { … exit 1; }` call shape.
- The H prod test expects a non-zero exit and the `enforce` footer.
- New: `--list-sources` failure → stop.
- If Q1 = A: `SHIPPED_OPTIONAL` (`:135`) gains `OTEL_AUTH_HEADER`, test `:935` says "six", OPTIONAL 5 → 6.
- `ConfigParity.test.ts:2207` inert list gains `OTEL_AUTH_HEADER` (11 → 12).

**`tests/scripts/profile-deploy-hardening.test.sh`** (on top of the uncommitted edits):
- `run_deploy` writes a stub `scripts/check-config-parity.mjs` that exits 0, like the existing secret-boundary stub.
- New checks:
  - A stub that exits 1 → the deploy fails closed and docker is never called.
  - A missing checker → fails closed.
  - Grep: the call site has no `|| true` and passes `--enforce --block-on=profile`.
- ⚠️ The harness's success marker must stay as it is (`ShellHarnesses.test.ts` checks it).

**Gate:** `npm test` green, including `ShellHarnesses.test.ts`; `npm run lint` exit 0. If a supertest-style timeout shows up, check it against the known-flake signature, re-run once, and say so.

### Docs (not the wiki)
- `CLAUDE.md` line for `check:config-parity`: add that the deploys now enforce.
- `weekend-deploy-slot-runbook.md` W12 pointer.
- Task `worklog.md`: the Part A record and the Part B change list.

### What the owner runs (placeholders only)
1. **Before build (only if Q1 = A):** in Uptrace, confirm prod game-server logs or metrics arrived after 2026-09-26 (`0.0.152`+ runs with the header blank). This is a UI check the planner cannot do. It closes the brief's caveat "repo config, not the live box".
2. **After review, commit on the owner's word.** Then the first armed deploys, in the order below.
3. **Rollback, if a false block appears:** restore `--report-only || true` on the one call-site line (and `run_config_value_guard || true`), commit, redeploy. Or add an allowlist entry with a reason.

### Deploy order
1. **Profile first:** `npm run deploy:profile`. Its guard runs before the image build and before the lock, so a block costs nothing and the box is untouched.
2. **Game dev** (`./build-deploy.sh dev`), if a dev box is still in use. The name guard plus the value guard's wiring checks run there; value rules are prod-only.
3. **Game prod:** `./build-deploy.sh prod`. ⚠️ Without Q3's early check, a block here comes **after** a pushed version tag and a pushed image, with prod untouched. ⚠️ This deploy ships the whole working tree, so the first armed deploy also carries whatever else is committed.
4. Record each first armed run's guard output (names only) in the worklog, which closes verification step 5.

### Risks and edge cases
- A dirty tree at W3/W7 would make the reproduced output inexact: named, not proven.
- A new `src/` folder added by later sprint work will block **every** deploy under R4a until `DIR_PIPELINE` is updated. That is the rule as ruled; the message names the one-line fix.
- `--enable_basic_auth` deploys with blank `BASIC_AUTH_*` still exit at `deploy.sh:322-325` before the value guard. Unchanged.
- The value guard judges values only on prod. dev/staging can block only on wiring faults.
- If `0325` or later work adds a new setting that the **game server** reads (not the profile server), the game deploy blocks until it is passed through. That is the guard working.

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (value guard blocks too?):** "Arm both; password may be blank (Recommended)" — After you confirm in Uptrace that production game-server data still arrives. From then on a blank required setting or non-https address stops a production deploy. ⇒ B3 and B6 apply.
- **Q2 (emergency override?):** "No override (Recommended)" — Fix a wrong block with a one-line allowlist entry (with a reason) or a one-line revert — both visible in git. Like your 'no escape hatch' ruling for the test harnesses.
- **Q3 (early name check in build-deploy.sh?):** "Yes, check names first (Recommended)" — Name problems stop before anything is pushed. Value problems still waste a version number (they need loaded settings). ⇒ B5 applies.
- **Assumption accepted with approval:** a missing `node` stops the deploy, the same as a missing guard script.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
- **Sequencing note (lead):** the build waits for task 0285's build to finish, because both edit `tests/scripts/profile-deploy-hardening.test.sh`. The owner's Uptrace check (Q1) gates the first armed **production** deploy.
