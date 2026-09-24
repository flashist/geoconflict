# 0064 Phase 2: plan (items 5–7, verification steps 1 non-empty half, 2, 3, 6 enforce half; 4/5/7 as regression checks)

Plan only. I wrote no files. Baseline: `npx jest tests/scripts/ConfigParity.test.ts` gives 83/83 green, and `scripts/`, `deploy.sh` and `tests/scripts/` are clean in git.

## Summary
- **The profile half of Phase 2 already exists. This task builds the game half only.** `setup-profile.sh:820-900` `report_config_values()` (task `0220`) is labelled *"0064 Phase 2, profile side, REPORT-ONLY"*. It runs on the box after persist-or-reuse, because a blank staged profile value can legitimately mean "reuse the persisted one" (`setup-profile.sh:692-781`). A local profile value check would falsely report every one of those as empty. The allowlist's existing profile `phase: 2` reasons already say this. The game pipeline has no persistence, so the local value is the value that actually ships.
- **The value check runs as a new file, `scripts/check-config-values.mjs`.** It does not run as a mode of `check-config-parity.mjs`. Phase 1's safety story ("never reads a value", pinned by the static test `not.toMatch(/process\.env/)`) stays literally true for that file, and `0203`'s upcoming edits don't collide with Phase 2 logic. The only edit to the shared file is an export seam of about 12 lines, with no behaviour change.
- **Values arrive on stdin, not through `process.env`.** Many heredoc sources are computed in `deploy.sh` and never exported. Examples: `PUBLIC_PROTOCOL` (defaulted to `"http"` at `deploy.sh:~117`), `API_BASE_URL`, `JWT_ISSUER`, `DOCKER_IMAGE`, and `ENV`→`GAME_ENV`. A child process's environment would not see them. `deploy.sh` streams `name\0value\0` records from the bash builtin `printf` into a pipe. That exposes less than the existing ssh argv, which already carries every value (accepted residual R1 of `0062`).
- **The check runs right before the ssh**, after every default and override is applied. So it judges exactly what gets forwarded, including the `http` default that is the live `0063` mechanism.
- **A blank `PROFILE_INTERNAL_TOKEN` is shown by name as OPTIONAL, not REQUIRED.** This follows the owner ruling of 2026-09-04 and item 5 (keep "required non-empty" apart from "deliberately blank"). Fixtures prove the rule catches it once the entry is removed. **The "present when it should be blank" check is deliberately NOT built.** The owner declined it on 2026-09-04 (`0217`/`0296`/`0298`), and I don't recommend it again.
- **Unverified prediction:** I can't know which required game keys are blank in `.env.prod`, because I never open it, by design. Likely first-run REQUIRED candidates: `API_KEY`, `PROFILE_API_URL`, the Telegram trio, `OTEL_*`. The first real run belongs to `0298`.

## 1. Ground truth checked this session
| Fact | Evidence |
|---|---|
| Game heredoc has 30 keys, all shaped `KEY=${SRC}`, 29 distinct sources (`GAME_ENV` and `ENVIRONMENT` both map to `ENV`) | `deploy.sh:299-330` |
| The Phase 1 guard runs before `load_env_file`, so it provably sees no value | `deploy.sh:44-62` |
| Computed, non-exported heredoc sources | `deploy.sh:97-152` (`PUBLIC_*`, `DEPLOYMENT_ID`, `API_BASE_URL`, `JWT_*`), `:246-250` (`DOCKER_IMAGE`), `:284-294` (`BASIC_AUTH_*` forced to `""`) |
| The only remote act before the ssh is the `scp` of `update.sh` | `deploy.sh:~276` |
| Profile values are checked on the box after persist-or-reuse | `setup-profile.sh:692-781`, `:820+` |
| Phase 1 reports exactly 6 dead game keys as INFO (`BASIC_AUTH_USER/PASS`, `DOCKER_TOKEN`, `OTEL_USERNAME/PASSWORD/ENDPOINT`) | real-tree test, `ConfigParity.test.ts:1472` |
| Static no-leak tests: checker source has no `process\.env` and no `.env` path literal | `ConfigParity.test.ts:1383-1398` |
| An env var set to empty bypasses `??` defaults (for example `ADMIN_TOKEN ?? "dummy-admin-token"`), and the app `trim()`s URL/protocol values | `DefaultConfig.ts:84-200, 235` |
| `JWT_ISSUER` and `API_BASE_URL` fall back to values derived from the audience when blank | `DefaultConfig.ts:141-185` |
| The deploy runs under `/bin/bash` 3.2 on the owner's Mac. `${!name}`, `[[ =~ ]]` and `printf '%s\0'` all work there | run locally |
| WHATWG `URL` normalizes IPv4 forms (`https://2130706433` → `127.0.0.1`, `https://1.2.3` → `1.2.0.3`), and IPv6 hostnames come back bracketed | run locally, Node 24.13.0 |
| Precedent for extracting a function from a script and testing it: awk from `name() {` to the first `}` at column 0, then eval | `tests/profile-backup-redeploy.sh:32-43` |
| No shell harness runs game `deploy.sh`. The hardening harness only touches `build-deploy-*` | grep |

## 2. What the value checker decides
For each heredoc line `KEY=${SRC}` (or `$SRC`), the value is the `SRC` record from stdin.
- **Checked set** = heredoc keys, **minus** keys Phase 1 calls dead (`analyse().pipelines.game.info`), **minus** game `phase: 2` allowlist entries with class `optional`.
  - Dead keys are exempt because a key nothing reads can't be "required". This avoids re-deciding the Phase 1 Q5 ruling (the owner declined to pre-allowlist them as dead).
  - **If the Phase 1 analysis is incomplete** (any PARSE-FAILURE, DYNAMIC-READ or SKIP), nothing is exempted as dead. The checker prints one line saying so, and errs toward reporting.
- **Non-empty rule (item 5):** after `trim()` (the app trims too), an empty value in the checked set is **REQUIRED `— forwarded but EMPTY`**. It applies in every deploy env.
- **Blank optional key:** reported as `OPTIONAL <NAME> — blank by recorded decision`. It is named and visible, but not a finding.
- **Format rules (item 6, exactly Q5's list, only when `--deploy-env=prod`, only on non-empty values):**
  - `PUBLIC_PROTOCOL` must equal `https` after trim. It is case-sensitive, because the app compares `=== "https"`. "No bare IP" doesn't apply here: this value is a scheme, not a URL.
  - `API_BASE_URL`, `JWT_ISSUER`, `PROFILE_API_URL`:
    - must start with lowercase `https://` (case-sensitive, matching the app's `startsWith("https://")`);
    - must parse with `new URL`;
    - the hostname, brackets stripped, must not pass `net.isIP` (this catches normalized IPv4 and IPv6).
    - One finding per key lists every failed rule.
  - An empty required key gets only the "EMPTY" finding, not a second format finding.
- **VALUE-UNKNOWN (loud):**
  - a heredoc line whose right-hand side is not a plain `${NAME}` (for example `${A:-x}` or `${A}-${B}`);
  - a listed source that is missing from stdin (a wiring fault, not the same as an empty value);
  - a malformed stdin stream (odd record count or a duplicate name).
- **PARSE-FAILURE:** a heredoc parse failure (reuses Phase 1's `parseHeredocKeys`), bad allowlist JSON, or a game `phase: 2` entry whose class is not `optional`.
- **SKIP:** a missing input.
- **INFO:** a game `phase: 2` entry naming a key the heredoc doesn't forward (stale entry).
- **Never printed:** any value, any value excerpt ("starts with", scheme, IP), or any length. Verdicts are fixed wording, for example *"must be an https URL — it is not"* and *"must not be a bare IP address — its host is an IP literal"*.

**Output (text):**
```
── config value guard (report-only) · deploy env: prod ─────────
pipeline: game   (profile values are checked on the box: setup-profile.sh report_config_values, task 0220)
REQUIRED  1
          JWT_ISSUER — must be an https URL — it is not; must not be a bare IP address — its host is an IP literal
OPTIONAL  1  PROFILE_INTERNAL_TOKEN — blank by recorded decision (scripts/config-parity-allowlist.json)
OK        22
UNCHECKED 6  no consumer (see the parity guard's INFO line)
report-only — exit 0, this cannot fail a deploy
```
`--json` produces `{mode, deployEnv, required[{name,rules[],detail}], optional[{name,reason}], ok[names], unchecked[names], valueUnknown[], parseFailures[], skips[], info[], requiredTotal}`. It carries names and fixed text only.

**Exit contract (mirrors Phase 1):**
- `--report-only` exits 0 on every analysis outcome.
- `--enforce` exits 1 on REQUIRED, VALUE-UNKNOWN, PARSE-FAILURE or SKIP. It is built and tested but **wired to nothing**; wiring it belongs to `0298`.
- Bad or missing arguments (including a missing or invalid `--deploy-env` ∈ dev|staging|prod) exit 2.
- The call site's `|| true` is the absolute guarantee, as in Phase 1.

**Modes:**
- `--list-sources` prints the validated source names, one per line, sorted and de-duplicated, and nothing else on stdout. On a parse failure it exits 1 with the message on stderr and an empty stdout.
- `--values-stdin` does the check. It only reads stdin when this flag is given, so an interactive run never blocks.

The script uses the same `--repo-root=` and `--<input>=` overrides as Phase 1, so tests can point it at fixtures. It has no dependencies (`node:fs`, `node:path`, `node:net`, `node:url`).

## 3. Changes, file by file
| File | Action | Size | Notes |
|---|---|---|---|
| `scripts/check-config-values.mjs` | **new** | ~280 lines | §2. Header states its own no-leak contract (stdin in, names out). Has no `process.env` and no `.env` literal (the static tests are extended to it). |
| `scripts/check-config-parity.mjs` | edit, **no behaviour change** | ~12 lines | Add `export` to `INPUT_DEFAULTS`, `parseHeredocKeys`, `loadAllowlist` and `analyse`. Pull the inline game heredoc anchor/delimiter out into an exported `GAME_HEREDOC` constant that `analyse` uses. Make the last line `if (!globalThis.CONFIG_PARITY_AS_LIBRARY) process.exitCode = main(...)`. The value checker sets the flag, then does `await import(...)`. **This seam fails loudly:** if the flag is ever missing, main runs and prints a report, which is never silent. I chose this over an argv/realpath check, whose failure mode is silence. |
| `scripts/config-parity-allowlist.json` | edit | +6 entries, 2 text edits | Six `game` / `phase: 2` / `optional` entries, each with evidence, listed in §4. Reword the `_comment` so phase 2 means value entries (never suppress a name finding; on game they let the value checker accept a BLANK; profile values are checked on the box). Fix the now-stale `YANDEX_PAYMENTS_SECRET` sentence *"becomes live when the Phase 2 non-empty check exists"* so it points to 0220's on-box report instead. |
| `deploy.sh` | edit | ~30 lines | Define `run_config_value_guard()` beside the Phase 1 block, with its closing `}` at column 0 (for the awk extraction). Call it on the line **before** `print_header "EXECUTING UPDATE SCRIPT ON SERVER"`. Body: `-f` checker and `command -v node` guards → `sources=$(node … --list-sources) \|\| sources=""` → if empty, print one skip line and return 0 → `{ for name in $sources; do [[ $name =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] \|\| continue; printf '%s\0%s\0' "$name" "${!name-}"; done; } \| node … --values-stdin --deploy-env="$ENV" --report-only \|\| true`. The regex guard stops `${!name}` from evaluating array-subscript code such as `a[$(cmd)]`. The comments state the different safety story (runs after load, values on stdin, names out). No comment line may match the Phase 1 heredoc anchor regex `^\s*cat\s*>.*<<\s*'?EOL'?\s*$`. |
| `tests/scripts/ConfigValues.test.ts` | **new** | ~450 lines | §5. It is a separate file from `ConfigParity.test.ts`, which `0203` edits. |
| `tests/scripts/ConfigParity.test.ts` | edit | ~12 lines | Update the pinned `inertAllowlist` list (+6 game names). Add one test: the parity checker still prints its report when run by relative path from another cwd and through a symlink (guards the library-flag seam). |

**Not touched:** anything under `src/`, `build-deploy-profile.sh` and `setup-profile.sh` (so the hardening shell harness can't go red), `package.json` (a stdin-fed checker has no useful npm script), and `CLAUDE.md`. No new `.sh` harness file, so the "hardcoded harness list" residual doesn't grow.

## 4. The value allowlist: 6 proposed `optional` (blank allowed) game entries. Needs owner approval (Q1)
| Key | Evidence |
|---|---|
| `PROFILE_INTERNAL_TOKEN` | Owner ruling 2026-09-04: deliberately blank until citizenship goes live. `ProfileApiClient.ts:187` is fail-soft. **Remove the entry at `0217` go-live**, which makes it required non-empty. |
| `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` | Read in `DefaultConfig.ts:214+`, but they have **no caller anywhere** (same evidence as their `server-only` client entries). |
| `FEEDBACK_WEBHOOK_URL` | `Master.ts:211,259`: sends only if set. Telegram is the channel in use. |

**Deliberately left unlisted, so REQUIRED when blank:**
- `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`: a blank proxy is `0061`'s leading suspect, the motivating case for item 5. Listing it would hide it.
- `API_KEY`, `PROFILE_API_URL`, `JWT_ISSUER`, `API_BASE_URL`, `JWT_AUDIENCE`, `ADMIN_TOKEN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_AUTH_HEADER`.
- The always-set ones: `GAME_ENV`, `ENVIRONMENT`, `DEPLOYMENT_ID`, `DOCKER_IMAGE`, `PUBLIC_HOST`, `PUBLIC_PORT`, `PUBLIC_PROTOCOL` (deploy.sh defaults them).

## 5. Tests (`npm test`, jest). Key assertions are proved by mutation during the build and recorded in the worklog
**A. `--list-sources`**
- On the real `deploy.sh` it gives the exact 29 sources.
- A fixture `KEY=${A:-x}` line is excluded from the list and becomes VALUE-UNKNOWN in the check.
- A fixture with a parse failure exits 1 with an **empty stdout**.

**B. Step 2 (`0063`)** (prod):
- `JWT_ISSUER=http://10.1.2.3` → REQUIRED `JWT_ISSUER`, both rules.
- Each of the 4 keys individually. `PUBLIC_PROTOCOL=http` → REQUIRED.
- Each of `https://1.2.3`, `https://2130706433`, `https://[::1]` → bare-IP finding.
- `HTTPS://api.example.test` → not-https.
- `not a url` → not-a-url.
- `https://api.example.test` → OK.
- The same `http` values under `staging` → no format finding.

**C. Step 3 / step 1 non-empty half:**
- Generic empty → REQUIRED. Whitespace-only counts as empty.
- **`PROFILE_INTERNAL_TOKEN` blank with a fixture allowlist that lacks its entry** → REQUIRED `— forwarded but EMPTY`.
- The same value with the **shipped** allowlist → an `OPTIONAL PROFILE_INTERNAL_TOKEN` line, not REQUIRED, and `--enforce` exits 0 when everything else is clean.

**D. Step 4:** a clean prod-shaped value set for the real heredoc gives REQUIRED 0, no VALUE-UNKNOWN or PARSE-FAILURE, and `--enforce` exits 0. Fake values only (`*.example.test` hosts, token `x`).

**E. Step 5 (values):**
- A blank optional key does not fire; a blank unlisted key does.
- A `phase: 1` entry does not exempt a value.
- A profile `phase: 2` entry does not exempt a game value.
- Dead keys are UNCHECKED.
- A fixture with a DYNAMIC-READ turns off the dead-key exemption, prints the line, and the dead keys become checked.
- A non-`optional` phase-2 game class gives PARSE-FAILURE.
- A stale phase-2 entry gives INFO.

**F. Step 6 enforce half:**
- The same seeded input exits 0 under report-only and 1 under `--enforce`.
- A clean input exits 0 under `--enforce`.
- VALUE-UNKNOWN, a malformed stream, or a missing `deploy.sh` each give 1 under `--enforce` and 0 under report-only.
- Bad or missing `--deploy-env` exits 2.
- The footer and the exit code agree (the Phase 1 R16 pattern).

**G. Step 7:**
- Every source gets a **distinct** canary. URL canaries sit in the path and the userinfo, and the IP is canary-ish (for example `10.93.71.44`).
- Text and JSON output, plus the malformed-stream and duplicate-name paths: assert no canary and no IP string appears in stdout or stderr.
- Static tests on the new file: no `process\.env`, no `.env` path literal.
- The value output never contains the parity report header (proves the library flag works).

**H. `deploy.sh` wiring, a prod-shaped run through the real script's function:**
- awk-extract `run_config_value_guard` from the real `deploy.sh` and run it under **`/bin/bash`** (3.2), with `$0` set to the real `deploy.sh`.
- Use **non-exported** shell variables, which is the reason for this design: `ENV=prod`, `JWT_ISSUER=http://10.1.2.3`, `PROFILE_INTERNAL_TOKEN=`, everything else clean.
- Expect: REQUIRED names `JWT_ISSUER`, an OPTIONAL line names `PROFILE_INTERNAL_TOKEN`, exit 0, and no canary in the output.
- With the checker absent (`$0` in a temp dir), it skips silently and exits 0.
- **Injection test:** a fake checker in a temp dir prints `a[$(touch PWNED)]` from `--list-sources`. Assert no `PWNED` file is created.

**I. Real tree:**
- Every game `phase: 2` entry names a forwarded heredoc key.
- Every heredoc line can be evaluated.
- The shipped allowlist still passes the Phase 1 well-formedness and source-path-resolution tests.

**Then:** full `npm test` (expect about 25 s including the shell harnesses; the known `supertest` flake rules in CLAUDE.md apply: re-run, and say so), `npm run lint`, and a Prettier check on the touched files.

## 6. Order of work
1. Parity seam (exports, `GAME_HEREDOC`, library flag). Run `ConfigParity.test.ts` and confirm 83 still pass (no behaviour change).
2. `check-config-values.mjs` plus its fixture tests (A–G).
3. Allowlist entries, then the real-tree tests (I) and the pinned inert-list update.
4. `deploy.sh` wiring, then test H.
5. Full `npm test` and lint. Mutation proofs go in the worklog. Any fix made without asking is logged in the worklog decision log.

## 7. Verification steps: status after this task
| # | Status |
|---|---|
| 1 non-empty half | ✅ on fixtures (C). In the **shipped** config a blank token is **visible but not failing**, by ruling. |
| 2 | ✅ fixtures plus the real-`deploy.sh` wiring run (B, H) |
| 3 | ✅ generic and `PROFILE_INTERNAL_TOKEN` specifically (C) |
| 4 | ✅ on a prod-shaped fixture (D). **Not proved against the real `.env.prod`**: that is `0298`'s run. Output is not literally silent (OK, OPTIONAL and UNCHECKED count lines). |
| 5 | ✅ (E) |
| 6 enforce half | ✅ fixtures (F). `--enforce` wired to nothing. |
| 7 | ✅ (G, H). `set -x` is still absent (existing test). |
| 8 | ➡ `0298` |

## 8. Risks and ordering
1. **Order relative to `0203`, which comes next and edits the same file.**
   - `0203` must keep: the four exports, `GAME_HEREDOC`, the library flag, and `pipelines.game.info[].name`, plus `.length` on `parseFailures`, `dynamicReads` and `skips`.
   - Per-pipeline tagging that turns those lists into objects is fine, because `.length` survives.
   - Tests E, I and the seam test turn red if the seam breaks.
   - R13 (return parsed keys even on failure) needs no change here: the value checker judges each body line on its own and prints any PARSE-FAILURE.
   - Phase 2 does not touch `analyse` logic, `render`, `failsClosed` or `collectEnvReads`.
2. **Crying wolf on the first real run.** Which required keys are blank in `.env.prod` is unknown (§ Summary). Because the check is report-only, the cost is a printed line. `0298` Part A reads it, and each finding it doesn't understand becomes a new brief, not a quiet allowlist entry.
3. **Placement for `0298`'s enforce.** The check sits after the `scp` of `update.sh` (one benign remote write). I chose accuracy over running earlier. `0298` should decide whether that is acceptable when it arms. Also, under R4b a missing checker "stops the deploy". Today's `-f` skip here is report-only and `0298` changes it.
4. **Saturday 2026-09-26 window.** If Phase 2 is finished and in the tree at W12, `./build-deploy.sh prod` ships it and the deploy runs it report-only. That is Phase 2's first real run, and it saves `0298` an extra deploy. If it is unfinished, the brief says it must sit on a branch at W12.
5. **Known limits of the approved list (not widened, per "nothing else"):**
   - A bare-IP `PUBLIC_HOST` is **not** checked. `deploy.sh` defaults it to `SERVER_HOST`, which may be an IP. So `0063`'s "http on a raw IP" is caught through `PUBLIC_PROTOCOL`, `API_BASE_URL`, `JWT_ISSUER` and `PROFILE_API_URL`, but not through `PUBLIC_HOST`.
   - A value containing a line break (residual R2) is not checked.
6. **Observation, not fixed here (guard, not fix):** a blank `ADMIN_TOKEN` becomes `""`, not the `?? "dummy-admin-token"` default (`DefaultConfig.ts:235`). This is security-relevant. It is REQUIRED in the proposed list, so the guard would name it. Candidate new brief.
7. **Hand-off for the producer:** `0217` go-live must remove the `PROFILE_INTERNAL_TOKEN` entry. I can't record that in `0217`'s brief myself.

---

## Owner amendments at approval — 2026-09-23, live via `AskUserQuestion` in the `fkit lead` session (relayed by `fkit-lead`, `fkit-sprint-ship-loop`)

The plan above is approved **with these four amendments, which win over any conflicting line above**:

1. **Q1 — `PROFILE_INTERNAL_TOKEN` is NOT an `optional` (blank-allowed) entry.** Owner, verbatim: *"I don't think we can allow the PROFILE INTERNAL TOKEN to be empty anymore, because this token is a requirement for the profile/citizenship logic to work properly"*. So §4 ships **five** `game` / `phase: 2` / `optional` entries (`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `FEEDBACK_WEBHOOK_URL`), and a blank `PROFILE_INTERNAL_TOKEN` is **REQUIRED — forwarded but EMPTY**. Superseded above: the Summary bullet "A blank `PROFILE_INTERNAL_TOKEN` is shown by name as OPTIONAL", the §2 sample output's `OPTIONAL … PROFILE_INTERNAL_TOKEN` line, the §4 `PROFILE_INTERNAL_TOKEN` row, test C's "shipped allowlist → OPTIONAL" expectation (now: shipped allowlist → REQUIRED; keep a fixture proving an `optional` entry would suppress it), test H's expected OPTIONAL line (now REQUIRED), the pinned inert-list count (+5, not +6), and §8 item 7. This supersedes the 2026-09-04 "deliberately blank" ruling **for the value check**; record that in `worklog.md` — the producer records it in the briefs.
2. **Q2 — game side only**, as planned (profile values stay with `0220`'s on-box report).
3. **Q3 — the non-empty rule applies to PRODUCTION deploys only** (`--deploy-env=prod`), like the format rules. Owner answer: *"Production only"*. Under `dev`/`staging` the checker raises no value finding. Superseded above: §2 "It applies in every deploy env". Adjust the tests (an empty required value under `staging` → no finding; under `prod` → REQUIRED).
4. **Saturday 2026-09-26** — owner chose *"Approve, ride Sat if done"*: if Phase 2 is finished and green before W12 it may stay in the tree and ride the deploy report-only (its first real run); if unfinished, the owner moves it off the tree before W12.
