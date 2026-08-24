# Plan — 0017 Citizenship Earned (1,000 XP path)

**Status:** awaiting owner approval (ADR-031 orchestrated plan gate). Plan-only — no source written.
**Scope ruling honored:** local-stack build + verify only; Deferred Live Tail (0062-gated) out of scope;
`CITIZENSHIP_CARD_ENABLED` flip-ON out of scope (happens at live launch, Live Tail step 4).

## Verified findings (brief vs code)

1. **Part A is ~80% already built and integration-tested.** The brief says "extend `creditMatchXp()`
   … checks the threshold and grants atomically" — that SQL already exists. `CREDIT_SQL` in
   `src/profile-server/PlayerProfileRepository.ts:67-88` increments `xp`, flips `is_citizen`, and
   stamps `citizenship_earned_at` (once, `IS NULL`-guarded) in ONE statement, threshold from the shared
   `CITIZENSHIP_XP_THRESHOLD = 1000` (`src/core/profile/Citizenship.ts`). Idempotency, threshold
   crossing, stamp-once, single-shot large award, and concurrency are covered in
   `tests/integration/PlayerProfileRepository.it.test.ts:127-172`. **What's missing:** the
   `citizenshipNewlyGranted` return flag and the post-grant hook seam.
2. **Brief path error:** the repository is `src/profile-server/PlayerProfileRepository.ts`, not
   `src/server/PlayerProfileRepository.ts` (no such file).
3. **Part C (Option A) is satisfied by the app's exit architecture.** Every post-match exit is a full
   navigation: `WinModal._handleExit` → `FlashistFacade.changeHref` → `window.location.href`
   (`src/client/graphics/layers/WinModal.ts:335-346`, `FlashistFacade.ts:651-654`); same for
   GameRightSidebar/SettingsModal exits. The reloaded page re-runs `CitizenshipCard.connectedCallback`
   → `loadPlayerProfileView()` → fresh server profile → State 3 renders with no *manual* reload. The
   non-reload `leave-lobby` path exists only for pre-game lobby leaves, where no XP is credited. So
   Part C needs **no state-sync code** — only the analytics detection below plus manual verification.
4. **Brief self-contradiction on analytics:** Dependencies (re-scoped 2026-08-23) says this task owns
   `Citizenship:Earned:XP` and events must be wired during implementation (0021 brief §6 assigns it to
   0017 explicitly); the brief's own Analytics section still says "No new analytics event needed."
   → NEEDS-DECISION 1. Plan assumes the Dependencies/0021 line wins (it is the newer, owner-ruled text).
5. **Paid grant also sets `is_citizen = true`** (`PaymentsRepository.GRANT_FLAGS_SQL:48-55`) but never
   `citizenship_earned_at`. Two consequences: (a) "newly granted" must be defined as
   `is_citizen false→true` (brief's own SQL has `AND is_citizen = false`); (b) client-side earned
   detection must key on `citizenship_earned_at`, because the public profile projection strips
   `is_paid_citizen` (`Routes.ts toPublicProfile`), so `is_citizen` alone can't distinguish earned
   from paid.
6. **Verification 5 (non-qualifying match) is already implemented + unit-tested:**
   `qualifiesForMatchXp` requires `hasSpawned` (`src/core/profile/MatchQualification.ts`);
   `tests/core/profile/MatchQualification.test.ts` covers it. Nothing to build; re-verify manually.
7. **Verification 6 (forged citizenship):** already structurally true — `UPSERT_SQL` never touches
   citizenship columns, both wire schemas (`CreditContract.ts`) are `z.object`s that strip unknown
   keys, and no input field reaches those columns. Missing piece: **tests that pin it** (route-level,
   no Docker needed).
8. **0019 seam shape confirmed:** `PaymentsRepository.afterPaidPurchaseGranted` — private no-op fired
   *after commit*, `TODO(0012/0018)` comment (`PaymentsRepository.ts:166-180`). Part B mirrors this
   exactly, as the owner approved at the 0019 plan gate.

## Changes

### Phase 1 — everything that needs NO Docker (front-loaded)

**1. `src/profile-server/PlayerProfileRepository.ts`**
- Extend `CREDIT_SQL`'s `upd` CTE with a self-join to read the pre-update row
  (`UPDATE player_profiles p SET … FROM player_profiles old WHERE old.yandex_player_id = p.yandex_player_id …
  RETURNING old.is_citizen AS was_citizen, p.is_citizen AS now_citizen`), and surface
  `newly_granted` (`now_citizen AND NOT was_citizen`) in the final SELECT alongside `inserted`
  (`COALESCE`d to false when `upd` matched nothing). Keeps the single-statement atomicity — no
  read-modify-write, no second query, transaction unchanged.
- Return type: `creditMatchXp(): Promise<CreditOutcome>` where
  `CreditOutcome = { status: CreditStatus; citizenshipNewlyGranted: boolean }`.
  `duplicate` / `no_profile` ⇒ always `false`.
- Post-commit hook seam mirroring 0019: after `COMMIT`, if newly granted, call private
  `afterCitizenshipEarned(yandexPlayerId)` — a documented no-op with
  `TODO(0012): personal-inbox message` referencing the `citizenship_earned.inbox_title/inbox_body`
  localization keys (Part B done as the sanctioned no-op seam).
- `citizenship_earned_at` stamping behavior is deliberately **unchanged** (still stamps for a paid
  citizen crossing the threshold — see NEEDS-DECISION 3).

**2. `src/profile-server/Routes.ts`**
- `ProfileRepo.creditMatchXp` signature → `Promise<CreditOutcome>`; credit handler uses
  `outcome.status`. **Wire contract (`CreditContract.ts`) unchanged** — the game server has no
  consumer for the flag (client detects via re-fetch), and an unchanged schema avoids deploy-skew
  concerns. Flagged as a reviewable choice.

**3. `src/client/flashist/FlashistFacade.ts`**
- Add `CITIZENSHIP_EARNED_XP: "Citizenship:Earned:XP"` to `flashistConstants.analyticEvents`.
- **`CITIZENSHIP_CARD_ENABLED` stays `false`** (out of scope).

**4. `src/client/PlayerProfileView.ts`** — earned-transition detection (0021 §6)
- In `loadPlayerProfileView()`, after a successful profile fetch: read last-known
  `citizenship_earned_at` from localStorage (key per `yandexPlayerId`); if a previous value was
  recorded as null/absent-with-prior-visit and the fresh profile has it non-null → fire
  `CITIZENSHIP_EARNED_XP` once; always write the fresh value back. Entirely try/catch-wrapped —
  storage failure or private mode silently skips detection, never breaks the card. Fires only on
  server-authoritative data (0021's "not on local XP display alone"), and fires at most once because
  the stored state advances with the fetch.
- No card/UI change needed: `CitizenshipCard` already re-fetches on every page load, and State 3
  (ГРАЖДАНИН badge, bar 100%) already renders from `isCitizen` — the card transition *is* the
  notification (brief Option A: "No push notification needed").

**5. Localization — `resources/lang/en.json` + `resources/lang/ru.json`** (both, per project rule)
- Add the `citizenship_earned.inbox_title` / `inbox_body` section exactly as specified in the brief.
  Unused until 0012 renders the inbox; referenced from the seam's TODO.

**6. `ai-agents/knowledge-base/analytics-event-reference.md`**
- Document `Citizenship:Earned:XP` (enum key, string, firing condition) per 0021 verification 7 and
  the project analytics rule.

**7. Tests (no Docker)**
- `tests/profile-server/Routes.test.ts`: update `creditMatchXp` mocks to the new `CreditOutcome`
  shape; add forged-body tests (verification 6) — POST `/internal/v1/profile/upsert` and
  `/internal/v1/credit` with `is_citizen: true` / `citizenship_earned_at` injected into the body:
  assert the repo receives only contract fields and responses reflect nothing forged.
- `tests/client/PlayerProfileView.test.ts`: detection fires once on null→non-null transition; no fire
  on first-ever sight (no stored state); no fire when value unchanged; no fire for guests/failed
  fetches; storage throwing is harmless.
- `npm test` + `npm run lint` — full non-DB suite green before Phase 2.

### Phase 2 — Docker becomes REQUIRED from here (owner must start Docker Desktop manually — interactive password prompt, known constraint)

**8. `tests/integration/PlayerProfileRepository.it.test.ts`** (`RUN_DB_TESTS=1 npm run test:integration`,
   Postgres via Docker, `TEST_DATABASE_URL`)
- Extend the existing threshold test to assert `citizenshipNewlyGranted`: `false` pre-threshold,
  `true` exactly on the crossing credit, `false` on the next credit and on a `duplicate` re-credit.
- `false` + no earned-inbox trigger for a player made a citizen via the paid path first (set paid
  flags by direct SQL, then credit across 1000) — while asserting `citizenship_earned_at` still
  stamps (current behavior, see NEEDS-DECISION 3).
- `no_profile` ⇒ `false`. Adjust existing assertions from string returns to `outcome.status`.

**9. Manual verification on the full local stack**
Stack: Docker Postgres → `npm run migrate` → `npm run start:profile-server` (local
`DATABASE_URL`, `PROFILE_INTERNAL_TOKEN`) → `npm run dev` with `PROFILE_API_URL` +
`PROFILE_INTERNAL_TOKEN` pointing at it. **Temporary, uncommitted local flip of
`CITIZENSHIP_CARD_ENABLED` to `true`** so the card is visible (dev env auto-passes the experiment
flag); reverted before hand-off — the shipped default stays `false`.
- V1 grant-at-threshold: seed 990 XP by SQL, play a qualifying match, confirm flip + stamp.
- V2 idempotency: re-run the same credit; no un-flip, no re-stamp (also pinned by it-tests).
- V3 inbox: **deferred behind the 0012 no-op seam** (per brief) — executes when 0012 lands.
- V4 UI transition: complete V1 with the tab open; exit to start screen; card shows State 3 without a
  manual reload; `Citizenship:Earned:XP` fires once (network/analytics log).
- V5 non-qualifying: never spawn; no credit (already unit-tested; spot-check live).
- V6 forged fields: curl upsert/credit with forged `is_citizen` bodies; row unchanged (also pinned by
  the new route tests).

## Edge cases & risks

- **Credit-vs-refetch race at match exit:** the game server credits fire-and-forget at match end
  (bounded retries up to ~10s+ on failure); the client's post-exit reload may fetch before the write
  lands → card briefly stale until next load, event fires on that later load. Accepted MVP residual of
  Option A (the interstitial ad on exit usually gives the credit a head start). No mitigation planned.
- **Fresh device / cleared storage:** a player whose *first* stored snapshot is already-citizen never
  fires the event (deliberate — prevents false "earned now" on every new device for existing
  citizens). Residual: earning citizenship on a brand-new device with no prior visit under-counts.
- **Paid citizen later crossing 1000 XP:** client detection (keyed on `earned_at`) WILL fire
  `Citizenship:Earned:XP`; the server flag/inbox will NOT (is_citizen already true). See
  NEEDS-DECISION 2/3.
- **Concurrent crossing credits (two games):** Postgres row lock serializes the two `UPDATE`s; exactly
  one observes `was_citizen = false` ⇒ exactly one `newlyGranted` / one inbox trigger. Asserted
  sequentially in it-tests; true concurrency already covered by the existing concurrent-credit test.
- **Hook failure isolation:** seam fires after COMMIT (0019 pattern) — a future 0012 failure can never
  roll back a real grant.
- **`upd` CTE self-join correctness:** `FROM player_profiles old` inside a data-modifying CTE reads
  the pre-update snapshot — standard PG semantics; pinned by the it-tests either way.

## Out of scope (explicit)

- `CITIZENSHIP_CARD_ENABLED` flip-ON (Deferred Live Tail step 4, at live launch with 0062).
- Anything in the Deferred Live Tail (prod token, prod XP accrual, live grant) — 0062-gated.
- Personal inbox delivery (0012) — no-op seam only. Option B (WS push) — rejected per brief.
- Task closure: per the brief, 0017 must NOT be closed until the Live Tail runs.

## NEEDS-DECISION (for the owner, via the lead)

1. **Analytics contradiction in the brief.** Dependencies (2026-08-23 re-scope) + 0021 §6 assign
   `Citizenship:Earned:XP` to this task; the brief's Analytics section still says "no event needed."
   **Rec:** wire it now (plan assumes this) — the Dependencies line is the newer owner-ruled text, and
   0021's warning says un-wired launch data can't be backfilled.
2. **Client-side firing semantics for `Citizenship:Earned:XP`.** All analytics go through the client
   `FlashistFacade` (no server-side analytics path exists), so the event fires when the client first
   *observes* the server-authoritative grant, with the two residuals above (fresh-device under-count;
   paid-citizen-crossing over-count — the public projection hides `is_paid_citizen`, making this
   undetectable client-side). **Rec:** accept both for MVP.
3. **`citizenship_earned_at` for paid citizens crossing 1000 XP.** Current merged SQL stamps it;
   the brief's sketch (`AND is_citizen = false`) would not. Plan keeps current behavior (the player
   did earn it; flag/inbox stay suppressed). **Rec:** keep as-is; changing it would touch tested SQL
   for no user-visible effect today.
