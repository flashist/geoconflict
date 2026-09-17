-- seed.sql — synthetic drill rows on the `006` schema (task 0275).
--
-- Shared by the local dry-run (tests/profile-backup-dryrun.sh) and the owner's restore drill on the
-- box (runbook §"Restore TEST drill"), so every SQL step the owner runs was run locally first.
--
-- Everything here is SYNTHETIC. Text ids carry the prefix `drill0275-`; uuids use the block
-- `00000275-0000-4000-8000-0000000000NN`. cleanup.sql deletes exactly these rows and nothing else.
--
-- ⚠️ Only free while the profile DB holds NO real rows. The check block below refuses if ANY data
-- table already has a row, and the whole file is one transaction, so a refusal changes nothing.

\set ON_ERROR_STOP on
set client_encoding = 'UTF8';
set timezone = 'UTC';

begin;

do $$
declare
  t text;
  has_rows boolean;
begin
  foreach t in array array[
    'players',
    'player_identities',
    'player_match_xp_credits',
    'player_name_history',
    'player_cosmetic_ownership',
    'purchase_intents',
    'processed_purchases',
    'player_messages',
    'player_xp_grants'
  ] loop
    execute format('select exists (select 1 from %I)', t) into has_rows;
    if has_rows then
      raise exception 'drill seed refused: % holds rows', t;
    end if;
  end loop;
end
$$;

-- ── players (8) ──────────────────────────────────────────────────────────────
-- p01 bigint xp above int4 range, paid citizen   p02 NULL name, plain
-- p03 Cyrillic name, earned citizen              p04 Cyrillic + apostrophe, paid citizen
-- p05 paid AND earned citizen                    p06 NULL name, citizen with no timestamps
-- p07 nested jsonb extra                         p08 schema_version 2, non-UTC offset timestamp
insert into players
  (id, xp, is_citizen, is_paid_citizen, citizenship_earned_at, citizenship_purchased_at,
   display_name, schema_version, extra, created_at, updated_at, last_login_at)
values
 ('00000275-0000-4000-8000-000000000001', 3000000000, true,  true,  null,                     '2026-06-02 10:00:00+00', 'DrillAlpha',   1, '{}'::jsonb,                                         '2026-06-01 10:00:00+00', '2026-06-02 10:00:00+00', '2026-09-01 10:00:00+00'),
 ('00000275-0000-4000-8000-000000000002', 0,          false, false, null,                     null,                     null,           1, '{}'::jsonb,                                         '2026-06-01 11:00:00+00', '2026-06-01 11:00:00+00', '2026-09-01 11:00:00+00'),
 ('00000275-0000-4000-8000-000000000003', 1000,       true,  false, '2026-06-03 10:00:00+00', null,                     'Дрилл Чарли',  1, '{}'::jsonb,                                         '2026-06-01 12:00:00+00', '2026-06-03 10:00:00+00', '2026-09-01 12:00:00+00'),
 ('00000275-0000-4000-8000-000000000004', 250,        true,  true,  null,                     '2026-06-04 10:00:00+00', 'О''Дрилл-Тест', 1, '{}'::jsonb,                                        '2026-06-01 13:00:00+00', '2026-06-04 10:00:00+00', '2026-09-01 13:00:00+00'),
 ('00000275-0000-4000-8000-000000000005', 1500,       true,  true,  '2026-06-05 09:00:00+00', '2026-06-05 10:00:00+00', 'DrillEcho',    1, '{}'::jsonb,                                         '2026-06-01 14:00:00+00', '2026-06-05 10:00:00+00', '2026-09-01 14:00:00+00'),
 ('00000275-0000-4000-8000-000000000006', 1000,       true,  false, null,                     null,                     null,           1, '{}'::jsonb,                                         '2026-06-01 15:00:00+00', '2026-06-01 15:00:00+00', '2026-09-01 15:00:00+00'),
 ('00000275-0000-4000-8000-000000000007', 40,         false, false, null,                     null,                     'DrillGolf',    1, '{"nested":{"a":[1,2,3],"ru":"значение"}}'::jsonb,  '2026-06-01 16:00:00+00', '2026-06-01 16:00:00+00', '2026-09-01 16:00:00+00'),
 ('00000275-0000-4000-8000-000000000008', 10,         false, false, null,                     null,                     'DrillHotel',   2, '{}'::jsonb,                                         '2026-06-01 20:00:00+03', '2026-06-01 20:00:00+03', '2026-09-01 20:00:00+03');

-- ── player_identities (9) — p01 has two (many-per-player) ────────────────────
insert into player_identities (platform, platform_user_id, player_id, created_at, last_login_at)
values
 ('yandex_games', 'drill0275-yg-01', '00000275-0000-4000-8000-000000000001', '2026-06-01 10:00:00+00', '2026-09-01 10:00:00+00'),
 ('yandex_games', 'drill0275-yg-02', '00000275-0000-4000-8000-000000000002', '2026-06-01 11:00:00+00', '2026-09-01 11:00:00+00'),
 ('yandex_games', 'drill0275-yg-03', '00000275-0000-4000-8000-000000000003', '2026-06-01 12:00:00+00', '2026-09-01 12:00:00+00'),
 ('yandex_games', 'drill0275-yg-04', '00000275-0000-4000-8000-000000000004', '2026-06-01 13:00:00+00', '2026-09-01 13:00:00+00'),
 ('yandex_games', 'drill0275-yg-05', '00000275-0000-4000-8000-000000000005', '2026-06-01 14:00:00+00', '2026-09-01 14:00:00+00'),
 ('yandex_games', 'drill0275-yg-06', '00000275-0000-4000-8000-000000000006', '2026-06-01 15:00:00+00', '2026-09-01 15:00:00+00'),
 ('yandex_games', 'drill0275-yg-07', '00000275-0000-4000-8000-000000000007', '2026-06-01 16:00:00+00', '2026-09-01 16:00:00+00'),
 ('yandex_games', 'drill0275-yg-08', '00000275-0000-4000-8000-000000000008', '2026-06-01 17:00:00+00', '2026-09-01 17:00:00+00'),
 ('yandex_games', 'drill0275-yg-09', '00000275-0000-4000-8000-000000000001', '2026-07-01 10:00:00+00', '2026-09-02 10:00:00+00');

-- ── player_match_xp_credits (24) — 3 per player; every 4th row a non-default xp_awarded ─
insert into player_match_xp_credits (game_id, player_id, xp_awarded, credited_at)
select format('drill0275-game-%s', lpad(g::text, 2, '0')),
       format('00000275-0000-4000-8000-%s', lpad(p::text, 12, '0'))::uuid,
       case when ((p - 1) * 3 + g) % 4 = 0 then 25 else 10 end,
       timestamptz '2026-07-01 00:00:00+00' + make_interval(hours => (p - 1) * 3 + g)
  from generate_series(1, 8) as p, generate_series(1, 3) as g
 order by p, g;

-- ── player_name_history (6) — ids come from the sequence ─────────────────────
-- 3 approved, 1 rejected (Cyrillic reason), 2 pending on two DIFFERENT players (p02, p06).
insert into player_name_history
  (player_id, old_display_name, new_display_name, changed_at, moderation_status, rejection_reason, decided_at)
values
 ('00000275-0000-4000-8000-000000000001', null,           'DrillAlpha',          '2026-06-02 09:00:00+00', 'approved', null,                                        '2026-06-02 09:30:00+00'),
 ('00000275-0000-4000-8000-000000000003', 'Старое Имя',   'Дрилл Чарли',         '2026-06-03 09:00:00+00', 'approved', null,                                        '2026-06-03 09:30:00+00'),
 ('00000275-0000-4000-8000-000000000005', 'DrillEchoOld', 'DrillEcho',           '2026-06-05 08:00:00+00', 'approved', null,                                        '2026-06-05 08:30:00+00'),
 ('00000275-0000-4000-8000-000000000004', 'О''Дрилл-Тест', 'DrillBadName',       '2026-06-06 09:00:00+00', 'rejected', 'drill: зарезервированное слово / reserved', '2026-06-06 12:00:00+00'),
 ('00000275-0000-4000-8000-000000000002', null,           'DrillBravoPending',   '2026-09-01 10:00:00+00', 'pending',  null,                                        null),
 ('00000275-0000-4000-8000-000000000006', null,           'DrillFoxtrotPending', '2026-09-02 10:00:00+00', 'pending',  null,                                        null);

-- ── player_cosmetic_ownership (4) — both kinds ───────────────────────────────
insert into player_cosmetic_ownership (player_id, cosmetic_type, cosmetic_id, granted_at, source)
values
 ('00000275-0000-4000-8000-000000000004', 'flag',    'drill0275-flag-01',    '2026-06-10 10:00:00+00', 'purchase'),
 ('00000275-0000-4000-8000-000000000004', 'pattern', 'drill0275-pattern-01', '2026-06-10 10:05:00+00', 'purchase'),
 ('00000275-0000-4000-8000-000000000005', 'flag',    'drill0275-flag-02',    '2026-06-11 10:00:00+00', 'grant'),
 ('00000275-0000-4000-8000-000000000007', 'pattern', 'drill0275-pattern-02', '2026-06-12 10:00:00+00', 'purchase');

-- ── player_messages (6) — template and literal shapes, read and unread ──────
insert into player_messages (player_id, template_key, template_params, title, body, sent_at, read_at)
values
 ('00000275-0000-4000-8000-000000000003', 'citizenship_earned',   '{"xp":1000}'::jsonb,                      null,                null,                                               '2026-06-20 08:00:00+00', '2026-06-20 09:00:00+00'),
 ('00000275-0000-4000-8000-000000000004', 'citizenship_paid',     '{"product":"drill0275-citizenship"}'::jsonb, null,             null,                                               '2026-06-21 08:00:00+00', null),
 ('00000275-0000-4000-8000-000000000008', 'name_change_rejected', '{"reason":"drill"}'::jsonb,               null,                null,                                               '2026-06-22 08:00:00+00', '2026-06-22 10:00:00+00'),
 ('00000275-0000-4000-8000-000000000005', null,                   '{}'::jsonb,                               'Drill notice',      'Literal body, ASCII only.',                        '2026-06-23 08:00:00+00', null),
 ('00000275-0000-4000-8000-000000000006', null,                   '{}'::jsonb,                               'Дрилл уведомление', 'Тело сообщения с кириллицей и «кавычками».',       '2026-06-24 08:00:00+00', '2026-06-24 08:30:00+00'),
 ('00000275-0000-4000-8000-000000000007', null,                   '{}'::jsonb,                               'Drill quote test',  'O''Brien said "hi" — em-dash, ampersand & 100%.',  '2026-06-25 08:00:00+00', null);

-- ── purchase_intents (5) — 4 explicit uuids, 1 from the column default ──────
insert into purchase_intents (id, player_id, product_id, created_at, used_at)
values
 ('00000275-0000-4000-8000-000000000011', '00000275-0000-4000-8000-000000000001', 'drill0275-citizenship', '2026-06-02 09:50:00+00', '2026-06-02 10:00:00+00'),
 ('00000275-0000-4000-8000-000000000012', '00000275-0000-4000-8000-000000000004', 'drill0275-citizenship', '2026-06-04 09:50:00+00', '2026-06-04 10:00:00+00'),
 ('00000275-0000-4000-8000-000000000013', '00000275-0000-4000-8000-000000000005', 'drill0275-cosmetic',    '2026-06-11 09:50:00+00', '2026-06-11 10:00:00+00'),
 ('00000275-0000-4000-8000-000000000014', '00000275-0000-4000-8000-000000000007', 'drill0275-cosmetic',    '2026-06-12 09:00:00+00', null);
insert into purchase_intents (player_id, product_id, created_at, used_at)
values ('00000275-0000-4000-8000-000000000008', 'drill0275-cosmetic', '2026-06-13 09:00:00+00', null);

-- ── processed_purchases (3) — player_id has NO foreign key ───────────────────
-- tok-01 linked to an intent · tok-02 NULL intent · tok-03's intent belongs to p04, the player
-- behaviour.sql check (b) deletes (its intent_id must become NULL, the receipt must survive).
insert into processed_purchases (purchase_token, player_id, product_id, intent_id, raw_payload, processed_at)
values
 ('drill0275-tok-01', '00000275-0000-4000-8000-000000000001', 'drill0275-citizenship', '00000275-0000-4000-8000-000000000011', '{"drill":true,"note":"synthetic"}',  '2026-06-02 10:00:05+00'),
 ('drill0275-tok-02', '00000275-0000-4000-8000-000000000005', 'drill0275-cosmetic',    null,                                   '{"drill":true,"ru":"значение"}',     '2026-06-11 10:00:05+00'),
 ('drill0275-tok-03', '00000275-0000-4000-8000-000000000004', 'drill0275-citizenship', '00000275-0000-4000-8000-000000000012', '{"drill":true,"cascade_probe":true}', '2026-06-04 10:00:05+00');

-- ── player_xp_grants (3) — one "checked, nothing granted" (xp_awarded = 0) ──
insert into player_xp_grants (player_id, kind, xp_awarded, evidence, granted_at)
values
 ('00000275-0000-4000-8000-000000000001', 'tenure', 500, '{"drill":true,"matches":120}'::jsonb,        '2026-08-01 10:00:00+00'),
 ('00000275-0000-4000-8000-000000000004', 'tenure', 250, '{"drill":true,"matches":60}'::jsonb,         '2026-08-01 10:05:00+00'),
 ('00000275-0000-4000-8000-000000000006', 'tenure', 0,   '{"drill":true,"reason":"no history"}'::jsonb, '2026-08-01 10:10:00+00');

commit;
