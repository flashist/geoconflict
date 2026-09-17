# Plan — 0272 Profile identity S3: game server resolves `playerId` and credits by it (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-15, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session:
  **"Approve"** — built **right after S2 (0271) finishes**, on top of S2's tree.
- Design authority: ADR-113 (accepted), design report §2/§4/§9, ADR-103, ADR-101.
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-15):
  1. **Verification step 7 — "Automated test"** (option a): `GameServerProfileCredit.it.test.ts` (real
     profile-server app on a port, real Postgres, real `GameServer` + `ProfileApiClient`, mock sockets) is the
     gate. No manual browser match.
  2. **Self-report credit when resolve fails at both join and credit time — "Accept the loss"** (option a):
     same ADR-101 outage class; match-end roster credit still covers connected players; no latch release.
- Coordination (driver, from S2's approved plan D6): `PlatformSchema` lives in `src/core/profile/Platform.ts`,
  created by S2. §2's "import from S2's `LoginContract.ts`" / fallback wording is superseded: import from
  `Platform.ts`.
- Upsert route: removed now (brief says remove; keeping it buys nothing while the token must stay blank).

---

## Worker summary
- **Main design choice:** the resolved `playerId` shows up later than the join (it waits on a network call). But the credit decision is made synchronously. So each client gets one shared in-flight resolve. Any credit whose player has a known Yandex id but no `playerId` yet waits on that shared resolve, or starts a new one if the last one failed. Nobody resolves twice, and nothing blocks a join or a match end.
- **Deploy order:** safe either way while `PROFILE_INTERNAL_TOKEN` is blank. Both orders break XP if the token is filled in: the old game server hits a 404 on upsert and a 400 on credit, and the new game server does the same against the S1 box. Recommended: profile box first (ideally one box deploy carrying S2 and S3), then the game deploy.
- **Overlap with S2:** both touch the `Routes.ts` import block, `tests/profile-server/Routes.test.ts`, `tests/integration/Routes.it.test.ts` and one comment in `PlayerIdentityRepository.ts`. Build S3 on top of S2's finished tree, not in parallel.
- **Honest XP-loss statement:** if the profile server is down both at join and at credit time, that credit is lost. Same outage class as today (ADR-101). No new durable queue.

## 0. Grounding (read at planning time)
- Brief 0272; design report §2 (game-server path), §4, §9 row S3; ADR-113 (points 3 and 6); ADR-103; ADR-101; 0270 `review.md` (R3 carried here); 0271 brief (overlap); 0217 brief (token-blank risk, owner rules "I'll just remember").
- Current code:
  - `src/core/profile/CreditContract.ts`: still `yandexPlayerId` plus `ProfileUpsertRequestSchema`.
  - `src/core/profile/MatchQualification.ts`: dedupes by Yandex id, carries `persistentId`.
  - `src/server/ProfileApiClient.ts`: `upsertProfile`, `creditMatch`, and `backfillMissingProfiles` (upsert on `no_profile`).
  - `src/server/GameServer.ts`: join `:300`, `update_identity` `:405-418`, reconnect carry `:270`, `getCreditableYandexId` `:1260`, `upsertProfileForClient` `:1274`, `creditParticipation`, 0211 latch.
  - `src/server/Client.ts`
  - `src/profile-server/Routes.ts`: `/internal/v1/profile/upsert` `:317` already calls `resolveOrCreatePlayer(…, "game_server")`. `/internal/v1/credit` `:341` does a find-only lookup by Yandex id.
  - `PlayerIdentityRepository.ts`
  - `PlayerProfileRepository.creditMatchXp(gameId, playerId, xp)`: already keyed by playerId; a foreign-key violation returns `no_profile`.
  - `InternalAuth.ts`
  - The nginx `location /internal/` in `setup-profile.sh` is a prefix block, so the new route is covered with no box config change.
  - Client fields sent to players are picked one by one (`isCitizen: c.isCitizen` at `:525/:968/:1072`); no spread of `Client`.
- Line numbers are pre-S2; re-locate after S2 lands.

## 1. Scope
**In:**
- Credit wire contract moves to `playerId`.
- New `POST /internal/v1/players/resolve`; `/internal/v1/profile/upsert` removed.
- `/internal/v1/credit` credits by `(game_id, player_id)` directly.
- `ProfileApiClient.resolvePlayer`, and credit by `playerId`.
- `Client.profilePlayerId`.
- Join, `update_identity` and reconnect resolve.
- `selectMatchCredits` dedupes by `playerId`.
- If `playerId` is null at credit time: resolve, then credit.
- 0270 R3 stale comments (`CreditContract.ts:37,:55`, `ProfileApiClient.ts:32,:74`, `GameServer.ts:104,:1330`, `GameServerParticipation.test.ts:148`). The `setup-profile.sh:1013` "migrations are idempotent" message is listed on 0272's brief as an item; it trips the hardening harness if edited — change only if it keeps `npm test` green, otherwise record it as left.

**Must NOT do:**
- **S2:** no `/v1/login`, `SessionToken`, `resolveCaller` change, CORS change, or `PROFILE_SESSION_SECRET`.
- **S4:** no client code. The WS join and `update_identity` still carry the Yandex id (`Schemas.ts`, `Transport.ts` unchanged).
- **S5:** no metrics, no `PROFILE_LOGIN_CREATE_ENABLED`. `void source` stays.
- No migration. No change to env, secrets or the deploy harness beyond the item above.
- No change to the body of `getCreditableYandexId` (no verification).
- No change to ADR-101's retry budget, and no durable queue.
- Never set the token, move task files, or write the wiki.

## 2. Contracts — `src/core/profile/CreditContract.ts` (rewritten)
- `CreditItemSchema = { gameId: 1–128, playerId: InternalPlayerIdSchema, xpAwarded: int 1..10_000 }`.
- `CreditResultSchema = { gameId, playerId, status: credited|duplicate|no_profile|error }`.
  - Keep the wire value `no_profile`; the repository already returns it.
  - Reword it as "no `players` row for `playerId` (erased)". This fixes R3 at `:37`.
- New `PlayerResolveRequestSchema = { platform: PlatformSchema, platformUserId: string 1–128 }`.
- New `PlayerResolveResponseSchema = { playerId: InternalPlayerIdSchema, isCitizen: boolean }`.
- Delete `ProfileUpsertRequestSchema` and its comment (R3 `:55`). Rewrite the header: internal endpoints are `/credit` and `/players/resolve`.
- `InternalPlayerIdSchema`: it exists, not exported, in `InboxContract.ts:84` (UUID regex). Export it and reuse it, so there is one definition. No behaviour change for the inbox.
- `PlatformSchema` (`z.enum(["yandex_games"])`): import from `src/core/profile/Platform.ts` (created by S2; see Approval record).

## 3. Profile server — `src/profile-server/Routes.ts` (internal routes only)
- **Remove** the `/internal/v1/profile/upsert` handler and its import.
- **Add** `app.post("/internal/v1/players/resolve", internalAuth, …)`:
  - Bad body → 400 `bad_request`.
  - Otherwise call `repo.resolveOrCreatePlayer(platform, platformUserId, "game_server")`. This always creates, regardless of any future S5 switch.
  - 200 `{ playerId, isCitizen: resolved.profile.is_citizen }`, checked against the response type.
  - Repository throws → 500 `internal_error`; the log line has no ids.
  - A playerId in an internal response is allowed (ADR-113 point 3).
- **`/internal/v1/credit`:**
  - Parse the new schema. For each item call `repo.creditMatchXp(item.gameId, item.playerId, item.xpAwarded)` directly; no `findPlayerByIdentity`.
  - Keep per-item try/catch → `error`, and keep the log line id-free.
  - A legacy body shaped `yandexPlayerId` → 400.
- `ProfileRepo` interface unchanged (`findPlayerByIdentity` is still used by `resolveCaller`).
- `PlayerIdentityRepository.ts` header comment: "only the internal upsert route calls it in S1" → "`/internal/v1/players/resolve` (S3) and `/v1/login` (S2)". Comment only, and S2 touches the same line.

## 4. Pure logic — `src/core/profile/MatchQualification.ts`
- `MatchCredit = { gameId, playerId, xpAwarded }`. Drop `yandexPlayerId` and `persistentId`; this now matches the wire `CreditItem`.
- `ClientCreditState = { playerId: string | null; identityKnown: boolean; kicked; disconnected }`.
  - `identityKnown` is `getCreditableYandexId(client) !== null`, computed in GameServer. Core never sees the Yandex id.
- Pull the existing gates into one private predicate: roster → qualifies → state exists → not kicked or disconnected.
- `selectMatchCredits(...)`: gates, then `identityKnown && playerId !== null`, then **dedupe by `playerId`**. Return type unchanged.
- New `selectUnresolvedCreditClients(participation, stateById, roster): ClientID[]`:
  - Same gates, `identityKnown && playerId === null`, deduped by clientID.
- Header and JSDoc updated: key is `(game_id, player_id)`.

## 5. Game server
**`src/server/Client.ts`:**
- `public profilePlayerId: string | null = null`, with a doc comment:
  - internal id, server-only;
  - never sent to a client or logged;
  - only set from a resolve of this client's creditable identity.
- `isCitizen` comment: "upsert" → "resolve".

**`src/server/ProfileApiClient.ts`:**
- Remove `UPSERT_PATH`, `upsertProfile`, `backfillMissingProfiles` and `persistentId` handling.
- Add `resolvePlayer(platformUserId): Promise<{ playerId; isCitizen } | null>`. Fully fail-soft:
  - not configured → null (logged once);
  - fails the 1–128 check before sending → null, and a warn with the **length only**;
  - `postWithRetry(RESOLVE_PATH, {platform: "yandex_games", platformUserId})`;
  - null or invalid response → null;
  - try/catch → null.
  - Same 3 attempts, backoff and 10 s timeout as today (ADR-101).
- `creditMatch(credits: MatchCredit[])`:
  - check each item and drop invalid ones, logging no id;
  - post, then log counts;
  - `no_profile` becomes a warn; no backfill.
- Rewrite the header and method comments (R3 `:32`, `:74`).

**`src/server/GameServer.ts`:**
- `private profileResolves = new WeakMap<Client, Promise<string | null>>()`. Keyed by the Client *object*, so a reconnect's new object never picks up the old socket's in-flight result.
- `private resolveProfilePlayer(client): Promise<string | null>`:
  1. `id = getCreditableYandexId(client)`; if null → `Promise.resolve(null)`. This stays the only reader (ADR-103).
  2. If `client.profilePlayerId !== null` → return it.
  3. If a resolve is already in flight → return that promise.
  4. Otherwise start `profileApiClient.resolvePlayer(id)`. On result: set `client.profilePlayerId`, and set `isCitizen = true` only if true (never cleared). Remove the map entry once settled, so a failed resolve can be retried. `.catch(() => null)` as a second safety net.
- `private resolveProfileForClient(client): void` replaces `upsertProfileForClient`: `void this.resolveProfilePlayer(client)`. Called from:
  - the join path (`:300`);
  - the `update_identity` null→value branch (`:413`);
  - reconnect, which goes through the same `addClient` join call.
- **Reconnect carry-over**, next to `client.isCitizen = existing.isCitizen`: if `getCreditableYandexId(client) !== null` and it equals `getCreditableYandexId(existing)`, then `client.profilePlayerId = existing.profilePlayerId`.
  - Never carry across a different or null id; that would credit the wrong player.
  - The join resolve still runs once and refreshes `isCitizen`, as upsert does today.
- **`creditParticipation`:**
  1. Snapshot the gate state at trigger time, as today, plus `playerId` and `identityKnown`.
  2. `ready = selectMatchCredits(snapshot)`; if not empty → `void creditMatch(ready)` (synchronous, the common case).
  3. `unresolved = selectUnresolvedCreditClients(snapshot)`; if not empty → `void this.resolveThenCredit(unresolved, snapshot, postedPlayerIds)`:
     - `Promise.all` over `resolveProfilePlayer` for each client (shares any in-flight join resolve);
     - fill in the snapshot's playerIds;
     - run `selectMatchCredits` over just those clients;
     - drop playerIds already posted in step 2;
     - post once;
     - try/catch, never throws.
  4. Return `ready.length + unresolved.length` ("scheduled"), so the 0211 latch works as before. A null-identity report stays retryable (unchanged).
  - Gates use the trigger-time snapshot, not the state after the await. A client that disconnects during the resolve still gets the credit it qualified for when the report arrived.
- `retryParticipationAfterIdentityRefresh` needs no change. After `update_identity` it now shares the in-flight resolve instead of racing an upsert against a credit.
- R3 comments `:104` and `:1330` → `(game_id, player_id)`.
- **ADR-103 check (verification step 6):** `grep -rn yandexPlayerId src/server` still shows:
  - `Client.ts` (the field, its setter, the untrusted-field comment);
  - `Worker.ts:503` (constructor argument).
  - Those are the field's own write path, not readers. The only **reader** in `GameServer.ts` and `ProfileApiClient.ts` will be `getCreditableYandexId`. The reviewer should read step 6 that way.

## 6. Tests — RED first, then build, then mutations
**Core:**
- `tests/core/profile/CreditContract.test.ts`:
  - credit item needs a UUID `playerId`; a legacy `yandexPlayerId` item and a non-UUID are rejected;
  - resolve request: platform limited to `yandex_games`; length 0, 1, 128, 129;
  - resolve response: UUID and boolean.
- `tests/core/profile/MatchQualification.test.ts`:
  - two clientIDs with the same playerId → 1 credit;
  - null playerId is left out of credits and listed by `selectUnresolvedCreditClients`;
  - no identity → in neither list;
  - roster, kicked and disconnected gates apply to both lists.

**Game server:**
- `tests/server/ProfileApiClient.test.ts` (rewrite of the upsert and backfill cases):
  - `resolvePlayer` posts the right path and body with Bearer;
  - returns the parsed pair;
  - not configured → null and no fetch;
  - 4xx → null, no retry;
  - 5xx retried, then null;
  - invalid response → null;
  - 129-char id → null and no fetch;
  - never throws;
  - captured logs contain neither id.
  - `creditMatch` posts playerId items; drops a non-UUID item and keeps the rest; **no second call on `no_profile`**.
- New `tests/server/GameServerProfileResolve.test.ts` (mocked profile client, flush promises):
  - join → `resolvePlayer` called exactly once with the creditable id → `profilePlayerId` set;
  - guest → 0 calls;
  - `update_identity` null→value → 1 call; an id already known → 0 more;
  - reconnect → 1 call on the new socket; carry-over when ids match, no carry-over when they differ;
  - a `resolvePlayer` that never settles, or rejects → `addClient` returns synchronously, the client is active, the listener is attached, no unhandled rejection;
  - `isCitizen` is only ever turned on;
  - no `ws.send` payload contains the playerId.
- `tests/server/GameServerParticipation.test.ts`:
  - expected credit = `{gameId: GAME_ID literal, playerId, xpAwarded: 1}`;
  - report while the join resolve is in flight → no second resolve, credit sent after it settles;
  - join resolve failed (null) → credit path resolves again, then credits;
  - second resolve also fails → no `creditMatch` call, no throw (owner ruling 2: accepted loss);
  - two clients, same playerId, one resolved and one not → one credit total;
  - fix R3 comment `:148`.
- `CitizenFlag.test.ts`, `GameServerReconnect.test.ts`, `GameServerWinner.test.ts`: stub `upsertProfile` → `resolvePlayer`. CitizenFlag keeps its true-only assertions.

**Profile server:**
- `tests/profile-server/Routes.test.ts`:
  - resolve: 401 without token; 400 on bad platform, empty or 129-char id; 200 `{playerId, isCitizen}`, called with `"game_server"`; body has no profile fields and no platform id; 500 on throw, log without id;
  - **`/internal/v1/profile/upsert` → 404**;
  - credit calls `creditMatchXp` with playerId and never `findPlayerByIdentity`; legacy body → 400; per-item error isolation.

**Integration (`npm run test:integration`):**
- `tests/integration/Routes.it.test.ts`, upsert steps → resolve:
  - resolve twice → same playerId, 1 `players` row, 1 `player_identities` row;
  - parallel resolves → 1 player, no orphans;
  - credit `(game, player)` twice → `credited`, then `duplicate`;
  - random UUID → `no_profile`.
- **New `tests/integration/GameServerProfileCredit.it.test.ts`** (the verification step 7 gate, owner ruling 1):
  - real `createApp` with real repositories on the test DB, via `http.createServer(app).listen(0)`. **Not supertest**, to stay out of the known-flake family;
  - real `ProfileApiClient` pointed at it, with a test-only fake token in env for both sides;
  - real `GameServer` with mock sockets (the `jose` mock as in CitizenFlag);
  - flow: join a client with a Yandex id → poll until `profilePlayerId` is set → freeze roster → observe spawn → participation report;
  - assert 1 `players` row, 1 `player_identities` row, 1 `player_match_xp_credits` row keyed `(game_id, player_id)`, xp = 1;
  - close the server in `afterAll`.

**Mutations (run and record each; each must turn a test red):**
1. Dedupe by clientID instead of playerId.
2. Remove the in-flight sharing (join plus report = 2 resolves).
3. Carry `profilePlayerId` on reconnect without checking the id.
4. Credit path skips unresolved clients (no resolve-then-credit).
5. `isCitizen = result` (clears the flag).
6. Route passes `"login"`, or credit maps through `findPlayerByIdentity`.
7. Keep the upsert route.
8. `await` the resolve inside `addClient`.
9. Log the id in the `resolvePlayer` warn.
10. `selectMatchCredits` drops the `identityKnown` gate.

**Gates:**
- `npm test` (full, including shell harnesses, ~22–25 s);
- `npm run test:integration` (needs `TEST_DATABASE_URL` from `.env.test`, local `gc-0012-it-pg` container);
- `npx tsc --noEmit`, `npm run lint`.
- A supertest-family timeout is re-run and reported per CLAUDE.md, never retried silently.

## 7. Sequencing
1. Wait for S2 to land in the working tree. Take `PlatformSchema` from `src/core/profile/Platform.ts`.
2. Contracts plus core tests, RED → GREEN.
3. Profile-server routes plus route unit tests plus `Routes.it`.
4. `ProfileApiClient` plus tests.
5. `Client` / `GameServer` plus the resolve and participation tests.
6. Near-end-to-end integration suite.
7. Mutation run.
8. R3 comments; grep for ADR-103 and for leftover `upsert` / `persistentId` in `src/server` and `src/core/profile`.
9. Full gates.
10. Worklog decision log, including `none` if no unattended fix was made.

## 8. Deploy order (the owner runs both deploys)
- **Precondition, every deploy:** the game `.env.prod` `PROFILE_INTERNAL_TOKEN` is blank (owner ruling "I'll just remember"; no guard proposed).
- **Profile box:** a plain `build-deploy-profile.sh`. No migration, secret or `setup-profile.sh` change. Best combined with S2's box deploy (one owner deploy instead of two).
- **Game deploy:** after the box.
- **Why order doesn't matter now:** with a blank token every call is a no-op. With a filled-in token, **both** half-deployed states lose XP:
  - old game server + S3 box: upsert 404, credit 400;
  - S3 game server + S1 box: resolve 404, credit 400.
- **Suggestion for the producer to add to 0217 step 0:** a read-only existence probe on the box against the local port. `POST /internal/v1/players/resolve` with no token should return **401** (route exists), not **404**. No token needed.

## 9. Risks and residuals (stated honestly)
- **XP lost vs retried:**
  - Resolve fails at join → retried once at credit time, with the same 3-attempt budget.
  - It fails again → **that credit is lost** (owner-accepted, ruling 2).
  - On the match-end path, a player still connected is covered again by the whole-roster credit.
  - An eliminated player who left is not.
  - Same outage class as today's failed backfill upsert (ADR-101). No new durable queue.
- **Wait time:** resolve-then-credit can take up to about 3×10 s plus backoff. Fire-and-forget, so no match is blocked. A worker restart in that window drops it, as today.
- **`no_profile` after S3** happens only if a player is erased mid-match, for example by S5's planned cleanup query catching a real player created by a game-server resolve during an incident. Logged and dropped for that match; the next join recreates the player. **Note for S5's plan**, not an S3 change.
- **Id length:** ids of 129–256 chars pass the join check but are never resolved or credited. Same as today's drop; logged with length only.
- **Merge with S2:** `Routes.ts` imports, `Routes.test.ts`, `Routes.it.test.ts`, `PlayerIdentityRepository.ts` comment, and the `PlatformSchema` dependency. Low conflict volume if built in sequence.
- **Near-end-to-end ≠ live:** mock sockets and a local profile server. The live proof is still 0217.

## 10. Effort
~2 dev days, in line with design §9's 1.5–2 d; the new near-end-to-end suite is the extra. Plus review.
