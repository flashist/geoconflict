# Profile Backend DB And API

**Source**: `ai-agents/tasks/done/0185-profile-05-backend-db-api/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T5

## Goal

Turn the live profile-service shell into a real Postgres-backed profile backend with a repository, migrations, readiness probe, client profile read endpoint, and internal match-XP crediting endpoint.

## Key Changes

- Implemented the first profile DB migration with `player_profiles`, `player_match_xp_credits`, and future-aware name/cosmetic tables.
- Added `PlayerProfileRepository` on the profile server so only the profile service talks to Postgres.
- Added `GET /v1/profile` for authenticated profile reads, `POST /internal/v1/credit` for service-token/IP-allowlisted match crediting, and DB-backed `GET /ready`.
- Kept `POST /v1/profile/migrate` out of scope because T2/T7 guest-first migration was cancelled.
- Enforced idempotent XP crediting by `(game_id, yandex_player_id)` and atomic XP/citizenship updates.
- Carried paid-citizenship invariants as server/DB write-path rules; paid state remains reserved for the later verified Yandex Payments flow.

## Outcome

T5 makes the profile backend independently exercisable with `curl` and unblocks the game-server T6 integration path. 🔴 **2026-09-04: whether anything is exercisable over the network today is UNVERIFIED — the profile host EXISTS, but nobody has confirmed what it serves.** ⚠️ **This supersedes an earlier same-day annotation here reading "there is NO profile host"; that overstated the owner's position and is withdrawn.** Owner rulings, both live in session and **both standing**: *"We don't have ANY profile-related VPS yet…"*, then *"the VPS and S3 I created will be reused."* 🔴 **Reconciled: the box exists and is reused in place; its provisioning state is unknown and unverified.** ⛔ **The T5 code is not in question**; the goal statement above ("turn the live profile-service shell into…") is an **unverified** claim about the box, not a disproven one. `GET /ready` — sometimes assumed never built — **does exist**, at `src/profile-server/Routes.ts:198-207`. Wipe-and-rebuild onto the existing box: `0213`–`0222` plus `0201`, Sprint 4 (`0215` inspects first). Grounding: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`. T6 later connected match-end winner handling to this internal credit endpoint; see [[tasks/profile-match-end-crediting]]. T5 also locks the storage strategy captured in [[decisions/profile-storage-strategy]]: typed columns plus `extra jsonb`, `xp bigint`, and `persistent_id text`.

The backend still does not by itself solve identity trust or 152-ФЗ compliance. The Yandex ID key is the current server-visible handle, but it is not a signed identity artifact on the match join path, and personal-data notification/consent work is deferred.

## Related

- [[systems/player-profile-store]]
- [[systems/player-infrastructure]]
- [[decisions/profile-storage-strategy]]
- [[decisions/personal-data-152fz-compliance]]
- [[decisions/sprint-4]]
- [[tasks/player-profile-store-investigation]]
- [[tasks/profile-schema-contract]]
- [[tasks/profile-deploy-hardening]]
- [[tasks/profile-game-server-deploy-env]]
- [[tasks/profile-server-bring-up-runbook]]
- [[tasks/profile-match-end-crediting]]
- [[tasks/personal-data-compliance-investigation]]
