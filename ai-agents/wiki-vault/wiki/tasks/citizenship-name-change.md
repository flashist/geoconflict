# Name Change (Citizens Only)

**Source**: `ai-agents/tasks/done/0067-name-change-citizens-only/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — Phase 2 citizenship benefits — task `0067`

> ✅ Done (agent-closed 2026-08-28 — **not owner-verified**). Closed by a producer spawned by the sprint ship-loop; **no human has checked this work**.
>
> 🚨 **NOTHING in this task is verified in production.** Every figure below is local-stack, unit or integration evidence.
>
> 🔧 **UPDATED 2026-08-30 — the "no deploy has happened" half of this banner is now stale, and the change is smaller than it sounds.** This page previously read *"Effective posture: built-awaiting-deploy — the same as `0062` and `0063`. No deploy has happened."* **A production release landed as commit `362a2f9`**, and this task's code is in it — verified by ancestry (`0067`'s profile-server work landed in `d442ac2`, an ancestor of `362a2f9`) plus the live `commit.txt` check recorded in [[tasks/prod-api-env-https-apex]]. **So the code shipped. Nothing about its behaviour was checked, and two gates keep the feature dark anyway:** `CITIZENSHIP_CARD_ENABLED` is still `false` in `FlashistFacade.ts`, and `PROFILE_INTERNAL_TOKEN` was **deliberately left blank for this release**, so `ProfileApiClient.isConfigured()` is false and every profile call from the game server no-ops (task `0062`, still open). **"Deployed" here means the bytes are on the box — not that one line of this feature has run.**
>
> 🚨 **The citizenship card has never been seen in a browser.** `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is `false`, so the entire UI leg — entry point, pending/approved/rejected states, the cancel control — is proven by unit tests and by nothing else.
>
> 🚨 **The operator Telegram notification is unit-proven only** (`jest.mock("undici")`). Proxy reachability from the profile VPS was never exercised and is not locally testable; that verification belongs to task `0033`.

## Goal

Ship the first user-facing citizenship benefit: a citizen (earned or paid) can request a display-name change, an operator moderates it, and only an approved name becomes active. Non-citizens and guests cannot reach the feature at all.

Scoped 2026-08-24 by owner ruling. All three of the brief's open questions were ruled 2026-08-28 (lead session, `AskUserQuestion`):

- **Moderation channel** — Telegram notification on a new pending request through the **existing** bot pipeline, plus a service-authenticated internal approve/reject endpoint. **No moderation UI.**
- **Scope of the approved name** — **profile/citizenship card only.** Start-screen prefill, lobby lists and in-match labels are a separate follow-up.
- **Validation** — reuse the existing in-game username validator plus the schema's case-insensitive uniqueness index. No new bespoke rules.

## Key Changes

**New files**

| File | What it is |
|---|---|
| `migrations/004_name_change.sql` | `rejection_reason` + `decided_at` columns on `player_name_history`; the one-pending partial unique index; a latest-request index |
| `src/core/validations/usernameRules.ts` | Dependency-free length/charset rules returning message keys — the extraction that lets the profile server share the in-game validator |
| `src/core/notifications/TelegramNotifier.ts` | Shared `sendTelegramMessage()` — undici + `ProxyAgent`, abort timeout, never throws, token never logged |
| `src/core/profile/NameChangeContract.ts` | Zod wire contracts plus the public `NameChangeState` projection |
| `src/profile-server/NameChangeRepository.ts` | Data layer: request / cancel / decide / `getLatestState`; the citizen gate is enforced **in SQL** |
| `src/client/NameChangeRequest.ts` | Client orchestration, on the `CitizenshipPurchase.ts` precedent |

**Modified**: `src/core/validations/username.ts` (`validateUsername` becomes a thin translating wrapper over `usernameRules`; `sanitizeUsername`/profanity untouched), `src/core/profile/PlayerProfile.ts` (`PublicPlayerProfileSchema` gains optional `name_change`), `src/profile-server/Routes.ts`, `src/profile-server/Server.ts`, `src/client/PlayerProfileView.ts`, `src/client/CitizenshipCard.ts`, `resources/lang/en.json` + `ru.json` (new `citizenship_name_change` section, 15 keys, both files), and the three profile deploy files (`example.env.profile`, `setup-profile.sh`, `build-deploy-profile.sh`) for the Telegram variables.

**Endpoints**

- `POST /v1/profile/name-change-request` — player, citizen-gated, 30/min per IP
- `POST /v1/profile/name-change-cancel` — player, citizen-gated (owner amendment 2: self-service cancel)
- `POST /internal/v1/name-change/decide` — `internalAuth`, no CORS

**Notable implementation choices**

- **Cancel deletes the pending row** rather than adding a `cancelled` status — migration 001's CHECK allows only pending/approved/rejected, and marking it `rejected` would lie about who rejected it. Scoped to the caller's own id **and** `moderation_status = 'pending'`, so a decided row can never be erased.
- **Rate limiter 30/min per IP**, not 10 — Russian carriers CGNAT thousands of players behind one address, and operator Telegram spam is bounded by the one-pending unique index (a second request 409s without inserting or notifying), not by this limiter.
- **`GET /v1/profile` degrades rather than 500s** when the name-change lookup fails; that read drives the whole citizenship card.
- **Review R1 (owner-ruled option A)** shipped as one fix, not two: a `claimNotifySlot` cooldown of one notification per player per 10 minutes, **plus** an optional `expectedName` field on the decision request compared inside the decision transaction (mismatch → rollback → `409 name_mismatch`). Without the binding, a request → cancel → re-request cycle inside the cooldown window would swap the pending name under a notification the operator already held — a bypass of the human moderation gate. That bypass is proven closed by an integration test against real Postgres, not by argument.
- **Review R4**: both `23505` catches are narrowed by index name via `isUniqueViolationOn()`; anything else rethrows. Postgres does populate `constraint` for a partial unique *index* — verified empirically.

## Outcome

Green at close, after both fix rounds: `npx tsc --noEmit`, `npm run lint`, prettier, `npm test` **103 suites / 1039 tests**, `RUN_DB_TESTS=1 … jest tests/integration --runInBand --forceExit` **5 suites / 70 tests** against real Postgres, en/ru parity 15/15 keys. `npm run migrate` on a cold scratch DB applied 001→004 in order and re-ran idempotently. Stateful review Round 1: all five findings dispositioned, ledger `Status: closed-out`, reviewer independently re-ran every check and reproduced every number in a phase-2 pass.

**Open residuals — do not soften these.**

- **(a) Forged-id offensive name submission — OPEN, mitigated.** The player routes accept a client-asserted, unverified `yandexPlayerId` ([[decisions/adr-103-identity-trust-seam]]), so someone who knows a citizen's non-secret id can submit an offensive name in that citizen's name. The human moderation gate mitigates it — and is materially stronger after R1, because a decision cannot be applied to a name the operator never read. Closes on `0014` (signed-payload verification, blocked on the Yandex IAP secret key).
- **(b) 🚨 The pending, unmoderated name is PUBLICLY READABLE — UNMITIGATED.** `GET /v1/profile` is unauthenticated and enumerable by a non-secret player id, and `toPublicProfile` returns `name_change.requested_name` — whatever was submitted, **before any operator sees it**. **This passes no gate at all.** The moderation gate does **not** apply: an operator reviews a name before it is APPLIED, never before it is PUBLISHED. Owner-ruled to keep the field (the player must be able to see their own request). **Do not describe this as solved, mitigated, or bounded.**
- **(c) The operator-notification cooldown is in-process.** A restart, or a second instance, allows one extra notification. Deliberate — the `expectedName` binding, not the cooldown, is what carries the safety.
- `Master.ts` keeps its two duplicated Telegram call sites (owner-confirmed amendment 3); three copies co-exist until task `0033` consolidates them. No analytics events (amendment 4).

**Two defects found here and routed out rather than absorbed.**

- **`0195`** — `YANDEX_PAYMENTS_SECRET` is missing from `build-deploy-profile.sh`'s export block, so payments have been silently 503 on the real box since `0019`. See [[decisions/config-parity-failure-class]].
- **The jest-worker `SIGSEGV` flake** — `npm test` aborted a suite on two runs, on a **different untouched file each time**; both passed standalone and both full re-runs were green. Tracked under `0197`, which **closed 2026-08-30 with a root cause: an upstream V8 garbage-collector bug, not repository-fixable.** See [[tasks/test-suite-reliability-investigation]].

  > 🔧 **CORRECTED 2026-08-30 — this bullet previously ended with a claim that is FALSE.** It read: *"The `tests/integration` directory also hangs past ten minutes without `--forceExit` (open `pg` pool handles) — pre-existing, and it means a reviewer's identical command can hang."* **Both halves were wrong.** `0197` measured it: without `--forceExit` the suite exits by itself in ~3–4 s, 10 runs out of 10 warm and 3 out of 3 on a cold first-migration database, with `--detectOpenHandles` reporting **zero** open handles — every pool was already closed in an `afterAll`. The folklore came from jest printing its force-exit banner unconditionally whenever the flag is set. **`--forceExit` has been removed from `test:integration`, and a future hang is now a real regression.** The invocation recorded in this page's § Outcome (`… --runInBand --forceExit`) is what was actually run at the time; it is left as the historical record, not as the current command.

## Related

- [[tasks/citizen-verified-icon]] — task `0068`, the other Phase 2 citizenship benefit, built the same day and independent of this one
- [[tasks/citizenship-xp-progress-ui]] — the citizenship card this feature attaches to
- [[tasks/hide-citizenship-card-flag]] — task `0054`'s default-OFF flag, the reason this UI has never been seen in a browser
- [[systems/player-profile-store]] — the profile API, the `player_name_history` table, and migration 004
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted-id trust level residual (a) rests on
- [[decisions/config-parity-failure-class]] — `0195`, found during this build
- [[tasks/test-suite-reliability-investigation]] — task `0197`, which investigated the flakes seen here and disproved the integration-hang claim this page carried
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose close-out carries the `362a2f9` production-deploy evidence this page now cites
- [[systems/localization]] — the `citizenship_name_change` en/ru section
- [[decisions/sprint-4]] — the sprint board carrying this task
- [[systems/flashist-init]] — the `CITIZENSHIP_CARD_ENABLED` gate and platform signals this UI sits behind
