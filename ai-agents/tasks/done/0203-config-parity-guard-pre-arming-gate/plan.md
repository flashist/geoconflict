# Plan — task 0203, this run: R12, R1 (+R10), R15, R18, R16 (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-14, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session.
- Run scope (owner ruling 2026-09-14): only the no-decision items R12, R1, R15, R16, R18. R4, R13, R14
  (second half), R19, R21 and the brief's open questions are OUT of this run.
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-14):
  1. **R1 — "Mark server only"** (option A): add 15 client allowlist entries — a new class `server-only`
     for the 12 keys with no browser caller, `runtime-supplied` for `PROFILE_API_URL`, `JWT_ISSUER`,
     `JWT_AUDIENCE` (reach the browser via `/api/env`) — plus the secret guardrail wording. Small allowlist
     schema change + one test line. Each reason must be a verified claim citing a real `src/` path.
  2. **R10 — "Yes, fold it in"**: record each site with its pipeline; each finding cites only its own
     pipeline's sites.
  3. **R12 verification meaning** — not asked; the plan proceeds on its recommendation (PARSE-FAILURE
     naming the key), as the worker said it would unless told otherwise.
- Open dependency flagged by the producer, NOT ruled by the owner: 0203's brief `## Notes` says 0064's
  weekend report-only run should come first. This run arms nothing (`--enforce` stays unwired), so it is
  reversible; the question stays open for the owner.

---

## Context gathered
- Read in full: the brief, `scripts/check-config-parity.mjs` (773 lines), `tests/scripts/ConfigParity.test.ts` (886 lines), the allowlist, and the relevant sections of the 0064 review ledger (round-1 dispositions, residuals, the round-2 list of items to fix before arming, the Q7 fix).
- The wiki has a `config-parity-failure-class` decision page. Nothing in it changes these five items. The ledger is the authority, as the brief says.
- **`--enforce` is wired nowhere:** `deploy.sh:61`, `build-deploy-profile.sh:73` and `package.json:34` all pass `--report-only`. This plan edits no deploy script.
- Both live heredoc bodies are flat: every line is a column-0 `UPPERCASE=` assignment, with no blank lines, comments or `export` (`deploy.sh:300-329`, `setup-profile.sh:702-711`). DefinePlugin has exactly one block (`webpack.config.js:330-346`).
- Brief out of date: Q7 was already answered (Option A) — the `CAVEAT` line ships today at `scripts/check-config-parity.mjs:624-625,661`, test `ConfigParity.test.ts:855`. Most `file:line` references in the brief have drifted by about 10 lines.
- Brief open question 1 — local evidence only, no decision: with local Docker 28.5.1 / Compose v2.40.0, Compose `env_file` accepts `export KEY=`, indented and lowercase keys; `docker run --env-file` rejects `export KEY=` but accepts indented and lowercase keys. VPS versions unverified.

## Order
0. **Capture the baseline before any edit:** `node scripts/check-config-parity.mjs --pipeline=all --report-only` and `--json` into the scratchpad. Verification step 4 compares against this byte for byte.
1. **R12** (the owner said first)
2. **R1**, including removing the CAVEAT, and R10 (owner ruled fold-in).
3. **R15**, which builds the tokenizer
4. **R18**, which reuses the tokenizer
5. **R16**, a one-predicate fix that could go anywhere; last keeps each diff easy to review
6. Full verification

Files for all items: `scripts/check-config-parity.mjs`, `tests/scripts/ConfigParity.test.ts`, and `scripts/config-parity-allowlist.json` (R1 only). No application code, no deploy scripts, no shell harness.

---

### 1. R12: heredoc parser silently drops `export KEY=` and lowercase keys

**Finding, re-verified.** `HEREDOC_ASSIGN` (`:125`) needs `[A-Z_]` at column 0. `HEREDOC_ASSIGN_INDENTED` (`:126`) needs `[ \t]+` then `[A-Z_]`. Any other line in the body is ignored silently (`:202-207`): `export KEY=`, lowercase names, mixed case, a bare `KEY`, and `\v`/`\f` indents.

**New evidence (scratchpad probe, local versions only):**
- Compose `env_file` forwards `export`, indented and lowercase keys. This is `setup-profile.sh:833,862`.
- `docker run --env-file` rejects `export KEY=` with `variable 'export EXPORTED_KEY' contains whitespaces`, but accepts indented and lowercase keys. This is `update.sh:88`.

So the R9 message "an assignment must start at column 0 to be read as a forwarded key" (`:189`) is **false for both consumers**.

**Change: detect by inversion, as the reviewer directed.**
- `parseHeredocKeys` sorts every body line into one of three kinds:
  - **consumed**: `HEREDOC_ASSIGN` matches
  - **ignorable**: blank, or first non-space character is `#`. Both env-file parsers treat these as nothing.
  - **unconsumed**: everything else. In env-file grammar, every non-blank, non-comment line is an assignment. That includes a bare `KEY`, which docker forwards from the host.
- Any unconsumed line → hard `PARSE-FAILURE`. This reuses R9's mechanism unchanged, including `keys: []`. That keeps R13's discard-everything behaviour, which is out of this run.
- `HEREDOC_ASSIGN_INDENTED` stays **only to pick the message**, so the existing `indents 'X='` wording and its tests survive. It no longer decides what gets detected.
- **Message never prints a value.** It prints the line number plus a name taken from `/^\s*(?:export\s+)?([A-Za-z_]\w*)/`, or the line number alone if there is no name. Never the line's text.
- **Wording fix only:** replace the false "must start at column 0 to be read as a forwarded key" with "the guard reads only column-0 `UPPERCASE=` assignments, so this key cannot be checked". The substring `indents 'X='` is kept.
- Correct the comment at `:122-124`.

**Tests, written first and run red before the fix:**
1. The ledger's reproduction: profile heredoc `export ORPHAN_KEY=${ORPHAN_KEY}`, no hop-1 export → `parseFailures` names `ORPHAN_KEY` and its line. A control fixture with the plain spelling still prints the B2 `lands EMPTY` finding.
2. `  export GAME_HOST=${GAME_HOST}` in the deploy heredoc → PARSE-FAILURE.
3. Lowercase `game_host=` and mixed-case `Game_Host=` → PARSE-FAILURE naming each.
4. A bare `GAME_HOST` line → PARSE-FAILURE.
5. A `\v`-indented key → PARSE-FAILURE (the ledger's sibling case).
6. Blank line plus `# note GAME_X=1` in the body → **no** failure. This pins the exemption.
7. No-leak: `export ORPHAN_KEY=<per-run canary>` → the canary is absent from stdout and from `--json`.
8. The existing R9 tests stay green.

**Mutations to prove each test can fail:**
- Remove the unconsumed → failure branch: tests 1–5 go red.
- Drop the comment exemption: test 6 goes red.
- Print the raw line in the message: test 7 goes red.

**Verification.** Re-run the ledger fixture: `REQUIRED 0 / INFO 0` becomes a PARSE-FAILURE naming the key. Real tree has no PARSE-FAILURE (existing test).

⚠️ **Interpretation risk:** verification step 3 says the fixture "must now print the finding". What this plan prints is a PARSE-FAILURE naming the key, not the B2 line itself. → NEEDS-DECISION 3 (does not block; proceeding on PARSE-FAILURE).

---

### 2. R1: core configuration reads are never checked against DefinePlugin (method ruled by D2; fallout ruled 2026-09-14)

**Finding, re-verified.** `DIR_PIPELINE` sends `core` → `game` only (`:96-101`). 27 files under `src/client` import `core/configuration`.

**Fallout, measured.** A scratch copy with `core/configuration/**` → `{game, client}`, run on the real tree, gives client REQUIRED for 15 keys:

`PUBLIC_HOST PUBLIC_PROTOCOL PUBLIC_PORT DEPLOYMENT_ID API_BASE_URL PROFILE_API_URL JWT_ISSUER OTEL_AUTH_HEADER STORAGE_ENDPOINT STORAGE_ACCESS_KEY STORAGE_SECRET_KEY STORAGE_BUCKET API_KEY ADMIN_TOKEN JWT_AUDIENCE`

A grep for direct `.accessor()` calls outside `core/configuration` found **browser callers for 3 keys only**:
- `profileApiUrl` (4 client files)
- `jwtIssuer` (`Matchmaking.ts`)
- `jwtAudience` (`jwt.ts`)

For all three, the value from `/api/env` wins, and the env read is only a fallback. I did not verify whether the browser ever reaches that fallback. The other 12 have no direct browser caller. That is a grep result, not proof: `publicHost` calls `jwtAudience` internally, for example.

**Change:**
- In `collectEnvReads`, a file under `core/configuration/` adds both `game` and `client`. Every other file under `src/core/**` stays game-only, per D2's exact scope.
- Rewrite the ⚠️ gap block at `:79-95` to say what the fix is and why the scope is `configuration/**`. Remove the pointer at `:551-554`. Update the header's PIPELINES line (`:23`).
- **Delete `CLIENT_FORWARD_CAVEAT` and its `render()` push**, as its own comment at `:623` instructs ("DELETE THIS LINE WHEN R1 IS FIXED").
- Resolve the 15 keys per the owner ruling (option A): new allowlist class `server-only` for the 12, `runtime-supplied` for `PROFILE_API_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`. Every allowlist reason must cite a real `src/` path; the existing path-resolves test enforces that.
- Client REQUIRED text for a `core/configuration` read gains a guardrail: "if the browser never needs it, allowlist it; never substitute a server secret into the browser bundle".
- R10 (owner ruled fold-in): record each site with its pipeline, and each finding cites only its own pipeline's sites.

**Tests, written first:**
1. Synthetic: `src/core/configuration/Cfg.ts` reads `CORE_SHARED_KEY`. It is forwarded by the heredoc but absent from DefinePlugin → client REQUIRED names it. Adding it to DefinePlugin clears it.
2. Scope: a read in `src/core/other/X.ts` stays game-only (no client finding).
3. **The ledger's exact reproduction, on real-tree data.** A fixture whose `src` is a symlink to the real `src`, with every real input copied except `webpack.config.js`, which has the `STRIPE_PUBLISHABLE_KEY` entry removed → client REQUIRED names `STRIPE_PUBLISHABLE_KEY`.
4. Replace the CAVEAT test with "no `CAVEAT` line in any pipeline's output".
5. The new allowlist classes are added to the well-formed test's list.
6. R10: the ledger's `PROFILE_INTERNAL_TOKEN` misdirection shape, where a game finding must not cite a `profile-server/` file.

**Mutations:**
- Revert the both-pipelines mapping: tests 1 and 3 go red.
- Map all of `core/**` to both: test 2 goes red.
- Re-add the caveat push: test 4 goes red.

**Verification.**
- The reproduction now fires.
- Real-tree client section: CAVEAT gone, ALLOWED count up by the 15 entries. This is the only intended output change.
- Game and profile sections stay byte-identical to step 0.

---

### 3. R15: the read scanner can't tell comments or strings from code

**Finding, re-verified.** The patterns at `:114-118` run over raw text (`:285-313`). Near misses already in the tree: `src/server/Master.ts:146` and `src/server/WorkerSupervisor.ts:74`. **Real reads live inside template-literal `${}`** at `ConfigLoader.ts:26` and `OtelBrowserInit.ts:51,62`, so masking must keep `${}` as code.

**Change: a zero-dependency tokenizer, `maskNonCode(text)`.**
- Node stdlib only. The static no-leak test's escaping rule applies to all new code and comments.
- It returns a copy of the text with the same offsets and newlines. Line comments, block comments, the contents of single- and double-quoted strings, template-literal text chunks and regex-literal bodies become spaces. Quote characters and `${ … }` expressions are kept, with nesting.
- It also returns the string-literal spans (start, end, value).
- Regex vs division is decided by the previous significant token: `/` starts a regex after `( , = : [ ! & | ? { } ;`, after `return` or `typeof`-style keywords, or at the start of the file.
- **Fails loud.** If the file ends inside a string, template, comment or regex, or a raw newline appears inside a quoted string or regex, push a `PARSE-FAILURE` (`src/<file>: could not separate code from comments/strings`). Then **fall back to the raw scan for that file**, so a tokenizer bug can never lose a read silently.
- `ENV_READ_DOT`, `ENV_ALIAS` and `ENV_BRACKET_ANY` run on the masked text.
- A literal bracket read counts only when a string span (no `${`) starts right after `[` at a code position. Its name comes from the span's value.

**Tests, written first:**
1. The ledger's reproduction: `// legacy default = process.env, replaced in 2024` → no DYNAMIC-READ.
2. The mirror case: `// process.env.DEAD_ONE` in a server file → `DEAD_ONE` is still reported INFO dead.
3. A block comment or JSDoc mention → no read recorded.
4. A string: `"x = process.env"` and `'process.env.GHOST'` → no DYNAMIC-READ, no read.
5. Template `${process.env.GAME_TPL}`, plus one nested inside another template → recorded.
6. A regex containing quotes followed by a real read (`/["'`]/;` then a read) → recorded, **and** `parseFailures` is empty.
7. Division that isn't a regex (`a / 2 / b` then a quoted `"'"`) → the next read is still recorded, with no failure.
8. An unterminated `/*` → PARSE-FAILURE **and** the read is still recorded (fallback).
9. Existing literal-bracket, optional-chaining, computed-index and alias tests stay green.

**Mutations:**
- Scan raw text again: tests 1–4 go red.
- Mask whole templates: test 5 goes red, and real-tree client INFO would falsely call `OTEL_EXPORTER_OTLP_ENDPOINT` dead.
- Treat every `/` as division: test 6 goes red.
- Remove the fallback: test 8 goes red.

**Verification.** Real-tree read set identical to step 0: the `--json` diff should show only R1's intended changes.

⚠️ **Risk:** a hand-written tokenizer can still mis-read an odd regex. The fail-loud check catches most cases, but not every shape.

---

### 4. R18: DefinePlugin keys are read from the whole file, not the DefinePlugin block

**Finding, re-verified.** `DEFINE_PLUGIN_KEY` runs over the whole file (`:119`, `:240-252`).

**Change.**
- In `maskNonCode(webpackText)`, find each `DefinePlugin\s*\(` at a code position. The next code character must be `{`. Walk the masked text to its matching `}`, tracking `() [] {}` depth.
- At depth 1, look at each property key position (right after `{` or `,`):
  - a string span followed by `:` whose value matches `^process\.env\.(\w+)$` is a key. This covers double, single and substitution-free backtick quotes.
  - `[` (computed key) or `...` (spread) → `PARSE-FAILURE` ("cannot enumerate").
  - bare identifiers are ignored.
- Keys from more than one block are merged (today there is one).
- 0 blocks or 0 keys → the existing PARSE-FAILURE; its message still contains "DefinePlugin".
- `DEFINE_PLUGIN_KEY` is removed.

**Tests, written first:**
1. The ledger's reproduction: a `// legacy: "process.env.OLD_FAKE_KEY": JSON.stringify(x),` comment, both inside and outside the block → not in client INFO.
2. The mirror case: a commented-out entry whose key is read in `src/client` → client REQUIRED names it.
3. The key inside a string elsewhere in the file → not treated as supplied.
4. A `"process.env.X":` key in a different object (not DefinePlugin) → not treated as supplied.
5. Single-quoted and backtick keys → treated as supplied.
6. Computed key and spread → PARSE-FAILURE.
7. Existing tests stay green.

**Mutations:**
- Go back to the raw-text regex: tests 1–4 go red.
- Only accept double quotes: test 5 goes red.
- Ignore `[` and `...`: test 6 goes red.

**Verification.** Real-tree client INFO is still exactly `[WEBSOCKET_URL]`.

---

### 5. R16: the enforce footer can contradict the exit code

**Finding, re-verified.** The footer at `:692` checks only `requiredTotal` and `parseFailures`. `failClosed` at `:765-769` also fails on `dynamicReads` and `skips`.

**Change.** One `failsClosed(result)` function, used by both `render()` and `main()`. Footer wording is unchanged.

**Tests, written first:**
1. A DYNAMIC-READ-only fixture with `--enforce` → exit 1 and "failing on the findings above". This is the ledger's reproduction.
2. A SKIP-only fixture (`Dockerfile.profile: null`, `--pipeline=profile`) → the same.
3. A table test over clean / required / parse / dynamic / skip fixtures: exit 1 exactly when the footer says "failing".

**Mutation:** restore the two-term footer condition → tests 1–3 go red.

---

## Verification (full pass)
1. The mutation table covers every new test.
2. Every ledger reproduction for R1, R12, R15, R16 and R18 is re-run.
3. Real-tree game and profile sections are byte-compared against step 0. The only client changes: CAVEAT removed, ALLOWED changed per the ruling.
4. `grep` confirms no call site and no `package.json` script passes `--enforce`.
5. `npm test` (includes the shell harnesses, about 25 s; no harness edits), `npm run lint`, `npx prettier --check` on the touched files, `bash -n deploy.sh build-deploy-profile.sh`. A supertest flake gets checked against the known signature and re-run, and the re-run is stated.
6. No value printed anywhere: the canary tests pass, and the static test passes.

## Risks
- **Real-tree output changes (R1).** Expected, but the reviewer must see it as intended.
- **New ways for `--enforce` to fail:** a tokenizer failure (R15), and a computed or spread DefinePlugin key (R18). Both are consistent with "every parser fails LOUD", and both are new edges for arming to consider alongside R4.
- **R12 widens the R13 false-positive edge.** Any unconsumed line now fails the whole heredoc, not just an indented `UPPERCASE=` line. That is inherent to the reviewer's inversion direction.
- **Tokenizer mis-reads** (R15), as noted above.
- **Seen, not fixed, outside the five items:**
  - (a) `parseHeredocKeys` treats an *indented* delimiter as the end (`trim() === delimiter`), but bash `<<` only ends on a column-0 delimiter. Latent.
  - (b) If `/api/env` runtime config is missing, the browser may reach unsubstituted `core/configuration` env reads. Unverified; would be a new brief, not this task.

## Untouched in this run
R4, R13, R14 (second half), R19, R21. Brief open question 1: evidence above, no decision. Open question 2 / Q7: already answered, brief is out of date.
