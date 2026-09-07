# Worklog — 0225: stop orphaning `PerformanceMonitor` instances

**Implemented by** a spawned `fkit-coder` under the `fkit-lead` conductor session, 2026-09-07.
**Base:** `HEAD` = `35afc64`. **Plan:** `plan.md`, blob `48565bb8f10f9adaf5b39abbb484a9059ed239b6`
(hash verified from disk before any edit).

**Nothing was committed.** All changes are left in the working tree for the owner.

---

## Change surface — one file, `src/client/Main.ts`

Implemented §3 of the plan exactly. All six line numbers were re-verified against current source
before editing; every one matched the plan.

| # | Site | Change |
|---|---|---|
| 1 | after `handleLeaveLobby` | **new** `stopPerformanceMonitor()` — stops and nulls |
| 1 | after `handleLeaveLobby` | **new** `restartPerformanceMonitor()` — stops predecessor, then starts |
| 2 | `:249` (`beforeunload`) | `this.perfMonitorStop?.()` → `this.stopPerformanceMonitor()` |
| 3 | `:275-276` (`SendWinnerEvent`) | two lines → `this.stopPerformanceMonitor()` |
| 4 | `:676-679` (`handleJoinLobby`) | **added** `this.stopPerformanceMonitor()` beside `this.gameStop()` — **F1's fix** |
| 5 | `:757` (`onStart`) | `this.perfMonitorStop = startPerformanceMonitor()` → `this.restartPerformanceMonitor()` — **F3's containment** |
| 6 | `:931-932` (`handleLeaveLobby`) | two lines → `this.stopPerformanceMonitor()` |

**Net +18 / −6 lines.** Measured 2026-09-07 with `git diff --numstat -- src/client/Main.ts`
(`18	6`); `--stat` reports `1 file changed, 18 insertions(+), 6 deletions(-)`. ⚠️ An earlier
revision of this worklog said "+12 / −5" — that figure was **wrong**, was never measured, and was
caught by the round-1 review (`review.md` R2). No behaviour change on any path that was already
correct.

**`src/client/PerformanceMonitor.ts` is byte-identical to `HEAD`** — `git diff` empty,
`SAMPLE_INTERVAL_MS = 300 * 1000` intact, no instrumentation residue anywhere in `src/`.
`src/client/Main.ts` is the only changed file under `src/`.

**No analytics event was added, renamed, or removed** — recorded explicitly, per the brief.
`analytics-event-reference.md` therefore needs no update and was not touched.

---

## Verification

### ⚠️ What the runtime evidence actually covers — read this before the PASS below

The console observation is real and it is the strongest evidence here, but it is **narrow**. Stated
up front so the PASS is not read as broader than it is (`review.md` R3):

| Site | Runtime evidence? |
|---|---|
| `:678` (`handleJoinLobby` join-over) | ⚠️ **Covered, but not individually** — see below |
| `:757` (`onJoin` → `restartPerformanceMonitor`) | ⚠️ **Covered, but not individually** — see below |
| `:249` (`beforeunload`) | ❌ **None.** Static reading only |
| `:275` (`SendWinnerEvent`) | ❌ **None.** Static reading only |
| `:931` (`handleLeaveLobby`) | ❌ **None.** Static reading only |

- **One path was exercised: the F1 mid-game join.** That path fires `:678` and `:757` — but the
  observation **cannot tell which of the two stopped monitor `#1`**. The log below has only **4 ms**
  between `joining lobby, stopping existing game` (`:677`, immediately before the `:678` stop) and
  `monitor #2 STARTED` (`:757`), and monitor `#1`'s next tick was not due for ~3 s. Both fired inside
  the observed window. The negative control reverted **both** sites together, so it cannot separate
  them either. The PASS proves **the pair works**; it attributes nothing to either site alone.
- **The three remaining sites were never exercised.** The run was two consecutive singleplayer games
  with **no page reload** (so no `beforeunload` → `:249`), joined **mid-game** rather than finished
  (so no `SendWinnerEvent` → `:275`) and joined rather than left (so no `handleLeaveLobby` → `:931`).
  They are verified by **reading the code only**. `:275` and `:931` are byte-equivalent substitutions —
  the helper contains exactly the two statements they replaced — and `:249` differs only by the added
  null, which nothing else reads. The round-1 reviewer verified all three statically and independently
  and **found no regression** (`review.md`, "No regression at the three already-correct sites").
  That is a static argument, not an observation.

### Dev-console observation — RUN, and it PASSES

Ran for real (`npm run dev` + browser automation), not reasoned about. Two consecutive
**singleplayer** games ("Play Mission: 1"), no page reload between them — the plan's chosen route,
which sidesteps the port-3001 multiplayer-lobby failure.

**Fixed build:**

```
[14727ms] TEMP-0225 monitor #1 STARTED
[17735ms … 80735ms] TEMP-0225 monitor #1 TICK      (22 ticks, 3s apart)
[82167ms] joining lobby, stopping existing game    ← the F1 site, Main.ts:677
[82171ms] TEMP-0225 monitor #2 STARTED
[85171ms … 106172ms] TEMP-0225 monitor #2 TICK     (8 ticks — #2 ONLY)
```

✅ **PASS** — after the mid-game join, exactly **one** monitor ticks, and it is the new one.
Monitor `#1` emitted nothing for the ~25s observed after the join. **Scope:** this is the F1 join-over
path only, and it credits `:678` and `:757` jointly, not individually (the two log lines are 4 ms
apart — see the coverage note above).

### Negative control — the harness does detect the defect

The above alone shows "one monitor", but not that the observation *could* have shown two. So the fix
was temporarily reverted and the identical sequence re-run:

```
[27878ms] joining lobby, stopping existing game
[27882ms] TEMP-0225 monitor #2 STARTED
[28190ms] #1 TICK   [30888ms] #2 TICK   [31128ms] #1 TICK   [33889ms] #2 TICK
[34127ms] #1 TICK   [36889ms] #2 TICK   [37127ms] #1 TICK   … (interleaved, ~21s)
```

❌ **FAIL as predicted** — both monitors tick side by side. This confirms the observation is
sensitive to the defect and that the PASS above is caused by the fix, not by the defect being absent
for some other reason.

`Main.ts` was then restored and verified byte-exactly: sha256 match against the pre-control file
**and** a byte-identical `git diff`. `git checkout` / `restore` / `stash` were never used.

### Baseline checks

| Check | Result |
|---|---|
| `npm run lint` | ✅ clean, exit 0 (re-run on the final restored state) |
| `npm test` | ✅ 113 suites / 1185 tests passed, exit 0, **first run both times** |

Ran twice — once mid-task, once on the final state. Zero occurrences of any `0197` `SIGSEGV` /
`ClearStaleLeftTrimmedPointerVisitor` signature or any known supertest-flake shape, so **no re-run
was required** and none was needed.

⚠️ **The test suite covers none of this defect.** No test touches `Main.ts`'s monitor lifecycle or
`PerformanceMonitor.ts`. A green run here is a **no-regression signal only** — the evidence for the
fix is the console observation plus its negative control, nothing else.

**No unit test was written**, per the brief's explicit instruction: a test asserting
"`perfMonitorStop` was invoked" restates the diff and proves nothing about the leak.

### What is NOT verified

- **`:249`, `:275` and `:931` were never exercised at runtime.** Static reading only, by me and
  independently by the round-1 reviewer, who found no regression. See the coverage note above.
- **The PASS cannot be attributed to `:678` versus `:757` individually** — 4 ms separates the two log
  lines, and the negative control reverted both together.
- **F3** (double `onJoin` from a socket-drop reconnect inside the async `createClientGame` window)
  is **not practically reproducible** — it needs a forced socket drop in a sub-second window. The
  `:757` choke point is a **defensive** containment. **Read from code; not observed at runtime.**
- **No wall-clock timing number is quoted anywhere in this worklog.** The host ran at load 24–36
  throughout (`uptime` checked); any duration measured here would be meaningless.

---

## F2 — confirmed still open, still out of scope

Re-verified against current source this session. `ClientGameRunner.ts:490-501` shows the crash modal
and calls `this.stop()`; `stop()` (`:753-765`) tears down `worker.cleanup()`, `transport.leaveGame()`
and `connectionCheckInterval` — and **never reaches `Main`**. A grep for `perfMonitor` / `onGameEnd` /
`onTeardown` across `ClientGameRunner.ts` returns nothing, so no callback seam exists.

Consequence stands: after a worker crash the monitor keeps emitting for a dead game until the player
leaves or joins another lobby. **Not an orphan** — the handle stays reachable via
`Main.perfMonitorStop`, so it does not accumulate; bounded at one crashed session's worth of events.

**Per the owner's 2026-09-07 ruling, F2 was NOT fixed here and needs its own brief.** No
`ClientGameRunner` → `Main` callback was added.

## Review finding routed elsewhere — NOT `0225`'s (R1)

Round 1 raised one finding that is **not about this diff and not this task's to fix**
(`review.md` R1, raised by Codex as X1 and confirmed by the reviewer). Recorded here so it is not
lost, **not acted on here**:

`0227`'s brief rules the **worker-init-failure** site out of its own scope on the stated ground that
it is a *"worker-init failure that returns before the game ever starts"*
(`ai-agents/tasks/done/0227-crashed-game-leaves-performancemonitor-running/brief.md:155-159`).
**That reasoning does not hold.** I verified it against source this session: `onJoin()` is called at
`ClientGameRunner.ts:204`, **before** `createClientGame(...)` at `:207`; `worker.initialize()` throws
inside `createClientGame`, `showErrorModal` runs, and the catch bare-`return`s at `:305`. So a
monitor started by `Main.ts:757` is **already running** when that return happens — the same shape as
`0227`'s own defect, at a site `0227` tells its implementer to skip.

⚠️ **`0225` is unaffected either way.** Pre-diff, `:757` started the monitor at exactly the same
point in the same `onJoin` callback, so this diff neither introduces nor fixes it. **No `0225` change
requested, and none made.** A producer is correcting `0227`'s brief separately; nothing here waits
on it.

## F4 — untouched, as ruled

`Main.ts:676-679` still does not null `this.gameStop`, and the interleaving gap at `:680-703`
remains. Pre-existing, unrelated to the monitor, explicitly out of scope. Not fixed.

---

## Decision log — autonomous calls made without asking

Four. All within the approved plan's intent; none changed the change surface.

1. **Proceeded despite the caller not being literally `fkit-sprint-ship-loop`.** My role's
   source-write carve-out names that skill by name; the caller was `fkit-lead` conducting directly.
   Qualified because the spawn instruction **names an owner ruling on that point** (`CLAUDE.md`'s
   hard rule allows a skill rule to yield to an instruction that does), and the ruling is
   independently corroborated on disk by `plan.md`'s provenance block recording the same live
   `AskUserQuestion` approval. **Flagged explicitly to the lead rather than complied with silently.**
   Judgment call, surfaced — not concealed.
2. **Instrumentation log placed *before* the `visibilityState === "hidden"` guard.** The plan said
   "logged from inside the interval". A backgrounded automation tab reports `hidden`, which would
   have suppressed every tick and produced a **false PASS**. Logging before the guard proves the
   interval is alive regardless of visibility. Obvious winner, within intent; instrumentation was
   throwaway and is fully reverted.
3. **Ran a negative control** (temporarily un-fixing, observing, restoring). Beyond §4's literal
   procedure. Qualified as an obvious winner within intent: §4 calls the observation "the only real
   evidence", and without a control the PASS is unfalsifiable. Touched only in-scope files, restored
   byte-exactly and verified by hash. Cost: two extra webpack rebuilds.
4. **Drove the second join via the button's own `click()` rather than a pointer click.** The game
   canvas occludes the menu button, so Playwright's hit-test click failed. `element.click()` still
   runs the real `SinglePlayerModal` handler and its genuine `join-lobby` dispatch — only pointer
   hit-testing is bypassed, and the code under test (`Main.ts:279` → `handleJoinLobby`) is entered
   identically. Test-harness mechanics only; no production behaviour was simulated or stubbed.

**No fix was applied outside the approved plan, and no `NEEDS-DECISION` arose.**

---

## Post-review corrections to this worklog (2026-09-07, round 1)

Round 1 returned **APPROVE — ship as-is, no defect in the diff**. Two of its three findings were
against **this worklog**, not the code. Both were verified against the repo before being accepted,
and both were fixed **in this document only — `src/` was not touched.**

| Finding | What was wrong | What I did |
|---|---|---|
| R2 | The diff stat "+12 / −5" was wrong and unmeasured | Re-measured (`git diff --numstat`: `18	6`), corrected to **+18 / −6**, and recorded that the old figure was wrong rather than silently swapping it |
| R3 | The runtime evidence was presented without its scope | Added the coverage note under `## Verification` — one path exercised, `:678`/`:757` not separable (4 ms apart), `:249`/`:275`/`:931` static-only — and extended *What is NOT verified*. **The observation and the negative control are kept in full**; the fix was precision, not retraction |
| R1 | Not this task's — a wrong exclusion in `0227`'s brief | Recorded above under *Review finding routed elsewhere*; verified against source; **no action taken here** |

**No source, test, or config file was changed by this correction pass.** The `src/client/Main.ts`
diff reviewed in round 1 is byte-unchanged.
