# Review — 0334

Task: ai-agents/tasks/done/0334-host-start-still-sends-start-game-after-the-window-closed-during-the-settings-save/brief.md
File(s) under review: src/client/HostLobbyModal.ts (`attemptStart` checks (A)/(B)/(C)/(D) only; 0333's hunks in the same file out of scope), tests/client/HostLobbyModalLeave.test.ts (`describe("closing during the rest of a Start (task 0334)")`, 7 tests)
Status: closed-out
Coverage: reasoning-only second opinion — codex-cli 0.157.1, exit 0; Codex read and reasoned over the diff and returned "no significant issues found"; its one execution (`npx jest tests/client/HostLobbyModalLeave.test.ts --runInBand --no-cache`) died with `EPERM` writing jest's haste map in the read-only sandbox before any test ran, so it measured nothing. All execution evidence is the Claude reviewer's: the 3 host-lobby suites ran green (43/43), and a mutation run over scratch copies (never the tree) showed each of (A)/(B)/(C)/(D) removed alone turns at least one new test red, and all four removed gives 6 failed / 9 passed (matches the worklog's red run).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|
| R1 | 1     | nit  | src/client/HostLobbyModal.ts:918-919, 950-951 | Comment wording is imprecise; code is correct. (A)'s comment ("during the settings save or the config read") covers only the save's own inner config read — the Start's separate read after the save is guarded by (B), which has no comment. (D)'s comment ("a `start_game` already sent cannot be recalled") sits in a `catch` that also catches pre-send throws from `putGameConfig()` / `getServerConfigFromClient()`, where nothing was sent. Informational; no behaviour at stake. |
| R2 | 1     | nit  | tests/client/HostLobbyModalLeave.test.ts:329-354 (`it.each` "closing while the settings save is pending…") | Test-fidelity note, no gap in the set. Measured by mutation: with (A) removed alone, the "save succeeds late" variant stays green because (B) also stops that path; only the "save fails late" (500) variant pins (A). Every check is still pinned by at least one test. Untested: a close during the save followed by a save that *throws* (network error) — it runs through (D)'s check, which is pinned by the post-send network-error test (same line of code). Informational; no action required. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (nit — comment wording only; no behaviour at stake) | Verified: `putGameConfig()` does its own `getServerConfigFromClient()` (`HostLobbyModal.ts` `private async putGameConfig`, first line), so (A)'s "or the config read" read as covering (B)'s read too; and the `catch` also takes pre-send throws. Reworded (A)'s comment to "the settings save (its PUT or its own config read)"; added a one-line comment on (B) ("same, for a close during this Start's own config read"); reworded (D)'s comment to name all three throw sources ("a throw from the save, the config read or an in-flight `start_game` (a sent one cannot be recalled)…"). Comments only — no code change. | ✅ done |
| R2 | CORRECT | Defect (nit — test fidelity; no gap in behaviour) | Verified the mechanism: with (A) removed, a late OK save continues to `getServerConfigFromClient()` and (B) returns `null` — same observable result, so only the 500 variant pins (A). Chose to close the named untested path: added a third `it.each` row `["throws", new Error("network down")]` (close during the save, then the save rejects). Mutation (check (D) removed alone) turns exactly that row red, so (D)'s pre-send path is now pinned directly, not only via the post-send network-error test. Did **not** add a test pinning (A) in isolation for the OK-save case — (B) masks it by design and (A) is already pinned by the 500 row. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
