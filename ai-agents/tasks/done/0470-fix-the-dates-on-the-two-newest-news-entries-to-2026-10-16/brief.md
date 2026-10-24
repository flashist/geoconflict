# Fix the dates on the two newest news entries: 17 Oct → 16 Oct (the deploy went out a day early)

## ID
0470

> ℹ️ **ID allocation, checked 2026-10-16 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0469`.

## Sprint
Sprint 9

> 📌 **OWNER RULING typed live by the owner in a Claude Code session on 2026-10-16**, relayed by that session to a
> spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"Brief a task and
> put it to the Sprint 9 (no need to be hurry with it, we will do it later): the dates in the announcements are a bit
> wrong - we did deploy 1 day earlier than expected (Oct.16), but the dates show Oct.17, we need to fix the dates
> there."*

## Priority
9

> ✅ **OWNER-CONFIRMED 2026-10-16** — OWNER RULINGS given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent: verbatim *"Keep slot 9 (Recommended)"*. Before that:
> ~~⚠️ **Priority 9 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~
> **On merit this belongs directly below `0455`** (where it sits), because the owner said there is no hurry, it blocks
> nothing, and it simply goes out with the next game deploy. Appended after the [Sprint 9](../../../sprints/plan-sprint-9.md)
> board's highest (8), never inserted (ADR-035).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder — routine fix; the project's model routing table sends `routine-fix` to **Codex**.

## Context

[`0426`](../../done/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md) added two
entries to the top of `resources/announcements.json`, both with `"date": "2026-10-17"`. That date was picked to match
the planned weekend deploy (owner ruling 2026-10-16: *date Saturday 2026-10-17*). The deploy then went out **a day
early**: game prod `0.0.165` went live **2026-10-16 ~12:17Z**, a mid-week deploy the owner ruled for (*"Now, I'll run
them"*). So players now see 17 Oct on news that has been live since 16 Oct.

Facts checked by the relaying session (2026-10-16) and re-checked by the producer while filing:
- The two entries are `2026-10-17-citizenship` and `2026-10-17-game-update`. Both have `"date": "2026-10-17"`.
- The entry text (title, body, en and ru) carries **no date**, so only the `date` field is wrong.
- ⚠️ **The `id` fields contain the date too.** `hasUnreadAnnouncements()` in `src/client/Announcements.ts` treats a
  stored `lastSeenId` that is no longer in the list as **unread**. So renaming the ids would show the "new" badge again
  to every player who has already opened the news.
- No test under `tests/` or `src/` pins `2026-10-17`.

## What to build

1. In `resources/announcements.json`, set `"date"` to `"2026-10-16"` on the two newest entries. Change nothing else:
   older entries stay byte-identical, and the text stays as written.
2. **Keep the `id` fields as they are** (`2026-10-17-citizenship`, `2026-10-17-game-update`) — ✅ **OWNER RULING
   2026-10-16, verbatim *"Keep the ids (Recommended)"*** (see Notes). Only `date` changes.
3. Shipping needs a **game deploy**. By default that is a weekend slot; mid-week is the owner's call.

## Verification steps

1. `resources/announcements.json`: exactly two `date` values change (`2026-10-17` → `2026-10-16`), and the diff shows
   nothing else (ids unchanged, by owner ruling).
2. `npm test -- tests/client/Announcements.test.ts` passes, and so does the full `npm test` before the deploy.
3. Locally, in **en and ru**: both entries still show first, and each shows **16 Oct** (in that language's date
   format). A browser whose stored last-seen id is `2026-10-17-game-update` shows **no** unread dot (this proves the
   ids were kept and the badge does not come back).
4. After the game deploy that carries it: the live news window shows 16 Oct on both entries, in en and ru. The owner
   runs this check (Yandex Games for ru).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- ✅ **ANSWERED 2026-10-16 — OWNER RULING** (OWNER RULINGS given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent). Asked *"0470 (news dates): keep the two news ids as they are, and fix only the date?"* → verbatim **"Keep the ids (Recommended)"**. The question as filed, kept as history: ~~**Open owner question (recommendation, NOT decided):**~~ keep the two `id` values (`2026-10-17-citizenship`,
  `2026-10-17-game-update`) as they are, and change only `date`. *Why:* the id is only a key, players never see it,
  and changing it shows the "new" badge again to everyone who has already read these entries. *Cost of keeping:* the
  id's date part stays one day off, which only matters to someone reading the file.
- **Related:** [`0426`](../../done/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md)
  (wrote the entries); [`0469`](../0469-verify-0426-live-the-2026-10-17-news-entries-show-in-yandex-russian-after-the-weekend-deploy/brief.md)
  (Sprint 9, the live news check; its title says 2026-10-17 and "after the weekend deploy", but the deploy happened on
  2026-10-16, so it may want to note the date this task fixes);
  [`0468`](../../backlog/0468-rename-the-custom-game-window-title-to-match-the-start-screen-button/brief.md) (Backlog board,
  another small follow-up to the same news; it could go out in the same deploy).
