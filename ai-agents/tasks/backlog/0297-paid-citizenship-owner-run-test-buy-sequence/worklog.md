# Worklog — 0297 Paid Citizenship: owner-run test-buy sequence

## 2026-09-26 — first real purchases; §1, §2, §3 evidence (partial run)

⛔ **Provenance.** Recorded by a spawned `fkit-producer` with **no owner channel** (ADR-021), from
evidence relayed by `fkit-lead`: the lead's **read-only** DB and nginx checks on the profile box, and the
**owner's screenshots and words** in the `fkit lead` session. The producer observed none of it directly.
Game build **0.0.154** (image tag `20260926-143311`, live since ~14:38 MSK — see `0065`). Accounts are
named by the first 8 characters of their profile id only. No secret, token, signed payload or IP is
recorded here.

⛔ **`## Status` of this task is NOT changed and the task is NOT closed.** Open items: §1 second box
(which construction), §3 funnel analytics, §4 (not run), §5.

### §1 — HMAC construction and the secret's value

- [x] **`/v1/payments/yandex/complete` returned 200 on real signed payloads** (nginx access log, lead's
      read-only check):
  - **13:52:34 UTC** — an earlier **real player** purchase (account `2de1ba8c`) → **200**.
  - **14:46:24 UTC** — the owner's **test** purchase (account `e2ade02f`) → **200**.
- ✅ **The `0195` condition is settled:** a 200 on real signed payloads means the
  `YANDEX_PAYMENTS_SECRET` value on the profile box is the right one. (Verification-steps item 3 —
  *"proven by §1's 200"*.)
- [ ] **Which of the two constructions matched — NOT determined.** It is not observable from outside:
      no log line records it. ⚠️ It also **cannot** be worked out offline from
      `processed_purchases.raw_payload` — that column holds only the decoded JSON; the signature is never
      stored (checked in `YandexSignature.ts` / `PaymentsRepository.ts`, 2026-09-26).
- [x] **Follow-up filed** (close condition 2), 2026-09-26, on the Backlog board, as two briefs:
  - [`0309`](../0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md) — log which
    construction matched, deploy, read it after the next real purchase; writes its result back here.
  - [`0310`](../0310-drop-the-unused-yandex-hmac-construction/brief.md) — drop the unused one
    (depends on `0309`).

### §2 — Live catalog fetch

- [x] The price comes from Yandex's catalog, not hardcoded: the card reads `priceValue` /
      `priceCurrencyCode` from the catalog (`src/client/flashist/FlashistFacade.ts` ~`:368-376`).
- ⚠️ **Shown vs expected — recorded exactly as seen.** The brief expected **"249 Yan"**.
  - Test account (`e2ade02f`), owner screenshot **17:42 MSK**: **"Купить гражданство — 249 RUB"**.
  - Owner's main account (earlier, go-live check in `0065`): **"Купить гражданство — 249 YAN"**.
  - ⇒ **The amount matches (249). The currency is chosen per account by Yandex**, not by us. Not a
    defect on our side as far as the record shows; recorded, not ruled on.
- [ ] `getPaymentsCatalogStatus()` → `'ready'` / `hasCatalogProduct('citizenship')` → `true` were not
      read directly; the buy button being shown implies both (the button is hidden otherwise). Recorded
      as inferred, not observed.

### §3 — Real test purchase through the `0018` UI

- [x] Flow completed end to end with the real button (test account `e2ade02f`).
- [x] **On the box** (lead's read-only DB check): `is_paid_citizen = t`, `citizenship_purchased_at =
      14:46:24.448 UTC`, `is_citizen = t`, `citizenship_earned_at = NULL`. A `processed_purchases` row
      exists **with its intent**; that purchase intent's `used_at` is set.
- [x] **Card moved to State 3** (ГРАЖДАНИН) **immediately, without a reload** (owner).
- [x] **Purchase consumed:** after a reload (17:50 MSK) the account is still a citizen and the Network
      log (filter `payments`) shows **no `/reconcile` request** ⇒ nothing pending. Observed indirectly
      (no second `getPurchases()` call was inspected), which is how the client behaves when nothing is
      pending.
- [ ] **Funnel analytics NOT yet checked** — `UI:Tap:PurchaseCitizenship`, `Purchase:Started:Citizenship`,
      `Purchase:Completed:Citizenship`. GameAnalytics data is due the next day.
- **Inbox (not a §3 box — noted for `0303`):** the server sent a `citizenship_paid` message to **both**
  buyers (`sent_at` = purchase time). The bell's unread dot did **not** show right after purchase (17:46
  MSK screenshot) and **did** show after the reload (17:50). This confirms `0303`'s predicted gap; a dated
  note was added to `0303`'s brief.

### §4 — Live reconciliation

- [ ] **Not run — stays open.** Owner decision given later on 2026-09-26: **watch real players** first — see the next entry.

### §5 — Does the product ever disappear from `getCatalog()`?

- [ ] Not observed yet. It was present on both accounts on 2026-09-26.

### Funnel snapshot, ~14:47 UTC (lead's read-only DB check)

| Measure | Value |
|---|---|
| Purchase intents | 105, from 97 distinct players |
| Intents used | 2 (1 real buyer + the owner's test) |
| Profiles | 791 |
| Tenure grants | 508 |
| Citizens | 3 — 2 paid, 1 earned (the owner's main account, via the `0296` A6 test) |

### Close-condition tracker (from *Verification steps*)

1. Every box checked or owner-waived — **not yet** (§1 construction, §3 analytics, §4, §5).
2. §1 follow-up filed — ✅ **done** (`0309`, `0310`).
3. `0195` value-correctness recorded — ✅ **done** (proven by the 200s above).

## 2026-09-26 — §4 owner ruling: prove reconciliation by watching real players

⛔ **Authority.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
2026-09-26**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021). ⛔ Not
producer precedent. `## Status` of this task is **not** changed.

- **Question (as put):** *"Safety-net check (0297 §4) — the story: player pays → game closes/restarts
  before telling our server → on restart the game finds the unused paid receipt at Yandex, sends it to
  our server ('reconcile'), player becomes a citizen. How should we prove steps 8–13 work live?"*
- **Answer:** **"Watch real players (Recommended)"** — option text: *"Free: I check the server logs over
  the next days for successful 'reconcile' calls from real players (phone payments make it fairly
  likely). Keep §4 open; test by hand later if none appear."*

**What this means for §4:**
- **§4 stays open.** It is not waived.
- **Evidence that closes it:** a real player's `POST /v1/payments/yandex/reconcile` with status **200** in
  the profile box's **host** nginx access log (`/var/log/nginx/access.log*`), **cross-checked** against a
  `processed_purchases` row whose `processed_at` matches, and a player who became `is_paid_citizen` at
  that time. Record date, time (UTC), 8-character account prefix and how observed — nothing else.
- **Baseline, 2026-09-26 ~14:50 UTC:** **zero** `/reconcile` calls seen. Both purchases so far went
  through `/complete`.
- **Fallback:** if none appear within a reasonable window — **suggested ~2 weeks, i.e. by about
  2026-10-10** (a suggestion, not an owner-ruled date) — go back to the owner-run hand test (block
  `/complete` in devtools, restart, confirm the grant and the consume).
- ⚠️ **Nobody is scheduled to run the log check.** It happens only if someone runs it (read-only, on the
  profile box). This is a manual watch, not a monitor.
- ⚠️ §4's **second** box (a second restart makes no network call once consumed) is not covered by a log
  line; it follows from the first, or from the hand test if that is used.
