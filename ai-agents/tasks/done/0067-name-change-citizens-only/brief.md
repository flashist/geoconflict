# Name Change (Citizens Only)

## ID
0067

## Sprint
Sprint 4

## Priority
Medium — first user-facing citizenship benefit; gives the citizenship threshold something concrete to buy. Cannot ship to players before live citizenship exists.

## Status
✅ Done (agent-closed — not owner-verified)

## ⚠️ Close-out — read this before treating the task as shipped (2026-08-28)

**Effective posture: built-awaiting-deploy — the same posture as `0062` and `0063`. Nothing in this
task is verified in production.** The close was performed by a producer spawned by the sprint
ship-loop, with no owner present; no human has checked this work.

**What is proven.** Built, stateful-reviewed (Round 1), all five findings dispositioned, ledger
`review.md` `Status: closed-out`; the reviewer independently re-ran every check and reproduced every
number in a phase-2 pass. Green: `npx tsc --noEmit`, `npm run lint`, prettier, `npm test`
(103 suites / 1039 tests), `RUN_DB_TESTS=1 npx jest tests/integration --runInBand --forceExit`
against real Postgres (5 suites / 70 tests), en/ru parity for `citizenship_name_change` (15/15 keys).
Plan approved by the owner with four amendments (`plan.md`); build record in `worklog.md`.

**What is NOT proven.**
- **Never run in production.** No deploy has happened; every claim here is local-stack and unit/integration
  evidence only.
- **The citizenship card has never been seen in a browser.** `flashistConstants.features.CITIZENSHIP_CARD_ENABLED`
  is `false`, so the entire UI leg — the name-change entry point, the pending/approved/rejected states —
  is proven by unit tests and nothing else.
- **The operator Telegram notification is unit-proven only.** Proxy reachability from the profile VPS was
  never exercised and is not locally testable; that verification belongs to task `0033`.

**Open residuals carried from the review ledger (`review.md` §Accepted residuals).**
- **(a) Forged-id offensive name submission — OPEN, mitigated.** The player routes accept a
  client-asserted, unverified `yandexPlayerId` (ADR-103), so someone who knows a citizen's non-secret id
  can submit an offensive name in that citizen's name. The human moderation gate mitigates it — and is
  materially stronger now, because a decision cannot be applied to a name the operator never read. Closes
  on `0014` (signed-payload verification, blocked on the Yandex IAP secret key).
- **(b) The pending, unmoderated name is PUBLICLY READABLE via the unauthenticated profile endpoint —
  UNMITIGATED.** `GET /v1/profile` is unauthenticated and enumerable by a non-secret player id, and
  `toPublicProfile` returns `name_change.requested_name` — whatever was submitted, **before any operator
  sees it**. **This passes no gate at all.** The moderation gate does **not** apply: an operator reviews a
  name before it is APPLIED, never before it is PUBLISHED. Owner-ruled to keep it (the player must be able
  to see their own request). **Do not describe this as solved, mitigated, or bounded.**
- **(c) The operator-notification cooldown is in-process.** A restart, or a second instance, allows one
  extra notification. Deliberate: the `expectedName` binding, not the cooldown, is what carries the safety.

## Owner
fkit-coder

## Context

First citizenship benefit (plan-sprint-4.md, Phase 2). Citizens — earned or paid — can change their display name; non-citizens cannot access the feature. The plan locks a **moderation step** (name review): a requested name is `pending` until approved, and only an approved name becomes active.

The data layer was designed ahead in the profile-store epic (`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md`, Part B): `player_profiles.display_name` (with a case-insensitive uniqueness index) and the `player_name_history` table carrying `moderation_status in ('pending','approved','rejected')`. **Verify these tables actually exist in the shipped migration before building — they were specified as "future-aware, no application logic yet."**

**Inbox notifications are a seam, not scope.** `0012-personal-inbox` (its brief §"Name change task") builds the send mechanism (`POST /admin/player-message`) and defers name-change triggers 3–4 to THIS task: if `0012` has shipped, wire the approved/rejected sends as one call each; if not, leave documented no-op seams in the same pattern `0017`/`0019` use.

Scoped 2026-08-24 by owner ruling (relayed via the lead session), replacing the plan's TBD row.

## What to build

Smallest shippable unit: the request → moderation → apply loop, end to end.

1. **Profile API (profile server):** citizen-gated `POST /v1/profile/name-change-request` (player-authenticated; reject non-citizens server-side) writing a `pending` row to `player_name_history`; validation server-side (length/charset — mirror the existing in-game username validation; uniqueness per the schema's index). One pending request per player at a time.
2. **Moderation decision path:** a minimal internal, service-authenticated admin endpoint (same `PROFILE_INTERNAL_TOKEN` posture as `/internal/v1/credit`) to approve/reject a pending request. On approve: set `player_profiles.display_name` and mark the history row `approved`, atomically. On reject: mark `rejected` with a reason. Notify the operator of new pending requests via the existing Telegram bot pipeline (the feedback-message precedent) — no new moderation UI.
3. **Client:** for logged-in citizens, a name-change entry point on the citizenship card surface — input, submit, and pending/approved/rejected state display from `GET /v1/profile`. Hidden for non-citizens and guests. All strings via `translateText`, en + ru.
4. **Inbox hooks:** one-call sends on approve/reject if `0012` is live; documented no-op seams otherwise.

Out of scope: where the approved display name surfaces beyond the profile/citizenship card (in-match labels, lobby lists) — see open question in Notes; inbox mechanism itself (`0012`); any cosmetic tie-in.

## Verification steps

1. Non-citizen and guest: entry point hidden; direct `POST` to the request endpoint rejected server-side.
2. Citizen: submit a valid name → `player_name_history` row `pending`; profile `display_name` unchanged; UI shows pending state.
3. Approve via the admin path → `display_name` updated and history row `approved` in one transaction; `GET /v1/profile` returns the new name; approved inbox message sent (or no-op seam logged) per `0012` state.
4. Reject → history row `rejected` with reason; `display_name` unchanged; UI shows rejected state and allows a new request.
5. Uniqueness: request a name already taken (case-insensitive) → validation rejection, no `pending` row.
6. Second request while one is pending → rejected.
7. Operator Telegram notification delivered on a new pending request.
8. Local stack (profile server + Postgres via Docker, `RUN_DB_TESTS=1`) — full loop green; en/ru keys in both files.

## Notes

- **Depends on:** 0017 — its Deferred Live Tail (live citizenship in production) gates the player-facing ship; build + local verification can proceed against the local profile stack, same treatment as 0017/0012. Soft: 0012 (inbox send mechanism — hooks stay no-op seams until it ships).
- **Blocks:** nothing on the board.
- Paid citizens come via 0065 — not a dependency; earned citizens are sufficient for the feature to exist.
- **~~Open questions for the owner:~~ ALL THREE RESOLVED 2026-08-28** (owner rulings, lead session via `AskUserQuestion`):
  - **(a) Moderation channel — RULED:** Telegram notification on a new pending request via the **existing** bot pipeline (the feedback-message precedent — find and reuse it, do not build a new one), **plus** a service-authenticated internal approve/reject endpoint. **No moderation UI.**
  - **(b) Scope of the approved display name — RULED:** **profile/citizenship card only.** Start-screen username prefill/lock, lobby player lists and in-match labels are **out of scope for this task** and become a **separate follow-up task**. Do not widen the change surface to them.
  - **(c) Validation — RULED:** mirror the **existing** in-game username validation (length/charset — reuse the actual validator, do not re-implement it) **plus** the profile schema's case-insensitive uniqueness index. No new bespoke rules.
