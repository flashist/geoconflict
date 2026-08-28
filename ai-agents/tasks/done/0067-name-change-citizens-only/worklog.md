# Worklog — Task 0067: Name Change (Citizens Only)

**Built by:** `fkit-coder`, spawned as the Build worker of `/fkit-sprint-ship-loop` (lead session).
**Date:** 2026-08-28
**Approved plan:** `plan.md` in this folder (blob `bcb91c8ad8ecc0299448fd88ae3a43259f175b23`, verified on
disk at build time via `git hash-object`) + its four owner amendments.
**Standing approval / scope boundary:** that plan. Nothing outside it was implemented.

---

## What was built

The full request → moderation → apply loop, end to end, plus owner amendment 2's self-service cancel.

### New files

| File | What it is |
|---|---|
| `migrations/004_name_change.sql` | `rejection_reason` + `decided_at` columns; the one-pending partial unique index; a latest-request index. |
| `src/core/validations/usernameRules.ts` | Dependency-free length/charset rules returning message keys. The extraction that lets the profile server share the in-game validator. |
| `src/core/notifications/TelegramNotifier.ts` | Shared `sendTelegramMessage()` — undici + ProxyAgent, abort timeout, never throws, token never logged. |
| `src/core/profile/NameChangeContract.ts` | Zod wire contracts + the public `NameChangeState` projection. |
| `src/profile-server/NameChangeRepository.ts` | Data layer: request / cancel / decide / getLatestState. Citizen gate in SQL. |
| `src/client/NameChangeRequest.ts` | Client orchestration (`CitizenshipPurchase.ts` precedent). Resolves the player id itself. |

### Modified files

| File | Change |
|---|---|
| `src/core/validations/username.ts` | `validateUsername` is now a thin translating wrapper over `usernameRules`. Same keys, same params, same ordering. `sanitizeUsername`/profanity untouched. |
| `src/core/profile/PlayerProfile.ts` | `PublicPlayerProfileSchema` gains `name_change` via `.extend()`, `.optional()`. `PlayerProfileSchema` untouched. |
| `src/profile-server/Routes.ts` | `NameChangeRepo` interface; 4th `createApp` param; `toPublicProfile` merges the state; three new routes. |
| `src/profile-server/Server.ts` | Constructs `NameChangeRepository`, reads + warns on the three Telegram env vars. |
| `src/client/PlayerProfileView.ts` | View model gains `nameChange`. |
| `src/client/CitizenshipCard.ts` | Name-change UI: idle / editing / pending / rejected, with the cancel control. |
| `resources/lang/en.json`, `ru.json` | New `citizenship_name_change` section (15 keys), both files, additions only. |
| `example.env.profile`, `setup-profile.sh`, `build-deploy-profile.sh` | The three Telegram vars documented and plumbed through to the box. |

### Endpoints

- `POST /v1/profile/name-change-request` — player, citizen-gated, 30/min per IP.
- `POST /v1/profile/name-change-cancel` — player, citizen-gated (**amendment 2**).
- `POST /internal/v1/name-change/decide` — `internalAuth`, no CORS.

---

## Decision log — things decided WITHOUT asking

Recorded per ADR-019's audit obligation (which transfers to this spawn under ADR-032). Each entry says
what changed, why, and why it qualified as in-plan-and-mechanical or an obvious winner.

1. **Cancel = DELETE the pending row, not a new terminal status.**
   Amendment 2 says "clears the caller's own pending row". 001's CHECK allows only
   pending/approved/rejected, so a `cancelled` status would need a constraint rewrite. Marking it
   `rejected` would lie about who rejected it and leave a reason-less rejected row the card would
   render as an operator rejection. Delete is the reading that needs no schema fight.
   *Obvious winner within the amendment's intent.* Scoped to the caller's own id AND `moderation_status
   = 'pending'`, so a decided row can never be erased — tested.

2. **Name-change rate limiter set to 30/min, not the 10/min I first wrote.**
   The plan said "own stricter limiter" without a number, so the value was mine to pick. Raised after
   reasoning it through: it is per-IP and Russian carriers CGNAT thousands of players behind one
   address, rejected probes burn the same budget, and — the deciding fact — operator Telegram spam is
   **not** bounded by this limiter anyway but by the one-pending unique index (a second request from the
   same player 409s without inserting or notifying). 30/min stays 2× stricter than the shared profile
   read. Reasoning is in the code comment. **Flagged for review** — it is a security-relevant number.

3. **`GET /v1/profile` degrades instead of 500ing when the name-change lookup fails.**
   That read drives the whole citizenship card (XP, badge, buy CTA). Letting a newly-added secondary
   subsystem take it down was the worse failure. Caught, logged, `name_change` omitted. The cost is
   bounded: the card shows no pending state and a second request is refused cleanly by the DB index.
   *Defensive and localized, inside the plan's change surface.* Tested.

4. **Request-time "name taken" check excludes the caller's own row.**
   Updating a row to its current value never violates the unique index, so re-requesting the name you
   already hold is not a collision. Rejecting it would have meant inventing a "same as current" rule,
   which owner ruling (c) forbids ("no new bespoke rules"). *Mechanical, follows the ruling.* Tested.

5. **The three Telegram vars added to `build-deploy-profile.sh`'s export block, not just
   `setup-profile.sh`.** The plan named the latter two files; without the export block the vars never
   reach the box, so `setup-profile.sh` would write empty values and the feature would be silently dead
   on deploy. *Mechanical completion of the plan's stated intent.*

6. **Integration suite builds a fresh app per test.** `createApp` builds the per-IP limiter and every
   request in the suite comes from 127.0.0.1, so one shared app exhausted the window and turned later
   tests into 429s. A harness artifact, not the limiter being wrong. *Test-only; no production
   compromise.*

7. **`PlayerProfileView.ts` deliberately left prettier-unclean.** It was already unformatted before this
   task (a long line at :91). Running prettier on it would have reformatted unrelated pre-existing code.
   My additions to it are conformant. Every other file I touched is formatted.

8. **One real bug found and fixed mid-build:** `renderNameChange` read `profile.nameChange` and compared
   `!== null`, which walks into a property read on `undefined` for any view object omitting the field.
   Fixed with `?? null`; a regression test covers it.

**Deviations from the plan body:** none beyond the above. The plan's sequence was followed in order,
including its gate at step 2 (`npm test` green after the `username.ts` extraction — 97 suites / 874
tests — before continuing).

### Round 1 review response — 2026-08-28

Applied under the owner's per-finding dispositions relayed by `fkit-sprint-ship-loop`, so these were
**not** unattended judgement calls; they are logged here anyway so a wrong fix stays findable. Full
verdicts are in `review.md`'s *Coder response*.

7. **R2 — trim the requested name server-side** (`NameChangeRepository.requestNameChange`).
   *Answers:* R2, the server being strictly more permissive than the validator ruling (c) told it to
   mirror — `"   "` is 3 characters and `\s` is inside `validUsernamePattern`, so it passed.
   *Changed:* `requestedName.trim()` once, before `checkUsernameRules`; the trimmed value is what is
   uniqueness-checked, inserted, and put in the operator's Telegram message. *Qualified:* owner-ruled
   FIX, verified `CORRECT` against both client trim sites (`UsernameInput.ts:72`,
   `CitizenshipCard.ts:560`), mechanical and localized to one method. **Deliberately NOT trimmed inside
   `checkUsernameRules`** — that is shared `src/core/` game code and trimming there would silently
   change in-game `validateUsername` behavior, which the plan required to stay byte-identical.

8. **R3 — one cached `ProxyAgent` per proxy URL** (`TelegramNotifier.ts`).
   *Answers:* R3, a dispatcher and its keep-alive socket pool leaked on every send. *Changed:* a
   module-level `Map<string, ProxyAgent>` + `proxyAgentFor()`. *Qualified:* owner-ruled FIX; the
   precedent named in the finding is real (`Master.ts:213` hoists one module-level agent). Keyed by URL
   rather than hoisted from env because this helper takes its config as a parameter; in practice the map
   holds exactly one entry, from the single `TELEGRAM_PROXY_URL` the process starts with.

9. **R4 — narrow both `23505` catches by index name.**
   *Answers:* R4. *Changed:* `isUniqueViolationOn(error, constraint)` replaces the bare code check on
   the approve path **and** on the insert path; anything else rethrows. *Qualified:* owner-ruled FIX
   NOW. Extending it to the insert path as well is a one-line symmetry the finding did not ask for — the
   same silent-misreport risk applies to `pending_exists`, and leaving one of two catches un-narrowed
   would contradict the file's own header comment. *Obvious winner within the ruling's intent.*
   **Verified empirically, not assumed:** Postgres does populate `constraint` for a partial unique
   *index*, proven by the two integration tests that still pass (`pending_exists` and the approve race).

10. **R1 — escalated first, then implemented as owner-ruled option A.**
    *Answers:* R1. The first disposition (a per-player cooldown) was **not** written as worded: the
    decide endpoint binds only to the player id, so a request → cancel → re-request cycle inside the
    window would have swapped the pending name under a notification the operator already held, with no
    second message to contradict it — a bypass of the human moderation gate, the only mitigation the
    forged-id residual has. Returned as `NEEDS-DECISION`; the owner ruled **option A** (2026-08-28,
    `AskUserQuestion` in the lead session) and **extended the approved scope to cover the new wire
    field**.
    *Changed:* (a) `claimNotifySlot` — one notification per player per 10 minutes, keyed on the player
    alone (exempting a changed name would hand the flood back to anyone varying the string);
    (b) optional `expectedName` on `NameChangeDecisionRequestSchema`, compared inside the decision
    transaction, mismatch → rollback → 409 `name_mismatch` with `pending_name`, applied to rejections
    as well as approvals; (c) the notification now carries the ready-to-paste command including
    `expectedName`, with shell-variable placeholders only and the command omitted for a player id
    outside `[A-Za-z0-9_-]` (ids are client-asserted; an operator pastes this into a shell).
    *Why the wire field was justified:* it is the only thing that makes suppressing a notification
    safe — the cooldown and the binding are one fix, not two, and shipping the cooldown alone was the
    regression. It is **optional** on the wire, so the operator's separately-deployed tooling keeps
    working unchanged (the `PublicPlayerProfileSchema` lesson), and a test proves that rather than
    assuming it. Authorized by the owner ruling above, not decided here.
    *Proven:* the bypass itself is an integration test against real Postgres, not a construction
    argument — stale `expectedName` → 409, nothing applied, row still `pending`.

11. **R5 — corrected the doc comment on `NameChangeStateSchema`** (`NameChangeContract.ts`).
    *Answers:* R5. The owner ruled no *behavior* change, but the comment sitting directly above the
    exposed field repeated the "operator sees every name" framing the ruling says does not cover it.
    *Changed:* comment text only — no code, no schema, no wire shape. *Qualified:* mechanical, localized,
    and it is the ruling's own instruction ("rewrite the residual so it states that exposure honestly")
    applied at the one place a future reader meets the field.

---

## Verification — what was actually run

Docker was **up**, with the existing `gc-0012-it-pg` Postgres on port 5433, so the DB-backed steps
really ran. Nothing below is inferred.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (exit 0, no output) |
| `npm run lint` | **PASS** (clean) |
| `npm test` | **PASS** — 103 suites, 1018 tests |
| `RUN_DB_TESTS=1 … npx jest --runInBand` | **PASS** — 5 suites, 64 tests |
| `npm run migrate` on a cold scratch DB | **PASS** — applied 001→004 in order; re-run skipped all four |
| `\d player_name_history` | Confirmed both new columns, the partial unique index, the recent index |

### Re-verification after the round 1 review fixes — 2026-08-28

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (exit 0, no output) |
| `npm run lint` | **PASS** (exit 0) |
| `npm test` | **PASS** — 103 suites, 1039 tests (was 1018; +21 new) |
| `RUN_DB_TESTS=1 TEST_DATABASE_URL=… npx jest tests/integration --runInBand --forceExit` | **PASS** — 5 suites, 70 tests (was 64; +6 new) |

Figures above are after **both** rounds of fixes (R2/R3/R4, then R1's cooldown + `expectedName`).

**Flake, disclosed — it recurred:** `npm test` aborted one suite with a jest-worker `SIGSEGV` on two
separate runs, on a DIFFERENT untouched file each time — `tests/Colors.test.ts` first, then
`tests/core/game/StartGold.test.ts`. Both pass standalone (8/8 and 2/2) and both full re-runs were
103/103 green. Treated as an environment/worker flake, not a result; the passing figures are the clean
runs. **Worth its own look** — it is not caused by this task's files, but it will keep making CI and
reviewer runs look red at random.

**One real test failure en route, disclosed:** the first version of the "no secret in the message"
assertion used the shared `TELEGRAM` fixture whose token is the single letter `"t"`, so
`not.toContain("t")` failed against ordinary prose. The **assertion** was wrong, not the code; it now
uses a distinctive placeholder token. No real credential is in any fixture.

**`--forceExit` needed, disclosed:** running the whole `tests/integration` directory without it hung
past a 10-minute timeout (open `pg` pool handles after the suites finish). Pre-existing behavior of
these suites, not introduced here, but it means the reviewer's identical command can hang.

New tests: 27 integration, 26 repository, 26 route, 25 core (rules + Telegram), 13 client API, 27 lang
parity, 22 card UI, 3 profile-view. Existing `PlayerProfileView.test.ts` assertions updated for the new
field (they used exact `toEqual`), plus 3 new cases there rather than a bare repair.

### Brief verification steps

| Step | Proven where |
|---|---|
| 1 — non-citizen/guest hidden; direct POST rejected | Integration (403, nothing written) + card tests (absent for guest, non-citizen, non-authoritative) |
| 2 — pending row, name unchanged, UI pending | Integration — asserts `moderation_status = 'pending'` **explicitly** (the 001 default-`'approved'` trap) + card tests |
| 3 — approve atomic, profile returns new name, inbox sent | Integration over `createApp` + a bounded `waitForMessages` poller |
| 4 — reject with reason, name unchanged, retry allowed | Integration + card tests |
| 5 — case-insensitive duplicate → refused, no pending row | Integration (`"ivan"`/`"IVAN"` vs an existing `"Ivan"`) |
| 6 — second request while pending → refused | Integration (the partial unique index fires) |
| 7 — operator Telegram notification | **Unit only**, `jest.mock("undici")` — see residuals |
| 8 — local stack green; en/ru keys | All commands above + `NameChangeLang.test.ts` |

Beyond the brief: the approve-time uniqueness race (409, row stays `pending`, operator can still
reject), and a `validateUsername` parity suite guarding the extraction.

---

## Residuals / not done

1. **Vector 1 of amendment 2 remains OPEN, by owner ruling.** A griefer who knows a citizen's
   non-secret player id can submit an offensive name in that citizen's name. Mitigated ONLY by the human
   moderation gate. Closes when signed-payload player verification lands (blocked on the Yandex IAP
   secret, task 0014). Do not describe this as solved. Vector 2 (permanently blocking a citizen with a
   pending request they cannot clear) IS closed, by the cancel endpoint.
   **Widened after review R5 (owner-ruled 2026-08-28):** a second, SEPARATE exposure sits under the same
   root and is **unmitigated** — the pending, unmoderated `requested_name` is returned by the
   unauthenticated, enumerable `GET /v1/profile`, so a forged request attaches an arbitrary string to a
   citizen's publicly readable profile with **no gate at all**. The moderation gate does not apply: it
   reviews a name before it is APPLIED, not before it is PUBLISHED. Owner chose to keep the field (the
   player must see what they requested). Full wording in `review.md`'s *Accepted residuals*.
2. **Telegram from the profile VPS is UNVERIFIED end to end.** Proxy reachability from that box cannot
   be tested locally; task 0033's brief flags the same thing. Brief step 7 is proven at the unit level
   (one call, correct chat, failure never fails the request) — not against the live API. Genuine
   deferred live-tail item.
3. **The card is hard-gated off.** `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is still
   `false`, so the UI is provable by unit tests only — it was **not** seen in a browser. Flipping that
   flag is the citizenship relaunch, not this task.
4. **`Master.ts` keeps its two duplicated Telegram call sites** — deliberate, owner-confirmed
   (amendment 3). Three copies co-exist until task 0033 consolidates them.
5. **No analytics events** — owner ruling, amendment 4.
6. **Pre-existing defect found, NOT fixed (outside this plan):** `YANDEX_PAYMENTS_SECRET` is missing
   from `build-deploy-profile.sh`'s export block, so it never reaches the box and
   `setup-profile.sh`'s `${YANDEX_PAYMENTS_SECRET:-}` always writes empty — payments silently disabled
   on deploy since task 0019. Not touched: it changes a live money path and is outside the approved
   plan. **Needs an owner decision / its own task.**
7. Nothing was committed. No task file was moved.
