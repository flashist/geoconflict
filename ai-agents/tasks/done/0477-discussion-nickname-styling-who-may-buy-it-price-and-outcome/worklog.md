# 0477 — worklog

## 2026-10-24 — Batch 1: who may buy, the guest case, the price, the pack

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed, typos included. Recorded by a spawned `fkit-producer`.

### 1 — "Who may buy nickname styles (players logged in with Yandex)?" (brief S1)

Owner picked, verbatim: **"Everybody (Recommended)"** — option text: *"Any logged-in player. Buying also
makes them a full paid citizen, so it's a second way in."*

⇒ **S1 settled:** any logged-in player may buy a style; buying makes the buyer a full paid citizen (Q2).
⇒ **Conflict 1 settled** (*"styles are an upsell, not a standalone product"* vs Q1): **Q1 wins.** A style is
sold to everybody, not only to players who already hold a citizen name. **To-discuss 1 settled** by the
same answer.

### 2 — "A guest (no Yandex login) wants to buy a style. What happens?"

Owner typed, verbatim (#1 = the option **"Ask to log in first (Recommended)"**):

> *"#1, but generally speaking, we should have the same rules for ALL purchases: allowed to all, gives
> paid citizenship, if it's a guest - we're asking to log in (ideally, after login we should make a
> seamless transition to the purchase flow without additional popups or steps, if possible). This flow is
> worth additional discussion with producer/architect/coder, to design it well from the go-start, because
> it will be reused for all purchases."*

⇒ **For styles:** a guest is asked to log in first; no guest-only purchase.
⇒ **A standing ruling for ALL purchases**, not just this item: allowed to all · gives paid citizenship ·
a guest is asked to log in · ideally, after login, the player goes straight on into the purchase with no
extra popups or steps, "if possible". Noted as a dated *Standing ruling* in the five sibling talks
`0478`, `0479`, `0480`, `0481`, `0482` (2026-10-24).
⇒ **The shared purchase-flow design task** the owner asked for (guest login → seamless continue into the
purchase, designed once with producer, architect and coder, reused for every purchase): **not filed yet.**
Its kind, its board and whether the item builds depend on it are put to the owner in the next batch.
⇒ The brief's ⚠️ *"Not verified: can a guest buy?"* note is answered on the product side (a guest logs
in first). Whether the seamless continue after login is technically possible is still an architect
question, carried to that design task.

### 3 — "What should one name style cost (must be above 249 Yan)?" (brief S2, single style)

Owner typed, verbatim:

> *"All prices should be bigger, than the price of the pure paid-citizenship. For now I am thinking about
> something slike almost 2x of that price, something like 499 Yan"*

⇒ **Working figure, not final: about 499 Yan per style** (owner: "for now", "something like"). It is
above the 249 Yan floor (Q2). Restates Q2 as a rule for all prices: every item costs more than paid
citizenship alone. ⚠️ The final price is to be confirmed before a build ships; the 249 Yan floor itself
was not re-checked in the Yandex console.
⇒ **Conflict 2 (old prices below the floor) settled** for the single style: the old 49–99 ₽ is replaced.

### 4 — "Should there be a pack of all three styles, and at what price?" (brief S2, pack)

Owner typed, verbatim:

> *"Brief a task for discussing the package offer to think about it later, put it to the backlog"*

⇒ **Pack: carried, not decided.** Filed as
[`0483`](../../backlog/0483-discussion-nickname-style-pack-offer-whether-to-sell-one-and-at-what-price/brief.md) on the
Backlog board (2026-10-24). Satisfies verification step 4 for the pack part of S2: explicitly carried into
a named follow-up brief.

### Still open after batch 1

- To-discuss 4 — readability rules, and who approves each style.
- To-discuss 5 — likely settled (`0395`, `0405`, Q4, ADR-124 Q5); needs the owner's quick confirm.
- To-discuss 6 — A/B test through Yandex, or ship to all.
- To-discuss 2 and 3 (custom fonts) — technical, for the architect when a build is filed.
- The outcome — File / Park / Drop.
- The shared purchase-flow design task — kind, placement, and whether builds depend on it.

## 2026-10-24 — Batch 2: the shared purchase-flow task, readability, who sees a style, A/B or ship to all

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed, typos included. Recorded by a spawned `fkit-producer`.

### 1 — "The shared purchase-flow design task: where does it go, and do item builds wait for it?"

Owner picked, verbatim: **"Sprint 9, builds wait (Recommended)"** — option text: *"Architect-led design,
after the 6 talks. Future item builds (styles first, plus 0010/0011, already blocked) wait on it. Nothing
waits today."*

⇒ **Filed** as
[`0484`](../../backlog/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md)
on [Sprint 9](../../../sprints/plan-sprint-9.md), rank 17 (append), owner `fkit-architect`, `Depends on:`
nothing. Its work starts after the six talks (`0477`–`0482`), per the option text — an ordering note in
the brief, not a `Depends on:` line.
⇒ **Item builds wait on it.** `0010` and `0011` now name `0484` in their `**Depends on:**` lines (both were
already `🚧 Blocked`). The nickname-style build, if this talk ends in File, will also depend on `0484`.

### 2 — "How are nickname styles kept readable and approved?" (To-discuss 4)

Owner typed, verbatim (option 1 = **"Fixed set"** — *"a small set of colours and borders you approve once
on real maps. No free picker, no moderation."*):

> *"If there is already an implemented solution for that in the game (as for the patterns/flags), then I
> would like to reuse it. If not, hen option 1."*

⇒ **A CONDITIONAL ruling**, settled only in shape:
- **If** the game already has a readability / approval solution (as for patterns or flags) → **reuse it**.
- **If not** → **a fixed set**: a small set of colours and borders the owner approves once on real maps. No
  free colour picker, no moderation.
⇒ ⚠️ **OPEN — the fact it hinges on is NOT checked.** Whether such a solution exists for patterns or flags
is a technical check for the architect / coder **in the future build's investigation**. Not settled here,
and not to be guessed. (Context only, not an answer: flags and patterns are switched off today — `0010`,
`0011` — so a solution may exist in the code without being in use.)
⇒ The ★ icon and leaderboard badges must stay visible (the prose's hard rule) under either branch.

### 3 — "Confirm: a bought style shows to all players, with no extra check?" (To-discuss 5)

Owner picked, verbatim: **"Yes, shows to all (Recommended)"**.

⇒ **To-discuss 5 settled:** a bought style shows to every player in the match, with no extra identity
check — consistent with Q4 (no new verification gate) and ADR-124 Q5.

### 4 — "A/B test nickname styles, or ship to all?" (To-discuss 6)

Owner typed, verbatim:

> *"Ship to all, but with a feature flag that allows it to be switched off quickly, if needed (the "switch
> off" part should only take care about the visual elements, that users can see, the backend
> implementations should not be affected by it)"*

⇒ **To-discuss 6 settled — for nickname styles only.** No A/B test; ship to all players. The build carries
a **feature flag** that can switch styles off quickly. Switching off hides **only what players see** (the
styles on names, and — producer reading, to confirm in the build plan — the place to buy them); the
**backend is not affected** (purchases, grants and stored styles keep working and are kept).
⇒ ⚠️ **Not generalised.** This is a ruling for nickname styles. It is **not** a rule for other items;
each other talk asks its own.
⇒ The old prose's Yandex-experiments plan (*"Test via Yandex experiments API"*) is replaced for this item.

### Still open after batch 2

- **Answer 2's condition** — does a readability / approval solution already exist (patterns / flags)?
  For the build's investigation.
- To-discuss 2 (one shared name-drawing path?) and 3 (custom fonts) — technical, for the architect when a
  build is filed.
- **The final price** — about 499 Yan is a working figure (batch 1, answer 3).
- **The outcome — File / Park / Drop.** Put to the owner next.

## 2026-10-24 — Batch 3: the outcome, and what the feature flag hides

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Recorded by a spawned
`fkit-producer`.

### 1 — "Nickname styles: file the build, park it, or drop it?"

Owner picked, verbatim: **"File (Recommended)"** — option text: *"Investigation + build tasks on the
Backlog board; the build waits on them and on 0484 (Sprint 9). 0477 closes."*

⇒ **OUTCOME: File.** Verification step 1 met.

### 2 — "When the styles feature flag is off, should the 'buy a style' button be hidden too?"

Owner picked, verbatim: **"Yes, hide it too (Recommended)"** — option text: *"Flag off = no styles shown
and no way to buy. Backend and saved purchases stay untouched."*

⇒ **The batch-2 "producer reading, to confirm in the build plan" is now an OWNER RULING**, not a reading:
with the flag off, players see no styles **and** no place to buy one. The backend, the grants and saved
purchases are untouched and kept. The "to confirm" note in batch 2, answer 4, is superseded by this
answer (left in place as history).

### Filed (2026-10-24, with `/fkit-task-brief`, both on the Backlog board)

- **`0485`** — Investigation: is there one shared name-drawing path (match, leaderboard, post-match,
  diplomacy), and does a readability / approval solution already exist for patterns or flags that styles
  could reuse? Owner `fkit-architect`. `Depends on:` nothing.
  [`brief`](../../backlog/0485-investigate-nickname-styles-one-shared-name-drawing-path-and-a-reusable-readability-approval-solution/brief.md)
- **`0486`** — Build: nickname styles. Owner `fkit-coder`. `Depends on:` `0485`, `0484`. Carries every ruling
  of this talk (batches 1–3). To be split into smaller build briefs once `0485`'s findings are reviewed.
  [`brief`](../../backlog/0486-build-nickname-styles-paid-name-looks-behind-a-feature-flag/brief.md)

### How each question of the brief ended (verification step 4)

| Brief item | Ended as | Source |
|---|---|---|
| S1 — who may buy | **Answered:** any logged-in player; buying makes them a full paid citizen; a guest logs in first | batch 1, answers 1–2 |
| S2 — price, single style | **Answered (working figure):** about 499 Yan, above the 249 Yan floor; final price confirmed before ship → carried into `0486` | batch 1, answer 3 |
| S2 — price, pack | **Carried** into `0483` | batch 1, answer 4 |
| Conflict 1 — upsell only vs Q1 | **Answered:** Q1 wins, sold to everybody | batch 1, answer 1 |
| Conflict 2 — old prices below the floor | **Answered:** replaced by about 499 Yan (pack: `0483`) | batch 1, answers 3–4 |
| To-discuss 1 — who gets styles | **Answered** with S1 | batch 1, answer 1 |
| To-discuss 2 — one shared name-drawing path? | **Carried** into `0485` (technical) | — |
| To-discuss 3 — custom fonts reasoning | **Settled in part** (renderer is Canvas 2D — brief "Already settled"); the rest **carried** into `0485` as a note, out of V1 scope | brief; `0486` |
| To-discuss 4 — readability, who approves | **Answered (conditional):** reuse an existing solution, else a fixed set the owner approves once on real maps; the condition **carried** into `0485` | batch 2, answer 2 |
| To-discuss 5 — shows to others before trust | **Answered:** shows to all, no extra check | batch 2, answer 3 |
| To-discuss 6 — A/B or ship to all | **Answered:** ship to all behind a feature flag; flag off hides the styles and the buy entry point; backend untouched | batch 2, answer 4; batch 3, answer 2 |
| Shared purchase flow | **Filed** as `0484` (Sprint 9); `0486` depends on it | batch 2, answer 1 |
| 0019 R2 — own grant branch | **Carried** into `0486` | brief "Context for the future build task" |

**Placement check after filing** (run after the `0484` `Blocks:` re-point): `none (checked: plan-sprint-9.md)`. `plan-index.md` was skipped by the check (`identity unresolved`, exit 3) — it is the sprint index, not a board. The Backlog board renders `derive 0485 depends="nothing"`, `derive 0486 depends="0485, 0484"`. `0486` sits on
the Backlog board and waits on `0484` (Sprint 9, an earlier board) and `0485` (Backlog board); the Backlog
board gets no `depends-on-later-sprint` record, and no Sprint 9 task waits on either new brief.

**Next:** close this talk with `/fkit-task-done` (agent-closed — not owner-verified). Next talk in the
owner's order: `0478` (map voting).
