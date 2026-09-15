# Telemetry box: LE certificate EXPIRED 2026-09-04 — renew now, fix the renewal cron that can never succeed, prove ingest resumes

## ID
0257

> ℹ️ **ID allocation, checked 2026-09-14 before filing. `0257` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0257-*/` — no matches (highest ID on disk across all three boards was
> `0256`). **2.** `grep -rn "^0257$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.**
> `grep -rn "0257" .claude/` — zero hits. **4.** Duplicate-ID check (`sort | uniq -d` over folder
> prefixes) — empty. `0258`–`0260` were allocated in the same run, sequentially, after this one.

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares it
against the `➡️ Moved` row's target on the Backlog board; any decoration breaks the match.

🔴 **PULLED INTO SPRINT 4 on 2026-09-14, on an OWNER RULING given live in the lead session and relayed
by `fkit-lead`.** Filed on the Backlog board earlier the same day by a spawned producer; the owner ruled
the board **and** the rank. ⚠️ **The owner ruled RANK/BOARD, NOT schedule** — the `## Status` field
below is unchanged, no mover skill was invoked, and this brief stays under `ai-agents/tasks/backlog/` until
someone builds it. SCHEDULED IS NOT STARTED.

## Priority
**High — RANK OWNER-RULED 2026-09-14**, given live in the lead session and relayed by `fkit-lead`.
Unlike most rows on the Sprint 4 board, the rank here is **the owner's, not the producer's**. The
producer had recommended High as time-sensitive and the owner **took that recommendation as a ruling**:
**monitoring is blind today.** Every client error since 2026-09-04 06:03 UTC has been dropped; the
current prod build (`0.0.151`) has **never been observed** in telemetry; and
[`0032`](../../backlog/0032-investigate-null-id-errors/brief.md)'s owner-side verification (its Step 5) **cannot
run** until this lands. Each day it stays open is a day of unrecoverable data (the exporters do not
queue durably) and a day nothing shipped to prod can be checked. It is the cheapest High on the
board: the fix is a few lines and one renewal.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

(Owner-ruled 2026-09-14: **step 1 of *What to build* — the renewal on the box — is executed by the
owner**, not the coder. The coder owns everything else: the command prep, the script fix, the harness,
the deploy request, and the read-only verification.)

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on the ship-loop driver's instruction**, from the
finding `0032`'s build surfaced (`0032/worklog.md`, "Follow-up brief text", item 1). **Not an owner
ruling — the producer had no owner channel.** Filed before `0032` closes because it is time-sensitive.

### What was observed (by `0032`, 2026-09-14, in Uptrace)

- The Let's Encrypt certificate for the telemetry host (CN `telemetry.geoconflict.ru`) **expired
  2026-09-04 06:03:43 UTC.**
- Client error-log groups: **226** in the 78 h before expiry → **19** in the 7 d after → **2** in the
  last 24 h. Browsers refuse to export to an expired certificate, so **client telemetry has been dark
  for ten days.**
- Prod today reports build `0.0.151`; **nothing from it has ever appeared in telemetry.** The last
  build with real data is `362a2f9` (`0.0.140`).

### Root cause, visible in the repo (verified 2026-09-14 in the working tree)

`setup-telemetry.sh` issues the certificate with `certbot certonly --standalone` after stopping nginx
(`:792-800`), then writes an nginx server on `:80` that **`return 301`s everything to https**
(`:803-807`), and installs a twice-daily cron (`:929-930`):

`0 0,12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx" >> /var/log/certbot-renew.log 2>&1`

certbot persists `authenticator = standalone` for the certificate, so every `renew` tries to bind
port 80 for the HTTP-01 challenge — **which nginx permanently owns**. The renewal has therefore
**failed every run since the first attempt window (~30 days before expiry) and will fail forever**;
the `--post-hook` reloads nginx after a failure, changing nothing. Nothing reads
`/var/log/certbot-renew.log` (see [`0258`](../../backlog/0258-telemetry-cert-renewal-failure-signal/brief.md)).

⚠️ **A likely second broken renewer, not yet checked on the box:** the Debian/Ubuntu `certbot` package
installs a `certbot.timer` (hookless `certbot renew`). The profile box **disables it on purpose**
(`setup-profile.sh` — the hardening harness asserts `systemctl disable --now certbot.timer … || true`
at `tests/scripts/profile-deploy-hardening.test.sh:428-439`). `setup-telemetry.sh` does not. Check it;
if present it fails the same way and should be handled the same way.

### The precedent to mirror, not reinvent

The **profile box already solved exactly this** and the fix is **proven live**: its cron is
`certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"`
(`setup-profile.sh:1514`, contract documented at `:1113-1120`), and
[`0216`](../../done/0216-profile-p1-spike-ru-network-reachability/brief.md) ran
`certbot renew --dry-run` with those hooks **while nginx was up**, completing a full HTTP-01 challenge
against LE **staging** (zero production rate-limit spend). Same distro, same nginx-owns-:80 shape.

🔴 **FIX SHAPE OWNER-RULED 2026-09-14** (given live in the lead session, relayed by `fkit-lead`):
**mirror the profile box's nginx pre/post hooks — NOT `--webroot`. The boxes converge.** The trade-off
the owner accepted: a few seconds of ingest gap **only when a renewal actually runs** (every ~60 days),
in exchange for one proven pattern on both boxes and a reader (`0258`) that can mirror `0219`'s. The
plan does not re-open this choice.

ℹ️ With hooks, the persisted `authenticator = standalone` in `/etc/letsencrypt/renewal/<domain>.conf`
stays and is correct — no renewal-conf edit is needed. (The `--webroot` variant would have needed one;
recorded only so nobody re-derives it.)

### What is NOT yet known — measure, do not assume

`0032` measured **client** error logs only. Three more lanes point at the same endpoint and were **not
measured**:

| Lane | Where | Why it may also be dark |
|---|---|---|
| Game-server traces + logs | `src/server/OtelTracing.ts:18`, `src/server/Logger.ts:26` (Node OTLP/HTTP exporters) | Node verifies certificates by default |
| Game-box host metrics | `setup.sh:100-105` — otel-collector `otlphttp` exporter | `tls.insecure: true` is **not** `insecure_skip_verify`; Go verifies by default |
| Profile box | none — no OTEL by design (`0219` G3) | n/a |

Whether the server lanes are dark since 09-04 is **reasoned, not observed**. Verification must show
each lane resuming, not just the client one.

### The harness

`tests/scripts/profile-deploy-hardening.test.sh` (in `npm test` via `0201`) reads
`setup-telemetry.sh` but asserts only the role marker over it (`:280-281`) — **a cron edit does not
trip it today.** It **does** assert the profile box's certbot shape (`:428-439`: timer disabled, and
ordered after `certonly` and before the hooked renew cron). Mirror those assertions for the telemetry
script so the fix cannot silently regress. ⚠️ The harness file carries uncommitted `0220`/`0221` hunks
and [`0255`](../../backlog/0255-telemetry-compose-restart-policy-unless-stopped/brief.md) will add a block at
its tail — add yours after theirs; `ALL PASS` marker unchanged so `ShellHarnesses.test.ts` needs no
edit.

### 🚫 Not in scope

- Alerting when renewal fails — [`0258`](../../backlog/0258-telemetry-cert-renewal-failure-signal/brief.md).
- Retention not being applied — [`0259`](../0259-investigate-uptrace-retention-not-applied/brief.md).
- Source-map symbolication — [`0260`](../0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md).
- Restart policy on the telemetry compose services — `0255`.
- Any client/server exporter change (durable queueing etc.) — out of scope; data lost is lost.

## What to build

1. **Renew the certificate now, on the box — 🔴 THE OWNER's PRODUCTION WRITE, owner-ruled 2026-09-14.**
   The coder **prepares the exact command sequence** (stop nginx → `certbot renew`, or `certonly
   --standalone --force-renewal` if certbot considers it not due — it is expired, so it is due → start
   nginx), **including the VPN-bypass note** (memory `project_telemetry_vpn_access`: the telemetry VPS is
   unreachable while the full-tunnel VPN is on — add a `/32` bypass route or turn the VPN off), hands
   it to the owner, and **does not run it**. The owner runs it and reports the new `notAfter`. The coder
   then **verifies read-only** (verification steps 1–3) — read-only checks are the coder's to run, not
   to hand over.
2. **Fix the cron in `setup-telemetry.sh`** so renewal can succeed while nginx runs — **mirror
   `setup-profile.sh:1514` (pre/post hooks), owner-ruled; `--webroot` is off the table.** Keep the log
   redirect to `/var/log/certbot-renew.log` (`0258` reads it).
3. **Handle `certbot.timer`** the way the profile box does, if it exists on the box — disable it,
   ordered after `certonly` and before the cron, with the same `|| true` guard.
4. **Harness assertions** for the telemetry script: hooked renew cron present, timer disabled, order
   correct. **Negative control first**: RED against the pre-change script, then green.
5. **Redeploy** via `build-deploy-telemetry.sh` (owner's terminal) so the box carries the fixed cron —
   or, if the deploy is judged too heavy for a two-line change, apply the cron edit on the box by hand
   **and** land the script change, saying so in the worklog so the box and the repo are known to agree.
6. **Prove the renewal path** the way `0216` did: `certbot renew --dry-run` **with nginx running**,
   against LE staging. Paste the `Congratulations, all simulated renewals succeeded` line.

## Verification steps

1. **Certificate**: `openssl s_client`-style check from outside the box shows a `notAfter` ~90 days
   out and a valid chain; the Uptrace dashboard loads with no browser warning.
2. **Renewal path**: the `--dry-run` from step 6 succeeds with nginx up. The post-hook leaves nginx
   `active` and TLS serving `200` afterwards.
3. **Ingest resumes — all lanes, measured in Uptrace, not assumed:** (a) client error logs / spans
   with `service.version` = the **current** prod build appear within an hour of renewal (the exact
   evidence `0032` needs for its Step 5); (b) game-server spans/logs (`geoconflict-server` resource)
   resume; (c) game-box host metrics (`geoconflict.server.*` / node-exporter series) resume. For each
   lane record the last timestamp before the gap and the first after, so the outage window is a fact.
4. **Timer**: `systemctl is-enabled certbot.timer` on the box reports `disabled` (or the unit is
   absent — say which).
5. **Harness**: `bash tests/scripts/profile-deploy-hardening.test.sh` → `ALL PASS`, new assertions
   shown RED first; `npm test` green, suite/test counts unchanged.
6. 🔒 **No values anywhere** — the box's IP/hostname (beyond the public CN) and any header/DSN stay out
   of the worklog. Log lines pasted must be checked for the auth header first.

## Notes

- **Depends on:** nothing.
- **Blocks:** [`0258`](../../backlog/0258-telemetry-cert-renewal-failure-signal/brief.md) (hard); the
  end-to-end verification in
  [`0260`](../0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md); and `0032`'s
  owner-side Step 5 verification (not `0032`'s build, which is done).
- **Why four briefs from one finding:** this one restores ingest and stops the recurrence; the other
  three are different failure classes on the same box (nothing watches renewal; retention not applied;
  source maps not resolving) that ship and verify independently and must not delay a time-sensitive fix.
- **Effort: ~0.5 day** including the deploy and the measurement in step 3. **Risk: Low** — the only
  production write is the renewal itself, and the LE production rate limit (5 duplicate certs/week)
  means a botched `--force-renewal` loop can lock renewal out for a week: use `--dry-run` (staging)
  for every rehearsal, exactly as `0216` did.
- **Source:** `ai-agents/tasks/backlog/0032-investigate-null-id-errors/worklog.md` (Findings bullet 1;
  "Follow-up brief text" item 1; Residuals).
- **Rulings record (2026-09-14, owner, live in the lead session, relayed by `fkit-lead`):** (1) Sprint 4,
  rank High; (2) the renewal is the owner's production write, coder prepares and verifies read-only;
  (3) fix shape = profile-box pre/post hooks, not `--webroot`. Board mechanics: row appended to
  `plan-sprint-4.md` (ADR-035), Backlog-board row flipped to `➡️ Moved` and kept.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact.**
