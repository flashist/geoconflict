# Task — Monitoring & Alert Bot (Phase 2: Depth & Hygiene)

## Sprint
Backlog — no sprint yet. Schedule **after Phase 1 is deployed and proven**.

Phase 2 of 2. Builds directly on `monitoring-alert-bot-phase1.md` — it reuses the shared
Telegram helper, the on-box agent framework, the reboot-surviving alert state, and the
digest/dedup/recovery UX delivered there. Do not start until Phase 1's machinery exists.

## Priority
Medium — broader hygiene and game-server depth. Lower urgency than Phase 1 (which covers
the two outages we actually hit), but it closes the slow-degradation and player-facing gaps.

---

## Context

Phase 1 delivers the incident-preventing core: external heartbeat (both VPS) and a
telemetry-VPS on-box agent for disk/RAM/swap/OOM/containers, plus the shared Telegram path
and alert UX. Phase 2 extends that same machinery to the game server and adds the
slower-moving hygiene signals.

Source findings: `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md`.
Full background and the two outage families are in `monitoring-alert-bot-phase1.md`.

---

## Dependency
**Phase 1 must be live.** Phase 2 adds metrics to the existing on-box agent and new alert
conditions to the existing dedup/state/digest path — it does not introduce a second monitor.

---

## What to Build (Phase 2)

1. **Extend the on-box agent to the game-server VPS** (player-facing). Same agent shape as
   the telemetry-VPS agent: disk, RAM, swap, OOM, container/systemd health — threaded
   through `deploy.sh`.

2. **ClickHouse growth visibility (telemetry VPS).** Monitor `system.*_log` table sizes
   (esp. `metric_log`) and `/var/log/clickhouse-server` file-log growth. **The alert must say
   *where* the growth is**, not just "disk high" — distinguish `system.*_log` tables vs
   container file logs vs the container writable-layer vs real `uptrace.*` data. Past
   incidents required knowing *which* was growing. Suggested warn: any `system.*_log` beyond
   a few hundred MB.

3. **TLS cert expiry + certbot-success (telemetry VPS).** Warn if
   `telemetry.geoconflict.ru` cert is < 14 days from expiry. **Addition:** also verify the
   existing certbot **renewal cron actually succeeded** recently — a silent renewal failure
   is the real risk, and days-to-expiry alone won't reveal a renewal that stopped running.

4. **Sustained CPU load average.** Warn if load >> cores for a sustained period
   (thrashing / ClickHouse merge storms). Use a sustained window, not an instantaneous spike.

5. **Addition — backup-job health.** Alert if the weekly PostgreSQL backup cron didn't run,
   failed, or the newest backup file is stale. A silently-stopped backup is invisible to
   size-based disk checks and is a latent data-loss risk.

6. **Addition — predictive disk trend.** Alert on disk growth *rate* ("`/` fills in ~N days
   at current rate"), which catches slow Family-A growth earlier than a static % threshold.

7. **Addition — game-server availability signal.** External HTTP/port check plus an "active
   games / connected clients dropped to ~0 unexpectedly" heuristic. The server emits
   `geoconflict.server.games.total` / `clients.connected` to Uptrace, but if telemetry is
   down those are blind — so the **external** check is the real availability signal.

---

## Implementation constraints
Same conventions as Phase 1: no parallel scripts (extend `setup-telemetry.sh` /
`build-deploy-telemetry.sh` for the telemetry box, `deploy.sh` for the game server);
secrets in `.env*.secret`; don't monitor Uptrace using Uptrace; no secrets in alert text
(see [[decisions/vps-credential-leak-response]]).

---

## Verification (controlled tests, same gate as Phase 1)
1. **Game-server alert delivered:** trip a threshold on the game-server agent → urgent alert
   in the ops chat with the game-server host.
2. **ClickHouse growth alert names the source:** simulate/observe `system.*_log` growth →
   alert specifies *which* store grew, not just "disk high".
3. **TLS/certbot:** alert fires for a near-expiry cert; a deliberately failed/missed certbot
   renewal is detected (not just expiry days).
4. **Backup-job health:** skipping/failing the weekly PG backup produces an alert; a fresh
   successful backup clears it.
5. **Predictive trend:** a sustained artificial disk-growth rate produces a "fills in ~N
   days" warning before the static threshold trips.
6. **Game-server availability:** an external port/HTTP failure (or games/clients → 0)
   produces an availability alert independent of Uptrace.

---

## References
- Phase 1: `monitoring-alert-bot-phase1.md`
- Findings: `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md`
- Hardening: `telemetry-clickhouse-system-log-retention-2026-05-08.md`,
  `telemetry-clickhouse-file-log-hardening-2026-05-10.md`
- Telemetry setup/deploy: `setup-telemetry.sh`, `build-deploy-telemetry.sh`; game server: `deploy.sh`
- Wiki: `karpathy-vault/wiki/systems/telemetry.md`
