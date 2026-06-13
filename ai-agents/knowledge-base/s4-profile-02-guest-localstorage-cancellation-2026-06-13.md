# S4 Profile T2 — Guest localStorage Store: Cancellation Report

| | |
|---|---|
| **Task** | `ai-agents/tasks/backlog/s4-profile-02-guest-localstorage.md` (T2, Part C) |
| **Epic** | `ai-agents/tasks/backlog/s4-player-profile-store-impl.md` (child 2 of 8) |
| **Sprint** | Sprint 4 |
| **Branch** | `claude-s4-profile-02-guest-localstorage` (5 commits ahead of dev base `43cf561`) |
| **Date** | 2026-06-13 |
| **Status** | **Cancelled — work to be reverted manually by the user** |
| **Decision by** | Mark (ruflashist@gmail.com) |
| **Related findings** | [[sprint4-player-profile-store-findings]] |

---

## 1. Decision & reasoning

The decision is to **cancel this task and revert all the work done in its scope.**

**Reasoning (user):** the review process and the scope of the changes kept getting bigger. A significant amount of change was introduced *after* the initial implementation — four separate review-driven rounds of fixes — and the growth signalled that the task, as approached, was expanding beyond what was intended to be a small, ship-independently client slice.

The implementation itself is functional and tested, but the cost/scope trajectory no longer matched the intent, so the cleaner course is to revert now rather than continue hardening a client-only feature.

The user will perform the revert manually. **No code was reverted by the agent.**

---

## 2. What the task was

T2 implemented **Part C** of the player-profile epic: a **guest-only**, client-side XP/citizenship store in `localStorage`, using the versioned `PlayerProfile` schema from T1.

- Storage key `geoconflict_profile_<persistentID>`.
- On app init (guest): load → create if missing → migrate older versions → write back.
- On each qualifying match end (guest): `xp += 10`; at `xp >= 1000` flip `is_citizen = true` (local, UI-only).
- Qualification: spawned, did not voluntarily leave, and survived to end **or** was eliminated after participating.
- Explicitly **out of scope**: any server sync (T7), citizenship-card UI (Part G), server-side `is_citizen` (T5/T6).

It depended on T1 (schema contract — **done**) and blocked T7 (guest→authenticated migration — backlog).

---

## 3. What was built (initial implementation — commit `09bde49`, 670 insertions)

| File | Purpose |
|---|---|
| `src/core/profile/MatchQualification.ts` *(new)* | Shared pure predicate `qualifiesForMatchXp`, `applyMatchXp`, constants `GUEST_XP_PER_MATCH=10`, `CITIZENSHIP_XP_THRESHOLD=1000` — intended to be reused by the server (T6) to avoid drift. |
| `src/client/GuestProfileStore.ts` *(new)* | localStorage store: `loadOrCreateGuestProfile`, `creditQualifyingMatch`, injectable `StorageLike`, and a writeback guard refusing to overwrite a profile whose stored `schema_version` is newer than the build. |
| `src/client/ClientGameRunner.ts` *(edit)* | Match-end credit hook. |
| `src/client/Main.ts` *(edit)* | App-init guest profile load, gated on non-authenticated. |
| `tests/core/profile/MatchQualification.test.ts`, `tests/client/GuestProfileStore.test.ts` *(new)* | Unit coverage. |

---

## 4. Review-driven scope expansion (the crux of the decision)

After the initial commit, **four** `/process-review` rounds each surfaced an issue and added a fix + tests. Each was evaluated critically (the `process-review` workflow), not applied blindly, and the user approved each fix before it landed.

| Round | Commit | Finding (severity) | Verdict | Fix that landed | Δ |
|---|---|---|---|---|---|
| 1 | `4cbefaf` | Same match could credit XP more than once (per-runner flag insufficient; multi-tab / reconnect) (high) | **Partially correct** | gameID-keyed bounded ledger (`geoconflict_profile_credits_<persistentID>`, cap 100) | +145 / −9 |
| 2 | `d0d8317` | Non-atomic profile-then-ledger write → partial-failure double-credit (medium) | **Partially correct** | Reorder to marker-first (at-most-once) | +44 / −1 |
| 3 | `1607819` | Eliminated guests only credited if they spectate to the final WinUpdate → under-credits the common case + diverges from server semantics (high) | **Correct** | `pendingGuestCredit` pure helper + per-tick elimination trigger | +172 / −23 |
| 4 | `6db6a73` | Yandex "auth unknown" state credited as guest (logged-in user with hung `getPlayer()`) (high) | **Partially correct** | New `src/client/flashist/guestProfileEligibility.ts` + `FlashistFacade.canUseGuestProfile()`; both gates switched off the boolean `isYandexAuthorized()` | +88 / −5 |

Two new files (`guestProfileEligibility.ts`, plus its test) and edits to `FlashistFacade.ts` were pulled in by round 4 — i.e. the change footprint reached into the shared platform facade, beyond the original profile-store files.

---

## 5. Quantified scope growth

Final diff vs dev base `43cf561`: **9 files, 1,081 insertions** (working tree clean; everything committed).

- Initial implementation (`09bde49`): **670** insertions — **~62%** of the final size.
- Four review rounds combined: **~411** insertions plus meaningful rewrites (notably the match-end crediting in `ClientGameRunner.ts` was restructured twice).

So roughly **38% of the additions, and the only real rewrites, arrived after the initial implementation** — the concrete shape of the "scope kept growing" concern.

---

## 6. Verified impact of reverting (audited, not assumed)

A 4-way read-only audit of the whole repo (every XP writer, all of `src/server`, the leaderboard system, and the task/epic files) confirmed:

- **Reverting affects guest users only.** Guests lose client-side XP/citizenship accumulation. Already-stored guest profiles in `localStorage` become dormant (unread) — harmless.
- **Logged-in users are unaffected.** There is currently **no** implemented path for an authenticated user to earn profile XP: T3 (Yandex identity), T5 (backend DB/API), T6 (server match-end crediting) are all **backlog**. No `ProfileApiClient`, no `/internal/v1/credit`, no profiles table; `GameServer.handleWinner()` only archives the match. This task deliberately *skipped* authenticated users (awaiting that server), so removing it changes nothing for them.
- **The Yandex leaderboard-points system is separate and untouched.** `reportPlacement` / `reportParticipation` → `FlashistFacade.increaseCurPlayerLeaderboardScore` award points to *all* human players (guest and logged-in) and are independent of profile XP/citizenship. Reverting this task does not affect them.

Net: after revert, **no one earns profile XP** (the only crediting path was this guest store) until T5/T6 land — but that is the intended pre-T2 baseline, and it carries no risk to authenticated-user features or the leaderboard.

---

## 7. What to revert (for the manual revert)

All work is committed on `claude-s4-profile-02-guest-localstorage`, 5 commits ahead of dev base `43cf561`:

```
6db6a73 Claude: review changes        (round 4 — auth-unknown gate)
1607819 Claude: review changes        (round 3 — eliminated credit)
d0d8317 Claude: review changes        (round 2 — marker-first)
4cbefaf Claude: review changes        (round 1 — gameID ledger)
09bde49 Claude: s4-profile-02-guest-localstorage   (initial)
```

Files introduced/modified by these commits (the revert target):

- **New:** `src/core/profile/MatchQualification.ts`, `src/client/GuestProfileStore.ts`, `src/client/flashist/guestProfileEligibility.ts`, `tests/core/profile/MatchQualification.test.ts`, `tests/client/GuestProfileStore.test.ts`, `tests/client/guestProfileEligibility.test.ts`
- **Edited:** `src/client/ClientGameRunner.ts`, `src/client/Main.ts`, `src/client/flashist/FlashistFacade.ts`

**Important caveats:**
- **Do NOT revert `src/core/profile/PlayerProfile.ts`.** That is T1 (a separate, completed task) and is *not* part of these commits — a branch-level revert (delete branch / `git reset --hard 43cf561`) is clean and leaves T1 intact.
- These commits are on the feature branch; **confirm they have not been merged into `dev`** before deleting the branch.
- The task file `ai-agents/tasks/backlog/s4-profile-02-guest-localstorage.md` is unaffected by these commits. Per the project convention, the user moves task files manually — consider moving it to `ai-agents/tasks/cancelled/` to reflect this decision.

---

## 8. Were the review findings real? (honest assessment)

Yes — largely. This was **not** gold-plating of imaginary problems:

- **Round 3 (eliminated-credit)** was a genuine functional bug: in a typical multiplayer match most participants are eliminated before a winner emerges and commonly exit at the death screen, so the original win-only hook under-credited the *common* qualifying outcome and diverged from the server's intended "eliminated counts" rule.
- **Round 1 (idempotency)** and **Round 4 (auth-unknown)** were real, reachable correctness gaps (multi-tab double-credit; a logged-in user with a hung `getPlayer()` being treated as a guest).
- **Round 2 (partial-write atomicity)** was a narrow but real best-effort gap; the fix was a one-line reorder.

The takeaway is not that the reviews were wrong, but that **a client-only, localStorage-authoritative guest-XP design has a lot of inherent edge surface** — best-effort storage, multi-tab races, partial-write atomicity, platform-auth timing, and credit-timing. Hardening each of these in the client is exactly what drove the scope growth.

---

## 9. Lessons & recommendations for any revisit

1. **Prefer server-authoritative crediting.** Most of the edge cases above (idempotency, double-credit, auth-state ambiguity, "eliminated counts" semantics) largely disappear when the server is the source of truth. Revisiting T2 **together with or after T5/T6** would let the client be a thin best-effort cache rather than the authority, sharply reducing the edge surface.
2. **If shipped client-only again, fix the scope of correctness up front.** Decide explicitly which edge cases are in scope (e.g. "single-tab, best-effort, accept rare loss/double-count") and which are deferred, so review rounds don't expand the contract after the fact.
3. **Watch for footprint creep into shared modules.** Round 4 reached into `FlashistFacade.ts`; a guest-profile slice touching the platform facade is a signal the abstraction boundary needs deciding before coding.
4. **The shared core predicate idea is worth keeping.** `MatchQualification.ts` (pure qualify/credit rules + constants) was explicitly designed to be reused by the server to prevent client/server drift — a good pattern to carry into the T5/T6 implementation even though this task is reverted.

---

## 10. References

- Task: `ai-agents/tasks/backlog/s4-profile-02-guest-localstorage.md`
- Epic: `ai-agents/tasks/backlog/s4-player-profile-store-impl.md`
- Prior findings: `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`
- T1 schema contract (kept): `src/core/profile/PlayerProfile.ts`
