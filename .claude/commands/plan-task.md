Enter plan mode to plan the implementation of a task described in the file passed as the argument (e.g. `/plan-task ai-agents/tasks/backlog/my-task.md`).

Steps:
1. Use the EnterPlanMode tool to switch into plan mode.
2. Read the task file at the path provided as the argument.
3. If a wiki exists at `karpathy-vault/`, run `/wiki-query` to search for relevant context before proceeding.
4. Read any files referenced in the task (specs, related tasks, knowledge base entries) to gather full context.
5. Design a step-by-step implementation plan.
6. Use ExitPlanMode to present the plan to the user and request approval before any code is written.
