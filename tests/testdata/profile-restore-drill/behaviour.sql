-- behaviour.sql — checks a fingerprint CANNOT make, on the `006` schema (task 0275).
--
-- ⛔ Run on the RESTORED throwaway database ONLY — never on the live DB. (b) rolls back, but (c)
-- leaves one extra row behind on purpose; the throwaway is destroyed afterwards.
--
--   psql -U profile -d profile -f - < behaviour.sql 2>&1
--
-- Booleans are cast to text before format(): format('%s', true) renders `t`, not `true`.
-- ON_ERROR_STOP is OFF: each check prints its own labelled line, and a rejected insert is caught
-- and reported rather than aborting the run. Expected lines (all must appear, verbatim):
--   (a) rejected: sqlstate=23505 constraint=player_name_history_one_pending_uq
--   (a2) rejected: sqlstate=23505 constraint=player_match_xp_credits_pkey
--   (a3) rejected: sqlstate=23505 constraint=player_identities_pkey
--   (b) before: identities=1 credits=3 name_history=1 cosmetics=2 intents=1 messages=1 xp_grants=1 receipt_intent_set=true
--   (b) left: identities=0 credits=0 name_history=0 cosmetics=0 intents=0 messages=0 xp_grants=0
--   (b) receipt kept: rows=1 intent_id_null=true
--   (b) rolled back: players=8
--   (c) non-colliding next id: true
-- Plus an informational `(c) gap=N` line: 2 on a fresh sequence, because (a)'s failed insert already
-- used one sequence value (sequences are non-transactional). That is correct, not an anomaly.

\set ON_ERROR_STOP off
\pset pager off
\pset tuples_only on
\pset format unaligned
set client_encoding = 'UTF8';
set timezone = 'UTC';

-- (a) a second pending name change for a player who already has one (p02) → 23505
do $$
declare
  state text;
  constraint_hit text;
begin
  insert into player_name_history (player_id, new_display_name, moderation_status)
  values ('00000275-0000-4000-8000-000000000002', 'DrillSecondPending', 'pending');
  raise notice '(a) ACCEPTED — FAIL: a second pending name change was inserted';
exception when others then
  get stacked diagnostics state = returned_sqlstate, constraint_hit = constraint_name;
  raise notice '(a) rejected: sqlstate=% constraint=%', state, constraint_hit;
end
$$;

-- (a2) a duplicate (game_id, player_id) credit → primary key
do $$
declare
  state text;
  constraint_hit text;
begin
  insert into player_match_xp_credits (game_id, player_id, xp_awarded)
  values ('drill0275-game-01', '00000275-0000-4000-8000-000000000001', 10);
  raise notice '(a2) ACCEPTED — FAIL: a duplicate credit was inserted';
exception when others then
  get stacked diagnostics state = returned_sqlstate, constraint_hit = constraint_name;
  raise notice '(a2) rejected: sqlstate=% constraint=%', state, constraint_hit;
end
$$;

-- (a3) a duplicate (platform, platform_user_id) identity → primary key
do $$
declare
  state text;
  constraint_hit text;
begin
  insert into player_identities (platform, platform_user_id, player_id)
  values ('yandex_games', 'drill0275-yg-01', '00000275-0000-4000-8000-000000000002');
  raise notice '(a3) ACCEPTED — FAIL: a duplicate identity was inserted';
exception when others then
  get stacked diagnostics state = returned_sqlstate, constraint_hit = constraint_name;
  raise notice '(a3) rejected: sqlstate=% constraint=%', state, constraint_hit;
end
$$;

-- (b) FK cascade + `on delete set null`, inside a transaction that is ROLLED BACK.
-- p04 has a row in every child table; its intent is referenced by receipt drill0275-tok-03.
begin;
select format('(b) before: identities=%s credits=%s name_history=%s cosmetics=%s intents=%s messages=%s xp_grants=%s receipt_intent_set=%s',
  (select count(*) from player_identities         where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_match_xp_credits   where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_name_history       where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_cosmetic_ownership where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from purchase_intents          where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_messages           where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_xp_grants          where player_id = '00000275-0000-4000-8000-000000000004'),
  (select (intent_id is not null)::text from processed_purchases where purchase_token = 'drill0275-tok-03'));
delete from players where id = '00000275-0000-4000-8000-000000000004';
select format('(b) left: identities=%s credits=%s name_history=%s cosmetics=%s intents=%s messages=%s xp_grants=%s',
  (select count(*) from player_identities         where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_match_xp_credits   where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_name_history       where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_cosmetic_ownership where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from purchase_intents          where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_messages           where player_id = '00000275-0000-4000-8000-000000000004'),
  (select count(*) from player_xp_grants          where player_id = '00000275-0000-4000-8000-000000000004'));
select format('(b) receipt kept: rows=%s intent_id_null=%s',
  count(*), coalesce(bool_and(intent_id is null), false)::text)
  from processed_purchases where purchase_token = 'drill0275-tok-03';
rollback;
select format('(b) rolled back: players=%s', count(*)) from players;

-- (c) the sequence hands out a NON-COLLIDING next id. All parts of one statement share a snapshot,
-- so `before_insert` sees the table as it was before the probe row.
with before_insert as (
  select coalesce(max(id), 0) as max_id from player_name_history
), probe as (
  insert into player_name_history (player_id, new_display_name, moderation_status)
  values ('00000275-0000-4000-8000-000000000001', 'DrillSeqProbe', 'approved')
  returning id
)
select format('(c) non-colliding next id: %s', (probe.id > before_insert.max_id)::text)
       || E'\n' || format('(c) gap=%s', probe.id - before_insert.max_id)
  from probe, before_insert;
