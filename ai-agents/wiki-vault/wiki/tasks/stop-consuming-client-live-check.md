# Live Check S2v: Stop-Consuming Client Checks T1–T4 (task 0512) — CANCELLED

**Source**: `ai-agents/tasks/cancelled/0512-verify-0510-pre-release-checks-t1-t3-on-the-yandex-test-copy-then-live-after-the-game-deploy-s2v/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: cancelled (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 39 (ADR-035 append rank, flagged; on merit directly below `0510`) / task `0512` — live check S2v of the `0505` design

> ⛔ Cancelled 2026-10-28 via `/fkit-task-cancelled` by a spawned `fkit-producer` — hand-run live checks replaced by the
> GameAnalytics metrics read `0516` (on or after 2026-11-03); owner ruling **"The 4 purchase ones (Recommended)"**,
> relayed by `fkit-lead`. Same ruling as [[tasks/purchase-grant-registry-live-check]].

## Goal

Owner-run checks of `0510` ([[tasks/stop-consuming-client-s2]]), planned in two parts: **(a)** before the game deploy,
on the Yandex test copy against the live profile box — T1 (a permanent purchase stays; reloads are quiet), T2
(an interrupted purchase is granted by reconcile), **T3 (scope across accounts — the RELEASE BLOCKER: a second account
in the same browser must not see the first account's purchase)**, T4 (held elsewhere, only if two profiles for one
account can be produced); **(b)** after the deploy, a live purchase stays listed and reloads are quiet, and the server
counters move.

## Key Changes

Nothing built.

- ⚠️ **Part (a) did NOT run — the owner skipped the dev deploy** (verbatim, relayed: *"I skipped the dev deploy (we can't
  test anything there this build)"*). **The game went live without the T3 release blocker**; T3 and T1 were run on the
  live game afterwards. The owner's call, not a producer ruling. Side note, not reconciled: repo history has a
  `DEPLOY dev: bump version to 0.0.165-dev.1` commit the same day.
- **Owner ruling 2026-10-27**, **"Count the live checks (Recommended)"** — *"Drop the pre-release wording; the live
  T1/T3 results count. Knock-on: none (checked)."*

## Outcome

- **T3 passed, on live, after the deploy** (not pre-release as agreed): account B bought citizenship ~15:03 UTC; in the
  same browser account A then saw **its own** profile; `purchase_holder_sightings` stayed **0**. ⚠️ Caveat kept: this
  only catches the failure if A's session is verified, and whether A's load sent a reconcile request was not seen.
- **T1 met by the live run:** account B's 2–3 reloads were quiet (no restart popup, no card redraw, no inbox message).
  "Stays listed in Yandex's purchase list" was **not observed**.
- **Never run:** T2 (needs a real completed purchase on a non-citizen; the owner has two accounts, both citizens — how to
  get one was **still open with the owner, no ruling**); T4 — **this live path stays unproven** (covered by `0510`'s
  tests only). The safety switch was not exercised live.
- **Where the open steps went:** counters → `0511` step 4 (✅ from the log copy); sightings re-read → `0511` step 10
  (0); versions → `0511` steps 7 and 9. T2, T4 and the purchase-list half stay unproven. Client side → `0516`.

## Related

- [[tasks/stop-consuming-client-s2]] — task `0510`, the build this checked
- [[tasks/stop-consuming-profile-box-live-check]] — task `0511`, which took its server-side steps
- [[tasks/purchase-grant-registry-live-check]] — task `0493`, same live session (account B)
- [[tasks/stop-consuming-design]] — the spec (§10.3, §12 row S2v)
- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[decisions/sprint-9]] — the board (rank 39)
