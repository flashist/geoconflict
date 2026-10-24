# Design the shared purchase flow — a guest logs in, then goes straight into the purchase (for every paid item)

## ID
0484

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0483`. `0484`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Sprint 9

> 📌 **Filed on an OWNER RULING of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. Asked *"The shared purchase-flow design task: where does it go, and
> do item builds wait for it?"*, the owner picked, verbatim, **"Sprint 9, builds wait (Recommended)"** — option text:
> *"Architect-led design, after the 6 talks. Future item builds (styles first, plus 0010/0011, already blocked) wait on
> it. Nothing waits today."* Recorded in
> [`0477`'s worklog](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md), batch 2.

## Priority
17

> ⚠️ Priority 17 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0482`**, because the owner's option text says the design comes *"after the 6
> talks"* (`0477`–`0482`), and `0482` is the last of them — which is exactly where the append put it. Appended after the
> board's highest rank (16), never inserted (ADR-035); no row renumbered.

## Status
🔄 In progress *(2026-10-24 — set by `fkit-lead` driving `/fkit-sprint-ship-loop`; OWNER RULING via `AskUserQuestion`: "0484 + 0488 in parallel (Recommended)".)*

> (Status until 2026-10-24) ~~🔲 Backlog~~

## Owner
fkit-architect

## Context

**Why this task exists.** In the nickname-styling talk `0477` (batch 1, answer 2) the owner set one rule for **every**
purchase and asked for the flow to be designed once. Owner, verbatim:

> *"#1, but generally speaking, we should have the same rules for ALL purchases: allowed to all, gives paid
> citizenship, if it's a guest - we're asking to log in (ideally, after login we should make a seamless transition to
> the purchase flow without additional popups or steps, if possible). This flow is worth additional discussion with
> producer/architect/coder, to design it well from the go-start, because it will be reused for all purchases."*

(*"#1"* = the option **"Ask to log in first (Recommended)"**. Source:
[`0477` worklog](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md), batch 1.)

**In plain words.** Today only citizenship is sold. More paid items are coming (nickname styles first, then maybe
flags, patterns, and others from the talks `0478`–`0482`). Each one must follow the same rules:
1. **Anyone may buy** — paid citizen, unpaid citizen, non-citizen, guest.
2. **Buying makes the buyer a full paid citizen** (`0343` Q2; includes no interstitial ads, `0248`).
3. **A guest is asked to log in first** (with Yandex). No guest-only purchase.
4. **Ideally, after the login, the player goes straight on into the purchase** — no extra popup, no extra step — *"if
   possible"*.

This task designs that flow **once**, so each item's build reuses it instead of re-solving it.

**When.** The owner's option text says *"after the 6 talks"* (`0477`–`0482`). The talks may add requirements (e.g. a
coin economy, `0480`). That is an ordering note, **not** a `Depends on:` line: nothing here is blocked by them.
*(📌 **Updated 2026-10-24 — voting no longer gates this task.** OWNER RULING given live via `AskUserQuestion` in the
lead's Claude Code session on 2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a
spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Asked *"Voting is on hold.
Should the purchase-flow design (0484) still wait for it?"*, the owner picked, verbatim, **"Don't wait for voting
(Recommended)"** — option text: *"0484 starts after the talks still on Sprint 9. Nothing else changes."* ⇒ The
voting talk `0478` (moved to the Backlog board, ON HOLD, 2026-10-24) is out of this ordering note. This task starts
after the talks still on Sprint 9 — `0479`–`0482` (`0477` closed 2026-10-24). Still an ordering note, not a
`Depends on:` line.)*

**What is already known (context, not checked this turn):**
- **The citizenship popup `0301`** ([brief](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md))
  already has a guest-login path and a buy path through `CitizenshipCard.ts`, plus one shared rule for what a player
  is offered (`CitizenshipOffer.ts`, `deriveCitizenshipOffer()` — buy, log in, or nothing) that holds the
  double-charge guard. Per the wiki page *citizenship-explainer-popup*, *"guest login from the popup inside Yandex"*
  was moved to the live check `0401` and the owner saw *"guest login runs"*. **What happens right after a guest logs
  in from it — does the purchase continue, does the popup close, is a reload needed — was not checked.** That is
  fact-check (b) below.
- **Payments `0019`** ([brief](../../done/0019-yandex-payments-impl/brief.md)): purchase intent → Yandex purchase →
  signed completion → grant on the profile server, plus a reconcile pass on session start.
- ⚠️ **The 0019 R2 guard binds every new product.** Review R2, owner ruling 2026-08-14 *"guard now"*: the profile
  server's paid-purchase grant **refuses any product other than citizenship, and throws**. So **each new product gets
  its own grant branch**, and under Q2 **that branch must also make the buyer a full paid citizen**. The design must
  say how a new product's branch is added (and tested) without loosening the guard for unknown products.
- **Related login tasks — context, not dependencies** (all `🔲 Backlog`, Backlog board):
  - [`0474`](../0474-investigate-why-about-2-3-percent-of-logged-in-loads-get-no-profile-login-timeouts/brief.md) —
    about 2–3 % of logged-in loads get no profile (login timeouts). A "logged in but no profile yet" state the flow
    must handle.
  - [`0394`](../0394-re-login-when-a-player-switches-yandex-accounts/brief.md) — re-login when a player switches Yandex
    accounts. The flow must not grant to the wrong account.
  - [`0070`](../0070-token-login-modal-silent-failure/brief.md) — the token login modal fails silently. A failed login
    must not leave the player stuck mid-purchase with no message.
- **Guests are a large share of players**: 58.2 % of all match starts, 2026-10-08 → 2026-10-10 (`0405`). A login
  step that loses them costs real sales.

## What to build

**A design, not code.** Two parts, in order.

### Part 1 — fact-check (short, first)

Answer these before designing, each marked **verified** (live test or code trace, with the file or test named) or
**documented only** (Yandex docs, with the page named):

- **(a)** In Yandex Games, can a purchase start **right after login**, in the same session, **with no page reload and
  no extra popup or tap** from the player? If not, what is the least the platform forces (a reload, a user tap before
  `purchase()`, anything else)?
- **(b)** What does the `0301` citizenship popup do **today** after a guest logs in from it? (Stays open, closes, shows
  Buy, starts the purchase, reloads the page, re-reads the profile — and how long the "checking" state lasts.)

If (a) shows the seamless continue is **not possible**, say so plainly and design the smallest flow that is — the
owner's *"if possible"* allows it. Do not promise a seamless step the platform cannot give.

### Part 2 — one design spec

Write it with `/fkit-design-spec` (saved to `ai-agents/knowledge-base/reports/`). It covers at least:

- The flow, **product-agnostic**: any item, any buyer type (guest, non-citizen, unpaid citizen, paid citizen),
  guest → login → continue into the purchase → grant → full paid citizen → the UI updates without a reload.
- How an item build **plugs in**: what a new product supplies (catalog id, grant branch, UI entry point) and what it
  reuses.
- The **grant side**: per the 0019 R2 guard, one grant branch per product, each also making the buyer a full paid
  citizen; unknown products still refused.
- **Failure and edge cases**: login cancelled or failed (`0070`); logged in but profile not loaded (`0474`); account
  switch (`0394`); purchase cancelled; a purchase that completes but whose grant is delayed (reconcile); the
  double-charge guard (buying something already owned; a paid citizen buying an item — still allowed, item granted).
- **Analytics** for each step, named per `ai-agents/knowledge-base/analytics-event-reference.md` (the spec proposes;
  the build adds them).
- What can be **reused from `0301` / `0019`** and what must change, with file paths.
- A **proposed split** into build tasks (smallest shippable units), for the producer to file.

**Review and approval:** the spec is reviewed by **fkit-producer** (scope: does it meet the owner's four rules?) and
**fkit-coder** (buildable as written?), then **approved by the owner**. Record each review and the approval in this
folder's `worklog.md`.

## Verification steps

1. Part 1's answers (a) and (b) are written in the spec (or a findings report it links), each marked **verified** or
   **documented only**, with its source named.
2. One design spec exists under `ai-agents/knowledge-base/reports/` and covers every bullet in Part 2.
3. `worklog.md` records a **producer review** and a **coder review** (findings and how each was settled), dated.
4. `worklog.md` records the **owner's approval** of the spec, dated, with his words.
5. The proposed build tasks are filed by the producer with `/fkit-task-brief`, each with canonical `**Depends on:**`
   lines; their IDs are listed in the worklog.
6. No connection strings, endpoints, keys or other secrets appear in the spec, the report or the worklog.

## Notes

- **Depends on:** nothing
- **Blocks:** 0010, 0011 (owner ruling 1, 2026-10-24: *"Future item builds … wait on it"*); and the nickname-style
  build from `0477` — filed 2026-10-24 as [`0486`](../0486-build-nickname-styles-paid-name-looks-behind-a-feature-flag/brief.md)
  (`0477` ended in File)
- **Ordering, not a dependency:** starts after the six talks `0477`–`0482` (owner option text *"after the 6 talks"*).
  *(📌 Updated 2026-10-24: now **after the talks still on Sprint 9** — `0479`–`0482`; `0477` is closed. The voting
  talk `0478` (Backlog board, ON HOLD) no longer gates it. Owner ruling, verbatim: **"Don't wait for voting
  (Recommended)"** — *"0484 starts after the talks still on Sprint 9. Nothing else changes."* See **When.** above.)*
- **Placement check (2026-10-24):** `0010` and `0011` sit on the Backlog board and now wait on this Sprint 9 task. That
  is a wait on an **earlier** board, not a later one; the Backlog board gets no `depends-on-later-sprint` record. See
  the Sprint 9 addendum of the same date.
- **Related:** [`0477`](../../done/0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/brief.md) (where the
  ruling came from), [`0301`](../../done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md),
  [`0019`](../../done/0019-yandex-payments-impl/brief.md), [`0248`](../../done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  `0474`, `0394`, `0070`, [`0483`](../0483-discussion-nickname-style-pack-offer-whether-to-sell-one-and-at-what-price/brief.md)
  (a pack is a purchase too).
- **Split rationale:** one task, not two. The fact-check ships nothing on its own; it only shapes the spec, and the
  owner asked for one design task.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
