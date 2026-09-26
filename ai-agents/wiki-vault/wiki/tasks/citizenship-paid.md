# Citizenship Core — Paid Citizenship (the Buy Flow)

**Source**: `ai-agents/tasks/done/0018-citizenship-paid/brief.md` (plus `plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (was Sprint 4 until the 2026-09-23 rescope) · task `0018` · monetization milestone

> 🚨 **READ THIS FIRST — what the close does and does not prove.** Closed **2026-09-26** by a spawned
> `fkit-producer` via `/fkit-task-done`, on an **owner ruling given live in the `fkit lead` session via
> `AskUserQuestion`**: *"Close 0065 (citizenship go-live) and 0018 (the buy flow) now?"* →
> **"Close both (Recommended)"**. No owner channel in the spawn (ADR-021, ADR-033 §5) ⇒
> **`(agent-closed — not owner-verified)`**.
> - ✅ **The flow ran for real on 2026-09-26, in production release `0.0.154`**: one real player purchase
>   and one owner test purchase both returned **200** from the complete route, and the card switched to
>   State 3 without a reload (relayed evidence — the lead's read-only box checks plus the owner's
>   screenshots; the producer observed none of it).
> - ⛔ **Closing this task waives nothing.** By owner ruling of 2026-09-23 this task closes on
>   [[tasks/citizenship-go-live]] (`0065`) alone; **the real-purchase proof lives only in `0297`** (Sprint 5,
>   run by the owner). Still open there: **live reconciliation** (an interrupted purchase — not run),
>   **the funnel analytics seen live** (not yet checked), and **which HMAC construction matched** (filed
>   as backlog tasks `0309` → `0310`).

## Goal

Let a player who does not want to grind the XP threshold **buy** citizenship. The earned path
([[tasks/citizenship-earned]]) and the paid path produce the same `is_citizen = true` state; the paid
path also sets `is_paid_citizen = true` and `citizenship_purchased_at`. The price is **249 Yan** since the
owner changed it in the Yandex console on 2026-09-25 (was 99 rubles) — and it is **never hardcoded**: the
button shows whatever `getCatalogProduct('citizenship').price` returns.

**Re-scoped 2026-08-23 by owner ruling** (*"maximize work that can proceed without anything real from
Yandex"*): this task became the **mock-buildable scope only** — client purchase flow, entitlement grant
and reconciliation UI, built and verified against a **mocked SDK catalog** with fake product data and a
**synthetic secret key** on the local profile stack. Everything that needed real Yandex or production
config was split out into [[tasks/citizenship-go-live]] (`0065`).

## Key Changes

Built 2026-08-24. The plan's key finding: **the server side was already shipped by `0019`**
([[tasks/yandex-payments-implementation]]) — grant SQL, the intent / complete / reconcile routes, HMAC
verification and the inbox seam. So the remaining scope was client + UI + analytics + lang + tests.

- `src/client/CitizenshipPurchase.ts` (new) — the flow: intent → `Purchase:Started` → SDK purchase →
  complete → `Purchase:Completed` → best-effort consume; `Purchase:Abandoned` on a frame or complete
  failure.
- `src/client/CitizenshipCard.ts` — the buy button, **State 2 only**, **hidden entirely** when the catalog
  has no `citizenship` product, price from the catalog, an inline error line, an in-flight tap latch, and a
  double-charge guard. Already-citizens (State 3) see no button.
- `src/client/PaymentsReconciliation.ts` — dispatches `PURCHASES_RECONCILED_EVENT` so the card refreshes
  after a recovered purchase.
- `src/client/flashist/FlashistFacade.ts` — three `Purchase:{Started,Completed,Abandoned}:Citizenship`
  analytics keys and a "catalog settled" hook the card waits on.
- `resources/lang/en.json` + `ru.json` — the `citizenship_paid` section (4 keys, in sync).
- Review round 1 (owner-dispositioned): **R1** the card only shows the buy button once the profile read is
  **authoritative** (a zero-state profile no longer shows it); **R2 + R3** one shared cause — an unbounded
  wait on `consumePurchase` — fixed by not awaiting consume after the grant (consume still runs after the
  grant, never before); **R4** an attribution note only (part of this task's content landed in a commit
  labelled for `0017`; no history rewrite).
- Verification was **mocked / local**: `npm test` 740 tests passing at the time; a local profile server with
  a synthetic key drove intent → complete → idempotent retry → reconcile → tampered signature (400). The
  owner ruled a dev-browser mock harness **out**, so client proof was jsdom-level only.

## Outcome

**First real purchases, 2026-09-26 (relayed evidence, recorded in the worklog):**

| Check | Result |
|---|---|
| Real player purchase | complete route → **200** |
| Owner test purchase | complete route → **200**; on the box `is_paid_citizen` and `is_citizen` true, `citizenship_purchased_at` set, earned timestamp empty; processed-purchase row with its intent; intent marked used |
| Card → State 3 | immediately, **no reload** (the mocked step 3, now seen live) |
| Consume | after a reload still a citizen, no reconcile request ⇒ nothing left pending |
| Price from catalog | test account showed **"249 RUB"**, main account **"249 YAN"** — the amount is Yandex's, the **currency label is per account** |
| Inbox seam | no longer a no-op: the server sent a `citizenship_paid` inbox message to both buyers. ⚠️ **The bell dot appeared only after a reload** — tracked in Sprint 6 task `0303` |

🚩 **Residuals, carried by `0297` and not by this page:** live reconciliation (§4), funnel analytics seen
live, and the HMAC-construction follow-up (`0309` record which construction matched → `0310` drop the
other). Per [[tasks/citizenship-go-live]]'s worklog, the two 200s mean **the secret value on the box is
correct** — which settles the `0195` value-correctness question ([[tasks/yandex-payments-secret-forwarding]]);
*which* HMAC construction matched is still unknown.

⚠️ **Paid state is not private yet.** It can be derived from the public profile (citizen with no earned
timestamp ⇒ paid). The owner ruled that a must-fix in `0250` (authenticated profile read), now rank 9 on
[[decisions/sprint-6]]. No ruling made it block the launch.

## Related

- [[tasks/citizenship-go-live]] — `0065`, the go-live this task closed on; the flip and the live deploy
- [[tasks/yandex-payments-implementation]] — `0019`, the server side and the client seam this task built on
- [[tasks/yandex-payments-secret-forwarding]] — `0195`, the secret on the box; its value-correctness question is settled by the first real purchases
- [[tasks/yandex-catalog-registration]] — `0014`, the catalog item, the test login and the price change
- [[tasks/citizenship-earned]] — `0017`, the XP path to the same citizenship state
- [[tasks/citizenship-xp-progress-ui]] — `0191`, the card this task adds the buy button to
- [[tasks/hide-citizenship-card-flag]] — `0054`, the compile-time flag flipped by `0065` §6
- [[tasks/personal-inbox]] — `0012`, the inbox the paid-grant message now lands in
- [[tasks/analytics-p1-citizenship-funnel]] — `0021`, the funnel events this task wired
- [[systems/player-profile-store]] — where the paid-citizen columns and processed purchases live
- [[systems/analytics]] — the three `Purchase:*:Citizenship` events
- [[decisions/sprint-5]] — the board it closed on
- [[decisions/sprint-6]] — `0250`, `0301`, `0303`: the follow-ups on the purchase surfaces
- [[decisions/sprint-4]] — the board this work started on, before the 2026-09-23 rescope moved it to Sprint 5
- [[systems/project-brief]] — product ground truth — the go-live-before-proof tradeoff, now live
