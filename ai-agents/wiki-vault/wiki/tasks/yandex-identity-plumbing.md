# Yandex Identity Plumbing (T3)

**Source**: `ai-agents/tasks/done/s4-profile-03-yandex-identity.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T3

## Goal

Carry the current Yandex player's stable unique ID from the bounded client platform gate through the match join payload and into the server-side `Client`, so later profile and match-crediting work can key authenticated profiles without changing match behaviour.

## Key Changes

- `src/client/flashist/FlashistFacade.ts` exposes tolerant `isYandexAuthorized()` and `getYandexUniqueId()` helpers. Guest, degraded, unavailable-SDK, and SDK-error paths resolve to `false` or `null` rather than breaking join.
- `src/client/Main.ts` resolves the ID once when assembling `LobbyConfig`; `src/client/Transport.ts` includes it in `ClientJoinMessage`.
- `src/core/Schemas.ts` accepts a nullable, optional `yandexPlayerId`, preserving compatibility with older clients while bounding strings to 256 characters.
- `src/server/Worker.ts` normalizes an omitted value to `null` and stores it as a readonly field on `src/server/Client.ts`.
- Schema tests cover string, `null`, omitted, invalid-type, and length-boundary cases.

## Outcome

T3 shipped in PR #111. Authorized Yandex sessions now carry a non-null ID on join; guests and degraded sessions carry `null`. The server retains the value for T6 match crediting, but does not use it yet.

The value is a stable profile key, not a cryptographically verified identity claim. T6 now uses it as the opaque key for earned-XP crediting, with that trust limitation documented in [[tasks/profile-match-end-crediting]]; paid-purchase verification remains owned by the Yandex Payments work.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[tasks/player-profile-store-investigation]] — investigation that identified the missing server-visible Yandex ID
- [[systems/flashist-init]] — bounded SDK/player initialization and degraded-mode contract used by the helpers
- [[systems/networking]] — join schema, transport, worker validation, and server-side client construction
- [[systems/player-infrastructure]] — pre-S4 identity audit and trust-boundary context
- [[tasks/profile-match-end-crediting]] — T6 consumes the server-visible ID for earned-XP crediting
- [[tasks/yandex-payments-investigation]] — separate signed-verification path for paid entitlements
