# Profile box: product-grant registry, `becamePaidCitizen` on `/complete`, per-entry reconcile (B1 of the shared purchase flow)

## ID
0492

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0491`. Seven IDs allocated in sequence, `0492`–`0498`,
> in the spec's §11 order. No task folder and no task reference in `ai-agents/tasks/` or `ai-agents/sprints/` for any of
> them (`0492` and `0494` appear in `.claude/` as fkit upstream task numbers — a different namespace, not tasks here).

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"* — all seven §11 tasks on Sprint 9. Spec approval: **"Approve (Recommended)"**. Both quoted verbatim in the
> [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s header and §9.1.

## Priority
21

> ⚠️ Priority 21 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0484`**, because it is the first server step of the design `0484` produced
> and `0496` waits on it. Appended after the board's highest rank (20), never inserted (ADR-035); no row renumbered.

## Status
✅ Done (agent-closed — not owner-verified) *(2026-10-24 — closed via `/fkit-task-done` by a spawned `fkit-producer` at the CLOSE step of `/fkit-sprint-ship-loop` driven by `fkit-lead`; plan owner-approved 2026-10-24 (OQ-1 add `failedCount`, OQ-2 omit on replay), `npm test` 4885/4885, `npm run test:integration` 193/193, stateful review closed-out round 1 with no findings. Was ~~🔄 In progress~~. ⚠️ **Not committed, not deployed:** profile-box deploy, `0491` first then B1, weekend slot; live check is `0493`.)*

> (Status until 2026-10-24) ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

Build **B1** of the approved shared purchase-flow design (task `0484`):
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md),
REVISION 2, **APPROVED 2026-10-24**. The spec is the design; this brief does not restate it.

- **Entry gate (§11):** spec approved — **met** (2026-10-24).
- **Ships by:** a profile-box deploy. ⚠️ The `/reconcile` per-entry isolation is **a live behaviour change** (§11),
  which is why `0493` verifies it live.
- Runs **in parallel** with `0494` (B2) (§11 order line).

## What to build

Build B1 exactly as the spec's §11 row **B1** scopes it, using these sections:

- **§4.1** — the components marked **B1** (`PaymentsContract.ts`, `PaymentsRepository.ts`, payments `Routes.ts`).
- **§5** — the `PRODUCT_DEFINITIONS` / `PRODUCT_GRANTS` contract and the `/complete` `becamePaidCitizen` field.
- **§6** — `/reconcile` per-entry isolation.
- **§7** — the failure rows that touch the server grant.
- **§10** — the *Server, table-driven over `PAYMENT_PRODUCT_IDS`* tests.

Citizenship is the only product in the registry after this task. Unknown products are still refused (the `0019` R2
guard). Nothing in the client changes here; `0494` tolerates a box without `becamePaidCitizen`.

## Verification steps

1. The §10 server tests exist and pass: each product → receipt + `is_paid_citizen` + its grant; `becamePaidCitizen`
   true, then false on a second product; idempotent re-grant; an unknown string throws; the compile-time coverage
   check over `PAYMENT_PRODUCT_IDS`; `/reconcile` with one failing entry still grants the others.
2. The existing citizenship payment tests pass unchanged.
3. `npm test` is green (full run through the npm script — project lock), and `npm run test:integration` is green if
   the change touches the repository's SQL.
4. `/complete`'s response carries `becamePaidCitizen` (route test).
5. The diff stays inside the §4.1 B1 components and their tests.

## Notes

- **Depends on:** 0484
- **Blocks:** 0493, 0496
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §4.1, §5, §6, §7, §10, §11 (B1). Do not edit the spec from this task.
- **Deploy:** profile box, weekend slot unless urgent (owner rule); committed is not deployed. `0493` waits on the
  deploy, not only on this task's close.
- **Build vs verify:** the live check is `0493` (B1v), filed on Sprint 9 now by OD-4.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
