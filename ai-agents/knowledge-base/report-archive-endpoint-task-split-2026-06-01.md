# Report: Archive Endpoint Failures — Findings & Recommended Task Split

**Date:** 2026-06-01
**For:** Product / sprint planning
**Prepared by:** Engineering investigation
**Related docs:** `plan-fix-archive-endpoint.md` · `telemetry-error-priorities-2026-05-07.md` · backlog `s4c-fix-archive-endpoint.md`

---

## TL;DR

- The match-archiving path is **fully broken in production** and emits **~26.6 error logs/min** — the 3rd-largest noise source in our telemetry.
- The archived data has **no consumer right now**: game history is a **"citizen"-user feature, and citizenship is not implemented yet**, so no one can use history/archiving in the near future.
- **Recommendation: split the original task into two.**
  - **Task 1 — NOW (small, low-risk):** just stop the noise. Disable the doomed archive calls / demote the logs. No storage built. Removes all three error groups.
  - **Task 2 — LATER (when citizenship ships):** build the proper S3-backed archival the architecture already expects. Primarily standing up an S3 bucket + credentials, plus the code to write/read records and gate archival to citizen games.

---

## Findings — what's broken and why

Three error groups, all from the archive path (2026-05-07 telemetry window):

| Error | Rate | Plain-language meaning |
|---|---|---|
| `error archiving game record: Not Found` | 16.29/min | Server posts every completed game to an archive endpoint **that doesn't exist** (404). Affects multiplayer **and** singleplayer. |
| `Failed to archive singleplayer game: Failed to fetch` | 9.64/min | The singleplayer browser upload fails — it hits a hard 64 KB browser limit on "keepalive" requests for larger games. |
| `request entity too large` | 0.64/min | A handful of singleplayer uploads exceed the server's request-size limit. |

**Root cause:** this project is a fork of openfront.io, which archived matches to a **separate external service**. The fork kept the code that *sends* records but **never built the service that receives them**, so every finished game POSTs to a host that returns 404. The singleplayer client errors are secondary symptoms of the same dead path plus a browser upload limit.

**Key product point:** **none of this data is used today.** History is intended for "citizen" users, and the citizenship system doesn't exist yet. We are spending the noisiest archive error budget in telemetry to populate a store that nothing reads.

---

## Why split into two tasks

- **Different urgency.** The telemetry noise is cheap to silence and worth doing now (it hides real errors). The real archival solution depends on infrastructure (S3 bucket + credentials) and a product feature (citizenship) that don't exist yet.
- **Different risk.** Turning a broken, unused feature off is ~zero user-facing risk. Building real archival touches infra, secrets, and per-user gating.
- **Don't block the cleanup.** The quick telemetry win shouldn't wait on S3/citizenship timelines.

---

## Task 1 — NOW: Reduce archive telemetry noise

**Goal:** drop all three archive error groups to ~0 **without building any storage**, since archival is intentionally inactive.

| | |
|---|---|
| **In scope** | Stop the server from POSTing completed games to the non-existent endpoint (short-circuit the call), or at minimum demote its error log. Stop / quiet the singleplayer client upload while archival is off. |
| **Out of scope** | No S3, no storage, no new endpoints, no body-limit or infra changes. |
| **Effort** | **Small** — a handful of files + tests. |
| **Priority** | **Medium-high** — 3rd-largest telemetry noise source; it masks real errors. Good fit for the current stabilization sprint. |
| **Risk** | **Low** — the feature is already non-functional; disabling it changes nothing a user can see. |
| **Acceptance** | After deploy, the `Not Found`, `Failed to fetch`, and `request entity too large` archive groups disappear / drop sharply in Uptrace. No storage is introduced. The change is clearly marked "feature temporarily disabled" so re-enabling in Task 2 is trivial. |

---

## Task 2 — LATER (when citizenship is implemented): Proper S3-backed archival

**Goal:** implement match archiving the way the architecture already expects — S3-compatible object storage — and only for users entitled to history.

| | |
|---|---|
| **In scope — infra (the bulk)** | Provision an S3-compatible bucket and add correct credentials to the deployment config. The code config slots already exist but are empty (`storageEndpoint` / `storageBucket` / `storageAccessKey` / `storageSecretKey`). |
| **In scope — code** | Write/read game records to/from the bucket using those slots. **Gate archival to citizen games only** (don't archive every game). Re-enable the archive path Task 1 turned off. Add a bounded upload size limit + a basic retention policy. |
| **Dependencies** | (1) the **citizenship feature must exist** to know which games to archive; (2) **S3 infra + credentials** must be provisioned. |
| **Effort** | **Medium–Large.** Primarily infra (bucket + credentials), but **not only** infra — the citizen-gating and re-enable code are required too. |
| **Priority** | Schedule **alongside / after the citizenship feature**. Not urgent until then. |
| **Acceptance** | Citizen games produce objects in the bucket; non-citizen games are not archived; replays read back from the bucket; oversized uploads fail cleanly; no archive errors in telemetry. |

---

## Suggested sequencing

1. **Now:** Task 1 — independent, unblocks telemetry immediately.
2. **When citizenship lands:** Task 2 — infra + code, gated to citizens.

---

## Appendix — ready-to-file task stubs

Drop-in starting points using our task template; refine as needed.

### Stub for Task 1
```md
# Task — Reduce Archive Endpoint Telemetry Noise

## Sprint
Sprint 4c — Stabilization

## Priority
Medium-high — archive failures are ~26.6 errors/min (3rd-largest telemetry noise source).
The data has no consumer yet (history is citizen-gated; citizenship not implemented), so the
feature can be safely turned off to clear the noise.

## Context
The archive path posts completed games to an endpoint that does not exist in this fork
(returns 404), and the singleplayer client upload fails in the browser. None of the data is
used today. See ai-agents/knowledge-base/plan-fix-archive-endpoint.md.

## What to Build
- Stop the server-side archive call from hitting the non-existent endpoint (short-circuit it),
  or at minimum demote its error log so it stops flooding telemetry.
- Stop / quiet the singleplayer client upload while archival is inactive.
- No S3, no storage, no new endpoints, no body-limit changes.

## Verification
- The `Not Found`, `Failed to fetch`, and `request entity too large` archive error groups
  disappear / drop sharply in Uptrace after deploy.
- No storage or new routes are introduced.

## Notes
- Mark the disable clearly so Task 2 can re-enable it with a one-line change.
```

### Stub for Task 2
```md
# Task — Proper S3-Backed Match Archival (Citizen-Gated)

## Sprint
TBD — blocked on the citizenship feature + S3 infrastructure.

## Priority
Deferred — schedule with / after citizenship. No live consumer until then.

## Context
Match archiving should use S3-compatible object storage (the project already has unused
storageEndpoint/Bucket/AccessKey/SecretKey config). History is a citizen-only feature.
See ai-agents/knowledge-base/plan-fix-archive-endpoint.md (Phase 2).

## What to Build
- Provision an S3-compatible bucket; add correct credentials to deploy config.
- Implement write/read of game records to/from the bucket using the existing config slots.
- Gate archival to citizen games only.
- Re-enable the archive path disabled in Task 1.
- Add a bounded upload size limit and a basic retention policy.

## Verification
- Citizen games produce objects in the bucket; non-citizen games are not archived.
- Replays read back from the bucket; oversized uploads fail cleanly; no archive errors in telemetry.

## Notes
- Dependencies: citizenship feature must exist; S3 infra + credentials provisioned.
- Primarily infra, but the citizen-gating and re-enable code are required too.
```

---

## References
- Engineering plan & verified root cause: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`
- Telemetry priorities: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`
- Original combined task: `ai-agents/tasks/backlog/s4c-fix-archive-endpoint.md`
