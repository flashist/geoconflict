# Rename the `update-announcements` skill to `geoconflict-update-announcements`

## ID
0475

> ℹ️ **ID allocation, checked 2026-10-22 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0474`.

## Sprint
Sprint 9

> 📌 **OWNER RULING typed live by the owner in a Claude Code session on 2026-10-22**, relayed by `fkit-lead`
> (driving `fkit-sprint-ship-loop`) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
> precedent. The owner asked *"'/update-announcements' - is it a 'geoconflict'-level skill/command? If yes, can we
> rename it into '/geoconflict-update-announcements' ?"*; after the lead's answer, ruled verbatim: *"Rename - brief a
> task to the current sprint and run it"*. "Current sprint" = Sprint 9, the only board whose line 3 reads
> `🔄 In progress` (resolved with `dashboard.sh select-active`, 2026-10-22).

## Priority
10

> ⚠️ **Priority 10 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0470`** (where it sits), because it is a small tooling rename that blocks
> nothing and that the owner asked to run immediately — rank only orders the board, and the loop is driving it now.
> Appended after the [Sprint 9](../../../sprints/plan-sprint-9.md) board's highest (9), never inserted (ADR-035).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

`update-announcements` is a **project-level** skill: it is specific to Geoconflict (it writes
`resources/announcements.json`, en + ru). It is hand-authored in this repo as `origin:project` — **not** compiled from
the fkit kit — per the comment in `ai-agents/ai-agents.yml` (around line 45). The owner wants its name to say it is a
Geoconflict skill, so it is invoked as `/geoconflict-update-announcements`.

Facts re-checked by the producer while filing (2026-10-22, repo-wide grep excluding `node_modules`, `.git`, `static`):

- The skill is `.claude/skills/update-announcements/SKILL.md`, the only file in that folder. Frontmatter
  `name: update-announcements`, `user-invocable: true`. The name appears **once** inside the file (the `name:` line);
  the H1 reads "Update Announcements".
- **Live references** (change these): the folder name, the `name:` field, and the comment in `ai-agents/ai-agents.yml`.
  - No hooks, settings, `.claude/commands/`, `CLAUDE.md`, `AGENTS.md`, `.codex/skills/` (empty) or `.fkit/` config
    reference it. (`.fkit/tmp/0470-codex-err.log` mentions it — a scratch log, not a live reference.)
  - No test under `tests/` or `scripts/`, nor `package.json` / `jest.config.ts`, reads `.claude/skills`.
- **Historical references** (leave unchanged — closed records and history):
  - `ai-agents/tasks/done/0003-*/{plan,worklog,review}.md`
  - `ai-agents/tasks/done/0367-*/brief.md`
  - `ai-agents/tasks/done/0426-*/brief.md`
  - `ai-agents/tasks/done/0470-*/{worklog,review}.md` — note `0470/review.md` carries an **accepted residual R1**
    naming `/update-announcements` and `.claude/skills/update-announcements/SKILL.md:41`. It is a closed record:
    **do not edit it.** The residual itself (the skill's default window start moving on a date-only edit) is about the
    skill's behaviour, which this rename does not change.
  - `ai-agents/knowledge-base/fkit-transfer-blueprint.md` — a dated design document (2026-07-03) describing the repo
    as it was then.
- **Wiki:** `ai-agents/wiki-vault/` has **no** page naming the skill today (grep, 2026-10-22). Any wiki update is
  `fkit-wiki`'s, via a later sync — out of scope here.

No conflict with a locked decision found. Nothing depends on this rename.

## What to build

1. Rename the folder `.claude/skills/update-announcements/` to `.claude/skills/geoconflict-update-announcements/`.
   Use a rename that keeps the file's history (e.g. `git mv`) — a rename is not a commit; **do not commit**.
2. Set the frontmatter `name:` to `geoconflict-update-announcements`. Leave the `description:` and the skill's
   behaviour unchanged. Retitling the H1 is optional (the coder's call; keep it if in doubt).
3. Update the `ai-agents/ai-agents.yml` comment so it names `geoconflict-update-announcements`. Comment only — no
   key or value changes.
4. Leave every historical reference listed in Context untouched. The coder's plan must **confirm the live/historical
   split** with its own grep before editing, and name any new live reference it finds.

## Verification steps

1. `.claude/skills/geoconflict-update-announcements/SKILL.md` exists with `name: geoconflict-update-announcements`;
   `.claude/skills/update-announcements/` no longer exists.
2. A repo-wide grep for `update-announcements` (excluding `node_modules`, `.git`, `static`) finds it **only** as part
   of `geoconflict-update-announcements`, or in the historical files listed in Context (plus `.fkit/tmp/` scratch
   logs). Every hit is accounted for in the worklog.
3. `git diff` / `git status` shows only: the folder rename (SKILL.md content differing only in the `name:` line, and
   the H1 if changed) and the one-comment change in `ai-agents/ai-agents.yml`. No historical file is touched.
4. **Tests: `npm test` is NOT required.** The change touches no source, no test, and no file any test or harness
   reads (checked: nothing under `tests/`/`scripts/` references `.claude/skills`, and the `ai-agents.yml` edit is a
   comment). If the coder's grep finds a test that does read skill folders, run that test file alone. The owner may
   override this and ask for a full run.
5. **Skill list refresh:** in a Claude Code session the skill appears as `geoconflict-update-announcements` and
   `update-announcements` is gone. ⚠️ The current session's skill list may still show the old name — Claude Code may
   need to be **restarted / re-opened** to refresh it (not verified whether it hot-reloads a renamed folder). The
   owner checks this in a fresh session; the coder records that as an owner check, not as done.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** [`0470`](../../done/0470-fix-the-dates-on-the-two-newest-news-entries-to-2026-10-16/brief.md) (just
  closed on this board; its `review.md` R1 names the old skill path — closed record, not edited).
- **Wiki:** none today; if a later `/fkit-wiki-sync` picks up this task, the new name is the one to record.
- Commit: none. Commits happen only when the owner asks.
