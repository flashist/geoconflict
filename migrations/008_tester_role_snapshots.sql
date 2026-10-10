-- 008_tester_role_snapshots.sql — save-before-first-apply for SSH-only tester roles (task 0425).
--
-- `npm run tester-role -- apply <tester> <role>` (src/profile-server/testerRole.ts)
-- writes a fixed role onto an allowlisted tester's `players` row. Before the FIRST
-- apply it copies every value a role can change into this table, in the SAME
-- transaction, so there is never a role without a snapshot. A later apply never
-- overwrites the row. `restore` puts every saved value back exactly (updated_at
-- included) and deletes the row. A held row IS the "a role is applied" state; no row
-- means none is.
--
-- Why a table and not a file on the box: it commits atomically with the role, the
-- nightly pg_dump includes it, it sits next to the data it restores, and ON DELETE
-- CASCADE means a deleted player can never leave an orphan snapshot.
--
-- The tenure columns hold the tester's `player_xp_grants` (kind = 'tenure') row as it
-- was: all three values are set exactly when `tenure_grant_present` (the CHECK).
--
-- ⚠️ No CHECK on `applied_role`, on purpose: the role id is validated in code
-- (src/profile-server/TesterRoles.ts), so adding a role stays a code-only change.
--
-- The migrate runner (src/profile-server/Migrations.ts) wraps this file in ONE
-- transaction, so there is NO explicit BEGIN/COMMIT here.
--
-- ⚠️ Deliberately NOT idempotent, like 006/007: no IF NOT EXISTS, so a leftover table
-- fails loudly instead of being silently kept.

create table tester_role_snapshots (
  player_id                uuid primary key references players (id) on delete cascade,
  xp                       bigint not null,
  is_citizen               boolean not null,
  is_paid_citizen          boolean not null,
  citizenship_earned_at    timestamptz,
  citizenship_purchased_at timestamptz,
  updated_at               timestamptz not null,
  tenure_grant_present     boolean not null,
  tenure_xp_awarded        integer,
  tenure_evidence          jsonb,
  tenure_granted_at        timestamptz,
  applied_role             text not null,
  applied_at               timestamptz not null,
  saved_at                 timestamptz not null default now(),
  constraint chk_tenure_snapshot_complete
    check (
      (tenure_grant_present
        and tenure_xp_awarded is not null
        and tenure_evidence is not null
        and tenure_granted_at is not null)
      or (not tenure_grant_present
        and tenure_xp_awarded is null
        and tenure_evidence is null
        and tenure_granted_at is null)
    )
);
