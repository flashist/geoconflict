# Review — 0203

Task: ai-agents/tasks/backlog/0203-config-parity-guard-pre-arming-gate/brief.md
File(s) under review: scripts/check-config-parity.mjs, scripts/config-parity-allowlist.json, tests/scripts/ConfigParity.test.ts
Status: closed-out

> **ID note.** Finding ids in THIS ledger (`R1`, `R2`, …) are 0203-local. Items from task 0064's ledger
> (`ai-agents/tasks/backlog/0064-deploy-time-config-parity-guard/review.md`) are cited as `0064-R<n>`
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


## Accepted residuals (shared, do-not-re-litigate)

_None recorded in this ledger yet._ Settled items this round was deduped against live in the 0064
ledger's *Accepted residuals* (round 1 + round 2 addendum) and in `plan.md`'s approval record:

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
