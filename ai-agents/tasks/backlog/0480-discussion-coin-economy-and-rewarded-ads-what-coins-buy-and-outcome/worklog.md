# 0480 — worklog

## 2026-10-24 — Batch 1: coins worth it now?, rewarded ad on its own, the "premium tier" — and ON HOLD

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed. Recorded by a spawned `fkit-producer`.

### 1 — "Coins (earn after matches, spend on looks): worth building at today's player numbers?" (To-discuss 6)

Owner typed, verbatim (not a listed option):

> *"I am actually thinking of cancelling this task too. Park it indefinitely in backlog. I will get back to
> this decision later."*

⇒ **Coins: not built now.** To-discuss 6 answered for today: not wanted now.
⇒ **The task goes back to the Backlog board, ON HOLD**, "indefinitely" — done 2026-10-24 (see *What was
changed* below).
⇒ ⚠️ **Cancelling is the owner's call and is NOT decided.** The owner said he is *thinking of* cancelling
it and *"will get back to this decision later"*. This task is **not** cancelled; no mover was run.
⇒ The word "Park" is the owner's; the talk's formal outcome (File / Park / Drop) is **not** recorded as
*Park* here, because the owner put the whole task on hold rather than closing the talk. Same handling as
`0478`.

### 2 — "A rewarded ad on its own (player opts to watch, gets e.g. double match XP): worth a look now?" (To-discuss 2)

Owner typed, verbatim (not a listed option):

> *"Yandex's rewarded video work for us and it might improve our rating and income. It's worth planning and
> implementing now."*

⇒ **To-discuss 2 answered:** the minimal rewarded ad is **its own step**, not folded into a coin economy.
⇒ **Split out** as build task
[`0488`](../../done/0488-build-an-opt-in-yandex-rewarded-video-ad-to-improve-rating-and-income/brief.md), filed
2026-10-24 on **Sprint 9**, rank 18 (append rank). ⚠️ Sprint 9 is `fkit-lead`'s reading of "now", not an
owner placement; the owner may move it.
⇒ Carried into `0488` as **owner questions to settle before or at plan approval**: the reward (and its
trade-off against the 249-Yan paid citizenship), where the button appears, how often it can be watched,
whether paid citizens (`0248`) still see it, whether guests can use it. Carried as **plan-step checks**:
SDK support incl. degraded mode, reward only on the rewarded callback, frequency rules, XP crediting
trust (`getCreditableYandexId` / `0217`), whether the `0248` `is_paid_citizen` switch-off blocks rewarded
ads, revenue/impression data.

### 3 — "Is citizenship the 'premium tier' the old plans mentioned?" (To-discuss 4)

Owner asked, verbatim: *"Give me more context about it."*

⇒ ⏳ **PENDING — not answered.** The lead is explaining it and will re-ask. **No ruling recorded.** It is
the question that decides whether item D of `0343` (premium replays, itself parked) still waits on this
item; not urgent while both are parked.

### Not asked in this batch — left open on purpose (task on hold)

- **S1** (is anything sold for real money; who may buy; price above 249 Yan), **S2** / To-discuss 5 (does
  spending coins count as a purchase), the **earned-vs-bought marks conflict**, To-discuss 1 (coins and
  citizenship), To-discuss 3 (which cosmetics, earn/spend rates).

### What was changed (2026-10-24, by the spawned producer)

- Status `🔄 In progress` → `🔲 Backlog`, with an **ON HOLD** note in the brief's `## Status`.
- `## Sprint` `Sprint 9` → `Backlog`; `## Priority` `14` → `—` (the Backlog board is unranked).
- Sprint 9 row (rank 14) → `➡️ Moved to [Backlog](backlog.md)`, ruling quoted; a new `🔲 Backlog` row,
  marked ON HOLD, appended to the [Backlog board](../../../sprints/backlog.md).
- New build brief `0488` filed on Sprint 9 (rank 18); `## Notes` of this brief records the split.
- **Not done:** no cancel, no `/fkit-task-done`, no `/fkit-task-cancelled`. The task folder did not move.

### Knock-on check

- `0480`'s own lines: `**Depends on:** nothing`, `**Blocks:** nothing` (unchanged).
- Grep of `ai-agents/tasks/backlog/` for `Depends on:` lines naming `0480`: see the result recorded on the
  Sprint 9 board's Notes line of 2026-10-24 for this move.
- ⚠️ **Soft ordering, not a dependency:** `0484` (shared purchase flow, Sprint 9) says it starts *"after
  the six talks `0477`–`0482`"*. With `0480` now on hold too (after `0478`), read literally `0484` would
  wait indefinitely. Not a `Depends on:` line, so the placement check does not see it. Already raised to
  the owner for `0478`; `0480` widens the same question. `0484` not edited.

### Where the talk stands

- **Outcome (File / Park / Drop): not decided.** On hold on the Backlog board. The owner may later resume
  the talk, park it, or cancel it — his call.
- **Answered:** To-discuss 6 (not now), To-discuss 2 (rewarded ad is its own step → `0488`).
- **Pending:** To-discuss 4 (premium tier) — the owner asked for more context.
- **Open on purpose:** S1, S2 / To-discuss 5, the marks conflict, To-discuss 1, To-discuss 3.

## 2026-10-24, later — Answer to the pending "premium tier" question (To-discuss 4)

**Provenance.** OWNER ANSWER given live via `AskUserQuestion` in the lead's Claude Code session on 2026-10-24 (typed,
not a listed option) — the re-ask of Batch 1 item 3, where the owner had asked for more context; relayed by `fkit-lead`
(driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner channel (ADR-021/037);
⛔ not producer precedent. Quoted exactly as relayed.

### 3 (answered) — "Is citizenship the 'premium tier' the old plans mentioned?" (To-discuss 4)

Owner typed, verbatim:

> *"I don't think our old plans for "premium" matches 1-to-1 our new citizenship paid/not-paid roles. Long story
> short: the paid citizenship has something that non-paid citizens don't have. Otherwise, all other features will be
> enabled for citizens. If there is nothing super important in the "premium" thing, we can drop it completely and
> continue developing the citizenship-related features and content."*

⇒ **To-discuss 4 answered.** Citizenship is **not** a one-to-one match for the old "premium tier".
⇒ **The old "premium tier" idea is DROPPED**, unless something important is found in it (the producer's look-through,
2026-10-24, reported to `fkit-lead`, found nothing that needs a premium tier of its own — no ruling on that report is
recorded here).
⇒ **Paid citizenship keeps something extra** over earned citizenship. **Every other feature goes to all citizens.**
⇒ Knock-on, recorded only: `0343` item D (premium replays, parked since 2026-10-03) waited on "Task 11's premium tier";
that wait is now dead. Item D stays parked; `0343` (done) not edited.
⇒ **Not changed:** this brief's banner and To-discuss list (still read *Pending*), the boards, the task's hold.
