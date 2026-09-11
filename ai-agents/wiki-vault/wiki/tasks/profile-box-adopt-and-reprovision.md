# Profile Box P1 — ADOPTED and Re-Provisioned in Place (No Wipe)

**Source**: `ai-agents/tasks/done/0215-profile-p1-stand-up-the-box/brief.md` (plus `plan.md`, `worklog.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0215` / P1 of the `0213` profile-backend rebuild epic

> # 🚨 READ FIRST — THE BRIEF'S PREMISE WAS REVERSED, AND THE FOLDER NAME STILL CARRIES THE OLD ONE
>
> **`brief.md`'s title and scope say "inspect, THEN wipe and re-provision in place." That is NOT what
> happened.** A read-only inventory on 2026-09-08 found the box **already LIVE and HEALTHY**, and on
> that evidence the **owner ruled ADOPT** (2026-09-08/09, live in session): keep the box and its
> state, re-provision over it, **do not wipe**.
>
> 🔴 **NO WIPE WAS PERFORMED.** The single destructive act in the whole task was destroying the
> **Postgres data volume** so `POSTGRES_PASSWORD` could be rotated at `initdb` — owner-ruled
> explicitly, after a zero-row re-check at execution time (below).
>
> ⚠️ The folder name (`0215-profile-p1-stand-up-the-box`) and the brief title are **kept unchanged on
> purpose** — the folder is the task's identity and several files link to it. **Do not read either as
> a description of what was done.**

## Goal

Settle the owner's standing complaint — *"I am completely lost about what was done and what wasn't"* —
about the profile VPS behind `api.geoconflict.ru`: read its actual state into a table, decide from
that evidence what "wipe" should mean, re-provision, and regenerate every secret whose provenance was
unknown. **The deliverable was the filled-in inspection table (B1–B9), not a green `/health`.**

## Key Changes

**No source file changed. `src/` untouched, no script, no config, no commit.** The only file this task
wrote in the repository is its own `worklog.md`. Everything on the box, in the reg.ru console and in
the object store was executed **by the owner, by hand**, guided step by step through `plan.md`. **No
agent touched the box, ran a deploy, or held a secret.**

### The inspection table (B1–B9) — all nine rows filled in

| Row | Finding |
|---|---|
| **B1** deploy role marker | Present and correct (2026-09-08), and **re-read by the owner immediately before the only destructive step** (2026-09-09). Value not recorded — it is an identifier. |
| **B2** stack directory | Present and populated; post-deploy also carries `backup.env` (0600) and `backup.sh` (0700). |
| **B3** containers | **Running and healthy at inventory** — this is the finding that produced the ADOPT ruling. Both compose services healthy again after the deploy. |
| **B4** has a backup ever completed | ⚠️ **Historical half remains UNKNOWN** — `last-backup.json` was never read. **Answered forward instead:** `last-smokecheck.json` records `exit_status: 0`, and one encrypted daily object of **19,330 bytes** was verified present in the new bucket. A backup demonstrably completes *now*; what happened before is not known. |
| **B5** swap | Active, `/swapfile`, 4 G, `vm.swappiness=10` (read post-deploy 2026-09-10). |
| **B6** firewall | `ufw` active; allowed set is **exactly** 22/80/443 (v4 and v6), nothing else. ⚠️ **Stated limit:** plain `ufw status` does not restate the default policy, so **default-deny-incoming was NOT re-verified** — it is carried forward from the pre-deploy inventory. |
| **B7** spec vs the 2 vCPU / 4 GB / 60 GB floor | **Meets the floor on all three axes** — 2 vCPU, 3.8 GiB RAM (the usual reported figure for a 4 GB box), 58 G disk at 26 %. **No resize was needed and none was done.** The 22 % → 26 % disk delta is the newly pulled image layers, not a leak. |
| **B8** schema version | **All four migrations recorded** — `001`–`004`, including `004_name_change.sql`. This settles the question task `0067` raised. |
| **B9** old bucket contents | **Moot — the old bucket no longer exists.** The owner deleted it before this task's storage work. ~~Its objects were, and remain, unreadable.~~ 🚨 **CORRECTED 2026-09-11 by lint — struck, not deleted. THAT PREMISE WAS RETRACTED, NOT SUPERSEDED: THE OLD BUCKET WAS EMPTY AND ALWAYS HAD BEEN, SO THERE WERE NO OBJECTS AT ALL.** Owner, 2026-09-10, verbatim: *"I've already deleted the old bucket, it was empty, we never had anything there."* ⛔ **"Unreadable objects" asserts objects existed — they never did.** ⚠️ **Retraction covers THE OBJECTS ONLY: the lost OLD `age` private identity is unchanged, and it turns out to have been protecting nothing — that is LUCK, NOT A CONTROL.** 🔒 Separately, the **old S3 access key** was **never revoked and its scope never established** — **closed by owner decision 2026-09-11, deliberately not done**; ⛔ not "revoked", not "resolved", not outstanding work. See [[tasks/profile-cleanup-obsolete-secrets]]. |

### The one destructive step — the Postgres data volume

The Postgres image applies `POSTGRES_PASSWORD` **only at `initdb`**, so rotation is free at zero rows
and expensive forever after. The owner ruled the volume destroyed. **The zero-row assumption was
re-verified AT EXECUTION TIME**, not trusted from the earlier inventory — `player_profiles`,
`player_match_xp_credits`, `player_name_history` and `player_cosmetic_ownership` all read **0 rows**
immediately before the volume went.

🚨 **A real trap was hit and defeated in the right order.** The `profile` systemd unit carries
`Restart=always` / `RestartSec=15` (`setup-profile.sh:759-776`), which would have silently restarted
the stack and undone the wipe. Executed sequence: **stop the systemd unit first** → `docker compose
down -v` → confirm no profile volume remains. **This trap is documented nowhere in the `0182`
runbook.**

### Every regenerable secret is new

| Secret | Disposition |
|---|---|
| `age` keypair | **NEW**, generated on the owner's machine outside the repo. Custody proven — see below. |
| `PROFILE_INTERNAL_TOKEN` | **NEW, generated EXPLICITLY** (`openssl rand -hex 32`) and recorded for `0217`. **Not box-generated** — see the trap below. |
| S3 bucket | **BRAND-NEW, CLEAN bucket** (owner ruling 2026-09-08). The **old bucket had already been deleted by the owner.** Named nowhere. |
| S3 access key | **NEW**, scoped. |
| `POSTGRES_PASSWORD` | **NEW**, applied via a fresh `initdb`. |
| `PROFILE_ID_PEPPER` | **DELETED** from the secret env file, and `/opt/profile/.id_pepper` removed from the box. Obsolete since the hashing approach was abandoned (2026-06-27). |

**All six backup values were newly issued; none was carried over.** A brand-new clean bucket, new
credentials and a new `age` keypair — **while the VPS itself was reused in place.**

⚠️ **A prior stored copy of the internal token genuinely did not match the box's.** Before
regeneration the owner's password-manager entry was tested against the box's persisted token and
**did not match**. This was exhaustively refuted as a methodology artifact (the file has no trailing
newline, so raw and newline-stripped readings are identical). **Recorded as fact: the stored entry
held a different secret than the box.** Moot now, but it is a data point about secret provenance
here.

### The certificate was PRESERVED — the thing adopting bought

Issuer Let's Encrypt YE2, `notBefore` **2026-08-22**, `notAfter` **2026-11-20**, and **byte-identical
before and after the deploy.** `setup-profile.sh`'s `--keep-until-expiring` made re-issuance a no-op,
so **no rate-limit was spent against the main domain's shared limit** — the material risk of
re-running a deploy against a live box.

### The deploy itself

`npm run deploy:profile`. **Attempt 1 FAILED at the local image build** — an EOF from the container
registry during the `node:24-slim` metadata fetch. 🔴 **The failure happened BEFORE ANY SSH: the box
was never contacted, so there was no partial state and nothing to roll back.** Diagnosed as transient
(auth endpoint 200, registry 401 as normal, no VPN, no mirrors) before retrying; a plain
`docker pull` then succeeded and **attempt 2 passed end to end**.

⚠️ **Expected outage, recorded so it is not mistaken for a fault:** the deploy briefly took the public
API down, because `setup-profile.sh` stops nginx unconditionally before certbot. Nothing consumes the
API yet, so the window cost nothing.

## Outcome

**The profile box is live and re-provisioned.** Independently lead-verified, separately from the
deploy's own success banner:

- `/health` → **200**, body `{"status":"ok"}` over a **valid** Let's Encrypt certificate (no `-k`).
- `/ready` (`src/profile-server/Routes.ts:198-207`) → **200**, body `{"status":"ready"}`. Because
  `/ready` is DB-backed, this proves the API **authenticated to Postgres with the NEW password
  against the FRESH volume**.
- One encrypted daily backup object, **19,330 bytes**, confirmed present in the new bucket.
- Certificate dates unchanged across the deploy.

Owner-executed and lead-read on the box: both services healthy, `profile-api` image **digest-pinned**
(`@sha256:`), four migrations recorded, the backup cron header reading `Mode: offbox`, `backup.env`
0600 / `backup.sh` 0700, `last-smokecheck.json` `exit_status: 0`, no DB password or env path in any
process argv, and the obsolete pepper file removed.

**RU data residency verified 2026-09-10** by IP geolocation from the lead's machine: the box's public
IP geolocates to **Moscow, RU**, with **ASN AS197695 (REG.RU, Ltd)** and reverse DNS in reg.ru's
cloud-hosting domain — three corroborating signals. ⚠️ **The limits, stated:** only **one**
geolocation provider actually answered (a second returned RateLimited, so it is not a second data
point), and geolocation reports where an IP is **registered/announced**, **not** where the metal
physically sits. This is the normal standard of evidence for 152-ФЗ purposes; it is **not** a
physical-site attestation. The stale `Hetzner` comments in `setup.sh` / `update.sh` remain wrong.

### 🚨 Residuals that survive this close

1. ~~🔴 **THE RESTORE PATH HAS NEVER BEEN TESTED.**~~ ✅ **DISCHARGED 2026-09-11 BY TASK `0218` —
   struck, not deleted.** A backup **RESTORES**: proven twice against non-empty data, into a
   throwaway database **and into the live database in place**, both `IDENTICAL` on counts, content
   digests, both sequences, schema shape and three behavioural checks.
   ⛔ **THE REPLACEMENT IS NARROWER THAN "BACKUPS WORK", AND THIS IS THE PART TO CARRY:** the
   **SCHEDULE** and the **DATA** are proven **SEPARATELY, NEVER TOGETHER** — every cron-produced
   object that has ever existed is a dump of an **empty** database, and the only non-empty backup was
   **hand-run**. The measured RTOs are on 76 rows and **do not extrapolate**; the **weekly-copy path
   has never run** (task `0241`, first attempt Sunday 2026-09-13); and this bucket's backup history is
   **thin** — two objects before the drill, only one of them cron-produced.
   Full record: [[tasks/profile-durability-restore-drill]].
   *(Original text, kept: "*An encrypted object is produced and lands — proven. Nobody has ever proven
   one restores. The old bucket is gone and its objects were unreadable, so there is no historical
   restore to fall back on either.*" The last clause is unchanged and still true.)*
2. 🔴 **`/opt/profile/.internal_token` now holds a STALE, SUPERSEDED token.** The environment value
   wins (`setup-profile.sh:358-359`), so the persisted file was never rewritten. Harmless **only
   while** the secret env file carries the real value. **A future deploy with a BLANK value would
   silently fall back to the stale file** (`:360-362`) and re-break crediting in exactly the silent,
   XP-losing way described below. **Flagged to `0220`.**
3. 🔴 **`example.env.profile:92-93` is still wrong at HEAD.** It still says the token is
   *"auto-generated on the box if left blank"* — a live documentation defect that walks the next
   operator into the trap. Handed to a coder; **not fixed here, by instruction.**
4. 🔴 **The `/internal/` nginx allowlist is still the June game-prod egress IP.** If that IP is stale,
   **every credit call gets a silent 403** — a second barrier standing *behind* the 401, so fixing
   only the token would not be enough. The deploy laid the allowlist down dormant. **`0217` owns
   verifying it.**
5. **reg.ru console quirks, recorded so nobody repeats them:** the access-key list does not refresh
   after a key set is created, and the create form then rejects a duplicate name for a set the list is
   not showing (two sets were created before this was understood; the spare was deleted). The console
   exposed **no versioning or lifecycle setting** for the bucket — recorded as **UNKNOWN, not assumed
   either way**. And, correcting the plan: reg.ru access keys **are** viewable after creation.

### 🚨 The `PROFILE_INTERNAL_TOKEN` trap — the runbook was deliberately NOT followed

`0182` says the token may be *"left blank; the box auto-generates and persists it."* **It was not
followed, and the reason is not stylistic.** `internalAuth` is a `timingSafeEqual` over a **shared**
secret (`src/profile-server/InternalAuth.ts:14-19`, `:26`). A token the **box** mints, which the
**game server** does not hold, is a **401 on every credit call**; the client is fail-soft with **no
durable queue** (see [[decisions/adr-101-fail-soft-xp-crediting]]) ⇒ 🔴 **the XP is LOST, not
queued.** The token was generated once, explicitly, and recorded so both sides can carry the same
value.

> ⚠️ **CORRECTED 2026-09-10 — one half of the old wording here was REFUTED, and it is corrected rather
> than dropped.** This paragraph used to end *"…and nothing logs above `debug` ⇒ the XP is LOST, not
> queued, **and silently**."* 🔴 **The "silently" half is FALSE.** A 401 is a non-5xx, non-429 status,
> so `postWithRetry` **gives up immediately and logs at WARN** —
> `src/server/ProfileApiClient.ts:265-267`, `profile <path> returned <status>; not retrying` — and the
> caller warns a **second** time at `:147-149`, `credit batch failed after retries; N award(s) dropped
> (idempotent — a later retry is safe)`. ⇒ **Two WARN lines per failed batch.** ✅ **THE XP-LOSS HALF
> STANDS IN FULL AND IS NOT WEAKENED:** the awards are **dropped and never queued**. What changes is
> only that a failure is **visible in the logs to anyone reading them** — which nothing on this box
> currently does (`0219`, open). 🔒 Frame for those two citations: `src/server/ProfileApiClient.ts` is
> **clean at `HEAD` = `589249c`**, content-checked this turn.

### What the `0182` runbook got wrong

- 🚨 **The `0182 brief.md:136-137` citation is STALE — and it is the most-copied citation in this line
  of work.** It is cited as the token trap by `0215`'s own brief, by `0218`, and by the owner's
  project memory.

  🔴 **IT NEVER POINTED AT THAT TEXT — not at any commit where the citing sentence existed.** A
  producer's git archaeology (2026-09-10) found that commit **`879b2f4`** (2026-09-04) **wrote the
  citation and, in the same commit, inserted a correction banner above the target**, pushing the text
  down ~40 lines. **It shipped already pointing elsewhere.** Mechanism named by the producer:
  **"self-invalidation inside one commit"**, recorded in
  `ai-agents/knowledge-base/conventions/file-line-citations.md` as a confirmed recurrence of that
  convention's **failure mode 4**.

  ⚠️ **THIS PAGE'S OWN EARLIER DESCRIPTION WAS ALSO WRONG AND IS CORRECTED, NOT DELETED.** It read
  *"those two lines are a section header and a blank line"* — inherited verbatim from this task's
  worklog. **Half right.** Content-checked this turn: `0182 brief.md:136` is body prose —
  *"rate-limits certificate issuance, so do not run the deploy against a mispointed record."* — and
  `:137` **is** blank. **Neither is a section header.** ⛔ The earlier `:175`/`:207` numbers are
  **withdrawn**: they were read against a different frame and do not match the content today.

  ✅ **THE REAL FIX WAS TO STOP CITING THIS FILE BY LINE AT ALL.** `0182/brief.md` is **uncommitted**
  and moved **four times on 2026-09-10**. Two successive line-number sets were handed to this page in
  good faith and **both were stale before they could be written** — the second one twice over. 🔴 **A
  number that has to be re-derived every few hours is not a citation, it is a treadmill**, and
  chasing it a third time would have been the very failure
  `ai-agents/knowledge-base/conventions/file-line-citations.md` describes. **These anchors are
  CONTENT: greppable, and immune to line drift.**

  | Target | Find it by searching `0182/brief.md` for | What you land on |
  |---|---|---|
  | The correction banner | `STOP — CORRECTION` | its opening line, `🔴 **STOP — CORRECTION 2026-09-04. THE NEXT CODE BLOCK'S PROFILE_INTERNAL_TOKEN LINE IS WRONG…` |
  | The struck original sentence | `~~*"Optional — leave blank` | `~~*"Optional — leave blank; the box auto-generates and persists it."*~~ **That was true at T4i. It is FALSE now.**` — inside that banner |
  | The same claim in the code block | `#     "Optional — leave blank` | a `#` comment inside the **`.env.profile.secret`** block, under a `⚠️ SUPERSEDED 2026-09-04` header |
  | The corrected value line | `PROFILE_INTERNAL_TOKEN=` | `PROFILE_INTERNAL_TOKEN=<generate-once-set-identically-on-both-sides>` — the only unindented occurrence |

  📌 **Cross-checked 2026-09-10 against a 385-line `0182/brief.md`: each anchor matched exactly
  once.** Line numbers are **deliberately omitted** — see `schema.md` § *Citing source files*.
- **T11 — the `Restart=always` systemd unit** silently undoing a `docker compose down -v`. Confirmed
  real and load-bearing. **Documented nowhere in `0182`.**
- **The stale-`.internal_token` fallback** (`setup-profile.sh:358-368`). Confirmed. **Documented
  nowhere in `0182`.**

### `age` key custody — the `0218` acceptance gate, partly discharged
*(📌 **Closed out 2026-09-11:** `0218`'s step 2 — the custodian can read the key — is **discharged by
this task's evidence**. Its step 1 — custody written down **before** the first backup ran — closed as
**substance met, NOT a clean pass**: no timestamped artifact pins the intra-day ordering. The
second-copy weakness below was **CARRIED unchanged and accepted, not closed.**)*

Custodian: **Mark Dolbyrev**. Generated 2026-09-09 outside the repo. Primary copy in a cloud
messenger's saved messages; second copy in a second cloud messenger. ✅ **Readability was PROVEN, not
assumed** — the owner decrypted a test file using the copy retrieved **from storage**, not from the
original generated file, and confirmed it against `age-keygen -y`. That satisfies `0218`'s
live-readability gate.

🚨 **The custody weakness, recorded honestly.** The plan asked for an **OFFLINE** second copy; what
exists is a **SECOND CLOUD COPY**. Neither store is zero-knowledge, and **both may share a
phone-number recovery path** — so the two copies may not be two independent failure modes. **The owner
was shown this and chose it deliberately.** It is a knowingly accepted residual, and `0218` should
treat "two copies" as weaker than the count suggests.

📌 **`0218` did exactly that and CARRIED it forward UNCHANGED — it is residual 8 of the eight `0218`
closed with.** 🔴 **Owner ruling 2026-09-10: accepted as-is. ⛔ No remediation is proposed and none is
recommended.**

### What was NOT done

🔴 **The `0216` reachability spike was NOT run as part of this task**, though the brief's step 2 said
to run it from the box. The deploy proceeded without it and succeeded — and notably **registry
reachability was the one thing that failed** (transiently, on attempt 1), which is squarely inside the
spike's subject. `0216` was later **narrowed and closed separately on 2026-09-10** — see
[[tasks/profile-le-certificate-renewal-proof]].

## Related

- [[decisions/sprint-4]] — the sprint that owns this phase, and the owner-ruled `0218` → `0219` → `0217` work order that follows it
- [[tasks/profile-le-certificate-renewal-proof]] — task `0216`, the narrowed spike closed the same week; it proved the certificate **capability**, not monitoring
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, the runbook this task followed and whose drift it confirmed
- [[tasks/profile-vps-provisioning]] — task `0176`, the provisioning half of `setup-profile.sh` this task re-ran
- [[tasks/postgres-backup-routine]] — task `0189`, the backup machinery this task configured against a new bucket and key
- [[tasks/profile-durability-restore-drill]] — task `0218`, which discharged this task's residual 1: **a backup restores** (proven twice, 2026-09-11) — ⛔ but the **schedule** and the **data** remain proven only **separately**, and this task's `age` second-copy weakness was **carried, not closed**
- [[tasks/profile-cleanup-obsolete-secrets]] — task `0222`, the cleanup after this rebuild; it carries the standing that the **old** access key this task replaced will **deliberately not be revoked** — ⛔ closed by owner decision, **not** revoked and **not** scope-established
- [[tasks/citizenship-name-change]] — task `0067`, whose open question ("was migration `004` ever applied?") field **B8** settles: yes
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, whose on-box verification step was blocked on this task
- [[systems/player-profile-store]] — the backend this box serves
- [[decisions/profile-storage-strategy]] — the schema the four migrations lay down
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a 401 or 403 on the credit path loses XP instead of queuing it
- [[tasks/profile-backend-db-api]] — task `0185`, the T5 slice whose migrations `001`–`004` this task verified applied on the live box
- [[tasks/player-profile-store-investigation]] — the investigation that specified a dedicated profile host, settled here
- [[systems/architecture-overview]] — the technical authority, whose profile-tier section this close rewrote
- [[systems/project-brief]] — the product ground truth, whose standing "the profile host is unverified" caveat this close resolves
- [[decisions/sprint-backlog]] — where `0235` sits, whose owner-ruled *"after `0215`"* dependency this close discharges
