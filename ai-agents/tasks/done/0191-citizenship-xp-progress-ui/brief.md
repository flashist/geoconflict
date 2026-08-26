# Task — Citizenship Core: XP Counter & Progress UI

## ID
0191

## Sprint
Sprint 4

## Priority
High — the visible face of the entire citizenship system. Blocks nothing downstream but must ship alongside the player profile store.

## Status
✅ Done

## Owner
fkit-coder

---

## Current State (2026-07-01) — card shipped; only data-wiring remains

The card component and its three states are **already built and live** (behind the `citizenship_ui`
Yandex experiment flag):

- `src/client/CitizenshipCard.ts` — mounted `<citizenship-card>` in both `src/client/index.html`
  and `src/client/yandex-games_iframe.html`, imported in `Main.ts`; guest / logged-in render
  states; the `CITIZENSHIP_SURFACE_SEEN` analytics event; a login CTA that already re-fetches on
  successful auth (`refreshProfile()` after `openYandexAuthDialog()`).
- `src/core/profile/Citizenship.ts` — shared `CITIZENSHIP_XP_THRESHOLD = 1000`, `XP_PER_MATCH = 10`.
- Server-side earned-citizenship grant is **already done** in
  `PlayerProfileRepository.creditMatchXp()` (flips `is_citizen` + stamps `citizenship_earned_at`
  at threshold). **No server work in this task.**

**The one remaining piece — the keystone** — is that the client never actually reads the profile:
`src/client/PlayerProfileView.ts` → `loadPlayerProfileView()` is a stub that returns
`{ displayName, xp: 0, isCitizen: false }` for authorized players. Replace that stub body with a
real profile read and the already-built card lights up with real XP + earned-citizen state. The
**"What to Build"** design spec below documents the card as originally scoped and is kept as
reference; the actionable work now is the profile-read wiring in **Remaining Work** below.

### Remaining Work — wire the client profile read

Replace the body of `loadPlayerProfileView()` in `src/client/PlayerProfileView.ts`:

1. **Unauthorized → return `null`** (unchanged — `null` is what makes the card render the guest state).
2. **Authorized → fetch and return a populated `PlayerProfileView`.**

**Endpoint (already implemented server-side, live on `api.geoconflict.ru`):**

```
GET {profileApiUrl}/v1/profile?yandexPlayerId={id}
  200 → public profile JSON (projection below)
  404 → no row yet (new authorized player) — treat as zero-state, NOT an error
  400 → bad/missing id       429 → rate-limited (60/min per IP)
```

- **`profileApiUrl`** comes from `/api/env` (served by `src/server/Master.ts:171`, field already
  present). No client accessor exists yet — add a minimal one. **Do NOT reuse `getApiBase()` /
  `fetchPlayerById()` from `jwt.ts`** — those hit the *game* API (`/users/@me`, `/player/{id}`), a
  different backend, not the profile server.
- **`yandexPlayerId`** = `FlashistFacade.instance.getYandexUniqueId()` — the T3 accessor used in
  `Main.ts:703` / `Transport.ts:412`; returns `null` for guests/degraded.

**Parse the public projection, not the full schema.** `GET /v1/profile` omits `is_paid_citizen`,
`citizenship_purchased_at`, and `persistent_id` (see `toPublicProfile()` in `Routes.ts`), so the
full `PlayerProfileSchema` would fail to parse. Add a shared `PublicPlayerProfileSchema` / type in
`src/core/profile/` (`.omit({ is_paid_citizen: true, citizenship_purchased_at: true, persistent_id: true })`)
and use it on **both** the server return type and this client parse — one source of truth, no drift.

**Map to the view model:** `displayName = profile.display_name ?? (await getCurPlayerName())`,
`xp = profile.xp`, `isCitizen = profile.is_citizen`.

**Failure / degraded handling (get the null contract right):** for an **authorized** player a
failed read must still return a logged-in view, never `null` — returning `null` misrenders a
logged-in player (or a citizen) as a guest with a login CTA:

- `404` → `{ displayName, xp: 0, isCitizen: false }`
- network error / timeout / non-200 → logged-in zero-state
- `profileApiUrl` empty/unset → skip the fetch, return the zero-state view (do not throw)
- bound the fetch with a short timeout so a slow/unreachable profile API never hangs the card
  (matches the `Bootstrap.ts` degraded-mode philosophy).

**Out of scope (deferred per Mark 2026-07-01 "keystone only"):** the earned-citizenship inbox
notification + real-time in-session grant toast (Part B/C of `0017-citizenship-earned`) — those
need a `newlyGranted` signal from `creditMatchXp()` and 8d-B Personal Inbox, tracked separately.

## Dependencies
- **Start screen redesign** must be implemented — the citizenship card lives in the tab layout introduced by that task.
- **Analytics:** this task owns `UI:Tap:CitizenshipBuy` and `UI:Tap:CitizenshipLearnMore`. Read `0021-analytics-p1-citizenship-funnel` before starting — events must be wired during implementation, not added later.
- **Player Profile Store** must be live — the card reads XP from the **server** profile via `GET /v1/profile`. (Guest-first localStorage XP was cancelled 2026-06-13; XP is authenticated-only. The profile store is now live, so this dependency is satisfied.)

## Context

The start screen redesign introduces a two-tab layout. The top of both tabs shows a citizenship card whose content depends on authorization state. This task implements that card component and its three states.

Design reference: Claude Design prototypes reviewed 2026-04-22 (Images #2–#5 from session).

---

## What to Build

### Citizenship card component

A single LitElement `@customElement` component, following the existing modal pattern (`GameStartingModal.ts` as canonical reference). The component reads the player's profile on mount and renders one of three states.

---

### State 1 — Guest (not Yandex-authorized)

Shown when `FlashistFacade.isYandexAuthorized()` returns `false`.

| Element | Content |
|---|---|
| Icon | Lock icon (left) |
| Title | "Гражданство" / "Citizenship" |
| Subtitle | "Войдите, чтобы сохранить прогресс" / "Log in to save your progress" |
| CTA button | "Войти в Яндекс" / "Log in with Yandex" |

Tapping the CTA triggers the Yandex SDK login flow. On successful login, the card re-fetches the profile (`refreshProfile()`) and re-renders into State 2 or State 3. (There is **no** guest→authenticated migration — that path, T2/T7, was cancelled 2026-06-13; profile XP is authenticated-only.)

Note: XP is earned only while authenticated (no local guest accumulation). The card's guest state communicates "log in to save your progress" — not that the feature is unavailable.

---

### State 2 — Authorized, not yet a citizen

Shown when authorized AND `profile.is_citizen === false`.

| Element | Content |
|---|---|
| Avatar/flag | Player's flag cosmetic (a **non-country** flag — see *Flag policy*); defaults to the neutral `🏳️` emoji when none is set. |
| Badge | None (no citizen badge) |
| Username | `profile.display_name` or Yandex platform name |
| XP label | "XP" (top-right) |
| XP value | `{profile.xp} / 1,000` |
| Progress bar | Filled proportionally: `profile.xp / 1000` (capped at 100%) |

The progress bar should be visually distinct from the full/complete state so players clearly see they are still progressing.

---

### State 3 — Citizen (earned or paid)

Shown when `profile.is_citizen === true`.

| Element | Content |
|---|---|
| Avatar/flag | Player's flag cosmetic (a **non-country** flag — see *Flag policy*); defaults to the neutral `🏳️` emoji when none is set. |
| Badge | "ГРАЖДАНИН" / "CITIZEN" label |
| Username | `profile.display_name` or Yandex platform name |
| XP value | Continues showing accumulated XP (no cap — XP accumulates past citizenship) |
| Progress bar | Full (or replaced with a "complete" visual if design prefers) |

Paid citizens (`profile.is_paid_citizen === true`) show the same State 3 — no visual distinction between earned and paid citizenship in Sprint 4.

---

## Flag policy — no real-country flags

Flags are a **planned paid cosmetic** (one of the few monetization surfaces), so the Avatar/flag slot is designed to render the **player's chosen flag**, defaulting to the neutral `🏳️` emoji when the player has none.

**Hard constraint:** the sellable flag set must contain **only non-country designs — never a real country's flag or name.** Yandex Games enforces a strict policy on real-country flags/names, and shipping them risks moderation problems. This is enforced at the **catalog/asset level** (only original, non-country flags are ever offered), so the card simply renders whatever flag the player owns and therefore never surfaces a country flag.

**Current interim state (until the paid-flag feature ships).** The flag system is not live yet, and the **legacy country-flag asset set is deliberately not served** — commit `895368d` renamed `resources/flags/` → `resources/flags_source/`, so `/flags/*.svg` 404s, and the legacy flag picker (`<flag-input>`) is `display:none` in the Yandex build. So today the card shows the `🏳️` fallback for everyone, which is expected. **Do not "fix" the `/flags` path to resurface that legacy (country-flag) asset set** — the paid-flag cosmetic will ship with its own non-country asset set and serving path.

**Defensive rendering:** wherever a flag is shown via `<img>`, include an `onerror` fallback to `🏳️` (mirror `FlagInput.ts:108-112`) so a missing / not-yet-served / legacy asset never surfaces a broken-image glyph.

Background: `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` §3.4 and `s4-preexisting-infra-impact-2026-06-24.md` §3.4.

> Out of scope: the language-selector flag (`LangSelector.ts`) is a separate pre-existing surface also affected by the rename; its direction (suppress vs restore) is a pending owner decision, not part of this task.

---

## Localization

All strings must use `translateText()`. Add to both `en.json` and `ru.json`:

```json
"citizenship_card": {
  "title": "Citizenship",
  "guest_subtitle": "Log in to save your progress",
  "login_cta": "Log in with Yandex",
  "xp_label": "XP",
  "citizen_badge": "CITIZEN"
}
```

Russian (`ru.json`):
```json
"citizenship_card": {
  "title": "Гражданство",
  "guest_subtitle": "Войдите, чтобы сохранить прогресс",
  "login_cta": "Войти в Яндекс",
  "xp_label": "XP",
  "citizen_badge": "ГРАЖДАНИН"
}
```

---

## Analytics

Add to `ai-agents/knowledge-base/analytics-event-reference.md`:
- `UI:Tap:CitizenLoginCta` — fires when guest taps "Войти в Яндекс" on the citizenship card

---

## Verification

1. **Guest state:** open the game without Yandex authorization. Confirm lock icon, subtitle, and login CTA render. Confirm tapping CTA triggers Yandex login.
2. **Authorized, not citizen:** log in with a fresh account (0 XP). Confirm XP bar shows `0 / 1,000`. Play a qualifying match. Confirm bar updates to `10 / 1,000`.
3. **Citizen state:** use a test account with `is_citizen = true`. Confirm ГРАЖДАНИН badge renders and bar is full.
4. **XP past citizenship:** verify that XP continues incrementing in State 3 (bar stays full or shows ongoing value — per design).
5. **Login flow transition:** start as guest, tap login CTA, complete Yandex auth. Confirm card transitions from State 1 to correct state without page reload.
6. **Flag slot:** with no flag set (the current default), confirm the slot shows the neutral `🏳️` placeholder in States 2 and 3. When a flag cosmetic is present, confirm it renders the player's flag and that a missing/unserved asset falls back to `🏳️` (no broken-image glyph). The sellable flag set must never include a real country's flag (see *Flag policy*).

## Notes

- The card must not make any blocking network calls — it reads from the already-loaded profile state. Profile loading happens earlier in the startup sequence.
- The "Buy Citizenship" paid CTA (if catalog item is available) is implemented in the Citizenship Paid brief, not here. This task only covers the progress/status display.
