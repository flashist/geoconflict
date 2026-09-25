# Citizenship Core — Earned Citizenship (the XP-threshold path)

**Source**: `ai-agents/tasks/done/0017-citizenship-earned/brief.md` (plus `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 · task `0017` · citizenship core, earned path (independent of Yandex Payments)

> 🚨 **READ THIS FIRST — CLOSED AS BUILT + REVIEWED, NOT AS LIVE.**
> Closed **2026-09-23** on an **owner ruling** given live in the `fkit lead` session via
> `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021, ADR-033 §5) ⇒ **`(agent-closed — not owner-verified)`**: no human verified this work, and
> **nothing here is proven in production.** Everything was verified against the **local** profile stack.
> Its production-only checks (*Deferred Live Tail*) **moved to task `0296`** (Sprint 5). ⚠️ The brief's
> own trap still holds: **a local pass where the token is set proves the feature, not that production
> works.**

## Goal

When a player's accumulated XP reaches the citizenship threshold, they **earn citizenship automatically**,
server-side, at match end — a side effect of crediting the match. No player action; no dependency on
Yandex Payments. Re-scoped 2026-08-23 by owner ruling (*"don't block on Yandex externals"*) to build and
verify against the **local** profile stack; only the production effect was ever gated on `0062`.

### ⚠️ The threshold figures — read the frame before quoting a number

The brief marks **every** XP figure as *pending the `0211` rescale* (ADR-111): **10 XP per match / 1,000
threshold** before, **1 XP per match / 100 threshold** after. `0211` owns the rescale, including the
player-facing strings; `0017` does not.

- ✅ **In the repository at `b3ee5de` the rescale IS present** — verified this sync:
  `src/core/profile/Citizenship.ts` carries `CITIZENSHIP_XP_THRESHOLD = 100` and `XP_PER_MATCH = 1`, and
  the `inbox.templates.citizenship_earned` body in `resources/lang/en.json` says *"100 XP"*.
- ⛔ **In production it is not**: `0211` is closed but **not deployed** (see
  [[tasks/credit-participation-xp-elimination-or-match-end]]), and production credits nothing anyway
  until the token is deployed non-empty.
- 🚩 **So the brief's *"shipped today is the struck figure"* is true of PRODUCTION and stale about the
  REPOSITORY.** Its markers say to switch figures *"the moment `0211` ships"*, which does not say whether
  it means merged or deployed. **Flagged, not fixed** (outside the vault). The practical rule `0296` A6
  already states: **seed against the figures actually live in production at the time.**

## Key Changes

Built 2026-08-23 (phase 1, no Docker) and 2026-08-24 (phase 2, local Postgres).

- **`src/profile-server/PlayerProfileRepository.ts`** — crediting returns a `CreditOutcome` (`status` +
  `citizenshipNewlyGranted`). The credit is **two statements in one transaction**: `CREDIT_SQL`
  (ledger insert + XP increment, `RETURNING` the locked pre-grant citizenship state) then
  `GRANT_CITIZENSHIP_SQL` on the **same locked row**. A post-commit hook, `afterCitizenshipEarned()`,
  fires only when that transaction saw the flip.
  - 🚩 **A plan deviation, and the reason it matters:** the plan sketched a snapshot self-join to
    detect the flip. It is **unsound under concurrency** — under READ COMMITTED a blocked racer
    re-evaluates against the original snapshot, so **both** racers report "newly granted" (a double
    inbox message). The reviewer **reproduced the double-report empirically** against a real Postgres
    and confirmed the shipped two-statement shape reports exactly once.
  - 📌 **Since rekeyed:** at `b3ee5de` the grant updates the `players` table by internal id (migration
    `006_player_identity.sql`), not the `player_profiles` table the brief's SQL names. The brief's SQL
    is the historical shape.
- **`src/profile-server/Routes.ts`** — handler consumes `CreditOutcome`; **the wire contract is
  unchanged** (status only) — nothing on the game server consumes the flag.
- **`src/client/PlayerProfileView.ts`** — fires `Citizenship:Earned:XP` when a fetched profile **first**
  shows `citizenship_earned_at` after a stored not-earned observation (per account, in `localStorage`).
  Part C took **option A**: re-fetch the profile on return to the start screen; no push.
- **`resources/lang/en.json` + `ru.json`** — the earned-citizenship inbox strings (since moved under
  `inbox.templates.*` by `0012`).
- **Tests:** route tests incl. two **forged-body** tests; six client detection tests; integration tests
  incl. a **held-lock barrier race test** that forces the contested path deterministically.

### Verification (local stack, 2026-08-24)

| Step | Result | Honesty note |
|---|---|---|
| **V1** grant at threshold | ✅ | credited at the exact `/internal/v1/credit` wire seam; **no live match was played** (no Yandex identity exists outside the platform) |
| **V2** idempotency | ✅ | re-credit is a `duplicate` no-op; `citizenship_earned_at` byte-identical |
| **V3** inbox message in the Personal tab | ⛔ **never run — WAIVED 2026-09-23** | covered by `0296` **B1/B2**; ⚠️ accepted tradeoff: **nobody sees the Personal tab in a browser until after launch** |
| **V4** card reaches State 3 without reload | ✅ | browser run with a **stubbed** Yandex SDK and the card flag temporarily ON, reverted after |
| **V5** never-spawned ⇒ no credit | ✅ by unit test | a live local observation would be vacuous |
| **V6** forged citizenship fields ignored | ✅ | the only route to citizenship is server-credited XP |

**Review:** stateful, closed out. **R1** (the post-commit hook call was not try/catch-wrapped) was
accepted as a latent residual and then **discharged by `0012`**, which wrapped both call sites. **R2** (the
race test was only probabilistic) was fixed with the barrier test. Accepted residuals include a
**fresh-device under-count** and a **paid-crossing over-count** of `Citizenship:Earned:XP` (owner ruling,
2026-08-23) — see [[tasks/analytics-p1-citizenship-funnel]].

## Outcome

### Where the Deferred Live Tail went (owner ruling 2026-09-23)

| Tail item | Now |
|---|---|
| 1 — production profile integration actually on | `0296` **A2–A3** |
| 2 — real XP accrual observed in production | `0296` **A5** |
| 3 — live grant | `0296` **A6** (server-side half, after the deploy window) + **B1** (card State 3, after the flip) |
| 4 — **the flip** (`CITIZENSHIP_CARD_ENABLED` → `true`) | 🔴 **REMOVED, not moved** — now owned **only** by `0065` §6 |

⚠️ **Accepted tradeoff, recorded on the brief:** with the flip owned only by `0065` §6, **the earned-path
launch is now tied to `0065`'s steps** — the brief's *"Do not couple these tasks"* note is **superseded on
that point** (it stays true of the build). 🚨 **`0065`'s own ordering problem is still unsolved:** its §6
flips only after steps 1–4 pass, while step 3 (the real test purchase) needs the flip first.

⛔ **The flip-ON coupling recorded on [[tasks/hide-citizenship-card-flag]] (2026-08-21 — "shipping `0017`
must flip the flag") is superseded** by the same ruling.

### Standing invariants

- `is_citizen` / `citizenship_earned_at` are **server-derived only** — no inbound body may set them.
  The guest-migration upload that once carried that risk was cancelled 2026-06-13.
- **No retroactive grant** — every player starts at 0 XP when the feature ships. (A one-time tenure grant
  is being researched separately as `0253`.) *📌 2026-09-24: `0253` is built and closed `(agent-closed —
  not owner-verified)` — up to 50 XP once per player, server-clamped; never run in production. See
  [[tasks/tenure-xp-grant]].*

## Related

- [[tasks/forward-profile-internal-token]] — task `0062`, which gated this task's production tail; closed the same day
- [[tasks/personal-inbox]] — task `0012`, which filled this task's inbox seam and hardened its hook call site
- [[tasks/profile-match-end-crediting]] — the match-end crediting path this grant rides on
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which owns the XP rescale
- [[decisions/adr-111-xp-economy-rescale]] — the rescale behind the threshold figures
- [[tasks/citizenship-xp-progress-ui]] — the card whose State 3 this grant produces
- [[tasks/hide-citizenship-card-flag]] — task `0054`, the flag; its flip is now `0065` §6's alone
- [[tasks/analytics-p1-citizenship-funnel]] — the `Citizenship:Earned:XP` event and its accepted mis-counts
- [[systems/player-profile-store]] — where the grant lands
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a lost credit call never surfaces
- [[decisions/sprint-4]] — the board this task closed on
- [[decisions/sprint-5]] — where `0296`, which received the production checks, was filed
- [[systems/analytics]] — where `Citizenship:Earned:XP` is documented
- [[systems/weekend-deploy-window]] — the deploy window after which `0296` section A (this task's A5–A6) can run
- [[tasks/tenure-xp-grant]] — task `0253`, the tenure grant that can trigger the earned-citizenship grant
