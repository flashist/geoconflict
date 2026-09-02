# Review — 0195

Task: `ai-agents/tasks/backlog/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md`
File(s) under review: `build-deploy-profile.sh`, `example.env.profile`, `tests/scripts/profile-deploy-hardening.test.sh` (working tree, uncommitted)
Status: closed-out (round 1 — R1 and R2 both dispositioned and fixed inside `0195` by owner ruling, 2026-09-01)

**Round 1 verdict: ⚠️ Changes requested — 2 defects (none blocking).**
**Codex coverage: FULL.** Both reviewers ran. Codex (`codex-cli 0.145.0`, model `gpt-5.5`, `--sandbox read-only`) completed and returned one finding plus a checked-and-holds list. No degradation flag applies.

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | `tests/scripts/profile-deploy-hardening.test.sh:87` | The new `scp`-stub capture is unconditional and `$WORK` is never cleaned, so a **real** secret present in the operator's ambient shell (`PROFILE_INTERNAL_TOKEN`, `DATABASE_URL`, `FEEDBACK_TELEGRAM_TOKEN`, `PROFILE_BACKUP_S3_*`, `PROFILE_BACKUP_AGE_RECIPIENT`, or `YANDEX_PAYMENTS_SECRET` itself) is now persisted to disk in `$WORK/staged.env` — an artifact that did not exist before this change. `run_deploy:119-126` overrides only four variables and unsets none of the rest. The harness's own leak guard (`:139`, `:228`) greps `"$WORK"/*.argv` only, so it structurally cannot see this file. **Raised independently by both reviewers.** Bounded: file is mode 0600 inside a 0700 `mktemp -d`, never committed, printed or transmitted; the sandbox `cd`s away from the repo so `.env.profile.secret` is never loaded. |
| R2 | 1 | low | `worklog.md:71-72` | The worklog attributes the `./profile-backup.sh` precondition to commit `282655c`. That commit **does not touch `build-deploy-profile.sh` at all**. `git log -S'BACKUP_SCRIPT' -- build-deploy-profile.sh` returns exactly one commit: `b3909a7` "Claude: helpers for S3 storage", 2026-07-01. The **diagnosis and the repair are unaffected** — `b3909a7` (Jul 1) still postdates the harness's last touch `5abf198` (Jun 23) — but the wrong SHA will be carried into the close and into the separately-filed follow-up task. |

### Verified as CORRECT — no finding (recorded so the coder is not asked to re-prove these)

- **T10 is a real regression test, not theatre.** Reviewer re-ran the negative control independently in a clean detached worktree at `f2b9422` with the new harness against the **unfixed** deploy script: `❌ expected 1 export YANDEX_PAYMENTS_SECRET line, got 0` / `❌ staged value did not round-trip (got 0 chars, expected 28)`. Reproduces the coder's claim exactly. It cannot pass vacuously: a missing `staged.env` fails the existence check, `grep -c` on a missing file yields 0, and the sourcing subshell cannot manufacture the variable.
- **Whole harness re-run — ALL PASS (R2 condition 2).** Independently re-run: T1–T10 plus the structural block, 39 assertions, `ALL PASS`, exit 0. T1's leak assertion is green. The fixture repair perturbs no existing assertion.
- **The harness really was broken at committed `HEAD`, and was falsely green.** Independently re-run pristine at `f2b9422`: T1, T2, T4, T5, T8 fail outright, and T3/T6/T7/T9 print ✅ on their `rc != 0` assertions while their message assertions fail — the false-green shape the coder described, confirmed.
- **The fixture repair is genuinely one line of test fixture.** `: > "$RUN/profile-backup.sh"; chmod +x` mirrors the three sibling fixtures. Zero production or deploy-behaviour effect.
- **Blast radius when unset is nil.** Verified under `/bin/bash` 3.2.57: `printf "export FOO=%q\n" ""` emits `export FOO=''`; sourcing leaves it set-but-empty. `setup-profile.sh:392`'s `${YANDEX_PAYMENTS_SECRET:-}` writes the same empty line either way — the resulting on-box `profile.env` is identical to today's.
- **`%q` matches its neighbours exactly**, and T10 proves the round-trip rather than presence: the fixture carries spaces, a double quote and a `$`, and T10 sources the staged file and compares the recovered value for exact equality.
- **`scp`-stub indexing is correct.** `${@: -2:1}` / `${!#}` work under bash 3.2. All three `SCP_CMD` call sites (`:462`, `:466`, `:530`) put source and destination last, under both the plain `scp` and the `sshpass -f … scp` form (the `sshpass` stub `shift 2`s then `exec`s). Only `/root/.profile-deploy-env-$$` matches `*.profile-deploy-env-*` — the other two destinations are `/root/setup-profile.sh` and `/root/profile-backup.sh`. No misfire.
- **Fixture value is visibly synthetic and confined (R2 condition 1).** `yp-F@ke Payments"Key$notreal` appears in exactly one file repo-wide: the test file. Instrumented run confirms it never reaches `out.log`, any `*.argv`, the worklog, the plan or this ledger — only `staged.env` (see R1).
- **Owner rulings honoured.** R2: three files, whole harness re-run, no overstatement (worklog `:123-130` states plainly that this creates no automatic gate). R3: D1–D4 are unchecked boxes, gated on `0014` **and** the pending deploy; the worklog explicitly refuses to claim production is fixed. R4: no persistence code was added. `setup-profile.sh`, `src/profile-server/Server.ts` and `Routes.ts` are untouched — fail-closed semantics intact; `PaymentsRoutes.test.ts` re-run independently, 23/23 pass.
- **Plan §8's sweep claim is true.** Independently verified: `src/profile-server/` reads exactly seven env vars, no bracket-form access, and after this change **every** variable in `setup-profile.sh`'s `profile.env` heredoc is present in the staged-export block. The config-parity gap is closed for this app.
- **`example.env.profile:99-102` comment column** aligns with `FEEDBACK_TELEGRAM_TOKEN` and `PROFILE_BACKUP_S3_SECRET_KEY`.

### Re-litigates settled decisions (suppressed)

None. Both reviewers were primed with the settled decisions (fail-closed semantics, untouched `setup-profile.sh`, no on-box persistence per R4, manual-harness/no-CI, "shipping ≠ production fixed", warn level). Neither raised any of them. No suppression was required this round.

## Coder response

_(coder-owned — do not write here)_

**Round 1 response — 2026-09-01. Both findings ACCEPTED and FIXED. Both independently re-verified
before acting; neither was taken on the reviewer's word.**

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **AGREE — and the reviewer understated it** | Defect (test-harness hygiene; no production or deploy-behaviour effect) | Reproduced first-hand with an ambient canary, then fixed at the root cause: `run_deploy` now invokes the deploy script under `env -i` with an explicit **allow-list** instead of inheriting the operator's shell. | **FIXED** |
| R2 | **AGREE** | Defect (documentation accuracy) | `worklog.md` root-cause paragraph now cites **`b3909a7`** (2026-07-01, "Claude: helpers for S3 storage"), not `282655c`; the honest-limit paragraph now states the true **~2-month** broken window. | **FIXED** |

### R1 — what I verified, and why I did not use either offered shape verbatim

**The finding holds, and is broader than the ledger states.** `staged.env` is written on **every**
run that reaches the SCP — **T1, T2, T4, T5, T8 and T10**, six files per harness execution — not
T10 alone. Canary run with `PROFILE_INTERNAL_TOKEN`, `FEEDBACK_TELEGRAM_TOKEN`,
`PROFILE_BACKUP_S3_SECRET_KEY` and `DATABASE_URL` set in the ambient shell:

```
staged.env files produced by ONE run:  6
of which contain the ambient canary:   6
export PROFILE_INTERNAL_TOKEN=AMBIENT-CANARY-abc123
```

Consequences for the two shapes the owner relayed:

- **Shape (b) — `rm -f "$WORK/staged.env"` at the end of T10 — does not fix the finding.** It closes
  1 of 6; T1/T2/T4/T5/T8 each leave a populated `staged.env` in a `$WORK` the harness never cleans.
- **Shape (a) is correct, but not as a deny-list.** Enumerating "the secret-bearing vars" to clear
  goes stale the moment a variable joins `build-deploy-profile.sh`'s staged-export block — the exact
  unmaintained coupling that produced this task. So I took shape (a) in its **allow-list** form:
  `env -i` + `PATH`, `HOME`, `TMPDIR` and the eight fixture variables. Nothing can rot into it.

**Also confirmed, not assumed:** the repo's real `.env.profile.secret` was never a channel —
`load_env_file` uses **relative** paths (`build-deploy-profile.sh:53-62`) and `run_deploy` `cd`s into
its sandbox. The ambient shell was the only real-secret route, and it is now closed.

**Unplanned benefit, verified:** the inherited environment was also a **determinism** defect. With
ambient `PROFILE_DEPLOY_ALLOW_UNVERIFIED=1` and `PROFILE_SSH_KEY` set, the pre-fix harness would have
had **T7 proceed instead of abort** and **T1's `sshpass -f` assertions fail**. Post-fix, both pass
with those variables set.

### ⚠️ The regression test still works — the thing that mattered most here

A hygiene fix that quietly neutered T10 would have been the worst outcome. **Negative control re-run
after the fix**, new harness against the **unfixed** `build-deploy-profile.sh` in a detached worktree
at `HEAD`:

```
== T10: YANDEX_PAYMENTS_SECRET reaches the staged env, %q-quoted, exactly once ==
  ✅ deploy exited 0
  ✅ staged env file was uploaded
  ❌ expected 1 export YANDEX_PAYMENTS_SECRET line, got 0
  ❌ staged value did not round-trip (got 0 chars, expected 28)
SOME FAILED   (rc=1)
```

Byte-identical to the round-1 negative control. T10 can still fail on the real defect.

### Re-verification

`bash -n` both scripts **PASS** · N2 `grep -c` = **1** at `build-deploy-profile.sh:507` · N3 no
`cat`/`set -x`/`xtrace` on `LOCAL_TMPENV` (re-checked post-edit) · N4 `example.env.profile:99-102` ·
N5 `PaymentsRoutes.test.ts` **23/23** · N6 `npm test` **107 suites / 1075 tests all pass**,
`npm run lint` **clean** · **whole harness 39 assertions / 39 pass / 0 fail, `ALL PASS`** — the
**same 39** the reviewer counted independently in round 1, so the fix perturbed no existing
assertion, T1's leak guard included.

### Scope discipline

Unchanged, as ruled: `setup-profile.sh`, `src/profile-server/Server.ts`, `src/profile-server/Routes.ts`
(fail-closed semantics intact), no on-box persistence (**R4**), no brief edited. **`0201` was checked
and already carries the correct `b3909a7`** — the wrong SHA was not inherited anywhere, so no
follow-up brief needed touching. Nothing committed or pushed; `0195` left `🔄 In progress`.

## Accepted residuals (shared, do-not-re-litigate)

- **`$WORK` (`mktemp -d`) is never cleaned up.** Pre-existing harness property, unchanged by `0195`.
  After the R1 fix those directories contain only the harness's own visibly-synthetic fixtures
  (`SECRET_PW`, `db-pass-123`, `tok`, `SECRET_YP`) — **no real credential**. Deliberately not
  "fixed": deleting `$WORK` would destroy the artifacts the failure messages tell the operator to
  inspect (`see $WORK/out.log`). Accepted; do not re-raise.
- **The harness creates no automatic gate.** Manual invocation only, no npm script, no CI in this
  repo. Recorded under owner ruling **R2 condition 3** and already carried in `worklog.md:123-130`.
  The follow-up is filed as **`0201`**. Accepted for `0195`; do not re-raise here.
- **`0195` ships built + Deferred Live Tail (D1–D3 unchecked, gated on `0014` AND the pending
  profile deploy).** Owner ruling **R3**; Option B (deploy with a throwaway value) was put to the
  owner and **declined**. Shipping this diff does **not** lift `0065`'s 503. Accepted; do not
  re-raise as a finding.
