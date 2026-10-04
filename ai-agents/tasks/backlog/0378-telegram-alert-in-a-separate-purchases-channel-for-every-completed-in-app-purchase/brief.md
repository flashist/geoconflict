# Telegram alert in a separate Purchases channel for every completed in-app purchase

## ID
0378

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER RULING relayed by fkit-lead, ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer` with
no owner channel (ADR-021/037), on an owner request and ruling given live in the `fkit lead` session on 2026-10-04.

The owner's request, verbatim:

> *"Do we have a task about sending alerts when people buy something? I can create a separate channel in Telegram
> for that. Not channel topic. Related to IAP. And anytime an IAP is done, I can get a notification about it."*

The lead found that [`0362`](../0362-telegram-notification-when-a-player-becomes-a-citizen-in-a-new-citizenship-topic/brief.md)
already covered citizenship **bought + earned**, sent to a new Citizenship forum **topic**, and asked: *"How should
purchase alerts be set up, given 0362 already covers citizenship (bought + earned) in a new topic?"* The owner picked
**"New task: all purchases → own channel"**:

> *"File a new task: every purchase posts to a separate Telegram channel you create. 0362 keeps only the 'earned by
> XP' message, in the Citizenship topic. Clean split: money in one place, game milestones in another."*

So: **every completed in-app purchase (IAP), of any product, posts one message to a separate Telegram CHANNEL** — a
broadcast channel the owner creates, **not** a topic in the operator forum group. `0362` was narrowed the same day to
the earned-by-XP message only; its paid half now lives here.

**Where a purchase completes today — the one hook point.** `src/profile-server/PaymentsRepository.ts`:
- `grantPaidPurchase` (~:126–:186) runs one transaction: insert the receipt into `processed_purchases` (the purchase
  token is the primary key — the idempotency and concurrency guard), set the paid flags, mark the intent used.
- A token already in the ledger returns **`already_processed`** and never reaches the post-grant step. Only
  **`granted`**, after COMMIT, calls `afterPaidPurchaseGranted` (~:188–:216), which today sends the
  `citizenship_paid` inbox welcome. Hook beside it.
- **Both payment routes go through it**: `POST /v1/payments/yandex/complete` and `POST /v1/payments/yandex/reconcile`
  (`src/profile-server/Routes.ts` ~:953–:1031 and ~:1036–:1101). `/complete` also returns early on an already-known
  token (~:980–:987) without calling the grant. So hooking the `granted` branch covers both routes, and a
  `/reconcile` re-delivery of the same token can never send a second message.
- ⚠️ **"Any product" is a forward-looking requirement — today there is exactly one product.**
  `PAYMENT_PRODUCT_IDS = ["citizenship"]` (`src/core/profile/PaymentsContract.ts` :20), and `grantPaidPurchase`
  **throws before any transaction** for any other product id (~:127–:134), because `GRANT_FLAGS_SQL` is
  citizenship-specific. So this task builds the alert **product-agnostic** — keyed on the generic `granted` outcome,
  carrying the product id as a field — so that when a second product gets its own grant branch, the alert covers it
  with no rewrite. It does **not** add grant logic for other products.
- ⚠️ **What the server knows about a purchase is thin.** The verified Yandex purchase carries only `purchaseToken`,
  `productId`, `developerPayload` (`src/profile-server/YandexSignature.ts` :26–:30). **No price, no currency.** The
  price exists only on the client, from the Yandex catalog (`src/client/CitizenshipCard.ts`,
  `src/client/flashist/FlashistFacade.ts`), and must **not** be trusted from the client. See open question 1.
- ⚠️ A different token on an **already-used** intent is still granted by `/reconcile` (accepted residual, recorded at
  Routes.ts ~:1001–:1006). Each such token is a real, separate paid purchase, so it **should** send its own message.
  That is not a replay.

**The Telegram side today.**
- One bot, the never-throw send `sendTelegramMessage` (`src/core/notifications/TelegramNotifier.ts`). It returns an
  outcome value (`sent` / `sent_after_retry` / `not_configured` / `http_error` / `network_error`), logs nothing,
  never puts the bot token in an error, has a 10 s timeout and one reused proxy dispatcher. `sent_after_retry` counts
  as sent (task `0277`).
- The target is chosen by `TelegramConfig`: `token`, `chatId`, `proxyUrl`, optional `threadId`. A blank `threadId`
  means the `message_thread_id` key is **omitted**, which is exactly what a channel needs.
- On the profile box, `src/profile-server/Server.ts` (~:137–:160) reads `FEEDBACK_TELEGRAM_TOKEN`,
  `FEEDBACK_TELEGRAM_CHAT_ID` (the operator **forum group**), `TELEGRAM_PROXY_URL`, and the two topic ids
  `TELEGRAM_TOPIC_ALERTS` / `TELEGRAM_TOPIC_NAME_CHANGES`, all with literal `process.env` reads so the config-parity
  check sees them. `PaymentsRepository` is built at ~:181 with `(pool, inbox)` and has no Telegram config today.

**A channel needs its own chat id — and the bot must be an admin of it.**
- A channel is a different chat from the forum group, so it has its **own chat id** (a channel's numeric id
  normally starts with `-100`). It cannot reuse `FEEDBACK_TELEGRAM_CHAT_ID`, and it needs **no topic id** — channels
  have no topics. **New env var, working name `TELEGRAM_PURCHASES_CHAT_ID`** (the plan may pick a better name).
- **The same bot and the same proxy are reused** — no new token. A bot can post to many chats.
- **The bot must be added to the channel as an administrator with permission to post messages.** Unlike a group, a
  bot that is merely a member cannot post in a channel; Telegram refuses the send (an `http_error`). The coder should
  confirm the exact refusal against the Bot API docs at plan time and name it in the runbook.
- ⚠️ **A wrong or unauthorised chat id means every purchase alert is lost** — Telegram rejects it, the grant is
  unaffected, and only a warning log line says so. Same failure class `example.env.profile` already warns about for
  topic ids.

**Deploy forwarding — a new env var must be carried end to end, or it is silently dead.** It must appear everywhere
`FEEDBACK_TELEGRAM_CHAT_ID` does (it is a chat id of the same kind):
- `build-deploy-profile.sh` (~:700–:707, the `printf "export …"` lines);
- `setup-profile.sh` — header comment (~:35), persist-or-reuse (~:756 / ~:779–:780), the `profile.env` block
  (~:807–:813), the config report (~:850–:890), and the closing operator hints (~:1832–:1833);
- `example.env.profile` (~:81–:103);
- `tests/scripts/profile-deploy-hardening.test.sh` — every list and assertion that names the Telegram chat id or the
  topic vars (~:1080, ~:1086 `OPTIONAL_SECRET_NAMES`, ~:1267, ~:1275, ~:1392, ~:1851, ~:1875, ~:1945). This harness
  runs inside `npm test` (CLAUDE.md § *Shell harnesses*);
- `npm run check:config-parity` (`scripts/check-config-parity.mjs`, task `0298`) — the deploy scripts run it with
  `--enforce` and stop on a finding, so the value must be read with a **literal** `process.env.…` and forwarded;
- `ai-agents/knowledge-base/alert-delivery-runbook.md` § *Configuration* table (~:395).

## What to build

1. **New env var** `TELEGRAM_PURCHASES_CHAT_ID` (working name), read in `Server.ts` with a literal `process.env`
   read, forwarded and persisted by the profile deploy exactly like `FEEDBACK_TELEGRAM_CHAT_ID`, with the harness,
   parity check, `example.env.profile`, setup config report and runbook updated. **Blank ⇒ no purchase alerts at
   all, with one startup warning** saying purchase alerts are off until it is set. It must **never** fall back to the
   operator forum group — the owner ruled a separate channel. The config report lists it as `OPTIONAL … purchase
   alerts off` when blank. *(Producer default; the coder confirms at plan — see open question 3.)*
2. **Pass the Telegram config into `PaymentsRepository`** (token, the new chat id, proxy, **no** thread id), keeping
   the existing "optional dependency ⇒ sends nothing" shape used for `inbox`, so tests and tools that build it
   without Telegram are unaffected.
3. **One message per `granted` purchase**, sent after COMMIT from the same place `afterPaidPurchaseGranted` fires.
   **Product-agnostic:** the message builder takes the product id as data and works for any id, so a future
   product's grant branch inherits the alert. Default content — see open question 1 for the owner's confirmation:
   - a fixed headline ("New purchase"),
   - the product id,
   - the internal player uuid (what every runbook query keys on),
   - whether the buyer was **already an earned citizen** (citizenship product only — "paid on top of earned"). Today
     `GRANT_FLAGS_SQL` does not return the player's prior state, so this needs the prior state read inside the same
     transaction; the plan says how and what it costs,
   - which route landed it (`complete` / `reconcile`), **only if** cheap — `grantPaidPurchase` does not know its
     caller today; the plan says whether to add it.
4. **Never send:** on `already_processed`, on a rolled-back or failed grant, or when the Telegram config is blank.
5. **Never include:** a Yandex id (ADR-113 / task `0270` — operator messages carry the internal uuid only), the
   purchase token (not even a prefix), the intent id, the raw payment payload, or any signature. Every field
   HTML-escaped.
6. **Telegram must never affect the grant.** Same contract as the inbox hook it sits beside (0017 review residual R1,
   owner-ruled 2026-08-24): fire-and-forget after commit, never throws, never delays the HTTP answer, never turns a
   durable grant into an error. A failed send is one warning log line naming the outcome only (result, HTTP status,
   bounded cause code — no token, no id, no chat id). The inbox welcome and the Telegram alert are independent: one
   failing never stops the other.
7. **Owner step — recorded here, not the coder's to do:** before the deploy that ships this, the owner (a) creates a
   private Telegram **channel** for purchases, (b) adds the existing operator bot to it **as an administrator with
   permission to post messages**, (c) reads the channel's numeric chat id, and (d) puts it in the local, gitignored
   profile deploy config (`.env.profile`, per `example.env.profile`). The value is persisted on the box on first
   deploy. **No chat id goes in any tracked file.** The coder writes these steps into the runbook, including one
   reliable way to read a channel's chat id.
8. **Out of scope:** grant logic for any new product; refund or revoke messages (none exist today); any
   player-facing change; the inbox templates; payment verification; the earned-citizenship message (that is `0362`);
   a durable outbox — if the process dies between COMMIT and the send, that one alert is lost (accepted, same as
   every other operator notification).

## Verification steps

1. **Paid path tests** (`tests/profile-server/PaymentsRepository.test.ts` with a stubbed send,
   `tests/profile-server/PaymentsRoutes.test.ts`, and `tests/integration/` via `npm run test:integration`):
   - a `granted` purchase sends **exactly one** message, to the purchases chat id, with **no** thread id;
   - the same token again — via `/complete` **or** `/reconcile` — sends **nothing** (`already_processed`, and
     `/complete`'s early return);
   - two concurrent submits of the same token send **one** message (the PK serialises them — prove it);
   - a different token on an already-used intent, landed by `/reconcile`, sends its **own** message;
   - a grant that rolls back (e.g. no player row) sends **nothing**;
   - a grant to an already-earned citizen says so; a grant to a non-citizen does not.
2. **Message content:** the text contains **none** of the fixture purchase token (whole or prefix), intent id, raw
   payload, signature or Yandex id — assert against fixture values. Fields are HTML-escaped (a product id or uuid
   containing `<` / `&` is escaped in a builder unit test).
3. **Product-agnostic builder:** a unit test builds the message for a product id other than `citizenship` and gets a
   correct message. (The grant itself still refuses non-citizenship products — unchanged, and asserted unchanged.)
4. **Grant unaffected by Telegram:** a send stub that fails, throws synchronously, or never resolves leaves every
   outcome, every database row and the inbox welcome exactly as without it, and the route answers promptly.
5. **Blank config:** chat id blank ⇒ nothing sent, one startup warning, grants unchanged; nothing is ever sent to
   the operator forum group's chat id.
6. **Deploy plumbing:** `npm test` passes, including `tests/scripts/ShellHarnesses.test.ts` (the hardening harness
   now asserts the new var wherever it asserts `FEEDBACK_TELEGRAM_CHAT_ID`); `npm run check:config-parity` reports
   nothing for the new var.
7. `npm run lint` passes.
8. **Live check (after the owner's channel step and a weekend-slot profile deploy):** the next real purchase appears
   **once** in the Purchases channel and nowhere else. Per the build-vs-verify rule, this is a **separate verify
   task** filed at the top of the next sprint when the build closes; it must not block that sprint's deploy. ⚠️ Real
   purchases may not arrive for a while, so the verify task says how long to wait and what counts as proof if none
   arrives (see Notes on `0297`).

## Open questions — for the owner, at the plan step (producer's default marked)

1. **What goes in each message?** — **Default: product id, internal player uuid, "already an earned citizen" yes/no,
   and the route (`complete` / `reconcile`) if cheap. No price.** The server is never told the price — Yandex's
   signed purchase does not carry it, and the client's number must not be trusted. Showing a price would need a
   price list kept on the server, which goes stale silently whenever the price is changed in the Yandex console.
   The Yandex console already shows real revenue. The coder asks the owner: is the default enough, or is a
   server-side price list worth its upkeep?
2. **Test purchases** — the server cannot tell a Yandex test or sandbox purchase from a real one, so `0297`'s test
   buy will post a normal message. — **Default: accept that, no "test" label.** Ask only if the owner wants one.
3. **Chat id not set** — **Default: send nothing, warn once at startup** (never fall back to the operator group,
   never block a deploy). Alternative: make the deploy refuse to run without it — rejected by default because an
   optional alert should not block a profile deploy.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Sibling, not a dependency:**
  [`0362`](../0362-telegram-notification-when-a-player-becomes-a-citizen-in-a-new-citizenship-topic/brief.md)
  (earned-by-XP citizenship message, Citizenship topic). This task took over 0362's paid half on 2026-10-04 (owner
  ruling above). The code shows **no shared change that forces an order**: 0362 now hooks only
  `PlayerProfileRepository` (match credit + tenure grant); this task hooks only `PaymentsRepository`. They **do**
  both edit the same deploy plumbing — `Server.ts`, `build-deploy-profile.sh`, `setup-profile.sh`,
  `example.env.profile`, the hardening harness, the runbook table — often on adjacent lines. Whichever lands second
  rebases onto the first; that is a merge-conflict risk, not a dependency. Also sibling of
  [`0361`](../0361-telegram-confirmation-when-a-name-change-is-decided/brief.md): if either extracts a small shared
  "send operator message, never throw, log the outcome" helper, reuse it.
- **Relation to `0297`** (paid-citizenship owner-run test buy, Sprint 7): its real purchase would be the **first live
  proof** of this alert. Not a dependency either way — if this ships after `0297`'s buy, the verify task needs another
  real or test purchase.
- ⚠️ **Deploy timing (Sprint 7, soft):** [`plan-sprint-7.md`](../../../sprints/plan-sprint-7.md) records that there is
  to be no second profile deploy before `0297` §1 reads `0309`'s log line, and that `build-deploy-profile.sh` refuses
  to run while any `src/` change is uncommitted. So this task's code must not sit uncommitted across that weekend
  deploy, and it ships in a later profile deploy. It edits `build-deploy-profile.sh` / `setup-profile.sh`, which
  Backlog task `0346` (migrations before new code) will also change — plan against whatever has landed by then.
- **Kept as one brief, not split** into "env var + deploy forwarding" and "the alert": the plumbing alone delivers
  nothing anyone can see or verify, and the alert cannot reach the channel without it. They ship and verify together.
- Related: `0019` / `0065` (payments), `0017` / `0018` (citizenship), `0067` (operator Telegram), `0277` (forum topics
  + send outcome), `0298` (config parity), ADR-113 (internal player id).
- No player id, chat id, token, host or IP is recorded here on purpose.
- Size: small-to-medium — one hook site, one message builder, one prior-state read, one env var carried through four
  deploy files and the harness, tests, a runbook section.
