# Worklog — 0272 Profile identity S3: game server resolves `playerId` and credits by it

Run: 2026-09-15, spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) as the **Build worker**, under
the approved `plan.md` (owner rulings 1 and 2), built on S2 (0271)'s finished, review-closed tree. No
deploy, no SSH, no box contact, no commit, no task-file move, no wiki write, no `git stash`/`reset`/index
change. 0275 Part A files and 0203/0260 leftovers not touched.

## Headline

- Built per plan §2–§5: credit wire keyed by `playerId`; `POST /internal/v1/players/resolve` added,
  `/internal/v1/profile/upsert` removed; `/internal/v1/credit` credits by `(game_id, player_id)` with no
  identity lookup; `ProfileApiClient.resolvePlayer`; `Client.profilePlayerId`; join / `update_identity` /
  reconnect resolve with one shared in-flight resolve per Client object; resolve-then-credit for a null
  `playerId`; `selectMatchCredits` dedupes by `playerId`; R3 stale comments; `setup-profile.sh` message.
- All gates green on the final tree: `npm test` 128 suites / 1546 tests; `npm run test:integration`
  9 suites / 103 tests (incl. the new `GameServerProfileCredit.it`); `tsc --noEmit` 0; `npm run lint` 0.
- All 10 planned mutations turned tests red (mutation 6 run as two variants, 6a + 6b).

## Pre-flight

- Plan blob re-hashed: `62382671059ce835a95e6a53b8f58c1f09146901`, 20929 bytes — matched the carried hash.
- Docker up; `gc-0012-it-pg` up; `.env.test` present (exported, value not recorded).
- Baseline on S2's tree before any edit: `tsc` 0; `npm test` 127 suites / 1508 tests green.

## Change surface

New:
- `tests/server/GameServerProfileResolve.test.ts`
- `tests/integration/GameServerProfileCredit.it.test.ts` (verification step 7 gate, owner ruling 1)

Modified (source):
- `src/core/profile/CreditContract.ts` — rewritten: `playerId` credit item/result, `PlayerResolveRequest/ResponseSchema`, upsert schema deleted; `PlatformSchema` from `Platform.ts`
- `src/core/profile/InboxContract.ts` — `InternalPlayerIdSchema` exported (no behaviour change)
- `src/core/profile/MatchQualification.ts` — `MatchCredit`/`ClientCreditState` reshaped, shared gate predicate, `selectUnresolvedCreditClients`
- `src/profile-server/Routes.ts` — resolve route, credit route by `playerId`, upsert route + import removed
- `src/profile-server/PlayerIdentityRepository.ts` — header comment only
- `src/server/ProfileApiClient.ts` — `resolvePlayer`, credit by `playerId`, `upsertProfile` / backfill / `toCreditItem` removed, `no_profile` warn
- `src/server/Client.ts` — `profilePlayerId`, `isCitizen` comment
- `src/server/GameServer.ts` — `profileResolves` WeakMap, `resolveProfileForClient` / `resolveProfilePlayer` / `startProfileResolve`, reconnect carry-over, `creditParticipation` + `resolveThenCredit`, R3 comments
- `setup-profile.sh` — migration-failure message + the matching comment sentence (no longer claims a re-run is safe)

Modified (tests):
- `tests/core/profile/{CreditContract,MatchQualification}.test.ts`
- `tests/server/{ProfileApiClient,GameServerParticipation,CitizenFlag,GameServerReconnect,GameServerWinner}.test.ts`
- `tests/profile-server/Routes.test.ts`, `tests/integration/Routes.it.test.ts`

## RED-first evidence

- Core (`CreditContract`, `MatchQualification` tests) before any source change: 17 failed / 93.
- `Routes.test.ts` before the route change: 15 failed / 27. ⚠️ In that RED run the upsert-404 test failed as
  a `5000 ms` timeout and the run then hung (`did not exit`) — the supertest-family shape; not re-run, the
  test was expected to fail there anyway. GREEN runs of the same file did not hang.
- `ProfileApiClient.test.ts` before the client change: 20 failed / 26.
- Game-server suites: the first RED pass was muddied (the Participation file had a syntax slip and did not
  compile), so a clean RED was taken after GREEN by swapping `GameServer.ts`, `Client.ts`,
  `ProfileApiClient.ts`, `MatchQualification.ts`, `CreditContract.ts` to their `HEAD` content (unmodified
  at run start), running, and restoring byte-identical (`cmp` checked): Participation + ProfileResolve +
  CitizenFlag 41 failed / 42.
- `GameServerProfileCredit.it` with the same five files at `HEAD`: 2 failed / 2 (0 `players` rows — the old
  client posts to the removed upsert route). Restored and `cmp`-checked.

## Mutations (each applied alone, run, restored byte-identical)

| # | Mutation | Result |
|---|---|---|
| 1 | dedupe by clientID instead of playerId | red — `selectMatchCredits › dedupes by playerId` |
| 2 | remove in-flight sharing | red — 3 Participation tests (in-flight report, update_identity+retry, gates-at-report-time) |
| 3 | carry `profilePlayerId` on reconnect without the id check | red — 2 reconnect tests (different id, no id) |
| 4 | credit path skips unresolved clients | red — 8 Participation tests |
| 5 | `isCitizen = result` | red — ProfileResolve true-only test + CitizenFlag later-failure test |
| 6a | resolve route passes `"login"` | red — `find-or-creates as game_server…` |
| 6b | credit maps through `findPlayerByIdentity` | red — `credits by playerId directly, never through an identity lookup` |
| 7 | keep the upsert route | red — `upsert is gone (404)` |
| 8 | `await` the resolve inside `addClient` | red — `a resolve that never settles leaves the join complete…` |
| 9 | log the id in the `resolvePlayer` warn | red — `over-long (129-char) id … logging its length only` |
| 10 | `selectMatchCredits` drops the `identityKnown` gate | red — `excludes a client whose identity is not creditable even if a playerId is present` |

No mutation run hung or timed out. Mutations ran before the last log-level edit (decision D3), which
touches none of the mutated lines.

## ADR-103 grep (verification step 6)

`grep -rn yandexPlayerId src/server`:
- `Client.ts` — the field, its setter `setYandexPlayerIdIfUnset`, the untrusted-field comment.
- `Worker.ts:502-503` — constructor argument + comment.
- `GameServer.ts:428` — `client.setYandexPlayerIdIfUnset(clientMsg.yandexPlayerId)`: the `update_identity`
  write path (reads the message, not the client field; pre-existing, unchanged).
- `GameServer.ts:1280` — `getCreditableYandexId`, the **only reader** of the client field.

`ProfileApiClient.ts` has no `yandexPlayerId`. No `upsert`, `backfill` or profile `persistentId` left in
`src/server` or `src/core/profile` (the remaining `persistentID` hits are the game's own client id).

## Residuals (honest)

- XP loss when resolve fails at join AND at credit time — owner ruling 2, same outage class as ADR-101.
- Near-end-to-end ≠ live: mock sockets, local profile server. Live proof is 0217.
- `NameChangeContract.ts` keeps its own private copy of the UUID `InternalPlayerIdSchema`; the plan unified
  only Inbox + Credit. Left as is (out of plan).
- Deploy order (plan §8) unchanged: harmless while `PROFILE_INTERNAL_TOKEN` is blank; both halves must be
  live before 0217 sets it.

## Decision log (unattended calls)

- **D1 — obvious winner (plan-internal inconsistency).** Plan §5 step 2 says `resolveProfilePlayer` returns a
  known `profilePlayerId` without a call, but §5 reconnect ("the join resolve still runs once and refreshes
  `isCitizen`") and §6 ("reconnect → 1 call on the new socket; carry-over when ids match") require a call on
  a reconnect that carried the id. Resolved by splitting: the join / `update_identity` trigger
  (`resolveProfileForClient` → `startProfileResolve`) always resolves unless one is in flight; the credit
  path (`resolveProfilePlayer`) returns the known id first. Qualifies: satisfies every explicit plan
  statement, no scope change. Findable at `GameServer.ts` `resolveProfileForClient` / `resolveProfilePlayer`.
- **D2 — obvious winner.** `setup-profile.sh`: besides the echo message, the comment sentence right above it
  made the same false claim ("Idempotent, so a re-run after a fix is safe") and was reworded too. Same item,
  same file; `npm test` (hardening harness) stayed green.
- **D3 — SUPERSEDED by review R1 (round 1, owner ruling "Warn with a count").** ~~My new "could not be resolved; credit dropped" line in `resolveThenCredit` was
  first `warn`; changed to `debug`. With the token blank (today's normal state) every resolve returns null,
  so a `warn` would fire on every credit trigger in production; on a real outage `ProfileApiClient` already
  warns. Not a plan line — a log level on a line this build added.~~ The reviewer showed `debug` hid the drop
  from ADR-101 trigger 2; the owner ruled for a configured-only `warn` with a count (see round 1 below).
- **D4 — obvious winner.** Beyond plan §6's list, added tests that pin plan-stated behaviour: the old-socket
  late resolve never lands on the new client; a leaver during the resolve still gets its credit (trigger-time
  gates); `update_identity` + retry share one resolve; the repeat report after a double failure starts no
  third resolve (ruling 2, "no latch release"); a second integration case (one account on two connections →
  one credit row, verification step 3). Tests only.
- No review fix was applied — this is a build, not a review round.

## Review round 1 — process-review (R1, R2)

Spawned by `/fkit-sprint-ship-loop` as the Process-review worker; `review.md` R1 + R2, owner rulings
relayed by the driver. Codex X2 was disproven by the reviewer and is not a ledger row.

- **R1 (CORRECT, defect) — applied per owner ruling.** `src/server/GameServer.ts` `resolveThenCredit`:
  configured-only `warn` "player resolve failed at credit time; N award(s) dropped (no durable retry —
  ADR-101)"; quiet when not configured. `src/server/ProfileApiClient.ts`: `isConfigured()` now public.
- **R2 (CORRECT, doc drift) — not edited here**, routed to the architect / next doc sync per owner ruling.
- RED-first: new "dropped-award warn (review R1)" cases in `tests/server/GameServerParticipation.test.ts`
  → 2 failed / 27 before the fix (configured warn; same-account counts once). The not-configured and
  success cases pass before and after by design (they guard the quiet branch). A sibling-exclusion case
  was added after, and only mutation R1-d proves it.
- Mutations (each alone, restored byte-identical): R1-a warn→debug → 2 red; R1-b drop the configured
  guard → 1 red; R1-c count clients not identities → 2 red; R1-d no sibling exclusion → 1 red.

### Decision log (round 1, unattended calls)

- **E1 — obvious winner (within the ruling's intent).** The ruling says "state the dropped award count".
  I count **distinct creditable identities** whose resolve failed, not failed clients, and take out any
  identity a sibling connection resolved in the same batch. Why: one account on two connections is one
  award (`selectMatchCredits` dedupes the same way), and a count of clients would inflate ADR-101's N.
  A wrong count shows up in tests R1-c and R1-d. Known leftover: a sibling credited in the *synchronous*
  batch is not excluded, so the count can be one too high in that rare case, never too low.
- **E2 — obvious winner (mechanical).** The warn has to know "configured vs not". `ProfileApiClient.isConfigured()`
  was private; I made it public (one word + doc comment + one unit test) rather than duplicating the
  env/URL check in `GameServer`. It sits inside the ruling's scope.
- **E3 — obvious winner.** When the client is not configured, the old `debug` line is **removed**, not kept
  (the ruling allowed "debug or nothing"). It carried no information: with the token blank, every resolve is null.
