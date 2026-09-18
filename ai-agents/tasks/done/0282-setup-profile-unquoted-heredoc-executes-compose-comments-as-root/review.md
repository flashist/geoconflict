# Review — 0282

Task: `ai-agents/tasks/done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md`
Plan: `ai-agents/tasks/done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/plan.md`
File(s) under review: `setup-profile.sh` (+30/−6) · `tests/scripts/profile-deploy-hardening.test.sh` (+31/−2) · this folder's `worklog.md`
Out of scope (driver's own status edits): `ai-agents/sprints/plan-sprint-4.md`, this folder's `brief.md`
Status: in-review

**Verdict (round 1): ⚠️ Changes requested — 2 defects, none blocking. The fix itself is correct and
independently reproduced; what is wrong is the *stated justification* for it, in three places.**

Reviewers run: fkit-reviewer (own pass) **and** Codex (`codex exec --sandbox read-only`) — **both ran,
full model diversity, no degradation.** R1 and R2 were raised independently by both.

## Reviewer findings

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| R1 | 1     | medium | `setup-profile.sh:1067-1068` · `plan.md:53-54,75` · `worklog.md` §4 row 8.1 | The comment "pattern and replacement are both literal, so a value containing \| & / or a newline cannot inject anything into the result" is **false on the box's bash**. bash ≥ 5.2 enables `patsub_replacement` by default, so an unquoted `&` in the replacement expands to the matched text. Measured: bash 3.2.57 → `x a&b y`; bash 5.2.15 and 5.3.9 → `x a${V}b y`. The worklog calls bash 3.2 "the stricter case" — for this construct it is the **lenient** one, so the build-time check the plan mandated was run on the platform that cannot fail. Separately, "a newline cannot inject" is a category error: the substitution is literal but the *result is YAML*, and a multi-line value does inject YAML (see R4). **The code is safe today by the guard, not by the claimed mechanism** — fix the claim, not the code (there is no portable inline fix: quoting the replacement inserts literal `"` on bash 3.2, measured). |
| R2 | 1     | low    | `setup-profile.sh:1078` · `tests/scripts/profile-deploy-hardening.test.sh:415-420` | The leftover guard (`grep -q '\${'`) and N4's extraction regex (`\$\{[A-Za-z_][A-Za-z0-9_]*\}`) both see only the **braced** placeholder form. A future template line written `$PROFILE_PORT` is not substituted, not caught by N4, not caught by the guard — and Docker Compose interpolates the unbraced form too (measured: `docker compose config` warns "variable is not set, defaulting to a blank string"). Where the blank lands in `ports:` compose then errors; where it lands in a healthcheck command it is silently wrong. N2/N3 already ban `` ` `` and `$(`, so unbraced `$NAME` is the only remaining `$` form with no gate. Zero occurrences today (verified). |
| R3 | 1     | low    | `setup-profile.sh:1070-1073` | The four substitutions run in sequence over one accumulating string, so an **earlier value's bytes are re-scanned by later passes**. Measured: `POSTGRES_USER='app${POSTGRES_DB}' POSTGRES_DB=db` renders `pg_isready -U appdb`, and the guard stays quiet because the introduced placeholder was consumed. The post-condition therefore proves "no `${` survived", not "the values were inserted literally". Latent; today's four values cannot trigger it. |
| R4 | 1     | low    | `setup-profile.sh:154` · `setup-profile.sh:1072` | `PROFILE_IMAGE=$'repo/name\n    privileged: true\n    # @sha256:<64 hex>'` **passes** the `@sha256`-pinned validation at line 154 (bash `=~` anchors `$` at end of string) and injects arbitrary compose keys under `profile-api:`; the `${` guard stays quiet. Measured on bash 3.2 and 5.2. **Pre-existing, NOT introduced by 0282** — measured identical through HEAD's unquoted heredoc. Input is operator-supplied on a root-run deploy script, so it is not a privilege boundary. Recorded because it falsifies the R1 comment's "newline" clause; the fix (anchor the validation with `^`, or reject a value containing a newline) belongs in its own task, not this one. |
| R5 | 1     | info   | `setup-profile.sh:1069-1084` | The compose file is written **twice** (`cat >` template, then `printf >` substituted) and sits at the umask default — observed `-rw-r--r--` — until the final `chmod 600`. On a guard trip `chmod 600` is never reached and it stays 0644. Independent verdict on the verifier's open observation: **agree it is low, and it is weaker than framed** — the 0644 window is pre-existing (HEAD also did `cat >` then `chmod 600`), the file holds no secret (credentials are in the separate 0600 `profile.env`), and a guard trip aborts the deploy. This is in-plan (plan §2), a frontier-move, not a build deviation. Moving `chmod 600` to immediately after the first `cat >` would close both windows for one line if the owner wants it. |
| R6 | 1     | info   | `worklog.md` §4 row 7(f) | `npm test … 60.2 s` does not reproduce: an independent verifier measured **87.5 s** with identical 137 suites / 1853 tests, both green. Host-load artifact, not behavioural — but it is a number in a durable artifact that the next reader cannot reproduce. Soften or drop it. |

### Verified correct (no row — recorded so they are not re-checked)

- **The root defect is real and I reproduced it independently.** Rendering HEAD's heredoc on this host
  executed `docker compose stop`, `always` and `docker stop` — visible as `always: command not found`
  and `docker stop requires at least 1 argument` on stderr.
- **The rendered-compose diff is exactly 5 lines, all YAML comments** — reproduced from HEAD vs the
  working tree.
- **bash 3.2.57 and bash 5.2.15 render the real template byte-identically** (`cmp` → IDENTICAL). The
  R1 divergence needs a value containing `&`, and no current value can hold one.
- **The rollback path still works.** `sed -i "s|image: ${PROFILE_IMAGE}|…"` at `setup-profile.sh:1170`
  has `${PROFILE_IMAGE}` expanded by the *shell*, and the rendered file carries the expanded ref.
- **The harness cannot double-fire.** `pass()` and `fail()` both return 0
  (`profile-deploy-hardening.test.sh:26-27`), so the `cond && pass || fail` and inverted
  `cond && fail || pass` chains are correct in both directions — not the classic `a && b || c` trap.
- **The awk anchor change cannot go silently vacuous.** A renamed delimiter leaves `/^EOF$/`
  unmatched, `COMPOSE_BLOCK` runs to end-of-file, and N2 (backticks) plus N1 then fail **loudly**.
  A `<<'EOF'` spelling with no space breaks the anchor, and the pre-existing `-n "$COMPOSE_BLOCK"`
  assertion fails loudly. Both directions are loud, never green.
- `bash tests/scripts/profile-deploy-hardening.test.sh` → **`ALL PASS`**, re-run by this reviewer.
- `$(cat file)` + `printf '%s\n'` round-trips this static template's single trailing newline exactly.
- The `grep -q '\${'` guard is `set -e`-safe in its `if` form; `set -u` is not enabled in this script.
- **Weaker than it looks (info, no action):** N4 asserts only that a substitution *line exists*
  naming `${NAME}` — not that its replacement uses the matching variable, nor that it precedes the
  write. `//'${PROFILE_PORT}'/$POSTGRES_DB` would satisfy N4 and the runtime guard.

### Re-litigates settled decisions (suppressed)

- **Other unquoted heredocs in `setup-telemetry.sh`, `build-deploy-telemetry.sh`, `setup.sh`** —
  Codex noted they still exist. Owner ruled 2026-09-18: report only, fix none. Suppressed.
- **Five comment lines, single quotes not backticks** — owner-confirmed 2026-09-18. Verified the
  implementation matches exactly (5 lines, single quotes). Not re-raised.
- **Sprint 4 placement** — owner-confirmed. Not reviewed.

### Convergence call

Round 1, no prior rounds, nothing re-litigated. **Act, do not close out.** Two defects (R1, R2) are
new and cheap; neither blocks the deploy. **R1 is a plan defect, not a build deviation** — the wrong
claim originates in `plan.md` §2/"rejected alternatives" and was faithfully carried into the code
comment and the worklog. The implementation matches the approved plan everywhere I checked.

## Coder response

<!-- CODER-OWNED — the reviewer must not write this section. -->

**Round 1 — 2026-09-18, `fkit-coder` as the sprint loop's Process-review worker.**

**Every one of the six findings was independently reproduced on this host before anything was
written. None was refuted; none was taken on the reviewer's word.** Evidence is in `worklog.md` §8.
Owner dispositions on all six were relayed by the driver from a live `AskUserQuestion` in the lead
session and are recorded per row below.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** — reproduced. bash 3.2.57 → `x a&b y`; bash 5.2.15 (`debian:12`) → `x a${V}b y`, `shopt -p` confirms `patsub_replacement` on by default. The box runs the 5.x line, so the mandated build-time check ran on the only platform that could not fail. The "newline cannot inject" clause is a category error, as R4 shows. | **Defect — in the CLAIM, not the code.** There is no portable inline fix (quoting the replacement inserts literal `"` on bash 3.2). | **Owner ruled: correct all three places.** Two of the three done: the shipped comment in `setup-profile.sh` (the false "cannot inject anything" sentence is gone; replaced with the measured behaviour, why no portable fix exists, and the accurate reason it is safe today — defaulted/validated values plus the fail-closed guard) and `worklog.md` §4 row 8.1 (corrected in place and **marked** as a correction, so the wrong reasoning stays findable). ⛔ The third, `plan.md`, is the **driver's** artifact — left **byte-unchanged** (`git hash-object` → `66c6209be6553ba23ca11893432dbff0cb3caa0a`, 25098 bytes); the driver appends its amendment. **No code behaviour changed.** | **Fixed (claim); 1 of 3 places is the driver's** |
| R2 | **CORRECT** — reproduced. `docker compose config` on `"127.0.0.1:$PROFILE_PORT:$PROFILE_PORT"` warns *"variable is not set. Defaulting to a blank string"* ×3 then errors `invalid proto:`. The old guard on that exact rendered file: **quiet**. | **Defect.** Real gap, zero occurrences today. | **Owner ruled: close it now.** Runtime guard widened (`$$` pairs stripped, then the braced `${` check **and** a new unbraced `\$[A-Za-z_]` check, each failing closed with its own message). Harness gained **N5**. **Shape choice made autonomously and flagged here:** the owner said "widen N4", but N4 asserts *"this placeholder has a substitution line"* — which cannot be true of an unbraced name, since only `${NAME}` is substituted. N5 **bans** the unbraced form outright instead, matching N2/N3's existing style; it closes the identical gap without asserting something false. Red-proved against a mutated scratchpad copy with the mutation asserted first (`worklog.md` §8.3); false positives checked (§8.2) — `$$` is Compose's literal-dollar escape and is excluded, a lone `$name` is a **true** positive because Compose would mis-interpolate it anyway. | **Fixed** |
| R3 | **CORRECT** — reproduced on **both** bash 3.2.57 and 5.2.15: `POSTGRES_USER='app${POSTGRES_DB}' POSTGRES_DB=db` → `pg_isready -U appdb -d db`, guard quiet. | Latent defect; today's four values cannot trigger it. | **Owner ruled: accept as a residual, do not change the code.** No code change. Recorded below and in `worklog.md` §8.6. One comment line added at the substitution block naming the residual, so the next editor meets it where it matters — no behaviour change. | **Accepted residual** |
| R4 | **CORRECT** — reproduced on both bash versions: a `PROFILE_IMAGE` ending in `@sha256:<64 hex>` with embedded newlines **passes** the check at `setup-profile.sh:154`, because bash `=~` anchors `$` at end of **string**. Pre-existing; identical at HEAD. | **Pre-existing defect, NOT introduced or worsened by 0282.** | **Owner ruled: file it as its own task. Not fixed here.** No code change. The **driver** routes a producer spawn to file the brief — this worker filed nothing and moved no task file. ⚠️ **The brief must record BOTH severity views: Codex rated it `HIGH`; this project's reviewer downgraded it to `LOW`** (operator-supplied input to a root-run deploy script is inside the trust boundary, not a privilege crossing). | **Out of scope — filed separately** |
| R5 | **CORRECT**, and the reviewer's own downgrade is right. Observed `-rw-r--r--` on this round's guard-trip probe. Pre-existing: HEAD also did `cat >` (line 986) then `chmod 600` (line 1060). | Frontier-move, not a build deviation. In-plan (plan §2). | **Owner ruled: accept as a residual, do not change the code.** No code change. The one-line `chmod 600` move stays available if the owner ever wants it. | **Accepted residual** |
| R6 | **CORRECT.** Third independent measurement this round: **58.0 s**, same 137 suites / 1853 tests green. Three runs, three numbers (60.2 / 87.5 / 58.0) — host-load noise. | Artifact accuracy, not code. | **Owner ruled: soften or drop the number.** The bare `60.2 s` is **gone** from `worklog.md` §4 row 7(f); it now records "green, 137/1853", lists all three measurements, and says explicitly that none is a baseline. | **Fixed** |

### Re-verification after these changes

| Check | Result |
|---|---|
| Plan §7(a) five-line rendered diff, `git show HEAD:setup-profile.sh` vs working tree | **PASS — still exactly 5 changed comment lines** (5 `-`, 5 `+`), zero lines under `services:`/`image:`/`environment:`/`healthcheck:`/`ports:`/`volumes:`/`logging:`/`restart:`. **The R2 widening changed nothing in the generated compose file.** |
| Fixed render, no stubs | **PASS** — exit 0, stdout and stderr empty |
| `docker compose config` on the fixed render | **PASS, actually run** — exit 0, empty stderr (daemon up) |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | **`ALL PASS`** — 8 `0282` assertions green, N5 among them |
| `npm test` | **PASS — 137 suites / 1853 tests, all green.** No supertest failure, so no `0197` triage and no re-run needed. |
| `npm run lint` | **PASS**, exit 0 |
| `bash -n` on both changed files | **PASS** |

No assertion was loosened. Nothing committed, nothing pushed, no task file moved, no wiki write, no
box command. `plan.md` byte-unchanged.

## Accepted residuals (shared, do-not-re-litigate)

<!-- Added only once the owner approves treating a finding as a settled tradeoff. -->

Owner-approved 2026-09-18 (live `AskUserQuestion`, relayed by the driver). **Do not re-raise these in
a later round.**

- **R3 — sequential re-scan of the accumulating string.** The four substitutions run in order over one
  string, so an earlier value's bytes are re-scanned by later passes; the post-condition proves *"no
  placeholder survived"*, not *"the values were inserted literally"*. Reproduced on bash 3.2.57 **and**
  5.2.15. Today's four values (three `:-` defaults, one `@sha256`-validated image ref) cannot trigger
  it. **Accepted; no code change.** Named in a code comment at the substitution block. *Revisit if a
  fifth substituted value is ever added.*
- **R5 — the 0644 window before `chmod 600`.** The compose file is written twice and sits at the umask
  default until the final `chmod`; on a guard trip the `chmod` is never reached and it stays 0644
  (observed). **Pre-existing** — HEAD had the same `cat >` → `chmod 600` shape — and the file holds
  **no secret** (credentials live in the separate 0600 `profile.env`). **Accepted; no code change.**
- **R1 — no portable inline fix for the replacement-side `&`.** The unsafe-on-bash-5.2 substitution
  *form* stays; only the claim about it was corrected. Quoting the replacement inserts literal `"` on
  bash 3.2 (measured), so there is no spelling that is correct on both. Safety rests on the values
  being defaulted/validated and on the fail-closed guard. **Accepted as the residual behind the
  corrected comment.** *Revisit if a value that could contain `&` is ever substituted here.*
- **Harness coupling (pre-existing, declared at `profile-deploy-hardening.test.sh:389`).** N1–N5 and
  the `awk` extraction are coupled to the script's formatting: a reformat produces a **false red**,
  never a false green. Unchanged by this round; N5 joins the same class.

**Not a residual — filed instead:** **R4** (multi-line `PROFILE_IMAGE` passes validation and can inject
compose keys). Pre-existing, out of scope for `0282`, **owner ruled it gets its own task**; the driver
routes the producer spawn. Its brief must carry **both** severity views — Codex `HIGH`, this project's
reviewer `LOW`.
