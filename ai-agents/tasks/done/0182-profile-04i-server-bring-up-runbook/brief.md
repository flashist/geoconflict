# Task — Profile Backend: Live server bring-up runbook (T4i, operator/ops)

> 🔴 **CORRECTION 2026-09-04 — THE BOX THIS RUNBOOK STOOD UP STILL EXISTS, BUT ITS STATE IS
> UNVERIFIED.**
>
> **The reconciliation, from two owner statements the same day — both recorded, neither discarded:**
> first *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it
> (whatever is needed)"*, then, superseding it, *"We don't need to cancel any billings, the VPS and
> S3 I created will be reused"* — confirmed: *"Both exist — reuse them in place."*
>
> ⇒ **The VPS and the S3 bucket PHYSICALLY EXIST and are REUSED IN PLACE. Whether the stack is
> provisioned, what is running, and what the bucket holds are UNKNOWN AND UNVERIFIED.** ⚠️ **Hardware
> existence and provisioning state are two different facts, and only the first is known.**
>
> ✅ **This runbook is still the right procedure and it is NOT deprecated.** It is the primary
> reference for [`0215`](../../backlog/0215-profile-p1-stand-up-the-box/brief.md) (P1) — which is now
> **inspect → wipe → re-provision IN PLACE**, not a fresh procurement. ✅ **`setup-profile.sh` is
> idempotent, so re-running it is exactly the right move.** What is stale is every past-tense claim
> here that a box **is** live — read those as *what this procedure did once*, never as a description
> of production today.
>
> ⚠️ **Two lines in it are WRONG, not merely stale, and both are annotated in place below:** the
> `PROFILE_INTERNAL_TOKEN` guidance in §4 (🔴 following it silently destroys player XP) and the backup
> limitation in §8.
>
> ⚠️ **The BUCKET is reused; the CREDENTIALS and the `age` KEYPAIR are RE-ISSUED.** Those are
> different decisions and conflating them is how a half-migrated setup happens. The new keypair's
> custodian must be recorded **at creation time**
> ([`0218`](../../backlog/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md), P3).
> 🔴 **The OLD encrypted objects still in that reused bucket are a LIVE owner decision** — unreadable
> without an `age` identity nobody can name; disposition is
> [`0222`](../../backlog/0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md).
>
> 📌 Epic: [`0213`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md). Full survey:
> [`2026-09-04-profile-backend-clean-slate-survey.md`](../../../knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md)
> — **read its §0 if you are unsure what was done and what was not.**
> **This task's `✅ Done` status is CORRECT and deliberate — the work was done; what happened to the
> box afterwards is a separate, unverified fact. Do not "fix" the status.**

## ID
0182

> **Audience:** a technical specialist standing up the real server. This is an
> **operations runbook**, not a coding task — the deploy code is already written and
> merged. Your job is to provision the reg.ru VPS, point DNS, run the existing deploy,
> and verify the integration milestone. Follow the steps in order. No repo code changes
> are expected; if something fails, report it back rather than editing scripts.

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D). Executes the deploy
machinery built by **T4d** (provisioning code, done), **T4e1/T4e2** (build + on-box stack,
done), and **T4e3** (deploy wiring + the milestone, `0180-profile-04e3-deploy-wiring-milestone`).

## Sprint
Sprint 4

## Priority
High — this is the one step that turns `https://api.geoconflict.ru/health` from nginx's
**502** (no upstream) into a real **200 over TLS**. Blocks T5 (DB + API) going live.

## Status
✅ Done

## Owner
fkit-coder

## Depends on
- T4d, T4e1, T4e2, T4e3 merged (they are — this runbook only *runs* them).
- A registered domain with control over its DNS (`geoconflict.ru` zone), to add the A-record.
- Access (or a teammate with access) to: the project git repo, the container registry the
  game images use (`DOCKER_USERNAME` / `DOCKER_TOKEN`), and a workstation that can build Docker images.

---

## 0. What you are deploying (one-paragraph mental model)

A small, self-contained backend: **PostgreSQL 16 + a tiny Node/Express API + host nginx
(TLS)**, all stood up by one script. Today the API is a `/health` skeleton only (the DB
schema + real endpoints land later in T5). The deploy is driven from a **workstation**, not
on the box: `npm run deploy:profile` builds the image locally, pushes it to the registry,
then SSHes into the VPS and runs `setup-profile.sh`, which provisions the box (swap, Docker,
firewall, nginx/TLS) **and** deploys the stack behind a health-gate. It is **idempotent** —
safe to re-run.

---

## 1. Order the VPS

**Recommended spec — reg.ru, Moscow region, NVMe line:**

| Resource | Value |
|---|---|
| Plan | reg.ru **High C2-M4-D60** (or closest current equivalent) |
| vCPU | **2** |
| RAM | **4 GB** |
| Disk | **60 GB NVMe** (SSD acceptable; the workload is not IOPS-bound) |
| OS | **Ubuntu 22.04 LTS** (must be Debian/Ubuntu apt-based — the script uses `apt-get`) |
| Region | **Moscow, Russia (reg.ru)** — required (see §7, 152-FZ) |
| Swap | created by the script (4 GB) — do **not** add swap manually |
| Approx. cost | ~2,180 ₽/mo — **confirm live on reg.ru/vps/**, tier names/prices change |

**Do not under-size RAM.** A sibling box (telemetry) ran on ~3.8 GB with **zero swap** and
froze hard under memory pressure (19 OOM-kills, provider console dead). 4 GB + the script's
4 GB swap is the deliberate floor. 2 GB is viable only for a throwaway/staging box, never the
standing config.

**At order time:** add your SSH **public** key for the `root` user (reg.ru offers this in the
order form or the console). Note the box's **public IPv4** — you need it for DNS and the deploy.

---

## 2. Point DNS (must happen BEFORE the deploy)

In the `geoconflict.ru` DNS zone, create:

```
api.geoconflict.ru.   A   <VPS_PUBLIC_IPV4>
```

**Why first:** `setup-profile.sh` runs a fail-closed DNS pre-check and refuses to request a
TLS cert if `api.geoconflict.ru` does not already resolve to this box. Let's Encrypt also
rate-limits certificate issuance, so do not run the deploy against a mispointed record.

Wait for propagation, then verify from the deploy workstation:
```bash
dig +short api.geoconflict.ru        # must return the VPS public IP
```

---

## 3. Confirm SSH access to the box

From the deploy workstation:
```bash
ssh -i <path-to-private-key> root@<VPS_PUBLIC_IPV4> 'echo ok && cat /etc/os-release | head -1'
# expect: ok  +  Ubuntu 22.04
```
If you are on a **full-tunnel VPN**, the Russian box may be unreachable — see §7 (add a `/32`
bypass route or turn the VPN off). The deploy uses key auth by default; password auth is a
deprecated, disabled-by-default fallback.

---

## 4. Configure the deploy (`.env.profile` + `.env.profile.secret`)

On the deploy workstation, in the repo root. Copy `example.env.profile` for reference. Both
files are **gitignored** — never commit them.

**`.env.profile`** (non-secret):
```ini
PROFILE_SERVER_HOST=<VPS_PUBLIC_IPV4>
PROFILE_DOMAIN=api.geoconflict.ru
PROFILE_PORT=8080
PROFILE_SWAP_SIZE_GB=4
POSTGRES_USER=profile
POSTGRES_DB=profile
# Game-server IP(s) allowed to reach the (dormant) /internal/ endpoint later. Prod game = 91.197.98.116.
PROFILE_INTERNAL_ALLOW_IPS=91.197.98.116
# Container registry (reuse the game's existing registry credentials).
DOCKER_USERNAME=<registry-username>
DOCKER_REPO=<registry-repo>
# SSH private key for the box (key auth is the standard path).
PROFILE_SSH_KEY=~/.ssh/<your-private-key>
# PROFILE_SSH_USER=root   # default is root
```

> 🔴 **STOP — CORRECTION 2026-09-04. THE NEXT CODE BLOCK'S `PROFILE_INTERNAL_TOKEN` LINE IS WRONG
> AND FOLLOWING IT SILENTLY DESTROYS PLAYER XP.**
>
> ~~*"Optional — leave blank; the box auto-generates and persists it."*~~ **That was true at T4i. It
> is FALSE now.**
>
> `internalAuth` is a `timingSafeEqual` over a **SHARED** secret
> (`src/profile-server/InternalAuth.ts:14-19`, `:26`). A token the **box** generates for itself, which
> the **game server** does not hold, produces a **401 on every credit call**.
>
> 🚨 **And you will not see it happen.** The profile client is fail-soft with **NO durable queue**
> (ADR-101), so **the XP is LOST, not queued**, and **nothing logs above `debug`**.
>
> ✅ **What to do instead: generate `PROFILE_INTERNAL_TOKEN` ONCE, explicitly, and set the SAME value
> on BOTH sides** — here on the box, and in the game server's production environment. See
> [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) (P2), which owns the
> game-server half, and [`0215`](../../backlog/0215-profile-p1-stand-up-the-box/brief.md) (P1), which
> owns this half.
>
> ⚠️ **There is a SECOND silent barrier on the same path**, and one does not reveal the other:
> `PROFILE_INTERNAL_ALLOW_IPS` (`example.env.profile:33`) is pinned to a **June** game-prod egress IP,
> and nginx enforces `allow …; deny all;` at `/internal/` (`setup-profile.sh:719-720`). A stale value
> ⇒ **403 on every credit call**, swallowed just as quietly. **`0062`'s D3 — a real authenticated call
> succeeding end to end — is the only check that catches either.**
>
> 📌 Recorded 2026-09-04 by the producer, from an fkit-architect scope. Full survey:
> [`2026-09-04-profile-backend-clean-slate-survey.md`](../../../knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md).

**`.env.profile.secret`** (secrets — keep out of chat/tickets/screen-shares):
```ini
# REQUIRED — generate a strong password, e.g.  openssl rand -base64 32
POSTGRES_PASSWORD=<strong-generated-password>
# Registry token for `docker login` (if the repo is private).
DOCKER_TOKEN=<registry-token>
# ⚠️ SUPERSEDED 2026-09-04 — the original line read:
#     "Optional — leave blank; the box auto-generates and persists it."
# That is FALSE now. This is a SHARED secret. Leaving it blank makes the box mint its own,
# the game server 401s on every credit call, and the XP is LOST (fail-soft, no queue, no log
# above debug). Generate it ONCE and set the SAME value here and in the game server's prod env.
PROFILE_INTERNAL_TOKEN=<generate-once-set-identically-on-both-sides>
```

**Record `POSTGRES_PASSWORD` in the team password manager** before you proceed — it is the
profile DB password and the deploy will not show it again.

---

## 5. Run the deploy

From the repo root on the deploy workstation (Docker must be running — it cross-builds a
`linux/amd64` image for the box):

```bash
npm run deploy:profile
```

What it does, in order: builds + pushes the image and pins an immutable `@sha256` digest →
uploads `setup-profile.sh` → stages secrets in a `0600` temp file, SCPs it `0600`, sources it
on the box and deletes it **before** running setup (so no secret ever lands in the box's
process list) → `setup-profile.sh` provisions swap/Docker/ufw/nginx/TLS and brings up the
stack behind a **120-second health-gate** (auto-rolls-back to the previous image if unhealthy).

Expected tail: a `DONE` banner and "Profile backend setup completed on …". The first run takes
several minutes (apt upgrade, Docker install, certbot).

---

## 6. Verify (acceptance — this is the milestone)

**A. The integration milestone — from anywhere:**
```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.geoconflict.ru/health   # expect: 200
curl -sS https://api.geoconflict.ru/health                                    # expect: {"status":"ok"}
```
200 over a **valid Let's Encrypt cert** (no `-k` needed) is the pass condition. Before this
deploy the same URL returned nginx's **502** (no upstream) — the flip to 200 is the goal.

**B. On the box (`ssh root@<host>`):**
```bash
swapon --show                       # /swapfile present (~4G)
sysctl vm.swappiness                # = 10
docker compose -f /opt/profile/docker-compose.yml ps   # postgres + profile-api both "healthy"
ufw status                          # 22, 80, 443 allowed; default deny incoming
docker images --digests | grep profile   # deployed by @sha256 digest, not a mutable tag
```

**C. Secret hygiene spot-check** — during/just after a deploy, on the box:
```bash
ps -ef | grep -iE 'postgres_password|profile-deploy-env' | grep -v grep   # expect: no matches
```
No DB password or staging-env path should appear in any process argv.

---

## 7. Operational notes / gotchas

- **VPN blocks the deploy.** The RU box is unreachable while a full-tunnel VPN is on (SSH/curl
  time out). Either disable the VPN, or add a host-specific bypass route:
  ```bash
  route -n get default | grep gateway                 # find the real physical gateway
  sudo route -n add -host <VPS_PUBLIC_IPV4> <gateway>  # /32 beats the VPN's /1 routes
  route -n get <VPS_PUBLIC_IPV4> | grep interface      # en0 = direct (good); utun* = still via VPN
  ```
- **Region must be RU.** All Geoconflict boxes are reg.ru/Moscow; keeping this box in RU
  satisfies 152-FZ **data residency** for player data. Verify by IP geolocation — ignore any
  "Hetzner"/Finland comments in older scripts, they are stale and wrong. (Roskomnadzor operator
  registration + user consent is a **separate legal task**; box location alone does not cover it.)
- **If the box ever goes unreachable, check memory/OOM first, not disk** (the telemetry lesson):
  ```bash
  journalctl -b -1 -k | grep -i 'out of memory'   # then: free -h ; docker stats ; df -h
  ```
- **Re-running is safe.** `npm run deploy:profile` is idempotent; re-run to ship a new image or
  recover. A bad SSH target errors before mutating the box, and staging secret files are cleaned
  up on any exit.

---

## 8. Known limitations (NOT blockers for bring-up — coordinate as follow-ups)

These are by-design gaps in the current scripts; flag them, do not fix them here:

- ~~**Backups are local + weekly + uncompressed.** The cron writes a weekly plain-SQL `pg_dump`
  into `/opt/profile/backups` on the same disk (`setup-profile.sh:688`); offsite reg.ru S3 +
  nightly + a restore drill are **deferred to T8** (`0189-postgres-backup-routine`). Until T8 ships,
  treat the box as **not durably backed up** — fine now (no real data yet), but it must be wired
  before paid citizenship / real profile data goes live.~~
  📌 **SUPERSEDED 2026-09-04 — two things in the struck text are now wrong.**
  **(1)** The cited line `setup-profile.sh:688` has **MOVED**; do not navigate by it. **(2)** The
  off-box path it calls *"deferred to T8"* has **SHIPPED** — nightly **encrypted off-box** backups
  exist and **fail CLOSED at deploy** (`setup-profile.sh:889-908`), and a **scripted restore** exists
  at `profile-backup.sh:192-262`.
  ⚠️ **What is still TRUE, and it is the part that matters:** the restore has **never been proven
  against non-empty data.** The 2026-07-01 drill ran against an **empty** DB (0 rows — see `:147-153`
  below) **and** predates the default-deny guard, so **its command line no longer works.**
  🚨 **The gate stands in full: "A backup that has never been restored is not a backup."** Discharging
  it is [`0218`](../../backlog/0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md)
  (P3), which also fixes the defect that made this urgent — **the previous `age` private key had no
  recorded home, and when asked on 2026-09-04 the owner did not know what it was.**
- **Docker images are not auto-pruned**, and the previous image is retained for rollback, so
  image storage grows across redeploys. Run `docker image prune -f` periodically (keep current +
  rollback). The script logs a disk warning to `/var/log/disk-warnings.log` once `df /` exceeds
  60% — nothing pages on it.
- **No external monitoring on this box.** Container healthchecks + systemd auto-restart exist,
  but nothing off-box observes liveness — add one external uptime check on
  `https://api.geoconflict.ru/health` so an outage actually alerts someone.
- **Container memory is not cgroup-capped** (Postgres is bounded by its `-c` flags; the Node API
  is unbounded), which is exactly why RAM must not be cut below 4 GB — swap is the only backstop.

---

## Acceptance criteria
- `https://api.geoconflict.ru/health` returns **200 over a valid (non-self-signed) TLS cert**.
- On the box: `/swapfile` active, `vm.swappiness=10`, ufw allows only 22/80/443, both compose
  services report **healthy**, and the deployed image is referenced by an `@sha256` digest.
- No DB password or staging-env path appears in any process argv on the box during deploy.
- `POSTGRES_PASSWORD` is recorded in the team password manager; `.env.profile*` files are not committed.
- Box geolocates to **RU**.

## Out of scope
- Any change to `setup-profile.sh` / `build-deploy-profile.sh` (deploy code is owned by T4d/T4e*).
- DB schema, profile/credit endpoints (T5), match-end crediting (T6).
- Offsite S3 backups + restore drill (T8). `sshpass` argv hardening / concurrency lock (T4g).
- Image secret byte-scan gate (T4f).
