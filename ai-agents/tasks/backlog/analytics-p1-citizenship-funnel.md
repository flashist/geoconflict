# Task — Analytics P1: Citizenship Funnel Events

> **⚠️ READ THIS BEFORE STARTING ANY CITIZENSHIP UI TASK**
> This brief must be read before implementing `s4-start-screen-redesign-impl.md`, `s4-citizenship-xp-progress-ui.md`, `s4-citizenship-paid.md`, or `s4-citizenship-earned.md`. Analytics is not a post-ship addition — each event must be wired at the same time as the UI or server logic that triggers it. Shipping citizenship without this instrumentation means the first weeks of live data are lost and cannot be backfilled.

## Sprint
Sprint 4 — implement inside each citizenship UI task, not after

## Priority
High. Without this funnel, we cannot measure conversion, identify where players drop off, or validate whether the 99-ruble price point is working. These events are the primary signal for any pricing or UX decisions after launch.

## Dependencies
- `s4-start-screen-redesign-impl.md` — owns `Citizenship:Seen` and `UI:Tap:CitizenshipLoginToEarn`
- `s4-citizenship-xp-progress-ui.md` — owns `UI:Tap:CitizenshipBuy` and `UI:Tap:CitizenshipLearnMore`
- `s4-citizenship-paid.md` — owns `Purchase:Started:Citizenship`, `Purchase:Completed:Citizenship`, `Purchase:Abandoned:Citizenship`
- `s4-citizenship-earned.md` — owns `Citizenship:Earned:XP`

Each task above is responsible for implementing the events listed against it. This brief is the shared analytics spec — check it before writing any citizenship-related UI or server code.

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
| `CITIZENSHIP_CTA_BUY` | `UI:Tap:CitizenshipBuy` | Player taps the "Buy" / "99 рублей" button |
| `CITIZENSHIP_CTA_LEARN_MORE` | `UI:Tap:CitizenshipLearnMore` | Player taps a "Learn more" or details link |
| `CITIZENSHIP_CTA_LOGIN_TO_EARN` | `UI:Tap:CitizenshipLoginToEarn` | Player taps the Yandex login CTA shown to guest players |

Use the standard `UI:Tap` convention and `FlashistFacade.instance.logUiTapEvent()`. Register element IDs in `flashistConstants.uiElementIds`.

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

Add all six enum keys to `flashistConstants.analyticEvents` in `src/client/flashist/FlashistFacade.ts` and document them in `ai-agents/knowledge-base/analytics-event-reference.md` with the full event string, enum key, and firing condition.

No event strings inline anywhere — always through the enum.

---

## Verification

1. Load the start screen as a logged-in player — confirm `Citizenship:Seen` fires once when the citizenship card is visible. Switch to the Singleplayer tab (card hidden) — confirm it does not fire again.
2. Tap the Buy CTA — confirm `UI:Tap:CitizenshipBuy` fires before the payment dialog appears.
3. Tap Buy → complete a test purchase in Yandex sandbox → confirm `Purchase:Started:Citizenship` fires before dialog, `Purchase:Completed:Citizenship` fires only after server confirmation.
4. Tap Buy → cancel the Yandex dialog → confirm `Purchase:Abandoned:Citizenship` fires. Confirm `Purchase:Completed:Citizenship` does not fire.
5. Load the start screen as a guest player — confirm `UI:Tap:CitizenshipLoginToEarn` fires when the login CTA is tapped.
6. Trigger the earned citizenship path in a test environment (manually credit 1,000 XP) — confirm `Citizenship:Earned:XP` fires once at the server-side grant, not on each XP increment.
7. Confirm all enum keys and event strings appear in `ai-agents/knowledge-base/analytics-event-reference.md`.
