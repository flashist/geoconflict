# Verify 0496 live: the entitlements migration applied and ownership stays private after the B4 deploy (B4v)

## ID
0497

> ℹ️ **ID allocation, checked 2026-10-24 before filing.** Allocated in sequence `0492`–`0498` from a highest existing ID
> of `0491` (all three boards, base-10). See `0492`'s brief for the full check.

## Sprint
Sprint 9

> 📌 **Filed on OWNER RULINGS of 2026-10-24**, given live via `AskUserQuestion` in the lead's Claude Code session,
> relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned `fkit-producer` with no owner
> channel (ADR-021/037); ⛔ not producer precedent. **OD-4**, typed by the owner: *"All should move to the current
> sprint"*. Quoted verbatim in the [spec](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)'s
> §9.1.
>
> ⚠️ **OD-4 overrides the standing build/verify rule for this task.** The owner's rule (2026-09-29) puts a verify task
> at the top of the **next** sprint. For the seven §11 tasks only, OD-4 puts it on **Sprint 9 now** (spec §9.1, §11).
> If `0496`'s deploy misses Sprint 9, this task cannot close in Sprint 9; the roll-over is the producer's.

## Priority
26

> ⚠️ Priority 26 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0496`**, because it checks that build's deploy and nothing else gates it.
> Appended after the board's highest rank (25), never inserted (ADR-035); no row renumbered.

## Status
🚧 Blocked — waiting on 0523 server-metrics verification after 0522 build/deploy

## Owner
fkit-producer

## Context

Live check **B4v** of the approved shared purchase-flow design:
[`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
§11 row **B4v**. `0496` adds a migration and a private ownership list to the profile box.

- **Entry gate (§11):** `0496` deployed (profile box after `0491`'s migration `009`; game for the client parse).
- **Who does what:** owned by the producer; **the owner runs the live steps** (box reads and the test purchase). An
  agent may run read-only checks only where the owner allows it.

## What to build

No code. Preserve the completed owner-run checks and record server-metrics evidence under the
2026-11-05 acceptance amendment below, in this folder's `worklog.md`. The original live plan stays immutable.

## Verification steps

1. The entitlements migration is applied on the profile box (the migration runner's record shows it, after `009`).
2. A verified (confirmed-login) profile read carries `entitlements: []`.
3. Verify observed unverified-profile privacy through [0523](../0523-verify-profile-privacy-and-new-citizenship-grants-through-deployed-server-metrics/brief.md):
   seven full UTC days with release attribution and collection health established, actual eligible
   successful unverified GET exposure, zero observed forbidden paid-field/entitlement disclosures,
   and unknown/failed/unwired classifications reported separately. Missing eligible exposure remains
   unproven; missing positive durable-item ownership exposure is an explicit unproven residual
   requiring owner disposition. Login output is classified separately. Any violation triggers
   immediate investigation.
4. Verify natural citizenship grants through 0523: at least three fresh, acknowledged committed
   unpaid→paid-and-citizen citizenship transitions in the approved window. Replays, already-paid
   grants, client completion and uncertain COMMIT outcomes do not count. Three is an operational
   sample target, not a confidence guarantee. This replaces the Yandex test-listed purchase
   criterion and does not prove billing, payment-dialog behavior or browser receipt.
5. Record date, reported deployed versions, original owner-run results, monitoring release/window/
   counts, collection gaps, verdicts, evidence source and remaining limits; no sensitive data.
   Technical Verify and independent review remain required. The window begins at the first UTC
   midnight after confirmed metric arrival, release attribution and healthy collection. Thin data
   receives one additional seven-full-day window, then explicit owner disposition; no automatic
   waiver. Aggregate evidence does not prove permanent privacy.

## Notes

- **Depends on:** 0496, 0506, 0510 (and its profile-box and game deploys, held for 0506 and 0510), [0523](../0523-verify-profile-privacy-and-new-citizenship-grants-through-deployed-server-metrics/brief.md)
- 📌 **2026-10-26, later — `0510` added; the deploy hold carried over at the split.** OWNER RULING **"Approve
  (Recommended)"** (relayed; ⛔ not producer precedent) — option text: *"ADR-126 becomes accepted; producer splits 0506
  into profile-server and game build tasks, then planning starts."* `0506` is now S1 (profile box), and the held
  **game** code ships with `0510` (S2). This check reads both deploys (box migration + game client parse), so it waits
  on both. Same sprint; the hold itself is unchanged.
- 📌 **2026-10-26 — `0506` added to Depends on, OWNER RULING** given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Asked whether to hold the pending purchase-flow deploy for the no-consume change, the owner picked **"Hold it"** — option text: *"0493, 0497, 0498, 0499 then also wait on 0506 (design + ADR + build first). All Sprint 9."* The deploy this task checks (`0491`/`0492`/`0494`/`0495`/`0496`) does not go out until `0506` is built; this check follows it.
- **Blocks:** nothing
- **Spec:** [`2026-10-24-design-shared-purchase-flow.md`](../../../knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md)
  §11 (B4v).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.


## 2026-11-05 — owner-approved acceptance and dependency amendment

### Owner authority — 2026-11-05

Actual owner answers, quoted verbatim by `fkit-lead` from live `fkit_roles.fkit_ask_owner`
in its session on **2026-11-05**, relayed to this fresh producer (ADR-021/037); not producer precedent:

- **Placement:** "Both Sprint 9 (Recommended) — exception to the next-sprint verification rule. After acceptance amendment, 0497 alone waits on the Sprint 9 verifier and its build/deploy; the proposed monitoring window keeps Sprint 9 open for at least seven days after arrival."
- **Acceptance:** "Approve replacement criteria (Recommended) — preserve the two owner-run PASS results, replace remaining acceptance with the stated monitoring criteria, and keep 0497 open until its new verifier completes. Implementation needs separate plan approval."

The placement exception covers **0522 and 0523 only**. Both are on Sprint 9; it does not extend
OD-4 or 0516 precedent. No TOP NEXT or re-ranking authority is claimed. The owner confirmed the
current 0497 telemetry focus by typing **"Continue"** after lead's explanation. Filing and acceptance
approval are not implementation-plan approval. Formal coder plan review and actual owner plan
approval remain required **before any code**.

**Current acceptance supersedes only remaining original checks 3–5.** Checks 1/2 remain
**PASS — owner-run reported**: migration and fresh confirmed GET (HTTP 200; paid=true,
citizen=true; entitlements present=true, array=true, count=0). Their provenance and version limits
remain in the worklog; no independent live verification is claimed.

**Historical manual checks retained:** original check 3, "An unverified profile read carries no
`entitlements` field", and original check 4, "A citizenship test purchase (Yandex test purchase list)
still grants citizenship", remain **NOT RUN**. Original check 5 required date, deployed versions and
each result without sensitive data. A later metrics verdict is evidence under amended acceptance,
never a retroactive PASS for those manual checks.

**Plan/history protection:** `plan.md` remains the approved immutable blob
`03076a046f1d274b2fe77a40368b621e88c06410`; plan-review history is unchanged. This amendment
supersedes the original manual-only execution requirement for the remaining acceptance; it does
not rewrite that old plan or approve a new implementation plan.

**Status and knock-on:** 0497 is **🚧 Blocked — waiting on 0523 server-metrics verification after
0522 build/deploy**, on both brief and board. Existing 0496/0506/0510 deploy dependencies remain.
0497 alone waits on the new Sprint 9 verifier, with zero current open dependents behind 0497;
0523 waits on 0522 and deployed arrival. Sprint 9 remains open through at least seven full UTC days
after arrival/readiness (possibly one additional seven-day window, then owner disposition).
0516 remains unchanged. Existing owner-run-only wording above is historical for the original checks;
new monitoring uses separately authorized access or attributed owner aggregate reports.
