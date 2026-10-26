# Client: shared purchase core — offer rule, product purchase, coordinator, per-product restart popup (B2 of the shared purchase flow)

## ID
0494

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in sequence `0492`–`0498` from a highest existing ID
> of `0491` (all three boards, base-10). See `0492`'s brief for the full check.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"*. **RP-1** → **"Guide: keep 'Later' (Recommended)"**. Both quoted verbatim in the
> [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s §9.1.

## Priority
23

> ⚠️ Priority 23 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0493`**, because the spec's §11 lists it there and it runs in parallel with
> `0492`; `0495` waits on it. Appended after the board's highest rank (22), never inserted (ADR-035); no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified) *(2026-10-25 — closed via `/fkit-task-done` by a spawned `fkit-producer` at the CLOSE step of `/fkit-sprint-ship-loop` driven by `fkit-lead`; plan owner-approved 2026-10-24, full `npm test` 4981/4981, tsc and lint clean, local headless check showed the restart popup with both buttons, stateful review closed-out (R1 low, stale comment, fixed; re-check 180/180 + lint). Live purchase steps left to `0498`. Was ~~🔄 In progress~~. ⚠️ **Not committed, not deployed:** game deploy, with or after B1's (`0492`) profile-box deploy or alone, weekend slot; no visible change for players; live check is `0498`, after `0495` (B3).)*

> (Status until 2026-10-24) ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

Build **B2** of the approved shared purchase-flow design (task `0484`):
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md),
REVISION 2, **APPROVED 2026-10-24**. The spec is the design; this brief does not restate it.

- **Entry gate (§11):** spec approved — **met** (2026-10-24); RP-1 ruled — **met** (guide: the popup keeps "Restart
  now" and "Later"), so the restart-popup part no longer waits.
- **Ships by:** a game deploy. **No visible change for citizenship** (§11). Must tolerate a profile box without
  `becamePaidCitizen` (so it does not wait on `0492`'s deploy).
- Runs **in parallel** with `0492` (B1). `0495` (B3) follows it **in sequence**.
- **OD-1 / ADR-125:** the restart popup follows **every** completed purchase
  ([ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md)).

## What to build

Build B2 exactly as the spec's §11 row **B2** scopes it, using these sections:

- **§4.1** — the components marked **B2** (`ProductClientConfig.ts`, `PurchaseOffer.ts`, `ProductPurchase.ts`,
  `PurchaseCoordinator.ts` logged-in path, `PaymentsApiClient.ts` + test, the citizenship card/popup/purchase changes,
  `CitizenshipRestartOffer.ts` + modal, the facade's single-flight auth dialog), wired in `Main.ts`.
- **§4.3** — the logged-in steps and step 11 (one restart-offer dispatch after every grant).
- **§4.4** — progress states.
- **§5** — the client contracts (offer kinds incl. `cannot_verify` and `xp`, result enums, `PURCHASE_GRANTED_EVENT`).
- **§7** — failure rows for the logged-in path. **§9.1** — RP-1 (keep "Later").
- **§10** — the pure-rule, coordinator (logged-in rows), `ProductPurchase`, restart-offer, `PaymentsApiClient` and
  facade tests.
- **§12** — any analytics this part fires: enum entries in `FlashistFacade.ts` and
  `analytics-event-reference.md`; citizenship strings unchanged.

## Verification steps

1. The §10 tests for B2's components exist and pass, including: the existing `CitizenshipOffer` cases unchanged
   through the wrapper; `CitizenshipPurchase.test.ts` unchanged (same event strings); the restart event dispatched
   exactly once per grant, for every product, including `becamePaidCitizen === false`; never on `already_owned` or
   `error`; `openYandexAuthDialog` single-flight; 409 → `already_owned`.
2. The restart popup keeps both "Restart now" and "Later" (RP-1) and shows the product's own text; citizenship keeps
   *"Citizenship is active!"*.
3. A client against a box response with no `becamePaidCitizen` still completes a citizenship purchase (test).
4. Citizenship looks and behaves as before (no visible change) — checked by the existing tests plus a local run.
5. Any new visible text is in both `en.json` and `ru.json`; any new event is an enum entry and is in
   `analytics-event-reference.md`.
6. `npm test` is green (full run through the npm script — project lock).

## Notes

- **Depends on:** 0484, 0492 *(📌 `0492` added 2026-10-24 by a spawned `fkit-producer` at `0492`'s close, on an OWNER
  RULING given live via `AskUserQuestion` in the lead session on 2026-10-24, relayed by `fkit-lead` (driving
  `/fkit-sprint-ship-loop`); ⛔ not producer precedent. OP-1 → verbatim **"Wait for B1's build (Recommended)"**, option
  text *"B2 builds after B1 has landed its contract change (build only, not deploy). All in Sprint 9."* Waits on `0492`'s
  build, not its deploy.)*
- **Blocks:** 0495
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §4.1, §4.3, §4.4, §5, §7, §9.1 (RP-1), §10, §11 (B2), §12. Do not edit the spec from this task.
- **Deploy:** game, weekend slot unless urgent (owner rule); committed is not deployed.
- **Build vs verify:** no separate verify task in §11 — B2 has no visible change; its live behaviour is checked through
  `0498` (B5) after `0495`.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
