# Review — 0203

Task: ai-agents/tasks/done/0203-config-parity-guard-pre-arming-gate/brief.md
File(s) under review: scripts/check-config-parity.mjs, tests/scripts/ConfigParity.test.ts (run 2, round 3; run 1 also covered scripts/config-parity-allowlist.json)
Status: closed-out
Coverage: both reviewers measured — round 3: Codex (`codex-cli 0.152.0`, exit 0) ran the checker CLI and in-memory `analyse()` edge fixtures; the reviewer ran `ConfigParity` + `ConfigValues` jest (158/158), fixture probes of the classifier, and a HEAD-vs-tree real-tree diff.

> **ID note.** Finding ids in THIS ledger (`R1`, `R2`, …) are 0203-local. Items from task 0064's ledger
> (`ai-agents/tasks/done/0064-deploy-time-config-parity-guard/review.md`) are cited as `0064-R<n>`
> (e.g. `0064-R12`), so the two id spaces never collide.

## Reviewer findings

Round 1 — 2026-09-14. Reviewers: fkit-reviewer (own pass) + Codex adversarial pass (`codex exec`,
completed normally). **Coverage: full.** Scope: 0203 run 1 (0064-R12, 0064-R1 + 0064-R10, 0064-R15,
0064-R18, 0064-R16) in the working tree only.

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| R1 | 1     | medium | scripts/check-config-parity.mjs:192, :342-353; comment :598-599; tests/scripts/ConfigParity.test.ts:1044 | **The tokenizer can LOSE a real read silently** (raised by both reviewers). `REGEX_AFTER_PUNCTUATOR` holds `+ - !`, so a `/` after postfix `++`/`--` or a TypeScript non-null `!` opens a "regex" that runs to the next `/` on the same line. Anything between is blanked, with no `PARSE-FAILURE` and no raw fallback. Reproduced via the CLI (`--src-dir` fixture, `--pipeline=game --json`): `n++ / Number(process.env.ZZ_POSTINC) / 3` and `t! / Number(process.env.ZZ_NONNULL) / 4` → neither key reported, `parseFailures` empty; a control line reports its key. The reverse direction also exists and is also silent: after `)`, a real regex is read as division, so `if (x) /process.env.NOT_REAL/.test(s)` records a false read (Codex). The false read is not a regression, since raw scanning did the same. **This contradicts the stated invariant** "a tokenizer bug can never lose a read silently" (`:598-599`, test comment `:1044`): that holds only for *detected* failures. 0 live instances: real-tree read set identical, 0 tokenizer failures. The worklog names `++`; it does not name `!`. Defect. |
| R2 | 1     | medium | scripts/check-config-parity.mjs:918-919; :74-77; allowlist `server-only` entries | **A `server-only` key substituted into the browser bundle prints fully green.** `if (supplied.has(name)) continue;` runs before the allowlist lookup, so an entry whose own reason says "Must NOT be substituted by DefinePlugin" is silently unused. Reproduced: a copy of the real `webpack.config.js` with `"process.env.STORAGE_SECRET_KEY": JSON.stringify(process.env.STORAGE_SECRET_KEY)` added → `--pipeline=client --enforce` prints `REQUIRED 0`, `enforce — no required findings`, exit 0. The only visible trace is `ALLOWED 15`→`14`. 5 of the 12 `server-only` keys are server secrets (`OTEL_AUTH_HEADER`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `API_KEY`, `ADMIN_TOKEN`). This run introduces the class and its "NEVER substitute" guarantee, but the checker has every input needed to enforce it and does not. It is outside the approved plan's 0064-R1 scope, so disposition is the owner's. Defect (unenforced invariant of a new class). |
| R3 | 1     | low    | tests/scripts/ConfigParity.test.ts:1114-1131; scripts/check-config-parity.mjs:536-537 | **The "backtick keys are substitutions" test pins invalid JavaScript.** `` { `process.env.X`: v } `` is a `SyntaxError` (verified with `new Function`): an object key cannot be a template literal. The parser counts it as supplied and the test asserts that. No real gap follows, because webpack could not load such a config. But the test claims coverage of a shape that cannot exist, and that parser branch can never fire on real code. Defect (test quality). |
| R4 | 1     | low    | scripts/check-config-parity.mjs:128 (**pre-existing, unchanged by this diff**) | **Whole-object uses of the environment that `ENV_ALIAS` misses are silent: no `DYNAMIC-READ`.** `ENV_ALIAS` needs `=` right before the object. Reproduced (Codex's shape plus one more): `const env = (process.env); env.ZZ_PAREN` and `Object.keys(process.env)` → `dynamicReads: []`. By reading the pattern, the same holds for passing the object to a function, a spread, and a `return`. So a read behind the alias is neither enumerated nor announced. 0 live instances (every env read under `src/` was listed; none has this shape). Not introduced by 0203. Not covered by 0064-R19, which is about an *announced* read being called dead. Recorded because 0203 is the pre-arming gate; the disposition is the owner's. Defect (pre-existing blind spot). |

**Owner dispositions — round 1** (owner via `AskUserQuestion` in the lead session, 2026-09-14,
relayed to the reviewer by the lead; recorded by the reviewer, not seen first-hand):

| # | Owner ruling | Meaning for the coder |
|---|---|---|
| R1 | **Fix now** | In this run: a `/` after postfix `++` / `--` / `!` is division. Correct the "never silently" comments (`:598-599`, test `:1044`). Test first. |
| R2 | **Fix now** | In this run: a `server-only` key that DefinePlugin substitutes is a hard finding. Test first. Ruled after the lead explained what the 5 keys are and checked a fresh local browser build: the real `ADMIN_TOKEN` / `API_KEY` values are absent, and the S3 keys and `OTEL_AUTH_HEADER` are blank locally. |
| R3 | No decision needed | The coder fixes the invalid-JS backtick-key test. |
| R4 | **Add to 0203's pre-arming list** as a new item | NOT fixed in this run. Not an accepted residual. The brief edit belongs to whoever owns it, not to this ledger. |

None of these is an accepted residual, so *Accepted residuals* is unchanged. Status stays `in-review`
until the coder's process-review round lands and the reviewer re-verifies R1–R3.

**Verified and NOT recorded as rows** (so the coder does not chase them):

- **All 15 client allowlist reasons: CORRECT.** Callers of every accessor were grepped across `src/`
  (outside `src/server/**` and `src/profile-server/**`, and inside it), including the internal calls in
  `src/core/configuration/DefaultConfig.ts`. The 12 `server-only` accessors have no caller under
  `src/client/**`. The server files cited in each reason match the grep exactly. The four `storage*`
  accessors have no caller at all. `PROFILE_API_URL`: all four browser callers wrap the call in
  `try/catch` and treat an empty value as "no backend". `JWT_ISSUER` / `JWT_AUDIENCE`: `/api/env`
  (`src/server/Master.ts:176-192`) sends `config.jwtIssuer()` / `config.jwtAudience()`, which never
  resolve empty (hardcoded audience defaults in Prod/Preprod/Dev config).
- **R12 inversion on the real heredocs:** no false positive. Real-tree run shows no PARSE-FAILURE, and
  the 76 tests in `ConfigParity.test.ts` pass (re-run by the reviewer).
- **0064-R10 site-per-pipeline:** correct. `readsFor` filters sites by pipeline; a `core/configuration`
  site carries both `game` and `client`.
- **0064-R16:** one `failsClosed` predicate (`:982-989`) drives both the footer (`:1054`) and the exit
  code (`:1127`).
- **No value printed:** heredoc messages carry line numbers plus a name only when `=` follows. Tokenizer
  and DefinePlugin messages carry line numbers only.
- **`--enforce` wired nowhere:** `deploy.sh:61`, `build-deploy-profile.sh:73` and `package.json:34`
  all pass `--report-only`.
- **Negligible, not recorded:**
  - A CRLF file with a `\`-continued string gives a loud (false) PARSE-FAILURE. It is loud, not silent.
  - A `\u`-escaped literal bracket key is recorded under its source spelling (Codex). This is
    pre-existing and absurd in practice.

### Round 2 — re-verification, 2026-09-14

Reviewers: fkit-reviewer (own pass) + Codex adversarial pass on the delta (`codex exec`, finished
normally, exit 0, inside the 10-minute bound). **Coverage: full.** **No new rows.**

| # | Re-verified | Evidence |
|---|---|---|
| R1 | **FIXED** | Round-1 repros re-run from the CLI: `n++ / …`, `t! / …`, and the `if (s) /'/…` reverse case each report their key, with no failure. The false read inside a regex after an `if` head is gone. Attacked the new paren stack with 22 more shapes, all correct with no silent loss: `f()!`, `arr[0]!`, `a.b!.c!`, `x ?.y!`, a string then `!`, `obj.if(…)`, `this.while(…)`, `obj.for`, a paren inside a template substitution, an unbalanced `)` (no crash), `do…while (x) /re/`, `for (;;) /re/`, `yield* /re/`, a label, a generic arrow inside an `if` head, a newline before `/` after `x!` and after `x++`. `export default /'/` and `for (… of /'/g…)` give a **loud** PARSE-FAILURE, not a silent loss. Comments no longer claim "never silently". New tests read correctly: each has a matching guard test. |
| R2 | **FIXED** | Round-1 repro (a real `webpack.config.js` copy with `STORAGE_SECRET_KEY` added) → `REQUIRED 1`, the "server-only key substituted into the browser bundle" detail, footer `enforce — failing`, exit 1. With a canary value in that variable, the canary appears 0 times in the `--json` output. Only phase-1 entries trigger it; phase-2 entries are inert by design. |
| R3 | **FIXED** | Test renamed to "single- and double-quoted keys are substitutions"; the backtick key is gone. |
| R4 | Not re-verified (correctly untouched) | Owner-routed to 0203's pre-arming list; the producer makes that brief edit. |

Also: `ConfigParity.test.ts` 83/83 pass (re-run by the reviewer). Real-tree report unchanged (client
`ALLOWED 15`, `REQUIRED 0` everywhere).

**Codex round-2 findings: checked, NOT recorded** (neither is a realistic shape):

- **Division after an object literal is misread as a regex**, e.g. `{} / Number(<read>) / 2` (Codex:
  medium; mine: `function () {} / …`). Reproduced: the read is lost silently. But TypeScript rejects
  the left operand of `/` being an object or function type (TS2362), so real code cannot hit it
  without a cast, and a cast ends in `)`, which reads correctly. The logic is unchanged since round 1,
  so this is no regression. It is covered by the checker's own stated caveat that the rules are a
  heuristic, not a full grammar. **Negligible.**
- **A regex right after `of` is read as code**, e.g. `for (const x of /re/ as any)` (Codex: low). The
  result is a false read, not a lost one, and iterating a regex is itself a type error. **Negligible.**

**Convergence call: CONVERGED.** R1–R3 are fixed and verified. R4 is disposed by the owner (pre-arming
list). The round-2 reviewer passes found no new defect of a realistic shape. Recommend closeout.
Status set to `closed-out`. The only open item is outside this ledger: the producer's brief edit that
adds R4 to 0203's pre-arming list.

### Round 3 — run 2 review, 2026-09-24

Scope: working tree vs HEAD for `scripts/check-config-parity.mjs` and `tests/scripts/ConfigParity.test.ts`
only (run 2: item 12 tagging, R4a, R4b pins, R13, item 11 + R19, R21), against the owner-approved
`plan-run2.md`. The 0064 library-flag comment edit and the other 0064 R22 files are out of scope.
Reviewers: fkit-reviewer (own pass) + Codex adversarial pass (`codex exec`, finished, exit 0). Status
reopened to `in-review` for this run.

| #  | Round | Sev    | Location | Claim |
|----|-------|--------|----------|-------|
| R5 | 3     | medium | scripts/check-config-parity.mjs:526-545 (`destructuringPatternBefore`), :897-915; comments :65-67, :181-183, :870-873 | **An object-type annotation turns a whole-object alias into a silent "destructuring" — the reads behind the alias vanish, no DYNAMIC-READ.** The pattern test is only "`}` directly before a plain `=`", and a TypeScript object-type literal also ends in `}`. Its property names are recorded as reads and the `continue` skips the whole-object announcement. Reproduced through `analyse()` on scratch fixtures (`server/X.ts`, game pipeline): `const env: { ZZ_A: string, ZZ_B: string } = <env object>; env.ZZ_C` → reads `ZZ_A`, `ZZ_B`; **`ZZ_C` absent; `dynamicReads` empty; `parseFailures` 0.** The same silent loss happens for a class field (`env: { ZZ_A: string } = …`), a function or arrow parameter default (`(e: { ZZ_A: string } = …) => e.ZZ_G`), and a `;`-separated type literal (`{ ZZ_A: string; ZZ_B: string }` → only `ZZ_A`; this also drops `ZZ_B` from a real annotated pattern `const { ZZ_A, ZZ_B }: {…; …} = …`). A lesser sibling, contrived: an assignment expression whose value is the object (`const env = { ZZ_A } = …`, or `f({ ZZ_A } = …)` in a **call**) records `ZZ_A` and hides the alias/argument. **This contradicts three statements in the diff:** the KNOWN LIMITS line "A TypeScript-annotated pattern … reported as a whole-object DYNAMIC-READ: a LOUD false positive, never a silent miss" (true only for a named type, e.g. `: T`; verified loud), the ENV_OBJECT comment "no unanticipated shape can pass silently", and the loop comment "Nothing can pass silently except the ruled exclusions". This is the false-negative direction that item 11 exists to close. 0 live instances (real-tree text and JSON byte-identical to HEAD; 0 DYNAMIC-READs). Not pinned by any test (the worklog checked only the named-type case). Defect. |
| R6 | 3     | low    | scripts/check-config-parity.mjs:48-50 (header `MISSING GUARD`); behaviour at :787-788 and `walkTypeScript` :236-241 (pre-existing) | **The new EXIT CONTRACT text says "an unreadable source file" fails closed. It does not: it is silently skipped.** `collectEnvReads` does `if (text === null) continue;`, and `walkTypeScript` returns early on a `readdirSync` error. Reproduced from the CLI: in a scratch `--src-dir`, `server/B.ts` (reads `ZZ_HIDDEN`) set to mode 000, and `server/sub/` (holds a read of `ZZ_HIDDEN_DIR`) set to mode 000 → neither name appears, and there is no PARSE-FAILURE and no SKIP (the exit 1 came from an unrelated fixture REQUIRED). The behaviour predates this diff (HEAD has the same `continue`); **the false claim is new.** It is a claim about the fail-closed surface, the part R4b and 0298's arming depend on. The wording may have meant "a file that cannot be separated" (that one IS loud). It is realistic only on a broken checkout, so low. Whether to fix the wording or the behaviour is the coder's call (plan scope) and may be the owner's. Defect (doc accuracy; pre-existing behaviour). |

**Checked, NOT recorded** (so the coder does not chase them):

- **Codex X1 — an unmapped file whose only environment use is a computed index or a whole-object use gets
  no R4a `DIR_PIPELINE` message.** CORRECT, as Codex's own in-memory run shows. But it still gives a
  `[global]` DYNAMIC-READ, so `--enforce` still stops. Its fix text leads to plain reads, and the next run
  then prints the R4a message. `unpartitioned` fed only from `record()` predates this diff. **Negligible.**
- **Codex X2 — a type-only mention (`type Env = typeof <env object>`) is a whole-object DYNAMIC-READ.**
  CORRECT but **loud**: a false stop, never a silent miss. It follows directly from item 11's ruled
  inversion (anything that is not a dot / bracket / destructuring is announced). → suppressed below.
- **Tag table:** every push site matches `plan-run2.md` §1. Scanner failure and blind spot → the file's
  pipelines (`"global"` when unmapped); R4a / 0-reads / allowlist / src-dir → `"global"`; deploy.sh +
  Dockerfile → game; setup-profile / build-deploy-profile / Dockerfile.profile + exports → profile;
  webpack + DefinePlugin → client. `core/configuration` → `["game","client"]` (PIPELINES order).
- **Test migration:** all 19 `.join("\n")` sites were swapped 1:1 for `messages()`. No assertion was
  dropped. The only wording change is `aliased or destructured` → `the environment object is used whole`,
  which matches the new message. No `toContain` on an array of objects was found.
- **0064 seam intact:** exports, signatures and `GAME_HEREDOC` are unchanged. `parseHeredocKeys` /
  `loadAllowlist` still return string failures. The value checker reads only `.length` and
  `pipelines.game.info`. `ConfigValues.test.ts` passes, 158/158 across both suites (re-run by the
  reviewer). With R13, the value checker still returns on `heredoc.failure` before it reads the keys.
- **Real tree:** `--pipeline=all` text and `--json` are **byte-identical to HEAD's checker**, diffed by
  the reviewer. There are 0 parse failures, 0 DYNAMIC-READs, 0 skips, and no NOTE line.
- **Member-access look-back, decision-log items 1–3: sound.** Probed shapes: `return` / `typeof` of the
  object (announced); a spread with and without whitespace after `...` (announced); `w?.process…`
  (excluded, as ruled); `this.#process…` (a loud false positive); `process?.env` whole (announced);
  `Object.assign(<object>, …)` (announced). A multi-line pattern with a comment containing commas is
  parsed correctly. A generic default `Map<string, number>()` splits at the comma, which makes it a loud
  "unreadable key", not a silent one. Raw-text fallback: a quoted pattern key becomes loud.
- **No leak:** new messages carry only `rel:line`, fixed wording, the runtime-built fix text, and (R4a)
  a folder name. None carries scanned source text or a value.
- **R21 line references** in `webpack.config.js` (:36-43, :164, :173-175, :337, :341, :345) are
  correct.

**Re-litigates settled decisions (suppressed):**

- **Codex X2 (type-only `typeof` mention → loud DYNAMIC-READ)** → item 11 + R19 (brief `## Status`,
  `decision-prep-2026-09-23.md`): detection by inversion, and anything unrecognised is announced. It is
  loud, not silent, so the ruling's re-raise premise (a silent miss) is not met. **Optional, not a
  finding:** the coder may add it to KNOWN LIMITS next to the TS-annotation line, if R5's wording fix
  touches that block anyway.

**Convergence call: NOT converged — act.** R5 is new and real: a silent false negative in the classifier
built for item 11, and it contradicts the diff's own "never silent" wording. R6 is a small doc/behaviour
mismatch. Neither re-litigates a settled item. Nothing in either row reopens R4a, R4b, R13, R14, R19,
R21, item 11's exclusions, item 12 or the `--enforce` wiring.

## Coder response

Round 1 — 2026-09-14. `fkit-coder` as the Process-review worker of `fkit-sprint-ship-loop`, under
the owner's round-1 rulings above (relayed; not seen first-hand). No finding matched an accepted
residual or an ADR. Every claim below was re-checked against the code; R1–R3 reproduced from the CLI
before any edit.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect | `maskNonCode`: (a) `++`/`--` never change `previous` (postfix stays division, prefix stays regex-possible); a `!` not followed by `=`, after a value and with no whitespace before it, is a non-null assertion and leaves `previous` unchanged. (b) **Reverse case, fixed after the owner's follow-up ruling "Fix now" (option A):** a stack of open `(` records whether each opened an `if`/`while`/`for`/`with` head; the `)` that closes one sets `previous` to a statement start, so a regex may follow — this also covers the unspaced `if (x)!/re/`. `for await (…)` counts as a `for` head; a member name (`obj.if(…)`) is marked so it is never read as a keyword. Extracted `regexMayFollow`. Corrected the "never silently" wording (the `REGEX_AFTER_PUNCTUATOR` block, the `maskNonCode` doc, the scan-code comment, the test comment). Tests (RED first): postfix `++`/`--`/`t!`/`f()!`; regex after `if`/`while`/`for`/`for await` heads, spaced and unspaced `!`; guards: logical-not `!` after a line break; a call / group / call-inside-a-head / `obj.if(…)` `)` still ends a value. | ✅ done |
| R2 | CORRECT | Defect | Client pipeline: every DefinePlugin key whose client allowlist entry is `server-only` is pushed as REQUIRED, `server-only key substituted into the browser bundle by DefinePlugin — remove the substitution; …`, before the allowlist lookup, so the entry cannot suppress it. Comment on the class + allowlist `_comment` say it is enforced. Tests (RED first): synthetic substituted → REQUIRED + `--enforce` exit 1; control unsubstituted → ALLOWED, exit 0; reviewer's real-tree repro (`STORAGE_SECRET_KEY` added to a webpack copy) → REQUIRED, exit 1. | ✅ done |
| R3 | CORRECT | Defect (test quality) | Test renamed "single- and double-quoted keys are substitutions"; the backtick key replaced by a double-quoted one, with a comment that a template-literal key is a SyntaxError. No checker change (the template-span branch is unreachable on loadable configs). | ✅ done |
| R4 | CORRECT | Defect (pre-existing blind spot) | None this run, per owner ruling "Add to 0203's pre-arming list". The brief edit is the producer's, not this ledger's — flagged for the driver to route. | blocked (owner-routed: producer brief edit) |

**R1 — reverse case: first recorded, then fixed on the owner's ruling.** It was not the same fix as
the postfix one (it needs a paren stack), so per the first ruling it was recorded and surfaced as a
decision. It carried new evidence the reviewer's row did not state: it could **lose** a read
silently, not only add a false one (CLI repro: `if (x) /^https?:\/\//.test(u) && console.log(<read of ZZ_LOST_AFTER_PAREN>);`
→ key not reported, `parseFailures` empty). Owner then ruled "Fix now" (option A, 2026-09-14, relayed).
The same CLI repro now reports the key with no failure. The checker comment no longer names a known
silent shape; it still says the rules are a heuristic, not a full grammar, so an unanticipated
balanced misread can still lose a read silently.

**Verification (this round).** `npm test`: 122 suites / 1305 tests passed (was 1298; +7), shell
harnesses included, no flake, no re-run. `ConfigParity.test.ts`: 83 tests. `npm run lint` clean;
`prettier --check` clean on the 3 touched files; `bash -n deploy.sh build-deploy-profile.sh` ok.
Static no-leak: 0 un-escaped env member spellings in the checker. Real tree: `--pipeline=all
--report-only` text and `--json` byte-identical to the post-build output. `--enforce` still wired
nowhere. Mutations, each red then restored by file copy + `cmp`: no `++`/`--` branch → postfix test;
no `!` branch → postfix test; `!` without the whitespace check → logical-not guard; no server-only
check → both R2 REQUIRED tests; DefinePlugin double-quote-only → the R3 test; no control-head `)`
→ control-head test; every `)` a head → call/group guard (plus 4 others); any open head makes an inner
`)` a head → call/group guard; no member-name mark → call/group guard; no `for await` → control-head
test. The masked text of all 296 `src/**/*.ts` files is byte-identical before this round vs after.

Round 3 — 2026-09-24. `fkit-coder` as the Process-review worker of `fkit-sprint-ship-loop`, under
the standing approval of the owner-approved `plan-run2.md`. There are no accepted residuals in this
ledger. None of the 0064 residuals (R7, R8, R10, R11, the R9 sub-note, R4) and no ADR covers R5 or R6,
so both are novel. Both were reproduced from the CLI (`--src-dir` scratch fixtures) before any edit.
Regression check against R1–R4: the R5 fix only narrows what counts as a pattern, toward loud. That
matches R4's direction and recreates nothing.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R5 | CORRECT | Defect (medium, my severity: a silent false negative in item 11's classifier, the direction item 11 exists to close; 0 live instances) | `destructuringPatternBefore` accepts a `{…}` only when `patternMayOpenAt`: its `{` follows `const` / `let` / `var`, a `(` or a `,`. A `:` before it (a type annotation), and also `=` / `&` / `|`, means it is not a pattern, so the mention becomes a whole-object DYNAMIC-READ. That covers the annotated alias, the class field, the annotated parameter default, the `;` type literal, an intersection type, and the chained `x = { A } =` sibling. The two "nothing can pass silently" comments and the KNOWN LIMITS lines are corrected. Tests (RED first): the reviewer's repros plus a named type, an intersection type and a non-null assertion, each giving exactly 1 whole-object DYNAMIC-READ and no type name recorded as a read; a `,`-preceded parameter default added to the destructuring test. **Not fixed:** the call-argument sibling `f({ A } = <object>)` still records A, and the object passed stays silent. It cannot be told apart from a parameter default without a parser. It is documented under KNOWN LIMITS and pinned by a test. **Owner ruling 2026-09-24 (Q1 = A, "Accept as known limit", relayed by the lead): accepted, recorded under *Accepted residuals*.** | ✅ done |
| R6 | CORRECT | Defect (low: doc accuracy; the behaviour is pre-existing) | First the header wording was corrected to match the behaviour. Then, on the **owner ruling of 2026-09-24 (Q2 = A, "Yes, flag it", relayed by the lead)**, the behaviour itself was changed: a `src/` file that cannot be read is a PARSE-FAILURE tagged with its file's pipelines, and a `src/` directory that cannot be read (`walkTypeScript` now collects it instead of returning silently) is a PARSE-FAILURE tagged `"global"`. Under `--enforce` both fail closed. The `MISSING GUARD` text lists them among what fails closed, and the KNOWN LIMITS line was removed. Tests (RED first): a mode-000 file and a mode-000 directory in a scratch fixture. They probe once whether chmod 000 really makes a file unreadable (it does not for root) and are reported **skipped** with a warning if not, never as a green pass. CLI repro: both are now reported (`["game"]` / `global`). | ✅ done |

**Verification (this round).** CLI R5 repros (alias, class field, arrow default, `;` type, named type):
0 reads recorded, 5 whole-object DYNAMIC-READs (was 5 false reads and 1 DYNAMIC-READ). `npm test`:
139 suites / 1947 tests passed on the first run, shell harnesses included, no flake, no re-run.
`ConfigParity.test.ts`: 108. `ConfigValues.test.ts` green and `cmp`-identical to its pre-edit copy.
`npm run lint` exit 0; prettier clean on both touched files; `bash -n deploy.sh build-deploy-profile.sh`
ok. Real tree: `--pipeline=all --report-only` text, `--json` and read set are byte-identical to run 2's
step-0 baseline. `--enforce` is still wired nowhere. Mutations: 4 new ones (every `{` a pattern again;
no `,`; no `const`/`let`/`var`; no `(`), each red. The build's 21 were re-run against the new checker,
all red. Each was restored by copy + `cmp`.

**Round 3, continued — after the owner's Q1/Q2 rulings (2026-09-24).** R5 → `✅ done` (residual
recorded). R6's behaviour change is applied as above. `npm test`: 139 suites / 1949 tests passed on the
first run; the 2 R6 tests ran, none skipped. `ConfigParity.test.ts`: 110. `npm run lint` exit 0;
prettier clean; `bash -n` ok. Real tree: text, `--json` and read set are still byte-identical to the
step-0 baseline. `ConfigValues.test.ts` green and unedited. Mutations: 4 new ones (directory not
recorded; file skipped silently; directory tagged with a pipeline; file tagged global), each red. The
full table (M1–M21, N1–N4, Q1–Q4, 29 in all) was re-run against the final checker, all red, each
restored by copy + `cmp`. Every finding in this ledger is now dispositioned: **Status set to `closed-out`.**

**R4 — resolved update, 2026-09-24 (run 2).** The round-1 R4 row above stays as history.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R4 | CORRECT | Defect (pre-existing blind spot) | Resolved by run 2's **item 11**, where the owner had routed R4 (0203's pre-arming list). `ENV_ALIAS` was replaced by inversion-based detection: every whole-object use is now a DYNAMIC-READ. Both of R4's repros are pinned in `tests/scripts/ConfigParity.test.ts` by "the two recorded reproductions — a parenthesised alias and Object.keys — are announced": each gives exactly one whole-object DYNAMIC-READ with file:line. The other shapes R4 named (passing to a function, a spread, a `return`) are pinned by "every other whole-object use is announced exactly once". | ✅ done |


## Accepted residuals (shared, do-not-re-litigate)

- **A destructuring pattern assigned inside a CALL argument stays silent** (review 0203 R5's lesser
  sibling). What: `f({ A } = <environment object>)` records `A` as a read, and the object passed to
  `f` is not announced as a whole-object use. It is documented under KNOWN LIMITS in the checker
  header and pinned as silent by a test. Why (structural): without a real parser, a pattern in a call
  argument cannot be told apart from a parameter default `function h({ A } = …)`, which is a legitimate
  read the plan requires. The rejected alternative is a call-vs-parameter check on the token after the
  enclosing `)`: it is more hand-written parsing with new edge cases, and it still leaves a pattern
  after a `,` inside an array literal silent, so it only partly helps. The shape is also contrived:
  TypeScript needs `A` declared beforehand. Accepted by the owner on 2026-09-24 (Q1 = A, "Accept as
  known limit", relayed by the lead). Re-raise only if: a live instance of this shape appears under
  `src/`, or a real parser replaces the hand-written classifier.

Settled items that earlier rounds were deduped against live in the 0064 ledger's *Accepted residuals*
(round 1 + round 2 addendum) and in `plan.md`'s approval record:

- **Suppressed this round as re-litigating settled decisions:**
  - **0064-R13, blast radius now wider.** Any unconsumed heredoc line discards the whole heredoc (false
    `REQUIRED` next to the PARSE-FAILURE). Its re-raise condition is "before wiring `--enforce`", which
    has not happened, and the owner put 0064-R13 out of this run.
  - **Import-graph walk vs the directory heuristic** (ruling R2). A non-`configuration` `src/core/**`
    read that the browser imports stays game-only, per D2's exact scope.
  - **0064-R7:** `walkTypeScript` visits only `*.ts`. No `.tsx`/`.js` file under `src/` reads the
    environment.
  - **0064-R4:** `--enforce` fail-closed edges. This run adds new edges (a tokenizer failure, and a
    computed / spread / non-literal DefinePlugin key). They are recorded in the worklog and belong to
    0064-R4, which is owner-open and out of this run. Not a new finding.
  - **Indented heredoc delimiter ends the body** (`:421`, `trim() === delimiter`). Latent; recorded in
    the plan and worklog as seen-not-fixed.
