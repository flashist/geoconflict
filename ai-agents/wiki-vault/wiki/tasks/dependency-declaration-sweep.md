# Sweep Real Dependencies Into the Canonical `**Depends on:**` Declaration

**Source**: `ai-agents/tasks/done/0196-sweep-dependency-declarations-into-briefs/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — board hygiene (sibling of the unscheduled `0050`/`0051`/`0053` sweeps)

> ✅ **Closed 2026-09-01 by a spawned producer — agent-closed, not owner-verified.** Documentation only: no code, no `dashboard.sh` change, no status change, no file moves.

## Goal

`dashboard.sh` — the deterministic board renderer behind `/fkit-status`, and the same reader the sprint ship-loop consults when deciding what is eligible to pull — derives each open task's next step from a **canonical dependency declaration inside the brief**. A brief carrying none renders `⟨derive: none recorded⟩` and emits `derive <id> depends="none recorded"`.

**The direction of the error is the whole argument for the task.** A reader — human or agent — sees `none recorded` and concludes *"no gates, ready to pull."* For most affected briefs that is false: the real gates exist, in prose, in `## Notes` or the body, where the parser cannot reach them. `dashboard.sh`'s own source states it: *"a wrong dependency is visible, a fabricated `ready` is not."* A wrong dependency gets challenged the moment somebody reads it; a fabricated `ready` gets acted on.

**Scope owner-ruled 2026-08-28: all briefs under `tasks/backlog/` with no declaration of any form** — taking the producer's recommendation over the 8-brief board-visible minimum, on the grounds that the edit is identical per brief and sweeping the superset stops the surprise recurring when an unlinked brief later joins a board. **Sprint placement was also owner-ruled that day** — promoted into Sprint 4 over the `0050`/`0051`/`0053` `Unscheduled` precedent, because those repair legacy records while this repairs rows the ship-loop's eligibility check reads now. Priority **Medium** was the producer's and the owner did not disturb it.

## Key Changes

Each brief in scope gained **one canonical single-line declaration** in its `## Notes` section:

```
- **Depends on:** <the real gates, in one unbroken sentence>
```

Four rules governed the edit:

- **Transcription, not re-scoping.** Content comes from what the brief *already says* in prose. Nothing was invented, inferred or upgraded; a brief whose gates were genuinely unclear was to be left and reported, because a fabricated dependency is a different lie, not a fix.
- **Existing prose stays exactly where it is.** It remains the human-facing explanation; the bullet is the machine-readable form beside it. `0065`'s brief is the worked precedent — it carries both.
- **A brief with no dependencies gets an explicit `- **Depends on:** nothing.`, never silence.** Silence and "no gates" are indistinguishable to every reader.
- **Single unbroken bullet.** The parser joins wrapped continuation lines but **stops at a blank line, a heading, and a sibling-or-shallower list item**. Splitting gates into sub-bullets has already truncated a declaration to a non-empty fragment once — which is *worse* than failing, because the loud `⟨UNPARSEABLE⟩` path never fires and the tasks simply vanish.

**Verification was by parser, not by eye** — re-running `dashboard.sh` on each board and comparing the emitted `derive <id> depends="…"` text word for word against the bullet. Reading the diff cannot catch the truncation failure mode; only the sentinel can.

## Outcome

- **Sprint 4's `none recorded` count went 6 → 0.**
- ⚠️ **The numbers do not match the brief's stated scope, the gaps were investigated, could not be reconciled, and were REPORTED rather than laundered.** The sweep covered **30 briefs, not the brief's stated 31**, and the board-visible-today subset re-derived on the day of the sweep was **7, not 8**. Do not "correct" these figures back toward the brief's headline numbers.
- **The 8-brief figure was correct on the date it was measured (2026-08-28) and went stale by one task.** `0025` closed to `tasks/done/` before the sweep ran, so its row stopped emitting the fact. The 2026-08-28 measurement is left in the brief exactly as filed, with a dated correction beside it, leaving **`0018` as the only live Sprint 4 row in the board-visible set**. Scope was untouched by that correction.
- 📌 **A "14" in the task's original framing was never a measurement.** It was an unverified relay — the lead session passed on a figure from an earlier producer's report without measuring it, and confirmed 2026-08-28 that it is not reproducible. The raw per-board counts (7 / 7 / 5 / 23 / 0) yield no combination equal to 14. Recorded so nobody hunts for a derivation that never existed.
- **Pre-existing board drift was deliberately not fixed** — missing-brief rows, unknown markers, and the moved-without-target rows on the other boards are out of scope and were recorded before/after so their being unchanged is provable.
- **`dashboard.sh` itself was not touched.** It is upstream fkit tooling behaving correctly, and its source comments are the specification this task followed.

## Related

- [[decisions/sprint-4]] — the board whose eligibility check this makes trustworthy
- [[decisions/sprint-backlog]] — the other boards swept, and where `0050`/`0051`/`0053` live
- [[systems/agent-conventions]] — the project's standing law, including the dependency-declaration form and priority-vs-identity
- [[tasks/licensing-asset-audit]] — task `0025`, whose close is what moved the board-visible count from 8 to 7
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, one of the briefs already carrying an explicit `Depends on: nothing.` used as wording to copy
