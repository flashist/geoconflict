# Task — Analytics P1: Citizenship Funnel Events

## ID
0021

> **⚠️ READ THIS BEFORE STARTING ANY CITIZENSHIP UI TASK**
> This brief must be read before implementing `0166-start-screen-redesign-impl`, `0191-citizenship-xp-progress-ui`, `0018-citizenship-paid`, or `0017-citizenship-earned`. Analytics is not a post-ship addition — each event must be wired at the same time as the UI or server logic that triggers it.
>
> ~~Shipping citizenship without this instrumentation means the first weeks of live data are lost and cannot be backfilled.~~
> **Refuted 2026-09-02 — nothing was lost.** Citizenship has not shipped to any player yet, so no
> collection window has opened, let alone closed. Every citizenship event sits behind the local
> compile-time gate `flashistConstants.features.CITIZENSHIP_CARD_ENABLED: false`
> (`src/client/flashist/FlashistFacade.ts:182`), which `CitizenshipCard.connectedCallback()` checks
> **first, before any analytics call or profile load** (`src/client/CitizenshipCard.ts:75-79` — it adds
> `hidden` and returns). **Zero citizenship events have ever fired, anywhere.** The wiring-at-the-same-
> time rule above still stands as guidance for `0017`/`0018`; the data-loss warning that used to
> justify it does not.

## Sprint
Sprint 4 — implement inside each citizenship UI task, not after

## Priority
High. Without this funnel, we cannot measure conversion, identify where players drop off, or validate whether the 99-ruble price point is working. These events are the primary signal for any pricing or UX decisions after launch.

## Status
✅ Done (agent-closed — not owner-verified)

> **Started 2026-09-02** on an owner ruling given live in session (Ruling C) — ruled `High` and
> time-critical, with a coder planning it in parallel. The task was **board-invisible until the same
> day**: it appeared in no sprint file, and a row was appended to
> [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) in the same pass.
>
> ~~⚠️ **Part of the intended instrumentation moment has already passed.** The banner above says each
> event must be wired *at the same time* as the UI or server logic that triggers it, because live data
> cannot be backfilled — and the Dependencies section below names `0166` and `0191` as owners of
> specific events. **Both `0166` and `0191` are `✅ Done`**, so those four events shipped, or did not
> ship, without this brief gating them. The remaining owners `0017` and `0018` are still open, so their
> events can still be wired at the right moment.~~
>
> **Corrected 2026-09-02 after a plan pass measured the tree — the urgency was false, and this task is
> now documentation reconciliation.** Owner-ruled the same day (R1). What was actually measured:
>
> - **No instrumentation moment passed, because none has opened.** The `CITIZENSHIP_CARD_ENABLED: false`
>   gate means no citizenship event has ever fired. Nothing to backfill.
> - **`0166`/`0191` closing stranded nothing.** **5 of the 6 events are already shipped, unit-tested and
>   documented**, wired with their UI exactly as this brief demanded. The 6th
>   (`UI:Tap:CitizenshipLearnMore`) is **dropped as obsolete** — see §2.
> - **No closing window on `0017`/`0018`.** Their events are already in the tree and tested, and both
>   briefs already record `0021` as *"a read-before-starting reference, not a gate"*.
>
> **What is left is this brief and the board, not code.** The point of the remaining work is to stop a
> stale brief re-triggering this same false alarm later.

## Owner
fkit-coder

## Dependencies
- `0166-start-screen-redesign-impl` — owns `Citizenship:Seen` and `UI:Tap:CitizenshipLoginToEarn` — **both shipped ✅**
- `0191-citizenship-xp-progress-ui` — owns `UI:Tap:PurchaseCitizenship` *(shipped name, was planned as `UI:Tap:CitizenshipBuy`)* — **shipped ✅** — and ~~`UI:Tap:CitizenshipLearnMore`~~ — **dropped as obsolete 2026-09-02 (R2), see §2**
- `0018-citizenship-paid` — owns `Purchase:Started:Citizenship`, `Purchase:Completed:Citizenship`, `Purchase:Abandoned:Citizenship` — **all three shipped ✅**
- `0017-citizenship-earned` — owns `Citizenship:Earned:XP` — **shipped ✅**

Each task above is responsible for implementing the events listed against it. This brief is the shared analytics spec — check it before writing any citizenship-related UI or server code.

> **As-built, measured 2026-09-02.** All five surviving events are implemented, unit-tested and
> documented in `ai-agents/knowledge-base/analytics-event-reference.md`. The ✅ marks above record
> *code shipped into the tree*, **not** *events observed live* — every one of them is still behind
> `CITIZENSHIP_CARD_ENABLED: false`, so none has fired for a real player yet. `0017` and `0018` remain
> open for their own reasons; this brief does not gate them, and both briefs already say so.

---

## Context

When citizenship UI launches, we need to measure the full funnel from first impression to conversion. Without these events, we will not know whether low conversion is a pricing problem, a proposition problem, a UX problem, or a reach problem. Retrofitting analytics after a feature ships delays the first data-informed decision by the length of a full sprint.

---

## Events to Implement

### 1. Citizenship surface seen

Fire when the citizenship card on the start screen is rendered and visible to the player.

| Enum key | Event string |
|---|---|
| `CITIZENSHIP_SURFACE_SEEN` | `Citizenship:Seen` |

Fire in the citizenship card component's render/mount path, after the card is guaranteed to be in the viewport. Do not fire if the card is rendered but hidden (e.g. wrong tab active).

---

### 2. Citizenship CTA tapped

Fire when the player taps any of the CTAs on the citizenship card. Use one event per CTA type.

| Enum key | Event string | When |
|---|---|---|
| `uiElementIds.purchaseCitizenship` | `UI:Tap:PurchaseCitizenship` | Player taps the "Buy" / "99 рублей" button *(corrected 2026-08-24: supersedes the planned `UI:Tap:CitizenshipBuy` — `0018` shipped the event 2026-08-24 under this name; see `flashistConstants.analyticEvents` and `analytics-event-reference.md`)* |
| ~~`CITIZENSHIP_CTA_LEARN_MORE`~~ | ~~`UI:Tap:CitizenshipLearnMore`~~ | **DROPPED as obsolete 2026-09-02 (owner ruling R2)** — see below |
| `uiElementIds.citizenshipLoginToEarn` | `UI:Tap:CitizenshipLoginToEarn` | Player taps the Yandex login CTA shown to guest players *(shipped enum key is `uiElementIds.citizenshipLoginToEarn`, not the planned `CITIZENSHIP_CTA_LOGIN_TO_EARN`)* |

Use the standard `UI:Tap` convention and `FlashistFacade.instance.logUiTapEvent()`. Register element IDs in `flashistConstants.uiElementIds`.

> **Why `UI:Tap:CitizenshipLearnMore` is dropped — do not re-add it.**
> **No Learn-more surface was ever designed.** This event was specified against a "Learn more" /
> details link that does not exist and never did: the shipped citizenship card has exactly three
> states — guest (lock + login CTA), authorized non-citizen (XP progress + buy CTA), and citizen
> (CITIZEN badge, bar full) — and there is no room in any of them for a fourth affordance. The event
> was spec'd for a UI that was not built, not stranded by a task that closed. A grep for
> `CitizenshipLearnMore` / `LEARN_MORE` / `learnMore` across `src/`, `tests/` and the analytics
> reference returns **nothing** (verified 2026-09-02).
>
> **Accepted cost, stated plainly: the funnel has no "researched it but didn't buy" signal.** We can
> see impression → CTA tap → purchase started → completed/abandoned, but we cannot distinguish a
> player who considered citizenship and declined from one who never engaged past the impression. If a
> Learn-more surface is ever designed, this event comes back **with** it — and only then.

---

### 3. Purchase flow started

Fire when the Yandex payment dialog is opened (i.e. when `ysdk.getPayments().purchase()` is called).

| Enum key | Event string |
|---|---|
| `PURCHASE_STARTED` | `Purchase:Started:Citizenship` |

Fire in the payment initiation path, before the async call returns. This is the last moment we control before the Yandex payment UI takes over.

---

### 4. Purchase completed

Fire after the game server has verified the signed purchase token and granted the entitlement — not on client-side payment success callback alone.

| Enum key | Event string |
|---|---|
| `PURCHASE_COMPLETED` | `Purchase:Completed:Citizenship` |

Fire in the client after receiving server confirmation of the entitlement grant. Do not fire on client-only callback — server verification is the authoritative signal.

---

### 5. Purchase abandoned

Fire when the player opens the payment dialog (`Purchase:Started:Citizenship`) but does not complete a purchase. Detected as: the `purchase()` call resolves or rejects without a corresponding `Purchase:Completed:Citizenship` within the same flow.

| Enum key | Event string |
|---|---|
| `PURCHASE_ABANDONED` | `Purchase:Abandoned:Citizenship` |

Handle both explicit cancellation (player closes the Yandex dialog) and failure (SDK error, timeout). Both count as abandoned from a funnel perspective.

---

### 6. Citizenship earned (XP path)

Fire when the player reaches the 1,000 XP citizenship threshold via the earned path.

| Enum key | Event string |
|---|---|
| `CITIZENSHIP_EARNED_XP` | `Citizenship:Earned:XP` |

Fire server-side when the XP credit that tips the player over the threshold is written, then surface to the client. Do not fire on the client's local XP display update alone — the server write is authoritative.

---

## Analytics Reference Updates

~~Add all six enum keys to `flashistConstants.analyticEvents`~~ — **corrected 2026-09-02 to as-built.**
**Five** events survive (the sixth is dropped, §2), and they live in **two** constant maps in
`src/client/flashist/FlashistFacade.ts`, not one:

| Constant map | Keys | Lines |
|---|---|---|
| `flashistConstants.analyticEvents` | `CITIZENSHIP_SURFACE_SEEN`, `CITIZENSHIP_EARNED_XP`, `PURCHASE_STARTED_CITIZENSHIP`, `PURCHASE_COMPLETED_CITIZENSHIP`, `PURCHASE_ABANDONED_CITIZENSHIP` | `:118`, `:122`, `:129-131` |
| `flashistConstants.uiElementIds` | `citizenshipLoginToEarn`, `purchaseCitizenship` | `:150`, `:152` |

All five are already documented in `ai-agents/knowledge-base/analytics-event-reference.md` with the
full event string, enum key, and firing condition — **done, not to do**.

No event strings inline anywhere — always through the enum.

---

## Verification

> **Rewritten 2026-09-02 to be executable and truthful (R1).** The original seven steps assumed a live
> Yandex session and a sandbox purchase, and **step 1 was not executable at all** — see the note at the
> end. As reconciliation, this task verifies **that the instrumentation is present and correct**, not
> that it fires in production; production observation belongs to the citizenship launch
> (`0017`/`0018`) and to `0065-citizenship-paid-live-verification`.

**Local, runnable today:**

1. **Automated coverage.** `npx jest tests/client/CitizenshipCard.test.ts tests/client/CitizenshipPurchase.test.ts tests/client/PlayerProfileView.test.ts` → **3 suites, 85 tests, all passing** (run 2026-09-02). These assert the firing conditions for all five surviving events, including the once-per-page-load behaviour of `Citizenship:Seen`.
2. **Enum presence.** Confirm the five keys exist in the two constant maps listed under *Analytics Reference Updates* above, and that no citizenship event string is written inline anywhere: `grep -rn "Citizenship:\|Purchase:.*:Citizenship" src/` should only hit `FlashistFacade.ts`.
3. **Reference doc parity.** Confirm all five enum keys and event strings appear in `ai-agents/knowledge-base/analytics-event-reference.md` under *Citizenship Events* / the `UI:Tap` table, and that `UI:Tap:CitizenshipLearnMore` appears **only** as the recorded-obsolete entry.
4. **Suppression case (replaces the old step 1 — see note).** Confirm the card is suppressed and **no** citizenship event fires when either gate is closed: the local `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` flag (checked first, absolutely, in `CitizenshipCard.connectedCallback()`), or the remote `citizenship_ui` Yandex experiment flag (checked after game init, with the degraded-mode carve-out). Covered by the suite in step 1.

**Deferred to the citizenship launch — not this task:**

5. Buy CTA → `UI:Tap:PurchaseCitizenship` before the payment frame opens; sandbox purchase → `Purchase:Started:Citizenship` then `Purchase:Completed:Citizenship` only after server confirmation; cancel → `Purchase:Abandoned:Citizenship` and no Completed. **Requires a Yandex Games context and a payments sandbox — cannot be done locally.** Owned by `0018` / `0065`.
6. Guest start screen → `UI:Tap:CitizenshipLoginToEarn` on login CTA tap. **Requires a real Yandex auth dialog.** Owned by `0018`.
7. Earned path (credit 1,000 XP) → `Citizenship:Earned:XP` once at the server-side grant. Owned by `0017`.

> **Why the original step 1 was unexecutable.** It said to *"switch to the Singleplayer tab (card
> hidden)"*, but the citizenship card is **not inside a tab panel**. `<citizenship-card>` sits
> **above** `<start-screen-tabs>` in both templates — `src/client/yandex-games_iframe.html:301` and
> `src/client/index.html:191` — outside `#multiplayer-tab-content`. Switching tabs never hides it, so
> the step could not be performed as written and could not have failed honestly. Replaced by step 4,
> which uses the real suppression case.

## Known Risk — Logged, Not Fixed (R3)

**`Citizenship:Seen` may under-count on a slow first paint.** Owner-ruled 2026-09-02: **log it, do not
fix it** — `CitizenshipCard.ts` is deliberately left untouched by this task.

`maybeReportSeen()` is called exactly once, from `connectedCallback()` after `await this.updateComplete`
(`src/client/CitizenshipCard.ts:114`, `:141-149`). It returns early without firing if
`isCardVisible()` is false at that single moment, and it is **never retried** — there is no observer,
no re-check on a later render. So if the card is not yet laid out when that one check runs (the Yandex
preload curtain still up, a slow first paint on a low-end device), the impression is **silently
dropped for that page load**. The module-scoped `citizenshipSeenReported` one-shot is correct for its
stated purpose — at most one event per page load — and is not itself the risk.

**Direction of error, stated so nobody reads the funnel wrong: `Citizenship:Seen` UNDER-counts, which
INFLATES every downstream conversion rate.** Every ratio with impressions in the denominator — tap
rate, purchase rate, earn rate — reads **better than reality** by however much this drops. It cannot
err the other way.

**This is unproven.** The drop has not been observed; it is a code-reading conclusion. Measuring it
needs a real Yandex Games context (the preload curtain is exactly what local dev lacks), so it cannot
be confirmed or ruled out until citizenship is live.

**Recommended follow-up — a separate brief, filed by the producer, informed by the first live day.**
Deliberately not filed here. The first day of real `Citizenship:Seen` volume is the cheapest evidence
of whether this matters at all; filing before that risks fixing a non-problem. Also recorded in
`ai-agents/knowledge-base/analytics-event-reference.md`.

> **Owner ruling 2026-09-02, at close: the follow-up brief STAYS UNFILED for now.** It waits for the
> first live day of real `Citizenship:Seen` volume before anyone judges whether it matters. This is a
> **recorded, deliberate non-filing** — not an oversight, and not a dropped thread. Whoever opens the
> citizenship funnel data for the first time should read this section before trusting any conversion
> rate on it.

## Notes

- **Depends on:** the four tasks named in the brief's `## Dependencies` section above (left unedited)
  — `0166-start-screen-redesign-impl`, `0191-citizenship-xp-progress-ui`, `0018-citizenship-paid` and
  `0017-citizenship-earned` — though that section states the relationship as ownership rather than
  blocking: each of those tasks is responsible for implementing the events listed against it, and this
  brief is the shared analytics spec they must read before writing any citizenship UI or server code.
  The Sprint field reinforces this, saying to implement inside each citizenship UI task, not after.
  Transcribed as the brief records it; `0196` did not re-scope the direction of the relationship. Full
  prose above; this bullet is the machine-readable form beside it.
