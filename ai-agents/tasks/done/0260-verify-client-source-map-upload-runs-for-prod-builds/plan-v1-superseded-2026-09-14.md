# Plan — task 0260 (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-14, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session.
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-14):
  1. **Real upload probe — "Approve + test upload"** (option A): the Build worker may run
     `npm run build-prod` + `node scripts/upload-sourcemaps.js` locally with the real DSN, keyed to HEAD's
     commit. No `build.sh`, no `docker push`, no deploy. Then confirm via the list query.
  2. **Uptrace login — yes** (option A, folded into the same approval): same read-only access path `0032`
     used (password piped over stdin from `.env.telemetry.secret`, never echoed; cookie jar in scratch,
     deleted afterwards).
  3. **Does the owner build prod from this machine?** — not asked separately. Context: the owner ruled
     2026-09-14 that they run the profile deploys from this laptop; `build-deploy.sh` runs locally. Treat
     hypothesis 1 as refuted for this machine only, as the plan already says.
  4. **Where the status line shows — "End of the whole deploy"** (option B): `build.sh` prints it AND
     `build-deploy.sh` repeats it as the very last line (build.sh writes the line to a temp file
     build-deploy.sh reads). This overrides the plan's recommendation A; Step C below is extended
     accordingly — `build-deploy.sh` is added to the files touched, and its test must cover the repeat.
- Brief correction (not a decision): the brief's claim that "a build alone publishes nothing" is false —
  `build.sh` pushes the image to Docker Hub and the Dockerfile uploads the source maps.

---

## Plan — task 0260, steps 1–2 (plus the status line from step 3 of "What to build")

### Evidence gathered this turn (read-only)

| Check | Result |
|---|---|
| `UPTRACE_SOURCEMAP_DSN` in the files `build.sh` loads | Present and non-empty in `.env.prod.secret` only. Shape: `http:` scheme, has a token, path `/`, `?grpc=` hint, no port. Same host as `OTEL_EXPORTER_OTLP_ENDPOINT`. |
| `PUBLIC_ORIGIN` | Set in `.env.prod`; equals `https://geoconflict.ru` |
| Upload code in `362a2f9` | Yes, `6d4e574` is an ancestor |
| Surviving build log | None. The local build history holds 50 records, all recent test builds or failed profile-image builds. |
| Telemetry certificate | Expired 2026-09-04 06:03 UTC (`0257`). `0.0.140` was built 08-29, before expiry. `0.0.141` (09-05) and `0.0.142`–`0.0.151` (09-12) were built after it. |
| Telemetry nginx | Upload path `location /` allows 64 MB, so no 413 expected. `uptrace.yml` has no `sourcemaps:` block, so the default (on) applies. |
| Uptrace docs | Upload is `POST /api/v1/sourcemaps` with header `uptrace-dsn: https://<token>@<host>/<project_id>`. Listing is `GET /api/v1/sourcemaps/<project_id>` (needs a user token). `minified_url` must match exactly, along with service name and version. Maps are applied when errors arrive; no sign of back-filling old data. |
| `build.sh` side effects | `docker push` at `:171`, plus the upload inside the Dockerfile. **Not a safe dry-run.** |
| Tests covering `upload-sourcemaps.js` or `build.sh` | None |

### Hypotheses, updated

1. ~~DSN missing~~ Refuted locally. Assumes the owner builds from this machine; `build-deploy.sh` runs locally, so this is likely but not proven.
2. ~~`PUBLIC_ORIGIN` unresolved~~ Refuted.
3. **Upload rejected. Open, and now the leading suspect for `0.0.140`.**
   - **3a:** the DSN header has no project id, so Uptrace 2.0.2 rejects it or files maps under nothing.
   - **3b (new, near-certain for `0.0.141`+):** TLS failure on the expired certificate.
4. **Uploaded but not matched. Open.** Possible causes: frame URL differs from `https://geoconflict.ru/js/<file>` (path, query string, a Yandex rehost); or the worker chunk has no map.

### Step A — Investigate (read-only first)

1. **Check the certificate is really fixed.** `0257` was agent-closed, not owner-verified. Check TLS validity and expiry date on the telemetry host without echoing the host. If it's still broken, stop: every upload fails, and this task is blocked on `0257` again.
2. **Uptrace read-only queries.** Log in the same way `0032` did (password piped over stdin from `.env.telemetry.secret`, cookie jar in scratch, deleted afterwards). **Needs owner OK, see NEEDS-DECISION 2.**
   - a. List stored source maps for project 1 (listing endpoint, or the internal API equivalent if the public one wants a user token). Does any map exist for `service_version` `362a2f9` or `b349210` (`0.0.151`)?
     - None for either → hypothesis 3 confirmed as the family.
     - Present for `362a2f9` → hypothesis 4.
   - b. Pull one `exception_stacktrace` sample for `362a2f9` and record one frame's exact URL. That's the `minified_url` shape to match against.
3. **Local build, no network.** `npm run build-prod`, writing only to the gitignored `static/`. It will overwrite the local dev output there.
   - List the emitted `*.js.map` files and the `*.js` files that have no map. Check the worker chunk `src_core_worker_Worker_worker_ts` in particular.
   - Confirm the URLs the script would build match the frame URL from 2b.
4. **Settle 3a without writing to Uptrace, if possible.** Read Uptrace 2.0.x's public source or docs for how the upload handler parses the DSN.
   - If still unclear, the only proof is a real upload. **See NEEDS-DECISION 1.**
5. **Record in `worklog.md`:** which hypothesis held, with the query or log line that proves it. No DSN, token or password anywhere.

### Step B — Fix the confirmed cause (only if small)

| Confirmed cause | Fix | Where |
|---|---|---|
| 3a: Uptrace needs a project id in the header | Add the project id to the `uptrace-dsn` header when the DSN lacks one: either `UPTRACE_PROJECT_ID` (default `1`, the seeded project) or a documented DSN format. `normalizeDsn` already keeps a path when one exists. | `scripts/upload-sourcemaps.js`; maybe a comment in `.env` docs. Owner edits `.env.prod.secret` if the DSN value itself must change; I never touch or read it. |
| 3b: certificate | Nothing to change in code (`0257` fixed it). Record it; the weekend build re-uploads for the new commit. | none |
| 4: URL mismatch | Build `minified_url` to match the real frame path (prefix or query string). | `scripts/upload-sourcemaps.js:64` |
| 4: worker or other chunk has no map | Make sure webpack emits maps for worker chunks. | `webpack.config.js` |
| Anything bigger (Uptrace 2.0.2 can't do uploads, needs a user token, needs a version upgrade) | **Stop. Return follow-up brief text. No code.** | none |

`|| true` and best-effort behaviour stay as they are (out of scope per the brief).

### Step C — One loud status line (step 3 of "What to build")

1. **`scripts/upload-sourcemaps.js`:** every exit path ends with exactly one line the build can read:
   - `[upload-sourcemaps] RESULT: status=skipped reason=<no-dsn|no-public-origin|invalid-dsn>`
   - `[upload-sourcemaps] RESULT: status=failed reason=<no-static-dir|no-maps|unexpected-error> uploaded=0 failed=N total=N`
   - `[upload-sourcemaps] RESULT: status=partial uploaded=X failed=Y total=N`
   - `[upload-sourcemaps] RESULT: status=succeeded uploaded=N failed=0 total=N`
   - "No maps" and "static dir missing" move from quiet skip to **failed**, since for a prod build that's a defect. The script still exits 0.
   - The line carries reasons and counts only, never the DSN or a message built from it. `invalid-dsn` already swallows the parse error; keep it that way.
2. **`build.sh`:**
   - Pipe the build output through `tee` into a temp log. Add it to the existing cleanup trap, replacing the single-file trap at `:124` so the iidfile cleanup isn't lost.
   - **Keep the build's own exit status.** Check `${PIPESTATUS[0]}`, or `set -o pipefail` around the call. Without this, `set -e` sees `tee`'s exit 0 and a failed build would carry on to push. **This is the main regression risk; a test must guard it.**
   - After the push, just before `BUILD COMPLETED`, print a `print_header "SOURCE MAP UPLOAD"` block and one line:
     - `✅ Source maps: succeeded — N uploaded (service_version=<commit>)`
     - `⚠️ Source maps: PARTIAL — X of N uploaded`
     - `❌ Source maps: FAILED (<reason>) — client stacks for this build will NOT resolve`
     - `⚠️ Source maps: SKIPPED (<reason>)`
     - `⚠️ Source maps: CACHED — upload step did not re-run in this build (earlier result unknown)`. This happens when the same commit is rebuilt: Docker reuses the upload step and re-uploads nothing. That case is a silent no-op today.
     - `⚠️ Source maps: UNKNOWN — no RESULT line in build output`. Covers `DOCKER_BUILD_PROGRESS` set to a mode other than `plain`, or a truncated log.
   - Parsing: `grep -o '\[upload-sourcemaps\] RESULT:.*'`, since plain output adds a `#N 1.23` prefix to each line. Detect cached by the upload step's `CACHED` marker.
   - Matches existing style: `print_header`, ✅/❌/⚠️. No new script.

### Tests

- **`tests/scripts/UploadSourcemaps.test.ts` (new, jest).** Runs `node scripts/upload-sourcemaps.js` with a temp `STATIC_DIR` and a local `http://127.0.0.1` mock server. Local hosts keep `http` on purpose (`normalizeDsn`), so nothing leaves the machine.
  - Cases:
    - no DSN → skipped
    - no origin → skipped
    - bad DSN → skipped
    - no maps → failed
    - all 200 → succeeded N, with the mock checking each request's `minified_url`, `service_name`, `service_version` and `uptrace-dsn` header
    - one 500 among several → partial
    - all 413 → failed
  - Checks exit code 0 in every case.
  - **Checks the fake DSN token never appears in stdout or stderr.**
  - Plus a test for whichever Step B fix lands (project id in header, or URL shape).
- **`tests/scripts/BuildShSourcemapStatus.test.ts` (new, jest).** Copies `build.sh` into a temp dir with:
  - a stub `docker` on `PATH` that prints canned plain-progress output and writes the iidfile;
  - a stub `scripts/check-docker-secret-boundary.sh`;
  - a `.env` with dummy `DOCKER_USERNAME`/`DOCKER_REPO` (the temp dir means the repo's real `.env*` never loads);
  - a stub `git`.
  - Cases: RESULT succeeded / failed / skipped / CACHED / missing → the right status line.
  - **The build stub exits 1 → `build.sh` exits non-zero and never calls `docker push`** (guards the `tee` exit-status risk).
- `npm test` in full, and `npm run lint`.
- ⚠️ Known flake risk: both new tests start a local server or spawn processes. `0200`'s traced hang reproduces in plain Node too, not just supertest. Keep the server per-test, add no retries, and if a timeout shows up, rule out `0197`'s segfault first per `CLAUDE.md`.
- Neither test touches `ShellHarnesses.test.ts`: they're jest `.ts` files, not `.sh` harnesses.

### Verification: what can be proven when

| Check | When | How |
|---|---|---|
| Which hypothesis held (verification step 1) | **Now** | Step A evidence in the worklog |
| Status line logic, exit status kept, no DSN in output (verification step 4) | **Now** | New jest tests |
| Uptrace accepts the upload and stores maps for a real commit | **Now only if NEEDS-DECISION 1 = real probe**; otherwise weekend | Script run locally with the real DSN (no `build.sh`, no push), then list API shows the maps |
| Prod build log shows `succeeded — N uploaded`, N > 0 (verification step 2) | **Weekend deploy** (owner's `build-deploy.sh prod`) | Build log line |
| Symbolicated frame for the new `service.version`, one frame before and after (verification step 3) | **After weekend deploy plus fresh errors** | Uptrace query |

So the task can't close before the weekend. Steps 2 and 3 of verification wait on the owner's deploy.

### Risks

- **`tee` hiding a build failure** (covered above). A broken check here could push an image that was never scanned or never built. Guarded by a test.
- **`build.sh` sits on the deploy path.** A bug in it blocks the weekend deploy. Keep the change additive, and have every parse path fall back to `UNKNOWN`, never an error exit.
- **Hypothesis 3a can't be settled without writing to Uptrace** if the source/docs don't say. Without the probe, the first real test is the weekend deploy, and a rejection found then misses that deploy.
- **Owner builds from another machine or env** → hypothesis 1 would be unrefuted there. Owner should confirm.
- **The Uptrace login** creates a session on the telemetry box, a small server-side write. Same access `0032` used.
- **The local `build-prod` overwrites `static/`**, which a running dev server uses.
- A catch-all error message could in theory contain request details. Today's messages use only the upload URL (host, no token). The token-leak test covers it.

### Files likely touched

- `scripts/upload-sourcemaps.js`
- `build.sh`
- `build-deploy.sh` (owner ruling 4 — repeat the status line as the last line)
- `tests/scripts/UploadSourcemaps.test.ts` (new)
- `tests/scripts/BuildShSourcemapStatus.test.ts` (new)
- Maybe `webpack.config.js` (only if the worker map is missing)
- `ai-agents/tasks/backlog/0260-verify-client-source-map-upload-runs-for-prod-builds/worklog.md`
- Not touched: `Dockerfile` (`|| true` stays), `.env*` (owner-only), the wiki.
