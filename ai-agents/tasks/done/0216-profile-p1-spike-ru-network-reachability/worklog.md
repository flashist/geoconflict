# Worklog — 0216

> Created at close, 2026-09-10, to discharge the brief's **binding verification step 4** in its
> narrowed form: *record whether the dry-run challenge completed, and the exact failure mode if it did
> not.* **Pass/fail plus failure mode, no latency** — the latency table was dropped permanently by the
> narrowing and is **not** reinstated here.
>
> 🔒 **No values recorded** — no serial number, no IP, no endpoint, no token. `api.geoconflict.ru` is
> already public in `CLAUDE.md`.

## 2026-09-10 — the check was RUN, on the box, and it PASSED

**Who ran it:** the **owner**, personally, on the box, guided step by step. **The lead read the raw
terminal output.** ⚠️ **No owner sign-off was taken on the close itself** — hence the close is
`(agent-closed — not owner-verified)`.

| Check | Result | Failure mode |
|---|---|---|
| `certbot certificates` | ✅ Certificate Name `api.geoconflict.ru`, Key Type ECDSA, Domains `api.geoconflict.ru`, Expiry **2026-11-20 11:01:42+00:00 (VALID: 70 days)** | — |
| **ACME HTTP-01 challenge completion** — `certbot renew --dry-run` with the cron's `--pre-hook "systemctl stop nginx"` / `--post-hook "systemctl start nginx"`, run while nginx was up | ✅ **COMPLETED.** `Congratulations, all simulated renewals succeeded: /etc/letsencrypt/live/api.geoconflict.ru/fullchain.pem (success)` | — |
| `systemctl is-active nginx`, after the run | ✅ `active` | — |
| `curl https://api.geoconflict.ru/health`, after the run | ✅ **200** | — |

- ✅ **Ran against LET'S ENCRYPT STAGING** (`--dry-run`): a **full challenge**, **zero production
  rate-limit budget** spent.
- ✅ **The pre/post nginx hooks were exercised and work** — nginx stopped, the challenge bound port 80,
  nginx came back `active`, TLS served 200. **Same mechanism the twice-daily cron will use from
  ~2026-10-21** ⇒ the renewal path is proven end to end, not just the challenge.
- 📌 `Account registered.` appeared — a **new LE *staging* account**, **expected on a first staging
  run**, **no effect on the production account or its rate limits.** Not a finding.

## 🚨 Residual that survives this close

**Renewal works TODAY. NOTHING READS THE RENEWAL LOG** — that is
[`0219`](../../backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md),
**OPEN**. If renewal breaks between now and October (a firewall change, a provider change, an nginx
config change) it will still fail **SILENTLY, twice a day, until the certificate expires and
`api.geoconflict.ru` stops serving TLS**.

⇒ **THIS CHECK PROVED CAPABILITY, NOT MONITORING.**

## Not measured — dropped by the narrowing, NOT restored by this close

1. **Intermittency** — never measured, for any source. ⚠️ **A passing challenge on one afternoon says
   nothing about an intermittent network.**
2. **Latency** — never recorded, for any source.
3. **`get.docker.com`** — never fetched. Moot for this box; live again for a new box or an OS reinstall.
