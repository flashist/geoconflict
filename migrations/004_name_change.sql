-- 004_name_change.sql — citizen name-change moderation (task 0067).
--
-- 001 created `player_name_history` "future-aware, no application logic yet".
-- This migration adds the three things the moderation loop actually needs and
-- 001 did not have: a rejection reason, a decision timestamp, and the
-- "one pending request per player" constraint.
--
-- ⚠️ TRAP, documented deliberately: `moderation_status` DEFAULTS TO 'approved'
-- in 001. Any INSERT that omits the column creates an already-approved row that
-- silently skips moderation. Every writer MUST pass 'pending' explicitly —
-- NameChangeRepository does, and a test asserts it.
--
-- Column semantics:
--   changed_at       — when the request was SUBMITTED (001 named it for the
--                      approved-only world it was written for; it is the
--                      request timestamp here, not the decision timestamp).
--   decided_at       — when an operator approved or rejected it. NULL while pending.
--   rejection_reason — operator-authored text, set only on rejection. It reaches
--                      the player through the citizen-gated inbox message
--                      (`name_change_rejected`), NOT through the unauthenticated
--                      GET /v1/profile projection.
--
-- The migrate.ts runner wraps each file in a single transaction, so there is NO
-- explicit BEGIN/COMMIT here. Every statement is idempotent (IF NOT EXISTS).

alter table player_name_history
  add column if not exists rejection_reason text,
  add column if not exists decided_at        timestamptz;

-- "One pending request per player at a time" (brief step 6), enforced by the DB
-- rather than a read-then-insert race in application code. A second request while
-- one is pending raises 23505, which the repository maps to `pending_exists`.
-- Partial: approved/rejected history rows are unlimited per player.
create unique index if not exists player_name_history_one_pending_uq
  on player_name_history (yandex_player_id)
  where moderation_status = 'pending';

-- Latest-request lookup per player (the GET /v1/profile projection reads the
-- newest row to render pending / rejected / approved state on the card).
create index if not exists player_name_history_player_recent_idx
  on player_name_history (yandex_player_id, id desc);
