# Review ledger — s4-citizenship-xp-progress-ui

Task: ai-agents/tasks/backlog/s4-citizenship-xp-progress-ui.md
PR: #130 (branch `s4-citizenship-xp-progress-ui` → `dev`)
File(s) under review:
- src/client/PlayerProfileView.ts
- src/core/profile/PlayerProfile.ts
- src/profile-server/Routes.ts
- tests/client/PlayerProfileView.test.ts
- tests/core/profile/PlayerProfile.test.ts
Status: closed-out — code complete. Round 2 verified the C1 + A1 fixes are correct &
complete (lint/tsc/jest green, 48/48); no open code defects. The ONLY remaining gate is the
profile-server **redeploy** so C1's CORS goes live on `api.geoconflict.ru`, plus the
post-deploy CORS curl — both owner/ops actions, not code.

Reviewers (Round 1): Claude `code-reviewer` (review-only) + Codex `adversarial-review`
(`--base dev --scope branch`). Both ran; full coverage. CORS gap raised by **both**.
Reviewers (Round 2, on `1f42f10`): Claude `code-reviewer` ✅ (both fixes verified correct &
complete, no regressions/new issues). Codex `adversarial-review` ⚠️ **stalled** — ran ~2 min,
interim verdict `approve`/no-findings, then hung in "verifying" with no final result;
cancelled after 15 min. Its one unfinished lead (XP bigint type-skew) was independently
disproven, so coverage was closed by the Claude reviewer + independent verification + tests.

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

- **Public `/v1/profile` uses CORS `*`, not an origin allowlist** — What: the C1 fix sets
  `Access-Control-Allow-Origin: *` on the public read (scoped to `GET /v1/profile` only;
  `/internal/*` gets none). Why (structural): the read is unauthenticated, credential-free
  (`fetch` without `credentials: "include"`), already public + per-IP rate-limited, so `*`
  grants a browser nothing a server-side request couldn't already get — and the game runs on
  the Yandex Games sandbox origin, which is not reliably pinnable, so an allowlist would
  re-break the very degradation C1 fixed. `*` is invalid only with credentialed requests,
  which this is not. Re-raise only if: the read gains credentials/cookies or Yandex-signature
  owner-auth (at which point `*` must become a specific allowlist + `Allow-Credentials`).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | **C1** — cross-origin browser fetch to `api.geoconflict.ru/v1/profile` has no `Access-Control-Allow-Origin` (Express `createApp` + nginx in `setup-profile.sh` + live `curl` probe all confirm none). Raised by **both** reviewers (Codex: high; Claude: critical). | **CONFIRMED → high (feature-breaking)** | **Open / blocking.** Browser blocks the response read → `catch` → zero-state for every authorized player → card is silently dark in prod. Defect; fix lives in the profile server/nginx (outside the client diff). User decision 2026-07-02: **fix before merge.** |
| 1 | **A1** — `getServerConfigFromClient()` (PlayerProfileView.ts:53) is unguarded; it can reject (`/api/env` non-OK or missing gameEnv) and propagate, leaving `profile = null` → guest CTA for an authorized player. | **PARTIALLY CORRECT → low/med** (reviewer rated high; downgraded) | **Open / to-fix.** Real gap in the PR's own "every authorized failure path → zero-state" enumeration, but the trigger is a same-origin `/api/env` failure (app-wide, uncommon) and the unguarded pattern is codebase-wide. User decision 2026-07-02: **fix — wrap in try/catch → zeroState.** |
| 1 | Schema `omit` consistency, null/zero-state contract, AbortController timeout + `clearTimeout` in `finally`, `encodeURIComponent`, `!response.ok` handling, empty-`profileApiUrl` skip, test coverage, `===`/`??`, no new localization, no new security exposure. | VERIFIED CLEAN | No action. Both reviewers + independent pass agree the client diff is well-built. |
| 1 (apply) | **C1** fix (approved 2026-07-02). | CONFIRMED → applied | Added `allowPublicCors` middleware (`Access-Control-Allow-Origin: *`) scoped to `GET /v1/profile` **only**, placed **before** the rate limiter so even a 429 carries the header; `/internal/*` deliberately untouched. `Routes.test.ts` now asserts ACAO `*` present on the public read and **absent** on `/internal/*`. Chose `*` over an origin allowlist: the read is unauthenticated, credential-free, already public + rate-limited, so `*` leaks nothing a server-side `curl` couldn't get, and it avoids re-breaking on the unpinnable Yandex Games sandbox origin. **Still requires a profile-server rebuild/redeploy (`build-deploy-profile.sh`) to take effect on `api.geoconflict.ru`.** |
| 1 (apply) | **A1** fix (approved 2026-07-02). | PARTIALLY CORRECT → applied | Wrapped the `getServerConfigFromClient()` read in `PlayerProfileView.ts` in try/catch → `return zeroState` on rejection (respects the `null==guest`-only residual — returns the logged-in zero-state, not `null`). `PlayerProfileView.test.ts` adds a case: a config-read rejection resolves to the zero-state, never throws, never returns `null`. |
| 2 | **C1** re-verify on `1f42f10`. | **FIXED — CORRECT & COMPLETE** | `allowPublicCors` sets ACAO `*` on `GET /v1/profile` only, before the limiter (so a 429 keeps the header); client fetch is a simple GET (no custom headers) → no preflight, so no `Allow-Methods/Headers`; no `Allow-Credentials` needed (fetch is not credentialed); nginx `location /` passes the upstream header through untouched (no `add_header`/`proxy_hide_header` anywhere). `Routes.test.ts` asserts ACAO present on the public read, absent on `/internal/*`. Independently verified by Claude R2 + code trace + 48/48 tests. **Only the redeploy remains** (below). |
| 2 | **A1** re-verify on `1f42f10`. | **FIXED — CORRECT** | try/catch → `zeroState` closes the last unguarded `await`; all four `await` sites in `loadPlayerProfileView()` (`isYandexAuthorized`, `getCurPlayerName`, `getYandexUniqueId`, `getServerConfigFromClient`) are now guarded, and the rejection path returns the logged-in zero-state (honors the `null==guest` residual), never `null`. New client test covers it. |
| 2 | **X1** (Codex interim lead, unfinished): "`xp` is Postgres `bigint` → node-pg returns a string → client `z.number()` rejects → zero XP for everyone — a ship blocker." | **INCORRECT (disproven)** | `rowToProfile()` does `xp: Number(row.xp)` (PlayerProfileRepository.ts:121) and `getProfile()` — the exact `GET /v1/profile` path — returns `rowToProfile(res.rows[0])` (:229), so `xp` is coerced to a JS number before the schema/JSON response. No type skew. Recorded so a future reviewer doesn't re-chase it. |
| 2 | **I1** (Claude, informational): the new CORS test asserts only the 200 path, not that a 429 carries the header. | CORRECT (non-defect) | Not a defect — the 429-carries-header property is structurally guaranteed by middleware order (CORS set before the limiter). Optional to add a 429 assertion; not required. |
| 2 (note) | Codex Round-2 run stalled (hung in "verifying", cancelled after 15 min) with no final structured verdict. | Partial coverage — compensated | Interim state was verdict `approve`/no findings; its only open lead (X1) was independently disproven. Coverage closed by Claude R2 + independent verification + tests. Flagged so the "ready" verdict isn't read as a clean two-reviewer pass. |

## Open / actionable

- **C1 — deploy step only (code done):** the CORS fix is in Express and covered by a route
  test, but it only becomes live after a profile-server rebuild/redeploy
  (`build-deploy-profile.sh`) to `api.geoconflict.ru`. Verify post-deploy:
  `curl -i -H "Origin: https://geoconflict.ru" "https://api.geoconflict.ru/v1/profile?yandexPlayerId=test"`
  shows `Access-Control-Allow-Origin: *`. (Deploy is an owner action — not run from this task.)
- **A1 — done.** No further action.

Both code fixes are committed on branch `s4-citizenship-xp-progress-ui` (`1f42f10`) and are
green under lint / `tsc --noEmit` / jest (48/48). Round 2 found **no open code defects** and
disproved the one new hypothesis (X1). Nothing else open besides the C1 redeploy above.

See `ai-agents/reviews/s4-citizenship-xp-progress-ui-coder-handoff.md` for the original fix spec.
