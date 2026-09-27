# Worklog — 0312: a working, documented operator command to approve AND reject a name change

## 2026-09-27 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Build worker)

Built the approved `plan.md` (blob `cc66cf49e151e0e1f033cade19a776b7620f6080`), steps 1–9. Nothing
committed. Task status and `plan.md` untouched.

### Owner ruling on the Step 0 question — recorded verbatim (brief verification 1)

Given 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:

- Question: "How should the Telegram name-change message let you approve or reject? (You run it on the profile server after SSH-ing in; the secret token is never typed or shown.)"
- Answer: **"Built-in command (Recommended)"** — option text: "Two short ready-to-paste lines (Approve, Reject) calling a small command shipped inside the profile server. Tested like normal code, and it can never get out of step with the server after a rollback."

Plan approval (the Build worker's standing approval): the owner answered **"Approve (Recommended)"** to
"Approve the 0312 plan (built-in Approve/Reject command run on the profile server, two ready-to-paste
Telegram lines, runbook, tests) so a coder can start building?" — same session, same day, relayed.

### What 0312 changed (kept apart from 0307/0302's uncommitted work in the same tree)

| File | 0312 change |
|---|---|
| `src/profile-server/NameChangeDecideCommand.ts` | **new.** Shared constants (compose file, service, npm script, env names, placeholder), `parseDecideInput`, `describeDecideResponse`, `escapeForTerminal`, `runNameChangeDecide` (fetch injected). |
| `src/profile-server/decideNameChange.ts` | **new.** Entry file, digest shape. Imports only `./NameChangeDecideCommand` + `./ProfileEndpoints`. |
| `package.json` | one script: `name-change:decide`. |
| `src/profile-server/NameChangeRepository.ts` | `buildDecideCommandBody(…, decision = "approve")`; `decideCommandLines` now emits the two box commands (laptop `curl` removed); new exported `buildOperatorNotificationText` (see decision log); doc comments. 0307's escape rule and F3 display are byte-unchanged. |
| `src/profile-server/Routes.ts` | comment only (decide route). |
| `scripts/config-parity-allowlist.json` | `NAME_CHANGE_DECISION`, `NAME_CHANGE_REASON` — profile, runtime-supplied, phase 1. |
| `ai-agents/knowledge-base/name-change-digest-runbook.md` | top pointer + new section *Deciding a request: approve or reject (task `0312`)*. |
| `tests/profile-server/NameChangeDecideCommand.test.ts` | **new**, 37 tests. |
| `tests/profile-server/NameChangeRepository.test.ts` | 0307's curl-shaped assertions retargeted; new Approve+Reject, reject-body, real-bash, HTML-validity and 4096 tests. |
| `tests/integration/NameChange.it.test.ts` | one new case: parsed Reject body → real route → 200, row rejected with the reason. |

**0307 re-check (brief: "whichever lands second re-checks the other").** 0307's F2 (`buildDecideCommandBody`'s
escape) is byte-unchanged; the name still travels only as that pure-ASCII body inside `'…'`. F3
(`describeRequestedNameForModerator`, the `⟨U+XXXX⟩` display) is untouched. 0307 tests changed:
only the ones pinned to the old curl line (`"$PROFILE_INTERNAL_TOKEN"` / `not.toContain("curl")`, and
"inside the '…' of the curl line"), retargeted to the new lines as the plan says. Every other 0307 test
passes as it was. **The reviewer should still re-check F2/F3 independently** — this is the author's claim.

### Evidence

- `npm test`: **first run 1 failed** — `tests/profile-server/TenureGrantRoutes.test.ts`, "503
  session_unavailable…", `expected 503, got 401`. A supertest suite with a response-carrying shape
  (CLAUDE.md: "401 … mechanism unknown" family); no `SIGSEGV`. Unrelated route; passed 3/3 alone.
  **Re-ran the full suite once: 157/157 suites, 2477/2477 tests passed.** I re-ran; I did not fix.
- `npm run test:integration` (`.env.test` exported, `gc-0012-it-pg` up): **first run 1 failed** —
  `socket hang up` in `NameChange.it.test.ts` › "refuses a case-insensitively duplicate name…" (the
  known supertest family; not a 0312 test). **Re-ran once: 11/11 suites, 135/135 passed**, including the
  new 0312 case.
- `npx tsc --noEmit`: clean. `npm run lint`: clean. Prettier: new/edited code files clean (the runbook
  was already not prettier-clean at HEAD; not reformatted).
- Verification 2: with `decideCommandLines` temporarily put back to the pre-0312 body, the new
  "carries BOTH an Approve and a Reject command" test **fails**; restored, it passes.
- Local smoke of the real entry (`npm run -s name-change:decide` under ts-node, against a throwaway
  local HTTP stub on a loopback port, fake token): reject → exit 0 with the bound body and reason; a
  `409 name_mismatch` whose name holds ESC → zero ESC bytes printed; placeholder reason → exit 2,
  nothing sent; no server → exit 1, "may or may not have been applied".
- Verification 3: grep of the emitted text (tests) and the runbook — no token, hostname or IP (only
  `127.0.0.1`, loopback, in the command's own code/comments).

### Not verified

- **Live on the box (brief verification 4) — owner-only.** Nothing here ran in a real container, over
  SSH, or through Telegram. In particular unproven: `docker compose exec -e` on the box's compose version
  passing the value through as-is; ts-node start-up time of this entry on the low-RAM box.

### Decision log — calls made without asking (ADR-019 / ADR-032 audit)

Each: what, why it qualified (in-plan and mechanical, or an obvious winner within the plan's intent).

1. **Extracted `buildOperatorNotificationText(playerId, name, isoTime)`** (pure, exported) out of
   `notifyOperator`, which now calls it. Why: plan step 8 requires the 4096-limit test on "the whole
   message"; `notifyOperator` is private and only reached through a name the rule accepts. Same lines,
   same order — behavior unchanged. Obvious winner, within intent.
2. **Test mock of `escapeTelegramHtml` switched from an identity stub to the real function** in
   `NameChangeRepository.test.ts`. Why: plan step 8's "valid Telegram HTML" test is vacuous against an
   identity stub. No existing test depended on the stub (all pass). Obvious winner.
3. **The reason comes only from `NAME_CHANGE_REASON`**; a `reason` field inside the JSON is overwritten,
   not refused. Why: plan steps 3–4 intent ("so what is sent is what the operator typed"); no extra
   refusal path. Tested.
4. **"A reason is set" means non-blank** for the approve refusal (plan step 4): an empty
   `-e NAME_CHANGE_REASON=` on an approve is accepted. Mechanical reading of the plan.
5. **Placeholder check compares the trimmed reason** (catches `' REPLACE-WITH-REASON '`). In-plan step 3.
6. **`escapeForTerminal` duplicates 0307's 3-line escape regex** instead of refactoring
   `buildDecideCommandBody` to share it. Why: keeps 0307's code byte-unchanged (plan: "builds on 0307,
   does not undo it").
7. **`NameChangeDecideCommand.ts` does not import `ProfileEndpoints`** — the port is injected; the entry
   imports it. Narrower than the plan's "imports only" ceiling.
8. **Import-surface test also forbids `./Logger` and `./Db`** for both new files (plan named Server,
   Routes, Telemetry). Stricter, matches the entry's own header comment.
9. **Network failure always says "may or may not have been applied"**, even for `ECONNREFUSED`.
   Conservative wording within plan step 8.
10. **Extra local refusals covered by tests**: JSON array, non-uuid player id, unknown decision (all via
    the schema, as plan step 5), plus 500-exactly accepted and a non-JSON response body handled.
11. **Runbook additions beyond the plan's bullet list**: a *Rollback* note (an older image has no
    `name-change:decide` script), a *What it needs* list (names only), and an owner-verification list
    mirroring the plan's. All within step 7's intent.
12. **Integration case posts `JSON.stringify(input.request)`** — the parsed data, which is exactly what
    the command posts. Uses the plan's name `"Iv an"` (plain space).

## 2026-09-27 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Applied `fkit-process-stateful-review` steps 0–7 to `review.md` round 1 (R1–R3) under the loop's standing
approval (plan blob `cc66cf49e151e0e1f033cade19a776b7620f6080`, approved by the owner 2026-09-27). No per-fix
owner gate (the loop's up-front approval replaces it). Nothing committed; `plan.md` and task status untouched;
0307/0302 work in the tree not touched.

- Step 0: *Accepted residuals* empty. ADRs `adr-101`…`adr-114` skimmed — none covers the decide command's
  token handling, test harness or output escaping, so no finding was suppressed as settled.
- All three findings verified at the cited code and judged **CORRECT**; severities re-derived and agree
  (R1 low, R2/R3 nit). All three are defects, none a frontier-move; no regression or oscillation (first round).

### Evidence

- R1 reproduced independently before fixing: Node 24.13.0 `fetch` with an interior LF/CR/NUL in the
  Authorization value rejects with `Headers.append: "Bearer <value>" is an invalid header value.` — value
  quoted in full.
- Touched suites: `NameChangeDecideCommand.test.ts` + `NameChangeRepository.test.ts` — 174/174 pass.
- Mutation checks: removing the token refusal → 5 tests fail; removing the redaction → 1 fails; un-escaping the
  fallback code → 1 fails. Restored → all pass.
- Real-entry smoke: `npm run -s name-change:decide` with a fake LF-bearing token and a local port →
  exit 2, "Refused … cannot go in an HTTP header … Nothing was sent.", fake token appears 0 times.
- Full `npm test`: **157/157 suites, 2486/2486 tests passed on the first run** (no re-run needed).
- `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0 (a literal U+2028 I had typed into a test fixture tripped
  `no-irregular-whitespace` once; replaced by its ` ` escape). Prettier: touched files clean.
- `npm run test:integration`: **not re-run** — no integration test or route code changed this round.

### Decision log — fixes applied without asking (ADR-019 / ADR-032 audit)

1. **R1 (token can reach stderr).** Changed `src/profile-server/NameChangeDecideCommand.ts`:
   `runNameChangeDecide` now refuses (exit 2, nothing sent, value never named) a token containing any character
   outside printable ASCII `\x20-\x7E`; `describeNetworkError` takes the token and replaces every occurrence with
   `[token redacted]`; its false "can never reach the output" comment rewritten. Tests added in
   `tests/profile-server/NameChangeDecideCommand.test.ts` through Node's real `fetch` / `Headers`.
   **Why it qualified:** verified CORRECT (reproduced); mechanical and localized (one file, two guards, no
   behavior change for any token a header can carry — a printable-ASCII token is sent exactly as before); inside
   the approved plan — design step 6 promises the token is "never printed". Judgment within that: refusing
   non-ASCII too (not only CR/LF/NUL) — the reviewer's suggested direction, and a header-safe rule that does not
   depend on which characters a given Node version rejects.
   Test-only note: the redaction test re-throws Node's real `Headers` error message as a same-realm `TypeError`,
   because jest's vm context makes Node's own error fail `instanceof Error` (the real command runs in one realm,
   so this does not affect it).
2. **R2 (history-expansion test was vacuous).** Changed `tests/profile-server/NameChangeRepository.test.ts` only:
   the real-bash harness prepends `set -o history -H` and a primed history line; new control test shows the same
   preamble expands a double-quoted `"!!x!$"`. **Why it qualified:** verified CORRECT; test-only, localized; inside
   plan step 8 (the real-bash test "for 0307's hostile names plus `=` and `!`").
3. **R3 (fallback prints server `error` raw).** Changed `describeDecideResponse`'s unexpected-status fallback to
   print the code through `escapeForTerminal`; test added. **Why it qualified:** verified CORRECT; one-expression
   change; inside plan design step 8's intent that server-supplied text is printed escaped (as for
   `pending_name`).

No obvious-winner calls beyond these three fixes.
