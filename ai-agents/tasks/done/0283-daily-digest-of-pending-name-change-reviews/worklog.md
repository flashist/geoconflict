# Worklog — `0283` daily digest of pending name-change reviews

**Build step** — executed 2026-09-18 by `fkit-coder`, spawned by `fkit-sprint-ship-loop` under the
owner's plan approval (`AskUserQuestion`, live lead session, *"Approve — build it"*, plus the two
rulings appended to `plan.md`'s ⛔ OWNER RULINGS section).
Plan: `plan.md` in this folder. Nothing committed, nothing pushed, no task file moved.

---

## 1. The owner's rulings, and where each one landed in the code

### Ruling: it sends even when the count is zero (2026-09-17)

**The rationale is the load-bearing part, and it is recorded in four places so nobody "optimises away
the daily 0" without seeing it:** the daily arrival is the heartbeat for Telegram delivery from the
profile box, so the message's **absence** is the signal. A digest that spoke only when there was
something to report would be indistinguishable from a digest whose delivery had broken — the exact
silent-failure class `0061` documents. Removing the empty digest removes a **liveness check**.

| Where | Form |
|---|---|
| `src/profile-server/NameChangeDigest.ts` | The module header comment states the ruling and its rationale. There is **no** `count === 0` branch anywhere. |
| `tests/profile-server/NameChangeDigest.test.ts` | `"SENDS when the count is zero — the daily message is the heartbeat"` asserts one send with `Waiting for review: 0`. |
| `tests/scripts/profile-deploy-hardening.test.sh` | Greps the comment-stripped module for any comparison of `count` against `0`/`1` and **fails** — mutation-probed, see §5. |
| `setup-profile.sh` cron comment + the runbook | Both say it explicitly, with a ⛔ never-add-a-skip line. |

### Ruling: the hour is **07:00 MSK = `0 4 * * *` UTC**, overriding the plan body's `09:00 UTC`

Applied everywhere: the cron line, its comment, the runbook page, the code comments, the tests.
**Grepped: no `09:00 UTC`, `12:00 MSK` or `0 9 * * *` survives in any of them** — the only remaining
mentions are the two sentences here, recording that the override happened. Moscow is UTC+3
year-round, so there is no seasonal variant.

**The collision check the ruling demanded was run against the generated cron file, not assumed.**
Every schedule `setup-profile.sh` writes, read out of the script itself:

| Schedule | Job |
|---|---|
| `0 8 * * *` | disk-usage warning |
| `0 8 * * *` | `checks.sh` |
| `30 2 * * *` | `backup.sh` (off-box mode) |
| `0 3 * * 0` | local `pg_dump` (local mode, Sundays) |
| `0 5 * * 0` | old-dump prune (local mode, Sundays) |
| `0 0,12 * * *` | certbot renew (only when a domain is configured) |

**`0 4` is free.** Nearest neighbours: the 02:30 daily backup (90 min earlier) and a Sunday-only
03:00 `pg_dump`. This agrees with the list the driver supplied. Four hours clear of the 08:00
pile-up, so a slow `checks.sh` run cannot delay the digest.

### Ruling: optional step 8 is IN SCOPE, with a mandatory negative-age guard

Built in full — marker, directory, bind mount, `profile-checks.sh` check 12, negative-age guard. The
guard is the `0284` review R5 lesson applied before it could be re-learned: a future-dated
`finished_at` gives a negative age that `-gt` reads as **fresh**, so the check would report green for
the whole duration of a clock skew. Mutation-probed (§5).

---

## 2. Change surface

| File | Change |
|---|---|
| `src/profile-server/NameChangeDigest.ts` | **New**, 203 lines. `PENDING_COUNT_SQL`, `NAME_CHANGE_DIGEST_MARKER_PATH`, `countPendingNameChanges`, `formatNameChangeDigest`, `runNameChangeDigest`, plus a private atomic marker writer. |
| `src/profile-server/sendNameChangeDigest.ts` | **New**, 56 lines. The `migrate.ts`-shaped one-shot entry. Import surface is exactly `dotenv`, `./Db`, `./Logger`, `./NameChangeDigest`. |
| `package.json` | +1 line: the `digest:name-changes` script, same ts-node flags as `migrate`. |
| `setup-profile.sh` | Added: the `digest/` dir (0700), the compose bind mount + its comment, one echo line, the `0 4 * * *` cron line and comment inside the always-present header block, and (review round 1) the deploy-time `npm run digest:name-changes` invocation after the cron file is written. No existing line was removed or rewritten — **but see the mode correction below, which the first version of this row wrongly reported as "nothing removed or rewritten" full stop.** |
| `profile-checks.sh` | **+49 / −0.** `DIGEST_MARKER`, `MAX_NAME_CHANGE_DIGEST_AGE_HOURS` (26 h) with its `int_or_default`, check 12 `check_name_change_digest`, its call, and a header-comment entry. |
| `tests/profile-server/NameChangeDigest.test.ts` | **New**, 251 lines, 16 tests. |
| `tests/integration/NameChange.it.test.ts` | **+51 / −0.** A `pending-review count for the daily digest` block over real Postgres. |
| `tests/scripts/profile-deploy-hardening.test.sh` | Added only: one new structural section, **21 assertions as emitted at runtime**. No existing assertion changed. |
| `tests/profile-checks.sh` | **+83 / −9.** `write_digest_marker`, `reset_fixture` seeding, the C23 block, and the seven `RESULT: N ok` count bumps (11 → 12 checks). |

🚩 **Correcting the record (review R9).** The row above originally read *"Nothing removed or
rewritten"* and listed only additions. That did not match the diff: `setup-profile.sh`'s **tracked
file mode had changed `100755 → 100644`** in the working tree — an unexplained change this build made
and did not report. `profile-checks.sh` kept `755`. Restored to `755` in the review round (see §4a
below). Ownership was ambiguous with the also-uncommitted `0282`; **the owner ruled `0283` fixes it,
because this is the run that noticed.**

🚩 **Why no deploy ever failed on it, which is the reason it went unnoticed for a whole task:**
`build-deploy-profile.sh:506` runs its own `chmod +x "$SETUP_SCRIPT"` on the copy before `scp`, so
the box always received an executable script. The bit only mattered for `./setup-profile.sh` run
directly — and that same `chmod +x` **re-dirties the working tree on every deploy**, which is how a
mode change hides in plain sight. A harness assertion now reads the filesystem bit; note that the
**git index kept `100755` the whole time**, so an index-mode check would have caught nothing.

### Review round 1 (2026-09-18) — additional change surface

| File | Change |
|---|---|
| `setup-profile.sh` | +1 block: the deploy-time `npm run digest:name-changes` (R4/D2), warn-not-abort. File mode restored `644 → 755` (R1/D1). |
| `profile-checks.sh` | Both check-12 FAIL texts now name three causes (R2/D3). No logic change. |
| `src/profile-server/NameChangeDigest.ts` | `finished_at` captured after the send (R8); `startedAt` renamed from `at` for the message. |
| `src/profile-server/sendNameChangeDigest.ts` | Comment only: the "silent and fatal" stakes corrected (R7). |
| `tests/scripts/profile-deploy-hardening.test.sh` | +5 assertions (exec bit, owner's hour, deploy-time seed ×2) and a widened import guard; `>=` added to the zero-count alternation (R1, R3, R4, R5, R7). |
| `tests/profile-checks.sh` | +2 `C23` assertions pinning the three named causes (R2). |
| `tests/profile-server/NameChangeDigest.test.ts` | +1 case: `finished_at` is stamped after the send (R8). |
| `ai-agents/knowledge-base/name-change-digest-runbook.md` | *Turning it off* is a four-part change (R6); *When it stops arriving* leads with the three causes (R2); new *Deploy* text for the deploy-time send (R4). |
| `ai-agents/tasks/done/0283-…/review.md` | *Coder response* written; the two proposed residuals moved to accepted per D3/D4. |

⛔ `plan.md` not touched. `src/profile-server/AlertRelay.ts` not touched (D4 forbids extracting a
shared marker writer). Nothing committed, nothing pushed, no task file moved.

⚠️ **Two rows deliberately carry no `+N / −M`, because a `git diff` of them would be misleading.** The
working tree already held task `0282`'s **uncommitted** changes to `setup-profile.sh` and
`tests/scripts/profile-deploy-hardening.test.sh` when this build started, so a numstat over those two
files (`+80 / −6` and `+139 / −2`) mixes both tasks. The prose says what `0283` itself added; the
`0282` lines in those numbers are not this task's.
| `ai-agents/knowledge-base/name-change-digest-runbook.md` | **New** runbook page. |
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | The "sustained delivery is unproven until `0283` lands" paragraph updated — see §4. |

**Not touched, deliberately** (each is linted by the hardening harness, so an accidental edit turns
`npm test` red for someone not touching test code): `setup-telemetry.sh`,
`build-deploy-telemetry.sh`, `build-deploy-profile.sh`, `nginx.conf`, `update.sh`,
`src/profile-server/AlertRelay.ts`, `Routes.ts`, `Server.ts`, `Dockerfile.profile`.

**No new route, no new HTTP status, no new app environment variable.** `check:config-parity` reports
`REQUIRED 0 / INFO 0` for the profile pipeline — unchanged.

---

## 3. Verified facts, not assumed ones

- **`0277`'s send-failure fix is present and is being inherited, not forked.** Checked in the code:
  `TelegramNotifier.ts` exposes `sent_after_retry` as a distinct success result, and
  `NameChangeRepository.ts:545-551` records the lesson. `runNameChangeDigest` treats **both** `sent`
  and `sent_after_retry` as success; a test asserts a rescued retry logs **nothing**.
- **One pending row per player is a schema guarantee, not an assumption.**
  `migrations/006_player_identity.sql:144-146` — `unique (player_id) where moderation_status =
  'pending'`. Note this supersedes the brief's citation of `004_name_change.sql`, which indexed
  `yandex_player_id`; the conclusion is unchanged. So pending **rows** = waiting **players**: no
  `DISTINCT`, no `GROUP BY`, and a unit test fails if either appears.
- **The topic variable is already wired.** `Server.ts` reads `TELEGRAM_TOPIC_NAME_CHANGES` and hands
  it to `NameChangeRepository`; the digest reads the same name literally.
- **The per-request notification is undisturbed.** `NameChangeRepository.ts` was not modified, and
  its existing unit + integration tests stayed green unchanged. That, not a new test, is the
  regression proof (plan §6.5).

---

## 4. Decision log — calls made without asking, and why each qualified

Recorded per ADR-019's audit obligation, which transfers with the sprint-loop's standing approval
(ADR-032 A4). Everything here is inside the approved plan; nothing widened its scope.

| # | Call | Why it qualified |
|---|---|---|
| 1 | The marker write lives in `runNameChangeDigest` (in `NameChangeDigest.ts`) rather than literally inside `sendNameChangeDigest.ts`, where plan §8 bullet 1 put it. | **Obvious winner within the plan's intent.** §4.1 already defines `runNameChangeDigest` as the place with the test seams; putting the write there makes "success-only" directly testable (two tests: stamped on success, withheld on failure) instead of only reachable through a process that calls `process.exit`. The CLI still triggers it, the path constant is still compiled in, and the harness drift guard reads it from the same file. |
| 2 | `profile-checks.sh` gained two **host-side** env overrides — `PROFILE_CHECKS_NAME_CHANGE_DIGEST_MARKER_FILE` and `PROFILE_CHECKS_MAX_NAME_CHANGE_DIGEST_AGE_HOURS`. | **Mechanical and in-plan.** Identical to the `0284` probe check's own two seams, required by that file's stated rule that every input is env-overridable so it is testable off-box. They are **not** app config: `profile.env` is untouched, nothing under `src/` reads them, and the parity guard's profile pipeline is unchanged. The plan's ⛔ "no new environment variable" is about the app's config surface, and it holds. |
| 3 | `alert-delivery-runbook.md` says the digest is **"BUILT but NOT YET OBSERVED ARRIVING"** instead of plan §4.6's *"proven from `<date>`"*. | **Within intent, and the alternative would be a false claim.** Nothing is deployed and no message has been seen. The plan's own §6 forbids an agent claiming an arrival, and `0219`'s precedent is explicit that an asserted arrival does not count. The line says exactly what flips it to *proven*. |
| 4 | Check 12's staleness threshold is **26 h**. | Specified by plan §8 (`> 26 h`). Recorded because it is the one tunable number: the digest fires at 04:00 UTC and the checker at 08:00 UTC, so the steady-state age is ~4 h and 26 h is the same "one missed daily run" tolerance the backup marker uses. |
| 5 | The success path logs one `info` line (`name-change digest sent (N waiting)`). | Mechanical. Bounded fields only — a count, never a token, chat id, topic id or URL. |

**No fix was applied outside the approved plan, and no `NEEDS-DECISION` arose.**

---

## 4a. Decision log — review round 1 (2026-09-18), fixes applied without asking

Same ADR-019 audit obligation as §4, carried into the sprint loop's **process-review** step
(ADR-032 A4). The standing approval here is the approved plan **plus the owner's four dispositions
D1–D4**, given live via `AskUserQuestion` in the lead session on 2026-09-18. Every entry below is a
verified-`CORRECT` finding, fixed mechanically and inside that scope. **No fix was applied outside
it; nothing was widened; no `NEEDS-DECISION` was raised.**

| # | Finding | What changed | Why it qualified |
|---|---|---|---|
| 1 | **R1** | `chmod 755 setup-profile.sh`; one new harness assertion `[ -x "$P" ]`. | **Owner D1, verbatim** — restore the bit *and* add a harness guard. The only judgement left to me was `[ -x ]` vs the git index mode, and D1 explicitly delegated that ("your call which is less brittle, say which and why"). `[ -x ]` — because `git ls-files -s` still read `100755` throughout, so an index check **would have missed this exact drift**, and `[ -x ]` needs neither git nor a work tree. |
| 2 | **R4** | `setup-profile.sh` runs `npm run digest:name-changes` once, immediately after the cron file is written; two new harness assertions; runbook *Deploy* section. | **Owner D2, verbatim**, including the accepted side effect of one extra digest per deploy and the ⛔ on a synthetic marker. |
| 3 | **R4, the sub-question D2 left open** | It **warns and continues**; it does not abort the deploy. | **Settled by the script's own convention, which is what D2 said to do if a convention settles it.** `setup-profile.sh` fails closed only where nothing else would notice (migration `:1253`, the backup smoke check, the off-box downgrade guard) and **warns where another mechanism already watches** — the `checks.sh` install says exactly that: *"the daily cron line is still written … which the dead-man's switch reports."* A failed digest withholds the marker, so check 12 pages within 26 h and that page is **true**. Aborting on a third-party Telegram outage would be strictly new, stricter behaviour. |
| 4 | **R2** | Both check-12 FAIL texts (missing **and** stale) name three causes: Telegram, a failed marker write, a DB fault. Runbook *When it stops arriving* leads with the same three. Two new `C23` assertions. | **Owner D3.** Fixing **both** texts rather than only the missing-marker one the finding cited: the same three causes age the marker in both shapes, and naming them in one message only would leave the other half of the page misleading. Mechanical, same file, same wording. |
| 5 | **R3** | Cron hour pinned to `4` as its own assertion. | Verified-`CORRECT`, mechanical, in the approved plan (the hour is an owner ruling already recorded there). **Obvious-winner call inside it:** the anchor regex stays loose so an hour drift reports *"the hour is 'N', not the owner's 4"* instead of *"found 0 digest cron line(s)"* — pinning the anchor instead would have given a misleading diagnostic for the exact drift it exists to catch. |
| 6 | **R5** | `>=` added to the zero-count alternation; nothing else chased, as the reviewer asked. | Verified-`CORRECT` and one token. Checked the claim rather than taking it: the trailing `[01]` means each operator must be listed — `<` does **not** also match `<= 1` — so `>=` was a real hole, and a probe confirmed the old regex misses `count >= 1`. |
| 7 | **R6** | Runbook *Turning it off* is now an explicit four-part change, naming both harness failure strings verbatim. | Docs-only, mechanical. |
| 8 | **R7** | Import guard widened from `^import ` lines to a quoted-specifier scan over the whole comment-stripped file. The "silent and fatal" wording removed from `sendNameChangeDigest.ts` and the harness comment. | **Obvious winner within intent** — R7 said to widen *only if cheap and non-brittle*, else record a residual. It was one `sed` + one regex, and it closes all three shapes the reviewer named (`./Server.js`, a multi-line `} from "./Routes";`, `require()`), each mutation-probed. The stakes correction is the reviewer's own and R7 told me to carry it. **What stays a residual, recorded in the ledger:** it is still text, not module resolution, so a transitive import evades it. |
| 9 | **R8** | `finished_at` is captured **after** the send; `startedAt` still stamps the message. New jest case with an advancing clock. | **Obvious winner between the two options R8 offered.** Capturing after the send touches one file; renaming the field would drag `profile-checks.sh`, its `C23` block and the harness drift guard along — more churn, more risk, for a name that can simply be made true. R8 required me to say which and why; this is it. |
| 10 | **R9** | `worklog.md` §2 corrected (see the 🚩 note there); this section added. | Record-only. |
| 11 | **not a finding — found while re-verifying** | `prettier --write` on `src/profile-server/NameChangeDigest.ts` and `tests/profile-server/NameChangeDigest.test.ts`. | **Mechanical, and it is this task's own drift.** Every other `.ts` in `src/profile-server/` and `tests/profile-server/` is prettier-clean; these two new files were not, and `lint-staged` (`"**/*": ["eslint --fix", "prettier --ignore-unknown --write"]`) would have reformatted them at commit time anyway. The reformatting touched only build-round lines, not review-round ones. ⛔ **Markdown deliberately left alone**: `ai-agents/**` docs and `CLAUDE.md` itself all fail `prettier --check`, so markdown simply is not prettier-formatted here, and formatting one new runbook would break with the surrounding convention. |

**Ledger edit worth flagging, because it is arguably not mine to make:** the two *proposed* residuals
were moved into the **Accepted residuals** list, marked as ruled by the owner on 2026-09-18 (D3, D4),
with the original proposal text kept verbatim below them. The reviewer's *Reviewer findings* section
was **not touched**. If the sprint driver would rather the reviewer perform that move in its
disposition-recording pass, the edit is one block and trivially reverted.

---

## 5. Non-vacuity — the new assertions were mutation-probed, not just watched to pass

A green assertion that cannot fail is worth nothing. Each of the six new guards was broken on purpose
and the harness re-run; every mutation was caught, and every file was restored from a backup taken
first (verified afterwards: `ALL PASS` again, and no probe residue in the tree).

| Mutation | Caught by |
|---|---|
| Digest cron line deleted | `found 0 digest cron line(s), expected exactly 1` (+6 downstream) |
| Digest cron line duplicated | `found 2 digest cron line(s), expected exactly 1` |
| `if (count === 0) return "sent";` added to the module | `a branch compares the pending count against 0/1 — a 'skip when empty' path REMOVES the heartbeat` |
| Bind mount re-pointed at `/var/lib/profile/alerts` | `DRIFT: … the marker would be written where nothing reads it` **and** `the digest bind mount collides with another signal's directory` |
| `import { createApp } from "./Routes"` added to the CLI | `digest entry: imports ./Routes — Server.ts calls listen() at module load` |
| Negative-age guard removed from check 12 | `check 12 has NO negative-age guard — clock skew would hold it green while no digest arrived` |

**Review round 1 added six more new/widened guards, each probed the same way** — against a scratchpad
copy of the tree, never the repo file, with the mutation asserted to have landed before the result
was believed and the restore verified green afterwards. The full table is in `review.md`'s *Coder
response* section.

---

## 6. Gate results — measured this session

### Re-measured after review round 1 (2026-09-18)

| Gate | Result |
|---|---|
| `npm test` | **PASS** — 138 suites / **1870** tests (the new R8 case). Run twice: 52.5 s, then 48.7 s after the prettier pass (§4a #11). Nothing skipped, no supertest flake, so nothing was re-run for a flake. |
| `npx tsc --noEmit` | **PASS** — no output, exit 0. |
| `npm run lint` | **PASS** — exit 0, no output. |
| `npm run check:config-parity` | **CLEAN** — profile pipeline `REQUIRED 0 / INFO 0`, unchanged. |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | **`ALL PASS`** — 21 → **26** assertions in the 0283 section. |
| `bash tests/profile-checks.sh` | **`==== RESULT: 136 passed, 0 failed ====`** (134 → 136: the two new `C23` cause assertions). |
| `npm run test:integration` | **NOT re-run, deliberately.** Nothing in this round touches the count query — `PENDING_COUNT_SQL` is byte-identical and `countPendingNameChanges` is unchanged. The build round's 38/38 stands. |

### As measured in the build round (kept for comparison)

| Gate | Result |
|---|---|
| `npm test` | **PASS** — 138 suites / 1869 tests, 62 s (includes the shell harnesses). |
| `npx tsc --noEmit` | **PASS** — no output. |
| `npm run lint` | **PASS** — exit 0. |
| `npm run check:config-parity` | **CLEAN** — profile pipeline `REQUIRED 0 / INFO 0`. No new finding. |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | **`ALL PASS`** |
| `bash tests/profile-checks.sh` | **`==== RESULT: 134 passed, 0 failed ====`** |
| `npm run test:integration -- tests/integration/NameChange.it.test.ts` | **PASS — 38/38, executed, not skipped.** Ran against the real `gc-0012-it-pg` container on port 5433 (started for the run) with `TEST_DATABASE_URL` from `.env.test`. The three new digest cases are among the 38. |

No supertest flake occurred in any run, so no re-run was needed.

⚠️ `CLAUDE.md`'s recorded `npm test` figures (~113 suites / 1185 tests, ~22–25 s) are **stale** against
the 138 / 1869 / 62 s measured here. That drift is task `0280`'s scope, not this one's — flagged, not
fixed.

---

## 7. What is proven, and what is not

**Proven by an agent, without deploying:**

1. The count is right against the real schema, real constraints and the real partial index — the
   integration block ran and passed.
2. Zero sends; one send per invocation; `sent_after_retry` is success.
3. A failure is loud and leaks nothing (token, chat id, topic id, proxy URL and `api.telegram.org`
   are each asserted absent from the log line).
4. The marker is stamped only on success, in the exact shape `profile-checks.sh` parses.
5. Exactly one daily cron line, at a fixed hour, with stdin closed and a log.
6. The per-request notification path is unchanged and still green.

**⛔ NOT proven, and not claimable by an agent (plan §6):**

1. **Nothing has been deployed.** No box command was run.
2. **No digest message has ever been sent or seen.** The Telegram send path is exercised only
   through a mocked seam.
3. The second day's single message (the schedule) and a zero-count day's arrival are both
   owner-observed facts that do not yet exist.

**Owner steps, and the dates to record here when each is done:**

- [ ] Deploy (`./build-deploy-profile.sh`).
- [ ] Run it once by hand; watch the message arrive. Date: ______
- [ ] Confirm the room is **Name Changes** — not Alerts, not the player-feedback chat.
- [ ] The second day shows **one** message, not two. Date: ______
- [ ] A **zero-count** day sends. Date: ______

⛔ No topic id, chat id, token, host, IP or connection string in any of the above.

---

## 8. Two things to know before they bite

1. 🚩 **Rollback surprise.** A profile image rolled back to a build predating `0283` leaves the cron
   line in place, calling an npm script that does not exist: a daily `Missing script` in
   `/var/log/profile-name-change-digest.log`, no digest, and check 12 paging — which reads exactly
   like a broken Telegram path. Check the running image before hunting a delivery fault. Same shape
   as `0284`'s surprise 1. It is in the runbook and in check 12's FAIL text.
2. ⚠️ **The digest's arrival proves Telegram delivery and nothing else.** It never touches the
   monitoring stack, never crosses nginx's `/internal/` allowlist, and never arrives from the
   monitoring box's egress address. A 403 could have permanently disabled the alert channel while
   this digest kept arriving daily. `alert-delivery-runbook.md:56-59`'s warning stays exactly as it
   is — shipping this makes it **more** important, not less.

---

## 🎯 OWNER-OBSERVED LIVE DELIVERY — 2026-09-19

**Appended by the `fkit-sprint-ship-loop` driver in the lead session, on the owner's report and on
their answer to an `AskUserQuestion`.** ⛔ **This does NOT change the close.** The brief and the sprint
row keep `✅ Done (agent-closed — not owner-verified)`; only the owner may upgrade a landed `✅ Done`
(`fkit-task-done/SKILL.md:78-82`), and nobody has invoked that. This section is **evidence**, not a
status change.

**Why it is here at all:** until this, every Telegram send in this task was exercised **only through a
mocked seam**. These are the first real messages the feature has ever produced. The evidence otherwise
lived in a screenshot.

### What the owner observed

The owner deployed the profile box on the evening of **2026-09-18** and read the Telegram topic the
next morning. **Two messages, both rendered correctly:**

| Message | Body timestamp | Delivered (MSK) | What it is |
|---|---|---|---|
| 1 | `2026-09-18 18:33 UTC` | 21:34 | the **deploy-time send** (R4) |
| 2 | `2026-09-19 04:00 UTC` | 07:00 | **cron**, `0 4 * * *` UTC |

Both read exactly:

```
[Name change] Daily digest
Waiting for review: 0
<timestamp> UTC
```

Arithmetic check, since the whole hour ruling rests on it: `04:00 UTC + 3 = 07:00 MSK`, and the message
was delivered at **07:00**. Moscow is UTC+3 year-round. **The owner's chosen hour landed to the
minute.**

### Brief / plan §6 verification steps — what this discharges

| Step | State |
|---|---|
| **1** — deploy | ✅ owner-run, 2026-09-18 evening |
| **2** — a message observed arriving | ✅ **observed** (message 1, the deploy-time send, satisfies it — the deploy *is* a run of the CLI) |
| **3** — correct room | ✅ **owner confirmed the Name Changes topic**, live via `AskUserQuestion`, 2026-09-19. Not Alerts, not the player-feedback chat. This confirms `TELEGRAM_TOPIC_NAME_CHANGES` routing works end to end. |
| **4** — the second day's **single** message | ⏳ **NOT yet discharged.** One scheduled firing is not a schedule. The proof is the **2026-09-20** 07:00 MSK message arriving, and arriving **once**. |
| **5** — a zero-count day sends | ✅ **PROVEN, and it is the most load-bearing line here.** Both messages read `Waiting for review: 0`. The owner's 2026-09-17 ruling — *send even on zero, because the daily arrival is the heartbeat and its absence is the signal* — is now verified in production, not just in a unit test. |

### Two messages inside 24 h is EXPECTED — do not read it as a double-send

Message 1 is the deploy-time seed, message 2 is cron. **One extra digest per deploy** is the documented
and owner-accepted cost of the R4 fix, which exists to stop a morning deploy producing a false page from
check 12. The harness still asserts exactly **one** cron line; nothing here contradicts that.

### What these messages do NOT prove — stated so the ✅s above cannot be over-read

1. ⛔ **Nothing about Uptrace alert delivery.** The digest never touches the monitoring stack, never
   crosses nginx's `/internal/` allowlist, and never arrives from the monitoring box's egress address.
   A 403 could have permanently disabled the alert channel while these two messages arrived perfectly.
   `0284`'s probe guards that path; this does not.
2. ⛔ **Nothing about delivery after an idle period** (`0274` amendment A1). The gap here was ~9.5 h,
   which is closer to a cold connection than the drill's minutes-apart bursts — but it is **weak
   evidence toward A1, not the test A1 asks for.** ⚠️ **Do not record A1 as discharged by this.**
3. ⏳ **`profile-checks.sh` check 12 had not yet run on the box** at the time of the owner's report
   (~07:38 UTC; the checks cron fires at 08:00 UTC). Its first-ever run should read this marker at
   roughly 4 h old and pass. **Unobserved as of this entry.**
4. ⛔ **Nothing about a non-zero count.** Both observed messages reported `0`. The non-zero path is
   unit-tested but has never rendered a real pending count.

### ~~One stale line left standing, deliberately~~ → ✅ RULED AND ROUTED, same day

`ai-agents/knowledge-base/alert-delivery-runbook.md:470` read that this digest is
*"BUILT but NOT YET OBSERVED ARRIVING"*. **That became false on 2026-09-19.** It was put to the owner
in the same `AskUserQuestion` as the record-this-observation question, and they chose to record here
and **not** to amend the runbook in that turn — so it was logged as tracked-not-forgotten rather than
either silently left wrong or quietly overridden.

✅ **The owner then asked for it, later the same day** (*"do it"*, live in the lead session,
2026-09-19). The `fkit-sprint-ship-loop` driver routed the correction to a spawned `fkit-producer`,
covering **two** stale records, not one:

1. `alert-delivery-runbook.md:470` — the line above;
2. **`ai-agents/sprints/plan-sprint-4.md`, this task's row** — which carried *"nothing is deployed and
   no digest message has ever been sent or observed"*. **`fkit-wiki` found that second one** during
   its 2026-09-19 sync and flagged it rather than editing it (the sprint plan is outside the vault's
   write surface). It would otherwise have been missed: the owner was only ever shown the runbook line.

⛔ **The close was NOT upgraded by any of this.** The brief and the sprint row keep
`✅ Done (agent-closed — not owner-verified)`. Correcting a factual claim inside a row's description is
not the same act as upgrading a landed `✅ Done`, which is **owner-only**
(`fkit-task-done/SKILL.md:78-82`) and which nobody has performed.

⛔ **`alert-delivery-runbook.md:56-59` is deliberately UNCHANGED** — the warning that this digest cannot
catch an alert-path failure and is actively misleading if read that way. **Observed delivery makes that
warning more important, not less.**

📌 **Still open after this correction, so the good news cannot erase it:** verification step 4 (the
second day's *single* message, due 2026-09-20 07:00 MSK) · check 12's first-ever run, unobserved ·
a non-zero count, never rendered · `0274` amendment A1, **not** discharged.

⛔ No secret, host, IP, chat id or topic id appears anywhere in this entry.
