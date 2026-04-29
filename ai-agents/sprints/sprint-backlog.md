# Geoconflict — Sprint Backlog

> Tasks that are defined and worth doing but not assigned to any currently planned sprint (Sprint 4, 5, or 6). Items here need a sprint home before implementation begins. Brief a task before picking it up — most have no implementation brief yet.

---

## Status

| Status | Task | Brief | Depends On |
|---|---|---|---|
| ⬜ No sprint | Task 6 — Rewarded Ads: Minimal Version | None — see plan-index | Citizenship benefits (Sprint 4) |
| ⬜ No sprint | Task 7 — Leaderboard: Core System | None — see plan-index | — |
| ⬜ No sprint | Task 8b — Private Lobbies (Citizens Only) | None — see plan-index | Citizenship (Sprint 4) |
| ⬜ No sprint | Task 8c — Spectating (Citizens Only) | None — see plan-index | Citizenship (Sprint 4) |
| ⬜ No sprint | Task 9 — Re-enable Flags | None — see plan-index | Payment infrastructure (Sprint 4) |
| ⬜ No sprint | Task 9a — Re-enable Territory Patterns | None — see plan-index | Payment infrastructure (Sprint 4) |
| ⬜ No sprint | sec10 — Remove Password Deploy Fallbacks | `backlog/sec10-remove-password-deploy-fallbacks.md` | — |
| ⬜ No sprint | sec11 — Secret Management Beyond Env Files | `backlog/sec11-secret-management-beyond-env-files.md` | — |
| ⏸ Parked | Task 5 — Deep Mobile Rendering Optimization | None — see plan-index | Mobile DAU > 1,500 |
| ⏸ Parked | Task 2i — Microsoft Clarity Session Recordings | None — see plan-index | Mobile perf confirmed stable |

---

## Items

### Task 6 — Rewarded Ads: Minimal Version

**From plan-index:** Sprint 4 column, explicitly deferred — no reward mechanic exists until citizenship benefits give players something worth watching an ad for.

**Current state:** No brief written. Sprint 5 contains Task 11 (Coin Economy + Rewarded Ads Full Version). Decide whether Task 6 (minimal) is still needed as a separate milestone or rolls into Task 11 before assigning to a sprint.

---

### Task 7 — Leaderboard: Core System

**From plan-index:** Sprint 4 column, but never added to the Sprint 4 plan document. Sprint 5 Task 10 (Leaderboard Rewards Layer) depends on Task 7 being live first.

**Current state:** No brief written. Task 7 is a prerequisite for Sprint 5 Task 10. Assign and brief before Sprint 5 kicks off.

**Effort (from plan-index):** 1–2 weeks.

---

### Task 8b — Private Lobbies (Citizens Only)

**From plan-index:** Sprint 4 column, citizen-only feature. Not included in the Sprint 4 plan document.

**Current state:** No brief written. Depends on citizenship (Sprint 4) being live. Directly requested by players — creates a friend-invite conversion loop.

**Effort (from plan-index):** 1–2 weeks.

---

### Task 8c — Spectating (Citizens Only)

**From plan-index:** Sprint 4 column, citizen-only feature. Not included in the Sprint 4 plan document.

**Current state:** No brief written. Watch any live public match; zero match balance impact. Depends on citizenship (Sprint 4).

**Effort (from plan-index):** 1 week.

---

### Task 9 — Re-enable Flags

**From plan-index:** Sprint 4 column. Not included in the Sprint 4 plan document. Sprint 5 Task 8a (Nickname Styling) and Task 15 (Custom Flags) depend on this cosmetics foundation being live.

**Current state:** No brief written. The flags feature exists in the codebase but is disabled. Requires payment infrastructure from Sprint 4 to be live.

**Effort (from plan-index):** 1 week.

---

### Task 9a — Re-enable Territory Patterns

**From plan-index:** Sprint 4 column. Not included in the Sprint 4 plan document. Sprint 5 Task 15 (Custom Uploaded Patterns) depends on this being live.

**Current state:** No brief written. High-visibility cosmetic, upsell surface. Requires payment infrastructure from Sprint 4 to be live.

**Effort (from plan-index):** 1 week.

---

### sec10 — Remove Password Deploy Fallbacks

**Brief:** `backlog/sec10-remove-password-deploy-fallbacks.md`

Security hardening follow-up from the VPS credential leak incident. Remove `sshpass`-based fallback logic and `ALLOW_SSH_PASSWORD_FALLBACK` flags from all deploy scripts. All supported flows must be SSH-key-only. Low risk, no player-facing impact.

---

### sec11 — Secret Management Beyond Env Files

**Brief:** `backlog/sec11-secret-management-beyond-env-files.md`

Security architecture follow-up from the VPS credential leak incident. Inventory secrets by type, choose a target secret-management approach for this team size, and migrate at least one class of secrets out of plaintext local env storage. Produces a documented model and rotation workflow.

---

### Task 5 — Deep Mobile Rendering Optimization ⏸ Parked

**From plan-index:** Parked until mobile DAU > 1,500. Desktop is the core audience.

**Condition to unpark:** mobile DAU crosses 1,500 in analytics. Do not assign to a sprint until that signal appears.

---

### Task 2i — Microsoft Clarity Session Recordings ⏸ Parked

**From plan-index:** Deferred after Sprint 3 — only useful once mobile performance is confirmed stable.

**Condition to unpark:** mobile performance baseline confirmed stable in Sentry/analytics. Qualitative diagnostic tool, not a sprint priority on its own.
