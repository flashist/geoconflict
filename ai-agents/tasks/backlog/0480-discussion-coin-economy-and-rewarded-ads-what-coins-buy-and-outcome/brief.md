# Discussion: coin economy + rewarded ads — what coins buy, how they relate to citizenship, and File / Park / Drop

## ID
0480

## Sprint
Backlog

> Was ~~Sprint 9~~ — moved to the [Backlog board](../../../sprints/backlog.md) 2026-10-24, ON HOLD; see `## Status`.

## Priority
— *(the Backlog board is unranked; was ~~14~~ on Sprint 9, history below)*

> ~~Rank 14~~ (Sprint 9, spent 2026-10-24) = **append rank in the OWNER-RULED talk order** (ruling 2 *"Added after current rows, in the talk order"*;
> ruling 4 *"Nickname styles (Recommended)"* — *"Then voting, clans, coins, own flags, badges. Blocked items last."*).
> Appended after the board's highest rank, never inserted (ADR-035); no row renumbered. Directly below `0479`.

## Status
🔲 Backlog — ⏸️ **ON HOLD (2026-10-24)**

> ⏸️ **ON HOLD — moved back to the [Backlog board](../../../sprints/backlog.md), 2026-10-24.** OWNER RULING given live
> via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (typed, not a listed option), relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel
> (ADR-021/037); ⛔ not producer precedent. Asked *"Coins (earn after matches, spend on looks): worth building at
> today's player numbers?"*, the owner typed, verbatim: *"I am actually thinking of cancelling this task too. Park it
> indefinitely in backlog. I will get back to this decision later."*
> - ⚠️ **Cancelling is UNDECIDED and is the owner's call.** Do **not** cancel this task, and do not pick it back up
>   into a sprint, without an owner ruling.
> - **The rewarded-ad part was split out** as build task
>   [`0488`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md) (Sprint 9), on
>   the owner's answer *"Yandex's rewarded video work for us and it might improve our rating and income. It's worth
>   planning and implementing now."* What stays on hold here is the **coin economy** only.
> - **Pending:** *"Is citizenship the 'premium tier' the old plans mentioned?"* (To-discuss 4) — the owner asked for
>   more context; not answered. Answers so far in [`worklog.md`](worklog.md).
> - Status was ~~🔄 In progress~~ (talk started 2026-10-24); the history below is unchanged.

~~🔄 In progress~~ *(📌 **2026-10-24 — was ~~🔲 Backlog~~, now `🔄 In progress`** — the talk has started. OWNER RULINGS, live `AskUserQuestion` in the lead session 2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"All six on Sprint 9 (Recommended)"** (*"The loop keeps offering the next talk"*) and talk order **"Nickname styles (Recommended)"** — *"Then voting, clans, coins, own flags, badges. Blocked items last."* — `0477` closed 2026-10-24 (File), `0478` (voting) put ON HOLD on the Backlog board 2026-10-24, `0479` (clans) closed 2026-10-24 (Park), so coins is next. Status edit only: no move, no rank change.)*

## Owner
fkit-producer

## Context

**Filed 2026-10-24 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given live via
`AskUserQuestion` in the lead's Claude Code session on 2026-10-24, relayed by `fkit-lead` (driving
`/fkit-sprint-ship-loop` on Sprint 9); ⛔ not producer precedent.** Ruling 1, verbatim: **"A talk per item
(Recommended)"** — *"Six discussion tasks (styles, voting, own flags, badges, coins, clans): each item's questions and
price asked in its own round."* Ruling 2, verbatim: **"All six on Sprint 9 (Recommended)"** — *"Added after current
rows, in the talk order. The loop keeps offering the next talk. No other task waits on them."*

**What this brief is.** A **talk, not a build. Nothing is built from this brief.** Its job is one owner decision on
this item — **File** (real build brief(s), with an investigation first where the shape is unknown), **Park** (keep it,
and write down what would bring it back) or **Drop** (record the reason) — plus the answers it needs to get there: who
may buy it, its price, and the questions below. It is split out of the discussion agenda
[`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md), which carried all eight parked items.

**Item G of `0343` — Coin Economy + Rewarded Ads (full version).** In plain words: an in-game currency — earn coins
after matches (more for playing well), double them by watching an ad, spend them on some cosmetics. Other cosmetics
stay money-only. It sits with the citizenship items by owner ruling C (2026-09-29), not because it is a citizenship
perk.

**Full prose:** [Appendix — Coin Economy + Rewarded Ads (verbatim)](#appendix--coin-economy--rewarded-ads-verbatim)
below, copied from `0343` Appendix G. Original source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *11. Coin Economy + Rewarded Ads Full Version*.
`0343`'s own item G section:
[here](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md#item-g--coin-economy--rewarded-ads-full-version).

### Standing owner rulings that bind this talk

OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24, relayed by `fkit-lead`
(driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037);
⛔ not producer precedent. Full verbatim text: [`0343`'s worklog](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/worklog.md).
They hold for this item unless the owner rules otherwise **in this talk**.

- **Q1 — who gets it.** Owner, verbatim: *"Those features (each) is a separate item and will be discussed separately
  each time. Most of the things that you described will be a paid option for everybody (doesn't matter whether it's a
  paid/not-paid citizen/not-citizen/guest). Each item should be discussed separately. Brief a separate task per each
  item."* ⇒ The default is **a paid option anyone can buy**. **Who may buy this item is decided in this talk.**
- **Q2 — what buying gives.** Owner, verbatim: *"It will give a full-paid citizen, but each item will be more expensive
  than the item of paid citizenship only."* ⇒ Buying this item makes the buyer a **full paid citizen** (which includes
  no interstitial ads, `0248`). Its price must be **above paid citizenship alone — 249 Yan** (owner changed it in the
  Yandex console, 2026-09-25; not re-checked in the console).
- **Q3 — price.** Owner, verbatim: *"Ask me questions about each item separtely in another interactive questions
  interface."* ⇒ This item's price is asked **in this talk's own question round**.
- **Q4 — no new verification gate.** Owner picked, verbatim: **"No, same as today (Recommended)"** — option text:
  *"Same rule as existing perks. Small, accepted faking risk; paying players never miss a perk."*
- **Talk order** (ruling 4, verbatim): **"Nickname styles (Recommended)"** — *"Then voting, clans, coins, own flags,
  badges. Blocked items last."*

### Standing ruling (2026-10-24, from 0477's talk)

OWNER RULING given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24, in the talk on
nickname styles ([`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md)),
relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
channel (ADR-021/037); ⛔ not producer precedent. Asked about a guest buying a style, the owner picked *"Ask to log
in first (Recommended)"* and typed, verbatim:

> *"#1, but generally speaking, we should have the same rules for ALL purchases: allowed to all, gives paid
> citizenship, if it's a guest - we're asking to log in (ideally, after login we should make a seamless transition
> to the purchase flow without additional popups or steps, if possible). This flow is worth additional discussion
> with producer/architect/coder, to design it well from the go-start, because it will be reused for all
> purchases."*

⇒ For **every** purchase, this item's too: **allowed to all** · **gives paid citizenship** · **a guest is asked to
log in** · ideally a seamless continue into the purchase after login. Also from that talk, the owner's rule for
prices, verbatim: *"All prices should be bigger, than the price of the pure paid-citizenship."* The shared
login-then-purchase flow is to be designed once with producer, architect and coder; that design task is **not
filed yet** (owner placement pending, 2026-10-24). *(📌 Update 2026-10-24: now filed as
[`0484`](../../done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md) on Sprint 9, owner
ruling **"Sprint 9, builds wait (Recommended)"** — future item builds wait on it.)*

**What this settles here.** **S1 — "who may buy":** if anything here is sold for real money, anyone may
buy it, and a guest logs in first. **S1 — "is anything sold"** and the price **stay open**. **S2 (does spending
coins count as a purchase?) stays open** — the ruling covers purchases, not whether a coin spend is one.
**The guest flag** under *"Context for the future build task"* is answered on the product side: a guest logs in
first; the seamless continue after login stays open, for the shared flow's design task. Nothing below is deleted.

### Already settled — do not re-ask (each by its source)

- **Verified logins are live.** [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
  closed 2026-10-07 with the owner's live check `vfy: true`. The trusted-identity work the old agendas waited on,
  [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) and
  [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md), is done.
- **Most players with a Yandex id start a match verified.**
  [`0405`](../../done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md)
  closed 2026-10-10: **95.3 %** (5,676 / 5,958) of match starts by players **with a Yandex id** were verified,
  2026-10-08 → 2026-10-10. ⚠️ Guests are outside that share: they were 58.2 % of all match starts in the same window.
- **ADR-124's per-use rulings** ([ADR-124](../../../knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md),
  accepted 2026-10-07): Q2 XP stays open to unverified players · Q3 the ★ stays for unverified citizens · Q4 private
  lobbies stay open to unverified citizens · Q5 the approved name shows for unconfirmed players too · Q7 a missing
  `verified` bit reads as **unverified** — the rule for any future enforcement.
- **"Any purchase grants citizenship"** — [`PROJECT.md`](../../../knowledge-base/PROJECT.md) line 37; Q2 above makes
  it *full paid* citizenship.
- **Who gets today's perks (Q1 precedents).** All citizens, earned or paid: the ★ icon
  ([`0068`](../../done/0068-citizen-verified-icon/brief.md)), name change
  ([`0067`](../../done/0067-name-change-citizens-only/brief.md)), private lobbies
  ([`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md), owner ruling *"Earned or paid"*). Paid
  citizens only: no interstitial ads ([`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  gate `is_paid_citizen`), shown under its own paid-only sub-heading in the explainer popup
  ([`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md)).
- **The game draws with Canvas 2D**, not Pixi.js (`CLAUDE.md` § *Rendering*; `src/client/graphics/GameRenderer.ts`
  takes a `2d` context; Pixi appears in 2 of the 43 layer files). Any "Pixi" claim in the old prose is stale.

### Context for the future build task — not a dependency of this talk

- **Every new product needs its own grant code.** [`0019`](../../done/0019-yandex-payments-impl/brief.md) review R2,
  owner ruling 2026-08-14 *"guard now"*: the profile server's paid-purchase grant refuses any product other than
  citizenship and throws. A new paid item therefore needs its own grant branch — and under Q2 that branch must also
  make the buyer a full paid citizen.
- ⚠️ **Not verified: can a guest buy?** Q1 names guests as possible buyers. Citizenship lives on a profile keyed by a
  Yandex id, and whether a Yandex Games purchase works without a logged-in player was not checked. An architect
  question for the build, raised here so the talk does not promise something that cannot ship.

### Known technical blockers — context for the future build task, not `Depends on:` of this talk

- The cosmetics coins would buy are flags [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md) and
  patterns [`0011`](../0011-re-enable-territory-patterns/brief.md) — both **blocked** — and behind them
  [`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md) (cosmetic entitlements come from the upstream
  OpenFront API today). A coin economy with nothing to spend on is not shippable on its own.
- The minimal rewarded-ad step (old "Task 6") has no brief; it sits on the older board
  [`sprint-backlog.md`](../../../sprints/sprint-backlog.md) § *Task 6*.
- Item D of `0343` (premium replays) said it needs "Task 11's tier" (this item). Item D is **parked** (owner hold of
  2026-10-03), so that link is dormant — question 4 below stays only so it is not lost.

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**, with its own question round (Q3).
Record the answers and the outcome in this folder's `worklog.md`.

### Standing questions for this round (from the rulings above)

- **S1 — Is anything here sold for real money** (e.g. coin packs)? If yes: who may buy (Q1's default is everybody),
  and at what price **above 249 Yan** (Q2, Q3)? If coins are earn-only, Q2 and Q3 may not apply — say so.
- **S2 — Does spending coins count as "a purchase"** under Q2 (making the buyer a full paid citizen)? Question 5
  below; the producer's reading is *real money only*, but that is the owner's call.

### Conflicts this talk must settle

- The prose forbids coins buying *"earned or purchased"* marks — badges (item F, `0482`) and the citizen mark. Under
  Q2, every purchase makes the buyer a paid citizen; does the coin side need its own line between "earned" and
  "bought"? (Ties to S2.)

### To discuss — `0343` item G's full list, carried here

1. Now that it sits with the citizenship perks (ruling C): should coins connect to citizenship at all — e.g. a
   coin bonus for citizens, or coin-buyable perks? (The prose forbids coins buying earned/purchased marks.)
2. Is the minimal rewarded-ad (Task 6) still a separate step, or does it fold into this?
3. Which cosmetics are coin-earnable, which money-only? Earn/spend rates — the prose warns they are very hard to
   change later.
4. Does citizenship now play the role the prose calls "the premium account / tier"? If yes, item D no
   longer waits on this item. *(Item D is parked — see above. Carried, not urgent.)*
5. Is anything bought with coins a "purchase" under the "any purchase = citizenship" rule? (Presumably no — real
   money only — but say it.) *(See S2.)*
6. This is weeks of work with no experiment allowed. Is it wanted at all at current player numbers?

## Verification steps

1. This item's outcome — **File**, **Park** or **Drop** — is recorded in this folder's `worklog.md`, dated, with the
   owner's words.
2. **Who may buy it** (Q1: decided per item) has a dated owner answer — or the outcome is Park / Drop and the worklog
   says the question was left open on purpose.
3. **Its price** has a dated owner answer from this talk's own question round (Q3), and that price is **above 249 Yan**
   (Q2) — or the outcome is Park / Drop and the worklog says the price was left open on purpose.
4. Every "To discuss" question below is either **answered** (owner, dated) or **explicitly carried** into a named
   follow-up brief — none silently dropped. Questions marked *settled* are recorded as settled, with the source.
5. Every item under **Conflicts this talk must settle** has a dated owner answer.
6. **File:** the follow-up brief(s) are filed with `/fkit-task-brief`, each with canonical `**Depends on:**` /
   `**Blocks:**` lines, and their IDs listed in the worklog. Where the shape is unknown, an **investigation** brief
   comes first, not an implementation brief. The known blockers above become `Depends on:` lines of those build
   briefs — not of this talk.
7. **Park:** the worklog says what would bring it back.
8. Closed with `/fkit-task-done` by the producer once 1–7 hold, **whatever the outcome** — this talk's job is the
   decision, and a recorded Park or Drop is that decision. `/fkit-task-cancelled` only if the owner decides the talk
   itself is not needed.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Split out (2026-10-24):** the rewarded-ad part (To-discuss 2) →
  [`0488`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md) (build, Sprint 9).
  Not a dependency either way: `0488` does not wait on this talk, and this talk does not wait on `0488`.
- **Split from:** [`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) item G, by owner
  ruling 1 (2026-10-24). The other five talks: `0477` (nickname styling), `0478` (map voting), `0479` (clans), `0481`
  (custom uploaded flags), `0482` (leaderboard rewards). Order is the owner's (ruling 4); none waits on another.
- **Related:** [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md),
  [`0011`](../0011-re-enable-territory-patterns/brief.md),
  [`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md),
  [`sprint-backlog.md`](../../../sprints/sprint-backlog.md) § *Task 6*.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendix — Coin Economy + Rewarded Ads (verbatim)

> Copied 2026-10-24 from `0343` Appendix G, which copied it verbatim on 2026-09-29. **Text is verbatim; only heading
> levels were changed.** Relative links inside the copy were written for the original file and may not resolve from
> here — use the source link above.

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 11*

#### 11. Coin Economy + Rewarded Ads Full Version

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 5 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 3–4 weeks
**Experiments:** ❌ Excluded — running two parallel economic models creates player fairness issues (players in different groups earn and spend at different rates) and significant support complexity. Ship to all users simultaneously.

Once rewarded ads are validated in Sprint 4, build the proper economy layer using real engagement data to set earn and spend rates.

Design:
- Some cosmetics earnable via coins (flags, basic colors), others money-only (premium patterns, special effects)
- Post-match coin reward based on performance
- Rewarded ad: double post-match coins, or a daily "watch once for X coins" grant
- Coin earn and spend rates must be carefully balanced — once players have expectations about the economy, it is very difficult to change without backlash

**Important constraint:** leaderboard badges and rank icons (Task 10) and verified nickname marks (Task 8) are earned or purchased features — they must not be purchasable with coins. The coin economy should be scoped to cosmetic items only, keeping earned achievements clearly distinct.
