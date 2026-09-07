# A mid-game server `error` — the tab kick — shows a modal and leaves the `PerformanceMonitor` running; same for the desync and lobby-error modals

## ID
0233

## Sprint
Sprint 4

## Status
🔲 Backlog

## Owner
fkit-coder

## Priority
Medium *(**the LABEL follows an owner ruling relayed 2026-09-07** — the owner ruled this **class** of
defect **Medium, not urgent**. ⚠️ **The row's POSITION on the board is the producer's**, not
owner-ruled.)*

⚠️ **It was APPENDED at the bottom of the Sprint 4 board on filing.** fkit's **ADR-035** bars a
producer from inserting a new row above a board's closed rows, so appending is the only mechanically
permitted placement. **Any move is the owner's to rule.**

📎 *ADR-035 is cited by name, never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs, which live in the fkit install share. This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link would not resolve.*

---

## Context

**Filed 2026-09-07 on an owner ruling given live in session:** this gets its **own task**, and is
**not** folded into [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md).

**Found INDEPENDENTLY BY BOTH REVIEWERS** during the `0227` code review — which is the strongest
signal on it. The `0227` planning pass had already identified these sites and **deliberately ruled
them out of scope**; this task is where they come back.

### The sites — CODE FACTS, each re-read at commit `702a8ea`

⚠️ **Every line number below was read from `git show 702a8ea:src/client/ClientGameRunner.ts`, not the
working tree**, which another session was editing at filing time. **`0227` lands in this same file
first, so the implementer MUST re-verify all of them.**

| # | Line (at `702a8ea`) | Path | Why it matters |
|---|---|---|---|
| 1 | `:663-672` | **mid-game server `error` — the tab kick** | 🔴 **The headline.** `if (message.type === "error")` inside `ClientGameRunner`'s live `onmessage`; shows `showErrorModal(..., "error_modal.connection_error")` and **nothing else**. The game is over for the player; the monitor keeps sampling. |
| 2 | `:649-661` | **desync** | `if (message.type === "desync")` → `showErrorModal(..., "error_modal.desync_notice")`, and nothing else. |
| 3 | `:217-227` | **lobby error, pre-`ClientGameRunner`** | The `error` branch in `joinLobby()`'s own `onmessage` → `showErrorModal(..., "error_modal.connection_error")`. ⚠️ **Whether a monitor is even running here is NOT settled** — see below. |

**In all three, `showErrorModal` is the entire handling.** No `stop()`, no teardown, no monitor stop.

⛔ **NOT in scope — it belongs to `0227`:** the worker-init failure `catch` at
`ClientGameRunner.ts:289-305`. `0227` already covers it. Do not touch it here.

### ⚠️ Site 3's premise is a question, not a fact

The `PerformanceMonitor` is started from `Main.ts:757` (`this.restartPerformanceMonitor()`) inside the
**`onJoin`** callback passed to `joinLobby`, which `ClientGameRunner.ts` fires on
`message.type === "start"`. Site 3's `error` branch lives in **the same `onmessage` handler** and can
therefore fire **before or after** that. ⇒ **whether a monitor is running at site 3 depends on
ordering, and nobody has checked.** ⚠️ **Verify per site whether a monitor is actually running before
writing a fix for that site** — a site with no monitor needs no monitor fix.

### 🚨 The scale of the leak — reasoned, not measured

**What the code says:** at site 1 the player has been kicked, the game is dead, and the monitor's
`setInterval` plus its `requestAnimationFrame` loop keep going. **How long it survives is bounded by
what happens next** — `Main.handleLeaveLobby()` (`Main.ts:923-937`) and the join path
(`Main.ts:675-678`) both call `stopPerformanceMonitor()`, so a later leave or join clears it.

⛔ **Nobody has observed any of this in a browser, and no event volume has been measured.** ⚠️ **No
figure, rate or severity may be written for it anywhere** until step 1 measures it. Whether the
player typically leaves promptly after the kick modal — which would make the leak small — is
**unknown**.

### Where this sits among the sibling tasks

| Task | What it covers | Bounded or accumulating? |
|---|---|---|
| [`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md) | monitor orphaned on lobby rejoin | Bounded |
| [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) | monitor survives a crashed/failed game | Bounded |
| [`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md) | stale `gameStop` across three awaits | Bounded |
| [`0231`](../0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md) | whole runner + worker + 1 s interval on normal leave | Accumulating — ⚠️ reasoned, not observed |
| [`0232`](../0232-worker-tick-error-never-reaches-main-thread/brief.md) | worker tick faults never reach the main thread at all | — |
| **`0233` (this task)** | **the three remaining `showErrorModal` sites that stop nothing** | ⚠️ **Unmeasured — see above** |

**Same family as `0225` / `0227` / `0231`.** ⛔ It does **not** explain or close
[`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md) or
[`0230`](../0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md).

### ❓ OPEN QUESTION for whoever plans this — deliberately NOT decided here

**Can `0227`'s `onGameEnd` seam be reused for these three sites, or do they need a different one?**
It is *likely* — that is the seam's whole purpose — but the seam does not exist in committed code
yet, sites 1 and 2 sit inside the runner's own `onmessage` while site 3 sits **outside**
`ClientGameRunner` entirely, and site 3's premise is unsettled. **This brief does not decide it.**
⚠️ Answer it against **`0227` as it actually landed**, not as its brief described it.

⚠️ Also unsettled and part of the design: **should these sites call `stop()`** (full teardown —
worker cleanup, transport leave, interval clear) **or only stop the monitor?** A tab kick and a
desync arguably want full teardown; the lobby-error site may not. ⛔ **Do not assume they are the
same.** `0227`'s brief bars re-driving `Main.gameStop` from the runner unless shown safe — that
constraint applies here too.

---

## What to build

Make the three error paths above stop what the game started — at minimum the `PerformanceMonitor` —
after answering the seam and teardown-depth questions above.

### Work plan — in this order

1. **Confirm each site, one at a time, in a real browser.** For each of the three: trigger it
   (a mid-game kick, a forced desync, a lobby-side error), and record **whether a
   `PerformanceMonitor` is running at that moment** and **whether `Performance:*` events keep being
   emitted afterwards, and for how long** before a leave or join clears them.
   ⚠️ **A site with no running monitor needs no fix — say so and drop it** rather than writing code
   for it.
2. **Answer the seam question in writing** — reuse `0227`'s `onGameEnd`, or a different seam, and
   why.
3. **Answer the teardown-depth question in writing** — per site: full `stop()` or monitor-only.
   ⚠️ If any answer re-drives `Main.gameStop` from the runner, **write the safety argument `0227`
   demanded.**
4. **Implement only the sites step 1 confirmed.**
5. **Re-measure by the same method as step 1**, and show the emission stopping.

### 🔒 Constraints

- ⛔ **Do not fold this into `0227`, and do not edit `0227`'s task folder** (`brief.md`,
  `worklog.md`, `review.md`).
- ⛔ **Do not touch the worker-init failure `catch`** (`ClientGameRunner.ts:289-305`) — that is
  `0227`'s.
- ⛔ **Do not write a severity, rate or player-impact figure that has not been measured.**
- **All code changes in `src/core/` MUST be tested** (`CLAUDE.md`). This task is expected to be
  `src/client/` only — **if it reaches `src/core/`, the rule applies in full.**
- **Never commit or push unless the owner explicitly asks.**

---

## Verification steps

1. **Per site, step 1's observation is recorded**: monitor running yes/no, events after the modal
   yes/no, and for how long. ⛔ Code-reading alone does not satisfy this.
2. **The seam question is answered in writing** — `0227`'s `onGameEnd` reused, or why not.
3. **The teardown-depth question is answered in writing, per site.**
4. **For each confirmed site, `Performance:*` emission is shown to stop** after the error modal, by
   the same method used in step 1. A before-number without an after-number fails this.
5. **Any site dropped is recorded with the reason** ("no monitor running at this point"), not silently
   omitted.
6. **A normal game still plays end to end** in a real browser — join, play, leave — and a *recoverable*
   condition does not tear the game down prematurely. ⚠️ This is the real risk of the change: too much
   teardown on a survivable error is worse than the leak.
7. `npm test` green; `npm run lint` clean. ⚠️ `npm test` now runs the shell harnesses and takes
   **~22–25 s**, not ~3 s (`CLAUDE.md`) — expected, not a hang.

---

## Notes

- **Producer's RANK RECOMMENDATION, put to the owner separately — NOT an owner ruling:** keep the
  **`Medium`** label (it matches the owner's class ruling) and leave the row **where it was
  appended — at the bottom of the Sprint 4 board**. ⚠️ **The board order above it was OWNER-RULED
  2026-09-07 as `0227` → [`0232`](../0232-worker-tick-error-never-reaches-main-thread/brief.md) →
  [`0231`](../0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md)**, so this row sits
  fourth, below all three. **That ruling did not touch this row** — its position remains the
  producer's. Reasoning for leaving it last: it is the
  smallest and least urgent member of the family, its scale is unmeasured, and it depends on `0227`'s
  seam existing.
- **Depends on:** [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) landing
  first — it introduces the seam this task likely reuses and it edits the **same file**
  (`src/client/ClientGameRunner.ts`), so starting early means designing against a seam that does not
  exist and taking a near-certain merge conflict.
  ⚠️ **Step 1 — the per-site measurement — does NOT depend on `0227`** and could be run at any time.
- **Blocks:** nothing.
- **Evidence provenance:** found **independently by both reviewers** during the `0227` review; the
  candidate sites were identified by the `0227` planning pass and ruled out of scope there. Every
  `file:line` above was re-verified by the producer at commit `702a8ea` via `git show`, because the
  file was being edited by another session at filing time. ⚠️ **The implementer must re-verify every
  line number again** — `0227` lands in this file first.
- 🚨 **The leak's SCALE is unmeasured.** The sites are code facts; the volume and duration are not.
- **Filed 2026-09-07 by a spawned `fkit-producer`**, on an owner ruling relayed through the spawning
  session. The producer had **no owner channel**.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — `file:line` references only.
