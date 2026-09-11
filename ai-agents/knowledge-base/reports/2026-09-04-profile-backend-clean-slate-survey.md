# Profile backend — wipe-and-rebuild-in-place survey (2026-09-04)

**Kind:** survey / plan grounding.
**Author:** fkit-producer, from an fkit-architect scope produced the same day.
**Status of the facts below:** established 2026-09-04 in an owner session. Owner rulings are marked
as such and are not re-litigated here.

🔒 **No values anywhere in this document.** Variable names, file names, script names and line numbers
only — never an endpoint, a bucket, a key, a password, or an IP.

> 📌 **Citation frame — read this before following any `file:line` below.** This report was written at
> commit `879b2f4` (2026-09-04); **its citations were never framed at write time.** On 2026-09-10 the
> **`0182`-runbook citations only** were re-derived by content against commit `589249c` (trap 1 and
> the "documents to correct" table). ⚠️ **Every OTHER `file:line` in this report is still unframed and
> unverified** — treat those as `879b2f4`-era numbers and re-derive before acting on one. Re-derive by
> opening the file and matching the described content — never by shifting the number. See
> [`conventions/file-line-citations.md`](../conventions/file-line-citations.md).

---

## 0. 🔴 THE REFRAME — read this before anything else, including any earlier version of this document

**This document was rewritten on 2026-09-04, the same day it was first written.** Its first version
was built on the ruling *"we don't have ANY profile-related VPS yet"* and scoped a **procurement**.
That framing is **superseded**.

### The reconciliation, stated as the honest answer

| Statement | When | Standing |
|---|---|---|
| *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)."* | 2026-09-04, earlier | **Recorded, not discarded** |
| *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* — confirmed on follow-up: *"Both exist — reuse them in place."* | 2026-09-04, later | ~~**Current**~~ 🚨 **SUPERSEDED AS TO THE BUCKET ONLY** — see the row below. **The VPS half still stands.** |
| 🚨 **A BRAND-NEW, CLEAN S3 bucket. NOT the existing one.** Given live in session, relayed through the spawning session. **Supersedes the row above AS TO THE BUCKET ONLY; the VPS is still reused in place.** | **2026-09-08** | 🔴 **CURRENT** |

⛔ **Do NOT read the first statement as a lie or an error.** Both are recorded, both are dated, and
the reconciliation that stands is:

> 🔴 ~~**A profile VPS and an S3 bucket PHYSICALLY EXIST and will be REUSED IN PLACE. What is on them —
> whether the stack is provisioned, whether anything is running, what data or backup objects they
> hold — is UNKNOWN AND UNVERIFIED.**~~
>
> 🚨 **CORRECTED — owner ruling 2026-09-08, superseding the above AS TO THE BUCKET ONLY:**
>
> 🔴 **The profile VPS PHYSICALLY EXISTS and WILL BE REUSED IN PLACE — unchanged; its state is still
> UNKNOWN AND UNVERIFIED. The S3 bucket is NOT reused — a BRAND-NEW, CLEAN bucket is created.** The
> **old** bucket still exists, its contents are still unverified, and it is now **fully separable**
> from the working setup.

**That gap between "hardware exists" and "nobody can say what state it is in" is not a contradiction.
It is the same uncertainty the owner has voiced all session:** *"I think I am completely lost here
about what was done and what wasn't."* This document is written for that reader. **Hardware
existence and provisioning state are two different facts, and only the first one is known.**

### What "clean slate" means now

🔴 **WIPE AND REBUILD ONTO EXISTING RESOURCES — NOT procure new ones.**

| | Before the reframe | Now |
|---|---|---|
| **P1 (`0215`)** | Order a box | **Verify what is on the existing box, wipe / re-provision in place, repoint as needed.** ✅ `setup-profile.sh` is idempotent and safe to re-run — exactly the shape this needs |
| **P1-spike (`0216`)** | Blocked behind procurement | ✅ **RUNNABLE TODAY** — it needed a box to run from, and there is one |
| **`0222`** | Decommission old infra | **Cleanup only** — purge obsolete secrets, and decide the disposition of the old encrypted objects. 🚨 **RESHAPED 2026-09-08:** ~~still sitting in the reused bucket~~ — they sit in a **SEPARATE, OLD, now-abandonable bucket**, so the decision gained a **third option** (abandon the whole old bucket). **UNANSWERED — the owner's** |
| **P0 (`0214`) spec** | A procurement choice | **Conditional: verify the existing box's actual spec, resize only if below the floor** |
| **The `age` key** | Closed by the fresh-start ruling | 🔴 **RE-OPENED — see §2** |

---

## 1. 🔴 The `age` key question RE-OPENS — and this is a correction to an earlier instruction

**This survey's first version recorded the `age`-key question as "closed by owner decision", on the
grounds that a fresh start abandons the old bucket. THAT WAS PREMATURE, AND IT IS BEING CORRECTED
HERE RATHER THAN QUIETLY DROPPED.**

~~**With the bucket reused in place, any pre-existing encrypted backup objects are still in it.**~~

🚨 **CORRECTED AGAIN — owner ruling 2026-09-08, given live in session and relayed through the spawning
session: a BRAND-NEW, CLEAN bucket. NOT the existing one. Supersedes the 2026-09-04 reuse ruling AS TO
THE BUCKET ONLY — the VPS is still reused in place.**

~~**The pre-existing encrypted objects sit in a SEPARATE, OLD bucket that the new backup path never
touches.**~~

🚨 **RETRACTED 2026-09-10 — NOT SUPERSEDED, RETRACTED. THERE WERE NO PRE-EXISTING ENCRYPTED
OBJECTS.** Owner ruling, given live in session and relayed through the spawning session, verbatim:
*"I've already deleted the old bucket, it was empty, we never had anything there."* **The old bucket
was EMPTY, always had been, and has now been deleted.**
⚠️ **This is a dated survey and the rest of it stands as written on 2026-09-04.** The correction is
recorded here, rather than in a separate file, because this report is what the briefs were derived
from — leaving the claim uncorrected here is how it gets re-derived.

- Those objects were encrypted to an `age` recipient whose **private identity has no recorded home** —
  every reference in this repository is policy: **no vault, no entry, no custodian, no second copy,
  no readability check.**
  ⚠️ **THIS BULLET IS NOT RETRACTED.** The lost old key is real.
- **When asked on 2026-09-04 what the `age` key was, the owner did not know.**
  ⚠️ **NOT RETRACTED.**
- ⇒ ~~**Without that private identity those objects are PERMANENTLY UNREADABLE.** They are dead weight
  in a bucket that is being paid for.~~
  🚨 **RETRACTED 2026-09-10 — the bucket was empty, so nothing was ever unreadable and nothing was
  ever being paid to store.** ⛔ **Do NOT extend this to the key itself: the old `age` identity is still
  lost, and `0218` still owns generating a NEW keypair and recording custodian, storage location and
  second copy as an acceptance criterion. The old key protected nothing — that is luck, not a
  control.**
~~🔴 **STILL OPEN and NOT closed by any of this: the OLD S3 ACCESS KEY MUST BE REVOKED AT THE PROVIDER**
(owned by `0222`). Overwriting the local value does not revoke it; deleting the bucket does not revoke
it.~~

🔒 **STALE AS OF 2026-09-11 — struck, not deleted. CLOSED BY OWNER DECISION: THE REVOCATION WILL
DELIBERATELY NOT BE DONE.** Owner ruling, given live in the lead session 2026-09-11, verbatim:
*"Forget about the old S3 keys, mark this task as cancelled."* (`0222` had already closed on
2026-09-10 carrying this as a knowingly accepted residual.) ⛔ **This is NOT an open item and NOT
outstanding work — do not pick it up or re-file it.** ⚠️ **And it is NOT "resolved": the key was never
revoked at the provider, and NOBODY ESTABLISHED ITS SCOPE — inert if bucket-scoped to the deleted
bucket, reaching the NEW backup bucket if account-wide. The objection was put to the owner and
OVERRULED TWICE, 2026-09-10 and 2026-09-11.** Full record in
`ai-agents/tasks/done/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md`.

🚨 **This is an owner decision, it is STILL LIVE, and on 2026-09-08 it CHANGED SHAPE:**

> ~~**Purge the old encrypted objects, or keep them pending a search for the old key?**~~
>
> 🔴 **RESHAPED 2026-09-08 — three options now, because a new bucket makes the old one separable:**
> **(a) purge the objects · (b) keep pending a search for the old key ·
> (c) 🆕 delete / abandon the OLD BUCKET ENTIRELY, once the new path is proven.**
>
> 🔴 **UNANSWERED. The owner's. An agent must not answer it.**

Owned by [`0222`](#) (cleanup) for the disposition, and by `0218` (P3) for everything about the
**new** key. **Do not let this slide a THIRD time** — closed prematurely 2026-09-04, re-opened the
same day, reshaped 2026-09-08, **never answered.**

~~🔴 **Separately and unchanged: the OLD S3 ACCESS KEY MUST BE REVOKED AT THE PROVIDER, and has not
been.** An overwritten local value is a live credential until revoked there. **Independent of what
happens to the old bucket** — required under all three options above. Owned by `0222`.~~

🔒 **STALE AS OF 2026-09-11 — struck, not deleted. CLOSED BY OWNER DECISION: DELIBERATELY NOT DONE**
(owner, verbatim: *"Forget about the old S3 keys, mark this task as cancelled."*). ⛔ **Not an open
item, not outstanding work.** ⚠️ **Still NOT "resolved": never revoked, scope never established,
objection OVERRULED TWICE (2026-09-10, 2026-09-11).** See `0222`'s brief.

---

## 2. Owner rulings, 2026-09-04 (all given live via `AskUserQuestion`)

1. 🔴 ~~**A profile VPS and an S3 bucket exist and are REUSED IN PLACE.**~~ *"We don't need to cancel
   any billings, the VPS and S3 I created will be reused."* Supersedes the earlier "no VPS"
   statement; both are recorded (§0).
   🚨 **AMENDED BY OWNER RULING 2026-09-08 (§0): the VPS is reused in place — unchanged — but the S3
   bucket is NOT. A BRAND-NEW, CLEAN bucket is created.** The old bucket still exists and its fate is
   `0222`'s open question.
2. **ALL phases P0–P7 go into Sprint 4.** The producer recommended P1+P2+P7 only; the owner chose all
   of it explicitly. The capacity risk is noted once (§7) and is not re-argued.
3. **`PROFILE_INTERNAL_TOKEN` stays deliberately blank for the upcoming game deploy** — citizenship
   is not ready.
4. **Spec: 2 vCPU / 4 GB / 60 GB NVMe** — ⚠️ **now conditional**, see §3.
5. **Hostname: REUSE the existing record** — see §3.
6. 🔴 **`0062` STAYS IN SPRINT 4.** The owner chose this **over the producer's recommendation to move
   it to the Backlog board.** Recorded; **not re-argued.**
7. 🔴 **The deploy forget-risk gets NO GUARD TASK.** Owner, verbatim: *"Neither — I'll just
   remember."* See §6.
8. **Check whether `0067`'s profile-server half ever deployed** — see §8.

---

## 3. The two decisions that are now settled, with their reasoning

### Spec — 2 vCPU / 4 GB / 60 GB NVMe, CONDITIONALLY

⚠️ **The action changed even though the reasoning stands.** That number was chosen as a
**procurement** target; the box already exists. So the decision is now:

> **Verify the existing box's actual spec. Resize ONLY if it is below that floor.**

**The reasoning — recorded because it discharges this survey's own standard.** An earlier version of
`0214` rejected *"we used the runbook's recommendation"* as an answer, on the grounds that the
runbook's recommendation is itself unsized. That objection is now **answered with a measurement**:

| Input | Value |
|---|---|
| Multiplayer match starts, measured from production analytics this session | **87.61K over 30 days (~2,900/day)** |
| Profile writes per player-match | ~2 (upsert at join, XP credit at end) |
| ⇒ Writes/day | **~6,000** |
| ⇒ Average write rate | **~0.07/sec** |
| ⇒ At 10× peak | **under 1/sec** |

**Conclusion: the box is sized by baseline overhead, not by workload.** 4 GB is comfortable for
Postgres + a Node API at this volume.

⚠️ **RECORD THE CAVEAT WITH THE NUMBER — it is an estimate, not a measurement of writes.** It assumes
**one `GAME_MODE_MULTIPLAYER` event equals one player-match**, and it counts **only players carrying
a Yandex ID**. Anyone quoting ~6,000 writes/day must quote these two assumptions with it.

### Hostname — REUSE the existing record

**New architectural reason from the owner, recorded because it explains why the `api.` subdomain is
not incidental:**

> 🔴 **Yandex Games permits only ONE main domain for an iframe game, so everything must route through
> subdomains of that domain.**

The profile API is therefore **structurally required** to live on a subdomain of the game's domain.
This is not a convenience choice and should not be re-opened as one. The A record still resolves.

⚠️ **Standing caution, recorded alongside it: a record resolving proves NOTHING about a server
running.** DNS resolution is not a health check.

---

## 4. What exists, what was never proven, and what is now merely unverified

| | State |
|---|---|
| **Exists in the repo, written and merged** | `setup-profile.sh` (1,025 lines) — provisions a bare Ubuntu box *and* deploys the stack; **idempotent, safe to re-run.** `build-deploy-profile.sh` (575 lines) — hardened two-hop deploy driver. `Dockerfile.profile`. `profile-backup.sh` — including a scripted restore at `:192-262`. `src/profile-server/` — the API, including `/ready` at `Routes.ts:198-207`. `migrations/001`–`004` + `migrate.ts` (idempotent, `schema_migrations`-tracked). `example.env.profile`. A complete operator bring-up runbook at `0182`. Off-box encrypted backups, which **fail closed at deploy** (`setup-profile.sh:889-908`). |
| **Exists physically, state UNKNOWN** | 🔴 **The profile VPS and the OLD S3 bucket.** They exist. ✅ **The VPS is being reused.** 🚨 **CORRECTED 2026-09-08 — the OLD bucket is NOT being reused; a brand-new, clean bucket is created, and the old one is separable and its fate is `0222`'s open question.** Whether the stack is provisioned, what is running, what schema version the DB is at, and what objects the bucket holds are **all unverified** — see §5. |
| **Never run in production, or never proven** | The restore path has never been exercised against non-empty data. `PROFILE_INTERNAL_TOKEN` has never been forwarded to production with a real value. `YANDEX_PAYMENTS_SECRET` has never been confirmed non-empty on the box. Four shell test harnesses exist and **nothing runs any of them**. No monitoring, no uptime check, no reader of the backup-freshness file. |
| **Believed true, standing corrected** | ~~"The profile backend is live."~~ **That claim is UNVERIFIED — not disproven, and no longer claimable.** ⚠️ **An earlier annotation pass on 2026-09-04 wrote "there is NO profile VPS" into ten files; that overstated the case and every one of those annotations has been re-corrected** to the accurate position: **hardware exists, provisioning state unknown.** |

### The work is smaller than "rebuild" suggests

Three framing assumptions were checked and are **wrong**:

| Assumption | Reality |
|---|---|
| `/ready` was never built | It **was** — `src/profile-server/Routes.ts:198-207` |
| No scripted restore exists | One **does** — `profile-backup.sh:192-262` |
| Off-box encrypted backups were never wired | They **were**, and they **fail closed at deploy** — `setup-profile.sh:889-908` |

**The honest shape: inspect what is there, wipe and re-run one existing idempotent command, close
five gaps.** It is neither a greenfield build nor a procurement.

---

## 5. 🔴 CURRENT BOX STATE — UNKNOWN PENDING INSPECTION

**The owner can inspect the box directly and has been given a read-only command set.** Results slot
into `0215`'s brief when they arrive. **Until then, every field below is UNKNOWN, and no plan may
assume a value for one.**

| Field | How it is read | Current value |
|---|---|---|
| Deploy role marker | `/etc/geoconflict-deploy-role` | ❓ UNKNOWN |
| Is the stack directory there | `ls /opt/profile/` | ❓ UNKNOWN |
| Are containers running / healthy | `docker compose ps` | ❓ UNKNOWN |
| Has a backup ever completed, and when | `last-backup.json` | ❓ UNKNOWN |
| Swap configured | `swapon` | ❓ UNKNOWN |
| Firewall posture | `ufw status` | ❓ UNKNOWN |
| Actual spec vs the 2 vCPU / 4 GB / 60 GB floor | `nproc` / `free` / `df` | ❓ UNKNOWN |
| **DB schema version — has migration `004` been applied?** | `schema_migrations` table | ❓ UNKNOWN — **see §8** |
| **What objects the ~~reused~~ OLD bucket holds** 🚨 **2026-09-08: NOT reused — a new bucket is created; this probe concerns the OLD bucket only and no longer gates the new backup path** | old-bucket listing | ❓ UNKNOWN — **see §1** |

⚠️ **This table is the single most useful artifact in this survey.** The owner's complaint is not that
the work is hard; it is that nobody can say what state things are in. **Filling this table in IS the
answer to that complaint.**

---

## 6. The deploy forget-risk — decided, and deliberately left unguarded

**The risk:** the local `.env.prod` holds a **non-empty** `PROFILE_INTERNAL_TOKEN`. Blanking it
before a deploy is a **manual step with no automated guard**, and a populated file at deploy time
**silently enables profile upsert and XP crediting in production.** ⚠️ `npm run check:config-parity`
does **not** catch this — it compares **names**, and `deploy.sh:312` forwards this one correctly.

🔴 **Owner ruling: NO GUARD TASK. Verbatim: *"Neither — I'll just remember."*** They will blank the
value by hand at each deploy.

⛔ **This is a decision, not an oversight. Do not file a task for it, and do not re-recommend one.**
The accepted risk is recorded on `0062`'s brief and on `0217`, where a deployer will actually see it.

---

## 7. 🔴 THREE TRAPS — silent-failure landmines

These are prominent because each fails **silently** and two sit on the same code path.

### Trap 1 — `0182`'s runbook will break `0062` if followed as written

`0182`'s runbook said of `PROFILE_INTERNAL_TOKEN`: *"Optional — leave blank; the box
auto-generates and persists it."*

> 📌 **CITATION CORRECTED 2026-09-10. This paragraph originally cited `0182/brief.md:136-137`, and
> that number was WRONG THE DAY IT WAS WRITTEN.** It was true of the runbook at `282655c`, but the
> same commit that published this survey (`879b2f4`, 2026-09-04) also inserted the correction banner
> into `0182` **above** those lines — so the citation shipped already pointing elsewhere, and was then
> copied into four more documents.
> **Read against `589249c` + the 2026-09-10 citation sweep (that sweep moved `0182`'s lines down):** the struck original sentence is at `0182/brief.md:185` (that line holds
> `~~*"Optional — leave blank; the box auto-generates and persists it."*~~`); the same sentence is
> quoted inside the `.env.profile.secret` code block at `0182/brief.md:241`; the correction banner
> runs `0182/brief.md:182-231`; the corrected value line is `0182/brief.md:248`. At `589249c`,
> `0182/brief.md:136` is the section header `## 3. Confirm SSH access to the box` and `:137` is blank.
> ⚠️ **Failure mode 4** of
> [`conventions/file-line-citations.md`](../conventions/file-line-citations.md) — wrong from birth,
> then carried forward faithfully. **Re-derive by content, never by shifting the number.**

**That was true at T4i. It is FALSE now.** `internalAuth` is a `timingSafeEqual` over a **shared**
secret (`src/profile-server/InternalAuth.ts:14-19`, `:26`). A token the box generates for itself,
which the game server does not hold, produces a **401 on every credit call**. The profile client is
fail-soft with **no durable queue** (ADR-101), so the XP is **lost, not queued**, and nothing logs
above `debug`.
🚨 **CORRECTED 2026-09-10 — the *"nothing logs above `debug`" / "silently swallowed"* half is REFUTED against the source.** A 401 (and a 403) is a non-5xx, non-429 4xx, so `postWithRetry` stops immediately and logs at **WARN — twice per failed batch**: `src/server/ProfileApiClient.ts:265-267` (`` `profile ${path} returned ${response.status}; not retrying` ``, inside the `status < 500 && status !== 429` guard at `src/server/ProfileApiClient.ts:264`) and `src/server/ProfileApiClient.ts:146-149` (`` `credit batch failed after retries; N award(s) dropped …` ``). **Frame `589249c` — `ProfileApiClient.ts` is clean at that commit, so these two numbers are stable.** ⛔ **THE XP-LOSS HALF IS UNTOUCHED AND STANDS IN FULL — the awards are DROPPED, never queued.** 🔴 It still goes unnoticed, because **nothing on that box reads the logs** (`0219`, **OPEN**) — **a warning nobody reads fails as quietly as no warning at all.**

➡️ **`0182` has been annotated in place.**

### Trap 2 — `PROFILE_INTERNAL_ALLOW_IPS` is pinned to a June egress IP

`example.env.profile:33` carries a game-prod egress IP from June. nginx enforces
`allow …; deny all;` at `/internal/` (`setup-profile.sh:719-720`). A stale value ⇒ **403 on every
credit call**, ~~also silently swallowed~~. 🚨 *Corrected 2026-09-10: a 403 is also a non-5xx, non-429 4xx, so it takes the SAME two-WARN path as the 401 (`src/server/ProfileApiClient.ts:265-267`, `:146-149`, frame `589249c`). **Not swallowed — logged and unread** (`0219`, open). The barrier itself is unchanged.*

**Traps 1 and 2 are two independent silent barriers on the same path.** `0062`'s D3 — an actual
authenticated call working end to end — is the only check that catches either.

### Trap 3 — rotating `POSTGRES_PASSWORD` against an existing data volume breaks auth

The Postgres image applies that variable only at initdb. ⚠️ **Under the reframe this trap gets MORE
likely, not less** — a wipe-and-rebuild onto an existing box is precisely the situation where a data
volume may survive while the password is regenerated. **Decide explicitly whether the volume goes.**

### Also: `0195`'s persistence finding is broader than `0195` recorded

`0195` recorded that `YANDEX_PAYMENTS_SECRET` has no on-box persistence. The architect verified the
**same is true of `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID` and `TELEGRAM_PROXY_URL`**
(`setup-profile.sh:392-395`), which do not follow the persist-or-reuse pattern at
`setup-profile.sh:357-368`. `POSTGRES_PASSWORD` is **exempt** — required, fails closed.

---

## 8. 🆕 `0067`'s profile-server half — what the repo CAN and CANNOT tell us

**Owner-approved investigation, 2026-09-04.** `0067` (Name Change, Citizens Only) shipped a client
half **and** a profile-server half. The client half is in the live game release `362a2f9`. The
server half ships in a **separate image to the profile box.**

### Determined from the repository ✅

| Finding | Evidence |
|---|---|
| Migration `004_name_change.sql` **exists** and is merged | `migrations/004_name_change.sql`, added in `d442ac2` |
| Three name-change routes **exist** and are merged | `src/profile-server/Routes.ts:739` (`POST /v1/profile/name-change-request`), `:784` (`POST /v1/profile/name-change-cancel`), `:~850` (`POST /internal/v1/name-change/decide`) |
| Migrations run **at deploy time**, not at boot | `src/profile-server/Server.ts:11` — *"DB migrations run at deploy time via `npm run migrate`"* |
| ✅ **Re-running migrations is SAFE** | `migrate.ts:5-6` — applies `migrations/*.sql` once in lexical order inside a transaction, records each filename in `schema_migrations`, **so re-runs are no-ops** |
| The game deploy `362a2f9` is **NOT** a profile deploy | `git show --stat 362a2f9` touches only `package.json` and `package-lock.json` — a game version bump |
| A profile deploy leaves **no record in git** | It runs through `build-deploy-profile.sh` against the box; nothing is written back to the repository |

### ⛔ NOT determinable from the repository — requires inspecting the box

> **Whether `0067`'s profile-server half was ever deployed CANNOT be answered from this repository.**
> There is no artifact in git that records a profile-image deploy.

**Two checks on the box settle it**, and both belong in `0215`'s inspection (§5):

1. **Does `schema_migrations` contain `004_name_change.sql`?**
2. **Does the running image serve the three name-change routes?**

### 🚨 Consequence for `0217` (P2), stated plainly

**`0217` may need to carry a migration nobody has applied.** If `004` was never applied, the
name-change routes will fail against a schema that lacks their tables — and `0067` is already closed
as `✅ Done (agent-closed — not owner-verified)`, so nothing else is watching for this.

✅ **The mitigation is cheap and already built:** `migrate.ts` is idempotent, so **running it is safe
whether or not `004` is already applied.** The right move is to run it, not to investigate first.

---

## 9. Verified gaps

| # | Gap | Severity | Phase |
|---|---|---|---|
| G1 | **No container log rotation on the profile box.** `setup-profile.sh` never writes `daemon.json`, and the compose file declares no `logging:` block ⇒ unbounded `json-file`. `ai-agents/knowledge-base/container-log-retention.md:5-6` says outright *"The profile and telemetry boxes are not covered here."* | **HIGH** — this is the exact class that filled the game prod disk | P4 |
| G2 | **No image prune** on the profile box; storage grows every redeploy | Medium | P4 |
| G3 | **No monitoring or alerting of any kind.** No OTEL by design (`src/profile-server/Logger.ts:5-8`), no uptime check, and **nothing reads `last-backup.json`**. Cron mails root only with an MTA, which nothing installs | **HIGH** — a backup that stops is invisible while the 14-day prune keeps deleting | P4 |
| G4 | **Restore never proven against real data.** `ai-agents/knowledge-base/profile-backup-restore-runbook.md:147-153` (frame `589249c`, the "Recorded RTO" paragraph) records the 2026-07-01 drill — 📌 *corrected 2026-09-10 from a bare `Runbook :147-153`, which readers resolved to `0182`'s brief, where that range is the `## 4. Configure the deploy` header*: the prod DB was still **empty (0 rows)**, so a non-empty round-trip was never verified — and the drill **predates the default-deny guard**, so its command line no longer works. The runbook's own gate: *"A backup that has never been restored is not a backup."* | **HIGH** | P3 |
| G5 | **The `age` private key has no recorded home** — 🔴 **STILL LIVE, not closed.** ~~with the bucket reused~~ 🚨 **CORRECTED 2026-09-08 — the bucket is NOT reused; the old objects sit in a separate, abandonable bucket, which reshapes the disposition question but does NOT close it.** ⚠️ **The NEW key's custody (P3) is entirely unaffected and remains CRITICAL.** See §1 | **CRITICAL** | P3 + `0222` |
| G6 | **No OS baseline hardening** — no `unattended-upgrades`, no `fail2ban`, no sshd hardening, no non-root deploy user; deploy runs as root by default | Medium | P6 |
| G7 | **Restart policy diverges.** Compose uses `restart: on-failure` (`setup-profile.sh:405`, `:427`); the game box uses `--restart=always` (`update.sh:64`). `on-failure` does **not** bring containers back after a **Docker daemon restart** | Medium | P6 |
| G8 | **No graceful shutdown** — `src/profile-server/Server.ts` installs no SIGTERM handler and never closes the pool | Low — mitigated by the credit ledger's idempotency PK | P6 |
| G9 | **Config parity is name-only and report-only at deploy.** `--enforce` is built and wired to nothing; blind spot R1 is unfixed; `0203` holds the ten pre-arming items | Medium | P5 / `0203` |
| G10 | ~~No capacity data anywhere~~ ✅ **CLOSED 2026-09-04** — measured: ~2,900 matches/day ⇒ ~6,000 writes/day ⇒ ~0.07/sec. **Sized by baseline overhead, not workload.** ⚠️ Carry the two assumptions with the number (§3) | Resolved | P0 |
| G11 | **Nothing provisions the box itself** — no Terraform, no cloud-init. ⚠️ **Less relevant under the reframe** (the box exists), but still true for any future box. **By design** | By design | — |
| G12 | **`PROFILE_ID_PEPPER` is still set** in the local secret env file, although the ID-hashing approach was abandoned and reverted (`0187`, cancelled). Obsolete secret still held | Low, hygiene | `0222` |
| G13 | **Four shell test harnesses exist and nothing runs any of them** — see §11 | **HIGH leverage** | P7 |
| G14 | 🆕 **`0067`'s profile-server half may never have been deployed** — undeterminable from the repo; `004` may be unapplied. See §8 | Medium | P1 inspect / P2 |

---

## 10. Phases and dependency shape

Owner-ruled: **all of these are Sprint 4.**

| Phase | Task | Effort | Risk |
|---|---|---|---|
| **P0 — Decisions** | `0214` | ~0 eng | — |
| **P1-spike — RU reachability** | `0216` | 1–2 h | **UNKNOWN** — ✅ **runnable TODAY** |
| **P1 — Inspect, wipe, re-provision in place** | `0215` | 0.5–1 day if nothing surprises; 2–3 days if it does | Medium-High |
| **P2 — Wire the game server** | `0217` | 2–4 h + a deploy window | Medium |
| **P3 — Durability proof** | `0218` | 0.5 day + an owner action | **High** |
| **P4 — Operability** | `0219` | 1 day | Low technically, **HIGH by consequence** |
| **P5 — Secret persistence + value parity** | `0220` | 0.5–1 day | Medium |
| **P6 — OS hardening** | `0221` | 0.5–1 day | Low-Medium |
| **P7 — Gate the shell harnesses** | **`0201`** (existing, Phase 2) | 2–4 h | Low — **startable today** |
| **Cleanup — obsolete secrets + old-object disposition** | `0222` | ~0.5 day, mostly owner | Low, but carries the 🔴 `age` decision |

**Dependency shape:**

```
P0 (0214) → P1 (0215) → P2 (0217) → 0062 verified → 0017 / 0012 live tails
                                                   + 1 of 0065's 3 conditions
              │
              ├── P3 (0218)   ├── P4 (0219)   ├── P5 (0220)   └── P6 (0221)

P1-spike (0216) — ✅ RUNNABLE TODAY, no longer gated behind procurement. Its result can still
                  change P1's SHAPE (a registry mirror, or a DNS-01 rework), not just its pace.
P7 (0201)      — independent, startable NOW.
Cleanup (0222) — owner action, not engineering sequence. 🔴 Carries the re-opened age-key decision.
```

---

## 11. P7 — why it is the highest leverage per hour

**Four** shell harnesses exist and **nothing runs any of them**:

| Harness | What it guards |
|---|---|
| `tests/scripts/profile-deploy-hardening.test.sh` (T1–T10) | **The only test of the script that carries credentials to production.** It sat broken for ~2 months and nobody noticed |
| `tests/profile-backup-dryrun.sh` | The backup path |
| `tests/profile-backup-redeploy.sh` | Backup behaviour across a redeploy |
| `scripts/test-check-docker-secret-boundary.sh` | The build-context secret boundary. ⚠️ Its header requires Docker |

Attachable via `posttest`. **Needs no box, no CI, no Docker daemon, no DB.**

---

## 12. Capacity risk — stated once, not re-argued

The producer's recommendation was **P1 + P2 + P7 only** for Sprint 4. **The owner ruled all of
P0–P7 in, explicitly, over that recommendation.** The risk being accepted: Sprint 4 already carries
an open live-verification tail (`0017`, `0012`, `0065`, `0062`, `0064`), and P0–P7 adds roughly
4–8 engineering days plus owner actions. ✅ **The reframe reduces this somewhat** — no procurement
wait, and `0216` can start today. **This paragraph is the whole of the objection.**

---

## 13. Stale-claim corrections, and the correction to the corrections

All corrections are **strike-not-delete and dated**.

⚠️ **These files were annotated TWICE on 2026-09-04.** The first pass wrote *"there is NO
profile-related VPS"*; the reframe made that **overstated**, and every one was **re-corrected** to
the accurate position: **hardware exists; provisioning state is unknown and unverified; "the profile
backend is live" is not claimable.**

| File | Line(s) |
|---|---|
| `ai-agents/knowledge-base/PROJECT.md` | `:181` |
| `ai-agents/sprints/plan-sprint-4.md` | the `0195` row, the profile-store status para, the T4 line, the T4i line |
| `ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` | `:69`, `:83` |
| `ai-agents/tasks/done/0191-citizenship-xp-progress-ui/brief.md` | `:90` |
| `ai-agents/tasks/cancelled/0187-profile-hash-player-ids/brief.md` | `:12` |
| `ai-agents/tasks/backlog/0064-deploy-time-config-parity-guard/brief.md` | `:244` |
| `ai-agents/tasks/done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md` | `:72`, `:89`, `:169`, `:187` |
| `ai-agents/knowledge-base/architecture.md` | the topology diagram (the text at `:602-628` is **fine** — it describes what the scripts do) |
| `ai-agents/tasks/done/0182-…-bring-up-runbook/brief.md` | the **trap 1** token guidance, the backup limitation, plus the top banner. 📌 *Line numbers corrected 2026-09-10 (0182 numbers are POST-sweep): this row read `:136-137` and `:219`, both WRONG — at `589249c` `:136` is `## 3. Confirm SSH access to the box` and `:219` is `## 5. Run the deploy`. The token guidance is `0182/brief.md:185` and `0182/brief.md:241`, under the banner at `0182/brief.md:182-231`; the backup-limitation correction is `0182/brief.md:335-339`.* |

⚠️ **`ai-agents/wiki-vault/wiki/systems/project-brief.md:64` carries the same stale claim and was
DELIBERATELY NOT EDITED.** That vault is `fkit-wiki`'s exclusive write surface (ADR-005). **Route it
to `fkit-wiki`** — and route the **reframed** wording, not the first pass's overstatement.

### On `0195` specifically

**Its code fix stands.** What is corrected is its **production narrative** — *"every payment route
returns 503 on the real box"* was never verified against a running box. Do not read the correction as
a finding against the fix.

---

## 14. Open questions for the owner

| # | Question | Owned by |
|---|---|---|
| Q1 | ✅ **ANSWERED** — spec ruled 2 vCPU / 4 GB / 60 GB NVMe, **conditional on verifying the existing box** (§3) | `0214` |
| Q2 | ✅ **ANSWERED** — reuse the existing record; Yandex Games permits only one main domain (§3) | `0214` |
| Q3 | **Who is the custodian of the NEW `age` private identity, where does it live, where is the second copy?** Due **before the first backup runs** | `0218` (P3) |
| Q3b | 🔴 **STILL OPEN, and RESHAPED 2026-09-08 — what happens to the OLD encrypted objects, and now to the OLD BUCKET itself?** ~~in the reused bucket~~ **Three options: (a) purge the objects · (b) keep pending a search for the old key · (c) 🆕 abandon the whole old bucket.** **Unreadable without the old key.** ⛔ **UNANSWERED — the owner's.** See §1 | `0222` |
| Q3c | ~~🔴 **NOT A QUESTION — A STANDING ACTION, NOT DONE: revoke the OLD S3 access key AT THE PROVIDER.** An overwritten local value is still live. **Independent of Q3b's outcome.**~~ 🔒 **CLOSED BY OWNER DECISION 2026-09-11 — DELIBERATELY NOT DONE** (*"Forget about the old S3 keys, mark this task as cancelled."*). ⛔ **No longer a standing action; not outstanding work.** ⚠️ **NOT "resolved": never revoked, scope never established (inert if bucket-scoped, reaching the NEW bucket if account-wide), objection OVERRULED TWICE.** | `0222` (closed) |
| Q4 | What is the current game-prod egress IP for `PROFILE_INTERNAL_ALLOW_IPS`? The pinned value is from June | `0217` (P2) |
| Q5 | ✅ **ANSWERED** — ~2,900 matches/day ⇒ ~6,000 writes/day (§3, with its two caveats) | `0214` |
| Q6 | Registry / `get.docker.com` / apt / Let's Encrypt reachable from reg.ru Moscow? | `0216` — ✅ **answered by running the spike, which can run today** |
| Q7 | ~~What is still billing, what should be cancelled?~~ ✅ **CLOSED** — owner: *"We don't need to cancel any billings."* **Nothing is decommissioned.** | `0222` |
| Q8 | Should P5's secret-persistence work be its own brief, or folded into P1? Filed separately as `0220`; the owner may fold it | `0220` (P5) |
| Q9 | 🆕 **Was `0067`'s profile-server half ever deployed — is migration `004` applied?** ⛔ **Not answerable from the repo**; two box checks settle it (§8) | `0215` inspect / `0217` |

**Q3 and Q3b are the two that must not slide.**

---

## 15. What was deliberately NOT done

- **No task was closed, moved or cancelled.** No mover skill was invoked.
- **`ai-agents/wiki-vault/` was not touched** — one stale claim there is listed in §13 for routing.
- **Nothing was committed or pushed.**
- **No row was inserted above a closed row** (ADR-035). New Sprint 4 rows are appended at the bottom;
  corrections to closed rows are prose-only, in place.
- **No guard task was filed for the deploy forget-risk** — owner-ruled (§6).
</content>
