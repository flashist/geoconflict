-- 002_hash_yandex_player_id.sql — 152-ФЗ pseudonymization (Sprint 4).
--
-- Decision (ai-agents/knowledge-base/personal-data-152fz-findings.md): the profile
-- store must NEVER persist the raw Yandex player ID. It stores only an irreversible,
-- keyed hash (HMAC-SHA256 with a server-side pepper — see src/profile-server/
-- YandexIdHash.ts). This migration renames the identity column to make its hashed
-- nature explicit, end to end.
--
-- WHY TRUNCATE FIRST: the live DB went live with little/no real data, and any rows
-- present hold the RAW id in `yandex_player_id`. A plain rename would leave those raw
-- ids sitting in the renamed `yandex_player_id_hash` column — raw PII masquerading as
-- a hash, which violates "no raw id at rest". We are doing this NOW precisely because
-- the table is effectively empty (cheap), so we purge the throwaway rows first. After
-- this, every value in the column is a genuine HMAC produced by the API boundary.
--
-- The migrate.ts runner wraps this file in a single transaction (no BEGIN/COMMIT
-- here) and records it in schema_migrations so it never re-runs in production. The
-- whole transition is ALSO guarded on the OLD column still existing, so a direct
-- re-apply (e.g. integration tests that bypass the runner's bookkeeping) is a true
-- no-op rather than an error — RENAME COLUMN is not natively idempotent.
--
-- SAFETY RAIL: the truncate is destructive and CANNOT be made data-preserving (the
-- raw->hash rewrite needs the secret pepper, which must never live in SQL). So if the
-- "table is effectively empty" precondition is ever violated — real profiles
-- registered before this ran — we FAIL CLOSED instead of silently destroying them.
-- This guards EVERY path (npm run migrate, migrate-profile.sh -y, CI, and the deploy
-- auto-migrate in setup-profile.sh), not just the interactive prompt. An empty table
-- (the intended case) passes with zero friction. To purge intentionally (e.g. a
-- deliberate re-key), back up first, then opt in for one run:
--   ALTER DATABASE <db> SET app.allow_profile_purge = 'on';  -- re-apply; then RESET.
do $$
declare
  existing_rows bigint;
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'player_profiles' and column_name = 'yandex_player_id'
  ) then
    select count(*) into existing_rows from player_profiles;
    if existing_rows > 0
       and coalesce(current_setting('app.allow_profile_purge', true), 'off') <> 'on' then
      raise exception
        'migration 002 would TRUNCATE % player_profiles row(s), cascading to '
        'player_match_xp_credits / player_name_history / player_cosmetic_ownership. %',
        existing_rows,
        'Refusing: the raw->hash transition assumes an empty table (no raw ID can be '
        'rehashed in SQL). If you REALLY intend to purge, back up first, then run '
        '"ALTER DATABASE <db> SET app.allow_profile_purge = ''on'';", re-apply, and RESET it.';
    end if;

    -- Purge raw-id rows. CASCADE follows the three ON DELETE CASCADE foreign keys
    -- (player_match_xp_credits, player_name_history, player_cosmetic_ownership), so
    -- one truncate clears all four tables.
    truncate table player_profiles cascade;

    -- Rename the identity column on the parent and every FK child. RENAME COLUMN
    -- automatically carries the primary key, the foreign-key constraints, and any
    -- dependent indexes with it — do NOT drop/recreate them. The child FK columns
    -- are independent column names, so each is renamed explicitly. The
    -- player_profiles_display_name_uq index is on display_name and is unaffected.
    alter table player_profiles           rename column yandex_player_id to yandex_player_id_hash;
    alter table player_match_xp_credits   rename column yandex_player_id to yandex_player_id_hash;
    alter table player_name_history       rename column yandex_player_id to yandex_player_id_hash;
    alter table player_cosmetic_ownership rename column yandex_player_id to yandex_player_id_hash;
  end if;
end $$;
