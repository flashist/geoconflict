# Alert rule A4 — p95 of login latency > 750 ms for 10 min

## ID
0288

## Sprint
Backlog

*(**The board is an OWNER RULING**, given live in the `fkit lead` session 2026-09-19 and relayed to a
spawned `fkit-producer`: the alert is useful but not crucial for the citizenship/profile release, so it
is filed rather than sprinted. ⚠️ **The owner ruled the board and the reason. The owner did NOT rule a
rank** — see *Priority*.)*

## Priority
— *(the Backlog board is unranked by design; needing a rank is the signal to pull this into a sprint.
The `—` is the **producer's** call, consistent with every other row on this board, **not** an owner
ruling.)*

## Status
🔲 Backlog

## Owner
Unassigned

---

## Owner ruling, verbatim

> *"I suggest building it later, and to create a task and put it into backlog: the alert looks useful,
> but not crucial for the citizenship/profile release."*
> — **the owner**, live in the `fkit lead` session, **2026-09-19**.

**Hence: the Backlog board, not Sprint 4.**

---

## Context

### What A4 is, in plain terms

**If the slowest 1 in 20 logins takes more than 750 ms, and it stays that way for 10 minutes, send a
Telegram alert.**

A4 is one of the six alert rules designed for the profile backend in
[`ai-agents/knowledge-base/reports/2026-09-17-alert-rules-a1-a6-design.md`](../../../knowledge-base/reports/2026-09-17-alert-rules-a1-a6-design.md)
(the spec is **§6**; the A5 build record in **§3** shows what the monitor form actually looks like once
filled in). 🚨 **Read §6 in the report itself before building — do not work from this brief's summary
alone.** The report is the design; this brief is the scheduling decision and the current state of the
two blockers.

### Where A4 sits among the six rules

| Rule | State today (2026-09-19) |
|---|---|
| **A5** — `profile · DB pool saturated (>0 waiting, 5 min)` | ✅ **The only alert rule that exists.** Monitor **id 9**, active, attached to the `alerts-to-telegram` channel. |
| **A1, A2, A3, A6** | ⛔ **Deliberately deferred** by an owner ruling of **2026-09-17** — same no-traffic cause. **They have no task of their own.** |
| **A4** | 📌 **This task.** Joins the deferred set — **but, unlike the other four, as its own tracked brief.** That is the difference this brief makes and the reason it exists. |

🚨 **A metric appears in the Uptrace picker only after its counter is first incremented** — proven on
2026-09-17, when a burst of junk-Bearer requests created `session_rejected` out of nothing. A1, A3 and
A6 are blocked on exactly that: their metrics are **absent** because nobody has ever logged in.
✅ **A4 is NOT blocked on metric existence** — `http.duration` **is** present (4 timeseries observed in
the live picker, 2026-09-17). Worth stating plainly, because it is what separates A4 from A1/A3/A6.

---

## The two blockers, and their current state

🚨 **The design report gave TWO reasons A4 waits. They are now in DIFFERENT states. Conflating them is
the mistake that has already been made once on this task — do not repeat it.**

### Blocker 1 — "can Uptrace 2.0.2 even express a percentile?" ✅ **CLEARED 2026-09-17**

The design recorded percentile queries in the Uptrace 2.0.2 monitor form as **unconfirmed**
(`0274/plan.md:194` — *"Exact Uptrace query syntax is not confirmed"*).

**It is now confirmed.** `fkit-lead` typed **`p95($duration)`** into the aggregation field in the
**live** Uptrace UI and the chart re-rendered with real p95 data. **The aggregation field is free
text, which is why it works.**

⛔ **Record this as settled. Nobody should re-investigate whether Uptrace can do a percentile.**
⚠️ What was confirmed is that the *aggregation expression* is accepted and renders. Combining it with
the two attribute filters below was **not** separately exercised — expect to confirm that in the
monitor form while building, not to rediscover the percentile question.

### Blocker 2 — "at zero traffic the p95 IS one request" ❌ **NOT cleared. This is why the task exists.**

As of **2026-09-19** the live `players` table holds **zero rows and nobody has ever logged in** —
verified on the box the same day during [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md)
step 7.7.

With no traffic, **one cold-start request over 750 ms *is* the p95**, so the rule's only achievable
behaviour today is a **false page**.

🚨 **An alarm that can only cry wolf is worse than no alarm.** That is the precise failure this whole
alerting epic exists to avoid, and it is the entire reason A4 waits.

---

## Start condition — the thing that unblocks this

**Real login traffic exists.** Not a date. Not another task. **Traffic.**

**What "enough" looks like — the honest answer, in two halves:**

1. **A necessary floor that IS derivable, from arithmetic, not judgement:** a p95 is only distinguishable
   from *"the single slowest request"* once the evaluation window holds at least **20 samples**
   (1 ÷ 20 = 5 %). Below ~20 logins in the 10-minute window, the p95 **is** the maximum, and the rule is
   the false alarm described above. *(The design applies the same arithmetic to A3, which carries an
   explicit **"only when ≥ 20 requests"** guard — report §6.)*
2. ⚠️ **A sufficient figure is NOT derivable from any source available today, and this brief does not
   invent one.** There is **zero** login data in existence, so there is no basis for saying how many
   logins per 10 minutes make a 750 ms threshold *meaningful* rather than merely *arithmetically
   readable*. **Whoever picks this up should read the real distribution first** — look at
   `geoconflict.profile.http.duration` for `POST /v1/login` over a few days of genuine traffic — and
   only then decide whether 750 ms is the right line. Treat any number in this brief as a starting
   point, **except** the 750 ms itself, which is constrained by the histogram (see below).

---

## What to build

**One Uptrace monitor.** No code. No deploy. No repository change.

### The rule, from design report §6

| Field | Value |
|---|---|
| Metric | **`geoconflict.profile.http.duration`** (`src/profile-server/Telemetry.ts:228`) — ⚠️ **renders in the Uptrace picker with the dots as underscores**, i.e. `geoconflict_profile_http_duration` |
| Filter | **`route = "/v1/login"` AND `method = "POST"`** (`src/profile-server/Telemetry.ts:354-360`) — both, not one |
| Aggregation | **p95** — `p95($duration)` is the confirmed shape of the free-text aggregation field |
| Condition | **> 750 ms** |
| Hold | **10 min** |

🚨 **THE 750 ms THRESHOLD IS LOAD-BEARING AND IS NOT A ROUND NUMBER SOMEONE GUESSED.** The histogram
carries an explicit **750 ms bucket boundary placed there for this rule**. `src/profile-server/Telemetry.ts:51-58`
says so in terms:

> *"750 is load-bearing: alert A4 pages on the p95 of POST /v1/login crossing 750 ms, and a percentile
> can only be read off a boundary the histogram actually has."*

⛔ **Changing the threshold without moving that bucket boundary makes the rule unreadable** — the
percentile would be interpolated against boundaries the histogram does not have. If the traffic data
says 750 ms is the wrong line, the bucket list `HTTP_DURATION_BUCKETS_MS` must move **with** it, and
that is a code change plus a profile deploy, not a UI edit.

### Also do

- **Attach it to the `alerts-to-telegram` channel.** Built by
  [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) and **proven working** — a real
  metric alert fired and then cleared through it on 2026-09-17.
- **Fill the `threshold` and `window` payload strings** in the same style A5 uses (§3), so the Telegram
  message renders a readable line rather than a bare number.
- **Record the aggregation actually used**, the grouping interval, and how many points the monitor
  checks — A5's build (§3) diverged from its design on exactly this (`avg` kept instead of `max`) and
  the divergence had to be caveated after the fact. Write it down while building.

---

## Verification steps

1. 🚨 **RE-READ THE MONITOR LIST AFTER CREATING IT.** The Create button fails with
   *"at least one metric is required"* **unless the metric row's green tick is clicked to commit it** —
   a selected-but-uncommitted row **looks complete and is not**, and **the failure is silent**. This was
   hit for real when A5 was built; the first create attempt did nothing and was caught only by re-reading
   the list. Recorded at
   [`…a1-a6-design.md:591`](../../../knowledge-base/reports/2026-09-17-alert-rules-a1-a6-design.md).
   **The monitor is not built until you have seen it in the list.**
2. **Confirm the chart renders with the filters applied**, not just with the bare aggregation. The
   percentile expression is confirmed; the expression **plus** `route` and `method` filters is not.
3. **Confirm the p95 is being read off real traffic, not one request.** Check the request count in the
   same window before arming. If the window holds fewer than ~20 logins, **do not arm the rule** — that
   is the blocker above, not a detail.
4. **Record the as-built field values** (metric name as the picker spells it, aggregation expression,
   filters, grouping interval, points checked, max allowed, channel) in the worklog, the way §3 records
   A5's.
5. **Do not fire a synthetic drill through this rule to test delivery.** Delivery is already proven
   (`0277`, 2026-09-17). A drill here would mean generating fake login latency against the live profile
   box.
6. No secrets, hosts, IPs, domains, tokens, chat ids or topic ids in the brief, plan, worklog, or in any
   screenshot or pasted UI text.

---

## Notes

- 🚨 **Uptrace monitors and notification channels are UI-only state.** `setup-telemetry.sh` seeds
  **neither**. **A box rebuild silently deletes every alert rule** — including this one, once built.
  **A4 will not be captured in any deploy script.** Anyone building it should know that; anyone
  rebuilding the telemetry box should know that the rules do not come back on their own.
- **Depends on:** nothing in the repository. It depends on **real login traffic**, which arrives with the
  citizenship/profile go-live.
- **Blocks:** nothing. ⚠️ **It does not gate**
  [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) — the whole point of the
  owner's ruling is that A4 leaves that task as separately tracked work. **Do not report it as a
  blocker of anything.**
- **Related:**
  [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) (the delivery channel this
  attaches to) ·
  [`0284`](../../done/0284-alert-path-liveness-probe-a-webhook-403-permanently-disables-uptrace-alerting/brief.md)
  and [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) (proving the alert
  path stays alive — a different problem from this rule) ·
  [`0285`](../0285-detect-an-already-disabled-uptrace-notification-channel-read-its-own-channel-state/brief.md)
  (a disabled channel would silence this rule too).
- **Effort:** small once traffic exists — a single monitor in a UI. **The waiting is the work.**
- 🔒 No secrets, hosts, IPs, domains or tokens in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

## Open question for the owner

**None outstanding on this brief.** The owner ruled the board and the reason; the start condition is a
fact about traffic, not a decision. The one judgement deferred to build time — *whether 750 ms is the
right line for the real latency distribution* — cannot be asked today, because the data it needs does
not exist.
