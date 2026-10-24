# Discussion: leaderboard rewards (badges) — earned only or sold, and File / Park / Drop

## ID
0482

## Sprint
Sprint 9

## Priority
16

> Rank 16 = **append rank in the OWNER-RULED talk order** (ruling 2 *"Added after current rows, in the talk order"*;
> ruling 4 *"Nickname styles (Recommended)"* — *"Then voting, clans, coins, own flags, badges. Blocked items last."*).
> Appended after the board's highest rank, never inserted (ADR-035); no row renumbered. Directly below `0481`; last
> of the six, among the "blocked items last".

## Status
✅ Done (agent-closed — not owner-verified)

📌 **2026-10-24 — was ~~🔲 Backlog~~, now `🔄 In progress`** — the talk has started, last in the owner's talk order (`0477` closed File, `0478` and `0480` on hold, `0479` closed Park, `0481` moved to the Backlog board waiting on `0010`/`0011`). OWNER RULINGS, live `AskUserQuestion` in the lead session 2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"All six on Sprint 9 (Recommended)"** (*"The loop keeps offering the next talk"*) and talk order **"Nickname styles (Recommended)"** (*"Then voting, clans, coins, own flags, badges. Blocked items last."*). Status edit only: no move, no rank change.

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
[`0343`](../0343-discussion-parked-features-tied-to-paid-citizenship/brief.md), which carried all eight parked items.

**Item F of `0343` — Leaderboard — Rewards Layer.** In plain words: badges for top leaderboard players — a small icon
next to top-10 names in every match, and a permanent "Month — Top 3" badge collectors keep forever. It sits with the
citizenship items by owner ruling C (2026-09-29), not because it is a citizenship perk.

**Full prose:** [Appendix — Leaderboard Rewards Layer (verbatim)](#appendix--leaderboard-rewards-layer-verbatim)
below, copied from `0343` Appendix F. Original source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *10. Leaderboard — Rewards Layer*. `0343`'s own
item F section: [here](../0343-discussion-parked-features-tied-to-paid-citizenship/brief.md#item-f--leaderboard--rewards-layer).

### Standing owner rulings that bind this talk

OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24, relayed by `fkit-lead`
(driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037);
⛔ not producer precedent. Full verbatim text: [`0343`'s worklog](../0343-discussion-parked-features-tied-to-paid-citizenship/worklog.md).
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
nickname styles ([`0477`](../0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md)),
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
filed yet** (owner placement pending, 2026-10-24).

**What this settles here.** **S1 — "who may buy":** if anything here is sold, anyone may buy it, and a
guest logs in first. **S1 — "is anything sold"**, and the conflict *"earned only, never sold"* vs Q1, **stay
open**. **The guest flag** under *"Context for the future build task"* is answered on the product side: a guest
logs in first; the seamless continue after login stays open, for the shared flow's design task. Nothing below is
deleted.

### Already settled — do not re-ask (each by its source)

- **Verified logins are live.** [`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
  closed 2026-10-07 with the owner's live check `vfy: true`. The trusted-identity work the old agendas waited on,
  [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) and
  [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md), is done.
- **Most players with a Yandex id start a match verified.**
  [`0405`](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md)
  closed 2026-10-10: **95.3 %** (5,676 / 5,958) of match starts by players **with a Yandex id** were verified,
  2026-10-08 → 2026-10-10. ⚠️ Guests are outside that share: they were 58.2 % of all match starts in the same window.
- **ADR-124's per-use rulings** ([ADR-124](../../../knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md),
  accepted 2026-10-07): Q2 XP stays open to unverified players · Q3 the ★ stays for unverified citizens · Q4 private
  lobbies stay open to unverified citizens · Q5 the approved name shows for unconfirmed players too · Q7 a missing
  `verified` bit reads as **unverified** — the rule for any future enforcement.
- **"Any purchase grants citizenship"** — [`PROJECT.md`](../../../knowledge-base/PROJECT.md) line 37; Q2 above makes
  it *full paid* citizenship.
- **Who gets today's perks (Q1 precedents).** All citizens, earned or paid: the ★ icon
  ([`0068`](../0068-citizen-verified-icon/brief.md)), name change
  ([`0067`](../0067-name-change-citizens-only/brief.md)), private lobbies
  ([`0302`](../0302-private-lobby-as-a-locked-citizen-perk/brief.md), owner ruling *"Earned or paid"*). Paid
  citizens only: no interstitial ads ([`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  gate `is_paid_citizen`), shown under its own paid-only sub-heading in the explainer popup
  ([`0408`](../0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md)).
- **The game draws with Canvas 2D**, not Pixi.js (`CLAUDE.md` § *Rendering*; `src/client/graphics/GameRenderer.ts`
  takes a `2d` context; Pixi appears in 2 of the 43 layer files). Any "Pixi" claim in the old prose is stale.

### Context for the future build task — not a dependency of this talk

- **Every new product needs its own grant code.** [`0019`](../0019-yandex-payments-impl/brief.md) review R2,
  owner ruling 2026-08-14 *"guard now"*: the profile server's paid-purchase grant refuses any product other than
  citizenship and throws. A new paid item therefore needs its own grant branch — and under Q2 that branch must also
  make the buyer a full paid citizen.
- ⚠️ **Not verified: can a guest buy?** Q1 names guests as possible buyers. Citizenship lives on a profile keyed by a
  Yandex id, and whether a Yandex Games purchase works without a logged-in player was not checked. An architect
  question for the build, raised here so the talk does not promise something that cannot ship.

### Known technical blockers — context for the future build task, not `Depends on:` of this talk

- 🚧 **Waits on `0234`.** The core leaderboard does not exist yet; only its definition investigation is filed:
  [`0234`](../../backlog/0234-leaderboard-core-system-definition/brief.md) (~~Backlog board~~ **Sprint 9, rank 19, since 2026-10-24** — owner ruling in this talk, see the [worklog](worklog.md)). Also
  [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) (Backlog board). Any build brief this
  talk files must carry `0234` as its `Depends on:`; this talk does not wait on it.
- Badge display must go through one shared name-drawing path (the prose's "Task 8" component; the citizen ★ icon,
  `0068`, is the nearest thing today). Whether one path draws every name was **not checked** — question 2 below.

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**, with its own question round (Q3).
Record the answers and the outcome in this folder's `worklog.md`.

### Standing questions for this round (from the rulings above)

- **S1 — Is anything here sold?** Q1's default is *a paid option for everybody*; the prose says badges are earned
  only (see Conflicts). If something is sold (e.g. a cosmetic frame for an earned badge), who may buy it?
- **S2 — Price** (Q3), **above 249 Yan** (Q2), only if something is sold. If badges stay earned-only, say that Q2 and
  Q3 do not apply.

### Conflicts this talk must settle

- **"Earned only, never sold"** — `0343` question 3, and the coin prose (*"leaderboard badges and rank icons … must
  not be purchasable"*) — vs **Q1** (*"Most of the things … will be a paid option for everybody"*). Which wins for
  badges?

### To discuss — `0343` item F's full list, carried here

1. Is this a real item at all before `0234` defines the core leaderboard? Probably: park until `0234` lands.
2. Is there one shared name-rendering component today that badges could plug into? (A technical question for the
   architect when this is un-parked.)
3. Confirm the rule: badges are earned only — never sold, never bought with coins. *(See Conflicts.)*
4. Reward tiers and visuals: the prose's suggested tiers — keep them? Who designs the badges?
5. Experiment through Yandex A/B as the prose says, or ship to all?

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
- **Split from:** [`0343`](../0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) item F, by owner
  ruling 1 (2026-10-24). The other five talks: `0477` (nickname styling), `0478` (map voting), `0479` (clans), `0480`
  (coin economy), `0481` (custom uploaded flags). Order is the owner's (ruling 4); none waits on another.
- **Related:** [`0234`](../../backlog/0234-leaderboard-core-system-definition/brief.md),
  [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md),
  [`0068`](../0068-citizen-verified-icon/brief.md), `0480` (coin economy — the no-coins-for-badges rule).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendix — Leaderboard Rewards Layer (verbatim)

> Copied 2026-10-24 from `0343` Appendix F, which copied it verbatim on 2026-09-29. **Text is verbatim; only heading
> levels were changed.** Relative links inside the copy were written for the original file and may not resolve from
> here — use the source link above.

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
