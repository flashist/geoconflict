# Worklog — 0315: the daily digest lists the pending requests, not just the count

## 2026-09-27 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Build worker)

Building the approved `plan.md` (blob `980213e89cb727f5f74aa06bebae983f8315ca49`, 11609 bytes — hash
re-checked before starting), Steps 1–8. Nothing committed. Task status and `plan.md` untouched.

### Owner rulings, recorded verbatim (before any code)

Given 2026-09-26/27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead (ADR-021):

- **Q1 (brief Step 0 — list only, or list with commands?):** *"(a) List only, up to 20"* — no
  Approve/Reject lines.
- **Q2 (how the list relates to today's message), verbatim:** *"Always send the short message as it works
  today. And the next message with more text"*.
- **Plan approval (the Build worker's standing approval), 2026-09-27:** the owner answered
  **"Approve (Recommended)"** to *"Approve the 0315 plan (short heartbeat unchanged + a second list message
  on days with pending requests, up to 20, runbook section for acting on listed requests)?"*. That approval
  also covers the plan's two self-decided calls: **no list on empty days**, and **list only after the
  heartbeat succeeds**.
- Earlier (2026-09-26): *"Keep it"* — do the task at all (recorded in the brief's *Priority*).

### What 0315 changed (on top of 0307/0302/0312/0313's uncommitted work in the same tree — none of theirs touched)

| File | 0315 change |
|---|---|
| `src/profile-server/NameChangeDigest.ts` | New: `PENDING_LIST_CAP` (20), `PENDING_LIST_SQL`, `PendingNameChange`, `listPendingNameChanges`, `PENDING_LIST_MAX_LENGTH` (4000), `formatWaitingTime`, `formatPendingNameChangeList`, private `sendPendingList`; one call to it at the end of `runNameChangeDigest`, after the marker write and the existing info log. Imports `escapeTelegramHtml` and 0307's `describeRequestedNameForModerator`. Comments updated (header, marker-write note on the new zod cost, heartbeat formatter note, run-function note). **The only removed lines are comment lines** — `formatNameChangeDigest`, `PENDING_COUNT_SQL`, the heartbeat send/failure path and the marker path are byte-unchanged. |
| `tests/profile-server/NameChangeDigest.test.ts` | Escaping mock switched to the real `escapeTelegramHtml` (`jest.requireActual`); `fakePool`/`deps` answer the list query (default `[]`, so every pre-0315 case is unchanged); new describes for the list query, wait-time text, the formatter and the run flow (plan Step 5 list, plus a race-plus-budget case and a retry-is-success case). |
| `tests/integration/NameChange.it.test.ts` | Import of `PENDING_LIST_CAP`/`listPendingNameChanges`; one new case inside the 0283 digest block: two pending + decided history rows list exactly the two pending, oldest first, by internal id; `limit` honoured. |
| `ai-agents/knowledge-base/name-change-digest-runbook.md` | Top pointer; new *The second message: the list* subsection under *What it is*; exit-code note under *Running it by hand*; item 8 under *When it stops arriving*; owner-verification items 4–7 reworded/added; new *Acting on a request you only see in the list* section before *Messages sent before this deploy*; the `0313` note and the `409 name_mismatch` row now say "list" instead of "count". |

Not changed: `sendNameChangeDigest.ts`, `NameChangeRepository.ts`, `NameChangeDecideCommand.ts`, `setup-profile.sh`, `profile-checks.sh`, the harness, `package.json`, `plan.md`, the brief, task status, the wiki.

### Verification (2026-09-27)

1. **Owner rulings recorded verbatim** — above, before any code.
2. `npx jest tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRepository.test.ts` → **185/185 pass**. (First run had 1 failure in a *new* test — my assertion `not.toContain("-")` was wrong because uuids and dates contain `-`; tightened to `not.toMatch(/and -\d/)`. Not a code defect.)
3. `bash tests/scripts/profile-deploy-hardening.test.sh` → exit 0, `ALL PASS`, 0 `❌`; including `✅ digest module: comment-stripped source still holds its code` and `✅ digest module: no zero-count branch — the digest sends unconditionally (owner ruling)`.
4. `npm run test:integration` (env from `.env.test`, container `gc-0012-it-pg` up):
   - **First full run: 1 failure, 135 passed** — `TenureGrant.it.test.ts` › *two concurrent claims → exactly one row and the XP added once*. ⚠️ Error text **not captured** (my output filter dropped it); **not investigated**. It touches no 0315 file.
   - Re-ran: `TenureGrant.it.test.ts` alone **8/8**; full run again **11/11 suites, 136/136**. The new 0315 case passed in both full runs.
5. `npx tsc --noEmit` → exit 0.
6. `npm run lint` → exit 0. `npx prettier --check` clean on the three code files (the test file was run through `prettier --write`). The runbook is **not** Prettier-clean — it already was not at `HEAD`, so I did not reformat it.
7. `npm test` (full) → **157/157 suites, 2525/2525 tests**, first try, no re-run needed.

Sample render (synthetic ids, via a temporary test file, deleted afterwards): 20 names of 128 × U+3164 with a count of 25 → 3,468 characters, 3 lines shown, `…and 22 more waiting`. A two-entry plain/hidden-character list rendered as the runbook example shows.

**Not verified (owner-run, live):** deploy with `./build-deploy-profile.sh`; a day with one pending test request shows the heartbeat then the list; a zero day sends the heartbeat only. No agent can observe Telegram delivery.

### Decision log (calls made without asking, under the standing plan approval)

1. **`M` = everything not shown, counted from the larger of the count and the rows fetched** (`Math.max(pendingTotal, entries.length) - shown`, floored at 0) instead of the plan's literal `Math.max(0, count - shown)`. *Why it qualified:* obvious winner within the plan's stated intent — the plan requires both "M can never go negative" and "M includes the dropped ones"; the literal formula misses budget-dropped rows when the count raced lower than the rows fetched. Pinned by the test *a count raced lower AND a budget-dropped row*.
2. **A list-query error logs with the same prefix as a failed send** (`name-change digest list NOT sent: <error>`). *Why:* mechanical/in-plan (the plan says log `formatError(error)`); one prefix lets the runbook's single grep catch both kinds.
3. **Length budget reserves room for the "more" line at its longest possible value, always.** *Why:* mechanical, in-plan ("with room kept for the 'more' line"); conservative — may drop one entry slightly earlier than strictly needed, never overshoots.
4. **The player id is also passed through `escapeTelegramHtml`**, though it is a uuid from the database. *Why:* mechanical, zero-cost defence; matches the plan's `{escaped playerId}`.
5. **Runbook additions beyond the plan's bullet text:** a note that every `⟨U+XXXX⟩` code has four hex digits under today's name rule, and a sentence on a mistyped id (refused locally or `404 no_pending`; the one way a wrong id could decide something is another waiting player's id with a matching name — so copy the id from the same line). *Why:* in-plan section ("A mistake is safe"), made accurate after checking `NameChangeDecisionRequestSchema` and `validUsernamePattern`.
6. **Moved the existing "Never add a skip-when-empty condition" paragraph** back above the new list subsection so it is not read as being about the list; added "(the list only; the heartbeat still sends at 0)". *Why:* mechanical, prevents a misreading of an owner ruling.

No other judgment calls. Nothing committed.

## 2026-09-27 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Ledger: `review.md` (R1, R2). Both verified against the code; both fixed under the standing plan approval. No per-fix owner gate (the loop's standing approval replaces it).

### Decision log (fixes applied without asking)

1. **R1 — phantom "…and M more" below the cap.** *Finding:* `known = Math.max(pendingTotal, entries.length)` kept the heartbeat's stale count when requests were decided/withdrawn between the count and list queries (count 5, 3 rows → `…and 2 more`). *Change:* `src/profile-server/NameChangeDigest.ts` `formatPendingNameChangeList` — below `PENDING_LIST_CAP` the fetched list is complete, so `known = entries.length`; at the cap it stays `Math.max(pendingTotal, entries.length)`. Doc comment updated, naming the residual (at the cap a stale-high count can still overstate M; no read in this run can tell). *Tests added* (`tests/profile-server/NameChangeDigest.test.ts`): count 5 / 3 rows → no "more" (formatter and full run, heartbeat still says 5); below cap with stale-high count 15 and 10 budget-dropped hostile rows → M = 10 − shown. Existing race (count < rows) and length-drop (20 rows, count 3 and 25) cases unchanged and green. *Why it qualified:* verified `CORRECT`, mechanical/localized (one expression), in-plan (the plan's "M" line must be accurate; reviewer's own direction). Previous decision-log item 1 still holds at the cap.
2. **R2 — runbook check-12 triage step 5.** *Finding:* step 5 ("an error from the pool ⇒ cause (3)") could be matched by a `list NOT sent: <error>` line. *Change:* `ai-agents/knowledge-base/name-change-digest-runbook.md` step 5 gains a clause: only a pool error without `list NOT sent` counts; that line is item 8 and does not age the marker. *Why it qualified:* verified `CORRECT`, docs-only, in-plan (plan Step 7 runbook).

No obvious-winner calls this round. Runbook not prettier-reformatted: it was already prettier-dirty at `HEAD`; reformatting would be an unrelated change.

### Verification
- `npx jest tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRepository.test.ts` — 188/188.
- `bash tests/scripts/profile-deploy-hardening.test.sh` — `ALL PASS`; both digest-module guards pass (zero-count, not vacuous).
- `npx tsc --noEmit` exit 0; `npm run lint` exit 0.
- Full `npm test` — run 1: 1 failure, `SessionRoutes.test.ts` `Exceeded timeout of 5000 ms` (known supertest flake shape; no `SIGSEGV`, no `node-*.ips` report). **Re-ran:** 157/157 suites, 2528/2528 tests, exit 0.
- `npm run test:integration` — 11/11 suites, 136/136.

Nothing committed.

## 2026-09-27 — Process review, round 2 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Ledger: `review.md` R3 (round 2; R1/R2 confirmed by the reviewer). **Owner ruling** relayed by fkit-lead (live `AskUserQuestion` in the `fkit lead` session, 2026-09-27): **"Fix it (Recommended)"** — "Count the waiting requests in the same query as the list, so 'N more' is always exact. One-column change + tests; the short first message is unchanged." (An earlier "Accept it" was superseded, per the relay.)

### Decision log (fixes applied under the standing approval + that ruling)

1. **R3 — "…and M more" at the cap followed the heartbeat's stale count, in both directions.** *Finding:* too-low count → "more" line vanished (count 3, 20 rows, 25 waiting); too-high → overstated. My round-1 comment's "no read here can tell" was wrong. *Change* (`src/profile-server/NameChangeDigest.ts`): `PENDING_LIST_SQL` selects `count(*) OVER ()::int AS total` (window computed before `LIMIT`); new `PendingNameChangeList { total, entries }` returned by `listPendingNameChanges` (total 0 when no rows); `formatPendingNameChangeList(total, …)` uses `Math.max(total, entries.length)` — the floor is defensive only, one statement cannot return more rows than its total; `sendPendingList` no longer takes the heartbeat's count. This **replaces** the round-1 R1 cap branch (`entries.length < PENDING_LIST_CAP ? …`), which is no longer needed: M is exact below and at the cap. Heartbeat (`PENDING_COUNT_SQL`, `countPendingNameChanges`, `formatNameChangeDigest`), marker and exit code untouched. *Why it qualified:* verified `CORRECT`; approach chosen by the owner's ruling; localized (one column + the value it feeds); inside the plan's intent (the "M" line must be accurate).
2. **Return-type shape `{ total, entries }`** rather than a `total` field on each entry. *Why:* mechanical choice of how to carry the one number the ruling adds; only callers are this module and its two test files.
3. **Tests** (`tests/profile-server/NameChangeDigest.test.ts`): fake pool now attaches `total` to list rows (default = row count; independent of the heartbeat's count). Added: stale-low at cap (count 3, total 25, 20 rows → `…and 5 more`), stale-high at cap (count 30, total 22 → `…and 2 more`), stale-high below cap (count 5, total 3 → no "more"), length cut at cap with stale heartbeat (total 25 → M = 25 − shown), empty list → `{ total: 0, entries: [] }`, query-shape regex includes the window column. Removed the two round-1 formatter tests that fed the heartbeat's count into the formatter below the cap — that contract no longer exists (the formatter now trusts a same-statement total). *Integration* (`tests/integration/NameChange.it.test.ts`, the 0315 case only): asserts `total` 2 on the full read and on a `LIMIT 1` read — proves window-before-LIMIT on real Postgres.
4. **Runbook** (`name-change-digest-runbook.md`, "What it is" M bullet): one sentence — the list counts its own total when read, seconds after the heartbeat's count, so the two can differ; the list's is newer. *Why:* docs-only, keeps an operator from reading a mismatch as a bug.

No other judgment calls.

### Verification
- `npx jest tests/profile-server/NameChangeDigest.test.ts tests/profile-server/NameChangeRepository.test.ts` — 190/190.
- `bash tests/scripts/profile-deploy-hardening.test.sh` — `ALL PASS`; both digest-module guards pass (`count(*) OVER ()` does not match the `count <op> 0|1` regex; `countPendingNameChanges` still present).
- `npx tsc --noEmit` exit 0; `npm run lint` exit 0; prettier clean on the three code files.
- `npm run test:integration` (with `.env.test` exported) — 11/11 suites, 136/136.
- Full `npm test` — 157/157 suites, 2530/2530 tests, exit 0, first run (no flake, no re-run).

Nothing committed.
