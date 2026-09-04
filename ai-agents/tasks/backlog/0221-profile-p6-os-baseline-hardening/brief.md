# P6 — OS baseline hardening on the profile box, and the restart-policy divergence

## ID
0221

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**Medium** — no player-facing symptom, but this box will hold personal data and it is
internet-facing.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
[`0215`](../0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box to harden.

## Context

### What is missing

`setup-profile.sh` provisions swap, Docker, ufw, nginx and TLS. It does **not** provision any OS
security baseline:

- **No `unattended-upgrades`** — security patches are never applied unless someone remembers.
- **No `fail2ban`** — SSH is exposed with no brute-force throttle beyond key auth.
- **No sshd hardening** — password auth, root login and the rest are at distro defaults.
- **No non-root deploy user** — 🚨 **the deploy runs as root by default.**

⚠️ **The non-root user is where this task can balloon.** It touches the entire deploy path:
`build-deploy-profile.sh`'s SSH target, `setup-profile.sh`'s privileged operations, Docker group
membership, file ownership under the deploy directory, and the deploy harness's fixtures. **Scope it
deliberately or split it out — do not let it silently become the whole task.**

### G7 — the restart-policy divergence

| Box | Policy | Where |
|---|---|---|
| **Profile** | `restart: on-failure` | `setup-profile.sh:405`, `:427` |
| **Game** | `--restart=always` | `update.sh:64` |

⚠️ **`on-failure` does NOT bring containers back after a Docker DAEMON restart.** systemd covers a
**reboot**; it does not cover the daemon restarting under it. So the profile box has a real recovery
hole that the game box does not.

**Recommendation: align to `unless-stopped`.** It survives the daemon restart without fighting a
deliberate `docker stop` the way `always` does. ⚠️ **This is a recommendation, not a ruling — put it
to the owner if the plan disagrees.**

### G8 — no graceful shutdown

`src/profile-server/Server.ts` installs **no SIGTERM handler** and **never closes the pool**. On
shutdown, in-flight requests are dropped and connections are severed rather than drained.

✅ **Severity: LOW, and here is why — do not inflate it.** The credit ledger's **idempotency primary
key** means a dropped-and-retried credit cannot double-credit. The consequence is a dropped request,
not corrupted data. **Fix it because it is cheap and correct, not because it is urgent.**

## What to build

1. **`unattended-upgrades`** — security updates only, with automatic reboot **disabled** unless the
   owner rules otherwise. ⚠️ **An unattended reboot on a single-box service is an unattended
   outage** — surface the choice rather than picking silently.
2. **`fail2ban`** on sshd, with a recorded ban policy.
3. **sshd hardening** — disable password authentication, and decide explicitly about root login
   (which interacts with item 4). Record what was changed and why.
   🚨 **Do not lock yourself out.** Verify the new config from a **second, already-open session**
   before closing the first.
4. **A non-root deploy user.** ⚠️ **Scope this deliberately.** If it grows past the estimate, **stop
   and split it into its own task** rather than absorbing the overrun — the rest of this phase is
   valuable on its own and should not be held hostage to it.
5. **Change the compose restart policy** from `on-failure` to `unless-stopped`
   (`setup-profile.sh:405`, `:427`), aligning the recovery behaviour with the game box's intent.
6. **Add a SIGTERM handler to `src/profile-server/Server.ts`** that stops accepting connections,
   drains in-flight requests and **closes the pool**.

### 🚫 Not in this phase

- Log rotation, image prune, uptime checks (P4 / `0219`).
- Secret persistence (P5 / `0220`).
- Anything that changes the nginx `/internal/` allow-list semantics — that is P2's variable
  (`0217`), not a hardening change.

## Verification steps

1. **`unattended-upgrades` is installed AND observed to have applied something** — or, if nothing was
   pending, its dry run is shown selecting the security pocket. ⚠️ *"The package is installed"* is not
   evidence that it works.
2. **`fail2ban` bans on a deliberate failed-auth burst**, and the ban expires as configured.
   **Observe it, do not assert it.**
3. **sshd hardening is verified from a NEW session** — key auth works, password auth is refused.
   🚨 **Never verify this by closing your only session.**
4. **The non-root deploy user completes a full deploy end to end**, or the item is **explicitly split
   out** with the reason recorded. ⚠️ **A half-migrated deploy user is worse than none** — it is a
   path that works for the person who built it and for nobody else.
5. **The restart policy survives a Docker DAEMON restart** — restart the daemon (not the box) and
   show both containers come back. 🚨 **This is the specific hole `on-failure` leaves; test exactly
   it.** Then reboot the box and show systemd still covers that path too.
6. **SIGTERM drains cleanly** — an in-flight request completes and the pool closes, shown in logs.
7. **`npm test` still passes** with suite/test counts unchanged unless deliberately changed.
8. **The deploy harness still passes** (`tests/scripts/profile-deploy-hardening.test.sh`) — this task
   touches the deploy path, which is exactly what that harness guards. ⚠️ **Run it by hand until
   [`0201`](../0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) lands**, because
   until then nothing runs it for you.
9. 🔒 **No values anywhere** — no IPs in a `fail2ban` example, no usernames that are also secrets, no
   key material.

## Notes

- **Effort: 0.5–1 day. Risk: Low-Medium — but the non-root deploy user is the item that could
  balloon.** That risk is called out here so the plan can bound it up front.
- **G8's low severity is load-bearing, in both directions.** It is low **because** the credit
  ledger's idempotency PK prevents double-crediting on retry. ⚠️ **If that PK is ever removed, this
  stops being low** — say so if anything in a plan touches it.
- **Related:** `update.sh:64` (the game box's restart policy — the comparison, and the intent to
  match), `setup-profile.sh:405`/`:427` (the divergent values).
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
</content>
