# Design the Shared Purchase Flow — a Guest Logs In, Then Goes Straight Into the Purchase (task 0484)

**Source**: `ai-agents/tasks/done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md` (its `worklog.md`, the spec `ai-agents/knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md` and ADR-125 read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 17 (ADR-035 append rank; on merit directly below `0482`) / task `0484` / owner `fkit-architect`

> ✅ Closed 2026-10-24 by a spawned `fkit-producer` on the owner ruling *"Producer writes it, closes (Recommended)"*.
> **A design, no code.** Spec approved by the owner 2026-10-24 (**"Approve (Recommended)"**, REVISION 2).

## Goal

Design **once** the purchase flow every paid item will reuse, meeting the owner's rule for all purchases (`0477`,
batch 1 answer 2 — [[decisions/paid-items-purchase-rules]]): anyone may buy, buying makes the buyer a full paid
citizen, a guest logs in first, and after the login the purchase continues with no extra popup or step *"if
possible"*. Filed on the owner ruling **"Sprint 9, builds wait (Recommended)"** (2026-10-24).

## Key Changes

**Part 1 — fact-check:**
- **(a) Can a purchase start right after login, same page, no reload, no extra tap?** *"Probably yes"* —
  **documented only.** The Yandex docs neither forbid it nor force a reload; today's reload after login is our own
  choice (D3). Still unverified: that the payment window opens after `await`s without a fresh tap, and that a payments
  object fetched as a guest works after login (the design re-fetches it). The signed purchase does **not** name the
  buyer's Yandex id.
- **(b) What does the `0301` popup do after a guest logs in today?** It **reloads the page**; the purchase does not
  continue; the player must find Buy again — **verified by code trace and unit tests, not live**. In the no-reload
  fallback the popup re-renders with Buy, but the guest **Log in** button stays visible until the read lands (no
  "checking" state).

**Part 2 — the spec** (`reports/2026-10-24-design-shared-purchase-flow.md`): components, contracts and stubs, the
end-to-end guest flow, the failure table, analytics, a reuse map and a build split. Summarised on
[[systems/shared-purchase-flow]].

**Owner rulings (2026-10-24, live `AskUserQuestion`, relayed by `fkit-lead`):**
- **OD-1** — skip the reload for "Log in and buy", plus a restart prompt after every completed purchase → recorded as
  **ADR-125** ([[decisions/adr-125-log-in-and-buy-skips-reload]]).
- **OD-2** — **"Private (Recommended)"**: only a verified login of that player sees which items they own.
- **OD-3** — **"Full flow, B3 + B4 (Recommended)"**: item builds (`0486`, later `0010`/`0011`) wait on B3 + B4, not on
  this design.
- **OD-4** — *"All should move to the current sprint"*: B1–B5, B1v, B4v all on Sprint 9, overriding the usual "verify
  task at the top of the next sprint" rule **for these tasks only**.
- **RP-1** — **"Guide: keep 'Later' (Recommended)"**.
- Spec approval also confirmed OQ-2 (keep the `0303` popup) and OQ-3 (kill switch off ⇒ no sales).

**Reviews:** producer (scope) and coder (buildable) reviews, findings F1–F15 and P1–P10, all accepted (F15 with a
different placement: the auth-dialog latch goes in the facade, not the coordinator) — spec §16.

## Outcome

**Build tasks filed** (all Sprint 9): `0492` B1 ([[tasks/purchase-grant-registry]]), `0493` B1v, `0494` B2
([[tasks/purchase-core-client]]), `0495` B3 ([[tasks/guest-log-in-and-buy]]), `0496` B4
([[tasks/durable-items-entitlements]]), `0497` B4v, `0498` B5. By 2026-10-26 the four builds are closed (agent-closed),
committed, **not deployed**; the three verify tasks are `🔲 Backlog`.

Open for the builds/B5, not the owner: the auto-continue deadline (15 s proposed, set from B5's measured time), the
hand-off delay (5 s), and a `consumable` kind (coins) — designed only if `0480` comes off hold.

## Related

- [[systems/shared-purchase-flow]] — what this design produced
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — the ADR recorded here
- [[decisions/paid-items-purchase-rules]] — the owner rules this design serves
- [[tasks/nickname-styling-talk]] — task `0477`, where this task was asked for
- [[tasks/citizenship-explainer-popup]] — task `0301`, fact-check (b)
- [[tasks/yandex-payments-implementation]] — task `0019`, the pipeline and the R2 guard
- [[tasks/purchase-grant-registry]] — B1
- [[tasks/purchase-core-client]] — B2
- [[tasks/guest-log-in-and-buy]] — B3
- [[tasks/durable-items-entitlements]] — B4
- [[decisions/sprint-9]] — the board (rank 17)
- [[tasks/stop-consuming-design]] — task `0505`, 2026-10-26: supersedes this design's "consume after grant" for permanent products (ADR-126)
