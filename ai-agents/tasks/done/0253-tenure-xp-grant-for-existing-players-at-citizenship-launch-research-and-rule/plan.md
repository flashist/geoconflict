# Plan — 0253 step 3: the tenure XP grant (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-14, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session:
  **"Approve"**, including the worker's recommendations on NEEDS-DECISION 2, 3, 4, 5.
- Rule rulings (A–G) are recorded in `worklog.md` and ADR-112
  (`ai-agents/knowledge-base/decisions/adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md`).
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-14):
  1. **Window start** — "Weekend deploy day": `TENURE_WINDOW_OPENS_AT_MS` = 2026-09-19 00:00 Moscow time
     (UTC+3); closes 90 days later.
  2. **Pre-launch = before this device first runs the grant build** (snapshot, written even when the kill
     switch is off) — accepted (recommendation).
  3. **All game types count** toward `game-records` days — accepted (recommendation).
  4. **Duplicate on an unmarked device shows the modal** — accepted (recommendation).
  5. **Implausible evidence**: reject only impossible timestamps; clamp day counts to the possible span,
     then cap — accepted (recommendation).
  6. **Who turns on `CITIZENSHIP_CARD_ENABLED`** — "Part of XP go-live" (0217/0017), NOT this task. 0253
     does not flip it.
  7. **Integration test** — not asked separately; the driver asks the owner to start Docker Desktop when the
     build reaches `npm run test:integration`. If Docker is unavailable, say so loudly; do not claim
     verification 8.
  8. **Modal copy** — "Yes, as drafted".

---

## Scope as ruled (2026-09-14)
- **Days** = the larger of `daysPlayed` and the number of distinct calendar days in `game-records`.
- **Amount:** 1 XP per day, capped at 50. Minimum 3 days.
- **Only pre-launch days count.**
- **One grant per account for life.** One claim per device.
- **At least one real credited match** is required before claiming.
- **90-day claim window.** A guest can claim after logging in.
- **Storage:** a `player_xp_grants` table, and a direct profile-server route that answers synchronously.
- **Notice:** a one-time modal after the server confirms, behind the citizenship kill switch.
- **Analytics:** `Claimed` / `Rejected:<Reason>` / `ClaimFailed`.

## How "pre-launch" is defined (the key design choice; decision 2)
The server can't see local dates, and `daysPlayed` has no dates at all. So on the first boot of the new build, the client takes a one-time snapshot `geoconflict.player.tenureSnapshot = { daysPlayed, takenAt }`:
- It is written in `FlashistFacade.initializeImmediate()` **before** `logDaysPlayedAnalytics()` (`:476`) adds today.
- **Pre-launch = before this device first ran the grant build.**
- `game-records` days are counted at claim time, keeping only entries with `startTime < takenAt`.
- The snapshot is written **whatever the kill switch says**: it is local only, with no network and no UI. If it were gated, days played while the switch is off would leak in.
- This holds as long as the grant build ships no later than XP go-live.

## Step 1 — Shared rules (`src/core`)
- **`src/core/profile/Citizenship.ts`**: add `TENURE_XP_PER_DAY = 1`, `TENURE_XP_CAP = 50`, `TENURE_MIN_DAYS = 3`, next to `XP_PER_MATCH` (ruling B). Add a comment linking ADR-111 and the free-grant ADR (ADR-112).
- **New `src/core/profile/TenureGrantContract.ts`** (pure, no I/O):
  - **Constants:**
    - `TENURE_EVIDENCE_FLOOR_MS` = the fork's first commit, 2025-11-04. No player can have data before it; this is a safe hard floor.
    - `TENURE_WINDOW_OPENS_AT_MS` (decision 1: 2026-09-19 00:00 Moscow time).
    - `TENURE_CLAIM_WINDOW_DAYS = 90`.
  - **Request schema (zod):** `{ yandexPlayerId: 1..128, evidence: { daysPlayed: int 0..100000, gameRecordDays: int 0..100000, firstPlayedAt: int|null, snapshotTakenAt: int } }`.
  - **Response schema:**
    - `200 { status: "granted" | "duplicate", xpAwarded, xp }`
    - `422 { error: "below_minimum" | "implausible" | "window_not_open" | "window_closed" | "no_profile" | "no_credited_match" }`
  - **`evaluateTenureClaim(evidence, nowMs)`** returns `{ ok, days, xpAwarded } | { ok: false, reason }`, in this order:
    1. **Window:** before it opens → `window_not_open`; after it closes → `window_closed`.
    2. **Timestamps:** `snapshotTakenAt` more than 1 day in the future, or `firstPlayedAt` before the floor or after `snapshotTakenAt` → `implausible`.
    3. **Days:** `days = max(daysPlayed, gameRecordDays)`, clamped to the whole-day span from `max(floor, firstPlayedAt)` to `snapshotTakenAt`, plus 1 (decision 5).
    4. **Minimum:** `days < 3` → `below_minimum`.
    5. **Amount:** `xpAwarded = min(days × 1, 50)`.

## Step 2 — Migration `migrations/005_player_xp_grants.sql`
Idempotent statements with no BEGIN/COMMIT, following the 004 header style. The runner wraps each file in a transaction.
```sql
create table if not exists player_xp_grants (
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  kind             text not null check (kind in ('tenure')),
  xp_awarded       integer not null check (xp_awarded > 0),
  evidence         jsonb not null,
  granted_at       timestamptz not null default now(),
  primary key (yandex_player_id, kind)
);
```
- The header documents the invariant `player_profiles.xp = Σ player_match_xp_credits.xp_awarded + Σ player_xp_grants.xp_awarded`.
- It is applied at deploy by `setup-profile.sh:1011` (`npm run migrate`). `Dockerfile.profile:35` already copies `migrations/`.

## Step 3 — Repository (`src/profile-server/PlayerProfileRepository.ts`)
New `grantTenureXp(yandexPlayerId, xpAwarded, evidence)` returning `{ status: "granted" | "duplicate" | "no_profile" | "no_credited_match", xpAwarded, xp, citizenshipNewlyGranted }`. One transaction:
1. `SELECT xp, is_citizen, citizenship_earned_at FROM player_profiles WHERE yandex_player_id=$1 FOR UPDATE`. No row → `no_profile`.
2. `EXISTS (SELECT 1 FROM player_match_xp_credits WHERE yandex_player_id=$1)`. False → `no_credited_match`.
3. `INSERT INTO player_xp_grants … ON CONFLICT (yandex_player_id, kind) DO NOTHING RETURNING xp_awarded`. No row returned → read the stored `xp_awarded` and the current xp → `duplicate`.
4. `UPDATE player_profiles SET xp = xp + $amount, updated_at = now() … RETURNING xp`.
5. If the new xp is at least 100 and the player isn't yet an earned citizen, run the existing `GRANT_CITIZENSHIP_SQL` and fire the existing post-commit `afterCitizenshipEarned` hook.
   - A grant can cross the threshold when the player already has 50 or more real XP.
   - `CREDIT_SQL`, `creditMatchXp` and the hook's contract are not changed.

The route depends on a separate structural `TenureGrantRepo` interface. `PlayerProfileRepository` implements it, so the existing `ProfileRepo` mocks don't change (`tsconfig` type-checks `tests/`).

## Step 4 — Route (`src/profile-server/Routes.ts`, `Server.ts`)
- **Wiring:** `createApp(repo, payments?, inbox?, nameChange?, tenureGrant?)`, as an optional 5th parameter. `Server.ts` passes `repo`.
- **`POST /v1/profile/tenure-grant`**, using the name-change middleware pattern:
  - its own CORS handler (POST + OPTIONS 204), the same shape as `nameChangeCors` (`:689-698`)
  - a 30/min per-IP rate limiter, for the same carrier-NAT (CGNAT) reason as `:699-717`
  - a fail-closed `503 tenure_grant_unavailable` when no repo is passed
- **Flow:**
  1. Parse the body → otherwise `400 bad_request`.
  2. `evaluateTenureClaim(evidence, Date.now())` → otherwise `422 { error: reason }`.
  3. `repo.grantTenureXp(...)`, then map: `granted`/`duplicate` → `200`; `no_profile`/`no_credited_match` → `422`; a throw → `500 internal_error`.
- **Never trusted from the client:** the amount. The server computes it.
- **Logging:** the outcome and the amount only, never evidence values.
- **Identity:** the `yandexPlayerId` the client sends, at the same trust level as `/v1/profile/name-change-request` and `/v1/payments/yandex/intent`. A code comment names ADR-103, the gifting risk, and `0250` as the place a signature check would go.

## Step 5 — Client evidence (new `src/client/TenureEvidence.ts`, pure over `StorageLike` like `DaysPlayedAnalytics.ts`)
- **`snapshotTenureEvidenceOnce(storage, now)`** writes `{ daysPlayed, takenAt }` only if no snapshot exists. It never throws.
- **`readTenureEvidence(storage)`** returns `{ daysPlayed, gameRecordDays, firstPlayedAt, snapshotTakenAt } | null`:
  - `gameRecordDays` = distinct **local** dates of `startTime` across **all** game types, only where `startTime < takenAt` (decision 3).
  - `firstPlayedAt` = the earliest of `firstSeen` and the minimum `startTime`.
  - Handles corrupt JSON, missing keys, and storage that throws.
- **`FlashistFacade.initializeImmediate`**: call `snapshotTenureEvidenceOnce(localStorage)` directly before `logDaysPlayedAnalytics()`.

## Step 6 — Client claim (new `src/client/TenureGrantClaim.ts`; follows `NameChangeRequest.ts` / `CitizenshipPurchase.ts`)
`maybeClaimTenureGrant(yandexPlayerId)`: bounded timeout, never throws. Steps:
1. **Stop early** if any of these hold:
   - the device marker `geoconflict.tenureGrant.done` is set
   - there is no Yandex id (guest)
   - there is no snapshot
   - `profileApiUrl` is empty
2. **Compute days locally.** Below 3 → set the marker (the snapshot is frozen, so this is permanent), log `Rejected:BelowMinimum`, stop.
3. **POST** the claim. Responses:
   - **`granted`, or `duplicate` while the marker is absent** → set the marker **first**, then open the modal with `{ days, xpAwarded, xp }`. `granted` logs `Claimed` (value = XP); `duplicate` logs `Rejected:Duplicate`. A duplicate on an unmarked device means the ack was lost or another device claimed; still show the modal (decision 4).
   - **`below_minimum`, `implausible`, `window_closed`** → set the marker, log `Rejected:<Reason>`. These are permanent.
   - **`no_profile`, `no_credited_match`, `window_not_open`** → **no marker**, log `Rejected:<Reason>`, retry on the next load. These are temporary.
   - **Network error, timeout, 5xx, 429, a body that doesn't parse** → **no marker**, log `ClaimFailed`, retry on the next load.

The marker is set only after a server answer. This is the ack-before-marker rule from findings 1.6.

## Step 7 — Wiring behind the kill switch (`src/client/CitizenshipCard.ts`)
- **Trigger:** inside the enabled path only, after `refreshProfile()` resolves with an authoritative logged-in profile. Call `maybeClaimTenureGrant`; on `granted`/`duplicate`, run `refreshProfile()` again so the XP bar updates.
- **Gating:** the existing `CITIZENSHIP_CARD_ENABLED` plus the `citizenship_ui` gate (`:76-92`). Degraded mode has no SDK and no id, so no claim. **This task does not change `CITIZENSHIP_CARD_ENABLED`** (decision 6).
- **Guest who logs in:** covered by the existing `onLoginCtaTap → refreshProfile` path (`:165-182`).
- **One attempt per page load:** a flag on the card prevents a loop, because refreshes happen after name change and purchase too.

## Step 8 — Modal (new `src/client/TenureGrantModal.ts`)
- A `@customElement("tenure-grant-modal")` with `show()`/`hide()` and `@state() isVisible`, following `GameStartingModal.ts`. One "Great!" button closes it.
- `<tenure-grant-modal>` goes into **both** `src/client/index.html` and `src/client/yandex-games_iframe.html`.
- It is imported in `Main.ts` next to `./CitizenshipCard`.
- Every string goes through `translateText`, with parameters `{days}`, `{xp}`, `{total}`, `{threshold}`. The threshold comes from `CITIZENSHIP_XP_THRESHOLD`, never a literal `100`, so `CitizenshipCopy.test.ts` isn't affected.

## Step 9 — Copy: `resources/lang/en.json` and `ru.json`, same change
A new `citizenship_tenure_grant` section next to `citizenship_card`, with the approved copy (decision 8):
- **en**
  - `title`: "Thanks for being with us!"
  - `body`: "You've played Geoconflict on {days} days before citizenship arrived. As a thank-you, we've added {xp} XP to your progress — you now have {total} / {threshold} XP."
  - `cta`: "Great!"
- **ru**
  - `title`: "Спасибо, что вы с нами!"
  - `body`: "Дней в игре до появления гражданства: {days}. В благодарность мы начислили вам {xp} XP — теперь у вас {total} / {threshold} XP."
  - `cta`: "Отлично!"

## Step 10 — Analytics
- **Enum in `flashistConstants.analyticEvents`:**
  - `CITIZENSHIP_TENURE_GRANT_CLAIMED: "Citizenship:TenureGrant:Claimed"` (value = XP)
  - `CITIZENSHIP_TENURE_GRANT_REJECTED: "Citizenship:TenureGrant:Rejected"`, with the suffix `:BelowMinimum|Implausible|WindowNotOpen|WindowClosed|NoProfile|NoCreditedMatch|Duplicate` added at the call site (the same pattern as `MATCH_LEADERBOARD_AWARD`)
  - `CITIZENSHIP_TENURE_GRANT_CLAIM_FAILED: "Citizenship:TenureGrant:ClaimFailed"`
- **`ai-agents/knowledge-base/analytics-event-reference.md`:** new rows under *Citizenship Events* and the TypeScript enum section.
  - Note: temporary rejections fire once per page load until they resolve, so use unique users, not event counts.
  - Note: all three events are gated behind `CITIZENSHIP_CARD_ENABLED`.

## Step 11 — Tests
- **Core:** `tests/core/profile/TenureGrantContract.test.ts`
  - the max of the two counts; minimum 3 (2 rejected, 3 → 3 XP); cap (80 days → 50)
  - clamping to the span; `implausible` for a future snapshot or a date before the floor
  - window not open / open / closed at the edges; schema bounds
  - plus the new constants in `Citizenship.test.ts`
- **Profile server, repository:** `tests/profile-server/PlayerProfileRepository.test.ts`, extended with the fake-pool harness from `NameChangeRepository.test.ts`:
  - granted; duplicate returns the stored amount and doesn't update xp
  - `no_profile`; `no_credited_match`
  - a grant crossing 100 runs `GRANT_CITIZENSHIP_SQL` and fires the inbox hook after commit
  - a failure rolls back
- **Profile server, routes:** new `tests/profile-server/TenureGrantRoutes.test.ts` (supertest, so it belongs to the known-flake family):
  - 200 granted/duplicate; each 422 reason; 400; 503 without a repo; 500 on a throw
  - OPTIONS returns 204 with CORS headers
  - a client-sent amount is ignored
- **Integration:** new `tests/integration/TenureGrant.it.test.ts`, using the real migrations and Postgres. This covers brief verification 8:
  - the exact capped amount is credited
  - a second identical claim credits nothing and returns duplicate
  - xp = Σ match credits + one grant
  - `no_credited_match` before any credit
- **Client:**
  - `tests/client/TenureEvidence.test.ts`: the snapshot is written once and never overwritten; the snapshot runs before the day increment (ordering in `initializeImmediate`, via `FlashistFacade.test.ts` or a direct test); game-records dates are local-date distinct and filtered by `takenAt`; corrupt JSON and throwing storage are handled.
  - `tests/client/TenureGrantClaim.test.ts` (fetch mocked):
    - no marker on a network failure, a 5xx, or a temporary 422 (verification 9)
    - the marker and modal only after an ack; a lost-ack duplicate still shows the modal
    - an existing marker → no request
    - a guest → no request, no modal (verification 12)
    - below-minimum short-circuits
    - analytics per outcome
  - `tests/client/CitizenshipCard.test.ts`, extended: kill switch off → no claim, no modal (verification 13); enabled → claim after the profile loads; one attempt per load.
  - `tests/client/TenureGrantLang.test.ts`, following `NameChangeLang.test.ts`: every key exists in en and ru, with the same placeholders in both (verification 11).
- **Checks:** `npm test`, `npm run lint`, `npx tsc --noEmit`, and prettier on the touched files. `npm run test:integration` needs Docker.

## Order of work
Steps 1 → 2 → 3 → 4, each with its tests; then 5 → 6 → 7 → 8/9 → 10; then the full checks; then a stateful review by `@fkit-reviewer`.

## Can only be verified after the weekend deploy and XP wiring (`0217`)
- Migration 005 applied on the real box.
- A real claim from the Yandex iframe reaching the API subdomain, including CORS preflight and the rate limiter behind the host nginx.
- Real evidence and a real snapshot on real devices.
- The at-least-one-credited-match condition, which needs live crediting (`0217`).
- The modal on desktop and mobile.
- The events appearing in GameAnalytics (production builds only).
- A grant pushing a player over 100 and sending the inbox message.
- It has to be recorded in the worklog that none of this can reach players until `0217` is deployed **and** `CITIZENSHIP_CARD_ENABLED` is turned on (verification 14).

## Edge cases covered
- Two tabs claiming at once: the primary key serializes them; the second gets duplicate.
- Someone forges a claim for another player first: the real player later gets duplicate and still sees the modal. Their XP really did go up.
- A shared device with two accounts: the device marker means only the first account claims.
- A reconnect overwrites a game's `startTime` and loses that date: too small to matter.
- A heavy device parses `game-records` only at claim time, at most once per load, never at boot.
- Another start-screen modal is open when the grant lands: the modal waits until it closes if one is visible. Checked during the build; the queuing mechanism follows the existing start-screen modals.
