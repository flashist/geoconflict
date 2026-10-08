# Verify 0248 Live — Paid Citizens See No Interstitial Ads in Production (task 0398)

**Source**: `ai-agents/tasks/done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md` (the record: the same folder's `worklog.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 50 (append rank, not a merit rank; moved in from Sprint 8 rank 11 on 2026-10-06) / task `0398`

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-08** by a spawned `fkit-producer` via `/fkit-task-done`,
> on the owner's ruling given live in the `fkit lead` session, verbatim *"Close them"*. The owner ran the live checks;
> the close itself is agent-run, hence the marker.
>
> 🟢 **AD-FREE FOR PAID CITIZENS IS LIVE.** Game client **`0.0.157`** (commit `c12cd8e`), container started
> **2026-10-08T06:56:17Z**, after the S3b profile server ([[tasks/authenticated-profile-read-live]]). All five checks
> passed; two carry recording gaps (below).

## Goal

Prove in production what `0248` built ([[tasks/paid-citizen-ad-free]]): a **verified paid** citizen sees no interstitial
ad at any of the six placements, while non-paid and earned-only players still get ads requested, and the
`citizenship_ui` kill switch brings ads back. Filed 2026-10-06 at `0248`'s close under the build/verify-split rule.
Nothing in source.

## Key Changes

Nothing in source. The record:

- **Gates.** `0396` passed 2026-10-08 · `0397` in the same deploy (owner ruling R3) · `0248` committed and in the image ·
  weekend slot — **mid-week exception, owner's call** (Thu 2026-10-08).
- **Check 1 — verified paid account, six placements: ✅ all six.** Public lobby join, Mission start, solo start,
  private-lobby host start, end-of-match exit, in-game quit — each showed no ad and the console's *suppressed for a paid
  citizen* line, on a load where the citizenship card was visible (flags loaded).
- **Check 2 — the event: ✅ seen.** `Ad:InterstitialSuppressed:PaidCitizen` = **24** on 2026-10-08 (partial day; none
  1–7 Oct — the event did not exist before). For scale, `Ad:Interstitial` = 2,720 the same partial day. It counts ad
  **requests**, so it is an upper bound on ads given up. ⚠️ GameAnalytics showed its *"Demo mode"* banner on every page,
  as on earlier reads.
- **Check 3 — non-paid (a logged-out guest) → ads requested: ✅.** Where no ad appeared, the console showed the request
  then Yandex's own *"too frequent requests"* skip — expected; judged by the request line. ⚠️ Placements walked **not
  itemised**.
- **Check 4 — earned-only citizen → ads requested: ✅**, same result. ⚠️ Placements **not itemised**.
- **Check 5 — kill switch: ✅.** `citizenship_ui` flipped off and back on within ~5 min ending ≈09:48Z; with it off the
  paid account got interstitials and no card. Owner, verbatim: *"everything worked as expected (no card, interstitials
  are shown - when the flag was disabled)"*. One flip served both this task and `0400`. ⚠️ **Exact off/on times not
  recorded** — approximate window only.

## Outcome

- **Two production defects found during the checks, filed — not fixed here:**
  - **`0416` — private-lobby Start fails with 403 `citizens_only`.** At placement 4 the ad gate ran (event fired, no ad),
    but the match did not start: per `fkit-lead`'s diagnosis the container nginx drops the query string on worker paths,
    so the server never sees the host's id. Filed on Sprint 7 at rank 62, owner ruling *"Sprint 7, ship today
    (Recommended)"*. The placement-4 ad check stands, because the gate runs before the request.
  - **`0411` — a page load where the experiment flags never arrive.** The Yandex SDK's flags fetch timed out; on such a
    load `citizenship_ui` reads off for the whole session, so **a paid citizen sees ads until a reload** (fails open for
    ads, by design `0236`). Filed on the Backlog board; owner ruling: suggest a reload, reusing `0397`'s Restart button.
    Frequency not measured.
- **Rollback:** client rollback (to `0.0.156`, registry only) is safe for ads — everyone sees ads again — but with S3b
  live, the `0397` Q4 pairing also needs `citizenship_ui` off. See [[tasks/authenticated-profile-read-live]].
- **Not in scope, unchanged:** rewarded video; a full-screen ad Yandex shows without the game asking cannot be stopped
  by the gate (`0248` Step 1 report residual, still unverified).

- 📌 *2026-10-08 (later) sync:* `0416` is **built** ([[tasks/worker-route-query-string]]) — cause confirmed by
  reproduction, fixed in `nginx.conf` — and so is the join-window paste bug found during these checks, as `0413`
  ([[tasks/join-modal-paste-hint]], also carrying `0414`'s error-window copy). Both committed `a555111`, **not deployed**;
  live checks → `0420`. `0411` is still open on the Backlog board.

## Related

- [[tasks/paid-citizen-ad-free]] — task `0248`, the build this verifies
- [[tasks/authenticated-profile-read-live]] — task `0396`, gate 1 (S3b live)
- [[tasks/session-verified-status-line-live]] — task `0400`, same sitting, same kill-switch flip
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, same deploy (`0301` ships with `0248`)
- [[tasks/session-verified-status-line]] — task `0397`, deployed together (ruling R3); its Restart button is `0411`'s fix
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, why a flags timeout fails open for ads
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the private-lobby gate whose `citizens_only` 403 is `0416`
- [[tasks/analytics-p1-ad-impression-baseline]] — task `0020`, `Ad:Interstitial`, the scale figure
- [[systems/analytics]] — `Ad:InterstitialSuppressed:PaidCitizen`, now live
- [[decisions/sprint-7]] — the board (rank 50)
- [[decisions/sprint-8]] — filed there (rank 11) before moving to Sprint 7
- [[decisions/sprint-backlog]] — where `0411` was filed
- [[decisions/cancelled-tasks]] — `0414`, filed from the paste bug found during these checks, cancelled and merged into `0413`
- [[tasks/authenticated-profile-read]] — task `0250`, whose S3b `isPaidCitizen` is the paid answer
- [[systems/project-brief]] — `PROJECT.md` now records the ad-free benefit live since `0.0.157`, verified by this task (corrected 2026-10-08)
- [[tasks/worker-route-query-string]] — task `0416`, the Start 403 found at placement 4, built 2026-10-08
- [[tasks/join-modal-paste-hint]] — task `0413`, the paste bug found during these checks, built 2026-10-08
