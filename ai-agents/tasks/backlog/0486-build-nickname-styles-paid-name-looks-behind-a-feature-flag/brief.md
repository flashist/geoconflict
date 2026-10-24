# Build: nickname styles — paid looks for a player's name, sold to every logged-in player, behind a feature flag

## ID
0486

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in the same run as `0485`, in dependency order
> (highest before this run: `0484`). `0486`: no task folder and no task reference in `ai-agents/tasks/`,
> `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"Nickname styles: file the build, park it, or drop it?"*, the
> owner picked, verbatim, **"File (Recommended)"** — option text: *"Investigation + build tasks on the Backlog board;
> the build waits on them and on 0484 (Sprint 9). 0477 closes."* → Backlog board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design. The board row is an **append** at the bottom of the Backlog board, not a merit
placement.)

## Status
🔲 Backlog

## Owner
fkit-coder

> ⚠️ **This brief is the build's scope holder, to be SPLIT before it is built.** Its shape depends on `0485`'s
> findings (how many name-drawing paths exist; whether a readability solution can be reused). When those findings are
> reviewed with the owner, the producer files the smaller build briefs `0485` proposes (with `/fkit-task-brief`) and
> this brief either becomes the first of them or is closed as split. **Do not start coding from this brief as it
> stands.**

## Context

**In plain terms.** Players will be able to buy **nickname styles** — extra looks for how their name is shown: a
**background colour**, a **border**, a **text colour**. Each is sold on its own. Buying any style also makes the buyer
a **full paid citizen** (no interstitial ads, and the other paid perks). Other players see the style everywhere the
name shows.

**Where this comes from.** The nickname-styling talk
[`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md) ended in **File** on
2026-10-24. Every ruling below is quoted, with its batch, in
[`0477`'s worklog](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md). The
original prose is `0477`'s appendix (from `done/plan-sprint-5.md` § *8a*).

### Owner rulings this build must carry (all 2026-10-24, relayed; ⛔ not producer precedent)

1. **Who may buy: any logged-in player.** Owner picked **"Everybody (Recommended)"** — *"Any logged-in player. Buying
   also makes them a full paid citizen, so it's a second way in."* (batch 1, answer 1). Not only players who already
   hold a citizen name: the old "styles are an upsell only" rule is replaced.
2. **A guest logs in first**, through the shared purchase flow [`0484`](../0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md).
   Owner, verbatim: *"if it's a guest - we're asking to log in (ideally, after login we should make a seamless
   transition to the purchase flow without additional popups or steps, if possible)"* (batch 1, answer 2). No
   guest-only purchase.
3. **Buying makes the buyer a full paid citizen** (`0343` Q2, verbatim *"It will give a full-paid citizen, but each
   item will be more expensive than the item of paid citizenship only."*).
4. **Price: about 499 Yan per style — a working figure, confirmed before ship.** Owner, verbatim: *"For now I am
   thinking about something slike almost 2x of that price, something like 499 Yan"* (batch 1, answer 3). Every price
   must be above paid citizenship alone, **249 Yan** (not re-checked in the Yandex console). The pack is **not** in
   scope: it is its own talk, [`0483`](../0483-discussion-nickname-style-pack-offer-whether-to-sell-one-and-at-what-price/brief.md).
5. **Readability (conditional).** Owner, verbatim: *"If there is already an implemented solution for that in the game
   (as for the patterns/flags), then I would like to reuse it. If not, hen option 1."* (batch 2, answer 2). Option 1 =
   a **fixed set** of colours and borders the owner approves once on real maps — no free colour picker, no
   moderation. Which branch applies is `0485`'s finding. The ★ citizen icon and leaderboard badges must stay visible.
6. **A style shows to every player, with no extra check.** Owner picked **"Yes, shows to all (Recommended)"** (batch 2,
   answer 3). Consistent with `0343` Q4 (no new verification gate) and ADR-124 Q5.
7. **Ship to all, behind a feature flag. No A/B test.** Owner, verbatim: *"Ship to all, but with a feature flag that
   allows it to be switched off quickly, if needed (the "switch off" part should only take care about the visual
   elements, that users can see, the backend implementations should not be affected by it)"* (batch 2, answer 4) —
   and **"Yes, hide it too (Recommended)"**, option text *"Flag off = no styles shown and no way to buy. Backend and
   saved purchases stay untouched."* (batch 3, answer 2). So **flag off** = no styles drawn on any name **and** no
   place to buy one; purchases, grants and stored styles keep working and are kept. ⚠️ This flag rule is for nickname
   styles only — not a rule for other items.
8. **Its own grant branch.** [`0019`](../../done/0019-yandex-payments-impl/brief.md) review R2, owner ruling
   2026-08-14 *"guard now"*: the profile server's paid-purchase grant refuses any product other than citizenship and
   throws. Styles need their **own grant branch**, and that branch must **also grant full paid citizenship** (ruling 3).

### Things to know — flagged, not decided here

- ⚠️ **Fail-open cosmetics check.** Cosmetic entitlements fail open today, and the owner's acceptance of that
  **expires at the first paid entitlement** (ADR-102, risk R5; [`0008`](../0008-privilege-refresher-fail-closed-migration/brief.md)).
  `0485` says whether styles pass through that check. If they do, how this build relates to `0008` is a question for
  the owner at the split — not assumed here.
- **The Yandex catalog needs a new product per style** (owner action in the Yandex console), with the confirmed price.
- **Custom fonts and pattern fills on letters are out of V1 scope** (old prose; unchanged).
- **Analytics:** any new event follows `ai-agents/knowledge-base/analytics-event-reference.md` (update it with the
  event). **Text:** every visible string through `translateText`, in both `en.json` and `ru.json`. **HTML:** new
  elements go in both `index.html` and `yandex-games_iframe.html`.

## What to build

**Split first (see the ⚠️ under Owner).** The whole scope, for the split to cover:

1. **Profile server — grant.** A grant branch for each style product: it records the style as owned **and** grants
   full paid citizenship. Unknown products still throw (`0019` R2).
2. **Drawing.** The owned style is drawn on the player's name in every place `0485` lists (in match, leaderboard,
   post-match summary, diplomacy UI), the same everywhere, for all players to see. The ★ icon and the approved name
   stay visible.
3. **The style set.** Either the reused readability / approval solution, or the owner-approved fixed set (per `0485`
   and the owner's choice after it).
4. **Buy entry point.** A place to buy a style, using the shared purchase flow from `0484` (guest → log in → straight
   into the purchase, if possible).
5. **Feature flag.** One flag that hides every style on every name **and** the buy entry point. Off touches nothing on
   the backend. Reuse the project's existing flag mechanism (the plan names which — for example the one behind
   `private_lobbies_all`, `0428`).

## Verification steps

1. **Split done:** this brief's worklog names the build briefs filed from it after `0485`'s findings, each with
   canonical `**Depends on:**` / `**Blocks:**` lines — or says why it stayed one brief.
2. **Who may buy:** a logged-in player who is not a citizen can buy a style; after the purchase they are a full paid
   citizen (no interstitial ads). A guest is asked to log in first and cannot buy as a guest.
3. **Grant:** a test proves each style product records the style **and** grants full paid citizenship, and an unknown
   product still throws.
4. **Drawing:** on a real map in a real match, a bought style shows the same in every place `0485` listed, seen from a
   **second** player's client; the ★ icon and the approved name stay visible and the name stays readable.
5. **Flag off:** with the flag off, no style shows on any name and there is no way to buy one; switching it back on
   brings the owned styles back with nothing lost (the purchase and the stored style were kept).
6. **Price:** before ship, the owner confirms the final price per style (dated, in the worklog); it is above 249 Yan;
   the Yandex catalog products carry it.
7. Tests pass (`npm test`); any `src/core/` change is tested. Analytics reference and both language files updated if
   touched.
8. On close, a verify-live task is filed at the top of the next sprint (owner's build/verify split rule).

## Notes

- **Depends on:** 0485, 0484
- **Blocks:** nothing
- **From:** [`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md) (outcome
  File, 2026-10-24).
- **Placement (2026-10-24):** on the Backlog board, waiting on `0485` (Backlog board) and `0484` (Sprint 9, an
  earlier board). The owner's option text stated this wait: *"the build waits on them and on 0484 (Sprint 9)"*.
- **Related:** [`0483`](../0483-discussion-nickname-style-pack-offer-whether-to-sell-one-and-at-what-price/brief.md)
  (pack talk — a pack, if sold, may fold into this build), [`0019`](../../done/0019-yandex-payments-impl/brief.md),
  [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  [`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md),
  [`0068`](../../done/0068-citizen-verified-icon/brief.md), [`0008`](../0008-privilege-refresher-fail-closed-migration/brief.md),
  [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md), [`0011`](../0011-re-enable-territory-patterns/brief.md).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
