# Pre-s4-profile Infrastructure Audit — Registration, Customization & In-App Purchases

**Date:** 2026-06-24
**Author:** Claude (multi-agent audit; 7 subsystem mappers + adversarial verifiers + boundary tracer)
**Scope:** The state of player **registration/identity**, **customizations** (nicknames, territory patterns, custom flags, clans), and **in-app purchases / monetization** as they existed **before** the `s4-profile-*` task series began. The new api/profile server, Yandex identity in the auth path, Yandex payments, and citizenship are explicitly **out of scope** except as "what's changing" pointers.

**Boundary definition:** The new work begins at commit `ebbedae` (*"Codex: player profile store findings"* — the gating investigation) with the first code landing at `57c798d` (*"Claude: s4-profile-01-schema-contract"*, PR #109), which adds `src/core/profile/PlayerProfile.ts`. Everything older — including code inherited from upstream OpenFront and earlier Flashist adaptations — is in scope.

**Provenance legend used throughout:**
- **`[Inherited]`** — stock OpenFront.io, carried in at the fork-root commit `feea527` (2025-11-04), no `// Flashist Adaptation` marker.
- **`[Flashist]`** — a geoconflict/Yandex-specific adaptation (usually marked `// Flashist Adaptation`; note the marker is sometimes misspelled `AdaptatioN`).
- **`[Dead]`** — present in source but not reachable/functional in the production **Yandex Games iframe** build (`yandex-games_iframe.html`).

---

## 1. Executive Summary

**The single most important finding:** before s4-profile, geoconflict had **no server-side per-player persistence of any kind**. There is no profile database, no account store, no entitlement store in this repo. Every piece of player identity and customization is **client-local** (browser `localStorage` + one cookie) and is **re-asserted into each game** via a single one-time WebSocket `join` message. The game server holds it only in memory for the lifetime of one match, then discards it. This is the gap the entire s4-profile server is being built to fill.

**The second finding:** geoconflict inherited a large, sophisticated OpenFront identity/monetization spine (Discord/email accounts, JWT auth, Stripe cosmetics purchases, a "flares" entitlement model, Fuse gutter ads) — and **almost all of it is dead in the shipping Yandex build**. It was either deliberately disabled by Flashist adaptations, or it points at external openfront.io-style infrastructure (`api.<domain>`) that the geoconflict deployment does not provide. What actually runs is a thin slice: an anonymous persistent-UUID cookie for identity, free pattern/color rendering, and Yandex-SDK-sourced usernames.

### Status at a glance

| Area | Provenance | Live in Yandex build? | One-line state |
|---|---|---|---|
| **Player registration / accounts** | Inherited (Discord/email/JWT) + Flashist (Yandex name) | **Mostly dead.** Only anon UUID cookie is live | No real registration. Identity = forgeable client-generated UUID cookie. Account UI hidden + unreachable. |
| **Nicknames** | Inherited + Flashist (Yandex-name seeding, non-latin/no-emoji rules) | **Live** | Captured/validated client-side, stored in `localStorage["username"]`. Server does **not** enforce the strict rules. |
| **Territory patterns** | Inherited (whole picker/decoder/gating) | **Rendering live; picker hidden; purchase dead** | Patterns render on the map, but the picker button is `display:none` in the iframe and nothing is purchasable. |
| **Custom flags** | Inherited code, **Flashist-disabled** | **Dead (by design)** | Server drops every flag; render fn is a no-op; SVG assets 404 *intentionally* (flag suppression); picker hidden; no builder UI exists. |
| **Clans** | Inherited | **Live (Team mode only), no UI** | A clan "tag" parsed from `[ABC]` in the username, used only for team grouping. Not a guild system. |
| **In-app purchases** | Inherited (Stripe) + Inherited (Fuse ads) | **Dead** | No products in the catalog, no `/stripe` route, no login. Fuse ads commented out. Real ads = new Yandex SDK path. |
| **Persistence/transport spine** | Inherited + Flashist | **Client-local live; server auth/entitlement dead** | No DB. Auth issuer points at the game host, which serves none of the auth routes. |

### Notable bugs / risks surfaced during the audit
These are pre-existing issues independent of the s4-profile work, worth raising:

1. **`/flags/*.svg` assets 404 build-wide — INTENTIONAL, not a regression** *(corrected 2026-06-24 per repo owner)*. Commit `895368d` renamed `resources/flags/` → `resources/flags_source/`; the code still requests `/flags/...`, and that 404 is the **deliberate mechanism for suppressing flags**. Flags were disabled for the initial release because of (a) Yandex Games' strict policy on real country names/flags, (b) copyright/licensing uncertainty on the images, and (c) pending proper citizenship logic. The folder was renamed (not deleted) to retain the assets for later re-enable while guaranteeing nothing under `/flags/` is served. **`CitizenshipCard.ts` is policy-compliant in prod** — its no-flag fallback is the neutral `🏳️` emoji and the flag picker is hidden, so real players never see a country flag. The one residual is the **language-selector flag** (`LangSelector.ts`, `LanguageModal.ts`), which is visible in prod with no fallback → broken-image glyph; that piece is likely collateral, and its direction (suppress vs restore) is a pending owner decision. Re-enabling flags is a legal/policy decision, **not a path fix**.
2. **Cyrillic clan tags silently don't work.** The clan regex is `/\[([a-zA-Z0-9]{2,5})\]/` — ASCII-only. For a predominantly Russian player base, `[ВОЙ]Иван` yields no clan and players are **not** grouped in Team mode (verified empirically).
3. **Stale `CLAUDE.md` note.** `CLAUDE.md:66` says Duos/Trios/Quads modes are disabled. The lobby modals (`SinglePlayerModal.ts`, `HostLobbyModal.ts`) render them as **active, selectable options**. The note is inaccurate relative to current source.
4. **Third-party-cookie risk (unverified).** The `player_persistent_id` identity cookie is `SameSite=Strict; Secure`. Inside the cross-origin Yandex iframe it may be browser-blocked, which would undermine guest persistence in the very build that ships. Not confirmable from source — flagged for live testing.
5. **Anonymous identity is forgeable.** The server accepts any well-formed UUID as an anonymous player with no verification (`server/jwt.ts:23`). The persistent ID is continuity, not a security boundary; usernames/clan tags are likewise unclaimed free text.

---

## 2. Scope, Method & Boundary

**Method.** Seven independent reader agents mapped one subsystem each (identity, nicknames, patterns, flags, clans, in-app purchases, and the cross-cutting persistence/transport layer). Each subsystem's high-stakes claims — especially "live vs dead in the iframe build" and "inherited vs Flashist-adapted" — were then handed to an adversarial verifier instructed to refute them against the actual code (git blame, `git log -S`, schema reproduction, regex tests). A boundary tracer read the `s4-profile-*` / `s4c-*` task briefs and the two findings docs to produce accurate forward pointers. Corrections from the verify pass are folded into the sections below.

**What "before s4-profile" means concretely.** The `s4-profile` series stands up a dedicated Postgres-backed profile server at `api.geoconflict.ru` (reg.ru, Moscow). None of that existed pre-s4. Note one trap the boundary tracer flagged: `src/core/ApiSchemas.ts:86` has its **own** upstream `PlayerProfileSchema` (Discord/games/stats) that is unrelated to the new `src/core/profile/PlayerProfile.ts` (citizenship/XP). The s4 type is a parallel addition, not a replacement of the upstream one.

---

## 3. Technical Appendix — Subsystem by Subsystem

### 3.1 Player Registration / Identity / Accounts

**What it is.** Two layers stacked: (a) an **anonymous persistent identity** — a random UUID stored in a 5-year cookie — and (b) an optional **inherited OpenFront account system** (Discord OAuth + email magic-link, backed by an external JWT-issuing api server).

**How it works.**
- `[Inherited]` On first need, `getPersistentIDFromCookie()` (`Main.ts:1005`) reads or creates cookie `player_persistent_id` — a `generateCryptoRandomUUID()` value (`Utils.ts:73`), `max-age` 5 years, `SameSite=Strict; Secure` (`Main.ts:1019-1024`). This is the de-facto guest identity.
- `[Inherited]` `getPlayToken()` (`Main.ts:991`) returns the JWT if `isLoggedIn()`, else the cookie UUID. This is sent as the `token` in the join message. `getPersistentID()` returns `claims.sub` (JWT) or the cookie UUID.
- `[Inherited]` `isLoggedIn()` (`jwt.ts:234`) reads a token from URL hash / cookie / localStorage and **decodes but does not cryptographically verify** it client-side (the JWKS verify is commented out, `jwt.ts:248-254`); it only checks `iss`/`aud`/`exp`. Real verification is server-side.
- `[Inherited]` Login paths: `discordLogin()` → `${api}/login/discord` (`jwt.ts:177`); email recovery → `${api}/magic-link`; `TokenLoginModal` polls `${api}/login/token`. There is **no email/password sign-up form anywhere** — "registration" in the classic sense does not exist; it's OAuth/magic-link only.
- **Server side** `[Inherited]`: `verifyClientToken()` (`server/jwt.ts:19`) — if the token is a bare UUID it's accepted as `{persistentId, claims: null}` (anonymous, **no verification**); otherwise it EdDSA-verifies the JWT. `getUserMe()` proxies the api server's `/users/@me` for roles/flares. A `Client` is built in memory; there is no account DB in this repo.

**Storage.** Guest identity: cookie `player_persistent_id`. Logged-in: JWT in `localStorage["token"]` / `token=` cookie. No server-side identity persistence in-repo.

**Functional status (Yandex iframe).** The **anonymous UUID cookie is the only live identity**. The account system is **dead**: `AccountButton` renders empty under `isInIframe()` (`AccountModal.ts:378-381`) **and** is `display:none` in `yandex-games_iframe.html:438` (token-login at `:283`); Discord OAuth can't complete inside the iframe anyway; and pre-s4 there's no api server wired for the geoconflict build. The Yandex SDK player init (`FlashistFacade.initPlayer/getCurPlayerName`) is `[Flashist]` and live, but pre-s4 it only seeded the **username and analytics** — it did **not** create a server-known account.

**Config dependency the verifier surfaced.** The anonymous-join path is **live only because `allowedFlares()` is `undefined`** in Dev/Prod (`DefaultConfig.ts:58-60`, not overridden). `PreprodConfig.ts:23` is the lone override that would *reject* anonymous users (`Worker.ts:357-362`). So guest access is a live config choice, not unconditional.

**Gaps/risks.** Forgeable anonymous identity (clear cookie = new player); third-party-cookie blocking risk in the iframe (§1.4); no cross-device continuity; account-recovery endpoints would 404 in the geoconflict context.

> **What's changing in s4-profile** (`s4-profile-03-yandex-identity`, *done*, PR #111): adds a **parallel** verified-Yandex-ID lane — `FlashistFacade.getYandexUniqueId()` → `ClientJoinMessage.yandexPlayerId` (`Schemas.ts:557`) → `Client.yandexPlayerId`. It *extends* the persistent-ID model rather than replacing it. The Yandex ID is currently **client-asserted and UNTRUSTED** (no signature check — `Worker.ts:411` says so explicitly); signature verification is deferred to the payments work.

---

### 3.2 Nicknames / Usernames

**What it is.** A `<username-input>` LitElement that captures, validates, and persists the display name, with clan-tag parsing happening downstream.

**How it works.**
- `[Flashist]` On `connectedCallback` (made async), `getStoredUsername()` tries `FlashistFacade.getCurPlayerName()` (Yandex account name, `UsernameInput.ts:90`), falls back to `localStorage["username"]`, then `sanitizeUsername()`; if empty, generates `"Anon" + uuidToFourDigits()`.
- `[Inherited]` / `[Flashist]` Validation: `validateUsername()` (`validations/username.ts:50`) enforces **3–27 chars**, the pattern `/^[\p{L}\p{N}_[\]\s]+$/u` (allows non-latin, **no emojis**), and an `obscenity` profanity matcher. The non-latin allowance (`b28100b`, 2025-12-09) and emoji removal (`d530914`, 2025-12-16) are pre-s4 Flashist tweaks; the module itself is inherited.
- Transport: the name rides in the join message as `username` (`Schemas.ts:547`).
- Display: `NameLayer.ts:265` renders `player.name()` via `innerHTML` (safe because `sanitizeUsername` strips everything outside `\p{L}\p{N}_[]\s`).

**Storage.** `localStorage["username"]` only (`UsernameInput.ts:17`). **Not** in `UserSettings.ts` (which has no username handling — a common misconception; verified). On Yandex the *initial* value may come live from the SDK account name, but only the local string is persisted.

**Functional status.** **Live** in the iframe build (`<username-input>` is present at `yandex-games_iframe.html:294`). Client-side `validateUsername` runs on every keystroke.

**Key gap — validation is effectively client-only.** The server's join boundary only checks `UsernameSchema = SafeString` (`Schemas.ts:188-219`): a permissive regex allowing emojis/punctuation up to **1000 chars** — the strict 3–27/charset rules are **never enforced server-side**. The strict per-character charset/length is, however, applied game-side by `sanitizeUsername()` in the `PlayerImpl` constructor (`PlayerImpl.ts:117`), which runs deterministically on both client and server (it truncates to 27 and pads sub-3 names with `x`). Two other quirks: profanity shadow-naming (`fixProfaneUsername`) is deliberately **not** applied to your *own* name (`GameRunner.ts:52-54`) — only other players see your shadow name; and the Anon#### default is inherited (couldn't be byte-diffed against current upstream).

> **What's changing in s4-profile:** Nothing directly. The new `PlayerProfile.ts:38` reserves a `display_name` field and the proposed migration includes a future `player_name_history` moderation table — but with **no application logic** ("create now, no app logic yet"). Nicknames are not migrated to the api server in Sprint 4. (`s4-profile-05`, *backlog*.)

---

### 3.3 Territory Patterns / Cosmetics

**What it is.** `[Inherited]` A 1-bit tiled "pattern" (a two-color bitmap) and/or a flat territory color, selected in a picker modal, decoded by `PatternDecoder`, and rendered per-tile by `PlayerView`. The ownership/purchase machinery is inherited intact from OpenFront.

**How it works.**
- Catalog: `fetchCosmetics()` (`Cosmetics.ts:77`) GETs `/cosmetics.json`, Zod-validates against `CosmeticsSchema`.
- Picker: `TerritoryPatternsModal.renderPatternGrid()` calls `patternRelationship()` (`Cosmetics.ts:105`) → `owned` / `purchasable` / `blocked` per pattern, driven by the player's **flares**.
- Selection persisted to `localStorage` as `pattern:<name>[:<palette>]` under key `territoryPattern` (`UserSettings.ts:4`); flat color under `settings.territoryColor`.
- **Multiplayer transport is refs-only**: the join message carries `PlayerCosmeticRefs {patternName, patternColorPaletteName, color, flag}` (`Schemas.ts:409`) — **never raw `patternData`**. The server re-resolves and authorizes via `PrivilegeCheckerImpl.isAllowed()` (`Privilege.ts:25`, inner helper `isPatternAllowed` at `:60`) before embedding the bitmap into `GameStartInfo`.
- **Single-player bypasses the server check**: `SinglePlayerModal.ts:550` embeds the **full resolved `PlayerPattern`** (incl. `patternData`) directly into the local `GameStartInfo`. This is the key client-trust boundary.
- Render: `GameView.PlayerView.territoryColor(tile)` (`GameView.ts:254`) returns primary vs secondary color per `decoder.isPrimary(x,y)`.

**Functional status (Yandex iframe): partially-wired / largely dead.**
1. **Rendering is live** — a set pattern/color renders on the map for all clients, deterministically.
2. **Picker entry point is hidden** — `Main.ts:366` sets the preview button `display:none` when `isInIframe()` is true (the prod template always runs in an iframe). The modal and click handler still exist; only the visible launcher is gone.
3. **Purchase is dead** — the real `resources/cosmetics/cosmetics.json` has **no `product`/`priceId`/`colorPalettes`/`affiliateCode`** on any of its ~121 patterns (it uses an inert `role_group` field instead). The server normalizer hard-injects `product:null` (`CosmeticsConfig.ts:48`), so `patternRelationship()` can never return `purchasable` and the buy button never renders.
4. **Gating collapses to flares** — with no palettes and empty flares (the anonymous-guest reality), the grid shows only the single "default/none" tile. Color swatches depend on `color:<hex>` flares and are likewise empty.

**Gaps the verifier added.** `role_group`/`role_groups` are **stripped by Zod** (`CosmeticsSchema` is a plain `z.object`, no passthrough) — they grant nothing. The `PrivilegeRefresher` **fails open** (`FailOpenPrivilegeChecker`, `Privilege.ts:112`) if `cosmetics.json` can't load, accepting any cosmetic unchecked. The raw static `cosmetics.json` actually **fails** `CosmeticsSchema`; functional pattern data depends on the server normalizer route, not the static file.

> **What's changing in s4-profile:** Nothing in Sprint 4. The profile store only *stubs* a future `player_cosmetic_ownership(cosmetic_type='pattern')` table with no app logic. Ownership stays flare-driven. The `CosmeticsConfig.ts` normalizer that makes patterns serve at all is from `s4c-fix-cosmetics-serving` — adjacent, but a serving fix, not part of the profile server. (`s4-profile-05`, *backlog*.)

---

### 3.4 Custom Flags

> **Forward note (2026-06-24):** flags are a *planned non-country paid cosmetic*, not permanently dead — the suppression described below is **interim**; the actual constraint is real-country flags/names (Yandex policy). See `0191-citizenship-xp-progress-ui` → "Flag policy".

**What it is.** Two halves: `[Inherited]` a "custom flag" feature (a `!`-prefixed encoded string of `layer-color` pairs, rendered as masked SVG layers by `renderPlayerFlag()` in `CustomFlag.ts`), and `[Inherited]` a simple **country-code picker** (`FlagInputModal.ts` — just stores a 2-letter code).

**Functional status (Yandex iframe): DEAD — for three independent reasons, each sufficient.**
1. **Server discards every flag.** `[Flashist]` `Privilege.ts:53-54` comments out `cosmetics.flag = result.data` (`// Flashist AdaptatioN: disabling flags`), and `GameView.ts:482-483` does the same for nation flags. So `player.cosmetics.flag` is essentially always `undefined`; the rendering branches in `NameLayer.ts:239` / `PlayerInfoOverlay.ts:295` never fire.
2. **The render function is a no-op as called.** All three call sites pass only 2 args (`flag, target`), never the required 3rd `cosmetics` param, so `renderPlayerFlag()` hits its `cosmetics === undefined` early-return guard (`CustomFlag.ts:21-24`). A `TODO` there confirms it was never wired.
3. **The SVG assets are deliberately not served.** `[Flashist]` Commit `895368d` moved `resources/flags/` → `resources/flags_source/` so that requests for `/flags/*.svg` and `/flags/custom/*.svg` **404 by design** — an intentional flag-suppression step (Yandex country-flag policy + copyright + pending citizenship), not a path bug. Assets are retained under `flags_source` for later re-enable.

Additional: there is **no custom-flag builder UI anywhere** (verified — `FlagInputModal.ts` is byte-identical to fork-root and is purely a country picker), so a `!`-flag can only originate from a hand-set localStorage value. And the `<flag-input>` trigger is itself **hidden** in production (`yandex-games_iframe.html:285-288` wraps it in `display:none` under a Flashist marker — correcting an initial mapper claim that it was clickable). The flag value is still *transmitted* on multiplayer join (`Main.ts:695-698`), but the server drops it.

**Storage.** `localStorage["flag"]` (`FlagInput.ts:7`). No server persistence. No in-game effect in this build.

> **What's changing in s4-profile:** Nothing behavioral. Only a future `player_cosmetic_ownership(cosmetic_type='flag')` table is reserved, with no logic. Flags are not re-enabled or migrated. (`s4-profile-05`, *backlog*.)

---

### 3.5 Clans

**What it is.** `[Inherited]` **Not a guild/membership system** — a stateless **clan tag parsed out of the username**. `getClanTag(name)` (`Util.ts:329-335`) extracts the first `/\[([a-zA-Z0-9]{2,5})\]/` match, uppercased. Stored once on `PlayerInfo.clan` (`Game.ts:421`), exposed via `Player.clan()`.

**How it works.** The **only runtime consumer** is team assignment: `assignTeams()` (`TeamAssignment.ts`) groups same-tag players onto the same team in Team-mode games, sorting clans largest-first and packing up to `maxTeamSize = ceil(players/teams)`. Overflow members beyond capacity are **"kicked"** and silently dropped (`GameImpl.ts:172-174`). The tag is also stamped into the game-archive `PlayerRecord.clanTag` (`Schemas.ts:575`) but never read back for display.

**Functional status.** **Live for Team-mode games** (Team mode is an unconditional, ungated option in both `SinglePlayerModal.ts:179` and `HostLobbyModal.ts:269`, present in the production template at `yandex-games_iframe.html:444-445`), but with **zero dedicated UI** — no clan badge, column, or roster (grep over `src/client/graphics/layers/` finds no clan references). The tag is visible only as raw text inside the username.

**Gaps.** No persistence/membership/invites; recomputed from the name every game; **Cyrillic tags don't parse** (§1.2 — a real problem for the Russian audience, verified by live regex test); only affects Team mode; overflow members get dropped; tags are unclaimed/spoofable. Also note **the `CLAUDE.md` "Duos/Trios/Quads disabled" note is stale** (§1.3).

> **What's changing in s4-profile:** **Nothing.** No s4-profile task touches clans; the api/profile server has no clan schema, table, or endpoint. Entirely untouched.

---

### 3.6 In-App Purchases / Monetization

**What it is.** `[Inherited]` The pre-s4 monetization spine, inherited wholesale from OpenFront: territory-pattern cosmetics gated behind a **Stripe checkout**, plus **Fuse Platform gutter ads** as an alternate revenue surface.

**How it works (in principle).**
- `handlePurchase()` (`Cosmetics.ts:26`) POSTs a `priceId` to `${getApiBase()}/stripe/create-checkout-session` and redirects to the returned Stripe URL (`[Flashist]` only the redirect/hostname wrappers — `changeHref`/`windowOrigin` — are adapted).
- Entitlements are **"flares"** (e.g. `pattern:<name>:<palette>`) returned by the external account API's `/users/@me`. The client never grants entitlements; the server only *reads/validates* flares (`Privilege.ts`), never writes them.
- `GutterAds.ts` / `AdTimer.ts` drive Fuse ad zones for non-paying users.

**Functional status (Yandex iframe): DEAD — three independent reasons.**
1. **No products** — `grep -c '"product"' resources/cosmetics/cosmetics.json = 0`; every pattern is `{name}` only, and the server normalizer forces `product:null`. So `patternRelationship()` never returns `purchasable` and the buy button never renders.
2. **No payment backend** — `getApiBase()` resolves to the openfront.io-style `api.<domain>` (`jwt.ts:118-120`); there is **no `/stripe` route, no webhook, and no flare-granting code anywhere in `src/server`**. The whole entitlement backend is external/upstream and absent from the geoconflict deployment.
3. **No login** — purchases require a Discord-OAuth JWT not surfaced in the iframe; `getAuthHeader()` returns `""`. (The verifier noted the 401→`alert("not logged in")` branch is actually *unreachable*, because there are no purchasable products to click in the first place.)

The Fuse ad surface is **also dead**: the `fuse.js` `<script>` is commented out in **both** HTML templates (`index.html:96`, `yandex-games_iframe.html:170`), and `GutterAds.show()` early-returns inside an iframe — so `window.fusetag` is never defined and every Fuse call no-ops. The upstream end-of-game purchase CTA (`WinModal.renderPatternButton`, `steamWishlist`) is `[Flashist]`-stubbed to empty. A `stripePublishableKey()` config getter exists but is an inert `process.env.STRIPE_PUBLISHABLE_KEY ?? ""` stub — no Stripe SDK is wired.

**Important nuance from the verifier:** this purchase path was **already dead in geoconflict before** the `s4c-fix-cosmetics-serving` change — pre-s4c, `fetchCosmetics` fetched an *external* `${getApiBase()}/cosmetics.json` that didn't exist in scope, and the in-repo catalog already had the product-less `{name}`/`role_groups` shape. So s4c did **not** break a working purchase flow; it added the local `/cosmetics.json` route to serve **rendering** data for free patterns.

**Real geoconflict monetization** runs through a **separate, newer** path: `FlashistFacade.showFullscreenAdv()` via the **Yandex Games SDK** (`FlashistFacade.ts:958`) — not this inherited Stripe/Fuse system.

> **What's changing in s4-profile:** The new **Yandex Payments** lane is entirely backlog and not yet built (`grep` confirms **zero** `getPayments`/`consumePurchase` usage, no `purchase_intents` table, no `/api/payments/yandex/*` routes). The flow will be: signed `getCatalog`/`purchase` → server HMAC verify → grant `is_paid_citizen`. `PlayerProfile.ts` already carries `is_paid_citizen`/`citizenship_purchased_at` fields, but **nothing writes them yet**. (`s4-yandex-payments-impl`, `s4-citizenship-paid`, `s4-yandex-catalog-registration` — all *backlog*.)

---

### 3.7 Cross-Cutting Persistence, Transport & Config

**The spine all of the above rides on.** Before s4-profile, **all** player identity/customization is client-local and re-asserted per game:

- **Storage is browser-only.** `localStorage` keys: `username`, `territoryPattern`, `settings.territoryColor`, the audio volumes, ~11 boolean setting toggles (`UserSettings.ts:36-129`), dev-only `dev-pattern`/`dev-primary`/`dev-secondary`, and auth `token`/`apiHost`. Cookie: `player_persistent_id` (the durable identity). **Server-side: nothing persistent** — only in-memory `GameServer.activeClients`/`allClients` for one game. `package.json` has only `@types/pg` (a build-time type stub, in *devDependencies*) — **no runtime DB driver** of any kind (no pg/postgres/redis/sqlite/mongo).
- **Transport happens once.** Identity/customization crosses the wire only in the one-time `ClientJoinMessage` (`Schemas.ts:541-558`): `username` + `cosmetics` refs + `token`. **Per-tick intents carry only `clientID`** (`BaseIntentSchema`, `Schemas.ts:232`) — identity is never re-sent. At game start, `GameServer.start()` echoes each client's username+cosmetics into a transient in-memory `GameStartInfo` broadcast to peers, then it's discarded.
- **The auth/entitlement spine is dead in prod.** `.env.prod` sets `JWT_ISSUER = API_BASE_URL = http://91.197.98.116` — **the game server's own host** — and `Master.ts` implements **none** of `/users/@me`, `/login/discord`, `/refresh`, `/revoke`, or `/stripe`. So the inherited OpenFront entitlement path cannot succeed; players join anonymously with the UUID cookie (the verifier confirmed: for anonymous players `claims===null`, so the server-side `getUserMe` is **never even called**, flares stay `[]`, and any flare-gated pattern would *reject* the join rather than silently downgrade).
- **The only persistence sink is disabled.** `Archive.ts` POSTs game records to `jwtIssuer()/game/<id>`, gated off by `archiveEnabled() === false` (`DefaultConfig.ts:315-317`). Its read side (`readGameRecord`) has **zero callers** — dead both ways.

**Net:** customization is client-local, echoed per game into in-memory state, never persisted server-side.

> **What's changing in s4-profile:** This is the area the new work most directly targets (`s4-profile-01` *done*, `s4-profile-04a–g` *done*, `s4-profile-05/06/04h/04i` *backlog*). **Done so far:** the shared `PlayerProfile.ts` contract (type + `migrateProfile`, **not yet consumed at runtime**) and the deploy skeleton (`src/profile-server/Server.ts` — `/health` only — plus `Dockerfile.profile` and the `setup-profile.sh`/`build-deploy-profile.sh` pipeline). **Not built (backlog):** `migrations/` is empty, no `PlayerProfileRepository`, no `/v1/profile` or `/internal/v1/credit`, no `src/server/ProfileApiClient.ts`, no match-end crediting (T6), no `PROFILE_API_URL` game-server wiring (T4h), no live VPS bring-up (T4i). The guest-localStorage migration tasks (T2/T7) were **cancelled** 2026-06-13. So Sprint-4 profile XP is authenticated-only and **currently credits nobody** until T5/T6 land. The documented hook points where the new server will attach to this otherwise-anonymous spine are `ClientJoinMessage.yandexPlayerId` (untrusted) and `RuntimeConfig.profileApiUrl` (wired from `/api/env`, but with "no in-T4 consumer by design").

---

## 4. Provenance Summary

| Component | Provenance | Notes |
|---|---|---|
| Persistent-UUID cookie identity (`Main.ts:990-1028`) | **Inherited** | The only live identity in the Yandex build |
| Discord/email/JWT account system (`jwt.ts`, `AccountModal`, `TokenLoginModal`) | **Inherited → Dead** | Hidden via `isInIframe()` + `display:none`; no api server in geoconflict |
| Yandex SDK player init / name seeding (`FlashistFacade`) | **Flashist** | Pre-s4; fed username + analytics only |
| `validateUsername` module | **Inherited** | Strict rules client-only |
| Non-latin allowed / emoji disallowed in username pattern | **Flashist** | `b28100b`, `d530914` (Dec 2025) |
| Pattern picker / decoder / gating / Stripe purchase | **Inherited** | Rendering live; purchase dead (no products) |
| Server flag assignment | **Flashist → Dead** | Commented out (`Privilege.ts:53-54`) |
| `CustomFlag` / `FlagInput` / `FlagInputModal` | **Inherited → Dead** | No-op render; assets 404; no builder UI |
| `resources/flags` → `resources/flags_source` rename | **Flashist** | `895368d` — **intentional** flag suppression (Yandex policy + copyright + pending citizenship); all `/flags/*.svg` 404 *by design* |
| `getClanTag` + `TeamAssignment` | **Inherited** | Live for Team mode; ASCII-only tags |
| Fuse gutter ads (`GutterAds`, `AdTimer`, `fuse.js`) | **Inherited → Dead** | `fuse.js` commented out in both templates |
| Yandex `showFullscreenAdv` | **Flashist (newer)** | The real ad surface |
| Static `cosmetics.json` serving + normalizer | **Flashist (s4c)** | `CosmeticsConfig.ts`; serving fix, adjacent to s4-profile |
| Server-side per-player DB | **Does not exist (pre-s4)** | The gap s4-profile fills |

---

## 5. Appendix — Key Reference Data

**Boundary commits.** Fork root: `feea527` (2025-11-04). s4-profile start: `ebbedae` (findings) / `57c798d` (first code, PR #109).

**`localStorage` keys (pre-s4):** `username`, `territoryPattern`, `flag`, `settings.territoryColor`, `settings.backgroundMusicVolume`, `settings.soundEffectsVolume`, `settings.{emojis,performanceOverlay,alertFrame,anonymousNames,lobbyIdVisibility,specialEffects,structureSprites,darkMode,leftClickOpensMenu,territoryPatterns,focusLocked}`, `dev-pattern`/`dev-primary`/`dev-secondary`, `token`, `apiHost`. **Cookie:** `player_persistent_id`.

**Core transport schemas:** `ClientJoinMessageSchema` (`Schemas.ts:541`), `PlayerCosmeticRefsSchema` (`:409`), `PlayerPatternSchema` (`:416`), `FlagSchema` (`:396`), `UsernameSchema = SafeString` (`:188-219`), `BaseIntentSchema` (`:232`), `PlayerRecordSchema.clanTag` (`:575`).

**Critical files by subsystem:**
- *Identity:* `Main.ts` (cookie/token), `jwt.ts` (client), `server/jwt.ts` (server), `AccountModal.ts`, `TokenLoginModal.ts`, `Worker.ts`, `Privilege.ts`, `Client.ts`, `FlashistFacade.ts`.
- *Nicknames:* `UsernameInput.ts`, `validations/username.ts`, `Util.ts` (`getClanTag`/`sanitize`), `GameRunner.ts`, `PlayerImpl.ts`, `NameLayer.ts`.
- *Patterns:* `CosmeticSchemas.ts`, `PatternDecoder.ts`, `GameView.ts`, `UserSettings.ts`, `Cosmetics.ts`, `TerritoryPatternsModal.ts`, `PatternButton.ts`, `server/CosmeticsConfig.ts`, `server/Privilege.ts`, `Master.ts`.
- *Flags:* `CustomFlag.ts`, `FlagInput.ts`, `FlagInputModal.ts`, `server/Privilege.ts` (`:53-54`), `NameLayer.ts`, `PlayerInfoOverlay.ts`, `resources/flags_source/`.
- *Clans:* `Util.ts` (`:329`), `game/Game.ts` (`:410/421`), `PlayerImpl.ts` (`:208`), `TeamAssignment.ts`, `GameImpl.ts`, `GameServer.ts` (`:988`), `LocalServer.ts` (`:281`).
- *In-app:* `Cosmetics.ts` (`handlePurchase`), `CosmeticSchemas.ts` (`ProductSchema`), `jwt.ts` (`getApiBase`), `GutterAds.ts`, `AdTimer.ts`, `WinModal.ts`, `resources/cosmetics/cosmetics.json`, `FlashistFacade.ts` (`showFullscreenAdv`).
- *Persistence/transport:* `UserSettings.ts`, `Transport.ts`, `Schemas.ts`, `Worker.ts`, `Client.ts`, `GameServer.ts`, `Archive.ts`, `DefaultConfig.ts`, `Master.ts` (`/api/env`, `/cosmetics.json`), `.env.prod`.

---

*Generated by a 15-agent audit workflow (map → adversarial verify → boundary trace). All concrete claims were checked against the code at the cited `file:line`; line numbers reflect the repository state on 2026-06-24 (`dev` @ `d6797f0`).*
