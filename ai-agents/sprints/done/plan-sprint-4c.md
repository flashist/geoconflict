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

## Status

> Reconciled 2026-08-14 to the canonical status vocabulary and table shape (task `0004` scope,
> owner-ruled). The former Error Rate column moved into the Task cell — the reader contract is
> `Status | Priority | Task | Brief`. This sprint was unranked, so Priority reads `—`. Briefs are
> still the pre-migration flat files (folder migration is task `0003`); the dashboard reports their
> location as drift until `0003` runs — expected.

| Status | Priority | Task | Brief |
|---|---|---|---|
| ✅ Done | — | Fix Cosmetics.json Serving and PrivilegeRefresher *(error rate ~138.6/min)* | [`0157-fix-cosmetics-serving`](../../tasks/done/0157-fix-cosmetics-serving/brief.md) |
| ✅ Done | — | Fix LocalServer Hash Guard (Singleplayer Crash) *(error rate ~31.0/min)* | [`0158-fix-local-server-hash-guard`](../../tasks/done/0158-fix-local-server-hash-guard/brief.md) |
| ✅ Done | — | Reduce Archive Telemetry Noise (disable dead archive path) *(error rate ~26.6/min)* | [`0159-reduce-archive-telemetry-noise`](../../tasks/done/0159-reduce-archive-telemetry-noise/brief.md) |
| ✅ Done | — | Investigate Lobby and Map Fetch Failures *(error rate ~9.3/min)* | [`0163-investigate-lobby-map-fetch`](../../tasks/done/0163-investigate-lobby-map-fetch/brief.md) |
| ✅ Done | — | Enable Production Client Source Maps in Uptrace | [`0164-enable-client-source-maps`](../../tasks/done/0164-enable-client-source-maps/brief.md) |
| ✅ Done | — | Leaderboard: Show Human Player Count in Label | [`0161-leaderboard-player-count`](../../tasks/done/0161-leaderboard-player-count/brief.md) |
| ⛔ Cancelled (2026-06-02) — runtime fallback sent boats to semantically wrong coasts; the missing `isShore` data is not runtime-recoverable | — | Fix Compact Map Boat-Attack Button (Runtime Fallback) *(Sprint 4b regression)* | [`0160-fix-compact-map-boat-attack`](../../tasks/cancelled/0160-fix-compact-map-boat-attack/brief.md) |
| ✅ Done | — | Disable Compact Maps in Public Rotation *(Sprint 4b regression)* | [`0162-disable-compact-public-maps`](../../tasks/done/0162-disable-compact-public-maps/brief.md) |

---

## Task Sequence

**Phase 1 — Quick wins (ship before May 15)**

Tasks 1–3 are independent and can proceed in parallel. Each has a localized fix with clear acceptance criteria and a meaningful impact on telemetry noise.

**Phase 2 — Investigations (ship if time allows before May 15, otherwise defer)**

The lobby/map fetch task requires investigation before implementation scope is clear. The source-maps task (`0164-enable-client-source-maps`) is enablement, not investigation, and can proceed immediately. The mobile WebGL task was deferred out of this sprint to the backlog on 2026-06-03 (`backlog/0031-mobile-webgl-rendering/brief.md`) — too high-complexity for stabilization. The null-id triage + fix moved to Sprint 4 (`0032-investigate-null-id-errors`).

---

## Scope Constraints

- No new features, game mechanics, or backend infrastructure in this sprint.
- No citizenship, payments, or player profile store work.
- All changes must be deployable before May 15. If a fix requires extended investigation with unclear timeline, defer to post-travel.
- Mobile WebGL rendering was deferred out of this sprint to the backlog on 2026-06-03 (`backlog/0031-mobile-webgl-rendering/brief.md`) — lower-priority, high-complexity, out of scope for stabilization.

---

## Notes

- The telemetry report's recommended fix order matches the task priority above: cosmetics first (largest noise), then hash guard (direct crash), then archive, then lobby/map, then null errors, then mobile rendering.
- Removing the ~138.6/min cosmetics error family is the highest-leverage single action: it will meaningfully improve signal quality in Uptrace for all future investigations.
- The null-id investigation was split on 2026-06-03. The half that is doable now — enabling production client source maps in Uptrace (`0164-enable-client-source-maps`) — stays in Sprint 4c; it is independent of telemetry noise and unblocks triage for every minified cluster. The triage + fix half (`0032-investigate-null-id-errors`) moves to Sprint 4 because it needs both source maps and a deployed archive fix (clean telemetry) — both of which land at the Sprint 4c→4 boundary.
- Compact maps are being pulled from the **public** rotation (`0162-disable-compact-public-maps`, 2026-06-03) because the `isShore` boat-attack defect is not runtime-fixable (the runtime fallback `cancelled/0160-fix-compact-map-boat-attack/brief.md` was cancelled 2026-06-02 — it sent boats to semantically wrong coasts; the data the compact binary destroyed cannot be reconstructed at runtime) and compact gameplay is not meaningfully different from normal matches. Private lobby + singleplayer compact stay opt-in. Re-enabling public compact is gated on the Sprint 5 map-gen fix `0026-fix-compact-map-shore-generation`. With `mini_map` removed, the existing `weird_setting` modifier absorbs the full 20% modified-match budget (intended).
- The archive task was split on 2026-06-01 (see `report-archive-endpoint-task-split-2026-06-01.md`). The Sprint 4c half (`0159-reduce-archive-telemetry-noise`) just disables the dead, consumer-less archive path to clear the ~26.6/min noise. The real S3-backed, citizen-gated archival is assigned to Sprint 4 (`0030-archive-s3-backed-citizen-gated`), sequenced after the player profile store + citizenship implementation.
