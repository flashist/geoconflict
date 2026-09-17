# ADR-114: The profile server is this project's admin server; the Uptrace→Telegram alert relay lives there

- **Status:** ✅ **accepted** — owner-ruled **2026-09-17**. ⚠️ **Amended 2026-09-17 — see
  [Amendment 1](#amendment-1--2026-09-17).** The amendment **supersedes Decision 3's "fail-closed"
  wording**, upgrades three claims from unverified to verified, and widens one consequence. Original
  text below is left standing so the change is visible; superseded passages are marked in place.
- **Date:** 2026-09-17 (amended same day)
- **Deciders:** Owner (Mark Dolbyrev).
  - **Owner ruling, verbatim** (2026-09-17, given live in the lead session, relayed to the architect):

    > *"if we need to add some additional logic to 'pass' messages from Uptrace to Telegram, then this
    > logic should be a part of the profile server (aka our ADMIN server), which was planned from the
    > beginning to be used in the future for additional admin-related things, if needed (maybe we will
    > rename it in the future)."*

    This is **owner authority over placement**, not a producer or architect preference. The architect's
    own first recommendation was the opposite (see *Options considered*), and was withdrawn.
  - **Owner ruling, same day:** three Telegram topics — **Alerts**, **Feedbacks**, **Name Changes** —
    with the feedback move **deferred to its own task**.
  - **Delegated to the architect:** the relay's internal shape (auth carriage, dedupe, response
    ordering, failure handling).
- **Provenance:** the architect did not hear the rulings first-hand; both arrived by relay from the lead
  session. The egress and Topics checks below were run by the lead / owner, not by the architect.
- **Citation frame:** content anchors (per
  [`../conventions/file-line-citations.md`](../conventions/file-line-citations.md)); re-derived by
  opening each file on **2026-09-17**, working tree on `dev` at `332f520`. ⚠️ `src/profile-server/**`,
  `src/server/**`, `src/client/**` and `setup-profile.sh` are **dirty in the working tree** at that
  commit, so these anchors are against the tree as it stands today, not against `332f520` alone.
- **Naming caution, from the ruling itself:** the box may be **renamed** later. Everywhere below,
  "the admin box" is the role; *"profile"* is only today's spelling of it. Nothing in this decision
  should be read as binding the word "profile" to the identity of the box.

## Context

Uptrace alert rules A1–A6 need to reach the owner in Telegram, in a dedicated topic. Three facts shape
every option:

1. **Telegram blocks Russian IPs.** Every VPS in this project is reg.ru / Moscow. The project's answer is
   an **HTTP egress proxy the owner controls**, and that proxy **gates by source IP at its own
   application layer** — not at the network layer. This is already load-bearing in code and is documented
   as such: `src/core/notifications/TelegramNotifier.ts` header — *"TELEGRAM_PROXY_URL is load-bearing,
   not optional polish: api.telegram.org is blocked from Russian IPs, and every VPS in this project is
   reg.ru / Moscow."*, and the same warning at `src/profile-server/Server.ts` (*"TELEGRAM_PROXY_URL is
   load-bearing, not optional"*).
2. **Uptrace 2.0.2's webhook channel has no custom-header field.** Read from the shipped UI bundle on the
   telemetry box: the channel form offers channel name, webhook URL, an optional JSON payload, monitors,
   and condition — nothing else. **Version-specific external claim**, true of the deployed 2.0.2 build.
   ⚠️ **Amended 2026-09-17 — upgraded from UI-bundle evidence to binary evidence; now VERIFIED. See
   [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified).**
3. **The relay would reuse an existing Telegram helper that loses messages silently** — see the defect
   section below.

**Measured on 2026-09-17, by the owner and the lead, read-only:**

- The owner added the **admin box's egress address** to the proxy's allow list. From that box:
  a direct request to Telegram **failed, as expected**; the same request **through the proxy returned a
  real HTTP status**; and the Bot API path also returned a real status. **Before** that allow-list change,
  the box could open a **TCP connection** to the proxy but the proxy **refused to forward** — i.e. the
  gate is at the proxy application layer, and a connect test proves nothing.
- Enabling forum **Topics** on the real operator group did **not** break the existing feedback sender:
  with Topics on, a message sent with **no thread id** arrived in the **General** topic. This is what
  makes adding an optional `threadId` safe and additive rather than a migration.

### 🚩 A defect discovered the same day, which this design must not inherit

**Both existing Telegram senders hold one process-lifetime proxy connection pool and neither retries.**

- `src/server/Master.ts` constructs **one module-level** `const telegramProxyAgent = TELEGRAM_PROXY_URL ?
  new ProxyAgent(TELEGRAM_PROXY_URL) : undefined;` and passes it as `dispatcher:` to both inline sends
  (the feedback route and the subscribe route). Each is a single `fetch` in a `try`/`catch`; the catch
  **logs and continues** (`log.error(\`[feedback] telegram delivery failed: …\`)`). No retry.
- `src/core/notifications/TelegramNotifier.ts` does the same, keyed by URL —
  `const proxyAgents = new Map<string, ProxyAgent>();` / `function proxyAgentFor(proxyUrl: string)` —
  and its `catch` returns the value `"network_error"`. No retry. Its own comment states the reuse is
  deliberate: *"ONE dispatcher per proxy URL, created lazily and reused for the life of the process."*

**Consequence:** when the pooled keep-alive connection dies — proxy restart, idle timeout, NAT timeout —
the next send fails at the network layer with `TypeError: fetch failed`, the caller logs it, and the
message is **lost silently**. Nothing retries and nothing surfaces.

**Reproduced in production by accident on 2026-09-17:** feedback was arriving; the owner restarted the
proxy; the very next feedback failed with that exact error **while the player still received a `200`**;
the following one succeeded. **Topics were not enabled at the time**, so Topics is excluded as a variable.

This is the **likely root cause** of the standing `0061` investigation
(`ai-agents/tasks/backlog/0061-investigate-prod-telegram-feedback-delivery-failure/`), and is recorded
there — and here — as a **hypothesis reproduced behaviourally, not yet confirmed in code**. It is
**unverified** as the mechanism.

**Why it matters to *this* ADR:** the alert relay would use that same helper, and would therefore inherit
**fail-silent delivery** — an alert dropped by a stale socket that nobody ever learns about. That is the
precise failure alerting exists to prevent.

## Decision

1. **The profile server is this project's admin server.** Admin-side logic that is not game simulation
   and not player-facing gameplay belongs on that box. This is the owner's ruling, quoted verbatim above,
   and it was the box's intended role from the start.
2. **The Uptrace→Telegram alert relay lives on the admin box**, behind the existing internal boundary —
   the nginx `/internal/` allowlist plus the bearer-token check, exactly as every other internal route is
   mounted (`src/profile-server/Routes.ts`: `app.post("/internal/v1/players/resolve", internalAuth, …)`,
   `app.post("/internal/v1/credit", internalAuth, …)`, `app.post("/internal/v1/messages/send",
   internalAuth, …)`).
3. **The relay's secret travels in the webhook's JSON payload** — not in a header, and **not in the URL**.
   Uptrace 2.0.2 offers no custom-header field (Context §2), and a URL secret would land in nginx access
   logs and be displayed in the Uptrace channel configuration.
   - **Therefore `internalAuth` cannot be reused as middleware here** — it reads the request's
     `Authorization` header. Only its **comparison** is reused: the constant-time check in
     `src/profile-server/InternalAuth.ts` (`timingSafeEqual(Buffer.from(provided), Buffer.from(expected))`,
     guarded by the length check above it because *"timingSafeEqual throws on length mismatch — guard
     first"*). ~~Fail-closed, as that module already is.~~
   - 🚨 **SUPERSEDED 2026-09-17 by [A2](#a2-ruling-a--the-response-contract-supersedes-decision-3s-fail-closed-wording).**
     "Fail-closed" without qualification is **wrong here** and would have shipped a relay that answers
     `401` to a bad secret. The relay is fail-closed on **delivery** and must **never** be fail-closed on
     the **HTTP status**. Read A2 before implementing this decision.
4. **Respond 2xx immediately, then send.** Uptrace retries any non-2xx, so holding the HTTP response open
   while a slow Telegram send completes earns a **duplicate**, not a delay.
5. **`id`-based dedupe is mandatory**, for the same reason: Uptrace retries, so the relay must treat a
   repeated alert `id` as already delivered.
   - ✅ **Amended 2026-09-17 — VINDICATED, with a nuance.** `id` is **stable across retries** (verified,
     [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified)). The plan's content-key
     contingency is **dead — do not build it.** Nuance: it is the **alert-event** id, and `created`,
     `status-changed` and `recurring` are **separate events with separate ids**. So dedupe-on-`id`
     suppresses **retries of one event**, not multiple events about one alert. **Never describe this as
     "one message per alert"** — several messages per alert is correct behaviour, not a dedupe failure.
6. **The relay handles connection-level failure explicitly.** It must not inherit the fail-silent
   behaviour documented above: a network-layer failure must be retried on a fresh connection and, if it
   still fails, must be made visible rather than only logged. **The defect in the two existing senders is
   not fixed by this ADR** — it is recorded here and belongs to `0061`.
7. **Three Telegram topics — Alerts, Feedbacks, Name Changes** (owner). Alerts and name-change
   notifications gain a `threadId` and ship with a **profile deploy**.
8. **The feedback sender's move to its topic is deliberately deferred to its own task.** It needs a
   **game deploy** and it touches the **only Telegram path proven working in production**. `0033` stays
   untouched. Until that task lands, feedback arrives in **General** — which the Topics check above
   proved is a working destination, not a breakage.
9. **Any new box that must reach Telegram needs an allow-list entry on the egress proxy.** The failure
   mode of a missing entry is a **silent refusal to forward** after a successful TCP connect — no error
   anyone sees, and a connectivity check that only opens a socket will report success.
10. **Added 2026-09-17 (Ruling B).** The relay **stays mounted behind the nginx `/internal/` allowlist**,
    and the owner **knowingly accepts** that a source-IP miss returns `403` and therefore **silently and
    permanently disables the alert channel**. ⚠️ **Prose is not a mitigation** — read
    [A3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it) for the guard analysis, what is
    already true for free, what does **not** cover this, and the one guard that closes the loop.

### What this channel does NOT cover

Say plainly, so nobody assumes otherwise:

- **Game-box liveness.** Nothing here watches the game server.
- **Total admin-box failure.** A fully-down admin box emits no metrics, so no rule fires and no relay runs
  — wherever the relay lives.

Those two belong to the **daily dead-man's-switch ping** (which covers the **admin box only**) and to
`0033`'s **external heartbeat, which is not built**
(`ai-agents/tasks/backlog/0033-monitoring-alert-bot-phase1/brief.md`).

## Options considered

### Relay on the game server — **the architect's first recommendation, withdrawn**

An ADR that hides a reversal is worth less than one that shows it, so: the architect initially
recommended the game server, and built a seven-point table of objections against putting a relay on the
profile box. **Every one of those objections was an objection to the *game* box specifically, and each is
already solved on the admin box:**

| Objection raised against a relay | Status on the admin box |
|---|---|
| No IP-level trust boundary for an internal endpoint | **Solved** — reviewed nginx `/internal/` allowlist exists (`setup-profile.sh`, `location ~* ^/internal/`, case-insensitive since `0276`) |
| Auth would have to be invented | **Solved** — `internalAuth` is a fail-closed `timingSafeEqual` on a shared secret (`src/profile-server/InternalAuth.ts`) |
| No rate limiting | **Solved** — three per-route limiters already exist: `profileReadLimiter`, `paymentsLimiter`, `nameChangeLimiter` (`src/profile-server/Routes.ts`) |
| A Telegram sender would have to be wired | **Solved** — already wired: `src/profile-server/Server.ts` builds the `TelegramConfig`; `src/profile-server/NameChangeRepository.ts` calls `sendTelegramMessage` |
| Would sit on the cluster primary | **Not applicable** — the admin box is not the cluster primary |
| Would add a fourth Telegram call site | **No** — it reuses the existing helper (call-site count unchanged) |
| Egress to Telegram unproven from that box | **Now proven** — measured 2026-09-17 (Context) |

The withdrawal is honest, not diplomatic: the table was **correct about the game box** and **wrong as an
argument about the admin box**, and the owner's ruling made the distinction explicit.

### The correlated-failure trade — the one axis the game box won on, and its resolution

The game server was genuinely preferred on exactly one axis: **its failure is uncorrelated with what
A1–A6 watch**, and every one of A1–A6 watches the admin box. Putting the relay on the box being monitored
means a sick box may be unable to report that it is sick.

Resolution, point by point:

- **A fully-down admin box emits no metrics, so no rule fires at all** — wherever the relay lives. This
  case is not covered by relay placement in either design; it is covered by the **independent daily
  dead-man's-switch ping**.
- **The relay path touches no database.** A3/A4/A5 fire on **DB-shaped degradations** — exactly the
  failures that do not block an HTTP receive, a dedupe check, and an outbound send.
- **Uptrace retries, and the `id` dedupe is mandatory**, so a transient stall becomes a **delayed single
  delivery**, not a lost or duplicated one.

**Honest residual, stated rather than argued away:** a **sustained event-loop saturation** on the admin
box that **outlasts Uptrace's retry budget**, at the same time as those rules fire, loses the alert. ~~That
retry budget is **unverified** — it has not been read out of Uptrace 2.0.2 or measured.~~

⬇️ **Amended 2026-09-17 — the budget is now known and this residual shrinks accordingly.** The retry
budget is **~26 hours** (**strongly indicated**; see [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified)).
The residual therefore requires a **continuous event-loop saturation lasting more than 26 hours**,
coinciding with A1–A6 firing. A box saturated that long has a far louder problem than a missed alert, and
the daily dead-man's-switch ping would have fired within ~24 h. **Still accepted, still not eliminated —
but it is now a narrow case rather than an open-ended one.**

### A receiver on the egress proxy host — **rejected for now, kept as the live fallback**

**Strictly better on resilience:** it is independent of all three Russian boxes and sits on the **only
proven egress path**. Rejected on **operability**, honestly and not as a strawman:

- no deploy pipeline for it in this repo (the repo's pipelines are `build-deploy.sh`,
  `build-deploy-profile.sh`, `build-deploy-telemetry.sh`);
- **outside the config-parity checker's pipelines** — `scripts/check-config-parity.mjs` partitions by
  `const PIPELINES = ["game", "profile", "client"];`, so a fourth host's config drift is checked by
  nothing;
- no shell-harness gate (the harness list in `tests/scripts/ShellHarnesses.test.ts` is hardcoded);
- an **undocumented fourth box** to run, patch and remember.

**This stays the live fallback.** It becomes the right answer if: the admin box's availability turns out
to cost real alerts in practice; **or** the relay's residual failure mode above is observed; **or** the
proxy host acquires a deploy pipeline and parity/harness coverage in this repo, which removes the entire
operability objection.

### Uptrace sends Telegram directly — rejected

Uptrace has a Telegram channel, but it **appears unable to target a forum topic**: the vendored library
supports `message_thread_id` and Uptrace does not surface it. ⚠️ **Strong but not conclusive, and marked
unverified** — read from the shipped binary; the notifier was **not decompiled**. It is the reason the
direct-send option cannot satisfy the three-topics requirement. It would also inherit no dedupe control
and no explicit connection-failure handling.

### Route alerts via the external monitoring service — rejected

It would add a second alerting vendor for the same signals, with its own rules to keep in sync with
Uptrace's A1–A6, and no path to the three-topic layout the owner ruled.

### A hosted Alertmanager — rejected

Another hosted dependency and another egress path to prove, to solve a routing problem that is one
endpoint on a box we already run, deploy and test.

## Consequences

- **Positive:**
  - the admin-server role is now written down, so the next admin-shaped feature has a home and does not
    re-open this argument;
  - the relay reuses a **reviewed** trust boundary (nginx allowlist + fail-closed token compare) rather
    than inventing one;
  - alerts and name changes reach their topics on a **profile deploy** — no game deploy, no risk to the
    live feedback path;
  - the egress gate's shape is recorded, including its silent-refusal failure mode.
- **Negative / accepted:**
  - the relay sits on a box that A1–A6 monitor; the residual failure mode above is **accepted, not
    eliminated**, and ~~its retry budget is **unverified**~~ → **amended 2026-09-17: the budget is ~26 h
    (strongly indicated), so the residual now needs a >26 h continuous saturation**;
  - ~~the relay's secret lives in the Uptrace channel's JSON payload, so it is visible to anyone with
    Uptrace channel-config access;~~ ⬆️ **amended 2026-09-17 — the exposure is WORSE than this line
    says; see [A5](#a5-the-secret-exposure-is-worse-than-this-adr-recorded-verified);**
  - **added 2026-09-17 (Ruling B):** a change to the telemetry box's egress address **silently and
    permanently kills this channel**, with `403` at nginx and no signal on our side. Accepted by the
    owner. The only guard that closes the loop is **not built** — [A3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it);
  - `internalAuth` is reused only as a comparison, so the relay route's auth is **one more place** where
    a fail-closed check must be right;
  - feedback continues to arrive in **General** until its own task lands;
  - the fail-silent `ProxyAgent` defect **remains live in both existing senders** — this ADR only refuses
    to inherit it.
- **ADR-113, ADR-103, ADR-101:** unchanged. This decision adds no route that accepts a player id and
  changes no trust seam.

### Re-raise only if

- **The admin box is renamed or re-scoped** — then the role in this ADR moves with the role, not with the
  word "profile".
- **The egress proxy changes, or the source-IP allow-list approach is abandoned** — the whole placement
  argument rests on proven egress from that box.
- **Uptrace gains a custom-header field, or surfaces `message_thread_id`** — then the payload-carried
  secret (Decision 3) and the reason for rejecting direct send both dissolve.
- **The relay's availability becomes a real problem in practice** — an alert observed lost to the
  residual failure mode. Then the egress-proxy receiver is the fallback, already argued above.
- **`0033`'s external heartbeat lands** — it changes what this channel must cover, and may absorb the
  dead-man's-switch ping.
- **A second Telegram call site is added without explicit connection-failure handling** — that is a defect
  against Decision 6, not a new finding.
- **Added by Amendment 1, 2026-09-17:**
  - **Uptrace is upgraded past 2.0.2** — every verified fact in [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified)
    is read out of *that* binary and binds to *that* build. A version bump re-opens all of them.
  - **The telemetry box's egress address changes, or the box is rebuilt/migrated** — that is the exact
    accepted risk in [A3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it). Re-check the
    allowlist **in the same change**, not afterwards.
  - **Anyone proposes returning 401/403/404 from the relay** — settled by [A2](#a2-ruling-a--the-response-contract-supersedes-decision-3s-fail-closed-wording),
    owner-ruled. It is closeout, not a finding.
  - **Someone cites `0283`'s daily digest as evidence that alerting works** — it is not; see
    [A3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it).

Absent those, *"why not the game server"*, *"the relay is on the box it monitors"*, *"why is the secret in
the payload"* and *"why is feedback still in General"* are **closeout of this ADR, not new findings**.

## Amendment 1 — 2026-09-17

- **Trigger:** the architect disassembled the deployed Uptrace 2.0.2 binary (DWARF symbols and type
  information, not string-grepping) and read the webhook notifier's actual behaviour. Several things this
  ADR recorded as unverified are now verified; **one of them exposed a design flaw that would have
  shipped.** The owner ruled on it the same day, live in the lead session.
- **Evidence classes used below**, per this ADR's own convention: **verified** = read out of the deployed
  binary's code/types, or out of a repository file opened on 2026-09-17; **strongly indicated** = read out
  of the binary's configuration constants but not observed running; **unverified** = neither.
- **Provenance:** the disassembly is the architect's own first-hand work. Rulings A and B arrived **by
  relay** from the lead session and were **not** heard first-hand, exactly as the original decisions were.
- ⚠️ **No box was touched to produce this amendment.** The profile box is live and a build was in flight.

### A1. What changed, in one table

| Item in the ADR above | Status after this amendment |
|---|---|
| Decision 3 — *"Fail-closed, as that module already is"* | 🚨 **superseded** — [A2](#a2-ruling-a--the-response-contract-supersedes-decision-3s-fail-closed-wording) |
| Context §2 — no custom-header field (UI-bundle evidence) | ⬆️ **upgraded to verified** — binary evidence — [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified) |
| Decision 5 — `id`-based dedupe | ✅ **vindicated**, with a nuance — [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified) |
| Custom payload shape (assumed unknown) | ✅ **now known: merged, nested** — [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified) |
| Retry budget — *"unverified"* | ⬆️ **~26 h, strongly indicated**; residual narrowed — [A4](#a4-the-webhook-contract-is-now-read-out-of-the-binary-verified) |
| Consequence — secret visible to Uptrace config viewers | ⬆️ **widened — it is persisted, not merely displayed** — [A5](#a5-the-secret-exposure-is-worse-than-this-adr-recorded-verified) |
| Decision 2 — mounted behind the nginx allowlist | ✅ **confirmed by Ruling B**, with an accepted risk and a guard analysis — [A3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it) |

### A2. Ruling A — the response contract (supersedes Decision 3's "fail-closed" wording)

**Owner ruling, 2026-09-17, accepted as recommended:**

> **Never return 401, 403 or 404 from the relay.** A bad or missing secret ⇒ answer **200**, **drop** the
> message, and raise an alarm by a path that does not depend on Uptrace. A transient internal failure ⇒
> **5xx**, so Uptrace's ~26-hour retry budget works for us.

**The distinction that is the whole lesson — write it this way or not at all:**

> 🔑 **The relay is fail-closed on *delivery*. The relay is never fail-closed on the *HTTP status*.**
>
> A bad secret **delivers nothing** — that is the fail-closed part, and it is absolute.
> A bad secret still **answers 200** — because the status code is **not a verdict we render, it is an
> instruction Uptrace obeys.** Uptrace treats any non-2xx as "retry me", and only 2xx as done.

**Why the intuitive design is wrong.** "Bad secret ⇒ 401" reads as correct security engineering and is the
opposite here. A wrong secret is a **configuration** error: it will be wrong on retry 2 and on retry 32.
Answering 401 therefore buys exactly one thing — **32 retries over ~26 hours per alert**, each one
re-persisting the wrong secret into Uptrace's notification history ([A5](#a5-the-secret-exposure-is-worse-than-this-adr-recorded-verified)) —
and then the event is dropped anyway. The retry budget is a **scarce resource that exists to survive
transient failure**; spending it on an error that cannot resolve itself is spending it on nothing.
**404 is worse still**: it is indistinguishable, from Uptrace's side, from the route not existing.

**What the status codes are for, then:** 2xx = *"stop retrying, I have taken responsibility for this
event"* (whether or not it was delivered). Non-2xx = *"try again, this might work next time."* Nothing
else. Any rule that assigns a status for a reason other than "should Uptrace retry?" is a bug.

**Where the alarm goes instead.** A dropped message must still be loud, by a path that **does not depend
on Uptrace** (Uptrace is the thing that is misconfigured). Telegram is reachable directly from this box
and is not Uptrace — so: a metric, a log line, **and** a heavily rate-limited notice to the Alerts topic
naming the **variable**, never any value. See the response-contract table returned to `0277`'s driver.

**Constraint added by this ruling:** 🚫 **the relay must never echo any request content in its response
body** — not the secret, not the id, not the rule title, not an exception message. Responses are fixed
constants. Reason in [A5](#a5-the-secret-exposure-is-worse-than-this-adr-recorded-verified).

**Not in scope of "never 404":** Express's own router returning `404` for a path that does not exist —
e.g. the mis-cased `/INTERNAL/...` sweep — is **not the relay answering**. That test is still correct and
must stay. Likewise nginx's `403` for a source-IP miss is **nginx**, not the relay; that one is
[A3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it)'s accepted risk.

### A3. Ruling B — the allowlist stays, and what actually guards it

**Owner ruling, verbatim:**

> *"#2 — but save information about it somewhere in the docs, that if IPs change we need to take care of it."*

So the relay **stays behind `location ~* ^/internal/`**, keeping defence in depth, and the owner knowingly
accepts the failure mode below.

**The accepted risk, stated without softening.** If the telemetry box's egress address changes — a
rebuild, a migration, a provider re-assignment — nginx answers **403**. Uptrace retries for ~26 hours,
gives up, and **A1–A6 stop reaching Telegram forever.** There is **no error on our side, no log we read,
no message that fails to arrive that anyone would notice** — the normal state of an alert channel is
silence, so a dead channel and a healthy quiet system look **identical**.

> 🚨 **A prose warning is not a mitigation for a silent, permanent, irreversible failure.** The owner
> asked for documentation; documentation alone leaves this risk at full size. What follows is the
> architect's ruling on what mechanically guards it — including the parts that **do not**.

**A3.1 — Can `profile-checks.sh` assert the allowlist still contains the telemetry box's address?**
**No — and this is the answer a reader will guess wrong.** *(verified by reading `profile-checks.sh` and
`setup-profile.sh` on 2026-09-17.)*
`profile-checks.sh` runs **on the admin box**. It can grep the deployed nginx config for the `allow`
directives — but the only value it could compare them against is the one `setup-profile.sh` wrote from
`PROFILE_INTERNAL_ALLOW_IPS` in the same deploy. **That is a value compared with itself.** It would catch
a hand-edit of the on-box config, which is not the failure mode, and would report a confident `OK` while
the telemetry box's real address had moved. **A guard that cannot fail for the reason you built it is
worse than no guard** — it converts an unknown risk into a believed-covered one. Reaching across to the
telemetry box to ask its current address would need admin-box→telemetry-box credentials: a new trust edge
for a monitoring convenience. **Rejected.**

**A3.2 — Does `setup-profile.sh`'s value report surface the allowlist at deploy time?**
**Yes, already — free, and already insufficient.** *(verified: `setup-profile.sh` prints
`/internal/ nginx allowlist laid down (dormant, case-insensitive ~* since 0276): allow <entries> + deny all.`
in its completion report.)* **Do not build this; it exists.** Its limits are structural: it is visible only
to a human watching a deploy, only at deploy time, and it prints the **configured** value — never whether
that value still matches the telemetry box. Between deploys it guards nothing. One cheap improvement is
worth making inside `0277`: make the report **loud when the list is empty**, since blank renders as
`deny all` and disables every internal route including this one.

**A3.3 — Does `0283`'s owner-ruled daily zero-count heartbeat cover this? NO.**
*(verified by reading `0283`'s brief on 2026-09-17.)* **State this plainly, because it is exactly what a
reader will assume covers them.** `0283`'s digest is produced **on the admin box** (cron or in-process
timer) and sent **straight out** through the shared Telegram helper. Its path is *admin box → egress proxy
→ Telegram*. It **never involves Uptrace, never crosses nginx, and never arrives from the telemetry box's
source address.**

| `0283`'s daily digest proves | `0283`'s daily digest does **not** prove |
|---|---|
| the admin box is alive and its timer runs | that Uptrace can reach the relay |
| the egress proxy forwards, the bot token works | that the nginx allowlist still matches the telemetry box |
| Telegram topic routing works | that the relay route exists, or that its secret matches |

> ⚠️ **It is worse than "does not cover".** A daily message visibly arriving in Telegram is **active false
> reassurance**: the owner sees the bot working every single day while the alert channel is dead.
> **`0283` arriving is not evidence that alerting works.**

**A3.4 — Can a disabled channel be detected from our side at all?**
**Yes — the evidence exists, and nothing reads it.** Uptrace persists every delivery attempt, including
the response status, into its notification history ([A5](#a5-the-secret-exposure-is-worse-than-this-adr-recorded-verified)).
A run of `403`s is sitting right there on the telemetry box. **This is the same shape as `0219`'s finding:
the signal exists, nothing looks at it.** Querying it is cross-box, needs telemetry credentials, and is
unbuilt.

**A3.5 — The recommendation: the smallest guard that actually closes the loop.**

> **A synthetic probe sent from the telemetry box to the relay route, on a schedule — and a
> marker-age check in `profile-checks.sh` that fails when it stops arriving.**

How it closes the loop, where the config-grep could not: it originates **from the telemetry box's real
egress address**, so it traverses **the same nginx allowlist, the same `/internal/` location, the same
route and the same secret comparison** as a real alert. If the address changes, the probe 403s, the marker
stops advancing, and `profile-checks.sh` reports a `FAIL` to the **external dead-man's switch** — a path
that depends on **neither Uptrace nor Telegram**. Detection latency ≤ ~26 h.

Mechanism, in the cheapest available shape:

1. The telemetry box posts a probe body to the relay route on a cron (its own pipeline —
   `setup-telemetry.sh` / `build-deploy-telemetry.sh` — already exists; this is not a new box).
2. The relay recognises the probe, **does not forward it to Telegram** (the Alerts topic stays clean), and
   touches a marker file with a UTC timestamp — **the same flat-JSON marker shape `profile-backup.sh`
   already writes and `profile-checks.sh` already parses**.
3. `profile-checks.sh` gains one check cloned from its existing backup-marker age check: marker older than
   ~26 h ⇒ `FAIL`, with a reason naming the channel and no address in it.

**Cost, honestly:** ~10 lines in the relay, ~15 in `profile-checks.sh`, one case in `tests/profile-checks.sh`
(already gated by `npm test`), one cron line and one non-secret config key on the telemetry box. **It is
not free and it is not in `0277`'s approved scope — it is a follow-up task.** It also needs the relay
secret present on the telemetry box, which it already is: that box holds the Uptrace channel's payload
template.

**Alternative considered — an always-firing Uptrace monitor instead of a cron probe.** Strictly stronger:
it would additionally prove Uptrace's **own** notifier is wired to the channel, not merely that the route
is reachable. **Rejected as the primary recommendation on an unverified dependency:** whether 2.0.2
re-notifies a *continuously* firing alert on a schedule is **unverified**. The `recurring` event kind
strongly suggests periodic re-notification exists, but **its period was not established.** A guard built on
an unverified re-fire interval could sit there never firing — **the same class of silent defect it was
built to catch.** Settle the interval first, or use the cron probe. Adding the monitor later is a pure
upgrade.

**What the guard still would not cover:** Telegram delivery itself. The marker is written **on receipt**,
before and independent of the send. `0283`'s heartbeat covers that half, this probe covers the other half,
and **neither covers the other** — the two are complements, not redundancy.

**Until the guard lands, the accepted risk stands at full size**, and is larger than a prose note implies:
a single infrastructure change nobody connects to alerting kills A1–A6 permanently and invisibly, while a
daily Telegram message keeps saying everything is fine.

### A4. The webhook contract is now read out of the binary (verified)

All of the following were read from the deployed Uptrace 2.0.2 binary's DWARF symbols and type information
on 2026-09-17. They bind to **that build**; a version bump re-opens every one of them (see *Re-raise*).

| Fact | Class | Consequence |
|---|---|---|
| The custom payload is **merged**, nested under a **top-level `payload` key** — `WebhookParams{URL, Payload interface{}}`. It does **not** replace the default body. | **verified** | The plan's *"build for replace"* fallback is **dead — do not build it.** The relay's secret is read from `payload`; Uptrace's own alert fields stay at the top level. **Key collision is impossible** by construction. |
| `payload` carries **no `omitempty`** — the key is always present, `null` when unset. | **verified** | Schema may rely on the key existing; it must still tolerate `null`. |
| **`id` is stable across retries** — it is the alert-**event** row id, re-loaded per attempt. | **verified** | **Decision 5 stands, vindicated.** Nuance: `created`, `status-changed` and `recurring` are **separate events with separate ids**. Several messages per alert is **correct**. Never write "one message per alert". |
| **`id` and `alert.id` arrive as JSON strings**, not numbers. | **verified** | A numeric schema would reject **every** alert. |
| `alert.state` and `alert.status` carry the **same** value; `state` is a **legacy alias**. | **verified** | Read `status`. Do not branch on both. |
| `log` is **absent entirely** for metric monitors. | **verified** | **A1–A6 are all metric monitors**, so `log` is absent for every alert this channel will ever carry. It must be optional, and nothing may be rendered from it. |
| Exactly **two** request headers are sent: `User-Agent` and `Content-Type`. | **verified** | **Code-level confirmation** that 2.0.2 cannot send a custom header. Context §2 was right and is upgraded from UI-bundle evidence to binary evidence. Decision 3's payload-carried secret is now **forced**, not merely preferred. |
| Retry configuration: `MaxRetries 32`, `MinBackoff 60 s`, `MaxBackoff 1 h` ⇒ **~26 hours**. Only **2xx** counts as success. | **strongly indicated** — constants read from the binary, not observed running | Upgrades the ADR's *"unverified"* retry budget. Narrows the event-loop residual to a **>26 h continuous** saturation. Makes Ruling A's 5xx branch genuinely valuable, and makes a 401 branch genuinely wasteful. |

### A5. The secret exposure is worse than this ADR recorded (verified)

The original consequence said the secret is *"visible to anyone with Uptrace channel-config access."*
**That understates it.** Uptrace persists, into its notification history in ClickHouse, **per delivery
attempt**:

1. **the full outbound JSON body — secret included**; and
2. **the first 100 bytes of the relay's response body.**

So the secret is not merely *displayed* in a config form — it is **written into a queryable datastore, once
per attempt**, on the telemetry box. With a 32-attempt retry budget, one misconfiguration writes it 32
times per event.

**Three consequences that bind the implementation:**

- 🚫 **The relay must never echo anything from the request in its response** — no secret, no id, no rule
  title, no exception text. Responses are **fixed constants**. Anything the relay says goes into
  ClickHouse. This is a hard constraint, restated in [A2](#a2-ruling-a--the-response-contract-supersedes-decision-3s-fail-closed-wording).
- **Rotating this secret means the old value survives** in notification history until that history ages
  out. Rotation is not erasure. Note it in the runbook.
- **A 401-on-bad-secret design would have multiplied this by 32** — a second, independent reason Ruling A
  is right.

**Scope, so this is not read as alarm:** the telemetry box is ours, in the same residency, and the history
is not public. The exposure is **internal and durable**, not external. It does **not** change this ADR's
placement decision; it changes what the relay may say and what the runbook must record.

## Related
  `"network_error"` swallow
- `src/server/Master.ts` — `telegramProxyAgent`, and the two inline sends that log-and-continue
- `src/profile-server/InternalAuth.ts` — the fail-closed constant-time comparison reused by the relay
- `src/profile-server/Routes.ts` — the `/internal/**` routes and the three rate limiters
- `src/profile-server/Server.ts` — where the `TelegramConfig` is built on the admin box
- `setup-profile.sh` — the nginx `location ~* ^/internal/` allowlist
- [`../conventions/file-line-citations.md`](../conventions/file-line-citations.md) — citation form used here
- [ADR-101](adr-101-fail-soft-xp-crediting-no-durable-queue.md),
  [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md),
  [ADR-113](adr-113-profile-internal-player-id-and-platform-identities.md)
- Tasks `0033` (untouched by this decision), `0061` (the fail-silent hypothesis),
  `0219` (operability / nothing reads the markers), `0276` (the case-insensitive `/internal/` allowlist)
- **Added by Amendment 1:** `profile-checks.sh` — the daily on-box checks and their **independent**
  dead-man's-switch ping; the marker-age pattern the recommended guard clones
- **Added by Amendment 1:** `setup-telemetry.sh` / `build-deploy-telemetry.sh` — the telemetry box's
  existing pipeline, which is why the recommended probe is not "a new box to run and remember"
- **Added by Amendment 1:** tasks `0277` (the relay itself — its plan's §1b response contract is
  superseded by [A2](#a2-ruling-a--the-response-contract-supersedes-decision-3s-fail-closed-wording)),
  `0283` (the daily digest — **does not** cover this channel, [A3.3](#a3-ruling-b--the-allowlist-stays-and-what-actually-guards-it))
