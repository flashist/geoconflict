-- 010 — durable-item ownership (task 0496). The primary key is the one-per-product rule:
-- a second grant of the same item is a no-op. Citizenship stays on the players flags.
-- Not idempotent on purpose, like 006–009; the runner wraps this file in one transaction.

create table player_entitlements (
  player_id      uuid not null references players (id) on delete cascade,
  product_id     text not null,
  purchase_token text not null,
  granted_at     timestamptz not null default now(),
  primary key (player_id, product_id)
);
