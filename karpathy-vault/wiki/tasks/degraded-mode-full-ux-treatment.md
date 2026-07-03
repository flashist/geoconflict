# Degraded-Mode UX: Yandex SDK Timeout/Failure Treatment

**Source**: `ai-agents/tasks/done/degraded-mode-full-ux-treatment.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Citizenship UI reliability

## Goal

Give real Yandex SDK timeout/failure sessions their own citizenship-card state so players do not see a Yandex login CTA that cannot work.

## Key Changes

- Confirmed the degraded signal can be derived from existing `FlashistFacade` state: `yaGamesAvailable === true` while `yandexGamesSDK` is absent.
- Added a small facade accessor, `isYandexDegraded()`, instead of exposing raw SDK-state checks to UI components.
- Updated `src/client/CitizenshipCard.ts` so the guest-state branch shows a connection-problem subtitle and hides the CTA when the Yandex context exists but SDK init failed or timed out.
- Kept real Yandex logged-out guest behavior unchanged: healthy SDK guests still see the login CTA.
- Kept standalone/no-SDK behavior from [[tasks/citizenship-card-guest-cta-no-sdk]] unchanged: non-Yandex contexts still show the locked guest state without a CTA.
- Added en/ru localization for the degraded subtitle under `citizenship_card`.

## Outcome

The citizenship card now distinguishes three cases that were previously collapsed: standalone/no-SDK sessions, real logged-out Yandex guests, and degraded Yandex-platform sessions. Degraded sessions no longer offer a dead auth action during the citizenship funnel; they see a connection-problem message instead. Active SDK retry and late-recovery UI refresh remain intentionally out of scope unless `Session:PlatformInitTimeout` volume proves high enough to justify more plumbing.

## Related

- [[decisions/sprint-4]]
- [[systems/flashist-init]]
- [[systems/analytics]]
- [[tasks/citizenship-card-guest-cta-no-sdk]]
- [[tasks/citizenship-xp-progress-ui]]
- [[tasks/app-bootstrap-single-entry-point]]
