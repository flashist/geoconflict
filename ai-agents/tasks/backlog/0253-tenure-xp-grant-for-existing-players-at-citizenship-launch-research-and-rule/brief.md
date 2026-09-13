# One-time "tenure" XP grant for existing players when the citizenship XP path goes live — research the evidence, settle the rule, then build

## ID
0253

> ℹ️ **ID allocation, checked 2026-09-13 before filing. `0253` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0253-*/` — no matches (highest ID on disk across all three boards was
> `0252`). **2.** `grep -rn "^0253$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.**
> `grep -rn "0253" .claude/` — zero hits. **4.** repo-wide (`node_modules`, `.git`, `static` excluded,
> `.svg`/`.json` filtered) — zero hits. Duplicate-ID check (`sort | uniq -d` over folder prefixes) —
> empty.

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity; a decorated value is reported as drift. **Do not decorate it.**

## Priority
Medium *(producer's rank)*

📌 **This is the PRODUCER's rank, not the owner's — the owner gave no priority.** ⚠️ **On the board the
row is APPENDED at the bottom (ADR-035) — append rank, NOT a merit ranking — flagged for owner
confirmation.** **On merit this belongs directly below
[`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md)**, because it is worthless until
`0217` wires the game server to the profile box (no credit path exists before that) and because its
research + decision phase should run **while** `0217` is in flight, so the rule is settled by the time
the XP path reaches players — the resentment this task exists to prevent happens the first time an
old-timer sees `0 XP`, which is launch day. **Medium and not High** because it is a goodwill measure,
not a launch gate — the citizenship launch works without it. **Medium and not Low** because the cost of
getting it wrong is public (angry long-time players on launch day) and the fix, once shipped, is
one-time and cannot be re-run.

## Status
🔲 Backlog

## Owner
fkit-coder

⚠️ **`fkit-coder`, with a hard research/decision gate before any build.** Step 1 (investigation) and
step 2 (the rule) are done and put to the owner **before** any implementation is planned. **The owner
decides the rule** — rate, cap, one-time-ness, evidence signal, abuse posture, popup copy. The coder
may consult `fkit-architect` on the recording shape (step 2, question D). **Implementation is NOT
scoped in this brief** — after the owner rules, the producer files the implementation brief(s) (see
*Notes* for the expected split). This brief closes when the findings report exists and the owner has
ruled; it does not close on shipped code.

## Context

**Filed 2026-09-13 on an owner request given live in the lead session and relayed through it.** Owner's
intent, lightly structured:

> When we enable the XP path for earning citizenship, many old-time players may be angry: they've
> played a lot but have no XP for it. Idea: at load time, check local storage data (if it exists) and
> if we can tell the player has played for more than X days, grant them XP once, with a popup telling
> them. Example rule: 1 XP per day played, capped at 50 XP. **This requires research first** to settle
> the rules for granting "free" XP.

### Why this is real

Citizenship is earned at **100 XP, 1 XP per qualifying match**
([ADR-111](../../../knowledge-base/decisions/adr-111-xp-economy-rescale-awards-move-up-never-down.md);
✅ constants shipped in `0211`, `src/core/profile/Citizenship.ts` — `CITIZENSHIP_XP_THRESHOLD = 100`
at `:20`, `XP_PER_MATCH = 1` at `:31`, read 2026-09-13). XP only starts accruing once the game server is
wired to the profile box (`0217`, open) **and** that build is deployed. Every match played before that
day earns nothing. A player who has played since the fork launched will open the citizenship card and
see `0 / 100`. The owner's example rule — 1 XP per day played, cap 50 — would hand such a player up to
**half** the threshold on day one.

### What evidence of tenure actually exists — surveyed 2026-09-13, read-only

⛔ **The modules the owner named do not exist.** `appStorageState`, `AppStateModuleState` and
`AppStateModule` return **zero hits** across `src/`, `ai-agents/` and `node_modules/`.
`src/client/flashist/` holds exactly one file, `FlashistFacade.ts`. **No Yandex cloud save is used**
(no `player.getData`/`setData` anywhere). Every tenure signal is **browser `localStorage` on the game
origin** — client-controlled and trivially forgeable.

| Signal | Key | Written | Shape | Evidence horizon (⚠️ source-commit date, not deploy date) |
|---|---|---|---|---|
| First ever visit | `geoconflict.player.firstSeen` | `src/client/flashist/FlashistFacade.ts:465` (existence-checked at `:464`; **the value is never read back anywhere today**) | ms-epoch timestamp | introduced `d0eb05f`, 2026-02-28 — cannot evidence anything earlier |
| Distinct calendar days with a session | `geoconflict.player.daysPlayed` | `src/client/DaysPlayedAnalytics.ts:28` | counter | introduced `2a15fc5`, 2026-05-02 — a player from late 2025 has at most ~4 months counted |
| Lifetime multiplayer joins | `gamesPlayed` | `src/client/Utils.ts:244` (`incrementGamesPlayed`, called once per join at `src/client/Main.ts:772`); the only reader is `getGamesPlayed` `:235` | counter | since the fork's first commit `feea527`, 2025-11-04 — the **oldest** signal |
| Per-match records | `game-records` | `src/client/LocalPersistantStats.ts:23`, `startGame` `:31-40` stamps `startTime: Date.now()` | JSON map `gameID → { lobby, startTime, gameRecord }` | since `feea527`, 2025-11-04 — match count = key count, first play = min `startTime`; **the richest signal** |
| Last played date | `geoconflict.player.lastPlayedDate` | `src/client/DaysPlayedAnalytics.ts:29` | `YYYY-MM-DD` | 2026-05-02 |

Weaker hints, not tenure: `tutorialCompleted` / `tutorialAttemptCount`, `lastSeenAnnouncement…`
(announcement id), `geoconflict.sp.nextMissionLevel`. Transient, not cumulative:
`geoconflict.session.pendingEnd:<uuid>` (drained and deleted on next boot).

**Server side there is nothing usable at launch.** `player_profiles.created_at`
(`migrations/001_player_profiles.sql:31`) dates the *profile row*, which is created at first
authenticated join **after** `0217` — the table holds **0 rows** today (`0211` close, ADR-111). The
per-match ledger `player_match_xp_credits` (`:51-57`) starts empty for the same reason. ⇒ **At the
moment this grant matters, the only tenure evidence in existence is on the player's device.** The
server cannot verify a claim; it can only bound the harm of a false one.

### The recording seam — what exists and what does not

- Wire contract `src/core/profile/CreditContract.ts:20-24` — a credit item is exactly
  `{ gameId, yandexPlayerId, xpAwarded }` (`xpAwarded` positive int ≤ 10 000). **No `reason`, `kind`
  or `source` field.** Idempotency **is** the ledger PK `(game_id, yandex_player_id)`
  (`migrations/001_player_profiles.sql:49-50`; `src/core/profile/MatchQualification.ts:91-92`).
- Route `POST /internal/v1/credit` (`src/profile-server/Routes.ts:324-359`, `internalAuth`) →
  `creditMatchXp` (`src/profile-server/PlayerProfileRepository.ts:226-291`), `CREDIT_SQL` `:80-100`
  (`INSERT … ON CONFLICT DO NOTHING` + running-total `UPDATE`), citizenship threshold check in the same
  transaction (`GRANT_CITIZENSHIP_SQL` `:110-118`).
- **No `xp_events` / ledger-with-reason table exists.** The only per-grant `source` column precedent
  is `player_cosmetic_ownership.source` (`migrations/001_player_profiles.sql:75`).
- **No existing bonus / one-time-grant / welcome / legacy XP concept anywhere** in `src/` or
  `ai-agents/` (grep run 2026-09-13).
- ADR-101 (fail-soft crediting, **no durable queue**): a credit call that fails is **lost, not
  queued**. ⚠️ Directly relevant here — a one-time grant that the client marks "claimed" locally before
  the server has acknowledged it is **lost forever**.

### Dependencies, conflicts, constraints

- **The grant is gated by `0217` for go-live** — nothing can be granted before the game server
  reaches the profile box; the grant cannot be live before `0217` lands **and is deployed**. The
  research + decision here can and should run before that (the machine-readable dependency line is in
  *Notes* and reads `nothing` for exactly this reason).
- Sits on the earned-citizenship track: [`0017`](../0017-citizenship-earned/brief.md) (threshold →
  citizen), `0211` (done — 1 XP/match), the crediting seam (`ProfileApiClient`, `0062` — token
  forwarding, `0217` — live path).
- **ADR-111 — compatible, not in conflict.** The ADR's principle is that XP awards move *up*, never
  down; an additive one-time grant moves up. ADR-111's own clarification block records the owner
  **accepting free citizenship grants** at the rescale (cost nothing — the table was empty); this task
  is a deliberate free grant of the same family and should be recorded against that precedent, not
  hidden.
- **Guests cannot receive anything** — the profile store is keyed by `yandex_player_id`; a player
  without Yandex auth has no row. The rule must say what happens to a long-time guest who logs in later
  (claim-on-first-login is the obvious shape; the research must check whether that is reachable).
- Localization: citizenship strings live in `resources/lang/en.json:56-63` (`citizenship_card`) and
  `ru.json:60-67`; inbox templates `citizenship_earned` at `en.json:88-91`. **Every string ships in
  both `en.json` and `ru.json` in the same change.** `tests/core/profile/CitizenshipCopy.test.ts:40,49`
  asserts inbox body copy contains the threshold string — any new copy that mentions `100` interacts
  with it.
- Analytics: any new event follows `Category:Action` via `flashistConstants.analyticEvents` and updates
  `ai-agents/knowledge-base/analytics-event-reference.md`.

## What to build

### Step 1 — Investigation (findings report, no code)

Write `ai-agents/knowledge-base/reports/YYYY-MM-DD-0253-tenure-xp-grant-findings.md`. It must answer,
with `file:line` evidence, not opinion:

1. **Signal reliability.** For each of the four signals in the table above: is it still written on the
   shipped `yandex-games_iframe.html` path (not just `index.html`)? Is `game-records` ever pruned or
   capped (if it grows unbounded, does anything trim it)? Do `gamesPlayed` and `game-records` count
   the same thing (joins vs. started matches vs. finished)? Does `daysPlayed` count a day with a lobby
   visit but no match?
2. **Storage survival in the real context.** The game runs inside the Yandex Games iframe. Confirm
   `localStorage` persists across Yandex sessions there (the shipped tab-persistence feature
   `geoconflict_active_tab` is a live probe of this) and note any browser storage-partitioning caveat
   (Safari / Chrome third-party iframe partitioning) that would make old-timers' evidence vanish.
   State plainly which share of old-timers can be expected to *have* any evidence at all.
3. **Evidence horizon per signal** — first *deployed* date, not source-commit date (the table above
   gives commit dates; find the prod deploy that carried each). This decides what "days played" can
   even mean for a player from 2025.
4. **Identity binding.** The evidence is per-device; the grant is per `yandex_player_id`. Enumerate the
   claim routes: (a) client → game server (WS) → `ProfileApiClient` → box, reusing `0217`'s path;
   (b) client → profile server directly (the client already reads `GET /v1/profile`; check whether an
   *authenticated write* route exists or whether [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md)
   is a prerequisite). For each: what identity the server can trust (`GameServer.getCreditableYandexId()`
   is the one trust funnel for credits).
5. **Abuse surface.** Local storage is forgeable in seconds. Enumerate what a forger gains (cap × 1)
   and what server-side plausibility checks are cheap: evidence timestamps in the future or before the
   fork's first deploy; claim window (only claimable within N days of the XP path going live, or only
   for evidence predating it); one claim per `yandex_player_id` ever. Say which are worth it against a
   ≤ 50 XP prize.
6. **Loss surface (ADR-101).** Trace what happens if the claim call fails: is the grant retried on next
   load, or lost? What must be true so the local "claimed" marker is only set after a server
   acknowledgement?
7. **Recording shape — options, costs, not a choice.** At least: (i) a synthetic `game_id` row in
   `player_match_xp_credits` (idempotency for free; misuses the column); (ii) a `source`/`kind`
   column or a separate `player_xp_grants` table with a `(yandex_player_id, kind)` unique key
   (migration `005`; honest ledger; more work). Note the wire contract needs a `reason` either way if
   the game server relays the claim.

### Step 2 — The rule, put to the owner (decision, no code)

From the findings, propose **one** rule with its main tradeoff, and put it to the owner via the lead
with these questions answered, each with the producer/coder recommendation marked:

- **A. Evidence signal.** Which key(s) drive the grant — `daysPlayed` (owner's framing, but only
  reaches back to ~May 2026), `game-records` (reaches back to the fork's launch), or a combination.
- **B. Rate and cap.** Owner's example: 1 XP per day played, cap 50 (= half of citizenship). Report
  what the cap means in matches (50 at 1 XP/match) and whether the rate/cap should be constants next
  to `XP_PER_MATCH` in `src/core/profile/Citizenship.ts`.
- **C. Eligibility and window.** Minimum tenure (the owner's "more than X days") · one grant per
  `yandex_player_id` for life · claim window (open-ended vs. N days after launch) · guests who log in
  later.
- **D. Recording.** Which option from step 1.7; whether the wire contract grows a `reason`.
- **E. The popup.** When it shows (only after server ack), what it says — draft copy in **en and ru**
  for the owner to approve, keyed under a new `citizenship_tenure_grant` section next to
  `citizenship_card`. Whether it is a modal or an inbox message (`player_messages` templates already
  exist — `inbox.templates.citizenship_earned`).
- **F. Analytics.** Whether the grant is measured (claimed / rejected / amount) — recommend yes.

**The owner rules. Record the ruling in the findings report, dated, with the channel.** If the ruling
is a standing constraint (it likely is — a free-grant policy), recommend the architect record an ADR.

### Step 3 — Implementation: NOT in this brief

⛔ **Deliberately not scoped here.** Its shape depends entirely on A–E. After the ruling the producer
files the implementation brief(s) — expected split in *Notes*. This brief's `## Status` never advances
past the decision.

## Verification steps

1. The findings report exists at the named path, and every claim in its step-1 answers carries a
   `file:line` citation that resolves at the commit it names.
2. Step 1.2 contains an **observed** result for localStorage survival in the Yandex iframe (not
   reasoning from the tab-persistence feature alone), or says plainly it could not be observed and why.
3. Step 1.3 gives a first-deployed date per signal, each traceable to a `DEPLOY prod` commit or
   marked *not determinable* with the reason.
4. Step 1.6 states, unambiguously, the sequence that makes the local "claimed" marker follow the server
   acknowledgement, and what happens on failure.
5. Step 2 questions A–F are each answered with a recommendation marked, and the owner's ruling on each
   is recorded with date and channel. An unanswered question is recorded as open, not silently defaulted.
6. Draft popup copy exists in **both** en and ru.
7. No source file, no `ai-agents/wiki-vault/` file, and no other task's files were changed by this
   task (`git status` shows only the report).

## Notes

- **Depends on:** nothing
- **Blocks:** the implementation brief(s) filed after the ruling (not yet filed).
- ⚠️ **Why "nothing" above, and what the dependency really is.** This brief is research + decision, and
  both can run now. The **grant itself** (the implementation this brief leads to) depends on
  [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) landing **and being
  deployed**; it cannot be live before that. It also sits on
  [`0017`](../0017-citizenship-earned/brief.md) (the threshold path it feeds) and may depend on
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) if the client-direct claim
  route is chosen (step 1.4). Those dependencies go on the implementation brief(s), not here — putting
  them on this row would show the research as blocked when it is not.
- **Expected implementation split after the ruling** (producer files these; each independently
  shippable and testable): (1) **server** — grant record + idempotency + endpoint or wire-contract
  `reason`, migration if needed, unit tests over the repository; (2) **client** — evidence read,
  claim call, server-ack-gated "claimed" marker, popup, en+ru strings, analytics event. If the chosen
  route is client → game server → box, a third small brief for the WS relay in `Worker.ts` /
  `GameServer.ts` is likely.
- **Timing the owner should weigh:** the popup lands best on the day the XP path first shows players a
  number. If the grant ships *after* launch, old-timers will already have seen `0 / 100` once — the
  grant still helps, but the "we remembered you" moment is weaker. This argues for finishing steps 1–2
  before `0217` deploys, not for gating `0217` on this.
- **Fairness edge the rule must decide, not the coder:** a player who cleared their browser data (or
  plays on a new device) has no evidence and gets nothing; a player who never logged into Yandex has
  evidence but no profile. Both are unfixable client-side; the rule should say so in the popup copy or
  accept them silently.
- No wiki writes here; `fkit-wiki` ingests the findings report and the ruling after close.
