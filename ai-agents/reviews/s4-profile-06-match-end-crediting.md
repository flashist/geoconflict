# Review ledger — s4-profile-06-match-end-crediting

Task: ai-agents/tasks/backlog/s4-profile-06-match-end-crediting.md
PR: #128 (branch `s4-profile-06-match-end-crediting` → `dev`)
File(s) under review: src/server/GameServer.ts, src/server/ProfileApiClient.ts,
src/server/Client.ts, src/server/GameManager.ts, src/server/Worker.ts,
src/core/profile/MatchQualification.ts, src/core/Schemas.ts,
src/client/Transport.ts, src/client/graphics/layers/WinModal.ts, tests/*
Status: changes-requested — Round-3 re-review (2026-06-28) surfaced 4 new findings (2 medium, 1 low, 1 informational-now-actionable); see Open/actionable. Round-1 items remain resolved; C1/A3/A5 residuals unchanged.
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

## Open / actionable

Reopened by Round-3 re-review (2026-06-28). Round-1 items (C2, C3, A1, A2, A4) remain
resolved; residuals C1 / A3 / A5 remain closed — re-raise only under their recorded
conditions. New open items:

- **N2** (medium) — Reconnect race denies *legitimate* reconnecting players their XP.
  `ws.on("close")` filters `activeClients` by clientID off the old client closure
  (GameServer.ts:396-398); on a delayed old-socket close after a reconnect, the new
  live client is removed, and the C2 gate (`!activeClientIDs.has(clientID)`) then
  excludes a connected player from crediting. Fix: remove only the exact instance
  (`c !== client`); add a reconnect regression test (old close after replacement →
  still credited). This is the priority item — it harms honest players, not attackers.
- **N1** (medium) — No roster gating. `creditMatchXp` builds candidates from
  `this.allClients` (GameServer.ts:1233); a malicious winner can name any connected,
  identified, non-roster client in `playerParticipation` and mint it XP. Fix: intersect
  the credit candidates with `gameStartInfo.players` clientIDs (or pass an
  `eligibleStartRoster` set into `selectMatchCredits`); add a regression test where an
  `allClients`-only late joiner appears in participation but receives no credit.
  Orthogonal to C1 — do NOT treat the signing fix as resolving this.
- **N3** (low) — First-voter participation sourcing. Update `potentialWinner.winner`
  when a later agreeing voter carries non-undefined `playerParticipation` while the
  stored message does not (GameServer.ts:1142/1172).
- **N4** (informational/defensive) — Drain `response.body` before retrying/returning in
  `postWithRetry` (ProfileApiClient.ts). No leak at Node 24; runtime-independent hygiene.

Live verification still pending once the above are addressed (match against the profile
box: XP +10, idempotency on repeat `game_id`, non-qualifier exclusion, fail-soft with
profile down).
