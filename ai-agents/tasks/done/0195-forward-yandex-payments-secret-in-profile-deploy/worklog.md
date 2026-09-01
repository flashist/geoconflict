# Worklog — 0195: Forward `YANDEX_PAYMENTS_SECRET` in the profile deploy pipeline

**Built by:** fkit-coder, spawned as the **Build worker** of `/fkit-sprint-ship-loop` (fkit-lead driver), 2026-09-01.
**Plan:** [`plan.md`](plan.md) — approved by the owner via `AskUserQuestion` in the driver session, 2026-09-01, with rulings **R1–R4**.
**Brief:** [`brief.md`](brief.md)

> **Secret hygiene.** This worklog names **variables only**. No value appears anywhere — not
> truncated, not "starts with", not hashed. No host, endpoint or DSN. `.env*` stays gitignored and
> was never `cat`'d into any output; the only local check made against it was **by variable name**.

---

## Changes — three files, per owner ruling R2

Ruling **R2** extended the brief's literal "two edits" to **three**, deliberately: the harness case is
the only local proof that is *not* diff-reading, and diff-reading is precisely how this failure class
hid three times running.

### 1. `build-deploy-profile.sh` — forward the variable

One `printf` line plus a four-line comment, inserted in the staged-export block immediately after
`DOCKER_TOKEN` and before the `0067` Telegram block:

```sh
    printf "export YANDEX_PAYMENTS_SECRET=%q\n" "${YANDEX_PAYMENTS_SECRET:-}"
```

Matches the neighbours exactly — `%q` quoting (so a value containing spaces, quotes or `$` survives
the source-on-the-box step) and the `${VAR:-}` default. The comment records that **empty is a
supported state** and that the key itself is issued by `0014`.

### 2. `example.env.profile` — document it

Four commented lines appended to the *"Secrets — put these in `.env.profile.secret`"* list at the
bottom, in the same shape and comment column as `FEEDBACK_TELEGRAM_TOKEN`. Records where the value
comes from (`0014`, Yandex dashboard) and that blank is supported: `/v1/payments/*` fails closed with
503, everything else keeps working.

### 3. `tests/scripts/profile-deploy-hardening.test.sh` — the R2 regression case

- The `scp` stub now captures the staged secrets file (identified by its `.profile-deploy-env-<pid>`
  destination — the other two `scp` calls upload `setup-profile.sh` and `profile-backup.sh`) to
  `$WORK/staged.env`.
- `run_deploy` clears `staged.env` between runs, so a stale capture can never read as a fresh one.
- **New T10** drives the *real* `build-deploy-profile.sh` with a **visibly synthetic** value
  containing spaces, a double quote and a `$` (in the harness's existing `SECRET_PW` style; the value
  never leaves the test file), then asserts:
  1. exactly one `export YANDEX_PAYMENTS_SECRET=` line in the captured staged file,
  2. the value **round-trips intact** through sourcing (specials preserved — this is what proves `%q`
     is doing its job),
  3. the value never reaches any `docker`/`ssh`/`scp`/`sshpass` argv.

Assertion 3 is a small extension beyond the two the R2 text names — see the decision log.

### Explicitly NOT changed

`setup-profile.sh` (already correct on both counts — plan §1.3), `src/profile-server/Server.ts` and
`Routes.ts` (fail-closed semantics untouched, per brief scope and R1), any brief, any wiki page. No
on-box persistence was built (**R4**). Nothing was committed or pushed.

---

## ⚠️ Found during build: the shell harness was **already broken at HEAD**, and had been for a while

**This is the most load-bearing thing in this worklog.** Before my change, `bash
tests/scripts/profile-deploy-hardening.test.sh` on the committed tree failed **T1, T2, T3, T4, T5,
T6, T7, T8 and T9**. Verified in a clean detached `git worktree` at `HEAD` (`f2b9422`), i.e. with none
of my edits present — the baseline and my tree failed **identically**.

**Root cause — a fixture gap, not a defect in the deploy script.** `build-deploy-profile.sh:76-79`
hard-exits with `Error: ./profile-backup.sh not found`. That precondition arrived with the T8 backup
work (commit **`b3909a7`**, 2026-07-01, "Claude: helpers for S3 storage"), *after* the harness was
last touched (`5abf198`, 2026-06-23) — so the harness sat broken for **roughly two months**.
`run_deploy` stages
`setup-profile.sh`, `Dockerfile.profile` and `scripts/check-docker-secret-boundary.sh` into its
sandbox but never `profile-backup.sh` — so **every** `run_deploy` died at that check, before the
preflight and before any SCP.

**The dishonest-green part, worth naming:** while the harness was in this state, T3/T6/T7/T9's
`rc != 0` assertions still printed ✅ — the deploy *did* abort, just for entirely the wrong reason,
nowhere near the preflight logic those tests exist to cover. Only their message assertions revealed
it. A reviewer skimming for ❌ would have seen partial green.

**Repair applied:** one line in `run_deploy`, staging an empty executable `profile-backup.sh` exactly
as the three sibling fixtures are staged, with a comment naming why. **This is scope beyond 0195 and
is flagged as a NEEDS-DECISION to the driver** — see the decision log. It is trivially revertible.

After the repair the harness is **otherwise healthy**: no further latent failures surfaced.

---

## Verification — done now, locally

| # | Check | Result |
|---|---|---|
| **N1** | `bash -n build-deploy-profile.sh`; `bash -n` on the harness | **PASS** — both parse clean |
| **N2** | Exactly one `printf "export YANDEX_PAYMENTS_SECRET=%q` line, inside the export block, `${VAR:-}` default | **PASS** — `grep -c` = 1, at `build-deploy-profile.sh:507` |
| **N3** | The script still never prints the staged block | **PASS** — the only `LOCAL_TMPENV` references are `mktemp` (`:479`), `chmod 600` (`:480`), the trap `rm` (`:243`,`:256`), the `>` redirect (`:527`) and the SCP (`:530`). No `cat`. `grep -nE 'set -[a-z]*x\|xtrace'` → **no matches** |
| **N4** | Template documents it, in the secrets list, with the blank-is-supported note | **PASS** — `example.env.profile:99-102` |
| **N5** | Fail-closed still works (no deploy needed) | **PASS** — `tests/profile-server/PaymentsRoutes.test.ts`: **23/23 passed** |
| **N6** | Whole suite + lint clean | **PASS** — `npm test`: **107 suites / 1075 tests, all passed**. `npm run lint`: clean, no output |
| **N7** | End-to-end transport proof (R2) | **PASS** — see below |

### N7 — the R2 harness case, with a negative control

**Positive (this tree, all three edits):** full harness → **`ALL PASS`**, every T1–T10 assertion plus
the structural block. R2 condition 2 satisfied — the *whole* harness was re-run, not just the new
case, and **T1's leak assertion is green** (`password never appears in docker/ssh/scp/sshpass argv`).

**Negative control — the part that makes T10 mean something.** I copied the *new* harness into the
clean `HEAD` worktree, i.e. ran it against the **unfixed** `build-deploy-profile.sh`:

```
== T10: YANDEX_PAYMENTS_SECRET reaches the staged env, %q-quoted, exactly once ==
  ✅ deploy exited 0
  ✅ staged env file was uploaded
  ❌ expected 1 export YANDEX_PAYMENTS_SECRET line, got 0
  ❌ staged value did not round-trip (got 0 chars, expected 28)
```

T10 **fails on the omission and passes on the fix.** It detects this exact defect, rather than
passing vacuously — which, given that the whole class is "it looks forwarded", was worth proving
rather than assuming.

### ⚠️ Honest limit on what the harness buys (R2 condition 3)

**This creates NO automatic gate.** The harness is **manual**: `bash
tests/scripts/profile-deploy-hardening.test.sh`, with **no npm script**, and this repo has **no CI at
all** (no `.github/workflows`). `jest.config.ts:47` matches TypeScript only, so `npm test` cannot
reach a shell transport path by construction. T10 raises the ceiling on what *can* be checked
locally; nobody is forced to check it. The fact that the harness sat broken for **~2 months**
(`b3909a7` 2026-07-01 → this task, with its last touch at `5abf198` 2026-06-23) without anyone
noticing is direct evidence of that gap.

---

## Deferred Live Tail — unchecked, gated (owner ruling R3)

`0195` ships as **built + Deferred Live Tail**. These are **not** satisfied by this task and must not
be presented as such. Option B (deploying with a throwaway value to prove the plumbing sooner) was
**put to the owner and DECLINED** — it would convert a safe fail-closed 503 into publicly-reachable
payments routes armed with a wrong key, and `/yandex/intent` writes DB rows with no signature check,
producing junk intents in the production profile DB for a proof the local Docker stack can give.

- [ ] **D1 — On-box `profile.env` carries `YANDEX_PAYMENTS_SECRET` non-empty.** Check by **length
      only** — never `cat`, never content. **Gate: `0014` (the key does not exist yet) AND the pending
      profile deploy.**
- [ ] **D2 — Profile server startup log no longer emits** *"YANDEX_PAYMENTS_SECRET is not set —
      payments endpoints disabled (503)"*. Cleanest real-box signal; names no value.
      **Gate: `0014` AND the pending profile deploy.**
- [ ] **D3 — `POST /v1/payments/yandex/intent` no longer answers `503
      {"error":"payments_unavailable"}`.** **Owner-gated**; prefer the local Docker profile stack.
      Full signed end-to-end is **`0065`'s** job, not this task's. **Gate: `0014` AND owner agreement.**
- [ ] **D4 — No value appears in deploy output, container log, or any artifact.**
      **Gate: the pending profile deploy only** — independent of `0014`.

**Only D4 and "nothing regressed" are dischargeable at the next profile deploy.** That deploy is
already pending for other reasons (`0062`, `0063`, `0066` all sit on awaiting-deploy markers).

### The consequence the close must carry, not soften

**A profile deploy carried out today, with this fix applied, lands the variable EMPTY and
`/v1/payments/*` keeps returning 503 — correctly.** This is `0062`'s trap arriving on schedule: the
deploy diff shows a fix, production shows the unchanged behaviour, because the value does not exist
yet. Shipping the diff is not shipping a working configuration.

---

## Report-only outputs — no edits made from this task

1. **The brief's "Blocks `0065`" line is inaccurate in effect. Reporting point for the producer; no
   brief edited.** The brief says `/v1/payments/*` "return 503 on the real box **until this ships**".
   Shipping `0195` does **not** by itself lift that 503 — `0065` is blocked on `0195` **and** `0014`.
2. **`0064` needs nothing added — verified, not assumed.** `0064/brief.md:192-197` already records
   that `YANDEX_PAYMENTS_SECRET` goes on the Phase 1 step 4 allowlist **as explicitly optional, with
   the reason recorded, until `0014` issues the key**, then flips to required. Brief step 4 was a
   verify-and-report, and it is discharged.
3. **New input for `0064` — the no-persistence failure mode (R4: reported, not built).** Unlike
   `PROFILE_INTERNAL_TOKEN`, which `setup-profile.sh` persists to `$PROFILE_DIR/.internal_token` and
   reuses across deploys, this variable has **no on-box persistence**. After `0014` lands, a deploy
   run from a machine lacking the key in `.env.profile.secret` will **silently overwrite a working
   value with an empty one**, reverting payments to 503 with only a single startup `warn` to say so.
   That is an argument for `0064`'s non-empty assertion; it is **not fixable by logging**, which is
   why brief step 3 was answered "leave the `warn` level alone" (plan §7, approved under R1).
   Building persistence for a payments secret is out of scope here and is the owner's call.
4. **Full sweep for other omissions — result: none.** `src/profile-server/` reads exactly seven
   environment variables: `DATABASE_URL`, `PROFILE_PORT`, `PROFILE_INTERNAL_TOKEN`,
   `YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`,
   `TELEGRAM_PROXY_URL` (no bracket-form `process.env[...]` access anywhere). All seven are written
   into `profile.env`; **after this fix all seven are in the staged-export block.** The profile app's
   forwarding surface is complete.
5. **Out-of-scope observation, untouched:** the local `.env.profile.secret` still carries
   `PROFILE_ID_PEPPER` from the abandoned/reverted profile-hash approach. Local file only, nothing in
   the repo, not a forwarding gap. Owner hygiene note.

---

## Decision log (ADR-019/ADR-032 audit — unattended actions under the standing approval)

- **Fixes applied without asking — the approved plan itself, exactly as written.** Edits 1 and 2
  (plan §2 table, verbatim) plus edit 3 (owner ruling **R2**). Qualification: **in-plan and
  owner-approved 2026-09-01**; mechanical and localized (one `printf` + comment; four comment lines;
  one additive test case); verified `CORRECT` by N1–N7 including a negative control.

- **Obvious-winner call 1 — T10's third assertion (payments secret never reaches an argv).** R2's
  text names two assertions (single line; specials round-trip); I added a third mirroring T1's
  existing leak check. Qualification: **obvious winner within the plan's intent** — plan §10 lists
  secret leakage as a considered failure mode, this is a money-path credential, the assertion is two
  lines, it reuses the harness's established pattern, and it passes. It cannot fail in a way that
  hides a real problem.

- **Obvious-winner call 2 — cosmetic fix to my own new failure message.** My first draft used
  `n=$(grep -c … || echo 0)`; `grep -c` prints `0` *and* exits 1, so both fired and the failure
  message read `got 0\n0`. Changed to `|| true` plus a `${n:-0}` guard. Qualification: mechanical,
  in my own new line, affects only failure-path output. Caught by running the negative control —
  which is itself the argument for having run one.

- **⚠️ OUT-OF-PLAN ACTION — the harness fixture repair. Applied, and surfaced as a NEEDS-DECISION.**
  The one line staging `profile-backup.sh` in `run_deploy` repairs a **pre-existing** breakage that
  predates 0195 and is not in the approved plan (the plan anticipated *perturbing* the harness, not
  finding it already dead). I applied it rather than stopping first because **R2's own binding
  condition 2 — "the whole harness must be re-run" — is otherwise unsatisfiable**, and because
  running it was the only way to learn whether further latent failures existed (they did not).
  **Whether this repair ships inside 0195 or is split into its own task is a scope call that is not
  mine**, so it went back to the driver as a NEEDS-DECISION with this evidence in hand. Zero
  production risk: test-fixture only, no production code, no deploy behaviour, one line, revertible.

- **Review round:** not run by this worker. The driver owns routing the stateful review.

- **Nothing committed or pushed. `0195` status left `🔄 In progress`** — the driver owns it. No task
  file moved; no mover skill invoked; `ai-agents/wiki-vault/` untouched.

### Round 2 — process-review of `review.md` R1/R2 (owner dispositions D1/D2, 2026-09-01)

- **R1 → fix applied in `run_deploy` (`tests/scripts/profile-deploy-hardening.test.sh`).**
  *Answers:* R1 (ambient operator secrets persisted to `$WORK/staged.env`).
  *What changed:* the deploy subshell now runs under `env -i` with an explicit allow-list
  (`PATH`, `HOME`, `TMPDIR` + the eight fixture variables + caller extras) instead of inheriting the
  operator's environment.
  *Why it qualified:* verified `CORRECT` by first-hand reproduction, mechanical, localized to one
  function, and inside the owner's D1 ruling ("fix it here", reviewer shape (a)).
  *Why this shape and not the two offered verbatim* — **the reviewer's framing understated the
  blast radius, and I verified that before choosing:** `staged.env` is written by **six** runs per
  harness execution (T1, T2, T4, T5, T8, T10), not just T10. A canary run with
  `PROFILE_INTERNAL_TOKEN`/`FEEDBACK_TELEGRAM_TOKEN`/`PROFILE_BACKUP_S3_SECRET_KEY`/`DATABASE_URL`
  set produced **6/6 files containing the canary**. Shape (b) (`rm -f "$WORK/staged.env"` at the end
  of T10) would therefore have closed **one of six** — it does not fix the finding. Shape (a) was
  right, but implemented as a *deny-list of secret variables* it would go stale the moment a new
  variable joins the staged-export block — which is precisely the unmaintained coupling this whole
  task exists because of. An allow-list cannot rot that way, so I took the allow-list form.
  *Bonus, verified not assumed:* it also removes a latent determinism defect — with ambient
  `PROFILE_DEPLOY_ALLOW_UNVERIFIED=1` and `PROFILE_SSH_KEY` set, the pre-fix harness would have had
  T7 proceed instead of abort and T1's `sshpass -f` assertions fail; post-fix both pass.

- **R2 → SHA corrected (`worklog.md`).** *Answers:* R2. *What changed:* `282655c` → **`b3909a7`**
  (2026-07-01, "Claude: helpers for S3 storage") at the root-cause paragraph, plus the honest-limit
  paragraph now states the real **~2-month** broken window rather than "at least one commit".
  *Why it qualified:* verified `CORRECT` independently (`git log -S'BACKUP_SCRIPT' -- build-deploy-profile.sh`
  returns exactly `b3909a7`; `git show --stat 282655c -- build-deploy-profile.sh` is **empty** — it is
  a docs-only "Sprint push"); a two-token factual correction; in-plan under the owner's D2 ruling.

- **No obvious-winner calls beyond the above, and nothing else applied.** Specifically **not** done:
  no `rm` of `$WORK`/`staged.env` (redundant after the root-cause fix, and it would delete the
  artifact T1/T10 failure messages tell you to inspect); no edit to `0201`/`0202` (checked — `0201`
  already carries the correct `b3909a7`, so nothing inherited the wrong SHA); no edit to the
  reviewer's `review.md` section; no change to `setup-profile.sh`, `Server.ts` or `Routes.ts`.

- **⚠️ Residual, stated rather than closed:** `$WORK` (`mktemp -d`) is still **never cleaned** — a
  pre-existing property of the harness, unchanged by this task. After the fix those directories hold
  only the harness's own visibly-synthetic fixtures (`SECRET_PW`, `db-pass-123`, `tok`, `SECRET_YP`),
  no real credential. Cleaning them up would break the `see $WORK/out.log` failure diagnostics, so it
  is left alone and recorded here rather than silently fixed.

- **Re-verification after the round-2 fixes:** N1–N6 re-run plus the **whole** harness
  (**39 assertions, 39 pass, 0 fail, `ALL PASS`** — identical count to the reviewer's independent
  round-1 run, so nothing was perturbed), `npm test` **107 suites / 1075 tests all pass**,
  `npm run lint` clean, and the **T10 negative control re-run against the unfixed deploy script still
  fails** (`❌ expected 1 export YANDEX_PAYMENTS_SECRET line, got 0`; `❌ staged value did not
  round-trip`; `SOME FAILED`, rc=1). The hygiene fix did **not** neuter the regression test.

- **Still nothing committed or pushed; `0195` still `🔄 In progress`; no brief edited; no mover
  skill invoked; `ai-agents/wiki-vault/` untouched.**
