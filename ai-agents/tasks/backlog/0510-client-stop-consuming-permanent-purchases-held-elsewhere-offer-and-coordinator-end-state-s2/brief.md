# Client: stop consuming permanent purchases — consume only what the server lists, quiet reloads, "held elsewhere" offer and coordinator end state (S2 of the 0505 design)

## ID
0510

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** Highest existing ID `0509` (backlog, done, cancelled);
> `0510`–`0512` allocated in sequence for S2, S1v, S2v.

## Sprint
Sprint 9

> 📌 **Filed 2026-10-26 on an OWNER RULING**, given via `AskUserQuestion` in the `fkit-lead` session and relayed to a
> spawned `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. Asked *"Approve the 0505 'stop
> consuming' design and ADR-126 as described?"*, the owner picked **"Approve (Recommended)"** — option text:
> *"ADR-126 becomes accepted; producer splits 0506 into profile-server and game build tasks, then planning starts."*
> This is the **game build task** of that split (spec §12 row S2). Sprint 9: the lead's instruction, consistent with the
> deploy-hold ruling *"Hold it"* (*"… All Sprint 9."*).

## Priority
37

> ⚠️ Priority 37 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0506`**, because it builds on S1's contract and the held game deploy waits on
> it. Appended after the board's highest rank (36), never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

The **client half** of the owner's *"we don't consume it anymore"*, per the approved spec
[`2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../../../knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md)
(revision 2) and [ADR-126](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md)
(accepted 2026-10-26).

- **The client consumes only tokens the server names** (`consumeTokens`, `consume:true`). With an old box (no new
  fields) it consumes nothing — the safe default (spec §4.3, §7 row 13).
- A kept purchase is in `getPurchases()` on **every load**. Reloads must be quiet: no card flicker, no inbox refresh, no
  restart prompt (G3).
- **D1, ruled 2026-10-26:** a purchase held by **another** profile for this verified login → **no Buy button**, a line
  telling the player to contact us, analytics. Nothing moves (spec §4.6).
- This edits **committed but undeployed** client code (`0494` B2, `0495` B3; `0488` ships in the same game deploy).
  Spec §9 lists what changes in each.
- **Entry gate (spec §12):** S1's contract merged (`0506`).

## What to build

Spec §12 row **S2**, with §4.3–§4.6, §5, §7, §9 and §11 as the detail. The coder's plan quotes the sections it
implements and lists any deviation for owner approval.

1. `ProductPurchase` consumes only on `consume:true`; `PaymentsReconciliation` consumes only `consumeTokens`.
2. `PURCHASES_RECONCILED_EVENT` fires **only** when `grantedTokens` is non-empty; old-box fallback = today's rule
   (`processedTokens.length > 0`) and consume nothing.
3. Optional Bearer on `/reconcile`, only when a session is already held; the boot pass awaits `ensureSession()` **once**
   (never retries, login rule D3). A guest page must resolve to "no session" quickly and never start a login (spec §14
   item 5 — the plan confirms the bound).
4. `ReconcileNowResult`: `processed` = fresh grants only; new `held_elsewhere`.
5. Per-page `heldElsewhereProducts` store, announced on the existing `PURCHASE_OFFER_CHANGED_EVENT`;
   `PurchaseProfileSnapshot.heldElsewhere`; `derivePurchaseOffer` gains `held_elsewhere`, ranked after `owned` and
   before `buy`, for both product kinds.
6. Coordinator end state `held_elsewhere` in `PurchaseFlowState` / `PurchaseRequestResult`: guest auto-continue, tap
   re-check and logged-in path each end there with **no** payment window, then the login-rule D3 hand-off as for
   `already_owned`.
7. Card and explainer: no Buy, a line + a contact. Wording in **both** `en.json` and `ru.json` via `translateText`; the
   plan proposes the final wording for owner review (spec §14 item 4). Contact surface: `0507`'s links if they have
   landed by this build, else the existing feedback entry — the plan names which (spec §14 item 3).
8. Analytics (spec §11): `Purchase:HeldOnOtherProfile:Citizenship`, `Purchase:Blocked:OtherProfile:Citizenship`, a
   `UI:Tap:<id>` only if the line carries a contact button; enum entries in `FlashistFacade.ts`, rows and the changed
   descriptions in `analytics-event-reference.md`.

## Verification steps

1. Spec §12 *Testing strategy* — the **client** part — each covered: `ProductPurchase` (no consume when `consume` is
   false or absent; consume when true); `PaymentsReconciliation` (event only on `grantedTokens`, consume only
   `consumeTokens`, old-box fallback, store filled, `reconcileNow` precedence); `PaymentsApiClient` (Bearer only when a
   token is given, no login started); `PurchaseOffer` (`held_elsewhere` below `owned`, above `buy`, both kinds);
   `PurchaseCoordinator` (guest auto-continue, tap re-check and logged-in each end at `held_elsewhere` with **no**
   `runProductPurchase` call, hand-off timing as for `already_owned`).
2. `src/core` changes (if any beyond S1's) are tested (project rule).
3. `en.json` and `ru.json` carry the new keys; the analytics reference lists the new events and the changed
   descriptions; strings follow `Category:Action[:Value]`.
4. `npm test` green through the npm script (project lock).
5. The live checks are **not** this task's: T1–T3 before release and the post-deploy checks are `0512` (S2v).

## Notes

- **Depends on:** 0506
- **Blocks:** 0512, 0497, 0498, 0499
- **Why `0506`:** S2 reads S1's response fields (spec §12, *"build after S1's contract lands"*). Same sprint.
- 📌 **Deploy hold carried over (2026-10-26).** OWNER RULING **"Hold it"** — option text: *"0493, 0497, 0498, 0499 then
  also wait on 0506 (design + ADR + build first). All Sprint 9."* — relayed; ⛔ not producer precedent. With `0506` now
  S1 only, the held **game** code (`0494`/`0495`/`0488`) ships with **this** task, so `0497`, `0498`, `0499` also list
  `0510`.
- **Release gate:** the game deploy waits for `0512` part (a) — the owner's T1–T3 on the Yandex-side test copy against
  the dev box (owner, 2026-10-26: **"Test copy on the dev server"** — *"There's a Yandex-side test version that loads our
  dev box."*). **T3 failing blocks the game deploy.**
- **Not this task:** the safety switch (server, `0506`); the merge primitive (`0503`); the logged-in tap before the boot
  pass answers (residual R3 → `0501`, which should treat `held_elsewhere` as a block).
- **Sequencing, not a dependency:** `0501` also edits `PurchaseCoordinator.ts`. Do not build both in one uncommitted
  working tree, so tests and review scopes do not mix.
- **Ships by:** a game deploy — weekend slot unless urgent (owner rule); committed is not deployed. Any game deploy from
  `dev` ships the held client code with it. Live check is `0512`, filed at the split.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in tests, fixtures or this folder.
