# Task — Paid Citizenship: Live Verification & Go-Live Tail

## ID
0065

## Sprint
Sprint 4

## Priority
High — the go-live gate for the monetization milestone. Everything buildable was split into `0018`
(mock scope); this task is what remains once Yandex delivers.

## Status
🚧 Blocked — three conditions: Yandex catalog approval + per-game secret-key issuance (`0014`),
`0062` (`PROFILE_INTERNAL_TOKEN` not forwarded to prod — no profile row is ever created there), **and
`0195`** (`YANDEX_PAYMENTS_SECRET` not forwarded to the profile box — every `/v1/payments/*` route
returns 503 there). All three must clear; none alone unblocks.

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
**catalog approval** and **test-purchase login(s)** (not done, per the owner). The `citizenship_ui` flag is
also not done — that is `0238`'s gate, not this one. ⚠️ **An issued key lands on the box ONLY via a
profile-box redeploy with `YANDEX_PAYMENTS_SECRET` populated** (`0195`'s forwarding path) — **this brief
does NOT assert that redeploy happened**, so every `/v1/payments/*` route is still to be presumed **503**
until it is done and observed. **Issuance alone clears nothing.** Blocker count still **three**; status
token unchanged.

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
  key ISSUED, purchases ENABLED. Still open: catalog approval; test-purchase login(s) (not done, per the
  owner).** ⚠️ **Issued ≠ provisioned:** it reaches the box only via a profile-box redeploy with the value
  populated (`0195`'s path) — not asserted to have happened; the 503s are not cleared by issuance alone.
- **`0062`** — `PROFILE_INTERNAL_TOKEN` forwarded to prod and verified end to end (its own
  verifications 2–3). Without it no profile row exists to attach a purchase to.
- 🚨 **`0195`** — [`0195-forward-yandex-payments-secret-in-profile-deploy`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md).
  ✅ **Shipped 2026-09-01** — closed `Done (agent-closed — not owner-verified)`, built with its own live
  verification deferred. ⚠️ **Owner ruling 2026-09-01 — do NOT read that ship as a blocker clearing.**
  Recorded 2026-08-28 so it was not rediscovered mid-checklist: the per-game secret key above reaches the
  box via `build-deploy-profile.sh` → `setup-profile.sh` → `profile.env`, and `build-deploy-profile.sh`
  omitted the variable from its staged-export block — **that omission is what `0195` fixed.** But
  ~~**`0014` has not issued the key**~~ 📌 **struck 2026-09-12 — the key WAS issued that day (owner ruling,
  given live in session and relayed through the lead session); what is still unrecorded is a profile-box
  redeploy with the value populated**, so the value is still to be presumed empty going in, `setup-profile.sh`'s
  `${YANDEX_PAYMENTS_SECRET:-}` default still writes it empty on the box, and `Routes.ts`'s
  `paymentsEnabled` middleware **still returns `503 {"error":"payments_unavailable"}` on every
  `/v1/payments/*` request** — correctly, failing closed. **Steps 1–4 below all drive those routes and
  would every one of them fail with 503 today**, the only clue being a single `warn` line at container
  startup. Forwarding (`0195`) and issuance (`0014`) are each necessary and neither alone is sufficient.
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

- **Depends on:** `0014` (Yandex catalog approval + per-game secret-key issuance), `0062`
  (`PROFILE_INTERNAL_TOKEN` forwarded to prod and verified end to end — without it no profile row
  exists to attach a purchase to), `0195` (`YANDEX_PAYMENTS_SECRET` forwarded to the profile box —
  without it every `/v1/payments/*` route returns 503 there, so steps 1–4 all fail), and `0018` (mock
  scope done — the UI and flow this checklist drives must exist). ⚠️ **Owner ruling 2026-09-01 —
  forwarding and issuance are each necessary and neither alone is sufficient:** `0195` **shipped
  2026-09-01** and fixed the forwarding gap (`build-deploy-profile.sh` had omitted the variable from
  its staged-export block), but ~~`0014` has **not** issued the per-game key~~ 📌 **2026-09-12 — key ISSUED
  and purchases ENABLED (owner ruling, given live in session and relayed through the lead session); `0014` still
  open on catalog approval + test-purchase login(s)** — and no profile-box redeploy with the value populated
  is recorded, so the value is still to be presumed empty on the box and every `/v1/payments/*` route still
  to be presumed 503 — correctly, failing closed.
  Also required before running: `migrations/002_yandex_payments.sql` applied in prod, and a
  test-purchase Yandex login registered in the dashboard. The full prose for every gate is in the
  `## Dependencies` section above, which stays the human-facing explanation — this bullet is the
  canonical machine-readable form, and it is the only shape `dashboard.sh` can read.
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
