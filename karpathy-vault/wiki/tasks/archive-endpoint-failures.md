# Archive Endpoint Failures and Body Limit

**Source**: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`
**Status**: backlog
**Sprint/Tag**: Sprint 4c / stabilization

## Goal

Restore match archive reliability for multiplayer and singleplayer games so completed matches preserve replay/debug data instead of silently losing history.

## Key Changes

Planned fix scope:

- Add local master archive routes for `POST /game/:id` and `GET /game/:id`, backed by disk storage under `data/game-records/`.
- Add `GAME_RECORD_PATH` and a local game-record URL helper in `src/server/ServerEndpoints.ts`, following the same internal-master pattern as the Sprint 4c cosmetics fix.
- Change `src/server/Archive.ts` to post/read game records through the local master route instead of `config.jwtIssuer() + "/game/:id"`.
- Improve archive failure logs so they include HTTP status code and a short response-body excerpt.
- Raise the JSON body limit for `src/server/Worker.ts` archive uploads from Express's default 100 KB limit to a bounded explicit value, with 10 MB proposed pending confirmation.
- Remove `keepalive: true` from the singleplayer archive fetch in `src/client/LocalServer.ts` because browsers cap keepalive request bodies at about 64 KB, and demote non-critical archive failures from `console.error` to `console.warn`.

## Outcome

Not implemented yet. The investigation found three production archive failure groups: multiplayer archive 404s from a missing `/game/:id` server route, singleplayer `PayloadTooLargeError` from the default Express JSON limit, and browser-side `Failed to fetch` caused by `keepalive` body-size limits.

## Related

- [[decisions/sprint-4c]]
- [[systems/telemetry]]
- [[systems/match-logging]]
- [[tasks/cosmetics-serving]]
