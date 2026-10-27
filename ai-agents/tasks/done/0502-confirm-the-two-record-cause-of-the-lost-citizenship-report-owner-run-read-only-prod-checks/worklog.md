# 0502 — worklog

## 2026-10-26 — SQL for the owner's read-only checks (written by `fkit-coder`, docs only)

Written on the owner's request, typed in the fkit-lead session on 2026-10-26: *"write the SQL"*. Nothing was
run; no database, box or SSH session was touched to write this. Every table and column below was checked
against `migrations/001`–`011` and `src/profile-server/*Repository.ts` on 2026-10-26.

> ⚠️ **Before you start**
> - **Copy the nickname exactly from the Telegram message** (copy-paste, do not retype — Cyrillic and Latin
>   letters that look the same are different letters). Watch for a stray space at either end.
> - **IDs and the nickname stay in your SSH session and your own notes.** Never paste them back into this
>   file, a chat with an agent, a report or git. Replies use the templates below: words, yes/no, dates and
>   counts only.
> - Everything below is a `SELECT`, inside `BEGIN TRANSACTION READ ONLY; … ROLLBACK;`. Postgres itself
>   refuses any write inside a read-only transaction, so even a pasting mistake cannot change data.

### Differences from the brief (schema checked)

| Brief says | Real schema | Effect |
|---|---|---|
| `players` columns `citizenship_purchased_at`, `xp`, `last_login_at` | All exist (migration `006`) | none |
| check 2 `processed_purchases.player_id` | exists; **no foreign key** (receipt outlives a profile) | none |
| check 4 `<MATCH_ID_1..3>` | the column is `player_match_xp_credits.game_id`. The feedback's `recentMatchIds` are the `game-records` keys = the game id the server credits | none — match id = `game_id` |
| check 4 "earned XP in the matches" | also a second ledger: `player_rewarded_match_xp` (rewarded-ad XP, migration `009`) | added as check 4b, optional |
| check 5 "tenure row with a large value" | `player_xp_grants`, `kind = 'tenure'`, one row per player (a 0-XP row = "checked, nothing given"). **Max is 50 XP** (`TENURE_XP_CAP`, `src/core/profile/Citizenship.ts`): 1 XP per day played, 0 under 3 days. `evidence` holds two counts only (`daysPlayed`, `gameRecordDays`), no ids | "large" = 50 (the cap) or high day counts |
| check 6 identity `last_login_at` | exists on both `player_identities` and `players`; refreshed **at most once an hour** | login times are ±1 h |
| check 8 `raw_payload ? 'issuedAt'` | `raw_payload` is **`text`**, not jsonb (it holds the decoded JSON text) | query casts safely, only rows that parse as JSON (`pg_input_is_valid`, Postgres 16) |
| — | `player_identities.platform_user_id` is the Yandex id | **never selected** below |

### How to open psql, read-only, on the profile box

The repo's setup (`setup-profile.sh`) puts the stack in `/opt/profile`; the Postgres compose service is
named **`postgres`**; the database user and name live in the box's env file `/opt/profile/profile.env`
(`POSTGRES_USER` / `POSTGRES_DB`) and are loaded into the container, so the command below reads them there —
you never type them or the password.

```bash
# On the profile box, after you SSH in as you normally do:
cd /opt/profile
docker compose exec -e PGCLIENTENCODING=UTF8 postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

(Single quotes matter: `$POSTGRES_USER` must expand inside the container, not on the box.)

Then, at the `psql` prompt, paste this **session header** once:

```sql
\set ON_ERROR_ROLLBACK on
\x auto
\pset null '(null)'
SET TIME ZONE 'UTC';
BEGIN TRANSACTION READ ONLY;
```

- `ON_ERROR_ROLLBACK on`: a typo or a missing table only fails that one statement; the session keeps going.
- All dates and times below are **UTC**.
- At the very end, type `ROLLBACK;` then `\q`.

**Set the values once, as psql variables** (fill in the blanks; keep the quotes). Every query below uses
these, so you paste each value only once. If a value contains a `'`, write it twice (`''`); if it contains a
`\`, write it twice (`\\`).

```sql
\set nick '<APPROVED_NICKNAME>'
\set match_1 '<MATCH_ID_1>'
\set match_2 '<MATCH_ID_2>'
\set match_3 '<MATCH_ID_3>'
\set report_date '<REPORT_DATE>'
-- report_date as YYYY-MM-DD. old_id and new_id are set later, from checks 1 and 4.
```

---

### Check 0 — which migrations the box has

*What this tells us:* whether the optional tables used in check 4b (`009`) and extra E1 (`011`) exist.

```sql
SELECT filename FROM schema_migrations ORDER BY filename;
```

Reply: `Check 0: highest migration = ___ (e.g. 011_…)`

---

### Check 1 — find the old record by the approved nickname

*What this tells us:* whether the paid record with his name still exists, and when it last logged in.

```sql
SELECT id, is_citizen, is_paid_citizen, citizenship_purchased_at, xp, created_at, last_login_at
FROM players
WHERE lower(display_name) = lower(:'nick');
```

At most one row (the name is unique, case-insensitive). If found, set it:

```sql
\set old_id '<OLD_PLAYER_ID>'
```

**If no row:** look for the name in the name history instead (was it renamed or cleared?):

```sql
SELECT player_id, moderation_status, changed_at, decided_at,
       lower(new_display_name) = lower(:'nick') AS name_was_new_name,
       lower(old_display_name) = lower(:'nick') AS name_was_old_name
FROM player_name_history
WHERE lower(new_display_name) = lower(:'nick') OR lower(old_display_name) = lower(:'nick')
ORDER BY changed_at;
```

Reply:
```
Check 1: found / not found. Paid citizen: yes / no. Citizenship bought on: ____-__-__ (or none).
         XP: ___. Record created: ____-__-__. Last login: ____-__-__.
         (If not found) name history: no rows / ___ rows, statuses: ___
```

---

### Check 2 — the old record's purchase receipts

*What this tells us:* that the purchase was recorded against the old record (no token or payload copied).

```sql
SELECT product_id, processed_at, (intent_id IS NOT NULL) AS has_intent
FROM processed_purchases
WHERE player_id = :'old_id'::uuid
ORDER BY processed_at;
```

Reply: `Check 2: ___ receipts. Products: ___ (expect "citizenship"). Processed on: ____-__-__.`

---

### Check 3 — the old record's name history

*What this tells us:* the nickname was approved on this record and never changed away or cleared.

```sql
SELECT moderation_status, changed_at, decided_at, dismissed_at,
       lower(new_display_name) = lower(:'nick') AS is_this_name,
       (new_display_name IS NULL) AS is_cleared_row
FROM player_name_history
WHERE player_id = :'old_id'::uuid
ORDER BY id;
```

Reply: `Check 3: ___ rows. Approved row for this name: yes / no (on ____-__-__). Any later rename/clear: yes / no.`

---

### Check 4 — which record(s) earned XP in his three matches

*What this tells us:* which profile record the game credited when he played. A record other than the old one,
present in his matches, is the new record.

```sql
SELECT c.player_id,
       (c.player_id::text = :'old_id') AS is_old_record,
       count(DISTINCT c.game_id) AS of_his_3_matches,
       min(c.credited_at) AS first_credit,
       p.created_at AS record_created,
       p.is_paid_citizen,
       (p.display_name IS NULL) AS has_no_name
FROM player_match_xp_credits c
JOIN players p ON p.id = c.player_id
WHERE c.game_id IN (:'match_1', :'match_2', :'match_3')
GROUP BY c.player_id, p.id
ORDER BY of_his_3_matches DESC, record_created DESC;
```

How to pick the new record: **not** the old one, present in all (or most) of the three matches, created
recently, not paid, usually no name. Other players in the same matches also appear; the one in all three is
almost always him. If two rows tie, check 5 both and say so. Then:

```sql
\set new_id '<NEW_PLAYER_ID>'
```

**4b (optional, only if check 0 lists `009_…`)** — same question for rewarded-ad XP:

```sql
SELECT r.player_id, (r.player_id::text = :'old_id') AS is_old_record,
       count(DISTINCT r.game_id) AS of_his_3_matches
FROM player_rewarded_match_xp r
WHERE r.game_id IN (:'match_1', :'match_2', :'match_3')
GROUP BY r.player_id;
```

No credit at all is ambiguous: a guest, a failed profile load, or a match that did not qualify for XP.

Reply:
```
Check 4: credited rows: ___. Old record credited in ___ of 3. Another record credited in ___ of 3
         (created ____-__-__, paid: yes / no, has a name: yes / no). Ties: none / ___.
         4b: run / skipped; result: ___
```

---

### Check 5 — the new record's fingerprint

*What this tells us:* whether the new record looks like a fresh record created in a browser that already had
his play history (the 2026-10-08 signature: new record + tenure gift for many days).

```sql
SELECT p.created_at, p.last_login_at, p.is_citizen, p.is_paid_citizen, p.citizenship_purchased_at, p.xp,
       (p.display_name IS NULL) AS has_no_name,
       g.xp_awarded AS tenure_xp, g.granted_at AS tenure_granted_at,
       (g.evidence->>'daysPlayed')::int AS tenure_days_played,
       (g.evidence->>'gameRecordDays')::int AS tenure_game_record_days
FROM players p
LEFT JOIN player_xp_grants g ON g.player_id = p.id AND g.kind = 'tenure'
WHERE p.id = :'new_id'::uuid;

SELECT platform, created_at, last_login_at
FROM player_identities
WHERE player_id = :'new_id'::uuid
ORDER BY created_at;

-- Extra (not in the brief, counts only): did the new record start or finish a purchase of its own?
SELECT (SELECT count(*) FROM processed_purchases WHERE player_id = :'new_id'::uuid) AS receipts,
       (SELECT count(*) FROM purchase_intents WHERE player_id = :'new_id'::uuid) AS intents_started,
       (SELECT count(*) FROM purchase_intents WHERE player_id = :'new_id'::uuid AND used_at IS NOT NULL) AS intents_used;
```

Reply:
```
Check 5: created ____-__-__. Paid: yes / no. XP: ___. Has a name: yes / no.
         Tenure row: none / ___ XP on ____-__-__ (days played ___, game-record days ___).
         Identities: ___ (platform yandex_games: yes / no). Receipts ___, intents started ___, used ___.
```

---

### Check 6 — the old record's identities

*What this tells us:* whether the old record's login stopped at about the time the new record appeared (fits
"Yandex gave him a new id").

```sql
SELECT i.platform, i.created_at, i.last_login_at,
       n.created_at AS new_record_created,
       n.created_at - i.last_login_at AS new_created_minus_old_last_login
FROM player_identities i
LEFT JOIN (SELECT created_at FROM players WHERE id = :'new_id'::uuid) n ON true
WHERE i.player_id = :'old_id'::uuid
ORDER BY i.created_at;
```

Reply: `Check 6: ___ identities, platform ___. Old identity last login ____-__-__; new record created ____-__-__; gap ___ (hours/days).`

---

### Check 7 — are other players hit? (per day, last ~60 days)

*What this tells us:* new records per day, and tenure gifts per day — especially fresh records that got the
gift for a long history the same day. A day well above the usual is a lead, not proof. Counts only.

```sql
WITH days AS (
  SELECT d::date AS day
  FROM generate_series(:'report_date'::date - 60, current_date, interval '1 day') AS d
),
new_players AS (
  SELECT created_at::date AS day, count(*) AS n
  FROM players
  WHERE created_at >= :'report_date'::date - 60
  GROUP BY 1
),
tenure AS (
  SELECT g.granted_at::date AS day,
         count(*) AS checks,
         count(*) FILTER (WHERE g.xp_awarded > 0) AS granted,
         count(*) FILTER (WHERE g.xp_awarded >= 50) AS granted_at_cap,
         count(*) FILTER (
           WHERE g.xp_awarded > 0
             AND g.granted_at - p.created_at < interval '1 day'
             AND greatest(coalesce((g.evidence->>'daysPlayed')::int, 0),
                          coalesce((g.evidence->>'gameRecordDays')::int, 0)) >= 30
         ) AS fresh_record_30plus_days
  FROM player_xp_grants g
  JOIN players p ON p.id = g.player_id
  WHERE g.kind = 'tenure' AND g.granted_at >= :'report_date'::date - 60
  GROUP BY 1
)
SELECT d.day,
       coalesce(np.n, 0)                    AS new_players,
       coalesce(t.checks, 0)                AS tenure_checks,
       coalesce(t.granted, 0)               AS tenure_granted,
       coalesce(t.granted_at_cap, 0)        AS tenure_at_cap_50,
       coalesce(t.fresh_record_30plus_days, 0) AS fresh_record_30plus_days
FROM days d
LEFT JOIN new_players np USING (day)
LEFT JOIN tenure t USING (day)
ORDER BY d.day;
```

Column meaning: `tenure_checks` = every first-time check (0-XP included); `tenure_granted` = got some XP;
`tenure_at_cap_50` = got the 50-XP maximum; `fresh_record_30plus_days` = a record under a day old that got the
gift for 30+ days of play history — the closest signal to "an existing player came back as a new record".
The 30-day line is a judgment call, not a rule. Note: a genuinely new player who played as a guest before
signing in also produces this pattern, so look for **spikes**, not single rows.

Reply: paste the table (dates and counts only — it has no ids), or:
```
Check 7: usual new players/day ≈ ___, max ___ on ____-__-__.
         usual fresh_record_30plus_days/day ≈ ___, max ___ on ____-__-__.
         Spike days: none / ____-__-__ (___), …
```

---

### Check 8 (optional) — do stored purchase payloads carry `issuedAt`?

*What this tells us:* for `0505`'s design — whether Yandex's signed purchase envelope has a top-level
`issuedAt`. Counts only; no payload, token or player id is selected.

```sql
SELECT count(*) AS total_rows,
       count(*) FILTER (
         WHERE CASE WHEN pg_input_is_valid(raw_payload, 'jsonb')
                    THEN jsonb_typeof(raw_payload::jsonb) = 'object' AND raw_payload::jsonb ? 'issuedAt'
                    ELSE false END
       ) AS rows_with_issued_at,
       count(*) FILTER (WHERE NOT pg_input_is_valid(raw_payload, 'jsonb')) AS rows_not_json
FROM processed_purchases;
```

Reply: `Check 8: run / skipped. total ___, with issuedAt ___, not JSON ___.`

---

### Extra E1 (optional, not in the brief) — has anyone else presented the old record's purchase?

Only if check 0 lists `011_purchase_holder_sightings.sql` (task `0506` deployed). It records a purchase token
held by one record being presented by another, verified record — direct evidence for the two-record theory.

```sql
SELECT count(*) AS sightings,
       count(*) FILTER (WHERE seen_player_id = :'new_id'::uuid) AS by_new_record,
       max(last_seen_at) AS last_seen
FROM purchase_holder_sightings
WHERE holder_player_id = :'old_id'::uuid;
```

Reply: `E1: run / skipped (table missing). sightings ___, by the new record ___, last seen ____-__-__.`

---

### End the session

```sql
ROLLBACK;
\q
```

### Reading the results into an outcome

- **(A) Two records confirmed** — check 1 found + paid, check 2 shows a `citizenship` receipt, check 4 shows a
  different record credited in his matches, check 5 shows it created around when he lost access (often with a
  tenure gift for many days), check 6 shows the old identity's last login near that date. → `0504` can run
  once `0503` is built.
- **(B) Two-record theory wrong or incomplete** — check 1 not found, or found but not paid (or check 3 shows the
  name moved away / was cleared). → stop, report to the owner, re-plan `0503`/`0504`.
- **(C) No new record** — check 4 credits only the old record, or nobody. → points at `0474` (profile loads
  failing) or the guest / SDK path; report to the owner.
- **Others hit** — from check 7: spike days in `new_players` together with `fresh_record_30plus_days`.

### Results

#### 2026-10-26/27 — owner's read-only checks, partial (recorded 2026-10-27 by `fkit-producer`)

> 📌 Run by the **owner** on the profile box, 2026-10-26 and 2026-10-27. Results relayed by `fkit-lead` to a spawned
> `fkit-producer` (no owner channel; ADR-021/037), in words and counts only. Not seen first-hand by the producer.
> No ids, nicknames, match ids or Yandex ids are recorded here. Two profiles are named by role only: the
> **"new candidate"** (top record in check 4) and the **"old candidate"** (a possible old paid record).

**Check 0 — migrations:** not reported.

**Check 1 — the named nickname:**
- Current name equal to the nickname he named: **0 rows**.
- Name history, exact match: **0 rows**.
- Name history, fuzzy search: **0 rows**. A fuzzy search on **current** names was **not confirmed** as run.
- Reading (relayed): the named nickname never existed in our system. ⚠️ Caveat: with the current-name fuzzy search
  unconfirmed, a current name with a near spelling is not ruled out.
- *(Superseded 2026-10-27: this search used his current display name from the feedback's "Username" field, not the
  nickname he set. Re-run with the right name: found. See the 2026-10-27 outcome section below.)*

**Check 2 — receipts:** not run in full. For the old candidate only: **1 citizenship receipt**, processed
**2026-09-28**.

**Check 3 — name history of the old record:** not run.

**Check 4 — XP credits in his 3 matches:**
- **9 profiles** credited. None is a paid citizen. None has a nickname.
- **No profile is in all 3 matches.** The top profile (the new candidate) is in **2 of 3**.
- All credits are on **2026-10-25, after 12:11 UTC**.
- ⚠️ **Open puzzle — timing.** The feedback send time is unconfirmed *(confirmed 2026-10-27 as about 07:38 UTC — see the owner-rulings section below)*. Earlier relays said **07:38 UTC on 2026-10-25**.
  If that is right, every credit in the matches listed in his report came **after** the report, and the new
  candidate was created (11:08 UTC, below) after it too. Not explained. *(Resolved 2026-10-27: these match IDs came
  from his **second** feedback message, sent 2026-10-26. See below.)*
- Check 4b (rewarded-ad XP): not reported.

**Check 5 — the new candidate's fingerprint** (partial):
- Created **2026-10-25 11:08 UTC**. No name history.
- **1 identity**, platform `yandex_games`, created the same moment; last login **2026-10-26**.
- Tenure grant **50 XP (the cap)** at creation; evidence **daysPlayed 77**, **gameRecordDays 88**.
- This is the fresh-record-with-long-browser-history signature (the 2026-10-08 pattern from `0424`).
- Receipts / purchase intents of its own: not reported.

**Paid citizens (extra, not a numbered check):** **34 rows**; every one created **on or after 2026-09-26**. None
carries the named nickname. *(2026-10-27: "the named nickname" here was his current display name, the wrong name —
see below.)*

**The old candidate** (a possible old record, found among the paid citizens): *(Superseded 2026-10-27: **not his** — a
different player. See below.)*
- Paid citizen; created **2026-09-28**, bought citizenship the **same day**; last login **2026-10-24 11:41 UTC**.
- Tenure evidence **daysPlayed 75**, **gameRecordDays 87** — close to the new candidate's 77 / 88.
- **Carries a different nickname** from the one he named.
- Gap: last login 2026-10-24 11:41 UTC → new candidate created 2026-10-25 11:08 UTC, about 23.5 hours.
- ⚠️ Unexplained: the two records were created **27 days apart**, yet their browser counts differ by only **2**
  (daysPlayed) and **1** (gameRecordDays).
- Two other paid citizens were checked (created 2026-10-13 and 2026-10-17): daysPlayed **8** and **11** → not the
  same browser.

**Check 6 — old record's identities:** not run in full (only the old candidate's last login above).

**Check 7 — others hit:** **not run.** Whether other players are hit is **unknown**.

**Check 8 — `issuedAt`:** not run (skipped).

**Extra E1 — purchase-holder sightings:** not reported.

**Outcome: not yet (A), (B) or (C).** *(Superseded 2026-10-27: outcome (A), owner ruling — see below.)*
- Leaning **(A) two records**, with the old candidate as the old record — **unconfirmed**: it carries a different
  nickname, and the near-equal browser counts across about 4 weeks are unexplained.
- ⚠️ Read literally, the reading rule above sends "check 1 not found" to **(B)**. The lead's relay holds the outcome
  open instead because the old candidate was found another way. No owner words confirming any outcome yet
  (verification step 2 is still open).
- The **owner** raised the possibility that the player is not telling the truth.
- Yandex was asked (task `0508`, message sent 2026-10-27) to confirm the account and purchase links. Its answer will
  be recorded here when it arrives.

**`0424`:** no owner ruling on un-parking it recorded at this point. *(Superseded the same day — see the owner
rulings below.)*

#### 2026-10-27 — owner rulings and the feedback send time (recorded by `fkit-producer`)

> 📌 Given via `AskUserQuestion` (and typed text) in the `fkit-lead` session on 2026-10-27, relayed to a spawned
> `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent.

- **Outcome — HELD OPEN.** Owner picked verbatim **"Hold open until Yandex (Recommended)"** — option text: *"No call
  yet; the merge (0504) keeps waiting either way. Knock-on: none (checked)."* No outcome (A), (B) or (C) is called;
  verification step 2 stays open until Yandex answers (task `0508`, sent 2026-10-27). *(Superseded later on
  2026-10-27 by the owner's ruling "A now, merge after Yandex" — see below.)*
- **`0424` — KEPT PARKED.** Owner picked verbatim **"Keep parked until Yandex (Recommended)"** — option text:
  *"Yandex's answer tells us if it's needed. Knock-on: none (checked)."* (Verification step 5.) Also noted, dated, in
  `0424`'s brief under *Trigger*.
- **Message content.** Owner, typed, verbatim: *"I sent the message exactly as you showed it to me."* — the
  old-candidate part was included (details in `0508`'s worklog).
- **Feedback send time — confirmed.** Owner, typed, verbatim: *"Around 10:38 Moscow."* = about **07:38 UTC on
  2026-10-25**.
  - So the report came about **3.5 hours before** the new candidate was created (11:08 UTC), and about **4.5 hours
    before** the XP credits for the 3 matches the report lists (all from 12:11 UTC).
  - ⚠️ **OPEN QUESTION for the analysis — the timing puzzle is real and unexplained.** A report cannot normally list
    matches that were credited hours after it was sent, and the record he would have been playing as at report time
    did not yet exist. **No conclusion is drawn here.** *(Resolved later on 2026-10-27 — the matches came from his
    second message. See below.)*

**Still to run for this task to close:** check 3; checks 2, 5 and 6 in full; check 7; check 8 or "skipped" confirmed;
the owner's own words on the outcome. *(Superseded 2026-10-27 — see the close status at the end.)*

#### 2026-10-27, later — corrected evidence and outcome (A) (recorded by `fkit-producer`)

> 📌 Owner's read-only checks on the profile box, 2026-10-27, and an OWNER RULING given via `AskUserQuestion` in the
> `fkit-lead` session the same day. Relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel;
> ADR-021/037). ⛔ Not producer precedent. Not seen first-hand by the producer. Words, dates and counts only. Three
> profiles are named by role: the **"old paid profile"**, the **"intermediate profile"** and the **"current
> profile"** (the "new candidate" above).

**Correction — the earlier searches used the wrong name.** The player sent **two** feedback messages:

- **2026-10-25, about 07:38 UTC**, category Bug: he bought citizenship on his first day and changed his nickname to a
  name he gives in the message; both are now gone.
- **2026-10-26, about 07:33 UTC**, category Other: asks for the citizenship he bought back.

The "Username" field in both messages is his **current display name**, not the nickname he set. The check-1 search
above (0 rows) and the "34 paid citizens" line searched for that display name — the wrong name. The match IDs used in
check 4 above came from the **second** message.

**Check 1 (re-run with the nickname he named in his first message):** **found**, on a paid citizen profile — the
**old paid profile**.
- Created **2026-09-29 06:54 UTC**; citizenship bought **06:54:33 the same minute** (his "first day").
- Last login **2026-10-22 13:31 UTC**.
- Tenure evidence at creation: **daysPlayed 54**, **gameRecordDays 64**.
- XP: not reported.

**Check 2:** **1 citizenship receipt**, processed **2026-09-29**.

**Check 3 — not run as a query.** Partly answered by check 1: the nickname is still the old paid profile's current
name, so it was not changed away or cleared. Its history row and approval date: not checked.

**Check 4 (re-run with the 3 matches from the first message, 2026-10-22 to 2026-10-24):** **all 3** credited to one
record — the **intermediate profile**. (The earlier run, with the second message's matches, credited the current
profile in 2 of 3.)

**Check 5 — the two newer profiles:**

| | Intermediate profile | Current profile |
|---|---|---|
| Created | 2026-10-22 14:19 UTC | 2026-10-25 11:08 UTC |
| Paid | no | no |
| Nickname | none | none |
| Tenure evidence (daysPlayed / gameRecordDays) | 75 / 86 | 77 / 88 |
| Last login | 2026-10-25 07:36 UTC | 2026-10-26 |

Not reported: the intermediate profile's identity count; receipts or purchase intents of either.

**Check 6 (in substance; identity rows not counted):**
- Old paid profile last login 2026-10-22 13:31 UTC → intermediate profile created 14:19 UTC: **48 minutes** later.
- Intermediate profile last login 2026-10-25 07:36 UTC (**2 minutes before** the first feedback) → current profile
  created 11:08 UTC: about **3.5 hours** later.

**Reading:**
- Browser counts rise steadily across the three — daysPlayed **54 → 75 → 77**, gameRecordDays **64 → 86 → 88** — and
  each profile starts shortly after the previous one stops. → **One browser, one player; his player ID changed
  twice** (2026-10-22 and 2026-10-25).
- **Timing puzzle — resolved:** the matches first checked came from the second message, sent after the current profile
  existed.
- **The earlier "old candidate" is not his** — a different player. It is the profile named in the first message to
  Yandex.

~~**Check 7 — not run.** The owner called the outcome without it. **Whether other players are hit: unknown** — no daily
counts exist (verification step 3).~~ *(Superseded 2026-10-27: a simplified check 7 was run after the close — see
"2026-10-27 — check 7 results" at the end of this worklog. True at close: the outcome was called without it.)*

**Check 8 — skipped** (optional; `0505`'s design does not wait on it; the profile box's shadow logs answer it after the
`0506` deploy).

**Check 0, check 4b, extra E1:** not reported.

**Read-only:** relayed as the owner's read-only checks; no write was reported.

**Outcome — (A), on a three-profile chain.** OWNER RULING, `AskUserQuestion` in the `fkit-lead` session, 2026-10-27.
Question, verbatim except the nickname: *"Given the new evidence ([the nickname he named in his first message] →
profile #1 → profile #2), what's 0502's result now?"* Owner picked verbatim **"A now, merge after Yandex
(Recommended)"** — option text: *"Call it A on our data; plan the merge tool (0503) now; run the restore (0504) only
after Yandex confirms. Knock-on: 0503 planning starts; 0504 still waits."*
- Supersedes the "Hold open until Yandex" ruling above.
- Differs from outcome (A) as the brief wrote it: **three** records, not two; and `0504` waits on Yandex confirming, not
  only on `0503` being built.
- The reading rule's "check 1 not found → (B)" no longer applies: check 1 had searched the wrong name.

**Correction to Yandex:** a correction naming the right chain and receipt, and withdrawing the wrong candidate, was
drafted for the owner. **Not confirmed sent** as of this entry. `0508` is closed, so no open task tracks this send.

**`0424`:** no new ruling; stays parked (ruling above). Its *Trigger* note now records the confirmed twice-changed ID.

**Close status (checked against the verification steps, 2026-10-27):**
1. Checks 1, 2 and 4 recorded; check 5 recorded except the items listed as not reported; checks 3 and 6 in substance
   only; ~~check 7 not run~~ *(check 7: simplified version run after the close, see "check 7 results" below)*; check 8
   skipped. ⚠️ Checks 3, 6 and 7 are **not** recorded in full as the step asks — closed on `fkit-lead`'s instruction
   that they may be recorded as not run, **not** on an owner ruling. The UUID / Yandex-id `grep` of this folder: run at
   close, clean (see the close report).
2. Met — outcome (A), owner's words above.
3. ~~Met only as "not run — unknown"; no daily counts.~~ *(2026-10-27, after the close: daily tenure-gift counts now
   recorded — see "check 7 results" below. Simplified query; `new_players` per day not reported.)*
4. Met as relayed — read-only checks, no write reported.
5. Met — `0424` kept parked, 2026-10-27, owner's words above.

## 2026-10-27, later — check 7 being run now (recorded by `fkit-producer`, spawned by `fkit-lead`; no owner channel)

> 📌 **OWNER RULING**, `AskUserQuestion` in the `fkit-lead` session, 2026-10-27, relayed to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Owner picked verbatim **"Run it now (Recommended)"** — option text: *"I give
> you the ready query; one read-only run on the profile server; counts only. Knock-on: none (checked)."*

- **Check 7 (are other players hit?):** the owner is running it now — one read-only run on the profile server, counts
  only. ~~**Results: pending.** A later producer adds them here, dated, counts only (no ids, names or hosts).~~
  *(Results recorded — see "check 7 results" below.)*
- This task stays closed; the close entry above ("check 7 not run") stays as it was at close and is superseded only
  once the results are recorded. *(Done 2026-10-27: struck and pointed at the results entry.)*
- **Correction to Yandex and Yandex's answer:** now tracked on `0504` (OWNER RULING *"Note on 0504 (Recommended)"*,
  2026-10-27) — see that brief. The line above ("no open task tracks this send") no longer holds.

## 2026-10-27 — check 7 results (recorded by `fkit-producer`, spawned by `fkit-lead`; no owner channel)

**Owner-run, read-only, one run on the profile server, counts only** (relayed by `fkit-lead`; no write reported). Runs
under the OWNER RULING *"Run it now (Recommended)"* in the entry above. This task stays closed; the close entry's
"check 7 not run" is struck above and points here.

⚠️ **A simplified check 7, not the query written above.** As relayed, the query:
- counted only tenure grants with `xp > 0`;
- used `daysPlayed` only — **not** `gameRecordDays`, and **not** the "record under a day old" condition;
- reported no `new_players`, `tenure_checks` or `tenure_at_cap_50` columns.

Columns (as relayed): **gifts** = new profiles that got some tenure XP that UTC day; **30+** = of those, how many had
`daysPlayed` ≥ 30. Per UTC day since 2026-09-26:

| Day | Gifts | 30+ | | Day | Gifts | 30+ |
|---|---|---|---|---|---|---|
| 09-26 | 678 | 223 | | 10-12 | 102 | 13 |
| 09-27 | 576 | 124 | | 10-13 | 104 | 13 |
| 09-28 | 625 | 214 | | 10-14 | 110 | 12 |
| 09-29 | 336 | 82 | | 10-15 | 98 | 7 |
| 09-30 | 273 | 55 | | 10-16 | 128 | 15 |
| 10-01 | 267 | 47 | | 10-17 | 143 | 9 |
| 10-02 | 259 | 37 | | 10-18 | 96 | 10 |
| 10-03 | 230 | 26 | | 10-19 | 94 | 7 |
| 10-04 | 184 | 18 | | 10-20 | 100 | 5 |
| 10-05 | 184 | 30 | | 10-21 | 121 | 7 |
| 10-06 | 184 | 10 | | 10-22 | 106 | 11 |
| 10-07 | 162 | 18 | | 10-23 | 124 | 5 |
| 10-08 | 157 | 19 | | 10-24 | 131 | 10 |
| 10-09 | 168 | 24 | | 10-25 | 111 | 8 |
| 10-10 | 176 | 12 | | 10-26 | 122 | 8 |
| 10-11 | 105 | 9 | | 10-27 | 26 | 3 *(partial day)* |

**Reading — `fkit-lead`'s, relayed, unverified:**
- The first days are the 2026-09-26 fresh start (every existing player got a new profile).
- Since about 10-06: a steady ~5–15 per day in the 30+ column. No spike around 10-22 or 10-25 (his two ID-change days).
- Each 30+ row is **either** a guest who played 30+ days and then logged in, **or** a player-ID change like this
  player's. **The data cannot tell them apart.**

**Producer arithmetic (from the table, 10-06 to 10-26, full days only):** 30+ ranges 5–24 per day (max 24 on 10-09);
gifts range 94–184 per day. Producer reading, not checked against the output: this player's own two newer profiles
each got a tenure gift with about 75 days of history, so each is probably one of the 30+ rows on 10-22 and 10-25.

**What it answers:** "are other players hit?" — **still unknown in number.** No spike; an upper bound of a few to ~15
possible cases a day, mixed in with ordinary guest-to-login players. Not a finding of other affected players.

**Feeds `0424`** (still parked on the Backlog board until Yandex answers) — no change to it here.
