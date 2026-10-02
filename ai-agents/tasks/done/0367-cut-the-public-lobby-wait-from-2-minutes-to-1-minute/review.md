# Review — 0367

Task: ai-agents/tasks/done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/brief.md
File(s) under review: src/core/configuration/DefaultConfig.ts · tests/server/PublicLobbyWindow.test.ts (new) · ai-agents/knowledge-base/architecture.md · ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md (uncommitted working tree vs HEAD `40ccb06`)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a usable pass, but measured nothing: its only execution attempt (`npx jest tests/server/PublicLobbyWindow.test.ts`) died on sandbox `EPERM` before any test ran; the rest was source reading. Execution evidence is the Claude reviewer's (`npx jest tests/server/PublicLobbyWindow.test.ts` → 6/6 pass).

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1 | low | `ai-agents/knowledge-base/decisions/adr-107-turn-interval-speed-up-1-5x.md:125` ("`gameCreationRate()` is still `120 * 1000` (`DefaultConfig.ts:247-249`)") | [codex, verified PARTIALLY CORRECT] The kept sentence's line citation now points at code that reads `60 * 1000`. The new dated note right below it ("the sentence above is true as of ADR-107's date") already scopes the whole sentence, citation included, to its date — so a careful reader is not misled. Frontier-move, not a defect: the brief/plan chose a dated note over rewriting a historical record. Optional polish only (e.g. naming the commit `40ccb06` in the note as the place the cited lines still read `120 * 1000`); no action required. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Frontier-move (cosmetic; my severity: low — docs-only, no code path, reader already warned by the dated note) | Verified: ADR-107's kept sentence cites `DefaultConfig.ts:247-249`; in the working tree those lines read `gameCreationRate(): number {` / the 0367 comment / `return 60 * 1000;`, while at `40ccb06` they read `return 120 * 1000;` (checked with `git show`). Took the reviewer's optional polish (obvious winner, in plan §2.4's intent — still a dated note, sentence untouched): extended the ADR-107 note to pin the citation to commit `40ccb06` ("its `DefaultConfig.ts:247-249` citation reads `120 * 1000` at commit `40ccb06`, not in later revisions"), which makes the drifted coordinate re-resolvable per `conventions/durable-citation-anchors.md`. The underlying choice (dated note, not rewriting the historical sentence) recorded as an accepted residual below. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
- ADR-107 historical lobby-window sentence kept, dated note added — What: ADR-107's "`gameCreationRate()` is still `120 * 1000`" sentence and its `DefaultConfig.ts:247-249` citation stay as written; a dated 0367 note under it scopes the sentence to ADR-107's date and pins the citation to commit `40ccb06`. · Why (structural): an ADR is a historical record of what was true when it was decided; the approved plan (§2.4) chose a dated note over rewriting it. Rejected: rewriting the sentence to 60 s (falsifies the record of ADR-107's date), deleting it (loses the "lobby cadence did not speed up with matches" point), re-pointing the line citation at current code (it would then cite a value the sentence does not state). · Re-raise only if: the note is removed or contradicts the code again, the lobby window changes once more without a matching dated note, or commit `40ccb06` stops being reachable (history rewrite).
