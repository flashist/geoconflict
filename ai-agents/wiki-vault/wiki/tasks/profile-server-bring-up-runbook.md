# Profile Server Bring-Up Runbook

**Source**: `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4i

## Goal

Provide the operator runbook for turning the merged profile deploy machinery into a live `https://api.geoconflict.ru/health` service on the real reg.ru VPS.

## Key Changes

- Specifies the production VPS shape: reg.ru Moscow/RU, Ubuntu 22.04, 2 vCPU, 4 GB RAM, 60 GB disk, script-managed 4 GB swap, and SSH key access.
- Requires the `api.geoconflict.ru` A record to point at the VPS before deploy so DNS and Let's Encrypt validation pass.
- Documents `.env.profile` and `.env.profile.secret` inputs, including registry credentials, `PROFILE_INTERNAL_ALLOW_IPS`, SSH key path, and recording `POSTGRES_PASSWORD` in a team password manager.
- Defines the operator deploy command, `npm run deploy:profile`, and explains the local build/push, remote setup, secret staging, health gate, and rollback flow it triggers.
- Captures acceptance checks: HTTPS `/health` returns 200 with a valid cert, compose services are healthy, UFW exposes only SSH/HTTP/HTTPS, the deployed image is digest-referenced, no secrets appear in box argv, and the box geolocates to RU.
- Records the original known non-blockers: local weekly backups only, no off-box monitoring yet, no image auto-prune, and no container cgroup memory cap. The backup follow-up has since shipped as [[tasks/postgres-backup-routine]].

## Outcome

> # 🔴 UPDATED 2026-09-10 — THE HOST IS SERVING AGAIN, AND THIS RUNBOOK'S DRIFT IS NOW MEASURED
>
> Task `0215` used this runbook as its primary reference, found the box **already live and healthy**,
> and re-provisioned it in place on an **owner ADOPT ruling** — **no wipe**. `/health` and `/ready`
> both **200** over a valid certificate, lead-verified. **This resolves the "still serving? unverified"
> annotation below.** See [[tasks/profile-box-adopt-and-reprovision]].
>
> ## 🚨 THREE CONFIRMED DRIFTS — the runbook's own brief told the next reader to expect at least one
>
> 1. 🔴 **THE `0182 brief.md:136-137` CITATION IS STALE, AND IT IS THE MOST-COPIED CITATION IN THIS
>    LINE OF WORK.** It is cited as the `PROFILE_INTERNAL_TOKEN` trap by `0215`'s brief, by `0218`, and
>    by the owner's project memory.
>
>    🚨 **IT NEVER POINTED AT THAT TEXT — not at any commit where the citing sentence existed.** A
>    producer's git archaeology (2026-09-10) found that commit **`879b2f4`** (2026-09-04) **wrote the
>    citation AND, in the same commit, inserted a correction banner above the target**, pushing the
>    text down ~40 lines. **It shipped already pointing elsewhere.** The producer named the mechanism
>    **"self-invalidation inside one commit"** and recorded it in
>    `ai-agents/knowledge-base/conventions/file-line-citations.md` as a confirmed recurrence of that
>    convention's **failure mode 4**.
>
>    ⚠️ **A PRIOR DESCRIPTION ON THIS PAGE WAS ALSO WRONG AND IS CORRECTED HERE, NOT DROPPED.** It read
>    *"those two lines are a section header and a blank line"* — inherited from `0215`'s worklog.
>    **Half right.** Content-checked this turn: `0182 brief.md:136` is body prose —
>    *"rate-limits certificate issuance, so do not run the deploy against a mispointed record."* — and
>    `:137` **is** blank. **Neither is a section header.** ⛔ The earlier claim about `:175`/`:207` is
>    **withdrawn**: those numbers were themselves read against a different frame and do not match the
>    content today.
>
>    ✅ **The real targets, content-matched line by line this turn.** 🔴 **Frame: the UNCOMMITTED
>    ✅ **THE FIX IS TO STOP CITING THIS FILE BY LINE. These anchors are CONTENT, not numbers —
>    greppable, and immune to the drift that produced the defect.** `0182/brief.md` is **uncommitted**
>    and moved **four times on 2026-09-10 alone**; two successive line-number sets handed to this page
>    were stale before they could be written. **A number that must be re-derived every few hours is not
>    a citation, it is a treadmill.**
>
>    | Target | Find it by searching `0182/brief.md` for | What you will land on |
>    |---|---|---|
>    | The struck original sentence | `STOP — CORRECTION` | the banner's opening line; the struck sentence is the third line inside it |
>    | — | `~~*"Optional — leave blank` | the struck sentence itself: `~~*"Optional — leave blank; the box auto-generates and persists it."*~~ **That was true at T4i. It is FALSE now.**` |
>    | The same claim quoted in the code block | `#     "Optional — leave blank` | a `#` comment inside the **`.env.profile.secret`** block, under a `⚠️ SUPERSEDED 2026-09-04` header |
>    | The corrected value line | `PROFILE_INTERNAL_TOKEN=` | `PROFILE_INTERNAL_TOKEN=<generate-once-set-identically-on-both-sides>` — the only unindented occurrence |
>
>    📌 **Cross-checked 2026-09-10 against a 385-line `0182/brief.md`: all four anchors matched
>    exactly once each.** Deliberately **not** recorded as line numbers here — see
>    `schema.md` § *Citing source files*.
>
>    ➡️ **RE-DERIVE THIS CITATION BY CONTENT, NEVER BY LINE NUMBER, AND NEVER SHIFT THESE NUMBERS
>    ARITHMETICALLY.** That is the entire lesson of the defect
>    (`ai-agents/knowledge-base/conventions/file-line-citations.md`).
> 2. **T11 — the `Restart=always` systemd unit** (`setup-profile.sh:759-776`) silently restarts the
>    stack and would undo a `docker compose down -v`. **Confirmed real and load-bearing** (`0215`
>    defeated it by stopping the unit first). **Documented nowhere in this runbook.**
> 3. **The stale-`.internal_token` fallback** (`setup-profile.sh:358-368`). Supplying the token via the
>    environment leaves a **stale persisted value** that a later blank-valued deploy would silently
>    re-adopt — re-breaking crediting in exactly the silent, XP-losing way. **Confirmed; documented
>    nowhere in this runbook.** Flagged to task `0220`.
>
> ⚠️ **`example.env.profile:92-93` is STILL WRONG at `HEAD`** — it still tells the reader the token is
> *"auto-generated on the box if left blank"*. **A live documentation defect** that walks the next
> operator into the trap. Handed to a coder; not fixed by `0215`.
>
> 🚨 **A FIFTH STALE CITATION, FOUND BY THIS PAGE'S OWN CHECK ON 2026-09-10 AND ON NOBODY'S LIST.**
> This bullet used to read **`0182 brief:293-297`** for the *"backups are local + weekly"* line.
> **Content-matched: that range now lands on a `ps -ef` secret-hygiene spot-check code block, not on
> backups at all.** Same file, same defect class as drift 1 — and it went unnoticed because the
> attention was on the `:136-137` copies. ✅ **Now cited by content:** search `0182/brief.md` for
> `Backups are local + weekly` — the line is **already struck and superseded in place**, and it is the
> only match. ⚠️ **Nothing further in that section was found drifted, but that was a light check, not
> an audit.**
>
> 🔴 **STORAGE, CORRECTED 2026-09-08 (owner ruling):** the S3 bucket is **NOT** reused. A **brand-new,
> clean bucket** was created — superseding the 2026-09-04 reuse ruling **as to the bucket only**; the
> **VPS half is unchanged**. The owner had already deleted the old bucket. ⇒ **All six backup values
> are new.** `0222`'s question **reshaped and is still UNANSWERED**: purge the objects · keep pending a
> search for the old key · 🆕 abandon the whole old bucket. **The old S3 access key still has to be
> revoked at the provider and has not been.**
>
> 🔴 **What this runbook still cannot get you: a proven recovery path.** *"Backups are working"* means
> **encrypt-and-upload only** — `0218` is open. See [[tasks/postgres-backup-routine]].

T4i is an operations artifact, not a code change. ~~The operator bring-up has been completed: the real reg.ru host is provisioned, DNS points at `api.geoconflict.ru`, and HTTPS `/health` returns 200 over valid TLS.~~ 🔴 **CORRECTED 2026-09-04 — WHETHER THE HOST THIS RUNBOOK BROUGHT UP IS STILL SERVING IS UNVERIFIED.** ⚠️ **This supersedes an earlier same-day annotation here reading "NO LONGER STANDS"; that overstated the owner's position and is withdrawn.** Owner rulings, both live in session 2026-09-04 and **both standing**: *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)"*, then, on a direct follow-up, *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* 🔴 **Reconciled: the box physically EXISTS and is REUSED IN PLACE; its provisioning state — what runs on it, what schema version the DB is at — is UNKNOWN AND UNVERIFIED.** The bring-up genuinely ran once. ⛔ **The RUNBOOK ITSELF is not invalidated — it is the asset the rebuild reuses**, and this page is the vault's record of it. T4g deploy hardening, T5 real profile endpoints, T6 match-end crediting, and T8 off-box backups all landed **in the repository**; whether any of them is running today is one of the UNKNOWN fields `0215` must read.

> 🚨 **TRAP — do not follow this runbook's `PROFILE_INTERNAL_TOKEN` step as written.** The source brief
> (`0182/brief.md`, the struck sentence under its `STOP — CORRECTION` banner — ⚠️ **not `:136-137`,
> which never pointed here; see drift 1 above for why this is now cited by content and not by line**)
> calls the token *"optional — leave blank; the box auto-generates and
> persists it."* **That was true at T4i and is FALSE now:** `internalAuth` is a `timingSafeEqual` over a
> **shared** secret, so a token the box generates for itself — which the game server does not hold —
> means a **401 on every credit call**. The profile client is fail-soft with **no durable queue**
> (ADR-101), so **the XP is LOST, not queued** — ⚠️ **but it is NOT invisible in the logs, and a claim
> on this page that it was has been REFUTED and corrected here rather than dropped.** The old wording
> read *"nothing logs above `debug`"*. **That is FALSE.** A 401 is a non-5xx, non-429 status, so
> `postWithRetry` **gives up immediately and logs at WARN** — `src/server/ProfileApiClient.ts:265-267`
> (`profile <path> returned <status>; not retrying`) — and the caller then warns a **second** time at
> `:147-149` (`credit batch failed after retries; N award(s) dropped`). ⇒ **Two WARN lines per failed
> batch. The awards are still DROPPED and never queued** — only the *silence* half was wrong, and the
> **XP-loss half stands in full**. A **second, independent**
> silent barrier sits on the same path: `PROFILE_INTERNAL_ALLOW_IPS` is pinned to a **June egress IP**,
> and nginx enforces `allow …; deny all;` on `/internal/` — a stale value is a **403 on every credit
> call**, swallowed just as quietly. The brief has been annotated in place (2026-09-04,
> strike-not-delete) by the producer. **`0062`'s D3 — one authenticated call working end to end — is the
> only check that catches either.**

🔧 **Rebuild context (2026-09-04, re-corrected the same day):** the owner ruled a **wipe and rebuild ONTO THE EXISTING RESOURCES — not a procurement of new ones** — tracked as **`0213` (epic) through `0222`, plus `0201`**, all on Sprint 4. ⚠️ *An earlier same-day annotation here described this as a clean-slate rebuild with a new VPS, a new S3 bucket and a new `age` keypair; the VPS and bucket are reused, and that wording is withdrawn.* Decisions now settled: 🔴 **reuse the existing hostname** — the `api.` subdomain is **architecturally required, not incidental**, because Yandex Games permits only ONE main domain for an iframe game, so everything routes through subdomains of it; and the spec floor applies **only if the existing box measures below it** (`0214`). ⚠️ **A DNS record resolving proves nothing about a server running.** Still open: **whether the container registry, `get.docker.com`, the apt mirrors and Let's Encrypt are reachable from reg.ru Moscow** — a spike (`0216`) which is ✅ **runnable today**, since it needed a box to run from and there is one; a "no" changes the rebuild's shape rather than its duration. 📌 A **new** `age` keypair is still needed (`0218`), and the **old** encrypted objects still sitting in the reused bucket are a live owner decision on `0222` — see [[tasks/postgres-backup-routine]]. Full survey: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — T4 slice discipline and residuals
- [[tasks/profile-vps-provisioning]] — T4d provisioning code and host boundary
- [[tasks/profile-build-push-digest]] — T4e1 local build/push/digest workflow
- [[tasks/profile-onbox-stack-gate]] — T4e2 on-box stack lifecycle
- [[tasks/profile-deploy-wiring]] — T4e3 transport and secret staging
- [[tasks/profile-image-secret-scan]] — T4f pre-push image scan
- [[tasks/profile-deploy-hardening]] — T4g deploy argv/concurrency and wrong-host hardening
- [[tasks/profile-backend-db-api]] — T5 DB/API slice that follows the live host milestone
- [[tasks/postgres-backup-routine]] — T8 encrypted off-box profile DB backup and restore path
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which followed this runbook, adopted the box rather than wiping it, and measured this runbook's drift
- [[tasks/profile-le-certificate-renewal-proof]] — task `0216`, which proved the TLS renewal step of this runbook end to end against LE staging
