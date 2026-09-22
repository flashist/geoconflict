# Task — Paid Citizenship: Live Verification & Go-Live Tail

## ID
0065

## Sprint
Sprint 4

## Priority
High — the go-live gate for the monetization milestone. Everything buildable was split into `0018`
(mock scope); this task is what remains once Yandex delivers.

## Status
🚧 Blocked — ~~three~~ **TWO** conditions: ~~~~Yandex catalog approval~~ **test-purchase Yandex login(s)** +
per-game secret-key issuance (`0014`),~~ ✅ **the `0014` condition is SATISFIED — corrected 2026-09-22, see Correction 4 below**;
`0062` (`PROFILE_INTERNAL_TOKEN` not forwarded to prod — no profile row is ever created there), **and
`0195`** (`YANDEX_PAYMENTS_SECRET` on the profile box — ~~not forwarded; every `/v1/payments/*` route
returns 503 there~~ **PRESENT and the routes are NOT failing closed, verified on the box 2026-09-19;
the value's PROVENANCE is owner-attested 2026-09-20 — the owner set the real Yandex key (⚠️
owner-attested, NOT repo-verified); the condition stays open because the value is still not shown
CORRECT and no real purchase has been exercised**). ~~All three~~ **Both remaining conditions** must clear; none alone unblocks.
~~**Blocker count unchanged: THREE — and the owner CONFIRMED that reading on 2026-09-20** (the
alternative, clearing the `0195` condition down to two blockers, was put to them and declined).~~
📌 **THE THREE-COUNT WAS OWNER-CONFIRMED 2026-09-20 AND IS SUPERSEDED BY A LATER OWNER RULING OF
2026-09-22** — ⚠️ **read the distinction:** the 2026-09-20 confirmation declined to clear the **`0195`**
condition, and ⛔ **that still stands untouched — `0195` is open.** What moved on 2026-09-22 is a
**different** condition, **`0014`**, which the owner then closed outright.
⇒ **Blocker count: TWO — `0062` and `0195`.**
🚨 ⛔ **THIS TASK STAYS `🚧 Blocked`.** Its own line says *"none alone unblocks"*, and **both remaining
conditions are untouched.** ⛔ **No mover skill was invoked on this task.**

---

### 🔴 TWO CORRECTIONS APPLIED 2026-09-19, PLUS ONE ADDITION 2026-09-20 — read the authority before the outcome

⛔ **Authority.** All three are **OWNER ANSWERS given live in the `fkit lead` session via
`AskUserQuestion`** — Corrections 1 and 2 on **2026-09-19**, Correction 3 on **2026-09-20** — relayed
by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel of its own.** ⛔ **NOT producer
precedent — one ruling, one task.**
⛔ **None of them changes this task's `## Status` token, `## Priority`, `## Sprint` or folder, and no
mover skill was invoked.**

#### Correction 1 — the "Yandex catalog approval" gate is VOID, and this brief's three stale citations of it are corrected

The owner ruled on 2026-09-19 that **Yandex no longer approves the in-app**, verbatim: *"The gate
existed before, but now there are changes in the way Yandex.Games operates, so we don't need to wait
for their approval anymore."* That ruling was recorded in
[`0014`](../../done/0014-yandex-catalog-registration/brief.md)'s `## Status` the same day, and `0014` moved
`🚧 Blocked` → `🔲 Backlog`. **This brief was deliberately left untouched at that time**, with its
three stale *"Yandex catalog approval"* citations flagged for the owner. **The owner has now approved
correcting them** — Status, `## Dependencies`, `## Notes`.

⛔ **WORDING ONLY. THIS TASK IS NOT RE-GATED, AND IS NOT UNBLOCKED EITHER.** Verified independently
against `0014`'s own record: **removing the approval half removes ONE REASON OF TWO, IN ONE CONDITION
OF THREE.** Still outstanding:

| Still outstanding | Where it lives |
|---|---|
| **Test-purchase Yandex login(s)** — not done, per the owner | `0014` verification item 4, **and named independently in this brief's own `## Dependencies`** |
| **`0062`** — `PROFILE_INTERNAL_TOKEN` never forwarded to prod | its own task |
| **`0195`** — the payments secret condition (see Correction 2) | its own task |

⇒ **BLOCKER COUNT STAYS THREE.** ⛔ Do not read this correction as movement.

#### Correction 2 — 🚨 the "every `/v1/payments/*` route returns 503, correctly failing closed" claim is FALSE as of 2026-09-19

**`fkit-lead` verified this on the profile box on 2026-09-19, read-only.** Three independent
observations:

1. A `POST` to a **deliberately non-existent sub-path** under `/v1/payments/` on the box's loopback
   returned **404, not 503**. `Server.ts` mounts the `paymentsEnabled` middleware across the whole
   `/v1/payments` prefix, **ahead of every handler**, so a 503 would have meant the secret was absent.
   **404 means no route matched *after* the middleware let it through** ⇒ **the middleware PASSED.**
2. `YANDEX_PAYMENTS_SECRET` is **present in the running `profile-api` container, length 32.**
   🔒 **The value was never read into any log, file or transcript — length only.**
3. The startup warning `payments endpoints disabled` appears **0 times** in that container's logs.

⚠️ **THE LIMIT OF THIS EVIDENCE, STATED HONESTLY.** It shows the secret is **on the box and
non-empty.** It does **NOT** show the value is **correct**, and it does **not** exercise a real
purchase. **It settles *"is it there"* — nothing more.** So the `0195` condition is **kept open on a
corrected reason**, not cleared: what is unproven is now **value correctness and a real signed
payload**, which is exactly what this brief's steps 1 and 3 exist to establish.

🚨 **WHY THIS MATTERS BEYOND THIS BRIEF.** Wording of the form *"the value still lands empty on the
box, so every `/v1/payments/*` route still returns 503, correctly failing closed"* is **traceable to
2026-09-01** and appears in **several other documents**. It is **false as of today's observation**.
Corrected **here**; **flagged, not rewritten, elsewhere** — see `## Notes` → *Stale-claim sweep*.

📌 **The `0062` condition's reason was corrected 2026-09-04 — the condition itself is UNCHANGED and
still open.** `0062`'s `D2` check was run that day against the live prod container:
`PROFILE_INTERNAL_TOKEN` reads **empty**, but **the owner deliberately blanked it before the
2026-08-29 deploy**, so the result is **inconclusive** — neither a confirmation nor a refutation. The
forwarding fix *is* present (`deploy.sh:312`); it has simply never been exercised with a real value.
**So the `0062` gate is not "run the verification" — it is citizenship readiness + the outstanding
profile VPS setup work.** Owner, 2026-09-04, verbatim: *"I probably will keep it blank again, because
the citizenship is not fully ready to be deployed yet and we need to do some additional work in terms
of the profile VPS setup."* Blocker count still **three**; status token unchanged.

📌 **The `0014` condition's reason NARROWED 2026-09-12 — OWNER RULING, given live in session and relayed
through the lead session — the condition itself is UNCHANGED and still open.** The owner **issued the
per-game secret key** and **enabled purchases** for the game on 2026-09-12. Still outstanding on `0014`:
~~**catalog approval** and~~ **test-purchase login(s)** (not done, per the owner). The `citizenship_ui` flag is
also not done — that is `0238`'s gate, not this one. ⚠️ **An issued key lands on the box ONLY via a
profile-box redeploy with `YANDEX_PAYMENTS_SECRET` populated** (`0195`'s forwarding path) — ~~**this brief
does NOT assert that redeploy happened**, so every `/v1/payments/*` route is still to be presumed **503**
until it is done and observed.~~ **Issuance alone clears nothing.** Blocker count still **three**; status
token unchanged.

  📌 **BOTH STRIKES ABOVE ARE DATED 2026-09-19 (Corrections 1 and 2 in the block above `## Status`) — kept, not deleted.**
  The approval half is **void** by owner ruling; and the presumed 503 is **contradicted by a read-only
  box observation the same day** — the secret is **present, length 32**, the `paymentsEnabled`
  middleware **passes** (a deliberately bad sub-path answered **404, not 503**), and
  `payments endpoints disabled` appears **0 times** in the container's logs. ⚠️ **That settles *"is it
  there"* only — NOT that the value is correct, and no real purchase has been exercised.**
  ⛔ **Blocker count still three; status token still unchanged.**

#### Correction 3 — 2026-09-20: the secret's PROVENANCE is established by the owner, and the owner CONFIRMS the blocker count is three

⛔ **Authority: an OWNER ANSWER given live in the `fkit lead` session via `AskUserQuestion` on
2026-09-20**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel. ⛔ **Not
producer precedent.**

**(a) Provenance — where the length-32 value came from.** Correction 2 established only that a
non-empty 32-character value sits in the running container. A wiki librarian then raised the sharp
follow-up: **nobody could say where it came from, and a placeholder would present identically.** The
owner answered, in substance: ***"Yes — that's the real Yandex key, I set it."*** I.e. the owner
deployed the profile box with the per-game key populated, after Yandex issued it (issuance itself
being the earlier owner ruling of 2026-09-12).
🔒 **The value has never been read into any log, file or transcript — length only.**

⚠️ **OWNER-ATTESTED, NOT REPO-VERIFIED.** A deploy leaves no artifact in git, so nothing in this
repository can confirm it. This has **exactly the same standing** as the 2026-09-12 key-issuance
ruling: recorded as attested, never as repo-established.

🚩 **THIS CORRECTS A STANDING CLAIM — BOTH HALVES OF IT ARE NOW KNOWN FALSE.** Several documents say,
in substance, *"no profile-box redeploy with `YANDEX_PAYMENTS_SECRET` populated is recorded, so the
value is to be presumed empty on the box and every `/v1/payments/*` route presumed 503."*

| The standing claim | Now known |
|---|---|
| no redeploy with the value populated is recorded | ❌ **false** — the owner did that redeploy (owner-attested 2026-09-20) |
| presume the value empty, presume every `/v1/payments/*` route 503 | ❌ **false** — present, length 32; the `paymentsEnabled` middleware observed **passing** (a deliberately bad sub-path answered **404**), `payments endpoints disabled` **0 times** in the logs (2026-09-19) |

**(b) ⛔ IT STILL DOES NOT PROVE THE VALUE IS CORRECT, AND NOTHING CLEARS.** Provenance makes
correctness **more likely**; it does not establish it. Only this brief's **step 1** (a first real
signed payload returning 200) and **step 3** (a real test purchase) settle correctness. **The owner
separately ruled on 2026-09-19 that the `0195` condition stays open on correctness — blocker count
THREE — and on 2026-09-20 CONFIRMED that reading**, with the alternative (clear it, two blockers) put
to them and **declined**. ⛔ **No condition cleared, no blocker count changed, no status token
changed, no mover invoked.**

⚠️ **The confirmation is itself the new fact here.** Before it, the "stay open" reading was a
*producer's conservative call*, flagged as an open question for the owner in the Sprint 4 addendum. It
is now an **owner-confirmed** position — a different fact from a producer having chosen it.
⛔ **Do not re-litigate it.**

🚩 **SWEEP, 2026-09-20 — same conservative scope as Correction 2.** Corrected **here** and in `0065`'s
Sprint 4 row. Everything else carrying the *presumed-empty / presumed-503 / provenance-unknown*
assumption is **reported, not rewritten** — the list is in `## Notes` → *Stale-claim sweep*, and it now
covers provenance as well as the 503 claim. ⛔ **`ai-agents/wiki-vault/**` is `fkit-wiki`'s alone
(ADR-005): its payments pages currently record provenance as unverified and need a later pass —
flagged, never touched.**

#### Correction 4 — 2026-09-22: the `0014` condition is SATISFIED and the blocker count drops to TWO

⛔ **Authority.** An **OWNER RULING given live in the `fkit lead` session on 2026-09-22**, relayed by
`fkit-lead` to a spawned `fkit-producer` holding **no owner channel of its own.** The owner was asked
whether this brief's stale `0014` text should be corrected and ruled **"Correct it"**.
⛔ **Not producer precedent — one ruling, one task.**

**What this brief said, and why it was stale.** The `## Status` line named *"three conditions"* and
described its `0014` condition as *"test-purchase Yandex login(s) + per-game secret-key issuance"*.
**Both halves are now attested done:**

| Half of the `0014` condition | State | Date | Standing |
|---|---|---|---|
| **Per-game secret key, on the profile box** | ✅ done | 2026-09-20 | owner-attested provenance + three read-only box observations (Correction 3) |
| **Test-purchase Yandex login(s) added** | ✅ done | 2026-09-22 | ⚠️ **OWNER-ATTESTED, NOT REPO-VERIFIABLE** — the owner **correcting their own 2026-09-12 report**; verbatim: *"ruFlashist - is already added as a test account (it was done in one of our previous sessions)."* |

📌 **[`0014`](../../done/0014-yandex-catalog-registration/brief.md) was itself CLOSED the same day** on
a separate owner ruling (**"Close it"**), as `✅ Done (agent-closed — not owner-verified)`, and has moved
to `tasks/done/`. Its remaining deliverable, the `citizenship_ui` experiment flag, was also ruled **set**
by the owner that day — ⛔ **that flag is `0238`'s gate, never this task's**, and it is named here only so
nobody re-derives it as an open `0065` blocker.

⇒ ✅ **THE `0014` CONDITION IS SATISFIED. Blocker count: THREE → TWO (`0062` and `0195`).**

🚨 ⛔ **AND THIS TASK STAYS `🚧 Blocked` — do not read a dropped count as movement toward go-live.**
Its own Status line says *"none alone unblocks"*. `0062` (`PROFILE_INTERNAL_TOKEN` never forwarded to
prod) and `0195` (the payments secret's **correctness**, not its presence) are **untouched by this
ruling.** ⛔ **No status token changed and no mover skill was invoked on this task.**

⚠️ **THE SATISFACTION IS OWNER-ATTESTED, NOT REPO-VERIFIED, ON BOTH HALVES.** Nothing in this
repository can see the Yandex console, and a deploy leaves no artifact in git. ⛔ **Satisfied ≠
exercised:** a nominated test login makes a test purchase **possible**; **no purchase of any kind has
ever been made** — that is this brief's **step 3**, still unrun.

---

#### 📌 RECORDED 2026-09-22 — the owner WILL perform step 3, and a claim to the contrary was NEVER TRUE

**From the same session.** The owner confirmed they **will** perform this brief's **step 3 real test
purchase**, **after the game deploy**, **signed in as the test account**.

🚩 **⛔ A CLAIM CIRCULATING IN THE LEAD SESSION THAT THE OWNER REFUSED TO MAKE TEST PURCHASES WAS A
LEAD MISATTRIBUTION AND WAS NEVER TRUE.** It **appears nowhere in this repository** (searched). It is
recorded here — corrected, not merely dropped — **so it is not re-invented** by a later reader who
half-remembers it. ⛔ **Nothing in this brief ever rested on it**, and step 3 was never waived,
descoped, or owner-declined.

## Owner
fkit-coder

## Origin

Split out of [`0018-citizenship-paid`](../0018-citizenship-paid/brief.md) on 2026-08-23 by owner
ruling ("maximize work that can proceed without anything real from Yandex; don't block on external
turnaround"). `0018` now carries the mock-buildable scope (client flow, grant, reconciliation UI —
all against a mocked SDK catalog); this task carries **everything that genuinely needs Yandex or
production**. Modeled on the `0019` precedent
([`live-verification-checklist.md`](../../done/0019-yandex-payments-impl/live-verification-checklist.md)
— owner-ruled deferral at the `0019` plan gate, 2026-08-14). This task **absorbs `0019`'s deferred
checklist**: running it is part of this scope, so it is not left stranded in a `done/` folder.

## Dependencies

- **`0014`** — catalog item `citizenship` registered + purchases enabled + **per-game secret key
  issued** and provisioned on the profile VPS as `YANDEX_PAYMENTS_SECRET` (0600 env file, via
  `setup-profile.sh`). Never committed, never logged. 📌 **2026-09-12 — owner ruling, given live in session and relayed through the lead session:
  key ISSUED, purchases ENABLED. Still open: ~~catalog approval;~~ test-purchase login(s) (not done, per the
  owner).** ⚠️ **Issued ≠ provisioned:** it reaches the box only via a profile-box redeploy with the value
  populated (`0195`'s path) — ~~not asserted to have happened; the 503s are not cleared by issuance alone.~~

  📌 **CORRECTED 2026-09-19 — OWNER RULINGS, both recorded in full in the block above `## Status`. Struck, not deleted.**
  - **The approval half is VOID** (owner: Yandex no longer approves the in-app). **What this dependency
    still needs from `0014` is the test-purchase Yandex login(s)** — and this brief names that
    **independently**, in the final bullet of this section. ⛔ **One reason of two removed, from one
    condition of three. This dependency is NOT satisfied.**
  - 🚨 **The 503 clause is contradicted by a read-only box observation, 2026-09-19:** the secret **IS**
    present in the running `profile-api` container (**length 32** — 🔒 value never read into any log,
    file or transcript), a `POST` to a deliberately non-existent sub-path under `/v1/payments/`
    answered **404, not 503** ⇒ the `paymentsEnabled` middleware **passed**, and
    `payments endpoints disabled` appears **0 times** in the container's logs. ⚠️ **LIMIT: that settles
    *"is it there"* and nothing else — the value is NOT shown correct and no real purchase was
    exercised.** ⇒ **This dependency stays open on provisioning-correctness, not on absence.**

  📌 **ADDED 2026-09-20 — OWNER ANSWER, recorded in full as Correction 3 above `## Owner`.** The
  *"Issued ≠ provisioned"* worry above is **answered**: the owner states **they performed the
  profile-box redeploy with the real per-game key populated.** ⚠️ **Owner-attested, NOT repo-verified**
  — same standing as the 2026-09-12 issuance ruling; a deploy leaves no artifact in git. ⛔ **The
  dependency is STILL NOT satisfied:** provenance is not correctness, and the test-purchase login(s)
  are still outstanding regardless. Blocker count still **three** — **owner-confirmed** 2026-09-20.

  📌 **SUPERSEDED 2026-09-22 — OWNER RULING ("Correct it"), recorded in full as Correction 4 above
  `## Owner`.** ✅ **The test-purchase login(s) ARE added** (owner, 2026-09-22 — the owner correcting
  their own 2026-09-12 report; ⚠️ **owner-attested, NOT repo-verifiable**), which was the last half of
  this dependency still outstanding. ⇒ ✅ **THE `0014` DEPENDENCY IS SATISFIED**, and
  [`0014`](../../done/0014-yandex-catalog-registration/brief.md) was closed the same day
  `✅ Done (agent-closed — not owner-verified)`. **Blocker count: THREE → TWO (`0062`, `0195`).**
  ⚠️ **Read what did NOT move:** the *"provenance is not correctness"* sentence above is about **`0195`**
  and is **UNCHANGED and still true** — that condition is open, and the owner's 2026-09-20 refusal to
  clear it stands. ⛔ **`0065` stays `🚧 Blocked`; no mover was invoked.**
- **`0062`** — `PROFILE_INTERNAL_TOKEN` forwarded to prod and verified end to end (its own
  verifications 2–3). Without it no profile row exists to attach a purchase to.
- 🚨 **`0195`** — [`0195-forward-yandex-payments-secret-in-profile-deploy`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md).
  ✅ **Shipped 2026-09-01** — closed `Done (agent-closed — not owner-verified)`, built with its own live
  verification deferred. ⚠️ **Owner ruling 2026-09-01 — do NOT read that ship as a blocker clearing.**
  Recorded 2026-08-28 so it was not rediscovered mid-checklist: the per-game secret key above reaches the
  box via `build-deploy-profile.sh` → `setup-profile.sh` → `profile.env`, and `build-deploy-profile.sh`
  omitted the variable from its staged-export block — **that omission is what `0195` fixed.** But
  ~~**`0014` has not issued the key**~~ 📌 **struck 2026-09-12 — the key WAS issued that day (owner ruling,
  given live in session and relayed through the lead session); ~~what is still unrecorded is a profile-box
  redeploy with the value populated~~ 📌 **struck again 2026-09-20 — the OWNER STATES THEY PERFORMED THAT
  REDEPLOY with the real key populated (owner-attested, NOT repo-verified; Correction 3 above)**, so ~~the value is still to be presumed empty going in, `setup-profile.sh`'s
  `${YANDEX_PAYMENTS_SECRET:-}` default still writes it empty on the box, and `Routes.ts`'s
  `paymentsEnabled` middleware **still returns `503 {"error":"payments_unavailable"}` on every
  `/v1/payments/*` request** — correctly, failing closed. **Steps 1–4 below all drive those routes and
  would every one of them fail with 503 today**, the only clue being a single `warn` line at container
  startup.~~ Forwarding (`0195`) and issuance (`0014`) are each necessary and neither alone is sufficient.

  🚨 **THE STRUCK PASSAGE IS FALSE AS OF 2026-09-19 — a read-only box observation by `fkit-lead`, recorded
  in full in the block above `## Status`. Struck, not deleted, because it was the honest reading of the
  code until it was checked against the box.** The secret **IS** present in the running `profile-api`
  container (**length 32**; 🔒 value never read into any log, file or transcript); a `POST` to a
  deliberately non-existent sub-path under `/v1/payments/` answered **404, not 503**, so the
  prefix-mounted `paymentsEnabled` middleware **passed**; and `payments endpoints disabled` appears
  **0 times** in that container's logs. ⇒ **Steps 1–4 would NOT be stopped by a 503 today.**
  ⚠️ **LIMIT — do not over-read it:** this settles *"is it there"* only. **It does NOT show the value is
  correct**, and **no real purchase has been exercised** — which is what steps 1 and 3 are for. ⇒ **The
  `0195` condition stays OPEN on a corrected reason (correctness, not absence); blocker count still THREE.**
  📌 **AND 2026-09-20 — the OWNER CONFIRMED that "stays open on correctness / three blockers" reading**
  (the alternative — clear it, two blockers — was put to them and declined), **and separately established
  the value's PROVENANCE: it is the real Yandex key, which they set** (⚠️ owner-attested, NOT
  repo-verified). ⛔ **Provenance ≠ correctness. Nothing cleared; count still three.** Full record:
  Correction 3, above `## Owner`.
  **Nothing about this task moved:** status, priority, sprint and dependency set are unchanged. The
  Status line keeps its original wording. The machine-read bullet in `## Notes` below (the board-parsed
  text) was corrected on 2026-09-01 under the same owner ruling — **only** its stale "until `0195`
  ships" clause; all four task ids it names are untouched.
- **`0018`** — mock scope done: the UI and flow this checklist drives must exist.
- `migrations/002_yandex_payments.sql` applied in prod (`npm run migrate` runs at deploy).
- A test-purchase Yandex login added in the dashboard (In-App Purchases → Settings).

## What to Do

Execute the live checklist below in the production/draft Yandex iframe context. This is
verification-driving plus whatever small fixes fall out — any non-trivial defect found becomes its
own task, not silent scope growth here.

### 1. HMAC-construction confirmation (first real signed payload)
`src/profile-server/YandexSignature.ts` deliberately accepts **two** HMAC-SHA256 constructions
(over the base64 payload string, and over the decoded JSON) because Yandex's docs don't pin one
down (`0019` decision).
- [ ] With the first REAL signed payload, confirm `/v1/payments/yandex/complete` returns 200.
- [ ] Determine which construction matched; file a small follow-up task to drop the other.

### 2. Live catalog fetch
- [ ] Open the game as an authenticated Yandex player. `getPaymentsCatalogStatus()` → `'ready'`;
      `hasCatalogProduct('citizenship')` → `true`.
- [ ] Displayed price on the Buy CTA comes from the real catalog response (not the mock's fake
      price, not hardcoded).

### 3. Real test purchase (through the `0018` UI)
- [ ] Under the test-purchase login, complete the flow end to end via the real button.
- [ ] Prod profile shows `is_paid_citizen = true` + `citizenship_purchased_at` set (psql on the box;
      the public `GET /v1/profile` strips paid fields by design).
- [ ] The purchase is consumed (a second `getPurchases()` no longer lists it).
- [ ] Card transitions to State 3. Inbox message: N/A until `0012` exists (documented no-op seam).
- [ ] Funnel analytics observed live: `UI:Tap:PurchaseCitizenship`, `Purchase:Started:Citizenship`,
      `Purchase:Completed:Citizenship`.

### 4. Live reconciliation
- [ ] Interrupt a purchase after Yandex processes it but before the client posts the signature
      (block `/complete` in devtools or kill the tab). Restart. Confirm `/reconcile` grants,
      the token is consumed, and the card shows State 3.
- [ ] Second restart: `getSignedPurchases()` goes null once consumed (no network call).

### 5. Catalog moderation behavior
- [ ] Record observed behavior of the catalog item pre- vs post-moderation (test purchases are
      documented to work before moderation completes — confirm) and whether moderation state ever
      hides the product from `getCatalog()`. This is the empirical check the mock could not provide.

### 6. Flip-ON (go-live)
- [ ] Flip `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` to `true` in
      `src/client/flashist/FlashistFacade.ts` (`0054` coupling) — **only after** 1–4 pass, and skip
      if `0017`'s live tail already flipped it.

## Verification

The checklist above IS the verification. Close only when every box is checked or explicitly
owner-waived, and the follow-up task from step 1 is filed.

## Notes

- **Depends on:** `0014` (~~~~Yandex catalog approval~~ **test-purchase Yandex login(s)** + per-game secret-key issuance~~ — ✅ **SATISFIED 2026-09-22, both halves; `0014` itself is closed. ⛔ Task id KEPT, not removed — the dependency happened, it did not vanish. Blocker count now TWO**), `0062`
  (`PROFILE_INTERNAL_TOKEN` forwarded to prod and verified end to end — without it no profile row
  exists to attach a purchase to), `0195` (`YANDEX_PAYMENTS_SECRET` on the profile box — ~~without it every `/v1/payments/*` route returns 503 there, so steps 1–4 all fail~~ **present and non-empty as of 2026-09-19, and owner-attested 2026-09-20 as the real Yandex key the owner set (not repo-verified); open on whether the value is CORRECT, which only a real signed payload settles — owner-confirmed open 2026-09-20**), and `0018` (mock
  scope done — the UI and flow this checklist drives must exist). ⚠️ **Owner ruling 2026-09-01 —
  forwarding and issuance are each necessary and neither alone is sufficient:** `0195` **shipped
  2026-09-01** and fixed the forwarding gap (`build-deploy-profile.sh` had omitted the variable from
  its staged-export block), but ~~`0014` has **not** issued the per-game key~~ 📌 **2026-09-12 — key ISSUED
  and purchases ENABLED (owner ruling, given live in session and relayed through the lead session); `0014` still
  open on ~~catalog approval +~~ test-purchase login(s)** — ~~and no profile-box redeploy with the value populated
  is recorded, so the value is still to be presumed empty on the box and every `/v1/payments/*` route still
  to be presumed 503 — correctly, failing closed.~~ 📌 **2026-09-20 — BOTH HALVES of that struck clause are
  now known FALSE: the owner states they DID perform the redeploy with the real key populated
  (owner-attested, NOT repo-verified), and the routes were observed NOT 503ing on 2026-09-19. ⛔ Nothing
  cleared — correctness is still unproven; blocker count still THREE, owner-confirmed.**
  Also required before running: `migrations/002_yandex_payments.sql` applied in prod, and a
  test-purchase Yandex login registered in the dashboard. The full prose for every gate is in the
  `## Dependencies` section above, which stays the human-facing explanation — this bullet is the
  canonical machine-readable form, and it is the only shape `dashboard.sh` can read.

  📌 **THE FIRST TWO STRIKES IN THIS BULLET ARE DATED 2026-09-19 (Corrections 1 and 2 above `## Owner`), THE
  THIRD IS DATED 2026-09-20 (Correction 3) — all kept, not deleted. ⛔ Task ids untouched: all four
  (`0014`, `0062`, `0195`, `0018`) still named, blocker count still THREE, `## Status` token unchanged.**
  Only stale *reasons* were corrected: the void approval gate, the false *"returns 503, failing closed"*
  claim, and the *"no redeploy with the value populated is recorded"* claim.

- 🚩 **STALE-CLAIM SWEEP, 2026-09-19 — FLAGGED, NOT REWRITTEN. Recorded here because this is the brief a
  reader planning the live checklist actually opens.**
  The 2026-09-01 wording *"the value still lands empty on the box, so every `/v1/payments/*` route still
  returns 503, correctly failing closed"* is **false as of the box observation above**, and it appears in
  **other documents that were deliberately left unedited.** ⛔ **A reader meeting any of these must treat
  the 503 claim as superseded by this brief.**
  - **Live, open task briefs** — [`0014`](../../done/0014-yandex-catalog-registration/brief.md) (its verification
    section states all three payments routes return 503 without the key),
    [`0213`](../0213-profile-backend-clean-slate-rebuild/brief.md),
    [`0018`](../0018-citizenship-paid/brief.md), and
    [`0064`](../0064-deploy-time-config-parity-guard/brief.md) with its plan/worklog/review.
    ⚠️ **Not corrected** — the ruling scoped the correction to **this** brief and told the producer to
    report the rest rather than sweep it.
  - **The Sprint 4 board** — `0065`'s own row **was** corrected; **`0195`'s `✅ Done` row was NOT**, because
    it is the historical record of a closed task.
  - **Closed (`done/`) task folders** — `0019`, `0195`, `0067`, `0215`, `0271`, `0274` and others carry the
    claim as it stood. ⛔ **Finished outputs; not rewritten.**
  - **`ai-agents/wiki-vault/**`** — several pages carry it (payments implementation, payments-secret
    forwarding, the profile store, Sprint 4). ⛔ **Out of bounds for every role but `fkit-wiki`** (ADR-005)
    — **flagged for a `/fkit-wiki-sync`, not touched.**

  ➕ **EXTENDED 2026-09-20 — the sweep now also covers the second half of the claim, *"no profile-box
  redeploy with the value populated is recorded"*, which Correction 3 shows is false.** ⛔ **Still
  FLAGGED, NOT REWRITTEN — the 2026-09-20 owner answer kept the same conservative scope: correct `0065`
  and its Sprint 4 row, report the rest.** Re-checked by grep on 2026-09-20; what carries it:
  - **[`0014`](../../done/0014-yandex-catalog-registration/brief.md) — the sharpest case, and the one a planner
    is most likely to open.** Its verification item 3 states *"Issued ≠ on the box"* and that **without
    the key all three `/v1/payments/*` routes return 503**; its item at `:245` says the 503s are *"not
    shown cleared"*; and a note at `:303` says *"no redeploy happened, so the `/v1/payments/*` 503s are
    NOT cleared by issuance alone."* ⚠️ **The redeploy DID happen (owner-attested) and the routes were
    observed not 503ing** — but the *conclusion* `0014` draws (its own gate is not satisfied) **still
    holds**, because the test-purchase login(s) are outstanding independently.
  - **[`0213`](../0213-profile-backend-clean-slate-rebuild/brief.md)** (`:270`) and
    **[`0064`](../0064-deploy-time-config-parity-guard/brief.md)** (`:244`, `:249`, plus its
    plan/worklog/review) — both already hedge the 503 claim as *never verified against a running box*,
    so they are the mildest cases.
  - **[`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md)** (`:157`) — describes
    the 503 as the behaviour when the variable is **unset**, which is a true statement about the code
    and is **not** stale. Listed only so a reader does not "fix" it.
  - **Closed (`done/`) folders and the `✅ Done` `0195` row** — unchanged reasoning: finished outputs and
    historical record, **not rewritten**.
  - **`ai-agents/wiki-vault/**`** — ⛔ **still `fkit-wiki`'s alone.** Its payments pages currently record
    the secret's provenance as **unverified**; that now needs a later `/fkit-wiki-sync` pass to pick up
    the owner attestation. **Flagged, never touched.**
- **No secrets in any artifact** — the per-game secret key and `PROFILE_INTERNAL_TOKEN` must never
  appear in briefs, worklogs, logs, or deploy output.
- `0025` (licensing asset audit) completed 2026-08-23 and found a confirmed violation: the go-live
  prerequisite is now **`0066` (remediation — proprietary-music purge, V1) deployed to prod**.
  Confirm `0066`'s prod redeploy checks passed (or owner-waived) before executing step 6. See
  [`0066-licensing-remediation-proprietary-purge`](../../done/0066-licensing-remediation-proprietary-purge/brief.md).
  - ✅ **CONFIRMED 2026-08-30 — this prerequisite is now DEMONSTRATED, not merely shipped.** The lead
    ran `0066`'s two deferred prod checks (its verification steps 7 and 8) in the browser against live
    production. All seven purged proprietary paths return the SPA fallback **byte-identical to a
    known-nonexistent control**, so none serves real content; and the new **original** favicon serves
    on both entry points — including `yandex-games_iframe.html`, which links the identical hashed file.
    ⚠️ Note the purged paths return **`200`, not `404`** — that is a PASS on this server, whose
    `app.get("*")` catch-all never 404s. Method and numbers in `0066`'s Verification section.
    **The licensing prerequisite for step 6 is satisfied.**
  - ⚠️ **Nothing else about this task changes.** `0065`'s status is unchanged, and **its other
    blockers — `0014`, `0062`, `0195` — are untouched and still open.** Only the `0066` licensing gate
    moved.
- Do not modify `0019`'s folder; its deferred checklist is superseded by this brief (noted here, not
  edited there — done-task artifacts are finished outputs).
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
