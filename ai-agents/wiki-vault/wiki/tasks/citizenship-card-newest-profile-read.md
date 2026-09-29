# Citizenship Card Applies Only the Newest Profile Read (task 0326)

**Source**: `ai-agents/tasks/done/0326-citizenship-card-applies-only-the-newest-profile-read/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 40 (moved in from the Backlog board, owner ruling) / task `0326`

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. The live check on a slow connection
> was **not run**. ⚠️ **The full `npm test` was not re-run** after the one test added in review.

## Goal

Filed from `0303`'s plan (Q-C, *"Leave both out; file (ii)"*). `CitizenshipCard.refreshProfile` awaited a
profile read and applied whatever came back, with **no ordering guard**. If an older read landed after a newer
one, the stale answer won. Concrete case: session-start reconciliation re-grants citizenship while the card's
first read is still in flight — the re-read lands first (citizen), then the slow first read (not citizen)
wins. Worst case: the **buy button briefly returns** for a citizen, and the published status that drives the
private-lobby lock goes stale. The race pre-dates `0303`.

## Key Changes

- **Owner rulings (verbatim):** Q1 **"Newer already shown (Recommended)"** — drop a read only if a newer read
  has **already been applied** (`profileReadsIssued` + `newestAppliedProfileRead`); Q2 **"One read per refresh
  (Recommended)"**.
- A late older read is dropped silently; otherwise the four writes apply together — `this.profile`,
  `publishCitizenshipStatus()`, **`publishApprovedName()`** (added by `0321`; the merge note required both
  publishes inside the guard) and `requestUpdate()`.
- **Kept:** `refreshProfile()` stays the **single read path** — no new `loadPlayerProfileView()` caller — and
  every awaiting caller (tenure grant, purchase, name submit) still resumes when its read was superseded.
- ⚠️ **`Citizenship:Earned:XP` is dormant** — nothing calls its reporter since `0250`'s slice S1 (ruling D4) —
  so "fires exactly once" could not be tested as written; per Q2 the tests prove one server read per refresh
  and no retry instead.

## Outcome

- **Evidence:** race tests red on the old code; an option-B mutation check run; full `npm test` 170 suites /
  2974 tests at build.
- **Review:** *Ready to merge*, no confirmed defects. R1 owner-ruled **"Accept + pin with a test"** → accepted
  residual + pinning test; the two plan residuals kept (**"Yes, keep them"**).
- **Not verified:** on a slow or shaky connection, the card must not flip back to Buy for a citizen after
  start-up reconciliation.
- **Binding merge note for `0329`** (met there): the late-recovery reveal reads **only** through
  `refreshProfile()`; no second apply site.

## Related

- [[tasks/citizenship-restart-prompt]] — task `0303`, where the race was found and this task filed
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, which adds a second concurrent read and depended on this
- [[tasks/start-screen-approved-name-lock]] — task `0321`, whose `publishApprovedName()` is guarded here
- [[tasks/private-lobby-citizen-perk]] — task `0302`: the lock follows the status the card publishes
- [[tasks/citizenship-xp-progress-ui]] — the citizenship card itself
- [[decisions/sprint-6]] — the board carrying this task
- [[decisions/sprint-backlog]] — the Backlog board, where this task was filed before an owner ruling moved it to Sprint 6
- [[tasks/citizenship-card-vanishes-investigation]] — task `0318` (2026-09-28): why the citizenship card vanished after a match on a shaky connection
