# Worklog — 0363 verify 0356 in production (telemetry deploy tagged with its version)

## 📌 2026-10-03 — evidence from the weekend window (appended; ADR-035)

**Provenance.** Written by a spawned `fkit-producer` (no owner channel, ADR-021) on an **OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-10-03, relayed by `fkit-lead`: "Yes, record it
(Recommended)"** (*"A producer writes the results into weekend-deploy-slot-runbook.md and the task files. No
commit."*). ⛔ Not producer precedent. **Evidence only — `## Status` unchanged, task not closed.** Sources:
**(lead)** `fkit-lead`'s own check · **(owner)** owner's live report · **(producer)** the producer's own read-only
look-up. Full window record: [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened
2026-10-03 — weekend window ran*. Version names, commits and yes/no only.

| Verification step | Reading | Met? |
|---|---|---|
| 1 — name, date, success, `git tag:` result | Name **`0.0.155-telemetry.1`**; deployed **2026-10-03** (record block 09:04:37 UTC); success **yes** (`validation_result=ok`); `git tag:` **pushed** (`git_tag=pushed`). Source: the local deploy record (lead; producer re-read the block). ⚠️ The printed `Deployed version: … (git tag: …)` console line itself was not relayed — the record carries the same values. | ✅ |
| 2 — annotated tag on origin, at the deployed commit | Tag on origin **yes** (lead); **annotated yes** — origin lists a peeled `^{}` entry and the local ref is type `tag` (producer); points at **`204f931`** = the deployed commit **yes**. | ✅ |
| 3 — box marker, local record and tag agree | Box marker `/opt/uptrace/deployed-version`: `version=0.0.155-telemetry.1`, `commit=204f931…` (owner). Local record newest block: `version=0.0.155-telemetry.1`, `commit=204f931…`, `validation_result=ok git_tag=pushed` (producer). Tag → `204f931` (lead). Same version and same commit in all three **yes**. Neither marker line `unknown` **yes**. | ✅ |
| 4 — Uptrace UI loads with post-deploy data | **Not recorded.** The alert-probe log at 09:06:52 UTC reads *"accepted … channel state: delivering"* (owner) — that shows the alert relay works after the restart, **not** that the Uptrace UI loads with fresh data. | ❌ not recorded |
| 5 — tag missing ⇒ hand push | Not needed — the tag was pushed by the deploy. | n/a |
| 6 — other failure ⇒ new defect | No failure observed in steps 1–3. Step 4 is unrecorded, not failed. | n/a so far |
| 7 — no host / IP / URL / token / credential | This entry carries none. | ✅ |

**Verdict: NOT every verification step is met — Step 4 is outstanding.** One owner check closes it: open the Uptrace
UI and confirm it shows game-server data from after 09:04 UTC on 2026-10-03 (or later).

## 📌 2026-10-03, later — Step 4 met; closing (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-10-03, relayed by
`fkit-lead` to a spawned `fkit-producer` (no owner channel, ADR-021): **"Yes, close both (Recommended)"** — option
text: *"A producer adds today's Uptrace results to their notes and closes both with the marker '(agent-closed — not
owner-verified)'. No commit."* ⛔ Not producer precedent. Evidence: `fkit-lead`'s own read-only Uptrace check through
the owner's Chrome, owner-approved, ~10:35 UTC.

| Verification step | Reading | Met? |
|---|---|---|
| 4 — Uptrace UI loads with post-deploy data | Uptrace Logs → "By service", last 1 hour (all after the 09:04 UTC telemetry deploy): service `openfront` (game server) 62 info/min, 2.3 warn/min, 0.05 error/min; `geoconflict-client` also present; total 116 log/min. The UI loads and data arrives after the telemetry recreate. | ✅ |

**Verdict: every verification step is now met** (1–4 and 7; 5 and 6 not applicable). Closed via `/fkit-task-done`
`(agent-closed — not owner-verified)`.
