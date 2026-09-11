# `0218` — worklog

> 🔒 **Rule for this whole file:** no secret values, no key material, no fingerprints, no lengths of
> key material, no bucket name, no endpoint, no credentials, no public IPs. Object **file names**,
> byte sizes of **dumps**, table names, md5 digests of **synthetic drill data**, custodian names and
> vault names only.

> 🔴 **Everything on the box was executed BY THE OWNER, by hand, guided step-by-step through
> `plan.md`.** No agent touched the box, ran a deploy, or held a secret. Every fact below is
> **owner-executed and lead-read** — the lead read the command output the owner pasted back. Nothing
> is committed by this task. The only files this task changed are: this worklog, `plan.md`, and
> `ai-agents/knowledge-base/profile-backup-restore-runbook.md`.

**Date: 2026-09-11.** Phases ran in the order `A → D → B → C → F1 → E → F2`, all on one day at the
owner's instruction (their regular weekend game update is Sat/Sun and they did not want this running
alongside it).

---

## 🚨 Read this first: what is proven, and what is NOT

| Claim | Standing |
|---|---|
| **A backup restores, with non-empty data, verified by counts + content** | ✅ **PROVEN.** Twice: into a throwaway (C4/C5) and **into the live DB in place** (E4/E5). Both `IDENTICAL`. |
| **The nightly schedule fires unattended and produces an object** | ✅ **PROVEN** (D1, three independent signals). |
| **A SCHEDULED backup captures REAL DATA** | ⛔ **NOT PROVEN, and this task did not prove it.** |
| **The restore path works for a database of real size** | ⛔ **NOT PROVEN.** 76 rows, ~21 KB. The RTOs below do not extrapolate. |
| **The weekly-copy path works** | ⛔ **NEVER EXERCISED** against the current bucket. |

🔴 **Say it in these terms and no softer: the SCHEDULE and the DATA are proven SEPARATELY, NEVER
TOGETHER.** The only non-empty backup in this drill is the **hand-run** one (C1). Every
cron-produced object that exists is a dump of an empty database. Brief verification step 5's *literal*
wording — *"the nightly cron is confirmed to have FIRED and produced an object — observed, not
inferred"* — **is met.** The stronger property the phase was originally designed to establish **is
not**, and closing that gap needs one cron run after real data exists.

**Why the gap exists:** the original Phase D waited for a 02:30 UTC boundary *after* the data was
seeded, and **D2** then restored from that cron object. The owner's same-day ruling (2026-09-11)
removed the boundary and **reversed their own earlier Q1 ruling**, dropping D2 — see *Decisions*
below. The owner was shown that the chosen option drops D2 and chose it anyway. **Knowing trade, not
an oversight.**

---

## Phase A — readiness and discovery

| # | Check | Result |
|---|---|---|
| **A1** | Stack health | ✅ Both services **healthy**, up **20 h**. |
| **A2** | DB empty before seeding | ✅ **8 tables**, all **0** rows except `schema_migrations` = **4**. Matches `migrations/` exactly — no schema drift. |
| **A3** | Compose network name | ✅ **`profile_default`** — prod postgres attached to it. 🚨 **Runbook was wrong** (see Findings). |
| **A4** | Object prefix + existing objects | ✅ `PREFIX=profiles`. `daily/` held `profile-2026-09-10.dump.age` (19 330 B) and `profile-2026-09-11.dump.age` (19 330 B). **`weekly/` EMPTY.** |
| **A5** | Cron mode + marker | ✅ Header `Mode: offbox`, one `backup.sh` line. `last-backup.json`: `finished_at 2026-09-11T02:30:09Z`, `exit_status 0`, key `profiles/daily/profile-2026-09-11.dump.age`, 19 330 B. `last-smokecheck.json`: `2026-09-10T11:19:36Z`, 19 330 B. |
| **A6** | Capacity | ✅ Image up to date. `/` **26 %** used (58 G, 43 G avail). Mem **3.8 Gi**, 2.8 Gi available. |

### ⚠️ A6 — swap NOT verified today

`free -h | head -2` truncated before the swap line, so **the 4 GiB swap `0215` recorded was not
re-confirmed on 2026-09-11.** Recorded as **unverified, not as absent** — `0215` verified it
(`swapon --show` → `/swapfile`, 4G) and nothing in this task would have changed it. **The plan's
command was at fault, not the box.** Anyone re-running A6 should use `free -h` without `head`, or
`swapon --show`.

---

## Phase D — the nightly cron FIRED (run second, before B and C)

**All three signals agree, and the scheduler evidence is stronger than required.**

1. **Scheduler** — `CRON[...] (root) CMD (/opt/profile/backup.sh >> /var/log/profile-backup.log 2>&1)`
   at **02:30:01 on five consecutive days, 2026-09-07 → 2026-09-11.**
2. **Marker** — `last-backup.json`, `exit_status 0`, `finished_at 2026-09-11T02:30:09Z`.
3. **Script log** — the full sequence each night, ending `backup OK`.

### 🔴 Why Phase D had to run BEFORE Phase C — and it was not theoretical

`profile-backup.sh:37` writes `last-backup.json` by default; `:134-136` writes
`profile-<UTC date>.dump.age`. **C1's hand-run overwrites both** — same file, same key, same UTC day.
Had C1 run first, two of D1's three signals would have been destroyed, and `0215` residual 6 leaves
reg.ru object versioning **UNKNOWN**, so neither comes back.

✅ **Empirically demonstrated the same day:** C1 replaced the 02:30 cron object at
`profiles/daily/profile-2026-09-11.dump.age` — **19 330 B → 21 339 B, same key.** That is the
overwrite, observed. The gate worked because D's evidence was captured and handed over first.

### 🔴 FINDING — backup history in the current bucket starts 2026-09-10, and there are only TWO objects

The five nightly log entries are **not** five retrievable backups.

| Date | Logged size | Where it went | Retrievable today |
|---|---|---|---|
| 09-07, 09-08, 09-09, 09-10 (02:30) | **11 223 B** each | the **OLD** bucket — `backup.env` still held the pre-deploy config | ❌ **No.** The owner deleted that bucket. |
| 09-10 **11:19:36Z** | 19 330 B | new bucket, key `profile-2026-09-10.dump.age` | ✅ — but it is the **deploy smoke check**, not a cron run |
| 09-11 02:30 | 19 330 B | new bucket, key `profile-2026-09-11.dump.age` | ✅ — the only **cron-produced** object that exists |

**Why the 11 223 B runs went to the old bucket:** `setup-profile.sh:790-806`'s
`promote_offbox_backup` promotes `backup.env.new` over `backup.env` **only after** its smoke check
passes. That smoke ran at **2026-09-10T11:19:36Z**. Every cron run before that timestamp used the
**old** config. The consistent 11 223 B across four nights (vs 19 330 B after) corroborates it: a
different bucket *and* a different schema — the pre-rebuild volume, before `0215`'s Step 14 Branch C
re-applied all four migrations into a fresh `initdb`.

⛔ **Nobody may claim "five days of backups."** In the current bucket there were, before this drill,
**two objects, both dumps of an empty database, one of which is not even a scheduled run.**

> ⚠️ **Correction to the evidence as relayed.** The relay recorded this as *"`0215`'s 11:19 smoke
> check overwrote that day's cron backup at the same key"*. **It did not** — the 09-10 cron object was
> written to the **old** bucket, so the 19 330 B object at `profile-2026-09-10.dump.age` is a *new
> object in a new bucket*, not an overwrite. The **conclusion** (same-key overwrite is real; assuming
> no versioning is correct; the hard gate was justified) **stands and is unaffected** — it is
> demonstrated by C1 overwriting the 09-11 cron object today, above. Recorded because a wrong
> mechanism attached to a right conclusion is exactly the shape that survives into the next document.

---

## Phase B — 76 rows of synthetic, non-empty data

Insert counts **12 / 36 / 6 / 6 / 8 / 4+1 / 3 = 76**, ending `COMMIT`, inside `begin … commit` with
`ON_ERROR_STOP=1`.

**Encoding check passed — this was not ceremony.** `Дрилл Чарли` **11 chars / 21 bytes**,
`Дрилл Дельта` **12 / 23**, `О'Дрилл-Тест` **12 / 22**. Bytes > chars in every case ⇒ real multibyte
UTF-8 was stored. Had the text been mangled on insert, the later digest comparison would have passed
anyway — a corrupted value round-trips as faithfully as a good one. **This check is the only thing
standing between a green drill and a meaningless one.**

### Source fingerprint (B3) — the reference every later comparison is measured against

| Table | Rows | md5 content digest |
|---|---:|---|
| `player_profiles` | 12 | `8a2c192b08d75a7ea04d5f1b51393fe2` |
| `player_match_xp_credits` | 36 | `ab8ee9b9a6f720bed8c5e0411da42bcd` |
| `player_name_history` | 6 | `e1f0e2aafbcfc69ae9c03208593e6d82` |
| `player_cosmetic_ownership` | 6 | `d9155a0040b7cce577340105db6efe75` |
| `player_messages` | 8 | `9fef79e96bc7a10120b8fc434c571a36` |
| `purchase_intents` | 5 | `309078636e404a7ffe212d87380efdf4` |
| `processed_purchases` | 3 | `20eac652ed10d9055c98314ce524483c` |
| `schema_migrations` | 4 | `671e610aede82359215db392e16e0043` |

**Sequences:** `player_messages_id_seq` **8**, `player_name_history_id_seq` **6**, both
`is_called = t`. **Schema shape:** **23** public constraints · **15** public indexes, index digest
`f1caf2e4a05929bac08d04909a4223d0`.

**Spot checks all correct:** bigint `xp` = **3000000000** (above int4 range) · jsonb path →
`значение` · **2** NULL `persistent_id` · **2** NULL `display_name` · moderation status **3 approved /
2 pending / 1 rejected** · the quote-heavy body (`'`, `"`, `—`, `&`, `%`) intact.

🔒 All data synthetic, `drill0218-` prefixed. No real Yandex id, name or payment token.

---

## Phase C — hand-run backup, then the scripted restore

| # | Result |
|---|---|
| **C1** | `backup OK: profiles/daily/profile-2026-09-11.dump.age (21339 bytes)`, exit 0, `finished_at 2026-09-11T08:03:43Z`. |
| **C2** | Identity present on the box, `0600`. 🔒 Size deliberately not recorded — it is a length of key material. |
| **C3** | `restore-test` up on `profile_default`, accepting connections, resolvable from the prod container. |
| **C4** | The runbook's documented line ran **verbatim**: guard log `target host 'restore-test' matches PROFILE_RESTORE_REMOTE_HOST — proceeding with distinct-remote restore` → download → decrypt → `pg_restore into target` → **`restore complete`**. **`real 0m0.374s`.** |
| **C5** | **`IDENTICAL`.** |
| **C6** | Container removed; identity **shredded**; `/tmp/profile-restore.*` gone. |
| **F1** | `DELETE 3` + `DELETE 12`; all tables 0 / `schema_migrations` 4; evidence files kept for Phase E; both fingerprint files exactly **2 110 bytes**. |

### ⚠️ The 19 330 → 21 339 B delta is a signal, not a proof

**+2 009 bytes.** It is *unambiguous* — the empty dump measured exactly 19 330 B on five separate
nights, so the variation is not noise — but it is **modest**, and it is **not** evidence the data is
present. `pg_dump -Fc` compresses, and 76 small rows compress well. **C5's `IDENTICAL` is the proof.**
The delta is worth recording only because a *missing* delta would have been a red flag worth stopping
on.

### C5 behavioural checks — the three things a digest cannot test

- **(a) Partial unique index survived** — `ERROR 23505 duplicate key … player_name_history_one_pending_uq`.
  ✅ **The error IS the pass.** A successful insert here would have meant the index did not survive.
- **(b) Referential actions survived** — all four cascade counts **0**, `receipt_intentid` **null**
  (the `on delete set null` FK fired), then `ROLLBACK` left the throwaway untouched.
- **(c) Sequence position survived** — returned `id` **8**.

> 📌 **Why `8` and not `7` — this is correct, not an anomaly.** The source table has 6 rows and
> `last_value = 6`. Check **(a)**'s insert **failed**, but it had already drawn a sequence value — **7**.
> **Sequences are non-transactional and do not roll back on error**, by design (it is what lets
> concurrent inserts take distinct values without blocking). So (c) legitimately got **8**. The test
> asserts *non-colliding*, which 8 satisfies. **A future reader seeing max+2 should not open a bug.**

---

## Phase E — the LIVE in-place recovery branch, rehearsed for the first time ever

Run as its own step after F1, with its own go/no-go, per the owner's 2026-09-11 ruling.

### E1 — the owner's premise, re-tested rather than assumed

The ruling rested on a factual claim: *the profile server has not been used in prod; the client and
server sides connected to it have not been build-deployed.*

- All tables **0** rows.
- `/internal/` request count over **168 h**: **0**.
- `0217` (the wiring task) confirmed still under `ai-agents/tasks/backlog/` — checked repo-side.

✅ **Premise holds.** ⚠️ Recorded deliberately: this was a **check, not a standing permission.** Had
any of the three failed, Phase E was to stop — the ruling would not have carried forward.

### E2 — 🟢 the credential mitigation, CONFIRMED ON THE BOX

**The hazard the owner's ruling did not cover.** Their reasoning was about the **data** being
worthless, and it was sound. But the runbook's documented live-restore target embedded the real
`POSTGRES_PASSWORD`, which would have landed in root's shell history (persists on disk), the
`backup.sh` argv and the `docker` client argv. **"The data is worthless" does not make a leaked live
credential harmless**, and rotation is expensive — the Postgres image applies `POSTGRES_PASSWORD`
only at `initdb`, which is why `0215` had to destroy the data volume to rotate it.

**The mitigation was derived by reading `profile-backup.sh:223-238` before the drill and then tested
on the box:**

```
psql -d 'postgresql://profile@/profile' -tAc "select 1"   →   1
```

The empty-host URL reaches the container's local socket, which accepts `trust` auth — the same path
`pg_dump` already uses nightly (`:147`). The guard extracts an **empty** host, falls past the
`PROFILE_RESTORE_REMOTE_HOST` test and takes the `PROFILE_RESTORE_CONFIRM_LIVE` branch, whose own log
message (`:235`) names `<socket>`.

✅ **Outcome: the exposure was never incurred. No password appeared in any command line at any point
in this task.** The pre-test ran **before** anything destructive, so the fallback (stop, and put an
accept-or-decline back to the owner) was never needed.

### E4/E5 — the live restore

```
PROFILE_RESTORE_CONFIRM_LIVE matches 2026-09-11 — proceeding with confirmed in-place restore into '<socket>'
… restore complete
real 0m0.435s
```

- **E5: `IDENTICAL`** against the source fingerprint. The data F1 had deleted was recovered into the
  **live** database from an off-box encrypted backup, byte-for-byte. **That is the durability claim,
  end to end.**
- Services stayed **healthy throughout**; `health=200`, `ready=200`. `/ready` is DB-backed, so the 200
  proves the API re-established its connection against the restored database.
- ✅ **T11 did not bite.** `Restart=always` never interfered, because nothing tried to stop
  `profile-api` — the plan explicitly forbade it, on `0215`'s evidence.

⚠️ **Limitation, stated because it is a real weakening:** `/health` and `/ready` were checked over
**loopback**, not over the public TLS endpoint. So **the nginx + certificate path was not re-verified
after the live restore.** Low risk — a `pg_restore` does not touch nginx, and `0215` verified the
public path over a valid certificate — but it is not the same check, and this worklog will not
pretend it was.

### E6 / F2

Identity **shredded** again · drill rows deleted (`DELETE 3` + `DELETE 12`) · all tables **0** /
`schema_migrations` **4** · all `drill0218-*` files removed · endpoints still **200**.

🔒 **The `age` private identity touched the box exactly twice** (C2, E3) and was shredded both times.
Dropping D2 reduced that from three windows to two — the one genuine upside of the same-day
compression.

---

## 🚨 RTOs — recorded, and immediately qualified

| Restore | Wall clock |
|---|---|
| Throwaway target (C4) | **`real 0m0.374s`** |
| **Live, in place (E4)** | **`real 0m0.435s`** |

🔴 **These are NOT a usable RTO for a real outage.** 76 rows, ~21 KB. They prove the path works and is
not pathologically slow; they say nothing about restore time at real citizen volume. **Re-measure
once real data exists. The number will not extrapolate from here.**

---

## Runbook findings — three confirmed, one REFUTED

### #1 ✅ CONFIRMED — the documented drill names a network that does not exist

The runbook hardcoded `--network opt_profile_default`. The real network is **`profile_default`**.
Compose v2 derives the project name from the directory basename (`/opt/profile` → `profile`), and
`setup-profile.sh` sets no `COMPOSE_PROJECT_NAME`, passes no `-p` and declares no `networks:` block.

🔴 **Anyone following the runbook during a real outage fails at `docker run`, with a container that
never starts.** Found by reading the scripts before the drill; confirmed by execution.
**Fixed in G1**, along with a `docker inspect` step so the value is discovered rather than trusted.

### #2 ⛔ REFUTED — the prefix was right all along

`PREFIX=profiles`, exactly as the runbook's literal `profiles/daily/…` assumes. **Recorded as an
expected finding that did not materialise.** I predicted it from `profile-backup.sh:96` only
*defaulting* to `profiles` while the deploy could set anything. It didn't. **A prediction that fails
is worth recording too** — otherwise the next reader inherits a suspicion with no resolution.

### #3 ⛔ THE BRIEF WAS WRONG — the documented command line DOES work

`brief.md` states the 2026-07-01 drill *"predates the default-deny guard, so **its command line no
longer works**"* and makes correcting it part of this task.

**Refuted by execution: the documented line ran verbatim and succeeded**, guard override included
(C4). The runbook had already been updated to carry `PROFILE_RESTORE_REMOTE_HOST=restore-test`, which
satisfies the guard at `profile-backup.sh:231-232`.

⚠️ **The brief overstated the runbook's own, narrower claim.** The runbook said *the first drill's*
line differed from what is documented now — true, and unremarkable. The brief generalised that into
*the documented line is broken* — false. The two real breakages were the **network name** and (as of
today) the **live-restore target**, neither of which the brief mentions.

### #4 ✅ CONFIRMED AND NOW TESTED — the documented live-recovery line leaks the DB password

`postgresql://profile:PASSWORD@postgres:5432/profile`, as documented, puts the real
`POSTGRES_PASSWORD` into shell history and two argv lists, in the middle of a disaster, when nobody
is thinking about credential hygiene. **The socket form needs no password and the guard accepts it
(E2).** **Fixed in G1b**, with the reason, and the old form struck rather than deleted.

---

## 🔴 A defect in this task's own plan

**`plan.md` step C1 read `echo "exit=$?"` immediately after a pipe into `tail`.** `$?` there reports
**`tail`'s** exit status, not `backup.sh`'s — so it would have printed **`exit=0` on a failed
backup**. Caught at relay time and substituted with `${PIPESTATUS[0]}`; **`plan.md` is now fixed.**

**Recorded rather than quietly patched, because the failure mode is the point: a verification step
that cannot fail is worse than no verification step at all.** It would have reported success on the
one run where it mattered, and the marker check on the next line would have carried the whole burden
without anyone knowing.

---

## Decisions taken during this task

| Decision | Ruling |
|---|---|
| **Q1 — restore from the cron-produced object (D2)** | ✅ approved 2026-09-10, then ⛔ **REVERSED by the owner 2026-09-11**. D2 required a cron run *after* Phase B; the same-day constraint makes that impossible. **The owner was shown that the chosen option drops D2 and chose it anyway — a knowing trade.** Cost: the durability claim rests on **two** verified restores (C4 throwaway, E4 live) rather than three, and the schedule/data gap above. |
| **Q2 — drill-data cleanup** | As soon as evidence was captured. Split F1 / F2 around Phase E. |
| **Q3 — runbook corrections in-session** | Approved; every failing line recorded verbatim first. |
| **Q4 — Sunday weekly copy retention** | Accepted, no action. Moot in the event: `weekly/` is empty. |
| **Q5 — rehearse the live branch** | ✅ Approved with two conditions: its own go/no-go after F1 (E1), and a credential mitigation (E2). Both satisfied. |
| **Q6 — who edits `0182`** | **I draft, a producer applies.** Nothing under `ai-agents/tasks/done/` was touched by this task. |

---

## 🚨 Residuals

1. **🔴 THE SCHEDULE AND THE DATA ARE PROVEN SEPARATELY, NEVER TOGETHER.** Every cron-produced object
   that has ever existed in the current bucket is a dump of an **empty** database. The only non-empty
   backup was hand-run. **Closing this needs exactly one nightly cron run after real data exists** —
   cheap, but it has to be deliberately looked at. ➡️ **`0217` / `0219`.**

2. **🔴 The RTO figures do not extrapolate.** 0.374 s / 0.435 s on 76 rows. **Re-measure at real
   volume.** Recording these as "the RTO" would be the same class of error as "five days of backups".

3. **🔴 The weekly-copy path has NEVER executed against the current bucket.** `weekly/` was empty on
   2026-09-11. It only fires on a Sunday (`profile-backup.sh:171-177`) and the bucket postdates the
   last one. The first attempt is **Sunday 2026-09-13**. Nobody is watching it. ➡️ **`0219`.**

4. **⚠️ Backup history in the current bucket starts 2026-09-10 and is thin.** Two objects before the
   drill, one of them a deploy smoke check rather than a scheduled run. The nightly log's five-day
   history is **not** five retrievable backups. ➡️ **`0219`**, whose monitor should not infer
   retrievability from log lines.

5. **⚠️ Same-key overwrite is real and demonstrated** (C1: 19 330 → 21 339 B at
   `profile-2026-09-11.dump.age`). With reg.ru versioning **UNKNOWN** (`0215` residual 6), an
   overwrite is unrecoverable. **A manual `backup.sh` run silently replaces that day's scheduled
   backup.** ➡️ **`0219`**, and worth a line in any future runbook change.

6. **⚠️ Swap not re-verified 2026-09-11** — `free -h | head -2` truncated the swap line. `0215`'s
   reading stands; today's does not contradict it. **Unverified, not absent.**

7. **⚠️ `/health` and `/ready` after the live restore were checked over loopback only** — the public
   TLS/nginx path was not re-verified after Phase E.

8. **🔒 The `age` second-copy residual — CARRIED UNCHANGED, accepted by the owner.**
   `0215`'s plan asked for an **OFFLINE** second copy. What exists is a **second CLOUD copy**.
   - **Neither store is zero-knowledge.**
   - **Both may share a phone-number recovery path**, so **the two copies may not be two independent
     failure modes** — a single account compromise or recovery-path takeover could plausibly reach
     both.
   - **`0218` should treat "two copies" as weaker than the count suggests** — `0215`'s own words,
     carried verbatim in substance.

   🔴 **Owner ruling 2026-09-10: accepted as-is and CARRIED, not closed by this task. ⛔ No
   remediation is proposed and none is recommended.** Recorded as a knowingly accepted residual.

---

## Brief verification steps — where they stand

| # | Item | Status |
|---|---|---|
| 1 | Custody written down **before** the first backup ran | ⚠️ **SUBSTANCE MET — NOT A CLEAN PASS.** See below. |
| 2 | Custodian demonstrated they can read it, dated | ✅ **Discharged by `0215`** — decrypted a test file with the copy retrieved **from storage**, confirmed via `age-keygen -y`. ⚠️ Its date is session-sequence, not artifact-read. |
| 3 | Restore against **non-empty** data, verified by counts + spot-checked content | ✅ **MET.** Two restores, both `IDENTICAL` across 8 tables, 2 sequences, schema shape, 3 behavioural checks. |
| 4 | Exact commands recorded and **work today**; runbook corrected if not | ✅ **MET.** Two corrections applied (G1, G1b); one predicted defect **refuted** (#2); one **brief claim refuted** (#3). |
| 5 | Nightly cron **fired** and produced an object — observed, not inferred | ✅ **MET IN ITS LITERAL WORDING.** ⛔ **The stronger property is NOT met** — see residual 1. Do not report this as a clean pass. |
| 6 | `0182`'s backup limitations reflect reality | 🔲 **DRAFTED, NOT APPLIED** — Q6. Replacement text below; a producer applies it. |
| 7 | No values anywhere | ✅ **MET.** No key material, fingerprint, bucket name, endpoint, credential or public IP appears in any artifact. **No password appeared in any command line either** (E2). 🔒 One relayed detail — the identity file's byte length — was **deliberately omitted** from this worklog: it is a length of key material, which the rule bans. |

### Item 1, re-checked rather than waved through

**Supported:** the new keypair existed before the deploy — `PROFILE_BACKUP_AGE_RECIPIENT` is a
required deploy variable and a pre-flight recipient round-trip returned `RECIPIENT OK` **before** the
deploy was attempted. The **first backup under the new key** was the deploy smoke check
(`2026-09-10T11:19:36Z`, now corroborated by this task's A5 reading); no earlier backup can have used
it, because key and bucket were both new — and this task's own Phase D finding confirms every earlier
cron run wrote to the **old** bucket under the **old** config. The storage copy existed before the
readability proof, because that proof decrypted with the copy **retrieved from storage**.

**Not supported:** no timestamped artifact pins the intra-day ordering — `0215` dates both events from
**session sequence**, not a clock. And the **in-repo written record** (`0215`'s worklog) was authored
**after** the deploy, so on the strictest reading the repository record does not satisfy *"written
down before the first backup ran"*.

🔴 **Verdict: the substance of the criterion is met** — the failure it exists to prevent, a backup
encrypted to a recipient whose private identity nobody can name, **cannot have occurred**.
⚠️ **The literal ordering claim rests on session sequence only, and the in-repo record came
afterwards. NOT a clean pass.**

---

## G2 — replacement text for `0182` §8, FOR A PRODUCER TO APPLY

⛔ **NOT APPLIED *BY THIS TASK*. `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md`
was not touched by the coder** (Q6). A producer applies the block below, replacing the first bullet of
`## 8. Known limitations`, preserving the existing struck text above it.

> ✅ **APPLIED 2026-09-11 by the producer (`/fkit-task-done` run that closed this task).** The block was
> appended to the end of that bullet, below the existing text, which is left **struck, not deleted**.
> ⚠️ **One mechanical deviation from the draft:** its two `](../../backlog/0218-…/brief.md)` hrefs were
> written as `](../../done/0218-…/brief.md)`, because this task folder moved to `done/` in the same
> run. **Pointer repair only — no wording changed.** The same substitution was applied to the draft
> above so the record matches what was applied.

**That bullet is now false in both halves** — it says the restore has *never* been proven against
non-empty data, and that the documented command line *no longer works*. Execution refuted both.

```markdown
  ⚠️ **What is still TRUE, and it is the part that matters:** the restore has **never been proven
  against non-empty data.** The 2026-07-01 drill ran against an **empty** DB (0 rows)
  **and** predates the default-deny guard, so **its command line no longer works.**
  ✅ **SOURCE RESOLVED 2026-09-10 — and BOTH halves of that sentence are properly sourced.** …

  🚨 **SUPERSEDED 2026-09-11 by task [`0218`](../../done/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) — the paragraph above is now WRONG IN BOTH HALVES. Struck, not deleted.**
  - ~~"the restore has **never been proven** against non-empty data"~~ ⇒ ✅ **PROVEN 2026-09-11.**
    A restore was performed against **76 rows across 7 tables** and verified `IDENTICAL` on all
    eight tables, both `bigserial` sequences, the constraint/index shape and three behavioural
    checks — **twice**: into a throwaway, and **into the LIVE DB in place** (the first rehearsal of
    the `PROFILE_RESTORE_CONFIRM_LIVE` branch that has ever happened).
  - ~~"its command line no longer works"~~ ⇒ ⛔ **REFUTED BY EXECUTION.** The **currently documented**
    drill line ran **verbatim** and succeeded, default-deny override included. ⚠️ This brief
    **overstated** the runbook's own narrower claim: the runbook said *the FIRST drill's* line
    differed from what is documented now — true and unremarkable — not that the documented line is
    broken.
  🚨 **Two REAL defects were found instead, neither of them this one, and both are now fixed in
  `ai-agents/knowledge-base/profile-backup-restore-runbook.md`:**
  1. the drill named `--network opt_profile_default`, **a network that does not exist** (it is
     `profile_default`) — anyone following it in a real outage fails at `docker run`;
  2. the live-recovery example used a `postgresql://profile:PASSWORD@postgres:5432/profile` target,
     **leaking the real `POSTGRES_PASSWORD`** into shell history and two argv lists. The
     password-free local-socket target `postgresql://profile@/profile` works and is now documented.
  ⛔ **What does NOT change:** the durability claim is still **incomplete**. Every cron-produced
  backup object that has ever existed is a dump of an **EMPTY** database; the only non-empty backup
  was **hand-run**. **The SCHEDULE and the DATA are proven SEPARATELY, NEVER TOGETHER**, and the
  measured RTOs (0.374 s / 0.435 s) are on ~21 KB and **do not extrapolate** to real volume. See
  `0218`'s worklog residuals 1–3.
```

---

## Hand-offs

| To | What |
|---|---|
| **`0219` (P4)** | Builds the consumer for `last-backup.json`. Observed marker shape: `{schema, started_at, finished_at, exit_status, object_key, size_bytes, error}`; a real reading is `finished_at 2026-09-11T02:30:09Z`, `exit_status 0`. 🔴 **Four things it must not assume:** (a) the signal has only ever been observed carrying an **empty-DB** payload; (b) a nightly **log line is not a retrievable object** — four of five were written to a bucket that no longer exists; (c) a **manual** `backup.sh` run overwrites that day's scheduled object at the same key, so freshness-by-object-date can be satisfied by a human, not the schedule; (d) the **weekly** path has never run against this bucket and first attempts **Sunday 2026-09-13**. |
| **`0217` (P2)** | ⚠️ The moment real citizen rows exist, **the free window for DB-destructive rehearsals closes.** The live-recovery branch has now been rehearsed (E4), so that debt is paid — but residual 1 (schedule × data) should be closed by **one** deliberate look at the first nightly cron run after wiring. |
| **`0222`** | Untouched. ~~Stays **OPEN** on revoking the **old S3 access key at the provider**.~~ 🔒 **STALE — struck, not deleted: `0222` is CLOSED, and on 2026-09-11 the owner ruled the revocation DELIBERATELY NOT DONE — CLOSED BY OWNER DECISION** (*"Forget about the old S3 keys, mark this task as cancelled."*). ⛔ **Not outstanding work.** ⚠️ **NOT "resolved": never revoked, scope never established, objection overruled twice.** |
| **`fkit-wiki` (G6)** | 🔒 **Flag only — I do not write `ai-agents/wiki-vault/`.** The claim *"THE RESTORE PATH HAS NEVER BEEN TESTED"* is now stale wherever it appears in the vault, and needs an ingest of this worklog plus the updated runbook. **The project auto-memory carries the same stale claim; that is the owner's file, not mine.** |

---

## Change surface

| File | Change |
|---|---|
| `ai-agents/tasks/backlog/0218-…/worklog.md` | **new** — this file |
| `ai-agents/tasks/backlog/0218-…/plan.md` | amended through the drill; C1's `$?`-after-a-pipe defect fixed |
| `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | **G1** network name + expanded verification + new RTO block; **G1b** password-free socket target for live recovery |

**No source file. No script. No config. No task-file move. No commit.** `src/` untouched. `0182`'s
brief **not** touched (Q6 — drafted above, for a producer). `ai-agents/wiki-vault/` **not** touched.
The box was changed **by the owner**, by hand, and every drill row was removed again.
