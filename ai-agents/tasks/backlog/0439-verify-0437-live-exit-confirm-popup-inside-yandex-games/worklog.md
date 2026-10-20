# Worklog — 0439

## 2026-10-20 — desktop pass, by the agent in the owner's Chrome

Owner OK given live 2026-10-20 (`AskUserQuestion`, *"Browser checks (Recommended)"*). Inside the Yandex Games page,
**desktop** Chrome, Russian, the owner's own Yandex account (a **paid** citizen — no interstitial ads by design, `0248`).
Game **0.0.165** (carries `0437`; the 0.0.165 news lists the exit confirm). Matches: two single-player "Своя Игра" games.

| Check | Desktop | Phone |
|---|---|---|
| 1. Exit button → popup | ✅ *«Вы уверены, что хотите выйти из игры?»*, buttons **Выйти** / **Остаться**, both fully on screen, still in the match | not run |
| 2. Closing without leaving | ✅ Остаться, **Escape**, and a click outside — each closes the popup, still in the match | not run |
| 3. Settings → Exit → popup over Settings | ✅ popup over the Settings window; Остаться closed only the popup | not run |
| 4. Выйти → ad → start screen | ✅ **no-ad path only**: Выйти from the Settings popup (match 1) and from the in-match exit button (match 2) → start screen; **no ad shown either time** (paid account) | not run |
| 5. Stuck after Выйти? | ✅ never stuck (one agent click missed the button after the page layout shifted — the popup stayed open, the next click on the button worked; not a game fault) | not run |

**Result:** desktop passes for the popup and the **no-ad** path. **Not covered:** the ad path (needs a non-paid
account where Yandex serves an interstitial) and every phone check — owner's.
