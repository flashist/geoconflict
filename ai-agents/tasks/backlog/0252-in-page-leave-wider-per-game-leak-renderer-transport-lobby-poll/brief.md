# In-page leave (hash / Back / `leave-lobby`) leaks the renderer, canvas, rAF loop and Transport listeners per game and never restarts the public-lobby poll — decide whether to close the route or tear it down fully

## ID
0252

> ℹ️ **ID allocation, checked 2026-09-13 before filing. `0252` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0252-*/` — no matches (highest ID on disk across all three boards was
> `0251`). **2.** `grep -rn "^0252$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.** ⭐
> `grep -rn "0252" .claude/` — **zero hits**. **4.** repo-wide (`node_modules`, `.git`, `static`
> excluded, `.svg` filtered) — zero hits. Duplicate-ID check (`sort | uniq -d` over folder prefixes) —
> empty.

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity; a decorated value is reported as drift. **Do not decorate it.**

🔴 **BACKLOG BOARD BY OWNER RULING, 2026-09-13, given live in the lead session
([`0231`](../../done/0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md)'s plan question
Q3: *"the wider per-game leak on in-page routes — out of scope; the producer files a separate brief at
close"*) and relayed through the spawning `/fkit-sprint-ship-loop` session — ⛔ NOT Sprint 4.** The
owner ruled **that this brief be filed**; **no sprint was named**, so it files here. ⛔ **They did NOT
rule what it is worth, when it is worked, or which of the two fix shapes below to take** — see
*Priority* and *What to build* step 1.

## Priority
Unscheduled *(Backlog board is unranked by design)*

📌 **Producer's rank: Medium.** ⛔ **This is the PRODUCER's rank, not the owner's.** **Medium and not
High** because **the shipped in-game exit buttons are full page navigations** (`FlashistFacade.changeHref`
→ `window.location.href`, the leave running in `beforeunload` — observed by 0231, worklog 1a: the
page's `performance.timeOrigin` changed on every exit), so **none of this is reachable through the
shipped in-game UI today**; and because the one user-facing consequence 0231 found on these routes —
the crashed client ghost-rejoining the match — **is already fixed by 0231**. **Medium and not Low**
because (a) the accumulation, once reached, is fast (net **+40–64 bus listeners per game**, a new
canvas per game, and the **third same-page game fails to start**), (b) **two shipped pre-start
routes do dispatch `leave-lobby`** (leaving a public-lobby card, closing the private-lobby modal) and
**whether Transport's per-`joinLobby` listeners leak on those routes has NOT been measured** — see
*Context*, and (c) how the Yandex Games iframe treats Back / hash navigation has **not been checked**,
so "unreachable" rests on the desktop-browser observation only.

## Status
🔲 Backlog

## Owner
fkit-coder

⚠️ **`fkit-coder`, with a design gate.** Step 1 below is a **product/architecture decision** — close
the in-page route (make it a full navigation, like the shipped buttons) **or** make it a supported route
by tearing everything down. The coder proposes; **the owner decides**, in the plan, before anything is
built. The coder may consult `fkit-architect` for the teardown shape. If the owner picks the full
teardown, **the producer splits this brief** before build (see *Notes*).

## Context

**Filed 2026-09-13 at the close of
[`0231`](../../done/0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md), on an owner ruling
(plan Q3).** 0231 made `ClientGameRunner.stop()` run on every exit route: after an in-page leave the
runner's 1 s reconnect interval is cleared, its Web Worker is terminated, its five bus listeners are
removed, and the unstored 20 s `setTimeout` no longer re-arms after a crash. **Everything else a game
creates on the page still outlives an in-page leave.** 0231's worklog (§3 "after numbers", §Residuals)
measured it directly; this brief carries those observations, plus review residual R1, out of 0231.

📌 **FRAME DECLARATION — every `file:line` below is against the working tree at `fd2c88e` on `dev` plus
0231's uncommitted `src/client/ClientGameRunner.ts` change, read 2026-09-13.** ⚠️ 0231 is **not
committed** at filing time; `ClientGameRunner.ts` and `Main.ts` lines will move. **Re-verify before
relying on any of them.**

### The routes — which are shipped and which are not

| Route | How it reaches `handleLeaveLobby` | Shipped? |
|---|---|---|
| Sidebar / in-game exit buttons | **They don't.** `FlashistFacade.changeHref` → `window.location.href`; the leave runs in `beforeunload`. Full page reload. | Yes — **and it is a full navigation, so nothing below applies to it** |
| URL hash change in-game, or Back after a `pushState` | `hashchange` / `popstate` → `onHashUpdate` → `handleLeaveLobby()` when `gameStop !== null` (`Main.ts:503-516`) | Reachable by a player typing in the address bar or pressing Back; **not** a button. ⚠️ Iframe (Yandex Games) behaviour **unchecked** |
| `document.dispatchEvent(new CustomEvent("leave-lobby"))` | listener at `Main.ts:287` | Synthetic — 0231's test route |
| Leaving a **public-lobby card** before the game starts | `PublicLobby.ts:345` dispatches `leave-lobby` | **Yes, shipped — pre-start only** |
| Closing the **private-lobby modal** (`closeAndLeave`) | `JoinPrivateLobbyModal.ts:137` dispatches `leave-lobby` | **Yes, shipped — pre-start only** |

⚠️ **The two shipped pre-start routes were NOT measured by 0231** (its 1b/1c/1d all left an
already-started game). On those routes no `GameRenderer` exists yet, so the canvas / rAF / renderer
half cannot apply — but `joinLobby()` has already run, and **Transport registers its bus listeners in
`joinLobby`**, so **the +24-listeners-per-join half is reasoned to apply. Reasoned from code, not
observed.** Measure it first (step 2).

### What outlives an in-page leave after 0231 — observed, not reasoned

All numbers from 0231's worklog, one browser instrument, same-page repeated games:

- **The canvas node is never removed** — document canvases **1 → 2 → 3** across three same-page games
  (after-1c, after-1b).
- **`GameRenderer.renderGame`'s `requestAnimationFrame` loop keeps re-scheduling** for the dead game.
- **Transport registers 24 listeners on `Main`'s long-lived bus per `joinLobby` and never removes
  them** — +24 per join, seen directly.
- **Renderer / layer listeners stay** — the "five-class" probe read **6 / 12 / 18** after each leave =
  3 per renderer, on `MouseUpEvent` and `MouseMoveEvent`; `window` resize / pointer / key listeners
  from `GameRenderer.initialize` / `InputHandler.initialize` stay too.
- **Net bus growth +40–64 listeners per game** (SP hash-leave: 67 → 107 → 147).
- 🔴 **The third same-page game fails to start**: `ClientGameRunner.start()` threw
  `TypeError: Cannot read properties of null (reading 'id')` at
  `TerritoryLayer.paintTerritory ← TerritoryLayer.init ← GameRenderer.initialize` (stale in-page
  renderer state), so `transport.connect` was never reached; the armed 20 s timer then reconnected on
  `joinLobby`'s handlers and **built a new runner every ~5 s**, each failing the same way. Two of those
  cascade runners stayed unreachable (2 game workers, 1 interval, reconnects 2 → 4). **The in-page leave
  is an unsupported route today, not merely a leaky one.**
  - 📌 **Observed by [`0032`](../0032-investigate-null-id-errors/brief.md) (2026-09-14) — the cause of
    this failure is NOT stale renderer state; it is the terrain-map cache, and `0032` has fixed it
    (uncommitted, undeployed at the time of this note).** `TerrainMapLoader` cached the *built*
    `GameMapImpl`, whose `state: Uint16Array` carries tile ownership, and handed the same mutable object
    to every game on a map+size. A second same-page game on that map therefore started with the previous
    game's ownership still in the tiles while the new `GameView.smallIDToID` was empty →
    `owner(tile)` → `null` → `paintTerritory` throws on `owner.id()` in `TerritoryLayer.init` — exactly
    the stack above (`0032/worklog.md`, Step 3, B/D/E). `0032`'s fix makes every `loadTerrainMap` call
    build **fresh** `GameMapImpl`s from a cached raw source (regression test: tile state written by one
    game does not leak into the next load). **This likely satisfies acceptance criterion 4 below — when
    this task runs, confirm it by re-running the three-game cycle; do not re-investigate the
    `TerritoryLayer` failure.** The listener / canvas / rAF / poll leaks in the other bullets are
    **untouched** by `0032`. Note also `0032`'s worklog names these in-page routes (hash/Back rejoin,
    `join-lobby` while `gameStop !== null`, pre-start `leave-lobby`, the 0231-era cascade) as the only
    reachable second-game routes — the shipped exits are full navigations — which is consistent with
    this brief's route table. (Recorded by a spawned `fkit-producer` on the ship-loop driver's
    instruction; not an owner ruling; status and rank unchanged.)
- **The public-lobby poll is stopped at join and never restarted after a leave.** `publicLobby.stop()`
  runs in `onPrestart` (`Main.ts:750`) and `onJoin` (`Main.ts:771`); `handleLeaveLobby`
  (`Main.ts:949-962`) calls `publicLobby.leaveLobby()` but nothing calls `start()` — only
  `connectedCallback` (`PublicLobby.ts:62-68`) arms the interval. **Result: the lobby card goes stale and
  rejoins target already-started or already-ended games.** 0231 had to re-arm the poll from its harness
  to get clean second and third cycles at all.

### Review residual R1 from 0231 — the Main-side half of a local-only window

On a **local** game (tutorial / mission singleplayer, where `LocalServer.start()` awaits
`buildMissionConfigIfNeeded()` before emitting `start`, `LocalServer.ts:66-99`), a hash / Back leave that
lands inside that await still fires Main's `onPrestart()` / `onJoin()` (`ClientGameRunner.ts:210-217`)
before the `.then` sees `left`. 0231 tears the runner down in that case (worker, 5 ms turn interval via
`endGame()`), **but Main's UI hide and performance-monitor restart run once more for a game that is
already gone.** Remote games cannot reach this window — `killExistingSocket()` nulls `onmessage`
(`Transport.ts:753`). Pre-existing on `HEAD`; low severity (sub-second window, tutorial/mission SP,
hash/Back only). **Fix seat is `Main.ts` (`onPrestart` / `onJoin`) or `LocalServer.start()`** — outside
0231's one-file plan, which is why it is here. An early `if (left) return` in `joinLobby`'s `onmessage`
was **considered and rejected** in 0231's review: it would skip the late `start()`'s `endGame()` and leak
the 5 ms interval instead — a trade, not a fix. Do not re-propose it. ⚠️ **Under option A below this
window disappears with the route; under option B it needs its own guard.**

### Related, not in scope

- **Multiple `start` messages on one `joinLobby` transport build multiple runners; only the last is
  reachable from the closure** — 0229's shape, now observed by 0231 in after-1b c3 under the
  `TerritoryLayer` failure. Not this brief; it stays with 0229.
- [`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md) (stale `gameStop` across awaits) and
  [`0233`](../../done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md) (the three
  modal sites) touch the same `Main.ts` seams — coordinate line numbers, do not fold them in.
- [`0232`](../../done/0232-worker-tick-error-never-reaches-main-thread/brief.md) /
  [`0251`](../0251-worker-async-message-handler-throws-never-reach-main-thread/brief.md) — worker error
  surfacing; unrelated mechanism.

## What to build

**Step 1 — the decision, put to the owner in the plan before any code.** Two shapes; the coder proposes
one with its tradeoff, the owner rules:

- **Option A — close the route.** Make the in-game in-page leave (`onHashUpdate` when a game is live, and
  a `leave-lobby` that arrives while a game is live) do what the shipped exit buttons already do: a full
  navigation via `FlashistFacade.changeHref`. Everything in *Context* then dies with the page, R1's
  window included, and the pre-start `leave-lobby` routes are left as they are. **Tradeoff:** Back /
  hash navigation in a live game becomes a reload rather than a return to the menu; whether anyone
  relies on that today is **unknown** — check analytics / the Yandex iframe behaviour before choosing.
  Smallest change; **does not** make the in-page route supported, it removes it.
- **Option B — make the route supported: full per-game teardown.** On `handleLeaveLobby` (and on
  `onGameEnd`), remove the canvas, cancel the rAF loop, remove Transport's bus listeners, dispose the
  renderer / layers / `InputHandler` and their `window` listeners, restart the public-lobby poll, and
  guard the R1 window. **Tradeoff:** several files (`GameRenderer`, `Transport`, `InputHandler`,
  `Main.ts`, layers), a new dispose seam per subsystem, and the third-game `TerritoryLayer` failure has to
  be understood, not just made to go away. **If B is chosen, stop and return this brief to the producer
  to split** — see *Notes*.

**Step 2 — measure the two shipped pre-start routes first, whichever option is chosen** (leave a
public-lobby card ×3, close the private-lobby modal ×3, same instrument as 0231): bus-listener count and
Transport listener count before / after each. If they leak, that slice is **shipped-route reachable**
and its fix (Transport listener removal on the pre-start leave) belongs in this brief under either option
— option A does not cover it. If they do not leak, record the refutation.

**Step 3 — implement the ruled option**, with the same instrument 0231 used, before and after.

**Step 4 — public-lobby poll:** under option B, restart it on every in-page leave; under option A, only
if step 2 shows a pre-start leave leaves it stopped (check: does `PublicLobby.leaveLobby()` leave the
interval cleared?).

## Verification steps

1. **Route inventory confirmed at plan time**, every `file:line` in *Context* re-verified against the
   working tree the plan is written on.
2. **Step 2's measurement recorded** for both shipped pre-start routes — numbers, not adjectives —
   and a plain statement of whether the Transport-listener leak is shipped-route reachable.
3. **Option A:** an in-game hash change and an in-game Back after `pushState` each produce a full
   navigation (`performance.timeOrigin` changes; canvases = 1; bus listeners at the menu baseline
   afterwards). The pre-start `leave-lobby` routes still return to the menu without a reload.
4. **Option B:** three same-page games via hash-leave, MP and SP, with **no harness poll re-arm**:
   after each leave canvases = 1, the rAF loop is not scheduled, bus-listener count returns to the
   pre-join count (Transport's 24 and the renderer's 3 gone), `window` listener count returns to the
   pre-join count, the public-lobby card refreshes on its own, and **the third game starts without the
   `TerritoryLayer` error**. *(📌 2026-09-14: the `TerritoryLayer` half of this criterion is likely
   already met by `0032`'s `TerrainMapLoader` fix — see the note in Context. Confirm by observation,
   and say plainly whether it was `0032` or this task that made it pass.)*
5. **R1 (option B only):** tutorial / mission SP, hash-leave inside the build window (drive it with a
   delayed `buildMissionConfigIfNeeded`): Main's UI hide and monitor restart run **zero** extra times
   after the leave.
6. **0231's `tests/client/ClientGameRunnerTeardown.test.ts` still passes**, and any new dispose seam
   has a jest test where the environment allows it (jest `testEnvironment` is `"node"`; say plainly
   what could only be verified in the browser).
7. `npm test`, `npm run lint`, `npx tsc --noEmit` green; `src/core/` untouched unless the plan says
   otherwise and why.
8. **Criterion 6 from 0231 re-run** (real join → play → shipped exit → rejoin, MP and SP) so the shipped
   path is shown unchanged.

## Notes

- **Depends on:** [`0231`](../../done/0231-orphaned-clientgamerunner-on-normal-leave-lobby/brief.md)
  — same file (`ClientGameRunner.ts`), same `onGameEnd` / `stop()` seam; 0231 is **uncommitted** at
  filing time, so this must not start until it lands in git.
- **Blocks:** nothing.
- **Why one brief and not three (or four).** The pieces *look* separately shippable — lobby-poll
  restart (`Main.ts`, tiny), Transport listener removal, renderer / canvas / rAF / `window` teardown,
  the R1 guard — but **every one of them is moot under option A**, which is a one-site change. Filing
  four briefs and then cancelling three is worse than one brief with a decision gate. **If the owner
  rules option B, the producer files the split at that point**, in this order, each independently
  verifiable: (B1) public-lobby poll restart — first, because nothing else can be verified over three
  cycles without it; (B2) Transport listener removal on leave; (B3) renderer / canvas / rAF / `window`
  teardown and the `TerritoryLayer` third-game failure; (B4) the R1 guard. B2 may be pulled forward
  into this brief under either option if step 2 shows it is shipped-route reachable.
- **Owner-ruled facts vs producer's:** the *filing* and the *Backlog board* are the owner's ruling
  (2026-09-13, plan Q3). The rank (Medium), the two-option framing, the split plan, and the claim that
  the pre-start routes are unmeasured are the **producer's**, made from 0231's records this turn.
- **Open to the owner at plan time** (the coder must put these, not decide them): (1) A or B; (2) is
  Back-button-leaves-the-game a behaviour we want at all inside the Yandex iframe; (3) if B, confirm
  the split above.
- **Hand-off from [`0032`](../0032-investigate-null-id-errors/brief.md)'s review R1 (2026-09-14) —
  applies under option B only.** `0032`'s fix means **each game now allocates its own `GameMapImpl`s**
  (`state` + the `refToX`/`refToY` lookup tables, map + minimap): **≈85–180 MB per build on
  `Giant_World_Map`, ≈50–130 MB on the 4–6 M-tile maps.** On the shipped full-navigation exits this is
  identical to today's first-game cost (the page dies with the old copy). **Only on the in-page routes
  this brief owns does the old copy survive alongside the new one** — and only while the old
  renderer / `GameView` leak the other bullets describe still holds it. The cheaper shape — share the
  immutable `refToX`/`refToY`/terrain across builds and allocate **only `state` (≈16 MB on the largest
  map) per game** — is a `GameMapImpl` constructor change that `0032` accepted as a residual and
  handed here. **If option B is chosen, fold it into split part B3** (renderer / `GameView` teardown),
  since the leak and the allocation are the same object's lifetime; under option A it is moot. Not a
  new dependency; status and rank unchanged. (Recorded by a spawned `fkit-producer`; not an owner
  ruling.)
- ⚠️ **No figure for user impact may be written for this task until measured on a shipped route.** The
  only shipped routes that reach any of it are the two pre-start leaves, and they are unmeasured.
