# Profile Box — Let's Encrypt Renewal Proven (Capability, NOT Monitoring)

**Source**: `ai-agents/tasks/done/0216-profile-p1-spike-ru-network-reachability/brief.md` (plus `worklog.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0216` / P1-spike of the `0213` profile-backend rebuild epic

> # 🚨 THE ONE SENTENCE THAT MUST TRAVEL WITH THIS PAGE
>
> ## THIS CHECK PROVED **CAPABILITY**, NOT **MONITORING**.
>
> Renewal works **today**. **Nothing reads the renewal log.** That is task `0219`, which is **OPEN**.
> 🔴 **If renewal breaks between now and October — a firewall change, a provider change, an nginx
> config change — it will still fail SILENTLY, twice a day, until the certificate EXPIRES on
> 2026-11-20 and `api.geoconflict.ru` stops serving TLS.**
>
> **State it in those terms wherever this task is cited. A capability proven on one afternoon is not a
> system that tells you when the capability goes away.** ⛔ **`0216` being Done does NOT mean the
> certificate is safe.**

## Goal

**The task was NARROWED before it was closed, and the narrowing is part of its identity.**

- **Originally** (title, 2026-09-04): *"P1-spike — Confirm the registry, Docker, apt and Let's Encrypt
  are reachable from reg.ru Moscow"* — a broad RU-network reachability spike with a
  source/result/latency/failure-mode table.
- **Narrowed 2026-09-10 by OWNER RULING**, live in session, on the producer's recommendation:
  **narrow in place to the Let's Encrypt renewal check ONLY. Do NOT cancel it.** The ID, the history
  and the LE rate-limit warnings stay attached to the one question still open. ⛔ **No mover skill was
  invoked and `## Status` was unchanged at that point** — the owner ruled the **scope**, not the
  schedule.
- The folder name is **kept unchanged on purpose** — it is the task's identity and several files link
  to it. **Do not read it as the scope.**

The narrowed question: **can this box complete an ACME HTTP-01 challenge and obtain a certificate?**
It had **never been verified.** Task `0215`'s deploy did **not** verify it: the existing certificate
was **preserved** because `--keep-until-expiring` (`setup-profile.sh:684-687`) made issuance a no-op,
so **no challenge had ever been observed from this box.**

## Key Changes

**No code. Nothing was built.** The task's whole deliverable is a recorded check.

**Run on the box 2026-09-10 by the OWNER personally**, guided step by step, with the raw output read
by the lead:

| Check | Result |
|---|---|
| `certbot certificates` | Certificate `api.geoconflict.ru`, key type **ECDSA**, expiry **2026-11-20 11:01:42+00:00 (VALID: 70 days)** |
| `certbot renew --dry-run`, **with the cron's own pre/post nginx hooks**, run while nginx was up | ✅ `Congratulations, all simulated renewals succeeded: … fullchain.pem (success)` |
| `systemctl is-active nginx`, after the run | `active` |
| `curl https://api.geoconflict.ru/health`, after the run | **200** |

- ✅ The dry run exercised the **real mechanism against Let's Encrypt STAGING** — a **full challenge**,
  and **zero production rate-limit budget spent**.
- ✅ **The renewal path is proven end to end, not just the challenge.** The pre/post nginx hooks were
  exercised and work: nginx stopped, the challenge bound port 80, nginx came back `active`, and TLS
  served 200 afterwards. That is the **same mechanism** the twice-daily automatic renewal
  (`setup-profile.sh:983`) will use from around **2026-10-21** (certbot's 30-day window).
- 📌 `Account registered.` appeared in the output — a **new LE *staging* account**, expected on a first
  staging run, with **no effect on the production account or its rate limits**. Recorded so it is not
  misread later. **It is not a finding.**

## Outcome

**Closed 2026-09-10 as `✅ Done (agent-closed — not owner-verified)`.** The narrowed question is
answered: **yes, this box can obtain a certificate.**

**Marker rationale, not flattened in either direction:** the **owner personally ran every command on
the box**, guided step by step, and **the lead read the raw output** — so this is better-evidenced
than a typical agent close. But **no owner sign-off was taken on the close itself**, and **nothing
here is verified in production use** — what was proven is a *staging simulation* of the real renewal
path, not a real renewal observed in production. Hence the marker.

### What the narrowing permanently DROPPED — this close does not restore any of it

1. 🔴 **INTERMITTENCY — never measured, for any source.** ⚠️ **A passing challenge on one afternoon
   says nothing about an intermittent network.**
2. 🔴 **LATENCY — never recorded, for any source.** The source/result/latency/failure-mode table the
   original spike called for **does not exist and will not be produced.**
3. **`get.docker.com` — never fetched.** Moot for *this* box; live again for a **new** box or a
   provider-side OS reinstall.

### Answered by `0215`'s deploy instead — do not re-run these

| Source | Answer | Evidence |
|---|---|---|
| Container registry, **from the box** | ✅ Reachable and usable | A real image pull completed on the box, and both compose services then came up healthy on a `@sha256`-pinned image |
| apt mirrors | ✅ Pass | `setup-profile.sh:181` runs `apt-get update && upgrade` unconditionally and `:619`/`:844` install further packages; the deploy completed end to end. ⚠️ **Inferred from the deploy succeeding — NOT separately measured.** Say it that way; do not upgrade it to a measurement |

⚠️ Note the tension worth keeping: **registry reachability was in fact the one thing that failed** in
`0215` — transiently, on the first deploy attempt — which is squarely inside this spike's original
subject.

## Related

- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which adopted and re-provisioned the box, preserved this certificate byte-identical, and did **not** run this spike
- [[decisions/sprint-4]] — the sprint that owns both, and the owner-ruled work order that puts `0219` (the task owning the unread renewal log) second of three
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, the runbook whose TLS/DNS steps this exercises
- [[tasks/profile-vps-provisioning]] — task `0176`, which installed the fail-closed DNS check and the certbot path
- [[systems/player-profile-store]] — the backend served over the certificate this proves renewable
- [[systems/architecture-overview]] — the profile-tier section carrying the renewal fuse this task's residual names
