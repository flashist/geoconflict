# Cut the public lobby wait from 2 minutes to 1 minute

## ID
0367

> ℹ️ **ID allocation, checked 2026-10-01 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder on
> all three boards: `0366`; highest `## ID`: `0366`. `0367`: no task folder, no `## ID` hit, no hit under
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Sprint 7

## Priority
31

> ⚠️ **Priority 31 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner named the
> sprint but no rank; the board's highest was 30, and writing it higher would renumber closed rows (ADR-035).
> **On merit this belongs directly below `0366`**, with the top group, because it is a one-number change that
> only starts its test once it rides a weekend game-server deploy — if it is not built and committed before the
> next slot (Saturday 2026-10-03/04), the test slips a full week.

> ✅ **Answered 2026-10-01 — OWNER RULING Q0** (live `fkit lead` session via `AskUserQuestion`, verbatim *"Right below
> 0366 (Recommended)"*, relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent): **placed
> directly below `0366`, with the top group, whatever the number says** — so it can be built for Saturday's
> (2026-10-03/04) weekend game-server deploy. The number stays 31 (ADR-035: writing it higher would renumber closed
> rows). The "flagged for owner confirmation" wording above is kept as history. See the last section of this brief.

## Status
✅ Done (agent-closed — not owner-verified)

📌 **Set 2026-10-02** by `fkit-lead` driving `fkit-sprint-ship-loop`. *(Earlier value, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given
live in the `fkit lead` session on 2026-10-01, relayed by `fkit-lead`.** ⛔ Not producer precedent. Owner's words
(verbatim, voice-typed): *"Brief add task for this current sprint. About decreasing the duration of the delay
between open lobbies, open multiplayer lobbies. Right now they are two minutes, I want to make them one minute.
But Yeah, the reason why I do that because some players asked me about it and they see that we are getting more
and more online users. Online players and I think we are ready to test this to test the decreased delay between
online multiplayer lobbies. Add the task to the current active sprint."*

**In plain terms.** Today a public multiplayer lobby stays open for 2 minutes before its match starts. The owner
wants 1 minute. Why: players asked for it, and online player counts are growing, so the owner thinks there are
now enough players to fill a shorter lobby. **It is framed as a test** — see *Notes* for what "test" should mean.

**How it works today (checked against the code 2026-10-01 — the coder re-checks):**
- **One number drives it.** `gameCreationRate()` in `src/core/configuration/DefaultConfig.ts` (~:247) returns
  `120 * 1000` ms. **Production and Preprod do not override it** (`ProdConfig.ts`, `PreprodConfig.ts`), so prod
  really is 2 minutes. Dev overrides it to 5 s (`DevConfig.ts` ~:21) — leave Dev alone.
- **The 1.5× game speed-up does not touch it.** It is wall-clock ms, not ticks. ADR-107 records this explicitly:
  *"lobby cadence did not speed up with the matches."*
- **There is only ever one public lobby open.** The master polls every 100 ms and creates a new lobby only when
  none is open (`src/server/Master.ts`, `lobbyPollTick` / `schedulePublicGame`). So "the delay between lobbies"
  **is** the lobby's own countdown — when one lobby starts its match, the next opens straight away. The wiki
  agrees (`systems/architecture-overview.md`: one lobby, 120,000 ms window).
- **A lobby with any AI player never starts early** (`GameServer.ts` ~:1019–1026: a lobby stays a lobby while
  under its time limit and either short of humans *or* holding any AI). In production AI players are on
  (`ProdConfig.ts` `aiPlayersConfig` → `enabled: true`), so in practice almost every public match waits the full
  window. That is why halving the number really does halve the wait.

**What else this one number drives — all of it changes with it (by design, unless the owner says otherwise):**
1. **The countdown players see.** The server sends `msUntilStart` from this number (`GameServer.ts` ~:1063) and
   the client counts down from it (`src/client/PublicLobby.ts`). No client change is needed; the lobby card will
   simply show 1:00 instead of 2:00.
2. **How fast AI players fill the lobby.** With no `timeoutSec` set (prod doesn't set one), AI players join on a
   straight ramp over the whole window and reach the same target (10 total) by the end (`GameServer.ts` ~:593).
   At 1 minute they arrive twice as fast. The number of AI players at the start does not change.
3. **When a started-but-empty public game is cleaned up** — window + 30 s (`GameServer.ts` ~:1028–1029), so
   150 s becomes 90 s. Harmless.
4. **The ad shown when a player joins a lobby.** The client shows the join interstitial only if at least 15 s
   remain (`FlashistFacade.ts` ~:316, `minDurationBeforeGameSec: 15`; used in `PublicLobby.ts` ~:333). With a
   1-minute window, a larger share of joins land in the last 15 s — roughly 1 in 4 instead of 1 in 8 if players
   arrive evenly. **So join ads may drop; more matches per hour may add end-of-match ads.** Ads are today's
   revenue, so this is worth watching, not a reason to block. Not changing the 15 s threshold is the default —
   see open question Q4.
   *📌 2026-10-01 — owner-ruled (Q3+Q4, see the last section): the 15 s rule stays unchanged during the test; the
   join-ad count is only watched.*
5. **Time for a slow device to load the map before the match starts.** Halving the lobby halves that time.
   Background terrain preloading and `0035` (worker init timeout / map refetch, done) help, but a rise in failed
   or late starts on slow devices is the most plausible way this could hurt. Watch it.

**Dependencies and conflicts.**
- No locked decision conflicts. ADR-107 only *records* that the lobby window was left at 120 s; it does not rule
  that it must stay there.
- **Deploy:** this is a **game-server** deploy (not profile). Deploys run in **weekend slots** (owner ruling
  2026-09-29). Committed is not deployed.
- **Build/verify split** (owner ruling 2026-09-29): the test result needs a deploy plus a reading of real data
  over days, so this task closes when the change is built and reviewed; a separate **verify** task is filed at the
  top of the **next** sprint at close time — see *Notes*.

## What to build

**One value change, plus the docs that state the old value. Nothing else.**

1. **Change the public lobby window from 120 s to 60 s** for Production and Preprod — the value returned by
   `gameCreationRate()` in `DefaultConfig.ts`. Keep Dev's 5 s override as it is.
2. **Keep the coupled behaviours coupled** (countdown, AI fill ramp, empty-game cleanup, all listed in *Context*)
   — they should follow the new window automatically. Do **not** add a separate AI timeout or change the 15 s
   join-ad threshold unless the owner rules otherwise (Q3, Q4).
   *📌 2026-10-01 — owner-ruled (Q3+Q4, "Change only the number"): no separate AI timeout, no 15 s change, and
   **no runtime switch / new environment setting**. The build is the one number.*
3. **Tests.** The value lives in `src/core/`, so per project rule it must be tested. At minimum a test that pins
   the production/preprod server config to 60 s and Dev to 5 s, so a later edit cannot silently move it. If an
   existing `GameServer` lobby-phase test is cheap to point at the shorter window, use it; do not build new test
   infrastructure for this.
4. **Update the docs that state 120 s / 120,000 ms:** `ai-agents/knowledge-base/architecture.md` (*Lobby window*,
   ~:368). Leave ADR-107's sentence as-is (it is a dated record of that change; add a one-line dated note under it
   only if the plan judges it misleading). **Do not edit `ai-agents/wiki-vault/`** — the wiki is updated by
   `fkit-wiki` after close (`systems/architecture-overview.md` states 120,000 ms).
5. **No announcement text** unless the owner asks — `/update-announcements` drafts player-facing notes from
   commits at release time anyway.

## Verification steps

1. **Value:** the production and preprod server configs return `60000` for `gameCreationRate()`; Dev still returns
   `5000`. Proved by the new test.
2. **Full `npm test` green**, `npm run lint` and `tsc` clean. (Supertest suites can flake — follow CLAUDE.md's
   known-flake rule: check the signature, re-run, and say you re-ran.)
3. **Local, prod-like behaviour check (coder, no deploy):** run the server with a non-Dev config (or a test that
   builds a `GameServer` with the prod config) and show that a fresh public lobby reports `msUntilStart` of about
   60 000 ms, and that it moves from lobby to started at about 60 s with an AI player present. Record how it was
   run in the worklog.
4. **Docs:** `architecture.md` no longer states 120,000 ms as the current window.
5. **Baseline captured before the deploy (read-only).** Record in the worklog the "before" numbers the verify task
   will compare against (see *Notes* → *What "test" means*), over the last 7 days on 2 minutes — whatever can be
   read without new code. If a number cannot be read, say so plainly in the worklog; do not invent a proxy. If the
   coder has no access to a source, list the query for the owner to run instead.
   *📌 2026-10-01 — owner-ruled (Q1, Q2): the "before" window is the **7 days before the deploy**, and the numbers
   that matter most are the two in the keep/revert rule — **multiplayer matches per day** and the **share of
   matches with only one real player**. Capture those first.*
6. **Not a verification step of this task:** how real players respond. That needs a weekend deploy and days of
   data, so it belongs to the verify task filed at close (2026-09-29 build/verify-split rule).

## Notes

- **Depends on:** nothing.
- **Blocks:** the verify task to be filed at close (no ID yet).

- **What "test" means — a proposal, the owner decides (Q1, Q2).** With the same number of players online, a
  1-minute lobby means **players wait half as long and twice as many matches start per hour — but each match
  collects about half as many real people** before it starts (AI fills the rest). Whether that is good depends on
  which you value more. Proposed numbers, before (7 days on 2 min) vs after (7 days on 1 min):
  - **Main signal — are people playing more multiplayer?** Multiplayer matches started per day (client
    `Game:Mode:Multiplayer`, see `analytics-event-reference.md`), and the share of lobby joins that reach a match
    start (`UI:ClickMultiplayer` → `Game:Mode:Multiplayer`). Shorter waits should mean fewer people giving up in
    the lobby.
  - **Guard — are matches getting lonely?** Real players per public match, and the share of public matches with
    only one real player. Possible source: the server's `"sending start message"` log line, one per real player,
    which carries `gameID` (child logger, `GameServer.ts` ~:143) — **unverified that production server logs are
    queryable for this; the coder confirms in the baseline step.**
  - **Guard — do starts fail more?** Time to spawn (`Match:Spawned`) and failed/late starts on slow devices.
  - **Watch — ads.** Join-interstitial count per day (see *Context* item 4).
  - *📌 2026-10-01 — owner-ruled (Q1, Q2; see the last section): no longer a proposal. Window = **7 days after the
    deploy vs the 7 days before**. **Keep** 1 minute if multiplayer matches per day hold steady or rise **and** the
    share of one-real-player matches does not jump noticeably; the owner sets the number for "noticeably" once
    the "before" numbers are in. The other signals above are context, not the decision rule.*
- **Revert path.** Revert is the same one-number change back to 120 s, shipped in the next weekend slot. There is
  no runtime switch, by design (Q3) — this keeps the build to one number.
  *📌 2026-10-01 — owner-ruled (Q3+Q4): confirmed.*
- **Verify task (2026-09-29 rule).** At close, the producer files "Verify `0367` in production — 1-minute lobbies
  vs the 2-minute baseline" at the top of the next sprint, owner-run, read-only, comparing the numbers above.
  It must not block the current sprint's deploy.
  *📌 2026-10-01: that verify task carries the owner-ruled rule and window (Q1, Q2) as its pass/fail.*
- **Merit position:** directly below `0366` (see `## Priority`). *📌 2026-10-01 — owner-confirmed (Q0).*

### Open owner questions (to settle before or at the plan step)

- **Q1 — What decides "keep" vs "revert"?** Recommendation: keep 1 minute if multiplayer matches per day hold or
  rise **and** the share of one-real-player matches does not jump noticeably; owner to put numbers on "noticeably"
  once the baseline is in. Plain terms: we are trading "how many people per match" for "how short the wait is";
  this question is which loss you would not accept.
  ✅ **Answered 2026-10-01** — *"Matches + lone-player share (Recommended)"*. See the last section.
- **Q2 — How long does the test run?** Recommendation: 7 days after the deploy, compared with the 7 days before
  (covers weekday and weekend traffic).
  ✅ **Answered 2026-10-01** — *"7 days vs 7 before (Recommended)"*. See the last section.
- **Q3 — A runtime switch, or just change the number?** Recommendation: just change the number. A switch you can
  flip on the box (an environment value) would make reverting faster, but still needs a server restart, adds a new
  setting the deploy scripts must forward (`check:config-parity`), and the game deploys weekly anyway.
  ✅ **Answered 2026-10-01** (asked together with Q4) — *"Change only the number (Recommended)"*. See the last section.
- **Q4 — Keep the 15 s join-ad rule as it is?** Recommendation: yes, keep it for the test, and just watch join-ad
  counts. Changing two things at once would muddy the result.
  ✅ **Answered 2026-10-01** (asked together with Q3) — *"Change only the number (Recommended)"*. See the last section.

## 📌 2026-10-01 — owner rulings on Q0–Q4 (appended; nothing above deleted — dated notes only, ADR-035)

**Authority.** OWNER RULINGS given live 2026-10-01 via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. These answer
the priority flag under `## Priority` (Q0) and the open questions in *Notes* (Q1–Q4); the questions are kept as
written. Q3 and Q4 were asked as one question.

- **Q0 — Rank** → *"Right below 0366 (Recommended)"*. With the top group, so it can be built for Saturday's
  (2026-10-03/04) weekend game-server deploy. Number stays 31 (ADR-035, no renumbering closed rows); placement
  recorded on the [Sprint 7](../../../sprints/done/plan-sprint-7.md) row's priority cell and under `## Priority`.
- **Q1 — Keep/revert rule** → *"Matches + lone-player share (Recommended)"*. **Keep 1 minute if multiplayer matches
  per day hold steady or rise AND the share of matches with only one real player does not jump noticeably.** The
  owner sets the number for "noticeably" once the "before" numbers are in. Otherwise revert.
- **Q2 — Test length** → *"7 days vs 7 before (Recommended)"*. The 7 days after the deploy, compared with the 7 days
  before it on 2 minutes.
- **Q3 + Q4 — Test setup** → *"Change only the number (Recommended)"*. **No server switch, no new environment
  setting.** Revert = the same one-number change back to 120 s, in a later weekend slot. The "show the join ad only
  if 15+ s remain" rule **stays unchanged** during the test; the join-ad count is only watched.

**What this changes in the brief.** Nothing in the build: scope stays one number + its test + `architecture.md`.
Dated notes were added under *Context* item 4, *What to build* item 2, *Verification* step 5 and *Notes* so that no
"owner to decide" wording is left standing without its answer. The verify task filed at close uses Q1 as its
pass/fail and Q2 as its window.
