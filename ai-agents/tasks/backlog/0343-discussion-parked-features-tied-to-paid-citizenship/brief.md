# Discussion: eight parked features for Sprint 8 — paid-citizenship perks (paid map packs, nickname styling, map voting, premium replays, custom uploaded flags) and more (leaderboard rewards, coin economy, clans)

## ID
0343

## Sprint
Sprint 8

## Priority
6

> 📌 **2026-10-02 (later) — was 5, now 6.** Moved down one by the OWNER-RULED move of `0373` (read the
> stale-login data, choose the fix) to rank 2, directly below `0370`, on the [Sprint 8 board](../../../sprints/plan-sprint-8.md).
> OWNER RULING given live via `AskUserQuestion`, verbatim *"Move to rank 2 (Recommended)"*, relayed by `fkit-lead` to a
> spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Not a merit judgement on this task; nothing else
> about it changed. The note(s) below are kept as written (ADR-035).

> 📌 **2026-10-02 — was 4, now 5.** Moved down one by the placement of verify task `0370` (for `0367`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling, relayed by `fkit-lead` to a
> spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task
> changed. The note(s) below are kept as written (ADR-035).

> 📌 **2026-10-01 — was 3, now 4.** Moved down one by the placement of verify task `0363` (for `0356`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule, relayed by `fkit-lead` to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task changed. The
> note(s) below are kept as written (ADR-035).

> 📌 **2026-09-30 — was 2, now 3.** Moved down one by the placement of verify task `0358` (for `0355`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule, relayed by `fkit-lead` to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task changed. The notes
> below are kept as written (ADR-035).

> 📌 **2026-09-30 — was 1, now 2.** Moved down one by the OWNER-RULED placement of verify task `0351` at the top of
> Sprint 8 (relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037; ⛔ not producer precedent). Not a merit
> judgement; nothing else about this task changed. The note below is kept as written (ADR-035).

> Rank 1 because it is the **first and only row** on the new [Sprint 8 board](../../../sprints/plan-sprint-8.md),
> created 2026-09-29 to receive it. Not a merit judgement against anything else; the owner ranks Sprint 8.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's
words, as relayed: the 11 [Sprint 6](../../../sprints/done/plan-sprint-6.md) rows that have no brief are to be split
into separate briefs, and *"each brief should have a list of the things that should be discussed (not
implemented, but discussed)"*. The split test, delegated to the producer by the owner: *"is the task related to
the paid citizenship? If yes, put this brief into Sprint 8. If no — put it into Backlog."* End state: exactly
two briefs. **This is the "yes" brief.** The "no" brief is
[`0342`](../0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the
[Backlog board](../../../sprints/backlog.md).

📌 **2026-09-29, later — three more items moved IN, from `0342`.** **OWNER RULING given live in the `fkit lead` session on 2026-09-29 (ruling C)**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."* It overrules the producer's borderline "no" calls on those three. Leaderboard — Rewards Layer, Coin Economy + Rewarded Ads, and Clans are now items F, G, H below, with their dependencies, questions and verbatim prose (Appendices F–H). So this brief is **no longer citizenship-only**: items A–E are paid-citizenship perks; F–H are "more" by owner ruling. Nothing was duplicated: each item lives in exactly one brief. ⚠️ The folder name (`…-tied-to-paid-citizenship`) is now only partly accurate; it was **not** renamed, because the folder name carries the task's identity and inbound links (ADR-029).

**What this brief is.** A **discussion agenda**, not an implementation plan. Nothing here is to be built from
this brief. Its job is to get an owner decision on each item — *file real briefs for it*, *keep it parked (and
say what would bring it back)*, or *drop it* — and to keep every word of the original prose in one place so
nothing is lost. All eight items were plan-level ideas that never had a brief.

**Where the rows came from.** On Sprint 6 they were ranks 17 (Paid Campaign Map Packs), 19 (Nickname Styling),
22 (Map Voting), 23 (Replay Access), 24 (Custom Uploaded Flags & Patterns), and — by owner ruling C — 18 (Leaderboard
Rewards), 20 (Coin Economy), 21 (Clans). Those rows now read
`➡️ Moved to [Sprint 8](../../../sprints/plan-sprint-8.md) — priority 1` and point here. See the 2026-09-29
addendum under Sprint 6's status table.

**Why this matters now.** Citizenship went live with the Sprint 5 launch (closed 2026-09-26). Today it offers:
the ★ verified icon (`0068`), name change (`0067`), the personal inbox, private lobbies (`0302`), and — once
built — no interstitial ads for paid citizens (`0248`). Items A–E are the candidate **next** perks and
paid add-ons. They should be discussed together, because each one changes what "being a citizen" means and what
the explainer popup ([`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md)) promises.

### How the split was decided (producer's call — owner may overrule)

| Item | Tied to paid citizenship? | Why |
|---|---|---|
| Paid Campaign Map Packs | Yes — **borderline** | A separate paid product, **but** the prose says buying any pack grants citizenship, and suggests a free pack as a paid-citizen perk. |
| Nickname Styling System | Yes | An upsell only for players who already have the citizen ("verified") name. |
| Map Voting for Verified Players | Yes — **borderline** | Voting is limited to "verified" players = citizens. ⚠️ The prose does not say whether earned citizens count or only paid ones. |
| Replay Access as Premium Feature | Yes — **borderline** | The prose ties it to "Task 11's premium tier"; today the only premium tier is citizenship, and match archival is already citizen-gated (`0030`). |
| Custom Uploaded Flags & Patterns | Yes | Explicitly **paid citizens only**. |
| Leaderboard — Rewards Layer | No — **placed here by OWNER RULING C** (2026-09-29) | Producer first filed it in `0342` (badges are earned, never sold); the owner moved it here. |
| Coin Economy + Rewarded Ads | No — **placed here by OWNER RULING C** (2026-09-29) | Producer first filed it in `0342` (earned currency, not citizenship); the owner moved it here. |
| Clans | No — **placed here by OWNER RULING C** (2026-09-29) | Producer first filed it in `0342` (its paid parts are its own); the owner moved it here. |

## What to build

**Nothing is built from this brief.** "What to build" here is **one discussion with the owner**, item by item,
using the agenda below. For each item, record one outcome in `worklog.md` in this folder:

- **File** — write real brief(s) with `/fkit-task-brief` (decomposed, with `**Depends on:**` lines), and list
  their IDs here;
- **Park** — keep it, and write down what would bring it back;
- **Drop** — record the reason. (Items have no task folder of their own, so dropping one is a note here; if
  *every* item is dropped, close this brief with `/fkit-task-cancelled`.)

**Cross-cutting questions — discuss these first, they shape every item** (mostly A–E; F–H where they sell something):

1. **"Citizen" vs "paid citizen".** Citizenship has two paths, earned (XP) and paid. For each item: all citizens,
   paid citizens only, or a separate purchase on top?
2. **"Any purchase grants citizenship."** Still the rule for every new paid thing below (map packs, styles,
   uploads)?
3. **Prices.** The prose quotes rubles (49–399 ₽) from before launch; citizenship is now 249 Yan (owner changed it
   in the Yandex console, 2026-09-25). Re-price in Yan, consistently.
4. **Trusted identity.** Anything the *game server* must enforce (voting, uploads showing in matches, styled
   names) needs a player identity the server can trust. Today that waits on verified sessions
   ([`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md)) and the join token
   ([`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md), Sprint 7).
5. **Order.** Which one first? The producer's suggestion, for the owner to judge: the cheapest perk that works
   without new trust plumbing goes first.

---

### Item A — Paid Campaign Map Packs

⛔ **POSTPONED INDEFINITELY by OWNER RULING (2026-10-03).** OWNER RULING given live on 2026-10-03 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner's choice, verbatim: *"Keep it, mark A and D on hold"*. New-maps content is on hold with no restart date (the same day's ruling *"We wil postpone the new maps, don't know for how long …"*, which moved [`0027`](../0027-new-maps-community-demand/brief.md) to the Backlog board). This item stays in this brief and `0343` stays on Sprint 8 — row, rank and status unchanged — but item A is **not to be discussed or scoped** until the owner lifts the hold. The text below is kept as written.

**In plain words.** Themed map packs to buy (WW2 first). 1–2 maps per pack free, the rest unlocked by buying.
These are campaign maps (can be unfair / scripted on purpose), single-player or co-op — **not** part of normal
multiplayer.

**Full prose:** [Appendix A](#appendix-a--paid-campaign-map-packs-verbatim) below (verbatim). Source:
[`plan-sprint-6.md`](../../../sprints/done/plan-sprint-6.md) § *Task 2 — Paid Campaign Map Packs*, plus § *Notes*.

**Known dependencies / related work.** Meant to ship **after** free historical maps —
[`0342`](../0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) item C (Backlog board). Needs
the Yandex catalog (`0014`, done) and purchase flow (`0019`, done; `0303`, done). The demand tracker
[`0027`](../0027-new-maps-community-demand/brief.md) (~~Sprint 7~~ ➡️ Backlog board since 2026-10-03 — new-maps content postponed indefinitely by OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent. ~~Whether this item A moves too is an open owner question~~ ✅ answered 2026-10-03: it does **not** move — item A is **POSTPONED INDEFINITELY by OWNER RULING** inside this brief; see the ⛔ banner at the top of item A). The cosmetics chain on the
[Backlog board](../../../sprints/backlog.md) § *The cosmetics monetization chain* lists paid map packs at its end.

**To discuss:**
1. ⚠️ **Borderline call — check it.** Put here because a pack purchase grants citizenship. If the owner sees map
   packs as a separate product, move it to `0342`.
2. 🚨 **Biggest unknown:** does the game support campaign play at all — unfair starts, scripts, fixed factions,
   co-op? If not, this is a large new mode, and needs an investigation (architect) before any brief.
3. Should the free historical maps (`0342` item C) prove demand first, as the prose says? What result would say
   "go"?
4. Paid-citizen perk: *one free pack for paid citizens* — yes or no? The prose wanted this decided early.
5. The 1–2 free maps per pack — decide before any pack ships (sets player expectations).
6. Yandex content rules on WW2 / real-country themes (Yandex bans real-country flags/names).
7. Where is "owns pack X" stored — the profile server, not the upstream OpenFront API (`0009`)?

---

### Item B — Nickname Styling System

**In plain words.** Extra paid looks for a citizen's name: background colour, border, text colour. Sold one by one
or as a pack. Only for players who already have the citizen name.

**Full prose:** [Appendix B](#appendix-b--nickname-styling-system-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *8a. Nickname Styling System*.

**Known dependencies / related work.** The prose depends on "Task 8 — verified nickname purchase + centralized
name rendering". What exists today: the ★ icon (`0068`), name change for citizens (`0067`), and the approved name
shown in matches (`0317`'s follow-ups, done); the server-confirmed name mark
[`0323`](../0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) is on Sprint 7. The cosmetics chain
(`0010` flags, `0011` patterns, `0009`) is listed as its foundation on the Backlog board.

**To discuss:**
1. There is no separate "verified nickname purchase" today — the citizen name *is* it. So: styles for all
   citizens, paid citizens only, or bought separately?
2. Is there one shared name-rendering path now, used everywhere a name shows (in match, leaderboard, post-match,
   diplomacy)? The prose makes that a hard prerequisite. (Architect question when un-parked.)
3. The prose's renderer notes say "Pixi.js"; the game draws with Canvas 2D (CLAUDE.md). The "custom fonts are
   hard" reasoning needs re-checking — it does not change the V1 scope (colours and border only).
4. Readability is a hard rule; who approves each style? The ★ icon and leaderboard badges must stay visible.
5. Does a style show to other players before the game server can trust the identity (`0340` / `0332`)?
6. A/B test through Yandex (the prose allows it) or ship to all?

---

### Item C — Map Voting for Verified Players

**In plain words.** Public maps alternate: random, then voted, then random… While a random map plays, citizens vote
for the next one. Most votes wins; ties are random; recently played maps are on cooldown. Non-citizens see the vote
but cannot vote (an advert for citizenship).

**Full prose:** [Appendix C](#appendix-c--map-voting-for-verified-players-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *14. Map Voting for Verified Players*.

**Known dependencies / related work.** The server must know who is a citizen **when the vote is cast** — so it waits
on trusted identity: [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) and
[`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md). Public
lobbies and their maps are scheduled by the server master process.

**To discuss:**
1. ⚠️ **Borderline call — check it.** "Verified" in the prose = citizen. Earned citizens too, or paid only?
2. Is it worth it at current player numbers — how many citizens are in a typical public lobby to vote?
3. Must voting wait for `0340` + `0332`, or is an unverified vote acceptable at first (low stakes: a map choice)?
4. The locked vote button for non-citizens — should it open the citizenship popup (`0301`), like private lobbies
   (`0302`)?
5. Cooldown N — the developer proposes; the owner approves.
6. A/B test through Yandex (the prose allows it) or ship to all?

---

### Item D — Replay Access as a Premium Feature

⛔ **POSTPONED INDEFINITELY by OWNER RULING (2026-10-03).** OWNER RULING given live on 2026-10-03 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner's choice, verbatim: *"Keep it, mark A and D on hold"*. Match archiving is on hold with no restart date (the same day's ruling *"we will pospone the Archive Matches tasks, move the tasks related to it to the backlog."*, which moved [`0030`](../0030-archive-s3-backed-citizen-gated/brief.md) to the Backlog board). This item stays in this brief and `0343` stays on Sprint 8 — row, rank and status unchanged — but item D is **not to be discussed or scoped** until the owner lifts the hold. The text below is kept as written.

**In plain words.** Free players keep their last 3 match replays; premium players keep 20+ and can share replay
links.

**Full prose:** [Appendix D](#appendix-d--replay-access-as-premium-feature-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *13. Replay Access as Premium Feature*.

**Known dependencies / related work.** Closely tied to S3 match archival, already citizen-gated:
[`0030`](../0030-archive-s3-backed-citizen-gated/brief.md) (~~Sprint 7~~ ➡️ Backlog board since 2026-10-03 — match archiving postponed indefinitely by OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent. ~~Whether this item D moves too is an open owner question~~ ✅ answered 2026-10-03: it does **not** move — item D is **POSTPONED INDEFINITELY by OWNER RULING** inside this brief; see the ⛔ banner at the top of item D), and
[`0292`](../0292-client-archive-read-bypasses-archive-enabled-flag/brief.md). The prose makes it wait on "Task 11's
premium tier" — Task 11 is the coin economy, **item G of this brief** (moved here from `0342` by owner ruling C).

**To discuss:**
1. ⚠️ **Borderline call — check it.** Put here reading "premium tier" = citizenship. If the owner means a coin-based
   tier, it belongs with the coin economy — which is item G of this same brief since owner ruling C.
2. If citizenship is the tier, drop the wait on the coin economy?
3. Is this really a separate task from `0030` (archival, citizen-gated), or the same work seen from the player's side?
4. All citizens, or paid citizens only? Numbers (3 free / 20+ premium) — keep?
5. Shareable replay links — who can open them (anyone, logged-in, citizens)? Any privacy concern with player names
   in shared replays?

---

### Item E — Custom Uploaded Flags & Patterns (paid citizens only)

**In plain words.** A paid citizen uploads their own flag (or territory pattern) image. It is checked by a person
(or a service) before it ever appears in a match. Expensive on purpose; flags first.

**Full prose:** [Appendix E](#appendix-e--custom-uploaded-flags--patterns-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *15. Custom Uploaded Flags & Patterns — Paid
Citizens Only*.

**Known dependencies / related work.** Needs flags [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md)
and patterns [`0011`](../0011-re-enable-territory-patterns/brief.md) live first — both **blocked** — and behind
them [`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md). The personal inbox (8d) exists and the
name-change review flow (`0067`, `0283`, `0312`–`0315`) is a working model for a review queue.

**To discuss:**
1. 🚨 **Flags must be non-country** (Yandex bans real-country flags/names). A player upload could be a real country
   flag — moderation must reject those. Write that rule down before anything else.
2. Moderation: manual review (like name changes) or an automatic screening service? ⚠️ The prose's examples (AWS,
   Google) are foreign services — sending player images abroad raises Russian data-law (152-FZ) and reachability
   questions. Manual first?
3. Refund policy for a rejected upload — must be decided before launch (the prose says so). Can Yandex payments
   refund at all?
4. Storage: S3 — which bucket, and how is it backed up?
5. Flags first or patterns first (the prose recommends flags)?
6. Is it realistic while `0010` / `0011` / `0009` are still blocked? Probably park until they move.

---

### Item F — Leaderboard — Rewards Layer

**In plain words.** Badges for top leaderboard players: a small icon next to top-10 names in every match, and a
permanent "Month — Top 3" badge collectors keep forever.

📌 **On this brief by OWNER RULING 2026-09-29 (ruling C)**, which overrules the producer's first call (Backlog board, brief `0342`: badges are earned, never sold). Not a paid-citizenship item by the original test — see *Context*.

**Full prose:** [Appendix F](#appendix-f--leaderboard-rewards-layer-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *10. Leaderboard — Rewards Layer*.

**Known dependencies / related work.** 🚨 **Needs the core leaderboard (Task 7) first, and that does not exist
yet** — only a definition investigation is filed:
[`0234`](../0234-leaderboard-core-system-definition/brief.md) (Backlog). Also
[`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) (Backlog). Badge display must go
through the one shared name-rendering path (the prose's "Task 8" component; the citizen ★ icon, `0068`, is the
nearest thing today).

**To discuss:**
1. Is this a real item at all before `0234` defines the core leaderboard? Probably: park until `0234` lands.
2. Is there one shared name-rendering component today that badges could plug into? (A technical question for the
   architect when this is un-parked.)
3. Confirm the rule: badges are earned only — never sold, never bought with coins.
4. Reward tiers and visuals: the prose's suggested tiers — keep them? Who designs the badges?
5. Experiment through Yandex A/B as the prose says, or ship to all?

---

### Item G — Coin Economy + Rewarded Ads (full version)

**In plain words.** An in-game currency: earn coins after matches (more for playing well), double them by watching
an ad, spend them on some cosmetics. Other cosmetics stay money-only.

📌 **On this brief by OWNER RULING 2026-09-29 (ruling C)**, which overrules the producer's first call (Backlog board, brief `0342`: coins are earned by play, not bought as citizenship). Not a paid-citizenship item by the original test — see *Context*.

**Full prose:** [Appendix G](#appendix-g--coin-economy--rewarded-ads-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *11. Coin Economy + Rewarded Ads Full
Version*.

**Known dependencies / related work.** The minimal rewarded-ads step (Task 6) has no brief and sits on the older
board [`sprint-backlog.md`](../../../sprints/sprint-backlog.md) § *Task 6*. The cosmetics it would sell are flags
[`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md) and patterns
[`0011`](../0011-re-enable-territory-patterns/brief.md) — both **blocked**, and behind them
[`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md) (cosmetic entitlements come from the
upstream OpenFront API today). ⚠️ Item D of this brief (premium replays) says it needs "Task 11's tier" — see question 4.

**To discuss:**
1. Now that it sits with the citizenship perks (ruling C): should coins connect to citizenship at all — e.g. a
   coin bonus for citizens, or coin-buyable perks? (The prose forbids coins buying earned/purchased marks.)
2. Is the minimal rewarded-ad (Task 6) still a separate step, or does it fold into this?
3. Which cosmetics are coin-earnable, which money-only? Earn/spend rates — the prose warns they are very hard to
   change later.
4. Does citizenship now play the role the prose calls "the premium account / tier"? If yes, item D no
   longer waits on this item.
5. Is anything bought with coins a "purchase" under the "any purchase = citizenship" rule? (Presumably no — real
   money only — but say it.)
6. This is weeks of work with no experiment allowed. Is it wanted at all at current player numbers?

---

### Item H — Clans

**In plain words.** Player groups: a free clan tag, clan members auto-placed on the same team in Team matches,
plus paid extras (clan banner, stats page, match history together) and a small founding fee.

📌 **On this brief by OWNER RULING 2026-09-29 (ruling C)**, which overrules the producer's first call (Backlog board, brief `0342`: its paid parts are its own, not citizenship). Not a paid-citizenship item by the original test — see *Context*.

**Full prose:** [Appendix H](#appendix-h--clans-verbatim) below (verbatim). Source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *12. Clans*.

**Known dependencies / related work.** A basic clan system **already exists**: a `[TAG]` in the display name
keeps members on the same team in team modes — no backend, no UI. Findings:
[`0152`](../../done/0152-investigate-clans-system/brief.md) (done) and the wiki page
`ai-agents/wiki-vault/wiki/systems/clans.md`. The prose gates it on lobby health.

**To discuss:**
1. Now that it sits with the citizenship perks (ruling C): should any clan feature be a citizen perk (e.g. free
   clan founding for citizens), or do clans stay a separate paid product?
2. Lobby health gate: what numbers show lobbies are "consistently filling"? Do we have them today?
3. Build on the existing name-tag system, or a real registered clan (backend, ownership, invites)?
4. A registered clan needs a trusted player identity — does it wait on verified sessions
   ([`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md))?
5. Clan names/tags need the same safety rules as player names (`0307`, `0308`) and possibly moderation.
6. Paid clan features — prices in rubles or Yan, and do they go through the same Yandex catalog / purchase flow?

## Verification steps

1. The cross-cutting questions 1–5 each have a **dated owner answer** in this folder's `worklog.md`.
2. Every item A–H has **one recorded outcome** (File / Park / Drop), dated, with the owner's words where the owner
   ruled.
3. Every "To discuss" question is either **answered** (owner, dated) or **explicitly carried** into a follow-up
   brief — none silently dropped.
4. Every "File" outcome has its follow-up brief(s) filed with `/fkit-task-brief`, each with canonical
   `**Depends on:**` / `**Blocks:**` lines, and their IDs listed in the worklog. Any item whose shape is unknown
   (e.g. item A's campaign mode) gets an **investigation** brief first, not an implementation brief.
5. Every "Park" outcome states what would bring it back.
6. The appendices are still present and every source link resolves (nothing lost).
7. Closed only with `/fkit-task-done` by the producer after 1–6.

## Notes

- **Depends on:** nothing (it is a discussion). Individual items have their own prerequisites — see each item.
- **Blocks:** nothing directly. ⚠️ Cross-board ordering: item A (paid map packs) is meant to ship **after**
  [`0342`](../0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) item C (free historical maps).
- **Related:** [`0342`](../0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) (the twin),
  [`0301`](../0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (what the popup promises),
  [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md),
  [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md),
  [`0030`](../0030-archive-s3-backed-citizen-gated/brief.md),
  [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md),
  [`0011`](../0011-re-enable-territory-patterns/brief.md),
  [`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md),
  [`0234`](../0234-leaderboard-core-system-definition/brief.md),
  [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md),
  [`0152`](../../done/0152-investigate-clans-system/brief.md).
- **Why one brief and not eight:** by owner ruling (exactly two briefs). Each item is expected to split into its own
  briefs if and when it is filed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendices — the source prose, copied verbatim 2026-09-29

> Copied so nothing is lost. **Text is verbatim; only heading levels were changed** (to `####`) so they do not
> collide with this brief's own sections. Relative links inside the copies were written for their original files
> and may not resolve from here — use the source links above. The sources themselves were not changed, except
> for dated pointer notes.

### Appendix A — Paid Campaign Map Packs (verbatim)

*Source: `ai-agents/sprints/plan-sprint-6.md` § Task 2, § Notes (the Notes also appear in `0342` Appendix C)*

#### Task 2 — Paid Campaign Map Packs

**Ships after Task 1 and after Sprint 4/5 payment infrastructure is live.**

Thematic map packs available for purchase. Initial pack: WW2 (most requested). Each pack includes multiple maps with historical context.

**Pricing model:**
- 1–2 maps from each pack available free (same model as citizenship earned path — give players a taste)
- Full pack purchase unlocks remaining maps
- Price TBD — likely 149–199 rubles per pack (consistent with cosmetics pricing from Sprint 4)
- Purchasing any map pack automatically grants citizenship (consistent with "any purchase = citizenship" rule)

**Citizenship integration:** paid citizens could receive one free map pack as a perk — adds tangible content value to citizenship beyond cosmetics. Worth deciding in Sprint 4 whether to promise this before Sprint 6 ships.

**Campaign vs multiplayer distinction:** campaign maps in paid packs can have asymmetric starts, scripted elements, and historical accuracy that would break multiplayer balance. These are singleplayer/co-op experiences, not additions to the multiplayer rotation. Task 1 (multiplayer maps) and Task 2 (campaign packs) are separate products.


#### Notes

- Brief writing deferred until Sprint 5 is underway — too early to scope in detail now
  - 📌 **2026-09-26 — owner ruling: write them AFTER THE LAUNCH** (*"After the launch (Recommended)"*), not
    merely once Sprint 5 has started. See the 2026-09-26 follow-up addendum under the status table.
- Map creation is a content production task, not just engineering — timeline will depend on map design effort, not just code
- The "1–2 free maps per pack" split should be decided before any paid pack ships — sets player expectations early
- ~~Sprint 5 cosmetics store UI may be reusable for the map pack store~~ — **corrected 2026-08-09: there is no cosmetics store.** Whatever purchase UI ships with Tasks 9/9a (flags, territory patterns) is the reusable surface; flag it to the coder when Sprint 6 briefs are written


### Appendix B — Nickname Styling System (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 8a*

#### 8a. Nickname Styling System

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 4 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — styling options are purely additive and only visible to players who have already purchased a verified nickname. Players not in the experiment group simply don't see the styling purchase options. Success metric: upsell conversion rate among verified nickname owners.

**Depends on:** Task 8 (verified nickname purchase and centralized name rendering component must exist first)

Once players can purchase a verified nickname (Task 8), offer additional purchasable visual styles for how their nickname is displayed. This gives players who are already bought in a natural upgrade path and increases ARPU from motivated buyers.

**V1 styling options (recommended scope):**
- **Nickname background color:** a colored fill behind the nickname text
- **Nickname border:** a decorative border around the nickname display area
- **Nickname text color:** a custom color applied to the nickname letters themselves

**Pricing model:** style options are sold separately from the nickname purchase, either individually (49–99 rubles each) or as a bundled "nickname style pack" (149–199 rubles). A player who has not purchased a verified nickname (Task 8) cannot purchase styles — styles are an upsell, not a standalone product.

**Display scope:** styled nicknames must render correctly in all the same places as the verification mark — in-match above territory, on the leaderboard, in the post-match summary, and in the diplomacy UI. This is why the centralized name rendering component from Task 8 is a hard prerequisite.

**Important constraints:**
- Readability is a hard requirement. Any style option that makes the nickname difficult to read during a match must be rejected, regardless of how visually interesting it is. The game map is a busy background and nicknames must remain legible at a glance.
- The verification mark introduced in Task 8 must remain visible and unobscured by any styling option.
- Leaderboard badge icons from Task 10 must also remain visible alongside styled nicknames.

**Explicitly out of scope for V1:**
- Custom fonts: technically complex in a Pixi.js canvas renderer and introduce font loading overhead. Revisit only after V1 styling is validated.
- Text pattern fills (gradient or texture on letter shapes): high readability risk and significant rendering complexity. Not recommended until simpler options are proven to sell.


### Appendix C — Map Voting for Verified Players (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 14*

#### 14. Map Voting for Verified Players

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 7 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 1–2 weeks
**Experiments:** ✅ Test via Yandex experiments API — map voting UI is additive and only visible to verified players. Non-verified players and the control group see no change. Success metric: voting participation rate among verified players, and whether sessions containing a voted map show higher match completion rates than sessions with random maps only.

**Depends on:** Task 8 (Verified Player tier must exist — voting is gated to verified players only)

**The mechanic:**

Maps alternate in a fixed sequence: **random map → voted map → random map → voted map**, repeating indefinitely. While a random map is being played, verified players can cast their vote for what the next voted map will be. By the time the random map ends, the vote is settled and the winning map plays immediately after. Then while the voted map runs, the next random map is already queued, and voting opens again for the one after.

This means:
- There is always an active vote in progress
- Voting happens during dead time — players are in a match, not staring at a vote screen
- Half of all maps are always random, regardless of votes — the game never feels fully controlled by a small verified group
- Verified players always know their vote will be acted on

**Winner selection rules:**
- The map with the most votes wins
- On any tie — including the case where every eligible map has zero votes — the winner is chosen randomly among all tied maps
- This means even a single vote is decisive if no other map matches it. A verified player's vote always matters. There is no fallback to "fully random" — zero votes across all maps is simply a tie among all of them, resolved randomly

**Map eligibility and cooldown:**
- All maps are eligible for voting by default
- Any map played in the last N cycles (random or voted) is placed on cooldown and excluded from the vote pool until the cooldown expires. The developer should propose a sensible N based on the total number of available maps — the goal is to prevent the same popular maps from dominating every vote while still allowing them to recur over a reasonable time window

**Where voting appears:**
- A small voting panel visible to verified players during the spawn phase and early match phase of random maps
- Shows the eligible maps with current vote counts
- Non-verified players can see the vote panel and current standings but cannot cast a vote — this makes the verified tier visibly meaningful to players who haven't purchased it yet

**What "done" looks like:**
- The random/voted alternation sequence is running in production
- Verified players can cast one vote per voting cycle
- Vote results are correctly determining the next voted map
- Tiebreaking is random among tied maps
- Recently played maps are excluded from the pool via cooldown
- Non-verified players can see the vote panel but the vote button is disabled with a clear explanation

**Architectural note:** the voting system needs to know which players are verified. This relies on the verified player status introduced in Task 8. Coordinate with Task 8's data model to ensure verified status is queryable server-side at the time votes are cast.


### Appendix D — Replay Access as Premium Feature (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 13*

#### 13. Replay Access as Premium Feature

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 8 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 3–5 days
**Experiments:** ❌ Excluded — depends on Task 11's tier and pricing system. Introducing two parallel pricing models during an experiment creates fairness and support issues. Ship alongside or after Task 11.

The replay system is fully built. Extended replay history is a natural premium feature for competitive players.

Design:
- Free tier: last 3 matches
- Premium tier: last 20+ matches, shareable replay links
- Requires the premium account / tier concept from Task 11 to be defined first


### Appendix E — Custom Uploaded Flags & Patterns (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 15*

#### 15. Custom Uploaded Flags & Patterns — Paid Citizens Only

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 9 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 2–3 weeks
**Experiments:** ❌ Excluded — paid feature with moderation overhead; running two parallel pricing models creates fairness and support complexity.

**Depends on:** Tasks 9 and 9a (existing flags and patterns must be live first to establish cosmetic purchase baseline), Task 8 (citizenship and payment infrastructure)

Paid citizens can upload their own custom flag or territory pattern, making their in-match appearance completely unique. This is the highest tier of visual customization — no other player can have the same look.

**Why paid-citizen only:** custom uploads require manual moderation before appearing in matches. The moderation cost per submission only makes sense for players who have already demonstrated financial commitment. Earned citizens are not eligible.

**Moderation is the critical design decision — choose one approach before implementation begins:**

- **Manual review** (same queue as nickname changes): safe, no third-party dependency, but creates operational burden at scale. Acceptable for V1 at current player counts.
- **Automated content screening API** (e.g. AWS Rekognition, Google Vision SafeSearch): scales better, adds cost (~$1–2 per 1,000 images) and integration work. Recommended if upload volume grows.

Either way: uploaded images must not appear in any match until they have passed review. A player submits their image, sees a "pending review" status, and receives a personal inbox notification (Task 8d) when it is approved or rejected.

**Yandex platform rules:** images must comply with Yandex Games content policies. Rejection reasons must be communicated clearly. Refund policy for rejected uploads must be defined before launch.

**Pricing:** 199–399 rubles per custom upload. Higher price than standard cosmetics — signals exclusivity and offsets moderation cost. The price also naturally limits submission volume, which keeps the manual review queue manageable.

**Technical scope:**
- Image upload endpoint with file size and format validation (PNG/JPG, max dimensions, reasonable file size cap)
- S3 storage for uploaded images
- Admin moderation queue (approve/reject with reason, automatic player notification via Task 8d inbox)
- Integration with existing cosmetics rendering — uploaded patterns need to fit within the existing `PatternDecoder` pipeline or a new rendering path
- The uploaded image must tile or fit correctly as a territory pattern — provide clear upload guidelines to players (recommended dimensions, aspect ratio, how it will appear on territory)

**Scope for V1:** custom flags only, or custom patterns only — do not attempt both simultaneously. Flags are simpler (small icon, less rendering complexity). Patterns are more visually impactful but more technically involved. Recommend starting with flags.


### Appendix F — Leaderboard Rewards Layer (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 10*

#### 10. Leaderboard — Rewards Layer

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 3 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 3–5 days
**Experiments:** ✅ Test via Yandex experiments API — badges and rank icons are additive display elements. Players not in the experiment group see the leaderboard without badges. Success metric: return visit rate and match frequency for top-ranked players in the experiment group vs control.

Once the core leaderboard system (Task 7) is live and players are engaging with it, add a reward layer that gives top finishers visible recognition.

**Top 10 badge:** players ranked in the top 10 on either the global or monthly leaderboard get a visible icon next to their nickname in every match they play. This is social proof — other players see the badge mid-game, which signals that the leaderboard is real and worth competing for.

**Collectible period rewards:** players who finish in the top 3 of a monthly leaderboard receive a special badge for that month (e.g. "June 2025 — Top 3") that they keep permanently, even after the monthly reset. This creates collectible prestige — veterans accumulate badges from multiple months, which is a visible signal of long-term dedication. Critically, the reward does not disappear when the player loses the rank — it marks the achievement forever.

**Reward tiers (suggested):**
- Global top 3: permanent special icon, distinct from monthly rewards
- Monthly top 3: collectible monthly badge, kept permanently
- Global / monthly top 4–10: smaller icon, refreshed based on current rank

The exact visual design of badges and icons is a separate design task. The developer should implement the data model and display logic; assets can be placeholders initially.

**Architectural note:** all badge and icon display must go through the centralized name rendering component introduced in Task 8. Do not implement badge display as a separate ad-hoc solution.


### Appendix G — Coin Economy + Rewarded Ads (verbatim)

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


### Appendix H — Clans (verbatim)

*Source: `ai-agents/sprints/done/plan-sprint-5.md` § 12*

#### 12. Clans

> ➡️ **Row moved to [Sprint 6](../plan-sprint-6.md) on 2026-09-26 — priority 6 there** (owner ruling; see the 2026-09-26 addendum under the status table). No brief exists yet; this section stays here as the task's only prose and is not copied.
**Effort:** 3–4 weeks
**Experiments:** ✅ Test via Yandex experiments API — clan creation, clan tags, and auto-team placement are additive. Players not in the experiment group see no clan-related UI. Success metric: session frequency and match completion rate for clan members vs non-clan players.

The highest long-term retention upside, but requires healthy lobby fill to feel meaningful. If the auto-team placement mechanic rarely triggers because clan members can't find each other in matches, the feature will feel broken.

Design:
- Free clan creation (tag only) + auto-team placement in Team mode matches as the core mechanic
- Paid clan features: clan banner (custom territory color/pattern in team matches), clan stats page, match history together
- Small clan founding fee (99–149 rubles) to filter throwaway clans

Gate this on lobby health: only build clans when analytics shows lobbies are consistently filling and match completion rates are strong.
