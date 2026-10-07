# 0332 — Join token, phase 2 (build): implementation plan

> Plan only. No source, tests, plan.md or worklog were written while making it. Citation frame: `dev` at
> `3cee150`. `git diff 5a70b6f HEAD -- src tests` is empty, so every `path:line` in the design report and
> ADR-124 still holds. Checked 2026-10-07.

## 0. Summary
- One slice, as the design's slice A (report §10 + §17; ADR-124 D1–D8). Players see no change. All four perks stay `allow`.
- **Profile server:** the resolve request takes an optional `sessionToken`. A pure vouch helper checks it. The reply carries `verified: boolean`, and a counter `geoconflict.profile.resolve.vouch{outcome}` records the result (8 values).
- **Game server:** two server-only `Client` fields. The funnel `getCreditableIdentity → { yandexId, verified }`. A token that arrives late gets its own resolve, chained after any resolve already running. Reconnect carries `verified` only for the same Yandex id. A counter `geoconflict.server.match.identity{state}` is counted at `start()` (4 values).
- **Client:** sends `profileSession` in the `join` when it already holds a token; otherwise sends it once in `update_identity` after login finishes, over an open socket only. Never for local games.
- **Log fixes and hardening:** `Worker.ts:457-460`, `GameServer.ts:350-360`, `GameServer.ts:461-467`, `Worker.ts:556-563`.
- **Not built** (architect's call, ADR-124 D5): `IdentityPolicy.ts` and per-use reads. No webpack proxy change, because no new `/api/*` route is added. No analytics event, no localization, no new env var.
- **One point needs an owner call:** when the game server drops a token that came back `verified:false` (§2.1, open question Q1). The plan assumes the recommended reading.

## 1. Scope
**In:** report §3 (entry points, late token, reconnect carry), §4 option A, §5 (all five conditions), §6 (the funnel only, no policy table), §8.1 (credential handling and log fixes), §9.4 (both counters), §14 (testing). Deploy order: profile first, then the game image.

**Out:** slice B and enforcement; `IdentityPolicy.ts`; `0397` text; `0323` mark; verify-live task (the producer files it at close); ADR edits (the architect's job); wiki; commits.

## 2. Decisions pinned for the build

### 2.1 How long the token is held (see Q1)
`Client.profileSession` is dropped (set to null) when a resolve that **carried that same token** comes back with a reply where `verified` is present, **true or false**.
- It is **kept** when the resolve failed (`resolvePlayer` returned null), so a later resolve can still vouch.
- It is **kept** when the reply has no `verified` (an old or rolled-back profile server).
- Why dropping on `false` loses nothing: every `false` outcome is permanent for that token. `invalid`, `expired`, `unverified_session` (vfy:false), `other_player` and `other_platform` can never turn into `verified` later.
- The drop happens only if `client.profileSession === carriedToken`, so a newer token that arrived meanwhile is never lost.
- The literal text of ADR-124 D3 says *"until the first successful vouch"*. This plan reads *successful vouch* as *a vouch the profile server answered*. If the owner wants the literal *verified:true only* reading, only one line changes (Q1).

### 2.2 What sets `verified`
- `client.identityVerified = true` only when the resolve carried a token **and** the reply says `verified === true`. It goes false → true only, per `Client` object.
- It is never cleared, so a later failed or tokenless resolve cannot flip it back.
- It is ignored for nothing: a vouch that lands after `start()` still sets it (ADR-124 D4). The start counter already ran, so it counted that player as `unverified`, by design.

### 2.3 Who may read the new fields (ADR-124 D3)
- `client.identityVerified` and `client.yandexPlayerId` are read only in `getCreditableIdentity`.
- `client.profileSession` is read only on the resolve path: `startProfileResolve`/`runProfileResolve` and the token intake `acceptProfileSession`.
- The reconnect carry reads `existing`'s identity through the funnel.
- Worker **writes** `client.profileSession` once, at construction. It never reads it.

### 2.4 Profile counter semantics
- One outcome is recorded per resolve that **succeeded** (after `resolveOrCreatePlayer`). That includes tokenless resolves (`absent`): old clients, lazy credit-time resolves, reconnects.
- So the profile counter is **per resolve, not per player**. The per-player number is the game-side start counter. The verify task must read it that way.
- The order of checks decides the label: `absent` → `no_secret` → `invalid`/`expired` → `unverified_session` → `other_platform` → `other_player` → `verified`.
- `other_platform` cannot happen today. `PlatformSchema` has only `yandex_games`, and the strict claim schema would reject any other value as `invalid`. It stays as a defensive check because it is in ADR-124's fixed list.
- If the vouch throws unexpectedly, the reply is `verified:false` and the counter records `invalid`, so the counter total still equals the number of resolves. A fixed log line is written, with no error text.

### 2.5 Game counter semantics
- Counted once per match, at `start()`, **only after** the roster passes `GameStartInfoSchema`, over the same `activeClients` that form the roster.
- The state is decided in this order:
  - `guest`: the funnel returns null, meaning no Yandex id. This includes an authorized player whose id has not arrived yet.
  - `unresolved`: there is an id, but `profilePlayerId === null`. The resolve has not answered, has failed, or the profile is not configured.
  - `verified`: `identity.verified`.
  - `unverified`: everything else.
- Late joiners after `start()` are not counted.

## 3. Step-by-step

### Step 1 — Shared contracts (`src/core`, must be tested)
1. `src/core/Schemas.ts`:
   - Add `const ProfileSessionFieldSchema = z.string().min(1).max(1024).optional().catch(undefined);`.
   - Add `profileSession: ProfileSessionFieldSchema` to `ClientJoinMessageSchema` (`:675-692`) and to `ClientUpdateIdentitySchema` (`:640-643`).
   - Comment: a credential, never logged or relayed, ADR-124. A malformed value is read as absent so it can never fail a join (report §5.1).
   - **`update_identity.yandexPlayerId` stays required.** An old game server would close the socket with 1002 on a message missing it.
2. `src/core/profile/CreditContract.ts`:
   - `PlayerResolveRequestSchema` gets `sessionToken: z.string().min(1).max(1024).optional().catch(undefined)`.
   - `PlayerResolveResponseSchema` gets `verified: z.boolean().optional().catch(undefined)`.
   - Doc comments cover the three states (absent = old server, read as unverified per ADR-124 D6) and why `.catch` is load-bearing (a 4xx is final at `ProfileApiClient.ts:269-273`).
3. Tests:
   - `tests/ClientJoinMessageSchema.test.ts` (extend). A join and an update_identity with a token parse and keep it. A token that is too long (1025), a number, `""` or null parses as `undefined` and the **message still parses**. A missing token is fine. An `update_identity` without `yandexPlayerId` still fails.
   - `tests/core/profile/CreditContract.test.ts` (extend). A request with or without a token parses. A malformed token is dropped and the rest is kept. A reply without `verified` gives `undefined`. `verified:"yes"` gives `undefined` and does not fail the reply. A new reply still parses under the old schema shape (stripped).

### Step 2 — Profile server (deploys first)
1. New `src/profile-server/SessionVouch.ts` (pure, no I/O, logs nothing):
   ```ts
   export type ResolveVouchOutcome = "verified" | "absent" | "invalid" | "expired"
     | "unverified_session" | "other_player" | "other_platform" | "no_secret";
   export function vouchForSession(
     secret: string,
     token: string | undefined,
     resolved: { playerId: string; platform: Platform },
     nowMs?: number,
   ): ResolveVouchOutcome;
   ```
   It runs the checks in the order of §2.4, using `isUsableSessionSecret` and `verifySessionToken` from `SessionToken.ts`. `vfy` is checked strictly as `=== true`, the same as `callerFromSession`.
2. `src/profile-server/Telemetry.ts`:
   - Re-export the outcome type (or import it from SessionVouch).
   - Add `resolveVouch(outcome)` to `ProfileMetrics` and to `noopProfileMetrics`.
   - Add a counter `geoconflict.profile.resolve.vouch`, attribute `outcome`, with a description. Same pattern as `loginVerifications`.
3. `src/profile-server/Routes.ts`, resolve route (`:844-873`). After `resolveOrCreatePlayer`:
   - Compute the vouch outcome inside its own `try/catch`, with the §2.4 fallback.
   - Call `metrics.resolveVouch(outcome)`.
   - Add `verified: outcome === "verified"` to the body.
   - Never log the token. Never pass it to the repository.
   - The secret comes from the existing `sessionSecret` (`Routes.ts:463`).
   - A malformed token is already `undefined` from the schema, so the response stays 200.
4. Tests:
   - New `tests/profile-server/SessionVouch.test.ts`, one case per outcome. Tokens are signed with `signSessionToken` and synthetic UUIDs. `expired` uses an old `nowMs`. `invalid` uses a tampered MAC and a wrong-secret token. `no_secret` uses `""`. `other_platform` uses a cast claim through a small internal seam, or is left out with a comment that it cannot happen today (builder's choice; record it in the worklog).
   - `tests/profile-server/Routes.test.ts`, resolve block (extend), using the existing `support/sessionToken` helpers:
     - A valid `vfy:true` token for the resolved player gives `verified:true`.
     - Another player's token, `vfy:false`, expired or tampered gives `verified:false`.
     - No token gives `verified:false`.
     - A malformed or over-long `sessionToken` still gives **200** with `playerId`/`isCitizen`.
     - A metrics spy records exactly one outcome per resolve.
     - On the 500 path, a capturing logger never contains the sentinel token.
   - A `Telemetry.test.ts` touch only if it lists the instruments.

### Step 3 — Game server
1. `src/server/Client.ts`: add `public profileSession: string | null = null;` and `public identityVerified = false;`. Each gets a ⛔ comment: server-only, never sent or logged, set and read only on the funnel/resolve path, ADR-124. Defaults keep the constructor unchanged.
2. `src/server/ProfileApiClient.ts`:
   - New signature `resolvePlayer(platformUserId, sessionToken?: string)`.
   - The body includes `sessionToken` **only when one is given**, so existing `toHaveBeenCalledWith(id)` assertions stay valid.
   - The pre-flight `safeParse` is unchanged. The body is never logged (true today).
3. `src/server/GameServer.ts`:
   - **Funnel** (`:1371-1384`): add `private getCreditableIdentity(client): { yandexId: string; verified: boolean } | null`. It is the only reader of `yandexPlayerId` and `identityVerified`. `getCreditableYandexId` becomes `getCreditableIdentity(client)?.yandexId ?? null`. Rewrite the stale doc comment (Payments-task wording) to point at ADR-103 and ADR-124.
   - **Resolve with token and chaining** (`:1418-1461`):
     - `profileResolves` becomes `WeakMap<Client, { promise: Promise<string|null>; token: string | null }>`.
     - `startProfileResolve(client)`: read the id. Then `token = client.identityVerified ? null : client.profileSession`.
     - If a resolve is in flight and (`token === null` or `inFlight.token === token`), share it.
     - Otherwise run a new resolve: right away, or **chained** after the one in flight with `inFlight.promise.then(...)` (ADR-124 D4).
     - The entry's `finally` deletes the map entry **only if it still points at itself**. Without that guard, the earlier promise's `finally` would delete the chained entry.
     - The run passes the captured token to `resolvePlayer(id, token ?? undefined)`. The existing then-handler is unchanged, plus the §2.1/§2.2 logic, applied only when a token was carried.
   - **Token intake:** `private acceptProfileSession(client, token: string | undefined): boolean`. It returns false (does nothing) when the token is undefined, when the client is already verified, or when the token equals the one held. Otherwise it stores the token and returns true.
   - **`update_identity`** (`:439-453`):
     ```
     idChanged = setYandexPlayerIdIfUnset(...)
     tokenChanged = acceptProfileSession(client, msg.profileSession)
     if (idChanged || tokenChanged) resolveProfileForClient(client)
     ```
     The existing info log and `retryParticipationAfterIdentityRefresh` stay gated on `idChanged`. An optional info line for a token received logs `clientID` only. A token sent with a *different* id leaves the id as it was, and the vouch answers `other_player`.
   - **Reconnect carry** (`:290-303`): compare through the funnel (`getCreditableIdentity` on both). Inside the same-id branch, if `existing` is verified, set `client.identityVerified = true` and `client.profileSession = null`. A different or missing id carries nothing. The `isCitizen` carry is left unconditional, as today (the Q3 = keep ruling means no change).
   - **Start counter:** add `public readonly matchIdentityCounts: Record<MatchIdentityState, number>`, all zero, and `private matchIdentityState(c)`, per §2.5. Fill it in `start()` right after `this.gameStartInfo = result.data`.
   - **Hardening:**
     - `:354-360`: send `{ type: "error", error }` and drop `message`. `ServerErrorSchema.message` is already optional, and the client only shows it when present.
     - `:461-467`: log `${errorName(error)}` instead of `${error}`.
4. `src/server/Logger.ts`: add `export function errorName(error: unknown): string`, returning `error.name` for an `Error` and `typeof error` otherwise. It is next to `formatError`.
5. `src/server/Worker.ts`:
   - After `new Client(...)` (`:530-542`), set `client.profileSession = clientMsg.profileSession ?? null;` before `gm.addClient`.
   - `:457-460`: log the type only. Pull the line out as an exported pure helper, e.g. `preJoinRejectLogLine(msg: ClientMessage): string` returning `` `Invalid message before join: ${msg.type}` ``, so it can be tested without binding a port.
   - `:556-563`: use `errorName(error)` in place of `${error}`. Keep the `ipAnonymize` and the 250-character cut.
6. `src/server/GameManager.ts`: add `_matchIdentityTotals`, added to on `Finished` next to the byte totals (`:148-152`, same comment about avoiding double counts). Add `matchIdentityTotals()`, which returns the stored totals plus the live games' counts.
7. `src/server/WorkerMetrics.ts`: add `meter.createObservableCounter("geoconflict.server.match.identity", { description })`. Its callback observes each of the 4 states with `{ ...getPromLabels(), state }`.
8. Tests:
   - New `tests/server/GameServerIdentityVouch.test.ts`, in the `GameServerProfileResolve.test.ts` style (mocked `resolvePlayer`, `MockWebSocket`, synthetic ids and tokens):
     1. A join with a token and a `verified:true` reply → `resolvePlayer(id, token)`, the client is verified and the token is dropped.
     2. A `verified:false` reply → unverified, token dropped.
     3. No `verified` in the reply (old profile server) → unverified, **token kept**.
     4. Resolve returns null → token kept, and a later lazy resolve (credit or lobby path) carries it.
     5. A late token via `update_identity` (id already known) → a second resolve carries it → verified.
     6. A late token with a **different** id → id unchanged, resolve uses the original id and the token, and the mocked reply is false → unverified.
     7. A tokenless resolve in flight when the token arrives → exactly one chained resolve with the token, run after the first one settles. No third resolve. After both settle, the map is empty (a new event starts a fresh resolve).
     8. Reconnect with the same id carries `verified` and drops the new token. A different id carries nothing.
     9. Verified never goes back to false after a later `verified:false` or failed resolve.
     10. A token sent after verification is ignored, with no extra resolve.
     11. A join with no token → `resolvePlayer` is called with the id only.
     12. Start counter: a roster with one guest, one unresolved, one verified and one unverified client gives counts 1/1/1/1. A roster that fails the schema → all zeros.
   - **No-leak test**, in the same file or a new `tests/server/ProfileSessionNoLeak.test.ts`. A sentinel token is sent through a join, a late `update_identity`, a message that fails parsing and carries the sentinel, and raw invalid JSON containing it. The test checks: no call to the capturing logger contains the sentinel; no `ws.send` payload contains it (the error echo included); `gameInfo()` JSON, `gameStartInfo` JSON and the archive record (`Archive` mocked so the record can be captured, as in `Archive.test.ts`) do not contain it.
   - `tests/server/ProfileApiClient.test.ts` (extend). The body carries `sessionToken` only when given. The `verified` value passes through. No warn line contains the token on 4xx, 5xx or transport failure.
   - `tests/server/Worker.test.ts` (extend). `preJoinRejectLogLine` on an `update_identity` with a sentinel token and Yandex id returns a line that contains neither. Add a source-level check that `Worker.ts` no longer contains `JSON.stringify(clientMsg`.
   - Unit-test `errorName` (a `SyntaxError` from `JSON.parse` of a string containing the sentinel gives `"SyntaxError"`).
   - GameManager test (extend `GameManagerCreate.test.ts` or new): totals survive a finished game being removed and are not counted twice.
   - Existing suites (`GameServerProfileResolve`, `GameServerReconnect`, `ApprovedNameInMatch`, `CitizenFlag`, `PrivateLobbyStartGate`, `GameServerParticipation`) must pass **unchanged**. That is the proof that nothing changes for players.

### Step 4 — Client
1. `src/client/ProfileSession.ts`: add `export function heldSessionTokenFor(yandexId: string): string | null`. It is synchronous, never starts a login, never logs, and returns `session.token` only when `session?.yandexId === yandexId`.
2. `src/client/Transport.ts`:
   - `joinGame`: when `!this.isLocal` and the id is not null, `profileSession = heldSessionTokenFor(id)`. Add it to the join only when it is not null. Record `this.joinCarriedProfileSession = profileSession !== null`.
   - New `private async maybeSendLateProfileSession(socket: WebSocket)`, started from `onopen` next to `maybeRefreshYandexIdentity()`, which is unchanged so the existing id refresh is never delayed by the login wait (up to about 70 s). Its steps:
     - Return if `isLocal` or the join already carried a token.
     - Get the id: `lobbyConfig.yandexPlayerId`, or the facade's id when authorized.
     - `await ensureSession()`, then `heldSessionTokenFor(id)`.
     - Send `{ type: "update_identity", yandexPlayerId: id, profileSession }` **only if** `this.socket === socket && socket.readyState === WebSocket.OPEN`. Checked immediately before the synchronous `sendMsg`, so it is never buffered ahead of a join and never sent on a replaced socket.
     - The catch writes a fixed warn line with no error text.
3. Tests:
   - `tests/client/ProfileSession.test.ts` (extend). `heldSessionTokenFor` gives null before login, the token after login for the same id, and null for another id. It makes no `fetch`.
   - New `tests/client/TransportProfileSession.test.ts`, following the mocks in `TransportParticipation.test.ts` plus `jest.mock` of `ProfileSession`:
     - The join carries the token when it is held.
     - No token when none is held, when it was minted for a different id, or in a local game.
     - A late token is sent once via `update_identity` after `ensureSession` resolves.
     - Nothing is sent if the socket is closed or replaced, or if the join carried a token.

### Step 5 — Docs (knowledge base only, never the wiki)
- `ai-agents/knowledge-base/uptrace-knowledge-base.md`: add a row for `geoconflict.server.match.identity` (Counter, label `state`). Add `geoconflict.profile.resolve.vouch` (Counter, label `outcome`) where the doc lists profile metrics; if it has no such section, add one short row next to the server table. Say that it counts per resolve.
- The worklog decision log is written by the build spawn, not by this plan.

### Step 6 — Verification
- Targeted suites first, then the full `npm test`. If a `supertest` flake shows, rule out `0197` first, then re-run and say so.
- `npm run lint`. Type check with `npx tsc --noEmit`, because jest/SWC does not check types.
- `npm run check:config-parity` should be unchanged: no new env var, and the game box still holds no session secret.
- Optional: a case in `tests/integration/GameServerProfileCredit.it.test.ts` (real profile server and Postgres, a real signed token). Run only if the `gc-0012-it-pg` container is up; otherwise report it as not run. Docker cannot be started headlessly.

## 4. Order of work
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6. Steps 2–4 depend only on Step 1. Each step's tests are written with it.

## 5. Edge cases and risks
- A **pre-join race** can drop a late `update_identity` while Worker is still awaiting token checks. This is ADR-124 residual 4, accepted. Fail-soft: the next reconnect's join carries the token. Not mitigated. The start counter will show it if it matters (ADR re-raise trigger 2).
- A **chained resolve wiped by the earlier promise's `finally`.** Prevented by the guarded delete; covered by test 7.
- **A 4xx from the profile server loses the player's XP, ★ and name.** Prevented by `.catch(undefined)` on the request schema; covered by the Routes 200 test.
- **A join closed because of a bad token.** Prevented by `.catch(undefined)` on both message schemas; covered by the schema tests.
- **Old game server with a new client:** the field is stripped, and `update_identity` with a known id does nothing. No new message type is added, so there is no close with 1002.
- **New game server with an old profile server:** `verified` is absent, so the player reads as unverified, the token is kept and nothing else changes. Dormant with every use `allow`.
- **Erased player, or a secret rotation:** the vouch answers `other_player` or `invalid`, which is unverified. Correct.
- **Memory:** at most one token of 1024 characters or less per `Client`. Dropped on an answered vouch (§2.1) and when the `Client` is garbage-collected.
- **Self-farming and forged ids stay open,** by owner ruling (ADR-124 residuals 2 and 6). This is closeout, not a defect.

## 6. Deploy (owner-run, weekend slot, commit only on the owner's ask)
1. Profile server: `build-deploy-profile.sh`. Check `/health` and `/ready`, then that `geoconflict.profile.resolve.vouch` appears with `absent` (no game deploy yet).
2. Game image: `build-deploy.sh`.
- Rollback: rolling back the game is always safe. Rolling the profile server back below this build makes everyone unverified, which is dormant today (ADR-124 D6). Never roll the profile server back below S2, as before.
- The `0395` gate is met. The post-`0391` numbers no longer gate this deploy (2026-10-07 ruling).
- At close, the producer files the verify task: read both counters after deploy, and confirm no token appears in the logs.

## 7. Files touched
**Source:** `src/core/Schemas.ts`, `src/core/profile/CreditContract.ts`, `src/profile-server/SessionVouch.ts` (new), `src/profile-server/Telemetry.ts`, `src/profile-server/Routes.ts`, `src/server/Client.ts`, `src/server/ProfileApiClient.ts`, `src/server/GameServer.ts`, `src/server/GameManager.ts`, `src/server/WorkerMetrics.ts`, `src/server/Worker.ts`, `src/server/Logger.ts`, `src/client/ProfileSession.ts`, `src/client/Transport.ts`.

**Tests:** `tests/ClientJoinMessageSchema.test.ts`, `tests/core/profile/CreditContract.test.ts`, `tests/profile-server/SessionVouch.test.ts` (new), `tests/profile-server/Routes.test.ts`, `tests/server/GameServerIdentityVouch.test.ts` (new), possibly `tests/server/ProfileSessionNoLeak.test.ts` (new), `tests/server/ProfileApiClient.test.ts`, `tests/server/Worker.test.ts`, a GameManager test, `tests/client/ProfileSession.test.ts`, `tests/client/TransportProfileSession.test.ts` (new).

**Docs:** `ai-agents/knowledge-base/uptrace-knowledge-base.md`.

**Not touched:** `webpack.config.js` (no `/api/*` route), `en.json`/`ru.json`, the analytics reference, `MatchQualification.ts`, every ADR, the wiki.
