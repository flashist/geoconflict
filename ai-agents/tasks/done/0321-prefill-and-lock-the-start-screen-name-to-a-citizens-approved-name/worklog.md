# Worklog — 0321: prefill and lock the start-screen name to a citizen's approved name

## 2026-09-28 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Declared-approval marker: caller `fkit-sprint-ship-loop`; approved plan `plan.md` (blob
`9955472752d76d411f3304d1703eb79e6e6490e4`, 19017 bytes — re-hashed this turn with `git hash-object`,
matches); owner approved live via `AskUserQuestion` in the `fkit lead` session, 2026-09-28.

### Owner rulings — verbatim, as relayed by fkit-lead (copied from the end of the approved plan)

- **Q1 (what turns the lock on):** owner's own words: "There is no way somebody loses their citizenship.
  If I understand you correctly, it means #1." — the lead confirmed that reading ⇒ **option 1**: lock
  whenever a fresh, authoritative profile read shows an approved name (`display_name` non-null),
  regardless of citizen status.
- **Q2 (degraded load):** "Show it, don't lock (Recommended)" — Locking needs a fresh answer from the
  server, so a cleared name or another account's name on the same browser never locks.
- **Q3 (box hidden on Yandex):** "Build as ruled anyway (Recommended)" — On Yandex citizens play under
  their approved name; the lock/hint shows only on the standalone page, and is ready if the box is ever
  shown on Yandex.
- **Q4 (hint text):** "Full sentence (Recommended)" — en `This is your approved name. You can change it on
  the Citizenship card.` / ru `Это ваше одобренное имя. Сменить его можно в карточке «Гражданство».`
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.

Spawn instruction (from the lead, same turn): brief step 7 uses the plan's **alternative** — code-order
reasoning only, marked "not measured"; **no temporary `console.debug`**.

### Decision log

**Unattended fixes / obvious-winner calls (ADR-019 audit, ADR-032 A4): none.** This was a Build step; no
review findings were processed.

Build-time choices inside the plan (recorded so a wrong one can be found later):

1. **`isValid()` also returns true while an approved name is known** (`approvedName !== null`), not only
   `getCurrentUsername()`. Plan 2d.4 names `getCurrentUsername()` as the safety net for a switch still
   waiting for blur, and §7 requires "isValid() true, Play is not blocked". Without this, a Play path that
   read `isValid()` before blur fired would be blocked by the draft's error while the name it would send
   is the valid approved one. Same intent, one line.
2. **The `approved_username` marker is removed on every `none`**, not only when it equals the stored name.
   Plan 2d.5 says "remove both" when they match. Reason for also dropping a non-matching marker: the box's
   own fill writes the Yandex name over `localStorage["username"]` on every load, so after one load with a
   Yandex name the marker no longer matches anything and would sit stale. With no approved name left, the
   marker has no meaning. The typed-name rule is unchanged: a stored name that does not match the marker
   is kept (tested).
3. **`getStoredUsername()` split into `resolveUsername()` (the order, no writes) + the store.**
   `generateNewUsername()` no longer stores by itself; its only caller stores the result, so the existing
   path still writes exactly once. Needed so the cleared-name refill (2d.5) writes storage only if its
   result is still wanted when it lands — otherwise a lock arriving during the refill's await would have
   its stored copy overwritten by the Yandex name.
4. **Refill guard:** the cleared-name refill does nothing if, by the time it lands, a new approved name
   arrived or the box no longer shows the cleared name (the player typed).
5. **`connectedCallback` now calls `requestUpdate()` after its own fill.** The codebase convention
   (comment at `handleFocus`): the decorator transform does not reliably schedule updates under the test
   build. Without it the input's rendered value stayed `""` in jsdom after the fill; before 0321 no test
   read the rendered value after mount.
6. **Subscribe-first + `hasFilled` guard.** Subscribed before the await as 2d.1 says; publishes that land
   before the fill finishes are ignored by the listener and applied once from `getApprovedName()` after
   the fill. (A mutation check shows the guard is belt-and-braces: without it the after-fill apply still
   wins; it only avoids a redundant early lock/store/dispatch.)
7. **An approved name that fails today's rule while the box is already locked** (e.g. a later re-read
   after a rule change): unlock, keep what the box shows, touch no storage, DEBUG log without the name.
   The plan covers the fails-the-rule case at load; this is the same rule applied mid-session.
8. **Locked styling:** `opacity-70 cursor-default pl-10 pr-10` + an `aria-hidden` inline-SVG lock icon
   positioned in the host (`<username-input class="relative w-full">` in both templates). Chose opacity
   over grey text/background classes because the input already carries `dark:text-white` /
   `dark:bg-gray-700`, and a second `dark:text-*` would depend on Tailwind's stylesheet order.
   `aria-readonly` and `title` are set only when locked (`ifDefined`).
9. **Card publish reads `profile.approvedName ?? null`** — defensive like the existing
   `profile.nameChange ?? null`: many card-test fixtures (and any older view builder) omit the field.
10. **Test harness:** `tests/client/UsernameInput.test.ts` imports `JoinUsernameSchema` (plan §8 test 1).
    `Schemas.ts` pulls in `jose`, which needs a `TextEncoder` jsdom lacks, so the file stubs `jose` with
    the exact stub `tests/LocalServer.test.ts` already uses. Nothing in the file decodes patterns.

### Brief step 7 — timing (code-order reasoning, **not measured**)

Per the lead's spawn instruction, the plan's alternative: no `console.debug` was added. From the code
(plan §1): the name box fills as soon as `Main.ts` loads it, awaiting one cached SDK call
(`getCurPlayerName`). The card reads the profile only after `flashist_waitGameInitComplete()`, then the
`citizenship_ui` flag, then a first render, then a login plus `GET /v1/profile` with a timeout of up to
5 s (`PlayerProfileView.ts` `PROFILE_FETCH_TIMEOUT_MS`). So the profile read will almost always land
**after** the box has filled: the late switch (tested as "published AFTER the box filled") is the normal
path, not a rare race. **Not measured on a Yandex load.**

### What changed

- **New `src/client/ApprovedName.ts`** — single-writer store (`unknown | none | approved{name}`):
  `publishApprovedName` (no-op when unchanged), `getApprovedName`, `subscribeApprovedName`,
  `resetApprovedNameForTests`. Copies `CitizenshipStatus.ts`.
- **`src/client/PlayerProfileView.ts`** — new field `approvedName: string | null` = `display_name` on a
  successful read, `null` on the zero-state. `displayName` unchanged.
- **`src/client/CitizenshipCard.ts`** — `refreshProfile()` calls a new private `publishApprovedName()`
  next to `publishCitizenshipStatus()`. Authoritative read → `approved`/`none`; guest, zero-state,
  failed read, timeout → nothing published.
- **`src/client/UsernameInput.ts`** — subscribe before the fill, apply after it; unsubscribe on
  disconnect; trim + `checkUsernameRules` check (same as `JoinUsernameSchema`); lock (readonly,
  `aria-readonly`, `title`, lock icon, locked hint on focus instead of the rules hint); store + marker;
  mid-edit deferral to blur; `none` → unlock and remove the stored approved copy, then refill (Yandex
  name, else `Anon####`); `handleChange` ignored while locked.
- **`resources/lang/en.json` / `ru.json`** — one key each, `username.locked_hint`, the Q4 text verbatim.
  Inserted by exact-string replace after `rules_hint`; the other tasks' uncommitted hunks in both files
  are untouched.
- **No change:** `src/core/`, server, contract, migrations, both HTML templates, `plan.md`, any status.

### Tests added / changed

- `tests/client/ApprovedName.test.ts` (new, 6): starts unknown; publish + notify; no notify when unchanged
  (kind and name); no call on subscribe; unsubscribe; reset.
- `tests/client/UsernameInput.test.ts` (+18 in a new `describe`): published before mount (locked, stored,
  marker, `JoinUsernameSchema.safeParse` succeeds); published during the fill; published after the fill
  (the race, one `username-change` with the approved name); published while typing (no swap until blur,
  approved name joins meanwhile, `isValid()` true; then locked, error gone); typing ignored while locked;
  locked hint on focus, not the rules hint; unknown/none → Yandex, then storage, then `Anon####`,
  editable; degraded load (SDK throws) shows the stored approved name unlocked (Q2); approved names that
  fail the rule (too short, emoji, dash) not locked and the DEBUG log does not contain the name; a padded
  approved name is trimmed; cleared name → unlocked, stored copy removed, falls back to `Anon####` / to
  the Yandex name; stale stored approved name removed on the next load; a typed name that does not match
  the marker kept; unsubscribes on disconnect.
- `tests/client/PlayerProfileView.test.ts`: `approvedName` on every `toEqual`; new test "carries
  display_name as approvedName, and null when there is none" (with `displayName` still falling back);
  every zero-state path asserts `approvedName: null` through `ZERO_STATE`.
- `tests/client/CitizenshipCard.test.ts` (+9 in a new `describe`): approved; approved for a NON-citizen
  (Q1 — also pins the 0319/0325 watch item that the lock follows `display_name`); none; nothing for a
  guest; nothing for a zero-state; nothing while the card is disabled; a failed re-read after a good one
  leaves `approved`; a re-read with the name cleared publishes `none`; one `loadPlayerProfileView` call
  (single reader). `NON_CITIZEN_PROFILE` and the name-change `CITIZEN_PROFILE` fixtures gained
  `approvedName: null`.
- `tests/client/CitizenshipStatus.test.ts`: fixture gained `approvedName: null`; no behaviour change.
- `tests/client/UsernameLang.test.ts`: `locked_hint` equals the Q4 text in en and ru, and contains no
  `/geoconflict|геоконфликт/i`. The existing "same username keys" test covers parity.

### Evidence

- Targeted: `npx jest tests/client/ApprovedName.test.ts tests/client/UsernameInput.test.ts
  tests/client/CitizenshipCard.test.ts tests/client/PlayerProfileView.test.ts
  tests/client/CitizenshipStatus.test.ts tests/client/UsernameLang.test.ts
  tests/client/LangSelectorRerender.test.ts tests/client/NoGameNameInPlayerText.test.ts
  tests/UsernameHostileInputs.test.ts` → 9 suites, 284 tests passed.
- **Mutation checks on `UsernameInput.ts`** (file restored from a scratch copy after each, then the suite
  re-run green, 32/32):
  - after-fill `applyApprovedName(getApprovedName())` removed → 9 tests fail (before-mount, during-fill,
    locked-hint, typing-ignored, rule-fail, trim, cleared-name…);
  - mid-edit deferral removed → the "while typing" test fails;
  - unsubscribe removed from `disconnectedCallback` → the "stops listening" test fails;
  - `hasFilled` guard removed → no test fails (belt-and-braces, see decision 6).
- `npx tsc --noEmit` → exit 0.
- `npx eslint` on all touched source and test files → exit 0. `npx prettier --check` on them and on
  en/ru.json → clean.
- `npm run lint` (whole repo) → **1 error, not from this task**: the untracked 0325 helper
  `ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs` ("not found by the project service"). Known;
  not fixed, per the spawn instruction.
- `npm test` (full) → **163/164 suites, 2816/2817 tests passed; 1 failure, not from this task**:
  `tests/scripts/ShellHarnesses.test.ts` → `tests/scripts/profile-deploy-hardening.test.sh`, assertions
  labelled `probe (0285)` (`channel_state` / log-tail expectations). That is the parallel coder's
  in-flight 0285 work (`setup-telemetry.sh` etc. are modified in the tree). Re-running that one suite
  gave a **different** set of `probe (0285)` failures — consistent with those files being edited while I
  ran. This task touches none of those files. The known `supertest` flake did **not** appear, so no
  flake re-run was needed.

### Not verified here (owner-run, cannot run locally)

- **Brief step 6** — a citizen with an approved name on a Yandex draft: single-player and a multiplayer
  lobby show the approved name. On Yandex the box itself is hidden (Q3), so only the name in the match
  shows it. The standalone dev page has no Yandex identity, so the lock cannot be seen end to end locally.
- **Brief step 7** — timing is code-order reasoning only, **not measured** (above).
- The locked styling (opacity, icon position, hint) was not looked at in a browser — only its DOM is
  asserted in jsdom.

## 2026-09-28 — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Ran `fkit-process-stateful-review` steps 0–7 under the loop's standing approval (approved plan, blob
`9955472752d76d411f3304d1703eb79e6e6490e4`, re-checked with `git hash-object` this turn). No per-round
owner gate; the one judgment call (R1) was decided by the owner before this spawn.

### Owner ruling on R1 — verbatim, as relayed by fkit-lead (live `AskUserQuestion`, `fkit lead` session, 2026-09-28)

- Answer: **"Typed name is theirs (Recommended)"**.
- Option text: "Typing a name removes the 'came from approval' note, so a later clear never deletes a name
  the player typed. Side effect: they can keep a cleared name by typing it — already accepted (anyone can
  type any name)."
- Instruction: fix accordingly — when the player stores a name they typed, clear the marker. Also make the
  unlock refill respect focus the same way the lock does, if small and consistent with the plan; otherwise
  record why not.

### Decision log (ADR-019 audit / ADR-032 A4 — fixes applied without a per-fix owner gate)

1. **R1 — marker cleared on a typed name.** Finding: `review.md` § Reviewer findings, R1 ("a player who
   … types a name byte-identical to the marker has it removed"). Change: `UsernameInput.handleChange`, in
   the branch that stores a valid typed name, now calls `localStorage.removeItem("approved_username")`.
   Qualified as: owner-ruled (the exact behaviour the ruling names), mechanical/localized (one line in one
   branch), inside plan 2d.5's intent ("a name the player typed themselves is left alone"). Side effect
   recorded as an accepted residual in `review.md`.
2. **R1 (reviewer's note) — the cleared-name refill waits for blur when focused.** Change: new field
   `pendingRefillName`; `refillAfterClearedName` parks its result there when `isEditing`, `handleBlur`
   applies it, `handleChange` drops it (the player typed), `lockToApprovedName` drops it, and
   `getCurrentUsername()` returns it meanwhile. The store/fill body moved into `fillAfterClearedName` so the
   immediate and the deferred paths share it. Qualified as: the owner asked for it explicitly "if small and
   consistent with the plan"; it is ~15 lines in one file, and it is plan 2d.4's mid-edit rule (no swap
   under the player's fingers, `getCurrentUsername()` as the safety net) applied to 2d.5's refill — no new
   behaviour beyond that. Storage: the stale approved copy is still removed at once on `none` (invisible to
   the player); only the visible swap and the new name's store wait for blur.
3. **R2 — missing test for the refill guard.** Finding: `review.md` § Reviewer findings, R2. Change: tests
   only (`tests/client/UsernameInput.test.ts`, `describe("the refill's own await is held open …")`).
   Qualified as: verified-`CORRECT`, test-only, in plan §8. First mutation run showed removing the
   `approvedName !== null` half turned **nothing** red — a different approved name also changes the box
   text, so the other half caught it. Added a "same approved name again" variant, which only that half
   catches. Now each half reds exactly its own test.

No obvious-winner calls beyond the above. `hasFilled` guard: still untested, deliberately (decision 6 of
the Build log; the reviewer mentioned it but filed no finding).

### Tests added (`tests/client/UsernameInput.test.ts`, +6)

- "keeps a typed name even when it equals the approved name (R1, owner ruling 2026-09-28)"
- "cleared while the box has focus: the refill waits for blur, as a lock does"
- "cleared while focused, then the player types: the typed name wins at blur"
- held-open refill await: "a different approved name …", "the same approved name again …", "a name typed
  meanwhile is kept"

### Evidence

- Mutation checks on `src/client/UsernameInput.ts` (restored from a scratch copy after each; `diff` clean,
  suite re-run green 38/38):
  - marker removal in `handleChange` removed → the R1 test fails;
  - refill focus deferral disabled → "cleared while the box has focus" fails;
  - `pendingRefillName = null` in `handleChange` removed → "then the player types" fails;
  - `pendingRefillName` safety net in `getCurrentUsername()` disabled → "cleared while the box has focus" fails;
  - `handleBlur` pending apply disabled → "cleared while the box has focus" fails;
  - guard half `approvedName !== null` removed → "the same approved name again" fails (only);
  - guard half `username !== clearedName` removed → "a name typed meanwhile is kept" fails (only);
  - whole guard removed → all 3 held-open tests fail.
- Scope suites (ApprovedName, UsernameInput, CitizenshipCard, PlayerProfileView, CitizenshipStatus,
  UsernameLang, LangSelectorRerender, NoGameNameInPlayerText, UsernameHostileInputs) → 9 suites, 290/290.
- `npx tsc --noEmit` → exit 0. `npx eslint` + `npx prettier --check` on the two touched files → clean.
- `npm test` (full) → **164/164 suites, 2823/2823 tests passed**, first run. No supertest flake appeared, so
  no re-run. (The Build step's `probe (0285)` red in the shell-harness suite did not recur this run.)
- Whole-repo `npm run lint` not re-run: the only change is the two files above, both eslint-clean; the
  whole-repo red is the known untracked 0325 helper.

### Still not verified (unchanged from the Build step)

- Brief steps 6 and 7 (owner-run on a Yandex draft); the locked styling in a real browser.

## 2026-09-28 — Process review, round 2 (fkit-coder, spawned by `fkit-sprint-ship-loop` / fkit-lead)

Standing approval: the approved plan (blob `9955472752d76d411f3304d1703eb79e6e6490e4`, re-checked this turn).
Both findings enforce the existing R1 owner ruling ("Typed name is theirs (Recommended)") and plan 2d.4/2d.5,
so they are in-plan. No per-fix owner gate (ADR-032 Decision 3).

### Decision log (ADR-019 audit / ADR-032 A4 — fixes applied without a per-fix owner gate)

1. **R3 — the cleared name could come back through `lastValidUsername`.** Finding: `review.md` § Reviewer
   findings, R3 ("`getCurrentUsername()` falls back to the cleared name"). Change in
   `src/client/UsernameInput.ts`: `releaseApprovedName` sets `lastValidUsername = ""` when it starts a refill;
   the focused branch of `refillAfterClearedName` sets `lastValidUsername = name` next to
   `pendingRefillName = name`. So an invalid draft typed after a clear falls back to the replacement (or,
   inside the await, to the cleaned draft), never to the cleared name. No new state: both are the existing
   field and its existing empty-string fallback. Qualified as: verified-`CORRECT` (reproduced by the new
   test before the fix: M1/M2 below), mechanical/localized (two assignments in one file), in plan 2d.5's
   intent (a cleared name stops being used).
2. **R3 follow-on — removed the `pendingRefillName` branch of `getCurrentUsername()`.** After change 1,
   whenever `pendingRefillName` is set, `lastValidUsername` holds the same value (both set together; both
   cleared or overwritten by the same writers), so the branch was dead. Mutation check before removing:
   deleting it turned no test red. Qualified as: obvious winner within intent (one mechanism instead of
   two for the same thing; behaviour unchanged).
3. **R4 — string compare replaced by an edit counter.** Finding: `review.md` § Reviewer findings, R4
   ("`this.username !== clearedName` is a string compare … misses an A-B-A case"). Change: new field
   `usernameEditCount`, bumped in `handleChange` after the lock guard; `refillAfterClearedName` records it
   before its await and bails if it changed. The `clearedName` parameter became unused and was dropped.
   Qualified as: verified-`CORRECT`, mechanical/localized, enforces the R1 owner ruling. One new counter,
   as the spawn prompt suggested; no existing field could tell "typed" from "text equal".

### Tests added (`tests/client/UsernameInput.test.ts`, +3)

- "cleared while focused, then an invalid edit: the cleared name never joins (R3)"
- held-open refill await: "the cleared name typed back meanwhile is kept (R4)", "an invalid edit meanwhile
  never falls back to the cleared name (R3)"

### Evidence

- Mutation checks (restored from a scratch copy after each; `diff` clean):
  - M1 focused-branch `lastValidUsername = name` removed → only "cleared while focused, then an invalid edit (R3)" fails;
  - M2 release-time `lastValidUsername = ""` removed → only "an invalid edit meanwhile … (R3)" fails;
  - guard restored to the old string compare → only "the cleared name typed back meanwhile is kept (R4)" fails;
  - counter check or counter increment removed → R4 test, "a name typed meanwhile is kept" and the await-window R3 test fail;
  - `approvedName !== null` half removed → both "… landing meanwhile keeps its lock" tests fail (round-1 behaviour held).
- Round-1 R1/R2 tests and every earlier race test still pass: `UsernameInput.test.ts` 41/41.
- Scope suites (ApprovedName, UsernameInput, CitizenshipCard, PlayerProfileView, CitizenshipStatus,
  UsernameLang, LangSelectorRerender, NoGameNameInPlayerText, UsernameHostileInputs) → 9 suites, 293/293.
- `npx tsc --noEmit` → exit 0. `npx eslint` + `npx prettier --check` on the two touched files → clean.
- `npm test` (full) → 162/164 suites; 2 red, neither 0321:
  - `tests/profile-server/NameChangeRoutes.test.ts`, one test: `expected 200 "OK", got 401` — a shape
    CLAUDE.md lists under the supertest flake family ("mechanism unknown"); no `SIGSEGV` in the log.
    **Re-ran the suite 3 times: 51/51 each time.**
  - `tests/scripts/ConfigValues.test.ts` (deploy.sh config-value guard, "real tree" entries): red again
    on a lone re-run (4 failed). It tests `deploy.sh` / `scripts/check-config-values.mjs`, which the
    parallel 0298 coder is editing; 0321 touches neither. Not investigated further, by instruction.

## 2026-09-28 — Close (fkit-producer, spawned by `fkit-sprint-ship-loop`)

Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. No owner channel in this close;
nothing below was verified by a human. Grounds as relayed by `fkit-lead`: plan owner-approved 2026-09-28
(Q1–Q4, live via `AskUserQuestion`, relayed); review round 1 R1 (owner ruling *"Typed name is theirs"*) and
R2 fixed; round 2 R3 and R4 fixed; round 3 *"Ready to merge"*, converged; final residual owner-ruled
*"Record as known (Recommended)"* and recorded; ledger `review.md` `Status: closed-out`. Tests:
`UsernameInput` 41/41; scope suites 293/293; full `npm test` green apart from a known supertest flake
(re-run 3×, 51/51) and a then-in-flight `0298` suite, not `0321`'s. Nothing committed.

**Owner-run checks still owed:**
- Brief step 6 on a Yandex draft: single-player and a multiplayer lobby show the approved name. On Yandex
  the name box itself is hidden (owner ruling Q3), so only the name used is checkable there.
- The locked look (box and hint) in a real browser, on the standalone page.
- Brief step 7's timing is recorded as **not measured** — code-order reasoning only.

**Follow-ons:**
- `0322` comes next and can build on this.
- `0326`'s stale-read fix must keep `publishApprovedName()` **inside** its newest-read-only block (merge
  note, `plan.md` § 6).
