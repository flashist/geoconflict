-- cleanup.sql — delete the drill rows from the SOURCE (live) database (task 0275).
--
-- Deletes ONLY rows seed.sql wrote: receipts by the `drill0275-` token prefix (processed_purchases
-- has no foreign key, so a player delete never reaches it), then players by the drill uuid block —
-- which cascades to every other child table.
--
-- ⛔ If any count below is not 0 afterwards, something other than the drill wrote rows. REPORT IT.
-- Never widen the patterns to make the counts reach 0.

\set ON_ERROR_STOP on
\pset pager off
\pset tuples_only on
\pset format unaligned
set client_encoding = 'UTF8';
set timezone = 'UTC';

begin;
delete from processed_purchases where purchase_token like 'drill0275-%';
delete from players where id::text like '00000275-0000-4000-8000-%';   -- cascades everything else
commit;

select format('drill cleanup counts: players=%s player_identities=%s player_match_xp_credits=%s player_name_history=%s player_cosmetic_ownership=%s purchase_intents=%s processed_purchases=%s player_messages=%s player_xp_grants=%s',
  (select count(*) from players),
  (select count(*) from player_identities),
  (select count(*) from player_match_xp_credits),
  (select count(*) from player_name_history),
  (select count(*) from player_cosmetic_ownership),
  (select count(*) from purchase_intents),
  (select count(*) from processed_purchases),
  (select count(*) from player_messages),
  (select count(*) from player_xp_grants));
select 'schema_migrations: ' || coalesce(string_agg(filename, ',' order by filename), '') from schema_migrations;
