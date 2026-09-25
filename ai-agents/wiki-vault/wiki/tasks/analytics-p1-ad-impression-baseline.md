# Analytics P1 — Ad Impression Baseline (`Ad:Interstitial`), Tiers Split Out

**Source**: `ai-agents/tasks/done/0020-analytics-p1-ad-impression-tier/brief.md` (plus `plan-baseline.md`, `worklog.md` and `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 · task `0020` · analytics P1

> 🚨 **READ THIS FIRST — THE TASK SHIPPED A NARROWER THING THAN ITS TITLE, AND ONE CHECK IS OWED.**
> Closed **2026-09-24** by a spawned `fkit-producer` at the close step of `/fkit-sprint-ship-loop`,
> **no owner present**, on the owner's close ruling *"Close, note check as open"* ⇒
> **`(agent-closed — not owner-verified)`**.
> - **Shipped: one tier-free event, `Ad:Interstitial`.** The tiered events moved to `0299` (Backlog);
>   banner events were **dropped**.
> - 🚩 **OWED, not done: the manual in-Yandex check** — on a Yandex draft or production build, start a
>   mission and confirm **exactly one `Ad:Interstitial` per ad actually shown, and none when the SDK
>   declines**. It cannot be done locally (no SDK). The owner does it after the 2026-09-26 deploy; by
>   owner ruling it is **not a new task**. ⛔ **Not verified in Yandex or in production.**
> - ⚠️ **The full `npm test` was not green on the first run** — one `socket hang up` in
>   `tests/profile-server/PaymentsRoutes.test.ts`, outside this task's surface. `0197` was ruled out
>   (no SIGSEGV, no new crash report). **Likely the supertest flake family, not proven** (CLAUDE.md
>   lists that shape as *seen, never traced*). It passed on a single re-run: 147 suites / 2101 tests.

## Goal

As filed: track ad impressions **by player tier** (guest / free / earned citizen / paid citizen), so the
net revenue effect of a citizenship conversion can be modelled — does a 99-ruble payment lose more in
ad revenue than it earns? Yandex records impressions on its side, but they cannot be joined to our own
player-behaviour data in GameAnalytics.

## Key Changes

- **One enum key, `AD_INTERSTITIAL` → `Ad:Interstitial`**, fired from `FlashistFacade.showInterstitial()` when the SDK's `onClose` reports `wasShown === true` (strict). **Once per show** even if `onClose` fires twice. **Not** fired per attempt, on `onError`, when the SDK call throws or is missing, or when the SDK declines (e.g. its own frequency cap). It **under-counts** an ad abandoned by closing the tab mid-ad — never over-counts. Dev/staging builds only log it.
- Documented in `ai-agents/knowledge-base/analytics-event-reference.md` under a new *Ad Events* section (see [[systems/analytics]]).
- Stateful review round 1 closed out (reasoning-only second opinion, normal under ADR-042; R1 fixed). Driver re-verify: targeted 13/13, tsc/lint/prettier clean, `CITIZENSHIP_CARD_ENABLED` still `false`.

## Outcome

**Scope rulings, 2026-09-24, at the approval of `plan-baseline.md`:**
- *"Yes, baseline only"* — build only the tier-free interstitial event, on a **real impression**.
- **Banners — *"Drop it"*.** `Ad:Banner*` is not observable from our code: nothing shows a banner (Fuse is commented out, `GutterAds` returns inside the iframe, nothing calls `showBannerAdv`), so there is no impression point to hook. **Dropped, not deferred.**
- **Tiers — *"New task, close 0020"*.** The tiered `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen}` events are **`0299`** on the Backlog board. They need a synchronous tier at ad time, which the client does not have: earned needs the `0273` client deployed plus a profile read and cache; **paid needs `0250`** (the public profile strips `is_paid_citizen`).

🚩 **The investigation disproved the brief's premise.** The brief assumed paid citizens are exempt from
interstitials. **No ad suppression exists for any tier today** — `showInterstitial()` and its six call
sites have no tier check. Paid citizens *do* see interstitials; suppression is task `0248`. So the
brief's "`PaidCitizen` should never fire" guard does not hold yet, and any revenue model must not assume
it does.

**History:** row made board-visible on Sprint 4 on 2026-09-02 (it had been in no sprint file); its
*"implement when citizenship tiers are live"* gate was removed 2026-09-23 (Sprint 4 rescope Q4 = (a),
*investigation first*).

## Related

- [[systems/analytics]] — the event reference and the new *Ad Events* section
- [[tasks/monetization-analytics-spec]] — the P0/P1 analytics spec this task came from
- [[tasks/analytics-p1-citizenship-funnel]] — task `0021`, its P1 sibling
- [[tasks/supertest-profile-server-flake]] — the flake family the first-run failure most likely belongs to
- [[tasks/test-suite-reliability-investigation]] — task `0197`, ruled out before re-running
- [[decisions/sprint-4]] — the board it closed on
- [[decisions/sprint-backlog]] — the board carrying `0299`
