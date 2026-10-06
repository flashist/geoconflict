# 0250 — Slice S3b: the verified owner view (implementation plan)

**Planning only.** No source written and no files created. Plan mode wasn't available because this is a spawned run, so I followed the written rule instead. Grounded in: the brief (including the 2026-10-05 notes), `plan.md` / `worklog.md` / `review.md` for S1, design report §5 and §8, ADR-116, ADR-121, ADR-122, and the working tree on `dev` at `6eef01f`.

## Summary (read first)
- **What S3b does:** a caller with a **verified** session (`vfy:true`) gets its **own** true data on all 4 channels: true `xp`, true `citizenship_earned_at`, true `updated_at`, the original inbox keys, and the raw paid facts `is_paid_citizen` + `citizenship_purchased_at`. This is owner ruling D1. Every other caller gets **exactly today's S1 view**, byte for byte.
- **"Only their own" holds by construction.** No player-facing route accepts a target id; the player comes only from the token's `pid`. When `vfy:true`, that `pid` was the Yandex-signed id (0340, id checked first). The plan tests this as a real attack anyway.
- **The client** learns `isPaidCitizen`, which is how 0248 will read it later. It fails closed: `false` on every path except a verified "paid" answer. The client also turns `Citizenship:Earned:XP` back on, for verified reads only. It now uses the paid facts, so a payer who later crosses 100 XP is **not** counted as earned. This carries the brief's 2026-09-27 note.
- 🚨 **A precondition before building.** `0340`'s code is **still uncommitted** in the `dev` working tree (checked with `git status` / `git diff` this turn: `Routes.ts`, `PublicProjection.ts`, `PlayerProfile.ts`, `SessionToken.ts` and 12 other files; the 0340 worklog says "Nothing committed"). S3b edits the **same lines**. Without a separation step the two get tangled, and the architect's rule ("never in the same deploy") is easy to break. See the open question.
- **Deploy:** profile server plus game client, in a slot **after** `0340`'s. Only after `0395` confirms `vfy:true` live, **and** after the owner looks at the post-`0391` login numbers (ADR-122). Both deploy orders are safe; see §6.
- **Effort:** about 1 day of build plus tests. This is an estimate.

## 1. What I checked (evidence)
- **Callers.** `resolveCaller` → `callerFromSession(claims)` returns `{status:"ok", playerId: claims.pid, verified: claims.vfy === true}` (uncommitted 0340 hunk in `Routes.ts`). Login keeps a local `verified` and signs it into the token (`signSessionToken(..., { verified })`).
- **The 4 S1 channels and where they are now** (`src/profile-server/Routes.ts`, uncommitted tree):
  - `GET /v1/profile` → `toPublicProfile(...)` (~`:677`)
  - `POST /v1/login` → `profile: toPublicProfile(...)` (~`:802`)
  - `GET /v1/messages` → `toPublicInboxMessages(...)` (~`:1180`)
  - `PATCH /v1/messages/read` → `hiddenInboxMessageIds` / `toPublicInboxMessages` (~`:1214`)
  - `POST /v1/profile/tenure-grant` → `xp: equalizedXp(outcome.xp, outcome.isCitizen)` (~`:1641`)
- **Projection module.** `src/profile-server/PublicProjection.ts` holds the S1 (unverified) view. Its doc already says *"S3b adds the owner view beside it and branches on `caller.verified` at the same call sites."*
- **Schema.** `PublicPlayerProfileSchema` = `PlayerProfileSchema.omit({is_paid_citizen, citizenship_purchased_at}).extend({name_change: optional})`. Zod strips unknown keys by default, so an older client silently drops new keys.
- **Client.**
  - `PlayerProfileView.ts` no longer calls `reportEarnedCitizenshipTransition` (S1). The `_v2` storage prefix is in place.
  - The client reads only `created` / `grantChecks` from the login response (`ProfileSession.ts`, `LoginOutcome = Pick<...>`). The card reads `GET /v1/profile`.
- **Old bundles can never get a verified view.** The first client commit that sends `signature` (`df3c6b3`) has S1 (`68303d5`) as an ancestor, so any bundle able to get `vfy:true` already uses the `_v2` prefix and never calls the detector. A pre-S1 bundle can never receive an owner view, so it cannot fire a false Earned event.
- **Paid grant.** The paid grant SQL sets `is_paid_citizen = true` and `citizenship_purchased_at = coalesce(..., now())` together. `GRANT_CITIZENSHIP_SQL` still stamps `citizenship_earned_at` when a **paid** citizen crosses 100. That is why the Earned event needs the paid facts.
- **Deploy guard.** `build-deploy-profile.sh` **refuses** a deploy whose shipped files have uncommitted changes (task 0355). Uncommitted server-side S3b can't ship by accident, but it would block the profile deploy until stashed or committed.
- **Tests that pin today's "verified = unverified" rule** (0340 guards; these are expected changes, not regressions):
  - `SessionRoutes.test.ts` ~`:301` (parameterised over 7 routes)
  - `TenureGrantRoutes.test.ts` ~`:165`
  - `LoginVerificationRoutes.test.ts` ~`:265` ("same body shape" for the `ok` row)
  - `Login.it.test.ts` ~`:151` (`xp` 0, still true)

## 2. Changes, in order

### Step 1 — Core schema (`src/core/`; tests are mandatory)
- `src/core/profile/PlayerProfile.ts`:
  - `PublicPlayerProfileSchema` gains `is_paid_citizen: z.boolean().optional()` and `citizenship_purchased_at: z.iso.datetime().nullable().optional()`, via the existing `.extend`.
  - `.optional()` is **required** for separate deploys (verification step 5; the `name_change` precedent).
  - Rewrite the doc comment: the paid keys appear **only** in the verified owner view. Unverified callers get the equalized S1 view without them. Pointer to `PublicProjection.ts`.
  - No change to `PlayerProfileSchema`, `CURRENT_PROFILE_SCHEMA_VERSION` or the DB.
- `src/core/profile/LoginContract.ts`: comment only. "no route reads it yet" becomes "the profile, inbox and tenure routes give a `vfy:true` caller its own true view (0250 S3b)".

### Step 2 — Server projection (`src/profile-server/PublicProjection.ts`)
- **Keep the S1 functions byte-identical in behaviour**: `toPublicProfile`, `equalizedXp`, `toPublicInboxMessages`, `hiddenInboxMessageIds`. Give `toPublicProfile` a narrow return type, `Omit<PublicPlayerProfile, "is_paid_citizen" | "citizenship_purchased_at">`, so the unverified view's type says the paid keys are absent.
- **Add `toOwnerProfile(profile, nameChange?)`.** It returns the stored record unchanged (true `xp`, `citizenship_earned_at`, `updated_at`, `is_paid_citizen`, `citizenship_purchased_at`), with `name_change` merged exactly like `toPublicProfile`. The profile carries no identity (0270), so nothing else can ride along.
  - Both paid keys are **always present together** in the owner view, even when false/null. Their presence then marks the owner view for the client and depends only on the caller's own token, never on the target's state.
- **Add the per-caller choosers** — one place, so all 4 channels branch the same way:
  - `profileForCaller(profile, nameChange, verified)` → `verified ? toOwnerProfile : toPublicProfile`
  - `xpForCaller(xp, isCitizen, verified)` → `verified ? xp : equalizedXp(xp, isCitizen)`
  - `inboxMessagesForCaller(messages, verified)` → `verified ? [...messages] : toPublicInboxMessages(messages)` (the original keys, no collapse)
- Update the module doc: there are now two views, and the choice is made by the caller's `verified` flag only.

### Step 3 — Server routes (`src/profile-server/Routes.ts`)
- **`GET /v1/profile`:** `profileForCaller(profile, nameChange, caller.verified)`. Remove the `TODO(payments)` lines it resolves. Update the route comment.
- **`POST /v1/login`:** `profileForCaller(resolved.profile, ..., verified)`, using the **same** local `verified` that is signed into the token. The response view and the token always agree. This follows S1's approved plan ("branch at the same 4 call sites"). The client doesn't read this field today.
- **`GET /v1/messages`:** `inboxMessagesForCaller(outcome.messages, caller.verified)`.
- **`PATCH /v1/messages/read`:**
  - `hiddenIds = caller.verified ? new Set() : hiddenInboxMessageIds(listed.messages)`
  - visible = `inboxMessagesForCaller(listed.messages, caller.verified)`
  - The rest of the flow is unchanged (same query pattern for both). A verified caller's `updated` counts all of its own unread rows; nothing is hidden from the owner.
- **`POST /v1/profile/tenure-grant`:** `xp: xpForCaller(outcome.xp, outcome.isCitizen, caller.verified)`. `xpAwarded` stays unchanged (owner-ruled, review.md).
- **Small hardening, same change:** `Cache-Control: no-store` on `GET /v1/profile` and `GET /v1/messages`, for **every** caller. The header depends only on the route, so it gives no paid signal.
  - Why: these responses may now carry purchase facts. The login route already does this ("The body carries a credential: no cache may keep it").
  - The owner can strike it. Bodies don't change.
- **Untouched:** name-change routes (0319's job), payments intent/complete/reconcile, internal routes. Their comments stay "does not read `verified`".
- Update the `CallerResolution` / `SessionCaller` doc: `verified` is now read by profile, login, inbox and tenure (0250 S3b). `ok` alone is still never a proven owner.

### Step 4 — Client (`src/client/PlayerProfileView.ts`)
- **New field `isPaidCitizen: boolean` on `PlayerProfileView`.**
  - `true` **only** when the parsed profile is an owner view and `is_paid_citizen === true`.
  - `false` for every zero-state, every unverified (S1) view, and every older server.
  - Doc: fail-closed for entitlement (ADR-116 Decision 4); 0248 will read this. No UI uses it in S3b.
  - Zero-state literals and test fixtures that build the view (e.g. `CitizenshipCard.test.ts`) gain `isPaidCitizen: false`.
- **Owner-view test:** `profile.is_paid_citizen !== undefined`. The server only sends that key in the owner view.
- **Earned:XP back on, for owner views only.** `loadPlayerProfileView` calls the detector only for an owner view. An unverified read touches **no** storage, so it can't arm the transition with an equalized `null`.
- **The paid fix (brief note 2026-09-27).** The detector learns the paid facts. It still stores `citizenship_earned_at` under `_v2` every time, but **fires only when** the previous value was `""`, the date is now set, **and** the earn came before any purchase:
  - not paid → fire;
  - paid with `citizenship_purchased_at > citizenship_earned_at` (earned first, paid later) → fire;
  - paid with purchase at or before the earn, or paid with no purchase date → **suppress** (lean to under-counting, as D4 already does).
  - This correctly handles a player who earns and then pays between two page loads.
- Rewrite both doc comments. The "S3b can rule that case out" wording becomes a description of the rule.

### Step 5 — Docs
- `ai-agents/knowledge-base/analytics-event-reference.md`, `CITIZENSHIP_EARNED_XP` row:
  - dormant **until the S3b client and server are both live**;
  - then fires on verified reads only, under `_v2`;
  - never for a citizen whose purchase came first;
  - unverified sessions still never fire (under-count, accepted by D4);
  - the fresh-device under-count residual is unchanged.
- No wiki writes. After close, `fkit-wiki` should ingest. No new ADR: ADR-116 Decision 2 already names S3b as a consumer of `verified`, and D1 rules the payload.

## 3. Tests

### Unit (`npm test`)
**`tests/profile-server/PublicProjection.test.ts`:**
- `toOwnerProfile` returns stored values verbatim, both paid keys always present, `name_change` in and out, valid against `PublicPlayerProfileSchema`.
- The choosers: `verified=false` gives a result **deep-equal** to the S1 functions on the existing S1 fixture matrix; `verified=true` gives true values.

**"Unverified caller sees exactly today's S1 view" — on every channel** (`Routes.test.ts`, `LoginRoutes.test.ts`, `InboxRoutes.test.ts`, `TenureGrantRoutes.test.ts`):
- Every existing S1 leak test stays **unchanged and green**. That is the regression net.
- New: with `bearerFor(id, {verified:false})`, the body is deep-equal to the S1 projection of the same row. It has **no** `is_paid_citizen` or `citizenship_purchased_at` key (`not.toHaveProperty`). Its JSON byte length matches the S1 body.
- New: for a paid citizen, the verified and unverified bodies **differ**, so the branch really runs. Kills a "always public" mutation.

**"Verified caller sees only their own paid facts":**
- Two stored players, A (paid, xp 30, purchased date) and B (earned, xp 1200).
- Token verified for A → body has A's facts (`is_paid_citizen: true`, A's date, `xp: 30`, `citizenship_earned_at: null`, original `citizenship_paid` inbox key, true tenure `xp`).
- Assert **no B value appears anywhere** in A's body.
- A legacy `?yandexPlayerId=B` / stray body id with A's verified token → 401 or ignored, exactly as today, never B's data.
- Verified for B → `is_paid_citizen: false`, `citizenship_purchased_at: null`, true `earned_at`.

**Attack cases (verification step 2):**
- A token with `vfy:true` but a tampered MAC → 401.
- A token with `vfy:true` for a player that is gone → 404.
- **Forgery:** a valid signature for A with B asserted → `vfy:false` → B's login `profile` is the S1 view (no paid keys), and B's later `GET /v1/profile` with that token is the S1 view.
- Extends the existing forgery test in `LoginVerificationRoutes.test.ts`.

**0340 guards, rewritten (not deleted):**
- `SessionRoutes.test.ts`: the "vfy:true answered exactly like vfy:false" guard is **kept** for the name-change ×3 and payments-intent routes, so 0319 still has to update it on purpose. For the profile and inbox routes it becomes "verified gets the owner view, unverified gets S1".
- `TenureGrantRoutes.test.ts` ~`:165`: the verified case now gets the true `xp` (110). The repository call is still identical.
- `LoginVerificationRoutes.test.ts` "same body shape": unchanged for every non-`ok` row; the `ok` row expects the owner-view profile.

**Inbox PATCH, verified:** a player who earned and then paid has two citizenship rows; both are visible, and mark-all counts both.

**Core:** `tests/core/profile/PlayerProfile.test.ts`:
- The schema parses a body with and without the paid keys; rejects wrong types (`is_paid_citizen: "yes"`, a bad date).
- **Cross-deploy (step 5):** an S1-era copy of the schema parses a new owner body (keys stripped), and the new schema parses an S1 body.

**Client:** `tests/client/PlayerProfileView.test.ts`:
- Owner view with `is_paid_citizen: true` → `isPaidCitizen: true`.
- S1 view, old-server body, and every zero-state → `false`.
- Earned:XP:
  - an unverified sequence never fires and writes nothing;
  - verified `""` → date for a non-payer fires once;
  - paid-then-earned is suppressed (and the date is still stored, so it never fires later);
  - earned-then-paid between two loads fires;
  - paid with a null purchase date is suppressed;
  - per account; storage unavailable never throws.

### Integration (`npm run test:integration`, real Postgres)
New `tests/integration/VerifiedOwnerView.it.test.ts`, or extend `PaidStateEqualization.it.test.ts`. Uses the `Login.it.test.ts` signing-app pattern: a synthetic test key, synthetic ids only.
- **Seeding:** real sign-in (verified), then real credit and `grantPaidPurchase`, using the classes from S1: paid-not-earned, earned at 100, paid-then-earned, earned-then-paid, non-citizen.
- **Step 1:** a signed login for the paid player → `vfy:true` → `GET /v1/profile` shows `is_paid_citizen: true` and the stored purchase date. Inbox shows `citizenship_paid`. Tenure shows the true total.
- **Step 2:** the same player under a `vfy:false` token sees the S1 view, deep-equal to what the S1 suite asserts. A forged login (A's signature, B asserted) → B's S1 view. Stored rows are unchanged.
- **Step 3:** the S1 enumeration suite still runs unchanged under unverified tokens.

### Proof steps
- **Mutation check:** force the choosers to "always owner" → the unverified/S1 tests must fail. Force "always public" → the verified tests must fail. Restore byte-identical (`cmp`), as S1 did.
- **Gates:** `npx tsc --noEmit`, `npm run lint`, prettier on touched files, full `npm test` (shell harnesses included), `npm run test:integration` (needs `gc-0012-it-pg` and `.env.test`). If Postgres isn't available, I say so and claim no pass. Supertest flakes: re-run and say I re-ran.

## 4. Verification steps (brief) mapped
1. **Verified reads own paid state:** integration step 1, plus the client parse test. The live check comes after deploy (§6).
2. **Unverified or other-player caller learns nothing:** the attack tests above, all 4 channels, including the forgery case and "another player's valid id".
3. **Enumeration gains nothing:** the S1 enumeration suite is unchanged. The owner-view keys depend only on the caller's own token. Timing is **not measured**: the branch is a pure in-memory choice, with no paid-dependent database work.
4. **Card does not regress:** the unverified view is identical. A verified citizen's card shows true XP again, which is what it showed before S1.
5. **Cross-deploy:** `.optional()` keys plus zod's strip behaviour; tested both ways.
6. **Fail-open / fail-closed:** no new failure path. `verified` comes from the token alone, with no database or Yandex call. Every verification failure is `vfy:false` (0340) → S1 view, read still 200, `isPaidCitizen: false`.
7. **Core tests:** `PlayerProfile.test.ts`.
8. **No secrets:** synthetic keys and ids only.

## 5. Edge cases
- **Stale or failed signature** (ADR-121/122) → the paid citizen sees the S1 view (100 / 100, neutral inbox) and `isPaidCitizen: false`. Accepted by ADR-116 Decision 4. This is what the owner's ADR-122 data look is for.
- **Stolen verified token** → shows the victim's paid facts for up to 24 h. This is ADR-116 accepted residual 1 (a bearer credential with no revocation). The data is now more sensitive; the residual is the same kind.
- **L5 polling inference:** **unchanged** by S3b, because unverified reads keep the S1 view. Owner-accepted as persisting even after verified login: ADR-116 residual 4 (owner-accepted 2026-09-29) says closing it would mean refusing unverified reads, which Decision 4 forbids.
  - review.md's L5 re-raise line ("S3b ships and this still reproduces for an unverified caller") will therefore trigger on its wording. ADR-116 is the answer, so it is not a new defect.
  - Likewise, the D4 side effects and the "citizen xp is constant" residual remain for **unverified** sessions only.
- **New verified player** (created at login) → owner view with `is_paid_citizen: false` and a null date.
- **`name_change` lookup failure** → the field is absent, same as today, in both views.
- **Same device, two Yandex accounts** → the Earned storage key is per account. `0394` (re-login on account switch) stays in the backlog (ADR-122), and nothing here depends on it.
- **Verified PATCH of another player's message ids** → 0, scoped in SQL as today.
- **An operator-sent literal message with purchase wording** → out of scope, as in S1.

## 6. Deploy notes
- **What ships:**
  - **Profile server** (`build-deploy-profile.sh`): the projection and routes. This is the part that matters for privacy.
  - **Game client** (`build-deploy.sh`): `isPaidCitizen` and the Earned:XP detection.
- **Gates, in order:**
  1. `0340` deployed in **its own, earlier** slot (architect advice 2026-10-05; ADR-122 *Consequences*). **Never in the same slot as 0340.** A minting bug plus S3b would hand raw paid facts to the wrong session.
  2. `0395` confirms `vfy:true` live (owner ruling 2026-10-05, brief note).
  3. The owner looks at the post-`0391` login numbers (stale share, `ok`, `id_mismatch`, `bad_payload`, read from the first post-deploy point; counters restart at each profile deploy) and decides to deploy or wait (ADR-122). Record the window, the numbers and the call in this task's `worklog.md`.
  4. A weekend slot (owner's standing rule). Earliest realistic: the slot after 10/11 Oct, if `0395` is done by then.
- **Order:** both orders are safe.
  - Server first: today's live client strips the new keys and doesn't run the detector. Verified players just see true XP and the original inbox wording, which the client already knows.
  - Client first: the new client against the 0340 server sees no owner keys → `isPaidCitizen: false`, no detection → same as today.
  - So the runbook's usual game → profile order is fine. The design report's order (server then client) is equally fine.
- **Rollback:**
  - Server S3b → 0340 is safe: verified callers fall back to the S1 view, and the client fails closed.
  - Client rollback is safe: the old client strips the keys.
  - ADR-116's "never roll back past S2" rule is unchanged.
- **After deploy:** by the owner's build-vs-verify rule (2026-09-29), close S3b on build plus review, and the producer files a verify task at the top of the next sprint. That task is a DevTools check: a verified paid test account's `GET /v1/profile` shows `is_paid_citizen: true`; a `vfy:false` session shows the S1 view.

## 7. Out of scope
- `0248` (the ad-suppression gate; it reads `isPaidCitizen` later)
- `0319` (gating name change on `verified`)
- `0332` (the join token / game server)
- `0323`, `0249`, the ADR-103 exit, the inbox auth seam, `persistent_id`
- Any `entitlements` / `ad_free` object (superseded by D1; adding it alongside would be a new owner question)
- Any change to the unverified (S1) view, including L5
- Card or UI changes; a read-side `verified` metric; `0394`

## 8. Files
- **Edited:**
  - `src/core/profile/PlayerProfile.ts`
  - `src/core/profile/LoginContract.ts` (comment)
  - `src/profile-server/PublicProjection.ts`
  - `src/profile-server/Routes.ts`
  - `src/client/PlayerProfileView.ts` (plus any zero-state literals or fixtures that build the view)
  - `ai-agents/knowledge-base/analytics-event-reference.md`
- **Tests:**
  - `PublicProjection`, `Routes`, `LoginRoutes`, `LoginVerificationRoutes`, `InboxRoutes`, `TenureGrantRoutes`, `SessionRoutes` (`.test.ts`)
  - `tests/core/profile/PlayerProfile.test.ts`, `tests/client/PlayerProfileView.test.ts`, `CitizenshipCard.test.ts` (fixtures)
  - new or extended integration suite, plus `Login.it.test.ts`
- **Not committed by me.** The commit is the owner's call; see the open question.

## Coder decisions inside the plan that the owner may overturn at approval
(a) the login response also returns the owner view when its own token is verified (follows S1's approved 4-call-site plan; the client doesn't read it); (b) the owner view returns the true updated_at; (c) Cache-Control: no-store on GET /v1/profile and GET /v1/messages for every caller; (d) the client spots the owner view by the presence of is_paid_citizen, with no separate marker field; (e) the Earned:XP paid fix uses the purchase date vs the earned date, and suppresses when unsure.

---

## Owner ruling at the plan gate (2026-10-06, live via `AskUserQuestion` in the `fkit lead` session; recorded by the driver, `fkit-sprint-ship-loop`)

Everything above this line is the approved S3b plan text, copied unchanged (S1's approved plan stays in `plan.md`). Owner answer, verbatim: *"1, but don't start working on it yet. I want to go through the profile server deploy steps with you first."* ⇒ Approved, including the coder's five overturnable choices (a)–(e). **Build is on hold until the owner says to start.** Build on top of `71efd10` (0340) and commit before the 10/11 slot so S3b cannot ride along with 0340.
