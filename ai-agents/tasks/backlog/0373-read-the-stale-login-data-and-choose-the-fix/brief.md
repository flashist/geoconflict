# Read the stale-login data and choose the fix

## ID
0373

> ℹ️ **ID allocation, checked 2026-10-02 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0371`. `0372` and `0373` allocated in this run, in dependency order.

## Sprint
Sprint 8

## Priority
2

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
🔲 Backlog

## Owner
fkit-producer — ⚠️ **THE DECISION IS THE OWNER'S.** The producer runs the reading and frames the choice; the
owner chooses the fix and sets the "good enough" threshold. The GameAnalytics numbers are **owner-read** (no agent
has GameAnalytics access). The Uptrace / ClickHouse queries are read-only and are run for the owner by an agent
session that has access (standing rule: read-only checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0370`](../0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md).)*

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
