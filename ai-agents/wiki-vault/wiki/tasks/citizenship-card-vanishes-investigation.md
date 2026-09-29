# Investigate: the Citizenship Card Vanishes After a Match on a Shaky Connection (task 0318)

**Source**: `ai-agents/tasks/done/0318-investigate-citizenship-card-vanishes-after-a-match-on-a-shaky-connection/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 13 / task `0318` (investigation — no code, no review ledger)

> ✅ Done (agent-closed — not owner-verified). Findings report:
> `ai-agents/knowledge-base/reports/2026-09-28-0318-citizenship-card-vanishes.md`. ⛔ No player or session
> ids on this page.

## Goal

Owner's own session on prod `0.0.154`, 2026-09-26: after winning a match and returning to the menu, the Yandex
SDK script failed to load (`net::ERR_SOCKET_NOT_CONNECTED`), the boot went degraded, and the citizenship card
and its buy button were hidden by the fail-closed gate (`0291`, working as designed). The card was also missing
on an ordinary load earlier. Other players' profile reads stayed healthy, so the profile server was not the
cause. Every match exit is a **full page reload** — one more chance to hit a degraded boot.

## Key Changes (the findings)

1. **Root cause: the card decides once, at boot, and never re-checks.** `CitizenshipCard.connectedCallback`
   reads the `citizenship_ui` flag once after the init gate; on a boot with the SDK missing or late the flags
   are missing, so the card hides **for the rest of that page** — even when the facade's late-recovery branch
   later recovers flags, payments and player. **Hiding is correct (`0291`); hiding permanently is the defect.**
2. **Triggers, ranked:** **A** the SDK loader download fails — *seen live*, no retry; **B** *only after a
   match, inferred, not verified* — match exit navigates to `rootPathname`, which **drops the query string**,
   and Yandex's loader reads its SDK address from `?sdk=`; without it, it asks the parent frame and may leave
   `YaGames.init()` never settling; **C** the inner SDK file fails even after the loader's own 3 retries;
   **D** the SDK is healthy but `getFlags()` fails or times out. **Multiplier:** every match exit reloads.
3. **Rate: not measurable yet.** Current events cannot separate the causes or mark a boot as following a match.
   The only number is an **upper bound**: `Player:YandexUnknown` at 0.8–1.2K unique users/day against
   3.58–4.79K daily players (week 2026-09-07 to 09-13) — it also counts slow-but-healthy inits, so it
   overstates, but it is large enough that `0049`'s "this is rare" assumption was never checked.
4. **Would retrying a failed download help? Likely, but unmeasured.** The same boot loaded the rest of the
   page; the error points to one dead connection. `0049`'s "low odds" reasoning was about a **rejected
   `init()`**, not a failed **download**. Caveat: the loader is cached 30 days, and the owner may have had
   DevTools "Disable cache" on.
5. **Not proposed:** returning to the menu without a reload (large, blocked by `0252`); a card-shaped "retry"
   state (brings back the fail-open `0291` withdrew).

## Outcome

**Owner rulings, 2026-09-28 (verbatim):** D-1 **"Retry download only (Recommended)"** — *"A couple of retries
within the 5 s start-up limit, then quiet background retries. Never retry Yandex's start-up call itself."* ⇒
**narrows `0049`'s "no SDK retry" for downloads only**; `init()` is still never retried. D-2 **"B1+B2+B3, B4
if confirmed (Recommended)"**. D-3 **"Don't remember"** (DevTools cache) — so whether the owner's session
overstated what players see stays **unknown**. `citizenship_ui` is served to **100%** of Yandex players
(*"Yes, 100%"*), so "page loads minus page loads with flags" is a clean hidden-card estimate.

**Filed:** B1 `0328` ([[tasks/platform-degraded-analytics-event]]), B2 `0329`
([[tasks/citizenship-card-late-recovery-recheck]]), B3 `0330` ([[tasks/sdk-loader-download-retry]]) — all
done 2026-09-28; B4 `0331` keep the query on match exit — **🚧 Blocked on the owner's read-only probe P1**
(report §5); `0326` pulled into Sprint 6 first. **Still owed:** probe P1; the optional GameAnalytics baseline
pull M1–M7 (report §3.2).

## Related

- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — task `0291`, the fail-closed gate (stays)
- [[tasks/degraded-mode-ux-treatment]] — task `0049`, whose "no SDK retry" D-1 narrowed
- [[systems/flashist-init]] — the 5 s platform deadline and the late-recovery branch
- [[tasks/citizenship-restart-prompt]] — task `0303`, the same reload question from the purchase side
- [[tasks/citizenship-card-newest-profile-read]] — task `0326`, pulled in so B2 could follow it
- [[tasks/citizenship-xp-progress-ui]] — the citizenship card
- [[decisions/sprint-6]] — the board carrying this task
- [[systems/analytics]] — the analytics system page; this task's events are listed there
