-- 006_player_identity.sql — internal player id + platform identities (task 0270, ADR-113).
--
-- Re-keys the whole profile schema from the raw Yandex id to an internal random
-- UUID. A player is a `players` row; how they logged in is a `player_identities`
-- row ((platform, platform_user_id) → player_id), many per player. No other table
-- holds a platform id any more. Design: ai-agents/knowledge-base/reports/
-- 2026-09-15-profile-identity-design.md §3.
--
-- The migrate runner (src/profile-server/Migrations.ts) wraps this file in ONE
-- transaction, so there is NO explicit BEGIN/COMMIT here: a refusal or any failure
-- leaves the database exactly as it was.
--
-- ⚠️ Unlike 001–004 this file is deliberately NOT idempotent. The `create table`
-- statements carry no IF NOT EXISTS, so a wrongly shaped leftover table (e.g. the
-- never-deployed 005's `player_xp_grants` on a local database) fails loudly instead
-- of being silently kept. Re-applying is prevented only by the runner's filename
-- bookkeeping in `schema_migrations`.
--
-- ⚠️ This rebuild is only free while the old tables are EMPTY. The guard below
-- refuses the moment any of them holds a row: from then on this is a data
-- migration and must be re-planned, never bypassed.

-- ── 1. Guard ─────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  has_rows boolean;
begin
  foreach t in array array[
    'player_profiles',
    'player_match_xp_credits',
    'player_name_history',
    'player_cosmetic_ownership',
    'purchase_intents',
    'processed_purchases',
    'player_messages'
  ] loop
    if to_regclass(t) is null then
      continue;
    end if;
    execute format('select exists (select 1 from %I)', t) into has_rows;
    if has_rows then
      raise exception
        'migration 006 refused: table % holds rows. Re-keying to an internal player id (ADR-113) is now a data migration — re-plan, do not bypass.',
        t;
    end if;
  end loop;
end
$$;

-- ── 2. Drop the old, Yandex-keyed tables (children first) ────────────────────
drop table if exists player_messages cascade;
drop table if exists processed_purchases cascade;
drop table if exists purchase_intents cascade;
drop table if exists player_cosmetic_ownership cascade;
drop table if exists player_name_history cascade;
drop table if exists player_match_xp_credits cascade;
drop table if exists player_profiles cascade;

-- ── 3. players ───────────────────────────────────────────────────────────────
-- The profile itself. `id` is a random UUID primary key: the PK's unique index
-- makes a duplicate impossible to commit, and the find-or-create path retries on
-- the ~never collision (PlayerIdentityRepository). The id never reaches a client.
-- `persistent_id` is gone: nothing read it but the old upsert, and its UNIQUE
-- constraint 409'd a shared browser with two Yandex accounts.
create table players (
  id                       uuid primary key default gen_random_uuid(),
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
  last_login_at            timestamptz not null default now(),
  -- Paid-citizenship invariants, verbatim from 001.
  constraint chk_paid_implies_citizen
    check (not is_paid_citizen or is_citizen),
  constraint chk_purchased_implies_paid
    check (citizenship_purchased_at is null or is_paid_citizen),
  constraint chk_earned_implies_citizen
    check (citizenship_earned_at is null or is_citizen)
);

-- Case-insensitive display-name uniqueness (only for set names).
-- NameChangeRepository narrows its 23505 catch by this exact index name.
create unique index players_display_name_uq
  on players (lower(display_name))
  where display_name is not null;

-- ── 4. player_identities ─────────────────────────────────────────────────────
-- One row per login method. The PK is what makes "one player per identity" hold
-- under concurrency; there is deliberately NO unique (player_id, platform), so
-- account linking stays possible later (ADR-113, not built).
create table player_identities (
  platform         text not null check (platform in ('yandex_games')),
  platform_user_id text not null
    check (char_length(platform_user_id) between 1 and 128),
  player_id        uuid not null references players (id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_login_at    timestamptz not null default now(),
  primary key (platform, platform_user_id)
);

create index player_identities_player_idx
  on player_identities (player_id);

-- ── 5. Child tables, re-keyed yandex_player_id text → player_id uuid ─────────
-- Everything else is preserved from 001–004, including constraint and index
-- names the application code relies on.

-- Idempotent XP credit ledger: (game_id, player_id) is the idempotency key.
-- `xp_awarded default 10` is carried verbatim (stale, but not this task's change).
create table player_match_xp_credits (
  game_id     text not null,
  player_id   uuid not null references players (id) on delete cascade,
  xp_awarded  integer not null default 10,
  credited_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

-- Name-change moderation (001 columns + 004's rejection_reason / decided_at).
--
-- ⚠️ TRAP, preserved deliberately (design §8 Q2, not ruled): `moderation_status`
-- DEFAULTS TO 'approved'. Any INSERT that omits the column creates an
-- already-approved row that silently skips moderation. Every writer MUST pass
-- 'pending' explicitly — NameChangeRepository does, and a test asserts it.
create table player_name_history (
  id                bigserial primary key,
  player_id         uuid not null references players (id) on delete cascade,
  old_display_name  text,
  new_display_name  text not null,
  changed_at        timestamptz not null default now(),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  rejection_reason  text,
  decided_at        timestamptz
);

-- One pending request per player; approved/rejected history is unlimited.
create unique index player_name_history_one_pending_uq
  on player_name_history (player_id)
  where moderation_status = 'pending';

-- Latest-request lookup per player (the GET /v1/profile projection).
create index player_name_history_player_recent_idx
  on player_name_history (player_id, id desc);

create table player_cosmetic_ownership (
  player_id    uuid not null references players (id) on delete cascade,
  cosmetic_type text not null check (cosmetic_type in ('flag', 'pattern')),
  cosmetic_id  text not null,
  granted_at   timestamptz not null default now(),
  source       text not null default 'purchase',
  primary key (player_id, cosmetic_type, cosmetic_id)
);

-- Server-issued purchase intent; its uuid travels through Yandex as
-- developerPayload. Single-use (used_at), no expiry on purpose (see 002).
create table purchase_intents (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players (id) on delete cascade,
  product_id  text not null,
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);

create index purchase_intents_player_idx
  on purchase_intents (player_id);

-- Idempotency ledger keyed by the Yandex purchaseToken. `player_id` has NO
-- foreign key on purpose: the receipt must outlive a profile erasure. The intent
-- link is nullable for the same reason (ON DELETE SET NULL).
create table processed_purchases (
  purchase_token text primary key,
  player_id      uuid not null,
  product_id     text not null,
  intent_id      uuid references purchase_intents (id) on delete set null,
  raw_payload    text not null,
  processed_at   timestamptz not null default now()
);

-- Personal inbox. Content is EITHER a template OR literal title+body (see 003).
create table player_messages (
  id               bigserial primary key,
  player_id        uuid not null references players (id) on delete cascade,
  template_key     text,
  template_params  jsonb not null default '{}'::jsonb,
  title            text,
  body             text,
  sent_at          timestamptz not null default now(),
  read_at          timestamptz,
  constraint chk_message_content
    check (
      (template_key is not null and title is null and body is null)
      or (template_key is null and title is not null and body is not null)
    ),
  constraint chk_read_after_sent
    check (read_at is null or read_at >= sent_at)
);

create index player_messages_player_sent_idx
  on player_messages (player_id, sent_at desc, id desc);

create index player_messages_unread_idx
  on player_messages (player_id) where read_at is null;

-- ── 6. player_xp_grants ──────────────────────────────────────────────────────
-- One-off free XP grants (ADR-112, amended). The (player_id, kind) PK means
-- "checked": a row with xp_awarded = 0 is a final "checked, nothing granted".
-- Created here — the untracked 005 that first drafted it was never deployed.
create table player_xp_grants (
  player_id  uuid not null references players (id) on delete cascade,
  kind       text not null check (kind in ('tenure')),
  xp_awarded integer not null check (xp_awarded >= 0),
  evidence   jsonb not null,
  granted_at timestamptz not null default now(),
  primary key (player_id, kind)
);
