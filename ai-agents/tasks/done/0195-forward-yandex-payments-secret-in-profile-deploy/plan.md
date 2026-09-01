# Plan — 0195: Forward `YANDEX_PAYMENTS_SECRET` in the profile deploy pipeline

**Status:** awaiting owner approval (ADR-031 plan gate). No source/config edits made.
**Planned by:** fkit-coder (spawned by fkit-sprint-ship-loop, Plan step), 2026-09-01.
**Brief:** [`brief.md`](brief.md)

> ⚠️ **Driver transcription note (fkit-lead, 2026-09-01).** This plan came back through the subagent
> return channel, which **HTML-escaped** `<`, `>` and `&` (including `&&` inside shell snippets). The
> driver **decoded those entities to their literal characters** when writing this file, so the shell
> in §1 and §5 reads correctly. That decoding is the **only** alteration — nothing was summarised,
> reordered, or omitted. **Disclosed rather than claimed as a pure byte-for-byte copy:** a decode is a
> transformation, and calling it "verbatim" without saying so is the overstatement this loop's carry
> construction exists to prevent.

> **Secret hygiene.** This plan, and every verification step in it, uses **variable names and
> emptiness/length checks only**. No value appears anywhere — not truncated, not "starts with", not
> hashed into an artifact. No host, endpoint or DSN is named. `.env*` stays gitignored.

## 1. Mechanism — re-verified against the tree, not taken from the brief

Every link the brief asserts holds. Verified 2026-09-01 against the committed tree:

1. **The staged-export block omits it.** `build-deploy-profile.sh` writes 27 `printf "export …=%q\n"`
   lines into a 0600 `mktemp` file (the block opens at the `{` after the `printf %q` comment, currently
   `:488–522`). `YANDEX_PAYMENTS_SECRET` is **not among them.** The block forwards `PROFILE_IMAGE`,
   `PROFILE_SERVER_HOST`, `PROFILE_DOMAIN`, `PROFILE_PORT`, `PROFILE_SWAP_SIZE_GB`, the Postgres four,
   `PROFILE_INTERNAL_TOKEN`, `PROFILE_INTERNAL_ALLOW_IPS`, `CERTBOT_EMAIL`, the two Docker credentials,
   the three Telegram variables, and the nine backup variables. Nothing else.
2. **The transport is source-then-`rm`.** The file is SCP'd to `REMOTE_ENV`, then a single SSH command
   does `chmod 600 … && . REMOTE_ENV && rm -f REMOTE_ENV && setup-profile.sh` (`:530–535`). Because
   nothing ever set the variable in that shell, it is unset when `setup-profile.sh` runs.
3. **`setup-profile.sh` then writes it empty.** Its `profile.env` heredoc carries
   `YANDEX_PAYMENTS_SECRET=${YANDEX_PAYMENTS_SECRET:-}` (`setup-profile.sh:392`); the `:-` default
   fires. Its header already documents the variable (`:25–26`) — so the on-box half is **already
   correct and needs no edit.**
4. **The app fails closed, correctly.** `src/profile-server/Server.ts:35–39` reads the variable, and
   warns once at startup when empty. `src/profile-server/Routes.ts:385–396` installs `paymentsEnabled`
   across `/v1/payments`, returning `503 {"error":"payments_unavailable"}` when the secret is empty —
   and `:400` additionally skips registering the three handlers without a repo. `/yandex/intent`,
   `/yandex/complete`, `/yandex/reconcile` alike.
5. **The template gap is real.** `example.env.profile` has no mention of the variable — not in the
   plaintext body, not in the commented *"Secrets — put these in `.env.profile.secret`"* list
   (`:86–98`), which ends at `FEEDBACK_TELEGRAM_TOKEN`.

**Two things the brief says that are now stale, in the harmless direction:**

- The brief warns that `build-deploy-profile.sh` / `setup-profile.sh` carry **uncommitted `0067`
  changes** so line numbers will move. They are **committed now** — both files are clean in
  `git status`. The line numbers above are stable as of today. I still cite the anchor (`printf "export `)
  as the brief instructs, so the plan survives any further movement.
- The brief's Notes say `0195` **blocks `0065`**, phrased as "…return 503 on the real box **until this
  ships**." That is not accurate, and §6 below is the correction: shipping this does **not** lift the
  503.

## 2. The edit surface — the brief's "two edits" is **right**, with one optional third

| # | File | Change | Status |
|---|---|---|---|
| 1 | `build-deploy-profile.sh` | +1 `printf` line, +1 explanatory comment, inside the staged-export block | **required** |
| 2 | `example.env.profile` | +2–4 commented lines in the bottom secrets list | **required** |
| 3 | `tests/scripts/profile-deploy-hardening.test.sh` | new regression assertion (see §5, NEEDS-DECISION 1) | **optional — owner call** |

Nothing else. Explicitly **not** changed: `setup-profile.sh` (already correct on both counts),
`src/profile-server/Server.ts` and `Routes.ts` (fail-closed semantics stay), `0064`'s brief, `0065`'s
brief, any wiki page.

### Edit 1 — `build-deploy-profile.sh`

Add, immediately after the `DOCKER_TOKEN` line and before the `0067` Telegram comment block, matching
the Telegram trio's style exactly (the brief's named pattern — `${VAR:-}` default plus a comment
saying what empty means):

```sh
    # Yandex per-game payments HMAC secret (task 0019). Rides the same 0600-staged,
    # source-then-rm channel as the DB password. Empty is a SUPPORTED state: the
    # payments routes fail closed with 503 and the rest of the profile server is
    # unaffected. The key itself is issued by task 0014 (Yandex catalog registration).
    printf "export YANDEX_PAYMENTS_SECRET=%q\n" "${YANDEX_PAYMENTS_SECRET:-}"
```

Placement note: adjacent to the other credentials rather than at the end of the block; ordering has no
functional effect (the file is sourced whole), so this is a readability choice only.

### Edit 2 — `example.env.profile`

Append to the commented secrets list at the bottom, in the same shape as `PROFILE_INTERNAL_TOKEN` and
`FEEDBACK_TELEGRAM_TOKEN`:

```
# YANDEX_PAYMENTS_SECRET=       # Yandex per-game payments secret key (HMAC), from the
#                               #   Yandex Games dashboard once task 0014 registers the
#                               #   catalog. BLANK IS SUPPORTED: /v1/payments/* fails
#                               #   closed with 503; everything else keeps working.
```

## 3. Blast radius — nil when unset, and the `0064` ordering is untouched

- **With no value configured (today's state), the deploy outcome is byte-identical.**
  `printf "export YANDEX_PAYMENTS_SECRET=%q\n" ""` emits `export YANDEX_PAYMENTS_SECRET=''`; sourcing
  sets it empty; `setup-profile.sh`'s `${VAR:-}` writes the same empty line it writes today. Same
  `profile.env`, same 503, same startup warn. The change cannot regress a deploy that has no key.
- **`0064` ordering confirmed unaffected.** This task builds no guard, arms nothing, and adds no
  precondition to any deploy. `0064` must still land *after* this — its own brief already records that
  (`0064/brief.md:190–192`, the "(ii)" note), on the same hard-sequencing grounds as `0062`/`0063`.
  Nothing in this fix trips that ordering; it is a precondition *for* arming `0064`, not a conflict
  with it.
- **`%q` quoting is the transport contract.** It is what makes a key containing spaces, quotes or `$`
  survive the source-on-the-box step. Copying the neighbours' form is not cosmetic here.

## 4. `0062` as precedent — usable in shape, **not** copyable as a diff

**Copy:** the verification split (local now / Deferred Live Tail at deploy), the name-and-emptiness-only
secret discipline, the report-only-to-`0064` handling, and the one-line-forwarding minimalism.

**Do not copy:**
- **Different construct.** `0062` added a line to a heredoc that `deploy.sh` writes *directly* into the
  remote env file. Here the deploy script stages `printf %q` **export** lines that are sourced and
  deleted, and a *second* script (`setup-profile.sh`) writes the env file. Two scripts, different
  quoting rules, different failure surface.
- **`0062` had no template half.** It did not touch `example.env`. Edit 2 has no `0062` analogue.
- **`0062`'s second half does not transfer.** It added an application-side `warn` because the miss was
  logged at invisible `debug`. Here the warn already exists at `warn` level, and the brief (and the wiki
  class page) both say leave it — see §7.

**The precedent that actually matters is `0062`'s *outcome*, not its diff.** Per
`ai-agents/wiki-vault/wiki/decisions/config-parity-failure-class.md`: `0062`'s one-line fix **shipped**
in release `362a2f9` and production behaviour is still byte-for-byte the unfixed pipeline, because the
owner deliberately left the value blank. Reading the deploy diff shows a fix; reading production shows
the bug. This task is walking into the identical situation (§6), and must say so up front rather than
discover it at close.

## 5. Verification — what is provable now, and what is genuinely deferred

### Provable now, locally (pre-merge)

| # | Check | How |
|---|---|---|
| N1 | Script still parses | `bash -n build-deploy-profile.sh` |
| N2 | Exactly one `YANDEX_PAYMENTS_SECRET` line, inside the export block, using `%q` and the `${VAR:-}` default | `grep -c 'printf "export YANDEX_PAYMENTS_SECRET=%q'` = 1, plus eyeball of neighbours |
| N3 | The script still never prints the staged block | the only references to `LOCAL_TMPENV` are `mktemp` / `chmod 600` / the `>` redirect / the SCP / the trap `rm`; no `cat`, no `set -x`, no `xtrace` anywhere in the file — **verified today, re-verify after the edit** |
| N4 | Template documents it, in the secrets list, with the blank-is-supported note | read `example.env.profile` |
| N5 | **Fail-closed still works — provable now, no deploy needed** | `tests/profile-server/PaymentsRoutes.test.ts` already asserts all three routes return `503 {"error":"payments_unavailable"}` both when no payments config is wired and when the secret is empty (`:79–99`). Keep green. |
| N6 | Whole suite + lint clean | `npm test`, `npm run lint` |
| N7 | *(optional — NEEDS-DECISION 1)* end-to-end transport proof | extend `tests/scripts/profile-deploy-hardening.test.sh` |

**N5 is the one brief step that moves out of the deferred column.** The brief lists "fail-closed still
works" as verification step 6 alongside the on-box checks; it is already covered by existing unit tests
and needs no box.

### Deferred Live Tail — this is the honest shape, and it is *not* satisfied by this task

The brief's verification steps 3–5 need a real profile deploy. That deploy is pending for other reasons
(`0062`, `0063`, `0066` all sit on awaiting-deploy markers). **They also need `0014`** — see §6.

| # | Check | Gate |
|---|---|---|
| D1 | On-box `profile.env` carries `YANDEX_PAYMENTS_SECRET` **non-empty** — check by **length only**, never `cat`, never content | needs a deploy **and** a configured key (`0014`) |
| D2 | Profile server startup log **no longer emits** *"YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)"* — the cleanest real-box signal; names no value | needs a deploy **and** `0014` |
| D3 | `POST /v1/payments/yandex/intent` no longer answers `503 {"error":"payments_unavailable"}` | **owner-gated.** Prefer the local Docker profile stack. Do **not** drive this on the production box with a throwaway value — `/intent` creates DB rows without a signature check. Full signed end-to-end is `0065`'s job, not this task's. |
| D4 | No value in deploy output, container log, or any artifact | verifiable at the deploy itself, independent of `0014` |

**None of D1–D3 may be presented as satisfied by this task.** They are recorded as unchecked boxes in
the worklog, in the `0063` Deferred-Live-Tail shape, and discharged later.

## 6. ⚠️ The finding that changes what "done" means here

`.env.profile.secret` (local, checked **by variable name only**) contains `POSTGRES_PASSWORD`,
`PROFILE_ID_PEPPER`, `PROFILE_BACKUP_S3_ACCESS_KEY`, `PROFILE_BACKUP_S3_SECRET_KEY` — and **no
`YANDEX_PAYMENTS_SECRET`.** `.env.profile` does not carry it either. This is expected: `0014` has not
issued the key.

**Consequences, stated plainly:**

1. A profile deploy carried out **today**, with this fix applied, lands the variable **empty** on the
   box. `/v1/payments/*` keeps returning 503 — correctly. D1, D2 and D3 are **unsatisfiable until
   `0014` lands.** Only D4 and "nothing regressed" can be discharged at the next deploy.
2. **This is `0062`'s exact trap, arriving on schedule.** Shipped fix ≠ working configuration. The plan
   names it now so the close cannot quietly claim otherwise.
3. **The brief's "Blocks `0065`" line needs correcting in effect:** shipping `0195` does not by itself
   lift `0065`'s 503. `0065` is blocked on `0195` **and** `0014`. This is a reporting point for the
   producer, not an edit I make to any brief.

## 7. Brief step 3 (log loudness) — I agree with the brief's recommendation: **change nothing**

Leave the `warn` level alone; let `0064` be the mechanism. Recorded reasoning, plus one piece of new
evidence the brief does not have:

> **New failure mode found while planning.** Unlike `PROFILE_INTERNAL_TOKEN` — which
> `setup-profile.sh` persists to `$PROFILE_DIR/.internal_token` and reuses across deploys — this
> variable has **no on-box persistence**. After `0014` lands, a deploy run from a machine that lacks
> the key in `.env.profile.secret` will **silently overwrite a working value with an empty one**, and
> payments will revert to 503 with only a single startup `warn` to say so. That is a stronger argument
> for `0064`'s non-empty assertion, not for touching the log level, and it is not fixable by logging.

Adding on-box persistence for a payments secret was considered and **rejected here**: it changes deploy
semantics on a money path, is outside the brief's stated scope ("No application code", "do not change
the fail-closed semantics"), and is a decision for the owner rather than a side effect of a
forwarding fix. **Reported as input to `0064`; not built.**

## 8. Report-only outputs (no edits made from this task)

- **`0064` already has the fact it needs.** `0064/brief.md:192–197` already records that
  `YANDEX_PAYMENTS_SECRET` must go on the Phase 1 step 4 allowlist **as explicitly optional, with the
  reason recorded, until `0014` issues the key**, then flipped to required. Step 4 of this brief is
  therefore a **verification-and-report**, not an edit. Confirmed present; nothing to add.
- **Full sweep for other omissions — result: none.** `src/profile-server/` reads exactly seven
  environment variables: `DATABASE_URL`, `PROFILE_PORT`, `PROFILE_INTERNAL_TOKEN`,
  `YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`,
  `TELEGRAM_PROXY_URL` (no bracket-form `process.env[...]` access anywhere). All seven are written into
  `profile.env`; all except `YANDEX_PAYMENTS_SECRET` are in the staged-export block. **After this fix
  the profile app surface is complete.** Useful input to `0064`.
- **Out-of-scope observation, no action:** the local `.env.profile.secret` still carries
  `PROFILE_ID_PEPPER`, from the abandoned/reverted profile-hash approach. Local file only, nothing in
  the repo, not a forwarding gap. Noted for the owner's own hygiene, not touched.

## 9. Tests — what is appropriate, said plainly

- **The repo's "all `src/core/` changes MUST be tested" rule does not apply.** This change touches one
  shell script and one example env file. No TypeScript changes at all.
- **Jest cannot cover it.** `jest.config.ts:47` matches `/tests/.*\.(test|spec)?\.(ts|tsx)$` — TypeScript
  only. A shell transport path is out of reach of `npm test` by construction. Inventing a TS test here
  would be theatre.
- **The behaviour it would protect is already covered where it can be.** `PaymentsRoutes.test.ts`
  pins the fail-closed 503 (N5). That is the application half.
- **The one real option is the existing shell harness.** `tests/scripts/profile-deploy-hardening.test.sh`
  runs the **real** `build-deploy-profile.sh` end-to-end under a stub `PATH`. It is the only place a
  transport regression can be caught locally. Note honestly: it is **not run by `npm test`, has no npm
  script, and there is no CI at all** (no `.github/workflows`) — it is a manual
  `bash tests/scripts/profile-deploy-hardening.test.sh`. So an assertion added there raises the ceiling
  on what *can* be checked; it does not create an automatic gate.

## 10. Edge cases and failure modes considered

- **Forwarded-but-empty** — the defining trap of this class, and the live state here until `0014`. §6.
- **Silent wipe on a later deploy from an unconfigured machine** — no on-box persistence. §7.
- **Value with spaces/quotes/`$`** — handled by `%q`, which is why the neighbours' form is copied
  verbatim rather than hand-quoted. N7 is what would actually prove it.
- **Empty-value emission** — `printf %q ""` emits `''`; sourced, sets empty; identical to the other
  optional vars' behaviour today. No syntax hazard.
- **Secret leakage** — staged file is 0600, `rm`'d on the box *before* `setup-profile.sh` runs, and
  removed locally by the exit trap; the script never echoes the block (N3). Any test fixture value must
  be **visibly synthetic**, in the harness's existing `SECRET_PW` style.
- **Harness perturbation** (if N7 is approved) — capturing the staged file in the `scp` stub adds a file
  under `$WORK`; T1's leak assertion greps `"$WORK"/*.argv` only, so it will not false-positive. To be
  re-confirmed at build time by running the whole harness, not just the new case.

## NEEDS-DECISION — for the driver to relay

**1. Add the shell-harness regression assertion (a third edit, beyond the brief's "two")?**
This is the only local proof that the variable actually reaches the staged env with quoting intact —
i.e. the only check that is not "reading the diff", which is precisely how this class hides three times
running.

- **Option A — no test.** Ship the two edits. Cheapest, matches the brief's literal scope. Leaves the
  transport unprotected against a future edit dropping the line again.
- **Option B — end-to-end capture *(recommended)*.** Add ~8 lines: make the harness's `scp` stub copy
  the staged file to `$WORK/staged.env`, run the real script via the existing
  `run_deploy YANDEX_PAYMENTS_SECRET=<synthetic value with spaces and quotes>`, then assert the captured
  file contains exactly one `export YANDEX_PAYMENTS_SECRET=` line **and** that sourcing it round-trips
  the specials intact. Proves transport, quoting, and non-omission in one case. Small risk: touches a
  fixture shared by T1–T9, so the whole harness must be re-run.
- **Option C — structural grep only.** Add an assertion to the harness's existing *"Structural parity
  checks"* block that `build-deploy-profile.sh` contains exactly one such `printf` line. Zero risk, no
  stub change — but it is a diff-reading check, which §4's precedent says is exactly what fails to
  catch this class.

**Recommendation: B.** Third instance of the class, first on a money path, and the harness already
exists for precisely this kind of proof — this is what it is for.

**2. Confirm the Deferred-Live-Tail framing before build, so the close cannot drift.**
Per §6, a deploy today lands the variable empty and 503 persists correctly; D1–D3 need `0014`.

- **Option A *(recommended)*.** Accept that this task ships as **built + Deferred Live Tail**, with
  D1–D3 explicitly gated on `0014` *and* the pending profile deploy, recorded as unchecked boxes.
- **Option B.** Deploy with a throwaway value to prove the plumbing sooner. **I recommend against
  this:** it converts a safe fail-closed 503 into publicly-reachable payments routes armed with a wrong
  key, and `/intent` writes DB rows with no signature check — junk intents in the production profile
  DB, for a proof the local stack can give instead.

---

**changeSurface** (planned, nothing written): `build-deploy-profile.sh` (+1 `printf` line, +4 comment
lines, in the staged-export block); `example.env.profile` (+4 commented lines in the bottom secrets
list); optionally `tests/scripts/profile-deploy-hardening.test.sh` (pending decision 1).

**evidence**: brief mechanism confirmed at `build-deploy-profile.sh:488–522` (omission) and `:525–535`
(source-then-`rm` transport); `setup-profile.sh:392` writes `YANDEX_PAYMENTS_SECRET=${YANDEX_PAYMENTS_SECRET:-}`
and `:25–26` already documents it; `example.env.profile:86–98` secrets list has no entry;
`src/profile-server/Server.ts:35–39` warn, `Routes.ts:385–396` the 503 middleware;
`tests/profile-server/PaymentsRoutes.test.ts:79–99` already covers fail-closed;
`tests/scripts/profile-deploy-hardening.test.sh` runs the real deploy script under stubs; no
`.github/workflows`; `jest.config.ts:47` is TS-only; local `.env.profile.secret` lacks the variable
(checked by name only); `0064/brief.md:190–197` already carries the allowlist note.

---

# OWNER RULINGS — 2026-09-01, binding amendments to this plan

The owner approved this plan via `AskUserQuestion` in the fkit-lead session on 2026-09-01, and in the
same exchange settled both NEEDS-DECISION items above. **These are owner rulings, not the coder's
recommendations restated — they bind the build.**

## R1 — Plan APPROVED as written.

The two required edits proceed. The plan's re-verification of the brief's mechanism, its §6 finding,
and its §7 refusal to touch the fail-closed semantics all stand as approved.

## R2 — NEEDS-DECISION 1: **Option B, the end-to-end capture test.** RULED.

Add the regression assertion to `tests/scripts/profile-deploy-hardening.test.sh`, in the shape §5/N7
and the option-B text describe: the `scp` stub captures the staged file, the real
`build-deploy-profile.sh` runs with a **visibly synthetic** value containing spaces and quotes, and the
test asserts (a) exactly one `export YANDEX_PAYMENTS_SECRET=` line in the captured file and (b) that
sourcing it round-trips the specials intact.

**This makes the edit surface THREE files, not the brief's two.** That is a deliberate, owner-ruled
extension of the brief's literal scope, on the coder's stated grounds: it is the **only local proof
that is not diff-reading**, and diff-reading is precisely how this failure class hid three times
running.

**Binding conditions:**

1. **The fixture value must be visibly synthetic**, in the harness's existing `SECRET_PW` style. No
   real key, no realistic-looking key, and the value never leaves the test file.
2. **The whole harness must be re-run**, not just the new case — the plan flags that this touches a
   fixture shared by T1–T9, and T1's leak assertion is the one to watch.
3. **Do not overstate what this buys.** The plan is explicit and correct that the harness is **manual**:
   no npm script, and this repo has **no CI at all**. The test raises the ceiling on what *can* be
   checked locally; it **creates no automatic gate**. The worklog and close must say so.

## R3 — NEEDS-DECISION 2: **Option A, built + Deferred Live Tail.** RULED.

`0195` ships as **built, with an explicit Deferred Live Tail**. D1, D2 and D3 stay **unchecked boxes**,
gated on **both** `0014` (the key does not exist yet) **and** the pending profile deploy. D4 and
"nothing regressed" are the only on-box items dischargeable at the next deploy.

**Option B — deploying with a throwaway value — was put to the owner and DECLINED**, on the coder's
stated grounds: it converts a safe fail-closed 503 into publicly-reachable payments routes armed with a
wrong key, and `/intent` writes DB rows with no signature check, producing junk intents in the
production profile DB for a proof the local Docker stack can give instead.

**Consequences the close must carry, not soften:**

- **Shipping `0195` does NOT lift `0065`'s 503.** The brief's "Blocks `0065`" phrasing — *"…return 503
  on the real box until this ships"* — is **inaccurate in effect**, and §6.3 is the correction. `0065`
  is blocked on `0195` **and** `0014`. The board row already states three conditions; this is a
  **reporting point for the producer**, and no brief is edited from the build.
- **A deploy today lands the variable empty and 503 persists — correctly.** This is `0062`'s trap
  arriving on schedule, and the close must not present a shipped diff as a fixed production.

## R4 — The §7 no-persistence finding is REPORTED, not built.

The coder's new finding — that unlike `PROFILE_INTERNAL_TOKEN`, this variable has **no on-box
persistence**, so a later deploy from an unconfigured machine will **silently overwrite a working value
with an empty one** — stands as **input to `0064`**. Adding persistence for a payments secret is
**out of scope here** and is the owner's call, not a side effect of a forwarding fix. Do not build it.
