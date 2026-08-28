# Citizenship XP Progress UI

**Source**: `ai-agents/tasks/done/0191-citizenship-xp-progress-ui/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Citizenship Core

## Goal

Turn the start-screen citizenship card from a shell into a live XP/progress surface for Yandex-authorized players while preserving the guest login prompt.

## Key Changes

- Kept `<citizenship-card>` behind the `citizenship_ui` experiment flag and rendered its guest, logged-in progress, and citizen states from the shared `CITIZENSHIP_XP_THRESHOLD = 1000` constant.
- Replaced the `loadPlayerProfileView()` stub in `src/client/PlayerProfileView.ts` with a real bounded read from `{profileApiUrl}/v1/profile?yandexPlayerId=...`.
- Added `PublicPlayerProfileSchema` in `src/core/profile/PlayerProfile.ts` so the server's public `GET /v1/profile` projection and the client parser share one schema.
- `src/profile-server/Routes.ts` returns the public projection, omitting paid state and `persistent_id`; the route is public, rate-limited, and carries CORS for the game/Yandex iframe origin.
- Authorized failure paths return a logged-in zero-state instead of `null`, so a logged-in player is not misrendered as a guest when the profile API is missing, slow, 404, rate-limited, malformed, or unreachable.
- Added focused coverage in `tests/client/PlayerProfileView.test.ts`, `tests/client/CitizenshipCard.test.ts`, and profile route/schema tests.

## Outcome

The XP/progress card now reads server profile state for authorized players. Guests in a real Yandex context still see the login CTA, while the later no-SDK follow-up hides that CTA for standalone/local sessions where auth cannot work. Degraded profile reads show a logged-in zero-state rather than blocking or falling back to guest UI. Earned-citizenship notification and paid-purchase UI remain separate Sprint 4 tasks.

## Related

- [[decisions/sprint-4]]
- [[systems/player-profile-store]]
- [[tasks/start-screen-redesign-implementation]]
- [[tasks/citizenship-card-guest-cta-no-sdk]]
- [[tasks/degraded-mode-ux-treatment]] — the follow-up giving the card's Yandex-degraded state its own subtitle and CTA suppression
- [[tasks/hide-citizenship-card-flag]] — the 0054 default-OFF client flag hiding the whole card in production until citizenship launches
- [[decisions/adr-106-flags-suppressed]] — why the card shows the placeholder flag fallback
- [[tasks/citizenship-name-change]] — task 0067, which attaches the name-change entry point and pending/approved/rejected states to this card
