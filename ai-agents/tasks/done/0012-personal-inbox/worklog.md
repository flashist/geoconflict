# Worklog — 0012 Personal Inbox

## 2026-08-26 — Plan (fkit-coder, spawned plan-only by the lead's sprint loop)

- `plan.md` written and **approved by the owner via `AskUserQuestion` in the lead session**
  (driver `fkit-sprint-ship-loop`), with D1–D6 ruled as recorded in the plan's approval record.

## 2026-08-26 — Build (fkit-coder, Build worker under the declared-approval marker; ADR-032 D3 / ADR-019 discipline)

Implemented the approved plan in full, §7 sequencing. No commit made (rule intact). Wiki untouched.
Sprint plan and brief status untouched by this worker.

### Change surface

**New**

- `migrations/003_player_messages.sql` — `player_messages` (template OR literal content,
  `chk_message_content`, `chk_read_after_sent`, FK cascade, two indexes).
- `src/core/profile/InboxContract.ts` — shared wire schemas: template-key enum,
  `InboxMessageSchema`, `InboxListResponseSchema`, `MarkReadRequest/ResponseSchema`,
  `SendMessageRequest/ResponseSchema` (refine mirrors the DB CHECK).
- `src/profile-server/InboxRepository.ts` — sole reader/writer of `player_messages`; `InboxSender`
  interface for the seams; citizen gate in SQL on every list/mark-read; `no_profile` on FK violation.
- `src/client/Inbox.ts` — client logic: launch-flag gate (D5) → auth → id → profile API base →
  `GET /v1/messages` (5 s abort, Zod); 403 ⇒ unavailable; failures ⇒ `error` + `Inbox:LoadFailed`;
  module cache + single-flight; `markInboxRead(ids?)`; `renderInboxMessage`; `formatInboxDate`.
  Never calls `loadPlayerProfileView()` (double-fire guard, plan risk 10 — comment in file).
- Tests: `tests/core/profile/InboxContract.test.ts`, `tests/profile-server/InboxRoutes.test.ts`,
  `tests/profile-server/InboxHooks.test.ts`, `tests/profile-server/InboxRepository.test.ts` (unit,
  mapping + SQL choice — an addition beyond the plan's list, cheap DB-free coverage),
  `tests/client/Inbox.test.ts`, `tests/integration/InboxRepository.it.test.ts`.

**Modified**

- `src/profile-server/PlayerProfileRepository.ts` — constructor `(pool, inbox?)`;
  `afterCitizenshipEarned` filled (sends `citizenship_earned`), contractually never-throws (sync
  throw caught, async rejection logged), call site ALSO try/catch-wrapped (D4; 0017 residual R1).
- `src/profile-server/PaymentsRepository.ts` — same treatment for `afterPaidPurchaseGranted`
  (sends `citizenship_paid`; only on `"granted"`, never on `already_processed`).
- `src/profile-server/Routes.ts` — `createApp(repo, payments?, inbox?)`; `InboxRepo` interface;
  the single `resolvePlayerId(req)` trust funnel (ADR-103 re-raise comment); `OPTIONS/GET
  /v1/messages`, `PATCH /v1/messages/read` (`inboxCors` GET+PATCH, shared 60/min limiter, 503
  `inbox_unavailable` when no repo); `POST /internal/v1/messages/send` (internalAuth, 401/400/404
  `no_profile`/200/503/500) with the header comment = the brief's "documented" (request shapes,
  responses, curl example).
- `src/profile-server/Server.ts` — one `InboxRepository` feeds both repositories and `createApp`.
- `src/client/NewsModal.ts` — tab strip (`role="tablist"`, plain CSS mirroring `StartScreenTabs`)
  rendered ONLY when `inbox.available`; Global = unchanged list; Personal = newest-first, unread rows
  marked, `inbox.empty` state; selecting Personal → `Inbox:Opened` + `UI:Tap:AnnouncementsTabPersonal`
  + `markInboxRead()`; default Global on every open; `refreshInbox()` on open.
- `src/client/components/NewsButton.ts` — dot = unread announcements OR `unreadCount > 0`; kicks
  `loadInboxState()` after `flashist_waitGameInitComplete()`; listens to `inbox-state-changed` and
  re-fetches on `PURCHASES_RECONCILED_EVENT`.
- `src/client/flashist/FlashistFacade.ts` — enum `INBOX_OPENED`, `INBOX_LOAD_FAILED`;
  `uiElementIds.announcementsTabGlobal/Personal`. **`CITIZENSHIP_CARD_ENABLED` untouched (`false`)** —
  `git diff` shows no change to that line.
- `resources/lang/en.json` + `ru.json` (both) — `announcements.tab_global/tab_personal`, `inbox.empty`,
  `inbox.templates.{citizenship_earned,citizenship_paid,name_change_approved,name_change_rejected}.{title,body}`;
  the old `citizenship_earned.inbox_*` / `citizenship_paid.inbox_*` keys moved under
  `inbox.templates.*` (plan 4d; grep confirms no remaining reader of the old keys).
- `ai-agents/knowledge-base/analytics-event-reference.md` — 2 UI-event rows + 2 UI:Tap rows.
- `ai-agents/knowledge-base/architecture.md` — 3 route rows + `player_messages` in the data model.
- `tests/integration/Routes.it.test.ts` — now applies 001+002+003 and wires the app exactly as
  `Server.ts` does; 4 new inbox tests (earned ⇒ exactly one message over HTTP; paid ⇒ one, replay
  silent; cross-device read state; internal send 401/404/200).

### Verification evidence (actual runs, this session)

| # | Command | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | exit 0 |
| 2 | `npm run lint` | exit 0, clean |
| 3 | `npm test` | **96 suites / 812 tests PASS** (was 89/709 at 0017; +7 suites incl. the 6 new ones) |
| 4 | `npx prettier --check` on touched files → `--write` on 7 flagged files, then their suites + eslint re-run | 56/56 pass, eslint clean (mechanical formatting only) |
| 5 | `docker ps` + `nc -z 127.0.0.1 5433` | **Owner's container was NOT running** (no containers, port closed). Daemon up, `postgres:16-alpine` image present → started `gc-0012-it-pg` (port 5433, DBs `gc_it` + `gc_local`) — see decision log |
| 6 | `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgres://…@127.0.0.1:5433/gc_it npx jest --runInBand` (cold DB) | **4 suites / 37 tests PASS** — InboxRepository.it (8), Routes.it (5 existing + 4 new), PlayerProfileRepository.it, PaymentsRepository.it |
| 7 | `DATABASE_URL=…/gc_local npm run migrate` (the real runner) | applied 001, 002, 003 — "migrations up to date" |
| 8 | `npm run start:profile-server` (:8790, local token, `gc_local`) | `/health` 200 `ok`, `/ready` 200 `ready` |
| 9 | Live curl loop (below) | all 17 steps as expected |
| 10 | `npm run build-dev` (webpack client bundle, run after all edits + formatting) | exit 0 — `webpack 5.100.2 compiled successfully in 8618 ms`, 0 errors; no tracked files changed by the build |

**Live curl loop (step 9), player `yandex-local-inbox`:**

1. upsert via `/internal/v1/profile/upsert` → 200, xp 0, `is_citizen` false
2. `GET /v1/messages` → **403 `not_citizen`**, CORS `*` / `GET, PATCH` / `Content-Type` present
3. `GET /v1/messages` without id → 400
4. `/internal/v1/credit` +1000 → `credited`
5. `GET /v1/messages` → 200, exactly one `citizenship_earned`, `readAt: null`
6. duplicate credit + later game → `duplicate` / `credited`; message count still **1**
7. `OPTIONS /v1/messages/read` → 204 + CORS headers
8. `PATCH /v1/messages/read` (all) → `{"updated":1}`
9. `GET /v1/messages` ("second device") → `readAt` set (cross-device done-criterion)
10. `PATCH` again → `{"updated":0}` (idempotent)
11. internal send without token → 401
12. internal send to `ghost` → 404 `no_profile`
13. internal send with title only → 400 `bad_request`
14. internal send literal + template (`name_change_rejected`, params) → 200 `{id:3}`, `{id:4}`
15. `GET` → 3 messages newest first, ids 4/3 unread, 1 read
16. `PATCH` with `ids:[4]` → `{"updated":1}`
17. `PATCH` as `someone-else` with P's id → 403 `not_citizen` (cross-player isolation; SQL scope also pinned by the it-test)
18. DB view (`psql`): `1|citizenship_earned||t`, `3||Hello|f`, `4|name_change_rejected||t`

Server stopped after the loop. **Container `gc-0012-it-pg` left RUNNING** for the reviewer
(`docker rm -f gc-0012-it-pg` to remove). No secrets anywhere: local token / password are throwaway
test values that exist only in the container and this session.

**ICU check (localisation):** `translateText` renders through `IntlMessageFormat`, where an apostrophe
immediately before `{` starts a quoted literal. The brief's `'[name]'` therefore had to be written
`''{name}''` in `en.json`; verified with `intl-messageformat` directly: en →
`Your new display name 'Alpha' is now active.`; ru uses `«{name}»` (no apostrophe issue); the existing
`You've …` strings are unaffected (apostrophe not followed by a syntax char).

**4f HTML-template re-verification:** no edit needed — `src/client/index.html:232` (`<news-button>`)
/ `:336` (`<news-modal>`) and `src/client/yandex-games_iframe.html:352` / `:467` mount both
components; the tab strip lives inside `news-modal`'s shadow root.

### NOT run / listed for the owner

- **Browser check** (plan §6 live loop, last leg): citizen sees Personal tab + bell dot, non-citizen /
  guest sees no tab, open tab → dot clears → reload shows read state, in `yandex-games_iframe.html`
  with `CITIZENSHIP_CARD_ENABLED` temporarily `true` and `PROFILE_API_URL` → the local profile
  server. Not driven here by instruction (no browser in this unit); the client logic under it is
  covered by `tests/client/Inbox.test.ts` (17 tests) and the wire is proven by the curl loop.
- **Deferred Live Tail** — unchanged, gated on `0062` (brief); not part of this build.

### D1 re-raise record (ADR-103 exit)

The player endpoints trust the client-asserted `yandexPlayerId` (owner-ruled D1 (C), 2026-08-26). All
of that trust sits in ONE function: `resolvePlayerId(req)` in `src/profile-server/Routes.ts`. **Re-raise
trigger:** when ADR-103 exits — the Yandex secret lands (0014) and signed-player verification exists —
the signature check drops into `resolvePlayerId` and nowhere else; the SQL citizen gate stays. Until
then anyone who knows a citizen's (non-secret) Yandex id can read that citizen's system notices and
mark them read (low-sensitivity: citizenship notices; later name-change verdicts incl. a rejection
reason). Same exposure class as `/v1/profile` today.

### Decision log (ADR-019 audit obligation — every autonomous call)

- **Obvious-winner call — started a throwaway Postgres container.** The spawn said the owner's
  Postgres 16 container on 5433 was running; it was not (`docker ps` empty, port closed). The daemon
  was up and `postgres:16-alpine` was already pulled, so I started `gc-0012-it-pg` (the exact fixture
  the plan describes) instead of listing the whole integration/live path as NOT RUN. Qualifies: local
  test infrastructure only, reversible (`docker rm -f`), no product/source impact, inside the plan's
  verification intent; the alternative (skip) strictly loses evidence. Discrepancy flagged in the
  return envelope.
- **Mechanical, in-plan — `prettier --write` on 7 new/changed files** (repo style via lint-staged);
  suites + eslint re-run green afterwards.
- **Mechanical, in-plan — added `tests/profile-server/InboxRepository.test.ts`** (DB-free mapping /
  SQL-choice unit test) on top of the plan's test list; pure additive coverage.
- **Fixes applied without asking (review rounds): none** — no review round processed this session.
- Not a deviation, recorded for clarity: the seams keep the plan's exact fire-and-forget shape
  (`void …sendTemplate().catch(log)`); the integration tests therefore poll (bounded, throwing on
  timeout) for the post-commit row instead of the hook being awaited.

## 2026-08-26 — Stateful review round 1 processed (fkit-process-stateful-review; Process-review worker spawned by `fkit-sprint-ship-loop`)

Ledger: `review.md` — 6 findings (R1–R4 low defects, R5/R6 nits), both reviewers ran, nothing
re-litigated. Owner rulings relayed by the lead (2026-08-26): R1–R4 FIX, in-plan; R5/R6 coder's call.
Each finding verified against the code before acting (all six CORRECT as described; severities
re-derived from blast radius — all low / test-only / cosmetic).

### Fixes applied (standing approval — ADR-019 discipline; per-fix qualification record, ADR-032 A4)

| Finding | What changed | Why it qualified |
|---|---|---|
| R1 stale-overwrite race | `src/client/Inbox.ts`: `generation` counter (bumped on successful mark-read); `markInboxRead` awaits an in-flight refresh first; `refreshInbox` merges via `keepLocalReadState` when a mark-read landed during its GET (read state monotonic). 3 new tests in `tests/client/Inbox.test.ts`. | Owner-ruled FIX; localized to one module; behaviour change is exactly the ruled one (no rollback of read state). Verified CORRECT by code read (`Inbox.ts:97-104`, `:184-225` pre-fix). |
| R2 XOR content model | `InboxContract.ts` refine → XOR (template ⇒ no title/body; literal ⇒ both + no `templateParams`); `migrations/003_player_messages.sql` CHECK → XOR **edited in place** (owner-ruled; only throwaway DBs had it). `gc_it` + `gc_local` dropped/recreated; `npm run migrate` re-applied 001→003 cold; `psql` confirms the new CHECK. Tests: contract XOR cases, route 400, it-test 23514 on template+literal. | Owner-ruled FIX incl. the in-place migration edit; mechanical mirror of the documented contract. |
| R3 lenient template key | Wire `templateKey: z.string().min(1).max(64).nullable()`; `isKnownInboxTemplateKey` guard; client filters unknown-key messages at load (that message only); `renderInboxMessage` literal fallback; repo cast widened. Tests: contract lenient case, client skip case. | Owner-ruled FIX (skip per message, list survives); no wire change for known keys. |
| R4 required params | `INBOX_TEMPLATE_REQUIRED_PARAMS` map + `missingInboxTemplateParams()` in `InboxContract.ts`; second refine ⇒ clean 400. Client defaults missing required params to `""` on render (belt-and-braces so ICU can never throw). Tests: contract required-params + every-key-has-entry, route 400, render default. | Owner-ruled FIX (per-key map in `src/core`, 400 on the internal endpoint); the client default is a 4-line localized guard within the same intent. |
| R6 dead CSS | Removed the overridden `width: 100%` in `.news-tabs` (`NewsModal.ts`). | Mechanical one-liner, verified dead (`width: calc(100% - 2rem)` follows). |

- **Obvious-winner calls this round:** none beyond the client-side R4 default noted above.
- **R5 → accepted residual** (no code change; recorded in `review.md` with What / Why / Re-raise): a
  negative on a fire-and-forget send has no settle signal; the deterministic not-invoked proof is
  `InboxHooks.test.ts`.
- **Test-harness fixes of my own new tests (not findings):** the two R1 race tests initially counted
  `fetch` calls synchronously (the refresh GET fires after three awaited lookups) — a `flush()` was
  added before the counts. No product change.

### Re-verification (all four, after the fixes)

| # | Command | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | exit 0 |
| 2 | `npm run lint` | exit 0 |
| 3 | `npm test` | **96 suites / 823 tests PASS** (+11 vs. the build run) |
| 4 | `RUN_DB_TESTS=1 TEST_DATABASE_URL=…/gc_it npx jest --runInBand` (cold DB after drop/recreate) | **4 suites / 37 tests PASS** |

Ledger state: `review.md` Status still `in-review` (reviewer's call to close after re-verifying;
this worker never edits the reviewer's section or the header status). No commit made.
