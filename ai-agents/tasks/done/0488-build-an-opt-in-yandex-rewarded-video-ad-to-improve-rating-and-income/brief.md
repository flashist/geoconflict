# Build: an opt-in Yandex rewarded video ad — the player chooses to watch, and gets a reward (to improve rating and income)

## ID
0488

## Sprint
Sprint 9

> ⚠️ **Placement is the lead's reading of the owner's "now", not an owner placement.** The owner said rewarded video
> is *"worth planning and implementing now"* (answer 2 below). Sprint 9 is the active sprint, so `fkit-lead` read
> "now" as Sprint 9 and asked for it here. **The owner may move it** — to another sprint or the Backlog board.

## Priority
18

> ⚠️ Priority 18 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0480`** (that is, above the remaining open rows `0481`, `0482`, `0484`),
> because the owner wants it planned and built now for rating and income, and it waits on none of them — the two
> talks are discussions, and `0484` is the purchase flow, which a rewarded ad does not use. Appended after the board's
> highest (17), never inserted (ADR-035); no row renumbered. ⚠️ An owner-ruled re-rank can lift it only to the top of
> the open run it sits in (above `0481`): `0480`'s row directly above that run is a `➡️ Moved` row, a wall (ADR-035).

## Status
✅ Done (agent-closed — not owner-verified)

> (Status until 2026-10-24) ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

**Filed 2026-10-24 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER ANSWER given live in
the lead's Claude Code session on 2026-10-24 (typed, not a listed option), relayed by `fkit-lead` (driving
`/fkit-sprint-ship-loop` on Sprint 9); ⛔ not producer precedent.** Split out of the coin-economy talk
[`0480`](../../backlog/0480-discussion-coin-economy-and-rewarded-ads-what-coins-buy-and-outcome/brief.md), which is now ON HOLD on
the Backlog board (answer 1 below). This brief is `0480`'s To-discuss question 2 answered: the minimal rewarded ad is
**its own step**, not folded into a coin economy.

The question, as relayed: *"A rewarded ad on its own (player opts to watch, gets e.g. double match XP): worth a look
now?"* The owner typed, verbatim:

> *"Yandex's rewarded video work for us and it might improve our rating and income. It's worth planning and
> implementing now."*

The same round, for the record: on coins the owner typed *"I am actually thinking of cancelling this task too. Park it
indefinitely in backlog. I will get back to this decision later."* (⇒ **no coins**: this build gives no coins and builds
no currency). On *"Is citizenship the 'premium tier' the old plans mentioned?"* he asked for more context —
~~**not answered, pending**~~ *(answered later on 2026-10-24: the old "premium tier" idea is **dropped** unless
something important is found in it; paid citizenship keeps something extra, every other feature goes to all citizens
— recorded in `0480`'s worklog)*; it does not bind this build. Full record: `0480`'s
[`worklog.md`](../../backlog/0480-discussion-coin-economy-and-rewarded-ads-what-coins-buy-and-outcome/worklog.md).

**The goal.** An **opt-in** Yandex rewarded video: the player presses a button, watches a video ad, and gets a
reward. Built to **improve the game's rating and income** (owner's words). It never plays by itself — unlike the
interstitial (fullscreen) ads the game shows today.

**Old plan this replaces.** The older board [`sprint-backlog.md`](../../../sprints/sprint-backlog.md) carries an
unbriefed row *"Task 6 — Rewarded Ads: Minimal Version"*. This brief is that step. That row was **not** edited by
this filing (it is a different board) — a producer follow-up.

### What the producer knows today (checked 2026-10-24; the coder's plan re-checks)

- **No rewarded-video code exists.** `src/` has the interstitial path only —
  `FlashistFacade.showInterstitial()` calls the Yandex SDK's `adv.showFullscreenAdv` (`src/client/flashist/FlashistFacade.ts`).
  A grep for "rewarded" in `src/` finds nothing.
- **The only reward the game has today is XP.** Earned citizenship comes at **100 XP**, **1 XP per qualifying match**
  (`CITIZENSHIP_XP_THRESHOLD` in `src/core/profile/Citizenship.ts`; ADR-111). Match XP is credited **by the game
  server** at match end through the profile box ([`0217`](../../done/0217-profile-p2-wire-game-server-to-profile-box/brief.md),
  trust seam `GameServer.getCreditableYandexId()`), not by the client.
- **Guests have no profile**, so they have no XP to add to. Guests were **58.2 %** of match starts, 2026-10-08 →
  2026-10-10 ([`0405`](../../done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md)).
- **Paid citizens see no interstitials** ([`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  gate `is_paid_citizen`). The wiki records rewarded video as **never in scope** of `0248`. Whether that gate
  reaches a new rewarded path is unchecked (plan check 5).
- **A rewarded ad is not a purchase.** Nobody pays, so the purchase rules (every purchase grants paid citizenship, a
  guest logs in first, price above 249 Yan) **do not apply**, and this build does **not** wait on the shared
  purchase-flow design [`0484`](../../done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md).

### ⚠️ The trade-off behind the reward choice — stated, not decided

If the reward is XP (for example, *double this match's XP*, i.e. +1 XP), a player who watches after every match reaches
earned citizenship in **as few as 50 matches instead of 100**. Free citizenship then competes harder with the
**249-Yan paid citizenship** — more income from ads, possibly less from purchases. A daily cap bounds the speed-up.
XP also does nothing visible for someone already a citizen (as far as the producer knows — the coder's plan
confirms), and nothing for a guest. This is owner question 1 below.

> ✅ **2026-10-24 — the owner chose double match XP with NO daily cap** (ruling R1 below). The speed-up described here
> (as few as 50 matches to earned citizenship instead of 100) therefore stands unbounded by any cap of ours. It is
> recorded, not re-asked; the coder's plan restates the number at plan approval so the owner sees it once more.

## Owner rulings — 2026-10-24

**Provenance.** OWNER ANSWERS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (each
typed, not a listed option), relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Quoted verbatim as relayed. Dated record:
[`worklog.md`](worklog.md).

- **R1 — the reward.** Asked *"Rewarded ad: what does the player get for watching?"*, the owner typed:
  > *"For now only double match XP, without daily caps (the simplest possible implementation). In the future, as an
  > additional monetization channel, we might give users an option for "testing" some customizations for the rewarded
  > ads."*

  ⇒ **Reward: double this match's XP. No daily cap of our own.** The "testing customisations" idea is a **later idea,
  NOT in scope** (see *Out of scope* and *Notes*).
- **R2 — where it appears, and how often.** Asked *"Rewarded ad: where does the button appear, and how often?"*, the
  owner typed:
  > *"End of match, not cap, can be shown after each match that gives XP (also will be very informative for users to
  > tell them more about the XP, this popup will make it clear that they are given XP after losing/winning/match end),
  > if we already have any popup that is shown at this moment in the game, we can reuse it and develop on top of it. "*

  ⇒ **Where: the end-of-match moment, after every match that gives XP. No cap of our own.** **Reuse the existing
  end-of-match popup if there is one** — the producer knows of `WinModal` (`src/client/graphics/layers/WinModal.ts`,
  which already shows the interstitial at match end); **the coder confirms** whether it is shown on a loss and on every
  match end, and builds on it. **The popup also explains XP:** that the player gets XP after a win, a loss or a match
  end.
  ⇒ *Lead's/producer's reading, for the owner to confirm at plan approval:* the reward is claimable **at most once per
  match** — "double this match's XP" has nothing left to double after one watch.
- **R3 — who sees it.** Asked *"Rewarded ad: who sees the offer?"*, the owner typed:
  > *"This popup should be shown only to non-citizens. The idea about showing it to guests is a good thing too. Players
  > who are already citizens shouldn't show this popup."*

  ⇒ **Non-citizens only. Citizens never see it — paid AND earned citizens.** **Guests see it too.**

## Owner questions — status

**The coder does not choose these.** All five are settled except one open design point under question 5.

1. ✅ **Settled (R1)** — ~~What the reward is.~~ Double this match's XP. No coins (answer 1). No daily cap.
2. ✅ **Settled (R2)** — ~~Where the button appears.~~ The end-of-match moment, after every match that gives XP, on the
   existing end-of-match popup if one exists (coder confirms), which also explains XP.
3. ✅ **Settled (R1, R2)** — ~~How often it can be watched.~~ No cap of our own. Yandex's own frequency and moderation
   rules still apply (plan check 3); the producer's reading of *at most once per match* is under R2, for confirmation.
4. ✅ **Settled (R3)** — ~~Do paid citizens still see the opt-in offer?~~ **No.** Citizens do not see the offer at all,
   paid or earned, so the paid-citizen question no longer arises.
5. ✅ **Settled in principle (R3), one design point OPEN** — ~~Can guests use it?~~ **Yes, guests see the offer.**
   - ⚠️ **OPEN — for the coder's plan, owner to confirm at plan approval. Not a ruling.** A guest has no profile and
     no XP, so there is nothing to double. *The lead's reading:* for a guest the offer becomes a **"log in to get the
     reward"** prompt. A **plain login prompt** (log in, then the reward applies from the next match or not at all) is
     an ordinary login and does **not** need [`0484`](../../done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md).
     A **seamless continue** (log in, then this same match's XP is doubled without starting over) would lean on
     `0484`'s design and would be re-scoped. The plan names which, and what a guest's XP for *this* match even is
     (a guest's match credits no XP today — see *What the producer knows*).
   - ⚠️ Related, same point: R2 says *"after each match that gives XP"*; for a guest no match gives XP. The plan says
     which guest matches show the offer (the producer's reading: a match that **would** give XP if the guest were
     logged in).

## What to build

An opt-in rewarded video, end to end, for the reward, place, limits and audience the owner settled (R1–R3 above):
**double this match's XP**, offered on the **end-of-match popup** after every match that gives XP (reusing the
existing popup if there is one), **no cap of our own**, shown to **non-citizens and guests only**, never to citizens.
The popup also tells the player they get XP after a win, a loss or a match end. The guest case follows the open design
point under question 5.

> ✂️ **2026-10-24 — build scope after the split: plan Part C only.** OWNER RULINGS, live `AskUserQuestion` in the lead
> session, relayed by `fkit-lead` (ADR-021/037); ⛔ not producer precedent: **"Approve as planned (Recommended)"** and
> **"Split it (Recommended)"**. This task builds **Part C** of the approved [`plan.md`](plan.md) — **steps 7–12 plus
> the client tests**. Part S (the profile-box route, steps 1–6 + its tests) is
> [`0491`](../../done/0491-profile-box-rewarded-ad-match-xp-grant-route-server-part-of-0488/brief.md), which this task waits
> on. Deploy order: profile box (`0491`) first, then this client. Dated record: [`worklog.md`](worklog.md).

### Plan-step checks — the coder answers each in the plan, with evidence, before building

1. **Does Yandex rewarded video work in our build?** Confirm the SDK call (the Yandex Games SDK documents a rewarded
   video call next to `showFullscreenAdv`; check the current docs, do not assume), that it works on the Yandex
   template (`src/client/yandex-games_iframe.html` — the one served for geoconflict.ru), and what happens in
   **degraded SDK mode** (platform init timed out, no SDK, no player — see `Session:PlatformDegraded:*`): the button
   must not show, or must fail safely, when the SDK is missing. The standalone page (`src/client/index.html`) has no
   Yandex SDK — same rule.
2. **Reward only on the rewarded callback.** The reward is granted only when the SDK reports the video was watched to
   the reward point — never on open, close, error, or a closed-early video.
3. **Frequency rules.** What Yandex allows or requires for rewarded video (limits, moderation rules for how the offer
   is shown, sound/pause while the ad plays), and how it interacts with the interstitial already shown on some of the
   same screens (`WinModal`, the lobby paths) — two ads back to back must not happen. *(2026-10-24: we set **no cap of
   our own** (R1, R2) — Yandex's rules still bind, and the plan says what they are. The end-of-match popup is where
   both the interstitial and the offer now live, so this check matters most there.)*
4. **XP crediting trust (`getCreditableYandexId` / `0217`).** Match XP is credited server-side today, from the game
   server. A client that says *"I watched the ad"* can lie. Say how the reward is granted, who vouches for it, and what
   a faked watch could gain — and whether Yandex offers any server-side proof of a rewarded view (do not assume it
   does). If the reward needs a new profile-box route, say so; that may be its own shippable task (see Notes).
5. **Does the `0248` `is_paid_citizen` switch-off block rewarded ads?** Check whether the paid-citizen gate in the ad
   path would suppress a rewarded call too, and make the behaviour match the owner's answer to question 4 — on
   purpose, not by accident. *(2026-10-24, R3: **citizens never see the offer — paid and earned.** The `0248` gate
   covers **paid** citizens only, so even if it happens to block the rewarded call, it does not hide the offer from
   **earned** citizens. The plan names the check that hides the offer from every citizen, and says whether the `0248`
   gate is reused, bypassed or irrelevant.)*
6. **Revenue and impression data.** Where rewarded revenue and impressions can be read — the Yandex Games console
   (does it split rewarded from interstitial?) and our own analytics events below — so the owner can judge "rating
   and income" after release. Report what is and is not available.

### Must also

- **Analytics events, per the project's rules** (`ai-agents/knowledge-base/analytics-event-reference.md` is the source
  of truth — update it with every event added): `Category:Action[:Value]` strings, PascalCase, colons, no underscores;
  keys in `flashistConstants.analyticEvents` (`src/client/flashist/FlashistFacade.ts`); never inline. At least:
  the offer shown, the button pressed, the video started, **the reward granted**, closed before the reward, error /
  not available, and suppressed-by-rule for **citizens** (R3 keeps every citizen out), plus, for guests, whatever the
  open design point under question 5 settles on (e.g. a login prompt shown / login completed). Names follow the existing
  `Ad:*` family (`Ad:Interstitial`, `Ad:InterstitialSuppressed:PaidCitizen`); the coder's plan proposes the exact
  strings. No ids, hosts or URLs in any event. Collected from **all** builds (owner rule, 2026-10-14).
- **All visible text** through `translateText(key)`, in both `resources/lang/en.json` and `ru.json`.
- **New HTML elements, if any, in both templates** (`index.html` and `yandex-games_iframe.html`).
- **Tests** for any `src/core/` change (project rule), and for the reward-only-on-callback rule.

### Out of scope

- Coins, any currency, any shop (answer 1 — parked).
- Selling anything; the purchase flow (`0484`).
- Changing when or how interstitial ads show, except to keep them from colliding with a rewarded ad (check 3).
- **"Testing" customisations through rewarded ads** — the owner's future idea in R1 (*"In the future, as an additional
  monetization channel, we might give users an option for "testing" some customizations for the rewarded ads."*).
  A **later idea, not in scope** of this build. No brief filed for it.

## Verification steps

1. The plan answers plan-step checks 1–6, each with evidence (a file reference, an SDK doc reference, or a test run on
   the Yandex template); the owner has answered questions 1–5 by plan approval, each dated in this folder's
   `worklog.md` *(1–5 answered 2026-10-24; the guest design point under question 5 and the once-per-match reading
   under R2 are confirmed at plan approval and dated there too)*.
2. On the Yandex template with a working SDK: the offer shows on the end-of-match popup after a match that gives XP
   (question 2), to non-citizens and guests, and **never to a citizen, paid or earned** (questions 4–5) — the citizen
   case shown by a test; pressing it plays a rewarded video. The popup explains that XP comes after a win, a loss or a
   match end.
3. Watching to the reward point grants the reward **exactly once**; closing early, an error, or no fill grants
   **nothing** — each shown by a test, and by a live run on the Yandex template where the SDK allows it.
4. ~~The frequency limit (question 3) holds: a watch past the limit is not offered (or not rewarded) — shown by a
   test.~~ *(2026-10-24: no cap of our own, R1/R2.)* The offer is made after **every** match that gives XP, and the
   reward for one match is granted **at most once** (if the owner confirms that reading at plan approval) — shown by a
   test.
5. With the SDK missing or degraded, and on the standalone page, the button does not show (or fails safely) and nothing
   is granted — shown by a test.
6. No interstitial plays directly before or after a rewarded video on the same screen (check 3).
7. Every new analytics event is in the enum and in `analytics-event-reference.md`, and fires in a local run (event log
   or GameAnalytics debug).
8. Every new string is in `en.json` and `ru.json`.
9. `npm test` and `npm run lint` pass (run through the npm scripts, one full run at a time).

## Notes

- **Depends on:** 0491 — OWNER RULING 2026-10-24, live `AskUserQuestion` in the lead session, relayed by `fkit-lead`
  to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Asked *"Split the server part into its own
  Sprint 9 task?"*, the owner picked, verbatim, **"Split it (Recommended)"** — option text: *"New server task on
  Sprint 9; 0488 (client) waits on it. Server deploys first. Nothing else waits on 0488."* `0491` = the profile-box
  route (plan Part S). ~~nothing~~ (until 2026-10-24).
- **Blocks:** nothing
- **Why not `0484`:** a rewarded ad is not a purchase (no money, no paid-citizenship grant), so it does not wait on the
  shared purchase-flow design. If the owner chooses *"guests log in first"* (question 5), that is an ordinary login
  prompt, not the purchase flow — unless the owner asks for the seamless continue, which would then be re-scoped.
  *(2026-10-24: guests do see the offer (R3); which of the two it is stays the open design point under question 5.)*
- **Later idea, not in scope (R1, 2026-10-24):** letting players "test" customisations by watching a rewarded ad, as a
  further income channel. Not briefed; raise it again when customisations exist to test.
- **Possible split, recorded:** if the reward needs a new server-side grant (e.g. a profile-box route that adds XP for
  a watched ad, plan check 4), that server part is likely its own shippable task. The coder's plan says so, and the
  producer splits it then. ~~Not split now because the reward is not chosen yet.~~ *(2026-10-24: the reward is now
  chosen — double this match's XP, R1. Match XP is credited by the game server at match end (`0217`), and the ad is
  watched **after** that, so the extra XP is very likely a second, later grant. Still not split: whether it needs a
  new profile-box route, and who vouches for the watch, is plan check 4's answer. The producer splits on that answer.)* *(2026-10-24: **split done** on the owner ruling
  "Split it (Recommended)" — server part is `0491`; see `Depends on:` above.)*
- **Build vs verify (owner rule, 2026-09-29):** when this build closes, a live verify task (deploy, then read the
  events and the Yandex console) goes at the top of the next sprint.
- **Deploy** in a weekend slot unless urgent (owner rule); committed is not deployed.
- **Split from:** [`0480`](../../backlog/0480-discussion-coin-economy-and-rewarded-ads-what-coins-buy-and-outcome/brief.md),
  2026-10-24 (owner answer 2 above).
- **Related:** [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  [`0217`](../../done/0217-profile-p2-wire-game-server-to-profile-box/brief.md),
  [`0405`](../../done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md),
  [`0484`](../../done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md),
  [`sprint-backlog.md`](../../../sprints/sprint-backlog.md) § *Task 6*.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
