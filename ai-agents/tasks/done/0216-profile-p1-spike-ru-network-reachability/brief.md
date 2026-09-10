# Prove the profile box can still obtain a Let's Encrypt certificate — an ACME HTTP-01 challenge has never been verified from it

> 📌 **Retitled 2026-09-10. The original title was *"P1-spike — Confirm from the box that the
> registry, Docker, apt and Let's Encrypt are reachable from reg.ru Moscow"*.** The folder name is
> **kept unchanged on purpose** — it is the task's identity and several files link to it.

---

> # ✅ CLOSED 2026-09-10 — `✅ Done (agent-closed — not owner-verified)`
>
> ## What is now PROVEN
>
> **This box CAN complete a full ACME HTTP-01 challenge and obtain a certificate.** That was the whole
> of the narrowed task, and **it had never been verified before today.** `0215`'s deploy did not verify
> it: the existing certificate was **PRESERVED** because `--keep-until-expiring`
> (`setup-profile.sh:684-687`) made issuance **a no-op**, so **no challenge had ever been observed from
> this box.** Today one was.
>
> **Evidence — run on the box on 2026-09-10, by the OWNER personally, guided step by step, with the raw
> output read by the lead:**
>
> | Check | Result |
> |---|---|
> | `certbot certificates` | Certificate Name `api.geoconflict.ru`, Key Type **ECDSA**, Domains `api.geoconflict.ru`, Expiry **2026-11-20 11:01:42+00:00 (VALID: 70 days)** |
> | `certbot renew --dry-run` (with the cron's pre/post nginx hooks) | `Congratulations, all simulated renewals succeeded: /etc/letsencrypt/live/api.geoconflict.ru/fullchain.pem (success)` |
> | `systemctl is-active nginx`, post-run | `active` |
> | `curl https://api.geoconflict.ru/health`, post-run | **200** |
>
> ✅ **The dry run exercised the REAL mechanism against LET'S ENCRYPT STAGING — a full challenge, and
> ZERO production rate-limit budget spent.**
>
> ✅ **THE RENEWAL PATH IS PROVEN END TO END, NOT JUST THE CHALLENGE.** The pre/post nginx hooks were
> exercised and work: **nginx stopped, the challenge bound port 80, nginx came back `active`, and TLS
> served 200 afterwards.** That is the **same mechanism** the twice-daily automatic renewal will use
> from around **2026-10-21**.
>
> 📌 **`Account registered.` appeared in the output.** A **new LE *staging* account** was registered by
> the dry run. **Expected on a first staging run**, and it has **no effect on the production account or
> its rate limits.** Recorded so it is not misread later; it is **not a finding.**
>
> ## 🚨 THE RESIDUAL THAT SURVIVES THIS CLOSE — do not lose it in the word "Done"
>
> **Renewal works TODAY. NOTHING READS THE RENEWAL LOG.** Monitoring is
> [`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md),
> which is **OPEN** and owns it.
>
> 🔴 **If renewal breaks between now and October — a firewall change, a provider change, an nginx config
> change — it will still fail SILENTLY, twice a day, until the certificate EXPIRES and
> `api.geoconflict.ru` stops serving TLS.**
>
> ⇒ **THIS CHECK PROVED CAPABILITY, NOT MONITORING.** State it in those terms wherever this task is
> cited. A capability proven on one afternoon is not a system that tells you when the capability goes
> away.
>
> ## Carried forward UNCHANGED — what the narrowing permanently dropped, and this close does NOT restore
>
> 1. 🔴 **INTERMITTENCY — never measured, for any source.** ⚠️ **A passing challenge on one afternoon
>    says nothing about an intermittent network.**
> 2. 🔴 **LATENCY — never recorded, for any source.** The source/result/latency/failure-mode table does
>    not exist and will not be produced.
> 3. **`get.docker.com` — never fetched.** Moot for **this** box; live again for a **new box or a
>    provider-side OS reinstall.**
>
> ## The deadline banner below is DISCHARGED — **as to capability ONLY**
>
> ✅ The question it was counting down to (*can the challenge succeed?*) is **answered: yes.**
> 🚨 **The silent-failure half is NOT discharged and is not this task's to discharge** — see the
> residual above. **`0216` being Done does NOT mean the certificate is safe.**
>
> ---
>
> **Marker rationale, stated honestly and NOT flattened in either direction:** the **owner personally
> ran every command on the box**, guided step by step, and **the lead read the raw output** — so this is
> **better-evidenced than a typical agent close**. But **no owner sign-off was taken on the close
> itself**, and **nothing here is verified in production use** — the renewal proven is a *staging*
> simulation of the real path, not a real renewal observed in production. Hence
> `(agent-closed — not owner-verified)`.

---

> # 🚨 NARROWED 2026-09-10 BY OWNER RULING — AND IT HAS A ~SIX-WEEK FUSE
>
> ✅ **DISCHARGED 2026-09-10 AS TO CAPABILITY — see the CLOSED banner above.** The challenge succeeded
> and the hook-driven renewal path was exercised end to end. 🚨 **The fuse below is NOT fully out:
> nothing reads the renew log (`0219`, OPEN), so a renewal that breaks later still fails silently until
> the certificate expires. Capability was proven; monitoring was not.**
>
> ## 🔴 THE DEADLINE, FIRST, BECAUSE EVERYTHING ELSE HERE IS SECONDARY TO IT
>
> - The live certificate's **`notAfter` is 2026-11-20**.
> - `setup-profile.sh:983` installs a **twice-daily `certbot renew`** cron, which starts attempting a
>   real HTTP-01 challenge from roughly **2026-10-21** (certbot's 30-day window).
> - 🚨 **NOTHING READS ITS LOG.** The renew cron writes to a log file on the box and **no human and no
>   system ever looks at it** — monitoring is [`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md), which is **OPEN**.
>
> ⇒ 🔴 **If HTTP-01 is blocked from that network, the renewal fails SILENTLY, twice a day, for a
> month, and the first anyone learns of it is when the certificate EXPIRES and `api.geoconflict.ru`
> stops serving TLS.** From **2026-09-10 that is roughly a six-week fuse.**
>
> ⚠️ **`0219` is what turns this from "a check somebody should get around to" into "a silent failure
> mode."** ⛔ **Do NOT fix that here** — the unread log is `0219`'s to close. **Record the
> cross-dependency and leave it.** The two tasks are cheap separately and neither covers the other:
> this one asks *can the challenge succeed*, `0219` asks *would we find out if it stopped*.
>
> ## Owner ruling — the scope, not the schedule
>
> **Owner ruled 2026-09-10, live in session, on the producer's recommendation: NARROW this task in
> place to the Let's Encrypt renewal check ONLY. Do NOT cancel it.** The ID, the history and the LE
> rate-limit warnings stay attached to the one question still open.
>
> ⛔ **No mover skill was invoked. `## Status` is UNCHANGED** — the owner ruled the **scope**, not the
> schedule.
>
> ## ✅ ANSWERED BY `0215`'s DEPLOY — ⛔ DO NOT RE-RUN THESE
>
> | Source | Answer | Evidence |
> |---|---|---|
> | **Container registry, FROM THE BOX** | ✅ **PASS — reachable and usable** | A **real image pull completed on the box**, and **both compose services then came up healthy on a `@sha256`-pinned image** |
> | **apt mirrors** | ✅ **PASS** | `setup-profile.sh:181` runs `apt-get update -y && apt-get upgrade -y` **unconditionally**, `:619` and `:844` install further packages, and **the deploy completed end to end** ⇒ apt worked. ⚠️ **Inferred from the deploy succeeding — NOT separately measured.** Say it that way; do not upgrade it to a measurement |
>
> ## 🚨 DROPPED PERMANENTLY BY THIS NARROWING — a deliberate loss, not an oversight
>
> **Read this before assuming any of it is still coming. It is not. Nobody will ever have these
> numbers for this box unless a future task re-files them.**
>
> 1. 🔴 **INTERMITTENCY — never measured, for any source, and now never will be.** ⚠️ **This brief
>    itself argued the opposite case, and the argument was right:** *"an intermittent registry is
>    worse than a blocked one, because it fails a deploy halfway."* **One successful pull is not that
>    measurement, and one successful `apt` is not either.** **The owner is knowingly giving this up.**
> 2. 🔴 **LATENCY — never recorded, for any source.** The original verification step 4 asked for a
>    table of source / result / **latency** / failure mode. **That table does not exist and will not
>    be produced.**
> 3. **`get.docker.com` — never fetched, and out of scope now.** `setup-profile.sh:284-289` fetches it
>    **only if `docker` is absent**; the adopted box already had Docker, so **that branch was
>    skipped.** ⚠️ **Moot for THIS box; live again for a NEW box or a provider-side OS reinstall** — if
>    either ever happens, this is unanswered again.
>
> ### Why the loss is accepted — the reason matters, so it is stated rather than assumed
>
> **This task's shape-changing purpose has PASSED.** It existed to de-risk `0215`'s scope *before*
> `0215` ran — a registry mirror, an offline Docker install, an explicitly-pinned apt mirror, a DNS-01
> rework. **`0215` has run and NONE of those materialized.** Measuring intermittency and latency now
> would be **measurement for its own sake**: it can no longer change a plan, because the plan it
> existed to protect is already executed and closed. ⇒ **The cost is real and it is accepted.**
>
> ## 🔴 WHAT REMAINS — the whole of this task now
>
> **CAN THIS BOX COMPLETE AN ACME HTTP-01 CHALLENGE AND OBTAIN A CERTIFICATE? NOBODY HAS EVER
> VERIFIED IT.**
>
> - `0215`'s deploy **did not test it.** The existing certificate was **PRESERVED byte-identical**
>   precisely because `--keep-until-expiring` (`setup-profile.sh:684-687`) makes issuance **a no-op on
>   a fresh cert** ⇒ **NO CHALLENGE RAN.** The deploy proves the certificate **exists**, not that a new
>   one **can be obtained.** ✅ That no-op was the right outcome for `0215` — it spent no rate limit —
>   but it is exactly why this question is still open.
> - ⚠️ **Circumstantial evidence only, and it is NOT a verification:** the live cert's `notBefore` is
>   **2026-08-22**, which implies *something* completed an HTTP-01 challenge from that box about two
>   and a half weeks before the deploy. **Nobody observed it, and `0215` did not record it as a
>   check.** Treat it as a reason to expect success, **never as the answer.**
>
> ## The check itself — ~15 minutes of owner time, not a 1–2 hour spike
>
> ```
> certbot renew --dry-run \
>   --pre-hook "systemctl stop nginx" \
>   --post-hook "systemctl start nginx"
> ```
>
> - **Run it WHILE NGINX IS UP** — that is the state `setup-profile.sh:675-682`'s own renewal-contract
>   comment says to validate, and it is the state the real cron will run in.
> - **The hooks are load-bearing, not decoration.** certbot persists `authenticator = standalone`,
>   which **binds port 80**; nginx permanently owns port 80, so a renew without the pre-hook cannot
>   complete the challenge. The hooks above are the same ones the cron at `:983` uses — **testing the
>   command the cron actually runs is the point.**
> - ✅ **`--dry-run` runs against LET'S ENCRYPT STAGING.** It **performs a full challenge** — so it
>   genuinely answers the question — and **spends ZERO production rate-limit budget.** The LE
>   rate-limit warnings elsewhere in this brief remain live for any **non**-dry-run attempt.
> - ⚠️ **A `--dry-run` that fails is a REAL failure.** It is the renewal path, exercised. Do not
>   dismiss it as "only staging."
>
> ## What a failure would mean — the original consequence, unchanged
>
> If HTTP-01 cannot complete from that network, the remedy is a **DNS-01 challenge rework** — a
> different certificate flow entirely, touching nginx and the renewal path. ⚠️ **That is a scoping
> decision for the owner, not an improvisation inside this task.** **STOP and report.**


## ID
0216

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High — and it is a SHAPE risk, not a pace risk.**

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder (or the operator running the bring-up)

## Depends on
✅ **NOTHING — this is RUNNABLE TODAY.**

> 🔴 **REFRAMED 2026-09-04, the same day this was filed.** It previously depended on `0214` (P0)
> because *"a box must be ordered and SSH-reachable"*. **Owner ruling, superseding an earlier
> statement the same day:** *"We don't need to cancel any billings, the VPS and S3 I created will be
> reused."* — confirmed: *"Both exist — reuse them in place."*
>
> 🚨 **CORRECTED 2026-09-08 — THE S3 BUCKET IS NOT REUSED: a BRAND-NEW, CLEAN bucket is created (owner ruling, given live in session, superseding the 2026-09-04 reuse ruling AS TO THE BUCKET ONLY). ✅ The VPS half is UNCHANGED — the box is still reused in place.**
> ✅ **Immaterial to this spike, which is about reaching the BOX.** Recorded so the quote above is not
> read as still current in full.
>
> ⇒ 🚨 **THE BOX EXISTS. This spike is no longer gated behind procurement and can run now.** It needed
> a box to run *from*, and there is one. ⛔ **Do not schedule it behind `0214`.**
>
> ⚠️ It still does **not** depend on the deploy having run — that is the point of running it first.
> And it still does not depend on knowing what state the box is in: an egress check works regardless.

---

> ## 🔴 OWNER RULING 2026-09-07 — the line above is now only HALF right
>
> **Owner, verbatim, given live in session:** *"I have the VPS, but I need to re-du the setup of it
> from the scratch, probably all the keys"* [sic — *"re-du"* = **redo**].
>
> **This is a THIRD recorded position, and it does not simply repeat the second one.** It keeps the
> 2026-09-04 correction (**the box exists**) and adds a new fact on top: **its setup and its keys are
> to be redone from scratch, so nothing currently on that box may be assumed working or trusted.**
>
> ### What survives, and what is now doubtful
>
> ✅ **"THE BOX EXISTS" — still true.** The 2026-09-04 reframe is not reversed.
>
> ⚠️ **"can run now" — now carries a caveat this brief did not previously state.** A reachability
> spike run **before** a from-scratch redo may be measuring a machine state that does not survive
> the redo. **The producer is FLAGGING this, not deciding it** — the call belongs to whoever
> schedules P1:
>
> | If the redo is… | Does this spike's result survive it? |
> |---|---|
> | A **re-run of `setup-profile.sh` in place** (same machine, same OS install, same IP) | ✅ **Yes.** Egress to the registry, `get.docker.com`, apt and Let's Encrypt is a property of the **network path**, not of what is installed. Re-provisioning does not move the box. |
> | A **provider-side OS reinstall / rebuild-from-image** | ⚠️ **Mostly.** Same datacentre and (usually) same IP, so the network family is unchanged — but ufw state, any pinned apt mirror, and any registry credential on the box are wiped, and **the IP is only usually preserved, not guaranteed.** Re-confirm the IP before trusting the result. |
> | A **different machine entirely** | ⛔ **No.** Re-run the spike. |
>
> 🚨 **One result that is NOT network-shaped and can be spent by the redo: Let's Encrypt.** Its
> HTTP-01 rate limits are counted **per registered domain**, not per box. A spike that issues a real
> certificate, plus a from-scratch redo that issues another, both draw on the **same** budget for
> `geoconflict.ru`. ⚠️ **Prefer the LE *staging* endpoint for the spike**, or accept knowingly that
> the redo may hit a limit the spike helped consume. This is a **flag, not an instruction** — the
> spike's own procedure below is unchanged and no step has been rewritten.
>
> ⛔ **Nothing else in this brief was edited.** Priority, status, owner, dependency and every
> procedure step stand exactly as they were.

---

> ## 🔴 AMENDED 2026-09-10 — `0215` SHIPPED WITHOUT THIS SPIKE. Read this before running anything.
>
> **This spike was NEVER RUN.** `0215` (P1) proceeded without it and **succeeded**, and is now
> ✅ **Done (agent-closed — not owner-verified)**. That retroactively settles **part** of what this
> spike existed to discover. **The rest is still open.**
>
> ~~⚠️ **STATUS DELIBERATELY UNCHANGED — this brief stays `🔲 Backlog`.** Whether it is cancelled or
> narrowed is an **OWNER CALL** and has not been made.~~ ✅ **RULED LATER THE SAME DAY: NARROW, do not
> cancel** — see the narrowing banner at the top of this file, which supersedes this paragraph. The
> status is still unchanged, now because the owner ruled the **scope** and not the schedule. **Nothing
> here cancels it.** This amendment exists for one reason: **so nobody re-runs work the deploy already
> settled.**
>
> ### 🚨 The purpose this spike was FILED for is DISCHARGED
>
> Its stated justification was *"running this before P1 costs almost nothing; discovering it midway
> through P1 costs the whole estimate"* — i.e. **de-risk P1's SHAPE before P1 runs.** **P1 has run.**
> **None of the four shape-changes in the table below materialized:** no registry mirror, no offline
> Docker install, no explicitly-selected apt mirror, and **no DNS-01 rework.** ⇒ **This spike can no
> longer rewrite `0215`'s scope.** Any remaining value is **forward-looking**, not protective of P1.
>
> ### What the deploy ANSWERED — do NOT re-run these
>
> | Source | Answer | Evidence |
> |---|---|---|
> | **Container registry, FROM THE BOX** | ✅ **PASS — reachable and usable.** A real image pull completed on the box | `0215` worklog: disk moved 22 % → 26 %, **the delta being the newly pulled image layers**; both compose services then came up healthy on a `@sha256`-pinned image |
> | **apt mirrors** | ✅ **PASS, once.** `setup-profile.sh:181` runs `apt-get update -y && apt-get upgrade -y` **unconditionally**, and `:619` / `:844` install `nginx certbot` and `age rclone`. The deploy completed end to end ⇒ apt worked | Inferred from the deploy succeeding, **not separately measured** |
>
> 🚨 **THE ONE FAILURE WAS NOT THE BOX'S EGRESS — do not record it as one.** The first deploy attempt
> failed on a `node:24-slim` metadata fetch returning **EOF from the registry** — **on the LOCAL build
> machine, BEFORE ANY SSH.** It says nothing about reg.ru Moscow. It was diagnosed transient (auth
> endpoint 200, registry `/v2/` a normal 401, no VPN, no mirrors) and a retry passed. **It is a
> laptop-network data point, not a box-network one.**
>
> ### What the deploy did NOT answer — the real residual
>
> 1. 🚨 **LET'S ENCRYPT HTTP-01 CHALLENGE COMPLETION — STILL UNANSWERED, and it is the item with the
>    worst consequence.** The certificate was **PRESERVED and byte-identical** across the deploy:
>    `setup-profile.sh:684-687` passes `--keep-until-expiring`, which is **a no-op on a fresh cert**
>    ⇒ **NO ACME CHALLENGE WAS PERFORMED.** The deploy proves the cert **exists**, not that a new one
>    **can be obtained.**
>    - ⚠️ **Circumstantial evidence only, and it is NOT a measurement:** the live cert's `notBefore`
>      is **2026-08-22**, which implies *something* completed an HTTP-01 challenge from this box about
>      two and a half weeks earlier. **Nobody observed it and `0215` did not record it as a check** —
>      treat it as a reason to expect success, **not as the answer.**
>    - 🔴 **There is a real clock on this.** `notAfter` is **2026-11-20**, and `setup-profile.sh:983`
>      installs a twice-daily `certbot renew` cron, which will attempt HTTP-01 from roughly
>      **2026-10-21** (certbot's 30-day window). **Nothing reads its log** — monitoring is `0219`,
>      which is **OPEN** ⇒ **a blocked HTTP-01 would fail SILENTLY until the certificate expired.**
> 2. **`get.docker.com` — never exercised.** `setup-profile.sh:284-289` fetches it **only if `docker`
>    is absent**; the adopted box already had Docker, so **that branch was skipped.** ⚠️ Moot for
>    **this** box; live again for a **new box or a provider-side OS reinstall.**
> 3. **Intermittency was never measured, for any of the four.** This brief says outright *"an
>    intermittent registry is worse than a blocked one."* One successful pull is **not** that
>    measurement, and neither is one successful `apt`.
> 4. **No latency figures were recorded** for anything (verification step 4's table does not exist).
>
> ⚠️ **The Let's Encrypt rate-limit warning in the 2026-09-07 block above is STILL LIVE** — limits are
> per registered domain, and `0215` deliberately spent none. **If this spike is ever run, use the LE
> *staging* endpoint** rather than drawing on the same budget the renewal needs.

## Context

### Why this is its own task and not a line in P1

`setup-profile.sh` pulls from four external sources during a provision: the **container registry**,
**`get.docker.com`**, the **apt mirrors**, and **Let's Encrypt**. All four are reached from a
**reg.ru Moscow** box.

🚨 **The risk here is UNKNOWN, not low.** If any of the four is unreachable or unreliable from that
network, P1 does not get slower — **P1 changes shape**:

| What fails | What P1 becomes |
|---|---|
| Container registry unreachable | A registry mirror or a load-image-from-file path must be introduced. That is new deploy machinery, not a retry |
| `get.docker.com` unreachable | Docker install moves to distro packages or a pinned offline install |
| apt mirrors unreliable | A mirror must be selected explicitly in provisioning |
| Let's Encrypt **HTTP-01** blocked or rate-limited | A **DNS-01 challenge rework** — a different certificate flow entirely, touching nginx and the renewal path |

**Running this as a 1–2 hour spike before P1 costs almost nothing. Discovering it midway through P1
costs the whole estimate.** That is the entire justification for splitting it out.

### What is already known and does NOT need re-establishing

- The existing Geoconflict VPS fleet is **reg.ru, Moscow** — so this is the same network family the
  game and telemetry boxes already run on. **That is a reason to expect it to work, not evidence
  that it does.** Neither of those boxes pulls from a container registry the way this deploy does.
- ⚠️ **A full-tunnel VPN on the operator's machine makes the RU box unreachable.** If SSH itself
  times out, that is the VPN, not the box — check the route before concluding anything about
  reachability.

## What to build

> 🔴 **SUPERSEDED 2026-09-10 BY THE NARROWING RULING AT THE TOP.** Only the **Let's Encrypt** item
> below is still in scope; the registry and apt items are **ANSWERED** and the `get.docker.com` item
> plus **all latency and intermittency measurement** are **DROPPED PERMANENTLY**. ⛔ **Do not work this
> section as written.** It is kept, struck, so the original scope stays auditable.

Nothing ships. This produces a **measurement**, written down.

1. **From the box**, confirm each of the four is reachable and usable:
   - ✅ ~~the container registry the deploy pulls from (a real authenticated pull, not just a DNS
     resolution — 🔒 **without recording the token, the registry host, or any value**);~~ **ANSWERED
     by `0215`'s deploy — do not re-run.**
   - ⛔ ~~`get.docker.com`;~~ **DROPPED** — never fetched (Docker was already present); live again only
     for a new box or an OS reinstall.
   - ✅ ~~the apt mirrors the base image is configured with;~~ **ANSWERED** (inferred from the deploy
     completing, not separately measured).
   - 🔴 **STILL IN SCOPE — THIS IS NOW THE WHOLE TASK:** Let's Encrypt's ACME endpoint, **including
     whether an HTTP-01 challenge can actually complete** — reachability of the endpoint is not the
     same as the challenge succeeding.
2. ⛔ ~~**Record latency and any failure mode**, not just pass/fail. An intermittent registry is worse
   than a blocked one, because it fails a deploy halfway.~~ **DROPPED PERMANENTLY — and this was a
   real argument, knowingly given up.** See *DROPPED PERMANENTLY* at the top. **A failure mode is
   still recorded for the LE check**; the latency and intermittency figures are not.
3. ✅ **STILL BINDING: if the check fails, STOP and report** — do not improvise a workaround. The
   remedy (**a DNS-01 rework**) is a scoping decision that belongs to the owner. ~~and changes
   `0215`'s brief~~ — 🔴 **`0215` is CLOSED; there is no longer a brief of its to change.**

## Verification steps

> 🔴 **NARROWED 2026-09-10.** The list below is the **original six**, kept auditable. **The
> narrowed acceptance criteria are items 1, 2, 5 and 6 only** — 3 and 4 are dropped with the
> measurement they belonged to.

1. ✅ **BINDING.** ~~All four sources are~~ **The check is** run **from the box itself**, not from the
   operator's machine. ⚠️ A check from a laptop on a different network proves nothing about the box's
   egress.
2. ✅ **BINDING — and it is the point of the whole task.** The Let's Encrypt check covers **challenge
   completion**, not merely endpoint reachability. `certbot renew --dry-run` with the cron's pre/post
   nginx hooks satisfies this; a `curl` at the ACME endpoint does **not**.
3. ⛔ ~~The registry check is a **real pull**, not a resolution or a ping.~~ **DROPPED — already
   satisfied by `0215`'s deploy.**
4. ⛔ ~~Results are written to this task's worklog as a table: source, result, latency, failure mode if
   any.~~ **DROPPED — the latency table will not be produced.** ✅ **Replaced by:** record in this
   task's worklog **whether the dry-run challenge completed**, and **the exact failure mode if it did
   not**. Pass/fail plus failure mode, no latency.
5. ✅ **BINDING, in its narrowed form.** ~~**If any check fails**, `0215`'s brief is amended with the
   consequence **before** `0215` starts, and the amendment is put to the owner.~~ 🔴 **`0215` is
   CLOSED.** **If the check fails, the DNS-01 rework is put to the owner as a scoping decision, and
   the consequence is recorded against [`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md)
   too — because an unread renew log is what would let it go unnoticed.** ⚠️ **A failed check is a
   successful task** — it did its job. Do not treat it as a blocker to route around.
6. 🔒 **BINDING. No values in the worklog** — no registry host, no token, no IP, no endpoint. Names and
   pass/fail only.

## Notes

- ~~**Effort: 1–2 hours. Risk: UNKNOWN.**~~ 🔴 **NARROWED 2026-09-10 — Effort: ~15 MINUTES of owner
  time**, one command on the box. **Risk: still real, and now time-bounded** — the question is
  unanswered and the certificate expires **2026-11-20**, with the silent-renewal window opening
  ~**2026-10-21**. ⚠️ **The effort dropping is not the risk dropping.** A 15-minute check that nobody
  runs is a TLS outage on a six-week timer.
- ~~✅ **This and [`0201`](../0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) (P7)
  are the two pieces of the profile epic that can start TODAY.** Everything else waits on `0215`'s
  inspection. If the sprint needs momentum, these are where it comes from.~~ 🔴 **STALE — `0201` is
  DONE and `0215` is DONE.** Nothing waits on `0215`'s inspection any more.
- ~~⚠️ **Running this early is worth more than it looks.** Its result can rewrite `0215`'s scope, and
  `0215` is the phase everything else hangs off — so a surprise found here is cheap and a surprise
  found there is not.~~ 🔴 **SUPERSEDED — `0215` is CLOSED and this can rewrite nothing.** ⚠️ **The
  "run it early" argument still holds, for a DIFFERENT reason:** a surprise found **now** leaves
  ~six weeks to build a DNS-01 rework; a surprise found **at expiry** is an outage first and a
  project second.
- **Open question this task owns:** ~~**Q6** — are the registry, `get.docker.com`, apt mirrors and
  Let's Encrypt reachable from reg.ru Moscow?~~ 🔴 **Q6 NARROWED 2026-09-10 to its last open half:**
  **can this box complete an ACME HTTP-01 challenge and obtain a certificate?** The registry and apt
  halves are **answered**; the `get.docker.com` half is **dropped**. ⚠️ **Still answered by RUNNING
  the check, not by asking the owner.**
- 🔴 **CROSS-DEPENDENCY, recorded and deliberately NOT fixed here:**
  [`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) owns
  the fact that **nothing reads the `certbot renew` log.** ⚠️ **That is what turns this task from "a
  check someone should run" into "a SILENT failure mode"** — the difference between a renewal that
  fails and a renewal that fails *unnoticed for a month*. ⛔ **Do not fix it here.** Neither task
  covers the other: this one asks **can the challenge succeed**, `0219` asks **would we find out if
  it stopped.**
- ~~**Blocks:** [`0215`](../0215-profile-p1-stand-up-the-box/brief.md) in the sense that its result can
  rewrite `0215`'s scope. It does not block `0215` from *starting* if the owner chooses to run them
  together — but then a failure lands mid-provision, which is exactly what this split avoids.~~
  🔴 **SUPERSEDED 2026-09-10 — `0215` IS DONE. This blocks nothing.** It ran without this spike and
  succeeded; **no result here can rewrite a closed task's scope.** Struck, not deleted. See the
  2026-09-10 amendment above for what the deploy answered and what it did not.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names and file names only.
</content>
