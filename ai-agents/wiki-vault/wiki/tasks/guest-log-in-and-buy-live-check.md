# Live Check B5: a Guest's "Log In and Buy" Opens the Payment Window With No Second Tap (task 0498) — CANCELLED

**Source**: `ai-agents/tasks/cancelled/0498-verify-0495-live-inside-yandex-guest-log-in-and-buy-opens-the-payment-window-with-no-second-tap/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: cancelled (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 27 (ADR-035 append rank, flagged; on merit directly below `0495`) / task `0498` — live check B5 of the shared purchase flow

> ⛔ Cancelled 2026-10-28 via `/fkit-task-cancelled` by a spawned `fkit-producer` — hand-run live checks replaced by the
> GameAnalytics metrics read `0516` (on or after 2026-11-03); owner ruling **"The 4 purchase ones (Recommended)"**,
> relayed by `fkit-lead`. Same ruling as [[tasks/purchase-grant-registry-live-check]].

## Goal

Prove inside real Yandex, after `0495` ([[tasks/guest-log-in-and-buy]]) and `0494` deployed, the part of the design
that was **documented only** (spec §1(a)): after a guest logs in, the payment window opens with **no second tap**; the
grant lands on the account that just logged in; the restart popup shows both buttons; cancelling the login gives one
reload; and the real login-to-payment time is measured to tune `AUTO_CONTINUE_DEADLINE_MS` (15 s). Owner-run.

## Key Changes

Nothing built. Live run 2026-10-27, owner-run, relayed by `fkit-lead`.

- **How a non-citizen was produced:** both of the owner's accounts are citizens, so he applied the `0425` tester role
  `non-citizen` to his **older** account, ran the check, then `restore` (owner: *"I did all the steps and restored the
  role"*). Not the newer account: its purchase is now kept at Yandex (ADR-126), so a non-citizen role there would offer
  a **real second charge**. He closed the payment window **without paying**.

## Outcome

- **The design's main open unknown is answered.** Owner, verbatim: **"Payment opened by itself"** — after login the
  payment window opened with no second tap; the `needs_tap` fallback did not appear; the 15 s deadline held on that run.
- **Not tested (no payment made):** billed to the logged-in account, the grant, the restart popup. **Not reported:**
  cancelling the login. **Partly:** one run only, and the measured time (`Continue:Ready` value) was not read — so
  **15 s is still not tuned to data**.
- **Where the open steps went:** the game version → `0511` step 9 (live game `0.0.167`); steps 1(ii)–(iii) and 3–6 →
  `0516` at metrics level, including the `Continue:Ready` time. No server-side step.

## Related

- [[tasks/guest-log-in-and-buy]] — task `0495`, the build this checked
- [[tasks/purchase-core-client]] — task `0494`, checked through this
- [[decisions/adr-125-log-in-and-buy-skips-reload]] · [[systems/shared-purchase-flow]]
- [[tasks/rewarded-video-live-check]] — task `0499`, same tester-role method
- [[tasks/stop-consuming-profile-box-live-check]] — task `0511`, which took the version step
- [[decisions/sprint-9]] — the board (rank 27)
