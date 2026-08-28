# Plan — Task 0067: Name Change (Citizens Only)

## Approval record

**Approved by the owner on 2026-08-28**, via `AskUserQuestion` in the fkit-lead session, driven by
`/fkit-sprint-ship-loop`. The plan below is the text returned by the planning `fkit-coder` worker,
reproduced verbatim, **followed by four owner amendments recorded in the "Owner amendments" section at
the end of this file.** Where an amendment and the plan body disagree, **the amendment wins** — read
that section before implementing.

⚠️ **Honesty note on this gate (ADR-031 / ADR-032 D7).** On the orchestrated sprint-ship-loop path,
"no source before the owner approves the plan" is enforced by a **prompt instruction to the spawned
worker, not by plan mode's structural write-wall** — that wall cannot run in a spawned worker, which has
no owner channel (ADR-021). The owner was told this plainly. Do not later rewrite this into a claim of a
structural guarantee.

---

## Summary

- **Hazard 1 answered — tables exist, but are NOT sufficient.** `player_profiles.display_name` + the
  case-insensitive unique index and `player_name_history` are all really in
  `migrations/001_player_profiles.sql`. **But a `004` migration is still required**: there is no
  rejection-reason column, no decided-at column, and no "one pending per player" constraint. Also a live
  trap — `moderation_status` **defaults to `'approved'`**, so a request insert must set `'pending'`
  explicitly or it silently ships as approved.
- **Hazard 2 answered — branch A, wire it for real.** 0012's send mechanism is committed and in the tree
  (commit `dc90719`); the task folder is merely still in `backlog/`. The endpoint is
  `POST /internal/v1/messages/send` (renamed from the brief's `/admin/player-message` by owner ruling
  D2). The `name_change_approved` / `name_change_rejected` template keys, their required params, and
  their **en + ru strings already exist**. No no-op seams needed.
- **Biggest surprise, and it costs real work:** the owner-ruled "reuse the existing validator" and
  "reuse the existing Telegram pipeline" are **both un-importable from the profile server as they
  stand**. Each needs a small pure-module extraction first. Details below — this is the bulk of the risk
  in this task.
- Client work needs **no new custom element** — so no `index.html` / `yandex-games_iframe.html` changes
  and no `LangSelector` edit.

---

## Hazard 1 — the data layer, with evidence

`migrations/001_player_profiles.sql`, verbatim:

```sql
display_name             text,                              -- line 28

create unique index if not exists player_profiles_display_name_uq
  on player_profiles (lower(display_name))
  where display_name is not null;                           -- lines 45-47

create table if not exists player_name_history (            -- lines 60-68
  id                bigserial primary key,
  yandex_player_id  text not null references player_profiles(yandex_player_id) on delete cascade,
  old_display_name  text,
  new_display_name  text not null,
  changed_at        timestamptz not null default now(),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected'))
);
```

Present as the brief promised. Three gaps against what this task needs:

| Need (from brief) | Present? |
|---|---|
| `moderation_status in (pending/approved/rejected)` | Yes |
| Case-insensitive display-name uniqueness | Yes, on `player_profiles` |
| Reject **with a reason** (verification step 4) | **No column** |
| "One pending request per player" (step 6) | **No constraint** |
| Decision timestamp | **No column** |

**`moderation_status` defaults to `'approved'`.** Any insert that omits it creates an already-approved
row. This is the single most likely silent bug in the task; the insert must pass `'pending'` explicitly
and a test must assert it.

## Hazard 2 — the 0012 seam, with evidence

Branch taken: **0012 has shipped its send mechanism → wire approve/reject as one call each.**

- `src/profile-server/InboxRepository.ts` and `migrations/003_player_messages.sql` exist in a clean
  tree; `git log` shows them committed in `dc90719`.
- `src/profile-server/Routes.ts:568-612` registers `POST /internal/v1/messages/send`, and its own
  comment names this task: *"the citizenship seams send DIRECTLY through InboxRepository, not over HTTP;
  the name-change task will call this endpoint or the repo."*
- `src/core/profile/InboxContract.ts:25-30` already lists `name_change_approved` /
  `name_change_rejected`; `:55-56` fixes their required params (`["name"]` and `["name","reason"]`).
- `resources/lang/en.json` **and** `ru.json` already carry both template bodies.
- 0012's brief `:108-110` explicitly defers "triggers 3–4" to this task.

Consequence: the moderation path calls `InboxRepository.sendTemplate(...)` **directly in-process** (the
profile server owns both), not over HTTP. Mirrors `PlayerProfileRepository.afterCitizenshipEarned`.

Note `missingInboxTemplateParams` treats an **empty string as missing**, so a rejection reason must be
non-empty or the send is rejected at the boundary. The admin schema must enforce `.min(1)`.

---

## The two "reuse the existing thing" rulings — both need an extraction first

### Validation (ruling c)

`src/core/validations/username.ts` holds the real rules — `MIN=3`, `MAX=27`,
`validPattern = /^[\p{L}\p{N}_[\]\s]+$/u`. **It cannot be imported by the profile server**: it imports
`translateText` from `src/client/Utils` (which transitively evaluates Lit `@customElement` definitions
and dies under plain Node with `customElements is not defined`) and `simpleHash` from `src/core/Util`
(which drags in the whole game-state graph). `tests/Censor.test.ts` already has to
`jest.mock("../src/client/Utils")` just to import it — proof this is real, not theoretical. Today
`src/profile-server/*` imports only `src/core/profile/*`.

Fix: extract the pure rules into a new dependency-free `src/core/validations/usernameRules.ts` returning
**message keys**, and have `username.ts` keep `validateUsername` as a thin translating wrapper so client
behavior and every existing key/param stays byte-identical.

Also note: **`validateUsername` does not run the profanity check** — `isProfaneUsername` /
`fixProfaneUsername` are separate and shadow-rename rather than reject. Mirroring the validator exactly
therefore means **no profanity auto-reject**, which is correct here: the human moderation gate is
precisely what catches that, and ruling (c) says no new bespoke rules.

### Telegram (ruling a)

There is **no reusable function**. The send is inline and duplicated twice inside `src/server/Master.ts`
(`:290-325` feedback, `:353-384` subscribe), on the **game server**, using `undici`'s `fetch` with a
`ProxyAgent` — and `TELEGRAM_PROXY_URL` is load-bearing because `api.telegram.org` is blocked from
Russian IPs. The profile server is a separate image on a separate VPS; `FEEDBACK_TELEGRAM_TOKEN` /
`FEEDBACK_TELEGRAM_CHAT_ID` / `TELEGRAM_PROXY_URL` are absent from its env chain
(`setup-profile.sh:379-388` writes only `POSTGRES_*`, `DATABASE_URL`, `PROFILE_INTERNAL_TOKEN`,
`PROFILE_PORT`, `YANDEX_PAYMENTS_SECRET`). Importing `Master.ts` is a trap — it constructs the express
app and `WorkerSupervisor` at module load.

Fix, honoring "do not build a new one" (same bot, same chat, same proxy, same env var names): extract a
shared `sendTelegramMessage()` helper and call it from the profile server.

**Deliberate scope boundary, flagged:** do **not** refactor `Master.ts`'s two existing call sites onto
the new helper. Those routes have **zero test coverage**, feedback delivery is already failing in prod
(open task `0061`), and task `0033` explicitly owns that consolidation. Migrating them inside a
citizenship task is an untested change to a live game-server route for no benefit here.
**→ Owner-confirmed 2026-08-28; see amendment 3.**

**Deferred, cannot be verified locally:** whether the profile VPS can actually reach the proxy is
unverified — `0033`'s brief flags exactly this. That is a live-tail concern, consistent with the brief's
local-first framing.

---

## Change surface

### New files

| File | Contents |
|---|---|
| `migrations/004_name_change.sql` | `alter table player_name_history add column if not exists rejection_reason text, add column if not exists decided_at timestamptz;` + partial unique index `on player_name_history (yandex_player_id) where moderation_status = 'pending'`. Comment documents that `changed_at` is the request time and that the `'approved'` default must be overridden. Picked up automatically — `migrate.ts` globs `migrations/*.sql` in lexical order. |
| `src/core/validations/usernameRules.ts` | Pure, zero-import: `MIN_USERNAME_LENGTH`, `MAX_USERNAME_LENGTH`, `validPattern`, `checkUsernameRules(name): "not_string"\|"too_short"\|"too_long"\|"invalid_chars" \| null`. |
| `src/core/profile/NameChangeContract.ts` | Zod wire contracts: `NameChangeRequestSchema` (`{yandexPlayerId, requestedName}`), `NameChangeDecisionRequestSchema` (`{yandexPlayerId, decision: "approve"\|"reject", reason?}` with a refine making reason required + non-empty on reject), `NameChangeStateSchema`. |
| `src/core/notifications/TelegramNotifier.ts` | `sendTelegramMessage({token, chatId, proxyUrl, text})` using `undici` fetch + `ProxyAgent`, with an `AbortController` timeout (the existing inline copies have none) and never-throwing semantics. Token stays out of all log lines — it is embedded in the URL. |
| `src/profile-server/NameChangeRepository.ts` | Data layer, mirroring `InboxRepository`'s shape. |
| `src/client/NameChangeRequest.ts` | Client orchestration module, following the `CitizenshipPurchase.ts` precedent (keeps the card testable). |

### Modified files

| File | Change |
|---|---|
| `src/core/validations/username.ts` | `validateUsername` becomes a thin wrapper mapping keys → `translateText`. Same keys, same `{min}`/`{max}` params, same behavior. `sanitizeUsername`/profanity untouched. |
| `src/core/profile/PlayerProfile.ts` | `PublicPlayerProfileSchema` gains `name_change` as **`.optional()`** — mandatory, per InboxContract's review-R3 lesson that server and client bundles deploy separately. `PlayerProfileSchema` (the DB/localStorage contract) is **not** touched. |
| `src/profile-server/Routes.ts` | Add `POST /v1/profile/name-change-request` (player-facing, CORS+preflight mirroring `inboxCors`, own stricter limiter, `resolvePlayerId` reuse) and `POST /internal/v1/name-change/decide` (`internalAuth`, no CORS). Extend `toPublicProfile` to merge name-change state. New optional `NameChangeRepo` structural interface + `createApp` param, failing closed with 503 when unwired (the `inboxEnabled` pattern). |
| `src/profile-server/Server.ts` | Construct `NameChangeRepository(pool, inbox, telegramConfig)` and pass to `createApp`. Read + warn-if-unset the three Telegram env vars, mirroring the `YANDEX_PAYMENTS_SECRET` precedent. |
| `src/client/CitizenshipCard.ts` | Render the entry point when `isCitizen && profile.isAuthoritative` — the exact inverse of the existing buy-CTA gate at `:318-324`. Idle / editing / pending / rejected states, following `renderBuyCta` + `EmailSubscribeModal`'s form logic in Tailwind. Refresh via the card's existing `refreshProfile()` — **not** a second `loadPlayerProfileView()` caller, which would double-fire the `Citizenship:Earned:XP` transition (the documented reason `Inbox.ts` avoids it). |
| `resources/lang/en.json` + `ru.json` | New top-level `citizenship_name_change` section after `citizenship_paid` (the precedent `citizenship_paid` set). Both files, in step. |
| `example.env.profile`, `setup-profile.sh` | Document + write the three Telegram vars into the 0600 `profile.env`. No values anywhere. |

**No HTML changes.** Keeping the UI inside `citizenship-card` means no new tag in either template and no
`LangSelector.ts:245` entry. If review later prefers a separate element, all three obligations return.

### Key repository semantics

- **Citizen gate in SQL on every call**, never client state — copy `InboxRepository.isCitizen`.
- `requestNameChange` → `not_citizen` | `invalid` | `name_taken` | `pending_exists` | `ok`. Insert sets
  `'pending'` explicitly; a `23505` on the partial index maps to `pending_exists`.
- `decideNameChange` runs one transaction: `SELECT … FOR UPDATE` the pending row → on approve, set
  `player_profiles.display_name`, capture the previous value into `old_display_name`, mark `approved` +
  `decided_at`; on reject, mark `rejected` + `rejection_reason` + `decided_at`.
- **The approve-time uniqueness race is real and must be handled**: the request-time "is this name taken"
  check is advisory only. Two players can hold pending requests for the same name; the second approve
  hits `23505` on `player_profiles_display_name_uq`. Map it to a `name_taken` outcome → HTTP 409, leave
  the row `pending` so the operator can retry or reject. Silently 500-ing here is the failure mode to
  avoid.
- Inbox sends fire **after commit**, fire-and-forget, contractually never throwing — exactly
  `afterCitizenshipEarned`. Telegram notification on a new pending request uses the same never-throw
  discipline.

### One design call worth stating

`GET /v1/profile` is **unauthenticated and enumerable by a non-secret player id**. So the public
`name_change` object carries `{status, requested_name, decided_at}` and **deliberately omits the
rejection reason** — operator-authored reason text reaches the player through the citizen-gated inbox
message, which already has a `{reason}` param for exactly this. Brief step 4 requires the card to show a
rejected *state* and allow a retry; it does not require showing the reason there. This costs nothing and
closes a leak.

---

## Sequencing

1. Migration `004` + extend the two integration suites' `beforeAll` migration lists (they enumerate
   files explicitly; `player_name_history` is already in the `TRUNCATE` list).
2. `usernameRules.ts` extraction + `username.ts` wrapper. **Run `npm test` here before going further** —
   this is the one change that can break existing game tests.
3. `NameChangeContract.ts` + the `PublicPlayerProfileSchema` optional field.
4. `NameChangeRepository.ts` + unit tests.
5. `TelegramNotifier.ts` + unit tests (mock `undici` module-level, the established convention from
   `tests/server/Master.test.ts`).
6. Routes + route tests over a mocked repo.
7. `Server.ts` wiring, env docs, `setup-profile.sh`.
8. Client module + card UI + lang keys (en **and** ru together).
9. Full verification pass.

---

## Test plan — mapped to the brief's 8 verification steps

| Brief step | Where it is proved |
|---|---|
| 1 — non-citizen/guest hidden; direct POST rejected | `tests/profile-server/NameChangeRoutes.test.ts` (403 `not_citizen`) + `tests/client/CitizenshipCard.test.ts` (entry point absent for guest, non-citizen, and `isAuthoritative:false`) |
| 2 — valid submit → `pending` row, `display_name` unchanged, UI pending | `tests/integration/NameChange.it.test.ts` — asserts `moderation_status = 'pending'` **explicitly** (the default-`'approved'` trap) + card test |
| 3 — approve atomic; `GET /v1/profile` returns new name; inbox message sent | Integration test over `createApp` via supertest, reusing `Routes.it.test.ts`'s bounded `waitForMessages` poller for the post-commit send |
| 4 — reject with reason; name unchanged; UI allows a new request | Integration + repository tests; asserts a new request succeeds after a rejection |
| 5 — case-insensitive duplicate → rejected, **no** pending row | Repository + integration (`"Ivan"` vs an existing `"ivan"`) |
| 6 — second request while pending → rejected | Integration, asserting the partial unique index fires |
| 7 — operator Telegram notification on a new pending request | Unit test with `jest.mock("undici")`, asserting one call, correct chat id, and that a Telegram failure never fails the request |
| 8 — local stack green; en/ru keys in both files | `RUN_DB_TESTS=1 npx jest --runInBand` + a lang-parity assertion |

Plus, beyond the brief: an approve-time `23505` race test (409 `name_taken`, row stays pending), and a
regression test that `validateUsername` still returns identical translated messages after the
extraction.

Commands: `npx tsc --noEmit`, `npm run lint`, `npm test`, then
`RUN_DB_TESTS=1 TEST_DATABASE_URL=… npx jest --runInBand` (serialized — suites race migrations on a cold
DB, per the 0017 worklog).

**Two verification caveats that cannot be removed:**
- The local Postgres is a manually-run container (`gc-0017-it-pg`, port 5433); per project memory
  **Docker Desktop cannot be started headlessly**, so the owner must have it up. Ask rather than poll.
- `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is currently **`false`**, so the card is
  hard-gated off. The UI is provable by unit tests; seeing it in a browser needs the flag flipped
  locally. Report which of the two was actually done.

---

## Risks / tradeoffs

1. **`username.ts` is shared game code.** The extraction is mechanical but touches a file used by
   `GameRunner` and `PlayerImpl`. Mitigation: keep `validateUsername`'s signature and messages
   identical; gate step 2 on a green `npm test`. Per CLAUDE.md, `src/core/` changes must be tested.
2. **First time `src/profile-server/` imports outside `src/core/profile/`.** Both new imports are
   deliberately dependency-free so the profile image stays clean; a stray transitive import would crash
   the container at startup, not at build. Worth a reviewer's eye.
3. **Telegram from the profile VPS is unverified** (proxy reachability). Local-verifiable only by mock.
   Genuine deferred live-tail item.
4. **`Master.ts` keeps its duplicated Telegram code** — a deliberate, stated boundary, leaving `0033`'s
   consolidation intact. **Owner-confirmed; amendment 3.**
5. **Approve-time uniqueness race** — handled explicitly rather than left to a 500.
6. **Analytics are not in scope** — the brief's 8 steps do not ask for events, so none are added.
   **Owner-confirmed; amendment 4.**

---

# Owner amendments — 2026-08-28

These four answers were given by the owner via `AskUserQuestion` at the plan gate. **They are part of
the approved plan.** Where they touch the body above, they win.

## Amendment 1 — the plan is APPROVED

The owner approved the plan as written, including the two extractions
(`usernameRules.ts`, `TelegramNotifier.ts`), migration `004`, the two profile-server endpoints, and the
citizenship-card UI. Verification is **local-stack only** — no deploy is involved in this task.

## Amendment 2 — trust posture: ADR-103 **plus a self-service cancel** (this ADDS to the change surface)

The planning worker raised a `NEEDS-DECISION`: a name-change request is an identity **mutation**
triggered by a **client-asserted, unverified** `yandexPlayerId`. ADR-103 accepted client-asserted ids,
but `Routes.ts` scopes that acceptance explicitly to **reads** (*"a forged id only ever reaches a
citizen's low-sensitivity system notices"*). Two vectors go past that rationale:

1. a griefer knowing a citizen's non-secret id can submit an offensive name **in that citizen's name**,
   which a busy operator might approve; and
2. because only **one** pending request is allowed per player, a griefer can **permanently block** a
   citizen from ever requesting a name change — and the victim has no way to clear it themselves.

**Owner ruling: option B.** Ship on the existing ADR-103 posture **and add a "cancel my pending request"
affordance** — one endpoint plus one button. This neutralizes vector 2 entirely (the one that is both
cheap to exploit and impossible for the victim to clear) and is independently useful to legitimate
players who mistype.

**Implementation obligations this creates, beyond the plan body:**
- a player-facing cancel endpoint on the profile server, citizen-gated in SQL like every other route,
  which clears the caller's own `pending` row (and only a `pending` row);
- a cancel control in the pending state of the citizenship-card UI, strings via `translateText` in
  **both** `en.json` and `ru.json`;
- tests covering it, including that cancelling frees the partial unique index so a **new** request then
  succeeds.

**Accepted residual, to be recorded in the review ledger:** vector 1 (a forged id submitting an
offensive name) **remains open**, mitigated only by the human moderation gate — the operator sees the
name before it can apply. This residual **closes when signed-payload player verification lands**, which
is blocked on the Yandex IAP secret key (`0014`). Do not describe this as solved.

## Amendment 3 — leave `Master.ts` alone (confirms the plan's stated boundary)

The owner confirmed the planning worker's judgement: extract the shared `sendTelegramMessage()` helper,
but **do not migrate `Master.ts`'s two existing inline call sites onto it.** Reasons on the record:
those routes have zero test coverage, feedback delivery is already broken in prod (`0061`), and `0033`
owns that consolidation. The cost — three copies of the send logic co-existing until `0033` lands — is
accepted knowingly.

## Amendment 4 — no analytics events in this task

Sibling citizenship features emit analytics events; the brief's 8 verification steps do not ask for any.
**Owner ruling: add none**, keeping the task in scope. Adding them later is a small separate change
(which would also require updating `flashistConstants.analyticEvents` and
`ai-agents/knowledge-base/analytics-event-reference.md`, per the project rules).
