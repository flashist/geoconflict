# Geoconflict — Sprint 4c — Production Stabilization

> Stabilization sprint. Sprint 4's core citizenship/payments track remains paused during Mark's travel window (May 15 – June 1, 2026). Sprint 4c uses the remaining days before departure to reduce production error rates and protect match quality, with no new features or backend infrastructure changes.

---

## Sprint 4c Goal

Reduce the top production error families identified in the Uptrace telemetry review of 2026-05-07. Clean telemetry makes the post-travel return to Sprint 4 development faster and safer by removing noise that currently hides real issues.

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## Deadline

**Must ship before May 15, 2026.** Tasks 1–3 are quick wins targeting the three largest error families and should be prioritized first. Tasks 4–6 are investigations or complex work — only start if time allows.

---

## Sprint 4c Status

| Status | Task | Error Rate | Brief |
|---|---|---|---|
| ✅ Done | Fix Cosmetics.json Serving and PrivilegeRefresher | ~138.6/min | `s4c-fix-cosmetics-serving.md` |
| ✅ Done | Fix LocalServer Hash Guard (Singleplayer Crash) | ~31.0/min | `s4c-fix-local-server-hash-guard.md` |
| ⬜ Backlog | Reduce Archive Telemetry Noise (disable dead archive path) | ~26.6/min | `s4c-reduce-archive-telemetry-noise.md` |
| ⬜ Backlog | Investigate Lobby and Map Fetch Failures | ~9.3/min | `s4c-investigate-lobby-map-fetch.md` |
| ⬜ Backlog | Investigate Client Null-ID/Null-Object Errors | ~1.8/min | `s4c-investigate-null-id-errors.md` |
| ⬜ Backlog | Mobile Memory and WebGL Rendering Failures | ~0.4/min | `s4c-mobile-webgl-rendering.md` |
| ⬜ Backlog | Leaderboard: Show Human Player Count in Label | — | `s4c-leaderboard-player-count.md` |
| ⬜ Backlog | Fix Compact Map Boat-Attack Button (Runtime Fallback) | Sprint 4b regression | `s4c-fix-compact-map-boat-attack.md` |

---

## Task Sequence

**Phase 1 — Quick wins (ship before May 15)**

Tasks 1–3 are independent and can proceed in parallel. Each has a localized fix with clear acceptance criteria and a meaningful impact on telemetry noise.

**Phase 2 — Investigations (ship if time allows before May 15, otherwise defer)**

Tasks 4–6 require investigation before implementation scope is clear. Task 6 (mobile WebGL) is explicitly a future task — do not start during this sprint.

---

## Scope Constraints

- No new features, game mechanics, or backend infrastructure in this sprint.
- No citizenship, payments, or player profile store work.
- All changes must be deployable before May 15. If a fix requires extended investigation with unclear timeline, defer to post-travel.
- Task 6 (mobile WebGL rendering) is lower-priority and high-complexity — treat as out-of-scope for this sprint unless everything else ships early.

---

## Notes

- The telemetry report's recommended fix order matches the task priority above: cosmetics first (largest noise), then hash guard (direct crash), then archive, then lobby/map, then null errors, then mobile rendering.
- Removing the ~138.6/min cosmetics error family is the highest-leverage single action: it will meaningfully improve signal quality in Uptrace for all future investigations.
- The null-id investigation (Task 5) should not be started until Tasks 1–3 are deployed, because the current telemetry is too noisy for reliable pattern analysis on lower-rate clusters.
- The archive task was split on 2026-06-01 (see `report-archive-endpoint-task-split-2026-06-01.md`). The Sprint 4c half (`s4c-reduce-archive-telemetry-noise.md`) just disables the dead, consumer-less archive path to clear the ~26.6/min noise. The real S3-backed, citizen-gated archival is assigned to Sprint 4 (`s4-archive-s3-backed-citizen-gated.md`), sequenced after the player profile store + citizenship implementation.
