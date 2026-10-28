# Paid Items — One Set of Purchase Rules for Everything Sold

**Date**: 2026-10-24
**Status**: accepted

> Sources: `ai-agents/tasks/done/0343-discussion-parked-features-tied-to-paid-citizenship/worklog.md` (batches 1–2,
> rulings Q1–Q5) and `ai-agents/tasks/done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md`
> (batch 1, answers 2–3). All owner rulings were given live via `AskUserQuestion` in the lead's Claude Code session on
> 2026-10-24 and relayed by `fkit-lead` to spawned `fkit-producer`s (⛔ not producer precedent). Quotes are verbatim as
> relayed, typos kept.

## Context

Until 2026-10-24 only citizenship was sold. Eight "parked" paid-feature ideas from the old sprint plans (map packs,
nickname styles, map voting, premium replays, uploaded flags, leaderboard badges, coins, clans) waited in one
discussion agenda, `0343` ([[tasks/parked-paid-features-discussion]]). Running that agenda produced cross-cutting
rulings that bind **every** future paid item, then one talk per item.

## Decision

**Q1 — who gets a new paid item:** *"Those features (each) is a separate item and will be discussed separately each
time. Most of the things that you described will be a paid option for everybody (doesn't matter whether it's a
paid/not-paid citizen/not-citizen/guest)."* ⇒ default: **a paid option anyone can buy**; each item's talk may decide
otherwise (badges did — earned only, never sold, [[tasks/leaderboard-badges-talk]]).

**Q2 — what buying gives:** *"It will give a full-paid citizen, but each item will be more expensive than the item of
paid citizenship only."* ⇒ **every purchase makes the buyer a full paid citizen** (so no interstitial ads, `0248`), and
**every item costs more than paid citizenship alone — 249 Yan** (set by the owner in the Yandex console 2026-09-25; not
re-checked in the console). Working figure for one nickname style: *"something like 499 Yan"* (`0477`) — not final.

**Q3 — prices:** asked item by item, each in its own question round.

**Q4 — no new verification gate:** **"No, same as today (Recommended)"** — *"Same rule as existing perks. Small,
accepted faking risk; paying players never miss a perk."*

**The all-purchases rule (`0477` batch 1, answer 2):** *"we should have the same rules for ALL purchases: allowed to
all, gives paid citizenship, if it's a guest - we're asking to log in (ideally, after login we should make a seamless
transition to the purchase flow without additional popups or steps, if possible). This flow is worth additional
discussion with producer/architect/coder, to design it well from the go-start, because it will be reused for all
purchases."* In plain words, four rules for every purchase:

1. Anyone may buy — paid citizen, earned citizen, non-citizen, guest.
2. Buying makes the buyer a full paid citizen.
3. A guest logs in with Yandex first; there is no guest-only purchase.
4. After that login, the purchase continues with no extra popup or tap — *"if possible"*.

That flow was designed once as `0484` and built as B1–B4 — see [[systems/shared-purchase-flow]] and
[[decisions/adr-125-log-in-and-buy-skips-reload]].

## Consequences

- **A rewarded ad is not a purchase.** Nobody pays, so these rules do not apply to it
  ([[tasks/rewarded-video-double-match-xp]]).
- **Each new product needs its own server grant branch** (the `0019` R2 guard: the grant throws for any product it
  does not know). Since B1 the shared grant step writes paid citizenship for every product, so a branch cannot forget
  rule 2 ([[tasks/purchase-grant-registry]]).
- **Item ownership is private**, like paid status (spec OD-2): owning any item means the player paid.
- **With the citizenship kill switch off, nothing can be sold or reconciled** — confirmed by the owner's spec approval,
  2026-10-24 (*"'switch off = no sales'"*).
- **Two-tab double charge** is a named residual (same as citizenship today); refunds are manual.
- ⚠️ Free features are a separate track: the owner's direction for clans is that founding and joining are **free for
  all citizens**, with only extras sold ([[tasks/clans-talk]]).

## Related

- [[tasks/parked-paid-features-discussion]] — task `0343`, where Q1–Q5 were ruled
- [[tasks/nickname-styling-talk]] — task `0477`, where the all-purchases rule was given
- [[tasks/clans-talk]] — task `0479`
- [[tasks/leaderboard-badges-talk]] — task `0482`, the per-item exception (never sold)
- [[systems/shared-purchase-flow]] — the one flow every paid item uses
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — how rule 4 is met
- [[tasks/shared-purchase-flow-design]] — task `0484`
- [[tasks/paid-citizen-ad-free]] — task `0248`, the ad-free perk every buyer gets
- [[tasks/yandex-payments-implementation]] — task `0019`, its R2 guard
- [[decisions/product-strategy]] — the plan index these items came from
- [[decisions/sprint-9]] — the board that ran the talks
- [[systems/project-brief]] — `PROJECT.md`'s "any purchase grants citizenship", which Q2 makes *full paid*
- [[tasks/leaderboard-core-system-definition]] — task `0234`: the leaderboard badges wait on; rank value is earned per match, citizens only
