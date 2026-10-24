# 0343 — worklog

## 2026-10-24 — Batch 1: cross-cutting questions Q1–Q4 answered

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed, typos included. Recorded by a spawned `fkit-producer`.

**Which questions these are.** Batch 1 was worded for the owner by an earlier producer, and its wording
differs from the brief's cross-cutting list (§ *What to build*, questions 1–5). Mapping: batch Q1 ↔
brief 1 · Q2 ↔ brief 2 · Q3 ↔ brief 3 · Q4 ↔ brief 4 (the batch asked whether a player must be
"verified"; the brief's question 4 was about a server-trusted identity) · brief 5 (order) = Q5, **not yet
asked**. The batch's question text below is as relayed by `fkit-lead`; it was not written into this
folder before today.

### Q1 — "Who gets the new perks: nickname styles, map voting, uploading your own flag?"

Owner typed, verbatim:

> *"Those features (each) is a separate item and will be discussed separately each time. Most of the
> things that you described will be a paid option for everybody (doesn't matter whether it's a
> paid/not-paid citizen/not-citizen/guest). Each item should be discussed separately. Brief a separate
> task per each item."*

### Q2 — "Should buying any new item (a style, a clan fee) make the buyer a citizen, and a paid one with no ads?"

Owner typed, verbatim:

> *"It will give a full-paid citizen, but each item will be more expensive than the item of paid
> citizenship only."*

### Q3 — "How do we set prices for the new items?"

Owner typed, verbatim:

> *"Ask me questions about each item separtely in another interactive questions interface."*

### Q4 — "Must a player be 'verified' (Yandex login confirmed) to use the new perks?"

Owner picked, verbatim: **"No, same as today (Recommended)"** — option text: *"Same rule as existing
perks. Small, accepted faking risk; paying players never miss a perk."*

### Q5 — order ("which item first?")

~~**Not yet asked.**~~ *(Answered later the same day by ruling 4 — see "Batch 2" below.)*

### Already settled before this batch — by reference only

- **Items A (paid map packs) and D (premium replays) are on hold** — see the ⛔ banners in the brief
  under § *Item A* and § *Item D* (owner ruling 2026-10-03, *"Keep it, mark A and D on hold"*). Not
  discussed in batch 1.
- **Items F, G, H belong to this brief** — see the brief's § *Context*, the "2026-09-29, later" note
  (owner ruling C).
- **Paid citizenship costs 249 Yan** — as recorded in the brief's § *What to build*, cross-cutting
  question 3 (owner changed it in the Yandex console, 2026-09-25). Not re-checked in the console.
- Fact, not a ruling: `0340` and `0332` (the trusted-identity work the brief's cross-cutting question 4
  says the perks "wait on") are both in `ai-agents/tasks/done/` — checked 2026-10-24.
- ⚠️ The earlier producer's own list of "already settled" items was not written into the brief or this
  folder, so the list above is only what the brief itself records. `fkit-lead` holds the batch-1 text.

### Item outcomes (A–H)

~~None recorded yet.~~ *(Recorded later the same day — see "Batch 2" below.)*

### Waiting on the owner (returned to `fkit-lead` on 2026-10-24) — ✅ all four answered, see "Batch 2" below

1. What kind of task "a separate task per each item" is, and for which items.
2. Which board those tasks go on.
3. What then happens to `0343` itself.
4. Q5: which item is discussed first.

Nothing was filed, and no status, rank or sprint row was changed by this entry.

## 2026-10-24 (later) — Batch 2: the four follow-up decisions answered; outcomes A–H recorded; closed

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24,
relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
channel (ADR-021/037); ⛔ not producer precedent. Option labels and option texts are verbatim as relayed. Recorded by a
spawned `fkit-producer`.

### The rulings, verbatim

1. *"What kind of task should each item get?"* → **"A talk per item (Recommended)"** — *"Six discussion tasks
   (styles, voting, own flags, badges, coins, clans): each item's questions and price asked in its own round."*
2. *"Where do the new per-item tasks go?"* → **"All six on Sprint 9 (Recommended)"** — *"Added after current rows,
   in the talk order. The loop keeps offering the next talk. No other task waits on them."*
3. *"What happens to 0343 itself?"* → **"Close once tasks filed (Recommended)"** — *"Close after the per-item tasks
   are filed and the first item is picked; map packs and replays recorded as parked."*
4. *"Which item do we talk through first?"* (this is Q5) → **"Nickname styles (Recommended)"** — *"Then voting, clans,
   coins, own flags, badges. Blocked items last."*

### Q5 — order: answered by ruling 4

First item: **nickname styling (B)**. Then map voting (C), clans (H), coin economy (G), custom uploaded flags (E),
leaderboard rewards (F). *"Blocked items last"*: E (behind `0010`/`0011`) and F (behind `0234`).

### Item outcomes (A–H)

| Item | Outcome | Owner's words | Detail |
|---|---|---|---|
| A — Paid Campaign Map Packs | **Park** | 2026-10-03 *"Keep it, mark A and D on hold"*; 2026-10-24 ruling 3 *"map packs and replays recorded as parked"* | **Brings it back:** the owner lifting the 2026-10-03 hold (new-maps content postponed with no restart date; `0027` on the Backlog board). Its 7 "To discuss" questions stay **unanswered and parked with the item**, in the brief § *Item A* and Appendix A. |
| B — Nickname Styling | **File** | ruling 1 | → [`0477`](../0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md) (Sprint 9, rank 11) |
| C — Map Voting | **File** | ruling 1 | → [`0478`](../../backlog/0478-discussion-map-voting-who-may-vote-or-buy-price-and-outcome/brief.md) (rank 12) |
| D — Premium Replays | **Park** | 2026-10-03 *"Keep it, mark A and D on hold"*; 2026-10-24 ruling 3 | **Brings it back:** the owner lifting the 2026-10-03 hold (match archiving postponed with no restart date; `0030` on the Backlog board). Its 5 "To discuss" questions stay **unanswered and parked with the item**, in the brief § *Item D* and Appendix D. |
| E — Custom Uploaded Flags & Patterns | **File** | ruling 1 | → [`0481`](../../backlog/0481-discussion-custom-uploaded-flags-and-patterns-buyer-price-moderation-and-outcome/brief.md) (rank 15) |
| F — Leaderboard Rewards | **File** | ruling 1 | → [`0482`](../0482-discussion-leaderboard-rewards-badges-earned-only-or-sold-and-outcome/brief.md) (rank 16) |
| G — Coin Economy + Rewarded Ads | **File** | ruling 1 | → [`0480`](../../backlog/0480-discussion-coin-economy-and-rewarded-ads-what-coins-buy-and-outcome/brief.md) (rank 14) |
| H — Clans | **File** | ruling 1 | → [`0479`](../0479-discussion-clans-what-is-free-what-is-sold-prices-and-outcome/brief.md) (rank 13) |

**What "File" means here (owner-ruled scope change, ruling 3).** The brief's *What to build* defined File as *"write
real brief(s)"*. By rulings 1 and 3 it now means **one discussion task filed per item**; that item's "To discuss"
questions travel into it, and the real build brief(s) — investigation first where the shape is unknown — come out of
each talk. Each new brief carries its item's full question list verbatim, its source prose copied verbatim, the
standing rulings Q1–Q4, the conflicts its talk must settle, and its known blockers as context (not as `Depends on:`).
All six read `**Depends on:** nothing` / `**Blocks:** nothing`.

### Already settled — by reference (each checked against its source on 2026-10-24)

An earlier producer named these; they were not recorded until now. All verified; none dropped.

- **Verified logins are live** — [`0395`](../../done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md),
  closed 2026-10-07 (owner's live check `vfy: true`).
- **95.3 % start a match verified** — [`0405`](../../done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md),
  closed 2026-10-10: 5,676 / 5,958 match starts verified, 2026-10-08 → 2026-10-10. ⚠️ Precisely: the share is among
  players **with a Yandex id**; guests (58.2 % of all match starts) are outside it.
- **ADR-124 Q2–Q5 and Q7** ([ADR-124](../../../knowledge-base/decisions/adr-124-join-token-profile-server-vouches-for-the-game-servers-identity-funnel.md),
  accepted 2026-10-07): Q2 *"Keep XP (Recommended)"* · Q3 *"Keep the ★ (Recommended)"* · Q4 *"Keep it open
  (Recommended)"* (private lobbies) · Q5 *"Keep for unconfirmed"* (approved name) · Q7 *"Treat as unconfirmed
  (Recommended)"* (a missing `verified` reads as unverified — the rule for any future enforcement).
- **"Any purchase grants citizenship"** — [`PROJECT.md`](../../../knowledge-base/PROJECT.md) line 37. **And the guard:**
  [`0019`](../../done/0019-yandex-payments-impl/brief.md) review R2, owner ruling 2026-08-14 *"guard now"* — the
  paid-purchase grant throws for any product other than citizenship (`src/profile-server/PaymentsRepository.ts`,
  `grantPaidPurchase`), so every new product needs its own grant branch.
- **Q1 precedents.** All citizens, earned or paid: ★ icon ([`0068`](../../done/0068-citizen-verified-icon/brief.md)),
  name change ([`0067`](../../done/0067-name-change-citizens-only/brief.md)), private lobbies
  ([`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md), *"Earned or paid (Recommended)"*). Paid
  only: no interstitial ads ([`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md), gate
  `is_paid_citizen`), under its own paid-only sub-heading in the popup
  ([`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md)).
- **`0323` is cancelled, not "on Sprint 7"** —
  [`0323`](../../cancelled/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) cancelled 2026-10-07. Item B's
  note in the brief is stale on that point; corrected in `0477`.
- **B3's "Pixi" point is a settled fact** — the game draws with Canvas 2D (`CLAUDE.md` § *Rendering*;
  `src/client/graphics/GameRenderer.ts` takes a `2d` context; Pixi appears in 2 of the 43 layer files). Only B3's
  custom-fonts reasoning stays open, carried in `0477`.

### Verification steps 1–7, checked before the close

1. **Cross-cutting questions 1–5 have dated owner answers** — ✅ Q1–Q4 in Batch 1 above; Q5 by ruling 4 (this entry).
   The brief's question 4 (server-trusted identity) was asked as "must a player be verified?"; answered by Q4 plus the
   settled facts (`0340`/`0332` done, `0395`, `0405`).
2. **Every item A–H has one dated outcome** — ✅ table above (A, D Park; B, C, E, F, G, H File).
3. **No "To discuss" question silently dropped** — ✅ B (6), C (6), E (6), F (5), G (6), H (6) carried verbatim into
   `0477`–`0482`, with settled ones marked and sourced; A (7) and D (5) explicitly parked with their items; the
   cross-cutting five answered.
4. **Every File has its follow-up brief(s), canonical `Depends on:` / `Blocks:`, IDs listed** — ✅ under the
   owner-ruled scope change (ruling 3): six discussion briefs filed with `/fkit-task-brief`, IDs in the table. The
   investigation-first requirement moved into each new brief's own verification step 6.
5. **Every Park says what brings it back** — ✅ A and D: the owner lifting the 2026-10-03 hold.
6. **Appendices present, source links resolve** — ✅ Appendices A–H present. Every *source* link resolves. Two
   hrefs do not, and neither is a source link: `../plan-sprint-6.md` inside the verbatim appendices (the appendix
   header already says such links may not resolve), and `../../../sprints/plan-sprint-8.md` inside a code span in
   § *Context* that quotes a marker's text (not a rendered link; Sprint 8 is now under `sprints/done/`). Also stale,
   as plain text only: Appendix A's *"Source: `ai-agents/sprints/plan-sprint-6.md`"* (the file is under
   `sprints/done/`; § *Item A*'s real link resolves).
7. **Closed only with `/fkit-task-done` by the producer** — ✅ this close, agent-closed (no owner channel).

**Placement check** (`/fkit-task-brief` step 9): none on Sprint 9 — the six new tasks depend on nothing and no open
task names them. Nothing committed; no wiki write.
