# Worklog — 0470: news dates 2026-10-17 → 2026-10-16

## 2026-10-22 — Build step (fkit-coder, spawned by fkit-sprint-ship-loop)

Scope: approved plan Steps 1–2 and check V1 only. V2–V5 belong to the Verify worker; V6 is the owner's.
Plan `plan.md` checked unchanged before building (`git hash-object` = `09b373be7792525058d6b333bd8c27024ebd0066`,
matches the approved blob).

### What changed
- `resources/announcements.json`, two lines only:
  - line 4 (entry `2026-10-17-citizenship`): `"date": "2026-10-17"` → `"date": "2026-10-16"`
  - line 17 (entry `2026-10-17-game-update`): `"date": "2026-10-17"` → `"date": "2026-10-16"`
- Done with two exact Edit-tool replacements, each anchored on its own `id` line. No global replace.
- Ids untouched (owner ruling 2026-10-16, "Keep the ids (Recommended)").
- Step 2: no source or test changes, no new test (per plan).

### V1 evidence
- `git diff --stat resources/announcements.json` → `1 file changed, 2 insertions(+), 2 deletions(-)`.
- `git diff` shows only the two `-    "date": "2026-10-17",` / `+    "date": "2026-10-16",` pairs; both `id` lines are
  context lines, unchanged.
- File end unchanged: last bytes are `}\n]` with no trailing newline (checked with `od -c`). The diff carries no
  `\ No newline at end of file` marker because neither hunk reaches the end of the file — the end was not touched.
- `node -e "JSON.parse(...)"` → valid JSON, 11 entries; first two read `2026-10-17-citizenship 2026-10-16` and
  `2026-10-17-game-update 2026-10-16`.
- `grep -c 2026-10-17 resources/announcements.json` → `2` (only the two ids remain).

### Not run (out of this step's scope)
- V2 targeted tests, V3 full `npm test`, V4 optional browser unread-dot check, V5 local en/ru display — Verify worker.
- V6 live check after deploy — owner.

## Decision log

- Fixes applied without asking (unattended, under the loop's standing approval): **none**. The two edits are the
  approved plan's Step 1 itself, not review fixes.
- Obvious-winner calls: **none**.

## Verification

2026-10-22 — Verify step (fkit-coder, spawned by fkit-sprint-ship-loop). Read-only for source: nothing in
`resources/`, `src/` or `tests/` was edited. `plan.md` blob re-checked = `09b373be7792525058d6b333bd8c27024ebd0066`.
Owner rulings applied (2026-10-22): full `npm test` run in this task; V4 uses `2026-10-17-citizenship`;
expected display is the raw `2026-10-16` in en and ru.

| # | Result | Evidence |
|---|---|---|
| V1 | pass (Build step) | See the Build step above; diff re-read now, still only the two `date` lines. |
| V2 | **pass** | `npm test -- tests/client/Announcements.test.ts tests/client/NoGameNameInPlayerText.test.ts tests/client/Inbox.test.ts` → 3/3 suites, **43/43 tests**, 1.1 s. |
| V3 | **pass on re-run** (run 1 had 1 flake) | See below. |
| V4 | **pass** (reasoning + browser) | Ids unchanged (V1). Browser: guest, `localStorage` cleared, `lastSeenId = "2026-10-17-citizenship"`, reload → `news-button` div class `relative` (**no dot**). Control: set `2026-10-17-game-update` + `announcements-state-changed` → class `relative active` (dot shows, as the plan predicted), proving the probe can see a dot. |
| V5 | **pass** | `npm run dev` (ports 9000/3000/3001 were free first), Playwright on :9000, news window opened. en: top two = "Citizenship is here" `2026-10-16`, "Game update" `2026-10-16`, then `2026-06-06`. ru (via `lang-selector.changeLanguage("ru")`): "Гражданство уже в игре" `2026-10-16`, "Обновление игры" `2026-10-16`. Screenshot `.playwright-mcp/0470-v5-news-ru.png` (git-ignored). Console errors: only the known, intentional `/flags/*.svg` 404s. Dev server stopped afterwards; ports confirmed free. |
| V6 | not run — owner | Live check after the game deploy. |

### V3 detail
- **Run 1** (`npm test`, full, project lock taken without waiting): **1 failed, 4756 passed, 4757 total**;
  suites 1 failed, 227 passed, 228 total; 99 s. Failure:
  `tests/profile-server/Routes.test.ts` › `GET /v1/profile equalizes paid state (task 0250 S1, L1/L2)` ›
  `against earnedAt1200` › `paidThenEarnedAt140 reads exactly like the earned citizen` —
  `expect(earned.status).toBe(200)`, received **401**.
- Diagnosis (per CLAUDE.md flake rule):
  - **Not `0197`'s segfault**: no `SIGSEGV` / `signal=` in the log; no `~/Library/Logs/DiagnosticReports/node-*.ips` exists.
  - Not the timeout shape (no `Exceeded timeout of 5000 ms`). It is an unexpected-status shape in a `supertest`
    suite — CLAUDE.md lists unexpected `401`/`404` as seen historically, **mechanism unknown**.
  - Non-deterministic: in the same test the first read with the same `CALLER` token and same app config returned
    200; the token is minted at module load with a 24 h TTL, so expiry cannot explain it.
  - Unrelated to this change: `Routes.test.ts` and `src/profile-server/` do not read `resources/announcements.json`.
- **Re-ran once** (as the rule says): **Run 2** → **228/228 suites, 4757/4757 tests passed**, 91 s, exit 0, no
  `SIGSEGV`. Shell harnesses are inside that count (their wrapper suite passed).
- Call: run-1 failure is *likely* the known supertest flake family, **not proven** — the 401 shape's mechanism
  is untraced (CLAUDE.md). No retry logic or test change made.

### Decision log (Verify step)
- Fixes applied without asking: **none** (verify step is read-only for source).
- Obvious-winner calls: **none**.

## 2026-10-22 — Process-review step, round 1 (fkit-coder, spawned by fkit-sprint-ship-loop)

Ledger `review.md` round 1: reviewer verdict "Ready to merge", one finding R1 (advisory). Accepted residuals loaded
(ids keep old date; raw date display); no ADR in `ai-agents/knowledge-base/decisions/` covers the
`/update-announcements` window start. R1 matches neither residual → novel.

- R1 verified CORRECT at `.claude/skills/update-announcements/SKILL.md:41` (default `START` = last commit touching
  `resources/announcements.json`, today `8c448a9e`). Impact today: none — `8c448a9e..HEAD` touches only `ai-agents/`
  and the `0.0.165` version bump. Extension: `START..HEAD` excludes `START` itself, so work committed in the same commit
  as 0470 is also left out. Classified frontier-move (cost of the skill's default), not a defect in this diff.
- Coder response row written with Status `blocked` — awaiting the owner's disposition. Recording a residual for a
  frontier-move is a judgment call, outside the plan's standing approval; editing the skill is outside the plan.
- Ledger header Status left `in-review`.

### Decision log (Process-review step)
- Fixes applied without asking: **none**.
- Obvious-winner calls: **none** (R1 returned to the driver as NEEDS-DECISION).

### Decision log (Process-review step, after the owner ruling)
- R1: **owner-ruled, not an autonomous call.** Owner ruling 2026-10-22 via `AskUserQuestion`, relayed by
  fkit-sprint-ship-loop, verbatim "Accept it, no change (Recommended)" (option 1); no follow-up task to change the skill.
  Done: Accepted residuals entry added ("`/update-announcements` window moves on a date-only edit"), R1's Coder response
  Status set to `won't fix (frontier)`, ledger header Status set to `closed-out` (no other finding open).
- No source change. Fixes applied without asking: **none**. Obvious-winner calls: **none**.
