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

## 2026-10-24 — step 5 re-check, by the agent in the owner's Chrome (agent-run — not owner-verified)

Owner asked live 2026-10-24 (relayed by `fkit-lead`): run the step-5 check in his Chrome and report whether the stuck
dot reproduces. Inside the Yandex Games page, desktop Chrome, Russian, the owner's own logged-in account, game
**0.0.165**. No URL or id recorded. Clicked only the start ad's close button, the bell, the window's tabs and its close
button.

| Action | Bell dot |
|---|---|
| Start screen loaded | lit |
| Opened the bell (Общие tab shown, entry A on top), closed it | **still lit** |
| Opened the bell, switched to **Личные**: newest item *«Добро пожаловать, Гражданин!»* (08.10.2026) carried a **НОВОЕ** badge, i.e. unread; closed the window | **gone** |

**Verdict: (a) — not a bug; step 5 passes.** The dot that stayed after closing the news window came from an unread
personal message, not from the news. Once the Личные tab was opened, the dot went away. That also shows the news
entries had been marked read, because the dot would have stayed if they were still unread. GIF and screenshots are
saved outside the repo (scratchpad only).

Side note, not part of this check: on the first load the citizenship card briefly showed *«Сейчас не удалось загрузить
ваш профиль…»* with a «Перезапустить» button. On a fresh load a minute later the profile showed normally. Not
investigated, nothing clicked.

**Result after this entry:** steps 1–3 pass; step 4 passes pending the owner's own glance (2026-10-20 row); step 5 passes
(agent-run, not owner-verified).

## 2026-10-24 — step 4 (Russian reads naturally), by `fkit-lead` (lead-run, not owner-verified)

Run by `fkit-lead` at the owner's own request, verbatim: *"Read it yourself and check it yourself"* (owner ruling
2026-10-24, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037). **Not** done by the owner.

**Verdict: pass.** The Russian reads naturally, with no typos and no stray English.

- Entry A («Гражданство уже в игре») was compared against the live screenshot from the 2026-10-24 Chrome run. The
  visible lines match `resources/announcements.json` word for word.
- Entry B («Обновление игры») was read from `resources/announcements.json` only — **not seen live**.

Non-blocking wording nits, kept for the record. No task was filed for them; the owner chose to close without fixing them:
- «дарится разовый бонус» is stiff; «получат» would read better.
- «рекламу между уровнями» matches the English "levels".
- «Перед выходом из матча кнопкой выхода» repeats "выход".
- «Багфиксы» is slang.
- «Своя Игра» with a capital И matches `ru.json` `single_player`.

The «Одиночная» / «Своя Игра» mismatch is the known residual `0468`, not a fail.

**Result after this entry:** steps 1, 2, 3 and 5 passed (see the earlier entries); step 4 passed (lead-run, not
owner-verified). All five steps pass.
