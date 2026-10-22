# Plan — 0470: change the date on the two newest news entries from 2026-10-17 to 2026-10-16

Planned 2026-10-22 by fkit-coder (plan step only, spawned by fkit-sprint-ship-loop). Nothing was written.

## Summary
- The change is data only: two `date` values in `resources/announcements.json` (lines 4 and 17). No code changes.
- The ids stay as they are (owner ruling 2026-10-16, "Keep the ids (Recommended)"). This also matches `resources/announcements.schema.md:39`: "Do not reuse or edit old `id` values after they ship."
- ⚠️ **Two of the brief's verification steps describe things the code does not do. I corrected them below.**
  - **The unread-dot check names the wrong id.** If a browser's stored last-seen id is `2026-10-17-game-update`, the dot **does** show, today and after this change. That id sits at index 1, and `hasUnreadAnnouncements` returns `seenIndex > 0` (`src/client/Announcements.ts`). Opening the news window stores the newest id, `2026-10-17-citizenship`, so the check has to use that id.
  - **The date is not formatted per language.** `NewsModal.ts:325` prints the raw string (`<span>${entry.date}</span>`). Both en and ru will show `2026-10-16`, not "16 Oct". This also means there is no timezone risk: nothing calls `new Date()` on this value.

## Facts checked (2026-10-22)
- `resources/announcements.json` line 3 is `"id": "2026-10-17-citizenship"` and line 4 is `"date": "2026-10-17"`. Line 16 is `"id": "2026-10-17-game-update"` and line 17 is `"date": "2026-10-17"`. These are the only two `2026-10-17` dates in the file. The other two hits are the ids, which stay.
- The file has **no trailing newline**. The edit must keep it that way, or the diff picks up an extra change.
- Nothing in `src/` or `tests/` pins `2026-10-17`. The only matches in `src/ tests/ resources/` are in the JSON file itself.
- Unread state depends only on the id (`hasUnreadAnnouncements`, `NewsButton.refreshUnreadState`). The wiki agrees (`features/announcements.md`: "Unread state is ID-based"). Changing `date` cannot change who sees the dot.
- Code that reads the JSON: `src/client/Announcements.ts` (import), and through it `NewsModal.ts` and `NewsButton.ts`. Tests that load it: `tests/client/Announcements.test.ts` (imports the module, but the assertions use their own sample entries), `tests/client/Inbox.test.ts`, and `tests/client/NoGameNameInPlayerText.test.ts` (reads the JSON to check the text, which is not changing).

## Steps
1. Edit `resources/announcements.json` and change **only** two values: line 4 `"date": "2026-10-17"` → `"date": "2026-10-16"` and line 17 the same. Use two exact Edit-tool replacements, each anchored on its own `id` line so the right entry is hit. Do not run a global replace: `2026-10-17` also appears in the ids, which must stay. Do not reformat the file and do not add a trailing newline.
2. Leave all source and tests untouched. **No new test.** A test that pinned the live JSON (for example "the newest id is `2026-10-17-citizenship`") would break every time a news entry is added. The unread behaviour is already covered by the `hasUnreadAnnouncements` unit tests in `tests/client/Announcements.test.ts`.

## Verification
| # | Check | Who | How |
|---|---|---|---|
| V1 | Diff is exactly two `date` lines | agent | `git diff --stat resources/announcements.json` shows 2 insertions and 2 deletions. `git diff` shows only `-    "date": "2026-10-17",` / `+    "date": "2026-10-16",` twice, ids not touched, the `\ No newline at end of file` state unchanged. Also `node -e "JSON.parse(require('fs').readFileSync('resources/announcements.json','utf8'))"` to confirm the JSON is valid. |
| V2 | Targeted tests | agent | `npm test -- tests/client/Announcements.test.ts tests/client/NoGameNameInPlayerText.test.ts tests/client/Inbox.test.ts`. A targeted run does not take the project test lock and does not wait. |
| V3 | Full `npm test` | agent (or owner before the deploy) | The brief asks for a full run "before the deploy". It costs about 5 minutes at 1 worker plus the shell harnesses. It goes through the project lock and **waits its turn** if another full run is going. Plan: run it once after V2, through `npm test` (never `npx jest`), and report the result as it comes out. A single `Exceeded timeout of 5000 ms` in a supertest suite is judged by the CLAUDE.md flake rule: re-run, and say so. |
| V4 | Unread dot does not come back (**corrected id**) | agent, by reasoning and diff; browser check optional | The proof is V1: the ids did not change, and unread state depends only on the id. Optional browser check: guest session (the dot also lights for unread inbox messages, so not logged in as a citizen), set `localStorage["geoconflict.announcements.lastSeenId"] = "2026-10-17-citizenship"`, reload, and expect **no** dot. Setting it to `2026-10-17-game-update` **does** show the dot, before and after this change, so that value proves nothing. |
| V5 | Local en/ru display | agent if the dev server and Playwright work, otherwise the owner | `npm run dev`, open the start screen on :9000, open the news window, switch en and ru. Expect both newest entries still at the top, each showing **`2026-10-16`**, the same raw string in both languages. A Build worker can try this with the Playwright tools, but it is not guaranteed: the dev server needs ports 9000 and 3001 (port 3001 is sometimes taken by Remotion). If it cannot start, the worker reports V5 as not run and why, and V1 + V2 cover the data side. |
| V6 | Live check after the game deploy | **owner** | Out of scope here: the deploy is the owner's call (weekend slot by default). Live news in en and ru (Yandex Games for ru) shows `2026-10-16` on both entries. |

## Risks / edge cases
- A global replace of `2026-10-17` would also rewrite the ids and bring the "new" dot back for every player. Step 1 forbids it.
- Adding a trailing newline would put an extra line in the diff and fail V1's "nothing else". Keep the file's end exactly as it is.
- Related: `0469`'s title still says "2026-10-17" and "after the weekend deploy". It is a separate task and not edited here; the brief only says it "may want to note" this fix.
- Shipping needs a game deploy, which is out of scope. Committing needs an explicit owner ask.

## Files
- Change: `resources/announcements.json`, two lines.
- Read only: `src/client/Announcements.ts`, `src/client/NewsModal.ts`, `src/client/components/NewsButton.ts`, `resources/announcements.schema.md`, and the three test files above.
