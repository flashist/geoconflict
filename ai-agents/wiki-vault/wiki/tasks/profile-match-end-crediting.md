# Profile Match-End Crediting

**Source**: `ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T6

## Goal

Award server-authoritative profile XP at match end for qualifying authenticated players without making gameplay cleanup depend on the profile API.

## Key Changes

- Added `playerParticipation` to the winner message contract so the client can send the compact spawned/alive/eliminated summary the server needs for XP qualification.
- Added `src/core/profile/MatchQualification.ts` as the pure qualification predicate: a player must be on the frozen start roster, spawned, alive at end or killed, connected, not kicked, and have a creditable Yandex ID.
- Added `src/server/ProfileApiClient.ts` as the game-server HTTP client for `POST /internal/v1/credit` plus profile upsert fallback. It is fail-soft, bounded-retry, no-op when `PROFILE_API_URL` or `PROFILE_INTERNAL_TOKEN` is missing, and relies on the profile server's idempotency key.
- Wired `GameServer.handleWinner()` to prefer winner votes that include participation data, then fire-and-forget match XP crediting exactly once after the winner is accepted.
- Added late `update_identity` handling so a Yandex ID that resolves after join can still be set before match-end crediting when the client first joined during degraded SDK initialization.

## Outcome

T6 completes the live earned-XP write path from game end to the profile API. The profile store implementation now has T1, T3, T4, T5, T6, and T8 done, with T2/T7 cancelled. The backup prerequisite that followed this slice has shipped as [[tasks/postgres-backup-routine]].

The implementation deliberately keeps match cleanup independent of the profile backend. If the API is down or misconfigured, the match still completes and the credit is dropped after the retry budget rather than blocking gameplay.

Identity trust remains a known boundary: current earned-XP crediting still uses the server-visible Yandex ID as an opaque key, not a signed identity proof. Paid entitlements remain reserved for the later Yandex Payments verification path.

> **Production status (verified 2026-08-23):** this path is complete in code but **no-ops in production** — `deploy.sh` never forwards `PROFILE_INTERNAL_TOKEN`, so `ProfileApiClient.isConfigured()` is false and no credit call is ever made (task `0062`, one-line fix). See [[systems/player-profile-store]].
>
> 🔴 **UPDATED 2026-09-04 — THE REASON MAY BE BIGGER THAN `0062`: THE PROFILE HOST EXISTS, BUT WHAT
> IT IS SERVING IS UNVERIFIED.** ⚠️ **This supersedes an earlier same-day annotation here reading
> "THERE IS NO PROFILE HOST TO CREDIT"; that overstated the owner's position and is withdrawn.**
> Owner rulings, both given live in session 2026-09-04 and **both standing**: *"We don't have ANY
> profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)"*,
> then *"We don't need to cancel any billings, the VPS and S3 I created will be reused."*
> 🔴 **Reconciled: a profile VPS and an S3 bucket physically EXIST and are REUSED IN PLACE;
> provisioning state and what runs are UNKNOWN AND UNVERIFIED.** So a non-blank token only reaches a
> working endpoint if the box is actually serving the stack, which nobody has confirmed.
> ⚠️ **Stated as strong inference, NOT as verified fact: this crediting path has almost certainly
> NEVER worked in production** — `0062` exists precisely because `PROFILE_INTERNAL_TOKEN` never
> reached the production game server. **Nobody has measured that; do not upgrade it to a measurement.**
> ⛔ **The T6 code is not in question** — it is complete and its idempotency is verified against real
> Postgres. It is waiting on infrastructure whose state nobody can vouch for. The wipe-and-rebuild
> **onto the existing box** (`0213`–`0222`, Sprint 4) is what gives it a verified target: inspect and
> re-provision first (`0215`), then the game-server wiring (`0217`), then
> `0062`'s D3 — one authenticated call working end to end — which is **the only check that catches the
> two silent barriers** on this path (a self-generated token ⇒ **401**; a stale
> `PROFILE_INTERNAL_ALLOW_IPS` ⇒ **403**, both invisible under ADR-101's fail-soft, no-queue client).
> Grounding: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.

## Related

- [[systems/player-profile-store]]
- [[systems/player-infrastructure]]
- [[systems/networking]]
- [[decisions/sprint-4]]
- [[decisions/personal-data-152fz-compliance]]
- [[tasks/yandex-identity-plumbing]]
- [[tasks/profile-game-server-deploy-env]]
- [[tasks/profile-backend-db-api]]
- [[tasks/postgres-backup-routine]]
- [[tasks/yandex-payments-investigation]]
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft delivery policy this task implemented
- [[decisions/adr-103-identity-trust-seam]] — the identity seam this task introduced
