# Elimination-time XP crediting — design assessment

**Date:** 2026-09-04
**Author:** `fkit-architect` (design consult; no source written, no task file touched)
**Requirement:** owner, verbatim — *"We need to implement the logic of giving XP at the time of
elimination OR match-end. If a player got eliminated before the match ended, they need to get XP
right now. All the other players that play the game until the end of the match are given the XP when
the match ends. There also should be logic of not giving XP twice… Is it possible?"*
**Related:** `0206` (being reverted), `0208` (unscheduled measurement),
[ADR-110](../decisions/adr-110-ai-player-may-be-declared-winner.md) (accepted, known expiry).

> **Status: assessment only.** Nothing here is a decision. The owner has ruled on *what they want*,
> not on *how*. Section 11 lists what still needs an owner ruling. **No ADR was written.**

---

## 0. Verdict, first

**YES — it is possible, and it is cheaper than it looks.** Three things that would normally be the
expensive parts of this feature already exist and were verified this run:

1. **The client already detects the exact moment of elimination**, with a once-only latch, and
   already reports it — to analytics, not to the game server
   (`src/client/graphics/layers/WinModal.ts:355-359`).
2. **Double-crediting is already impossible at the database layer**, and this is proven by an
   integration test that includes the *concurrent* case. **This removes a whole class of work** —
   see §4.
3. **The qualification rules need no change.** An eliminated player satisfies all four gates of
   `selectMatchCredits` at the moment of elimination, unmodified — see §5.

**The one genuinely hard part is the trust seam**, and it is smaller than it first appears because
the abuse ceiling is bounded by the same idempotency key: **one credit per (game, account), 10 XP,
enforced by a primary key.** A client cannot mint XP; at worst it can claim its 10 XP earlier than it
earned it.

**Two corrections to assumptions in the brief**, both load-bearing:

- 🔴 **`GameServer.end()` is the WRONG seam, and hooking crediting there would credit *nobody*.**
  Proof in §3. This is not a preference — it is structural.
- 🔴 **The owner's belief that this removes the need for `0206`-style crowning is HALF right.** It
  removes it for *eliminated* players — which was crowning's entire stated justification. It does
  **not** cover *survivors* of a stalled match, who still have no trigger at all. See §7.

---

## 1. What is actually broken today

Every line below was read this run.

| Fact | Evidence |
|---|---|
| `creditMatchXp` has exactly one call site, inside `handleWinner` | `src/server/GameServer.ts:1199` (sole caller of `:1253`) |
| No winner ⇒ no `winner` message ⇒ `handleWinner` never runs ⇒ nobody credited | `GameServer.ts:365-368`, `:1144-1200` |
| A clientless leader (Bot / Nation) reaching the threshold declares **no winner**, and deliberately keeps the check alive rather than ending the match | `src/core/execution/WinCheckExecution.ts:59-70` — returns *before* `this.active = false` |
| The server has **zero** elimination awareness | No `isAlive` / elimination handling anywhere in `src/server/`; the server is a turn relay by design (`src/core/profile/MatchQualification.ts:5-20`) |
| Elimination is a *state transition*, not an event — there is no `PlayerDied` update | `GameUpdateType` enumerated at `src/core/game/GameUpdates.ts:29-49`; death observable only via `PlayerUpdate.isAlive` (`:156`) |
| `isAlive()` is literally "owns ≥ 1 tile" | `src/core/game/PlayerImpl.ts:342-344` |
| Elimination is **terminal** — units deleted, execution deactivated, `killedAt` stamped | `src/core/execution/PlayerExecution.ts:55-71`; `killedAt` written at `src/core/game/StatsImpl.ts:143-147` |
| `killedAt` never reaches the client per-tick — it lives only in the stats blob delivered with the `Win` update | `src/core/StatsSchemas.ts:102`; consumed at `WinModal.ts:500` |
| An eliminated player **stays fully connected** (death modal offers "spectate"); nothing tears down the socket on death | `WinModal.ts:361-372`, `:130-137`; teardown only via `ClientGameRunner.stop()` (`:705-718`), never triggered by death |

**The consequence:** a match's entire XP payout hangs on a single conditional event (a winner being
declared) that a whole class of matches never reaches. That is the defect.

### A second, quieter loss the brief did not name

`selectMatchCredits` excludes any client not connected at match end:

```
disconnected: this.isClientDisconnected(clientID) || !activeClientIDs.has(clientID)
```
— `GameServer.ts:1290-1291`, gate at `MatchQualification.ts:87`.

So **even in a match that ends normally, an eliminated player who closes the tab before the winner is
declared loses their XP.** They died legitimately, they qualified, and they still get nothing. This is
the more common case in practice: dying and leaving is the natural player behaviour. Elimination-time
crediting fixes this too, for free — but see Open question 1, because it silently reverses a rule
that is currently deliberate.

---

## 2. How can the server learn a player was eliminated? (the core question)

### The options

#### Option A — a new client→server message on elimination ✅ **RECOMMENDED**

The client already computes the predicate. `WinModal.tick()`:

```
if (!this.eliminationTracked && myPlayer && !myPlayer.isAlive() &&
    !this.game.inSpawnPhase() && myPlayer.hasSpawned()) {
  this.eliminationTracked = true;
  flashist_logEventAnalytics(flashistConstants.analyticEvents.PLAYER_ELIMINATED, this.game.ticks());
}
```
— `src/client/graphics/layers/WinModal.ts:356-359`.

This is a **Flashist adaptation** already in the fork. It is once-only (latched), it fires at the
right instant, and `this.game.ticks()` is precisely the value the simulation itself passes to
`playerKilled(player, ticks)` (`PlayerExecution.ts:70`) — i.e. it *is* `killedAt`, computed
independently but identically. **The trigger point exists and is proven in production.** All that is
missing is a wire.

`update_identity` is the exact precedent for adding one: schema at `src/core/Schemas.ts:590-599`,
union registration at `:626-634` and `:86-93`, server case at `GameServer.ts:369-380`, client sender
at `src/client/Transport.ts:399-420`.

**Cost:** small and well-bounded. One schema variant, one `case` in the server switch, one
`sendMsg`, one server handler that reuses `selectMatchCredits` unchanged.

**Trust:** the claim is self-reported. Mitigations, in order of how much they buy:
- **Never trust a claimed `clientID`.** Use the authenticated socket's `client.clientID`, exactly as
  the intent path already does (`GameServer.ts:301-306` rejects `intent.clientID !== client.clientID`).
  A client can then only ever claim *its own* elimination.
- **The server can independently verify `hasSpawned`** — spawn is an *intent*, and every intent
  passes through the server (`GameServer.ts:350` → `addIntent` `:697-699`). Recording which clientIDs
  emitted a `spawn` intent gives the server a first-hand signal for one of the four gates, for free.
  This is worth doing: it means a client cannot get XP without actually committing to the match.
- **The abuse ceiling is one credit per (game, account)** — the DB primary key, §4. Verified.

So the residual exposure is: *a modified client claims elimination immediately after spawning and
collects its 10 XP without playing.* It cannot collect twice, cannot collect for another player, and
cannot collect without spawning.

#### Option B — server-side inference from relayed state ❌

The server relays intents; it does not hold tile ownership, and death is a derived property of tile
count (`PlayerImpl.ts:342-344`). To infer elimination the server would have to **run the simulation**
— reversing the single most load-bearing architectural decision in the codebase (*"the server is a
turn relay, never a simulator"*, `CLAUDE.md`; restated at `MatchQualification.ts:5-20`).

**This is the only option that truly closes the trust seam**, and that is worth saying plainly.
It is rejected on cost, not on correctness: a deterministic headless sim per match, on the game
worker, is an enormous change with its own desync surface.

⚠️ **The decisive argument against hardening this seam right now:** the identity being credited is
*itself* unverified. `getCreditableYandexId()` returns the client-asserted Yandex id as-is
(`GameServer.ts:1213-1215`), an accepted risk under ADR-103, blocked on the Yandex secret key.
**Hardening the elimination claim while the account it credits is client-asserted is hardening the
stronger link.** Do the identity seam first; then elimination corroboration becomes the next
sensible step.

#### Option C — reuse the existing disconnect path ❌

Rejected, and the cost is specific: **leaving ≠ being eliminated**, and the codebase already encodes
that distinction as a deliberate product rule. `qualifiesForMatchXp` credits a player who
*"survived to the end or was legitimately eliminated"* and explicitly excludes one who *"spawned but
then vanished without dying"* (`MatchQualification.ts:38-45`). Crediting on disconnect would invert
that rule outright — every rage-quit at spawn becomes a paid match. It is also unavailable as a
signal: `checkDisconnectedStatus` (`GameServer.ts:971-988`) only knows ping timeouts, which say
nothing about tiles.

#### Option D — piggyback a participation snapshot on the existing `hash` channel

Every client already sends a `hash` message on a 10-tick cadence (`Transport.ts:616-630`,
`GameServer.ts:361-364`), and the server already runs a majority vote over those hashes
(`GameServer.ts:1049-1060`, `:1120-1141`). Attaching a compact alive/spawned bitmap would give the
server a **continuously refreshed, multiply-corroborated** view of who is alive — which would cover
*both* elimination and the stalled-survivor case (§7) from one mechanism.

**Genuinely attractive, and deliberately not recommended for the first increment.** It touches a hot
path on every client every 10 ticks, it enlarges the desync-detection message, and it solves the
survivor problem that the owner has not yet decided they want solved (Open question 2). Worth keeping
on the table if the survivor case turns out to matter — it is the natural second increment, and
Option A does not block it.

#### Option E — corroborated elimination (Option A + majority vote)

Broaden the client detector from `myPlayer` to *all* players (cheap — `PlayerUpdate.isAlive` edges
are already delivered per tick for every player, `GameImpl.ts:374-377`) and require agreement from a
majority of active unique IPs before crediting, reusing `handleWinner`'s electorate
(`GameServer.ts:1174-1186`).

**Not recommended now**, for one decisive reason: it degrades to a self-report exactly when it
matters least — with a single connected human (the live case that was investigated), a "majority of
one" is that one player. It would inherit precisely the winner vote's existing trust posture while
costing N× the messages. **Design Option A so this can be added later without reshaping the wire
message** (i.e. the server decides; the message stays a report, not a command).

### Recommendation

> **Option A**, with the authenticated-`clientID` rule and server-side spawn verification, crediting
> immediately by reusing `selectMatchCredits` unchanged. Keep the existing winner path untouched for
> survivors. Accept the self-report risk explicitly, on the grounds that it is bounded to 10 XP per
> (game, account) by a database primary key and that the identity seam is the weaker link.

**Main trade-off, stated plainly:** this accepts a self-reported claim about game state for the first
time. Note the architecture's existing instinct runs the other way — `mark_disconnected` is
*server-authored* and explicitly **rejected** from clients (`GameServer.ts:308-313`,
injected by the server at `:996-1000`). Option A is a genuine, if small, departure from that stance,
and Option E is the pre-designed path back.

---

## 3. Where should match-end crediting hook in? 🔴 Not `end()`

**`GameServer.end()` cannot work, and this is provable rather than a matter of taste.**

`end()` is only ever called from `GameManager.tick()` when `phase()` returns `Finished`
(`src/server/GameManager.ts:132-142`). Read `phase()` (`GameServer.ts:850-909`):

- **Private, started:** `Finished` requires `noActive && noRecentPings` (`:879-883`).
- **Public:** `Finished` requires `noActive && warmupOver && noRecentPings` (`:904-906`).
- **`maxGameDuration` cap (3 h):** the *only* path that returns `Finished` with clients still
  connected (`:867-872`).

`noActive` **is** `this.activeClients.length === 0` (`:875`). So on every path but the 3-hour cap,
`activeClients` is empty by construction when `end()` runs. And `selectMatchCredits` excludes anyone
absent from `activeClients` (`GameServer.ts:1283`, `:1291`; gate at `MatchQualification.ts:87`).

> **Moving the existing crediting call into `end()` would award zero credits in every match that ends
> the normal way.** It would look implemented and do nothing.

**Second, independent blocker:** `end()` has no participation data *at all*. `playerParticipation`
only ever arrives attached to the `winner` message (`Schemas.ts:563-572`), built client-side at
`WinModal.ts:493-509` and computed *only* when a `Win` update is processed. No winner ⇒ the server
never learns who spawned or who died. This is the same root cause as the brief's note that
`archiveGame` reads `this.winner?.allPlayersStats` (`GameServer.ts:1012`) and finds nothing.

**The correct framing** is not "elimination-time vs match-end". It is:

> **Credit each player at the moment *their* match is over.**

| Player's exit | Trigger | Status |
|---|---|---|
| Eliminated | the elimination report (Option A) | **new** — this is the requirement |
| Survives, winner declared | the `winner` message | **already works** (`GameServer.ts:1199`) |
| Survives, no winner ever declared (stall / 3 h cap) | — | 🔴 **no trigger exists** — see §7 |

`end()` is a plausible home only for that third row, and only if it is given a participation source
(Option D) *and* the connected-at-end gate is relaxed — which is a product rule change, not a
refactor. `checkDisconnectedStatus` (`GameServer.ts:971-988`, already a periodic every-5-turns hook
on the tick path) is a better-shaped seam than `end()` if a sweep is ever wanted.

---

## 4. Is the double-credit guard already sufficient? ✅ **VERIFIED — YES**

Checked against the schema and the route, not the comment.

**Schema** — `migrations/001_player_profiles.sql:51-57`:

```sql
create table if not exists player_match_xp_credits (
  game_id          text not null,
  yandex_player_id text not null references player_profiles(yandex_player_id) on delete cascade,
  xp_awarded       integer not null default 10,
  credited_at      timestamptz not null default now(),
  primary key (game_id, yandex_player_id)
);
```

**Write path** — `src/profile-server/PlayerProfileRepository.ts:80-100`. The insert is
`ON CONFLICT (game_id, yandex_player_id) DO NOTHING`, and — this is the part that matters — the XP
increment is **gated on the insert having happened**:

```sql
UPDATE player_profiles p
SET xp = p.xp + (SELECT xp_awarded FROM ins), …
WHERE p.yandex_player_id = $2
  AND EXISTS (SELECT 1 FROM ins)
```

So a duplicate is not merely "not inserted" — **it does not increment XP.** Insert and increment are
one statement, so there is no window between them.

**Route** — `src/profile-server/Routes.ts:324-359` calls that repository method per item and returns
`"duplicate"`; each item is its own transaction, so one bad item cannot roll back the others.

**Proven by test, including the concurrent case** — `tests/integration/PlayerProfileRepository.it.test.ts`:
- `:131` *"creditMatchXp is idempotent on (game_id, yandex_player_id)"* — asserts `xp` is 10, not 20,
  and exactly one ledger row.
- `:261` *"concurrent identical credits apply exactly once"* — two simultaneous credits resolve to
  `["credited", "duplicate"]` with `xp === 10`.

> ### ✅ Stated plainly, because it removes work
> **Elimination-time crediting and match-end crediting are naturally idempotent. No new bookkeeping,
> no "already credited" table, no cross-checking between the two paths is required for correctness.**
> The guard the owner asked for already exists, one layer down, and is tested.

**Three conditions on that, all cheap:**

1. **The `gameId` must be identical on both paths.** `creditMatchXp` uses `this.id`
   (`GameServer.ts:1295`). An elimination credit **must** use the same value — *not* a derived key
   like `${gameId}:elim`. That would defeat the primary key entirely and is the single easiest way to
   get this wrong.
2. **It is a correctness guard, not an efficiency guard.** An in-memory per-clientID latch on the
   server is still worth having so N reports do not become N HTTP round-trips. That is optimisation,
   not correctness — do not let it be described as the double-credit fix.
3. **It does not protect against a *changed* Yandex id.** If a player's `yandexPlayerId` resolves
   late via `update_identity` (`GameServer.ts:369-380`) *between* an elimination credit and a
   match-end credit, the two writes carry different keys and both succeed. Narrow, but real. Worth a
   line in the eventual task.

---

## 5. What qualifies a player for XP — and does an eliminated player qualify *at elimination time*?

`selectMatchCredits` (`src/core/profile/MatchQualification.ts:74-100`) applies four gates. Evaluated
for a just-eliminated player, at the instant of elimination:

| # | Gate | Line | At elimination time |
|---|---|---|---|
| 1 | in `eligibleRoster` (frozen start roster) | `:83` | ✅ passes — they were in `gameStartInfo.players` at start |
| 2 | `qualifiesForMatchXp` | `:84` | ✅ passes — `hasSpawned=true`, `killedAt` defined |
| 3 | known client, not kicked, **not disconnected** | `:86-87` | ✅ passes — an eliminated player **stays connected** (`WinModal.ts:361-372` shows a modal offering "spectate"; nothing closes the socket) |
| 4 | non-null `yandexPlayerId` | `:89` | ✅ unchanged |

**Does anything assume the match has finished? No — only the naming does.**

`qualifiesForMatchXp` is `p.hasSpawned && (p.isAliveAtEnd || p.killedAt !== undefined)`
(`:43-45`). For an eliminated player the second disjunct is satisfied by `killedAt` alone;
`isAliveAtEnd` is not consulted. **The predicate is satisfiable mid-match, unmodified.**

> **Consequence for cost: the qualification core needs no logic change.** The elimination handler
> constructs a single-entry participation array and calls the *same* function. What is misleading is
> the field name `isAliveAtEnd` and the module's "match-end" framing (`:1-17`, `:59-73`) — a rename
> to something like `isAliveNow` plus a comment update would prevent a future reader concluding this
> only works at match end. Cosmetic, but this file is exactly where that misconception would form.

Gate 3 is worth dwelling on: **it is the gate that passes at elimination and fails at `end()`.** That
asymmetry is the whole reason the recommended design credits early rather than late.

---

## 6. Determinism and desync — does the idempotency key absorb multiple reporters?

**Yes, and it is verified rather than assumed** (§4, `…it.test.ts:261` covers the concurrent case).

Elimination is computed independently and identically on every client — `isAlive` is derived from the
deterministic simulation (`PlayerImpl.ts:342-344`) and pushed for every player every tick
(`GameImpl.ts:374-377`). This makes the multiplicity a **feature, not a hazard**: an elimination is an
objective, replicated fact, which is exactly what makes Option E (corroboration) available later.

Under the recommended Option A the question is largely moot — each client reports only *its own*
elimination, so there is one reporter per elimination by construction. The duplicates that do arise
are: reconnects, a second tab, and retries inside `ProfileApiClient` (`:242-283`). All are absorbed by
the primary key.

**Risks that are real, and are not absorbed by the key:**

- **Desynced clients.** A client that has drifted may believe it died when the majority does not.
  `handleWinner` already refuses votes from `outOfSyncClients` (`GameServer.ts:1146`) — the
  elimination handler should apply the **same** guard. This is the one determinism defence that
  genuinely matters and it costs one condition.
- **A false positive is benign but not free.** Because elimination is terminal
  (`PlayerExecution.ts:69-71` deactivates the execution and deletes units), a spawned player cannot
  revive, so an early credit cannot be "taken back" — and the key prevents a second one. The failure
  mode is *crediting slightly early*, never *crediting twice*. That is the right way round.
- **No single authority is needed for correctness.** One would be needed only to raise *trust*, which
  is §2's question, not this one.

---

## 7. Does this make `0206`'s crowning unnecessary? **Half — and the half it removes is the half that justified it**

### Where the owner is right

`0206` and ADR-110 both rest on one chain: *no winner ⇒ no `winner` message ⇒ no crediting.*
ADR-110 states it directly — *"the only thing standing between a match and `creditMatchXp` is that
some winner exists to be voted on"* (T1) — and `0206`'s reason to exist is the whole-match XP loss
(`0206/brief.md:162`, cited in ADR-110 T3).

**Decouple crediting from the winner and that chain breaks.** Crowning a leader purely so the
plumbing fires is then solving a problem that no longer exists. On this, the owner is correct, and it
is the stronger half of the argument: `selectMatchCredits` **already never looks at who won**
(ADR-110 T1, re-verified this run against `MatchQualification.ts:74-100`). Crowning was always an
indirect fix for a plumbing problem, and Option A fixes the plumbing directly.

In the specific live match that was investigated — a Nation at 100 %, every human eliminated —
elimination-time crediting alone would have paid everyone correctly, with no winner and no crowning.

### Where it does not hold 🔴

**Survivors.** A player still alive when a match stalls is never eliminated *and* never sees a
winner. **No trigger fires for them under Option A.** They are not a hypothetical population: the
stall occurs precisely when a clientless leader crosses the threshold
(`WinCheckExecution.ts:59-70`), and any humans alive at that instant are exactly this case.

So:

> **Elimination-time crediting removes crowning from the XP path for eliminated players — which was
> crowning's entire stated justification — but leaves survivors of a stalled match uncovered.
> Crowning is the cheapest existing way to cover them, because it makes the `winner` message fire,
> which credits everyone including survivors.**

The honest conclusion is not "0206 is unnecessary" but **"0206's justification has changed, and it
should be re-argued on its own merits rather than as an XP fix."** That is a producer/owner call, and
Open question 2 is where it lands.

⚠️ **This also perturbs an input to ADR-110** and I am flagging it rather than acting on it. ADR-110's
central argument (T3) is that excluding AI winners *"reopens the whole-match XP loss"*. If crediting
is no longer winner-gated, that argument loses most of its force. Note this does **not** literally fire
the ADR's re-raise trigger — that trigger reads *"match-end XP crediting ever becomes
winner-**dependent**"*, and this makes it *less* so. But the reasoning underneath shifts. **Not
re-raised here; ADRs are not re-opened by a consult.** Worth the owner's attention when `0206` is
re-argued.

### Does the stall itself still need to end?

**Yes — but for different reasons, which likely lowers its priority rather than clearing it.**
With XP decoupled, the remaining costs are:

- **Resources, and this is measurable.** `this.turns` is appended every tick (`GameServer.ts:730`)
  and never trimmed until archive (`:1036`). A stalled match holds a worker slot and grows that array
  until the 3-hour cap (`:56`, `:867`). The observed match logged **11 203 turns** in roughly
  12 minutes; at the cap that extrapolates to on the order of **160 000 turns retained in memory** for
  a single game nobody can win.
- **Player experience.** Survivors sit in a match that can never resolve, with no win screen.

Neither is a correctness bug once XP is safe. **Whether "runs to the cap" is acceptable is a product
call**, and it is Open question 4. My technical read: the memory growth is the part I would not leave
indefinitely, and it is independent of how the winner question is settled.

---

## 8. Design sketch (interface only — no implementation)

Shown to make the shape and the cost concrete. **This is scaffolding, not a spec to build from.**

```ts
// src/core/Schemas.ts — new variant, modelled on ClientUpdateIdentitySchema (:590-599).
// NOTE: carries NO clientID. The server uses the authenticated socket's client.clientID,
// mirroring the intent guard at GameServer.ts:301-306. A client may only report itself.
export const ClientEliminatedSchema = z.object({
  type: z.literal("eliminated"),
  tick: z.number().int().nonnegative(), // == killedAt; the client's this.game.ticks()
});
// …register in ClientMessageSchema (:626-634) and the TS union (:86-93).
```

```ts
// src/server/GameServer.ts — new case beside "winner" (:365) and "update_identity" (:369).
/**
 * Credit a self-reported elimination immediately. Fire-and-forget, fail-soft — must
 * never block or error the match, exactly as creditMatchXp (:1253) is today.
 * Reuses selectMatchCredits UNCHANGED with a single-entry participation array.
 * Idempotency is the profile server's (game_id, yandex_player_id) PK — so this and a
 * later match-end credit for the same player are safe. MUST use this.id as gameId.
 */
private handleEliminated(client: Client, msg: ClientEliminatedMessage): void {
  throw new Error("not implemented"); // TODO(coder)
  // Guards, in order:
  //  - this.outOfSyncClients.has(client.clientID)  → ignore (mirrors :1146)
  //  - this.kickedClients.has(client.clientID)     → ignore
  //  - already-reported latch for this clientID    → ignore (efficiency, not correctness)
  //  - server-verified spawn: did this clientID emit a "spawn" intent? (see §2, Option A)
}
```

Implementation notes the eventual task will need:

- **Client emission** belongs in `ClientGameRunner`'s update callback, beside the existing
  `hasReportedParticipation` / `hasProcessedWin` latches (`:502-537`), not in `WinModal` — reporting
  is not a UI concern. ⚠️ **The predicate must match `WinModal.ts:356` exactly**
  (`!isAlive() && !inSpawnPhase() && hasSpawned()`) or the two will drift.
- **`src/client/LocalServer.ts:174` must tolerate the new message type** — `Transport.sendMsg`
  (`:690-711`) routes to it for singleplayer.
- **Tests have a home:** `tests/server/GameServerWinner.test.ts` and `tests/core/profile/` are the
  existing patterns. `src/core/` changes are mandatorily tested (`CLAUDE.md`).

---

## 9. Cost

| Piece | Size | Why |
|---|---|---|
| Client elimination detector | **XS** | Predicate already exists and is proven (`WinModal.ts:356`); it needs an emitter, not a detector |
| New wire message | **S** | `update_identity` is a complete precedent; 4 mechanical touch points |
| Server handler | **S** | Reuses `selectMatchCredits` **unchanged**; guards mirror `handleWinner` |
| Server-side spawn verification | **S** | Record clientIDs seen on `spawn` intents at `addIntent` (`:697-699`) |
| Double-credit bookkeeping | **NONE** | Already guaranteed and tested at the DB layer (§4) |
| Qualification rule changes | **NONE** | All four gates pass as written (§5); a rename is cosmetic |
| Tests | **M** | The real cost — server handler, guards, idempotency across both paths |
| Survivor / stall coverage | **not in this scope** | §7, Open question 2 |

**Overall: small-to-medium, and dominated by tests rather than by mechanism.** The reason it is small
is that the three pieces that would normally dominate — the detector, the qualification rules, and
the idempotency guard — all already exist.

---

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Self-reported elimination is a farming surface | **Medium** | Bounded to 10 XP per (game, account) by the DB PK (§4); authenticated `clientID` only; server-verified spawn. Residual accepted — the identity seam is weaker (`GameServer.ts:1213-1215`, ADR-103) |
| Different `gameId` on the two paths defeats idempotency | **High if it happens, trivial to avoid** | Must use `this.id`; call it out in the task and assert it in a test |
| Desynced client reports a false elimination | **Low** | Apply `outOfSyncClients` guard as `handleWinner` does (`:1146`); false positives credit *early*, never *twice* |
| Client-side predicate drifts from `WinModal`'s | **Low, insidious** | Extract one shared predicate rather than copying the condition |
| Late `update_identity` between the two credits ⇒ two different keys ⇒ two credits | **Low** | Narrow race; note it in the task (§4, condition 3) |
| Reads as a departure from server-authored state transitions | **Low but architectural** | Real: `mark_disconnected` is server-authored and client-rejected (`:308-313`). Option E is the designed path back; keep the message a *report*, not a command |
| Survivors of a stalled match still uncovered | **Medium** | Not solved here — Open question 2 |

---

## 11. Open questions — for the owner (I have no channel; these are yours to put)

1. 🔴 **Does crediting at elimination deliberately reverse the leaver rule?** Today an eliminated
   player who closes the tab before the winner is declared gets **nothing** (the `disconnected` gate,
   `MatchQualification.ts:87`). Crediting at elimination means they keep it. The requirement as
   worded (*"they need to get XP right now"*) reads as **yes, intended** — and it is arguably the
   most valuable part of the change — but it is a real change to a deliberate rule
   (`MatchQualification.ts:38-42`), so it should be intended rather than inherited.
   *My read: yes, and it is a good change.*

2. 🔴 **Should a survivor of a never-resolving match get XP, and via what trigger?** This is the gap
   Option A does not close (§7) and the question that decides whether `0206`-style crowning still has
   a purpose. Three shapes: (a) crown a leader so the winner path fires — cheapest, what `0206` did;
   (b) a participation snapshot on the `hash` channel (Option D) — most general, more invasive;
   (c) accept the loss for this population. *No recommendation without knowing how often it happens —
   which is what `0208` would measure.*

3. **Is 10 XP flat still right when the trigger moves earlier?** `XP_PER_MATCH = 10`,
   `CITIZENSHIP_XP_THRESHOLD = 1000` (`src/core/profile/Citizenship.ts:15-18`) — so citizenship is
   100 matches. Dying 30 seconds in now pays the same as surviving to the end, and pays *sooner*. Is
   that acceptable, or should there be a minimum-participation floor (e.g. survived N ticks)?
   *This is a product call, not a technical one.*

4. **Does the stall still need fixing once XP is decoupled?** The remaining costs are memory (an
   unbounded `turns` array for up to 3 hours, §7) and the survivor experience — not XP.
   *My read: the memory growth should not be left indefinitely, independent of the winner question.*

5. **Should `0208` (measurement) run before or after this?** Option A is worth doing regardless — it
   fixes the eliminated-and-left case, which is common and does not depend on stall frequency. But
   question 2's answer depends on data only `0208` provides. *Suggested: ship Option A, run `0208`,
   then decide the survivor case.*

---

## 12. Incidental findings — reported, not fixed (no source was touched)

1. **`ClientGameRunner.ts:428` — `const placement = +1;`** Hard-coded to `1` where `myIndex + 1` is
   plainly intended (points are correct via `awardTable[myIndex]`). Harmless **today** because
   `placement` only reaches a `console.debug` (`LeaderboardReporter.ts:53-58`) — a live trap the
   moment placement is actually reported.

2. **`MatchQualification.ts` naming implies a constraint it does not have.** `isAliveAtEnd` and the
   "match-end" framing throughout (`:1-17`, `:59-73`) suggest the module only works at match end. It
   does not (§5). This is precisely where a future reader would form the wrong belief.

3. **`WinModal.buildPlayerParticipation`'s comment is still wrong** (`:487-492`: *"AI players return
   null and are skipped"* — they have real `clientID`s and are **not** skipped at `:498-499`).
   Already recorded as ADR-110's Open question 4, still open. Re-confirmed this run. Harmless —
   AI entries are discarded by the server's roster gate.

4. **`GameImpl.players()` filters to alive; `GameView.players()` does not**
   (`GameImpl.ts:421-423` vs `GameView.ts:632-634`). Correct as-is — it is why participation
   includes dead players and why ADR-110 T3 holds — but the same method name meaning two different
   things across the sim/view boundary is a trap worth knowing about.

---

## What was read this run

`src/server/GameServer.ts` (`:56`, `:300-408`, `:697-730`, `:792-844`, `:850-938`, `:940-1001`,
`:1003-1060`, `:1120-1306`) · `src/server/GameManager.ts:110-148` ·
`src/server/ProfileApiClient.ts` (full) · `src/core/profile/MatchQualification.ts` (full) ·
`src/core/profile/CreditContract.ts` (full) · `src/core/profile/Citizenship.ts:15-26` ·
`src/core/Schemas.ts` (`:75-118`, `:530-604`) · `src/core/execution/WinCheckExecution.ts:55-75` ·
`src/core/execution/PlayerExecution.ts:40-79` · `src/core/game/GameImpl.ts:418-426` ·
`src/core/game/GameView.ts:628-641` · `src/client/graphics/layers/WinModal.ts:345-394`, `:483-527` ·
`src/profile-server/Routes.ts:318-359` · `src/profile-server/PlayerProfileRepository.ts:16-135`,
`:221-232` · `migrations/001_player_profiles.sql` (full) ·
`tests/integration/PlayerProfileRepository.it.test.ts:76-274` ·
`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md` (full).

Client-side elimination/participation plumbing (`GameUpdates.ts`, `PlayerImpl.ts`, `StatsImpl.ts`,
`ClientGameRunner.ts`, `Transport.ts`, `LeaderboardReporter.ts`, `LocalServer.ts`) was traced by a
delegated read-only search agent; its `file:line` citations are carried through above and the ones
load-bearing for the recommendation were independently re-verified.
