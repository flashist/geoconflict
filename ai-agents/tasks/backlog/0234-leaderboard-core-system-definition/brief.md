# Leaderboard Core System (Task 7) — definition investigation, before any implementation

## ID
0234

## Sprint
Sprint backlog — no sprint home yet. Filed on [`sprint-backlog.md`](../../../sprints/sprint-backlog.md),
where the `Task 7 — Leaderboard: Core System` row already lives; this brief fills that row's
previously-empty `None — see plan-index` Brief cell. **The row was not moved to another board** — task
[`0001`](../0001-consolidate-unsprinted-work-onto-backlog-board/brief.md) owns board consolidation.

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

---

> ## 🚨 READ FIRST — this is an INVESTIGATION brief, and that is deliberate
>
> **Written 2026-09-08 on an owner ruling** (given live in session, relayed through a spawning session)
> to brief Task 7 **and only Task 7**, because it is the one unbriefed item on that board with a known
> downstream dependency.
>
> **The source material is thin, and this brief does not pretend otherwise.** Everything that was
> actually written down about Task 7 anywhere in this repo is quoted in full under *Context* — it comes
> to two lines and an effort estimate. **The producer-facing rule applies: where the shape of the work
> is not known, scope an investigation, not an implementation.** Six decisions listed under *What to
> build* change what gets built, and none of them has been made.
>
> ⛔ **Do NOT write implementation briefs, schemas, or endpoints off this document.** Its deliverable is
> the set of answers plus a decomposition proposal. Implementation is briefed afterwards, from findings.
>
> ✅ **Not a duplicate — verified 2026-09-08 by reading both, so nobody re-derives it:**
> - [`0161-leaderboard-player-count`](../../done/0161-leaderboard-player-count/brief.md) (**done**) only
>   shows a **human player count in a "Players Only" label**. It is not a ranking system.
> - [`0210-singleplayer-platform-leaderboard-reporting-policy`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)
>   is a **reporting-policy decision** about whether Singleplayer should report to the **Yandex
>   platform** leaderboard at all. It is narrower and about the existing platform surface.
>
> ℹ️ **The other five live-but-unbriefed rows on that board — Task 6, 8b, 8c, 5, 2i — stay
> visible-but-unbriefed. That is the owner's explicit choice on 2026-09-08, not an oversight.** Recorded
> here once so it is not rediscovered later as a gap.

## Context

**All available source material, quoted in full — this is genuinely everything:**

1. `ai-agents/sprints/plan-index.md:90` —
   `| 7 | Leaderboard — core system | 1–2 weeks | ✅ Test | Replaces buggy Yandex built-in, drives Yandex login conversion | 4 |`
2. Its `## Items` section in `sprint-backlog.md` — *"Sprint 4 column, but never added to the Sprint 4
   plan document. Sprint 5 Task 10 (Leaderboard Rewards Layer) depends on Task 7 being live first."* /
   *"No brief written. Task 7 is a prerequisite for Sprint 5 Task 10. Assign and brief before Sprint 5
   kicks off."* / *"Effort (from plan-index): 1–2 weeks."*

That is the whole of it: a one-line benefit statement, an effort estimate, an experiments flag, and a
downstream dependency. **No metric, no scope, no surface, no store, no cadence.**

**What "replaces buggy Yandex built-in" refers to — verified, and the strongest evidence available for
why this task exists.** The Yandex platform leaderboard is live today and is demonstrably broken:

- [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) —
  `increaseCurPlayerLeaderboardScore(points)` is the real platform call, and in non-tutorial
  Singleplayer it is handed **10** — the first-place award — **to a player who lost**. The brief states
  plainly that it **is farmable**: *"Singleplayer has no opponent to beat and no matchmaking cost. Start
  a match, lose it, take 10 points."*
- [`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md) — placement semantics /
  literal-one defect on the same surface.

⚠️ **Neither of those is superseded by this task, and this task does not fix them.** They are defects in
the **existing platform** leaderboard; this is a decision about whether to build **our own**.

**Likely backing store, not yet a decision.** The player profile store
([`0013`](../../done/0013-player-profile-store-impl/brief.md),
[`0185`](../../done/0185-profile-05-backend-db-api/brief.md), both done) already persists per-player XP
in PostgreSQL behind the profile API. It is the obvious candidate and should be evaluated first — but
whether a leaderboard can read it directly, at what query cost, and whether ranking needs its own
projection is exactly the kind of question this investigation answers rather than assumes.

**Dependency, and why this is not idle.** Sprint 5's `Leaderboard — Rewards Layer` row cannot be built
until this is live. That row is currently `🔲 Backlog` with brief `TBD` on
[`plan-sprint-5.md`](../../../sprints/plan-sprint-5.md), so nothing is blocked *today* — but Sprint 5
cannot start this line of work without it.

⚠️ **Conflict to surface, not to plan around.** `plan-index.md` puts Task 7 in the **Sprint 4** column,
but it was never added to `plan-sprint-4.md` and Sprint 4 is the active sprint and heavily committed to
citizenship/monetization. **This brief does not resolve that** — see *Notes*.

## What to build

Produce a findings document in `ai-agents/knowledge-base/reports/` answering the six questions below,
then a **decomposition proposal**: the smallest independently shippable implementation slices, in
dependency order, for the producer to brief.

**Answer each question, or record explicitly that it needs an owner ruling and why.** An honest
*"this is the owner's call, here are the options and the trade-off"* is a valid answer. **A guess is
not.**

1. **Ranking metric.** What ranks a player? Cumulative XP (already persisted), wins, win-rate,
   placement points, a season score? ⚠️ Note the interaction: XP is credited flat per
   qualifying match ~~(10 XP)~~ **(🔴 PENDING: `1 XP` after
   [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) ships — `10 XP` is what is
   SHIPPED TODAY)**, so an XP leaderboard ranks **participation**, not skill.

   > 📌 **Figure corrected 2026-09-10, struck not deleted — and it is a NOTE, not an action.** Under the
   > 2026-09-10 owner ruling, `0211` takes XP per qualifying match from **10 → 1** and divides the citizenship
   > threshold by exactly **10** (**1,000 → 100**), both shipping inside `0211`. 🚨 **NOTHING HAS SHIPPED
   > YET — `10 XP` is still the live behaviour.** ⚠️ **The observation itself is UNCHANGED by the rescale:** flat
   > per-match credit ranks participation rather than skill **at any constant**, so scaling `10` to `1` changes
   > nothing about question 1. **Only the number is stale, not the argument.**
   > ⛔ **Do not change any source to match — the constants change inside `0211`.**
2. **Scope.** Global, seasonal, or per-mode (FFA / Teams / Duos-Trios-Quads)? One board or several?
3. **Reset cadence.** All-time, or periodic resets? If periodic — what happens to prior standings?
4. **Render surface.** Where does a player see it? Start screen, a modal, the win screen, or its own
   view? Note both HTML entry points must be updated (`index.html` and
   `yandex-games_iframe.html` — the latter is what serves production).
5. **Store.** Read directly from the profile DB, or build a separate ranking projection/table? Include
   a rough query-cost view at realistic player counts. **Consult `fkit-architect` for this one.**
6. **Anti-cheat / abuse posture.** 🚨 **Mandatory, not optional.** `0210` proved the *existing*
   leaderboard is trivially farmable via Singleplayer. A replacement that inherits that property is not
   an improvement. State what is required to make a submitted score trustworthy, and what the identity
   seam is — noting the recorded constraint that server-side crediting currently trusts a
   **client-asserted Yandex ID** (`ADR-103`).

Also determine, and state plainly:

- **Whether this replaces the Yandex platform leaderboard, runs alongside it, or feeds it.** The
  plan-index line says *"replaces"*, but `0209`/`0210` are actively fixing the platform surface. Both
  cannot be the long-term answer.
- **Whether the 1–2 week plan-index estimate survives** contact with the answers above. Say so if not.

## Verification steps

1. A findings document exists under `ai-agents/knowledge-base/reports/` named for its date and this
   task ID, and is linked from this brief's Notes.
2. Each of the six questions has either a recorded answer **with its reasoning**, or an explicit
   *"needs an owner ruling"* with the options and the trade-off stated. **No question is left
   unaddressed, and none is answered by assertion without reasoning.**
3. Question 6 (anti-cheat) specifically states whether the proposed design is farmable in the way `0210`
   documented, and if so what closes it.
4. The document states explicitly whether this replaces, complements, or feeds the Yandex platform
   leaderboard, and reconciles that with `0209` and `0210` by name.
5. A decomposition proposal lists candidate implementation slices, each with a one-line statement of
   **why it is independently shippable and testable**, in dependency order.
6. The document says whether `fkit-architect` was consulted on question 5, and what it established.
7. No source code was written and no implementation brief was filed off this document.

## Notes

- **Depends on:** nothing
- **Blocks:** Sprint 5 `Leaderboard — Rewards Layer` (plan-index Task 10); all Task 7 implementation
  slices, which cannot be briefed until this task's findings exist

- **Not a duplicate of** `0161` (done — human player count in a label only) or `0210` (Singleplayer
  platform-reporting policy). Verified 2026-09-08 by reading both; recorded so it is not re-derived.
- **Related, not superseded:** `0209` and `0210` fix defects in the **existing Yandex platform**
  leaderboard. This task decides whether we build **our own**. Neither closes the other.
- ⚠️ **Sprint placement is unresolved and is an owner decision.** `plan-index.md:90` assigns Task 7 to
  **Sprint 4**, but it was never added to `plan-sprint-4.md`, and Sprint 4 is the active, heavily
  committed sprint. This brief is filed **unscheduled** and takes no position. Raised for the owner —
  do not resolve it by filing the task into a sprint.
- ⚠️ **The `✅ Test` experiments flag in plan-index is carried over, not endorsed.** Whether a
  leaderboard is a sensible A/B candidate is a question for the investigation, not a settled input.
- **Effort:** `1–2 weeks` is plan-index's estimate for the **whole** Task 7 implementation, **not** for
  this investigation, and it predates every open question above. Treat it as unvalidated.
- Producer-owned because the dominant unknowns (metric, scope, cadence, surface) are **product**
  decisions. Question 5, and parts of 6, need an `fkit-architect` consult — that consult is expected.
- No secrets: this file goes to git.
