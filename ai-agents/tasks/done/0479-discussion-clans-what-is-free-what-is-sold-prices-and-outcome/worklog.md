# 0479 — worklog

## 2026-10-24 — Batch 1: worth building now, the founding fee, the tag

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed, typos included. Recorded by a spawned `fkit-producer`.

### 1 — "Clans: worth building at today's player numbers?" (brief: lobby health gate, To-discuss 2)

Owner picked, verbatim: **"Not now: Park (Recommended)"** — option text: *"Close the talk as Park, noting
what brings it back. Free tags keep working. Nothing waits on it."*

⇒ **Outcome: Park.** The talk is to close as Park. The free `[TAG]` system (`0152`) keeps working as it
does today. Nothing waits on this talk.
⇒ ⚠️ **Not yet recorded: what brings it back** (verification step 7). The Park close needs it. **Open.**

### 2 — "Should founding a clan cost money?" (brief: conflict 2, S2, To-discuss 1)

Owner typed, verbatim:

> *"I don't think so, I think this will be another feature that is free for ALL citizens (doesn't matter
> paid or not), but maybe there will be some limits to the "free" version of clans (e.g. limit of
> members, some decorations, etc.). Probably the clans themselves will be free to create (1 clan owner
> per 1 citizen), but going over initial small limit of players, buying decorations for the clan
> members, etc. will be paid and another list of items we can try to monetize on."*

⇒ **Founding fee: settled — free.** Conflict 2 (*"Does a small founding fee still make sense…?"*) is
answered: no founding fee. The old 99–149 ₽ fee from the prose is dropped.
⇒ **The owner's direction for clans when they return** — his own words are *"probably"* / *"maybe"*, so
this is a direction, not a final design:
- **Founding a clan is free for all citizens, paid or earned** (*"doesn't matter paid or not"*).
- **One clan owner per citizen** (*"1 clan owner per 1 citizen"*).
- **Paid items:** going over a **small member limit**, and **decorations** for the clan members
  (*"etc."* — the list is open).
⇒ **To-discuss 1 answered** on the product side: founding is a citizen perk (free for all citizens); the
paid parts are the extras.
⇒ ⚠️ **Not settled here:** who may buy the paid extras (S1 already says anyone, by the standing all-purchases
ruling), their prices (S2), and the member-limit size. Left open on purpose: the outcome is Park.
⇒ ⚠️ Gap to flag at close, not a ruling: founding is for citizens, so a guest or non-citizen cannot found a
clan. Whether they can *join* one was not asked.

### 3 — "Does the clan tag stay free?" (brief: conflict 1)

**Asked back, pending.** The owner replied with a question, verbatim: *"What is tag?"* That is not an
answer. `fkit-lead` is explaining it and will re-ask. **No ruling recorded. Conflict 1 stays open.**

### Status after batch 1

- **Not closed.** `0479` stays `🔄 In progress`. Two things are still needed before the Park close
  (`/fkit-task-done`): the **tag answer** (conflict 1, verification step 5) and **what brings clans back**
  (verification step 7).

## 2026-10-24 — Batch 2: the tag, what brings clans back, who may join, today's tags

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Typed text is quoted
exactly as relayed, typos included. Recorded by a spawned `fkit-producer`.

### 1 — "Does the simple clan tag (typing [ABC] in your name) stay free for everyone?" (conflict 1)

Owner typed, verbatim (asked after `fkit-lead` explained what a tag is — batch 1, question 3):

> *"I don't think we will enable tags anytime soon. The main purpose of them is to "identify" yourself
> with a clan, but when we have clans, we will pland and design and use  the tags system there. I don't
> think we will allow users to change the tags (only the owner of a clan will be able to do so)"*

### 2 — "What would bring clans back?" (verification step 7)

Owner picked, verbatim: **"Only when I say so"** — option text: *"No condition written down."*

### 3 — "When clans return, who can join one (as a member, not founder)?" (batch 1 gap)

Owner picked, verbatim: **"Citizens only"** — option text: *"Both founding and joining need citizenship."*

### 4 — "The code suggests [ABC] tags already group players in team matches today. What should we do?"

Context `fkit-lead` gave first: the code suggests tags are already on today — `src/core/Util.ts:329`
`getClanTag` reads `[ABC]` from a name, and `src/core/game/TeamAssignment.ts` puts same-tag players on one
team. **Not verified live:** the name filters (`0307` / `0308`) might strip the brackets.

Owner typed, verbatim:

> *"Check first, then decide. But if this logic is already there, we might reuse it in the future, when
> the current tags system is replaced with the new tags system."*

### What these settle — the owner's direction for clans when they return

A direction, not a final design (the clan system itself is parked):

- **Tags belong to the future clan system.** A tag is how a player shows which clan they are in; it will
  be planned and designed as part of clans (answer 1).
- **Only the clan owner can change a clan's tag.** Players do not set or change tags themselves
  (answer 1).
- **Joining a clan is for citizens only** — founding and joining both need citizenship (answer 3; founding
  was already *"free for ALL citizens"*, batch 1 answer 2). The batch-1 gap is closed.
- **What brings clans back: "Only when I say so."** No condition is written down. The old prose's
  lobby-health gate (*"only build clans when analytics shows lobbies are consistently filling"*) is
  replaced by the owner's own call (answer 2). Verification step 7 met.
- **Today's typed `[TAG]` logic may be reused** when the new tag system replaces it (answer 4). Any later
  removal must keep that logic reusable.

**Conflict 1 (the free tag) — resolved by answers 1 and 4.** The typed-in-the-name tag is not part of the
owner's plan for clans. Whether it is **live today** is not known; that goes to a check task, and the owner
decides afterwards whether to turn it off or leave it. ⚠️ Batch 1 answer 1's option text said *"Free tags
keep working"*; that was written on the assumption the tags work today. Answer 4 supersedes it: nothing is
switched off or kept by ruling until the check reports. Batch 1 is left in place as history.

### Filed (2026-10-24, with `/fkit-task-brief`, on the Backlog board)

- **`0487`** — Check: does typing `[ABC]` in a name really put players on one team in live team matches
  today, and is a player whose clan overflows a team silently dropped? Read-only, no code change. Owner
  `fkit-coder`. `Depends on:` nothing. Findings go back to the owner, who decides.
  [`brief`](../../backlog/0487-check-whether-a-clan-tag-in-a-name-puts-players-on-one-team-in-live-team-matches-today/brief.md)

### How each question of the brief ended (verification step 4)

| Brief item | Ended as | Source |
|---|---|---|
| Outcome | **Park** | batch 1, answer 1 |
| S1 — who may buy the paid clan parts | **Settled by the standing all-purchases rule** (anyone; a guest logs in first). Within clans, founding and joining are citizens only. Exact buyable items **left open on purpose** (Park) | brief "Standing ruling"; batch 1, answer 2; batch 2, answer 3 |
| S2 — prices | **Left open on purpose** (Park). Any price stays above 249 Yan (Q2) | batch 1, answer 2 |
| Conflict 1 — the free tag | **Resolved:** tags belong to the future clan system, clan owner only; today's live behaviour → check `0487`, owner decides after | batch 2, answers 1, 4 |
| Conflict 2 — founding fee | **Answered:** no fee; founding free for all citizens | batch 1, answer 2 |
| To-discuss 1 — citizen perk or separate product | **Answered:** founding (and now joining) is a citizen perk; extras (bigger member limit, decorations) paid | batch 1, answer 2; batch 2, answer 3 |
| To-discuss 2 — lobby-health numbers | **Answered:** no numeric gate; clans return **"Only when I say so"** | batch 2, answer 2 |
| To-discuss 3 — name-tag system or registered clan | **Answered (direction):** a registered clan with an owner who alone sets the tag; today's grouping logic may be reused | batch 1, answer 2; batch 2, answers 1, 4 |
| To-discuss 4 — wait on verified sessions | **Settled** (brief): `0340` done, `0395`, `0405`; Q4 adds no gate | brief "Already settled" |
| To-discuss 5 — safety rules / moderation for clan names and tags | **Answered in part:** only the clan owner can change a tag. The rest **carried** into `0487` as a note for the future clan design (its trace of today's name rules is the evidence that design needs); not answered by that check | batch 2, answer 1; `0487` Notes |
| To-discuss 6 — Yan or rubles; same catalog / flow | **Answered:** Yan, above 249 (Q2); one shared flow for all purchases (standing ruling). The Yandex-catalog part **carried** into `0484` (its scope names each product's catalog id) | brief; `0484` |
| Guest flag — can a guest buy? | **Carried** into `0484` (shared purchase flow) | brief "Standing ruling" |
| `0019` R2 — own grant branch | **Parked with the item**; already in `0484`'s scope (one grant branch per product) | `0484` |

### Verification steps 1–7, checked before the close

1. Outcome recorded, dated, with the owner's words — ✅ **Park**, batch 1 answer 1.
2. Who may buy — ✅ settled by the standing all-purchases rule; the exact items left open on purpose
   (Park), recorded in batch 1 and the table above.
3. Price — ✅ left open on purpose (Park), recorded in batch 1 and the table above.
4. Every "To discuss" question answered or explicitly carried — ✅ table above; none silently dropped.
5. Every conflict has a dated owner answer — ✅ conflict 1 (batch 2, answers 1, 4), conflict 2 (batch 1,
   answer 2).
6. File only — n/a (outcome Park). The one brief filed, `0487`, is a check of today's code, not a clan
   build.
7. Park: what brings it back — ✅ **"Only when I say so"** (batch 2, answer 2).

**Placement check after filing `0487`** (`/fkit-task-brief` step 9): `none (checked: plan-sprint-9.md)`.
`plan-index.md` was skipped by the check (`identity unresolved`, exit 3) — it is the sprint index, not a board.
The Backlog board renders `derive 0487 depends="nothing"`; no task names `0487` in its `Depends on:`.

**Next:** close this talk with `/fkit-task-done` as **Park** (agent-closed — not owner-verified). Next talk
in the owner's order: `0480` (coin economy + rewarded ads).
