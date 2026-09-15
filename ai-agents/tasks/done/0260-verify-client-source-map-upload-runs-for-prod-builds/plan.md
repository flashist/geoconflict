# Plan — task 0260 rescope: remove the dead source-map upload (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-14, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session.
- Supersedes the first approved plan (kept as `plan-v1-superseded-2026-09-14.md`), whose Build stopped at
  Step A's "Anything bigger" row: Uptrace 2.0.2 has no source-map upload endpoint.
- Owner rulings (2026-09-14):
  1. Direction — **"Accept none for now"**: remove the dead upload step, close 0260 as investigation-only,
     file a Backlog task to revisit (upgrade or private download).
  2. NEEDS-DECISION (generation) — **"Approve, keep generating"** (option A): keep
     `devtool: "hidden-source-map"` and `RUN rm -f static/js/*.map`; fix only the comments.
  3. Local Docker build in verification 6 — **"Yes"**: one plain `docker build`, no push, image removed after.

---

## Approval context
- Owner ruling 2026-09-14: **"Accept none for now."** Remove the dead upload step, close `0260` as investigation-only, and file a Backlog task to revisit it (upgrade Uptrace, or a private download path).
- Evidence that the step is dead is in `worklog.md` probes 3–5: Uptrace 2.0.2 returns `405` for the upload path, the same as for a path that doesn't exist.
- Step C (the loud status line) is dropped. With no upload, there is nothing to report.

## Where the upload lives (repo-wide `git grep`, excluding `ai-agents/`)

| # | Location | What it is | Action |
|---|---|---|---|
| 1 | `scripts/upload-sourcemaps.js` | The upload script. Nothing imports it; only the Dockerfile runs it. | **Delete** (it stays recoverable from git, `6d4e574`) |
| 2 | `Dockerfile:41` | `COPY scripts/upload-sourcemaps.js …` | **Delete the line** |
| 3 | `Dockerfile:51-54` | `RUN --mount=type=secret,id=uptrace_sourcemap_dsn … node scripts/upload-sourcemaps.js \|\| true`. This is the only BuildKit secret mount in the file. | **Delete the whole step** |
| 4 | `Dockerfile:28-31` | `ARG PUBLIC_ORIGIN` / `ENV PUBLIC_ORIGIN`. Only the upload used it. | **Delete** |
| 5 | `Dockerfile:46-50` comment above the upload | Explains the upload and the `rm` | **Rewrite** to cover only the `rm`; see Step 3 |
| 6 | `build.sh:84-100` | Works out `PUBLIC_ORIGIN` (including the `eval` of `PUBLIC_HOST_<ENV>`) and prints the "source map upload will be skipped" warning | **Delete the block** |
| 7 | `build.sh:102-107` | Builds `SOURCEMAP_SECRET_ARG` from `UPTRACE_SOURCEMAP_DSN` | **Delete** |
| 8 | `build.sh:132-133` | `--build-arg PUBLIC_ORIGIN=…` and `"${SOURCEMAP_SECRET_ARG[@]}"` inside the `docker buildx build` continuation | **Delete both lines, keeping the `\` chain intact** |
| 9 | `eslint.config.js:34` | `"scripts/upload-sourcemaps.js"` in `allowDefaultProject` | **Delete the entry** |
| 10 | `example.env:65-76` | `UPTRACE_SOURCEMAP_DSN=` and `PUBLIC_ORIGIN=` with their comments | **Delete both** |
| 11 | `webpack.config.js:180-183` | Comment says the maps are "uploaded to Uptrace at build time… see scripts/upload-sourcemaps.js" | **Rewrite the comment only**; `devtool` stays `hidden-source-map` (owner ruling 2) |
| 12 | `src/client/OtelBrowserInit.ts:43-46` | Comment "The uploaded maps are keyed by service.version" | **Rewrite the comment only.** Keep `"telemetry.sdk.language": "webjs"`: it costs nothing and any future fix needs it |
| 13 | `ai-agents/knowledge-base/architecture.md:459, :686` | Say maps are uploaded and that `UPTRACE_SOURCEMAP_DSN` + `PUBLIC_ORIGIN` symbolicate | **Edit to say:** not symbolicated, upload removed by `0260`, revisit task pending |

**Checked and found nothing (no change needed):**
- `package.json`: no upload script (`build-prod` is plain webpack).
- `build-deploy.sh`, `deploy.sh`, `update.sh`.
- `scripts/check-docker-secret-boundary.sh`: its `--runtime-image-check` builds `--target runtime-source` and never touches the upload secret.
- `scripts/test-check-docker-secret-boundary.sh`.
- `tests/**`, including `ShellHarnesses.test.ts`, `profile-deploy-hardening.test.sh` and `ConfigParity.test.ts`.
- `.dockerignore`, `.github`.

## Left untouched (on purpose)
- **`src/server/Master.ts:76`** keeps returning 404 for `.map`. `0164`'s privacy stance ("do not serve source maps publicly") stays.
- **`Dockerfile` `RUN rm -f static/js/*.map`** stays (owner ruling 2).
- **`setup-telemetry.sh:857-859`** keeps `client_max_body_size 64m` and its "Source map uploads" comment. Editing it changes nothing on the running box until someone re-runs setup, and the hardening harness greps that file. The stale comment is left for the revisit task to handle.
- **Owner env files** (`.env.prod.secret` holds `UPTRACE_SOURCEMAP_DSN`; `.env.prod` holds `PUBLIC_ORIGIN`): not read, not edited. After this lands nothing reads either one, so the owner may delete both.
- **Out of the worker's reach, for the driver to route:**
  - The wiki page `systems/telemetry` and wiki task `s4c-enable-client-source-maps` → `fkit-wiki` ingest after close.
  - The owner's auto-memory `project_uptrace_sourcemaps.md` (and its MEMORY index line) is stale.

## Steps (in order)
1. **Delete the script**: `scripts/upload-sourcemaps.js`.
2. **`build.sh`**: delete rows 6–8. Keep the rest exactly as is: `set -e`, env loading, the boundary check, the iidfile, the byte scan, re-tag, push.
3. **`Dockerfile`**: delete rows 2–4. Replace the upload comment with one line: `# Drop source maps so .map files are never shipped/served (0164 privacy; upload removed in 0260 — Uptrace 2.0.2 has no upload API).` Keep `RUN rm -f static/js/*.map`.
4. **`eslint.config.js`**: delete row 9.
5. **`example.env`**: delete row 10.
6. **Comment-only edits**: `webpack.config.js` (comment only; `devtool` unchanged) and `OtelBrowserInit.ts`.
7. **`architecture.md`**: edit row 13.
8. **`worklog.md`**: decision log (none expected), what changed, and the verification results.
9. **Hand-off text** for the revisit Backlog brief (for the producer to file). Base it on the "Follow-up brief text" already in the worklog, trimmed to options 1–2 plus: *"restore `scripts/upload-sourcemaps.js`, the Dockerfile step, the `build.sh` secret arg and `PUBLIC_ORIGIN` from git (`6d4e574`); re-add `0260`'s Step C status line."*

## Verification
1. **Nothing left behind**: `git grep -n -i -E 'upload-sourcemaps|UPTRACE_SOURCEMAP|uptrace_sourcemap_dsn|PUBLIC_ORIGIN' -- ':!ai-agents'` should return **zero** hits.
2. **Shell syntax**: `bash -n build.sh`.
3. **Lint**: `npm run lint`.
4. **Tests**: `npm test` in full. If a `supertest` suite times out, check for `0197`'s segfault first, then re-run and say so.
5. **Config-parity guard**: `npm run check:config-parity`, compared with a baseline re-taken right before editing (both runs use `0203`'s uncommitted checker). Expected: identical. Any new or changed line is a stop-and-look.
6. **Local Docker build, no push** (owner ruling 3):
   - `docker build -t geoconflict-0260-check:local .` (plain `docker build`, native platform; no `--push`, no `buildx --push`, never through `build.sh`).
   - `docker run --rm --entrypoint sh geoconflict-0260-check:local -c 'ls static/js/ && ! ls static/js/*.map 2>/dev/null'` → bundles listed, no maps.
   - `./scripts/check-docker-secret-boundary.sh --inspect-image geoconflict-0260-check:local`.
   - `docker rmi geoconflict-0260-check:local`.
   - Not tested this way: `linux/amd64` emulation and `build.sh`'s buildx `--load` / `--iidfile` path. `bash -n` covers only its syntax.
7. **By eye**: `grep -n -A12 'docker buildx build' build.sh` — the argument list and every `\` continuation read correctly.

## Risks
- **Weekend deploy path** (`build.sh` / `Dockerfile`): a stray trailing `\` after deleting lines 132–133 would break the `docker buildx build` call; verification 7 reads it by eye, verification 6 exercises the Dockerfile.
- **BuildKit secret removal**: both sides go in the same change.
- **Build cache**: first rebuild slower. No functional impact.
- **`PUBLIC_ORIGIN` removal**: only `build.sh`'s deleted `eval` read it; `deploy.sh` doesn't use it.
- **Tree is shared with `0203`**: its checker/allowlist/test files are uncommitted and not this task's. A red `ConfigParity.test.ts` would be `0203`'s — report, don't fix.
