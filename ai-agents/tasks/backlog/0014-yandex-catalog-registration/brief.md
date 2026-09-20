# Task — Register Yandex Games Catalog Items

## ID
0014

## Sprint
Sprint 4

## Type
Non-technical — requires manual action in the Yandex Games dashboard. Not engineering work.

## Priority
Urgent. ~~Catalog approval takes several days. Every day this is delayed pushes back the paid
citizenship launch date.~~

📌 **REASONING SUPERSEDED 2026-09-19 by the OWNER RULING in `## Status`** — there is no approval wait
any more, so *"approval takes several days"* is no longer the reason for the urgency.

⚠️ **The `Urgent` LABEL IS UNCHANGED, and the producer did NOT re-rank it.** It still blocks the paid
citizenship launch — just for a different reason: **the two remaining console deliverables (a
test-purchase login, and the `citizenship_ui` flag) are prerequisites of
[`0065`](../0065-citizenship-paid-live-verification/brief.md) and of
[`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)
respectively**, and both are minutes of console work that nothing else is waiting on. ⚠️ **Rank is the
owner's; this note records that the justification moved, not that the rank did.**

## Status
🔲 Backlog — the external approval gate is VOID (owner ruling 2026-09-19); two owner-side console
deliverables remain and neither is blocked by anyone outside this project

---

📌 **STATUS TOKEN CHANGED 2026-09-19 on an OWNER RULING given live in the `fkit lead` session
(`AskUserQuestion`), relayed by `fkit-lead` to a spawned `fkit-producer`.**
~~🚧 Blocked — awaiting Yandex catalog approval of the in-app registered 2026-09-12~~

**The owner's words, verbatim:**

> *"The gate existed before, but now there are changes in the way Yandex.Games operates, so we don't
> need to wait for their approval anymore."*

Leading into it, also verbatim: *"Regarding 0014 - Yandex.Games don't approve the iap now. We're good."*

⇒ ✅ **The *awaiting Yandex catalog approval* gate is VOID GOING FORWARD.**

⚠️ **This does NOT say the earlier record was wrong.** It was a real gate when it was written; **Yandex
changed how they operate.** The 2026-09-12 correction below it stands untouched and is still the true
account of how this cell got its previous truth-ground.

⚠️ **Nothing in this repository can see the Yandex console.** This rests entirely on the owner's report
— exactly as every other Yandex-console fact in this brief does. It is not repo-verifiable and is not
recorded as such.

### ⛔ What this ruling does NOT do — read this before widening it

- ⛔ **The owner did NOT say this task is finished, and this brief does not record that.** Two of the
  deliverables this brief tracks are untouched by the ruling — see the list directly below.
- ⛔ **It is not a ruling on [`0065`](../0065-citizenship-paid-live-verification/brief.md)'s dependency
  set.** `0065` is unedited and its blocker count is unchanged. See `## Notes` → **Blocks**.
- ⛔ **Not producer precedent.** One ruling, one task.

### Why the token is `🔲 Backlog` and not `🚧 Blocked` — the producer's read of the record, not an owner ruling

`🚧 Blocked` asserts something outside the doer's control is holding the task. **The only such thing
here was Yandex's approval, and it is now void.** What is left is:

| Remaining deliverable | Where it is tracked | State | Externally gated? |
|---|---|---|---|
| **Test-purchase Yandex login(s)** added under In-App Purchases → Settings | `## Verification` item 4 | ⛔ NOT DONE per the owner, 2026-09-12 | **No** — owner console work, actionable today |
| **The `citizenship_ui` experiment flag** | `## Open items` item 3 | ⛔ NOT DONE per the owner, 2026-09-12 | **No** — owner console work, actionable today |
| Cosmetics item registered | `## Open items` item 5 | ⛔ UNKNOWN, asserted neither way | No |
| Price **unit** (rubles vs portal currency) | `## Open items` item 6 | ⛔ UNKNOWN | No — and explicitly **non-blocking**, see item 6 |

⇒ **Nothing outside this project holds this task any more.** Unstarted owner work is `🔲 Backlog`, not
`🚧 Blocked` — calling it `Blocked` would now be asserting a blocker that does not exist.

⚠️ **`🔲 Backlog` is NOT "ready to close" and NOT "nearly done".** It means *not started, nothing in the
way.* ⛔ **Do not close this task** — `✅ Done` is the mover skills' alone, and two deliverables are open.

---

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

> 📌 **SUPERSEDED AS A GATE 2026-09-19 (owner ruling, above) — kept, not deleted, because it is still a
> true statement about what this repository knows.** Approval is **still** not confirmed and this brief
> still does not assert the item is live. What changed is that **nobody is waiting on it any more.**
> ⛔ Do not restore it as a blocker.

## Owner
fkit-producer

## What Needs to Be Done

Log into the Yandex Games dashboard and register the following in-app purchase catalog items:

| Item | Product ID | Price | Sprint |
|---|---|---|---|
| Citizenship | **`citizenship`** — ⛔ **fixed by code, not chosen** (see *The product ID is not yours to choose*) | **99** — ✅ number owner-confirmed 2026-09-12; ⚠️ ~~99 rubles~~ **UNIT NOT CONFIRMED** (see Open item 6) | Sprint 4 |
| Cosmetics (flag / pattern pack) | ⚠️ **no code path can sell this today** (see *Flagged, not fixed*) | 149–199 rubles | Sprint 5 — register now, do not wait |

Register both now. Sprint 5 cosmetics can be left inactive in the catalog until Sprint 5 ships, ~~but getting them through approval early removes a future bottleneck.~~

📌 **2026-09-19 — the struck rationale is gone with the approval gate (OWNER RULING, `## Status`).**
⛔ **The instruction to register the cosmetics item is UNCHANGED**; only its *reason* moved. It is now
"register it so the catalog entry exists when Sprint 5 needs it", not "buy moderation lead time".
⚠️ **And it is still the case that no code path can sell it** — see the flagged bullet in `## Notes`.

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

The Yandex Payments implementation (`0019-yandex-payments-impl`) requires the catalog item to exist ~~and be approved~~ before the purchase UI can be shown to players. The purchase UI hides itself when the catalog item is absent or unavailable in the Yandex catalog response. Engineering can build and test the payment flow against a pending or sandbox item, ~~but the feature cannot go live until approval is confirmed.~~

📌 **CORRECTED 2026-09-19 by the OWNER RULING in `## Status`.** The struck clauses said go-live waits on
approval. **It does not, as of today.** ⚠️ **The rest of this section is UNCHANGED and still true:** the
catalog item must **exist** and must come back **available** in the Yandex catalog response, or the
purchase UI hides itself. ⛔ **Existing is not the same as approved, and neither is the same as
"observed available in a live `getCatalog()` response"** — that last one has still never been observed
and is `0065` step 2's job, not this task's.

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
2. ⛔ **VOID — no longer a gate.** ~~🔲 **The item shows "approved" (or the equivalent active status) in
   the Yandex Games developer dashboard.** This is the external gate; it is genuinely outside anyone's
   control here.~~
   📌 **VOIDED 2026-09-19 on the OWNER RULING recorded in `## Status`** (verbatim: *"we don't need to
   wait for their approval anymore"* — Yandex changed how they operate). ⚠️ **Struck, not deleted, and
   the list is still four items long** — the count is not renumbered so that every cross-reference to
   *"item 3"* and *"item 4"* elsewhere in this brief and in `0065` keeps pointing at the same thing.
   ⚠️ **Void ≠ satisfied:** this brief does **not** now assert the item is approved. It asserts that
   nothing is waiting on approval.
3. ✅ **The per-game payments SECRET KEY is collected** — ✅ **ISSUED 2026-09-12 (owner ruling, given live in session and relayed through the lead session).** ~~⚠️ **Issued ≠ on the box:** the key lands on the profile box only via a profile-box redeploy with the value populated (`0195` forwards it); this brief does NOT assert the box has it, so the `/v1/payments/*` 503s are not cleared by issuance alone.~~ ✅ **ON THE BOX — see the correction block directly below.** 🚨 **This is a hard `0065` prerequisite and it
   is NOT the catalog registration.** It becomes the `YANDEX_PAYMENTS_SECRET` environment variable on
   the profile box. **Without it every one of the three `/v1/payments/*` routes returns 503** —
   fail-closed **by design**: `src/profile-server/Server.ts:35` reads
   `process.env.YANDEX_PAYMENTS_SECRET ?? ""` and `:38` logs
   *"YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)"*. ⚠️ **That sentence is a
   statement about the CODE and is still true; its CONDITION is no longer met** — see below. ⛔ **Do not
   put the key value in this brief, in any task file, in a report, or in any other git-tracked
   artifact.** Record only that it was collected, and where it was placed.

   ---

   #### 📌 CORRECTED 2026-09-20 — the secret IS on the box, so the "still 503" wording above was stale

   ⚠️ **AUTHORITY BEFORE FACTS.** Corrected on an **OWNER RULING given live in the `fkit lead` session
   via `AskUserQuestion` on 2026-09-20**, relayed by `fkit-lead` to a spawned `fkit-producer` with no
   owner channel. The owner was asked whether this brief should be corrected alongside
   [`0065`](../0065-citizenship-paid-live-verification/brief.md) and ruled **correct it**.
   ⛔ **Not producer precedent — one ruling, one task.**

   **What is now established:**

   | Evidence | How it was obtained |
   |---|---|
   | A `POST` to a deliberately **non-existent** sub-path under `/v1/payments/` returned **404, not 503** ⇒ the `paymentsEnabled` middleware **PASSED** | read-only probe on the profile box by `fkit-lead`, 2026-09-19 |
   | `YANDEX_PAYMENTS_SECRET` is **present in the running container, length 32** | read-only inspection, same date. ⛔ **The value was never read into any log, file or transcript** |
   | The startup warning *"payments endpoints disabled"* appears **0 times** in that container's logs | read-only log search, same date |
   | **Provenance:** *"that's the real Yandex key, I set it"* — the owner deployed the profile box with the per-game key populated | **OWNER-ATTESTED 2026-09-20** |

   ⚠️ **The provenance is OWNER-ATTESTED, NOT REPO-VERIFIED** — the same standing as the 2026-09-12
   issuance ruling. **A deploy leaves no artifact in git**, so nothing in this repository can confirm
   *which* key was deployed. The three probe results above are repo-external but were observed
   first-hand; the provenance is the owner's word.

   🚨 **⛔ THIS DOES NOT MEAN PAYMENTS WORK, AND NOTHING HERE MAY BE WRITTEN UP AS IF IT DID.**
   - ⛔ **Provenance ≠ correctness.** Nothing shown above establishes the deployed value is the
     *correct* key. It establishes that a value of the right length is present and that the
     fail-closed gate opens.
   - ⛔ **No real purchase has been exercised** — not a test purchase, not a live one. A page saying
     *"payments work"* would be exactly as wrong as one saying they 503.
   - ⛔ **No status token, gate or blocker count changed anywhere on this correction.** `0014` is
     `🔲 Backlog` and **stays** so: its own gate is unsatisfied either way, because
     `## Verification` item 4 (**test-purchase Yandex login(s)**) and the `citizenship_ui` flag
     (`## Open items` item 3) are outstanding **independently of anything about the secret**.
   - ⛔ **`0065`'s blocker count is UNCHANGED at three** and `0065` was **not edited by this
     correction**.

   🚩 **TWO OTHER FILES STILL CARRY THE STALE CLAIM AND WERE DELIBERATELY NOT EDITED** — flagged, not
   fixed, so the owner rules rather than agents settling it between themselves:
   - [`0195`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md)'s `## Status`
     still reads *"A profile deploy carried out today lands the variable empty and `/v1/payments/*`
     correctly keeps returning 503."* ⚠️ **That sentence is now stale.** ⛔ `0195` is `✅ Done` and in
     `done/`; **its status was not touched and no mover skill was invoked.**
   - `ai-agents/wiki-vault/` payments pages carry both the stale 503 claim and a now-answered
     provenance question. ⛔ **Never written by this role** — flagged for a later `/fkit-wiki-sync`.
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

- 📌 **DEPENDENCY VOIDED 2026-09-19 — OWNER RULING, recorded in full in `## Status`.** ⛔ **This task
  no longer depends on Yandex catalog approval.** The owner ruled that Yandex no longer approves the
  in-app, so the external gate named in the next bullet is void going forward. ⚠️ **The next bullet is
  kept, not deleted** — its account of *why* the old wording was wrong is still the record, and the
  ruling does not retroactively make the gate fictional. ⇒ **`## Depends on` (tasks): still none.
  `## Depends on` (external): now NONE.**

- ~~**Depends on:** Yandex catalog approval — an external gate.~~ On tasks: no task — this is non-technical
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
  — one of its three conditions. ~~⚠️ **It needs items 2, 3 and 4 of `## Verification`, not item 1
  alone.**~~

  📌 **NARROWED 2026-09-19 by the OWNER RULING in `## Status` — ⛔ THE CONDITION ITSELF IS UNCHANGED AND
  STILL OPEN, and `0065`'s blocker count is still THREE.** With `## Verification` item 2 (approval)
  void, what `0065` needs from **this** task is now **items 3 and 4**:
  - **item 3 — the per-game secret key.** ✅ **ISSUED** 2026-09-12. ~~⚠️ **Issued ≠ on the box** — it
    reaches the profile box only via a profile-box redeploy with `YANDEX_PAYMENTS_SECRET` populated
    (`0195`'s path). ⛔ **This brief asserts NEITHER that such a redeploy has happened NOR that it has
    not**, so the `/v1/payments/*` 503s are **not** shown cleared.~~

    📌 **CORRECTED 2026-09-20 on an OWNER RULING** (given live in the `fkit lead` session via
    `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`; full evidence table under
    `## Verification` item 3). ✅ **The secret IS on the box:** the `paymentsEnabled` middleware passes
    (404, not 503, on a deliberately non-existent `/v1/payments/` sub-path), `YANDEX_PAYMENTS_SECRET`
    is present in the running container at length 32, the *"payments endpoints disabled"* warning
    appears 0 times, and the owner attested *"that's the real Yandex key, I set it"*.
    ⚠️ **Owner-attested, NOT repo-verified.** ⛔ **Provenance ≠ correctness, and no purchase has been
    exercised — this does NOT show payments working.** ⛔ **`0065`'s blocker count is STILL THREE and
    `0065` was NOT edited** — what it needs from *this* task is now **item 4 alone**, and item 4 is
    open, so nothing was unblocked.
  - **item 4 — test-purchase Yandex login(s).** ⛔ **NOT DONE** per the owner, 2026-09-12. `0065` also
    names this separately in its own `## Dependencies`.

  🚨 **REMOVING THE APPROVAL HALF DOES NOT UNBLOCK `0065`.** It removes one reason of two from one
  condition of three. `0062` and `0195` are untouched.

  ⛔ **`0065` HAS NOT BEEN EDITED and its `## Status` has not been changed** — this narrowing is
  recorded here, where the ruling landed. ⚠️ **`0065`'s brief still carries the words *"Yandex catalog
  approval"* in its Status line, its `## Dependencies` and its `## Notes`; those three places are now
  STALE and were deliberately left for the owner to rule on rather than edited between agents.**

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
>
> 📌 **UPDATED 2026-09-12, later again — OWNER RULING, given live in session and relayed through the lead
> session. This supersedes the paragraph above for items 1–4.** The owner reported back: **item 1 (secret
> key) — ISSUED**; **item 4 (purchases enabled) — ENABLED**. **Items 2 (test-purchase login(s)) and 3
> (`citizenship_ui` flag) — NOT DONE, per the owner.** Recorded as the owner's report — nothing in this
> repository can see the Yandex console, so none of it is repo-verifiable. Item 5 (cosmetics item) did not
> move — still unknown. ~~⚠️ **Issued ≠ on the box:** the key reaches the profile box only via a profile-box
> redeploy with `YANDEX_PAYMENTS_SECRET` populated (`0195` forwards it); this brief does NOT assert that
> redeploy happened, so the `/v1/payments/*` 503s are NOT cleared by issuance alone — see
> [`0065`](../0065-citizenship-paid-live-verification/brief.md).~~
>
> 📌 **CORRECTED 2026-09-20 on an OWNER RULING** (live in the `fkit lead` session via `AskUserQuestion`,
> relayed by `fkit-lead`). ✅ **The secret IS on the box** — evidence table under `## Verification` item 3.
> ⚠️ **Owner-attested provenance, not repo-verified.** ⛔ **Not a claim that payments work:** provenance is
> not correctness and no purchase has been exercised. ⛔ **No status token, gate or blocker count moved.**

1. **Was the per-game payments secret key collected?** (`## Verification` item 3.) ~~Unknown.~~ ✅ **ISSUED
   2026-09-12 — owner ruling, given live in session and relayed through the lead session.** ~~⚠️ Issued, not
   shown provisioned on the box — see the note above.~~ ✅ **AND ON THE BOX, corrected 2026-09-20 on an
   OWNER RULING** — evidence under `## Verification` item 3. ⚠️ Owner-attested, not repo-verified; ⛔ not
   a claim that payments work.
2. **Were test-purchase Yandex login(s) added** under In-App Purchases → Settings? (item 4.) ~~Unknown.~~
   ⛔ **NOT DONE as of 2026-09-12 — per the owner, same ruling.** Still a hard `0065` prerequisite.
3. **Is the `citizenship_ui` Yandex experiment flag set?** ~~Unknown.~~ ⛔ **NOT DONE as of 2026-09-12 — per
   the owner, same ruling.** This is the **remote half** of the
   citizenship kill switch (`src/client/flashist/FlashistFacade.ts:174`) and its validation is
   [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md), a
   declared launch gate.
4. **Are purchases enabled for the game at all** in the Yandex Games dashboard? ~~Unknown.~~ ✅ **ENABLED
   2026-09-12 — owner ruling, given live in session and relayed through the lead session.** A registered,
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
