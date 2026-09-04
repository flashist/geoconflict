# Placement Semantics and the Literal `1` (task 0209)

**Source**: `ai-agents/tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md`
**Status**: backlog
**Sprint/Tag**: Backlog board — unscheduled (owner ruled *"Accept now, brief it alongside"* — that authorises the brief, it does not schedule a sprint)

## Goal

In `ClientGameRunner.reportPlacements()`:

```ts
const points = awardTable[myIndex];
const placement = +1;
```

`+1` is a **unary plus applied to the literal `1`** — it evaluates to `1` always. **Every human who
finishes in the top 3 is labelled placement 1.**

✅ **Producer-verified 2026-09-03: only the placement value is wrong.** `points` is correct —
`awardTable[myIndex]`, properly indexed against `[first, second, third]` = `[10, 5, 2]`.
**Origin:** commit `84fd4ff` (2026-04-30) — **pre-existing and unrelated to `0206`.**

⚠️ **Locate by symbol (`reportPlacements`), not by line — these numbers drift.**

## Key Changes

*Nothing built yet.*

### 🔴 The blast-radius framing this was filed with was OVERSTATED

The defect surfaced as finding **R2** in `0206`'s review ledger and as plan item §8.1. **Both described
the consequence as the wrong placement being *sent to the Yandex platform leaderboard*. It is not.**

✅ Verified in `src/client/leaderboard/LeaderboardReporter.ts`: the only platform call is
`increaseCurPlayerLeaderboardScore(params.points)`, whose signature is
`(increase: number, leaderboardId?: string)` — **`placement` is never passed to it.** `params.placement`
is consumed **only by the `console.debug` on the next line**, sitting under
`// TODO: integrate platform leaderboard API (placement)`. The Yandex board this writes to is a
**cumulative score** board with no placement field to corrupt yet — hence the TODO.

**So the accurate statement of today's harm is: a wrong number in a browser debug log.** Nothing reaches
the platform, no player sees it, no stored value is wrong.

| | |
|---|---|
| R2's **severity** call (*low*) | ✅ Correct — if anything generous |
| R2's **mechanism** (*"sent to the Yandex platform leaderboard"*) | ❌ **Overstated — the value does not leave the client** |
| R2's **frequency-change** observation | ✅ Still true, but it describes more *debug lines*, not more wrong platform writes |
| Whether the brief should exist | ✅ **Yes** — the ruling stands and the latent trap is real |

🚩 See the keep-them-apart table on [[decisions/clientless-leader-win-policy]]. **`placement` never
leaves the browser; `points` do reach the platform.** This pair was conflated repeatedly on 2026-09-03.

### ~~The frequency change `0206` introduced~~ → 🔴 **THAT CHANGE IS NOT IN THE GAME — `0206` WAS REVERTED 2026-09-04**

> 🔴 **Owner ruling given live in session, 2026-09-04. Struck below, NOT deleted — the struck analysis
> was CORRECT about the code as `0206` built it; that code was then reverted before reaching a
> player.**
>
> ✅ **THIS TASK'S DEFECT IS UNCHANGED AND STILL REAL.** It was **pre-existing** and **never a `0206`
> regression** — this page already says so — and the revert makes that **more** true, not less. The
> literal `1` is still logged for every top-3 human on the ordinary human-win path.
>
> ⚠️ **What DOES change: the frequency claim.** The extra class of matches `0206` would have made
> `reportPlacements()` fire in **does not exist.** ⇒ **Blast radius reverts to what it was before
> `0206`** — the ordinary win path only, and still just the debug console.
> ⛔ **This does not change the owner's 2026-09-03 ruling (option A), does not change the rank, and
> does not gate or unblock anything.**

~~`0206` makes `reportPlacements()` fire in a class of matches where it **previously never fired** —
FFA matches whose leader at the win condition is clientless used to stall with no `Win` update at all.
Two consequences, separated honestly: **(1)** points now get awarded there, which is **`0206`'s intent
and is correct**; **(2)** the wrong placement label now gets logged there too, whose blast radius today
is the debug console.~~
🔴 **Struck 2026-09-04 — it describes code that was reverted and never reached a player.**
⚠️ **The DEFECT is untouched by the strike and is still live**; only the extra class of matches is gone.

### 📌 Owner ruling 2026-09-03 — definition **A: rank among humans**

> **`placement` is the player's rank among the `PlayerType.Human` players in the match, ranked by tiles
> owned — the same ranking the points are already computed from.**

**Reasoning:** it **agrees with the points already awarded**, which are human-relative. The reported
number would finally match what the points already say.

**The rejected options, recorded so nobody reopens them as though never considered:**

| # | Definition | Disposition |
|---|---|---|
| **A** | Rank among humans | ✅ **RULED** |
| **B** | Rank among **all** players | ⛔ **REJECTED** — matches the intuitive meaning but **disagrees with the points**, which stay human-relative; a player could be told "placement 7" while receiving first-place points. Reconciling that means changing the award table, a **product change**. The ruling's whole reasoning was *make the number agree with the points*; B does the opposite |
| **C** | Winner-relative | ⛔ **REJECTED** — most truthful and the only option fully respecting ADR-110, but the **costliest**: the winner is a tagged tuple with three shapes and a naive `winner[0] === "player"` check gets Team mode wrong. Disproportionate for a value that reaches only a debug log. ⚠️ Its rejection also **moots `0210`'s option B** |

**Two consequences of A the plan must handle, not ignore** — they were the known cost, and the ruling
does not dissolve them:

1. **The label means something narrower than a reader assumes.** "Placement" will not mean placement in
   the match. **The field must be renamed or documented at the declaration** so the next reader is not
   misled the way this codebase already misled one.
2. **It can read `1` for a player who lost.** Under [[decisions/adr-110-ai-winner-allowed]] the declared
   winner may be an `AiPlayer`, absent from the human ranking entirely; the top human still reports `1`.
   **Accepted, not overlooked** — the direct consequence of a human-relative board, and the points
   already behave this way.

### 🔴 The ruling settled the DEFINITION, not the EXPRESSION

⛔ **The brief still does NOT prescribe `myIndex + 1`, and this prohibition survives the ruling.**
Whether that expression faithfully expresses "rank among humans" depends on properties the plan must
**check, not assume**: how **ties in `numTilesOwned()`** are handled (the sort has no documented
tiebreak here, unlike `WinCheckExecution`'s `|| a.smallID() - b.smallID()`), and whether the filtered
array can contain **disconnected or eliminated humans** who should not occupy a rank.
⛔ **A brief that asserted the expression would repeat the `0022` failure**, where the brief's own
prescribed fix would have regressed PR #77.

⛔ **Do NOT change `points`** — `awardTable[myIndex]` is already correct, and touching it would be a
real regression in a value that **does** reach the platform. ⛔ **Do not wire placement into the
platform call** — that is the `TODO`, and a separate decision. ⛔ **Do not fold in `0210`.**

**`src/client/` only**, so the *all `src/core/` changes must be tested* rule does not bite — but **if
the plan's approach reaches into `src/core/`, that rule applies in full.** No facade seam should be
built for a unit test; ⚠️ **one carve-out** — if ranking needs a **tiebreak or an eliminated-player
filter**, that logic is pure, and **should be extracted and tested**.

## Outcome

**Not started. 📌 Unblocked 2026-09-03 by the ruling; ready to plan.** Owner is now `fkit-coder` — the
producer/owner decision is done.

**Priority `Low` — the producer's rank, not an owner ruling.** Zero player-visible impact today; the
points are correct; but it is **a live trap, not dead paper** — the wrong value sits directly under
`// TODO: integrate platform leaderboard API (placement)`, and whoever does that integration inherits a
value already wrong, in a line that looks deliberate (`+1`, not `1`).

🔴 **Low on *impact*, NOT low on *cost*. Do not pull this in as a quick win.** It is small, not trivial.

⚠️ **The brief was rescoped after filing began** — first drafted as the mechanical `+1` → `myIndex + 1`
fix. The `fkit-coder` processing `0206`'s review verified against the code that this is **not** the
right fix, and the brief was corrected before the board row was written. The 2026-09-03 ruling does
**not** undo that rescope: it settled the *definition*; the *implementation* is still the plan's to
establish. `myIndex + 1` may end up correct — **it is simply not asserted.**

📌 **The split from `0210` was confirmed on its merits.** The owner **read the producer's own weakening
of the split argument** and kept the two separate anyway: orthogonal axes (*what the number means* here,
*which modes report at all* there), either answerable "no change" independently, and `0210` carries real
harm this task does not. ⚠️ **That doubt is resolved, not pending — do not re-propose merging without
new information.** The earlier soft-ordering caveat is **moot**: `0210` was ruled A and this was ruled
rank-among-humans, which is the coherent pairing, so **the two can ship in either order or in
parallel.**

⚠️ **"Harmless today" is verified against today's code and is NOT permanent.** It rests entirely on
`placement` not being passed to `increaseCurPlayerLeaderboardScore`. **The moment anyone acts on that
`TODO`, this stops being a debug-log cosmetic and starts writing a wrong placement to the platform.**

⚠️ **Verification carries a deliberate extra step:** exercise a match won by an `AiPlayer` — not to
check winner handling, which A deliberately ignores, but to **confirm the accepted consequence** that
the top human reports `1` even though an AI won. **That is correct under ruling A**, and verifying it
stops a later reader filing it as a bug.

## Related

- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, whose review finding R2 filed this. ~~Its award increases how often the wrong label is logged~~ 🔴 **REVERTED 2026-09-04 — it does not, and never did in production**
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, the sibling filed the same day on the orthogonal axis; the split was owner-confirmed
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, which counts **`points`** and must not be confused with this task's **`placement`**
- [[decisions/clientless-leader-win-policy]] — the keep-them-apart table for `placement` vs `points`
- [[decisions/adr-110-ai-winner-allowed]] — why the declared winner may be an `AiPlayer` absent from the human ranking, which is what makes definition A's `1`-for-a-loser case accepted rather than a bug
- [[decisions/sprint-backlog]] — the board this sits on, unscheduled
- [[decisions/sprint-4]] — the sprint whose task `0206` spawned this brief; ⚠️ **this task is NOT on that board**, it sits unscheduled on the Backlog board
