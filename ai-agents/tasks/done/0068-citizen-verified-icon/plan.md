# Plan — Task 0068: Citizen Verified Icon

## Approval record

**Approved by the owner on 2026-08-28**, via `AskUserQuestion` in the fkit-lead session, driven by
`/fkit-sprint-ship-loop`. The plan below is the text returned by the planning `fkit-coder` worker,
reproduced verbatim, **followed by the owner amendments recorded at the end of this file.** Where an
amendment and the plan body disagree, **the amendment wins.**

⚠️ **Honesty note on this gate (ADR-031 / ADR-032 D7).** On the orchestrated sprint-ship-loop path,
"no source before the owner approves the plan" is enforced by a **prompt instruction to the spawned
worker, not by plan mode's structural write-wall** — that wall cannot run in a spawned worker, which has
no owner channel (ADR-021). The owner was told this plainly. Do not later rewrite this into a claim of a
structural guarantee.

---

## Bullet summary

- **The hard part solves itself with an existing seam.** `POST /internal/v1/profile/upsert` — which the
  game server *already* calls at join — **already returns the profile's `is_citizen`**
  (`src/profile-server/Routes.ts:231`, `toPublicProfile` keeps it). We currently throw that response
  away. Reading it adds **zero new HTTP calls, zero new endpoints, zero new trust seams, zero added
  rate-limit load**.
- **The flag never enters the deterministic simulation.** `GameView` (main thread, outside the Web
  Worker) already receives the frozen start roster and builds a `Map<clientID, cosmetics>` for display
  (`src/core/game/GameView.ts:461, 476-478`). The citizen flag rides that exact precedent. `PlayerInfo`,
  `GameImpl`, `PlayerImpl.hash()`, and `GameUpdates` are **untouched**.
- **The flag is server-authored end-to-end** — no client-supplied path exists, so it cannot be spoofed.
  `PlayerSchema` is only ever *produced* by `GameServer.start()`; clients only parse it.
- **Scope limit the owner should see before approving:** the **public quick-play lobby has no player
  list at all** (`PublicLobby.ts` renders only a `n / max` count). The only pre-match player lists are
  the two **private**-lobby modals. So brief verification step 1 is provable in a private lobby; a
  public-match player first sees icons in-match, on the leaderboard. Building a new public-lobby roster
  is well outside "smallest shippable unit" — not proposed. **→ Owner-accepted; see amendment 2.**
- **Placeholder glyph, no new asset file.** One shared helper module so the follow-up design task edits
  exactly one place.
- **Unverified at plan time:** no tests and no build were run — that was a read-only pass.
- Estimated surface: **~7 source files + 2 lang files + 3-4 test files.**

---

## 1. Determinism / desync argument (the load-bearing part)

**Where the flag lives: main-thread display state only. It never reaches the simulation.**

Evidence, verified in code at plan time:

1. `GameServer.start()` (`src/server/GameServer.ts:474-486`) builds **one** `GameStartInfo` object,
   freezes it into `this.gameStartInfo`, and broadcasts that same frozen object to every client —
   including late joiners, who get the identical frozen copy via `sendStartGameMsg`. There is no
   per-client construction and no per-client fetch. **All clients therefore receive byte-identical
   player data.**
2. The client's `createGameRunner` (`src/core/GameRunner.ts:49-59`) is the *only* consumer that feeds
   `gameStart.players` into the simulation, and it reads exactly four things: `username`, `clientID`, a
   `PlayerType`, and a `random.nextID()`. **It will not read `isCitizen`.** `PlayerInfo`
   (`src/core/game/Game.ts:409-423`) gains no field.
3. The main thread separately receives the same `gameStartInfo.players` and passes it to
   `new GameView(..., lobbyConfig.gameStartInfo.players)` (`src/client/ClientGameRunner.ts:305-312`).
   `GameView`'s constructor already turns that roster into a display-only lookup
   (`GameView.ts:476-478`) which `PlayerView` consumes for flags/patterns/colors. **This is the
   existing, shipped precedent for per-player display data that is server-frozen, identical for all
   clients, and outside the worker.** The citizen flag is the same shape of data and takes the same
   road.
4. `Player.hash()` (`src/core/game/PlayerImpl.ts:1138-1143`) hashes `id`, `troops`, `numTilesOwned`, and
   unit hashes. It touches **no** `PlayerInfo` or display field. Even if the flag *were* in the sim, it
   could not move the hash — but it will not be in the sim, so this is a second line of defence, not the
   argument.

**The alternative rejected:** putting `isCitizen` on `PlayerInfo` / `PlayerUpdate` so `PlayerView` reads
it off the wire like `isAlive`. It works and would also be desync-safe, but it is strictly worse: it
grows the per-tick `PlayerUpdate` payload for a value that never changes, it puts display-only data
inside `GameImpl`, and it touches three more core files for no benefit. The `_cosmetics` precedent
already gives a main-thread channel that costs nothing per tick.

**Net desync risk: none identified.** The only shared-state mutation is a new optional field on a
message schema that no simulation code reads.

### Version skew (both directions)

- New server → old client: Zod objects strip unknown keys by default, so an old client silently ignores
  `isCitizen`. No parse failure, no icon.
- Old server → new client: field absent → `.default(false)` yields `false`. No icon.
- Both are consistent *within* a single game because every client in a game gets the same frozen
  payload; a mixed-version match just means some clients don't draw an icon. That is a cosmetic
  difference, not a state divergence.

---

## 2. Change surface

### Server (3 files)

**`src/server/ProfileApiClient.ts`** — `upsertProfile()` (lines 77-98) currently returns
`Promise<void>` and discards `postWithRetry`'s parsed JSON.
- Change return to `Promise<boolean>` — "is this player a citizen", `false` on **every** failure path
  (unconfigured, 4xx incl. the 409 `persistent_id_conflict`, 5xx after retries, malformed body).
- Parse the response with the existing `PublicPlayerProfileSchema`
  (`src/core/profile/PlayerProfile.ts`) and return `parsed.data.is_citizen`; on `safeParse` failure log
  at `warn` and return `false`.
- **The fail-soft contract in the class docstring (lines 23-36) is preserved verbatim**: still never
  throws, still never blocks. Returning a value does not change that.
- `backfillMissingProfiles` (line 205) already calls `upsertProfile` and ignores the result — it keeps
  ignoring it. No behavior change there.

**`src/server/Client.ts`** — add a mutable public field, defaulted, **not** a constructor parameter:
- `public isCitizen: boolean = false;`
- Defaulting it in the field initializer means the single construction site
  (`src/server/Worker.ts:492-504`) needs **no change at all**.
- Comment it as: server-authored, display-only, fail-soft-false — deliberately *not* an entitlement gate
  (nothing of value may ever be gated on this field; the profile server's SQL stays the authority, as it
  already is for the inbox).

**`src/server/GameServer.ts`** — three small edits:
- `upsertProfileForClient()` (lines 1212-1221): keep it fire-and-forget, but attach the result —
  `void this.profileApiClient.upsertProfile(id, client.persistentID).then((isCitizen) => { client.isCitizen = isCitizen; })`.
  Still awaits nothing on the join path. Still sources the id **only** from `getCreditableYandexId()`
  (line 1203) — no second trust seam.
  - *Only ever set `true` from a successful response; never clear an already-`true` flag on a later
    failure.* Prevents a transient outage from blinking a citizen's icon off mid-lobby.
- `addClient()` reconnect branch (lines 231-247): alongside the existing `client.lastPing =
  existing.lastPing` / `reportedWinner` carry-over, add `client.isCitizen = existing.isCitizen;` so a
  lobby reconnect doesn't blank the icon while the fresh upsert is in flight.
- `start()` (lines 477-481): add `isCitizen: c.isCitizen` to the `players` mapping. **This is the single
  point where the flag is frozen for the whole match.**
- `gameInfo()` (lines 912-915): add `isCitizen: c.isCitizen` to the `clients` mapping (the 1 Hz lobby
  poll payload).

### Core (2 files — both require tests per project rule)

**`src/core/Schemas.ts`**
- `PlayerSchema` (lines 437-441): add `isCitizen: z.boolean().default(false).catch(false)`.
  - `.default(false)` gives "optional on the wire, `boolean` in the parsed type" — exactly what the
    brief asks for, with no `?` leaking into every consumer.
  - `.catch(false)` is deliberate and worth stating: `GameServer.start()` **aborts the entire game
    start** if `GameStartInfoSchema.safeParse` fails (lines 487-491). A malformed value in one player's
    field must degrade to "no icon", never to "nobody's game starts." (If `.catch()` after `.default()`
    fights the Zod 4 types at implementation time, drop `.catch` and keep `.default`, and say so.)
  - Side effect to note, not fix: `PlayerRecordSchema` extends `PlayerSchema` (line 610), so the flag
    also lands in game records. Archiving is disabled behind a config switch (ADR-104), and the value is
    already visible to every player in the match, so this is not a new exposure. No action.
- `ClientInfo` (lines 138-141): add `isCitizen?: boolean`. This is a plain TS interface, not Zod — the
  lobby payload is `res.json(game.gameInfo())` consumed by a raw `.json()` in the modals. Optional so no
  consumer breaks.

**`src/core/game/GameView.ts`**
- Add `private _citizenClientIDs = new Set<ClientID>()`, populated in the constructor (right beside
  `_cosmetics`, lines 476-478) from `this.humans`.
- Extract the mapping as a tiny **exported pure function** — `citizenClientIDs(humans: Player[]):
  Set<ClientID>` — purely so it is unit-testable without constructing a `GameView` (which needs a mock
  worker, config and terrain map; no existing test constructs one).
- `PlayerView` gains a 5th constructor arg `isCitizen: boolean` and an `isCitizen(): boolean` accessor,
  mirroring `cosmetics` exactly (ctor at lines 189-194, `clientID()` at 331). Wire it at the
  `new PlayerView(...)` site (lines 519-528) via `this._citizenClientIDs.has(pu.clientID ?? "")`.
- Nations and bots have no `clientID` → `false`. Correct by construction.

### Client (5 files)

**`src/client/CitizenBadge.ts` (new, small)** — one exported Lit helper, e.g. `renderCitizenBadge()`,
returning the glyph wrapped in a `<span class="citizen-badge" title=${translateText("citizen_badge.tooltip")} aria-label=...>`.
**This is the single file the follow-up icon-design task will edit.** Placeholder glyph: a neutral
Unicode mark (recommend `★`) rendered as text — **no new SVG asset, no country/flag imagery, and
explicitly not `🏳️` or any flag-adjacent emoji.** Emoji-as-badge already has precedent in
`PlayerPanel.identityChipProps()` (lines 278-305: `🏛️`/`🤖`/`👤`). No new custom element ⇒ **neither
HTML shell needs updating**, and no `LangSelector.ts:245` re-render-list entry is needed (the four host
components are already listed there).

**`src/client/HostLobbyModal.ts`** — `this.clients` is already `ClientInfo[]` (line 55). Drop the badge
into the existing `.player-tag` chip (lines 541-561), next to the existing `(host)` badge. `.player-tag`
is already `display:inline-flex; gap:8px` (`styles.css:224-234`), so it accommodates an inline badge
with no layout work.

**`src/client/JoinPrivateLobbyModal.ts`** — this one needs a small widening first:
`@state() private players: string[]` (line 20) currently throws away everything but the name (line 317:
`data.clients?.map(p => p.username)`). Change it to hold `ClientInfo[]` and render `${player.username}`
+ badge (lines 84-88).

**`src/client/graphics/layers/Leaderboard.ts`** — the in-match player **list**. `Entry` already retains
the full `PlayerView` (lines 16-26), so **no data plumbing changes** — just mirror the existing
conditional-icon pattern at lines 299-313 (the `humanPlayerIcon` block) with `entry.player.isCitizen()`.

**`src/client/graphics/layers/PlayerPanel.ts`** — the in-match player **panel**. Add the badge in
`renderIdentityRow()` beside the existing identity chip (lines 410-461).

*Deliberately excluded, matching the brief:* `NameLayer.ts` (explicitly out of scope), plus
`PlayerInfoOverlay`, `ChatModal`, `TeamStats` — not the named surfaces. Each is a one-line add later if
wanted.

### Localization (2 files)

`resources/lang/en.json` and `resources/lang/ru.json` — one new section, both files, kept in sync:
```
"citizen_badge": { "tooltip": "…", "aria_label": "…" }
```
No inline strings anywhere; every string via `translateText`. Existing sections `host_modal` (en:306),
`private_lobby`, `leaderboard` (en:625), `player_panel` (en:716) confirm the placement convention.

---

## 3. Fail-soft design

The posture is **inherited, not reinvented** — `ProfileApiClient`'s existing contract (docstring lines
23-36) already guarantees never-throws / never-blocks, and `upsertProfileForClient` is already
fire-and-forget on the join path.

| Failure | Result |
|---|---|
| Profile API unconfigured (no URL and/or token — the local-dev default) | `isConfigured()` false → no-op → `isCitizen` stays `false` |
| Guest / no Yandex ID | `getCreditableYandexId()` returns `null` → no lookup at all |
| Network error / timeout (10s per attempt, 3 attempts) | `postWithRetry` returns `null` → `false` |
| 5xx | retried, then `false` |
| 4xx incl. 409 `persistent_id_conflict` | not retried → `false` |
| Malformed / unparseable body | `safeParse` fails → `warn` log → `false` |
| Response arrives *after* `start()` froze the roster | no icon for that match; player still joins and plays normally |

**Nothing is awaited on the join path**, so a dead or slow profile API cannot delay or block a join by
even one tick. **Nothing surfaces to players** — failures log server-side at `warn`/`debug` only. No new
player-facing error state, no new UI state to design.

**Accepted residuals** (stated now, not at review):
1. A player who joins in the last moment before a public lobby starts, while the profile API is slow, is
   frozen into the roster as a non-citizen for that whole match. Correct-by-design fail-soft; the
   alternative is delaying game start, which the brief forbids.
2. Same for a `update_identity` late-identity refresh (`GameServer.ts:366-377`) that resolves after
   `start()` — the lobby list updates, the frozen match roster does not.
3. Singleplayer shows no icon: `src/client/LocalServer.ts` builds the start info locally and has no
   profile lookup. Field defaults to `false`. Out of the brief's two surfaces; not worth fixing.

---

## 4. Test plan, mapped to the brief's five verification steps

Project rule honored: **both `src/core/` files changed are covered.**

| Brief step | How it is proven |
|---|---|
| **1.** Citizen shows on *another* client's screen | **Automated:** new `tests/server/CitizenFlag.test.ts` — a stubbed `ProfileApiClient` returning `is_citizen: true` ⇒ `gameInfo().clients[i].isCitizen === true` **and** the frozen `gameStartInfo.players[i].isCitizen === true`. This is the precise assertion that the value is *server-authored and broadcast*, not locally derived. **Manual:** local stack, two browser clients, private lobby, one profile row with `is_citizen = true` — icon visible on the *other* client's lobby list and leaderboard. |
| **2.** Non-citizens and guests show no icon | **Automated:** same test file — guest (`yandexPlayerId: null`) ⇒ no lookup performed, flag `false`; non-citizen ⇒ `false`. Client-side: `citizenClientIDs()` yields an empty set ⇒ `PlayerView.isCitizen()` false; nations/bots (`clientID: null`) false. |
| **3.** API down / timeout ⇒ join proceeds, no icon, no player-visible error | **Automated:** extend `tests/server/ProfileApiClient.test.ts` with the full failure matrix from §3 (unconfigured, network throw, 500-after-retries, 409, malformed body) ⇒ each returns `false` and **never throws**. Plus a `GameServer` assertion that the join completes and the client is in `activeClients` when the upsert promise rejects/hangs. |
| **4.** Multi-client desync check, mixed citizen/non-citizen | **Manual, and it is the one that must actually be run:** local multi-client match, `npm run dev`, ≥3 clients with mixed status, played past several 10-tick hash windows; watch for any `desync` server message and confirm the state-hash majority holds. Backed by the structural argument in §1 — no sim code reads the field — but the brief asks for the live check and the plan does not substitute reasoning for it. |
| **5.** `src/core/` covered; en/ru keys in both files | **Automated:** new `tests/core/CitizenFlag.test.ts` — `PlayerSchema`/`GameStartInfoSchema` parse: absent ⇒ `false`, `true` ⇒ `true`, malformed ⇒ `false` (not a whole-payload parse failure), unknown keys stripped (the version-skew case); plus `citizenClientIDs()` mapping. The repo already has a lang-parity test convention (`tests/LangCode.test.ts`) — follow it, or add a direct en/ru key-parity assertion if that file doesn't cover new sections. |

Also run before reporting done: `npm test`, `npm run lint`, and `npm run test:integration`
(`RUN_DB_TESTS=1`, needs `TEST_DATABASE_URL`).

**Verification note:** the local profile stack needs Postgres, i.e. Docker. Per project memory
`open -a Docker` blocks on an interactive admin-password prompt and never comes up from the CLI, so the
owner must have it running. **→ Checked by the lead on 2026-08-28: Docker IS up and a Postgres container
(`gc-0012-it-pg`) has been running for 2 days. This is not a blocker.** Do not poll; if it later proves
unreachable, report which steps were actually run rather than claiming a pass.

---

## 5. Sequencing

1. `Schemas.ts` (`PlayerSchema` + `ClientInfo`) + `tests/core/CitizenFlag.test.ts` — schema first,
   everything else compiles against it.
2. `ProfileApiClient.upsertProfile` return value + its failure-matrix tests.
3. `Client.isCitizen` + `GameServer` (upsert callback, reconnect carry-over, `start()`, `gameInfo()`) +
   `tests/server/CitizenFlag.test.ts`.
4. `GameView` / `PlayerView` + the `citizenClientIDs()` unit test.
5. `CitizenBadge.ts` + en/ru keys.
6. Four UI surfaces (Host lobby, Join-private lobby, Leaderboard, PlayerPanel).
7. `npm test` + `npm run lint`, then the manual local-stack + multi-client run (steps 1-4).

Steps 1-4 are provable without Docker. Steps 5-6 are visual. Step 7's manual half is Docker-gated.

---

## 6. Risks and tradeoffs

- **Highest-risk item is the one the brief names, and it is believed closed:** the flag never enters the
  simulation. Confidence rests on `createGameRunner` reading only four fields and on `Player.hash()`
  ignoring `PlayerInfo` entirely — both read at plan time. Still to be *demonstrated* by the live
  multi-client run, which is why step 4 stays mandatory.
- **`upsertProfile`'s signature changes** from `Promise<void>` to `Promise<boolean>`. Small blast radius
  (two call sites, one of which already ignores the result), but it edits a shipped fail-soft path — the
  docstring contract must survive the edit intact, and the failure-matrix tests exist to prove it did.
- **Reused-endpoint tradeoff.** Riding the existing upsert means the flag is only as fresh as the last
  join. A player who becomes a citizen *mid-lobby* won't show the icon until their next join. The
  alternative — a dedicated read at start — adds an endpoint, a rate-limit exposure, and latency to the
  start path. Not worth it. Worth knowing: calling the *public* `GET /v1/profile` from the game server
  would have been the naive route and is actively wrong — it is IP-rate-limited at 60/min
  (`Routes.ts:173-178`) and a busy game server would 429 itself.
- **Trust level, stated plainly.** `getCreditableYandexId()` returns a client-asserted, unverified id
  (its own docstring says so; ADR-103). A forged id could therefore mint a *cosmetic* icon. This is
  **exactly the trust level already accepted** for XP crediting and the inbox, and the icon carries no
  entitlement — nothing of value is gated on it. When signed-payload verification lands, this path
  inherits the fix for free because it reads through that one seam. **Flagged, not treated as solved.**
- **`JoinPrivateLobbyModal` state widening** (`string[]` → `ClientInfo[]`) is the only non-additive
  client edit. Contained to one component; nothing else reads that field.
- **Public quick-play lobbies get no pre-match icon** because no such list exists. **→ Owner-accepted;
  amendment 2.**
- **Placeholder glyph will look unfinished.** That is the ruling (neutral placeholder now, design as a
  follow-up, `0066` favicon precedent), and the single-helper structure is chosen so the follow-up is a
  one-file change.

---

# Owner amendments — 2026-08-28

Given by the owner via `AskUserQuestion` at the plan gate. **They are part of the approved plan.**

## Amendment 1 — the plan is APPROVED

Approved as written: read `is_citizen` off the upsert response the game server already makes, carry it
on the frozen start roster and the 1 Hz lobby poll, and render a placeholder glyph in the two
private-lobby lists, the in-match leaderboard, and the in-match player panel. **The live multi-client
desync check (brief step 4) stays mandatory and must actually be run** — the structural argument in §1
does not substitute for it.

## Amendment 2 — the public-lobby gap is ACCEPTED, not fixed

Public quick-play lobbies render only an `n / max` count and have no player list, so in public matches a
player first sees citizen icons **in-match** (leaderboard + player panel), never before the match
starts. **Owner ruling: accept this.** Building a player-list UI for public lobbies is a new feature —
it would need its own design (who is shown, ordering, churn as players join and leave) and its own
brief. **Do not build it in this task.**

## Amendment 3 — the icon itself (carried from the 2026-08-28 scoping ruling)

Ship a **neutral placeholder glyph** now; the real icon design is a **separate follow-up task** (the
`0066` favicon precedent). **No country or flag imagery** — Yandex bans real-country flags and names,
and per project memory the `/flags` assets are deliberately suppressed. Do not resurface or borrow from
them. Keep the glyph in the single `CitizenBadge.ts` helper so the follow-up is a one-file change.
