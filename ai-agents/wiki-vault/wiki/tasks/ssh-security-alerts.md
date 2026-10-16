# SSH Security Alerts to Telegram — Logins, fail2ban Down, Daily Counts (task 0443)

**Source**: `ai-agents/tasks/done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 40 (ADR-035 append rank; real place right after `0441`/`0442` by owner ruling) / task `0443`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-12 by a spawned `fkit-producer` on the owner ruling
> *"Close; verify task in Sprint 8 (Recommended)"* (relayed by `fkit-lead`; ⛔ not producer precedent).
>
> ⚠️ **REPO WORK ONLY. NOTHING RUN ON ANY BOX, NO DEPLOY, NO MESSAGE EVER SENT.** The token, the allow-list step, the
> deploys and the two-day watch moved to the verify task **`0449`** (Sprint 8, Backlog). Committed in `779ddc2`;
> `git tag --contains` → none at this sync ⇒ **not deployed**. No SSH alert has reached Telegram yet.
>
> 🚨 **Shipping it changes every game deploy:** from `779ddc2` on, `deploy.sh` ends with a root step that, until
> `0445` installs the root key, **is SKIPPED and makes the deploy exit 3** — the game IS live, but the run reports
> failure. See *Gotchas* below.

> 📌 *2026-10-14 sync:* `779ddc2` is in game `0.0.164` (prod, 2026-10-13) and telemetry `0.0.163-telemetry.1`, so the
> "not deployed" line above is history. `0445` installed the root key, so the game root step now logs in by key —
> and **every game deploy ended exit 3 with `GAME HOST SETUP SKIPPED: PROFILE_SSH_ALERT_TOKEN is empty`**, as
> expected until `0449` sets the token ([[tasks/ssh-key-login-live]]). Since `0442` (committed `daa1bcc`) the root
> step runs on every key deploy and also applies the sshd hardening; only its alerts part is skipped while the token
> is blank ([[tasks/ssh-password-login-off]]). Whether any SSH alert has reached Telegram is not recorded — `0449`.

> 📌 *2026-10-15 sync:* two more deploys for `0452` ran with the alerts part still skipped — telemetry
> `0.0.164-telemetry.1` warned `PROFILE_SSH_ALERT_TOKEN` is empty; game dev ended `SKIPPED ssh-alerts` (the expected
> exit-3 case). ⚠️ On game dev the final banner said the sshd hardening *"may be missing"* although that section passed
> — the banner follows the skipped alerts part, wording only. Still no SSH alert recorded as reaching Telegram — `0449`,
> whose deploys `0452`'s pre-checks have now unblocked ([[tasks/ssh-password-login-off]]).

> 📌 *2026-10-15 sync, second run (`aa0973b`):* **SSH alerts are live on three boxes** (`0449`'s worklog; `0449` still `🔲 Backlog`): `PROFILE_SSH_ALERT_TOKEN` set (names checked only); profile `0.0.164-profile.1`, telemetry `0.0.164-telemetry.2`, game dev redeploy (exit 0, `GAME HOST SETUP OK` — no more exit 3 there). Per box: test event delivered, service active, no overlapping ticks; a `🔑 SSH login` alert within a minute with the source **masked**; on game dev, "Telegram unreachable" held 2 alerts and delivered them ~5 min after restore, and fail2ban `DOWN` / `back` arrived inside their limits. A `logrotate -d` on the single file reports insecure-parent-dir — **not a defect** (the real run via `/etc/logrotate.conf` accepts it). **Still open:** game prod (weekend slot), two consecutive daily digests (from 2026-10-16), a 24 h window with no per-guess messages. Step 10 found box addresses in 12 older tracked files — handed to `0464`. ⚠️ The fail2ban down/back test reset game dev's counters, which voided `0462`'s literal comparison ([[tasks/fail2ban-recheck-after-password-off]]). Game dev env-file side: [[tasks/game-deploy-env-file-cleanup-verified]].

> 📌 *2026-10-15 sync (`930048b`), from `0449`'s worklog (relayed by `fkit-lead`):* a **second game dev redeploy** (same
> image) found the agent already installed (`agent v1 unchanged and running — not restarted`) and ended `GAME HOST SETUP:
> OK`; ⚠️ its exit code was **not printed** — "exit 0" is inferred from the banner. `0.0.164-telemetry.1` does not count
> for `0449` (token empty then). **Game prod: no deploy tag today** — not confirmable from git, treated as not deployed,
> stays in the weekend slot. `0449` still `🔲 Backlog`; the two-day watch remains.

> 📌 *2026-10-16 sync, second run (`5a12b73`), from `0449`'s brief + worklog (owner's Telegram screenshot and inbox,
> relayed by `fkit-lead`; **not re-verified by me**):* **`0449` is now `🔄 In progress`** (owner *"Mark it In progress
> (Recommended)"*). **Daily digest 1 of 2 arrived** 2026-10-16 08:10 UTC — one line per box: game dev, profile and
> telemetry with real counts and *fail2ban up*; game prod `NO REPORT` — **expected**, it is not deployed yet. No
> "could not be sent" line, no "OLD numbers" flag. 🔑 login alerts arrived for each of the owner's profile-box logins
> that morning (owner-confirmed). ⚠️ **Not shown by the message:** whether each box's window is the 24 h before
> **08:00 UTC** rather than 08:00 local (three boxes on Moscow time) — still owed. The 24 h no-per-guess window is
> **not yet recorded complete**. **Left:** game prod deploy (weekend slot, with `0452`), digest 2 of 2 (2026-10-17
> 08:10 UTC), the window checks. See [[decisions/sprint-8]].

## Goal

Owner ruling 2026-10-12, verbatim selection *"All three (Recommended)"* — *"Login alert + fail2ban-down alert + daily
counts, on game, profile and telemetry. One task in Sprint 8, right after 0441/0442."* "One task" is the owner's call,
overriding the usual split. Bots try thousands of guesses a day; `0441`/`0442` stop them working, and this task makes
sure **we hear** when (a) someone actually logs in, (b) fail2ban stops, (c) once a day, how many guesses and bans each
box saw. **Never one message per failed guess.** **A login alert must never block, slow or break a login.**

Background: `fkit-lead` reviewed past successful logins on all three boxes (read-only, 2026-10-12); 7 sources were on
hosting/VPN or mobile networks. Owner ruling, verbatim: *"I think we should ignore the 2025 logins, it could be me but
from different countries/VPNs. The one from the Apr.2026 also probably me, while travelling or something."* ⇒ no
password rotation; **this task's login alert is how a future unknown login gets caught.**

## Key Changes

**Route — the profile-box relay, not a new Telegram sender** (owner Q4 *"Approve with R2 (Recommended)"*; ADR-114's
admin-box home for alert logic, [[decisions/adr-114-admin-server-alert-relay]]):

```
box agent (ssh-alerts.sh) → POST /internal/v1/ssh-alerts/events (own token) → profile server → Telegram, Alerts topic
```

| Part | Files |
|---|---|
| Agent + installer | `ssh-alerts.sh` (new): `install` (token on stdin, 0600 config, unit, cron, logrotate), `uninstall`, `watch`, `tick`, `f2b-check`, `daily`, `retry`, `test`. Watches the journal; spools events and retries; a 5-minute `tick` |
| Relay route | `src/profile-server/SshAlerts.ts` — search `SSH_ALERTS_PATH`; mounted in `Routes.ts`; token `PROFILE_SSH_ALERT_TOKEN` read in `Server.ts` (a **new, narrow token** — owner Q5) |
| Daily digest | `src/profile-server/SshSecurityDigest.ts`, `sendSshSecurityDigest.ts`, npm script `digest:ssh-security`; profile-box cron `10 8 * * *` (UTC box) |
| Profile / telemetry | `setup-profile.sh` (persist-or-reuse token, never generated; non-fatal *SSH SECURITY ALERTS (0443)* section), `build-deploy-profile.sh`; `setup-telemetry.sh`, `build-deploy-telemetry.sh` |
| Game boxes — "Way A" | `setup-game-host.sh` (new): a light, repeatable **root step run by every game deploy**; `deploy.sh` gains one `deploy_cleanup()` EXIT trap and `run_game_host_setup()` — ONE root login, **by key only** (`BatchMode=yes`), files sent as a tar stream on stdin (the token never in argv) |
| Tests | `tests/ssh-alerts.sh` (new, 102 checks, **registered** in `tests/scripts/ShellHarnesses.test.ts`); `tests/profile-server/SshAlerts.test.ts`, `SshSecurityDigest.test.ts`; hardening harness T67–T71 |
| Runbook | `docs/vps-deployment-guide.md` **§8 *SSH Security Alerts*** (what each message means, how to test, how to switch off); pointer at the top of `ai-agents/knowledge-base/alert-delivery-runbook.md` |

**Owner rulings (2026-10-12):** Q1 source shown as *"Masked address + provider (Recommended)"* — the relay returns 400
to a full address · Q2 *"Own message in Alerts (Recommended)"* for the daily counts · Q3 *"First now + one follow-up
(Recommended)"* — the first login is sent at once, logins from the same source to the same box within the window are
bundled into one follow-up · Q7 game dev included · Q8 *"Marker now, check later"* — `profile-checks.sh` not edited
(`0219`'s drills were in progress) · Q6 free-text worry that a manual install would be forgotten on a rebuild ⇒
*"Way A: every deploy, root step (Recommended)"* · Q-A2 *"No switch"* — no skip flag · **Q-A1 *"Always fail the
deploy"*, clarified *"After swap; skip also fails (Recommended)"*** — overriding the plan's "warn, never fail".

**Build choices worth knowing:**
- **Daily counts are a 24 h window, not fail2ban's totals** — the inventory found totals reset on restart. Failed /
  unknown-user from journal lines; bans from `[sshd] Ban` lines in `fail2ban.log`, read in the box's **local** time.
- **Schedule decided in UTC inside the agent** (first tick ≥ 08:00 UTC, once per UTC day) — Vixie cron ignores
  `CRON_TZ`, and three of four boxes run Moscow time.
- **The digest always lists all four boxes** (`game-prod`, `game-dev`, `profile`, `telemetry`); a box with no report
  reads `NO REPORT`, and a report older than 12 h is marked `⚠️ OLD numbers` — a missing box must never look like 0.
- **A send that still fails after TelegramNotifier's one retry is counted** and shown in the next digest (owner *"Fix
  it (Recommended)"* on review R1 — ADR-114 Decision 6: failures must be visible, not only logged).
- Two real agent bugs caught by the new harness before shipping: a `{16,512}` regex over macOS's `RE_DUP_MAX` (255),
  and a trailing `=` stripped from a base64 token.

## Outcome

- Full `npm test` green (225/225 suites, 4611 tests); lint, `tsc`, config-parity clean; `tests/ssh-alerts.sh` 102/102;
  hardening harness ALL PASS. Review round 1 closed out.
- **Accepted residual** "ssh-alerts journal filter trusts `SYSLOG_IDENTIFIER`" (R6, owner *"Accept as known limit
  (Recommended)"*): a local account can fake a login alert, cannot hide one.

### Read-only box inventory (2026-10-12, four boxes, names and counts only)

| | Game prod | Game dev | Profile | Telemetry |
|---|---|---|---|---|
| OS / OpenSSH | 24.04 / 9.6 | 24.04 / 9.6 | **26.04 / 10.2** | 24.04 / 9.6 |
| Password login | yes | yes | **no** (`prohibit-password`) | yes |
| Failed + invalid user, 24 h | 1992 + 597 | 1559 + 506 | 0 + 396 | 1350 + 358 |
| fail2ban | 1.0.2, `sshd` jail | 1.0.2 | 1.1.0 | 1.0.2 |
| Timezone | Moscow | Moscow | **UTC** | Moscow |
| Telegram via proxy | ✓ | ✓ | ✓ | **✗ — not on the proxy allow list** |
| Profile `/internal/` reach | ✓ | **✗ 403 — not on the allow list** | (is the relay) | ✓ |
| ufw | inactive | inactive | active | inactive |

- ⚠️ **The login line's journal identifier differs by OpenSSH version:** `sshd` on 9.6, **`sshd-session`** on the
  profile box's 10.2. The detector matches both.
- **Game dev must be added to the profile box's `/internal/` allow list** before its alerts can arrive — an owner
  step, carried by `0449`. ⛔ That list is written by profile deploys: **append, never replace** (see
  [[systems/alert-delivery]]).
- **Surprises, each since filed:** 🚨 **21 leftover deploy env files on game dev**, 12 holding feedback-Telegram setting
  names → `0447` ([[tasks/game-deploy-env-file-cleanup]]); the profile **Postgres container holds the whole
  `profile.env`** (app tokens included — both compose services share one `env_file`) → `0448`; fail2ban on the game
  box was installed by hand and `setup.sh` has none → `0446`. ufw inactive on game and telemetry: flagged, **not
  filed** (the owner did not tick it).

## Gotchas / open

- 🚨 **Exit 3 on every game deploy until `0445`.** `run_game_host_setup()` never uses a password. Before the root key
  is installed (or with a blank token or blank `PROFILE_API_URL`), the step is SKIPPED, `deploy.sh` prints *"GAME IS
  DEPLOYED — HOST SETUP NOT DONE"* and exits **3**. `build-deploy.sh` (the only caller) has already bumped, committed,
  tagged and pushed by then; under `set -e` it stops with status 3 and does not print its own success line. Exit 3
  means "game live, host setup not done", distinct from 1 ("stopped before the game went live"). If game dev's
  `PROFILE_API_URL` is blank, every dev deploy exits 3 until it is set — unknown from the repo.
- **Not verified anywhere real:** GNU tar `--no-same-owner`, `journalctl -f` resume, the systemd unit and cron, the
  `fail2ban.log` format beyond the inventory's, real Telegram delivery, the route behind nginx's allow list, and
  whether `logrotate` is installed (R8 assumes it). All for `0449`.

## Related

- [[tasks/deploy-ssh-key-login]] — task `0441`, the key-login half of the same session; `0445` installs the root key this step needs
- [[tasks/game-deploy-env-file-cleanup]] — task `0447`, filed from this task's inventory; it left `deploy.sh` alone, and `0444` must fold into this task's `deploy_cleanup()`
- [[systems/alert-delivery]] — the relay and Alerts topic this reuses; the allow-list append rule
- [[decisions/adr-114-admin-server-alert-relay]] — the admin-box relay decision and its send-failure rule (Decision 6)
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the bot and the Alerts topic
- [[tasks/alert-path-liveness-probe]] — task `0284`, the telemetry box's existing hourly post to the relay
- [[tasks/profile-os-baseline-hardening]] — task `0221`, the profile box's fail2ban and sshd baseline
- [[systems/weekend-deploy-window]] — the deploy slot these box changes ride
- [[decisions/sprint-8]] — the board (rank 40)
- [[decisions/sprint-backlog]] — where `0446` and `0448` sit
- [[tasks/vps-access-hardening]] — task `0132`, the April 2026 host-hardening target the game and telemetry boxes had not reached
- [[tasks/ssh-key-login-live]] — task `0445`: root key installed; deploys over the key end exit 3 until the token is set
- [[tasks/ssh-password-login-off]] — task `0442`: adds sshd hardening to `setup-game-host.sh`; root step runs on every key deploy
- [[tasks/fail2ban-recheck-after-password-off]] — task `0462`; `0449`'s fail2ban test reset game dev's counters
- [[tasks/game-deploy-env-file-cleanup-verified]] — task `0450`; one of `0449`'s dev deploys carried `0447` uncounted
