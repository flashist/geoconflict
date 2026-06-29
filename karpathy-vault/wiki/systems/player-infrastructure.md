# Pre-S4 Player Infrastructure

**Layer**: client | server | shared
**Key files**: `src/client/Main.ts`, `src/client/UsernameInput.ts`, `src/core/Schemas.ts`, `src/core/Util.ts`, `src/server/Worker.ts`, `src/server/jwt.ts`, `src/server/Privilege.ts`

## Summary

Before the Sprint 4 profile work, Geoconflict had no server-side per-player persistence. Player identity and customization were browser-local, then reasserted once per match through `ClientJoinMessage`; the server kept them only in memory for that match.

Source: `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md`

## Architecture

- **Identity**: the live Yandex build uses a client-generated `player_persistent_id` cookie for guest continuity. The inherited Discord/email/JWT account system is effectively dead in production: account UI is hidden in the iframe and the geoconflict server does not provide the upstream account routes.
- **Yandex player data**: before Sprint 4, the Yandex SDK supplied names and analytics context only. T3 later added `yandexPlayerId` to the join path, but that value remains client-asserted and untrusted until a separate verification boundary exists.
- **Nicknames**: names live in `localStorage["username"]`, optionally seeded from the Yandex SDK. Strict validation is client-side; deterministic server/client sanitization happens in `PlayerImpl`.
- **Cosmetics**: territory-pattern rendering is live, but purchase and account entitlement flows inherited from OpenFront are dead in the Yandex build. Patterns are still carried as refs on multiplayer join and re-resolved server-side.
- **Flags**: country/custom flags are intentionally suppressed for Yandex policy/copyright reasons; `/flags/*.svg` 404s are a suppression mechanism, not a path bug.
- **Clans**: clan tags are parsed from usernames and affect team assignment only; there is no persistent guild system. See [[systems/clans]].
- **Monetization**: inherited Stripe/Fuse/flares paths are dead. The live monetization anchor is the Yandex SDK path through `FlashistFacade`, which Sprint 4 payments work extends.

## Gotchas / Known Issues

- Anonymous identity is forgeable; `verifyClientToken()` accepts a bare UUID and `yandexPlayerId` is not signed on the join path.
- `persistentID` may be fragile in the Yandex iframe because third-party cookie handling can affect `SameSite=Strict; Secure` cookies.
- The server join schema is looser than the client username validator. T5/T6 profile writes should reuse the deterministic game-side sanitization boundary rather than invent a second name normalizer.
- `FailOpenPrivilegeChecker` is acceptable only as a cosmetic rendering fallback. Profile crediting and payment endpoints must fail closed.
- Re-enabling flags is a product/legal decision, not an asset-copy fix.

## Related

- [[systems/player-profile-store]] — Sprint 4 backend profile store that adds persistence
- [[systems/clans]] — tag parsing and team assignment behavior
- [[decisions/sprint-4]] — citizenship/payment sprint that consumes this infrastructure
- [[tasks/player-profile-store-investigation]] — initial profile-store investigation
- [[tasks/yandex-identity-plumbing]] — T3 Yandex ID transport through match join
- [[tasks/profile-backend-db-api]] — T5 profile database and API
- [[decisions/personal-data-152fz-compliance]] — Russian personal-data compliance track
