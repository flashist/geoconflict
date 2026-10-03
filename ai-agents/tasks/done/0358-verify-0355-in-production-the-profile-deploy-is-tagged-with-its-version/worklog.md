# Worklog — 0358 verify 0355 in production (profile deploy tagged with its version)

## 📌 2026-10-03 — evidence from the weekend window (appended; ADR-035)

**Provenance.** Written by a spawned `fkit-producer` (no owner channel, ADR-021) on an **OWNER RULING given live in
the `fkit lead` session via `AskUserQuestion` on 2026-10-03, relayed by `fkit-lead`: "Yes, record it
(Recommended)"** (*"A producer writes the results into weekend-deploy-slot-runbook.md and the task files. No
commit."*). ⛔ Not producer precedent. **Evidence only — `## Status` unchanged, task not closed.** Sources:
**(lead)** `fkit-lead`'s own check · **(owner)** owner's live report · **(producer)** the producer's own read-only
look-up. Full window record: [runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *What happened
2026-10-03 — weekend window ran*. Version names, commits, digests and yes/no only.

| Verification step | Reading | Met? |
|---|---|---|
| 1 — name, date, success, `git tag:` result | Name **`0.0.156-profile.1`** (deploy printed *"Deploy version: 0.0.156-profile.1 (package.json 0.0.156, commit f712263)"*, lead); deployed **2026-10-03** (record block 10:02:38 UTC); success **yes** (`validation_result=ok`); `git tag:` **pushed** (`git_tag=pushed`) (lead; producer re-read the block). The base is `0.0.156` because the game deploy bumped the version first in the same slot — correct per the brief. | ✅ |
| 2 — `/health` reports the name | `{"status":"ok","version":"0.0.156-profile.1","commit":"f712263…"}` (lead). `version` = Step 1 name **yes**; commit **`f712263`**. | ✅ |
| 3 — annotated tag on origin at the deployed commit; registry name at the deployed digest | Tag on origin **yes**; **annotated yes** (peeled `^{}` entry on origin, local ref type `tag`) (producer); points at **`f712263`** = `/health`'s commit **yes**. Registry name `:0.0.156-profile.1` present **yes**; resolves to `sha256:b26113a8…df32` = the digest in the deploy record **yes** (producer, read-only registry look-up, 2026-10-03). | ✅ |
| 4 — `service.version` in Uptrace, or "not observable" | **Not recorded** — neither read nor marked "not observable". | ❌ not recorded |
| 5 — tag missing ⇒ hand push | Not needed. | n/a |
| 6 — other failure ⇒ new defect | None observed. | n/a so far |
| 7 — `0297` §1 ordering respected | **Yes, so far.** This is the first profile deploy that ships `0309`'s log line (`0309` committed 2026-09-30 in `26b85c0`, an ancestor of `f712263`; the 2026-09-29 deploy predates it) and the first tagged profile deploy. No second profile deploy has happened. ⛔ **Standing: no second profile deploy and no profile box restart until `0297` §1 has read that line after a real purchase.** This step stays true only while that holds. | ✅ (standing) |
| 8 — no host / IP / URL / registry path / token / credential | This entry carries none. | ✅ |

**Verdict: NOT every verification step is met — Step 4 is outstanding.** One owner check closes it: in Uptrace, read
the profile server's `service.version` (expected `0.0.156-profile.1`), or mark it "not observable" if the profile
server's telemetry is not visible.

**Also recorded (not a step of this task):** profile error lines 0 at 15 and 40 min (owner); migrations all *"skip
(already applied)"* (owner output); the on-box value check output was not captured. New S2-or-later rollback target:
`sha256:b26113a8…df32` (previous `sha256:75fd196a…28e0`).

## 📌 2026-10-03, later — Step 4 met; closing (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-10-03, relayed by
`fkit-lead` to a spawned `fkit-producer` (no owner channel, ADR-021): **"Yes, close both (Recommended)"** — option
text: *"A producer adds today's Uptrace results to their notes and closes both with the marker '(agent-closed — not
owner-verified)'. No commit."* ⛔ Not producer precedent. Evidence: `fkit-lead`'s own read-only Uptrace check through
the owner's Chrome, owner-approved, ~10:35 UTC.

| Verification step | Reading | Met? |
|---|---|---|
| 4 — profile `service.version` in Uptrace | Metric explorer, `geoconflict_profile_http_duration` grouped by `service_version`, last 1 hour: series `1.0.0` up to ~10:03 UTC (the old image's placeholder version), then **`0.0.156-profile.1`** from ~10:03 UTC onward. Small gap in the series at the container recreate. Not `1.0.0`, not `unknown` after the deploy. | ✅ |

**Verdict: every verification step is now met** (1–4, 7, 8; 5 and 6 not applicable). ⚠️ Step 7 is a standing
condition: **no second profile deploy and no profile box restart until `0297` §1 has read `0309`'s log line** — it
outlives this close. Closed via `/fkit-task-done` `(agent-closed — not owner-verified)`.
