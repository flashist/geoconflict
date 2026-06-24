-- 001_player_profiles.sql — initial player-profile schema (Sprint 4, T5).
--
-- Storage strategy: Option B (epic Part B) — typed columns for the
-- identity/constraint-heavy fields plus an `extra jsonb` overflow column for
-- forward-compatible fields not yet promoted to their own column. See the ADR at
-- karpathy-vault/wiki/decisions/profile-storage-strategy.md.
--
-- The migrate.ts runner wraps each file in a single transaction, so there is NO
-- explicit BEGIN/COMMIT here. Every statement is idempotent (IF NOT EXISTS) so a
-- re-run is a no-op even outside the runner's bookkeeping.
--
-- Column notes vs the epic's draft DDL:
--   * xp is `bigint` — lifetime accrual at +10/match; avoids int4 overflow (22003).
--   * persistent_id is `text` (not `uuid`) — the shared PlayerProfile contract types
--     it as z.string() and the game's persistentID is not guaranteed UUID-formatted
--     (it can be a raw token). `uuid` would reject those with error 22P02.
--   * CHECK constraints make the paid-citizenship invariants un-violable at the DB
--     layer (the server write path also enforces them — belt and suspenders).

create table if not exists player_profiles (
  yandex_player_id         text primary key,
  persistent_id            text unique,
  xp                       bigint not null default 0 check (xp >= 0),
  is_citizen               boolean not null default false,
  is_paid_citizen          boolean not null default false,
  citizenship_earned_at    timestamptz,
  citizenship_purchased_at timestamptz,
  display_name             text,
  schema_version           integer not null default 1,
  extra                    jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- Paid-citizenship invariants (carried from T1 review). Paid state is
  -- server-authoritative (Yandex Payments only); these guard against any writer
  -- producing an inconsistent row.
  constraint chk_paid_implies_citizen
    check (not is_paid_citizen or is_citizen),
  constraint chk_purchased_implies_paid
    check (citizenship_purchased_at is null or is_paid_citizen),
  constraint chk_earned_implies_citizen
    check (citizenship_earned_at is null or is_citizen)
);

-- Case-insensitive display-name uniqueness (only for set names).
create unique index if not exists player_profiles_display_name_uq
  on player_profiles (lower(display_name))
  where display_name is not null;

-- Idempotent XP credit ledger. (game_id, yandex_player_id) PK is the idempotency
-- key: a duplicate match-end credit is an ON CONFLICT DO NOTHING no-op.
create table if not exists player_match_xp_credits (
  game_id          text not null,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  xp_awarded       integer not null default 10,
  credited_at      timestamptz not null default now(),
  primary key (game_id, yandex_player_id)
);

-- Future-aware tables (created now, NO application logic in Sprint 4).
create table if not exists player_name_history (
  id                bigserial primary key,
  yandex_player_id  text not null references player_profiles(yandex_player_id) on delete cascade,
  old_display_name  text,
  new_display_name  text not null,
  changed_at        timestamptz not null default now(),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected'))
);

create table if not exists player_cosmetic_ownership (
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  cosmetic_type    text not null check (cosmetic_type in ('flag', 'pattern')),
  cosmetic_id      text not null,
  granted_at       timestamptz not null default now(),
  source           text not null default 'purchase',
  primary key (yandex_player_id, cosmetic_type, cosmetic_id)
);
