# 0426 — news window text — ✅ FINAL, APPROVED BY THE OWNER 2026-10-12 (see worklog.md)

> Approved text below is final. Conditional markers removed on the owner's ruling (no "if logic"; one deploy;
> risk accepted). Not yet written to `resources/announcements.json` — that happens on deploy day with `<DATE>` set.

Drafted 2026-10-11 by `fkit-coder` (spawned by `fkit-lead`), on the owner's choice (2026-10-11, live
`AskUserQuestion` in the `fkit lead` session): draft now while Yandex.Games infrastructure is down.
`resources/announcements.json` is **untouched**. The timing rule is relaxed for drafting only: the entry
still must not ship ahead of any feature it names.

Proposed split: **two entries** (one would be ~13 bullets). Order in the file: A on top, then B.
`<DATE>` = final Sprint 8 deploy date, set on deploy day.

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

## Included — one line each (source)

| Change | Entry | Why it is in |
|---|---|---|
| Citizenship card, earn 100 XP at 1 XP/match (`0017`, `0191`, `0211`; `Citizenship.ts`: threshold 100, 1 XP/match) | A | Headline feature; live since `0.0.154`, `citizenship_ui` on for all |
| Paid citizenship (`0018`, `0065`, `0301`) | A | Live, flag on |
| ★ badge + name change with moderator review, reply in Personal tab (`0068`, `0067`, `0012`, `0322`) | A | Visible citizen perks |
| No ads between levels for paid citizens (`0248`) | A | Visible perk; wording = the explainer popup's own line |
| One-time tenure gift up to 50 XP (`0253`; cap 50, min 3 days) | A | Players see a gift popup |
| Private lobbies tab (`0302`, `0412`, `0380`/`0382`, `0389`, `0413`) | A | Owner ruling 2026-10-12: kept unconditionally; `0428` expected to flip the flag before the deploy, risk accepted |
| Start screen tabs + rename to «Своя Игра» (`0166`) | B | Big visible change, no flag |
| Map labels troops/max + attacking troops (`0041`) | B | Visible in every match |
| 5M starting gold modifier (`0042`) | B | New public modifier, active in `MapPlaylist.ts` |
| Lobby wait 2 min → 1 min (`0367`) | B | Visible; `DefaultConfig.ts` returns 60 s |
| ~24 h refresh popup (`0404`) | B | Players see it; explains why |
| Dark scrollbar, no native tooltips (`0423`, `0415`) | B | In `0.0.163` (confirmed ancestor of the deploy commit) |
| Exit-confirm popup (`0437`) | B | Owner ruling 2026-10-12: kept unconditionally; planned for the same deploy, risk accepted |
| Bugfixes line: degraded mode when Yandex is slow (`0049`, `0330`), map loading on join (`0035`), rejoin after failed start (`0347`), private-lobby close/start fixes (`0327`, `0333`, `0416`), citizenship card fixes | B | Minor visible fixes collapse into one line, per brief |

## Excluded — one line each

| Change | Why out |
|---|---|
| Mini-maps back in public rotation | Not true: still disabled (`MapPlaylist.ts`), the 06-06 entry's "for now" still stands |
| Background music removed (`0066`) | Licensing removal; owner ruled 2026-10-12 "Don't mention it" |
| Feedback form email field removed (`0046`) | Legal cleanup, players don't miss it |
| Game name removed from texts (`0311`) | Internal/policy |
| FFA timer win award (`0206`) | Behaviour later found wrong/no-op; current state unclear — not described |
| Session "verified" status line, restart-to-apply popup, explainer layout tweaks (`0397`, `0303`, `0407`–`0409`, `0417`, `0421`) | Detail inside the citizenship card — covered by entry A |
| Login/identity, profile server, backups, telemetry, alerts, deploy tooling, security, tests (`0170`–`0298`, `0325`/`0340`, `0355`… etc.) | Not player-visible |
| Tester roles (`0425`), backup harness (`0436`), profile ops (`0219`) | Operator tools |
| `0343` parked ideas, map packs, replays | Not built — never promise |
| Tenure-popup / lobby-race fixes (`0336`, `0228`, `0374`, `0377`) | Folded into "bugfixes" |

## Flags used (source)

- `citizenship_ui` = enabled for everyone — owner's Yandex console screenshot, 2026-10-10 (relayed by `fkit-lead`, not read by me).
- `private_lobbies_all` = **not on** as of 2026-10-10 (same source); expected on via `0428` before the deploy — owner accepted the risk (2026-10-12).
