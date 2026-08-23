# Task — Citizenship Core: Earned Citizenship (1,000 XP Path)

## ID
0017

## Sprint
Sprint 4

## Priority
High — the primary citizenship path for most players. Independent of Yandex Payments.

## Status
🚧 Blocked — `0062` (`PROFILE_INTERNAL_TOKEN` not forwarded to prod: no XP is credited there, so the
1,000 XP threshold can never fire). Verified 2026-08-23; see Notes.

## Owner
fkit-coder

## Dependencies
- **Player Profile Store** must be live — XP crediting and profile writes happen there.
- **Analytics:** this task owns `Citizenship:Earned:XP`. Read `0021-analytics-p1-citizenship-funnel` before starting — events must be wired during implementation, not added later.
- **Personal Inbox (8d-B)** must be live — citizenship earned triggers an inbox message.
- **Citizenship XP Progress UI** must be live — the notification and UI state change depend on the card component being in place.

## Context

When a player's accumulated XP reaches 1,000, they automatically earn citizenship. This happens server-side at match end, as a side effect of `creditMatchXp()`. No player action is required. The earned path is fully independent of Yandex Payments.

---

## What to Build

### Part A — Server: citizenship grant on XP threshold

In `src/server/PlayerProfileRepository.ts`, extend `creditMatchXp()` so that after incrementing `xp`, it checks the threshold and grants citizenship atomically if not already granted:

```ts
// inside the creditMatchXp transaction, after incrementing xp:
UPDATE player_profiles
SET
  is_citizen = true,
  citizenship_earned_at = now()
WHERE
  yandex_player_id = $1
  AND xp >= 1000
  AND is_citizen = false
```

This must be in the same transaction as the XP increment to prevent race conditions.

Return a flag indicating whether citizenship was newly granted so the caller can trigger downstream effects.

### Part B — Server: trigger inbox message

When `creditMatchXp()` returns `citizenshipNewlyGranted: true`, send a personal inbox message via the mechanism established in the Personal Inbox task:

| Field | Value |
|---|---|
| Title | "You've earned Geoconflict Citizenship!" / "Вы получили гражданство Geoconflict!" |
| Body | "You've reached 1,000 XP and earned citizenship. You now have access to citizen benefits." / "Вы набрали 1,000 XP и получили гражданство. Вам теперь доступны привилегии граждан." |

### Part C — Client: real-time citizenship notification

When the player is in an active session and earns citizenship, they should see a notification without requiring a page reload. Two approaches — pick the simpler one:

**Option A (preferred for MVP):** on match end, the client re-fetches the player profile before returning to the start screen. If `is_citizen` changed to `true`, the citizenship card transitions to State 3 automatically. No push notification needed.

**Option B:** server pushes a `CitizenshipGranted` event to the client via the existing WebSocket at match end. Client updates profile state in memory.

Option A is simpler and sufficient for Sprint 4 — profile re-fetch on match return is a natural sync point.

---

## Localization

Add to both `en.json` and `ru.json`:

```json
"citizenship_earned": {
  "inbox_title": "You've earned Geoconflict Citizenship!",
  "inbox_body": "You've reached 1,000 XP and earned citizenship. You now have access to citizen benefits."
}
```

Russian:
```json
"citizenship_earned": {
  "inbox_title": "Вы получили гражданство Geoconflict!",
  "inbox_body": "Вы набрали 1,000 XP и получили гражданство. Вам теперь доступны привилегии граждан."
}
```

---

## Analytics

No new analytics event needed for the citizenship grant itself — it is a server-side state change, not a UI action. The XP progress is already tracked through match crediting.

If a `Citizenship:Earned` funnel event is wanted in the future, add it then.

---

## Verification

1. **Grant at threshold:** manually set a test account to 990 XP in the database. Play one qualifying match (10 XP). Confirm `is_citizen` flips to `true` and `citizenship_earned_at` is set.
2. **Idempotency:** run the threshold check twice for the same player. Confirm `is_citizen` is not set back to `false` and `citizenship_earned_at` is not overwritten.
3. **Inbox message:** confirm the citizenship earned inbox message appears in the Personal inbox tab after the grant.
4. **UI transition:** complete step 1 while the game is open in a browser tab. Return to the start screen after the match. Confirm the citizenship card shows State 3 (ГРАЖДАНИН) without a manual reload.
5. **Non-qualifying match:** complete a match where the player never spawns. Confirm XP is not credited and the threshold is not triggered.
6. **Forged citizenship (security, 2026-06-13; updated — no migrate path):** `is_citizen` / `citizenship_earned_at` must be settable ONLY by the server-side `xp >= 1000` check in `creditMatchXp()`. There is **no client→server profile upload** in Sprint 4 — the guest-migration endpoint `POST /v1/profile/migrate` was **cancelled 2026-06-13** (T2/T7 dropped; profile XP is authenticated-only), so the original "forged payload on migrate" test no longer applies. Instead, verify that **no inbound body** can flip these fields: profile creation (`upsertProfile`, first authenticated join) and crediting (`POST /internal/v1/credit`) must ignore any client-supplied `is_citizen`/`citizenship_earned_at`, and the only route to citizenship is accumulated server-credited XP ≥ 1,000.

## Notes

- 🚨 **BLOCKED BY `0062` — verified 2026-08-23. Do not start until `0062` ships.**
  `PROFILE_INTERNAL_TOKEN` is never forwarded to production by `deploy.sh`, so
  `ProfileApiClient.isConfigured()` (`src/server/ProfileApiClient.ts:131-133`) is **false in prod** and
  `creditMatch()` (`:86-89`) returns early — it is invoked at `GameServer.ts:1281` via `creditMatchXp`
  (`:1189`). **No XP is credited in production, so this task's `xp >= 1000` threshold can never fire
  there**, however correctly it is implemented. The profile server independently fails **closed** on an
  empty token (`src/profile-server/InternalAuth.ts:26`), so both ends are shut.
  ⚠️ The specific trap: building and verifying this against a local environment where the token *is*
  set produces a feature that passes review and does nothing in production.
  See [`0062-forward-profile-internal-token-in-deploy`](../0062-forward-profile-internal-token-in-deploy/brief.md).
- **Flip-ON coupling (2026-08-21):** shipping this task must flip `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` to `true` in `src/client/flashist/FlashistFacade.ts` — the citizenship card is hidden behind this client flag (default OFF) until launch; see [`0054-hide-citizenship-card-behind-client-flag`](../../done/0054-hide-citizenship-card-behind-client-flag/brief.md).
- The earned path ships independently of Yandex Payments. Do not couple these tasks — earned citizenship can go live while the paid path is still awaiting catalog approval.
- 0 XP is the starting state for all players. There is no retroactive grant for players who already have play history before this system launches — they start accumulating from 0 when the feature ships.
- **`is_citizen` / `citizenship_earned_at` are server-derived only (2026-06-13).** This `creditMatchXp()` threshold check (`xp >= 1000`) is the sole authority for earned citizenship. These two fields must NEVER be read or persisted from any client-supplied body. *(Updated 2026-06-13: the guest→authenticated upload `POST /v1/profile/migrate` that originally carried this risk was **cancelled** with T2/T7 — Sprint 4 profile XP is authenticated-only, so there is no migration payload.)* The invariant still holds at every write path: `upsertProfile` (first authenticated join) and `creditMatchXp()` must ignore any inbound `is_citizen`/`citizenship_earned_at` and derive them from server-credited `xp`. Per the T1 schema-contract review (2026-06-13), the T1 Zod contract stays a pure never-throw validator; this trust enforcement lives on the **writer side** (T5/T6), not in T1.
