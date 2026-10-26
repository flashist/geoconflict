# Client: a guest's "Log in and buy" continues straight into the purchase — citizenship first (B3 of the shared purchase flow)

## ID
0495

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in sequence `0492`–`0498` from a highest existing ID
> of `0491` (all three boards, base-10). See `0492`'s brief for the full check.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"*. **OD-1** (skip the reload, restart guided after every purchase) and **OD-3** (**"Full flow, B3 + B4
> (Recommended)"**). All quoted verbatim in the
> [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s §9.1.

## Priority
24

> ⚠️ Priority 24 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0494`**, because it runs in sequence after it (§11) and `0498`, `0486`,
> `0010` and `0011` wait on it. Appended after the board's highest rank (23), never inserted (ADR-035); no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified) *(2026-10-26 — closed via `/fkit-task-done` by a spawned `fkit-producer` at the CLOSE step of `/fkit-sprint-ship-loop` driven by `fkit-lead`; built on the owner-approved plan (2026-10-25); stateful review 3 rounds, ledger `review.md` Status `closed-out` (R1, R2, R3 ✅ done; R4 accepted residual by owner ruling 2026-10-26); full `npm test` green 5166/5166 on re-run after one untraced flake (InternalPathCase, now tracked in `0500`). Guest path not checked live — that is `0498` (B5, Sprint 9). Related follow-up filed: `0501` (logged-in re-check, Backlog). Was ~~🔄 In progress~~. ⚠️ **Not committed, not deployed:** game client only, weekend slot, with or after B2 (`0494`).)*

> (Status until 2026-10-25) ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

Build **B3** of the approved shared purchase-flow design (task `0484`):
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md),
REVISION 2, **APPROVED 2026-10-24**. The spec is the design; this brief does not restate it.

- **Entry gate (§11):** OD-1 ruled + ADR recorded — **met**
  ([ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md):
  "Log in and buy" skips the login reload; the D3 reload moves to a non-grant end; every completed purchase ends in the
  restart prompt. It amends D3, `0273`/`0397` Q3).
- **Sequential after `0494` (B2)** — it extends B2's coordinator with the guest path.
- **Ships by:** a game deploy. Applied to **citizenship first**; item builds reuse it.
- **OD-3:** the item builds `0486`, `0010` and `0011` wait on this task and on `0496`.

## What to build

Build B3 exactly as the spec's §11 row **B3** scopes it, using these sections:

- **§4.3** — steps 3–8 and 12 (guest → login → continue; the deadline across all steps; the end-state table and
  hand-off).
- **§4.1** — the components marked **B3** (`PurchaseCoordinator.ts` guest path, `PaymentsReconciliation.ts`
  `reconcilePurchasesNow`, the facade's `refreshPaymentsAfterLogin`, the card and popup changes).
- **§4.4** — progress states and strings (en + ru), the "Log in and buy" label, "checking" during the read.
- **§5** — the coordinator contract and constants. **§7** — every guest-path failure row.
- **§10** — the coordinator rows for the guest path (deadline during each step, reconcile fail/timeout, `ensureSession`
  null, `error` hand-off, `needs_tap`, latch).
- **§12** — the `Purchase:Login:*`, `Purchase:Continue:*` and `Purchase:Blocked:*` events.
- **§15.2** items 1–3 — set in this build's plan.

## Verification steps

1. The §10 coordinator tests for the guest path exist and pass, including: guest buy → granted with no
   `requestLoginRestart`; deadline passing during `ensureSession`, during reconcile, and after `/intent` but before
   `purchase()` → `needs_tap` with no `purchase()` call; `ensureSession` null → `profile_unavailable`, no intent;
   `error` → hand-off after the delay or at once on surface close; a Buy tap inside the delay cancels the hand-off.
2. A guest who logs in but does not buy still gets the reload (D3 at a non-grant end), per ADR-125.
3. All new strings are in both `en.json` and `ru.json`; all new events are enum entries and are in
   `analytics-event-reference.md`; the citizenship purchase event strings are unchanged.
4. The plan names the `surfaceClosed` hook and the deadline/hand-off values it ships with (§15.2 items 1–3).
5. `npm test` is green (full run through the npm script — project lock).

## Notes

- **Depends on:** 0494
- **Blocks:** 0498, 0486, 0010, 0011
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §4.1, §4.3, §4.4, §5, §7, §10, §11 (B3), §12, §15.2. Do not edit the spec from this task.
- **ADR:** [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md).
- **Deploy:** game, weekend slot unless urgent (owner rule); committed is not deployed. `0498` waits on the deploy.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **Follow-up from `0494` (B2), 2026-10-25 — information only** *(added by a spawned `fkit-producer` at `0494`'s close, `/fkit-sprint-ship-loop` driven by `fkit-lead`; not a scope change):* B2's process-review found a stale reference in `ai-agents/knowledge-base/analytics-event-reference.md`, line 35 (the `LONG_SESSION_REFRESH_SHOWN` row): it names `runCitizenshipPurchase` as the Yandex payment flow. Since B2 that flow is `runProductPurchase`. B3 edits that doc anyway, so change that reference to `runProductPurchase` there.
