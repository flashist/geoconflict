# ADR-101 — Fail-soft match-end XP crediting, no durable queue

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-101 (this project's series starts at 101 — see [[decisions/adr-numbering-two-series]]).
> Retro-recorded 2026-08-08; the decision itself was made **2026-06-28** during the T6 match-end crediting task. The decision is read directly from the contract comment in the code; the owner's sign-off is **inferred** from that task shipping to production.
>
> Source: `ai-agents/knowledge-base/decisions/adr-101-fail-soft-xp-crediting-no-durable-queue.md`

## Context

At match end the game server awards 10 XP per qualifying player toward the 1,000 XP earned-citizenship threshold. The award is an HTTP write to a **separate service on a separate VPS**, over the public internet.

Two forces pull against each other:

1. **A profile-backend outage must never stall, delay, or error a match.** The crediting call sits on the match-cleanup path; anything that blocks there degrades the game for every player in that match, including players with no profile at all.
2. **XP is real player value** — it is the earned path to citizenship, the product's supporter tier.

What makes an at-least-once policy safe at all is that the profile server treats `(game_id, yandex_player_id)` as the idempotency key, so a duplicate credit is a server-side no-op.

## Decision

`ProfileApiClient` is **fully fail-soft**: every public method never throws and never blocks the caller. Crediting is **at-least-once with a bounded retry budget and no durable queue**. When the budget is exhausted, that match's XP is **dropped silently** — a `warn` log, nothing else.

- 3 attempts, 250 ms × attempt-number linear backoff
- a 10 s per-attempt timeout, chosen so a stalled-but-not-down backend cannot hold a socket open for the HTTP client's ~300 s default
- retries **only** transport failures (including the timeout abort), 5xx, and 429; a non-429 4xx gives up immediately, because a caller/config error is not fixable by retrying
- the whole path is a **no-op** unless both the profile API URL and the internal token are configured

Two narrower rules fall out of the same principle and are part of the decision:

- **Per-item pre-validation before posting.** The profile server rejects the whole batch with a 400 if one item is invalid, and a 400 is not retried — so one malformed id would cost every other player in the match their XP. Invalid items are dropped individually first, and the id value is never logged (untrusted input).
- **One `no_profile` backfill round.** If the upsert-at-join did not land, those players are upserted and re-credited exactly once. Not a loop.

**Options rejected:** blocking match cleanup until crediting succeeds (converts a profile problem into a *game* problem for every player); a durable retry queue or dead-letter store on the game server (real infrastructure — durable storage, a replay worker, its own failure and retention story — for an outage window measured in minutes, before citizenship carried paid value; **deferred, not refuted**); unbounded in-memory retry (leaks memory and sockets, survives no restart, so it buys durability that is not actually durable).

## Consequences

- **Positive** — a profile-backend outage is completely invisible to gameplay. Retries are safe by construction. The client is instantiated once per worker and shared.
- **Negative** — XP loss during an outage is **silent and unrecoverable**. There is no dead-letter path, so nobody can replay it later, and no player-facing signal that the award was missed. Affected players simply need one more match.
- **Blast radius is one match, not a backlog** — nothing accumulates, so an outage cannot cause a thundering-herd write when the backend returns.
- **Re-raise only if:** paid entitlements ever flow through this path (losing a purchase is categorically different from losing 10 XP); the observed drop volume stops being negligible; or a dead-letter/replay path is explicitly funded with the owner's product call. Absent one of those, a review finding of the form *"crediting can silently lose XP"*, *"there is no retry queue"*, *"only 3 retries"*, or *"4xx is not retried"* is **closeout of this ADR, not a new defect**.

## Related

- [[decisions/adr-103-identity-trust-seam]] — the identity seam this path depends on
- [[systems/player-profile-store]] — the profile/XP backend
- [[tasks/profile-match-end-crediting]] — the T6 task that shipped this path
- [[systems/architecture-overview]] — §profile backend, risk R6, open question 4
- [[decisions/adr-numbering-two-series]] — why this is 101 and not 001
