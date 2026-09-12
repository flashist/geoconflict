# Review — 0211

Task: `ai-agents/tasks/done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md`
Plan: `.../plan.md` (incl. `⛔ APPROVED AMENDMENTS A1–A7`, read to end of file)
File(s) under review: the **working tree** vs `HEAD` = `0488391` — 23 modified + 5 untracked
(`src/client/PlayerElimination.ts`, `tests/client/TransportParticipation.test.ts`,
`tests/core/profile/CitizenshipCopy.test.ts`, `tests/server/GameServerParticipation.test.ts`,
`.../worklog.md`). Nothing committed.
Status: closed-out

Round 1 reviewers: **fkit-reviewer (Claude, own pass)** + **Codex adversarial pass**
(`codex-cli 0.152.0`, `codex exec --sandbox read-only`, exit 0, 4 findings).
⚠️ **Coverage is NOT degraded — both reviewers ran.**

Verdict (round 1, as issued): **⚠️ Changes requested — 4 confirmed defects (none blocking; 1 medium,
3 low), plus 3 findings needing an owner disposition.**

**Verdict at closeout (2026-09-12, after the owner's dispositions):** ✅ **Ready to merge
(validation-gated).** Every round-1 finding is fixed, closed, or recorded as an accepted residual
below; no open confirmed defect remains. ⚠️ The gate is the **manual live crediting check after
deploy** recorded in *Step 10 — evidence floor* below. That check is an **outstanding owner action,
not something this task proved.**

---

## Reviewer findings

| #  | Round | Sev    | file:line | Claim |
|----|-------|--------|-----------|-------|
| R1 | 1     | medium | `tests/integration/PlayerProfileRepository.it.test.ts:167-205` | The rescale sweep stopped at what `npm test` runs. The DB-backed test `"citizenship flips at the threshold…"` still encodes the 1000 threshold and **will fail** under `npm run test:integration`: `creditMatchXp("g1", P, 999)` now yields `citizenshipNewlyGranted: true` (999 ≥ 100) where the test asserts `false`, and the follow-up crossing at L179 asserts `true` where it is now `false`. It is the **only** test of threshold-crossing semantics against real Postgres. |
| R2 | 1     | low    | `migrations/001_player_profiles.sql:54` (and the `+10/match` comment at `:13`) | `xp_awarded integer not null default 10` still encodes the pre-rescale award. Unreachable on the live path (`CreditItemSchema` requires `xpAwarded`, and `CREDIT_SQL` always binds `$3`), but any direct/default ledger insert — an operator repair, a future writer — mints an old-economy credit. A stale executable artifact of the rescale, not a behavioral bug today. |
| R3 | 1     | low    | `src/server/GameServer.ts:296-300` | The late-identity retry is wired to `update_identity` only (`:404-409`). `addClient()` replaces the `allClients` entry on a reconnect with a freshly-resolved `yandexPlayerId` and calls `upsertProfileForClient()`, but never `retryParticipationAfterIdentityRefresh()`. A retained claim from a null-id report is then stranded. **Blast radius traced and it is narrow**: a page reload builds a new `ClientGameRunner`, whose latches reset, and the reconnect replays turns from 0 (`ServerStartGameMessageSchema.turns`), so the stall report re-fires and heals itself. The residual is the **in-place socket reconnect**, where the latch survives and no second report is sent. |
| R4 | 1     | low    | `src/server/GameServer.ts:1393-1417` | `handleParticipation()` latches only on `participationCredited`, which is set **only when a credit was actually posted** (`creditFromParticipationClaim`, `:1425-1440`). A report that credits nothing — null Yandex id, `hasSpawned: false`, a non-qualifying claim — leaves no latch, so every repeat re-runs `creditParticipation()`: a full rebuild of `eligibleRoster` plus an O(`allClients`) `clientStateById` map, per message. There is **no per-message rate limit on the WebSocket path** (`express-rate-limit` in `Worker.ts:176` is HTTP only), and the sibling `handleWinner()` *is* latched after one message (`client.reportedWinner !== null`). Minor amplification, new to this path. |
| R5 | 1     | low    | `src/server/GameServer.ts:729-737` | `spawnedClients` records **spawn intents**, not successful spawns: `addIntent()` adds on `intent.type === "spawn"` before the simulation runs, and `SpawnExecution` can reject the ref or the phase without the server observing it. A modified client on the frozen roster can send a bogus spawn intent plus a `participation` report and be paid for a match it never entered. **Severity collapsed on verification**: the attacker's cost is identical to actually spawning, so this widens no farming surface; an honest client cannot reach it (both client emitters gate on `player.hasSpawned()`). Classified frontier-move — the code comment at `:1380-1391` already accepts the uncorroborated-claim residual on ADR-103's reasoning. |
| R6 | 1     | medium | `src/core/profile/Citizenship.ts:20` | The rescale changes the threshold **but no stored XP balance moves with it**. Every existing profile holding 100–999 XP is now above the threshold and flips to earned citizenship on its **next** credit — the exact path `tests/integration/PlayerProfileRepository.it.test.ts:243-258` pins as intended for seeded rows. ADR-111's "ratio unchanged" holds for new players only. Blast radius is the live `player_profiles` row count, **which I did not and cannot check** — MEMORY records "DB has 0 rows" as of 2026-09-10 with `0217` (game server not wired) still open, which if still true makes this zero-impact. Needs a row-count check before ship, not a code change. Not a re-litigation of the numbers: the direction is settled, the absence of a data step is what is raised. |
| R7 | 1     | medium | `src/server/GameServer.ts:907-912` | The `maxGameDuration` (3 h) cap returns `GamePhase.Finished` and `end()` archives with `winner === null`; the only match-end credit call is inside `handleWinner()`. A match that hits the cap with neither the territory threshold nor a `winnerDeclarable === false` stall having fired credits **nobody**. Raised independently by Codex (F3) and **already named honestly by the coder** as Step 6 "PARTLY SATISFIED". Verified correct, and verified **non-regressive** — that shape credited nobody at `HEAD` either. Public lobbies set `maxTimerValue: undefined` (`GameManager.ts:63`, `MapPlaylist.ts:162`), so the shape is a 3-hour public stalemate whose survivors never died; every player eliminated along the way *is* credited by the new trigger. Classified frontier-move. |

### Raised and DISPROVEN — not rows, do not chase

- **D2, "stripping an injected `clientID` is wrong on a trust boundary"** — disproven. The claim is
  not that the message is rejected but that an injected `clientID` is **unreachable server-side**,
  and that holds absolutely: `ClientParticipationSchema` (`src/core/Schemas.ts:617-624`) declares no
  such field, and `creditFromParticipationClaim` (`GameServer.ts:1425-1440`) builds the entry from
  the authenticated socket's `clientID` with nothing off the wire. `.strict()` would close the socket
  on any forward-compatible field a newer client adds — a wire-compat hazard, correctly declined.
  Pinned by `tests/PlayerParticipationSchema.test.ts:88-107`. **Correct call.**
- **Codex F2's stated impact ("a survivor can still lose XP on reload")** — disproven as stated; only
  the narrower in-place-reconnect residual survives. Recorded as R3 with the corrected impact.
- **Codex F4's "stale XP fixtures" half** — disproven. `tests/client/PlayerProfileView.test.ts:284,291`,
  `tests/profile-server/Routes.test.ts:118` and `tests/core/profile/CreditContract.test.ts:8` are not
  threshold-sensitive: the earned latch keys on `citizenship_earned_at`, never on the XP threshold
  (`src/client/PlayerProfileView.ts:122-127`), and the other two are schema-validity fixtures where
  `10` is just a valid integer. Cosmetically dated, not stale. Only the migration default is real (R2).
- **Double-crediting via elimination-then-match-end** — checked by both reviewers, disproven. Both
  paths read the game id from `this.id` in one place (`creditParticipation`, `GameServer.ts:1331-1367`)
  and `CREDIT_SQL`'s `ON CONFLICT (game_id, yandex_player_id) DO NOTHING`
  (`src/profile-server/PlayerProfileRepository.ts:80-99`) makes the second post a no-op. The code's
  own comments are careful to call the in-memory latches efficiency, not the guard. **Correct.**
- **`winnerDeclarable` causing desync** — disproven. It is the guard's own predicate over game state
  and config; `GameImpl.hash()` sums `PlayerImpl.hash()` and nothing else, and the key set is pinned
  exactly (never a subset match) by `tests/core/WinCheckDeterminism.test.ts:59-73`. A1 discharged.
- **The FFA/Team `winnerDeclarable` asymmetry** — checked, **not a defect**. Both expressions are the
  pre-existing guards hoisted verbatim (`WinCheckExecution.ts:137-147` and `:200-207`); behaviour is
  unchanged at every shape. The asymmetry is real, deliberate, documented in place, and now asserted
  in **both** directions (`tests/core/executions/WinCheckExecution.test.ts:433,454`) so it cannot
  drift silently. A3's "not `max.clientID() !== null`" trap is implemented correctly and pinned by the
  singleplayer/tutorial cases at `:360-370`.
- **D3's threshold sweep, re-run independently** — complete for everything `npm test` and the running
  app touch: `Citizenship.ts`, `MatchQualification.ts`, `PlayerProfileRepository.ts`,
  `CitizenshipCard.ts`, both `resources/lang/*.json`, and every affected test fixture including the
  non-failing ones. `tests/integration/PaymentsRepository.it.test.ts` and the concurrent-grant race at
  `PlayerProfileRepository.it.test.ts:276-338` seed above **both** thresholds and still pass. The two
  misses are R1 and R2.

---

## Coder response

<!-- CODER-OWNED. The reviewer never writes this section. -->

Round 1, processed 2026-09-12 by the spawned `fkit-coder` Process-review worker (caller
`fkit-sprint-ship-loop`), under the owner's 2026-09-12 plan approval as standing approval and scope
boundary. Every finding was re-verified against the code by me; R1 and R3 were verified by
**execution**, not by reading.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** — reproduced by running the suite | Defect (broken gate) | Rescaled the four inverted assertions in `"citizenship flips at the threshold…"` to the live economy (99 → +1 crosses 100 → +1). Added a comment saying the literals are deliberate and that `npm test` cannot catch their drift | **fixed, proven green** against real Postgres |
| R2 | **CORRECT observation** — re-verified; the default is inert | Defect (latent, out of scope) | **No action.** Brief Ruling 14 / plan ruling 6 rule the applied migration is left alone, and that ruling was made *with this exact fact in view* (it names the inertness and the `CREDIT_SQL` reason) | **closed — owner-ruled out of scope** |
| R3 | **CORRECT** as the reviewer narrowed it (the in-place-reconnect residual is real) | Defect | Added `retryParticipationAfterIdentityRefresh(client)` to `addClient()` after the profile upsert (`src/server/GameServer.ts:300-308`). Two new tests in `tests/server/GameServerParticipation.test.ts`; the first was **verified non-vacuous** (it fails with the line removed) | **fixed, pinned** |
| R4 | **CORRECT** on the facts; I dispute neither | Defect (latch half) + **Frontier** (rate-limit half) | **NOT APPLIED — `NEEDS-DECISION`.** Both halves are judgment calls: the latch trades an accepted-loss risk against amplification, and the rate limit is a new mechanism on a surface that has none | **needs owner decision** |
| R5 | Not re-adjudicated | Frontier | **No action** — with the owner | deferred to owner |
| R6 | **CORRECT**, and **verified zero-impact** | Defect (missing data step) | **No code change.** The live `player_profiles` table was queried directly by the driver this session: **0 rows**, `max(xp)` 0, zero rows at or above either threshold. No player holds any XP, so the rescale cannot flip anyone to citizenship | **closed — verified zero-impact** |
| R7 | Not re-adjudicated | Frontier | **No action** — with the owner | deferred to owner |

### R1 — what was actually proven

The reviewer traced this statically and said so. I ran it. **Before the fix**, against the
`gc-0012-it-pg` container on 5433: `1 failed, 13 passed` — the failure exactly as predicted
(`citizenshipNewlyGranted` received `true`, expected `false`, at `:170`). **After the fix**, the whole
integration run is **5 suites / 70 tests, 0 failing**. No supertest flake appeared; no re-run was
needed.

The other threshold-touching cases in that file (1500 seeds, the 995-seeded held-lock race) were
re-checked and still pass on their own terms, as the reviewer's D3 sweep said. One cosmetic residual
left deliberately: the comment at `:244` still cites the brief's `990` / `≥1000` verification numbers.
It is a comment on a passing test and it quotes the brief, so changing it would put the test and the
brief out of step — flagged, not touched.

### R4 — why I stopped instead of fixing

Both halves cross the line the sprint loop draws.

**The latch half is behaviour-changing on the credit path, not mechanical.** Latching on *reported*
rather than *credited* would suppress a client's second report. That second report is a real healing
path today: a page reload builds a fresh `ClientGameRunner`, replays turns from 0, and re-fires the
stall report — which is exactly how the reviewer's own R3 analysis says the reload case heals itself.
After my R3 fix the reload is *also* covered by the reconnect retry, so the latch is probably safe —
**"probably safe" is the reason to ask, not the reason to ship.** It also runs against the plan's
stated posture that suppression risks losing a real credit where a duplicate is free (the primary key
absorbs it).

**The rate-limit half is a new mechanism with no precedent here.** I checked: there is **no per-message
WebSocket throttle anywhere in the server** — `express-rate-limit` appears only in `Master.ts` and
`Worker.ts:176`, both HTTP. So this is not "add the missing limit to this handler", it is "introduce
WS rate limiting", which is out of the approved plan. Worth weighing against it: the pre-existing
surface already lets a client spam `intent` messages into `addIntent` unthrottled, so R4's marginal
amplification is over an exposure that already exists.

⚠️ **One honest interaction to note before deciding:** my R3 fix slightly *widens* R4's amplification —
a retained uncredited claim is now re-posted on every reconnect as well as on every repeat report. A
reconnect costs a full WS join, so it is not cheaply spammable, but it is a second trigger where there
was one.

---

## Owner dispositions — round 1

All rulings made live in session on **2026-09-12**, relayed to me by the `/fkit-sprint-ship-loop`
driver and recorded here. Two of the seven were settled by **execution or measurement**, not argument.

| #  | Owner disposition | Evidence |
|----|-------------------|----------|
| R1 | **FIXED** | Proven by **execution**, not statically. The `gc-0012-it-pg` container was started on 5433, the failure reproduced first (`1 failed, 13 passed`, exactly at `:170`), the rescale applied, and the suite re-run: **5 suites / 70 tests, 0 failing** against real Postgres. My static trace was correct. |
| R2 | **CLOSED — no action, out of scope** | Correct observation, ruled out of scope. Brief **Ruling 14** names this exact fact (the `xp_awarded default 10` column is inert because `CREDIT_SQL` always binds `$3`), so the ruling was **not made blind**. `migrations/001` unchanged. |
| R3 | **FIXED** | One guarded call in `addClient()` (`src/server/GameServer.ts:300-307`), double-guarded so it is a no-op without a retained uncredited claim and cannot double-credit. Two new tests; **non-vacuity proven by removal** — `1 failed, 15 passed` without the line, 16/16 with it. |
| R4 | **ACCEPTED RESIDUAL — "do nothing"** | See residual below. |
| R5 | **ACCEPTED RESIDUAL** | See residual below. |
| R6 | **CLOSED — verified zero-impact by MEASUREMENT** | The live `player_profiles` table was queried directly this session: **0 rows**, `max(xp)` = **0**, zero rows at or above either threshold. No player holds any XP, so the rescale cannot flip anyone to citizenship. ⚠️ **A point-in-time reading.** It stops being true once `0217` wires real crediting — the rescale ships before that, which is what makes it safe. |
| R7 | **ACCEPTED RESIDUAL, with a re-raise condition** | See residual below. |

I verified by my own reading that both fixes are present in the working tree: the R3 call at
`src/server/GameServer.ts:300-307` and the rescaled R1 literals at
`tests/integration/PlayerProfileRepository.it.test.ts:167-186`. The test runs above are the coder's
and the driver's reports, recorded as such — I did not re-execute them.

### Step 10 — evidence floor: **SHIP, WITH A MANUAL VALIDATION GATE** (owner ruling)

The task closes on **unit + server-handler evidence**, on `0042`'s deferred-tail pattern, with an
owner-side **live crediting check after deploy** recorded as an **outstanding action**.

⛔ Recorded plainly, so no later reader mistakes the closeout for proof:

- **What was proven:** the schema, the server handler and all its guards, the core qualification and
  selection rules, `winnerDeclarable` at every lobby shape, the copy in both languages, and — by
  execution against real Postgres — the threshold-crossing semantics.
- **What was NOT proven, and will not be in this task:** there is **no end-to-end crediting proof**.
  `getCreditableYandexId()` returns `null` for every client in a real local run, so every crediting
  claim is unit / server-handler level with an **injected** Yandex id. The client emission seam
  (`WinConditionCheck` → `ClientGameRunner` → `Transport` → server) has **no harness in this repo**.
  Building one was offered and **declined as its own work**.

## Accepted residuals (shared, do-not-re-litigate)

Owner-approved 2026-09-12. ⛔ A later round that re-raises any of these without its stated re-raise
condition being met is re-litigation — suppress it and say so.

- **Unlatched non-crediting participation reports (R4)** — *What:* `handleParticipation()` keeps its
  credit-only latch; a report that credits nothing re-runs the `O(players)` resolution on every
  message, and no per-message WebSocket rate limit is introduced. *Why (structural):* both offered
  options were put to the owner **with their costs** and declined — option 2 (latch on *reported*)
  trades an accepted-loss risk for amplification and cuts a real healing path the plan deliberately
  left open, and option 3 (latch + WS rate limit) introduces a mechanism the server has nowhere else
  (`express-rate-limit` is HTTP-only). The exposure is over a surface clients can **already** spam via
  `intent`, and R6's measurement confirms **nothing is economically at stake today**. ⚠️ *Recorded
  alongside, from the coder's own self-flag:* the **R3 fix slightly widens this amplification** — a
  retained uncredited claim is now re-posted on reconnect as well as on repeat reports. A reconnect
  costs a full WS join, so it is not cheaply spammable, but it is a second trigger where there was
  one. *Re-raise only if:* `0217` wires real crediting (making XP economically live), **or** a
  measured abuse or load signal appears on this handler.
- **Spawn intent ≠ successful spawn (R5)** — *What:* `spawnedClients` records the spawn **intent** the
  relay observed, not a spawn the simulation accepted; a modified roster client can send a bogus spawn
  intent plus a `participation` report and be paid for a match it never entered. *Why (structural):*
  tightening `spawnedClients` to observe successful spawns was offered and **declined**. The gap sits
  behind **ADR-103** — the identity being credited is itself client-asserted and unverified, so this
  would harden the weaker link — and the attacker's cost is **identical to actually spawning**, so it
  widens no farming surface. An honest client cannot reach it: both emitters gate on
  `player.hasSpawned()`. *Re-raise only if:* signed-payload identity verification lands (ADR-103's own
  deferral resolves), making this the weakest remaining link rather than the stronger one.
- **`maxGameDuration` capped matches credit nobody (R7)** — *What:* a match hitting the 3 h server cap
  with neither the territory threshold nor a `winnerDeclarable === false` stall having fired credits
  nobody. *Why (structural):* verified **non-regressive** — that shape credited nobody at `HEAD`
  either — and everyone eliminated along the way **is** now credited by the new trigger, so `0211`
  strictly improves it. Public lobbies set `maxTimerValue: undefined`, so the shape is a 3-hour public
  stalemate whose survivors never died. ⛔ **Say it plainly: `0211` fixes the XP loss in this shape,
  NOT the stall itself.** The stall is tracked separately as **`0242`**. *Re-raise only if:* telemetry
  shows capped no-winner matches occurring at a rate worth acting on.

---

## Settled decisions honored this round (suppressed, not dropped)

Both reviewers were primed with these and neither re-raised any as a defect. Listed so a later round
can see they were considered:

- **The XP rescale itself** — award 1, threshold ÷ exactly 10, both languages, one change
  (ADR-111 / owner ruling). Implementation verified correct; the decision is not in scope.
- **Fail-soft crediting, bounded retries, no durable queue** (ADR-101) — a lost credit is accepted
  loss. R3's residual is graded against this, which is why it is `low` and not `medium`.
- **Client-asserted, unverified Yandex id** (ADR-103) — signed-payload verification is deferred and
  externally blocked. R5 sits behind this.
- **An AI player may be declared winner** (ADR-110). ⚠️ Its *"Re-raise only if"* trigger — a durable,
  player-visible winner record — is **not** fired by this change: `0211` credits XP, it publishes no
  winner surface.
- **Mechanism A; FFA + Team in scope, Singleplayer out; the narrowed leaver rule** — owner rulings.
  The narrowed rule is correctly implemented and now titled so it cannot be "fixed" back
  (`src/core/profile/MatchQualification.ts:52-70`, `tests/core/profile/MatchQualification.test.ts:55-70`).

## Convergence call — round 1

**As issued (before dispositions):** round 1 of a fresh ledger; nothing to converge yet. Four real
defects, all cheap, none touching production behavior on the live path. **Act, do not close out.** R1
is the one that matters: it is a broken gate on the single most important economic invariant, in the
one suite `npm test` structurally cannot see. R6 and R7 want dispositions, not code.

**At closeout (2026-09-12): CONVERGED in one round. No round 2 is warranted — do not run one.**
All seven findings are disposed: **2 fixed** (R1, R3), **2 closed** (R2 out of scope with the fact in
view, R6 zero-impact by measurement), **3 accepted residuals** (R4, R5, R7). Nothing is outstanding,
nothing was deferred to a later review round, and no finding was left in `needs owner decision`.

Two of the four questions I returned were settled by **evidence rather than argument** — R1 by
running the suite against real Postgres, R6 by querying the live database — which is the outcome that
makes a second round pointless rather than merely unwelcome.

**The one thing that is NOT closed** is the Step 10 evidence floor: the manual live crediting check
after deploy is an **outstanding owner action**, and this review does not stand in for it.

## Verification state at closeout

Reported to me by the driver as verified first-hand, and recorded as their report — **I did not
re-execute any of it**:

- `npm test` → **116 suites / 1232 tests, 0 failing** (baseline 1230; the +2 are the R3 tests).
- `npx tsc --noEmit` → clean.
- `npm run test:integration` → **5 suites / 70 tests, 0 failing** against real Postgres (the coder's
  run; this is the R1 proof).

What I verified myself by reading the working tree: the R3 call at `src/server/GameServer.ts:300-307`
and the rescaled R1 literals at `tests/integration/PlayerProfileRepository.it.test.ts:167-186`, which
keep the numbers as **deliberate literals** rather than importing `CITIZENSHIP_XP_THRESHOLD` — a test
that imports the constant it pins cannot catch a wrong constant. The file says so in place, and warns
that `npm test` cannot catch that drift.
