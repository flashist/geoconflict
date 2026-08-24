# Task — Profile Backend: Live server bring-up runbook (T4i, operator/ops)

> **Audience:** a technical specialist standing up the real server. This is an
> **operations runbook**, not a coding task — the deploy code is already written and
> merged. Your job is to provision the reg.ru VPS, point DNS, run the existing deploy,
> and verify the integration milestone. Follow the steps in order. No repo code changes
> are expected; if something fails, report it back rather than editing scripts.

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D). Executes the deploy
machinery built by **T4d** (provisioning code, done), **T4e1/T4e2** (build + on-box stack,
done), and **T4e3** (deploy wiring + the milestone, `s4-profile-04e3-deploy-wiring-milestone.md`).

## Sprint
Sprint 4

## Priority
High — this is the one step that turns `https://api.geoconflict.ru/health` from nginx's
**502** (no upstream) into a real **200 over TLS**. Blocks T5 (DB + API) going live.

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

**`.env.profile.secret`** (secrets — keep out of chat/tickets/screen-shares):
```ini
# REQUIRED — generate a strong password, e.g.  openssl rand -base64 32
POSTGRES_PASSWORD=<strong-generated-password>
# Registry token for `docker login` (if the repo is private).
DOCKER_TOKEN=<registry-token>
# Optional — leave blank; the box auto-generates and persists it.
# PROFILE_INTERNAL_TOKEN=
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

- **Backups are local + weekly + uncompressed.** The cron writes a weekly plain-SQL `pg_dump`
  into `/opt/profile/backups` on the same disk (`setup-profile.sh:688`); offsite reg.ru S3 +
  nightly + a restore drill are **deferred to T8** (`s4-postgres-backup-routine.md`). Until T8 ships,
  treat the box as **not durably backed up** — fine now (no real data yet), but it must be wired
  before paid citizenship / real profile data goes live.
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
