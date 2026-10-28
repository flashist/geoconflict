# 0234 — Leaderboard Core System (Task 7): findings and decomposition proposal

> ## ✅ FINAL — all owner rulings in (2026-10-28)
>
> ~~🟡 DRAFT — pending owner rulings on: placement protection design (§4.4), matches with no independent witness (§4.5),
> render surface (§6), experiments flag (§6)~~ — all four ruled 2026-10-28 (§1.7). **No owner question remains for
> this investigation.** Three vote-design choices are left open for the S0 ADR, which the owner signs (§12).
>
> **Decided (owner):** rank value, not XP · monthly + all-time boards · run alongside the Yandex board · citizens only,
> multiplayer only, no cap · anti-farm rules deferred · abuse analytics required (server-side metrics + DB rows) ·
> place protected by the backend through **witness votes**, with a knowing exception: a match nobody else can confirm
> **trusts the client's place in v1** · teams: no exception · **AI lobby players (`AiPlayer`) count in v1** — owner
> pick *"Include AI now"* (§1.5a) · own window + profile line · ship to all + off switch. See §1.
> **Revised after review round 1** (`review.md` R1–R12, 2026-10-28) — see §11.
> The decomposition in §10 is **final, for the producer to brief**. ⛔ Briefs are filed separately via
> `/fkit-task-brief`; this document files none.

**Task:** [`0234`](../../tasks/done/0234-leaderboard-core-system-definition/brief.md)
· **Written:** 2026-10-28 by a spawned `fkit-producer` (`fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 9; owner
chose to include `0234` in this run — *"Code tasks + 0234"*, relayed). **Revised the same day** with the owner's rulings
(two batches) — see §11 for what changed. **Final** as of 2026-10-28.
· **Architect consulted:** yes, four times — `fkit-architect`, hop 2 of 2. Round 1: Q5 store, the technical half of Q6,
feed/replace, effort. Round 2 (after the rulings): what the server knows about standings today, server-protected
placement options, storage for rank value, the paid-status leak, abuse analytics, effort; then humans-vs-AI, teams and
place-at-death; last, reuse of the hash-vote path and the Uptrace metric set. Its findings are marked **[arch]**.

**Labels.** **[code]** read in the repo, `path:line`. **[arch]** established by the architect (it read the code;
`path:line` where load-bearing). **[EST]** estimate. **[MEM]** from memory, must be confirmed. 🔒 No connection strings,
hosts, keys or player ids appear here.

**Provenance of rulings.** All owner rulings below were given 2026-10-28, live via `AskUserQuestion` / typed text in the
`fkit-lead` Claude Code session, relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel
(ADR-021/037) — the include-AI pick (§1.5a) to a spawned `fkit-coder` (Process-review) instead; ⛔ not producer
precedent. Typos are kept as relayed.

---

## 0. Summary (plain words)

- **What ranks a player:** a per-match **rank value** = *players in the match − the player's place + 1*. First out gets
  1; the top gets N. **Not XP.** No placement bonus in v1. **v1 counts humans and AI lobby players (`AiPlayer`) — the
  players a real player cannot tell from humans — in both N and the place** (§1.5a; owner ruling *"Include AI now"*).
  Bots and nations are left out.
- **Boards:** a **monthly** board and an **all-time** board; each month's top 3 is frozen and kept (for badges later).
- **Who earns it:** citizens only, multiplayer only; teams ranked individually.
- **Trust:** the owner ruled the place **must be protected by the backend**. Today the server knows **almost nothing**
  about standings (§3). Chosen (owner): **"witness votes"** — every client reports each elimination of a counted player
  (human or `AiPlayer`) it sees, and the server accepts one when **at least half** of the distinct IPs agree (the rule
  the winner vote already uses — not a strict majority; the threshold is open for S0, §4.3, §12). The server then
  computes the place itself — **owner
  picked this** (§1.7). Still not protected: anyone holding half or more of a match's distinct IPs — **including either
  player of any 2-IP match** — or one person with 2+ IPs. **A match with no independent witness (one human, or every
  player on one IP) trusts the client's place in v1** — an owner-ruled exception, watched by server-side metrics
  (§4.5, §7); with AI counted, such a public-lobby match is worth up to 10.
- **Paid-citizenship leak:** **does not occur** in the new design, under three conditions (§5). No 2026-09-27 rule needs
  relaxing.
- **Effort:** **≈ 13–17 dev days, about 3–4 weeks with review [arch EST]** (reusing the hash-vote message path saves
  ~1–1.5 days). plan-index's "1–2 weeks" does **not** hold.

---

## 1. Decisions (owner rulings, 2026-10-28)

### 1.1 Q1 — Ranking metric → ✅ **DECIDED: rank value, not XP**

Owner, typed, verbatim:

> *"I don't think leaderboard should be based on XP. I think it should be based on another "rank value", we can think of
> it as "[amount of real players] - [place in the match's rating at the moment of death or end of match] + 1). Plus one is
> needed to make sure that even the player who died first gets some "rank" value, and also the 1st player this way would
> get the scores equal to the amount of real human players in the match. I am also thinking about giving some bonus for
> the 1st place (maybe actually for the first 3 places, I don't know yet, can be +10, +5, +2 or sth like that, but +2
> looks kind of lame and small, so maybe the last 2 players +10, +5). What do you think? I am actually not sure about bonus
> points for the 1st-2nd place, so the first iteration might be without it, to keep it simple,"*

After `fkit-lead` answered his question in chat, the owner confirmed with a typed *"ok"*: **rank value = real human
players − place + 1, no placement bonus in v1.**

⇒ **Rank value per match = N − place + 1**, ~~N = real humans in the match, place = the player's position among those
humans~~ — **v1: N = humans + `AiPlayer` lobby fillers, place = position among those same players** (owner relaxed
humans-only the same day, then picked include-AI explicitly; §1.5a). **Placement bonus (+10 / +5): deferred to v2**, owner undecided.
⇒ Producer's answer to *"What do you think?"* (recorded for the v2 talk, not a ruling): the bonus is worth deferring —
until the place is trustworthy (§4), a bonus multiplies the gain from a forged 1st place.

### 1.2 Q2 + Q3 — Boards and reset → ✅ **DECIDED: monthly + all-time**

Owner, typed, verbatim: *"I want monthly + all-time and I don't understand how it's gonna leak paid data."* Confirmed
with *"ok"* after the lead's explanation: **a monthly board plus an all-time board.**

⇒ **Two boards.** Monthly resets on the 1st; each month's **top 3 is frozen and kept forever** (snapshot). The leak
question is answered in §5: **with rank value instead of XP, there is no leak.**
⇒ Month boundary: **Moscow time** — producer default (the audience is Russian); technically either works [arch].

### 1.3 Replace / alongside / feed the Yandex board → ✅ **DECIDED: run alongside**

Owner picked: **"Run alongside (Recommended)"** — option text: *"players see ours in the game. Yandex's board keeps
running as it does now. 0209 and 0210 stay as filed (0210 still closes a live way to farm points). Decide whether to
retire Yandex's board once ours is live and used."*

⇒ **Reconciled with `0209` and `0210` by name:**
[`0209`](../../tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md) (placement value is the
literal `1`; today reaches only a debug log) and
[`0210`](../../tasks/backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) (Singleplayer awards
first-place points to a loser; farmable; ruled "Singleplayer reports nothing") **stay as filed on the Backlog board**.
They fix the Yandex board; this task builds ours; neither closes the other. Retiring the Yandex board is a later
decision, on evidence. **Knock-on: none (checked)** — no task moves, no `Depends on:` changes.
⇒ Facts behind it: the Yandex board is written only from the client SDK [code `FlashistFacade.ts:3071-3097`]; **[MEM,
arch]** Yandex has no server-side leaderboard write — to be confirmed in the Yandex docs. So the Yandex board can
never be made trustworthy, whatever we build.

### 1.4 Q6 — Which matches count, abuse posture → ✅ **DECIDED, then narrowed for placement**

Owner, typed, verbatim:

> *"The feature will be available for the citizens only and only for multiplayer matches, no cap at all, anti-farm/cheat
> is a good thing to have, but I am not sure if we have anything right now that can help us to implement it in a
> full-scale, so the 1st iteration might be without those things, but we should make sure we have enough analytics to
> find out if smb abuses that post-factum, to understand how urgent do we need thos feature."*

Then, replying to the lead's guess that placement is decided in the client, verbatim:

> *"are you sure there is no logic connected to it on the server-side. On the client side players can see the
> "leaderboard" of the ranks of the users, I believe the users are "ranked" by the percentage of the land they own. We
> can't leave this thing on the client-side only, we definitely need it to be "protected" behind backend."*

⇒ **Citizens only** (accrual and board). **Multiplayer only.** **No cap.** **Anti-farm rules** (minimum match time,
rate cap, verified-only) **deferred to after v1**, decided from the analytics.
⇒ **Abuse analytics are required in v1** (§7).
⇒ **Narrowing, by the second quote: the PLACE must be server-protected in v1** — v1 may not rely only on what one client
reports. That is a v1 requirement, not a deferred anti-cheat rule. **How:** witness votes (§1.7 #1, §4.4), with the
owner-ruled no-witness exception (§1.7 #2, §4.5).

### 1.5 Who counts, and team modes → ✅ **DECIDED**

Owner, typed, verbatim:

> *"it's a good question: but first of all ONLY REAL HUMAN PLAYERS COUNT, not AI players, I am even thinking that only
> citizen-players shoud count (but we can leave it for the v2, if we decide it to implement). Regarding teams - I think
> there is no exception here, the team mode also shows the "ranks" of the players regardless of their team, based on the
> amount of territory they own, so doesn't matter what is your team, whether your team won or lost, you get rank points
> based on your overall rank position in the match."*

⇒ ~~**Only real humans count** — AI players (`PlayerType.AiPlayer`, the lobby fillers players see as real), bots and
nations are excluded **from N and from the place order**. Place = position **among humans only** (non-humans are
dropped from the order).~~ **Relaxed for v1 the same day — see below.**
⇒ **Teams: no exception.** Place = the player's **individual** position across the whole match, whichever team won.
⇒ **v2 candidate, not v1:** count only **citizen** players in N / place (§9). Cheap later: the start roster already
carries the citizen flag (`GameServer.ts:664`) [arch EST ~0.5 day].

**Relaxed later on 2026-10-28.** Replying to the lead's relay of *"Only real humans count. AI players don't count toward
the number of players or toward anyone's place."*, the owner typed, verbatim:

> *"if it's easier, for the 1st version we can count AI Players too (it actually might be a more correct decision,
> because real players don't know whether it's an AI player or a player who plays anonymously)"*

⇒ At this point either was owner-acceptable for v1, on a condition (*"if it's easier"*). Both cost the same (§1.5a
reason 1), so the condition did not settle it — **the owner then picked include-AI explicitly, knowing its trust cost
(§1.5a).**

**What "AI players" means in this codebase** — four player kinds (`src/core/game/Game.ts:347-352`):

| Kind | What it is | In the in-match "Players Only" list? | Does the server know it? |
|---|---|---|---|
| `Human` | a connected client | yes | yes — start roster (`GameServer.ts:656-664`) |
| `AiPlayer` | the AI **lobby fillers**, with real client ids, that look like players | **yes** (`Leaderboard.ts:96-101`) | **yes** — listed separately in the start roster (`GameServer.ts:666-668`) |
| `Bot` | simple map bots | no | **no** — exist only in the simulation |
| `FakeHuman` | **nations** | no | **no** — exist only in the simulation |

⚠️ For `fkit-lead`: the codebase **separates** these. "AI players" in the owner's sense — players a real player cannot
tell from a human — are the **`AiPlayer` fillers**, not bots or nations. Bots and nations are unknown to the server.
⚠️ They **are** on the in-match list by default: "Players Only" is an opt-in checkbox, **off by default**
(`Leaderboard.ts:64` `_showRealPlayersOnly = false`; the filter runs only when ticked, `:96-101`), so the default list
ranks every alive player of every kind (`:94, 125`). The table's third column describes the list with the box ticked.

### 1.5a v1: **count humans + `AiPlayer`; exclude bots and nations** → ✅ **DECIDED (owner)**

Owner ruling, 2026-10-28, via `AskUserQuestion` in the `fkit-lead` Claude Code session, relayed verbatim by `fkit-lead`
to a spawned `fkit-coder` (Process-review). Question, verbatim: *"Count AI lobby fillers in v1, knowing a 1-human
unconfirmable match can then be worth up to 10?"* Picked, verbatim: **"Include AI now"** — *"Lock it: AI fillers count.
Matches what players see; a lone cheater can claim up to 10/match."*
⇒ Not a producer choice any more. The facts below were gathered by the producer on the architect's findings before that
pick, and were corrected after review round 1.

**Then defined by the "Players only" filter → ✅ DECIDED (owner).** Owner, typed in reply to `AskUserQuestion` in the
`fkit-lead` Claude Code session, 2026-10-28, relayed verbatim by `fkit-lead` to a spawned `fkit-coder` (Process-review),
answering the lead's correction that the in-game list also shows bots and nations:

> *"we already have the checkbox in leaderboards in the match that only shows PLAYERS ONLY (or something like that) -
> that basically gives us the way to "filter" only the players that we care about. We should use this "filtered" list
> of leaderboard entities for ranks."*

⇒ **The population that counts for rank value (N and the place order) is the set of player kinds the in-match
leaderboard's "Players only" filter shows** (`leaderboard.real_players_only`, "Players only" / "Только игроки").
[code] That filter keeps exactly `PlayerType.Human` and `PlayerType.AiPlayer` (`Leaderboard.ts:96-101`; the count
beside the checkbox uses the same two kinds, `:205-212`). **So it is the same set as "Include AI now"** — humans +
`AiPlayer`, bots and nations out; the two rulings agree. One difference in *time*, not in kind: the list shows only
players still alive (`:125`), while N also counts those already eliminated — the filter defines *who* counts, the
spawn rule below defines *how many*.

- **Formula, kept consistent:** **N = spawned humans + the `AiPlayer`s on the start roster**; **place = the player's
  position among those same players**; rank value = N − place + 1, so it is always between 1 and N and never zero or
  below. Bots and nations are left out of **both** N and the place order.
  - Humans: the server sees each human's own `spawn` intent first-hand (`GameServer.ts:880-888`).
  - `AiPlayer`s: the server writes them onto the start roster (`GameServer.ts:666-669`), but they spawn **inside each
    client's simulation** (`GameRunner.ts:70-77, 149-154`) — the server never sees an `AiPlayer` spawn. Counting only
    *spawned* `AiPlayer`s would therefore rest on client-reported (witnessed) data; open for S0 (§12).
- **Why this version:**
  1. **Same cost as humans-only.** Both counts come from the server-authored start roster (with the spawn caveat
     above); the witness votes and the end-of-match standings vote cover `AiPlayer`s exactly as they cover humans
     (every client sees them in its own simulation) [arch]. No extra slice.
  2. **What players see under "Players only"** — a player cannot tell an `AiPlayer` from an anonymous human, the
     owner's "more correct" point, and the rank population is exactly the "Players only" view (owner, above). The
     *default* list (box unticked) also ranks bots and nations (§1.5 note), so a position read off it can differ.
     **Note for S5 — does the "Players only" position equal the rank place?** **Only at match end**, and only with
     "Players only" ticked and the list sorted by territory:
     - **Match end:** with the box ticked and the list sorted by **territory** (the default sort), a survivor's
       position #k is the place rank value uses (eliminated players are all below the survivors). Re-sorting by gold
       or troops (`Leaderboard.ts:80-114`) breaks this; the "top 5" view (`:126-128`) only hides rows.
     - **Elimination — they differ.** The list sorts alive players by tiles (`Leaderboard.ts:117-118, 125`), so the
       position a player held just before dying is their **territory** rank. The place at death is **death order**
       (owner ruling, §1.6): how many counted players are still alive, the dying player included. The two agree only
       when the dying player was the smallest counted player left. A player under 100 tiles is conquered in one step
       (`AttackExecution.ts:343-345`), so a mid-list player can drop straight off the list and get a lower place than
       the position they last saw.
     - **Timing:** the list redraws every 10 ticks (`:75-77`); witness reports ride the hash message, ≤ ~0.67 s late
       (§10 design note), and a death's place is fixed by its **tick**, not by when the vote completes — a brief lag
       between list and confirmed place, not a different order. The end standings vote is one snapshot; the list keeps
       moving until the match ends.
     - **Ties** (same-tick deaths, equal tiles): the list shows tied players in some arbitrary order; rank value gives
       them a shared value (§1.6) — so tied players see different #k but get the same value.
     - **No-witness matches** (§4.5) record the client's claim.
     The S5 window may promise only this: **at match end, with "Players only" ticked and sorted by territory, a
     survivor's list position is their place.** It must not suggest the list position before death is kept, and must
     not promise an exact match in ties.
  3. **Bots and nations would be harder, not easier:** the server never sees them, so counting them would need new
     client-reported data.
- **What it costs in trust** [arch; bound corrected]: in a public lobby of **one human + up to 9 AI fillers** the match
  is worth **up to 10**, and the lone human is the **only witness** — unwitnessed and forgeable. The bound:
  `targetTotalByTimeout: 10` is the **total** player count, and the server adds
  `min(maxAiAllowedNow, requiredTotal − humans)` AI (`GameServer.ts:719-744`; values `DefaultConfig.ts:251-263`, which
  ships `enabled: false`; production turns AI fill on in `ProdConfig.ts:12-17`). Under humans-only that match was always
  worth 1. **So the rule for matches with no independent witness (§4.5) now matters a lot more.**

### 1.6 What "place" means (death order: owner ruling; the rest: producer reading — flag if wrong)

- **A player who dies → ✅ DECIDED (owner): death order.** Owner ruling, 2026-10-28, via `AskUserQuestion` in the
  `fkit-lead` Claude Code session, relayed verbatim by `fkit-lead` to a spawned `fkit-coder` (Process-review).
  Question, verbatim: *"Is "place at death" = death order (how many players are still alive when you die)?"* Picked,
  verbatim: **"Yes, death order (Recommended)"** — *"Die when 3 of 10 are still alive (you included) → place 3.
  Survivors are placed by territory at match end."*
  ⇒ **Place at death = the number of counted players still alive at that moment, the dying player included**; rank
  value = N − place + 1 = **1 + the number of counted players eliminated before them**. First out = 1. This is **not**
  the position the player last held on the in-match list, which is a territory rank (§1.5a, Note for S5). It rests on
  the code facts: the list shows only players still alive (`Leaderboard.ts:125`) and a player with 0 tiles is not
  alive (`PlayerImpl.ts:342-344`, `isAlive()` is `_tiles.size > 0`) [arch]. Settled — no longer for the S0 ADR to
  confirm. (The other reading — territory rank some time before death — would let a big player wiped out suddenly
  keep a high rank, contradicts "first to die gets 1", and costs +2–3 days of periodic votes [arch]. Not taken.)
- **Players alive at match end** (or at a stall with no declarable winner): ordered **by territory**, among counted
  players. The top one gets N.
- **The end-of-match standings vote is required in every mode** [arch]: in Teams the winner vote names a team, not a
  player, and in FFA the declared winner can be an AI (ADR-110), so the winner vote cannot supply 1st place.
- **Ties** (same-tick deaths, equal tiles at the end): **share the same value** — producer default, for the S0 ADR.
  The ADR must pin it exactly, so the place function is testable: which value tied players share (the higher or the
  lower), whether later places skip (1, 1, 3 or 1, 1, 2), and what two equal top survivors get (both N, or not).
- **A human who disconnects** stays in the simulation until conquered; witnesses can still confirm their elimination,
  so they **count in N and get a result** — producer default (differs from XP's connected-at-credit gate).

### 1.7 Final rulings (2026-10-28, second batch)

**#1 — How the server protects the place → ✅ Witness votes.** The owner first typed, verbatim: *"I might be wrong, but I
thought that there already some sort of the "voting" mechanism in the way the game "runs" on the server? I thought ther
eis something like 51% of clients report the state of the game and it's taken by the server as a real state of the
game. Was I wrong thinking that we have it?"* `fkit-lead` answered in chat: yes, the state-hash majority vote exists,
but a hash cannot be read back into standings; witness votes apply the same idea to readable data, possibly reusing the
existing vote path. Re-asked, he picked **"Witness votes (Recommended)"**.
⇒ **B2 in v1** (§4.3). The architect confirms most of the hash-vote **reporting path** can be reused; the tally itself
must be new — design note for S2 in §10.

**#2 — A match nobody else can confirm → ✅ trust the client in v1, measure it.** Owner, typed, verbatim: *"For the 1st
version trust it anyway, but let's make sure we have enough analytics / metrics (either in GameAnalytics or in Uptrace)
to check it after some time after deploy."*
⇒ **In v1, a match with no independent witness** (one human with the rest AI, or every player behind one connection)
**counts the place the client reports.** ⚠️ **This is a knowing, owner-ruled exception to his "protected behind
backend" requirement (§1.4), for the no-witness case only.** Every witnessed match stays server-protected.
⇒ **These matches must be countable and reviewable after deploy** — server-side OTEL metrics in Uptrace plus the DB
result row (§7). GameAnalytics is not used for this (§7 says why).

**#3 — Where players see it → ✅ "Own window + profile (Recommended)".** A Leaderboard button on the start screen opens
its own window with Monthly and All-time tabs; the profile card shows "your rank". Non-citizens see the board with a
"become a citizen to join" prompt.

**#4 — Rollout → ✅ "All + off switch (Recommended)".** No A/B test. Everyone gets it, with a quick switch that hides
the board (the backend keeps recording). The plan-index `✅ Test` flag is **replaced**.

---

## 2. Scope and cadence facts for the `0482` badge talk

- **Is there a monthly reset?** **Yes** — on the 1st of each month (Moscow time); each month's top 3 frozen and kept.
- **One board, or both all-time and monthly?** **Both** (owner ruling §1.2).

⇒ **Both badge candidates are possible:** the **two-badge** proposal ("Top 10 now" + "Month Top 3" trophy) and the
**original three tiers** (needs both boards — now present). The producer's earlier argument against the all-time top-3
icon (*"on a points-for-playing board it would stay forever with whoever plays most"*) still partly holds — rank value
also grows with the number of matches — but placement now matters too. The choice stays with the future badge build
brief; the badge build stays **parked until the leaderboard is live and used** (`0482` batch 1, answer 2).

---

## 3. What the game server knows today (the owner's question) [arch, verified in code]

### 3.1 The in-match leaderboard — client only

- Default sort: **tiles, descending**, shown as **% of land** (tiles ÷ (land − fallout))
  [arch `src/client/graphics/layers/Leaderboard.ts:58, 117-118, 122-123, 340-341`]. **The owner is right:** the default
  ranking is % of land owned.
- Players can re-sort by gold or troops (`Leaderboard.ts:80-114`).
- Its "Players Only" filter — an opt-in checkbox, **off by default** (`Leaderboard.ts:64`) — keeps **Human and
  AiPlayer** (`Leaderboard.ts:96-101`). By default the list shows every alive player, bots and nations included.
  Players see AI fillers as players; v1 counts them in rank value (owner, §1.5a).

### 3.2 The game server, item by item

| What | Server knows it? | Trustworthy? |
|---|---|---|
| Start roster: who is human (connected clients) vs AI; citizen flag frozen | Yes (`GameServer.ts:656-668`) | **Yes — server-authored.** Bots/nations exist only in the simulation; the server never sees them. |
| Spawns | Yes, sees each spawn intent (`GameServer.ts:145-148`) | Yes |
| Eliminations | Only the dying player's own self-report, with a client-claimed tick (`ClientGameRunner.ts:726-736`; `GameServer.ts:1963-1993`); the server sees arrival order and its own turn count | Arrival order yes; the claim itself no |
| State-hash vote (every 10 turns) | A single summed number per client (`GameServer.ts:1361-1405`; `GameImpl.ts:389-395`) | Says who agrees with the majority; **cannot be turned back into standings**; majority is per client, not per IP |
| Winner | Vote, needs ≥ half of distinct IPs (`GameServer.ts:1414-1469`; the check is `:1454`, which keeps waiting only while `ips.size * 2 < activeUniqueIPs.size`) — so it passes at exactly half, and the first winner to reach it is taken | Only where no single party holds half or more of the distinct IPs. **In a 2-IP match one client decides alone**; in a 1-IP match that one client decides |
| Land share / tiles / placement | **No** — winner stats carry no tiles (`StatsSchemas.ts:98-109`) | — |
| Full turn log | In memory for the match only; archiving disabled (`Archive.ts:18-21`) | Deterministic, so standings could in principle be **replayed** — nothing is kept |

⇒ **The lead's earlier "it's client-side" was right in substance**: no standings or placement exist on the server. What
the server *does* have that helps: the human roster, arrival order, the turn count, and the distinct-IP vote mechanism.

---

## 4. Server-protected placement

### 4.1 What a modified client could do with no protection

Claim a high place; hold back its own death report to rank above an honest player who died later; open extra guest tabs
to inflate N (each must spawn — scriptable). It **cannot** inflate N over the wire: the start roster is server-authored
and each human's spawn is server-observed [arch]. (Whether a rostered `AiPlayer` spawned is known only from the
simulation — §1.5a.)

### 4.2 Free hardening (in every option)

N per §1.5a (spawned humans + rostered `AiPlayer`s). **In a witnessed match** the place is **computed by the server**
from confirmed reports, never taken from a client's claimed rank; a match with no independent witness is the
owner-ruled exception (§4.5). Distinct-IP count recorded on every result.

### 4.3 Options [arch EST]

| | Option | Cost | Protects | Still open |
|---|---|---|---|---|
| **B1** | **Arrival order** — the server counts eliminations in the order the dying players' own reports arrive | 2–3 days | Simplest | A player who **holds back** their death report gains a point at an honest player's expense — detectable afterwards, not preventable |
| **B2** ⭐ | **Witness votes** — every client reports each death of a counted player (human or `AiPlayer`) it sees; the server accepts it once **at least half** of the distinct in-sync IPs agree (the winner vote's rule, `GameServer.ts:1454` — not a strict majority; threshold open for S0, §12); a separate end-of-match standings vote orders the survivors by territory | 4–5 days | Holding back and false claims, wherever **no single party holds half or more** of the distinct IPs — so **not** in a 2-IP match | Anyone with ≥ half the IPs — **either player of a 2-IP match**, or one person with 2 devices / VPN: at "≥ half" they can confirm a false report alone, at "> half" they can block a true one; all humans on one IP; carrier NAT (many players behind one IP count as one witness → possible "no quorum") |
| B3 | Periodic hashed/signed standings, majority kept | 5–7 days | No more than B2 (no client secret to sign with) | Not recommended |
| B4 | Server-side simulation | 3–6+ weeks + capacity | Everything | Ruled out by the turn-relay design |
| B4-lite (later) | **Keep each match's turn log and replay only the top results offline before freezing trophies** | 1–2 weeks | Also covers 1-IP matches and colluding IPs | v2, if the analytics show abuse |

⚠️ Standings must **not** go into the existing winner vote: a split vote would block the winner and lose the whole
match's XP credit [arch]. Old clients send nothing → their matches get no quorum. **What a witnessed match records
when an event fails quorum** (old clients, carrier NAT, a split vote) **is not decided — open for S0 (§12).**

### 4.4 → ✅ **DECIDED: B2 witness votes** (owner, §1.7 #1)

B4-lite (replay the top results before trophies are frozen) is **v2**, if the analytics show abuse. B1 not taken.

### 4.5 → ✅ **DECIDED: matches with no independent witness trust the client's place in v1** (owner, §1.7 #2)

- A match has **no independent witness** when only one human plays (the rest AI fillers) or all humans share one IP.
  B2 cannot confirm a place there. **v1 records the place the client claims**, tagged `client_claim_no_witness` on the
  result row and in the metrics, so these results can be counted, reviewed and, if needed, discounted later.
  In an all-one-IP match with **several** clients, whose claim is recorded and what happens when those claims conflict
  is **not decided — open for S0 (§12).**
- **Weakly witnessed — counted apart; the label depends on the S0 threshold (§12 item 1, not picked here):**
  - **If S0 keeps "≥ half":** a result whose **final** confirmation count is exactly half the distinct IPs (always the
    case when one client of a 2-IP match confirms alone) could have been decided by one party. It is tagged
    **`witness_half`**, not `witness_quorum` (§7), so these results do not pass for protected ones in the abuse
    analytics.
  - **If S0 picks "> half":** an exactly-half event is a failed quorum (§12 item 2), and its label is whatever S0
    decides there; `witness_half` does not exist.
  - **Final count, not first pass:** the tag is computed from the number of distinct IPs that confirmed the event by
    the time the result is written, **not** at the moment the threshold is first met. (The winner vote fixes its
    result at the first pass, `GameServer.ts:1454-1459`; copied as is, an honest 2-IP match would be accepted at 1 of
    2 IPs and tagged `witness_half` even when the second IP agrees a moment later, so honest and one-sided results
    would look the same.)
- **What this leaves open, stated plainly:** with AI counted (§1.5a) a public-lobby match is worth up to 10, so a
  modified game in a 1-human lobby can claim 1st and take up to 10 points per match. Their share is **not measured
  today** — the v1 metrics will show it.
- **Private lobbies — the same path, with an unmodified client.** Private lobbies get no AI fill
  (`GameServer.ts:698`), but a citizen can host one (`GameServer.ts:1065-1091`, citizen-gated) and fill it with his own
  guest clients on one IP: the cap of 3 other clients per IP applies to public games only (`GameServer.ts:298-308`);
  in production each extra client needs its own browser profile, since a second client with the same `persistentID`
  kicks the first (`:312-328`) — scriptable. All K spawn, the citizen plays them down and ends on top, N = K, no
  independent witness → **up to K points per match from honest self-play, not a forged claim**, limited only by the
  lobby's player limit, and repeatable in parallel. This is **inside the owner's "no cap, anti-farm deferred" ruling
  (§1.4)** — v1 adds no cap; what v1 must do is make it visible: `lobby_type` on the result row and in the metrics
  (§7). Not verified end to end (no such match was run).
- **What closes it later (v2, decided from the data):** value unwitnessed results at a flat 1 point, or exclude them,
  or the B4-lite replay check. Each is a small change once the result rows exist.
- Options put to the owner and not taken: a flat 1 point (was recommended); not counted at all.

---

## 5. Paid-citizenship leak — redone for the new design → ✅ **no leak, under 3 conditions**

The lead told the owner the leak only applies to an XP-ranked board. **Verified by the architect and the producer:
correct, under three conditions** [arch; `src/profile-server/PublicProjection.ts:43-56`]:

1. **No XP anywhere** on the board or its routes. Rank value is not XP, so the Q-A rule (*"a citizen's xp never moves
   on any route"*, owner ruling 2026-09-27) is not touched.
2. **Rank value accrues only from matches played while a citizen** (judged per match). If the board instead showed
   all-history values filtered to current citizens, an earned citizen would carry roughly 25–100+ matches from before
   citizenship and a paid one almost none — "a ★ with a tiny all-time total" would hint "paid". Accrual from citizenship
   onward starts both kinds at zero. This matches the owner's "citizens only".
3. **No "citizen since" field and no pre-citizenship match count** on the board.

Residuals, acceptable: **"my rank" for an unverified caller** is really a lookup of anyone's rank (a `vfy:false` token
can be minted for any asserted id) — it reveals a rank value, not paid status. **The ★ in matches** already shows when
someone became a citizen; the board adds nothing.

⇒ **No relaxing of the 2026-09-27 Q-A rule is needed.** Old round-1 analysis (an XP board leaks) still stands for any
future XP board.

---

## 6. Q4 — Render surface, and the experiments flag → ✅ **DECIDED** (owner, §1.7 #3, #4)

- **Surface: own window + profile line.** A start-screen button opens the Leaderboard window (Monthly / All-time tabs);
  the profile card shows "your rank". Non-citizens and guests see the board with a "become a citizen to join" prompt —
  the plan-index benefit *"drives Yandex login conversion"* becomes "drives citizenship" (guests must log in first).
- **Rollout: ship to all + a quick off switch**, hiding only what players see; recording continues. Same shape as the
  badges ruling (`0482` batch 2, answer 3). The plan-index `✅ Test` flag is replaced.
- Both `src/client/index.html` and `src/client/yandex-games_iframe.html` (production); text via `translateText` in
  `en.json` + `ru.json`.
- **Build-brief details, not owner questions:** the name a row shows (approved `display_name`; ADR-115), top-N size
  (proposed 100), "my rank" shown to verified callers only (§5 residual).

---

## 7. Abuse analytics (owner requirement, v1)

**Where each belongs** [arch]:

- **The result row in the profile DB — the main source.** A modified client cannot suppress it, and it is kept. Columns:
  match start and record time, mode, **lobby type (public / private)**, human count, AI count, N, distinct-IP count,
  place, rank value, **how the place was decided** (`witness_quorum` / `witness_half` — only if S0 keeps "≥ half",
  from the final confirmation count, §4.5 / `client_claim_no_witness`; what a witnessed match records when an event
  fails quorum is open for S0, §12 — `arrival_order` is one candidate), witness count, the server's turn at report vs. the claimed tick, identity verified, citizen at start.
- **A SQL runbook** over those rows answers the owner's question — *"is anyone abusing it, and how urgent is
  anti-cheat?"*: share of value from `client_claim_no_witness` and weakly witnessed results (`witness_half`, or the
  failed-quorum value — per the S0 threshold) (and how many of them claim
  1st); share of value from private lobbies, and private matches on one distinct IP (the self-play farm, §4.5); top-N
  players' mix of human and IP counts; held-back reports (server turn ≫ claimed tick); `client_claim_no_witness` and
  disagreement rates; parallel games per account (overlapping time windows); unverified share in the top N.
- **Server OTEL metrics in Uptrace — the owner's "check it after some time after deploy"** [arch]. Same pattern as
  the existing `geoconflict.server.match.identity` (`src/server/WorkerMetrics.ts:161-178`; per-game counts rolled up
  by `GameManager`). Cheapest set (~0.5 day):
  1. `geoconflict.server.match.rank_results` — one count per result; labels `place_source`
     (`witness_quorum` | `client_claim_no_witness`, plus whatever S0 sets: `witness_half` if it keeps "≥ half" (§4.5),
     and the failed-quorum value of §12 item 2), `game_mode` (FFA / Team), `lobby_type`
     (public / private), `top` (claimed 1st). **Unwitnessed 1st-place claims =
     `place_source=client_claim_no_witness, top=true`** — the number the owner asked to watch.
  2. `geoconflict.server.match.rank_disagreements` — witnessed results where the dying client's own claim differed
     from the quorum.
  3. `geoconflict.server.match.composition` — once per started match; bucketed labels `humans` (1 / 2 / 3-5 / 6+),
     `distinct_ips` (1 / 2 / 3+), `has_ai`, `lobby_type`. Answers "how many matches have no witness at all".
  4. Optional: `geoconflict.server.match.rank_report_delay_turns` — server turn at arrival minus claimed death tick,
     to spot held-back reports.
  No ids in any label (existing rule). Uptrace keeps **counts and trends** for a limited time; **who** is abusing comes
  from the DB rows.
- **How the three fit together:** **Uptrace** says *whether* and *how much* (trend of unwitnessed 1st places,
  disagreements); **the DB result rows + SQL runbook** say *who* and *how*, and are kept; **GameAnalytics** measures
  only how players use the board.
- **Client GameAnalytics events: UX only** (board opened, tab switched, my-rank viewed, "become a citizen" prompt
  tapped) — a modified client can suppress its own events, so they are never evidence of abuse; the owner's
  "GameAnalytics or Uptrace" is met by Uptrace for abuse. Names per `analytics-event-reference.md` (`Category:Action[:Value]`, PascalCase, enum in
  `FlashistFacade.ts`, reference updated). ⚠️ Pick a category that cannot be confused with the existing
  `Match:Leaderboard:Award` events, which describe the **Yandex** board (task `0208`).

Cost: ~0.5 day for the metrics + ~0.5 day for the SQL runbook [arch EST].

---

## 8. Store, cost and effort

### 8.1 Store [arch]

- **Profile DB, profile server owns it.** A new `player_match_results` table (one row per citizen per match, columns
  in §7), a small **per-period projection** (`'all'` and `'YYYY-MM'`, incremented in the same transaction — keeps top-N
  and my-rank under a few ms at any realistic size and avoids the all-time sum growing without limit), and a **frozen
  trophies table** for each month's top 3, written by an idempotent command/cron after month close.
- **Wire:** a **new internal batch endpoint** from game server to profile server (not an extension of the XP credit) —
  results are written when the place is confirmed, often at match end, and must not depend on XP's
  connected-at-credit-time gate. Cost: a second call with its own loss-on-outage (ADR-101 class).
- **Citizen check:** judged per match by the profile server inside its write (authoritative), roster flag also stored.
- **Read routes** on the profile server: monthly top-N, all-time top-N, my-rank; cached 30–60 s; no player or platform
  id ever in a response (ADR-113); `api.` subdomain, CORS, local-dev proxy entry in `webpack.config.js`.
- **Merges** must move result rows (keep one for a game both accounts played), recompute projections, move trophies.
  **Erasure** cascades; trophy rows of an erased player: **deleted with the player** — producer default (personal-data
  law, 152-ФЗ, favours deletion), for the S0 ADR.
- Volume: citizens only — at most ~150–250K rows/month [arch EST, upper bound].
- **Query cost — why the projection** [coder reasoning from the design above, not measured; the round-1 Q5 write-up
  was not kept]: the per-period projection holds **one row per citizen per period**, so it grows with the number of
  citizens, not with matches played. Top-N is an indexed read of the highest values in one period; my-rank is a count
  of rows above the caller's value in that period, on the same index. Without the projection every read would sum
  `player_match_results` — ~150–250K new rows a month, and for the all-time board every row ever written — which is
  the cost the projection removes. Writes pay one extra row update per result, in the same transaction.

### 8.2 Effort with B2 (final) [arch EST]

| Part | Days |
|---|---|
| Game server + client: roster counts, witness reports riding on the hash message, distinct-IP tally, place computation (pure `src/core` function, tested), end standings vote, no-witness client-claim path, old-client fallback | 4–5.5 |
| Profile server: migration (results, projection, trophies), internal endpoint, citizen check, merge-tool extension | 3–4 |
| Read routes + cache + proxy entry | 1.5–2 |
| Freeze command/cron + deploy wiring | 1 |
| Window in both templates, profile line, en/ru, off switch, client UX events + reference | 2–3 |
| Uptrace metrics + SQL runbook | 1 |
| **Total** | **≈ 13–17 dev days, ~3–4 weeks with review** |

**plan-index's "1–2 weeks" does not survive** — it predates every answer here. Verify tasks after each deploy come on
top (build-vs-verify rule).

### 8.3 Decisions to record

- **A new ADR, owner sign-off** [arch recommends]: rank-value definition, server-derived place and the quorum rule
  (incl. the three open vote-design choices, §12), N = humans + `AiPlayer`s (owner ruling, §1.5a; bots/nations
  excluded), citizens-only accrual, the owner-ruled no-witness exception (client
  place trusted in v1, measured), disconnected humans, running alongside Yandex, the accepted v1 trust
  residuals, ties, erasure of trophies.
- **The round-1 anti-cheat ADR is no longer needed** — the anti-farm rules are deferred by the owner (§1.4). Decided by
  the producer: dropped from v1.
- **ADR-110's trigger fires** (its trigger names "a leaderboard"; frozen top 3 is durable). **With AI counted in the
  match ranking, it is a real question, not a formality:** an `AiPlayer` can take 1st place in a match, which lowers the
  humans' values — but an AI never enters the board itself (only citizens accrue). **Settle it inside the new ADR.**
- ADR-124 D5 is **not** touched in v1 (unverified players are not excluded); amend it only if v2 adds verified-only.

---

## 9. Deferred to v2 (recorded so they are not lost)

- Placement bonus (+10 / +5 for top places) — owner undecided (§1.1).
- Count only **citizen** players in N / place — owner's v2 idea (§1.5); ~0.5 day.
- Humans-only N (the owner's first ruling; v1 counts AI by his later pick, §1.5a) — a one-line change in the place function if v1 data argue
  for it.
- Anti-farm rules: minimum match time, per-account rate cap, verified-only credits (round-1 R3/R5/R6) — decided from
  the v1 analytics.
- B4-lite: offline replay of the top results before trophies are frozen (§4.3).
- Tightening the no-witness case (flat 1 point, or not counted) if the Uptrace numbers show abuse (§4.5).
- Per-mode boards (mode is stored on every result row from v1, so this becomes a query).
- Retiring the Yandex board (§1.3).

---

## 10. Decomposition (final — for the producer to brief via `/fkit-task-brief`)

In dependency order. Each slice gets a verify task at the top of the next sprint after it deploys (build-vs-verify rule).

| # | Slice | Depends on | Why it is independently shippable and testable |
|---|---|---|---|
| **S0** | **ADR: leaderboard rank value** — §8.3 contents; ADR-110 revisit | nothing (all rulings in) | A decision document; done when the owner signs it. No code. |
| **S1** | **Profile server: results store** — migration (results, projection, trophies), internal batch endpoint, per-match citizen check, merge tool moves result rows / projections / trophies | S0 | Inert until called; proven by the real-Postgres integration suite (writes, projection sums, merge, erasure). |
| **S2** | **Game server + client: server-derived place** — witness messages and distinct-IP tally (humans and `AiPlayer`s), end-of-match standings vote, place computation as a pure `src/core` function, the no-witness client-claim path (tagged), old-client fallback, posts results to S1 | S1 | Nothing player-visible; core function unit-tested; after deploy, result rows appear and can be read by SQL. **Built and tested on its own, deployed only together with S3** (below). *(Largest slice; the plan may split it — eliminations first, standings vote second.)* |
| **S3** | **Abuse analytics** — the Uptrace metric set of §7 + the SQL runbook | S2 | Server-only; testable by counters in tests and by running the runbook on the S2 rows. ⚠️ **S2 and S3 deploy as one unit:** S3 needs S2's result path, and by owner ruling #2 the no-witness exception must be watched from day one, so S2 never goes out without S3. |
| **S4** | **Read routes** — monthly + all-time top-N, my-rank (verified only), cache, proxy entry | S1 | Route tests; usable by `curl` before any UI. Can be built in parallel with S2. |
| **S5** | **Leaderboard window + profile line** — §6, both templates, en/ru, UX events, off switch | S4 | First player-visible slice; testable in the running client. |
| **S6** | **Freeze each month's top 3** — idempotent command/cron after month close | S1 (S2 for real data) | Testable by running it on a closed test month; produces the data badges need. |

The parked badge build (`0482`) waits on S5 live and used, and on S6.

**S2 design note — reuse of the hash vote** [arch, from the owner's question in §1.7 #1]:
- **Reuse:** the client's existing `hash` message (`src/client/Transport.ts:707-713`; schema `src/core/Schemas.ts:617-621`;
  sent every 10 ticks from `GameImpl.ts:378-383`) can carry the witness data as one optional field (deaths seen since
  the last hash; standings at the end). Zod drops unknown keys by default and the schemas are not `.strict()`, so old
  and new clients and servers stay compatible both ways (⚠️ not verified that no other path re-validates strictly).
  Delay ≤ ~0.67 s. Also reuse: the per-client storage pattern (`Client.ts:9`), the out-of-sync exclusion
  (`GameServer.ts:1316-1360`) to drop disagreeing witnesses, and the distinct-IP rule copied from the winner vote
  (`GameServer.ts:1414-1459`) — which passes at **≥ half**, not a strict majority (§4.3; threshold open for S0, §12).
- **New:** the tally itself — the hash tally counts **clients, not IPs**, and runs only with more than one client
  (`GameServer.ts:1316-1318, 1361-1405`), so one IP with many tabs could form its majority; the witness tally counts by
  IP, keyed by (eliminated player, tick). Also new: the place function, the separate end standings vote (must not share
  the winner vote key), and the no-witness client-claim path.
- **Saving:** ~1–1.5 days (B2 ≈ 3–3.5 days instead of 4–5) — already in §8.2.

**Brief-writing notes:** the slices are not filed yet. When briefed, S0 comes first; S1 and S4 can run in parallel
after S0; S2 needs S1; S2 and S3 deploy as one unit; S5 needs S4; S6 needs S1. Sprint placement is the owner's call at briefing
time — this document places nothing. Placement knock-on is stated then.

---

## 11. History — what changed since the first draft (same day)

- **Round-1 recommendation** was a monthly board ranking base match XP, verified-only, with a minimum match time and a
  rate cap. **The owner chose a different metric** (rank value), both boards, citizens only, no cap, and deferred the
  anti-farm rules. Round-1 facts that still stand: an **XP** board would leak paid citizenship; our XP path is farmable;
  the rewarded-ad bonus doubles match XP with no proof of an ad — none of these affect the rank-value board, but they
  apply to any future XP board.
- **Effort** moved from "~2–2.5 weeks" (round-1 recommended shape) to **≈ 3–4 weeks**, because the place must now be
  server-protected and both boards are built.
- **Round-1 slices S0 (anti-cheat ADR), S1 (`verified`/time per credit) and S2 (board-counting rules)** are **dropped**;
  replaced by the §10 set.
- **Humans-only → humans + `AiPlayer`** (owner relaxed it for v1, §1.5, then picked *"Include AI now"*, §1.5a); the
  minimum-humans question became the no-witness question (§4.5).
- **Second batch of rulings** (§1.7): witness votes; no-witness matches trust the client in v1 (the producer had
  recommended a flat 1 point — not taken); own window + profile; ship to all + off switch. DRAFT banner removed. Effort
  → 13–17 dev days after the hash-path reuse.
- **Review round 1** (`review.md` R1–R12, same day; fixes applied by a spawned `fkit-coder`, Process-review, under the
  owner's approval *"Yes, fix the doc (Recommended)"*): owner ruling *"Include AI now"* recorded (§1.5a, was labelled
  a producer choice); the winner vote's rule corrected to **≥ half**, not a majority, and 2-IP / half-held matches
  marked weakly witnessed (`witness_half`, §4.5, §7); witnesses report `AiPlayer` deaths too (§0, §4.3); the default
  in-match list does show bots and nations (§1.5, §3.1); the 1-human bound is 10, not ~11 (§1.5a); the server cannot
  see an `AiPlayer` spawn (§1.5a); the private-lobby self-play farm and a `lobby_type` dimension (§4.5, §7); S2 + S3
  as one deploy unit (§10); a Q5 query-cost rationale (§8.1); tie sub-questions (§1.6); the alive/0-tiles citation
  (§1.6); three vote-design choices opened for S0 (§12).
- **Review round 2 and three owner rulings** (`review.md` R13–R15, same day; spawned `fkit-coder`, Process-review,
  under the owner's approval *"Yes, fix and close (Recommended)"*): rank population = the in-match **"Players only"**
  view, the same set as "Include AI now" (§1.5a); the **vote rule** — threshold, unconfirmed death, one-IP conflict —
  **left to the S0 ADR** by owner pick (§12); **place at death = death order** (§1.6). Also fixed: the S5 note no
  longer claims the list position before death equals the place (R13, §1.5a); `witness_half` made conditional on the
  S0 threshold and based on the final confirmation count (R14, §4.5, §7, §12); the §13 attribution of the query-cost
  rationale (R15).

## 12. Open items

**Owner rulings still open: none** for this investigation. (Separately, from earlier records and outside this
document's questions: Sprint 9 priority `19` for `0234` is an append rank, still flagged for owner confirmation.)
**Vote-design choices open for the S0 ADR — owner sign-off, not decided here** (review round 1, R1 + R4; each changes
what a witnessed or unwitnessed match records):
1. **The witness quorum threshold.** At **≥ half** (the winner vote's rule) a party holding half the distinct IPs can
   confirm a false report alone; at **> half** it can block a true one, sending that event to choice 2. Either way a
   2-IP match is decided by one party — under "≥ half", §4.5's `witness_half` tag keeps those results apart; under
  "> half", they become failed quorums (item 2).
2. **What a witnessed match records when an event fails quorum** (old clients, carrier NAT, a split vote): no result;
   the client's claim, tagged; or the dying client's own report in arrival order (`arrival_order`, B1).
3. **An all-one-IP match with several clients:** whose claim is recorded, and what a conflict between their claims gets.

⇒ **Owner ruling: decide all three in the S0 ADR.** Asked by `fkit-lead` via `AskUserQuestion` in its Claude Code
session, 2026-10-28, the owner typed, relayed verbatim to a spawned `fkit-coder` (Process-review): *"And about your
question - I chose option 1 "Decide in S0 ADR (Recommended)""*. The three stay open until S0; nothing here decides them.

**Technical, for the S0 ADR / slice plans (not owner questions):** carrier-NAT effect on quorum (the metrics will show
it); **[MEM]** confirm in the Yandex docs that there is no server-side leaderboard API (only matters if the Yandex board
is ever fed); the name shown for players without an approved `display_name` (ADR-115); whether `AiPlayer`s count only
once spawned (the server cannot see an `AiPlayer` spawn — it would rest on witnessed client data, §1.5a); whether a
mid-match new citizen accrues that match (proposed: no — citizen at match start); the `place_source` label wording.
**Producer defaults, to be written into the S0 ADR:** Moscow-time month boundary; ties share a value (the ADR pins the
exact rule, §1.6); trophies of an erased player are deleted; a disconnected human counts in N and gets a result.

## 13. Verification steps of the brief — checked 2026-10-28

1. **Findings document exists, named for its date and task ID, linked from the brief's Notes** — this file,
   `2026-10-28-0234-leaderboard-core-system-findings.md`; linked in `0234`'s Notes. ✅
2. **Each of the six questions answered with reasoning, or an explicit owner-ruling record:** Q1 metric §1.1 (owner) ·
   Q2 scope + Q3 cadence §1.2, §2 (owner) · Q4 surface §6 (owner) · Q5 store §8.1 (store design and costs: architect;
   its query-cost rationale: coder reasoning, not measured, as §8.1 labels it; the round-1 Q5 write-up itself was not
   kept) · Q6 abuse §1.4, §4, §5, §7 (owner + architect). None answered by bare assertion. ✅
3. **Q6 states whether the design is farmable the way `0210` documented, and what closes it:** **`0210`'s exact route —
   Singleplayer points for losing — is closed**: only multiplayer matches count, and Singleplayer runs in the browser
   with no server results at all. **The nearest equivalent that remains:** a 1-human lobby with AI fillers has no
   independent witness, and by owner ruling v1 trusts the client's place there, so a modified game can claim 1st and
   take up to 10 points per match (public lobby, §1.5a) — plus parallel matches, since there is no cap (owner ruling).
   **A second, larger one needs no modified client:** a citizen's private lobby filled with his own guest clients on
   one IP gives up to K points per match from honest self-play (§4.5) — inside the owner's no-cap ruling, made visible
   by `lobby_type` (§7), not capped in v1. **What closes it:** in witnessed matches, B2 witness votes (v1); in unwitnessed ones, a flat-1 / exclude rule or the replay check
   (v2), triggered by the Uptrace metric `rank_results{place_source=client_claim_no_witness, top=true}` and the DB rows
   (§4.5, §7, §9). ✅
4. **Replaces, complements or feeds the Yandex board, reconciled with `0209` and `0210` by name:** **runs alongside
   (complements)**; `0209` and `0210` stay as filed — §1.3. ✅
5. **Decomposition with a one-line "why independently shippable and testable" per slice, in dependency order** — §10
   (S0–S6); S2 and S3 are built and tested separately but deploy as one unit. ✅
6. **Says whether `fkit-architect` was consulted on Q5, and what it established** — yes: header (round 1 covered the
   Q5 store, Q6's technical half, feed/replace, effort), §8.1 (the Q5 store), §5 (the leak), §3/§4/§8 (round 2), §10
   design note; consulted four times at hop 2. ✅
7. **No source code written, no implementation brief filed off this document** — none written or filed. ✅

**After this:** `fkit-wiki` should ingest this report; the producer briefs S0–S6 with `/fkit-task-brief` when the owner
asks.
