# Profile Box P6 — OS Baseline Hardening, the Restart-Policy Divergence, and Graceful Shutdown (task 0221)

**Source**: `ai-agents/tasks/done/0221-profile-p6-os-baseline-hardening/brief.md` (its `worklog.md` and `review.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 7 (position carried across, not a merit rank; moved Sprint 4 → 5 → 6 → 7) / task `0221` / clean-slate epic `0213`, phase P6

> ✅ **Closed 2026-10-01** `(agent-closed — not owner-verified)` by a spawned `fkit-producer`, relayed by `fkit-lead`.
> **The owner ran every live check** (B1–B6 in the 2026-09-26 deploy window; the B4 log read on 2026-10-01) and made
> both residual rulings live. The marker covers the **close**, not the evidence.
>
> ⚠️ **Two verification steps closed as ACCEPTED RESIDUALS, not passes** — V5 (daemon restart) and V6 (in-flight
> drain). Read *Outcome* before relying on either.
>
> ⚠️ **The board was stale before this close:** the row and `## Status` still read *"open pending the OWNER-side live
> tail B1–B6"*, though B1–B6 had run on 2026-09-26.
>
> ⛔ No hosts, IPs, usernames or key material on this page.

## Goal

`setup-profile.sh` provisioned swap, Docker, ufw, nginx and TLS but **no OS security baseline** on an internet-facing
box that will hold personal data. Add one, and close two gaps found alongside:

- **G7 — restart-policy divergence.** The profile box used `restart: on-failure`; the game box uses
  `--restart=always`. `on-failure` does **not** bring containers back after a Docker **daemon** restart.
- **G8 — no graceful shutdown.** No SIGTERM handler; the pool was never closed. ✅ **Severity LOW, and the reason is
  load-bearing:** the credit ledger's idempotency primary key makes a dropped-and-retried credit safe. ⚠️ **If that key
  is ever removed, this stops being low.**

## Key Changes

Built and reviewed 2026-09-13 (summary from the Sprint 7 row; spot-checked against `setup-profile.sh`,
`src/profile-server/Shutdown.ts` and `Dockerfile.profile`):

- **`unattended-upgrades`, security updates only, automatic reboot OFF** — an unattended reboot on a single-box
  service is an unattended outage. Look for `Unattended-Upgrade::Automatic-Reboot "false"` in `setup-profile.sh`.
- **`fail2ban` sshd jail**, fail-closed: the deploy refuses to finish if the jail is not up.
- **sshd hardening drop-in** — password auth off, root login `prohibit-password` (not `no`). B0 found the box runs
  Ubuntu 26.04 and ships a `Match User root` block a globals-only drop-in cannot override, so the drop-in pins the
  auth keywords in a `Match all` block and the deploy gates on the effective config; password-deploy refusal;
  restore-not-delete rollback.
- **Compose `restart: unless-stopped` + `init: true`** (G7, and so SIGTERM reaches node).
- **Graceful SIGTERM shutdown** (G8) — stop accepting, drain in-flight requests, close the pool
  (`src/profile-server/Shutdown.ts`), with an exec-form `node` CMD in `Dockerfile.profile`.
- **Item 4, the non-root deploy user, was split out** by owner ruling Q8 → task `0254` (Backlog). So the deploy still
  runs as root.
- **The telemetry box's same `on-failure` divergence was filed separately** at this task's plan approval, as `0255`
  (Backlog board) — not fixed here.
- At build: deploy harness 221 / 0, `npm test` 121 suites / 1261 tests green; stateful review round 1, R1–R7 applied.

## Outcome

| Verification | Result |
|---|---|
| V1 unattended-upgrades applies security updates (B4) | ✅ **proven 2026-10-01** — a scheduled run on 2026-09-29 installed three packages, after the security-only config went live on 2026-09-26 |
| V2 fail2ban bans on a failed-auth burst (B3) | ✅ ban seen (6 failed auths → banned), then explicit unban; ⚠️ the 1 h **expiry** was seen only on a real attacker's ban |
| V3 sshd — key works, password refused, from a new session (B2) | ✅ |
| V4 non-root deploy user | split out → `0254` |
| V5 containers return after a Docker **daemon** restart (B5) | ⚠️ **accepted residual** (owner: *"Accept it (Recommended)"*) — the app came back, but the containers were **recreated by the systemd `profile` unit**, not restarted by `unless-stopped`. Proven by **outcome, not mechanism**. Reboot half ✅ |
| V6 SIGTERM drains cleanly (B6) | ⚠️ **accepted residual** (owner: *"Accept now, close 0221"*) — drain message, server closed, pool closed, exit 0; but **no in-flight request was seen completing** (the stop beat the first request). No follow-up task |
| V7 / V8 `npm test` and the deploy harness | ✅ at build |
| V9 no values recorded | ✅ |

**Re-raise conditions recorded in `review.md`:** V5 — if the systemd `profile` unit is removed or changed, or a daemon
restart is ever seen not to recover the app. V6 — if the idempotency key is removed, or a dropped request is ever traced
to a deploy or stop.

## Related

- [[systems/player-profile-store]] — the profile box; its *operability tail* section scoped this task
- [[systems/weekend-deploy-window]] — the 2026-09-26 window that ran B1–B6 (write `0221-B5`, not `B5` — `0219` reuses the letters)
- [[decisions/sprint-7]] — the board (rank 7); closed 2026-10-01
