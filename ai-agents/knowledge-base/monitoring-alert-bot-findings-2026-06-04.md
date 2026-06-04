# Monitoring & Alert Bot — Findings and Recommendations (2026-06-04)

> **Purpose of this document.** Input for the producer to turn into a dedicated task
> for an infrastructure monitoring + Telegram alert bot. It captures concrete findings
> from the 2026-06-03/04 telemetry-server outage investigation, what should be
> monitored and why, the failure modes we actually hit, and how to reuse existing
> project infrastructure. It is a findings/recommendations doc, **not** a final spec —
> open questions for the producer are listed at the end.

---

## 1. Why we need this (motivation)

The self-hosted telemetry server (`telemetry.geoconflict.ru`, a separate VPS) went
completely down and **we only found out 2–3 weeks later**, by chance. It had also
gone down before. Each time, recovery was manual and reactive. The root causes were
real, preventable resource problems that a basic monitor would have caught early.

There is currently **no proactive alerting**. The only "monitoring" is a daily cron on
the telemetry VPS that appends to a local `disk-warnings.log` file — which is useless
precisely when it matters, because when the box is down/frozen nobody can read a log
that lives on the down box.

**Core lesson:** monitoring that runs *only on the monitored machine* cannot detect
that machine being dead. We need an **external heartbeat** in addition to on-box checks.

---

## 2. What actually broke (so the bot watches the right things)

Two distinct incident families have hit the telemetry VPS. The monitor should cover
both, because "fixing one" did not prevent the other.

### Incident family A — Disk exhaustion (2026-05, fixed)
- Local ClickHouse tar backups, then ClickHouse internal `system.*_log` tables, then
  ClickHouse filesystem logs grew until the 59 GB root disk filled.
- Symptom externally: nginx `502 Bad Gateway` / unstable stack.

### Incident family B — Memory exhaustion / OOM (2026-06, fixed 2026-06-04)
- The VPS has ~3.8 GB RAM and **shipped with zero swap**.
- ClickHouse internal diagnostics (`system.metric_log` reached ~478 MB) plus background
  merges spiked memory; the kernel OOM-killer fired **19 times**, all killing ClickHouse.
- With no swap cushion, the host eventually **froze entirely** — unreachable over SSH,
  HTTPS, ping, *and* the hosting provider's web console. Only a hard reboot recovered it.
- Disk was fine this time (18% used), which is exactly why a disk-only monitor would
  have stayed silent.

**Takeaway for thresholds:** memory + swap + OOM events are first-class signals, not
afterthoughts. So is "the box stopped responding at all."

---

## 3. Recommended architecture — two independent layers

A single approach cannot cover both "slow degradation" and "box is dead". Recommend two
complementary layers:

### Layer 1 — External heartbeat / uptime (catches "box is dead/frozen")
The most important missing piece. Options, roughly in order of robustness vs effort:

- **Dead-man's-switch (preferred):** the monitored box periodically pushes a "still
  alive" ping to an *external* service; if the pings stop, the external service alerts.
  This elegantly catches a fully frozen box (the 2026-06 case), where nothing on the box
  can send anything. Can be a self-hosted tiny endpoint or a free tier of
  healthchecks.io / UptimeRobot style services.
- **External polling:** something *outside* the telemetry VPS periodically requests
  `https://telemetry.geoconflict.ru/` and alerts on timeout / non-200. Could run from the
  game-server VPS (which already has the Telegram bot wired up) via cron.

Whatever runs the external check must **not** depend on the telemetry stack itself
(don't monitor Uptrace using Uptrace).

### Layer 2 — On-box metrics agent (catches degradation *before* it kills the box)
A small agent/cron on each important VPS that samples local metrics, sends a **regular
digest** (e.g. daily "all green" summary) and **urgent alerts** when a threshold is
crossed. This is where disk/memory/OOM/container-health live.

Cover **both** servers:
- **Telemetry VPS** (`95.163.232.142`) — the box that keeps dying.
- **Game-server VPS** — equally or more important; an outage there is player-facing.
  (It already hosts the feedback Telegram bot, so it's the natural place for the
  external poller too.)

---

## 4. Metrics to monitor (the concrete findings list)

Derived from the incidents plus standard hygiene. Thresholds are starting suggestions;
the producer/impl can tune.

| Metric | Why (from incidents) | Suggested warn / critical |
|---|---|---|
| **Reachability of public URL** | The box froze and we didn't know for weeks | any timeout / non-200 → critical |
| **Heartbeat freshness** | Frozen box can't self-report | missed N intervals → critical |
| **Root disk usage `/`** | Family A: disk filled to 100% | warn 70% / critical 85% |
| **RAM used %** | Family B: OOM | warn 80% / critical 90% |
| **Swap exists & swap used %** | Box had *no swap*; now 4 GB | alert if swap missing; warn if swap >50% used (real pressure) |
| **OOM-kill events** (`journalctl -k`/`dmesg` "Out of memory: Killed") | Family B: 19 OOM-kills preceded the freeze | any new OOM-kill → critical |
| **Docker container health** | Stack can be down while box is up | any expected container not "Up/healthy" → critical |
| **ClickHouse internal table sizes** (`system.*_log`, esp. `metric_log`) | Family A & B: self-inflicted growth | warn if any `system.*_log` > a few hundred MB |
| **ClickHouse `uptrace.*` data size** | Distinguish real data from diagnostics; capacity planning | informational / trend |
| **systemd unit status** (`uptrace.service`, `nginx`, `docker`) | Stack auto-start can fail after reboot | not active → critical |
| **TLS cert expiry** (`telemetry.geoconflict.ru`) | certbot renewal can silently fail | warn < 14 days |
| **CPU load average (sustained)** | Thrashing/merge storms | warn if load >> cores for sustained period |
| **(Game server) process/port up, error-rate spike** | Player-facing availability | tune to game server |

Notes:
- Distinguish **disk-data growth vs container writable-layer vs ClickHouse file logs vs
  `system.*_log` vs real `uptrace.*` data** — past incidents required knowing *which*
  was growing. A useful alert says *where* the growth is, not just "disk high".
- Detecting a **new OOM-kill** is a high-value, cheap signal that would have flagged the
  2026-06 incident days early.

---

## 5. Message types & UX

- **Regular digest (low-key):** scheduled summary (e.g. once/day) — per-host one-liners:
  disk %, RAM %, swap %, containers OK, URL OK. Confirms the monitor itself is alive.
- **Urgent alert:** fired immediately on threshold breach or unreachable. Include host,
  metric, current value, threshold, and a one-line hint (e.g. "ClickHouse metric_log
  478 MB — internal diagnostics").
- **Recovery notice:** when a previously-alerting condition clears ("✅ telemetry URL back
  to 200"). Avoids the "is it still down?" guessing we did manually.
- **Anti-spam:** throttle/deduplicate repeated alerts for the same condition (e.g. alert
  on state change + periodic reminder, not every poll). The 2026-06 box would have
  emitted hundreds of identical alerts otherwise.

Consider a **separate Telegram chat or topic** for ops/monitoring, distinct from the
existing user-feedback chat, so infra noise doesn't bury player feedback.

---

## 6. Telegram integration — reuse what exists (do NOT build a parallel bot)

The project **already sends to Telegram** from the game server. Reuse this pattern.

- Code: `src/server/Master.ts` (`/api/feedback`, `/api/subscribe` handlers).
- Mechanism: `POST https://api.telegram.org/bot<TOKEN>/sendMessage` with
  `{ chat_id, text, parse_mode: "HTML" }`, plus an HTML-escape helper.
- Env vars already defined (`example.env`, threaded through `deploy.sh`):
  `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`.

**Critical caveat — Telegram is blocked from Russian IPs.** The existing code sends
through a proxy (`TELEGRAM_PROXY_URL` → `ProxyAgent` dispatcher). Any monitor that runs
**on the Russian telemetry VPS** will hit the same block and must either:
- send via the same proxy, or
- push its signal to the game server / an external relay that then forwards to Telegram.

This is a real design constraint, not a detail — a naive monitor on the telemetry VPS
that calls `api.telegram.org` directly will silently fail to deliver alerts.

Suggested: factor the existing inline Telegram-send logic into a small reusable helper
(host + message + level) so both feedback and monitoring share one code path and one
proxy configuration, rather than duplicating it.

---

## 7. Implementation constraints & conventions (so the task fits the repo)

- **No parallel scripts.** Telemetry infra is managed by `setup-telemetry.sh` (remote)
  and `build-deploy-telemetry.sh` (local deploy). On-box monitoring for the telemetry
  VPS should be added *through* these (e.g. a cron/agent written by `setup-telemetry.sh`,
  like the existing `/etc/cron.d/uptrace-backups`), not a new ad-hoc script.
- **Cron already in use** on the telemetry VPS (`/etc/cron.d/uptrace-backups`: pg backup,
  disk warning, retention check, certbot renew). The metrics agent can slot in there.
- **Secrets** live in `.env*.secret` files and are threaded via the deploy scripts;
  follow that pattern for any new token/chat-id/proxy values.
- **Don't depend on Uptrace** for alerting about Uptrace. The monitor must be independent
  of the telemetry stack it watches.
- **VPN caveat for operators:** the Russian VPS is unreachable while a full-tunnel VPN is
  on (relevant for humans investigating, not the bot). See repo memory / telemetry docs.

---

## 8. Open questions for the producer

1. **Scope of v1:** telemetry VPS only, or both telemetry + game-server VPS from the start?
   (Recommendation: external heartbeat for both is cheap and highest-value; on-box agent
   can start with the telemetry VPS.)
2. **Heartbeat hosting:** self-hosted dead-man's-switch vs a free external service
   (healthchecks.io / UptimeRobot)? External service is least effort and survives our own
   infra being down.
3. **Telegram routing from Russia:** reuse `TELEGRAM_PROXY_URL`, or relay via the game
   server? Need to confirm whether the telemetry VPS can reach Telegram at all.
4. **Separate alerts chat/topic** vs the existing feedback chat?
5. **Digest cadence** (daily? only-on-change?) and **quiet hours** for non-critical alerts.
6. **Thresholds:** accept the suggested table above as defaults, or tune per host?
7. **Future:** is this a stepping stone toward a managed monitoring stack (e.g.
   Prometheus + Alertmanager / Grafana, or Uptrace's own alerting), or do we intentionally
   keep it as a lightweight bash+cron+Telegram bot? The lightweight path matches the
   current small-VPS, no-extra-moving-parts philosophy.

---

## 9. Related files & references

- Incident root-cause writeup: `ai-agents/knowledge-base/telemetry-server-incident-history-2026-06-03.md`
- Earlier disk hardening: `ai-agents/knowledge-base/telemetry-recovery-hardening-2026-05-07.md`,
  `telemetry-clickhouse-system-log-retention-2026-05-08.md`,
  `telemetry-clickhouse-file-log-hardening-2026-05-10.md`
- Telemetry setup/deploy: `setup-telemetry.sh`, `build-deploy-telemetry.sh`
- Existing Telegram send pattern: `src/server/Master.ts` (`/api/feedback`, `/api/subscribe`)
- Telegram env vars: `example.env`, `deploy.sh`
- Telemetry system page: `karpathy-vault/wiki/systems/telemetry.md`
