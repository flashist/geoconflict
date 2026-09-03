# Glossary — project terms and the code identifiers they mean

**Layer**: shared
**Key files**: `src/core/game/Game.ts`, `src/core/game/GameImpl.ts`, `src/core/game/TeamAssignment.ts`, `src/core/execution/WinCheckExecution.ts`, `src/core/execution/ExecutionManager.ts`, `src/core/GameRunner.ts`, `src/server/MapPlaylist.ts`

## Summary

**This page is the vault's single source of truth for project vocabulary.** Several everyday words — *bot*, *Nation*, *AI player*, *team* — name something different in conversation than they name in code, and that gap caused the same questions to be re-litigated across task briefs. Every entry below was checked against the working tree on branch `dev` and cites `file:line`.

**Scope:** terms that carry load in code *and* in briefs, or that have actually caused confusion. Not a catalogue of every identifier.

**Rule for other pages:** define a term **here**, and link to `[[systems/glossary]]` rather than restating it. Overlapping vocabulary sections elsewhere in the vault were collapsed into pointers on 2026-09-03; do not re-add them.

Source: `ai-agents/knowledge-base/glossary.md` (written 2026-09-03 by the architect), merged with the former Player Types / Team Types / disambiguation sections of [[systems/game-overview]].

**Vocabulary this page deliberately does NOT cover:** task-process words — board statuses and role owners — which live in [[systems/agent-conventions]]. Product framing (*Tick*, *Intent*, *Ghost player*, *Citizen*) is defined in [[systems/project-brief]]; only the terms with a code-identifier gap are restated here.

---

## The three words that do not mean what they look like

| You say | Code says | Why it trips people |
|---|---|---|
| **Nation** | `PlayerType.FakeHuman` | The word "Nation" appears **nowhere in the enum**. Grepping `Nation` finds the `Nation` **class** — a spawn descriptor — not the player type. |
| **AI player** | `PlayerType.AiPlayer` | A separate *enum value*, but it runs **the identical execution class** as a Nation. The difference is not behaviour. |
| **Bot team** | `ColoredTeams.Bot` — the plain string `"Bot"` | `type Team = string` (`src/core/game/Game.ts:51`). There is no Team class, no team object, no membership list. A team is a string stored on each player. |

---

## Architecture

### 1. The AI-entity taxonomy

`PlayerType` has exactly four values — `src/core/game/Game.ts:347-352`:

```
Bot = "BOT" · Human = "HUMAN" · AiPlayer = "AIPLAYER" · FakeHuman = "FAKEHUMAN"
```

#### Bot — `PlayerType.Bot`

The simplest AI entity; filler population, not meant to pass as a player.

| Property | Value | Evidence |
|---|---|---|
| Behaviour class | `BotExecution` — **102 lines** | `src/core/execution/BotExecution.ts` |
| Alliances | **Responds** only; never initiates | `BotExecution.ts:59-60`, `:76`; no `AllianceRequestExecution` import |
| Emojis | **Never sends any** | no emoji reference anywhere in `BotExecution.ts` |
| `clientID` | **`null`** | `new PlayerInfo(botName, PlayerType.Bot, null, …)` — `src/core/execution/BotSpawner.ts:49` |
| Enters the game via | `SpawnExecution.ts:41` → `mg.addPlayer(this.playerInfo)` — **no team argument** | `src/core/execution/SpawnExecution.ts:41` |
| Spawn gate | `GameRunner.init()`: `if (this.game.config().bots() > 0)` — **no game-mode check** | `src/core/GameRunner.ts:131-135` |
| Count in public lobbies | **400**, every mode including Team | `src/server/MapPlaylist.ts:169` |

⚠️ **Bots are the only player type that reaches `GameImpl.maybeAssignTeam()`** — see §2.

#### Nation — `PlayerType.FakeHuman`

A more capable AI seeded from real-world geography. Plays like a player: forms alliances, sends emojis.

🚩 **The everyday word and the code identifier diverge completely.** There is *also* a class literally named `Nation` (`src/core/game/Game.ts`, constructed at `src/core/GameRunner.ts:83-94`) — but that is a **spawn descriptor** (cell, strength, `PlayerInfo`, difficulty), **not** the player type. Both names are live at once; never assume `Nation` in code means the player type.

| Property | Value | Evidence |
|---|---|---|
| Behaviour class | `FakeHumanExecution` — **950 lines** | `src/core/execution/FakeHumanExecution.ts` |
| Alliances | **Initiates** them | `FakeHumanExecution.ts:245` (`new AllianceRequestExecution(...)`), `:198` responding |
| Emojis | **Sends them** | `FakeHumanExecution.ts:277` (`new EmojiExecution(...)`) |
| `clientID` | **`null`** | `new PlayerInfo(…, PlayerType.FakeHuman, null, …)` — `src/core/GameRunner.ts:88-93` |
| Created by | `createGameRunner`, from `gameMap.nations` | `src/core/GameRunner.ts:71-95` |
| Spawn gate | `gameStart.config.disableNPCs ? [] : …` | `src/core/GameRunner.ts:72` |
| Behaviour gate | `if (this.game.config().spawnNPCs())` → `fakeHumanExecutions()` | `src/core/GameRunner.ts:136-138`; `spawnNPCs()` is `!disableNPCs`, `src/core/configuration/DefaultConfig.ts:419-421` |
| Enters the game via | the `GameImpl` constructor's `addPlayers()`, **with an explicit team** in Team mode | `src/core/game/GameImpl.ts:148-177` |

✅ "Nations are more complex bots that ally and send emojis" is **confirmed by the code** — 102 lines vs 950, and `BotExecution` has no path that creates an alliance request or an emoji.

#### AI player — `PlayerType.AiPlayer`

An AI dressed as a real player, used to make a public lobby look fuller. See [[features/ai-players]].

| Property | Value | Evidence |
|---|---|---|
| Behaviour class | **`FakeHumanExecution` — the same class Nations use** | `src/core/execution/ExecutionManager.ts:154-162` vs `:139-151` |
| Difference from a Nation | **construction only** — a Nation passes `nation.spawnCell`, an AI player passes `null`, and difficulty comes from `aiPlayersConfig().difficulty` | `ExecutionManager.ts:147-148` vs `:160`; `src/core/GameRunner.ts:139-145` |
| `clientID` | **NOT null — it has a real one** | `AiPlayerSchema = z.object({ clientID: ID, username: … })`, `src/core/Schemas.ts:473-476`; used at `src/core/GameRunner.ts:61-68` |
| Counted in the lobby player count | **Yes** — `numClients() = activeClients.length + aiPlayers.length` | `src/server/GameServer.ts:421-423` |
| Enters the game via | bundled with humans: `createGame([...humans, ...aiPlayers], nations, …)` | `src/core/GameRunner.ts:98-104` |

✅ "Technically pretty much the same as Nations" is **exactly right — literally the same class**. ✅ "Used to inflate the visible player count" is **confirmed** by `numClients()`.

🚩 **The one difference that matters for win conditions: an AI player has a non-null `clientID`.** Bots and Nations do not. Any guard written as `clientID() === null` treats AI players as humans. That guard exists — see §3.

📌 **Ruled, not merely observed — ADR-110, accepted 2026-09-03.** An AI player **MAY be declared the winner of a match**, and the predicate stays `clientID() !== null` with **no `PlayerType.AiPlayer` exclusion** — **one policy across FFA and Team mode**. An AI winner is **credited nothing** (`selectMatchCredits`, `src/core/profile/MatchQualification.ts:74-100`, never looks at who won, and an AI fails three participant gates independently); what the award does is **unblock crediting for every real player**.
🔴 **That decision carries a KNOWN EXPIRY and must never be cited as settled-forever** — the owner accepted it knowing a durable, player-visible winner surface is **planned** ("None today, but planned"), so it **must be re-examined before any leaderboard, match history, announcements feed, share card, or other surface naming a winner outside the end-of-match modal ships.** See [[decisions/adr-110-ai-winner-allowed]].

#### Human — `PlayerType.Human`

A real connected client; `clientID` is the client's ID (`src/core/GameRunner.ts:47-59`).

#### Clientless vs clientful — the partition the win code actually uses

The win check does **not** branch on `PlayerType`. It branches on whether `clientID()` is `null` (`src/core/execution/WinCheckExecution.ts:65`). So the operative split is:

| | `clientID` |
|---|---|
| **Clientful** — Human, **AI player** | non-null |
| **Clientless** — Bot, **Nation** (`FakeHuman`) | `null` |

⚠️ `PlayerInfo`'s own comment on that field reads `// null if bot.` (`src/core/game/Game.ts:415`). **That comment is incomplete — Nations are also null. Do not rely on it.**

---

### 2. Teams

- **`Team`** — `type Team = string` (`src/core/game/Game.ts:51`). A string label stored on a player (`PlayerImpl.team()`, `src/core/game/PlayerImpl.ts:789-791`). Nothing more.
- **`ColoredTeams`** — `src/core/game/Game.ts:59-70`, a `Record<string, Team>`: `Red, Blue, Teal, Purple, Yellow, Orange, Green, Bot, Humans, Nations`.
- **`GameMode`** — `src/core/game/Game.ts:158-161`. **Exactly two values**: `FFA = "Free For All"`, `Team = "Team"`.
- **`HumansVsNations`** — `src/core/game/Game.ts:57`, the string `"Humans Vs Nations"`. ⚠️ **It is a value of the `playerTeams` config, NOT a `GameMode`.** When set, teams are fixed to `[ColoredTeams.Humans, ColoredTeams.Nations]` (`src/core/game/GameImpl.ts:110-114`) and players are placed explicitly (`:156-162`).

#### `ColoredTeams.Bot` — a real team, not a non-team

The string `"Bot"`. It is easy to read the friendliness check below and conclude the Bot team is a fiction. It is not:

- Held in `GameImpl.botTeam` — `src/core/game/GameImpl.ts:83`
- **Included in the team list**: `teams()` returns `[this.botTeam, ...this.playerTeams]` — `src/core/game/GameImpl.ts:696-701` (that method returns `[]` outside `GameMode.Team`, so the Bot team is listed **in Team mode**)
- **Counted in win-check tile accounting**: `checkWinnerTeam()` sums `numTilesOwned()` per team string across *all* players and ranks the result — `src/core/execution/WinCheckExecution.ts:81-99`. Nothing excludes the Bot team from that sum; it is excluded from *winning* only by a later explicit guard (§4)
- Has its own colour — `src/core/configuration/ColorAllocator.ts:48-49`
- **Excluded from the "same team" friendliness check**: `isOnSameTeam()` returns `false` if either side is on `ColoredTeams.Bot` — `src/core/game/PlayerImpl.ts:800-802`. **This is the only sense in which the Bot team is "not a real team"** — bots do not treat each other as allies. It does **not** remove the team from `teams()`, from tile accounting, or from the win check.

#### 🚩 The two team-assignment paths — the single biggest source of confusion

There are **two** places a player gets a team, and **different entities reach each one**.

```
GameImpl constructor
  └─ addPlayers()                                    GameImpl.ts:149-177
       ├─ FFA             → addPlayer(p)                  → team defaults null
       ├─ HumansVsNations → addPlayer(p, ColoredTeams.Humans / .Nations)
       └─ Team (other)    → assignTeams(humans+nations, playerTeams)   ← PATH A
                            then addPlayer(playerInfo, team)

Later, during play:
  SpawnExecution.ts:41 → mg.addPlayer(playerInfo)     ← no team argument
       └─ addPlayer() falls through to maybeAssignTeam()                ← PATH B
```

**Path A — `assignTeams()`** (`src/core/game/TeamAssignment.ts:5-89`). Called **once**, from `src/core/game/GameImpl.ts:170`, with `[...humans, ...nations]` (`:167-170`) and `this.playerTeams` — **the Bot team is not in that list** (`playerTeams` is built at `GameImpl.ts:108-146` and never contains `ColoredTeams.Bot`). It groups by clan, then balances the rest across teams. Its `PlayerType.FakeHuman` partition at `TeamAssignment.ts:61-71` is **only a shuffle-ordering detail** — Nations are shuffled among themselves and appended after the others (`:73`) so their placement is randomised. **It does not route Nations anywhere special.** Every player it sees lands on a named player team, or is `"kicked"` when teams are full (`:55`).

⚠️ **`assignTeams()` never sees a bot** — bots do not exist yet when the `GameImpl` constructor runs.

**Path B — `maybeAssignTeam()`** (`src/core/game/GameImpl.ts:463-472`):

```
if (gameMode !== GameMode.Team) return null;
if (player.playerType === PlayerType.Bot) return this.botTeam;
return this.playerTeams[simpleHash(player.id) % this.playerTeams.length];
```

Reached **only** from `addPlayer()` when no team argument is passed (`GameImpl.ts:448`, `:455`) — in practice `SpawnExecution.ts:41`, i.e. **bots**. The `simpleHash` fallback line is therefore effectively unexercised for Nations in normal play, but it is **not dead**: any future caller adding a player mid-game without a team hits it.

> 🚩 **Correction to a claim carried in task `0205`'s brief.** `0205` states that `maybeAssignTeam` "hashes [Nations] onto a named player team like any non-Bot player". The *outcome* is right — Nations do end up on named player teams — but the *mechanism* is `assignTeams()` (Path A), not `maybeAssignTeam()`. Nations added by the constructor never reach `maybeAssignTeam()`, because `addPlayers()` passes their team explicitly (`GameImpl.ts:176`). ~~The brief is outside the vault and was **not** edited~~ ✅ **The brief itself was corrected at source on 2026-09-03 by an architect pass** (struck in place there, not deleted), so the vault and the brief now agree. **Anyone planning by symbol must look in `TeamAssignment.ts`, not in `maybeAssignTeam()`.** See [[tasks/teams-bot-team-win-stall]] and [[decisions/clientless-leader-win-policy]].

#### Where Nations actually appear

| Lobby | `disableNPCs` | Nations present? | Evidence |
|---|---|---|---|
| **Public Team**, ordinary | `true` | **No** | `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations` — `src/server/MapPlaylist.ts:165` |
| **Public Team**, HumansVsNations | `false` | **Yes** — on `ColoredTeams.Nations` | same line; placement at `GameImpl.ts:156-162` |
| **Public FFA** | `false` | **Yes** | `MapPlaylist.ts:165` evaluates false for FFA |
| **Private Team**, host default | `false` | **Yes** — on ordinary named teams | `src/client/HostLobbyModal.ts:42` (default `false`), `:768-771` |
| **Tutorial** | forced `true` | **No, ever** | `src/client/LocalServer.ts:115-121` sets `config.disableNPCs = true` unconditionally for `isTutorial` — see [[tasks/tutorial-no-nations]] |

**Bots, by contrast, are present in every one of those lobbies** — `bots: 400` in public (`MapPlaylist.ts:169`), host-set in private (`HostLobbyModal.ts:45`, `:754`), with `GameRunner.init()` spawning them regardless of game mode (`src/core/GameRunner.ts:131-135`).

---

### 3. Win-condition vocabulary

| Term | Code identifier | Meaning | Evidence |
|---|---|---|---|
| **Win check** | `WinCheckExecution` | An execution that runs every 10 ticks | `src/core/execution/WinCheckExecution.ts:16`, tick gate `:26-28`; registered `src/core/GameRunner.ts:147` |
| **FFA branch** | `checkWinnerFFA()` | Ranks **players** by `numTilesOwned()` | `WinCheckExecution.ts:40-78` |
| **Team branch** | `checkWinnerTeam()` | Sums tiles **per team string**, ranks teams | `WinCheckExecution.ts:80-119` |
| **Territory threshold** | `percentageTilesOwnedToWin()` | **95 %** in Team mode, **80 %** otherwise — measured against `numLandTiles() - numTilesWithFallout()`. **Not a simple majority.** | `src/core/configuration/DefaultConfig.ts:713-718`; denominator `WinCheckExecution.ts:102-103` |
| **Timer branch** | `maxTimerValue` | Minutes. When set and elapsed, the win fires regardless of territory. **`undefined` in every public lobby** — a private/custom-lobby route only | `WinCheckExecution.ts:106-107`; `src/server/MapPlaylist.ts:162`; host-set `src/client/HostLobbyModal.ts:773-774` |
| **`setWinner`** | `GameImpl.setWinner(winner: Player \| Team, stats)` | Emits a `GameUpdateType.Win`. **Takes either a Player (FFA) or a Team string (Team mode)** | `src/core/game/GameImpl.ts:659-665` |
| **`makeWinner`** | `GameImpl.makeWinner()` | Converts that into the wire `Winner`. **Can return `undefined`** — for a clientless player outside non-tutorial singleplayer | `src/core/game/GameImpl.ts:667-693`, `undefined` return at `:686` |
| **`Winner`** (wire type) | `WinnerSchema` | `["player", clientID, …]` \| `["team", teamName, …clientIDs]` \| `["opponent", name]`, and **`.optional()`** | `src/core/Schemas.ts:485-492` |
| **`creditMatchXp`** | `GameServer.creditMatchXp()` | Match-end XP. **Sole call site is inside `handleWinner`** — so no `Win` update ⇒ **no XP for anyone in the match** | `src/server/GameServer.ts:1253` (definition), `:1199` (sole call) |

**The two guards — locate them by symbol; the line numbers drift.**

- **FFA guard** (shipped by task `0022`, **amended by `0206` on 2026-09-03**) — `checkWinnerFFA()`, `WinCheckExecution.ts`: `if (max.clientID() === null)` and not non-tutorial-singleplayer → **singleplayer returns immediately** (so no tutorial reaches the award), otherwise **award the win to `sorted.find((p) => p.clientID() !== null)`** and set `this.active = false`. Only when **no clientful player is alive** does it still `return` **before** `this.active = false`.
- **Team guard** (pre-existing) — `checkWinnerTeam()`, `WinCheckExecution.ts:109-114`: `if (max[0] === ColoredTeams.Bot && gameType !== GameType.Singleplayer)` → `return` **before** `this.active = false`.

~~**Both return above the deactivation.**~~ **CORRECTED 2026-09-03 — that is now true of the Team guard only.** It was deliberate — it keeps the check alive so a human can still win later — and it is also why a permanently-leading clientless entity leaves the match with no winner. 🚨 That was a **live production defect** for the XP path; the fix is task `0206`, ~~unscheduled~~ ~~promoted into Sprint 4 but still `🔲 Backlog` and unstarted~~ **built and closed 2026-09-03 (agent-closed — not owner-verified)**.

🔴 **`0206` shipping does NOT make the defect gone.** Nothing was deployed, so **production still has the old behaviour**; and even in the repo the FFA guard still returns above the deactivation — losing the match's XP — when **no clientful player is alive** to receive the award. The Team-mode twin `0205` is **untouched**: `checkWinnerTeam()` is byte-identical and still unscheduled. See [[decisions/clientless-leader-win-policy]], [[tasks/win-check-clientless-leader-guard]] and [[tasks/teams-bot-team-win-stall]].

📌 **The Team guard's effect was MEASURED on 2026-09-03** (`0205`, headless deterministic simulation, real World map, 400 bots, `DefaultConfig`): with idle human slots the bot team tops the ranking **12/12**, `setWinner` is called **0/12**, and the guard is proven **causal** — the identical board with `gameType: Singleplayer` sets the winner **3/3**. ⚠️ **Simulator, not production**; see [[tasks/teams-bot-team-win-stall]] for the limits that ride with those numbers.

---

### 4. Player identity — three IDs, routinely confused

| Term | Type | Scope | What it identifies | Evidence |
|---|---|---|---|---|
| **`clientID`** | `string` | one connection / one match | A connected client. **`null` for Bots and Nations; non-null for Humans and AI players.** | `src/core/Schemas.ts:26`; field `src/core/game/Game.ts:416`; accessor `src/core/game/PlayerImpl.ts:197` |
| **`persistentID` / `persistentId`** | UUID string | across devices and matches | The durable account key. ⛔ **PII** — it is the JWT `sub`. **Never leaves the server**; the client does not know remote players' values, and it must not appear in briefs, reports, or logs. | `src/core/Schemas.ts:206`, `:641` (`// WARNING: PII`), `:550-552`; `src/server/jwt.ts:14`, `:42` |
| **`smallID`** | `number` | one match, in memory | A dense integer index into `_playersBySmallID`, used in `GameUpdate` payloads to keep them small. `0` means TerraNullius. | `src/core/game/PlayerImpl.ts:186`; assignment `src/core/game/GameImpl.ts:448-460` |
| **`PlayerID` / `id`** | string | one match | The random per-match player id (`random.nextID()`) — distinct from all three above. Marked `// TODO: make player id the small id` | `src/core/game/Game.ts:417-418`; accessor `PlayerImpl.ts:201` |

🚩 **Match-end XP participation is keyed by `clientID`, not `persistentID`** — deliberately, because the client cannot know remote players' `persistentID`. Stated in the code comment at `src/core/Schemas.ts:550-552`. See [[systems/player-profile-store]].

---

## Gotchas / Known Issues

### Owner's stated model vs what the code implements

Recorded 2026-09-03. **Both kept, labelled. The code column is what ships.**

| # | Owner's stated model | What the code implements | Verdict |
|---|---|---|---|
| 1 | Bots are the simplest AI entities | `BotExecution`, 102 lines, no alliance initiation, no emojis | ✅ **Confirmed** |
| 2 | Nations are more complex — ally, send emojis | `FakeHumanExecution`, 950 lines, `AllianceRequestExecution` `:245`, `EmojiExecution` `:277` | ✅ **Confirmed** |
| 3 | AI players are "technically pretty much the same as Nations" | **Literally the same class** — `ExecutionManager.ts:154-162` and `:139-151` both construct `FakeHumanExecution` | ✅ **Confirmed** |
| 4 | AI players inflate the visible player count | `numClients() = activeClients.length + aiPlayers.length` (`src/server/GameServer.ts:421-423`) | ✅ **Confirmed** |
| 5 | "Only real players and AI players can be in a team" | ❌ **Disagrees, twice.** (a) **Bots ARE in a team** — `ColoredTeams.Bot`, assigned `GameImpl.ts:467-468`, returned by `teams()` `:700`. (b) **Nations are placed on ordinary named teams** whenever present — `assignTeams()` at `GameImpl.ts:170` takes `[...humans, ...nations]`. | ❌ **Refuted by the code** |
| 6 | "Bots and Nations can never win in Team mode" | Partly true, **not for the stated reason**. Bots cannot win only because of the explicit guard at `WinCheckExecution.ts:109-114` — not because they lack a team. **Nations have no such protection**: a named team whose members happen to be Nations can win outright, and `makeWinner()` emits a `["team", …]` winner with an empty client list (`GameImpl.ts:667-676`). | ❌ **Refuted as stated** |
| 7 | "The match ends only when one team holds the majority of the land" | Two conditions, OR'd (`WinCheckExecution.ts:104-108`): territory **> 95 %** in Team mode / 80 % otherwise, **or** timer expiry when `maxTimerValue` is set. | ⚠️ **Partly true** |

**The owner's "Nations are not in teams" is true of the *ordinary public Team lobby only*, and true because Nations are absent there, not because the assignment code excludes them.** In a private Team lobby with default settings, Nations are on named teams.

### Corrections this page makes to earlier documentation

| Claim | Where it was | Verdict against code |
|---|---|---|
| `HumansVsNations` is a **game mode** | this vault's [[systems/game-overview]], before 2026-09-03 | ❌ **Wrong.** `GameMode` has exactly two members (`src/core/game/Game.ts:158-161`). `HumansVsNations` is a **`playerTeams` config value** (`Game.ts:57`), consumed at `GameImpl.ts:110-114`, `:156-162`. Corrected in place. |
| Nations are "present in singleplayer, missions, and the tutorial (when not disabled)" | this vault's [[systems/game-overview]], before 2026-09-03 | ❌ **Incomplete and partly wrong.** Nations are present in **public FFA** and in **private Team lobbies by default** (`MapPlaylist.ts:165`, `HostLobbyModal.ts:42`), and are **never** present in the tutorial — `LocalServer.ts:115-121` forces `disableNPCs = true`. Corrected in place; see the lobby table in §2. |
| `AiPlayerExecution` drives AI players "using `BotBehavior` logic" | `ai-agents/knowledge-base/geoconflict-overview.md` (**outside the vault — not edited by the wiki**) | ❌ **Refuted.** **No class named `AiPlayerExecution` exists** — `grep -rn "AiPlayerExecution" src tests` returns nothing, and `src/core/execution/` holds only `BotExecution.ts`, `BotSpawner.ts`, `FakeHumanExecution.ts`. AI players run **`FakeHumanExecution`** (`ExecutionManager.ts:154-162`). The `BotBehavior` half is incidentally true — `FakeHumanExecution` does use it — but the class name is wrong. Reads as an un-updated claim from the original `0074` spec, which proposed a class that was never built. |
| AI Players are "In development" | `ai-agents/knowledge-base/geoconflict-overview.md` (**outside the vault**) | ⚠️ **Stale in the code sense.** The path is fully wired: created server-side (`src/server/GameServer.ts:590-613`), shipped in `GameStartInfo` (`src/core/Schemas.ts:482`), instantiated (`src/core/GameRunner.ts:61-68`), executed (`:139-145`). ⚠️ **Production liveness was not verified** — code only; no server was contacted. [[features/ai-players]] asserts it is live; that assertion predates this page. |

### Unverified — do not upgrade these without measurement

- Whether the `simpleHash` fallback in `maybeAssignTeam()` (`GameImpl.ts:470-471`) has **any** live caller other than `SpawnExecution`. None found; the search was not exhaustive across client and tests.
- **Frequency**: how often the Bot team actually leads at a Team-mode timer expiry, or a clientless player reaches 80 % in public FFA. ~~**Both unmeasured**~~ 📌 **Amended 2026-09-03 — struck, not deleted.** The **Team** half was measured **in a simulator** (`0205`: bot team leads 12/12 with a timer; the 95 % route crossed at ≈ 7–10 minutes on the shipped public config), and the defect proved **passivity-dependent** — 0–20 % active slots stall, 60–100 % resolve. ⚠️ **Production frequency is STILL unmeasured for both**, no telemetry and no player report, and the **FFA** half was not measured at all. ⚠️ The sweep's "active" players were `FakeHumanExecution` at Medium, which plays better than a casual human, so **the real crossover is probably higher than 40 % — do not quote 40 % as a human threshold.** See [[tasks/teams-bot-team-win-stall]].
- Whether `ColoredTeams.Humans` / `ColoredTeams.Nations` can collide with a bot-team-leading scenario in a HumansVsNations lobby — the Bot team still exists there (bots still spawn), but the interaction was not traced.

## Related

- [[systems/game-overview]] — the game reference this page's vocabulary sections were merged out of
- [[systems/project-brief]] — product-level domain terms (Tick, Intent, Ghost player, Citizen)
- [[systems/agent-conventions]] — the separate task-process vocabulary (board statuses, role owners)
- [[systems/architecture-overview]] — the tier/tick/subsystem picture these terms sit inside
- [[systems/execution-pipeline]] — Intent → Execution → GameUpdate, the pipeline `BotExecution` / `FakeHumanExecution` feed
- [[systems/player-profile-store]] — where `clientID` vs `persistentID` decides XP crediting
- [[features/ai-players]] — the `PlayerType.AiPlayer` feature page
- [[features/tutorial]] — the one lobby where `disableNPCs` is forced on
- [[decisions/clientless-leader-win-policy]] — what happens when a clientless leader hits the win threshold
- [[decisions/adr-110-ai-winner-allowed]] — the ruling that an AI player may win, resting on the clientful/clientless split defined here; **carries a known expiry**
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, the guard that ships today
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team guard measured, and the team-assignment correction recorded in §2
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, a code comment that gets the clientful/clientless split backwards
- [[tasks/tutorial-no-nations]] — why the tutorial has no Nations
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, which amended the FFA guard described in §3: singleplayer returns, otherwise the top clientful player is awarded the win
