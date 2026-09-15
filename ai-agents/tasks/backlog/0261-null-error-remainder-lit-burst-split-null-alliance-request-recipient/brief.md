# Re-measure `0032`'s unfixed null-error remainder once telemetry is back — Lit `_$AA` burst (A), `.split` on null (F), `.id` on null in `Transport.onSendAllianceRequest` (G) — trace F and G, fix only what recurs

## ID
0261

> ℹ️ **ID allocation, checked 2026-09-14 before filing. `0261` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0261-*/` — no matches (highest ID on disk across all three boards was
> `0260`, derived with `10#` forced base 10). **2.** `grep -rn "^0261$" ai-agents/tasks/ --include=brief.md`
> — zero hits. **3.** `grep -rn "0261" .claude/` — zero hits. **4.** Duplicate-ID check (`sort | uniq -d`
> over folder prefixes) — empty.

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity; a decorated value is reported as drift. **Do not decorate it.**

## Priority
Unscheduled *(Backlog board is unranked by design)*

📌 **Producer's rank, if pulled into a sprint: Low.** ⛔ **This is the PRODUCER's rank, not the owner's**
— filed by a spawned producer with no owner channel. **Low, not Medium**, because the three clusters
together are **≈0.2 % of the null-error family `0032` measured** (≈33 spans against ≈16,900 in the 78 h
window; ≈1.3 % of the ≈2,580 non-burst spans), the one large cluster (A) is a **single 6 h burst from
≤3 Firefox clients** with zero events in every other slice, and the two traceable ones (F, G) touched
**≤4 users each**. **Not lower than Low** because G is at an intent-send site (`Transport.ts:479`) —
an alliance request that throws is a user action that silently does nothing — and because neither F
nor G has been traced, so their real reach is unknown until measured.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` on the `/fkit-sprint-ship-loop` driver's instruction**,
from [`0032`](../0032-investigate-null-id-errors/brief.md)'s worklog, "Follow-up brief text" item (2).
**Not an owner ruling — the producer had no owner channel.** Filed while `0032` is still open
(`🚧 Blocked` on its owner-side Step 5, itself gated on `0257`) so the remainder is not lost when `0032`
closes.

### What `0032` fixed, and what it left

`0032` measured the client null-error family in Uptrace over the **last window with real data —
2026-09-01 00:00 → 2026-09-04 06:00 UTC (78 h), build `0.0.140` (`362a2f9`)** — and, under its stop rule
(top two clusters, max two fixes), fixed clusters **B+D+E** (stale tile ownership from a shared cached
`GameMapImpl` — `TerrainMapLoader`) and **C** (`Leaderboard` dereferencing a legitimately-null
`myPlayer`). Together those were **≈99 % of the non-burst family**. Three clusters were **reported, not
fixed**. All figures below are `0032`'s, from its worklog cluster table (`0032/worklog.md`, Step 2):

| Cluster | Wording (browser wordings merged) | Spans / 78 h | Distinct `enduser.id` | 24 h count → rate | Share of family | Site | State |
|---|---|---|---|---|---|---|---|
| **A** | Lit DOM: `this._$AA.nextSibling is null` 13,257 + `this._$AA.parentNode is null` 890 + `insertBefore of null` 176 | **14,323** | **≤3** (spans carry none; the folded log group shows 3, its rejection twin 1) | 14,323, **all inside 2026-09-03 12:00–18:00 UTC**; **0** in every other 6 h slice | ≈85 % of the raw family — but **one burst, one machine's worth of clients** | `vendors.<hash>.js` (Lit `ChildPart`), **Firefox only** | **Not a code defect we can see.** Consistent with a DOM mutation outside Lit's control (extension / page translator). Re-check only. |
| **F** | `Cannot read properties of null (reading 'split')` | **10** | **4** | — | ≈0.4 % of non-burst | **Untraced** — no sample pulled | Trace from a sample's `exception_stacktrace` |
| **G** | `.id` on null inside `Transport.onSendAllianceRequest` | **≤23** (shares the `unhandled_error` group with cluster B, so the upper bound is the group's) | **≤4** | 9 → **0.006/min** | ≈0.9 % of non-burst | `src/client/Transport.ts:479` — `event.recipient.id()` with a null `recipient` | Site known, **cause untraced**; `0032`'s guess: a stale player ref in the alliance radial flow |

For scale: non-burst family total ≈2,580 spans / 78 h ≈ **0.45/min**; the fixed clusters B+D+E+C ≈2,550.

⚠️ **Uptrace's log pattern-grouping folds cluster A into the `can't access property "id", a is null`
group** (`_group_id 1419598272647751473`), which is why that group reads 14,187. Do not re-count A as
`.id`-family when re-measuring — split by `exception_message`, as `0032` did.

### Why this is investigation-first, and why it is one brief

- **Nothing can be measured today.** Client telemetry has been dark since 2026-09-04 06:03 UTC (expired
  TLS cert on the telemetry box — [`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md)).
  Every figure above is from `0.0.140`; prod is on `0.0.151`, which has **never been observed**. The
  first step of this task is a fresh measurement on a current build — **only after `0257` lands and
  `0032`'s fix is deployed**, so the re-measure is not polluted by the clusters `0032` already fixed.
- **The fix shape for F and G is unknown** until traced. F has no known site. G's site is known but not
  why `recipient` is null. Writing implementation briefs now would be guessing.
- **A may simply not recur.** If it does not, the answer is "closed by observation", not code.
- **One brief, not three**, because the three share one gate (the re-measure), one instrument (the
  Uptrace queries `0032` recorded in its worklog Step 1), and one decision (which, if any, is worth a
  fix). Each is tiny; splitting a ≈33-span remainder into three briefs would triple the bookkeeping
  for no independent verification gain. **If the re-measure shows F or G at a rate that earns a fix
  with a non-trivial shape, the coder stops and returns this brief to the producer to split** — a
  fix brief per traced cause.

### Related, not in scope

- **`0032`'s own owner-side Step 5** (deploy, then re-query for the *fixed* clusters B–E) is `0032`'s
  verification, not this task's. This task's re-measure may run on the same query but reports on A/F/G.
- **Symbolication** — [`0260`](../../done/0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md).
  `0032` traced without maps because webpack kept method names; F may not be so lucky. If `0260` has
  landed, use the symbolicated stack; if not, say plainly whether the F trace was possible without it.
- [`0252`](../0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md) owns
  `Transport.ts`'s listener-teardown seam. A G fix, if any, is a guard or an upstream null check at the
  intent-send site or in the radial-menu flow — **coordinate line numbers with `0252`, do not fold
  teardown work in.**

## What to build

**Step 1 — gate check.** Confirm `0257` is Done and telemetry is receiving client data again
(`systems` endpoint shows client error-log groups for the last 24 h at a rate comparable to
`0032`'s ~50k/day baseline, not the post-expiry 2/day). Confirm `0032`'s fix is deployed (the
`service.version` in the data is a build that contains it). **If either is false, stop — this task is
blocked, say on what.**

**Step 2 — re-measure A, F, G** on the new `service.version` only, with `0032`'s recorded query
shapes (`0032/worklog.md`, Step 1: `system=funcs`, `group by _name, exception_message, service_version |
count() | uniq(enduser_id)`), over **last 24 h and last 7 d**. Record spans, distinct users, and — for
A — the per-6 h-slice distribution, since "one burst" vs "spread across users" is the whole question.

**Step 3 — decide per cluster, against these rules (producer's; the owner may override):**
- **A:** if absent, or present only as isolated single-client bursts → **record as closed by
  observation, no code.** If it recurs **across ≥3 distinct users in different slices** → investigate
  DOM mutation outside Lit (extensions / translators — check `navigator.language`, user-agent, and
  whether the burst correlates with the Yandex iframe vs standalone), **not app code**, and return
  findings; no fix without an owner decision.
- **F:** pull ≥2 samples with `exception_stacktrace`; trace the site. If absent on the new build →
  closed by observation. If traced and the fix is a localized null-guard-at-origin with a test →
  fix it here. Otherwise return the trace as a follow-up brief text.
- **G:** pull samples; trace why `event.recipient` can be null at `Transport.ts:479` (who emits
  `SendAllianceRequestIntentEvent` with a null recipient — the radial menu after the target died /
  left? a stale `PlayerView`?). Same rule as F: localized origin fix with a test, or a follow-up text.

**Step 4 — findings file** at
`ai-agents/knowledge-base/reports/<date>-0261-null-error-remainder-findings.md`: the re-measured
table (same columns as above), each cluster's verdict with evidence, any fix applied, and any
follow-up brief text. 🔒 No credentials, no Uptrace session material, no DSNs.

## Verification steps

1. **Gate recorded:** `0257` Done, ingest rate on the new build, and the `service.version` measured —
   all three stated with numbers, not adjectives.
2. **Re-measured table** for A, F, G on the new build, 24 h and 7 d, spans + distinct users, and the
   6 h-slice distribution for A.
3. **A verdict per cluster** — closed by observation / fixed here / returned as follow-up text — each
   with its evidence.
4. **If a fix was applied:** a jest test that **fails on the pre-fix tree and passes after**, at the
   traced origin, not a blanket guard at the deref site; `npm test`, `npm run lint`,
   `npx tsc --noEmit` green; `src/core/` untouched unless the trace lands there, and if so, tested.
5. **If a G fix touched `Transport.ts`:** the diff is confined to the intent-send / radial-flow seam and
   does not touch `joinLobby`'s listener registration (`0252`'s).
6. Findings file exists; no secrets in it.
7. ⛔ **No user-impact figure written for F or G beyond what the re-measure shows** — `0032`'s ≤4
   users each are from a build nobody is on any more.

## Notes

- **Depends on:** [`0257`](../../done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md)
  (hard — nothing is measurable until ingest resumes) and
  [`0032`](../0032-investigate-null-id-errors/brief.md) (hard — its fix must be deployed before the
  re-measure, or the fixed clusters pollute the numbers; `0032` is `🚧 Blocked` on its Step 5 at
  filing).
- **Blocks:** nothing.
- **Effort: ~0.5 day** if A and one of F/G close by observation; up to ~1 day if both F and G trace to
  real fixes. **Risk: low** — read-only until a fix is chosen; any fix is a localized null-origin guard
  with a test.
- **Source:** `ai-agents/tasks/backlog/0032-investigate-null-id-errors/worklog.md` — Step 2 cluster
  table (rates), Step 3 "A" paragraph, Residuals bullet 3, and "Follow-up brief text" item (2).
- **Split trigger:** if step 3 yields a fix for F or G whose shape is not a one-site guard with a test,
  **stop and return to the producer** — one fix brief per traced cause.
- **Owner-ruled facts vs producer's:** none of this is owner-ruled. The filing itself is on the driver's
  instruction; the rank (Low), the per-cluster decision rules, and the "one brief not three" call are the
  **producer's**.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`.**
