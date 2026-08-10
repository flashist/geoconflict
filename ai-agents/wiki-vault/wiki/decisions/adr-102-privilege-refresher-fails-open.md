# ADR-102 — Cosmetic entitlements fail open until `cosmetics.json` loads

**Date**: 2026-08-08 (written up) · **2026-08-09** (ruled)
**Status**: accepted — *conditionally, and it expires*

> **Ruled by the owner on 2026-08-09**, in an interview via the producer session. Promoted `proposed` → `accepted` **in place**; there was no earlier settled decision to supersede. The behaviour itself is **inherited from upstream OpenFront** and present at the fork's first commit (2025-11-04) — the 2026-08-09 ruling is the **first** Geoconflict decision on it.
>
> Project ADR-102 — see [[decisions/adr-numbering-two-series]].
> Source: `ai-agents/knowledge-base/decisions/adr-102-privilege-refresher-fails-open.md`

## Context

Every game worker enforces cosmetic entitlements (patterns, colours, flares) through a `PrivilegeChecker` built from a `cosmetics.json` document fetched from the master process on a jittered interval (`src/server/PrivilegeRefresher.ts:21-39`).

Between process start and the first successful fetch — and for the whole duration of any fetch outage — the worker has **no** entitlement data. It must either allow everything or deny everything; there is no third answer, because without the document it cannot distinguish an entitled player from an unentitled one. The load can fail in several ordinary ways: master not up yet during a rolling restart, a non-2xx response, or a document that fails `CosmeticsSchema` validation.

## Decision

**Fail open is accepted while the project sells nothing, together with a pre-commitment to migrate to fail-closed at the first paid entitlement.**

Until a valid document has loaded, the worker serves a `FailOpenPrivilegeChecker` that allows every request (`src/server/PrivilegeRefresher.ts:45-47`; `src/server/Privilege.ts:112-116`). Note the shape: it returns *allowed* with an **empty** cosmetics object — the request is not rejected, but no specific cosmetic is granted either. A load failure logs a `warn`, and repeat failures with the same message are suppressed so an outage cannot flood telemetry. A previously-good checker is **never discarded** on a later failed refresh; the last known-good document keeps serving.

### The trigger was ruled three times in one day — all three are recorded on purpose

**Do not flatten this into the final answer.** A reader who cannot see that the narrow reading was tried will re-propose it.

| # | When | Wording | Why it changed |
|---|---|---|---|
| 1 | 2026-08-09, initial ruling | **Wide** — first paid cosmetic, including "any in-game currency that is itself purchasable" | The architect's draft wording, ratified by the owner |
| 2 | 2026-08-09, follow-up ruling | **Narrow** — a Yandex IAP for a *specific cosmetic* | The owner narrowed it to a concrete, checkable event |
| 3 | 2026-08-09, later the same day — **in force** | **Wide again** — *any paid entitlement*, checker-gated or not | New code evidence: the first paid product does not go through the cosmetics checker |

**Why the narrow reading failed — the reusable lesson.** The narrow trigger was defined around **what the cosmetics checker gates**. That checker — `PrivilegeChecker.isAllowed()` (`src/server/Privilege.ts:16`) fed by `CosmeticsSchema` (`src/core/CosmeticSchemas.ts:67`) — gates **only patterns, colours, and flag layers/colours**. But the first thing Geoconflict sells is **paid citizenship (99₽)**, which grants **ad removal and the full emoji set** — *neither of which routes through that checker*. Under the narrow wording, paid citizenship would **not** have fired the trigger, and the pre-commitment would have sat inert straight through the launch of the project's first paid product.

> **Do not re-propose the narrow reading.** Defining a monetization trigger by *which code path enforces it* fails whenever the first thing sold is enforced somewhere else. Define it by *what the player paid for*.

### The trigger, as it now stands

The acceptance **expires the moment any paid entitlement ships**. It fires when any of these becomes true:

- **A player can pay real money for anything that confers an entitlement** — regardless of which code path enforces it, and regardless of whether it is a cosmetic at all. On the current roadmap that includes **paid citizenship** (Task 8 — ad removal + full emoji set), **Task 9 / `0010` — re-enable flags**, and **Task 9a / `0011` — re-enable territory patterns**.
- **A cosmetic gates something that is not cosmetic** — e.g. a flare that unlocks a capability.
- **`cosmetics.json` becomes the carrier for a non-cosmetic entitlement.**

A trigger that fires "too early" costs one scheduled migration; a trigger that fails to fire costs a silent fleet-wide entitlement bypass over a live paid product.

### Options — the architect's analysis offered *to* the ruling

*None of these were weighed by Geoconflict when the code was written; they were written in 2026-08 to inform the ruling.*

- **Fail open (in force, inherited — CHOSEN, conditionally)** — a cosmetics outage never blocks anyone from playing or from using the appearance they already had.
- **Fail closed** — the weaker option *for today's product*. Every worker restart would strip every player's appearance for the first seconds of uptime, and a master outage would strip cosmetics fleet-wide: a visible, confusing regression protecting revenue that does not yet exist.
- **Block worker startup until first load** — the worst of the three; it turns a decorative dependency into a hard one, so workers would refuse matches because a colour palette could not be fetched.
- **Fail open during a startup grace window, then closed** — not implemented, the natural shape of the fix, and the **pre-committed migration target**. Deferred to a named trigger, not indefinitely.

## Consequences

- **Positive** — cosmetics are never a reason a match cannot be played or joined; startup ordering between master and workers does not matter; a transient master outage is invisible to players.
- **Negative** — during any window where no valid document has loaded, **every worker grants every cosmetic request**. A master outage is a silent, fleet-wide entitlement bypass.
- **Bounded by scope, not by mechanism.** What keeps this survivable is a *product* fact (the project sells nothing yet), not a technical safeguard. Nothing in the code limits the blast radius — which is exactly why the acceptance is tied to that product fact and expires with it.
- **Nobody is watching the bypass — now a known, accepted gap.** No alerting, metric, or dashboard exists for "we are currently serving fail-open"; a single suppressed `warn` is the whole signal. Originally an oversight; as of the ruling it is an **accepted gap**. It is not evidence anyone is monitoring the bypass — nobody is.
- **The "coin chain" residual was DOWNGRADED on 2026-08-09 — corrected, not deleted.** Earlier drafts recorded a "real money → coins → cosmetic" chain as a live residual. Coins **do not exist today** (roadmap Task 11, Sprint 5, unbuilt), and **as designed they are earn-only** — post-match rewards and rewarded-ad grants, with no path that buys coins with money. Earned coins are not a paid entitlement, so the trigger is not implicated. The concern was reasoned from the trigger wording without reading Task 11's design. **Narrow conditional re-raise:** if the coin economy is ever designed so coins can be *bought* with money, the trigger's application must be re-ruled before any cosmetic is sold for coins. **This rests on a plan, not on code** — Task 11 is unbuilt and its design may change. (Separately: the same Task 11 design sells some cosmetics **money-only**; those fire the trigger on their own, no coin chain involved.) See [[decisions/sprint-5]].
- **Closeout shield — in force, conditionally.** While the project sells nothing and no trigger has fired, a review finding of the form "`PrivilegeRefresher` fails open" or "`FailOpenPrivilegeChecker` allows everything" is **closeout of this ADR, not a new defect**. **Once any trigger has fired the shield is void**, and the same finding is a real defect with no further owner ruling needed. A reviewer applying it answers two questions: (1) *can a player pay real money for anything today?* — do **not** narrow this to "a cosmetic the checker gates"; (2) *has an in-game currency shipped that can be bought with money?* — coins as designed are earn-only, so the expected answer is no.

## Upstream-API dependency — discovered after the ruling

**This materially enlarges the migration.** The entitlement list the checker is fed does **not** come from Geoconflict's profile server and does **not** come from Yandex. It comes from the **upstream OpenFront user API**:

- `src/server/Worker.ts:377` — `flares = result.player.flares`, from `getUserMe(token, config)`
- `src/core/ApiSchemas.ts:53` — `UserMeResponseSchema.player.flares`

- **Selling a cosmetic via Yandex IAP requires the entitlement to originate from Geoconflict's own infrastructure.** Today it originates third-party. Making a checker fail *closed* on data supplied by a third-party identity service is a **materially different and larger problem** than "add a startup grace window" — a third party's availability, and its notion of who owns what, would decide whether paying players keep what they bought.
- **The primary revenue source is already gated on upstream-supplied data.** `src/client/GutterAds.ts:35` suppresses ads for any player whose flares contain a `pattern:` entry. Ad suppression — the project's main revenue today — therefore **already** turns on a third-party field, and ad revenue is **already coupled to cosmetics** before anyone decided it should be.
- ⚠️ **Unverified: whether that upstream call is live in production.** This has **not** been checked and must not be asserted either way. Task `0009` determines it. Recorded as a **dependency and an open uncertainty, not a conclusion.**
- **Sequencing:** `0008` should not be scoped or estimated until `0009` answers where entitlement data will come from.

**Adjacent, but not the same — ADR-103.** Both are places where Geoconflict trusts a claim it does not originate, and both are unblocked by the same external event (the Yandex IAP secret key). **Do not merge them.** [[decisions/adr-103-identity-trust-seam]] is *who the player is*; ADR-102 is *what the player is entitled to*, and its upstream source is OpenFront, not Yandex.

## Related

- [[decisions/adr-106-flags-suppressed]] — flags are parsed then dropped inside the same privilege-checker path
- [[decisions/adr-103-identity-trust-seam]] — the adjacent identity-trust seam; related shape, different problem
- [[decisions/sprint-backlog]] — tasks `0008` (gated fail-closed migration), `0009` (upstream API), `0010` / `0011` (the first paid entitlements that would fire this trigger)
- [[decisions/sprint-5]] — Task 11's earn-only coin design, which the residual downgrade rests on
- [[decisions/sprint-6]] — paid map packs, whose purchase surface depends on the same entitlement-origin question
- [[systems/architecture-overview]] — §game server auth, risk R5, open question 6 (now answered)
- [[systems/networking]] — the worker processes that hold the checker
- [[systems/player-infrastructure]] — the identity/customization substrate; records the live upstream-sourced `flares` path and the ad-revenue coupling
- [[decisions/adr-numbering-two-series]] — the ADR number bands, and the in-place-amendment carve-out this ADR is the recorded exception to
