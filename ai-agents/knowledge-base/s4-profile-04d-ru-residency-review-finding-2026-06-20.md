# T4d Provisioning — "RU residency never verified" Review Finding (Rejected)

**Date:** 2026-06-20
**Task:** `ai-agents/tasks/done/0176-profile-04d-vps-provisioning/brief.md` (T4d)
**Artifact under review:** `setup-profile.sh`
**Verdict:** **INCORRECT** as a no-ship blocker — no code change made.

---

## The finding (as submitted)

> **[high] Required RU residency is never verified (`setup-profile.sh:51-64`)**
> The task makes RU geolocation a 152-FZ deployment constraint and explicit acceptance
> criterion, but validation only checks port and swap inputs. A mistakenly provisioned
> non-RU VPS proceeds through setup and is declared complete, allowing later
> personal-profile data deployment outside the required jurisdiction.
> *Recommendation:* Add a fail-closed preflight that verifies the target's public IP
> geolocates to RU before durable provisioning, with an explicit auditable operator
> override only if required for provider/API degradation.

The factual observation is accurate — `setup-profile.sh` performs no RU geolocation
check; its `Validate` block (lines 51-64) only checks `PROFILE_PORT` and
`PROFILE_SWAP_SIZE_GB`. The **conclusion** that this is a defect does not hold against
the task's actual scope.

---

## Why it was rejected

### 1. The task scopes script-side validation to exactly two checks — RU is not one

Task Scope:

> Defaults + input validation (provisioning-only invocation must not require deploy-only
> vars like `PROFILE_IMAGE`/`POSTGRES_PASSWORD`; `PROFILE_PORT`/`PROFILE_SWAP_SIZE_GB`
> numeric checks).

The script implements precisely that. An RU geolocation gate is nowhere in the script's
stated scope.

### 2. "Box geolocates to RU (IP check)" is an acceptance *verification*, not a script feature

In the task's Acceptance criteria, the RU line sits in the same list as
`swapon --show lists /swapfile`, `nginx -t passes`, and `ufw status shows 22/80/443` —
all **tester-side assertions** performed against the provisioned box, not behaviors the
script self-enforces. The `(IP check)` parenthetical describes *how the tester verifies*
(geolocate the box's public IP), mirroring how RU-ness has always been confirmed for
these boxes (project memory: "All Geoconflict VPS are reg.ru, Moscow … verified by IP
geolocation 2026-06-13" — a manual step, not an automated gate).

### 3. The threat model assigns residency to the operator, not the script

Task Threat model:

> Residency (152-FZ) satisfied by the box being reg.ru/RU.

This is the same shape as the other human precondition the task spells out explicitly:

> Operator precondition (human-only): the `api.geoconflict.ru` A-record is pointed at the
> box **before** setup runs. Setup does **not** mutate DNS.

RU-ness is an operator precondition (provision a reg.ru box) exactly like the DNS A-record
pointing. The script's job is to bring up a box it is *handed*, not to re-litigate where
the operator bought it.

### 4. A fail-closed geo-API preflight would import a fragile dependency the task deliberately omitted

The recommendation itself hedges — *"only if required for provider/API degradation"* —
acknowledging that a runtime, fail-closed dependency on a third-party IP-geolocation
service is unreliable. Hosting-provider IP ranges are precisely where geo-IP databases are
least accurate, so such a gate could **block provisioning of a legitimately-RU reg.ru box**
when the geo service is wrong or unreachable. The salvage source (`4e56fbf:setup-profile.sh`,
and `setup-telemetry.sh`) never included such a check; introducing one here would exceed
the task's stated validation scope and add a new failure mode.

---

## Residual concern (acknowledged, handled by design)

The reviewer's underlying worry — *nothing in code programmatically enforces jurisdiction*
— is real in the abstract. It is **handled out-of-band by design**, identically to the DNS
precondition: the operator provisions a reg.ru (Russian) box, and the tester confirms RU
geolocation as an acceptance step. It is not plausible to "accidentally" receive a non-RU
box from reg.ru, and the DNS pre-check already binds setup to a specific operator-pointed
host.

If belt-and-suspenders is ever wanted, the only in-scope-spirit option would be a
**non-fatal advisory** echo in the completion banner (e.g. "verify this IP geolocates to RU
before deploying profile data") — explicitly **not** a fail-closed geo-API gate. This was
considered and **not** adopted, to keep the slice within the task's "numeric checks only"
validation scope.

---

## Disposition of the full review

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| 1 | Swap double-failure non-fatal + already-active path skips fstab | **CORRECT** | Fixed: fail closed on double-failure for nonzero `PROFILE_SWAP_SIZE_GB` (opt-out = `PROFILE_SWAP_SIZE_GB=0`); ensure exact `/etc/fstab` entry on the already-active path |
| 2 | Required RU residency never verified | **INCORRECT** | No change — operator precondition + acceptance verification, out of the task's stated script-side validation scope (this document) |
