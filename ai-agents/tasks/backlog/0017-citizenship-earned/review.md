# Review — 0017-citizenship-earned

Task: ai-agents/tasks/backlog/0017-citizenship-earned/brief.md
File(s) under review: commit range 6f66aff..e15bac7 (src/profile-server/PlayerProfileRepository.ts, src/profile-server/Routes.ts, src/client/PlayerProfileView.ts, src/client/flashist/FlashistFacade.ts, resources/lang/en.json, resources/lang/ru.json, ai-agents/knowledge-base/analytics-event-reference.md, tests/profile-server/Routes.test.ts, tests/client/PlayerProfileView.test.ts, tests/integration/PlayerProfileRepository.it.test.ts, 0017 task docs) + uncommitted worklog.md update
Status: closed-out

> **Round 1 coverage: FULL — both reviewers ran** (own pass + Codex adversarial via codex CLI,
> exit 0). Scope check: e15bac7 contains nothing outside the declared file set.
>
> **Extra-scrutiny verdict (plan deviation, snapshot self-join → two-statement grant):** the
> coder's EvalPlanQual double-grant claim was **independently verified AND empirically
> reproduced** against the live test Postgres (scratchpad probe, forced lock-contention
> interleaving): the plan's self-join shape reported `was_citizen=false` on BOTH racers
> (double grant report); the shipped two-statement shape reported newly-granted exactly once,
> final row correct (xp 1015, citizen, stamped once). The new shape is sound: single row lock
> taken by CREDIT_SQL's UPDATE and held to COMMIT; RETURNING carries lock-stable pre-grant
> citizenship fields; GRANT_CITIZENSHIP_SQL re-locks nothing new (same row, same txn — no
> deadlock surface, no lock-order hazard); the post-COMMIT hook fires iff the committing
> transaction observed the false→true flip, hence exactly once per real grant.
>
> **Close-out confirmed by reviewer (2026-08-24):** R1 residual verified as recorded (re-raise
> condition matches owner ruling). R2 fix verified against the actual test file: the held-lock
> barrier asserts real contention (`pg_stat_activity` poll requires `wait_event_type='Lock'`,
> poller cannot self-match, 4s timeout THROWS — no vacuous pass; the holder's `FOR UPDATE`
> conflicts with the ledger INSERT's FK `KEY SHARE`, so both credit snapshots predate the first
> commit ⇒ contested EvalPlanQual path forced deterministically). Re-run by reviewer against
> `gc-0017-it-pg`: 14/14 PASS `--runInBand`, barrier test green; `src/` 0-diff vs HEAD (test-only
> change). Mutation-proof claim corroborated by the reviewer's own Round-1 probe (self-join shape
> double-reports under this exact interleaving). Status: closed-out stands.

## Reviewer findings
| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1     | low | src/profile-server/PlayerProfileRepository.ts:271-274 | Post-COMMIT hook call `this.afterCitizenshipEarned(...)` is not wrapped in try/catch: today it is a literal no-op and cannot throw, but when 0012 fills the seam a synchronous throw would reject `creditMatchXp()` AFTER the grant is durable, and Routes.ts:232 would report the item as wire `"error"` (game server would retry → harmless `duplicate`, but the committed outcome is misreported). Latent, not reachable today; the shape faithfully mirrors the owner-approved 0019 seam, which has the identical gap (PaymentsRepository.ts:166-169) — whatever disposition is chosen should cover both seams. (Codex finding, verified PARTIALLY CORRECT — real but latent.) |
| R2 | 1     | low | tests/integration/PlayerProfileRepository.it.test.ts:245-262 | The race it-test (`concurrent credits from two different games grant citizenship exactly once`) pins the exactly-once property only probabilistically: `Promise.all` does not force the two transactions to overlap at the row-lock boundary, and on a serialized schedule the test passes without exercising the contested path — a regression back to the self-join shape could pass intermittently. Deterministic pin needs a held-lock barrier (third client holds the profile row lock until both credits are blocked, then commits) — exactly the method the reviewer's probe used to reproduce the double-grant. (Raised by both reviewers, verified CORRECT.) |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | PARTIALLY CORRECT | Frontier (latent — a no-op body cannot throw; cost exists only once 0012 fills the seam; shape mirrors the owner-approved 0019 seam with the identical gap) | none — recorded as accepted residual per owner disposition 2026-08-24; hardening obligation covers BOTH seams (0017 + 0019) when 0012 lands. 0012-brief note flagged to the lead for the producer (task-brief edits are producer-owned). | won't fix (frontier) |
| R2 | CORRECT | Defect (test gap — exactly-once pinned only probabilistically; contested EPQ path not forced) | Hardened `tests/integration/PlayerProfileRepository.it.test.ts` race test with the reviewer's held-lock barrier method: third session holds the profile row lock (`SELECT … FOR UPDATE`), both credits verified blocked via `pg_stat_activity` (barrier throws if not), then release ⇒ both statements' snapshots predate the first commit ⇒ contested path deterministic. Mutation-proofed: reverting the repo to the self-join shape makes this test fail (double newly-granted); shipped shape passes. Test-only change. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
- Fresh-device under-count — What: a grant first observed on a device with no stored snapshot never fires `Citizenship:Earned:XP` · Why (structural): localStorage is the only cross-navigation memory; arming on first sight would false-fire for every existing citizen on every new device; owner ruling 2 (2026-08-23) accepted for MVP · Re-raise only if: a server-side analytics path exists, or a new mis-count mode beyond the two accepted ones is found.
- Paid-crossing over-count — What: a paid citizen later crossing 1,000 XP fires `Citizenship:Earned:XP` · Why (structural): the public projection strips `is_paid_citizen` (deliberate — unauthenticated read must not leak who paid), so the client cannot distinguish; owner ruling 2 (2026-08-23) accepted for MVP · Re-raise only if: the projection becomes authenticated and returns paid state to the owner of the profile.
- Stamp-on-crossing for paid citizens — What: `citizenship_earned_at` stamps when a paid citizen crosses the threshold; flag/inbox stay suppressed · Why (structural): pre-0017 tested SQL behavior; the player did earn it; changing it touches tested SQL for no user-visible effect; owner ruling 3 (2026-08-23) · Re-raise only if: earned-vs-paid distinction becomes user-visible or drives entitlements.
- Status-only wire contract on `/internal/v1/credit` — What: `citizenshipNewlyGranted` is not exposed on the wire · Why (structural): no game-server consumer exists (client detects via re-fetch; inbox fires in the repo's post-commit seam); an unchanged schema avoids deploy skew; recorded plan choice, plan owner-approved 2026-08-23 · Re-raise only if: an actual wire consumer for the flag appears.
- Inbox via no-op seam — What: `afterCitizenshipEarned` is a documented no-op (TODO 0012) · Why (structural): 0012 not built; 0019-approved seam shape; localization keys already shipped in en/ru · Re-raise only if: 0012 lands and the seam stays unfilled.
- Unguarded post-COMMIT hook call (R1, owner disposition 2026-08-24) — What: `creditMatchXp`'s post-COMMIT `afterCitizenshipEarned(...)` call (PlayerProfileRepository.ts:271-274) is not try/catch-wrapped; a future throwing hook would reject after the grant is durable and Routes would misreport wire `"error"` (retry ⇒ harmless `duplicate`). Same gap exists in the 0019 seam (PaymentsRepository.ts:166-169). · Why (structural): today the hook is a literal no-op and cannot throw — the guard would protect dead code; the shape deliberately mirrors the owner-approved 0019 seam, and hardening one seam without the other would fork the pattern. · Re-raise only if: **0012 fills either seam — then harden BOTH seams (0017 + 0019) together** (wrap the hook call, or make the hook contractually never-throw) as part of that change.
