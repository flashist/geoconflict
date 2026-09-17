-- verify.sql — fingerprint of a profile DB on the `006` schema (task 0275).
--
-- Run it against BOTH the source and the restored database, then `diff` the two outputs: no
-- difference = IDENTICAL. Shared by the local dry-run and the owner's drill on the box.
--
--   psql -X -U profile -d profile -f - < verify.sql
--
-- 🔴 The LAST line of the output must be `verify_end: complete`. ON_ERROR_STOP stops the file at the first
-- failing statement, so two runs cut short at the same place (or two empty outputs from a missing file)
-- would otherwise diff as IDENTICAL. Check the sentinel and psql's exit status on BOTH sides before diff.
--
-- 🔴 The three `set` lines are load-bearing. row_to_json renders timestamptz in the SESSION timezone,
-- so two identical databases read with different settings give different digests — a false alarm
-- shaped exactly like a real defect. Do not drop them.

\set ON_ERROR_STOP on
\pset pager off
set client_encoding = 'UTF8';
set timezone = 'UTC';
set datestyle = 'ISO, YMD';

\echo '=== coverage: base tables this file does NOT fingerprint (must be none) ==='
-- When a future migration adds a table, its name appears here instead of `none`, so a hard-coded
-- table list can never silently skip it again.
select 'uncovered_tables: ' || coalesce(string_agg(table_name::text, ',' order by table_name::text), 'none') as coverage
  from information_schema.tables
 where table_schema = 'public'
   and table_type = 'BASE TABLE'
   and table_name::text not in (
     'players', 'player_identities', 'player_match_xp_credits', 'player_name_history',
     'player_cosmetic_ownership', 'purchase_intents', 'processed_purchases', 'player_messages',
     'player_xp_grants', 'schema_migrations'
   );

\echo '=== row counts + content digests (10 tables) ==='
select 'players' as tbl, count(*) as n,
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.id), '')) as digest from players t
union all select 'player_identities', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.platform, t.platform_user_id), '')) from player_identities t
union all select 'player_match_xp_credits', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.game_id, t.player_id), '')) from player_match_xp_credits t
union all select 'player_name_history', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.id), '')) from player_name_history t
union all select 'player_cosmetic_ownership', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.player_id, t.cosmetic_type, t.cosmetic_id), '')) from player_cosmetic_ownership t
union all select 'purchase_intents', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.id), '')) from purchase_intents t
union all select 'processed_purchases', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.purchase_token), '')) from processed_purchases t
union all select 'player_messages', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.id), '')) from player_messages t
union all select 'player_xp_grants', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.player_id, t.kind), '')) from player_xp_grants t
union all select 'schema_migrations', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text, '|' order by t.filename), '')) from schema_migrations t
order by 1;

\echo '=== sequences (a lost setval is the classic silent restore defect) ==='
select 'player_messages_id_seq' as seq, last_value, is_called from player_messages_id_seq
union all
select 'player_name_history_id_seq', last_value, is_called from player_name_history_id_seq
order by 1;

\echo '=== schema shape: constraint and index DEFINITIONS, not just names ==='
-- Definition digests catch a lost `on delete cascade` or a lost partial `where` clause, which a
-- name-only digest cannot.
select count(*) as public_constraints,
       md5(string_agg(r.relname || '.' || c.conname || ':' || pg_get_constraintdef(c.oid), '|'
                      order by r.relname, c.conname)) as constraint_def_digest
  from pg_constraint c
  join pg_class r on r.oid = c.conrelid
  join pg_namespace n on n.oid = r.relnamespace
 where n.nspname = 'public';
select count(*) as public_indexes,
       md5(string_agg(indexname || ':' || indexdef, '|' order by indexname)) as index_def_digest
  from pg_indexes
 where schemaname = 'public';
select count(*) filter (where indexdef like '% WHERE %') as partial_indexes
  from pg_indexes
 where schemaname = 'public';

\echo '=== spot checks (human-readable, not just a hash) ==='
select xp as p01_bigint_xp
  from players where id = '00000275-0000-4000-8000-000000000001';
select extra -> 'nested' ->> 'ru' as p07_jsonb_ru
  from players where id = '00000275-0000-4000-8000-000000000007';
select display_name, length(display_name) as chars, octet_length(display_name) as bytes
  from players
 where id in ('00000275-0000-4000-8000-000000000003', '00000275-0000-4000-8000-000000000004')
 order by id;
select count(*) filter (where display_name is null) as null_display_names
  from players;
select count(*) filter (where intent_id is null) as receipts_without_intent
  from processed_purchases;
select count(*) filter (where read_at is null) as unread_messages
  from player_messages;
select moderation_status, count(*)
  from player_name_history group by 1 order by 1;
select body as quote_heavy_body
  from player_messages where title = 'Drill quote test';
select player_id, count(*) as identities
  from player_identities group by 1 having count(*) > 1 order by 1;

-- End-of-file sentinel: printed only if every statement above succeeded. Keep it the LAST line.
\echo 'verify_end: complete'
