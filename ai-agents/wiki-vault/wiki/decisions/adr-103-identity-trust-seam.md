# ADR-103 — One identity-trust seam: client-asserted Yandex IDs accepted for earned XP

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-103 — see [[decisions/adr-numbering-two-series]].
> Retro-recorded 2026-08-08; decision made **2026-06-28** during the T6 match-end crediting task. The code comment names it an "epic-accepted risk", so acceptance was made at epic level.
>
> Source: `ai-agents/knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md`

> # 📌 CORRECTION — 2026-09-11. **THE CANONICAL ADR TAKES NO CHANGE. THIS MIRROR DID.**
>
> 🚨 **The figure `"10 XP per (game, account)"` IS NOT IN THE CANONICAL ADR AT ALL.** Verified against
> `ai-agents/knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md` on
> 2026-09-11: it states its abuse bound **qualitatively** — *"there is nothing to steal, only something
> to gift or to farm"* — and **carries no number**. Nothing in it references `10` or `1,000`.
> ⇒ **The figure existed only in this vault mirror.** It has been rewritten below to name the
> **mechanism** instead of a number, so it cannot go stale again when `0211` ships.
>
> 🔴 **CORRECTS A 2026-09-11 LINT WARNING THAT WAS WRONG.** ~~That warning said the `1 XP` ruling makes
> this ADR's risk argument *"stronger, never weaker"*.~~ **Struck.** **The farming economics are
> IDENTICAL:** the award falls 10× **and the threshold falls 10× with it, by design**, so **~100 forged
> qualifying matches buys citizenship before and after** the change. ⛔ **THE RISK GRADE IS UNCHANGED —
> it is NOT lowered, and it is NOT raised.** A smaller award number is not a smaller abuse surface when
> the threshold moved with it.
>
> ⛔ **No amendment to the canonical ADR-103 is required, and none should be made on the strength of
> ADR-111** — ADR-111 says so itself. See [[decisions/adr-111-xp-economy-rescale]] and
> [[tasks/credit-participation-xp-elimination-or-match-end]].

## Context

XP credits and profile rows are keyed by a **Yandex player id**. The game server learns that id from the client's join message, and can also receive it later via an identity-update message when the Yandex SDK was still initializing at join.

That id is **not verified**. Yandex offers a server-verifiable identity — a signed payload the server can check — but verifying it requires the **Yandex secret key**, and that key is only issued once in-app purchases are enabled for the game. IAP is itself blocked on Yandex catalog approval. So at the time crediting shipped, verification was **externally blocked, not merely unbuilt**.

The choice was therefore not "verified or unverified" but "ship earned XP now against an unverified id, or ship no earned-XP path at all until an external party acts."

## Decision

Accept the client-asserted id **for earned XP only**, and confine the trust question to **exactly one function** — `getCreditableYandexId()` in `src/server/GameServer.ts` — so that verification, when it becomes possible, is a change to that function alone.

The design rules that make this a seam rather than just a shortcut:

1. **Single funnel.** Every path that credits or upserts goes through it — two call sites. No other code reads the raw field for a trust decision.
2. **The signature is already the post-verification signature.** It returns `string | null`. When verification lands it verifies the signed payload *there* and returns the verified id or `null`; downstream upsert, credit, and qualification logic does not change at all.
3. **The raw field is marked untrusted at its source** in `src/server/Client.ts` — "do not use for profile lookup, crediting, or entitlements without verification".
4. **The id can only go null → value, never value → value.** A late identity refresh can fill in a missing id but cannot **reassign** a known one, so the refresh message does not widen the risk beyond the join field.
5. **Scope containment.** Paid entitlements do **not** rely on this — they are verified separately, server-side, consume-after-durable-grant, by the Payments track.

**Options rejected:** blocking earned XP until the secret key arrives (holds the entire citizenship feature hostage to a third-party queue with no committed date, for a risk whose worst outcome is inflated free-tier grants); verifying via a self-hosted proxy or alternative identity source (either the same unverified value in different clothing, or a second account system to build and reconcile); scattering the check at each call site (a trust rule enforced in N places is one that will be missed in one of them); and **hashing/pseudonymizing the id — separately investigated and rejected. Do not re-propose it.**

## Consequences

- **Positive** — earned citizenship shipped without waiting on Yandex. The fix is genuinely cheap and localized when the key arrives: one function body, no caller changes, no data migration.
- **Negative** — anyone able to craft a join message can claim another player's Yandex id and accrue XP on their behalf, or farm XP under fabricated ids. This is architecture risk **R1**. There is no rate limit or anomaly detection on the crediting path today.
- **The risk grade is time-dependent, not static.** It is low while citizenship is free, and rises the moment citizenship carries paid value — which is exactly when the key that fixes it becomes available. The two are coupled by the same external event, which is why the acceptance was judged safe.
- **Re-raise only if:** the Yandex secret key is issued (implement verification *inside* that function and supersede this ADR — the expected exit); paid citizenship ships before the key arrives; XP-farming or identity-collision abuse is observed in production; or **a second call site appears that reads the raw field directly** — that *is* a defect against this ADR. Absent those, a finding of the form *"the Yandex id is client-asserted / unverified / can be spoofed"* is **closeout of this ADR, not a new defect**.

## Related

- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft crediting path this seam feeds
- [[systems/player-profile-store]] — the profile/XP backend and its trust boundary
- [[tasks/yandex-identity-plumbing]] — the T3 task that plumbed the id through join
- [[tasks/profile-match-end-crediting]] — the T6 task that added the seam
- [[tasks/yandex-payments-implementation]] — the 0019 payments track: paid entitlements are HMAC-verified separately per rule 5, and its `/intent` endpoint's client-asserted id residual leans on this seam
- [[decisions/personal-data-152fz-compliance]] — where the rejected hashing approach was ruled out
- [[features/announcements]] — the task-0012 personal-inbox read routes ride this same client-asserted-ID funnel
- [[systems/architecture-overview]] — risk R1, open question 5
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[tasks/citizenship-name-change]] — task 0067: a forged id can submit an offensive name in a citizen's name, mitigated only by the human moderation gate and closing on `0014`
- [[tasks/citizen-verified-icon]] — task 0068: a forged id can mint a **cosmetic** citizen icon, which gates nothing of value
- [[decisions/adr-102-privilege-refresher-fails-open]] — the adjacent entitlement-trust seam. **Related shape, different problem — do not merge them:** ADR-103 is *who the player is* (Yandex), ADR-102 is *what the player is entitled to* (upstream OpenFront). Both are unblocked by the same external event, the Yandex IAP secret key.
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which routes a **new client-asserted fact** (an elimination claim) into the crediting path. ⚠️ **The architect's decisive point: the identity being credited is itself client-asserted under this ADR, so hardening the elimination claim first would be hardening the STRONGER link.** The abuse ceiling is bounded to **exactly one credit per `(game_id, yandex_player_id)`, enforced by a database primary key** — i.e. **whatever `XP_PER_MATCH` holds** (`src/core/profile/Citizenship.ts` — the `XP_PER_MATCH` declaration), never more. 📌 **Stated as the MECHANISM, not a figure, corrected 2026-09-11:** this page previously wrote *"10 XP per (game, account)"*, ~~a number that appears nowhere in the canonical ADR~~ and that would go stale the day `0211` ships the rescale. The mechanism does not move; the constant does
- [[decisions/adr-111-xp-economy-rescale]] — the `1 XP` / `100 XP` rescale. ⛔ **This ADR is UNAFFECTED and needs NO amendment**: its bound is qualitative, the farming economics are identical (~100 forged matches either side), and **the risk grade is UNCHANGED, not lowered**
