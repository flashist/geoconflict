# 0311 — Remove the game name from player-facing texts: plan

**Summary**
- Plan only. No files written, no status changes.
- **In-game texts: 3 keys in `en.json` and 3 in `ru.json`** carry the name. Only 2 of them are in-game copy. The third is `main.title`, which is the page title.
- **Page title: `main.title` in 29 more lang files.** 26 say "Geoconflict (…)". **3 (`ar`, `ko`, `tp`) say the upstream name "OpenFront".** The brief missed those 3.
- Also carrying the name: 2 HTML `<title>` tags and `manifest.json` `name`/`short_name`.
- **No hardcoded player-facing name anywhere in `src/`.** The other `src/` hits are localStorage keys, metric and service names, the domain, and operator alerts. All excluded.
- Uncommitted work from 0250 S1, 0303 and 0314 is clean. Three name-guard tests already exist, scoped to single sections: `NameChangeLang`, `PrivateLobbyLang`, `CitizenshipRestartLang`.
- **Client-only change.** No profile-server change, no DB change, no migration.
- **Already-sent citizenship messages will change too.** They are template-rendered at view time (confirmed in `InboxContract.ts`). The owner needs to confirm this (Q1).
- 4 owner decisions. Step 0 of the brief forbids any edit before the wording is approved.

---

### 1. Inventory: every place a player can see the name (current tree, 2026-09-28)

**A. In-game texts (in scope for sure)**

| # | File:line | Key | Today |
|---|---|---|---|
| A1 | `resources/lang/en.json:109` | `inbox.templates.citizenship_earned.title` | You've earned Geoconflict Citizenship! |
| A2 | `resources/lang/ru.json:113` | same | Вы получили гражданство Geoconflict! |
| A3 | `resources/lang/en.json:88` | `citizenship_tenure_grant.body` | Thank you for playing Geoconflict! As a thank-you … |
| A4 | `resources/lang/ru.json:92` | same | Спасибо, что играете в Geoconflict! В благодарность … |

These keys exist only in en and ru. Every other language falls back to en (`LangSelector.translateText` :273-285; `Utils.translateText`).

**B. Page title, header text and install name (in scope only if Q2 = yes)**

| # | File:line | What | Today |
|---|---|---|---|
| B1 | `resources/lang/en.json:28` | `main.title` | Geoconflict (ALPHA) |
| B2 | `resources/lang/ru.json:27` | `main.title` | Геоконфликт |
| B3 | 26 lang files, `main.title`: `bg:12 bn:9 cs:9 da:12 de:12 eo:12 es:9 fi:12 fr:12 gl:12 he:12 hi:9 hu:12 it:9 ja:12 mk:12 nl:12 pl:12 pt-PT:12 sh:9 sk:12 sl:12 sv-SE:12 tr:12 uk:12 zh-CN:12` | `main.title` | Geoconflict (ALPHA / ALFA / АЛФА / АЛЬФА / Alfa) |
| B4 | `ar.json:9`, `ko.json:12`, `tp.json:9` | `main.title` | the **upstream** name: "OpentFront (…)", "오픈 프론트 (시험판)", "musi Openpon (ALPHA)" |
| B5 | `pt-BR.json`, `debug.json` | no `main.title` key | already fall back to en |
| B6 | `src/client/index.html:7` | `<title>` | Geoconflict |
| B7 | `src/client/yandex-games_iframe.html:10` | `<title>` | Геоконфликт |
| B8 | `resources/manifest.json:21-22` | `name`, `short_name` (the "install app" name) | Geoconflict |

How players see B:
- `LangSelector.ts:251` sets `document.title` from `main.title`. This overwrites B6/B7 once the language loads.
- `Main.ts:218` writes `main.title` into the `#game-version` header. That element exists only in `index.html:167`; it is commented out in the iframe template (:264-265).
- Inside the Yandex iframe, players see Yandex's page title, not ours. The standalone site shows ours in the browser tab.
- The game's title in the Yandex Games catalogue is set in the Yandex console, **outside this repo**. It is not covered by this task.

**C. Checked, no name found:** `announcements.json`, `privacy-policy.html`, `terms-of-service.html`, `changelog.md`, `QuickChat.json`, `hints/`, `robots.txt`. The `<meta name="description">` in both templates has no name. The favicon SVG has the name only in an XML comment, which players do not see.

### 2. Proposed replacements (for owner approval; producer's draft, unchanged)

| Key / place | ru proposed | en proposed |
|---|---|---|
| `inbox.templates.citizenship_earned.title` | Вы получили гражданство! | You've earned citizenship! |
| `citizenship_tenure_grant.body` | Спасибо, что играете! В благодарность за то, что вы с нами так давно, мы дарим вам {xp} XP. Теперь у вас {total} / {threshold} XP. | Thank you for playing! As a thank-you for being with us for so long, we're giving you {xp} free XP. You now have {total} / {threshold} XP. |
| `main.title` (Q2) | Онлайн-стратегия | Online strategy |
| `<title>` in `yandex-games_iframe.html` (Q2) | Онлайн-стратегия | — |
| `<title>` in `index.html` (Q2) | — | Online strategy |
| `manifest.json` `name` / `short_name` (Q2) | — | Online strategy / Strategy |
| `main.title` in the other 31 files (Q2) | **delete the key** so they fall back to en "Online strategy" (Rec). The alternative is 31 translations. | |

Notes:
- `{xp}`, `{total}` and `{threshold}` stay unchanged. The en apostrophe in "we're" still passes the existing ICU test.
- The "(ALPHA)" suffix goes away with the name. The owner should be aware of that.
- `manifest.json` `short_name` gets a separate, shorter draft because install launchers cut long names.

### 3. Must NOT change

- The domain `geoconflict.ru`: canonical `<link>` at `index.html:12` and `iframe:72`, plus Pre/ProdConfig. The domain is the name and is visible in the address bar on the standalone site, but it cannot change here.
- All localStorage keys (`geoconflict.*`, `geoconflict_*`) and DOM event names (`geoconflict-*`).
- OTEL service and metric names (`geoconflict-client`, `geoconflict.server.*`, `geoconflict.profile.*`) and analytics event names.
- Operator Telegram alerts (`AlertRelay.ts:313-314,456`) and their tests.
- The favicon filename `GeoConflictFavicon.svg`, code identifiers, logs, `resources/claude-design-files/`, and built output in `static/`.
- **The upstream attribution "Based on OpenFront"** (`main.license_text`, en:50 / ru:49) — kept as the upstream credit, not a game-name mention. Also out of scope:
  - the other "OpenFront" strings (`support_openfront`, `territory_pattern`, `openfront_qr`);
  - the OpenFront pixel-logo SVG in the `index.html` header (:136-164; commented out in the iframe template).
  They are the upstream name, not ours. I did not check whether players can see them. Noted only.
- The DB: no edit to already-sent messages (owner ruled "Leave them").
- The other 31 lang files, except `main.title`, and only if Q2 = yes.

### 4. Steps (after approval)

0. Record the owner's answers to Q1-Q4 verbatim in the task's `worklog.md`, before any edit.
1. **Test first.** Add `tests/client/NoGameNameInPlayerText.test.ts`:
   - Matcher: `/geo[\s-]*conflict|гео[\s-]*конфликт/i`. A self-check asserts it catches "Вы получили гражданство Geoconflict!", "GeoConflict" and "Геоконфликт".
   - Walk **every string value** in `en.json` and `ru.json`, recursively.
   - Assert the walk visited more than 500 values, so an empty walk cannot pass by accident.
   - Report the first offending key path.
   - If Q2 = yes, also check:
     - `main.title` in every `resources/lang/*.json` (absent, or name-free);
     - only the text inside `<title>…</title>` in both HTML templates, so the canonical domain link is not flagged — assert that the tag is found;
     - `manifest.json` `name` and `short_name`;
     - if Q4 = yes, every string in `announcements.json`.
   - Confirm it **fails on today's files** (verification step 3).
2. Edit A1-A4 in `en.json` and `ru.json` together. This builds on the uncommitted 0250/0303/0314 changes in the same files and must not revert them.
3. If Q2 = yes, edit B1, B2 and B6-B8, and delete `main.title` from the 31 other files (or translate them, per Q2). The edit is scripted with key-level JSON edits so only that one line moves in each file, no reformatting. Afterwards, run a `git diff --stat` check: exactly 1 line changed per file.
4. Update the verbatim copy in `tests/client/TenureGrantLang.test.ts:57-67` to the approved text.
5. Check the guard: it now passes. Also run these, all expected green:
   - `TenureGrantLang`, `InboxTemplateLang`, `CitizenshipCopy` (the citizenship_earned body is untouched);
   - `LangCode`, `LangSvg`;
   - `LangSelectorRerender`, `Inbox`.
6. Run `npm test` in full. If the known supertest flake appears, re-run and say so. Run `npm run lint`.
7. Grep check (verification step 2) over the paths above: expect no matches, apart from the canonical link and the favicon filename.
8. Check by eye (brief step 4): an existing `citizenship_earned` message shows the new title in ru and en, and the tenure popup shows the new body. This needs a local run with a profile server and a seeded message. **If the worker cannot do this run, it is reported as unverified** rather than claimed. The template-at-view-time mechanism itself is structural (`template_key` plus client lang lookup).

### 5. Edge cases and risks

- **Same files as 0250, 0303, 0314 (uncommitted) and 0316 (next in rank).** Edit on top of the working tree; never check out or restore those files. 0316 touches a different key (`name_change_approved`), so merge conflict is trivial and the two can ship together.
- **Deleting `main.title` in 31 files:** the fallback is proven in code (`LangSelector.translateText` :278-282 → `defaultTranslations`). No parity test requires every file to carry the key; `LangCode` and `LangSvg` check only `lang.*`.
- **Installed PWA / home-screen shortcuts** keep the old name until the browser refreshes the manifest. Nothing in code can force that.
- **Literal (admin-sent) inbox messages** keep whatever text they were sent with. It is unknown whether any contain the name. By the owner's ruling, nothing is done about it. If wanted, a read-only count could be run later, but that is not part of this task.
- The guard deliberately covers **all** of en/ru, not just the touched keys. Any future copy that names the game fails `npm test`, which in effect enforces the proposed standing rule (Q4).

### 6. Deploy order

- **Game client only.** The lang JSON is bundled by webpack imports; the HTML templates and `manifest.json` ship in the client image via the normal game build and deploy.
- **No profile-server deploy, no migration, no DB step, no ordering dependency.** Can ride the same release as 0316, 0301 and 0302.
- Nothing is committed or pushed without the owner's explicit ask.
- Optional owner action outside the repo: the game title in the Yandex Games console.

## Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead) — record verbatim
- **Q1 (already-sent messages):** "Yes, old ones update too (Recommended)" — Nothing extra to build.
- **Q2 (tab title / header / install name):** "Yes, others fall back to English (Recommended)" — Neutral title; the 31 non-en/ru languages show 'Online strategy'. No unchecked translations. ⇒ all Q2-conditional steps apply; `main.title` is deleted from the 31 other lang files.
- **Q3 (wording):** "Approve all as written (Recommended)" — use exactly the §2 table texts (asked three times; the owner first asked to see all texts in full, which were then shown verbatim in the question).
- **Q4 (guard scope):** "Wide check (Recommended)" — All en/ru texts, titles, install name and news feed. ⇒ the `announcements.json` check applies.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.
