# Coder handoff — s4-citizenship-xp-progress-ui (PR #130)

> This is a **fix spec**, not applied code. It describes two changes surfaced by a review
> of PR #130. Decide and implement in a separate run. Findings are recommendations —
> verify each against the code before changing anything (CLAUDE.md "Review Notes").

## Context

PR #130 is the "keystone" of the citizenship feature: it wires the client citizenship
card to read the real player profile. `loadPlayerProfileView()` in
`src/client/PlayerProfileView.ts` was a stub returning `{ displayName, xp: 0, isCitizen: false }`;
it now, for an authorized player, does `GET {profileApiUrl}/v1/profile?yandexPlayerId={id}`,
parses the new shared `PublicPlayerProfileSchema`, and maps to the card's view model. The
card (`src/client/CitizenshipCard.ts`) renders the guest login-CTA when the view model is
`null` and the logged-in card otherwise; it is behind the `citizenship_ui` Yandex experiment
flag.

The client diff itself is well-built (schema single-source-of-truth, AbortController
timeout, `encodeURIComponent`, exhaustive failure-path tests). Review confirmed the two
issues below.

**In scope for this handoff:** the two findings (C1 CORS, A1 config-guard).
**Out of scope:** any other rework of the card, the profile schema, the crediting flow, or
the flag system. Do **not** widen the change.

## Changes to make

| # | Severity | Required? | Location | Summary |
|---|----------|-----------|----------|---------|
| C1 | high (feature-breaking) | **Yes — blocking** | `src/profile-server/Routes.ts` (+ profile-server route tests) | Add scoped CORS to the public `GET /v1/profile` so a browser on the game origin can read the response. |
| A1 | low/med | Yes | `src/client/PlayerProfileView.ts` (+ `tests/client/PlayerProfileView.test.ts`) | Guard the `getServerConfigFromClient()` read so a rejection resolves to the logged-in zero-state, not a propagated throw. |

---

### C1 — Public `/v1/profile` has no CORS → card is dark in production

- **Where:** `src/profile-server/Routes.ts` — the `app.get("/v1/profile", ...)` handler
  (~line 90). Browser call site: `src/client/PlayerProfileView.ts:87` (`fetchPublicProfile`).
- **Problem:** the game is served from `geoconflict.ru`; `profileApiUrl()` resolves to
  `https://api.geoconflict.ru` (a different origin). PR #130 is the **first** browser-side
  `fetch()` to the profile server (every prior consumer — T6 `ProfileApiClient` — is
  server-to-server Node `fetch`, not subject to CORS). `createApp()` installs no `cors`
  middleware and sets no `Access-Control-Allow-Origin`; the profile nginx block in
  `setup-profile.sh` (`location /` → bare `proxy_pass`) adds none either. A live probe
  (`curl -i -H "Origin: https://geoconflict.ru" https://api.geoconflict.ru/health`)
  returns `200` with **no** `Access-Control-Allow-Origin` header.
- **Honest impact:** the request is a "simple" GET (no preflight), so the server responds
  `200`, but the browser blocks JS from reading the cross-origin response → `fetch()`
  rejects → the blanket `catch` in `fetchPublicProfile` returns `null` → `loadPlayerProfileView()`
  resolves to the zero-state. Result: **every** authorized player (in the `citizenship_ui`
  experiment) sees `xp: 0, isCitizen: false`, forever, with no visible error. The feature
  never works in prod. It is invisible to the current tests because Jest mocks `global.fetch`
  and jsdom does not enforce CORS.
- **Recommended fix (primary — Express, testable):** set `Access-Control-Allow-Origin` on
  the **public** `/v1/profile` route only. The read is unauthenticated, carries no
  credentials/cookies, and is already public + rate-limited, so `Access-Control-Allow-Origin: *`
  is sufficient and leaks nothing beyond what the endpoint already returns; allowlisting the
  specific game origin(s) is stricter and also fine. Because it is a simple GET with no
  custom request headers, **no `OPTIONS` preflight handling is needed**. Do **not** add CORS
  to `/internal/*` (server-to-server, `internalAuth`-gated, IP-allowlisted).
  - Keep it in Express (not nginx) so it is covered by a route test. nginx `proxy_pass`
    passes the upstream header through unchanged, so no nginx edit is required.
  - **Deployment note:** this is a profile-server change — it needs an image rebuild +
    redeploy via `build-deploy-profile.sh` to take effect on `api.geoconflict.ru`.
- **Alternative (larger, not recommended for this task):** proxy the profile read through a
  same-origin game-server endpoint (e.g. `/api/profile` in `Master.ts`) and change the
  client to call that relative path. Avoids CORS entirely but adds a game-server route +
  webpack proxy entry + a client change; heavier than the feature warrants now.

---

### A1 — Unguarded `getServerConfigFromClient()` can misrender an authorized player as a guest

- **Where:** `src/client/PlayerProfileView.ts:53` (the `await getServerConfigFromClient()`
  read). Consumers with no local catch: `CitizenshipCard.refreshProfile()`
  (`src/client/CitizenshipCard.ts:74-77`) and the `connectedCallback` chain (:53-71, whose
  `.catch` only `console.warn`s).
- **Problem:** `getServerConfigFromClient()` (`src/core/configuration/ConfigLoader.ts:29-60`)
  `fetch("/api/env")` and **throws** on a non-OK response (:35-38) or a missing `gameEnv`
  (:57). PlayerProfileView's `try/catch` lives only inside `fetchPublicProfile`, so this call
  is outside the "every authorized failure path → zero-state" enumeration documented in the
  function's own doc comment (:25-33).
- **Honest impact:** lower than the reviewer's original "high." The trigger is a
  **same-origin** `/api/env` failure, which implies app-wide misconfiguration (uncommon), and
  the unguarded pattern is consistent across the codebase (`Matchmaking.ts`, `HostLobbyModal.ts`,
  `JoinPrivateLobbyModal.ts` all call it unguarded). The one way the card is *uniquely* hit:
  it is an early caller (start screen) while matchmaking/lobby callers run later and would
  retry, so a transient early `/api/env` blip can leave the card stuck on the guest CTA while
  the rest of the app recovers. Still worth closing because this PR makes an explicit, tested
  "never null for authorized" guarantee and this is the one gap in it. Fix is trivial and
  matches the `Bootstrap.ts` degraded-mode philosophy the code already cites.
- **Recommended fix:** wrap the config read so a rejection yields the zero-state, e.g.:
  ```ts
  let base: string;
  try {
    base = (await getServerConfigFromClient()).profileApiUrl().replace(/\/+$/, "");
  } catch {
    return zeroState;
  }
  if (!base) {
    return zeroState;
  }
  ```
  Keep `zeroState` and the rest of the flow unchanged.

## Do NOT change (accepted residuals — see the ledger)

- The **`null` == guest, and only guest** contract. Never return `null` for an authorized
  failure path (it would misrender a logged-in player/citizen as a guest).
- The **public projection field set**. Do not add `is_paid_citizen`,
  `citizenship_purchased_at`, or `persistent_id` back into `PublicPlayerProfileSchema` /
  `toPublicProfile()`. Conversely, the read still returning `created_at` / `updated_at` /
  `yandex_player_id` is an **accepted** pre-existing tradeoff (rate-limited; revisited when
  Yandex-signature owner-auth lands) — do not "fix" it by bolting auth onto this task.
- The **flag slot / `/flags` path**. Do not resurface the legacy country-flag assets; the
  `🏳️` fallback is intentional. (This PR does not touch it — just don't drift into it.)
- The client card's rendering, the AbortController/timeout design, and the schema
  single-source-of-truth are correct — leave them.

## Validation & acceptance criteria

- **C1:**
  - Add an HTTP test in the profile-server route tests (supertest against `createApp`) that
    sends an `Origin` header to `GET /v1/profile` and asserts an `Access-Control-Allow-Origin`
    response header is present (and that `/internal/*` does **not** get one).
  - Manual: `curl -i -H "Origin: https://geoconflict.ru" https://api.geoconflict.ru/v1/profile?yandexPlayerId=test`
    shows `Access-Control-Allow-Origin` after redeploy.
  - End-to-end: with the `citizenship_ui` flag on, an authorized player with real XP sees
    their actual XP / citizen state (not `0 / 1,000`).
  - **Harness caveat:** the client jsdom suite mocks `fetch` and cannot enforce CORS — the
    regression guard MUST live in the profile-server HTTP tests, not the client tests.
- **A1:**
  - Add a client unit test: mock `getServerConfigFromClient` to **reject**, assert
    `loadPlayerProfileView()` resolves to the zero-state (`{ displayName, xp: 0, isCitizen: false }`),
    never rejects, and never returns `null` for the authorized case.
  - Existing `tests/client/PlayerProfileView.test.ts` (all enumerated failure paths) and
    `tests/core/profile/PlayerProfile.test.ts` must still pass.
- **Global:** `npm run lint` and `npm test` clean on all touched files.
