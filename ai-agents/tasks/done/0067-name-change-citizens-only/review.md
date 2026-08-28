# Review — 0067

Task: `ai-agents/tasks/done/0067-name-change-citizens-only/brief.md`
File(s) under review: the uncommitted working tree at base `c99110f` (verified clean at that commit) —
`migrations/004_name_change.sql`, `src/core/validations/{username,usernameRules}.ts`,
`src/core/notifications/TelegramNotifier.ts`, `src/core/profile/{NameChangeContract,PlayerProfile}.ts`,
`src/profile-server/{Routes,Server,NameChangeRepository}.ts`,
`src/client/{CitizenshipCard,PlayerProfileView,NameChangeRequest}.ts`,
`resources/lang/{en,ru}.json`, `build-deploy-profile.sh`, `setup-profile.sh`, `example.env.profile`,
and 7 new + 4 modified test files.
Status: closed-out (reviewer-confirmed 2026-08-28 — see "Owner dispositions recorded / reviewer close-out")

Round 1 — 2026-08-28. Reviewers: fkit-reviewer (Claude) + Codex adversarial pass
(`codex-cli 0.145.0`, completed, 3 findings). **Both reviewers ran; coverage is not partial.**

## Verification independently re-run (not taken on trust)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm test` | PASS — 103 suites / 1018 tests |
| `RUN_DB_TESTS=1 npx jest tests/integration --runInBand` (real Postgres, `gc-0012-it-pg`:5433) | PASS — 5 suites / 64 tests |
| `npm run migrate` re-run on an already-migrated DB | PASS — 001→004 applied, "migrations up to date", idempotent |
| en/ru key parity for `citizenship_name_change` | PASS — 15 keys, identical sets (checked programmatically) |

Every figure the coder reported was reproduced exactly.

## Priority items — verified sound (no finding)

- **Cancel DELETE scoping holds.** `CANCEL_SQL` (`NameChangeRepository.ts:89-92`) is scoped to
  `yandex_player_id = $1 AND moderation_status = 'pending'`. A decided row cannot be erased and one
  player cannot touch another's. Proven twice: `tests/profile-server/NameChangeRepository.test.ts:228`
  asserts both clauses are in the SQL, and `tests/integration/NameChange.it.test.ts:302` proves against a
  real DB that an approved row survives a cancel (404 `no_pending`, audit row intact).
- **`moderation_status` default trap closed.** `INSERT_REQUEST_SQL:75-80` passes `'pending'` explicitly;
  asserted at `NameChangeRepository.test.ts:101` and in 5 integration assertions.
- **Approve-time uniqueness race handled, not 500'd.** `approveInTransaction:312-325` catches `23505`,
  rolls back, returns `name_taken` → 409 with the row left `pending`
  (`NameChangeRepository.test.ts:345`, `NameChange.it.test.ts:322`).
- **`validateUsername` parity is genuine.** Keys (`username.not_string/too_short/too_long/invalid_chars`),
  params (`{min}`/`{max}`, including the unused `{max}` on `invalid_chars`), ordering and return shape are
  all preserved. The now-shared `validUsernamePattern` carries no `/g` flag, so there is no shared
  `lastIndex` state bug across the two callers.
- **Import purity holds.** `usernameRules.ts` has **zero** imports; `TelegramNotifier.ts` imports only
  `undici`. Both are leaves — there is no transitive graph to crash the container at startup.
  Corroborated by `tests/profile-server/NameChangeRepository.test.ts` importing the repository with **no**
  `jest.mock("../src/client/Utils")`, which every pre-existing `username.ts` consumer needs.
- **Citizen gate is in SQL on every player-facing route.** `requestNameChange:165` and
  `cancelNameChange:208` both call `isCitizen()` → `CITIZEN_SQL` before anything else. The decide route is
  `internalAuth`-gated, which is correct — operators are not citizens.
- **No secrets leak.** `sendTelegramMessage`'s catch (`TelegramNotifier.ts:90-94`) **discards** the caught
  value unread, which is the right call precisely because an undici error can carry the token-bearing URL.
  Callers log only the bare result enum. `example.env.profile` carries the token as a commented, valueless
  line pointing at `.env.profile.secret`; `setup-profile.sh` writes it to the 0600 `profile.env`. Test
  fixtures use a `test-token` placeholder.
- **`src/core/` changes are tested** (project rule): `tests/core/UsernameRules.test.ts`,
  `tests/core/TelegramNotifier.test.ts`, plus contract/schema coverage via the route and view suites.

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | medium | `src/profile-server/NameChangeRepository.ts:196` + `Routes.ts:726-730` | Cancel deletes the pending row, so request→cancel→request loops indefinitely and `notifyOperator` fires on **every** accepted insert with no per-player dedup or throttle. This defeats the exact bound the 30/min limiter is justified by ("Telegram spam is bounded by the one-pending index, not the rate limit"), leaving operator-notification volume capped only by the shared 30/min per-IP budget — ~15 request/cancel cycles/min from one IP, multiplied across IPs. Raised independently by **both** reviewers. |
| R2 | 1 | low | `src/profile-server/NameChangeRepository.ts:168` | The server validates the **raw** `requestedName`, but both client paths trim before validating (`UsernameInput.ts:72`, `CitizenshipCard.ts:560`). So the server is strictly more permissive than the validator owner-ruling (c) told it to mirror: `"   "` (3 spaces) passes `checkUsernameRules` because `validUsernamePattern` includes `\s` and length ≥ 3. Deviation from approved scope, not just a hardening gap. |
| R3 | 1 | low | `src/core/notifications/TelegramNotifier.ts:84-86` | `new ProxyAgent(config.proxyUrl)` is constructed **per send** and never closed, so each notification leaks a dispatcher and its keep-alive socket pool. The precedent it claims to mirror does the opposite — `src/server/Master.ts:213` hoists **one** module-level `telegramProxyAgent` and reuses it. Compounds R1. |
| R4 | 1 | low | `src/profile-server/NameChangeRepository.ts:315` | The approve-path `23505` catch is narrowed only by *which statement* raised it, not by constraint name. Correct under today's schema (that UPDATE touches only `display_name`, so only `player_profiles_display_name_uq` can fire), but any future unique constraint or trigger on `player_profiles` would be silently misreported as 409 `name_taken` and rolled back. Latent, not currently reachable. |
| R5 | 1 | low | `src/profile-server/Routes.ts:161-175` (`toPublicProfile`) | `GET /v1/profile` is unauthenticated and enumerable, and now returns `name_change.requested_name` — the **pending, unmoderated** string — on the victim's public profile. The accepted residual's stated mitigation ("an operator sees every name before it can apply") does not cover *public readability of the pending string*, which passes no moderation gate at all. Not rendered in any other player's UI; API-level exposure only. **This is a widening of the accepted residual's wording, and is an owner disposition question, not a demand for a fix.** |

Disproven / not raised, so the coder need not chase them: the `nameChangeEnabled` fail-closed chain,
the `app.use` prefix mounting (it cannot shadow `GET /v1/profile`), connection release on every
`decideNameChange` branch (the `finally` covers the early `return`s), and the missing `rowCount` check on
`APPLY_NAME_SQL` (unreachable — `player_name_history` has an FK to `player_profiles`).

## Coder response

<!-- CODER-OWNED. The reviewer does not write this section. -->

Round 1 processed 2026-08-28 under the owner's dispositions (given via `AskUserQuestion` in the
fkit-lead session). All five findings were re-verified against the code first; none was applied on
the reviewer's say-so.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect | Escalated first, then fixed. Per-player 10-minute notification cooldown (`NameChangeRepository.claimNotifySlot`) **plus** the `expectedName` decision binding (optional wire field → 409 `name_mismatch`, nothing applied). Shipped together; either alone is unsafe. | ✅ done |
| R2 | CORRECT | Defect | `requestNameChange` now trims before validating; the trimmed value is what is uniqueness-checked, stored and shown to the operator (`NameChangeRepository.ts:171-181`). | ✅ done |
| R3 | CORRECT | Defect | One `ProxyAgent` per proxy URL, cached module-level and reused (`TelegramNotifier.ts:50-66`), matching the `Master.ts:213` precedent. | ✅ done |
| R4 | CORRECT | Defect (latent) | Both `23505` catches now check the index name (`player_name_history_one_pending_uq` / `player_profiles_display_name_uq`) and rethrow anything else (`NameChangeRepository.ts:51-77`). | ✅ done |
| R5 | CORRECT | Frontier | No code change (owner ruling): the pending name stays public. The accepted residual's wording was widened to state the exposure instead of implying the operator gate covers it. | won't fix (frontier) |

### R1 — why the first disposition was reworked before being implemented

**The finding was accepted and fixed. What changed is HOW.** The owner's first disposition — a
per-player notification cooldown — was ruled without the decide endpoint's missing name binding being
known. Verifying the finding surfaced that binding gap, so the fix was **escalated as
`NEEDS-DECISION` rather than shipped as literally worded**; the owner then ruled **option A**
(2026-08-28, `AskUserQuestion` in the lead session), which is cooldown **+** binding, and explicitly
extended the approved scope to cover the new wire field. This record exists so the rework is not
mistaken for a coder deviation: the cooldown alone would have been a security regression.

The evidence that forced the rework is below.

The finding is right and the root cause is right: the 30/min limiter's justification ("a repeat
request 409s without notifying") was sound when written and was invalidated by amendment 2's cancel
endpoint, which makes inserts unlimited. The **number** is not the defect; the stale justification is.

A per-player notification cooldown, written exactly as ruled, creates a **new** vector:

- `notifyOperator` (`NameChangeRepository.ts:395-405`) names the requested name in the message.
- `NameChangeDecisionRequestSchema` (`NameChangeContract.ts:60-70`) carries only
  `{yandexPlayerId, decision, reason?}` — **no name binding** — and
  `SELECT_PENDING_FOR_UPDATE_SQL` resolves the pending row by player id at decide time.

So: request `"InnocentName"` → operator notified. Cancel. Re-request `"OffensiveName"` inside the
cooldown → **no notification at all**. The operator acts on the message they have, and the name that
is actually applied is the one they never saw. That is precisely the *"a vector is found that
bypasses the moderation gate"* re-raise condition on the forged-id residual below — and the human
moderation gate is the only mitigation that residual has.

A weaker form of this existed **before** any cooldown too (an operator acting on a superseded message
applied the newer name), with only a second Telegram message to contradict it. The cooldown would
have removed even that signal.

**What was implemented (owner ruling, option A):**

1. **Cooldown** — `claimNotifySlot` (`NameChangeRepository.ts`): at most one operator notification per
   player per 10 minutes, in-process. Keyed on the player **alone**, not on (player, name):
   exempting a changed name would hand the flood straight back to anyone willing to vary the string.
2. **Binding** — `expectedName`, optional on `NameChangeDecisionRequestSchema`. Compared inside the
   decision transaction against the pending row (trimmed, case-sensitive); on mismatch the
   transaction rolls back and the route returns **409 `name_mismatch`** with `pending_name`, applying
   nothing. Checked for rejections as well as approvals — an operator rejecting a request they never
   read sends the player a reason answering a different name.
3. **The notification carries the ready-to-paste command including `expectedName`**, so the bound
   path is the default rather than extra work. Only `$PROFILE_API_URL` / `$PROFILE_INTERNAL_TOKEN`
   shell variables appear — no secret goes into a chat message. The command is omitted entirely for a
   player id outside `[A-Za-z0-9_-]`, since ids are client-asserted (ADR-103) and a crafted one would
   break the shell quoting of something an operator pastes into their own terminal.

The field is optional on the wire on purpose — the operator's tooling and this server deploy
separately, the lesson `PublicPlayerProfileSchema` already records. Omitting it is exactly the
pre-existing behavior, and a test proves that rather than assuming it.

**Proven end-to-end, not by construction:** `NameChange.it.test.ts` runs the bypass itself against
real Postgres — request `InnocentName` → cancel → request `OffensiveName` → approve with the stale
`expectedName` → 409, `display_name` still null, the row still `pending` and still actionable.

## Owner dispositions recorded / reviewer close-out

<!-- REVIEWER-OWNED. Phase 2 of the stateful review: dispositions recorded, fixes re-verified. -->

All five dispositions were given by the owner on **2026-08-28** via `AskUserQuestion` in the fkit-lead
session, and are recorded here as the binding record.

| #  | Owner disposition | What was required | Reviewer re-verification | Recorded |
|----|-------------------|-------------------|--------------------------|----------|
| R1 | **FIX** — first ruled as a per-player notification cooldown; after the coder escalated a `NEEDS-DECISION` showing the cooldown alone opens a moderation-gate bypass, re-ruled **option A: cooldown PLUS bind the decision to the name**. The ruling **explicitly authorized the new `expectedName` wire field**, extending the approved plan's scope. | Cooldown + `expectedName` → 409 `name_mismatch`, nothing applied. | Confirmed. `decideNameChange` opens the transaction (`NameChangeRepository.ts:309`), takes the pending row with `SELECT … FOR UPDATE` (`:310` / `SELECT_PENDING_FOR_UPDATE_SQL:133-137`), and only then compares `expectedName` (`:328`) — **the binding is checked INSIDE the transaction, against a row already locked**, so a concurrent swap cannot slip between check and apply. Mismatch → `ROLLBACK` + `{status:"name_mismatch", pendingName}` (`:329-331`), surfaced as 409 with `pending_name` (`Routes.ts:864-872`). Checked for rejections as well as approvals. Cooldown at `claimNotifySlot:477-492`, gated in `notifyOperator:535`. | ✅ |
| R2 | **FIX** — trim server-side. | Trim before validate, and the trimmed value is what is stored. | Confirmed. `requestNameChange` trims at `NameChangeRepository.ts:222` **before** `checkUsernameRules`, and the trimmed `name` is what is uniqueness-checked (`:227`), inserted (`:234-237`) and sent to the operator (`:250`). Proven against real Postgres: `NameChange.it.test.ts:380` (`"   "` → 400 `too_short`, **zero rows written**) and `:388` (`"  Padded  "` stored and applied as `Padded`). | ✅ |
| R3 | **FIX** — hoist the ProxyAgent, per the `Master.ts` precedent. | One dispatcher, reused. | Confirmed. `TelegramNotifier.ts:57-67` — module-level `proxyAgents` map, `proxyAgentFor()` creates at most one `ProxyAgent` per proxy URL and reuses it for process life; `sendTelegramMessage` passes it as the dispatcher (`:103-105`). In practice exactly one entry, since the URL comes from the single `TELEGRAM_PROXY_URL` the process starts with. Keyed-by-URL rather than hoisted-from-env because this helper takes config as a parameter — a defensible deviation from the `Master.ts:213` shape that preserves the property that mattered. | ✅ |
| R4 | **FIX NOW** — narrow `23505` by constraint name, despite being unreachable today. | Approve-path catch narrowed. | Confirmed, **and the coder's extension to the INSERT path is correct, not scope creep.** Both catches now test the index name and rethrow anything else: `isUniqueViolationOn` (`:91-96`), insert path → `player_name_history_one_pending_uq` (`:244`), approve path → `player_profiles_display_name_uq` (`:392`). Both index names exist verbatim (`migrations/004_name_change.sql:34`; `player_profiles_display_name_uq` from 001). The extension is the **same defect in the same file** — a bare `23505` catch mapped to a specific business outcome — and leaving one of the pair unnarrowed would have been the inconsistency. Tested in both directions, including a `23505` carrying **no** constraint name (`NameChangeRepository.test.ts:196`, `:569`, `:587`). Deliberate behavior change worth stating: a `23505` without a constraint name now 500s instead of being mis-reported as `pending_exists`/`name_taken`; that is the intended, tested outcome. | ✅ |
| R5 | **NOT a code change — WIDEN THE ACCEPTED RESIDUAL'S WORDING.** The pending name stays visible (the player must see what they requested), but the residual must state honestly that the string is **publicly readable pre-moderation with no gate at all** — the moderation gate reviews a name before it is *applied*, not before it is *published*. Must not be described as solved or mitigated. | Wording only. | Confirmed, and the wording is honest. The new residual below is titled "**PUBLICLY READABLE — unmitigated**", says "**This passes NO gate at all**", names the concrete abuse (a griefer attaching an arbitrary string to a citizen's public profile), explicitly separates "bounded" from "mitigated", states the moderation gate **does not apply**, and carries the instruction not to describe it as solved/mitigated/covered. The forged-id residual above it carries the matching scope correction. Mirrored in the code at `NameChangeContract.ts:113-119`. No source change was made, correctly. | ✅ |

### Verification re-run by the reviewer at close-out (not taken from the worklog)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npm test` | PASS — **103 suites / 1039 tests** (matches the coder's report exactly) |
| `RUN_DB_TESTS=1 TEST_DATABASE_URL=… npx jest tests/integration --runInBand --forceExit` (real Postgres, `gc-0012-it-pg`:5433) | PASS — **5 suites / 70 tests** (matches exactly) |
| R1 bypass proven end-to-end | `NameChange.it.test.ts:402-427` runs the attack itself against real Postgres — request `InnocentName` → cancel → request `OffensiveName` → approve with stale `expectedName` → **409 `name_mismatch`**, `display_name` still null, row still `pending`, `decided_at` still null. Companions at `:429` (current name applies), `:441` (a stale REJECTION is blocked too), `:454` (omitted `expectedName` still decides — the optional wire field is proven, not assumed). |
| en/ru key parity for `citizenship_name_change` | PASS — 15 keys, identical sets (re-checked programmatically) |
| Secret scan | PASS — no bot token anywhere. The operator command carries only `$PROFILE_API_URL` / `$PROFILE_INTERNAL_TOKEN` shell variables (`NameChangeRepository.ts:518-521`); `sendTelegramMessage`'s catch still **discards the caught value unread** (`TelegramNotifier.ts:109-113`), which is what keeps the token-bearing URL out of logs; `example.env.profile` carries the token only as a commented, valueless pointer; `setup-profile.sh:393` and `build-deploy-profile.sh:507` pass it through `%q`-quoted into the 0600 env file. Test fixtures use placeholders. |

Two smaller checks that back the residual wording rather than the fixes: the requested name can only contain
`[\p{L}\p{N}_[\]\s]` (`usernameRules.ts:27`), so no quote or `$` can reach the single-quoted `-d '…'` of the
operator's pasted command, and the player id is separately charset-gated before the command is emitted at all
(`NameChangeRepository.ts:510`); and `loadPlayerProfileView()` takes no player id, so `CitizenshipCard`
renders only the **local** player's `requested_name` — the residual's "no other player's UI renders it" holds.

**Close-out stands.** No new finding was raised at phase 2, and no residual was accepted that I would not
have accepted myself.

## Accepted residuals (shared, do-not-re-litigate)

- **Forged-id offensive name submission (amendment 2, vector 1)** — What: the player routes accept a
  client-asserted, unverified `yandexPlayerId` (ADR-103), so someone who knows a citizen's non-secret id
  can submit an offensive name *in that citizen's name*. **Owner-accepted at the 0067 plan gate and
  explicitly OPEN — not solved.** · Why (structural): signed-payload player verification is the only real
  fix and is blocked on the Yandex IAP secret key (task `0014`). Mitigated meanwhile by the human
  moderation gate — an operator sees every name before it can apply. The sibling vector (parking a pending
  request a victim cannot clear) **is** closed, by the amendment-2 self-service cancel endpoint. ·
  Re-raise only if: signed-payload verification lands, or a vector is found that bypasses the moderation
  gate or mutates an already-active display name. **Scope correction (R5, owner-ruled 2026-08-28): the
  moderation gate mitigates only the APPLICATION of a forged name, never its publication — see the
  separate residual below.**

- **A pending, unmoderated requested name is PUBLICLY READABLE — unmitigated** (R5, owner disposition
  2026-08-28) — What: `GET /v1/profile` is unauthenticated and enumerable by a non-secret player id, and
  `toPublicProfile` (`Routes.ts:161-175`) returns `name_change.requested_name`. That string is whatever
  was submitted, **before any operator sees it**. So a griefer who knows a citizen's player id can attach
  an arbitrary string — offensive, defamatory, a slur — to that citizen's publicly readable profile, and
  it is readable by anyone for as long as the request sits pending. **This passes NO gate at all.** The
  owner chose to keep it: the player must be able to see what they requested. · Why (structural): hiding
  the pending name breaks the card's own pending state, and the exposure's real root is the
  client-asserted id (ADR-103) — the same root as the residual above, closing on the same signed-payload
  work blocked by task `0014`. It is bounded in practice by being API-level only (no other player's UI
  renders it) and by the cancel endpoint, which lets the victim clear it themselves — but "bounded" is
  not "mitigated", and the human moderation gate **does not apply here**: an operator reviews a name
  before it is APPLIED, not before it is PUBLISHED. **Do not describe this as solved, mitigated, or
  covered by the moderation gate.** · Re-raise only if: signed-payload verification lands, the endpoint
  becomes authenticated, another player's UI starts rendering another player's `requested_name`, or the
  pending name is found to reach a search-indexed or shared surface.
- **`Master.ts` keeps its two duplicated inline Telegram call sites** — What: a shared
  `sendTelegramMessage()` helper was extracted, but `Master.ts`'s two existing call sites were not
  migrated onto it; three copies co-exist. · Why (structural): those routes have zero test coverage,
  feedback delivery is already broken in production (`0061`), and task `0033` owns that consolidation.
  Owner-ruled, plan amendment 3. · Re-raise only if: `0033` ships, or `Master.ts` gains test coverage.
  **Note: R3 is NOT a re-litigation of this — it is about the new helper's own agent lifecycle, and
  `Master.ts` is cited only as the correct precedent.**
- **No analytics events** — What: this feature emits none, unlike sibling citizenship features. · Why
  (structural): the brief's 8 verification steps do not ask for any; adding them would also require
  updating `flashistConstants.analyticEvents` and the analytics event reference. Owner-ruled, plan
  amendment 4. · Re-raise only if: the owner asks for name-change funnel analytics.
- **Rejection reason omitted from `GET /v1/profile`** — What: the public projection carries
  `{status, requested_name, decided_at}` but never `rejection_reason`. · Why (structural): that endpoint is
  unauthenticated and enumerable by a non-secret id; the operator's reason text reaches the player through
  the citizen-gated inbox `name_change_rejected` message, which already has a `{reason}` param. ·
  Re-raise only if: the endpoint becomes authenticated.

## Known coverage limits (disclosed, not findings)

- Step 7 (operator Telegram end-to-end) is unit-proven only; proxy reachability from the profile VPS is
  not locally testable.
- The citizenship card was never seen in a browser — `CITIZENSHIP_CARD_ENABLED` is `false`; the UI is
  proven by unit tests.
- `src/client/PlayerProfileView.ts` was already prettier-unclean at line 91 before this task.
- `YANDEX_PAYMENTS_SECRET` missing from `build-deploy-profile.sh` is a pre-existing defect, out of this
  task's scope, now filed as task `0195`.
- The operator notification cooldown state is **in-process**: a restart, or a second instance, allows one
  extra notification. Deliberate — the `expectedName` binding, not the cooldown, is what carries the safety,
  so a duplicate message costs nothing and a shared store would put a dependency in front of a best-effort
  path. Documented at `NameChangeRepository.ts:179-185`.

### Environmental observation (not a defect of this task)

A jest-worker `SIGSEGV` appeared **twice during this task's verification runs**, both times on unrelated,
untouched suites (`tests/Colors.test.ts`, then `tests/core/game/StartGold.test.ts`). Both suites pass
standalone, and both full re-runs were green — including the reviewer's own close-out run, which showed no
SIGSEGV at all (103/103 suites, 1039/1039 tests). Neither suite is touched by 0067 and neither shares any
module with it. Recorded here so a third occurrence is recognized as a **local toolchain/environment
flake to investigate on its own**, not as a regression from this change.
