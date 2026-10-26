# Profile Box: Product-Grant Registry, `becamePaidCitizen`, Per-Entry Reconcile — B1 (task 0492)

**Source**: `ai-agents/tasks/done/0492-profile-box-product-grant-registry-becamepaidcitizen-and-per-entry-reconcile-b1/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 21 (ADR-035 append rank; on merit directly below `0484`) / task `0492` / build B1 of the shared purchase flow

> ✅ Closed 2026-10-24. Plan owner-approved 2026-10-24 (**OQ-1** *"Yes, add it now (Recommended)"* → build
> `failedCount`; **OQ-2** *"Leave it out (Recommended)"* → `becamePaidCitizen` omitted on a replay). `npm test`
> 4885/4885, `npm run test:integration` 193/193, stateful review closed with no findings.
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `a3c32b4`; `git tag --contains` → none ⇒ NOT deployed.** The brief's
> own "Not committed" note predates that commit. Live check: `0493` (B1v, Sprint 9, `🔲 Backlog`).

## Goal

The server half of the shared purchase flow's foundation ([[systems/shared-purchase-flow]], spec §4.1/§5/§6/§10): every
product's grant also makes the buyer a full paid citizen, **structurally**, while unknown products are still refused.

## Key Changes

- `src/core/profile/PaymentsContract.ts` — `PRODUCT_DEFINITIONS` (`kind`: `citizenship` | `durable_item`);
  `PAYMENT_PRODUCT_IDS` stays the one list (citizenship only); optional `becamePaidCitizen` on the `/complete` reply.
- `src/profile-server/PaymentsRepository.ts` — `PRODUCT_GRANTS` registry typed over the id union (no branch ⇒ no
  compile); own-property lookup, a miss **throws** (`0019` R2 kept). The shared transaction always writes the paid
  flags and reads whether the buyer was already paid.
- `src/profile-server/Routes.ts` — `/complete` returns `becamePaidCitizen` on a fresh grant; **`/reconcile` isolates
  each entry** (log with a token prefix only, skip, continue) and reports `failedCount`.
- Table-driven server tests over `PAYMENT_PRODUCT_IDS`.

## Outcome

- ⚠️ **`/reconcile` per-entry isolation is a live behaviour change** — a partial success now answers 200 with fewer
  tokens instead of 500. That is why B1 has its own verify task, `0493`.
- The client (`0494`) was built to tolerate a box without `becamePaidCitizen`, so the two can deploy in either order;
  `0494` waited only on this task's **build** (owner OP-1, *"Wait for B1's build (Recommended)"*).
- Blocks `0493` and `0496` (B4).

## Related

- [[systems/shared-purchase-flow]] — the flow
- [[tasks/shared-purchase-flow-design]] — task `0484`, the spec
- [[tasks/purchase-core-client]] — task `0494` (B2), built after this
- [[tasks/durable-items-entitlements]] — task `0496` (B4), which adds the first non-citizenship branch type
- [[tasks/yandex-payments-implementation]] — task `0019`, the grant this generalises
- [[decisions/paid-items-purchase-rules]] — rule 2 (every purchase → paid citizen)
- [[systems/player-profile-store]] — the profile box
- [[decisions/sprint-9]] — the board (rank 21); `0493` at 22
