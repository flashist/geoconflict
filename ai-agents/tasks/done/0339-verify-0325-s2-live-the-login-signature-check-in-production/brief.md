# Verify 0325 S2 live — the login signature check in production (shadow mode)

## ID
0339

> ℹ️ **ID allocation, checked 2026-09-29 before filing.** Highest ID on all three boards (folder names and
> `## ID` fields agree): `0337`. **`0338` was skipped on purpose:** step 3 of
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md) (`grep -rn 0338 .claude/`)
> finds it in toolkit prose (`.claude/skills/fkit-status/dashboard.sh`, which names a toolkit task `0338`).
> `0339` and `0340`: no task folder, no `## ID` hit, no `.claude/` hit.

## Sprint
Sprint 7

📌 **Moved from Sprint 6 to Sprint 7 on 2026-09-29** — OWNER RULING **R1** given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: *"Close now, move 3 to Sprint 7"* — *"The producer moves 0339, 0341 and 0289 to Sprint 7 and closes Sprint 6 today. Same work, it just lives in Sprint 7."* [Sprint 6](../../../sprints/done/plan-sprint-6.md) was closed by `/fkit-sprint-done` *(agent-closed — not owner-verified)*; [Sprint 7](../../../sprints/plan-sprint-7.md) was started the same day (R2) and is now the active sprint. `## Status` unchanged; no folder moved; no mover run on this task. *(Earlier value, kept as history — true until 2026-09-29:)* ~~Sprint 6~~

📌 **Moved from Sprint 7 to Sprint 6 on 2026-09-29** — OWNER RULING 2026-09-29, typed directly by the owner in the `fkit lead` session (the owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Mov ethe 0339 into the Sprint 6 to the top of priorities."* (typo as typed; meaning: move `0339` into Sprint 6, at the top of its priorities). [Sprint 6](../../../sprints/done/plan-sprint-6.md) is the active sprint. Record: the 2026-09-29 `0339` addendum under Sprint 6's status table. `## Status` unchanged; no folder moved; no mover run.

> ⚠️ **Context, not a decision to reopen.** Earlier on 2026-09-29 the owner set a standing rule: *when proof needs a deploy, close the build task and put a verify task at the top of the next sprint; it must not block the current sprint's deploy* (see *Context*). This later ruling places `0339` in Sprint 6 anyway — **the owner's latest explicit ruling wins**, for this task only. `0339` still runs **after** the deploy and **does not block** it. ⚠️ Flagged, not settled: while this task is open on Sprint 6 (deploy, then a watch window of days), Sprint 6 cannot close as fully done.

*(Earlier value, kept as history — true until 2026-09-29:)* ~~Sprint 7~~

## Priority
**25** — append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), set 2026-09-29 by ruling R1 (see `## Sprint`). ⚠️ A position, **not** a merit rank: writing it higher would renumber Sprint 7's closed `➡️ Moved` rows at ranks 2 and 3, which ADR-035 forbids. **By owner ruling carried from Sprint 6, this task is the FIRST of the three rows moved by R1 — ahead of `0341` and `0289`.** Its order against Sprint 7's other owner-ruled top rows (`0337`; the reconnect run `0347` → `0348` → `0035`) is **not ruled**. *Earlier value, kept below as history — true on Sprint 6 until 2026-09-29:*

~~**45**~~ — board rank on [Sprint 6](../../../sprints/done/plan-sprint-6.md), set 2026-09-29 by the owner ruling in `## Sprint`. ⚠️ **NOT the owner-ruled placement.** The owner ruled *"to the top of priorities"* (2026-09-29). Rank 1 on this board is held by the closed `0307`, and every rank above the first open row (`0250`, rank 9) is a closed row; writing `0339` at the top would renumber closed rows, which ADR-035 forbids **even under an owner ruling** (the `0325` row above hit the same wall). So it was **appended** after the highest rank (44). **By owner ruling this task is Sprint 6's TOP priority — ahead of every other open row, whatever this number says.** Its gate is unchanged: it cannot start until `0250` S1, then profile server S2, then game client S2 are deployed. 📌 2026-09-29: the next slot's order is owner-ruled **telemetry → game → profile** — see the dated note under *Precondition* in *Context*.

- **On merit:** immediately above [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) — the owner ruled this task to the top of Sprint 6's priorities, and `0250` is that board's first open row. *(ADR-035's relative merit statement, because the board rank cannot carry it.)*
- 📌 **2026-09-29, latest — append-only note; the bullet above is now partly stale.** `0250` is no longer on Sprint 6: it moved to [Sprint 7](../../../sprints/plan-sprint-7.md) (rank 17) by OWNER RULING 2026-09-29, relayed by `fkit-lead` (ADR-021/037), verbatim *"Move 0340 and any tasks from the Sprint 6 that depends on it to the Sprint 7."* — together with `0340`, `0248` and `0301`. **`0339` did NOT move** (it depends only on `0250` S1's *deploy*, not on `0250` closing). Read the bullet above as: this task is Sprint 6's top priority, above every remaining open row. **This task's gate is UNCHANGED:** `0250` S1 deployed (client, then profile server), then profile server S2, then game client S2. That gate now points at a task tracked on Sprint 7, but **`0250` S1 still ships in this weekend's deploy slot** — only where `0250` is tracked changed.

*Earlier value, kept below as history — true on Sprint 7 until 2026-09-29:*

~~2~~

> **Rank 2 is OWNER-RULED placement.** The owner's ruling (2026-09-29, see *Context*): file this task *"at the
> top of Sprint 7"*, and the standing preference ruled the same day: *"when proof needs a deploy, close the build
> task and put a verify task at the top of the next sprint"*. It was **appended** at rank 12 (ADR-035: append,
> never insert) and then moved up within the [Sprint 7 board](../../../sprints/plan-sprint-7.md)'s contiguous run
> of open rows by that ruling. The board has no closed row, so none was renumbered. See the board's 2026-09-29
> `0339`/`0340` addendum. ⛔ Not producer precedent for re-ranking.
>
> **Why rank 2 and not 1:** [`0337`](../../backlog/0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md)
> already holds rank 1 by an earlier owner ruling the same day (also a post-deploy verify), and moving it would
> rewrite that ruling. It also finishes first in practice: `0337` is one probe right after the deploy, while this
> task needs an extra deploy step first (`0250` S1) and then a watch window of days.

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-09-30** — OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-30, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. **G2** → **"Yes, mark both in progress (Recommended)"** — *"The board then shows the truth: both are underway. Only the status is changed, nothing is closed."* Why: deploy ran 2026-09-29 (profile server with S2 up 20:04:48 UTC); the watch has started. Only the status changed; nothing closed. *(Earlier value, kept as history — true until 2026-09-30:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** Every reading comes from the owner's own consoles
(Uptrace for the server metric, GameAnalytics for the client events) and the owner's deploy record. No agent
can read them.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0297`](../../backlog/0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) (owner-confirmed 2026-09-23) and
[`0337`](../../backlog/0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md).)*

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer
precedent. The question: *"0325's S2 is built and reviewed; S3a (turn verification on) waits on deploy + a watch
period + your approval. How should we track what's left?"* The answer: **"Split it (Recommended)"**, option text
*"Close 0325 as the S2 build (agent-closed). File a 'verify S2 live' task (deploy check + watch the ok-rate) at
the top of Sprint 7, and a separate 'S3a enforce' build task after it. ADR-116 gets a note that S3a moved to that
task."* Standing owner preference, also ruled 2026-09-29: *when proof needs a deploy, close the build task and put
a verify task at the top of the next sprint; it must not block the current sprint's deploy.*

**What this verifies.** [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)
built slice **S2, shadow mode**: at login the profile server checks Yandex's signed player data and **records
the result, changing nothing else** — every session is still `vfy:false`. The client asks Yandex for the signed
data once per page load and sends it with the login. It was proven in tests only (`npm test` green; the real
SDK, the metric reaching Uptrace and the events reaching GameAnalytics were **not** checked — `0325` worklog,
*Not verified*). This task is the live half: does it work on real players, and how often?

**Why it matters.** The next step, [`0340`](../../backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (S3a),
turns the check on for real: a passing check gives the player a verified session. Before that, we need to know
that real logins actually pass (`ok`), and how often they fail and why. The plan's S2 exit
(`0325` `plan.md` § *S2*): *"the owner picks a window, and `ok` is the large majority of real logins. `stale` /
`bad_payload` / `id_mismatch` counts justify or tune the 900 s / 300 s window **before** anything is
enforced."*

**Precondition — the deploy order (`0325` `plan.md` § *Deploy order* and amendment § F). This task cannot start
until all three have shipped, in this order:**
1. **`0250` slice S1, fully deployed** — its **client first, then its profile server**. Every profile-server
   build from today's tree carries S1's server half, so S2's server cannot go out before S1's client.
2. **Profile server with `0325` S2.** The metric starts; clients send nothing yet, so it reads `absent`.
3. **Game client with `0325` S2.** Now signatures arrive.

> 📌 **2026-09-29 — the order for the next slot is different, by OWNER RULING** (live in the `fkit lead` session
> via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ⛔ not producer precedent).
> Owner's answer: **"Game first, record it (Recommended)"** — option text *"Keeps 0250's client-first rule. Cost:
> a few minutes where the new login check isn't counted yet, and the rarely used name 'Hide' button shows an error
> until profile is deployed. Nothing breaks or is lost. ADR-116 and 0339 get a dated note."* The slot's actual
> order is **telemetry → game (carries `0250` S1 client + `0325` S2 client) → profile (carries `0250` S1 server +
> `0325` S2 server)**. So signatures arrive for a few minutes before the server counts them; the metric starts at
> the profile deploy, and it can show `ok` (not only `absent`) from its first minutes, because clients loaded after
> the game deploy already send signatures. `0250` S1's client-first
> rule still holds. Step 1 below records the order as it actually ran. Full step list:
> [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *Next window — plan
> (written 2026-09-29)* (this task's Step 1 records that section's N1–N3; its Step 2 starts at that section's N3.1). The list above is kept as history — true as
> the `0325` plan wrote it.

At filing, **`0325`'s S2 change was not committed and not deployed**, and `0250` S1 was committed but not
deployed (weekend slot). The owner deploys in the regular weekend slot
([weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md)).

⚠️ **This task does NOT block Sprint 6's deploy.** It runs *after* the deploy, by definition; nothing in Sprint 6
waits on it, and Sprint 6's deploy must not be held for it.

## What to build

Nothing is built. This is an owner-run, **read-only** production check. Numbers only.

**Step 1 — the deploy record.** Name and date each of the three deploys above, and confirm they went out in that
order. If the order was different, record what actually happened.

**Step 2 — the server metric (Uptrace).** Counter `geoconflict.profile.login.verification`, one label,
`outcome`, with seven possible values:

| `outcome` | Plain meaning |
|---|---|
| `ok` | The signature is genuine, fresh, and names the same player the client claimed. |
| `absent` | The login came with no signature: an old client bundle, or the client's signed call failed or hung. |
| `bad_signature` | The signature did not check out (tampered, garbled, wrong key). |
| `bad_payload` | The signature checked out, but the data inside is not the shape we expect — the *"Yandex changed its data"* signal. |
| `stale` | Genuine, but too old (over 900 s) or too far in the future (over 300 s). |
| `id_mismatch` | Genuine, but for a different player than the one the client claimed. |
| `no_secret` | The profile server has no key configured. Should be **zero**. |

Record, over the window the owner picks:
- **First, that the counter exists at all** in Uptrace (it was never seen live).
- **The count of each outcome**, and `ok` as a share of all logins, and of logins **with** a signature
  (`ok` ÷ everything except `absent`).
- **How the `absent` share changes over the window** — it should fall as players pick up the new client.

**Step 3 — the client events (GameAnalytics).** Four events, at most one per login, guests fire none
(`analytics-event-reference.md` § *Profile Login Signature Events*):

| Event | Meaning | Value |
|---|---|---|
| `Profile:Login:Signature:Ready` | The signed data was already there when login asked. | none |
| `Profile:Login:Signature:Waited` | Login had to wait for it, and it arrived. | ms waited |
| `Profile:Login:Signature:Timeout` | Still no answer after 60 s; login went ahead without it. | ms (≈ 60000) |
| `Profile:Login:Signature:Failed` | The call failed, returned nothing usable, or was too long. | none |

Record the count of each, and for `Waited` the spread of the ms value (for example median and a high
percentile, or the value buckets GameAnalytics offers). **These size two problems the owner asked to measure:
how slow the signed call really is, and how often it hangs (the 60 s safety net).**

**Step 4 — the owner's S2 exit call.** The owner picks the watch window and says what "large majority `ok`"
means. That is **the owner's call, made here, not now**. Record the window, the threshold, and the owner's
answer: S2 exit met, or not met.

## Verification steps

1. The three deploys are named and dated, and their order is recorded.
2. The metric is confirmed present in Uptrace, or recorded as missing (a missing metric is a finding, see 6).
3. All seven outcome counts are recorded for the window, with the window's start and end dates and the two `ok`
   shares from Step 2.
4. All four event counts are recorded, plus the `Waited` ms spread and the `Timeout` count.
5. The owner's window, threshold and S2-exit answer are recorded **in the owner's words**, with the date and
   channel.
6. **If the answer is "not met", or the metric is missing, or `bad_payload` / `id_mismatch` / `no_secret` is
   more than a trickle:** file a **new** task with the readings (a defect or an investigation) — **do not reopen
   `0325` silently** and do not start `0340`. This task still closes, with its result recorded as a failed
   verification, pointing at that task.
7. The `stale` count is recorded, so `0340`'s plan can keep or retune the 900 s / 300 s window before enforcing.
8. No player id, signature, token, session, host, IP or full URL appears anywhere in the worklog. Counts and
   durations only.

## Notes

- **Depends on:** `0325` (the S2 build, closed 2026-09-29) plus the three deploys in *Context* (`0250` S1 client,
  then `0250` S1 profile server, then profile server S2, then game client S2). 📌 2026-09-29: the next slot's actual order is owner-ruled **telemetry → game → profile** — see *Context* and the [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *Next window — plan (written 2026-09-29)*.
- **Blocks:** [`0340`](../../backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — S3a needs this task's S2
  exit plus a separate owner approval to enforce). ⚠️ It does **not** block Sprint 6's deploy.
- 📌 **2026-09-29, latest:** `0340` moved back to [Sprint 7](../../../sprints/plan-sprint-7.md) by the owner ruling quoted under *Priority*. This task still blocks it (the block now runs from Sprint 6 to Sprint 7, the normal direction). The `0250` S1 deploy precondition under *Depends on* is unchanged; `0250` is now tracked on Sprint 7.
- **Related:** [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  (the design; residual: a Yandex data change silently makes everyone unverified — this metric is how that shows)
  · [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) (S1 is the deploy precondition) ·
  `0288` / `0289` (profile alerting; an alert on the `ok` share is a possible later task, not this one — ADR-116
  residual 2).
- **Possible later task, not filed:** an alert on the `ok` share, if the owner wants one after seeing the numbers.
- **Privacy:** counts and durations only. Never paste ids, signatures, tokens, hosts or URLs into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 2026-09-29 — deploy done; first-minutes readings (appended; nothing above edited, ADR-035)

**Provenance.** Written by a spawned `fkit-producer` (no owner channel, ADR-021) on an OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`: **"Yes, do all three
(Recommended)"** — items 2 (*a note about the early "stale" share*) and 3 (*record tonight's deploy*). ⛔ Not
producer precedent. Facts are `fkit-lead`'s own checks and the owner's live reports; the producer verified none.
**`## Status` unchanged. This is not the Step 1–4 record in full; the task is still open.**

**Step 1 — deploy facts known so far.**
- Date: **2026-09-29** (a Tuesday — the owner's own choice, outside the weekend-slot ruling).
- Order: **telemetry → game → profile**, as owner-ruled (see *Context*). The profile server with S2 started at
  **20:04:48 UTC**.
- Game tag / version: **not recorded** (not reported to the lead).
- N2's DevTools one-login / `signature`-key check and the GameAnalytics check: **not reported.**
- Full record: [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened 2026-09-29*.

**Step 2 — first minutes only.** ⚠️ **Minutes of data, not a conclusion.** Nothing below is Step 2's record,
and no S2-exit call is made or implied.
- The counter **exists** in Uptrace (as `geoconflict_profile_login_verification`). ✅
- Outcomes seen in the first minutes: **`ok` and `stale` only**, roughly **half each** (peaks about 6/min each).
- `no_secret`: **none**. ✅
- `absent`: **none seen**.
- Profile box clock: NTP synchronized, matches real time — so **clock skew on our side is ruled out** as the
  cause of `stale`. The cause is **not known**.

**Why it matters, and the decision it may feed.** A `stale` share near half, if it holds over the real watch
window, is not "large majority `ok`". This brief already names the lever: verification step 7 — *"The `stale`
count is recorded, so `0340`'s plan can keep or retune the 900 s / 300 s window before enforcing"* (and *Context*,
quoting `0325`'s plan: the counts *"justify or tune the 900 s / 300 s window **before** anything is enforced"*).
That retune is the decision these readings may feed — **not decided here.** If the share holds, verification step
6 (file a new task with the readings) may also apply; that is the owner's call at Step 4.

## 📌 2026-10-01 — RESULT: verification FAILED — S2 exit NOT MET (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given **2026-10-01**, typed in prose by the owner in the live `fkit lead` session,
relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
precedent. Owner's words, verbatim: **"Agree"** — answering the lead's recommendation: *"`0339` Step 4: **not met
for now**, plus a small task to **measure how old the `stale` tickets are**, aiming for Saturday's profile deploy
if it's ready in time."* Readings taken by `fkit-lead` 2026-10-01, read-only, through the owner's Chrome; the
producer verified none of them.

- **Full Step 1–4 record:** [`worklog.md`](worklog.md) in this folder.
- **Headline numbers** (window 2026-09-29 20:06 → 2026-10-01 12:09 UTC, ≈ 40 h; totals approximate):
  `ok` ≈ 68 % · `stale` ≈ 32 % (≈ 35 % in the last hour — not falling) · `absent` ≈ 26 · `id_mismatch` ≈ 8 ·
  `bad_signature`, `bad_payload`, `no_secret` **zero**. Client: `Ready` ≈ 99.5 %, `Waited` 46 (mean 575 / 811 ms,
  no percentile available), `Timeout` 0, `Failed` 0.
- **Owner's call:** S2 exit **not met**. No numeric threshold was stated; the owner accepted that ≈ 68 % `ok` is
  not a "large majority".
- **Cause of `stale`: unknown** (our clock, client reuse and old builds are ruled out — see the worklog).
- **Per verification step 6:** follow-up filed as
  [`0366`](../0366-measure-how-old-stale-login-signatures-are/brief.md) — measure how old `stale` signatures
  are. `0325` is **not** reopened. `0340` is **not** started; its gate now waits on `0366` (dated note in
  `0340`'s brief). **This task closes with this failed result.**

## 📌 2026-10-02 — CORRECTION (appended after close; nothing above edited, ADR-035)

The headline numbers above carry two counts that were wrong by method: **`absent` is exactly 1 across all of S2,
not ≈ 26**, and **`id_mismatch` is 6 in this task's window, not ≈ 8** (read-only exact ClickHouse sums, 2026-10-02,
relayed by `fkit-lead`; the ≈ figures came from a per-minute average over a series that existed only briefly). The
`ok` / `stale` shares, the failed result and the close are unchanged. Detail: [`worklog.md`](worklog.md) § *2026-10-02
— CORRECTION*. Follow-ups filed the same day:
[`0372`](../0372-client-diagnostics-for-stale-login-signatures/brief.md) ·
[`0373`](../../backlog/0373-read-the-stale-login-data-and-choose-the-fix/brief.md).
