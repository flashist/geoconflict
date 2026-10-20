# Worklog — 0469

## 2026-10-20 — live check, by the agent in the owner's Chrome

Owner OK given live 2026-10-20 (`AskUserQuestion`, *"Browser checks (Recommended)"*). Inside the Yandex Games page,
desktop Chrome, Russian, logged in with the owner's own Yandex account (a returning browser). No URL or id recorded.

| Step | Result |
|---|---|
| 1. Release check | ✅ the game shows **0.0.165**; `git tag --contains 8c448a9` (the `0426` commit) lists `0.0.165`. Deployed 2026-10-16 (mid-week, owner ruling). |
| 2. Bell dot | ✅ the unread dot shows on the bell |
| 3. Entries render | ✅ entry A *«Гражданство уже в игре»* first, badge **НОВОЕ**; entry B *«Обновление игры»* second, badge **ОБНОВЛЕНИЕ**; both dated **2026-10-17** (the shipped date is 2026-10-16 — the known gap, fixed by `0470`); titles correct; bullet line breaks readable; older entries follow (2026-06-06 first). |
| 4. Russian reads naturally | ✅ read by the agent: natural, no typos, no leftover English. ⚠️ The brief asks the **owner** to confirm this — owner to glance. |
| 5. Dot clears | ⚠️ **not cleared** — the dot stayed after closing the window. Cause not proven: the bell dot is *news unread* **or** *personal inbox unread* (`NewsButton.ts` `refreshUnreadState`), and this account may have unread personal messages (the Личные tab was **not** opened, so the owner's personal messages were not marked read). To tell them apart: the owner opens Личные once, closes, and checks the dot — or the check runs on an account with no personal messages. |

**Result:** steps 1–3 pass; 4 passes pending the owner's glance; **5 open** (see above).
