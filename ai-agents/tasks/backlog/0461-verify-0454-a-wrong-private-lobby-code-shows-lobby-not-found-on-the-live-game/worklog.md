# Worklog — 0461

## 2026-10-20 — live check, by the agent in the owner's Chrome

Owner OK given live 2026-10-20 (`AskUserQuestion`, *"Browser checks (Recommended)"*). Game version **0.0.165**
(shown on the start screen). Made-up codes in the valid format, not real lobbies. No host, URL, domain or real lobby
code recorded.

| Check | Where | Result |
|---|---|---|
| 1. RU message | inside the Yandex Games page, Приватная → Присоединиться к лобби, made-up code | ✅ *"Лобби не найдено. Пожалуйста, проверьте правильность ID и попробуйте ещё раз."* — not *"Произошла ошибка…"* |
| 2. EN message | the game's own site, language switched to English (then back to Russian), made-up code via an old-style `#join=` link | ✅ *"Lobby not found. Please check the ID and try again."* |
| 3. Network | the game's own site (inside Yandex the game's frame requests are not visible to the browser tool) | ✅ only `/w<N>/api/game/<code>/exists` (expected, 200) besides the public-lobby list polling; **no** archive request `<api base>/game/<code>`, **no** `/commit.txt` |
| 4. Optional real-lobby join | — | not run (owner's call; not requested) |
| 5. No secrets | — | ✅ |

Note: the typed code is shown and sent in capitals — by design (task 0389: codes are capitals and digits only, typed in
any case, `cleanLobbyCode`).

**Result: pass.**
