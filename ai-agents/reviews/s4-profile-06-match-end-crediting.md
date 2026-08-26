# Review ledger — s4-profile-06-match-end-crediting

Task: ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md
PR: #128 (branch `s4-profile-06-match-end-crediting` → `dev`)
File(s) under review: src/server/GameServer.ts, src/server/ProfileApiClient.ts,
src/server/Client.ts, src/server/GameManager.ts, src/server/Worker.ts,
src/core/profile/MatchQualification.ts, src/core/Schemas.ts,
src/client/Transport.ts, src/client/graphics/layers/WinModal.ts, tests/*
Status: VERIFIED / closed-out — Round-7 exhaustive re-review (2026-06-29) found NO new defects; finding-driven review loop stopped. All findings resolved; C1/A3/A5/[P1-bound] residuals recorded. Live verification PASSED 2026-06-29 (see Live verification section). Ready to merge.
Reviewers: Codex (adversarial) + Claude (code-reviewer agent) — both ran, full coverage.

## Accepted residuals (do-not-re-litigate)

- **Raw Yandex id is creditable (the identity-trust seam) [C1]** —
  What: `GameServer.getCreditableYandexId()` returns the client-asserted
  `client.yandexPlayerId` as-is; the upsert / credit / `(game_id, yandex_player_id)`
  idempotency key all key off it. A modified client can forge an id at join and farm
  or misattribute *earned* XP.
  Why (structural): server-side `getPlayer({ signed: true })` verification is blocked
  until the Yandex secret key is issued (owned by the Payments task, after IAP is
  enabled). The seam is funnelled through ONE function so verification drops in later
  with no downstream change. Accepted at the epic level for *earned XP only* — paid
  entitlements are verified separately by the Payments task. Decision confirmed by the
  owner 2026-06-28; it overrides the per-task brief's "do not credit off raw id" gate
  (brief lines 53-57) for this slice. The brief's option (b) — key to `persistentID` —
  was considered and rejected because the profile store is Yandex-id-keyed and would
  need a second migration.
  Re-raise only if: the Yandex secret key is issued (signed-payload verification
  becomes possible) and `getCreditableYandexId()` still returns the unverified id; OR
  the exposure widens beyond earned XP to paid entitlements.

- **One-shot `update_identity` instead of match-end re-resolution [A3]** —
  What: a client that joined before its Yandex SDK resolved pushes its id once via
  `update_identity` (`Transport.maybeRefreshYandexIdentity`); there is a theoretical
  window where that message arrives after the winner is processed, denying XP.
  Why (structural): games last minutes and the SDK resolves in seconds, so the window
  is negligible; full server-side match-end re-resolution (the brief's ideal) costs a
  signed-verification round-trip that is itself blocked on the Yandex key (see C1).
  Re-raise only if: telemetry shows authorized users losing XP at match end, OR
  signed match-end verification lands (do it there instead).

- **No durable retry queue; undifferentiated backfill log [A5]** —
  What: `ProfileApiClient` has no durable queue; a hard outage past the retry budget
  drops that match's credit, and a second-round `no_profile` after backfill is logged
  by count (`logOutcomes`) but not labelled "backfill also failed".
  Why (structural): documented fail-soft tradeoff — a queue is out of scope for this
  slice; the profile server's idempotency key makes a later manual replay safe.
  Re-raise only if: credit-loss rate under partial outage proves material in prod.

- **Entry id cap (256) intentionally exceeds the store cap (128) [P1-bound]** —
  What: `ClientJoinMessage` / `ClientUpdateIdentitySchema` accept yandexPlayerId up to
  256 chars, while the profile store bound is 128 (CreditItemSchema, ProfileUpsert,
  ProfileQuerySchema all 128). The drift is deliberate, not a defect to "align".
  Why (structural): the 256 entry cap is documented (Schemas.ts join-field comment) as a
  *generous* cap so a long-but-valid authorized id is never rejected at the WS boundary
  (rejection there disconnects the user from the game — worse than losing one match's XP).
  Tightening entry to 128 is a REGRESSION (rejects legit users); raising the store to 256
  contradicts the consistent 128 design (credit+upsert+read) and pulls in T5. The
  batch-poisoning *harm* from the drift is fixed structurally by P1's item-isolation in
  `ProfileApiClient` — an over-128 id is dropped (it could never be stored/read anyway)
  without failing co-players' credits.
  Re-raise only if: real Yandex ids are confirmed to exceed 128 (then raise the store
  bound — credit+upsert+read together — not the entry cap); OR item-isolation is removed.

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | **C1** Raw client Yandex id is creditable (GameServer.ts:1186-1188) — Codex high | CORRECT; both reviewers right about different properties (`setYandexPlayerIdIfUnset` blocks reassignment, not first-set forgery) | **Accepted residual** (owner decision 2026-06-28) — epic-level "raw-id-now, sign-later" stands; recorded above with re-raise condition. Not blocking. |
| 1 | **C2** Tab-close leavers creditable for ≤60s (GameServer.ts:391-399) — Codex high | CORRECT → **medium** (downgraded: bounded 60s window, 10 XP, not farmable/security) | **Open/actionable** — mark client disconnected on WS `close` (or require live connection at match end). |
| 1 | **C3** `fetch()` has no per-attempt timeout (ProfileApiClient.ts:188-195) — Codex medium | PARTIALLY CORRECT → **low/med** (undici caps ~300s/attempt; callers are `void` fire-and-forget so the match is NOT blocked — "pending forever / violates fail-soft" overstated) | **Open/actionable** — add `AbortSignal.timeout()` per attempt + a never-resolving-fetch test. |
| 1 | **A1** Silent early-return, no log when `playerParticipation` absent (GameServer.ts:1213-1216) — Claude med/low | CORRECT → **low** (single-deploy bundling makes version skew unlikely; rolling-deploy skew possible) | **Open/actionable** — add a warn-level log before the return. |
| 1 | **A2** `disabledLogged` shared flag suppresses `creditMatch` "not configured" log (ProfileApiClient.ts:116-122) — Claude low | CORRECT → **very low** (debug-level, unconfigured-deploy only) | **Open/actionable** — log `creditMatch` misses separately (per-op / per-game). |
| 1 | **A3** `update_identity` → credit ordering race (Transport.ts:407-422) — Claude low | CORRECT → **very low** | **Accepted residual** (recorded above). |
| 1 | **A4** `WinModal.buildPlayerParticipation` untested with real player data (WinModal.ts:464-494) — Claude low | CORRECT | **Open (low)** — client-side, testing not mandatory; a 3-scenario unit test (never-spawned / alive / killed) would close the gap. Not selected for this round's fix set. |
| 1 | **A5** Second-round `no_profile` after backfill not differentiated in logs (ProfileApiClient.ts:151-173) — Claude low | PARTIALLY CORRECT → **very low** (counts ARE logged, just not labelled) | **Accepted residual** (recorded above). |
| 1 | Schema uses `clientID` not brief's `persistentId` in `playerParticipation` (Schemas.ts:522-529) | CORRECT — justified divergence (clients don't know remote players' PII `persistentID`) | No action — not a defect. |
| 2 | **C2** applied — live-connection gate | CORRECT, low | **Resolved** — `creditMatchXp` now treats `disconnected` as `isClientDisconnected(clientID) \|\| !activeClientIDs.has(clientID)`. Chose the surgical "require live connection at match end" variant over the ledger's mark-on-`close` option, which would change broadcast disconnect timing (gameplay UX) and hit a reconnect race (old socket's `close` keyed by clientID). **⚠️ Round-3 correction (2026-06-28): this rationale is WRONG — the chosen variant does NOT escape the reconnect race. `!activeClientIDs.has(clientID)` depends on the very same clientID-keyed `close` handler, so it inherits the race rather than avoiding it. See N2 (Round 3).** |
| 2 | **C3** applied — per-attempt timeout | CORRECT, low | **Resolved** — `postWithRetry` passes `signal: AbortSignal.timeout(10s)`; abort is retried like any transport failure. Test asserts a `signal` is wired. |
| 2 | **A1** applied — observability | CORRECT, very low | **Resolved** — `creditMatchXp` warns when `playerParticipation === undefined`; `length === 0` stays silent (benign all-AI / no-human case). |
| 2 | **A2** applied — observability | CORRECT, very low | **Resolved** — `disabledLogged` boolean → per-op `disabledLoggedOps` Set, so `creditMatch`'s not-configured log isn't suppressed by `upsertProfile`'s. |
| 2 | **A4** applied — client test | CORRECT, low | **Resolved** — added `WinModal.buildPlayerParticipation` unit test (human-only filter, alive/killed/never-spawned, killedAt from stats). |
| 3 | **N1** No roster gating — `creditMatchXp` credits off `allClients`, not the frozen `gameStartInfo.players` roster (GameServer.ts:1233; MatchQualification.ts:68-92) — Codex high | CORRECT → **medium** (downgraded: real and ORTHOGONAL to C1, but each credit still needs a distinct connected client with a forgeable id + dedup-by-id, so marginal gain over accepted C1 is incremental) | **Open/actionable** (owner decision 2026-06-28). Explicitly NOT folded into C1 — roster gating is independent of identity verification and survives the eventual signing fix. Fix: intersect credit candidates with the start roster + regression test. |
| 3 | **N2** Reconnect race — stale old-socket `close` removes the new live client by clientID, so the C2 gate denies a legitimately reconnected player their XP (GameServer.ts:396-398 pre-existing; :1231/1238-1240 new) — Codex medium | CORRECT → **medium** (frequency caveat: only when the old close lands after the reconnect — half-open TCP / mobile NAT rebind) | **Open/actionable** (owner decision 2026-06-28). Newly *exposed* latent bug: the close handler is pre-existing (unchanged in this PR), but the new credit gate couples eligibility to it. Fix: instance-based removal (`c !== client`) — also hardens the pre-existing broadcast path. **Corrects the Round-2 C2 rationale above.** |
| 3 | **N3** Participation sourced from the FIRST voter, not the deciding voter — `winnerVotes` stores the first `clientMsg` and never updates it (GameServer.ts:1142, :1172) — Claude low | CORRECT → **low** (rolling-deploy window only; single-bundle deploys make skew rare; A1 now logs it) | **Open/actionable** (owner decision 2026-06-28). Distinct from A1 (A1 = logging; N3 = the sourcing). Fix: upgrade the stored winner message when a later agreeing voter carries non-undefined `playerParticipation`. |
| 3 | **N4** 5xx/4xx response bodies not drained before retry (ProfileApiClient.ts:~199-212) — Claude suggestion | PARTIALLY CORRECT → **informational** (no leak at the confirmed Node 24 runtime — undici auto-drains on GC; would matter only on older runtimes) | **Open/actionable** (owner decision 2026-06-28) — recorded actionable as runtime-independent defensive hardening (`await response.body?.cancel()` before continuing/returning). Not a defect at the deployed runtime. |
| 4 | **N2** applied — instance-based close | CORRECT, medium | **Resolved** — close handler now `c !== client` (was clientID-keyed). Fixes the XP-denial my Round-2 C2 gate introduced for honest reconnecting players AND hardens the pre-existing broadcast path. Regression test added (`tests/server/GameServerReconnect.test.ts`: stale old-socket close after reconnect → live client survives). |
| 4 | **N1** applied — roster gating | CORRECT, low-med | **Resolved** — `selectMatchCredits` takes `eligibleRoster: ReadonlySet<ClientID>`; `creditMatchXp` builds it from `gameStartInfo.players` (guards `undefined`). A connected non-roster joiner named in participation is no longer creditable. Unit test added (non-roster qualifying player → no credit). |
| 4 | **N3** applied — voter sourcing | CORRECT, low | **Resolved** — `handleWinner` upgrades `potentialWinner.winner` to a later agreeing voter that carries `playerParticipation` when the stored (first) voter lacked it. No bespoke consensus-driven test (disproportionate for a 4-line guard); covered by inspection + the participation schema/A1 tests. |
| 4 | **N4** applied — drain body | informational | **Resolved** — `postWithRetry` drains the unread body (`response.body?.cancel()`, best-effort) on non-2xx before retry/return. Defensive only; not a defect at Node 24. |
| 5 | **P1** `yandexPlayerId` length drift — join/`update_identity` allow max **256** (Schemas.ts:567,592) but the credit/upsert contract caps at **128** (CreditContract.ts:22,61); one over-long id fails the whole `CreditBatchRequestSchema` array-parse → 400 (Routes.ts:157-160), and `postWithRetry` treats 400 as non-retryable → the entire batch is dropped — Codex medium | CORRECT → **medium** (griefing/availability: a modified rostered client denies ALL co-players their 10 XP/match; bounded — needs a modified client, no corruption/crash/security breach). Both Round-5 reviewers + manual end-to-end trace confirm. | **Open/actionable** (owner decision 2026-06-29). DISTINCT from C1 (self-credit of a forged id) — this is denial-of-XP-to-*others*; NOT suppressed by the C1 acceptance. Latent since Round 1 (Claude r1 wrongly asserted the bounds matched). Fix: align the entry-point bound to 128 AND/OR have `ProfileApiClient` isolate items failing `CreditItemSchema` before POST so one bad item can't fail the batch + a batch-poisoning regression test. |
| 6 | **P1** applied — item isolation (fix (b)) | CORRECT, medium | **Resolved** — `creditMatch` now filters each item through `CreditItemSchema` before POST, dropping (and logging by id-length, never the value) any that fail, so one over-long id can't 400 the whole batch; co-players are still credited. Regression tests added (one 200-char id + one valid → valid player credited; all-invalid → no POST). **Rejected fix variants (do not re-propose):** (a) tightening the entry bound to 128 — a regression that disconnects legit long-id users at join (see [P1-bound] residual); and raising the store bound to 256 — contradicts the consistent 128 design + pulls in T5. Owner chose (b), 2026-06-29. |
| 7 | **Closeout re-review** (ultracode: Codex adversarial + 8-agent Claude multi-lens workflow — 6 finder lenses → adversarial verify → completeness critic — + manual P1-fix re-trace) | **NO new defects.** Codex: approve/ship. Workflow: 0 survivors / 1 suppressed / surface covered. P1 fix re-verified correct (filter→drop→early-return→`valid` used for sendCredits+backfill). | **Closeout** (owner decision 2026-06-29) — finding-driven review loop stopped; only remaining gate is live verification. |
| 7 | **S1** Single-source client-built `playerParticipation` is trusted verbatim (no server validation / cross-voter reconciliation), so a rostered voter can self-credit XP without playing, or deny others — Claude workflow | `isReal: true` but **`isNovel: false`** — re-litigates **[C1]** | **Suppressed as settled** — the documented turn-relay design; exposure is earned-XP-only (C1's accepted class) and C1's re-raise gate (signing key issued / paid entitlements) is NOT tripped. Not recorded as an open item. |
| 7 | **G1** No end-to-end integration test for `GameServer.creditMatchXp` glue (clientStateById / eligibleRoster / activeClientIDs gate / guards / winner-upgrade→credit) — completeness critic | Not a defect — glue manually traced correct; `src/core` decision logic IS unit-tested per CLAUDE.md (the glue is server-side, outside the mandate) | **Optional / nice-to-have** (owner decision 2026-06-29) — non-blocking coverage improvement; see Open/actionable. |
| 7 | **G2** `addClient` reconnect copies `lastPing`/`reportedWinner` but not `existing.yandexPlayerId` (GameServer.ts:~240) — completeness critic | Verified **self-healing** — `Transport.maybeRefreshYandexIdentity` re-fires on reconnect + join re-supplies the id; any window is the accepted **A3** class | No action — not a defect. |

## Open / actionable

**No open defects — review closed out (Round 7, 2026-06-29).** All findings across 7 rounds
are resolved (C2, C3, A1, A2, A4, N1, N2, N3, N4, P1); residuals C1 / A3 / A5 / [P1-bound]
are closed — re-raise only under their recorded conditions. Full suite green (599 tests,
81 suites); tsc + lint + prettier clean.

Optional / nice-to-have (non-blocking, NOT required for merge):
- **G1** — add an end-to-end integration test for `GameServer.creditMatchXp` (the glue:
  `clientStateById` from `allClients`, `eligibleRoster` from `gameStartInfo.players`, the
  `activeClientIDs` live-connection gate, the undefined/empty/`gameStartInfo`-undefined
  guards, and the `handleWinner` winner-upgrade→credit flow). The `src/core` decision logic
  (`selectMatchCredits`) is already unit-tested per the CLAUDE.md mandate; this glue is
  server-side and was manually traced correct, so a test would be defense-in-depth only.

**Closeout / convergence note (Round 7):** an exhaustive ultracode re-review — Codex
adversarial (verdict: approve/ship) + an 8-agent Claude multi-lens workflow (6 finder lenses
→ adversarial verify → completeness critic, ~590k review tokens) + a manual P1-fix re-trace —
found **zero genuinely-new defects**. The single candidate (S1) re-litigates the accepted C1
earned-XP client-trust posture and was suppressed; the two critic observations are an optional
test gap (G1) and an A3-class self-healing case (G2). The finding-driven review loop is
**stopped** per loop discipline — do not run further finding-driven rounds absent a genuinely
new defect (a tell-tale of churn: re-proposing any rejected variant or re-raising a residual).

## Live verification (2026-06-29) — PASSED

Against the live profile box `api.geoconflict.ru` (reg.ru):

- **Dev-machine, read + boundary (no token needed):** `/health` 200, `/ready` 200 (DB up),
  `GET /v1/profile` unknown id → 404 `not_found` (the `no_profile` path), and `POST
  /internal/v1/credit` with no/bad bearer → **403** — the nginx `/internal/` IP allowlist
  (`PROFILE_INTERNAL_ALLOW_IPS`) rejecting a non-game-server IP *before* the token check.
  i.e. the internal write endpoints are correctly firewalled to game-server IPs; they are
  NOT reachable from a dev machine by design (this is why a dev-side write test cannot run).
- **On-box, authenticated write path (7/7 PASS):** ran on the box against the app's loopback
  port `127.0.0.1:8080` (bypassing nginx legitimately) with the app's own token from
  `profile.env`: fresh→404, upsert→200, xp==0, credit→`credited`, **xp==10 (XP +10)**, repeat
  same `game_id`→`duplicate`, **xp still 10 (Epic Verification #4 idempotency)**.
- **Fail-soft (profile down → match completes, no throw)** and **non-qualifier exclusion**
  (never-spawned / left / disconnected) are covered by the `ProfileApiClient` and
  `selectMatchCredits` unit tests respectively (not separately runnable against the live API).
- Prod footprint: one inert test row `t6verify-1782726798` (xp=10) + its ledger row; cannot
  collide with a real Yandex id; deletable via `psql` on the box.

Remaining as a post-DEPLOY smoke check (only possible once T6 is merged + deployed to a
game server with `PROFILE_API_URL` set): a real match end-to-end (client `playerParticipation`
→ winner consensus → server credit from an allowlisted game-server IP) confirming Epic #7
"normal match flow, no DB/credit errors in logs".
