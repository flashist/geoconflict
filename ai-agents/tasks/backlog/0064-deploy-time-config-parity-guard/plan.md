# 0064 Phase 1 — Approved Plan

> **Provenance and one disclosed transformation.** This plan was produced by a spawned `fkit-coder`
> (plan-only, wrote nothing to disk) and approved by the owner via `AskUserQuestion` in the
> `fkit lead` session on **2026-09-02**. The driver (`fkit-lead`) wrote this file at the moment of
> approval, before any build spawn.
>
> ⚠️ **Disclosed transformation — this is NOT a byte-for-byte copy.** The plan arrived through the
> subagent channel with HTML entities escaped (`&gt;`, `&lt;`, `&amp;`). Those have been decoded back to
> `>`, `<`, `&` so the shell snippets are usable. **No other change was made** — no re-rendering, no
> summarising, no reordering. Every other byte is as returned.

---

## Owner rulings that scope this plan (all given live in session, 2026-09-02)

**R1 — The `0064` "land" ruling: ACCEPTED.** The brief's hard sequencing (*"ships only after `0062`
and `0063` have landed"*) binds the **enforcing switch, not the build**. Basis: the brief's own most
precise formulation is *"`0195` must land before this guard **arms**"*, and a report-only guard exits
zero so it cannot fail a deploy (brief requirement 2; verification step 6). Verified: `0063` is
deployed and live (production commit `362a2f9`); `0062`'s fix is in the tree at `deploy.sh:292`.

**R2 — Plan approved as written**, including the coder's own recommendations on its Q1, Q4 and Q5:
- **Q1 — directory partition**, plus a jest test asserting no file under `src/profile-server/**`
  imports `src/core/configuration/**`, so the assumption cannot drift silently. Import-graph walk
  deferred.
- **Q4 — record `YANDEX_PAYMENTS_SECRET`** in the allowlist now, marked `phase: 2` and **inert**, so
  `0195`'s hand-off lands where it asked.
- **Q5 — report the ~6 dead-config findings as INFO**, visually separated from REQUIRED. Explicitly
  **not** pre-allowlisted: the owner declined to record a "these are intentionally dead" judgment the
  coder could not verify.

**R3 — The `--enforce` flag: BUILD IT AND WIRE IT — but NOT before the weekend deploy.**
The owner first ruled "build it and enforce it (wire it)". The driver flagged, loudly and before
acting, that the plan's **0-required-violations figure is a hand-count from grep, not output from a
running checker** — the coder's own words: *"Treat as the expectation to verify, not a result."*
Wiring enforcing before its first real run would put an unverified prediction between the owner and a
successful deploy, and the weekend deploy carries `0060`'s nginx fix plus `0062`/`0063`'s production
proof. This also conflicts with the brief's explicit requirement 2: *"**Do not ship straight to
enforcing.**"*

**The owner then re-ruled, with that risk stated:**
> **Report-only for the weekend deploy; wire enforcing immediately after, still inside `0064`.**

So: **build the `--enforce` flag, test it, and leave it wired to nothing for now.** The weekend deploy
runs report-only and discharges verification step 8. Once its output is read and understood, wiring
enforcing is a follow-up step **within this same task** — not a new task, and not this week's work.

**R4 — The `npm test` baseline gate: YES, include it.** This overrides the coder's Q2 recommendation
(which was exit-0/no-crash only for v1). Owner's reasoning, accepted: this gate fails a **test run**,
never a deploy — it catches an unforwarded setting at a developer's keyboard rather than in
production, and its worst case is a red test. Implement the baseline assertion.

**R5 — The `CLAUDE.md` line: YES, add it.** One row under Development Commands for
`npm run check:config-parity`. This overrides the coder's Q6 non-recommendation.

**R6 — Standing constraints.** No production server contact anywhere in this task. No secret values in
any artifact — variable **names** only, never values. No commit, no push. The task **cannot be closed
this week**: verification step 8 and the Phase 2 prod-shaped checks stay deploy-gated.

---

## The approved plan, as returned

## Summary

- **Recommend Node, not shell**, for the guard — `npm test` already runs `.ts` tests, so the guard's own tests gate themselves today with **zero dependency on `0201`**, and I never touch `tests/scripts/profile-deploy-hardening.test.sh`.
- ⚠️ **Collision flag, loud:** I do not edit that harness — but I **do** edit `build-deploy-profile.sh`, which that harness executes end-to-end. Mitigation makes the harness see zero new output; details in §7.
- **Phase 1 needs no environment at all.** It is pure static analysis of git-tracked files. The guard is wired into `deploy.sh` **before** the first `load_env_file` — so it provably cannot see a value. That is the whole no-leak story, and it is structural, not a promise.
- **The profile pipeline is TWO hops, not one** — the brief reads as one. `0195`'s exact defect (key present in `setup-profile.sh`'s `profile.env`, absent from `build-deploy-profile.sh`'s export block ⇒ lands empty) is **statically detectable with no values**. Phase 1 catches it. This is a genuine strengthening of the brief.
- **The brief is silent on the client/build-time channel** (webpack `DefinePlugin`, `Dockerfile` `ENV`). A naive `src/`-wide grep produces ~4 false positives immediately. Biggest FP source; handled mechanically, not by allowlist.
- `deploy.sh:279-308` in the brief is **slightly off**: heredoc opens at `:279`, body is `280–309`, terminator `EOL` at `:310`. Anchor on the delimiter, never the range.
- **Predicted day-one report** (hand-computed, §3): **0 required-var violations** after allowlisting 4 runtime/build-supplied vars, plus **~6 informational dead-config lines**. Small enough to read at a glance on the weekend deploy.
- **Discharged locally: steps 4, 5, 7, half of 1, half of 6.** **Open: 2, 3, 8, the other half of 1 and 6** — all Phase 2 or deploy-gated. §9 is explicit.
- 6 open questions at the end; 4 have recommendations I'd defend.

---

## 1. Verified ground truth

| Fact | Evidence |
|---|---|
| Game heredoc opens `deploy.sh:279` (`cat > ${ENV_FILE} << 'EOL'`), closes `:310` | read directly |
| 31 forwarded keys in that heredoc; `PROFILE_INTERNAL_TOKEN` present at `:292` | `0062`'s fix is in tree ✅ |
| `update.sh:86-88` does `docker run --env-file "$ENV_FILE"` — the whole heredoc becomes container env | one hop, no filtering |
| Profile hop 1: `build-deploy-profile.sh:489-526`, `printf "export X=%q\n"` block, 28 keys | `YANDEX_PAYMENTS_SECRET` present at `:507` — `0195` is in tree ✅ |
| Profile hop 2: `setup-profile.sh:385-396`, `cat > "$PROFILE_DIR/profile.env" << EOF`, 10 keys | all 10 present in hop 1 today ✅ |
| App reads: 31 distinct `process.env.X` names across `src/` | no bracket form, no destructuring, no dynamic names — verified |
| `DefinePlugin` (`webpack.config.js:330-345`) substitutes 7 keys into the client bundle | `WEBSOCKET_URL`, `GAME_ENV`, `DEPLOY_ENV`, `GIT_COMMIT`, `STRIPE_PUBLISHABLE_KEY`, `API_DOMAIN`, `OTEL_EXPORTER_OTLP_ENDPOINT` |
| `Dockerfile:21-31,78-79` bakes `GIT_COMMIT`, `DEPLOY_ENV`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `PUBLIC_ORIGIN` as image `ENV` | second legitimate supply channel |
| No `set -x` in `deploy.sh` / `build-deploy-profile.sh` / `setup-profile.sh` / `update.sh` | grepped — verification step 7's script half is already satisfied |
| `jest.config.ts:47` `testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$"` | a `.ts` test anywhere under `tests/` runs under `npm test` today |
| Precedent for wiring a script to npm: `package.json:32` `check:docker-secret-boundary` | I mirror it |

---

## 2. What the guard checks

Three independent parity relations, all static, all name-only.

**A. Game pipeline.** Reads from `src/server/**` + `src/core/**` must appear in *either* the `deploy.sh` heredoc key set *or* the `Dockerfile` `ENV` set.

**B. Profile pipeline — two hops.**
- B1: reads from `src/profile-server/**` must appear in `setup-profile.sh`'s `profile.env` key set (or `Dockerfile.profile` `ENV`).
- B2: **every key in `profile.env` must appear in `build-deploy-profile.sh`'s export block.** This is `0195`, caught structurally. A key that clears B1 but fails B2 is *guaranteed* to land empty — the `:-` default fires. No value inspection required.

**C. Client/build-time.** Reads from `src/client/**` must appear in the `DefinePlugin` key set. Not expected in any deploy heredoc; a client-only var appearing in the heredoc is dead config, not a fix.

**Reverse direction (brief step 3).** For each forwarded key with no `src/` read, scan a **pipeline-scoped consumer set** before calling it dead:
- game: `update.sh`, `Dockerfile`, `nginx.conf`, `startup.sh`
- profile: `setup-profile.sh`, `Dockerfile.profile`

Without this, `ENVIRONMENT` / `DOCKER_IMAGE` / `DEPLOYMENT_ID` (all consumed by `update.sh`) report as dead on day one. **The brief's step 3 as written would produce those three false positives.**

### Parsing rules — anchored on text, never line numbers
- App reads: `/process\.env\.([A-Za-z_]\w*)/g`, plus `/process\.env\[\s*(["'`])([^"'`]+)\1\s*\]/g` for the bracket form (none today — cheap insurance against a silent future miss). Over `src/**/*.ts`, excluding `*.d.ts`.
- **Blind-spot announcement, mandatory.** If the scan sees `process.env[` with a non-literal argument, or `= process.env` (aliasing/destructuring), it prints `DYNAMIC-READ <file>:<line> — cannot enumerate` and says so in the summary. Neither exists today. A guard that silently cannot see something is the failure mode this whole task exists to prevent; it must announce its own limits rather than print a green check.
- `deploy.sh` heredoc: locate the line matching `cat > .* << 'EOL'`, take following lines to the line that is exactly `EOL`, keep `^([A-Z_][A-Z0-9_]*)=`.
- `profile.env` heredoc: same shape, delimiter `EOF`, anchored on `cat > "$PROFILE_DIR/profile.env"`.
- Profile exports: `/^\s*printf "export ([A-Z_][A-Z0-9_]*)=/`.
- `Dockerfile` supply: `/^ENV ([A-Z_][A-Z0-9_]*)=/`.
- `DefinePlugin`: `/"process\.env\.([A-Za-z_]\w*)"\s*:/`.
- **Every parser fails loud.** If a heredoc anchor is not found, or a block yields 0 keys, that is a hard `PARSE-FAILURE` line — never an empty set silently compared. An empty forwarded-set would otherwise report every var as missing, or (worse, in reverse) report nothing.

---

## 3. Predicted day-one output

Hand-computed this session from grep — **not** from the unwritten checker. Treat as the expectation to verify, not a result.

**Game — read but not supplied (4):**

| Var | Read at | Verdict |
|---|---|---|
| `WORKER_ID` | `Worker.ts:36`, `OtelResource.ts:24-25` | allowlist `runtime-supplied` — `Master.ts:35` `cluster.fork({WORKER_ID: index})` |
| `HOSTNAME` | `OtelResource.ts:20` | allowlist `runtime-supplied` — Docker sets it |
| `MASTER_INTERNAL_ORIGIN` | `ServerEndpoints.ts:6` | allowlist `optional` — safe default `http://127.0.0.1:3000` at the read site |
| `STRIPE_PUBLISHABLE_KEY` | `DefaultConfig.ts:77,331` | **genuine gap.** `DefinePlugin`-satisfied for the client, `?? ""` on the server, never forwarded. Harmless today (RU market, no Stripe). Report it → candidate new brief; **do not fix here** |

`GIT_COMMIT` is cleared mechanically by `Dockerfile:79` `ENV` — no allowlist entry needed. This is the payoff of treating `Dockerfile ENV` as a supply channel.

**Game — forwarded, nothing reads it (6):** `BASIC_AUTH_USER`, `BASIC_AUTH_PASS`, `OTEL_USERNAME`, `OTEL_PASSWORD`, `OTEL_ENDPOINT`, `DOCKER_TOKEN`. Each appears **only** in `deploy.sh` across the whole repo (verified). The app reads `OTEL_AUTH_HEADER` + `OTEL_EXPORTER_OTLP_ENDPOINT` instead; `update.sh` does `docker pull` with no login. This is exactly the "dead config that misleads the next reader" the brief asks for. **Informational, not a violation.**

**Profile:** clean. All 7 profile-server reads present at hop 2; all 10 hop-2 keys present at hop 1.

**Client:** clean. All 4 client reads are in `DefinePlugin`.

⇒ **Required-var violations after allowlisting: 0. Informational lines: ~6.** Verification step 4 ("a clean configuration passes silently") is met in the sense that matters — zero required violations — but the run will **not** be literally silent. Hence the two-tier output below, and open question Q5.

---

## 4. Output contract

```
── config parity guard (report-only) ──────────────────────
pipeline: game
REQUIRED  0
INFO      6  forwarded, no consumer found: BASIC_AUTH_USER, BASIC_AUTH_PASS,
             OTEL_USERNAME, OTEL_PASSWORD, OTEL_ENDPOINT, DOCKER_TOKEN
ALLOWED   4  (see scripts/config-parity-allowlist.json)
report-only — exit 0, this cannot fail a deploy
```

**Every token printed comes from an enumerated name set.** No value is ever interpolated, because no value is ever read.

**Exit contract, three layers so report-only cannot fail a deploy:**
1. `--report-only` returns 0 unconditionally.
2. `main()` is wrapped — any internal throw prints `⚠️ config-parity guard errored (report-only): <message>` and returns 0. A crash must never fail a deploy.
3. The shell call site appends `|| true`.

> ### ⚠️ CORRECTION — 2026-09-02, added after review round 1 (finding R5, owner disposition D5)
>
> **The approved text above is left exactly as approved. Layers 1 and 2 as worded are FALSE, and
> this note — not an edit — is the correction.** The owner's ruling was: *correct the wording, do
> not change the code.* The behaviour is already safe; only the docs overclaimed.
>
> - **Layer 1 is not unconditional.** `--report-only` returns 0 for every *analysis* outcome, but an
>   unparseable argument returns **exit 2** before the mode is ever consulted. Reproduced:
>   `--report-only --bogus-flag` → exit 2. The suite pins this at `ConfigParity.test.ts`
>   ("an unknown argument exits 2 with a usage line rather than crashing").
> - **Layer 2 covers less than it claims.** The `try` wraps `analyse()` only. `render()`,
>   `JSON.stringify` and the `process.stdout.write` that follow sit **outside** it, so a throw there
>   is uncaught and exits 1.
> - **Layer 3 is intact and IS the absolute.** `|| true` at both call sites absorbs exit 2, exit 1,
>   an uncaught stack trace, a signal, a missing `node`, and an import-time syntax error alike. The
>   reviewer could construct **no** path by which report-only fails a deploy. So the conclusion
>   ("report-only cannot fail a deploy") holds — but it rests on **one** layer, not three.
>
> Wording corrected in the same round at `scripts/check-config-parity.mjs` (header EXIT CONTRACT),
> `deploy.sh` and `build-deploy-profile.sh` (call-site comments). **No code changed.**

**Graceful degradation:** any missing input file ⇒ one `SKIP <path> not found` line, exit 0. Required for the `0201` harness interaction (§7).

---

## 5. The allowlist

`scripts/config-parity-allowlist.json`, JSON so the checker parses it with `JSON.parse` (zero deps) and jest can assert its shape.

```json
{ "name": "WORKER_ID", "pipeline": "game", "class": "runtime-supplied", "phase": 1,
  "reason": "Set per worker by the cluster master at fork time (src/server/Master.ts:35). Never a deploy input." }
```

`class` ∈ `runtime-supplied` | `build-time` | `optional` | `dead-config`. **An unlisted variable is REQUIRED** — brief step 4, hard, and asserted by a test.

A jest test asserts: no duplicate names, every entry has a non-empty `reason`, `class` and `pipeline` are from the closed sets. An allowlist entry with an empty reason is the same rot the brief is trying to prevent.

Per `0195`'s hand-off, `YANDEX_PAYMENTS_SECRET` gets an entry — but stated honestly: it is **forwarded at both hops today, so no Phase-1 rule fires on it.** The entry is `phase: 2`, inert until the non-empty check exists. Recording it now honors the hand-off without pretending it does work. See Q4.

---

## 6. The no-leak guarantee — how I'd prove it

Four independent layers:

1. **Structural.** The checker's inputs are `src/**/*.ts`, `deploy.sh`, `build-deploy-profile.sh`, `setup-profile.sh`, `Dockerfile`, `Dockerfile.profile`, `webpack.config.js`, and the allowlist. All git-tracked, all value-free. It opens **no `.env*` file** and reads **no `process.env` key** other than its own argv handling.
2. **Placement.** In `deploy.sh` the call sits **after** the `ENV` argument validation and **before** `load_env_file ".env"`. At the moment it runs, no secret has been sourced into the shell. Same in `build-deploy-profile.sh`: before the first `load_env_file`.
3. **Behavioral test (the real proof).** Jest spawns the checker with a poisoned environment — `GC_CANARY=<random hex generated in the test>` and canary values for `PROFILE_INTERNAL_TOKEN`, `ADMIN_TOKEN`, `POSTGRES_PASSWORD` — and asserts the canary appears **nowhere** in stdout or stderr. That is a property of behavior, not of code shape, and it survives refactoring.
4. **Static test.** Assert the checker's own source contains no `.env` path literal and no `process.env` read outside its arg parser.

Plus: `set -x` is absent from all four deploy scripts (verified), and `deploy.sh` does not echo the heredoc — step 7's script half already holds.

---

## 7. ⚠️ File collision — flagged explicitly for sequencing

**I do not edit `tests/scripts/profile-deploy-hardening.test.sh`.** But there is a real coupling the lead must see:

That harness (`:115-143`) copies the **real** `build-deploy-profile.sh` into a fixture dir `$RUN` and executes it under a stub `PATH`. `$RUN` contains no `src/`, no `scripts/check-config-parity.mjs`, and an empty `setup-profile.sh`. `PATH="$BIN:$PATH"` — the real PATH is appended, so **`node` IS reachable** inside the harness.

So my edit to `build-deploy-profile.sh` executes inside a harness that `0201` and `0202` are actively working, and `0047` also touches.

**Mitigation, and it reduces the coupling to zero output:** guard the call site on the checker file's own existence.

```sh
if [ -f "$SCRIPT_DIR/scripts/check-config-parity.mjs" ] && command -v node >/dev/null 2>&1; then
    node "$SCRIPT_DIR/scripts/check-config-parity.mjs" --pipeline=profile --report-only || true
fi
```

In the harness fixture that file is absent ⇒ **silent skip, zero new stdout, zero new exit paths.** In a real deploy it runs. I'd verify this by running the harness before and after my edit and diffing its output.

Even so: **the lead should sequence my `build-deploy-profile.sh` edit against `0201`.** Not a merge conflict (different regions of the file) but the same file is in `0201`'s blast radius.

My new jest test also lands in `tests/scripts/` — as a **new `.ts` file**, `tests/scripts/ConfigParity.test.ts`. Different name, different extension, no edit to the contested harness. Say the word if you'd rather I put it at `tests/ConfigParity.test.ts` and stay out of that directory entirely.

---

## 8. File-by-file change surface

| File | Action | Size | Notes |
|---|---|---|---|
| `scripts/check-config-parity.mjs` | **new** | ~280 lines | Zero deps, Node stdlib only — must run from a checkout with no `node_modules`. Flags: `--pipeline=game|profile|all`, `--report-only`, `--repo-root=`, plus per-input path overrides so tests can feed synthetic fixtures |
| `scripts/config-parity-allowlist.json` | **new** | ~30 lines | 5 entries: `WORKER_ID`, `HOSTNAME`, `MASTER_INTERNAL_ORIGIN`, `STRIPE_PUBLISHABLE_KEY`, `YANDEX_PAYMENTS_SECRET` (phase 2) |
| `tests/scripts/ConfigParity.test.ts` | **new** | ~220 lines | Runs under `npm test` today. Synthetic fixtures + canary test + one real-tree smoke run |
| `deploy.sh` | edit | +6 lines | After the `ENV` validation block, **before** `load_env_file ".env"`. Anchored by text |
| `build-deploy-profile.sh` | edit | +6 lines | Before the first `load_env_file`, with the existence guard from §7 |
| `package.json` | edit | +1 line | `"check:config-parity": "node scripts/check-config-parity.mjs --pipeline=all --report-only"`, beside `check:docker-secret-boundary` |
| `CLAUDE.md` | edit *(optional — Q6)* | +1 line | One row under Development Commands |

**No application code.** Nothing under `src/`, so CLAUDE.md's "all `src/core/` changes MUST be tested" rule is not engaged — but the guard is tested anyway, by a suite that actually runs.

**Test design.** Synthetic fixtures (a 3-file fake `src/`, a 12-line fake `deploy.sh`) rather than copies of the real tree — fast, deterministic, and they don't break every time a real var is added. One separate test runs the checker against the **real** repo root and asserts exit 0 + no crash. See Q2 on whether that test should also assert a finding baseline.

---

## 9. Verification steps — discharged vs open

| # | Step | This week |
|---|---|---|
| 1 | `0062`'s defect caught | **HALF.** Parity half ✅ — jest removes `PROFILE_INTERNAL_TOKEN=` from a fixture `deploy.sh` and asserts it is named. **The non-empty half is Phase 2 and stays OPEN.** The brief's ⚠️ is explicit that presence alone does not discharge step 1. **Step 1 is not fully discharged this week.** |
| 2 | `0063` https/bare-IP caught | **OPEN** — Phase 2, out of scope by ruling |
| 3 | Forwarded-but-empty caught | **OPEN** — Phase 2. Note B2 (§2) catches the *structurally guaranteed* empty case (`0195`'s shape) with no values; it does **not** catch a forwarded key that is simply unset in the operator's shell |
| 4 | Clean config passes | ✅ for Phase 1 — 0 required violations on the real tree. **Not literally silent**: ~6 informational lines (see Q5) |
| 5 | Optional doesn't fire, unlisted does | ✅ both halves, jest fixtures |
| 6 | Report-only exits 0 / enforcing exits non-zero | **HALF.** Report-only ✅ (fixture with a seeded gap → names it, exit 0). Enforcing is Phase 2 — see Q3 |
| 7 | No value ever printed | ✅ — canary test + static test + `set -x` absent + heredoc not echoed (§6) |
| 8 | Real deploy clean end to end, report-only | **OPEN — and discharged for free by the weekend deploy**, which is the point of landing report-only before then. Nothing to do but read the output |

**No production contact anywhere in this plan.** Everything above runs locally.

---

## 10. Risks

1. **Regex parsers vs. shell reality.** Anchored on delimiters and `printf "export ` prefixes, but a future refactor (e.g. moving the heredoc into a function, or a `for` loop over a var list) silently changes what the guard sees. Mitigated by hard `PARSE-FAILURE` on any anchor miss or empty block — never a silent empty set.
2. **The directory partition is an assumption.** `src/core/**` counts as game-pipeline. True today: `src/profile-server/**` imports only `core/profile`, `core/notifications`, `core/validations` — never `core/configuration/**`, which is where every core env read lives (verified). If that ever changes, the partition silently under-reports. See Q1 for the mitigation.
3. **`node` availability at deploy time.** Guarded by `command -v node`. Worst case: a printed skip line. Cannot break a deploy.
4. **`0201` concurrency** — §7.
5. **The guard finds more than expected on the weekend deploy.** By design; report-only means it costs nothing. Per the brief, each new gap is a new brief, **not** a fix in this task.

---

## 11. Where I think the brief is wrong

Stated rather than planned around:

1. **`deploy.sh:279-308`** — heredoc opens `:279`, body `280–309`, terminator `:310`. Off by one at each end. Harmless as prose, fatal as a parser input; hence delimiter anchoring.
2. **The profile pipeline is presented as one hop.** It is two, and `0195`'s defect lived in the gap between them. Phase 1 can catch that gap **with no values at all** (§2 B2) — stronger than the brief claims for Phase 1. Worth folding into the brief.
3. **Step 3's reverse check is under-specified.** Comparing forwarded keys against `src/` alone yields three certain false positives (`ENVIRONMENT`, `DOCKER_IMAGE`, `DEPLOYMENT_ID`, all consumed by `update.sh`). The consumer set must include the deploy-side scripts.
4. **The brief never mentions the build-time channel.** `DefinePlugin` + `Dockerfile ENV` are legitimate supply routes. Without modelling them, `DEPLOY_ENV`, `GIT_COMMIT`, `OTEL_EXPORTER_OTLP_ENDPOINT` and `STRIPE_PUBLISHABLE_KEY` all look like defects. This is the single biggest FP source and the brief is silent on it.
5. **`0195`'s hand-off is mis-placed, not wrong.** It asks for `YANDEX_PAYMENTS_SECRET` in "the Phase 1 step 4 allowlist", but the variable is forwarded at both hops, so no Phase-1 rule can fire on it. The entry only becomes live in Phase 2.
6. **A live instance of `0063`'s mechanism is still in the script.** `deploy.sh:99` defaults `PUBLIC_PROTOCOL` to the literal `"http"` when unset. Not mine to fix (*"this is a guard, not a fix"*) — reporting it as a candidate new brief.

---

## Open questions

**Q1 — Pipeline partition: directory heuristic, or real import graph?**
Directory (`src/server`+`src/core`→game, `src/profile-server`→profile, `src/client`→build-time) gives the **correct answer on every variable in the tree today**, verified. An import-graph walk from three entry roots would be correct by construction, ~50 more lines plus a resolver.
*Rec:* **directory**, plus a cheap jest test asserting no file under `src/profile-server/**` imports `src/core/configuration/**`, so the assumption cannot drift silently. Import-graph deferred unless you want it.

**Q2 — Should the jest test assert a finding baseline on the real tree?**
A baseline test catches drift the day someone adds an unforwarded var — but it is a **gate in `npm test`**, which is more than report-only-for-deploys. Alternative: v1 asserts only exit-0 and no-crash; the baseline arrives with Phase 2.
*Rec:* **exit-0/no-crash only for v1.** Arming a `npm test` gate this week is a bigger commitment than the ruling covers, and I'd rather you decide it than have it arrive as a side effect.

**Q3 — Ship a tested-but-unwired `--enforce` flag now?**
Zero risk (no script passes it), makes verification step 6's second half demonstrable and Phase 2 a one-word change. But it is arguably "planning the enforcing switch", which the ruling excluded.
*Rec:* **include it, unwired.** Say the word and I'll drop it.

**Q4 — `YANDEX_PAYMENTS_SECRET` allowlist entry that does nothing until Phase 2 — record now or defer?**
*Rec:* **record now**, marked `phase: 2`, so `0195`'s hand-off lands where it asked and Phase 2 doesn't rediscover it. The cost is one inert JSON entry.

**Q5 — The ~6 dead-config findings: report them, or pre-allowlist them as `dead-config`?**
Reporting them is honest and is literally what brief step 3 asks for — but the weekend deploy's output will not be silent. Pre-allowlisting them buys a clean run at the cost of recording a judgment ("these are intentionally dead") that I have not verified with you. **`BASIC_AUTH_USER`/`PASS`, `OTEL_USERNAME`/`PASSWORD`/`ENDPOINT`, `DOCKER_TOKEN` each appear only in `deploy.sh` in the entire repo** — I believe they are legacy, but that is my inference, not evidence of intent.
*Rec:* **report them as INFO**, visually separated from REQUIRED (which will read 0). No recommendation on whether they should then be deleted — that is a new brief.

**Q6 — CLAUDE.md line: in or out?**
`0201` owns documenting test gates. My addition would be one row under Development Commands for `npm run check:config-parity` — not a Testing-section change.
*No recommendation* — depends how tightly you want `0201`'s doc surface held.

---

## How the owner's rulings resolve the open questions

| Q | Coder's rec | Owner ruling |
|---|---|---|
| Q1 | directory + drift test | **ACCEPTED** as recommended (R2) |
| Q2 | exit-0/no-crash only | **OVERRIDDEN — include the baseline gate** (R4). Reasoning: it fails a test run, never a deploy |
| Q3 | include unwired | **ACCEPTED, and extended** (R3): build and test it, leave it wired to nothing **for the weekend deploy**, then wire enforcing immediately after within this same task |
| Q4 | record now, `phase: 2` | **ACCEPTED** as recommended (R2) |
| Q5 | report as INFO | **ACCEPTED** as recommended (R2) — explicitly not pre-allowlisted |
| Q6 | no recommendation | **ADD THE LINE** (R5) |
