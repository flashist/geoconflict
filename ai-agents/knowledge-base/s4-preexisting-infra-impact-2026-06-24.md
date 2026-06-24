# Pre-existing Player Infrastructure — Impact on Sprint 4 Profile & In-App Work

**Date:** 2026-06-24
**Author:** Claude (multi-agent analysis; 5 requirement-mappers + 7 per-subsystem intersection analysts + 7 adversarial challengers + synthesizer)
**Companion to:** [`pre-s4-player-infra-audit-2026-06-24.md`](./pre-s4-player-infra-audit-2026-06-24.md)
**Question answered:** Does anything from the **pre-existing** player infrastructure affect our **s4 profile and in-app** tasks, and where should we **keep/adapt** vs **remove-and-rebuild from scratch**?

**Method.** The pre-s4 audit's seven subsystem findings (identity, nicknames, patterns, flags, clans, in-app/monetization, persistence/transport) were each mapped against the consolidated requirements of the s4 profile/in-app task briefs, verified against current code at `file:line`, then adversarially challenged so that "rebuild" calls aren't reflexive and "keep" calls aren't preserving cruft. Recommendations below use the *revised* call where the challenger overruled the first pass.

**Recommendation vocabulary:** `keep-asis` · `keep-adapt` · `remove-rebuild` · `remove-delete` · `irrelevant`.

---

## 1. Bottom line

Of the seven pre-existing subsystems, **four genuinely affect s4** (identity, nicknames, patterns, in-app/monetization), **persistence/transport** is the spine they all attach to, **clans** is passive, and **flags** is inert *except for one live build-wide bug*.

The single most important call: **keep the join/transport spine — `ClientJoinMessage`, the persistentID/`yandexPlayerId` lane, `sanitizeUsername`, pattern rendering — and add the missing trust boundary in the new profile/payments server rather than rebuilding any of it.** Every s4 slice (T5/T6/payments/citizenship/archive) is designed to *attach* to this spine; a rebuild would throw away merged work (T1/T3/T4a–g) and break the only working identity path in the Yandex build.

The one thing that does **not** exist and must be built fresh is **server-side identity/payment verification**. Both `persistentID` and `yandexPlayerId` are forgeable at the wire, and **there is no signed identity artifact on the join path at all** — so T6's documented *"fall back to the verified persistentID"* rests on a false premise, and earned-XP crediting has nothing to HMAC-verify.

The inherited OpenFront Stripe/Fuse/Discord-JWT machinery is dead in the Yandex build and should eventually be deleted, but that cleanup is **out of s4 scope** and carries pattern-rendering/join regression risk if done carelessly.

---

## 2. Decision table

| Subsystem | Affects s4? | Recommendation | One-line why |
|---|---|---|---|
| identity (§3.1) | Yes | **keep-adapt** | Join/persistentID + T3 `yandexPlayerId` lane is the merged substrate every slice uses; but both ids are forgeable — the profile server must own verification. |
| nicknames (§3.2) | Yes | **keep-asis** | `sanitizeUsername` is determinism-load-bearing (client+server); s4 only reuses it — T5 must REUSE it at the write boundary, not invent a second normalizer. |
| patterns (§3.3) | Yes | **keep-asis** | Live deterministic render + refs-only join contract; s4 builds entitlement parallel in Postgres, never through flares/Privilege. |
| flags (§3.4) | No (intentional suppression) | **keep-asis** | `/flags` 404 is *deliberate* flag suppression (Yandex country-flag policy + copyright + pending citizenship), **not a bug**; `CitizenshipCard` is policy-compliant (`🏳️` fallback, picker hidden). Lone residual: lang-selector broken glyph — pending owner decision. |
| clans (§3.5) | No (passive) | **keep-asis** | Stateless team-mode tag; only edge is `clanTag` riding the archive `GameRecord` (a passive PII widening for the compliance task). |
| in-app/monetization (§3.6) | Yes | **keep-asis (split)** | Live Yandex `showFullscreenAdv`/`FlashistFacade` is the payments anchor — keep; inherited Stripe/Fuse/flares spine is dead but entangled with live cosmetics validation — leave inert in s4. |
| persistence/transport/config (§3.7) | Yes | **keep-adapt** | The spine all slices attach to; reuse it, add `pg` driver (T5), forward `PROFILE_API_URL` (T4h), build verification (T6), re-target archive to S3. |
| OpenFront Stripe/Fuse/Discord-JWT auth | Dead | **remove-delete** (later, not s4) | Wrong provider, no backend deployed, zero real players hit it — but excision touches live LitElement/join code, so defer. |

---

## 3. Per-subsystem detail

### 3.1 Identity — keep-adapt

**Mechanism.** Every s4 profile/payments slice threads through the one-shot `ClientJoinMessage`. T3 (merged) correctly *extended* it with `yandexPlayerId` rather than replacing the join path. But the server's only id check, `verifyClientToken()` (`src/server/jwt.ts:23-24`), accepts a bare UUID as `{persistentId, claims:null}` with **zero verification**, and `yandexPlayerId` is stored as-is (`Worker.ts:411-412`, `Schemas.ts:550-557`, both flagged UNTRUSTED). So **both** server-visible identifiers are attacker-controllable. The dead Discord/email/JWT account spine yields `claims===null` / `flares===[]` for every real player.

**Reasoning.** Keep-adapt, not rebuild: the wire/identity plumbing is the intended, merged substrate, and the game join path can't function without the mandatory `token` field (`Schemas.ts:544`). What's missing — a real verification boundary — belongs in the new server, not in a rewrite.

**Honest tension (challenger, agreed).** "Add verification later" understates the gap. There is *no signed identity artifact on the join path* — `getYandexUniqueId()` wraps the unsigned `player.getUniqueID()` (`FlashistFacade.ts:919`, `Main.ts:703`). So the earned-XP T6 path has nothing to HMAC-verify; verification is only possible against a *payments* signed payload. T6's only honest options are (a) credit off the opaque/forgeable `yandex_player_id` and accept the risk for non-monetary XP, or (b) add new plumbing to forward a Yandex *signed* payload at match-end. **T6's stated "fall back to the verified persistentID" is false — persistentID is unverified in the Yandex build.**

**Evidence.** `src/server/jwt.ts:23-24`; `src/server/Worker.ts:411-412`, `:356-385`; `src/server/Client.ts:23-25`; `src/core/Schemas.ts:544,550-557`; `src/client/Main.ts:991-1028`, `:701-703`; `FlashistFacade.ts:919-936`.

**s4 tasks impacted.** s4-profile-03 (done), -05 (T5), -06 (T6), s4-yandex-payments-impl, s4-citizenship-paid/-earned, -04/04h (`PROFILE_INTERNAL_TOKEN`), -personal-data-compliance, -archive.

### 3.2 Nicknames — keep-asis

**Mechanism.** The strict 3–27/charset validator (`validations/username.ts:22-95`) is client-side; the only wire gate is `UsernameSchema = SafeString` (`Schemas.ts:188-193,219`), which permits emoji + up to 1000 chars. `sanitizeUsername()` runs in the `PlayerImpl` constructor on **both client and server** (`PlayerImpl.ts:117`), so it's load-bearing for game-state hash determinism. The s4 card already reads its name from `FlashistFacade.getCurPlayerName()` (`PlayerProfileView.ts:22-25`), reusing the existing source. `PlayerProfile.display_name` is inert scaffolding with zero consumers.

**Reasoning.** Rebuilding buys nothing for the RU/Yandex audience and risks desync.

**Refinement (challenger).** The only s4 obligation is at the T5 write boundary, and it must **REUSE the existing `sanitizeUsername`**, not "do its OWN normalization" — otherwise a second normalizer drifts from the game-state one and the DB/card name diverges from the in-game name. `PlayerProfile.display_name` is `z.string().nullable()` with no bound, so unbounded if T5 doesn't re-sanitize. The 1000-char/emoji risk is real only if the profile server reads the *raw wire username* instead of the already-sanitized player name.

**Evidence.** `username.ts:22-95`; `Schemas.ts:188-193,219`; `PlayerImpl.ts:117,120`; `GameRunner.ts:52-54`; `PlayerProfileView.ts:22-25`; `CitizenshipCard.ts:233`.

**s4 tasks impacted.** s4-profile-05 (T5 normalization), -citizenship-xp-progress-ui, -citizenship-paid, -personal-data-compliance, -archive, -profile-01 (done).

### 3.3 Patterns / Cosmetics — keep-asis

**Mechanism.** Patterns render live and deterministically (refs-only `PlayerCosmeticRefs` on join, re-resolved server-side via `PrivilegeCheckerImpl`). Entitlement is flares-driven from an external `/users/@me` (`Worker.ts:365-372`) that geoconflict does not run — so for Yandex players flares stays `[]`. s4 entitlement is the opposite: server-authoritative Postgres state keyed by `yandex_player_id`, written only by verified endpoints. `player_cosmetic_ownership` is a future-aware stub table with no logic.

**Reasoning.** Keep-asis: s4 builds entitlement *parallel*, never through flares/Privilege; touching the render/normalizer/join contract would regress live rendering for all clients. The flares model is the right *instinct* (server validates, client never grants) but the wrong *mechanism* for geoconflict.

**Load-bearing caveats (both challenger points, agreed).**
1. **`FailOpenPrivilegeChecker` is live in the geoconflict server today** — `PrivilegeRefresher.get()` returns it during the jittered startup window (`setTimeout(Math.random()*1000)`) and persistently if `cosmetics.json` ever fails to load (`PrivilegeRefresher.ts:14-16,45-47`, `Worker.ts:69-73`). With `allowedFlares()` undefined, this is the *only* gate on client cosmetic refs. It forges only cosmetic rendering — never `is_citizen`/`is_paid_citizen`/`xp` — but it is the exact **anti-pattern s4 credit/payment endpoints must NOT copy** (s4-profile-06 must fail-closed / service-token).
2. The **single-player full-pattern bypass** (`SinglePlayerModal.ts:538-552`) is the canonical client-trust footgun s4 must avoid for entitlement.

**Evidence.** `Privilege.ts:19-58,60-99,112-116`; `PrivilegeRefresher.ts:14-16,45-47`; `Worker.ts:69-73,356-398`; `Schemas.ts:409-420,549`; `cosmetics.json` product count = 0.

**s4 tasks impacted.** s4-yandex-payments-impl, -citizenship-paid, -profile-05 (ownership stub), -profile-06 (anti-pattern), -citizenship-xp-progress-ui, -archive.

### 3.4 Flags — keep-asis (intentional suppression)

> **Corrected 2026-06-24 (repo owner).** The first pass called the `/flags` 404 a regression to fix. It is **not a bug** — it is the deliberate mechanism for *suppressing* flags. This section is rewritten accordingly. **Note: the suppression is *interim* — flags are a planned non-country paid cosmetic (Yandex bans real-country flags/names), not permanently dead.**

**Mechanism.** The flag feature is inert *by design*, two ways: (1) server-side assignment is disabled (`Privilege.ts:53-54` comments out `cosmetics.flag = result.data` — keep this); (2) commit `895368d` renamed `resources/flags/` → `resources/flags_source/` so that every `/flags/*.svg` request **404s by design** (CopyPlugin preserves dir names — `webpack.config.js:347-360` — with no `flags_source → /flags` remap). Flags were disabled for the initial release because of **(a) Yandex Games' strict policy on real country names/flags, (b) copyright/licensing uncertainty on the images, and (c) pending proper citizenship logic.** The folder was renamed (not deleted) to retain the assets for later re-enable while guaranteeing nothing under `/flags/` is served.

**Reasoning.** keep-asis. **Do not "repair" the `/flags` 404** — re-enabling flags is a legal/policy decision, not a path fix. The shipped `CitizenshipCard` is **policy-compliant in production**: its no-flag fallback is the neutral `🏳️` emoji (`CitizenshipCard.ts:212`), and the flag picker is `display:none` in the Yandex build, so real players always have empty `localStorage["flag"]` → they get `🏳️`, never a country flag. The broken-image glyph only arises for a hand-set/legacy localStorage value; an `onerror` swap to `🏳️` (`CitizenshipCard.ts:207`) is *optional* defensive polish, not a required fix. Do **NOT** remove `FLAG_STORAGE_KEY` / `FlagSchema` — the s4 card imports them. **One residual:** the **language-selector** flag (`LangSelector.ts:324`, `LanguageModal.ts:111`) is visible in prod with no fallback → broken-image glyph next to the (still-readable) language name. This is likely collateral of the blanket rename; whether language flags are also in-scope of the suppression is a **pending owner decision** (left as-is for now).

**Evidence.** `Privilege.ts:53-54`; `webpack.config.js:347-360`; `CitizenshipCard.ts:207,212`; `FlagInput.ts:104,110`; `LangSelector.ts:324` (visible in `yandex-games_iframe.html:345`, no fallback); `LanguageModal.ts:111`; flag picker hidden at `yandex-games_iframe.html:287-288`.

**s4 tasks impacted.** None blocking. The citizenship UI (`s4-citizenship-xp-progress-ui`, `-citizenship-paid`) correctly relies on the `🏳️` fallback; `s4-profile-05` reserves the inert `player_cosmetic_ownership(flag)` table only.

### 3.5 Clans — keep-asis (no s4 work)

Stateless team-mode tag parsed from username (`Util.ts:329-335`), consumed only by `assignTeams()`. Independent of profile/payments. The single edge: once the archive task flips `archiveEnabled()`, `clanTag` (derived from username via `getClanTag`, `GameServer.ts:988` / `LocalServer.ts:281`) becomes a **new persisted PII field in the S3 `GameRecord`** — so the 152-FZ compliance/retention/deletion work must cover it. That fix lives in the archive/compliance briefs, not the clan code.

### 3.6 In-app / Monetization — keep-asis (split verdict)

**Mechanism.** Three things bundled under one heading:
1. **Inherited Stripe/Fuse/flares spine — DEAD.** `handlePurchase()` POSTs to `getApiBase()+/stripe/...` (`Cosmetics.ts:36`) against an openfront.io host that doesn't exist; catalog has 0 products; no `/stripe` route in `src/server`; Fuse commented out in both templates; `GutterAds.show()` early-returns in iframe.
2. **Live Yandex `showFullscreenAdv` (`FlashistFacade.ts:958`)** — the real ad surface and the **payments anchor** s4 extends with `initPayments`/`getCatalog`/`purchase`.
3. **Net-new Yandex payments lane** — entirely absent; `is_paid_citizen` / `citizenship_purchased_at` exist as pure schema fields with no writer.

**Reasoning.** keep-asis for the subsystem in s4. The live ad/`FlashistFacade` path must not be touched (it's the anchor). The dead Stripe spine *is* removable in principle, but `handlePurchase` is wired to four live UI surfaces (`TerritoryPatternsModal:124`, `WinModal:268`, `PatternButton:123`) and `ProductSchema`/flares validation is load-bearing on **both** the client render path (`fetchCosmetics`) and the **server join path** (`Worker.ts:388-390` gates cosmetics on every join). So a careless rip-out regresses live pattern gating for zero s4 benefit. `is_paid_citizen` must be server-authoritative, written only by the HMAC-verified Yandex `/complete` — never the flares model. The one clean free deletion: `stripePublishableKey()` is a **zero-caller interface stub** (`Config.ts:65`, `DefaultConfig.ts:76,330`) — cosmetic cleanup, not s4-blocking.

**Evidence.** `Cosmetics.ts:26,36,45`; `jwt.ts:118-120`; `Master.ts:264`; `Privilege.ts:25,77,101`; `GutterAds.ts:62-64`; `index.html:96` / `yandex-games_iframe.html:170`; `FlashistFacade.ts:958`; `PlayerProfile.ts:35,37,69,71`.

**s4 tasks impacted.** s4-yandex-payments-impl (sole writer), -citizenship-paid, -yandex-catalog-registration, -profile-05, analytics-p1-citizenship-funnel, -citizenship-xp-progress-ui, -citizenship-earned.

### 3.7 Persistence / Transport / Config — keep-adapt

**Mechanism.** The spine all slices attach to. **Reuse by design:** T3 widened `ClientJoinMessage` with `yandexPlayerId`; T4b wired `profileApiUrl` through `RuntimeConfig`/`DefaultConfig`/`Config`/`Master.ts /api/env`; `archiveEnabled()===false` is intentional staging the archive task flips. **Gaps:** no runtime `pg` driver (`package.json:60` has only `@types/pg`); `migrations/` empty; profile-server is `/health`-only. **Confirmed deploy gap (T4h):** `.env.prod:22` sets `PROFILE_API_URL` but `deploy.sh:279-308` heredoc does NOT forward it → `profileApiUrl()` resolves to `""` in the container → **T6 crediting silently no-ops in prod** until T4h lands.

**Reasoning.** keep-adapt: rebuilding breaks the live anonymous join and orphans merged work. Adapt = forward `PROFILE_API_URL` (T4h), add `pg` + repository (T5), build verification on the untrusted join id (T6), re-target archive to S3.

**Tension (challenger).** The "dead OpenFront JWT path is the identity subsystem's call" punt understates scope — `jwtIssuer()` lives *in this spine* and is reused by the archive task; its dead consumers (`getUserMe`/`/users/@me`, the JWKS branch in `verifyClientToken`, and the `/matchmaking/checkin` poll which never runs because `enableMatchmaking()` is hard-false at `DefaultConfig.ts:308`) are delete-eligible here. But `jwtAudience`/`jwkPublicKey` are consumed by `src/client/jwt.ts` too, so deletion is real cross-tier surgery — which *reinforces* keeping the spine and deferring the auth-cruft excision.

**Evidence.** `package.json:60`; `Schemas.ts:557,232-234`; `Worker.ts:411-412`; `Archive.ts:21,32,55`; `DefaultConfig.ts:155-165,308,315-317`; `Master.ts:161-172`; `.env.prod:13-14,22`; `deploy.sh:279-308`; `profile-server/Server.ts:32`.

**s4 tasks impacted.** s4-profile-01/03/04b (done), -04h, -05, -06, -citizenship-earned/paid, -yandex-payments-impl, -archive, -08-backups/-postgres-backup-routine, -personal-data-compliance.

---

## 4. The "rip it out" list (delete, not adapt — **out of s4 scope** but real cruft)

A Yandex-only/RU build will never reach any of these. **None is required for s4; bundling deletion into s4 carries join/render regression risk — defer to a dedicated hygiene task.**

- **`Cosmetics.handlePurchase()` + the `/stripe/create-checkout-session` POST** (`Cosmetics.ts:26,36,45`) — wrong provider, no backend deployed, every pattern has `product:null` so it always dead-ends at an alert. The Buy CTA flows through `FlashistFacade`, not this. *Caveat: wired to 4 live UI click handlers, so removal edits live LitElement render paths.*
- **`stripePublishableKey()`** (`Config.ts:65`, `DefaultConfig.ts:76,330`) — **zero callers anywhere; the single truly-free deletion.**
- **`ProductSchema.priceId`** (`CosmeticSchemas.ts:15`) — Stripe-only metadata; but `ProductSchema` itself is load-bearing in cosmetics parsing, so only the `priceId` field is excisable.
- **Fuse ads** — commented out in both HTML templates (`index.html:96`, `yandex-games_iframe.html:170`); `GutterAds`/`AdTimer` early-return in iframe. Dead.
- **OpenFront Discord/email/JWT auth surface** — `getUserMe`/`/users/@me` (`jwt.ts:55`), the JWKS branch in `verifyClientToken`, the `/matchmaking/checkin` poll loop (`Worker.ts:481`, gated by `enableMatchmaking()` which is hard-false). `claims` is always `null` for real players. *Caveat: `jwtAudience`/`jwkPublicKey` are consumed by `src/client/jwt.ts` too — cross-tier surgery. Keep `jwtIssuer()` itself: the archive task reuses it.*
- **`role_group`/`role_groups` in `cosmetics.json`** — silently stripped by Zod (no `.passthrough()`), grant nothing — stale maintenance trap.

---

## 5. The "must handle / load-bearing" list

s4 work MUST account for these — they're live on the join/render path or create a security/data-integrity obligation:

1. **Forgeable identity at the wire.** `persistentID` AND `yandexPlayerId` are both attacker-controllable (`jwt.ts:23-24`, `Worker.ts:411-412`). The profile/payments server MUST own verification. T6's "fall back to verified persistentID" is a **false premise** — persistentID is unverified in the Yandex build. *(identity, persistence)*
2. **No signed identity artifact on the join path.** `getYandexUniqueId()` wraps the *unsigned* `getUniqueID()` (`FlashistFacade.ts:919`). Earned-XP T6 has nothing to HMAC-verify; only the *payments* signed payload is verifiable. T6 must either accept forgeable XP keying or add new signed-payload plumbing — this gap is under-documented across T3/T6. *(identity)*
3. **`sanitizeUsername` determinism** (`PlayerImpl.ts:117`, client+server). Do not touch. T5 must **REUSE** it at the profile write boundary, not invent a second normalizer (parity + hash safety). `display_name` is unbounded `z.string().nullable()`. *(nicknames)*
4. **`allowedFlares()` returns `undefined` in ALL envs** (Default/Preprod/Prod — Preprod's reject-list is now commented out; Prod never overrides). **Anonymous join is live everywhere** — the profile server cannot assume any upstream login gate. *(identity)*
5. **`FailOpenPrivilegeChecker` is live today** (`PrivilegeRefresher.ts:45-47`, `Worker.ts:69-73`) during the startup window / on `cosmetics.json` failure — cosmetic-only forgery, but the explicit anti-pattern s4 credit/payment endpoints must NOT copy (fail-closed / service-token). *(patterns)*
6. **`null` from `getYandexUniqueId()` under SDK-init degradation ≠ guest.** T6 must distinguish "identity-not-yet-known" from "genuine guest" or it permanently denies XP to real authorized players. *(identity)*
7. **Single-player full-pattern bypass** (`SinglePlayerModal.ts:538-552`) — the canonical client-trust template s4 must avoid for `is_citizen`/`is_paid_citizen`. *(patterns)*
8. **`is_citizen`/`is_paid_citizen`/`citizenship_*` are server-derived ONLY** — never read/persisted from client or migration payload; sole writer is the HMAC-verified Yandex `/complete`. *(monetization, persistence)*
9. **Archive re-enable writes PII to the game host** unless re-targeted: `Archive.ts:32` POSTs `GameRecord` (display names, persistentID, cosmetics, `clanTag`) to `jwtIssuer()/game/<id>`. The archive task MUST re-target to S3 *before* flipping `archiveEnabled()`. *(persistence, compliance)*
10. **New email PII sink → Telegram** (added by the *done* `s4-email-subscribe-task`). `/api/subscribe` transfers player emails to `api.telegram.org` (`Master.ts:351`) with no consent text, and the no-Telegram fallback logs the **raw email at info level** (`Master.ts:373`). This is an *additive* 152-FZ obligation — a new PII class leaving the system — that the audit's archive-focused compliance scope never enumerated. Not an audit contradiction and not a runtime defect, but `s4-personal-data-compliance-investigation` MUST cover it (consent text + privacy-policy coverage + retention/deletion stance for the Telegram transfer), and the raw-email info log should be dropped, before citizenship/profile go-live. *(compliance)*

---

## 6. Cross-cutting risks & sequencing notes

### Pre-existing bugs intersecting s4

- **`/flags` 404 is intentional flag suppression — NOT a bug** *(corrected 2026-06-24)*. The `flags_source` rename deliberately stops serving flag images (Yandex country-flag policy + copyright + pending citizenship). Do **not** "fix" the path. `CitizenshipCard` is policy-compliant (`🏳️` fallback, picker hidden). The lone residual is the **language-selector** broken-image glyph (`LangSelector.ts:324`, visible in prod, no fallback) — likely collateral, left as-is pending an owner decision on whether language flags are also in-scope of the suppression.
- **Cyrillic clan/username handling.** `getClanTag` regex is ASCII-only (`Util.ts:333`) → Cyrillic clan tags don't group in Team mode. A real RU-audience defect, but it belongs to a team-mode/nickname gameplay task, NOT any profile/payments slice.
- **Third-party-cookie/partition risk.** `persistentID` is a `SameSite=Strict;Secure` cookie inside a cross-origin Yandex iframe (`Main.ts:1023-1024`, untested, audit §1.4). If partitioned, guest continuity silently resets and persistentID is unusable as a durable crediting key — so `yandex_player_id` (for authorized players) is the only durable handle. **The profile store must not depend on persistentID as the durable key.**
- **FailOpen privilege checker** (see §5.5) — cosmetic-scope, but a fail-open hazard wired into the same Worker process the new payment endpoints will be added next to.

### Sequencing / ordering implications

1. **T4h (forward `PROFILE_API_URL`) must land before T6** is meaningfully testable in prod — otherwise crediting silently no-ops (`profileApiUrl()` → `""`).
2. **T5 (pg driver + repository + migrations) blocks T6, citizenship-earned, citizenship-paid, and payments** — all reference a `PlayerProfileRepository`/`creditMatchXp`/credit endpoint that does not exist. T5 is the critical-path bottleneck.
3. **Backup-task conflict:** `s4-profile-08-backups` (profile box, `setup-profile.sh`, post-dedicated-box decision) and `s4-postgres-backup-routine` (game VPS, `deploy.sh`, pre-decision) target **different boxes** — reconcile to the profile box before either is implemented. They are otherwise duplicate deliverables.
4. **Stale migrate-endpoint references:** `s4-yandex-payments-impl` (Verification #7) and `s4-citizenship-earned` cite `POST /v1/profile/migrate` as the input-side defense, but that endpoint was **removed** when T7/guest was cancelled (2026-06-13). The writer-side SOLE-AUTHORITY rule stands; the cited input-boundary pairing no longer exists — don't build against it.
5. **Archive re-target before re-enable** (see §5.9) and **compliance gate** (152-FZ findings) block profile-store production go-live and therefore citizenship launch — sequence the legal investigation early since it gates the whole feature.
6. **Compliance must include `clanTag`** in the archived record's PII scope once `archiveEnabled()` flips — the compliance/archive briefs, not clan code, decide whether to drop or scope it.

---

## 7. Net assessment

**Nothing in the pre-existing infra justifies a from-scratch rebuild.** The join/transport/rendering spine is the right substrate and is already being correctly *extended* by the merged work (T1/T3/T4a–g). The real s4 work is additive (verification, Postgres, crediting) plus deleting dead OpenFront monetization cruft *separately*, in a dedicated hygiene task — not inside s4 slices, because those deletions touch live join/render code.

Two things the briefs get wrong and should be corrected **before** implementation starts:
- The **"verified persistentID fallback"** premise in T6 (§5.1–5.2) — persistentID is unverified in the Yandex build.
- The **stale `POST /v1/profile/migrate`** reference in payments/earned briefs (§6.4) — that endpoint no longer exists.

---

*Generated by a 20-agent analysis workflow (requirements → per-subsystem intersect → adversarial challenge → synthesis). All concrete claims were checked against the code at the cited `file:line`; line numbers reflect the repository state on 2026-06-24 (`dev`). Builds on [`pre-s4-player-infra-audit-2026-06-24.md`](./pre-s4-player-infra-audit-2026-06-24.md).*
