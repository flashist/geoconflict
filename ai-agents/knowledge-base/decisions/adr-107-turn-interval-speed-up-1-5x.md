# ADR-107: The game runs at 1.5× the upstream tick rate — `turnIntervalMs` is 66.7 ms, not 100 ms

- **Status:** accepted
- **Date:** 2026-08-08 (recorded; the change was made **2026-01-02**, commit `6854fda`; selection
  rationale supplied by the owner **2026-08-09**)
- **Deciders:** Owner (Mark Dolbyrev) — sole author of the commit, **confirmed on 2026-08-08 that this
  is settled production behaviour, not an open experiment**, and **supplied the rationale for the
  value 1.5 on 2026-08-09** (interview via the producer session).

> **Owner-supplied rationale — owner (Mark Dolbyrev), 2026-08-09, via the producer session.** Verbatim:
>
> > "Your assumption about more interstitial ads is partially correct, I also wanted to make matches
> > quicker, the 1.5x was chosen by testing the game (2x is too fast)."
>
> This is an **owner statement**, not something read out of code or commits — everything else in this
> ADR that is not explicitly attributed to the owner is evidence from the repository. Three things it
> establishes:
>
> 1. **There were two goals, not one.** A higher interstitial-ad rate (the only goal the Jan commit
>    message captured) **and** shorter match duration. The owner ranks the ads reading as only
>    "partially correct" — match length was a goal in its own right, not a side effect.
> 2. **The value was chosen empirically, by playtesting** — not by analysis, modelling, or a
>    measurement of anything.
> 3. **2× was tried and rejected as too fast.** That is a real rejected alternative and is recorded in
>    "Options considered" below.
>
> **What this does *not* establish:** whether either goal was achieved. **Playtesting is not
> measurement.** No A/B result, telemetry query, or analysis document tied to this change exists in the
> repo, and the owner did not claim one. The ads hypothesis remains **unmeasured** — see "Context".

## Context

Upstream OpenFront runs a fixed 100 ms turn interval. The server collects intents for one interval,
then broadcasts a `turn` message to every client; each client's web worker executes that turn and the
resulting tick. Turn rate is therefore the master clock for the whole simulation — everything
tick-denominated moves at whatever rate this dial is set to.

On **2026-01-02** the owner changed the interval on Geoconflict. The commit message is the only
contemporaneous statement of intent that exists:

> `6854fda` — "Increasing the speed of the game (hypothesis: it will make the game more interesting
> for the players and will increase the interstitial ads rate)"

That records **why speed up at all** — a framed hypothesis with a player-experience half and a
monetization half. It does **not** record why *1.5*, and it **omits a goal**: the owner stated on
2026-08-09 that shortening match duration was also an aim, and that the ads framing is only
"partially correct". The coefficient was introduced at 1.5 in that single commit and has **never been
changed since** (`git log -S'flashist_gameSpeedCoef'` returns exactly one commit).

**How 1.5 was picked (owner, 2026-08-09):** by playing the game at candidate speeds. 2× was tried and
felt too fast; 1.5 was kept. No written record of that testing exists — the account is the owner's
recollection, given 2026-08-09.

**Whether either goal was achieved is still unmeasured.** Did session length, retention, or
interstitial impressions actually move? No analysis document, A/B result, or telemetry query tied to
this change exists in the repo, and the owner did not claim one. Playtesting settled *which value
feels right*; it did not test the hypothesis. The monetization half of the commit's hypothesis is
therefore **asserted and unverified to this day.**

## Decision

**Run the simulation at 1.5× the upstream rate.** The dial is a single private field, and the stock
value is deliberately preserved as a commented-out block directly above it:

```
src/core/configuration/DefaultConfig.ts:239-246
  // Flashist Adaptation: experimenting with game speed
  private flashist_gameSpeedCoef = 1.5;
  // turnIntervalMs(): number {
  //   return 100;
  // }
  turnIntervalMs(): number {
    return 100 / this.flashist_gameSpeedCoef;
  }
```

`100 / 1.5` = **66.67 ms**, i.e. ~15 turns/second instead of 10. This is a marked
`// Flashist Adaptation` divergence from upstream — an intentional local customization, in the same
class as the other adaptations catalogued in `../architecture.md`.

It applies **everywhere**: `DefaultServerConfig` is the base for `DevConfig`, `PreprodConfig`, and
`ProdConfig`, and both consumers read it —

- `src/server/GameServer.ts:491-494` — the multiplayer turn-broadcast `setInterval`
- `src/client/LocalServer.ts:69-75` — single-player and replay, multiplied by `replaySpeedMultiplier`

There is no per-mode, per-lobby, or per-environment override, and the value is not exposed to players.

## Options considered

*Two of these come from the owner (2026-08-09) and are marked **[owner]**. The rest are the shape of
the decision space as read from the code today — the owner did not describe weighing them, and they
are not a reconstruction of anyone's deliberation.*

- **Coefficient at 1.5 (chosen, in force)** — what ships. **[owner]** Selected by playtesting, to
  serve two goals: shorter matches and a higher interstitial-ad rate. Chosen on feel, not on data.
- **Coefficient at 2× (tried and rejected)** — **[owner]** "2x is too fast." Rejected in playtesting
  on game feel. No other criterion was cited — not desync headroom, not worker budget, not ad rate.
  The 66.7 ms tick this ADR documents is therefore the *slower* of two speeds the owner actually
  played.
- **Leave it at upstream 100 ms** — the status quo the commit deliberately moved away from, per the
  commit's stated hypothesis and the owner's match-length goal. Kept commented-out in the source as a
  one-line revert path.
- **Other coefficients (1.25, 1.75, …)** — whether any were tried is **unknown**. The owner named only
  1.5 and 2×; git shows no other value ever committed. Values could have been playtested locally and
  never committed; there is no evidence either way.
- **Rebalance per-tick constants instead of the tick rate** — would speed up the *economy* without
  speeding up *input and rendering*. Not done, and no evidence it was considered. It is a materially
  different change: it would not shorten matches in wall-clock the way the tick-rate dial does.
- **Make speed a per-lobby or per-mode option** — not done. Would fragment the balance surface and
  the desync profile across concurrent matches.

## Consequences

- **Everything tick-denominated now runs 1.5× faster in wall-clock time, uniformly.** Troop and gold
  accrual are applied once per tick (`src/core/execution/PlayerExecution.ts:74-77`), so a player's
  economy grows 50% faster per real second. **Relative** balance between tick-based systems is
  unchanged — every one of them sped up by the same factor. What *did* change is the ratio between
  the simulation and anything measured in real time: human reaction time, alliance-expiry as
  experienced, and how long a match takes.
- **Matches finish sooner in wall-clock.** Per the owner (2026-08-09) this is a **goal in its own
  right**, not only a means: shorter matches were wanted for their own sake. It is *also* the
  mechanism behind the commit's monetization half — more completed matches per hour per player means
  more interstitial opportunities. Neither effect has been measured. Note
  `gameCreationRate()` is still `120 * 1000` (`DefaultConfig.ts:247-249`), unchanged: lobby cadence
  did **not** speed up with the matches.
- **Server turn-broadcast load rose ~50%.** `endTurn()` serialises one `turn` message and sends it to
  every active client (`src/server/GameServer.ts:714-740`). At 15 turns/s instead of 10, per-game
  message count and outbound bytes are ~1.5× for the same match content — and match content is
  compressed into less wall-clock, so the *peak* rate per concurrent game rose, not just the total.
- **⚠️ The slow-turn telemetry threshold no longer matches the interval.**
  `GameServer.SLOW_TURN_THRESHOLD_MS = 100` (`src/server/GameServer.ts:712`) was presumably sized
  against the stock 100 ms interval. The interval is now 66.7 ms, so a turn taking 70–100 ms
  **overruns its own schedule without tripping the slow-turn span**. There is a blind band where the
  server is falling behind and telemetry says nothing. This is a real gap, evidenced by the two
  constants; it is **not** claimed to be a known or accepted tradeoff — nothing indicates the
  threshold was revisited when the interval changed.
- **Desync sensitivity is higher per real minute, not per tick.** The determinism risk per tick is
  unchanged — identical code, identical inputs. What changed is exposure and headroom:
  - A match of a given wall-clock length now executes **50% more ticks**, so any per-tick divergence
    source accrues 1.5× faster in real time and surfaces sooner.
  - The client web worker must finish executing a turn within **66.7 ms instead of 100 ms** — a third
    less headroom. On low-end devices (a real segment on Yandex Games) a worker that could keep up at
    100 ms may not at 66.7 ms, and falling behind is exactly the condition under which desync and
    visible lag show up.
  - Hash verification is unchanged in *tick* terms — clients hash every 10 ticks and the server
    majority-votes every 10 turns (`src/core/game/GameImpl.ts:349-387`;
    `src/server/GameServer.ts:1032-1129`) — which means in *wall-clock* terms a desync is now detected
    every ~667 ms instead of every ~1 s. Detection got faster along with everything else.
- **Not player-visible and not configurable.** No UI exposes it; players cannot opt out; there is no
  environment override. A revert is a one-line change (set the coefficient to `1`, or restore the
  commented-out stock method).
- **Residual risks / "re-raise only if":**
  - **A desync or client-performance investigation traces back to per-tick budget** — i.e. evidence
    that workers on real player hardware cannot complete a tick in 66.7 ms. Then the coefficient is a
    legitimate lever to reconsider, and this ADR should be superseded with the measurement attached.
  - **Server turn-broadcast cost becomes a scaling constraint** at higher concurrency, where a 1.5×
    message rate per game is the difference.
  - **The monetization hypothesis is actually measured and disproved** — if interstitial rate or
    session-quality data shows the speed-up did not deliver what the commit predicted, *half* the
    justification is gone. Note this no longer collapses the decision on its own: the owner's second
    goal (shorter matches) is delivered by construction and does not depend on the ads result. A
    disproved ads hypothesis is grounds to re-weigh 1.5, not to assume a revert.
  - **Any change to a real-time-denominated system** (ad-break pacing, tutorial timing, alliance
    durations expressed in seconds) — those must be reasoned about at 66.7 ms, not 100 ms.

  Absent those, a review finding of the form "`turnIntervalMs` diverges from upstream", "magic
  coefficient 1.5 in `DefaultConfig`", or "commented-out `turnIntervalMs` should be deleted" is
  **closeout of this ADR, not a new defect.** The commented-out stock method is a deliberate revert
  marker; leave it.

## Follow-up for a coder — code-comment correction

`src/core/configuration/DefaultConfig.ts:239` reads:

```
// Flashist Adaptation: experimenting with game speed
```

**"experimenting" now understates the status.** The owner confirmed on 2026-08-08 that this is settled
production behaviour, in force unchanged since 2026-01-02 — not a live experiment. The comment should
be corrected to say so and to point here, e.g. *"Flashist Adaptation: game runs at 1.5× upstream tick
rate — settled, see ADR-107"*.

**The architect did not make this edit** — source changes are the coder's. This is a comment-only
change with no behavioural effect; the value `1.5` must not be touched.

## Related

- `src/core/configuration/DefaultConfig.ts:239-246` — the coefficient and `turnIntervalMs()`
- `src/core/configuration/Config.ts:30` — the interface method
- `src/server/GameServer.ts:491-494, 712, 714-740` — turn-broadcast interval, slow-turn threshold, `endTurn()`
- `src/client/LocalServer.ts:69-75` — single-player/replay consumption, times `replaySpeedMultiplier`
- `src/client/graphics/layers/TutorialLayer.ts:205-212` — tutorial near-pause via a 100× multiplier on the same interval
- `src/core/execution/PlayerExecution.ts:74-77` — per-tick troop/gold accrual, the main balance coupling
- `../architecture.md` §"Turn interval is ~66.7 ms" and §"Desync detection"
- Commit `6854fda` (2026-01-02) — the change and its one-line hypothesis
