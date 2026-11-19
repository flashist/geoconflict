# Profile daily-checks incident — 2026-11-09

Read-only investigation requested by the owner after a Better Stack weekly email showed
`profile-daily-checks` at 20.833% availability while both profile API monitors were green.
Live observations: approximately 07:58–08:02 UTC (10:58–11:02 Moscow), 2026-11-09.
No server configuration changes, restarts, reboots, deploys, or Telegram messages were made.

## Finding

The profile service is healthy at the time checked. The daily maintenance heartbeat has
two independent failures: an OS update awaiting a reboot, and an unreachable Telegram
egress proxy. The weekly heartbeat percentage is not the profile API's uptime percentage.

## Evidence

- Public `/health` and `/ready`: HTTP 200. Health reports `0.0.165-profile.1`, commit
  `3e3a7c2015004066f334f4058e8ff95b441661d5`.
- Both profile API and Postgres containers: up 12 days, healthy. Host uptime: 24 days.
- `/var/log/profile-checks.log`: November 2 passed all 13 checks. November 3 first failed
  `reboot-required`; November 5 added `name-change-digest`.
- The November 9 08:00 UTC scheduled check completed with **11 OK, 2 failed** and
  successfully delivered its `/fail` heartbeat to Better Stack.
- Other November 9 checks passed: daily backup marker and matching off-box object,
  weekly off-box backup, renewal attempt/error checks, certificate validity, off-box
  configuration, disk use (22%), player growth, alert-path reachability, and the monitoring
  stack's own `delivering` channel-state record. The latter two do not prove Telegram delivery.

## Pending reboot

- `/var/run/reboot-required` modification time: **2026-11-03 06:38:58 UTC**.
- Its package list names `linux-image-7.0.0-42-generic` and `linux-base`.
- Running kernel: `7.0.0-38-generic`; installed newer kernel: `7.0.0-42-generic`.
- Automatic reboot is deliberately disabled on this single-server deployment. The daily
  checker correctly keeps reporting this until a maintenance reboot clears it.

## Telegram proxy failure

- `/var/log/profile-name-change-digest.log`: last successful digest **November 4, 04:00 UTC**.
  November 5–7 and 9 runs fail with `network_error code=unknown`; November 8 fails with
  `network_error code=ECONNREFUSED`. Cron runs; these are delivery failures rather than an
  absent cron job or a marker-write failure after successful delivery.
- `/opt/profile/digest/last-name-change-digest.json` still records November 4 04:00:07 UTC.
  Today's daily checker reports it 123 hours old, exceeding the 26-hour limit.
- Fresh probes inside the running profile container: direct HTTPS to an unrelated public
  site returns HTTP 200 in 123 ms; the same destination through the configured proxy times
  out at 8 seconds. Proxied Telegram root and read-only bot `getMe` calls also time out.
  A separate TCP connection to the configured proxy times out at 6 seconds.
- This computer's TCP probe to the same proxy was refused in 0.19 seconds. Hash comparison
  confirmed the local and live proxy settings match, without displaying their values.
- Profile API logs since November 5 contain 28 name-change notification network failures
  and 3 SSH-alert delivery network failures through the last read at 08:00 UTC. The SSH
  count includes investigation logins. These counts exclude the digest's separate CLI log
  and do not measure game-server feedback delivery.

The evidence supports the owner's suspicion of a broken notification egress path.
It does **not** establish whether the proxy host is down, its proxy process stopped, a
firewall changed, or an underlying VPN/tunnel failed. No proxy-host service inspection was
performed; project-local configuration examined provides profile/telemetry SSH access,
not dedicated proxy-host access. The profile host listed no running VPN/tunnel service
matching the common service names checked.

## Next actions and verification

1. Inspect the egress proxy host's reachability, proxy listener/service and source-IP allowlist;
   inspect its VPN/tunnel if it uses one. Restore reachability from the profile container.
2. Schedule a short profile-server maintenance reboot to activate the installed kernel.
3. After repair, verify Telegram delivery and a fresh digest marker, then run the maintenance
   checker to deliver a success heartbeat. Confirm incident closure in Better Stack.

Better Stack's live UI and incident record were not opened in this investigation; exact
incident state and closure remain unverified. The screenshot and delivered heartbeat log
support the diagnosis. Existing wiki history records that an already-open heartbeat incident
can collect later failure reasons without generating a new alert for each one.

## References

- `profile-checks.sh`: `check_reboot_required`, `check_name_change_digest`, `report`.
- `src/profile-server/sendNameChangeDigest.ts`: cron entry point and existing proxy config.
- `src/core/notifications/TelegramNotifier.ts`: proxy dispatcher, bounded errors and retry.
- `ai-agents/wiki-vault/wiki/systems/player-profile-store.md`: prior heartbeat incident history.
- `ai-agents/wiki-vault/wiki/systems/alert-delivery.md`: proxy routing and email-only Better Stack path.
- `ai-agents/wiki-vault/wiki/tasks/profile-p4-operability.md`: monitor and daily-check coverage.
