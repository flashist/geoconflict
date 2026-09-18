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

### The guard that DOES catch it — the alert-path liveness probe (task `0284`)

A cron **on the monitoring box** POSTs a probe to this same route every hour: the same URL, the same
nginx allowlist, the same shared secret, from the same egress address a real alert leaves from. The
relay checks the secret, writes a freshness marker, and **sends nothing**. `profile-checks.sh` reads
that marker's age in its existing **daily 08:00 UTC** run and, when it is stale or missing, fails to
the **external dead-man's switch** — a path that touches neither the monitoring stack nor Telegram,
which is exactly why it works where everything in the list above does not.

```
monitoring box host cron (hourly, :17)
  → POST {"payload":{"secret":…,"probe":"liveness"}} → the real webhook, through the real allowlist
     → relay: secret check → marker written, NOTHING sent
        → profile-checks.sh (daily) reads the marker age → stale ⇒ FAIL ⇒ POST $PING_URL/fail
           → external dead-man's switch pages the operator
```

| Piece | Where |
| --- | --- |
| Probe script + its hourly cron | `setup-telemetry.sh` → `/opt/uptrace/alert-probe.sh`, `/opt/uptrace/alert-probe.env` (both root-only) |
| Its two deploy variables | `TELEMETRY_ALERT_PROBE_URL`, `PROFILE_ALERT_WEBHOOK_TOKEN` — forwarded by `build-deploy-telemetry.sh`, persist-or-reuse on the box |
| Marker write | `src/profile-server/AlertRelay.ts` (`ALERT_PROBE_MARKER_PATH`), bind-mounted out by `setup-profile.sh` |
| The check | `profile-checks.sh` check 11, `alert-path-probe` |

**Detection latency: roughly 3 hours best case, ~27 hours worst**, plus the dead-man's switch's own
grace. It is bounded by the **daily** read, not the hourly probe — making the probe more frequent
does not shorten it. Accepted deliberately (owner ruling, 2026-09-18): the disable is permanent either
way, so faster detection only shortens how long you were blind; it does not change the repair.

#### 🚨 What the probe does NOT prove — read this before trusting a green line

- ⛔ **It cannot see a channel that is ALREADY disabled.** If a transient 403 disabled the channel
  yesterday and the address is fine today, the probe is green and alerting is still dead. **It catches
  the CAUSE within ~24 h, not the STATE.** Closing that hole is a **separate follow-up task** (owner
  ruling, 2026-09-18): it needs the monitoring stack's own channel state, whose 2.0.2 table and column
  names are unverified. **Until it lands, this hole stands.**
- ⛔ **It does not check the secret the monitoring stack's channel config holds.** The probe proves the
  copy **the cron** holds matches the relay. Those are two separate copies; the channel's could be
  wrong and every alert dropped while the probe stays green.
- ⛔ **It proves nothing about Telegram delivery** — the marker is written on receipt, before any send —
  and nothing about a message reaching a human. `0283`'s daily beat is the other half; neither covers
  the other.
- ⛔ **It does not prove a monitor is attached to the channel.** A monitor that never ticked the channel
  delivers nothing, and no probe can see that.
- ⛔ **It does not discharge `0274` amendment A1** (delivery after an idle period). Different hop — and
  worth flagging the reverse: an hourly probe keeps NAT/conntrack state on the monitoring→profile hop
  warm, so it could **mask** an idle-path defect on that hop that a rare real alert would hit.
- ⚠️ **One assumption, not proved:** the monitoring stack's container egress is SNAT'd to the host's
  primary address, so a host-run curl leaves from the same address. True for a single-public-address
  box with default Docker networking — this box's shape. **The drill verifies it**: removing the
  address from `PROFILE_INTERNAL_ALLOW_IPS` must fail the probe **and** disable the channel. If the
  probe fails while the channel survives, the two egresses differ and **this guard is not guarding**.
- ⚠️ **`npm run check:config-parity` does not reach telemetry variables.** The hardening harness
  (`tests/scripts/profile-deploy-hardening.test.sh`) is the only gate that those two deploy variables
  are forwarded at all — the same residual `0277` recorded.

#### Three ways it will surprise you

1. 🚩 **A rolled-back profile image predating `0284` never writes the marker.** The daily check then
   fails with `alert-path-probe`, which *looks* exactly like an allowlist fault. Check the running
   image before you go hunting for a moved IP. (The FAIL text names this case.)
2. 🚩 **The shared secret must contain no `"` and no `\`.** It is embedded in the probe's JSON body, so
   a quote or backslash breaks the request and the probe fails forever while alerting is fine. Keep it
   hex or plain alphanumeric — which is what it is today. ✅ **This is now enforced, not just
   documented** (owner ruling, 2026-09-18): `setup-telemetry.sh` aborts the deploy — before it touches
   anything on the box — if the token holds either character, naming the variable and never the value.
   It checks the value the deploy supplies **and** one already persisted on the box.
3. 🚩 **A future-dated marker used to read GREEN.** A clock skew between the relay's container and the
   profile box gave a *negative* age, which the check read as fresh. It now FAILS and names the skew
   (same fix applied to the daily-backup marker check, which had the identical hole).

#### When `alert-path-probe` fails

1. Check the running profile image is not a rollback predating `0284` (surprise 1 above).
2. Check the monitoring box's egress address against `PROFILE_INTERNAL_ALLOW_IPS`; fix and redeploy
   the profile box if it moved.
3. Run `/opt/uptrace/alert-probe.sh` by hand on the monitoring box and read its one-line log at
   `/var/log/uptrace-alert-probe.log`. **Exit 0 means the relay actually recorded the probe**, because
   the relay answers a probe with its own distinct status string. Any other outcome is a real failure
   and the log says which: `FAILED to reach …` (curl could not get through — the allowlist case), or
   `REACHED … but it did NOT record a probe` (it answered the deliberate 200 it uses for a DROPPED
   call, so the secret this box holds almost certainly differs from the profile box's).
   ⚠️ A bare 2xx is *not* success on this route — every drop is a 200 as well, by design.
4. 🚨 **Then re-enable the notification channel in the monitoring UI and confirm alerting is live.**
   If a real alert hit the same failure, the channel is already disabled. **Fixing the address does
   not undo the disable** — see the rule above, it is the same rule.

---

## Configuration

| Variable                      | Where       | Notes                                      |
| ----------------------------- | ----------- | ------------------------------------------ |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | profile box | Shared secret. 🚨 **Never box-generated.** |
| `TELEGRAM_TOPIC_ALERTS`       | profile box | Blank ⇒ General                            |
| `TELEGRAM_TOPIC_NAME_CHANGES` | profile box | Blank ⇒ General                            |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | monitoring box | The **same** secret, second copy (task `0284`). 🚨 **Never box-generated.** ⚠️ No `"` or `\` — it is embedded in JSON, and `setup-telemetry.sh` refuses to deploy a token containing either. |
| `TELEMETRY_ALERT_PROBE_URL`   | monitoring box | The full lowercase webhook URL — **copy** the string already in the channel config, do not rebuild it. Blank ⇒ probe off. |

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
6. Task `0284`'s liveness probe, **after** step 3 (it needs the exact channel URL to copy): set
   `TELEMETRY_ALERT_PROBE_URL` and `PROFILE_ALERT_WEBHOOK_TOKEN` in the gitignored telemetry env
   files, run `build-deploy-telemetry.sh`, then run `/opt/uptrace/alert-probe.sh` once by hand
   (exit 0 = the relay recorded it; see *When `alert-path-probe` fails* for what the other outcomes
   mean) and confirm the profile box's `checks.sh` reports `alert-path-probe … OK`.
   🚩 **Do this before the next 08:00 UTC run**, or that run pages about a marker nothing has written
   yet. From the profile box's deploy until the first probe lands, that check FAILS by design.

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
- ⛔ **It says nothing about the 403 channel-disable trap.** `0284`'s liveness probe (above) now guards
  the **cause** of that trap; the **already-disabled state** is still uncovered and is a separate
  follow-up.

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

⚠️ **Sustained delivery is still unproven — `0283`'s digest is BUILT but NOT YET OBSERVED ARRIVING.**
The code, the cron line and the marker check are in the tree as of 2026-09-18
(`ai-agents/knowledge-base/name-change-digest-runbook.md`), but nothing has been deployed and no
message has been seen. This line flips to *proven from `<date>`* only when the owner has watched a
real digest land in the Name Changes topic on the real box — not before. The counters here catch an
_intermittent_
failure (the next alert gets through carrying the news) and a _sustained_ one **not at all** — a rule
on "the alert path failed" would travel the alert path. The only non-circular proof is a message that
sends unconditionally on a schedule, which is `0283`'s daily digest (ruled to send even at zero count
precisely so it doubles as a heartbeat). ⚠️ And note the limit above: that digest proves **Telegram**
works, never that the **monitoring → relay** hop does.
