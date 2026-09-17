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
   template carrying the secret and the display fields.
4. Force an alert and confirm it arrives in the Alerts topic.

⚠️ **Between steps 2 and 3 a fired alert reaches nobody.** That gap is expected, not a defect.

### The payload template

The custom payload is **merged** into the body, nested under a top-level `payload` key — it does not
replace it. The relay reads the rule name, status and timestamp from the sender's own top-level
fields, and takes these from `payload`:

| Key         | Purpose                                  |
| ----------- | ---------------------------------------- |
| `secret`    | must equal `PROFILE_ALERT_WEBHOOK_TOKEN` |
| `value`     | the measured value                       |
| `threshold` | the threshold it crossed                 |
| `window`    | the window it was measured over          |

All display keys are optional: a missing one degrades the message, it never drops the alert.

---

## Behaviour worth knowing before it surprises you

- **Several messages per one alert is correct.** Dedupe is keyed on the alert-**event** id, and
  `created` / `status-changed` / `recurring` are separate events with separate ids. A recurrence must
  not be suppressed.
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

⚠️ **Sustained delivery is unproven until `0283` lands.** The counters here catch an _intermittent_
failure (the next alert gets through carrying the news) and a _sustained_ one **not at all** — a rule
on "the alert path failed" would travel the alert path. The only non-circular proof is a message that
sends unconditionally on a schedule, which is `0283`'s daily digest (ruled to send even at zero count
precisely so it doubles as a heartbeat). ⚠️ And note the limit above: that digest proves **Telegram**
works, never that the **monitoring → relay** hop does.
