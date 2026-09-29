# Sprint 7 *(no theme name yet)*

**Date**: 2026-09-27
**Status**: proposed

> Source: `ai-agents/sprints/plan-sprint-7.md`. Line-3 banner: **`🔲 Backlog — 2026-09-27` — created, NOT
> started.** [[decisions/sprint-6]] is the active sprint.
>
> **Counted at `HEAD` = `68303d5`, by each row's leading status glyph: 11 rows — 8 `🔲 Backlog` · 3
> `🚧 Blocked`; all 11 OPEN.** ⚠️ Counted by me this run.

## Context

The board was created on **2026-09-27** to receive five rows the owner moved out of Sprint 6. Owner ruling,
typed in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037; ⛔ not
producer precedent), verbatim: *"Move the tasks 0027, 0030, 0032, 0219, 0221 to the Sprint 7"*. **The owner
moved rows here; they did not start this sprint.**

- ⚠️ **No theme name — an open owner question.** The title is just *"Sprint 7"*.
- ⚠️ **No goal set.** The producer did not invent one. The source describes the contents, not a goal.

## Decision

| Rank | Task | Status | Where it came from |
|---|---|---|---|
| — | `0027` New Maps — Community Demand (tracker, unranked ≠ low) | Backlog | Sprint 6 |
| 1 | `0030` S3-backed match archival (citizen-gated) | Backlog | Sprint 6 (position rank carried, **not** a merit rank) |
| — | `0032` investigate & fix client null-id errors | Blocked (deploy slot, then a ≥ 24 h re-measure) | Sprint 6 |
| — | `0219` profile P4 operability (G1/G2 core; G3/G4 deferred) | Blocked | Sprint 6 |
| — | `0221` profile P6 OS baseline hardening | Blocked (built + reviewed 2026-09-13) | Sprint 6 |
| 5 | `0323` mark a server-confirmed approved name in matches | Backlog | `0317` ruling D5 — *"…add it to the end of the end of the next sprint"*; depends on `0322` |
| 6 | `0332` join token — the game server has the profile server vouch for a verified session | Backlog | owner, 2026-09-28 — *"File it, end of Sprint 7 (Recommended)"*; on merit directly above `0323`, which depends on it |
| 7 | `0333` closing the host window before the private lobby exists leaves the player in a public lobby | Backlog | `0327` review R2, an owner-ruled known bug |
| 8 | `0334` host Start still sends `start_game` after the window closed during the settings save | Backlog | `0327` review R1, an owner-ruled known bug |
| 9 | `0335` investigate the four known lobby-close leftovers from `0327` | Backlog | `0327` plan residuals |
| 10 | `0336` tenure gift popup can open over a lobby or match on a quick-join | Backlog | `0329` review R3 — *"End of Sprint 7 (Recommended)"* |

⚠️ Ranks 6–10 are **append ranks**, not merit ranks — the board itself says so for each.

## Consequences

- `0332` is the step ADR-115 names as the **expected exit** for its forged-id residual: with `0325` (verified
  login), it lets `getCreditableYandexId` verify inside the funnel with no change to `0322`'s code. `0323`
  (the mark) must be decided against ADR-115's *"presented as confirmed identity"* condition before it ships.
- Five rows are profile/ops carry-overs from Sprint 4 via 5 and 6; the other six are Sprint 6 follow-ups.

## Related

- [[decisions/sprint-6]] — the active sprint these rows came from
- [[decisions/adr-115-approved-name-in-matches]] — `0323` and `0332`'s place in the trust story
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, ruling D5 (`0323`)
- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, source of `0333`–`0335`
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, source of `0336`
- [[decisions/sprint-5]] — its `0030`, `0032`, `0219`, `0221` rows now point here
- [[decisions/sprint-4]] — its moved rows for the same four tasks now point here
- [[decisions/product-strategy]] — `plan-index.md` lists this board
