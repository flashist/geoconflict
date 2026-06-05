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
| ✅ Done | Reduce Archive Telemetry Noise (disable dead archive path) | ~26.6/min | `s4c-reduce-archive-telemetry-noise.md` |
| ✅ Done | Investigate Lobby and Map Fetch Failures | ~9.3/min | `s4c-investigate-lobby-map-fetch.md` |
| ✅ Done | Enable Production Client Source Maps in Uptrace | — | `s4c-enable-client-source-maps.md` |
| ✅ Done | Leaderboard: Show Human Player Count in Label | — | `s4c-leaderboard-player-count.md` |
| ⛔ Cancelled | Fix Compact Map Boat-Attack Button (Runtime Fallback) | Sprint 4b regression | `cancelled/s4c-fix-compact-map-boat-attack.md` |
| ✅ Done | Disable Compact Maps in Public Rotation | Sprint 4b regression | `s4c-disable-compact-public-maps.md` |

---

## Task Sequence

**Phase 1 — Quick wins (ship before May 15)**

Tasks 1–3 are independent and can proceed in parallel. Each has a localized fix with clear acceptance criteria and a meaningful impact on telemetry noise.

**Phase 2 — Investigations (ship if time allows before May 15, otherwise defer)**

The lobby/map fetch task requires investigation before implementation scope is clear. The source-maps task (`s4c-enable-client-source-maps.md`) is enablement, not investigation, and can proceed immediately. The mobile WebGL task was deferred out of this sprint to the backlog on 2026-06-03 (`backlog/mobile-webgl-rendering.md`) — too high-complexity for stabilization. The null-id triage + fix moved to Sprint 4 (`s4-investigate-null-id-errors.md`).

---

## Scope Constraints

- No new features, game mechanics, or backend infrastructure in this sprint.
- No citizenship, payments, or player profile store work.
- All changes must be deployable before May 15. If a fix requires extended investigation with unclear timeline, defer to post-travel.
- Mobile WebGL rendering was deferred out of this sprint to the backlog on 2026-06-03 (`backlog/mobile-webgl-rendering.md`) — lower-priority, high-complexity, out of scope for stabilization.

---

## Notes

- The telemetry report's recommended fix order matches the task priority above: cosmetics first (largest noise), then hash guard (direct crash), then archive, then lobby/map, then null errors, then mobile rendering.
- Removing the ~138.6/min cosmetics error family is the highest-leverage single action: it will meaningfully improve signal quality in Uptrace for all future investigations.
- The null-id investigation was split on 2026-06-03. The half that is doable now — enabling production client source maps in Uptrace (`s4c-enable-client-source-maps.md`) — stays in Sprint 4c; it is independent of telemetry noise and unblocks triage for every minified cluster. The triage + fix half (`s4-investigate-null-id-errors.md`) moves to Sprint 4 because it needs both source maps and a deployed archive fix (clean telemetry) — both of which land at the Sprint 4c→4 boundary.
- Compact maps are being pulled from the **public** rotation (`s4c-disable-compact-public-maps.md`, 2026-06-03) because the `isShore` boat-attack defect is not runtime-fixable (the runtime fallback `cancelled/s4c-fix-compact-map-boat-attack.md` was cancelled 2026-06-02 — it sent boats to semantically wrong coasts; the data the compact binary destroyed cannot be reconstructed at runtime) and compact gameplay is not meaningfully different from normal matches. Private lobby + singleplayer compact stay opt-in. Re-enabling public compact is gated on the Sprint 5 map-gen fix `s5-fix-compact-map-shore-generation.md`. With `mini_map` removed, the existing `weird_setting` modifier absorbs the full 20% modified-match budget (intended).
- The archive task was split on 2026-06-01 (see `report-archive-endpoint-task-split-2026-06-01.md`). The Sprint 4c half (`s4c-reduce-archive-telemetry-noise.md`) just disables the dead, consumer-less archive path to clear the ~26.6/min noise. The real S3-backed, citizen-gated archival is assigned to Sprint 4 (`s4-archive-s3-backed-citizen-gated.md`), sequenced after the player profile store + citizenship implementation.
