# Discussion: a nickname-style pack offer — whether to sell one, and at what price

## ID
0483

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0482`. `0483`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"Should there be a pack of all three styles, and at what
> price?"*, the owner typed, verbatim: *"Brief a task for discussing the package offer to think about it later, put
> it to the backlog"*. → Backlog board, unscheduled.

## Priority
Unscheduled

(Backlog board, unranked by design. The board row is an **append** at the bottom of the Backlog board, not a merit
placement.)

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

**What this brief is.** A **talk, not a build. Nothing is built from this brief.** It holds one open question split
out of the nickname-styling talk [`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md)
(its S2, the pack part) so the owner can think about it later: **should the three nickname styles also be sold
together as a pack, and if so, at what price?**

**The styles.** `0477`'s V1 scope is three looks for a player's name: background colour, border, text colour. Each
is sold on its own.

**What is known (2026-10-24, from `0477`'s batch 1 — [worklog](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md)):**

- **The old pack price was 149–199 ₽** (`done/plan-sprint-5.md` § *8a*; rubles from before launch — the Yan/ruble
  ratio was not checked). It is **below the 249 Yan floor**, so it cannot stand.
- **The owner's working single-style price is about 499 Yan.** Owner, verbatim: *"All prices should be bigger, than
  the price of the pure paid-citizenship. For now I am thinking about something slike almost 2x of that price,
  something like 499 Yan"*. ⚠️ A working figure ("for now", "something like"), **not final**.
- **Every price must be above paid citizenship alone — 249 Yan** (`0343` Q2; the 249 Yan figure was not re-checked
  in the Yandex console). A pack is a purchase, so it falls under this too.
- **Standing ruling for all purchases** (2026-10-24, from `0477`'s talk), owner verbatim: *"we should have the same
  rules for ALL purchases: allowed to all, gives paid citizenship, if it's a guest - we're asking to log in (ideally,
  after login we should make a seamless transition to the purchase flow without additional popups or steps, if
  possible)."* A pack would follow the same rules.

**Not settled by this brief.** Whether `0477` itself ends in File, Park or Drop. If styles are parked or dropped,
this talk has nothing to price and can be closed with the same outcome.

## What to build

**Nothing is built from this brief.** "What to build" is **one owner talk**. Record the answers and the outcome in
this folder's `worklog.md`.

### To discuss

1. **Sell a pack at all?** Or only single styles?
2. **Pack price.** It must be above 249 Yan. With a single style at about 499 Yan, three styles bought one by one
   come to about 1,497 Yan. Where should the pack sit between those?
3. **A player who already owns one or two styles** — do they pay the full pack price, or a reduced one for the
   rest? (A reduced price may need extra products in the Yandex catalog — a technical question for the architect if
   filed.)
4. **When.** Launch the pack with the single styles, or add it later once single styles have sold?

## Verification steps

1. The outcome — **File**, **Park** or **Drop** — is recorded in this folder's `worklog.md`, dated, with the owner's
   words.
2. If a pack is sold: its price has a dated owner answer and is **above 249 Yan**; questions 3 and 4 each have a
   dated owner answer or are explicitly carried into a named brief.
3. **File:** the follow-up work is filed with `/fkit-task-brief` (or folded into `0477`'s nickname-style build
   brief, if that exists by then — the worklog names which), with canonical `**Depends on:**` / `**Blocks:**` lines.
4. **Park:** the worklog says what would bring it back.
5. Closed with `/fkit-task-done` by the producer once 1–4 hold, whatever the outcome.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Split from:** [`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md), S2 (pack
  part), by owner answer 4 of 2026-10-24.
- **Related:** [`0343`](../../done/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) (Q2, the 249 Yan
  floor).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
