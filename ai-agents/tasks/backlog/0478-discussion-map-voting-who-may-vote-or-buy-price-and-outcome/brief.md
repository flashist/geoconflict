# Discussion: map voting — who may vote or buy it, its price, and File / Park / Drop

## ID
0478

## Sprint
Backlog

> Was ~~Sprint 9~~ — moved to the [Backlog board](../../../sprints/backlog.md) 2026-10-24, ON HOLD; see `## Status`.

## Priority
— *(the Backlog board is unranked; was ~~12~~ on Sprint 9, history below)*

> ~~Rank 12~~ (Sprint 9, spent 2026-10-24) = **append rank in the OWNER-RULED talk order** (ruling 2 *"Added after current rows, in the talk order"*;
> ruling 4 *"Nickname styles (Recommended)"* — *"Then voting, clans, coins, own flags, badges. Blocked items last."*).
> Appended after the board's highest rank, never inserted (ADR-035); no row renumbered. Directly below `0477`.

## Status
🔲 Backlog — ⏸️ **ON HOLD (2026-10-24)**

> ⏸️ **ON HOLD — moved back to the [Backlog board](../../../sprints/backlog.md), 2026-10-24.** OWNER RULING given live
> via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (typed, not a listed option), relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel
> (ADR-021/037); ⛔ not producer precedent. Verbatim: *"I think the idea with voting maps should be puth back to
> backlog and hold there for quite a while, I am thinking about cancelling it completely, but I am not ready to make
> this decision right now."* Also, on whether voting is worth it at today's player numbers: *"Not worth it"*.
> - ⚠️ **Cancelling is UNDECIDED and is the owner's call.** Do **not** cancel this task, and do not pick it back up
>   into a sprint, without an owner ruling.
> - **Who may vote: not decided.** The batch-1 answers (including the locked-button ruling, kept for when the talk
>   resumes) are in [`worklog.md`](worklog.md).
> - Status was ~~🔄 In progress~~ (talk started 2026-10-24); the history below is unchanged.

~~🔄 In progress~~ *(📌 **2026-10-24 — was ~~🔲 Backlog~~, now `🔄 In progress`** — the talk has started. OWNER RULINGS, live `AskUserQuestion` in the lead session 2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"All six on Sprint 9 (Recommended)"** (*"The loop keeps offering the next talk"*) and talk order **"Nickname styles (Recommended)"** — *"Then voting, clans, coins, own flags, badges. Blocked items last."* — the previous talk, `0477`, closed 2026-10-24 (outcome File), so voting is next. Status edit only: no move, no rank change.)*

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

**Item C of `0343` — Map Voting for Verified Players.** In plain words: public maps alternate — random, then voted,
then random… While a random map plays, eligible players vote for the next one. Most votes wins; ties are random;
recently played maps are on cooldown. In the old prose only citizens vote, and non-citizens see the vote but cannot
cast one (an advert for citizenship). Owner ruling Q1 now makes the default *a paid option for everybody*, so what
"eligible" means is open again.

**Full prose:** [Appendix — Map Voting for Verified Players (verbatim)](#appendix--map-voting-for-verified-players-verbatim)
below, copied from `0343` Appendix C. Original source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *14. Map Voting for Verified Players*. `0343`'s own
item C section: [here](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md#item-c--map-voting-for-verified-players).

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
[`0484`](../0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md) on Sprint 9, owner
ruling **"Sprint 9, builds wait (Recommended)"** — future item builds wait on it.)*

**What this settles here.** **S1 — "to whom":** if voting (or a right to vote) is sold, anyone may buy it,
and a guest logs in first. **S1 — "what is sold"** (a bought right to vote, or a citizenship perk) **stays open**.
**The guest flag** under *"Context for the future build task"* is answered on the product side: a guest is not
sold to as a guest, they log in first. Whether the seamless continue after login is technically possible stays
open, for the shared flow's design task. Nothing below is deleted.

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

- The server must know, **when the vote is cast**, who may vote. The old wait on trusted identity is gone:
  [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) and
  [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) are done
  and live (see "Already settled"). Public lobbies and their maps are scheduled by the server master process; how a
  vote reaches it is an architect question for the build.

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**, with its own question round (Q3).
Record the answers and the outcome in this folder's `worklog.md`.

### Standing questions for this round (from the rulings above)

- **S1 — What is sold, and to whom?** Q1's default is *a paid option for everybody*. For voting that could mean: the
  right to vote is bought (by anyone), or voting stays a perk of citizenship (and buying citizenship is the purchase).
  Which?
- **S2 — Price** (Q3), **above 249 Yan** (Q2) if voting is sold on its own. The old prose named no price.

### Conflicts this talk must settle

- **"Gated to verified players only"** (prose) vs **Q1** (a paid option for everybody). If anyone can buy it, the
  *"non-verified players can see the panel but cannot vote"* advert becomes *"players who have not bought it"*.

### To discuss — `0343` item C's full list, carried here

1. ⚠️ **Borderline call — check it.** "Verified" in the prose = citizen. Earned citizens too, or paid only?
   *(Now framed by Q1 — see S1.)*
2. Is it worth it at current player numbers — how many citizens are in a typical public lobby to vote?
3. Must voting wait for `0340` + `0332`, or is an unverified vote acceptable at first (low stakes: a map choice)?
   *(**Settled:** both are done and live (`0395`, `0405`), and Q4 adds no new verification gate.)*
4. The locked vote button for non-citizens — should it open the citizenship popup (`0301`), like private lobbies
   (`0302`)?
5. Cooldown N — the developer proposes; the owner approves.
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
- **⏸️ ON HOLD (2026-10-24)** on the Backlog board, owner ruling quoted under `## Status`. Cancelling is undecided —
  the owner's call. Knock-on of the move: none by `Depends on:` (no brief names `0478`); ⚠️ `0484`'s soft ordering
  note *"after the six talks"* includes `0478` — raised to the owner, 2026-10-24.
- **Split from:** [`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) item C, by owner
  ruling 1 (2026-10-24). The other five talks: `0477` (nickname styling), `0479` (clans), `0480` (coin economy),
  `0481` (custom uploaded flags), `0482` (leaderboard rewards). Order is the owner's (ruling 4); none waits on another.
- **Related:** [`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md),
  [`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) (the locked-perk pattern),
  [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md),
  [`0332`](../../done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendix — Map Voting for Verified Players (verbatim)

> Copied 2026-10-24 from `0343` Appendix C, which copied it verbatim on 2026-09-29. **Text is verbatim; only heading
> levels were changed.** Relative links inside the copy were written for the original file and may not resolve from
> here — use the source link above.

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
