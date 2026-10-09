# Read the stale-login data and choose the fix

## ID
0373

> ℹ️ **ID allocation, checked 2026-10-02 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0371`. `0372` and `0373` allocated in this run, in dependency order.

## Sprint
Sprint 7

> 📌 **2026-10-04 — was ~~Sprint 8~~; moved to [Sprint 7](../../../sprints/done/plan-sprint-7.md).** OWNER RULING given
> live 2026-10-04 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned
> `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner's choice, verbatim: *"Pull into
> Sprint 7 (Recommended)"* — option text: *"Move 0373 onto Sprint 7 now. Sprint 7's goal includes citizenship, and 6
> of its open tasks wait on this one task."* The [Sprint 8](../../../sprints/plan-sprint-8.md) row is kept as
> `➡️ Moved`. Status unchanged (`🔲 Backlog`); no folder moved, no mover run.

## Priority
36

> 📌 **2026-10-04 — was ~~2~~ (Sprint 8 rank); rank 36 is append rank on the Sprint 7 board — the PRODUCER's
> placement, NOT owner-ruled.** The owner named the sprint, not a rank. **On merit this belongs directly above
> `0340` (Sprint 7 rank 16)**, because `0340` waits on it; inserting it there would renumber ranks 16–35, most of them
> closed rows, which ADR-035 forbids, so it was appended after that board's highest (35). **Read it as worked before
> `0340`, whatever the number says.** The notes below describe the Sprint 8 rank and are kept as history. The ⏳ note
> still holds: the rank does not let this task start early.

> 📌 **2026-10-02 (later) — was 6, now 2. OWNER-RULED placement.** Moved to rank 2, directly below `0370`, on the
> [Sprint 8 board](../../../sprints/plan-sprint-8.md), on the OWNER RULING given live via `AskUserQuestion`, verbatim
> *"Move to rank 2 (Recommended)"*, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037; ⛔ not producer
> precedent). `0363` 2 → 3, `0358` 3 → 4, `0351` 4 → 5, `0343` 5 → 6 (all open; no closed row on that board, so none
> renumbered). The owner-confirmation flag below is **resolved**; its text is kept struck (ADR-035). The ⏳ note below
> still holds: rank 2 does not let this task start early.

> ~~⚠️ **Priority 6 is append rank, NOT the owner-approved placement — flagged for owner confirmation.** The owner
> approved this task for **"the top of the next sprint"** (2026-10-02, relayed by `fkit-lead`). `0370` holds rank 1
> by an earlier owner ruling on verify tasks and is not displaced. **On merit this belongs directly below `0370`**
> (rank 2), with the top group, because it is the next step on the chain that blocks `0340` and the five tasks
> behind it. It was **appended, not inserted** (ADR-035): putting it at rank 2 would renumber four open rows
> (`0363`, `0358`, `0351`, `0343`), and a spawned producer with no owner channel does not re-rank. **Read it as
> top group, directly below `0370`, whatever the number says**, until the owner confirms the exact rank.~~
>
> ⏳ **It cannot start early regardless of rank** — see *Preconditions*. If both deploys land on 2026-10-03/04, the
> earliest useful read is after the evening of Saturday 2026-10-10 (UTC).

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-10-05** by a spawned `fkit-producer` (no owner channel), on the OWNER RULING of 2026-10-05 relayed by
`fkit-lead` that waived precondition 3 (see *Preconditions*): the decision step is now active. *(Earlier value, kept as
history:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **THE DECISION IS THE OWNER'S.** The producer runs the reading and frames the choice; the
owner chooses the fix and sets the "good enough" threshold. The GameAnalytics numbers are **owner-read** (no agent
has GameAnalytics access). The Uptrace / ClickHouse queries are read-only and are run for the owner by an agent
session that has access (standing rule: read-only checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0370`](../../backlog/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md).)*

## Context

**Filed 2026-10-02 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
2026-10-02 via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead`:** the owner approved
filing both the build task [`0372`](../../done/0372-client-diagnostics-for-stale-login-signatures/brief.md) and *"a 'read the
data and decide' task for the top of the next sprint"* — this one. A second ruling carried here: **the "good enough"
threshold for the S2 exit is decided in this task, with the data** (*"Decide it with the data (Recommended)"*).
⛔ Not producer precedent.

**The problem.** About 1 login in 3 fails the freshness part of the login signature check (`stale`: Yandex's
`issuedAt` more than 900 s old or more than 300 s ahead). Read-only check 2026-10-02 (exact ClickHouse sums): flat
at ~32–33 % over ~20 k logins since 2026-09-29 20:05 UTC; ~21–26 % at 02–06 UTC, ~40–43 % at 20–23 UTC. Because of
it the owner ruled `0325`'s S2 exit **not met** (2026-10-01, in
[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md)), so
[`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) cannot start — nor `0332`, `0323`, `0250` S3b,
`0248` and `0301` behind it.

**What is known before reading** (architect consult 2026-10-02, read-only — recorded in full in `0372`'s
*Context*):
- Our client cannot be holding a signature older than ~5 min, so stale ages of 20 min and more come from Yandex.
  `past_15m_20m` stays ambiguous.
- **Leading hypothesis (inferred, unproven):** each match exit reloads the game in the same tab; each reload is a
  new login; if Yandex returns the same signed data for the whole visit, reloads more than 15 min into a visit are
  stale. Fits ~1 in 3 and the evening peak.
- ⚠️ On the server, `stale` is decided **before** the id check (`src/profile-server/LoginVerification.ts:34` runs
  before `:45`), so "the right player" is **not** proven for stale logins. Any fix that accepts more of them must
  say how it handles that.

### Preconditions — this task cannot start until all of these hold
1. [`0372`](../../done/0372-client-diagnostics-for-stale-login-signatures/brief.md) is **deployed** in a game deploy (target
   2026-10-03/04).
2. [`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) is **deployed** in a profile deploy
   (target 2026-10-03/04).
3. **At least 5–7 days of data since the later of the two deploys, including at least one weekend evening (UTC
   20–23)** — the peak hours.

> 📌 **2026-10-03 — precondition 1 (`0372` in a game deploy): the code is in the `0.0.156` tag.** Verified by
> `fkit-lead` on 2026-10-03 from git, read-only, and recorded here by a spawned `fkit-producer` (no owner channel).
> The last commit touching `src/client/SignatureAgeAnalytics.ts` (`0c9a620` "Sprint push") is an ancestor of
> `f712263` (tag `0.0.156`, "DEPLOY prod: bump version to 0.0.156", dated 2026-10-03); the file and the
> `PROFILE_LOGIN_SIGNATURE_REFETCH` enums exist at that commit.
> ⚠️ **Caveat: this proves the code is in the `0.0.156` tag, NOT that the events are arriving in prod analytics.**
> The first GameAnalytics read (Step 2) is what confirms arrival.
> **Timing consequence:** `0372`'s client data should start arriving from the **2026-10-03** deploy, so the
> fallback of a slip to the next weekend slot (2026-10-10/11) **does not apply** to `0372`. Counting 5–7 days with a
> weekend evening from 2026-10-03, the earliest useful read stays **after the evening of Saturday 2026-10-10 (UTC)**.
> ⚠️ **Not covered by this note:** precondition 2 (`0366` in a **profile** deploy). Precondition 3 counts from the
> **later** of the two deploys, so if `0366`'s profile deploy landed later, the window starts then.

> 📌 **2026-10-03 — precondition 2 (`0366` in a profile deploy): the code is in the `0.0.156-profile.1` tag.**
> Verified by `fkit-lead` on 2026-10-03 from git, read-only (re-checked by the recording `fkit-producer` the same
> day), and recorded here by a spawned `fkit-producer` (no owner channel). `0366`'s four profile-server files —
> `src/profile-server/LoginVerification.ts`, `PlayerSignature.ts`, `Routes.ts`, `Telemetry.ts` — all have last
> commit `e581824` ("Sprint push"), which is an ancestor of tag `0.0.156-profile.1` (commit `f712263`, 2026-10-03).
> The [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened
> 2026-10-03 — weekend window ran* records that profile release as **deployed** — the *Profile — deploy* row
> (~line 1747: *"Deploy version: 0.0.156-profile.1 … commit f712263"*, `validation_result=ok`) and the *Profile —
> endpoints* row (~line 1750: `/health` reports `0.0.156-profile.1`).
> ⚠️ **Caveat: code in the tag does not prove the events are arriving.** Step 1's first server reading is what
> confirms arrival.
> **Timing consequence:** both deploys landed on **2026-10-03** (game prod ~09:32 UTC, profile ~10:02 UTC), so the
> precondition-3 data window counts from the **2026-10-03 deploys for both `0366` and `0372`**. The "not covered"
> line in the note above is now answered.

> 📌 **2026-10-05 — precondition 3 WAIVED by the owner.** OWNER RULING given 2026-10-05 in the `fkit lead` session
> (the owner's own typed message), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel
> (ADR-021/037); ⛔ not producer precedent. Verbatim: *"I agree with your plan, also, make a note somewhere about what
> we found and that we don't need to wait longer, because the data we have is very straightforward and
> convincing."* The ~2.5 days of data since the 2026-10-03 deploys (both weekend evenings included) are now the
> decision readings; the 5–7-day wait and the "earliest after Saturday 2026-10-10" notes above no longer gate this
> task. Step 3 is recorded in the worklog (row 1 fits, strongly); next is an `fkit-architect` consult on (a) vs (b),
> then Step 4. Summary:
> [`2026-10-05-0373-stale-login-findings.md`](../../../knowledge-base/reports/2026-10-05-0373-stale-login-findings.md).

## What to do

### Step 0 — freeze the prediction table BEFORE reading anything
Copy this table into the worklog with a timestamp **earlier than the first query's timestamp**, so the reading
tests hypotheses instead of building a story after the fact. Additions are allowed before Step 1; nothing is edited
after it.

| If the readings show… | It supports… | Fix direction |
|---|---|---|
| stale mostly on `AfterMatch` boots **and** A2 mostly `Same` | Yandex returns the same signed data for the whole visit | owner chooses among (a)/(b)/(c) below |
| A2 mostly `Newer` | a second Yandex call gives fresh data | a small client refetch task |
| stale mostly `past_15m_20m`, mostly on `FirstBoot` | the 900 s window is simply too tight | a simple window retune |
| stale mostly `future_*` | a clock problem somewhere | look at clocks |
| none of these clearly | — | record *"not determined"*; the owner decides whether to measure more (e.g. the skipped A4 server label) or choose anyway |

### Step 1 — server readings (`0366`, read-only)
- The stale-age bracket counter, **overall and per hour of day (UTC)**, plus the `outcome` counter's stale share for
  the same window.
- ⚠️ **The profile deploy restarts the server counters.** Read only inside the post-deploy window; never subtract or
  compare a cumulative value across the restart.

### Step 2 — client readings (`0372`, GameAnalytics, owner-read)
- **Validate the device clock first:** the share of A1 events that are not `Fresh` should be near the server's
  ~32 %. If it is far off, A1's brackets are not trusted and the reading leans on A2 + the server brackets; say so.
- A1 shares **by boot kind** (`FirstBoot` / `AfterMatch`) and **by device** (custom dimension 01), only on builds that
  carry `0372`.
- A2 split: `Newer` / `Same` / `Failed` (and `Older`, if `0372`'s plan added it).
- A3: mean held ms on `Profile:Login:Signature:Ready`.
- **A few heavy players vs everyone:** if GameAnalytics shows unique users per event, compare stale events to the
  number of players who had any; if it cannot, record *"not determined"*.

### Step 3 — match readings to the table
Name which row the readings support, and how strongly. If they fit none, say so — do not stretch one to fit.

### Step 4 — the owner decides (via `AskUserQuestion` in a session with the owner present)
**Ready-made outcomes:**
- **`Newer`** → brief a small **client refetch** task (call Yandex again when the first signature is stale, and send
  the fresh one).
- **`Same`** → the owner chooses among:
  - **(a) widen the freshness window** to cover a visit — trade-off: a stolen signature can be replayed for longer;
  - **(b) keep the verified session across match-exit reloads** — contradicts the "never store the token" rule in
    `src/client/ProfileSession.ts:16-21`; **needs an ADR and owner approval**;
  - **(c) treat stale as a lower trust level** — a product call.
- **Window retune / clock** → brief that fix.

## Output — this task is done when all of these exist
1. **One chosen fix**, with the owner's words recorded verbatim.
2. **The stale share expected after the fix**, with the reasoning from the readings.
3. **The owner's "good enough" threshold for the S2 exit** (a number) — **OWNER RULING 2026-10-02: decided here,
   with the data.**
4. **An ADR**, if the fix changes a security rule (option (a) changes ADR-116's freshness window; option (b) changes
   the token-storage rule) — via `fkit-architect` / `/fkit-record-decision`.
5. **The fix task briefed** from this decision (and the S2-exit re-check, if it is a separate task), and `0340`'s
   `Depends on` repointed to it.

## Verification steps

1. The worklog shows the prediction table with a timestamp **before** the first query.
2. Every reading is recorded with its source, window (UTC start/end), counts and shares — and the post-deploy
   restart caveat honoured.
3. The clock-validation result (Step 2, first bullet) is recorded, with what it means for trusting A1.
4. The owner's choice, the threshold and the expected post-fix share are recorded verbatim, with the date and the
   channel.
5. The ADR (if needed) and the fix task exist and are linked from this brief; `0340`'s brief carries a dated note
   repointing its gate.
6. No secret, key, real player id, signature, token, host, IP or launch-query content in any artifact.

## Notes

- **Depends on:** [`0372`](../../done/0372-client-diagnostics-for-stale-login-signatures/brief.md) (hard — deployed, plus
  5–7 days of data) and [`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) (hard —
  deployed in the profile deploy).
- **Blocks:** the stale-signature fix task (not yet filed — this task's output) → the S2-exit re-check →
  [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md).
- **`0366` Q2 ruling folded in:** `0366`'s owner ruling (2026-10-01) put *reading its brackets* into "the S2-exit
  re-check before `0340`". This task is where they are first read; the re-check after the fix reads them again.
- **Related:** [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (the S2
  readings; see its dated 2026-10-02 correction on `absent` / `id_mismatch`) ·
  [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md) ·
  [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  · [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
  (privacy).
- **Privacy:** counts, shares and brackets only. Never paste ids, signatures, tokens, hosts or launch-query contents
  into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 2026-10-05 — Step 4 done: the owner chose the fix; tasks filed (appended; nothing above edited, ADR-035)

Recorded by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given 2026-10-05 live via
`AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Rulings verbatim and the
five Output items: the [worklog](worklog.md), *2026-10-05 — Step 4: owner's choice*.

- **Fix:** *"24 hours (Recommended)"* →
  [`0391`](../0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md) (Sprint 7).
- **Threshold:** *"At most 5% (Recommended)"* → the S2-exit re-check
  [`0392`](../../done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (Sprint 8).
- **Watch task:** *"File it (Recommended)"* →
  [`0393`](../../backlog/0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md) (Backlog
  board).
- **ADR:** [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
  (accepted 2026-10-05).
- **`0340`**'s `Depends on` repointed to `0392`. The *Blocks* line above (*"the stale-signature fix task (not yet filed)
  → the S2-exit re-check → `0340`"*) now reads `0391` → `0392` → `0340`.
- **`## Status` unchanged (`🔄 In progress`). Not closed — `fkit-lead` routes the close.**

