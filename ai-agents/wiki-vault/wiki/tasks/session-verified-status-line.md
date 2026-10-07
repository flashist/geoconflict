# Show the Player Whether Their Session Is Verified — a Status Line in the Citizenship Card (task 0397)

**Source**: `ai-agents/tasks/done/0397-show-players-whether-their-session-is-verified/brief.md` (its `plan.md`, `worklog.md` and `review.md` read as supporting evidence) + `ai-agents/knowledge-base/reports/2026-10-06-0397-step1-product-spec.md`
**Status**: done (agent-closed — not owner-verified) — **built and committed (`036a5c8`), NOT deployed**
**Sprint/Tag**: Sprint 7, rank 46 (append rank, not a merit rank; on merit directly below `0250`) / task `0397`

> ✅ Closed 2026-10-06 by a spawned `fkit-producer` via `/fkit-task-done`, at `fkit-lead`'s instruction under
> `/fkit-sprint-ship-loop`, on the owner-approved `plan.md`, the build/verify-split rule (2026-09-29) and the owner's
> close condition, verbatim *"Agent runs with 4 workers (Recommended)"*. ⛔ **Nothing was seen on a real build.** The
> deploy and the live check are task **`0400`** (~~Sprint 8, rank 12~~ → 📌 **2026-10-06, later: moved to [[decisions/sprint-7]], rank 51** — owner ruling *"Move it to Sprint 7 (Recommended)"*, relayed by `fkit-lead`; the whole citizenship deploy-and-check chain `0396` / `0398` / `0400` / `0401` now sits on Sprint 7). Re-checked this sync: commit `036a5c8` is in no
> release tag. Task **`0278` was folded in and cancelled** — see [[decisions/cancelled-tasks]].

## Goal

[[tasks/paid-citizen-ad-free]] (`0248`) turns ads off only for a **verified** paid session, and fails open to ads on
every unknown. So a good-faith paid citizen still sees ads when their session is not verified this load, when the
profile read has not returned yet, or when it failed. The owner asked to make that state visible, verbatim excerpt:
*"we need to be explicit about the state with the users to avoid situations when they are confused."*

🚨 **The hard part:** on an unverified session the client **cannot know whether the player paid** — the unverified
view carries no paid fields, on purpose (ADR-116 Decision 4), and citizenship purchases are consumed, so the Yandex
SDK no longer lists them. The spec found the gap is smaller than it looked: the database forbids "paid but not
citizen" (`check (not is_paid_citizen or is_citizen)`), so an unverified **non-citizen** is certainly not paid. Only
an unverified **citizen** is "maybe paid".

## Key Changes

### Step 1 — owner rulings (2026-10-06, live via `AskUserQuestion`, relayed by `fkit-lead`)

| # | Question | Owner, verbatim | Effect |
|---|---|---|---|
| Q1 | What to tell an unverified citizen | *"A. One neutral message (Recommended)"* | One neutral message for **every unverified citizen**, paid or earned. **No device memory** of a past paid answer. Unverified non-citizens see nothing new. |
| Q2 | States, place, wording, analytics | *"Full set + analytics (Recommended)"* | All spec states, **inside the citizenship card, start screen only, nothing in matches**, plus three events. |
| Q3 | What the player can do | *"Button on load-fail only (Recommended)"* | One player-pressed **Restart game** button, on the *couldn't load profile* state only, never during a lobby or match. *Not confirmed* gets text advice only — a reload does not usually fix it, because Yandex hands out the same signed data for the whole visit ([[decisions/adr-121-login-signature-24h-window]]). ⚠️ **This widens `0273`'s ruling D3 by exactly this one button.** |
| Q4 | Deploy rule | *"Confirm + rollback rule (Recommended)"* | The **S3b profile server never goes live while a production client without `0397` is running.** `0397` may ship in the same slot as `0396`: S3b server first, then the owner's `0396` check, then the client. A server rollback also rolls the client back or switches `citizenship_ui` off. |
| — | `0278` overlap | *"Fold into 0397 (Recommended)"* | `0278` (the "couldn't load your progress — tap to restart" surface) folded in, including its late-SDK recovery path; `0278` cancelled. The restart button is its **own separate helper**, not `0273`'s login restart. |

**States and approved wording (EN; RU also owner-approved, in the brief):**

| State | When | Shows |
|---|---|---|
| Checking | card on, no read applied yet — replaces the old wrong flash of the guest card with its login button | *Checking your account…* |
| Verified paid citizen | verified owner view, paid | *✓ Verified — your paid citizenship benefits are on* |
| Not confirmed (citizen) | authoritative read, citizen, no owner view — **text only** | *We couldn't confirm your account this time. If you bought citizenship, it's safe — you may just see ads until it's confirmed. Closing and reopening the game usually helps.* |
| Couldn't load profile | read not authoritative (failed login, timeout, …) | *We couldn't load your profile right now. Nothing is lost — a restart usually helps.* + **Restart game** |
| After a restart that did not help | same, on the next load | *Still not working. Please try again a bit later — nothing is lost.* |

Guests, verified non-paid players, unverified non-citizens, and anyone with citizenship switched off: **nothing new**.
⚠️ The wording deliberately never promises "no ads" outright — whether Yandex shows a full-screen ad on its own is
unverified.

### Step 2 — the build (commit `036a5c8`, client only)

- `src/client/PlayerProfileView.ts` — new `isVerifiedRead` (verified owner view only; display-only, never a grant).
- `src/client/CitizenshipStatus.ts` — **extended, not duplicated** (the one-place rule): a new published
  `ProfileVerificationStatus` (`unknown | guest | read_failed | unverified | verified`) with get / subscribe.
  `0248`'s `isCurrentPlayerPaidCitizen()` and the three-value citizenship status are unchanged, pinned by tests.
- `src/client/CitizenshipNotice.ts` (new) — derives which notice to show; once-per-page-load event latches.
- `src/client/ProfileReadRestart.ts` (new) — the separate restart helper: start screen only, a refused press does
  nothing, a session marker lets the next load say "still not working". ⛔ Not `requestGameRestart()`, not the
  `Profile:Login:Restart:*` funnel.
- `src/client/CitizenshipCard.ts` — renders the states; re-reads when Yandex authorizes late (the `0278` path).
- `src/client/flashist/FlashistFacade.ts` — three event enum keys; a once-per-page "authorized late" signal.
- `src/client/ProfileSession.ts`, `src/client/GameRestart.ts` — comments only: name the second sanctioned restart
  trigger.
- `resources/lang/en.json` + `ru.json` — new `citizenship_status` section, 6 keys, checked against the approved table.
- Three events: `Citizenship:Status:Unverified`, `Citizenship:Status:ReadFailed`, `Citizenship:Status:Restart` — see
  [[systems/analytics]]. ⚠️ `Unverified` also counts earned citizens; it cannot count paid ones alone (that is the
  privacy point).

## Outcome

- **Review:** stateful round 1 *closed-out*; second opinion **reasoning-only**. R1 (the restart marker could outlive
  the next load if the card was hidden) fixed by consuming it first thing in `connectedCallback()`, with 3 tests.
- **Tests — the run that led to `0399`:** two full default-worker `npm test` runs were **red** (297 s, 291 s), each
  with one supertest-family timeout and one shell harness killed at its 150 s deadline — all outside `0397`'s change
  surface, no `0197` segfault sign. Diagnosed as macOS throttling a background Terminal; then `npm test --
  --maxWorkers=4`, one run, game in front: **exit 0, 199/199 suites, 3,863 passed, 1 skipped** (the Docker-gated
  harness — Docker down, **skipped, not passed**). See [[tasks/jest-worker-cap]].
- 🚨 **The owner's Mac kernel-panicked during one diagnostic full run (2026-10-06).** Cause **unproven**; nothing links
  it to `npm test` beyond timing.
- **Not verified:** every state on a real build (verified, unverified, RU, throttled network) → `0400`; the remote
  `citizenship_ui` half of the kill switch; the short re-render window after a late `getPlayer()`.
- **Open observation, not acted on:** `Unverified` / `ReadFailed` fire when the card publishes, whether or not the card
  is on screen (unlike `Citizenship:Seen`). A possible follow-up if the counts must mean "seen".
- ⚠️ **Before `0395` and `0396` are live, every logged-in citizen would see "not confirmed"** — hence Q4's rule.
- **`0332` link:** when a `0332` ruling takes a perk from unverified players, that ruling's task rewrites the
  *not confirmed* text, and switches on a message for unverified non-citizens if they lose something too.

## Related

- [[tasks/paid-citizen-ad-free]] — task `0248`, which may deploy only with or after this
- [[tasks/authenticated-profile-read]] — task `0250`, the S3b owner view this reads
- [[tasks/verified-login-enforce]] — task `0340`, verified sessions; live check `0395`
- [[decisions/adr-116-verified-login]] — Decision 4, which this explains to the player and does not soften
- [[decisions/adr-121-login-signature-24h-window]] — why a reload rarely fixes an unverified session
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, whose ruling D3 this widens by one button
- [[tasks/citizenship-restart-prompt]] — task `0303`, whose player-tapped reload the new restart helper mirrors
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, the late-recovery signal the card already used
- [[tasks/jest-worker-cap]] — task `0399`, filed from this task's red test runs
- [[decisions/cancelled-tasks]] — `0278`, folded in and cancelled
- [[systems/analytics]] — the three `Citizenship:Status:*` events
- [[decisions/sprint-7]] — the board (rank 46)
- [[decisions/sprint-8]] — its live check `0400` (rank 12 there; moved to Sprint 7, rank 51, 2026-10-06)
- [[decisions/sprint-backlog]] — the board that carried `0278` until it was folded in here
