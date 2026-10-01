# Telegram notification when a player becomes a citizen (bought or earned by XP), in a new Citizenship topic

## ID
0362

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given live
in the `fkit lead` session on 2026-10-01, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's words,
verbatim:

> *"I'll just realize that we need a couple of more telegram alerts one of which is the notification that happens
> when a username is approved or rejected. It will be like sign that the approve or reject command was executed
> correctly another one I would like to have is the notification about somebody buying citizenship or somebody
> earning citizenship by XP I don't think the second one should be added to the existing topics, maybe we need to
> new topic related to citizenship. And those notifications should go to that topic. Brief both tasks. Add them to
> backlog."*

This brief is the **second** of the two. The first is [`0361`](../0361-telegram-confirmation-when-a-name-change-is-decided/brief.md).

**Owner's placement ruling, in the request itself:** these messages go to a **new Citizenship forum topic**, **not**
to any existing topic (Alerts, Name Changes, Feedback).

**Where a player becomes a citizen today — the hook points.** Both already send a "welcome" inbox message at exactly
the right moment, after commit, never throwing. This task adds a Telegram message beside each.

- **Earned (XP)** — `src/profile-server/PlayerProfileRepository.ts`:
  - match credit: `creditMatchXp` (`CREDIT_SQL` ~:80, the "newly granted" decision ~:224–:236) sets
    `citizenshipNewlyGranted`; after COMMIT, `afterCitizenshipEarned` (~:395) sends `citizenship_earned` (~:256–:263);
  - tenure grant: `recordTenureCheck` (~:330–:380) makes the same decision and calls the same hook (~:375–:380).
    A tenure grant **alone** can never make a citizen (its cap is half the threshold — `src/core/profile/Citizenship.ts`
    ~:34–:44), but tenure XP **on top of** match XP can cross the threshold, so this path **can** fire and must be
    covered.
  - `citizenshipNewlyGranted` is `!wasCitizen`: a duplicate credit (`status: "duplicate"`) never sets it, and a
    **paid** citizen who later crosses the XP threshold gets their earned date stamped **without** it — so neither
    sends a welcome today.
- **Paid** — `src/profile-server/PaymentsRepository.ts` `grantPaidPurchase` (~:126–:186): the purchase token is the
  ledger key in `processed_purchases`; a token seen before returns `already_processed` and **never** reaches the
  post-grant hook. After COMMIT on `granted`, `afterPaidPurchaseGranted` (~:197) sends `citizenship_paid`. Both payment
  routes go through it: `/v1/payments/yandex/complete` and `/v1/payments/yandex/reconcile` (`Routes.ts` ~:999, ~:1072),
  so hooking here covers both, and a `/reconcile` re-grant cannot duplicate the message.
  - ⚠️ `GRANT_FLAGS_SQL` (~:46) grants on a player who is **already** an earned citizen too, and the welcome fires
    for them. The message should say so (see *What to build* and open question 3).

**The Telegram side today.**
- One bot, one operator forum group, the never-throw send `sendTelegramMessage`
  (`src/core/notifications/TelegramNotifier.ts`). Topics are chosen by env var: `TELEGRAM_TOPIC_ALERTS` and
  `TELEGRAM_TOPIC_NAME_CHANGES` are read on the profile box (`src/profile-server/Server.ts` ~:158–:159);
  `TELEGRAM_TOPIC_FEEDBACK` belongs to the **game** pipeline and is deliberately absent here.
- **House rule for those two: blank ⇒ the group's General topic** — "works, in the wrong room", never "fails"
  (`Server.ts` ~:151–:157, `example.env.profile` ~:86–:103, `alert-delivery-runbook.md` § *Configuration*). That rule
  meets the owner's "not in existing topics" ruling head-on for this message — see open question 1.
- ⚠️ **A wrong topic id is worse than a blank one:** Telegram rejects the message and it is **lost**
  (`example.env.profile`). The owner must paste the real id.

**Deploy forwarding — a new env var must be carried end to end, or it is silently dead.** The new variable (working
name `TELEGRAM_TOPIC_CITIZENSHIP`) must appear everywhere the two existing topic vars do:
- `build-deploy-profile.sh` (~:702–:707, the `printf "export …"` lines);
- `setup-profile.sh` — persist-or-reuse (~:779–:780), the `profile.env` block (~:812–:813), the config report loop
  (~:880–:890), and the closing operator hints (~:1833);
- `example.env.profile` (~:86–:103);
- `tests/scripts/profile-deploy-hardening.test.sh` — every assertion that lists the two topic vars (~:1245, ~:1828,
  ~:1853, ~:1923). This harness runs inside `npm test` (CLAUDE.md § *Shell harnesses*);
- `npm run check:config-parity` (`scripts/check-config-parity.mjs`, task `0298`) — the deploy scripts run it with
  `--enforce` and stop on a finding, so the value must be read with a **literal** `process.env.…` (as `Server.ts`
  does) and forwarded;
- `ai-agents/knowledge-base/alert-delivery-runbook.md` § *Configuration* table.

## What to build

1. **New topic variable** (`TELEGRAM_TOPIC_CITIZENSHIP` unless the plan finds a better-fitting name), read in
   `Server.ts`, forwarded and persisted by the deploy exactly like the two existing topic vars, with the harness,
   parity check, `example.env.profile` and runbook updated. Its blank behaviour follows the owner's answer to open
   question 1.
2. **Earned message** — after COMMIT, wherever `afterCitizenshipEarned` fires (match credit **and** tenure grant): one
   message to the Citizenship topic saying a player **earned** citizenship by XP, with the internal player uuid, the
   XP total at the moment of crossing, and which path crossed it (match / tenure grant).
3. **Paid message** — after COMMIT on `granted` in `grantPaidPurchase`: one message saying a player **bought**
   citizenship, with the internal player uuid, the product id, which route landed it (`complete` / `reconcile` —
   the plan says whether that is cheaply knowable), and whether the player was **already an earned citizen**.
4. **Never send:** on `already_processed`, on a `duplicate` credit, on a rolled-back transaction, or when
   `citizenshipNewlyGranted` is false.
5. **Never include:** a Yandex id (ADR-113 / task `0270` — operator messages carry the internal uuid only), the
   purchase token, the intent id, the raw payment payload, or any signature. Every field HTML-escaped.
6. **Telegram must never affect the grant.** Same contract as the inbox hooks it sits beside (0017 review residual
   R1, owner-ruled 2026-08-24): fire-and-forget after commit, never throws, never delays the HTTP answer, never turns
   a durable grant into an error. A failed send is one warning log line naming the result only (no token, no id).
   `sent_after_retry` counts as sent (task `0277`). Telegram unset (no token / chat) ⇒ nothing sent, nothing else
   changes.
7. **Owner step — recorded here, not the coder's to do:** before the deploy that ships this, the owner creates a
   **Citizenship** topic in the operator Telegram group by hand, reads its numeric topic id, and puts it in the local,
   gitignored profile deploy config (`.env.profile`, per `example.env.profile`). The value is persisted on the box on
   first deploy. **No topic id goes in any tracked file.**
8. **Out of scope:** any player-facing change; the inbox templates; payment verification; a message for refunds or
   revoked purchases (none exist today); the game server's feedback topic.

## Verification steps

1. **Earned path tests** (`PlayerProfileRepository` unit tests with a stubbed send, and/or
   `tests/integration/PlayerProfileRepository.it.test.ts` / `TenureGrant.it.test.ts` via `npm run test:integration`):
   - a credit that crosses the threshold sends **exactly one** earned message to the Citizenship topic;
   - a duplicate credit of the same match sends **nothing**; a credit below the threshold sends nothing; a credit
     for an already-citizen sends nothing;
   - a **paid** citizen crossing the XP threshold sends nothing (matches today's welcome);
   - a tenure grant that crosses the threshold on top of match XP sends one message, labelled tenure;
   - concurrent credits that both see the crossing still send **one** (the locked-row decision guarantees this —
     prove it).
2. **Paid path tests** (`tests/profile-server/PaymentsRepository.test.ts`, `PaymentsRoutes.test.ts`, and the
   integration suite):
   - `granted` sends exactly one paid message; the same token again (`already_processed`), via `/complete` **or**
     `/reconcile`, sends **nothing**;
   - a grant to an already-earned citizen sends one message that says so;
   - the message text contains **none** of: the purchase token, the intent id, the raw payload, a Yandex id (assert
     against fixture values).
3. **Grant unaffected by Telegram:** a send stub that fails, throws synchronously, or never resolves leaves every
   outcome and every database row exactly as without it, and the route answers promptly.
4. **Topic behaviour** matches the owner's ruling on open question 1 (tested both ways: set ⇒ that topic; blank ⇒ the
   ruled behaviour, with its log line).
5. **Deploy plumbing:** `npm test` passes, including `tests/scripts/ShellHarnesses.test.ts` (the hardening harness
   now asserts the new var alongside the other two); `npm run check:config-parity` reports nothing for the new var.
6. `npm run lint` passes.
7. **Live check (after the owner's topic step and a weekend-slot profile deploy):** the next real new citizen —
   earned or paid — appears once in the Citizenship topic and nowhere else. Per the build-vs-verify rule, this is a
   **separate verify task** filed at the top of the next sprint when the build closes; it must not block that
   sprint's deploy. ⚠️ Earned citizens arrive on their own schedule and paid ones may not arrive for a while, so the
   verify task should say how long to wait and what counts as proof if no paid purchase happens (see Notes on
   `0297`).

## Open questions — for the owner, at the plan step (producer's recommendation marked)

1. **What if the Citizenship topic id is not set?** The two existing topics fall back to the group's **General**
   topic when blank. But the owner said these messages must **not** go to existing topics. Options: (a) send to
   General, like the others; (b) **skip the message**, with one warning at startup saying citizenship notifications
   are off until the topic is set; (c) make the deploy **refuse** to run without it. — **Recommend (b), skip with a
   startup warning.** It honours the owner's "not in existing topics" ruling, and unlike (c) it never blocks a
   profile deploy over an optional notification — which matters while Sprint 7 limits how many profile deploys can
   happen (see Notes). The cost: if the owner forgets the topic step, nothing arrives and only a log line says why;
   the deploy's config report should also list it as `OPTIONAL … citizenship notifications off`.
2. **Volume — one message per new citizen, no batching?** Earning takes 100 XP at 1 XP per qualifying match
   (`Citizenship.ts`), so earned citizens are expected to be few; paid ones fewer. — **Recommend: one message per new
   citizen, no daily digest, no rate limit**, with the plan step checking the real rate first (a read-only count of
   `citizenship_earned_at` per day on the box) and saying so if it is higher than "a few a day".
3. **Paid by someone who already earned it?** The grant still happens and the welcome still fires today. —
   **Recommend: send the paid message, marked "already an earned citizen"** — it is still real revenue, which is the
   point of hearing about it.
4. **Any more detail?** e.g. the player's display name (a new citizen usually has none yet), or the price (the grant
   does not store it). — **Recommend: no** — uuid, path, XP or product id is enough; the uuid is what every runbook
   query keys on.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Kept as one brief, not split** into "new topic + deploy forwarding" and "the notifications": the env plumbing on
  its own delivers nothing anyone can see or verify, and the messages cannot reach the right topic without it. They
  ship and verify together.
- **Sibling, not a dependency:** [`0361`](../0361-telegram-confirmation-when-a-name-change-is-decided/brief.md)
  (name-change confirmation). Both copy the same never-throw Telegram pattern; if one extracts a small shared
  "send operator message, never throw" helper, the other should reuse it.
- **Relation to `0297`** (paid-citizenship owner-run test buy, Sprint 7, blocked): a real purchase would be the
  **first live proof of the paid message**. Not a dependency either way — if this ships after `0297`'s buy, the
  verify task needs another real or test purchase to prove the paid path.
- ⚠️ **Deploy timing (Sprint 7, soft):** [`plan-sprint-7.md`](../../../sprints/plan-sprint-7.md) records that there is
  to be **no second profile deploy before `0297` §1 reads `0309`'s log line** (container logs are lost on recreate),
  and that `build-deploy-profile.sh` **refuses to run while any `src/` change is uncommitted**. So this task's code
  and deploy-script edits must not sit uncommitted across that weekend deploy, and it ships in a later profile
  deploy. Also note this task **edits `build-deploy-profile.sh` / `setup-profile.sh`**, which `0355` (deploy version
  tagging, closed in Sprint 7) changed and Backlog task `0346` (migrations before new code) will change — plan
  against whatever has landed by then.
- Related: `0067` (name change / operator Telegram), `0277` (forum topics + alert relay), `0298` (config parity),
  `0017` / `0018` / `0065` (earned and paid citizenship), `0253` (tenure grant), ADR-113 (internal player id).
- No player id, topic id, chat id, host or IP is recorded here on purpose.
- Size: small-to-medium — two hook sites (three call sites), one message builder, one env var carried through four
  deploy files and the harness, tests, a runbook row.
