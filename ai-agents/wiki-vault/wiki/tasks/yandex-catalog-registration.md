# Register Yandex Games Catalog Items

**Source**: `ai-agents/tasks/done/0014-yandex-catalog-registration/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 · task `0014` · type: **non-technical** (manual work in the Yandex Games dashboard, not engineering)

> 🆕 **2026-09-26 — two residuals on this page are now answered by the launch.** (1) **The console flag's
> NAME and VALUE are confirmed in effect**: flipping `citizenship_ui` off hid the card and setting it back
> to `enabled` restored it in the live `0.0.154` build ([[tasks/citizenship-kill-switch-launch-check]]).
> (2) **The first real purchases went through** — a real player's and the owner's test purchase both
> returned 200 ([[tasks/citizenship-go-live]], [[tasks/citizenship-paid]]). The live price label is
> **per account from Yandex**: the test account saw *"249 RUB"*, the main account *"249 YAN"*.

> 🚨 **READ THIS FIRST — WHAT "NOT OWNER-VERIFIED" MEANS HERE IS NOT CLERICAL.**
> **Every single deliverable this task tracked is OWNER-ATTESTED AND NOT REPO-VERIFIABLE.** Nothing in
> this repository can see the Yandex console, and it never could. The close rests on the owner's word
> throughout. ⛔ **Do not summarise this close as "verified".**

## Goal

Register the in-app purchase catalog items the paid-citizenship launch needs, in the Yandex Games
developer dashboard, and collect the per-game payments secret key. It gates
[[tasks/yandex-payments-implementation]]'s go-live: the purchase UI hides itself when the catalog item
is absent or comes back unavailable in the Yandex catalog response.

## Key Changes

**No code changed.** This task's product is console state plus a corrected record. What it settled:

### 1. The product ID is fixed at exactly `citizenship` — it is not a choice

The dashboard's job is to **match** the code, not to pick a value and report it back. Two independent
places enforce it: `src/core/profile/PaymentsContract.ts` (`PAYMENT_PRODUCT_IDS` is a one-entry
`as const` array feeding a Zod **enum**, so any other string fails at the wire boundary) and
`src/profile-server/PaymentsRepository.ts` (`grantPaidPurchase()` throws
`no grant defined for productId "<x>"` for anything else, deliberately, so a new product fails loudly
rather than silently minting citizenship).

🚨 **A one-character mismatch in the dashboard is a paid purchase that grants nothing** — it surfaces
as a Zod rejection or a thrown grant, *after* the player has paid, and nothing human is watching for
it. The brief records that an earlier version of its own `## Verification` list had this **backwards**,
describing the ID as flowing dashboard → engineering; that bullet is struck with the reasoning kept.

✅ Owner confirmed **2026-09-12** the ID was entered as exactly `citizenship`.

### 2. The external approval gate is VOID (owner ruling, 2026-09-19)

Owner, verbatim: *"The gate existed before, but now there are changes in the way Yandex.Games operates,
so we don't need to wait for their approval anymore."*

⚠️ **This does NOT say the earlier record was wrong** — it was a real gate when written; Yandex changed
how they operate. ⚠️ **Void ≠ satisfied:** the brief does **not** now assert the item is approved or
live, only that nobody is waiting on approval. The status token moved `🚧 Blocked` → `🔲 Backlog` on
that ruling — the producer's read, not an owner ruling on the token.

### 3. Four owner rulings on 2026-09-22 closed every remaining deliverable

All four given live in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer`
holding **no owner channel** (ADR-021). ⛔ **Not producer precedent — one ruling, one task.**

| # | Deliverable | Ruling | Kind of change |
|---|---|---|---|
| a | **Test-purchase Yandex login** | ✅ **ADDED** — *"[the owner's test account] - is already added as a test account (it was done in one of our previous sessions)."* | 🚨 the **owner correcting their own 2026-09-12 report**, not a discovery; **no date** is claimed beyond "a previous session" |
| b | **Cosmetics catalogue item** | ⛔ **DELIBERATELY NOT REGISTERED** — *"We don't need it if it's Sprint 5."* | the **instruction** was overridden; ⛔ **not** "unknown" and **not** outstanding work |
| c | **Price unit** | ✅ **99 YAN** (Yandex portal currency), **not 99 ₽** — 📌 *later change, 2026-09-25: the owner re-priced it to **249 Yan** in the Yandex console; see below* | a deliberate **revenue** decision, see below |
| d | **`citizenship_ui` experiment flag** | ✅ **SET** — *"I already set it and verified it being set."* | again the **owner correcting their own 2026-09-12 report** |

**On (b) — read the sequence, do not merge it.** The **2026-09-19** ruling voided only the *rationale*
("buy moderation lead time") and said in terms that the instruction to register cosmetics was
**UNCHANGED**. The **2026-09-22** ruling overrode **the instruction itself**. Both notes are kept; they
are sequential, not contradictory. ⛔ **This does not cancel cosmetics as future work** — it is
Sprint 5's to register when Sprint 5 needs it.

> 📌 **LATER CHANGE — 2026-09-25 (recorded in this task's brief, appended, not a rewrite):** the owner
> changed the catalog price in the Yandex console to **249 Yan** (owner ruling *"Yes, update docs"*,
> live in the `fkit lead` session, relayed to a spawned `fkit-producer`). The 99 YAN settlement below
> was true until then and is kept as written. The **unit** decision (Yan, not rubles) stands. The live
> docs (`PROJECT.md`, the producer knowledge base, the Sprint 4 plan, the Backlog board, ADR-102) now
> say 249 Yan. ⚠️ **Owner-attested, not repo-verifiable** — the code reads the price from the Yandex
> catalog at runtime, so nothing in the repo carries it.

**On (c) — the reason, recorded so it is not re-litigated.** Owner, verbatim: *"it's 99YAN - and I
think we're not doing 99 Rub, because 99 Rub will leave us around 40-49 RUB of revenue (after
Yandex.Games's cuts), which is too small, so we're going with 99 YAN."* ⇒ ⛔ **A later reader proposing
"simplify to 99 ₽" is proposing a revenue cut the owner has already rejected.** ⚠️ The 40–49 ₽ net
figure is **the owner's own estimate as stated** — not verified here, and *"around"* is theirs.
The repo disagreed with itself and this settled which source was right: `sprint4-yandex-payments-findings.md`
(catalog field is an *"integer price in Yandex portal currency"*, target *"99 YAN"*) ✅ **CORRECT**;
this brief's own `## What Needs to Be Done` table ("99 **rubles**") ⛔ **WRONG, corrected**.
✅ **This affects NO build** — nothing in the codebase reads, validates or depends on the price. It is a
record-accuracy fix.

### 4. The per-game payments secret

✅ **Issued 2026-09-12** (owner ruling) and ✅ **on the box, corrected 2026-09-20** — a `POST` to a
deliberately non-existent sub-path under the payments prefix answered **404, not 503**, so the
`paymentsEnabled` middleware **passes**; `YANDEX_PAYMENTS_SECRET` is present in the running container
**at length 32**; the startup warning *"payments endpoints disabled"* appears **0 times**.
✅ **Provenance answered, OWNER-ATTESTED** — *"that's the real Yandex key, I set it."*

🚨 ⛔ **THIS DOES NOT MEAN PAYMENTS WORK.** Provenance ≠ correctness; nothing shown establishes the
deployed value is the *correct* key, and **no real purchase has ever been exercised** — not a test one,
not a live one. **A page saying "payments work" would be exactly as wrong as one saying they 503.**
🔒 The value has never been read into any log, file or transcript — length only.

## Outcome

**Closed 2026-09-22, `✅ Done (agent-closed — not owner-verified)`**, on the owner's verbatim
**"Close it"** — the default variant, ⛔ **not** the owner-verified upgrade. `/fkit-task-done` was
invoked by a spawned `fkit-producer` with no owner channel (ADR-033 §5) and the folder moved to
`ai-agents/tasks/done/`.

**The close condition as it read at close:** `## Verification`'s four items — **1 ✅, 2 ⛔ VOID, 3 ✅,
4 ✅** — and the `## Status` deliverables table **empty**.

### ⛔ What this close does NOT do

- ⛔ **It does NOT unblock task `0065`** (paid-citizenship live verification — still a backlog brief,
  no vault page). It satisfies `0065`'s **`0014` condition only**. `0062` and `0195` are untouched, so `0065` stays
  `🚧 Blocked` — on **TWO** conditions now, not three. ⛔ **No mover was invoked on `0065`.**
  ⚠️ **A dropped count is not movement toward go-live.**
- ⛔ **SATISFIED ≠ EXERCISED: no purchase of any kind has ever been made.** That is `0065` step 3,
  still unrun. 📌 The owner confirmed 2026-09-22 they **will** run it, after the game deploy, signed in
  as the test account. 🚩 A lead-session claim that the owner *refused* test purchases was a
  **misattribution and was never true** — it appears nowhere in this repository.
- ⛔ **"Set in the console" is NOT "observed taking effect in a build"**, for the `citizenship_ui` flag
  — and that observation is **impossible today**: `src/client/flashist/FlashistFacade.ts` gates the
  citizenship surfaces on `CITIZENSHIP_CARD_ENABLED && await isCitizenshipUiEnabled()`, and
  `CITIZENSHIP_CARD_ENABLED` is **`false`**, so `&&` short-circuits and the remote flag is **never read
  on any build, production included**. That observation is task `0238`'s at launch.

### 🚩 Residual carried out of this close — asserted neither way

**The `citizenship_ui` flag's NAME and VALUE were never confirmed against the code.** The code requires
the name **exactly** `citizenship_ui` and the value **exactly** `enabled` (both in
`src/client/flashist/FlashistFacade.ts`). ⛔ **A one-character mismatch leaves the kill switch silently
OFF at launch with nothing warning anyone** — the same failure class as the product ID above. Nothing
in this repository can read the console, so this is **not a defect claim and not a claim either way**.
Flagged for `0238`; ⛔ `0238` was **not** edited by the ruling.

### ✅ A list conflict that DISSOLVED rather than being settled

From 2026-09-19 the brief carried a real internal conflict: `## Verification`'s four items (its *named*
close condition) read satisfied, while `## Status`'s deliverables table still had the `citizenship_ui`
row open — the flag was tracked as a `0014` deliverable **without ever being added to the Verification
list**. Ruling (d) emptied the table, so both lists agreed. ⛔ **No agent chose between them, and the
question — *is the `citizenship_ui` flag part of `0014`'s close condition, or is it `0238`'s alone?* —
is still UNANSWERED.** ⛔ **This close is not precedent for picking a list.**

### One thing that stayed unknown on purpose

⛔ **Whether the cosmetics item was ever registered in the console is NOT KNOWN and is asserted neither
way.** The 2026-09-22 ruling settled the **instruction** (do not register it as part of `0014`), not
the fact. ⚠️ And the standing technical finding is unchanged: **no code path can sell a cosmetics SKU**
— `PAYMENT_PRODUCT_IDS` has exactly one entry, so any other `productId` fails Zod validation
(`400` from the payments intent route) and would fail again server-side at the grant branch. Selling it
will require its **own** `PAYMENT_PRODUCT_IDS` entry **and** its own grant branch.

## Related

- [[decisions/sprint-4]] — the board this task closed on, and the 2026-09-22 rulings recorded there
- [[tasks/yandex-payments-implementation]] — task `0019`, whose go-live this task gates
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, which forwards `YANDEX_PAYMENTS_SECRET` to the profile box
- [[tasks/yandex-payments-investigation]] — the Sprint 4 investigation behind the payments design
- [[decisions/config-parity-failure-class]] — the failure class `0195` belongs to
- [[systems/player-profile-store]] — where the grant lands
- [[tasks/citizenship-kill-switch-coverage]] — the `citizenship_ui` kill switch this task set the remote half of
- [[tasks/hide-citizenship-card-flag]] — `CITIZENSHIP_CARD_ENABLED`, the local half that short-circuits the remote read
- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — task `0291`, the remaining code precondition for the launch flip
- [[decisions/licensing-compliance]] — the other pre-launch gate, already demonstrated
- [[decisions/sprint-5]] — where `0238`, the task that must observe this `citizenship_ui` flag actually taking effect, now sits
- [[tasks/analytics-p1-citizenship-funnel]] — task `0021`, whose funnel measures the price point this task set (now 249 Yan)
- [[systems/project-brief]] — product ground truth carrying the current price (249 Yan since 2026-09-25)
- [[decisions/adr-102-privilege-refresher-fails-open]] — ADR-102, whose dated note records the 2026-09-25 re-price
- [[tasks/monetization-analytics-spec]] — the analytics spec whose `price_rubles` field name the re-price made misleading
- [[decisions/sprint-backlog]] — the Backlog board, whose `0248` row carries the new price
