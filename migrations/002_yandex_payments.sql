-- 002_yandex_payments.sql — Yandex payments infrastructure (task 0019).
--
-- Two tables:
--   * purchase_intents: server-issued intent created BEFORE the payment frame
--     opens; its uuid travels through Yandex as `developerPayload` and binds the
--     signed purchase back to the player who asked for it. Single-use (used_at).
--     NO expiry column on purpose — a reconcile for an interrupted purchase may
--     legitimately arrive days later; single-use + the token PK below are the
--     replay guards.
--   * processed_purchases: idempotency ledger keyed by Yandex purchaseToken.
--     A replayed /complete or /reconcile hits the PK and becomes a no-op grant.
--
-- Postgres 16 (setup-profile.sh pins postgres:16-alpine), so gen_random_uuid()
-- is built-in — no pgcrypto extension needed.
--
-- The migrate.ts runner wraps each file in a single transaction, so there is NO
-- explicit BEGIN/COMMIT here. Every statement is idempotent (IF NOT EXISTS).

create table if not exists purchase_intents (
  id               uuid primary key default gen_random_uuid(),
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  product_id       text not null,
  created_at       timestamptz not null default now(),
  used_at          timestamptz
);

create index if not exists purchase_intents_player_idx
  on purchase_intents (yandex_player_id);

create table if not exists processed_purchases (
  purchase_token   text primary key,
  yandex_player_id text not null,
  product_id       text not null,
  -- Nullable on purpose: keeps the receipt row even if the intent is ever
  -- purged (ON DELETE SET NULL — a profile erasure cascades into
  -- purchase_intents and must not fail on this FK); the grant path always
  -- supplies it.
  intent_id        uuid references purchase_intents(id) on delete set null,
  raw_payload      text not null,
  processed_at     timestamptz not null default now()
);
