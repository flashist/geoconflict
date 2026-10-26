# Rename the `update-announcements` Skill to `geoconflict-update-announcements` (task 0475)

**Source**: `ai-agents/tasks/done/0475-rename-the-update-announcements-skill-to-geoconflict-update-announcements/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 10 (ADR-035 append rank) / task `0475`

> ✅ Closed 2026-10-22 by a producer spawned by the ship loop. Board note at close: *"Not committed; V5 fresh-session
> skill-list check is the owner's, not done; residual `0475-partial-staging` accepted by owner ruling."*
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `e3950e6` (2026-10-22).** Checked by me: at that commit and at HEAD,
> `.claude/skills/geoconflict-update-announcements/SKILL.md` carries `name: geoconflict-update-announcements`, so the
> partial-staging hazard (folder renamed, old `name:` line) **did not land in the commit**. ⚠️ V5 (the skill list in a
> fresh Claude Code session) is still the owner's check, not recorded as done.

## Goal

The owner asked whether `/update-announcements` is a Geoconflict-level skill and, told it is, ruled: *"Rename - brief a
task to the current sprint and run it"* (2026-10-22). The skill writes `resources/announcements.json` (en + ru) and is
hand-authored in this repo (`origin:project`), not compiled from the fkit kit.

## Key Changes

- Folder renamed `.claude/skills/update-announcements/` → `.claude/skills/geoconflict-update-announcements/` (history
  kept); frontmatter `name:` updated; the comment in `ai-agents/ai-agents.yml` updated. Behaviour and description
  unchanged.
- Historical references left untouched on purpose (closed task records, the 2026-07-03 fkit transfer blueprint).
- No `npm test` required (no source, test or harness reads `.claude/skills`).

## Outcome

- Invoke it as **`/geoconflict-update-announcements`** from now on.
- Accepted residual from review: `0475-partial-staging` (the rename was staged but the two content edits were not) —
  moot for the commit that landed, see the note above.
- Related accepted residual from `0470`'s review: the skill's default window start moves on a date-only edit of the news
  file (owner: *"Accept it, no change"*).

## Related

- [[features/announcements]] — the news window this skill writes for
- [[tasks/news-catch-up-2026-10-17]] — tasks `0426`/`0470`, the last news entries and the date fix
- [[decisions/sprint-9]] — the board (rank 10)
