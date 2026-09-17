# 0277 — worklog

Built 2026-09-17 from `plan.md`. Hash-verified before writing any source, twice: the original at
`bd16a765215249faa9d2c265aaf32efc03ce0d3c` (616 lines) for steps 1–4, then the amended file at
`a0815d5d5ee6ffd19c452e77ff4a84123351e9e9` (769 lines) for steps 5–11. Both read in full.

The build ran in two parts because the driver **stopped it between step 4 and step 5**: the
architect's disassembly of the shipped monitoring binary showed that a **401, 403 or 404 reply
permanently disables the notification channel**, which the approved plan's own fail-closed 401 would
have triggered. AMENDMENT 1 replaced the response contract; steps 5–11 were built against it.

⚠️ **A claimed security finding in an earlier draft of this worklog was WRONG and has been retracted
in place — see "Retracted finding" below. It is kept visible, not deleted, because the retraction is
more useful to a later reader than a quietly-removed claim.**

---

## What changed

| File                                                 | Change                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/notifications/TelegramNotifier.ts`         | `threadId`; one connection-level retry; bounded `cause.code`; outcome gained fields; header rewritten (the Master.ts scope boundary is superseded)                                                                      |
| `src/profile-server/AlertRelay.ts`                   | **new** — schema, secret check, limiter, dedupe, formatter, out-of-band alarm, delivery                                                                                                                                 |
| `src/profile-server/InternalAuth.ts`                 | `tokensMatch` exported. Pure rename-to-exported                                                                                                                                                                         |
| `src/profile-server/Routes.ts`                       | the three planned regions only: `AppOptions`, the options read, the mount after `/internal/v1/credit`                                                                                                                   |
| `src/profile-server/Server.ts`                       | three literal `process.env` reads, a boot warn, `threadId` into the name-change config, relay config into `createApp`                                                                                                   |
| `src/profile-server/Telemetry.ts`                    | `alertRelay(result, keyed)` on the interface, the no-op set and the real meter                                                                                                                                          |
| `src/profile-server/NameChangeRepository.ts`         | adapted to the outcome object; `sent_after_retry` counts as success                                                                                                                                                     |
| `src/server/Master.ts`                               | both inline sends migrated onto the helper; the module-level `ProxyAgent` deleted                                                                                                                                       |
| `setup-profile.sh`                                   | three `persist_or_reuse_secret` calls, three `profile.env` keys, an **empty-allowlist warning**                                                                                                                         |
| `build-deploy-profile.sh`                            | three exports                                                                                                                                                                                                           |
| `example.env.profile`                                | the three documented                                                                                                                                                                                                    |
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | **new** — including owner ruling B's documentation                                                                                                                                                                      |
| tests                                                | `AlertRoutes.test.ts` (new), `MasterFeedbackRoutes.test.ts` (new), plus `TelegramNotifier`, `InternalAuth`, `InternalPathCase`, `Telemetry`, `NameChangeRepository`, `RouteMetrics`, `profile-deploy-hardening.test.sh` |

---

## ⚠️ Retracted finding — "the game server logs the bot token". IT DOES NOT.

**What I originally claimed (2026-09-17, in this worklog and in my report):** that both inline sends in
`Master.ts` logged `formatError(err)`, that an undici fetch error carries the request URL with the bot
token embedded in its path, and therefore that a Telegram connection failure **wrote the live bot token
into an off-box log**. I recommended the owner be asked whether to rotate the credential.

**That was wrong.** The driver challenged it against a real production log line and I went back and
checked. What follows is the correction.

### Why it was wrong — the failure mode is worth more than the claim

The "evidence" was two mocks in my own test file talking to each other:

1. The error was a **fixture I wrote**: `new Error("failed to fetch https://api.telegram.org/bot<TOKEN>/sendMessage")`.
   The URL was in the message because I put it there.
2. That file **mocks `formatError` as `String(error)`** (`tests/server/MasterFeedbackRoutes.test.ts:37`).
   The real one is `error.stack ?? error.message`.

So neither half of the round trip exercised production code. The red I treated as a discovery was
self-fulfilling.

### What was then verified — undici 8.0.2, in this working tree

- A fetch failure is `new TypeError('fetch failed', { cause: … })` (`lib/web/fetch/index.js:237`).
  **No URL in the message.**
- **Every** message in `lib/core/errors.js` is a **fixed literal** (`'Socket error'`,
  `'Connect Timeout Error'`, …). Not one interpolates a URL.
- **No undici error stores a `.url` property at all.**
- `Error.prototype.stack` begins with the message, so a URL-free message means a URL-free stack.

And `formatError` (`src/server/Logger.ts:80-85`) returns `error.stack ?? error.message` — it **never
reads `.cause`**, which is precisely where the URL-bearing detail lives.

### The production evidence agrees

A real log line from **2026-09-17 10:30:06 UTC** — the stale-socket feedback failure, immediately after
the egress proxy restart, i.e. exactly the case I claimed leaks — carries `TypeError: fetch failed`
with **internal frames only and no token**. It matches the analysis above exactly.

### The sharpest evidence that my theory was untested

Under my own theory, `Master.ts`'s **webhook** failure line
(`[feedback] webhook delivery failed: ${formatError(err)}`) leaks a capability URL by the identical
mechanism — and **I left it untouched**. A theory I did not apply to the identical adjacent line was
not a theory I had actually tested.

### What the round-1 review added — and it STRENGTHENS the guard

The reviewer verified something I had missed: **`undici/lib/web/fetch/request.js:136` DOES interpolate
a whole input URL into a `TypeError` message** — `throw new TypeError('Failed to parse URL from ' + input)`.
I confirmed it in the installed tree. A message reaches `stack`, and `formatError` returns `stack`.

That does **not** revive the retracted claim: the construction is in the `Request` constructor and is
reachable only if the URL fails to parse, which our fixed `https://api.telegram.org/bot…` prefix
prevents (the reviewer tried 30 hostile token values; none made it unparseable). But it changes the
guard's status from _"defence against a hypothetical future undici"_ to **"defence against a real
construction present in the installed version, unreachable today only because the host prefix is
fixed."**

🚨 **So `boundedCauseCode` and logging `outcome.code` instead of `formatError(err)` are NOT optional
and must not be removed.** The retraction says the leak was never live; it does not say the guard is
unnecessary.

### Corrected severity, at its true size

A **latent, currently-unreachable passthrough**: free-text formatting of a vendor-controlled value. The
migration closes it as **defence in depth against a future undici**, **not** as a fix for anything ever
observed. ⛔ **No credential rotation. No log search.** Neither was justified, and the owner was told so.

**Caveat, kept:** undici **8.0.2 was checked in this working tree**, not the version inside the deployed
game image.

The two tests remain and still earn their place — they pin that the migrated code emits a **bounded
code** rather than a formatted error. Only the claim about what that proves was wrong; the assertion
was not weakened.

---

## Gates

| Gate                                             | Result                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                       | **137 suites / 1801 tests, all passed**, 63.7 s                                                                                                                                                                                                                                             |
| `npx tsc --noEmit`                               | **0**                                                                                                                                                                                                                                                                                       |
| `npm run lint`                                   | **0**                                                                                                                                                                                                                                                                                       |
| `npm run check:config-parity`                    | **REQUIRED 0** on all three pipelines. No allowlist entry was needed, as the plan predicted                                                                                                                                                                                                 |
| `tests/scripts/profile-deploy-hardening.test.sh` | **ALL PASS**                                                                                                                                                                                                                                                                                |
| `npx prettier --ignore-unknown --check .`        | **826 files fail repo-wide — the repo's normal state, NOT a regression** (no `.prettierignore` exists; `npm test` does not run prettier and the husky hook is inert, `0223`). **Every file 0277 created or edited is clean**, verified at that canonical scope. ⚠️ See the correction below |

`npm run test:integration` deliberately not run — plan §5; the relay touches no database.

### The flake rule

The new `AlertRoutes.test.ts` and `MasterFeedbackRoutes.test.ts` both use `supertest`. **No timeout or
"did not exit" failure occurred in any run**, so the `0197` `SIGSEGV` signature never had to be ruled
out and **no run was re-run to clear a failure**. Every red recorded below was a deliberate mutation
or a genuine RED-first step.

---

## Mutations executed, and results

Each was applied to the real source, the suite run, the source restored. **20 mutations, all caught.**

### Steps 1–4

| #   | Mutation                                                                      | Result               |
| --- | ----------------------------------------------------------------------------- | -------------------- |
| M1  | `message_thread_id: config.threadId ?? ""` — always present, empty when unset | **caught**, 4 failed |
| M2  | field misspelled `thread_id`                                                  | **caught**, 1 failed |
| M3  | no retry at all (the `0061` defect restored)                                  | **caught**, 3 failed |
| M4  | retry a Telegram rejection too                                                | **caught**, 1 failed |
| M5  | `cause.code` passed through unguarded (the passthrough the guard exists for)  | **caught**, 5 failed |
| M6  | length guard dropped from `tokensMatch`                                       | **caught**, 8 failed |

### Steps 5–11

| #   | Mutation                                                               | Result                                    |
| --- | ---------------------------------------------------------------------- | ----------------------------------------- |
| M7  | **401 on a bad secret** — the channel killer                           | **caught**, 5 failed                      |
| M8  | fail-**open** truthiness: a missing secret let through                 | **caught**, 4 failed                      |
| M9  | `await` the send before responding                                     | **caught**, 1 failed — see the note below |
| M10 | response body echoes the request                                       | **caught**, 1 failed                      |
| M11 | schema expects a **numeric** `id`                                      | **caught**, 10 failed                     |
| M12 | secret read from the **top level**, not `payload`                      | **caught**, 6 failed                      |
| M13 | un-keyed alerts dropped                                                | **caught**, 1 failed                      |
| M14 | alarm not rate-limited                                                 | **caught**, 1 failed                      |
| M15 | the 5xx branch replaced by 200                                         | **caught**, 2 failed                      |
| M16 | title not HTML-escaped                                                 | **caught**, 1 failed                      |
| M17 | a `Source: Uptrace` line added                                         | **caught**, 1 failed                      |
| M18 | case-sensitive routing turned off                                      | **caught**, 19 failed                     |
| M19 | `Master.ts` logs the formatted error again instead of the bounded code | **caught**, 1 failed                      |
| M20 | subscribe silently succeeds on a refusal                               | **caught**, 1 failed                      |

Restored source re-confirmed green across the three suites: **73/73**.

⚠️ **M9 needed `--forceExit` to record.** Awaiting the send before responding means the route never
answers while the test's send is deliberately unsettled, so supertest leaks its listener and jest does
not exit. **The hang is the mutation being caught**, not a flake — and it is worth knowing that this
particular defect shows up as a hang rather than an assertion failure.

---

## Decision log

Calls made on my own judgment, what they sit under, and why they qualified.

**D1 — the send outcome is an object, not a widened string. Plan §1a(iii)/(iv) + §3 test 7.**
The plan describes the return two ways that cannot both be literal: §1a(iii) calls it a widened string
union, while §3 test 7 requires the token to appear in **"no field of the returned value"**. A single
object (`{ result, status?, code? }`) satisfies the stronger requirements. **Left as resolved, flagged
for the reviewer — the driver confirmed it is not overruled.** It also turned out to be load-bearing
for §4a: `Master.ts`'s `responded with <status>` line cannot survive without the `status` field.

**D2 — `NameChangeRepository` treats `sent_after_retry` as success.** Forced by the widening;
otherwise every message the retry rescued would log a warn.

**D3 — the dedupe TTL is 48 h, not the plan's ~24 h. §1b + A4's verified retry budget.**
The budget is now verified at **~26 hours**, so a 24 h window would let the tail of a retry sequence
fall out and deliver a duplicate. **Why it qualified:** an obvious winner inside the plan's stated
intent (dedupe _against the retry budget_) — the plan's number predates the measurement that
invalidates it. A test pins the 26 h case.

**D4 — the metric is `alertRelay(result, keyed)`, two bounded labels, not one. §1d.2 + the
amendment's "counted separately" for un-keyed alerts.**
A seventh `result` value would have meant recording twice per event, making the counter's total
meaningless. Two dimensions keep one increment per call and still record both facts. 6 × 2 = 12 series,
bounded by types, never by anything in the request body.

**D5 — the `Master.ts` characterization tests went in a NEW file, not `Master.test.ts`.** The plan
names `tests/server/Master.test.ts`. `Master.ts` reads its `FEEDBACK_TELEGRAM_*` constants at **import**
time, so each case must load it fresh under a chosen environment — which needs an `undici` mock that
delegates to stable outer mocks. The existing 1100-line suite's lobby-poll tests drive its `undici`
mock directly and would have had to be rewritten. **Why it qualified:** it serves the plan's actual
requirement (characterization before the edit, passing unchanged after) and avoids perturbing a large
unrelated suite; `InternalPathCase.test.ts` (task `0276`) is the in-repo precedent for exactly this.

**D6 — `Master.ts` keeps its local `esc` helper rather than switching to `escapeTelegramHtml`.**
The two are identical, but replacing it would touch ~12 call sites on the only Telegram path proven
working in production, for zero behaviour change. Minimal diff on the proven path wins. **Residual:
the duplication is real and a reviewer may reasonably flag it.**

**D7 — on a double send failure the reported `code` is the second attempt's** (the one that decided
the outcome). The plan does not say which.

**D8 — `alert.status` resolved-detection matches `closed`/`resolved`, case-insensitively; anything
else renders as firing.** The architect verified **which field** to read but not its full value set.
**Unverified vocabulary, flagged in the code.** Unknown → firing is the safe direction: a recovery
shown as an alert is noise, an alert shown as a recovery is a missed incident.

**D9 — the `TELEGRAM_TOPIC_FEEDBACK` absence assertion strips comment lines before grepping.** My
first version false-positived on its own explanatory comment. A comment naming the variable is the
documentation that stops the next reader re-adding it, so forbidding it would have been backwards.

**D10 — the dedupe bound is asserted at the cache's own level, not through the route.** The route's
limiter is 60/min and trips hundreds of requests before the 500-entry cap, so an HTTP-level version of
that test passed for the wrong reason. Caught by writing it the wrong way first.

Two defects in my own code were caught by my own tests and fixed before any gate ran: a `deduped` drop
was recorded as `unkeyed` (a dedupe hit is keyed by definition), and the bound test described in D10.

---

## Required statements, verbatim per the plan

- **sustained delivery is unproven until `0283` lands** (§1d). Also in the runbook, with the
  amendment's sharper point: `0283`'s digest never traverses this route, so it proves Telegram works
  and **never** that the monitoring → relay hop does.
- **`0061` step 4 remains the owner's open product question** (§11). The retry changes the _odds_ a
  message is lost, never _what the player is told_. A characterization test pins `{ok:true}`-on-failure
  deliberately, so the behaviour is visible rather than incidental.
- **the `Master.ts` fix is fixed-in-the-tree, unshipped** (§7) — until the game deploy rides `0273`.
  Between this deploy and that one, the feedback path still drops messages on a stale socket. It must
  not be written down anywhere as "the feedback bug is fixed". (An earlier draft added "and still logs
  the bot token" here — that was the retracted claim above, and it is **not** true.)

---

## Flagged, not acted on

- **`0033`'s brief needs a producer update.** Its consolidation work has shrunk to approximately
  nothing now that both `Master.ts` call sites are on the helper. Task-file edits are the producer's;
  no brief was touched.
- **The allowlist 403 trap is owner-accepted (ruling B) with documentation only.** The runbook records
  what must happen when the monitoring box's IP changes, and — as the architect showed — that
  `profile-checks.sh` would compare a value with itself and `0283`'s digest would keep reporting "the
  bot works" while alerts were dead. **A real guard (a synthetic probe from the monitoring box + a
  marker-age check) is a follow-up task, not this one.** Until it lands the risk stands at full size.
- **A body the parser itself rejects never reaches the relay's handler** — `express.json()` answers
  **400** (malformed), **413** (over 100 kb) and **415** (unsupported charset / Content-Encoding)
  before the handler runs (review R6 widened this from "400"). **None of the three is in the disable
  set**, so each costs retries rather than the channel — but all three sit outside the handler's
  never-non-2xx guarantee. Noted, not changed.

## Carry-forward for `0284` (the synthetic-probe follow-up)

🚨 **`0284`'s probe must use `POST`.** Verified during round 1: `HEAD` and `GET` on the webhook path
both return **404** and `OPTIONS` returns 200 — so a probe using anything but POST would get a
harmless-but-confusing 404 and prove nothing about the path a real alert takes. (This came out of a
Codex finding that was otherwise **disproven**: a third party's HEAD cannot disable the channel,
because the disable happens inside the sender when _its own_ notification attempt is refused.)

## ⚠️ Correction — my earlier prettier gate report was wrong, in both halves

An earlier draft of this worklog recorded _"prettier clean"_ and, in my report, _"64 files fail
repo-wide, pre-existing, not mine"_. **Both were wrong, and the error pointed the wrong way — at other
people's files instead of at ones this task added.**

- **The scope was wrong.** I ran `--check src/ tests/`, which is not the canonical scope. Canonical is
  repo-wide (`prettier --ignore-unknown --check .`; there is no `.prettierignore`), which reports
  **826** files, not 64. My "64" was simply the count inside two directories.
- **The conclusion was wrong because of it.** My scope **excluded the files this task created outside
  `src/` and `tests/`** — so `alert-delivery-runbook.md` (created here) and this worklog were never
  checked at all, and both failed. Round 2 caught the runbook; I found the worklog by re-running at the
  canonical scope rather than fixing only what was pointed at. Both are fixed.
- **Proportion, so this is not over-read:** prettier is **not a gate** in this repo. `npm test` does not
  run it and the husky hook is documented inert (`0223`). 826 is the normal state.

The lesson is the scope, not the formatting: **a check narrower than the thing it certifies will
always say the new thing is clean.**

## Round 1 review — what was applied

Ledger: `review.md`. 10 findings, none blocking; the central property (no input makes the handler emit
401/403/404) **held** across two passes and eleven reviewer mutations.

| #   | Verdict                               | What changed                                                                                                                         |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | CORRECT, **defect**                   | `tokensMatch` now length-guards on **UTF-8 bytes**, not JS string length. Reproduced the `RangeError` directly before fixing         |
| R2  | CORRECT, **test gap**                 | Six tests for the wire→view mapping, through the real route. All four reviewer mutations now caught (they passed 27/27 before)       |
| R3  | CORRECT, **defect** (owner: FIX)      | A failed delivery now **un-marks** the dedupe id, so a retry is not suppressed. Three tests, including the one a careless fix breaks |
| R4  | CORRECT, **defect**                   | The empty-allowlist warning guards the **rendered directives**, not the raw variable                                                 |
| R5  | CORRECT, **fake gate**                | Replaced the file-wide grep with a **behavioural probe** that extracts and runs the render loop + warning                            |
| R6  | CORRECT, doc                          | Widened "400" to "400/413/415" above                                                                                                 |
| R7  | CORRECT, doc                          | Three sites swept; the guard's justification **strengthened**, not weakened                                                          |
| R8  | CORRECT, gap (owner: ADD)             | `report_config_values` row for the relay token + the two topics, behaviourally gated                                                 |
| R9  | CORRECT, doc                          | `example.env.profile` now says the monitoring box is in the allowlist, and what a wrong address costs                                |
| R10 | CORRECT, **frontier** (owner: ACCEPT) | Recorded as a residual. No code change                                                                                               |

**R5 before R4, deliberately.** The strengthened gate went **red on exactly R4's hole** (3 failures:
`" "`, `","`, `" , "`) before R4 was touched, then green after. The new gate also catches both
mutations that defeated the old grep: inverted guard → 6 failures; echo demoted to a comment → 4.

**R2's tests were proven non-vacuous** by re-running the reviewer's four mutations: `alert.state` for
`alert.status` → 1 failure; title source flipped → 1; value↔threshold swapped → 2; `since` dropped → 2.

⚠️ **One limit the reviewer recorded that I cannot close:** the _"characterization tests written against
the old code first"_ **ordering** is unverifiable — the task folder is untracked, so there is no
history. The property that ordering was meant to deliver is independently demonstrated (four
reviewer-devised behaviour mutations all caught), which is what actually matters — but the ordering
itself rests on my word, and should be read that way.

**Suppressed as settled, not re-litigated:** the `/internal/` 403 trap (owner ruling B, `AMENDMENT 1`
A4/R14 + A5). R4 and R9 are **not** that finding — they are defects in this task's own guard and
template text.

## Residuals

1. **D1's outcome-object shape** — my resolution of an internal inconsistency in the plan.
2. **D8's unverified `alert.status` vocabulary** — a resolved alert may render as firing.
3. **D6's duplicated `esc` helper** in `Master.ts`.
4. **Dedupe is in-process**: a restart between an attempt and its retry delivers a duplicate. Accepted
   by design (a duplicate beats a loss) and in the runbook.
5. **The relay has never run against a real webhook call.** Every schema field is verified from the
   binary, but nothing here has seen live traffic — the drill (§8) is the owner's.
6. **NEW (R10, owner ruled ACCEPT).** A `SIGTERM` inside the ≤20 s window after a 202 drops an
   already-acknowledged alert: the floating `deliver` promise is not drained by graceful shutdown.
   Tracking in-flight deliveries through `Shutdown.ts` is real complexity for a narrow window, and
   deploys are rare and manual. **Recorded, no code change.**
7. **NEW. Dedupe un-marking (R3's fix) is best-effort — and this is NOT the same residual as 4.**
   It releases the id when _this process_ sees the delivery fail; a crash between the 202 and the
   failure leaves the id marked. ⚠️ **Same limit, opposite consequence, and that is why they stay
   separate** (reviewer, round 2 — it overruled my merging them, correctly): residual 4 loses
   _de-duplication_ ⇒ a **duplicate**, which is the direction this module explicitly prefers.
   Residual 7 loses the _un-marking_ ⇒ a **suppressed retry** ⇒ a **lost alert** — the unsafe
   direction, and the exact failure R3 was raised to fix.

No commit, no push, no task-file move, no status set, no wiki write, no sprint/brief/review edit.
`plan.md` untouched and still `a0815d5d5ee6ffd19c452e77ff4a84123351e9e9`.
