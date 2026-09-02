# Analytics P1 — Citizenship Funnel Events

**Source**: `ai-agents/tasks/done/0021-analytics-p1-citizenship-funnel/brief.md` (plus `worklog.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0021 / analytics P1 — the shared citizenship funnel spec

> 🔧 **This task's founding premise was DISPROVED by the task itself (2026-09-02), and that correction
> is the page's main content.** The brief had warned, in a read-this-first banner, that *"shipping
> citizenship without this instrumentation means the first weeks of live data are lost and cannot be
> backfilled."* **Nothing was lost.** No collection window has ever opened, so none closed. The
> warning is struck in the brief itself, not deleted.

## Goal

Be the one shared analytics spec for the whole citizenship funnel — surface seen → CTA tapped →
purchase started → completed/abandoned → XP earned — so conversion, drop-off and the 99-ruble price
point can be measured rather than guessed. The brief's standing instruction is that each event is
wired **at the same time** as the UI or server logic that triggers it, never retrofitted.

**That instruction still stands as guidance for `0017` and `0018`. The data-loss argument that used
to justify it does not.**

## Key Changes

**No code shipped from this task. It is documentation reconciliation**, ruled so by the owner on
2026-09-02 (R1) after a plan pass measured the tree and found the urgency false.

What the measurement found:

- **Zero citizenship events have ever fired, anywhere.** Every one is gated by the local
  compile-time flag `flashistConstants.features.CITIZENSHIP_CARD_ENABLED: false`
  (`src/client/flashist/FlashistFacade.ts:182`), which `CitizenshipCard.connectedCallback()` checks
  **first, before any analytics call or profile load** — it adds `hidden` and returns
  (`src/client/CitizenshipCard.ts:76-79`). Verified against the source. See
  [[tasks/hide-citizenship-card-flag]] for the flag itself.
- **5 of the 6 specified events were already shipped, unit-tested and documented**, wired with their
  UI exactly as the brief demanded. `0166` and `0191` closing stranded nothing.
- **The 6th event is dropped as obsolete** — see below.
- **No closing window on `0017`/`0018`.** Their events are already in the tree and tested, and both
  briefs already record `0021` as *"a read-before-starting reference, not a gate"*.

**As-built enum locations — the five surviving events live in *two* constant maps, not one**
(`src/client/flashist/FlashistFacade.ts`, verified 2026-09-02):

| Constant map | Keys | Lines |
|---|---|---|
| `flashistConstants.analyticEvents` | `CITIZENSHIP_SURFACE_SEEN`, `CITIZENSHIP_EARNED_XP`, `PURCHASE_STARTED_CITIZENSHIP`, `PURCHASE_COMPLETED_CITIZENSHIP`, `PURCHASE_ABANDONED_CITIZENSHIP` | `:118`, `:122`, `:129-131` |
| `flashistConstants.uiElementIds` | `citizenshipLoginToEarn`, `purchaseCitizenship` | `:150`, `:152` |

All five are documented in `ai-agents/knowledge-base/analytics-event-reference.md` with event string,
enum key and firing condition — **done, not to do**. Two names in the original spec were superseded
by what actually shipped: `UI:Tap:CitizenshipBuy` → `UI:Tap:PurchaseCitizenship` (corrected
2026-08-24), and `CITIZENSHIP_CTA_LOGIN_TO_EARN` → the `uiElementIds.citizenshipLoginToEarn` key.

### 🚫 `UI:Tap:CitizenshipLearnMore` is DROPPED as obsolete — do not re-add it

Owner ruling R2, 2026-09-02. **No Learn-more surface was ever designed.** The event was specified
against a "Learn more" / details link that does not exist and never did: the shipped citizenship card
has exactly three states — guest (lock + login CTA), authorized non-citizen (XP progress + buy CTA),
and citizen (CITIZEN badge, bar full) — with no room for a fourth affordance. **It was spec'd for a
UI that was not built; it was not stranded by a task that closed.** A grep for
`CitizenshipLearnMore` / `LEARN_MORE` / `learnMore` across `src/` and `tests/` returns nothing
(re-verified during this ingest, 2026-09-02).

**Accepted cost, stated plainly: the funnel has no "researched it but didn't buy" signal.** The chain
runs impression → CTA tap → purchase started → completed/abandoned, so a player who considered
citizenship and declined is indistinguishable from one who never engaged past the impression. If a
Learn-more surface is ever designed, the event returns **with** it — and only then.

## Outcome

**Closed 2026-09-02, agent-closed — not owner-verified.** The task's whole product is a corrected
brief, a corrected board row and a corrected analytics reference. Its stated purpose after the
correction was *"to stop a stale brief re-triggering this same false alarm later"* — which is the
reason this page carries the disproof so prominently.

**Verification was rewritten to be executable and truthful (R1).** The original seven steps assumed a
live Yandex session and a sandbox purchase, and **step 1 was not executable at all**: it said to
switch to the Singleplayer tab so the card is hidden, but `<citizenship-card>` sits **above**
`<start-screen-tabs>` in both templates (`src/client/yandex-games_iframe.html:301`,
`src/client/index.html:191`), outside `#multiplayer-tab-content`. Switching tabs never hides it, so
the step could not be performed as written and **could not have failed honestly**. It was replaced by
a suppression check against the real gates.

What actually ran: `tests/client/CitizenshipCard.test.ts`, `CitizenshipPurchase.test.ts` and
`PlayerProfileView.test.ts` — **3 suites, 85 tests, all passing** (2026-09-02). Steps needing a real
Yandex Games context and a payments sandbox are **deferred to the launch**, owned by `0018`, `0017`
and `0065`.

### 🚨 Known risk, logged and deliberately NOT fixed — `Citizenship:Seen` may under-count

Owner ruling R3, 2026-09-02: **log it, do not fix it.** `CitizenshipCard.ts` was left untouched by
this task on purpose.

`maybeReportSeen()` is called exactly once, from `connectedCallback()` after `await
this.updateComplete` (`src/client/CitizenshipCard.ts:114`, defined `:141-149`). If `isCardVisible()`
is false at that single moment — the Yandex preload curtain still up, or a slow first paint on a
low-end device — it returns without firing and is **never retried**: there is no observer and no
re-check on a later render, so the impression is silently dropped for that page load. The
module-scoped `citizenshipSeenReported` one-shot is correct for its stated purpose (at most one event
per page load) and is **not** itself the risk.

**Direction of error, so nobody reads the funnel wrong: this UNDER-counts impressions, which
INFLATES every downstream conversion rate.** Tap rate, purchase rate and earn rate all carry
impressions in the denominator, so each reads **better than reality** by however much is dropped. It
cannot err the other way. **Treat citizenship conversion percentages as an upper bound until this is
measured.**

**Unproven.** This is a code-reading conclusion, not an observation. Confirming or ruling it out needs
a real Yandex Games context — the preload curtain is precisely what local dev lacks — so it cannot be
settled before citizenship goes live.

📌 **The follow-up brief is deliberately UNFILED, owner-ruled at close.** It waits for the first live
day of real `Citizenship:Seen` volume before anyone judges whether it matters at all; filing before
that risks fixing a non-problem. This is a **recorded, deliberate non-filing — not an oversight and
not a dropped thread.** Whoever opens the citizenship funnel data for the first time should read this
section before trusting any conversion rate on it.

### Board history

The task was **board-invisible until 2026-09-02** — its brief had read `## Sprint: Sprint 4` since
filing, but it appeared in no sprint file at all. A row was appended to `plan-sprint-4.md` the same
day, on owner Ruling A. The brief also **moved `ai-agents/tasks/backlog/` → `ai-agents/tasks/done/`**
in that pass.

## Related

- [[systems/analytics]] — the funnel events, their firing conditions and the same under-count caveat
- [[tasks/hide-citizenship-card-flag]] — task 0054, the `CITIZENSHIP_CARD_ENABLED` gate that is why zero events have fired
- [[tasks/monetization-analytics-spec]] — the P0/P1 measurement plan this funnel is the P1 half of
- [[tasks/start-screen-redesign-implementation]] — task 0166, which shipped `Citizenship:Seen` and `UI:Tap:CitizenshipLoginToEarn`
- [[tasks/citizenship-xp-progress-ui]] — task 0191, which shipped `UI:Tap:PurchaseCitizenship`
- [[tasks/yandex-payments-implementation]] — task 0019, which registered the purchase-event constants
- [[decisions/sprint-4]] — the sprint board this task was made visible on
