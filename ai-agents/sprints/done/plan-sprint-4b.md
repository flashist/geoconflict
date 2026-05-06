# Geoconflict — Sprint 4b — Interim Game Variety Update

> Intermission sprint. Citizenship (Sprint 4 core track) is paused while Mark is travelling (approximately May 15 – June 1, 2026). This sprint ships visible player-facing improvements to maintain game interest during the pause. No citizenship, payments, or player profile store work in this sprint.

---

## Sprint 4b Goal

Add three types of game variety to public matchmaking — compact maps, Duos/Trios/Quads modes, and weird-setting modifiers — so players see new content while the citizenship update is being completed. All three features reuse existing infrastructure; no new backend systems required.

---

## Deadline

**Must ship before May 15, 2026.** Mark is unavailable after that date and needs to be present for any post-release hotfixes.

---

## Sprint 4b Status

**Closed — all tasks shipped.**

| Status | Task | Brief |
|---|---|---|
| ✅ Done | Investigation — Compact Map + Duos/Trios/Quads Compatibility | `sprint4b-mini-mode-investigation.md` |
| ✅ Done | Re-enable Duos/Trios/Quads Modes | `sprint4b-duos-trios-quads.md` |
| ✅ Done | Compact Map in Public Rotation + Mini Badge | `sprint4b-compact-map-rotation.md` |
| ✅ Done | Weird-Setting Modifier in Public Rotation + Badge | `sprint4b-weird-setting-modifier.md` |

---

## Task Sequence

**Step 1 — Investigation first (1 day)**
Run the compatibility investigation before writing any implementation code. It is short and unblocks both the compact map and Duos/Trios/Quads tasks. If the investigation finds blockers, implementation scope can be adjusted before any time is spent.

**Step 2 — Implementation (parallel, after investigation)**
All three implementation tasks can proceed in parallel once investigation findings are clear. None depend on each other.

---

## Rotation Logic (locked)

| Parameter | Value |
|---|---|
| `MODIFIED_MATCH_RATE` | `0.2` (configurable constant) |
| Top-level modifier flags | 2: `mini_map`, `weird_setting` |
| Rate per top-level flag | 10% of all matches |
| Normal matches (no modifier) | 80% |
| Weird-setting sub-options | 4 (each ~2.5% of all matches) |

The modifier system has two levels. First: is this match modified? (20% rate, configurable). If yes: which top-level flag? (`mini_map` or `weird_setting`, equal probability). If `weird_setting`: which sub-option? (one of 4, equal probability). Mutual exclusivity is automatic — only one flag is ever active per match.

---

## Feature Decisions (locked)

**Compact maps:**
- Mixed into the regular public rotation; players do not choose — the rotation decides
- Mini badge displayed in the lobby UI alongside the existing team-type badge
- Badge text: "Мини" (ru) / "Mini" (en)
- Does not affect any game rules beyond map scale

**Duos/Trios/Quads:**
- Re-enabled; AI players fill any unfilled slots (same as existing public matches)
- Can appear in both normal and compact matches (subject to investigation findings)
- Must be tested on staging before shipping

**Weird-setting modifier:**
- One modifier randomly selected per modified match from: unlimited gold, unlimited army, no nukes, no SAM
- Badge displayed in the lobby UI; badge text chosen by the coder, reviewed by Mark before release
- Never applied to compact map matches

**No analytics** in this sprint for the new features.

---

## Notes

- Do not touch the citizenship track, player profile store, Yandex payments, or start screen redesign in this sprint
- The win-check regression investigation (`s4-win-check-multiplayer-regression-investigation.md`) remains in backlog and should be addressed after Mark returns
- Security tasks (sec10, sec11) remain in backlog
