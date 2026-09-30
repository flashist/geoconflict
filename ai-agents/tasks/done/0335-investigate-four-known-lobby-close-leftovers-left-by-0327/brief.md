# Investigate the four known lobby-close leftovers from `0327` — how real, how bad, how hard to fix

## ID
0335

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Allocated third of three in sequence (`0333`–`0335`)
> after a highest ID of `0332`. **`0335`:** no task folder, no hit under `ai-agents/tasks/` or
> `ai-agents/sprints/`.

## Sprint
Sprint 7

## Priority
12

> 📌 **2026-09-29 — rank 10 → 12.** Shifted down two by an OWNER-RULED placement that put `0339` + `0340` directly below `0337` on the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 `0339`/`0340` addendum). Not a merit change for this task.

> 📌 **2026-09-29 — rank 9 → 10.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

⚠️ **Priority 9 is append rank, NOT a merit ranking — flagged for owner confirmation.** The **placement** is
owner-ruled (end of the next sprint, 2026-09-28 — see *Context*); the number is this board's highest (8,
`0334`) plus one. No row was moved or renumbered (ADR-035).
**On merit this belongs directly below `0334`** (so, like it, above `0323`), because it can start as soon as
`0327` ships, while `0323` and `0332` wait on Sprint 6 work; it sits below `0333`/`0334` because those fix
confirmed gaps and this one only measures leftovers judged low or harmless at `0327`.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-architect

📌 **An investigation, not a build.** The deliverable is a findings report. Any fix it recommends is filed by the
producer as its own brief — or folded into `0228` / `0252` — **only after the owner rules on the findings.**

## Context

### Authority — filed on an owner ruling

**Filed 2026-09-28 by a spawned `fkit-producer` holding no owner channel, on an OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** The question was the four known leftovers recorded in `0327`'s plan §6 and worklog *Residuals*.
Owner's words, verbatim: *"Record all of them as known things, create a brief about investigating all of them to
try to figure out how bad and real the cases, and how hard it is to fix them. Add the brief to the end of the
next sprint."*

- **All four are recorded as known** — accepted in `0327`, **not fixed there**. "Next sprint" is read as
  Sprint 7.
- Sources: [`0327` plan](../../done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/plan.md) §6, and
  [`0327` worklog](../../done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/worklog.md) *Residuals*.
- **One investigation brief, by owner ruling** — not split per case. The cases share one seam (closing a
  lobby window mid-flight) and one question (is each worth fixing?).

### The four cases, in plain terms

1. **`0228`'s join/leave race.** When a player joins a private lobby, the client marks them joined and then
   waits (three awaits, under about 1 s) before it records the connection (`gameStop`) in `handleJoinLobby`
   (around `src/client/Main.ts:746-754`). If the player closes the window in that gap, the leave is dropped
   (`handleLeaveLobby` returns early when `gameStop` is empty) and the join then completes **invisibly** — the
   player is in the lobby with the window closed. `0327`'s fix made the close send a leave, which is what makes
   this gap reachable on this route.
2. **`0252`'s Transport listener leaks, now also on the private-lobby leave route.** A leave on this route now
   runs `gameStop`, so the Transport event-bus listeners that `0252` says leak per game are now reachable here
   too. Same as the public-lobby leave route today — not new in kind, but a new route to it.
3. **An orphan private lobby when the host closes before `createLobby` answers.** The lobby is created on the
   server but never joined. The server keeps an unstarted private lobby until the maximum game duration
   (`GameServer.ts` phase logic). The worklog notes this is the same lifetime an abandoned private lobby has
   today — for example, reopening Create already orphans the previous one.
4. **`isStarting` stays true after a successful host Start** until the next `open()` (the close bumps the
   opening counter, so `startGame`'s `finally` skips its reset). The worklog judged it harmless: the window is
   closed and the next `open()` resets it.

⚠️ Line numbers are from the working tree on 2026-09-28, with `0327`'s changes not yet committed. Find the code
by name.

### How this relates to existing tasks — link, don't absorb

- **Case 1 is [`0228`](../../backlog/0228-handlejoinlobby-stale-gamestop-race/brief.md)'s race** (Backlog board). This
  investigation measures it **as reached through `0327`'s close routes** and says how bad that is. If a fix is
  warranted, the recommendation is to fix it **in `0228`** (the producer updates `0228`'s brief and, with the
  owner, its rank) — not to file a second task for the same race.
- **Case 2 is [`0252`](../../backlog/0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md)'s leak**
  (Backlog board). Same rule: measure the new route's contribution, and route any fix to `0252`. **Do not edit
  `src/client/Transport.ts`**; it is `0252`'s.
- **Cases 3 and 4 have no task today.** For each, recommend: file a fix brief, fold it into another task, or
  accept it as a known leftover.
- **Siblings from the same review:** [`0333`](../../done/0333-closing-the-host-window-before-the-private-lobby-exists-leaves-the-player-in-a-public-lobby/brief.md)
  (the public-lobby early-close bug — same early-close window as case 3, different consequence) and
  [`0334`](../../done/0334-host-start-still-sends-start-game-after-the-window-closed-during-the-settings-save/brief.md)
  (Start during the settings save — same Start function as case 4). If a finding shows a case is best fixed
  together with one of them, say so; do not change their scope yourself.

## What to build

A findings report at `ai-agents/knowledge-base/reports/<date>-0335-lobby-close-leftovers-findings.md`
(never the wiki). For **each of the four cases**:

1. **Is it real?** Establish it by a failing test, a scratch probe, or a local reproduction (`npm run dev`, two
   browser windows). If only reasoned from code, label it that way. If it cannot happen, say so and why.
2. **How bad?** What the player sees; whether it affects other players (friends in the lobby, server load);
   whether it loses or corrupts anything; whether it is reachable **in production** (for example, only
   citizens can create a lobby — `0302`; state which production entry points expose each route).
3. **How likely?** The size of the window and what a player has to do to hit it. Give a rough estimate with its
   basis, not a number without one. If production telemetry could measure it, say which signal and whether it
   exists today.
4. **How hard to fix?** Rough size, files touched, client vs server, test approach, and risk. For case 3, note
   that a server-side change would touch `GameServer.ts` / `Worker.ts` and, per `0327`'s plan §8, would need to
   be sequenced after `0322`.
5. **Recommendation:** fix (where — existing task or new brief), fold into a sibling, or accept as known — one
   recommendation per case, with its main tradeoff.

End the report with a one-table summary (case · real? · severity · likelihood · fix cost · recommendation) and
the open questions for the owner.

**Out of scope:** writing or changing any source code, and fixing any case. Scratch probes and throwaway tests
are fine but must not be left in the tree.

## Verification steps

- The report exists at the path above and covers **all four cases**, each with the five points above.
- Each "real" / "not real" verdict names its evidence (test, probe, reproduction, or "reasoned from code only").
- Cases 1 and 2 each state their relation to `0228` / `0252` and do not propose a separate task for the same
  defect.
- No source changes in the tree from this task (`git status` shows only the report and task-folder files).
- The findings are reviewed with the owner; the producer files any follow-up briefs (or updates `0228` / `0252`)
  only after that review.

## Notes

- **Depends on:** `0327` (the cases describe `0327`'s shipped code; investigate against it, not a moving target)
- **Blocks:** nothing
- **Related:** `0327` (source — plan §6, worklog *Residuals*), `0228` (case 1 — link, don't absorb), `0252`
  (case 2 — link, don't absorb), `0333` and `0334` (sibling briefs from the same review), `0302` (citizen-only
  create limits production reach), `0322` (sequencing, if case 3 leads to a server change).

## Close record — owner rulings on the findings (2026-09-30)

**Closed 2026-09-30 by a spawned `fkit-producer` with no owner channel** (ADR-021/033 §5 — hence the
agent-closed marker). The rulings below were given **live by the owner via `AskUserQuestion` in the
`fkit lead` session and relayed by `fkit-lead`** (ADR-021/037); ⛔ not producer precedent.

- **Deliverable exists:** [findings report](../../../knowledge-base/reports/2026-09-30-0335-lobby-close-leftovers-findings.md)
  and this folder's [`worklog.md`](./worklog.md). All four cases real, none serious, none resolved by
  `0333`/`0334`/`0347`/`0348`/`0035`.
- **Evidence limits, stated plainly:** the live two-window reproduction was **NOT RUN**. Case 1 is
  **reasoned from code only**; cases 2–4 were shown by throwaway jest probes, since removed from the tree.
- **No code review step ran.** This was an investigation; it produced a report, not a diff, so there was
  nothing to review. Nothing here is owner-verified beyond the rulings themselves.

| Case | Owner ruling (verbatim option) | Where it is recorded |
|---|---|---|
| 1 — close within a split second of joining; the join completes with the window closed | **"Add to task 0228"** | Dated note on [`0228`](../../backlog/0228-handlejoinlobby-stale-gamestop-race/brief.md) (§3). No new task; `0228`'s rank and status unchanged. |
| 2 — Transport listener leak, +24 inert bus listeners per private join | **"Note it on task 0252"** | Dated note on [`0252`](../../backlog/0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md). Rank kept (Medium, owner's). |
| 3 — orphan private lobby when the host closes before `create_game` answers; the empty lobby lingers 3 h | **"Accept, revisit later"** | **Here.** Accepted as a known leftover. **Revisit before private lobbies open to all players.** Nothing filed. If fixed later: server-side only, ~10–20 lines in `GameServer.phase()` (idle unstarted-private-lobby cleanup, covers every abandoned private lobby). The old "wait for `0322`" ordering no longer applies — `0322` is done. |
| 4 — `isStarting` stays true after the host's Start until the next `open()` | **"Accept as known"** | **Here.** Accepted as a known leftover; zero player effect. Nothing filed. |

⚠️ **UNCONFIRMED FACT — the likelihood answers for cases 1 and 3 rest on it.** The report assumes the
Yandex remote switch `private_lobbies` is on **for testers only**. **The owner did not confirm the
current console state** (report open question 5, not answered). Until someone checks the console, read
"testers only today" as an assumption, not a fact.

**Follow-up filed on a separate owner request the same day:** the testers-by-default + everyone-flag
brief — see the Backlog board row for [`0354`](../../backlog/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md).
Cases 1 and 3 must be revisited before that everyone-flag is set.

**Wiki:** the report is not yet in the wiki — `fkit-wiki` should run `/fkit-wiki-ingest` on it.
