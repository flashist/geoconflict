# Task — Citizenship Core: XP Counter & Progress UI

## Sprint
Sprint 4

## Priority
High — the visible face of the entire citizenship system. Blocks nothing downstream but must ship alongside the player profile store.

## Dependencies
- **Start screen redesign** must be implemented — the citizenship card lives in the tab layout introduced by that task.
- **Analytics:** this task owns `UI:Tap:CitizenshipBuy` and `UI:Tap:CitizenshipLearnMore`. Read `analytics-p1-citizenship-funnel.md` before starting — events must be wired during implementation, not added later.
- **Player Profile Store** must be live — the card reads XP from the local guest profile or server profile.

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

Tapping the CTA triggers the Yandex SDK login flow. On successful login, the guest profile migration (Part F of Player Profile Store brief) runs, then the card re-renders into State 2 or State 3.

Note: guest XP still accumulates locally. The card communicates that progress won't persist without login — not that the feature is unavailable.

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
