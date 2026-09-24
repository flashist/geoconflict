# 0253 — tenure XP grant, REDESIGN plan (fresh; supersedes the 2026-09-14 plan.md)

## Summary
- **The rule is fully ruled, so nothing is invented here.** Source: the brief's 2026-09-15 redesign block, which the ADR-112 amendment and the identity design §7 match. The rule: days = max(daysPlayed, distinct `game-records` days); 1 XP per day, cap 50, minimum 3. The claim is always sent, even under 3 days. The check is final and a 0-XP row counts as checked. The popup shows XP only, and only when XP was granted. No client date checks, no claim window, no per-device rule, no ≥1-match rule, no per-IP limit.
- **Most of the plumbing already exists in `src/`.** The `player_xp_grants` table is in migration `006` (`xp_awarded >= 0`, PK `(player_id, kind)`); 006 is already on the box. Also present: `hasXpGrant`, `grantChecks.tenure` in the `POST /v1/login` reply, `getLoginOutcome()` in `ProfileSession.ts`, and the `tenureClaim` metric hook in `Telemetry.ts`.
- **What's missing:** the claim route, the repository write, the client evidence reader, the claim call, the popup, the copy, the analytics events and the tests.
- **No migration, no new env var, no webpack proxy change.** The client calls `profileApiUrl` directly and never goes through `/api/*`.
- ⚠️ **The brief's 2026-09-23 correction is half wrong.** It says the first-plan tenure code is committed in `src/`. It isn't. The v1 claim code is only in the parked patch. What `src/` holds is the seams added by 0270/0271/0274 (`hasXpGrant`, `grantChecks`, the metric hook). The patch's claim route, write path and client code were never committed. Worth correcting in the brief; that edit is the producer's.
- **Needs `npm run test:integration`**: Docker Desktop running (the owner starts it), the `gc-0012-it-pg` container on port 5433, and `TEST_DATABASE_URL` in `.env.test`. The run is destructive to that test DB only.
- **Can't be tested end to end in a local browser.** There is no Yandex login outside the iframe, so no login and no claim happen. The client is covered by unit tests with the facade mocked. The server path is covered for real by the integration suite.
- **Go-live does not depend on `0217`.** The grant writes `players.xp` directly on the profile box. It needs: this route deployed to the profile box, the client deployed, and `0065`'s citizenship flip. `0217` is only needed for match XP.
- Estimate ~1.5–2 dev days plus review.

## What I reuse from v1 (the patch, by hand, never `git apply`) and what changes
**Reused, adapted:**
- `TENURE_XP_PER_DAY / TENURE_XP_CAP / TENURE_MIN_DAYS` constants in `Citizenship.ts`, with the comment updated to cite the amended ADR-112.
- The row-locked transaction shape of `grantTenureXp`: lock the row, insert `ON CONFLICT DO NOTHING RETURNING`, add XP, run `GRANT_CITIZENSHIP_SQL`, fire the inbox hook after commit. Re-keyed from `yandex_player_id` to `player_id` on `players`.
- `TenureGrantModal.ts`, mostly as is (the GameStartingModal pattern). The `{days}` parameter is dropped.
- The `game-records` distinct-local-date parser from `TenureEvidence.ts`.
- The `LangSelector` re-render entry (v1 review R5, a real fix).
- The `<tenure-grant-modal>` tag in both HTML templates and the `Main.ts` import.
- The analytics enum shape (suffix added at the call site, the `MATCH_LEADERBOARD_AWARD` pattern) and the reference-doc placement. v1 build call 10 still applies: rows go under *Citizenship Events* only, not the TypeScript Enum section.
- Test files: `TenureGrantLang`, `TenureGrantModal`, `LangSelectorRerender`, and the structure of `TenureGrantClaim` / `TenureEvidence`.

**Dropped:**
- The snapshot and `snapshotTenureEvidenceOnce`, and the boot hook in `FlashistFacade.initializeImmediate`.
- `TENURE_EVIDENCE_FLOOR_MS`, `firstPlayedAt`, `implausible`, span clamping.
- The window constants and `window_*` reasons.
- `no_credited_match`, `no_profile` as a claim reason, the local device marker `geoconflict.tenureGrant.done`, `tenureGrantLimiter` and the 30/min limit.
- The `{days}` placeholder, and the rule "duplicate on an unmarked device shows the modal".

**Changed:**
- The caller now comes from `resolveCaller` (the Bearer token). No id is sent in the body.
- The claim waits for the login reply and runs only if `grantChecks.tenure === "pending"`.
- Every checked claim writes a row, 0…50 XP. 0 XP is final.
- The server's row is the marker (amended ADR-112 Part 2 rule 2). There is no local marker.
- The popup shows only on `granted` with more than 0 XP.

## Step 1 — Core rules (`src/core`, tested)
- `src/core/profile/Citizenship.ts`: add `TENURE_XP_PER_DAY = 1`, `TENURE_XP_CAP = 50`, `TENURE_MIN_DAYS = 3` next to `XP_PER_MATCH`.
- New `src/core/profile/TenureGrantContract.ts`, pure and shared by client and server (the LoginContract precedent):
  - `TenureEvidenceSchema = z.object({ daysPlayed: int 0..100000, gameRecordDays: int 0..100000 })`
  - `TenureGrantRequestSchema = z.object({ evidence: TenureEvidenceSchema })`. Zod strips unknown keys, so a client-sent amount or id is ignored.
  - `TenureGrantResponseSchema = { status: "granted" | "below_minimum" | "duplicate", xpAwarded: int ≥ 0, xp: int ≥ 0 }`
  - `tenureGrantForEvidence(e) → { days, xpAwarded }`: `days = max(daysPlayed, gameRecordDays)`; `xpAwarded = days < TENURE_MIN_DAYS ? 0 : min(days * TENURE_XP_PER_DAY, TENURE_XP_CAP)`.
  - The error codes are listed in a header comment (LoginContract style).

## Step 2 — Repository (`src/profile-server/PlayerProfileRepository.ts`)
New `recordTenureCheck(playerId, xpAwarded, evidence) → { status: "granted" | "below_minimum" | "duplicate" | "not_found", xpAwarded, xp, citizenshipNewlyGranted }`, in one transaction:
1. `SELECT xp, is_citizen, citizenship_earned_at FROM players WHERE id = $1 FOR UPDATE`. No row → ROLLBACK and return `not_found` (a token whose player is gone, e.g. after a restore).
2. `INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence) VALUES ($1, 'tenure', $2, $3) ON CONFLICT (player_id, kind) DO NOTHING RETURNING xp_awarded`. No row back → read the stored amount, COMMIT, return `duplicate` with the stored amount and current xp.
3. If `xpAwarded > 0`: `UPDATE players SET xp = xp + $2, updated_at = now() … RETURNING xp`. If the new total is ≥ 100 and the player isn't yet an earned citizen, run the existing `GRANT_CITIZENSHIP_SQL`. (This can only happen when real XP is already ≥ 50.)
4. COMMIT. Then the existing `afterCitizenshipEarned` hook runs after commit, guarded (the creditMatchXp contract). `creditMatchXp`, `CREDIT_SQL` and the hook itself are unchanged.

`evidence` is stored as `{ daysPlayed, gameRecordDays }` only, never an id. The repository trusts `xpAwarded`, the same as accepted residual R3 ("capped only at the route"). Its re-raise conditions are still not met: one caller, one kind.

## Step 3 — Route (`src/profile-server/Routes.ts`, `Server.ts`)
**Wiring.** A new optional `AppOptions.tenureGrant?: TenureGrantRepo`, a structural interface with only `recordTenureCheck`. It goes in `AppOptions` rather than `ProfileRepo`, so none of the ~11 existing ProfileRepo mocks change. If it is absent, the route answers `503 tenure_grant_unavailable` (the nameChange/inbox fail-closed pattern). `Server.ts` passes the `profiles` repository.

**`POST /v1/profile/tenure-grant`:**
- Mounted as `app.use(path, publicCors("POST"), tenureGrantEnabled)`.
- **No rate limiter** (owner ruling, redesign item 5).
- Order, following name-change: parse the body (`400 bad_request`) → `resolveCaller` + `sendCallerFailure` (401 / 503) → `tenureGrantForEvidence` → `recordTenureCheck`.
- Answers: `granted`, `below_minimum` or `duplicate` → 200 with the response schema; `not_found` → 404; a throw → `500 internal_error`.
- Logs the outcome and amount only. Never the player id, the token or the evidence values.

**Metrics.** Call `metrics.tenureClaim(outcome)` once per request. Narrow its parameter from `string` to a bounded union: `granted | below_minimum | duplicate | not_found | bad_request | unauthorized | unavailable | error`. Update the "Defined only — task 0253 adds the caller" comment and the metric description. `tests/profile-server/Telemetry.test.ts:186` passes `"skipped"` and changes to a member of the union.

**0268-friendly.** The whole route is one block, so removing it later is one deletion.

## Step 4 — Client evidence (new `src/client/TenureEvidence.ts`, pure over `StorageLike`)
- `readTenureEvidence(storage) → { daysPlayed, gameRecordDays } | null`.
  - `daysPlayed` comes from `geoconflict.player.daysPlayed`, parsed and clamped to [0, 100000]. It includes today's boot, which is fine now that pre-launch-only is removed.
  - `gameRecordDays` is the number of distinct local dates (`localDateString`) over every numeric, finite `startTime` in `game-records`, across all game types (v1 decision 3). No date filtering.
  - Corrupt `game-records` JSON gives `gameRecordDays = 0`, and the claim is still sent.
  - Returns `null` **only if reading storage throws**; see decision D1.
- Export `DAYS_PLAYED_KEY` from `DaysPlayedAnalytics.ts` (a one-word change, as in v1).

## Step 5 — Client claim (new `src/client/TenureGrantClaim.ts`; the NameChangeRequest pattern; never throws)
`maybeClaimTenureGrant(): Promise<{status: "skipped"} | {status: "granted", xpAwarded, xp} | {status: "below_minimum" | "duplicate" | "failed"}>`
1. A module-level once-per-load latch, plus `resetTenureClaimForTests()`.
2. Stop if `FlashistFacade.instance.isCitizenshipSurfacesEnabled()` is false. This is the 0236 combined gate: `CITIZENSHIP_CARD_ENABLED` **and** `citizenship_ui`. The check lives inside the module as well as at the call site.
3. `await getLoginOutcome()`. `null` (guest, degraded boot, failed login, unconfigured API) → stop. `grantChecks.tenure === "done"` → stop.
4. `readTenureEvidence(localStorage)`. `null` → stop, with no request and no event.
5. `profileFetch("/v1/profile/tenure-grant", { method: "POST", body: JSON.stringify({ evidence }), timeoutMs: 10_000 })`. This handles Bearer, the one re-login and the one retry. The body carries no id.
6. Map the answer:
   - 200 `granted` → `Claimed` (value = XP).
   - 200 `below_minimum` → `Rejected:BelowMinimum`.
   - 200 `duplicate` → `Rejected:Duplicate`.
   - Anything else (no response, non-2xx including 404/5xx, a body that doesn't parse) → `ClaimFailed`.
   - Nothing is stored locally. On failure the server wrote nothing, so the next load's login still says `pending` and the claim is retried. **The server record is the marker.**

## Step 6 — Trigger and popup (`src/client/CitizenshipCard.ts`, new `src/client/TenureGrantModal.ts`)
- **Card.** In the enabled path of `connectedCallback`, after the first `await this.refreshProfile()`, run `this.startTenureClaim()` fire-and-forget.
  - On `granted` while the card is still connected: `document.querySelector("tenure-grant-modal")?.show({ xpAwarded, xp })`, then `await this.refreshProfile()` so the XP bar updates.
  - Use `refreshProfile()`, not a second `loadPlayerProfileView()` caller, to avoid double-firing `Citizenship:Earned:XP`.
  - Errors → `console.warn`.
- **Guest who logs in.** 0273's full-restart path gives a new load, then login, then the claim. If the restart is refused (mid-match), the claim happens on the next load.
- **Modal.** Reuse v1's `TenureGrantModal`: `show(params)` / `hide()`, `@state() isVisible`. The body is `translateText("citizenship_tenure_grant.body", { xp, total, threshold: CITIZENSHIP_XP_THRESHOLD })`, never a literal 100.
  - Add `<tenure-grant-modal></tenure-grant-modal>` after `<game-starting-modal>` in **both** `src/client/index.html` and `src/client/yandex-games_iframe.html`.
  - `import "./TenureGrantModal";` in `Main.ts`.
  - Add `"tenure-grant-modal"` to `LangSelector.applyTranslation`'s list. `LangSelector.ts` was already prettier-dirty; don't reformat it.
- `CITIZENSHIP_CARD_ENABLED` stays `false`; `0065` flips it.

## Step 7 — Copy (`resources/lang/en.json` + `ru.json`, same change)
- New section `citizenship_tenure_grant` next to `citizenship_name_change`.
- `body` is the owner-approved text, verbatim:
  - EN: "Thank you for playing Geoconflict! As a thank-you for being with us for so long, we're giving you {xp} free XP. You now have {total} / {threshold} XP."
  - RU: "Спасибо, что играете в Geoconflict! В благодарность за то, что вы с нами так давно, мы дарим вам {xp} XP. Теперь у вас {total} / {threshold} XP."
- `title` / `cta`: see open question 1.
- `CitizenshipCopy.test.ts` is unaffected: it reads only the inbox template.

## Step 8 — Analytics
- Enum in `flashistConstants.analyticEvents`:
  - `CITIZENSHIP_TENURE_GRANT_CLAIMED: "Citizenship:TenureGrant:Claimed"` (value = XP)
  - `CITIZENSHIP_TENURE_GRANT_REJECTED: "Citizenship:TenureGrant:Rejected"`, with suffix `:BelowMinimum | :Duplicate`
  - `CITIZENSHIP_TENURE_GRANT_CLAIM_FAILED: "Citizenship:TenureGrant:ClaimFailed"`
- This follows ADR-112 Part 2 rule 4, and it closes the ADR's open question 3 as a closed list of two reasons.
- `analytics-event-reference.md`: rows under *Citizenship Events*, plus a note:
  - `ClaimFailed` fires once per load until the check lands, so count unique users.
  - The other events fire at most once per player, unless two tabs race.
  - All of them are gated behind `CITIZENSHIP_CARD_ENABLED` + `citizenship_ui`.

## Step 9 — Tests
**Core** (`tests/core/profile/TenureGrantContract.test.ts`; `Citizenship.test.ts` for the constants):
- max of the two counts; 0 and 2 → 0 XP; 3 → 3; 50 → 50; 80 → 50 (capped)
- schema rejects negative, non-integer and over-100000 values
- an extra `xpAwarded` or id field is stripped
- the response schema

**Repository hooks, unit, fake pool** (extend `tests/profile-server/InboxHooks.test.ts`):
- a grant crossing 100 sends `citizenship_earned` after commit
- `below_minimum` and `duplicate` never send
- an inbox reject or throw leaves the outcome unchanged

**Route** (new `tests/profile-server/TenureGrantRoutes.test.ts`; supertest, so it is in the known-flake family):
- 200 for each status, with the repo called with the **server-computed** amount even when the body carries an amount
- 400 for bad bodies; 401 with no or bad token; 503 `session_unavailable`; 503 `tenure_grant_unavailable` when not wired; 404 `not_found`; 500 on a throw
- OPTIONS 204 with the CORS headers, including `Authorization`
- no limiter (many requests are never 429)
- `tenureClaim` recorded once with the right label per case
- no id or token in log calls

**Integration** (new `tests/integration/TenureGrant.it.test.ts` on the shared runner setup; this covers brief verification 8):
- login → claim with 10 days → xp +10, row = 10, the next login says `done`
- a second claim → `duplicate`, xp unchanged
- 2 days → a 0-XP row, xp unchanged, login `done` (final)
- xp = Σ credits + grant after seeded credits
- 60 credited + a 50 grant → citizenship flips and the inbox message exists
- two concurrent claims → exactly one row, XP added once
- a Bearer token for a deleted player → 404

**Client:**
- `TenureEvidence.test.ts`: distinct local dates, non-numeric `startTime` ignored, corrupt JSON gives 0 while `daysPlayed` is still used, clamps, throwing storage → `null`.
- `TenureGrantClaim.test.ts`, using the real ProfileSession and the `primeProfileSession` harness, plus a login variant with `tenure: "done"`:
  - gate off, guest or `done` → no request
  - `pending` → one POST with Bearer and a body of only `{evidence}`
  - under 3 days is still sent
  - each status maps to its event
  - network error, 5xx, 404 and a bad body → `ClaimFailed` with nothing stored
  - a second call in the same load → no request
- `CitizenshipCard.test.ts`, extended: kill switch off → no claim; `granted` → `modal.show` and a profile refresh; any other status → no modal.
- `TenureGrantModal.test.ts`, `TenureGrantLang.test.ts` (keys and placeholders `{xp}/{total}/{threshold}` match in en and ru), `LangSelectorRerender.test.ts`.

**Gates:** `npm test`, `npx tsc --noEmit`, `npm run lint`, prettier on the touched files, and `npm run test:integration` (needs Docker, above).

## Order
Steps 1 → 2 → 3, each with its tests and the integration suite, then 4 → 5 → 6 → 7 → 8 with client tests, then the full gates, then a stateful review by `@fkit-reviewer`. The claim logic stays in 3 client modules, 1 core module, 1 route block and 1 repository method, so `0268` can remove it cleanly.

## Plan decisions (inside the ruling's intent; the owner can veto at approval)
- **D1:** if storage **throws** when read, send nothing and retry next load, instead of sending 0/0. Sending 0/0 would permanently burn an old-timer's check because of a transient read failure. The ruling "always sent even under 3" is about low counts, not about unreadable storage. Missing keys still send 0.
- **D2:** no popup on `duplicate`. The only case is two tabs racing, and the other tab shows it.
- **D3:** an optional `AppOptions.tenureGrant` instead of widening `ProfileRepo`, to avoid churn in ~11 mocks.
- **D4:** narrow `tenureClaim`'s parameter to a bounded union (label discipline).

## Residuals, stated plainly
- **A lost ack after commit gets no popup, ever.** The XP is credited, but the next login says `done`, so the client never claims again. This follows from "the server record is the marker".
- **The popup can open over another modal**, or over the match-start screen if the player joins within about 10 s. No modal queue exists (v1 R1, carried over).
- **The claim-on-behalf / pre-empt risk (ADR-112 amended) starts when the route is deployed to the box, not at the flip.** Anyone with a token can call it by hand. This is the owner-accepted risk; it closes with `0268`.
- **A scripted junk profile that also claims becomes a 0-XP-row survivor** in 0274's cleanup predicate. That is by 0274's design, not changed here.
- **Corrupt `game-records` loses that signal** for the player; `daysPlayed` still counts.

## Deploy / go-live (not build) constraints
- The profile-box deploy (`build-deploy-profile.sh`) carries the route. The game deploy carries the client, and the client is inert while the card is off.
- Any order is safe. A claim reaching a box without the route gets a 404, which is `ClaimFailed` with nothing written, so it retries.
- The route must be on the box **before `0065`'s flip**.
- Sprint 4 closes at the deploy. If this is unfinished then, the work goes on a branch at runbook W12, because `./build-deploy.sh prod` commits the tree.
- No commit by the coder.

## Verification map (brief steps 8–14, rewritten where the redesign superseded them)
- **8:** integration test above.
- **9:** now "a failure writes nothing; login stays `pending`; the next load retries; a success makes login `done`". Client unit test plus integration test.
- **10:** now "forged counts are capped at 50; out-of-range values are 400". Core and route tests.
- **11:** lang test plus `npm test`.
- **12:** guest → no request (client unit test).
- **13:** kill switch → no request (client unit and card tests).
- **14:** worklog note: unreachable until the route is deployed to the box, the client is deployed, and `0065` flips the card. Not tied to `0217`.
- Steps 1–7 (research) were already done in the 2026-09-14 findings report and worklog.

---

## Owner approval — 2026-09-24, live via `AskUserQuestion` in the `fkit lead` session (relayed by `fkit-lead`, `fkit-sprint-ship-loop`)

Approved **as written, including plan decisions D1–D4** (owner chose *"Approve"*). The plan's open questions are answered:

1. **Q1 — popup title and button:** owner chose *"Reuse earlier approved"* — title **"Thanks for being with us!"** / **"Спасибо, что вы с нами!"**, button **"Great!"** / **"Отлично!"** (the 2026-09-14-approved strings), alongside the 2026-09-15-approved body in Step 7.
2. **Q2 — when the claim route goes onto the profile box:** owner chose *"Next profile deploy"* — with the next profile-box deploy that lands before `0065`'s flip, no special hold. (A deploy fact, not a build step.)
3. **Integration tests:** the owner confirmed Docker Desktop is running; the driver checked this turn that the `gc-0012-it-pg` container is up on port 5433 and `.env.test` carries a `TEST_DATABASE_URL` line (value not read). Run `npm run test:integration` as part of the gates.

(`plan.md` in this folder is the v1 plan, 2026-09-14, superseded by the 2026-09-15 redesign and left untouched; this file is the redesign's approved plan.)
