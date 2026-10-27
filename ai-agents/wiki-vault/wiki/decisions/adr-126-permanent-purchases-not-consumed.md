# ADR-126: Permanent Purchases Are No Longer Consumed; Reconcile Flags a Purchase Held by Another Profile and Never Moves It by Itself

**Date**: 2026-10-26
**Status**: accepted *(⛔ superseded in part by [[decisions/adr-127-consume-switch-source-setting]] — the switch's mechanism and "S1 on the dev box first" only)*

> Source: `ai-agents/knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md`
> (drafted by `fkit-architect` for task `0505`; promoted from `proposed` to `accepted` on the owner's
> **"Approve (Recommended)"**, 2026-10-26, relayed by `fkit-lead`). Design behind it:
> `ai-agents/knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md` (revision 3) — see
> [[tasks/stop-consuming-design]].
>
> 🏗️ **2026-10-27 sync (`5f93b96`) — built, committed, NOT deployed.** Server half `0506` (S1,
> [[tasks/stop-consuming-profile-box-s1]], commit `baaf2f8`); client half `0510` (S2,
> [[tasks/stop-consuming-client-s2]], commit `f7ce268`). `git tag --contains` → none for either. Live checks `0511`
> (S1v) and `0512` (S2v, T1–T3) are `🔲 Backlog` on [[decisions/sprint-9]].

## Context

- The client consumed every purchase right after our server recorded it (after `/complete` and after reconcile). Per
  Yandex, a consumed purchase is deleted with no way to restore it. That choice came from the Sprint-4 design (*"keeping
  it unconsumed adds noise rather than value"*) and was never an ADR; it assumed our database always reaches the right
  player.
- **That assumption failed** — the owner's test account on 2026-10-08 (`0424`) and the paying player of 2026-10-25
  ([[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]). His purchase was consumed, so Yandex has
  nothing left to show us.
- Yandex supports permanent (unconsumed) purchases via `getPurchases()`; the signed payload has **no user id**.
  Unknown platform behaviour: is the list per Yandex account, per game id, or even per device? Do refunds leave it?
  The design is safe under each answer and waits on none.
- Without consuming, `/reconcile` would refresh the profile for nothing on every buyer's load, and a buyer whose login
  now lands on a fresh profile would be offered Buy again — a **second charge**.
- Binding rules carried in: `grantPaidPurchase` is the single writer of paid state; one `player_id` per receipt
  (migration `006`); [[decisions/adr-113-internal-player-id]]; [[decisions/adr-116-verified-login]] (paid status
  private to a verified reader); **`0424`: never an automatic merge**.

## Decision

1. **Permanent products are never consumed** — kind `citizenship` or `durable_item`. A future consumable kind is still
   consumed after the grant. One pure function over `kind` in `src/core` (`isPermanentProductKind`).
2. **The server owns the policy.** `/complete` answers `consume`; `/reconcile` answers `consumeTokens`; the client
   consumes only what the server names; a missing field means consume nothing. A safety switch restores today's
   consuming for every page on its next reconcile, without a game deploy. ⚠️ **One-way per token** — a purchase
   consumed while it is on is gone from Yandex for good. ⛔ *Mechanism superseded by ADR-127: a committed constant,
   not the env var `PAYMENTS_CONSUME_PERMANENT`.*
3. **Reconcile tells "granted now", "held by you" and "held elsewhere" apart.** The refresh signal fires only on fresh
   grants (`grantedTokens`); `processedTokens` keeps its meaning for older clients.
4. **Reconcile accepts an optional Bearer.** Only a `vfy:true` caller is compared with the receipt's holder; no token,
   a bad token or `vfy:false` behave as today. Reconcile still never depends on being logged in.
5. **A permanent purchase held by another profile than the verified caller's** (owner ruling **D1**, *"Block, record,
   you move it (Recommended)"*): nothing is granted, moved or revoked; the client blocks a second purchase with a
   "contact us" line; the server records a sighting (`purchase_holder_sightings`) as evidence for the owner's manual
   merge (`0503`).
6. **Never revoke on absence.** A purchase missing from `getPurchases()` never removes paid state.
6a. **The build and release do not wait on Yandex** (ruling **D2**, *"No, build and ship (Recommended)"*), and there is
   **no moderation gate** — the owner: *"Yandex.Games doesn't check our every update, because we're working via iframe"*;
   **D3 withdrawn**. The gate is our own pre-release checks on the Yandex-side test copy: **T1** a permanent purchase
   stays and reloads are quiet; **T2** an interrupted purchase lands once; **T3, the release blocker** — a second
   Yandex account in the same browser must not see the first account's purchase. ⛔ *"(S1 on the dev box first)"*
   superseded by ADR-127.
7. **One ownership rule with `0503`.** Receipt, paid flags and entitlement move together, only through one
   `transferPurchase` primitive (built by `0503`, [[decisions/adr-128-owner-run-profile-merge]]). This ADR adds no move.
8. **Measure before relying on freshness.** The server shadow-logs payload `issuedAt` (presence, age bracket) and
   entry `status` values, labels only. ADR-121's 24 h window is for login signatures, not purchase payloads.

**Owner direction on Yandex (2026-10-26, verbatim, typos kept):** *"We're not asking Yandex.Games about how to
implement it. We're not doing anything wrong here, we're just not consuming the purchases that already happened."* So
nothing here is asked of Yandex; `0508` asks only about the player, plus Q2 (purchase-list scope), kept by
*"Keep Q2, drop others (Recommended)"*.

## Consequences

- **Positive:** a permanent purchase survives on Yandex's side; a lost-profile buyer is stopped from paying twice and
  leaves evidence; either deploy order is safe.
- **Costs:** one reconcile POST per buyer per load, forever; a new migration (`011`); new client states and strings;
  the held purchase deploy (`0491`–`0496`) ships only with this build, its game half behind T1–T3; the approved
  [[systems/shared-purchase-flow]] spec's "consume after grant" is **superseded on this point only**.
- **Does NOT fix:** the affected player and the ~21 earlier buyers (already consumed — `0503`/`0504`); **the ID-change
  case entirely if `getPurchases()` is per game id**; a buyer on an unverified session (can still be offered Buy); a
  logged-in tap before the boot reconcile answers (`0501`).
- **Options rejected:** automatic move to the verified caller (D1 option 2 — against `0424`'s rule, unsafe if lists are
  per device); detect without blocking (a buyer can pay twice); hold the release for Yandex's answers (D2 option 2);
  only delete the two client consume calls; client-owned policy; no safety switch; keep consuming; never consume
  anything (re-raised with the first consumable).
- **Re-raise only if:** purchase-list scope becomes known, or T3 shows per-device lists; Yandex starts reviewing iframe
  updates; refunded purchases are seen staying in the list; reconcile 429s appear; a buyer's list nears the
  65,536-byte reconcile bound; the first consumable is designed; the owner reopens D1; a restore loses intent rows for
  listed permanent purchases.

## Related

- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — the incident that prompted it
- [[decisions/adr-127-consume-switch-source-setting]] — supersedes the switch mechanism and the test order
- [[decisions/adr-128-owner-run-profile-merge]] — builds the `transferPurchase` primitive Decision 7 pre-committed
- [[tasks/profile-merge-tool]] — task `0503`, the owner-run merge whose dry run prints the sightings
- [[tasks/stop-consuming-design]] — task `0505`, the design and this ADR
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, S1 (server)
- [[tasks/stop-consuming-client-s2]] — task `0510`, S2 (client)
- [[tasks/yandex-player-id-change-message]] — task `0508`, the Q2 question to Yandex
- [[systems/shared-purchase-flow]] — superseded on consuming only
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — the restart prompt case 1 still ends in
- [[decisions/adr-113-internal-player-id]] · [[decisions/adr-116-verified-login]]
- [[tasks/yandex-payments-implementation]] — the Sprint-4 build that chose to consume
- [[systems/player-profile-store]] · [[systems/analytics]]
