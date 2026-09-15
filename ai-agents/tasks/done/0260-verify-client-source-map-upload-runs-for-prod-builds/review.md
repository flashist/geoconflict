# Review — 0260

Task: ai-agents/tasks/done/0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md
File(s) under review: scripts/upload-sourcemaps.js (deleted), Dockerfile, build.sh, eslint.config.js, example.env, webpack.config.js (comment only), src/client/OtelBrowserInit.ts (comment only), ai-agents/knowledge-base/architecture.md
Status: closed-out

<!--
Phase 2 (2026-09-14) — owner rulings via AskUserQuestion, relayed by fkit-lead; all match reviewer recommendations:
- R1 → routed to fkit-wiki after 0260 close (already in plan.md).
- R2 → producer adds a note to 0203's brief: the PUBLIC_ORIGIN example is gone since 0260; the "scanner blind to scripts/" point still holds.
- R3 → producer files the revisit-source-maps Backlog brief in the same step as closing 0260.
- R4 → accepted residual (see below).
Closed out: no open code defects; remaining items are routed actions outside this diff.
-->


<!--
Round 1 (2026-09-14) — reviewers run: fkit-reviewer own pass + Codex adversarial pass (codex exec, read-only, completed, exit 0).
Verdict R1: Ready to merge (validation-gated). No confirmed defect in the diff. All rows below are low, docs/process only.

Verified clean (own pass, evidence):
- build.sh argv: copy of build.sh run with a stubbed `docker` on PATH (scratch dir, no env files) — buildx argv is exactly
  buildx build --platform linux/amd64, 4x --build-arg, --metadata-file, -t, --iidfile, --progress=plain, --load, "." ; script
  then reaches scan, tag, push stubs; exit 0. No dangling continuation.
- Deleted build.sh vars (uppercase_env, resolved_host, resolved_proto, PUBLIC_ORIGIN, SOURCEMAP_SECRET_ARG): no later reader in
  build.sh. build.sh is executed (build-deploy.sh:66 `./build.sh`), not sourced, so nothing leaks to callers. deploy.sh defines
  its own uppercase_env (deploy.sh:64). No `set -u` in build.sh.
- Dockerfile: stage order unchanged; `rm -f static/js/*.map` (Dockerfile:42) still runs after build-prod in the same stage and
  before the only static copy (Dockerfile:88). webpack emits JS (and so maps) only under js/ (webpack.config.js:188). ENV
  PUBLIC_ORIGIN removal: `git grep` finds no reader outside ai-agents/ (src, scripts, startup, nginx, tests). Config-parity
  treats Dockerfile ENV as a supply channel, but no src/ code read PUBLIC_ORIGIN; coder's before/after parity diff identical.
- Secret-boundary checker: never referenced the uptrace secret mount; its oracle is the per-layer byte scan + .dockerignore
  literals (scripts/check-docker-secret-boundary.sh:227-235). Still meaningful. Removing the only BuildKit secret mount only
  shrinks the attack surface.
- Build cache: ARG/ENV lines above `RUN npm ci` changed, so first rebuild re-runs npm ci. Slower once; no functional impact.
-->

## Reviewer findings
| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | low  | ai-agents/wiki-vault/wiki/systems/telemetry.md:4, :67, :74, :155 | (Codex; verified) Wiki still documents the deleted upload as current (key file `scripts/upload-sourcemaps.js`, DSN + `PUBLIC_ORIGIN` inputs). Not a diff defect — plan.md "Out of the worker's reach" already routes this to `fkit-wiki` after close. Recorded so the routing is not dropped; reviewer/coder cannot write the vault. |
| R2 | 1     | low  | ai-agents/tasks/backlog/0203-config-parity-guard-pre-arming-gate/brief.md:239-243 | (own pass) 0203's R21 correction now cites a dead fact: "`PUBLIC_ORIGIN` (`Dockerfile:31`) ... is read at `scripts/upload-sourcemaps.js:31`". After 0260 that key, line and file are gone. The general point (scanner walks only `src/`, blind to `scripts/` reads) still stands, but its only worked example vanished. Cross-task doc drift created by this change and not in 0260's plan; owner of the fix is 0203 / producer, not 0260's coder. Other stale mentions in open task plans (0032 plan:87, 0062 plan:146, 0064 plan:90) are historical working notes — noted, not actioned. |
| R3 | 1     | low  | Dockerfile:41; webpack.config.js:180-184; OtelBrowserInit.ts:45-47; architecture.md:461-462, :687-689 | (own pass) Comments/docs say "a revisit task is pending", but no revisit brief exists yet (grep of backlog briefs for symbolication finds only 0260 and 0261). Handoff text exists in worklog.md ("Hand-off — revisit Backlog brief text"). Close-out gate: producer files it before/at 0260 close, else these statements are false on landing. Code comments name no task id, so they stay accurate once filed. |
| R4 | 1     | low  | build.sh:101-112 | (own pass; residual, already stated in worklog) The real prod path `docker buildx build --platform linux/amd64 --load --iidfile` was not executed end to end. Mitigated this round: argv proven with a stubbed docker; Dockerfile exercised by a local amd64 `docker build` (maps absent, byte scan passed). Remaining gap = buildx/--load runtime only, which this diff does not touch. First weekend `build-deploy.sh` run is the validation. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Neither — routed doc drift outside the diff (not a code defect) | none by coder. Verified `wiki-vault/wiki/systems/telemetry.md:4,:67,:74,:155` still describe the upload script, DSN and `PUBLIC_ORIGIN` as current. Owner ruling: `fkit-wiki` ingest after 0260 close (coder cannot write the vault). | closeout (routed: fkit-wiki) |
| R2 | CORRECT | Neither — cross-task doc drift, owned by 0203 (not a code defect) | none by coder. Verified `0203/brief.md:239-243` cites `PUBLIC_ORIGIN` (`Dockerfile:31`) read at `scripts/upload-sourcemaps.js:31`; all three are gone since 0260. Its general point (scanner walks only `src/`) still holds. Owner ruling: producer adds a note to 0203's brief. | closeout (routed: producer) |
| R3 | PARTIALLY CORRECT | Neither — close-out gate (not a code defect) | none by coder. Correct for `architecture.md:462,:689` ("a revisit task is pending"), and no revisit brief exists yet (backlog grep for "symbolicat" hits only 0260 and 0261). Inaccurate for the code comments: `Dockerfile`, `webpack.config.js` and `OtelBrowserInit.ts` do not say "pending". They say the upload was removed / no maps reach Uptrace / "any future symbolication path", which is true whether or not the brief is filed. Owner ruling: producer files the revisit brief in the same step as closing 0260 (hand-off text in `worklog.md`). | closeout (routed: producer, at close) |
| R4 | CORRECT | Frontier — accepted residual | none. Verified `build.sh:101-112` buildx `--platform linux/amd64 … --load .` was not run end to end (only `bash -n`, a read-through, a stubbed-docker argv run by the reviewer, and a local amd64 `docker build` of the Dockerfile). Owner ruling: accepted residual "buildx --load path not exercised pre-merge (R4)"; the first weekend `build-deploy.sh` run is the test. | won't fix (frontier) |

## Accepted residuals (shared, do-not-re-litigate)
- No client symbolication — What: dead Uptrace upload removed, client stack traces stay minified · Why (structural): owner ruling 2026-09-14 "Accept none for now"; Uptrace 2.0.2 has no upload API (worklog probes 3–5); alternatives (upgrade, restricted fetch path) deferred to a revisit task · Re-raise only if: Uptrace is upgraded to a release with an upload API, or the revisit task is picked up.
- Keep generating hidden maps then delete — What: `devtool: "hidden-source-map"` + `RUN rm -f static/js/*.map` kept · Why (structural): owner ruling 2026-09-14 option A (keeps a restore path cheap; build cost only) · Re-raise only if: build time/memory becomes a problem, or the revisit task picks a path that needs maps in the image.
- setup-telemetry.sh stale "Source map uploads" comment — What: left as is · Why (structural): plan.md "Left untouched" — no effect on the running box until setup re-runs, and the hardening harness greps that file · Re-raise only if: setup-telemetry.sh is edited for another reason, or the revisit task lands.
- buildx --load path not exercised pre-merge (R4) — What: build.sh's `docker buildx build --platform linux/amd64 --load --iidfile` path is validated by the first weekend deploy, not a pre-close dry run · Why (structural): owner ruling 2026-09-14 "Yes, weekend is the test"; argv already proven with a stubbed docker and the Dockerfile exercised by a local amd64 build; the diff does not touch buildx/--load behaviour; rejected alternative: a real buildx --load dry run before close · Re-raise only if: the first weekend build-deploy.sh buildx --load run fails.
