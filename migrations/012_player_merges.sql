-- 012 — audit of owner-run profile merges (task 0503, ADR-128 §3). One row per REAL merge, written by
-- `npm run merge-profiles -- commit` in the merge's own transaction, so a row exists exactly when the
-- merge committed. Dry runs and refusals write nothing here.
--
-- No foreign keys on purpose: the row must outlive anything a later cleanup or erasure removes, like
-- processed_purchases. `before_state` holds the involved `players` rows as they were, WITHOUT the
-- display name: a guide only, too little to reverse a merge (undo = the pre-merge backup).
-- The junk-profile cleanup refuses any player named here (profile-junk-cleanup-runbook.md).
-- Not idempotent on purpose, like 006–011; the runner wraps this file in one transaction.

create table player_merges (
  id              uuid        primary key default gen_random_uuid(),
  merged_at       timestamptz not null default now(),
  operator        text        not null,             -- self-reported (PROFILE_MERGE_OPERATOR)
  into_player_id  uuid        not null,
  from_player_ids uuid[]      not null check (cardinality(from_player_ids) between 1 and 5),
  fingerprint     text        not null,
  moved           jsonb       not null,
  before_state    jsonb       not null
);
