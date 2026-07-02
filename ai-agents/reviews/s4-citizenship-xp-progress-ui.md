# Review ledger — s4-citizenship-xp-progress-ui

Task: ai-agents/tasks/backlog/s4-citizenship-xp-progress-ui.md
PR: #130 (branch `s4-citizenship-xp-progress-ui` → `dev`)
File(s) under review:
- src/client/PlayerProfileView.ts
- src/core/profile/PlayerProfile.ts
- src/profile-server/Routes.ts
- tests/client/PlayerProfileView.test.ts
- tests/core/profile/PlayerProfile.test.ts
Status: in-review — **blocked** (1 feature-breaking defect open)

Reviewers (Round 1): Claude `code-reviewer` (review-only) + Codex `adversarial-review`
(`--base dev --scope branch`). Both ran; full coverage. CORS gap raised by **both**.

## Accepted residuals (do-not-re-litigate)

- **Public read exposes `created_at` / `updated_at` / `yandex_player_id`** — What: the
  unauthenticated `GET /v1/profile` public projection intentionally still returns these
  non-secret fields (only `is_paid_citizen`, `citizenship_purchased_at`, `persistent_id`
  are withheld). Why (structural): Sprint-4 read is unauthenticated (no Yandex-signature
  verification yet), so leaking "who paid" and the internal identity-linkage token is the
  real risk; the remaining fields are low-value and the endpoint is per-IP rate-limited
  (60/min). This is **pre-existing on `dev`** — PR #130 only re-typed `toPublicProfile()`,
  it did not change what is exposed. Re-raise only if: Yandex-signature owner-auth lands
  (Payments task) — at which point the projection should be revisited so the verified
  owner gets the full profile, or if a new genuinely-sensitive field is added to the
  schema without being added to the omit list.

- **`null` return means guest, and ONLY guest** — What: `loadPlayerProfileView()` returns
  `null` exclusively for unauthorized players (the card renders the login CTA); every
  authorized failure path resolves to the logged-in zero-state. Why (structural): the card
  keys its guest-vs-logged-in render entirely off `profile === null`
  (`CitizenshipCard.ts:131`), so returning `null` for an authorized failure would misrender
  a logged-in player / citizen as a guest. Re-raise only if: the card's null-handling
  contract changes. (Recorded so a future reviewer does not "simplify" an authorized error
  path back to `null`.)

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | **C1** — cross-origin browser fetch to `api.geoconflict.ru/v1/profile` has no `Access-Control-Allow-Origin` (Express `createApp` + nginx in `setup-profile.sh` + live `curl` probe all confirm none). Raised by **both** reviewers (Codex: high; Claude: critical). | **CONFIRMED → high (feature-breaking)** | **Open / blocking.** Browser blocks the response read → `catch` → zero-state for every authorized player → card is silently dark in prod. Defect; fix lives in the profile server/nginx (outside the client diff). User decision 2026-07-02: **fix before merge.** |
| 1 | **A1** — `getServerConfigFromClient()` (PlayerProfileView.ts:53) is unguarded; it can reject (`/api/env` non-OK or missing gameEnv) and propagate, leaving `profile = null` → guest CTA for an authorized player. | **PARTIALLY CORRECT → low/med** (reviewer rated high; downgraded) | **Open / to-fix.** Real gap in the PR's own "every authorized failure path → zero-state" enumeration, but the trigger is a same-origin `/api/env` failure (app-wide, uncommon) and the unguarded pattern is codebase-wide. User decision 2026-07-02: **fix — wrap in try/catch → zeroState.** |
| 1 | Schema `omit` consistency, null/zero-state contract, AbortController timeout + `clearTimeout` in `finally`, `encodeURIComponent`, `!response.ok` handling, empty-`profileApiUrl` skip, test coverage, `===`/`??`, no new localization, no new security exposure. | VERIFIED CLEAN | No action. Both reviewers + independent pass agree the client diff is well-built. |

## Open / actionable

- **C1 (blocking, server-side):** add scoped CORS to the public `GET /v1/profile` route so
  the game origin can read the response (or proxy the read through a same-origin game-server
  endpoint). `/internal/*` routes must NOT get CORS (server-to-server, `internalAuth` +
  IP-allowlisted). Add an HTTP regression test asserting the `Access-Control-Allow-Origin`
  header — the client (jsdom) test suite structurally cannot catch this. Requires a profile
  server rebuild/redeploy (`build-deploy-profile.sh`) to take effect.
- **A1 (client):** wrap the `getServerConfigFromClient()` read in PlayerProfileView.ts in
  `try/catch` and return the zero-state on rejection; add a unit test for that path.

See `ai-agents/reviews/s4-citizenship-xp-progress-ui-coder-handoff.md` for the fix spec.
