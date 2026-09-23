# Paid Citizenship — Owner-Run Test-Buy Sequence (real purchase, HMAC construction, secret value, reconciliation — moved out of `0065`)

> ## 🚨 READ FIRST — PAID CITIZENSHIP GOES LIVE BEFORE THIS TASK RUNS
>
> **Owner ruling, 2026-09-23, verbatim:** *"Launch, and leave the test task for the Sprint 5. The
> test-buy sequence will be run by me (human)"*.
>
> ⇒ **Paid citizenship goes live to real players before any real purchase has been proven: HMAC
> construction unconfirmed, secret value unconfirmed, reconciliation unexercised. Real players' first
> purchases may be the first real test.**
>
> ⚠️ **This is an ACCEPTED, OWNER-RULED TRADEOFF, not an oversight.** The owner was shown the risk
> before choosing (*"real players can buy before a real purchase is proven"*). ⛔ **Do not re-add this
> task as a gate on [`0065`](../0065-citizenship-paid-live-verification/brief.md), and do not
> re-recommend it.** It is recorded here, loudly, so a reader of this brief knows what state production
> is in while this task is open.

## ID
0297

## Sprint
Sprint 5

## Priority
— *(no numeric rank)* — 🔴 **POSITION OWNER-RULED 2026-09-23:** an **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021). Owner's ruling: *top of Sprint
5, directly above `0296`*. ⛔ **An owner ruling lifting ADR-035's append-only constraint for this one
row — not producer precedent.** ~~On the board the row now sits **directly above `0296`**. ⚠️ Those two
phrases name different rows on the Sprint 5 board (`0296` is not at the top), so the literal "top"
placement is an open question — see `## Notes`.~~
✅ **CLARIFIED 2026-09-23 — OWNER RULING** (live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021)): **`0297` goes to the VERY TOP of Sprint 5 — the
first row on the board, above all 14 others.** The *"directly above `0296`"* phrasing was the **lead's
error in wording the question** (it relayed the producer's merit sentence), **not the owner's intent**.
⛔ **An owner ruling lifting ADR-035's append-only constraint for this one row — not producer
precedent.** The row is now row 1 of the Sprint 5 status table.
~~⚠️ Priority `—` is append rank, NOT a merit ranking — flagged for owner confirmation. **On merit this
belongs at the top of the Sprint 5 board, directly above `0296`**, because from the moment `0065` §6
flips the card on, real players can pay, and this task is the first proof that a real purchase is
verified and granted.~~ *(The producer's merit statement, struck because the owner has now ruled. It
wrongly implied `0296` sits at the top of the board.)*

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human)**, owner ruling 2026-09-23; see `## Notes`.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person. ✅ **The owner
confirmed this form on 2026-09-23** — no change to `task-owner-vocabulary.md`.)*

## Context

**Where this came from.** [`0065`](../0065-citizenship-paid-live-verification/brief.md) (Sprint 4)
carried both the live checks for paid citizenship (its §1–§5) and the go-live itself (§6: flip
`CITIZENSHIP_CARD_ENABLED` to `true` and run a second game deploy). That brief could not satisfy its own
ordering: §6 flipped *"only after 1–4 pass"*, but §3 (the real test purchase) needs the flip first,
because the buy button does not exist in any production build while the compile-time flag is `false`
(re-verified in the tree 2026-09-22; recorded as runbook C1).

**The ruling.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
2026-09-23**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
(ADR-021). ⛔ **Not producer precedent.** Owner, verbatim: *"Launch, and leave the test task for the
Sprint 5. The test-buy sequence will be run by me (human)"*. The options the owner was shown:
test-only exposure through the remote `citizenship_ui` switch; *"launch, then test fast"* (with the
risk stated); a draft build; an architect check. The owner chose to launch and move the testing out.

**What that does:**
- `0065` is now **the go-live only** — its §6. §6 no longer waits on §1–§4 (recorded as `0065`
  Correction 7). The earlier `RUNBOOK-A` ruling still stands: the flip is a launch decision and does not
  ride a deploy slot. **Launch timing is the owner's call** — nothing here schedules it.
- **Every `0065` check that needs a real purchase or the live button moved here** — its §1, §2, §3,
  §4 and §5, listed below with their original numbers so cross-references keep working.
- **`0195`'s open condition moved here too.** `0195` (forwarding `YANDEX_PAYMENTS_SECRET` to the
  profile box) shipped 2026-09-01; what stayed open is whether the **value** on the box is **correct**.
  The value is present (length 32, observed 2026-09-19) and owner-attested as the real Yandex key
  (2026-09-20, not repo-verified). Only a real signed payload settles correctness — so it lives here,
  with §1. **`0195` no longer gates `0065`.**

**Standing facts carried from `0065` (not re-derived):**
- The test-purchase Yandex login is registered — owner-attested 2026-09-22, not repo-verifiable
  (`0065` Correction 4).
- The owner confirmed on 2026-09-22 that they **will** perform the real test purchase, signed in as the
  test account. A lead-session claim that they refused was a misattribution and was never true.
- `0065` Correction 6, item 4: the old note *"without the token no profile row exists to attach a
  purchase to"* was written for `0062` and is **not re-verified** under the newer profile-identity
  model (`0266` slices). If it still holds, **§3 here is where it shows** — a purchase with no profile
  row to attach to. Diagnose it then; it is not a gate.
- `YandexSignature.ts` deliberately accepts **two** HMAC-SHA256 constructions (over the base64 payload
  string, and over the decoded JSON), because Yandex's docs do not pin one down (`0019` decision).

## What to build

Nothing is built here. This is a **live checklist run by the owner by hand** in the production Yandex
iframe, after `0065` §6 is live. Any non-trivial defect found becomes its own task, not scope growth
here. Record every result (date, game build version, pass/fail, and how it was observed) in this
folder's `worklog.md`.

**Precondition — all steps:** `0065` §6 is live in production (the flag is `true` in the deployed
build and the second game deploy has run). Before that, the buy button does not exist.

### §1 — HMAC-construction confirmation and the secret's value (ex-`0065` §1, plus the ex-`0195` condition)
- [ ] With the first REAL signed payload, confirm `/v1/payments/yandex/complete` returns 200.
      **This also settles the `0195` condition:** a 200 on a real signed payload means the secret on the
      box is the right value. A signature rejection means the secret, the construction, or both are
      wrong — stop and file it as a defect immediately, because real players are on the same path.
- [ ] Determine which of the two constructions matched, and record how that was determined.
- [ ] Hand the result to the producer to file a small `fkit-coder` follow-up that drops the unused
      construction. Filing it is part of this task's close condition.

### §2 — Live catalog fetch (ex-`0065` §2)
- [ ] Open the game as an authenticated Yandex player. `getPaymentsCatalogStatus()` → `'ready'`;
      `hasCatalogProduct('citizenship')` → `true`.
- [ ] The price shown on the Buy button comes from the real catalog response — not the mock's fake
      price, not hardcoded.

### §3 — Real test purchase through the `0018` UI (ex-`0065` §3)
- [ ] Signed in as the test-purchase account, complete the flow end to end with the real button.
- [ ] The production profile shows `is_paid_citizen = true` and `citizenship_purchased_at` set (checked
      on the box; the public `GET /v1/profile` strips paid fields by design).
- [ ] The purchase is consumed: a second `getPurchases()` no longer lists it.
- [ ] The card moves to State 3. *(Inbox message: `0065` said "N/A until `0012` exists". `0012` was closed
      2026-09-23 as built; the live inbox check is `0296` B2, not this task.)*
- [ ] Funnel analytics observed live: `UI:Tap:PurchaseCitizenship`, `Purchase:Started:Citizenship`,
      `Purchase:Completed:Citizenship`.

### §4 — Live reconciliation (ex-`0065` §4)
- [ ] Interrupt a purchase after Yandex processes it but before the client posts the signature (block
      `/complete` in devtools, or kill the tab). Restart. Confirm `/reconcile` grants, the token is
      consumed, and the card shows State 3.
- [ ] Second restart: `getSignedPurchases()` returns nothing once consumed (no network call).

### §5 — Does the product ever disappear from `getCatalog()`? (ex-`0065` §5, NARROWED by owner ruling 2026-09-23)
- [ ] ~~Record how the catalog item behaves before vs after moderation (test purchases are documented to
      work before moderation completes — confirm), and~~ Record whether the `citizenship` product ever
      disappears from `getCatalog()`.

> ✅ **NARROWED 2026-09-23 — OWNER RULING**, given live in the `fkit lead` session via `AskUserQuestion`,
> relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); not producer
> precedent. The owner kept only the check *"does the citizenship product ever disappear from
> `getCatalog()`"* and **dropped the before-vs-after-moderation comparison**, because (1) the owner ruled
> on 2026-09-19 that Yandex no longer approves the in-app, and (2) purchases have been enabled since
> 2026-09-12. The flag that stood here is answered; it is kept below, struck, as the record.

> ~~⚠️ **§5 DID NOT MOVE CLEANLY — recorded, not settled.** Two reasons, both from the record:~~
> 1. On **2026-09-19 the owner ruled that Yandex no longer approves the in-app** (*"we don't need to wait
>    for their approval anymore"* — `0065` Correction 1). If there is no moderation step any more, the
>    before/after comparison may have nothing to compare.
> 2. Purchases were **enabled on 2026-09-12**. If a moderation window ever existed, it may already be
>    over, so a "before moderation" observation may no longer be possible after launch.
>
> ~~⇒ **Open question for the owner: run §5 as written, narrow it to "does the product ever vanish from
> `getCatalog()`", or waive it?** Until answered it stays on the checklist.~~ ✅ **Answered 2026-09-23:
> narrowed** (see above).

## Verification steps

The checklist above **is** the verification. This task closes only when:
1. every box is checked, or explicitly waived by the owner, with the result in `worklog.md`;
2. §1's follow-up task (drop the unused HMAC construction) is filed; and
3. the `0195` value-correctness result is recorded — either proven by §1's 200, or filed as a defect.

## Notes

- **Depends on:** `0065` (§6 only — the flip plus the second game deploy must be live in production; the buy button does not exist before it)
- **Blocks:** nothing. ⛔ In particular it does **not** block `0065` — owner ruling 2026-09-23 (`0065`
  Correction 7) — and it does **not** block `0018`: owner ruling 2026-09-23, *`0018` closes on `0065`
  (the launch) alone*. **The real-purchase proof lives only here.**
- **Related:** [`0065`](../0065-citizenship-paid-live-verification/brief.md) (the go-live; the source of
  §1–§5); [`0018`](../0018-citizenship-paid/brief.md) (the UI and flow driven here, built and verified
  mocked); [`0195`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md) (its
  open value-correctness condition is §1 here); `0019`'s
  [`live-verification-checklist.md`](../../done/0019-yandex-payments-impl/live-verification-checklist.md)
  (superseded by `0065` and now by this task — not edited); [`0296`](../0296-after-deploy-production-checks-profile-token-earned-citizenship-inbox/brief.md)
  (section B runs after the same flip); [`0294`](../0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)
  (rotating `YANDEX_PAYMENTS_SECRET` would invalidate §1 — and, after launch, real players' purchases).
- **Why `## Owner` reads `fkit-producer` and not "the owner".** The coordinator asked for the owner
  (human) as owner. `task-owner-vocabulary.md` allows only the seven fkit roles (*"Not a person's
  name"*), and the owner's ruling settled **who runs the sequence**, not the vocabulary. So the field
  names the seat that tracks and closes the task and files §1's follow-up, and says plainly that the
  owner executes it. ✅ **Owner-confirmed 2026-09-23 (relayed by `fkit-lead`): keep this form; no change
  to the vocabulary.**
- ~~⚠️ **Open question — rank wording.** The 2026-09-23 rank ruling said *"top of Sprint 5, directly above
  `0296`"*. On the Sprint 5 board those are two different places: `0296` is near the bottom, below the
  old plan rows. The row was placed **directly above `0296`** (the named neighbour, and the smaller
  move). If the owner meant the literal top of the board, above every row, that is one more move. The
  ambiguity came from the producer's own merit sentence, which wrongly put `0296` at the top.~~
  ✅ **Answered 2026-09-23 (owner ruling): the very top of Sprint 5 — row 1.** See `## Priority`.
- **Producer's observation, not a schedule:** while this task is open after §6, every real purchase
  runs on an unproven path. Timing is the owner's call.
- ⚠️ **Sprint 5 is `🔲 Backlog`, not active.** The owner placed this task there by name. If the launch
  happens while Sprint 4 is still the active sprint, this task will sit on a non-active board. Recorded
  so it is seen, not re-litigated.
- **No secrets in any artifact.** Never record the Yandex per-game secret, `PROFILE_INTERNAL_TOKEN`, or
  a signed payload's contents in the worklog, a log line, or deploy output — presence, lengths,
  statuses and verdicts only.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s alone.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
