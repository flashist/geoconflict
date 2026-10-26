-- 009 — rewarded-ad match-XP ledger (task 0491). The primary key is the once-per-match rule.
-- Not idempotent on purpose, like 006–008; the runner wraps this file in one transaction.

create table player_rewarded_match_xp (
  game_id    text not null,
  player_id  uuid not null references players (id) on delete cascade,
  xp_awarded integer not null check (xp_awarded >= 0),
  granted_at timestamptz not null default now(),
  primary key (game_id, player_id)
);
