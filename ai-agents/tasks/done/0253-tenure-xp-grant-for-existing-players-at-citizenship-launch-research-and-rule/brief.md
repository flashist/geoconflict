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
🔴 **Medium — LABEL RATIFIED BY THE OWNER 2026-09-22; value UNCHANGED** *(~~producer's LABEL only~~; **POSITION OWNER-RULED twice: 2026-09-13 and again 2026-09-22** — separate rulings, see below)*

### 🔴 LABEL RATIFIED BY THE OWNER — 2026-09-22 (a SEPARATE ruling from the POSITION ones)

⚠️ **AUTHORITY BEFORE FACTS.** **OWNER RULING given live in the `fkit lead` session via
`AskUserQuestion` on 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no
owner channel**. Shown that they had ruled **position** on this group twice and the **label** never —
so the *"NOT owner-ruled"* flag kept firing on the rows they read most often — the owner chose
**"Ratify as they stand."** Stated reason: **the values already match how they are treating the work —
core citizenship first — so this only clears the flag.**

⛔ **VALUE UNCHANGED — THIS IS A RATIFICATION, NOT A RE-RANK.** `Medium` was and remains `Medium`.

⚠️ **SEPARATE RULINGS, SEPARATE THINGS — a later reader must not read one as having decided the
other:**

| Ruling | When | What it settled | What it did NOT settle |
|---|---|---|---|
| **POSITION** — the row sits directly under `0217` | 2026-09-13 | where the row sits on the board | the label |
| **POSITION** — re-affirmed by the group move under `0217` | 2026-09-22, earlier | the group's order | the label |
| **LABEL** — *“Ratify as they stand”* | 2026-09-22, this one | the label is now **owner-ruled**, flag cleared | position; **and it moved no value** |

⚠️ **LABEL ONLY.** ⛔ **No `## Status` token was touched, no task file was moved between
`backlog/`, `done/` and `cancelled/`, and no mover skill was invoked.**


📌 **POSITION OWNER-RULED 2026-09-13, given live in the lead session and relayed through it: the row
sits directly below [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) on the
Sprint 4 board.** Read the authority before the outcome: this is an **owner ruling** lifting ADR-035's
append-only constraint for exactly this one row move (the owner cited the `0232`/`0231` precedent of
2026-09-07); it is **not producer precedent** for placing any other row. The board is label-ranked, so
the move renumbered nothing and touched no closed row. ⚠️ **The `Medium` LABEL is the producer's, not
the owner's** — the owner ruled position, not label. The producer keeps `Medium` deliberately although
the row now sits among `High` rows: the position says *when* (research and decision while `0217` is in
flight, so the rule is settled before old-timers first see `0 / 100`); the label says *what it is* — a
goodwill measure, not a launch gate, the citizenship launch works without it. **Medium and not Low**
because the cost of getting it wrong is public (angry long-time players on launch day) and the grant,
once shipped, is one-time and cannot be re-run. *(Superseded: the producer first filed this row
appended at the bottom with a merit note "directly below `0217`"; the owner accepted that merit
position as the ruling.)*

---

### 🔴 RANK OWNER-RULED 2026-09-22 — this is no longer an unratified append-rank

⚠️ **AUTHORITY BEFORE FACTS.** **OWNER RULING given live in the `fkit lead` session on 2026-09-22**,
relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**.
⛔ **Not producer precedent — one ruling, one set of rows.**

The owner was shown that **seven rows on the Sprint 4 board carried producer *append*-ranks the board
itself flags as *"not a merit ranking, not owner-ruled"*** — several of them, this one included,
noting *"on merit this belongs below `0217`"* — and ruled:

> **move `0272`, `0273`, `0266` and `0253` directly under `0217`.**

✅ **Applied to `ai-agents/sprints/plan-sprint-4.md` in the order the owner named:**
`0217` → **`0272`** → **`0273`** → **`0266`** → **`0253`**.
⇒ **This row's POSITION is now OWNER-RULED.** The struck flag above is kept, not deleted — it is the
true record of how this row was ranked until today.

⚠️ **RANK ONLY — the limits are the whole ruling.**
- ⛔ **No `## Status` token was touched, here or on any moved row.** A re-ranked row is not a started row.
- ⛔ **No task file was moved** between `backlog/`, `done/` or `cancelled/`; **no mover skill was invoked.**
- ⚠️ **The owner ruled POSITION, not LABEL.** `Medium` is still the **producer's** label and was **not** ratified.
- ⛔ This is an **owner ruling lifting ADR-035's append-only constraint** for exactly these four row
  moves (prior instances: `0253`'s move of 2026-09-13, the `0232`/`0231` precedent of 2026-09-07).
  The board is label-ranked, so nothing was renumbered; no other row moved and no closed row was touched.

**Placed 4th of the four moved rows.**

⚠️ **THIS ROW'S 2026-09-13 OWNER-RULED POSITION IS UNDISTURBED — it is still directly below `0217`'s
run.** What changed is that **three rows now sit between it and `0217`** (`0272`, `0273`, `0266`),
because the owner moved those three in above it. ⛔ **This is not a demotion** and the 2026-09-13
ruling was not overridden — it was **extended** by the same owner, on the same merit reasoning, to the
three tasks that gate this one. ⚠️ **`Medium` is still the producer's LABEL** and was not ratified on
either date; the reasoning above for keeping it stands unchanged.



## Status
✅ Done (agent-closed — not owner-verified) — **closed 2026-09-24 by a spawned `fkit-producer` (close step of `/fkit-sprint-ship-loop`, fkit-lead driver), no owner present (ADR-033 §5).** Built to the owner-approved `plan-redesign.md` (2026-09-24, incl. D1–D4 and the appended answers); stateful review round 3 `closed-out` (coverage: reasoning-only second opinion, normal under ADR-042); driver re-verify 2026-09-24 green (unit + integration incl. `TenureGrant.it`; `CITIZENSHIP_CARD_ENABLED` still `false`). ⚠️ **NOT verified in a browser or in production:** no Yandex login was exercised outside the iframe, and the claim route is not deployed. · earlier: 🔄 In progress — driven by `fkit-sprint-ship-loop` from 2026-09-24 (plan step). Earlier: 🚧 Blocked — no blocker remains: the profile-identity design landed and `0273` is code-complete (2026-09-23); the local redesign rework is ready to start. Marker left for the ship loop to set `🔄 In progress` · earlier: ~~rework paused pending the new profile-identity task's design (owner-ruled 2026-09-15)~~

📌 **STATUS SET 2026-09-15 on an OWNER RULING given live in a design discussion in the lead session and relayed by `fkit-lead`.** The new profile-identity task is [`0266`](../../done/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md) (Sprint 4). ⚠️ **The code built from the first plan (2026-09-14/15) is UNCOMMITTED in the working tree and will be REWORKED, not reverted yet** — do not delete it and do not ship it as is. 📌 **CORRECTION 2026-09-23 — the *"UNCOMMITTED in the working tree"* clause is STALE (kept, not deleted; it was true when written).** Verified read-only by `fkit-lead` on 2026-09-23 and relayed to a spawned `fkit-producer`: ~~the working tree is clean and the first-plan tenure code is **committed** — it is in `src/` (e.g. `src/profile-server/Routes.ts`, `src/profile-server/PlayerProfileRepository.ts`), first appearing in commit `332f520`.~~ 📌 **RE-CORRECTED 2026-09-24 — the sentence just struck was HALF WRONG (kept visible, not deleted).** What `src/` actually held were only the **seams** that `0270`/`0271`/`0274` built for this task: `hasXpGrant`, the login response's `grantChecks`, and the `tenureClaim` metric hook. The first-plan (v1) **claim code** never reached `src/`; it lived only in [`v1-tenure-grant-old-design.patch`](v1-tenure-grant-old-design.patch). The **redesign** code is now in `src/`, built 2026-09-24 to `plan-redesign.md`. Recorded by a spawned `fkit-producer` at the close step, on the driver's relay. ⛔ The rework-not-revert instruction is unchanged; only where the code lives changed. `## Status` marker untouched. *(Superseded status, kept, not deleted: ~~🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop), started 2026-09-14 · step 1 research only; build gated on the owner's ruling · 📌 **OWNER RULING 2026-09-14, given live in the lead session (`AskUserQuestion`) and relayed by `fkit-lead`: "Numbers first"** — the owner runs the GameAnalytics checks O1–O3 (days-played spread, new players per day, logged-in share; defined in `worklog.md` → *Owner steps*) **before** ruling rate, cap and eligibility. The step-2 ruling waits on those numbers. Status token unchanged~~)*


📌 **2026-09-23 — SPRINT 4 RESCOPE, OWNER RULINGS (Q1 = (a), Q6 = (a))**, given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021). ⛔ **Not producer precedent.**
- **This task STAYS in Sprint 4** as locally buildable work (the redesign rework). The profile-identity rows it sat with (`0217`, `0266`, `0272`, `0273`) moved to Sprint 5.
- **Q1 = (a), the option as put:** *"the token is set at the window regardless; `0253` only has to land before `0065`'s flip."* ⇒ **This task NO LONGER gates Saturday's `PROFILE_INTERNAL_TOKEN` set.** This **supersedes the 2026-09-14 `0217` go-live rule's inclusion of `0253`** (the *"Counts — must be done by the weekend deploy"* bucket in `0217`'s `## Priority`). The binding deadline is now **before [`0065`](../../backlog/0065-citizenship-paid-live-verification/brief.md)'s flip**. That fits the 2026-09-15 redesign (item 2): the claim runs only while the citizenship card is enabled.
- **Q6 = (a):** the 2026-09-22 sprint-plan **RULING A** reading-order group (`0217` → `0266` → `0272` → `0273` → `0253`) is **broken up**. This row stays on Sprint 4 alone, and today's rescope supersedes that order.
- ⚠️ **The `🚧 Blocked` reason above is STALE, and was NOT changed by this act.** It names *"the new profile-identity task's design"*, but that design is done, and the concrete dependency `0273` is code-complete (see Notes). **Setting `🔄 In progress` when the rework starts is a free planning act.**
- 🚨 **Sprint 4 closes AT THE DEPLOY** (owner ruling, Q7 = (b)). If this rework is unfinished then, it rolls to Sprint 5. Work in progress must sit **on a branch, out of the working tree, at runbook W12**, because `./build-deploy.sh prod` commits and ships the tree as it stands.
📌 **OWNER RULINGS AT PLAN APPROVAL, 2026-09-24** (live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel, ADR-021; ⛔ not producer precedent):
- **Q1:** the popup title and button **reuse the strings approved on 2026-09-14**.
- **Q2 (a deploy fact):** the claim route goes onto the profile box **with the next profile-box deploy, before [`0065`](../../backlog/0065-citizenship-paid-live-verification/brief.md)'s flip. No special hold.** Recorded in `0065`. ⚠️ Consequence: the owner-accepted claim-on-behalf risk (ADR-112 as amended) starts **when the route reaches the box**, not at the flip. Recorded in [`0268`](../../backlog/0268-remove-tenure-xp-claim-logic-after-60-days/brief.md), which closes it.

## Owner
fkit-coder

⚠️ **`fkit-coder`, with a hard research/decision gate before any build.** Step 1 (investigation) and
step 2 (the rule) are done and put to the owner **before** any implementation is planned. **The owner
decides the rule** — rate, cap, one-time-ness, evidence signal, abuse posture, popup copy. The coder
may consult `fkit-architect` on the recording shape (step 2, question D). **Implementation IS in this
brief — step 3 — and starts only on the step-2 owner ruling.** 📌 **OWNER-RULED 2026-09-13, given
live in the lead session and relayed through it:** research + decision + implementation stay in **one**
brief; **no separate implementation briefs are filed later.** *(Superseded by that ruling: the
producer's first filing scoped research + decision only and left implementation to later briefs, on
the investigation-first rule. The ruling keeps the gate — nothing is built before the owner rules —
and folds the build in.)* This brief closes when the grant is built, verified and reviewed per the
ruling; the step-1 report and the recorded ruling are its intermediate deliverables.

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
- Sits on the earned-citizenship track: [`0017`](../../done/0017-citizenship-earned/brief.md) (threshold →
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
   *authenticated write* route exists or whether [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md)
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

### Step 3 — Implementation (gated: starts only on the step-2 owner ruling)

📌 **In this brief by owner ruling, 2026-09-13** (see *Owner*). ⛔ **Not a line of it before the owner
has ruled on A–F** — the shape below is a work breakdown for the plan, not a design; the coder's
`/fkit-plan-task` plan, written after the ruling, decides *how*, and that plan goes to the owner for
approval like any other.

Work breakdown — each unit is built and tested on its own, in this order:

1. **Server — the grant record.** Per ruling D: the idempotent one-per-`yandex_player_id` record
   (migration if a new table/column is chosen), the write path (extend `creditMatchXp`'s transaction or
   a sibling), and the citizenship-threshold check firing in the same transaction as today
   (`GRANT_CITIZENSHIP_SQL`). Constants (rate, cap, minimum tenure) live beside `XP_PER_MATCH` in
   `src/core/profile/Citizenship.ts`. Unit tests over the repository: first claim credits and is
   capped; second claim for the same player is a no-op with a `duplicate`-style status; implausible
   evidence (per ruling C / step 1.5) is rejected.
2. **Transport — the claim path.** Per ruling on step 1.4: either the wire contract grows a `reason`
   (`CreditContract.ts`) and the game server relays the claim through `ProfileApiClient`, or an
   authenticated client → profile-server route. Identity through the one trust funnel
   (`GameServer.getCreditableYandexId()` or its equivalent on the direct route). Fail-soft per ADR-101,
   **but** the client must retry on next load until acknowledged — see 3.
3. **Client — evidence, claim, marker, popup.** Read the ruled signal(s) from `localStorage`; send the
   claim; set the local "claimed" marker **only after the server acknowledges**; show the popup once, on
   acknowledgement, keyed under a new `citizenship_tenure_grant` section in **both** `en.json` and
   `ru.json` in the same change; if the ruling picks the inbox instead, use the `player_messages`
   template path. Analytics event(s) per ruling F, via `flashistConstants.analyticEvents`, and the
   reference doc updated. Both HTML templates (`index.html`, `yandex-games_iframe.html`) if a new
   element is added.
4. **Kill switch.** The popup and claim sit behind the existing client citizenship gate
   (`CITIZENSHIP_CARD_ENABLED` / `citizenship_ui`, `0236`) so a broken grant can be switched off with
   the rest of the surface.

**Go-live constraint, not a build constraint:** the grant cannot reach players before `0217` lands and
is deployed. Build and test locally against the profile server + Postgres like `0017` did.

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
7. **Gate proof:** no source file changed before the step-2 ruling is recorded (worklog shows the ruling
   entry dated before the first source edit). No `ai-agents/wiki-vault/` file and no other task's files
   changed by this task at any step.
8. **Idempotency:** with the profile server + Postgres up locally, a claim for a test
   `yandex_player_id` credits exactly the ruled amount (capped); an identical second claim credits
   nothing and returns the duplicate status; `player_profiles.xp` equals the sum of match credits plus
   one grant. Unit tests cover all three.
9. **Ack-before-marker:** with the profile server stopped, the client's claim fails, the local "claimed"
   marker is **not** set, no popup shows; on the next load with the server up, the claim succeeds, the
   marker is set, the popup shows once; a further reload shows nothing.
10. **Plausibility:** a forged `localStorage` value (timestamp in the future, or before the fork's first
    deploy, or a count above the cap) yields at most the cap, or a rejection, per ruling C — tested.
11. **Localization:** every new key exists in both `en.json` and `ru.json`; `npm test` passes, including
    `tests/core/profile/CitizenshipCopy.test.ts`.
12. **Guest path:** a session without Yandex auth sends no claim and shows no popup; the same device after
    Yandex login claims once (if ruling C allows late claims).
13. **Kill switch:** with the citizenship surface gated off, no claim is sent and no popup shows.
14. **Not live early:** the grant is documented in the worklog as unreachable in production until `0217`
    is deployed; nothing here changes `0217`'s scope.

## Notes

- **Depends on:** [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) — profile identity **S4** (client login session + Bearer token), the last link of `0270` → `0271` → `0273` (updated 2026-09-15 when epic [`0266`](../../done/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md) was split into slices on owner rulings relayed by `fkit-lead`). 📌 **2026-09-23: `0273` is CODE-COMPLETE** (built + reviewed 2026-09-16, *"No code"* left). It moved to Sprint 5 for its **live check only**, so this dependency is **satisfied for the local rework**; only `0273`'s production proof is outstanding.
- 🚨 **Serialization, same files:** this brief's rework (route + client logic) runs **after `0273`**. [`0270`](../../done/0270-profile-identity-s1-database-and-rekeying/brief.md) (S1) **absorbs** this brief's uncommitted schema + repository code (the grant table moves into migration `006`; the untracked `005` is deleted) — **S1 must never run concurrently with any work on this brief's code.** Rework shape per design §7: claim waits for the login reply and reads `grantChecks.tenure`; caller from `resolveCaller` (token); `tenureGrantLimiter` removed; every checked claim writes a row (`xp_awarded` 0…50).
- *(Superseded dependency line, kept: ~~Depends on: `0266` — profile identity (owner-ruled 2026-09-15)~~ — `0266` is now the epic; the concrete gate is its slice `0273`.)*
- **Blocks:** [`0268`](../../backlog/0268-remove-tenure-xp-claim-logic-after-60-days/brief.md) (removal ~60 days after release) — the implementation itself is inside this brief (owner ruling 2026-09-13).
- *(Superseded dependency lines, kept: ~~Depends on: nothing~~ · ~~Blocks: nothing~~ — changed 2026-09-15 by the redesign ruling below. The "Why nothing above" bullet that follows is **history**: this brief now has a real build dependency on `0266`.)*
- ⚠️ **Why "nothing" above, and what the dependency really is.** Steps 1–2 can run now, and step 3 can
  be **built and tested locally** now. What cannot happen is the grant reaching players: that waits on
  [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) landing **and being
  deployed** — a go-live gate, not a build blocker. The build also sits on
  [`0017`](../../done/0017-citizenship-earned/brief.md) (the threshold path it feeds) and may need
  [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) if the client-direct claim
  route is chosen (step 1.4) — if the ruling picks that route and `0250` is not done, set this brief's
  status to `🚧 Blocked — 0250` at that point rather than building around it. Declaring `0217` as a
  dependency here would show the research as blocked when it is not.
- **Owner rulings recorded 2026-09-13** (given live in the lead session, relayed through it): (1)
  research + decision + implementation in one brief, no later implementation briefs — superseding the
  producer's research-only filing; (2) board position directly below `0217`, an owner ruling lifting
  ADR-035's append-only constraint for this one row (precedent cited: `0232`/`0231`, 2026-09-07), not
  producer precedent; the `Medium` label stays the producer's.
- **Owner ruling recorded 2026-09-14** (given live in the lead session via `AskUserQuestion`, relayed by
  `fkit-lead`): **"Numbers first"** — the owner runs GameAnalytics checks **O1–O3** (days-played
  spread, new players per day, logged-in share; the coder's worklog defines them under *Owner steps*)
  before ruling step 2's rate, cap and eligibility. Until those numbers are in, step 2 is not ruled
  and step 3 does not start.
- **Work breakdown** is in step 3 — an internal breakdown for the coder's plan, **not** a list of
  briefs to file.
- **Timing the owner should weigh:** the popup lands best on the day the XP path first shows players a
  number. If the grant ships *after* launch, old-timers will already have seen `0 / 100` once — the
  grant still helps, but the "we remembered you" moment is weaker. This argues for finishing steps 1–2
  before `0217` deploys, not for gating `0217` on this.
- **Fairness edge the rule must decide, not the coder:** a player who cleared their browser data (or
  plays on a new device) has no evidence and gets nothing; a player who never logged into Yandex has
  evidence but no profile. Both are unfixable client-side; the rule should say so in the popup copy or
  accept them silently.
- 📌 **REDESIGN — OWNER RULINGS 2026-09-15**, given live in a design discussion in the lead session and
  relayed by `fkit-lead`. **Read the authority before the outcome: the owner designed this flow; the
  lead confirmed it back; the producer only records it.** It **supersedes** the parts of the
  2026-09-14 rulings (ADR-112 Part 1) named under *Removed*. Where this block and anything above
  disagree, **this block wins**.
  1. **Login on every load.** Game loads; if the player is logged in to Yandex, the client sends a
     **login request on every load — NOT behind the citizenship card switch** — to the profile server,
     which finds or creates the profile (identity = platform + platform id, per `0266`). The id is
     **trusted for now**.
  2. **Claim only if the citizenship card is enabled** and the login reply says the tenure check has
     not happened. The claim carries days played and is **always sent, even if under 3**. The claim
     **waits for the login reply** (sequential — no race, the profile always exists).
  3. **Server rule:** days = **max(daysPlayed, distinct `game-records` days)**; **1 XP per day, cap 50,
     minimum 3**; the server records "checked" **either way**; the check is **final and never repeats**
     — a 1–2-day player never gets the grant later.
  4. **Popup** — one-time, only if granted, shows **only XP, no day count**. **Approved copy (owner):**
     EN *"Thank you for playing Geoconflict! As a thank-you for being with us for so long, we're giving
     you {xp} free XP. You now have {total} / {threshold} XP."* · RU *"Спасибо, что играете в
     Geoconflict! В благодарность за то, что вы с нами так давно, мы дарим вам {xp} XP. Теперь у вас
     {total} / {threshold} XP."*
  5. **Removed:** the 90-day claim window · the one-claim-per-device rule (the rule is now **1 profile =
     1 claim, server-enforced**) · all client date checks and the client snapshot · the "≥ 1 credited
     match" rule · **the per-IP rate limit on the new login and claim routes** — replaced by
     **monitoring** (e.g. Uptrace) so problems are visible. Owner's reasoning: once the claim logic is
     removed (`0268`) the fake-id claim attack is impossible. ⚠️ **Accepted, monitored risk:** the lead
     noted the login route keeps creating profiles for as long as it exists, so without a limit junk
     profile rows can pile up; the owner accepted that in favour of monitoring.
  6. **Timing:** XP go-live may slip past this weekend (owner: *"it's ok"*; may even skip the next
     weekend slot). The game deploy still happens with the XP token blank.
  - **Consequences recorded:** this brief now **depends on `0266`**; **ADR-112 needs amending**
    (architect — not done by this filing); the step-3 work breakdown, verification steps 9, 10, 12 and
    the claim-window/per-device/≥ 1-match text above are **superseded where they conflict** and are to
    be rewritten in the coder's redesign plan, not deleted here.
  - **Follow-ups filed the same day:** [`0266`](../../done/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)
    (Sprint 4, blocks this) · [`0267`](../../backlog/0267-investigate-verifying-platform-player-identity/brief.md)
    (Backlog — verify the platform identity) · [`0268`](../../backlog/0268-remove-tenure-xp-claim-logic-after-60-days/brief.md)
    (Backlog — remove the claim ~60 days after release) · [`0269`](../../backlog/0269-startup-crash-when-browser-storage-blocked/brief.md)
    (Backlog — review R4's pre-existing boot throw, owner: *"Fix comment + file task"*).
- No wiki writes here; `fkit-wiki` ingests the findings report and the ruling after close.
