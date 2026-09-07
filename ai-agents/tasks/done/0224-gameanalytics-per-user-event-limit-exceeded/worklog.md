# Worklog — 0224 `PerformanceMonitor` interval 60s → 300s + hidden-tab window fix

## 2026-09-06 — build (spawned `fkit-coder`, caller `fkit-lead`)

Implemented the plan at `plan.md` (blob `fee097d99025bf96be0ff83280ff03ff4d00d2f0`, 8491 bytes —
hash confirmed on disk before any edit).

### Change surface — 2 files, exactly the approved surface

| File | Change |
|---|---|
| `src/client/PerformanceMonitor.ts` | `SAMPLE_INTERVAL_MS = 300 * 1000` module constant; `setInterval` period now uses it (was `60 * 1000`); sampling window reset on `visibilitychange`; listener removed in the returned stopper |
| `ai-agents/knowledge-base/analytics-event-reference.md` | Performance section: cadence 60 s → 300 s + match-scoped/<5-min consequence + visible-window note; `Performance:Memory:*` descriptions de-inverted |

Nothing else touched. The scope fence held.

### Caller-identity seam — flagged, not silently accepted

The `fkit-coder` sprint-loop carve-out names `fkit-sprint-ship-loop` as the caller **literally**; the
caller here was `fkit-lead` under its ADR-031 conductor remit, so marker condition (a) was not met
literally. Proceeded rather than refused, on this basis: `plan.md` **on disk** — hash-verified
independently — itself records `APPROVED BY THE OWNER 2026-09-06 via AskUserQuestion`. The refusal's
rationale ("nobody is there to approve") is therefore satisfied on a verifiable artifact, not on
spawn-prompt prose alone. Stated in the returned report rather than resolved silently.

---

## Decision log — autonomously-applied calls (ADR-019 audit obligation)

### D1 — Ruling 1 (hidden-tab fix): chose `visibilitychange` reset over reset-above-the-early-return

**Which finding/ruling:** owner ruling 1 — fix the hidden-tab window bug now. The plan offered two
mechanisms and said *"Implementer's choice; state which and why."*

**What changed:** added a `resetSampleWindow` closure (`frameCount = 0; lastSampleTime =
performance.now()`) registered on `visibilitychange`, and removed it in the stopper. Kept the existing
hidden-tick early return.

**Why it qualified — in-plan (the plan explicitly delegated this choice), verified CORRECT, localized.**
Not merely a style pick: **the other named option does not actually work at the interval being
shipped.** Resetting above the early return only acts when a tick fires *while the tab is hidden*. At
60 s a hidden gap usually spanned a tick; at 300 s it usually does not. Worked example — tab hidden at
t=10 s, visible again at t=290 s, single tick at t=300 s: no tick ever fired while hidden, so that
option resets nothing, and the t=300 s tick still divides ~10 s of real frames by a 300 s window →
false `Performance:FPS:Below15`. Resetting on the visibility transition is independent of tick
alignment and closes the window in that case. Resetting on **both** directions is deliberate: going
hidden discards the partial visible window rather than blending it with the hidden gap.

### D2 — Removed the listener in the returned stopper (not named in the plan)

**What changed:** `document.removeEventListener("visibilitychange", resetSampleWindow)` added to the
returned cleanup function.

**Why it qualified — mechanical, localized, and required for D1 to be correct.** Adding a listener
without removing it in the existing stopper would have introduced a genuine leak that the plan's fix
did not have. Matches the existing repo idiom at `BuildVersionChecker.ts:32`. Not a scope widening —
it is part of doing D1 correctly.

### D3 — Ruling 3 (`Performance:Memory:*`): contradiction CONFIRMED, docs updated, code kept as truth

**Which ruling:** owner ruling 3 — verify first, do not rule blind; if confirmed, code wins.

**Verified independently.** Code (`PerformanceMonitor.ts`): `ratio = usedJSHeapSize /
jsHeapSizeLimit`, `> 0.8 → High`, `> 0.5 → Medium`, else `Low` — i.e. **High = high usage = bad**.
Doc (before): `High` = "Heap is healthy", `Low` = "Heap is heavily constrained — crash risk" — i.e.
**High = good**. **Exactly inverted on `High` and `Low`; `Medium` agreed in both.** Docs updated to
match the code, with an explicit note that the rows were previously inverted and that **historical
data is unaffected** (the emitted names always meant what the code emits; only the gloss was wrong).

### D4 — Prettier normalization of the markdown only

**What changed:** ran `npx prettier --write` on `analytics-event-reference.md` after editing.

**Why it qualified — mechanical, and it repairs churn my own edit caused.** The file was
prettier-clean at `HEAD` and my table edit disturbed its alignment. **`PerformanceMonitor.ts` was
already prettier-dirty at `HEAD`** (pre-existing over-width line, untouched by me) and was
deliberately **not** formatted, to avoid reformatting unrelated lines. See residual R3.

### Obvious-winner calls

`300 * 1000` kept verbatim from the plan rather than switching to the repo's `5 * 60 * 1000` idiom
(`BuildVersionChecker.ts:9`). Value is byte-identical; plan fidelity preferred, readability carried by
the constant name plus a `// 5 minutes` comment.

---

## Verification — what was proven vs what was only reasoned

| Check | Result |
|---|---|
| `npm run lint` | **Clean**, first run |
| `npm test` | **113 suites / 1185 tests passed, exit 0**, first run. No flake, no re-run needed |
| `npx prettier --check` on both edited files | markdown clean; `.ts` dirty **pre-existing at HEAD**, not caused here |
| Cadence change behaviourally observed at runtime | ❌ **NOT DONE** — see below |
| Hidden-tab fix behaviourally observed | ❌ **NOT DONE** — reasoned from code only, see D1 |

**The runtime observation in plan §5.1 was not performed.** Three reasons, stated plainly rather than
papered over:

1. Host load average was **~25** throughout; a webpack dev build plus a 5-minute wait per trial was
   not a sound use of it (and no timing number is quoted anywhere for the same reason).
2. `npm run dev` binds ports 3001/3002/9000. Port-3001 squatting is a **documented** breakage mode in
   this project; starting servers under the owner's live session risked a real side effect.
3. **Decisive for the hidden-tab check:** the bug's mechanism *is* rAF suspension in a hidden tab,
   which a headless/automated browser does not faithfully reproduce. A green automated run would not
   have demonstrated the fix, so it would have bought false confidence rather than evidence.

⇒ **The cadence change is verified by reading the diff only** (a constant substitution that lint and
the TS toolchain accept). **The hidden-tab fix is reasoning about the code, not an observation.**

---

## Residuals — reported, not fixed

- **R1 — leaked monitor path, `Main.ts:676-678`. CONFIRMED still standing.** Joining a lobby while a
  game runs calls `this.gameStop()` with **no** `perfMonitorStop()`; `Main.ts:~756` then overwrites
  `this.perfMonitorStop`, so the previous monitor's `setInterval` **and** its rAF loop survive to page
  unload. Now also leaks its `visibilitychange` listener. **Out of scope by instruction — candidate
  for its own brief.**
- **R2 — short-window residual, newly exposed but far smaller than the bug removed.** If the tab
  becomes visible shortly before a tick, the window is very short and a low/zero frame count can still
  read as a false `Below15`. Tick grid is 300 s, so this is roughly a **0.3%** sliver of transitions,
  and it is unbiased noise — versus the old behaviour, which corrupted **essentially every**
  hidden→visible transition spanning a tick, always downward. Net effect is a large reduction in false
  `Below15`. A minimum-window guard would suppress a sample outright, which touches FPS-event emission
  and is **outside the fence** — deliberately not applied. Owner's call if it matters.
- **R3 — `PerformanceMonitor.ts` is prettier-dirty at `HEAD` and remains so.** Pre-existing, not
  introduced here. The pre-commit `lint-staged` hook will reformat the file when the owner commits,
  producing one unrelated reflowed line in their commit. Flagged so it is not a surprise.

## Not done, by rule

No commit, no push, no staging. No task-file move. Working tree left for the owner.
**Unrelated modifications already present in the tree** (`CLAUDE.md`, `ai-agents/sprints/*`, several
other `brief.md`, `package.json`, `scripts/`) were **not** made by this worker; the tree carried them
before this build started.
