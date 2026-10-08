# Investigation: the Four Lobby-Close Leftovers From 0327 (task 0335)

**Source**: `ai-agents/tasks/done/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md` + `ai-agents/knowledge-base/reports/2026-09-30-0335-lobby-close-leftovers-findings.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 12 (append rank) / task `0335` — investigation, no code

> 📌 **2026-10-06 sync — case 3 is BUILT:** `0377` ends an unstarted private lobby with nobody connected after **30
> idle minutes** (owner's value), done 2026-10-04 (agent-closed — not owner-verified), committed `8d74090`, ⚠️ **not
> deployed**; 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `8d74090` is an ancestor of tag `0.0.157`; `0396` worklog).* live check `0390` (Sprint 8). See [[tasks/private-lobby-idle-end]]. Case 1 (`0228`) unchanged.
>
> ✅ Done (agent-closed — not owner-verified), 2026-09-30, on owner rulings for all four cases. **No code review
> step ran** — it produced a report, not a diff. ⚠️ **The live two-window reproduction was NOT RUN.** Case 1 is
> **reasoned from code only**; cases 2–4 were shown by throwaway jest probes, since removed from the tree.

## Goal

The owner ruled all four leftovers recorded in [[tasks/private-lobby-close-leaves-lobby]] (`0327`) as known, and
asked for one investigation (*"…figure out how bad and real the cases, and how hard it is to fix them"*): for each
case — is it real, how bad, how likely, how hard to fix, and a recommendation. Report by `fkit-architect`.

## Key Changes

**Findings (all four real, none serious, none fixed or changed by `0333` / `0334` / `0347` / `0348` / `0035`):**

| Case | Real? (evidence) | Severity | Likelihood | Fix cost |
|---|---|---|---|---|
| 1 — close during a join's setup (`0228`'s race) | Yes — **code only** | Low: the join completes invisibly; an idle joiner can be pulled into the host's match; heals on the next action | Very rare: a close within ~one round trip (`/cosmetics.json` is fetched on every join, uncached) | Small–medium, client-only, `Main.ts` |
| 2 — Transport listener leak (`0252`) | Yes — probe: **+24 inactive bus listeners per join**, never removed | Negligible, bounded by page reload | Every private join | ~30 lines in `Transport.ts` (`0252`'s file) |
| 3 — orphan private lobby when the host closes before `create_game` answers | Yes — probes: the client sends nothing; an unstarted private lobby with no clients lives **3 hours** | Negligible: one idle server object, `games.total` +1 for 3 h | Rare; far rarer than ordinary abandons with the same result | Server-only, ~10–20 lines in `GameServer.phase()` (idle-lobby cleanup for the whole class) |
| 4 — `isStarting` stays true after a host Start | Yes — probes | None visible (the next `open()` resets it) | Every Start | One line + one test |

- **Correction to the brief (case 2):** the listeners are added **per join**, not per leave; `0327` adds no extra
  leak, it only makes the private-lobby close a second shipped route on which the same leak is visible.
- **No longer true (case 3):** `0327`'s rule that a server fix must wait for `0322` — `0322` is done.
- **There is no server call to cancel a lobby**, so a client-only fix for case 3 cannot work.
- `create_game` is **not identity-gated** and is limited only by a per-IP rate limit (report, case 3).

## Outcome

**Owner rulings 2026-09-30** (live via `AskUserQuestion`, relayed by `fkit-lead`):

| Case | Ruling (verbatim option) | Where it went |
|---|---|---|
| 1 | **"Add to task 0228"** | dated note on `0228` (Backlog board); rank unchanged |
| 2 | **"Note it on task 0252"** | dated note on `0252`; rank kept (Medium) |
| 3 | **"Accept, revisit later"** | accepted; **revisit before private lobbies open to all players** |
| 4 | **"Accept as known"** | accepted; nothing filed |

- ⚠️ **UNCONFIRMED FACT — the likelihood answers for cases 1 and 3 rest on it:** the report assumes the Yandex
  remote flag `private_lobbies` is on **for testers only**. The owner did **not** confirm the console state (report
  open question 5). Read "testers only today" as an assumption.
- **Follow-up filed the same day on a separate owner request:** **`0354`** — show private lobbies to testers by
  default and add an "everyone" flag, empty by default. Cases 1 and 3 must be revisited before that flag is set.
- 📌 **2026-10-03 — the "revisit before private lobbies open to all players" came due, by OWNER RULING**
  (*"Hidden + test plan first"*, live, relayed by `fkit-lead`; ⛔ not producer precedent). Cases 1 and 3 are now
  items 3 and 4 of a six-item release gate (in `0354`'s brief; table on [[tasks/private-lobby-citizen-perk]]):
  - **Case 3 → new task `0377`** (Backlog board): end an **unstarted private** lobby that has had **no connected
    client for N minutes**, in `GameServer.phase()` — server-only, covers every abandoned private lobby, not just the
    early-close path. Grace time (findings suggest 10–15 min) and the start of the count are **owner questions** for
    the plan.
  - **Case 1 (`0228`) → "Only if it's proven"**: investigate; fix only if the race is **actually reproduced** in a
    test or live (*"No, needs a real repro"* — code reasoning alone is not enough); otherwise it drops off the gate.
  - ✅ The unconfirmed console fact above is **partly answered**: private lobbies are **hidden** — owner-attested
    2026-10-03, not agent-verified (*"the lobbies are switched off, nobody can use them"*). So not even testers use
    them today; the exact flag values are still unrecorded.
- Measuring cases 1 and 3 in production would need a new client event; only partial server signals exist today
  (the `game past max duration` warning counts every abandoned private lobby, not this path).

## Related

- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, source of the four cases
- [[tasks/host-create-leaves-public-lobby]] — task `0333`, same early-close window as case 3, different consequence
- [[tasks/host-start-stops-after-window-close]] — task `0334`, adds more routes to case 4 but no new effect
- [[tasks/private-lobby-citizen-perk]] — task `0302`: citizen-only create and the `private_lobbies` flag that bounds production reach
- [[systems/client-game-teardown]] — `0228` (case 1) and `0252` (case 2) are part of this teardown cluster
- [[decisions/sprint-7]] — the board; [[decisions/sprint-backlog]] carries `0228`, `0252` and `0354`
- [[tasks/private-lobby-idle-end]] — task `0377`, the build for case 3 (30-minute idle end)
- [[tasks/private-lobby-tester-default]] — task `0354`, requested at this task's close
