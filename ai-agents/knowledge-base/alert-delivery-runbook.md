# Alert delivery runbook — monitoring → operator Telegram topic

Task `0277`. Covers the alert relay on the profile/admin box, the forum-topic routing it shares with
the name-change notifications, and the traps that make alerting fail **silently**.

⛔ **No hostnames, IP addresses, chat ids, topic ids or secrets appear in this file, deliberately.**
Every one of them lives in the gitignored deploy env files, or on the box.

---

## What it is

The monitoring stack cannot post into a Telegram **forum topic** by itself, so alerts go through a
small relay on the profile box:

```
monitoring alert → webhook channel → POST /internal/v1/alerts/webhook → Telegram (Alerts topic)
```

- The path is **all lowercase**. A capitalised variant is **404** by design (task `0276`).
- It is mounted under `/internal/` **solely** to inherit nginx's existing IP allowlist. ⚠️ Read the
  403 trap below before treating that as pure upside.
- The shared secret travels **in the JSON body**, not in a header: the monitoring stack's webhook
  sends exactly two headers (`User-Agent`, `Content-Type`) and cannot be given a custom one.

---

## 🚨 The trap that makes alerting die silently

**A `401`, `403` or `404` response permanently disables the notification channel.** Verified from the
shipped binary: all three mark the channel disabled, and it then refuses to send at all. **Every later
alert is dropped at source, forever, with no retry, and nothing tells you.**

Two consequences you must hold on to:

1. **The relay never returns 401/403/404.** A wrong, missing or unparseable secret answers **2xx**,
   drops the message, counts it, and raises a separate notice. This looks wrong at a glance — it is
   deliberate, and it is the whole reason the route is shaped the way it is. Do not "fix" it into a 401.
2. 🚨 **The nginx allowlist answers 403 on a source-IP miss.** **If the monitoring box's egress
   address ever changes, the first alert after that change disables the channel permanently** — and
   the symptom is silence, not an error.

   ⇒ **When the monitoring box's IP changes, migrates, or is rebuilt: update
   `PROFILE_INTERNAL_ALLOW_IPS`, redeploy the profile box, and then re-enable the webhook channel in
   the monitoring UI.** Re-enabling is a separate step; fixing the IP alone does not undo the disable.
   _(Owner ruling B, 2026-09-17 — risk accepted, documented here.)_

   The deploy prints the allowlist every run, and now warns loudly when it is **empty** (empty renders
   a bare `deny all`, i.e. 403 for everyone).

### What does NOT catch this — do not rely on any of it

- **`profile-checks.sh` cannot.** The only value it could compare the deployed allowlist against is the
  one the same deploy just wrote — a value compared with itself. It would report `OK` while the real
  address had moved.
- **The daily name-change digest (`0283`) cannot, and is actively misleading.** It is produced on this
  box and sent straight to Telegram: it never touches the monitoring stack, never crosses nginx, and
  never arrives from the monitoring box's address. **You would get a daily "the bot works" message
  while every alert was dead.**
- The evidence does exist and nothing reads it: the monitoring stack stores every attempt's response
  status, so a run of 403s sits there unread. Same shape as `0219`.

**A real guard is a follow-up task**: a scheduled synthetic probe from the monitoring box to this
route, plus a marker-age check in `profile-checks.sh` that fails to the external dead-man's switch.
Until it lands, the risk above stands at full size.

---

## Configuration

| Variable                      | Where       | Notes                                      |
| ----------------------------- | ----------- | ------------------------------------------ |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | profile box | Shared secret. 🚨 **Never box-generated.** |
| `TELEGRAM_TOPIC_ALERTS`       | profile box | Blank ⇒ General                            |
| `TELEGRAM_TOPIC_NAME_CHANGES` | profile box | Blank ⇒ General                            |

All three are persist-or-reuse: blank on a redeploy **reuses** the value already on the box. To clear
one, remove its persist file on the box and redeploy.

🚨 **`PROFILE_ALERT_WEBHOOK_TOKEN` must never be minted by the box.** A secret only the box knows is a
secret the sender does not, so every alert fails its check and is dropped — silently, forever. This is
the `PROFILE_INTERNAL_TOKEN` trap (`0182`) exactly. A harness assertion now fails the build if it is
ever put into `generate` mode.

⛔ **There is deliberately no feedback topic on this pipeline.** Player feedback is sent by the **game**
server; a feedback topic here would be config nothing reads, and its presence would read as evidence
that the feedback-topic move had already shipped. It has not.

**Blank topic ⇒ General**, which is exactly the pre-`0277` behaviour. An unset topic degrades to
"works, in the wrong room" — never to "fails". ⚠️ But a **wrong** topic id makes Telegram reject the
message and the notification is **lost**, not mis-filed. Never use `0` or a space as a placeholder.

---

## Bringing it up, in order

1. Set the three variables in the gitignored deploy env files.
2. Deploy the profile box (`build-deploy-profile.sh`).
3. Create the webhook channel in the monitoring UI: the exact **lowercase** URL, plus a payload
   carrying the secret (and, optionally, static display strings — see below). ⛔ Not placeholders.
   Leave `Optional Condition` **empty** — see below.
4. Create each monitor (alert rule) and **tick the shared channel in the monitor's own
   `Notification channels` picker** — see *Creating a monitor* below. A channel alone delivers nothing.
5. Force an alert and confirm it arrives in the Alerts topic. **Use the drill procedure below** — it
   proves the ✅ recovery half too, which a force-and-delete does not.

⚠️ **Between steps 2 and 3 a fired alert reaches nobody.** That gap is expected, not a defect.

🚨 **Owner ruling, 2026-09-17: ONE SHARED CHANNEL for every monitor, and NO numbers in the message.**
The alternative offered was one channel per rule carrying per-rule `threshold`/`window` strings; the
owner chose shared. **Consequence: the message carries no `Threshold:` line at all, so the monitor
NAME is the only place a number can ever appear.** ⇒ **Name every monitor so its heading alone is
actionable** — e.g. `profile · DB pool saturated (>0 waiting, 5 min)`. This was previously only a
recommendation (design report §2); it is now an owner ruling.

### The payload template

The custom payload is **merged** into the body, nested under a top-level `payload` key — it does not
replace it. The relay reads the rule name, status, timestamp and **link** from the sender's own
top-level fields.

🚩 **The payload is passed through VERBATIM and is never templated.** Confirmed by the first real
production call, 2026-09-17. The sender stores it without inspecting it, so it never substitutes
anything into it either: a value of `{{ .value }}` is delivered as those literal characters, and the
operator's message reads `Value: {{ .value }}`. ⛔ **Do not paste placeholder syntax into the payload —
there is no syntax that works.** (The relay now filters such values out rather than showing them, but
the right fix is not to write them.)

⇒ **The measured value, its threshold and its window are NOT OBTAINABLE.** The sender's own top-level
fields carry none of them, and the payload cannot compute them. **This is why the message carries a
link instead**: one tap lands on the chart, where the numbers are.

| Key         | Required? | Purpose                                                             |
| ----------- | --------- | ------------------------------------------------------------------- |
| `secret`    | **yes**   | must equal `PROFILE_ALERT_WEBHOOK_TOKEN`                            |
| `threshold` | no        | a **static** string you hardcode for that one monitor, e.g. `"300"` |
| `window`    | no        | a **static** string, e.g. `"10 min"`                                |
| `value`     | no        | only useful if you have a static string for it — usually you do not |

A static string is the one thing that does survive verbatim passthrough, because nothing has to
substitute it. Every display key is optional: a missing one degrades the message, it never drops the
alert. A key still containing `{{` or a `PASTE_…` literal is dropped from the rendered message.

⚠️ **With the shared-channel ruling above, `threshold` / `window` / `value` are not used** — one shared
payload cannot carry per-rule numbers. Keep the monitor name carrying the number instead.

📝 **Open to-do — for the OWNER, not an agent (observed 2026-09-17).** The live channel's stored JSON
payload **still contains `{{ .value }}`, `{{ .window }}` and `{{ .threshold }}`**. They are harmless
today (the relay filters them out, so the operator never sees them), but they are misleading to anyone
reading the channel config — they look like working templating and are not. **They should be deleted.**
⛔ **The owner must do this, not an agent: the same payload field holds the shared secret**, so opening
and editing it means handling the secret.

### The channel's `Optional Condition` field — leave it EMPTY

**Observed live 2026-09-17: ours is empty, and that is correct. Keep it empty.** The field is a
**filter** on which alert events reach the channel; empty filters nothing, so every event — including
the recovery one — gets through.

Its function vocabulary, from the **current public vendor docs**: `monitorName()`, `alertName()`,
`alertType()` (returns `"error"` or `"metric"`), `attr(key)`, `hasAttr(key)`. **There is no status
function** — you cannot filter on firing-vs-resolved here even if you wanted to.

⚠️ **Caveat, stated plainly: that vocabulary is the current published vendor documentation, and this
deployment runs 2.0.2 — it may differ.** It was not read off the running form.

⇒ This closes one worry: a condition that covered only the "created" event would have silently killed
the ✅ recovery message. An **empty** condition cannot do that.

✅ **And the second worry is now closed too, by the drill of 2026-09-17** (next section): a recovered
alert arrives with **`alert.status` = `closed`**, which the relay already matches, so the recovery
renders as ✅. This paragraph previously said that was unverified. It no longer is.

### Creating a monitor (observed live, 2026-09-17)

**1. The metric name in the picker is the PREFIXED, UNDERSCORED form.** Settled — the picker offers,
verbatim:

| Name in the picker | Type |
| --- | --- |
| `geoconflict_profile_alert_relay` | counter |
| `geoconflict_profile_db_pool_waiting` | gauge |
| `geoconflict_profile_http_duration` | histogram, milliseconds |
| `geoconflict_profile_login_create_enabled` | gauge |
| `geoconflict_profile_process_cpu_usage` | gauge, `1` |
| `geoconflict_profile_process_memory_heap_used` | gauge, bytes |
| `geoconflict_profile_process_memory_rss` | gauge, bytes |

⇒ **`0274/plan.md:192`'s prediction was right** (dots → underscores, prefix kept).
`0274/brief.md:20`'s un-prefixed list was an **abbreviation**, not what the UI shows. Recorded here so
nobody re-litigates it. **The advice stands regardless: pick from the autocomplete, never hand-type.**

**2. 🚨 Three metrics are ABSENT from the picker: `login_requests`, `players_created`,
`session_rejected`.** All three are counters that have **never been incremented** — no real player has
ever logged in, so no series exists and the picker does not offer the name.

⇒ **You cannot write a rule against a name the picker does not offer.** Concretely: **the A1
creation-spike rule CANNOT BE BUILT until the first player is created.** This is the "a rule pointed at
a name that does not exist sits there silent forever" failure — **observed live, not predicted.** It
also means the recommended drill fixture's metric (`session_rejected`) does not exist yet — though the
first junk-token request would create it.

> ✅ **That last clause is now VERIFIED, 2026-09-17** — it was a prediction when written. The first
> junk-token request **does** create `geoconflict_profile_session_rejected`, and it then appears in the
> picker. ⇒ **Fire the traffic first, create the monitor second.** See the drill section below.

**3. The notification channel is chosen ON THE MONITOR FORM.** The monitor form carries its own
`Notification channels` picker. **Each monitor opts in individually.** A channel cannot be picked up by
a monitor that did not select it. (This is what makes the default-error-monitor rule below safe **by
construction**, not by memory.)

**4. 🚨 The UI trap: the Create button fails with "at least one metric is required" unless the metric
row is COMMITTED by clicking its green tick.** A selected-but-uncommitted metric row looks complete and
is not. The first create attempt on 2026-09-17 silently did nothing and was only caught by re-reading
the monitor list afterwards. ⇒ **After creating any monitor, re-read the list and confirm it is there.**

#### The one rule that exists today

`profile · DB pool saturated (>0 waiting, 5 min)` — monitor id 9, status active, attached to the
`alerts-to-telegram` channel.

| Field | Value as built |
| --- | --- |
| Metric | `geoconflict_profile_db_pool_waiting` |
| Aggregation | **`avg`** (the UI default) |
| Grouping interval | 1 minute |
| Check | the last 5 points (5 minutes) |
| Max allowed | 0 |

⚠️ **Caveat on the aggregation.** The design specified `max`; the UI default `avg` was kept. On a
**non-negative gauge with a `>0` threshold the two are equivalent** — any non-zero sample lifts the
average above 0. **They are NOT equivalent if the threshold ever moves off 0.** If you raise the
threshold, switch the aggregation to `max` first, or the rule quietly means something else.

The gauge read flat 0 across the preceding hour, so the rule is armed against a genuinely quiet series.

### 🚨 Operator rule: never wire this channel to the default error monitors

**Eight default `Notify on all errors` monitors (ids 1–8) are active, holding over 500,000 open alerts
between them** (136722, 136876, 120943, 101346, 81284, 64614, 11536, 1185 — observed 2026-09-17).
**None is attached to the Telegram channel.**

⛔ **OWNER RULING, 2026-09-17: leave them in place, and NEVER wire the Telegram channel to them.** The
owner was offered leave-them / investigate-first / pause-or-delete-them, and chose to leave them, on the
reasoning that they harm nothing while unattached and that the rule belongs written down where the next
person will look. ⛔ **Not precedent** — one ruling, this case.

Why this is safe rather than fragile: per point 3 above, **a monitor must opt into a channel**. These
eight cannot pick the Telegram channel up by accident. The rule is therefore structural; it only breaks
if someone actively ticks the channel on one of them. **Don't.**

⚠️ **What those 500 K open alerts actually are was not investigated** — that is unknown, deliberately
left so by the same ruling.

### What the operator actually receives

```
🚨 Geoconflict · profile · Player creation spike
Status: firing
Since: 2026-09-17 16:56 UTC
→ open the alert          ← a link to the chart
```

A recovered alert uses `✅ … — resolved` and `Status: resolved`. The link is omitted entirely if the
sender supplies no usable URL — the message still sends.

⚠️ **A naming detail, observed 2026-09-17:** the alert name the monitoring stack generates **appends
the aggregation alias** to the monitor name. A monitor named
`DRILL — delete me — rejected sessions (>0 / 1 min)` produced the heading
`DRILL — delete me — rejected sessions (>0 / 1 min): rejected`. ⇒ **The monitor name is not quite the
whole heading.** Name monitors expecting that suffix.

---

## ✅ PROVEN END TO END — the recovery drill, 2026-09-17

**Both halves of the alert path are now confirmed live: a 🚨 firing message and a ✅ resolved message
both arrived in the Alerts topic.** The owner watched the topic and confirmed both.

### The fact that closes the long-standing residual

🚩 **`alert.status` = `closed`.** **CONFIRMED by observation, not designed.** The relay
(`src/profile-server/AlertRelay.ts:141`) matches `closed` / `resolved` and therefore renders the
recovery correctly — but it was written to match those two values **without anyone knowing which value
Uptrace 2.0.2 actually emits**. It happened to be right. ⇒ **The residual "a resolved alert may render
as still firing" is CLOSED.**

Also observed in the same drill:

| Field | Observed value |
| --- | --- |
| `alert.status`, recovered | `closed` |
| `alert.status`, firing | `open` |
| `alert.type` | `metric` |

### The working drill procedure — reusable, run it again whenever you need to

1. Send ~20 requests to the **public, read-only** `GET /v1/profile` with a junk Bearer token. Each
   answers **401** and increments `session_rejected` with `reason = invalid`. **No writes, no rows, no
   restart**, repeatable in seconds.
2. 🚩 **That first request CREATES the metric in the monitoring stack.**
   `geoconflict_profile_session_rejected` does **not** appear in the metric picker until it has been
   incremented once. ⇒ **Fire the traffic BEFORE trying to create the monitor.** *(This ordering was
   recorded as **unverified** in the earlier pass of this runbook. It is now **verified** — it works.)*
3. Create a throwaway monitor on that metric: `perMin(sum(...))`, grouping interval **1 minute**, check
   **the last 1 point (1 minute)**, **max allowed 0**, attached to the alerts channel. **The short
   window is what makes it clear quickly.**
4. Send a second burst → **it fires**.
5. **Stop sending → it closes by itself.** No deletion, no restart — a **real recovery event**.
6. Delete the throwaway monitor. *(Verified: the other monitors were unaffected.)*

### 🚨 A defect the drill found — the fixture written into `0274`'s plan cannot pass

`0274`'s plan specifies the drill fixture as an **always-true rule** (`process.memory.rss > 1`).
⛔ **That fixture cannot pass a recovery drill.** An always-true rule **never clears**, and **deleting a
monitor is not a recovery event**, so **no ✅ is ever generated**. Run as written, the drill would have
reported green while proving only the **firing** half.

⇒ **Use the fixture above instead.** **The generalisable lesson, not a one-off:** a recovery drill needs
a rule whose **data** returns below threshold on its own. A rule that cannot go false, or one you
"clear" by deleting it, proves half the path and looks like it proved all of it.

### ⚠️ Bounds — what this PASS does NOT cover

- ⛔ **It does NOT discharge `0274` amendment A1**, which requires proving delivery **after an idle
  period** (the stale-connection defect). **Both bursts here were minutes apart on a warm connection.**
  A1 stands.
- ⛔ **It does not prove SUSTAINED delivery.** `0283`'s daily digest remains the only non-circular proof
  of that. Unchanged.
- ⛔ **It says nothing about the 403 channel-disable trap.** That remains `0284`'s job and **stands at
  full size**.

### 📝 A naming alias, so nobody hunts for a section that does not exist

This drill is **`0274` plan §7.6**. It has been referred to as **"§8"** in several places, including
`0277`'s review ledger. **Same thing — there is no §8 drill.**

---

## Behaviour worth knowing before it surprises you

- **Several messages per one alert is correct.** Dedupe is keyed on the alert-**event** id, and
  `created` / `status-changed` / `recurring` are separate events with separate ids. A recurrence must
  not be suppressed.
- **An unresolved alert NAGS — it does not go quiet.** The monitor form's `Notification repeat interval`
  (Repeat strategy: **Default**) states: the interval starts at **15 minutes** and **doubles every 3
  notifications**, capped at **24 hours** — so 15m, 15m, 15m, 30m, 30m, 30m, 1h, … (observed on the form,
  2026-09-17). ⇒ A firing alert you leave alone keeps messaging you, with the gaps widening. Expect it
  before it surprises you.
- **Dedupe is in-process.** A restart between an attempt and its retry delivers a **duplicate**. That
  is the correct way round — a duplicate alert beats a lost one.
- **The retry budget is ~26 hours** (32 attempts, 60 s → 1 h backoff). Only a 2xx stops it. The relay's
  dedupe window is deliberately longer than that.
- **The relay answers before it sends.** A Telegram failure therefore happens _after_ the response and
  can never be reported back through the status code. The one retry inside the send helper and the
  `alert.relay` counters are the entire answer to that.

## Security

- 🚨 **The secret is recoverable from the monitoring stack's own stored notification history**, not
  just its config screen: it persists the full outbound JSON per attempt. **Rotating the secret is not
  erasure** — the old value survives in that history until it ages out.
- The relay's response body is a fixed constant and echoes nothing from the request, because the first
  100 bytes of every response are persisted in that same history.
- Anyone with access to the monitoring stack's channel config can read the secret. It is separate from
  `PROFILE_INTERNAL_TOKEN` precisely so that exposure is bounded.

## What is still unproven

✅ **What is no longer on this list:** the **recovery message form**. Proven live 2026-09-17 — see the
drill section above. `alert.status` = `closed`, the relay matches it, the ✅ arrived.

⚠️ **Delivery after an IDLE period is unproven** (`0274` amendment A1). The drill's two bursts were
minutes apart on a warm connection, so the stale-connection defect `0061` describes was never
exercised. Fire once, wait 30–60 min, fire again — that second firing is the test.

⚠️ **Sustained delivery is unproven until `0283` lands.** The counters here catch an _intermittent_
failure (the next alert gets through carrying the news) and a _sustained_ one **not at all** — a rule
on "the alert path failed" would travel the alert path. The only non-circular proof is a message that
sends unconditionally on a schedule, which is `0283`'s daily digest (ruled to send even at zero count
precisely so it doubles as a heartbeat). ⚠️ And note the limit above: that digest proves **Telegram**
works, never that the **monitoring → relay** hop does.
