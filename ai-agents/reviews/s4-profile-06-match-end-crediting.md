# Review ledger — s4-profile-06-match-end-crediting

Task: ai-agents/tasks/backlog/s4-profile-06-match-end-crediting.md
PR: #128 (branch `s4-profile-06-match-end-crediting` → `dev`)
File(s) under review: src/server/GameServer.ts, src/server/ProfileApiClient.ts,
src/server/Client.ts, src/server/GameManager.ts, src/server/Worker.ts,
src/core/profile/MatchQualification.ts, src/core/Schemas.ts,
src/client/Transport.ts, src/client/graphics/layers/WinModal.ts, tests/*
Status: in-review
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

## Open / actionable

- **C2** — Tab-close leaver crediting: WS `close` handler (GameServer.ts:391-399) only
  filters `activeClients`; it does not `markClientDisconnected`, so `isClientDisconnected`
  stays `false` until the 60s ping timeout. A player who closes the tab while still
  "alive" in the sim can be credited if the match ends within that window. Mark
  disconnected immediately on `close`, or require a live connection at match end.
- **C3** — Bounded HTTP: wrap each `fetch` attempt in `AbortSignal.timeout()` (treat
  abort as retryable) so a stalled-but-not-down backend can't leak sockets/promises;
  add a never-resolving-fetch test proving `creditMatch()` returns within budget.
- **A1** — Observability: warn-log in `creditMatchXp` when `playerParticipation` is
  absent/empty, so a version-skewed first-voter silently dropping the whole match's
  crediting is visible in logs.
- **A2** — Observability: don't let `upsertProfile`'s one-shot "not configured" log
  suppress the `creditMatch` one; log per-operation (or per-game).
- **A4** (low, optional) — unit-test `WinModal.buildPlayerParticipation` with
  never-spawned / spawned-alive / spawned-killed players.
