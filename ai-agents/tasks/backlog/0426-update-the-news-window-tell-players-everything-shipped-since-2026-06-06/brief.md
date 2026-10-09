# Update the news window: tell players everything that shipped since 2026-06-06 (end of Sprint 8, before its final deploy)

## ID
0426

> ℹ️ **ID allocation, checked 2026-10-09 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) is `0425`, so this is `0426`. The only `0426` strings
> under `ai-agents/tasks` are incidental numbers inside `0193`'s worklog/review, not task references.

## Sprint
Sprint 8

> 📌 **OWNER REQUEST, 2026-10-09, typed by the owner in the coordinating Claude Code session** (the owner's own
> message), relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim: *"Brief a task for the Sprint 8 to update the announcements notes: it's been a while since the last
> update, we need to tell about all updates since the last one. I think this should be done at the end of the
> Sprint 8, before the final deploy, to include all changes"*.

## Priority
23

⚠️ **Priority 23 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 8](../../../sprints/plan-sprint-8.md)'s highest (22, `0425`); the owner named the sprint, not a rank.
**On merit this belongs last on the Sprint 8 board, directly below `0425`**, because by design it runs after every
other Sprint 8 build task (see *Timing*). 23 already sits there. **Rank barely matters here — the Timing rule below
governs when this task starts, not its number.**

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**What players see.** The bell on the start screen opens the news window (`src/client/NewsModal.ts`,
`src/client/Announcements.ts`, `src/client/components/NewsButton.ts`; the Personal tab is `src/client/Inbox.ts`). Its
content is `resources/announcements.json`, bundled into the client build — **a new entry reaches players only with a
client deploy**. A new top entry with a **new `id`** is the only thing that lights the unread dot for returning
players (the dot is per device — known, epic `0304`).

**Why now.** The newest entry is `2026-06-06-game-update` (last change to the file: commit `96a21c7`, 2026-06-06,
"Manual changes in the announcements."). It shipped in release `0.0.136` (deploy commit `e8f9eff`, same day — checked
with `git merge-base --is-ancestor`). Since then there have been **25 production deploys, `0.0.137` (2026-08-22)
through `0.0.161` (2026-10-09)**, about 490 commits, and none of them told players anything in the news window. That
window includes, among other things, the citizenship launch (release `0.0.154`, 2026-09-26, per the wiki's
`features/announcements` page). The owner wants one catch-up that covers everything up to and including Sprint 8's
final deploy.

**What already exists — use it, do not rebuild it.**
- Format and rules: `resources/announcements.schema.md` (newest first; `id`, `date`, `title {en, ru}`,
  `body {en, ru}`, optional `tag` = `new` / `upcoming` / `update`; plain text, no Markdown or HTML; never reuse or edit
  a shipped `id`).
- The `update-announcements` project skill (`.claude/skills/update-announcements/SKILL.md`) already does most of this
  job: it reads commit messages since the last announcement (not diffs), filters out internal churn, clusters changes
  into one-sentence en + ru bullets, **stops for the owner's approval**, then prepends the entry. The coder may run it;
  this brief's rules below win wherever they are stricter (the 4-month window, the flag check, the include/exclude
  list, the worklog record).
- System guide: `ai-agents/knowledge-base/announcements-system-guide.md` (good and bad uses). Original feature: task
  `0126-global-announcements` (done).
- ⚠️ **The news feed must not name the game.** Task `0311`'s guard, `tests/client/NoGameNameInPlayerText.test.ts`,
  checks every string in the news feed for "Geoconflict" / "Геоконфликт" in any spelling, so a draft that names the
  game turns `npm test` red. The upstream credit "Based on OpenFront" is allowed.
- Existing tests: `tests/client/Announcements.test.ts` (helpers: latest entry, unread state, ru/en fallback, bad tag).

**`resources/changelog.md` is out of scope.** Checked 2026-10-09: it is the upstream OpenFront v24 sample ("This
file will be replaced with real release notes during the release build process"), unchanged since the fork's first
commit, and **nothing under `src/` or `webpack.config.js` references it** — it is not shown to players. Do not update
it in this task. (Whether to delete it is a separate, unasked question.)

**Sprint 8 state on filing.** Sprint 8 is `🔲 Backlog` (not started) and has no goal. Its open build tasks today are
`0415` (no native browser tooltips) and `0423` (dark thin scrollbar) — both player-visible client changes — and `0425`
(SSH-only tester roles, a box-side operator tool players never see). `0343` is a discussion that may spawn more build
tasks. Every other open row is a verify/re-read task that ships no code.

## What to build

### Timing — the rule that governs this task
- **Start only after the last Sprint 8 build task that ships in the final Sprint 8 deploy is built** — today that means
  `0415` and `0423`, plus any Sprint 8 build task filed after 2026-10-09 that rides the same deploy. Check the Sprint 8
  board at start; if a build task is still open, wait or ask the owner.
- **Ship it in that final Sprint 8 deploy**, together with the features it describes. **It must never ship ahead of a
  feature it mentions.** If a described feature slips out of the deploy, its line comes out of the entry before the
  deploy.
- If the owner deploys Sprint 8 work over several weekend slots, "final" means the last game-client deploy before the
  owner closes Sprint 8; the owner confirms which slot that is.

### 1. Build the list of player-visible changes
- **Sources:** git history since `96a21c7` (commit subjects, bodies, merge/branch names — not diffs), the task folders
  in `ai-agents/tasks/done/` closed since 2026-06-06 (for accurate player wording), and the deploy records (the
  `DEPLOY prod: bump version to …` commits; `ai-agents/knowledge-base/weekend-deploy-slot-runbook.md` for the
  2026-09 window).
- **Include** what players notice: new or changed features, modes, maps, windows and buttons, visible fixes (crashes,
  broken buttons, wrong in-match behaviour), new texts they read.
- **Leave out** what players cannot notice: servers, backups, telemetry, analytics plumbing, tests, deploy tooling,
  security hardening, operator tools (e.g. `0425`), refactors. Minor visible fixes collapse into one closing
  "Bugfixes." / "Багфиксы." line, as earlier entries do.
- **Describe the state at deploy time, not the history.** A change that was shipped and later reverted or replaced is
  not announced. If something the 2026-06-06 entry said "for now" has changed since (e.g. mini-maps in public
  matchmaking), say what is true now — check it, do not assume.

### 2. Only what is live for everyone
- **Never promise unbuilt or on-hold features** (e.g. `0343`'s parked ideas, map packs, replay access).
- **Flag-gated surfaces count only if their flag is on for all players at deploy time.** The two known ones are the
  Yandex remote flags `citizenship_ui` (citizenship surfaces) and `private_lobbies_all` (private lobbies for everyone;
  the old `private_lobbies` tester flag is no longer read) — names in `src/client/flashist/FlashistFacade.ts`. The flag
  values live in the Yandex Games console, which only the owner can read: **ask the owner for the values at the
  approval gate** and record the answer. Tester-only features are left out.

### 3. Draft the text
- **en + ru, both complete and in sync** (same meaning, same bullets). **Russian is the main audience** — natural
  Russian, not a word-for-word translation; reuse established phrasings from earlier entries.
- Short, plain player language; one sentence per bullet; no internal task names, IDs or hashes.
- **One entry, or a few if one is too long to read** — the coder proposes the split (e.g. by theme), the owner decides.
  Each entry gets a new, unique `id`; follow the existing `<date>-game-update` pattern unless the owner picks another.
  `date` = the final Sprint 8 deploy date (the owner confirms it). `tag` = `update` unless the owner chooses otherwise.
- Must not name the game (see Context, `0311`).

### 4. ⛔ Owner approval gate — before editing the file
Show the owner, in one place: (a) the full draft entry or entries, en + ru; (b) the list of **included** changes and
the list of **excluded** ones, each with a one-line reason; (c) the flag values used and where they came from.
**Do not edit `resources/announcements.json` until the owner approves the final words.** The owner may rewrite the ru
text. **Record in `worklog.md`** the approval (date, channel, the owner's words) and the final approved text.

### 5. Write the entry
Prepend the approved entry (or entries) at the top of `resources/announcements.json`, keeping the file's formatting.
Do not edit or remove older entries; if the list is getting long, say so and let the owner decide about trimming.
No change to `resources/lang/*.json` is expected (entry text is self-contained). No commit, no deploy.

## Verification steps

1. **Timing:** at start, the worklog lists the Sprint 8 build tasks that ship in the final deploy and shows each is
   built (or the owner's ruling to go ahead). At deploy, every feature named in the entry is in that deploy.
2. **Approval recorded:** `worklog.md` holds the owner's approval of the exact final en + ru text, the
   included/excluded list, and the flag values with their source. The file's new entry matches the approved text
   character for character.
3. **Valid against the schema notes:** the file parses as JSON; the new entry has a unique new `id` not used anywhere
   in the file, a `YYYY-MM-DD` `date`, `title.en`/`title.ru`/`body.en`/`body.ru` all present and non-empty, `tag` one
   of `new`/`upcoming`/`update`, no Markdown or HTML; it sits at the top; older entries are byte-identical to before.
4. **Tests:** `npm test -- tests/client/Announcements.test.ts tests/client/NoGameNameInPlayerText.test.ts` green, and
   the full `npm test` green (or any failure judged by the CLAUDE.md flake rules, with the re-run stated).
5. **Local look, both languages:** run the client locally, open the news window from the bell: the new entry shows
   first with its title, date, badge and readable line breaks, in **en** and in **ru**; the unread dot shows for a
   browser that last saw `2026-06-06-game-update` and clears after opening. Screenshots or a written note in the
   worklog.
6. **Live look is a separate verify task, filed at close** (owner's build/verify-split rule, 2026-09-29): after the
   final Sprint 8 deploy, the owner sees the new entry in the live game in Russian, inside Yandex Games, and the dot
   lights for a returning player.

## Notes

- **Depends on:** `0415`, `0423` — and every other Sprint 8 build task that ships in the final Sprint 8 deploy,
  including any filed after 2026-10-09 (see *Timing*; the open set cannot be listed in full today, so the coder
  re-checks the Sprint 8 board at start).
- The SSH-only tester-roles task (Sprint 8 rank 22) is deliberately not a dependency: it is a box-side operator tool
  players never see.
- **Blocks:** nothing — but it should ride the final Sprint 8 game deploy, so that deploy waits for it.
- **Related:** `0126` (the announcements feature), `0311` (no game name in player text — its test covers the news
  feed), `0012` (Personal tab in the same window), `0304` (per-device unread dot), the `update-announcements` skill.
- Russian is the primary audience; the owner refines ru wording at the gate.
- Weekend deploy slot, per the owner's standing rule (2026-09-29), unless the owner says otherwise.
- Drafting help: the coder may ask the `fkit-producer` to cross-check the change list against closed task records;
  the coder owns the task and the draft.
