# 0335 — worklog (investigation, 2026-09-30)

Run by `fkit-architect`, spawned by `fkit-sprint-ship-loop` (driven by `fkit-lead`) on an owner ruling (2026-09-30,
*"Run it via the architect"*). No owner channel in this run. The status field was left as the driver set it. Nothing committed.

**Report:** [`ai-agents/knowledge-base/reports/2026-09-30-0335-lobby-close-leftovers-findings.md`](../../../knowledge-base/reports/2026-09-30-0335-lobby-close-leftovers-findings.md)

## What was done

- Read `0327`'s plan §6 and worklog *Residuals*; the `0333`/`0334`/`0347`/`0348`/`0035` plans, worklogs and reviews
  (*Accepted residuals*); and the `0228`, `0252`, `0352` and `0353` briefs.
- Traced each case in the **current working tree** (it includes the uncommitted `0333`/`0334`/`0347`/`0348`/`0035` changes).
- Checked whether each change is in a deploy: `0302` and `0327` are in the `0.0.155` deploy commit (`00825f0`); `0333`/`0334` are not.
- Ran five throwaway jest probes (P2, P3a, P3b, P4, P4b), once each, all green.
  - Afterwards they were **moved out of the tree** into the session scratchpad.
  - `git status` for `src/` and `tests/` matches the start of the run: only other tasks' changes.
- **Live two-window reproduction: NOT RUN.** Case 1's window is about one network round trip, a few ms on localhost. A
  real repro needs the dev server with a held-back `/cosmetics.json`. Port 9000 belongs to another project's dev server
  (not touched), and our dev server is fixed to 9000.

## Verdicts (full detail in the report)

| Case | Real? | Evidence | Still present after 0333/0334/0347/0348/0035? | Recommendation |
|---|---|---|---|---|
| 1 — close during the join's setup (`0228`) | Yes | Reasoned from code only | Yes, unchanged | Fold into `0228` |
| 2 — Transport listeners (`0252`) | Yes | Probe P2: listeners 0 → 24 → 48 → 72 over three join/leave cycles, inactive | Yes, unchanged | Add a note to `0252`; no new task |
| 3 — orphan lobby on early host close | Yes | P3a: client sends nothing after create; P3b: `Lobby` until 3 h | Yes, unchanged (`0333` left it on purpose) | Accept; re-raise before opening beyond testers |
| 4 — `isStarting` after Start | Yes | P4/P4b | Yes; `0334` adds more ways to reach it, but still no visible effect | Accept (optionally fold into `0353`) |

## Notes for whoever picks this up

- **Correction to the brief's framing, case 2:** Transport's listeners leak **per join**, not per leave. `0327` adds no
  extra leaked listeners. It only makes the private-lobby close a second shipped route on which the leak is visible.
- **Case 3 ordering:** `0327` plan §8's "after `0322`" rule no longer applies. `0322` is done and committed (`68303d5`).
- **Open question for the owner:** the likelihood estimates assume the `private_lobbies` flag is still testers-only in
  the Yandex console, as `0302`'s plan set it. This was not checked, because there is no console access.

## Not done

- No source, test, task-status or wiki change.
- No follow-up brief filed, and `0228`/`0252`/`0353` not edited. That waits for the owner's ruling and is the producer's job.
