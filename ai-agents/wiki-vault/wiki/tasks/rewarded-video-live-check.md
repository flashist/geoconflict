# Live Check: the Rewarded Ad Doubles Match XP Inside Yandex After Both Deploys (task 0499) — CANCELLED

**Source**: `ai-agents/tasks/cancelled/0499-verify-0491-and-0488-live-the-rewarded-ad-doubles-match-xp-inside-yandex-after-both-deploys/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: cancelled (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 28 (ADR-035 append rank, flagged; on merit directly below `0488`) / task `0499` — live check of `0491` + `0488`

> ⛔ Cancelled 2026-10-28 via `/fkit-task-cancelled` by a spawned `fkit-producer` — hand-run live checks replaced by the
> GameAnalytics metrics read `0516` (on or after 2026-11-03); owner ruling **"The 4 purchase ones (Recommended)"**,
> relayed by `fkit-lead`. Same ruling as [[tasks/purchase-grant-registry-live-check]].

## Goal

Prove on the real Yandex template what the builds could not prove locally (the standalone page has no Yandex SDK): the
opt-in rewarded video ([[tasks/rewarded-video-double-match-xp]], client) and its profile-box grant route
([[tasks/rewarded-match-xp-grant-route]]) double a non-citizen's match XP **once**; a citizen sees no offer; a guest
sees the log-in prompt; sound mutes and returns; no interstitial on the same page within 60 s; the YAN statistics show
the rewarded unit and which licensing model applies; the `Ad:Rewarded:*` events arrive. Owner-run.

## Key Changes

Nothing built. Live run 2026-10-27, owner-run, relayed by `fkit-lead`. Non-citizen produced the same way as `0498`
(tester role `non-citizen` on the **older** account, then `restore`). ⚠️ `restore` throws away XP earned while the role
was on, so the doubled XP is no longer on the account — the owner's report is the only evidence.

## Outcome

- 🚩 **`rewarded_video` is ON in production, on purpose.** Set to `enabled` in the Yandex console for this test on
  2026-10-27; asked afterwards, the owner typed **"yes, and it's fine"**.
- **Seen:** owner, verbatim, **"Offer showed, XP doubled"** — "Watch an ad" appeared for a logged-in non-citizen, the ad
  played with sound off, XP doubled. That the bonus was granted means `0491`'s route answered (an old box would have
  refused with 404), so both deploys were in, by inference.
- **Not reported:** "only once"; a citizen sees no offer; the guest prompt; sound coming back; the same-page
  interstitial (so residual R1's re-raise trigger has neither fired nor been ruled out); YAN statistics (**licensing
  model still unknown**); the GameAnalytics events. No Yandex moderation message reported.
- **Where the open steps went:** versions → `0511` steps 7 and 9; "only once", steps 4–7 and 9 → `0516` steps 5–7;
  YAN → `0516` step 8. Sound coming back and the same-page interstitial stay **indirect only**.

## Related

- [[tasks/rewarded-video-double-match-xp]] — task `0488`, the client
- [[tasks/rewarded-match-xp-grant-route]] — task `0491`, the profile-box route
- [[decisions/adr-112-free-xp-grants]] · [[systems/analytics]] — the `Ad:Rewarded:*` events
- [[tasks/guest-log-in-and-buy-live-check]] — task `0498`, same tester-role method
- [[tasks/stop-consuming-profile-box-live-check]] — task `0511`, which took the version steps
- [[decisions/sprint-9]] — the board (rank 28)
