# Investigation: Leaderboard Core System (Task 7) — define it before any build (task 0234)

**Source**: `ai-agents/tasks/done/0234-leaderboard-core-system-definition/brief.md` + its deliverable `ai-agents/knowledge-base/reports/2026-10-28-0234-leaderboard-core-system-findings.md` (FINAL); `plan.md`, `review.md`, `worklog.md` in the task folder read as evidence only
**Status**: done (agent-closed — not owner-verified) — closed 2026-10-28; an investigation, **no source code written, no build brief filed**
**Sprint/Tag**: Sprint 9, rank 19 (append rank, flagged for owner confirmation) / task `0234` / owner `fkit-producer`; `fkit-architect` consulted four times

> ✅ **Closed 2026-10-28** via `/fkit-task-done` by a spawned `fkit-producer` at the CLOSE step of
> `/fkit-sprint-ship-loop` (driven by `fkit-lead`). Stateful review: 2 rounds + a spot-check, R1–R15 done, ledger
> `closed-out`; second opinion reasoning-only. **2 accepted residuals, each on an owner ruling:** AI lobby fillers count;
> the private-lobby self-play farm is uncapped in v1. **3 vote-design choices are left open for the S0 ADR** by owner
> ruling. Slices S0–S6 are **not briefed** — the producer briefs them when the owner asks.
> All owner rulings below were given 2026-10-28 in the `fkit-lead` session and **relayed** to spawned workers (no owner
> channel); quotes are verbatim as relayed.

## Goal

Answer six questions about building **our own** leaderboard (Task 7 on `plan-index.md`, *"Replaces buggy Yandex
built-in, drives Yandex login conversion"*, estimated 1–2 weeks) before anything is built: ranking metric, scope, reset,
where players see it, store, and anti-cheat. Also: replace, run alongside, or feed the Yandex platform board; and does
the 1–2 week estimate survive. Deliverable: a findings document plus an ordered set of shippable slices.

Not a duplicate of `0161` ([[tasks/leaderboard-player-count]] — a player count in a label) or `0210`
([[tasks/singleplayer-leaderboard-reporting-policy]] — the Yandex board's Singleplayer reporting). Moved into Sprint 9 on
2026-10-24 from the `0482` badges talk ([[tasks/leaderboard-badges-talk]]).

## Key Changes

Decisions recorded in the findings (owner rulings unless marked):

- **Q1 metric — rank value, not XP.** Per match: **rank value = N − place + 1** (first out gets 1, the top gets N). No
  placement bonus in v1 (owner undecided on +10 / +5; deferred to v2). Owner: *"I don't think leaderboard should be
  based on XP…"*.
- **Who counts in N and the place — humans + `AiPlayer` lobby fillers; bots and nations out.** The owner first said
  only real humans, then relaxed it (*"if it's easier, for the 1st version we can count AI Players too…"*) and picked
  **"Include AI now"** knowing its cost. Then defined the population as exactly what the in-match leaderboard's
  **"Players only"** checkbox shows (`Human` + `AiPlayer`, in `src/client/graphics/layers/Leaderboard.ts`) — the same
  set. N = spawned humans + `AiPlayer`s on the server's start roster. See [[systems/glossary]] for the four player kinds.
- **Place at death = death order** — the number of counted players still alive when you die, you included (owner,
  *"Yes, death order (Recommended)"*). Survivors at match end are ordered by territory. ⚠️ This is **not** the position
  a player last saw in the in-match list (that list sorts by territory); the two agree only at match end, "Players only"
  ticked, sorted by territory.
- **Teams: no exception** — each player is ranked individually, whichever team won.
- **Q2 + Q3 boards — monthly + all-time.** Monthly resets on the 1st (Moscow time — producer default); each month's
  **top 3 is frozen and kept forever** (for badges later). ⇒ For `0482`: **yes** monthly reset, **both** boards, so both
  badge candidates are possible.
- **Yandex board — run alongside** (*"Run alongside (Recommended)"*). `0209` and `0210` stay as filed; retiring the
  Yandex board is decided later, on evidence. Fact behind it: the Yandex board is written only from the client SDK;
  that Yandex has **no server-side leaderboard write** is **[MEM] — not confirmed** in the Yandex docs.
- **Q6 who earns — citizens only, multiplayer only, no cap.** Anti-farm rules (minimum match time, rate cap,
  verified-only) **deferred** to after v1, decided from analytics. **Abuse analytics are required in v1.**
- **The place must be protected by the backend** (owner: *"We can't leave this thing on the client-side only…"*).
  Today the game server knows **no standings at all** — only the start roster, spawns, the dying player's own
  self-report, the state-hash vote (a single number that cannot be read back into standings) and the winner vote.
  **Chosen: witness votes (B2)** — every client reports each counted death it sees; the server accepts it once **at
  least half** of the distinct IPs agree (the winner vote's rule, not a strict majority) and computes the place itself;
  a separate end-of-match standings vote orders survivors. Reuses most of the hash message path; the tally is new.
- **No independent witness ⇒ trust the client in v1** (owner: *"For the 1st version trust it anyway, but let's make
  sure we have enough analytics…"*). A match with one human (rest AI) or all humans on one IP records the client's
  claimed place, tagged `client_claim_no_witness`. ⚠️ A knowing exception to the "protected by the backend" rule, for
  that case only.
- **Where players see it — own window + profile line**: a start-screen Leaderboard button with Monthly / All-time tabs;
  the profile card shows "your rank"; non-citizens see a "become a citizen to join" prompt. Both HTML templates; en/ru.
- **Rollout — ship to all + off switch.** The plan-index `✅ Test` flag is **replaced**; no A/B test.
- **Paid-citizenship leak — none**, under three conditions: no XP anywhere on the board or its routes; rank value
  accrues only from matches played while a citizen; no "citizen since" field. The 2026-09-27 rule that a citizen's XP
  never moves on any route is not touched. (An **XP** board would leak — that still holds for any future XP board.)
- **Store [arch]:** profile database, owned by the profile server — a `player_match_results` table (one row per
  citizen per match), a per-period projection (`'all'` and `'YYYY-MM'`), and a frozen-trophies table; a **new internal
  batch endpoint** from game server to profile server (not an extension of the XP credit); read routes for top-N and
  my-rank, cached 30–60 s, no player or platform id in any response (ADR-113). Volume upper bound ~150–250K rows/month
  [arch EST]. The query-cost argument for the projection is **reasoning, not measured**.
- **Abuse analytics:** result rows in the database (who and how; kept) + server OTEL metrics in Uptrace (whether and
  how much; e.g. `geoconflict.server.match.rank_results` with `place_source` and `top` labels — unwitnessed 1st-place
  claims are the number the owner asked to watch) + a SQL runbook. Client GameAnalytics events are **UX only**, never
  abuse evidence; their category must not be confusable with the Yandex board's `Match:Leaderboard:Award` events.
- **Effort: ≈ 13–17 dev days, about 3–4 weeks with review [arch EST].** plan-index's "1–2 weeks" **does not hold**.

**Decomposition (§10, final; not briefed):** **S0** ADR (owner signs; includes the ADR-110 revisit) → **S1** profile
server results store → **S2** game server + client server-derived place → **S3** abuse analytics (**S2 and S3 deploy as
one unit**) · **S4** read routes (after S1, parallel with S2) → **S5** leaderboard window + profile line · **S6** monthly
top-3 freeze. The parked badge build (`0482`) waits on S5 live and used, and on S6.

## Outcome

- Findings FINAL; **no owner question remains** for this investigation.
- ⚠️ **Accepted trust residuals (owner-ruled), stated plainly:** (1) a modified game in a **1-human public lobby** with
  AI fillers can claim 1st and take **up to 10 points per match** — no one else can confirm it; (2) a citizen can fill
  a **private lobby** with his own guest clients on one IP and earn **up to K points per match from honest self-play** —
  no cap in v1, made visible by `lobby_type`; **not verified end to end** (no such match was run); (3) anyone holding
  **half or more of a match's distinct IPs** — including either player of any 2-IP match — can decide a witness vote.
  Their share is **not measured today**; the v1 metrics will show it.
- `0210`'s exact route (Singleplayer points for losing) is **closed** for our board: only multiplayer counts.
- **Open for the S0 ADR (owner sign-off):** (1) the quorum threshold (≥ half vs > half); (2) what a witnessed match
  records when an event fails quorum; (3) an all-one-IP match with several clients — whose claim counts. Owner:
  *"Decide in S0 ADR (Recommended)"*. Also for S0: exact tie rule, erased players' trophies (producer default: deleted),
  disconnected humans (default: count), whether a mid-match new citizen accrues that match (proposed: no).
- 🔴 **ADR-110's re-raise trigger fires** (it names "a leaderboard"; the frozen top 3 is durable). With AI counted, an
  `AiPlayer` can take 1st place in a match and lower humans' values (it never enters the board itself). To be settled
  **inside the S0 ADR** — see [[decisions/adr-110-ai-winner-allowed]].
- Sprint 9 rank `19` is still append rank, flagged for owner confirmation.

## Related

- [[tasks/leaderboard-badges-talk]] — task `0482`, the badges talk that moved this task into Sprint 9 and needed its two facts
- [[tasks/parked-paid-features-discussion]] — task `0343`, item F (badges) that waits on this
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, the Yandex board's farmable Singleplayer path; stays as filed
- [[tasks/placement-semantics-literal-one]] — task `0209`, the Yandex board's literal-one placement; stays as filed
- [[tasks/leaderboard-player-count]] — task `0161`, a different, done leaderboard task
- [[decisions/adr-110-ai-winner-allowed]] — its trigger fires; to be settled in S0
- [[decisions/adr-113-internal-player-id]] — no player or platform id in any read-route response
- [[decisions/paid-items-purchase-rules]] — badges are earned only, never sold
- [[systems/glossary]] — `Human` / `AiPlayer` / `Bot` / `FakeHuman`, the kinds the rank population is built from
- [[systems/player-profile-store]] — the profile database the results store would live in
- [[systems/analytics]] — UX events only; the Yandex board's `Match:Leaderboard:Award` family to keep apart
- [[decisions/product-strategy]] — `plan-index.md` Task 7 row (estimate and `✅ Test` flag no longer hold)
- [[decisions/sprint-9]] — the board (rank 19)
