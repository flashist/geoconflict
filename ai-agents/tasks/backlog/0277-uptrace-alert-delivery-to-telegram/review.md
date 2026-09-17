# Review — 0277

Task: `ai-agents/tasks/backlog/0277-uptrace-alert-delivery-to-telegram/brief.md`
File(s) under review: `src/profile-server/AlertRelay.ts` · `src/profile-server/Routes.ts` (3 regions) ·
`src/profile-server/Server.ts` · `src/profile-server/InternalAuth.ts` · `src/profile-server/Telemetry.ts` ·
`src/core/notifications/TelegramNotifier.ts` · `src/server/Master.ts` (3 regions) · `setup-profile.sh` ·
`build-deploy-profile.sh` · `example.env.profile` · `tests/profile-server/AlertRoutes.test.ts` ·
`tests/server/MasterFeedbackRoutes.test.ts` · `tests/scripts/profile-deploy-hardening.test.sh` ·
`ai-agents/knowledge-base/alert-delivery-runbook.md`
Status: closed-out

**Verdict (Round 3, final): ✅ Ready to merge (validation-gated).** All twelve findings across three
rounds are verified fixed — nothing open. The remaining risk is **validation, not code**: the relay has
never received a real webhook call, so the owner's drill (plan §8) is the gate that stays.

**Verdict (Round 2, superseded): ⚠️ Changes requested — 2 low findings, neither behavioural, neither
blocking. All ten Round 1 findings verified fixed.**

**Verdict (Round 1, superseded): ⚠️ Changes requested — 10 findings (4 medium, 6 low), none blocking.**

Reviewers run, **both rounds**: reviewer's own pass **and** Codex adversarial pass
(`codex-cli 0.152.0`, read-only). Both completed in both rounds — coverage is **not** partial.
Round 2's Codex pass was scoped to the delta and is included because R5 replaced a standing gate.

`plan.md` verified byte-identical at blob `a0815d5d5ee6ffd19c452e77ff4a84123351e9e9` at the start of
**both** rounds. Not moved.

## Reviewer findings

| #   | Round | Sev    | file:line | Claim |
|-----|-------|--------|-----------|-------|
| R1  | 1     | medium | `src/profile-server/InternalAuth.ts:23-26` (surfacing at `src/profile-server/AlertRelay.ts:339`→`:370-377`) | `tokensMatch` length-guards on JS **string** length then compares **UTF-8 byte** buffers, so a wrong secret of equal string length containing any non-ASCII character throws `RangeError` → the handler answers **500, not the contracted 200**, and `raiseAlarm` never fires. The one input class the out-of-band alarm exists for becomes silent. |
| R2  | 1     | medium | `src/profile-server/AlertRelay.ts:352-360`; `tests/profile-server/AlertRoutes.test.ts:171-199` | The wire→view field mapping in `decide()` has **no test**. Four independent mutations of it all pass 27/27: reading `alert.state` instead of `alert.status`; dropping `alert.name` from the title; swapping `payload.value`↔`payload.threshold`; dropping `since` entirely. The accept test asserts only `alerts.length===1` and `threadId`, never the rendered text. |
| R3  | 1     | low    | `src/profile-server/AlertRelay.ts:348-351` vs the stated principle at `:197-201` | The dedupe entry is written **before** delivery is attempted and is never removed on failure. A failed Telegram send plus a retried webhook (our 202 lost in transit) yields a **lost** alert with the retry suppressed — the opposite of the module's own "a duplicate alert beats a lost one". Goes beyond worklog residual 4, which covers only the process-restart case. |
| R4  | 1     | low    | `setup-profile.sh:1700` | The new empty-allowlist warning tests the **raw variable** (`[ -z ... ]`), but nginx renders a bare `deny all` whenever the loop at `:1284-1289` yields **zero allow directives** — a strictly wider set. A whitespace-only or comma-only value produces 403-for-everyone (⇒ channel permanently disabled) with **no warning at all**. Verified behaviourally. |
| R5  | 1     | medium | `tests/scripts/profile-deploy-hardening.test.sh:1262-1265` | The assertion gating R4's warning is a **file-wide string grep**, not a behavioural test. It stays green when the guard's condition is inverted (`-z`→`-n`, so the warning can never fire) and when the `echo` is demoted to a comment carrying the same words. Both verified by mutation. This is the "a guard that cannot fail for the reason you built it" shape the plan's own A5 names — here inside the standing gate for these scripts. |
| R6  | 1     | low    | `src/profile-server/Routes.ts:540`, `:394-400` | `express.json()` also answers **413** (>100kb) and **415** (unsupported charset / Content-Encoding) before the handler runs, not only the recorded 400. None is in the disable set, so the channel is safe — but the recorded residual's wording should widen from "400" to "400/413/415". Documentation change, not code. |
| R7  | 1     | medium | `src/server/Master.ts:352-354`; `src/core/notifications/TelegramNotifier.ts:223`; `tests/core/TelegramNotifier.test.ts:234` | The **retracted** bot-token claim is still asserted as fact at three sites, one of them as *historical* fact: "this line used to write the live token into a log that ships off-box". The retraction is **correct** (independently verified). A later reader takes these as established and re-opens a token-rotation question that was correctly closed. 🚨 Wording only — see the regression warning below. |
| R8  | 1     | low    | `setup-profile.sh` (no `report_config_values` row added) | 0277 added no config-value-parity row for `PROFILE_ALERT_WEBHOOK_TOKEN`, unlike the 0271/0274 precedent at `:859-868` / `:895-921`. Its empty state is reported only by the helper's generic "feature stays off" line — which here means *alerts are dropped*. Reporting-consistency gap; the runtime alarm covers the operational case. |
| R9  | 1     | low    | `example.env.profile:29-33` | The `PROFILE_INTERNAL_ALLOW_IPS` comment still describes the variable as game-server addresses only and names only game prod/dev. The runbook is correct; the template the operator actually edits is stale on the exact variable whose misconfiguration permanently kills alerting. One-line comment fix. **Not** a re-raise of R14 — the risk itself stays accepted. |
| R10 | 1     | low    | `src/profile-server/AlertRelay.ts:397-398` vs `src/profile-server/Shutdown.ts:104-118` | The floating `deliver` promise is not drained by graceful shutdown. A SIGTERM inside the ≤20 s window after a 202 drops an already-acknowledged alert. Frontier-move: fixing it means tracking in-flight deliveries; deploys are rare and manual. Recommend recording as a residual rather than fixing. |

### Round 2 — new findings

| #   | Round | Sev | file:line | Claim |
|-----|-------|-----|-----------|-------|
| R11 | 2     | low | `setup-profile.sh:1723` (render at `:1302`, inside the `PROFILE_DOMAIN` branch `:1184-1368`) | **Introduced by R4's own fix.** `ALLOW_DIRECTIVES` is rendered only inside the HTTPS/nginx branch, but the warning runs unconditionally — so `PROFILE_DOMAIN` unset **plus a perfectly valid allowlist** prints the "deny all / 403 disables alerts" warning spuriously, and its text is factually wrong there (no nginx is configured at all). R5's probe cannot catch it: it extracts the render loop and the warning, not the enclosing branch (`profile-deploy-hardening.test.sh:1306-1314`). Raised by Codex; confirmed by reading the nesting. |
| R12 | 2     | low | `ai-agents/knowledge-base/alert-delivery-runbook.md` | **The reported "prettier clean" gate does not hold, in both halves.** (a) The repo-wide figure is **828**, not 64, under both `prettier --check .` and the canonical `prettier --ignore-unknown --check .` — the exact scope of `npm run format`, and there is **no `.prettierignore`**. (b) The runbook — **a file this task created** — is **not** prettier-clean. All 14 code/script files on the 0277 surface *are* clean. |

**On R11's direction:** it over-warns, never under-warns, so R4's fix is still a clear net win — it
traded a silent false-negative on the channel-disable path for a noisy false-positive on a config the
live box does not use. Worth correcting so the warning stays trustworthy, per Codex's point, but it is
not a reason to revisit R4.

**On R12's proportion:** prettier is **not a gate here** — `npm test` does not run it and the husky
pre-commit hook is documented inert (CLAUDE.md, task `0223`). 828 unformatted files is the repo's
normal state, not a regression this task caused. The finding is narrow: a claimed-clean gate that is
not clean **for a file this task authored**. One `prettier --write` on that one file closes it.

### 🚨 Regression warning — read before acting on R7

R7 is a **wording** defect. The `boundedCauseCode` guard (`TelegramNotifier.ts:100-116`) and the
choice to log `outcome.code` rather than `formatError(err)` are **correct and must stay**. The
retraction says the leak was never live; it does **not** say the guard is unnecessary. Removing the
guard or widening the log back to `formatError` would be a genuine regression — and would reintroduce
exposure to `undici/lib/web/fetch/request.js:136`, which *does* interpolate the whole input URL into a
`TypeError` message (unreachable today only because the host prefix is fixed; verified against 30
hostile token values, none of which made the URL unparseable). Change the sentences, not the code.

## Coder response

<!-- CODER-OWNED — the reviewer never writes this section. -->

Round 1 dispositioned under the sprint-ship-loop standing approval; R3/R6/R8/R10 carry explicit owner
rulings relayed 2026-09-17. Every claim was verified against the code before acting — R1 by direct
reproduction, R2/R4/R5 by executing the reviewer's own mutations, R7's new `request.js:136` evidence by
reading the installed undici.

| #   | Verdict | Defect / Frontier | Action | Status |
|-----|---------|-------------------|--------|--------|
| R1  | CORRECT | Defect | `tokensMatch` length-guards on **UTF-8 byte** length, not JS string length (`InternalAuth.ts:14-30`). Reproduced the `RangeError` standalone first; fixes the relay's 500-instead-of-200 **and** `internalAuth`'s 500-instead-of-401. 4 new tests | ✅ done |
| R2  | CORRECT | Defect (evidence) | 6 tests for the wire→view mapping via the real route (`AlertRoutes.test.ts`), asserting the delivered text. Re-ran the reviewer's 4 mutations: all now caught (1/1/2/2 failures) where all 4 previously passed 27/27 | ✅ done |
| R3  | CORRECT | Defect | `DedupeCache.forget(id)`; `deliver()` un-marks the id when the send reports failure **or throws**, so a suppressed retry can no longer lose an alert. 3 tests, incl. "a SUCCESSFUL delivery still suppresses" — the one a careless fix breaks. **Owner ruled FIX** | ✅ done |
| R4  | CORRECT | Defect | Warning now guards `ALLOW_DIRECTIVES` (the rendered output), not the raw variable (`setup-profile.sh`). A whitespace- or comma-only value now warns | ✅ done |
| R5  | CORRECT | Defect (fake gate) | Replaced the file-wide grep with a **behavioural probe**: extracts the render loop + warning block from the script and runs them over 6 values. Fixed **before** R4 and confirmed red on R4's hole first (3 failures), then green. Catches both mutations that defeated the grep (inverted guard → 6; echo→comment → 4) | ✅ done |
| R6  | CORRECT | Defect (doc) | Worklog residual widened from "400" to **400/413/415**; none is in the disable set. **Owner ruled WIDEN**. Documentation only | ✅ done |
| R7  | CORRECT | Defect (doc) | 3 sites swept (`Master.ts`, `TelegramNotifier.ts:223` + its header, `TelegramNotifier.test.ts`). 🚨 **The guard and `outcome.code` logging were NOT touched** — and the reviewer's `request.js:136` finding (verified: `'Failed to parse URL from ' + input`) is folded in, **upgrading** the rationale from "hypothetical future undici" to "a real construction in the installed version, unreachable today only because the host prefix is fixed" | ✅ done |
| R8  | CORRECT | Defect (reporting gap) | `report_config_values` row for `PROFILE_ALERT_WEBHOOK_TOKEN` (empty ⇒ FINDING) plus OPTIONAL rows for the two topics (blank ⇒ General). Added to `clean_config()` per the 0271/0274 precedent, and **behaviourally gated** — the function is run, so it cannot pass on a comment. **Owner ruled ADD** | ✅ done |
| R9  | CORRECT | Defect (doc) | `example.env.profile` no longer describes the allowlist as game-server-only: it names the monitoring box, the 403⇒permanent-disable consequence, the whitespace/comma-only case, and that re-enabling the channel is a separate step. No addresses added | ✅ done |
| R10 | CORRECT | **Frontier** | No code change. **Owner ruled ACCEPT** — recorded below as a residual and in the worklog | won't fix (frontier) |
| R11 | CORRECT | Defect (**introduced by R4's own fix**) | `ALLOW_DIRECTIVES` renders only inside the `PROFILE_DOMAIN` branch (`:1302`, block `:1184-1368`) while the warning at `:1723` ran unconditionally ⇒ a spurious, factually-wrong warning when nginx is skipped. Condition now `[ -n "$PROFILE_DOMAIN" ] && [ -z "$ALLOW_DIRECTIVES" ]`. R5's probe extended to model the enclosing branch and **verified to catch R11** (revert ⇒ 2 failures) **without losing R4** (3) or the comment-demotion (4) | ✅ done |
| R12 | CORRECT | Defect (my gate record) | Ran `prettier --write` on `alert-delivery-runbook.md`. ⚠️ Re-running at the **canonical repo-wide scope** found the **worklog failing too** — same class, not flagged — so that is fixed as well. Worklog's gate record corrected: the canonical scope is repo-wide (**826** files, the repo's normal state, prettier not being a gate here), my "64" was a src+tests-only count, and my narrower scope is precisely why it excluded the files this task added | ✅ done |

**R11 — the honest limit of its test, stated rather than papered over.** The probe now reproduces the
enclosing `PROFILE_DOMAIN` branch, which is enough to catch this defect. But it **models** that branch
rather than reading it: moving the render loop out of the branch would still slip past. That is a
smaller blind spot than the one R11 exposed, not the absence of one.

⚠️ **`review.md` itself fails `prettier --check`.** Deliberately **not** fixed: `--write` would reformat
the reviewer's own rows, which the coder must never touch. Flagged for whoever owns this file.

**Regression check (R7, per the reviewer's warning):** `boundedCauseCode` (`TelegramNotifier.ts:100-116`)
and `log.error(... outcome.code)` are **unchanged**. Only prose moved. The `never returns the token`
tests are unchanged and still pass.

**No finding was disproven this round**, and none re-litigated a settled decision — the one Codex
finding that did (the `/internal/` 403 trap) was already suppressed by the reviewer against owner
ruling B, and I did not re-open it.

## Re-litigates settled decisions (suppressed)

- **The `/internal/` nginx allowlist answers 403 on a source-IP miss, disabling the channel
  permanently** — raised by Codex at `critical`. **Suppressed.** This is owner ruling B (2026-09-17),
  plan `AMENDMENT 1` **A4/R14** and **A5**, and the worklog's "Flagged, not acted on". Accepted with
  documentation; the runbook carries it at `alert-delivery-runbook.md:40-50`, and the real guard is a
  named follow-up (`0284`). **Re-raise only if** the owner withdraws ruling B, or the follow-up probe
  lands and still leaves the gap. R4/R9 above are *not* this finding — they are defects in 0277's own
  guard and template text, not the accepted risk.

## Disproven — do not chase

- **"HEAD/GET on the webhook path returns 404 and can disable the channel"** (Codex, medium).
  **INCORRECT as stated.** Confirmed empirically: `HEAD`→404, `GET`→404, `OPTIONS`→200 (`allow: POST`).
  But the disable happens inside Uptrace when **its own** notification attempt receives 401/403/404;
  a third party's HEAD never reaches that code path. ℹ️ Carry-forward for `0284`: the synthetic probe
  must use **POST**, or it will get a harmless-but-confusing 404.
- **"The 500-entry dedupe cap lets a duplicate escape inside the 26 h retry budget"** (Codex, medium).
  Arithmetic correct, impact benign: a duplicate is the module's explicitly preferred direction, and
  501 distinct alert events in 26 h from six monitors implies a flap where duplicates are the least
  of the problem. Not a defect.

## Verification of the coder's claims (as asked)

| Claim | Result |
|---|---|
| M7 (401 on bad secret) caught | ✅ 7 tests fail |
| M11 (numeric `id` schema) caught | ✅ 9 tests fail |
| M12 (secret read top-level) caught | ✅ 6 tests fail |
| M18 (case-sensitive routing off) caught | ✅ 20 tests fail across 2 suites |
| M9 (await before respond) caught | ✅ — as a **timeout**, not an assertion failure, exactly as warned |
| Fail-open inversion `if (provided && !match)` caught | ✅ 4 tests fail (reviewer-devised) |
| `alert.state` vs `alert.status`; title/value/threshold/since mapping | ❌ **not caught** → R2 |
| `Master.ts` characterization tests non-vacuous | ✅ 4 reviewer-devised behaviour mutations all caught (subscribe 500 on `network_error`; subscribe 500 on `http_error`; collapsing the two log lines; feedback starting to fail the request) |
| "written against the OLD code first" | ⚠️ **unverifiable** — the task folder is untracked, so there is no history to confirm ordering. The *property* the ordering was meant to deliver is independently demonstrated by the four mutations above. |
| `/api/subscribe` still 500s, does not silently succeed | ✅ verified by reading **and** by mutation |
| Two log lines survive and stay distinct | ✅ `responded with <status>` vs `delivery failed: <code>`; collapsing them fails a test |
| `setup-profile.sh`: 3 × `persist_or_reuse_secret`, none in `generate` | ✅ helper default is **not** generate (`:692`, `:723-724`); all three omit the third argument (`:751-753`) |
| Three keys in the `profile.env` heredoc | ✅ `:784-786`; 0277's own lines unaffected by the unquoted delimiter |
| Empty-allowlist warning added to the existing echo | ⚠️ present and prominent, but holed → R4, and fake-gated → R5 |
| No nginx change | ✅ the only nginx edit in the diff is attributed to `0276` |
| Retraction correct | ✅ verified independently against undici 8.0.2 / Node 24 — every fetch failure is `TypeError: fetch failed` with internal frames only; `.cause` carries host at most, never the path; both `formatError` implementations are `error.stack ?? error.message` and never read `.cause` |
| Corrections landed visibly; no assertion weakened | ✅ worklog, test comment, `describe` name, Required statements §7, M5/M19 labels all correct; **no assertion weakened or deleted** (two were strengthened). ❌ but three source/test sites were not swept → R7 |

## Gates re-run by the reviewer

| Gate | Coder reported | Reviewer re-ran | Result |
|---|---|---|---|
| `npm test` | 137 suites / 1801 tests | ✅ yes | **137 / 1801, all passed**, 55.2 s, first run green |
| `npx tsc --noEmit` | 0 | ✅ yes | 0 |
| `npm run lint` | 0 | ✅ yes | 0 |
| `npx prettier --check` (0277 surface) | clean | ✅ yes | clean |
| `check:config-parity` | REQUIRED 0 ×3 | ✅ yes | REQUIRED 0 on game, profile, client |
| hardening harness | `ALL PASS` | ✅ yes | `ALL PASS`, 338 ✅ / 0 ❌ |
| `npm run test:integration` | not required | ❌ **not run** | no DB change; correctly out of scope |

**Flake rule:** no `supertest` failure occurred in any reviewer run, so `0197`'s `SIGSEGV` signature
never needed ruling out and **no run was re-run to clear a failure**. The single full `npm test` was
green on the first attempt.

## Accepted residuals (shared, do-not-re-litigate)

<!-- Entries are added only once the owner approves treating a finding as a settled tradeoff. -->

- **The `/internal/` allowlist 403 trap** — What: the relay stays mounted under `/internal/`, inheriting
  an nginx IP allowlist that answers 403 on a source-IP miss, which permanently and silently disables
  the notification channel. Why (structural): owner ruling B, 2026-09-17 — the allowlist's
  defence-in-depth is worth more than the trap, and the architect refused to invent a mechanical guard
  because every candidate (`profile-checks.sh`, `0283`'s digest) would compare a value with itself or
  never traverse the route. Documented in `alert-delivery-runbook.md`. Re-raise only if: the owner
  withdraws ruling B, or `0284`'s synthetic probe lands and the gap survives it.
- **In-flight deliveries are not drained on shutdown (R10)** — What: the relay answers 202 and then
  delivers on a floating promise that `Shutdown.ts` does not track, so a `SIGTERM` inside the ≤20 s
  send window drops an already-acknowledged alert. Why (structural): owner ruling, 2026-09-17 —
  draining it means tracking every in-flight delivery through graceful shutdown, which is real
  complexity for a narrow window, and deploys of this box are rare and manual. Responding before
  delivering is itself ADR-114 Decision 4 and is not in question; this is the residue of that choice.
  Re-raise only if: deploys become automated/frequent, or an alert is ever observed lost across a
  restart.
- **Un-marking the dedupe id on failure is best-effort (R3's fix)** — What: the id is released only
  when this process observes the delivery fail; a crash between the 202 and the failure leaves it
  marked. Why (structural): the dedupe map is in-process by design (ADR-114 Decision 5 + plan §1b), so
  any bookkeeping it holds dies with the process; making it survive means external state for a cache
  whose whole point is that it is cheap. ⚠️ **Deliberately recorded separately from the in-process
  dedupe residual above, because the consequences are opposite**: that one loses de-duplication ⇒ a
  **duplicate** (the preferred direction); this one loses the un-marking ⇒ a **suppressed retry** ⇒ a
  **lost alert** (the unsafe direction R3 exists to prevent). Re-raise only if: an alert is ever
  observed lost this way, or the dedupe map gains external storage for another reason.
- **R3's un-marking is best-effort (added Round 2)** — What: `deliver` un-marks the dedupe id when a
  send fails, but a process crash *between* the 202 and the failure leaves the id marked, so a later
  retry is still suppressed. Why (structural): the dedupe map is in-process by design, and nothing that
  lives in it survives the process. ⚠️ **Reviewer's judgment, as asked — it is the same *limit* as the
  existing in-process residual but NOT the same *consequence*, and the ledger should say so:** the
  original residual loses de-duplication and therefore yields a **duplicate** (the safe direction this
  module explicitly prefers); this one loses the un-marking and therefore yields a **suppressed retry**,
  i.e. a lost alert (the unsafe direction). Recorded as its own entry for that reason, not folded in.
  Accepted because the alternative — durable dedupe state — is a database or a file for a bounded
  in-memory cache, which is disproportionate. Re-raise only if: dedupe state is ever made durable for
  another reason, or a lost alert is traced to this path.
- **A duplicate arriving during the in-flight send window (added Round 2)** — What: between the dedupe
  mark and the Telegram outcome (≤ ~20 s), a second webhook with the same id is dropped as `deduped`;
  if the first delivery then fails, both are lost. Why (structural): unreachable through normal sender
  timing — retries start at a 60 s minimum backoff, four times the worst-case send window, and only
  follow a non-2xx, which this path does not produce. Independently confirmed by the Codex pass.
  Re-raise only if: the sender's minimum backoff drops below the send timeout, or the send timeout
  is raised above it.
- **The "characterization tests written against the OLD code first" ordering is unverifiable** — What:
  the claim rests on the coder's word. Why (structural): the task folder is untracked, so no history
  exists to confirm the order. ⚠️ **Kept loud deliberately.** The *property* the ordering was meant to
  deliver **is** independently demonstrated — four reviewer-devised behaviour mutations of the migrated
  paths are all caught (see the verification table). Re-raise only if: someone cites the ordering itself
  as evidence for something the mutations do not already establish.

## Round 3 — closeout verification

**R11 — fixed and genuinely gated.** `setup-profile.sh:1728` now reads
`[ -n "${PROFILE_DOMAIN:-}" ] && [ -z "${ALLOW_DIRECTIVES:-}" ]`. Verified **by execution**, and the
failure counts reproduce the coder's report exactly: reverting R11 → **2** failures (the first probe was
blind to this), reverting R4 → **3**, echo demoted to comment → **4**. Harness `ALL PASS` at baseline.

**R12 — fixed, and the figure now reproduces and is fully accounted for.** The runbook **and** the
worklog are both clean. Canonical repo-wide count (`prettier --ignore-unknown --check .`, the exact
scope of `npm run format`; no `.prettierignore` exists): **826**. Excluding `review.md`: **825**.
🔎 **So both numbers are right and the difference is exactly one file — this ledger, which the coder
correctly refused to `--write`.** The "reported wrongly twice" concern is settled: the number
reproduces, and every file on the task's surface is accounted for. `plan.md` and `brief.md` also still
fail and must stay that way — `plan.md` is frozen at its blob hash.

**`review.md`'s own prettier failure — my call: leave it.** Reformatting would reflow the evidence
tables and mutation counts recorded here, and prettier is not a gate (`npm test` does not run it; the
husky hook is documented inert, `0223`). A tidier ledger is not worth disturbing the evidence.
⛔ **Do not run `prettier --write` on this file.** It is the 826th file, knowingly.

### Judging the R11 blind-spot call

The coder declined to add a structural grep asserting the render loop's position, on the grounds it
would look like coverage without being it — the R5 shape again. **The instinct is right and the
refusal to paper over it is exactly the behaviour this ledger should reward.** Two corrections, in
fairness to it and to whoever reads this next:

1. **"Nothing real is achievable there" is slightly too strong.** A *positional* assertion — that the
   render loop's line falls between the `if [ -n "$PROFILE_DOMAIN" ]` line and its closing `fi` — would
   close the blind spot and would **not** be the R5 shape. R5's fake gate was a file-wide grep *for the
   warning's own words*, which matched its own documentation; a two-anchor positional assertion fails
   when the thing actually moves. The precedent already exists **in this same harness**: the nginx check
   asserts `${ALLOW_DIRECTIVES}` comes *before* `deny all;` by index comparison, not by string presence.
2. **The right reason not to do it is proportionality, not impossibility.** If the render loop moved out
   of the `PROFILE_DOMAIN` branch, the consequence is a **cosmetic false-positive warning** — the same
   class R11 just fixed — not a 403 and not a disabled channel. Cheap to add later if that area is
   touched; not worth a round now.

**Verdict on the stopping point: correct.** Named honestly, at the right size, with the limit written
down rather than hidden. No finding filed — filing one would be re-litigating a stopping point I agree
with.

**Reviewers, Round 3:** reviewer's own pass only. **Codex deliberately skipped**, and the reason is
substantive rather than budgetary: the delta was two small fixes whose correctness I could establish
**by executing mutations against them**, which is stronger evidence than a second model reading them.
Codex ran in full on Rounds 1 and 2, including the surfaces these two fixes touch.

## Convergence call

**Round 3 — CLOSED OUT.** Nothing open. Three rounds, twelve findings, all dispositioned; no finding
was ever re-litigated in either direction, and the one suppressed item stayed pointed at ruling B
throughout.

**Round 2 (superseded) — converged. Disposition R11 and R12, then close.**

Nothing was re-litigated in either direction this round: every Round 1 finding was dispositioned, none
disproven, and the two new findings are genuinely novel — one is a side effect of R4's own fix, the
other is a gate-reporting error. Both are cosmetic/advisory; neither touches behaviour, the status
contract, or response-body purity.

**The fixes hold under attack.** The two I was asked to hit hardest — R1 and R3 (behaviour changes) and
R5 (a replaced standing gate) — were each verified by execution, not reading. R5 in particular is now a
real gate: it extracts the script's own code and runs it, guards explicitly against a vacuous
extraction, and kills not only the two mutations that defeated the old grep but also a straight revert
of the R4 fix it exists to protect. That is the "same defect one layer along" risk closed, not moved.

**Round 1's Round-1 note, preserved:** nothing there re-litigated a settled tradeoff except the single
suppressed allowlist finding, which is pointed at ruling B.

The task's central property **holds**: across two independent passes, a full middleware-chain trace,
and eleven executed mutations, **no input was found that makes the handler emit 401, 403 or 404**.
Response-body purity holds on every path, including the body-parser and limiter paths, because
`profileErrorHandler` emits fixed codes. The schema honours all four verified traps.

The two findings worth the coder's attention first are **R2** and **R5** — both are *evidence*
defects rather than behaviour defects, and both sit exactly where the plan says the risk is
concentrated (**plan** R11 — not finding R11 above: a module verified from a binary that has never seen
live traffic, and tests written by the agent doing the migration). A passing suite that would not notice
a wrong field mapping, and a gate that stays green on an inverted guard, are the two places this task's
safety argument is thinner than it reads.

## Round 2 — verification of the fixes

**Confirmed by EXECUTION** (isolated copy; the working tree stayed frozen and was diffed clean after
every mutation):

| Fix | How verified | Result |
|---|---|---|
| **R2** — 6 mapping tests | Re-ran **my own four** Round 1 mutations, which previously all passed 27/27 | ✅ **all four now caught**: `alert.state` for `alert.status` → 1 failure · title source → **2** · value↔threshold → 2 · `since` dropped → 2. (ℹ️ the coder reported 1 for the title case; I measure 2 — immaterial, the property holds.) Suite 27 → **37** tests |
| **R5** — behavioural probe | Re-ran **both** mutations that defeated the old grep, **plus one of my own** | ✅ inverted guard (`-z`→`-n`) → `SOME FAILED` · echo demoted to comment → `SOME FAILED` · **reverting R4 itself** (guard the raw variable again) → `SOME FAILED`. The old grep stayed green on the first two |
| **R4** — guard on `ALLOW_DIRECTIVES` | Reverting it is caught by R5's probe (above) | ✅ the fix is now gated, not merely present |
| **R8** — parity row teeth | Two mutations | ✅ forcing the row to always report `OK` → `SOME FAILED` · echoing the token **value** into deploy output → `SOME FAILED` (the no-echo canary fires) |
| **Gates** | Re-ran all | ✅ `npm test` **137 suites / 1815 tests** (matches the reported +14) · `tsc` 0 · `lint` 0 · parity **REQUIRED 0 ×3** · hardening harness **ALL PASS** |

**Confirmed by READING** (not executed):

| Fix | Evidence |
|---|---|
| **R1** | `InternalAuth.ts:29-37` now buffers both sides and compares **byte** lengths. Fail-closed preserved (`expectedBytes.length === 0`; an empty string is 0 bytes and any non-empty string ≥1, so the guard is exactly equivalent). `internalAuth`'s header consumers are unaffected — the function's contract for ASCII bearer tokens is unchanged, and the only behaviour that moves is the `RangeError` class, which becomes a `false` (⇒ 401 there, 200 + alarm in the relay) instead of a 500. Codex independently reached the same conclusion on the shared consumers. |
| **R3** | `forget` is called on the failure branch and in the catch, **never on success**; the alarm path returns before both. `forget("")` is a no-op because an unkeyed alert never calls `seen()`, so no empty id is ever inserted. |
| **R7** | All three sites swept; the **guard is untouched** (`boundedCauseCode` intact, callers still log `outcome.code`). The replacement wording is honest — it now says the guard is defence in depth and names `request.js:136` as the reason a formatted error is "safe today, not structurally safe". |
| **R9** | Monitoring box named, consequence spelled out, **no address added**. The harness's own probe fixtures use RFC 5737 documentation addresses, not real ones. |

**Flake rule, Round 2:** no `supertest` failure in any run. `0197`'s `SIGSEGV` signature never needed
ruling out, and **nothing was re-run to clear a failure** — every gate was green on its first attempt.

### Gates I cannot stand behind

- **`prettier --check`.** See **R12**. The reported "64 files, none on the 0277 surface" does not
  reproduce: I measured **828** repo-wide at the time, and the 0277 surface was **not** clean — the
  runbook this task created failed. ✅ **Resolved in Round 3** — see the closeout section: the runbook
  and worklog are now clean, the figure reproduces at **826** (825 excluding this ledger), and every
  remaining file is accounted for.
- **`npm run test:integration`** — **not run**, in any round. Correct per plan §5 (no database
  change), stated so it is never mistaken for a silent pass.

---

# 🚩 Residuals that survive closeout — loudest first

**This task is code-complete and gate-green. It is NOT proven to work.** Everything below is live.

1. 🚨 **THE RELAY HAS NEVER RECEIVED A REAL WEBHOOK CALL.** Every field of the wire format — the
   string `id`, `alert.status`, the absent `log`, the secret nested under `payload` — was derived from
   **disassembly of a vendor binary**, not from observed traffic. The tests pin the schema and now pin
   the field mapping, but they all pin it to the *same assumption*. If that assumption is wrong,
   everything is green and no alert is ever delivered. **The owner's drill (plan §8) is the only thing
   that can close this, and nothing else substitutes for it.**
2. 🚨 **D8 — `alert.status`'s VOCABULARY IS UNVERIFIED. A RESOLVED ALERT MAY RENDER AS STILL FIRING.**
   The architect confirmed *which field* to read, never its full value set. `AlertRelay.ts:141` matches
   `closed`/`resolved`; anything else renders as firing. That is the safe direction — a recovery shown
   as an alert is noise, an alert shown as a recovery is a missed incident — but it means the operator
   may see a "🚨" for something that already cleared. Check this in the drill: fire an alert, let it
   resolve, confirm the ✅ form actually arrives.
3. **The `/internal/` allowlist 403 trap** — owner ruling B, accepted with documentation only. A
   source-IP miss permanently and silently disables the channel. `profile-checks.sh` cannot guard it
   (it would compare a value with itself) and `0283`'s digest never traverses the route, so it would
   keep reporting "the bot works" while every alert was dead. **The real guard is `0284`. Until it
   lands this risk stands at full size.**
4. **Dedupe is in-process: a restart between an attempt and its retry delivers a duplicate.** Safe
   direction — a duplicate beats a loss.
5. **R3's un-marking is best-effort — and this one is the UNSAFE direction.** A crash between the 202
   and the delivery failure leaves the id marked, so the retry is suppressed and the alert is **lost**.
   Same in-process limit as (4), deliberately recorded separately because the consequence is opposite.
6. **In-flight deliveries are not drained on shutdown (R10)** — a `SIGTERM` inside the ≤20 s send window
   drops an already-acknowledged alert. Owner-accepted.
7. **A duplicate arriving during the in-flight send window** — unreachable through normal sender timing
   (60 s minimum backoff vs a ≤20 s window, and only after a non-2xx). Re-raise if either bound moves.
8. **`0061` is fixed in the tree, UNSHIPPED.** The game server deploys later with `0273`; until then the
   running feedback path is still the old one. Do not read "0061 is fixed" off this task.
9. **The "characterization tests written against the OLD code first" ordering rests on the coder's
   word** — the task folder is untracked, so no history can confirm it. The *property* it was meant to
   deliver is independently demonstrated (four reviewer-devised behaviour mutations, all caught).
10. **The R11 probe models the `PROFILE_DOMAIN` branch rather than reading it** — moving the render loop
    out of that branch would slip past. Worst case is a cosmetic false-positive warning. See the
    closeout section for the assertion that would close it, and why it was reasonably deferred.
11. **This ledger fails `prettier` by choice** (the 826th file). Do not `--write` it; it would reflow
    the recorded evidence, and prettier is not a gate here.
