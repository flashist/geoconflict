# Review ledger — s4-profile-04i

Task: `ai-agents/tasks/backlog/s4-profile-04i-server-bring-up-runbook.md`
File(s) under review: `setup-profile.sh` — **only** the 1:1-NAT DNS pre-check patch (`:498-515`): adds the explicit deploy target `PROFILE_SERVER_HOST` to the acceptable-IP set so the certbot HTTP-01 DNS gate stops false-failing on a NAT'd VPS. The PR's other two files (`ai-agents/sprints/plan-sprint-4.md`, `ai-agents/tasks/backlog/s4-feedback-remove-contact-field.md`) are planning/task docs — not reviewed for code defects.
Status: **changes-requested (non-blocking)** (R1 — stateful-review, PR 122). The patch's core logic is **correct** and the deploy is **empirically validated** (`api.geoconflict.ru` is live, 200/TLS — see memory `project_profile_backend_live`). Two **low, non-blocking** defects recorded and routed to a later fix: **C1** (hostname-valued `PROFILE_SERVER_HOST` silently false-negatives the gate — raised by both reviewers) and **A1** (stale `:28` comment). **C2** (DNS gate trusts unverified operator input as identity) is the already-tracked **X1**, verified **not materially worsened** here → suppressed.

Reviewers (R1, stateful-review): **Claude `code-reviewer`** (review-only) + **Codex adversarial** — both ran, full coverage.

Related ledgers:
- `s4-profile-04e2.md` (same file, `setup-profile.sh`) — governs this file. Its **domain-optional** residual (the whole HTTPS block, incl. this gate, is skipped when `PROFILE_DOMAIN` is unset) and its R2 **certbot-cron `PROFILE_DOMAIN`-gating** fix are the basis for the no-false-positive reasoning below. None of its residuals were re-raised.
- `s4-profile-04g.md`-adjacent: finding **X1** (wrong-host / remote-identity preflight) is homed in task `s4-profile-04g` (added there R3 from the 04e3 review). C2 below is X1 resurfacing — see Decision log.
- `s4-profile-04e3.md` — origin of X1 (and X2, → `sec12`).

## Accepted residuals (do-not-re-litigate)

- **NAT-bypass: `PROFILE_SERVER_HOST` admitted to `ACCEPTABLE_IPS`** — What: the DNS gate
  accepts the domain resolving to **either** a local interface IP (`hostname -I`) **or**
  the explicit deploy target `PROFILE_SERVER_HOST` (`:504`). Why (structural): on a 1:1-NAT
  VPS (reg.ru, `80.78.247.199`) the public A-record IP is **never** on a local interface,
  so the original `hostname -I`-only check false-failed every TLS deploy. `PROFILE_SERVER_HOST`
  *is* the public address the box is reached at (it is the SSH/SCP target in
  `build-deploy-profile.sh`), so "DNS resolves to the host we are deploying to" is exactly
  this gate's intent, and certbot HTTP-01 still reaches the box through the NAT. The gate
  still **fails closed** (no false-positive: an IP not actually reachable here can't equal a
  real resolved IP unless DNS is misconfigured). Re-raise only if: a non-IP/untrusted
  `PROFILE_SERVER_HOST` is shown to produce a **false-positive** (gate passes when DNS does
  *not* point at this box) — the current incompleteness is the opposite (false-negative,
  tracked as **C1**, fails-closed).
- **Gate runs after provisioning (not a wrong-host guard)** — What: this DNS gate executes
  inside the `PROFILE_DOMAIN`-set HTTPS block (`:486+`), *after* apt/swap/ufw/containers
  have already run. Why (structural): it was never a deploy-target identity check — it only
  decides whether certbot/nginx is attempted on the box already provisioned. Identity-of-target
  is **X1** (homed in `s4-profile-04g`), not this gate. Re-raise only if: the gate is moved
  before provisioning AND repurposed as the target-identity check (then it must use an
  independently-derived IP, per X1).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | (**both** — Codex *med* / Claude *low*) NAT bypass only works when `PROFILE_SERVER_HOST` is a literal IP; a **hostname** value (a documented `IP/host` form) is compared to `getent hosts` IPs and never matches → silent **false-negative**, reproducing the spurious abort the patch fixes (`:504-508`) | **CORRECT — defect (low)** | **Open #C1.** Live config uses an IP (`80.78.247.199`) so it works today, and it fails **closed** (errors, never mis-issues). Recorded + routed to a later fix: resolve `PROFILE_SERVER_HOST` via `getent hosts "$PROFILE_SERVER_HOST" \| awk '{print $1}'` and add the resolved IP(s) to `ACCEPTABLE_IPS`, so both IP and hostname forms work. Non-blocking. |
| 1 | (**Claude**, *low*) header comment `:28` still says `PROFILE_SERVER_HOST` is "used **only** for the connection-info banner" — the patch adds a second use (DNS gate `:504`; banner is `:726`) | **CORRECT — defect (low, doc)** | **Open #A1.** Recorded as a low doc fix: update `:28` to note the DNS pre-check (NAT-bypass) role **and** that an IP is needed for that path. Non-blocking. |
| 1 | (**Codex**, *med*) DNS gate trusts unverified operator input (`PROFILE_SERVER_HOST`) as host identity → "could proceed on the wrong target" (`:498-508`) | **PARTIALLY CORRECT → frontier-move; re-raises settled X1; severity med→low** | **Suppressed.** This is **X1** (homed in `s4-profile-04g`). Verified **not materially worsened**: the gate runs *after* full provisioning and doesn't change which box the script is on (the box was already SSH'd into and provisioned). It only weakens the gate as a wrong-host *detector* — a role it never meaningfully had (post-provisioning). Real fix is the build-deploy-side preflight (X1/04g). The only net-new sliver ("validate `PROFILE_SERVER_HOST` is a public IP") folds into C1. |
| 1 | (**both**, verified non-findings) `set -e`+`&&` loop exempt & unchanged; empty-`PROFILE_SERVER_HOST` trailing-space dropped by word-splitting; no false-**positive** path (gate fails closed) | **CONFIRMED — no defect** | Both reviewers self-cleared these. The `[ "$rip" = "$hip" ] && DNS_MATCH=1` pattern is pre-existing; the empty `${PROFILE_SERVER_HOST:-}` contributes no token; an IP not bound here can't equal a real resolved IP. No action. |

**No oscillation / no loop:** first review of this slice. Both reviewers led with "medium"; verification collapsed to **two low non-blocking defects** (C1 hostname false-negative, A1 stale comment) + one re-raise of the already-tracked **X1** (C2). The patch is correct for the live IP-valued config and the deploy is empirically up (200/TLS). Stateless severity-inflation again (Codex's "no-ship medium" → low, fails-closed); caught at the verify gate.

## Open / actionable

- **#C1 (low, non-blocking)** — `setup-profile.sh:504`: resolve `PROFILE_SERVER_HOST` (it may be a hostname per the documented `IP/host` form) to concrete IP(s) before adding to `ACCEPTABLE_IPS`, e.g. `getent hosts "$PROFILE_SERVER_HOST" | awk '{print $1}'`. Today's config is an IP so the gate works; the fix removes the hostname-form trap. Fails-closed today, so not blocking.
- **#A1 (low, non-blocking)** — `setup-profile.sh:28`: update the `PROFILE_SERVER_HOST` doc to reflect the DNS pre-check (NAT-bypass) role and the IP requirement for that path; drop the misleading "only".

## Forward notes (for downstream tasks)

- C1 + A1 both touch the same DNS-gate area as **X1** (the wrong-host preflight homed in `s4-profile-04g`). If/when 04g's `setup-profile.sh`/transport hardening is implemented, folding C1's `getent`-resolution and A1's comment fix into that pass is the natural, low-cost bundling — optional, not required. Apply the same `getent`-resolution to `build-deploy-telemetry.sh`/`setup-telemetry.sh` only if they grow an equivalent NAT DNS gate.
