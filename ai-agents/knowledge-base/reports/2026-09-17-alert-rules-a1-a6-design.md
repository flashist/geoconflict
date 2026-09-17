# Alert rules A1–A6 — design, and which two to build first (2026-09-17)

Design consult for task [`0274`](../../tasks/backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md),
spawned by the Sprint 4 ship loop. Delivery is live and proven (`0277`); **the rules themselves do not
exist** — the Uptrace Monitors list holds only the default `error: Notify on all errors` entries
(`0277/brief.md:22`).

> **Update 2026-09-17, after this report was written:** **A5 has since been built** (monitor id 9,
> active, §3). **A1 is blocked** — its metric does not exist in the picker yet (§1, §4). The eight
> default `Notify on all errors` monitors are still there and are **ruled to stay, unwired** (§8).
> Open questions 1–3 are answered; 4 and 5 are not (§8).
>
> ✅ **Second update, same day: §5's drill fixture was EXECUTED, and IT WORKED.** Both messages
> arrived — 🚨 firing, then ✅ resolved, owner-confirmed in the Alerts topic. **`alert.status` = `closed`**
> on recovery, which the relay already matched. **That closes §2 item 2 and question 5.** It also
> **confirmed the defect §5 predicted** in the plan's always-true fixture. Details in §5.

**Owner ruling this design obeys (given live in the lead session, 2026-09-17):** build **two or three**
rules first, not six, so the real noise level is visible before thresholds we picked blind get committed.
⛔ One ruling, one task — not architect precedent.

⛔ No hostnames, chat ids, topic ids or secrets appear here, deliberately.

---

## 0. Verdict up front

| | |
|---|---|
| **Build first, in this order** | **A5** (pool waiting), then **A1** (creation spike) |
| **Build third, as a throwaway** | **D — the drill fixture** (§5). Not one of A1–A6. |
| **Defer** | A2, A3, A4, A6 — reasons in §6, each one specific |
| **§8 drill candidate** | 🚨 **None of A1–A6.** And the fixture the plan already names **cannot clear**. See §5. ✅ **The §5 fixture was built and run 2026-09-17 — it passed, both halves.** |

📝 **Naming alias, recorded once:** this drill is **`0274` plan §7.6**. It is called **"§8"** here and in
`0277`'s review ledger. **Same drill — there is no §8.**

Two mechanical facts settle the ordering as much as noise does:

1. **A5 and A1 are single-series threshold rules.** No ratio, no percentile, no formula. They are the
   shapes any alerting UI can express. A2/A3 need a **ratio**, A4 needs a **percentile** — and the repo
   has **no evidence** that Uptrace 2.0.2 can express either (`0274/plan.md:194`:
   *"Exact Uptrace query syntax is **not confirmed**"*). Building A5 first tells you in five minutes what
   the Monitors form can actually do, before anyone designs around a feature that may not exist.
2. **At today's traffic every ratio and percentile rule is noise.** One error out of one request is 100 %.
   One cold-start request over 750 ms is the p95. A2/A3/A4 need real traffic before a threshold on them
   means anything.

---

## 1. The metric names, read out of the source

⛔ **Write a rule against a name that does not exist and it sits there forever, never firing — the exact
silent failure this epic exists to close.** These are the emitted names, verbatim:

| Emitted name | Type | Attributes | Source |
|---|---|---|---|
| `geoconflict.profile.login.requests` | counter | `platform`, `outcome` | `src/profile-server/Telemetry.ts:220` |
| `geoconflict.profile.players.created` | counter | `platform`, `source` | `src/profile-server/Telemetry.ts:224` |
| `geoconflict.profile.http.duration` | histogram, `ms` | `route`, `method`, `status_class` | `src/profile-server/Telemetry.ts:228` |
| `geoconflict.profile.session.rejected` | counter | `reason` | `src/profile-server/Telemetry.ts:237` |
| `geoconflict.profile.tenure.claims` | counter | `outcome` | `src/profile-server/Telemetry.ts:241` — ⛔ **no caller, no series** |
| `geoconflict.profile.alert.relay` | counter | `result`, `keyed` | `src/profile-server/Telemetry.ts:248` |
| `geoconflict.profile.db.pool.waiting` | gauge | — | `src/profile-server/Telemetry.ts:256` |
| `geoconflict.profile.players.total` | gauge, 5 min | — | `src/profile-server/Telemetry.ts:287` — 🚨 **never observed; do not arm** |
| `geoconflict.profile.login.create_enabled` | gauge, int | — | `src/profile-server/Telemetry.ts:299` |
| `geoconflict.profile.process.cpu.usage` | gauge, ratio 0–1 | — | `src/profile-server/Telemetry.ts:313` |
| `geoconflict.profile.process.memory.rss` | gauge, bytes | — | `src/profile-server/Telemetry.ts:325` |
| `geoconflict.profile.process.memory.heap.used` | gauge, bytes | — | `src/profile-server/Telemetry.ts:329` |

Service resource: `service.name = geoconflict-profile` (`Telemetry.ts:43`), meter / instrumentation
library `profile-metrics` (`Telemetry.ts:42`).

Bounded attribute values, also from source — these are the **only** values that exist, so a filter on
anything else matches nothing:

- `outcome` (login) = `existing | created | bad_request | creation_paused | session_unavailable | error`
  — `Telemetry.ts:70-76`
- `source` (created) = `login | game_server` — `Telemetry.ts:118`, `ResolveSource`
- `reason` (session) = `expired | invalid | absent` — `Telemetry.ts:90`. ⛔ There is **no**
  `legacy_fallback_used`; `0273` deleted the branch (`Telemetry.ts:86-88`).
- `status_class` = `1xx…5xx` — `Telemetry.ts:93`
- `route` = the Express **route pattern**, so `/v1/login` for the login route
  (`src/profile-server/Routes.ts:525-535`); an unmatched request is one value, `unmatched`.

### ✅ RESOLVED 2026-09-17 — was: “🚩 The displayed name is NOT confirmed — do not type it, pick it”

> **Answered by direct observation of the live Metrics picker, 2026-09-17.** The displayed name is the
> **prefixed, underscored** form. The picker offers, verbatim:
> `geoconflict_profile_alert_relay` (counter) · `geoconflict_profile_db_pool_waiting` (gauge) ·
> `geoconflict_profile_http_duration` (histogram, ms) · `geoconflict_profile_login_create_enabled`
> (gauge) · `geoconflict_profile_process_cpu_usage` (gauge, `1`) ·
> `geoconflict_profile_process_memory_heap_used` (gauge, bytes) ·
> `geoconflict_profile_process_memory_rss` (gauge, bytes).
>
> ⇒ **`0274/plan.md:192`'s prediction was the correct record.** `0274/brief.md:20`'s un-prefixed list
> was an **abbreviation**, not what the UI shows. Stated explicitly so this is not re-litigated.
> **The "pick it from autocomplete, never hand-type it" advice stands regardless.**
>
> 🚨 **And an answer nobody expected — THREE METRICS ARE ABSENT FROM THE PICKER:**
> `login_requests`, `players_created`, `session_rejected`. All three are counters that have **never been
> incremented** — no real player has ever logged in, so no series exists and the name is not offered.
> **Consequence: A1 (§4) CANNOT BE BUILT until the first player is created** — you cannot write a rule
> against a name the picker does not offer. This is exactly the silent failure §1 opens by warning
> about, **observed live rather than predicted.** It also means §5's recommended drill fixture D rests
> on `session_rejected`, which does not exist yet either — though the first junk-token request would
> create it.

The original question, kept for the record:

Two in-repo records disagree:

- **Predicted** before deploy: dots become underscores, prefix kept —
  `geoconflict_profile_login_requests` (`0274/plan.md:192`), and the operator runbook uses that form
  (`ai-agents/knowledge-base/profile-junk-cleanup-runbook.md:74`).
- **Observed** in the live UI 2026-09-17, the only record of anyone actually looking: `login_requests`,
  `players_created`, `http_duration`, `session_rejected`, `login_create_enabled`, `db_pool_waiting`,
  `process_cpu_usage`, `process_memory_rss`, `process_memory_heap_used` — underscored **and
  un-prefixed** (`0274/brief.md:20`).

Either the UI scopes names under the instrumentation library, or the brief abbreviated. **The repo does
not say which, and I could not verify it — the telemetry UI needs a signed-in console I do not have.**

⇒ **Select every metric from the form's picker / autocomplete. Never hand-type a name.** And record in
`0274`'s worklog which form the UI actually showed, so the next person is not guessing.

---

## 2. How a number reaches the Telegram message (read this before typing anything)

🚨 **The measured value, its threshold and its window CANNOT be templated into the message.** The sender
stores the custom payload **verbatim and never inspects it**, so `{{ .value }}` is delivered as those
literal characters; and its own top-level fields carry no value, no threshold and no window
(`alert-delivery-runbook.md:111-120`; `0277/worklog.md:452`). ⛔ There is no syntax that works. The relay
drops any value still containing `{{` or a `PASTE_…` literal (`AlertRelay.ts:183-189`).

**A static string you hardcode is the only number that can appear.** The relay renders it like this
(`AlertRelay.ts:237-270`):

```
🚨 Geoconflict · profile · <monitor name>
Status: firing
Threshold: <your static threshold>, over <your static window>
Since: 2026-09-17 16:56 UTC
→ open the alert
```

So `threshold` should read as a **noun phrase**, because the word "Threshold:" and ", over " are supplied
by the relay. Per-rule strings are in §3 and §4.

### 🚨 The mechanical consequence nobody has written down yet: one channel per monitor

The Uptrace 2.0.2 **channel** form offers *"channel name, webhook URL, an optional JSON payload,
monitors, and condition — nothing else"* (ADR-114:46, upgraded to binary-verified). The payload therefore
belongs to the **channel**, not the monitor — but the `threshold`/`window` strings must differ **per
rule**.

⇒ **To give each rule its own numbers, create one webhook channel per monitor** (same lowercase URL, same
secret, different static strings, `monitors` set to exactly that one rule).

- **Cost:** the shared secret is stored once per channel, and Uptrace persists the full outbound JSON per
  delivery attempt anyway (ADR-114 §A5). This adds channel-config copies of an exposure that already
  exists and is already accepted. It does **not** create a new class of exposure.
- **Cheaper fallback if that is too much clicking:** one shared channel with **no** `threshold`/`window`
  keys at all. Every display key is optional and a missing one degrades the message, it never drops the
  alert (`alert-delivery-runbook.md:131`). You lose the numbers; the monitor **name** and the link still
  carry the meaning. **This is a perfectly respectable answer** — see the naming advice below.
- **Recommendation:** shared channel + no numbers for the first two rules; add per-rule channels only if
  the owner finds the numberless message unclear in practice. Rationale: fewer places for the secret,
  fewer things to re-create after a box rebuild, and §3/§4's monitor names are written to carry the
  number anyway.

**Name each monitor so the heading alone is actionable**, since the heading is the one string that is
always yours: e.g. `profile · player creation spike (>300 / 10 min)`.

> ### ✅ RESOLVED 2026-09-17 — OWNER RULING: one shared channel, no numbers
>
> The owner was offered **one shared channel without numbers** versus **one channel per rule with
> numbers**, and chose **shared**. The recommendation above is therefore **no longer a recommendation —
> it is ruled.**
>
> **Consequence to carry:** the message carries **no `Threshold:` line at all**, so **the monitor NAME
> is the only place a number can appear**. Name every monitor so its heading alone is actionable —
> which is what this section already advises, now mandatory rather than advisory.
>
> **Also observed on the live form, and structurally important:** the **notification channel is selected
> ON THE MONITOR FORM**, not only on the channel form — the monitor form has its own
> `Notification channels` picker. **Each monitor opts in individually**, so a channel cannot be picked
> up by a monitor that did not choose it. (That is what makes the default-error-monitor ruling in the
> runbook safe *by construction* rather than by memory.)

### Two more channel-form settings that will silently break the drill

1. 🚨 **The channel's `condition` must include the recovery event.** `created`, `status-changed` and
   `recurring` are **separate alert events with separate ids** (ADR-114 §A4, binary-verified). A resolved
   alert arrives as a `status-changed` event. **If the channel's condition only covers "created", the ✅
   message never arrives and §5's drill cannot pass — and the symptom is silence.** The condition
   vocabulary is **not recorded anywhere in this repo**; read it off the form and record it.

   > **✅ PARTIALLY RESOLVED 2026-09-17.** The field is named `Optional Condition` and it is a
   > **filter**. **Ours is EMPTY, which is correct, and it must stay empty** — an empty condition
   > filters nothing, so the recovery event is **not** excluded by it. The failure feared above cannot
   > happen in the current configuration.
   >
   > Its function vocabulary, **from the current public vendor docs**: `monitorName()`, `alertName()`,
   > `alertType()` (returns `"error"` or `"metric"`), `attr(key)`, `hasAttr(key)`. **There is no status
   > function** at all.
   >
   > ⚠️ **Caveat, plainly:** those are the **current published vendor docs**; this deployment runs
   > **2.0.2 and may differ.** This was not read off the running form.
   >
   > ⛔ **This does NOT close item 2 below.** Whether a recovered alert renders as ✅ or as a second 🚨
   > is a separate, still-open residual.
2. ⚠️ **`alert.status`'s value vocabulary is unverified.** The relay treats only `closed` / `resolved` as
   recovered and renders anything else as **firing** (`AlertRelay.ts:138-144`). So a recovered alert may
   arrive as a second 🚨 rather than a ✅. That is precisely what §5 exists to find out. Where it would
   mislead is flagged per rule below.

   > ### ✅ RESOLVED 2026-09-17 — the drill was run, and the answer is `closed`
   >
   > **`alert.status` = `closed` on recovery** (firing is `open`; `alert.type` = `metric`). The relay
   > matches `closed` / `resolved` at `AlertRelay.ts:141`, so **the recovery renders as ✅ — confirmed
   > live, owner-watched.** No code change was needed.
   >
   > 🚩 **Record plainly what kind of result this is: CONFIRMED, not designed.** The relay was written
   > to match those two values **without anyone knowing which one Uptrace 2.0.2 emits.** It happened to
   > be right. ⇒ **The "a resolved alert may render as still firing" residual is CLOSED.**

### 🚨 Nothing may ever return 401, 403 or 404

All three permanently and silently disable the channel (`alert-delivery-runbook.md:28-49`). Nothing in
this design produces one — every rule points at the same already-working lowercase relay URL. **The one
thing that can still cause it is the monitoring box's egress IP changing**, which is `0284`'s job, not
this design's.

---

## 3. Build first — A5: Postgres pool saturation

**Why first:** the simplest rule that exists. One gauge, one number, no attribute filter, no ratio, no
percentile, no grouping. If the Monitors form cannot express *this*, it can express nothing, and you find
that out in five minutes instead of after designing four more rules around it.

| Field | Value |
|---|---|
| Metric | `geoconflict.profile.db.pool.waiting` (`Telemetry.ts:256`) |
| Aggregation | last / max of the gauge over the evaluation step — **no grouping**, the gauge has no attributes |
| Condition | `> 0` |
| For / hold | **5 min** |
| Monitor name | `profile · DB pool saturated (>0 waiting, 5 min)` |
| `threshold` payload string | `> 0 requests waiting for a connection` |
| `window` payload string | `5 min` |

Rendered: `Threshold: > 0 requests waiting for a connection, over 5 min`.

**What the threshold is based on — not a guess.** `0` is a structural boundary, not a tuned number: the
gauge reports `pool.waitingCount` (`Telemetry.ts:141-143, 259-261`), and any value above zero means a
request is *queued* for a connection. The judgement call is the **duration**, not the threshold — 5 min
comes from design §6 and is the design's own figure, which I am keeping.

**What a false positive looks like.** A brief, genuine queue that clears — a slow query, a `pg` reconnect,
a backup window — showing as `> 0` on consecutive 15 s exports for five straight minutes. Note the gauge
is sampled at the 15 s export interval (`Telemetry.ts:44`), so a sub-second queue is usually invisible
anyway; five minutes of *sampled* non-zero is a real stall.

⚠️ **Known narrowness, already agreed and NOT owner-ruled (residual R11 on `0274`):** the guard reads
`waitingCount` only. A pool that is saturated but not *queueing* — every connection busy, no waiter at the
sampled instant — does not show here.

**If it fires spuriously in week one:** do **not** raise the threshold above 0 — that destroys the rule's
meaning. Raise the **hold** to 10 min, and look at `geoconflict.profile.http.duration` on the same window
to see whether requests were actually slow. If they were not, the pool is fine and the duration was too
short.

### ✅ BUILT 2026-09-17 — monitor id 9, status active

The first real alert rule now exists: `profile · DB pool saturated (>0 waiting, 5 min)`, on metric
`geoconflict_profile_db_pool_waiting`, attached to the `alerts-to-telegram` channel.

| Field | Value as built |
|---|---|
| Aggregation | **`avg`** (the UI default) |
| Grouping interval | 1 minute |
| Check | the last 5 points (5 minutes) |
| Max allowed | 0 |

⚠️ **Caveat to carry: the design above specified `max`; the UI default `avg` was kept.** On a
**non-negative gauge at a `>0` threshold the two are equivalent** — any non-zero sample lifts the
average above 0. **They are NOT equivalent if the threshold ever moves off 0.** If anyone raises the
threshold (see the "if it fires spuriously" advice above, which deliberately says not to), the
aggregation must be switched to `max` first, or the rule quietly changes meaning.

The gauge read **flat 0 across the preceding hour**, so the rule is armed against a genuinely quiet
series.

---

## 4. Build second — A1: player-creation spike

> 🚨 **BLOCKED as of 2026-09-17 — this rule cannot be built yet.** `players_created` is **absent from
> the live Metrics picker**: the counter has never been incremented, because no real player has ever
> logged in. A rule cannot be written against a name the picker does not offer. **A1 waits for the
> first player creation.** The design below is unchanged and still stands — only its build is blocked.
> (Same for `login_requests`, which A6 in §6 needs, and `session_rejected`, which §5's fixture D needs.)

**Why it exists:** this is the rule the whole slice was filed for. A scripted `100 req/s` writes ~3–4 GB/day
against 48 G free ⇒ **~12–16 days of runway**, so detection has to take minutes (design §6;
`0274/brief.md:37-38`).

| Field | Value |
|---|---|
| Metric | `geoconflict.profile.players.created` (`Telemetry.ts:224`) |
| Aggregation | **sum of the delta over a 10-minute window**, across **all** attribute values — do not split by `platform` or `source` |
| Condition | `> 300` |
| For / hold | **20 min** (this is design §6's *"two windows in a row"*, and `0274/plan.md:195`'s *"held 20 min"* — the same requirement stated two ways) |
| Monitor name | `profile · player creation spike (>300 / 10 min)` |
| `threshold` payload string | `> 300 players created per 10 min, held 20 min` |
| `window` payload string | `10 min` |

Rendered: `Threshold: > 300 players created per 10 min, held 20 min, over 10 min`. ⚠️ Slightly redundant;
if that reads badly, drop the `window` key and keep the fuller `threshold` string.

**What the threshold is based on — arithmetic on a partly-unverified baseline, kept from the design.**
Baseline (design §6, from `2026-09-14-0253-tenure-xp-grant-findings.md`): steady-state ~400–650 creations/day
≈ **4.5/10 min**; launch day ≤ ~1.6 K/day ≈ **11/10 min**. A scripted 100 req/s is ~**60,000/10 min**.
So 300 sits ~27× above the busiest *expected* 10 minutes and ~200× below the attack it is meant to catch —
an enormous margin on both sides, which is exactly why it is safe to ship a number nobody has measured.
⚠️ **The baseline itself carries the design's own caveat:** it *"assumes new players log in at the average
rate — unverified"*. And **there is no production login traffic behind any of this yet**, so the *shape*
of a normal day is a projection, not an observation.

⛔ **Do not build this on `geoconflict.profile.players.total`** — that series has never been observed
(`players.reltuples = -1, analyzed = NEVER`), and `0274/brief.md:20` says in terms: do not arm any alert
on it until it has been seen.

**What a false positive looks like — and one is scheduled.** 🚨 **The day [`0217`](../../tasks/backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md)
wires the game server, every active player gets created at once.** `players.created` counts **both**
sources (`Telemetry.ts:351-353`; `source = login | game_server`), and the design deliberately specifies
"creations (both sources)" — so the first hours of XP go-live are a legitimate burst that looks exactly
like the attack. The other realistic FP is a broken or retrying client minting profiles.

**If it fires spuriously in week one:** first open the chart and **split by `source`** — `game_server`
means a real go-live backfill, `login` means look harder. Do not reflexively raise the threshold; raise
the **hold** instead, or silence the rule for the known window of a planned go-live and put it back the
same day. ⚠️ Before `0217` ships, decide deliberately whether to pause this rule for that deploy; do not
discover it at 3 a.m.

**Standing partner, already built:** `profile-checks.sh`'s daily backstop (disk > 80 %, `players` grew
> 20 K in 24 h) catches the slow-burn version A1 is too twitchy for. A1 is the minutes-scale half.

---

## 5. 🚨 The §8 drill — none of A1–A6 works, and the fixture already in the plan cannot clear

**This is the loud part.** `0277`'s last open residual and `0274`'s gate is a drill that proves the
**recovery** message form — and that needs an alert that can be made to **fire and then clear on demand**.

> ## ✅ EXECUTED 2026-09-17 — the design below was run, and IT WORKED
>
> **The whole alert path is now proven end to end.** Owner-confirmed in the Alerts topic: a 🚨 firing
> message, then a ✅ resolved message. **Both arrived.**
>
> **The headline fact: `alert.status` = `closed`.** The relay matches `closed` / `resolved`
> (`AlertRelay.ts:141`), so the recovery rendered correctly. 🚩 **This was CONFIRMED, not designed** —
> the relay was written to match those two values with nobody knowing which one Uptrace 2.0.2 actually
> emits, and it happened to be right. **The long-standing "a resolved alert may render as still firing"
> residual is CLOSED.** Also observed: `alert.type` = `metric`; the open-state value is `open`.
>
> ### What was actually run — the reusable procedure
>
> 1. ~20 requests to the public read-only `GET /v1/profile` with a junk Bearer token → each **401**,
>    each increments `session_rejected` with `reason = invalid`. **No writes, no rows, no restart**,
>    repeatable in seconds.
> 2. 🚩 **The first request CREATES the metric.** `geoconflict_profile_session_rejected` did not appear
>    in the picker until it was first incremented. ⇒ **Fire the traffic BEFORE creating the monitor.**
>    *(The ordering constraint below was recorded as **unverified**. It is now **verified**.)*
> 3. Throwaway monitor on that metric: `perMin(sum(...))`, grouping interval **1 minute**, check **the
>    last 1 point (1 minute)**, **max allowed 0**, attached to the alerts channel. **The short window is
>    what makes it clear quickly** — this differs from the 5-minute window in the table below.
> 4. Second burst → **it fires.**
> 5. **Stop → it closes by itself.** No deletion, no restart: a **real recovery event**.
> 6. Delete the throwaway monitor. *(Verified: the other monitors were unaffected.)*
>
> ### 🚨 And running it CONFIRMED the defect this section predicted
>
> `0274`'s plan specifies the fixture as an **always-true rule** (`process.memory.rss > 1`). **It cannot
> pass a recovery drill**: an always-true rule never clears, and **deleting a monitor is not a recovery
> event**, so no ✅ is ever produced. **Run as written, the drill would have gone green having proved
> only the firing half.** ⇒ **The fixture recorded above is the correct one.** **The generalisable
> lesson:** a recovery drill needs a rule whose **data** falls back below threshold on its own; a rule
> that cannot go false — or one you "clear" by deleting it — proves half the path while looking complete.
>
> ### ⚠️ Bounds — do not let this PASS be over-read
>
> - ⛔ **It does NOT discharge `0274` amendment A1** (delivery **after an idle period** — the
>   stale-connection defect). **Both bursts were minutes apart on a warm connection.**
> - ⛔ **It does not prove SUSTAINED delivery.** `0283`'s daily digest remains the only non-circular
>   proof. Unchanged.
> - ⛔ **It says nothing about the 403 channel-disable trap** — `0284`'s job, **at full size**.
>
> ### A naming detail worth carrying
>
> The generated alert name **appends the aggregation alias** to the monitor name:
> `DRILL — delete me — rejected sessions (>0 / 1 min)` produced the heading
> `DRILL — delete me — rejected sessions (>0 / 1 min): rejected`. ⇒ **The monitor name is not quite the
> whole heading** — name accordingly.
>
> **The original design text below is kept unchanged.**

### The fixture currently written into the plan is not fit for it

`0274/plan.md:201` says: *"temporarily add an always-true rule (`process.memory.rss > 1`), wait for the
Telegram message, delete the rule."* ⛔ **An always-true rule can never clear.** It proves the 🚨 path and
says **nothing** about the ✅ path. Deleting the monitor is not a recovery event either. **Do not record a
run of that fixture as having proven recovery.**

### Can any of A1–A6 do it? No — and here is why each fails

| Rule | Fire on demand? | Clear on demand? | Verdict |
|---|---|---|---|
| A1 | only by minting 300+ real players in 10 min | yes, by stopping | ⛔ deliberately creates junk rows |
| A2 | needs day-8 arming + ratio syntax | — | ⛔ not available |
| A3 | needs forced 5xx **and** ratio syntax | — | ⛔ not available |
| A4 | needs sustained slow requests for 10 min | awkward | ⛔ impractical |
| A5 | needs a real pool stall | not controllable | ⛔ cannot force |
| A6 | 20 req/s sustained 5 min | yes | ⚠️ possible but heavy, and it mints players |

### Recommended fixture — **D**, a throwaway monitor on forged-session rejections

> ⚠️ **Ordering constraint discovered 2026-09-17: `session_rejected` is ABSENT from the live Metrics
> picker** (never incremented), so the monitor **cannot be created first**. The first junk-token request
> would create the series — so **fire the requests first, then create the monitor**, rather than the
> other way round. Whether that ordering actually works end to end is **unverified**; it was not tried.
>
> ✅ **Now VERIFIED, 2026-09-17: that ordering works end to end.** It was tried, exactly as described.

| Field | Value |
|---|---|
| Metric | `geoconflict.profile.session.rejected` (`Telemetry.ts:237`) |
| Filter | `reason = "invalid"` |
| Aggregation | sum of the delta over a 5-minute window |
| Condition | `>= 1` |
| For / hold | none (fire on the first window) |
| Monitor name | `DRILL · forged session tokens (delete me)` |
| `threshold` payload string | `>= 1 invalid session token` |
| `window` payload string | `5 min` |

**How the owner fires it:** send a handful of requests to the public `GET /v1/profile` route carrying
`Authorization: Bearer notarealtoken`. That header is present and does not verify, so it counts as
`invalid` — `Routes.ts:451-457` and `Routes.ts:466-471`. **How it clears:** stop. The window rolls, the
count returns to zero, and the monitor should go to resolved on its own.

Why this one and not the others:

- **No writes, no junk rows, no container restart, no deploy.** Nothing to clean up afterwards.
- **The data changes, not the rule** — which is what a real alert does. A fixture that fires by editing a
  threshold proves less.
- **Repeatable in seconds**, which directly serves `0274`'s *strengthened* drill requirement — *"a second
  alert after an idle period, or an explicit connection-failure test"* (`0274/brief.md:77-89`). Fire,
  wait 30–60 min idle, fire again. That second firing is the one that would expose the stale-pooled-socket
  defect `0061` describes, and it costs one more curl.
- **Safe to leave armed by accident**, since at today's traffic `reason=invalid` is ~zero. Still: **delete
  it when the drill is done**, or its name stops being true.

**What the owner must record in `0274`'s worklog — this is the actual point of the drill:** whether the
recovery message arrived as **`✅ … — resolved` / `Status: resolved`**, or as a **second 🚨 `Status: firing`**.
⚠️ The second outcome is a real possibility, not a failure of the drill: the relay only recognises
`closed` / `resolved` (`AlertRelay.ts:144`) and Uptrace's actual vocabulary is unverified. If a 🚨 appears
instead, the fix is a one-line addition to `RESOLVED_STATUSES` on `0277` — **and the drill will have
earned its keep by finding it.** Record the date and the outcome, and nothing else: no topic id, no chat
id, no token, no host.

> ✅ **ANSWERED 2026-09-17: it arrived as `✅ … — resolved`.** `alert.status` = `closed`, already in
> `RESOLVED_STATUSES` — **no code change needed.** The drill still earned its keep: it found the
> always-true-fixture defect above.

**Alternative fixture, if the owner prefers to piggyback on work already scheduled:** a monitor on
`geoconflict.profile.login.create_enabled == 0` (`Telemetry.ts:299`). Owner step 7.7 flips
`PROFILE_LOGIN_CREATE_ENABLED` off and back on anyway, so the gauge goes 1 → 0 → 1 with no extra work,
**and the rule is genuinely useful to keep** — it catches "someone left creation paused", which otherwise
silently stops every new player. ⚠️ Two caveats: the flip needs a **container restart**, so the series has
a short **gap** while the process is down (`Telemetry.ts:305-307` reads a boot-time boolean), and how
Uptrace 2.0.2 treats missing data in a monitor is **unverified** (`0274/plan.md:239`). That gap is why I
rank it second, not first.

---

## 6. The rest — designed at low detail, and exactly why each waits

**A6 — login request rate > 20/s for 5 min.** Metric `geoconflict.profile.login.requests`, sum across all
attributes, converted to a per-second rate over a 5-minute window, `> 20`, hold 5 min. Static strings:
`threshold` = `> 20 login requests/sec`, `window` = `5 min`. **Why it waits:** it is the same shape as A1
(single series, rate, threshold), so it is *cheap* — but it is also largely **redundant with A1 for the
junk-creation case**, and at today's traffic it can never fire. Add it as the fourth rule once A1's shape
is proven in the form; there is nothing to learn from it first.

**A4 — p95 of login latency > 750 ms for 10 min.** Metric `geoconflict.profile.http.duration`, filtered
`route = "/v1/login"` **and** `method = "POST"` (`Telemetry.ts:354-360`), p95, `> 750 ms`, hold 10 min.
750 is readable because the histogram has an explicit **750 ms bucket boundary put there for this rule** —
`Telemetry.ts:51-58` says so in terms: *"750 is load-bearing: alert A4 pages on the p95 … and a percentile
can only be read off a boundary the histogram actually has."* **Why it waits, two reasons:** (1) percentile
queries in the 2.0.2 monitor form are **unconfirmed**; (2) with near-zero login traffic the p95 **is** a
single request, so one cold start pages you. This rule needs real traffic before its threshold means
anything.

**A3 — login error share > 5 % over 10 min, only when ≥ 20 requests.** ⛔ **Build it on
`geoconflict.profile.login.requests` split by `outcome`, NOT on `http.duration` `status_class = 5xx`.**
That is not a stylistic preference: `creation_paused` answers **503** (`Routes.ts:686-689`), so a
status-class rule would page **continuously for as long as the creation switch is off** — the one time an
operator is already looking. `Telemetry.ts:66-68` states the intended split: the error set is
`outcome ∈ {error, session_unavailable}`, and `creation_paused` is deliberately **not** an error.
**Why it waits, three reasons:** ratio syntax unconfirmed; the "≥ 20 requests" guard *"may not be
expressible in Uptrace"* (`0274/plan.md:197`); and without that guard, at today's traffic, 1 error out of
1 request is 100 % and pages instantly.

**A2 — created ÷ logins > 60 % over 1 h.** ⚠️ **Armed from day 8 after go-live, by the design's own rule**
(design §6; `0274/brief.md:73-75`) — before then, almost every login *is* a creation and the ratio is
~100 % legitimately. Create it **disabled** whenever the ratio syntax is worked out; arm it on day 8.
Needs the same unconfirmed ratio feature as A3.

**Not a rule, and must not become one:** `geoconflict.profile.alert.relay`. A monitor on
`result="failed"` is **circular** — the alert about the broken alert path travels the broken alert path.
It catches an intermittent failure and a sustained one **not at all** (`Telemetry.ts:129-136`). The
non-circular answer is `0283`'s unconditional daily digest, and even that proves Telegram works, never
that the monitoring → relay hop does (`alert-delivery-runbook.md:170-178`). `0284` owns the real guard.

---

## 7. Three residuals this design surfaces but does not fix

1. ⚠️ **Uptrace 2.0.2 Community keeps ~14 days of metrics regardless of the configured 90**
   (`2026-09-14-0259-uptrace-retention-findings.md`). `0274` plans to *"re-baseline A1–A6 after 14 days"* —
   that lands exactly on the retention edge, so a day-15 re-baseline finds the early data already dropped.
   **Recommend re-baselining at day 10–12**, not 14.
2. ⚠️ **Monitors and channels are UI-only state.** `setup-telemetry.sh:264-297` seeds users, orgs, projects
   and tokens — **no monitors, no channels**. A telemetry-box rebuild or a lost Postgres volume silently
   takes every rule with it, and the symptom is silence. Nothing in this design changes that; it is worth
   a follow-up next to `0284`.
3. ⚠️ **Several of the shapes above are unverified against 2.0.2** and I could not verify them from the
   repo: ratio/formula queries, percentile queries, the "≥ N requests" guard, grouping-by-attribute,
   for-duration/consecutive-window semantics, "no data" behaviour, and whether a continuously-firing alert
   re-notifies. **A5 and A1 were chosen first precisely because they need none of them.** Whoever fills in
   the form should record what the UI actually offers, in `0274`'s worklog — that record is worth more than
   this section.

   > **✅ ONE OF THESE IS NOW ANSWERED (2026-09-17): a firing alert DOES re-notify, on an adaptive
   > schedule.** The monitor form's `Notification repeat interval` (Repeat strategy: **Default**)
   > states: the interval starts at **15 minutes** and **doubles every 3 notifications** — 15m, 15m,
   > 15m, 30m, 30m, 30m, 1h, … — **capped at 24 hours**. An unresolved alert nags rather than going
   > quiet. **The rest of the list above remains unverified.**

---

## 8. Open questions for the owner

**Status as of 2026-09-17** — questions 1–3 and **5** are settled; **only 4 is still open**. The original
wording of every question is kept, so the record shows what was unknown and when it was settled.

1. ~~**Per-rule numbers, or a shared channel with none?** §2 — my recommendation is a shared channel with no
   `threshold`/`window` keys to start, and monitor names that carry the number.~~
   **✅ RESOLVED 2026-09-17 — OWNER RULING: shared channel, no numbers.** The recommendation was ruled.
   ⇒ **No `Threshold:` line in the message; the monitor NAME is the only place a number can appear.**
2. ~~**What does the channel form's `condition` field actually offer?** It must include the recovery /
   status-changed event or the ✅ message never arrives. Not recorded anywhere in this repo.~~
   **✅ PARTIALLY RESOLVED 2026-09-17.** The field is `Optional Condition`, it is a **filter**, and
   **ours is empty — correct, and it must stay empty**, so nothing is excluded and the feared failure
   cannot occur. Vocabulary (**current public vendor docs**, ⚠️ **not read off 2.0.2, which may
   differ**): `monitorName()`, `alertName()`, `alertType()` → `"error"` | `"metric"`, `attr(key)`,
   `hasAttr(key)` — **no status function**.
   ⛔ **Still open and NOT closed by this:** whether a recovered alert renders ✅ or as a second 🚨
   (`alert.status`'s value vocabulary is unverified). §2 item 2 and §5 still own that.
3. ~~**Which name form does the Metrics picker show** — `geoconflict_profile_login_requests` or
   `login_requests`? §1. Record it once and the ambiguity dies.~~
   **✅ RESOLVED 2026-09-17 — the PREFIXED, UNDERSCORED form** (`geoconflict_profile_db_pool_waiting`
   etc.; full list in §1). **`0274/plan.md:192` was right; `0274/brief.md:20` was an abbreviation.**
   🚨 And the same look revealed that **`login_requests`, `players_created` and `session_rejected` are
   absent from the picker entirely** — never incremented, no series. See §1, §4, §5.
4. **Pause A1 for the `0217` go-live?** §4 — that deploy will look exactly like the attack A1 watches for.
   ⏳ **STILL OPEN.** (Not urgent while A1 is blocked on `players_created` not existing — but it must be
   answered before A1 is built, not after.)
5. ~~**Drill fixture: D (forged tokens) or the `create_enabled` flip?** §5 — I recommend D.~~
   **✅ SETTLED BY EXECUTION 2026-09-17 — D was built and run, and it PASSED both halves** (🚨 firing,
   then ✅ resolved, owner-confirmed). The ordering constraint held: the junk-token requests came
   **before** the monitor was created, and that is what made the metric appear. One deviation from the
   table in §5 worth carrying: **a 1-minute window was used, not 5** — that is what makes it clear
   quickly. Full record in §5 and in the
   [alert delivery runbook](../alert-delivery-runbook.md).

### Also observed on 2026-09-17, recorded in the runbook rather than here

- 🚨 **A UI trap for whoever builds A1–A4 and A6:** the Create button fails with *"at least one metric is
  required"* unless the metric row is **committed by clicking its green tick**. A selected-but-uncommitted
  row looks complete and is not — the first create attempt silently did nothing and was caught only by
  re-reading the monitor list. **Re-read the list after every create.**
- 🚨 **Eight default `Notify on all errors` monitors (ids 1–8) are active, holding over 500,000 open
  alerts between them. None is attached to the Telegram channel.** **OWNER RULING 2026-09-17: leave them,
  and never wire the Telegram channel to them.** ⛔ Not precedent. What those alerts actually are was not
  investigated and is **unknown**. Details and the structural reason this is safe:
  [alert delivery runbook](../alert-delivery-runbook.md).
- 📝 **Owner to-do:** the live channel's stored JSON payload still contains `{{ .value }}`,
  `{{ .window }}` and `{{ .threshold }}` — harmless (the relay filters them) but misleading, and they
  should be removed. **The owner must do it, not an agent** — that field also holds the shared secret.

---

**Related:** [`0274` brief](../../tasks/backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) ·
[`0277` brief](../../tasks/done/0277-uptrace-alert-delivery-to-telegram/brief.md) ·
[alert delivery runbook](../alert-delivery-runbook.md) ·
[ADR-114](../decisions/adr-114-profile-server-is-the-admin-server-alert-relay-lives-there.md) ·
[ADR-113](../decisions/adr-113-profile-internal-player-id-and-platform-identities.md) ·
[`0284` brief](../../tasks/backlog/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
