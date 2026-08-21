# Review — 0042

Task: ai-agents/tasks/done/0042-starting-gold-public-modifier/brief.md
File(s) under review: src/core/Schemas.ts, src/core/configuration/{Config,DefaultConfig}.ts, src/core/game/{PlayerImpl,GameImpl}.ts, src/server/{MapPlaylist,GameManager,GameServer}.ts, src/client/{Main,SinglePlayerModal,HostLobbyModal,PublicLobby}.ts, resources/lang/{en,ru}.json (modifier_starting_gold), tests/core/game/StartGold.test.ts, tests/server/MapPlaylist.test.ts, tests/util/Setup.ts, tests/client/MatchStartAnalytics.test.ts
Status: closed-out

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1 | low | src/core/WorkerSchemas.ts:11 + src/server/GameServer.ts:140 | Zod v4 `.partial()` still materializes `startGold`'s `.default(0)` (verified: `GameInputSchema.parse({bots:5})` → `{bots:5, startGold:0}`, zod 4.0.5). Every PUT /api/game/:id therefore carries `startGold: 0` even when the client omitted it, so the `!== undefined` guard in `updateGameConfig` is always-true for this field — unlike every other field's true partial semantics — and would silently zero a nonzero private-lobby `startGold`. No wrong behavior reachable today: PUT rejects public games (Worker.ts:202-209, the only place startGold ≠ 0) and all legitimate private-lobby flows send 0. Latent hazard if private-lobby starting-gold scope ever opens (raised by both reviewers). Disposition (fix the schema seam vs record as accepted residual) is the owner's call. |
| R2 | 1 | low | src/server/MapPlaylist.ts:53-58 | Weird-option selection inside `weird_setting.apply()` uses global `Math.random()`, not the `random` fn injected into `applyMatchModifier` — so the injected-RNG test seam doesn't control option choice and tests must mock `Math.random` globally. **Pre-existing** (predates 0042; this task only added the fifth option). The new test at tests/server/MapPlaylist.test.ts:162-171 handles it correctly (spy + finally-restore, matching the existing pattern). Codex-raised; verified PARTIALLY CORRECT — real seam, not a 0042 regression, no behavioral impact (server-side pre-broadcast randomness, not sim). Informational. |

**Dispositions (Round 1, owner-ruled via AskUserQuestion in the lead session, 2026-08-14; relayed by the driver):**
- R1 → **accepted residual** (entry added below). No code change now; the fix belongs to whatever task opens private-lobby-UI scope.
- R2 → **informational / no action** — pre-existing seam, out of 0042's scope; ledgered here so it isn't lost.
No code changed, so no re-verify round. Review verdict stands: ✅ Ready to merge (validation-gated — owner-side live check per plan).

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)

- Stale-client deploy-window desync — What: an old cached bundle in a *modified* public match strips the unknown `startGold` key (Zod default), computes 0 gold vs 5M on fresh clients, and is desync-kicked until refresh · Why (structural): inherent to adding any sim-affecting config field; mitigated by weekend low-traffic deploy; rejected alternative (strictly-required field) breaks old replays and stale-client lobby creation instead · Re-raise only if: the blast radius turns out larger than described (e.g. affects unmodified matches too). [Owner-accepted via approved plan, 2026-08-14]
- `.default(0)` schema choice — What: `startGold: z.number().int().nonnegative().default(0)` rather than strictly-required · Why (structural): old archived replays keep parsing and stale clients keep creating lobbies; Zod v4 output type still requires the field so TS enforces every literal · Re-raise only if: a concrete path is found where the default produces a wrong value. [Owner-ruled 2026-08-14]
- No private/custom-lobby starting-gold UI — What: `startGold: 0` hardcoded in SinglePlayerModal/HostLobbyModal; public rotation only · Why (structural): scoped out by the brief's locked decision 3 · Re-raise only if: the owner reopens lobby-UI scope. [Brief locked decision, 2026-06-13]
- Live verification owner-side — What: badge display, real 5M grant, opening-pace feel are verified post-deploy by the owner, not in this review · Why (structural): per brief verification plan and the spatial/live-test rule; no per-modifier analytics dimension exists · Re-raise only if: live check fails. [Approved plan, 2026-08-14]
- Partial-PUT default materialization (R1) — What: Zod v4 `.partial()` still fills `startGold`'s `.default(0)`, so every PUT /api/game/:id carries `startGold: 0` and the `GameServer.ts:140` `!== undefined` guard is always-true for this field; a nonzero private-lobby `startGold` would be silently zeroed. Kept as-is — no code change · Why (structural): no legitimate path creates a nonzero private-lobby `startGold` today (PUT rejects public games, the only place it is nonzero; all client flows send 0), so the seam is a dead guard, not wrong behavior; fixing it belongs to whatever task opens private-lobby starting-gold UI scope. Rejected alternative: strip the default from the partial update schema now — speculative churn with zero observable effect · Re-raise only if: a private-lobby starting-gold UI ships (that task must make `startGold` truly optional in `GameInputSchema` or rework the update guard). [Owner-ruled 2026-08-14, R1 disposition]
