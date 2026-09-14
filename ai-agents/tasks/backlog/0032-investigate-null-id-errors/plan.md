# Plan — 0032 investigate & fix client null-ID errors

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-14**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-14):**
> - **Q1 — Uptrace access:** **yes, read-only** — the coder may log into the Uptrace dashboard from this
>   machine via browser automation using the admin login named in `setup-telemetry.sh` and the password
>   from the owner's gitignored `.env.telemetry.secret`, read at run time, **never echoed, written, or
>   recorded anywhere**. Owner-export fallback only if that access fails.
> - **Q3 — worker-origin cluster:** **in scope, bounded to the two worker files**
>   (`src/core/worker/Worker.worker.ts`, `src/core/worker/WorkerClient.ts`); flag the 0251 overlap to the
>   producer at close.
> - **Q2 / Q4 — stop rule and measured-zero outcome:** **accepted as stated** — top 2 clusters or ≥80 % of
>   null-family volume, whichever is smaller, max 2 code fixes, remainder → follow-up brief; a ~0
>   measurement for the current `service.version` stops the build and returns `NEEDS-DECISION`.
> - **Q5 — windows:** 24 h for rate, 7 d for signatures (retention cap). Not separately ruled; take it.
> - **Working tree:** carries uncommitted 0220/0221/0233 changes (profile-server files, `setup-profile.sh`,
>   `build-deploy-profile.sh`, harnesses, `Dockerfile.profile`, `profile-checks.sh`, `src/client/ClientGameRunner.ts`,
>   `tests/client/ClientGameRunnerTeardown.test.ts`) and new briefs — **touch none of them**; if a fix must
>   land in an already-dirty file, keep the hunk separable and flag it.
> - **Build scope for the Build spawn:** steps 1–4; step 5 (deploy + re-query) is the owner's; the Build
>   worker does not deploy. Secrets: names only in every artifact.

## Summary

- Planning-only honored: no source, no files written. Read-only probes only (curl to prod + telemetry host, one batch-mode SSH attempt that was refused, git history, env-file **key names** only — no values printed).
- **Uptrace IS reachable read-only from this machine** — `route -n get 95.163.232.142` goes via `en0` (no VPN tunnel), `https://telemetry.geoconflict.ru/` answers 200, and its internal API (`/internal/v1/users/current`, `/internal/v1/projects`) answers 200 as Guest. So step 1 can be run from here by logging into the dashboard (browser automation) with the admin login named in `setup-telemetry.sh` (`admin@geoconflict.ru` / `UPTRACE_ADMIN_PASSWORD` from `.env.telemetry.secret`). SSH is **not** usable with my default key (`Permission denied (publickey,password)` in batch mode); only `TELEMETRY_VPS_PASSWORD` + sshpass exists — deprecated path, not needed.
- Deploy attestation: **owner-attested, not repo-verified** — with one partial corroboration I measured: prod `/api/version` reports `build 0.0.151`; both 0164's final commit (`6d4e574`) and 0159's (`c2bc236`) carry `0.0.135` and are ancestors of HEAD. That shows the deployed build is *after* both commits. It does **not** prove the source-map upload succeeded (it is best-effort by design) or that Uptrace resolves stacks — step 1 checks that directly.
- The 1.8/min figure is from 2026-05-07 and is **not re-measured** — no new number is claimed. Retention is 7 days for logs/spans (`UPTRACE_RETENTION_DAYS` default), so the query window is at most the last 7 days.
- Key trace insight for clustering: sim errors from `src/core` run in the Web Worker. `OtelBrowserInit.ts` patches `console.error` and `window` `error`/`unhandledrejection` on the **main thread only**; a worker's uncaught error reaches the main `error` event **sanitized** (no `event.error`, flagged `error.cross_origin_or_worker=true`, no stack). So a chunk of `e is null` may be worker-origin and unsymbolicable — the plan splits on that attribute first.

## Plan

### Step 0 — Preconditions and framing (no code)
- Working tree carries uncommitted 0220/0221/0233 edits (incl. `src/client/ClientGameRunner.ts`) — not mine; leave untouched; any fix lands on top, and I flag it if a fix must touch an already-dirty file.
- Deploy status as above: owner-attested; version corroboration only.

### Step 1 — Pull current volume and top signatures (read-only, from here; owner fallback spelled out)
**Access path (Rec):** browser automation (Playwright MCP) → `https://telemetry.geoconflict.ru` → login `admin@geoconflict.ru` with `UPTRACE_ADMIN_PASSWORD` (value read from `.env.telemetry.secret` at run time, never echoed). Fallback: the same queries via `/internal/v1/...` after login (shapes undocumented; probe cost). Last resort: owner exports — exact spec below.

Queries (Uptrace project `geoconflict`, service `geoconflict-client`), two windows: **last 24 h** (rate) and **last 7 d** (signatures; retention cap):
1. Logs, `severity = ERROR`, `service.name = geoconflict-client`, body matches any of: `is null`, `null is not an object`, `Cannot read properties of null`, `null has no properties`, `Unhandled rejection`. Group by `_group_id` → count, rate/min, distinct `enduser.id`.
2. Spans `unhandled_error` / `unhandled_rejection` with `exception.message` matching the same set. Group by: `exception.message` × `service.version` × `error.cross_origin_or_worker` × `error.filename` × browser (`user_agent` if present).
3. For the top groups: open 3–5 samples each, capture `exception.stacktrace` **as symbolicated by Uptrace** (file/function/line) and the raw minified frames (`js/<name>.<hash>.js:line:col`) + `service.version`.
4. Same set for the **whole** client error stream (top 10 groups) so the null-id share of total is known post-0159.

Record: current combined rate (new number only if measured), per-group rates, `service.version` spread (errors from stale bundles get excluded), share flagged `cross_origin_or_worker`, whether symbolication is present for the current version.

**If symbolication is absent for current-version frames** (upload failed silently — best-effort; e.g. nginx 413, DSN mismatch, `minified_url` origin ≠ `error.filename` origin such as a Yandex rehost): fallback that needs no owner — check out the deployed commit, run the production webpack build with the same `GIT_COMMIT`/deps (content hashes are deterministic for the same input), and map raw `line:col` locally with the `source-map` package. If hashes don't match, that's a finding in its own right (report, don't guess).

**Owner-side export spec (only if my access fails):** Uptrace → Logs → time range last 7 days → filter `service.name = geoconflict-client AND severity = ERROR` → group by `_group_id` → export CSV of: group message, count, first/last seen, `service.version`; plus for the top 5 null-family groups, open one sample each and copy the full `exception.stacktrace`, `error.filename`, `error.cross_origin_or_worker`, `enduser.id`, `service.version`.

### Step 2 — Cluster by signature
- Cluster key = symbolicated top frame (file:function) when available; else raw `file:line:col` + `service.version`; worker-origin (`cross_origin_or_worker=true`, message-only) is its own cluster.
- Also split by browser wording (Firefox `e is null`, Safari `null is not an object`, Chrome `Cannot read properties of null`) only to **merge** same-site groups, not to separate them.
- Output: table cluster → rate → % of null-family volume → symbolicated site or "no stack".

### Step 3 — Trace origin for the top clusters (hypotheses until traced)
Hypothesis list to test against the symbolicated sites, in likelihood order from code reading (not yet confirmed):
- `GameView.playerBySmallID()` returns `null` for an unknown small ID (`src/core/game/GameView.ts:636-642`) and callers dereference without a check — `.map((id) => this.game.playerBySmallID(id))` at `:365/:370` (alliance/target lists) then `.id()`; `UILayer`, `RadialMenuElements`, `StructureIconsLayer`, `FxLayer`, `TerritoryLayer` each have 4–7 `.id()` call sites.
- `GameView.myPlayer()` `null` before spawn / after elimination, used in `ClientGameRunner.ts:490/591/605/916/924` paths.
- `playerByClientID()` `null` in chat/radial flows (`ChatModal`, `MainRadialMenu`, `PlayerPanel`, `PlayerInfoOverlay`).
- Promise-based `a.id` (the `Unhandled rejection` group, Safari) → an async fetch then `.id` — profile/Yandex identity flows.
- Worker-origin `e is null` → an execution in `src/core/execution/` dereferencing a dead player/unit; **not symbolicable from the main thread** as currently instrumented.
For each top cluster: trace the null source (who returns null, why the caller assumed live), the triggering flow (elimination, leave, alliance end, spawn phase), and a local reproduction where feasible (unit test on `GameView`/execution, or a scripted client state).

### Step 4 — Fix shape per cluster, with tests
- **Symbolicated, traced site:** targeted fix at the origin (a proper early-return / lookup guard at *that* site, not blanket guards). `src/core/` changes get a Jest test in `tests/` reproducing the null path (e.g. unknown small ID / eliminated player). Client-layer fixes get a `tests/client/` test where the existing pattern allows (node env, Lit components are already tested there).
- **Worker-origin, no stack:** the brief's "structured error context" branch — forward the worker's `ErrorEvent` `message/filename/lineno/colno` + `error.stack` to the main thread so it is reported with a stack (bounded to `src/core/worker/Worker.worker.ts` `error` listener + `WorkerClient.ts`). Touches 0232's area and neighbors 0251 (backlog) → **owner ruled: in scope, bounded to those two files; flag the 0251 overlap.**
- **No speculative guards** anywhere else (brief rule).
- Run: `npm test` (full), `npx tsc --noEmit`, `npm run lint`; results reported verbatim.

### Step 5 — Verification (owner-side deploy; my side re-query)
- Owner deploys via `build-deploy.sh` (I never deploy). After ≥24 h I (or the owner, if my access has lapsed) re-run the Step 1 queries filtered to the **new** `service.version`; success = the fixed cluster(s) absent for that version, other clusters unchanged.
- The old-version residue keeps appearing until clients refresh — filter by version, don't misread it as a failed fix.

### Stop rule (bounded)
- Fix at most the **top 2 clusters** by volume, or whatever set reaches **≥80 %** of null-family volume, **whichever is smaller**. Everything else → one follow-up brief (filed by the producer, not me) listing each remaining cluster with its symbolicated site and rate.
- If Step 1 measures the family at effectively 0 for the current version (possible: some null-id groups may have lived in the archive path 0159 removed), stop and return `NEEDS-DECISION` (close as resolved-by-0159/0164 with evidence, vs keep open).

### Edge cases / failure modes
- Symbolication missing for the current build (silent best-effort upload failure) → local re-build fallback above; if content hashes differ, report.
- `error.filename` origin ≠ `PUBLIC_ORIGIN` (Yandex rehost) → maps can never match; then the fix includes correcting `minified_url` derivation — separate finding.
- Errors dominated by a few `enduser.id`s or stale `service.version`s → not actionable; report, don't fix.
- Fix touches an already-dirty file (e.g. `ClientGameRunner.ts`) → flag; keep my hunk separable.
- Supertest/jest known flake on full `npm test` → re-run and say so (CLAUDE.md rule).

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

1. **Access:** may I log into the Uptrace dashboard from this machine (browser automation, read-only queries) using `UPTRACE_ADMIN_PASSWORD` from `.env.telemetry.secret`? (Rec: **yes** — read-only, and the memory rule says run read-only checks myself rather than hand over commands. Alternative: owner exports per the spec in Step 1.) → **Owner ruled: yes, read-only.**
2. **Stop rule:** top-2 clusters or ≥80 % volume, whichever is smaller, max 2 code fixes, remainder → follow-up brief. (Rec: **accept as stated**.) → **Owner accepted.**
3. **Worker-origin cluster:** if the dominant cluster is worker-origin with no stack, the fix is *instrumentation* (forward stack from the Web Worker) in 0232/0251 territory, not a null guard. In scope here, or a separate task? (Rec: **in scope, bounded to the two worker files**, since the brief explicitly allows the structured-context branch; flag the 0251 overlap to the producer.) → **Owner ruled: in scope, bounded.**
4. **Measured-zero outcome:** if the family is ~0 for the current version, close as resolved with evidence rather than build anything? (Rec: **yes**, via `NEEDS-DECISION` to the producer at that point.) → **Owner accepted.**
5. **Time windows:** 24 h for rate + 7 d for signatures (retention cap). (Rec: **both**; no owner action needed unless the retention was raised above 7 d on the box — not checkable from here without login.) → **Not separately ruled; take it.**

Relevant paths (absolute): `/Users/mark.dolbyrev/Workspace/geoconflict/src/client/OtelBrowserInit.ts`, `/Users/mark.dolbyrev/Workspace/geoconflict/src/core/game/GameView.ts`, `/Users/mark.dolbyrev/Workspace/geoconflict/src/core/worker/Worker.worker.ts`, `/Users/mark.dolbyrev/Workspace/geoconflict/src/core/worker/WorkerClient.ts`, `/Users/mark.dolbyrev/Workspace/geoconflict/scripts/upload-sourcemaps.js`, `/Users/mark.dolbyrev/Workspace/geoconflict/setup-telemetry.sh`, `/Users/mark.dolbyrev/Workspace/geoconflict/ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`.
