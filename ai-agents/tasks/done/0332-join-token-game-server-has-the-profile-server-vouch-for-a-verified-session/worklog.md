# 0332 — worklog (phase 2, build)

## Build — 2026-10-07 (`fkit-coder`, Build worker spawned by `fkit-sprint-ship-loop`)

- **Plan built:** [`plan.md`](plan.md), blob `68ec270553e110c9d5c531bdcc7bbb33393969c1` (checked with
  `git hash-object` before starting). Owner approved it 2026-10-07 in the `fkit lead` session; Q1 ruled
  *"After any answer (Recommended)"*, so §2.1 stands as written.
- **Frame:** `dev` at `3cee150`. Nothing committed.
- **Not touched, as instructed:** ADRs (`fkit-architect` was editing ADR-124 in parallel — that file
  shows as modified in `git status`, and the edit is not from this build), the wiki, `brief.md`, sprint
  boards, `plan.md`.

### What was built (by plan step)

1. **Shared contracts:** `profileSession` on `join` and `update_identity` (`.catch(undefined)`, max 1024
   chars; `update_identity.yandexPlayerId` still required). `sessionToken` on the resolve request and
   `verified` on the reply, both `.catch(undefined)`.
2. **Profile server:** new pure `SessionVouch.ts` (`vouchForSession`, 8 outcomes in the §2.4 order).
   Resolve route vouches after `resolveOrCreatePlayer`, inside its own try/catch (if it throws, the
   answer is `invalid` plus a fixed warn line), counts `geoconflict.profile.resolve.vouch`, and answers
   `verified`.
3. **Game server:** `Client.profileSession` / `Client.identityVerified`; the funnel
   `getCreditableIdentity` (`getCreditableYandexId` now wraps it); resolve carries the token, with
   chaining and a guarded delete; `applyVouchResult` (drop on any answer, keep on null or absent,
   false → true only); `acceptProfileSession`; `update_identity` handles id and token; reconnect carries
   `verified` for the same id only; start counter + `GameManager.matchIdentityTotals()` + observable
   counter `geoconflict.server.match.identity`. Hardening: no raw-message echo on parse failure;
   `errorName` at `GameServer` catch and `Worker` catch; `preJoinRejectLogLine` (type only).
4. **Client:** `heldSessionTokenFor`; join carries a held token; `maybeSendLateProfileSession` sends
   once, after `ensureSession`, only on the same socket while it is open; never for local games.
5. **Docs:** `ai-agents/knowledge-base/uptrace-knowledge-base.md` — both counters, the per-resolve
   caveat, a changelog row.

### Decision log — calls made without asking, and points the plan left open

Each entry says what it answers, what changed, and why it qualified.

1. **`other_platform` test (plan left this to the builder).** I reached the branch by casting the
   *resolved* platform to a value outside the enum (`"other_platform" as Platform`). I did not cast a
   claim through an internal seam, and did not leave the case out. *Why:* this pins the check and its
   place before `other_player` without adding any test seam to the source. Builder's choice, inside the
   plan.
2. **Existing `Routes.test.ts` resolve assertions updated.** Three `toEqual` bodies gained
   `verified: false`, and one test title gained `verified`. *Why:* this follows mechanically from plan
   Step 2.3 (the reply now carries `verified`). Verified-correct, localized, in-plan.
3. **`resolveVouch: () => {}` added to three typed `ProfileMetrics` fakes** (`InternalPathCase`,
   `RouteMetrics`, `AlertRoutes` tests). *Why:* plan Step 2.2 adds a member to the interface. Without
   this, `tsc` fails, and a resolve through those fakes would throw at runtime. Mechanical, in-plan.
4. **`TransportParticipation.test.ts` now mocks `ProfileSession`** (no assertion changed). *Why:* plan
   Step 4.2 makes `Transport` import `ProfileSession`. Loading that module reads facade constants this
   suite's facade mock does not have, so the suite failed to load. This is the same mock the plan
   prescribes for the new Transport test. Mechanical.
5. **`Telemetry.test.ts` touched:** an allowlist entry, one test for the 8 values, and a `noop` call.
   *Why:* the plan says to touch it "only if it lists the instruments" — it does
   (`ALLOWED_ATTRIBUTE_KEYS`).
6. **`verified` read through the funnel, never as `client.identityVerified`, inside
   `startProfileResolve` and `acceptProfileSession`.** Plan Step 3.3's text wrote
   `token = client.identityVerified ? null : …`. *Why:* plan §2.3 says `identityVerified` is read
   **only** in `getCreditableIdentity`, and the two texts conflict. The funnel form satisfies both and
   behaves the same (verified implies an id). Obvious winner within the plan's intent.
7. **Where the new types live (plan named no home).** `MatchIdentityState`, `MATCH_IDENTITY_STATES` and
   `emptyMatchIdentityCounts()` are exported from `GameServer.ts`, and `GameManager` / `WorkerMetrics`
   import them.
8. **Chained resolve uses `inFlight.promise.then(run, run)`.** The chained run starts however the first
   settles. The earlier promise already ends in `.catch(() => null)`, so the rejection branch is
   defensive only.
9. **Optional info line included:** `"client profile session received post-join"`, carrying
   `{ clientID }` only. The plan marked this line optional.
10. **Tests added beyond the plan's list (additive only):** 7b (a newer token survives an older
    token's answer); a guest's token is held until the late id arrives; a resolve still in flight at
    `start()` counts as `unresolved`; late joiners and a second `start()` are not counted; the
    `no_secret` route case; the token never reaches the repository; `heldSessionTokenFor` after a failed
    login; a late send using the facade's id; the 1024-character boundary.
11. **No-leak raw-JSON sentinel shortened to `QZ0332RAW`.** V8's JSON error quotes at most about 10
    characters around the failure, so with a long sentinel the test passed even with the `${error}`
    leak put back. Each mutation check below now fails as it should.
12. **Which test files (plan allowed several choices).** `errorName` unit tests are in
    `ProfileSessionNoLeak.test.ts`. The GameManager test is a new file,
    `GameManagerMatchIdentity.test.ts`.
13. **Old Prettier drift left alone.** `GameManager.ts` and `WorkerMetrics.ts` already failed
    `prettier --check` at `HEAD`. Only my added lines follow Prettier; reformatting the rest would be an
    unrelated diff.
14. **`replacer` import dropped from `Worker.ts`.** Its only use was the replaced log line.

No review fix applied — this is the build, not a review round.

### Mutation checks (each test was shown to fail when the code it guards was broken)

- Guarded delete removed (`if (true)`) → test 7 fails.
- Parse-error echo of `message` restored → the no-leak test fails.
- `${error}` restored in the `GameServer` catch → the no-leak test fails (after change 11 above).

### Verification — 2026-10-07

| Check | Result |
|---|---|
| Targeted suites (24, incl. the six that must pass unchanged) | **563 / 563 passed** |
| `npm test`, run 1 | **2 failed / 4099 passed** (207 suites) — both in `supertest` suites, see below |
| `npm test`, run 2 (**re-run**) | **4101 / 4101 passed**, 207 suites, 42 s, shell harnesses included |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npm run check:config-parity` | `REQUIRED 0` on all three pipelines. The diff adds no `process.env` read (grep of the `src` diff: 0) |
| Integration case (`GameServerProfileCredit.it.test.ts`) | **not run** — `gc-0012-it-pg` is not running (`docker ps` lists no containers) |

**Run 1 failures, under the `supertest` flake rule (CLAUDE.md):**
- `LoginRoutes.test.ts` › *"the INTERNAL game-server resolve still creates"* → `aborted` (no
  response).
- `InboxRoutes.test.ts` › *"GET /v1/messages › 401 session_invalid without a token"* → `404`.
- `0197` ruled out: no `SIGSEGV` in the log, and no `node-*.ips` newer than 2026-10-06.
- After that, a two-suite re-run hung once (killed, never finished), and another reported 1 failure; the
  output does not say which test or shape.
- Re-runs then: 6 × each suite alone and 8 × the two together — **all green**. Full `npm test` re-run:
  green.
- Read as the known flake family (`aborted` ≈ the no-response shape; `404` is listed in CLAUDE.md as
  "seen historically, mechanism unknown"). **Likely, not proven.** The first fails a test that does go
  through the changed resolve route. But a broken route would answer, not abort; and the vouch code is
  synchronous, inside its own try/catch, and green in every isolated run. The 404 is on a route this
  build does not touch.

## Process review, round 1 — 2026-10-07 (`fkit-coder`, Process-review worker spawned by `fkit-sprint-ship-loop`)

- **Input:** `review.md` findings R1–R3 (round 1). Owner rulings relayed by the lead, 2026-10-07: R1 fix in
  this build; R2 no code change, moved to the Sprint 8 restart-after-~24 h popup task; R3 apply.
- **Loop check:** no ledger residuals yet; ADR-124's residuals and re-raise list checked — none covers
  R1–R3 (R2 is not residual 4, the pre-join race). All three are novel.
- **Ledger:** *Coder response* rows written for R1–R3; one *Accepted residuals* entry (R2); header
  `Status: closed-out`. *Reviewer findings* and `Coverage:` untouched.

### Decision log — fixes applied without per-fix owner approval

Each entry: which finding, what changed, why it qualified.

1. **R1 — late-token limit.** `GameServer.acceptProfileSession` now takes at most
   `MAX_LATE_PROFILE_SESSIONS_PER_CLIENT` (= 2) new tokens per `Client` object (a `WeakMap`, like
   `profileResolves`, so a reconnect starts at zero). Past it: ignored, one warn line naming `clientID`
   only. *Why it qualified:* the owner ruled R1 in scope ("Limit how many passes one player can send"),
   and the finding is verified `CORRECT`. **The number 2 was my call, treated as an obvious winner:** a
   real client sends at most ONE late token per socket (`Transport.maybeSendLateProfileSession` runs once
   per socket and is skipped when the join carried a token), so any value of 1 or more never touches a
   real player; 2 leaves one spare. If the owner wants a different number, it is one constant.
2. **R1 — no queue pile-up.** `startProfileResolve` entries gained a `started` flag (new
   `ProfileResolveEntry` type). A token that arrives while a resolve is *queued* (not yet started) shares
   that queued resolve, and the queued resolve reads `client.profileSession` — the newest token — when
   it starts, instead of the token captured at queue time. So at most one resolve waits. The guarded
   delete now compares the entry object instead of its promise (same meaning). *Why it qualified:* this
   is the owner's chosen option text verbatim ("Waiting checks use only the newest pass, so the queue
   can't pile up"); localized to one method; existing tests 1–11 and 7b pass unchanged. A queued resolve
   still carries a token even if the client was verified meanwhile — the same as before this fix (test 9
   pins it), so I did not change that.
3. **R3 — test for the join's token reaching the `Client`.** Moved the `new Client(...)` call and the
   `client.profileSession = clientMsg.profileSession ?? null` line out of the socket handler into an
   exported `clientFromJoin` in `src/server/Worker.ts`; the handler calls it. Same arguments, same order,
   no behaviour change. 3 tests in `tests/server/Worker.test.ts`. *Why it qualified:* verified `CORRECT`
   (a missing test for planned behaviour), mechanical, in plan (plan Step 3.5 places this write in
   Worker); the lead said to apply it under the standing approval. Extracting was the smallest way to
   test the real line without binding a port; a source-grep alone would not catch a broken value.
4. **R2 — no code change** (owner ruling). Recorded as an accepted residual whose exit is the Sprint 8
   restart-popup task, `0404` (its folder appeared in the backlog during this run). Ledger status `won't fix (frontier)` is the nearest value the method allows; the
   row says it is an owner scope move, not an intended tradeoff.
5. **`tests/server/GameServerIdentityVouch.test.ts` reformatted with Prettier** after my edit (the file
   is new in this build). `makeServer` gained an optional `log` argument so the warn line can be checked.

### Mutation checks

- Queue collapse removed (`!inFlight.started` dropped) → 2 R1 tests red.
- Limit removed → the limit test red.
- Queued resolve uses the captured token again → the newest-token test red.
- `clientFromJoin` sets `profileSession = null` → the R3 test red.
- Each source file restored byte-for-byte afterwards (checked with `diff`).

### Verification — 2026-10-07

| Check | Result |
|---|---|
| `GameServerIdentityVouch` + `Worker` suites | 37 / 37 passed |
| Targeted dirs (`tests/server`, `tests/profile-server`, `tests/client`, `tests/core/profile`, schema test) | 140 suites, **3236 / 3236 passed** |
| `npm test` (one run, no re-run needed) | 207 suites, **4108 / 4108 passed**, 42.7 s, shell harnesses included |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit` | exit 0 |
| Prettier on touched files | clean |
| Integration suite | not run — not touched by these fixes, and `gc-0012-it-pg` was not up at build time (not re-checked) |

## Process review, round 2 — 2026-10-07 (`fkit-coder`, Process-review worker spawned by `fkit-sprint-ship-loop`)

One novel finding, R4 (doc drift: ADR-124 § Decision 4 did not record the R1 cap or queue sharing).

### Decision log — fixes applied without per-fix owner approval

- **none applied by me.** R4 was settled by owner ruling (2026-10-07, *"Add ADR note (Recommended)"*) and
  the ADR note was written by an `fkit-architect` spawn. I verified it: ADR-124 § Decision 4 has the dated
  *"Clarification, 2026-10-07 — owner follow-up ruling"* block, and § *Re-raise only if* has the dated
  mid-socket-token bullet; both match `GameServer.ts` (`MAX_LATE_PROFILE_SESSIONS_PER_CLIENT`, the
  `!inFlight.started` share, the newest-token read in `runQueued`) and `Transport.ts`
  (`joinCarriedProfileSession`). R4 row: `CORRECT` / doc-drift defect, low / `✅ done`. No obvious-winner
  calls. Ledger header set to `Status: closed-out` — R1 and R3 done, R2 accepted residual (owner ruling,
  task `0404`), R4 done; nothing blocking.

### Verification

- No source or test file changed this round, so no test run. Round-1 results above stand
  (`npm test` 4108 / 4108, lint and `tsc` exit 0).
