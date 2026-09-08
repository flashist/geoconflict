# `handleJoinLobby()` leaves a stale `gameStop` across three awaits — two fast `join-lobby` events can interleave

## ID
0228

## Sprint
**Backlog board.**

🚨 **THE BOARD IS THE PRODUCER'S CALL, NOT AN OWNER RULING.** The owner ruled, live on 2026-09-07,
exactly one thing: **this defect ("F4") gets its own task**, because it existed nowhere but inside
[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md)'s Notes section. **The owner
did NOT rule which board.** Placement on the Backlog board, and the `Low–Medium` rank below, are both
**my** judgement as producer and are reversible by the owner at any time. Reasoning is in
*Board placement — the producer's reasoning* near the end.

⚠️ **This task's Backlog row is APPENDED at the BOTTOM of that board, and its position does NOT express
its rank.** fkit's **ADR-035** bars inserting a new row above a board's closed rows, so appending is the
only mechanically permitted placement. **Bottom row = board mechanics, not ranking.**

📎 *ADR-035 is cited by name and never linked, on purpose — it is one of fkit's own upstream `adr-0XX`
ADRs living in the fkit install share. This project's `ai-agents/knowledge-base/decisions/` holds only
the `adr-1XX` series, so a relative link would not resolve.*

## Priority
**Low–Medium *(producer's rank — NOT an owner ruling)*.** Ranked **below**
[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) *(Medium)* and below
[`0226`](../0226-deploy-env-fails-open-to-prod-analytics/brief.md) *(Medium–High)*.

🔴 **The rank is low for ONE reason and it is not "small change": NOBODY HAS SHOWN THIS ACTUALLY
HAPPENS.** `0226` and `0227` describe defects whose mechanisms were traced end to end. This one
describes a window in which an interleaving is *possible*. **A brief for a theoretically-possible race
is worth less than a demonstration of a real one**, and that difference is the whole rank.

## Status
🔲 Backlog

## Owner
fkit-coder

## Depends on
**Nothing — startable immediately.** No server contact, no deploy, no DB.

**Related, not blocking:**

- **[`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md)** — where this was found,
  and where **half of it is already fixed**. See the next section; read it before planning anything.
- **[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md)** — where it was
  recorded as "F4" in the Notes, which is why the owner ruled it out into its own task.

---

## 🚨 Read these four things before anything else

### 1. This is a RACE CONDITION, not the monitor leak — and its monitor half is ALREADY FIXED

🔴 **`0225`'s review found that `0225`'s diff INCIDENTALLY FIXES the monitor half of F4.** Its change
adds `this.stopPerformanceMonitor()` inside the `if (this.gameStop !== null)` block at
`src/client/Main.ts:686`, so a join-over now stops the outgoing monitor.

⛔ **DO NOT let any artifact for this task describe `0225`'s work as outstanding.** What remains here
is **only the `gameStop` half**: `this.gameStop` is called but never set to `null`, and it stays
non-null across three awaits.

**If a plan, worklog, review or close note for this task says "monitors accumulate" or "orphaned
monitors", that description is WRONG** — that language belongs to `0225`, and the accumulation it
described is fixed.

### 2. It is PRE-EXISTING and UNRELATED to the analytics work

- It was **found during `0225`'s audit, not caused by it.** The code has been this shape for as long
  as `handleJoinLobby` has awaited anything.
- 🚨 **It has NO BEARING on [`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md)'s
  event volume.** It emits nothing, it changes no event, and it is not a contributor to the 3–4 Sep
  breach — **which remains UNEXPLAINED.** Stated flatly so this never gets bundled into the analytics
  story: **this is a lobby re-entrancy defect that happens to have been found while reading analytics
  code.**

### 3. 🔴 REACHABILITY IS NOT ESTABLISHED — and step one is establishing it

🚨 **NOBODY HAS DEMONSTRATED THAT THE INTERLEAVING OCCURS IN PRACTICE.** It requires **two
`join-lobby` events inside a three-await window**. Nobody has shown a user path, a UI affordance, or a
timing that produces two such events that close together.

⇒ **This task's FIRST step is not writing a fix. It is answering "is this reachable at all?"**

✅ **"It is unreachable, here is why, close it" is a LEGITIMATE AND WELCOME OUTCOME.** If that is the
finding, say so with the evidence and hand it back to be cancelled. Do not add a defensive null just
to have shipped something.

⚠️ Equally: **"I could not determine reachability" is also an acceptable honest outcome** — report it
as undetermined rather than guessing in either direction.

### 4. Verification stance — the same as `0225` and `0227`

- **There is no relevant test today**, and none is trivially addable: `handleJoinLobby` reaches for
  DOM elements, the analytics facade, network config fetches, and the Yandex platform facade.
- **`CLAUDE.md` mandates tests for `src/core/` only.** This file is `src/client/`. **This task is not
  required to add a test.**
- ⛔ **DO NOT INVENT A TEST THAT ONLY PROVES A NULL WAS ADDED.** A unit test asserting
  "`gameStop` is null after the guard" restates the diff and proves nothing about the race. A coder in
  this session made exactly that call on `0225` and it was the right one.

---

## Context

📌 **FRAME DECLARATION — every `file:line` in this brief is against commit `c910452`, the commit in
which [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) landed.**
⚠️ **REFRAMED 2026-09-07 from the earlier pre-`0227` numbering.** `0227` added **+30 / −1** lines to
`src/client/ClientGameRunner.ts` and **+26 / −0** to `src/client/Main.ts`, so citations in **both**
files moved. 🔴 **The shift is NOT a single constant** — `Main.ts` moves by **+8 / +9 / +12 / +26**
depending on which of its four insertion points a line sits below, and `ClientGameRunner.ts` by
**+5 / +23 / +24 / +25 / +26 / +29**. **Every number below was re-derived by reading the file at
`c910452` and matching content, never by adding an offset.** ✅ **`src/core/` citations are unchanged
— `0227` touched only `src/client/`** (confirmed: `git diff --stat 702a8ea c910452 -- src/core/` is
empty). **Every superseded number is preserved in the mapping table at the end of this brief.**
⚠️ **Re-verify anyway before relying on any of them** — this brief has gone stale once, which is the
reason to distrust it, not to trust the new numbers more.

### The defect — first verified at `HEAD` = `35afc64` on 2026-09-07, **reframed to `c910452`**

📌 **REFRAMED 2026-09-07 — see the frame declaration above.** The original numbering was read from a
working tree in which `0225`'s `Main.ts` change was **uncommitted**. ✅ **That caveat is now spent:**
`0225` **and** `0227` are both committed at **`c910452`**, and every number below has been re-derived
against it. ⚠️ **Re-verify every one of them yourself anyway** — they will move again if anything else
lands, and this brief has already gone stale once.

✅ **SEMANTIC PASS 2026-09-08 — the claims below were re-read against what the code DOES at
`c910452`, not merely renumbered.** **Claims 1, 3 and the traced/untraced consequence split are
unchanged.** ⚠️ **Claim 2 carried a citation that was WRONG BEFORE the reframe and was faithfully
renumbered forward — corrected below.** ⚠️ **`0227` inserted a statement INSIDE the window this
brief describes; it is now recorded in claim 2a.**

**Mechanism:**

1. `src/client/Main.ts:683-687` — `handleJoinLobby()` stops any existing game:
   ```
   if (this.gameStop !== null) {
     console.log("joining lobby, stopping existing game");
     this.gameStop();
     this.stopPerformanceMonitor();
   }
   ```
   🔴 **`this.gameStop` is called but NOT set to `null`.** Compare `handleLeaveLobby()` at
   `Main.ts:949-963`, which **does** null it (`Main.ts:956`) immediately after calling it. **The two
   teardown paths disagree with each other, and that disagreement is the defect.**
2. **Three awaits then run before `this.gameStop` is reassigned:**
   | Await | Where |
   |---|---|
   | `await getServerConfigFromClient()` | `Main.ts:688` |
   | `await fetchCosmetics()` | `Main.ts:691` (inside the `getSelectedPatternName(...)` argument) |
   | `await FlashistFacade.instance.getYandexUniqueId()` | `Main.ts:712` (an argument to `joinLobby`) |

   ⚠️ **The third one is easy to misread.** The assignment statement *starts* at `Main.ts:695`
   (`this.gameStop = joinLobby(`), but JavaScript evaluates the arguments first — so the `await` at
   `:712` runs **before** `this.gameStop` is actually written. The window is wider than
   `:695` suggests.

   > 🔴 **CITATION CORRECTED 2026-09-08 — and it was WRONG BEFORE THE REFRAME, not broken by it.**
   > This row read `Main.ts:702` when the brief was filed. ⛔ **At `702a8ea`, `:702` was
   > `clientID: lobby.clientID,` — the await was one line lower, at `:703`.** The 2026-09-07 citation
   > sweep re-derived `:702` faithfully to `:711`, **carrying the original off-by-one forward**: a
   > renumbering sweep preserves a wrong citation perfectly. 🚨 **It also left this brief
   > contradicting ITSELF** — the `R6` block below correctly cited the same await as `:712`.
   > ✅ **Correct value at `c910452`: `:712`**, `yandexPlayerId: await
   > FlashistFacade.instance.getYandexUniqueId(),` — read from the file, and it is the same line
   > `R6`/`R6b` name.

2a. 🆕 **`0227` ADDED A STATEMENT INSIDE THIS WINDOW — recorded 2026-09-08, not present when this
   brief was written.** Between the guard block and the assignment there is now
   **`const joinGeneration = ++this.joinGeneration;` at `Main.ts:694`**. ⚠️ **It does not change the
   `gameStop` mechanism** — it touches `this.joinGeneration`, never `this.gameStop`, so claims 1 and 3
   stand exactly as written. **But the window this task is about now also mints generation state**,
   and a second re-entrant join mints a second generation whose value is later compared at
   `Main.ts:793`. ⛔ **Any fix here must leave that mint and its ordering intact** — inverting it is
   literally the `R4` defect `0227`'s review round 2 caught. ✅ **Still exactly THREE awaits in the
   window; `0227` added none.**
3. ⇒ A second `join-lobby` event arriving inside that window re-enters `handleJoinLobby()`, sees the
   **stale, already-called** `this.gameStop`, and **calls it a second time**.

### What the consequence actually is — and what it is not

✅ **One thing here IS traced, and it argues the severity DOWN.** The stale closure is `joinLobby`'s
returned stopper, and its whole body is `ClientGameRunner.ts:253-256`:

```
return () => {
  console.log("leaving game");
  transport.leaveGame();
};
```

> ✅ **RE-VERIFIED BYTE-FOR-BYTE AT `c910452` (2026-09-08).** `0227` threaded an `onGameEnd` parameter
> through `joinLobby`, but **did not change what `joinLobby` RETURNS** — the closure is still exactly
> these three lines. ⇒ **calling the stale `gameStop` twice still does not call `onGameEnd` twice**,
> and the double-call consequence is unchanged. **Whether a double `leaveGame()` is harmless is still
> NOT established.**

⇒ **Calling it twice calls `transport.leaveGame()` twice on the same `Transport`.** That is the entire
double-call consequence — there is no other statement in the closure. 🚨 **Whether a double
`leaveGame()` is harmless is still NOT established** — read `Transport.leaveGame()` before asserting
either way — **but this is a much smaller blast radius than "an unknown teardown runs twice", and the
brief says so rather than leaving it sounding scarier than it is.**

⚠️ **The rest is NOT traced.** Do not copy any of the following into a worklog as established:

- The **first** join's `joinLobby(...)` is still in flight during the window, so a second join can also
  race the first's own transport setup and `transport.connect(...)` (`ClientGameRunner.ts:252`).
  **Untraced. This, not the double-call, is the part that could actually matter.**
- ✅ **The monitor is NOT part of this any more** — `0225` closed that half. See point 1 above.

---

## What to build

### 📌 Carried-in residual **R6** from [`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md) — **docs only, no code change**

🚦 **Severity LOW. This is a COMMENT fix.** It changes no behaviour, adds no logic, and is independent
of phase 1 and phase 2 — it can be done whether or not the race turns out to be reachable.

⚠️ **ROUTING: recorded here by the fkit LEAD at `0227`'s close (2026-09-07). This is NOT an owner
ruling.** It was routed to this task because this task owns the `handleJoinLobby()` interleave work and
will have that exact region of `Main.ts` open. ✅ **If the coder judges it a poor fit, hand it back
rather than forcing it** — it then belongs on `0227`'s ledger as an unassigned residual.

**What is wrong.** `src/client/Main.ts:144-145` — the comment above the `joinGeneration` field still
describes the semantics that **R4 broke and round 2 of `0227`'s review replaced**. It says the counter
is incremented on every `joinLobby` call *"so a superseded game's teardown callback can tell it is no
longer the current game."* 🔴 **That is exactly what the guard NO LONGER DOES.** Ownership moved to
`monitorGeneration` (`Main.ts:151`, set at `:769` where the monitor is actually started, checked at
`:793`); `joinGeneration` is now only the mint counter.

**Why a stale comment is worth recording.** It presents `joinGeneration` as the ownership pointer,
which **invites a future "simplification" back to `!== this.joinGeneration` — REINTRODUCING R4
VERBATIM.** R4 was the defect where the guard keyed on *"who joined last"* rather than *"who owns the
live monitor"*, and **inverted under the await at `Main.ts:712`**.

🟢 **Blast radius is limited:** the `monitorGeneration` comment immediately below it (`Main.ts:147-150`)
is **accurate**, so a careful reader gets the correct account two lines down.

**Fix: one clause.** Make the `joinGeneration` comment say it is the join-mint counter, and that
ownership of the live monitor is tracked by `monitorGeneration`. ⛔ **Do not change the fields, the
guard, or any behaviour.** `0227`'s teardown seam stays byte-identical — **this residual is the single
sanctioned exception to the "do not touch `0227`'s teardown seam" rule below, and it is a
comment-only exception.**

⚠️ **The line numbers above are working-tree state on 2026-09-07, with `0225`'s and `0227`'s changes
UNCOMMITTED. Re-verify them; do not trust them.**

---

### Phase 1 — establish reachability. **Do not skip to phase 2.**

**Answer, with evidence:** can two `join-lobby` events land inside the window described above?

Places to look — not an exhaustive list, and not a prescribed method:

- Who dispatches `join-lobby`? Find every dispatcher and ask whether any two can fire close together
  (`Main.ts:286` registers the listener; the `handleHash()` path at `Main.ts:501` and the
  `onHashUpdate` path at `Main.ts:503-513` are both worth reading, as is the join-modal flow).
- Is there a UI affordance that permits a second join while the first is still resolving — a
  double-click, a hash change during a join, a reconnect arriving mid-join?
- Can it be produced deliberately in `npm run dev` — e.g. by dispatching two `join-lobby` events in
  quick succession from the dev console, or by throttling the network so the three awaits take long
  enough to make the window observable?

🚨 **Report the finding before writing a fix.** Three outcomes, all legitimate:

| Finding | What to do |
|---|---|
| **Reachable, demonstrated** | Proceed to phase 2, and record exactly how it was produced. |
| **Not reachable, with evidence** | ✅ **Say so and hand it back to be cancelled.** Do not fix it anyway. |
| **Undetermined** | ✅ **Say so honestly.** Then put the fix-anyway question to the owner — do not decide it yourself. |

### Phase 2 — only if phase 1 justifies it

**The obvious repair is to null `this.gameStop` immediately after calling it at `Main.ts:685`**, making
`handleJoinLobby()` agree with `handleLeaveLobby()` (`Main.ts:956`).

⚠️ **Weigh it rather than applying it reflexively, and state your choice with its reason:**

- **Nulling alone does not close the window** — it only stops the *stale* closure being called twice.
  A second `join-lobby` arriving mid-window would then see `null`, skip the teardown, and still race
  the first join's in-flight `joinLobby(...)`. **If that matters, nulling is a partial fix and must be
  written up as one, not as a closure of the race.**
- **A re-entrancy guard** (an in-flight flag, or serialising joins) closes more of it but is a larger
  change with its own failure mode — a stuck flag would make joining impossible. ⛔ **Do not ship a
  guard whose failure mode is worse than the defect** without saying so explicitly.
- **`beforeunload` (`Main.ts:255-262`) and `onHashUpdate` (`Main.ts:503-513`) both read `gameStop`.**
  Check that nulling earlier does not change their behaviour.

### Rules that bind regardless

- ⛔ **No event may be added, renamed, or removed by this task.** If that changes, `CLAUDE.md` binds:
  event strings only via the `flashistConstants.analyticEvents` enum key, **never inline**, and
  `ai-agents/knowledge-base/analytics-event-reference.md` **must** be updated. If the outcome is "no
  event change", **record that explicitly** — do not leave it unstated.
- ⛔ **Do not re-fix `0225`'s monitor path and do not touch `0227`'s teardown seam.** Those tasks own
  them. If either is still unlanded, expect a `Main.ts` conflict and coordinate rather than
  duplicating.
- 🔒 **No secrets in any artifact.** The GameAnalytics Game key and Secret key are hardcoded in
  `src/client/flashist/FlashistFacade.ts` — **never print, quote, or record either value**, nor any
  dashboard ID or URL containing one. `file:line` references only.

---

## Verification steps

🚨 **Read *Read these four things* §4 first.** The short version: no test exists, none is mandated for
`src/client/`, and **a test that only proves a null was added is not wanted.**

### If the outcome is "unreachable" or "undetermined"

The deliverable is **the finding, written down** — what you tried, what you observed, and why you
concluded what you did. **No code change, no test, and no fix.** That is a complete task, not a
failure.

### If a fix is made

1. **The reachability demonstration from phase 1, re-run against the fix** — the same steps that
   produced the interleaving must no longer produce it. ⚠️ **This is the only real evidence the fix
   works.** If the interleaving could only be produced by artificial means (dispatching events from
   the console, throttling the network), **say so and say it plainly** — it is weaker evidence than a
   natural reproduction and must not be written up as one.
2. **Normal join, leave, join-over and reconnect all still work.** Say how you checked each.
3. `npm test` green and `npm run lint` clean.
   ⚠️ **State plainly in the worklog that the suite does NOT cover this defect** — a green run is a
   no-regression signal, **not** evidence the fix works.
4. ⚠️ If a `supertest` suite flakes, apply `CLAUDE.md`'s known-flake procedure (rule out the `0197`
   segfault signature first, then re-run **and say that you re-ran**). Unrelated to this change.

### Acceptance criteria

1. **Phase 1's reachability finding is recorded**, with the evidence behind it, whichever way it went.
2. If a fix was made: the phase-1 reproduction no longer reproduces, and the worklog says whether the
   reproduction was **natural or artificial**.
3. If a fix was made: whether it **closes** the race or only **narrows** it is stated explicitly.
   ⛔ A partial fix written up as a closure is not acceptable.
4. No event added, renamed, or removed (or, if one was, `analytics-event-reference.md` updated) —
   **recorded explicitly either way.**
5. `npm test` green, `npm run lint` clean, with the coverage caveat stated.
6. The close note does **not** describe this as a monitor leak, does **not** describe `0225`'s monitor
   fix as outstanding, and does **not** claim any relationship to `0224`'s event volume or the 3–4 Sep
   spike.

---

## Board placement — the producer's reasoning

**Recommendation: the Backlog board, `Low–Medium`.** The owner ruled the brief, not the board; this is
my call and I am naming it as mine.

**Why not Sprint 4:**

- **Reachability is unproven, and Sprint 4 is for work whose value is known.** `0224`/`0225` earned
  Sprint 4 on **time-sensitivity** — they affect a number the owner is actively watching. This affects
  no measurement at all (§2 above), so there is no window it can miss.
- **It follows the owner's own precedent from today, twice.** `0226` and `0227` were both real defects
  split out of the same audit, both non-urgent, and the owner sent `0226` to the **Backlog** board;
  ~~`0227` went there on the same reasoning.~~ This one is *weaker* than either — theirs are traced,
  this one is not.

  > ⚠️ **Superseded in part (2026-09-07) — the `0227` half of this citation only.** `0227` was
  > **promoted from Backlog to Sprint 4 on 2026-09-07 by owner ruling**, after its scope grew from
  > **one** site to **three** (the crash path, worker-init, and site C at `ClientGameRunner.ts:215` —
  > a `.then(…)` with no `.catch`). So `0227` is no longer a Backlog example. The `0226` half of the
  > precedent stands unchanged, and the reasoning above was sound when written; one of its inputs moved.
  >
  > 🚨 **This does NOT change this task's placement.** `0228` stays **Backlog / `Low–Medium`** — the
  > owner **separately and explicitly confirmed** that on **2026-09-07**, *after* being told its
  > reachability is unproven. Nothing here re-ranks it.
  >
  > **Why `0227` moved and this one does not:** `0227` was promoted because its **cost** grew (one site
  > → three) while its **severity class stayed the same**; the owner promoted it knowing that. `0228`
  > is weaker on a different axis — **reachability is unproven**, and phase 1 may end in "close it as
  > unreachable." That is exactly why it stays on Backlog.
- **Sprint 4 already carries a recorded capacity risk.** Its Notes flag all eight profile phases plus
  an open live-verification tail as an accepted overload. Adding an investigation that may end in
  "unreachable, cancelled" makes that worse for no scheduling benefit.

**The tradeoff, stated honestly:** a coder fresh off `0225` has `Main.ts` loaded and the await window
in their head, so doing phase 1 immediately would be **cheaper in context than cold later** — and
phase 1 is genuinely small. I am trading that saving against putting an unproven-reachability item on
an already-overloaded sprint. 🟢 **If the owner would rather capture the saving, running phase 1 alone
straight after `0225` is a perfectly good call and costs nothing to switch.**

---

## Notes

### Cross-references

- **[`0225`](../../done/0225-orphaned-performance-monitors-on-lobby-rejoin/brief.md)** — **where this was
  found** (during its audit, as "F4") and **where its monitor half was fixed** (incidentally, by its
  diff at `Main.ts:686` — confirmed in `0225`'s review). ⚠️ `0225`'s change is **uncommitted in the
  working tree** as of writing.
- **[`0227`](../../done/0227-crashed-game-leaves-performancemonitor-running/brief.md)** — **where it was
  recorded**, in that brief's Notes under "F4", which is exactly why the owner ruled it out into this
  task: *"a defect that lives only inside another task's Notes section is one refactor away from being
  lost."* `0227`'s Notes now point here.
- **[`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md)** — listed **only** to
  record that this task has **nothing to do with it**. See §2 above.

### Standing cautions

- **Not a monitor bug.** Repeated because it is the single most misreadable thing about this task: the
  monitor half is done, the `gameStop` half is what is left.
- **Unproven, not urgent.** No figure, rate, or frequency may be written for this anywhere — nothing
  has been measured.
- 🔒 Filenames, `file:line` references and counts only in this task's artifacts — no key or dashboard
  values anywhere.

---

## Open questions for the owner

1. 🚩 **Board — confirm or overrule.** Backlog / `Low–Medium` is the producer's call, not a ruling.
   Running **phase 1 only** straight after `0225`, while a coder still has `Main.ts` loaded, is a
   reasonable alternative the owner may prefer.
2. 🚩 **If phase 1 finds the race UNDETERMINED — fix it anyway, or close it?** Adding the null at
   `Main.ts:685` is cheap and makes `handleJoinLobby()` consistent with `handleLeaveLobby()`, but it
   would be a change made without evidence of a real problem, which cuts against
   `ai-agents/knowledge-base/conventions/evidence-before-assertion.md` and against `CLAUDE.md`'s
   *"do not introduce speculative fixes"*. **No recommendation offered — this is a judgement about
   how much unproven risk the owner wants carried, not a technical call.**

---

## 📌 Citation mapping — `702a8ea` → `c910452` (reframed 2026-09-07)

**Nothing was deleted; every superseded number is preserved here.** All values re-derived by reading the file at `c910452` and matching content — **never** by adding an offset.

| File | Was (`702a8ea`) | Now (`c910452`) |
|---|---|---|
| `Main.ts` | `:675-679` | `:683-687` |
| `Main.ts` | `:677` | `:685` |
| `Main.ts` | `:678` | `:686` |
| `Main.ts` | `:680` | `:688` |
| `Main.ts` | `:683` | `:691` |
| `Main.ts` | `:686` | `:695` |
| `Main.ts` | `:702` | `:711` |
| `Main.ts` | `:923-937` | `:949-963` |
| `Main.ts` | `:930` | `:956` |
| `Main.ts` | `:247-254` | `:255-262` |
| `Main.ts` | `:278` | `:286` |
| `Main.ts` | `:493` | `:501` |
| `Main.ts` | `:495-505` | `:503-513` |
| `ClientGameRunner.ts` | `:229` | `:252` |
| `ClientGameRunner.ts` | `:230-233` | `:253-256` |

### ⚠️ Two corrections that are NOT simple reframes — read both

**1. The `R6` residual block carried two wrong numbers, written by the producer at `0227`'s close and
corrected here.**
- `Main.ts:146-150` → **`:147-150`** for the `monitorGeneration` comment. `:146` is the
  `joinGeneration` **field**, not part of that comment. Off by one.
- `Main.ts:707` → **`:712`**. ⛔ **`:707` was never right at `c910452`** — it is
  `: this.flagInput.getCurrentFlag(),`, a flag ternary. The await that actually sits between the
  generation mint (`:694`) and the monitor claim (`:769`) is
  `yandexPlayerId: await FlashistFacade.instance.getYandexUniqueId(),` at **`:712`**. This was
  **inherited from the close hand-off and propagated without being derived** — the exact failure this
  reframe exists to stop, committed by the producer while fixing it in others.

**2. 🚩 NEW RESIDUAL — `R6b`, same comment block, same class as `R6`, docs only.** The **source comment
itself** at `src/client/Main.ts:149` reads *"handleJoinLobby awaits between the two
(`Main.ts:707`)"* — **that in-code citation is wrong for the same reason**, and it is two lines below
the `R6` comment this task already has to fix. ✅ **Fix both in the same edit**: `:707` → `:712`.
⛔ **Still docs-only — a comment, no behaviour, no field, no guard.** Found 2026-09-07 by the producer
during the citation sweep; **routing is the lead's, not an owner ruling**, on the same reasoning as
`R6` (this task will have the region open).

**3. 🔴 `ClientGameRunner.ts:215` — CITED IN *Board placement* AND NO LONGER EXISTING.** That citation
named `0227`'s **site C**, `).then((r) => r?.start());` with **no `.catch`**. ⛔ **`0227` did not move
that line — it REPLACED it.** At `c910452` the call closes at `:221` and is followed by a `.then`
(`:222-230`) **and a `.catch` (`:231-238`)**. **It was deliberately left un-renumbered**: renumbering
would assert the old code still exists somewhere, which is false. The sentence around it is a
*historical* statement about why `0227` was promoted, and it remains true as history.
