# Plan — 0012 Personal Inbox (local-first scope)

**Approval record.** Plan produced by a spawned `fkit-coder` (plan-only) on 2026-08-26 and
**approved by the owner via `AskUserQuestion` in the `fkit lead` session the same day**, driver
`fkit-sprint-ship-loop`. The text from "## 0. Facts the plan rests on" onward is the coder's return,
copied verbatim by the driver at approval. Owner rulings on the six plan-time decisions, folded in at
approval:

- **D1 — auth model: (C)** client-asserted `yandexPlayerId` through one `resolvePlayerId` funnel, citizen
  gate in SQL, shared rate limit (same trust as ADR-103 / `/v1/profile`) **plus a recorded re-raise tied
  to ADR-103's exit** in the worklog.
- **D2 — endpoint paths: (B)** `GET /v1/messages`, `PATCH /v1/messages/read`,
  `POST /internal/v1/messages/send`.
- **D3 — content model: (B)** `template_key` + `template_params` **and** literal `title`/`body`
  columns (CHECK: one or the other); system sends use templates; the internal send endpoint accepts either.
- **D4 — hook execution: (A)** post-commit, hook contractually never-throws, call sites also
  try/catch-wrapped; best-effort.
- **D5 — launch-flag gating: (A)** inbox fetch + Personal tab gated behind
  `flashistConstants.features.CITIZENSHIP_CARD_ENABLED`; local verification sets the flag on locally.
- **D6 — name-change templates: (A)** register `name_change_approved` / `name_change_rejected` keys +
  en/ru text with `{name}` / `{reason}` params now; no trigger wiring.
- **Local DB:** the owner will have the Postgres 16 container running (`TEST_DATABASE_URL`, port 5433)
  during the build — run the integration path (`RUN_DB_TESTS=1 npx jest --runInBand`) and the live local
  loop, and report actual results. If the container turns out not to be reachable, do not wait: ship with
  unit suites green and list every integration/live check as NOT RUN.

---

## 0. Facts the plan rests on (verified this session)

- Both no-op seams exist exactly as the brief says: `PlayerProfileRepository.afterCitizenshipEarned` (`src/profile-server/PlayerProfileRepository.ts:271-289`) and `PaymentsRepository.afterPaidPurchaseGranted` (`src/profile-server/PaymentsRepository.ts:166-183`). Both are sync `void`, called after `COMMIT`, unguarded (0017 review residual R1 → harden both together).
- Seam TODOs already point at localisation keys `citizenship_earned.inbox_title/body` and `citizenship_paid.inbox_title/body`, present in `resources/lang/en.json` + `ru.json`. That implies key-based rendering on the client (server does not know the player's language) — see Decision 3.
- Profile server: Express `createApp(repo, payments?)` factory (`Routes.ts`), `internalAuth` bearer token (`InternalAuth.ts`), nginx `/internal/` IP allowlist already laid down (`setup-profile.sh:707-711`), hand-rolled migration runner applying `migrations/*.sql` lexically (`migrate.ts`), migrations shipped in the image (`Dockerfile.profile`).
- Client identity: `FlashistFacade.getYandexUniqueId()` — client-asserted, accepted under ADR-103 for earned XP; `GET /v1/profile?yandexPlayerId=` is unauthenticated + rate-limited + CORS `*`. No signed-player verification exists (needs the Yandex secret, blocked on 0014).
- Announcements popup: `src/client/NewsModal.ts` (single list, no tabs), bell `src/client/components/NewsButton.ts` (localStorage unread dot, listens to `announcements-state-changed`). Tab styling pattern exists in `src/client/StartScreenTabs.ts`.
- Citizenship card is gated by `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` (default `false`, task 0054) — when off, no profile fetch happens on the start screen.
- `loadPlayerProfileView()` has a side effect (fires `Citizenship:Earned:XP` via localStorage transition). A second concurrent caller could double-fire → the inbox must not call it (see step 4).
- Tests: `jest.config.ts` two modes; `RUN_DB_TESTS=1` runs only `tests/integration/**/*.it.test.ts` against `TEST_DATABASE_URL`; suites apply migrations themselves in `beforeAll` (001 only in two suites; payments suite applies 001+002). 0017 worklog notes parallel suites race migrations on a cold DB → use `--runInBand`.
- `translateText(key, params)` supports `{param}` substitution (`src/client/Utils.ts:103`).

## 1. Schema — `migrations/003_player_messages.sql`

```sql
create table if not exists player_messages (
  id               bigserial primary key,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  template_key     text,                         -- system sends: 'citizenship_earned' | 'citizenship_paid' | 'name_change_approved' | 'name_change_rejected'
  template_params  jsonb not null default '{}'::jsonb,
  title            text,                         -- literal (admin/manual sends)
  body             text,
  sent_at          timestamptz not null default now(),
  read_at          timestamptz,
  constraint chk_message_content
    check ((template_key is not null) or (title is not null and body is not null)),
  constraint chk_read_after_sent
    check (read_at is null or read_at >= sent_at)
);
create index if not exists player_messages_player_sent_idx
  on player_messages (yandex_player_id, sent_at desc, id desc);
create index if not exists player_messages_unread_idx
  on player_messages (yandex_player_id) where read_at is null;
```
Same style as 001/002: idempotent, no BEGIN/COMMIT (runner wraps it). Brief's minimum columns are all present; `template_key/params` is the addition Decision 3 asks about.

## 2. Shared contract — `src/core/profile/InboxContract.ts` (new; `src/core` ⇒ tested)

- `INBOX_TEMPLATE_KEYS = ["citizenship_earned","citizenship_paid","name_change_approved","name_change_rejected"] as const` + `InboxTemplateKeySchema`.
- `InboxMessageSchema` (wire shape): `{ id: number, templateKey: key|null, templateParams: Record<string,string>, title: string|null, body: string|null, sentAt: iso, readAt: iso|null }`; `InboxListResponseSchema = { messages: InboxMessage[] }`.
- `MarkReadRequestSchema`: `{ yandexPlayerId: string(1..128), ids?: number[] (int > 0, max 500) }` — absent `ids` = mark all.
- `SendMessageRequestSchema` (internal): `{ yandexPlayerId, templateKey?, templateParams?, title? (≤200), body? (≤4000) }` with a refine mirroring `chk_message_content`.
- Mirrors `CreditContract.ts`/`PaymentsContract.ts` style so client and server validate the same shapes.

## 3. Profile server

**3a. `src/profile-server/InboxRepository.ts` (new)** — only component touching `player_messages`.
- `sendMessage(input): Promise<{ status: "sent", id } | { status: "no_profile" }>` — FK violation `23503` → `no_profile` (same pattern as `creditMatchXp`).
- `listMessages(yandexPlayerId): Promise<{ status: "not_citizen" } | { status: "ok", messages }>` — first `SELECT is_citizen FROM player_profiles WHERE …`; missing row or `is_citizen=false` ⇒ `not_citizen` (server-side gate per brief note). Order `sent_at DESC, id DESC`, defensive `LIMIT 500` (brief: no pagination; the limit only guards a runaway).
- `markRead(yandexPlayerId, ids?: number[]): Promise<{ status: "not_citizen" } | { status: "ok", updated: number }>` — same gate; `UPDATE … SET read_at = now() WHERE yandex_player_id = $1 AND read_at IS NULL [AND id = ANY($2)]` — scoped to the caller's own id so one player can never mark another's messages; idempotent.
- Exposes `InboxSender` interface `{ sendTemplate(yandexPlayerId, templateKey, params?): Promise<void> }` for the seams.

**3b. Fill + harden both seams (retires 0017/0018/0019 no-ops; discharges R1).**
- `PlayerProfileRepository` constructor gains `inbox?: InboxSender`. `afterCitizenshipEarned` becomes a contractually never-throw method: `void this.inbox?.sendTemplate(id, "citizenship_earned").catch(log.warn)`; the call site at `:271-274` additionally wrapped in `try/catch` (belt + suspenders, as the R1 ruling allows either — I do both so a sync throw and an async rejection are both contained). Outcome `credited` is returned unchanged whatever the hook does.
- `PaymentsRepository` identical treatment for `afterPaidPurchaseGranted` → template `citizenship_paid`. Fires only on `"granted"` (not `already_processed`), so `/reconcile` re-grants never duplicate the welcome message.
- Earned message fires only when `citizenshipNewlyGranted` — a paid citizen crossing 1,000 XP gets no second message (matches 0017 accepted residual "stamp-on-crossing").
- Update both TODO comments to describe the live behaviour; remove "no-op" wording.
- `Server.ts`: `const inbox = new InboxRepository(pool)`; pass to both repos and to `createApp`.

**3c. Routes (`Routes.ts`)** — `createApp(repo, payments?, inbox?)`; inbox routes registered only when an inbox repo is provided (mirrors payments), otherwise 503 `inbox_unavailable` (keeps existing `createApp(mockRepo())` tests valid). Paths per Decision 2 (recommended names shown):

| Method | Path | Auth | Behaviour |
|---|---|---|---|
| OPTIONS/GET | `/v1/messages?yandexPlayerId=` | client-asserted id (Decision 1) | `inboxCors` (`*`, methods `GET, PATCH`, header `Content-Type`, OPTIONS→204 before limiter), shared 60/min limiter; 400 bad query; **403 `not_citizen`** (also for missing profile); 200 `{ messages }` newest first |
| PATCH | `/v1/messages/read` | same | body `MarkReadRequestSchema`; 403 `not_citizen`; 200 `{ updated }` |
| POST | `/internal/v1/messages/send` | `internalAuth` + nginx `/internal/` allowlist | body `SendMessageRequestSchema`; 401 / 400 / **404 `no_profile`** / 200 `{ id }` / 500 |

- Trust funnel: one `resolvePlayerId(req)` helper used by both player routes — the single place a verified-signature check drops in later (ADR-103 shape, rule 1/2).
- Log lines follow existing style (`formatError`, never log message bodies).

## 4. Client

**4a. `src/client/Inbox.ts` (new)** — logic module, unit-testable:
- `loadInboxState(): Promise<InboxState>` where `InboxState = { available: boolean, messages: InboxMessage[], unreadCount: number, error: boolean }`. Steps: launch-flag gate (Decision 5) → `isYandexAuthorized()` → `getYandexUniqueId()` → `profileApiUrl()` (same degrade path as `PlayerProfileView`) → `GET /v1/messages` (5 s abort, Zod parse). 403 ⇒ `available:false` (tab absent). Network/5xx ⇒ `available:false, error:true` (tab absent, no partial state — see Risk 4).
- Uses the profile-API base + id only; **does not call `loadPlayerProfileView()`** (avoids the double-fire race on `Citizenship:Earned:XP`). The `/v1/messages` 403 *is* the citizen check, so no separate profile fetch is needed.
- `markInboxRead(ids?)` → PATCH; on success sets `readAt` locally, `unreadCount=0`, dispatches `inbox-state-changed`.
- `renderInboxMessage(m): { title, body }` — template ⇒ `translateText("inbox.templates.<key>.title", params)` (existing citizenship keys re-mapped there, see 4d), literal ⇒ as stored. Date via `toLocaleDateString` (current lang).
- Module-level cache + single-flight promise so bell and modal share one fetch; `refreshInbox()` re-fetches on bell open and on `PURCHASES_RECONCILED_EVENT` (so a purchase landing mid-session surfaces the welcome message).

**4b. `NewsModal.ts`** — tab bar (`role="tablist"`, styling lifted from `StartScreenTabs.ts`) rendered **only when `inbox.available`**; otherwise exactly today's single-list layout (non-citizens/guests: tab strip absent, not greyed). Global tab = existing behaviour untouched. Personal tab: list newest-first, unread rows visually marked, empty-state `inbox.empty`. Selecting Personal → `markInboxRead()` (brief: mark all on open) + `Inbox:Opened` analytics. Default tab Global.

**4c. `NewsButton.ts`** — `isActive = hasUnreadAnnouncements(...) || inboxUnread > 0`; kick `loadInboxState()` after `flashist_waitGameInitComplete()`; also listen to `inbox-state-changed`. Badge stays the existing dot (brief: count "if shown" — none is shown today; keeping the dot, no count).

**4d. Localisation (`en.json` + `ru.json`, both)** — `announcements.tab_global`, `announcements.tab_personal`, `inbox.empty`, `inbox.templates.citizenship_earned.{title,body}`, `inbox.templates.citizenship_paid.{title,body}`, and (Decision 6) `inbox.templates.name_change_approved.{title,body}` / `…rejected` with `{name}` / `{reason}` params using the brief's exact wording. Existing `citizenship_earned.inbox_*` / `citizenship_paid.inbox_*` keys: move under `inbox.templates.*` (only the two seam TODOs reference them, no code reads them today — verified by grep) so there is one template namespace.

**4e. Analytics** — enum: `INBOX_OPENED: "Inbox:Opened"`, `INBOX_LOAD_FAILED: "Inbox:LoadFailed"`; `uiElementIds.announcementsTabGlobal: "AnnouncementsTabGlobal"`, `announcementsTabPersonal: "AnnouncementsTabPersonal"`. Add rows to `ai-agents/knowledge-base/analytics-event-reference.md` (UI events + UI:Tap tables).

**4f. HTML templates** — no edit needed: both `index.html:231/336` and `yandex-games_iframe.html:351/467` already mount the bell and modal; tabs live inside `news-modal`. I will re-verify at build time and state it in the worklog.

## 5. Docs
- `ai-agents/knowledge-base/architecture.md` routes table (`:424-432`): three new rows + a line on `player_messages`. Header comment in `Routes.ts` for the internal send endpoint (request/response, auth, curl example) — that is the brief's "documented".
- Wiki untouched (fkit-wiki ingests after close).

## 6. Tests and verification

**Runs without Docker (unit, `npm test`):**
- `tests/core/profile/InboxContract.test.ts` — schema accept/reject, template-key enum, refine.
- `tests/profile-server/InboxRoutes.test.ts` (mock `InboxRepo`, supertest, like `Routes.test.ts`) — 400/403/200 list; PATCH all vs ids; OPTIONS preflight + CORS headers scoped to `/v1/messages` only (assert `/internal/*` carries none); internal send 401 without token, 404 `no_profile`, 200; 503 when no inbox repo.
- `tests/profile-server/InboxHooks.test.ts` — fake `Pool` (`connect()` → stub client) driving `creditMatchXp` to a fresh grant with an inbox whose `sendTemplate` (a) rejects, (b) throws synchronously ⇒ still resolves `credited` + `citizenshipNewlyGranted: true`; not invoked on `duplicate`; invoked with `citizenship_earned`. Same for `grantPaidPurchase` (`granted` vs `already_processed`, `citizenship_paid`).
- `tests/client/Inbox.test.ts` (jsdom, mocks as in `PlayerProfileView.test.ts`) — guest → unavailable; 403 → unavailable; 200 → messages/unread; 5xx/abort → error; mark-read updates state + event; template rendering with params.
- `npm run lint`, `tsc` via the existing build.

**Needs the local stack (owner must have running — Docker Desktop can't be started headlessly):**
- A Postgres 16 container (0017 used `gc-0017-it-pg`, port 5433, DBs `gc_it`/`gc_local`) and `TEST_DATABASE_URL` exported. Then `RUN_DB_TESTS=1 npx jest --runInBand`:
  - `tests/integration/InboxRepository.it.test.ts` — applies 001+002+003; send/list order/mark-read (all, subset, cross-player isolation)/citizen gate/`no_profile`/cascade on profile delete.
  - `tests/integration/Routes.it.test.ts` extension — credit to 1,000 XP over HTTP ⇒ one `citizenship_earned` row; second credit ⇒ still one; `grantPaidPurchase` ⇒ `citizenship_paid` row; GET → PATCH → GET from a "second device" (fresh request) shows `readAt` set (brief's cross-device done-criterion).
- Live local loop: `npm run migrate` + `npm run start:profile-server` (local `PROFILE_INTERNAL_TOKEN`, `DATABASE_URL`), game dev server with `PROFILE_API_URL` pointing at it, browser on `yandex-games_iframe.html`: citizen sees Personal tab + badge, non-citizen/guest sees none, open tab → badge clears → reload shows read state. curl the internal send endpoint.
- If Docker isn't up when I build: I ship with unit suites green and report the integration/live checks as **not run**, listing them explicitly — the task cannot be called verified until they pass.

**Deferred Live Tail** — unchanged, gated on 0062; not part of this build.

## 7. Sequencing
1. Migration + contract + `InboxRepository` (+ it-tests written alongside).
2. Seams filled/hardened + hook unit tests + `Server.ts` wiring.
3. Routes + route tests + docs.
4. Client module + tests; then modal/bell UI; localisation; analytics + reference doc.
5. Full `npm test`, lint; integration + live loop if the DB is up; worklog.

---

# Risks / edge cases

1. **Auth is client-asserted** (Decision 1). Anyone knowing a citizen's Yandex id can read their system messages and mark them read. Content is low-sensitivity (citizenship notices; later, name-change verdicts incl. a rejection reason). Contained to one helper so signature verification slots in when the secret exists. Re-raise trigger mirrors ADR-103.
2. **Post-commit send is best-effort.** A crash/DB blip between `COMMIT` and the message insert loses the message silently (logged only). Accepted with the seam shape the owner approved; alternative in Decision 4.
3. **Migration ordering on integration suites.** Existing suites apply 001 only; the new suites apply 001+002+003 — cold parallel runs race (known from 0017). `--runInBand` is the documented run mode; no shared change to old suites.
4. **Fail-soft UI vs the citizen gate.** On a transient fetch failure a citizen sees no Personal tab (indistinguishable from non-citizen) until the next bell open/reload. Deliberate: no partial/misleading tab. Logged as `Inbox:LoadFailed`.
5. **Launch-flag coupling** (Decision 5). Without gating, a local/dev citizen would see the Personal tab while the citizenship card is hidden — an inconsistent surface.
6. **Extra start-screen request.** One `GET /v1/messages` per page load for authorized players (bounded 5 s, shares the 60/min limiter with the profile read — the card's fetch + inbox fetch + bell-open refetches stay far under it).
7. **Localisation key move.** Moving `citizenship_earned.inbox_*`/`citizenship_paid.inbox_*` under `inbox.templates.*` changes keys that only comments reference today; both files updated together. If the owner prefers the keys stay put, the template map just points at the old keys — trivial either way.
8. **`extra`/erasure.** `ON DELETE CASCADE` means a 152-ФЗ erasure of a profile removes its messages — desired, noted for the compliance record.
9. **Name-change templates** ship text with `{name}`/`{reason}` params that no code fires until 0067; harmless but visible in en/ru.
10. **Double-fire guard** for `Citizenship:Earned:XP` relies on the inbox never calling `loadPlayerProfileView()` — I'll add a comment in `Inbox.ts` naming the reason so a later refactor doesn't reintroduce it.

---

# Decisions raised at plan time (all ruled at approval — see the approval record above)

**D1 — Player-endpoint auth model** → (C): (A) client-asserted `yandexPlayerId` query/body, one `resolvePlayerId` funnel, citizen gate in SQL, shared rate limit — same trust as ADR-103 / `/v1/profile` — plus a recorded re-raise tied to ADR-103's exit.
**D2 — Endpoint paths** → (B): `GET /v1/messages`, `PATCH /v1/messages/read`, `POST /internal/v1/messages/send`.
**D3 — Message content model** → (B): template columns + literal columns (CHECK: one or the other), system sends use templates, the internal send endpoint accepts either.
**D4 — Hook execution model (R1 hardening)** → (A): post-commit, hook contractually never-throws, call sites also try/catch-wrapped.
**D5 — Launch-flag gating** → (A): gate the inbox fetch + Personal tab behind `flashistConstants.features.CITIZENSHIP_CARD_ENABLED`; local verification sets the flag on locally.
**D6 — Name-change templates now?** → (A): keys + text with `{name}`/`{reason}` params now, no trigger wiring.
