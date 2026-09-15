# Worklog — task 0203, run 1 (R12, R1 + R10, R15, R18, R16)

Build worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (fkit-lead, Sprint 4), 2026-09-14.
Worked from `plan.md` (blob `9d39af89641b7964e2e196ac6d0d4e1444acb5c8`, re-hashed at start; it matched).
Owner approved the plan via `AskUserQuestion` in the lead session. This worker did not see that approval
itself: it is trusted from the spawn prompt.

## Change surface

- `scripts/check-config-parity.mjs`
- `scripts/config-parity-allowlist.json` (R1 only: new class `server-only`, 15 client entries, `_comment` class list)
- `tests/scripts/ConfigParity.test.ts`

No application code, no deploy script, no shell harness. `--enforce` is still wired nowhere
(`deploy.sh:61`, `build-deploy-profile.sh:73`, `package.json:34` all pass `--report-only`).

## Step 0 baseline, and what changed in real-tree output

Captured `--pipeline=all --report-only` (text and `--json`) before any edit. Final comparison:

- Text: the client section lost its `CAVEAT` line and went from `ALLOWED 0` to `ALLOWED 15`. Nothing
  else changed.
- JSON: everything except `pipelines.client.allowed` is identical to the baseline. That includes game,
  profile, `parseFailures`, `dynamicReads`, `skips`, `inertAllowlist` and `requiredTotal`.
- Game and profile sections, run on their own, are byte-identical to HEAD.
- Read set (name, file:line, pipelines) with the tokenizer vs a forced raw scan over the real `src/`:
  identical, 55 rows. Tokenizer failures across all of `src/`: 0.
- DefinePlugin keys, block parser vs the old raw regex on the real `webpack.config.js`: the same 7 keys.

## R1: how the 15 allowlist claims were verified

- I grepped every accessor outside `src/core/configuration/`. I also checked calls inside
  configuration: `publicHost`→`jwtAudience`, `publicProtocol`→`jwtIssuer`, `publicPort`→`publicProtocol`,
  `apiBaseUrl`→`jwtIssuer`. None of the browser-called accessors reach a server-only key.
- 12 keys are `server-only`. Their callers are only in `src/server/**`. The four `storage*` accessors have
  no caller at all outside configuration.
- 3 keys are `runtime-supplied`: `PROFILE_API_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`.
  - `/api/env` (`src/server/Master.ts`) sends the resolved values. `ConfigLoader.ts` stores them in
    `RuntimeConfig.ts`, and the accessors prefer those values.
  - The server always sends a non-empty `jwtIssuer`/`jwtAudience`, so the browser never reaches those two
    env reads.
  - `profileApiUrl` can be sent empty (no profile backend). Then the browser does reach the env read.
    All four browser callers wrap it in try/catch and treat empty or a throw as "no backend".
  - I did not check what an unsubstituted read evaluates to in the browser.
- No key turned out to be one the browser needs substituted, so no NEEDS-DECISION was raised.

## Decision log — obvious-winner calls (no fix was applied without a plan basis)

1. **R12: name extraction requires `=`.**
   - The plan's name regex `^\s*(?:export\s+)?([A-Za-z_]\w*)` would print a bare word-only line whole.
   - Such a line may be a value, and the plan says "message never prints a value".
   - So the name is taken only when `=` follows; otherwise the message gives the line number only.
   - The no-leak test has a word-only canary line. Mutating back to the plan's regex turns it red.
2. **R12: the failure lists every unconsumed line, not just the first.**
   - Plan test 3 says "naming each".
   - The substring `indents 'X='` is kept, so the R9 tests are unchanged.
3. **R1 test 3 overrides only the webpack config.** It runs against the real tree with
   `--webpack-config=<edited copy>`, not a symlinked `src` plus copied inputs. The inputs are the same,
   with less setup.
4. **R10 test is symmetric.** It also asserts that the profile finding does not cite the `server/` file.
5. **R15 division test uses a different shape.**
   - Used `a / 2; const k = "/";`, not the plan's `a / 2 / b`.
   - Under an "every `/` is a regex" mutation, the plan's shape would not go red. The new shape does.
   - Added that mutation to the table.
6. **R15: literal-index spans must not contain `${`** (the plan's "no `${`"). Added a test that a bracket
   read written inside a string is not counted.
7. **R18 fails loud where the plan was silent.** Each of these is a PARSE-FAILURE containing "cannot
   enumerate", in line with "every parser fails LOUD":
   - a non-object DefinePlugin argument
   - an object literal that is never closed
   - a masking failure on the webpack file. There is no raw fallback here, because the plan removes
     `DEFINE_PLUGIN_KEY`.
   - `parseDefinePlugin` now returns `failures[]`, not a single `failure`.
8. **R1 reason for `PROFILE_API_URL`.** It states that the fallback IS reached when the server sends an
   empty URL, and how callers degrade. This is more exact than the plan's "not verified".
9. **Formatting.** Ran `prettier --write` on the two touched source/test files. Formatting only.

## Mutation table (each: apply, run, confirm red, restore via file copy + `cmp`)

| Mutation | Went red |
|---|---|
| R12 remove unconsumed→failure branch | R12 tests 1–5, 7; both R9 indented tests |
| R12 drop comment exemption | R12 blank/comment test |
| R12 print raw line in message | R12 no-leak test |
| R12 name extractor without `=` (plan's regex) | R12 no-leak test |
| R1 revert both-pipelines mapping | R1 synthetic test; STRIPE real-tree reproduction |
| R1 map all `core/**` to both | R1 scope test (and the synthetic test) |
| R1 re-add CAVEAT push | no-CAVEAT test |
| R1 drop guardrail wording | R1 synthetic test |
| R10 cite every pipeline's sites | R10 test |
| R15 scan raw text | prose-comment, comment-mention, block/JSDoc, string/template-text, bracket-in-string |
| R15 mask whole templates | template-substitution test; real-tree "no PARSE-FAILURE" (this variant broke nested templates and fell back to raw — it did not produce the plan's predicted false-dead `OTEL_EXPORTER_OTLP_ENDPOINT`) |
| R15 every `/` is division | regex-with-quotes test |
| R15 every `/` is regex | division test |
| R15 remove raw fallback | unterminated-comment test |
| R18 raw-text regex | all 6 R18 tests |
| R18 double quotes only | single/backtick test |
| R18 ignore `[` and `...` | computed/spread/non-literal test |
| R16 restore two-term footer | all 3 R16 tests |

## Verification

- `npm test`: 122 suites / 1298 tests passed, including the shell harnesses (unedited).
  No supertest flake occurred, so there was no re-run.
- `tests/scripts/ConfigParity.test.ts`: 76 tests.
- `npm run lint`: clean.
- `npx prettier --check` on the 3 touched files: clean.
- `bash -n deploy.sh build-deploy-profile.sh`: ok.
- Static no-leak: 0 occurrences of the un-escaped spelling in the checker.
- Ledger reproductions, re-run as tests (R1, R10, R12, R15, R16, R18). R12 and R16 were also re-run by
  hand from the CLI.

## Residuals seen, not fixed (out of this run)

- **R13 blast radius, now wider.** Any unconsumed heredoc line discards the whole heredoc. The CLI re-run
  of R12 shows a false `REQUIRED` for a correctly forwarded key next to the PARSE-FAILURE.
- **New `--enforce` failure edges:**
  - a tokenizer failure in any `src/` file
  - a computed, spread or non-literal DefinePlugin key
- **Tokenizer heuristic.** A regex right after `)` (for example `if (x) /re/`) or a division right after
  `}`/`++` can be misread. Most such shapes fail loud; not all.
- **Latent (a) from the plan.** `parseHeredocKeys` still ends a heredoc at an indented delimiter line.
- **Unverified (b) from the plan.** What an unsubstituted `core/configuration` env read does in the browser.

## Incident — recorded so it is findable

- **What happened.** While byte-comparing game/profile output against HEAD I ran `git stash` / `git stash pop`
  twice. That briefly stashed every tracked working-tree change, including five files other agents had
  modified: `ai-agents/sprints/plan-sprint-4.md` and briefs 0203, 0217, 0253, 0260.
- **What was checked afterwards.**
  - Both pops completed with no conflict.
  - All five files still show as modified.
  - `git stash list` holds only an older, unrelated entry.
- **Remaining risk.** If another agent wrote one of those files during the roughly one-second window, that
  write would have landed on the stashed-away state. No conflict was reported, so there is no sign of that.
- Untracked files were not affected.

---

# Process-review round 1 (review.md R1–R4)

Process-review worker: `fkit-coder`, spawned by `fkit-sprint-ship-loop` (fkit-lead, Sprint 4),
2026-09-14. Plan blob re-hashed at start: `9d39af89641b7964e2e196ac6d0d4e1444acb5c8`, matched. Owner
rulings on R1–R4 were relayed in the spawn prompt and recorded by the reviewer; not seen first-hand.
**No `git stash` used.** Pre-edit copies of the three touched files were taken into the scratchpad;
mutations were restored by file copy + `cmp`.

## Change surface (this round)

- `scripts/check-config-parity.mjs` — R1 tokenizer fix + corrected comments; R2 server-only check.
- `tests/scripts/ConfigParity.test.ts` — 5 new tests (R1 ×2, R2 ×3), R3 test fix, R1 comment fix.
- `scripts/config-parity-allowlist.json` — one `_comment` line (R2 is enforced). No entry changed.

## Decision log — every fix applied without per-fix owner approval

1. **R1 → postfix `++`/`--` and non-null `!` before `/` are division.**
   - Changed: `maskNonCode`'s `scanCode` gains two branches ahead of the word/punctuator branches.
     `++`/`--` consume two characters and leave `previous` unchanged. A `!` that is not followed by
     `=`, follows a value-ending token and has no whitespace right before it also leaves `previous`
     unchanged. The regex-vs-division test moved into `regexMayFollow(previous)` (same logic).
     Comments that claimed a tokenizer bug "can never lose a read silently" now say that only a
     DETECTED failure is safe, and name the undetected shape.
   - Why it qualified: verified CORRECT (CLI repro, 3 keys lost, no failure); localized to the
     tokenizer; the owner ruled "Fix now" for exactly this.
   - **Obvious-winner call inside it:** leave `previous` unchanged instead of classifying prefix vs
     postfix. After a value it stays value-ending (postfix → division); after an operator it stays
     regex-possible (prefix). One rule, no new state. Within intent: it is the ruled behaviour.
   - **Obvious-winner call inside it:** the whitespace check on `!`. Without it, `if (x) !/re/…` — a
     real regex that currently works — would become division, a regression this fix would introduce.
     With it, only the unformatted `if (x)!/re/` is affected. Guard test + mutation pin it.
2. **R2 → a `server-only` key that DefinePlugin substitutes is REQUIRED.**
   - Changed: in the client pipeline, before the reads loop, every DefinePlugin key whose phase-1
     client allowlist entry has class `server-only` is pushed to `required` with a names-only detail
     (sites cited when the client pipeline reads it). Iterates the supplied set, not the reads, so a
     substituted server-only key is caught even if no client-pipeline file reads it.
   - Why it qualified: verified CORRECT (CLI repro: `STORAGE_SECRET_KEY` substituted → `REQUIRED 0`,
     `--enforce` exit 0); localized; the owner explicitly ruled "Fix now" even though outside the
     plan's text, with the exact acceptance shape (REQUIRED/hard, exit 1 under `--enforce`).
3. **R3 → the backtick-key test uses a double-quoted key.**
   - Changed: test only, renamed; comment says a template-literal key is a SyntaxError.
   - Why it qualified: verified CORRECT (`new Function` → `SyntaxError: Unexpected template string`);
     test-only; owner said no decision needed. No checker change: the template-span branch cannot
     fire on a config webpack can load, so changing it would be behaviour churn for nothing.
4. **R4 → no change.** Owner ruled it onto 0203's pre-arming list; that brief edit is the producer's.

## Not fixed at first — the R1 reverse case (routed to the driver as NEEDS-DECISION; SUPERSEDED: fixed, see the follow-up below)

- A real regex right after the `)` of an `if`/`while`/`for` head is read as division. It is **not
  the same fix** (needs a paren stack that remembers what preceded each `(`), so per the owner's
  ruling it is recorded, not fixed.
- **It can lose a read silently**, which the reviewer's row did not say (it described only a false
  read). CLI repro: `if (x) /^https?:\/\//.test(u) && console.log(<env read of ZZ_LOST_AFTER_PAREN>);`
  → key not reported, `parseFailures: []`.
- Same family, now also: `if (x)!/re/…` with no space (read as a non-null assertion).
- Live exposure: a grep of `src/` for a regex after a control-head `)` finds 9 hits, all a regex
  right after `(` inside the condition (correct). The masked text of all 296 `src/**/*.ts` files is
  byte-identical before vs after this round.

## Mutation table (this round)

| Mutation | Went red |
|---|---|
| R1 remove the `++`/`--` branch | postfix/non-null test |
| R1 remove the non-null `!` branch | postfix/non-null test |
| R1 `!` branch without the whitespace check | logical-not guard test |
| R2 skip the server-only check | both R2 REQUIRED tests (synthetic + real-tree repro) |
| R3 DefinePlugin accepts double-quoted key spans only | single- and double-quoted keys test |

## Verification (this round)

- RED first: before the fix, 3 of the 5 new tests failed (postfix; R2 synthetic; R2 real-tree). The
  logical-not guard and R2 control were green, as guards should be.
- `npm test`: 122 suites / 1303 tests passed, shell harnesses included. No supertest flake, no re-run.
- `tests/scripts/ConfigParity.test.ts`: 81 tests.
- `npm run lint`: clean. `npx prettier --check` on the 3 touched files: clean.
- `bash -n deploy.sh build-deploy-profile.sh`: ok.
- Static no-leak: 0 un-escaped env member spellings in the checker.
- Real tree: `--pipeline=all --report-only` text and `--json` byte-identical to the output captured
  before this round's edits.
- `--enforce` wired nowhere: `deploy.sh`, `build-deploy-profile.sh`, `package.json` contain no `--enforce`.
- CLI re-runs: R1 repro now reports all 4 keys, no failure; R2 repro now `REQUIRED 1`, exit 1.

## Follow-up — owner ruled the R1 reverse case "Fix now" (option A)

Ruling relayed by the driver (owner via `AskUserQuestion`, 2026-09-14): fix a real regex right after
the `)` of an `if`/`while`/`for` head with a bracket stack, including the unspaced `if (x)!/re/` shape
if the same mechanism covers it (it does). Same worker, same approved plan blob. No `git stash`.
Pre-edit copies of the checker and test file taken into the scratchpad first.

### Decision log — fixes applied without per-fix owner approval

5. **R1 reverse case → a `)` that closes a control head starts a statement.**
   - Changed: `scanCode` keeps `parens`, one entry per open `(`, true when the token before it is
     `if`/`while`/`for`/`with` (`CONTROL_HEAD_KEYWORD`). The `)` that pops a true entry sets `previous`
     to `AFTER_CONTROL_HEAD` (`;`), so a `/` after it starts a regex. The unspaced `if (x)!/re/` is
     covered by the same mechanism: after that `)`, `regexMayFollow` is true, so the non-null branch
     does not take the `!`. Checker comment rewritten: it no longer names a known silent shape but
     still says the rules are a heuristic, not a full grammar.
   - Why it qualified: verified CORRECT (CLI repro lost the key silently); localized to the
     tokenizer; the owner explicitly ruled "Fix now" on this exact shape.
   - **Obvious-winner call inside it:** `for await (…)` keeps `for` as the token before its `(`.
     Without it, `for await` heads stay misread — same defect, same intent.
   - **Obvious-winner call inside it:** a word right after `.` is recorded as `.word`, so a member
     named like a keyword (`obj.if(a) / …`) never opens a head. Without it, that shape — which today
     reads correctly as division — would regress into a silent loss. Side effect, also correct: a `/`
     after a member like `x.return` is now division rather than a regex. Masked text of the real
     `src/` is unchanged, so no live file is affected.
   - **Test adjustment:** the logical-not guard used `if (x) !/re/` to pin the whitespace check. After
     the stack, that line no longer depends on the whitespace check, so the guard's mutation would
     have stayed green. That line moved into the new control-head test, and the guard now uses a `!`
     after a line break (where TypeScript never reads a non-null assertion). Mutation re-run: red.

### Mutation table (follow-up; all 10 re-run against the final checker)

| Mutation | Went red |
|---|---|
| no `++`/`--` branch | postfix/non-null test |
| no non-null `!` branch | postfix/non-null test |
| `!` branch without the whitespace check | logical-not guard (line-break shape) |
| skip the server-only check | both R2 REQUIRED tests |
| DefinePlugin double-quoted keys only | single- and double-quoted keys test |
| no control-head `)` (stack ignored) | control-head test |
| every `)` treated as a head | call/group guard, postfix test, STRIPE + STORAGE real-tree repros, real-tree "no PARSE-FAILURE" |
| any open head makes an inner `)` a head | call/group guard (call inside an `if` head) |
| no member-name mark | call/group guard (`obj.if(…)`) |
| no `for await` handling | control-head test |

### Verification (follow-up)

- RED first: before the stack, the control-head test failed with 5 of its 6 keys lost and
  `parseFailures` empty. The call/group guard was green before and after, as a guard should be.
- `npm test`: 122 suites / 1305 tests passed, shell harnesses included. No supertest flake, no re-run.
- `tests/scripts/ConfigParity.test.ts`: 83 tests.
- `npm run lint`: clean. `npx prettier --check` on the 3 touched files: clean.
- `bash -n deploy.sh build-deploy-profile.sh`: ok. Static no-leak: 0 un-escaped spellings in the checker.
- Real tree: `--pipeline=all --report-only` text and `--json` byte-identical to the output captured
  before this round's edits. Client DefinePlugin parse: no failure, INFO still `[WEBSOCKET_URL]`.
- Masked text of all 296 `src/**/*.ts` files: byte-identical to the pre-round checker, 0 tokenizer failures.
- `--enforce` wired nowhere: `deploy.sh`, `build-deploy-profile.sh`, `package.json` contain no `--enforce`.
- CLI re-run of the reverse-case repro: the key is now reported, `parseFailures: []`.
