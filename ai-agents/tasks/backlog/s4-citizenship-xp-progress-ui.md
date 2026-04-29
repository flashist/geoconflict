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
| Avatar/flag | Player's flag cosmetic (or default flag if none) |
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
| Avatar/flag | Player's flag cosmetic |
| Badge | "ГРАЖДАНИН" / "CITIZEN" label |
| Username | `profile.display_name` or Yandex platform name |
| XP value | Continues showing accumulated XP (no cap — XP accumulates past citizenship) |
| Progress bar | Full (or replaced with a "complete" visual if design prefers) |

Paid citizens (`profile.is_paid_citizen === true`) show the same State 3 — no visual distinction between earned and paid citizenship in Sprint 4.

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

## Notes

- The card must not make any blocking network calls — it reads from the already-loaded profile state. Profile loading happens earlier in the startup sequence.
- The "Buy Citizenship" paid CTA (if catalog item is available) is implemented in the Citizenship Paid brief, not here. This task only covers the progress/status display.
