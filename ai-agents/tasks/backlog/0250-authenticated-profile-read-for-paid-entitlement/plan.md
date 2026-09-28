# 0250 — Slice S1: the equalized projection (the MUST-FIX)

## 0. Scope
**Goal:** for every unverified caller (today, every caller), a paid citizen and an earned citizen look the same on every client-visible route. The citizen badge keeps working.

**In S1:**
- L1: `citizenship_earned_at` becomes null.
- L2: xp is clamped on the profile and login responses.
- L3: xp is clamped on the tenure-grant response.
- L4: both citizenship inbox keys become one neutral key.
- Fix the stale comment in `PlayerProfile.ts`.
- Update the analytics doc.
- Pending rulings Q1–Q3 below: `updated_at` hardening, inbox collapse, recording the exactly-100 residual.

**Not in S1:**
- verified sessions (`0325`);
- the raw paid facts (S3b);
- any `verified` field on `CallerResolution`;
- the inbox auth seam;
- `persistent_id`;
- L5, which is accepted by D4.

**How S3b branches later:** S1 keeps the name `toPublicProfile` for the unverified view. S3b adds owner-view siblings and a `caller.verified ? owner : public` branch at the same 4 call sites. S1 adds no plumbing for this.

## 1. Evidence: the current tree, including uncommitted work

**Routes that return profile data or xp to a client:**

| Route | Where | What it returns today |
|---|---|---|
| `GET /v1/profile` | `Routes.ts:640-662` | `toPublicProfile(profile, nameChange)` at `:656` |
| `POST /v1/login` | `Routes.ts:682-758` | `profile: toPublicProfile(...)` at `:735-740` |
| `POST /v1/profile/tenure-grant` | `Routes.ts:1477-1520` | `{status, xpAwarded, xp: outcome.xp}` at `:1508-1512`, the true xp. `duplicate` repeats it (`PlayerProfileRepository.ts:317-324`) |
| `GET /v1/messages` | `Routes.ts:1074-1090` | `inbox.listMessages()` rows, passed through with the stored `templateKey` |

- **`toPublicProfile`** (`Routes.ts:346-356`) strips only `is_paid_citizen` and `citizenship_purchased_at`. `xp`, `citizenship_earned_at` and `updated_at` pass through.
- **Checked and clean:**
  - `/internal/v1/players/resolve` returns only `{playerId, isCitizen}` (`:779-782`) and is internal.
  - `/internal/v1/credit` returns statuses only.
  - The name-change routes return `{status:"ok"}` or errors (`:1213-1250`). Their citizen gate treats paid and earned citizens the same.
  - `/v1/payments/yandex/intent` returns an `intentId`.
  - The `/v1/payments/yandex/{complete,reconcile}` answers depend only on the signed purchase payload, not on who the caller is.
  - `grantChecks.tenure` on login has no link to paid state.
- **Clamp math holds.** `GRANT_CITIZENSHIP_SQL` (`PlayerProfileRepository.ts:105-113`) stamps `earned_at` when a paid citizen crosses 100. Earned citizens always have xp ≥ 100, and xp never decreases. So `max(xp,100)` for citizens changes paid-not-earned citizens only.
- **Tenure needs `is_citizen`.** `LOCK_PLAYER_FOR_TENURE_SQL` already selects it (`:121-126`). `wasCitizen` is computed only in the `granted` branch (`:343`), and `TenureCheckOutcome` (`:46-51`) has no citizen field.
- **The clamped xp is visible on screen.** The card shows `profile.xp / 100` (`CitizenshipCard.ts:405-408`). Citizens already get a full bar (`:356-361`).

**The two citizenship inbox keys, every write and read:**
- **Written by:**
  - `PaymentsRepository.ts:203`: `citizenship_paid`, on every fresh `granted`, so one per purchase token;
  - `PlayerProfileRepository.ts:394`: `citizenship_earned`, only on a false→true flip. A paid citizen who crosses 100 gets **no** earned message (`:381-389`);
  - the operator route `/internal/v1/messages/send`, through `SendMessageRequestSchema` (`InboxContract.ts:151+`).
- **Defined at:** `InboxContract.ts:26-32,53-59`; `en.json:102-109`; `ru.json:106-113`; the comment in `migrations/003_player_messages.sql:19`.
- **Read by:** `GET /v1/messages`, which passes rows through. The client drops unknown keys (`Inbox.ts:191-198`).
- **Old stored rows:** real rows exist on the box, per the `0065` go-live evidence. They are **remapped at read time**, on the route, for every row, old and new. Stored rows are never rewritten, so S3b can return the original keys to verified callers.

**Analytics:** `PlayerProfileView.ts:46,94-97,127-146` keys `Citizenship:Earned:XP` on a `""` → date change in `localStorage`. Reference doc: `analytics-event-reference.md:313`.

**Nothing in `src/client` reads `updated_at`** (grep: 0 hits).

## 2. Changes, in order

### Step 1 — Core (`src/core/profile/`; tests are mandatory here)
- `InboxContract.ts`:
  - append `"citizenship_granted"` to `INBOX_TEMPLATE_KEYS`;
  - add `citizenship_granted: []` to `INBOX_TEMPLATE_REQUIRED_PARAMS`;
  - add a doc line saying it is the neutral key served to unverified callers in place of `citizenship_paid` and `citizenship_earned`, which stay in the list so a new client still reads an old server;
  - side effect: the operator send route now accepts it too, which is harmless.
- `PlayerProfile.ts:53-62`: rewrite the stale *"Sprint 4's read is unauthenticated"* comment. The new text says:
  - the read is behind a Bearer session (`resolveCaller`) that is `vfy:false`, so anyone who asserts an id gets one;
  - the paid fields are therefore omitted;
  - the server also equalizes `xp`, `citizenship_earned_at` (and `updated_at` if Q1 is yes) — same keys, same types, only the values change;
  - pointer to `PublicProjection.ts`.
  - Comment only. The schema does not change.

### Step 2 — Server: one projection module (new file `src/profile-server/PublicProjection.ts`)
- **Move `toPublicProfile` here from `Routes.ts:330-356`, keeping its doc comment and `TODO(payments)`.** It becomes the equalized projection:
  - `citizenship_earned_at: null`, always;
  - `xp: equalizedXp(profile.xp, profile.is_citizen)`;
  - `updated_at: profile.created_at` (only if Q1 is yes);
  - paid fields still omitted;
  - `name_change` merged in as today;
  - `is_citizen`, `display_name`, `created_at`, `schema_version` unchanged.
- **`equalizedXp(xp, isCitizen)`** = `isCitizen ? Math.max(xp, CITIZENSHIP_XP_THRESHOLD) : xp`. It imports the threshold from `core/profile/Citizenship.ts`. It stays server-only because no client needs it.
- **`toPublicInboxMessages(messages)`:**
  - maps `citizenship_paid` and `citizenship_earned` to `citizenship_granted`;
  - leaves every other key, literal messages (`templateKey: null`), ids, `readAt` and `sentAt` as they are;
  - if Q2 is yes: keeps only the **oldest** citizenship message (the list is newest first, so keep the last one) and drops the rest.
- Short module doc: *"UNVERIFIED view. S3b adds the owner view beside it and branches on `caller.verified`."*

### Step 3 — Server: wire the routes (`Routes.ts`)
- `GET /v1/profile` and login: import `toPublicProfile`. No call-site change.
- `GET /v1/messages`: `res.json({ messages: toPublicInboxMessages(outcome.messages) })`. Mapping at the route, not in `InboxRepository`, keeps the repository truthful for S3b.
- Tenure grant: `xp: equalizedXp(outcome.xp, outcome.isCitizen)`.
- Update the `CallerResolution` comment (`:291-293`) to say unverified callers get the equalized view.

### Step 4 — Server: tenure outcome (`PlayerProfileRepository.ts`)
- Add `isCitizen: boolean` to `TenureCheckOutcome`. It is the citizen state after the call.
- Read `wasCitizen` right after the lock, then set `isCitizen` per branch:
  - `duplicate` / `below_minimum`: `wasCitizen`;
  - `granted`: `wasCitizen || citizenshipNewlyGranted`;
  - `not_found`: false.
- The `TenureGrantRepo` interface (`Routes.ts:207-213`) picks it up through the type.

### Step 5 — Client
- `en.json` and `ru.json`, `inbox.templates.citizenship_granted.{title,body}`. Proposed text, owner can change it (Q4):
  - en: *"Welcome, Citizen!"* / *"You are now a Geoconflict citizen. You now have access to citizen benefits."*
  - ru: *"Добро пожаловать, Гражданин!"* / *"Теперь вы гражданин Geoconflict. Вам доступны привилегии граждан."*
  - No purchase wording and no "100 XP".
  - The old `citizenship_paid` and `citizenship_earned` text **stays**: it is needed by old servers and by S3b.
- `PlayerProfileView.ts`, following D4 exactly:
  - `loadPlayerProfileView` **stops calling** `reportEarnedCitizenshipTransition`, because no response can be verified before S3b;
  - the storage prefix moves to a fresh one (`geoconflict_citizenship_earned_at_v2:`);
  - the function stays, exported and documented as *"S3b calls this for verified reads only"*;
  - rewrite the doc comment; the old "paid citizen over-counts" residual no longer applies.
  - **Why a fresh prefix:** old clients are storing `""` against every S1-era response. Reusing the old prefix would make S3b's first true date fire a false "earned" event for every earned citizen.

### Step 6 — Docs
- `analytics-event-reference.md:313`, the `CITIZENSHIP_EARNED_XP` row:
  - dormant from the S1 **server** deploy until S3b, on old and new clients alike (owner ruling D4);
  - it will fire on verified reads only, under the fresh prefix;
  - the "over-counts a paid citizen" residual is gone;
  - also fix the stale "1,000-XP" to 100.
- No wiki writes. After close, `fkit-wiki` should ingest.
- `migrations/003` is **not** edited: never edit an applied migration.

## 3. Deploy order and compatibility (verification step 5)
- **Profile, login, tenure:** value-only changes, same keys and types. They parse in both directions: old client with new server, new client with old server.
- **Inbox:** `citizenship_granted` is new. An old client drops that one message (`Inbox.ts:191-198`) and the rest of the list survives. **So the client ships first** (game `build-deploy.sh`), **then the profile server** (`build-deploy-profile.sh`).
  - Tabs still open on an old bundle after the server deploy drop the neutral message until they reload. This is cosmetic.
- **Server rollback** is safe: it reopens the leak and loses nothing.
  - Caveat: old-bundle devices that stored `""` under the **old** prefix during S1 would fire a false Earned event after a server rollback. New clients are unaffected because of the new prefix.
- **Client rollback after the server is live:** citizens lose the citizenship message in the bell. Cosmetic.

## 4. Tests
**Unit, run with `npm test`:**
- **New `tests/profile-server/PublicProjection.test.ts`:**
  - `equalizedXp`: citizen at 0, 30, 99, 100, 1200; non-citizen at 0 and 99, which stay unchanged.
  - `toPublicProfile`: `earned_at` is always null; no paid keys; `name_change` passes through; `updated_at === created_at` (if Q1).
  - **Attempted leak (L1/L2):** for a fixture matrix — paid-not-earned at xp 0/30/99, paid-then-earned, earned at 100 — evaluate `is_citizen && earned_at === null` and `is_citizen && xp < 100`. Each must give the same answer for the paid and earned fixtures. Also assert the whole projection is deep-equal between a paid-not-earned citizen and an earned citizen at xp 100 with the same `created_at`.
  - Inbox mapper: paid → granted; earned → granted; name-change and literal messages untouched; order, ids and `readAt` kept; collapse keeps the oldest (if Q2).
- **Route tests, one attempted-leak test per channel. Each fires the leak predicate against the paid fixture and the earned fixture and asserts the bodies are identical:**
  - `Routes.test.ts`, GET /v1/profile, L1/L2. Also update the existing `:95-110` test, whose fixture now gets `earned_at` null.
  - `LoginRoutes.test.ts`, login `profile`, L1/L2.
  - `TenureGrantRoutes.test.ts`, L3: the `outcome()` helper gains `isCitizen`. A citizen at xp 30 shows 100 on `granted` and `duplicate`. A non-citizen keeps 20, 7 and 45. The newly-granted 110 is unchanged.
  - `InboxRoutes.test.ts`, L4: repo returns `citizenship_paid` → response is `citizenship_granted`. A paid list and an earned list give identical responses, ids and dates aside. The double-message list collapses (if Q2).
- **Core:** `InboxContract.test.ts` updates the key list and required params.
- **Client:**
  - `Inbox.test.ts`: `citizenship_granted` renders through its template.
  - A new or extended lang test: every `INBOX_TEMPLATE_KEYS` entry has a title and body in both `en.json` and `ru.json`, and the neutral body has no "100" and no purchase word.
  - `PlayerProfileView.test.ts`: a `""` → date sequence **never** fires Earned:XP through `loadPlayerProfileView`, and nothing is written under either prefix. Direct tests of the function now use the new prefix.
- **Existing tests that change with the rulings, not regressions:** `Routes.test.ts:103-105` (earned_at) and `Routes.it.test.ts:178-181` (HTTP `templateKey` is now `citizenship_granted`; the DB row is still `citizenship_earned`).

**Integration, `npm run test:integration`: a new `tests/integration/PaidStateEqualization.it.test.ts`.** It uses real repositories on Postgres with signed test sessions and synthetic ids only.
- **Seeding, all through the real code paths:**
  - (a) paid-not-earned: credit 30, then `grantPaidPurchase`;
  - (b) earned at exactly 100: a credit crossing;
  - (c) paid-then-earned;
  - (d) earned-then-paid, which gives two messages;
  - (e) non-citizen control.
- **Attempted leaks (step 2):** for each of `GET /v1/profile`, `POST /v1/login`, `POST /v1/profile/tenure-grant` (first claim, then duplicate) and `GET /v1/messages`, run the L1–L4 predicates against the HTTP bodies and assert (a) and (b) give identical results. Check the stored DB rows are **unchanged**: `citizenship_paid` is still stored, and the true xp is still 30.
- **Enumeration (step 3):** walk about 12 players across classes (a)–(e) under unverified tokens. For each route, group by class and assert that paid and earned classes match on:
  - status code;
  - key set;
  - **JSON byte length** (ISO timestamps are fixed width, and 100 has the same digits);
  - every paid-sensitive value.
  - Timing is not measured. The projection is pure and adds no DB work that depends on paid state. I will state that it is unmeasured.
- **Badge (step 4):** `is_citizen` is true for (a)–(d), and the profile read stays 200.
- The suite needs the local Postgres container. If it cannot run, I will say so and not claim a pass.
- **Also run:** `npm test` (including the shell harnesses), `npm run lint`.

## 5. Verification steps mapped
- **Step 1** (positive verified case): S3b, not S1.
- **Steps 2, 3, 4:** the tests above.
- **Step 5:** section 3.
- **Step 6:** no verification exists in S1, so there is no new failure branch. The projection is pure and cannot error.
- **Step 7:** core tests.
- **Step 8:** synthetic fixtures only.

## 6. Edge cases
- A paid citizen crossing 100 later: earned_at is stamped and the clamp becomes a no-op.
- A tenure claim that makes someone a citizen: xp ≥ 100, so no clamp.
- The payer's own card shows 100 / 100, and the tenure popup does too (accepted, D4 #1).
- Earned citizens also lose the "100 XP" wording in the inbox, because both keys map to one.
- Collapse (Q2): hidden messages are not in the list, so they never count as unread. "Mark all read" still marks them.
- Operator literal messages (`title`/`body`) are not scanned. An operator could write purchase wording by hand. Out of scope; noted.
- `markRead` with ids is unaffected.
- The `LoginRoutes` fixture sets `is_citizen:false` with `is_paid_citizen:true`, which breaks a DB invariant. The new leak tests use valid fixtures only.

## 7. Effort and files
- About 1–1.5 days.
- **Files:**
  - new: `src/profile-server/PublicProjection.ts`;
  - edited: `Routes.ts`, `PlayerProfileRepository.ts`, `core/profile/InboxContract.ts`, `core/profile/PlayerProfile.ts` (comment), `client/PlayerProfileView.ts`, `resources/lang/{en,ru}.json`, `analytics-event-reference.md`;
  - the tests listed in section 4.
- `Routes.ts`, `InboxContract.ts` and the lang files already carry uncommitted 0314/0302 work. S1's diff lands on top.

## 8. Left for the owner
- **Residuals to record as accepted (in the `0325` ADR with L5):**
  - the exactly-100 probabilistic bias;
  - the "played a match, xp did not move" inference for an observer with outside knowledge (needed even with Q1);
  - the rollback caveat in section 3.
- **Deploy is owner-run:** client, then server.

## Owner rulings (2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (hide `updated_at` from unverified callers):** "Hide it (Recommended)" — Send the account creation date instead. Closes the signal; nothing visible changes. (Asked twice; the owner first chose "Explain more, then ask again".)
- **Q2 (collapse duplicate citizenship messages):** "Show only the first (Recommended)" — Unverified logins see just one welcome message. Closes it.
- **Q3 (the "exactly 100 XP" hint):** "Accept as known risk (Recommended)" — Record it next to the other accepted 'watching' risk, in the verified-login design note. (Asked twice; the owner first chose "Explain more, then ask again".)
- **Q4 (neutral inbox text):** "Without game name (Recommended)" — this OVERRIDES the Step 5 proposed text. Use exactly: en title "Welcome, Citizen!", body "You are now a citizen. Citizen benefits are now available to you."; ru title "Добро пожаловать, Гражданин!", body "Теперь вы гражданин. Вам доступны привилегии граждан." (No game name, per 0311.)

- **Plan approval:** "Approve (Recommended)" — 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session. Scope: slice S1 only; S3b is planned separately after `0325`.
