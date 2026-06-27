# Task — Proper S3-Backed Match Archival (Citizen-Gated)

## Sprint
Sprint 4 — In-App Monetization & Citizenship (Phase 2). Sequenced **after** the player
profile store and citizenship implementation land — those are hard prerequisites
(see Dependencies), so this is the tail of the citizenship track, not a blocker for it.

## Priority
Low within Sprint 4 — no live consumer until citizenship ships. This is the "build it
properly" half of the archive task split; the noise it would otherwise generate is
silenced now by the Sprint 4c task `s4c-reduce-archive-telemetry-noise.md`.

---

## Context

Match archiving is *intended* to be the authoritative historical store (see
[[systems/match-logging]]): full `GameEndInfo` — map config, game mode, player list with
stats, start/end timestamps, duration, turn count, winner. The architecture already
expects S3-compatible object storage — the config slots exist but are empty:
`storageEndpoint`, `storageBucket`, `storageAccessKey`, `storageSecretKey`.

Match history is a **citizen-only** feature. Until citizenship is implemented there is no
way to know which games to archive and no user who can read the data back, which is why
the inherited archive path was disabled in `s4c-reduce-archive-telemetry-noise.md` rather
than fixed.

Sources:
- `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md` (Phase 2)
- `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`

---

## Dependencies (hard blockers)
1. **Citizenship feature must exist** — required to gate archival to citizen games.
   See the Sprint 4 citizenship briefs (`s4-citizenship-earned.md`,
   `s4-citizenship-paid.md`).
2. **S3-compatible bucket + credentials provisioned** — populated into the existing
   config slots via the deploy config. Credentials must follow the post-incident secret
   handling rules — no secrets in git-tracked docs or briefs (see
   [[decisions/vps-credential-leak-response]]).

---

## What to Build

**Infra (the bulk):**
- Provision an S3-compatible bucket and add credentials to the deployment config,
  populating `storageEndpoint` / `storageBucket` / `storageAccessKey` /
  `storageSecretKey`.

**Code:**
- Write/read game records to/from the bucket using those config slots.
- **Gate archival to citizen games only** — do not archive every game.
- Re-enable the archive path that `s4c-reduce-archive-telemetry-noise.md` disabled
  (centralized flag → one-line change).
- Add a bounded upload size limit (do not use an unbounded limit; size against real
  compressed record sizes) and a basic retention policy.

---

## Verification

1. Citizen games produce objects in the bucket; non-citizen games are not archived.
2. Replays / history read back correctly from the bucket.
3. Oversized uploads fail cleanly with a bounded, low-severity log — not an unhandled
   rejection.
4. No archive error groups in Uptrace after re-enable.

---

## Notes
- Primarily infra, but the citizen-gating and re-enable code are required too — this is
  not infra-only.
- Coordinate the schedule with the citizenship rollout so archival turns on at the same
  time history becomes reachable.
- Re-confirm the config-slot names against the codebase before implementation; they were
  reported empty as of 2026-06-01.
