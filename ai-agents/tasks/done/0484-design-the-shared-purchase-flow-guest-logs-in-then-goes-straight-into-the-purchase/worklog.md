# Worklog — 0484: design the shared purchase flow

**Task:** `ai-agents/tasks/done/0484-design-the-shared-purchase-flow-guest-logs-in-then-goes-straight-into-the-purchase/brief.md`
**Spec:** [`knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md) (REVISION 2, APPROVED 2026-10-24)

> ⚠️ **Written at close, 2026-10-24, by a spawned `fkit-producer` with no owner channel (ADR-021/037), from the
> spec's own records.** This file was never written while the task ran. It is an **index**: it says where each
> required record lives and does not restate it. The records themselves are the spec's, written by
> `fkit-architect`. Nothing here was checked live.

## Owner ruling that this worklog exists in this form

2026-10-24, live via `AskUserQuestion` in the lead's Claude Code session, relayed verbatim by `fkit-lead` (driving
`/fkit-sprint-ship-loop` on Sprint 9; ADR-021/037); ⛔ not producer precedent. Question: *"0484 (design) can't close:
its logbook file was never written. How should we close it?"* → **"Producer writes it, closes (Recommended)"**.
Option text: *"Logbook points to the spec's own records + lists the 7 new tasks; then closes. B1 and B2 can start
right after."*

## Index — where each record lives

| Record (brief verification step) | Where | Date |
|---|---|---|
| Part 1 fact-check (a) and (b), each marked verified / documented-only with sources (step 1) | Spec **§1** | 2026-10-24 |
| The design, covering every Part 2 bullet (step 2) | Spec §2–§14 (flow §4.3, plug-in checklist §4.2, grant side §5 + §11 B1, failure cases §7, analytics §12, reuse map §13, split §11) | 2026-10-24 |
| **Producer review** — findings P1–P10 and how each was settled (step 3) | Spec **§16** table (P1–P4, P6–P10); revision log R1 | 2026-10-24 |
| **Coder review** — findings F1–F15 and how each was settled (step 3) | Spec **§16** table (F1–F15; F1 → owner question OD-2, F15 accepted with a different placement); revision log R1 | 2026-10-24 |
| Owner rulings **OD-1, OD-2, OD-3, OD-4** and **RP-1**, verbatim (step 4) | Spec **§9.1**; revision log R2 | 2026-10-24 |
| **Owner approval** of the spec, verbatim (step 4) — *"Approve (Recommended)"*, option text *"As written, with your answers; also confirms keeping the restart popup and 'switch off = no sales'. Tasks get filed."* | Spec **header** (approval block); confirms OQ-2 / OQ-3 in **§9.2** | 2026-10-24 |
| The reload exception (OD-1: "Log in and buy" skips the login reload; every completed purchase ends in a restart prompt; RP-1 = guide, "Later" kept) | [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md) | 2026-10-24 |

📌 **Why §16 has no P5 row.** The producer review's item 5 was not a finding: *"No finding on the D3 handling
itself. It is correctly surfaced and kept narrow (§3, §9, §14), and the 0397 "Restart game" widening is respected."*
(read 2026-10-24 by this closing producer from the producer-review consult's own returned text in the lead session's
records; not a project file). So P1–P10 is fully accounted for: nine findings settled in §16, one no-finding.

## Build tasks filed from spec §11 (step 5)

All seven on **Sprint 9** (OD-4), each with canonical `**Depends on:**` lines (read 2026-10-24):

| Spec id | Task | Depends on |
|---|---|---|
| B1 | [`0492`](../../done/0492-profile-box-product-grant-registry-becamepaidcitizen-and-per-entry-reconcile-b1/brief.md) | 0484 |
| B1v | [`0493`](../../backlog/0493-verify-0492-live-citizenship-purchases-still-grant-after-the-b1-profile-box-deploy/brief.md) | 0492 (and its profile-box deploy) |
| B2 | [`0494`](../0494-client-shared-purchase-core-offer-product-purchase-coordinator-and-per-product-restart-popup-b2/brief.md) | 0484 |
| B3 | [`0495`](../0495-client-guest-log-in-and-buy-continues-straight-into-the-purchase-citizenship-first-b3/brief.md) | 0494 |
| B4 | [`0496`](../0496-durable-items-base-entitlements-migration-item-grant-branch-private-ownership-and-already-owned-refusal-b4/brief.md) | 0492 |
| B4v | [`0497`](../../backlog/0497-verify-0496-live-entitlements-migration-applied-and-ownership-stays-private-after-the-b4-deploy/brief.md) | 0496 (and its deploys) |
| B5 | [`0498`](../../backlog/0498-verify-0495-live-inside-yandex-guest-log-in-and-buy-opens-the-payment-window-with-no-second-tap/brief.md) | 0495 (and its game deploy) |

**Re-pointed item builds (OD-3, "Full flow, B3 + B4 (Recommended)"):** `0486`, `0010` and `0011` now wait on
**`0495` + `0496`** instead of `0484` (their other blockers kept). Recorded in the Sprint 9 addendum for `0492`–`0498`
(`ai-agents/sprints/plan-sprint-9.md`) and in `0495`'s and `0496`'s `Blocks:` lines.

## Secrets check (step 6)

No connection strings, endpoints of ours, keys or other secrets in the spec, ADR-125 or this file. The spec cites
only public Yandex documentation pages. (Checked by this closing producer, 2026-10-24, by reading and a grep.)

## Close

Closed 2026-10-24 via `/fkit-task-done` by this spawned producer — **`✅ Done (agent-closed — not owner-verified)`**.
