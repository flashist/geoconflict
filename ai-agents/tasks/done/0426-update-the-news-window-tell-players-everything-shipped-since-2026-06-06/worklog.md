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

## 2026-10-16 — build (brief step 5) + verification 1, 3–5

- **Who/why:** `fkit-coder`, spawned as the **Build worker** of `fkit-sprint-ship-loop` (driver: `fkit-lead`), under
  the loop's declared-approval marker. Approved plan: `plan.md` in this folder, blob `d374c16` (owner approved via
  live `AskUserQuestion` in the `fkit lead` session, 2026-10-16). Not committed, not deployed.
- **Owner rulings 2026-10-16** (live `AskUserQuestion`, `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer
  precedent). Verbatim selections:
  - The weekend game prod deploy (2026-10-17/18) is the final Sprint 8 deploy: *"Yes, build 0426 now (Recommended)"*.
  - Q1 date: *"Saturday 2026-10-17 (Recommended)"* → `date` `2026-10-17`; ids `2026-10-17-citizenship`,
    `2026-10-17-game-update`.
  - Q2 flags: *"Yes, both still on (Recommended)"* → `citizenship_ui` and `private_lobbies_all` on for everyone
    (per the owner; this agent did not read the console). All approved lines stay.
  - Q3 `0454` ("Lobby not found" on a wrong code): *"Covered by \"Bugfixes\" (Recommended)"* → no text change.

### Verification 1 — timing check

Game prod is on tag `0.0.164` (`d798adb`, 2026-10-13 20:06 +0300; re-checked this turn). 20 commits on `dev` after it
(to `b5176f9`) ship in the weekend deploy. No change under `resources/` after `0.0.164`, no reverts (re-checked).

| Task | State | Where it is | Player-visible? |
|---|---|---|---|
| `0415` no native tooltips | ✅ Done | `0.0.163` (`bcc9bf0`, ancestor of `0.0.164`) | yes — entry B |
| `0423` dark thin scrollbar | ✅ Done | `0.0.163` | yes — entry B |
| `0437` exit confirm | ✅ Done | `0.0.164`, live since 2026-10-13 | yes — entry B |
| `0228` handleJoinLobby race | ✅ Done | `0.0.164` | minor — under "Bugfixes" |
| `0451` private-lobby analytics | ✅ Done | after `0.0.164` → weekend | no |
| `0454` "lobby not found" on a wrong code | ✅ Done | after `0.0.164` → weekend | yes, minor — "Bugfixes" (owner, Q3) |
| `0425` `0436` `0441` `0442` `0443` `0445` `0447` `0450` `0453` `0462` | ✅ Done | box / deploy / ops | no |
| `0350` name-change helper | ✅ Done | own profile deploy | no (operator) |
| `0384` Postgres by digest | ✅ Done | profile box | no |
| `0427` `0431` | ✅ Done | tests only | no |
| `0456` `0459` | ✅ Done | investigation / docs | no |
| `0428` / `0440` flag flip | ✅ Done 2026-10-13 | console, no deploy | enables the Private-tab line |

Open Sprint 8 rows (`0343`, `0418`, `0455`, `0385`, `0449`, `0452`, `0219`, `0213`) — none is a game-client build.
**Nothing blocks.** (Table from the approved plan, §1; the tag/commit/`resources` facts re-checked this turn, the
per-task states not re-read.)

### Re-check of the approved text against the release (plan §2)

Every bullet's feature is in `HEAD` and live for everyone (A1 100 XP / 1 XP per match; A2 buy; A3 ★, name change,
Personal tab; A4 no ads for paid citizens; A5 tenure gift ≤ 50 XP; A6 Private tab; B1 tabs / "Custom Game"; B2
troops "current / max"; B3 5M gold; B4 1-minute lobby; B5 refresh popup; B6 scrollbar + tooltips; B7 exit confirm;
B8 Bugfixes, now also covering `0454`). No bullet removed, no wording changed. Source: plan §2 (code references
there); not re-derived in this build.

### Build (brief step 5)

- `resources/announcements.json`: one insertion after the opening `[` — entry A (`2026-10-17-citizenship`, tag
  `new`), then entry B (`2026-10-17-game-update`, tag `update`), then the old content untouched. 26 lines added,
  nothing else changed. Literal Cyrillic / «» / — / ★; only `\"` escapes; no trailing newline (as before).
- Pre-check passed first: file unchanged since `96a21c7`, 9 entries, top id `2026-06-06-game-update`, no
  `2026-10-17` id.
- No other repo file edited (no `resources/lang/*`, no `src/`).

### Verification 3 — schema + byte + text check: ✅ PASS

Throwaway Node script (scratchpad, not the repo). Entries were typed by hand; the script takes the expected text
independently from the 2026-10-12 section of this worklog (`<DATE>` = `2026-10-17`).
- 11 entries; `[0].id` `2026-10-17-citizenship`, `[1].id` `2026-10-17-game-update`; all ids unique; every `date`
  `YYYY-MM-DD`; every title/body en+ru a non-empty string; tags valid; key order `id, date, title, body, tag`.
- No `<`, `>`, `**`, `#`, `](` in the new strings; no `\u` escapes in the new block.
- **Byte check:** the whole file equals `"[\n" + A + ",\n" + B + ",\n" + HEAD-file.slice(2)` → older entries
  byte-identical (6932 bytes compared; new file 13978 bytes).
- **Text check:** every title/body (A: 6 bullets en/ru, B: 8 bullets en/ru) equals the approved text, character
  for character.

### Verification 4 — tests: ✅ PASS

- Targeted: `npm test -- tests/client/Announcements.test.ts tests/client/NoGameNameInPlayerText.test.ts` → 2 suites,
  19 tests passed. Caveat (as planned): `Announcements.test.ts` uses in-file fixtures, so it proves the helpers, not
  the new content; `NoGameNameInPlayerText` reads the real file (no game name in the news).
- Full `npm test` (through npm; project lock taken with no wait; 1 worker): **228/228 suites, 4757/4757 tests
  passed, 0 skipped, 196 s, exit 0** — first run, no re-run. Shell harnesses suite passed.

### Verification 5 — local look, en + ru: ✅ PASS (standalone template only)

- ⚠️ Deviation from the plan's command: ran the two halves of `npm run dev` directly
  (`webpack serve --no-open --node-env development` + `npm run start:server-dev`, `GAME_ENV=dev`) — `npm run dev`'s
  `--open` would have opened a tab in the owner's own browser. Same build, same server.
- Browser: Playwright, `http://localhost:9000` (standalone `index.html`). Set
  `geoconflict.announcements.lastSeenId` = `2026-06-06-game-update`, reloaded → bell dot on.
- Opened the bell (en): A first, "New" badge, `2026-10-17`; B second, "Update" badge, `2026-10-17`; bullet line
  breaks render; older entries follow. Opening set `lastSeenId` to `2026-10-17-citizenship` and the dot went off;
  still off after closing.
- Switched to ru (via the language selector's own `changeLanguage`, called from the page): A «Гражданство уже в
  игре» / «Новое», B «Обновление игры» / «Обновление», both `2026-10-17`; all 11 entries listed in order; text
  matches.
- Screenshots: scratchpad only (`v5-1-news-en.png`, `v5-2-after-ru-switch.png`, `v5-3-news-ru-entryB.png`), not in
  the repo.
- Console: only pre-existing noise (`/flags/*.svg` 404s — intentional; "No yandexGamesSDK" — expected outside
  Yandex). No announcement warnings.
- Dev server stopped afterwards (ports 9000 / 3000 free, no leftover processes).
- **Not checked:** the Yandex iframe template / live Russian-in-Yandex look — that is brief step 6, a separate verify
  task filed at close.

### Still to do (not this worker)

- Review (driver asks `fkit-reviewer`), close (producer), deploy 2026-10-17.
- ⚠️ **The owner must commit this change before running `build-deploy.sh prod`**, or the news is missing from the
  release tag. Nothing here is committed.
- If the deploy slips to Sunday 2026-10-18: `date` and both ids may still be changed before that commit.

## Decision log

- 2026-10-11 → 2026-10-12: none (no fixes; drafting only).
- 2026-10-16 (build): none — no fix applied without asking, no obvious-winner call. Built exactly the approved plan.
  One execution detail recorded above, not a decision on scope: V5 dev server started with `--no-open`.
- 2026-10-16 (review round 1, process-review worker, spawned by `fkit-sprint-ship-loop`): **none** — no fix applied
  without asking, no obvious-winner call, no file outside the ledger and this worklog edited.
  - R1 ("Custom Game" news bullet vs the window heading still "Single Player" / «Одиночная игра»): verified
    CORRECT, coder severity low; disposition **owner ruling 2026-10-16** (live `AskUserQuestion`, `fkit lead`
    session, relayed by `fkit-lead`), verbatim "Keep text + file a fix task (Recommended)" → `won't fix
    (frontier)`, `resources/announcements.json` unchanged, accepted residual recorded in `review.md`; follow-up
    Backlog task filed by a producer: `0468`. Ledger set to `closed-out`. No code change → no test
    re-run.
