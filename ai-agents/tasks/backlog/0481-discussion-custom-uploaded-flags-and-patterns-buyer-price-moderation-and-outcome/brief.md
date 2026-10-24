# Discussion: custom uploaded flags and patterns — who may buy, the price, moderation, and File / Park / Drop

## ID
0481

## Sprint
Backlog

> Was ~~Sprint 9~~ — moved to the [Backlog board](../../../sprints/backlog.md) 2026-10-24, WAITING on `0010` and `0011`; see `## Status`.

## Priority
— *(the Backlog board is unranked; was ~~15~~ on Sprint 9, history below)*

> ~~Rank 15~~ (Sprint 9, spent 2026-10-24) = **append rank in the OWNER-RULED talk order** (ruling 2 *"Added after current rows, in the talk order"*;
> ruling 4 *"Nickname styles (Recommended)"* — *"Then voting, clans, coins, own flags, badges. Blocked items last."*).
> Appended after the board's highest rank, never inserted (ADR-035); no row renumbered. Directly below `0480`; among
> the "blocked items last".

## Status
🔲 Backlog — ⏳ **WAITING (2026-10-24) on `0010` and `0011`** — not on hold, not cancelled

> ⏳ **WAITING — moved to the [Backlog board](../../../sprints/backlog.md), 2026-10-24.** OWNER RULINGS given live via
> `AskUserQuestion` in the lead's Claude Code session on 2026-10-24, relayed by `fkit-lead` (driving
> `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not
> producer precedent. Asked *"Custom uploaded flags/patterns: worth it now, at today's player numbers?"*, the owner
> typed, verbatim: *"Move it to backlog. Should be taken into work only after flags/patterns are re-enabled and
> in-apps for them are built/enabled properly."* Asked *"If parked: what brings custom uploads back?"*, he picked
> **"Paid flags live & selling (Recommended)"** — option text: *"When plain paid flags (0010) are live and people buy
> them."*
> - **The gate, in his words:** work starts only after flags and patterns are re-enabled and their in-app purchases
>   are built and enabled properly — and when paid flags are live and people buy them. Recorded as
>   `**Depends on:** 0010, 0011` under `## Notes`. ⚠️ The *"people buy them"* half is a live-sales condition, not a
>   task: `0010` closing does not by itself meet it.
> - **Not cancelled, not on hold-for-cancel** — the owner did not mention cancelling. The talk stays open and
>   unscheduled. Do not pull it into a sprint before the gate is met, and do not cancel it, without an owner ruling.
> - **Outcome (File / Park / Drop): not decided.** Price, moderation, refunds, and flags-or-patterns-first stay open
>   for the resumed talk. Answers in this task's `worklog.md`.
> - The status this brief carried was ~~🔄 In progress~~ (history below).

*(history:)* 📌 **2026-10-24 — was ~~🔲 Backlog~~, then ~~`🔄 In progress`~~** — the talk has started, next in the owner's talk order (`0478` and `0480` on hold, `0479` closed Park). OWNER RULINGS, live `AskUserQuestion` in the lead session 2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"All six on Sprint 9 (Recommended)"** (*"The loop keeps offering the next talk"*), talk order **"Nickname styles (Recommended)"** (*"Then voting, clans, coins, own flags, badges. Blocked items last."*), and **"Finish talks first"** (asked whether the loop should build `0488` next: the talks continue first). Status edit only: no move, no rank change.

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

**Item E of `0343` — Custom Uploaded Flags & Patterns.** In plain words: a player uploads their own flag (or
territory pattern) image. A person (or a service) checks it before it ever appears in a match. Expensive on purpose;
flags first. The old prose made it *paid citizens only*; owner ruling Q1 now makes the default *a paid option for
everybody*.

**Full prose:** [Appendix — Custom Uploaded Flags & Patterns (verbatim)](#appendix--custom-uploaded-flags--patterns-verbatim)
below, copied from `0343` Appendix E. Original source:
[`done/plan-sprint-5.md`](../../../sprints/done/plan-sprint-5.md) § *15. Custom Uploaded Flags & Patterns — Paid
Citizens Only*. `0343`'s own item E section:
[here](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md#item-e--custom-uploaded-flags--patterns-paid-citizens-only).

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
filed yet** (owner placement pending, 2026-10-24).

**What this settles here.** **S1 settled:** anyone may buy an upload, and a guest logs in first.
**The first conflict** (*"Earned citizens are not eligible"* vs Q1) is settled the same way: **allowed to all**.
**The guest flag** under *"Context for the future build task"* is answered on the product side: a guest logs in
first; the seamless continue after login stays open, for the shared flow's design task. S2 (price) and the
moderation questions **stay open**. Nothing below is deleted.

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

> ⚠️ **Superseded 2026-10-24 for this talk itself:** the owner's gate (see `## Status`) makes this talk wait on
> `0010` and `0011` too — now its `**Depends on:**`. The text below is kept as written.

- 🚧 **Blocked by `0010` and `0011`.** Flags [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md) and
  patterns [`0011`](../0011-re-enable-territory-patterns/brief.md) must be live first — both are **blocked** — and behind
  them [`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md). Any build brief this talk files must
  carry these as its `Depends on:`; this talk does not wait on them.
- The personal inbox exists, and the name-change review flow (`0067`, `0283`, `0312`–`0315`) is a working model for a
  review queue.

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**, with its own question round (Q3).
Record the answers and the outcome in this folder's `worklog.md`.

### Standing questions for this round (from the rulings above)

- **S1 — Who may buy an upload?** Q1's default is everybody; the prose said paid citizens only (see Conflicts).
- **S2 — Price** (Q3), **above 249 Yan** (Q2). ⚠️ The old price — 199–399 ₽ per upload — is **partly below that
  floor** (the low end is below 249). (Rubles from before launch; the Yan/ruble ratio was not checked.)

### Conflicts this talk must settle

- **"Earned citizens are not eligible"** (prose: *"Why paid-citizen only … Earned citizens are not eligible."*) vs
  **Q1** (a paid option for everybody). Note that under **Q2** a buyer becomes a full paid citizen by buying, so the
  prose's *"already demonstrated financial commitment"* reason is met by the purchase itself.
- **Old price partly below the new floor** (S2).

### To discuss — `0343` item E's full list, carried here

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

- **Depends on:** 0010, 0011 — OWNER RULING 2026-10-24, live `AskUserQuestion` in the lead session, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move it to backlog. Should be taken into work only after flags/patterns are re-enabled and in-apps for them are built/enabled properly."* and **"Paid flags live & selling (Recommended)"** (*"When plain paid flags (0010) are live and people buy them."*). Was ~~nothing~~.
- **Blocks:** nothing
- **Placement check (2026-10-24, after the move and the `Depends on:` edit):** see the [Sprint 9](../../../sprints/plan-sprint-9.md) Notes line of 2026-10-24 for this move.
- **Split from:** [`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) item E, by owner
  ruling 1 (2026-10-24). The other five talks: `0477` (nickname styling), `0478` (map voting), `0479` (clans), `0480`
  (coin economy), `0482` (leaderboard rewards). Order is the owner's (ruling 4); none waits on another.
- **Related:** [`0010`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md),
  [`0011`](../0011-re-enable-territory-patterns/brief.md),
  [`0009`](../0009-self-host-upstream-openfront-api-dependency/brief.md),
  [`0067`](../../done/0067-name-change-citizens-only/brief.md) (review-queue model).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

---

## Appendix — Custom Uploaded Flags & Patterns (verbatim)

> Copied 2026-10-24 from `0343` Appendix E, which copied it verbatim on 2026-09-29. **Text is verbatim; only heading
> levels were changed.** Relative links inside the copy were written for the original file and may not resolve from
> here — use the source link above.

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
