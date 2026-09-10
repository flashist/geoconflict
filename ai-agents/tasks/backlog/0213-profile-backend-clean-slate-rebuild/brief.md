# Epic — Profile backend + S3: wipe and rebuild onto the EXISTING box and bucket (P0–P7)

## ID
0213

## Sprint
Sprint 4

## Priority
**High** — this epic is the structural blocker under `0062`, `0017`'s Deferred Live Tail, `0012`'s
Deferred Live Tail and one of `0065`'s three conditions.

⚠️ **The rank above is the producer's.** The owner ruled on **scheduling** (all phases into Sprint 4);
they did not rank this epic.

## Status
🔲 Backlog

## Owner
fkit-producer (epic) — child phases carry their own owners.

## Context

> 📌 **Citation frame.** Every `file:line` here was re-derived by opening the file, against commit `589249c` **plus the 2026-09-10 citation sweep**. ⚠️ That sweep ADDED lines to `0182`'s brief, so `0182` numbers here are POST-sweep — they will not match a bare `589249c` checkout. Re-derive by matching the described content, never by shifting the number. See [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md).

### 🔴 THE REFRAME — read this before anything else

**This brief was rewritten on 2026-09-04, the same day it was filed.** Its first version was built on
the ruling *"we don't have ANY profile-related VPS yet"* and scoped a **procurement**. That framing
is **superseded**.

| Statement | When | Standing |
|---|---|---|
| *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)."* | 2026-09-04, earlier | **Recorded, not discarded** |
| *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* — confirmed on follow-up: *"Both exist — reuse them in place."* | 2026-09-04, later | ~~**Current**~~ 🚨 **SUPERSEDED AS TO THE BUCKET ONLY** — see the row below. **The VPS half stands.** |
| 🚨 **A BRAND-NEW, CLEAN S3 bucket. NOT the existing one.** Given live in session, relayed through the spawning session. **Supersedes the row above AS TO THE BUCKET ONLY; the VPS is still reused in place.** | **2026-09-08** | 🔴 **CURRENT** |

⛔ **Do NOT read the first statement as a lie or an error.** Both are recorded, both are dated, and
the reconciliation that stands is:

> 🔴 ~~**A profile VPS and an S3 bucket PHYSICALLY EXIST and will be REUSED IN PLACE.**~~
> 🚨 **CORRECTED 2026-09-08 — THE S3 BUCKET IS NOT REUSED: a BRAND-NEW, CLEAN bucket is created (owner ruling, given live in session, superseding the 2026-09-04 reuse ruling AS TO THE BUCKET ONLY). ✅ The VPS half is UNCHANGED — the box is still reused in place.**
> 🔴 **The profile VPS PHYSICALLY EXISTS and will be REUSED IN PLACE. What is on it —
> whether the stack is provisioned, whether anything is running — is UNKNOWN AND UNVERIFIED.** The
> **OLD** bucket still exists, its contents are still unverified, and it is now **fully separable**.

⚠️ **That gap is not a contradiction. It is the same uncertainty the owner has voiced all session:**
*"I think I am completely lost here about what was done and what wasn't."* **Hardware existence and
provisioning state are two different facts, and only the first one is known.** Write and plan for
that reader.

### 🔴 "Clean slate" now means WIPE AND REBUILD ONTO EXISTING RESOURCES — not procure new ones

| | Before the reframe | Now |
|---|---|---|
| **P1 (`0215`)** | Order a box | **Verify what is on the existing box, wipe / re-provision in place, repoint as needed.** ✅ `setup-profile.sh` is idempotent and safe to re-run — exactly the shape this needs |
| **P1-spike (`0216`)** | Blocked behind procurement | ✅ **RUNNABLE TODAY** — it needed a box to run from, and there is one |
| **`0222`** | Decommission old infra | **Cleanup only** — the **box** is not decommissioned; purge obsolete secrets and decide the fate of the old encrypted objects. 🚨 **RESHAPED 2026-09-08** — ~~in the reused bucket~~ they sit in a **SEPARATE, OLD, now-abandonable bucket**, so a **third option** appeared (abandon the whole old bucket). **UNANSWERED — the owner's** |
| **P0 (`0214`) spec** | A procurement choice | **Conditional: verify the existing box's spec, resize only if below the floor** |
| **The `age` key** | "Closed by owner decision" | 🔴 **RE-OPENED — see below** |

### 🔴 The `age` key question RE-OPENS — and this corrects an earlier instruction, not a new finding

**This epic's first version recorded the `age`-key question as "closed by owner decision", on the
grounds that a fresh start abandons the old bucket. THAT WAS PREMATURE. It is corrected here rather
than quietly dropped.**

**With the bucket reused in place, any pre-existing encrypted backup objects are still in it.**

- They were encrypted to an `age` recipient whose **private identity has no recorded home** — every
  reference in this repository is policy: **no vault, no entry, no custodian, no second copy, no
  readability check.**
- **When asked on 2026-09-04 what the `age` key was, the owner did not know.**
- ⇒ **Without that identity those objects are PERMANENTLY UNREADABLE** — dead weight in a bucket that
  is being paid for.

🚨 **Live owner decision: purge the old encrypted objects, or keep them pending a search for the old
key?** Disposition is [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md);
everything about the **new** key is [`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md).
**Do not let this slide a second time.**

### ~~🔴 CURRENT BOX STATE — UNKNOWN PENDING INSPECTION~~ ✅ INSPECTED AND ANSWERED 2026-09-10

> 🔴 **SUPERSEDED 2026-09-10 by [`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md)'s close
> (agent-closed — not owner-verified).** **The box state is NO LONGER UNKNOWN.** The inspection table
> **B1–B9 is filled in and dated** in `0215`'s worklog, and **all 13 of its verification items are
> satisfied** — two with stated limits (the `ufw` **default policy** was not re-checked; RU residency
> is **single-provider registration evidence, not a physical-site attestation**). 🔴 **The premise
> changed: NO WIPE HAPPENED** — the box was found **live and healthy** and the **owner ruled ADOPT**;
> the only destructive act was destroying the Postgres data volume to rotate `POSTGRES_PASSWORD` at
> `initdb`, owner-ruled, at a re-verified **0 rows**. **Child phases may now read those values from
> `0215`'s worklog rather than treating them as UNKNOWN.** ⚠️ **One field stays UNKNOWN: B4's
> historical half** — whether a backup ever completed *before* that task. It is **answered forward**
> (a backup demonstrably completes now), not backward. 🚨 **And being inspected is not being safe: the
> restore path has NEVER been tested — this box has NO PROVEN RECOVERY PATH; `0218` owns it and is
> OPEN.** ⚠️ Original text kept below, struck, not deleted.

~~The owner can inspect the box directly and has a read-only command set. **Until those results
arrive, every field below is UNKNOWN, and no child phase may assume a value for one.** The fields and
their commands live in [`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md); filling that table in
**is** the answer to the owner's "what was done and what wasn't".~~

### ⚠️ The work is SMALLER than "rebuild" implies

**Do not re-derive the deploy machinery.** It exists and it is substantial:

| Asset | What it is |
|---|---|
| `setup-profile.sh` (1,025 lines) | Provisions a bare Ubuntu box *and* deploys the stack. ✅ **Idempotent — safe to re-run** |
| `build-deploy-profile.sh` (575 lines) | Hardened two-hop deploy driver — digest pin, `sshpass -f` argv safety, 0600 staging, deploy mutex, wrong-host preflight |
| `migrations/001`–`004` + `migrate.ts` | ✅ **Idempotent** — `schema_migrations`-tracked, re-runs are no-ops |
| `profile-backup.sh` | Backup **and a scripted restore** at `:192-262` |
| [`0182`](../../done/0182-profile-04i-server-bring-up-runbook/brief.md) | **A complete operator bring-up runbook** — in `done/`, which is why nobody points at it |

**The honest shape: inspect what is there, wipe and re-run one existing idempotent command, close
five gaps.** Neither greenfield nor procurement.

### 🔴 THREE TRAPS — read before planning any child phase

1. **`0182`'s runbook will break `0062` if followed as written.** The runbook once said
   `PROFILE_INTERNAL_TOKEN` is *"Optional — leave blank; the box auto-generates and persists it."*
   **True at T4i, FALSE now.**
   📌 **Citation corrected 2026-09-10 — the old `0182/brief.md:136-137` was WRONG** (at `589249c`
   those two lines are the section header `## 3. Confirm SSH access to the box` and a blank line).
   **Read against `589249c` + the 2026-09-10 citation sweep (that sweep moved `0182`'s lines down):** the struck original sentence is at
   [`0182/brief.md:185`](../../done/0182-profile-04i-server-bring-up-runbook/brief.md) — the line holds
   `~~*"Optional — leave blank; the box auto-generates and persists it."*~~` — and the same sentence is
   quoted inside the `.env.profile.secret` code block at `0182/brief.md:241`. The correction banner
   that supersedes both runs `0182/brief.md:182-231`, and the corrected value line is
   `0182/brief.md:248` (`PROFILE_INTERNAL_TOKEN=<generate-once-set-identically-on-both-sides>`).
   ⚠️ **Re-derive by content, never by shifting the number** —
   [`conventions/file-line-citations.md`](../../../knowledge-base/conventions/file-line-citations.md). `internalAuth` is a `timingSafeEqual` over a **shared** secret
   (`src/profile-server/InternalAuth.ts:14-19`, `:26`) ⇒ a box-generated token the game server lacks
   is a **401 on every credit call**. The client is fail-soft with **no durable queue** (ADR-101), so
   **the XP is LOST, not queued**, and ~~nothing logs above `debug`~~.
🚨 **CORRECTED 2026-09-10 — the *"nothing logs above `debug`" / "silently swallowed"* half is REFUTED against the source.** A 401 (and a 403) is a non-5xx, non-429 4xx, so `postWithRetry` stops immediately and logs at **WARN — twice per failed batch**: `src/server/ProfileApiClient.ts:265-267` (`` `profile ${path} returned ${response.status}; not retrying` ``, inside the `status < 500 && status !== 429` guard at `src/server/ProfileApiClient.ts:264`) and `src/server/ProfileApiClient.ts:146-149` (`` `credit batch failed after retries; N award(s) dropped …` ``). **Frame `589249c` — `ProfileApiClient.ts` is clean at that commit, so these two numbers are stable.** ⛔ **THE XP-LOSS HALF IS UNTOUCHED AND STANDS IN FULL — the awards are DROPPED, never queued.** 🔴 It still goes unnoticed, because **nothing on that box reads the logs** (`0219`, **OPEN**) — **a warning nobody reads fails as quietly as no warning at all.**
 ✅ **`0182` annotated in place.**
2. **`PROFILE_INTERNAL_ALLOW_IPS` is pinned to a June game-prod egress IP**
   (`example.env.profile:33`); nginx does `allow …; deny all;` at `/internal/`
   (`setup-profile.sh:719-720`). A stale value ⇒ **403 on every credit call**, ~~also silently
   swallowed~~. 🚨 *Corrected 2026-09-10: a 403 is also a non-5xx, non-429 4xx, so it takes the SAME
   two-WARN path as the 401 (`src/server/ProfileApiClient.ts:265-267`, `:146-149`, frame `589249c`).*
   ⚠️ **Traps 1 and 2 are two independent barriers on the SAME path** — ~~silent~~ **WARN-logged and
   unread**, which in practice is the same thing until `0219` ships a log consumer. `0062`'s D3
   is the only check that catches either.
3. **Rotating `POSTGRES_PASSWORD` against an existing data volume breaks auth** — the image applies it
   only at initdb. 🚨 **Under the reframe this trap is MORE likely, not less** — a wipe-and-rebuild
   onto an existing box is exactly where a data volume survives while the password is regenerated.
   **Decide explicitly whether the volume goes.**

## Child phases

| Phase | Task | Effort | Risk | Depends on |
|---|---|---|---|---|
| **P0 — Decisions** | [`0214`](../0214-profile-p0-infrastructure-decisions/brief.md) | ~0 eng | — | — |
| ~~**P1-spike — RU reachability**~~ 🔴 **NARROWED + RETITLED 2026-09-10 (owner ruling): "Prove the box can still obtain a Let's Encrypt certificate."** — ✅ **Done (agent-closed — not owner-verified) 2026-09-10.** 🔴 **PROVEN: the box CAN complete a full ACME HTTP-01 challenge and obtain a certificate — never verified before today**, because `0215`'s deploy PRESERVED the cert via `--keep-until-expiring` (issuance was **a no-op**, so **no challenge had ever been observed**). **Evidence on the box:** cert valid to **2026-11-20 (70 days)**, ECDSA; `certbot renew --dry-run` with the cron's pre/post nginx hooks → **all simulated renewals succeeded**; nginx **active** and `https://…/health` **200** afterwards. ✅ **Run against LE STAGING — a FULL challenge, ZERO production rate-limit spent**, and **the pre/post nginx hooks were exercised and work**, so **the renewal path is proven END TO END** (same mechanism the twice-daily cron uses from ~2026-10-21). 📌 `Account registered.` = a new LE **staging** account, expected on a first staging run, **no effect on the production account or its limits** — not a finding. 🚨 **RESIDUAL, NOT CLOSED BY THIS: renewal works TODAY, but NOTHING READS THE RENEWAL LOG — that is `0219`, still OPEN.** If renewal breaks before October (firewall, provider, nginx config) it still fails **SILENTLY, twice a day, until the certificate expires and `api.geoconflict.ru` stops serving TLS.** ⇒ 🔴 **THIS PROVED CAPABILITY, NOT MONITORING — "P1-spike Done" does NOT mean the certificate is safe.** 🚨 **Still dropped and NOT restored: intermittency (never measured — a pass on ONE afternoon says nothing about an intermittent network), latency (never recorded), `get.docker.com` (never fetched — live again for a new box or an OS reinstall).** ⚠️ **Marker: the OWNER personally ran every command, guided, and the lead read the raw output — better-evidenced than a typical agent close — but no owner sign-off was taken on the close, and nothing is verified in production use.** | [`0216`](../../done/0216-profile-p1-spike-ru-network-reachability/brief.md) | ~~1–2 h~~ **~15 min** | ~~**UNKNOWN**~~ ✅ **ANSWERED — HTTP-01 works; monitoring gap remains (`0219`)** | ✅ **none — was runnable today, and was run** |
| **P1 — Inspect, wipe, re-provision in place** — ✅ **Done (agent-closed — not owner-verified) 2026-09-10.** 🔴 **NO WIPE HAPPENED** — the inventory found the box **live and healthy** and the **owner ruled ADOPT**; the only destructive act was destroying the Postgres data volume to rotate `POSTGRES_PASSWORD` at `initdb`, owner-ruled, at a re-verified **0 rows**. **All 13 verification items satisfied** (two with stated limits: the `ufw` **default policy** was not re-checked today, and RU residency is **single-provider registration evidence, not a physical-site attestation**). 🚨 **The restore path has NEVER been tested — this box has NO PROVEN RECOVERY PATH; `0218` owns it and is OPEN.** Full close record in [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) | [`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) | 0.5–1 day / 2–3 if it surprises | Medium-High | P0, P1-spike |
| 🔴 **WORK ORDER 1 of 3** — **P3 — Durability proof** *(owner-ruled 2026-09-10; the restore path is the only claim still resting on faith, and it is cheapest to prove while every table has ZERO rows)* | [`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) | 0.5 day + owner action | **High** | P1 |
| 🔴 **WORK ORDER 2 of 3** — **P4 — Operability** *(owner-ruled 2026-09-10; owns the monitoring gap for BOTH unread signals — the certificate renewal log and `last-backup.json`. Dated fuse: cert `notAfter` 2026-11-20, cron starts attempting ~2026-10-21)* | [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) | 1 day | Low tech / **HIGH consequence** | P1 |
| 🔴 **WORK ORDER 3 of 3** — **P2 — Wire the game server** *(owner-ruled 2026-09-10; it is the step that ENDS the free window — once real citizen rows exist the restore drill and any Postgres work stop being free. ⛔ **LAST IS NOT DEPRIORITIZED** — deliberate sequencing, rank unchanged)* | [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) | 2–4 h + deploy window | Medium | P1 |
| **P5 — Secret persistence + value parity** | [`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md) | 0.5–1 day | Medium | P1 |
| **P6 — OS hardening** | [`0221`](../0221-profile-p6-os-baseline-hardening/brief.md) | 0.5–1 day | Low-Medium | P1 |
| **P7 — Gate the shell harnesses** — ✅ **Done (agent-closed — not owner-verified) 2026-09-06** | [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) **(existing, Phase 2)** | 2–4 h | Low | ✅ **none — startable today** |
| **Cleanup — obsolete secrets + old-object disposition** | [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md) | ~0.5 day, mostly owner | Low, but carries the 🔴 `age` decision | — |

🔴 **THE ROW ORDER OF P2 / P3 / P4 IN THIS TABLE NO LONGER FOLLOWS THE P-NUMBERS — THAT IS DELIBERATE AND OWNER-RULED, 2026-09-10, given live in session and relayed through the spawning session.** **The ruled work order is `0218` (P3) → `0219` (P4) → `0217` (P2).** 🚨 **THIS RUNS P2 *AFTER* P3 AND P4. ⛔ DO NOT "FIX" THE TABLE BACK INTO P-NUMBER ORDER.** The P-numbers record the order the phases were **written** in on 2026-09-04; they are **not** the order they are to be **worked** in.

⚠️ **The owner ruled RANK/ORDER, NOT schedule** — ⛔ **no child task's `## Status` changed, no mover skill was invoked, and all three briefs stay under `ai-agents/tasks/backlog/`. SCHEDULED IS NOT STARTED.** The full reasoning is recorded in the Sprint 4 board's work-order addendum ([`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md)); it is summarised in the Phase cells above so a reader of this table alone is not misled.

📌 **`0220` (P5), `0221` (P6) and `0222` (Cleanup) were NOT ruled** — they keep their existing positions and the producer's ranks. ⚠️ **The `Depends on` column is UNCHANGED and still says `P1` for all three** — the ruling set the order they are worked in, it did **not** create or remove a technical dependency between them.


**Dependency shape:**

```
P0 (0214) → P1 (0215) → P2 (0217) → 0062 verified → 0017 / 0012 live tails
                                                   + 1 of 0065's 3 conditions
              │
              ├── P3 (0218)  ├── P4 (0219)  ├── P5 (0220)  └── P6 (0221)

P1-spike (0216) — ✅ DONE 2026-09-10 (agent-closed — not owner-verified). PROVEN: the box can
                  complete a full ACME HTTP-01 challenge and obtain a certificate — never
                  verified before that day. The dry run hit LE STAGING (full challenge, zero
                  production rate limit) and the pre/post nginx hooks worked, so the renewal
                  path is proven end to end, not just the challenge. No DNS-01 rework needed.
                  🚨 RESIDUAL: NOTHING READS THE RENEWAL LOG — that is P4 (0219), OPEN. A
                  renewal that breaks before October still fails SILENTLY until the cert
                  expires. THIS PROVED CAPABILITY, NOT MONITORING. Still never measured:
                  intermittency, latency, get.docker.com.
P7 (0201)      — ✅ DONE 2026-09-06 (agent-closed — not owner-verified). Three of the four
                  harnesses now run in `npm test`; the fourth is an npm script by owner ruling.
Cleanup (0222) — owner action. 🔴 Carries the re-opened age-key decision.
```

## Verification steps

This epic is verified by its children and closes when all ten rows above close. Specifically:

1. 🔴 **The "current box state" table in `0215` is FILLED IN** — every field has a real value instead
   of `UNKNOWN`. ⚠️ **This is the acceptance criterion that answers the owner's actual complaint.**
2. `/health` returns **200 over a valid Let's Encrypt cert** (P1).
3. `0062`'s D3 — a real authenticated profile call succeeding end to end in production (P2). ⚠️ The
   only check that catches traps 1 and 2.
4. **Migration `004` is confirmed applied** — see `0215` / `0217`; ✅ safe to run either way.
5. A restore drill against **non-empty** data, with **currently-documented** commands (P3).
6. The **new** `age` identity's custodian, location and second copy are **written down** before the
   first backup runs (P3).
7. 🔴 **The OLD encrypted objects — in a SEPARATE, OLD bucket** (~~reused~~ 🚨 **corrected 2026-09-08**) — **have an owner-ruled disposition** (`0222`), **chosen from THREE options**: purge the objects · keep pending a search · 🆕 abandon the whole old bucket. ⛔ **Still UNANSWERED.**
8. Log rotation, image prune, an external uptime check and a `last-backup.json` consumer exist (P4).
9. Something automatically runs all four shell harnesses (P7 / `0201`).
   ⚠️ **Partially satisfied 2026-09-06, and the wording overstates what `0201` delivered.** `npm test`
   now runs **three** of the four; `tests/profile-backup-dryrun.sh` is **OUT by owner ruling Q2**
   (it hard-fails without Docker plus `age`, `age-keygen`, `rclone`, `curl`, `jq`) and is exposed as
   `npm run test:scripts:docker` instead — **its real gate is P3 / `0218`.** Also note residual **R5**:
   the harness list is hardcoded, so a *future* unlisted `.sh` harness can still rot unrun.

## Notes

- **Capacity risk, stated once and not re-argued.** The producer recommended **P1 + P2 + P7 only**.
  ⛔ **The owner ruled ALL of P0–P7 in, explicitly, over that recommendation.** ✅ **The reframe
  reduces the risk somewhat** — no procurement wait, and `0216` and `0201` can both start today.
  **This bullet is the whole of the objection. Do not re-open it and do not quietly scope it down.**
- 🔴 **The deploy forget-risk gets NO GUARD TASK — owner-ruled, verbatim: *"Neither — I'll just
  remember."*** They will blank `PROFILE_INTERNAL_TOKEN` by hand at each deploy. ⛔ **This is a
  decision, not an oversight. Do not file a task for it and do not re-recommend one.** The accepted
  risk is recorded on `0062` and `0217`, where a deployer sees it.
- 🔴 **`0062` STAYS IN SPRINT 4** — owner-ruled, **over the producer's recommendation to move it to
  the Backlog board.** Recorded; **not re-argued.**
- **`0195`'s code fix STANDS.** What was corrected is its **production narrative** — *"every payment
  route returns 503 on the real box"* was never verified against a running box. **The fix was right;
  the observation was never made.**
- 🆕 **`0067`'s profile-server half may never have been deployed.** Its client half is in the live
  game release `362a2f9`, but its three routes and migration `004` ship in a **separate image**.
  ⛔ **Not determinable from this repository.** See `0217` and the survey §8.
- **Full survey:**
  [`2026-09-04-profile-backend-clean-slate-survey.md`](../../../knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md)
  — **read §0 first**; it is written for the "I'm lost about what was done" reader.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface (ADR-005).
- 🔒 **No secrets in any artifact.** Variable names, file names and ports only — never a value, a
  length, an endpoint, a bucket name, or an IP.
</content>
