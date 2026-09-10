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

`ProfileApiClient` is **fully fail-soft**: every public method never throws and never blocks the caller. Crediting is **at-least-once with a bounded retry budget and no durable queue**. When the budget is exhausted, that match's XP is **dropped** — **two `warn` logs, and nothing else**: no queue, no dead letter, no player-facing signal. *(Wording tightened 2026-09-10: this read "dropped silently — a `warn` log", which contradicted itself and seeded the refuted "nothing logs above `debug`" claim elsewhere. See Consequences.)*

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
- **Negative** — XP loss during an outage is ~~**silent and**~~ **unrecoverable**. There is no dead-letter path, so nobody can replay it later, and no player-facing signal that the award was missed. Affected players simply need one more match.
  🔧 **WORDING CORRECTED 2026-09-10 — the word "silent" is REFUTED against the source, and it mattered because it PROPAGATED.** Every failed credit batch logs **two WARN lines**, in either branch: `src/server/ProfileApiClient.ts`, the `` `profile ${path} returned ${response.status}; not retrying` `` warn inside the `if (response.status < 500 && response.status !== 429)` guard, and the caller's `` `credit batch failed after retries; ${valid.length} award(s) dropped (idempotent — a later retry is safe)` `` warn on the `response === null` branch. ✅ **Both re-verified against the source; the file is unchanged between `589249c` and `00058df`.** The Decision section above already said *"a `warn` log"* — **this bullet contradicted it**, and the looser wording is what got copied outward as *"nothing logs above `debug`"* into `0182`'s runbook and the clean-slate survey, where it was refuted on 2026-09-10.
  ⛔ **THE LOSS ITSELF IS UNTOUCHED AND STANDS IN FULL: the awards are DROPPED, NEVER QUEUED.** Only the *invisibility* claim was wrong. 🔴 **And in practice it still goes unnoticed on the profile box, because NOTHING THERE READS THE LOGS** — no monitoring, no log consumer, no alerting (`0219`, **OPEN**). **A warning nobody reads fails exactly as quietly as no warning at all.** ⇒ Do not read this correction as the risk shrinking; read it as *there is a signal available to wire up*, which is why `0219` exists.
  ⚠️ **The "silent" wording in the BOUNDARY bullet below is a DIFFERENT and still-correct claim** — there the credit is **never attempted at all**, so there is genuinely nothing to log. Do not sweep that one.
- **Blast radius is one match, not a backlog** — nothing accumulates, so an outage cannot cause a thundering-herd write when the backend returns.
- ⚠️ **BOUNDARY, added 2026-09-03 — this ADR closes out drops INSIDE `ProfileApiClient`, and nothing else.** Task `0022` found a **second, unrelated silent-XP-loss path that this ADR does NOT cover and must not be used to dismiss**: when a clientless leader (a Bot or a Nation) wins FFA, no `winner` message ever reaches the server, so `GameServer.handleWinner` never runs, so **`creditMatchXp` is never called at all**. The credit is not dropped after a bounded retry — **it is never attempted**, upstream of this client entirely. It is a live production defect. ~~Its fix is task `0206` — built and closed 2026-09-03.~~ 🔴 **STRUCK 2026-09-04: `0206` WAS REVERTED AND NEVER DEPLOYED, and it was in any case a NO-OP in the case that loses the XP** — `players()` filters to `isAlive()`, so with every clientful player dead the award found nobody. **MEASURED 2026-09-04: a Nation at 100.0 % of the map, the match never ending, no `handleWinner`, no `creditMatchXp`.** ⇒ **The loss is genuinely LOST, not delayed, and is still open.** **The fix is now [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`)**, which decouples crediting from the winner entirely. 🔴 **And Team mode has the same defect** — `checkWinnerTeam()` carries the same guard shape. See [[decisions/clientless-leader-win-policy]] and [[tasks/win-check-clientless-leader-guard]].
- **Re-raise only if:** paid entitlements ever flow through this path (losing a purchase is categorically different from losing 10 XP); the observed drop volume stops being negligible; or a dead-letter/replay path is explicitly funded with the owner's product call. Absent one of those, a review finding of the form *"crediting can silently lose XP"*, *"there is no retry queue"*, *"only 3 retries"*, or *"4xx is not retried"* is **closeout of this ADR, not a new defect**.

## Related

- [[decisions/adr-103-identity-trust-seam]] — the identity seam this path depends on
- [[systems/player-profile-store]] — the profile/XP backend
- [[tasks/profile-match-end-crediting]] — the T6 task that shipped this path
- [[systems/architecture-overview]] — §profile backend, risk R6, open question 4
- [[decisions/adr-numbering-two-series]] — why this is 101 and not 001
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the sweep that showed the fail-soft path's `debug`-level miss logging hid a total prod crediting no-op (task `0062`)
- [[decisions/clientless-leader-win-policy]] — the separate XP-loss path upstream of this client, which this ADR's closeout clause does **not** cover
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, which found that path
- [[decisions/sprint-4]] — the sprint that carried `0022` and `0206`, and that cites this ADR's boundary
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, where this ADR's "silent" wording propagated into the `PROFILE_INTERNAL_TOKEN` trap and was refuted against the source on 2026-09-10
- [[decisions/sprint-backlog]] — the board carrying `0239`, filed out of the same 2026-09-10 citation-accuracy pass that corrected this ADR's wording
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, built to close that separate upstream loss and 🔴 **REVERTED 2026-09-04 — never deployed**
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which now closes that upstream loss by adding a **second crediting trigger** — ⚠️ **this ADR's fail-soft posture applies to that trigger too**
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, where this ADR's consequence is the reason the internal token was generated explicitly rather than left for the box: a mismatched token means a **401 on every credit call**, and under fail-soft the XP is **lost, not queued**
