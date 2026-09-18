# Review — 0283

Task: `ai-agents/tasks/done/0283-daily-digest-of-pending-name-change-reviews/brief.md`
File(s) under review: `src/profile-server/NameChangeDigest.ts` · `src/profile-server/sendNameChangeDigest.ts` · `package.json` · `setup-profile.sh` · `profile-checks.sh` · `tests/profile-server/NameChangeDigest.test.ts` · `tests/integration/NameChange.it.test.ts` · `tests/scripts/profile-deploy-hardening.test.sh` · `tests/profile-checks.sh` · `ai-agents/knowledge-base/name-change-digest-runbook.md` · `ai-agents/knowledge-base/alert-delivery-runbook.md` · this folder's `worklog.md`
Status: in-review

Round 1 · reviewers: fkit-reviewer (own pass) + Codex adversarial pass (`codex exec --sandbox read-only`), **both ran — coverage is complete, no degradation**.

**Verdict: ⚠️ Changes requested — 9 findings, none blocking. The feature is correct; every finding is a guard, a diagnostic text, or a record.**

## Reviewer findings

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| R1 | 1     | medium | `setup-profile.sh` (file mode) | The file's tracked mode changed `100755 → 100644` (`git diff --summary`: `mode change 100755 => 100644 setup-profile.sh`) with no mention in the worklog. Deploy still works — `build-deploy-profile.sh:506` runs a local `chmod +x` before `scp` — but that same `chmod +x` re-dirties the working tree on every deploy, `./setup-profile.sh` run directly now fails, and no harness asserts the bit (`profile-checks.sh` kept `755`). Ownership is ambiguous with the also-uncommitted `0282`, but `0283` is the live task editing this file. |
| R2 | 1     | low-med | `profile-checks.sh:501` | Check 12's missing-marker FAIL text names only Telegram-side causes (`FEEDBACK_TELEGRAM_TOKEN / FEEDBACK_TELEGRAM_CHAT_ID / TELEGRAM_PROXY_URL`) plus the rolled-back-image case. Two other real causes are not named and would send the operator hunting a delivery fault that does not exist: (a) the message **was** delivered but the marker write threw — `NameChangeDigest.ts:198-201` logs and `:167` still returns `"sent"`, so the CLI exits 0 (deliberate, but it produces exactly this page); (b) the DB query threw, so **no message was sent at all** and the "Telegram heartbeat" is really reporting a Postgres fault. The runbook's *When it stops arriving* list has the same two gaps. |
| R3 | 1     | low    | `tests/scripts/profile-deploy-hardening.test.sh:1714,1726` | The owner's chosen hour is not pinned by anything. The anchor accepts `^0 [0-9]+ ...` and the follow-up only requires the hour to be numeric and dom/mon/dow to be `*`, so a silent drift from `0 4` to any other hour still passes. Asymmetric with the other two owner rulings, both of which **are** mechanically pinned (the zero-count grep at `:1770`, the negative-age guard at the end of the block). Raised by both reviewers. |
| R4 | 1     | low    | `setup-profile.sh:1743` · `profile-checks.sh:498-502` | Deploy-window false page. A deploy landing between 04:00 and 08:00 UTC (07:00–11:00 MSK — a normal working morning) installs check 12 with no marker and no digest slot before that day's 08:00 checks run, so the external dead-man's switch pages once for a system that is working. Nothing in setup seeds a first marker or runs the digest once. The runbook's owner-verification step 2 ("run it once by hand") happens to prevent it, but is not stated as required at deploy time. Raised by both reviewers. |
| R5 | 1     | low    | `tests/scripts/profile-deploy-hardening.test.sh:1770` | The zero-count grep guard omits `>=` from its operator alternation (`===\|==\|!==\|!=\|<\|<=\|>`) while including `<=` and `>` — a plain oversight, not a decision, so `count >= 1` passes the guard. Other suppression shapes (`!count`, yoda `0 === count`) also pass it. The jest case *"SENDS when the count is zero"* is the real backstop and catches every one of those because it pins **behaviour**, not syntax; only an env-gated skip evades both, and that needs a new env var and so a visible diff. Worth the one-token fix for `>=` so the guard matches what the worklog and the runbook claim for it; chasing the remaining shapes is not. |
| R6 | 1     | low    | `ai-agents/knowledge-base/name-change-digest-runbook.md` (*Turning it off*) | The documented off-switch turns `npm test` red and does not say so. Commenting out the cron line makes the harness's `found 0 digest cron line(s), expected exactly 1` fire; removing check 12 as the same section advises makes `check_name_change_digest is not both defined and called` fire. Both harness blocks must be removed in the same change. |
| R7 | 1     | low    | `tests/scripts/profile-deploy-hardening.test.sh:1752-1759` | The forbidden-import guard reads only lines matching `^import ` and matches the specifier spelling exactly, so it misses `"./Server.js"`, any relative respelling, a `require()`, and — the realistic one — a **multi-line** import statement, whose `} from "./Routes";` line does not start with `import ` and is therefore never scanned. Prettier produces that form for a long import list. ⚠️ Correcting the stated stakes: the comment calls this failure "silent and fatal"; it is not silent — a CLI that imported `./Server` would hit `EADDRINUSE` inside the running container, exit non-zero, withhold the marker and be paged by check 12 within 26 h. The transitive graph is clean today (verified independently). |
| R8 | 1     | low    | `src/profile-server/NameChangeDigest.ts:144,165,191` | The marker field named `finished_at` carries the run's **start** time: `at = now()` is taken at `:144`, before the DB query and the send, and passed unchanged to the writer at `:165`/`:191`. Harmless against a 26 h threshold; it is a contract-name inaccuracy in a file whose header correctly insists the marker's shape is a contract with a shell reader. |
| R9 | 1     | low    | `worklog.md` §2 | The worklog's `setup-profile.sh` row says *"Nothing removed or rewritten"* and lists only additions. The tracked mode change in R1 is neither mentioned nor accounted for, so the record does not match the diff. |

**Also examined and found clean** (stated so the coder does not re-derive them):
- **The SQL claim holds against the real migration, not the plan's assertion.** `migrations/006_player_identity.sql:144-146` is `create unique index player_name_history_one_pending_uq on player_name_history (player_id) where moderation_status = 'pending'` — at most one pending row per player, so pending **rows** = waiting **players**. No `DISTINCT`, no `GROUP BY` is correct.
- **The HTML message cannot be rejected or malformed.** Both interpolated values are self-produced (an integer and an ISO timestamp); neither charset can contain `<`, `>` or `&`.
- **No secret reaches a log line on either path.** Failure logs only `result`/`status`/`code`, all non-free-text by construction (`TelegramNotifier.ts`); success logs a bare count. Both runbooks and the worklog carry variable **names** only. The four env names match `Server.ts:130-151` and `build-deploy-profile.sh:563-571` exactly (checked by hand — no test executes the CLI).
- **Check 12 cannot abort the checks run under `set -euo pipefail`.** `json_field` ends `|| true`, `hours_since` ends `|| true`, and `iso_to_epoch` can only return digits or empty — so `age_h` is an integer or empty, the empty case is caught first, and the arithmetic can never hit `set -u`.
- **Container→host marker visibility.** `digest/` is created 0700 root-owned by setup, the profile image declares no `USER` so the container process is root, and the bind mount is a sibling of `alerts/` — the same pattern already proven by `0284`.
- **`docker compose exec -T` under cron.** Cron's `PATH` reaches `/usr/bin/docker`; `-f <file>` makes compose resolve the project directory (and the relative `./digest` mount) from `$PROFILE_DIR`; `npm` and `ts-node` are in the image (`Dockerfile.profile` does a full `npm ci` and copies `src/`); exit codes propagate node → npm → exec → the cron log. Container down or crash-looping ⇒ non-zero, no marker, check 12 pages — the intended direction.

**Raised by the verifier, disproven — no action, do not chase:**
- **Sub-hour future clock skew reads age `0` (integer division in `hours_since`).** Real, but not a defect in either ledger: a marker at most ~1 h in the future is genuinely recent, and the dangerous case — an old marker made to look fresh — needs a skew large enough for the `-lt 0` guard to catch. It is also pre-existing in `check_alert_probe` and untouched here.
- **"A bare side-effect `import "./Server";` evades the import guard."** It does not — that line starts with `import ` and contains the exact specifier, so the guard fires. The real holes are the ones in R7.

## Coder response

Round 1, 2026-09-18, `fkit-coder` spawned by `fkit-sprint-ship-loop` under the owner's plan approval
plus four dispositions given live via `AskUserQuestion` on 2026-09-18 (D1–D4 below). Every finding
was verified against the code before acting. **All nine verified CORRECT — nothing was refuted, and
nothing was applied on the reviewer's say-so alone.** Nine fixed, zero disputed.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | defect (record + local tooling) | Per **owner D1**: `chmod 755 setup-profile.sh` (`git diff --summary` is now empty), plus **one** new harness assertion `[ -x "$P" ]`. | **Fixed** |
| R2 | CORRECT | defect (diagnostic text) | Per **owner D3**: both check-12 FAIL texts (missing **and** stale) now name all three causes — Telegram, a failed marker write, a DB fault. Runbook *When it stops arriving* gains the same three, up front. Two new `C23` assertions pin it. | **Fixed** |
| R3 | CORRECT | defect | Hour pinned to the owner's `4` as its own assertion, with a message saying only the owner changes it. The anchor stays loose so an hour drift reports *"the hour is 'N', not the owner's 4"* rather than *"found 0 digest cron lines"*. | **Fixed** |
| R4 | CORRECT | defect | Per **owner D2**: `setup-profile.sh` runs `npm run digest:name-changes` once, right after the cron file is written, seeding the marker from a **real** send. ⛔ No synthetic marker. **It warns, it does not abort** — see *D2's unsettled question* below. Two new harness assertions. | **Fixed** |
| R5 | CORRECT | defect (narrow) | `>=` added to the alternation. Verified the claim first: the trailing `[01]` means each operator must be listed (`<` does **not** also match `<= 1`), so `>=` was a genuine hole — probed, and the old regex misses `count >= 1`. **Stopped there**, as the reviewer asked. | **Fixed** |
| R6 | CORRECT | docs | *Turning it off* is now an explicit **four-part** change naming both harness failure strings verbatim, the deploy-time invocation, and the `tests/profile-checks.sh` count bumps. | **Fixed** |
| R7 | CORRECT | frontier — widened, cheaply | The guard now scans the **whole comment-stripped file** for a quoted specifier `"./X"` with an optional `.js`/`.ts`, instead of `^import ` lines. Probed: `./Server.js`, a multi-line `} from "./Routes";`, and `require("./Telemetry")` are all caught, and all three evaded the old form. **The reviewer's correction to the stakes is carried**: the "silent and fatal" wording is gone from both `sendNameChangeDigest.ts` and the harness comment — a port clash is `EADDRINUSE`, non-zero, marker withheld, paged within 26 h. | **Fixed** |
| R8 | CORRECT | cosmetic (contract name) | **Captured after the send** rather than renamed. `startedAt` still stamps the message (which is what the message means); the marker reads the clock again after `send` resolves. Reason for the choice: renaming would drag `profile-checks.sh` and its harness along for a field whose name can simply be made true in one file. New jest case with an advancing clock pins the ordering — the frozen `now` every other case uses cannot tell the two apart. | **Fixed** |
| R9 | CORRECT | record | `worklog.md` §2 corrected: the mode change is named, its ownership ruling recorded, and the `chmod +x` that masked it. New §4a logs every fix applied without asking. | **Fixed** |

### D2's one unsettled question — answered by the script's own convention, not by a fresh judgement

The disposition flagged it: `setup-profile.sh` runs under `set -e`, so should a failed deploy-time
digest abort the deploy? **The script already has a convention and it settles this**, so no
`NEEDS-DECISION` was raised:

- It **fails closed** for faults nothing else would ever notice — a bad migration (`:1253`, *"a
  half-migrated schema never goes live"*), an unproven off-box backup pipeline (*"must fail the
  deploy CLOSED here, not silently wait for the first 02:30 cron"*), a silent off-box downgrade.
- It **warns and continues** where another mechanism already observes the failure. The `checks.sh`
  install says so in as many words: *"The daily cron line is still written; with no checks.sh it logs
  an error each run and never pings, **which the dead-man's switch reports**."*

A failed digest is squarely the second kind: it withholds the marker, so check 12 pages within 26 h
and **that page is true**. Aborting a deploy on a third-party Telegram outage would be strictly
new, stricter behaviour than anything else in the file. Recorded in the script's comment, the
runbook, and `worklog.md` §4a.

### Verified independently, not taken on the reviewer's word

- **R1's mode change is working-tree only.** `git ls-files -s` still read `100755`; only the
  filesystem bit was 644. That is *why* the new assertion reads `[ -x ]` and not the git index mode —
  an index check would have missed this exact drift, and `[ -x ]` needs neither git nor a work tree.
- **R5's regex claim.** Probed directly: the pre-fix alternation does **not** match `count >= 1`.
- **R7's holes.** All three shapes reproduced against a scratchpad copy and confirmed to evade the
  old `^import `-anchored guard.

### Non-vacuity — six new/widened guards, each mutation-probed against a scratchpad copy

⛔ Never against the repo file. Every mutation was asserted to have **landed** before the result was
believed, and every restore was verified green afterwards.

| Mutation (scratchpad only) | Caught by |
|---|---|
| `chmod 644 setup-profile.sh` | `setup-profile.sh has lost its executable bit` |
| cron hour `0 4` → `0 9` | `the digest hour is '9', not the owner's 4` |
| `import "./Server.js";` appended to the CLI | `digest entry: references ./Server` |
| multi-line `} from "./Routes";` appended | `digest entry: references ./Routes` |
| `require("./Telemetry")` appended | `digest entry: references ./Telemetry` |
| `const skipWhenEmpty = count >= 1;` | `a branch compares the pending count against 0/1` |
| deploy-time digest invocation removed | `no deploy-time 'npm run digest:name-changes'` |
| `NOT aborted` → `aborted` in that block | `the deploy-time digest does not say it is non-fatal` |
| both check-12 FAIL texts reverted to Telegram-only | both new `C23` assertions (2 failures) |
| marker stamped from `startedAt` again | jest `stamps finished_at AFTER the send` |

## Accepted residuals (shared, do-not-re-litigate)

- **Zero-count still sends** — What: the digest sends unconditionally, including a count of 0 · Why (structural): owner ruling 2026-09-17; the daily arrival is the Telegram-delivery heartbeat, so the message's absence is the signal, and a skip-when-empty branch would delete a liveness check · Re-raise only if: the owner reverses the ruling.
- **The hour is `0 4 * * *` UTC (07:00 MSK)** — What: the digest's schedule · Why (structural): owner ruling at the plan gate, overriding the plan body's `09:00 UTC`; Moscow is UTC+3 year-round · Re-raise only if: a collision with another cron job appears at `0 4`, which was checked and does not exist today.
- **Step 8 is in scope** — What: marker + `digest/` bind mount + check 12 + the mandatory negative-age guard · Why (structural): owner ruling at the plan gate; the negative-age guard is the `0284` review R5 lesson applied before it could be re-learned · Re-raise only if: never — removing the guard is a regression, not a simplification.
- **The marker is written only on a successful send, and a marker-write failure still reports success** — **ACCEPTED by the owner, 2026-09-18 (disposition D3)**, conditional on R2 being fixed, which it now is: both check-12 FAIL texts and the runbook name the marker-write cause explicitly. What: `runNameChangeDigest` returns `"sent"` when the message arrived but the marker could not be written · Why (structural): the message DID arrive, and reporting failure would be a lie; the aged marker pages anyway, in the safe direction · Re-raise only if: never, unless the owner reverses it.
- **`writeMarkerFileAtomically` is duplicated from `AlertRelay.ts:129-134`, and `sendNameChangeDigest.ts` is executed by no test** — **ACCEPTED by the owner, 2026-09-18 (disposition D4)**, on the reviewer's own reasoning: a broken writer costs a false page, never a lost message, because the message is sent before the marker is written. ⛔ **Do not extract a shared writer** — that would edit `AlertRelay.ts`, which this task deliberately does not touch. Why (structural): importing `AlertRelay` would pull express, express-rate-limit and zod into a one-shot CLI on a low-RAM box with an OOM history · Re-raise only if: a third caller appears.
- **The import guard scans specifiers, not a resolved module graph** (R7 residual) — **accepted by the coder with the reviewer's own corrected stakes.** What: the widened guard catches `./Server.js`, multi-line imports and `require()`, but it is still text, not resolution: a transitive import (`./Db` one day importing `./Routes`) evades it · Why (structural): resolving the real graph needs a build step in a shell harness, and the failure is **not silent** — a port clash is `EADDRINUSE`, exits non-zero, withholds the marker and pages within 26 h · Re-raise only if: the CLI's direct import surface grows beyond the four modules it has.

### Proposed residuals — NOT yet accepted, awaiting the owner's disposition

_(none outstanding — both of the reviewer's proposals were ruled on by the owner on 2026-09-18 and
moved into the accepted list above. Original text kept below for the record.)_

⚠️ These two were the reviewer's recommendation only. **They are now settled; the wording is kept so
the round-1 record reads as it was written.**

- **(proposed) The marker is written only on a successful send, and a marker-write failure still reports success** — What: `runNameChangeDigest` returns `"sent"` when the message arrived but the marker could not be written · Why (structural): the message DID arrive, and reporting failure would be a lie; the aged marker pages anyway, in the safe direction · Re-raise only if: the FAIL text is fixed to name this cause (R2) and the page is still judged misleading.
- **(proposed) `writeMarkerFileAtomically` is duplicated from `AlertRelay.ts:129-134` rather than imported** — What: ~6 lines copied · Why (structural): importing `AlertRelay` would pull express, express-rate-limit and zod into a one-shot CLI that must stay small on a low-RAM box with an OOM history; the rejected alternative is a shared module for six lines · Re-raise only if: a third caller appears. Consequence: that writer is executed by no test here (the sibling copy is in production), and `sendNameChangeDigest.ts` as a whole is executed by no test — a broken writer costs a false page, never a lost message.
