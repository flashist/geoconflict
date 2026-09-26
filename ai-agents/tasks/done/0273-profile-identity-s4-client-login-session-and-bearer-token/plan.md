# 0273 — S4: client login session and Bearer token — APPROVED PLAN

> **Approved by the owner 2026-09-16** via `AskUserQuestion` in the `fkit lead` session
> (`fkit-sprint-ship-loop` driver). This file is the approved artifact; the driver wrote it at
> approval, before the Build spawn.

## Owner rulings folded into this plan

| Ruling | Decision |
|---|---|
| **D1** — when the server legacy fallback is removed | **In this change set**, shipping with the S2/S3 profile deploy. No second profile deploy for this task. |
| **D2** — does the S4 game deploy wait for S5 monitoring | **Yes.** S5 (`0274`) must be live before the S4 game deploy. |
| **D3** — may a later call retry after a failed boot login | **No.** A failed boot login leaves the load with no session. **But** pressing the login button on the guest ("you're not logged in") card must **restart the game from scratch** so the start sequence runs fully with the player logged in. Owner, verbatim: *"No, but I think we should add some logic for restarting the game from the scratch (to be sure the start sequence is done the right way) if a user presses the 'login' button on the 'you're not logged in' UI element. Maybe there are other user-scenarios, that I am not aware of, I don't know."* |
| **Q1** — situation B (player logged into Yandex, boot profile call failed: 0 XP card, no button to press) | **Out of S4.** A follow-up task, sequenced with the card launch (`0054`): a "couldn't load your progress — tap to restart" surface doing the same full restart. ~0.75–1 d. Nothing is player-visible before `0054`. |
| **Q2** — one profile-box deploy or two | **Two.** Deploy 1: S2 + S3 + the legacy-fallback removal. Deploy 2: S5. Both before the game deploy, so D2 still holds. |

---

## Summary

- **The "you're not logged in" UI is exactly one element, in one file** — the citizenship card's guest state, button `#citizenship-login-button` (`src/client/CitizenshipCard.ts:246-257`), handler `onLoginCtaTap` (`:165-187`). It is the **only** place anything in this repo calls the Yandex auth dialog. Today it does **not** reload and does **not** re-init: it logs a UI tap, dispatches a `citizenship-login-requested` event **that nothing in `src/` listens to**, then on success calls `refreshProfile()` only (`:180-183`).
- **Worst news first: the restart the owner asked for cannot be verified in production, and neither can most of S4's UI.** `CITIZENSHIP_CARD_ENABLED: false` (`src/client/flashist/FlashistFacade.ts:184`) is an absolute gate with no dev bypass (`CitizenshipCard.ts:71-76`), so the login button does not exist anywhere today — dev included. Verification is jest plus a **local** flag flip. Live proof waits for the launch (`0054`).
- **D1 is safe on the evidence, with one hole that could not be closed.** No commit ever set that flag to `true` (`git log -S'CITIZENSHIP_CARD_ENABLED: true'` → no commits). But the flag only exists since `e4f01e6` (2026-08-21); between `45e7113` (2026-07-01, first legacy profile call) and that commit the card was gated **only** by the remote `citizenship_ui` experiment flag (`FlashistFacade.ts:174-175`, `:901-902`) — a Yandex-console setting not readable from the repo. So "no released build would break" is **very likely, not proven**.
- **New find that shrinks the D1 risk a lot:** `BuildVersionChecker` polls `/api/version` every 5 min and on tab re-focus, and shows the blocking `StaleBuildModal` with a REFRESH button (`BuildVersionChecker.ts:14-56`, `StaleBuildModal.ts:86-92`). Any stale tab is told to reload within ~5 min of the game deploy.
- **The restart primitive already exists and is already shipped.** Every match exit is a full navigation via `FlashistFacade.changeHref(rootPathname)` (`GameRightSidebar.ts:135`, `WinModal.ts:345`, facade `:678-681`, `:347`). So a reload after login is the same shape as something production does after every match.
- **Mid-match reachability: the button cannot be pressed during a match** — the game canvas is `position: fixed` full-viewport appended to `document.body` (`Utils.ts:56-67`, `GameRenderer.ts:327`) over an in-flow, non-positioned card (`yandex-games_iframe.html:301`). Verified **by reading the code, not in a browser**, so the plan still guards the reload rather than relying on it.
- **Scope call: keep the login-button restart in S4 (~0.3 d). The wider "stale session" surface goes to its own task** (owner ruling Q1).
- **Effort: ~2.5–3 d** (was 2–2.5), the growth being the restart plus ~90 legacy-shaped test references to migrate.

---

# 1. Survey — what exists today

Every line below was read during planning.

### 1.1 The one login UI

| Thing | Where | What it does today |
|---|---|---|
| Guest card (the "you're not logged in" element) | `src/client/CitizenshipCard.ts:198-260` | Lock icon + `citizenship_card.title` + `guest_subtitle` (or `guest_subtitle_degraded`) |
| Login button | `CitizenshipCard.ts:246-257`, id `citizenship-login-button`, label `citizenship_card.login_cta` | Rendered **only** when `yaGamesAvailable && !isDegraded`; otherwise deliberately omitted because the dialog would no-op (comment `:254-257`) |
| Handler | `CitizenshipCard.ts:165-187` | `isAuthDialogOpen` re-entry guard → `logUiTapEvent(citizenshipLoginToEarn)` → dispatch `CITIZENSHIP_LOGIN_REQUESTED_EVENT` → `await openYandexAuthDialog()` → **if authorized: `refreshProfile()` only** |
| The event | declared `CitizenshipCard.ts:24`, dispatched `:174-179`, `bubbles/composed` | **No listener anywhere in `src/`.** Only `tests/client/CitizenshipCard.test.ts:263` listens. A free, already-wired seam |
| Auth dialog | `FlashistFacade.ts:1177-1191` | `auth.openAuthDialog()`, then **re-fetches** `getPlayer()` per Yandex docs, returns `isAuthorized()`. Any throw (player cancelled) → `false` |
| Guest card means truly guest | `PlayerProfileView.ts:60-64` | `null` is returned **only** for an unauthorized player; every authorized failure returns the logged-in zero-state (`:66-102`) |

**No reload, no re-init, nothing else.** `refreshProfile()` (`CitizenshipCard.ts:136-139`) re-reads the view model; it does not touch platform init.

### 1.2 Everything else that mentions login — all unreachable in the Yandex build

| Surface | Evidence | Status |
|---|---|---|
| `token-login` (OpenFront Discord login) | `yandex-games_iframe.html:283` `style="display: none;"` | dead |
| `account-button` | `yandex-games_iframe.html:438` `style="display: none;"` | dead |
| `AccountModal` reload (`:319`), `TokenLoginModal` reload (`:90`) | reached only from the two above | dead |
| `territory_patterns.blocked.login` | the whole `container__row` holding `territory-patterns-modal` is `style="display: none;"` (`yandex-games_iframe.html:285`) | dead |
| `main.login_discord`, `main.checking_login`, `auth.*` | same Discord/site-auth paths | dead |

`grep` for `openAuthDialog|authDialog` across `src/` returns **only** `FlashistFacade.ts:1177-1191` and `CitizenshipCard.ts:166-186`. There is no second Yandex login path.

### 1.3 Anything that reacts to a login-state change

- **Nothing.** The only `visibilitychange` listeners are `BuildVersionChecker.ts:55` and `PerformanceMonitor.ts:27`. No `focus`/`blur` handler. The only cross-tab listener is `MultiTabDetector.ts:13`, a match-time anti-multi-tab penalty unrelated to auth.
- The cached Yandex player object is re-fetched in exactly two places: `initPlayer()` (`FlashistFacade.ts:1153`) and `openYandexAuthDialog()` (`:1185`). Plus the **late-SDK recovery** chain (`:736-741`), which can produce a player object *after* the boot gate on a degraded boot that recovers.

### 1.4 Restart / reload precedents

| Site | Primitive | Guard |
|---|---|---|
| `Bootstrap.ts:83-90` | `window.location.reload()` on pre-gate bootstrap failure | `sessionStorage` latch `geoconflict.bootstrapReloadAttempted`, cleared on a successful boot (`:62`) |
| `StaleBuildModal.ts:86-92` | `window.location.reload()` from a blocking overlay, after an analytics event | one-shot via `staleDetected` (`BuildVersionChecker.ts:27-29`) |
| Match exit | `FlashistFacade.changeHref(rootPathname)` (`GameRightSidebar.ts:135`, `WinModal.ts:345`) | none needed |
| `#refresh` hash | same `changeHref` (`Main.ts:666-669`) | none |

`changeHref` is commented "Single place for working with URLS" (`FlashistFacade.ts:678-681`); `rootPathname` is `window.location.pathname` captured at construction (`:347`) — so that navigation **drops the query string and hash**, and production does it after every match.

### 1.5 Boot sequence and the insertion point

`Bootstrap.ts:39-67`: `initializeImmediate()` → `await initializePlatform()` → dynamic `import("./Main")` → `startClient()` → `flashist_markGameInitComplete()`. `startClient()` is `Main.ts:1024-1033` and begins with `startBuildVersionChecker()`. `void startProfileSession()` goes here, before `client.initialize()`.

`initializeImmediate` / `initializePlatform` are one-shot with memoized deferreds and latched analytics (`FlashistFacade.ts:350-351`, `:636-641`, `:711-741`), and all custom elements are registered by the app-chunk import. **Re-running Bootstrap in-page is not supported** — that is the core of the design decision in §3.

### 1.6 The 6 Bearer call sites, re-verified

⚠️ The brief's "six" counts modules including `TenureGrantClaim` (**does not exist**) and `Transport` (unchanged). The real list is **6 HTTP call sites in 4 modules**:

| # | Call | File:line today | After S4 |
|---|---|---|---|
| 1 | `GET /v1/profile` | `PlayerProfileView.ts:166-172` (`?yandexPlayerId=`) | Bearer, no query id. The id is still read locally for the earned-at storage key (`:43-46`, `:104-107`) |
| 2 | `GET /v1/messages` | `Inbox.ts:179-185` (`?yandexPlayerId=`) | Bearer. `session` keeps only `base` (`:202`) |
| 3 | `PATCH /v1/messages/read` | `Inbox.ts:243` (id in body) | Bearer, body `{ids?}` |
| 4 | `POST /v1/profile/name-change-request` | `NameChangeRequest.ts:122` via `postJson` (`:67`) | Bearer, body `{requestedName}` |
| 5 | `POST /v1/profile/name-change-cancel` | `NameChangeRequest.ts:156` | Bearer, body explicit `{}` |
| 6 | `POST /v1/payments/yandex/intent` | `PaymentsApiClient.ts:67`, caller `CitizenshipPurchase.ts:32-37` | Bearer, `createPurchaseIntent(productId)` |
| — | `complete` / `reconcile` | `PaymentsApiClient.ts:84`, `:96` — body is `{signature}` only | **unchanged, no Bearer.** Reconcile must not depend on login |
| — | WS join / `update_identity` | `Main.ts:712`, `Transport.ts:415-416` | **unchanged** (S3 path). The token never goes to the game server |

The `NewsModal` worry in the brief **is already covered**: `Inbox.fetchInboxState` checks `isCitizenshipSurfacesEnabled()` **first** (`Inbox.ts:154`), before the auth check (`:157`), and every `NewsModal` path goes through `refreshInbox()` → `fetchInboxState` (`NewsModal.ts:269`, `:349`; `Inbox.ts:100-105`).

### 1.7 Server side, re-verified

`resolveCaller` at `src/profile-server/Routes.ts:377-426`. Authorization header decides alone (`:378-404`); the legacy branch is `:406-425` and is explicitly labelled *"LEGACY FALLBACK — removed as 0273 (S4)'s last step."* Note `:412-413`: **no id at all already returns 401 `session_invalid`**, so removal is a deletion, not a new branch. TTL is `SESSION_TTL_SECONDS = 86_400` (`SessionToken.ts:28`); `signSessionToken` (`:71`) exists, so a test-token helper is cheap.

---

# 2. Scenarios where the in-memory session is wrong or missing

Nine, ordered by likelihood.

| # | Scenario | What happens under this plan | What the plan does |
|---|---|---|---|
| **1** | **Guest at boot, logs in mid-session** (the owner's case). Boot skipped login. Player presses the CTA, dialog succeeds. | Card refreshes and now renders **logged-in** — but there is **no token**. | **Restart the page** (§3). The whole start sequence re-runs with the player authorized. |
| **2** | **Boot login failed** (network blip, 503, timeout). Player is authorized. | Card renders the **logged-in zero-state** (`PlayerProfileView.ts:66-102`) — 0 XP, no CTA, nothing to press, for the rest of the load. | **Accepted for S4 as ruled (D3).** No retry, no automatic reload. The visible "tap to restart" surface is the **follow-up task** (owner ruling Q1), sequenced with `0054`. |
| **3** | **Token expired** (tab open > 24 h) | Next profile call 401s → shared helper re-logs-in **once** and retries **once**. Works. | Nothing extra. Covered by the 401 path, no clock maths. |
| **4** | **Box restored, or `PROFILE_SESSION_SECRET` rotated** | Every request 401s → one re-login → new valid token. Works. | Nothing extra. |
| **5** | **Late-SDK recovery**: degraded boot, SDK arrives after the gate, player turns out authorized (`FlashistFacade.ts:736-741`) | `startProfileSession()` already ran and skipped. Authorized with **no token** and **no login CTA**. | **Accepted, documented.** Goes to the same follow-up task as #2. |
| **6** | **Player logs out of Yandex in another tab** | Cached player object keeps reporting authorized (`:1153`, `:1185`); the token keeps working (`vfy:false`). XP keeps crediting to that account for the rest of the load. | **Accepted.** Same trust level as today's legacy path; ADR-113 accepts it. Closing it needs `0267`. |
| **7** | **iframe re-focus after long idle** | Nothing auth-related runs (§1.3). Token aged past 24 h → #3. Build changed → `StaleBuildModal`. | Nothing extra. |
| **8** | **A second tab** | Each load logs in independently with its own token. Nothing is stored, so nothing races. | Nothing extra. **Do not** add cross-tab sharing. |
| **9** | **Player cancels the auth dialog** | `openYandexAuthDialog()` returns `false` (`:1186-1189`); card stays guest. | **No reload**, one analytics event. Explicit in §3. |

---

# 3. The restart behaviour (owner ruling D3)

### 3.1 What to do

**A full page load, triggered only by the player's own press, only after the auth dialog reports success, only when no match is running, and at most once automatically per page load.**

1. Player presses `#citizenship-login-button`. Existing `isAuthDialogOpen` guard (`CitizenshipCard.ts:166-169`) and existing `logUiTapEvent` stay.
2. `await openYandexAuthDialog()`.
   - `false` (cancelled, dialog failed, no SDK) → fire `Profile:Login:Restart:Cancelled`, **no reload**, card stays guest. Same as today.
   - `true` → fire `Profile:Login:Restart:Requested` and dispatch a **new** `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` (bubbling, composed), mirroring the existing pattern at `:174-179`.
3. `Client` in `Main.ts` listens for that event (where `handleJoinLobby` / `handleLeaveLobby` live) and calls `requestGameRestart({ matchActive: this.gameStop !== null })`.
4. `requestGameRestart` (new `src/client/GameRestart.ts`):
   - `matchActive` → **do not reload.** Fire `Profile:Login:Restart:Suppressed:InMatch`, call the fallback (`refreshProfile()`), return.
   - sessionStorage latch `geoconflict.profileLoginRestartAttempted` already set → **do not reload** (fire `Profile:Login:Restart:Suppressed:Latched`), fall back to `refreshProfile()`.
   - otherwise: set the latch, fire `Profile:Login:Restart:Performed`, call `FlashistFacade.instance.reloadApp()`.
5. `startProfileSession()` clears the latch once it observes an authorized session, mirroring `Bootstrap.ts:62`.

### 3.2 Why a page load and not a re-run of `Bootstrap`

- `initializeImmediate` / `initializePlatform` are **one-shot**: memoized deferreds (`yandexInitPromise`, `yandexSdkInitPlayerPromise`), latched analytics (`hasLoggedYandexLoginStatus:350`, `hasLoggedExperimentEvents:351`), a one-shot gate (`flashist_markGameInitComplete`), and all custom elements already registered. Making them re-entrant is a rewrite of the init architecture, not an S4 change — and the owner's stated goal is *"to be sure the start sequence is done the right way"*, which a fresh document gives for free and a partial re-run cannot promise.
- A reload is the established answer to "start over cleanly": `Bootstrap.ts:86`, `StaleBuildModal.ts:91`, post-match `changeHref` at `GameRightSidebar.ts:135` / `WinModal.ts:345`.

### 3.3 Which primitive — `reload()`, not `changeHref(rootPathname)`

**`window.location.reload()`**, wrapped as a new `FlashistFacade.reloadApp()` so it respects that class's "Single place for working with URLS" convention (`:678-681`).

- `reload()` preserves the **whole** URL the platform handed the iframe — query string and hash included. `changeHref(rootPathname)` drops both (`:347`).
- The counter-argument is real: production **already** drops the query after every match exit and evidently works. But SDK health after that navigation was **not verified**, and the conservative primitive is one line away.
- `reload()` is also what the other three "start over" sites use.

### 3.4 Reload-loop safety

A loop cannot be automatic: the reload only ever follows a **player press**. The residual risk is repeated pressing because the reloaded page still reports guest (an SDK race, or Yandex not persisting the login). The sessionStorage latch caps it at **one** automatic reload per page load; after that the press falls back to today's `refreshProfile()`. Every `sessionStorage` access is wrapped in try/catch and a throw degrades to "no reload", exactly as `Bootstrap.ts:62-65` and `:83-90` do.

### 3.5 Mid-match safety

Two independent layers:

1. **Reachability.** The card lives in the start-screen flow (`yandex-games_iframe.html:301`, `class="block"`, non-positioned). During a match a `position: fixed`, full-viewport canvas sits over it (`Utils.ts:60-64`, appended at `GameRenderer.ts:327`), so the button is covered. The canvas is never removed (no `canvas.remove()` exists) because the post-match exit is a **full navigation** (§1.4) — which is also why the card is clickable again after a match.
2. **The explicit guard in step 4.** Because layer 1 rests on CSS stacking that was read but not observed in a browser, the code refuses to reload while `gameStop !== null`. **It never reloads out of a live match.** No "are you sure?" dialog is needed, because the reachable case is the start screen only.

### 3.6 Analytics (all `Category:Action` form, via the enum, never inline)

Added to `flashistConstants.analyticEvents` and to `ai-agents/knowledge-base/analytics-event-reference.md`:

| Key | String |
|---|---|
| `PROFILE_LOGIN_RESTART_REQUESTED` | `Profile:Login:Restart:Requested` |
| `PROFILE_LOGIN_RESTART_PERFORMED` | `Profile:Login:Restart:Performed` |
| `PROFILE_LOGIN_RESTART_CANCELLED` | `Profile:Login:Restart:Cancelled` |
| `PROFILE_LOGIN_RESTART_SUPPRESSED_IN_MATCH` | `Profile:Login:Restart:Suppressed:InMatch` |
| `PROFILE_LOGIN_RESTART_SUPPRESSED_LATCHED` | `Profile:Login:Restart:Suppressed:Latched` |

No user-visible string is added, so `en.json` / `ru.json` are untouched and neither HTML template changes.

### 3.7 Size

**In S4: ~0.3 d** (one ~40-line module, one facade method, ~15 lines in the card, one listener in `Main.ts`, 5 enum entries, doc update, 2 test files).

---

# 4. The plan

## 4.0 Scope, from the code
§1.6 is the authoritative call-site table. Server side is §1.7.

## 4.1 `src/client/ProfileSession.ts` (new)

**When:** `Main.ts` `startClient()` calls `void startProfileSession()` fire-and-forget, before `client.initialize()` (`Main.ts:1024-1027`). Not in `Bootstrap.ts` — the login contract pulls in zod and `PlayerProfile`, which belong in the app chunk, not the lean entry chunk. `startClient` only runs after `initializePlatform()` settles, so "after platform init" holds with no extra wait. Never awaited, never throws.

**Not** behind `CITIZENSHIP_CARD_ENABLED` or the remote flag (owner ruling; design §4 `:209-210`).

**Who logs in:** only when `isYandexAuthorized()` is true **and** `getYandexUniqueId()` is non-null **and** `profileApiUrl()` is non-empty. Guests, degraded boots and an unconfigured API make no call and fire no event.

**Request:** `POST {base}/v1/login`, body `{platform:"yandex_games", platformUserId}`, reply parsed with `LoginResponseSchema`.

**Token: memory only** — a module variable `{token, yandexId}`. No cookie, no `localStorage`, no `sessionStorage`, never in a query string. The client logs in every load anyway; cookies are third-party in the iframe; storage would keep a credential alive across tabs and after logout. The `yandexId` is held next to the token so a changed id discards the token.

**Expiry:** handled by the 401 only, no clock maths. `expiresAt` is parsed but never used for a decision — a wrong device clock would otherwise force a login before every call.

**Shared in-flight login:** one pending promise; the boot kick-off and every caller await the same one. `ensureSession(): Promise<string | null>` — `null` for guest / unconfigured / failed. 5 s `AbortController` timeout, matching `PROFILE_FETCH_TIMEOUT_MS` (`PlayerProfileView.ts:41`).

**[D3] No retry after a failed login.** A boot login that fails leaves the session logged-out **for the rest of the page load**. `ensureSession()` latches "failed" and returns `null` immediately from then on; it does **not** start a second login. Consequences (accepted by the ruling): scenario #2 gives a permanent 0-XP card for that load, and scenario #5 gets no session at all. The latch is cleared **only** by a fresh page load.

**The 401 path is not a retry and stays.** `relogin(staleToken)` fires only when the server rejects a token we actually held. It is the refresh mechanism design §2 specifies; without it a 24 h tab would break. At most 2 attempts per request; simultaneous 401s share one re-login.

**Shared helper:**

```ts
profileFetch(path, init): Promise<
  | { kind: "unconfigured" }             // empty base / config throw → caller's "no backend" path
  | { kind: "no_session" }               // guest, or login failed (D3 latch) → caller's failure path
  | { kind: "response"; response: Response }
  | { kind: "network_error" }>
```

Resolves the base URL, sets `Authorization: Bearer <token>` with the exact `Bearer ` spelling (S2 parses strictly — `Routes.ts:383`), fresh `AbortController` per attempt with the caller's timeout, one re-login + one retry on 401, second 401 returned as-is.

**Exposed for `0253`:** `getLoginOutcome(): Promise<{created, grantChecks} | null>`. Never exposes the token. `0253` is not built here.

**Test seam:** `resetProfileSessionForTests()`.

**Latch clearing:** on a successful login, clear `geoconflict.profileLoginRestartAttempted` (§3.1 step 5), in a try/catch.

## 4.2 `src/client/GameRestart.ts` (new) + card/facade/`Main.ts` wiring

Per §3. Shaped like `StartScreenControls.ts` — a pure function with injectable dependencies so it is testable without a browser:

```ts
export function requestGameRestart(deps: {
  matchActive: boolean;
  reload: () => void;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  fallback: () => void;
}): void
```

- `CitizenshipCard.ts`: export `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT`; dispatch it in `onLoginCtaTap` when `authorized === true`; keep `refreshProfile()` as the fallback for the suppressed cases. The existing `CITIZENSHIP_LOGIN_REQUESTED_EVENT` is left alone.
- `Main.ts`: one listener in `Client`, passing `matchActive: this.gameStop !== null`.
- `FlashistFacade.ts`: add `reloadApp()` next to `changeHref` (`:678-681`).

## 4.3 Analytics

Session events plus the restart events from §3.6. New "Profile session" section in `analytics-event-reference.md`. None fire for guests or with the API unconfigured.

| Key | String |
|---|---|
| `PROFILE_LOGIN_SUCCEEDED` | `Profile:Login:Succeeded` |
| `PROFILE_LOGIN_CREATED` | `Profile:Login:Created` (additional, when `created:true`) |
| `PROFILE_LOGIN_FAILED_TIMEOUT` | `Profile:Login:Failed:Timeout` |
| `PROFILE_LOGIN_FAILED_UNAVAILABLE` | `Profile:Login:Failed:Unavailable` (any 503: `session_unavailable`, S5's future `creation_paused`) |
| `PROFILE_LOGIN_FAILED_ERROR` | `Profile:Login:Failed:Error` (network, other non-2xx, schema failure) |
| `PROFILE_SESSION_RELOGIN` | `Profile:Session:Relogin` (401-driven) |

With the card switch off, login still runs and these still fire; nothing is visible, and no other profile call is made.

## 4.4 Order of work — RED first: write each test, watch it fail, then implement

**Step 1 — `tests/client/ProfileSession.test.ts`** (jsdom; URL-routed fetch stub; mocked facade + `ConfigLoader`):

| Test | Mutation it must catch |
|---|---|
| Guest → no fetch at all | remove the `isYandexAuthorized` check → red |
| Authorized: boot kick-off + 3 simultaneous callers → exactly **one** `POST /v1/login`, right body, **no** Authorization header on it | drop the shared in-flight promise → red |
| Timeout (fake timers), 503, 500, network error, malformed reply → `no_session`, never throws, exactly one matching failure event each | swallow the event, or let the rejection escape → red |
| **[D3]** after a failed login, 3 later `ensureSession()` calls → still exactly **one** `POST /v1/login`, all return `null` | restore the on-demand retry → red |
| Empty base / config throw → no login, `unconfigured` | remove the try/catch → red |
| `profileFetch` sends exactly `Bearer <token>` | change the prefix spelling → red (S2 residual R3) |
| Server always 401 → exactly **2** logins and **2** requests, and the 401 is returned to the caller | turn the retry into a loop → red |
| Two simultaneous 401s on the same stale token → **one** re-login | drop the stale-token comparison → red |
| Changed Yandex id → old token discarded | remove the id comparison → red |
| Token never reaches `Storage.prototype.setItem` or `document.cookie` (spies) | any storage write → red |
| `getLoginOutcome()` returns `created` / `grantChecks` | — |
| `startProfileSession()` returns synchronously and never rejects | — |
| A successful login clears the restart latch | — |

**Step 2 — build `ProfileSession.ts`** + the 6 session enum entries.

**Step 3 — caller tests first, then the switch-over.** Files: `PlayerProfileView.test.ts`, `Inbox.test.ts` (GET, PATCH, refresh-after-mark-read), `NameChangeRequest.test.ts` (both calls), `PaymentsApiClient.test.ts`, `CitizenshipPurchase.test.ts`. These use the **real** `ProfileSession` with a URL-routed fetch stub, not a mock of it. Each asserts: Bearer present; `yandexPlayerId` appears in **no** profile-call URL or body (the login body is the only place the id may appear — mutation: leave the query param in → red); existing failure outcomes unchanged. Plus one 401 → re-login → retry through `Inbox`.

`no_session` maps to: profile → zero-state; inbox → `failedState()` (fires `Inbox:LoadFailed`; guests never reach it because the guest check is first, `Inbox.ts:157`); name change → `error`; intent → `null`. `CitizenshipCard.test.ts` mocks adjusted only if new signatures break them.

**Step 4 — the restart.** `tests/client/GameRestart.test.ts`:

| Test | Mutation |
|---|---|
| No match, no latch → `reload` called once, latch written, `Restart:Performed` fired | remove the latch write → the "at most once" test goes red |
| `matchActive: true` → `reload` **never** called, `fallback` called, `Suppressed:InMatch` fired | drop the match guard → **red. This is the one that must never regress.** |
| Latch already set → no reload, `fallback` called, `Suppressed:Latched` | — |
| `storage` throws on read and on write → no reload, no throw | remove the try/catch → red |

Plus, in `CitizenshipCard.test.ts`: dialog `true` → the new event is dispatched once; dialog `false` → **not** dispatched and `Restart:Cancelled` fired; the re-entry guard still holds.

**Step 5 — reference doc** update (11 events).

**Step 6 — legacy fallback removal (server).** Per **D1** this is built **in this same change set** and ships with the S2/S3 profile deploy. Tests first:

- `SessionRoutes.test.ts` legacy cases flip: a known legacy id with no header → **401 `session_invalid`** (mutation: restore the fallback → red); a malformed legacy id → **401**, no longer 400.
- Contract tests: `yandexPlayerId` is stripped from parsed output.
- Migrate `Routes.test.ts`, `InboxRoutes.test.ts`, `NameChangeRoutes.test.ts`, `PaymentsRoutes.test.ts` and the `Routes.it` / `NameChange.it` integration suites onto a shared "sign a test token" helper built on `signSessionToken` (`SessionToken.ts:71`). **~90 legacy-shaped references** across those files (142 `yandexPlayerId` hits in `tests/` total; the game-server and client ones stay).
- `Routes.ts`: delete `LegacyCallerIdSchema` (`:142`) and the legacy branch (`:406-425`); `CallerResolution` loses `unknown` and `bad_request` (`:210-211`) and each route's now-dead branches go. **Keep:** a valid token for a missing player → 404 on profile and intent (the FK check); inbox and name change keep their 403 SQL citizen gate. `via` is dropped or kept per §4.7. Update the comments at `:134`, `:205-207`, `:364-376`, `:452`, `:677-681`. `findPlayerByIdentity` **stays** in the repository — S5's creation switch may need it.
- Contracts: remove `yandexPlayerId` from `PurchaseIntentRequestSchema`, `NameChangeRequestSchema`, `NameChangeCancelRequestSchema` (→ `z.object({})`) and `MarkReadRequestSchema`, plus the now-unused local `PlayerIdSchema`s. zod strips unknown keys by default, so an old body still parses and then 401s.

**Step 7 — gates.**
- `npm test` (includes the shell harnesses, ~22–25 s). A supertest timeout gets a **noted** re-run per the CLAUDE.md flake rule; rule out the `0197` segfault signature first.
- `npm run test:integration` against the local throwaway database (destructive — it drops and recreates `public`).
- `npx tsc --noEmit` and `npm run lint` both exit 0.
- Worklog decision log records every unattended call.

## 4.5 What S4 must NOT do

- **S5 (`0274`):** no metrics, no OTEL, no `PROFILE_LOGIN_CREATE_ENABLED`, no `creation_paused` server logic. The client only treats **any** 503 as fail-soft.
- **`0253`:** no tenure claim call, popup or route. Only `getLoginOutcome()`.
- **`0276`:** no nginx or path-case work, no change to the error handler.
- **`0267`:** no signature verification. `vfy:false` never unlocks paid state (`0250`).
- **Game side:** no `Transport.ts` / WS schema change, no `PROFILE_INTERNAL_TOKEN` work.
- **Do not flip `CITIZENSHIP_CARD_ENABLED`.** That is `0054`'s launch decision and it is now load-bearing for deploy safety (§4.6).
- **Do not build the situation-B / stale-session surface** (scenarios #2 and #5). Owner ruling Q1: that is a separate follow-up task, sequenced with `0054`.
- Nothing else: no rate-limiter change, no token storage, no replacing `GET /v1/profile` with the login's `profile`, no Bearer on complete/reconcile, no cross-tab session sharing, no `Bootstrap` re-entrancy.

## 4.6 Deploy order — per D1, D2 and Q2

**The ordering consequence of D1, stated plainly:** profile-box **deploy 1** carries S2 + S3 + the removal, so **from the moment it lands the box 401s every legacy-shaped request** — and that is *before* any game build containing the S4 client exists. The S4 client must therefore be built and deployed **before or with** any game version that relies on the legacy path.

**Would any currently-released build break? Almost certainly not.** Evidence:
- All five legacy call sites are reachable only through the citizenship card or the inbox, and both are gated by `CITIZENSHIP_CARD_ENABLED: false` (`FlashistFacade.ts:184`; card gate `CitizenshipCard.ts:71-76`; inbox gate `Inbox.ts:154`).
- `git log --all -S'CITIZENSHIP_CARD_ENABLED: true'` → **no commits.** The flag has never been `true` in any commit.
- `complete` / `reconcile` send no id (`PaymentsApiClient.ts:84`, `:96`) → unaffected. The game server's internal routes use `PROFILE_INTERNAL_TOKEN`, not `resolveCaller` → unaffected.
- Stale open tabs are told to reload within ~5 min by `BuildVersionChecker` + `StaleBuildModal` (§1.4).

⚠️ **The hole that could not be closed.** The local flag only exists since `e4f01e6` (2026-08-21). Builds between `45e7113` (2026-07-01, the commit that introduced the legacy `?yandexPlayerId=` profile call) and that date were gated **only** by the remote `citizenship_ui` experiment flag (`FlashistFacade.ts:174-175`, `:901-902`) — a Yandex-console setting not readable from the repo. If prod ever ran such a build with that flag enabled, and a player still has that tab open, their profile calls will 401. **Blast radius: a zero-state card and an unavailable inbox. Nothing crashes, no purchase breaks.** Mitigating but unverified: memory records the profile box as live only since 2026-09-10 with 0 rows, so such calls had no live server to reach — **the box was not re-checked during planning.**

**🔒 The hard gate this creates:** between deploy 1 and the S4 game deploy, **any** client profile call 401s. So `CITIZENSHIP_CARD_ENABLED` must stay `false` until the S4 client is live. That is already the plan, and it is now a deploy-safety requirement, not just a launch decision.

**Order (D2: S5 live before the S4 game deploy; Q2: two box deploys):**

1. **Profile-box deploy 1 — S2 + S3 internal routes + legacy-fallback removal (D1).** Must not overlap `0275`'s drill (a deploy's smoke backup writes the same daily object) or the 02:00–03:15 UTC window. On-box checks: `POST /v1/login` returns a token; `GET /v1/profile` with Bearer works; **a legacy-shaped request (Yandex id, no header) returns 401** — the removal's live proof, available at *this* deploy.
2. **`0275` Part B complete.** Its seed step refuses once any table holds a row, and rows first appear at step 4. ⚠️ `0275`'s current state was **not verified** during planning.
3. **Profile-box deploy 2 — S5 (`0274`)** (owner ruling Q2). D2 is satisfied because it lands before step 4.
4. **Game deploy — S3 game server + S4 client.** Rows start appearing here, for every logged-in load, with the card still off.
   - Live check in the browser network tab: exactly **one** `POST /v1/login` per logged-in load, and **zero** on a guest load. With the card off there are no other profile calls to inspect, so Bearer on the other five is proven by the client tests plus step 1's on-box check, not by production.
5. **`0217`** (XP go-live) afterwards.
6. **`0054`** (flip the card flag) — the earliest point the restart behaviour and the card are observable in production at all, and the natural home for the situation-B follow-up task.

**This task closes after step 4's live check.**

## 4.7 Overlaps with parallel work

- **`0274` (S5).** Its planned `session.rejected reason=legacy_fallback_used` metric hooks `resolveCaller`'s `via` (`Routes.ts:205-211`). Under D1 the fallback is gone in deploy 1, so **`0274` must not implement that reason at all** — the producer should strike it from `0274`'s brief rather than let it be built and deleted. `creation_paused`'s 503 is already covered by the client's 503 handling.
- **`0276`.** Also edits `Routes.ts` (error handler, internal paths). Different regions of the same file, in a shared uncommitted working tree.
- **`0274` + `0276` + this removal all touch `Routes.ts`.** The driver must sequence those edits **one at a time**, never in parallel.
- **`0275`.** Part B before step 4 (§4.6).
- **S3 (`0272`).** Rides the same game deploy; no client files overlap.
- **`0253`.** Consumes `getLoginOutcome()` only; not built here.

## 4.8 Risks

1. **Rows start at the game deploy** — ~1.5 K logged-in players/day, one login per load, `last_login_at` writes throttled to once an hour server-side. No rate limiter (owner ruling). D2 puts monitoring in front of this.
2. **The D1 hole above** — an old remote-flag-enabled tab 401s. Bounded to a zero-state card.
3. **A misconfigured `PROFILE_SESSION_SECRET`** (`0271` residual R2) now breaks **every** profile call, not just login, until a redeploy. The failure gets louder — the intended direction, but a real widening.
4. **D3's dead ends** — scenarios #2 and #5: an authorized player with no session and, in #5, no CTA either, for the whole load. Accepted by ruling; the follow-up task (Q1) covers it at `0054`.
5. **Database restore without rotating the secret** — a token for a lost player gets 404, not 401, so no re-login fires within that load. The next load recreates the player. Accepted, noted.
6. **With the card on,** the first card render waits one extra round trip; worst case login 5 s + fetch 5 s.
7. **The restart is unverifiable in production until `0054`.** Jest plus a local flag flip is the whole of its evidence at ship time.
8. **In-memory token and XSS** — same exposure as any page state; `vfy:false`, so it grants nothing beyond what asserting the Yandex id already does.

## 4.9 Effort

| Part | Estimate |
|---|---|
| `ProfileSession` + 4 caller modules + tests + 11 events + doc | ~1.5 d |
| Restart behaviour (§3) | ~0.3 d |
| Fallback removal + ~90-reference server/integration test migration | ~0.5–1 d |
| **Total** | **~2.5–3 d**, plus review |

D1 saves **calendar** (one fewer deploy cycle), not effort.
