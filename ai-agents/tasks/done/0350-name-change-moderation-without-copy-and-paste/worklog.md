# Worklog — 0350: name-change moderation without copy-and-paste (shape A1)

## 2026-10-15 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as Build worker)

Implemented the approved `plan.md` (blob `13cf11ce…`, not edited), as amended by the owner's rulings below.
No commit, no deploy, no SSH, no wiki write, no task-status change.

### What changed
- `src/profile-server/NameChangeDecideCommand.ts` — mechanical refactor: exported `checkInternalToken`,
  `postNameChangeDecision` (returns `answer` / `no_answer`, detail already token-redacted) and
  `describeNoAnswer`; `runNameChangeDecide` rebuilt from them. Same signature, output and exit codes.
  `tests/profile-server/NameChangeDecideCommand.test.ts` is **unmodified** and green.
- `src/profile-server/NameChangeRepository.ts` — `visibleRequestedName` (plain text) split out of
  `describeRequestedNameForModerator`, which is now that plus `escapeTelegramHtml` (output unchanged, pinned).
  Paste lines (`decideCommandLines`) untouched.
- New `src/profile-server/NameChangeReviewCommand.ts` — `NEXT_PENDING_SQL`, `fetchNextPending`,
  `formatReviewCard`, `runNameChangeReview`, `REVIEW_NPM_SCRIPT`, `reviewCommandLine()`, `EXIT_INTERRUPTED` (130).
- New entry `src/profile-server/reviewNameChanges.ts` (testerRole.ts shape; readline `terminal: true`,
  `SIGINT` → `stop.requested`).
- `package.json` — `name-change:review` script.
- Runbook `ai-agents/knowledge-base/name-change-digest-runbook.md` — top pointer, new first subsection
  "Deciding everything waiting: the walk-through command (task 0350)", paste lines marked fallback,
  list-only section points to the walk-through first, owner-run verification steps.
- Tests: new `tests/profile-server/NameChangeReviewCommand.test.ts`; `visibleRequestedName` block in
  `tests/profile-server/NameChangeRepository.test.ts`; `fetchNextPending` block in
  `tests/integration/NameChange.it.test.ts`.

### Evidence (this Build step)
- `npm test -- tests/profile-server/NameChangeReviewCommand.test.ts tests/profile-server/NameChangeDecideCommand.test.ts tests/profile-server/NameChangeRepository.test.ts tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRoutes.test.ts`
  → 5 suites, 396 tests passed.
- `npm run lint` → clean.
- `npx tsc --noEmit -p tsconfig.json` → no errors.
- `npm run check:config-parity` → profile pipeline REQUIRED 0, INFO 0 (no new finding).
- `npm run test:integration` (local `gc-0012-it-pg`, started for the run and stopped again after) → 13 suites,
  181 tests passed, including the 3 new `fetchNextPending` tests.
- Smoke, real entry, no TTY: `echo a | npm run -s name-change:review` → refusal naming `-T`, exit 2.
- Smoke, real entry under a pseudo-terminal (`expect`), against the throwaway test DB, port with nothing listening:
  unknown key → re-ask; `a` then `n` → "Not approved. Nothing was sent."; `r` then empty line → back to the choice;
  `a` then `y` → "No answer … may or may not have been applied", "Stopped.", exit 1; Ctrl-C at the reason → exit 130
  with summary; Ctrl-D → exit 0 with summary. Token string never in output.
- **Not run here:** the full `npm test` — deliberately left to the separate Verify step (driver note 3).
- **Not proven (box-only, for the verify task):** Ctrl-C and Cyrillic input through SSH + `docker compose exec`
  + `npm run`; ts-node start-up on the low-RAM box; an SSH drop mid-POST.

## Decision log

### Owner rulings given at plan approval (2026-10-15, live `AskUserQuestion` in the driver session, relayed by `fkit-sprint-ship-loop`)
1. **Keys — "Approve asks y/N first".** Keys stay `a / r / s / q`; `a` asks `Approve «<visible name>»? y/N`.
   Only `y`/`Y` sends; Enter, `n` or anything else prints "Not approved. Nothing was sent." and asks the choice
   again. Ctrl-C / EOF at the confirm behave as at the main prompt (nothing sent for that request).
   Implemented in `askChoice`; tests: "approve confirm" block; runbook key table updated.
2. **Telegram — "No, runbook only".** No Telegram message changed.
3. (Driver note, not an owner ruling.) No full `npm test` in Build; targeted tests + lint only.

### Obvious-winner calls made without asking (each within the approved plan's intent)
- **`formatReviewCard` takes a `position` argument** (plan signature listed `entry, waitingTotal, now`). The card's
  "Request N" needs the position; `waitingTotal` lives on the entry. Pure shape detail, no behavior beyond the plan.
- **"Still waiting" in the summary comes from one fresh read** (`nextPending([])`) at summary time, so it counts
  skipped requests and anything decided elsewhere correctly. If that read fails it prints
  "unknown (could not read the queue)". It is a read only — no POST — so plan test 17's "no further fetch" holds.
  The system-error stop (plan step 5) prints no summary, so plan test 15's "no further nextPending call" holds.
- **Reason prompt: friendly local messages for placeholder / over-500**, then `parseDecideInput` as the final gate.
  `parseDecideInput`'s own texts name the env vars (`NAME_CHANGE_REASON`), which would confuse at a prompt.
  Same limits (`REASON_PLACEHOLDER`, `MAX_REJECTION_REASON_LENGTH`). A whitespace-only line counts as empty → back.
- **A `parseDecideInput` failure on a database row stops the run (exit 1).** Not reachable with a real row
  (uuid column, string name); treated like the plan's other "system-level" stops rather than silently skipping.
- **A database error reading the queue stops the run (exit 1)** with "Could not read the waiting requests …",
  error text reduced to printable ASCII. The plan did not name this case; stopping matches its system-error rule.
- **Choice keys are case-insensitive** (`Q` quits); the confirm accepts only `y`/`Y` (trimmed), per ruling 1.
- **The non-TTY refusal prints the exact command to run** (`reviewCommandLine()`), giving that constant a real
  consumer; the runbook test checks the runbook line equals it with the path shown as `<profile dir>`
  (the runbook's existing placeholder convention).
- **Player id printed raw only if it matches `[A-Za-z0-9_-]+`**, else escaped — belt and braces, same charset check
  as `decideCommandLines`.
- **Runbook verification step 4** (Ctrl-C and a Cyrillic reject reason on the box) added beside brief steps 1-3:
  the plan's "Known limits" say these belong to the verify task.
- **Started the stopped local `gc-0012-it-pg` container** to run the integration suite, then stopped it again.
  Plan: "runs only if the local container and `.env.test` are available" — both existed; the container was only
  stopped. Local, throwaway test DB only.

### Review fixes applied unattended
- none (Build step; no review yet).

### Review round 1 — fixes applied unattended (Process-review worker, spawned by `fkit-sprint-ship-loop`, 2026-10-15)
- **R1** (Ctrl-C during a send + a stopping answer → exit 1, no summary; runbook promised 130 and "never unknown").
  Changed: runbook § "Ctrl-C and Ctrl-D" now states the code's actual behavior (Ctrl-C mid-send → 130 + summary,
  except a stopping answer → `Stopped.`, no summary, exit 1; "never unknown" replaced, no answer / 500 still unknown);
  `runNameChangeReview` docstring states the precedence; new test in `NameChangeReviewCommand.test.ts`
  ("while a decision is being sent that gets %s: the error stop wins") pins it. **No code behavior changed.**
  Why it qualified: verified CORRECT; docs + one test, localized; inside plan § 6 (runbook covers Ctrl-C and the
  system-error stop). **Obvious-winner call within plan intent:** keep the code's precedence (error stop wins) rather
  than make it exit 130 — plan § 3 step 5 says those answers "stop the run, exit 1" with no exception, and exit 1 is
  the signal to run the read-only check; changing it would be a behavior change the plan does not ask for.
- **R3** (Ctrl-D only quits on an empty line). Changed: runbook § "Ctrl-C and Ctrl-D" Ctrl-D line. Why it qualified:
  verified CORRECT by measuring node readline in a pty this round; docs only; inside plan § 6.
- **R2 not applied at first** — frontier against the plan's explicit "print the existing escaped message" /
  "result line comes from `describeDecideResponse`"; returned as `NEEDS-DECISION`.
- **R2 — owner-ruled change (not an unattended call).** Owner ruling 2026-10-15, live `AskUserQuestion` in the
  driver session, relayed by `fkit-sprint-ship-loop`: "Fix all, review cmd only (Recommended)". Changed:
  `NameChangeReviewCommand.ts` — new `describeReviewResponse` (wraps `describeDecideResponse`, same exit codes;
  rewords 409 name_mismatch to the owner's text with no `\uXXXX`, 400 without "copy the command again", 401 without
  "exactly as pasted") and `walkThroughTokenRefusal` (missing-token refusal without "exactly as pasted");
  `NameChangeReviewCommand.test.ts` — name_mismatch test updated, new no-paste-wording `it.each`, token-refusal
  test asserts no "pasted"; runbook § walk-through "What the answer means" sentence. `name-change:decide` output
  unchanged: `NameChangeDecideCommand.test.ts` unmodified (git diff empty) and green.
  Evidence: same 3 targeted suites → 300/300 passed; `npm run lint` exit 0; `npx tsc --noEmit` exit 0; prettier clean.
- Evidence: `npm test -- tests/profile-server/NameChangeReviewCommand.test.ts tests/profile-server/NameChangeDecideCommand.test.ts tests/profile-server/NameChangeRepository.test.ts`
  → 3 suites, 297 passed (295 + 2 new). `npm run lint` → exit 0. Prettier check on both touched TS files → clean.
  Full `npm test` not run (driver re-verifies).

## Verify step (2026-10-15)
Spawned by `fkit-sprint-ship-loop` (Verify worker). No source written; this section is the only edit.

- Targeted (plan § Local verification step 1): `npm test -- tests/profile-server/NameChangeReviewCommand.test.ts
  tests/profile-server/NameChangeDecideCommand.test.ts tests/profile-server/NameChangeRepository.test.ts
  tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRoutes.test.ts`
  → 5 suites passed, 396 tests passed.
- `npm run lint` → exit 0, no output.
- `npm run check:config-parity` → exit 0; profile pipeline REQUIRED 0, INFO 0. Game (INFO 6) and client
  (INFO 1, INERT 12) lines name none of this task's env vars.
- **Full `npm test`, run 1 → RED:** 1 failed / 227 passed suites; 1 failed / 4751 passed tests; 89 s; exit 1.
  Failure: `tests/profile-server/SshAlerts.test.ts` › "answers 429 once the route's own limiter is exceeded"
  → `socket hang up`. `ShellHarnesses.test.ts` passed (51.7 s).
  - Flake rule: no `SIGSEGV` in the log; no `node-*.ips` in `~/Library/Logs/DiagnosticReports/` → not `0197`.
    The suite uses `supertest` (its own header says so); `socket hang up` is a listed supertest-family shape
    (CLAUDE.md: "seen, never traced"). The test makes 61 sequential supertest requests. File not touched by
    0350 (last change: commit 779ddc2, task 0443). Judged: likely the known flake, not certain.
- **Full `npm test`, run 2 (re-run once under the flake rule) → GREEN:** 228/228 suites, 4752/4752 tests,
  93.7 s, exit 0. `ShellHarnesses.test.ts` passed (53.8 s); nothing reported skipped.
- **Not run in this step:** `npm run test:integration` (Build ran it green: 13 suites / 181 tests; run 1's
  failure was not integration-adjacent); the non-TTY smoke `echo a | npm run -s name-change:review` (Build ran it).
- Box-only limits from plan § Known limits stay unproven (verify task).

## Re-verify after review round 1 (2026-10-15)
Spawned by `fkit-sprint-ship-loop` (post-review re-verify). No source written; this section is the only edit.

- Targeted: `npm test -- tests/profile-server/NameChangeReviewCommand.test.ts tests/profile-server/NameChangeDecideCommand.test.ts
  tests/profile-server/NameChangeRepository.test.ts tests/profile-server/NameChangeDigest.test.ts
  tests/profile-server/NameChangeRoutes.test.ts` → 5 suites passed, 401 tests passed (was 396 at Verify step; +5 from round-1 tests).
- `npm run lint` → exit 0, no findings.
- `git diff --quiet -- tests/profile-server/NameChangeDecideCommand.test.ts` → exit 0 (unchanged vs HEAD).
- Smoke: `echo a | npm run -s name-change:review` → "Refused: this command asks questions; run it with a terminal …
  Nothing was sent.", exit 2.
- **Full `npm test`, one run → GREEN, first try (no re-run):** 228/228 suites, 4757/4757 tests, 89.0 s, exit 0.
  `ShellHarnesses.test.ts` passed (53.0 s); nothing reported skipped; no lock wait; no `SIGSEGV`, no `node-*.ips`.
- **Not run:** `npm run test:integration`; `npx tsc --noEmit` (lint + jest/SWC only — SWC does not type-check).
