# Worklog — `0285` detect an already-disabled monitoring notification channel

Build worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driven by `fkit-lead`) on 2026-09-28
under the declared-approval marker. Implemented the approved `plan.md`
(`git hash-object` = `5ee5e31bc3e4a3dbd6efd3aa55ddc80b06c62ce2`, `wc -c` = `19931`, both matching the
pasted plan before any edit). ⛔ `plan.md` untouched. ⛔ No status changed, no task file moved.
Nothing committed, nothing pushed. No SSH, no deploy, no box access.

---

## Owner rulings — verbatim, as relayed by `fkit-lead`

Given 2026-09-28, live via `AskUserQuestion` in the `fkit lead` session:

- **Q1 (how the state travels):** "Add a line to hourly hello (Recommended)" — Same message, note and schedule, one extra piece of info. Changes 0284's script slightly. Safe in any deploy order. (Asked twice; the owner first chose "Explain more, then ask again".)
- **Q2 (unreadable state):** "Alert every run; catch upgrades in tests (Recommended)" — A real outage alerts you. Upgrading the pinned Uptrace version turns the tests red until the query is re-checked, so an upgrade can't cause nightly alerts.
- **Q3 (drill method):** "One SQL update, re-enable in UI (Recommended)" — Exactly what Uptrace's own 'disable' does; takes minutes.
- **Q4 (who runs step 0 on the box):** "I run them (Recommended)" — The build worker gives you the queries; they never print the secret or URL. No permission change.
- **Q5 (which channel):** "The one the probe sends to (Recommended)" — The channel whose address equals the probe's address. No new setting; also catches the probe and the real channel drifting apart.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28. Build proceeds only after the owner's step-0 box check confirms the schema; if it differs, stop and re-scope with the producer.

---

## Step 0 — schema check on the box (owner-run, read-only, 2026-09-28)

The owner ran the plan's step-0 read-only queries on the monitoring box and pasted the output to the
lead, who relayed it. **Names and counts only** (brief verification step 1's evidence):

| Query | Result |
| --- | --- |
| `\d notif_channels` | columns `id` bigint, `project_id` bigint, `name` varchar(500), `status` `notif_channel_state_enum` NOT NULL DEFAULT `'delivering'`, `condition` varchar(1000), `type` `notif_channel_type_enum` NOT NULL, `params` jsonb. PK on `id`, FK to `projects`, referenced by `monitor_channels.channel_id` |
| `SELECT enum_range(NULL::notif_channel_state_enum)` | `{draft,delivering,paused,disabled}` |
| `SELECT type, status, count(*) … GROUP BY 1,2` | `webhook \| delivering \| 1` |
| `params` key names (keys only) | `webhook \| {payload,url}` |
| running image | `uptrace/uptrace` tag `2.0.2`, `linux/amd64` |

**Result: MATCHES** the plan's binary evidence (from the local arm64 copy of the same tag). The build
proceeded. The plan's escape hatch (stop and re-scope) was not needed.

---

## Change surface

| File | What changed |
| --- | --- |
| `setup-telemetry.sh` (probe heredoc only) | header comment incl. the `Schema verified against: uptrace/uptrace:2.0.2` pin line; `read_channel_state()` (one fixed `SELECT status, coalesce(params->>'url','') FROM notif_channels` under `PGOPTIONS='-c default_transaction_read_only=on'`, `timeout 20`, stderr and stdin closed; URL compared in bash; worst-state-wins; `missing` / `unreadable`); `"channel_state"` added to the existing POST body; the three outcome log lines end `channel state: <state>`. Exit codes unchanged. |
| `src/profile-server/AlertRelay.ts` | `payload.channel_state: z.unknown().optional()`; exported `sanitizeChannelState()` + `INVALID_CHANNEL_STATE`; probe `Decision` gains `channelState?`; read only on the probe branch (after the secret check); `writeProbeMarker` adds the key only when present; header comments |
| `profile-checks.sh` | header bullet; check 11 comment points at check 13; new `check_alert_channel_state()` (check 13, `alert-channel-state`) added to the call list |
| `tests/profile-server/AlertRoutes.test.ts` | nested `describe("channel_state (0285)")` in the 0284 probe describe — 20 tests |
| `tests/profile-checks.sh` | `write_probe_marker` gains a state arg (default `delivering`, `ABSENT` = 0284 shape); case **C24** (22 assertions); counts re-baselined; C22's two stale/future counts and its "body names ONLY" assertion updated |
| `tests/scripts/profile-deploy-hardening.test.sh` | stub curl saves the stdin body; stub `timeout` + `docker`; 13 behavioural assertions; 9 structural/pin/drift assertions |
| `ai-agents/knowledge-base/alert-delivery-runbook.md` | the "cannot see an already-disabled channel" bullet replaced; component-table row; new *The channel's own state — check 13* section (schema facts, result table, deploy order, what it does NOT prove); new *When `alert-channel-state` fails* steps |

No new `.sh` harness ⇒ `tests/scripts/ShellHarnesses.test.ts` unchanged. No new app env var.

### Count re-baseline (plan step 5 🚩 list — all done)

- `12 ok, 0 failed` → `13 ok, 0 failed`: C1 (+ its heading and label), C13.
- `11 ok, 1 failed` → `12 ok, 1 failed`: C9, C19, C23 ×2.
- `11 ok, 2 failed` → `12 ok, 2 failed`: C18.
- **C22 mechanical changes:** the stale (27h) and future (+50h) cases `11 ok, 1 failed` → `11 ok, 2 failed`
  (check 13 now also FAILs with state UNKNOWN on the same marker). The "body names ONLY the probe check"
  assertion is widened **and tightened**: the set of check names in the body must be exactly
  `{alert-channel-state, alert-path-probe}`. The junk-threshold case has no count assertion; re-checked,
  it still passes (check 13 uses the same default-3h threshold and fails too).

---

## Evidence

### C24 seen to FAIL before the fix (brief verification step 4)

Run with C24 + the new `write_probe_marker` in place, against the **unmodified** `profile-checks.sh`
(`git diff --quiet profile-checks.sh` confirmed first):

```
=== C24: the notification channel's OWN state (task 0285, check 13) — the hole check 11 cannot see ===
  ❌ delivering not OK (rc=0): … RESULT: 12 ok, 0 failed
  ❌ disabled channel not reported: rc=0
  ❌ paused channel not reported: rc=0
  ❌ draft channel not reported: rc=0
  ❌ missing channel not reported: rc=0
  ❌ unreadable state not reported: rc=0
  ❌ invalid state not reported: rc=0
  ❌ unknown state not reported: rc=0
  ❌ absent key not reported: rc=0
  ✅ …while check 11 stays green on the same (0284-shaped) marker
  ❌ stale delivering read as OK …   ❌ future marker read as OK …   ❌ missing marker read as OK …
==== RESULT: 137 passed, 21 failed ====
```

The load-bearing line: **a marker saying `disabled` exited 0 with a success ping** — the exact hole.
After the fix: `==== RESULT: 158 passed, 0 failed ====`.

### Mutation checks (each guard seen able to fail; every file restored and `cmp`-verified after)

| Mutation | Caught by |
| --- | --- |
| `sanitizeChannelState` bypassed in the relay | 9 AlertRoutes `records … as invalid` tests |
| compose tag `2.0.2` → `2.0.3` | hardening `PIN:` assertion |
| query → `UPDATE notif_channels …` | "not a single plain SELECT" |
| `PGOPTIONS` removed | both the structural and the behavioural read-only assertions |
| `$ALERT_PROBE_URL` put on the psql argv | behavioural argv guard + structural argv guard |
| `$url` appended to a `say` line | "a say line logs the secret, the URL or raw psql output" (+ behavioural cases, since `$url` is unset outside the function) |
| `params->>'payload'` selected | "selects the channel's payload" |
| key renamed in AlertRelay.ts / in profile-checks.sh | `DRIFT: 'channel_state'` |
| worst-wins ranking broken | the "two matching channels" behavioural case |

One mutation was first mis-applied to an unrelated `-d uptrace \` line outside the probe (`:821`) and
reported no failure; re-applied to the probe's psql line, it was caught. Recorded so the first result
is not misread as a gap.

### Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | **1 error, pre-existing and not this task's:** parsing error on the untracked `0325` helper `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` (not in the TS project). Not fixed, by instruction. `npx eslint` on the two touched TS files: clean. |
| Prettier on touched TS files | clean. The runbook is Prettier-non-conformant **at HEAD already**; left as is. |
| `npx jest tests/profile-server/AlertRoutes.test.ts` | 94 passed (20 new) |
| `bash tests/profile-checks.sh` | `==== RESULT: 158 passed, 0 failed ====` |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` |
| `npm run check:config-parity` | `REQUIRED 0` on game / profile / client; report-only; no new app env var |
| `npm test`, run 1 | **1 failed / 2780 passed**: `TenureGrantRoutes.test.ts` › CORS › OPTIONS preflight, `Exceeded timeout of 5000 ms`. A supertest suite this task did not touch. `0197` ruled out first: no `SIGSEGV` in the log, no `node-*.ips` crash report. Matches the known supertest-flake signature ⇒ **re-ran**. |
| `npm test`, run 2 (the re-run) | **163/163 suites, 2781/2781 tests passed**, exit 0. `ShellHarnesses.test.ts` PASS. |

---

## Decision log — what was applied without asking, and why it qualified

Build worker under a standing approval (ADR-032 Decision 3). Every item is inside the approved plan's
intent; none changes scope.

1. **`INVALID_CHANNEL_STATE` / `sanitizeChannelState` exported** (plan named the function, not its
   export). Why: the unit tests and a future reader can reference the one definition. Mechanical,
   in-plan.
2. **Empty-string `channel_state` ⇒ `invalid`.** The plan's pattern `^[a-z][a-z-]{0,31}$` already
   excludes it; stated here so nobody thinks it was an oversight.
3. **Status values the probe itself sees are pattern-checked too** (a status that is not a lowercase
   word ⇒ `unreadable`). Plan: "prints something unexpected ⇒ unreadable". In-plan.
4. **`</dev/null` on the `docker compose exec`** — so the exec can never consume cron's stdin (the same
   rule the digest cron line follows). Obvious winner, localized.
5. **URL match is exact** (a trailing slash reports `missing`). The plan says "equals"; the runbook
   and a harness case now say so explicitly. In-plan.
6. **The log line carries `channel state: <state>` on all three outcomes** (accepted, curl failed,
   dropped), not only the success line. The plan says "the one-line log gains" it; putting it on every
   outcome line is the only reading that makes it visible on a failed hand-run. Obvious winner.
7. **C22 "body names ONLY" was tightened, not just widened** — an exact set of two check names rather
   than "contains the probe check and not daily-backup". Stronger than the plan asked; still the same
   assertion's intent.
8. **Check 13 runs last in the call list** (after check 12). Numbering follows order.
9. **Runbook wording on deploy order** states the plan's "profile first, then monitoring box, then run
   the probe by hand" sequence and that check 13 FAILs until the first stateful probe lands.
10. **Runbook left Prettier-non-conformant as it already was at HEAD** — not reformatted (unrelated
    churn).

Review fixes applied unattended: **none** (this is the build step; no review has run yet).

---

## NOT verified here — owner steps

- **The real run on the box** (brief verification step 2): not done — no box access by instruction.
- **The drill** (brief verification step 3, Q3): put the channel into a genuine `disabled` state with
  one SQL update, run the probe by hand, force `checks.sh`, see the dead-man's switch page with
  `alert-channel-state … DISABLED`, re-enable in the UI, re-run, see OK, confirm alerting is live.
- **"No write" on the real stack** (brief verification step 6): the `n_tup_ins/n_tup_upd/n_tup_del`
  before/after read from `pg_stat_user_tables` for `notif_channels`. Off-box, only the read-only
  setting and the harness assertions stand.
- `docker compose exec -e PGOPTIONS=…` and `timeout` behaviour are stubbed off-box; their real
  behaviour on the box is first exercised by the hand-run in deploy step 3.

---

## Review round 1 — process-review worker (fkit-sprint-ship-loop, standing approval, 2026-09-28)

Ledger `review.md` round 1: R1 and R2, both low, both verified `CORRECT`, both fixed. Ledger set to
`closed-out`. `plan.md` blob re-checked before starting: `5ee5e31bc3e4a3dbd6efd3aa55ddc80b06c62ce2`
(matches the approved plan).

### Decision log — what was applied without asking, and why it qualified

1. **R1 — `timeout 20` → `timeout -k 5 20`.** Answers R1(b), first half: plain `timeout` sends one
   SIGTERM and waits. Qualified: verified `CORRECT`; one token on one line; inside the plan's step 1
   ("bounded… the POST always happens") and the plan's edge case 1 (a wedged Postgres must not stall
   the POST). Mechanical.
2. **R1 — `-c statement_timeout=15s` added to the same `PGOPTIONS`** (`default_transaction_read_only=on`
   kept, first). Answers R1(b), second half: killing the client never kills the in-container `psql`.
   15 s is deliberately under the client's 20 s so Postgres cancels first. Qualified: verified
   `CORRECT`; localized; same plan intent as item 1.
3. **R1 — `-e PGCONNECT_TIMEOUT=10` added (obvious-winner call, not named in the finding's direction).**
   Why: `statement_timeout` only bounds a query that has started; a Postgres wedged before it accepts
   the connection would still leave a `psql` waiting inside the container — the exact orphan R1
   describes. One `-e` line, same intent, no scope change. Guarded structurally and mutation-proven.
4. **R1 — harness guards.** `timeout` stub records argv and can exit 124/137; behavioural guard that
   every state read ran under `timeout -k <grace> <n> docker compose exec`; behavioural
   `statement_timeout` on the call that ran; structural guards on the wrap, on `statement_timeout < n`
   in the same `PGOPTIONS`, and on `PGCONNECT_TIMEOUT`. The existing read-only guard's literal was
   widened from `…=on'` to `…=on[ ']` so it still matches with the added option (it still requires
   `default_transaction_read_only=on` to be the first option). In-plan (step 5 structure guards).
5. **R2 — cause class on the log line.** `read_channel_state` echoes `unreadable (timed out)` (rc 124),
   `unreadable (killed, rc=137)`, `unreadable (exec or psql failed, rc=N)`, or
   `unreadable (unexpected output)`. The caller keeps the whole line in `channel_state_log` for the three
   `say` lines and POSTs `${channel_state_log%% *}` — the bare state word, which is all the relay's
   `^[a-z][a-z-]{0,31}$` pattern accepts (so the relay, check 13 and the marker are unchanged).
   Nothing read from psql is ever echoed: only fixed words, a regex-validated status (via `worst`) and
   an integer exit code. Qualified: verified `CORRECT`; localized to the probe function; inside the
   plan's "the one-line log gains `channel state: <state>` so a hand-run shows it".
6. **R2 — check 13's `unreadable` FAIL text and runbook step 5** now name each cause class and what it
   points to. The runbook also says the log holds the latest hourly run only. Same-intent doc alignment.
7. **R2 — harness guards.** Behavioural cases for rc 1, rc 2, rc 124, rc 137 and the two
   unexpected-output shapes, each asserting both the bare POST value and the exact log tail; a leak case
   (the log carries neither the URL nor the raw row); an echo guard over `read_channel_state` (no
   `$line`/`$rows`/`$url`/`$status`/`ALERT_PROBE_*`); and a probe ↔ check-13 cause-class drift guard.
   `tests/profile-checks.sh` C24 asserts the FAIL text names all four classes (159 checks now, was 158).
   The drift guard was added beyond the lead's list: without it, C24's "spelled exactly as the probe
   writes it" would be an unenforced claim. Obvious winner, same intent.

### Mutation checks (setup-telemetry.sh / profile-checks.sh copied to scratch, mutated in place, restored and `cmp`-verified after each)

| Mutation | Caught by (failure count) |
| --- | --- |
| `timeout -k 5 20` deleted | 124/137 behavioural cases, behavioural + structural wrap guards, statement-vs-client guard (5) |
| `-k 5` removed | behavioural + structural wrap guards, statement-vs-client guard (3) |
| `statement_timeout` removed | behavioural + structural `statement_timeout` guards (2) |
| `statement_timeout=25s` (above the client's 20 s) | structural `statement_timeout < n` guard (1) |
| `PGCONNECT_TIMEOUT` line removed | structural `PGCONNECT_TIMEOUT` guard (1) |
| rc cause dropped (`echo "unreadable"`) | rc 1 / rc 2 cases, dropped-call case (3) |
| raw `$line` echoed on the no-tab path | no-tab case, echo guard (2) |
| unvalidated `$status` echoed | bad-status case, leak case, echo guard (3) |
| rc 124 mislabelled | the timed-out case (1) |
| POST carries the whole log text | every unreadable case (6) |
| a cause class renamed in check 13's text | drift guard (hardening) + C24 assertion (profile-checks) |

One mutation attempt (`statement_timeout=15s` → `25s`) first failed to APPLY — the string also
appears in the new comment — and was re-applied to the `PGOPTIONS` string; it was caught. Recorded so
the first attempt is not misread as a gap.

### Gates

| Gate | Result |
| --- | --- |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` |
| `bash tests/profile-checks.sh` | `==== RESULT: 159 passed, 0 failed ====` |
| `npx jest tests/profile-server/AlertRoutes.test.ts` | 94/94 passed (unchanged — no TS touched this round) |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | first run green, no re-run needed: 164/164 suites, 2817/2817 tests. The tree also holds other tasks' uncommitted work (including the parallel `0321` build); the run covers it as it stood. |
| `npm run lint` | **not run this round** — no TS/JS file was touched (shell, markdown only). Last run (build step) was red only on the untracked `0325` helper. |

### NOT verified — off-box stubs only

- `docker compose`'s handling of SIGTERM, and GNU `timeout -k` returning 137 after SIGKILL, are
  stubbed. `PGOPTIONS … -c statement_timeout=15s` and `PGCONNECT_TIMEOUT` passed through
  `docker compose exec -e` are not exercised against the real stack. First real exercise: deploy
  step 3's hand-run (the log should end `channel state: delivering`).

## Review round 2 — process-review worker (fkit-sprint-ship-loop, standing approval, 2026-09-28)

Finding **R3** (low): the `unreadable` cause classes were interpreted against the wrong model of psql.
Verified before acting: re-measured on the local throwaway test Postgres (psql 16, stderr discarded,
`ON_ERROR_STOP`): missing table → rc 1, missing column → rc 1, `statement_timeout` cancel → rc 1, all
with empty stdout; failed connect → rc 2; missing database → rc 2; a normal row → rc 0. The reviewer's
`compose exec` on a missing service → rc 1 was taken from the ledger, not re-measured. The old check-13
text mapped rc=N to "container down / refused", `unexpected output` to "the schema changed", and
`timed out` to "Postgres wedged" — so the likeliest schema change (a missing table) sent the operator
to check a container that is up.

### Decision log — what was applied without asking, and why it qualified

1. **R3 — check 13's `unreadable` FAIL text re-mapped** (`profile-checks.sh`, the `unreadable)` arm):
   rc=1 = the query failed (schema changed, server-side `statement_timeout`, or the service is not
   running); rc=2 = psql cannot connect (incl. the connect timeout); `timed out` / `killed` = the docker
   client itself hung (rc=137 can also be the OOM killer); `unexpected output` = rc 0 with wrong-shaped
   rows. Qualified: verified-`CORRECT`, text-only, localized, inside plan step 3 (the check-13 FAIL
   text) — the direction the finding and the spawn prompt name.
2. **R3 — runbook step 5 rewritten to the same mapping** (`alert-delivery-runbook.md` § "When
   `alert-channel-state` fails", step 5), adding that the log cannot tell rc 1's three causes apart and
   the order to check them. Qualified: same as 1, plan step 6.
3. **R3 — probe header comment** (`setup-telemetry.sh`, above `read_channel_state`) gains what each
   class means. **The probe's logged wording and code are unchanged** — `exec or psql failed, rc=N` is
   accurate (rc 1 can be a docker-side failure, so "query failed" would be wrong there); the POST still
   carries the bare word. Qualified: comment-only, in plan step 1.
4. **R3 — harness re-model** (`tests/scripts/profile-deploy-hardening.test.sh`, probe section 11): the
   schema-change case is now rc 1 + empty stdout (`STUB_DOCKER_RC=1`, no `psql.out`), and the rc 2 case
   is labelled as a connect failure. The old `ERROR: relation … does not exist` on stdout with rc 0 —
   which real psql never produces — is replaced by `disabled` with no tab, rc 0, which is the only way
   `unexpected output` is reached. Drift guard (section 12) now also requires check 13 to name
   `'exec or psql failed, rc=1'` and `'…rc=2'` separately. `tests/profile-checks.sh` C24 now asserts
   both rc spellings and that rc=1 names the schema change and `statement_timeout`, rc=2 names the
   connect, and `timed out`/`killed` name the docker client. Qualified: test-only, mechanical, in plan
   step 5.
5. **Not done, by instruction:** no stderr pattern matching. It would split rc 1's three causes, but it
   means reading psql's own error text on a path that must never log it; not judged trivially safe, and
   not needed for the finding — so not proposed.

No obvious-winner call this round beyond the above; no fix outside the approved plan.

### Evidence

- **Seen red before the source fix:** with only the tests changed, `tests/profile-checks.sh` →
  `RESULT: 158 passed, 2 failed` (the rc=1/rc=2 spelling and the R3 mapping assertions), and the
  hardening harness → `DRIFT: … [check 13: rc=1] [check 13: rc=2]`, `SOME FAILED`.

### Gates

| Gate | Result |
| --- | --- |
| `bash tests/profile-checks.sh` | `==== RESULT: 160 passed, 0 failed ====` |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | `ALL PASS` |
| `bash -n setup-telemetry.sh profile-checks.sh` | ok |
| `npm test` | first run green, no re-run: 164/164 suites, 2823/2823 tests. The tree also holds other tasks' uncommitted work (incl. the parallel `0321` build); the run covers it as it stood. |
| `npm run lint` / `tsc` | not run — no TS/JS touched this round (shell, markdown only). |

### NOT verified

- The mapping is measured on psql 16 against the local test Postgres, not on the monitoring box's
  `postgres:17-alpine`; psql's exit-code contract is the same across these versions, but the box was
  not touched (no SSH).
