# Discussion: nickname styling — who may buy it, its price, and File / Park / Drop

## ID
0477

## Sprint
Sprint 9

## Priority
11

> Rank 11 = **append rank in the OWNER-RULED talk order** (ruling 2 *"Added after current rows, in the talk order"*;
> ruling 4 *"Nickname styles (Recommended)"* — *"Then voting, clans, coins, own flags, badges. Blocked items last."*).
> Appended after the board's highest open-or-closed rank (10), never inserted (ADR-035); no row renumbered. First of
> the six talks, so it sits directly above `0478`.

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

**Item B of `0343` — Nickname Styling System.** In plain words: extra paid looks for a player's name — background
colour, border, text colour — sold one by one or as a pack. The old prose made it an upsell only for players who
already had the citizen ("verified") name; owner ruling Q1 now makes the default *a paid option for everybody*, so
who may buy it is open again.

**Full prose:** [Appendix — Nickname Styling System (verbatim)](#appendix--nickname-styling-system-verbatim) below,
copied from `0343` Appendix B. Original source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *8a. Nickname Styling System*. `0343`'s own
item B section: [here](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md#item-b--nickname-styling-system).

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

- **A shared name-drawing path.** The prose makes *"centralized name rendering"* a hard prerequisite: a styled name
  must look the same in the match, the leaderboard, the post-match summary and the diplomacy UI. Whether one path
  draws every name today was **not checked** — that is question 2 below, for the architect.
- What exists today: the ★ icon (`0068`), name change for citizens (`0067`), the approved name shown in matches
  (ADR-115; `0317`'s follow-ups). The cosmetics chain on the [Backlog board](../../../sprints/backlog.md) (`0010` flags,
  `0011` patterns, `0009`) is listed there as this item's foundation.
- ⚠️ **Stale in `0343`:** its item B note says the server-confirmed name mark
  [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) *"is on Sprint 7"*. It was
  **cancelled on 2026-10-07** (owner: players don't care whether a name is server-confirmed). Nothing here waits on it.

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**, with its own question round (Q3).
Record the answers and the outcome in this folder's `worklog.md`.

### Standing questions for this round (from the rulings above)

- **S1 — Who may buy styles?** Q1's default is everybody (paid / unpaid citizen, non-citizen, guest). Keep that, or
  limit it (e.g. only players who have a name to style)?
- **S2 — Price** (Q3), single style and pack, **above 249 Yan** each (Q2). ⚠️ The old prices — 49–99 ₽ each, 149–199 ₽
  per pack — are **all below that floor**. (They are rubles from before launch; the Yan/ruble ratio was not checked.)

### Conflicts this talk must settle

- **"Styles are an upsell, not a standalone product"** (prose: *"A player who has not purchased a verified nickname
  … cannot purchase styles"*) vs **Q1** (a paid option for everybody). Which wins?
- **Old prices below the new floor** (S2).

### To discuss — `0343` item B's full list, carried here

1. There is no separate "verified nickname purchase" today — the citizen name *is* it. So: styles for all
   citizens, paid citizens only, or bought separately? *(Now framed by Q1 — see S1.)*
2. Is there one shared name-rendering path now, used everywhere a name shows (in match, leaderboard, post-match,
   diplomacy)? The prose makes that a hard prerequisite. (Architect question when un-parked.)
3. The prose's renderer notes say "Pixi.js"; the game draws with Canvas 2D (CLAUDE.md). The "custom fonts are
   hard" reasoning needs re-checking — it does not change the V1 scope (colours and border only).
   *(**Settled in part:** the renderer is Canvas 2D — see "Already settled". Only the custom-fonts reasoning is left,
   and it matters only if custom fonts come back into scope.)*
4. Readability is a hard rule; who approves each style? The ★ icon and leaderboard badges must stay visible.
5. Does a style show to other players before the game server can trust the identity (`0340` / `0332`)?
   *(**Likely settled:** both are done and verified logins are live (`0395`, `0405`); Q4 adds no new verification
   gate, and ADR-124 Q5 already shows the approved name for unconfirmed players. Confirm in the talk.)*
6. A/B test through Yandex (the prose allows it) or ship to all?

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
- **Split from:** [`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) item B, by owner
  ruling 1 (2026-10-24). The other five talks: `0478` (map voting), `0479` (clans), `0480` (coin economy), `0481`
  (custom uploaded flags), `0482` (leaderboard rewards). Order is the owner's (ruling 4); none waits on another.
- **Related:** [`0068`](../../done/0068-citizen-verified-icon/brief.md),
  [`0067`](../../done/0067-name-change-citizens-only/brief.md),
  [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (cancelled),
  [`0010`](../../backlog/0010-re-enable-flags-paid-non-country-cosmetic/brief.md),
  [`0011`](../../backlog/0011-re-enable-territory-patterns/brief.md),
  [`0009`](../../backlog/0009-self-host-upstream-openfront-api-dependency/brief.md),
  [`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) (what the popup promises).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendix — Nickname Styling System (verbatim)

> Copied 2026-10-24 from `0343` Appendix B, which copied it verbatim on 2026-09-29. **Text is verbatim; only heading
> levels were changed.** Relative links inside the copy were written for the original file and may not resolve from
> here — use the source link above.

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
