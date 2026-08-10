# ADR-101: Match-end XP crediting is fail-soft with bounded retries and no durable queue

- **Status:** accepted
- **Date:** 2026-08-08 (retro-recorded; decision made **2026-06-28**, commit `7c82d8d`
  "s4-profile-06-match-end-crediting")
- **Deciders:** Owner (Mark Dolbyrev), during the s4-profile-06 match-end crediting task.
  *The decision itself is read directly from the contract comment in the code; the owner's sign-off is
  inferred from that task shipping to production.*

## Context

At match end the game server awards 10 XP per qualifying player toward the 1,000 XP earned-citizenship
threshold. The award is an HTTP write to a **separate service on a separate VPS** — the profile
backend — over the public internet:

```
GameServer.handleWinner()      src/server/GameServer.ts:1131-1187
  └─ creditMatchXp()           src/server/GameServer.ts:1227-1279
      └─ ProfileApiClient.creditMatch()   src/server/ProfileApiClient.ts:84-118
          └─ POST /internal/v1/credit
```

Two forces pull against each other:

1. **A profile-backend outage must never stall, delay, or error a match.** The crediting call sits on
   the match-cleanup path. Anything that blocks there degrades the game itself for every player in
   that match, including players who have no profile at all.
2. **XP is real player value.** It is the earned path to citizenship, the product's supporter tier
   (`ai-agents/knowledge-base/PROJECT.md`, "Citizenship").

The profile server makes retries free of consequence: `(game_id, yandex_player_id)` is the
idempotency key, so a duplicate credit is a server-side no-op. That is what makes an *at-least-once*
policy safe at all.

## Decision

`ProfileApiClient` is **fully fail-soft**: every public method never throws and never blocks the
caller. Crediting is **at-least-once with a bounded retry budget and no durable queue**. When the
budget is exhausted, that match's XP is **dropped silently** (a `warn` log, nothing else).

Concretely (`src/server/ProfileApiClient.ts:17-21, 196-243`):

- 3 attempts (`DEFAULT_MAX_ATTEMPTS = 3`)
- 250 ms × attempt-number linear backoff (`DEFAULT_BACKOFF_MS = 250`)
- 10 s per-attempt timeout via `AbortSignal.timeout` — chosen so a stalled-but-not-down backend cannot
  hold a socket open for undici's ~300 s default
- retries **only** transport failures (including the timeout abort), 5xx, and 429; a non-429 4xx gives
  up immediately, because a caller/config error is not fixable by retrying
- calls are a **no-op** unless both `PROFILE_API_URL` and `PROFILE_INTERNAL_TOKEN` are present
  (`isConfigured()`, `src/server/ProfileApiClient.ts:130-133`)

Two narrower rules fall out of the same principle and are part of this decision:

- **Per-item pre-validation before posting** (`src/server/ProfileApiClient.ts:90-103`). The profile
  server rejects the entire batch with a 400 if one item is invalid, and a 400 is not retried — so one
  malformed player id would cost every other player in the match their XP. Invalid items are dropped
  individually first, and the id value is never logged (it is untrusted input).
- **One `no_profile` backfill round** (`src/server/ProfileApiClient.ts:172-194`). If the
  upsert-at-join did not land, those players are upserted and re-credited exactly once. Not a loop.

## Options considered

- **Bounded retry, then drop (chosen)** — keeps the match path unconditionally fast and safe, and
  costs nothing in normal operation. The loss window is exactly "profile backend down longer than
  ~1.25 s of retries at the moment a match ended", which is rare and bounded.
- **Block match cleanup until crediting succeeds** — rejected. It converts a profile-backend problem
  into a *game* problem for every player in the match, including players who earn no XP. The stated
  contract is explicit that this must never happen (`src/server/ProfileApiClient.ts:28-33`).
- **A durable retry queue / dead-letter store on the game server** — rejected *for this task*. It
  needs durable storage on the game VPS (which has none for this purpose), a replay worker, and its
  own failure and retention story — real infrastructure for an outage window measured in minutes,
  before citizenship carried any paid value. Deferred, not refuted.
- **Unbounded in-memory retry** — rejected. It leaks memory and sockets across a long outage and
  survives no restart, so it buys durability that is not actually durable.

## Consequences

- **Positive:** a profile-backend outage is completely invisible to gameplay. Retries are safe by
  construction (idempotency key). The client is instantiated once per worker and shared, mirroring
  `PrivilegeRefresher`.
- **Negative / costs:** XP loss during an outage is **silent and unrecoverable**. There is no
  dead-letter path, so nobody can replay it later, and no player-facing signal that the award was
  missed. The only trace is a `warn` line: `credit batch failed after retries; N award(s) dropped`
  (`src/server/ProfileApiClient.ts:107-110`). Affected players simply need one more match.
- **Blast radius is one match, not a backlog** — nothing accumulates, so an outage cannot cause a
  thundering-herd write when the backend returns.
- **Residual risks / "re-raise only if":**
  - **Paid entitlements ever flow through this path.** Today it credits *earned* XP only. Losing a
    purchase is categorically different from losing 10 XP, and would require durability.
  - **Observed drop volume stops being negligible** — i.e. the `award(s) dropped` warn line becomes a
    recurring telemetry group rather than a rarity. That is the empirical trigger.
  - **A dead-letter/replay path is explicitly funded** as its own task with the owner's product call
    on whether silent loss is acceptable (open question 4 in `../architecture.md` §13).

  Absent one of those three, a review finding of the form "crediting can silently lose XP" or "there
  is no retry queue" is **closeout of this ADR, not a new defect**. Likewise "only 3 retries" and
  "4xx is not retried" are deliberate.

## Related

- `src/server/ProfileApiClient.ts:23-36` — the contract comment this ADR formalizes
- `src/server/GameServer.ts:1218-1279` — `creditMatchXp`, the fire-and-forget caller
- `src/core/profile/MatchQualification.ts:43-45, 74-99` — the pure qualification rules
- `../architecture.md` §7 (match-end XP flow), §11 R6, §13 open question 4
- ADR-103 — the identity-trust seam this path depends on
