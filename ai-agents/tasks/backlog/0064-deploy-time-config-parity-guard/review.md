# Review — 0064

Task: `ai-agents/tasks/backlog/0064-deploy-time-config-parity-guard/brief.md`
Plan: `ai-agents/tasks/backlog/0064-deploy-time-config-parity-guard/plan.md` (rulings R1–R6)
File(s) under review: `scripts/check-config-parity.mjs`, `scripts/config-parity-allowlist.json`,
`tests/scripts/ConfigParity.test.ts`, `deploy.sh:44-55`, `build-deploy-profile.sh:51-64`,
`package.json:33`, `CLAUDE.md:104`, `eslint.config.js:76-91`
Status: **round 2 complete — CONVERGED, no round 3. Ship report-only. The pre-arming gate is now
10 items (was 2) — see *Carried into the pre-arming pass* at the end of this file.**

Reviewers run (Round 1): fkit-reviewer own pass **+** Codex `gpt-5.5` adversarial pass
(`codex exec --sandbox read-only`, exit 0, 7 findings). **Both reviewers ran — coverage is not partial.**

Reviewers run (Round 2): see *Reviewer findings — Round 2* below for the coverage statement.

## Reviewer findings

| #   | Round | Sev    | file:line | Claim |
|-----|-------|--------|-----------|-------|
| R1  | 1     | high   | `scripts/check-config-parity.mjs:69-74`, `:494-518` | `src/core/**` is hard-mapped to the game pipeline, but `src/core/configuration/**` is bundled into the browser (13 `src/client/**` files import it). A core env read that the browser needs is checked only against the deploy heredoc, never against DefinePlugin — so a broken client supply channel prints green. **Reproduced:** deleting the `STRIPE_PUBLISHABLE_KEY` DefinePlugin entry (read at `src/core/configuration/DefaultConfig.ts:77,331`, reachable from `src/client/Main.ts:7`) still yields `REQUIRED 0` and `--enforce` exit 0. Raised by both reviewers. |
| R2  | 1     | medium | `scripts/check-config-parity.mjs:494-518`, `:574-583`; `tests/scripts/ConfigParity.test.ts:679` | The client pipeline has **no reverse (dead-config) check at all**, yet `render()` prints `INFO      0` for it unconditionally — a green line for a check that does not exist. `expect(result.pipelines.client.info).toEqual([])` **cannot fail**: nothing ever pushes to `results.client.info`. Vacuous assertion pinning an absence, not a property. |
| R3  | 1     | medium | `deploy.sh:53-54`, `build-deploy-profile.sh:61-62`, `package.json:33` | No deploy call site checks the client pipeline (`--pipeline=game` / `--pipeline=profile` only). With no CI in this repo, the client pipeline's only gate is a developer running `npm test`. Compounds R1/R2. Raised by Codex, verified. |
| R4  | 1     | medium | `scripts/check-config-parity.mjs:671-677`, `:353-355` | **Advisory for R3's post-weekend `--enforce` wiring, not a defect today.** Confirmed nothing passes `--enforce` (both call sites and `package.json:33` pass `--report-only`). Failing closed on PARSE-FAILURE/DYNAMIC-READ is the right call. Two cautions: (a) `dynamicReads` includes the "maps to no pipeline" case, so adding any new top-level dir under `src/` that reads env would hard-fail a deploy with a message that never names the one-line `DIR_PIPELINE` fix; (b) `skips.length > 0` fails closed on a missing *input*, while the call sites' `-f` guard silently skips a missing *checker* — asymmetric. |
| R5  | 1     | low    | `scripts/check-config-parity.mjs:25-29`, `:643-652`, `:665-669`; `deploy.sh:49-51`; `build-deploy-profile.sh:56-58`; `plan.md` §4 | Two of the three documented exit-contract layers are false as written. Layer 1 ("`--report-only` always exits 0"): reproduced `--report-only --bogus-flag` → **exit 2** (`:652`, returned before report-only is consulted; the suite even pins it at `ConfigParity.test.ts:438-442`). Layer 2 ("any internal throw returns 0"): `render()`, `JSON.stringify` and `process.stdout.write` at `:665-669` sit **outside** the `try` around `analyse()`; a throw there is uncaught → exit 1. Layer 3 (`|| true`) is intact and absolute, so **no deploy can fail** — the defect is a false absolute stated in three places by a task whose purpose is to stop shipping false confidence. Layer 1 raised by both; layer 2 mine. |
| R6  | 1     | low    | `scripts/config-parity-allowlist.json` (`HOSTNAME` entry) | The reason cites `src/core/telemetry/OtelResource.ts`; that path does not exist — the read is at `src/server/OtelResource.ts:20`. The shipped-allowlist test (`ConfigParity.test.ts:688-712`) only checks `reason.trim().length > 0`, never that a cited path resolves. Fresh instance of the rot the file exists to prevent. Other four reasons fact-checked and correct. |
| R7  | 1     | low    | `scripts/check-config-parity.mjs:105-119` | `walkTypeScript` visits only `*.ts`. A `.tsx`/`.js`/`.mjs`/`.cjs` file under `src/` with an env read is invisible **and unannounced** — every other blind spot in this guard is announced. No live impact (`src/client/yandexGamesSdk_test.js` is the only non-`.ts` file under `src/` and reads no env). Raised by Codex, verified. |
| R8  | 1     | low    | `scripts/check-config-parity.mjs:311-312`, `:402-412`, `:482-491` | `isNamedIn` is a bare `\bNAME\b` search over whole consumer files, comments included, so a forwarded key mentioned only in a comment is suppressed from INFO. I checked all 24 reader-bearing heredoc keys against `update.sh`/`Dockerfile`/`nginx.conf`/`startup.sh`: **no live instance**. `ConfigParity.test.ts:201-208` proves a real shell use is accepted; nothing proves a comment-only mention is rejected. Raised by Codex, verified as latent. |
| R9  | 1     | low    | `scripts/check-config-parity.mjs:88`, `:128-159` | `HEREDOC_ASSIGN` anchors at column 0, so an indented key inside a heredoc is dropped from the key set with **no** PARSE-FAILURE. Reproduced on a temp copy of `deploy.sh`: indenting `PROFILE_INTERNAL_TOKEN=` makes it report `REQUIRED` — fails loud in the game forward direction (good). The same drop on the `profile.env` heredoc shrinks `hop2` and therefore **silences** a B2 finding — a false negative in 0195's exact shape. Related: `lines.findIndex` (`:130`) takes the **first** matching heredoc; `deploy.sh` has exactly one `<< 'EOL'` today (`:292`), so no live impact. |
| R10 | 1     | low    | `scripts/check-config-parity.mjs:227`, `:398` | `sites` is one array shared across pipelines, so a game finding can cite a `profile-server/` file. Reproduced: `PROFILE_INTERNAL_TOKEN — read but never forwarded (profile-server/InternalAuth.ts:26, server/ProfileApiClient.ts:167)` printed under `pipeline: game`. Sends the reader to the wrong pipeline's file first. |
| R11 | 1     | low    | `tests/scripts/ConfigParity.test.ts:592-603` | Test named "the deploy scripts do not trace-echo their environment" only rejects `set -x` / `set -…x…`. It would pass if a script `echo`'d a secret value or the heredoc body, and it misses `set -o xtrace` and `bash -x`. **Not vacuous** (it would fail if `set -x` were added) — narrower than its name. Codex called it vacuous; I downgrade to incomplete. |

### Disproven / not recorded as rows — do not chase these

- **Codex #3, "the profile drift test is too narrow"** — PARTIALLY CORRECT but mostly unreachable. Verified `src/profile-server/` has 12 `.ts` files and 35 relative double-quoted `from "…"` imports (several `../core/…`), so the test body genuinely executes — **not vacuous**. Single-quoted imports are impossible under the repo's prettier config; there are no `import(` or `require(` calls in `src/profile-server/`; there are no non-`.ts` files there. The one real gap is **transitive** imports, and I verified `src/core/{notifications,profile,validations}` — everything profile-server actually pulls from core — have **no** hop to `src/core/configuration`. Assumption holds today. The import-graph walk is deferred by ruling R2 (suppressed below).
- **CRLF** — tested. A CRLF copy of `deploy.sh` produces byte-identical guard output. `plan.md` §10 risk 1's CRLF worry does not apply.
- **`--json` leak path** — tested. The result object carries 7 keys, 1907 bytes, no heredoc body, no values.
- **A report-only path that fails a deploy** — I could not construct one. The `if [ -f … ] && command -v node` condition cannot fail under `set -e` (a failing `if` condition is exempt) and `|| true` absorbs every node outcome: exit 2, an uncaught stack trace, a signal, a missing `node`, an import-time syntax error. Verified in both scripts.

## Coder response

_(coder-owned — reviewer does not write here)_

**Round 1 processed 2026-09-02** by `fkit-coder` spawned as the Process-review worker of
`/fkit-sprint-ship-loop`, under the owner's dispositions **D1–D7** (given live in the driver session,
answering all 6 reviewer questions). **Every one of the 11 findings was re-verified against the code
before any action. All 11 hold.** No finding was refuted; two are recorded below with a correction to
their scope rather than to their substance.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT — confirmed** | Defect (high) | **Deliberately NOT fixed** (**D1**). Recorded instead as a loud, owner-acknowledged gap: a 14-line ⚠️ block on `DIR_PIPELINE` in `scripts/check-config-parity.mjs`, plus a pointer at the client section, naming the reproduction, the severity, the ruling, and the agreed fix. | **Open by ruling — must be fixed before arming** |
| R2 | **CORRECT — confirmed vacuous** | Defect (medium) | **FIXED (D3).** Built the client reverse (dead-config) check. `INFO` for the client is now a real count. The vacuous `expect(...client.info).toEqual([])` is replaced by a positive assertion naming `WEBSOCKET_URL`. Mutation-proved falsifiable. | **Fixed** |
| R3 | **CORRECT** | Defect (medium) | **FIXED (D4).** Both deploy call sites now run `--pipeline=all` (`deploy.sh`, `build-deploy-profile.sh`). `package.json:33` already did. | **Fixed** |
| R4 | **CORRECT — advisory, not a defect today** | Frontier | **NOT actioned (D7).** Not dispositioned; `--enforce` stays wired to nothing (ruling R3). Re-verified: no call site passes `--enforce`. Carried below as an **open question for the pre-arming pass**. | **Open — undisposed** |
| R5 | **CORRECT** | Defect (low) | **FIXED — wording only, no code change (D5).** Corrected in 4 places: checker header EXIT CONTRACT, `deploy.sh` call-site comment, `build-deploy-profile.sh` call-site comment, and `plan.md` §4 — the last as a **dated visible note that leaves the approved text intact**, per D5. | **Fixed** |
| R6 | **CORRECT** | Defect (low) | **FIXED.** `HOSTNAME` reason now cites `src/server/OtelResource.ts` (the real read site; `src/core/telemetry/` has never existed). Plus the durable half: a new test asserts **every** `src/…` path cited in **any** allowlist reason resolves on disk. All 3 cited paths verified. | **Fixed** |
| R7 | **CORRECT** | Defect (low), latent | **Accepted as residual (D6).** See below. | **Residual** |
| R8 | **CORRECT** | Defect (low), latent | **Accepted as residual (D6).** See below. | **Residual** |
| R9 | **CORRECT — reproduced independently** | Defect (low by severity, high by consequence) | **FIXED.** An indented assignment inside a heredoc is now a hard `PARSE-FAILURE` naming the key and line, never a silent drop. Two tests, including the profile shape that would otherwise silence a B2 finding. | **Fixed** |
| R10 | **CORRECT** | Defect (low) | **Accepted as residual (D6).** See below. | **Residual** |
| R11 | **CORRECT — and the reviewer's own downgrade is right** | Defect (low) | **Accepted as residual (D6).** See below. | **Residual** |

### Scope corrections to two findings — substance upheld, precision added

- **R9's "Related" sub-note** (`lines.findIndex` takes the *first* matching heredoc) is **correct and
  is NOT fixed.** D6 dispositioned the indentation defect, which is what the row's claim and
  reproduction are about; the reviewer themselves recorded "no live impact" and I re-confirmed it —
  `deploy.sh` has exactly **1** `<< 'EOL'` anchor and `setup-profile.sh` exactly **1** `profile.env`
  anchor. Making an ambiguous anchor a `PARSE-FAILURE` is a defensible next step but is a
  behaviour-changing judgment call the dispositions do not settle, so I left it undone rather than
  widen scope. **Carried as a residual below.**
- **R2's fix surfaced a second, unrecorded blind spot that had to be closed for the fix to be
  correct.** `src/client/jwt.ts:104` reads `API_DOMAIN` via **optional chaining**
  (`process?.env?.API_DOMAIN`), a spelling the scanner's read regex did not match. Building the
  client reverse check on the old regex would have reported `API_DOMAIN` — a genuinely-read
  DefinePlugin key — as **dead**: a fresh false positive, in the fix for a finding about false
  confidence. All four read patterns now tolerate optional chaining. **Verified by mutation:**
  reverting the pattern turns the real-tree client test red on exactly that false positive. This is
  the same *family* as R7 (reads the scanner cannot see) but a different *mechanism* — R7 is file
  extensions, this is read spelling. **The reviewer did not raise it; it is recorded here as found
  during the fix, not as an answer to a finding.**

### What the client line now says, and what it still does not mean

Real-tree output after this round — the game half is **byte-identical** to before; the client line is
the change:

```
pipeline: client
REQUIRED  0
INFO      1  substituted by DefinePlugin, no reader found: WEBSOCKET_URL
```

`WEBSOCKET_URL` is a genuine finding: webpack substitutes it, nothing in the repository reads it.
⚠️ **`REQUIRED 0` on this pipeline still does not mean the browser's supply channel is sound** — that
is R1, unfixed by ruling.

### Verification of this round

| Check | Result |
|---|---|
| `npm test` | ✅ **108 suites / 1121 tests**, all passed, 2.4 s, first run, no flake, no re-run needed. (Was 1114; **+7** new tests.) `PASS tests/scripts/ConfigParity.test.ts` — **46/46**, was 39 |
| `npm run lint` | ✅ **exit 0**, no output |
| `npx prettier --check` on the 3 touched code files | ✅ clean |
| `bash -n deploy.sh` / `bash -n build-deploy-profile.sh` | ✅ both parse |
| Real-tree guard run, and the **exact `deploy.sh` call-site command line** | ✅ exit 0. game `REQUIRED 0 / INFO 6 / ALLOWED 4` unchanged; profile `0/0/0`; client `REQUIRED 0 / INFO 1` |
| `tests/scripts/profile-deploy-hardening.test.sh` before/after diff | ✅ **DIFF EMPTY.** 65 lines each, both `ALL PASS`, both exit 0. Run in a **mirror repo root** (symlinks + a copy of the harness + before/after copies of `build-deploy-profile.sh`), so **the tracked harness was never edited and the tracked script was never swapped** — `0201` is in flight. The tracked harness was also run once directly in the real tree: `ALL PASS` |
| **Mutation testing — can the new tests actually fail?** | ✅ **5 of 5 mutations go red.** Detail below |

### ⚠️ The new tests were proved falsifiable — not assumed (D3)

D3 required this explicitly, because R2's whole point is that an assertion pinning an absence can be
vacuous. Each mutation breaks the behaviour a test names; each was reverted immediately after.

| Mutation | Tests that went RED |
|---|---|
| Delete the client reverse-check `push` | "reports a DefinePlugin key that nothing reads" · "reports the one dead DefinePlugin substitution on the client" |
| Scope the client reverse check to `src/client/**` reads only | "counts a read anywhere under src/ as a DefinePlugin consumer" · "reports the one dead DefinePlugin substitution" |
| Revert optional-chaining tolerance in the read pattern | "enumerates an optional-chained read" · "reports the one dead DefinePlugin substitution" |
| Disable the R9 indented-assignment detection | "PARSE-FAILURE when a deploy heredoc key is indented" · "an indented profile.env key fails loud instead of silencing a hop-1 finding" |
| Restore the wrong `HOSTNAME` path in the allowlist | "every source path cited in an allowlist reason actually resolves" |

**The second mutation matters most for honesty:** my "counts a read anywhere under `src/`" test asserts
an **absence** (`info === []`) — structurally the same shape R2 called vacuous. It stays green under
mutation 1, so mutation 1 alone would not have proved it. Mutation 1b is what proves it. A test that
only ever pins an absence is not evidence unless something can make it fire.

**Also confirmed working:** the pre-existing static no-leak test caught **my own** first draft — a
comment I added spelled the environment member access un-escaped, and the suite went red until I
reworded it. The guard's safety property is enforced against its own author.

### Change surface, this round

| File | Lines | What |
|---|---|---|
| `scripts/check-config-parity.mjs` | `:25-38` | R5: EXIT CONTRACT header rewritten — precise, attributes the absolute to the call sites' `\|\| true` |
| | `:79-95` | **R1 (D1): the ⚠️ known-gap block above `DIR_PIPELINE`** (`:96`) — reproduction, severity, ruling, and D2's agreed fix method |
| | `:108-126` | Read patterns tolerate optional chaining; `HEREDOC_ASSIGN_INDENTED` added with a comment on why column 0 is deliberate |
| | `:177-192` | **R9:** indented heredoc assignment ⇒ hard `PARSE-FAILURE` naming key and line |
| | `:551-554` | R1 pointer at the client section — a green line here is not a sound browser channel |
| | `:576-594` | **R2 (D3): the client reverse check** |
| | `:652-662` | `render()` takes the INFO label from the findings, so the client line reads accurately and the game line stays byte-identical |
| `scripts/config-parity-allowlist.json` | `:23` | **R6:** `HOSTNAME` reason path corrected |
| `tests/scripts/ConfigParity.test.ts` | +7 tests (39 → **46**) | 2 client-reverse · 2 R9 indent · 1 optional-chaining · 1 allowlist-path-resolution · 1 real-tree client INFO (replacing the vacuous assertion) |
| `deploy.sh` | `:44-62` | **R5** wording + **R3/D4** `--pipeline=all` (`:61`) |
| `build-deploy-profile.sh` | `:51-71` | **R5** wording + **R3/D4** `--pipeline=all` (`:70`) |
| `plan.md` | §4 | **R5/D5** dated visible correction note; approved text left byte-intact |

**Not touched:** `tests/scripts/profile-deploy-hardening.test.sh` (`0201` in flight) · `package.json` ·
`eslint.config.js` · `CLAUDE.md` · anything under `src/` · `ai-agents/wiki-vault/`. No commit, no push,
no task file moved, no production contact. **No secret value appears anywhere — variable names only.**

## Accepted residuals (shared, do-not-re-litigate)

Recorded per owner disposition **D6** (R7, R8, R10, R11) and **D7** (R4). Re-raise only on the stated
trigger.

- **R7 — `walkTypeScript` visits only `*.ts`, and does not announce that.** Accepted. No live
  instance: `src/client/yandexGamesSdk_test.js` is the only non-`.ts` file under `src/` and reads no
  environment. Cost of fixing is real (the extension set becomes another thing to keep true), the
  payoff is zero today. ⚠️ It is a **silent** blind spot in a guard whose stated philosophy is to
  announce its limits — that asymmetry is accepted knowingly, not overlooked. **Re-raise when a
  `.tsx`/`.js`/`.mjs`/`.cjs` file under `src/` reads the environment.**
- **R8 — `isNamedIn` matches comments, so a comment-only mention suppresses an INFO line.** Accepted.
  I re-confirmed the reviewer's check: no live instance among the reader-bearing heredoc keys. Failure
  mode is **under-reporting a dead key**, never a false REQUIRED — the safe direction. **Re-raise if a
  key is ever shown suppressed by a comment-only mention.**
- **R10 — `sites` is shared across pipelines, so a finding can cite the wrong pipeline's file first.**
  Accepted. Cosmetic: it misdirects the reader's first click; the finding itself and the pipeline
  label are correct. **Re-raise if it ever causes a misdiagnosis, or fold into the R1 pre-arming pass,
  which touches this code anyway.**
- **R11 — the trace-echo test is narrower than its name.** Accepted, **with the reviewer's own
  downgrade upheld**: it is *incomplete*, not vacuous — it would genuinely fail if `set -x` were
  added. Misses `set -o xtrace`, `bash -x`, and an explicit `echo` of a secret. **Re-raise if a script
  ever gains a trace path it does not cover — or rename the test to what it checks.**
- **R9's `findIndex` sub-note — the parser takes the FIRST matching heredoc.** Accepted as residual
  (not dispositioned; see the scope correction above). No live impact: 1 anchor in each file today.
  **Re-raise the moment a second `<< 'EOL'` heredoc appears in `deploy.sh`.**
- **R4 — the `--enforce` fail-closed edges.** **NOT dispositioned; explicitly left open (D7).**
  `--enforce` remains wired to nothing (ruling R3) and stays that way. Carried to the pre-arming pass
  as an **open question**, not a residual to be closed: (a) `dynamicReads` includes the "maps to no
  pipeline" case, so a new top-level directory under `src/` that reads the environment would hard-fail
  a deploy with a message that never names the one-line `DIR_PIPELINE` fix; (b) `skips.length > 0`
  fails closed on a missing *input* while the call sites' `-f` guard silently skips a missing
  *checker* — asymmetric.

### Carried into the pre-arming pass — the gate before `--enforce` is wired

> ⚠️ **SUPERSEDED by round 2.** This 3-item list is kept for the record. The live list is
> *Carried into the pre-arming pass* at the end of this file — **10 items**.

1. **R1 (HIGH)** — fix the client blind spot by **D2's agreed method**: classify
   `src/core/configuration/**` reads against **both** the deploy heredoc **and** `DefinePlugin`. The
   method is settled; do not re-decide it.
2. **R4** — decide both fail-closed edges above.
3. Only then wire `--enforce` (ruling R3's second half, still inside task `0064`).

### Suppressed this round as re-litigating settled decisions

- **Import-graph walk instead of the directory heuristic** — settled by **ruling R2** (`plan.md`, Q1). Re-raise only if the directory heuristic is shown wrong for a variable actually in the tree. ⚠️ **R1 above is NOT this**: it names the client↔core edge, which R2's drift test does not cover and which `plan.md` Q1/§10.2 never considered.
- **`--enforce` shipped wired to nothing** — **ruling R3**. R4 above is advisory input for the wiring step, not a challenge to the ruling.
- **`npm test` real-tree baseline gate** — **ruling R4**.
- **The 6 dead-config vars reported as INFO rather than pre-allowlisted** — **ruling R2 / plan Q5**.
- **The `CLAUDE.md` Development Commands line** — **ruling R5**.
- **Phase 2 scope: forwarded-but-empty (`0061`) and http-on-bare-IP (`0063`)** — brief + **ruling R6**.

## Claims verified — Round 1

| Claim | Result |
|---|---|
| `npm test` → 108 suites / 1114 tests, first run, no flake | ✅ 108/108 suites, 1114/1114 tests, exit 0, 2.01 s. `PASS tests/scripts/ConfigParity.test.ts`. No supertest flake — no re-run needed. |
| `npm run lint` → exit 0 | ✅ clean. Also confirmed `scripts/check-config-parity.mjs` really is in the linted set (424 files) with 0 problems — the new eslint block does not silently exclude it. |
| Harness before/after diff empty, 65 lines each, both `ALL PASS` | ✅ **independently re-run.** I rebuilt a mirror repo root in scratch (symlinks + `git show HEAD:build-deploy-profile.sh` + a copy of the harness) so the pre-edit script could run **without touching the tracked file** (`0201` is in flight on it). Both runs: 65 lines, `ALL PASS`, exit 0. `diff` **empty**. |
| First real run `REQUIRED 0 / INFO 6 / ALLOWED 4 / INERT 1` | ✅ exact. |
| No-leak **placement** — guard before the first `load_env_file` in both scripts | ✅ `deploy.sh` guard `:44-55`, first `load_env_file ".env"` `:85`. `build-deploy-profile.sh` guard `:51-64`, first `load_env_file ".env"` `:67`. No earlier `source`, `set -a` or `set -x` in either. The structural half holds. |
| eslint `projectService: false` + the `scripts/bump-version.js` precedent | ✅ precedent exists at `eslint.config.js:64-73`, identical shape. `allowDefaultProject` holds exactly 8 entries (typed-linting's default cap), so the stated reason is accurate. The new block is `files`-scoped to one file; nothing else is weakened. |

> **Ledger hygiene, round 2:** the round-1 write left two stray tool-call marker lines at the end of this
> file. Removed. No content was lost — they followed the last table row. Recorded rather than silently
> tidied, because quietly editing an artifact is the habit this task exists to discourage.

---

# Reviewer findings — Round 2

## VERDICT

**SHIP the report-only guard this weekend as planned.** All five dispositioned fixes (R2, R3, R5, R6, R9)
land and were verified by re-execution, not on report; the game and profile output is **byte-identical**
to round 1; the coder's 5/5 mutation result **reproduced exactly**, including the honesty caveat it
flagged unprompted. **Ten new findings (R12–R21), none ship-blocking, all latent, test-quality, or
pre-arming.** ⚠️ **The real news is not a defect — it is that the pre-arming gate grew from 2 items to
10.** **CONVERGED on the code: no round 3.** One printed-output decision is the owner's.

**Round-2 coverage — NOT partial.** fkit-reviewer own pass **+** genuine model-diverse Codex adversarial
pass (`codex-cli 0.152.0`, `codex exec --sandbox read-only`, exit 0, 9 findings), which the adversarial
agent then extended with 10 of its own, all execution-reproduced. Every claim recorded below was
re-verified by me against the code. **Two Codex-side claims did not survive that check and are recorded
as corrections, not findings.**

## Verification of the round-1 fixes — each re-run, none taken on report

| # | Claimed | My independent verification | Verdict |
|---|---|---|---|
| **R1** | Not fixed by ruling **D1**; recorded as a loud gap | ✅ Present and honest. `scripts/check-config-parity.mjs:79-95` names the mechanism, the `STRIPE_PUBLISHABLE_KEY` reproduction, severity HIGH, ruling D1, and D2's agreed fix method. Second pointer at `:551-554`. Both accurate as written. | **Honestly recorded** — but see **R14**: the R3 fix changed *who now sees the green client line* |
| **R2** | Client reverse (dead-config) check built; vacuous assertion replaced | ✅ Built at `:587-594`. Real-tree run yields exactly `INFO 1 … WEBSOCKET_URL`. I confirmed `WEBSOCKET_URL` appears **nowhere** under `src/` or `resources/` — a genuine finding, not a scanner artefact — and that each of the **other 6** DefinePlugin keys has a real reader, so none is a false negative. | **FIXED — verified** |
| **R2b** (coder-found blind spot) | Read patterns widened for optional chaining after finding `src/client/jwt.ts:104` | ✅ **Load-bearing and correct.** `API_DOMAIN` is read at exactly one site in the tree — `src/client/jwt.ts:104` — and it is a DefinePlugin key; without the widening the new check calls a live key dead. Mutation re-run: reverting `ENV_READ_DOT` reddens 2 tests. I then swept for shapes the widened pattern still cannot see: `const { X } = process.env` **0 instances**, `import.meta.env` **0**, `globalThis.process.env` **0** (and it matches anyway, as a substring). | **FIXED — complete for every shape present in the tree.** The *interaction* with dynamic reads is **R19** |
| **R3** | Both deploy call sites now `--pipeline=all` | ✅ `deploy.sh:61`, `build-deploy-profile.sh:70`, `package.json:33`. `bash -n` clean on both. `tests/scripts/profile-deploy-hardening.test.sh` run in the real tree: **ALL PASS**, tracked harness **unmodified** — `0201` undisturbed. | **FIXED — verified**; side effects are **R14** |
| **R5** | Wording corrected in 4 places, no code change | ✅ The EXIT CONTRACT at `:25-38` is now true line by line: report-only exits 0 for every *analysis* outcome (`:744`, `:753`); an unparseable arg exits 2 (`:734`, before the mode is read); a throw in `render()`/`JSON.stringify`/`stdout.write` (`:747-751`) is outside the `try` and exits 1; the absolute is attributed to the call sites' `\|\| true`. Both call-site comments agree. **No code changed.** ⚠️ One *other* false contract in the same file survived both rounds — **R16**. | **FIXED — verified** |
| **R5 / `plan.md` §4** | Dated note added, approved text byte-intact | ✅ **Verified line by line.** `plan.md:166-169` still carries all four original lines of the approved exit contract, unedited, including the two now known false. The correction is an appended, dated, clearly-marked blockquote at `:171-190` that says so explicitly. **The approved artifact was not rewritten.** | **Correct handling** |
| **R6** | `HOSTNAME` path corrected + new path-resolution test | ✅ Allowlist cites `src/server/OtelResource.ts`. All **3** `src/…` paths cited across all reasons resolve on disk (`Master.ts`, `OtelResource.ts`, `ServerEndpoints.ts`), checked individually. New test at `ConfigParity.test.ts:815-833` is the durable half. ⚠️ It has a gap of its own — **R20**. | **FIXED — verified** |
| **R9** | Indented heredoc key ⇒ hard `PARSE-FAILURE` | ✅ `:177-192` + `HEREDOC_ASSIGN_INDENTED` (`:126`). Both live bodies (`deploy.sh:299-330`, `setup-profile.sh:385-396`) are flat, so **no false PARSE-FAILURE today** and the real-tree run is clean. Mutation re-run: disabling the detection reddens both R9 tests. ⚠️ **The fix is narrower than the invariant its own comment at `:122-124` states, and it changed the failure's blast radius** — **R12** and **R13**. | **FIXED for the indented spelling only** |

## Mutation testing — I re-ran all five in an isolated mirror, and added three of my own

Round 1 caught a vacuous assertion twice, so a falsifiability claim is the last thing to accept on report.
I built a mirror repo root in scratch (every top-level entry symlinked; `scripts/` and `tests/` real
copies) so no mutation ever touched a tracked file. Baseline in the mirror: **46/46 pass.**

| Mutation | Coder reported | I observed | Match |
|---|---|---|---|
| 1 — delete the client reverse-check `push` | 2 red | `✕ reports a DefinePlugin key that nothing reads` · `✕ reports the one dead DefinePlugin substitution on the client` | ✅ exact |
| 1b — scope the client reverse check to `src/client/**` | 2 red | `✕ counts a read anywhere under src/ …` · `✕ reports the one dead DefinePlugin substitution` | ✅ exact |
| 2 — revert optional-chaining tolerance | 2 red | `✕ enumerates an optional-chained read` · `✕ reports the one dead DefinePlugin substitution` | ✅ exact |
| 3 — disable the R9 indented detection | 2 red | `✕ PARSE-FAILURE when a deploy heredoc key is indented` · `✕ an indented profile.env key fails loud` | ✅ exact |
| 4 — restore the wrong `HOSTNAME` path | 1 red | `✕ every source path cited in an allowlist reason actually resolves` | ✅ exact |
| **MX1 (mine)** — make the profile reverse check over-fire (drop its `isNamedIn` guard) | — | `✕ reports exactly the known dead forwarded keys` | new |
| **MX2 (mine)** — **delete** the profile reverse-check `push` | — | `✕ does not let a profile.env key count as its own consumer` — but the **real-tree** assertion at `:771` stays **GREEN** | new → **R17** |
| **MX3 (mine)** — regex probe of `HEREDOC_ASSIGN_INDENTED` over 13 line shapes | — | `export KEY=`, lowercase, and `\v`/`\f`/`\r` indents all escape both patterns | new → **R12** |

**The coder's honesty flag is upheld, and it earns its place.** Mutation 1 leaves *"counts a read anywhere
under `src/`"* **green** — I confirmed it is absent from mutation 1's red list; only 1b reddens it. The
coder's statement that mutation 1 alone would not have proved that absence-assertion falsifiable is
**exactly right**, and volunteering it was the correct behaviour. **MX2 shows the same shape survives in
two more places the coder did not mutate** — recorded as R17, not as a criticism of the disclosure.

## Regression checks — all clean

| Check | Result |
|---|---|
| Game + profile output **byte-identical** | ✅ **Byte-compared** against the verbatim round-1 output preserved at `worklog.md:57-71`. The `pipeline: game` and `pipeline: profile` sections, the header rule and the `INERT 1` line are character-for-character identical, including the 13-space wrap indent and the wrap position after `OTEL_ENDPOINT,`. The **only** delta in the whole report is client `INFO 0` → `INFO 1 … WEBSOCKET_URL`. |
| Client reverse check fires only on `WEBSOCKET_URL` | ✅ Confirmed on the real tree; the other 6 DefinePlugin keys each have a verified reader. |
| `npm test` | ✅ **108 suites / 1121 tests**, all pass, 2.157 s, **first run, no flake, no re-run needed.** `PASS tests/scripts/ConfigParity.test.ts` (46). Claim exact. |
| `npm run lint` | ✅ **exit 0**, no output. |
| `npx prettier --check` on the 3 code files | ✅ clean. |
| `bash -n` both deploy scripts | ✅ both parse. |
| `profile-deploy-hardening.test.sh` | ✅ **ALL PASS** in the real tree; tracked harness **unmodified** — `0201` undisturbed. |
| Test count 39 → 46 | ✅ exact. |
| No source file touched by this review | ✅ `src/`, `scripts/`, `tests/`, `deploy.sh`, `build-deploy-profile.sh` unchanged by me. ⚠️ **Self-report:** my own `npx` invocations rewrote `package-lock.json` (pre-existing `playwright` + `engines` drift, unrelated to `0064`). Restored to `HEAD` immediately; clean again, exactly as found. |

## New findings — Round 2

**None of these blocks the weekend ship.** Every one is latent, test-quality, or gated behind `--enforce`,
which is wired to nothing.

| # | Round | Sev | file:line | Claim |
|---|-------|-----|-----------|-------|
| R12 | 2 | **medium** | `scripts/check-config-parity.mjs:125-126`, `:202-207` | **The R9 fix does not close the invariant its own comment states.** `:122-124` says an assignment "must never be silently dropped", but `HEREDOC_ASSIGN` needs `[A-Z_]` at column 0 and `HEREDOC_ASSIGN_INDENTED` needs `[ \t]+` then `[A-Z_]` — so **`export KEY=…` matches neither**, at column 0 or indented, and neither does a lowercase name. **Reproduced independently twice.** Mine: `export ORPHAN_KEY=${ORPHAN_KEY}` in the `profile.env` heredoc with no hop-1 export prints `REQUIRED 0 / INFO 0` — **total silence**, suppressing both the B2 `lands EMPTY` finding and the reverse INFO; the identical fixture with the plain spelling prints both. Codex-side reproduced the same on the real files. That is `0195`'s exact false negative, silently, in the guard built to catch `0195` — what `:181-185` itself calls "the worst outcome available". **No live instance** (both bodies are flat and `export`-free). ⚠️ I did **not** verify whether Docker Compose's `env_file` tolerates an `export` prefix; if it does, the silent case is a *working* deploy the guard cannot see, and this is worse than medium. **Direction:** define the drop-detector as "a line the key parser did not consume that still looks like an assignment", not as a second hand-written positive pattern. |
| R13 | 2 | low | `scripts/check-config-parity.mjs:186-192` → `:436-455` | **The R9 fix traded a quiet false negative for a loud false positive, and no test pins the result.** `PARSE-FAILURE` returns `keys: []`, so the caller discards the **whole** heredoc. Before the fix, indenting one key at `deploy.sh:312` produced **1** false `REQUIRED`; after it, the same edit produces the `PARSE-FAILURE` **plus ~21 false `REQUIRED`** and drops game `INFO` from **6 to 0**, burying the real dead-key signal. Profile side: 7 false B1 `REQUIRED` and B2 silenced entirely. Loud-over-quiet is the defensible choice and I am **not** asking for it back — but it is a behaviour change this round introduced, unpinned by any assertion. **Mirror risk for arming:** `HEREDOC_ASSIGN_INDENTED` fires on **any** indented `UPPERCASE=` line, not only a real key, so a future heredoc whose body legitimately contains one is a **false** hard `PARSE-FAILURE` — harmless today, a deploy blocker once `--enforce` is wired. |
| R14 | 2 | low | `deploy.sh:61`, `build-deploy-profile.sh:70` | **The R3 fix widened R1's exposure, and no disposition covered that.** Before this round `deploy.sh` ran `--pipeline=game` and a deploy operator **never saw a client line at all**. It now runs `--pipeline=all`, so every deploy prints `pipeline: client / REQUIRED 0` — a green line for a forward check R1 proves is incomplete. R1's caveat lives **only** in a source comment and in this ledger; **nothing in the printed output says so.** Second half, for arming: with both entry points on `all`, a parse failure or skip in an *unrelated* pipeline becomes a deploy blocker at both sites once `--enforce` is on. ⚠️ **This does not contradict the owner's rulings and is not a request to re-decide them.** Q1 settled *when* R1 is fixed (before arming) — unchallenged. Q3 settled that both call sites run `--pipeline=all` — unchallenged, and right. R14 is the **interaction**, which neither ruling considered, and its mitigation is one printed line, not R1's fix. **Owner question Q7 below.** |
| R15 | 2 | low | `scripts/check-config-parity.mjs:114-118`, `:308-313` | The read scanner has **no comment or string awareness**. Reproduced: a `.ts` file whose line 2 is the prose comment `// legacy default = process.env, replaced in 2024` emits `DYNAMIC-READ  … the environment object is aliased or destructured`. Under `--enforce` that is a hard deploy failure **caused by a sentence**. The symmetric case records a false *read*, which in the reverse checks suppresses a real dead-config line. **Two near-miss live instances already exist**: `src/server/Master.ts:146` and `src/server/WorkerSupervisor.ts:74` both write `worker.process.env` inside comments, and escape only because neither has a preceding `=` or a trailing `.NAME`. Distinct mechanism from residual R8, which is `isNamedIn` over shell consumer files. |
| R16 | 2 | low | `scripts/check-config-parity.mjs:679-685` vs `:753-759` | **A second false contract of exactly R5's class survived both rounds, in `render()` — the function edited this round.** The enforce footer tests only `requiredTotal` and `parseFailures`; `failClosed` also fails on `dynamicReads` and `skips`. **Reproduced:** `--enforce` on a fixture with only a `DYNAMIC-READ` prints `enforce — no required findings` and exits **1**. The output tells the reader the opposite of what the process did. Zero impact today (`--enforce` wired to nothing); it must not survive arming. |
| R17 | 2 | low | `tests/scripts/ConfigParity.test.ts:244`, `:771` | **Both real-tree absence assertions are one-sided — they catch the check over-firing, never the check being deleted.** Reproduced (MX2): deleting the profile reverse-check `push` leaves `expect(result.pipelines.profile.info).toEqual([])` at `:771` **green**; deleting the client `push` (mutation 1) leaves `expect(names(result.pipelines.client.info)).toEqual([])` at `:244` **green**. Both *are* rescued by the synthetic positive assertions at `:262` and `:225`, so **the suite is not vacuous** — but each real-tree line carries no information on its own. ⚠️ **This corrects an over-strong statement I made earlier this round** ("no vacuous assertion found among the 46"): the right statement is that the suite's *coverage* is sound while two of its individual assertions are not falsifiable in the direction that matters. Same structural shape round 1 called out in R2. |
| R18 | 2 | low | `scripts/check-config-parity.mjs:119`, `:240-252` | `parseDefinePlugin` scans the whole file's **raw text**, not a DefinePlugin block. **Reproduced:** adding `// legacy: "process.env.OLD_FAKE_KEY": JSON.stringify(x),` as a **comment** to `webpack.config.js` makes the guard print `INFO 2 … OLD_FAKE_KEY, WEBSOCKET_URL`. The mirror case is worse: a commented-out or string-embedded key counts as **supplied**, hiding a genuinely missing substitution. Also single-quoted / backtick / computed keys are missed silently (prettier makes single quotes unreachable today, as with residual R8's sibling). |
| R19 | 2 | low | `scripts/check-config-parity.mjs:308-313`, `:462`, `:541`, `:587` | A dynamic or aliased read is **announced** as `DYNAMIC-READ`, but its name never enters `allReadNames` — so all three reverse checks call the corresponding key **dead**. Reproduced: a fixture with `const { API_DOMAIN } = process.env;` emits the `DYNAMIC-READ` line **and** lists `API_DOMAIN` under `substituted by DefinePlugin, no reader found`. Not silent, so this is not R7's class — but it is a false "this is dead" line, which `:586` itself argues "costs the reader's trust in every other line". **0 live instances.** The new client reverse check widened where this can appear. |
| R20 | 2 | low | `tests/scripts/ConfigParity.test.ts:815-833` | R6's durable half only fires on entries that **cite** a `src/…\.tsx?` path. **2 of the 5** shipped entries — `STRIPE_PUBLISHABLE_KEY` and `YANDEX_PAYMENTS_SECRET` — make source-backed factual claims with **no** verifiable citation and pass the test trivially. It catches a bad path; it does not require one. |
| R21 | 2 | low | `scripts/check-config-parity.mjs:459-467`, `:143-157` | The game reverse (dead-config) check iterates only `forwarded` (heredoc keys), so a key supplied **only** by `Dockerfile ENV` is never reverse-checked. ⚠️ **Correction to the Codex-side claim:** its named live instance `PUBLIC_ORIGIN` (`Dockerfile:31`) is **NOT** dead — it is read at `scripts/upload-sourcemaps.js:31`. **I refute that half.** What survives is sharper: the scanner walks only `src/`, so build-tooling reads under `scripts/` are invisible, and extending the reverse check naively **would** produce a *false* dead call on `PUBLIC_ORIGIN`. No live defect; a real asymmetry to reason about before arming. |

### Nits — recorded, no row, no action asked

- `result.checked` is computed for all three pipelines (`:445`, `:505`, `:566`), serialised into `--json`, declared in the test's `PipelineResult` type — and **read by nothing**. `render()` never consults it; no test asserts it.
- `<<-EOL` does not match the game opener (`:432` cannot consume the dash), so it reports `heredoc anchor not found` and floods ~21 false `REQUIRED` — loud, but the message misdiagnoses. No live instance. Terminator matching itself is sound: `lines[i].trim() === delimiter` correctly accepts an indented terminator.
- `--pipeline=game,game` is accepted and renders the section twice (`:702-712`).
- `wrap(…, 13)` (`:658-661`) hardcodes the continuation indent for the game label; the client label is 15 chars longer, so a wrapped client `INFO` line misaligns. Not visible today (1 key).
- Docker `ENV` parsing is stage-blind (`:230-237`) — `Dockerfile:22-33` are build-stage. **No live false pass:** the only game read satisfied by a Dockerfile `ENV` is `GIT_COMMIT`, which is also declared in the final stage at `Dockerfile:79`.
- Same family as R12, far less plausible: a `\v`, `\f` or `\r` indent escapes both heredoc patterns. No realistic shell input produces one. Noted for completeness only.

### Cleared under attack — no finding

`isNamedIn` (`:366-368`) interpolates unescaped into a `RegExp`, but every name reaching it comes from an
`[A-Z_][A-Z0-9_]*` capture — no metacharacter reachable. The `hop2Body` `.replace()` (`:538`) passes a
**string** pattern with `""`, so no `$&` hazard and first-occurrence-only is correct. `arg.slice(12)` /
`arg.slice(11)` are the right offsets. All `openPattern` regexes are non-global — no `lastIndex`
carry-over. `DEFINE_PLUGIN_KEY.lastIndex` is reset at `:243`, and it does not mistake the value-side reads
at `webpack.config.js:336,340,344` for keys. Test fixtures use a fresh `mkdtemp` per call — no shared
state, no order dependence.

### Suppressed this round as re-litigating settled decisions

- **"The profile/core drift test is too narrow"** (Codex round-2 finding X8) — **already refuted in
  round 1's *Disproven* block** and re-raised only because the Codex pass was not primed with the settled
  list. Prettier config makes single-quoted imports unreachable; there is no `import(`/`require(` in
  `src/profile-server/`; the one real gap (transitive imports) is deferred by **ruling R2**. **Discard.**
- Everything already listed under *Suppressed this round* in the round-1 section stays suppressed.

## Carried-open items the coder left undone — both were the right call

- **R9's `findIndex` sub-note** (the parser takes the *first* matching heredoc). **Leaving it undone was
  correct.** I re-verified "no live impact" independently: `deploy.sh` has exactly **1** line matching the
  game opener (`:299`); `setup-profile.sh` contains 8 heredocs but exactly **1** matching the `profile.env`
  opener. Making an ambiguous anchor a `PARSE-FAILURE` is a behaviour change no disposition settles, with
  zero payoff today. Grabbing it mid-round is precisely the move that turns a review into a loop.
- **R4.** **Leaving it open was correct.** The owner explicitly declined to disposition it (Q4), and I
  re-confirmed `--enforce` is passed by **nothing** — neither call site, nor `package.json:33`.

## Convergence call — CONVERGED. Stop here.

**I am calling the stop and recommending against a round 3 on this diff.** Every round-1 fix landed and
was verified by execution; nothing regressed; the falsifiability evidence held up under independent
re-run. The ten new findings are **not defects in the fixes** — they are the same *announced-blind-spot*
tradeoff already accepted as R7/R8 (R12, R15, R18, R19, R21), fail-closed edges that exist only once
`--enforce` is armed (R13, R16), test-quality observations (R17, R20), and one printed-line decision
(R14). None changes a byte of what ships this weekend. **Further rounds on this diff would produce
re-litigation, not defects.**

⚠️ **What did change, and it should be said before anything else: the pre-arming gate is now 10 items,
not 2.** Arming `--enforce` is materially more work than the round-1 ledger implied. That is a scheduling
fact for the owner, not a reason to hold the weekend ship.

## Open question for the owner — one, and it is a shipping decision

**Q7 (R14) — while R1 stays unfixed, should the guard print its own caveat under the client line?**
Every deploy now prints `pipeline: client / REQUIRED 0` with no warning attached. The caveat exists in the
source and in this ledger, where a deploy operator will not see it.

- **Option A — print it (my recommendation).** One line under the client `REQUIRED` count, e.g. *"client
  forward check is INCOMPLETE while R1 is open — a green line here does not mean the browser channel is
  sound."* Cost: one line; no behaviour change; no risk to the byte-identical game output. It is the
  task's own thesis applied to itself.
- **Option B — leave the output as is.** Defensible: report-only ships to a small, informed audience this
  weekend, and R1 is fixed before arming anyway.

Either answer is compatible with the Q1 and Q3 rulings. **Not a ship blocker** — with no answer, ship
as-is and fold R14 into the pre-arming pass.

**R12–R13 and R15–R21 need no owner decision this round.** They are recorded as residuals below, attached
to the pre-arming pass. Raise them only if the owner disagrees with that placement.

## Accepted residuals — Round 2 addendum

All carry the same contract as the round-1 residuals: recorded, not re-litigated, re-raised only on the
stated trigger.

- **R12 — `export KEY=` (and a lowercase name) is still silently dropped from a heredoc.** Accepted as a
  residual **only because there is no live instance**. ⚠️ Unlike R7/R8 this one is **not** in the
  safe-under-reporting direction: it silences `0195`'s exact B2 finding with no announcement. **Re-raise
  the moment any heredoc body gains an `export`-prefixed or lowercase assignment — and fix it in the
  pre-arming pass regardless.**
- **R13 — the R9 `PARSE-FAILURE` discards the whole heredoc (~21 false `REQUIRED`, `INFO` 6→0), and can
  fire on a legitimately indented line.** Accepted; loud-over-quiet is the right trade today. **Re-raise
  before wiring `--enforce`, or if a heredoc body ever legitimately indents an `UPPERCASE=` line.**
- **R15 — the read scanner is comment- and string-blind.** Accepted; report-only absorbs it. **Re-raise
  before arming: under `--enforce` a prose comment is a hard deploy failure.**
- **R16 — `render()`'s enforce footer contradicts `failClosed`.** Accepted; zero impact while `--enforce`
  is wired to nothing. **Must be fixed as part of arming — it is a stated false contract in a task about
  stated false contracts.**
- **R17 — two real-tree absence assertions are one-sided.** Accepted; the synthetic positives cover the
  deletion direction. **Re-raise if either synthetic positive is ever removed or weakened.**
- **R18 — `parseDefinePlugin` scans raw text, so a commented-out key counts as supplied.** Accepted; no
  live instance. **Re-raise the moment `webpack.config.js` gains a commented-out or conditionally-built
  DefinePlugin entry.**
- **R19 — a dynamic read's key is called dead by the reverse checks.** Accepted; it is announced, and
  there are 0 live instances. **Re-raise when any `src/` file aliases, destructures, or computes an
  environment read.**
- **R20 — the allowlist path test does not require a citation.** Accepted. **Re-raise when an allowlist
  entry's uncited claim is found wrong** — which is R6's failure mode, one level up.
- **R21 — `Dockerfile ENV`-only keys are never reverse-checked.** Accepted, with the correction above:
  the Codex-side "live dead key" claim is refuted. **Re-raise only alongside a decision about whether the
  scanner should look outside `src/`.**

### Carried into the pre-arming pass — the gate before `--enforce` is wired (now 10 items, was 2)

1. **R1 (HIGH)** — fix the client blind spot by **D2's agreed method**: classify
   `src/core/configuration/**` reads against **both** channels. Method settled; do not re-decide it.
2. **R4** — decide both fail-closed edges (undisposed, owner-open).
3. **R12** — close the heredoc drop-detector properly (`export`, lowercase), by inversion rather than a
   second positive pattern.
4. **R13** — decide the `PARSE-FAILURE` blast radius, and the false-positive edge.
5. **R14 (second half)** — decide whether both entry points on `--pipeline=all` should fail on another
   pipeline's parse failure.
6. **R15** — comment/string awareness in the read scanner, or `--enforce` fails on prose.
7. **R16** — reconcile the enforce footer with `failClosed`.
8. **R18** — parse the DefinePlugin *block*, not the file's raw text.
9. **R19** — decide what a dynamic read should do to the reverse checks.
10. **R21** — decide whether the scanner looks outside `src/`.

Then, and only then, wire `--enforce` (ruling R3's second half, still inside task `0064`).

---

# Coder response — Round 2

_(coder-owned — reviewer does not write here. The round-2 **Reviewer findings** section above is
untouched.)_

**Processed 2026-09-02** by `fkit-coder`, spawned by `fkit-lead`. Scope was **one finding**: the owner
answered **Q7 (R14) with Option A — print the caveat**. Nothing else in round 2 was actioned.

| # | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R14 (first half) | **CORRECT — confirmed** | Defect (low) | **FIXED by owner ruling (Q7 → Option A).** The client section of the rendered report now carries a printed caveat line. | **Fixed** |
| R14 (second half) | **CORRECT** | Frontier | **NOT actioned.** Whether `--pipeline=all` at both entry points should fail on another pipeline's parse failure is a pre-arming decision; it stays item 5 of the pre-arming list. | **Open — pre-arming** |
| R1 | — | — | **Still deliberately unfixed (D1).** This change does **not** fix R1; it only stops the output from hiding it. | **Open by ruling** |
| R4, R12, R13, R15–R21 | — | — | **Untouched.** Recorded residuals / pre-arming items, exactly as the reviewer placed them. | **Unchanged** |

### What the client section now prints

```
pipeline: client
REQUIRED  0
CAVEAT    the REQUIRED check above is INCOMPLETE — src/core/configuration/** reads are not checked against DefinePlugin
INFO      1  substituted by DefinePlugin, no reader found: WEBSOCKET_URL
ALLOWED   0  (see scripts/config-parity-allowlist.json)
```

The wording names **what is not checked** (`src/core/configuration/**` against DefinePlugin), not just
that something is incomplete, and it ties itself to the `REQUIRED` line directly above it — so it reads
correctly to a deploy operator who has never opened this ledger. It carries no finding number and no
ledger reference, on purpose: the reader is at a deploy prompt, not in `review.md`.

### Byte-identity — re-verified, this is the constraint that made the change delicate

| Check | Result |
|---|---|
| Full before/after `diff` of the real-tree report | ✅ **`12a13` — one pure insertion, nothing modified, nothing removed.** |
| Game + profile + header rule (report lines 1–10) | ✅ **Byte-identical**, `sha256 638a6fe8…` on both sides — and identical to the round-1 verbatim capture at `worklog.md:58-67`, including the 13-space wrap indent and the wrap position after `OTEL_ENDPOINT,`. |
| `INERT` line + exit-contract footer | ✅ Byte-identical, `sha256 f2709353…`. |
| The `wrap(…, 13)` misalignment nit | **Not touched and not triggered.** The caveat is a single `out.push`, never routed through `wrap()`, so it cannot wrap and cannot misalign. The nit itself (a wrapped *client INFO* line misaligning) is unchanged and still invisible — the client `INFO` list is one key. |

### Falsifiability — the new test was mutation-proved, not assumed

R2 and R17 both turned on assertions that could not fail, so a new assertion is not evidence until
something makes it fire. One test added (46 → **47**), three mutations, **3 of 3 go red**, each reverted
immediately; the guard was restored and `diff`-confirmed byte-identical to its pre-mutation state.

| Mutation | Result |
|---|---|
| Delete the `CAVEAT` push | ✕ `prints the R1 caveat inside the client section, and nowhere else` |
| Push it for **every** pipeline (drop the `pipeline === "client"` guard) | ✕ same test — it pins the count at 1 and asserts the game and profile reports contain no `CAVEAT` |
| Weaken the wording to `"this check is not complete"` | ✕ same test — it requires the named path and `DefinePlugin`, not merely the word `INCOMPLETE` |

The test asserts a **presence** in the client report and an **absence** in the game and profile reports,
so it fires in both directions — deletion and over-firing. That is the shape R17 said the two real-tree
absence assertions lack.

### Verification of this round

| Check | Result |
|---|---|
| `npm test` | ✅ **108 suites / 1122 tests**, all passed, 2.5 s, **first run, no flake, no re-run needed.** (Was 1121; **+1**.) `PASS tests/scripts/ConfigParity.test.ts` — **47/47**, was 46 |
| `npm run lint` | ✅ **exit 0**, no output |
| `npx prettier --check` on both touched files | ✅ clean |
| Real-tree guard run | ✅ exit 0; game `REQUIRED 0 / INFO 6 / ALLOWED 4`, profile `0/0/0`, client `REQUIRED 0 / CAVEAT / INFO 1` |

### Change surface, this round

| File | Lines | What |
|---|---|---|
| `scripts/check-config-parity.mjs` | `:618-625` | `CLIENT_FORWARD_CAVEAT` constant + a comment saying **delete it when R1 is fixed** — a caveat that outlives its gap is its own false claim |
| | `:660-661` | `render()` emits the `CAVEAT` line for the client pipeline **only** |
| `tests/scripts/ConfigParity.test.ts` | +1 test (46 → **47**) | Pins the caveat's presence, position, wording, single occurrence, and its **absence** from the game and profile reports |

**Not touched:** `tests/scripts/profile-deploy-hardening.test.sh` (`0201` in flight) · `eslint.config.js`
(owner has a change queued there) · `package.json` · `CLAUDE.md` · anything under `src/` ·
`ai-agents/wiki-vault/`. No commit, no push, no task file moved, no production contact. **No secret value
appears anywhere — variable names only.**

**Out of scope of this file but done in the same session:** `package-lock.json` was reconciled with
`package.json` (`npm install --package-lock-only --ignore-scripts`) — additive only, unrelated to `0064`.
Recorded in `worklog.md`.
