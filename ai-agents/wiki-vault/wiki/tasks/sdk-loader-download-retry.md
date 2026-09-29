# Retry a Failed Yandex SDK Loader Download (task 0330)

**Source**: `ai-agents/tasks/done/0330-retry-a-failed-yandex-sdk-loader-download/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 43 / task `0330` (brief B3 of the `0318` report)

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. The local browser check is
> **owner-owed** (*"You run it later"*). **Whether a retry succeeds for real players is unmeasured.**
>
> 🔓 **Owner ruling D-1 on `0318` narrowed a locked decision:** `0049`'s "no SDK retry" now allows retrying a
> failed **download** only. **`YaGames.init()` is still never retried or re-called.**

## Goal

A failed loader download resolved the same ready promise as a success; `yandexSdkInit` found no `YaGames`
and returned, and nothing fetched the script again — **a failed download never recovered** for the whole page.
Retry it, without ever running the loader twice.

## Key Changes

- **Owner rulings (verbatim):** D-A **"Start now, retry quietly (Recommended)"** — once the quick retries
  inside the 5 s window fail, the boot goes degraded at once (**about 2 s** when the loader is truly down; today
  that boot is instant) and background retries continue; `Session:PlatformInitTimeout` keeps its meaning.
  D-B **"Yes, add it (Recommended)"** — a retry-outcome event.
- **Schedule** (`src/client/SdkLoaderRetry.ts`): quick retries at about **+0.5 s and +1.5 s** inside the
  deadline, then background at about **+5 s / +15 s / +45 s**, then stop — **5 retries at most**. Retry only
  after `onerror` (nothing executed); the failed tag is removed before a new one is inserted, so exactly one
  loader ever executes. The loader tag gained `id="flashist-yandex-sdk-loader"`.
- **Facade:** a memoised `waitForSdkLoader()` shared by `yandexSdkInit` and the login-status window; the body
  after "loader loaded" moved unchanged into `initLoadedYandexSdk()`. A background success hands off to the
  **existing late-recovery branch**, which with `0329` re-shows the card.
- **New event** `Session:SdkLoaderRetry:{Recovered|RecoveredLate|GaveUp}`, value = re-downloads made. Two
  caveats in the reference: `Recovered`/`RecoveredLate` count **loader downloads, not platform recovery**; and
  outcomes **undercount** failures (`GaveUp` fires ~67 s after the first failure, so a page closed earlier
  sends nothing), which makes the save rate read **high**.
- **Review R1 (owner: *"Code fix"*):** only a save **inside** the 5 s window clears the `ScriptFailed` label; a
  later save still reads `ScriptFailed` if anything is missing at the check. R3 (owner: *"Accept as known"*).
- `Player:YandexUnknown`'s 1 s window now starts once the loader has actually loaded.
- **Out of scope:** trigger C (the inner SDK file failing after the loader's own 3 retries) — not retryable
  without reaching into Yandex internals; `0049`'s reasoning still holds there.

## Outcome

- **Evidence:** red-first tests; full `npm test` 175 suites / 3097 tests after review round 1 (first run).
- **Unverified:** dynamic re-insertion of the loader against Yandex moderation rules and the loader's own
  logic; real-player success; the local block/unblock browser check (and "boot not degraded" / "card
  reappears" are not observable in the local harness at all — unit tests only).
- **Owner, after release (informational):** compare `Session:PlatformDegraded:ScriptFailed`,
  `Player:YandexUnknown` and flags-seen against `Session:Start`, before vs after.

## Related

- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`, trigger A and ruling D-1
- [[tasks/degraded-mode-ux-treatment]] — task `0049`, the locked decision D-1 narrowed
- [[tasks/platform-degraded-analytics-event]] — task `0328`, whose `onerror` flag and cause list this reuses
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, which a post-deadline success needs to show the card
- [[tasks/app-bootstrap-single-entry-point]] — the precedent: the app chunk already retries once
- [[systems/flashist-init]] — the 5 s deadline and the late-recovery branch
- [[systems/analytics]] — `Session:SdkLoaderRetry:*`
- [[decisions/sprint-6]] — the board carrying this task
