# Review ledger — s4-profile-04i

Task: `ai-agents/tasks/backlog/s4-profile-04i-server-bring-up-runbook.md`
File(s) under review: `setup-profile.sh` — **only** the 1:1-NAT DNS pre-check patch (`:498-515`): adds the explicit deploy target `PROFILE_SERVER_HOST` to the acceptable-IP set so the certbot HTTP-01 DNS gate stops false-failing on a NAT'd VPS. The PR's other two files (`ai-agents/sprints/plan-sprint-4.md`, `ai-agents/tasks/backlog/s4-feedback-remove-contact-field.md`) are planning/task docs — not reviewed for code defects.
Status: **closed-out (validation-gated)** (R2 — stateful-review re-review of committed fix `e0fd678`; R1 was changes-requested, PR 122). The patch's core logic is **correct** and the deploy is **empirically validated** (`api.geoconflict.ru` is live, 200/TLS — see memory `project_profile_backend_live`). Two **low, non-blocking** defects recorded and routed to a later fix: **C1** (hostname-valued `PROFILE_SERVER_HOST` silently false-negatives the gate — raised by both reviewers) and **A1** (stale `:28` comment). **C2** (DNS gate trusts unverified operator input as identity) is the already-tracked **X1**, verified **not materially worsened** here → suppressed.

**Update (2026-06-23, process-review R1 closeout):** #C1 and #A1 **applied** to `setup-profile.sh` and verified (`bash -n` clean; `getent` resolution confirmed on-box — both the IP form `80.78.247.199` and the hostname form `api.geoconflict.ru` resolve to the gate target `80.78.247.199`). **No open defects remain.** The fix is in the working tree, **uncommitted** (workflow rule: commit only on explicit request).

**Update (2026-06-23, stateful-review R2 — re-review of committed fix `e0fd678`):** both reviewers re-ran (full coverage). **C1/A1 confirmed fixed.** Codex raised a new "no-ship medium" — the `getent` append aborting a valid IP deploy under `set -e` — which is **disproven empirically**: `setup-profile.sh` has `set -e` (`:45`) but **no `pipefail`**, so the `getent | awk` pipeline exits with `awk`'s status (0) even when `getent` exits non-zero → no abort (4 bash tests, incl. a simulated `getent` exit 2). The two reviewers **directly contradicted each other** on this; resolved in favor of *safe*. Verdict: **Ready to merge — closed out.** Fix is now committed (`e0fd678`).

Reviewers (R1 + R2, stateful-review): **Claude `code-reviewer`** (review-only) + **Codex adversarial** — both ran, full coverage in each round.

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
- **`getent` append is abort-safe under `set -e` (D1 disproven, R2)** — What: the C1 fix
  appends `$(getent hosts "$PROFILE_SERVER_HOST" | awk '{print $1}')` to `ACCEPTABLE_IPS`
  inside an assignment while `set -e` is on (`:45`). Why (non-defect): `setup-profile.sh`
  does **not** set `pipefail`, so the pipeline's exit status is `awk`'s (0 on empty input)
  regardless of `getent`'s exit — a `getent` failure (PTR-less IP, degraded resolver,
  unresolvable host) yields an **empty append, not an abort**. Empirically verified
  (bash 3.2.57): a failing pipeline ending in `awk` inside an assignment under
  `set -e`/no-`pipefail` survives; the same *with* `pipefail` aborts; a bare `$(false)` in
  an assignment aborts — isolating the `awk` terminal stage (not assignment-exemption) as
  the protection. The literal IP is also already in `ACCEPTABLE_IPS` from the prior line,
  so the IP-valued path matches regardless. Codex's `2>/dev/null … || true` guard is
  **pure defense-in-depth — optional, not required.** Re-raise only if: `pipefail` is later
  enabled in `setup-profile.sh` (then guard the `getent` pipeline, e.g. `|| true`, or move
  it out of the assignment).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | (**both** — Codex *med* / Claude *low*) NAT bypass only works when `PROFILE_SERVER_HOST` is a literal IP; a **hostname** value (a documented `IP/host` form) is compared to `getent hosts` IPs and never matches → silent **false-negative**, reproducing the spurious abort the patch fixes (`:504-508`) | **CORRECT — defect (low)** | **Open #C1.** Live config uses an IP (`80.78.247.199`) so it works today, and it fails **closed** (errors, never mis-issues). Recorded + routed to a later fix: resolve `PROFILE_SERVER_HOST` via `getent hosts "$PROFILE_SERVER_HOST" \| awk '{print $1}'` and add the resolved IP(s) to `ACCEPTABLE_IPS`, so both IP and hostname forms work. Non-blocking. |
| 1 | (**Claude**, *low*) header comment `:28` still says `PROFILE_SERVER_HOST` is "used **only** for the connection-info banner" — the patch adds a second use (DNS gate `:504`; banner is `:726`) | **CORRECT — defect (low, doc)** | **Open #A1.** Recorded as a low doc fix: update `:28` to note the DNS pre-check (NAT-bypass) role **and** that an IP is needed for that path. Non-blocking. |
| 1 | (**Codex**, *med*) DNS gate trusts unverified operator input (`PROFILE_SERVER_HOST`) as host identity → "could proceed on the wrong target" (`:498-508`) | **PARTIALLY CORRECT → frontier-move; re-raises settled X1; severity med→low** | **Suppressed.** This is **X1** (homed in `s4-profile-04g`). Verified **not materially worsened**: the gate runs *after* full provisioning and doesn't change which box the script is on (the box was already SSH'd into and provisioned). It only weakens the gate as a wrong-host *detector* — a role it never meaningfully had (post-provisioning). Real fix is the build-deploy-side preflight (X1/04g). The only net-new sliver ("validate `PROFILE_SERVER_HOST` is a public IP") folds into C1. |
| 1 | (**both**, verified non-findings) `set -e`+`&&` loop exempt & unchanged; empty-`PROFILE_SERVER_HOST` trailing-space dropped by word-splitting; no false-**positive** path (gate fails closed) | **CONFIRMED — no defect** | Both reviewers self-cleared these. The `[ "$rip" = "$hip" ] && DNS_MATCH=1` pattern is pre-existing; the empty `${PROFILE_SERVER_HOST:-}` contributes no token; an IP not bound here can't equal a real resolved IP. No action. |
| 1 (fix) | #C1 — hostname-valued `PROFILE_SERVER_HOST` false-negatives the gate | **RESOLVED** | Applied: after the `ACCEPTABLE_IPS` assignment, getent-resolve `PROFILE_SERVER_HOST` to IP(s) and append them, so the hostname form matches the getent-resolved domain IP. Verified on-box (both IP + hostname → `80.78.247.199`); `bash -n` clean; IP-valued live config is a no-op. |
| 1 (fix) | #A1 — stale `:28` comment ("only ... banner") | **RESOLVED** | Applied: `:28` now documents the DNS pre-check (NAT-bypass) role + IP preference; "only" dropped. |
| 2 | (**stateful-review re-review**, PR 122) C1 + A1 fixes in committed `e0fd678` re-verified | **CONFIRMED FIXED — no regression** | C1: getent-resolution makes both IP and hostname forms match; abort-safe (see residual). A1: `:28` comment documents the DNS-gate role + IP preference. `bash -n` clean; live IP path is a no-op. |
| 2 | (**Codex**, *medium* "no-ship") the `getent` append can abort a valid IP deploy via `set -e` before the literal IP is used (`:510-512`) | **INCORRECT (disproven empirically)** | No `pipefail` in `setup-profile.sh` (`:45` is `set -e` only) → the `getent \| awk` pipeline exits with `awk`'s 0 even when `getent` exits 2 → no abort. 4 bash tests confirm (TEST 1/4 survive; TEST 2 aborts only *with* pipefail; TEST 3 shows bare `$(false)` aborts, isolating awk-masking as the protection). → Accepted residual (abort-safe). Suggested `\|\| true` is optional defense-in-depth. |
| 2 | (**Claude**, *informational*) comment "getent on an IP returns that IP" is slightly over-confident (a PTR-less IP can return empty/exit 2) | **CORRECT → trivial (non-defect)** | Harmless — the literal IP is already in `ACCEPTABLE_IPS` from the prior line, so the match holds regardless of getent output. No action. |
| 2 | (**reconciliation**) the two reviewers **contradicted each other** on the getent-abort claim (Codex no-ship vs Claude safe) | **Resolved in favor of safe** | Settled empirically (grep: no pipefail; 4 bash tests). Note: Claude's *conclusion* is right but its secondary rationale ("set -e exempts cmd-sub in non-simple assignments on bash 4+") is **wrong** (TEST 3 disproves it); the real protection is the awk terminal stage + no pipefail. |

**No oscillation / no loop:** first review of this slice. Both reviewers led with "medium"; verification collapsed to **two low non-blocking defects** (C1 hostname false-negative, A1 stale comment) + one re-raise of the already-tracked **X1** (C2). The patch is correct for the live IP-valued config and the deploy is empirically up (200/TLS). Stateless severity-inflation again (Codex's "no-ship medium" → low, fails-closed); caught at the verify gate. **R2 (re-review of fix `e0fd678`):** C1/A1 confirmed fixed; Codex's one new "no-ship medium" (getent abort) was a **disproven premise** (no pipefail + awk terminal). The two reviewers contradicted each other; resolved empirically. No loop — each round surfaced genuinely new (if ultimately disproven) material, not re-litigation of accepted residuals.

## Open / actionable

- **None.** #C1 and #A1 applied + **committed** (`e0fd678`) and re-verified R2. Codex's R2 getent-abort claim **disproven** (accepted residual — abort-safe; no pipefail + awk terminal). No open defects — slice **closed-out (validation-gated)**: the only remaining gate is the on-box independent test, already largely met (site live 200/TLS; getent resolution confirmed on-box).

## Forward notes (for downstream tasks)

- C1 + A1 both touch the same DNS-gate area as **X1** (the wrong-host preflight homed in `s4-profile-04g`). If/when 04g's `setup-profile.sh`/transport hardening is implemented, folding C1's `getent`-resolution and A1's comment fix into that pass is the natural, low-cost bundling — optional, not required. Apply the same `getent`-resolution to `build-deploy-telemetry.sh`/`setup-telemetry.sh` only if they grow an equivalent NAT DNS gate.
