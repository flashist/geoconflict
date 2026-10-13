# 0426 — worklog

## 2026-10-11 — draft only (steps 1–3), approval gate open

- **Who/why:** `fkit-coder`, spawned by `fkit-lead`. Owner's choice 2026-10-11 (live `AskUserQuestion`, `fkit lead`
  session, option "0426 news window text"): *"I draft the list of shipped features in plain Russian for you to edit."*
  Timing rule relaxed **for drafting only**; the entry still must not ship ahead of any feature it names.
- **Not done:** `resources/announcements.json` NOT edited (step 5 waits for the owner's approval). No tests, no dev
  server (another coder is running the suite for `0437`). No commit.
- **Timing check (brief verification 1), as of 2026-10-11:** Sprint 8 open rows — `0437` (exit confirm, player-visible,
  🔄 in progress → conditional line), `0428` (flag flip, waiting on Yandex infra → conditional line), `0436` / `0219`
  (operator/backup, not player-visible), `0343` (discussion), `0418` (analytics re-check). `0415` and `0423` are done and
  in `0.0.163` (`bcc9bf0` is an ancestor of deploy commit `c3e545a`).
- **Sources read:** `git log 96a21c7..HEAD` (509 commits, mostly "Sprint push" — subjects carry little), prod deploy
  commits `0.0.137`–`0.0.163`, done task titles, and code checks: `Citizenship.ts` (100 XP, 1 XP/match, tenure cap 50,
  min 3 days), `MapPlaylist.ts` (mini-maps still off; 5M gold modifier on), `DefaultConfig.ts` (lobby 60 s),
  `PrivateLobbyAccess.ts` (Create = citizens, Join = everyone, row hidden unless tester or `private_lobbies_all`),
  `SoundManager.ts` (music removed), `ru.json`/`en.json` labels.
- **Flags used:** `citizenship_ui` on for everyone; `private_lobbies_all` off — both from the owner's console screenshot
  2026-10-10, relayed by `fkit-lead` (not read by me; only the owner can read the console).
- **Draft:** `draft.md` (two entries, two conditional lines, include/exclude lists).

## 2026-10-12 — ✅ OWNER APPROVAL (brief step 4 gate passed)

- **Channel:** live `AskUserQuestion` in the `fkit lead` session, 2026-10-12, relayed by `fkit-lead` to this
  `fkit-coder` spawn. Owner's answers, verbatim:
  - Split: *"Two items (Recommended)"* — A citizenship on top, then B game update.
  - Conditionals: *"Don't do any "if logic", we plan to deploy everything in 1 deploy, so just add this text to the
    announcements. If something happens that prevents private lobbies and/or the exit popup to be delivered, the risks
    are low (it's just a text in the announcements), this risk is acceptable"* → both former conditional lines are
    normal lines (private lobbies in A, exit confirm in B).
  - Lobby wait: *"1 minute stays, keep line (Recommended)"*.
  - Music: *"Don't mention it (Recommended)"*.
  - Wording: *"Russian text is OK (Recommended)"* — option text: *"The coder writes it into the news file as drafted,
    with your 4 answers applied, and the date on deploy day."* en mirrors ru as drafted.
- ⚠️ **Accepted deviation from the brief's Timing rule** ("never ship ahead of a feature it mentions"): the owner
  knowingly accepted that the private-lobbies and exit-confirm lines may ship even if `0428` / `0437` slip.
- **Flag values used:** `citizenship_ui` = on for everyone (owner's Yandex console screenshot, 2026-10-10);
  `private_lobbies_all` = off on 2026-10-10, expected on via `0428` before the deploy — owner accepted the risk.
- **Final approved text** (also in `draft.md`; `<DATE>` = deploy day):

## Entry A — citizenship (tag `new`)

- `id`: `<DATE>-citizenship`
- `title.ru`: Гражданство уже в игре
- `title.en`: Citizenship is here

`body.ru`:

- На стартовом экране появилась карточка «Гражданство». Войдите в Яндекс и копите XP: 1 XP за каждый матч в мультиплеере, а на 100 XP гражданство выдаётся бесплатно.
- Гражданство можно и купить — в карточке или в окне «Что такое гражданство?».
- Граждане получают значок ★ рядом с именем в матчах и могут сменить имя. Новое имя проверяет модератор, ответ приходит во вкладку «Личные» этого окна.
- Платное гражданство вдобавок убирает рекламу между уровнями.
- Тем, кто играет с нами давно, после входа дарится разовый бонус — до 50 XP.
- Новая вкладка «Приватная»: граждане создают приватные лобби и зовут друзей по коду или ссылке-приглашению, а присоединиться может любой игрок.

`body.en`:

- A Citizenship card is now on the start screen. Log in with Yandex to earn XP: 1 XP for every multiplayer match, and at 100 XP you become a citizen for free.
- You can also buy citizenship — from the card or from the "What is citizenship?" window.
- Citizens get a ★ badge next to their name in matches and can change their name. A moderator reviews the new name, and the answer arrives in the Personal tab of this window.
- Paid citizenship also removes the ads between levels.
- Players who have been with us for a while get a one-time gift of up to 50 XP after logging in.
- A new Private tab: citizens can create private lobbies and invite friends with a code or an invite link, and any player can join.

## Entry B — game update (tag `update`)

- `id`: `<DATE>-game-update`
- `title.ru`: Обновление игры
- `title.en`: Game update

`body.ru`:

- Стартовый экран обновлён: режимы разложены по вкладкам «Мультиплеер» и «Одиночная», а «Одиночная игра» теперь называется «Своя Игра».
- На карте у страны теперь видно войска в виде «сейчас / максимум», а войска в атаке — отдельной красной строкой.
- В публичных матчах появился новый случайный модификатор — 5 миллионов золота на старте.
- Ожидание в публичном лобби сократилось с 2 минут до 1 минуты.
- Если игра открыта около суток, на стартовом экране появится просьба обновить страницу — прогресс при этом сохраняется.
- Окна игры получили тёмную тонкую полосу прокрутки, а лишние всплывающие подсказки браузера убраны.
- Перед выходом из матча кнопкой выхода игра теперь спрашивает подтверждение.
- Багфиксы и улучшения стабильности: игра надёжнее загружается и подключается к матчам, в том числе когда сервисы Яндекса отвечают медленно.

`body.en`:

- The start screen is redesigned: modes are split into Multiplayer and Singleplayer tabs, and "Single Player" is now called "Custom Game".
- Country labels on the map now show troops as "current / max", with attacking troops on a separate red line.
- Public matches have a new random modifier — 5 million starting gold.
- The public lobby wait is now 1 minute instead of 2.
- If the game has been open for about a day, the start screen asks you to refresh the page — your progress is kept.
- Game windows now have a thin dark scrollbar, and stray browser tooltips are gone.
- The game now asks for confirmation before you leave a match with the exit button.
- Bugfixes and stability improvements: the game loads and joins matches more reliably, including when Yandex services are slow.

- **Next step (not done yet):** on deploy day, set `<DATE>` in both ids and `date`, prepend A then B to
  `resources/announcements.json` character-for-character as above (brief step 5), then brief verification 3–5
  (schema check, the two named tests + full `npm test`, local look en/ru), all in the same final Sprint 8 deploy.
  `resources/announcements.json` is still untouched.

## 2026-10-13 — flag values from `0428` / `0440` (step 6 of `0428`)

- **Recorded by** a spawned `fkit-coder` (no owner channel), from the owner's results relayed by `fkit-lead`. Not read
  in the console by the recording agent.
- **`private_lobbies_all` = `enabled` for everyone (no condition) since about 17:09–17:12 MSK, 2026-10-13** — the
  owner flipped it in the Yandex Games console (`0428`); owner confirmed the after-values live (*"Yes, exactly as
  expected"*) and that the live checks were *"all good"*.
- **`citizenship_ui` = `enabled` for everyone (no condition)** — unchanged, confirmed the same day.
- So the draft's **Private tab** line may stay **if the flag is still on at this task's deploy** — the owner confirms
  that at the approval gate. Replaces the 2026-10-10 screenshot values above (`private_lobbies_all` off). The
  **exit-confirm** line is unaffected by this (it turns on `0437` shipping in the same deploy).
- See [`0428`'s worklog](../../done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/worklog.md).

## Decision log

- none (no fixes; drafting only).
