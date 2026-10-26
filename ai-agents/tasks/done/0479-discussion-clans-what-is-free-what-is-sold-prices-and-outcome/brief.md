# Discussion: clans — what is free, what is sold and to whom, the prices, and File / Park / Drop

## ID
0479

## Sprint
Sprint 9

## Priority
13

> Rank 13 = **append rank in the OWNER-RULED talk order** (ruling 2 *"Added after current rows, in the talk order"*;
> ruling 4 *"Nickname styles (Recommended)"* — *"Then voting, clans, coins, own flags, badges. Blocked items last."*).
> Appended after the board's highest rank, never inserted (ADR-035); no row renumbered. Directly below `0478`.

## Status
✅ Done (agent-closed — not owner-verified)

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

**Item H of `0343` — Clans.** In plain words: player groups — a free clan tag, clan members auto-placed on the same
team in Team matches, plus paid extras (clan banner, stats page, match history together) and a small founding fee.
It sits with the citizenship items by owner ruling C (2026-09-29), not because it is a citizenship perk.

**Full prose:** [Appendix — Clans (verbatim)](#appendix--clans-verbatim) below, copied from `0343` Appendix H.
Original source: [`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *12. Clans*. `0343`'s own item H
section: [here](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md#item-h--clans).

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

**What this settles here.** **S1 settled:** the paid clan parts may be bought by anyone, and a guest logs
in first. **The guest flag** under *"Context for the future build task"* is answered on the product side: a guest
logs in first; the seamless continue after login stays open, for the shared flow's design task. **To-discuss 6,
"same … purchase flow?"** — the ruling says one set of rules and one shared flow for all purchases, so *yes* on
the product side; the Yandex-catalog part stays open. The founding-fee conflict and S2 (prices) **stay open**.
Nothing below is deleted.

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

- **A basic clan system already exists:** a `[TAG]` (2–5 letters or digits) in the display name keeps members on the
  same team in team modes — no backend, no UI. Findings:
  [`0152`](../../done/0152-investigate-clans-system/brief.md) and the wiki page
  `ai-agents/wiki-vault/wiki/systems/clans.md`. A *registered* clan (ownership, invites, a founding fee) is new
  backend work whose shape is unknown — an investigation first if filed.
- The prose gates the whole item on **lobby health** (*"only build clans when analytics shows lobbies are consistently
  filling"*).

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**, with its own question round (Q3).
Record the answers and the outcome in this folder's `worklog.md`.

### Standing questions for this round (from the rulings above)

- **S1 — Who may buy the paid clan parts** (founding fee, banner, stats page, match history together)? Q1's default
  is everybody.
- **S2 — Prices** (Q3), each **above 249 Yan** (Q2). ⚠️ The old founding fee — 99–149 ₽ — is **below that floor**, and
  the prose's reason for it was *"a small fee to filter throwaway clans"*, which a 249+ Yan price changes. (Rubles from
  before launch; the Yan/ruble ratio was not checked.)

### Conflicts this talk must settle

- **The free clan tag** (prose: *"Free clan creation (tag only)"*; and today's `[TAG]` system is free) vs **Q1** (most
  items are a paid option). Does the tag stay free, with only the extras sold?
- **Does a small founding fee still make sense** when Q2 says any purchase costs more than paid citizenship and makes
  the buyer a full paid citizen? (S2.)

### To discuss — `0343` item H's full list, carried here

1. Now that it sits with the citizenship perks (ruling C): should any clan feature be a citizen perk (e.g. free
   clan founding for citizens), or do clans stay a separate paid product? *(Now framed by Q1/Q2 — see S1, S2.)*
2. Lobby health gate: what numbers show lobbies are "consistently filling"? Do we have them today?
3. Build on the existing name-tag system, or a real registered clan (backend, ownership, invites)?
4. A registered clan needs a trusted player identity — does it wait on verified sessions
   ([`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md))?
   *(**Settled:** `0340` is done and verified logins are live (`0395`, `0405`); Q4 adds no new verification gate.)*
5. Clan names/tags need the same safety rules as player names (`0307`, `0308`) and possibly moderation.
6. Paid clan features — prices in rubles or Yan, and do they go through the same Yandex catalog / purchase flow?
   *(Prices are in Yan now, above 249 (Q2); the catalog/flow part stays open. A new product needs its own grant code
   — see "Context for the future build task".)*

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
- **Split from:** [`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) item H, by owner
  ruling 1 (2026-10-24). The other five talks: `0477` (nickname styling), `0478` (map voting), `0480` (coin economy),
  `0481` (custom uploaded flags), `0482` (leaderboard rewards). Order is the owner's (ruling 4); none waits on another.
- **Related:** [`0152`](../../done/0152-investigate-clans-system/brief.md) (the existing tag system), `0307` / `0308`
  (name safety rules).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendix — Clans (verbatim)

> Copied 2026-10-24 from `0343` Appendix H, which copied it verbatim on 2026-09-29. **Text is verbatim; only heading
> levels were changed.** Relative links inside the copy were written for the original file and may not resolve from
> here — use the source link above.

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
