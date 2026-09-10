# `0215` — worklog

> 🔒 **Rule for this whole file** (`brief.md` note 4, `plan.md` Step 31): no secret values, no
> lengths, no IPs, no hostnames, no bucket names, no endpoints, no object keys. Everything below
> records **presence and correctness**, never contents.

> 📌 **Citation frame.** On 2026-09-10 the **`0182`-runbook citations in this file only** were re-derived by content, against commit `589249c` **plus that same citation sweep** — ⚠️ the sweep ADDED lines to `0182`'s brief, so `0182` numbers here are POST-sweep and will not match a bare `589249c` checkout. ⚠️ **Every OTHER `file:line` in this worklog is unframed and unverified** — re-derive before acting on one. See [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

---

## 2026-09-09/10 — ADOPT: the existing profile box was re-provisioned in place

**Everything on the box and in the reg.ru console was executed BY THE OWNER, by hand, guided
step-by-step through `plan.md`.** No agent touched the box, ran a deploy, or held a secret. Where a
fact below is marked *lead-verified*, the lead checked it independently of the deploy's own banner
(`/health`, `/ready`, the certificate, the backup object in the new bucket). Everything else is
**owner-executed and lead-read** — the lead read the command output the owner pasted back. Nothing
is committed by this task, and no source file was changed.

### 🔴 PREMISE CHANGE — read this before the table

**`brief.md`'s title and scope say "inspect, THEN wipe and re-provision in place."** That is **not
what happened.**

A read-only inventory (2026-09-08) found the box **already LIVE and HEALTHY**. On that evidence the
**owner ruled ADOPT** (2026-09-08/09, given live in session): keep the box and its state, re-provision
over it, **do not wipe**.

**NO WIPE WAS PERFORMED.** The single destructive act in this entire task was **Step 14 Branch C** —
destroying the Postgres data volume so `POSTGRES_PASSWORD` could be rotated at initdb — and the owner
ruled that branch **explicitly**, after the zero-row check below.

---

## B1–B9 — the brief's inspection table, filled in

🔒 Values that are secrets or identifiers are recorded as *present and correct*, never quoted.

✅ **All nine rows are now filled in.** B5, B6 and B7 were captured on the box **post-deploy,
2026-09-10** — a second pass, after this worklog was first written with those three rows UNKNOWN.
**B4's historical half remains UNKNOWN and is answered forward instead** (see its row), and **B6
carries a stated limit** about the default policy. Nothing here is guessed: where a reading was not
taken, it says so.

| # | Field | Value, dated |
|---|---|---|
| **B1** | Deploy role marker — *is this even the profile box?* | ✅ **Role marker present and correct** — read 2026-09-08 (read-only inventory) and **re-confirmed by the owner before the only destructive step**, 2026-09-09. Value not recorded (identifier). |
| **B2** | Is the stack directory there | ✅ **Present and populated** — `/opt/profile/` existed with a live stack, 2026-09-08. Post-deploy it also carries `backup.env` (0600) and `backup.sh` (0700), verified 2026-09-09/10. |
| **B3** | Containers running / healthy | ✅ **Running and healthy at inventory** (2026-09-08) — this is the finding that produced the ADOPT ruling. ✅ **Both compose services healthy after the deploy**, verified on the box 2026-09-09/10. |
| **B4** | Has a backup ever completed, and when | ⚠️ **UNKNOWN as of the inventory** — `last-backup.json` was not read/relayed on 2026-09-08. ✅ **Answered forward instead, 2026-09-09/10:** `last-smokecheck.json` records `"exit_status": 0`, and an encrypted daily object of **19 330 bytes** was **lead-verified** present in the new bucket via `rclone` (name not recorded). So a backup demonstrably completes **now**; the historical answer stays UNKNOWN and no longer matters — the old bucket is gone. |
| **B5** | Swap configured | ✅ **Active and correctly tuned** — read on the box **2026-09-10**, post-deploy. `swapon --show`: **`/swapfile`, type `file`, size `4G`, used 12.5M, prio -1**. `sysctl vm.swappiness` → **`10`**, the value `setup-profile.sh` intends. |
| **B6** | Firewall posture | ✅ **`ufw` active; the allowed set is exactly 22/80/443** — read on the box **2026-09-10**, post-deploy. `ufw status` → `Status: active`, allowing **22/tcp, 80/tcp, 443/tcp** from Anywhere plus the same three for v6, **and nothing else listed**. ⚠️ **Limit, stated deliberately:** plain `ufw status` (unlike `ufw status verbose`) **does not restate the default policy**, so **default-deny-incoming is NOT freshly verified today** — it was reported by the pre-deploy inventory and is recorded here as carried forward, not re-checked. The **allowed set** is what was observed. |
| **B7** | Actual spec vs the 2 vCPU / 4 GB / 60 GB floor | ✅ **Compared, 2026-09-10, post-deploy — MEETS the floor on all three axes; no resize was needed and none was done.** `nproc` → **2** (floor 2 vCPU, **meets**). `free -h` → Mem total **3.8Gi** (floor 4 GB — **meets**: 3.8Gi is the usual reported figure for a 4 GB box after firmware/kernel reservation), used 1.0Gi, available 2.8Gi; Swap total **4.0Gi**, used 12Mi. `df -h /` → `/dev/sda4`, size **58G**, used 15G, avail 43G, **26%** (floor 60 GB — **meets**, 58G being the usual formatted figure for a 60 GB disk). ℹ️ Disk was **22 %** at the pre-deploy inventory and is **26 %** now: the delta is **the newly pulled image layers**, not a leak. |
| **B8** | DB schema version — is `004_name_change.sql` applied? | ✅ **YES — all FOUR migrations recorded**, read on the box 2026-09-09/10: `001_player_profiles.sql`, `002_yandex_payments.sql`, `003_player_messages.sql`, `004_name_change.sql`. This settles the `0067` question the brief raised: after the Branch C rebuild the schema is complete, applied fresh in one pass. |
| **B9** | What objects the OLD S3 bucket holds | ✅ **Moot — the old bucket no longer exists.** The **owner deleted it** before this task's storage work; a brand-new clean bucket was created for the new path (owner ruling 2026-09-08). Its objects were, and remain, **unreadable** — no `age` private identity for them can be named. **This task deleted nothing itself and decided nothing about the old bucket**; disposition was `0222`, whose subject is now largely gone. |

**B1 was confirmed before any destructive step** (`brief.md` verification item 2): the role marker was
read at inventory on 2026-09-08 and re-read by the owner immediately before Step 14 Branch C on
2026-09-09. Under ADOPT, **Branch C was the only destructive step available in the whole task.**

---

## The one destructive step — Step 14 Branch C (`POSTGRES_PASSWORD`)

**Branch chosen: C — rotate by destroying the Postgres data volume and letting `initdb` apply the new
password.** Owner-ruled explicitly. Reason: the owner asked for every regenerable secret to be
regenerated so no secret keeps an unknown provenance; the Postgres image applies `POSTGRES_PASSWORD`
**only at initdb**, so rotation is free at zero rows and expensive forever after. The window in which
it was free was exactly now.

**The zero-row assumption was re-verified AT EXECUTION TIME**, not trusted from the 2026-09-08
inventory (`plan.md` UNKNOWN 6 required this). All four tables read **0 rows** immediately before the
volume was destroyed, 2026-09-09:

| Table | Rows at execution time |
|---|---|
| `player_profiles` | **0** |
| `player_match_xp_credits` | **0** |
| `player_name_history` | **0** |
| `player_cosmetic_ownership` | **0** |

**Trap T11 was real and was defeated in the right order.** The `profile` systemd unit carries
`Restart=always` / `RestartSec=15` (`setup-profile.sh:759-776`), which would have silently restarted
the stack and undone the wipe. Sequence actually executed: **stop the systemd unit FIRST** →
`docker compose down -v` → `docker volume ls` confirming **no profile volume remained**. T11 is
documented **nowhere in `0182`** — see *What the runbook got wrong*.

---

## The deploy — first attempt FAILED, before the box was ever contacted

`npm run deploy:profile`.

**Attempt 1 — FAILED at the local image build.** The `node:24-slim` metadata fetch returned **EOF from
`registry-1.docker.io`**.

🔴 **The failure happened BEFORE ANY SSH. The box was never contacted, so there was no partial state
on it and nothing to roll back.** This matters more than the failure itself.

Diagnosed as transient, not as a configuration fault, before retrying:

- `curl` to `auth.docker.io` → **200**.
- `registry-1.docker.io/v2/` → **401**, the normal unauthenticated response.
- **No VPN connected.**
- **No registry mirrors configured.**

`docker pull node:24-slim` then succeeded on its own, and **attempt 2 passed end to end.**

⚠️ **Expected outage, recorded so it is not mistaken for a fault:** the deploy briefly took the public
API down — `setup-profile.sh` stops nginx **unconditionally** before certbot. Nothing consumes the API
yet (`0217` is the consumer and is not wired), so the window cost nothing.

### The certificate was PRESERVED — no rate-limit spend

**Lead-verified, independently of the deploy banner:**

| Fact | Value |
|---|---|
| Issuer | **Let's Encrypt YE2** |
| `notBefore` | **2026-08-22** |
| `notAfter` | **2026-11-20** |
| Before vs after the deploy | **Byte-identical** |

`setup-profile.sh`'s `--keep-until-expiring` made re-issuance a **no-op**. **No rate-limit was spent
against the main domain's shared limit** — which was the material risk of re-running the deploy
against a live box.

---

## Verification

### Lead-verified, independently of the deploy's own claims

| Check | Result |
|---|---|
| `/health` over a **valid** LE certificate (no `-k`) | **200**, body `{"status":"ok"}` — status **and** body, per `brief.md` items 3 and 4 |
| `/ready` (`src/profile-server/Routes.ts:198-207`) | **200**, body `{"status":"ready"}` — **DB-backed**, so this proves the API authenticated to Postgres with the **NEW** password against the **fresh** volume |
| Certificate dates | Unchanged across the deploy (table above) |
| Backup object present in the **new** bucket | **Yes** — one encrypted daily object, **19 330 bytes**, listed via `rclone`. 🔒 Bucket and object name not recorded |

### Owner-executed on the box, read by the lead

| Check | Result |
|---|---|
| Both compose services | **Healthy** |
| `profile-api` image pinning | **Digest-pinned** — the image line carries `@sha256:` |
| Migrations recorded | **Four** — `001`, `002`, `003`, `004` (see B8) |
| `/etc/cron.d/profile-backups` | Header reads **`Mode: offbox`** — i.e. the real off-box path, not the local skeleton |
| `backup.env` / `backup.sh` permissions | **0600** / **0700** |
| `last-smokecheck.json` | **`"exit_status": 0`** |
| Secret hygiene — `ps -ef` argv (`brief.md` item 6) | **No `postgres_password`, no `profile-deploy-env` path in any process argv** |
| Obsolete pepper file | **`/opt/profile/.id_pepper` removed** |

### Pre-flight checks that passed BEFORE the deploy

These are what made the deploy safe to attempt at all — `setup-profile.sh:889-908` fails the deploy
**closed** on incomplete backup config, and `build-deploy-profile.sh` does **not** validate the backup
variables locally (**T10**), so a bad value would otherwise surface only after a full build.

| Pre-flight | Result |
|---|---|
| `rclone` round-trip against the **new** bucket, using the box's exact configuration | ✅ `copyto` → `size --json` reporting `count:1` → `deletefile` — all three passed |
| `age` recipient round-trip with the real recipient | ✅ **`RECIPIENT OK`** |
| DNS | ✅ Resolves to the configured `PROFILE_SERVER_HOST` **exactly**. ⚠️ Recorded as one fact, not a health check — a record resolving proves nothing about a server running |
| SSH port 22 | ✅ Reachable |

---

## Secrets rotation — every regenerable secret is NEW

Per the owner's ruling: *"regenerate all the needed tokens from scratch."*
🔒 **No value, length, or fragment of any of these appears anywhere in this repo.**

| Secret | Disposition |
|---|---|
| **`age` keypair** | **NEW.** Generated on the owner's Mac, **outside the repo**, 2026-09-09. Custody below. |
| **`PROFILE_INTERNAL_TOKEN`** | **NEW, generated EXPLICITLY** with `openssl rand -hex 32`; verified 64 lowercase hex; stored in the owner's password manager for `0217`. **Not box-generated** — see the trap note below. |
| **S3 bucket** | **BRAND-NEW, CLEAN bucket**, created by the owner (owner ruling 2026-09-08). The **old bucket had already been deleted by the owner.** 🔒 Named nowhere. |
| **S3 access key** | **NEW** scoped key set, named `profile-backup`. A spare duplicate set was created by accident and **deleted** — see the reg.ru quirk below. |
| **`POSTGRES_PASSWORD`** | **NEW**, applied via a fresh `initdb` (Step 14 Branch C). |
| **`PROFILE_ID_PEPPER`** | **DELETED** from `.env.profile.secret`, and `/opt/profile/.id_pepper` **removed from the box.** Obsolete since the hashing approach was abandoned (2026-06-27). |

**All SIX backup values were newly issued. None was carried over.** A **brand-new, clean S3 bucket**
was created, alongside newly-issued credentials and a newly-generated `age` keypair — **while the VPS
was reused in place.** (This is `brief.md` verification item 11 in its corrected form. The struck
2026-09-04 claim that *the bucket was reused* is **NOT** stated here, because stating it would record
a falsehood.)

### 🚨 `PROFILE_INTERNAL_TOKEN` — the runbook was deliberately NOT followed

`0182` **brief:175** and **brief:207** say the token may be *"left blank; the box auto-generates and
persists it"* — **both struck in `0182` itself.** `example.env.profile:92-93` says the same thing and
is **STILL UNSTRUCK at HEAD**.

**Neither was followed, and the reason is not stylistic.** `internalAuth` is a `timingSafeEqual` over
a **shared** secret (`src/profile-server/InternalAuth.ts:14-19`, `:26`). A token the **box** mints,
which the **game server** does not hold, is a **401 on every credit call**. The client is fail-soft
with **no durable queue** (ADR-101), and nothing logs above `debug` ⇒ **the XP is LOST, not queued,
and silently.** The token was therefore generated once, explicitly, and recorded for `0217` so both
sides carry the same value.

### ⚠️ A prior stored copy of the internal token GENUINELY DID NOT MATCH the box's

Worth recording even though it is now moot. Before regeneration, the owner's password-manager entry
was tested against the box's persisted token and **did not match**. This was **exhaustively refuted as
a methodology artifact**: the file on the box has **no trailing newline**, so a raw-bytes reading and a
newline-stripped reading are **identical** — which is exactly the form the owner hashed. There is no
comparison error left to blame.

**Conclusion recorded as fact: the password-manager entry held a different secret than the box.**
Moot now that the token is regenerated and set from the environment, but it is a data point about
secret provenance on this box, and it is the kind of thing that is invisible later if nobody writes it
down.

---

## `age` key custody — `0218`'s acceptance gate

🔒 Locations and names only. No key material, no fingerprint, no value.

| Field | Record |
|---|---|
| Custodian | **Mark Dolbyrev** |
| Generated | **2026-09-09**, on the owner's Mac, outside the repo |
| Primary copy | **Telegram Saved Messages**, entry named *"Geoconflict profile backup age identity 2026-09"* |
| Second copy | **A second cloud messenger** |
| **Readability proven** | ✅ **2026-09-09** — see below |

### ✅ Custody was PROVEN, not assumed

The owner **decrypted a test file using the copy retrieved FROM STORAGE** — not from the original
generated file — and confirmed it by comparing `age-keygen -y` output against the original. **This
satisfies `0218`'s live-readability gate.** ⚠️ The date **2026-09-09** is taken from the session
sequence (Phase B ran the same day the keypair was generated); it is not read from a timestamped
artifact.

### 🚨 The custody weakness, recorded honestly

**`plan.md` Step 7 asked for an OFFLINE second copy. What exists is a SECOND CLOUD COPY.** This
records what **is**, not what was asked for.

- **Neither store is zero-knowledge.**
- **Both may share a phone-number recovery path**, so **the two copies may not be two independent
  failure modes** — a single account compromise or a single recovery-path takeover could plausibly
  reach both.

**The owner was shown this and chose it deliberately.** It is a knowingly accepted residual, not an
oversight — but it is a residual, and `0218` should treat the "two copies" as weaker than the count
suggests.

---

## 🚨 Residuals — the things a future reader actually needs

1. **🔴 `/opt/profile/.internal_token` now holds a STALE, SUPERSEDED token.**
   Because the environment value **wins** (`setup-profile.sh:358-359`), the persisted file was
   **never rewritten**. Harmless **only while** `.env.profile.secret` carries the real value.
   **A future deploy with a BLANK value would silently fall back to the stale file**
   (`setup-profile.sh:360-362`) and **re-break crediting in exactly the silent, XP-losing way described
   above.** ➡️ **FLAGGED TO `0220`** (secret persistence and value parity).

2. **🔴 `example.env.profile:92-93` is STILL WRONG at HEAD** (`4c981e5`; the plan cited `cd3d583`, and
   it is unchanged between them). It still tells the reader the token is *"auto-generated on the box
   if left blank"* — a **live documentation defect** that walks the next operator straight into the
   trap. **Already handed to a coder. NOT fixed here, by instruction.**

3. **🔴 The `/internal/` nginx allowlist is still the June game-prod egress IP.** If that IP is stale,
   **every credit call gets a silent 403** — a **second barrier standing behind the 401**, so fixing
   only the token would not be enough. The deploy laid the allowlist down **dormant**. **`0217` owns
   verifying it.** 🔒 No IP recorded here.

4. **🔴 THE RESTORE PATH HAS NEVER BEEN TESTED. Say it plainly: "backups are working" means
   ENCRYPT-AND-UPLOAD ONLY.** An encrypted object is produced and lands in the new bucket — proven.
   **Nobody has ever proven one restores.** The old bucket is gone and its objects were unreadable, so
   there is no historical restore to fall back on either. **`0218` owns this and it is OPEN.** Until
   it closes, **this box has no proven recovery path** — acceptable at zero rows, and it **must not
   still be true when the first real citizen row is written.**

5. **reg.ru console quirk — access keys.** The access-key list **does not refresh** after a key set is
   created, and the create form then **rejects a duplicate name for a set the list is not showing**.
   **Two sets were created before this was understood**; the spare was deleted. Recorded so the next
   person does not repeat it.

6. **reg.ru exposed no versioning or lifecycle setting** for the bucket (`plan.md` Step 10 / UNKNOWN
   5). Recorded as **UNKNOWN — not assumed either way.** It is a cost/retention risk, not a deploy
   blocker.

7. **Plan correction — reg.ru access keys ARE viewable after creation** (the console says so). The
   plan's *"the secret is shown once"* warning **did not apply**.

---

## What the runbook got wrong (`brief.md` step 9)

`brief.md` told us to assume at least one more `0182` line had drifted. Confirmed:

| Drift | Status |
|---|---|
| **The `:136-137` citation is STALE, and it is the most-copied citation in this task.** `0182` brief:136-137 is cited as the token trap by `0215`'s own `brief.md`, by `0218` brief:149 and by the project memory. Those two lines are actually a section header and a blank line. The real text is at **`0182` brief:175 and :207.** | **Confirmed.** Everywhere `:136-137` appears should be **re-derived by content**, not by line number. 📌 **SWEPT AND CLOSED 2026-09-10 (0182 numbers below are POST-sweep)**, with two corrections to the finding as written: **(a)** the *"`0218` brief:149 and the project memory"* half was **wrong** — `0218`'s brief never carried a `:136-137` citation and the auto-memory carries **no line number at all**; the real set was `0213`, `0217`, `0215`'s own `brief.md`, `plan-sprint-4.md` and the 2026-09-04 survey; **(b)** it was **not merely stale — it was wrong from birth**: commit `879b2f4` (2026-09-04) wrote the citation and inserted the correction banner that displaced it **in the same commit**, so it never pointed at the text in any commit where the citing sentence existed. **Failure mode 4** of `ai-agents/knowledge-base/conventions/file-line-citations.md`. |
| **T11 — the `Restart=always` systemd unit silently undoing a `docker compose down -v`** (`setup-profile.sh:759-776`). | **Confirmed real and load-bearing** — it was defeated by stopping the unit first. **Documented nowhere in `0182`.** |
| **The stale-`.internal_token` fallback** (`setup-profile.sh:358-368`) — supplying the token via the environment leaves a stale persisted value a later blank-valued deploy would silently re-adopt. | **Confirmed** (residual 1). **Documented nowhere in `0182`.** |
| `0182` brief:293-297 — *"backups are local + weekly"* | Already struck and superseded in place. **Nothing further in that section was found drifted**, but this was a light check, not an audit. |

---

## ✅ RU data residency (`brief.md` verification item 7) — **VERIFIED 2026-09-10**

**Verified by the lead, from the lead's machine, by IP geolocation on the box's public IP.** 🔒 The
address itself is **not recorded** — the operator and the country are the load-bearing facts.

**The box's public IP geolocates to Moscow, RU; ASN and reverse DNS both attribute it to reg.ru.**

What makes this a verification rather than one vendor's guess is that **three independent signals
corroborate each other**:

| Signal | What it said |
|---|---|
| **Geolocation database** (`ipinfo.io`) | country **RU**, city/region **Moscow / Moscow**, timezone **Europe/Moscow** |
| **ASN ownership** | **AS197695 — Domain names registrar REG.RU, Ltd** |
| **Reverse DNS** | resolves into **reg.ru's cloud-hosting domain** (full hostname deliberately not recorded) |

All three point independently at **reg.ru, Moscow**. This supersedes the carried-forward
2026-06-13 project record for this box, and it is **not** asserted from a script comment (the
`Hetzner` comments in `setup.sh` / `update.sh` remain stale and wrong).

### ⚠️ The limits of this evidence — stated, not dropped

1. **SINGLE PROVIDER.** Only **one** geolocation database was actually consulted. A second lookup
   (`ipapi.co`) was attempted and returned **RateLimited**, so it **neither confirmed nor
   contradicted** — it is not a second data point.
2. **This is registration/announcement, not a physical-site attestation.** Geolocation databases
   report where an IP is **registered / announced**, not where the metal physically sits. The ASN and
   reverse DNS corroborate **the operator and the advertised location**; **none of the three is proof
   of the physical site.** For 152-ФЗ purposes this is the normal standard of evidence — recorded as
   what it is, **not implied to be an audit**.
3. **`whois` still produced no output** from the lead's machine (not installed, or blocked
   outbound). That avenue **remained unavailable and was not the basis for this.**

---

## What is NOT filled in, and why

Recorded as gaps rather than papered over. **B5, B6, B7 and RU residency are no longer on this
list** — they were captured on 2026-09-10 and are recorded above. What remains:

### 🔴 1. `0216` — the RU network-reachability spike — **WAS NEVER RUN**

`brief.md`'s "What to build" step 2 said to run `0216` from the box. **It was not run.** `0216` is
**still 🔲 Backlog on the board** — this record does **not** mark it done.

**The deploy proceeded without it and succeeded.** That retroactively answers much of what the spike
existed to discover — and notably, **registry reachability was in fact the ONE thing that failed**
(transiently, on the first deploy attempt; see the deploy section), which is squarely inside the
spike's subject.

⚠️ **Whether `0216` is now moot or still carries value is the PRODUCER'S call.** It is not the coder's
and not the lead's. **No recommendation to cancel it is made here**, and none should be read into the
paragraph above.

### 2. B4's historical half is UNKNOWN

See the table. Answered forward (a backup demonstrably completes now), not backward.

### `brief.md` verification items — where they stand

| Item | Status |
|---|---|
| 1 — B1–B9 filled in, dated | ✅ **Satisfied** (B4 historical half explicitly UNKNOWN; B6 carries a stated limit) |
| 2 — B1 confirmed before any destructive step | ✅ Satisfied |
| 3 / 4 — `/health` 200 over a valid cert, expected body | ✅ Satisfied, lead-verified |
| 5 — swap, `vm.swappiness=10`, `ufw` 22/80/443 default-deny, both services healthy, `@sha256` pin | ✅ **Satisfied except the `ufw` DEFAULT POLICY**, which plain `ufw status` does not restate — carried forward from the pre-deploy inventory, not re-checked today (B6) |
| 6 — secret-hygiene argv spot check | ✅ Satisfied |
| 7 — box geolocates to RU | ✅ **Satisfied 2026-09-10** — three corroborating signals (geolocation DB, ASN, reverse DNS), all reg.ru Moscow. ⚠️ Single provider; registration/announcement evidence, not a physical-site attestation |
| 8 — B7 compared against the 2 vCPU / 4 GB / 60 GB floor | ✅ **Satisfied 2026-09-10** — compared on all three axes, **meets the floor**, no resize done or needed |
| 9 — `schema_migrations` contains `004_name_change.sql` | ✅ Satisfied |
| 10 — token generated explicitly, `0182` not followed, reason stated | ✅ Satisfied |
| 11 — all six backup values newly issued, new clean bucket, VPS reused | ✅ Satisfied, in the corrected wording |
| 12 — `/ready` responds | ✅ Satisfied, lead-verified |
| 13 — no value appears anywhere | ✅ Satisfied |

---

## Change surface

**One file: this worklog.** No source file, no script, no config, no brief, no plan, no task-file
move, no commit. `src/` untouched. The box, the bucket and the console were changed **by the owner**,
by hand, outside this repo.
