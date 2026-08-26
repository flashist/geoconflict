# ADR-103: One identity-trust seam — client-asserted Yandex IDs are accepted for earned XP; signed verification is deferred

- **Status:** accepted
- **Date:** 2026-08-08 (retro-recorded; decision made **2026-06-28**, commit `7c82d8d`
  "s4-profile-06-match-end-crediting")
- **Deciders:** Owner (Mark Dolbyrev). The comment names it an "epic-accepted risk", so the
  acceptance was made at epic level during s4-profile-06 / the Yandex Payments track.

## Context

XP credits and profile rows are keyed by a **Yandex player id**. The game server learns that id from
the client's join message, and can also receive it later via an `update_identity` message when the
Yandex SDK was still initializing at join.

That id is **not verified**. Yandex offers a server-verifiable identity —
`getPlayer({ signed: true })` returns a signed payload the server can check — but verifying it
requires the **Yandex secret key**, and that key is only issued once in-app purchases are enabled for
the game. IAP is itself blocked on Yandex catalog approval
(`ai-agents/knowledge-base/PROJECT.md`, "Platform — Yandex Games"). So at the time crediting shipped,
verification was **externally blocked**, not merely unbuilt.

The choice was therefore not "verified or unverified" but "ship earned XP now against an unverified
id, or ship no earned-XP path at all until an external party acts."

## Decision

Accept the client-asserted id **for earned XP only**, and confine the trust question to **exactly one
function** so that verification, when it becomes possible, is a change to that function alone:

```
src/server/GameServer.ts:1189-1202

  private getCreditableYandexId(client: Client): string | null {
    return client.yandexPlayerId;
  }
```

The design rules that make this a seam rather than just a shortcut:

1. **Single funnel.** Every path that credits or upserts goes through it — two call sites,
   `upsertProfileForClient` (`src/server/GameServer.ts:1210`) and `creditMatchXp`
   (`src/server/GameServer.ts:1261`). No other code reads `client.yandexPlayerId` for a trust decision.
2. **Signature is already the post-verification signature.** It returns `string | null`. When
   verification lands, it verifies the signed payload *there* and returns the verified id or `null` —
   downstream upsert / credit / qualification logic does not change at all.
3. **The raw field is marked untrusted at its source** (`src/server/Client.ts:23-27`): "UNTRUSTED:
   client-asserted, NOT identity-verified. Do not use for profile lookup, crediting, or entitlements
   without verification."
4. **The id can only go null → value, never value → value** (`Client.ts:37-43`,
   `setYandexPlayerIdIfUnset`). A late identity refresh can fill in an id that was missing at join,
   but cannot **reassign** an already-known one — so the refresh message does not widen the risk
   beyond the join field.
5. **Scope containment.** Paid entitlements do **not** rely on this. They are verified separately,
   server-side, consume-after-durable-grant, by the Payments track.

## Options considered

- **Accept the asserted id behind a single documented seam (chosen)** — ships the earned-citizenship
  path, which is the spine of the retention→monetization sequence, while keeping the eventual fix to
  one function. The abused case is bounded: someone who forges another player's id grants *that
  player* XP toward a free tier; there is nothing to steal, only something to gift or to farm.
- **Block earned XP entirely until the secret key arrives** — rejected. The blocker is an external
  party with no committed date (Yandex catalog approval, then key issuance). It would have held the
  entire citizenship feature hostage to a third-party queue, for a risk whose worst outcome is
  inflated free-tier grants.
- **Verify with a self-hosted proxy or an alternative identity source** — rejected. Any substitute
  identity is either the same unverified value in different clothing, or a second account system to
  build, run, and reconcile against the Yandex id that Yandex Games already imposes as the platform
  identity.
- **Scatter the check at each call site** — rejected implicitly by the seam design. Two call sites
  today become many as the profile feature grows, and a trust rule enforced in N places is a trust
  rule that will be missed in one of them.
- **Hash / pseudonymize the id to reduce exposure** — separately investigated and **rejected**
  (`ai-agents/knowledge-base/PROJECT.md`, "152-ФЗ"; the `s4-profile-hash-player-ids` task is in
  `ai-agents/tasks/cancelled/`). It does not remove the legal obligation and adds real complexity.
  **Do not re-propose it.**

## Consequences

- **Positive:** earned citizenship shipped without waiting on Yandex. The fix is genuinely cheap and
  genuinely localized when the key arrives — one function body, no caller changes, no data migration.
  The untrusted value is labelled everywhere it is held.
- **Negative / costs:** anyone able to craft a join message can claim another player's Yandex id and
  accrue XP on their behalf, or farm XP under fabricated ids. This is `../architecture.md` risk **R1**.
  There is no rate limit or anomaly detection on the crediting path today.
- **The risk grade is time-dependent, not static.** It is low while citizenship is free and cosmetic,
  and rises the moment citizenship carries paid value — which is exactly when the key that fixes it
  becomes available. The two are coupled by the same external event, which is why the acceptance was
  judged safe.
- **Residual risks / "re-raise only if":**
  - **The Yandex secret key is issued** — then implement verification *inside*
    `getCreditableYandexId()` and supersede this ADR. This is the expected exit, not a failure.
  - **Paid citizenship ships before the key arrives**, so paid value is reachable through an
    unverified identity (open question 5 in `../architecture.md` §13).
  - **Observed XP-farming or identity-collision abuse in production.**
  - **A second call site appears that reads `client.yandexPlayerId` directly**, bypassing the funnel —
    that *is* a defect against this ADR and should be reported as one.

  Absent those, a review finding of the form "the Yandex id is client-asserted / unverified / can be
  spoofed" is **closeout of this ADR, not a new defect.**

## Related

- `src/server/GameServer.ts:1189-1202` — the seam and its comment, which this ADR formalizes
- `src/server/Client.ts:18-43` — the untrusted field and the null→value-only refresh rule
- `src/core/profile/MatchQualification.ts:74-99` — `selectMatchCredits` (frozen roster, not-kicked,
  not-disconnected, non-null id, dedupe by id)
- `../architecture.md` §7, §11 R1, §13 open question 5
- ADR-101 — the fail-soft crediting path this seam feeds
- `ai-agents/tasks/cancelled/0187-profile-hash-player-ids/brief.md` — the rejected hashing approach
