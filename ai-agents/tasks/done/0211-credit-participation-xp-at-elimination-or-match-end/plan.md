# `0211` — Implementation plan

> **Status: PLAN ONLY. Nothing has been written.** No source, no test, no config, no localisation file
> was touched producing this. `brief.md` was not edited. Nothing is committed.
>
> **Author:** `fkit-coder`, 2026-09-11. **Frame:** working tree on branch `dev` at commit `7ff60ea`,
> clean at the start of this session.
>
> ~~**This plan needs the owner's approval before any code is written**, and it carries **9 open
> questions** (§8).~~ ✅ **APPROVED 2026-09-11, owner, live in session. ALL NINE ANSWERED.**
> Struck, not deleted. **The answers are §0.5; §8 is kept as the record of what was asked.**

---

## 0.5 ✅ APPROVED — the owner's nine answers, and what they bind

**Given live in session 2026-09-11, relayed through the coordinating session.** ⛔ **Every row is a
settled ruling. Do not re-open any of them in the build, and do not re-present a rejected option as
unexplored.**

| # | Ruling | ⛔ Not open |
|---|---|---|
| 1 | **Mechanism A** — credit at *"no winner can be declared"*. **B and C were WEIGHED and REJECTED, not overlooked** | The mechanism |
| 2 | 🔴 **The leaver consequence is ACCEPTED, KNOWINGLY.** A survivor credited mid-match **keeps the XP if they then close the tab.** The owner was shown this before choosing. ⛔ **Not a defect, not a gap to close, not a thing to "fix" back.** The *"close to forced"* reasoning in §2.4 is recorded | That it is accepted |
| 3 | **NO minimum-participation floor.** The bar stays: **spawned, and either alive at end or eliminated.** ⚠️ The architect's point (*dying 30 s in pays the same*) is recorded as **NOT dismissed** — a decision, not an oversight | That there is no floor |
| 4 | ✅ **`Transport` suppresses the message when `isLocal`.** The §Phase-5 distinction from the previously-rejected `GameServer` game-type guard is recorded next to it | That the suppression ships |
| 5 | **The 3-hour-cap residual is ACCEPTED and RECORDED** as a known uncovered case ⇒ **verification step 6 changes**, see §5 | That it is accepted |
| 6 | **`migrations/001`'s `xp_awarded … default 10` STAYS**, reason recorded: **inert, because `CREDIT_SQL` always supplies `$3`** | That it is left alone |
| 7 | **The ADR-101 clarification is the ARCHITECT'S.** ⛔ **Do not write it here.** §3's gate is **DISCHARGED** | The authorship |
| 8 | **The stall brief is filed as `0242`** on the Backlog board, `Depends on: 0211`. Mechanism A fired the recorded reopen condition | That it is filed elsewhere |
| 9 | **The `## Owner` precondition is DISCHARGED** — this plan **is** the phase-1 findings, and the owner's approval satisfies it. ⛔ **Recorded so it is not re-litigated** | That it is discharged |

### 0.5.1 Producer corrections against the code — §7 confirmed independently

All three of §7's findings were **independently verified by the producer against the code and
corrected in the brief.** ✅ **§7.1, §7.2 and §7.3 stand as written.** Restated because two of them
bind the build:

- **`checkWinnerTeam()` is NARROWER than FFA** — FFA turns away `Bot` **and** `FakeHuman` plus a
  tutorial clause; Team turns away **only `ColoredTeams.Bot`**. ⇒ 🔴 **A `Nations` team leader IS
  declared the winner and does NOT stall.** The Phase-4 `WinCheckExecution` test must assert exactly
  this asymmetry, in both directions.
- **There is no `find` in `checkWinnerFFA()`** — it sorts and takes `sorted[0]`, and the early return
  is the `clientID() === null` guard. The brief's old account described `0206`'s **reverted** code.
- **The architect's report prices abuse at 10 XP in five places** — pre-ADR-111. **The risk grade is
  UNCHANGED, not lowered** (~100 forged matches buys citizenship before and after).

### 0.5.2 🔴 Two flags that are the build's to handle

**(a) `qualifiesForMatchXp`'s doc comment becomes FALSE under ruling 2.** It currently calls the
vanisher exclusion *"the participation-derived half of the brief's exclusion of players who
voluntarily left mid-game"* — and a stalled-match survivor who is credited and then vanishes **is now
paid**. 🔴 **The predicate is UNCHANGED and CORRECT; the COMMENT is what goes wrong.**
⛔ The Phase-2 comment update must **say this explicitly** — that the exclusion still holds for a
player who vanishes **without ever being credited by a trigger**, and that a survivor credited at the
stall keeps it **by owner ruling** — **or it becomes the next stale record someone "fixes" back.**

**(b) Verification step `4c`'s header reads *"A TEST, NOT A RUNTIME GUARD"* while ruling 4 adds a
guard.** ✅ **Compatible — different file, different path**: the rejected guard was a game-type check
in `GameServer`, on a path solo **cannot reach**; ruling 4's is an `isLocal` check in `Transport`, on
the path solo **does** take. ⛔ **Do not let the two blur** in the code comments, the tests or the
worklog. **The `4c` test ships regardless; the guard is additional, not a substitute.**

---

## 0. Summary — the shape of the change, in one page

**The requirement (owner-ruled, not re-opened):** every player in an FFA or Team match gets their
participation XP — whether they are **eliminated** or they **survive**, **including when the match
never reaches a normal end** — and never twice. Plus: the award drops **10 → 1**, the citizenship
threshold **1,000 → 100**, and the player-facing copy stating that threshold is rescaled in the same
change.

**The mechanism I recommend** (the plan's one genuinely open design choice — §2):

> **Credit each player at the moment *their* match is over, by a per-player self-report over a new
> client→server message, and give the survivor case its own moment: the instant the simulation
> determines that no winner can be declared.**

Concretely, three triggers replace today's single one:

| Player's exit | Trigger | Status |
|---|---|---|
| Eliminated | new per-player `participation` report, sent at the elimination edge | **new** |
| Survives, winner declared | the existing `winner` message | **unchanged — do not touch** |
| Survives, **no winner can ever be declared** | the same `participation` report, sent when the simulation reports the win condition met with an undeclarable winner | **new** |

**Why this shape:** it puts the whole fix in the **crediting path** and touches the **win check only
to publish a fact it already computes**. It never manufactures a winner, never ends a match, never
makes the server a simulator, and reuses `selectMatchCredits` **unmodified**.

**Rough size:** ~9 source files, ~6 test files. Dominated by tests, as the architect predicted.

**The one consequence I most need the owner to see before approving** — it is in §2.4 and in **Q3**:
crediting a survivor mid-match means **a survivor of a stalled match who then closes the tab keeps
the XP**. Owner Ruling 7 deliberately reversed the leaver rule for **eliminated** players and
explicitly said it *"does not say anything about"* players who vanish without ever being eliminated.
This mechanism touches exactly that unruled case. I believe it is close to **forced** by the
requirement (if the match never ends, there is no later moment to credit at), but it is not settled
and I am not settling it.

---

## 1. Grounding — what I read, and what I verified myself

### 1.1 Read in full

- `brief.md` (all 1,343 lines), including the eight-row settled-rulings manifest.
- `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md`
  (the architect's assessment).
- `ai-agents/knowledge-base/decisions/adr-111-xp-economy-rescale-awards-move-up-never-down.md`.
- `ai-agents/knowledge-base/decisions/adr-101-fail-soft-xp-crediting-no-durable-queue.md`, **including
  both dated amendment blocks added 2026-09-11**.

### 1.2 Verified in the working tree this session

Everything below I read myself. Content anchors, per
`ai-agents/knowledge-base/conventions/file-line-citations.md`.

| Claim | Verified |
|---|---|
| `creditMatchXp` has exactly one call site, inside `handleWinner` | ✅ `src/server/GameServer.ts` — `this.creditMatchXp(potentialWinner.winner);` is the only caller of `private creditMatchXp(` |
| `selectMatchCredits` needs **no** change to work mid-match | ✅ `src/core/profile/MatchQualification.ts` — all four gates (roster, `qualifiesForMatchXp`, known/not-kicked/not-disconnected client, non-null Yandex id) evaluate correctly for a just-eliminated **and** for a still-alive spawned player |
| `qualifiesForMatchXp` is satisfiable mid-match | ✅ `return p.hasSpawned && (p.isAliveAtEnd || p.killedAt !== undefined);` — `isAliveAtEnd` is not consulted when `killedAt` is set |
| The constants and every consumer | ✅ `src/core/profile/Citizenship.ts` (`CITIZENSHIP_XP_THRESHOLD = 1000`, `XP_PER_MATCH = 10`); consumers in `MatchQualification.ts`, `src/profile-server/PlayerProfileRepository.ts`, `src/client/CitizenshipCard.ts`, `src/client/PlayerProfileView.ts`, and the two pinning tests |
| `GameServer.end()` is the wrong seam | ✅ re-derived: `phase()`'s `Finished` requires `noActive` (`const noActive = this.activeClients.length === 0;`) on every path but the `maxGameDuration` cap, and `creditMatchXp` gates on `!activeClientIDs.has(clientID)`. **Do not plan around `end()`** — confirmed, not revisited |
| Elimination is detected client-side and already latched | ✅ `src/client/graphics/layers/WinModal.ts` — the `!this.eliminationTracked && myPlayer && !myPlayer.isAlive() && !this.game.inSpawnPhase() && myPlayer.hasSpawned()` predicate, firing `PLAYER_ELIMINATED` to analytics only |
| `update_identity` is a complete precedent for a new client message | ✅ `ClientUpdateIdentitySchema` in `src/core/Schemas.ts`, registered in `ClientMessageSchema`, handled at `case "update_identity":` in `GameServer.ts`, sent from `src/client/Transport.ts` |
| The intent guard the new message should mirror | ✅ `GameServer.ts` rejects `clientMsg.intent.clientID !== client.clientID` — so the new message must carry **no** clientID at all |
| `LocalServer` tolerates unknown message types | ✅ `src/client/LocalServer.ts` `onMessage` is three bare `if (clientMsg.type === …)` blocks — `"intent"`, `"hash"`, `"winner"`. No `else`, no `default`, no throw. An unknown type is silently ignored |
| Singleplayer routes through `LocalServer`, not the socket | ✅ `Transport`'s `this.isLocal = lobbyConfig.gameRecord !== undefined || lobbyConfig.gameStartInfo?.config.gameType === GameType.Singleplayer;` and `sendMsg`'s `if (this.isLocal) { this.localServer.onMessage(msg); return; }` |
| `1 XP` passes the wire contract unchanged | ✅ `src/core/profile/CreditContract.ts` — `xpAwarded: z.number().int().positive().max(10_000)`. **No contract change is needed for the rescale** |
| The crediting SQL takes the award as a parameter | ✅ `CREDIT_SQL` in `src/profile-server/PlayerProfileRepository.ts` inserts `VALUES ($1, $2, $3)`; the threshold is passed as an argument to `GRANT_CITIZENSHIP_SQL`. **No SQL literal to change** |
| The two pinning tests | ✅ `tests/core/profile/Citizenship.test.ts` (`expect(CITIZENSHIP_XP_THRESHOLD).toBe(1000); expect(XP_PER_MATCH).toBe(10);`) and `tests/client/CitizenshipCard.test.ts` (`CITIZENSHIP_XP_THRESHOLD: 1000,`) |
| Player-facing copy stating the threshold | ✅ swept both files by key and by figure: **exactly one string each** — `inbox.templates.citizenship_earned.body` in `resources/lang/en.json` (*"You've reached 1,000 XP…"*) and in `resources/lang/ru.json` (*"Вы набрали 1,000 XP…"*). Nothing else in either file states the threshold or the award |

### 1.3 Things I checked that the brief told me to check, and that came back **different**

These are in §7 in full. The headline: **the brief's "`checkWinnerTeam()` has the SAME guard shape"
is only partly right**, and the brief's description of *how* the FFA stall happens describes
`0206`'s reverted code, not the code in the tree today. Neither changes the plan's shape.

---

## 2. 🔴 The central decision — the survivor mechanism

### 2.0 The problem, precisely

The owner ruled **survivors are in scope**. The mechanism is mine to choose. The constraint set:

- The **server never learns a player was eliminated** — elimination is a derived property of tile
  count, computed only in the client simulation. The server is a turn relay and must stay one.
- **`GameServer.end()` credits zero** in every normally-ending match (§1.2). Settled, not revisited.
- **A survivor of a stalled match has no moment at all today.** The match simply keeps running until
  the 3-hour cap. There is no "end" to hook.
- `0206`'s fallback award (crown the top *client* player) is **forbidden** by owner ruling.
- Who *should* win a stalled match is **`0205`'s question**, and `0211` must not answer it.

So the survivor mechanism must **invent a moment**. Three candidate moments exist:

| Candidate moment | Mechanism |
|---|---|
| The instant the simulation determines **no winner can be declared** | **A** — recommended |
| The instant the **match is made to end** | **B** |
| Continuously, with the server holding a live participation ledger | **C** |

### 2.1 Mechanism A — credit at "no winner can be declared" *(RECOMMENDED)*

**What it is.** One new client→server message, `participation`, carrying only what the client knows
about **itself**: `{ hasSpawned, isAliveNow, killedAt? }`. The client sends it at two moments:

1. **At the elimination edge** — the predicate that already exists in `WinModal`.
2. **When the simulation reports that the win condition was met but no winner could be declared** —
   if the local player is spawned and still alive.

For moment 2 the signal already almost exists. `WinCheckExecution` (added by task `0208`) already
emits a **once-per-match latched** `WinConditionCheck` update at exactly the instant the win
condition is met, *above* the clientless-leader guard, with a payload derived **purely from game
state and config** (deliberately client-free, so every client composes the same event). The one thing
it does not publish is **whether a winner was actually declarable** — which is the guard's own
predicate, two lines below. Adding that boolean to the update makes the stall an **observable,
deterministic, replicated, already-latched fact**, defined in exactly one place in `src/core/`.

**Server side:** a new `case "participation":` beside `case "winner":`, which builds a **one-entry**
participation array from the **authenticated socket's** `client.clientID` and calls
`selectMatchCredits(this.id, …)` **unchanged**, then `profileApiClient.creditMatch(credits)` — the
same fire-and-forget, fail-soft tail `creditMatchXp` uses today.

**Pros**
- The fix lives in the **crediting path**, which is the owner's stated reason Team coverage should be
  near-free. It is: FFA and Team share one `WinConditionCheck` emission and one server handler.
  **Team mode costs approximately nothing extra.**
- **Nothing about match outcome changes.** No winner is manufactured, no match is ended early, no
  gameplay rule moves. `0022`'s deliberate "keep the check alive so a human can still win later"
  behaviour is preserved exactly.
- **`selectMatchCredits` and `qualifiesForMatchXp` need no logic change** — verified in §1.2.
- Double-crediting is already impossible at the DB layer (architect §4, verified). Both paths use
  `this.id`, so the primary key does its job.
- It **narrows** an existing trust surface rather than widening it: today **one** client's winner
  message supplies participation for **every** player in the match. A per-player self-report lets a
  client speak only for itself.
- The existing winner path is untouched, so ordinary matches carry **zero regression risk** beyond
  the amount rescale.
- It leaves the door open to the architect's Option E (majority corroboration) later, because the
  message is a **report**, not a command.

**Cons**
- **It credits survivors mid-match, not at an end.** See §2.4 — this is the real cost and it is a
  product question (**Q3**).
- It adds a **second client-asserted claim**. Bounded: see §2.5.
- It does **not** cover a survivor of a match that reaches the 3-hour cap **without the win condition
  ever being met**. That population has no signal at all. Named as an accepted residual (**Q5**).
- It **does not fix the stall**, so the brief's recorded **reopen condition fires**: a stall brief
  should be filed (**Q8**). The unbounded `turns` array (architect §11 q4) also stays unfixed.

### 2.2 Mechanism B — make the match actually end

**What it is.** Change `WinCheckExecution`'s clientless-leader early return into a terminal
"concluded, no winner" outcome. The client then sends the **existing** `winner` message (its
`WinnerSchema` is already `.optional()`, so `winner: undefined` already validates) carrying the full
`playerParticipation` array, and **the existing, tested `handleWinner` → `creditMatchXp` path credits
everyone**, survivors and eliminated alike.

**This is the option the owner considered and passed over as the *scope* decision. It is not
forbidden as a mechanism, and I evaluated it on its merits.**

**Pros**
- Survivors are credited through the **path that already works**, with **multi-player participation**
  and the existing **majority-of-IPs winner vote** trust posture. No new client claim at all for the
  survivor half.
- It also kills the unbounded `turns` growth and the "sit in a match that can never resolve" player
  experience — the architect's §11 q4 residual, solved for free.
- Credits at a genuine end, so it **does not touch the leaver rule for survivors** (§2.4). This is
  its strongest advantage over A.

**Cons — and the first one is close to disqualifying for this task**
- 🔴 **It requires a product decision nobody has made: *when* does a stalled match end?** Ending it at
  the first clientless-leader detection **reverses task `0022`'s deliberate behaviour** — the guard
  returns *before* `this.active = false` precisely so a human can still come back and win. Ending it
  there denies that comeback. Ending it later needs a new rule (a grace period? the timer? the cap?)
  that is exactly `0205`'s *"who should win a stalled Team match?"* territory, which `0211` must not
  answer.
- It puts the fix in the **win check**, which is the opposite of the owner's stated reasoning for why
  Team coverage should be near-free.
- Showing players a *"match over, nobody won"* screen is a **UX change** with no approved copy and no
  design. `WinModal`'s `wu.winner === undefined` branch is currently an **empty stub** — it emits no
  `SendWinnerEvent` at all, so this is more client work than it looks.
- Larger blast radius on the one path that works today.
- **It still leaves the eliminated-then-left player uncovered** unless Mechanism A's elimination half
  ships too — which it must, by Ruling 7. So B is **not** a replacement for A; it is an alternative
  for A's *second* trigger only. Choosing B means building A's elimination half **and** B.

### 2.3 Mechanism C — a server-side participation ledger on the `hash` channel

**What it is.** The architect's Option D. Every client already sends a `hash` message every 10 ticks.
Attach a compact `{spawned, alive}` self-summary; the server keeps a live per-client participation
view and credits from it — on the alive→dead edge, and for survivors at a sweep.

**Pros**
- **Most general.** It is the only option that could cover *every* termination path, including the
  3-hour cap with no win condition ever met.
- Continuously refreshed and multiply corroborated.

**Cons**
- Touches a **hot path on every client every 10 ticks** and enlarges the desync-detection message.
- **It still does not answer "when" for a survivor.** The natural answers are "when they leave" or
  "at `end()`" — and both require **relaxing the connected-at-match-end gate**, which is a product
  rule change, not a refactor.
- Much larger change for a population whose size is, by the owner's own accepted ruling, **never
  going to be precisely known**.

**Not recommended for this task.** Worth keeping on the table as the natural later increment;
Mechanism A does not block it.

### 2.4 🔴 The consequence the owner must see before choosing

Under **Mechanism A**, a survivor is credited **at the moment the stall becomes real**, which may be
an hour or more before they stop playing. **If they then close the tab, they keep the XP.**

Today they would get nothing: `qualifiesForMatchXp`'s doc comment calls the exclusion of a player who
*"spawned but then vanished without dying"* the deliberate *"participation-derived half of the
brief's exclusion of players who voluntarily left mid-game."*

**Owner Ruling 7 reversed that rule for *eliminated* players and said, in terms, that it *"narrows,
but does not delete, the leaver exclusion: a player who vanishes without ever being eliminated is a
different case, and this ruling does not say anything about them."***

**Mechanism A touches exactly that case.** I am not treating Ruling 7 as covering it.

**My honest read, offered as reasoning and not as a decision:** it is close to **forced** by the
survivors requirement. *"A player who survives a match that never reaches a normal match end must
still be credited"* — if the match never ends, **there is no later moment**. Any mechanism that
credits a stalled-match survivor at all credits them before they leave. The only way to avoid it is
**Mechanism B**: make the match end, so the survivor is credited at a real end. So **Q3 and Q1 are
substantially the same question seen from two sides**, and I have put them to the owner as such.

### 2.5 Trust — what is asserted, what is corroborated, what the worst case costs

Per the brief's *"Trust is a FIRST-CLASS CONCERN"*, stated explicitly:

| | |
|---|---|
| **What the client asserts** | Only about **itself**: that it spawned, whether it is alive now, and the tick it died at |
| **What it structurally cannot assert** | **Its own identity on the wire.** The message carries **no `clientID`** — the server uses the authenticated socket's `client.clientID`, mirroring the existing intent guard. A client can never report *another* player |
| **What the server corroborates first-hand** | **Spawn.** Spawn is an *intent*, and every intent passes through the server. Recording which clientIDs emitted a `spawn` intent gives the server a first-hand check on one of the four gates, for free (architect §2). A client cannot be paid without actually committing to the match |
| **What the server corroborates by existing machinery** | Roster membership (the frozen `gameStartInfo` roster), not-kicked, not-out-of-sync (`outOfSyncClients`, the same guard `handleWinner` already applies), and a non-null trusted Yandex id |
| **What is *not* corroborated** | The alive/dead claim itself, and the `killedAt` tick |
| **Worst case** | *A modified client spawns, immediately claims elimination, and collects **1 XP** without playing.* It **cannot** collect twice for that match (DB primary key), **cannot** collect for anyone else, and **cannot** collect without spawning |
| **Why that is acceptable today** | Per ADR-103 and the architect's §2: the **identity being credited is itself client-asserted** and unverified, blocked on the Yandex secret key. Hardening the elimination claim while the account it credits is unverified is hardening the stronger link. ⚠️ Per ADR-111, the abuse economics are **unchanged** by the rescale: ~100 forged matches buys citizenship before and after |

**This is a genuine, if small, departure from the codebase's instinct** — `mark_disconnected` is
server-authored and explicitly rejected from clients. Keeping the new message a **report** (the
server decides; the message never commands) is what preserves the path back to corroboration
(architect's Option E) without reshaping the wire.

### 2.6 Recommendation

> **Mechanism A**, with: no `clientID` on the wire; server-verified spawn; the `outOfSync` / `kicked`
> / roster guards; `this.id` as the game id on **both** paths; and an in-memory per-client latch on
> the server so N reports never become N HTTP round-trips (an **efficiency** measure — the
> double-credit guard is the database primary key, and must not be described as anything else).

**If the owner prefers B**, the plan below still applies in full for the elimination half; only §4
Phase 3 is replaced, and the ADR-101 answer in §3 changes (it becomes *"no ADR action at all"*).

---

## 3. 🔴 REQUIRED — the ADR-101 supersede gate

**The gate, restated:** when the plan picks the survivor mechanism, re-read ADR-101's *"blast radius
is one match, not a backlog"* consequence, its 3-attempt retry budget sizing, and its per-item
pre-validation rationale (which assumes a multi-item batch), and **decide whether a superseding ADR
ships with this task.**

**I did the step. Here is the decision.**

### 3.1 The decision

> ## ⛔ **NO SUPERSEDING ADR SHIPS WITH `0211`.**
> ## ✅ **A dated CLARIFICATION is appended to ADR-101 instead, and it ships with this task.**

> ✅ **GATE DISCHARGED 2026-09-11.** The owner ruled **Mechanism A** (§0.5 row 1), which selects the
> branch below, and ruled that **the clarification is the ARCHITECT'S to write** (§0.5 row 7).
> ⛔ **The coder does not write it.** The Investigation §6 requirement is satisfied by this section.

**Conditional on Mechanism A being chosen.** If the owner picks **Mechanism B**, crediting stays
**one batch at match end**, ADR-101 is untouched in every respect, and **not even a clarification is
needed** — I would then ship nothing against ADR-101 at all. The gate's own premise (*"it cannot be
settled before the plan picks a mechanism"*) is exactly why.

### 3.2 The reasoning, point by point

I re-read the three parts the gate names, against Mechanism A.

**(1) "Blast radius is one match, not a backlog" — holds, and gets *stronger*, not weaker.**
The consequence is about **accumulation**: nothing is queued, so an outage cannot cause a
thundering-herd write when the backend returns. Under A nothing is queued either — each report is
still fire-and-forget with a bounded retry and then dropped. What changes is that the blast radius of
a *single failed call* shrinks from **one match's whole roster** to **one player**. A failure during
a stalled match now costs one player their 1 XP instead of costing everyone theirs. **The sentence in
the ADR remains true as written.**

**(2) The 3-attempt retry budget — its sizing rationale changes context, but the number stays right.**
The budget was sized against *"the loss window is exactly 'profile backend down longer than ~1.25 s
of retries at the moment a match ended'"*, and the reason it is bounded at all is that the call sits
**on the match-cleanup path**, where blocking degrades the game. Under A, the per-player calls happen
**mid-match, off the cleanup path** — so the pressure that forced the bound is *weaker* there, not
stronger. Three attempts is now **conservative rather than tight**. ⛔ That is an argument for leaving
it alone, not for changing it. **I propose no change to the retry budget**, and I flag that a review
finding of the form *"only 3 retries"* remains closeout of ADR-101, unchanged.

**(3) Per-item pre-validation — the rationale degenerates; the behaviour stays correct.**
The rationale is explicitly multi-item: *"the profile server rejects the entire batch with a 400 if
one item is invalid… so one malformed player id would cost every other player in the match their
XP."* In a **one-item** call there are no other players to protect. But the filter still does the
right thing: it drops an item that would produce an **unretryable 400**, turning a guaranteed failure
into a silent no-op with a warn. **No code change, no behaviour change — only the justifying sentence
narrows.** That is precisely what a clarification records.

**(4) One thing genuinely new, which the gate did not name and which I am adding.**
**Call volume rises** — from one batch per match to up to *N* + 1 calls per match. The in-memory
per-client latch (§2.6) bounds it to **at most one call per client per match**, plus the existing
end-of-match batch. That is an operational fact worth writing down, and it is a **consequence**, not
a decision.

### 3.3 Why a clarification and not a supersede

A superseding ADR is for **reversing or replacing a decision**. ADR-101's decision is:
*fail-soft, at-least-once, bounded 3-attempt retry, no durable queue.* **Every word of that survives
Mechanism A intact.** Nothing is reversed; no option is re-opened; no residual trigger moves — the
three re-raise triggers (paid entitlements on the path; observed drop volume stops being negligible;
a funded dead-letter path) all turn on things this change does not touch.

`README.md`'s carve-out (*"Immutability starts at `accepted`"*) permits a dated clarification in
place, and ADR-101 already carries two such blocks from 2026-09-11. **A third, recording the trigger
move, is the correct instrument.** ADR-111's own cross-reference says this gate *"turns on the
**trigger**, not the **figures**"* and must be answered separately — which this does.

### 3.4 🚩 What would flip this to a supersede

Stated so the decision is falsifiable rather than merely asserted:

1. The owner decides mid-match credits should have **different durability** from match-end credits
   (a queue, a dead-letter path, a different retry budget). That **is** a change to the decision.
2. A chosen mechanism makes crediting a **high-frequency or per-tick** path rather than at most once
   per client per match (e.g. a variant of Mechanism C without a latch).
3. Paid entitlements ever flow through this path — ADR-101's own trigger 1, unchanged by any of this.

### 3.5 Routing — who writes it

⚠️ **Flagged rather than assumed.** ADRs live in `ai-agents/knowledge-base/decisions/` and are
normally the **architect's** to author. My recommendation is that the clarification block is drafted
by `fkit-architect` and shipped inside `0211`'s change, with this plan's §3.2 as its input. **I have
not written it and will not without the owner's say-so** (**Q6**).

---

## 4. The implementation plan

> ⚠️ **These are BUILD phases, not ship units.** Owner Ruling 4 is that the trigger change and the
> amount change **ship together**, and the owner accepted the cost that a post-deploy XP anomaly
> cannot then be attributed between them. **Nothing here splits the task.** The phases exist so the
> work can be verified incrementally on one branch.

### Phase 0 — before any code

Answer §8's open questions. **Q1** and **Q2** must be answered; the rest can be answered in parallel
with Phase 1.

### Phase 1 — the economy rescale *(self-contained, independently verifiable)*

| File | Change |
|---|---|
| `src/core/profile/Citizenship.ts` | `CITIZENSHIP_XP_THRESHOLD` **1000 → 100**; `XP_PER_MATCH` **10 → 1**. Exactly 10×, per ADR-111. Update the doc comment on `XP_PER_MATCH` to record that `1` is a **deliberate floor**, per ADR-111 part 3, so nobody rounds it back up |
| `resources/lang/en.json` | `inbox.templates.citizenship_earned.body`: *"1,000 XP"* → *"100 XP"* |
| `resources/lang/ru.json` | the same key, in Russian: *"1,000 XP"* → *"100 XP"* |
| `tests/core/profile/Citizenship.test.ts` | the pins move to `100` / `1` |
| `tests/client/CitizenshipCard.test.ts` | the mocked `CITIZENSHIP_XP_THRESHOLD: 1000` moves to `100`; check every assertion that reads a rendered figure |

**Nothing else changes for the rescale — verified, not assumed:**
- `src/client/CitizenshipCard.ts` derives the displayed figure via
  `CITIZENSHIP_XP_THRESHOLD.toLocaleString()` and the progress bar via
  `Math.round((profile.xp / CITIZENSHIP_XP_THRESHOLD) * 100)`. **Both follow the constant.**
- `src/profile-server/PlayerProfileRepository.ts` passes the threshold as a **query argument**.
- `src/core/profile/CreditContract.ts` accepts any positive int ≤ 10,000 — **`1` is already valid**.
- ⚠️ **`migrations/001_player_profiles.sql` carries `xp_awarded integer not null default 10`** — a
  hard-coded copy of the award that ADR-111's consumer list does **not** name. It is **inert**: the
  insert always supplies `$3` explicitly, so the default is never used. **My recommendation is to
  leave the applied migration untouched** and record it in the worklog; editing a migration that has
  run in production is a worse trap than a stale default (**Q7**).

⛔ **No migration. No backfill. No divide-by-10 of existing rows.** Owner Ruling 8: rows at ≥ 100 XP
become citizens the instant this ships, knowingly accepted. **Not a defect, not a gap.**

### Phase 2 — the elimination trigger

**`src/core/Schemas.ts`** — a new client message, modelled on `ClientUpdateIdentitySchema`:

```ts
// Per-player participation self-report. Carries NO clientID: the server uses the
// authenticated socket's client.clientID, mirroring the intent guard. A client may
// only ever report ITSELF. This is a REPORT, not a command — the server decides.
export const ClientParticipationSchema = z.object({
  type: z.literal("participation"),
  hasSpawned: z.boolean(),
  isAliveNow: z.boolean(),
  killedAt: z.number().int().nonnegative().optional(),
});
```

Register it in `ClientMessageSchema` and export the inferred type beside the others.
*(Name negotiable — `participation` reads better than `eliminated` because it carries both halves.)*

**`src/server/GameServer.ts`:**
1. **Record server-observed spawns.** In `addIntent`, note the `clientID` of any `spawn` intent in a
   per-game set. First-hand corroboration of gate 2, for free.
2. **Extract the tail of `creditMatchXp`** — everything from building `eligibleRoster` and
   `clientStateById` down to `profileApiClient.creditMatch(credits)` — into one private method taking
   a participation array. `creditMatchXp` keeps its winner-message unwrapping and calls it.
   **⛔ Both callers pass `this.id`.** This is the single easiest way to break the change (architect
   §4 condition 1, risk-rated *High if it happens*) and it gets its own test.
3. **New `case "participation":`** beside `case "winner":`, calling a new private handler. Guards, in
   order, mirroring `handleWinner`: `outOfSyncClients` → ignore; `kickedClients` → ignore; per-client
   already-reported latch → ignore; `gameStartInfo === undefined` → ignore; not in the frozen roster →
   ignore; **no server-observed spawn intent** → ignore. Then build a one-entry participation array
   from the authenticated `client.clientID` and the reported fields, and call the extracted method.
4. **Close the late-identity hole.** In the existing `case "update_identity":`, after a successful
   null→value refresh, **re-attempt the credit** if a participation report was already received and
   dropped for a null Yandex id. The architect flagged this race (§4 condition 3, *"narrow, but
   real"*); **moving the trigger earlier makes it materially more likely**, because a player can now
   be credited seconds after joining. Retaining the last claim per client makes this a few lines.

**`src/client/Transport.ts`:** a `sendParticipation`-style method using **`sendMsg`**.
🔴 **It must NOT go through `sendIntent`** — an intent enters the deterministic stream and reaches
`LocalServer`. See Phase 5 for the Singleplayer question this raises.

**`src/client/ClientGameRunner.ts`:** emit on the elimination edge inside the existing update
callback, beside the `hasReportedParticipation` / `hasProcessedWin` latches — **not** in `WinModal`
(reporting is not a UI concern). Suppressed when `this.lobby.gameRecord !== undefined` (replay).
⚠️ **Not** suppressed on reconnect: a duplicate is absorbed by the primary key, whereas suppression
could lose a real credit.

**Shared predicate.** Extract `!isAlive() && !inSpawnPhase() && hasSpawned()` into one exported
helper used by **both** `ClientGameRunner` and `WinModal`'s existing elimination latch. The architect
rates a silent drift between two copies *"Low, insidious"*; one definition costs nothing.

**`src/core/profile/MatchQualification.ts`:** **no logic change.** Update the module doc comment and
`qualifiesForMatchXp`'s comment to say the predicate is satisfiable **mid-match**, and that
`isAliveAtEnd` means *"alive at the moment this participation was captured"*.
🔴 **And it must say the thing §0.5.2 (a) names, explicitly:** the *"exclusion of players who
voluntarily left mid-game"* sentence is now **false as written** — a stalled-match survivor who is
credited and then vanishes **is paid, by owner ruling.** The exclusion still holds only for a player
who vanishes **without any trigger having credited them.** ⛔ **Say it, or it becomes the next stale
record someone "fixes" back.**
⛔ **Do NOT rename `isAliveAtEnd`**, despite the architect's §5 suggestion: it is a **wire field** in
`PlayerParticipationSchema`, so a rename is a cross-version wire change for a cosmetic gain.
A comment gets the same benefit at none of the cost.

### Phase 3 — the survivor trigger *(Mechanism A; replaced wholesale if the owner picks B)*

**`src/core/game/GameUpdates.ts`:** add `winnerDeclarable: boolean` to the `WinConditionCheck` update.

**`src/core/execution/WinCheckExecution.ts`:** in **both** `checkWinnerFFA()` and `checkWinnerTeam()`,
compute the existing clientless-leader guard predicate into a local **once**, pass it into
`reportWinConditionCheck(...)`, and then keep the early return exactly as it is today.

- ⛔ **The guard's behaviour does not change by one tick.** `0022`'s deliberate *"return before
  `this.active = false` so a human can still win later"* is preserved. **No winner is manufactured.**
- ✅ The payload stays **client-free** — the new field is derived purely from game state and config,
  which is the property `0208`'s comment says is secured *by design, not by test*. It must stay that
  way, and the tests will say so.
- ✅ The update is **already latched** once per match by `reportedWinCondition`, and execution-private
  bookkeeping never enters the state hash. **No desync surface.**
- ⚠️ **Plan step, must be checked before writing:** confirm `logWinConditionCheckAnalytics`
  (`src/client/`) enumerates the fields it sends **explicitly**, so the new boolean does not silently
  leak into `0208`'s still-open Part B analytics event. If it spreads the object, the emitter is
  pinned to today's field list instead.

**`src/client/ClientGameRunner.ts`:** in the existing `GameUpdateType.WinConditionCheck` branch, when
`winnerDeclarable === false` and the local player is spawned and alive and this is not a replay, send
the `participation` report with `isAliveNow: true`. Latched independently of the elimination report.

**Why this covers Team mode at ~zero extra cost:** `WinConditionCheck` is emitted from **both**
branches of the same execution, and the server handler is mode-agnostic. The owner's *"likely
near-free"* expectation **holds** — verified by reading the code, not assumed. See §7.1 for the one
way the brief's Team claim is narrower than stated.

### Phase 4 — tests

🔒 **`src/core/` changes MUST be tested — this project's rule, in full, no exemption.** Phases 1, 2
and 3 all land in `src/core/`.

| Test | What it pins |
|---|---|
| `tests/core/profile/Citizenship.test.ts` | `100` / `1`. **This test going red on the rescale is the pin working** |
| `tests/client/CitizenshipCard.test.ts` | the mocked threshold and every rendered figure |
| **new** — localisation guard | Both `en.json` and `ru.json`'s `citizenship_earned.body` **contain `String(CITIZENSHIP_XP_THRESHOLD)`**. Cheap, and it makes the copy break loudly the next time the constant moves — which is the exact failure step `4d` exists to catch |
| `tests/core/profile/MatchQualification.test.ts` | `xpAwarded === 1`. A just-eliminated player qualifies **mid-match**. A still-alive spawned player qualifies. A player who vanished with no `killedAt` still does **not** (Ruling 7 narrows, does not delete) |
| **new** — `src/core/Schemas.ts` | The new message validates; it has **no `clientID` field** to claim; an unknown extra field is rejected |
| **new** — `WinCheckExecution` | `winnerDeclarable` is `false` for an FFA **Bot** and **Nation** leader and for a **Bot team** leader; `true` for a **Human**, an **AiPlayer** (ADR-110), and a **Nations team**. The guard's early-return behaviour is unchanged. The payload carries no per-client data |
| **new** — `tests/server/…` (pattern: `GameServerWinner.test.ts`) | An eliminated player's report credits **exactly once**, with **`this.id`** as the game id — asserted directly, **not** a derived key. A survivor's stall report credits. An out-of-sync / kicked / non-roster / never-spawned reporter credits **nothing**. A **second** report produces **no second HTTP call** (the latch) and would be a DB no-op even without it. A report claiming another player is **structurally impossible** (no field on the wire). **Ordinary winner matches are unchanged** |
| **new** — `4c` Singleplayer regression | See Phase 5 |

### Phase 5 — 🔴 the Singleplayer property, and one plan decision I need ruled

**The property (Ruling 6 + the 2026-09-04 policy ruling):** a Singleplayer or archived-replay match
credits **zero** XP to **anyone**, and `0211` is *"the task that relocates the crediting trigger"* —
the one change most likely to break it, with **nothing in the codebase that would object**.

**What this design does to it, traced rather than assumed:**
- The report goes through `Transport.sendMsg`, which in local mode hands it to
  `LocalServer.onMessage` and returns — **the socket is never touched**.
- `LocalServer.onMessage` is three bare `if` blocks with **no `else` and no `default`**, so an
  unknown type is **silently ignored**. Verified this session. ⇒ **No crediting path exists.**
- ⛔ It must go through `sendMsg`, **not** `sendIntent` — an intent would enter the deterministic
  stream. This is the single line that keeps the property true.

**✅ RULED — Q4 ANSWERED YES (§0.5 row 4).** An `isLocal` early return goes in `Transport` before
sending, so the message is never even constructed in solo play. **Both the guard and the `4c` test
ship; the guard is additional, not a substitute** (§0.5.2 b).

⚠️ **I am flagging this because it sits close to a guard the owner explicitly rejected**, and I do not
want to be read as re-proposing it. The rejected guard was a **game-type check in `GameServer`** —
rejected as *"dead code that reads as protection"*, on a path solo **cannot reach**, defending the one
case that cannot happen. **An `isLocal` check in `Transport` is the opposite:** it sits on the path
solo **does** take, and it is exactly the *"a trigger moving CLIENT-SIDE, where `GameServer` is not
involved at all"* failure the owner's reasoning identified as the real risk. It is also the same
pattern `startPing` and several other `Transport` methods already use.

**But the ruling adopted a test, not a guard, and I will not quietly widen it. Owner's call.**

**The `4c` regression test, either way** — and I will say plainly what it drives:
a **unit-level stand-in, not an end-to-end Singleplayer play-through**. It asserts that
`LocalServer.onMessage` handed the new message type credits nothing and does not throw, and (if Q4
says yes) that `Transport` in `isLocal` mode emits no participation message. ⛔ **I will not claim
end-to-end coverage I did not write.**

---

## 5. Verification — mapped to the brief's numbered steps

⚠️ **Step 10 first, because it constrains everything else.** The brief warns that crediting was
**never proven end-to-end locally on `0206`**: `creditMatchXp` returns at `credits.length === 0`
because `getCreditableYandexId` yields `null` for every client in a local run.
**That constraint is unchanged and I am planning around it up front, not discovering it later.**
Every claim below is proven at the **unit / server-handler level with an injected client carrying a
Yandex id**, never by a code trace presented as a test. **A real end-to-end proof needs `0217`'s
wiring plus a live profile backend and is not available in this task.** I will say exactly that.

| Step | How it is verified | Honest limit |
|---|---|---|
| 1 — eliminated mid-match is credited | Server-handler test | Not end-to-end (above) |
| 2 — survives to match end is credited | Existing winner-path tests, unchanged | — |
| 3 — **survivor of a match that never reaches a normal end** | `WinCheckExecution` test (`winnerDeclarable === false`) **plus** the server-handler test for a survivor report | ⛔ **Two tests either side of a client emission, not one end-to-end proof.** The brief says *"do not report it satisfied by a code trace"* — the client emission itself is the seam I can only cover by unit test |
| 4 — **Team mode** in both cases above | The `WinCheckExecution` test covers the Team branch; the server handler is mode-agnostic | — |
| 4b (amount) — every path pays **1** | `MatchQualification` test asserts `xpAwarded === 1`, by test not by diff | — |
| 4b (leaver) — eliminated-then-left is paid; never-eliminated vanisher is not | `MatchQualification` tests, both directions, **named in the test title** so a later reader sees the reversal is deliberate | — |
| 4c — Singleplayer credits zero | Phase 5 | **Unit-level stand-in** |
| 4d — **no user-visible string states a pre-rescale figure** | 🔴 **Sweep both files for the FIGURE, not the diff.** I will run the sweep and paste the command and its output into the worklog. The new localisation guard test backs it up | Reading the diff is explicitly **not** this step |
| 5 — eliminated in a match that later ends is credited **exactly once** | Server test: both paths run, one HTTP call after the latch, same `gameId` | — |
| 6 — the `maxGameDuration` cap path credits | 🔴 **REPORT AS "PARTLY SATISFIED, RESIDUAL NAMED" — owner ruling, §0.5 row 5.** A capped match credits **if the win condition was met** (the stall case — the observed failing case). A capped match where the win condition was **never met** has **no trigger**, accepted and recorded. ⛔ **Reporting this step as a clean pass is a FALSE REPORT** | **Named residual, never silently skipped** |
| 7 — ordinary winner matches unchanged | Existing `tests/server/GameServerWinner.test.ts` stays green | — |
| 8 — a client cannot obtain XP by asserting an elimination it did not suffer | **Tested:** cannot claim another player (no wire field), cannot be paid without a server-observed spawn intent, cannot be paid twice. **Argued, not tested:** it can claim *its own* elimination early, for **1 XP**, bounded by the DB key. §2.5 states which is which | Stated as the brief requires |
| 9 — `npm test` green, `npm run lint` clean | Both run. ⚠️ `npm test` now runs shell harnesses (~22–25 s). On a `supertest` failure I will check CLAUDE.md's known-flake signature, **rule out `0197`'s `SIGSEGV` first** (`signal=SIGSEGV`, or a DiagnosticReports stack starting at `ClearStaleLeftTrimmedPointerVisitor`), **re-run, and say that I re-ran** | — |
| 10 — the local end-to-end constraint | Addressed above | ⛔ **No local end-to-end crediting proof exists or will exist in this task** |

---

## 6. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| The two crediting paths use different game ids ⇒ the primary key stops working ⇒ **double credit** | **High if it happens, trivial to avoid** | Both callers take `this.id`. **A dedicated test asserts it**, not a comment |
| Crediting survivors mid-match narrows the leaver rule for a population the owner has **not** ruled on | **Medium — product, not technical** | §2.4, **Q3**. Not decided here |
| Self-reported participation is a farming surface | **Medium** | §2.5. Bounded to **1 XP per (game, account)** by the DB primary key; authenticated clientID only; server-observed spawn required. Residual accepted on ADR-103's reasoning |
| A trigger moves somewhere `LocalServer` can reach ⇒ **Singleplayer silently starts paying** | **Medium, and invisible** | Phase 5. `sendMsg` not `sendIntent`; the `4c` regression test; optionally the `isLocal` suppression (**Q4**). ⚠️ *"The tests are green"* proves nothing here — nothing asserts this property today, which is why the test must exist |
| The client elimination predicate drifts from `WinModal`'s copy | **Low, insidious** | One shared exported predicate, used by both |
| A desynced client reports a false elimination | **Low** | The same `outOfSyncClients` guard `handleWinner` already applies. A false positive credits **early**, never **twice** — elimination is terminal, so it cannot be taken back, and the key prevents a second |
| Late `update_identity` between a claim and a match-end credit ⇒ two keys | **Low, but now likelier** | Phase 2 step 4 closes it by re-attempting on identity refresh. **The trigger moving earlier is what makes it likelier** — the architect flagged it when it was narrower |
| The new `winnerDeclarable` field leaks into `0208`'s still-open Part B analytics event | **Low** | Explicit plan step in Phase 3 to check the emitter before writing |
| The `WinConditionCheck` payload stops being client-free ⇒ desync | **Low but severe** | `0208`'s comment says this is secured *by design, not by test* — the new field is derived from game state and config only, and the new test says so |
| The stall itself is left unfixed: unbounded `turns` for up to 3 h, and survivors sit in an unresolvable match | **Medium, and out of this scope** | **Q5 / Q8.** Mechanism A does not address it; the brief's recorded reopen condition fires |
| `npm test` red for people not touching this code | **Low** | Editing the shell-harness-covered files is not planned; the `supertest` flake is a known ~4–7 % re-run, not a regression |

---

## 7. 🚩 Things in the brief or the architect's report that did not hold up

**All four files were heavily edited today. Three things do not survive a read of the tree.**

### 7.1 🔴 *"`checkWinnerTeam()` has the SAME guard shape as `checkWinnerFFA()`"* — **only partly true**

The brief itself asked for this to be confirmed at plan time by symbol, and flagged it as
*"reported-not-re-verified"*. **I read both.** They are the same *shape* but **not** the same
*predicate*:

- **FFA** turns away any leader with `max.clientID() === null` — that is **both** a `Bot` **and** a
  `FakeHuman` (Nation) — and carries an extra `isTutorial` clause.
- **Team** turns away **only `ColoredTeams.Bot`**, and has no `isTutorial` clause. ⇒ **A `Nations`
  team leader IS declared the winner** and does **not** stall.

**Why it matters, and why it is not a problem:** the Team-mode stall population is **narrower than
the brief implies** — Bot-team-led matches only, not every clientless-led Team match. This is
consistent with `0208`'s two reported Team figures (*clientless-in-front 53.2 %* vs *stall-capable
52.4 %*) ⚠️ **though I have not re-derived those numbers and am not claiming to.** It does **not**
change Ruling 2 or the plan: Mechanism A covers whatever the guard turns away, because it publishes
**the guard's own predicate** rather than re-deriving it. **The owner's "near-free" expectation
holds.**

### 7.2 The brief's description of *how* the FFA stall happens describes `0206`'s reverted code

The brief states the mechanism as: *"`players()` filters to `isAlive()`, so dead players are absent
from the sorted list, `find` returns `undefined`, and the code takes an early `return`."*

**There is no `find` in `checkWinnerFFA()` today.** It sorts `this.mg.players()` and takes
`sorted[0]`; the early return is the explicit `if (max.clientID() === null)` guard. The `players()`
→ `isAlive()` filter is real (verified) but is not what produces the stall. **The `find` almost
certainly belongs to `0206`'s reverted top-client-player lookup.**

⚠️ **Harmless to the conclusion** — the stall is real, it is the guard, and it predates `0206`. But
anyone planning from that sentence would go looking for code that is not there.

### 7.3 The architect's report predates ADR-111 and still prices everything at **10 XP**

Its §0, §2, §4 and §10 all bound the abuse ceiling at *"10 XP per (game, account)"*. After ADR-111
that is **1 XP**. ⛔ **Not a defect in the report** — it was written 2026-09-04, six days before the
ruling. Per ADR-111, the abuse **economics are unchanged**: ~100 forged qualifying matches buys
citizenship before and after, so the risk grade is **not lowered**. I have used `1 XP` throughout
this plan and flagged it rather than silently re-pricing the report's conclusions.

### 7.4 Smaller corrections, none load-bearing

- The report's §8 says *"`src/client/LocalServer.ts:174` must tolerate the new message type."*
  ✅ **It already does** — `onMessage` has no `default` and no throw. Still worth the `4c` test.
- The report's §11 q5 (*"should `0208` run before or after this?"*) is **closed** by the owner's
  2026-09-11 ship-gate ruling. It should not be put to the owner again.
- The report's §12 incidental #1 (`ClientGameRunner`'s `const placement = +1;`) is **out of this
  task's scope and I did not re-verify it.** Not touched.
- ✅ **The brief's warning about a Russian thousands separator (step `4d`) is moot for this
  value** — `ru.json` currently uses the English-style *"1,000 XP"*, and at **100** neither language
  needs a separator at all. **The sweep obligation stands regardless**; I am only noting that this
  particular trap does not fire.

### 7.5 One unresolved contradiction **in the brief itself**, which the brief flags and does not resolve

The `## Owner` section requires *"the owner has reviewed the phase-1 findings"* **before** this task
is worked; the 2026-09-11 *"build it"* ruling says the build starts. The brief says plainly that
**nobody has reconciled the two** and that a producer may not lift the precondition.
**This plan is my phase-1 findings.** ⇒ **Q9.**

---

## 8. ~~🚩 Open questions for the owner~~ ✅ ALL NINE ANSWERED 2026-09-11 — see §0.5

> ⛔ **Kept as the record of what was asked and what was recommended. The ANSWERS are §0.5.**
> Struck-don't-delete, so nobody re-derives an open question from a half-erased record.

⚠️ **I have no `AskUserQuestion` here** — this session is a spawned plan-only consult, so the tool is
absent (ADR-021). These are returned as text and need answers before code is written.

**Q1 — 🔴 Which survivor mechanism?** *(A, B or C — §2. Changes what gets built.)*
My recommendation: **A**. **B** is a legitimate design and I evaluated it on its merits, but it
requires deciding *when a stalled match ends*, which is `0205`'s question and reverses `0022`'s
deliberate comeback behaviour. **C** is the most general and much the largest.

**Q2 — 🔴 A minimum-participation floor?** *(The §11 q3 residual the brief names as unanswered.
Changes what gets built.)* The architect's point stands and was never dismissed: **a player who dies
30 seconds in is paid the same as one who plays to the end** — true at 10, equally true at 1. A floor
(e.g. *survived N ticks past the spawn phase*) is implementable in `qualifiesForMatchXp` and is cheap
**if decided now**; retrofitting it later means re-opening `src/core/` and every test. **I have no
recommendation** — it is a product call about what the award is *for*.

**Q3 — 🔴 Is it acceptable that a stalled-match survivor who is credited mid-match then closes the tab
and keeps the XP?** *(§2.4.)* Ruling 7 reversed the leaver rule for **eliminated** players and said it
*"does not say anything about"* players who vanish without ever being eliminated. **This is exactly
that case.** My read is that it is close to forced by the survivors requirement — if the match never
ends there is no later moment — and that **Q1 and Q3 are the same question from two sides**: only
Mechanism B avoids it, by making the match end.

**Q4 — Should the client suppress the new message entirely when `isLocal`?** *(§ Phase 5.)*
My recommendation: **yes, and it is not the guard you rejected** — the rejected one was a game-type
check in `GameServer`, on a path solo cannot reach. This one is in `Transport`, on the path solo
**does** take, which is the client-side failure your own reasoning identified as the real risk. **The
`4c` test ships either way.** If you prefer test-only, say so and I will do exactly that.

**Q5 — Accept the residual: a survivor of a match that hits the 3-hour cap *without the win condition
ever being met* still gets nothing?** Mechanism A gives that population no trigger. It is uncovered
today too, and I have no evidence it is common. **My recommendation: accept and record it**, rather
than build Mechanism C for it.

**Q6 — Who writes the ADR-101 clarification?** *(§3.5.)* My recommendation: **`fkit-architect`
drafts it, it ships inside `0211`**, with §3.2 as its input. I have not written it.

**Q7 — `migrations/001_player_profiles.sql`'s `xp_awarded … default 10`.** Leave the applied
migration untouched and record it (**my recommendation** — it is inert; the insert always supplies
the value), or add a new migration changing the default to 1?

**Q8 — Confirm the stall brief now gets filed.** The brief records a **reopen condition**: *file the
stall brief IF `0211`'s plan picks a mechanism OTHER than fixing the stall.* **Mechanism A is other
than fixing the stall**, so on approval of A the condition fires. ⛔ **Filing is the producer's, not
mine** — I am confirming the trigger, not acting on it. This is also where the architect's §11 q4
memory residual (unbounded `turns` for up to 3 h) should land; **it is not in `0211`'s scope** and I
am not folding it in.

**Q9 — Does approving this plan discharge the `## Owner` precondition?** *(§7.5.)* The brief says the
*"review the phase-1 findings"* precondition and the *"build it"* ruling **pull against each other and
that nobody has reconciled them.** This plan is the phase-1 findings. **I am asking rather than
assuming.**

---

## 9. What happens on approval

1. ~~Answers to **Q1–Q3** at minimum; **Q4–Q9** ideally in the same pass.~~ ✅ **DONE — §0.5.**
2. Build Phases 1 → 4 on `dev` **as one change**, in that order.
3. `npm test` + `npm run lint`, with the flake protocol above; the `4d` sweep run and its output
   recorded in the worklog, along with **where the threshold lives and what it moved from and to**
   (the brief requires this explicitly).
4. Ask `@fkit-reviewer` for a **stateful** review against this task's `review.md` ledger, and relay
   its verdict, findings, suppressed list, convergence call and owner-questions to the owner
   **verbatim**.
5. ⛔ **No commit, no push, no task-file move** unless the owner asks. Closing `0211` routes through
   `@fkit-producer`.

---

# ⛔ APPROVED AMENDMENTS A1–A7 — owner-approved 2026-09-12 at the `/fkit-sprint-ship-loop` plan gate

**Status of this section:** the owner approved **the plan as written above, PLUS the amendments below**,
via `AskUserQuestion` in a live lead session on 2026-09-12. Everything above this line is unchanged.
Where an amendment contradicts the text above, **the amendment wins.**

**Validation frame:** re-verified by content against `0488391` (branch `dev`), working tree clean.
The plan's original frame was `7ff60ea`. **Zero source drift:**
`git diff --stat 7ff60ea..HEAD -- src/ tests/ resources/ migrations/` returns empty — the intervening
commits touched only `ai-agents/`, `package.json` and `package-lock.json`.

---

## A1 — 🔴 Phase 4: add `tests/core/WinCheckDeterminism.test.ts` to the test table

This is the only amendment that prevents a surprise red suite. That file's third test asserts the
payload key set **exactly**:

```ts
expect(Object.keys(winConditionUpdates[0]).sort()).toEqual([
  "branch", "isTutorial", "leaderKind", "leaderSharePercent",
  "lobbyType", "mode", "type",
]);
```

Adding `winnerDeclarable` makes this fail. **Add a row to the Phase 4 table:**

> | `tests/core/WinCheckDeterminism.test.ts` | The `"carries no identifiers of any kind in the payload"` whitelist gains `"winnerDeclarable"` (sorts last, after `"type"`). ⛔ **This test going red on the new field is the pin working** — it is the key-set pin, and it must be updated deliberately, never loosened to a subset match. The two determinism assertions above it must stay green untouched: the new field is derived from game state and config only, so it is inert with respect to the hash. |

**And amend the plan's Risks row** *"The `WinConditionCheck` payload stops being client-free ⇒ desync"*:
the mitigation column currently says the property is *"secured by design, not by test"*. That is true of
the *two-clients-compose-the-same-event* property — but it **understates existing coverage**: a key-set
whitelist test does exist and does fire on this change. Replace the mitigation with: *"secured by design
for the client-freeness property; the key set is additionally pinned by
`tests/core/WinCheckDeterminism.test.ts`, which this change must update."*

## A2 — ✅ Phase 3's open plan-step is DISCHARGED (checked at validation)

The plan says: *"Plan step, must be checked before writing: confirm `logWinConditionCheckAnalytics`
enumerates the fields it sends explicitly…"*

**Checked. It enumerates them explicitly** — `src/client/WinConditionAnalytics.ts`, the
`winConditionAnalyticsEventName` return expression interpolates `update.mode`, `update.lobbyType`,
`update.branch`, `update.leaderKind`, and `logWinConditionCheckAnalytics` passes
`update.leaderSharePercent` as the value. **No spread anywhere.** ⇒ `winnerDeclarable` cannot leak into
`0208`'s Part B event. Replace the plan step with this finding; close the corresponding Risks row
(*"The new `winnerDeclarable` field leaks into `0208`'s still-open Part B analytics event"*) as
**verified closed, no action**.

## A3 — ⚠️ `winnerDeclarable` is a COMPOSITE predicate, not `clientID() !== null`

Phase 3 says *"compute the existing clientless-leader guard predicate into a local once"* — correct
instruction, but state the expressions so nobody implements the simpler, wrong thing:

> **FFA** — `winnerDeclarable === false` ⟺ `max.clientID() === null && (gameConfig.gameType !== GameType.Singleplayer || gameConfig.isTutorial === true)`.
> **Team** — `winnerDeclarable === false` ⟺ `max[0] === ColoredTeams.Bot && gameConfig.gameType !== GameType.Singleplayer`.
>
> ⛔ **`winnerDeclarable = max.clientID() !== null` is WRONG**: in non-tutorial Singleplayer FFA a
> clientless leader **is** declared the winner. Both guards carry a Singleplayer carve-out; the local
> must be the guard's whole condition, not its first clause.

**And amend the Phase-4 `WinCheckExecution` row:** its expectation list (*`false` for FFA Bot/Nation and
Bot team; `true` for Human, AiPlayer, Nations team*) holds **only for a Public/Private lobby**. Add:
*"plus the Singleplayer and tutorial cases — `winnerDeclarable === true` for a non-tutorial Singleplayer
clientless FFA leader and for a Singleplayer Bot team; `false` for a tutorial Singleplayer clientless FFA
leader. The existing file already sets up all three lobby shapes."*

## A4 — 📌 The `WinCheckExecution` test is an EXTENSION, not a new file

Plan Phase 4 lists it as **new**. `tests/core/executions/WinCheckExecution.test.ts` already exists (note
the directory is **`executions`**, plural), and its
`describe("WinCheckExecution win-condition instrumentation (task 0208)")` block already covers a
clientless Bot leader, a clientless FakeHuman nation, a Human, an `AiPlayer`, a Bot team, a clientless
Nations team, private-vs-public, singleplayer/tutorial, and the once-per-match latch. **The
`winnerDeclarable` assertions are added to those existing cases.** Cheaper than the plan implies;
nothing lost.

## A5 — ⚠️ Latch-name collision in `ClientGameRunner`

Plan Phase 2 says to emit *"beside the existing `hasReportedParticipation` / `hasProcessedWin` latches"*.
The **location** is right, but `private hasReportedParticipation = false;` already exists and belongs to
the **platform-leaderboard** reporter (`reportParticipation` from `./leaderboard/LeaderboardReporter`) —
nothing to do with XP. ⛔ **Do not reuse or overload that name.** Add: *"the two new latches must be
distinctly named (e.g. `hasReportedXpEliminationParticipation` / `hasReportedXpStallParticipation`) —
`hasReportedParticipation` is taken by the leaderboard reporter and merging them would silently couple
two unrelated features."* `this.transport` is available on the same class (constructor parameter), and
`this.transport.isLocal` is already used there, so no new plumbing.

## A6 — ⚠️ The shared elimination predicate has THREE call sites, not two

Plan Phase 2 says the extracted helper is *"used by both `ClientGameRunner` and `WinModal`'s existing
elimination latch"*. `src/client/graphics/layers/WinModal.ts` carries **two** copies of
`!isAlive() && !inSpawnPhase() && hasSpawned()` — the `eliminationTracked` analytics latch and the
`hasShownDeathModal` modal latch. With the new `ClientGameRunner` emission that is **three**. Amend to
*"three call sites"*; it strengthens the plan's own *"Low, insidious"* drift rationale rather than
changing it.

## A7 — ✅ The ADR-101 clarification has ALREADY LANDED — the build carries no ADR work

Plan §3.5 says *"I have not written it and will not without the owner's say-so"*; §0.5 row 7 and brief
Ruling 15 route it to the architect, *"and it ships inside `0211`"*.

**It is written and committed.** `ai-agents/knowledge-base/decisions/adr-101-fail-soft-xp-crediting-no-durable-queue.md`
carries a **`📌 Clarification — 2026-09-12 (architect)`** block, covering the trigger move, the
Mechanism A call-volume consequence, the re-raise Trigger 2 baseline calibration, and an explicit
figures-vs-trigger split table. Amend plan §3.5 and §9 to record it as **discharged externally, before
the build** — the Build worker writes no ADR text and must not wait on the architect.

---

## Unverified at validation — carried forward, not resolved

- The owner's live approvals of 2026-09-11 (the nine plan rulings, the seventeen-row manifest) — no
  cross-context marker exists; the owner channel is session-only (ADR-021). Read as recorded and taken
  as given.
- `0208`'s Team figures (53.2 % clientless-in-front / 52.4 % stall-capable) — not re-derived. The plan
  declines to claim them; validation does not claim them either.
- The architect's `2026-09-04-elimination-time-xp-crediting-design-assessment.md` — not re-read at
  validation. The plan records reading it in full.
- **No tests were run at validation.** "The suite is green today" is NOT a claim. A1 predicts one test
  goes red *when the change lands*, which is the pin working, not a current failure.
