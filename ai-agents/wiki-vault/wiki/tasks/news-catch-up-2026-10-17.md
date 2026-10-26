# Update the News Window — Tell Players Everything Shipped Since 2026-06-06 (task 0426)

**Source**: `ai-agents/tasks/done/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md` (`plan.md`, `draft.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 23 (ADR-035 append rank; on merit last on the board, which is where it sits) / task `0426`

> ✅ **2026-10-26 sync (`4e9160a`) — the live check `0469` is CLOSED (2026-10-24, agent-closed — not owner-verified);
> the date fix `0470` is COMMITTED, NOT DEPLOYED.** `0469` (from its worklog, relayed): steps 1–3 and 5 passed,
> **agent-run** in the owner's Chrome inside Yandex (game `0.0.165`; the release contains `8c448a9`); step 4 (the Russian
> reads naturally) passed **lead-run at the owner's request** (*"Read it yourself and check it yourself"*) — not by the
> owner; entry B was read from the file only, not seen live. The bell dot that stayed after closing the news window came
> from an **unread personal message**, not the news — not a bug. Wording nits recorded; no task filed. Live, both
> entries still showed **2026-10-17**. `0470` (closed 2026-10-22) changed only the two `date` fields to `2026-10-16` and
> kept both ids (owner *"Keep the ids"*); it is in commit `e3950e6`, and `git tag --contains e3950e6` → **none**
> (checked by me) ⇒ players still see 17 Oct until the next game deploy. `0470`'s V6 live check is the owner's, not
> done. Side note from `0469`: on one first load the citizenship card briefly showed "couldn't load your profile", fine a
> minute later — not investigated.

> 🚀 **2026-10-16 sync, third run (`29811f0`) — LIVE in game prod `0.0.165`, deployed MID-WEEK 2026-10-16 ~12:17Z, a day early** (owner ruling *"Now,
> I'll run them"*). `git tag --contains 8c448a9` → `0.0.165` (and `0.0.164-profile.2`), checked by me. The "NOT
> deployed" and "Saturday 2026-10-17" lines below are history. ⚠️ **So both entries show 17 Oct on news live since
> 16 Oct** → fix task **`0470`** ([[decisions/sprint-9]], rank 9): change only the two `date` fields to `2026-10-16`,
> **keep the ids** (owner ruling *"Keep the ids (Recommended)"* — new ids would re-light the unread dot for everyone);
> no hurry, next game deploy. ⚠️ The live look in Yandex (Russian), **`0469`**, is **still open** (now Sprint 9 rank 6).

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-16** by a spawned `fkit-producer` via `/fkit-task-done`,
> at the end of a `fkit-sprint-ship-loop` run restarted by the owner for `0426` only (relayed by `fkit-lead`; ⛔ not
> producer precedent).
>
> 🟡 **Committed, NOT deployed.** The two entries are in `resources/announcements.json` in commit `8c448a9`
> (2026-10-16); `git tag --contains 8c448a9` → **none** at this sync. ⚠️ The close note on the Sprint 8 board and the
> worklog say *"Built, NOT committed"* — true when written, **stale after `8c448a9`** (checked by me with `git log` on the
> file). The entries reach players only with the **game prod deploy planned for Saturday 2026-10-17** (weekend slot).
> Live check: **`0469`** ([[decisions/sprint-9]], rank 1).

## Goal

The newest news entry was `2026-06-06-game-update` (release `0.0.136`). The 25 production deploys since (`0.0.137`
through `0.0.161`, by the brief's count at filing) told players nothing in the news window. The owner asked for one
catch-up covering everything up to Sprint 8's final deploy, shipped **in** that deploy so it never announces a feature
ahead of its release. See [[features/announcements]] for how the window works.

## Key Changes

- **Two entries prepended** to `resources/announcements.json`, dated `2026-10-17`; older entries byte-identical:
  - **`2026-10-17-citizenship`** (tag `new`) — *"Citizenship is here"* / «Гражданство уже в игре»: the citizenship card
    and XP (1 XP per multiplayer match, citizen at 100 XP), buying citizenship, the ★ badge and name change with
    moderator review and a Personal-tab answer, no ads between levels for paid citizens, the one-time tenure gift of up
    to 50 XP, and the **Private tab** (citizens create private lobbies, anyone joins).
  - **`2026-10-17-game-update`** (tag `update`) — redesigned start screen (Multiplayer / Singleplayer tabs; "Single
    Player" now called "Custom Game"), troop labels "current / max", the 5-million-gold modifier, 1-minute public lobby
    wait, the about-a-day refresh prompt, thin dark scrollbar and no stray tooltips, exit confirmation, and a
    "Bugfixes" line (now also covering `0454`'s *lobby not found*).
- **Text approved by the owner 2026-10-12** (brief step 4 gate); the file matches it character for character.
- **Flag gate:** `citizenship_ui` and `private_lobbies_all` both on for everyone — `private_lobbies_all` since the
  `0428` flip on 2026-10-13 ([[tasks/private-lobbies-everyone-flag-flip]]); the owner reconfirmed both 2026-10-16
  (*"Yes, both still on (Recommended)"*). The agent did not read the console itself.
- **Owner rulings 2026-10-16:** the weekend game prod deploy (2026-10-17/18) is the final Sprint 8 deploy; date
  Saturday 2026-10-17; `0454` covered by "Bugfixes". `0350` was excluded from the timing rule earlier (owner ruling
  2026-10-15 — it is an operator tool with its own profile deploy).
- No other repo file edited. The news must not name the game — `0311`'s guard test reads the real file
  ([[tasks/remove-game-name-from-player-texts]]).

## Outcome

- **Verified:** JSON/schema, byte and text checks pass; the two named suites 19/19; full `npm test` 228/228 suites,
  4757/4757 tests, first run. Local look in en and ru: both entries first, badges and dates right, unread dot lights for
  a browser that last saw `2026-06-06-game-update` and clears on open.
- ⚠️ **Local look was on the standalone `index.html` only — NOT the Yandex iframe template** that geoconflict.ru serves.
  The live look in Russian inside Yandex Games is `0469`'s job.
- ⚠️ **Accepted residual (review R1, owner ruling 2026-10-16 *"Keep text + file a fix task (Recommended)"*):** entry B
  says "Single Player" is now "Custom Game" — true for the start-screen button (`0166`,
  [[tasks/start-screen-redesign-implementation]]), but the window that button opens still has the heading
  "Single Player" / «Одиночная игра». Fix task **`0468`** (Backlog board, [[decisions/sprint-backlog]]) renames the
  heading only — strings, en + ru; analytics names and keys stay.
- If the deploy slips to Sunday, the `date` and ids may still be changed before the deploy (worklog note).

## Related

- [[features/announcements]] — the news window this writes to
- [[decisions/sprint-8]] — the board (rank 23)
- [[decisions/sprint-9]] — verify task `0469` (rank 1)
- [[decisions/sprint-backlog]] — fix task `0468` (window heading)
- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428`, the flag that allows the Private-tab line
- [[tasks/start-screen-redesign-implementation]] — task `0166`, the button rename behind R1
- [[tasks/remove-game-name-from-player-texts]] — task `0311`, the no-game-name test that reads the news file
- [[systems/weekend-deploy-window]] — the 2026-10-17 slot it ships in
- [[tasks/update-announcements-skill-rename]] — task `0475` (2026-10-22): the news-drafting skill is now `/geoconflict-update-announcements`
