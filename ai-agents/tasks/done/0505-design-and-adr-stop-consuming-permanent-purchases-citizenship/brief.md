# Design + ADR: stop consuming permanent purchases (citizenship)

## ID
0505

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-26**, relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). ⛔ Not producer precedent. The owner's own words to the lead (2026-10-26), verbatim: *"I think the main
> thing that we need to implement in our game as soon as possible is changing the in-app processing in a way that we
> don't consume it anymmore."* Then, asked *"Given that not consuming can't recover this player's purchase, what do we
> do first?"*, the owner picked **"Merge tool + stop consuming"** — option text: *"Both. Stopping consuming is medium
> work, needs a new ADR, and touches the purchase flow waiting to deploy. Knock-on: may hold that deploy
> (0493/0497/0498 wait on it)."*

## Priority
32

> ⚠️ Priority 32 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0496`**, because it changes the purchase flow that `0492`/`0494`/`0495`/`0496`
> just built and that is waiting to deploy; deciding it before that deploy is cheaper than after. Appended after the
> board's highest rank, never inserted (ADR-035); no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified)

> 2026-10-26 — started by `fkit-lead` (relayed to a spawned `fkit-producer`).

## Owner
fkit-architect

## Context

### Why

Today the client **consumes** every purchase right after the server records it: `src/client/ProductPurchase.ts`
(after `completePurchase`) and `src/client/PaymentsReconciliation.ts` (after `/reconcile` lists a token as processed).
Per Yandex, consume **deletes the purchase permanently** — it no longer appears in `getPurchases()`. So when a paying
player's login lands on a fresh record (2026-10-25 report from **the affected player**; `0424`), Yandex has nothing left
to show us and our database is the only proof he paid.

Yandex officially supports non-consumed **permanent** purchases
(https://yandex.ru/dev/games/doc/ru/sdk/sdk-purchases). The signed payload carries **no user id**. ~~Moderation rule
**1.13.1** requires a game to handle unprocessed purchases at launch.~~

> ✏️ **2026-10-26 — corrected per OWNER DIRECTION** (typed in the `fkit-lead` session, relayed to a spawned
> `fkit-producer`; ⛔ not producer precedent). Verbatim: *"Our case is different: Yandex.Games doesn't check our every
> update, because we're working via iframe and can update it without regular moderation proceedure."* There is **no
> moderation gate** on this change. What gates the release is our own pre-release checks **T1–T3** (spec §10.3), with
> **T3** — a second Yandex account in the same browser must **not** see the first account's purchase — as the
> **release blocker**.

### What it does NOT do

- It **cannot** recover the affected player's purchase — that one is already consumed. `0503`/`0504` do that.
- It helps **future** buyers only, and **only if `getPurchases()` is scoped to the Yandex account**. If it is scoped to
  the per-game id that `getUniqueID()` returns, a player whose id changed sees **none** of his old purchases, and this
  change does nothing for the id-change case. ~~**This is unknown and is a question to Yandex (`0508`).**~~ **This is
  unknown.** It is learned from our own checks and shadow data (spec §10.2, §10.3, §4.7), not asked of Yandex: `0508`'s
  purchase-list-scope question (**Q2**) is ~~**parked with the owner** (keep or drop)~~ **kept — asked** (owner,
  2026-10-26, *"Keep Q2, drop others (Recommended)"*); the design does not wait on its answer (D2). The design must say
  what it is worth under each answer.

## What to build

A **design spec** and an **ADR**, no code. Run `/fkit-design-spec` (saved to
`ai-agents/knowledge-base/reports/<date>-0505-design-stop-consuming-permanent-purchases.md`) and record the decision
with `/fkit-record-decision`. The spec proposes the build split for the producer to file (it may replace `0506` with
several briefs).

The design must answer — each of these is a known risk or question carried in from the 2026-10-26 investigation:

1. **Which products stop being consumed.** Permanent: citizenship, and durable items (`0496`'s entitlements) by the
   same rule? **Consumables stay consumed** — XP packs, name change, future coins. Where the per-product flag lives
   (the product grant registry from `0492` / the shared purchase core from `0494` are the natural seams).
2. **Every-load reconcile with purchases that never go away.** A permanent purchase will be in `getPurchases()` on
   every load forever. Today the server's `/reconcile` returns an already-processed token with **no grant** and the
   client then consumes it. Without consume, what does each load do — skip known tokens client-side, or send them and
   let the server answer cheaply? Cost per load, and no "processed" signal that refreshes the profile for nothing.
3. **A caller-aware "move this purchase to the record now holding it" path** (ADR-113 §5: the caller comes from the
   verified session). When an already-processed permanent token shows up for a **different** player than the receipt
   names, what happens? Rules to settle:
   - **move, never copy** — one paid record per receipt;
   - **replay** — the payload's `issuedAt` / a freshness check, so an old signed payload cannot be replayed into another
     account (and how that interacts with ADR-121's 24 h login freshness);
   - **verified sessions only** (`vfy:true`), never a client-asserted one;
   - whether a move is automatic or needs the owner — **`0424`'s owner rule is "never an automatic merge"**; say
     whether a Yandex-attested purchase moving to the account Yandex shows it under counts as a merge, and put that to
     the owner explicitly.
4. **Never revoke on absence.** A purchase missing from `getPurchases()` (SDK failure, refund, a different account)
   never removes paid state.
5. **Refunds / chargebacks** — does a refunded purchase drop out of `getPurchases()`? ~~(Question to Yandex, `0508`.)~~
   (Unknown; learned from our own shadow data — entry `status` counts, spec §4.7. `0508`'s general refund question is
   ~~**parked with the owner**~~ **dropped** (owner, 2026-10-26, *"Keep Q2, drop others (Recommended)"*); only "was
   **this** player's purchase refunded" stays in its draft, as Q4.) The design
   states behaviour for both answers, consistent with item 4.
6. ~~**Moderation.** Is an unconsumed permanent citizenship acceptable under rule 1.13.1? Unconfirmed — propose a test on
   a **draft build** in the Yandex console before any release, and what the release does if moderation rejects it.~~
   **Pre-release checks** (corrected 2026-10-26, owner direction quoted under *Why*: no per-update moderation, so no
   draft-build test and no rejection path). Our own checks **T1–T3** inside Yandex with test accounts and test
   purchases before the game deploy: T1 permanent purchase stays and reloads are quiet; T2 interrupted purchase is
   granted by reconcile; **T3, release blocker** — a second Yandex account in the same browser must not see the first
   account's purchase. `0508` asks Yandex nothing about our implementation; its moderation question (**Q3**) is
   **retired**.
7. **Clashes to resolve, each named in the spec:**
   - the shared-purchase-flow design §5
     ([`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md))
     — its interfaces assume consume after grant;
   - `grantPaidPurchase` as the single writer of paid state;
   - `processed_purchases` keyed by `purchase_token` with **one** `player_id` (migration `006`);
   - [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
     (identities, deferred account linking) and `0424`;
   - [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md)
     and `0501` (the logged-in re-check before paying) — reconcile behaviour they rely on;
   - `0503`'s merge tool, which also moves receipts — one ownership rule for both.
8. **Existing buyers.** Purchases already consumed are gone from Yandex; say so. Purchases still unconsumed (a failed
   consume) — what happens to them on the first load after the change.
9. **Rollout order** — profile box and client, either order safe or a stated order; and how it lands relative to the
   **committed-but-undeployed** purchase-flow code (`0492`, `0494`, `0495`, `0496`; checks `0493`, `0497`, `0498`).
   Whether that deploy is held for this change is **the owner's open question** (below); the spec gives the cost of each
   answer, it does not decide.
10. **Analytics** — any new or changed event, per the analytics reference rules.

## Verification steps

1. The spec exists at the path above and answers items 1–10, each with a decision or an explicit ~~"unknown — needs
   Yandex (`0508`)"~~ "unknown — learned from our own checks / shadow data" / "owner decides".
2. An ADR exists in `ai-agents/knowledge-base/decisions/` recording the decision, the options weighed, and the
   consequences — including what it does **not** fix (the affected player; the id-change case if `getPurchases()` is
   per per-game id).
3. ~~The spec states the moderation test plan on a draft build and what blocks a release.~~ The spec states our own
   pre-release checks T1–T3 and what blocks a release (**T3 failing** blocks it; T1/T2 failing are defects fixed
   before release). No moderation gate (owner, 2026-10-26).
4. The spec proposes a build split (rows the producer files), each row independently shippable, with dependencies and
   a verify task per deploy.
5. The owner approves the spec (recorded in this task's `worklog.md`, dated, owner's words) before `0506` or any split
   build starts. ✅ **Met 2026-10-26** — owner **"Approve (Recommended)"**; recorded in
   [`worklog.md`](worklog.md) and in the notes below.
6. No secrets, endpoints or player data in the spec or the ADR.

## Notes

- **Depends on:** nothing
- **Blocks:** 0506 (and through it `0510`, `0511`, `0512`)
- ~~**Uses, not waits on:** `0508`'s Yandex answers. The design goes ahead with them unknown and marks what each answer
  changes. Whether the **build** waits for Yandex's answers is for the spec to propose and the owner to rule.~~
  **Does not use or wait on `0508`** (corrected 2026-10-26). `0508` asks Yandex about the affected player, not about our
  implementation: Q3 (moderation) **retired**, Q2 (purchase-list scope) ~~**parked with the owner**~~ **kept** (owner,
  2026-10-26, *"Keep Q2, drop others (Recommended)"* — asked, but nothing here waits on it). Platform unknowns
  are learned from our own pre-release checks (T1–T3) and shadow data. The build does not wait (D2, below).
- 📌 **2026-10-26 — design rulings D1 and D2. OWNER RULINGS** (live via `AskUserQuestion` in the `fkit-lead` session,
  relayed to a spawned `fkit-producer`; ⛔ not producer precedent):
  - **D1** → **"Block, record, you move it (Recommended)"** — a permanent purchase held by another profile is detected,
    a second purchase is blocked, evidence is recorded, and the owner moves it by hand with `0503`. Nothing moves
    automatically; `0424`'s never-auto-merge rule stays.
  - **D2** → **"No, build and ship (Recommended)"** — the build and release do not wait on Yandex's answers.
  - **D3** (what to do if moderation rejects the build) **withdrawn** — does not apply (owner direction quoted under
    *Why*).
- ~~⏳ **Awaiting owner approval:** the spec … (**revision 2**) and ADR-126 (**proposed**). Verification step 5 is not met
  until the owner approves; `0506` does not start before then.~~
- ✅ **2026-10-26 — spec and ADR APPROVED. OWNER RULING** (live via `AskUserQuestion` in the `fkit-lead` session,
  relayed to a spawned `fkit-producer`; ⛔ not producer precedent). Asked *"Approve the 0505 'stop consuming' design and
  ADR-126 as described?"* → **"Approve (Recommended)"** — option text: *"ADR-126 becomes accepted; producer splits 0506
  into profile-server and game build tasks, then planning starts."* Approved: the spec
  [`2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../../../knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md)
  (**revision 2**) and
  [ADR-126](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md)
  (now **accepted**). Verification step 5 **met**. The §12 split is filed: `0506` narrowed to **S1** (profile box);
  new **`0510`** (S2, client), **`0511`** (S1v), **`0512`** (S2v). The "settled in the design" items of spec §13
  (products, never revoke on absence, existing buyers) are confirmed by this approval.
- ✅ **2026-10-26 — pre-release test setup ANSWERED. OWNER RULING** (same session, relayed; ⛔ not producer
  precedent). Asked *"Where can you run the T1–T3 checks inside Yandex before the game goes live?"* → **"Test copy on
  the dev server"** — option text: *"There's a Yandex-side test version that loads our dev box."* Answers spec §14
  item 1 for the game side. ⚠️ Left open: which profile box the dev game box talks to — if it is the live one, S1
  deploys there first (safe alone, spec §7 row 12). Carried in `0512`.
- ✅ **2026-10-26 — `0508` Q2 kept.** OWNER RULING **"Keep Q2, drop others (Recommended)"** — option text: *"Ask only
  'per account or per game ID?' besides the player questions."* `0508` will ask the purchase-list-scope question; this
  design still does **not** wait on the answer (D2).
- **Related:** `0503`/`0504` (the fix for the affected player), `0501` (logged-in re-check), `0424`.
- 📌 **2026-10-26 — deploy hold DECIDED. OWNER RULING** (`AskUserQuestion` in the `fkit-lead` session, relayed; ⛔ not producer precedent): **"Hold it"** — option text: *"0493, 0497, 0498, 0499 then also wait on 0506 (design + ADR + build first). All Sprint 9."* The pending purchase-flow deploy (`0491`/`0492`/`0494`/`0495`/`0496`) waits for `0506`; `0493`, `0497`, `0498`, `0499` now depend on `0506`. Item 9's rollout order should therefore assume one combined release on top of that code.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
