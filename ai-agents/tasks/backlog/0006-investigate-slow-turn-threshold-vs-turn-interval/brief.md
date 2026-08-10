# Investigation: what should `SLOW_TURN_THRESHOLD_MS` be, given a 66.7 ms turn interval?

## ID
0006

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

`GameServer.SLOW_TURN_THRESHOLD_MS = 100` (`src/server/GameServer.ts:712`) is the threshold above
which a turn emits a slow-turn span to Uptrace. The turn interval is **66.7 ms**
(`DefaultConfig.ts:239-246`, the 1.5× Flashist speed-up recorded in `adr-107`).

**The threshold is larger than the interval.** A turn taking 70–100 ms has already overrun its own
schedule — the server is falling behind — but emits nothing. That is a **33 ms blind band** in which
the server degrades and telemetry stays silent. Because the slow-turn span is the primary signal for
server-side lag, the tool that would tell you about this class of problem is the tool that cannot
see it.

Nothing in the repo indicates the threshold was revisited when the interval changed on 2026-01-02.
It reads as an oversight, but **no one has confirmed that**, and the owner's answer when asked was
"don't know — investigate". Hence an investigation, not a fix: the naive answer (set it to 66.7)
may well be wrong, and shipping a wrong threshold trades a blind band for alert noise.

**Why not just lower it.** A threshold at exactly the interval fires on every turn that is even
marginally over, which on a busy server may be a large fraction of turns — turning a rare, meaningful
signal into background noise that gets muted. The right answer depends on what the current
distribution actually looks like, which is a measurement, not a guess.

**Investigation-first.** Do not scope or write the fix until these findings are reviewed with the
owner.

## What to build

A findings document in `ai-agents/knowledge-base/reports/`, answering:

1. **What is the actual distribution of turn-processing durations in production?** Pull it from
   Uptrace. Report percentiles (p50/p90/p99/max) — and state explicitly that anything below 100 ms
   is invisible in the existing span data, so the distribution must come from a source that is not
   itself censored by the current threshold (metrics, or a temporary lowered threshold).
   **If the data cannot be obtained without a code change, say so and stop there** — that is a valid
   finding, and it makes "add the instrumentation" the next task rather than "pick a number".

2. **What does a turn overrun actually cost?** Trace the consequence: does the next turn start late,
   do turns queue, does the client's worker fall behind, does it contribute to desync? The
   architect's survey notes the client worker's per-tick budget dropped from 100 ms to 66.7 ms with
   the speed-up. Establish whether server overrun and client overrun are the same problem or two.

3. **Is 100 ms defensible as an absolute badness threshold** independent of tick rate — i.e. was it
   ever an intentional "this is bad regardless" number? Check git history around the constant and
   around the 2026-01-02 speed-up commit (`6854fda`).

4. **Recommend a threshold, with reasoning** — a fixed number, a multiple of the interval, or a
   percentile-based alert instead of a fixed span threshold. State the alert-volume consequence of
   each. If the honest recommendation is a change to *how* slow turns are detected rather than to
   the number, say that.

5. **Flag any related blind spot found on the way.** The architect's survey already notes the cluster
   **master exports no metrics or traces at all**, so lobby scheduling is entirely unobserved. If
   that is the bigger gap, say so — it may deserve priority over this one.

## Verification steps

1. The findings document exists in `ai-agents/knowledge-base/reports/`, dated, and states the
   turn-duration distribution **or** states clearly why it could not be obtained and what would be
   needed.
2. Every quantitative claim cites its source (an Uptrace query, a `file:line`, or a commit).
3. It answers all of questions 1–4 explicitly, including any it could not answer — an unanswered
   question is recorded as such, not omitted.
4. It ends with a single recommended threshold or detection change, plus its expected alert volume.
5. It states plainly whether the current 100 ms was deliberate or an oversight, and on what evidence
   — including "cannot be determined" if the history is silent.
6. No secrets: no Uptrace endpoint, credentials, or VPS details in the document.

## Notes

- **Depends on:** nothing
- **Blocks:** the threshold fix itself (not yet briefed — it depends on these findings)

- Architect-owned because the deliverable is analysis, not code.
- Related settled decision: `adr-107` records the 66.7 ms interval and lists this threshold mismatch
  as a consequence discovered while writing it. Read it first.
- If findings show the fix is a one-line constant change, say so — a small answer to a real question
  is a good outcome, not a failed investigation.
