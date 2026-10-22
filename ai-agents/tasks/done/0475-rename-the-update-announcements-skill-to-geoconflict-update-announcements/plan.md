# Plan — 0475: rename the `update-announcements` skill to `geoconflict-update-announcements`

## Summary
- Small rename: one folder, one frontmatter line, one YAML comment. No source code, no tests, no behaviour change.
- My own grep (2026-10-22) **confirms the brief's live-vs-historical split**. It found **no new live reference**. It found **four more hits the brief's verification step 2 does not list**. None of them is live; all are accounted for below.
- **Name prefix is safe:** the fkit skill-ownership hook only governs `fkit-*` skill names and lets every other name through (`~/.local/share/fkit/claude/skill-ownership-hook.sh:101-108`). So `geoconflict-*` stays callable from any session, exactly like `update-announcements` today.
- **`npm test` not required: confirmed.** Nothing under `tests/`, `scripts/` or `.husky/`, and neither `package.json` nor `jest.config.ts`, mentions `.claude` at all (grep exit 1).
- **Can't be checked from inside the loop:** whether Claude Code picks up the renamed skill without a restart. That stays an owner check, as the brief already says.

## Grep evidence (repo-wide, excluding `node_modules`, `.git`, `static`, and the 0475 brief itself)
**Live (change these):**
- `.claude/skills/update-announcements/` — a tracked folder (`git ls-files` → `SKILL.md` only; no `.DS_Store` or other files in it).
- `.claude/skills/update-announcements/SKILL.md:2` — `name: update-announcements`. The only other match in the file is the H1 at `:7` ("Update Announcements"). The body never mentions its own `/update-announcements` command.
- `ai-agents/ai-agents.yml:45` — the comment `# instance, update-announcements) are authored in-repo as origin:project —`.

**Historical (leave alone; these match the brief):**
- `ai-agents/tasks/done/0003-*/{plan,worklog,review}.md`
- `ai-agents/tasks/done/0367-*/brief.md:115`
- `ai-agents/tasks/done/0426-*/brief.md:56,164`
- `ai-agents/tasks/done/0470-*/worklog.md:79,81,96` and `review.md:11,16,21`. Residual R1 in that review is a closed record and is not edited.
- `ai-agents/knowledge-base/fkit-transfer-blueprint.md:18,45,53,147,177` — a dated design doc.

**Hits the brief's verification step 2 does not name (none of them live; do not edit):**
- `ai-agents/sprints/plan-sprint-9.md:55,70` — the board's addendum and log line *about this very task*. They describe the rename and correctly name both the old and new names. Not a skill reference.
- `ai-agents/tasks/backlog/0475-*/brief.md` — this task's own brief.
- `.fkit/tmp/` scratch logs: the brief names only `0470-codex-err.log`, but `codex-0003-err.txt` and `0275-codex-err.log` also match. `.fkit/` is git-ignored (`.gitignore:28`), so these are scratch, not live.
- Outside the repo (out of scope, not editable by this task): `~/.codex/.codex-global-state.json` holds a cached skill list that includes `{"name":"update-announcements"}`, plus old Codex session logs. That cache belongs to Codex's own app. It is not repo config, and I can't verify whether or when Codex refreshes it. The repo's `.codex/skills/` holds only a `.DS_Store`.

**Checked and clean:** `.claude/settings.local.json`, `.claude/commands/` (empty), `.claude/agents/`, `.claude/worktrees/` (empty), `CLAUDE.md`, `~/.claude/settings*.json`, `~/.claude/CLAUDE.md`, the fkit share's `structure-spec.md` / `structure-manifest.tsv` (no mention, so fkit-heal won't flag the new folder), `ai-agents/wiki-vault/` (no hit).

## Steps
1. **Re-grep before editing.** Run `grep -rIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=static "update-announcements" .` and confirm the hit list still matches the evidence above. Any new live hit means stop and return `NEEDS-DECISION`.
2. **Rename with `git mv`:**
   `git mv .claude/skills/update-announcements .claude/skills/geoconflict-update-announcements`
   - Why `git mv` and not a plain `mv`: the folder is tracked. `git mv` moves it and stages the rename in one step, so `git status` shows `R` straight away. A plain `mv` would show as a deleted file plus an untracked folder until someone ran `git add`.
   - Honest caveat: git does not actually store renames. "Keeping history" means `git log --follow` and diff rename detection will see it. The content changes by about one line out of ~7.4 KB, far above git's 50% similarity threshold, so the rename will be detected.
   - Staging is not committing, and this step does not commit. The index already holds other staged changes (the 0470 move). This step adds only the rename to it and touches nothing else that is staged.
3. **Edit `SKILL.md` line 2:** `name: update-announcements` becomes `name: geoconflict-update-announcements`. Leave `description:`, `user-invocable: true` and the whole body byte-unchanged.
   - **H1: keep "Update Announcements"** (the brief allows a retitle and says keep it if in doubt). It is a human-readable heading, not the command name, so this keeps the diff to one line.
4. **Edit the `ai-agents/ai-agents.yml:45` comment:** `instance, update-announcements)` becomes `instance, geoconflict-update-announcements)`. Comment only. The line gets longer (about 87 characters); re-wrapping the comment is optional and changes no keys or values. Lines 47-50 (`skills:` keys) stay untouched.
5. **Do not touch** any historical file or the four extra hits listed above. Do not touch `ai-agents/wiki-vault/`. Do not commit.
6. **Worklog:** the build worker records the final grep output in the task folder's `worklog.md`, with every hit tagged live-updated / historical / board-about-this-task / scratch. That covers the brief's "every hit is accounted for" requirement.

## Verification
1. `test -f .claude/skills/geoconflict-update-announcements/SKILL.md && ! test -e .claude/skills/update-announcements`, and `sed -n 2p` of the new file prints `name: geoconflict-update-announcements`.
2. Repeat the step-1 grep. Every hit must be either `geoconflict-update-announcements`, or in the historical / board / brief / `.fkit/tmp` lists above.
3. `git status --short` shows the 0475-related changes as only: `RM .claude/skills/update-announcements/SKILL.md -> .claude/skills/geoconflict-update-announcements/SKILL.md` and ` M ai-agents/ai-agents.yml`. The other entries already present before the task (the 0470 move, `plan-sprint-9.md`, `plan-index.md`, `resources/announcements.json`, the 0475 task folder) are pre-existing and not this task's. `git diff -M HEAD -- .claude/skills` shows a rename with a one-line change. `git diff ai-agents/ai-agents.yml` shows a one-comment change.
4. **Tests: none run, on purpose.** Evidence: no file under `tests/`, `scripts/` or `.husky/`, nor `package.json` / `jest.config.ts`, mentions `.claude`, and the YAML edit is a comment. No full `npm test` is needed (and given the one-full-run-at-a-time lock, it is best avoided). The owner may still ask for one.
5. **Owner check (not done by the agent):** in a **fresh** Claude Code session, `/geoconflict-update-announcements` appears in the skill list and `/update-announcements` does not. Unverified: whether the current session's list refreshes live after a folder rename. A spawned agent can't observe that, so the worklog records it as an owner check, not as done.

## Risks / edge cases
- **Muscle memory / docs:** anyone typing `/update-announcements` will get "unknown skill" after this. There is no alias mechanism, and adding one is out of scope. The 0470 R1 residual still describes the same behaviour under the new name.
- **Codex side:** Codex's own cached skill list (outside the repo) may show the old name until it refreshes. Not verifiable from here, and not a repo artifact.
- **fkit init/heal:** they manage only `fkit-*` paths, plus the closed `orphan-targets` list, which doesn't mention this folder. So no fkit tool will delete the new folder or recreate the old one.
- **Wiki:** none today. A later `/fkit-wiki-sync` should record the new name (wiki role only).
