# Task — Monitoring & Alert Bot (Phase 1: Incident-Preventing Core)

## Sprint
Backlog — no sprint yet. **Recommend near-term scheduling (next weekend deploy window).**
Does **not** fit Sprint 4c ("no new backend infrastructure"). This is its own
operational/reliability task.

Phase 1 of 2. Phase 2 (depth & hygiene) is `monitoring-alert-bot-phase2.md` and builds on
the shared helper, on-box agent framework, and alert-state machinery delivered here.

## Priority
High for an ops/reliability item. The telemetry VPS has gone fully down **twice**, and the
June 2026 outage went unnoticed for **2–3 weeks**. There is currently **no proactive
alerting** — the only "monitor" is an on-box disk-warning cron writing to a local log file,
useless exactly when the box is down. Phase 1 delivers precisely the signals that would
have caught both outages we actually hit.

---

## Context

Source findings: `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md`
(findings doc, not a spec). Incident history:
`ai-agents/knowledge-base/telemetry-server-incident-history-2026-06-03.md`. Wiki:
`karpathy-vault/wiki/systems/telemetry.md` ("Monitoring and Alerting Gap").

Two distinct outage families have hit the telemetry VPS; the monitor must cover both,
because fixing one did not prevent the other:
- **Family A — disk exhaustion (2026-05):** ClickHouse backups → `system.*_log` tables →
  filesystem logs filled the 59 GB root disk → external `502 Bad Gateway`.
- **Family B — memory/OOM (2026-06):** ~3.8 GB RAM, **zero swap** at the time;
  `system.metric_log` + background merges spiked memory; the kernel OOM-killer fired **19×**
  killing ClickHouse; the host then **froze entirely** — unreachable over SSH, HTTPS, ping,
  *and* the provider console. Only a hard reboot recovered it. **Disk was fine (18%)** that
  time — which is exactly why a disk-only monitor stayed silent.

**Core lesson:** a monitor that runs *only on the monitored machine* cannot detect that
machine being dead. We need an **external heartbeat** in addition to on-box checks.

---

## Locked Decisions (with Mark, 2026-06-04)

| Decision | Choice |
|---|---|
| **v1 scope** | External heartbeat covers **both** the telemetry VPS and the game-server VPS from day one. The on-box metrics agent starts on the **telemetry VPS** (extends to the game server in Phase 2). |
| **Heartbeat hosting** | **Free external dead-man's-switch service** (healthchecks.io / UptimeRobot free tier). Each box pushes a periodic "alive" ping; if pings stop, the *external* service alerts. Survives our own infra being fully down. |
| **Ceiling / philosophy** | **Lightweight bash + cron + Telegram**, wired through the existing deploy scripts. Not a stepping stone to Prometheus/Grafana. Build it as the long-term shape. |

---

## Architecture — two independent layers
**Layer 1 — External heartbeat (catches "box is dead/frozen").** Each box pushes an
alive-ping to the external dead-man's-switch; if pings stop, the external service alerts.
Must **not** depend on our telemetry stack or our Telegram proxy path — it is the
independent backstop that would have caught the June freeze.

**Layer 2 — On-box metrics agent (catches degradation *before* it kills the box).** A small
cron/agent that samples local metrics, sends a low-noise daily digest and immediate urgent
alerts on threshold breach, delivered via the shared Telegram helper.

---

## What to Build (Phase 1)

1. **External dead-man's-switch heartbeat — both VPS.** Register two checks on the chosen
   free service. Add a cron on each box that pushes its alive-ping. Configure the service to
   alert when a ping is missed. **Addition:** require **N consecutive missed intervals**
   before "critical" so a single transient network blip (the Russia/proxy path is lossy)
   does not false-alarm.

2. **Shared Telegram send helper.** Factor the existing inline Telegram-send logic out of
   `src/server/Master.ts` (`/api/feedback`, `/api/subscribe`) into one reusable helper
   taking `(host, message, level)`. Feedback and monitoring share this single code path and
   the single `TELEGRAM_PROXY_URL` proxy config — do **not** build a parallel bot.

3. **Telegram routing from Russia (constraint, not a detail).** `api.telegram.org` is
   blocked from Russian IPs; existing code sends through `TELEGRAM_PROXY_URL` → `ProxyAgent`.
   The telemetry-VPS monitor must **either** send via that same proxy **or** relay its signal
   to the game server, which forwards. **Confirm first** whether the telemetry VPS can reach
   Telegram via the proxy at all; if not, use the relay path. A monitor that calls
   `api.telegram.org` directly will silently fail to deliver.

4. **On-box agent on the telemetry VPS — Phase 1 metrics:**

   | Metric | Why | Warn / Critical |
   |---|---|---|
   | Root disk `/` usage | Family A | warn 70% / crit 85% |
   | RAM used % | Family B | warn 80% / crit 90% |
   | Swap present + used % | Box had no swap; now 4 GB | crit if swap **missing**; warn if used >50% |
   | **New OOM-kill events** | 19 OOM-kills preceded the freeze | any new OOM-kill → critical |
   | Docker container health | Stack can be down while box is up | any expected container not Up/healthy → crit |
   | systemd unit status (`uptrace`/`nginx`/`docker`) | Auto-start can fail after reboot | not active → critical |
   | Public URL reachability (self-check) | Backstop to the external check | non-200/timeout after N tries → crit |

   **Addition — OOM detection must read the *previous* boot's kernel log**
   (`journalctl -k -b -1` for "Out of memory: Killed"). After a hard reboot the smoking gun
   is in the prior boot; a current-boot-only check misses it.

5. **Message UX + anti-spam (Layer 2).**
   - **Daily digest (low-key):** per-host one-liners — disk %, RAM %, swap %, containers OK,
     URL OK. Doubles as proof the monitor *and* the delivery path are alive.
   - **Urgent alert:** host, metric, current value, threshold, one-line hint.
   - **Recovery notice:** when a condition clears ("✅ telemetry URL back to 200").
   - **Dedup:** alert on **state change** + periodic reminder, not every poll. **Addition:**
     persist last-known-state-per-condition in a small state file that **survives reboot**
     (the box hard-reboots) so dedup and recovery notices work across restarts.
   - **Separate ops Telegram chat/topic**, distinct from the user-feedback chat.

---

## Foundational additions (Phase 1 owns these)
- **Consecutive-failure debounce** on reachability/heartbeat (Russia/proxy path is lossy).
- **Previous-boot OOM-log reading** (`journalctl -k -b -1`).
- **Reboot-surviving alert state** for dedup + recovery notices.
- **Alert-path independence:** the external dead-man's-switch must not depend on our
  Telegram-via-proxy path, so a proxy/Telegram outage cannot blind us. The "all green"
  digest is in-band liveness proof; its *absence* is itself a signal.
- **Security:** alert/digest messages must **never** include tokens, secrets, env contents,
  or raw log/credential dumps — bound content to metric names + values + short hints. See
  [[decisions/vps-credential-leak-response]].

---

## Implementation constraints & conventions
- **No parallel scripts.** Telemetry-box monitoring is added *through* `setup-telemetry.sh`
  (remote) and `build-deploy-telemetry.sh` (local) — e.g. a cron written by
  `setup-telemetry.sh`, like the existing `/etc/cron.d/uptrace-backups`. Game-server-side
  pieces (the heartbeat cron, relay endpoint if used) thread through `deploy.sh`.
- **Secrets** (token/chat-id/proxy/heartbeat-URL) live in `.env*.secret`, threaded via the
  deploy scripts. Nothing secret in git.
- **Don't monitor Uptrace using Uptrace** — the monitor must be independent of the telemetry
  stack it watches.
- **Operator VPN caveat:** the Russian VPS is unreachable while a full-tunnel VPN is on
  (relevant for humans investigating, not the bot).

---

## Verification (shipping gate — infra equivalent of "analytics confirm in prod")
Not "done" because it deployed — done when a **controlled failure test** proves delivery:

1. **Digest arrives** in the ops Telegram chat with correct per-host lines.
2. **Urgent alert fires:** trip a threshold deliberately (temp large file for a disk warn, or
   a forced container stop) → urgent alert delivered with host/metric/value.
3. **Recovery notice clears:** undo the condition → recovery delivered.
4. **Dead-man's-switch works:** stop a box's heartbeat ping → external service alerts (the
   frozen-box case). Restore → clears.
5. **Dedup holds:** a sustained condition produces a state-change alert + periodic reminders,
   **not** an alert every poll.
6. **Russia routing confirmed:** an alert *originating from the telemetry VPS* is delivered
   (proves the proxy/relay path, not just game-server-originated alerts).
7. **Reboot survival:** alert state persists across a box reboot (no duplicate "still down"
   storm; recovery still fires correctly).

---

## References
- Findings: `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md`
- Incident history: `ai-agents/knowledge-base/telemetry-server-incident-history-2026-06-03.md`
- Telegram send pattern: `src/server/Master.ts`; env vars: `example.env`, `deploy.sh`
- Telemetry setup/deploy: `setup-telemetry.sh`, `build-deploy-telemetry.sh`
- Wiki: `karpathy-vault/wiki/systems/telemetry.md`, [[decisions/vps-credential-leak-response]]
- Phase 2: `monitoring-alert-bot-phase2.md`
