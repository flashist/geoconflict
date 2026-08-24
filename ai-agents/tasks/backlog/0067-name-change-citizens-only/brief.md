# Name Change (Citizens Only)

## ID
0067

## Sprint
Sprint 4

## Priority
Medium — first user-facing citizenship benefit; gives the citizenship threshold something concrete to buy. Cannot ship to players before live citizenship exists.

## Status
🔲 Backlog

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
- **Open questions for the owner:** (a) confirm the moderation channel — recommended: Telegram notification + internal admin endpoint, no UI; (b) where the approved display name applies beyond the profile card (e.g. prefill/lock the start-screen username for logged-in citizens) — recommended as a separate follow-up task once ruled; (c) confirm validation rules (recommend mirroring the existing username validation + the schema's uniqueness).
