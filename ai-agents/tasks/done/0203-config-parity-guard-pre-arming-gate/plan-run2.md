# Plan: task 0203, run 2. The ruled pre-arming items (R4a, R4b pins, R13, item 11 + R19, R21, item 12 tagging)

Plan only. No files were written, and plan.md was not touched.

## Summary
- **What's left:** only local checker work, in 2 files: `scripts/check-config-parity.mjs` and `tests/scripts/ConfigParity.test.ts`. The allowlist, `check-config-values.mjs`, `ConfigValues.test.ts`, the deploy scripts and the shell harnesses are all untouched.
- **`--enforce` stays wired to nothing.** `failsClosed` stays global. Consuming the per-deploy tags and the call-site `-f` change both belong to 0298.
- **The 0064 Phase-2 seam is kept.** Export names, signatures and return shapes don't change. `.length` still works on `parseFailures` / `dynamicReads` / `skips`. The entries become tagged objects, and the value checker only reads `.length`.
- **The value checker needs NO change for R13.** Reasoning is in §R13.
- **Real-tree output should stay byte-identical, text and JSON.** The real tree has 0 parse failures, 0 DYNAMIC-READs and 0 skips today. I grepped all of `src/`: every `process.env` spelling that is not a dot read is inside a comment, so the new detection has nothing live to flag. That grep is my check, not a run of the new code. The build re-proves it.
- **Size: medium.** Most of it is item 11 + R19 (the destructuring parser) and item 12 (tagging plus a mechanical test-helper migration).

## Context gathered
- Read in full: brief.md, decision-prep-2026-09-23.md, plan.md (run 1, stale), worklog.md, review.md, 0298's brief (the arming split), the whole checker (1205 lines), the value checker's use of the seam, and the relevant ConfigParity / ConfigValues tests.
- **Working tree:** `scripts/check-config-parity.mjs` carries an uncommitted, comment-only edit from 0064's close (library-flag comment, :1198-1203). The same close left uncommitted edits in `check-config-values.mjs`, `ConfigValues.test.ts` and `eslint.config.js`. **Keep all of them.** Take pre-edit copies into the scratchpad. **No `git stash`** (run 1's incident).
- **Line references:** the brief's (`:686-697`, `:804`, `:1024`) are the architect's and have drifted. Current lines:
  - dynamic pushes: :694, :703, :812
  - parseFailures pushes: :784, :802, :805, :844, :894, :908, :967
  - skips pushes: :777, :783, :809
  - `ENV_ALIAS`: :137, used at :700-706
  - `parseHeredocKeys` unconsumed branch: :482-496
  - `failsClosed`: :1050-1057
  - `render` finding lines: :1080-1084
- **Wiki:** no page beyond the config-parity-failure-class decision. Nothing in it changes these items. The ledgers are the authority.
- **R21 line references confirmed** in `webpack.config.js`: :36-43, :164, :173-175, :337, :341, :345 (build-machine reads). The only other env reader outside `src/` is `jest.config.ts`, which is test tooling and is not deploy-forwarded.

## Order
0. **Baseline, before any edit.**
   - Save to the scratchpad: `node scripts/check-config-parity.mjs --pipeline=all --report-only`, and the same with `--json`.
   - Save the real read set (name, file:line, pipelines).
   - Take pre-edit copies of the checker and the test file.
1. **Item 12, tagging.** This goes first, because every later item emits tagged entries. It is a structural change plus a test-helper migration, and no finding appears or disappears.
2. **R4a.** Unmapped-folder message and global tag.
3. **R4b pins.** Tests only.
4. **R13.** Partial keys on an unreadable heredoc line.
5. **Item 11 + R19.** Detection by inversion, destructuring as reads, the INFO caveat.
6. **R21.** Limit note and pinning test.
7. **Header comment update** (EXIT CONTRACT + KNOWN LIMITS), then full verification.

Every behaviour test is written first and run RED where the behaviour is new. Every new test gets a mutation proof: break the behaviour, watch the test go red, restore by file copy + `cmp`.

---

### 1. Item 12: per-pipeline tagging (owner ruling 2026-09-23)

**Change**
- `parseFailures`, `dynamicReads` and `skips` in `analyse()`'s result become arrays of `{ message: string, pipelines: string[] | "global" }`.
  - `pipelines` is a list in `PIPELINES` order (`game`, `profile`, `client`), or the literal `"global"` for a finding that cannot be traced to a pipeline.
  - This **replaces** the single global list, as ruled. It is one source of truth, not a parallel tagged copy that could drift.
- Tag table, one row per push site:

| Finding | Tag |
|---|---|
| scanner PARSE-FAILURE (`collectEnvReads` failures) | the file's `pipelinesFor(segments)`; `"global"` if empty (unmapped) |
| DYNAMIC-READ (computed index, whole-object use, rest, computed destructuring key) | the file's pipelines; `"global"` if the file is unmapped |
| unmapped folder / loose file (R4a) | `"global"` |
| `src/: found 0 environment reads` | `"global"` |
| SKIP: allowlist not found; src-dir not found | `"global"` |
| PARSE-FAILURE: allowlist invalid JSON / bad entry | `"global"` (per the R4a/R14 conflict ruling) |
| deploy.sh heredoc failure; SKIP deploy.sh / Dockerfile | `["game"]` |
| profile.env heredoc failure; profile exports failure; SKIP setup-profile.sh / build-deploy-profile.sh / Dockerfile.profile | `["profile"]` |
| DefinePlugin failures; SKIP webpack.config.js | `["client"]` |

- A `src/core/configuration/**` file is tagged `["game","client"]`, from `CORE_CONFIGURATION_PIPELINES`. Other `src/core/**` files are `["game"]`.
- Implementation: `load(key)` gains a pipelines argument. `collectEnvReads` returns tagged `failures` and `dynamic`. A small `tag(pipelines)` helper maps `[]` to `"global"`.
- **`render()`** prints each entry's message, then the tag as a suffix: `  [pipeline: game]`, `  [pipelines: game, client]` or `  [global]`. The line-start prefixes `SKIP  `, `PARSE-FAILURE  `, `DYNAMIC-READ  ` are unchanged. Report-only stays readable, and existing substring tests keep matching (e.g. `"SKIP  Dockerfile.profile not found"`).
- **`failsClosed` is unchanged:** any `.length > 0` still fails `--enforce`. Using the tags per deploy is 0298's job.
- **Seam:** `parseHeredocKeys` and `loadAllowlist` keep returning `failure` as a **string**. The tag is added inside `analyse()` when pushing. So `check-config-values.mjs`, which pushes `heredoc.failure` and `allowlist.failure` into its own string lists, is unaffected. `.length` semantics are unchanged: one entry per finding, as today.

**Test migration (mechanical, not weakening)**
- The `CheckerResult` type changes to the tagged shape.
- A new helper `messages(list)` returns `list.map(f => f.message).join("\n")`. It replaces every `result.parseFailures.join("\n")` / `dynamicReads.join` / `skips.join` (~30 sites; grep them all, because SWC does not type-check).
- `toEqual([])` assertions stay as they are.

**New tests** (verification step 8)
1. **Computed-index DYNAMIC-READ, by placement:**

| File | Expected tag |
|---|---|
| `src/server/X.ts` | `["game"]` |
| `src/profile-server/X.ts` | `["profile"]` |
| `src/client/X.ts` | `["client"]` |
| `src/core/configuration/X.ts` | `["game","client"]` |
| `src/core/other/X.ts` | `["game"]` |
| `src/newdir/X.ts` | `"global"` |

2. **Scanner PARSE-FAILURE** (unterminated `/*`): same placements, same expected tags.
3. **Input-level:**
   - `["game"]`: deploy.sh heredoc anchor gone; missing Dockerfile.
   - `["profile"]`: profile heredoc failure; missing Dockerfile.profile.
   - `["client"]`: DefinePlugin computed key; missing webpack.config.js.
   - `"global"`: allowlist `{ not json`; missing allowlist; missing src dir.
4. **Text render:** a tagged fixture shows the suffix. On the real tree, text is byte-identical to the baseline (existing tests + step 7 compare).

**Mutations**
- Tag everything `"global"` → tests 1–3 red.
- Drop the core/configuration dual tag (use `DIR_PIPELINE[segments[0]]` only) → the core/configuration rows go red.
- Tag an unmapped file `[]` instead of `"global"` → the newdir rows go red.
- Tag allowlist failures with the run's selected pipelines → test 3 red.

### 2. R4a: an unmapped `src/` folder stops the deploy, and the message names the fix (owner ruling)

- **Stopping already happens today:** `failsClosed` fails on any DYNAMIC-READ. What changes:
  - the message
  - the `"global"` tag (§1)
  - the pin tests
- **New message** for `src/<dir>/…` (segments ≥ 2, `<dir>` not in `DIR_PIPELINE`):
  `src/<rel> — reads the environment but its folder '<dir>' maps to no pipeline — add one line to DIR_PIPELINE in scripts/check-config-parity.mjs: "<dir>": "game" | "profile" | "client"`
  - It keeps the substring `maps to no pipeline`, so the existing test still matches.
- **A loose top-level file** (`src/stray.ts`, segments < 2) has no folder to map. Its message says so: `… a file directly under src/ maps to no pipeline — move it into a mapped folder (see DIR_PIPELINE)`.
- The render-appended ` — cannot enumerate` suffix is removed. Each message now carries its own fix text (see §5). That suffix was wrong for this case anyway.

**Tests**
- `src/newdir/X.ts` reads a key → message contains `DIR_PIPELINE` and `"newdir"`, tagged `"global"`, `--enforce` exits 1, report-only exits 0.
- `src/stray.ts` → the move-it message.

**Mutations**
- Revert to the old message → red.
- Tag not global → red (§1).

### 3. R4b: the checker-side pins (the call-site `-f` change is 0298's, not this task's)

- The ruling: a missing **guard script** stops the deploy. That is enforced only at `deploy.sh:60` / `build-deploy-profile.sh:72` (`[ -f … ]`), and 0298 owns that change. **This task does not edit either script.**
- The checker side of the ruling is already true: missing inputs, scanner parse failures and computed/spread DefinePlugin keys all fail closed.
- **What this task adds:**
  - pinning tests for the two newer edges:
    - `--enforce` on a fixture whose only problem is a scanner parse failure → exit 1, footer `failing`
    - the same for a computed DefinePlugin key
    - the same for a spread DefinePlugin key
  - an EXIT CONTRACT comment in the header saying the missing-script stop lives at the call sites and is 0298's.

**Mutations**
- Don't push the scanner failure → red.
- Skip `cannotEnumerate` for computed/spread → red.

### 4. R13: an unreadable heredoc line is a PARSE-FAILURE, but the lines that parsed are still checked (architect's call, owner-approved)

**Change** (`parseHeredocKeys`, :482-496)
- On the unconsumed-line path, return `{ keys, failure, body }` with the keys that **did** parse, not `keys: []`.
- The failure message is unchanged.
- The other failure paths are unchanged: anchor not found, never closed, and 0 keys still return `keys: []`.
- If every body line is unconsumed, `keys` is empty and the one unconsumed-line failure is reported, not a second "yielded 0 keys".
- **Callers need no edit:** game (:838-846) and profile (:888-897) already push `failure` and then use `keys` / `body`.

**Tests** (the ruled pair)
- **Game:** the base fixture with `    GAME_HOST=${GAME_HOST}` indented →
  - PARSE-FAILURE naming `GAME_HOST`
  - game REQUIRED exactly `["GAME_HOST"]` (before: `GAME_HOST` + `GAME_TOKEN`)
  - INFO exactly `["DEAD_ONE"]`, unchanged from the clean run (before: 0)
- **Profile:** the base fixture plus a seeded B2 `ORPHAN_KEY=${ORPHAN_KEY}` in hop 2 (not exported at hop 1), then `  PROFILE_SECRET=…` indented →
  - PARSE-FAILURE
  - profile REQUIRED exactly `["ORPHAN_KEY" (lands EMPTY), "PROFILE_SECRET" (B1)]`
  - INFO `["ORPHAN_KEY"]`, unchanged from the control run
  - The control (no indent) gives REQUIRED `["ORPHAN_KEY"]` only.
  - Before R13: B1 fires for both reads, B2 is silenced, INFO is 0.

**Mutation**
- Restore `keys: []` on the unconsumed path → both tests red.

**The value checker (asked): nothing there needs to change.**
- `check-config-values.mjs` `readHeredoc` (:159-166) returns `{ lines: [], failure }` as soon as `heredoc.failure` is set. It never reads `heredoc.keys`. So R13's change to `keys` on that path is invisible to it, and it keeps its current whole-heredoc PARSE-FAILURE, exit 1 with empty stdout, which `ConfigValues.test.ts` :265 pins.
- Its per-line loop (:174-183) runs only on failure-free bodies, so its comment "parseHeredocKeys already vetted the rest" stays true.
- Its `deadKeys()` (:244-278) still turns the dead-key exemption off on any parity parse failure.
- Making the value checker also judge the lines that parsed would be a new behaviour for 0064's code, and nobody has ruled it. **Not in this plan.** Verification: `ConfigValues.test.ts` must stay green, unedited.

### 5. Item 11 + R19: every `process.env` use is either a listable read or is announced (architect's call, owner-approved)

**Change** (collectEnvReads). Remove `ENV_ALIAS` (:137, :700-706) and replace it with detection by inversion over the masked code, or over the raw text when masking failed, as today.
- **Find:** every `/process\s*\??\.\s*env\b/g`, dot escaped for the static test.
- **Skip member access:** look back over whitespace. If the previous character is `.` (this covers `?.`) or a word character (`$process`), it is not the global `process` → ignore it. So `worker.process.env` and `worker?.process.env` are **excluded**.
- **Look ahead** from the end of the match:
  - `\s*\??\.\s*[A-Za-z_]` → a plain dot read, already recorded by `ENV_READ_DOT` → skip.
  - `\s*\??\.?\s*\[` → a bracket, handled by the existing literal/computed logic → skip. So a computed index is **not double-counted**; `ConfigValues.test.ts` :539 pins `1 blind spot(s)`.
- **Otherwise, check for destructuring:** look back over whitespace for a single assignment `=` (the character before it is not one of `= ! < > + - * / % & | ^ ?`). Before that, a `}`. Walk back, depth-aware over `() [] {}`, to its `{`. Then parse the pattern's top-level properties, splitting on depth-1 commas:
  - `IDENT`, `IDENT = default`, `IDENT: target`, `IDENT: target = default` → **a read** of IDENT, recorded at the key's position. The target may be a nested pattern, skipped by depth.
  - a quoted key (a string span whose value is identifier-like), followed by `:` → a read.
  - `...rest` → **DYNAMIC-READ** (rest element). A computed key `[expr]` → **DYNAMIC-READ**. Anything else unparseable → **DYNAMIC-READ**.
  - The written-out keys in a pattern that also has a rest element are still recorded.
  - This covers `const {…} = process.env`, `({…} = process.env)` and a parameter default `f({…} = process.env)`.
- **Anything else** → one **DYNAMIC-READ** per occurrence: alias, `Object.keys(…)`, spread, a call argument, a parenthesised use, `return`, `??`, `if (…)`, `as`, a non-null `!`.
- **Messages:** file:line plus fixed wording plus the fix. The fix is the ruled text, "rewrite as plain process.env.NAME reads", **built at runtime** (e.g. `["process","env","NAME"].join(".")`, with a comment), because the STATIC no-leak test forbids that spelling anywhere in the checker file. No source text or identifier from the scanned code is printed. The kinds:
  - computed index into the environment object
  - the environment object is used whole (aliased, passed, spread or tested), so the names read through it cannot be listed
  - a destructuring of the environment object has a `...rest` element
  - a destructuring of the environment object has a computed or unreadable key
- **Not widened to a bare `process`.** `const { env } = process` and `process["env"]` stay silent: a documented limit with a pinning test. This matches the ruling, and avoids false stops on `src/profile-server/Server.ts:203` and `src/client/GoogleAdElement.ts:100`.
- **R19 caveat:** when `dynamicReads.length > 0`, `render()` prints **one** line right after the DYNAMIC-READ block: `NOTE  INFO may include keys read through the DYNAMIC-READ above`.
  - I avoid the token `CAVEAT` so there is no confusion with the retired R1 caveat or its test.
  - It follows the ruling literally ("while any DYNAMIC-READ is present"), so it also prints when the only DYNAMIC-READ is an unmapped folder, even though those reads *are* listed. It is harmless and conservative.
  - JSON gets no extra field: a JSON reader can tell from `dynamicReads.length`.
- **Result:** a written-out destructuring is now a normal read. That removes today's false `--enforce` stop and the false "dead" INFO line (R19's repro). It also *adds* forward checking for those names, which is the correct direction.

**Tests**
1. **The two recorded reproductions:** `const env = (process.env); env.ZZ_PAREN` and `Object.keys(process.env)` → exactly one DYNAMIC-READ each, with file:line.
2. **A table of the other silent shapes,** each giving exactly one DYNAMIC-READ: `{...process.env}`, `f(process.env)`, `return process.env`, `x ?? process.env`, `if (process.env)`, `const all = process.env` (the existing alias test, updated to the new wording).
3. **Member access excluded:** `worker.process.env` and `worker?.process.env` written as **code** (not a comment) → `dynamicReads` `[]`.
4. **Pinned limit:** `const { env } = process; env.PINNED_A` and `process["env"].PINNED_B` → no DYNAMIC-READ, and neither name is recorded as a read (absent from REQUIRED although not forwarded).
5. **Written-out destructuring:** `const { A_KEY, B_KEY: b, C_KEY = "x" } = process.env;` in a client file → no DYNAMIC-READ, and all three are client REQUIRED (not substituted), i.e. recorded as reads. Also `({ D_KEY } = process.env)` and a parameter default.
6. **R19's reproduction:** `const { API_DOMAIN } = process.env;` with `API_DOMAIN` substituted by DefinePlugin → no DYNAMIC-READ, and `API_DOMAIN` is **not** in client INFO "no reader found".
7. **Rest and computed:** `const { A_KEY, ...rest } = process.env` → A_KEY recorded **and** one rest DYNAMIC-READ. `const { [k]: v } = process.env` → DYNAMIC-READ.
8. **The caveat:**
   - a DYNAMIC-READ fixture with `--pipeline=all` → the NOTE line appears **exactly once**
   - a clean fixture → it is absent
   - the real tree → it is absent
9. **No double count:** a computed bracket gives exactly 1 `dynamicReads` entry.
10. **Fix text:** every unenumerable DYNAMIC-READ message contains "rewrite as plain".
11. The existing R15 comment/string tests stay green, e.g. prose `// legacy default = process.env…`.

**Mutations**
- Restore the old `ENV_ALIAS` (only after `=`) → tests 1–2 red.
- Remove the member-access check → test 3 red.
- Widen to a bare `process` → test 4 red.
- Treat destructuring as DYNAMIC-READ (the old behaviour) → tests 5–6 red.
- Parse the pattern but don't record the keys → tests 5–6 red.
- Accept a rest element silently → test 7 red.
- Caveat mutated to always / never / once per pipeline → test 8 red.
- Inversion doesn't skip brackets → test 9 red, and `ConfigValues` :539 red.
- Drop the fix text → test 10 red.

**Known limits** (documented in the header, not fixed)
- A TypeScript-annotated pattern (`const { A }: T = process.env`) reads as a whole-object use: a **loud** false DYNAMIC-READ, not a silent one.
- `process.env!.X` (non-null assertion) is likewise a loud DYNAMIC-READ.
- A whole-object use through member access (`globalThis.process.env`) is not announced. This is deliberate: it is the ruled exclusion.
- `const { env } = process` and `process["env"]` are pinned as silent.

### 6. R21: keep `src/` only, documented and pinned (architect's call, owner-approved)

- **Header KNOWN LIMITS note:**
  - The scanner walks only `src/**/*.ts`, so a read in build or test tooling outside `src/` is invisible.
  - Re-raise when a file outside `src/` first reads a deploy-forwarded setting.
  - **`webpack.config.js`'s build-machine reads are unchecked:** :36-43 (DEV_REMOTE_ORIGIN, USE_REMOTE_DEV, PUBLIC_*_DEV), :164 (GIT_COMMIT), :173-175 (API_DOMAIN, API_BASE_URL_DEV), :337 (DEPLOY_ENV), :341 (STRIPE_PUBLISHABLE_KEY), :345 (OTEL_EXPORTER_OTLP_ENDPOINT). They take a different path from deploy forwarding.
- **Pinning test:** the base fixture plus `tools/Build.ts`, which reads `DEAD_ONE` and `OUTSIDE_ONLY`. Expected:
  - `DEAD_ONE` is still game INFO dead (not seen)
  - `OUTSIDE_ONLY` produces no REQUIRED and no DYNAMIC-READ
- **Mutation:** point the walk at the repo root instead of `src-dir` → red. `DEAD_ONE` stops being dead, and an unmapped-folder DYNAMIC-READ appears.

### 7. Header comment
- EXIT CONTRACT: findings carry pipeline tags. `--enforce` still fails on any finding, whatever its tag. Per-deploy blocking and the missing-script stop are 0298's.
- KNOWN LIMITS block, from §5 and §6.
- The PIPELINES block is unchanged.

---

## Verification (full pass)
1. **Mutation table** covering every new test (listed above), each restored by copy + `cmp`.
2. **Every ruling pinned** (verification step 9), and each recorded reproduction re-run from the CLI as well:
   - R13: game + profile
   - item 11: `(process.env)`, `Object.keys`
   - R19: destructured `API_DOMAIN`
   - R4a: unmapped folder
3. **Real tree:**
   - `--pipeline=all --report-only` text and `--json` **byte-identical** to the step-0 baseline
   - the real read set identical (55 rows at run 1)
   - 0 DYNAMIC-READs, 0 tokenizer failures
   - no NOTE line
   - Any difference is a finding to explain, not to accept.
4. **Seam:** `tests/scripts/ConfigValues.test.ts` green and **unedited**. The exports and the library flag are unchanged.
5. **`--enforce` wired nowhere:** grep `deploy.sh`, `build-deploy-profile.sh`, `package.json`.
6. **Gates:**
   - `npm test`: the full suite including the shell harnesses, ~25 s, harnesses not edited
   - `npm run lint`
   - `npx prettier --check` on the 2 touched files
   - `bash -n deploy.sh build-deploy-profile.sh` (untouched, but checked per the brief)
   - A supertest flake: check it against CLAUDE.md's signature (and rule out a SIGSEGV first), re-run, and **say** it was re-run.
7. **No value printed:**
   - the existing behavioural canary and STATIC tests pass
   - new messages carry only file:line, key names and fixed wording
   - add a canary as a destructuring default value (`C_KEY = "<canary>"`) and assert it never reaches text or JSON

## Risks
- **JSON shape change** (strings → tagged objects) touches ~30 test assertions. It is mechanical, but a missed `.join` turns an assertion vacuous or broken. Mitigation: grep every `.join("\n")` on the three lists. The mutation table re-proves the affected tests.
- **The destructuring parser is hand-written.** Its failure modes lean loud: anything unparseable becomes a DYNAMIC-READ, not silence. The one silent direction is the ruled member-access exclusion.
- **Branch / deploy-window timing:** see open question 1.
- Seen, not in scope: `ENV_READ_DOT` still counts `x.process.env.NAME` as a read. That is pre-existing, and it errs toward counting a read.

## Out of scope (belongs to 0298 or elsewhere)
- Per-deploy consumption of the tags; changing `failsClosed` per deploy; the call-site `-f` / missing-script stop; wiring `--enforce`.
- The value checker mirroring R13.
- Any wiki write; mover skills; commits.

---

## Owner approval — 2026-09-24, live via `AskUserQuestion` in the `fkit lead` session (relayed by `fkit-lead`, `fkit-sprint-ship-loop`)

Approved **as written, with no amendments** (owner chose *"Approve"*). The plan's one open question (branch / deploy-window timing) is **answered by an earlier owner ruling**, given live on 2026-09-24: *"Don't worry about it - if the dev branch is not ready for release, I will postpone the release."* — so no isolated worktree, no branch: build in the main working tree. (`plan.md` in this folder is run 1's plan, 2026-09-14, left untouched; this file is run 2's approved plan.)
