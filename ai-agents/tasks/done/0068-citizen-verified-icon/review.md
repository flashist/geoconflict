# Review — 0068

Task: `ai-agents/tasks/done/0068-citizen-verified-icon/brief.md`
Plan: `ai-agents/tasks/done/0068-citizen-verified-icon/plan.md` (+ 3 owner amendments)
File(s) under review: 0068's working-tree diff vs `c99110f` — `src/core/Schemas.ts`,
`src/core/game/GameView.ts`, `src/server/Client.ts`, `src/server/GameServer.ts`,
`src/server/ProfileApiClient.ts`, `src/client/ClientGameRunner.ts`, `src/client/LocalServer.ts`,
`src/client/Main.ts`, `src/client/SinglePlayerModal.ts`, `src/client/HostLobbyModal.ts`,
`src/client/JoinPrivateLobbyModal.ts`, `src/client/graphics/layers/Leaderboard.ts`,
`src/client/graphics/layers/PlayerPanel.ts`, `resources/lang/en.json`, `resources/lang/ru.json`,
`tests/server/ProfileApiClient.test.ts`, `tests/client/MatchStartAnalytics.test.ts`; new
`src/client/CitizenBadge.ts`, `tests/core/CitizenFlag.test.ts`, `tests/server/CitizenFlag.test.ts`,
`tests/client/CitizenBadge.test.ts`.
**Scope boundary verified independently** — 0067's files carry no 0068 change; both lang sections
(`citizen_badge`, `citizenship_name_change`) present and intact in en + ru.
Status: **closed** — round 1 dispositioned and closed out 2026-08-28 (phase 2); ready to close, pending
the producer's task-file move. See "Round 1 close-out" below.

Round 1 — 2026-08-28. Reviewers: fkit-reviewer (own pass) + Codex adversarial pass
(`codex-cli 0.145.0`, completed, **zero findings**). Both reviewers ran; coverage is not partial.

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | `src/core/Schemas.ts:452-457` | The `isCitizen` docstring asserts "No client-supplied path exists: clients only ever parse this schema, `GameServer.start()` alone produces it." That is not true. `PlayerRecordSchema = PlayerSchema.extend(...)` (`Schemas.ts:630`) inherits the field, and `POST /api/archive_singleplayer_game` (`src/server/Worker.ts:326-336`) parses a **client-POSTed body** with `PartialGameRecordSchema`, so a client can author `isCitizen: true` into an archived record. **Zero behavioral impact today** — no code anywhere reads `isCitizen` off a record, and `archive()` is a no-op behind `config.archiveEnabled()` (`src/server/Archive.ts:21`, ADR-104). The defect is the comment: it is exactly what a future dev would trust before gating something on a record's flag. Fix the sentence, not the code. |
| R2 | 1 | low | `src/core/game/GameView.ts:551` | The line that actually connects the frozen roster to the UI — `this._citizenClientIDs.has(pu.clientID ?? "")` at the `new PlayerView(...)` site — and `PlayerView.isCitizen()` (`GameView.ts:341-343`) have no unit test. Only the extracted pure `citizenClientIDs()` is covered. The `tests/core/CitizenFlag.test.ts:106` case named "a player with no clientID (nation / bot) is false" asserts against the **Set**, not against the `?? ""` collapse at the call site, so the nation/bot path is reasoned about but not exercised in a test. Covered in practice by the live 3-client run (exactly 1 badge, on the citizen). |
| R3 | 1 | low | `src/server/Worker.ts:319-325` | `gameInfo()` now carries `isCitizen`, and `GET /api/game/:id` serves it **unauthenticated** — anyone holding a lobby id can read each player's citizen status, not only players in that lobby. The endpoint already exposed `username` + `clientID`, and the flag is broadcast to every player in the match anyway, so this is the same exposure one step wider. Raised for an explicit owner disposition (accept as a residual vs. narrow the payload), not as a fix request. |

### Disproven / checked-and-clean (recorded so nobody chases them)

- **Determinism argument holds structurally — all four legs verified in code.** (1) `GameServer.start()`
  (`src/server/GameServer.ts:479-498`) builds one object, `safeParse`s it, assigns `this.gameStartInfo`
  once; `sendStartGameMsg` (`:701-707`) sends *that same object* both at start (`:509`) and to every
  late joiner / reconnect (`:417`) — no per-client construction, no per-client fetch. (2)
  `createGameRunner` (`src/core/GameRunner.ts:49-59`) reads only `p.username` and `p.clientID` from
  `gameStart.players`; `isCitizen` is never referenced. (3) `PlayerInfo` (`src/core/game/Game.ts`) has
  no such field, so the flag cannot reach the worker. (4) `PlayerImpl.hash()`
  (`src/core/game/PlayerImpl.ts:1138-1143`) hashes `id`, `troops`, `numTilesOwned` and unit hashes —
  no `PlayerInfo`, no display field. Adding the field changes neither the length nor the order of
  `gameStart.players`, so the order-dependent `random.nextID()` assignment is unaffected. **No desync
  vector identified.** Codex attacked the same claim independently and also found none.
- **The reverted `?devYandexId=` dev patch is completely gone.** `grep -rn "devYandexId|devYandex|dev_yandex"`
  over all `.ts`/`.js`/`.html`/`.json` (excluding `node_modules` and `ai-agents/`) returns nothing, and
  `git diff c99110f -- src/client/Main.ts` is `+6` lines total = the two 3-line `isCitizen: false`
  singleplayer blocks and nothing else. No client-side identity override shipped.
- **All construction sites carry a truthful value.** Every `isCitizen` write site enumerated and
  traced: `GameServer.ts:486` (frozen roster, from `Client`), `:921` (lobby poll, from `Client`),
  `:1025` (archive record, from the **frozen roster**, not the live client), `Main.ts:816,892` +
  `SinglePlayerModal.ts:555` (`false`, singleplayer never reaches the profile API),
  `LocalServer.ts:284` (read from the local roster with `?? false`),
  `tests/client/MatchStartAnalytics.test.ts:258` (`false`). **No site invents `true`, and no site
  copies a neighbouring value.** The one client-authored site — `ClientGameRunner.ts:385`,
  `this.myPlayer.isCitizen()` — was traced to its destination: `endGame()` writes to
  `localStorage` only (`src/client/LocalPersistantStats.ts:46-59`), never uploaded. It is also derived
  from the server-frozen roster, so it is truthful either way.
- **`new PlayerView(` has exactly one call site** (`GameView.ts:544`) — no site was missed and left on
  the `= false` default.
- **Fail-soft holds on every path.** `postWithRetry` (`ProfileApiClient.ts`) returns parsed JSON on
  2xx and `null` on 4xx (no retry), 5xx-after-retries, and transport error/timeout; `upsertProfile`
  returns `false` for `null`, for `safeParse` failure, for unconfigured, and from the outer `catch`.
  It has no `throw`. `upsertProfileForClient` (`GameServer.ts:1226-1243`) awaits nothing, sets the flag
  **only to `true`**, and carries a defensive `.catch(() => {})`. `backfillMissingProfiles` still
  ignores the return — no behavior change. `GameStartInfoSchema` cannot abort a game start on a bad
  flag: `.catch(false)` degrades it per-player, pinned by `tests/core/CitizenFlag.test.ts:62-79`.
- **`src/core/` rule met.** Both changed core files have tests: `Schemas.ts` via
  `tests/core/CitizenFlag.test.ts` (parse matrix incl. version skew both directions),
  `GameView.ts` via `citizenClientIDs()` coverage — with the residual gap noted in R2.
- **Localization parity confirmed.** `citizen_badge.{tooltip,aria_label}` present and non-empty in
  both `en.json` and `ru.json`; ru genuinely translated; both strings go through `translateText`;
  0067's `citizenship_name_change` section intact in both. Pinned by `tests/client/CitizenBadge.test.ts`.
- **No country or flag imagery.** `CitizenBadge.ts` is a single `★` text span — no `<img>`, no `<svg>`,
  no `/flags/` reference, no regional-indicator or flag emoji, and the test file asserts each of those
  negatives so the follow-up design task cannot quietly break the Yandex constraint.
- **Naming near-miss, not a collision (informational):** the new top-level `citizen_badge.*` section
  sits alongside a pre-existing `citizenship_card.citizen_badge` key
  (`src/client/CitizenshipCard.ts:303`). Different nesting, no lookup conflict — but two differently
  scoped things share the name. No action needed.
- **Prettier claim (worklog D5) verified exactly as stated.** `GameView.ts`, `GameServer.ts`,
  `Leaderboard.ts`, `PlayerPanel.ts` were already Prettier-dirty at `c99110f` and still are;
  `JoinPrivateLobbyModal.ts` was clean and remains clean; the new `CitizenBadge.ts` is clean.
  Pre-existing, not introduced by 0068.

### Verification re-run independently by the reviewer

| What | Result | Matches coder's claim? |
|---|---|---|
| `npx tsc --noEmit` | exit 0, clean | yes |
| `npm run lint` | exit 0, clean | yes |
| `npm test` | **106 suites / 1072 tests passed** | yes, exactly |
| `npm run test:integration -- --forceExit --runInBand` (against `gc-0012-it-pg`:5433) | **5 suites / 70 tests passed** | yes, exactly |
| `tests/profile-server/NameChangeRoutes.test.ts` flake | did **not** reproduce in this run | consistent with the environmental call (task `0197`) |

The live multi-client desync run (280 hash windows, turns 650–3440, 0 mismatches, 0 desync messages)
was **not** re-run by the reviewer — it needs a hand-driven local stack. It is taken as reported, and
the structural argument above was verified independently of it.

### Round 1 close-out — 2026-08-28 (phase 2, owner dispositions recorded)

**Verdict: CLOSE — all three round-1 findings dispositioned by the owner, the R1 fix verified accurate
and comment-only, both gates reproduce round-1 numbers exactly. No new findings. Ledger closed.**

Owner dispositions (given 2026-08-28 via `AskUserQuestion` in the lead session), as recorded:

| # | Owner disposition | Where recorded |
|---|---|---|
| R1 | **Fix the sentence — documentation only, no code change.** Reasoning: the risk is a future developer trusting the false sentence and gating something of value on a record's flag. | Fixed in `src/core/Schemas.ts`; verified below. Closed, no residual. |
| R2 | **Accept as a residual.** No test required — the plan deliberately extracted the pure function because testing the wiring needs a mock worker, config and terrain map no existing test constructs; the live 3-client run exercised the line. Must read as a gap, not as coverage. | Existing *Accepted residuals* entry 1 — **already correct and complete; not duplicated here.** |
| R3 | **Accept as a residual, conditionally.** Valid only while the flag stays cosmetic; **void the moment anything of value is gated on `isCitizen`.** | Existing *Accepted residuals* entry 2 — **already correct and complete, condition carried verbatim; not duplicated here.** |

**Existing residual entries checked, not restated.** R2's entry states "This is a coverage gap, recorded
as a gap and not as coverage" — it records a gap, never coverage. R3's entry carries the owner's
condition explicitly and unparaphrased ("holds only while the flag remains purely cosmetic … this
residual is void and the payload exposure must be re-decided"). Both are accurate and complete as the
coder wrote them; the reviewer added nothing to that section.

**R1's replacement text verified claim-by-claim against the code — accurate, no new overclaim:**

| Claim in the new docstring | Verified |
|---|---|
| `PlayerRecordSchema` extends this schema | `Schemas.ts:640` → `GameEndInfoSchema.players:648` → `PartialAnalyticsRecordSchema.info:663` → `PartialGameRecordSchema:682`. Chain intact. |
| `POST /api/archive_singleplayer_game` parses a client-POSTed body | `src/server/Worker.ts:327-336` — `PartialGameRecordSchema.safeParse(req.body)`. Correct. |
| Nothing anywhere reads `isCitizen` off a record | `grep -rn isCitizen src/` — the only record site is `GameServer.ts:1025`, a **write** from the frozen roster. No reader. Correct. |
| `archive()` is a no-op behind `config.archiveEnabled()` (ADR-104) | `src/server/Archive.ts:20-22` — early `return`. Correct. |
| On the live path `GameServer.start()` and `gameInfo()` are the producers | `GameServer.ts:486` (frozen roster) and `:921` (lobby poll). Correct. |
| `.catch(false)` is load-bearing: `GameServer.start()` aborts the game start on `safeParse` failure | `GameServer.ts:477,493-498` — `safeParse` failure `return`s before the turn interval and before any start message. Degradation pinned by `tests/core/CitizenFlag.test.ts:62-79`. Correct. |
| The durable rule — never trust a record's value, never gate anything of value on this flag on any path | Present and stated **unconditionally, on any path**. This is the sentence that carries the owner's intent, and it is not scoped away. |

**R1 was comment-only — verified, with the limit of that verification stated.** `git diff --numstat c99110f
-- src/core/Schemas.ts` is `30 0` for the whole task: 0068 **deleted or modified no line** in this file.
Of those 30 added lines exactly two are code — `isCitizen?: boolean;` (`:146`, `ClientInfo`) and
`isCitizen: z.boolean().default(false).catch(false),` (`:470`, `PlayerSchema`) — both byte-identical to
the semantics round 1 verified and pinned by test. Everything else added is comment. Round 1's tree was
never committed, so a literal byte-diff of *before vs after the R1 edit alone* is not reconstructible;
the claim is established instead by that bound plus the exact reproduction of both gate numbers.

**Gates re-run independently by the reviewer (phase 2):**

| What | Result | Matches round 1? |
|---|---|---|
| `npx tsc --noEmit` | exit 0, clean | yes |
| `npm run lint` | exit 0, clean | yes |
| `npm test` (first attempt) | **failed** — 1 suite failed / 105 passed, 1066 tests passed, jest worker `SIGSEGV` on `tests/Attack.test.ts` | no — crash, see below |
| `npm test` (explicit re-run) | **106 suites / 1072 tests passed**, jest exit 0 | yes, exactly |
| `npm run test:integration -- --forceExit --runInBand` (local `gc-0012-it-pg` on :5433, `TEST_DATABASE_URL` set) | **5 suites / 70 tests passed**, jest exit 0 | yes, exactly |
| `npx prettier --check src/core/Schemas.ts` | clean | yes |

The first integration attempt reported 5 suites / 70 tests failed in 0.43 s — **reviewer invocation
error, not a defect**: `TEST_DATABASE_URL` was unset, so `new Pool({ connectionString: undefined })`
never reached the container. Recorded so the number is not mistaken for a regression.

**Environmental observation — not a 0068 finding.** The jest-worker `SIGSEGV` struck again, on
`tests/Attack.test.ts` — a **fifth** distinct suite today (`Colors`, `StartGold`, `NameChangeRoutes`,
`UnitGrid`, `Attack`), none of them 0068 files, each passing on re-run. Five unrelated suites argues
environmental, not file-specific. Owned by task `0197`. Reported rather than hidden; the re-run was
explicit, not a silent retry.

**Minor precision notes — recorded, not findings, no action requested.** (1) The new `ClientInfo`
docstring (`:141-145`) says an absent flag "still parses"; `GameInfo`/`ClientInfo` are plain TypeScript
interfaces with **no** zod schema and are never runtime-parsed — the real safety is the truthiness check
at `HostLobbyModal.ts:546` / `JoinPrivateLobbyModal.ts:91`. The behavior described (absent → no badge) is
correct; only the word is loose. (2) The `PlayerSchema` docstring names the archive endpoint as the one
non-server-authored path; the four singleplayer construction sites (`Main.ts:816,892`,
`SinglePlayerModal.ts:555`, `LocalServer.ts:284`) are also client-built, but all are hardcoded/derived
`false` under `GameType.Singleplayer` with no server in the loop, and the unconditional durable rule
covers them. Neither note invites anyone to trust an unverified value — neither reopens R1.

**Convergence call: closed.** Round 1 produced three findings, all three verified correct by both
parties, all three dispositioned by the owner. Round 2 produced no new findings and re-litigated
nothing. Nine accepted residuals stand in the shared section. Two defects found in passing were routed
out of 0068 rather than absorbed into it (`0198` — `HostLobbyModal` start-URL, escalated to production;
`0197` — test-suite reliability). **No further review round is warranted; 0068 is ready to close.**
Closing routes through a spawned `@fkit-producer` — the reviewer moved no task file and committed nothing.

## Coder response

_(coder-owned — reviewer does not write here)_

Round 1 — 2026-08-28. All three findings **verified against the code and all three are correct**;
none is disputed. Owner dispositions were given via `AskUserQuestion` in the lead session before this
pass and are recorded below as given.

| # | Verdict | Defect / Frontier | Action | Status |
|---|---------|-------------------|--------|--------|
| R1 | **CORRECT** | **Defect — in the comment, not the code** | Rewrote the `isCitizen` docstring in `src/core/Schemas.ts`. **No code change** (owner disposition: the code is correct). | **Fixed** |
| R2 | **CORRECT** | Defect-class (coverage gap), accepted | No test added. Owner disposition: accept as a residual, recorded honestly as a gap — not as covered. | **Accepted residual** |
| R3 | **CORRECT** | **Frontier-move** (exposure tradeoff, not a defect) | No narrowing of the `gameInfo()` payload. Owner disposition: accept, **conditional on the flag never becoming an entitlement gate**. | **Accepted residual (conditional)** |

**R1 — verified independently before changing anything.** The reviewer's chain is real, and I traced
every link: `PlayerRecordSchema = PlayerSchema.extend({...})` (`Schemas.ts:630`) →
`GameEndInfoSchema.players` (`:638`) → `PartialAnalyticsRecordSchema.info` (`:653`) →
`PartialGameRecordSchema` (`:672`), which `POST /api/archive_singleplayer_game`
(`src/server/Worker.ts:326-331`) `safeParse`s straight off `req.body`. A client can therefore author
`isCitizen: true` into an archived record, and the deleted sentence ("No client-supplied path exists")
was flatly untrue. Also confirmed the reviewer's two mitigations: `grep -rn isCitizen src/` shows **no
reader of the flag off a record** anywhere (the only record site, `GameServer.ts:1025`, is a *write*
sourced from the frozen roster), and `archive()` returns early behind `config.archiveEnabled()`
(`src/server/Archive.ts:21`, ADR-104). So: zero behavioral impact today, and the comment was the whole
defect. The replacement says the flag is server-authored **on the live game path**, names the
singleplayer-archive exception explicitly, and states the durable rule — never trust a record's value,
never gate anything of value on this flag, the profile server's SQL is the sole authority.

**R2 — confirmed, and the gap is real.** `grep -rn "isCitizen()\|new PlayerView" tests/` returns
**nothing**: neither the wiring line (`GameView.ts:551`, `this._citizenClientIDs.has(pu.clientID ?? "")`)
nor the `PlayerView.isCitizen()` accessor (`:342-343`) is exercised by any test. The reviewer's finer
point is also right — `tests/core/CitizenFlag.test.ts:106` asserts against the **Set**, not against the
`?? ""` collapse at the call site, so the nation/bot path is reasoned about, not tested. Recorded as a
gap. The line was exercised by the live 3-client run (exactly 1 badge, on the citizen), which is
evidence but is **not** a regression test.

**R3 — confirmed unauthenticated.** `GET /api/game/:id` (`src/server/Worker.ts:318-325`) calls
`res.json(game.gameInfo())` with no auth check, and the middleware stack ahead of it
(`Worker.ts:147-178`) is worker-path routing, `compression`, `express.json`, `express.static` and a
rate limiter — no authentication anywhere. Anyone holding a lobby id can read every player's citizen
status. Accepted per the owner, on the stated reasoning that it is the same exposure the in-match
roster already makes, one step wider.

**Verification re-run after the R1 edit** (comment-only, so the numbers were expected to reproduce —
and they did, exactly):

| What | Result | Matches round-1 numbers? |
|---|---|---|
| `npx tsc --noEmit` | exit 0, clean | yes |
| `npm run lint` | exit 0, clean | yes |
| `npm test` | **106 suites / 1072 tests passed** | yes, exactly |
| `npm run test:integration -- --forceExit --runInBand` (`gc-0012-it-pg`:5433) | **5 suites / 70 tests passed** | yes, exactly |
| `npx prettier --check src/core/Schemas.ts` | clean (was clean before; still clean) | n/a |

**One crash seen on the first `npm test`, reported not hidden.** The first run exited 1 with
`Test Suites: 1 failed, 105 passed` but `Tests: 1058 passed, 0 failed` — a jest worker killed by
`SIGSEGV` on **`tests/UnitGrid.test.ts`**, a suite this task never touches (the known reliability issue,
task `0197`). Re-run per the rules rather than silently retried; the re-run was clean at 106/1072.

## Accepted residuals (shared, do-not-re-litigate)

- **`GameView` wiring line and `PlayerView.isCitizen()` are untested (R2, round 1)** — What: only the
  extracted pure `citizenClientIDs()` is covered; the `new PlayerView(...)` wiring at `GameView.ts:551`
  and the `isCitizen()` accessor have no unit test, and the nation/bot `?? ""` collapse is reasoned
  about rather than exercised. Why (structural): testing the wiring needs a mock worker, config and
  terrain map that no existing test constructs — which is precisely why the plan extracted the pure
  function; the live 3-client run exercised this line and is what it was for. Owner ruling, 2026-08-28.
  **This is a coverage gap, recorded as a gap and not as coverage.** Re-raise only if: a `GameView`
  test harness ships for another reason, or the wiring line grows any logic beyond the Set lookup.
- **`isCitizen` is served on the unauthenticated `GET /api/game/:id` lobby poll (R3, round 1)** — What:
  anyone holding a lobby id can read each player's citizen status, not only players in that lobby. Why
  (structural): the endpoint already serves `username` + `clientID` unauthenticated, the flag is
  broadcast to every player in the match anyway, and it gates nothing of value — the same exposure one
  step wider. Owner ruling, 2026-08-28. ⚠️ **This disposition is conditional: it holds only while the
  flag remains purely cosmetic. If anything of value is ever gated on `isCitizen` — an entitlement, a
  purchase, a permission — this residual is void and the payload exposure must be re-decided.**
  Re-raise only if: that condition breaks.
- **Public quick-play lobbies show no pre-match icon** — What: public lobbies render only an `n / max`
  count; citizen icons first appear in-match (leaderboard + player panel). Why (structural):
  `PublicLobby.ts` has no player list at all; building one is a new feature needing its own design
  (who is shown, ordering, join/leave churn) and its own brief. Owner ruling, plan amendment 2.
  Re-raise only if: a public-lobby player list ships for another reason and still omits the icon.
- **Placeholder glyph looks unfinished** — What: ship the neutral `★` now. Why (structural): owner
  ruling, plan amendment 3, following the `0066` favicon precedent; the real icon is a separate
  follow-up task, and the single `CitizenBadge.ts` helper makes that a one-file change.
  Re-raise only if: the glyph moves out of that one helper, or country/flag imagery appears.
- **Client-asserted, unverified Yandex id (ADR-103)** — What: a forged id can mint a *cosmetic* icon.
  Why (structural): this is the already-accepted trust level for XP crediting and the inbox; the icon
  gates nothing of value, and the path inherits signed-payload verification for free when it lands.
  Re-raise only if: the badge becomes load-bearing for an entitlement, a gate, or a purchase.
- **Freshness bounded by last join** — What: becoming a citizen mid-lobby shows no icon until the next
  join; a slow lookup at start freezes that player as a non-citizen for that match. Why (structural):
  riding the existing upsert costs zero extra requests; the alternative adds an endpoint, a rate-limit
  exposure, and latency on the start path — and the brief forbids delaying a join. Re-raise only if:
  a dedicated freshness read ships for another reason.
- **Singleplayer shows no icon** — What: `LocalServer` builds start info locally with no profile
  lookup. Why (structural): out of the brief's two surfaces; plan residual 3. Re-raise only if:
  singleplayer gains a profile-backed path.
- **Pre-existing local-dev `HostLobbyModal` Start-Game URL bug** (`//w1/...` → 404) — What: not 0068's;
  predates it, being filed separately. Why (structural): those are `// Flashist Adaptation` lines
  older than this task. Re-raise only if: 0068 is shown to have caused or worsened it.
- **`tests/profile-server/NameChangeRoutes.test.ts` flake** — What: 0067's file, untouched by 0068;
  environmental; reliability task `0197` filed. Did not reproduce in the reviewer's run.
  Re-raise only if: it reproduces against a 0068 file.
