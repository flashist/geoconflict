# 0215 — Implementation plan: ADOPT the existing profile box and re-provision it in place

**Citations against commit `cd3d583`.** Every `file:line` below was re-derived by opening the file at
that commit, per
[`ai-agents/knowledge-base/conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).
Re-verify before acting on one; do not shift a number by arithmetic.

**Status of this document:** first plan.md for `0215`. No prior plan.md existed in this folder, so
nothing is superseded here. It **does** supersede the brief's *"inspect, THEN wipe"* premise — see
the banner below.

---

## 🔴 PREMISE CHANGE — READ FIRST

`brief.md` is written as *"inspect the box, then wipe and re-provision."* **That premise is
superseded.**

A read-only inventory on **2026-09-08/09** found the box **already live and healthy**, and the owner
ruled **ADOPT**: keep the VPS, keep its settings, re-run `setup-profile.sh` in place, re-create the
keys. **There is no wipe step in this plan** (with one narrow, owner-gated exception — the Postgres
volume, Step 14 Branch C).

What the inventory established (relayed live in session; **it is not written to a file in this
repo**, so it has no citation of its own and its findings are trusted, not verified by me):

| Fact | Consequence for this plan |
|---|---|
| `/health` returns 200 `{"status":"ok"}` over a valid Let's Encrypt cert | The box is serving. `/` returning 404 is Express's "Cannot GET /", not a routing gap. |
| Both containers Up 5 weeks, healthy, loopback-bound | Nothing to build; only to re-provision. |
| `ufw` active, deny-in, only 22/80/443; swap 4 GiB, swappiness 10, zero OOM; disk 22% used | The `0182` §6 box-side acceptance items already pass. Step 24 re-checks them, it does not create them. |
| DB is the post-revert raw `yandex_player_id` shape; **migration `001` applied; every table has ZERO ROWS** | ⚠️ Migrations `002`, `003`, `004` are **NOT** applied. This deploy applies them for the first time (`setup-profile.sh:573` runs `npm run migrate` every deploy). That is expected, and it is what `brief.md`'s **B8** asked for. |
| LE cert valid to 2026-11-20, already auto-renewed once | Safe: `setup-profile.sh:687` passes `--keep-until-expiring`, a no-op on a fresh cert (`setup-profile.sh:673`). |
| On-box `setup-profile.sh` is ~47 KB (Jul 1); the repo copy is ~56 KB (Aug 28) | ~9 KB of newer hardening has never reached the box. **Re-running the deploy IS the re-provision.** |

**The two owner rulings this plan is built on, beyond ADOPT:** regenerate every *regenerable* secret
from scratch (to end provenance ambiguity), and create a **brand-new, clean** S3 bucket — the old
bucket has already been deleted by the owner.

---

## 🚨 THE TWO LISTS — read these before Step 1

### A. Values the OWNER must SEND BACK to the lead

These are **not secrets**. Sending them lets the lead keep the worklog and unblock `0217`/`0218`.

| # | Value | Produced at |
|---|---|---|
| SB-1 | The **key-name list** printed by `scripts/list-secret-keys.sh` (names only, never values) | Step 3 |
| SB-2 | **Custody record** for the new `age` identity: custodian's name, vault name, entry name, second-copy location, date generated — and the dated confirmation that the custodian **opened it** | Steps 6–8 |
| SB-3 | Plain **"bucket created"** / **"access key created"** confirmations — no names, no values | Steps 9–11 |
| SB-4 | The **POSTGRES_PASSWORD branch chosen** (A, B or C) and why | Step 14 |
| SB-5 | Pre-deploy check **PASS/FAIL** (Steps 18–20), and the deploy's final banner **with any value lines redacted** | Steps 18–22 |
| SB-6 | Post-deploy verification results: HTTP codes, container health, the `schema_migrations` filename list, backup **mode**, cron **mode** line | Steps 23–29 |
| SB-7 | **"PROFILE_INTERNAL_TOKEN generated and stored"** — the fact only. `0217` needs the *value*, and it gets it from `.env.profile.secret` by the owner's own hand, never through the lead. | Step 12 |

### B. 🔒 SECRETS THE LEAD MUST NEVER SEE — and that go nowhere but a local gitignored file or a vault

Type these **only** into a local gitignored file or a password-manager entry, **by your own hand**.
Never into chat, a task file, a worklog, a commit message, a screenshot, or a shared terminal.

| Secret | Where it lives | Why it is on this list |
|---|---|---|
| The **`age` PRIVATE identity** | Password-manager vault + one second copy. **NEVER on the box.** | See **T7**, Step 5. |
| The **`age` RECIPIENT** (the `age1…` public key) | `.env.profile` only | `0218`'s brief:183-185 explicitly puts the recipient on the no-value list too. |
| **New S3 bucket name** | `.env.profile` only | `brief.md`'s verification item 11 says *"Name no bucket."* |
| **S3 endpoint + region** | `.env.profile` only | Task rule: no endpoints in any artifact. |
| **S3 access key + secret key** | `.env.profile.secret` only | Provider-issued credential. |
| **`PROFILE_INTERNAL_TOKEN`** | `.env.profile.secret` (and later the game server's prod env, `0217`) | Shared service secret. |
| **`POSTGRES_PASSWORD`** | `.env.profile.secret` + password manager | DB credential. |
| `YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN` | `.env.profile.secret` — **DO NOT TOUCH** | Externally issued; not ours to rotate. |

### C. ⚠️ IRREVERSIBLE STEPS — index (each is re-flagged in place, before its command)

| Step | What is irreversible |
|---|---|
| **10** | Turning bucket versioning **on** later cannot recover objects deleted while it was off. (Setting it off now is reversible; the data loss is not.) |
| **11** | The S3 **secret key is displayed once**. Lose it and the key must be re-created. |
| **14 Branch B** | `\password` changes the live DB role password immediately. Recoverable only by setting it again. |
| **14 Branch C** | `docker compose down -v` **DESTROYS the Postgres data volume permanently.** Free today only because every table has zero rows — and only if that is **re-verified at execution time**, not read off this document. |
| **22** | The deploy applies migrations `002`, `003`, `004` to the live DB. `migrate.ts` does not roll back. |

---

## Secrets inventory — what happens to each

| Secret | Class | Action in this task |
|---|---|---|
| `PROFILE_INTERNAL_TOKEN` | **REGENERATE** | New value, Step 12. Safe: `0217` has not wired the game server, so there is no live credit path to break. |
| `age` keypair (identity + recipient) | **REGENERATE** | New keypair, Steps 4–8, with custody recorded at creation (`0218`'s gate). |
| `PROFILE_BACKUP_S3_ACCESS_KEY` / `_SECRET_KEY` | **REGENERATE** | New scoped key on the new bucket, Step 11. |
| `PROFILE_BACKUP_S3_ENDPOINT` / `_BUCKET` / `_REGION` / `_PREFIX` | **NEW** (config, still secret-by-policy) | New bucket, Steps 9–10, 15. |
| `POSTGRES_PASSWORD` | 🔴 **GATED — owner decision, Step 14** | Three branches written out. **Do not assume either way.** |
| `YANDEX_PAYMENTS_SECRET` | **EXTERNAL — DO NOT TOUCH** | Yandex-issued; blocked on the IAP key. Leaving it blank is supported (`example.env.profile:99-102`). |
| `FEEDBACK_TELEGRAM_TOKEN` | **EXTERNAL — DO NOT TOUCH** | BotFather-issued; shared with the game server. |
| `DOCKER_TOKEN` | **REUSE** | Registry credential, shared with the game deploy. Not in scope to rotate. |
| `PROFILE_ID_PEPPER` (workstation) | **DELETE AS OBSOLETE** | Step 16. Verified unreferenced: a grep for `PROFILE_ID_PEPPER` across `src/`, `scripts/` and repo-root scripts at `cd3d583` returns **nothing**. |
| `/opt/profile/.id_pepper` (box) | **DELETE AS OBSOLETE** | Step 30. Same reason. |

---

# THE STEPS

Each step says **where it runs**, what to do, the exact command, what SUCCESS looks like, and what to
do on failure. Do them in order.

Location tags: **[MAC]** = the owner's Mac · **[REG.RU]** = the reg.ru web console ·
**[BOX]** = an SSH session to the profile box · **[DEPLOY]** = a command that changes the box.

---

## Phase A — Prepare the Mac

### Step 1 — [MAC] Confirm you are in the repo and the tree is clean

**Do:** open a terminal and check where you are.

```bash
cd /Users/mark.dolbyrev/Workspace/geoconflict && git status --short && git rev-parse --short HEAD
```

**SUCCESS:** no output from `git status --short` (or only files you know about), and a commit hash
prints.

**If it fails:** if there are unexpected modified files, stop and tell the lead what they are before
going further. Nothing in this plan requires a commit, and **nothing in this plan should ever be
committed** — the files it edits are all gitignored.

---

### Step 2 — [MAC] Install `age` and `rclone` locally

You need `age` to make the keypair (Step 4) and both tools for the cheap pre-deploy check (Step 18)
that stops a typo costing you a full image build.

```bash
brew install age rclone
age --version && rclone version | head -1
```

**SUCCESS:** both print a version.

**If it fails:** `brew update` first, then retry. If Homebrew is unavailable, tell the lead — Step 18
cannot run without these, and skipping Step 18 means a bad credential is only caught at Step 22 after
a full build and push (**T10**).

---

### Step 3 — [MAC] List the key NAMES already in the local profile env files

This shows you what is there without printing a single value. `scripts/list-secret-keys.sh` prints
key names only (`scripts/list-secret-keys.sh:2` — *"Print env-style key names from one or more files
without printing values."*).

```bash
bash scripts/list-secret-keys.sh .env.profile .env.profile.secret
```

**SUCCESS:** two `== file ==` blocks with bare key names.

**🚨 SEND BACK (SB-1):** paste this output to the lead. It is names only — safe.

**If it fails:** if a file is missing the script says `(missing)` and continues. A missing
`.env.profile.secret` is fine; you create it in Step 15.

---

## Phase B — New `age` keypair and its custody (`0218`'s acceptance gate)

> ### 🔴 TRAP T7 — read before Step 4
> **The `age` PRIVATE identity must NEVER reach the box.** Only the `age1…` **recipient** goes into
> config: `setup-profile.sh:869` writes `PROFILE_BACKUP_AGE_RECIPIENT` into the box's `backup.env`,
> and the backup encrypts with `age -r "$PROFILE_BACKUP_AGE_RECIPIENT"`
> (`profile-backup.sh:154`). The private identity appears **only** in the restore path, as a
> caller-supplied file (`profile-backup.sh:198` — *"the OFF-BOX age private identity … NEVER stored
> on the box"*).
>
> **A lost private key breaks NOTHING VISIBLE.** Backups keep succeeding, the marker keeps saying
> `exit_status: 0`, and nothing anywhere complains. It surfaces only at restore — which is exactly
> how the old bucket became unreadable. **That is why custody is recorded at creation, not later.**

### Step 4 — [MAC] Generate the new `age` keypair, OUTSIDE the repo

Write it to your home directory, not the repo, so it cannot be committed even by accident.

```bash
umask 077
age-keygen -o ~/profile-backup-identity-2026-09.txt
```

**SUCCESS:** the command prints `Public key: age1…` to the terminal. The file now holds the private
identity.

Backstop, not a substitute for keeping it out of the repo: `.gitignore:12` (`*identity*.txt`) and
`.gitignore:13` (`profile-backup-identity.txt`) would catch a copy placed in the repo root.

**🔒 SECRET:** both the file and the `age1…` line are on the never-send list.

**If it fails:** `age-keygen: command not found` → redo Step 2. A file-exists error → pick a
different filename; do **not** overwrite an existing identity file without knowing what it is.

---

### Step 5 — [MAC] Copy the public recipient somewhere you can paste it later

You need the `age1…` line in Step 15. Read it back from the file rather than re-typing it.

```bash
grep '^# public key:' ~/profile-backup-identity-2026-09.txt
```

**SUCCESS:** one line ending in the `age1…` recipient.

**If it fails:** the header comment format may differ by `age` version. Fallback:
`age-keygen -y ~/profile-backup-identity-2026-09.txt` re-derives the public key from the private one.

---

### Step 6 — [OWNER ACTION] Store the private identity in a named vault entry

**This is an owner decision an agent cannot make** (`0218` brief:189-190).

**Do:** put the **contents** of `~/profile-backup-identity-2026-09.txt` into your password manager as
its own entry. Decide and write down, per `0218` brief:132-135:

- **who** holds it — a named person, not "the team";
- **where** it lives — a named vault and a named entry, not "the password manager";
- **where the second copy is** — a *different* location, with its own custodian if different;
- **the date** it was generated.

**SUCCESS:** the entry exists and you can name the vault and the entry.

**🚨 SEND BACK (SB-2):** custodian name, vault name, entry name, second-copy location, date.
🔒 **Never the value** — `0218/brief.md:170` (read against `589249c` + the 2026-09-10 sweep; that line holds
*"🔒 **Record the LOCATION, never the value.**"*).
📌 *Citation corrected 2026-09-10: this read `0218 brief:136-137`, which was **wrong at this
document's own declared frame `cd3d583`** — there those lines are a blank line and
`## Verification steps`.*

**If you cannot decide the custodian right now:** STOP here and tell the lead. `0218/brief.md:231`
says this is due **before the first backup runs**, not at the end of the phase (read against
`589249c`; the acceptance criterion itself is `0218/brief.md:121`).
📌 *Citation corrected 2026-09-10: this read `0218 brief:193`, which was **wrong at this document's own
declared frame `cd3d583`**.*
⏱️ **And the first backup runs inside Step 22's deploy (T2)** — proceeding without the custody record
recreates the exact defect `0218` exists to fix.

---

### Step 7 — [OWNER ACTION] Make the second copy

A single vault entry is one copy. `0218` brief:134 requires a second, in a different location.

**SUCCESS:** two copies exist, in two places, and you can name both.

**If it fails / you are unsure what qualifies:** ask the lead rather than guessing. "Also on my
laptop" in the same directory as the original is not a second location.

---

### Step 8 — [OWNER ACTION] Prove the custodian can actually OPEN it

`0218` brief:138-139 and brief:174 require a **live check**, dated — *"It should be in the vault"* is
exactly the state that produced that task.

**Do:** the named custodian opens the vault entry, copies the identity out to a temp file, and
decrypts something with it.

```bash
umask 077
printf 'custody readability check %s\n' "$(date -u +%F)" > /tmp/agecheck.txt
age -r "<PASTE-THE-age1…-RECIPIENT>" -o /tmp/agecheck.age /tmp/agecheck.txt
# now paste the identity from the VAULT (not from ~/…) into /tmp/agecheck-identity.txt, then:
age -d -i /tmp/agecheck-identity.txt /tmp/agecheck.age
rm -f /tmp/agecheck.txt /tmp/agecheck.age /tmp/agecheck-identity.txt
```

**SUCCESS:** the `age -d` line prints back `custody readability check <today's date>`.

**🚨 SEND BACK (part of SB-2):** "custodian opened the vault entry and decrypted successfully on
<date>". 🔒 Not the identity, not the recipient.

**If it fails:** `no identity matched any of the recipients` means the vault copy is **not** the key
you generated. Do not proceed — re-store it from `~/profile-backup-identity-2026-09.txt` and redo
Step 8. This failure caught now is worth the whole step.

---

## Phase C — reg.ru web console: the new bucket and its key

> ### 🔴 TRAP T3 — the bucket must EXIST before the deploy
> No production script creates it. `profile-backup.sh` only ever writes **into** a bucket
> (`profile-backup.sh:161`, `rclone copyto … "profiles:${PROFILE_BACKUP_S3_BUCKET}/${daily_key}"`),
> and `setup-profile.sh` only writes the credentials into `backup.env`
> (`setup-profile.sh:867`, `setup-profile.sh:875-878`). The only script in the repo that creates a
> bucket is the test harness `tests/profile-backup-dryrun.sh`, which never runs against production.
> **If the bucket does not exist, Step 22 fails at the smoke check.**

### Step 9 — [REG.RU] Create the new, clean bucket

**Do:** in the reg.ru Object Storage console, on the same account, create a **new private** bucket.

> ### 🔴 TRAP T4 — the bucket name must contain no `/`
> The name is interpolated straight into an rclone remote path:
> `profile-backup.sh:97` builds `REMOTE_BASE="profiles:${PROFILE_BACKUP_S3_BUCKET}/${S3_PREFIX}"`,
> and `profile-backup.sh:161` builds
> `"profiles:${PROFILE_BACKUP_S3_BUCKET}/${daily_key}"`. A `/` in the name silently re-splits the
> path.
> **Use lowercase letters, digits and hyphens only.** No slash, no space, no uppercase, no dot.

**SUCCESS:** the bucket exists in the console and is **private** (not public-read).

**🚨 SEND BACK (SB-3):** the words "bucket created, private" — 🔒 **never the name.**

**If it fails:** a name-taken error means picking another name; bucket names may be globally unique
on the provider. A permissions error means the account cannot create buckets — stop and tell the
lead.

---

### Step 10 — [REG.RU] Set versioning OFF and confirm no short lifecycle rule

> ### ⚠️ TRAP T5 — **this is inference about S3 semantics, not a fact read out of this repo.**
> Nothing in the repo asserts it; label it as reasoning when you record it.
>
> The backup prunes with `rclone delete --min-age` (`profile-backup.sh:183-184`). On a
> **versioned** bucket, an S3 delete typically writes a delete-marker and keeps the old versions —
> so the prune would not actually reclaim storage, and you would pay for every daily dump forever.
> And a **provider lifecycle rule shorter than the script's retention** would delete objects the
> script still believes it is keeping, silently shortening your recovery window.

**Do:** in the bucket's settings, confirm **versioning is OFF**, and that there is **no lifecycle /
expiration rule shorter than 56 days** (the script keeps 14 days of daily and 56 days of weekly —
`example.env.profile:83-84`).

**⚠️ IRREVERSIBLE (in effect):** objects deleted while versioning is off cannot be recovered by
turning versioning on afterwards.

**SUCCESS:** versioning off; no lifecycle rule, or only a rule ≥ 56 days.

**If the console does not expose either setting:** write **UNKNOWN** in the worklog and tell the
lead. Do not guess. The deploy will still work; the risk is a slow-burning cost or retention
surprise, not a failure today.

---

### Step 11 — [REG.RU] Create a NEW access key, scoped to this bucket

**Do:** create a fresh access key / secret key pair. Scope it to the new bucket only if the console
offers scoping.

**⚠️ IRREVERSIBLE:** the **secret key is shown once**. Paste it straight into
`.env.profile.secret` in Step 15 — or into your password manager first — **before closing the
dialog.**

**⛔ DO NOT delete or revoke the OLD access key here.** Revoking it is [`0222`](../../backlog/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md)'s
job (its brief:151 and brief:200-201 — an overwritten local value is a **live credential** until it
is revoked at the provider). Doing it here mixes two tasks and loses the record.

**SUCCESS:** you hold a new access key id and secret key.

**🔒 SECRET:** both. **🚨 SEND BACK (SB-3):** "access key created" only.

**If it fails:** an account key limit may need an unused old key removed first — that is a `0222`
decision, so stop and ask the lead rather than deleting one now.

---

## Phase D — Fill the local env files

### Step 12 — [MAC] Generate `PROFILE_INTERNAL_TOKEN`

> ### 🔴 TRAP T1 — `example.env.profile` STILL LIES ABOUT THIS, and the lie is uncorrected
> `example.env.profile:92-93` reads:
> ```
> # PROFILE_INTERNAL_TOKEN= # service token shared with the game server (T6);
> #                         #   auto-generated on the box if left blank
> ```
> **That second line is WRONG.** A producer verified it and handed the fix to a coder; at `cd3d583`
> the file is still unfixed. Do not follow it.
>
> `0182`'s runbook carried the same original error, but there it is **struck and corrected in
> place** — the struck original is at `0182` brief:175 (*"Optional — leave blank; the box
> auto-generates and persists it."*, struck) and `0182` brief:207 (the same sentence quoted inside
> the `.env.profile.secret` code block); the correction banner runs `0182` brief:172-198 and the
> corrected value line is `0182` brief:211 (`PROFILE_INTERNAL_TOKEN=<generate-once-set-identically-on-both-sides>`).
>
> ⚠️ **`0182` brief:136-137 — the line reference used by `0215`'s own `brief.md`, by `0218`
> brief:149 and by the project memory — is STALE at `cd3d583`.** Those two lines now hold
> `## 3. Confirm SSH access to the box` and a blank line. Re-derived above by content match, per the
> citation convention. Record this in the worklog (Step 31, item 9); do not propagate `:136-137`.
>
> 📌 **SWEPT AND CLOSED 2026-09-10 (0182 numbers below are POST-sweep) — two corrections to the finding above, kept in
> the open rather than edited away:**
> **(a)** The *"used by `0218` brief:149 and by the project memory"* half was **wrong**. `0218`'s brief
> has never carried a `:136-137` citation at any commit checked, and the project auto-memory carries
> **no line number at all**. The real propagation set was `0213`, `0217`, `0215`'s own `brief.md`,
> `plan-sprint-4.md` and the 2026-09-04 survey report — all corrected 2026-09-10.
> **(b)** `:136-137` was **not merely stale — it was wrong in every commit in which the citing
> sentence existed.** It was true of the runbook at `282655c`, but the same 2026-09-04 commit
> (`879b2f4`) that wrote the citation also inserted the correction banner above it, so the number
> shipped already pointing at the wrong lines. **Failure mode 4 of
> [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md)
> — wrong from birth, then carried faithfully forward.**
>
> **What actually happens if you leave it blank** — `setup-profile.sh:358-368`: an env value wins
> (`:358-359`); **else a persisted `/opt/profile/.internal_token` is reused** (`:360-362`); else a new
> one is minted with `openssl rand -hex 32` and persisted (`:363-367`).
>
> **Why that destroys XP:** `internalAuth` is a `timingSafeEqual` over a **shared** secret —
> `src/profile-server/InternalAuth.ts:14-19` (`tokensMatch`, the length guard + `timingSafeEqual`)
> and `src/profile-server/InternalAuth.ts:26` (`const expected = process.env.PROFILE_INTERNAL_TOKEN ?? ""`).
> A token the **box** holds and the **game server** does not is a **401 on every credit call**, the
> client is fail-soft with **no durable queue**, and nothing logs above `debug` ⇒ **the XP is LOST,
> not queued.**
>
> **On THIS box the failure is quieter still:** the box has been live five weeks, so
> `/opt/profile/.internal_token` very likely already exists. A blank value would not even mint a
> fresh token — it would silently **re-adopt the old box-minted one**, which is precisely the
> provenance ambiguity the owner asked to end.

**Do:**

```bash
openssl rand -hex 32
```

**SUCCESS:** a 64-character hex string prints. Paste it into `.env.profile.secret` in Step 15 and
**also** into your password manager — [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md)
needs the identical value on the game server.

**🔒 SECRET.** **🚨 SEND BACK (SB-7):** the fact that it was generated and stored — never the value.

**If it fails:** `openssl` is present on macOS by default; if it is missing, use
`head -c 32 /dev/urandom | xxd -p -c 64`.

---

### Step 13 — [MAC] Note the second silent barrier, and do nothing about it here

> ### 🔴 TRAP T8 — a stale `/internal/` allowlist is a SECOND silent 403 on the same path
> `example.env.profile:33` pins `PROFILE_INTERNAL_ALLOW_IPS` to the **June** game-prod egress IP
> (`91.197.98.116` — already in the repo record, so naming it here adds nothing new). nginx enforces
> it as `allow …; deny all;` at `setup-profile.sh:719-720` (`location /internal/ {` and the
> `${ALLOW_DIRECTIVES}        deny all;` line). If that IP has changed, **every credit call gets 403**
> — swallowed exactly as quietly as the 401 in T1, and **one does not reveal the other.**
>
> **This is NOT this task's job to fix** —
> [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) owns the game-server half and
> the allowlist value. It is written here so nobody is surprised later, and so `0217` starts by
> checking it rather than trusting it.

**Do:** leave `PROFILE_INTERNAL_ALLOW_IPS` at its current value in `.env.profile`. Write one line in
the worklog: *"allowlist left at its existing value; freshness is `0217`'s to verify."*

**SUCCESS:** nothing changed, and the fact is recorded.

---

### Step 14 — 🔴 GATED ON AN OWNER DECISION: `POSTGRES_PASSWORD`

**This step cannot proceed until the owner picks a branch. Do not assume either way.**

**The situation.** `POSTGRES_PASSWORD` is consumed two ways. The Postgres image applies it **only at
initdb** — so the value in `.env.profile.secret` has no effect on a database that already exists. It
is also written into `/opt/profile/profile.env` (`setup-profile.sh:387`) and used to build
`DATABASE_URL` (`setup-profile.sh:378`) that the API authenticates with. So changing the file alone
gives you a **new URL against an unchanged role** — the API stops being able to log in.

**Every table has zero rows today.** That is what makes a full rotation free right now, and expensive
later once real citizens exist (it would then need a dump-and-restore).

Pick exactly one:

#### Branch A — KEEP the existing password (no action)

**Do:** leave `POSTGRES_PASSWORD` in `.env.profile.secret` untouched.
**Cost:** the one secret whose provenance stays ambiguous — it was minted at an unknown time by an
unknown process. Every other secret in this task becomes new; this one does not.
**Risk:** none technical.

#### Branch B — ROTATE IN PLACE, keeping the data (no data loss)

Change the role's password inside Postgres, then match the file. Works against a surviving volume —
the "initdb only" limit applies to the *environment variable*, not to Postgres itself.

**⚠️ IRREVERSIBLE (in effect):** the live role password changes the moment you press Enter.

**[BOX]**

```bash
ssh -i ~/.ssh/id_rsa root@<PROFILE_SERVER_HOST>
cd /opt/profile
docker compose exec postgres psql -U profile -d profile
```
then at the `psql` prompt (note: `\password` prompts without echoing and never puts the value in SQL
history — use it, not `ALTER USER … PASSWORD '…'`):
```
\password profile
\q
```

**Then immediately** set the same new value as `POSTGRES_PASSWORD` in `.env.profile.secret`
(Step 15) and run the deploy (Step 22) **without a long pause**.

**Ordering trap, stated plainly:** between the `\password` and the deploy, the running API container
still holds the OLD password in `/opt/profile/profile.env`, so **new** DB connections fail —
`/ready` will return 503 (`src/profile-server/Routes.ts:198-204`) while `/health` keeps returning 200
(`src/profile-server/Routes.ts:192-194`, which touches no database). The deploy rewrites
`profile.env` and recreates the API container, closing the window. If the deploy then fails for an
unrelated reason, you are left with a DB the API cannot log into — recover by repeating `\password`
with the old value, or by fixing and re-running the deploy.

#### Branch C — ROTATE BY RECREATING THE VOLUME (fresh initdb)

The cleanest provenance: a brand-new data directory whose password was set by this task and nothing
else.

> ### 🚨 IRREVERSIBLE — `docker compose down -v` PERMANENTLY DESTROYS THE POSTGRES DATA VOLUME.
> There is no undo and no backup to fall back on (the current backup path points at a bucket that no
> longer exists). This is acceptable **only** because every table has zero rows — and only if you
> **re-verify that at execution time**, below, rather than trusting this document.

> ### 🔴 TRAP T11 — stop the systemd unit FIRST, or the wipe undoes itself
> `setup-profile.sh:759-776` installs a `profile.service` with `ExecStart=/usr/bin/docker compose up`
> and `Restart=always` / `RestartSec=15`. If that unit is **running**, then `docker compose down -v`
> makes `docker compose up` exit, systemd restarts it 15 seconds later, and the volume is recreated
> **with the OLD password still in `/opt/profile/profile.env`** — you would have destroyed the data
> and kept the old credential. Stop the unit first.

**[BOX]** — first, prove it is empty **now**:

```bash
ssh -i ~/.ssh/id_rsa root@<PROFILE_SERVER_HOST>
cd /opt/profile
docker compose exec -T postgres psql -U profile -d profile -Atc \
  "select 'player_profiles', count(*) from player_profiles
   union all select 'player_match_xp_credits', count(*) from player_match_xp_credits
   union all select 'player_name_history', count(*) from player_name_history
   union all select 'player_cosmetic_ownership', count(*) from player_cosmetic_ownership;"
```
**Every count must be `0`.** (Those are the four tables `migrations/001_player_profiles.sql` creates,
at `:20`, `:51`, `:60` and `:70`. Migrations `002` and `003` are not applied on this box, so their
tables do not exist yet.)

**If any count is not 0 — STOP. Do not run the next command. Switch to Branch B and tell the lead.**

Then, and only then:

```bash
systemctl stop profile
cd /opt/profile && docker compose down -v
docker volume ls | grep -i profile
```

**SUCCESS:** the `docker volume ls` line shows **no** `profile_postgres_data` volume.
(The name is derived: compose takes its project name from the directory `/opt/profile`, which is why
the inventory saw containers named `profile-postgres-1` and `profile-profile-api-1`. **Confirm it
from the `docker volume ls` output rather than trusting the derivation.**)

Then set the new `POSTGRES_PASSWORD` in `.env.profile.secret` (Step 15) and run the deploy
(Step 22), which recreates the volume, runs initdb with the new password, and applies migrations
`001`–`004` fresh.

**🚨 SEND BACK (SB-4):** which branch, and why.

**Recommendation:** see the NEEDS-DECISION at the end of this document. **The lead must put this to
the owner before Step 15.**

---

### Step 15 — [MAC] Fill `.env.profile` (the non-secret file)

**Do:** open `/Users/mark.dolbyrev/Workspace/geoconflict/.env.profile` in an editor and set:

| Key | Value |
|---|---|
| `PROFILE_BACKUP_S3_ENDPOINT` | the new bucket's S3 endpoint URL |
| `PROFILE_BACKUP_S3_REGION` | the provider's region, or leave blank |
| `PROFILE_BACKUP_S3_BUCKET` | the **new** bucket name from Step 9 — **no `/`** (**T4**) |
| `PROFILE_BACKUP_S3_PREFIX` | leave at `profiles` |
| `PROFILE_BACKUP_AGE_RECIPIENT` | the `age1…` **recipient** from Step 5 — **the public half only** (**T7**) |
| `PROFILE_BACKUP_RETENTION_DAILY_DAYS` | **`14`** — see **T6** |
| `PROFILE_BACKUP_RETENTION_WEEKLY_DAYS` | **`56`** — see **T6** |

Leave `PROFILE_SERVER_HOST`, `PROFILE_DOMAIN`, `PROFILE_PORT`, `PROFILE_SWAP_SIZE_GB`,
`POSTGRES_USER`, `POSTGRES_DB`, `PROFILE_INTERNAL_ALLOW_IPS`, `DOCKER_*` and `PROFILE_SSH_KEY`
exactly as they are.

> ### 🔴 TRAP T6 — retention `0` fails the deploy closed, by design. Keep 14/56.
> `profile-backup.sh:122-131` rejects a non-integer (`:128-129`) and rejects anything below 1
> (`:130-131`), with the reason spelled out in the comment at `:122-127`: `${VAR:-N}` defaults only
> on *unset or empty*, so a literal `0` would flow into `rclone delete --min-age 0d`, which means
> "older than 0 days" — **everything, including the dump uploaded seconds earlier** — while the
> marker still recorded success. **A blank value is fine** (the default applies); a `0` is not.

**SUCCESS:** all seven keys set, the file saved. `.env*` is gitignored at `.gitignore:9`, so this
file cannot be committed.

**If unsure of the endpoint format:** write **UNKNOWN**, stop, and ask the provider's docs or the
lead. Step 18 will catch a wrong endpoint cheaply — but only if you attempt it.

---

### Step 16 — [MAC] Fill `.env.profile.secret` (the secret file)

**Do:** open `/Users/mark.dolbyrev/Workspace/geoconflict/.env.profile.secret` and set:

| Key | Value |
|---|---|
| `PROFILE_BACKUP_S3_ACCESS_KEY` | the new access key id (Step 11) |
| `PROFILE_BACKUP_S3_SECRET_KEY` | the new secret key (Step 11) |
| `PROFILE_INTERNAL_TOKEN` | the value from Step 12 — **explicitly set, never blank** (**T1**) |
| `POSTGRES_PASSWORD` | per the branch chosen in Step 14 |
| `YANDEX_PAYMENTS_SECRET` | **leave exactly as-is** (external) |
| `FEEDBACK_TELEGRAM_TOKEN` | **leave exactly as-is** (external) |
| `DOCKER_TOKEN` | leave as-is |

**Also in this step — delete the obsolete pepper:** if `PROFILE_ID_PEPPER` appears in either env
file (Step 3's output tells you), **delete the whole line**. It is a leftover from the abandoned
Yandex-ID hashing approach; a grep for `PROFILE_ID_PEPPER` across `src/`, `scripts/` and the repo-root
scripts at `cd3d583` finds **no reference at all**, so nothing reads it.

> ### 🚨 TRAP T2 — THE SILENT FAILURE. All FIVE backup values must be non-empty TOGETHER.
> The gate is `setup-profile.sh:94-99`: `BACKUP_OFFBOX_ENABLED=1` only when **endpoint AND bucket AND
> access key AND secret key AND age recipient** are all non-empty (the condition spans
> `setup-profile.sh:95-97`). Note **region and prefix are NOT in the gate** — a blank region does not
> disable backups.
>
> **What four-of-five does:** it takes the `else` at `setup-profile.sh:915-918`, which prints
> *"Using interim weekly LOCAL pg_dump skeleton (dies with the box — not a real backup)"* — the
> script's own words for it.
>
> **⚠️ Correction to how this trap is usually described.** Four-of-five does **not always** exit 0.
> `guard_offbox_downgrade` (`setup-profile.sh:816-825`, invoked at `setup-profile.sh:925-933`) makes
> the deploy **exit 1** if the box is *already* off-box configured — i.e. if
> `/opt/profile/backup.sh` **and** `/opt/profile/backup.env` both exist, or `/etc/cron.d/profile-backups`
> contains `Mode: offbox`. On a **never-configured** box it returns 0 and the silent local downgrade
> happens.
>
> **Which case is THIS box? UNKNOWN.** The inventory did not report whether `/opt/profile/backup.sh`
> and `backup.env` exist. Do not rely on the guard catching your typo. **Set all five.**
>
> **With all five set, a wrong bucket or credential FAILS THE DEPLOY CLOSED**, because
> `setup-profile.sh:894-908` runs a **real** backup as a deploy-time smoke check and refuses to
> promote the new config if it fails.

**SUCCESS:** all four rotated/new values set, both external secrets untouched, `PROFILE_ID_PEPPER`
gone, file saved.

**If `.env.profile.secret` does not exist:** create it. Then `chmod 600 .env.profile.secret`.

---

### Step 17 — [MAC] Confirm nothing secret became trackable

```bash
cd /Users/mark.dolbyrev/Workspace/geoconflict
git status --short && git check-ignore -v .env.profile .env.profile.secret
```

**SUCCESS:** `git status --short` shows **no** `.env.profile*` entries, and `git check-ignore` prints
a `.gitignore:9:.env*` line for each file.

**If either file shows up in `git status`:** STOP. Do not commit anything. Tell the lead.

---

## Phase E — The cheap pre-deploy check (this is what saves you a wasted build)

> ### 🔴 TRAP T10 — `build-deploy-profile.sh` does NOT validate the backup variables locally
> It validates `PROFILE_SERVER_HOST` (`build-deploy-profile.sh:92-96`), the two scripts
> (`:98-106`), `DOCKER_USERNAME`/`DOCKER_REPO` (`:108-111`), `POSTGRES_PASSWORD` (`:117-121`), the
> Dockerfile (`:123-126`) and Docker itself (`:128-132`). The `PROFILE_BACKUP_*` values it merely
> forwards, unchecked, at `build-deploy-profile.sh:540-548`. **A typo therefore costs a full image
> build and registry push before the box-side smoke check rejects it.** Steps 18–20 cost seconds.

### Step 18 — [MAC] Round-trip the new bucket with rclone, using the box's exact configuration

This replicates `setup-profile.sh:872-879` byte-for-byte in variable names, so a pass here means the
box will behave the same way.

> ### 🔴 TRAP T9 — rclone needs NO `rclone.conf`. Do not run `rclone config`.
> `profile-backup.sh:43` sets `export RCLONE_CONFIG=/dev/null` and everything comes from
> `RCLONE_CONFIG_PROFILES_*` environment variables (the reasoning is at `profile-backup.sh:39-42`).
> A `~/.config/rclone/rclone.conf` you create by hand is ignored on the box and will mislead you
> here. The remote is literally named `profiles:`.

**Do:** open a **throwaway terminal tab** (you will close it at the end so the secrets leave your
shell), and paste this block. It reads the values out of the env files, so you never re-type a
secret and it also proves both files parse.

```bash
cd /Users/mark.dolbyrev/Workspace/geoconflict
set -a; . ./.env.profile; . ./.env.profile.secret; set +a
export RCLONE_CONFIG=/dev/null
export RCLONE_CONFIG_PROFILES_TYPE=s3
export RCLONE_CONFIG_PROFILES_PROVIDER=Other
export RCLONE_CONFIG_PROFILES_ENV_AUTH=false
export RCLONE_CONFIG_PROFILES_ENDPOINT="$PROFILE_BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_PROFILES_REGION="$PROFILE_BACKUP_S3_REGION"
export RCLONE_CONFIG_PROFILES_ACCESS_KEY_ID="$PROFILE_BACKUP_S3_ACCESS_KEY"
export RCLONE_CONFIG_PROFILES_SECRET_ACCESS_KEY="$PROFILE_BACKUP_S3_SECRET_KEY"
export RCLONE_CONFIG_PROFILES_ACL=private

echo "precheck $(date -u +%FT%TZ)" > /tmp/precheck.txt
rclone copyto /tmp/precheck.txt "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/precheck/precheck.txt"
rclone size --json "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/precheck/precheck.txt"
rclone deletefile "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/precheck/precheck.txt"
rm -f /tmp/precheck.txt
```

**SUCCESS:** the `copyto` is silent, the `size --json` prints a JSON object with `"count":1` and a
non-zero `"bytes"`, and the `deletefile` is silent.

**🚨 SEND BACK (SB-5):** "rclone pre-check PASS" or the error text — 🔒 **redact the bucket name and
endpoint** from any error you paste.

**If it fails:**
- `AccessDenied` / `SignatureDoesNotMatch` → wrong access key or secret key. Re-do Step 11 or re-paste.
- `NoSuchBucket` → the bucket name is wrong, or Step 9 did not complete (**T3**).
- a DNS/connection error → the endpoint URL is wrong, or a full-tunnel VPN is intercepting it.
- an empty/odd path → check the bucket name has no `/` (**T4**).

**Note:** do **not** use `rclone lsd profiles:` as the test. A key correctly scoped to one bucket is
often denied permission to list all buckets, so that command can fail on a perfectly good setup.

---

### Step 19 — [MAC] Round-trip `age` with the real recipient

Proves the recipient string in `.env.profile` is a valid one the backup can encrypt to.

```bash
cd /Users/mark.dolbyrev/Workspace/geoconflict
set -a; . ./.env.profile; set +a
echo hello > /tmp/agerec.txt
age -r "$PROFILE_BACKUP_AGE_RECIPIENT" -o /tmp/agerec.age /tmp/agerec.txt && echo "RECIPIENT OK"
rm -f /tmp/agerec.txt /tmp/agerec.age
```

**SUCCESS:** `RECIPIENT OK` prints.

**If it fails:** `malformed recipient` means the `age1…` value is truncated or has stray whitespace —
re-copy it from Step 5. **Do not** paste the private identity here; `-r` takes the public half only
(**T7**).

**Now close that throwaway terminal tab** so the exported secrets leave your shell.

---

### Step 20 — [MAC] Confirm DNS and reachability before you build anything

`setup-profile.sh:589-617` fail-closes if `api.geoconflict.ru` does not resolve to this box
(`:590-593` on "does not resolve", `:613-617` on "resolves to … not this host"). It accepts
`PROFILE_SERVER_HOST` as a match to survive the box's 1:1 NAT (`setup-profile.sh:595-600`).

```bash
dig +short api.geoconflict.ru
cd /Users/mark.dolbyrev/Workspace/geoconflict && grep '^PROFILE_SERVER_HOST=' .env.profile
route -n get "$(dig +short api.geoconflict.ru | head -1)" | grep interface
ssh -i ~/.ssh/id_rsa -o ConnectTimeout=10 root@"$(dig +short api.geoconflict.ru | head -1)" 'echo ok'
```

**SUCCESS:** `dig` returns one IPv4 that **equals** the `PROFILE_SERVER_HOST` value; `interface:` is
`en0` (or your physical interface), **not** `utun*`; and the SSH prints `ok`.

**If `interface` shows `utun*`:** a full-tunnel VPN is in the way — the RU box will be unreachable.
Turn the VPN off, or add a `/32` bypass route (`0182` brief:268-274 has the exact commands). Verify
again before continuing.

**If SSH fails:** confirm you are using `~/.ssh/id_rsa`. `~/.ssh/openfront_vps` is **not** the key
for this box.

---

## Phase F — The deploy

### Step 21 — [MAC] Start Docker Desktop, by hand

The deploy cross-builds a `linux/amd64` image and refuses to start without Docker
(`build-deploy-profile.sh:128-132`).

**Do:** open Docker Desktop from the Applications folder / Spotlight and wait for the whale icon to
go steady. **Do not** try `open -a Docker` from a script — it blocks on an interactive admin-password
prompt, and `docker info` can exit 0 while the daemon is still unreachable.

```bash
docker info --format '{{.ServerVersion}}'
```

**SUCCESS:** a version number prints.

**If it fails:** wait longer and retry; the daemon takes a while.

---

### Step 22 — [DEPLOY] 🚨 Run the deploy — this changes the box

> **⚠️ Two things happen here that you should expect, not be alarmed by:**
>
> 1. **The public API goes down for a short window.** `setup-profile.sh:683` runs
>    `systemctl stop nginx || true` **unconditionally** before certbot, even when the cert is fresh
>    and `--keep-until-expiring` (`setup-profile.sh:687`) makes the issuance a no-op. During that
>    window `https://api.geoconflict.ru/health` is unreachable. Nothing consumes it yet, so this is
>    cost-free today — but do not read it as a failure. A failure during HTTPS setup restores the
>    previous nginx config automatically (`setup-profile.sh:657-671`).
> 2. **⚠️ IRREVERSIBLE: migrations `002`, `003` and `004` apply to the live database for the first
>    time** (`setup-profile.sh:572-578` runs `docker compose exec -T profile-api npm run migrate`
>    on every deploy, skipping already-applied files via `schema_migrations`). `migrate.ts` has no
>    down-migration. With zero rows this is safe; it is still one-way.

**Do:**

```bash
cd /Users/mark.dolbyrev/Workspace/geoconflict
npm run deploy:profile
```

(That runs `./build-deploy-profile.sh` — `package.json:38`.)

**SUCCESS — all of these, in the output:**
- `✅ All containers running and healthy:` followed by a `docker compose ps` table
- `✅ DB migrations applied.`
- `✅ Smoke check passed — candidate promoted; encrypted object written + verified off-box in S3.`
- `Backups: DAILY encrypted off-box to S3 (age + rclone).` — **not** the *"interim weekly LOCAL"*
  line at `setup-profile.sh:1017`
- the `PROVISIONING + DEPLOY COMPLETE` banner

**🚨 SEND BACK (SB-5):** the last ~40 lines, **with the `PROFILE_INTERNAL_TOKEN=` line and any
domain/endpoint lines redacted.** The banner at `setup-profile.sh:1022` prints
`PROFILE_INTERNAL_TOKEN=<value managed in .env.profile.secret>` — a placeholder, not the value — but
read it before pasting rather than assuming.

**If it fails:** go to the ROLLBACK / WHAT-IF section below. **Do not re-run blindly.** First find
which of the four failure points you hit; they have different consequences.

---

## Phase G — Verify

### Step 23 — [MAC] `/health` over a valid certificate

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.geoconflict.ru/health
curl -sS https://api.geoconflict.ru/health
```

**SUCCESS:** `200`, then `{"status":"ok"}`. **No `-k`** — a valid Let's Encrypt cert is part of the
acceptance (`brief.md` verification item 3; `0182` brief:243-247).

**If it fails:** a TLS error means certbot did not complete — check the deploy output around the
HTTPS header. A 502 means nginx is up but the API container is not — go to Step 25.

---

### Step 24 — [MAC] `/ready` — the database-backed check

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.geoconflict.ru/ready
```

**SUCCESS:** `200`. `/ready` returns 200 only when Postgres answers a query and 503 otherwise
(`src/profile-server/Routes.ts:198-204`), so this is the check that catches a `POSTGRES_PASSWORD`
mismatch from Step 14 Branch B.

**If it returns 503:** the API cannot authenticate to Postgres. Re-check that the value you set with
`\password` matches `.env.profile.secret` exactly, then re-run Step 22.

---

### Step 25 — [BOX] Containers, image pinning, swap, firewall

```bash
ssh -i ~/.ssh/id_rsa root@<PROFILE_SERVER_HOST>
cd /opt/profile
docker compose ps
docker compose config | grep -A1 'profile-api:' | grep image
swapon --show
sysctl vm.swappiness
ufw status
```

**SUCCESS:** both `postgres` and `profile-api` show `healthy`; the image line contains `@sha256:`
(`setup-profile.sh:115-120` refuses to deploy anything that is not digest-pinned); a ~4G swapfile;
`vm.swappiness = 10`; ufw active, default deny incoming, only 22/80/443.

**🚨 SEND BACK (SB-6):** the container states and whether the image line has `@sha256:` — 🔒 not the
digest itself is fine to send (it is public), but redact nothing else is needed here.

---

### Step 26 — [BOX] Confirm all four migrations are recorded

This is `brief.md`'s **B8**, and the answer to *"was `0067`'s server half ever deployed?"*

```bash
docker compose exec -T postgres psql -U profile -d profile -Atc \
  "select filename from schema_migrations order by 1;"
```

**SUCCESS:** four lines — `001_player_profiles.sql`, `002_yandex_payments.sql`,
`003_player_messages.sql`, `004_name_change.sql`.

**⚠️ UNKNOWN:** the exact **column name** in `schema_migrations` is not verified in this plan — I did
not read `src/profile-server/migrate.ts`. If `filename` errors, run
`\d schema_migrations` at a `psql` prompt to see the real column, or just
`select * from schema_migrations;`.

**🚨 SEND BACK (SB-6):** the four filenames.

**If fewer than four appear:** the deploy's migration step would have failed loudly
(`setup-profile.sh:573-577` exits 1 on a migration error), so this should not happen. If it does,
stop and tell the lead — do not hand-apply SQL.

---

### Step 27 — [BOX] Confirm the backup really is off-box, not the local skeleton

```bash
head -3 /etc/cron.d/profile-backups
ls -l /opt/profile/backup.sh /opt/profile/backup.env
cat /opt/profile/backups/last-smokecheck.json
ls /opt/profile/backup.sh.new /opt/profile/backup.env.new 2>&1
```

**SUCCESS:**
- the cron header line reads `# Profile backups — added by setup-profile.sh (T8). Mode: offbox.`
  (`setup-profile.sh:939`) — **`Mode: local` means the off-box path did not activate**;
- `backup.sh` is `0700` and `backup.env` is `0600`;
- `last-smokecheck.json` shows `"exit_status": 0` and a non-empty `"object_key"`;
- the two `.new` files **do not exist** (they are promoted by `mv -f` on success —
  `setup-profile.sh:802`).

**🚨 SEND BACK (SB-6):** the `Mode:` line and the smoke marker's `exit_status` — 🔒 the marker's
`object_key` contains the bucket prefix path but **not** the bucket name; still, redact it rather
than reasoning about it.

**If `Mode: local`:** one of the five gate values was blank (**T2**). Fix `.env.profile` /
`.env.profile.secret` and re-run Step 22.

---

### Step 28 — [REG.RU] Confirm the object actually landed in the new bucket

**Do:** in the console, open the new bucket and look under `profiles/daily/`.

**SUCCESS:** one object named `profile-<today's UTC date>.dump.age`
(`profile-backup.sh:135-136`).

**🚨 SEND BACK (SB-3):** "one dated object present under profiles/daily/" — 🔒 no bucket name.

**If the bucket is empty** but Step 27 showed `Mode: offbox` and `exit_status: 0`, you are looking at
the wrong bucket or the wrong account. Re-check before concluding anything.

---

### Step 29 — [BOX] Secret-hygiene spot check

```bash
ps -ef | grep -iE 'postgres_password|profile-deploy-env' | grep -v grep
```

**SUCCESS:** **no output.** No DB password and no staging-env path in any process argv
(`brief.md` verification item 6; `0182` brief:258-262).

**If there is output:** capture it **without the values**, and tell the lead immediately.

---

### Step 30 — [BOX] Delete the obsolete pepper file, and note the stale token file

```bash
ls -l /opt/profile/.id_pepper 2>/dev/null && rm -f /opt/profile/.id_pepper
ls -l /opt/profile/.internal_token
```

**SUCCESS:** `.id_pepper` is gone (or was never there). `.internal_token` may still exist.

**⚠️ Do NOT delete `/opt/profile/.internal_token`, and know what it now is.** Because you supplied
`PROFILE_INTERNAL_TOKEN` in the environment, `setup-profile.sh:358-359` took the "env wins" branch —
which **does not rewrite the persisted file** (only the mint branch at `setup-profile.sh:365` writes
it). So that file now holds a **stale, superseded** token. It is harmless while `.env.profile.secret`
carries the real value, but a future deploy run with a **blank** value would silently fall back to it
(`setup-profile.sh:360-362`) and re-break crediting. Record this in the worklog and flag it to
[`0220`](../../backlog/0220-profile-p5-secret-persistence-and-value-parity/brief.md), which owns secret
persistence and value parity.

---

### Step 31 — [MAC] Record the outcome in the worklog

**Do:** write `ai-agents/tasks/backlog/0215-profile-p1-stand-up-the-box/worklog.md` with:

1. **The B1–B9 table from `brief.md`, filled in with dated values** — this is the acceptance
   criterion that answers the owner's actual complaint (`brief.md` verification item 1). Values that
   are secrets or identifiers stay out: *"role marker present and correct"*, never its contents.
2. **B1 was confirmed before any destructive step** — say which step, and note that under ADOPT the
   only destructive step available was Step 14 Branch C.
3. **The premise change**: the brief said inspect-then-wipe; the owner ruled ADOPT on 2026-09-08/09;
   no wipe was performed (or: only the Postgres volume, under Branch C).
4. **`PROFILE_INTERNAL_TOKEN` was generated explicitly and recorded for `0217`** — and state plainly
   that the runbook's *"leave blank, the box auto-generates it"* guidance (`0182` brief:175 and
   `0182` brief:207, both struck there) and `example.env.profile:92-93` (still unstruck) were
   **NOT** followed, and why (**T1**).
5. **`example.env.profile:92-93` is still wrong at `cd3d583`** — a live documentation defect, already
   handed to a coder. Say so; do not fix it in this task.
6. **All six backup values were newly issued**, a **brand-new clean bucket** was created, and **the
   VPS was reused in place.** 🔒 **Name no bucket.** Do **not** write the struck 2026-09-04 claim that
   the bucket was reused — `brief.md` verification item 11 says stating it would record a falsehood.
7. **The `age` custody record** (`0218`'s gate) — custodian, vault, entry, second copy, date, and the
   dated readability check. Locations and names only, never values.
8. **The `POSTGRES_PASSWORD` branch chosen and why.**
9. **What the runbook got wrong.** `brief.md`'s step 9 tells you to assume at least one more line has
   drifted. Four candidates found while writing this plan, for you to confirm or refute:
   - 🔴 **A STALE CITATION, and it is the most-copied one in this whole task.** `0182` brief:136-137
     is cited as the token trap by `0215`'s own `brief.md`, by `0218` brief:149, and by the project
     memory. At `cd3d583` those two lines are `## 3. Confirm SSH access to the box` and a blank
     line. The text they mean is at `0182` brief:175 and `0182` brief:207. **Everywhere that
     `:136-137` appears should be re-derived by content.**
     📌 **SWEPT AND CLOSED 2026-09-10 (0182 numbers below are POST-sweep)** — see the corrected note in the T-block above:
     the *"`0218` brief:149 and the project memory"* half of this finding was itself wrong, and
     `:136-137` was **wrong from birth**, not merely stale.
   - `0182` brief:293-297's *"backups are local + weekly"* — already struck and superseded in place;
     confirm nothing else in that section drifted.
   - **T11** — the `Restart=always` systemd unit (`setup-profile.sh:759-776`) silently undoing a
     `docker compose down -v`. Documented nowhere in `0182`.
   - **Step 30** — supplying the token via the environment leaves `/opt/profile/.internal_token`
     holding a stale value that a later blank-valued deploy would silently re-adopt
     (`setup-profile.sh:358-368`). Documented nowhere in `0182`.

**SUCCESS:** the file exists and every item above has a dated answer or an explicit **UNKNOWN**.

**🔒 Rule for the whole file:** no values, no lengths, no IPs, no hostnames, no bucket names
(`brief.md` note 4).

---

# ROLLBACK / WHAT-IF

### The single most important thing to know about a failed deploy

**"A failed run leaves prior working config untouched" is TRUE OF THE BACKUP CONFIG ONLY. It is NOT
true of the deploy as a whole.**

The backup smoke check is nearly the **last** thing `setup-profile.sh` does. By the time it runs, the
script has already: pulled and started the new image (`setup-profile.sh:496-504`), passed the
120-second health gate (`setup-profile.sh:509-517`), **applied the migrations**
(`setup-profile.sh:572-578`), reconfigured nginx and TLS (`setup-profile.sh:582` onward), and enabled
the systemd unit (`setup-profile.sh:778-780`). Only then does it reach the backup section at
`setup-profile.sh:833`.

So a smoke-check failure leaves you with a box that is **fully deployed and serving**, with its
**previous backup configuration intact** — not a box rolled back to where it started.

### What-if 1 — the deploy aborts at the backup smoke check

**You will see:** `Error: deploy-time off-box backup smoke check FAILED — refusing to promote the new
backup config (fail closed).` followed by the contents of `last-smokecheck.json`
(`setup-profile.sh:901-907`), then exit 1.

**What is true, verified at `setup-profile.sh:797-805`:** `promote_offbox_backup` runs the smoke
first (`:796`); it promotes with `mv -f` **only** on success (`:802`); on failure it deletes the
staged `.new` candidates (`:804`) and returns 1 (`:805`). Your **previously working**
`backup.sh` / `backup.env` / cron are untouched — the rationale is spelled out at
`setup-profile.sh:782-788`. On a box that had **no** off-box backup before, nothing is activated.

**What to do:**
1. Read the `error` field in the printed `last-smokecheck.json` — it names the failing step.
2. Map it: `rclone upload failed` → credentials or bucket (`profile-backup.sh:161-162`);
   `upload verify failed` → the object did not land or size mismatched (`:167`);
   `age encryption failed` → a bad recipient (`:154`);
   `pg_dump failed` → the database, not the backup config (`:147-149`);
   a retention `die` → **T6**, you set a `0` or a non-number (`:128-131`).
3. Fix the value in `.env.profile` / `.env.profile.secret`.
4. **Re-run Step 18 first** — it is seconds and it reproduces the same failure locally.
5. Re-run Step 22. The deploy is idempotent and safe to re-run.

### What-if 2 — the deploy aborts at the 120-second health gate

The script captures the previously-running image before mutating anything
(`setup-profile.sh:488-492`) and rolls back to it if the new image never becomes healthy. The
migrations have **not** run at that point (they are gated behind the health check —
`setup-profile.sh:506-507`, `:564-573`). Read the container logs (`docker compose logs profile-api`)
before re-running.

### What-if 3 — the deploy aborts during HTTPS setup

`setup-profile.sh:657-671` installs a trap on `ERR INT TERM` that restores the previous nginx site
config and restarts nginx. The public endpoint comes back on the **old** config. Do not hand-edit
nginx; fix the cause (usually DNS — Step 20) and re-run.

### What-if 4 — you get the "refusing to silently downgrade" error

`Error: this box is already configured for OFF-BOX backups, but PROFILE_BACKUP_* is now
missing/partial` (`setup-profile.sh:926-932`). That is `guard_offbox_downgrade`
(`setup-profile.sh:816-825`) doing its job: you left one of the five gate values blank (**T2**). Fill
it in and re-run. **Do not** set `PROFILE_BACKUP_DISABLE_OFFBOX=1` to get past it — that flag exists
for a deliberate downgrade, which is not what this task is doing.

### What-if 5 — Step 14 Branch C was run and the deploy then failed

You have an empty box with no data volume. Nothing was lost (row counts were zero, verified at
execution time). Fix the deploy failure and re-run Step 22; it recreates the volume, runs initdb with
the new password, and applies all four migrations. **If the row counts were not verified as zero
before the wipe, this is a data-loss incident — tell the owner immediately, do not re-run anything.**

### What is NOT available as a rollback

- **No database rollback.** `migrate.ts` has no down-migrations.
- **No restore.** The old bucket is deleted and its objects were unreadable anyway (no identity was
  ever recorded for them). Until [`0218`](../../backlog/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
  proves a restore against non-empty data, **treat this box as not durably recoverable.**

---

# OUT OF SCOPE — do NOT do these here

| Item | Owner |
|---|---|
| Wiring the game server to the profile box: `PROFILE_API_URL`, the game-side `PROFILE_INTERNAL_TOKEN`, **and re-verifying the `/internal/` allowlist IP (T8)** | [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) |
| The restore drill against non-empty data, and closing out `age`-key custody | [`0218`](../../backlog/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) — this plan only **creates** the key and **records** custody (Steps 4–8) |
| **Log rotation** — including the ~736 MB of journald the inventory found, and the fact that there is **no** Docker `daemon.json` log rotation on this box; plus image prune, an external uptime check, and a consumer for `last-backup.json` | [`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) |
| Secret persistence and value parity — including the **stale `/opt/profile/.internal_token`** noted at Step 30 | [`0220`](../../backlog/0220-profile-p5-secret-persistence-and-value-parity/brief.md) |
| OS baseline hardening, a non-root deploy user, restart policy — including the **`sshd PasswordAuthentication yes`** the inventory found | [`0221`](../../backlog/0221-profile-p6-os-baseline-hardening/brief.md) |
| **Revoking the OLD S3 access key at the provider** (still not done — an overwritten local value is a live credential until revoked there, `0222` brief:200-201), deleting `PROFILE_ID_PEPPER` beyond the two files named in Steps 16 and 30, and any decision about the old bucket | [`0222`](../../backlog/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md) — **UNANSWERED owner decision** |
| **The pending kernel reboot** the inventory found on the box | Not filed against a task. **Needs a home** — flag to the producer. It is not scheduled by this plan because rebooting mid-deploy would confuse every failure signal above. |
| Fixing the `example.env.profile:92-93` documentation defect (**T1**) | Already handed to a coder as a separate change. **Record it, do not fix it here** — this task must not carry an unrelated source edit. |
| Committing anything | Nobody. **Every file this plan touches is gitignored. Do not commit.** |

---

# UNKNOWNS in this plan

Written as UNKNOWN rather than guessed, because a wrong instruction here costs a rebuild.

1. **Is `/opt/profile/backup.sh` + `backup.env` present on the box today?** The inventory did not
   report it. This decides whether a four-of-five `PROFILE_BACKUP_*` mistake fails loudly
   (`guard_offbox_downgrade`, `setup-profile.sh:816-825`) or degrades silently
   (`setup-profile.sh:915-918`). **Step 16 assumes the worst case — set all five.** Step 27's
   `ls -l` answers it after the fact.
2. **The column name in `schema_migrations`.** Step 26 uses `filename`; I did not read
   `src/profile-server/migrate.ts` to confirm it. Fallback given in the step.
3. **The exact Docker volume name** (`profile_postgres_data` is *derived* from the compose project
   directory `/opt/profile` and the observed container names, not read from the box). Step 14
   Branch C tells you to confirm from `docker volume ls` output rather than trust the derivation.
4. **Whether reg.ru Object Storage requires a non-empty `PROFILE_BACKUP_S3_REGION`.** It is **not**
   in the five-value gate (`setup-profile.sh:95-97`), so a blank region does not disable backups —
   but the provider may still reject a request without one. Step 18 settles it in seconds.
5. **Whether the reg.ru console exposes versioning and lifecycle settings** (Step 10). If it does
   not, record UNKNOWN and move on; it is a cost/retention risk, not a deploy blocker.
6. **The inventory findings themselves.** They were relayed in session and are not written to any
   file in this repo, so I could not verify them. Everything in this plan that depends on them —
   "zero rows", "migration 001 only", "cert valid to 2026-11-20" — is trusted, not checked. **Step 14
   Branch C re-verifies the zero-rows claim at execution time precisely because of this.**

---

# 🔴 NEEDS-DECISION — must be answered before Step 15

**Question:** What happens to `POSTGRES_PASSWORD`?

**Context:** The owner asked for every regenerable secret to be regenerated, to end provenance
ambiguity. `POSTGRES_PASSWORD` is the one secret where that is not free of consequence. The Postgres
image applies the variable only at initdb, so the file value has no effect on an existing database.
Every table has **zero rows today** — which makes a full rotation free right now and expensive later
(it would need a dump-and-restore once real citizens exist). The rotation is therefore either done
now or effectively deferred indefinitely.

**Options:**

- **A — Keep it.** No action, no risk. **Cost:** one secret keeps an unknown provenance while every
  other secret in this task becomes new. That is exactly the ambiguity the owner asked to remove.
- **B — Rotate in place with `\password`, keep the data.** New role password, no data loss, works
  against the surviving volume. **Cost:** a short ordering window where `/ready` returns 503 until
  the deploy rewrites `profile.env`; recoverable.
- **C — Rotate by destroying the volume (`down -v`) and letting initdb set the new password.**
  🚨 **IRREVERSIBLE.** Cleanest provenance — new password, new data directory, migrations `001`–`004`
  applied fresh in one pass. **Cost:** permanent data loss if the zero-rows assumption is ever wrong,
  and it requires stopping the `profile` systemd unit first or the wipe undoes itself (**T11**).

**Recommendation: C**, conditional on the zero-row check in Step 14 passing **at execution time**.
It is the only branch that gives the owner what they actually asked for — a secret with no history —
and the window in which it is free is exactly now. If the zero-row check returns anything but zeros,
**fall back to B**, not to C.

**A second, smaller decision the lead should confirm while asking:** the owner is ADOPTing a box
whose backups have never been restore-proven and whose old bucket is gone. Between Step 22 and
`0218`'s drill, this box has **no proven recovery path**. That is acceptable at zero rows; it must not
still be true when the first real citizen row is written.
