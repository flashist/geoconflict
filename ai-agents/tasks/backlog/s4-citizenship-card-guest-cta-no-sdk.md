# Task — Citizenship Card: Login CTA Is a Dead Button Outside a Yandex Context

## Sprint
Sprint 4 — follow-up to `s4-citizenship-xp-progress-ui.md` (done)

## Priority
Low–Medium — not a crash, but a misleading dead control on the citizenship card. Confirmed today in local/standalone dev (cosmetic only, since production never serves `index.html` — see the HTML asymmetry below). The same state-collapse also affects real players in Yandex SDK degraded mode (SDK present but `YaGames.init()` times out) — same dead CTA, but likely rare; check `Session:PlatformInitTimeout` volume before treating as urgent. Deciding what degraded mode *should* look like everywhere is a separate, bigger question — tracked as `degraded-mode-full-ux-treatment.md` (Sprint backlog).

## Experiments
❌ Excluded — bugfix/UX correctness, ships to all players.

## Scope
`src/client/CitizenshipCard.ts` + `src/client/flashist/FlashistFacade.ts` only. No `src/core/` changes.

---

## Bug Description

The citizenship card's guest state (lock icon + "Войти в Яндекс" CTA) renders whenever `FlashistFacade.isYandexAuthorized()` returns `false` (`PlayerProfileView.ts:33-36` → `CitizenshipCard.ts:131`). That check only looks at `yandexSdkPlayerObject?.isAuthorized()` — it cannot distinguish:

- **(a) Standalone/local dev** — no Yandex SDK loaded at all. Confirmed: `src/client/index.html` never loads the SDK script tag and never sets `window.flashist_isYandexPlatform`, so `window.YaGames` is structurally guaranteed to be `undefined` there. Production only ever serves `yandex-games_iframe.html`, so this case is dev/test-only in practice.
- **(b) Real Yandex guest** — SDK loaded and initialized, player just isn't logged in. Correct case for today's CTA.
- **(c) Yandex degraded mode** — SDK present, but `YaGames.init()` timed out/failed inside `Bootstrap.ts`'s bounded 5s platform-init deadline.

In cases (a) and (c), tapping "Войти в Яндекс" calls `FlashistFacade.openYandexAuthDialog()` (`CitizenshipCard.ts:118`), which silently no-ops when `this.yandexGamesSDK` is unset (`FlashistFacade.ts:882-896`) — no error, no dialog, nothing happens. The button looks actionable but does nothing.

`FlashistFacade` already exposes a `yaGamesAvailable` field (`FlashistFacade.ts:299`, set at construction from `window.flashist_isYandexPlatform` / `typeof window.YaGames`) that correctly separates case (a) from (b)/(c) — today it's only consumed internally for `Player:YandexUnknown` vs `Player:YandexGuest` analytics (`FlashistFacade.ts:500-510`), never read by the card or by `openYandexAuthDialog()`.

## Expected Behaviour

- When `yaGamesAvailable` is `false` (no Yandex context at all): the card must not present a login-looking button that silently does nothing when tapped.
- When `yaGamesAvailable` is `true` but the player isn't authorized — whether a real logged-out guest (b) or a degraded-mode session (c) — keep today's CTA behavior as-is. (Distinguishing (b) from (c) and giving degraded-mode its own treatment is the separate backlog task.)

**Chosen treatment:** hide the CTA button in guest-state render when `yaGamesAvailable` is `false`; keep the lock icon and "Войдите, чтобы сохранить прогресс" / "Log in to save your progress" subtitle as-is. No new localization strings needed.

---

## Part A — Investigation (quick; most of it is already confirmed above)

1. Confirm `yaGamesAvailable` is genuinely fixed at construction time and doesn't need extra gating — does anything ever flip it after boot? If not, a simple boolean read is sufficient.
2. Confirm no other call site depends on `openYandexAuthDialog()` being safely tappable with no SDK present (i.e., hiding the CTA doesn't remove a needed fallback elsewhere).
3. Confirm whether `yaGamesAvailable` is already public on `FlashistFacade.instance`, or needs a thin public accessor for `CitizenshipCard` to read cleanly.

## Part B — Fix

1. Expose `yaGamesAvailable` (or a thin accessor) to `CitizenshipCard`.
2. In the guest-state render path, conditionally omit the login CTA when `yaGamesAvailable` is `false`. Lock icon + subtitle remain.
3. No change to the real-guest (b) or degraded-mode (c) path — CTA still renders and still calls `openYandexAuthDialog()` there, unchanged.

---

## Verification

1. **Local/standalone dev** (`npm run dev`, `index.html`): citizenship card guest state shows lock icon + subtitle, **no login button**.
2. **Yandex iframe dev/staging, logged out** (real guest, case b): login CTA still renders and functions exactly as before — confirm no regression.
3. **Simulated degraded mode** (stub/delay the SDK past the 5s deadline, per existing Playwright coverage from the bootstrap work): confirm the CTA still shows (unchanged — out of scope to suppress here) and still silently no-ops, matching current shipped behavior for this case.
4. No regression to `refreshProfile()` / State 1 → State 2/3 transition on successful login in the real-guest case.

---

## Notes

- Polish/correctness follow-up to the already-shipped `s4-citizenship-xp-progress-ui.md` — not new scope, no analytics changes.
- Out of scope: any change to degraded-mode (case c) UX — that's `degraded-mode-full-ux-treatment.md` (Sprint backlog), which should also revisit whether case (c) deserves its own card treatment instead of being lumped in with real guests.
- If implementing this reveals `Session:PlatformInitTimeout` fires more than expected in production, feed that back into the backlog task's priority — it currently has no dedicated sprint slot.
