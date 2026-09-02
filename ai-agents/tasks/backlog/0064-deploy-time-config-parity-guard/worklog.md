# Worklog — 0064: Deploy-Time Config Parity Guard, Phase 1

**Built by:** fkit-coder, spawned as the **Build worker** of `/fkit-sprint-ship-loop` (fkit-lead driver), 2026-09-02.
**Plan:** [`plan.md`](plan.md) — approved by the owner via `AskUserQuestion` in the driver session, 2026-09-02, with rulings **R1–R6**. Verified on arrival: `git hash-object` = `e52f32c80455a4ecab1579b2060ec93cd4b99021`, 26797 bytes, matching the driver's declared carry.
**Brief:** [`brief.md`](brief.md)

> **Secret hygiene.** This worklog, the guard, its allowlist and its tests name **variables only**.
> No value appears anywhere — not truncated, not hashed, not "starts with". No host, endpoint or DSN.
> No `.env*` file was opened by anything built here. No production server was contacted.

---

## Change surface

| File | Action | Size | What |
|---|---|---|---|
| `scripts/check-config-parity.mjs` | **new** | 680 lines | The guard. Zero deps, Node stdlib only |
| `scripts/config-parity-allowlist.json` | **new** | 47 lines | 5 entries (4 live, 1 inert phase-2) |
| `tests/scripts/ConfigParity.test.ts` | **new** | 724 lines | 39 tests, runs under `npm test` today |
| `deploy.sh` | edit | +13 (`:44-55`) | Report-only call, game pipeline |
| `build-deploy-profile.sh` | edit | +14 (`:51-63`) | Report-only call, profile pipeline |
| `package.json` | edit | +1 (`:33`) | `check:config-parity`, beside `check:docker-secret-boundary` |
| `CLAUDE.md` | edit | +1 (`:104`) | One row under Development Commands (**R5**) |
| `eslint.config.js` | edit | +16 | **Not in the plan's §8 table** — see decision log |

**No application code. Nothing under `src/`.** Nothing committed, nothing pushed. No task file moved.
`ai-agents/wiki-vault/` untouched. `plan.md` not re-authored.

---

## The guard, as built

Three parity relations, all static, all name-only, exactly per plan §2:

- **A — game.** `src/server/**` + `src/core/**` reads must appear in the `deploy.sh` heredoc **or**
  `Dockerfile` `ENV`.
- **B — profile, two hops.** B1: `src/profile-server/**` reads must be in `setup-profile.sh`'s
  `profile.env`. **B2: every `profile.env` key must be exported by `build-deploy-profile.sh`** — a key
  that clears B1 but fails B2 is *guaranteed* to land empty, because the `:-` default fires. That is
  `0195`'s exact defect, caught with no values at all.
- **C — client.** `src/client/**` reads must be in webpack's `DefinePlugin`.
- **Reverse**, pipeline-scoped: a forwarded key with no `src/` read is only called dead after the
  deploy-side consumer set is checked (`update.sh`, `Dockerfile`, `nginx.conf`, `startup.sh` for game;
  `setup-profile.sh`, `Dockerfile.profile` for profile). Without this, `ENVIRONMENT` and `DOCKER_IMAGE`
  are certain false positives.

Every parser is anchored on **delimiters and text**, never line numbers, and **fails loud**: an unfound
anchor or an empty block is a hard `PARSE-FAILURE`, never an empty set silently compared. Blind spots
(`process.env[<expr>]`, aliasing the environment object, a `src/` file mapping to no pipeline) print
`DYNAMIC-READ` rather than a green check.

### Predicted vs actual — the plan's hand-count held exactly

Plan §3 was explicit that its figures were *"hand-computed from grep — not from the unwritten checker.
Treat as the expectation to verify, not a result."* First real run of the built checker:

```
── config parity guard (report-only) ─────────────────────────────
pipeline: game
REQUIRED  0
INFO      6  forwarded, no consumer found: DOCKER_TOKEN, OTEL_USERNAME, OTEL_PASSWORD, OTEL_ENDPOINT,
             BASIC_AUTH_USER, BASIC_AUTH_PASS
ALLOWED   4  (see scripts/config-parity-allowlist.json)
pipeline: profile
REQUIRED  0
INFO      0
ALLOWED   0  (see scripts/config-parity-allowlist.json)
pipeline: client
REQUIRED  0
INFO      0
ALLOWED   0  (see scripts/config-parity-allowlist.json)
INERT     1  allowlist entries recorded for phase 2, not applied: YANDEX_PAYMENTS_SECRET
report-only — exit 0, this cannot fail a deploy
```

**0 required violations, 6 informational, 4 allowlisted** — the predicted numbers *and* the predicted
names. **This is now a measured result, not a prediction.** It is also what the weekend deploy will
print (the game half is reproduced verbatim in N7 below, from the real call site).

**One correction to plan §1:** the `deploy.sh` heredoc carries **30** keys, not 31. Line numbers in the
plan (`:279` open, `:310` terminator) were right. Immaterial — the checker enumerates rather than
counting — but recorded rather than quietly ignored.

---

## Verification

| # | Check | Result |
|---|---|---|
| **N1** | `bash -n deploy.sh`, `bash -n build-deploy-profile.sh` | **PASS** — both parse clean |
| **N2** | Guard runs **before** the first `load_env_file` in both scripts | **PASS** — `deploy.sh` guard `:53-55` vs first `load_env_file` `:85`; `build-deploy-profile.sh` guard `:61-63` vs `:67` |
| **N3** | `tests/scripts/ConfigParity.test.ts` | **PASS** — **39/39** |
| **N4** | `npm test` (whole suite) | **PASS** — **108 suites / 1114 tests**, all passed, in 2.7 s. **First run, no re-run needed, no flake seen** |
| **N5** | `npm run lint` | **PASS** — exit 0, no output |
| **N6** | §7 harness coupling | **PASS** — zero diff, see below |
| **N7** | No-leak, behavioural, at the real call site | **PASS** — see below |
| **N8** | Prettier on new/edited files | **PASS** — see caveat below |

### N6 — the §7 harness coupling proof (zero, as designed)

`tests/scripts/profile-deploy-hardening.test.sh` copies the **real** `build-deploy-profile.sh` into a
fixture dir and runs it end to end. `0201` is in flight on that harness, so I did **not** edit it — but
my `build-deploy-profile.sh` edit executes inside it.

Ran the full harness **before** the edit and **again after**, captured both:

```
$ diff harness-before.txt harness-after.txt
<<< DIFF IS EMPTY >>>
   65 harness-before.txt
   65 harness-after.txt
```

Both runs `ALL PASS`, exit 0, **byte-identical output**. The `-f` existence guard does its job: the
fixture dir stages `scripts/check-docker-secret-boundary.sh` but no `scripts/check-config-parity.mjs`,
so the guard skips silently. Zero new stdout, zero new exit paths.

### N7 — the no-leak guarantee, four independent layers (verification step 7)

1. **Structural.** The checker's only inputs are git-tracked, value-free files. It opens no `.env*`
   file and performs **no environment member read at all** — `process.argv` only.
2. **Placement.** Proven by N2: at the moment the guard runs, no secret has been sourced into the shell.
3. **Behavioural (the real proof), twice.**
   - In jest: a **per-run random canary** is set as `PROFILE_INTERNAL_TOKEN`, `ADMIN_TOKEN`,
     `POSTGRES_PASSWORD`, `DATABASE_URL`, `STORAGE_SECRET_KEY`, `YANDEX_PAYMENTS_SECRET` and
     `GC_CANARY`; the checker is run against the **real tree** (where those names genuinely *are*
     forwarded, so a name→value resolution would show here) and the canary must appear in neither
     stdout nor stderr. **PASS.** The test also asserts a report was actually produced, so it cannot
     pass vacuously.
   - End to end at the real call site: I truncated a copy of `deploy.sh` at the guard, ran it with a
     poisoned environment, and got the full game report with **exit 0 and no canary present**.
4. **Static.** The checker's source contains no un-escaped environment member-access text anywhere —
   code, comment or message — and no quoted dotfile env path. Asserted by plain text search over the
   whole file, so anyone can re-check it with one `grep`.

Plus: `set -x` is absent from `deploy.sh`, `build-deploy-profile.sh`, `setup-profile.sh` and
`update.sh` — now asserted by a test rather than a one-off grep.

### N8 — prettier caveat, stated not hidden

`scripts/check-config-parity.mjs` and `tests/scripts/ConfigParity.test.ts` are prettier-clean (I ran
`--write` on them). **`CLAUDE.md` reports as prettier-dirty — but it already was at `HEAD`, before my
one-line addition.** Verified by checking `git show HEAD:CLAUDE.md` against prettier: same warning. I
left it alone rather than shipping an unrelated whole-file reformat inside this task.

---

## Verification steps — discharged vs open (brief + plan §9)

| # | Step | Status |
|---|---|---|
| 1 | `0062`'s defect caught | **HALF — as the plan said.** Parity half **discharged**: a fixture with `PROFILE_INTERNAL_TOKEN` removed from the heredoc is named. **The non-empty half is Phase 2 and stays OPEN.** Presence alone does not discharge step 1 |
| 2 | `0063` https/bare-IP caught | **OPEN** — Phase 2, out of scope by ruling |
| 3 | Forwarded-but-empty caught | **OPEN** — Phase 2. B2 catches the *structurally guaranteed* empty case (`0195`'s shape); it does **not** catch a key simply unset in the operator's shell |
| 4 | Clean config passes | **DISCHARGED** for Phase 1 — 0 required on the real tree. **Not literally silent**: 6 INFO lines, by design (**R2**/Q5) |
| 5 | Optional doesn't fire, unlisted does | **DISCHARGED**, both halves, plus pipeline-scoping and phase-2 inertness |
| 6 | Report-only exits 0 / enforcing exits non-zero | **DISCHARGED as a flag, WIRED TO NOTHING** per **R3**. Tested both ways on a seeded gap |
| 7 | No value ever printed | **DISCHARGED** — N7, four layers |
| 8 | Real deploy clean end to end | **OPEN — deploy-gated.** This is what the weekend deploy discharges. Nothing to do but read the output |

**This task cannot be closed this week (R6).** Steps 2, 3 and 8 remain open, and **R3's second half —
wiring `--enforce` — is still to do inside this same task**, after the weekend deploy's output is read.

---

## Report-only findings — reported, NOT fixed (this is a guard, not a fix)

1. **`STRIPE_PUBLISHABLE_KEY` is a genuine forwarding gap.** Read at `src/core/configuration/DefaultConfig.ts`,
   `DefinePlugin`-satisfied for the client, defaults to empty on the server, never forwarded. Harmless
   today — the RU market ships no Stripe flow. Allowlisted as `optional` **with that reason recorded**.
   Candidate new brief.
2. **Six dead forwarded keys** (`BASIC_AUTH_USER`, `BASIC_AUTH_PASS`, `OTEL_USERNAME`, `OTEL_PASSWORD`,
   `OTEL_ENDPOINT`, `DOCKER_TOKEN`) — each appears **only** in `deploy.sh` in the entire repo. Reported
   as INFO, **deliberately not pre-allowlisted** (**R2**/Q5: the owner declined to record an
   "intentionally dead" judgment nobody had verified). Deleting them is a separate brief.
3. **A live instance of `0063`'s mechanism is still in the script** — `deploy.sh` defaults
   `PUBLIC_PROTOCOL` to the literal `"http"` when unset. Not fixed here. Candidate new brief.
   *(Carried forward from plan §11.6; not re-verified this session.)*

---

## Decision log (ADR-019/ADR-032 audit — unattended actions under the standing approval)

- **Fixes applied without asking — the approved plan itself.** Everything in plan §8's table, plus
  rulings R2/R3/R4/R5. Qualification: **in-plan and owner-approved 2026-09-02**; verified `CORRECT` by
  N1–N8.

- **Defect fix 1 — the reverse profile check was vacuous. Found and fixed by me, in my own new code.**
  *What:* the profile reverse check reads `setup-profile.sh` as a consumer file — but the `profile.env`
  heredoc **lives in that file**, so every key trivially matched itself and the check could never
  report anything. *Fix:* excise the heredoc's own body before that file counts as a consumer.
  *Why it qualified:* mechanical, localized to one expression in code I had just written, and
  **required for the plan's §2 reverse check to mean anything at all**. Now covered by a test that
  seeds exactly this ("does not let a profile.env key count as its own consumer").
  *Honest note:* the real-tree output is unchanged either way — `POSTGRES_USER`/`PASSWORD`/`DB` are
  genuinely consumed elsewhere in `setup-profile.sh`. So profile `INFO 0` was already the right
  answer; it is now the right answer **for the right reason**.

- **Defect fix 2 — `src/version.ts` mis-reported as an unmapped pipeline.** My first draft took
  `rel.split(sep)[0]` as the owning directory, which for a loose top-level *file* is the filename. It
  printed a spurious `DYNAMIC-READ`. *Fix:* only a directory maps to a pipeline, and an unpartitioned
  file is announced **only if it actually reads the environment**. Mechanical, in my own new code,
  caught by running the checker rather than by reading it.

- **Obvious-winner call 1 — `--enforce` fails closed on more than just REQUIRED.** The plan fixes the
  report-only contract precisely but says nothing about what else should fail enforcing. I made it exit
  1 on `PARSE-FAILURE`, `DYNAMIC-READ` and missing inputs as well. *Why it qualified:* within the
  plan's stated philosophy (§2: *"A guard that silently cannot see something is the failure mode this
  whole task exists to prevent"*) — under enforcing, a guard that cannot see cannot assert. **Zero risk
  today: the flag is wired to nothing (R3).** Flagged here because it is a real semantic choice the
  owner should see before R3's second half wires it.

- **Obvious-winner call 2 — `phase: 2` allowlist entries are INERT and never suppress.** The plan says
  the `YANDEX_PAYMENTS_SECRET` entry is "inert until the non-empty check exists" but does not say how.
  I made phase-2 entries incapable of suppressing a Phase 1 finding, and printed as a separate `INERT`
  line. *Why it qualified:* the alternative — letting a phase-2 entry silently mask a Phase 1 gap — is
  exactly the rot the brief exists to stop. Behaviour is identical on today's tree (no Phase 1 rule
  fires on that variable either way); tested on a fixture where it *would* differ.

- **Obvious-winner call 3 — a `--json` output mode.** Not in the plan's flag list. Added so the tests
  assert on structured results instead of scraping human text. *Why it qualified:* same intent as the
  plan's own "per-input path overrides so tests can feed synthetic fixtures" — testability, additive,
  no behaviour change to the human report, which is separately pinned by its own contract test.

- **⚠️ OUT-OF-PLAN EDIT — `eslint.config.js`. Applied, and flagged.** Not in plan §8's table.
  Unavoidable: a new `.mjs` under `scripts/` fails `npm run lint` until it is registered.
  *First attempt was wrong and I reverted it:* adding the file to `allowDefaultProject` tripped
  typed-linting's cap of 8 files and broke the **whole** lint run (`jest.config.ts`'s own comment warns
  about exactly this cap). *Shipped instead:* a `projectService: false` override block, mirroring the
  existing `scripts/bump-version.js` precedent verbatim, including its
  `prefer-nullish-coalescing: "off"` (that rule needs type information and hard-errors without it).
  Keeps the cap at 8. Zero production risk — lint config only. **Recorded as out-of-plan because it
  is**, not because it is risky.

- **Explicitly NOT done.** No edit to `tests/scripts/profile-deploy-hardening.test.sh` (`0201` in
  flight). No fix to `STRIPE_PUBLISHABLE_KEY`, the six dead keys, or `PUBLIC_PROTOCOL` — reported only.
  No `--enforce` wiring (**R3**, deferred to after the weekend deploy, still inside this task). No
  `CLAUDE.md` reformat. No brief edited. No commit, no push. No mover skill invoked.

- **Review round:** not run by this worker. The driver owns routing the stateful review.

---

## Review round 1 — Process-review worker, 2026-09-02

**Run by:** a second `fkit-coder`, spawned as the **Process-review worker** of `/fkit-sprint-ship-loop`,
applying `fkit-process-stateful-review`'s method under the loop's declared-approval marker.
**Standing approval and scope boundary:** the same approved `plan.md`
(`git hash-object` re-verified on arrival = `e52f32c80455a4ecab1579b2060ec93cd4b99021`, 26797 bytes)
**plus the owner's dispositions D1–D7**, given live in the driver session answering all 6 reviewer
questions. Verdicts and per-finding reasoning: [`review.md`](review.md), *Coder response*.

**Secret hygiene, unchanged:** variable **names** only. No value, no host, no endpoint, no DSN. No
`.env*` file opened. No production server contacted. Nothing committed, nothing pushed, no task file
moved, `ai-agents/wiki-vault/` untouched.

**Result:** `npm test` **108 suites / 1121 tests** pass (was 1114; +7). `npm run lint` **exit 0**.
`tests/scripts/profile-deploy-hardening.test.sh` before/after diff **empty** (65 lines each, both
`ALL PASS`) — run in a scratch **mirror repo root**, so the tracked harness was never edited and the
tracked `build-deploy-profile.sh` was never swapped (`0201` in flight).

### Decision log — unattended actions this round (ADR-019/ADR-032 audit)

All 11 findings were re-verified against the code first. **None was refuted.** Every fix below is
**verified `CORRECT` + mechanical/localized + inside the approved plan as extended by D1–D7**.

- **R2 → D3. Built the client reverse (dead-config) check.** *What:* the client pipeline had no
  reverse check at all, yet `render()` printed `INFO 0` for it unconditionally, and the test pinning
  that (`expect(...client.info).toEqual([])`) could not fail. Added the check; `render()` now takes
  the INFO label from the findings so the game line stays byte-identical. Replaced the vacuous
  assertion with a positive one naming `WEBSOCKET_URL` — a real finding (webpack substitutes it,
  nothing reads it). *Why it qualified:* explicitly dispositioned by the owner (D3), localized to one
  loop plus one label expression. *D3's extra demand discharged:* every new test was **mutation-proved
  falsifiable** — 5 of 5 mutations go red; detail in `review.md`.

- **R3 → D4. Both deploy call sites now run `--pipeline=all`.** *Why it qualified:* dispositioned,
  one word per call site, report-only so the cost is a few output lines. Harness diff re-run after:
  still empty.

- **R5 → D5. Corrected the exit-contract wording in 4 places; changed no code.** Checker header,
  `deploy.sh`, `build-deploy-profile.sh`, and `plan.md` §4. *Why it qualified:* dispositioned as
  wording-only. **`plan.md` is an approved-plan artifact, so per D5 it got a dated, visible
  correction note and its approved text was left byte-intact** — not a silent edit.

- **R6. Corrected the `HOSTNAME` allowlist reason path, and added the test that stops it recurring.**
  `src/core/telemetry/OtelResource.ts` has never existed; the read is at `src/server/OtelResource.ts`.
  *Beyond the literal fix:* a new test asserts **every** `src/…` path cited in **any** allowlist
  reason resolves on disk (all 3 verified). *Why the extra half qualified:* plan §5 already specifies
  a jest test over allowlist shape — this extends it within its stated intent, and a non-empty-reason
  check provably cannot catch this class of rot. Obvious winner.

- **R9. Indented heredoc assignment ⇒ hard `PARSE-FAILURE`.** *What:* `HEREDOC_ASSIGN` anchors at
  column 0, so an indented key was dropped from the key set silently. On the `profile.env` heredoc
  that shrinks hop 2 and therefore **silences a B2 finding** — a false negative in `0195`'s exact
  shape, inside the guard built to catch `0195`. *Why it qualified:* dispositioned (D6, named the
  important one), and the fix is precisely plan §2's stated rule — *"Every parser fails loud"*. Two
  tests, including the profile shape. Verified no spurious firing: neither live heredoc has an
  indented assignment today.

- **Obvious-winner call — read patterns now tolerate optional chaining.** *Not answering a finding;
  found while fixing R2, and required for that fix to be correct.* `src/client/jwt.ts:104` reads
  `API_DOMAIN` via optional chaining, which the scanner's regex did not match. On the old regex the
  new client reverse check would have reported `API_DOMAIN` — genuinely read — as **dead**: a fresh
  false positive introduced by the fix for a finding about false confidence. *Why it qualified:*
  within the plan's intent (§2 treats an unseen read as the failure mode to prevent), mechanical, one
  live instance, and it changes **no** other output — verified by mutation: reverting it turns the
  real-tree client test red on exactly that false positive. **Recorded because the reviewer did not
  raise it.**

- **NOT fixed, by ruling — R1 (HIGH), recorded loudly instead (D1).** The client blind spot ships
  unfixed for the weekend report-only deploy. Recorded as a 14-line ⚠️ owner-acknowledged-gap block
  above `DIR_PIPELINE` (`scripts/check-config-parity.mjs:79-95`) naming the reproduction, the
  severity, the ruling and **D2's agreed fix method**, plus a pointer at the client section, and in
  `review.md`. **`REQUIRED 0` on the client pipeline still does not mean the browser's supply channel
  is sound.**

- **NOT actioned, undisposed — R4 (D7).** `--enforce` stays **wired to nothing** (ruling R3);
  re-verified no call site passes it. Recorded in `review.md` as an **open question** for the
  pre-arming pass, not as a closed residual.

- **Accepted as residuals (D6):** R7, R8, R10, R11 — each recorded in `review.md` with why and with
  its re-raise trigger. Plus R9's `findIndex` sub-note (first-matching-heredoc), left undone as a
  behaviour-changing judgment call the dispositions do not settle; no live impact (1 anchor per file).

- **Scope discipline.** No `--enforce` wiring. No edit to
  `tests/scripts/profile-deploy-hardening.test.sh`. No edit to `package.json`, `eslint.config.js`,
  `CLAUDE.md`, or anything under `src/`. No fix to `STRIPE_PUBLISHABLE_KEY`, the six dead keys, or
  `PUBLIC_PROTOCOL` — still reported only. **No `NEEDS-DECISION` was required this round:** every
  action was covered by D1–D7, and the two judgment calls that were not (R9's `findIndex`, R4) were
  left undone and recorded rather than decided.

**Task still cannot be closed (R6/D7).** Verification steps 2, 3 and 8 remain open, R1 must be fixed
before arming, and R3's second half — wiring `--enforce` — is still to do inside this same task.

---

## R14 — print the client caveat, 2026-09-02

**Run by:** a third `fkit-coder`, spawned by `fkit-lead`. **One finding, one ruling.** The owner answered
review round 2's only open question (**Q7 / finding R14**) with **Option A — print the caveat**. Verdicts:
[`review.md`](review.md), *Coder response — Round 2*.

**Secret hygiene, unchanged:** variable **names** only. No value, no host, no endpoint, no DSN. No
`.env*` file opened. No production server contacted. Nothing committed, nothing pushed, no task file
moved, `ai-agents/wiki-vault/` untouched.

**Why it was needed.** Round 2's R3 fix moved both deploy call sites to `--pipeline=all`, so from now on
**every deploy prints `pipeline: client / REQUIRED 0`** — a green line for a forward check that R1 proves
incomplete. R1's caveat lived only in a source comment and in `review.md`, neither of which a deploy
operator reads. This is the task's own thesis applied to itself.

**What ships:**

```
pipeline: client
REQUIRED  0
CAVEAT    the REQUIRED check above is INCOMPLETE — src/core/configuration/** reads are not checked against DefinePlugin
INFO      1  substituted by DefinePlugin, no reader found: WEBSOCKET_URL
ALLOWED   0  (see scripts/config-parity-allowlist.json)
```

**This does NOT fix R1.** R1 remains open by ruling D1 and remains item 1 of the pre-arming gate. The
change stops the output from hiding the gap; it does not close it.

### Decision log — actions this round (ADR-019/ADR-032 audit)

- **R14 → owner ruling Q7/Option A. Printed the caveat.** *What:* a `CLIENT_FORWARD_CAVEAT` constant
  (`scripts/check-config-parity.mjs:618-625`) and one `render()` line emitted for the **client pipeline
  only** (`:660-661`). *Wording choice, which the ruling left to me:* it names **what is not checked**
  (`src/core/configuration/**` against DefinePlugin) rather than just saying "incomplete", and ties
  itself to the `REQUIRED` line directly above it, so it reads correctly to someone who has never opened
  the ledger. It carries **no** finding number and no ledger pointer — the reader is at a deploy prompt.
  *Why it qualified:* explicitly ruled by the owner; localized to one constant and one `if`.
- **Obvious-winner call — a "delete this when R1 is fixed" instruction in the comment.** Not asked for.
  *Why it qualified:* a caveat that outlives the gap it describes is a false claim of exactly the class
  this task exists to stop, and whoever does the pre-arming pass is the person who must remove it.
- **Obvious-winner call — one new test (46 → 47), mutation-proved.** Not asked for; the repo's testing
  convention and findings R2/R17 both say an assertion is not evidence until something can make it fire.
  It pins the caveat's presence, position, wording, single occurrence, **and its absence from the game
  and profile reports**, so it fires on deletion *and* on over-firing. **3 of 3 mutations go red**
  (delete the push · drop the client guard · weaken the wording); each reverted immediately and the guard
  `diff`-confirmed byte-identical afterwards.
- **Byte-identity re-verified, because it was the binding constraint.** Full before/after `diff` of the
  real-tree report is **`12a13` — one pure insertion**. Report lines 1–10 (header rule + game + profile)
  hash `638a6fe8…` on both sides and match the round-1 verbatim capture at `worklog.md:58-67` exactly,
  including the 13-space wrap indent. The `INERT` line and the exit-contract footer hash `f2709353…` on
  both sides. The reviewer's `wrap(…, 13)` nit is **not triggered**: the caveat is a single `out.push`
  and never goes through `wrap()`.
- **Explicitly NOT done.** No fix to R1. No `--enforce` wiring. R4 and R12–R21 untouched — every residual
  and pre-arming item stays exactly where the reviewer placed it. No edit to
  `tests/scripts/profile-deploy-hardening.test.sh` (`0201` in flight) or `eslint.config.js` (owner change
  queued). No `NEEDS-DECISION` was required.

**Verification:** `npm test` **108 suites / 1122 tests** pass (was 1121; +1), **first run, no flake, no
re-run needed**. `npm run lint` **exit 0**. `npx prettier --check` clean on both touched files.

---

## `package-lock.json` reconciliation, 2026-09-02 — not a `0064` change

Recorded here because it happened in the same session, **not** because it belongs to this task.

`package.json:101` carries `"playwright": "1.61.1"` (added for task `0028`'s capture harness; an exact
pin, matching the already-installed `chromium` 1228 / `ffmpeg` 1011 builds) and `package.json:4-6` carries
the `engines.node` range. Neither was mirrored in `package-lock.json`: round 2's reviewer restored that
file to `HEAD` twice after its own `npx` invocations rewrote it — correctly removing its own drift, and
taking `0028`'s entries with it. Both agents disclosed their side; nobody did anything wrong.

**Fix:** `npm install --package-lock-only --ignore-scripts` — the narrow command, deliberately **not** a
broad `npm install` (that rebuilds `canvas` and fires the husky hook; the owner runs it themselves).

**Result — 51 insertions, 0 deletions. Zero version changes, zero removals, purely additive.**

| Added | What |
|---|---|
| `node_modules/playwright` 1.61.1 | expected |
| `node_modules/playwright-core` 1.61.1 | expected |
| `node_modules/playwright/node_modules/fsevents` 2.3.2 (optional, darwin) | expected |
| root package `devDependencies.playwright: "1.61.1"` | the lockfile's mirror of the same entry |
| root package `engines: { node: ">=24.13.0 <25" }` | ⚠️ **the one delta beyond the three named entries** |

⚠️ **The `engines` block is flagged, not glossed.** It is additive and it mirrors a field that is already
in `package.json` **at `HEAD`** (verified: `git show HEAD:package.json` lines 4-6 are identical to the
working tree) — the lockfile simply never carried it. It is the second half of the drift round 2's
reviewer named ("pre-existing `playwright` **+ `engines`** drift"). It changes no version and removes
nothing, so it does not meet the "stop and report" bar of a churned dependency — but it is beyond the
three entries that were predicted, so it is called out rather than absorbed.
