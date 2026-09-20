# Alert-Path Liveness Probe — a webhook 403 permanently and silently disables alerting

**Source**: `ai-agents/tasks/done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0284`

> ⛔ **No hostnames, IPs, ports, chat ids, topic ids, tokens or ping URLs on this page** — the source
> brief is written under that rule and the vault honours it.

## Goal

**Guard the one failure mode that turns monitoring off for good and says nothing.**

The defect, **verified by disassembly of the shipped Uptrace 2.0.2 binary — not theorised**: a `401`,
`403` or `404` reply from a webhook endpoint calls `NotifChannelGateway.Disable`, and `notifyChannel`
then refuses to send unless the channel state is `"delivering"`. ⇒ **Every subsequent alert is dropped at
the source — permanently, silently, with no retry.** Not a failed delivery: a **disabled channel**.
Nothing re-enables it but a human in the UI, and nothing tells that human it happened.

**Why this project is exposed, specifically:** `0277`'s relay is mounted behind the profile box's nginx
`/internal/` allowlist, and **that allowlist returns `403` to a source address not on it**. So if the
telemetry box's egress address **changes**, is **mistyped**, or is **dropped from
`PROFILE_INTERNAL_ALLOW_IPS` at a deploy**, the very first alert after that moment **disables alerting
forever**. **Three ordinary operational events, each with precedent in this project.** The owner accepted
it knowingly (ruling B, 2026-09-17); **this task is the mechanical half of that acceptance.**

## Key Changes

An hourly cron **on the telemetry box** POSTs a probe to the relay route: **the same URL, the same nginx
allowlist, the same `/internal/` location, the same route and the same shared secret, from the same
egress address a real alert leaves from.** ⚠️ **That is the entire point** — a probe run from anywhere
else is worthless. The relay checks the secret, **writes a freshness marker, and sends nothing**;
`profile-checks.sh` reads that marker's age in its existing **daily** run; stale or missing ⇒ `FAIL` ⇒
the **external dead-man's switch**, a path that depends on **neither the monitoring stack nor Telegram**.

| Piece | Where |
|---|---|
| Probe script + hourly cron | `setup-telemetry.sh` → `/opt/uptrace/alert-probe.sh`, `/opt/uptrace/alert-probe.env` (both root-only) |
| Deploy variables | `TELEMETRY_ALERT_PROBE_URL`, `PROFILE_ALERT_WEBHOOK_TOKEN` |
| Marker write | `src/profile-server/AlertRelay.ts` (`ALERT_PROBE_MARKER_PATH`), bind-mounted out by `setup-profile.sh` |
| The check | `profile-checks.sh` check 11, `alert-path-probe` |

**Review.** Round 1 ran the reviewer's own pass **plus a Codex adversarial pass — coverage FULL, no
degradation.** Five findings, **all verified correct, all fixed** — two under standing approval (a
non-string `probe` value could **drop a real alert**; the *"secret never on a curl argv"* harness guard
was line-oriented and **a planted leak passed it**), three owner-ruled (enforce the token constraint at
deploy time; give the probe a **distinguishable reply**; fix the future-date hole in the **pre-existing**
checks too). Two further checks fixed on a later owner ruling after a full sweep of every age computation
in `profile-checks.sh`: six found, five now guarded, one already safe, **no seventh**.

**Gates — lead-verified on an independent run, not taken from the worker:** `tsc` clean · `npm test`
**137 suites / 1853 tests, 0 failed** · `tests/profile-checks.sh` **118 passed, 0 failed** · hardening
harness **ALL PASS** · `check:config-parity` REQUIRED 0 on all three pipelines. No supertest flake, no
`SIGSEGV`, nothing re-run.

### What was ruled out, because each looks like it might cover this

- ⛔ **`profile-checks.sh` cannot assert the allowlist — and must not pretend to.** The only value it
  could compare against is the one the same deploy just wrote: **a value compared with itself**. It would
  report a confident `OK` while the real address had moved. **A guard that cannot fail for the reason you
  built it is worse than none**, because it answers the question a reader would think to ask.
- **`setup-profile.sh` already prints the allowlist at deploy** (since `0276`) — free, correct, keep it,
  but it guards **nothing between deploys**, and the address can move without a deploy.
- 🚨 **`0283`'s daily digest does NOT cover this and is ACTIVELY MISLEADING.** It never touches the
  monitoring stack, never crosses the allowlist, never arrives from the telemetry box's address ⇒ **the
  owner would receive a daily message confirming "the bot works" while alerts were dead.** Worse than no
  heartbeat at all. 🚨 **UPDATED 2026-09-19 — it is no longer a future hazard: `0283` is DEPLOYED and two
  real digests have been watched arriving** ([[tasks/name-change-daily-digest]]). **The misleading daily
  reassurance now exists.**

## Outcome

✅ **Deployed and drilled 2026-09-18 — all owner-executed.** The owner ran both deploys; the lead
verified on the boxes (containers healthy, the alerts bind mount present and `drwx------ root root`, the
new check present in the deployed `checks.sh`, `/health` and `/ready` 200, the probe env file `0600` and
script `0700`, the hourly cron installed).

**First probe, owner-run by hand: exit 0.** ⚠️ That exit code is only meaningful **because of review
finding R3** — before that fix the probe returned 0 for any 2xx, **including the relay's deliberate
accepted-but-dropped reply**. The marker was lead-verified 19 s later, and is stamped **only after the
secret check**, so its existence proves the secret matched. The check flipped to
`OK alert-path-probe … reachability only, NOT proof that a Telegram message arrived` · `RESULT: 11 ok, 0
failed`.

### 🚩 The central assumption was PROVEN — and not by the drill

This brief and the reviewer both recorded that *"no code and no test can establish"* whether the probe's
egress address and a real alert's are the same, and assigned the question to the drill. **The nginx
access log had already recorded both sides.** Lead-read on the box at the webhook route: the host-cron
probe and **four real monitoring-stack calls** (including the fired and resolved events of the 2026-09-17
alert drill) **all arrive from the same source address.**

⇒ **Host cron and the containerised monitoring stack share one egress.** 📌 **How it was found matters as
much as what it says: a read-only log query answered what a destructive drill was scheduled to answer.**

### The drill that ran — REDUCED, owner-ruled, and it PASSED

**Owner ruling 2026-09-18**, live in the lead session: offered full drill / reduced drill / close on the
log evidence alone, the owner chose the **reduced drill** — exercise the alarm path, but **do NOT
deliberately disable the notification channel**. ⛔ Not precedent. The lead reduced it further and said
so: editing the allowlist to prove a `deny all` path **already visible in the logs** would itself risk
creating the silent outage this task exists to prevent.

Owner-executed, in order: marker moved aside → `FAIL alert-path-probe: no alert-path probe marker at all
(max 3h)`, `10 ok, 1 failed`, `ping: /fail delivered` → **the external dead-man's switch paged the owner
by email**, owner-confirmed by screenshot → marker restored → `11 ok, 0 failed`, `ping: success
delivered` → **the incident auto-resolved**, second mail confirmed.

⇒ **Every hop now has evidence:** probe → allowlist → route → secret check → marker → daily check →
dead-man's switch → the owner's inbox.

✅ **The hard close gate was DISCHARGED, not waived.** The owner's ruling that the drill is a hard gate
stands **met**, and the reviewer's accepted objection — *"a guard not yet known to guard"* — no longer
holds: **the guard has been watched to fail, page a human, and recover.**

⚠️ **State exactly what was NOT exercised.** The drill hit the **missing-marker** branch, **not** the
**stale-marker** branch — both end in the same `fail()` and the same ping, so the alarm path is
identical, but **only one of the two ran**. Also **not** exercised: deliberately removing the address from
`PROFILE_INTERNAL_ALLOW_IPS`, and observing a real alert disable the channel — **that remains
binary-disassembly evidence, not observation.**

⚠️ **The marker is `(agent-closed — not owner-verified)` and the record must say what the marker cannot:**
the close was performed by a spawned producer with no owner channel (ADR-033 §5), but **the owner
personally executed every deploy and every drill step and confirmed by screenshot.** ⛔ **The marker is
NOT upgraded** — only an owner-present producer session may do that. **Both facts are true; quoting
either alone misleads.**

### ⚠️ Residuals that SURVIVE this close — all eight

1. **It catches the CAUSE, not the STATE.** An **already-disabled** channel reads green. **Filed as
   `0285`.**
2. It does **not** check the secret the monitoring stack's own **channel config** holds — a separate copy
   from the cron's.
3. It proves **nothing about Telegram delivery** — the marker is written on receipt, **before** any send.
   `0283` is that half. ✅ **UPDATED 2026-09-19 — that half now EXISTS and has been observed delivering**
   ([[tasks/name-change-daily-digest]]). ⛔ **This residual is NOT discharged by it**: the digest proves
   Telegram delivery **from the admin box on its own path**, never that a message sent *through this relay*
   arrives. **The two remain complementary, and neither substitutes for the other.**
4. It does **not** prove any monitor is attached to the channel.
5. It does **not** discharge `0274` amendment A1 (delivery after an idle period) — and ⚠️ **an hourly
   probe may actively MASK an idle-path defect on that hop.**
6. Detection latency **~3–27 h, owner-accepted**.
7. 🔭 **Open and unruled:** `check_cert_expiry` computes no age of its own, so it has no negative-age
   branch to guard — **but it is clock-trusting in a related way**: a box clock running *behind* makes a
   certificate look fresher than it is. Different defect class; **surfaced by the coder, never ruled on.**
8. `npm run check:config-parity` does **not** reach telemetry variables — the hardening harness is the
   only guard there.

🔭 **Recorded so it is not re-litigated:** an **always-firing Uptrace monitor** as the liveness source was
considered and **rejected as primary** because whether 2.0.2 re-notifies a continuously firing alert on a
schedule is **UNVERIFIED** — it could sit there never firing, **the same silent defect it exists to
catch**. Revisit only once that interval is settled by evidence, and even then as an **addition**, not a
replacement for a probe that crosses the allowlist.

## Related

- [[systems/alert-delivery]] — the path this guards, and the operator procedure when the check fails
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the relay this probes; it must exist first
- [[decisions/adr-114-admin-server-alert-relay]] — ruling B, the accepted risk this is the mechanical half of
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`, which added the deploy-time allowlist print
- [[tasks/name-change-daily-digest]] — task `0283`, residual 3's other half: it proves **Telegram** delivery is alive, this proves the **alert path** is reachable. ⚠️ **Neither substitutes for the other, and reading the digest as alerting evidence is the error this task guards against**
- [[systems/telemetry]] — the monitoring box the probe runs on
- [[systems/player-profile-store]] — the admin box holding the relay, the marker and the daily checks
- [[decisions/sprint-4]] — the sprint that owns it
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274`, the source of amendment A1 this probe does **not** discharge, and the owner of the one alert rule that exists
