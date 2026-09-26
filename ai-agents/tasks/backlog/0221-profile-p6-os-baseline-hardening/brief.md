# P6 — OS baseline hardening on the profile box, and the restart-policy divergence

## ID
0221

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint

Sprint 6

📌 **Moved from Sprint 5 to Sprint 6 on 2026-09-26** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` (*"Append to Sprint 6 (Recommended)"*), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. [Sprint 5](../../../sprints/plan-sprint-5.md) now carries only the profile/citizenship launch, and this task is not needed for it. Now rank 16 on [Sprint 6](../../../sprints/plan-sprint-6.md). `## Status` unchanged. *(Earlier value of this field: `Sprint 5`.)*

📌 **2026-09-26, later — deploy-coupled steps WAIT for Sprint 6.** OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-26, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Owner, verbatim: *"All wait for Sprint 6 (Recommended)"*. Effect: none of this task's deploy-coupled steps ride along with the profile/citizenship launch release; they run in Sprint 6. Record: the 2026-09-26 follow-up addendum on [Sprint 6](../../../sprints/plan-sprint-6.md).

📌 **Moved from Sprint 4 to Sprint 5 on 2026-09-23** — Sprint 4 rescope, an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Everything left in this task needs a deploy, the live box or production; Sprint 4 keeps only locally buildable work. `## Status` and `## Priority` were NOT changed; the folder did not move. Record: the *Sprint 4 rescope* addendum in [`plan-sprint-4.md`](../../../sprints/done/plan-sprint-4.md).

## Priority
**31** — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down two more later on 2026-09-26 by a fourth OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner moved `0311` + `0316` up to 14–15 — see the *RE-RANK 2026-09-26, FOURTH* addendum on that board. ⛔ Not a merit re-rank of this task. *Earlier values, kept below:*

~~**29**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down six more later on 2026-09-26 by a third OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3): the owner moved six appended name-change / purchase-state rows (`0312`–`0315`, `0317`, `0318`) up the board — see the *RE-RANK 2026-09-26, THIRD* addendum on that board. ⛔ Not a merit re-rank of this task. *Earlier values, kept below:*

~~**23**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down one more later on 2026-09-26 by a second OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021): the owner moved `0250` into Sprint 6 at rank 4 — see the second *RE-RANK 2026-09-26* addendum on that board. ⛔ Not a merit re-rank of this task. *Earlier values, kept below:*

~~**22**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), shifted down six on 2026-09-26 because an OWNER RULING (live via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021) put six rows above it — see the *RE-RANK 2026-09-26* addendum on that board. Order among the other rows unchanged; ⛔ not a merit re-rank of this task. *Earlier value, kept below:*

~~**16**~~ — board rank on [Sprint 6](../../../sprints/plan-sprint-6.md), set 2026-09-26 by the same owner ruling (append in Sprint 5's order, ranks continuing after Sprint 6's highest). ⚠️ An append position, **not** a merit re-rank. *Earlier value, kept below as history — it was true on the Sprint 5 / Sprint 4 boards, and any owner-ruled label in it still stands as a merit label:*

**Medium** — no player-facing symptom, but this box will hold personal data and it is
internet-facing.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🚧 Blocked — built + reviewed 2026-09-13 (restart policy `unless-stopped` + `init: true`; graceful SIGTERM shutdown incl. `Dockerfile.profile` exec-form `node` CMD; unattended-upgrades security-only, auto-reboot off; fail2ban sshd jail; sshd hardening drop-in with `Match all` pin, password-deploy refusal, restore-not-delete rollback; harness 221/0; stateful review round 1 closed out, R1–R7 applied, Codex coverage full; `npm test` 121/1261 green); open pending the OWNER-side live tail B1–B6 (deploy with a first SSH session open; new-session key login + password refusal; fail2ban ban from a throwaway source; daemon restart + reboot → both containers up; `docker compose stop profile-api` exit 0). Non-root deploy user split out by owner ruling. Driven by `/fkit-sprint-ship-loop`

> ### 📌 2026-09-26 deploy window — results
>
> **PROVENANCE.** Executed by the **OWNER on the boxes on 2026-09-26**; output pasted into the `fkit lead`
> session and read/checked by `fkit-lead` (**(lead)** = a read-only check `fkit-lead` ran itself from a
> non-allowed host). Recorded by a spawned `fkit-producer` with no owner channel (ADR-021). ⛔ Relayed
> evidence — not an owner ruling, not producer precedent. ⛔ **`## Status` NOT changed; no mover invoked.**
> Full table: [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *2026-09-26 — THE WINDOW RAN*.
>
> | Step | Verdict |
> |---|---|
> | **B1** (W3) | ✅ Allowed-Origins **security-only** (`o=Ubuntu,a=resolute-security`); fail2ban `sshd` jail up; four `✅ sshd:` lines (password auth off, root `prohibit-password`); `profile-api` recreated + healthy; no prompt. |
> | **B2** (W4) → **V3** | ✅ New key session works; password login refused `Permission denied (publickey)`; the 5 persist files `600 root`. |
> | **B3** (W9) → **V2** | ✅ **ban observed:** 6 failed auths (non-existent user, throwaway key) **from the game box** → `Total failed 6`, `Currently banned 1`, `Ban` at 08:39:45 UTC; then an **explicit unban** (`unbanip` → 1), **not** the 1 h expiry. ⚠️ **Expiry** was seen only on a **real internet attacker** banned at 07:34 UTC before W3 (default config), kept across both deploys, **expired after 1 h**. |
> | **B4** (W9) → **V1** | ⚠️ **partial.** Evidence = the dry-run allowed-origins line (security-only) from W3/W7. A real scheduled run is only **indirectly** evidenced (the 2026-09-25 `reboot-required` alert implies an applied upgrade). A real-run log grep was offered, **not run**. |
> | **B6** (W10) → **V6** | ⚠️ **partial.** `docker compose stop profile-api` in 0.4 s; `SIGTERM received — draining (deadline 8000ms)`, `http server closed — in-flight requests drained`, `pg pool closed`; exit code **0**; restarted. But the `/ready` loop showed only `000` — the stop beat its first request — so **no in-flight request was seen completing.** |
> | **B5** (W10) → **V5** | ⚠️ **daemon-restart half partial; reboot half ✅.** `systemctl is-active profile` → active. After `systemctl restart docker` both were Up (healthy) **but CREATED ~19 s earlier** ⇒ **recreated by the systemd `profile` unit**, not restarted by `unless-stopped` ⇒ shown in **outcome, not mechanism**. Reboot: **(lead)** `/ready` 502 → 200 in ~20 s; both Up; `no reboot pending`; manual `checks.sh` 12 ok / 0 failed. |
> | V4 | Split out (owner ruling Q8). |

## Owner
fkit-coder

## Depends on
[`0215`](../../done/0215-profile-p1-stand-up-the-box/brief.md) (P1) — a box to harden.

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
   [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) lands**, because
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
- **Build done 2026-09-13 (Part A + read-only B0); deploy B1–B6 pending on the owner** — see
  `worklog.md`. Item 4 (non-root deploy user) **explicitly split out** (owner ruling Q8; reason in the
  worklog) — this task lands `PermitRootLogin prohibit-password`, not `no`. B0 found the box is
  Ubuntu 26.04 and ships a `Match User root` sshd block that a globals-only drop-in cannot override;
  the drop-in pins the auth keywords in a `Match all` block and the deploy gates on
  `sshd -T -C user=root,…`.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names, file names and ports only.
</content>
