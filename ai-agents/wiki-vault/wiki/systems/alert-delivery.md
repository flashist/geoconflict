# Alert Delivery — monitoring alert → relay on the admin box → operator Telegram topic

**Layer**: server (profile/admin box) + telemetry box
**Key files**: `src/profile-server/AlertRelay.ts`, `src/profile-server/Routes.ts`,
`src/core/notifications/TelegramNotifier.ts`, `setup-profile.sh`, `setup-telemetry.sh`,
`profile-checks.sh`, `tests/profile-checks.sh`, `tests/scripts/profile-deploy-hardening.test.sh`

> 🆕 **Added 2026-09-18 by the sync that closed this vault's alerting gap.** Before this page the vault
> had **no entry of any kind** for the alert relay, `0277`, `0284` or ADR-114 — a producer checked and
> recorded the vault as behind. Ground truth lives in
> `ai-agents/knowledge-base/alert-delivery-runbook.md` (the operator's file, and the one to read before
> touching a box) plus the closed tasks' artifacts.
>
> ⛔ **No hostnames, IP addresses, chat ids, topic ids, tokens or endpoints appear on this page,
> deliberately** — the runbook opens with that rule and the vault honours it. Metric names, monitor
> names, file paths, HTTP status codes and variable names are fine.

## Summary

The monitoring stack (Uptrace 2.0.2 on the telemetry box) **cannot post into a Telegram forum topic by
itself**, so alerts travel through a small relay on the profile/admin box:

```
monitoring alert → webhook channel → POST /internal/v1/alerts/webhook → Telegram (Alerts topic)
```

Three Telegram topics were ruled by the owner: **Alerts**, **Feedbacks**, **Name Changes**. Alerts and
name-change notices ship with a **profile deploy**; the feedback sender's move to its own topic is
**deliberately deferred** to a task of its own because it needs a *game* deploy and touches the only
Telegram path proven working in production. Until then feedback arrives in **General**, which is a
working destination, not a breakage.

**Status of the path (2026-09-18):** ✅ **proven end to end** — a real metric alert fired, reached the
owner's Alerts topic, cleared itself, and the ✅ recovery message arrived (drill, 2026-09-17,
owner-watched). An **hourly liveness probe** (`0284`) now guards the channel's worst failure mode, and
was itself drilled on 2026-09-18 with the external dead-man's switch paging the owner by email.

⛔ **What is proven is the path, not the coverage.** Only **one** alert rule exists today. See
*Alert rules A1–A6* below.

## Architecture

### Why a relay at all — three constraints

1. **Telegram blocks Russian IPs**, and every VPS in this project is reg.ru / Moscow. The project's
   answer is an **HTTP egress proxy the owner controls** (`TELEGRAM_PROXY_URL`), which gates by source
   address **at its own application layer**. ⚠️ **A TCP connect test proves nothing** — before the admin
   box was added to that allow list it could open a socket to the proxy while the proxy refused to
   forward.
2. **Uptrace 2.0.2's webhook channel sends exactly two headers** (`User-Agent`, `Content-Type`) and has
   **no custom-header field** — read out of the deployed binary's DWARF symbols, not guessed. So the
   relay's shared secret **must** travel in the JSON body. Not a header, and not the URL (a URL secret
   would land in nginx access logs and be displayed in the channel config).
3. **Uptrace cannot target a forum topic.** The vendored library supports `message_thread_id`; Uptrace
   does not surface it. ⚠️ Strong but **not conclusive** — read from the binary, the notifier was not
   decompiled.

### Where the relay lives, and why

On the **profile server, which ADR-114 makes this project's admin box** — see
[[decisions/adr-114-admin-server-alert-relay]]. It is mounted behind the existing `/internal/` boundary
(nginx source-IP allowlist + a constant-time secret comparison), the same boundary every other internal
route uses.

### The response contract — the part that reads wrong and is right

> 🔑 **The relay is fail-closed on *delivery*. The relay is NEVER fail-closed on the *HTTP status*.**

- A wrong, missing or unparseable secret ⇒ **answer 200**, **drop** the message, count it, raise a
  separate notice. ⛔ **Do not "fix" this into a 401.**
- A transient internal failure ⇒ **5xx**, so Uptrace's retry budget works for us.
- 🚫 **The relay never echoes request content in its response body** — not the secret, not the id, not
  the rule title, not an exception message. Responses are fixed constants.

The status code is **not a verdict the relay renders; it is an instruction Uptrace obeys** — 2xx means
*stop retrying*, anything else means *try again*. Any rule that assigns a status for a reason other than
"should Uptrace retry?" is a bug.

### The webhook contract, read out of the Uptrace 2.0.2 binary (verified)

Every fact here binds to **that build**; a version bump re-opens all of them.

| Fact | Consequence |
|---|---|
| The custom payload is **merged**, nested under a top-level `payload` key — it does not replace the body | The relay reads its secret from `payload`; Uptrace's own fields stay top-level. **Key collision is impossible by construction** |
| `payload` carries no `omitempty` — always present, `null` when unset | Schema may rely on the key; must tolerate `null` |
| **`id` is stable across retries** — it is the alert-**event** row id | `id`-based dedupe is mandatory and vindicated |
| `created` / `status-changed` / `recurring` are **separate events with separate ids** | **Several messages per alert is correct.** ⛔ Never write "one message per alert" |
| `id` and `alert.id` arrive as **JSON strings**, not numbers | A numeric schema would reject **every** alert |
| `alert.state` and `alert.status` carry the same value; `state` is a legacy alias | Read `status`. Do not branch on both |
| `log` is **absent entirely** for metric monitors | A1–A6 are all metric monitors ⇒ `log` is absent for every alert this channel will ever carry |
| Retry config `MaxRetries 32`, `MinBackoff 60 s`, `MaxBackoff 1 h` ⇒ **~26 hours**; only 2xx counts as success | *(strongly indicated — constants read from the binary, not observed running)* |

### Configuration (variable names only)

| Variable | Where | Notes |
|---|---|---|
| `PROFILE_ALERT_WEBHOOK_TOKEN` | profile box | Shared secret. 🚨 **Never box-generated** |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | monitoring box | The **same** secret, a **second copy** (`0284`). ⚠️ No `"` and no `\` — it is embedded in the probe's JSON body, and `setup-telemetry.sh` now **aborts the deploy** if the token holds either, naming the variable and never the value |
| `TELEMETRY_ALERT_PROBE_URL` | monitoring box | The full lowercase webhook URL — **copy** the string already in the channel config, do not rebuild it. Blank ⇒ probe off |
| `TELEGRAM_TOPIC_ALERTS` | profile box | Blank ⇒ General |
| `TELEGRAM_TOPIC_NAME_CHANGES` | profile box | Blank ⇒ General |

All are **persist-or-reuse**: blank on a redeploy reuses the value already on the box.

🚨 **`PROFILE_ALERT_WEBHOOK_TOKEN` must never be minted by the box.** A secret only the box knows is a
secret the sender does not — every alert would fail its check and be dropped, silently, forever. **This
is the `PROFILE_INTERNAL_TOKEN` trap of `0182` exactly**; a harness assertion now fails the build if it
is ever put into `generate` mode.

⛔ **There is deliberately no feedback topic on this pipeline.** Player feedback is sent by the **game**
server; a feedback variable here would be config nothing reads, and would read as evidence that the
feedback-topic move had shipped. It has not.

⚠️ **Blank topic ⇒ General** — degrades to *"works, in the wrong room"*, never to *"fails"*. But a
**wrong** topic id makes Telegram reject the message and the notification is **lost**, not mis-filed.
Never use `0` or a space as a placeholder.

## Gotchas / Known Issues

### 🚨 The trap that makes alerting die silently

**A `401`, `403` or `404` reply permanently disables the notification channel.** Verified by
disassembly of the shipped 2.0.2 binary: all three call `NotifChannelGateway.Disable`, and `notifyChannel`
then refuses to send unless the channel state is `"delivering"`. **Every later alert is dropped at
source, forever, with no retry, and nothing tells you.**

That is why the relay never returns those codes — and it is also why **the nginx allowlist is the
exposure**: a source-IP miss answers **403**. If the monitoring box's egress address changes, is
mistyped, or is dropped from `PROFILE_INTERNAL_ALLOW_IPS` at a deploy, the **first alert after that
moment disables alerting permanently**, and the symptom is **silence**. A dead channel and a healthy
quiet system look identical.

⇒ **When the monitoring box's address changes, migrates, or the box is rebuilt: update
`PROFILE_INTERNAL_ALLOW_IPS`, redeploy the profile box, and then RE-ENABLE the webhook channel in the
monitoring UI.** Re-enabling is a **separate step** — fixing the address does not undo the disable.
*(Owner ruling B, 2026-09-17 — risk accepted knowingly, kept behind the allowlist for defence in depth.)*

### What does NOT catch this — do not rely on any of it

- ⛔ **`profile-checks.sh` cannot assert the allowlist.** The only value it could compare the deployed
  `allow` directives against is the one the same deploy just wrote — **a value compared with itself**. It
  would report a confident `OK` while the real address had moved. **A guard that cannot fail for the
  reason you built it is worse than none**, because it answers the question a reader would think to ask.
- ⛔ **The daily name-change digest (`0283`) cannot, and is ACTIVELY MISLEADING.** It is produced on the
  admin box and sent straight through the Telegram helper: it never touches the monitoring stack, never
  crosses nginx, and never arrives from the monitoring box's address. **You would get a daily "the bot
  works" message while every alert was dead.** ⛔ `0283` arriving is **not** evidence that alerting works.
  🚨 **UPDATED 2026-09-19 — THIS IS NO LONGER HYPOTHETICAL. The digest is deployed and two real messages
  have been watched arriving** ([[tasks/name-change-daily-digest]]). The misleading daily reassurance now
  **physically exists in the owner's Telegram**, so the discipline this bullet asks for is live, not
  anticipated.
- ⚠️ **The evidence exists and nothing reads it.** Uptrace persists every delivery attempt's response
  status; a run of `403`s sits on the telemetry box unread. **Same shape as `0219`** — the signal exists,
  nothing looks at it.

### The guard that DOES catch it — the alert-path liveness probe (`0284`)

An hourly cron **on the monitoring box** POSTs a probe to the same route, through the same allowlist,
with the same secret, from the same egress address a real alert leaves from. The relay checks the secret,
**writes a freshness marker, and sends nothing**. `profile-checks.sh` reads that marker's age in its
existing **daily 08:00 UTC** run; stale or missing ⇒ `FAIL` ⇒ the **external dead-man's switch**, a path
that touches neither the monitoring stack nor Telegram.

**Detection latency ~3 h best case, ~27 h worst**, bounded by the *daily* read, not the hourly probe —
making the probe more frequent does not shorten it. **Owner-accepted 2026-09-18**: the disable is
permanent either way, so faster detection only shortens how long you were blind.

🚩 **What the probe does NOT prove** — see [[tasks/alert-path-liveness-probe]] for the full list of
eight residuals. The loudest: ⛔ **it cannot see a channel that is ALREADY disabled** (it catches the
**cause** within ~24 h, not the **state**; that hole is filed as `0285`), it does **not** check the
secret the monitoring stack's own channel config holds (a second, separate copy), and it proves
**nothing about Telegram delivery** — the marker is written on receipt, before any send.

### Three ways the probe will surprise you

1. 🚩 **A rolled-back profile image predating `0284` never writes the marker.** The daily check then
   fails with `alert-path-probe`, which *looks* exactly like an allowlist fault. **Check the running
   image before hunting for a moved address.**
2. 🚩 **The shared secret must contain no `"` and no `\`** — now enforced at deploy time, not merely
   documented.
3. 🚩 **A future-dated marker used to read GREEN.** Clock skew between the relay's container and the
   box gave a *negative* age, read as fresh. It now FAILs and names the skew — **the same hole existed in
   the daily-backup marker check and was fixed there too.**

### Behaviour worth knowing before it surprises you

- **Several messages per one alert is correct** (dedupe is keyed on the alert-*event* id).
- **An unresolved alert NAGS.** The repeat interval starts at **15 min** and **doubles every 3
  notifications**, capped at **24 h** — 15m, 15m, 15m, 30m, 30m, 30m, 1h, …
- **Dedupe is in-process.** A restart between an attempt and its retry delivers a **duplicate** — the
  correct way round, a duplicate beats a loss.
- **The relay answers before it sends**, so a Telegram failure happens *after* the response and can never
  be reported through the status code. One retry inside the send helper plus the `alert.relay` counters
  are the entire answer to that.

### The payload is never templated

🚩 **The custom payload is passed through VERBATIM** — confirmed by the first real production call,
2026-09-17. A value of `{{ .value }}` is delivered as those literal characters and the operator's
message reads `Value: {{ .value }}`. ⛔ **There is no placeholder syntax that works.**

⇒ **The measured value, its threshold and its window are NOT OBTAINABLE.** The sender's top-level fields
carry none of them and the payload cannot compute them. **This is why the message carries a link
instead** — one tap lands on the chart, where the numbers are.

🚨 **Owner ruling, 2026-09-17: ONE SHARED CHANNEL for every monitor, and NO numbers in the message.**
The alternative offered was one channel per rule carrying per-rule `threshold`/`window` strings; the
owner chose shared. **Consequence: the message carries no `Threshold:` line at all, so the monitor NAME
is the only place a number can ever appear** ⇒ **name every monitor so its heading alone is actionable**,
e.g. `profile · DB pool saturated (>0 waiting, 5 min)`.

📝 **Open to-do for the OWNER, not an agent:** the live channel's stored payload still contains
`{{ .value }}` / `{{ .window }}` / `{{ .threshold }}`. Harmless (the relay filters them out) but
misleading — they look like working templating. **The owner must delete them, because the same payload
field holds the shared secret.**

### The recovery drill — reusable, and the fixture that cannot pass

✅ **Proven 2026-09-17, both halves.** The residual *"a resolved alert may render as still firing"* is
**CLOSED**: `alert.status` = **`closed`** on recovery (firing is `open`, `alert.type` is `metric`), which
`AlertRelay.ts` already matched — **it was written to match `closed`/`resolved` without anyone knowing
which value 2.0.2 emits, and happened to be right.**

The working procedure, reusable:

1. Send ~20 requests to the **public, read-only** profile GET route with a junk Bearer token. Each
   answers **401** and increments `session_rejected` with `reason = invalid`. No writes, no rows, no
   restart.
2. 🚩 **That first request CREATES the metric** — it does not appear in the picker until incremented
   once. ⇒ **Fire the traffic BEFORE trying to create the monitor.** *(Recorded as unverified in an
   earlier pass; now verified.)*
3. Throwaway monitor on that metric, 1-minute grouping, last 1 point, max allowed 0, attached to the
   alerts channel.
4. Second burst → **it fires**. 5. Stop sending → **it closes by itself** — a real recovery event.
6. Delete the throwaway monitor.

> 🚨 **A defect the drill found — the fixture written into `0274`'s plan CANNOT PASS.** That plan
> specifies an **always-true rule** (`process.memory.rss > 1`). ⛔ **An always-true rule never clears, and
> deleting a monitor is not a recovery event**, so no ✅ is ever generated. Run as written, the drill
> would have reported green while proving only the **firing** half.
> **The generalisable lesson:** a recovery drill needs a rule whose **data** returns below threshold on
> its own. A rule that cannot go false — or one you "clear" by deleting it — proves half the path and
> looks like it proved all of it.

📝 **Naming alias, so nobody hunts for a section that does not exist:** this drill is **`0274` plan
§7.6**. It is referred to as **"§8"** in several places including `0277`'s review ledger. **Same thing —
there is no §8 drill.**

### Creating a monitor — four things observed live

1. **The metric name in the picker is the PREFIXED, UNDERSCORED form** (`geoconflict_profile_…`), not the
   emitted dotted form. **Pick from the autocomplete, never hand-type.**
2. 🚨 **Three metrics are ABSENT from the picker** — `login_requests`, `players_created`,
   `session_rejected` — because all three are counters that have **never been incremented** (no real
   player has ever logged in, so no series exists). ⇒ **You cannot write a rule against a name the picker
   does not offer**, so **A1 cannot be built until the first player is created.** This is the
   *"a rule pointed at a name that does not exist sits there silent forever"* failure, **observed live
   rather than predicted.**
3. **The notification channel is chosen ON THE MONITOR FORM** — each monitor opts in individually. A
   channel cannot be picked up by a monitor that did not select it.
4. 🚨 **The Create button fails with "at least one metric is required" unless the metric row is COMMITTED
   by clicking its green tick.** A selected-but-uncommitted row looks complete and is not. ⇒ **After
   creating any monitor, re-read the list and confirm it is there.**

### 🚨 Operator rule: never wire this channel to the default error monitors

**Eight default `Notify on all errors` monitors are active, holding over 500,000 open alerts between
them.** None is attached to the Telegram channel. ⛔ **Owner ruling 2026-09-17: leave them in place, and
NEVER wire the Telegram channel to them.** Safe by construction (a monitor must opt into a channel), not
by memory. ⚠️ **What those 500 K open alerts actually are was NOT investigated** — unknown, deliberately
left so by the same ruling.

### Alert rules A1–A6 — designed, one built

Design: `ai-agents/knowledge-base/reports/2026-09-17-alert-rules-a1-a6-design.md`. **Owner ruling: build
two or three rules first, not six**, so the real noise level is visible before thresholds picked blind
get committed.

| | |
|---|---|
| Build first | **A5** — `geoconflict_profile_db_pool_waiting`, ✅ **BUILT 2026-09-17** (monitor id 9, active) |
| Build second | **A1** — player-creation spike. 🚨 **BLOCKED** — its metric does not exist in the picker yet |
| Defer | A2, A3, A4, A6 — each for its own reason |

📌 **UPDATED 2026-09-21 — WHERE THE DEFERRED RULES ACTUALLY LIVE NOW, because "deferred" hid two different
fates.** `0274` closed 2026-09-19 carrying these as named gaps:

- ➡️ **A4 has a task: `0288`** (*p95 of login latency > 750 ms for 10 min*), filed 2026-09-19 to the
  **Backlog board**, `🔲 Backlog`. See [[decisions/sprint-backlog]].
- 🔴 **A1, A2, A3 and A6 have NO TASK OF THEIR OWN.** They are deferred **for want of login traffic**, and
  ⛔ **nothing on any board tracks them** — so they are invisible to every status tool. ⚠️ **This is the
  gap most likely to be silently forgotten**; it is recorded here because the vault is the only place it
  currently appears.
- ➡️ **Delivery after an IDLE period — `0274`'s amendment A1, a DIFFERENT A1 from the alert rule A1 above —
  has its own task, `0289`**, filed 2026-09-19 to the **Sprint 4 board**, `🔲 Backlog`. 🚨 **Do not conflate
  the two things called "A1".** ⛔ **And `0283`'s digest does NOT discharge it**: its ~9.5 h gap is weak
  evidence toward idle delivery, not the test it asks for.

⇒ ⛔ **ONE alert rule exists (A5). That is unchanged by any of the above** — filing a task is not building a
rule.

Two mechanical facts settle the order: A5 and A1 are **single-series threshold rules** (A2/A3 need a
ratio, A4 a percentile, and **there is no evidence 2.0.2 can express either**), and **at today's traffic
every ratio and percentile rule is noise** — one error out of one request is 100 %.

⚠️ **A5 caveat on aggregation:** the design specified `max`; the UI default `avg` was kept. On a
**non-negative gauge with a `>0` threshold the two are equivalent** — but **NOT** if the threshold ever
moves off 0. **Raise the threshold and you must switch to `max` first**, or the rule quietly means
something else.

🚨 **A scheduled false positive for A1:** the day `0217` wires the game server, **every active player is
created at once**, and `players.created` counts both sources. **Decide deliberately whether to pause A1
for that deploy; do not discover it at 3 a.m.**

### What this channel does NOT cover — say it plainly

- **Game-box liveness.** Nothing here watches the game server.
- **Total admin-box failure.** A fully-down box emits no metrics, so no rule fires and no relay runs —
  **wherever the relay lives.** That belongs to the daily dead-man's-switch ping (admin box only) and to
  `0033`'s external heartbeat, **which is not built**.
- **Sustained delivery.** The counters catch an *intermittent* failure and a *sustained* one **not at
  all** — a rule on "the alert path failed" would travel the alert path. The only non-circular proof is
  `0283`'s daily digest. ✅ **UPDATED 2026-09-19 — that digest is BUILT, DEPLOYED AND OBSERVED DELIVERING**
  (two real messages, owner-watched; see [[tasks/name-change-daily-digest]]). ~~unbuilt~~ 📌 **struck, true
  when written.** ⛔ **But read what it covers, exactly: it proves TELEGRAM delivery from this box is alive,
  and NOTHING about this alert channel** — it never touches the monitoring stack, never crosses the
  allowlist and never arrives from the monitoring box's address. **A 403 could have permanently disabled
  alerting while both of those messages arrived perfectly.**
- **Delivery after an IDLE period** (`0274` amendment A1) — the drill's two bursts were minutes apart on
  a warm connection, so the stale-connection defect was never exercised. ⚠️ And the reverse is worth
  flagging: **an hourly probe keeps that hop warm, so it could MASK an idle-path defect** a rare real
  alert would hit.

### The fail-silent Telegram defect this relay refuses to inherit

**Both pre-existing Telegram senders hold one process-lifetime proxy connection pool and neither
retries** — `src/server/Master.ts` (one module-level `ProxyAgent`, two inline sends that log and
continue) and `src/core/notifications/TelegramNotifier.ts` (one agent per proxy URL, `catch` returns
`"network_error"`). When the pooled keep-alive connection dies — proxy restart, idle or NAT timeout —
the next send fails at the network layer with `TypeError: fetch failed` and **the message is lost
silently**.

**Reproduced in production by accident 2026-09-17**: feedback was arriving, the owner restarted the
proxy, the very next feedback failed with that exact error **while the player still received a `200`**,
and the following one succeeded. Topics were not enabled at the time, so Topics is excluded as a
variable. ⚠️ **This is the likely root cause of `0061` — a hypothesis reproduced BEHAVIOURALLY, not
confirmed in code.**

`0277` fixed it for all three consumers (alerts, name-change notices, player feedback) — **one fix,
three consumers** — but ⛔ **the feedback half is written and tested and UNSHIPPED** until the game
deploy. **Do not read "0061 is fixed" off `0277`.**

## Related

- [[decisions/adr-114-admin-server-alert-relay]] — the ADR that placed the relay on the admin box
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, which built and proved the relay
- [[tasks/alert-path-liveness-probe]] — task `0284`, the guard on the 403 channel-disable trap
- [[tasks/name-change-daily-digest]] — task `0283`, the *other* half: the only non-circular proof that **Telegram** delivery is alive. ⛔ **Proves nothing about this channel, and is ACTIVELY MISLEADING if read as if it did** — deployed and observed delivering 2026-09-19
- [[tasks/setup-profile-heredoc-root-command-execution]] — task `0282`, the root-command-execution defect in `setup-profile.sh`, the same script that configures this relay
- [[systems/telemetry]] — the monitoring stack the alerts come from, its retention cap and its certificate
- [[systems/player-profile-store]] — the admin box this relay runs on
- [[tasks/telemetry-cert-expired-renewal-cron]] — task `0257`, the other "nothing reads the log" failure on the same box
- [[decisions/sprint-4]] — the sprint that owns all of it
- [[decisions/adr-113-internal-player-id]] — the identity work that produced the `geoconflict.profile.*` metrics these rules watch, and whose monitoring slice made alerting a precondition of XP go-live
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`: why the relay's route is all-lowercase and why the allowlist is case-insensitive
- [[tasks/citizenship-name-change]] — task `0067`, the other sender on this box, which shares the topic routing and the connection fix
- [[tasks/container-log-retention]] — the sibling *"where the setting lives"* page for the same boxes' logs
- [[decisions/sprint-backlog]] — where `0258` (nothing reads the renewal log) and `0263` (the retention cap) sit
- [[systems/architecture-overview]] — the tier map, corrected to record that the profile box is the admin server and does export telemetry
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274`, which built the metrics and the single existing alert rule, ran the drill recorded above, and closed with four rules deferred
- [[decisions/sprint-5]] — where `0285` and `0289`, the two remaining alert-path checks, now sit
- [[systems/weekend-deploy-window]] — 🚨 the deploy window that writes `PROFILE_INTERNAL_ALLOW_IPS`: **this relay is the list's SECOND caller**, and every profile deploy in that window must carry the **full** list — ⛔ **append, never replace**, or the next alert's 403 disables the channel permanently
- [[decisions/sprint-backlog]] — where `0294` sits; ⚠️ it is a **profile deploy**, so it carries this same allowlist constraint
