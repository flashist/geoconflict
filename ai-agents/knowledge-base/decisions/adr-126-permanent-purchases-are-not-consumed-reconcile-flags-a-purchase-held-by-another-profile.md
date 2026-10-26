# ADR-126: Permanent purchases are no longer consumed; reconcile flags a purchase held by another profile, and never moves it by itself

- **Status:** ✅ **accepted**, owner-approved **2026-10-26**. Promoted in place from `proposed`
  (`decisions/README.md`, *Immutability starts at `accepted`*): from here on the body is history, and a change of
  decision needs a superseding ADR.
  - **The approval, verbatim** (live via `AskUserQuestion` in the `fkit-lead` session, relayed verbatim by `fkit-lead`;
    the architect heard it by relay only). Question: *"Approve the 0505 'stop consuming' design and ADR-126 as
    described?"* → **"Approve (Recommended)"**. Option text: *"ADR-126 becomes accepted; producer splits 0506 into
    profile-server and game build tasks, then planning starts."*
  - **Same session:**
    - pre-release test setup → **"Test copy on the dev server"** (*"There's a Yandex-side test version that loads our
      dev box."*);
    - `0508` → **"Keep Q2, drop others (Recommended)"** (*"Ask only 'per account or per game ID?' besides the player
      questions."*).
  - D1 and D2 are ruled; D3 is withdrawn because it does not apply (2026-10-26).
- **Date:** 2026-10-26
- **Deciders:** the owner. Drafted by `fkit-architect`, spawned by `fkit-lead` (Sprint 9, task `0505`), with no owner
  channel; every ruling below arrived by relay.
- **Owner rulings it starts from** (2026-10-26, relayed verbatim by `fkit-lead`): *"Merge tool + stop consuming"*; deploy
  hold *"Hold it"*; the owner's words *"changing the in-app processing in a way that we don't consume it anymmore."*
- **Owner rulings on the design** (2026-10-26, live via `AskUserQuestion` in the `fkit-lead` session, relayed verbatim):
  - **D1** → *"Block, record, you move it (Recommended)"*. Option text: *"No double charge; 'contact us' line; evidence
    saved for the merge tool. Never-auto-merge rule stays. Knock-on: none (checked)."*
  - **D2** → *"No, build and ship (Recommended)"*. Option text: *"Safe under any answer; the draft-build test catches
    the danger. Knock-on: none (checked)."*
  - **D3: not decided.** The owner typed instead (verbatim, typos kept): *"We're not asking Yandex.Games about how to
    implement it. We're not doing anything wrong here, we're just not consuming the purchases that already happened.
    So we should not even ASK about our iplementation them, what we can and should ask about is something about the
    user and why this situation happened."* Applied: nothing in this ADR plans to ask Yandex about our implementation.
    D3 (what to do if a routine moderation review rejects the build) is re-worded in the spec, §13, and is back with
    the owner.
  - **D3, follow-up the same day (typed in the `fkit-lead` session, verbatim):** *"Our case is different: Yandex.Games
    doesn't check our every update, because we're working via iframe and can update it without regular moderation
    proceedure."* Applied: there is no per-update moderation review, so the "review rejects the build" path does not
    apply, and **D3 is withdrawn**. This ADR has no moderation gate. Our own pre-release checks gate the release, with
    T3 as the blocker. Per `fkit-lead`: `0508` asks Yandex nothing about our implementation, its moderation question
    (Q3) is retired, and its purchase-list-scope question (Q2) is parked pending the owner. *(Later the same day the owner
    kept Q2 and dropped the rest; see the Status bullet.)*
- **Design:** [`../reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md).
- **Citation frame:** `dev` at `aca097e1`, 2026-10-26 (holds the undeployed `0491`, `0492`, `0494`, `0495`, `0496`).
- **⛔ Superseded in part by [ADR-127](adr-127-consume-permanent-switch-is-a-committed-source-setting-s1-goes-to-the-live-profile-box-first.md),
  2026-10-26** (owner rulings, relayed by `fkit-lead`: the switch *"I should be some settings that we can change in the
  source files and when the redeploy happens, this settings is taken into account"*; and *"We don't have the dev profile
  server, so if we need to it test, we better test it on our prod profile server"*; pointer added by `fkit-architect`,
  append-only — every other line of this file is left byte-identical). **Superseded:** the switch's mechanism in
  Decision 2 (an env var, `PAYMENTS_CONSUME_PERMANENT`, becomes the committed constant `CONSUME_PERMANENT_PURCHASES` in
  `src/profile-server/ConsumePermanentSetting.ts`, flipped by a commit and a profile-box redeploy), the two
  *Consequences* phrases built on it, and Decision 6a's *"(S1 on the dev box first)"* (there is no dev profile box; S1
  goes to the live profile box first). **The rest of Decision 2 stands** (server-owned policy, a switch that ships off,
  one-way per token, no game deploy needed), as does everything else here. **Status stays `accepted`.** ⛔ marks the
  superseded sites below.

## Context

- The client consumes every purchase right after our server records it: after `/complete`
  (`src/client/ProductPurchase.ts:119-121`) and after reconcile (`src/client/PaymentsReconciliation.ts:80-86`,
  `:145`). Per Yandex, *"После вызова метода `payments.consumePurchase()` обработанная покупка удаляется без
  возможности восстановления"* (sdk-purchases, read 2026-10-26).
- That choice came from the Sprint-4 design (`sprint4-yandex-payments-findings.md`, § *Consume flow*: *"keeping it
  unconsumed adds noise rather than value"*). No ADR recorded it. It assumed our database always reaches the right
  player.
- **That assumption failed.** On 2026-10-08 the owner's test account landed on a fresh profile (`0424`). On 2026-10-25 a
  paying player reported his citizenship gone (`0502` confirms or refutes the two-profile cause). His purchase was
  consumed, so Yandex has nothing left to show us.
- Yandex supports permanent (unconsumed) purchases, handled with `getPurchases()`. The signed payload has **no user
  id**. Not consuming a purchase that already happened is our decision (owner, 2026-10-26), and our game updates ship
  through the iframe without a per-update moderation review (owner, 2026-10-26). So nothing here is asked of Yandex,
  and nothing is gated on a review.
- Platform behaviour we do not know: is `getPurchases()` per Yandex account or per game id, or even per device? Do
  refunds leave the list? The design is safe under each possibility (spec §10.2) and waits on none (D2). We learn
  them from our own pre-release checks (T3 covers "per device") and shadow data. **`0508` will ask Yandex Q2 only**
  (per account or per game id), as a question about the player's situation (owner, 2026-10-26: *"Keep Q2, drop
  others"*). Its answer is used when it arrives; **nothing waits on it**.
- Today `/reconcile` answers an already-processed token as "processed" with no owner check
  (`src/profile-server/Routes.ts:1236-1241`), and carries no caller. Without consuming, every buyer's load would refresh
  the profile for nothing. A buyer whose login now lands on a fresh profile would be offered Buy again: a second charge.
- Binding rules: `grantPaidPurchase` is the single writer of paid state; one `player_id` per receipt (migration
  `006`); ADR-113 (no public route takes a player id; `vfy:true` = proven); ADR-116 D4 / OD-2 (paid status private to a
  verified reader); **`0424`: "never an automatic merge"**.

## Decision

1. **Permanent products are never consumed.** Permanent = kind `citizenship` or `durable_item`. A future consumable
   kind is consumed after the grant, as today. The rule is one pure function over `kind` in `src/core`.
2. **The server owns the policy.** `/complete` answers `consume`; `/reconcile` answers `consumeTokens`. The client
   consumes only what the server names. A missing field means consume nothing. A box env switch,
   `PAYMENTS_CONSUME_PERMANENT` (default off), restores today's consuming for every page on its next reconcile,
   without a game deploy. It is **kept as a general safety switch** on engineering grounds:
   - a game redeploy does not reach pages already open;
   - what it guards against is a defect in the new path, T3 failing after release, or a platform change;
   - it costs one boolean on a policy the server owns anyway.

   ⚠️ It is **one-way per token**: a purchase consumed while it is on is gone from Yandex for good. So it is a
   deliberate owner action, documented in the runbook, never a live test toggle.

   > ⛔ **2026-10-26 — mechanism superseded by ADR-127.** Not an env var: the committed constant
   > `CONSUME_PERMANENT_PURCHASES` (`src/profile-server/ConsumePermanentSetting.ts`), shipped `false`, pinned off by a
   > test. Flip = edit it and its test, commit, redeploy the profile box. Still no game deploy; still one-way per token.
3. **Reconcile tells "granted now", "held by you" and "held elsewhere" apart.** The refresh signal fires only on fresh
   grants (`grantedTokens`). `processedTokens` keeps its meaning for older clients.
4. **Reconcile accepts an optional Bearer.** Only a `vfy:true` caller is compared with the receipt's holder. No token,
   a bad token or `vfy:false` behave as today. Reconcile still never depends on being logged in.
5. **A permanent purchase held by another profile than the verified caller's:** nothing is granted, moved or revoked.
   The client blocks a second purchase of that product with a "contact us" line. The server records a sighting
   (`purchase_holder_sightings`) as evidence for the owner's manual merge (`0503`). **Owner ruling D1, 2026-10-26.**
6. **Never revoke on absence.** A purchase missing from `getPurchases()` never removes paid state. No behaviour depends
   on refund `status` until our shadow counts (Decision 8) show how refunds appear.
6a. **The build and release do not wait on Yandex** (owner ruling D2, 2026-10-26), and there is no moderation gate
   (owner, 2026-10-26: iframe updates are not re-moderated). The gate is **our own pre-release checks**, run by the owner
   on the **Yandex-side test version that loads our dev box** (S1 on the dev box first), with test accounts and test
   purchases (spec §10.3): T1 (a permanent purchase stays and reloads are
   quiet), T2 (an interrupted purchase lands once), and **T3, the release blocker** (a second Yandex account in the
   same browser must not see the first account's purchase).

   > ⛔ **2026-10-26 — "(S1 on the dev box first)" superseded by ADR-127.** There is no dev profile box (owner). S1 goes
   > to the **live** profile box first; the checks then run from the Yandex-side test copy (dev game box) against the
   > live profile box, and T3 now gates the game half only.
7. **One ownership rule with `0503`.** Receipt, paid flags and entitlement move together, only through one
   `transferPurchase` primitive (built by `0503`), move never copy. This ADR adds no move.
8. **Measure before relying on freshness.** The server shadow-logs the payload `issuedAt` (presence, age bracket) and
   the entry `status` values, as labels only. ADR-121's 24 h window applies to login signatures, not purchase
   payloads.

## Options considered

- **Stop consuming permanent products, detect the other-profile case, block and record, manual move (chosen; D1
  option 1; owner ruling 2026-10-26).** Yandex keeps the record. We stop the one double charge the change would
  otherwise create, and gain evidence for `0503`. Safe under every possibility for the platform unknowns. Keeps
  `0424`'s rule.
- **Same, but move the purchase automatically to a verified caller (D1 option 2).** Self-service recovery. Not chosen
  by the owner (2026-10-26). It is an automatic transfer of paid state, against `0424`'s rule; it is unsafe if purchase
  lists turn out to be per device; and it needs `0503`'s primitive and audit answers plus shadow freshness data.
- **Detect and record only, no block (D1 option 3).** Not chosen: an affected buyer can pay twice.
- **Hold the release until Yandex answers (D2 option 2).** Not chosen by the owner (2026-10-26): the design is safe
  under any answer, and our pre-release checks catch the dangerous case.
- **Ask Yandex in advance whether an unconsumed permanent purchase passes moderation.** Dropped by the owner's ruling
  (2026-10-26): we do not ask Yandex about our implementation.
- **Delete only the two client consume calls.** Rejected: a profile and inbox refresh on every buyer load, and the
  double-charge path above.
- **Client-owned policy (the client decides from the product).** Rejected: switching consuming back on would need a
  game deploy, which does not reach pages already open.
- **No safety switch (hard-coded policy; roll back by redeploying).** Rejected: slower to reach open pages, and it
  saves only a few lines.
- **Keep consuming (status quo).** Rejected by the owner's ruling. Our database stays the only proof of a purchase.
- **Never consume anything, consumables included.** Rejected: unknown Yandex behaviour for re-buying an unconsumed
  consumable, and no consumable exists to test with. Re-raised with the first consumable.

## Consequences

- **Positive:** a permanent purchase survives on Yandex's side; a lost-profile buyer is stopped from paying twice and
  leaves evidence; switching consuming back on is a box setting; either deploy order is safe.
- **Negative / costs:**
  - one reconcile POST per buyer per load, forever;
  - a new migration (`purchase_holder_sightings`), a new env var (config parity), new client states and strings;

    > ⛔ **2026-10-26 — superseded by ADR-127:** no env var and no config-parity entry; switching consuming back on is
    > a committed source change plus a profile-box redeploy, not a box setting (this also applies to *"switching
    > consuming back on is a box setting"* under *Positive*).
  - the held purchase deploy (`0491`–`0496`) ships only with this build, and its game half passes through the
    owner's pre-release checks (T3 failing stops the game half);
  - the approved shared-purchase-flow spec's "consume after grant" (§3, §4.2, §4.3 step 10, §5) is superseded on this
    point.
- **What this does NOT fix:**
  - the affected player and the ~21 earlier buyers (already consumed; `0503`/`0504`);
  - **the id-change case entirely, if `getPurchases()` is per game id**;
  - a buyer on an unverified session (can still be offered Buy);
  - a logged-in tap before the boot reconcile answers (`0501`).
- **Residual risks / re-raise only if:**
  - we learn how purchase lists are scoped (per account / per game id), from our own data or from anything the owner
    later learns about the player, or T3 shows they are per device;
  - Yandex starts reviewing our iframe updates (the no-moderation-gate premise changes);
  - our shadow counts show refunded purchases staying in the list with a status;
  - reconcile 429s appear (add a client-side "known held" cache);
  - a buyer's permanent list nears the 65,536-byte reconcile bound;
  - the first consumable product is designed;
  - the owner reopens D1 for self-service recovery (option 2);
  - a database restore loses intent rows for listed permanent purchases.

  Absent those: *"why not consume after the grant"*, *"why one POST per load"*, *"why not move it automatically"* and
  *"why does an unverified caller get no held-elsewhere answer"* are closeout of this ADR, not new findings.

## Related

- Spec: `../reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md`
- `../reports/2026-10-24-design-shared-purchase-flow.md` (superseded on consuming only)
- [ADR-113](adr-113-profile-internal-player-id-and-platform-identities.md),
  [ADR-116](adr-116-first-verified-identity-yandex-signed-player-data-at-login.md),
  [ADR-121](adr-121-login-signature-freshness-window-24h-id-checked-first.md),
  [ADR-125](adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md)
- Tasks: `0505` (this), `0506` (build), `0424`, `0501`, `0502`, `0503`, `0504`, `0507`, `0508`, `0493`
