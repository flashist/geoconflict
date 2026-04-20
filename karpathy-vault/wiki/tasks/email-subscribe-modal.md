# Email Subscription Modal

**Source**: `ai-agents/tasks/done/s4-email-subscribe-task.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Add a low-friction "Subscribe to updates" flow so players can opt into future direct communication from inside the game, without introducing a new backend storage system in v1.

## Key Changes

- Added `src/client/EmailSubscribeModal.ts`, a Lit modal with a single email field, basic format validation, loading/error/success states, and auto-close after successful submission.
- Wired entry-point buttons into both `src/client/GameStartingModal.ts` and `src/client/graphics/layers/WinModal.ts`, so the modal is reachable at match start and match end.
- Added localized button and modal copy in `resources/lang/en.json` and `resources/lang/ru.json`.
- Extended the existing Telegram-backed feedback infrastructure with `POST /api/subscribe` in `src/server/Master.ts`, including Zod email validation and a `3/minute` rate limit.
- Added analytics events `Subscribe:Opened` and `Subscribe:Submitted` in `src/client/flashist/FlashistFacade.ts`.

## Outcome

Geoconflict now has a shipped email opt-in surface on both major post-load conversion points: while the match is preparing and after the player wins or loses. The implementation deliberately keeps scope narrow: no deduplication, no frequency capping, and no separate subscription datastore. Successful submissions are delivered through the same Telegram operational channel already used for feedback, which minimized backend work but means subscriptions remain an operator-handled inbox rather than a managed mailing list.

## Related

- [[decisions/sprint-4]] — Sprint 4 backlog item and shipped opt-in flow
- [[systems/analytics]] — `Subscribe:Opened` and `Subscribe:Submitted`
- [[features/feedback-button]] — shares the existing Telegram delivery infrastructure
