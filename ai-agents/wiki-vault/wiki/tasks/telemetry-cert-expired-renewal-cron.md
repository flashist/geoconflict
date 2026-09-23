# Telemetry Certificate EXPIRED — ten days of dark telemetry, and a renewal cron that could never succeed

**Source**: `ai-agents/tasks/done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0257`

## Goal

**Restore telemetry ingest and stop the recurrence.**

The telemetry box's Let's Encrypt certificate **expired 2026-09-04 06:03 UTC**. Browsers refuse to export
to an expired certificate, so **client telemetry was dark for ten days**: client error-log groups fell
from **226 in the 78 h before expiry → 19 in the 7 days after → 2 in the last 24 h**, and **nothing from
the then-current prod build had ever appeared in telemetry**.

**Rank owner-ruled High, 2026-09-14** — unusually, the rank here is the **owner's**, not the producer's.
The reasoning was taken as a ruling: **monitoring is blind**, every client error since 09-04 is
unrecoverable (the exporters do not queue durably), nothing shipped to prod can be checked, and
`0032`'s owner-side verification **cannot run** until this lands. **The cheapest High on the board.**

## Key Changes

### The root cause — a renewal that had never worked and never could

`setup-telemetry.sh` issued the certificate with `certbot certonly --standalone` **after stopping
nginx**, then wrote an nginx server on `:80` that `return 301`s everything to https, and installed a
twice-daily cron running a **bare `certbot renew`**. certbot persists `authenticator = standalone`, so
**every renew tried to bind port 80 for the HTTP-01 challenge — a port nginx permanently owns.**

⇒ **The renewal had failed every run since the first attempt window (~30 days before expiry) and would
have failed forever.** The cron's `--post-hook` reloaded nginx *after* a failure, changing nothing. And
**nothing read `/var/log/certbot-renew.log`** — that gap is filed as `0258`.

**A second broken renewer:** the distro's `certbot.timer` (hookless `certbot renew`). The **profile box
disables it on purpose** and the hardening harness asserts that; `setup-telemetry.sh` did not. It was
**enabled on the box** and had run that morning.

### The fix — mirror the profile box, owner-ruled

🔴 **Fix shape owner-ruled 2026-09-14: mirror `setup-profile.sh`'s nginx pre/post hooks — NOT
`--webroot`. The boxes converge.** The accepted trade: **a few seconds of ingest gap only when a renewal
actually runs** (every ~60 days), in exchange for **one proven pattern on both boxes** and a reader
(`0258`) that can mirror `0219`'s. ⛔ **The plan did not re-open this choice.**

ℹ️ With hooks, the persisted `authenticator = standalone` stays and is **correct** — no renewal-conf edit
is needed. *(The `--webroot` variant would have needed one; recorded only so nobody re-derives it.)*

- Cron becomes `certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start
  nginx"`, keeping the log redirect `0258` reads.
- **`certbot.timer` disabled**, the way the profile box does it.
- **Harness assertions** mirroring the profile box's certbot shape (timer disabled, ordered after
  `certonly` and before the hooked cron), **shown RED against the pre-change script first**.

**The precedent was proven live, not assumed:** `0216` had run `certbot renew --dry-run` with those hooks
**while nginx was up**, completing a full HTTP-01 challenge against **LE staging — zero production
rate-limit spend**.

## Outcome

✅ **Renewed on the box by the OWNER 2026-09-14** (owner-ruled: the renewal is the owner's production
write; the coder prepares the command sequence and verifies **read-only**).

Coder's read-only re-verification over SSH: certificate `notAfter` ~90 days out with a valid chain and
HTTPS 200, `certbot.timer` **`disabled`** (unit present, not absent), the hooked cron line in place, nginx
`active` on both ports, and a **`certbot renew --dry-run` with nginx up** printing *"Congratulations, all
simulated renewals succeeded"* with the pre-hook stopping and the post-hook restarting nginx.

⚠️ **`notBefore` is not the renewal moment** — LE backdates it by ~1 h. The journal and certbot's own log
pin the real sequence, including the **last failed run of the old renewer** with `Could not bind TCP port
80`.

**Also confirmed on the box:** the renewal log was **full of** `Could not bind TCP port 80` — exactly the
mechanism reasoned from the repo — `ufw` was inactive, and DNS was correct (the box sits behind 1:1 NAT).

### ⚠️ What was measured, and what was only reasoned

`0032` measured **client** error logs only. **Three more lanes point at the same endpoint** — game-server
traces and logs, game-box host metrics via the otel-collector, and (by design) nothing from the profile
box. Whether the server lanes were dark since 09-04 was **reasoned, not observed**, and verification had to
show **each lane resuming**, not just the client one.

### Deliberately not in scope — four sibling briefs from one finding

- **Nothing watches renewal** → `0258` (still open).
- **Retention not applied** → [[tasks/uptrace-retention-not-applied]] (`0259`).
- **Source-map symbolication** → [[tasks/client-source-map-upload-verification]] (`0260`).
- **Restart policy on the telemetry compose services** → `0255`.

⚠️ **The LE production rate limit (5 duplicate certificates/week) means a botched `--force-renewal` loop
can lock renewal out for a week** — every rehearsal used **staging**, exactly as `0216` did.

🔄 **LATER EVIDENCE, 2026-09-22 — the renewed certificate is still valid.** `fkit-lead` measured the
telemetry box live and read-only: **HTTP 200 over valid TLS**, certificate issued 2026-09-14, **expires
2026-12-13** — matching this task's own worklog. On that evidence `0032`'s *"blocked on `0257`"* reason
was struck (`0032` stays blocked on the deploy window). ⚠️ **Two boundaries:** a valid certificate proves
**transport, not ingested data**; and an expiry date is **not a renewal test** — it does not show the
renewal cron will fire. 🚨 **Name the box:** `2026-12-13` is **this (telemetry)** certificate;
`2026-11-20` is the **profile** box's, a different certificate — a same-day proposal to move one date onto
the other was refused before it was applied. See [[systems/weekend-deploy-window]].

## Related

- [[systems/telemetry]] — the stack this restored, and where the outage window belongs
- [[tasks/profile-le-certificate-renewal-proof]] — task `0216`, the proven pattern this mirrors
- [[tasks/uptrace-retention-not-applied]] — task `0259`, a sibling from the same finding
- [[tasks/client-source-map-upload-verification]] — task `0260`, another sibling; its end-to-end step needed this
- [[systems/alert-delivery]] — the same box, and the same *"the signal exists and nothing reads it"* shape
- [[decisions/sprint-4]] — the sprint that owns it
- [[decisions/sprint-backlog]] — the board it was filed on, then pulled off by an owner ruling that set **both** board and rank
- [[systems/weekend-deploy-window]] — records both boxes' live cert readings of 2026-09-22 and the refused date swap
