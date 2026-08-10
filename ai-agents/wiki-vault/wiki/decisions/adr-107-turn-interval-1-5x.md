# ADR-107 — The game runs at 1.5× the upstream tick rate (66.7 ms, not 100 ms)

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-107 — see [[decisions/adr-numbering-two-series]].
> Recorded 2026-08-08; the change was made **2026-01-02**. The owner is the sole author of the commit and **confirmed on 2026-08-08 that this is settled production behaviour, not an open experiment.**
>
> Source: `ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md`

> ✅ **The selection rationale was supplied by the owner on 2026-08-09** (interview via the producer session), closing the gap this page previously flagged as unrecorded. Verbatim:
>
> > *"Your assumption about more interstitial ads is partially correct, I also wanted to make matches quicker, the 1.5x was chosen by testing the game (2x is too fast)."*
>
> This is an **owner statement**, not something read out of code or commits. Three things it establishes:
>
> 1. **There were two goals, not one.** A higher interstitial-ad rate (the only goal the January commit message captured) **and** shorter match duration. The owner ranks the ads reading as only "partially correct" — match length was a goal in its own right, not a side effect.
> 2. **The value was chosen empirically, by playtesting** — not by analysis, modelling, or measurement.
> 3. **2× was tried and rejected as too fast.** A real rejected alternative, recorded below.
>
> ⚠️ **What this does *not* establish: whether either goal was achieved. Playtesting is not measurement.** No A/B result, telemetry query, or analysis document tied to this change exists in the repo, and the owner did not claim one. The ads hypothesis remains **unmeasured**. No written record of the playtesting exists either — the account is the owner's recollection, given 2026-08-09.

## Context

Upstream OpenFront runs a fixed 100 ms turn interval. Turn rate is the master clock for the whole simulation — everything tick-denominated moves at whatever rate this dial is set to.

On 2026-01-02 the owner changed the interval. The commit message is the only contemporaneous statement of intent that exists: *"Increasing the speed of the game (hypothesis: it will make the game more interesting for the players and will increase the interstitial ads rate)"*. That records **why speed up at all** — a framed hypothesis with a player-experience half and a monetization half. It does **not** record why *1.5*, and it **omits a goal**: the owner stated on 2026-08-09 that shortening match duration was also an aim, and that the ads framing is only "partially correct". The coefficient was introduced at 1.5 in that single commit and has **never been changed since**.

**How 1.5 was picked (owner, 2026-08-09):** by playing the game at candidate speeds. 2× was tried and felt too fast; 1.5 was kept.

**Whether either goal was achieved is still unmeasured.** Did session length, retention, or interstitial impressions actually move? No analysis document, A/B result, or telemetry query tied to this change exists in the repo, and the owner did not claim one. Playtesting settled *which value feels right*; it did not test the hypothesis. The monetization half is therefore **asserted and unverified to this day.**

## Decision

**Run the simulation at 1.5× the upstream rate.** The dial is a single private field in `DefaultConfig.ts`, with the stock value deliberately preserved as a commented-out block directly above it. `100 / 1.5` = **66.67 ms**, i.e. ~15 turns/second instead of 10. It is a marked `// Flashist Adaptation` divergence.

It applies **everywhere** — the base server config is inherited by dev, preprod, and prod, and both consumers read it: the multiplayer turn-broadcast interval and the single-player/replay local timer. There is no per-mode, per-lobby, or per-environment override, and the value is not exposed to players.

**Options considered.** Two come from the owner (2026-08-09) and are marked **[owner]**; the rest are the shape of the decision space as read from the code, not a reconstruction of anyone's deliberation.

- **Coefficient at 1.5 (chosen, in force)** — **[owner]** selected by playtesting, to serve two goals: shorter matches and a higher interstitial-ad rate. Chosen on feel, not on data.
- **Coefficient at 2× (tried and rejected)** — **[owner]** *"2x is too fast."* Rejected in playtesting on game feel. No other criterion was cited — not desync headroom, not worker budget, not ad rate. The 66.7 ms tick this ADR documents is therefore the *slower* of two speeds the owner actually played.
- **Leave it at upstream 100 ms** — the status quo the commit deliberately moved away from, kept commented out as a one-line revert path.
- **Other coefficients (1.25, 1.75, …)** — whether any were tried is **unknown**. The owner named only 1.5 and 2×; git shows no other value ever committed. Values could have been playtested locally and never committed; there is no evidence either way.
- **Rebalance per-tick constants instead of the tick rate** — would speed up the *economy* without speeding up *input and rendering*, and would not shorten matches in wall-clock the way this dial does. Not done, and no evidence it was considered.
- **Make speed per-lobby or per-mode** — would fragment the balance surface and the desync profile across concurrent matches.

## Consequences

- **Everything tick-denominated runs 1.5× faster in wall-clock, uniformly.** Troop and gold accrual are applied once per tick, so a player's economy grows 50% faster per real second. **Relative** balance between tick-based systems is unchanged — they all sped up by the same factor. What changed is the ratio between the simulation and anything measured in real time: human reaction time, alliance expiry as experienced, and match length.
- **Matches finish sooner in wall-clock.** Per the owner (2026-08-09) this is a **goal in its own right**, not only a means: shorter matches were wanted for their own sake. It is *also* the mechanism behind the commit's monetization half — more completed matches per hour per player means more interstitial opportunities. Neither effect has been measured. Note the lobby creation rate is unchanged at 120 s: lobby cadence did **not** speed up with the matches.
- **Server turn-broadcast load rose ~50%.** At 15 turns/s instead of 10, per-game message count and outbound bytes are ~1.5× for the same match content — and that content is compressed into less wall-clock, so the *peak* rate per concurrent game rose, not just the total.
- ⚠️ **The slow-turn telemetry threshold no longer matches the interval.** The threshold is 100 ms and was presumably sized against the stock 100 ms interval. The interval is now 66.7 ms, so **a turn taking 70–100 ms overruns its own schedule without tripping the slow-turn span** — a blind band where the server is falling behind and telemetry says nothing. This is a real gap evidenced by the two constants; it is **not** claimed to be a known or accepted tradeoff. **Now briefed as investigation task `0006`** (owner's answer when asked was "don't know — investigate"); the naive fix of setting the threshold to 66.7 ms may trade a blind band for alert noise, so the right value is a measurement, not a guess. See [[systems/telemetry]], [[systems/server-performance]], and [[decisions/sprint-backlog]].
- **Desync sensitivity is higher per real minute, not per tick.** Per-tick determinism risk is unchanged; exposure and headroom are not. A match of a given wall-clock length executes **50% more ticks**, so any divergence source accrues 1.5× faster. The client worker must finish a turn within **66.7 ms instead of 100 ms** — a third less headroom, and on low-end devices (a real segment on Yandex Games) a worker that could keep up at 100 ms may not. Detection also got faster: hashing is unchanged in *tick* terms, so a desync now surfaces every ~667 ms instead of ~1 s.
- **Not player-visible and not configurable.** A revert is a one-line change.
- **Re-raise only if:** a desync or client-performance investigation traces back to the per-tick budget on real player hardware; turn-broadcast cost becomes a scaling constraint; **the monetization hypothesis is actually measured and disproved** — note this no longer collapses the decision on its own, because the owner's second goal (shorter matches) is delivered by construction and does not depend on the ads result, so a disproved ads hypothesis is grounds to re-weigh 1.5, not to assume a revert; or any real-time-denominated system changes (ad-break pacing, tutorial timing, alliance durations in seconds) — those must be reasoned about at 66.7 ms, not 100 ms. Absent those, a finding of the form *"`turnIntervalMs` diverges from upstream"*, *"magic coefficient 1.5"*, or *"the commented-out method should be deleted"* is **closeout of this ADR, not a new defect**. The commented-out stock method is a deliberate revert marker; leave it.

**Open follow-up for a coder:** the code comment at the coefficient says "experimenting with game speed", which now understates the status. It should be corrected to say the behaviour is settled and to point here. Comment-only — the value 1.5 must not be touched. The architect deliberately did not make this edit; source changes are the coder's.

## Related

- [[systems/game-loop]] — the tick and turn-replay path this dial governs
- [[systems/server-performance]] — turn-cost analysis at the ~67 ms interval
- [[systems/telemetry]] — the slow-turn span and its threshold blind band
- [[systems/game-overview]] — where the ~67 ms interval is stated in the game reference
- [[systems/architecture-overview]] — §the tick model
- [[features/tutorial]] — the tutorial near-pause is a multiplier on this same interval
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[systems/project-brief]] — the ~67 ms tick stated as a domain term
- [[decisions/sprint-backlog]] — task `0006`, the slow-turn-threshold investigation this ADR's blind band produced
