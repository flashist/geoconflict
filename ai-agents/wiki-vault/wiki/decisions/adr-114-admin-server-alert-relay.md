# ADR-114 — The profile server is this project's admin server; the alert relay lives there

**Date**: 2026-09-17 (amended the same day)
**Status**: accepted

> Project ADR-114 — see [[decisions/adr-numbering-two-series]].
> Source: `ai-agents/knowledge-base/decisions/adr-114-profile-server-is-the-admin-server-alert-relay-lives-there.md`
>
> **Provenance, recorded because it matters:** the owner ruled **placement** live in the lead session;
> the architect did **not** hear the rulings first-hand — both arrived by relay. The egress and Topics
> checks were run by the lead / owner, not the architect. The relay's internal shape (auth carriage,
> dedupe, response ordering, failure handling) was **delegated to the architect**.
>
> ⛔ **No hostnames, IPs, chat ids, topic ids or secrets on this page** — the source area is written under
> that rule and the vault honours it.

## Context

**Owner ruling, verbatim (2026-09-17):**

> *"if we need to add some additional logic to 'pass' messages from Uptrace to Telegram, then this logic
> should be a part of the profile server (aka our ADMIN server), which was planned from the beginning to
> be used in the future for additional admin-related things, if needed (maybe we will rename it in the
> future)."*

🚩 **Naming caution, from the ruling itself: the box may be RENAMED later.** Everywhere here, *"the admin
box"* is the **role**; *"profile"* is only today's spelling of it. Nothing in this decision binds the word
"profile" to the identity of the box.

Alert rules A1–A6 need to reach the owner in a dedicated Telegram topic, and three facts shape every
option: **Telegram blocks Russian IPs** (every VPS here is reg.ru / Moscow, so an owner-controlled egress
proxy is load-bearing, not polish); **Uptrace 2.0.2's webhook channel has no custom-header field**; and
**the relay would reuse a Telegram helper that loses messages silently**. The mechanics are on
[[systems/alert-delivery]].

## Decision

1. **The profile server is this project's admin server.** Admin-side logic that is not game simulation
   and not player-facing gameplay belongs there. This was the box's intended role from the start.
2. **The relay lives on the admin box**, behind the existing `/internal/` boundary — nginx allowlist plus
   the bearer-token check, exactly as every other internal route is mounted.
3. **The relay's secret travels in the webhook's JSON payload** — not a header (2.0.2 has none), not the
   URL (it would land in nginx access logs and the channel config). ⇒ `internalAuth` **cannot** be reused
   as middleware here (it reads the `Authorization` header); only its **constant-time comparison** is
   reused.
   - 🚨 **The original wording *"fail-closed, as that module already is"* was SUPERSEDED the same day**,
     see A2 below. Unqualified "fail-closed" here would have shipped a relay that answers `401` to a bad
     secret.
4. **Respond 2xx immediately, then send.** Uptrace retries any non-2xx, so holding the response open
   while a slow Telegram send completes earns a **duplicate**, not a delay.
5. **`id`-based dedupe is mandatory.** ✅ **Vindicated by the disassembly, with a nuance:** `id` is stable
   across retries, and the plan's content-key contingency is **dead — do not build it**. But it is the
   alert-**event** id, and `created` / `status-changed` / `recurring` are separate events with separate
   ids ⇒ **several messages per alert is correct behaviour. Never describe this as "one message per
   alert."**
6. **The relay handles connection-level failure explicitly** — it must not inherit the fail-silent
   behaviour of the two existing senders. ⛔ **This ADR does not fix that defect; it refuses to inherit
   it.** The defect belongs to `0061`.
7. **Three Telegram topics — Alerts, Feedbacks, Name Changes** (owner).
8. **The feedback sender's move to its topic is deliberately deferred to its own task** — it needs a
   *game* deploy and touches the only Telegram path proven working in production.
9. **Any new box that must reach Telegram needs an allow-list entry on the egress proxy.** The failure
   mode of a missing entry is a **silent refusal to forward after a successful TCP connect**.
10. **Ruling B (2026-09-17): the relay STAYS behind the nginx `/internal/` allowlist**, and the owner
    **knowingly accepts** that a source-IP miss returns `403` and therefore **silently and permanently
    disables the alert channel**. ⚠️ **Prose is not a mitigation** — see A3.

## Consequences

**Positive**

- The admin-server role is now written down, so the next admin-shaped feature has a home and does not
  re-open this argument.
- The relay reuses a **reviewed** trust boundary rather than inventing one.
- Alerts and name changes reach their topics on a **profile deploy** — no game deploy, no risk to the
  live feedback path.
- The egress gate's shape is recorded, **including its silent-refusal failure mode**.

**Negative / accepted**

- The relay sits on a box that A1–A6 monitor. The residual is **accepted, not eliminated** (see below).
- 🚨 **A change to the telemetry box's egress address silently and permanently kills this channel**, with
  `403` at nginx and no signal on our side. Accepted by the owner. **The only guard that closes the loop
  was not built by this ADR** — it is [[tasks/alert-path-liveness-probe]] (`0284`), since shipped.
- The secret's exposure is **worse than this ADR first recorded** — see A5.
- `internalAuth` is reused only as a comparison, so the relay route's auth is **one more place** a
  fail-closed check must be right.
- Feedback continues to arrive in **General** until its own task lands.
- The fail-silent `ProxyAgent` defect **remains live in both existing senders**.
- **ADR-113, ADR-103, ADR-101: unchanged.** This decision adds no route that accepts a player id and
  changes no trust seam.

### The one axis the game box won on, and its resolution

The game server was genuinely preferred on exactly one axis: **its failure is uncorrelated with what
A1–A6 watch**, and every one of A1–A6 watches the admin box. Resolution:

- A **fully-down** admin box emits no metrics, so no rule fires **wherever the relay lives** — that case
  is the dead-man's-switch ping's, not relay placement's.
- The relay path **touches no database**, and A3/A4/A5 fire on **DB-shaped degradations**.
- Uptrace retries and dedupe is mandatory, so a transient stall becomes a **delayed single delivery**.

**Honest residual, stated rather than argued away:** a **sustained event-loop saturation lasting more
than ~26 hours** (the now-known retry budget) coinciding with A1–A6 firing loses the alert. A box
saturated that long has a far louder problem, and the daily ping would have fired within ~24 h. **Still
accepted, still not eliminated — but narrow rather than open-ended.**

### The architect's first recommendation, withdrawn

An ADR that hides a reversal is worth less than one that shows it: **the architect initially recommended
the game server** and built a seven-point table of objections to the profile box. **Every one of those
objections was an objection to the *game* box, and each is already solved on the admin box** — the
reviewed `/internal/` allowlist, `internalAuth`, three existing rate limiters, a wired Telegram sender,
not the cluster primary, no new call site, and egress now proven. **The table was correct about the game
box and wrong as an argument about the admin box.**

### Options rejected

- **A receiver on the egress proxy host** — **strictly better on resilience** (independent of all three
  Russian boxes, on the only proven egress path). Rejected on **operability**, honestly: no deploy
  pipeline in this repo, outside the config-parity checker's three pipelines, no shell-harness gate, an
  undocumented fourth box. ⚠️ **This stays the LIVE FALLBACK** — it becomes right if the admin box's
  availability costs real alerts, if the residual above is observed, or if that host acquires a pipeline
  and coverage here.
- **Uptrace sends Telegram directly** — it appears unable to target a forum topic (⚠️ strong but
  **unverified**; the notifier was not decompiled), and would inherit no dedupe control.
- **Route alerts via the external monitoring service** — a second alerting vendor for the same signals.
- **A hosted Alertmanager** — another hosted dependency and another egress path to prove.

## Amendment 1 — 2026-09-17

**Trigger:** the architect **disassembled** the deployed Uptrace 2.0.2 binary (DWARF symbols and type
information, not string-grepping). Several unverified things became verified, and **one of them exposed a
design flaw that would have shipped**. ⚠️ **No box was touched to produce the amendment.**

| Item | Status after the amendment |
|---|---|
| Decision 3 — *"fail-closed, as that module already is"* | 🚨 **superseded** (A2) |
| No custom-header field (UI-bundle evidence) | ⬆️ **upgraded to verified** — binary evidence |
| Decision 5 — `id` dedupe | ✅ **vindicated**, with the several-events nuance |
| Custom payload shape | ✅ **now known: merged, nested under `payload`** |
| Retry budget — *"unverified"* | ⬆️ **~26 h, strongly indicated**; the residual narrows accordingly |
| Secret visible to config viewers | ⬆️ **widened — it is PERSISTED, not merely displayed** (A5) |
| Decision 2 — mounted behind the allowlist | ✅ **confirmed by Ruling B**, with an accepted risk (A3) |

### A2 — Ruling A: the response contract

**Owner ruling, accepted as recommended:** *never return 401, 403 or 404 from the relay.* A bad or
missing secret ⇒ **200**, drop, alarm by a path that does not depend on Uptrace. A transient internal
failure ⇒ **5xx**.

> 🔑 **The relay is fail-closed on *delivery*. The relay is never fail-closed on the *HTTP status*.**
> A bad secret delivers nothing — absolute. A bad secret still answers 200 — because **the status code is
> not a verdict we render, it is an instruction Uptrace obeys.**

**Why the intuitive design is wrong:** *"bad secret ⇒ 401"* reads as correct security engineering and is
the opposite here. A wrong secret is a **configuration** error — wrong on retry 2 and on retry 32. A 401
buys **32 retries over ~26 hours per alert**, each re-persisting the wrong secret into Uptrace's
notification history, and the event is dropped anyway. **404 is worse still**: indistinguishable, from
Uptrace's side, from the route not existing.

**Constraint added:** 🚫 **the relay must never echo any request content in its response body.** Responses
are fixed constants.

**Not in scope of "never 404":** Express's own router returning 404 for a path that does not exist (the
mis-cased `/INTERNAL/…` sweep of `0276`) is **not the relay answering** — that test is correct and stays.
Likewise nginx's 403 is **nginx**, not the relay.

### A3 — Ruling B: the allowlist stays, and what actually guards it

**Owner, verbatim:** *"#2 — but save information about it somewhere in the docs, that if IPs change we
need to take care of it."*

> 🚨 **A prose warning is not a mitigation for a silent, permanent, irreversible failure.** The owner
> asked for documentation; documentation alone leaves this risk at full size.

- **`profile-checks.sh` cannot assert the allowlist** — a value compared with itself. **Rejected.**
- **`setup-profile.sh` already prints the allowlist at deploy — free, and already insufficient**
  (visible only to a human watching a deploy, and it prints the *configured* value). **Do not build it;
  it exists.** One cheap improvement was made: the report is now **loud when the list is empty**, since
  blank renders a bare `deny all`.
- 🚨 **`0283`'s daily digest does NOT cover this, and is ACTIVELY MISLEADING** — it never involves
  Uptrace, never crosses nginx, never arrives from the monitoring box's address. **A daily message
  visibly arriving is active false reassurance.** 🚨 **UPDATED 2026-09-19 — that reassurance is now REAL
  and ARRIVING: `0283` is deployed and two digests have been watched land** ([[tasks/name-change-daily-digest]]).
  ⛔ **A3's discipline is therefore live, not anticipatory.**
- **A disabled channel IS detectable from our side — and nothing reads the evidence.** Uptrace persists
  every attempt's response status; a run of `403`s sits there. **Same shape as `0219`.**
- ✅ **The recommendation — a synthetic probe from the telemetry box plus a marker-age check — is what
  `0284` built and shipped.**

⚠️ **Alternative considered and rejected as primary:** an **always-firing Uptrace monitor** instead of a
cron probe. Strictly stronger in one respect (it would also prove Uptrace's own notifier is wired), but
**whether 2.0.2 re-notifies a continuously firing alert on a schedule is UNVERIFIED and its period was
never established** — a guard built on an unverified re-fire interval could sit there never firing,
**the same class of silent defect it was built to catch.**

### A5 — The secret exposure is worse than first recorded (verified)

Uptrace persists into its notification history in ClickHouse, **per delivery attempt**: **the full
outbound JSON body — secret included** — and **the first 100 bytes of the relay's response body**. So the
secret is **written into a queryable datastore once per attempt**, not merely displayed in a config form.

- 🚫 The relay must never echo anything from the request (restated in A2).
- **Rotating this secret means the old value survives** in notification history until it ages out.
  **Rotation is not erasure.**
- **A 401-on-bad-secret design would have multiplied this by 32** — a second, independent reason Ruling A
  is right.

**Scope, so this is not read as alarm:** the telemetry box is ours, in the same residency, and the history
is not public. The exposure is **internal and durable**, not external.

## Re-raise only if

- **The admin box is renamed or re-scoped** — the role moves with the role, not the word "profile".
- **The egress proxy changes, or the source-IP allow-list approach is abandoned.**
- **Uptrace gains a custom-header field, or surfaces `message_thread_id`** — then the payload-carried
  secret and the reason for rejecting direct send both dissolve.
- **The relay's availability becomes a real problem in practice** — then the egress-proxy receiver.
- **`0033`'s external heartbeat lands.**
- **A second Telegram call site is added without explicit connection-failure handling** — a defect
  against Decision 6, not a new finding.
- **Uptrace is upgraded past 2.0.2** — every verified fact in A4 binds to *that* binary.
- **The telemetry box's egress address changes, or the box is rebuilt/migrated** — re-check the allowlist
  **in the same change**, not afterwards.

⛔ Absent those, *"why not the game server"*, *"the relay is on the box it monitors"*, *"why is the secret
in the payload"*, *"why is feedback still in General"*, and any proposal to **return 401/403/404 from the
relay**, are **closeout of this ADR, not new findings**. And ⛔ **citing `0283`'s daily digest as evidence
that alerting works is not a finding either — it is the error A3 exists to prevent.**

## Related

- [[systems/alert-delivery]] — the mechanics, the traps and the operator procedures
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, the relay this ADR places
- [[tasks/alert-path-liveness-probe]] — task `0284`, the guard on this ADR's accepted risk
- [[tasks/name-change-daily-digest]] — task `0283`, the digest A3 names: ⛔ **citing it as evidence that alerting works is the error A3 exists to prevent** — and since 2026-09-19 it is genuinely arriving
- [[decisions/adr-103-identity-trust-seam]] · [[decisions/adr-101-fail-soft-xp-crediting]] — both **unchanged** by this decision
- [[systems/player-profile-store]] — the admin box itself
- [[decisions/adr-numbering-two-series]]
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`, the case-insensitive `/internal/` allowlist this decision relies on
- [[decisions/sprint-4]] — the sprint this decision was ruled inside
- [[systems/architecture-overview]] — the tier map this re-labels
- [[systems/telemetry]] — the monitoring stack whose alerts this routes
- [[decisions/adr-113-internal-player-id]] — **unchanged** by this decision; its monitoring slice is what the alert rules serve
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274`, that monitoring slice: the metrics, the one built rule (A5), and the drill that proved this relay end to end
