# Design spec: stop consuming permanent purchases (citizenship and durable items)

**Task:** [`0505`](../../tasks/done/0505-design-and-adr-stop-consuming-permanent-purchases-citizenship/brief.md)
(build: `0506`, which this spec proposes to split into **S1** and **S2**, §12).
**Author:** fkit-architect, spawned by `fkit-lead` (Sprint 9). **No owner channel.** Every owner question is in §13 as
a `NEEDS-DECISION` for the lead to relay.
**Date:** 2026-10-26
**Status:** **APPROVED (2026-10-26), revision 3.** D1 and D2 ruled; D3 withdrawn (it does not apply to us). ADR-126 is
accepted, and **superseded in part by ADR-127** (R3: the switch is a source setting; there is no dev profile box). R3
only records two owner rulings; it adds no design choice of the architect's. The approval still goes into `0505`'s `worklog.md` (brief, verification step 5); that is the producer's.

> **Approval, 2026-10-26** (live via `AskUserQuestion` in the `fkit-lead` session, relayed verbatim by `fkit-lead`; the
> architect heard it by relay only). Question: *"Approve the 0505 'stop consuming' design and ADR-126 as described?"* →
> **"Approve (Recommended)"**. Option text: *"ADR-126 becomes accepted; producer splits 0506 into profile-server and
> game build tasks, then planning starts."*
>
> **Same session, two more answers, folded in below:**
> - Test setup. Question: *"Where can you run the T1–T3 checks inside Yandex before the game goes live?"* → **"Test copy
>   on the dev server"**. Option text: *"There's a Yandex-side test version that loads our dev box."* Applied in §9,
>   §10.3, §12 (S2v) and §14 item 1.
> - `0508`: **"Keep Q2, drop others (Recommended)"**. Option text: *"Ask only 'per account or per game ID?' besides the
>   player questions."* So Q2 **will be asked**. Q3 (moderation) and Q4 (refunds) are dropped. **The design still waits
>   on none of the answers** (D2). Applied in §10.2 and §14 item 6.

> **Owner rulings, 2026-10-26** (live via `AskUserQuestion` in the `fkit-lead` session, relayed verbatim by
> `fkit-lead`; the architect heard them by relay only):
> - **D1** → **"Block, record, you move it (Recommended)"**. Option text: *"No double charge; 'contact us' line;
>   evidence saved for the merge tool. Never-auto-merge rule stays. Knock-on: none (checked)."*
> - **D2** → **"No, build and ship (Recommended)"**. Option text: *"Safe under any answer; the draft-build test catches
>   the danger. Knock-on: none (checked)."*
> - **D3: not decided.** The owner typed instead (verbatim, typos kept): *"We're not asking Yandex.Games about how to
>   implement it. We're not doing anything wrong here, we're just not consuming the purchases that already happened.
>   So we should not even ASK about our iplementation them, what we can and should ask about is something about the
>   user and why this situation happened."*
>
>   **Applied:** this spec no longer plans to ask Yandex anything about **our implementation**: not whether moderation
>   accepts unconsumed purchases, and no "argue with Yandex" path. The draft-build tests (§10.3) and the server fallback
>   switch (§4.3) stay, as **internal engineering safeguards**. D3 is re-worded and put back to the owner by the lead
>   (§13).
> - **D3, follow-up (same day, typed in the `fkit-lead` session, verbatim):** *"Our case is different: Yandex.Games
>   doesn't check our every update, because we're working via iframe and can update it without regular moderation
>   proceedure."* **Applied (revision 2):** our game updates do not pass a per-update moderation review, so the
>   "moderation rejects the build" scenario does not apply, and **D3 is withdrawn**. There is no draft-build or
>   moderation gate. The checks in §10.3 are **our own pre-release checks**, and T3 stays a release blocker. The server
>   switch is kept, as a general safety switch (§4.3, on engineering grounds). Per `fkit-lead`, `0508` asks Yandex
>   nothing about our implementation: its moderation question (Q3) is **retired**, and its purchase-list-scope question
>   (Q2) is **parked pending the owner**. *(Later the same day the owner kept Q2: see the approval block above.)*

### Revision log

- **R3, 2026-10-26. Two owner rulings, recorded in [ADR-127](../decisions/adr-127-consume-permanent-switch-is-a-committed-source-setting-s1-goes-to-the-live-profile-box-first.md)
  (supersedes ADR-126 in part).** Both typed by the owner in the `fkit-lead` session and relayed verbatim by `fkit-lead`;
  the architect heard them by relay only.
  - **The switch is a committed source setting, not an env var.** Asked during the `0506` plan approval whether the
    box should remember `PAYMENTS_CONSUME_PERMANENT` across deploys, the owner (typos kept): *"I am not sure it should
    be connected to deploys. I should be some settings that we can change in the source files and when the redeploy
    happens, this settings is taken into account"*. As built in `0506`: `src/profile-server/ConsumePermanentSetting.ts`
    exports `CONSUME_PERMANENT_PURCHASES = false`, with the one-way-door comment beside it and a test pinning it off;
    the box logs `payments consume-permanent: OFF (ConsumePermanentSetting.ts)` at boot; no env var, no deploy-script
    forwarding, config parity `REQUIRED 0`. Flip = edit the constant and its pinning test, commit, redeploy the
    profile box. It still reaches open pages on their next reconcile with no game deploy (G7 holds).
  - **There is no dev profile box.** Owner, answering *"Which profile server does the dev game box use?"* (typo kept):
    *"We don't have the dev profile server, so if we need to it test, we better test it on our prod profile server"*.
    S1 goes to the **live** profile box first; T1–T3 then run from the Yandex test copy (dev game box) against the live
    profile box, and T3 gates the game half only.
  - Changed: §4.3, §7 row 11, §9 (order, config parity), §10.3 (where), §12 (S1, S1v, S2v, order, testing), §14
    item 1, new §14 item 7 (no runbook names the switch), the footer. Superseded wording is struck through or kept under a label, not deleted. Task briefs that still
    name the env var or a dev box are the producer's to update (`0511` item 6 names `PAYMENTS_CONSUME_PERMANENT`).

- **R2, 2026-10-26.** D3 withdrawn (owner: updates ship through the iframe without per-update moderation). Removed the
  moderation-rejection path, the draft-build/moderation gate and every "asked of Yandex" line. §10 is re-titled and
  rewritten; T1–T3 are now our own pre-release checks; T4 is dropped. `PAYMENTS_CONSUME_PERMANENT` is kept, re-justified
  as a general safety switch with a stated one-way-door caveat (§4.3). G7, §9, §12 S2v, §13 and §14 follow. The `0505`
  brief's matching lines are the producer's to update (listed in §14 item 6).

- **R1, 2026-10-26.** D1 and D2 ruled (above). D3 reworded and still open. Removed every plan to ask Yandex about our
  implementation: the moderation question (former §10.2 row "Q3"), D3's former option 2, and the ADR's matching lines.
  `0508` is referred to only for questions about **the player and the platform's id and purchase-list behaviour**.
  Whether `0508` keeps its purchase-scope (Q2) and refund (Q4) questions under the owner's new words is the producer's
  to settle with the owner (§14, item 6). Nothing in this design waits on them (D2). "D3" in this spec's §13 means the
  moderation question; the **login rule D3** (`0273`) is always written "the login rule D3".
**ADR:** [ADR-126](../decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md)
(status *accepted*, 2026-10-26), superseded in part by
[ADR-127](../decisions/adr-127-consume-permanent-switch-is-a-committed-source-setting-s1-goes-to-the-live-profile-box-first.md)
(R3).
**Citation frame:** `dev` at `aca097e1`, 2026-10-26. That HEAD already holds the committed but **undeployed** purchase
work (`0491`, `0492`, `0494`, `0495`, `0496`). Line numbers are from that commit.
**Writes:** this file and ADR-126. No source files, no stubs in `src/`, no wiki edits, no commits.

Owner rulings this spec works under (2026-10-26, relayed verbatim by `fkit-lead`):
- *"Merge tool + stop consuming"*. Option text: *"Both. Stopping consuming is medium work, needs a new ADR, and touches
  the purchase flow waiting to deploy. Knock-on: may hold that deploy (0493/0497/0498 wait on it)."*
- Deploy hold: **"Hold it"**. Option text: *"0493, 0497, 0498, 0499 then also wait on 0506 (design + ADR + build
  first). All Sprint 9."* So `0491`, `0492`, `0494`, `0495` and `0496` ship **together with** this build.
- The owner's own words: *"changing the in-app processing in a way that we don't consume it anymmore."*

---

## 0. In plain words

- Today the game tells Yandex to **delete** (consume) every purchase as soon as our server records it. After that,
  Yandex keeps no trace a player could bring back, and our database is the only proof. That is why the affected
  player's citizenship can't be found from his side any more.
- **New rule:** purchases you keep forever (citizenship, and the durable items such as nickname styles) are **never
  consumed**. Purchases you use up (future coins, XP packs, a name change) are still consumed.
- A kept purchase shows up in Yandex's purchase list **on every game load, forever**. So every load sends it to our
  server, and the server must answer cheaply and quietly: "already yours, nothing to do". No grant, no profile
  refresh, no popup.
- **The new thing it lets us see:** if a logged-in player's page shows a purchase that our database has on a
  **different** profile, the player has most likely lost his old profile (the `0424` / affected-player case). The
  design (D1, **ruled 2026-10-26**: block, record, the owner moves it) then:
  1. **stops him paying again** for the same thing, with a clear message to contact us;
  2. **writes down the link** "this login's page carried that profile's purchase", which is evidence for the owner's
     manual merge tool (`0503`);
  3. does **not** move anything by itself. `0424`'s owner rule, *"never an automatic merge"*, stays intact. Moving the
     purchase automatically was option 2; the owner did not pick it.
- **What it does not fix:** the affected player (his purchase is already consumed; `0503`/`0504` fix him), the ~21
  earlier buyers (theirs are consumed too), and **the id-change case entirely** if Yandex keeps purchase lists per
  game id rather than per account (unknown; the platform's behaviour, not ours).
- **Safeguards, stated plainly.** Our game updates ship through the iframe with no per-update moderation review (owner,
  2026-10-26), so there is no review to pass. Before release we run **our own checks** (§10.3). One of them, a second
  Yandex account in the same browser must not see the first account's purchase, **blocks the release** if it fails.
  We also keep a **server-side switch** that brings back today's consuming for every page at once, without touching the
  game (§4.3).

---

## 1. Goal and success criteria

**Goal:** a permanent purchase stays on the player's Yandex purchase list for good, and the game handles that list
correctly on every load. Consumables keep today's behaviour.

| # | Criterion |
|---|---|
| G1 | Citizenship and every `durable_item` product are never consumed, either after `/complete` or after reconcile. |
| G2 | A product of a future consumable kind is consumed exactly as today (after the grant). |
| G3 | A permanent purchase already held by the caller's own profile costs one quiet round trip per load. No grant, no inbox message, no `PURCHASES_RECONCILED_EVENT` (so no card or inbox refresh), no restart prompt. |
| G4 | Paid state is **never removed** because a purchase is missing from `getPurchases()`. |
| G5 | A permanent purchase held by a **different** profile than the caller's **verified** session never leads to a second charge for that product from this page, and it leaves operator-visible evidence. Nothing moves automatically (D1, ruled). |
| G6 | Either deploy order (profile box, game client) is safe. |
| G7 | Today's consuming can be switched back on **from the server alone**, reaching every open page on its next reconcile, if this change misbehaves in production. |
| G8 | Nothing new reveals paid status to an unverified caller (ADR-116 Decision 4; OD-2 of the shared-flow spec). |

## 2. Constraints and scope

**Hard constraints (existing decisions this must fit):**
- **Grant only through an HMAC-verified `/complete` or `/reconcile`**, through `grantPaidPurchase`, the single writer of
  paid state (`src/profile-server/PaymentsRepository.ts:5-12`, `:240-304`). The one exception is the tester-role
  command (`0425`, same header).
- **The receipt ledger** `processed_purchases`: primary key `purchase_token`, **one** `player_id`, no FK on the player
  (`migrations/006_player_identity.sql:177-184`). It is the idempotency guard.
- **`/complete` and `/reconcile` carry no Bearer token today, on purpose:** *"reconciliation runs at session start to
  recover an interrupted purchase and must never depend on being logged in"* (`src/client/PaymentsApiClient.ts:78-81`).
  This design keeps that: the Bearer becomes **optional**, and its absence changes nothing.
- **ADR-113 §3:** no public route accepts a player id. **ADR-113 §5 + ADR-116:** a caller counts as proven only with a
  `vfy:true` session. **ADR-121:** a login signature counts as fresh for 24 h. That window applies to player data,
  **not** to purchase payloads (§6.4).
- **ADR-116 Decision 4 / shared-flow OD-2:** paid status and item ownership are private to a verified reader.
- **`0424`'s owner rule:** *"never an automatic merge"*.
- **ADR-125:** every completed purchase ends in the restart prompt. Unchanged here, because reconcile never shows it.
- **Kill switch `0236`:** with citizenship surfaces off, reconcile does nothing (`src/client/PaymentsReconciliation.ts:57-59`). Unchanged.
- **Analytics:** enum entries only, `Category:Action[:Value]`, at most 5 parts, reference updated with every change.
- **Strings:** `translateText`, in `en.json` and `ru.json`.

**In scope:** the consumption policy and where it lives; the `/complete` and `/reconcile` contracts; the "held by
another profile" detection, block and evidence; shadow measurement of payload freshness and status; the safety switch
and the pre-release checks; the rollout with the held deploy; analytics; tests; the build split.

**Out of scope:** the merge itself (`0503`'s tool and its ADR-113 answers). Recovering the affected player (`0504`).
Anything `0508` asks Yandex; by the owner's ruling it asks nothing about our implementation. The logged-in re-check (`0501`; touch points in §8). Consumable products (none exist; `0480` is on
hold). Re-granting after a database restore that lost the intent rows (§11, residual R6).

---

## 3. What the code does today (HEAD `aca097e1`)

| Step | Where | What happens |
|---|---|---|
| Purchase granted by `/complete` | `src/client/ProductPurchase.ts:103-121` | After the server confirms the grant, `facade.consumePurchase(completed.purchaseToken)`, not awaited. |
| Boot reconcile | `src/client/PaymentsReconciliation.ts:44-87`; scheduled once per page by `fetchPaymentsCatalog` (`src/client/flashist/FlashistFacade.ts:1987-1993`) | Signed `getPurchases()` → `POST /reconcile` → if `processedTokens` is non-empty, dispatch `PURCHASES_RECONCILED_EVENT` (`:79`), then consume each token (`:80-86`). |
| Reconcile now (B3 guest flow) | `PaymentsReconciliation.ts:110-151` | The same, bounded by a timeout. Returns `processed` / `none` / `pending_ungranted` / `failed` / `timeout`. Consumes in the background (`:145`). |
| Server `/reconcile` | `src/profile-server/Routes.ts:1209-1283` | Per entry: token already in the ledger → pushed to `processedTokens` **with no grant and no owner check** (`:1236-1241`). Otherwise intent lookup → grant → push. Failing entries counted in `failedCount`. No caller identity at all. |
| Server `/complete` | `Routes.ts:1119-1202` | Token already in the ledger → `200 {success, purchaseToken}` (`:1146-1153`). Otherwise grant to the intent's player. |
| Who listens to the reconcile event | `src/client/CitizenshipCard.ts:189,210`; `src/client/components/NewsButton.ts:45,65` | The card re-reads the profile; the inbox button re-fetches. |
| Guest flow uses the result | `src/client/PurchaseCoordinator.ts:238-253`, `:340-348` | `processed`/`none` → may continue; `pending_ungranted` on a tap → `earlier_purchase_pending`. |
| Signed list read | `FlashistFacade.ts:2095-2113` | Empty array → `none` (no POST). Otherwise → `signed`. |
| Signature parsing | `src/profile-server/YandexSignature.ts:85-87` | The envelope `{algorithm, issuedAt, data}` is unwrapped and **`issuedAt` is dropped**; each entry keeps only token, product and `developerPayload` (`:26-30`). The documented `status` field is dropped too. |

**What would break if we only deleted the two consume calls:**
1. Every load of every buyer would get its token back as `processedTokens` → `PURCHASES_RECONCILED_EVENT` → a card
   re-read and an inbox re-fetch on **every** load, for nothing.
2. `reconcileNow` would answer `processed` for a purchase that is merely held. That is harmless in the guest flow
   today, but it is a false signal.
3. A buyer whose login now lands on a **fresh** profile (`0424`) would see his old token answered as "processed", with
   no grant to his new profile. His card then offers **Buy** again, and he can be **charged twice**. Today that cannot
   happen, only because his old token is already gone.

---

## 4. Proposed design

### 4.1 Overview

```
 client (every load, and the guest flow's reconcileNow)
   getPurchases(signed) ──► POST /v1/payments/yandex/reconcile  { signature }
                              + Authorization: Bearer <session>   ◄── NEW, optional, only if a session is held
                                   │
 profile server, per entry:        ▼
   token unknown ────────────────► grant via intent (today)          → grantedTokens (+ consumeTokens if consumable)
   token held by caller / no caller ► nothing                         → consumeTokens only if consumable
   token held by ANOTHER profile,
     caller vfy:true ────────────► nothing granted, nothing moved     → heldElsewhere: [productId]
                                    upsert purchase_holder_sightings  (evidence for 0503)
     caller vfy:false ───────────► treated as "no caller" (privacy, G8)
   + shadow logs/metrics: issuedAt present? age bracket; entry status values; outcome counters
                                   │
 client                            ▼
   consume ONLY consumeTokens      ·  PURCHASES_RECONCILED_EVENT ONLY if grantedTokens non-empty
   heldElsewhere → per-page store → offer "held_elsewhere" → no Buy, a line + contact; analytics
```

### 4.2 Decision A: which products stop being consumed

- **Permanent = `kind` is `citizenship` or `durable_item`.** Never consumed. Today that is `citizenship` only
  (`src/core/profile/PaymentsContract.ts:22`). `0496`'s durable items (the `0486` styles, later `0010`/`0011`) follow
  automatically.
- **Consumable = a future `consumable` kind** (coins, XP packs, a name change). Consumed after the grant, as today.
  ⚠️ Such a purchase also makes the buyer a paid citizen (rule 2, `0477` batch 1 answer 2). That citizenship then rests
  on our database alone, as everyone's does today. Accepted; it is re-raised when the first consumable is designed.
- **No separate per-product flag.** The rule is derived from `kind` in one pure function in `src/core`, so it cannot
  disagree with the grant registry. A product added with a new kind fails to compile until it is classified.

### 4.3 Decision B: the server owns the policy; the client consumes only what the server lists

The **server** decides what may be consumed and says so in each response. The **client** consumes only tokens the
server names. Why server-owned:
- **The safe default is "consume nothing".** No consumable exists today, and a purchase left unconsumed loses nothing
  (it stays in `getPurchases()`; reconcile is idempotent by token, `Routes.ts:1236-1241`). So a **new** client talking
  to an **old** box, which sends no consume list, consumes nothing. That is correct.
- **The safety switch (G7) is a box setting, not a game deploy. Kept, revision 2, on engineering grounds.** The env
  switch `PAYMENTS_CONSUME_PERMANENT` (default **off**) makes the server list permanent tokens as consumable again,
  restoring today's behaviour for every new client.
  - **Why keep it now that no moderation review applies** (owner, 2026-10-26: our iframe updates skip per-update
    moderation):
    1. A game redeploy does **not** reach pages already open, and players keep a page open for hours. A box setting
       reaches every open page on its **next reconcile**.
    2. The things it guards against are not about moderation: a defect in the new held-elsewhere path, T3 failing
       **after** release (purchase lists turning out per device), or a platform change in how unconsumed purchases
       behave.
    3. It costs almost nothing: the server owns the policy anyway (the `consumeTokens` list), so the switch is one
       boolean on the policy function, one env var forwarded by the deploy (config parity), and one route test.
  - ⚠️ **It is a one-way door per token.** Turning it on makes clients consume, and a consumed purchase is deleted on
    Yandex's side for good. Turning it back off does not bring those purchases back. So it is an **operator action the
    owner takes deliberately**, written in the profile-box runbook with that warning. It is not something to toggle for
    a test on live.
  - **Rejected alternative:** hard-code the policy and roll back by redeploying both sides. Slower to reach open pages,
    and it saves only the few lines above.
  > **R3, 2026-10-26 — the mechanism changed (ADR-127; owner: *"settings that we can change in the source files and
  > when the redeploy happens, this settings is taken into account"*).** Read "box setting" and "env switch
  > `PAYMENTS_CONSUME_PERMANENT`" above as: the committed constant `CONSUME_PERMANENT_PURCHASES` in
  > `src/profile-server/ConsumePermanentSetting.ts`, shipped `false`. Reason 3's *"one env var forwarded by the deploy
  > (config parity)"* is gone: there is no env var, no deploy forwarding, nothing remembered on the box, and config
  > parity has nothing to check. A test pins the value off, so a flip edits the constant **and** that test in one
  > commit, then the **profile box** is redeployed; the boot log prints the value in force. Reasons 1 and 2 stand: it
  > still needs no game deploy and reaches every open page on its next reconcile. The one-way-door warning stands, as
  > the comment beside the value; ⚠️ the "profile-box runbook" line above was planned for the deploy script's header and
  > went with the env var, so no runbook names the switch today (§14 item 7). The rejected alternative above stays rejected: this setting lives on the
  > server, so only the profile box is redeployed. New costs (ADR-127): a flip is a commit plus an image build plus a
  > profile-box deploy, slower than an env edit; and any profile-box deploy applies the deployed commit's value, so
  > deploying an older commit or rolling back the image during an emergency turns it off again.
- **Old clients are unaffected.** They keep reading `processedTokens`, which keeps its exact meaning, and keep consuming
  as today until the game deploy replaces them. That is the status quo, not a regression (§9).

### 4.4 Decision C: the reconcile answer separates "granted now", "held by you" and "held elsewhere"

The new response fields are listed in §5. The client:
- dispatches `PURCHASES_RECONCILED_EVENT` **only when `grantedTokens` is non-empty** (fixes G3's refresh churn);
- consumes `consumeTokens` only;
- feeds `heldElsewhere` into a per-page store (§4.6);
- `reconcileNow` answers **`processed` only for fresh grants**. A held purchase answers `none`. A new answer,
  `held_elsewhere`, is added (§5).

Fallback when the box predates S1 (no `grantedTokens` field): the client keeps today's signal rule
(`processedTokens.length > 0`) and consumes nothing.

### 4.5 Decision D: caller-aware reconcile, verified only

- The client attaches its Bearer token to `/reconcile` **only if a session is already held** for the current Yandex id.
  The boot pass awaits `ensureSession()` once (it never retries after a failure, by the login rule D3) before posting. With no
  session, it posts without a token, exactly as today.
- The server resolves the caller with an **optional** variant of `resolveCaller` (`Routes.ts:561-584`):
  - absent, invalid or expired token → **no caller**. The request is never refused for its token, and an absent token
    must not count as a rejection in the session metrics;
  - `vfy:false` → **no caller** as well (G8). Anyone can mint `vfy:false` for an id they merely claim, so comparing
    that claimed id with a receipt's holder would answer "is this purchase that id's", a paid-status leak;
  - `vfy:true` → the caller's internal player id, used only to compare with the receipt's `player_id`.
- **Same profile, or no caller** → quiet (`held` in the counters). **Different profile and verified** → `heldElsewhere`,
  plus a sighting row (§6.2). Nothing is granted, moved or revoked.

### 4.6 Decision E: what the player sees when his purchase is held by another profile

- A per-page client store `heldElsewhereProducts: Set<PaymentProductId>`, filled by both reconcile passes. A change is
  announced on the existing `PURCHASE_OFFER_CHANGED_EVENT` (its string is today's
  `geoconflict-citizenship-offer-changed`).
- `PurchaseProfileSnapshot` gains `heldElsewhere: ReadonlySet<PaymentProductId>`. `derivePurchaseOffer` gains an
  offer kind **`held_elsewhere`**, ranked **after** `owned` (a profile that owns it shows owned) and **before** `buy`.
  It applies to both kinds (citizenship, durable item).
- The surfaces (card, explainer popup, later item shops) show **no Buy button**, only a line: *"You already bought this
  on another game profile. Contact us and we'll move it to this one."* (en + ru; final wording at S2's plan), plus the
  support contact. Reuse `0507`'s contact links if they have landed by S2's build; otherwise the existing feedback
  entry point. S2's plan names which.
- **Coordinator:** new end state **`held_elsewhere`** in `PurchaseFlowState` / `PurchaseRequestResult`:
  - guest flow: `prepareAfterLogin` (`PurchaseCoordinator.ts:238-253`) returns `not_ready` on `held_elsewhere`; the
    fresh read then derives `held_elsewhere` and the flow ends there. A tap re-check (`:340-348`) answering
    `held_elsewhere` ends the same way. Then the existing login-rule D3 hand-off after the end-line delay, as for
    `already_owned`;
  - logged-in path (`runLoggedIn`, `:203-235`): reads the snapshot, so it blocks once the boot pass has answered. ⚠️
    **A tap before the boot pass answers is not covered.** That is the same gap `0501` closes for `pending_ungranted`;
    `0501` should treat `held_elsewhere` as a block too (§8).
- **Never revokes anything** (G4), and never changes a profile the player can see except this product's Buy area.

### 4.7 Decision F: shadow measurement, so payload freshness and refund behaviour are known from our own data

S1 logs and counts, without changing behaviour:
- for each reconcile and complete payload: is the envelope `issuedAt` present, and its age bracket (the same brackets
  ADR-121 used for logins);
- for each entry: the value of the documented `status` field, as a fixed label;
- reconcile outcomes per entry: `granted`, `held`, `held_elsewhere_verified`, `held_elsewhere_unverified` (a count
  only: no sighting, no answer), `held_no_caller`, the skip reasons, `failed`.

Logs carry **labels and counts only**, never a token, payload, id or signature (as task `0309` does,
`Routes.ts:1131-1137`).

---

## 5. Interfaces and contracts (stubs in the spec only; nothing in `src/`)

```ts
// src/core/profile/PaymentsContract.ts: additive.
export type ProductKind = "citizenship" | "durable_item"; // a future "consumable" is added with its first product

/** Permanent products are never consumed (ADR-126). Pure; the server is the one caller that decides. */
export function isPermanentProductKind(kind: ProductKind): boolean {
  throw new Error("not implemented"); // TODO(coder): citizenship, durable_item → true
}

// PurchaseCompleteResponseSchema gains (optional, so an old client ignores it):
//   consume: z.boolean().optional()
//     true  = the client may consume purchaseToken
//     false/absent = it must NOT (an absent field = an old box: consume nothing)

// PurchaseReconcileResponseSchema gains (all optional; processedTokens unchanged for old clients):
//   grantedTokens: z.array(z.string().min(1)).optional()   // fresh grants in THIS call; the only "processed" signal
//   consumeTokens: z.array(z.string().min(1)).optional()   // the only tokens a new client may consume
//   heldElsewhere: z.array(PaymentProductIdSchema).optional() // product ids held by another profile than the
//                                                             // VERIFIED caller; product ids only (no token, no id)
//   failedCount (unchanged)
// processedTokens keeps today's exact meaning (every token processed or granted), for clients that predate S2.
```

```ts
// src/client/PaymentsReconciliation.ts: changed result.
export type ReconcileNowResult =
  | "processed"        // a FRESH grant happened (grantedTokens non-empty)
  | "none"             // nothing granted; held purchases are "none"
  | "held_elsewhere"   // NEW: ≥1 product held by another profile (verified caller); no payment may go on
  | "pending_ungranted"
  | "failed"
  | "timeout";
// Precedence when several apply: pending_ungranted > held_elsewhere > processed > none.

/** Per-page store, filled by both passes. Read by the card's PurchaseProfileSnapshot. */
export function getHeldElsewhereProducts(): ReadonlySet<PaymentProductId> {
  throw new Error("not implemented"); // TODO(coder)
}
```

```ts
// src/client/PaymentsApiClient.ts: reconcile gains an optional Bearer. NEVER starts a login by itself.
export type ReconcileResult =
  | { kind: "ok"; processedTokens: string[]; grantedTokens: string[] | null; // null = old box
      consumeTokens: string[]; heldElsewhere: PaymentProductId[]; failedCount: number }
  | { kind: "failed" };
export async function reconcilePurchases(signature: string, sessionToken: string | null): Promise<ReconcileResult> {
  throw new Error("not implemented"); // TODO(coder): header only when sessionToken !== null; no 401 retry loop
}
// The update to the comment block at PaymentsApiClient.ts:78-81 says WHY the Bearer is optional, not required.
```

```ts
// src/client/PurchaseOffer.ts / PurchaseCoordinator.ts: additive.
//   PurchaseOffer       | { kind: "held_elsewhere" }
//   PurchaseFlowState   | "held_elsewhere"
//   PurchaseRequestResult | "held_elsewhere"
//   PurchaseProfileSnapshot.heldElsewhere: ReadonlySet<PaymentProductId>
//   ProductAnalytics.heldOnOtherProfile, .blockedOtherProfile (enum entries, §11)
```

```ts
// src/profile-server/YandexSignature.ts: additive; still never throws.
export interface VerifiedPurchase {
  purchaseToken: string; productId: string; developerPayload: string | null;
  /** The entry's documented `status`, as sent (shadow-logged as a label only). */
  status: string | null;
}
export interface VerifiedPayload {
  purchases: VerifiedPurchase[]; rawPayload: string; construction: HmacConstruction;
  /** The envelope's issuedAt in seconds; null when absent (shadow-measured first, §4.7). */
  issuedAt: number | null;
}
```

```ts
// src/profile-server/PaymentsRepository.ts: additive (S1).
export interface HolderSighting { purchaseToken: string; holderPlayerId: string; seenPlayerId: string;
  payloadIssuedAt: Date | null }
/** Upsert one verified sighting; best-effort (a failure is logged and never fails the reconcile). */
// recordHolderSighting(sighting: HolderSighting): Promise<void>
```

## 6. Data and state

### 6.1 Unchanged

`processed_purchases` (one `player_id` per token), `purchase_intents`, `player_entitlements`, the paid flags. **No row
is ever deleted or rewritten** by this design. `grantPaidPurchase` stays the single writer of paid state.

### 6.2 New: `purchase_holder_sightings` (S1 migration, next free number at build time: `011` today, after `0496`'s `010`)

```sql
-- One row per (token, verified profile that presented it while another profile holds it).
create table purchase_holder_sightings (
  purchase_token      text        not null,
  holder_player_id    uuid        not null,            -- processed_purchases.player_id when seen; no FK (as the ledger)
  seen_player_id      uuid        not null references players (id) on delete cascade,
  payload_issued_at   timestamptz,                     -- null = the payload carried none
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  seen_count          integer     not null default 1,
  primary key (purchase_token, seen_player_id)
);
```

- Written only for a **`vfy:true`** caller. Read by **no route**; the owner reads it over SSH, and `0503`'s dry run
  prints the sightings for the pair it is given.
- Volume: one upsert per load of an affected player only.
- Why a table and not a log line: logs rotate and are labels-only by rule. The owner needs a durable "profile N's
  verified page carried profile O's purchase", with dates, as evidence for a manual merge. It also gives a count of
  id-change cases **among buyers**, which is a partial `0424` detector.
- ⚠️ **Evidence, not proof.** A replayed old payload can plant a sighting (§6.4). The row keeps `payload_issued_at` so
  the owner can weigh it, and `0503` remains an owner judgement on several signals (`0502`'s checks).

### 6.3 One ownership rule, shared with `0503`

- `processed_purchases.player_id` names the profile the purchase was **granted to**. The paid flags and
  `player_entitlements` hold what that grant gave. **The three always move together**, and only through **one
  repository primitive** (`transferPurchase(token, fromPlayerId, toPlayerId)`), which **`0503` builds**. This design
  builds no move. Any future automatic move (D1 option 2, not picked 2026-10-26) would reuse it.
- **Move, never copy.** After a transfer the source holds neither the receipt nor its entitlement row.
  `is_paid_citizen` on the source is recomputed: true only if another receipt remains. `citizenship_purchased_at` is
  set from the remaining receipts, or null. `is_citizen` follows `citizenship_earned_at IS NOT NULL`
  (`migrations/006_player_identity.sql:80-85`, `chk_paid_implies_citizen`). A tester-role profile (`0425`) is refused
  or handled explicitly by `0503`'s plan.
- If `0503` ships as a `psql` script (its option a) rather than an image command (option b), its SQL must be that
  primitive's SQL, and a reviewer checks the two match. **Recommend option b** for that reason. `0503`'s plan rules it.

### 6.4 Replay and freshness (`issuedAt`)

- **Under D1 option 1 (ruled 2026-10-26), nothing moves**, so a replayed payload can at worst: block its sender's own re-buy
  of that product, and plant a sighting. No grant, no move, no revoke.
- **ADR-121's 24 h window is for signed player data**, which Yandex returns unchanged for the whole visit. It says
  nothing about purchase payloads. A `getPurchases()` payload is fetched immediately before the POST, so it should be
  seconds old, **unless Yandex caches it the way it caches player data. Unknown.** §4.7's shadow measurement answers
  that before anyone relies on a freshness window.
- **If the owner ever reopens D1 for option 2** (not picked 2026-10-26; kept for the record), the move needs all of:
  1. a `vfy:true` caller;
  2. `issuedAt` present and at most a window old (proposed 10 min, set from the shadow data);
  3. the holder profile **dormant**: no `player_identities.last_login_at` after the caller profile's `created_at`
     (two live profiles presenting one payload are two people, not one person with a new id);
  4. no earlier move of this token (needs a move log, which is the ADR-113 audit-table question `0503` answers anyway);
  5. the `transferPurchase` primitive.

  Its threat model: only someone who can fetch a fresh signed list **for the paying Yandex account** can move that
  purchase, so it can be moved to one's own other profile but not taken from someone else. That holds **only if
  `getPurchases()` is per account** (platform behaviour, unknown) and **not per device** (§10, T3).

---

## 7. Control flow, every case

| # | Case | Server | Client | Why it is safe |
|---|---|---|---|---|
| 1 | New permanent purchase via `/complete` | grant (today) → `consume:false` | no consume; restart prompt (ADR-125) | G1 |
| 2 | Paid, `/complete` failed; next load | token unknown → grant via intent → `grantedTokens`, not in `consumeTokens` | event once → card and inbox refresh | as today, minus the consume |
| 3 | Every later load, same profile | held → `processedTokens` only (legacy) | no event, no consume, `reconcileNow` = `none` | G3 |
| 4 | Load with no session (guest page, failed login, the login rule D3) | no caller → held, quiet | as 3 | today's behaviour |
| 5 | Verified login on a **different** profile than the holder (id change, if lists are per account) | `heldElsewhere:[product]`, sighting upserted, nothing granted or moved | store → offer `held_elsewhere`: no Buy, a line + contact; analytics | G5; `0424` rule kept |
| 6 | Same as 5 but `vfy:false` | treated as no caller → quiet; counted only | as 3 → the card may offer **Buy** | ⚠️ residual R2: possible second charge, unverified sessions only |
| 7 | Guest "Log in and buy", account holds the purchase on another profile | as 5 | `prepareAfterLogin` → `not_ready`; read → `held_elsewhere` → end, then the login-rule D3 hand-off | no payment window opens |
| 8 | Logged-in tap before the boot pass answered, case 5 | — | today's path → payment window may open | ⚠️ residual R3 → `0501` |
| 9 | Purchase **missing** from the list (SDK failure, refund, other account) | nothing | nothing | G4, never revoke on absence |
| 10 | Refunded purchase **still listed**, with some `status` | today's handling (held → quiet; unknown token → grant via intent); `status` shadow-logged | as 3 | no behaviour change; the shadow `status` counts show whether refunds stay listed (§10.2) |
| 11 | ~~`PAYMENTS_CONSUME_PERMANENT=on`~~ **R3:** `CONSUME_PERMANENT_PURCHASES = true` committed and the profile box redeployed (safety switch; one-way per token) | permanent tokens also go in `consumeTokens`; `/complete` → `consume:true` | consumes as today | G7 |
| 12 | Old client, new box | `processedTokens` unchanged | consumes everything as today; heldElsewhere ignored | status quo |
| 13 | New client, old box | no new fields | consumes nothing; signal = `processedTokens.length > 0` (today's rule) | safe default |
| 14 | Kill switch `0236` off | — | no reconcile (unchanged) | unchanged |
| 15 | Unknown product id in the list | skipped as today (registry miss → entry failure, `failedCount`) | `pending_ungranted` rules as today | R2 of `0019` kept |
| 16 | A buyer with many permanent purchases | the signed list grows with every item | — | ⚠️ residual R5: body bound 65,536 (`PaymentsContract.ts:87-89`), roughly 100+ entries |

---

## 8. Clashes with existing designs, each named

| Existing | Clash | Resolution |
|---|---|---|
| Shared-flow spec `2026-10-24-design-shared-purchase-flow.md` §3 ("Consume only after the grant"), §4.2 ("Reused unchanged: … consume-after-grant"), §4.3 step 10 and the sequence diagram (`consumePurchase(token)`), §5 `runProductPurchase` stub ("intent → frame → /complete → consume"), §7 row "Paid, but `/complete` failed" ("stays unconsumed → next session's reconcile grants it") | They assume every purchase is consumed after the grant. | **Superseded on this point by ADR-126:** consume only what the server lists. Grant-before-consume stays true for consumables. §7's row still holds (the grant still lands). The approved spec is history and is not edited; ADR-126 records the change. |
| Shared-flow spec §6, "The receipt ledger … is **not** the ownership source" | This design reads `processed_purchases.player_id` as "who it was granted to". | Consistent: the receipt says who **received** the grant, and ownership stays in the flags and entitlements. §6.3 keeps the three in step. |
| `grantPaidPurchase` as the single writer of paid state | None under option 1 (no new writer). | Unchanged. Under option 2, or `0503`, `transferPurchase` becomes a **second** writer: ADR-113-scope, recorded with `0503`'s answers. |
| `processed_purchases`, one `player_id` per token (migration `006`) | Kept. | One holder per receipt is exactly move-never-copy. The sightings table holds the "also seen at" facts instead of a second owner. |
| ADR-113 §3 (no public route accepts a player id), §5 (verified session) and account linking deferred; `0424` "never an automatic merge" | Detection compares ids **server-side** only. Nothing is linked or moved. | No conflict: the owner ruled D1 = option 1 (2026-10-26), *"Never-auto-merge rule stays."* |
| ADR-121 (24 h freshness for login signatures) | None. | Purchase payload freshness is separate and measured first (§6.4). |
| ADR-125 / `0495` (B3): `reconcileNow` result drives auto-continue; `0501`'s logged-in re-check | `processed` used to include held tokens; a new `held_elsewhere` answer. | `processed` = fresh grants only; `held_elsewhere` → `not_ready` → the read ends at `held_elsewhere`. **`0501` must treat `held_elsewhere` like `pending_ungranted` (block).** A note for `0501`'s plan, not a dependency (the owner ruled "Nothing waits on it"). |
| `0503` merge tool | It moves receipts too. | One primitive, one rule (§6.3). `0503`'s dry run prints the sightings as evidence. |
| `0019`/Sprint-4 design (`sprint4-yandex-payments-findings.md` §"Consume flow": *"keeping it unconsumed adds noise rather than value"*) | Reversed. | The reasoning assumed our database is always reachable for the right player; `0424` and the affected player show it is not. No ADR recorded that choice; ADR-126 does now. |
| Verify task `0493` | Its live check expects citizenship to be granted **and consumed**. | The producer updates `0493`'s check: granted and **not** consumed (or folds it into S1v). |

---

## 9. Rollout with the held deploy

**Ruled:** `0491`, `0492`, `0494`, `0495`, `0496` ship together with this build ("Hold it"). This design changes these
pieces of that held code:

| Held piece | What changes |
|---|---|
| `0492` (B1): `/reconcile` per entry, `failedCount`, `becamePaidCitizen` | `/reconcile` gains the optional caller, `grantedTokens` / `consumeTokens` / `heldElsewhere`, sightings, shadow counters. `/complete` gains `consume`. The per-entry isolation and `failedCount` are kept as they are. |
| `0494` (B2): `ProductPurchase`, offer, coordinator, `ProductClientConfig` | `ProductPurchase` consumes only on `consume:true`. `derivePurchaseOffer` gains `held_elsewhere`. Coordinator logged-in path ends on it. New config analytics entries. |
| `0495` (B3): `reconcilePurchasesNow`, guest flow, tap re-check | `ReconcileNowResult` gains `held_elsewhere`; `processed` = fresh only; no consume of permanent tokens; `prepareAfterLogin` and the tap re-check end on it. |
| `0496` (B4): entitlements | None in code. Durable items become permanent by kind. |
| `0491` (rewarded XP) | None. Only the migration number order: `009` (0491) → `010` (0496) → `011` (S1). |

**Order:** either order is safe (§7 rows 12–13).

> **R3, 2026-10-26 — there is no dev profile box (owner: *"We don't have the dev profile server, so if we need to it
> test, we better test it on our prod profile server"*; ADR-127 Decision 5).** The revision-2 order below assumed one.
> **The order now:**
> 1. The **live** profile box: S1 (`0506`) plus `0491`/`0492`/`0496` and migrations `009`, `010`, `011`. Safe alone:
>    today's live game behaves as today (§7 row 12).
> 2. S1v (`0511`) right after that deploy.
> 3. The dev **game** box gets S2 (`0510`) plus `0494`/`0495`/`0488`. The owner's T1–T3 (§10.3) run on the Yandex-side
>    test copy that loads it, **against the live profile box** (`0512` part a). **T3 failing stops the game half.**
> 4. The live game deploy (S2 plus `0494`/`0495`/`0488`).
>
> What this changes: the profile half of the held bundle goes live **before** T3 has run, so the gate can stop only
> the game half; and the checks' test purchases and shadow counts land in the **live** profile database and metrics
> (test accounts only). Steps 1 and 4 fit one weekend slot only if T1–T3 fit between them; otherwise the box goes
> first and the game follows (the producer's schedule).

**Superseded by R3 above — the revision-2 order, kept for the record (test setup per the owner's 2026-10-26
answer):**
1. The **dev box** gets the whole bundle, **S1 first**, then S2, with the held `0491`/`0492`/`0496` and
   `0494`/`0495`/`0488`.
2. The owner's pre-release checks T1–T3 (§10.3) on the **Yandex-side test version that loads the dev box**. **T3
   failing stops the release.**
3. The live profile box (S1 plus `0491`/`0492`/`0496`). It is safe alone: old clients behave as today.
4. The live game deploy (S2 plus `0494`/`0495`/`0488`).

Steps 3–4 go in one weekend slot. The dev-box checks come before it. Then the
verify tasks: `0493` (wording updated), `0497`, `0498`, `0499`, S1v, S2v.

**Config parity:** ~~`PAYMENTS_CONSUME_PERMANENT` is a new env var that the profile server reads. The deploy scripts run
`check:config-parity --enforce` (task `0298`), so S1 must forward it in the profile deploy path, or the deploy stops.~~
**R3, 2026-10-26 (ADR-127):** nothing to forward. The switch is the committed constant `CONSUME_PERMANENT_PURCHASES`
in `src/profile-server/ConsumePermanentSetting.ts`; the profile server reads no env var for it, so S1 adds no
config-parity entry and touches no deploy script (as built: `REQUIRED 0`). `check:config-parity --enforce` (task
`0298`) still runs in the deploy scripts as before.

**No moderation gate.** Our game updates ship through the iframe without a per-update moderation review (owner,
2026-10-26). The only release gate is our own pre-release checks (§10.3). If T3 fails, the game half of the held bundle
does not ship as is.

---

## 10. Safeguards and the platform unknowns

> **Owner rulings, 2026-10-26 (verbatim in the header):** we do **not** ask Yandex about our implementation, and our
> game updates ship through the iframe **without a per-update moderation review**. So there is no review gate for this
> change. Everything in this section is **our own** engineering safeguard: our reading of the public docs, our
> pre-release checks, and our server switch.

### 10.1 What the public docs say (read 2026-10-26), for the record

- The SDK page (sdk-purchases) names permanent purchases as a supported type handled with `getPurchases()`, and asks
  every game to check for unprocessed purchases at launch. **We keep that check** (boot reconcile).
- Requirement 1.13.1 reads *"Подключен метод консумирования."* `consumePurchase` stays wired after this change (for
  consumables, and through the safety switch). Owner, 2026-10-26: updates are not re-moderated, so this is noted, not
  gated on.
- The signed example carries `issuedAt` and a per-entry `status`, and **no user id**.

### 10.2 Platform unknowns: what each possibility changes

These are facts about **how the platform behaves for a player**. **Nothing here is asked of Yandex by this design**, and
the design waits on none of them (D2, ruled). They are learned from our own pre-release checks (§10.3) and the shadow
data (§4.7). `0508` asks Yandex nothing about our implementation. Owner, 2026-10-26: *"Keep Q2, drop others"*. So the
purchase-list-scope question (Q2) **will be asked**, as a question about the player's situation, and the moderation
(Q3) and refund (Q4) questions are dropped. **Q2's answer is used when it arrives; nothing waits on it.**

| Unknown | Possibility A | Possibility B | Safe either way? |
|---|---|---|---|
| `getPurchases()` per **Yandex account** or per **game id**? | **Per account:** detection works for id changes. The affected-player class becomes visible and blockable. | **Per game id:** after an id change the new id lists **nothing**, so detection never fires for that case. Still gained: a quiet idempotent reconcile, and the purchase stays on Yandex's record. **Lost: all id-change value.** | Yes. The ruled design does nothing harmful under B. We may never learn which holds; the sightings table (§6.2) showing rows at all is the first sign of A. |
| Per **device/browser**? (T3.) | — | **Per device:** a second Yandex account in the same browser would see the first account's purchase. The design then **wrongly blocks** that second person's buy of the same product, and plants false sightings. | A nuisance, caught by T3 before release. **T3 failing blocks the release.** |
| Does a refund remove the purchase from the list? (Shadow `status` counts.) | Removed → absence never revokes (G4). Refund handling stays manual, as today. | Kept with a `status` → the shadow counts show the values. A later change may refuse to grant a refunded token. **Never revoke** without an owner decision. | Yes. No behaviour depends on it yet. |
| Can `getUniqueID()` change for the same account? | Feeds `0424` (and whatever `0508` asks about the player), not this design. | — | — |

### 10.3 Pre-release checks (owner-run; our own, not a Yandex procedure)

**Where (owner, 2026-10-26: "Test copy on the dev server"):** the **Yandex-side test version of the game, which loads
our dev box**. The dev box runs **S1 first**, then S2 (and the rest of the held bundle). The owner's **test accounts**
and Yandex **test purchases** are used throughout. Nothing reaches the live boxes before these checks pass.

> **R3, 2026-10-26 — there is no dev profile box (owner, verbatim in the revision log; ADR-127).** The test copy loads
> the dev **game** box running S2, which talks to the **live** profile box, where S1 is already deployed (§9, R3
> order). So the last sentence above now reads: nothing reaches the **live game** before these checks pass; the profile
> half is already live. T1–T3's test purchases are recorded in the live profile database. ⚠️ Not verified from the
> repo: that the dev game box's `PROFILE_API_URL` (box config, `.env.<env>`, written by `deploy.sh:503`) is set to the
> live profile box (§14 item 1). Origin is not a blocker: the profile box allows any origin
> (`src/profile-server/Routes.ts:317`, `:535`).

- **T1 (permanent stays):** buy citizenship. It is granted and the restart prompt shows. Reload 3×:
  - the reconcile POST is still made on each load (network tab);
  - the card shows owned with **no** flicker or "checking";
  - the inbox gets no second welcome;
  - no restart prompt appears on reload.
- **T2 (interrupted purchase):** pay, then close the tab before `/complete` lands. Reopen: granted by reconcile, the
  card refreshes once. Reload: quiet.
- **T3 (scope across accounts): RELEASE BLOCKER.** In the **same browser**, switch to a second Yandex account the
  owner controls, and load the game. The first account's purchase must **not** appear: no `held_elsewhere` line, and
  no reconcile POST if that account bought nothing. **If it appears, stop: the list is per device. Do not release the
  game half as is; report to the architect.**
- **T4 (held elsewhere), only if the owner can produce two profiles for one account** (for example with `0503`'s tool
  on test data). Otherwise S2's tests cover it, and this live path stays unproven (named in S2v).
- The safety switch is **not** exercised live (it is one-way per token, §4.3). S1's route tests cover it.

**What blocks the release:** T3 failing (the owner's named blocker), and T1 or T2 failing (each is a defect in this
change, fixed before release). There is no moderation step and no rejection path (owner, 2026-10-26).

---

## 11. Analytics (client enum; per product through `PRODUCT_CLIENT_CONFIG`)

| Enum key (citizenship family) | String | When |
|---|---|---|
| `PURCHASE_HELD_ON_OTHER_PROFILE_CITIZENSHIP` | `Purchase:HeldOnOtherProfile:Citizenship` | A reconcile pass (boot or now) reported this product held by another profile for this **verified** login. At most once per page per product. No value. |
| `PURCHASE_BLOCKED_OTHER_PROFILE_CITIZENSHIP` | `Purchase:Blocked:OtherProfile:Citizenship` | A purchase flow (tap, or the guest auto-continue) ended at `held_elsewhere`. No payment window. No value. |
| `UI:Tap:<id>` (existing pattern) | e.g. `UI:Tap:ContactSupportOtherProfile` | Only if the line carries a contact button. S2's plan names the id. |

**Changed descriptions** in `analytics-event-reference.md`:
- `Purchase:Completed:Citizenship`: "fires before the best-effort `consumePurchase` call" → no consume for permanent
  products unless the server's safety switch is on.
- `Purchase:Continue:NeedsTap:*`, `Purchase:Blocked:*`: add the `held_elsewhere` exit to the funnel note.

Durable-item families get their entries with the item builds (§4.2 of the shared-flow spec), as today.

**Server side (not analytics; the existing profile metrics module, its own naming):** reconcile outcome counter per
label (§4.7); `issuedAt` presence and age bracket; entry `status` label counts. Labels only.

---

## 12. Proposed build split (for the producer; it may replace `0506`)

| # | Task | Ships | Depends on | Entry gate |
|---|---|---|---|---|
| **S1** | **Profile box:** `isPermanentProductKind`; `/complete` `consume`; `/reconcile` optional verified caller, `grantedTokens` / `consumeTokens` / `heldElsewhere`, `processedTokens` unchanged; ~~`PAYMENTS_CONSUME_PERMANENT` (default off) wired through the deploy (config parity)~~ **R3 (ADR-127):** the committed constant `CONSUME_PERMANENT_PURCHASES = false` in `src/profile-server/ConsumePermanentSetting.ts`, a test pinning it off, a boot-log line naming it; no env var, no deploy forwarding; `YandexSignature` exposes `issuedAt` + entry `status`; migration `011_purchase_holder_sightings.sql` (next free number at build time) + best-effort upsert, verified only; shadow counters and labels-only logs. Unit + route + integration tests (*Testing strategy*, below). | profile-box deploy (with the held `0491`/`0492`/`0496`); **R3: the live box, first** (there is no dev profile box) | 0505 approved | spec approved; D1 ruled — **met** (2026-10-26) |
| **S2** | **Client:** consume only `consumeTokens` and `consume:true`; reconcile event only on `grantedTokens` (old-box fallback); optional Bearer on reconcile, boot pass awaits `ensureSession()` once; `ReconcileNowResult` `held_elsewhere`, `processed` = fresh only; held-elsewhere store; `derivePurchaseOffer` `held_elsewhere`; coordinator end state (guest, tap re-check, logged-in); card + explainer line + contact (en + ru); analytics enum + reference. Tests. | game deploy (with the held `0494`/`0495`/`0488`) | **S1** (shared contract; build after S1's contract lands) | S1's contract merged |
| **S1v** | Verify S1 live: migration `011` applied; a reconcile with a held token answers quietly; counters move; no token, id or payload in logs; `/complete` answers `consume:false` for citizenship. **R3:** the boot log reads `payments consume-permanent: OFF (ConsumePermanentSetting.ts)` (there is no env var to read). Runs right after S1's live deploy, before S2v (a). Folds in `0493`'s updated wording, or is checked alongside it. | — | S1 | S1 deployed |
| **S2v** | Owner-run, two parts. **(a) Before the live deploys:** the §10.3 pre-release checks T1–T3 (T4 if possible) on the Yandex-side test version that loads the dev box ~~(S1 then S2 on the dev box)~~ **R3:** (S2 on the dev **game** box, against the **live** profile box where S1 already runs), with test accounts and test purchases. **T3 failing blocks the release** (R3: of the game half). **(b) After the live ~~deploys~~ game deploy:** on live, a test purchase stays listed and reloads are quiet (T1 repeated), and the server counters move. Results recorded with the owner's words. | — | S1, S2 | (a) ~~S1 and S2 on the dev box~~ **R3:** S1 live on the profile box and S1v done; S2 on the dev game box; (b) both deployed live |

- **Order:** S1 → S2 (code); ~~dev box (S1 then S2) → S2v (a) → live profile box → live game (§9)~~ **R3:** live
  profile box (S1) → S1v → dev game box (S2) → S2v (a) against the live profile box → live game → S2v (b) (§9, R3
  order). Verify tasks on **Sprint 9**, following the
  owner's OD-4 precedent for this purchase work (the producer confirms that with the owner; it is not assumed here).
- **No S3.** D1 was ruled option 1 (2026-10-26), so the automatic move is not filed. §6.4 keeps its rules only for
  the record, in case the owner ever reopens D1.
- **Knock-ons for the producer:** `0493`'s check wording (consumed → not consumed); `0501`'s plan gets a note (treat
  `held_elsewhere` as a block); `0503`'s plan gets a note (one `transferPurchase` primitive; print sightings in the dry
  run; prefer option b); `0506` narrowed to S1 or S2, or cancelled with a pointer; `0508`'s question list re-checked
  against the owner's 2026-10-26 words (§14 item 6).

### Testing strategy

- **`src/core` (required):** `isPermanentProductKind` over every kind; a compile-time check that every
  `PRODUCT_DEFINITIONS` entry is classified; schema tests for the new optional fields (present / absent / old shape).
- **Server, routes (`tests/profile-server/PaymentsRoutes.test.ts`):** per case of §7, rows 1–5, 9, 11, 15:
  - held + same verified caller → no `heldElsewhere`, no sighting;
  - held + other **verified** caller → `heldElsewhere:[citizenship]`, sighting upserted, **no** grant, **no** change to
    either profile;
  - held + other **unverified** caller → quiet, no sighting, counter only;
  - absent / invalid / expired Bearer → never refused, quiet;
  - `processedTokens` byte-for-byte as today in every case;
  - the switch on → permanent tokens in `consumeTokens`, `consume:true` (R3: flipped through
    `PaymentsConfig.consumePermanent`, never the constant);
  - **R3:** the shipped constant is pinned off (`tests/profile-server/ConsumePermanentSetting.test.ts`), and the boot
    line names the state and the file;
  - a sighting write that throws → reconcile still answers 200 with the right fields;
  - no log line contains a token, payload or id (assert on the logger mock).
- **`YandexSignature`:** `issuedAt` present / absent / non-numeric; entry `status` passthrough; never throws.
- **Integration (`npm run test:integration`, real Postgres):** migration `011` through the runner; the upsert
  increments `seen_count` and `last_seen_at`; `seen_player_id` cascade on erasure; the ledger row is untouched.
- **Client:**
  - `ProductPurchase`: no consume when `consume` is false or absent; consume when true;
  - `PaymentsReconciliation`: event only on `grantedTokens`, consume only `consumeTokens`, old-box fallback, store
    filled, `reconcileNow` precedence;
  - `PaymentsApiClient`: Bearer only when a token is given, no login started;
  - `PurchaseOffer`: `held_elsewhere` ranks below `owned` and above `buy`, for both kinds;
  - `PurchaseCoordinator`: guest auto-continue, tap re-check and logged-in each end at `held_elsewhere` with **no**
    `runProductPurchase` call, plus the hand-off timing as for `already_owned`.
- **Harness caveats:** full runs through `npm test` (project lock, one worker); the supertest flake rule applies to
  the route suites.

---

## 13. Owner decisions (`NEEDS-DECISION`; the lead relays them)

**D1: RULED 2026-10-26 → option 1, "Block, record, you move it (Recommended)".** The owner's option text: *"No double
charge; 'contact us' line; evidence saved for the merge tool. Never-auto-merge rule stays. Knock-on: none (checked)."*
The options as they were put, kept for the record:
1. **Detect, block a second purchase, record evidence; the owner moves it by hand with `0503`.** ← chosen.
2. Move the purchase to the current profile automatically (self-service, §6.4 rules). Not chosen.
3. Detect and record only; do not block the re-buy. Not chosen.

**D2: RULED 2026-10-26 → option 1, "No, build and ship (Recommended)".** The owner's option text: *"Safe under any
answer; the draft-build test catches the danger. Knock-on: none (checked)."* The build and release do not wait on
`0508`. The options as they were put:
1. **No: build and ship with the held bundle.** ← chosen.
2. Yes: hold the release until Yandex answers. Not chosen.

**D3: WITHDRAWN 2026-10-26, it does not apply.** It asked what to do if a moderation review rejected the build. The
owner, verbatim: *"Our case is different: Yandex.Games doesn't check our every update, because we're working via iframe
and can update it without regular moderation proceedure."* There is no per-update review, so there is no rejection
path to plan for. What stays, as engineering safeguards: the pre-release checks (§10.3, **T3 blocks the release**) and
the server safety switch (§4.3).

Settled in the design, confirmed by the spec approval unless the owner objects:
- **Products:** citizenship + every durable item stop being consumed; consumables stay consumed (§4.2).
- **Never revoke on absence** (G4), and no behaviour keyed on refund `status` until the shadow counts (or anything
  `0508` learns) say how refunds appear.
- **Existing buyers:** nothing to do. Their purchases are already consumed and gone from Yandex. Any **unconsumed
  stray** (a failed consume) is held by its profile and becomes a quiet, permanent entry; if it is held by a different
  profile than the current verified login, it is detected like row 5 (a bonus, not a plan).

## 14. Open questions (not for the owner unless noted)

1. ~~**What test setup can run the new client inside Yandex before the live game deploy?**~~ **Answered by the owner,
   2026-10-26:** *"Test copy on the dev server"*. That is the Yandex-side test version that loads our dev box, with S1
   on the dev box first (§9, §10.3). ~~For S2's and S1's plans to confirm: the dev box's profile server takes migration
   `011` and the env var like live does.~~
   **R3, 2026-10-26:** moot. **There is no dev profile box** (owner, verbatim: *"We don't have the dev profile server,
   so if we need to it test, we better test it on our prod profile server"*), and there is no env var (ADR-127). S1
   and migration `011` go to the live profile box first (§9, R3 order). **Still open, for `0512` part (a) to confirm
   before T1–T3:** the dev game box's `PROFILE_API_URL` (box config in `.env.<env>`, not in the repo; `deploy.sh:503`
   writes it) points at the live profile box and is not blank. If it is blank, the test copy has no profile backend
   and T1–T3 cannot run. Origin is not a blocker (`Routes.ts:317`, `:535` allow any origin).
2. **Does the live envelope carry `issuedAt` at all?** `processed_purchases.raw_payload` stores the decoded JSON, so a
   read-only count (rows whose payload has a top-level `issuedAt`, counts only) answers it. That is a natural add-on to
   `0502`'s owner-run checks. Otherwise S1's shadow logs answer it after the deploy.
3. **The contact surface for the `held_elsewhere` line:** `0507`'s links, or the existing feedback entry. S2's plan.
4. **Wording of the line** (en + ru). S2's plan, owner review.
5. **The boot pass's `ensureSession()` bound:** confirm in S2's plan that a guest page resolves null quickly and never
   starts a login.
6. **`0508` and the `0505` brief (the producer's to edit, not the architect's).** Per `fkit-lead` (2026-10-26),
   `0508` asks Yandex nothing about our implementation. **Owner, 2026-10-26: "Keep Q2, drop others":** Q2 (purchase
   lists per account or per game id) **will be asked**; Q3 (moderation) and Q4 (refunds) are **dropped**. This design
   waits on none of the answers (D2, §10.2). Lines in the `0505` brief that are now out of date:
   - line 44–45, *"Moderation rule **1.13.1** requires a game to handle unprocessed purchases at launch"*;
   - line 52, *"This is unknown and is a question to Yandex (`0508`)"*. Still accurate (Q2 is kept); only add "the
     design does not wait on it";
   - line 83, *"(Question to Yandex, `0508`.)"* (refunds; Q4 dropped, so the shadow `status` counts answer it);
   - lines 85–86, item 6 *"Moderation. … propose a test on a **draft build** … what the release does if moderation
     rejects it"*;
   - line 109, *"unknown — needs Yandex (`0508`)"*;
   - line 113, verification step 3, *"the moderation test plan on a draft build"*;
   - line 124, *"Uses, not waits on: `0508`'s Yandex answers"*.
7. **R3, 2026-10-26: a runbook entry for the switch?** §4.3 and ADR-126 Decision 2 wanted the one-way-door warning
   in the profile-box runbook. The `0506` plan put it in the deploy script's header comment, which was dropped with
   the env var, so today only the comment in `ConsumePermanentSetting.ts` carries it; no runbook under
   `ai-agents/knowledge-base/` names the switch. Recommendation: one short entry (where the setting is, the flip
   procedure from ADR-127 Decision 2, the one-way warning, "keep the flip on `dev` until the emergency is closed")
   in an existing profile-box runbook, as part of `0506` or its close. Not an owner decision unless the producer
   wants one.

## 15. Residuals (named and accepted by the design; ADR-126 lists them)

- **R1, the affected player and the ~21 earlier buyers:** not helped (consumed). `0503`/`0504`.
- **R2, unverified sessions:** case 6. A buyer on a fresh profile with a `vfy:false` session can be charged twice. The
  price of G8 (privacy).
- **R3, a logged-in tap before the boot pass answers:** `0501` closes it.
- **R4, per-game-id lists:** no id-change value at all (§10.2).
- **R5, list size:** around 100+ permanent purchases per buyer would exceed the reconcile body bound. Re-raise when an
  item catalog makes that plausible.
- **R6, database restore:** a restore that loses intent rows leaves a listed permanent token unknown and ungranted
  (`unknown_intent` skip, `Routes.ts:1250-1253`). Granting it to a verified caller is a possible later extension with
  the same replay questions as option 2. Not designed.
- **R7, request cost:** one extra POST per buyer per load. The per-IP limiter (20/min, `Routes.ts:1041-1046`) under
  mobile CGNAT could return 429s once buyers number in the thousands. Re-raise trigger: reconcile 429s seen, then add a
  client-side "known-held" cache per Yandex id.

---

**Written:** this file and ADR-126 (accepted 2026-10-26). **R3 (2026-10-26):** ADR-127 (accepted; supersedes ADR-126
in part), an append-only ⛔ pointer in ADR-126, and the R3 notes in this file. `fkit-wiki` should ingest ADR-127 and
re-ingest this spec and ADR-126. **Wiki:** approved, so `fkit-wiki` should now ingest this
spec and ADR-126.
