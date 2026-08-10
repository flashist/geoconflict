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
- **Monetization**: the inherited **Stripe** and **Fuse** paths are dead. The live monetization anchor is the Yandex SDK path through `FlashistFacade`, which Sprint 4 payments work extends. (Stripe/Fuse status is unchanged and carries its original June-2026 audit provenance — the 2026-08-09 flares correction below did **not** re-verify either of them, and its verdict does not transfer to them.)
- **Flares — live, and upstream-sourced.** *Corrected 2026-08-09 from code, superseding this page's earlier claim that flares were dead alongside Stripe/Fuse. Source: direct code verification, not the June audit.* Flares are a working entitlement channel:
  - `src/server/Worker.ts:377` — `flares = result.player.flares`, taken from `getUserMe(token, config)`, i.e. the **upstream OpenFront user API** (`src/core/ApiSchemas.ts:53`, `UserMeResponseSchema.player.flares`). **Not** Geoconflict's profile server and **not** Yandex — the entitlement source sits outside Geoconflict's own infrastructure.
  - `src/server/Privilege.ts:16` — `PrivilegeChecker.isAllowed(flares, refs)` consumes them to gate patterns, colours, and flag layers/colours.
  - `src/client/GutterAds.ts:35` — `flares.some((flare) => flare.startsWith("pattern:"))` suppresses gutter ads for any player holding a `pattern:` flare.
  - **Consequence 1 — ad revenue is already coupled to cosmetic entitlements.** Ad suppression, the project's main revenue today, already turns on a third-party-supplied field, before anyone decided it should. See [[decisions/adr-102-privilege-refresher-fails-open]].
  - **Consequence 2 — task `0009` is investigating moving the entitlement source in-house.** Self-hosting the upstream OpenFront API is a findings-phase backlog task, pulled ahead of any cosmetics monetization work. See [[decisions/sprint-backlog]].
  - ⚠️ **What is verified is the code path, not production traffic.** The path is live and reachable in the code. Whether production actually calls that upstream service is **unverified and must not be asserted either way** — that is precisely what task `0009` exists to determine. If it is live it is also a 152-ФЗ question, since the compliance position rests on all infrastructure being RU-resident; that is a question to answer, not an accusation. Mirrors risk **R5** in [[systems/architecture-overview]].

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
- [[tasks/profile-match-end-crediting]] — T6 use of the server-visible Yandex ID for earned-XP crediting
- [[decisions/personal-data-152fz-compliance]] — Russian personal-data compliance track
- [[decisions/adr-106-flags-suppressed]] — the cosmetics suppression decision covering flags
- [[decisions/adr-102-privilege-refresher-fails-open]] — the privilege checker that consumes `flares`, and the ad-revenue coupling this page records
- [[systems/architecture-overview]] — risk **R5**, which carries the same upstream-entitlement dependency and the same unverified-liveness caveat
- [[decisions/sprint-backlog]] — task `0009`, the findings phase for moving the entitlement source in-house
