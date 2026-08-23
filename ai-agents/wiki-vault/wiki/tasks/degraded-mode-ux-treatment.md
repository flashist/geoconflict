# Degraded-Mode UX Treatment

**Source**: `ai-agents/tasks/done/0049-degraded-mode-full-ux-treatment/brief.md` (plus `plan.md`, `worklog.md`, `evidence/` in the same folder; **no in-folder `review.md` — deliberately**, see Outcome)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task 0049 / citizenship funnel prerequisite

## Goal

Give Yandex SDK timeout/failure (degraded mode) its own player-facing treatment on the citizenship card. The client previously collapsed three states into two: (a) standalone/no-Yandex-context (fixed by [[tasks/citizenship-card-guest-cta-no-sdk]]), (b) real Yandex guest with a healthy SDK, and (c) Yandex context where `YaGames.init()` timed out or failed. Case (c) looked identical to (b) — a degraded player saw the "Войти в Яндекс" CTA and tapping it silently did nothing. Owner-reclassified 2026-07-02: **must ship before earned or paid citizenship**, because a degraded player inside the citizenship funnel would hit a dead CTA at exactly the authentication moment.

## Key Changes

- `src/client/flashist/FlashistFacade.ts` — `isYandexDegraded()` computed accessor. Detection is free — no new state: `yaGamesAvailable === true` with no SDK/player object is the degraded signal, from fields the facade already has. (The shipped detection uses the broader `!yandexSdkPlayerObject` rather than the locked decision's literal `!yandexGamesSDK` wording — a deviation the owner accepted at close.)
- `src/client/CitizenshipCard.ts` — the guest-state render branches on `isYandexDegraded()`: degraded shows a connection-problem subtitle ("Couldn't connect — try again later" / ru equivalent, `guest_subtitle_degraded`) and **no CTA** (a tap can't succeed, so none is offered); real guests keep the login CTA unchanged.
- Localization keys added to both `en.json` and `ru.json`.
- Locked decisions carried: **no active SDK retry** (a failed init has low odds of succeeding on re-attempt) and **late-recovery UI refresh deferred** (no notification plumbing exists for post-deadline SDK arrival; a recovered player sees correct state on next reload/match — revisit if `Session:PlatformInitTimeout` volume proves non-trivial).

## Outcome

The citizenship funnel now distinguishes "you're not logged in" from "we couldn't reach Yandex". Implementation was accepted as committed at `be0ea1b` + `2b43274` (2026-07-02); the 2026-08-14 close added a live simulation pass (no code changes).

**Superseded in production visibility by 0054 (2026-08-21):** once this treatment deployed, the degraded card became the dead-end top element of every player's start screen (citizenship is unlaunched and the profile integration is off in prod). The whole card is now hidden behind the default-OFF `CITIZENSHIP_CARD_ENABLED` client flag; this treatment's logic is untouched and becomes reachable again when the flag flips ON at citizenship launch. See [[tasks/hide-citizenship-card-flag]].

**Live verification (2026-08-14):** case (c) demonstrated in two flavors — sdk.js request aborted, and sdk.js loading but refusing to init outside a real Yandex frame — both ending in the degraded subtitle with no CTA (`evidence/degraded-mode-case-c.png`); case (a) standalone confirmed unaffected (plain guest subtitle, no degraded copy).

**Carried caveats (agent-closed, not owner-verified):**

- **Case (b) — healthy-SDK real Yandex guest — was NOT live-verified**: unreachable outside a genuine Yandex Games embed; covered by unit tests only (`CitizenshipCard.test.ts`, `FlashistFacade.test.ts`). Live confirmation needs a Yandex draft/dev embed run.
- The flag-gate bypass branch (`isYandexDegraded() || isCitizenshipUiEnabled()`) is likewise unit-test-only — dev mode force-enables the flag either way.
- **Verification #1 deferred post-close**: the `Session:PlatformInitTimeout` analytics pull sizing real-world incidence is owner-side, informational, never a gate.
- **No fresh review round at close (owner ruling):** the review of record is the pre-fkit round series ending in commit `2b43274` (ledger: `ai-agents/reviews/degraded-mode-full-ux-treatment.md`); no in-folder `review.md` exists by design.

## Related

- [[systems/flashist-init]] — the bounded platform gate whose degraded mode this surfaces to players
- [[tasks/citizenship-card-guest-cta-no-sdk]] — the sibling fix for case (a) that first exposed the collapsed-states problem
- [[tasks/citizenship-xp-progress-ui]] — the citizenship card whose guest state this refines
- [[decisions/sprint-4]] — the earned/paid citizenship gate this clears
- [[tasks/hide-citizenship-card-flag]] — the 0054 follow-up hiding the whole card (this state included) until citizenship launches
