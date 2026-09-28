# Worklog — 0314: the "declined" notice sticks on the card, and there is no way to clear a name

## 2026-09-27 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Build worker)

Building the approved `plan.md` (blob `078419f61a38a4ffd6574009ef40d655ad104591`, verified with
`git hash-object` before starting), steps 1–9, recommended pair. Nothing committed. Task status and
`plan.md` untouched. Builds on the committed 0307/0302/0312/0313/0315 work (HEAD `390c4b4`).

### Owner rulings on Step 0 — recorded verbatim (brief verification 1)

Given 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:

- **Q1 (declined notice):** "Hide button, server (Recommended)" — a 'Hide' button; hidden on every
  device; one small database change and one new call.
- **Q2 (removing an approved name):** "Operator command (Recommended)" — a third choice 'clear' on the
  existing approve/reject command: needs a reason, player gets an inbox note, history keeps a record,
  the name becomes free.
- **Q3 (inbox note repeats the removed name):** "Yes, like the others (Recommended)" — consistent with
  the approve/decline notes.
- **Draft texts** ("Hide" / "Скрыть"; the inbox note drafts in the plan) approved with the plan.

Plan approval (the Build worker's standing approval): the owner answered **"Approve (Recommended)"** to
"Approve the 0314 plan with your answers (server-remembered Hide button; operator 'clear' command with
reason + inbox note that repeats the name; one small migration; profile server deployed first; draft
texts 'Hide'/'Скрыть')?" — same session, same day, relayed by fkit-lead.

### What changed

| File | Change |
|---|---|
| `migrations/007_name_change_dismiss_and_clear.sql` | **new.** `dismissed_at timestamptz`; `new_display_name` nullable; the auto-named status CHECK dropped (no `if exists`) and re-added under the same name with `cleared`; new CHECK `player_name_history_cleared_has_no_name_check` = `(status = 'cleared') = (new_display_name is null)`. The `'approved'` default trap is untouched. |
| `src/core/profile/NameChangeContract.ts` | `decision` gains `clear`; the non-blank-reason refine covers reject **and** clear; new refine: clear requires `expectedName`; `NameChangeDismissRequestSchema`; response enum gains `no_custom_name`. Wire `NameChangeStatus` stays three values. |
| `src/core/profile/InboxContract.ts` | `name_change_cleared` key, required params `name`, `reason`. |
| `src/profile-server/NameChangeRepository.ts` | `dismissRejection`, `clearDisplayName` (one transaction, `LOCK_PROFILE_SQL`, explicit `'cleared'` status, inbox after commit, one `log.info` with the audit row id only); `getLatestState` returns null for a `cleared` row and for a hidden decline; `LATEST_SQL` selects `dismissed_at` and puts a pending row first (see decision log). |
| `src/profile-server/Routes.ts` | `POST /v1/profile/name-change-dismiss` (CORS + limiter + enabled loop); `clear` dispatch on the decide route (200 / 404 `no_custom_name` / 409 `name_mismatch` + `current_name`); `NameChangeRepo` interface; comments. |
| `src/profile-server/NameChangeDecideCommand.ts` | clear handled like reject for the reason (required, placeholder refused, 500 limit); clear-specific 200 / 404 / 409 wording, `current_name` printed via `escapeForTerminal`; any other 404 on a clear reads as "unexpected". No change to token handling, the entry file or `package.json`. |
| `src/client/NameChangeRequest.ts` | `dismissNameChangeRejection()`, never-throw `postJson`. |
| `src/client/CitizenshipCard.ts` | Hide button `#citizenship-name-change-dismiss` next to "Try another name"; shared in-flight guard → call → `refreshProfile()`; error line on failure; nothing stored on the device. |
| `resources/lang/en.json`, `ru.json` | `citizenship_name_change.dismiss` ("Hide" / "Скрыть"); `inbox.templates.name_change_cleared.{title,body}` — the approved drafts, verbatim. |
| `ai-agents/knowledge-base/name-change-digest-runbook.md` | top pointer; new subsection *Removing an approved name (task `0314`)* after *Reject* (lookup query, command shape, pending-not-touched note, owner verification); 3 new outcome rows; post-clear read-only check. Placeholders only. |
| tests | `NameChangeRepository`, `NameChangeRoutes`, `NameChangeDecideCommand`, `CitizenshipCard`, `NameChangeRequest`, `NameChangeLang`, `InboxContract`, `SessionRoutes` (dismiss added to the per-route session table), `InternalPathCase`/`LoginRoutes` (mock shape only), `NameChange.it`, `Migration006.it` (expects `006` then `007`, as the plan said). |

### Decision log (fixes / calls made without asking)

1. **Pending row wins in `LATEST_SQL`** — obvious winner, within the plan's intent. *Finding:* the plan's
   projection rule ("newest row `cleared` → null") together with its own rule "a pending request is left
   alone" hides that pending request from its own player: the clear inserts a NEWER row, so the card shows
   idle, no Withdraw, and a new request gets `pending_exists` for no visible reason. *Proved:* the new
   integration test "leaves a PENDING request alone — it still shows" **fails** with the plan's plain
   `ORDER BY id DESC` and passes with the fix. *Change:* `ORDER BY (moderation_status = 'pending') DESC, id
   DESC`. *Why it qualified:* before 0314 a pending row was always the newest (rows are only inserted as
   pending, at most one pending), so this changes nothing for any existing flow; it only makes the
   plan's own stated behaviour true. The removed name is still never republished (a cleared newest row
   still → null). **Residual, accepted by me, flag for the reviewer:** if the operator later *rejects*
   that pending request, the newest row is still the cleared one, so the card shows idle rather than the
   declined notice; the reason still reaches the player's inbox.
2. **Hide error line shows `error_not_citizen` on a 403**, `error_generic` otherwise — the plan said
   "on error, show the `error_generic` line". Mirrors the Withdraw handler right above it, byte-for-byte
   in shape. Mechanical, in-plan intent (a non-citizen never sees the card, so this path is near-dead).
3. **`describeDecideResponse`: any 404 on a clear that is not `no_custom_name` reads as "unexpected
   answer"**, not the shared "no pending request" text, which would be wrong for a clear. Localized,
   in-plan (the plan asks for clear-specific 404 wording).
4. **Missing-`expectedName` refusal text** reworded to cover a clear ("…or for a clear the player's
   current name") — the old text only spoke of the Telegram message, which a clear has none of.
5. **The re-added status CHECK keeps the name `player_name_history_moderation_status_check`**; the plan
   said "a named CHECK" without naming it. Keeping the name means nothing that knows the old name breaks.

No fix changed scope; no judgment call was left unasked beyond these.

### Evidence

- `npm test`: **157/157 suites, 2612/2612 tests passed, first run** — no flake, no re-run.
- `npm run test:integration` (`.env.test` exported into the shell, `gc-0012-it-pg` up): **11/11 suites,
  146/146 passed, first run.** All 10 new 0314 integration cases ran (verbose run checked), including the
  migration CHECK case and the freed-name case. `Migration006.it` passes with `006` + `007`.
- `npx tsc --noEmit`: clean. `npm run lint`: clean. Prettier: every changed `.ts`/`.json` file clean (4
  files formatted by `prettier --write`; all four were clean at HEAD, so only 0314 lines moved). The
  runbook was not prettier-formatted (it was not clean at HEAD either, per 0312's worklog).
- Grep of the migration and the runbook for IPs: none. No host, token, id or real name in any change.

### Not verified (and why)

- **Local run in ru and en (brief verification 3): NOT done.** It needs a local profile server with a
  logged-in citizen session; I did not set that up. The card tests cover the Hide flow, and the lang test
  covers both languages' keys. **Owner-run.**
- **On the real box (verification 4 / plan "Left for the owner" 3): NOT done — owner-run by design.**
  Deploy order: profile server first (`./build-deploy-profile.sh`), then the client.
- `tests/profile-backup-dryrun.sh` (restore drill) **not run** — it needs Docker plus `age`, `rclone`,
  `curl`, `jq` and is outside `npm test` by design. By reading: the new column and CHECKs do not break its
  seed (no cleared rows, every seeded row has a name) and its comparisons are source-vs-restore.
- The migration's lock time on the live table: not measured (table is tiny, one ALTER transaction).

## 2026-09-27 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Standing approval: the approved `plan.md` (blob `078419f61a38a4ffd6574009ef40d655ad104591`, re-hashed
and matching). Owner ruling on R1, given 2026-09-27 live via `AskUserQuestion` in the `fkit lead`
session, relayed by fkit-lead: **"Accept it (Recommended)"** — "Nothing changes; recorded as a known,
accepted leftover so later reviews don't re-raise it. Harmless and rare." `plan.md` and task status
untouched. Nothing committed.

### Decision log (fixes applied without asking)

1. **R1 — no fix, by owner ruling.** Verified CORRECT against `LATEST_SQL` / `getLatestState`.
   Recorded as an owner-accepted residual in `review.md` (*Decline after a clear shows idle*); Status
   `won't fix (frontier)`. No code changed.
2. **R2 — runbook read-only check re-ordered.** *Finding:* `order by id desc limit 1` prints the clear's
   row, not the decision just made, after a clear left an older pending request. *Change:* `order by
   decided_at desc nulls first, id desc` in *Confirming the outcome (read-only)*, one paragraph on why,
   and the after-clear note reworded. *Why it qualified:* verified CORRECT; doc-only, one query, inside
   the plan's runbook step ("a read-only check"); sanity-checked in the test Postgres container with
   inline rows. Caveat: a non-pending row with NULL `decided_at` (only possible via the 006
   default-`'approved'` trap, which no writer hits) would print first — acceptable; it would surface
   an anomaly rather than hide it.
3. **R3 — `Routes.ts` CORS comment** no longer counts the paths ("the … paths listed below"). Comment
   only; verified CORRECT; mechanical.
4. **R4 — "copy it again from the Telegram message" on a clear.** *Change:* `copyAgainHint(decision)`
   in `NameChangeDecideCommand.ts` — clear → the runbook section; approve/reject → the old Telegram
   text, unchanged; unknown decision → both. Used by the 400 answer and the four parse refusals that
   named Telegram; runbook 400 row updated to match; 3 tests added. *Why it qualified:* verified
   CORRECT; wording only, localized to one file; in the plan's command step ("clear-specific
   wording"). Went slightly wider than the reviewer's three cited lines (also the "not set" and "not
   valid JSON" refusals) — same defect, same text, decision unknown there so they name both sources.

No obvious-winner call beyond these; nothing outside the plan.

### Evidence (round 1 fixes)

- `npx jest tests/profile-server/NameChangeDecideCommand.test.ts`: 64/64.
- `npm test`: **157/157 suites, 2615/2615 tests, first run** (2612 + the 3 new R4 tests) — no flake, no re-run.
- `npx tsc --noEmit`: clean. `npm run lint`: clean. Prettier: the three touched `.ts` files clean.
- `npm run test:integration`: **not re-run** — no fix touched SQL the app runs, a route, or the
  repository (a comment, command wording, and a runbook query). The runbook query's ordering was
  checked directly in the `gc-0012-it-pg` container with inline rows.
- Ledger `review.md` set to `Status: closed-out` (R1 owner-accepted residual; R2–R4 done).

## 2026-09-27 — Process review, round 2 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Standing approval: the approved `plan.md` (blob `078419f61a38a4ffd6574009ef40d655ad104591`, re-hashed and matching; as given in the
spawn prompt). Scope: R5 only (R2–R4 confirmed closed by the reviewer). `plan.md` and task status untouched.
Nothing committed.

### Decision log (fixes applied without asking)

1. **R5 — approve/reject hint wording not pinned byte-for-byte (obvious-winner call).** *Finding:* the R4
   tests use `toContain`, so a drift in the approve/reject 400 or bad-shape text would pass. *Verified:*
   CORRECT — the code is byte-identical to HEAD for approve/reject today; the gap is in the tests only.
   *Change:* one `it.each(["approve","reject"])` test in `tests/profile-server/NameChangeDecideCommand.test.ts`
   asserting exact equality for `describeDecideResponse(400, …)` and for `parseDecideInput`'s bad-shape
   refusal (bad `playerId`), using the pre-0314 strings. No source change. *Why it qualified:*
   obvious winner within the plan's intent — test-only, one file, and inside the plan's test list
   ("approve and reject answers unchanged"); the alternative (`won't fix`) buys nothing.

No other fix; nothing outside the plan.

### Evidence (round 2)

- `npx jest tests/profile-server/NameChangeDecideCommand.test.ts`: 66/66 (64 + the 2 new cases).
- Mutation check: one word added to the approve/reject hint in the source → exactly the 2 new cases failed
  (64 passed, so the older `toContain` checks did not catch it). Source restored from a scratch copy and
  confirmed identical with `cmp`.
- `npx tsc --noEmit`: clean. `npm run lint`: clean. Prettier: the test file is clean.
- `npm test` (full) **skipped** — a test-only change to one suite, as the spawn allowed.
- Ledger `review.md` set to `Status: closed-out`.

## 2026-09-27 — Close (fkit-producer, spawned by `fkit-sprint-ship-loop`)

Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. No owner channel in this close;
nothing below was verified by a human. Grounds as relayed by `fkit-lead`: plan owner-approved 2026-09-27;
review round 1 found R1–R4 (R1 owner-accepted residual, *"Accept it (Recommended)"*, 2026-09-27, live via
`AskUserQuestion`, relayed; R2–R4 fixed); round 2 verdict *"Ready to merge"*, R5 (test-only) fixed; ledger
`review.md` `Status: closed-out`; `npm test` 157/157 suites, 2615/2615 tests (round 1); tsc and lint clean.
Nothing committed.

**Owner-run checks still owed:**
- A local run in **ru** and **en**.
- Deploy the **profile server first, then the client**; then, on a test account:
  - decline a request → **Hide** → the card goes back to normal;
  - approve a name → run the clear command on the box → **200**, the default name is shown, and the inbox
    note arrives.
