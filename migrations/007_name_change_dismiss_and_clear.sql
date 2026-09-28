-- 007_name_change_dismiss_and_clear.sql — hide a declined notice, clear an approved name (task 0314).
--
-- Two small changes to `player_name_history`, both owner-ruled 2026-09-27:
--
--   1. `dismissed_at` — when the player tapped "Hide" on a DECLINED request. The
--      GET /v1/profile projection then treats that row as nothing to show, so the
--      card goes back to its idle state on every device. Only ever set on the
--      player's newest row, and only while that row is 'rejected'
--      (NameChangeRepository.dismissRejection).
--
--   2. A fourth status, 'cleared' — the audit row an operator's "clear" decision
--      writes when it sets `players.display_name` back to NULL
--      (NameChangeRepository.clearDisplayName). A cleared row carries NO new name,
--      so `new_display_name` becomes nullable, and a CHECK ties the two together:
--      a row has no new name EXACTLY when it is 'cleared'. The removed name is kept
--      in `old_display_name`, and the operator's reason in `rejection_reason`.
--
-- The migrate runner (src/profile-server/Migrations.ts) wraps this file in ONE
-- transaction, so there is NO explicit BEGIN/COMMIT here.
--
-- ⚠️ Deliberately NOT idempotent, like 006: `drop constraint` carries no IF EXISTS,
-- so if the auto-named CHECK from 006 is not called what this file expects, the
-- migration fails loudly (and rolls back whole) instead of leaving the old
-- three-status CHECK in place next to the new one.
--
-- ⚠️ TRAP, preserved deliberately (design §8 Q2, not ruled): `moderation_status`
-- still DEFAULTS TO 'approved'. This file does not touch the default. Every writer
-- MUST pass the status explicitly — NameChangeRepository does.

alter table player_name_history
  add column dismissed_at timestamptz;

alter table player_name_history
  alter column new_display_name drop not null;

-- 006 declared the status CHECK inline, so Postgres named it
-- <table>_<column>_check.
alter table player_name_history
  drop constraint player_name_history_moderation_status_check;

alter table player_name_history
  add constraint player_name_history_moderation_status_check
    check (moderation_status in ('pending', 'approved', 'rejected', 'cleared'));

-- A row has no new name exactly when it is a 'cleared' audit row.
alter table player_name_history
  add constraint player_name_history_cleared_has_no_name_check
    check ((moderation_status = 'cleared') = (new_display_name is null));
