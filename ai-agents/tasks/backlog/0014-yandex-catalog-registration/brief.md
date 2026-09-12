# Task — Register Yandex Games Catalog Items

## ID
0014

## Sprint
Sprint 4

## Type
Non-technical — requires manual action in the Yandex Games dashboard. Not engineering work.

## Priority
Urgent. Catalog approval takes several days. Every day this is delayed pushes back the paid citizenship launch date.

## Status
🚧 Blocked — awaiting Yandex catalog approval of the in-app registered 2026-09-12

📌 **CORRECTED 2026-09-12 on an OWNER RULING given live in session.** ~~🚧 Blocked — awaiting Yandex
catalog approval (owner-ruled 2026-08-14; was ⚠️ Urgent on the Sprint 4 board — urgency is not a
status)~~

🚨 **Read the correction, because the outcome and the reason moved independently.** The struck cell was
**not wrong today and right yesterday — it was asserting something nothing in this repository ever
recorded.** It said this task was *awaiting approval*, which presupposes a **submission**, and **no
submission was recorded anywhere**: no date, no confirmation, no dashboard evidence. ⛔ **It was a
status inferred from an intention.**

✅ **It has now BECOME true, for a different reason than the cell claimed.** The owner **completed the
catalog registration on 2026-09-12** and confirmed the in-app is entered with product ID exactly
`citizenship`. From today there is a real submission on a real date, so *awaiting approval* is a
statement of fact rather than an assumption. **The status token is unchanged; its truth-ground is
new.** The earlier `2026-08-14` owner ruling that this is a `Blocked` and not an `Urgent` cell still
stands and is not disturbed.

⚠️ **Approval is still NOT confirmed.** Registered ≠ approved. Do not read this cell as "the catalog
item is live."

## Owner
fkit-producer

## What Needs to Be Done

Log into the Yandex Games dashboard and register the following in-app purchase catalog items:

| Item | Product ID | Price | Sprint |
|---|---|---|---|
| Citizenship | **`citizenship`** — ⛔ **fixed by code, not chosen** (see *The product ID is not yours to choose*) | **99** — ✅ number owner-confirmed 2026-09-12; ⚠️ ~~99 rubles~~ **UNIT NOT CONFIRMED** (see Open item 6) | Sprint 4 |
| Cosmetics (flag / pattern pack) | ⚠️ **no code path can sell this today** (see *Flagged, not fixed*) | 149–199 rubles | Sprint 5 — register now, do not wait |

Register both now. Sprint 5 cosmetics can be left inactive in the catalog until Sprint 5 ships, but getting them through approval early removes a future bottleneck.

## 🔒 The product ID is not yours to choose — it is fixed at exactly `citizenship`

> **Added 2026-09-12 on an OWNER RULING given live in session.** This section exists because the
> `## Verification` block below previously had this **backwards** — see the strike-through there.

The citizenship product ID is **`citizenship`**, lowercase, exactly, with no prefix, suffix, spacing or
capitalization variant. ⛔ **It is a value the code already asserts — not a decision the dashboard
makes and reports back to engineering.** Two independent places enforce it:

- **Client + wire contract** — `src/core/profile/PaymentsContract.ts:19`:
  `export const PAYMENT_PRODUCT_IDS = ["citizenship"] as const;`
  The next lines build `PaymentProductIdSchema` from it as a Zod **enum**, so any other string fails
  validation at the boundary. (The file's own comment: *"Product ids sellable through Yandex payments.
  Extend here (one place) only."*)
- **Server-side, again** — `src/profile-server/PaymentsRepository.ts:136`: `grantPaidPurchase()` throws
  `no grant defined for productId "<x>"` for anything that is not `citizenship`, deliberately, so a new
  product fails loudly rather than silently minting citizenship.

🚨 **What goes wrong if the dashboard value differs by even one character:** the purchase never
completes. The mismatch is not caught by anything a human is watching — it surfaces as a Zod rejection
or a thrown grant, after the player has already paid. **A typo here is a paid purchase that grants
nothing.**

✅ **Owner confirmed 2026-09-12 that the ID was entered as exactly `citizenship`.** Recorded so this is
not re-derived.

## Why This Cannot Wait

The Yandex Payments implementation (`0019-yandex-payments-impl`) requires the catalog item to exist and be approved before the purchase UI can be shown to players. The purchase UI hides itself when the catalog item is absent or unavailable in the Yandex catalog response. Engineering can build and test the payment flow against a pending or sandbox item, but the feature cannot go live until approval is confirmed.

## Verification

> **REWRITTEN 2026-09-12 on an OWNER RULING given live in session.** The superseded text is struck, not
> deleted, immediately below. **Two deliverables were missing entirely** — without them this task could
> have closed while [`0065`](../0065-citizenship-paid-live-verification/brief.md) stayed blocked **on
> this very task**.

~~- Catalog items appear in the Yandex Games developer dashboard with status "approved" (or equivalent
active status).~~
~~- Catalog item IDs are noted and shared with the engineering team for use in the Yandex Payments
implementation brief.~~

⛔ **Why the second bullet was wrong, stated plainly so nobody restores it:** it described the ID as
flowing **dashboard → engineering**, as though the owner picks it and reports it. **It flows the other
way.** The ID is fixed in code (section above); the dashboard's job is to **match** it. A reader
following the struck bullet would reasonably conclude the ID was free to choose — which is exactly the
mistake that produces a paid purchase granting nothing.

### The current verification list — ⛔ all four, and the task does not close on the first one alone

1. ✅ **The `citizenship` in-app is registered with product ID exactly `citizenship`** — done
   2026-09-12, owner-confirmed. ⚠️ **Registered, not approved.**
2. 🔲 **The item shows "approved" (or the equivalent active status) in the Yandex Games developer
   dashboard.** This is the external gate; it is genuinely outside anyone's control here.
3. 🔲 **The per-game payments SECRET KEY is collected.** 🚨 **This is a hard `0065` prerequisite and it
   is NOT the catalog registration.** It becomes the `YANDEX_PAYMENTS_SECRET` environment variable on
   the profile box. **Without it every one of the three `/v1/payments/*` routes returns 503** —
   fail-closed **by design**: `src/profile-server/Server.ts:35` reads
   `process.env.YANDEX_PAYMENTS_SECRET ?? ""` and `:38` logs
   *"YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)"*. ⛔ **Do not put the key
   value in this brief, in any task file, in a report, or in any other git-tracked artifact.** Record
   only that it was collected, and where it was placed.
4. 🔲 **At least one TEST-PURCHASE Yandex login is added.** In the Yandex Games dashboard under
   **In-App Purchases → Settings**. 🚨 **There is NO separate sandbox environment** — test purchases are
   made against the real catalog by nominated accounts, so without a nominated login **there is no way
   to exercise a real purchase before real players do.** Also a hard `0065` prerequisite.

> 🚨 **THE REASON ITEMS 3 AND 4 ARE HERE AT ALL.** As this brief previously stood, `0014` could be
> closed the moment the catalog item was approved — **with no secret key and no test login** — while
> [`0065`](../0065-citizenship-paid-live-verification/brief.md) remained blocked citing `0014` as one
> of its three conditions. `0065`'s own status line already names *"Yandex catalog approval **+
> per-game secret-key issuance** (`0014`)"*, so the dependency was recorded **there** and missing
> **here**. ⛔ **A task whose closure would not actually unblock its dependent is a false close.**

## Notes

- **Depends on:** Yandex catalog approval — an external gate. On tasks: no task — this is non-technical
  work performed by hand in the Yandex Games dashboard. Nothing in this brief asserts a dependency on
  another task; the `0019-yandex-payments-impl` relationship stated under `## Why This Cannot Wait`
  runs the other way — this task gates that one's go-live, it is not gated by it.

  📌 **CORRECTED 2026-09-12 on an OWNER RULING given live in session.** The superseded wording:
  ~~*"an external gate, already in flight, which the Status line records this task as awaiting
  (owner-ruled 2026-08-14)"*~~ — **"already in flight" asserted a submission that nothing in this
  repository recorded**, the same defect as the old Status cell. It is in flight **now**, since
  2026-09-12, because the owner actually registered it that day. ⚠️ **Same correction, same reason:
  the fact caught up with the claim; the claim was not evidenced when it was written.**

- **Blocks:** [`0065-citizenship-paid-live-verification`](../0065-citizenship-paid-live-verification/brief.md)
  — one of its three conditions. ⚠️ **It needs items 2, 3 and 4 of `## Verification`, not item 1 alone.**

- ⚠️🚩 **FLAGGED, NOT FIXED, 2026-09-12 — the cosmetics SKU this brief tells the owner to register
  CANNOT BE SOLD BY ANY CODE PATH.** `PAYMENT_PRODUCT_IDS` has **exactly one entry**
  (`src/core/profile/PaymentsContract.ts:19`), so any other `productId` fails Zod validation and
  `POST /v1/payments/yandex/intent` returns **400**. It would fail again server-side at
  `src/profile-server/PaymentsRepository.ts:136` even if it got past the boundary.
  **⇒ Registering the cosmetics item is PRE-REGISTRATION FOR MODERATION LEAD TIME ONLY.** It buys
  Sprint 5 a head start on Yandex's approval queue; it does not make anything sellable, and selling it
  will require its **own** code change (a second `PAYMENT_PRODUCT_IDS` entry **and** its own grant
  branch — the repository comment at `:134-135` says so explicitly and tells the implementer to fail
  loudly rather than mint citizenship for it).
  ⛔ **THIS IS RECORDED, NOT RESOLVED. It was not fixed here and this brief does not change the
  instruction to register it.**
  ⛔ **Whether the owner actually registered the cosmetics item is NOT KNOWN — this brief asserts
  NEITHER that they did NOR that they did not.** The owner's 2026-09-12 confirmation covered the
  `citizenship` in-app only.

- Do not put catalog item IDs or any dashboard credentials into git-tracked files. ⚠️ **The
  `citizenship` product ID is the one exception and it is not a secret** — it is a public constant
  already committed in `src/core/profile/PaymentsContract.ts`. **The secret key (item 3) is covered by
  the rule in full.**

- The earned citizenship path (50 qualifying matches) is fully independent of this task and can ship before approval.

## Open items — ⛔ NOT KNOWN, and deliberately not asserted either way

> **Recorded 2026-09-12.** These were put to the owner and **no answer has been received**. ⛔ **Nothing
> below may be written up as done, as not-done, or as "presumably".** Each one is a real gate on
> [`0065`](../0065-citizenship-paid-live-verification/brief.md) or on the launch.
>
> 📌 **STATUS OF ITEMS 1–4, updated 2026-09-12 later the same day.** They were put to the owner again in
> session. The owner replied **"I guess none"** and **asked to be walked through the steps**; the
> walkthrough was given and **they have not yet reported back**.
>
> ⛔ **"I guess none" is NOT a report that the steps are not done, and this brief does not record it as
> one.** It is an unverified recollection, offered by someone who then asked to be shown what the steps
> even were. ⇒ **As of now each of items 1–4 is UNKNOWN in both directions — not done, and not
> known-not-done** — pending the owner's next session in the Yandex console. **Item 6 (the price) is the
> only one of these that moved today.**

1. **Was the per-game payments secret key collected?** (`## Verification` item 3.) Unknown.
2. **Were test-purchase Yandex login(s) added** under In-App Purchases → Settings? (item 4.) Unknown.
3. **Is the `citizenship_ui` Yandex experiment flag set?** Unknown. This is the **remote half** of the
   citizenship kill switch (`src/client/flashist/FlashistFacade.ts:174`) and its validation is
   [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md), a
   declared launch gate.
4. **Are purchases enabled for the game at all** in the Yandex Games dashboard? Unknown. A registered,
   approved item in a game with purchases switched off sells nothing.
5. **Was the cosmetics item registered?** Unknown — see the flagged bullet above.

6. **The price — ✅ NUMBER CONFIRMED `99`, ⛔ UNIT STILL UNKNOWN.** Recorded 2026-09-12 on an owner
   ruling given live in session: the owner registered the in-app that day and **confirmed the price
   entered is `99`**.

   📌 **What is being replaced, struck not deleted:** ~~*"99 rubles"*~~, the bare unqualified figure that
   stood in the `## What Needs to Be Done` table. ⚠️ **Recorded honestly: there was NO pre-existing price
   entry in this Open-items list to strike.** The unknown this item replaces was the one **implicit in
   that table cell** — a number stated with a unit nobody had confirmed. It is now explicit.

   ⛔ **THE UNIT IS NOT CONFIRMED, AND THIS BRIEF ASSERTS NEITHER READING.** The owner said "99". They
   were **not asked** whether the console took that as **rubles** or as **Yandex portal currency units**,
   and they did **not** state it. The two sources in this repository disagree:

   | Source | Says |
   |---|---|
   | This brief's own `## What Needs to Be Done` table | "99 **rubles**" |
   | [`sprint4-yandex-payments-findings.md:368,382`](../../../knowledge-base/sprint4-yandex-payments-findings.md) — the Yandex docs review | the catalog field is an *"integer price in Yandex **portal currency**"*; the target is recorded as *"99 **YAN**"* |

   ⇒ **The number is settled; which currency the console applied it in is not.** Do not resolve this by
   picking the more familiar reading — ask the owner, or read it back off the dashboard.

   ✅ **This affects NO build and is NOT a code dependency.** Nothing in the codebase reads, validates,
   or depends on the price. `src/core/profile/PaymentsContract.ts` fixes the **product ID** only, and
   `src/profile-server/PaymentsRepository.ts`'s grant branches key on that ID, never on an amount.
   ⇒ **This is a RECORD-ACCURACY fix.** ⛔ **Nobody should treat it as blocking a build, a deploy, or
   [`0065`](../0065-citizenship-paid-live-verification/brief.md).**
