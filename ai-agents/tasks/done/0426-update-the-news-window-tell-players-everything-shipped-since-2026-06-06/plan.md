# 0426 — implementation plan (final): news window catch-up, build step 5 + verification 3–5

Author: `fkit-coder` (spawned plan-only by `fkit-lead`, 2026-10-16). Planning only — no repo file was edited to
produce this plan.

## Owner inputs this plan rests on

- **2026-10-12** (worklog): text of entries A (citizenship) and B (game update) approved, en + ru; split into two
  entries, A on top.
- **2026-10-16, OWNER RULING, live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not
  producer precedent:** the weekend game prod deploy (2026-10-17/18) is the final Sprint 8 deploy; verbatim *"Yes,
  build 0426 now (Recommended)"*.
- **2026-10-16, OWNER RULINGS, same channel; ⛔ not producer precedent.** Verbatim selections:
  - Q1 date: *"Saturday 2026-10-17 (Recommended)"* → `date` = `2026-10-17`; ids `2026-10-17-citizenship` (A) and
    `2026-10-17-game-update` (B).
  - Q2 flags: *"Yes, both still on (Recommended)"* → `citizenship_ui` and `private_lobbies_all` enabled for everyone
    on 2026-10-16, per the owner (agent did not read the console). All approved lines stay.
  - Q3 `0454` (wrong lobby code now shows "Lobby not found"): *"Covered by \"Bugfixes\" (Recommended)"* → no text
    change.

## 1. Timing check (brief verification 1)

Game prod is on tag `0.0.164` (`d798adb`, 2026-10-13 20:06). Everything committed after it on `dev` (20 commits to
`b5176f9` at planning time) ships in the weekend deploy.

Code changed after `0.0.164` (`git diff --stat 0.0.164..HEAD -- src resources package.json`):
- Game client: `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts`, `MatchStartAnalytics.ts`, `PrivateLobbyAnalytics.ts`,
  `FlashistFacade.ts`, `ClientGameRunner.ts` — `0451` (analytics only) and `0454` (wrong-code message).
- Profile server: `NameChange*`, `reviewNameChanges.ts`, the `name-change:review` npm script — `0350` (ships on its
  own, owner ruling 2026-10-15; not a game-client change).
- No change under `resources/`; no reverts.

`0.0.164` itself (over `0.0.163`) added `0437` (`ExitConfirmModal.ts`, `MatchExit.ts`, sidebar/settings, lang keys)
and profile-server SSH alerts (`0443`).

| Task | State | Where it is | Player-visible? |
|---|---|---|---|
| `0415` no native tooltips | ✅ Done | `0.0.163` (`bcc9bf0`, ancestor of `0.0.164`) | yes — entry B |
| `0423` dark thin scrollbar | ✅ Done | `0.0.163` | yes — entry B |
| `0437` exit confirm (filed after 10-09) | ✅ Done | `0.0.164`, live since 2026-10-13 (`5449571`) | yes — entry B |
| `0228` handleJoinLobby race | ✅ Done | `0.0.164` | minor — under "Bugfixes" |
| `0451` private-lobby analytics | ✅ Done | after `0.0.164` → weekend | no |
| `0454` "lobby not found" on a wrong code | ✅ Done | after `0.0.164` → weekend | yes, minor — covered by "Bugfixes" (owner, Q3) |
| `0425` `0436` `0441` `0442` `0443` `0445` `0447` `0450` `0453` `0462` | ✅ Done | box / deploy / ops | no |
| `0350` name-change helper | ✅ Done | own profile deploy | no (operator) |
| `0384` Postgres by digest | ✅ Done | profile box | no |
| `0427` `0431` | ✅ Done | tests only | no |
| `0456` `0459` | ✅ Done | investigation / docs | no |
| `0428` / `0440` flag flip | ✅ Done 2026-10-13 | console, no deploy | enables the Private-tab line |

Open Sprint 8 rows — none is a game-client build: `0343` (discussion), `0418` / `0455` (analytics reads), `0385` /
`0449` / `0452` (verify; `0449`/`0452` ride the weekend deploy as box steps), `0219` (profile-box ops), `0213`
(profile rebuild, backlog). **Conclusion: nothing blocks.** This table goes into `worklog.md` as the verification-1
record.

## 2. Re-check of the approved text against the release

Every bullet's feature is in `HEAD` and live for everyone:
- A1 card / 1 XP per match / 100 XP — `src/core/profile/Citizenship.ts`: `CITIZENSHIP_XP_THRESHOLD = 100`,
  `XP_PER_MATCH = 1` (unchanged since `0.0.164`); match crediting wired (`GameServer.creditMatchXp`, `0217` done);
  card title «Гражданство» / "Citizenship" in both lang files.
- A2 buy / «Что такое гражданство?» / "What is citizenship?" — labels present in ru/en.
- A3 ★ badge, name change, «Личные» / "Personal" tab — `tab_personal` present in ru/en.
- A4 no ads between levels for paid citizens — `0248` gate in `FlashistFacade.ts`.
- A5 tenure gift up to 50 XP — `TENURE_XP_CAP = 50`, `TenureGrantContract.ts`.
- A6 «Приватная» / "Private" tab — `tab_private` present; `private_lobbies_all` on for everyone (owner, 2026-10-16).
- B1 «Мультиплеер»/«Одиночная», «Своя Игра» / "Custom Game" — labels present.
- B2 troops "current / max" — `0041`, unchanged since drafting.
- B3 5M gold — `MapPlaylist.ts:35` `startGold: 5_000_000`; mini-maps still disabled, so their exclusion stays right.
- B4 1-minute lobby — `DefaultConfig.ts:247-249` returns `60 * 1000`.
- B5 refresh popup after about a day — `0404`, in `0.0.164`.
- B6 scrollbar + tooltips — `0423` / `0415`, in `0.0.164`.
- B7 exit confirm — `0437`, live since `0.0.164`.
- B8 Bugfixes — still true; now also covers `0454` (owner, Q3).

No bullet comes out; no wording changes. The risk the owner accepted on 2026-10-12 (private lobbies / exit confirm
slipping) no longer applies — both are live.

## 3. Build steps

3.1 **Pre-check (read-only).** `resources/announcements.json` still unchanged since `96a21c7`; top id
`2026-06-06-game-update`; 9 entries; no existing id starts with `2026-10-17`.

3.2 **Values.**
- Entry A: `id` `2026-10-17-citizenship`, `date` `2026-10-17`, `tag` `new`, titles and bodies exactly as approved in
  `worklog.md` (2026-10-12 section).
- Entry B: `id` `2026-10-17-game-update`, `date` `2026-10-17`, `tag` `update`, titles and bodies exactly as approved.

3.3 **Edit `resources/announcements.json`** — one insertion right after the opening `[`: A, then B, then the old
content untouched. Format as the existing entries:
- 2-space indent; key order `id`, `date`, `title {en, ru}`, `body {en, ru}`, `tag`.
- Each `body` = its bullets in approved order, each starting `- `, joined by `\n` in one string (as every earlier
  entry).
- Cyrillic, «», —, ★ as literal characters (no `\u` escapes), as the file does today.
- Only escaping needed: `\"` around the en quotes ("What is citizenship?", "current / max", "Single Player",
  "Custom Game").
- The file today has **no trailing newline** (the only reason `prettier --check` flags it). Kept as is. If the
  owner's commit runs prettier via lint-staged (hook inert per `0223`), it adds a newline after `]` only — harmless.
- **No other file edited** — no `resources/lang/*`, no `src/`.

3.4 **`worklog.md`** (task folder): the timing table (section 1), the re-check (section 2), the 2026-10-16 owner
rulings (Q1–Q3, verbatim), verification results, decision log `none`.

## 4. Verification (brief steps 3–5)

**V3 — schema + byte check.** A throwaway Node script in the scratchpad (not the repo):
- parse JSON; `[0].id` = `2026-10-17-citizenship`, `[1].id` = `2026-10-17-game-update`; all ids in the file unique;
- `date` matches `^\d{4}-\d{2}-\d{2}$`; `title.en`, `title.ru`, `body.en`, `body.ru` non-empty strings; `tag` in
  `new`/`upcoming`/`update`; no `<`, `>`, `**`, `#`, `](` in the new strings;
- byte check: new file == `"[\n" + <A block> + ",\n" + <B block> + ",\n" +
  (git show HEAD:resources/announcements.json).slice(2)` — proves older entries byte-identical;
- text check: each decoded title/body equals the approved text taken from the 2026-10-12 section of `worklog.md`,
  with `<DATE>` = `2026-10-17`, character for character.

**V4 — tests, always through npm, never `npx jest`.**
- `npm test -- tests/client/Announcements.test.ts tests/client/NoGameNameInPlayerText.test.ts` (targeted — no project
  lock). Caveat: `Announcements.test.ts` uses in-file fixtures, so it proves the helpers, not the new content;
  `NoGameNameInPlayerText` reads the real file and is the content guard (no "Geoconflict" / "Геоконфликт").
- Full `npm test` — takes the project lock, 1 worker, `--detectOpenHandles --forceExit`, shell harnesses, about
  5 min. If another full run holds the lock it waits and I say so. A red result is judged by the CLAUDE.md flake rules
  (rule out `SIGSEGV`/`.ips` first, then the supertest timeout shape) and re-run, stating the re-run.

**V5 — local look, en + ru.**
- `npm run dev` (client :9000). If the lobby is missing, check for something on port 3001.
- Open `http://localhost:9000` (standalone template). In devtools set
  `localStorage["geoconflict.announcements.lastSeenId"] = "2026-06-06-game-update"`, reload → bell dot shows.
- Open the bell: A first with the "new" badge, B second with "update", date `2026-10-17` on both, bullet line breaks
  render (`white-space: pre-wrap`), older entries follow.
- Switch en ↔ ru in the language selector; check both texts. Close → dot gone.
- Screenshots via Playwright MCP into the scratchpad if available, otherwise a written note in the worklog.
- Limit: not the Yandex iframe. The live Russian-in-Yandex check is brief step 6, a separate verify task filed at
  close.

## 5. Review, close, deploy

- **Review:** the driver asks `fkit-reviewer` for a stateful review of the working tree, task-id `0426`.
- **Close:** a producer spawn runs `/fkit-task-done` (agent-closed marker) and files the step-6 live-verify task at
  the top of the next sprint.
- **Deploy:** ships in the Saturday 2026-10-17 game prod deploy with `0449` / `0452`. `build-deploy.sh` builds the
  image from the local tree (`Dockerfile`: `COPY src`, `COPY resources`) and commits/tags only `package.json`.
  **The owner must commit the 0426 change before running `build-deploy.sh prod`**, or the shipped news is missing
  from the release tag. I do not commit.
- **If the deploy slips to Sunday 2026-10-18:** `date` and both ids may still be changed before that commit (nothing
  shipped yet); after shipping, the ids are frozen.

## Risks / edge cases

- A wrong `\"` escape or typo breaks parsing (build fails / entry dropped) — caught by V3 and the targeted tests.
- Both new entries show as unread for returning players — expected; opening the window marks the newest id (A) seen
  and clears the dot. Dot is per device (`0304`, known).
- Feed becomes 11 entries — not long enough to propose trimming; mentioned once only.

## Open questions

None.
