# Worklog — 0260

Build worker (`fkit-coder`, spawned by `fkit-sprint-ship-loop`), 2026-09-14. Plan: `plan.md` (blob
`b9184432`, hash re-checked this turn — matches).

## Outcome — STOPPED at Step A ("Anything bigger"). No code written.

**The deployed Uptrace (`uptrace/uptrace:2.0.2`) has no source-map upload endpoint.** Every upload
`0164`'s script has ever sent was answered `405 Method Not Allowed` — the same answer Uptrace gives
for a path that does not exist. Per the approved plan's Step B table ("Uptrace 2.0.2 can't do
uploads … needs a version upgrade") this is the stop row: follow-up brief text below, no code. Step C
(the status line) was **not** built — the spawn rule says "stop: … no code".

## Hypotheses — which held

| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| 1 | DSN missing locally | **Refuted** (this machine) | Plan-turn check; the real upload below loaded it and sent it. |
| 2 | `PUBLIC_ORIGIN` unresolved | **Refuted** | Plan-turn check. |
| 3 | Upload rejected | **HELD — but the cause is "endpoint absent", not a DSN/payload problem** | See probes 3–5. |
| 3a | Header lacks project id | **Refuted / moot** | Uptrace 2.0.2 `pkg/org/dsn.go` `ParseDSN` resolves the project from the token only (no project-id path needed); and the request never reaches a handler anyway (405 at the router). |
| 3b | TLS on the expired cert | **Moot now** (was real for builds 09-04..09-12) | Cert valid today, see probe 1. Even with TLS fine, every upload is 405. |
| 4 | Uploaded but not matched | **Refuted as the cause** — nothing is ever stored | `minified_url` shape is nonetheless correct: live frame `https://geoconflict.ru/js/vendors.<hash>.js:2:204597` equals the script's `PUBLIC_ORIGIN + /js/ + <file>`. `service_version` in spans is the full 40-char SHA, which is what `build.sh` passes (`git rev-parse HEAD`). |

## Probes (all read-only except the owner-authorized upload, ruling 1)

1. **Telemetry TLS** — strict `curl` (no `-k`): `http=200 ssl_verify=0`; `notAfter=Dec 13 08:18:40 2026 GMT`.
   `0257`'s renewal holds today. Host not recorded.
2. **Uptrace login** (ruling 2, same path as `0032`): `POST /internal/v1/users/login` → 200. Cookie jar in
   scratch, `logout` → 200, jar deleted. Listing candidates `GET /api/v1/sourcemaps/1`,
   `/internal/v1/sourcemaps/1`, `/internal/v1/projects/1/sourcemaps`, `/internal/v1/tracing/1/sourcemaps`
   all return the dashboard's HTML shell (SPA fallback, 1509 bytes) — **no listing route exists either.**
3. **Route-existence control (no credentials, writes nothing):**
   - `POST /api/v1/sourcemaps` (no DSN, no body) → **`405`**, empty body.
   - `POST /api/v1/zzz-nonexistent` (control: no such route) → **`405`**, empty body. *Identical.*
   - `POST /api/v1/vector-logs` (control: a route Uptrace 2.0.2 **does** register, same nginx) → **`400`**
     JSON `{"error":{"code":"unknown","message":"got content-type \"\" …"}}` — i.e. a registered POST
     reaches its handler through nginx. So the 405 is Uptrace's router, not nginx.
4. **Real upload** (ruling 1): local `npm run build-prod` (exit 0, 6 `.js` + 6 `.js.map` in `static/js`,
   every bundle has a map), then `node scripts/upload-sourcemaps.js` with `.env*` loaded in a subshell,
   `GIT_COMMIT` = HEAD (`8be434c…`). Output (host/token redacted by filter):
   ```
   [upload-sourcemaps] Uploading 6 source map(s) to https://<telemetry-host>/api/v1/sourcemaps (service_version=8be434cea50442b289b1dee7877166a9b143682d)
   [upload-sourcemaps] WARNING: failed to upload 679.25328153e28268b61157.js.map: 405 Method Not Allowed for https://geoconflict.ru/js/679.25328153e28268b61157.js
   … (same 405 for 983.*, app.*, main.*, runtime.*, vendors.*)
   [upload-sourcemaps] Done: 0 uploaded, 6 failed.
   ```
   This is the exact line a prod build log would have carried (hypothesis 3, verification step 1).
5. **Uptrace source, tag `v2.0.2`** (public repo, cloned to scratch, deleted): `grep -ri sourcemap` over all
   Go and Vue sources → **zero hits**; `/api/v1` registrations found are `vector-logs`, `prometheus`,
   `cloudwatch`, `public_handler` — no sourcemaps. `config/uptrace.dist.yml` has `sourcemaps: {disabled}`
   only, commented *"Sourcemaps require Internet access to download source maps"* — i.e. 2.0.x
   **fetches** maps over HTTP, it does not accept uploads. The same dist file is unchanged at `v2.0.3`,
   `v2.1.0-beta`, `v2.1.0-beta.8` and `master`. ⚠️ The public repo is evidently not the full product
   (config struct lacks even the `sourcemaps` key), so "no upload in any public tag" is **not** proof no
   release has it.
6. **Uptrace docs** (`uptrace.dev/features/sourcemaps`, `…/get/hosted/config`) describe
   `POST /api/v1/sourcemaps`, an `upload_disabled` option, and a fallback: *"fetches the minified JS
   file, looks for a `//# sourceMappingURL=` comment or `SourceMap` HTTP header, then fetches and parses
   the referenced map."* **No minimum version or edition is stated.** Unverified which self-hosted
   release (if any) ships the upload API.

## Why the fetch fallback does not rescue it either

`0164` deliberately closed that path: `webpack.config.js:184` `hidden-source-map` (no
`sourceMappingURL` comment), `Dockerfile` `rm -f static/js/*.map` (maps not in the image), and
`src/server/Master.ts:76` 404s `.map`. So on 2.0.2 neither path can resolve a frame. **Symbolication
has never worked for any build since `0164`** — not just `0.0.140`.

## Side effects of this run

- `static/` overwritten by the local prod build (gitignored). Any dev server using it needs a rebuild.
- One Uptrace login session (logged out). Six rejected POSTs to the telemetry box (nothing stored —
  the route does not exist).
- No `build.sh`, no `docker push`, no deploy, no `.env*` value read into this log or echoed.
- Repo: only this `worklog.md` written. (`scripts/check-config-parity.mjs` and
  `tests/scripts/ConfigParity.test.ts` show as modified in the tree — **not this worker's**; untouched.)

## Decision log

- **Obvious-winner calls: none.**
- **Fixes applied without asking: none** (no code written).
- Judgment exercised, recorded so it can be checked: I classified "endpoint absent in 2.0.2" as the
  plan's *"Anything bigger"* row and stopped, rather than building Step C alone. The spawn rule reads
  "stop: return follow-up brief text, no code", so the status line is left for the owner to re-scope
  (question raised in the return, not decided here).
- Extra probes beyond the plan's list: the credential-less `POST` route-existence controls (probe 3).
  Judged within ruling 1 because they are strictly weaker than the authorized real upload and store
  nothing; they are what separates "rejected" from "no such route".

## Follow-up brief text (for the producer — not filed by me)

> **Title:** Client source maps never resolve — Uptrace 2.0.2 has no upload API; pick a symbolication path
>
> **Context:** `0260` proved (worklog probes 3–5) that `POST /api/v1/sourcemaps` on the deployed
> `uptrace/uptrace:2.0.2` returns `405`, identical to a nonexistent route, while a registered POST route
> returns `400` through the same nginx. A real upload of 6 maps for HEAD: `0 uploaded, 6 failed` (all
> 405). The public v2.0.2 source has no sourcemap code; its config says 2.0.x *fetches* maps over HTTP.
> `0164` hid maps from HTTP (`hidden-source-map`, maps deleted from the image, `Master.ts` 404s `.map`),
> so **no build since `0164` has ever been symbolicated**. Workaround today: webpack keeps class/method
> names (`0032`).
>
> **Options to decide (owner):**
> 1. **Upgrade Uptrace** to a release that ships the upload API. ⚠️ Which release is unverified — docs
>    list `upload_disabled` but name no version; no public tag's dist config has it. First step would be
>    to confirm on a throwaway container. Cost: telemetry-box upgrade risk (it is low-RAM, OOM history).
>    Keeps `0164`'s "maps never public" property. Existing upload script likely works unchanged.
> 2. **Use the 2.0.2 fetch path, restricted:** serve maps only to the telemetry box (e.g. a `SourceMap`
>    response header pointing at a path allowlisted to that box's IP), keep them out of public reach.
>    No Uptrace upgrade; reverses part of `0164` (maps must stay in the image). Needs nginx + Master.ts
>    change and a check that Uptrace honours the header.
> 3. **Serve maps publicly** (`source-map` devtool, stop deleting/404ing). Simplest; exposes original
>    source to anyone — reverses `0164`'s explicit choice.
> 4. **Accept no symbolication**; remove the dead upload step so builds stop implying it works.
>
> **Also carry:** `0260` Step C (one loud `build.sh`/`build-deploy.sh` status line) is still worth
> doing under options 1–2 — today's failure printed 6 WARNING lines nobody reads.
>
> **Not in scope:** making upload failure fail the build (`0164`'s deliberate choice).

## Rescope 2026-09-14

Owner ruling (via `AskUserQuestion` in the lead session, relayed by `fkit-sprint-ship-loop`): **"Accept
none for now"** — remove the dead upload step, close `0260` as investigation-only, file a Backlog task
to revisit (upgrade or private download). Class/method names survive in minified stacks (`0032` used
them).

Plan-only `fkit-coder` spawn, same day: surveyed every place the upload lives and returned a removal
plan to the driver. **No source written; no `plan.md` written** (driver writes it after approval).
Read-only checks this turn: repo-wide `git grep` for the upload/DSN/`PUBLIC_ORIGIN`; baseline
`npm run check:config-parity` output (game REQUIRED 0 / INFO 6 / ALLOWED 4; profile 0/0/0; client
REQUIRED 0 / INFO 1 / ALLOWED 15 / INERT 4) — note it was taken over `0203`'s **uncommitted**
checker changes in the tree. No test or harness references the upload. Step C (status line) is
dropped by the ruling — nothing left to report on.

## Build — removal (2026-09-14)

Build worker (`fkit-coder`, spawned by `fkit-sprint-ship-loop`). Plan: `plan.md` blob
`e9436d57b7e8f7ac9e328ea9cf226f2d829d8eab`, 8350 bytes — `git hash-object` re-checked this turn, matches.

### What changed (plan rows 1–13)

- `scripts/upload-sourcemaps.js` — **deleted** (recoverable from git, `6d4e574`).
- `Dockerfile` — removed `ARG`/`ENV PUBLIC_ORIGIN` (+ its comment), the `COPY` of the script, and the
  `RUN --mount=type=secret,id=uptrace_sourcemap_dsn … node scripts/upload-sourcemaps.js || true` step.
  Upload comment replaced by the plan's one line. `RUN rm -f static/js/*.map` kept (ruling 2).
- `build.sh` — removed the `PUBLIC_ORIGIN` resolution block (incl. the `PUBLIC_HOST_<ENV>` `eval`s and
  the "upload will be skipped" warning), the `SOURCEMAP_SECRET_ARG` block, and the two
  `docker buildx build` lines (`--build-arg PUBLIC_ORIGIN`, `"${SOURCEMAP_SECRET_ARG[@]}"`).
  `uppercase_env` / `resolved_*` had no other reader (grepped). Everything else untouched.
- `eslint.config.js` — removed the `allowDefaultProject` entry.
- `example.env` — removed `UPTRACE_SOURCEMAP_DSN=` and `PUBLIC_ORIGIN=` with their comments.
- `webpack.config.js` — comment only; `devtool: "hidden-source-map"` unchanged.
- `src/client/OtelBrowserInit.ts` — comment only; `"telemetry.sdk.language": "webjs"` kept.
- `ai-agents/knowledge-base/architecture.md` — both passages now say: not symbolicated, upload removed by
  `0260`, revisit task pending. (Also dropped the stale line-number refs in the first passage, since the
  cited Dockerfile lines moved.)

Not touched: `Master.ts` `.map` 404, `setup-telemetry.sh`, any `.env*` file, `0203`'s checker files,
other agents' task/sprint files (several appeared modified/staged in the tree during this run — not
this worker's).

### Verification

1. `git grep -n -i -E 'upload-sourcemaps|UPTRACE_SOURCEMAP|uptrace_sourcemap_dsn|PUBLIC_ORIGIN' -- ':!ai-agents'`
   → **zero hits** (exit 1).
2. `bash -n build.sh` → exit 0.
3. `npm run lint` → exit 0, no output.
4. `npm test` → exit 0. **122 suites / 1298 tests passed**, no skips (Docker up, so the secret-boundary
   harness ran). No flake, no re-run.
5. `npm run check:config-parity` — baseline taken right before editing, re-run after: `diff` →
   **identical** (game 0/6/4; profile 0/0/0; client 0/1/15, INERT 4). Both runs over `0203`'s
   uncommitted checker.
6. Local Docker build, no push:
   - Plain native `docker build -t geoconflict-0260-check:local .` → **failed at `RUN npm ci`**:
     `canvas` has no `linux/arm64` prebuild and the slim image has no Python for `node-gyp`. This is
     **pre-existing and unrelated** — `npm ci` runs before every line this task touched, and
     `package*.json` are unchanged. It never reached the edited steps.
   - Retried once with `--platform linux/amd64` (the prod platform; still plain `docker build`, local,
     no push) → **exit 0**. Build log shows `[build 7/9] RUN npm run build-prod` then
     `[build 8/9] RUN rm -f static/js/*.map`; no upload/secret step.
   - `docker run --rm --platform linux/amd64 --entrypoint sh … -c 'ls static/js/ && ! ls static/js/*.map'`
     → exit 0: 6 bundles (`679`, `983`, `app`, `main`, `runtime`, `vendors`) + `vendors…LICENSE.txt`, no `.map`.
   - `./scripts/check-docker-secret-boundary.sh --inspect-image geoconflict-0260-check:local` → exit 0,
     "Per-layer byte scan passed".
   - `docker rmi geoconflict-0260-check:local` → removed; `docker images` lists nothing for it.
   - Still not tested: `build.sh`'s `docker buildx build --load` / `--iidfile` path (only `bash -n` + eye).
     Build cache from both attempts remains in Docker (no image).
7. By eye, `grep -n -A12 'docker buildx build' build.sh`: `--platform`, 4× `--build-arg`, `--metadata-file`,
   `-t`, `--iidfile`, `--progress`, `--load`, `.` — every line but the last ends in ` \`, last is `.`. Correct.

### Decision log

- **Fixes applied without asking: none** (no review in this unit; the edits are the approved plan).
- **Obvious-winner call: 1.** Verification 6 as written (native platform) could not run past `npm ci`
  on this arm64 host for a pre-existing reason. I retried once with `--platform linux/amd64`. Why it
  qualified: the plan's intent for step 6 is "exercise the Dockerfile"; amd64 is the platform prod
  actually builds, so it is strictly closer to the deploy path; it stays inside ruling 3's limits
  (plain `docker build`, local only, no push, no `build.sh`, image removed after). Deviation from the
  letter: two build invocations instead of one, and a non-native platform. If the owner meant "one"
  literally, this is the call to check.
- Plan deviation, minor: `architecture.md` first passage lost its `:line` refs (they pointed at lines
  this change moved). Wording otherwise as the plan's row 13.

### Hand-off — revisit Backlog brief text (for the producer to file; not filed by me)

> **Title:** Revisit client source-map symbolication (Uptrace upgrade or private map download)
>
> **Context:** `0260` proved (worklog probes 3–5) that the deployed `uptrace/uptrace:2.0.2` has no
> source-map upload API: `POST /api/v1/sourcemaps` returns `405`, identical to a nonexistent route,
> while a registered POST returns `400` through the same nginx; a real upload of 6 maps went
> `0 uploaded, 6 failed`. 2.0.x *fetches* maps over HTTP instead, but `0164` hid them (`hidden-source-map`,
> maps deleted from the image, `Master.ts` 404s `.map`). **No build since `0164` was ever symbolicated.**
> Owner ruled "accept none for now"; `0260` removed the dead upload. Today minified client stacks keep
> class/method names only (`0032`).
>
> **Options (owner decides):**
> 1. **Upgrade Uptrace** to a release that ships the upload API. ⚠️ Which release is unverified — the docs
>    list `upload_disabled` but name no version; no public tag's dist config has it. First step: confirm on
>    a throwaway container. Cost: upgrade risk on the low-RAM telemetry box (OOM history). Keeps `0164`'s
>    "maps never public".
> 2. **Use 2.0.2's fetch path, restricted:** serve maps only to the telemetry box (e.g. a `SourceMap` header
>    pointing at a path allowlisted to that box's IP). No upgrade; maps must stay in the image (reverses
>    part of `0164`). Needs nginx + `Master.ts` changes and a check that Uptrace honours the header.
>
> **To restore (either option):** restore `scripts/upload-sourcemaps.js`, the Dockerfile step, the
> `build.sh` secret arg and `PUBLIC_ORIGIN` from git (`6d4e574`); re-add `0260`'s Step C status line
> (one loud build status line — the old failure printed 6 WARNING lines nobody read).
> Also: `setup-telemetry.sh`'s `client_max_body_size 64m` "Source map uploads" comment is stale today.
>
> **Not in scope:** making upload failure fail the build (`0164`'s deliberate choice).

## Process-review — round 1 coder response (2026-09-14)

Process-review worker (`fkit-coder`, spawned by `fkit-sprint-ship-loop`). Ledger `review.md` was already
`closed-out` with owner rulings R1–R4. I checked each finding against the files and wrote only the
*Coder response* rows. No source, doc or script changed.

### Decision log

- **Fixes applied without asking: none.**
- **Obvious-winner calls: none.**
- Verdicts:
  - R1: CORRECT, routed to `fkit-wiki`.
  - R2: CORRECT, routed to the producer (a note on 0203's brief).
  - R3: PARTIALLY CORRECT. The "pending" wording is only in `architecture.md`; the code comments don't
    depend on the brief existing. Routed to the producer, to file at close.
  - R4: CORRECT, frontier, already an accepted residual.
- None of the four is a code defect, so no NEEDS-DECISION.
