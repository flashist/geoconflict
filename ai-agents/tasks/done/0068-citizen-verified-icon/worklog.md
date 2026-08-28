# Worklog — Task 0068: Citizen Verified Icon

Built by `fkit-coder`, spawned as the **Build worker** of `/fkit-sprint-ship-loop` on 2026-08-28,
under the loop's declared-approval marker (owner approved `plan.md` via `AskUserQuestion` in the lead
session). The approved plan and its three amendments were the scope boundary; nothing outside them was
built.

**Working-tree caveat:** the tree already carried task 0067's uncommitted work when this started. The
change surface below is 0068's only. Nothing belonging to 0067 was reverted, reformatted or "fixed".

---

## What was built

Implemented in the plan's stated sequence.

### 1. Schema (`src/core/Schemas.ts`)
- `PlayerSchema` gains `isCitizen: z.boolean().default(false).catch(false)`. `.catch` kept as planned —
  Zod 4 accepted `.default().catch()` with no type fight, so the plan's fallback ("drop `.catch`") was
  not needed.
- `ClientInfo` gains `isCitizen?: boolean` (plain TS interface, optional).

### 2. `src/server/ProfileApiClient.ts`
- `upsertProfile` returns `Promise<boolean>` instead of `Promise<void>`, parsing the response the
  endpoint **already** returns with `PublicPlayerProfileSchema` and yielding `is_citizen`.
- Every failure path returns `false`: unconfigured, transport error, 4xx (incl. 409), 5xx after
  retries, unparseable body. Never throws. The class's fail-soft docstring contract is intact.
- `backfillMissingProfiles` still ignores the result — unchanged behaviour.

### 3. `src/server/Client.ts`
- `public isCitizen: boolean = false;` — field initializer, so the single construction site in
  `Worker.ts` needed no change. Commented as display-only and explicitly not an entitlement gate.

### 4. `src/server/GameServer.ts`
- `upsertProfileForClient` attaches the result (`.then` → set **true only**), still fire-and-forget.
- `addClient` reconnect branch carries `existing.isCitizen` over.
- `start()` puts `isCitizen: c.isCitizen` on the frozen roster (single freeze point).
- `gameInfo()` puts it on the 1 Hz lobby poll payload.
- `archiveGame()` carries `player.isCitizen` from the frozen roster (see divergence D1).

### 5. `src/core/game/GameView.ts`
- Exported pure `citizenClientIDs(humans)`; `GameView` builds `_citizenClientIDs` beside `_cosmetics`.
- `PlayerView` gains a 5th ctor arg `_isCitizen` (defaulted `false`) and an `isCitizen()` accessor.
- Nations/bots have no `clientID` ⇒ always `false` by construction.

### 6. `src/client/CitizenBadge.ts` (new)
- One exported `renderCitizenBadge()`. Placeholder glyph `★` as a text span, Tailwind-styled, with
  `role="img"`, `aria-label` and `title` — both strings via `translateText`. No SVG, no asset, no
  custom element (so neither HTML template needed updating), no flag imagery.

### 7. Four UI surfaces
`HostLobbyModal`, `JoinPrivateLobbyModal` (state widened `string[]` → `ClientInfo[]`),
`Leaderboard` (in-match list), `PlayerPanel` (in-match panel).

### 8. Localization
New top-level `citizen_badge` section in **both** `en.json` and `ru.json`, placed next to the existing
citizenship sections.

---

## Decision log — decisions made autonomously

Per ADR-019's audit obligation, carried to this path by ADR-032.

**D1 — nine extra construction sites the plan did not enumerate.**
`.default(false)` makes `isCitizen` **required in the parsed output type**, so every hand-built
`Player` / `PlayerRecord` / `GameStartInfo` literal stopped compiling. `tsc --noEmit` found nine:
`ClientGameRunner.ts`, `LocalServer.ts`, `Main.ts` (×2), `SinglePlayerModal.ts`, `GameServer.ts` (×2),
`tests/client/MatchStartAnalytics.test.ts`.
**What I did, and why it qualified:** mechanical, localized, and inside the plan's intent (the plan
chose `.default(false)` knowing the parsed type would be a plain `boolean`). Each site got the flag
from the truthful source: the frozen roster where one exists (`GameServer.archiveGame`,
`LocalServer`), the view (`ClientGameRunner.saveGame` → `myPlayer.isCitizen()`), and a commented
`false` on the singleplayer paths that never reach the profile API (the plan's accepted residual 3).
**Not** a scope widening — no site gained behaviour, only the field the schema now requires.

**D2 — a defensive `.catch(() => {})` on the upsert promise in `upsertProfileForClient`.**
Beyond the plan's literal text. `upsertProfile` is contractually non-throwing, but this is the join
path and the plan's own test matrix asks for "the join completes when the upsert promise rejects" —
without a catch that test would raise an unhandled rejection. Verified `CORRECT`, one line, inside the
plan's fail-soft intent.

**D3 — `PublicPlayerProfileSchema` kept as the parse schema (not a narrower `{is_citizen}` shape).**
The plan named it; I kept it. It is stricter, so profile-server contract drift degrades to
"no icon" plus a `warn` rather than passing silently. Recorded because the stricter choice has a real
cost: a future server-side field removal would blank every icon until the game server redeploys.

**D4 — a lang-parity + badge-constraint test file rather than extending `tests/LangCode.test.ts`.**
The plan allowed either. `tests/client/NameChangeLang.test.ts` (0067) is the established convention for
a per-task section, so `tests/client/CitizenBadge.test.ts` mirrors it and adds assertions that the
badge renders no `<img>`/`<svg>`/`/flags/` and no flag emoji — the Yandex constraint from amendment 3,
pinned so the follow-up icon-design task cannot quietly break it.

**D5 — did not reformat four pre-existing non-Prettier-clean files.**
`prettier --check` flags `GameView.ts`, `GameServer.ts`, `Leaderboard.ts`, `PlayerPanel.ts` — all four
were **already** unformatted at `HEAD` (verified by piping `git show HEAD:<file>` through Prettier).
Running `--write` would have reformatted unrelated code, so I did not. I confirmed my own added lines
are Prettier-shaped by diffing Prettier's output and checking no hunk touches them.
`JoinPrivateLobbyModal.ts` **was** clean at HEAD and my edit made it dirty, so that one file was
formatted (Prettier touched only my block).

**D6 — the live verification harness (see below).** Choosing to stand up a real profile stack and
patch the client temporarily, rather than skip the mandatory manual check.

Everything else followed the plan as written.

---

## Decision log — round 1 review response (2026-08-28)

Second `fkit-coder` pass, spawned as the **Process-review worker** of `/fkit-sprint-ship-loop` under the
same declared-approval marker, with the owner's dispositions on all three findings supplied.

**Autonomously-applied fixes: none.** Every change in this pass was an explicit owner disposition, not
an autonomous call — R1 was directed ("fix the sentence, documentation only"), R2 and R3 were directed
accepts. **Obvious-winner calls: none.** Nothing was applied without instruction, and nothing outside
the approved plan was touched.

**D7 — R1: rewrote the `isCitizen` docstring in `src/core/Schemas.ts`. Comment only, no code.**
*Which finding:* R1 — the docstring claimed "No client-supplied path exists", which is false.
*Verified first, not taken on trust:* traced the full chain `PlayerRecordSchema` (`Schemas.ts:630`,
extends `PlayerSchema`) → `GameEndInfoSchema.players` (`:638`) → `PartialAnalyticsRecordSchema.info`
(`:653`) → `PartialGameRecordSchema` (`:672`), which `POST /api/archive_singleplayer_game`
(`Worker.ts:326-331`) `safeParse`s off a **client-POSTed** `req.body`. The claim was untrue as written.
Confirmed both mitigations too: no reader of `isCitizen` off a record exists anywhere in `src/`, and
`archive()` no-ops behind `config.archiveEnabled()` (`Archive.ts:21`, ADR-104) — so zero behavioral
impact, and the comment really was the entire defect.
*What changed:* the false sentence is replaced by one that scopes the guarantee to the **live game
path** (`start()` frozen roster + `gameInfo()` lobby poll), names the singleplayer-archive exception
outright, and states the durable rule — never trust a record's value, never gate anything of value on
this flag, the profile server's SQL is the sole authority. `+30 / -0` lines in one file; the schema line
`isCitizen: z.boolean().default(false).catch(false)` is **byte-unchanged**.
*Why it qualified:* directed by the owner, comment-only, one file, inside the approved plan.

**D8 — R2 and R3 accepted as residuals; no code and no tests written for either.**
*R2 (untested `GameView` wiring / `PlayerView.isCitizen()`):* verified the gap is real —
`grep -rn "isCitizen()\|new PlayerView" tests/` returns nothing. Owner ruled accept, no test.
Recorded in the ledger's shared residuals **as a gap, not as coverage**.
*R3 (`isCitizen` on the unauthenticated `GET /api/game/:id`):* verified unauthenticated — the middleware
ahead of the route (`Worker.ts:147-178`) is worker-path routing, compression, json, static and a rate
limiter, with no auth. Owner ruled accept, no narrowing. Recorded **with its condition stated
explicitly**: the disposition holds only while the flag stays cosmetic, and is void the moment anything
of value is gated on it.

**Verification re-run after D7** — comment-only, so the numbers had to reproduce, and did:
`npx tsc --noEmit` clean (exit 0); `npm run lint` clean (exit 0); `npm test` **106 suites / 1072 tests**;
`npm run test:integration -- --forceExit --runInBand` **5 suites / 70 tests** (same invocation shape as
above — `gc-0012-it-pg`:5433, credentials read off the container, never written down);
`npx prettier --check src/core/Schemas.ts` clean.

**Crash on the first `npm test`, reported not hidden.** Exit 1, `1 failed / 105 passed` suites but
`1058 passed / 0 failed` tests — a jest worker killed by `SIGSEGV` on **`tests/UnitGrid.test.ts`**, a
file this task never touches (known reliability issue, task `0197`). Re-run explicitly rather than
silently retried; the re-run was clean at 106/1072. This is a **different** suite from the round-1
`NameChangeRoutes` flake, and that flake did not reappear.

**0067's uncommitted work was not touched** — no revert, no reformat, no edit. The whole surface of this
pass is one comment block in `src/core/Schemas.ts` plus the two task-folder documents.

---

## Divergences from the plan

- **D1 above** is the only material one: the change surface is **larger than the plan's estimate**
  (7 source files → 12 source files + 1 test file touched, plus 3 new test files).
- **`archiveGame` / `saveGame` were not in the plan's surface at all.** They are `PlayerRecord`
  builders; the plan noted `PlayerRecordSchema` inherits the field ("no action") but did not notice
  those two literals would stop compiling. No behaviour change beyond carrying the flag.
- Nothing else. No public-lobby player list was built (amendment 2). No icon design work (amendment 3).

---

## Verification

### Automated

| What | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm test` (full unit suite) | **106 suites / 1072 tests passed** |
| `npm run test:integration -- --forceExit --runInBand` | **5 suites / 70 tests passed** |

New/extended tests: `tests/core/CitizenFlag.test.ts` (9), `tests/server/CitizenFlag.test.ts` (7),
`tests/client/CitizenBadge.test.ts` (9), `tests/server/ProfileApiClient.test.ts` (+8 in a new
`upsertProfile citizen flag (0068)` block).

**One flake seen and reported, not hidden.** The *first* full `npm test` run failed one test in
`tests/profile-server/NameChangeRoutes.test.ts` ("409s a name_mismatch…" got 404). That file belongs
to **0067** and is untouched by this task. It passed standalone (28/28) and the full suite then passed
**four consecutive times** (106/106). Not root-caused; reported rather than silently retried.

### Integration-suite invocation (reproducibility — the gap the brief flagged)

The working shape, with **no credential values recorded here**:

```
TEST_DATABASE_URL="postgres://<user>:<password>@127.0.0.1:5433/gc_it" \
  npm run test:integration -- --forceExit --runInBand
```

- Host/port/db: the Docker container `gc-0012-it-pg`, port **5433**, database **`gc_it`**.
- User and password: read them off the container itself —
  `docker inspect gc-0012-it-pg --format '{{range .Config.Env}}{{println .}}{{end}}'` (`POSTGRES_USER`
  / `POSTGRES_PASSWORD`). Do not copy them into any file.
- **`--runInBand` is required, not optional.** Without it the five suites run in parallel against the
  one shared database and fail with repeated `error: deadlock detected`. `--forceExit` is also
  required (pre-existing open `pg` handles).

### Live multi-client run (brief steps 1–4) — this actually ran

Mandatory per amendment 1. **It ran, end to end, against a real local stack.** Setup:

- Postgres: a throwaway `gc_0068` database inside the existing `gc-0012-it-pg` container, migrated with
  `npm run migrate`. **Dropped afterwards**; the integration DB `gc_it` was never touched.
- Real profile server (`npm run start:profile-server`) on port 8081, with a locally generated internal
  token held only in a 0600 scratchpad file outside the repo (deleted afterwards).
- Real game dev server (`npm run dev`) with `PROFILE_API_URL` / `PROFILE_INTERNAL_TOKEN` set — verified
  live via `/api/env`.
- Three real browser clients driven with Playwright: **A** = citizen (`is_citizen=true` row), **B** =
  non-citizen (row exists, `is_citizen=false`), **C** = guest (no Yandex id at all).

**One temporary, reverted patch was needed.** Local dev has no Yandex Games SDK, so
`FlashistFacade.getYandexUniqueId()` returns `null` and *every* local client is a guest — a mixed
roster is otherwise unreachable. I temporarily made `Main.ts` read a `?devYandexId=` query param as a
fallback, ran the verification, then **reverted it**. `git diff src/client/Main.ts` now shows only the
two `isCitizen: false` singleplayer lines. This is stated plainly because it means the *id source* was
simulated; everything downstream of it — the upsert HTTP call, the profile row, `is_citizen`, the
frozen roster, the broadcast, all four UI surfaces — was the real code path.

Results:

- **Step 1 — icon on ANOTHER client's screen: PASS.** On client B's join-private-lobby list:
  `["★ Local Tester", "PlainBob"]`. On client C's list: `["★ Local Tester", "PlainBob", "GuestCarol"]`.
  In-match on client C's leaderboard: exactly **1** `.citizen-badge`, on the citizen, with
  `aria-label="Citizen player"` / `title="Citizen"`. Player panel opened for the citizen from C:
  **1** badge, `★ Local Tester`. Host lobby (client A): `★ Local Tester (Host)`.
- **Step 2 — non-citizens and guests show no icon: PASS.** `PlainBob` (real profile,
  `is_citizen=false`) and `GuestCarol` (no Yandex id, no lookup performed) carried no badge on any
  surface, on any client.
- **Step 3 — API down ⇒ join proceeds, no icon, no player-visible error: PASS.** Killed the profile
  server, then joined a fresh lobby as the citizen id. Join completed immediately; **no badge**; no
  error text in the DOM. Server logged three retry `warn`s plus the fail-soft summary and
  **zero `"level":"error"` lines** for the whole session.
- **Step 4 — multi-client desync check, mixed roster: PASS.** All three clients spawned and played a
  real match. I instrumented each client's outgoing `hash` messages and compared them directly:
  **280 hash windows compared across turns 650–3440, on all three clients simultaneously —
  0 mismatches.** Independently, the server logged **0** desync messages (`grep -ic desync` on the dev
  log = 0). This is a stronger check than "no desync was reported": the actual per-turn state hashes
  were compared and agreed on every window.
- **Step 5** — covered by the automated suites above.

**Bonus path exercised live:** the 409 `persistent_id_conflict` branch fired for real (all three tabs
shared one browser `persistentID`, already linked to another Yandex id). It returned `false` without
retrying and without disturbing the join — exactly the fail-soft table's row.

**Pre-existing local-dev bug found, NOT fixed (out of scope):** `HostLobbyModal`'s Start Game and
lobby-poll URLs build `${FlashistFacade.instance.windowOrigin}/${workerPath}/...`, and `windowOrigin`
carries a trailing slash locally, producing `http://localhost:9000//w1/api/start_game/<id>` → **404**.
The private-lobby Start button therefore does nothing in local dev. Unrelated to this task (those are
`// Flashist Adaptation` lines that predate it); I worked around it by POSTing the correct URL. Worth
its own brief.

---

## Residuals

The plan's three accepted residuals stand, unchanged:

1. A player who joins in the last moment before start, while the profile API is slow, is frozen into
   that match's roster as a non-citizen.
2. A late `update_identity` refresh that resolves after `start()` updates the lobby list but not the
   already-frozen match roster.
3. Singleplayer shows no icon (no profile lookup exists on that path).

Plus, recorded here:

4. **Public quick-play lobbies still show no pre-match icon** — there is no public-lobby player list to
   put one in (`PublicLobby.ts` renders only `n / max`, re-confirmed live: the button read
   "Japan 3 / 20"). **Owner-accepted, amendment 2.** Public-match players first see icons in-match.
5. **Trust level is unchanged and unsolved.** The id still comes from `getCreditableYandexId()`, which
   returns a client-asserted, unverified value (ADR-103). A forged id can mint a *cosmetic* icon. This
   is the already-accepted level for XP crediting, the icon gates nothing of value, and the fix arrives
   for free when signed-payload verification lands. Flagged, not solved.
6. **Freshness:** the flag is only as fresh as the last join. Becoming a citizen mid-lobby shows no icon
   until the next join. Deliberate — the alternative adds an endpoint and start-path latency.
