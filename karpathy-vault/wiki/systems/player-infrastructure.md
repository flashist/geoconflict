# Pre-S4 Player Infrastructure

**Layer**: client | server | shared
**Key files**: `src/client/Main.ts`, `src/client/UsernameInput.ts`, `src/core/Schemas.ts`, `src/server/Worker.ts`, `src/server/jwt.ts`, `src/server/Privilege.ts`, `src/server/Archive.ts`, `src/client/FlashistFacade.ts`

## Summary

The pre-Sprint-4 player infrastructure had no server-side per-player persistence. Identity, display names, territory patterns, and flags were mostly client-local and sent once in the join message; inherited OpenFront Discord/JWT, Stripe, Fuse, and flare-entitlement systems were present in code but mostly dead in the Yandex iframe build.

Sources: `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md`, `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md`

## Architecture

Live pre-S4 identity is an anonymous persistent UUID cookie plus Yandex SDK name seeding. The inherited account system is hidden or unreachable in the Yandex build, and anonymous tokens are accepted server-side as continuity IDs rather than verified accounts.

Nicknames are validated strictly on the client and sanitized deterministically in game state. Clan tags are parsed from the display name and used only for team assignment. Territory pattern rendering works, but purchase/ownership is effectively dead because the inherited Stripe/flares path has no usable geoconflict backend or products. Custom flags are intentionally suppressed for policy/copyright reasons, with assets kept under `resources/flags_source/`.

The join/transport spine remains load-bearing: `ClientJoinMessage` carries username, cosmetics refs, token, and later the Yandex ID lane. Sprint 4 profile work extends this spine instead of replacing it.

## Gotchas / Known Issues

- `persistentID` and the T3 `yandexPlayerId` lane are forgeable at the wire. They are continuity handles, not proof of payment or account ownership.
- There is no signed identity artifact on the match join path; payment verification must come from a separate Yandex Payments flow.
- `sanitizeUsername` is deterministic game-state behavior. Profile writes should reuse it rather than inventing a second normalizer.
- The cosmetics privilege checker can fail open for cosmetic refs during load/failure windows; profile credit/payment endpoints must fail closed instead.
- Future archive re-enable must not reuse the old game-host archive target because `GameRecord` can contain display names, persistent IDs, cosmetics, and clan tags.
- The email subscription modal creates a separate PII path to Telegram and needs compliance coverage independent of profile ID hashing.

## Related

- [[systems/player-profile-store]] — new persistent profile system added after this baseline
- [[systems/networking]] — join message and worker-routed client/server flow
- [[systems/clans]] — clan-tag parsing and team assignment
- [[features/announcements]] — separate repo-authored player messaging surface
- [[decisions/personal-data-152fz]] — personal-data implications for profile identity
- [[tasks/email-subscribe-modal]] — email PII path called out by the infra impact review
