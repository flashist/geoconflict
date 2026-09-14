# 0257 — worklog

Build step run 2026-09-14 by `fkit-coder`, spawned as the **Build worker** of `/fkit-sprint-ship-loop`
under the declared-approval marker (owner approved the previous coder's runbook + repo change live
in the lead session; fix shape ruled = mirror the profile box's nginx pre/post hooks). No owner
channel in this spawn. No deploy, no commits, no wiki writes, no task-file moves.

All times **UTC** unless marked MSK (box local = MSK = UTC+3). 🔒 No hostnames beyond the public CN,
no IPs, no headers, no passwords anywhere below; pasted log lines were checked.

## 1. Owner's box steps (done before this spawn — recorded verbatim from the driver, NOT redone)

> `certbot renew --dry-run` with hooks → success; real `certbot renew` with hooks → success,
> `notBefore=Sep 14 08:18:41 2026 GMT`, `notAfter=Dec 13 08:18:40 2026 GMT`, nginx active on :80/:443,
> `Verify return code: 0 (ok)`, HTTPS 200 (also confirmed from the lead's laptop);
> `/etc/cron.d/uptrace-backups` line 25 now carries the pre/post hooks (backup at
> `/root/uptrace-backups.cron.bak-2026-09-14`); `certbot.timer` disabled (was enabled, last ran
> 08:49 MSK); second dry-run with nginx up → success. Step-1 diagnosis: renewal log full of
> `Could not bind TCP port 80`, one transient `Read timed out` to `acme-v02`; `ufw` inactive; DNS
> correct (box behind 1:1 NAT).

### Read-only re-verification of the box (coder, this spawn, over SSH)

| Check (brief verification step) | Observed |
|---|---|
| Cert on disk | `notBefore=Sep 14 08:18:41 2026 GMT` · `notAfter=Dec 13 08:18:40 2026 GMT` |
| Cert from the laptop (`openssl s_client`) + HTTPS | same dates, `CN=telemetry.geoconflict.ru`, `HTTPS 200` |
| `systemctl is-enabled certbot.timer` (step 4) | `disabled` (and `inactive`) — unit present, not absent |
| Cron line (`/etc/cron.d/uptrace-backups:25`) | `0 0,12 * * * root certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx" >> /var/log/certbot-renew.log 2>&1` |
| nginx | `ActiveState=active`; listening `0.0.0.0:80` and `0.0.0.0:443` |
| `certbot renew --dry-run` with nginx up (step 6) | `letsencrypt.log` 12:21:56–12:22:05 MSK: `Certificate not due for renewal, but simulating renewal for dry run` → `Running pre-hook command: systemctl stop nginx` → **`Congratulations, all simulated renewals succeeded`** → `Running post-hook command: systemctl start nginx` |

⚠️ **`notBefore` is not the renewal moment.** Let's Encrypt backdates `notBefore` by ~1 h. The
journal + `letsencrypt.log` pin the real sequence:

| UTC | Event (source) |
|---|---|
| 05:49:09 | last failed run of the old renewer — `Could not bind TCP port 80` (journal, `certbot`) — the "08:49 MSK" the owner saw |
| 09:16:43 → 09:16:53 | dry-run **with hooks**: nginx stopped 09:16:45, `Congratulations, all simulated renewals succeeded`, nginx started 09:16:53 |
| 09:17:05 → 09:17:18 | **real `certbot renew` with hooks**: `Certificate is due for renewal, auto-renewing`, nginx stopped 09:17:06, `Congratulations, all renewals succeeded`, nginx started **09:17:18** with the new cert |
| 09:17:18 | first OTLP `POST /v1/metrics 200` in nginx's access log — the same second nginx came back |
| 09:21:57 → 09:22:05 | second dry-run, nginx up → success (table above) |

So the renewal's 8–12 s nginx gap is the whole cost of the hooked shape, as the ruling accepted.

## 2. Repo change (by content, against current `setup-telemetry.sh`; `bash -n` clean)

`setup-telemetry.sh`, two hunks (`git diff --stat`: 21 insertions, 2 deletions):

1. HTTPS section, around `certbot certonly --standalone`: the `RENEWAL CONTRACT` comment above
   `systemctl stop nginx` (mirrors `setup-profile.sh`'s), and after `certonly`
   `systemctl disable --now certbot.timer >/dev/null 2>&1 || true` with the same rationale comment
   as `setup-profile.sh` (0219 review R3 ruling). Order: `certonly` < timer-disable < cron line.
2. Cron heredoc: `certbot renew --quiet --post-hook "systemctl reload nginx"` →
   `certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"`,
   log redirect `>> /var/log/certbot-renew.log 2>&1` kept (0258 reads it), plus the explanatory
   comment mirroring `setup-profile.sh`'s cron comment.

**Box hand-edited, script landed separately (brief step 5).** The box's cron line and the
`certbot.timer` disable were applied by the owner by hand on 2026-09-14; this script change makes the
repo say the same thing. The box and the repo are known to agree on both points (table in §1 —
the box's line 25 is byte-identical to the script's new cron line). **No redeploy was run** — the
script lands with the next `build-deploy-telemetry.sh`, which is now idempotent over the hand edit
(`--keep-until-expiring`, `disable … || true`, cron file rewritten to the same content).

## 3. Harness — RED first, then green

`tests/scripts/profile-deploy-hardening.test.sh`: new block
`== Structural: telemetry certbot renewal — hooked cron + certbot.timer disabled (0257) ==` placed
after the 0221 T12 block, before `ALL PASS` (marker unchanged; `ShellHarnesses.test.ts` untouched).
Four assertions over `$REPO_ROOT/setup-telemetry.sh`: hooked cron line present with both hooks and
the log redirect; no `--post-hook "systemctl reload nginx"` left outside comments; timer disable
present with `|| true`; order `certonly` < timer-disable < cron line.

**RED** — harness edited, `setup-telemetry.sh` still at `HEAD` (`git diff --quiet` confirmed):

```
== Structural: telemetry certbot renewal — hooked cron + certbot.timer disabled (0257) ==
  ❌ setup-telemetry.sh: hooked renew cron line missing (pre-hook stop / post-hook start / >> /var/log/certbot-renew.log)
  ❌ setup-telemetry.sh: reload-only post-hook still present — that renew can never bind :80 behind nginx
  ❌ setup-telemetry.sh: 'systemctl disable --now certbot.timer … || true' missing
  ❌ setup-telemetry.sh: certbot.timer disable mis-ordered (certonly=795 timer= cron=930)

SOME FAILED
```

Every pre-existing assertion stayed ✅ in that run.

**Green** — after the script change:

```
== Structural: telemetry certbot renewal — hooked cron + certbot.timer disabled (0257) ==
  ✅ setup-telemetry.sh: renew cron carries the nginx stop pre-hook + start post-hook and keeps the renew log
  ✅ setup-telemetry.sh: no reload-only post-hook left (outside comments)
  ✅ setup-telemetry.sh: certbot.timer disabled (|| true-safe)
  ✅ setup-telemetry.sh: certbot.timer disable sits after certonly and before the hooked renew cron

ALL PASS
```

## 4. Tests and lint

- `npm test` (full; the hardening harness runs inside it via `ShellHarnesses.test.ts`):
  **Test Suites: 122 passed, 122 total · Tests: 1269 passed, 1269 total · Time: 38.2 s · exit 0.**
  No jest suite added or removed by this task (the counts differ from `CLAUDE.md`'s 113/1185 because
  of other, unrelated uncommitted work in the tree — not this change).
- `npm run lint` (`eslint`): **exit 0**, no output.

## 5. Ingest — measured, per lane (brief verification step 3)

Sources: Uptrace internal API (read-only login as in 0032 — password piped from
`.env.telemetry.secret` over stdin, never echoed or written; scratch cookie jar deleted at the end),
ClickHouse `uptrace.datapoints` on the telemetry box (read-only `SELECT`s), nginx access log on the
telemetry box, and the collector's log on the game box — all over SSH with the hosts/keys named from
the env files, never printed. VPN route checked first: telemetry box via `en0` (not tunnelled); game
box reachable.

| Lane | Last before the gap | First after | Now (09:27–09:34Z) |
|---|---|---|---|
| (a) **Client** — `service.name=geoconflict-client`, spans (`funcs`) | 2026-09-04 05:59:09 (18,191 spans 09-01→09-04) | 09:18Z bucket (min `_time`) | 8 spans by 09:24:23, all `service.version=b349210…` |
| (a) **Client** — logs | 2026-09-04 05:59:57 | 09:17Z bucket | 102 logs by 09:26:48, all `b349210…` |
| (b) **Server** — `service.name=openfront`, logs | 2026-09-04 05:59:58 (246,439 logs 09-01→09-04) | 09:17Z bucket | 641 logs by 09:27:19 |
| (b) **Server** — spans | **none in the healthy 09-01→09-04 baseline either** | n/a | n/a — the server has never emitted spans to this Uptrace; not a regression, not a lane |
| (c) **Metrics** — `geoconflict_server_*` (10 series, Node SDK on the game server) | 2026-09-04 06:08:00 (1,872,600 datapoints 09-01→09-04) | **09:17:18Z** (`POST /v1/metrics 200`, first hit after nginx restart) | 7,160 datapoints by 09:34:00; **0** in 09-07→09-14 08:18 |

- **`service.version` seen after renewal: `b34921010ae4e32c4672c5a6df7249cede9f4f44`** = the
  `DEPLOY prod: bump version to 0.0.151` commit (2026-09-12), i.e. **the current prod build — the
  evidence 0032 Step 5 needs.** `362a2f9…` (0.0.140) does not appear post-renewal (only `b349210`).
- nginx access log, OTLP POSTs per MSK hour on 2026-09-14: `01h: 1 · 09h: 2 · 12h: 1442` (12 MSK
  = 09Z, the renewal hour). Since 09:17Z by path: `423 /v1/logs`, `1300 /v1/metrics`, `12 /v1/traces`,
  all `200`.
- ⚠️ **Correction to 0032's "nothing from 0.0.151 has ever appeared":** a trickle of `b349210`
  data did land while the cert was expired — 2 spans (2026-09-12 17:00–17:20Z) and 7 log records
  (09-12 17:00 → **09-14 06:44:10Z**, the last OTLP POST before renewal at 09:44 MSK). Some client
  path does not enforce cert expiry. It is a trickle, not a lane (7 logs in 2 days vs 102 in 10
  minutes after), so the "dark" conclusion stands; the absolute claim does not.
- Both client and server lanes resumed **within the first minute** after 09:17:18Z; there was no
  1-hour delay — the hour is `notBefore` backdating (§1).

### (d) Game-box otel-collector — NOT a cert lane; a separate, pre-existing defect (out of scope)

The driver asked for `docker logs --since 3h otel-collector | grep -iE 'x509|expired|Exporting failed'`
(expected 0 after renewal). Observed, read-only:

- `docker logs --since 3h … | grep -ciE …` → **0**; `--since 30m` → **0**; `--since 24h | wc -l` → **0**.
  But that is because **`docker logs` stops reading at 2026-08-02T14:24Z** (its newest line ever,
  mid-stack-trace), while the container's json log file is **885,907,454 bytes, mtime 09:33Z today**,
  `LogConfig: json-file map[]` — no rotation.
- Raw file tail (last 3 MB): **12,432 lines today**, `x509|expired` = **0**, `Exporting failed` =
  **1,776**, `Unimplemented` = **1,776**. Newest error, sanitized:
  `Exporting failed. Dropping data. … "otelcol.component.id": "otlphttp", "otelcol.signal": "metrics",
  "error": "not retryable error: Permanent error: rpc error: code = Unimplemented …`
- Cause, visible in the mounted config: `exporters.otlphttp.endpoint: "http://127.0.0.1"` — plain
  HTTP to loopback, where the game box's own nginx answers on :80. **The collector has never pointed
  at the telemetry host**, so the cert expiry never touched it and 0257 cannot make it "resume".
  ClickHouse confirms: **`node_*` metrics have 0 rows ever** (since 2026-06-01 at least). Container
  `created 2025-11-08`, `startedAt 2026-08-02T16:37Z`, `restarts=0`, process alive, `net=host`,
  scraping `localhost:9100` (node-exporter is up).

**The brief's lane (c) "game-box host metrics (`geoconflict.server.*` / node-exporter series)"
conflates two sources:** `geoconflict_server_*` comes from the Node SDK inside the game container
(`OTEL_EXPORTER_OTLP_ENDPOINT=https://<host>`) and **resumed**; node-exporter series go through
the collector and **have never arrived**. Needs its own brief (producer): fix the collector endpoint
(the `${OTEL_EXPORTER_OTLP_ENDPOINT}` substitution in `setup.sh:100-105` evidently rendered a
loopback default), plus json-file rotation for that container (885 MB and growing — the same
failure class as the prod nginx `access.log` disk-full incident).

## 6. Residuals

- **Nothing watches `/var/log/certbot-renew.log`** — the log on the box still ends with the old
  failures; a dead hooked cron would be silent → **0258** (blocked on this task, now unblocked).
- **Box was hand-edited** (cron line + `certbot.timer` disable); repo and box agree byte-for-byte
  today, but the box carries the change only by hand until the next `build-deploy-telemetry.sh`.
- **`certbot.timer` disable applied by hand** on the box; the script now does it on every deploy.
- **Transient `Read timed out` to `acme-v02`** in the owner's step-1 diagnosis — one occurrence,
  not reproduced in either dry-run or the real renewal; not investigated further.
- **Game-box otel-collector exports to loopback and `docker logs` is unreadable past 2026-08-02**
  (§5d) — pre-existing, cert-independent, out of 0257's scope; needs a brief.
- **Client trickle under an expired cert** (§5) — some client path skips expiry validation; noted
  for 0032 Step 5, not acted on.
- **Server spans never existed** in this Uptrace (§5b) — the brief's "game-server spans resume"
  cannot be shown because there is no baseline; logs and metrics were the server's real lanes.

## 7. Decision log — review processing (coder, spawned by `fkit-sprint-ship-loop`, 2026-09-14)

- **Scope:** `fkit-process-stateful-review` method over `review.md` round 1 (R1, R2). Wrote only the
  *Coder response* rows. No source, script, or test change.
- **Verification:** R1 checked against `setup-telemetry.sh:949` + `setup-profile.sh:1514` (hooks
  identical; restart only in certbot's post-hook). R2 checked against the `(0257)` harness block
  `:949-964` vs the profile block `:428-439` (both whole-file greps). Both CORRECT, both frontier-moves,
  severity low confirmed. Neither is a defect → no NEEDS-DECISION.
- **Autonomously-applied fixes:** none.
- **Obvious-winner calls:** none.
- **Residuals:** both already recorded in `review.md` *Accepted residuals* by owner ruling
  (2026-09-14, via AskUserQuestion); ledger `Status: closed-out` left as is.
