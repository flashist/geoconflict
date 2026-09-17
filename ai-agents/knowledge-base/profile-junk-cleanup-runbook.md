# Profile box — junk player cleanup runbook (task 0274)

**Operator-run. Nothing here is scheduled, and nothing here should ever be scheduled.**
This deletes player rows. It is the "clean it up" half of the same lever whose other halves
are the monitoring (alerts A1–A6) and the login-creation switch.

> Sibling runbook: `profile-backup-restore-runbook.md` (backup, restore, key custody). This
> is deliberately a separate file — these are different jobs with different risks.

---

## 1. When to use this

`POST /v1/login` creates a player for **any** platform id a caller asserts. No signature is
verified (task 0267 will change that), so a flood of made-up ids means a flood of real player
rows. That is an accepted, monitored risk — this file is what "monitored" is worth.

Use this when **all** of these are true:

- A flood happened, and you know roughly **when** — from alert A1 (creations per 10 min), the
  `players.total` panel, or the daily check's `players-growth` FAIL.
- You have already **stopped it** (section 2). Deleting while creation is still open is
  pointless.
- The rows are **junk by evidence**, not by suspicion. See section 4 on what that means and
  what it cannot mean.

Do **not** use this for: a single player asking to be deleted (that is a data-subject request
and a different, per-player job), for shrinking the database in general, or "to tidy up".

### What this can and cannot know

🚨 **The database does not record who created a player.** There is no `created_source` column —
by owner ruling (D2), deliberately, because adding one would be a migration that does not help
the flood already in the table.

So "junk" is **inferred**: created inside a window you name, old enough, never came back, and
attached to nothing. Every one of those is a guard against deleting a real player, and none of
them is proof. Read section 4 before running the delete.

---

## 2. Stop the creation first

Pausing creation is **not** an outage: an existing player still logs in normally. A **new**
platform id gets `503 creation_paused`, and the client treats any 503 from login as fail-soft
with no retry (task 0273).

On the box:

```bash
# 1. The value the container reads.
sed -i 's/^PROFILE_LOGIN_CREATE_ENABLED=.*/PROFILE_LOGIN_CREATE_ENABLED=false/' /opt/profile/profile.env
grep -q '^PROFILE_LOGIN_CREATE_ENABLED=' /opt/profile/profile.env \
  || echo 'PROFILE_LOGIN_CREATE_ENABLED=false' >> /opt/profile/profile.env

# 2. The persisted value, so a redeploy does not quietly turn creation back on.
printf '%s' false > /opt/profile/.login_create_enabled
chmod 600 /opt/profile/.login_create_enabled

# 3. Apply it. --force-recreate, NOT restart.
docker compose -f /opt/profile/docker-compose.yml up -d --force-recreate --no-deps profile-api
```

⚠️ **`docker compose restart` does NOT re-read `env_file`.** A `restart` leaves the old value in
the running container and the switch looks broken. It must be `up -d --force-recreate`.

Confirm it took:

```bash
docker compose -f /opt/profile/docker-compose.yml logs --tail=50 profile-api | grep 'login creation'
# expect: login creation PAUSED (PROFILE_LOGIN_CREATE_ENABLED)
```

On the dashboard, `geoconflict_profile_login_create_enabled` drops to **0**, and
`geoconflict_profile_login_requests` starts showing `outcome="creation_paused"`.

## 3. Take a fresh backup before deleting anything

The nightly backup is up to 24 hours old, and this procedure is the one thing on this box that
deletes rows on purpose.

```bash
/opt/profile/backup.sh
cat /opt/profile/backups/last-backup.json   # exit_status must be 0, finished_at must be now
```

🚨 **The restore path has still never been exercised end to end** (task `0218` at the time of
writing). Treat "a backup exists" as a partial safety net, not a full one, and prefer a
narrower window over a wider one.

---

## 4. The predicate — one definition, used by both the count and the delete

Run everything in **one** `psql` session: the temporary view below lives only for that session,
and it is what makes the dry run and the delete provably identical.

```bash
docker compose -f /opt/profile/docker-compose.yml exec -it postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Set the window. `window_start`/`window_end` are yours to choose from the alert; keep them as
**narrow** as the evidence supports. `min_age` is the guard in section 4.1.

🚨 **The `+00` on those timestamps is load-bearing — do not drop it.** A value with no offset
is read in the Postgres session's `TimeZone`, which is **not** necessarily what you are reading
the times off. Uptrace panels and the daily-check log show their own zones, so pasting
`'2026-09-16 10:00:00'` copied from a dashboard can silently shift the window by hours — on a
procedure that deletes rows. Either keep `+00` and use UTC, or write your own offset
explicitly. `select now();` in the same session shows you which zone you are in.

<!-- cleanup-sql:window -->
```sql
\set window_start '2026-09-16 10:00:00+00'
\set window_end   '2026-09-16 14:00:00+00'
\set min_age      '6 hours'

-- The reset is part of this block ON PURPOSE, so re-pasting it is safe and actually
-- REPLACES the window (section 5 tells you to narrow and count again — that only works
-- if this block is idempotent). The view goes first: it depends on the table.
--
-- `pg_temp.` is deliberate and must stay. Unqualified, these names resolve through
-- search_path, and on the FIRST paste in a session — when no temp object exists yet —
-- that is `public`. Nothing in this database is called cleanup_window or
-- junk_candidates today, so the blast radius is nil right now; it is qualified anyway,
-- because an unqualified DROP has no business in a copy-paste block whose next
-- statements delete production rows. Qualifying costs one token and removes the
-- question entirely.
drop view if exists pg_temp.junk_candidates;
drop table if exists pg_temp.cleanup_window;

create temp table cleanup_window (
  window_start timestamptz not null,
  window_end   timestamptz not null,
  min_age      interval    not null
);
-- Columns named explicitly, not positional: a reordered table definition then cannot
-- silently swap window_start and window_end.
insert into cleanup_window (window_start, window_end, min_age)
values (:'window_start', :'window_end', :'min_age');
```

⚠️ **Why the drops matter, concretely.** Without them, a second paste of the block leaves the
OLD row in `cleanup_window` and adds the new one. `cross join cleanup_window w` in the
predicate then evaluates against **both** windows — so `junk_candidates` becomes the **union**
of them, with duplicated rows. Measured against the real schema: a wide window found 2
candidates; after "narrowing", **3 candidate rows over 2 distinct players**. Narrowing did not
narrow, the dry-run count double-counted, and the DELETE would have removed rows from **outside
the window the operator chose**. `create temp view` also errors on a re-paste, so an edited
predicate silently would not have taken effect. Both are now fixed by the drops above and the
`or replace` below — but if you ever see `relation "cleanup_window" already exists`, you have
skipped the reset, and **your window is not what you think it is**: start section 4 again.

Now the predicate. **This block is the single source of truth** — an integration test
(`tests/integration/JunkCleanup.it.test.ts`) pulls it out of this markdown file and runs it
against a real database, so the SQL here is tested SQL, not illustrative SQL. Edit it here and
nowhere else.

<!-- cleanup-sql:candidates -->
```sql
-- `or replace` so an edited predicate actually takes effect on a re-paste instead of
-- erroring and leaving the previous definition silently in force.
create or replace temp view junk_candidates as
select p.ctid as row_id, p.id, p.created_at
from players p
cross join cleanup_window w
where
  -- In the window you named, and no wider.
  p.created_at >= w.window_start
  and p.created_at < w.window_end
  -- Minimum age: a player created minutes ago may be in a match RIGHT NOW, and deleting
  -- them mid-match loses that match's XP for them (the credit call answers no_profile).
  and p.created_at < now() - w.min_age
  -- Never came back — with ONE HOUR of slack after window_end, which is a deliberate
  -- choice from the approved plan, not an accident. Read it precisely: a player who
  -- logged in again MORE than an hour after the window closed is excluded; one who
  -- logged in WITHIN that hour is still a candidate. Window 10:00–14:00 with
  -- last_login_at = 14:30 IS deletable. The slack exists because the flood's own
  -- logins cluster right at the window edge; the cost is bounded by everything else
  -- here (min_age ≥ 6 h, 0 XP, no name, no purchases, no messages), and such a player
  -- is recreated on their next load having lost nothing.
  and p.last_login_at < w.window_end + interval '1 hour'
  -- Nothing earned, nothing bought, nothing chosen.
  and p.xp = 0
  and not p.is_citizen
  and not p.is_paid_citizen
  and p.display_name is null
  -- Every identity on this player was created inside the window too. A player whose login
  -- predates the window is an existing player who happens to look empty.
  and not exists (
    select 1 from player_identities i
    where i.player_id = p.id
      and (i.created_at < w.window_start or i.created_at >= w.window_end)
  )
  -- Attached to nothing, anywhere. Each of these is a separate reason to keep the row.
  and not exists (select 1 from player_match_xp_credits c where c.player_id = p.id)
  -- A player_xp_grants row with xp_awarded = 0 still COUNTS: it records "checked", which is
  -- state the player would silently lose.
  and not exists (select 1 from player_xp_grants g where g.player_id = p.id)
  and not exists (select 1 from purchase_intents pi where pi.player_id = p.id)
  -- processed_purchases has NO foreign key on purpose (a receipt outlives an erasure), so it
  -- would not stop a delete by itself. It must be checked explicitly.
  and not exists (select 1 from processed_purchases pp where pp.player_id = p.id)
  and not exists (select 1 from player_messages m where m.player_id = p.id)
  and not exists (select 1 from player_name_history nh where nh.player_id = p.id)
  and not exists (select 1 from player_cosmetic_ownership co where co.player_id = p.id);
```

`player_identities` rows go with the player automatically (`on delete cascade`), so they are
not deleted separately.

### 4.1 Why `min_age` exists

A player created two minutes ago can be **in a match right now**. The game server holds their
internal player id for the whole match and credits XP at match end; if the row is gone by then,
that credit answers `no_profile` and the XP is lost. Six hours is the owner-ruled minimum
(D2) — it is longer than any session, so a row old enough to delete is a row nobody is playing
on.

This is also why "delete everything from the last ten minutes" is never the right move, however
obvious the flood looks.

## 5. Dry run — count first, always

<!-- cleanup-sql:dry-run -->
```sql
select count(*) as candidates,
       min(created_at) as oldest,
       max(created_at) as newest
from junk_candidates;
```

⛔ **Do not select the ids.** You do not need them, and a list of player ids pasted into a
terminal, a worklog or a ticket is exactly the leak ADR-113 exists to prevent. The count and the
two timestamps are enough to decide.

Sanity-check the number against what the alert said.

- Far **larger** than the flood you observed ⇒ your window is too wide. **To narrow it: go back
  to section 4 and re-paste the window block with the new values, then re-paste the predicate,
  then re-run this count.** The window block resets itself, so that sequence really does replace
  the window. Editing only the `\set` lines and re-running the count changes nothing — the values
  were already copied into `cleanup_window` when you first pasted it.
- Far **smaller** ⇒ the rows probably are not junk by the definition above. That is information,
  not a problem with the query. Do **not** start removing conditions from the predicate to make
  the number bigger; if the flood's rows genuinely do not match, see section 5.1.
- **Zero, during an ongoing flood** ⇒ see section 5.1. That case has a specific cause.

### 5.1 The dry run returns 0 while a flood is clearly happening

This is expected, and it is not a bug in the predicate. **Pausing creation stops new rows; it
does not stop logins.** A flood that keeps re-asserting the **same** platform ids keeps logging
in successfully, and every login refreshes `players.last_login_at` (throttled to once an hour).
The "never came back" condition then excludes every one of those rows, so the count is 0.

What to do, in order:

1. **Confirm the switch really is applied** — the dashboard's
   `geoconflict_profile_login_create_enabled` should read 0 and
   `geoconflict_profile_login_requests` should show `outcome="creation_paused"`. If it does not,
   the `--force-recreate` in section 2 did not happen; fix that first. With it applied, the row
   count is **bounded** — it cannot grow any further, which is the thing that mattered.
2. **Then wait, and do not force it.** Those rows hold nothing (0 XP, no name, no purchases, no
   messages) and cost only disk, which the daily `disk-usage` check watches. Once the flood's
   logins stop, the window becomes eligible an hour later and the cleanup runs normally.
3. 🚨 **Do NOT delete the `last_login_at` condition to make the delete "work".** That condition
   is the single thing standing between this procedure and deleting **real, active players** who
   happen to have an empty profile. Removing it turns a disk-space cleanup into data loss.
4. **If the logins do not stop**, you are out of what this runbook can fix: the problem is
   request-rate, not row-cleanup, and there is deliberately **no rate limiter** on `/v1/login`
   (owner-accepted, S2). Escalate it as a rate-limiting task — this is ADR-113's re-raised
   "junk-profile creation or login overload that the switch cannot contain" — and leave the rows
   alone until then.

## 6. Delete, in batches

Each batch is its own transaction, so the work is resumable and a single batch never holds a
long lock.

<!-- cleanup-sql:delete -->
```sql
delete from players
where ctid in (select row_id from junk_candidates limit 10000);
```

Repeat until it reports `DELETE 0`. Keep a running total and compare it with the dry-run count:
they should match, give or take rows that aged into the window while you worked.

If the totals **disagree materially**, stop and re-run the dry run before deleting more. Two
causes, in likelihood order: something is still creating players (check the switch really applied
— section 2), or you re-pasted the window block without its reset, so the dry-run count was
double-counting a union of two windows (section 4's warning).

## 7. Reclaim the space, and know what that means

```sql
vacuum (analyze) players, player_identities;
```

⚠️ **`DELETE` does not give space back to the operating system.** It marks the rows dead;
`VACUUM` makes that space reusable **by Postgres**. The `df` number on the box will not drop.
That is normal and it is enough — the disk stops growing, which is what the daily
`disk-usage` check watches.

`ANALYZE` is not optional here: `players.total` on the dashboard reads
`pg_class.reltuples`, which is a planner statistic. Without the `ANALYZE` the panel keeps
showing the pre-cleanup number and looks like the cleanup did nothing.

🚨 **`VACUUM FULL` would return space to the OS, and takes an ACCESS EXCLUSIVE lock on
`players` — every login and every profile read blocks for the duration.** That is a login
outage. Maintenance window only, and only if the disk genuinely needs the space back.

## 8. Turn creation back on

```bash
sed -i 's/^PROFILE_LOGIN_CREATE_ENABLED=.*/PROFILE_LOGIN_CREATE_ENABLED=true/' /opt/profile/profile.env
printf '%s' true > /opt/profile/.login_create_enabled
docker compose -f /opt/profile/docker-compose.yml up -d --force-recreate --no-deps profile-api
docker compose -f /opt/profile/docker-compose.yml logs --tail=50 profile-api | grep 'login creation'
# expect: login creation ENABLED (PROFILE_LOGIN_CREATE_ENABLED)
```

`geoconflict_profile_login_create_enabled` returns to **1**. Leaving it at 0 and forgetting is a
silent, total block on new players — which is why the deploy's value report prints a loud
`PAUSED` row on every deploy while it is off.

---

## 9. If you deleted the wrong player

Mostly: **nothing is lost, and they do not have to do anything.**

- Their next page load or match join **recreates** the player from the same platform id.
- What is gone is what the predicate already proved they did not have: XP (0), citizenship
  (none), display name (none), inbox messages (none), purchases (none).
- A client still holding a session token for the deleted player gets **404** on
  `GET /v1/profile` until the next page load, which logs in again and mints a new token.
- A game server still holding the id for an in-flight match gets `no_profile` for that match,
  and **that match's XP is lost**. This is the one real loss, and `min_age` is what prevents it.

If a player *did* have something — paid citizenship above all — that is a restore question, not
a recreate question. Go to `profile-backup-restore-runbook.md` and stop deleting.

---

## 10. Rehearsal (do this before you ever need it)

Task 0274 step 7 (owner ruling D6) rehearses the whole path on the live box with one synthetic
login:

1. Switch **off**, log in once with a throwaway id → expect **503 `creation_paused`** and
   **no** new row.
2. Switch **on**, log in again → exactly **one** new row.
3. Delete that one row with sections 4–7, using a window of minutes around it and
   `min_age` set to something short **for the rehearsal only**.
4. Switch back to its intended state and confirm the boot log line.

Record the date and the outcome in the task worklog. **No ids** — counts and verdicts only.
