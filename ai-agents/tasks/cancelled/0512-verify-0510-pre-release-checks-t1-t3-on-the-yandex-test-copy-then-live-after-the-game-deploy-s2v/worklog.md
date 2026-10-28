# 0512 worklog — S2v

## 2026-10-27 — part (a) skipped; T1 and T3 run on LIVE instead (owner-run; relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

The owner ran these checks and relayed the results through the `fkit-lead` session. A spawned producer with no owner
channel recorded them (ADR-021/037). Test account names stay out of git; they are "account A" and "account B" here.

### ⚠️ Deviation from the agreed order — the owner's call

**Part (a) did NOT run.** The owner skipped the dev-box deploy, so the pre-release T1–T3 on the Yandex test copy never
happened before the live game deploy. Owner's words, verbatim (relayed): *"I skipped the dev deploy (we can't test
anything there this build)"*.

T3 had been agreed as the **release blocker** (step 3: *"If it appears: stop. The game half of the held bundle does not
ship as is"*). The game went live without it. T3 was instead checked **on the live game, after the deploy**. This was
the owner's decision, recorded here as given; it is not a producer ruling.

Side note, not reconciled: repo history has a `DEPLOY dev: bump version to 0.0.165-dev.1` commit (2026-10-27, about
14:27 UTC) next to the owner's statement that the dev deploy was skipped. Whether anything reached the dev box is
unconfirmed.

**Deploys (as relayed):** profile box deployed, then the live game, 2026-10-27. Repo history shows two live-game
version-bump commits, `0.0.166` and `0.0.167` (about 14:28 and 14:33 UTC). Whether two live deploys ran is
**unconfirmed**. Profile box version not read (see 0511).

### Results

| Step | Result | Evidence |
|---|---|---|
| 1. T1 on the test copy | ❌ **Not run** (part (a) skipped) | Replaced by the live T1 at step 6. |
| 2. T2 (interrupted purchase) | ❌ **Not run** | Neither on the test copy nor live. |
| 3. T3 (scope across accounts) — release blocker | ✅ **Passed, on LIVE, after the deploy** (not pre-release as agreed) | Account B bought citizenship with the new game at ~15:03 UTC. Then, in the **same browser**, the owner logged in as account A (an earlier citizen whose purchase was consumed under the old client). A's page showed **A's own profile**. `purchase_holder_sightings` count stayed **0**. ⚠️ Caveat: this only catches the failure if A's session is verified; a good test, not a perfect one. Not observed: whether A's load made a reconcile POST (step 3 asks for none if the account bought nothing — A had an old, consumed purchase). |
| 4. T4 (held elsewhere) | ❌ **Not run** | The owner has no way to produce two profiles for one account here. **This live path stays unproven** (covered by `0510`'s tests only). |
| 5. T1/T2 failing ⇒ defect; safety switch not exercised live | ✅ No T1 failure seen; switch untouched | 0511 recorded the boot line `payments consume-permanent: OFF`. T2 unknown (not run). |
| 6. (b) A live test purchase stays listed in Yandex's list; reloads quiet | ⚠️ **Half met** | Reloads quiet: account B reloaded 2–3 times, nothing popped up (no restart popup, no card redraw, no inbox message). "Stays listed in Yandex's purchase list" **not directly observed**. Brief asked for 3 reloads; the owner reported 2–3. |
| 7. (b) Server counters move | ❌ **Not run** | |
| 8. Worklog with dates, versions, results, owner's words; no secrets | ⚠️ **Partial** | Recorded here; deployed versions only as repo tags, profile box version missing. |

### Account problem for the remaining checks

The owner has **only two Yandex accounts, and both are now citizens**. T2 (an interrupted citizenship purchase) needs an
account that does not own citizenship yet, so it cannot be run with these accounts. The same blocks `0498` (a guest
logs in and buys), `0499` step 3 (a logged-in **non-citizen**) and `0493` step 3 (a stray unconsumed purchase).

**Not closed.** Open: T2, T4 (or a recorded decision that it stays unproven), part (b) step 6's purchase-list half,
step 7 (counters), the profile box version. Part (a) as written can no longer run as a pre-release gate — the release
already happened; whether it is dropped or rewritten as "live only" is the owner's call.

## 2026-10-27, later — OWNER RULING: part (a)'s pre-release gate dropped; the live T1/T3 count

Given via `AskUserQuestion` in the `fkit-lead` session, relayed to a spawned `fkit-producer` (ADR-021/037); ⛔ not
producer precedent. Verbatim:

- Question: *"0512's 'before release' checks can't be pre-release any more. What do we do with them?"*
- Answer: **"Count the live checks (Recommended)"** — option text: *"Drop the pre-release wording; the live T1/T3
  results count. Knock-on: none (checked)."*

What changes in the table above:

| Step | Was | Now |
|---|---|---|
| 1. T1 | ❌ Not run (part (a) skipped) | ✅ **Met by the live T1**: account B's 2–3 reloads after the purchase were quiet (step 6 row). |
| 3. T3 (release blocker) | ✅ Passed on live, not pre-release | ✅ **Counts as step 3's result.** The pre-release gate is dropped. Caveat kept: it only catches the failure if A's session is verified; whether A's load sent a reconcile request was not seen. |

**Still open:** T2 (step 2) and the counters (step 7). Not covered by this ruling, so unchanged: T4 (step 4, unproven
live path), the purchase-list half of step 6, and the profile box version (step 8).

**Still pending with the owner, NO ruling recorded:** how to get a non-citizen account for the remaining purchase checks
(T2 here; also `0493` step 3, `0498`, `0499` step 3).

## 2026-10-27, later still — T2 still not run (relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

**T2 (step 2) was not run.** It needs a real completed (paid) purchase.

For `0498` and `0499` the owner produced a non-citizen by applying the `0425` tester role `non-citizen` to his **older**
account (its purchase was consumed under the old client), then `restore`. He did **not** use the newer account: its
purchase is now kept at Yandex, so a non-citizen role there would offer a real second charge. This is how the owner ran
those checks, **not a ruling on T2**. How to get a paid purchase for T2 is still open with the owner.

**Still open:** T2 (step 2), counters (step 7), T4 / purchase-list half of step 6 / profile box version as recorded above.

## 2026-10-28 — cancelled (spawned `fkit-producer`, relayed owner ruling; agent-closed — not owner-verified)

OWNER RULING in the `fkit-lead` session, relayed (ADR-021/037); ⛔ not producer precedent: the hand-run live checks are replaced by a metrics read — task `0516` (GameAnalytics, on or after 2026-11-03). Option picked: **"The 4 purchase ones (Recommended)"**. The 2026-10-27 results above stand as recorded; `0516`'s Context summarises them.

Where the open steps went: step 7 (server counters move) → `0511` step 4 (already there); a re-read of `purchase_holder_sightings` (T3 evidence) → `0511` step 10; versions (step 8) → `0511` steps 7 and 9. T2 and T4 stay unproven; step 6's purchase-list half stays unproven. Client side → `0516`.
