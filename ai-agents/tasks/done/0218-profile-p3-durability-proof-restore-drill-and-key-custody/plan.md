# `0218` — implementation plan: the durability drill

> 🔒 **Rule for this whole file:** no secret values. No key material, no fingerprints, no bucket
> name, no endpoint, no credentials, no lengths. Every command below refers to secrets **only**
> through variables sourced from the box's own `backup.env`. Names, custodian names, vault names
> and file names only.

> 🔴 **EXECUTION MODEL — the owner runs every command against the live VPS. No agent touches the
> box.** That was `0215`'s rule and it holds here unchanged. This plan is written as an ordered,
> copy-pasteable sequence of **owner-run steps**. Every step states the command, what PASS looks
> like, what FAIL looks like, and what to do on failure. The owner is assumed competent and assumed
> **not** to have read `profile-backup.sh` or `setup-profile.sh`.

> ⚠️ **PLAN ONLY.** Nothing in this task has been executed. No source file, script, config, or
> document has been changed by the plan itself.

---

## 🔴 Owner rulings applied (relayed through the lead session, 2026-09-10)

| # | Ruling | Where it lands |
|---|---|---|
| **Q1** | ~~**YES** — restore a second time from the cron-produced object.~~ ⛔ **REVERSED by the owner 2026-09-11** — the same-day constraint makes it impossible. **D2 removed**, struck-not-deleted in §3, recorded as a knowing trade. |
| **Q2** | Drill data comes out as soon as the drill's evidence is captured. | Split into **F1** (after Phase C) and **F2** (after Phase E). |
| **Q3** | **Correct the runbook and re-run in the same session.** | C4/G1. **Every failing line is recorded verbatim first — the finding is the deliverable, not the eventual green run.** |
| **Q4** | Sunday weekly copy **accepted**, no action. Data is synthetic. | Recorded in Phase B; no step. |
| **Q5** | **Phase E APPROVED**, with two conditions — see §7. | Phase E moved to **after** Phase F1, given its **own** go/no-go, plus a **mandatory credential-exposure mitigation** and an **A2-style precondition re-check**. |
| **Q6** | **I draft, a producer applies.** | ⛔ **I do NOT edit `0182/brief.md`, or anything else under `done/`.** G2 produces exact replacement text and hands it over. |

**Carried forward unchanged:** second-copy residual **accepted and carried**, no remediation, no
re-recommendation · criterion 6 recorded as *substance met, not a clean pass* · no secrets anywhere ·
no commit.

### 🔴 Same-day ruling, 2026-09-11 (Friday, ~06:49 UTC) — and what it costs

**Owner, verbatim:** *"I would like to do all the things today, not on Saturday, because if everything
is ok I plan to do our regular weekend update of the game on Saturday / Sunday."*

02:30 UTC had already passed, so the lead put three options and the owner chose: **prove cron-fired
from THIS MORNING's run, and drop D2.**

| What changed | Where |
|---|---|
| **Phase D re-scoped** to this morning's 02:30 UTC run, and **moved to run second**, before B and C | §3 — and the move is **mandatory**, not cosmetic: C1 overwrites D1's evidence |
| **D2 removed** — reverses the owner's own Q1 ruling, knowingly | §3, struck-not-deleted |
| **Phase E's restore target changed** from "the Phase D cron object" to **C1's hand-run object** | §7 E4 — the old wording would have restored an **empty** database and proved nothing |
| **Phase order** now A → D → B → C → F1 → E → F2 → G | §1 rule 6 |

🚨 **The cost, stated plainly and not buried:** this morning's cron dumped an **empty** database, so
**the SCHEDULE and the DATA are now proven SEPARATELY, never together.** Brief step 5's literal
wording is met; the stronger property is not. Full statement and the worklog requirement: §3.

⏱️ **One deadline this creates:** F1 must finish before **02:30 UTC Saturday**, or the next
unattended cron uploads a drill-data object. ~19 hours of slack.

✅ **One thing the compression does NOT put at risk — worth saying, because it is the obvious worry:**
**Phase E cannot jeopardise the weekend game update.** The update ships the client and game server;
the profile box is **not in that path** — `0217` (the wiring task) is still open and the box has no
consumer. Even a total loss of the profile database on Friday night would not touch Saturday's
release. The profile box's own risk is covered separately by `--single-transaction` rolling back
cleanly (`profile-backup.sh:259`) and by E5's `/health` + `/ready` checks.

⚠️ **Approval status, recorded so nobody over-reads this document:** the owner has **NOT** blanket-
approved this plan. **Phase A only** (read-only) is released. **Phases B onward are held pending
explicit approval.** §3 Phase D is read-only too, but it is **not** covered by the Phase A release —
confirm before running it.

### ⚠️ My read of the Q5 ruling — flagged, because it is not a plain "yes"

The owner's answer was a **reasoning about safety**, not a chosen shape: *"If it's the profile server,
we can test it whatever we want, because it hasn't been used in prod yet. We've just deployed it, but
the client and server sides connected to it haven't been build-deployed."*

**Their premise is sound and this plan tests it directly** — Phase A2 reads every table's row count,
and `0217` (the wiring task) is still open. The lead resolved the *shape* and told the owner so.
**I agree with the lead's resolution and have one thing to add, not to dispute:**

🔴 **The ruling covers the DATA hazard. It does not cover the CREDENTIAL hazard, and "the data is
worthless" does not make a leaked live password harmless.** §7 therefore treats the credential half
as a **separate condition with its own mitigation and its own escape hatch**, exactly as instructed.
**Good news: I found a mitigation the scripts already support — see E2.** If it does not work on the
box, §7 stops and hands the residual back as an explicit accept-or-decline. It is neither run
silently nor quietly dropped.

---

## 0. Scope correction — the brief is stale, and by how much

**Verified against `ai-agents/tasks/done/0215-profile-p1-stand-up-the-box/worklog.md`.** The lead's
read is **correct**. Detail, with the evidence:

| Brief step | Standing after `0215` | Evidence |
|---|---|---|
| **1 — generate the new `age` keypair, record custodian / location / second copy / date** | ✅ **DISCHARGED.** Custodian **Mark Dolbyrev**; generated on the owner's Mac, outside the repo; primary copy **Telegram Saved Messages**, entry named *"Geoconflict profile backup age identity 2026-09"*; second copy **a second cloud messenger**. | `0215/worklog.md` §*`age` key custody — `0218`'s acceptance gate*, and §*Secrets rotation* row *`age` keypair*. |
| **2 — prove the recorded identity is READABLE, live** | ✅ **DISCHARGED.** The owner decrypted a test file using the copy **retrieved from storage** — not the original generated file — and confirmed it by comparing `age-keygen -y` output against the original. | `0215/worklog.md` §*✅ Custody was PROVEN, not assumed*. |
| **3 — populate with real non-empty data** | 🔲 **OPEN — this plan, Phase B.** | `0215` re-verified **0 rows** in all four then-checked tables at execution time. |
| **4 — backup + scripted restore using today's documented commands** | 🔲 **OPEN — this plan, Phase C.** | `0215` residual 4: *"THE RESTORE PATH HAS NEVER BEEN TESTED."* |
| **5 — confirm the nightly cron FIRED** | 🔲 **OPEN — this plan, Phase D.** | `0215` B4: `last-backup.json` was never read; the answer came from `last-smokecheck.json`, which is the **deploy smoke**, not the cron. |
| **6 — update `0182`'s known-limitations** | 🔲 **OPEN — this plan, Phase G.** | `0182/brief.md` §8 still asserts the restore is unproven. It will be wrong once Phase C passes. |

⚠️ **The date `2026-09-09` is NOT read from a timestamped artifact.** `0215`'s worklog says so
itself: *"the date **2026-09-09** is taken from the session sequence … it is not read from a
timestamped artifact."* Everywhere this plan uses that date it means *"the day of the `0215` session
sequence"*, not a verified clock reading. **Do not launder it into a hard date** in the worklog,
the runbook, or `0182`.

### 🔴 The second-copy residual — CARRIED, not fixed

**Owner ruling, given live 2026-09-10: the second-copy residual is ACCEPTED AS-IS and CARRIED. It is
not closed by this task.**

`0215`'s plan asked for an **offline** second copy. What exists is a **second cloud copy**. `0215`
recorded the weakness honestly and it is reproduced here verbatim in substance:

- **Neither store is zero-knowledge.**
- **Both may share a phone-number recovery path**, so **the two copies may not be two independent
  failure modes** — a single account compromise or a single recovery-path takeover could plausibly
  reach both.
- **The owner was shown this and chose it deliberately.**

⛔ **This plan proposes NO work to change that, and makes NO recommendation to change it.** The only
action is **Phase G step G4**: carry the residual forward as a knowingly accepted residual, with
`0215`'s own warning that **"two copies" is weaker than the count suggests**.

### 6 — the "custody recorded BEFORE the first backup ran" criterion, re-checked not waved through

The brief makes this an **acceptance criterion** (`## Verification steps` item 1). Backups have run
nightly since `0215`. Here is what the evidence actually supports, stated plainly:

**What is supported:**
- The **new** `age` keypair was generated on the owner's Mac during the `0215` session sequence,
  **before** the deploy — it had to be, because `PROFILE_BACKUP_AGE_RECIPIENT` is a required deploy
  variable and a **pre-flight `age` recipient round-trip returned `RECIPIENT OK` before the deploy
  was attempted** (`0215/worklog.md` §*Pre-flight checks that passed BEFORE the deploy*).
- The **first backup under the new key** was the **deploy-time smoke check**
  (`setup-profile.sh` `promote_offbox_backup`), which runs one real encrypted backup and upload
  before the config is promoted. No earlier backup can have used this key: the key is new, the
  bucket is new, and both were created for this deploy.
- The **primary copy existed in storage before that**, because readability was proven by decrypting
  with the copy **retrieved from storage** — an act that requires the storage copy to already exist —
  and `0215` dates that proof to the same session sequence.

**What is NOT supported, and must not be claimed:**
- **No timestamped artifact pins the intra-day ordering.** Both the custody proof and the deploy
  smoke backup are recorded as "2026-09-09/10" from session sequence. There is **no clock evidence**
  that the storage copy was placed before the smoke backup ran, only sequence evidence.
- **The written record in this repository postdates the first backup.** `0215`'s worklog — the place
  the custody is written down — was authored **after** the deploy. On the strictest reading of
  *"written down before the first backup ran"*, the **repository record** does not satisfy it.

**Verdict to record:** ✅ **The substance of the criterion is met** — the failure it exists to prevent
(a backup encrypted to a recipient whose private identity nobody can name) **cannot have occurred**,
because readability from storage was proven with the same key in the same session sequence.
⚠️ **The literal ordering claim is supported by session sequence only, and the in-repo written record
came afterwards.** Phase G records it in exactly those two halves. ⛔ **Do not mark item 1 a clean
pass.**

---

## 1. Safety rules that apply to every step below

1. 🔴 **NEVER set `PROFILE_RESTORE_CONFIRM_LIVE` in Phases A, B, C, D or F1.** That variable is the
   guard's *"yes, drop and rebuild the LIVE database"* switch. It appears in this plan **only** in
   **Phase E** (§7), which has its own go/no-go and its own preconditions.
2. 🔒 **When pasting output back, redact:** any bucket name, endpoint, hostname, IP, access key,
   object *path* prefix, and the contents of `backup.env`. Object **file names**
   (`profile-YYYY-MM-DD.dump.age`) and byte sizes are fine. **Never run a bare `env` / `set` / `cat
   backup.env`** — every step below is written so you never need to.
3. ⚠️ **The `age` private identity touches the box exactly twice** (Phase C, and Phase E if run),
   transiently, and is shredded each time. That is the single largest new exposure this drill
   creates. It is unavoidable: the restore script is designed to run on the box.
4. **Run everything as `root` on the box** — `backup.env` is `0600` and `backup.sh` is `0700`.
5. **Do not edit `/opt/profile/backup.sh` or `/opt/profile/backup.env` in place.** They are deploy
   artifacts. If something must change, it changes in the repo and ships via
   `npm run deploy:profile`.
6. 🔴 **Phase order is A → D → B → C → F1 → E → F2 → G** *(changed 2026-09-11)*. **Phase D moved to
   second and is now MANDATORY before Phase C** — C1 overwrites the very files D1 reads. §3 explains.
   Phase E still runs **after** the first cleanup, deliberately — §7 explains why that is the
   stronger shape, not a compromise.
7. ⏱️ **Same-day constraint (owner, 2026-09-11): everything finishes today, Friday.** The owner's
   weekend game update is Saturday/Sunday and this must not run alongside it. **F1 must complete
   before 02:30 UTC Saturday**, or the next unattended cron uploads a drill-data object nobody is
   watching. That is ~19 hours away, so it is ample — but it is a deadline, not a preference.

---

## 2. Phase A — readiness and discovery (non-destructive, read-only)

**Purpose:** establish the facts the rest of the plan depends on but that could **not** be verified
from the repository. Nothing here changes state.

### A1 — confirm you are on the right box and the stack is healthy

```bash
cd /opt/profile && docker compose ps
```

- **PASS:** both services (`postgres`, `profile-api`) listed and **healthy**.
- **FAIL:** a service missing, `Exit`, or `unhealthy`.
- **On failure:** **STOP.** Do not proceed. Report `docker compose ps` and
  `docker compose logs --tail=50`. A drill against a sick stack proves nothing.

### A2 — confirm the DB is empty *before* you add drill data

```bash
docker compose exec -T postgres psql -U profile -d profile -tAc \
"select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) c from %I', table_name), false, true, '')))[1]::text::int as rows
   from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE'
  order by table_name;"
```

- **PASS:** every table reports **0** rows except `schema_migrations`, which reports **4**.
- **FAIL:** any table has rows.
- **On failure:** **STOP and report.** Rows in this DB mean either `0217` was wired early or
  something else wrote to production. The drill's cleanup step (Phase F) is written to delete
  **only** `drill0218-` prefixed rows, but a non-empty starting state changes the risk picture and
  is the owner's call, not the plan's.

📌 **Record the table list from this output.** The repository says there should be **8** tables:
`player_profiles`, `player_match_xp_credits`, `player_name_history`, `player_cosmetic_ownership`,
`purchase_intents`, `processed_purchases`, `player_messages`, `schema_migrations`. If the box shows a
different set, that is itself a finding.

### A3 — discover the compose network name

🚨 **This is the most likely place the documented drill breaks, and it is a repo-verified concern.**

```bash
docker network ls --format '{{.Name}}'
```

- **PASS:** you can identify the network the profile stack uses. Confirm it with:
  ```bash
  docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' \
    "$(cd /opt/profile && docker compose ps -q postgres)"
  ```
  Record the exact name it prints.
- **FAIL:** the inspect command prints nothing.
- **On failure:** report the full `docker network ls` output (network names are not secrets).

> ⚠️ **EXPECTED FINDING.** The runbook
> (`ai-agents/knowledge-base/profile-backup-restore-runbook.md:114`) hardcodes
> **`--network opt_profile_default`**. `setup-profile.sh` writes the compose file to
> `/opt/profile/docker-compose.yml`, sets **no** `COMPOSE_PROJECT_NAME` and passes no `-p`
> (`setup-profile.sh:400`, `:450`), and declares **no** `networks:` block — so Docker Compose v2
> derives the project name from the directory basename (`profile`) and the default network is
> **almost certainly `profile_default`, not `opt_profile_default`**.
> ⚠️ **I could not verify this from the repository — it depends on the box.** Whatever A3 prints is
> the truth. **If it is not `opt_profile_default`, that is a runbook defect and Phase G fixes it.**
> Substitute the real name for `<NET>` everywhere below.

### A4 — discover the real object prefix and list existing backups

```bash
cd /opt/profile
( set -a; . ./backup.env; set +a
  export RCLONE_CONFIG=/dev/null
  echo "PREFIX=${PROFILE_BACKUP_S3_PREFIX}"
  rclone lsl "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/daily/"
  echo "--- weekly ---"
  rclone lsl "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/weekly/" )
```

- **PASS:** the prefix prints, and `lsl` lists at least the object `0215` verified
  (~19 330 bytes). Sizes, dates and file names are safe to paste back.
- **FAIL:** `rclone` errors, or the listing is empty.
- **On failure:** an empty listing after `0215` verified an object present is a **serious finding** —
  report it and **stop**; it would mean the object was pruned or the credentials changed.

> ⚠️ **SECOND EXPECTED FINDING.** The runbook's restore examples hardcode the key as
> `profiles/daily/profile-YYYY-MM-DD.dump.age` (`profile-backup-restore-runbook.md:87`, `:102`,
> `:124`) — i.e. they assume `PROFILE_BACKUP_S3_PREFIX` is literally `profiles`.
> `profile-backup.sh:96` defaults it to `profiles` but `setup-profile.sh` writes whatever the deploy
> configured. **If A4 prints a different prefix, every documented restore command line is wrong and
> Phase G fixes it.** I could not verify the deployed value from the repository.
>
> ℹ️ The `( … )` subshell is deliberate: `set -a` + sourcing `backup.env` puts the S3 secret key into
> the environment. The subshell throws it away when it closes. **Do not run `set -a; . ./backup.env`
> in your main shell.** An `rclone` NOTICE about a missing config file is normal and harmless —
> `RCLONE_CONFIG=/dev/null` above suppresses it.

### A5 — confirm the cron file says `offbox`, and note the current marker

```bash
head -1 /etc/cron.d/profile-backups
grep -c 'backup.sh' /etc/cron.d/profile-backups
ls -l /opt/profile/backups/
cat /opt/profile/backups/last-backup.json 2>/dev/null || echo "NO last-backup.json"
cat /opt/profile/backups/last-smokecheck.json 2>/dev/null || echo "NO last-smokecheck.json"
```

- **PASS:** the header reads `Mode: offbox`; the grep count is **1**.
- **FAIL:** header says `local`, or the grep count is 0.
- **On failure:** **STOP.** A `local` mode means the off-box path is not active and the whole drill
  is measuring the wrong thing. Report and re-deploy is the owner's call.

📌 🔴 **Record `last-backup.json` VERBATIM — this is Phase D's primary evidence and C1 destroys it.**
Paste the whole file back, not a summary. Phase D (§3) runs next and reads exactly this.

⚠️ **If `last-backup.json` does not exist, or its `finished_at` is not from today's 02:30 UTC, do NOT
continue past Phase D.** That means the nightly cron has not been shown to fire at all — a **finding**
with its own contingency and its own stop, written out in §3. It is consistent with `0215`, where B4
could only be answered from the **deploy smoke** marker, never from a cron run.

### A6 — confirm the restore-target image is available

```bash
docker pull postgres:16-alpine
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep '^postgres:16-alpine'
df -h / | tail -1
free -h | head -2
```

- **PASS:** the pull succeeds (or reports "up to date"), the image lists, `df /` shows well under
  60 % used, and `free -h` shows available memory plus the 4 G swap.
- **FAIL:** registry error (`EOF from registry-1.docker.io` is the exact shape `0215` hit).
- **On failure:** it is almost certainly **transient** — `0215` saw this and a plain retry fixed it.
  Retry the pull. Confirm no VPN is connected. If it persists, stop and report.

> ⚠️ The prod Postgres is **`postgres:16-alpine`** (`setup-profile.sh:404`), so the throwaway target
> must be the same major version. `pg_restore` runs **from the prod container** (client v16) against
> the throwaway (server v16) — matched, no version skew.

---

## 3. Phase D — prove the nightly cron FIRED *(🔴 RE-SCOPED AND MOVED EARLY, 2026-09-11)*

> 🚨 **THIS PHASE NOW RUNS SECOND — IMMEDIATELY AFTER PHASE A, BEFORE PHASE B AND C.**
> It was written to run last, after crossing an overnight 02:30 UTC boundary. The owner's
> same-day ruling removed the boundary, and **moving it early is not a convenience — it is
> mandatory.** See the hazard immediately below.

### 🔴 Why the move is mandatory: C1 DESTROYS this phase's evidence

`profile-backup.sh:37` sets the marker path to `$BACKUP_DIR/last-backup.json` **by default**.
**C1 runs `/opt/profile/backup.sh` by hand, which overwrites that exact file** — and, because the
object key is `profile-<UTC date>.dump.age` (`:134-136`), it **also overwrites this morning's S3
object at the same key**.

⇒ **If C1 runs before D1, two of D1's three signals are destroyed and cannot be recovered.**
`0215` residual 6 left reg.ru object versioning **UNKNOWN**, so assume the overwritten object is
gone for good.

🔴 **HARD GATE: D1's evidence must be captured AND pasted back to the lead BEFORE C1 is run.**
Not merely read on screen — handed over. After C1 there is no second chance.

### 🚨 What this phase now proves — and what it does NOT. Read this before recording a pass.

This morning's 02:30 UTC cron dumped a database that was **empty** (Phase A2 confirms it still is).

| | Standing |
|---|---|
| **The schedule FIRES, unattended, and produces an object** | ✅ **This is what D1 proves.** Brief step 5's literal wording — *"confirm the nightly cron FIRED and produced an object"* — **is met.** |
| **A SCHEDULED backup captures REAL DATA** | ⛔ **NOT PROVEN, and this task will not prove it.** The only non-empty backup in this whole drill is the **hand-run** one in C1. |

🔴 **Say it in these terms and no softer: the SCHEDULE and the DATA are proven SEPARATELY, never
together.** The original Phase D was designed to close that gap by having a cron run fire *after*
Phase B; the same-day constraint makes that impossible. **This is a real weakening of the drill, it
is knowingly accepted, and the worklog must record it as a residual — not as a clean pass.**

⚠️ **Consequence for `0219` (P4):** it builds the consumer for `last-backup.json`. It will be
consuming a signal proven to fire, but never observed carrying a non-empty payload. Pass that
forward.

### D1 — three independent signals that the cron ran THIS MORNING

All three must agree, and all three are **read-only**.

```bash
# 1. the scheduler's own record that it invoked the job
grep -i 'profile/backup.sh' /var/log/syslog 2>/dev/null | tail -5 || \
  journalctl -u cron --since "today" --no-pager | grep -i 'backup.sh' | tail -5

# 2. the marker the run wrote
cat /opt/profile/backups/last-backup.json

# 3. the script's own append-only log
tail -25 /var/log/profile-backup.log
```

- **PASS — all three must agree:**
  1. A `CRON[...]: (root) CMD (/opt/profile/backup.sh …)` line dated **today at ~02:30 UTC**.
  2. `last-backup.json` with `"exit_status": 0` and a `finished_at` of **today, ~02:3x UTC** —
     matching the reading A5 already recorded.
  3. Log lines dated today ~02:30 ending in `backup OK: <prefix>/daily/profile-<today>.dump.age`.
- **FAIL:** any one missing, or `exit_status` non-zero.
- **On failure — diagnose in this order:**
  - No syslog/journal line at all → the cron file is not being read. Check
    `ls -l /etc/cron.d/profile-backups` (must be `0644`, root-owned, **no dot in the filename**) and
    `systemctl status cron`.
  - Syslog line present but no marker/log → the script died before writing. `profile-backup.sh`'s
    `on_exit` trap writes a **failure** marker on any early exit, so a **missing** marker is stranger
    than a failing one — report it as-is.
  - Marker present with non-zero `exit_status` → read its `error` field; that is the real finding.

### 🔴 CONTINGENCY — if there is NO cron evidence from this morning

**This is a FINDING, not a step to skip.** If `last-backup.json` is absent, or its `finished_at` is
not from today's 02:30 UTC, then **the nightly cron has not been shown to fire at all** — and that is
arguably the most serious thing this task could discover. A backup schedule that does not run is
worse than a restore that has not been tested: `0215` proved the pipeline works **when invoked**, and
nothing else has ever invoked it except the deploy smoke check.

⛔ **DO NOT substitute C1's hand-run backup for this.** A hand-run produces a marker and an object
that look **identical** to a cron-produced one. Treating it as evidence is precisely the inference
brief step 5 exists to forbid (*"observed, not inferred"*).

⛔ **Do not silently drop brief step 5 either.**

**STOP and hand it back to the lead**, with these options costed:

| Option | Cost |
|---|---|
| **(i) Accept step 5 as UNPROVEN today; record an open residual and ship the rest** | Brief criterion 5 unmet. `0219` then builds a monitor for a signal never observed to fire even once. |
| **(ii) Wait for tomorrow's 02:30 UTC** | Collides directly with the weekend game update the owner explicitly wants this kept away from. |
| **(iii) Investigate and fix the cron now** (file perms / name / `systemctl status cron`) | Worth doing regardless — but the **earliest possible proof is still tomorrow's 02:30**, so it does not rescue today. |

### ~~D2 — restore from the cron-produced object~~ — ⛔ REMOVED 2026-09-11

> 🚨 **This REVERSES the owner's own earlier Q1 ruling** (*"yes, also restore from the cron-produced
> object"*, 2026-09-10). **Struck, not deleted**, so nobody re-derives it as still in scope.
>
> **Why it is impossible now:** D2 required a cron run that fired **after** Phase B seeded the data.
> Under the same-day constraint no such run exists — this morning's 02:30 predates Phase B, and the
> next one is tomorrow, which is the weekend the owner is avoiding.
>
> ✅ **The owner was shown that this option drops D2 and chose it anyway. Recorded as a KNOWING
> trade, not an oversight.**
>
> **What is lost:** the claim stops at *"a backup restores"* and never reaches *"the backup the
> schedule actually produces restores"*. With D2 gone, the drill rests on **one** object-restore
> (C4/C5) plus the live in-place restore (E5) — and E5 is itself conditional on Phase E surviving its
> own go/no-go.
>
> ✅ **One genuine upside, recorded for balance:** the `age` private identity now touches the box
> **twice** (C2, E3) instead of three times. That is the single largest exposure this drill creates,
> and the compression reduces it.

---

## 4. Phase B — populate the live DB with real, non-empty data

> ⚠️ **THIS WRITES TO THE LIVE PRODUCTION DATABASE.** It is reversible (Phase F deletes exactly what
> it inserts, matched on a `drill0218-` id prefix that no real Yandex id can collide with), but it is
> a production write and should be treated as one.
>
> 🔒 **All data is SYNTHETIC.** No real Yandex player id, no real person's name, no real payment
> token. This matters for 152-ФЗ: the drill data will sit inside encrypted backup objects for the
> retention window (see the note at the end of this phase).

### Why the live DB and not a scratch one

`profile-backup.sh:147` dumps **`$POSTGRES_DB` out of the prod compose `postgres` container**. There
is no way to make the real backup path produce a non-empty object without the **live** DB being
non-empty. Populating a scratch DB would test a pipeline nobody runs.

### Which tables, how many rows, and why this set

**76 rows across 7 tables** (plus the 4 existing `schema_migrations` rows = 80 total).

| Table | Rows | What it forces the restore to reconstruct |
|---|---:|---|
| `player_profiles` | **12** | The root table every FK hangs off. Covers: `bigint` XP **above int4 range** (3 000 000 000 — a defect here is exactly error `22003`); `NULL` `display_name` **and** two rows with `NULL` `persistent_id` (a `unique` column tolerating multiple NULLs — a naive re-create would reject the second); Cyrillic names (this is a Russian-market product — an encoding defect would corrupt every real name); an embedded apostrophe; a non-default `schema_version`; a non-trivial nested `jsonb` `extra`; all three CHECK invariants (`chk_paid_implies_citizen`, `chk_purchased_implies_paid`, `chk_earned_implies_citizen`) exercised on both sides; the partial `lower(display_name)` unique index; a timestamp written with a **non-UTC offset** so timezone normalisation is proved. |
| `player_match_xp_credits` | **36** | The only high-cardinality table, and the one real player data lands in first. Composite PK `(game_id, yandex_player_id)`, FK **`on delete cascade`** to profiles, and a non-default `xp_awarded` on every 4th row. 3 credits × 12 profiles. |
| `player_name_history` | **6** | A **`bigserial` sequence** — the single most commonly-lost thing in a restore: if `setval` is not carried, the next insert collides. Plus the **partial unique index** `player_name_history_one_pending_uq` (two `pending` rows on **different** players — legal; a third on the same player must still be rejected **after** restore, which Phase C actively tests), the `moderation_status` CHECK, `rejection_reason` with Cyrillic, and NULL `old_display_name` / `decided_at`. |
| `player_cosmetic_ownership` | **6** | Three-column composite PK and the `cosmetic_type in ('flag','pattern')` CHECK, both values used. Cheap, and it is a table `0215` explicitly counted. |
| `player_messages` | **8** | The **second `bigserial` sequence**, the `chk_message_content` **XOR** constraint with **both** shapes present (template + `jsonb` params, and literal title/body), `chk_read_after_sent` with read and unread rows, nested `jsonb`, Cyrillic body, and a body containing `'`, `"`, `—`, `&` and `%` (the last one matters because `%` is the Vixie-cron footgun this codebase already documents). |
| `purchase_intents` | **5** | `uuid` PK with a `gen_random_uuid()` **default** (4 explicit + 1 defaulted), a `NULL`-able `used_at`, and an index. |
| `processed_purchases` | **3** | The **nullable** FK `intent_id … on delete set null` — one row referencing an intent, one with `NULL`. It is also the **only** table with no FK to `player_profiles`, which is why Phase F must delete it explicitly rather than relying on cascade. |

**Why this set and not "one smoke row":** a single row exercises exactly one table, no sequence, no
composite key, no NULL-in-unique, no CHECK, no partial index, no multibyte text, no `jsonb`, and no
cascade. Every one of those is a real way a restore silently produces a database that *looks*
restored. The 2026-07-01 drill already proved **schema + decryption + pipeline** on 0 rows — the only
thing left to prove is **data**, so the data has to be the interesting part.

### B1 — write the seed file

```bash
cat > /root/drill0218-seed.sql <<'SQL'
\set ON_ERROR_STOP on
set client_encoding = 'UTF8';
set timezone = 'UTC';
begin;

insert into player_profiles
  (yandex_player_id, persistent_id, xp, is_citizen, is_paid_citizen,
   citizenship_earned_at, citizenship_purchased_at, display_name,
   schema_version, extra, created_at, updated_at)
values
 ('drill0218-p01','drill0218-pid-01',          0,false,false,null,null,'DrillAlpha',   1,'{}'::jsonb,                                                  '2026-06-01 09:15:00+00','2026-06-01 09:15:00+00'),
 ('drill0218-p02','drill0218-pid-02',        250,false,false,null,null,'DrillBravo',   1,'{}'::jsonb,                                                  '2026-06-02 09:15:00+00','2026-08-02 09:15:00+00'),
 ('drill0218-p03','drill0218-pid-03',       1000,true, false,'2026-06-03 10:00:00+00',null,'Дрилл Чарли',1,'{}'::jsonb,                                '2026-06-03 09:15:00+00','2026-08-03 09:15:00+00'),
 ('drill0218-p04','drill0218-pid-04',       2500,true, true, '2026-06-04 10:00:00+00','2026-06-05 11:00:00+00','Дрилл Дельта',1,'{}'::jsonb,           '2026-06-04 09:15:00+00','2026-08-04 09:15:00+00'),
 ('drill0218-p05','drill0218-pid-05',        150,true, true, null,                    '2026-06-06 11:00:00+00','DrillEcho',    1,'{}'::jsonb,          '2026-06-05 09:15:00+00','2026-08-05 09:15:00+00'),
 ('drill0218-p06', null,                      40,false,false,null,null,null,           1,'{}'::jsonb,                                                  '2026-06-06 09:15:00+00','2026-08-06 09:15:00+00'),
 ('drill0218-p07', null,                       0,false,false,null,null,null,           1,'{}'::jsonb,                                                  '2026-06-07 09:15:00+00','2026-08-07 09:15:00+00'),
 ('drill0218-p08','drill0218-pid-08',3000000000,true, false,'2026-06-08 10:00:00+00',null,'DrillHotelBigXp',1,'{}'::jsonb,                             '2026-06-08 09:15:00+00','2026-08-08 09:15:00+00'),
 ('drill0218-p09','drill0218-pid-09',        330,false,false,null,null,'DrillIndia',   1,'{"nested":{"a":[1,2,3],"ru":"значение"},"flags":["drill"]}'::jsonb,'2026-06-09 09:15:00+00','2026-08-09 09:15:00+00'),
 ('drill0218-p10','drill0218-pid-10',        410,true, false,'2026-06-10 10:00:00+00',null,'О''Дрилл-Тест',1,'{}'::jsonb,                              '2026-06-10 09:15:00+00','2026-08-10 09:15:00+00'),
 ('drill0218-p11','drill0218-pid-11',        520,false,false,null,null,'DrillKilo',    2,'{"schema_note":"non-default schema_version"}'::jsonb,        '2026-06-11 09:15:00+00','2026-08-11 09:15:00+00'),
 ('drill0218-p12','drill0218-pid-12',        630,false,false,null,null,'DrillLimaWithAVeryLongDisplayNameUsedToProveLongTextRoundTripsThroughPgDumpAndPgRestoreCorrectly',1,'{}'::jsonb,'2026-07-04 12:00:00+03','2026-08-12 09:15:00+00');

insert into player_match_xp_credits (game_id, yandex_player_id, xp_awarded, credited_at)
select 'drill0218-g' || p.yandex_player_id || '-' || g,
       p.yandex_player_id,
       case when g % 4 = 0 then 20 else 10 end,
       timestamptz '2026-08-01 00:00:00+00' + (g || ' hours')::interval
  from player_profiles p
  cross join generate_series(1,3) g
 where p.yandex_player_id like 'drill0218-%';

insert into player_name_history
  (yandex_player_id, old_display_name, new_display_name, changed_at,
   moderation_status, rejection_reason, decided_at)
values
 ('drill0218-p01', null,            'DrillAlpha',       '2026-06-02 10:00:00+00','approved',null,                                        '2026-06-02 11:00:00+00'),
 ('drill0218-p02','DrillBravoOld',  'DrillBravo',       '2026-06-03 10:00:00+00','approved',null,                                        '2026-06-03 12:00:00+00'),
 ('drill0218-p03','Старое Имя',     'Дрилл Чарли',      '2026-06-04 10:00:00+00','approved',null,                                        '2026-06-04 12:30:00+00'),
 ('drill0218-p04','DrillDeltaOld',  'Дрилл Дельта',     '2026-06-05 10:00:00+00','rejected','drill: зарезервированное слово / reserved', '2026-06-05 13:00:00+00'),
 ('drill0218-p05', null,            'DrillEchoPending', '2026-09-01 10:00:00+00','pending', null,                                        null),
 ('drill0218-p06', null,            'DrillFoxPending',  '2026-09-02 10:00:00+00','pending', null,                                        null);

insert into player_cosmetic_ownership
  (yandex_player_id, cosmetic_type, cosmetic_id, granted_at, source)
values
 ('drill0218-p04','flag',   'drill-flag-01',   '2026-06-10 10:00:00+00','purchase'),
 ('drill0218-p04','pattern','drill-pattern-01','2026-06-10 10:05:00+00','purchase'),
 ('drill0218-p05','flag',   'drill-flag-02',   '2026-06-11 10:00:00+00','grant'),
 ('drill0218-p05','pattern','drill-pattern-02','2026-06-11 10:05:00+00','purchase'),
 ('drill0218-p09','flag',   'drill-flag-03',   '2026-06-12 10:00:00+00','purchase'),
 ('drill0218-p10','pattern','drill-pattern-03','2026-06-13 10:00:00+00','purchase');

insert into player_messages
  (yandex_player_id, template_key, template_params, title, body, sent_at, read_at)
values
 ('drill0218-p03','citizenship_earned',   '{"xp":1000}'::jsonb,                              null,null,                                                              '2026-06-20 08:00:00+00','2026-06-20 09:00:00+00'),
 ('drill0218-p04','citizenship_paid',     '{"product":"drill-citizenship"}'::jsonb,          null,null,                                                              '2026-06-21 08:00:00+00',null),
 ('drill0218-p04','name_change_approved', '{"new":"Дрилл Дельта"}'::jsonb,                   null,null,                                                              '2026-06-22 08:00:00+00',null),
 ('drill0218-p04','name_change_rejected', '{"reason":"drill"}'::jsonb,                       null,null,                                                              '2026-06-23 08:00:00+00','2026-06-23 10:00:00+00'),
 ('drill0218-p05', null,                  '{}'::jsonb,                                       'Drill notice',    'Literal body, ASCII only.',                         '2026-06-24 08:00:00+00',null),
 ('drill0218-p06', null,                  '{}'::jsonb,                                       'Дрилл уведомление','Тело сообщения с кириллицей и «кавычками».',       '2026-06-25 08:00:00+00','2026-06-25 08:30:00+00'),
 ('drill0218-p09', null,                  '{}'::jsonb,                                       'Drill quote test','O''Brien said "hi" — em-dash, ampersand & 100%.',   '2026-06-26 08:00:00+00',null),
 ('drill0218-p10','citizenship_earned',   '{"nested":{"a":[1,2,3],"ru":"значение"}}'::jsonb, null,null,                                                              '2026-06-27 08:00:00+00',null);

insert into purchase_intents (id, yandex_player_id, product_id, created_at, used_at)
values
 ('00000218-0000-4000-8000-000000000001','drill0218-p04','drill-citizenship','2026-06-04 12:00:00+00','2026-06-05 11:00:00+00'),
 ('00000218-0000-4000-8000-000000000002','drill0218-p05','drill-citizenship','2026-06-06 10:30:00+00','2026-06-06 11:00:00+00'),
 ('00000218-0000-4000-8000-000000000003','drill0218-p09','drill-cosmetic',   '2026-06-12 09:00:00+00',null),
 ('00000218-0000-4000-8000-000000000004','drill0218-p10','drill-cosmetic',   '2026-06-13 09:00:00+00',null);
insert into purchase_intents (yandex_player_id, product_id, created_at, used_at)
values ('drill0218-p11','drill-cosmetic','2026-06-14 09:00:00+00',null);

insert into processed_purchases
  (purchase_token, yandex_player_id, product_id, intent_id, raw_payload, processed_at)
values
 ('drill0218-tok-01','drill0218-p04','drill-citizenship','00000218-0000-4000-8000-000000000001','{"drill":true,"note":"synthetic"}','2026-06-05 11:00:05+00'),
 ('drill0218-tok-02','drill0218-p05','drill-citizenship','00000218-0000-4000-8000-000000000002','{"drill":true,"ru":"значение"}',   '2026-06-06 11:00:05+00'),
 ('drill0218-tok-03','drill0218-p09','drill-cosmetic',    null,                                 '{"drill":true,"orphan_intent":true}','2026-06-12 09:30:00+00');

commit;
SQL
wc -l /root/drill0218-seed.sql
```

- **PASS:** `wc -l` reports a non-zero line count and the shell returns to the prompt.
- **FAIL:** the heredoc does not terminate (you are stuck at a `>` prompt), or `wc` reports 0.
- **On failure:** press `Ctrl-C`, `rm -f /root/drill0218-seed.sql`, and re-paste. The most common
  cause is a terminal that mangles the Cyrillic or the `«»` characters — see B2's encoding check,
  which is designed to catch exactly that.

### B2 — apply it, then prove the multibyte text survived the *insert*

```bash
cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -U profile -d profile -v ON_ERROR_STOP=1 -f - < /root/drill0218-seed.sql
```

- **PASS:** psql prints a run of `INSERT 0 N` lines ending in `COMMIT`, exit status 0.
- **FAIL:** any `ERROR:` line. The whole thing is inside `begin … commit` with `ON_ERROR_STOP`, so
  **a failure leaves the database untouched** — there is no half-seeded state to clean up.
- **On failure:** paste the first `ERROR:` line. A `23514` is a CHECK violation (the seed is wrong —
  my problem, report it); a `42703` means a column does not exist on the box (a **schema drift
  finding** — report it, it means the box's schema differs from `migrations/`).

**Then, immediately, the encoding sanity check — this is not optional:**

```bash
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres psql -U profile -d profile -c \
"select yandex_player_id, display_name,
        length(display_name) as chars, octet_length(display_name) as bytes
   from player_profiles
  where yandex_player_id in ('drill0218-p03','drill0218-p04','drill0218-p10')
  order by 1;"
```

- **PASS:** the names render as readable Cyrillic, **and for each row `bytes` > `chars`** (multibyte
  UTF-8 actually stored). `drill0218-p10` shows an apostrophe inside the name.
- **FAIL:** names render as `????` or mojibake, or `bytes` equals `chars`.
- **On failure:** **STOP and clean up** (`Phase F`), then report. If the text was corrupted *going
  in*, the drill would later "pass" its digest comparison while proving nothing — a corrupted value
  round-trips just as faithfully as a good one. This check exists solely to close that trap.

### B3 — capture the SOURCE fingerprint

```bash
cat > /root/drill0218-verify.sql <<'SQL'
\pset pager off
set client_encoding = 'UTF8';
set timezone = 'UTC';
set datestyle = 'ISO, YMD';

\echo '=== row counts + content digests ==='
select 'player_profiles' as tbl, count(*) as n,
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.yandex_player_id),'')) as digest from player_profiles t
union all select 'player_match_xp_credits', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.game_id, t.yandex_player_id),'')) from player_match_xp_credits t
union all select 'player_name_history', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.id),'')) from player_name_history t
union all select 'player_cosmetic_ownership', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.yandex_player_id, t.cosmetic_type, t.cosmetic_id),'')) from player_cosmetic_ownership t
union all select 'player_messages', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.id),'')) from player_messages t
union all select 'purchase_intents', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.id),'')) from purchase_intents t
union all select 'processed_purchases', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.purchase_token),'')) from processed_purchases t
union all select 'schema_migrations', count(*),
       md5(coalesce(string_agg(row_to_json(t)::text,'|' order by t.filename),'')) from schema_migrations t
order by 1;

\echo '=== sequences (a lost setval is the classic silent restore defect) ==='
select 'player_name_history_id_seq' as seq, last_value, is_called from player_name_history_id_seq
union all
select 'player_messages_id_seq', last_value, is_called from player_messages_id_seq
order by 1;

\echo '=== schema shape: constraints + indexes ==='
select count(*) as public_constraints
  from pg_constraint c join pg_class r on r.oid=c.conrelid
  join pg_namespace n on n.oid=r.relnamespace where n.nspname='public';
select count(*) as public_indexes,
       md5(string_agg(indexname,'|' order by indexname)) as index_digest
  from pg_indexes where schemaname='public';

\echo '=== spot checks (human-readable, not just a hash) ==='
select xp as p08_bigint_xp from player_profiles where yandex_player_id='drill0218-p08';
select extra->'nested'->>'ru' as p09_jsonb_ru from player_profiles where yandex_player_id='drill0218-p09';
select display_name, length(display_name) as chars, octet_length(display_name) as bytes
  from player_profiles where yandex_player_id in ('drill0218-p03','drill0218-p04','drill0218-p10') order by 1;
select count(*) filter (where persistent_id is null) as null_persistent_ids,
       count(*) filter (where display_name is null)  as null_display_names
  from player_profiles;
select moderation_status, count(*) from player_name_history group by 1 order by 1;
select body from player_messages where title='Drill quote test';
SQL

cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -U profile -d profile -f - < /root/drill0218-verify.sql \
  | tee /root/drill0218-source.txt
```

- **PASS:** row counts read **12 / 36 / 6 / 6 / 8 / 5 / 3 / 4**; two sequence rows print; the spot
  checks render.
- **FAIL:** any count is wrong.
- **On failure:** a wrong count means the seed did not fully apply. Re-run Phase F cleanup, then B1.

📌 **`/root/drill0218-source.txt` is the reference fingerprint the whole drill is measured against.
Keep it until Phase F.** Paste it back — it contains no secrets (synthetic ids, hashes, counts).

> ⚠️ **`set timezone='UTC'` and `set datestyle='ISO, YMD'` are load-bearing.** `row_to_json` renders
> `timestamptz` using the *session* timezone. If the source and restored sessions differ, the digests
> differ for a database that is byte-identical — a false alarm that would look exactly like a real
> defect. The same three `set` lines run on both sides. Do not drop them.

> 🔒 **Backup-retention consequence, stated up front:** every backup taken from now until Phase F
> contains this drill data, and daily objects live **14 days** by default
> (`PROFILE_BACKUP_RETENTION_DAILY_DAYS`, `profile-backup.sh:120`). If the drill day is a **Sunday**,
> `profile-backup.sh:171-177` also writes a **weekly** copy, retained ~**56 days**. All of it is
> synthetic, so this is a housekeeping fact, not a privacy problem — but it is a fact, so it is
> written down. It is also **question Q4 to the owner** (below).

---

## 5. Phase C — backup, then the scripted restore, with today's documented commands

### C1 — run a backup by hand, so a data-bearing object exists now

> 🔴 **STOP — do not run C1 until Phase D (§3) is complete AND its evidence has been handed back.**
> This command overwrites `/opt/profile/backups/last-backup.json` (`profile-backup.sh:37`) **and**
> this morning's S3 object at the same dated key (`:134-136`). Both are Phase D's evidence, and
> `0215` residual 6 leaves object versioning **UNKNOWN**, so assume neither comes back.

```bash
/opt/profile/backup.sh 2>&1 | tail -20
echo "exit=${PIPESTATUS[0]}"
cat /opt/profile/backups/last-backup.json
```

> 🔴 **DEFECT IN THIS STEP, FOUND AT EXECUTION 2026-09-11 and fixed above.** It originally read
> `echo "exit=$?"` after a pipe, which reports **`tail`'s** status, not `backup.sh`'s — it would have
> printed `exit=0` on a **failed** backup. `${PIPESTATUS[0]}` is the fix. **A verification step that
> cannot fail is worse than no verification step at all.**

- **PASS:** the log ends `backup OK: <prefix>/daily/profile-<today>.dump.age (N bytes)`, exit 0, and
  `last-backup.json` shows `"exit_status": 0` with a fresh `finished_at`. **N should be materially
  larger than the ~19 330 bytes `0215` measured on the empty DB** — that size delta is itself first
  evidence the dump carries data.
- **FAIL:** non-zero exit, or `last-backup.json` shows a non-zero `exit_status` and a populated
  `error`.
- **On failure:** the script is fail-loud by design; paste the `error` field and the last 20 log
  lines. Do **not** proceed to a restore of an unverified object.

📌 **Record `finished_at`, `size_bytes` AND the exact `object_key`.** Phase E (§7 E4) restores **this**
object — it is the only drill-data-bearing backup that will exist.

⚠️ **The overwrite you just performed, stated so it is not a surprise:** the object key is
`profile-<UTC date>.dump.age` (`profile-backup.sh:134-136`), so this run **replaced this morning's
cron object** at the same key, and it **replaced `last-backup.json`** (`:37`). That is expected and
harmless **only because Phase D already captured and handed back both** — which is why §3 runs first.
⚠️ **`0215` residual 6 records that reg.ru exposed no versioning setting and it was left UNKNOWN** —
so assume the overwrite is **not** recoverable.

### C2 — bring the `age` identity onto the box, transiently

> 🔴 **This is the highest-risk step in the drill and the only one that cannot be undone by a
> command.** The private identity is the master key to every backup. It goes on the box, is used, and
> is shredded.

**From the owner's Mac** (not on the box):

```bash
scp /path/to/profile-backup-identity.txt root@<PROFILE_SERVER_HOST>:/root/profile-backup-identity.txt
```

**Then on the box:**

```bash
ls -l /root/profile-backup-identity.txt
chmod 600 /root/profile-backup-identity.txt
```

- **PASS:** the file exists and is `0600`.
- **FAIL:** `scp` refused, or the file is empty.
- **On failure:** stop; do not retry blindly. A truncated identity file produces a decryption failure
  in C4 that is easy to misread as a corrupt backup.

🔒 **Do not paste the file's contents, its size, or any fragment anywhere.** Confirming "present and
0600" is the entire report.

### C3 — stand up the throwaway target

Substitute the network name from **A3** for `<NET>`.

```bash
docker run -d --name restore-test --network <NET> \
  -e POSTGRES_USER=profile -e POSTGRES_PASSWORD=test -e POSTGRES_DB=profile \
  postgres:16-alpine
sleep 10
docker exec -i restore-test pg_isready -U profile -d profile
```

- **PASS:** `pg_isready` prints `accepting connections`.
- **FAIL:** the container exits, or `pg_isready` reports "no response".
- **On failure:** `docker logs restore-test`. If the network name was wrong, `docker run` fails
  immediately with `network <NET> not found` — go back to A3.

**Prove the prod container can actually reach it** (this is the thing the network name controls):

```bash
cd /opt/profile
docker compose exec -T postgres getent hosts restore-test
```

- **PASS:** an IP and the name `restore-test` print.
- **FAIL:** no output.
- **On failure:** 🚨 **This is the `opt_profile_default` finding.** The two containers are not on a
  shared network. Re-read A3, connect the throwaway to the right network
  (`docker network connect <NET> restore-test`), and **record it — Phase G must correct the
  runbook.**

⚠️ The throwaway's password is the literal string `test`, exactly as the runbook documents. It is a
disposable container with no port published to the host, torn down in C6. It **will** appear in
`ps -ef` argv on the box during C4 — acceptable for a throwaway, and one more reason **never** to run
this shape with the live credentials.

### C4 — the restore, using the runbook's command line as documented today

🚨 **THIS IS THE STEP THE BRIEF PREDICTS MAY FAIL.** Run it **exactly** as written first, with the
values discovered in A3/A4 substituted, and record what happens **before** adjusting anything.

Substitute `<NET>`-derived host name `restore-test`, and `<PREFIX>` = the prefix printed by **A4**.

```bash
time PROFILE_RESTORE_REMOTE_HOST=restore-test \
/opt/profile/backup.sh restore \
  <PREFIX>/daily/profile-$(date -u +%Y-%m-%d).dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile:test@restore-test:5432/profile'
```

- **PASS:** the log prints `downloading …` → `decrypting with off-box identity` →
  `target host 'restore-test' matches PROFILE_RESTORE_REMOTE_HOST — proceeding with distinct-remote
  restore` → `pg_restore into target` → **`restore complete`**, exit 0. **Record the wall-clock
  `real` time — that is the RTO the runbook asks for.**
- **FAIL — four distinguishable shapes, and they mean different things:**

  | Failure text | What it means | What to do |
  |---|---|---|
  | `refusing to restore into 'restore-test' (default-deny)` | The guard rejected the target. `profile-backup.sh:231-232` requires `PROFILE_RESTORE_REMOTE_HOST` to **exactly equal** the URL host. | Check for a typo / stray whitespace. **If the documented line as written is genuinely refused, that is FINDING #1 and Phase G rewrites the runbook.** |
  | `download failed` | The object key is wrong — almost certainly the **prefix**. | Re-read A4's `lsl` output and use the real key. **If the runbook's literal `profiles/daily/…` was wrong, that is FINDING #2 and Phase G rewrites it.** |
  | `decryption failed` | The identity file does not match the recipient the backup was encrypted to, **or** it was truncated in transit. | 🔴 **STOP AND ESCALATE.** This is the exact catastrophe `0218` exists to detect. Re-verify the transfer first (C2), then report. **Do not delete anything.** |
  | `pg_restore failed` | The archive restored partially or not at all. | `--single-transaction` (`profile-backup.sh:259`) means the target **rolled back cleanly** — it is not half-restored. Capture the full `pg_restore` stderr; this is a genuine restore-path defect and the most valuable possible finding. |

> ⚠️ **What I could NOT verify from the repository:** whether the runbook's line works today. I can
> say the runbook **does** carry the `PROFILE_RESTORE_REMOTE_HOST=restore-test` override
> (`profile-backup-restore-runbook.md:122`) and that this **matches** the guard's requirement
> (`profile-backup.sh:231-232`) — so the brief's blanket claim that *"the documented command line no
> longer works"* is **probably out of date for the guard specifically**. The two things I expect to
> actually break are the **network name** and the **prefix**, neither of which the brief mentions.

### C5 — verify the restore by counts and content, not by exit code

```bash
docker exec -i -e PGCLIENTENCODING=UTF8 restore-test \
  psql -U profile -d profile -f - < /root/drill0218-verify.sql \
  | tee /root/drill0218-restored.txt

diff /root/drill0218-source.txt /root/drill0218-restored.txt && echo "IDENTICAL"
```

- **PASS:** `diff` prints nothing and `IDENTICAL` appears. That means **every row count, every
  per-table content digest, both sequence positions, the constraint count, the index digest, and
  every spot check** match the live database exactly.
- **FAIL:** `diff` prints differences.
- **On failure:** the diff itself is the finding, and it is precise. Interpret it:
  - a **count** line differing → rows were lost;
  - a **digest** differing with the count matching → content changed (encoding, timezone, jsonb
    normalisation, numeric precision);
  - a **sequence** `last_value` differing → `setval` was not carried; the restored DB would collide
    on the next insert. **This is a real, shipping-blocking defect even though every row is present.**
  - a **constraint / index** count differing → the restored schema is weaker than the source; data
    that violates a missing constraint could then be written.

  ⚠️ **Before concluding a defect, confirm both sides ran the same three `set` lines** — the verify
  file sets them, but a hand-edited invocation might not.

**Then three live behavioural checks the digests cannot make** (run on `restore-test` only):

```bash
# (a) the partial unique index still rejects a second pending request for one player
docker exec -i restore-test psql -U profile -d profile -c \
"insert into player_name_history (yandex_player_id, new_display_name, moderation_status)
 values ('drill0218-p05','SecondPending','pending');"
```
- **PASS:** ✅ an **ERROR** — `duplicate key value violates unique constraint
  "player_name_history_one_pending_uq"` (SQLSTATE `23505`). **The error IS the pass.**
- **FAIL:** `INSERT 0 1` succeeds → the partial unique index did not survive the restore. **Finding.**

```bash
# (b) FK cascade still works — inside a transaction that is rolled back
docker exec -i restore-test psql -U profile -d profile <<'SQL'
begin;
delete from player_profiles where yandex_player_id='drill0218-p04';
select 'xp_credits_left'  as check, count(*) from player_match_xp_credits where yandex_player_id='drill0218-p04';
select 'messages_left'    as check, count(*) from player_messages         where yandex_player_id='drill0218-p04';
select 'cosmetics_left'   as check, count(*) from player_cosmetic_ownership where yandex_player_id='drill0218-p04';
select 'intents_left'     as check, count(*) from purchase_intents        where yandex_player_id='drill0218-p04';
select 'receipt_intentid' as check, intent_id from processed_purchases    where purchase_token='drill0218-tok-01';
rollback;
SQL
```
- **PASS:** all four `*_left` counts are **0** (cascade fired) and `receipt_intentid` is **null**
  (the `on delete set null` FK fired). The `rollback` leaves the throwaway unchanged.
- **FAIL:** any non-zero count, or `receipt_intentid` still populated → referential actions did not
  survive. **Finding.**

```bash
# (c) the sequence hands out a NON-COLLIDING next id
docker exec -i restore-test psql -U profile -d profile -c \
"insert into player_name_history (yandex_player_id, new_display_name, moderation_status)
 values ('drill0218-p01','SeqProbe','approved') returning id;"
```
- **PASS:** the returned `id` is **greater than** the maximum `id` in `/root/drill0218-source.txt`.
- **FAIL:** an error, or an id that collides with an existing row.
- **On failure:** the sequence was not restored at its correct position — the single most common
  silent restore defect, and exactly why it is tested. **Finding.**

📌 After (c) the throwaway holds one extra row. That is fine — it is destroyed in C6, and the digest
comparison already ran **before** it.

### C6 — tear down and shred

```bash
docker rm -f restore-test
shred -u /root/profile-backup-identity.txt
ls -l /root/profile-backup-identity.txt 2>&1 | tail -1
ls -l /tmp/profile-restore.* 2>&1 | tail -1
```

- **PASS:** the container is removed; both `ls` commands report **No such file or directory**.
- **FAIL:** the identity file still exists.
- **On failure:** 🔴 **do not leave the step.** Retry `shred -u`; if `shred` is unavailable use
  `rm -Pf` or `dd if=/dev/urandom of=<file> bs=1k count=1 && rm -f <file>`. **The private identity
  must not remain on the box.**

> ℹ️ `profile-backup.sh:242-243` installs an `EXIT` trap that removes the decrypted plaintext and its
> `.age` temp from `$TMPDIR` even if a step dies. The second `ls` is a check on that trap, not a
> substitute for it.

---


## 6. Phase F1 — clean up the drill data *(✅ Q2: as soon as the drill's evidence is captured)*

Run as soon as Phase C is complete and its evidence is captured. (Phase D already ran, back at §3.)

⚠️ **F1 deletes the ROWS but KEEPS the evidence files.** `/root/drill0218-source.txt`,
`/root/drill0218-restored*.txt` and `/root/drill0218-verify.sql` are needed again in **Phase E** and
are deleted in **F2**. This is a change from the single-cleanup shape: it exists because Phase E now
runs after F1.

```bash
cd /opt/profile
docker compose exec -T postgres psql -U profile -d profile -v ON_ERROR_STOP=1 <<'SQL'
begin;
-- processed_purchases has NO FK to player_profiles, so cascade will not reach it.
delete from processed_purchases where purchase_token like 'drill0218-%';
-- everything else cascades from the profile rows.
delete from player_profiles where yandex_player_id like 'drill0218-%';
commit;
SQL

docker compose exec -T postgres psql -U profile -d profile -tAc \
"select 'player_profiles',count(*) from player_profiles
 union all select 'player_match_xp_credits',count(*) from player_match_xp_credits
 union all select 'player_name_history',count(*) from player_name_history
 union all select 'player_cosmetic_ownership',count(*) from player_cosmetic_ownership
 union all select 'player_messages',count(*) from player_messages
 union all select 'purchase_intents',count(*) from purchase_intents
 union all select 'processed_purchases',count(*) from processed_purchases
 union all select 'schema_migrations',count(*) from schema_migrations;"

rm -f /root/drill0218-seed.sql
docker rm -f restore-test 2>/dev/null || true
ls -l /root/profile-backup-identity.txt 2>&1 | tail -1
ls -l /root/drill0218-source.txt /root/drill0218-restored*.txt /root/drill0218-verify.sql
```

- **PASS:** every table reports **0** except `schema_migrations` at **4**; the identity file is
  reported **missing**; the throwaway container is gone; the four evidence/verify files are
  **still present** (Phase E needs them).
- **FAIL:** any non-zero count, or the identity file still present.
- **On failure:** if rows remain, **do not widen the `like` pattern** — report the remaining rows.
  The `drill0218-` prefix is exact by construction; leftovers would mean something else wrote rows.
  If the identity file is present, go back to C6's failure branch immediately.

⚠️ **Paste `/root/drill0218-source.txt` and `/root/drill0218-restored.txt` back to the lead now** —
they are the evidence for the worklog, and F2 deletes them. (There is no `restored-cron.txt`; **D2 was
removed** — §3.)

⚠️ **The drill data is NOT gone from the backups.** Daily objects carrying it expire on the retention
window (default 14 days), and a Sunday run's weekly copy on ~56 days. ✅ **Accepted by the owner
(Q4).** Synthetic only; recorded so nobody is surprised to restore a drill object next week and find
`drill0218-` rows. **Phase E depends on this**: it restores one of those drill-bearing objects.

---

## 7. Phase E — rehearse the LIVE in-place recovery branch *(✅ APPROVED — Q5, with two conditions)*

> 🔴 **DESTRUCTIVE AND HARD TO REVERSE. Its own step, its own go/no-go. Do not drift into it from
> Phase F1.**

### Why this is worth doing, and why the window is closing

Phase C proves the **throwaway-remote** branch of the restore guard. The branch a **real
disaster** uses is the other one — `PROFILE_RESTORE_CONFIRM_LIVE`, which runs
`pg_restore --clean --if-exists` **against the live database**, dropping and recreating its objects
(`profile-backup.sh:234-235`, `:259`). **Nobody has ever run it.** After `0217` wires the game server
and real citizen rows exist, rehearsing it stops being free — permanently.

### 🎯 The ordering is not an accident — F1-then-E is the strongest possible shape

Because F1 has just emptied the live database, Phase E restores a **drill-data-bearing** object into
an **empty live database**. That is *literally the disaster scenario*: the data is gone, and the
backup has to bring it back. Verifying the result against `/root/drill0218-source.txt` then proves
the recovery, not merely that a command ran. **The lead's sequencing is better than the tail-step
shape I originally sketched, and this is why.**

### E1 — GO/NO-GO precondition re-check (the owner's premise, re-tested)

The owner's ruling rests on a factual premise: *the profile server has not been used in prod; the
client and server sides connected to it have not been build-deployed.* **Re-test it, do not assume
it still holds.**

```bash
# (i) still zero real rows?
cd /opt/profile
docker compose exec -T postgres psql -U profile -d profile -tAc \
"select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) c from %I', table_name), false, true, '')))[1]::text::int
   from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE' order by table_name;"

# (ii) has anything hit the internal crediting surface?
docker compose logs --since 168h profile-api 2>/dev/null | grep -ci '/internal/' || echo 0
```

**Plus, agent-side (the lead or I check this in the repo, not on the box):** `0217` is still under
`ai-agents/tasks/backlog/`, i.e. the game server is still unwired.

- **PASS:** every table **0** except `schema_migrations` = **4**; the `/internal/` count is **0**;
  `0217` still in `backlog/`.
- **FAIL:** any real rows, any `/internal/` traffic, or `0217` moved to `done/`.
- **On failure:** 🔴 **STOP. The free window has closed.** Do not run Phase E. Report it — this
  becomes a residual for a later, properly-planned recovery exercise against real data, which is a
  different task with a different risk profile.

### E2 — 🔴 CONDITION: the credential-exposure mitigation *(this gates the whole phase)*

**The hazard the owner's ruling does NOT cover.** Their reasoning is about the **data** being
worthless. It is sound. But the live-restore command as documented
(`profile-backup-restore-runbook.md:103`) is:

```
'postgresql://profile:PASSWORD@postgres:5432/profile'
```

That embeds the **real `POSTGRES_PASSWORD`**, which then lands in **three durable or observable
places**: root's shell history file (persists on disk indefinitely), the `backup.sh` process argv,
and the `docker` client argv — all readable via `/proc/*/cmdline`. **"The data is worthless" does not
make a leaked live credential harmless**, and rotating `POSTGRES_PASSWORD` afterwards is *expensive*:
the Postgres image applies it **only at initdb**, which is why `0215` had to destroy the data volume
to rotate it (Step 14 Branch C).

**✅ The mitigation, and the scripts already support it: use the LOCAL SOCKET, with no password at
all.**

`pg_restore` runs **inside** the postgres container (`profile-backup.sh:259`), and that container's
own `pg_dump` already connects over the local socket with **trust** auth and no password
(`profile-backup.sh:147` — no host, no password, and it works today). A target URL with an **empty
host** reaches that same socket.

**The guard accepts it.** Traced through `profile-backup.sh:223-238` for the target
`postgresql://profile@/profile`:

| Step | Code | Result |
|---|---|---|
| `rest="${target#*://}"` | `:224` | `profile@/profile` |
| `rest="${rest#*@}"` | `:224` | `/profile` |
| not bracketed IPv6 | `:225` | takes the else branch |
| `tgt_host="${rest%%[:/]*}"` | `:228` | **empty string** |
| `[ -n "$tgt_host" ] && …` | `:231` | **false** — falls through |
| `[ "$PROFILE_RESTORE_CONFIRM_LIVE" = "$today_utc" ]` | `:234` | **true** → proceeds |

And `profile-backup.sh:235` logs `… into '<socket>'` — **the empty-host case is one the guard's own
log message was written for.** This is the intended in-place shape; the runbook just never documented
it.

**Pre-test it before the destructive step — read-only, costs nothing:**

```bash
cd /opt/profile
docker compose exec -T postgres psql -d 'postgresql://profile@/profile' -tAc "select 1"
```

- **PASS:** prints `1`. ⇒ socket + trust auth works ⇒ **Phase E runs with NO credential anywhere in
  any command line.** With no secret in the command, shell-history and argv hygiene stop being
  load-bearing — I am not going to prescribe history-scrubbing ritual that protects nothing.
- **FAIL:** any authentication error (`password authentication failed`, `no pg_hba.conf entry`).
- **On failure:** 🔴 **STOP. Do NOT fall back to the password-bearing URL.** Hand the residual back
  to the lead as an explicit **accept-or-decline**, with these three options costed:

  | Option | Cost |
  |---|---|
  | **(a) Decline Phase E** | The live-recovery branch stays unrehearsed, and after `0217` the window is gone for good. This is a real loss, not a shrug. |
  | **(b) Accept the exposure, then rotate `POSTGRES_PASSWORD`** | Rotation only takes effect at `initdb`, so it means destroying the Postgres volume plus a full `npm run deploy:profile` — free of data loss right now (the DB is empty after F1), but it is a full redeploy, and `setup-profile.sh` stops nginx unconditionally before certbot, so it takes the public API down briefly (the window `0215` recorded). |
  | **(c) A `.pgpass` inside the container** | ⛔ **Rejected.** It means writing a file into a running container by hand — a box change outside the deploy path, which this project's rules forbid, and it would be silently lost on the next `docker compose up --force-recreate`. |

  ⛔ **Do not run Phase E silently on the password-bearing URL, and do not quietly drop Phase E
  either.** Either outcome must be an explicit recorded decision.

### E3 — identity onto the box again

Repeat **C2** exactly (scp, `chmod 600`, confirm present-and-0600 only). Same rules, same
non-negotiable shred at the end.

### E4 — the live in-place restore

🔴 **CHANGED 2026-09-11 — restore C1's object, NOT a cron object.** The previous wording said *"use
the dated cron key from Phase D"*. **That is now WRONG and would have made Phase E prove nothing:**
with D2 removed, the only cron object in play is **this morning's**, which is a dump of an **empty**
database — and C1 has already **overwritten it at the same key** anyway.

⇒ **The only drill-data-bearing object that exists is the one C1 produced by hand.** It is today's
key. Use the object key **exactly as C1's own log line reported it** (`backup OK: <key>`), not a
reconstructed one.

Substitute `<PREFIX>` from A4. `$(date -u +%Y-%m-%d)` is correct **for today only**, because C1 ran
today; if the session has crossed midnight UTC since C1, **name C1's date literally instead**.

```bash
time PROFILE_RESTORE_CONFIRM_LIVE=$(date -u +%Y-%m-%d) \
/opt/profile/backup.sh restore \
  <PREFIX>/daily/profile-<C1-KEY-DATE>.dump.age \
  /root/profile-backup-identity.txt \
  'postgresql://profile@/profile'
```

⚠️ **Sanity-check before running it:** the object's size should match C1's recorded `size_bytes` and
be **materially larger** than the ~19 330 bytes `0215` measured on an empty DB. **Restoring an
empty-database object into an empty database would "succeed" and prove nothing** — the size check is
the cheap guard against that.

- **PASS:** the log shows `PROFILE_RESTORE_CONFIRM_LIVE matches <today> — proceeding with confirmed
  in-place restore into '<socket>'` → `pg_restore into target` → **`restore complete`**, exit 0.
  Record the wall-clock `real` — **this is the number that matters for a real outage**, and it is a
  different (and more honest) RTO than C4's throwaway figure.
- **FAIL:** the same four shapes as C4, plus one new one:
  - `refusing to restore into '<empty/socket>' (default-deny)` ⇒ the `PROFILE_RESTORE_CONFIRM_LIVE`
    date did not match today UTC. The guard compares against **UTC**, so near midnight local time the
    dates can disagree. Re-run; `$(date -u …)` in the command already handles it.
- **On any failure:** `--single-transaction` (`profile-backup.sh:259`) wraps the whole restore
  **including the `--clean` DROPs** in one transaction that rolls back on any error. **The live
  database is left unchanged, not half-dropped.** Verify that with E5's count query before doing
  anything else.

⚠️ **Do NOT stop `profile-api` first, even though a real recovery would.** The `profile` systemd unit
carries `Restart=always` (`setup-profile.sh:759-776`) — this is **trap T11**, which `0215` hit and had
to defeat by stopping the unit before touching the stack. Trying to stop one service here risks the
unit restarting the whole stack mid-restore. Instead: **expect `/ready` to blip** while `pg_restore`
holds locks. That is normal. E5 confirms it recovers.

### E5 — verify the live restore

```bash
cd /opt/profile
docker compose exec -T -e PGCLIENTENCODING=UTF8 postgres \
  psql -U profile -d profile -f - < /root/drill0218-verify.sql \
  | tee /root/drill0218-live-restored.txt

diff /root/drill0218-source.txt /root/drill0218-live-restored.txt && echo "IDENTICAL"
```

- **PASS:** `IDENTICAL`. The data that F1 deleted is back, byte-for-byte, in the **live** database,
  recovered from an off-box encrypted backup. **That is the durability claim, fully proven.**
- **FAIL:** any diff — interpret exactly as in C5.

**Then confirm the service survived:**

```bash
docker compose ps
curl -sS -o /dev/null -w 'health=%{http_code}\n' http://127.0.0.1:8080/health
curl -sS -o /dev/null -w 'ready=%{http_code}\n'  http://127.0.0.1:8080/ready
```

- **PASS:** both services healthy, `/health` **200**, `/ready` **200** (`/ready` is DB-backed, so a
  200 proves the API re-established its connection against the restored database).
- **FAIL:** anything else.
- **On failure:** `docker compose logs --tail=50 profile-api`. A pooled connection killed mid-restore
  is the likely cause and usually self-heals within a healthcheck cycle; if it does not, restarting
  the systemd unit (`systemctl restart profile`) is the supported recovery — **not** a `docker
  compose` command that T11 will fight.

### E6 — shred

Repeat **C6**'s shred and its verification. 🔴 Same rule: **do not leave this step with the identity
still on the box.**

---

## 8. Phase F2 — final cleanup

Phase E has just restored the drill data **into the live database**. It has to come out again.

```bash
cd /opt/profile
docker compose exec -T postgres psql -U profile -d profile -v ON_ERROR_STOP=1 <<'SQL'
begin;
delete from processed_purchases where purchase_token like 'drill0218-%';
delete from player_profiles     where yandex_player_id like 'drill0218-%';
commit;
SQL
```

Then re-run **F1's** count query and **F1's** identity check, and finally:

```bash
rm -f /root/drill0218-verify.sql /root/drill0218-source.txt /root/drill0218-restored*.txt
ls -l /root/drill0218-* 2>&1 | tail -1
```

- **PASS:** all tables **0** except `schema_migrations` = **4**; identity file gone; no
  `drill0218-*` files remain; `/health` and `/ready` still **200**.
- **FAIL:** any non-zero count, or a leftover file.
- **On failure:** same rule as F1 — **do not widen the `like` pattern**, report what remains.

⚠️ **Paste the evidence files back BEFORE this step deletes them**, if F1's hand-back did not already
cover `/root/drill0218-live-restored.txt`.

🔒 **If Phase E was skipped or declined, F2 collapses to just the `rm -f` line** — F1 already emptied
the database and nothing put data back.

---

## 9. Phase G — documentation (agent-side, no box access)

These are mine to draft once the owner returns the evidence. **None of them is a code change.**

🔴 **Q6 ruling applied: I DRAFT, a producer APPLIES.** ⛔ **I do not edit `0182/brief.md`, or any
other file under `ai-agents/tasks/done/`, myself.** For each such file I produce the **exact
replacement text** in this task's worklog and hand it over.

| # | File | Change |
|---|---|---|
| **G1** | `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | Rewrite the **Restore TEST drill** block with the commands that **actually worked** — the real network name (A3), the real prefix (A4), and the enlarged verification (all 8 tables, the two sequences, the constraint/index digests, and the three behavioural checks). Replace the **Recorded RTO** paragraph (`:147-153`) with the non-empty-data RTO from C4, and **strike the "predates the default-deny guard" caveat**, since the drill will have re-established a working line. ⚠️ **Keep the struck text visible** — do not delete history. |
| **G1b** | Same runbook, **Restore procedure** section | 🆕 **Document the password-free live-recovery target.** `:103` currently shows `postgresql://profile:PASSWORD@postgres:5432/profile`, which leaks `POSTGRES_PASSWORD` into shell history and argv. If E2's pre-test passes, replace it with the socket form `postgresql://profile@/profile` and say **why**. This is a **third runbook finding**, discovered by reading the guard rather than by running it. ⚠️ **Only document it if E2 actually passed on the box** — otherwise record it as untested. |
| **G2** | `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md` §8 | The bullet currently says the restore *"has **never** been proven against non-empty data"* and *"its command line no longer works"*. Both become **false** on a green drill. **⛔ Q6: I do NOT edit this file.** I write the **exact replacement text** into this task's worklog — superseding in place (strike, don't delete), citing this task and the drill date — and hand it to a producer to apply. ⚠️ **Only if the drill is green** — a red drill makes that bullet **more** true, not less, and the draft must then say so instead. |
| **G3** | This task folder's `worklog.md` (new) | The evidence packet: the commands as run, the source/restored fingerprints, the RTO, the cron evidence, and **every finding** from A3/A4/C4. Plus the ordering answer from §0.6 in **both** its halves — substance met, literal ordering supported by session sequence only, in-repo record written afterwards. |
| **G4** | Same worklog, residuals section | **Carry the second-copy residual forward unchanged**, with `0215`'s own warning that *"two copies" is weaker than the count suggests* — neither store zero-knowledge, possibly one shared phone-number recovery path. ⛔ **Recorded as a knowingly accepted residual under the owner's 2026-09-10 ruling. No remediation proposed.** |
| **G5** | Hand-off notes | `0219` (P4) builds the consumer for `last-backup.json` — pass it D1's observed marker shape. ~~`0222` stays **open** on revoking the **old S3 access key at the provider**;~~ 🔒 **STALE — struck, not deleted: `0222` is CLOSED, and the revocation is CLOSED BY OWNER DECISION 2026-09-11 — DELIBERATELY NOT DONE** (*"Forget about the old S3 keys, mark this task as cancelled."*); ⛔ **not outstanding work**; ⚠️ **NOT "resolved" — never revoked, scope never established, objection overruled twice.** This task touches none of that. |
| **G7** | This task's worklog, Phase E section | Record the Phase E outcome **including the credential-hazard decision**: which of E2's branches was taken, and — if the socket pre-test failed — the owner's explicit accept-or-decline. ⛔ **A skipped or declined Phase E is recorded as a decision, never as an omission.** |
| **G6** | Routed, **not** done by me | The claim *"THE RESTORE PATH HAS NEVER BEEN TESTED"* also appears in the project auto-memory and, possibly, in `ai-agents/wiki-vault/` pages. 🔒 **The wiki is `fkit-wiki`'s exclusive write surface** — I will flag it for an ingest, never edit it. The auto-memory is the owner's. |

---

## 10. Mapping to the brief's acceptance criteria

| Brief verification step | Discharged by | Expected standing |
|---|---|---|
| 1 — custody written down **before** the first backup | `0215` + §0.6 of this plan | ⚠️ **Substance met; literal ordering from session sequence only; in-repo record written afterwards.** Recorded in both halves, not passed clean. |
| 2 — custodian demonstrated they can read it, dated | `0215` (from-storage decryption + `age-keygen -y`) | ✅ Already discharged. Date is session-sequence, not artifact-read. |
| 3 — restore against **non-empty** data, verified by counts + spot-checked content | Phases B, C5, **E5** | 🔲 This task. **Two** verified restores: the hand-run object, and the live in-place one — and **E5 is conditional** on Phase E surviving its own go/no-go. ⚠️ D2 removed 2026-09-11. |
| 4 — the exact commands are recorded and **work today**; runbook corrected if not | Phases A3, A4, C4, **E2**, G1, **G1b** | 🔲 This task. **Three corrections anticipated** (network name, prefix, **the password-leaking live-recovery line**). |
| 5 — the nightly cron **fired** and produced an object | Phase D (§3) | 🔲 This task, against **this morning's** run. ⚠️ **Literal wording met; the stronger property is NOT** — that run dumped an **empty** DB, so schedule and data are proven **separately, never together**. Recorded as a residual, not a clean pass. |
| 6 — `0182`'s backup limitations reflect reality | Phase G2 | 🔲 **Drafted by me, applied by a producer (Q6)**, conditional on a green drill. |
| 7 — no values anywhere | Every phase | 🔒 Enforced by construction: secrets are only ever referenced through `backup.env` variables inside subshells — and, after E2, **not even in the live-restore command**. |

**Beyond the brief's criteria, and deliberately so:** **Phase E** discharges nothing the brief asks
for. It exists because the owner approved it (Q5) and because the window closes at `0217`. If it is
declined at E1 or E2, **every brief criterion above is still fully met** — record it as a decision,
not a gap.

---

## 11. Things I could NOT verify from the repository

Stated as gaps, not guesses. Each one is a place this plan could be wrong.

1. **The compose network name on the box.** Inferred as `profile_default` from
   `setup-profile.sh:400/:450` (no `COMPOSE_PROJECT_NAME`, no `-p`, no `networks:` block, project
   dir `/opt/profile`). The runbook says `opt_profile_default`. **A3 settles it.**
2. **The deployed `PROFILE_BACKUP_S3_PREFIX`.** The script defaults to `profiles`
   (`profile-backup.sh:96`) and the runbook hardcodes that literal, but the deploy could have set
   anything. **A4 settles it.**
3. **The deployed retention values.** Assumed defaults 14 / 56 (`profile-backup.sh:120-121`).
4. **Whether the nightly cron has ever fired since `0215`.** `0215` never read
   `last-backup.json` — B4 was answered from the **deploy smoke** marker instead. **A5 settles it.**
5. **Whether the drill day is a Sunday** (which triggers the ~56-day weekly copy). Calendar fact,
   not a repo fact — check on the day.
6. **Bucket versioning / lifecycle.** `0215` residual 6 records reg.ru exposed no such setting and
   left it **UNKNOWN**. This plan therefore assumes an overwritten daily object is **not**
   recoverable.
7. **Whether the box's schema matches `migrations/`.** `0215` confirmed all four migration files are
   recorded in `schema_migrations`, but no one has compared the live columns. B2 will surface a
   mismatch as a `42703`.
8. **Terminal / locale behaviour for the Cyrillic paste.** B2's encoding check exists precisely
   because I cannot verify this from here.
9. **`/var/log/syslog` vs `journalctl`.** Which one carries the `CRON` line depends on the box's
   logging setup. D1 tries both.
10. **The intra-day ordering of custody-storage vs the first smoke backup.** No timestamped artifact
    exists. §0.6 says exactly this and no more.
11. 🆕 **Whether the postgres container accepts a socket connection with `trust` auth as user
    `profile`.** The E2 mitigation depends on it. The evidence is strong but indirect:
    `profile-backup.sh:147` already does exactly this for `pg_dump` (no host, no password) and it
    works today, which is how the nightly backup runs at all. The official postgres image
    initialises `pg_hba.conf` with local/socket connections set to `trust`. **But I have not read
    that box's `pg_hba.conf`, so E2 pre-tests it read-only before anything destructive.**
12. 🆕 **The exact socket path libpq defaults to inside `postgres:16-alpine`.** Expected
    `/var/run/postgresql`. If the empty-host URL fails to find the socket, appending
    `?host=/var/run/postgresql` is the fix and **does not change the guard's parse** — it still
    yields an empty host and still takes the `PROFILE_RESTORE_CONFIRM_LIVE` branch.

---

## 12. Open decisions — all six questions RULED; one conditional residual remains

**Q1 ⛔ REVERSED 2026-09-11** — D2 removed (§3), knowingly. **Q2 ✅** cleanup as soon as evidence is
captured (F1/F2 split). **Q3 ✅** correct the
runbook and re-run in the same session, failing lines recorded verbatim first. **Q4 ✅** Sunday
weekly copy accepted, no action. **Q5 ✅ APPROVED** with two conditions (§7). **Q6 ✅** I draft,
a producer applies — I edit nothing under `done/`.

### 🔴 Two things still open

**R0 — plan approval itself.** The owner asked for a plain-terms explanation rather than approving.
**Phase A is released (read-only). Phases B onward are held.** ⚠️ **Phase D (§3) is read-only but was
written after the Phase A release — confirm before running it**, since it now sits second in the
order.

### R1 — conditional

**R1 — the Phase E credential residual, IF E2's socket pre-test fails.**

The owner's Q5 reasoning covers the **data** hazard only. The **credential** hazard is untouched by
it. §7 E2 designs a mitigation that removes the credential from the command entirely, and pre-tests
it read-only. **If that pre-test passes, R1 never arises and nothing needs deciding.**

**If it fails**, Phase E stops and the choice comes back to the lead as an explicit
accept-or-decline: **(a)** decline Phase E — the live-recovery branch stays unrehearsed and the free
window closes at `0217`; **(b)** accept the password in shell history and argv, then rotate
`POSTGRES_PASSWORD` — which means destroying the Postgres volume plus a full redeploy, free of data
loss today but not free; **(c)** ⛔ rejected — a hand-written `.pgpass` inside the container is a box
change outside the deploy path and would be lost on the next recreate.

⛔ **Neither running it silently on the password-bearing URL nor quietly dropping Phase E is an
acceptable outcome.** Whichever way it goes, G7 records it as a decision.

### ⚠️ One flag on the rulings themselves

I agree with the lead's shape resolution for Q5 and think it improves on my original sketch (see §7,
*"the ordering is not an accident"*). **The only thing I would not want lost:** the owner said *"we
can test it whatever we want"* about the **profile server**, and E1 turns that sentence into an
actual check rather than a standing permission. If E1 shows real rows or a wired game server, the
sentence is no longer true and **the ruling does not carry forward** — Phase E stops. That reading is
built into E1's failure branch; recording it here so it is not softened later.
