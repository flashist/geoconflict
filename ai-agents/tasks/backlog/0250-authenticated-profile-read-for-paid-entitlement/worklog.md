# Worklog — 0250: authenticated profile read for paid entitlement

## 2026-09-27 — Build, slice S1 only (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Build worker)

Building the approved `plan.md` (blob `c1d4166f349aebef1920d8e35297d67970f15778`, verified with
`git hash-object` before starting and again after the build — unchanged). Slice **S1** only; S3b is
planned separately after `0325`. Nothing committed. Task status and `plan.md` untouched. Built on top of
the uncommitted 0314/0302/0317 work in the tree; none of it undone.

### Owner rulings — recorded verbatim (from the plan's *Owner rulings* section)

Given 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:

- **Q1 (hide `updated_at` from unverified callers):** "Hide it (Recommended)" — send the account creation
  date instead. Closes the signal; nothing visible changes. (Asked twice; the owner first chose "Explain
  more, then ask again".)
- **Q2 (collapse duplicate citizenship messages):** "Show only the first (Recommended)" — unverified logins
  see just one welcome message. Closes it.
- **Q3 (the "exactly 100 XP" hint):** "Accept as known risk (Recommended)" — record it next to the other
  accepted "watching" risk, in the verified-login design note. (Asked twice; the owner first chose
  "Explain more, then ask again".)
- **Q4 (neutral inbox text):** "Without game name (Recommended)" — overrides the plan's Step 5 draft. Used
  exactly: en "Welcome, Citizen!" / "You are now a citizen. Citizen benefits are now available to you.";
  ru "Добро пожаловать, Гражданин!" / "Теперь вы гражданин. Вам доступны привилегии граждан."
- **Plan approval:** "Approve (Recommended)" — same session, same day. Scope: slice S1 only.

### What changed

| File | Change |
|---|---|
| `src/profile-server/PublicProjection.ts` | **new.** The UNVERIFIED view. `equalizedXp(xp, isCitizen)` (citizen ⇒ `max(xp, 100)`); `toPublicProfile` moved here from `Routes.ts` (doc comment + `TODO(payments)` kept) — `citizenship_earned_at: null`, clamped `xp`, `updated_at: created_at` (Q1), paid fields still omitted, `name_change` merged as before; `toPublicInboxMessages` — `citizenship_paid`/`citizenship_earned` → `citizenship_granted`, only the **oldest** kept (Q2), everything else untouched. |
| `src/profile-server/Routes.ts` | Imports the projection. `GET /v1/profile` and login: no call-site change. `GET /v1/messages`: `toPublicInboxMessages(outcome.messages)` at the route (repository stays truthful for S3b). Tenure grant: `xp: equalizedXp(outcome.xp, outcome.isCitizen)`. `CallerResolution` comment updated. The unused `PublicPlayerProfile` import dropped. |
| `src/profile-server/PlayerProfileRepository.ts` | `TenureCheckOutcome.isCitizen` (state after the call). `wasCitizen` read right after the lock; `duplicate`/`below_minimum` → `wasCitizen`, `granted` → `wasCitizen \|\| citizenshipNewlyGranted`, `not_found` → false. |
| `src/core/profile/InboxContract.ts` | `citizenship_granted` appended to `INBOX_TEMPLATE_KEYS`, required params `[]`, doc line. |
| `src/core/profile/PlayerProfile.ts` | Stale "Sprint 4's read is unauthenticated" comment rewritten (Bearer `vfy:false`; paid fields omitted; `xp`/`citizenship_earned_at`/`updated_at` equalized; pointer to `PublicProjection.ts`). Comment only — no schema change. |
| `src/client/PlayerProfileView.ts` | `loadPlayerProfileView` no longer calls `reportEarnedCitizenshipTransition` (D4). The function stays, now exported, documented "S3b calls this for verified reads only". Storage prefix → `geoconflict_citizenship_earned_at_v2:` (exported). |
| `resources/lang/en.json`, `ru.json` | `inbox.templates.citizenship_granted.{title,body}` — Q4 text, verbatim. Old `citizenship_paid` / `citizenship_earned` text kept. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | `CITIZENSHIP_EARNED_XP` row: dormant from the S1 **server** deploy until S3b, old and new clients alike (D4); verified reads only under the `_v2` prefix; over-count residual gone with the dormant event; "1,000-XP" → 100. |

Not edited, per the plan: `migrations/003_player_messages.sql` (applied migration), the wiki.

### Tests

| File | What |
|---|---|
| `tests/profile-server/PublicProjection.test.ts` | **new.** `equalizedXp` (citizen 0/30/99/100/1200; non-citizen 0/99); `toPublicProfile` (earned_at null, no paid keys, `updated_at === created_at`, schema-valid, `name_change` in/out); attempted-leak matrix (paid 0/30/99, paid-then-earned vs earned at 100) and deep-equality paid-not-earned vs earned at 100; inbox mapper (paid/earned → granted, others untouched, order/ids/`readAt` kept, collapse keeps oldest, params reset, no mutation). |
| `tests/profile-server/Routes.test.ts` | Existing GET test now asserts `earned_at` null and `updated_at === created_at`; new L1/L2 leak test (paid 0/30/99 vs earned 100: predicates equal, bodies equal, byte length equal, badge true). |
| `tests/profile-server/LoginRoutes.test.ts` | New L1/L2 leak test on login `profile`, valid fixtures only. |
| `tests/profile-server/TenureGrantRoutes.test.ts` | `outcome()` gains `isCitizen`; L3 tests: citizen at 30 shows 100 on `granted` and `duplicate` (and `below_minimum`); a citizen above 100 keeps true xp. Non-citizen 20/7/45 and newly-granted 110 unchanged. |
| `tests/profile-server/InboxRoutes.test.ts` | L4 tests: paid → granted; paid list ≡ earned list (incl. byte length); earned-then-paid collapses to the oldest. The "exactly as the repo orders them" test now uses non-citizenship keys (see decision log). |
| `tests/profile-server/InboxHooks.test.ts` | Tenure outcome assertions gain `isCitizen`; new block: `isCitizen` on every branch (already-citizen → true on duplicate/below_minimum/granted; non-citizen granted below 100 → false; `not_found` → false). |
| `tests/core/profile/InboxContract.test.ts` | Key list + required params + known-key check for `citizenship_granted`. |
| `tests/client/Inbox.test.ts` | `citizenship_granted` renders through its template. |
| `tests/client/InboxTemplateLang.test.ts` | **new.** Every `INBOX_TEMPLATE_KEYS` entry has title + body in en and ru, ICU-formats, placeholders = required params; the neutral note is the Q4 text verbatim and has no "100", no "xp", no purchase word (en + ru stems). |
| `tests/client/PlayerProfileView.test.ts` | A not-earned → earned sequence through `loadPlayerProfileView` never fires and writes nothing under either prefix; an old-prefix armed `""` never fires; direct tests of `reportEarnedCitizenshipTransition` under `_v2` (fires once, old-prefix `""` does not arm it, per-account, storage-unavailable). |
| `tests/integration/Routes.it.test.ts` | HTTP `templateKey` is now `citizenship_granted`; the stored row is still `citizenship_earned` (asserted above it, unchanged). |
| `tests/integration/PaidStateEqualization.it.test.ts` | **new.** Real repos + Postgres, signed test sessions, synthetic ids, seeded only through production paths (credits, `grantPaidPurchase`, the tenure check). Step 2: all four routes, paid-not-earned vs earned at 100, predicates + bodies; stored rows unchanged (`citizenship_paid` still stored, xp still 30). A granted tenure claim for a paid citizen at 30 reports 100 while the DB holds 40. Earned-then-paid shows one neutral message (the oldest id). Step 3: 12 players across (a)–(e): status, key set, JSON byte length (ids normalised), every paid-sensitive value; badge true for (a)–(d); non-citizens keep true xp and 403 on the inbox. **Timing not measured.** |

### Evidence

- `npx tsc --noEmit` — exit 0.
- `npm run lint` — exit 0.
- `npx prettier --check` over every touched source/test/lang file — clean (the five test files I
  touched were reformatted; the drift was only in my own lines, and all five were prettier-clean at
  HEAD). `analytics-event-reference.md` was already not prettier-clean at HEAD; I did not reformat it.
- `npm test` — **159 suites, 2687 tests, all passed, exit 0, first run** (shell harnesses included:
  `ShellHarnesses.test.ts` PASS). No re-run was needed.
- `npm run test:integration` (local `gc-0012-it-pg`, `.env.test`) — **12 suites, 150 tests, all passed.**
- Mutation check of the new integration suite: with the xp clamp and the inbox key remap disabled in
  `PublicProjection.ts`, all 4 of its tests failed; the file was restored byte-for-byte (verified with
  `git diff --no-index`).
- Flake, stated honestly: during targeted (not full) runs of `tests/profile-server/SessionRoutes.test.ts`
  — a suite this slice does not touch — 3 failures in ~15 runs, a different test each time, shape
  `Exceeded timeout of 5000 ms` + `Jest did not exit one second after…` (the confirmed supertest
  flake family, CLAUDE.md). No `SIGSEGV`. One of the three failures (the first) was not captured with
  its full output, so its shape is unconfirmed.

### Decision log (applied without asking — each inside the approved plan's intent)

1. **Kept citizenship message's `templateParams` reset to `{}`** (`toPublicInboxMessages`). Answers: L4
   (bodies must be identical). What: the neutral template substitutes no params; both server hooks already
   store `{}`, but the operator send route accepts extra params on a citizenship key, which would
   otherwise survive the remap and differ between rows. Why it qualified: obvious winner — mechanical,
   one line, within the plan's "paid and earned look the same" intent; changes nothing for any row the
   server itself writes.
2. **`loadPlayerProfileView` still reads the Yandex id.** What: only the call to the detector was removed;
   the `yandexPlayerId === null ⇒ zero-state` gate stays. Why: removing the read would change
   zero-state behaviour, which the plan did not ask for; S3b needs the id again. Mechanical, in-plan.
3. **`EARNED_AT_STORAGE_KEY_PREFIX` exported** alongside `reportEarnedCitizenshipTransition` so the
   tests can assert the `_v2` prefix. Mechanical, in-plan (the plan exports the function).
4. **Wording of the "over-counts a paid citizen" residual.** The plan says that residual "no longer
   applies". Strictly, it does not apply *while the event is dormant*; once S3b re-enables the detector on
   verified reads, a paid citizen crossing 100 would still get `citizenship_earned_at` stamped and fire —
   unless S3b uses the (then visible) paid state to rule it out. I wrote it that way in the code comment
   and the analytics doc rather than claim it is gone for good. **S3b's plan should carry this.**
5. **InboxRoutes "exactly as the repo orders them" test fixture changed** from two `citizenship_earned`
   messages to three name-change messages. Why: under Q2 two citizenship messages collapse to one, so the
   old fixture no longer tested ordering. The collapse itself has its own tests.
6. **Integration enumeration uses 2-day (below-minimum) tenure claims** so the check records 0 XP and no
   player changes class mid-test; the `granted` branch has its own dedicated test.
7. **Lang test is a new file** (`tests/client/InboxTemplateLang.test.ts`), per the plan's "a new or
   extended lang test".

No regression or review oscillation arose; nothing outside the plan was changed.

### Left open (not done by this build — for the producer / owner)

- **Residuals to record as accepted in `0325`'s ADR, alongside L5** (plan §8, Q3 ruling): the
  exactly-100 probabilistic bias; the "played a match, xp did not move" inference for an observer with
  outside knowledge (still there even with Q1); the §3 rollback caveat (old-bundle devices with `""` under
  the **old** prefix would fire a false Earned event after a *server* rollback). The `0325` ADR does not
  exist yet and the `0325` brief does not list these; this build did not edit either (outside its file
  list).
- **Deploy is owner-run: client first (`build-deploy.sh`), then profile server
  (`build-deploy-profile.sh`).** Reversed order ⇒ old clients drop the neutral inbox message.
- After close: `fkit-wiki` should ingest.

## 2026-09-27 — Process review, slice S1, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as its Process-review worker)

Under the loop's declared-approval marker; approved `plan.md` blob `c1d4166f349aebef1920d8e35297d67970f15778`
re-checked with `git hash-object` — unchanged, and not edited. Ledger: `review.md`, findings R1–R3. Nothing
committed. Task status untouched.

### Owner rulings — recorded verbatim

Given 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:

- **Q-A** (settles R3, decides R1's fix): *"Every citizen = exactly 100 (Recommended)"* — option text: *"All
  citizens show exactly 100 everywhere (including the tenure-bonus reply) until verified login. Closes it fully
  (also removes the 'exactly 100' hint). Cost: earned citizens see '100 / 100' on their own card instead of their
  real XP until 0325 + part 2 ship."*
- **Q-B** (R2): *"Fix it in part 1 (Recommended)"* — option text: *"The count never reveals hidden messages.
  Small, invisible to players."*

### What changed

| File | Change |
|---|---|
| `src/profile-server/PublicProjection.ts` | `equalizedXp`: citizen ⇒ exactly `CITIZENSHIP_XP_THRESHOLD` (was `max(xp, 100)`); name kept, doc rewritten. New `hiddenInboxMessageIds(messages)` — the ids `toPublicInboxMessages` drops. Module doc updated. |
| `src/profile-server/Routes.ts` | `PATCH /v1/messages/read`: lists first (403 on `not_citizen`), then by-id drops hidden ids; mark-all marks hidden ids (count discarded, call always made) then the listed visible unread ids by id and reports that count. Tenure route: comments on `xpAwarded` (kept true) and `xp` (Q-A). |
| `src/core/profile/TenureGrantContract.ts`, `src/client/TenureGrantClaim.ts` | Comment only: `xp` is the threshold for a citizen. |
| `ai-agents/tasks/backlog/0325-…/brief.md` | Appended a dated line to its 2026-09-27 S1-residuals section: items 1 and 2 closed by Q-A, item 3 stands, plus the new 100 / 100 cost. Nothing deleted. |
| `review.md` | *Coder response* rows R1–R3, rulings verbatim, residual wording updated (dated notes, old text kept), one new residual, `Status: closed-out`. *Reviewer findings* and `Coverage:` untouched. |

Tests: `PublicProjection.test.ts` (constant; moved earned citizens 101/110/1200 project like 100; hidden-id
helper), `TenureGrantRoutes.test.ts` (impossible fixture replaced — see R1 below), `Routes.test.ts` and
`LoginRoutes.test.ts` (earned at 1200 and paid-then-earned at 140 now compared too; a "moved" predicate),
`InboxRoutes.test.ts` (PATCH tests rewritten for list-first; in-memory inbox R2 leak tests, both forms),
`SessionRoutes.test.ts` and `NameChangeRoutes.test.ts` (stale expectations), integration
`PaidStateEqualization.it.test.ts` (R1 probe, R3 credit probe, crossing, R2 probe; enumeration now asserts
exactly 100 and identical tenure bodies) and `TenureGrant.it.test.ts` (a crossing claim now reports 100, store 110).

### Evidence

- `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · prettier clean on every file touched this round.
- `npm test`: first full run **2 failed** — `NameChangeRoutes.test.ts` (expected xp 1000, got 100) and
  `SessionRoutes.test.ts` (mark-all now calls `markRead(id, [])`, not `(id, undefined)`). Both are stale
  expectations caused by this round's change, **not flakes**; fixed. Second full run: **159 suites, 2700 tests,
  all pass** (shell harnesses included).
- `npm run test:integration` (local `gc-0012-it-pg`): first run 1 failed — `TenureGrant.it.test.ts` expected the
  true 110 on a crossing claim; stale under Q-A, fixed. Re-run: **12 suites, 154 tests, all pass.**
- Mutation run: restoring the floor and disabling the hidden-id filter ⇒ 5 of 8 `PaidStateEqualization` tests
  fail (R1, R3, crossing, R2, enumeration); file restored byte-identical (`cmp`).
- Timing still not measured (the R2 fix adds one list query per PATCH for every caller alike, and the
  hidden-ids mark call is always made, so the query count does not depend on paid state).

### Decision log — each fix applied without per-fix owner approval, and why it qualified

1. **R1 → `equalizedXp` returns exactly 100 for every citizen.** Answers R1 (and R3). What: `max(xp, 100)` →
   `100`. Qualified: verified-`CORRECT` (code read + mutation run), one-line mechanical change, and it is
   exactly the owner's Q-A ruling, which widens the approved plan's intent ("paid and earned look the same").
2. **R1 → `xpAwarded` stays the true amount for citizens (coder decision, delegated by the lead's relay:
   "Decide what `xpAwarded` must be").** What: no code change to `xpAwarded`; documented at the route. Why it
   qualified as an obvious winner within intent: `xpAwarded` is a pure function of the request's evidence (or
   the first claim's evidence on `duplicate`), never of paid state, so it cannot separate paid from earned;
   with `xp` constant, no movement is visible. Zeroing it for citizens would hide the thank-you popup
   (`CitizenshipCard` gates on `xpAwarded > 0`) and report 0 to `Citizenship:TenureGrant:Claimed` for every
   citizen — a behaviour change with no privacy gain. A non-citizen crossing through the claim gets the same
   rule (true `xpAwarded`, `xp` 100). **The owner can overturn this** — flagged in the report.
3. **R1 → impossible test fixture replaced.** The `TenureGrantRoutes.test.ts` earned `granted` fixture at xp 100
   (no grant added) → real outcomes (paid 30→42 vs earned 100→112, etc.). Mechanical, in-plan (tests).
4. **R2 → route-level filter on `PATCH /v1/messages/read`.** Answers R2 per Q-B. What: list first, drop hidden
   ids from the by-id form, mark hidden ids silently then the visible unread ids by id on mark-all. Qualified:
   verified-`CORRECT` (code read of `MARK_*_SQL`; mutation run), localized to one route + one pure helper,
   repository untouched (keeps it truthful for S3b, as the plan does for GET). Side effect I accepted as an
   obvious winner: mark-all now covers only messages listed in the same request, so one arriving mid-request
   stays unread for the next open — the only race-free way to keep the count off hidden rows without SQL
   changes; the client ignores `updated` beyond its schema (`Inbox.ts` `markInboxRead`). Plan § 6's "mark all
   read still marks them" is kept.
5. **Stale expectations updated** (`NameChangeRoutes.test.ts`, `SessionRoutes.test.ts`,
   `TenureGrant.it.test.ts`) and **two stale comments** (`TenureGrantContract.ts`, `TenureGrantClaim.ts`).
   Mechanical consequences of 1 and 4.
6. **Ledger residual wording** updated with dated notes (old text kept, not rewritten), per the relayed
   instruction; one new residual added for the Q-A constant (its `xpAwarded` half marked as a coder decision,
   not an owner ruling).

No regression or review oscillation arose. Nothing outside the approved plan + the Q-A / Q-B rulings changed.

### Client consumers of citizen xp — checked

- `CitizenshipCard` (`renderLoggedIn`): shows `profile.xp / 100` → **100 / 100** for every citizen; the bar
  was already forced to 100 % for citizens. Accepted cost (Q-A).
- `TenureGrantModal`: body is "…giving you {xp} XP. You now have {total} / {threshold} XP." → for a citizen,
  "+10 … 100 / 100", and for a non-citizen crossing at 95 it reads "+10 … 100 / 100" (95 + 10 ≠ 100). Reads a
  little oddly; nothing breaks. Within the accepted Q-A cost.
- `TenureGrantClaim` → analytics `Citizenship:TenureGrant:Claimed` carries `xpAwarded` — unchanged, still true.
- No other client code reads `xp` (grep of `src/client` outside `graphics/`). No "to next" UI exists.

### Left open

- Reviewer re-verification of the round-1 fixes has not happened (the ledger is set `closed-out` per the
  driver's instruction, since nothing blocking remains).
- Deploy order unchanged: client first, then profile server.
