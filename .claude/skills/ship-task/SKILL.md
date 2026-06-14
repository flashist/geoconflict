---
name: ship-task
description: Run the full task pipeline end to end for a single task file, from branch creation through merge and sprint update. Use this whenever the user wants to "ship", "do", "run", or "work through" a task and gives a path to a task .md file (e.g. "ship-task ai-agents/tasks/backlog/foo.md"). This skill chains the existing /plan-task and /process-review skills and the /codex:adversarial-review review, and handles all the git, gh, and file-moving plumbing in between, pausing only at the two human decision points (plan approval and review triage). Trigger this for any request to take a backlog task all the way to merged, not just plan it.
user-invocable: true
---

# ship-task

Conductor for the whole task lifecycle. This skill does NOT reimplement
planning or review — it CALLS the user's existing `/plan-task` and
`/process-review` skills plus the `/codex:adversarial-review` review, and
owns only the plumbing between them.

The user stays in control at exactly two points:
1. **Plan approval** — after `/plan-task`, before any code is written.
2. **Review triage** — after the adversarial review, deciding what to fix.

Everything else runs automatically. Do not ask the user to do any git,
gh, file-moving, or sprint-editing by hand — you do all of it.

> **Commit/move override:** This pipeline is an explicit, user-invoked
> request to take a task all the way to merged. Within this skill ONLY,
> you may commit, push, merge, move the task file, and edit sprint files
> without asking each time — that is the whole point of running it. The
> usual "never commit unless asked" and "never move task files" rules are
> superseded *for this run* by the act of invoking ship-task. Outside
> this skill those rules still hold.

## Inputs

- A path to a task file, e.g. `ai-agents/tasks/backlog/s4-profile-04-backend-infra.md`

Derive:
- `TASK_FILE` = the given path
- `SLUG` = task filename without extension, lowercased, non-alphanumerics → `-`
- `BRANCH` = `task/<SLUG>`
- `BASE` = `dev`

## Pipeline

Run these steps in order. Announce each step briefly before doing it.

### Step 1 — Feature branch
Check the current branch with `git branch --show-current`. If it is not
already `<BRANCH>`, create/switch to it:
```
git checkout -b <BRANCH> 2>/dev/null || git checkout <BRANCH>
```
Uncommitted work follows onto the branch automatically.

### Step 2 — Plan (GATE 1: plan approval)
Invoke the existing planning skill on the task:
```
/plan-task <TASK_FILE>
```
This puts you in plan mode. Present the plan to the user and **stop for
their approval**. Do not write code until they approve. If they request
changes, revise the plan and re-present. Only proceed once they say the
plan is good.

### Step 3 — Implement
After approval, implement the task on `<BRANCH>`, committing as you go
with clear messages. Keep going until the implementation is complete.
Per CLAUDE.md: any change in `src/core/` MUST be tested — run `npm test`
on the relevant files before moving on. Run `npm run lint` as well.

### Step 4 — Push & open PR
```
git push -u origin <BRANCH>
```
Reuse an existing PR if one is open for this branch; otherwise create one:
```
gh pr list --head <BRANCH> --json number --jq '.[0].number'
# if empty:
gh pr create --base <BASE> --head <BRANCH> --title "<Title from task name>" --body "Automated PR for <TASK_FILE>"
```
Capture the PR number for the merge step.

### Step 5 — Adversarial review
Run the adversarial Codex review against the branch. This is the Claude
Code slash command (NOT a `codex` shell subcommand). It reviews the
branch diff against `<BASE>` and returns Codex's output **verbatim
inline** — it does NOT post comments to the PR, so do not try to fetch
review comments from GitHub.
```
/codex:adversarial-review --base <BASE> --wait
```
Use `--wait` so the review output comes back inline for the next step.
If the diff is large and the review is run in the background instead,
retrieve the finished output with `/codex:result` before continuing.
Capture the returned review text — that text is the input to Step 6.

### Step 6 — Process review (GATE 2: review triage)
Present the findings from the Step 5 review output to the user as a short
numbered list with your own quick assessment of each (worth fixing / safe
to ignore, and why). **Stop and let the user decide** which to address.

Then invoke the existing review-processing skill, passing the **review
text itself** (not a PR number) as its argument:
```
/process-review <paste the Codex review output text from Step 5>
```
`/process-review` verifies each finding against the codebase and gates any
code change on explicit approval. Apply only the fixes the user approves,
commit and push. If the review should run again after fixes, loop back to
Step 5. Continue until the user says the review loop is done.

### Step 7 — Merge (confirm)
Ask the user to confirm the merge. On confirmation:
```
gh pr merge <PR_NUMBER> --merge --delete-branch
```

### Step 8 — Finish (automatic)
- Move the task file to the done folder:
  `ai-agents/tasks/done/<filename>`
- Update sprint files in `ai-agents/sprints/`: for any sprint `.md` that
  references this task, flip its `- [ ]` line to `- [x]`.
- Report what moved and which sprint was updated.

## Rules
- Never skip a gate. The two human decisions are the whole point.
- Never run as a detached/background job — this is interactive. (The
  adversarial review in Step 5 may itself run in the background, but the
  pipeline as a whole stays interactive and waits for its result.)
- If any command fails, stop and show the user the error rather than
  pressing on.
- If the task should be cancelled instead of merged, move the file to
  `ai-agents/tasks/cancelled/` and update the sprint the same way.
