# Live Check S1v: the Profile Box Answers Held Purchases Quietly and Says `consume:false` for Citizenship (task 0511)

**Source**: `ai-agents/tasks/done/0511-verify-0506-live-the-profile-box-answers-held-purchases-quietly-and-says-consume-false-for-citizenship-s1v/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 38 (ADR-035 append rank, flagged; on merit directly below `0506`) / task `0511` — live check S1v of the `0505` design

> ✅ Closed 2026-10-28 via `/fkit-task-done` by a spawned `fkit-producer`, on the OWNER RULING (`AskUserQuestion` in the
> `fkit-lead` session, relayed; ⛔ not producer precedent) **"Close, accept 2 as unproven (Recommended)"** — option
> text: *"Producer closes 0511; the 2 purchase-only steps are recorded as unproven. Knock-on: none (checked); nothing
> waits on 0511."* ⚠️ The question said **2** purchase-only steps; the worklog's "accepted as unproven" table lists
> **three** (steps 2, 3's `consumeTokens` half, 11). Recorded as found, not reconciled.

## Goal

Prove on the **live** profile box (there is no dev profile box — owner, 2026-10-26) that `0506`
([[tasks/stop-consuming-profile-box-s1]]) behaves after its deploy: migrations applied, `/complete` says
`consume:false` for citizenship, a reconcile carrying an already-held token is quiet, the new counters move, the new
log lines leak nothing, and the safety setting reads OFF. Nothing to build.

On 2026-10-28 it also took **steps 8–12**, the server-side, read-only, no-purchase steps of the four cancelled
hand-run checks `0493`, `0498`, `0499`, `0512` (owner ruling **"The 4 purchase ones (Recommended)"**); their client
side went to `0516`, a GameAnalytics read on or after 2026-11-03.

## Key Changes

Nothing in the repo. Two reads, both read-only:

- **2026-10-27, owner-run** — migrations and the boot line met; most steps not run.
- **2026-10-28 ~07:15 UTC, agent-run over SSH** by a spawned `fkit-coder`, on the owner's read approval typed in the
  lead session. Nothing written on the box; no ids, tokens, signatures, addresses or payloads recorded.

## Outcome

- **Versions (2026-10-28):** profile box `/health` **`0.0.165-profile.1`** (containers created 2026-10-27
  14:03–14:04 UTC); live game **`0.0.167`**.
- **Passed:** migrations `009`–`012` all applied 2026-10-27 14:04:45 UTC; `purchase_holder_sightings` 0 rows (re-read
  2026-10-28); 10 reconciles → outcome `held` 8, `held_no_caller` 2, `granted` 0; **`issuedAt` is present and numeric
  on every live payload** (spec §14 item 2 answered: yes), all `under_1m`; 22 new log lines carry only fixed labels —
  **leak check clean**; boot line `payments consume-permanent: OFF (ConsumePermanentSetting.ts)`; no
  `reconcile entry failed`, no `reconcile skip`, no 5xx (nginx 27–28 Oct: `/reconcile` 10, `/complete` 1, `/intent` 61,
  all 200).
- **Accepted as unproven (owner ruling above):** step 2 — the `/complete` reply body (`consume:false`) was never seen
  (inferred from HTTP 200 + the code path, `mayConsume()` false while the setting is OFF); step 3 — the `consumeTokens`
  half was never seen (the grant half passed); step 11 — that reconcile still grants a stray purchase (no `granted`
  outcome since the deploy; no purchase made).
- **Step 4 was read from the log copy of the counters, not from Uptrace.**
- **Found, filed, not diagnosed:** at boot (14:04:36 UTC) the API logged **2 errors** — `entitlements lookup failed:
  relation "player_entitlements" does not exist` — about 10 s **before** migrations `009`–`012` were recorded
  (14:04:45). None since. → task **`0517`** on the Backlog board (owner ruling *"Brief a task on Backlog
  (Recommended)"*): find why the box served requests before its migrations finished and make the start order safe.
- **For `0516`:** 61 `/intent` vs 1 `/complete` since the deploy — to compare with GameAnalytics `Purchase:Started` /
  `Abandoned` at its read.

## Related

- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, the build this checks
- [[tasks/stop-consuming-client-live-check]] — task `0512` (S2v, cancelled; its server steps came here)
- [[tasks/purchase-grant-registry-live-check]] — task `0493` (B1v, cancelled; its server steps came here)
- [[tasks/guest-log-in-and-buy-live-check]] — task `0498` (cancelled) · [[tasks/rewarded-video-live-check]] — task `0499` (cancelled)
- [[tasks/stop-consuming-design]] — the spec (§12 row S1v, §14 item 2)
- [[decisions/adr-127-consume-switch-source-setting]] — the OFF boot line
- [[systems/player-profile-store]] · [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[decisions/sprint-9]] — the board (rank 38)
- [[tasks/durable-items-entitlements]] — task `0496`, whose `player_entitlements` table the boot-time errors name
- [[systems/shared-purchase-flow]] — the purchase flow these checks cover
- [[decisions/sprint-backlog]] — where `0517` (the start-order fix) was filed
