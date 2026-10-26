# Durable items base: entitlements migration, item grant branch, private ownership on the owner view, already-owned refusal (B4 of the shared purchase flow)

## ID
0496

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in sequence `0492`–`0498` from a highest existing ID
> of `0491` (all three boards, base-10). See `0492`'s brief for the full check.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"*. **OD-2** → **"Private (Recommended)"**. **OD-3** → **"Full flow, B3 + B4 (Recommended)"**. All quoted
> verbatim in the [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s §9.1.

## Priority
25

> ⚠️ Priority 25 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0495`**, because the spec's §11 lists it there; it waits only on `0492`, and
> `0497`, `0486`, `0010` and `0011` wait on it. Appended after the board's highest rank (24), never inserted (ADR-035);
> no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified)

> (Status until 2026-10-25) ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

Build **B4** of the approved shared purchase-flow design (task `0484`):
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md),
REVISION 2, **APPROVED 2026-10-24**. The spec is the design; this brief does not restate it.

- **Entry gate (§11):** OD-2 ruled — **met** (private: only a confirmed (verified) login of that player sees which items
  they own; ADR-116 Decision 4 unchanged).
- **Standalone:** no real item id exists yet. Tested with a test-only product string, not added to
  `PAYMENT_PRODUCT_IDS` (§10).
- **Ships by:** a profile-box deploy + a game deploy (client parse).
- ⚠️ **Migration number and deploy order.** The migration takes the **next free number after `0491`'s `009`** —
  `010` today; check `migrations/` at build time (spec §4.1, review F2). **Deploy to the profile box only after
  `0491`'s migration `009` is deployed.**
- **OD-3:** the item builds `0486`, `0010` and `0011` wait on this task and on `0495`.

## What to build

Build B4 exactly as the spec's §11 row **B4** scopes it, using these sections:

- **§4.1** — the components marked **B4** (the `<next free>_player_entitlements.sql` migration, `PaymentsRepository.ts`
  `durable_item` branch factory and the `becamePaidCitizen` inbox rule, `Routes.ts` `/intent` 409 for verified callers,
  `src/core/profile/PlayerProfile.ts`, `PublicProjection.ts`, `PlayerProfileView.ts`, the card snapshot).
- **§5** (incl. **§5.3**) — the owned rule by kind, the `entitlements` schema, the `/intent` already-owned refusal.
- **§6** — data and state. **§7** — the ownership and privacy rows.
- **§10** — *B4 standalone*: `durableItemGrant()` unit-tested and run against real Postgres; the pure
  `intentRefusal(kind, isOwned, callerVerified)`; `PlayerProfile.ts` schema tests; `PublicProjection` tests.

## Verification steps

1. The migration exists with the next free number after `009` and applies cleanly in `npm run test:integration`
   (which rebuilds the test schema from all migrations).
2. `durableItemGrant()` tests pass, unit and against real Postgres, using a test-only product string — and
   `PAYMENT_PRODUCT_IDS` is unchanged (citizenship only).
3. `intentRefusal` tests pass over a durable kind: 409 only for a verified caller who owns the item.
4. `src/core` change is tested: `entitlements` is present on the owner (verified) view schema and absent on the
   unverified schema.
5. `PublicProjection` tests: no `entitlements` and no item inbox message on the unverified view.
6. `PlayerProfileView` parses `entitlements`; missing → unknown (`null`).
7. `npm test` and `npm run test:integration` are green (through the npm scripts).
8. ⚠️ Named, accepted residual (§10): the **route** path of the 409 is first exercised end to end by the first item
   build. Record it in the worklog; it is not a gap of this task.

## Notes

- **Depends on:** 0492
- **Blocks:** 0497, 0486, 0010, 0011
- **Deploy order:** profile box **after `0491`** (migration `009`) — a deploy-order constraint, not a build dependency,
  so it is not on the `Depends on:` line. Weekend slot unless urgent (owner rule); committed is not deployed. `0497`
  waits on the deploy.
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §4.1, §5, §5.3, §6, §7, §10, §11 (B4). Do not edit the spec from this task.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
