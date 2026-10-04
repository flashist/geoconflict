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
  - [`0309`](../../done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md) — log which
    construction matched, deploy, read it after the next real purchase; writes its result back here.
  - [`0310`](../../cancelled/0310-drop-the-unused-yandex-hmac-construction/brief.md) — drop the unused one
    (depends on `0309`). *(📌 2026-10-04 — `0310` **cancelled** (agent-closed — not owner-verified), superseded by [`0379`](../0379-re-check-real-purchase-hmac-samples-then-ask-the-owner-keep-or-drop-the-unused-construction/brief.md) — OWNER RULING relayed by fkit-lead, ⛔ not producer precedent: keep both constructions for now, re-read the log for more samples, then re-ask keep-or-drop.)*

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

## 2026-09-29 — §3 funnel analytics DONE; GA vs server cross-check; §4 reconcile watch (still zero)

⛔ **Provenance.** Recorded by a spawned `fkit-producer` with **no owner channel** (ADR-021), from
evidence relayed by `fkit-lead`: the **owner's own live checks** in the `fkit lead` session on
2026-09-29 (GameAnalytics screenshots at 11:11 and 11:14 MSK; terminal pastes of read-only DB and nginx
log queries on the profile box). The producer observed none of it directly. No secret, token, signed
payload, host, IP or player id is recorded here.

⛔ **The task is NOT closed and `## Status` is unchanged (`🔲 Backlog`).** Still open: §1 second box
(which construction — `0309`'s job), §2 first box (inferred only), §4, §5.

### §3 — Funnel analytics: ✅ DONE

How observed: GameAnalytics → Explore → Design events → aggregation **Count** → date range **22–28 Sep
2026** → split by event id (parts 02/03). Owner screenshots, 11:11 and 11:14 MSK.

| Event | Count (22–28 Sep) |
|---|---|
| `UI:Tap:PurchaseCitizenship` | **631** |
| `Purchase:Started:Citizenship` | **631** |
| `Purchase:Abandoned:Citizenship` | **603** |
| `Purchase:Completed:Citizenship` | **12** |

- [x] **All three required events arrive** (`UI:Tap:PurchaseCitizenship`, `Purchase:Started:Citizenship`,
      `Purchase:Completed:Citizenship`). `Purchase:Abandoned:Citizenship` arrives too.
- **Tap = Started exactly** (631 = 631).
- **631 − 603 − 12 = 16 started flows with no ending event** (neither Abandoned nor Completed). Probably a
  closed tab or an untracked error path — **not diagnosed**.
- **Completion rate ≈ 1.9 %** (12 / 631).
- ⚠️ **GA showed a "You're viewing data in Demo mode" banner** on the page. Recorded as seen. The data
  reads as real anyway: it lines up with the launch (N/A before 26 Sep). Not proven either way.

### Server cross-check (owner-run, read-only, 2026-09-29)

- `processed_purchases` row count: **11** (all time, as of 2026-09-29).
- Host nginx access log: **11** `POST /v1/payments/yandex/complete`, **all 200**, one per purchase — no
  repeated confirmations.
- Timestamps (UTC): 26 Sep ×4 · 27 Sep ×2 · 28 Sep ×4 · 29 Sep ×1 ⇒ **10 fall inside GA's 22–28 Sep range**.

### 🔎 Open finding — GA over-counts `Purchase:Completed:Citizenship` by 2 (not a task; owner ruled "Leave it", 2026-09-29)

- GA: **12** Completed for 22–28 Sep. Server: **10** confirmed grants in the same range.
- `Purchase:Completed:Citizenship` fires **only after a server-confirmed grant**
  (`src/client/CitizenshipPurchase.ts:77-80`, re-read 2026-09-29), and **every** server confirmation is
  accounted for above. ⇒ **The 2 extras are NOT lost purchases.**
- **Cause not determined.** Candidates, all unproven: test/dev builds sharing the GA game key; a client
  double-fire.
- ⛔ **No task filed** — left for the owner, per the lead's instruction.
- ✅ **OWNER RULING 2026-09-29 — "Leave it".** Given live via `AskUserQuestion` in the `fkit lead` session,
  relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
  precedent. Asked *"file a small task to find out why?"*, the owner chose **"Leave it"** — option text:
  *"Just keep the note in 0297. 2 events is small, and the server count is the one that matters for money."*
  ⇒ **No task is filed; the cause stays undetermined by choice.** This note is the record.

### §4 — Reconcile watch: still zero (stays open)

- As of **2026-09-29 ~08:15 UTC**: **zero** `POST /v1/payments/yandex/reconcile` in the host nginx access
  log, **all rotated files included** (searched with `zgrep`).
- **The zero is real, not a wrong log location:** the same search for `/complete` returned the 11 lines
  above.
- §4 **stays open**. Suggested fallback unchanged: owner-run hand test if none appear by about
  **2026-10-10** (a suggestion, not an owner-ruled date).

### §1 — pointer only (not evidence for this task)

- The construction question is still **`0309`'s job**. Pointer only: `0325`'s S0 run (2026-09-29) found
  Yandex's signed **player** data verifies with the **decoded-JSON** construction. That is a hint for
  purchase signatures, **not proof** — different payload, different SDK call.

### Close-condition tracker (from *Verification steps*) — as of 2026-09-29

1. Every box checked or owner-waived — **not yet.** Open: §1 which construction (`0309`), **§4**, **§5**.
   ✅ §3 funnel analytics now done, so **§3 is complete**. ⚠️ Also still unchecked: §2's first box
   (`'ready'` / `hasCatalogProduct` — inferred from the button showing, never read directly; left unchecked
   on 2026-09-26 but missing from that day's tracker). Close it by a direct read or an owner waiver.
2. §1 follow-up filed — ✅ **done** (`0309`, `0310`).
3. `0195` value-correctness recorded — ✅ **done** (proven by the 200s, 2026-09-26).

## 2026-10-04 — §1 read-back: `construction=decoded_json`, via `/complete` (n=1, a real player's purchase)

⛔ **Provenance.** Recorded by a spawned `fkit-producer` with **no owner channel** (ADR-021), from facts
relayed by `fkit-lead`. **Observed by `fkit-lead`** on 2026-10-04, by a **read-only** SSH check of the
production profile box (the brief's §1 *Read back* step allows it: *"`fkit-lead` may run it if it has SSH"*).
The producer observed none of it directly. No host, IP, secret, signed payload or player id is recorded here.

### Precondition — the log line was still there to read

- Profile container `profile-profile-api-1`: up **~21 hours, healthy** — i.e. **not restarted** since the
  2026-10-03 profile deploy (`0.0.156-profile.1`, the first profile deploy carrying `0309`'s log line; see
  [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened
  2026-10-03*). So the container log covers every verified purchase since that deploy.

### The read-back — in the brief's prescribed shape

`docker logs` grep for `signature verified`: **exactly 1 match.**

| Date (UTC) | Label | Route | How observed |
|---|---|---|---|
| 2026-10-03T13:48:24Z | `construction=decoded_json` | `(complete)` | observed via container log |

- **Whose purchase:** a **real player's**, not an owner test buy. **The owner made no test purchase.**
- ⇒ §1 box 2 (*"Determine which of the two constructions matched"*): **`decoded_json`**, determined from
  `0309`'s label in the profile container log.

### ⚠️ Caveats — kept with the answer

- **n = 1.** One verified purchase since the deploy. It is consistent with `0325` S0's pointer (signed
  *player* data verifies via decoded JSON, 2026-09-29), but it is still one sample.
- **`/complete` route only.** **No `/reconcile` verification has been observed** with the label. Whether
  `/reconcile` payloads verify the same way is not shown by this read-back (likely, not proven).
- These caveats matter for [`0310`](../../cancelled/0310-drop-the-unused-yandex-hmac-construction/brief.md), which deletes
  the other construction (`base64_payload`): if either caveat is wrong, real purchases would be rejected. *(📌 2026-10-04 — `0310` **cancelled** (agent-closed — not owner-verified), superseded by [`0379`](../0379-re-check-real-purchase-hmac-samples-then-ask-the-owner-keep-or-drop-the-unused-construction/brief.md) — OWNER RULING relayed by fkit-lead, ⛔ not producer precedent: keep both constructions for now, re-read the log for more samples, then re-ask keep-or-drop.)*

### Close-condition tracker (from *Verification steps*) — as of 2026-10-04

1. Every box checked or owner-waived — **not yet.** ✅ §1 now complete. Open: **§2 first box** (inferred,
   never read directly), **§4** (reconcile watch — not re-checked in this read-back), **§5**. None of them
   waits on a deploy.
2. §1 follow-up filed — ✅ done (`0309`, `0310`). *(📌 2026-10-04: `0310` cancelled, superseded by `0379` — still done: the follow-up exists, now as `0379`.)*
3. `0195` value-correctness recorded — ✅ done (2026-09-26).

## 2026-10-04 (later) — `0310` cancelled, superseded by `0379`

**OWNER RULING relayed by fkit-lead, ⛔ not producer precedent.** Given live 2026-10-04 via `AskUserQuestion` in the `fkit lead` session; recorded by a spawned
`fkit-producer` with no owner channel (ADR-021/037). Asked whether to start `0310` on this one sample or wait,
the owner chose **wait for more samples** and asked for a backlog task to re-check.

- **Both HMAC constructions stay in the code for now.** Nothing was built or deployed.
- [`0310`](../../cancelled/0310-drop-the-unused-yandex-hmac-construction/brief.md) — **cancelled** (agent-closed —
  not owner-verified): the keep-or-drop decision was the only thing keeping it open.
- [`0379`](../0379-re-check-real-purchase-hmac-samples-then-ask-the-owner-keep-or-drop-the-unused-construction/brief.md) (Backlog board) takes over: re-read the profile container log for more `signature
  verified` lines (ideally one `(reconcile)`), then put keep-or-drop to the owner; a "drop" ruling carries `0310`'s
  code change. Its reads overlap this task's §4 reconcile watch — the same read can serve both.
- ⚠️ The container log is still lost on every profile redeploy — read it **before** any profile deploy.
