# Review — 0515

Task: ai-agents/tasks/done/0515-disable-the-humans-vs-nations-mode/brief.md
File(s) under review: src/server/MapPlaylist.ts · tests/server/MapPlaylist.test.ts · ai-agents/knowledge-base/analytics-event-reference.md (§ Win Condition Events, the `NationsTeam` paragraph only) — working tree vs HEAD, "public rotation only" variant of plan.md (steps 1, 5 MapPlaylist part, 6)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and reasoned over the diff; it executed only `git diff --check` and a `node -e` probability arithmetic, neither of which runs the code under review. Execution evidence is the reviewer's: `npm test -- tests/server/MapPlaylist.test.ts` 13/13 pass; eslint clean on both TS files; prettier drift on MapPlaylist.ts confirmed pre-existing (`{ }` in the constructor, untouched line).

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low | src/core/execution/WinCheckExecution.ts:37-39 (comment above `function teamLeaderKind`) | Comment this change makes wrong: "That mode is live in the public rotation (MapPlaylist.ts, with NPCs deliberately enabled) and host-selectable in private lobbies." After 0515 HvN is out of the public rotation. CLAUDE.md hard rule: fix or delete a comment your change makes wrong. Comment-only edit; the doc paragraph was updated but this twin was missed (plan step 6's grep covered the doc only). |
| R2 | 1 | low | analytics-event-reference.md § Win Condition Events, `NationsTeam` paragraph | Two wording inaccuracies. (a) "still offered … in private lobbies … and in single player, so `TeamPrivate:…:NationsTeam` keeps arriving" reads as if single player feeds the event — it never does (`src/client/WinConditionAnalytics.ts:42` returns early for `Singleplayer`). (b) "a `TeamPublic:…:NationsTeam` sample after that deploy can only come from a public game that started before it" overclaims: the admin-token public create (`src/server/Worker.ts:259-267`, schema accepts HvN at `src/core/Schemas.ts:174`) can still build a public HvN game — operator-only, today only Master calls it with playlist configs — and per plan.md's own evidence a deploy kills every running game, so a late-delivered event is the realistic source. Analysts read this doc as the source of truth. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (low — comment-only, no behaviour; misleads the next reader) | Verified at `WinCheckExecution.ts` comment above `function teamLeaderKind`: it said HvN "is live in the public rotation", which step 1 made wrong. Rewrote that one sentence: "kept out of the public rotation (MapPlaylist.ts) but stays host-selectable in private lobbies, NPCs enabled." No code change; comment-only `src/core` edit needs no new test. Repo-wide grep for "public rotation" leaves no other HvN-live claim. | ✅ done |
| R2 | CORRECT | Defect (low — doc is the analysts' source of truth; wrong reading of two leaves) | (a) Verified: `winConditionAnalyticsEventName` (`WinConditionAnalytics.ts:42`) returns `null` for `Singleplayer`; `WinCheckExecution.ts` `WIN_CONDITION_LOBBY_TYPE` maps single player to `"Singleplayer"`, never `"Private"`. (b) Verified: `POST /api/create_game/:id` (`Worker.ts`, admin-token check after `CreateGameInputSchema.safeParse`) accepts `HumansVsNations` (`Schemas.ts` `TeamCountConfigSchema`); `PUT /api/game/:id` refuses public games, so the admin create is the only live public path. Rewrote the paragraph: private lobbies keep `TeamPrivate:…:NationsTeam`; single player offers HvN but never emits the event; a post-deploy `TeamPublic:…:NationsTeam` is most likely a late-delivered event, and the operator-only admin-token create still accepts the mode (today only the master calls it, with playlist configs). | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
