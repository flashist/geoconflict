# Worklog — `0211` credit participation XP at elimination or match end

## 2026-09-12 — build (spawned `fkit-coder` Build worker, caller `fkit-sprint-ship-loop`)

Implemented `plan.md` (blob `36b446407d888f7e40b0deb3cd10a2b07fd2cb65`, 67,310 bytes — hash confirmed
on disk before any edit) **plus** its `⛔ APPROVED AMENDMENTS A1–A7` section. Branch `dev`, from
`0488391`. **Nothing committed, nothing pushed, no task file moved, no wiki write.**

### Carry note — the plan came BY REFERENCE, under a named owner ruling

The loop's carry construction wants the plan pasted verbatim **plus** a pointer, and treats
pointer-only as a degraded carry the Build worker must refuse. The spawn prompt named an owner ruling
made live in session on 2026-09-12 that pointer-only is acceptable for `0211` (the plan is 67 KB;
`Bash(cat)` announced truncation, so a faithful paste was not performable and a partial paste is never
permissible). Proceeded on that named ruling, per ADR-037 §3 and the universal
"a skill rule beats a contrary spawn instruction *unless* the instruction names an owner ruling".
⚠️ **Unverifiable from here** — no cross-context marker exists and the owner channel is session-only
(ADR-021). Recorded as trust, not proof.

The plan was read in full, in four chunks, to the last line — including A1–A7, which a truncated read
would have lost.

---

## Change surface — 24 files (20 modified, 4 new)

### Phase 1 — the economy rescale (ADR-111)

| File | Change |
|---|---|
| `src/core/profile/Citizenship.ts` | `CITIZENSHIP_XP_THRESHOLD` 1000 → **100**; `XP_PER_MATCH` 10 → **1**. Doc comments record the exactly-10× divide and that `1` is a **deliberate floor** (ADR-111 part 3), not a constant to round back up |
| `resources/lang/en.json` | `inbox.templates.citizenship_earned.body`: "1,000 XP" → "100 XP" |
| `resources/lang/ru.json` | the same key: "1,000 XP" → "100 XP" |

⛔ No migration, no backfill, no divide-by-10 of existing rows (owner ruling 8).
⛔ `migrations/001_player_profiles.sql`'s `xp_awarded integer not null default 10` was **left
untouched** (owner ruling 6): it is inert because `CREDIT_SQL` always supplies `$3` explicitly, and
editing a migration that has run in production is a worse trap than a stale default.

### Phase 2 — the elimination trigger

| File | Change |
|---|---|
| `src/core/Schemas.ts` | New `ClientParticipationSchema` (`type: "participation"`, `hasSpawned`, `isAliveNow`, `killedAt?`), registered in `ClientMessageSchema` and in the `ClientMessage` union; `ClientParticipationMessage` type exported. **No `clientID` field** |
| `src/core/profile/MatchQualification.ts` | **Comments only, no logic change.** Module doc records the two participation sources and that `isAliveAtEnd` means "alive when this was captured"; `qualifiesForMatchXp`'s comment carries the §0.5.2(a) statement explicitly (see D1) |
| `src/server/GameServer.ts` | `spawnedClients` set filled in `addIntent`; `creditMatchXp`'s tail extracted to `creditParticipation()`; new `case "participation"` → `handleParticipation()`; `creditFromParticipationClaim()`; `retryParticipationAfterIdentityRefresh()` called from `case "update_identity"` |
| `src/client/Transport.ts` | `sendParticipation()` — goes through `sendMsg` (never `sendIntent`) and returns early when `isLocal` |
| `src/client/PlayerElimination.ts` | **NEW.** `isEliminated(game, player)` — the one definition of the elimination predicate |
| `src/client/graphics/layers/WinModal.ts` | Both existing copies of the predicate replaced by `isEliminated()` (A6: three call sites, not two) |
| `src/client/ClientGameRunner.ts` | Elimination emission + stall emission, behind two new distinctly-named latches (A5) |

### Phase 3 — the survivor trigger (Mechanism A)

| File | Change |
|---|---|
| `src/core/game/GameUpdates.ts` | `winnerDeclarable: boolean` added to `WinConditionCheckUpdate` |
| `src/core/execution/WinCheckExecution.ts` | Both `checkWinnerFFA()` and `checkWinnerTeam()` compute the guard's **whole** condition into one local, pass it to `reportWinConditionCheck`, and use the same local for the early return |

⛔ **The guard's behaviour does not change by one tick.** `0022`'s deliberate "return before
`this.active = false` so a human can still win later" is preserved; no winner is manufactured; no
match ends early.

### Phase 4 — tests

| File | Change |
|---|---|
| `tests/core/profile/Citizenship.test.ts` | Pins moved to 100 / 1; added a matches-to-citizenship invariant (`threshold / award === 100`, unchanged by the rescale) |
| `tests/core/profile/CitizenshipCopy.test.ts` | **NEW.** Both `en.json` and `ru.json` state `String(CITIZENSHIP_XP_THRESHOLD)`; asserts the pre-rescale figure is gone |
| `tests/core/profile/MatchQualification.test.ts` | `xpAwarded === 1`; mid-match qualification both ways; the leaver reversal named in the test titles; one-entry batches |
| `tests/PlayerParticipationSchema.test.ts` | The new message; union membership; an injected `clientID` is stripped (see D2); required/bounds rejections |
| `tests/core/executions/WinCheckExecution.test.ts` | `winnerDeclarable` asserted on the existing cases (A4 — extension, not a new file), **including both singleplayer directions** (A3) and the FFA/Team asymmetry |
| `tests/core/WinCheckDeterminism.test.ts` | Exact key-set whitelist gains `"winnerDeclarable"` (A1). ⛔ Not loosened to a subset match |
| `tests/server/GameServerParticipation.test.ts` | **NEW.** The server handler end-to-end within the server: credits once, under `this.id` asserted as a literal; survivor case; latch; every rejection guard; the late-identity retry |
| `tests/client/TransportParticipation.test.ts` | **NEW.** Step `4c` client half — nothing sent when `isLocal`, with a non-local control so the assertion is not vacuous; no `clientID` on the wire |
| `tests/LocalServer.test.ts` | Step `4c` server half — `LocalServer` ignores the message, changes no state, adds no intent |
| `tests/client/CitizenshipCard.test.ts` | Mocked threshold 1000 → 100; every XP fixture rescaled so each keeps the citizen/non-citizen state it was written to test |
| `tests/client/WinConditionAnalytics.test.ts` | Fixture factory gains `winnerDeclarable: false` (type-required; no assertion changed — the emitter never reads it) |
| `tests/profile-server/InboxHooks.test.ts` | Threshold/award fixtures rescaled (see D3 — **this one went red first**) |

---

## Verification

- `npx tsc --noEmit -p tsconfig.json` — **clean**.
- `npm run lint` — **clean**.
- `npx prettier` — every changed file formatted; `--check` clean.
- `npm test` — **116 suites / 1230 tests, all passing**, ~32 s (the shell harnesses run
  unconditionally). Baseline in `CLAUDE.md` is 113/1185; the three new suites account for the +3.
- **One red before it was green:** `tests/profile-server/InboxHooks.test.ts` failed on the first full
  run. Real, caused by this change, fixed deliberately — see **D3**. Not a flake, not re-run away.
- **No `supertest` flake was hit**, so the `0197`-first protocol was never invoked. Nothing re-run.

### Step `4d` — swept by FIGURE, not by diff

```
$ grep -rn "1,000\|1000\|1 000" resources/lang/
… 30 hits, ALL of them `easter_bug_count_desc` ("0–1000 bugs", a joke settings range) …
resources/lang/en.json:457:    "easter_bug_count_desc": "How many bugs you're okay with (0–1000, emotionally)"

$ grep -rn "XP" resources/lang/en.json resources/lang/ru.json
resources/lang/en.json:61:    "xp_label": "XP"
resources/lang/en.json:90:        "body": "You've reached 100 XP and earned citizenship. …"
resources/lang/ru.json:65:    "xp_label": "XP"
resources/lang/ru.json:94:        "body": "Вы набрали 100 XP и получили гражданство. …"

$ grep -rln "citizenship_earned" resources/lang/
resources/lang/ru.json
resources/lang/en.json

$ grep -rn '1,000' resources/lang/ src/client/
(no matches)
```

**Where the threshold lives and what it moved:** `CITIZENSHIP_XP_THRESHOLD` in
`src/core/profile/Citizenship.ts`, **1000 → 100**. The per-match award `XP_PER_MATCH` in the same
file, **10 → 1**. Every other consumer derives from those two constants — `CitizenshipCard.ts` renders
`CITIZENSHIP_XP_THRESHOLD.toLocaleString()` and `Math.round((xp / CITIZENSHIP_XP_THRESHOLD) * 100)`;
`PlayerProfileRepository.ts` passes the threshold as a **query argument**;
`CreditContract.ts` already accepts any positive int ≤ 10,000. **No SQL literal, no contract change.**
The only hand-written copies of the figure are the two localisation strings above, now guarded by
`tests/core/profile/CitizenshipCopy.test.ts`.

### Step-by-step against the brief's numbered steps

| Step | Status | Honest limit |
|---|---|---|
| 1 — eliminated mid-match credited | ✅ server-handler test | **Not end-to-end** (see step 10) |
| 2 — survivor at a normal end credited | ✅ existing winner-path tests, untouched and green | — |
| 3 — survivor of a match that never ends | ✅ two tests either side of the client emission | ⛔ **Two tests around a seam, not one end-to-end proof.** The client emission has no harness in this repo |
| 4 — Team mode, both cases | ✅ `WinCheckExecution` covers the Team branch; the server handler is mode-agnostic | The Team stall population is **narrower** than the brief implied — Bot-team-led only. Asserted in both directions |
| 4b (amount) — every path pays 1 | ✅ `MatchQualification` test, by test not by diff | — |
| 4b (leaver) — both directions | ✅ named in the test titles so the reversal reads as deliberate | — |
| 4c — Singleplayer credits zero | ✅ `LocalServer` + `Transport` tests | **Unit-level stand-in.** Not an end-to-end solo play-through, and it is not claimed as one |
| 4d — no user-visible stale figure | ✅ swept by figure, output above, plus the new guard test | — |
| 5 — credited exactly once across both paths | ✅ latch test + both paths asserted to use the same game id | — |
| 6 — the `maxGameDuration` cap path | 🔴 **PARTLY SATISFIED, RESIDUAL NAMED** (owner ruling, plan §0.5 row 5). A capped match credits **if the win condition was met**. A capped match where the win condition was **never met** has **no trigger at all** and credits nobody. ⛔ **Reporting this step as a clean pass would be a false report** | Accepted and recorded, never silently skipped |
| 7 — ordinary winner matches unchanged | ✅ `tests/server/GameServerWinner.test.ts` green, untouched | — |
| 8 — cannot obtain XP by a false elimination | **Tested:** cannot claim another player (no wire field), cannot be paid without a server-observed spawn, cannot be paid twice. **Argued, not tested:** a modified client can claim *its own* elimination early for **1 XP**, bounded by the DB key | Stated as the brief requires — which half is which |
| 9 — `npm test` green, `npm run lint` clean | ✅ both | — |
| 10 — the local end-to-end constraint | ⛔ **No local end-to-end crediting proof exists or will exist in this task.** `getCreditableYandexId` yields `null` for every client in a real local run, so crediting returns at `credits.length === 0`. Every claim above is unit / server-handler level with an **injected** client carrying a Yandex id. A real proof needs `0217`'s wiring plus a live profile backend | Planned around up front, not discovered late |

### Other things NOT done, deliberately

- **No ADR text written and no architect waited on** (A7). The ADR-101 clarification already landed and
  is committed.
- **No commit, no push, no task-file move, no wiki write.**
- **`plan.md` not re-authored, re-rendered or appended to.**
- **The stall itself is not fixed** — Mechanism A publishes the stall, it does not resolve it. The
  brief's recorded reopen condition therefore fires; filing is the producer's (`0242`).
- The architect's §11 q4 residual (unbounded `turns` for up to 3 h) is untouched and out of scope.

---

## Decision log — autonomously-applied calls (ADR-019 audit obligation, carried by ADR-032)

Three calls were made without asking. Each was verified `CORRECT`, mechanical/localized, and inside the
approved plan or an obvious winner within its intent.

### D1 — The `qualifiesForMatchXp` comment: wrote the §0.5.2(a) statement in full rather than a short note

**Which instruction it answers:** plan Phase 2, `MatchQualification.ts` — *"it must say the thing
§0.5.2 (a) names, explicitly … or it becomes the next stale record someone 'fixes' back."*

**What changed:** the doc comment on `qualifiesForMatchXp` now opens with a 🔴 *"READ THIS BEFORE
'FIXING' THE LEAVER RULE BACK"* block stating (a) that the old "voluntarily left mid-game" description
is **false as written**, (b) that the predicate itself is **unchanged and correct**, (c) that a
credited stalled-match survivor who then vanishes **keeps the XP by owner ruling**, and (d) the exact
shape the exclusion still catches (`hasSpawned && !isAliveAtEnd && killedAt === undefined`).

**Why it qualified:** in-plan and explicitly mandated; the only latitude was length, and the plan's own
stated purpose (stop a future reader "fixing" it back) is defeated by brevity. Comment-only, no logic
moved. Verified against the predicate, which is byte-unchanged.

### D2 — The schema test asserts an injected `clientID` is **stripped**, not that the message is **rejected**

**Which instruction it answers:** plan Phase 4, the new `src/core/Schemas.ts` test row — *"an unknown
extra field is rejected."*

**What changed:** the test asserts `safeParse` **succeeds** and the parsed data has **no `clientID`
property** (exact key-set assertion), with a comment saying precisely why.

**Why it qualified — the plan's literal wording is not achievable without a behaviour change the plan
did not authorize, and the security property it is protecting is fully preserved.** Zod's `z.object`
**strips** unknown keys; it does not reject them. Making this one message `.strict()` would be
inconsistent with every other client message here and is a **wire-compatibility hazard**: on a rolling
deploy, a newer client adding a forward-compatible field would have its whole message fail to parse and
its socket closed (`client.ws.close(1002, …)`), which is exactly why `playerParticipation` is
`.optional()` today. The property that matters — *a client can never report another player* — holds
either way and is what the test now pins. Mechanical, one test file, no source change.
⚠️ **Flagged rather than buried:** if the reviewer or the owner wants literal rejection, that is a
`.strict()` decision about wire compatibility, not a test tweak.

### D3 — Rescaled the threshold/award fixtures in `tests/profile-server/InboxHooks.test.ts`

**Which instruction it answers:** plan Phase 1 — *"check every assertion that reads a rendered figure."*
The plan enumerated two test files for the rescale; **this third one was not named and went red.**

**What changed:** `new_xp: 1000 → 100` (3 fixtures), `new_xp: 990 → 99` (1 fixture), and
`creditMatchXp("g1", "yandex-1", 10) → 1` (7 call sites).

**Why it qualified — verified `CORRECT` by reproducing the failure, mechanical, and inside the plan's
intent.** The failing case is named *"a credit below the threshold never sends"* and encoded "below"
as the literal `990` against a threshold of `1000`. After the rescale `990 ≥ 100`, so the inbox
template fired and the test failed — **the fixture, not the code, was stale.** Fixing it is the same
class of edit the plan mandated for the two files it did name. The sibling fixtures at `1000` still
passed, but a fixture named *"a fresh threshold crossing"* sitting at ten times the threshold is the
stale record this plan repeatedly warns about, so they moved with it. No source touched; the whole file
is fixtures for `PlayerProfileRepository`, which is itself unchanged.

**Obvious-winner calls:** one — `creditParticipation()` reads the game id from `this.id` internally
rather than taking it as a parameter. The plan says *"⛔ Both callers pass `this.id`"* and rates a
mismatch *High if it happens*; making the parameter not exist makes the mismatch **unexpressible**,
which is strictly stronger than the plan's instruction and cannot change behaviour. The plan's
dedicated test ships anyway, asserting the game id as a **literal**, not re-derived from `server.id`.

**No other fix was applied unasked, and no other judgment call was taken.**

---

## 2026-09-12 — process-review round 1 (spawned `fkit-coder` Process-review worker, caller `fkit-sprint-ship-loop`)

Ledger: `review.md`, *Coder response* section. Standing approval + scope boundary: the owner's
2026-09-12 approval of `plan.md` + amendments A1–A7.

### Decision log — autonomously-applied calls (ADR-019 audit obligation, carried by ADR-032)

**Two fixes applied without asking. One obvious-winner call. Everything else stopped and surfaced.**

#### D4 — R1: rescaled the inverted threshold assertions in the DB-backed suite

**Which finding it answers:** R1 (medium) — `tests/integration/PlayerProfileRepository.it.test.ts:167-205`
still encoded threshold 1000, so its assertions invert under the rescaled threshold of 100.

**What changed:** in that one test, `creditMatchXp("g1", P, 999) → 99`, the two follow-up credits
`10 → 1`, and the expected balances `999/1009/1019 → 99/100/101`; the duplicate re-credit of `g2`
moved to `1` for consistency. Comment `// crosses 1000 → // crosses 100`. Added a comment stating the
literals are deliberately *not* read from `CITIZENSHIP_XP_THRESHOLD` (a test that imports the constant
it pins cannot catch a wrong constant) and that `npm test` structurally cannot see this file.

**Why it qualified — verified `CORRECT` by execution, mechanical, in-plan.** I started the
`gc-0012-it-pg` container and ran the suite *before* touching it: `1 failed, 13 passed`, failing at
`:170` exactly as the reviewer traced statically. The fix is the same rescale the plan mandated for
every other fixture (and the same class of edit as D3 in the build round), applied to the one file the
build's sweep missed because no runnable gate covers it. No source touched — fixtures only.

#### D5 — R3: retry a retained participation claim on reconnect

**Which finding it answers:** R3 (low) — `addClient()` replaces the `allClients` entry with a
freshly-resolved `yandexPlayerId` and upserts the profile, but never retries a retained claim, so an
in-place socket reconnect strands it.

**What changed:** one call, `this.retryParticipationAfterIdentityRefresh(client)`, added after
`this.upsertProfileForClient(client)` in `addClient()` (`src/server/GameServer.ts:300-308`), with a
comment naming the reconnect as the other null→value path. Two tests added to
`tests/server/GameServerParticipation.test.ts`: a reconnect carrying the resolved id credits the
retained report, and a reconnect never credits a client twice.

**Why it qualified — obvious winner within the plan's intent.** Plan Phase 2 step 4 is titled *"Close
the late-identity hole"* and names `case "update_identity":` as the site; the hole simply has a second
mouth the plan did not enumerate. The call is guarded twice over (`participationCredited` latch, then
the claims map) so it is a **no-op unless a retained uncredited claim exists**, and it cannot
double-credit. I verified the first new test is **non-vacuous**: with the line removed it fails
(`1 failed, 15 passed`), with it restored the suite is 16/16.

⚠️ **Recorded against myself:** this fix widens R4's amplification surface — a retained uncredited
claim is now re-posted on reconnect as well as on repeat reports. Flagged in the ledger, not hidden.

#### Stopped, not applied

- **R4** — returned `NEEDS-DECISION`. The latch half is behaviour-changing on the credit path (it
  suppresses a real healing path and runs against the plan's "a duplicate is free, a suppression can
  lose a credit" posture); the rate-limit half is a new mechanism on a surface with **no** WS throttle
  anywhere in the server. Neither is mechanical, neither is in the approved plan.
- **R2** — no action. Brief Ruling 14 / plan ruling 6 rule the applied migration is left alone, and
  that ruling names this exact fact, so it was not made blind. I did not act against it.
- **R5, R7** — frontier findings, with the owner. Not re-adjudicated, not touched.
- **R6** — closed as verified zero-impact on the driver's live DB measurement (0 rows). No code change.

### Verification for this round

- `npm test`: **116 suites / 1232 tests, 0 failing** (39.3 s, shell harnesses included). Baseline to
  beat was 116 / 1230; the +2 are D5's new tests. **No regression.**
- `npm run test:integration` (real Postgres, `gc-0012-it-pg` on 5433): **5 suites / 70 tests, 0
  failing**. This is the gate R1 broke, now proven green by execution rather than by reading.
- No supertest flake occurred in either run, so no re-run was needed and `0197`'s segfault signature
  never came up.
