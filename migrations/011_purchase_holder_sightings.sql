-- 011 — evidence for the owner's manual merge (task 0506, ADR-126, spec §6.2): one row per
-- (purchase token, VERIFIED profile that presented it while another profile holds it).
-- Written only by /reconcile for a vfy:true caller; read by no route. Evidence, not proof:
-- payload_issued_at lets a replayed old payload be weighed. Nothing here moves a purchase.
-- Not idempotent on purpose, like 006–010; the runner wraps this file in one transaction.

create table purchase_holder_sightings (
  purchase_token      text        not null,
  holder_player_id    uuid        not null,            -- processed_purchases.player_id when seen; no FK (as the ledger)
  seen_player_id      uuid        not null references players (id) on delete cascade,
  payload_issued_at   timestamptz,                     -- null = the payload carried none
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now(),
  seen_count          integer     not null default 1,
  primary key (purchase_token, seen_player_id)
);
